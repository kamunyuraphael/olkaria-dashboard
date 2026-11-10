"""
Every constant here is a verbatim number or formula copy from the analysis
team's notebooks (AERMODfinal.ipynb for dispersion, ANN_manu_1_code.ipynb
for the CO2 ANN forecast). Nothing in this file is derived or tuned here -
each value is traceable to a specific notebook cell, documented inline, so
updating it later means editing one line, not re-deriving a formula.

Per the project decision: the dispersion outputs reproduce the analysis
team's actual notebook results exactly, including inconsistencies between
gases/windows (different engines, different grids, different receptor-
selection logic per gas) - see dispersion/pipeline.py docstrings for which
engine/grid each (gas, window) pair uses and which notebook cell it mirrors.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Coordinate reference systems (notebook: every final map, e.g. cell 45)
# ---------------------------------------------------------------------------
UTM_EPSG = "EPSG:32737"       # source/receptor coordinates (UTM Zone 37S)
WEB_MERCATOR_EPSG = "EPSG:3857"  # basemap tiles
WGS84_EPSG = "EPSG:4326"         # lon/lat for GeoJSON output

# ---------------------------------------------------------------------------
# Source preparation (notebook cell 20: create_source_subcells)
# ---------------------------------------------------------------------------
SOURCE_SUBDIVISION_RESOLUTION_M = 5

# ---------------------------------------------------------------------------
# Main 21x21 receptor grid, shared by CO2 and CH4 (notebook cell 7)
# ---------------------------------------------------------------------------
MAIN_GRID_DOMAIN_SIZE_M = 10_000
MAIN_GRID_POINTS = 21
MAIN_GRID_RECEPTOR_HEIGHT_M = 2

# ---------------------------------------------------------------------------
# CO2 display/interpolation grids
# ---------------------------------------------------------------------------
# 1-hour map (cell 36): tight cubic grid bounded exactly to the receptor
# field's own min/max, no buffer, no calibration.
CO2_1HR_GRID_POINTS = 250
CO2_1HR_CONTOUR_LEVELS = [0, 0.5, 1, 2, 5, 10, 15, 20, 25]  # fixed AERMOD classes, not percentile-based
# A leading 0 was added to the original fixed AERMOD classes (0.5, 1, 2, ...)
# so field_to_geojson's contourf gets an ordinary 0->0.5 band covering
# everywhere the field sits below the AERMOD floor, instead of leaving that
# area unfilled (matplotlib's default: nothing is drawn below the lowest
# level). Most of a real 1hr field sits below 0.5, so without this the map
# came out as a patchy, discontinuous shape - see field_to_geojson's comment
# for why the fix belongs here and not as contourf's extend="both".

# 8hr/24hr/monthly "corrected" + monthly maps share one fixed-buffer display
# grid (cell 37): 151x151, +/-2000m around the emission-source bounding box.
CO2_DISPLAY_GRID_POINTS = 151
CO2_DISPLAY_GRID_BUFFER_M = 2000

# "1hr" here is a deliberate, product-level departure from cell 36 (not
# traceable to a notebook cell like the rest of this file) - the notebook
# leaves CO2's 1-hour map unsmoothed, but that read as a jagged "star" once
# rendered as an interactive contour layer, not a real plume shape. Checked
# directly (not eyeballed): this grid is heavily oversampled relative to its
# own input data - CO2_1HR_GRID_POINTS=250 over the main 21x21 receptor grid's
# 10km domain works out to a receptor spacing of ~12 display-grid cells, so
# any sigma much below that just smooths noise within one receptor's own
# cell without blending across receptors, which is why an earlier, smaller
# value here (3, by analogy to CH4's own "1hr" entry) barely changed the
# rendered shape. 12 - roughly one receptor spacing - is the value actually
# verified (via a direct contourf render of several sigmas side by side) to
# round off the star points into the notebook's smooth filled bands without
# flattening the plume into a featureless blob (sigma 18+ started doing that).
CO2_SMOOTHING_SIGMA = {"1hr": 12, "8hr": 5, "24hr": 3, "monthly": 3}  # cells 48, 64, 70 - no notebook cell for 1hr
CO2_CALIBRATION_TARGET_MAX = {"8hr": 200, "24hr": 100, "monthly": 17.5}  # cells 60, 65, 72 - no 1hr entry, 1hr stays uncalibrated (unchanged: only smoothing was requested)

# ---------------------------------------------------------------------------
# CH4 - shares the main 21x21 receptor grid, but builds its own expanded
# display grid (cell 83: buffer_fraction=0.25 around receptor_X/Y, 151x151),
# reused across all 4 windows ("SAME AS 1-HOUR CH4" per cell 87).
# ---------------------------------------------------------------------------
CH4_DISPLAY_GRID_POINTS = 151
CH4_DISPLAY_GRID_BUFFER_FRACTION = 0.25

CH4_SMOOTHING_SIGMA = {"1hr": 3, "8hr": 3, "24hr": 3, "monthly": 2}  # cells 83, 88, 93, 99
CH4_CALIBRATION_TARGET_MAX = {"1hr": 22.3, "8hr": 11.6, "24hr": 3.66, "monthly": 1.33}  # cells 84, 88, 93, 99

# CH4 diurnal (cells 103-105): single hardcoded event day, fixed receptor
# indices into the MAIN 21x21 grid (not dynamically selected like CO2's).
CH4_DIURNAL_EVENT_DATE = "2023-06-06"
CH4_H2S_DIURNAL_RECEPTOR_INDICES = {"R1": 123, "R2": 169, "R3": 421, "R4": 144}  # cell 103 / reused by H2S cell 124
CH4_DIURNAL_SMOOTHING_SIGMA = 1.2  # gaussian_filter1d, cell 104

# ---------------------------------------------------------------------------
# H2S - builds its OWN wider receptor grid (cell 112), separate from the
# main 21x21 grid CO2/CH4 share, sized to H2S's own source spread.
# ---------------------------------------------------------------------------
H2S_RECEPTOR_GRID_MARGIN_M = 2000
H2S_RECEPTOR_GRID_POINTS = 51

H2S_DISPLAY_GRID_POINTS = 151
H2S_DISPLAY_GRID_BUFFER_FRACTION = 0.25
H2S_SMOOTHING_SIGMA = 3  # cells 118, 121 (build_h2s_field default) - same for all 4 windows

# Targets read off Figures 4.14-4.17 (cell 117)
H2S_CALIBRATION_TARGET_MAX = {"1hr": 50.983, "8hr": 24.9, "24hr": 7.66, "monthly": 1.67}

# H2S diurnal (cells 124-125): reuses CH4's hardcoded indices but applied as
# coordinates taken from the ORIGINAL main grid's X/Y arrays (cell 124 does
# X.flatten()[i] against the main grid, NOT h2s_receptors) - i.e. likely
# different physical points than CH4's R1-R4 despite sharing the same index
# numbers. Event day is dynamic: the day containing H2S's peak hour.
H2S_DIURNAL_SMOOTHING_SIGMA = 1.2  # gaussian_filter1d, cell 125

# ---------------------------------------------------------------------------
# Contour -> GeoJSON rendering (field_to_geojson). NOT from the notebook -
# the notebook only ever rendered matplotlib contourf to screen and never
# needed these; they're geojsoncontour's own knobs for problems that only
# show up once a contour becomes an interactive map layer:
#   - min_angle_deg: vertex decimation. Without it (the library's default is
#     none), a contour built from a fine interpolation grid over few/sparse
#     source points comes out visibly jagged - what read as "spiky" bands,
#     especially CO2's 1-hour map. 15 degrees matches the library's own
#     documented example.
#   - fill_opacity_range: the library's flat 0.9 default would blot out the
#     satellite basemap regardless of tile quality. The analysis team's own
#     real figures (4.4, 4.14, 4.17 - confirmed by reading them directly,
#     each titled "...over Satellite Terrain Background") show translucent
#     fill with roads/terrain/the lake legible underneath, with the densest
#     band noticeably more solid than the outer ones - a ramp, not a flat
#     value. A prior pass here replaced the satellite basemap with a plain
#     white canvas and dropped this to match (reasoning the notebook had no
#     basemap at all) - that was checked against the wrong cell (36, a
#     plain-axes exception) and got reverted; the basemap is back, so this
#     needs to come back with it.
# ---------------------------------------------------------------------------
CONTOUR_MIN_ANGLE_DEG = 15
CONTOUR_FILL_OPACITY_RANGE = (0.25, 0.85)

# ---------------------------------------------------------------------------
# CO2 diurnal (cells 74-77): dynamic top-4 receptors by mean concentration
# over the full dataset, full-period hourly-mean-by-hour-of-day, then a -5h
# cyclic roll "to align with AERMOD output".
# ---------------------------------------------------------------------------
CO2_DIURNAL_RECEPTOR_COUNT = 4
CO2_DIURNAL_CYCLIC_SHIFT_HOURS = -5

# ---------------------------------------------------------------------------
# Input column names - mirrors the exact headers AERMODfinal.ipynb expects
# (cells 3-5). Centralized here so a different analysis-team export format
# is a one-place edit, not a hunt through every module.
# ---------------------------------------------------------------------------
SOURCE_COLUMNS = {
    "id": "Source ID",
    "x": "X Coord (m)",
    "y": "Y Coord (m)",
    "x_length": "XLength (m)",
    "y_length": "YLength (m)",
    "emission_rate": "Emission Rate (g/s)",
    "release_height": "Release Height",
    "base_elevation": "Base Elevation",
}

MET_COLUMNS = {
    "year": "Year",   # notebook adds 2000 to get a 4-digit year (cell 8)
    "month": "Month",
    "day": "Day",
    "hour": "Hour",
    "cloud_cover": "Cloud Cover (Oktas)",
    "wind_speed_kmh": "Wind Speed (km/h)",
    "wind_direction_deg": "Wind Direction (°)",
}

# Pasquill-style stability class -> mixing height / Monin-Obukhov length
# (cell 9's assign_stability + the two lookup dicts)
STABILITY_MIXING_HEIGHT_M = {"A": 1500, "B": 1200, "C": 1000, "D": 800}
STABILITY_MONIN_OBUKHOV_LENGTH_M = {"A": -50, "B": -100, "C": -150, "D": 200}

CO2_ANN_INPUT_COLUMNS = ["date", "co2", "temperature", "ws", "pressure", "precipitation"]

# ---------------------------------------------------------------------------
# CO2 ANN forecast (ANN_manu_1_code.ipynb)
# ---------------------------------------------------------------------------
ANN_TIME_STEP = 5           # cell 7: 5-day lookback window
ANN_NOISE_FACTOR = 0.005    # cell 7: data-augmentation noise
ANN_BATCH_SIZE = 16
ANN_EPOCHS = 40
ANN_EARLY_STOP_PATIENCE = 15
ANN_REDUCE_LR_PATIENCE = 5
ANN_REDUCE_LR_FACTOR = 0.5
ANN_MIN_LR = 1e-5
ANN_L2_REG = 0.001

SARIMA_ORDER = (3, 1, 3)              # cell 17
SARIMA_SEASONAL_ORDER = (1, 1, 1, 12)
SARIMA_MAX_ITER = 500
SARIMA_TEST_SIZE = 200  # cell 17: "last 200 points as test"

# ---------------------------------------------------------------------------
# Satellite ANN forecast (Module A: SO2 / CH4 / CO2) - satellite input is
# PLACEHOLDER, not from a notebook.
#
# Team decision (2026): all three gases in Module A take just coordinates +
# a buffer radius, fetching gas + weather data from satellite (Earth Engine)
# directly - no file uploads. CO2 ANN was the first of the three wired up
# this way; SO2 and CH4 (the pipeline's original two gases, per the
# ANN_manu_1_code.ipynb research this module ports) now reuse the exact same
# LSTM-GRU + SARIMA pipeline, parameterized by gas - see
# `satellite_ann_pipeline.run_satellite_ann`. Which real GEE dataset/
# collection ID to pull each gas from is still unsettled with the analysis
# team (TROPOMI, used elsewhere in this project for SO2/CH4, does not
# resolve CO2 well), so until that's decided this generates a deterministic
# synthetic series per gas instead of calling Earth Engine.
# `src/satellite/simulate.py` is the one place to replace with a real GEE
# pull once a dataset is chosen per gas - everything downstream (merge,
# correlations, SARIMA, ANN) is unaffected by that swap.
# ---------------------------------------------------------------------------
SATELLITE_SIM_DEFAULT_LOOKBACK_DAYS = 400  # used when startDate/endDate aren't given

# Target column name + display unit per gas - centralized so the pipeline,
# the simulated satellite source, and the API layer all agree.
SATELLITE_ANN_TARGET_COLUMN = {"SO2": "so2", "CH4": "ch4", "CO2": "co2"}
SATELLITE_ANN_UNIT = {"SO2": "µg/m³", "CH4": "ppb", "CO2": "ppm"}

SATELLITE_SIM_CO2_BASE_PPM = 415.0
SATELLITE_SIM_CO2_ANNUAL_TREND_PPM_PER_YEAR = 2.4  # Mauna Loa-ish secular rise, for plausibility only
SATELLITE_SIM_CO2_SEASONAL_AMPLITUDE_PPM = 4.0
SATELLITE_SIM_CO2_NOISE_SIGMA_PPM = 1.2

# SO2 - geothermal/volcanic tracer (Olkaria's own source), so a much higher
# relative noise-to-signal than CO2's well-mixed atmospheric background -
# plausible for a plume-influenced site, not derived from a real retrieval.
SATELLITE_SIM_SO2_BASE_UGM3 = 9.0
SATELLITE_SIM_SO2_SEASONAL_AMPLITUDE_UGM3 = 2.2
SATELLITE_SIM_SO2_NOISE_SIGMA_UGM3 = 1.8

# CH4 - atmospheric background + a modern secular rise (~9 ppb/yr is
# broadly in line with recent global growth rates), for plausibility only.
SATELLITE_SIM_CH4_BASE_PPB = 1900.0
SATELLITE_SIM_CH4_ANNUAL_TREND_PPB_PER_YEAR = 9.0
SATELLITE_SIM_CH4_SEASONAL_AMPLITUDE_PPB = 15.0
SATELLITE_SIM_CH4_NOISE_SIGMA_PPB = 6.0

SATELLITE_SIM_TEMPERATURE_BASE_C = 19.0  # Olkaria-ish highland climate
SATELLITE_SIM_TEMPERATURE_SEASONAL_AMPLITUDE_C = 3.0
SATELLITE_SIM_TEMPERATURE_NOISE_SIGMA_C = 1.5
SATELLITE_SIM_WIND_SPEED_BASE_MS = 3.5
SATELLITE_SIM_WIND_SPEED_NOISE_SIGMA_MS = 1.0
SATELLITE_SIM_PRESSURE_BASE_HPA = 1013.0
SATELLITE_SIM_PRESSURE_NOISE_SIGMA_HPA = 4.0
SATELLITE_SIM_PRECIPITATION_BASE_MM = 2.0
SATELLITE_SIM_PRECIPITATION_NOISE_SIGMA_MM = 3.0
