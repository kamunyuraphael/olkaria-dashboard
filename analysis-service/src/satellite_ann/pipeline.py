"""
Module A satellite ANN forecast (SO2, CH4, CO2) - ports ANN_manu_1_code.ipynb
cells 1-10 (LSTM-GRU), 5-6 (correlations), 17 (SARIMA baseline), 21 (how the
two are actually paired for comparison). The notebook's own research gases
were SO2/CH4; CO2 was added to this module later reusing the identical
pipeline - this file now parameterizes all three by `gas` so there's exactly
one implementation of the forecast, not three near-duplicates.

The notebook took one pre-combined anndata.csv. The server takes
coordinates + a buffer radius and fetches both series from satellite
instead (src/satellite/simulate.py - simulated until a real GEE dataset is
chosen per gas, see that module's docstring). Everything downstream of that
fetch (correlations, SARIMA, ANN) is a direct, untouched port.

Note on the notebook's own alignment, reproduced here as-is per the
"match analysis team's output" decision: cell 21 pairs the ANN's
bias-corrected test predictions with the SARIMA baseline's test window by
truncating the ANN array to the SARIMA test length and plotting it
against the SARIMA test's dates - the two test sets come from different
splits (the ANN's is 10% of an augmented/shuffled-free combined dataset;
SARIMA's is literally the last 200 raw daily points) and aren't
guaranteed to be the same date range. This module reproduces that pairing
exactly rather than correcting it.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.statespace.sarimax import SARIMAX

from src.config import (
    ANN_BATCH_SIZE,
    ANN_EARLY_STOP_PATIENCE,
    ANN_EPOCHS,
    ANN_L2_REG,
    ANN_MIN_LR,
    ANN_NOISE_FACTOR,
    ANN_REDUCE_LR_FACTOR,
    ANN_REDUCE_LR_PATIENCE,
    ANN_TIME_STEP,
    SARIMA_MAX_ITER,
    SARIMA_ORDER,
    SARIMA_SEASONAL_ORDER,
    SARIMA_TEST_SIZE,
    SATELLITE_ANN_TARGET_COLUMN,
)
from src.io_utils import UnreadableFileError
from src.satellite.simulate import fetch_satellite_series

SUPPORTED_GASES = tuple(SATELLITE_ANN_TARGET_COLUMN.keys())  # ("SO2", "CH4", "CO2")


def compute_correlations(df: pd.DataFrame, target_col: str) -> list[dict]:
    """Cells 5-6: Pearson correlation coefficients only (no p-value) of the
    target gas against each predictor."""
    cols = [target_col, "temperature", "ws", "pressure", "precipitation"]
    clean = df[cols].apply(pd.to_numeric, errors="coerce").dropna()

    results = []
    for feature in ["temperature", "ws", "pressure", "precipitation"]:
        r, _ = pearsonr(clean[target_col], clean[feature])
        results.append({"feature": feature.capitalize() if feature != "ws" else "Wind Speed", "r": round(float(r), 4)})
    return results


def _build_dataset(data: np.ndarray, time_step: int) -> tuple[np.ndarray, np.ndarray]:
    """Cell 7's create_dataset."""
    X, Y = [], []
    for i in range(len(data) - time_step):
        X.append(data[i : i + time_step, :-1])
        Y.append(data[i + time_step, -1])
    return np.array(X), np.array(Y)


def _augment(X: np.ndarray, y: np.ndarray, noise_factor: float) -> tuple[np.ndarray, np.ndarray]:
    """Cell 7's augment_data."""
    X_aug = X + noise_factor * np.random.normal(0.0, 1.0, X.shape)
    y_aug = y + noise_factor * np.random.normal(0.0, 1.0, y.shape)
    return X_aug, y_aug


def run_ann(df: pd.DataFrame, target_col: str) -> tuple[np.ndarray, np.ndarray]:
    """Cells 7, 9-10: full LSTM-GRU train + bias-corrected test predict.
    Returns (y_test_actual, y_test_pred_corrected), both inverse-scaled
    to the target gas's real units. Imports Keras lazily - it's the
    heaviest dependency and only this function needs it."""
    from sklearn.model_selection import train_test_split
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    from tensorflow.keras.layers import GRU, LSTM, BatchNormalization, Dense, Dropout
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.regularizers import l2

    work = df.set_index("date").sort_index().copy()
    work.index.freq = "D"
    work = work.ffill().bfill()

    work["day_of_week"] = work.index.dayofweek
    work["month"] = work.index.month
    work["day_of_year"] = work.index.dayofyear
    work["week_of_year"] = work.index.isocalendar().week.astype(int)
    work["week_sin"] = np.sin(2 * np.pi * work["week_of_year"] / 52)
    work["week_cos"] = np.cos(2 * np.pi * work["week_of_year"] / 52)
    work["day_sin"] = np.sin(2 * np.pi * work["day_of_year"] / 365.25)
    work["day_cos"] = np.cos(2 * np.pi * work["day_of_year"] / 365.25)

    features = work[
        ["temperature", "ws", "pressure", "precipitation", "day_of_week", "month", "day_sin", "day_cos", "week_sin", "week_cos", "week_of_year"]
    ].fillna(0)
    target = work[target_col]

    scaler_features = MinMaxScaler()
    scaled_features = scaler_features.fit_transform(features)
    scaler_target = MinMaxScaler()
    scaled_target = scaler_target.fit_transform(target.to_numpy().reshape(-1, 1))

    combined = np.hstack((scaled_features, scaled_target))
    X_orig, y_orig = _build_dataset(combined, ANN_TIME_STEP)
    X_aug, y_aug = _augment(X_orig, y_orig, ANN_NOISE_FACTOR)

    X_combined = np.vstack((X_orig, X_aug))
    y_combined = np.concatenate((y_orig, y_aug))

    X_train, X_temp, y_train, y_temp = train_test_split(X_combined, y_combined, test_size=0.2, shuffle=False)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, shuffle=False)

    n_features = features.shape[1]
    X_train = X_train.reshape((X_train.shape[0], X_train.shape[1], n_features))
    X_val = X_val.reshape((X_val.shape[0], X_val.shape[1], n_features))
    X_test = X_test.reshape((X_test.shape[0], X_test.shape[1], n_features))

    model = Sequential()
    model.add(BatchNormalization())
    model.add(Dropout(0.2))
    model.add(LSTM(75, return_sequences=True, input_shape=(X_train.shape[1], n_features), kernel_regularizer=l2(ANN_L2_REG)))
    model.add(BatchNormalization())
    model.add(Dropout(0.3))
    model.add(LSTM(50, return_sequences=True, kernel_regularizer=l2(ANN_L2_REG)))
    model.add(BatchNormalization())
    model.add(Dropout(0.2))
    model.add(GRU(50, return_sequences=True, kernel_regularizer=l2(ANN_L2_REG)))
    model.add(BatchNormalization())
    model.add(Dropout(0.2))
    model.add(LSTM(25, return_sequences=False, kernel_regularizer=l2(ANN_L2_REG)))
    model.add(BatchNormalization())
    model.add(Dropout(0.2))
    model.add(Dense(1))

    model.compile(optimizer="adam", loss="mean_squared_error")
    early_stop = EarlyStopping(monitor="val_loss", patience=ANN_EARLY_STOP_PATIENCE, restore_best_weights=True)
    reduce_lr = ReduceLROnPlateau(monitor="val_loss", factor=ANN_REDUCE_LR_FACTOR, patience=ANN_REDUCE_LR_PATIENCE, min_lr=ANN_MIN_LR)

    model.fit(
        X_train, y_train, batch_size=ANN_BATCH_SIZE, epochs=ANN_EPOCHS,
        validation_data=(X_val, y_val), callbacks=[early_stop, reduce_lr], verbose=0,
    )

    y_test_pred = model.predict(X_test, verbose=0)
    y_test_pred_inv = scaler_target.inverse_transform(y_test_pred)
    y_test_inv = scaler_target.inverse_transform(y_test.reshape(-1, 1))

    bias = y_test_inv.mean() - y_test_pred_inv.mean()
    y_test_pred_corrected = y_test_pred_inv + bias

    return y_test_inv.flatten(), y_test_pred_corrected.flatten()


def run_sarima(df: pd.DataFrame, target_col: str) -> tuple[pd.Series, pd.Series]:
    """Cell 17: SARIMAX baseline over the last SARIMA_TEST_SIZE daily
    points. Returns (test_actual, forecast_values), both indexed by date."""
    work = df.set_index("date").sort_index()
    series = work[target_col]

    train = series[: -SARIMA_TEST_SIZE]
    test = series[-SARIMA_TEST_SIZE:]

    model = SARIMAX(
        train, order=SARIMA_ORDER, seasonal_order=SARIMA_SEASONAL_ORDER,
        enforce_stationarity=False, enforce_invertibility=False,
    )
    results = model.fit(maxiter=SARIMA_MAX_ITER, disp=False)
    forecast = results.get_forecast(steps=len(test))

    return test, forecast.predicted_mean


def run_satellite_ann(
    gas: str,
    latitude: float,
    longitude: float,
    radius_km: float,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Entry point for Module A's satellite ANN forecast, for any of
    `SUPPORTED_GASES` ("SO2", "CH4", "CO2")."""
    if gas not in SATELLITE_ANN_TARGET_COLUMN:
        raise ValueError(f"Unsupported gas for satellite ANN: {gas!r} (expected one of {SUPPORTED_GASES})")
    target_col = SATELLITE_ANN_TARGET_COLUMN[gas]

    merged = fetch_satellite_series(gas, latitude, longitude, radius_km, start_date, end_date)

    if len(merged) <= SARIMA_TEST_SIZE + ANN_TIME_STEP:
        raise UnreadableFileError(
            f"Requested date range is too short to run the forecast (need more than "
            f"{SARIMA_TEST_SIZE + ANN_TIME_STEP} days of data, got {len(merged)})."
        )

    correlations = compute_correlations(merged, target_col)

    test_actual, forecast_values = run_sarima(merged, target_col)
    _, ann_pred = run_ann(merged, target_col)

    # Cell 21: truncate the ANN's own test predictions to the SARIMA test
    # window's length and pair them with its dates - reproducing the
    # notebook's pairing exactly, see module docstring.
    n = len(test_actual)
    ann_pred_aligned = ann_pred[:n] if len(ann_pred) >= n else np.pad(ann_pred, (0, n - len(ann_pred)), constant_values=np.nan)

    return {
        "timeSeries": {
            "dates": [d.strftime("%Y-%m-%d") for d in test_actual.index],
            "actual": [round(float(v), 3) for v in test_actual.to_numpy()],
            # ann_pred_aligned may be NaN-padded (see above) when the ANN's own
            # test split came up shorter than the SARIMA window - plain JSON
            # has no NaN, so those points serialize as null (a gap), which is
            # also how the notebook's own matplotlib line silently renders them.
            "ann": [None if np.isnan(v) else round(float(v), 3) for v in ann_pred_aligned],
            "sarima": [round(float(v), 3) for v in forecast_values.to_numpy()],
        },
        "correlations": correlations,
    }
