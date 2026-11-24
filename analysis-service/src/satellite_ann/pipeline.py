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

Alignment (changed from the notebook, with the user's approval): the
notebook's cell 21 paired the ANN's test predictions (from the augmented
copy of the series) with the SARIMA window's dates by truncation, so the two
lines were about 128 days apart on a 1,600-day series. Here the ANN predicts
the same SARIMA_TEST_SIZE final days, date for date, using each day's real
preceding 5-day input window. The ANN is still trained on the full series
(as in the notebook) and its level is still shifted by the notebook's bias
correction (mean observed - mean predicted over that window), so its fit on
those days is in-sample and optimistic - results say so (meta.annEvaluation).
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
        if clean[feature].nunique() < 2 or clean[target_col].nunique() < 2:
            r = 0.0  # a constant column has no defined correlation; NaN is not valid JSON
        else:
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


def run_ann(df: pd.DataFrame, target_col: str, eval_days: int = SARIMA_TEST_SIZE) -> tuple[np.ndarray, np.ndarray, dict]:
    """Cells 7, 9-10: full LSTM-GRU train + bias-corrected predict.
    Returns (actual, predicted_corrected, future) for the final `eval_days`
    days of the series, date-aligned and inverse-scaled to the gas's real
    units; `future` is the notebook's
    cell 8/11 recursive FUTURE_DAYS-day-ahead forecast (see _future_forecast). Imports Keras lazily - it's the
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

    # Predict the final `eval_days` days one by one from their own preceding
    # ANN_TIME_STEP-day windows (target day p <- feature rows p-5 .. p-1, as in
    # _build_dataset), so each prediction lines up with its real date.
    n_rows = len(scaled_features)
    first = n_rows - eval_days
    X_eval = np.stack([scaled_features[p - ANN_TIME_STEP : p] for p in range(first, n_rows)])
    pred_inv = scaler_target.inverse_transform(model.predict(X_eval, verbose=0))
    actual = target.to_numpy()[first:].reshape(-1, 1)

    bias = actual.mean() - pred_inv.mean()  # notebook cell 9's bias correction
    y_test_inv = actual
    y_test_pred_corrected = pred_inv + bias

    future = _future_forecast(model, work, features, target, scaler_features, scaler_target, scaled_features)
    return y_test_inv.flatten(), y_test_pred_corrected.flatten(), future


FUTURE_DAYS = 365


def _future_forecast(model, work, features, target, scaler_features, scaler_target, scaled_features) -> dict:
    """Notebook cells 8 + 11: roll the last ANN_TIME_STEP-day window forward
    one day at a time, feeding each prediction back in as the next target
    value, then shift the whole path by the notebook's bias correction.

    Two deliberate differences from the notebook, both to keep inputs sane:
    the new day's calendar features are passed through the fitted feature
    scaler (the notebook wrote raw, unscaled values into scaled space), and
    the weather inputs (temperature, wind, pressure, rain) are held at their
    last observed values since the future weather is unknown."""
    cols = list(features.columns)
    window = scaled_features[-ANN_TIME_STEP:].copy()
    last_date = work.index[-1]
    preds: list[float] = []

    for i in range(FUTURE_DAYS):
        pred = float(model(window[np.newaxis, :, :], training=False).numpy()[0][0])
        preds.append(pred)

        d = last_date + pd.Timedelta(days=i + 1)
        doy = d.dayofyear
        woy = int(d.isocalendar()[1])
        row = features.iloc[-1].copy()
        row["day_of_week"] = d.dayofweek
        row["month"] = d.month
        row["week_of_year"] = woy
        row["day_sin"] = np.sin(2 * np.pi * doy / 365.25)
        row["day_cos"] = np.cos(2 * np.pi * doy / 365.25)
        row["week_sin"] = np.sin(2 * np.pi * woy / 52)
        row["week_cos"] = np.cos(2 * np.pi * woy / 52)
        scaled_row = scaler_features.transform(pd.DataFrame([row[cols].to_numpy()], columns=cols))[0]
        window = np.vstack((window[1:], scaled_row))

    inv = scaler_target.inverse_transform(np.array(preds).reshape(-1, 1)).flatten()
    inv = inv + (float(target.iloc[-ANN_TIME_STEP:].mean()) - float(inv.mean()))
    dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=FUTURE_DAYS, freq="D")
    return {
        "dates": [d.strftime("%Y-%m-%d") for d in dates],
        "values": [round(float(v), 3) for v in inv],
    }


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


def _forecast(merged: pd.DataFrame, target_col: str) -> dict:
    """Everything downstream of getting a daily dataframe (date, <gas>,
    temperature, ws, pressure, precipitation): correlations, SARIMA, ANN
    and the notebook's cell-21 pairing. Shared verbatim by the satellite
    path and the user-upload path so there is one implementation."""
    correlations = compute_correlations(merged, target_col)

    test_actual, forecast_values = run_sarima(merged, target_col)
    _, ann_pred, future = run_ann(merged, target_col, len(test_actual))

    n = len(test_actual)
    ann_pred_aligned = ann_pred  # already the same dates as test_actual

    return {
        "timeSeries": {
            "dates": [d.strftime("%Y-%m-%d") for d in test_actual.index],
            "actual": [round(float(v), 3) for v in test_actual.to_numpy()],
            "ann": [None if np.isnan(v) else round(float(v), 3) for v in ann_pred_aligned],
            "sarima": [round(float(v), 3) for v in forecast_values.to_numpy()],
        },
        "correlations": correlations,
        "future": future,
        "evaluation": {"window": int(n), "annInSample": True, "annBiasCorrected": True},
    }


def _require_enough_rows(n: int, what: str) -> None:
    need = SARIMA_TEST_SIZE + ANN_TIME_STEP
    if n <= need:
        raise UnreadableFileError(
            f"{what} is too short to run the forecast: need more than {need} daily "
            f"records, got {n}."
        )


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
    _require_enough_rows(len(merged), "The requested date range")

    out = _forecast(merged, target_col)
    out["meta"] = {"source": "satellite", "gas": gas, "rows": int(len(merged)), "annEvaluation": out.pop("evaluation")}
    return out


# --- user-uploaded data path -------------------------------------------------

# Accepted header spellings (compared case-insensitively, whitespace/underscore
# insensitive) -> canonical column the pipeline uses.
_COLUMN_ALIASES = {
    "date": {"date", "datetime", "timestamp", "time", "day"},
    "temperature": {"temperature", "temp", "airtemperature", "t2m"},
    "ws": {"ws", "windspeed", "wind", "windspeedms"},
    "pressure": {"pressure", "pres", "airpressure", "surfacepressure"},
    "precipitation": {"precipitation", "precip", "rain", "rainfall", "tp"},
}


def _norm(name: object) -> str:
    return "".join(ch for ch in str(name).lower() if ch.isalnum())


def _parse_dates(col: pd.Series) -> tuple[pd.Series, str]:
    """Parse a date column without pandas guessing month-first.

    ISO dates (2024-01-31) and named months (1-Jan-15, 31 Jan 2024) are
    unambiguous. For all-numeric dates like 03/04/2024 the order is worked
    out from the data - a first part above 12 proves day-first, a second part
    above 12 proves month-first - and when the file never settles it, day-first
    is assumed (the notebook's own `dayfirst=True`). Returns (dates, how) where
    `how` is "unambiguous", "day-first" or "month-first-detected" or
    "day-first-assumed" so the UI can say so."""
    text = col.astype(str).str.strip()
    parts = text.str.extract(r"^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})")
    numeric = parts.notna().all(axis=1)
    if numeric.sum() >= max(1, int(len(text) * 0.5)):
        first = pd.to_numeric(parts[0][numeric], errors="coerce")
        second = pd.to_numeric(parts[1][numeric], errors="coerce")
        if (first > 12).any():
            return pd.to_datetime(text, dayfirst=True, errors="coerce", format="mixed"), "day-first"
        if (second > 12).any():
            return pd.to_datetime(text, dayfirst=False, errors="coerce", format="mixed"), "month-first-detected"
        return pd.to_datetime(text, dayfirst=True, errors="coerce", format="mixed"), "day-first-assumed"
    return pd.to_datetime(text, errors="coerce", format="mixed"), "unambiguous"


def normalize_uploaded_frame(raw: pd.DataFrame, gas: str) -> tuple[pd.DataFrame, dict]:
    """Turn one combined user file (date, gas reading, weather columns) into
    the exact daily frame `_forecast` expects, plus a `meta` dict describing
    what was done to it (so the UI can be honest about resampling/filling).

    Time resolution is detected, not assumed: finer-than-daily data (e.g.
    hourly) is averaged to daily; daily data has small gaps filled by time
    interpolation; coarser-than-daily data (weekly/monthly) is rejected with
    a clear message, because the SARIMA/ANN settings ported from the
    notebook (5-day lookback, 200-day test window) are daily-specific."""
    if gas not in SATELLITE_ANN_TARGET_COLUMN:
        raise ValueError(f"Unsupported gas: {gas!r} (expected one of {SUPPORTED_GASES})")
    target_col = SATELLITE_ANN_TARGET_COLUMN[gas]

    # 1. map headers to canonical names
    lookup: dict[str, str] = {}
    for canonical, names in _COLUMN_ALIASES.items():
        for n in names:
            lookup[n] = canonical
    lookup[_norm(gas)] = target_col  # e.g. "co2", "so2", "ch4"
    renamed = {}
    for col in raw.columns:
        key = lookup.get(_norm(col))
        if key and key not in renamed.values():
            renamed[col] = key
    df = raw.rename(columns=renamed)

    required = ["date", target_col, "temperature", "ws", "pressure", "precipitation"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise UnreadableFileError(
            f"Uploaded file is missing column(s): {missing}. Expected headers: "
            f"date, {target_col}, temperature, ws, pressure, precipitation "
            f"(common alternatives like 'wind_speed' or 'temp' are accepted). "
            f"Found: {[str(c) for c in raw.columns]}"
        )
    df = df[required].copy()

    # 2. parse + clean
    df["date"], date_order = _parse_dates(df["date"])
    bad_dates = int(df["date"].isna().sum())
    df = df.dropna(subset=["date"])
    for c in required[1:]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    if df[target_col].notna().sum() == 0:
        raise UnreadableFileError(f"Column '{target_col}' has no numeric values.")
    df = df.sort_values("date")

    n_raw = len(df)
    if n_raw < 10:
        raise UnreadableFileError(f"Only {n_raw} usable rows found - need a time series of daily records.")

    # 3. detect time step from the median gap between distinct timestamps
    stamps = pd.DatetimeIndex(df["date"].drop_duplicates())
    step = stamps.to_series().diff().dropna().median()
    step_days = step / pd.Timedelta(days=1)

    meta: dict = {
        "source": "upload",
        "gas": gas,
        "rowsInFile": int(n_raw),
        "unparseableDates": bad_dates,
        "dateOrder": date_order,
        "detectedStep": None,
        "resampledToDaily": False,
        "filledDays": 0,
    }

    if step_days > 1.5:
        label = "weekly" if step_days < 10 else "monthly" if step_days < 45 else f"~{round(step_days)}-day"
        raise UnreadableFileError(
            f"Your data looks {label} (median gap {round(step_days, 1)} days). "
            f"This version of the forecast needs daily or finer records - the model "
            f"settings are daily-specific. Please upload daily (or hourly) data."
        )

    if step_days < 0.99:
        meta["detectedStep"] = "sub-daily"
        meta["resampledToDaily"] = True
        daily = df.set_index("date")[required[1:]].resample("D").mean()
    else:
        meta["detectedStep"] = "daily"
        daily = df.groupby(df["date"].dt.normalize())[required[1:]].mean()
        daily = daily.reindex(pd.date_range(daily.index.min(), daily.index.max(), freq="D"))

    # 4. fill small gaps (time interpolation), refuse if too many
    missing_target = int(daily[target_col].isna().sum())
    if missing_target / max(len(daily), 1) > 0.2:
        raise UnreadableFileError(
            f"{missing_target} of {len(daily)} days have no '{target_col}' reading (over 20%). "
            f"Please fill or trim the gaps and upload again."
        )
    meta["filledDays"] = missing_target
    daily = daily.interpolate(method="time", limit_direction="both")
    daily = daily.ffill().bfill()
    if daily.isna().any().any():
        bad = [c for c in daily.columns if daily[c].isna().any()]
        raise UnreadableFileError(f"Column(s) {bad} have no numeric values.")

    daily.index.name = "date"
    out = daily.reset_index()
    meta["rows"] = int(len(out))
    meta["startDate"] = out["date"].iloc[0].strftime("%Y-%m-%d")
    meta["endDate"] = out["date"].iloc[-1].strftime("%Y-%m-%d")
    return out, meta


def run_uploaded_ann(gas: str, raw: pd.DataFrame) -> dict:
    """Entry point for the user-upload path: same forecast as the satellite
    path, fed from one combined uploaded file instead of a satellite fetch."""
    merged, meta = normalize_uploaded_frame(raw, gas)
    _require_enough_rows(len(merged), "Your file")
    out = _forecast(merged, SATELLITE_ANN_TARGET_COLUMN[gas])
    meta["annEvaluation"] = out.pop("evaluation")
    out["meta"] = meta
    return out
