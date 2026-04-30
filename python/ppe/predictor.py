"""
PPE Predictor — Linear Regression for employee performance forecasting.

Adapted from /Users/gabe/PycharmProjects/LinearRegression/test_model.py.
Receives historical records as JSON (no SQL, no CSV reading).
Uses semestral periods (S1=Jan-Jun, S2=Jul-Dec) instead of quarterly.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error

# Column mapping: database snake_case → algorithm names
COLUMN_MAP = {
    "attendance_punctuality_rate": "Attendance_Rate_Pct",
    "absenteeism_days": "Absenteeism_Days",
    "tardiness_incidents": "Tardiness_Incidents",
    "training_completion_status": "Training_Completion_Status",
    "evaluated_performance_score": "Evaluated_Performance_Score",
    "year": "Year",
    "period": "Period",
}

FEATURES = [
    "Attendance_Rate_Pct",
    "Absenteeism_Days",
    "Tardiness_Incidents",
    "Training_Completion_Status",
    "Time_Index",
]
TARGET = "Evaluated_Performance_Score"

# RMSE acceptance threshold (established from threshold analysis).
# Models with RMSE above this value are flagged as unreliable.
RMSE_THRESHOLD = 1.0

# Anchor weight: blends the latest actual score into every forecast value so
# that a recent dip or improvement is visibly reflected in the projection.
# final_forecast = ANCHOR_WEIGHT * latest_actual + (1 - ANCHOR_WEIGHT) * regression_forecast
ANCHOR_WEIGHT = 0.6


def predict(payload: dict) -> dict:
    employee_name = payload.get("employee_name", "Unknown")
    records = payload.get("records", [])

    if len(records) == 0:
        return {
            "status": "insufficient_data",
            "employee_name": employee_name,
            "notification": "No semestral records found for this employee.",
        }

    # Build DataFrame and apply column mapping
    df = pd.DataFrame(records).rename(columns=COLUMN_MAP)

    # Ensure numeric types for HR features and target
    # (Time_Index is assigned below after sorting, so skip it here)
    HR_COLS = [f for f in FEATURES if f != "Time_Index"] + [TARGET]
    for col in HR_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["Period_Num"] = df["Period"].str.replace("S", "").astype(int)
    df = df.sort_values(["Year", "Period_Num"]).reset_index(drop=True)
    df["Time_Index"] = range(1, len(df) + 1)

    # Build historical labels and scores (semestral)
    historical_labels = [f"{int(r.Year)}-S{int(r.Period_Num)}" for r in df.itertuples()]
    historical_scores = [round(float(v), 2) for v in df[TARGET].tolist()]

    # Build yearly averages for historical chart
    yearly_avg = df.groupby("Year")[TARGET].mean()
    historical_yearly_labels = [str(int(y)) for y in yearly_avg.index]
    historical_yearly_scores = [round(float(v), 2) for v in yearly_avg.values]

    available_years = sorted({int(year) for year in df["Year"].tolist()})
    by_year = {}
    for year in available_years:
        year_df = df[df["Year"] == year]
        by_year[str(year)] = [
            round(float(year_df[year_df["Period_Num"] == 1][TARGET].mean()), 2) if not year_df[year_df["Period_Num"] == 1].empty else None,
            round(float(year_df[year_df["Period_Num"] == 2][TARGET].mean()), 2) if not year_df[year_df["Period_Num"] == 2].empty else None,
        ]

    all_year_semester_scores = [
        round(float(df[df["Period_Num"] == 1][TARGET].mean()), 2) if not df[df["Period_Num"] == 1].empty else None,
        round(float(df[df["Period_Num"] == 2][TARGET].mean()), 2) if not df[df["Period_Num"] == 2].empty else None,
    ]

    historical_block = {
        "labels": historical_labels,
        "scores": historical_scores,
        "yearly_labels": historical_yearly_labels,
        "yearly_scores": historical_yearly_scores,
        "semester_labels": ["First Semester (Jan - June)", "Second Semester (July - Dec)"],
        "available_years": available_years,
        "by_year": by_year,
        "all_year_scores": all_year_semester_scores,
    }

    n = len(df)

    # -------------------------------------------------------
    # LOW-CONFIDENCE PATH (fewer than 4 records)
    # Skip regression entirely; use flat projection from the
    # mean of all available scores. No RMSE can be computed.
    # -------------------------------------------------------
    if n < 4:
        mean_score = round(float(df[TARGET].mean()), 2)
        last_year  = int(df["Year"].max())
        last_period = int(df[df["Year"] == last_year]["Period_Num"].max())

        future_labels = []
        s, y = last_period, last_year
        for _ in range(2):
            s += 1
            if s > 2:
                s = 1
                y += 1
            future_labels.append(f"{y}-S{s}")

        latest_actual   = round(float(df[TARGET].iloc[-1]), 2)
        blended         = round(ANCHOR_WEIGHT * latest_actual + (1 - ANCHOR_WEIGHT) * mean_score, 2)
        forecast_scores = [blended, blended]
        recent_avg      = mean_score
        forecast_avg    = blended

        return {
            "status": "ok",
            "low_confidence": True,
            "employee_name": employee_name,
            "notification": (
                f"Forecast is based on {n} semestral record(s). "
                "Results are low-confidence until more records are available."
            ),
            "historical": historical_block,
            "forecast": {
                "labels": future_labels,
                "scores": forecast_scores,
                "semester_labels": ["First Semester (Jan - June)", "Second Semester (July - Dec)"],
            },
            "trend": "STABLE",
            "recent_avg": recent_avg,
            "forecast_avg": forecast_avg,
            "error_metrics": {
                "mse": None,
                "rmse": None,
                "mae": None,
                "r2": None,
                "threshold": RMSE_THRESHOLD,
                "split_fallback": True,
            },
        }

    # ----------------------------------------
    # TRAIN / TEST SPLIT (Chronological)
    # Train on all years before the latest year.
    # Test on the latest year (TC-03, TC-04).
    # ----------------------------------------
    last_year = int(df["Year"].max())
    train_df  = df[df["Year"] < last_year]
    test_df   = df[df["Year"] == last_year]

    # Fallback: if only one year of data exists, train on all records
    # and skip the RMSE evaluation (insufficient split possible).
    if len(train_df) < 2:
        train_df = df
        test_df  = df.tail(2)
        split_fallback = True
    else:
        split_fallback = False

    X_train = train_df[FEATURES]
    y_train = train_df[TARGET]
    X_test  = test_df[FEATURES]
    y_test  = test_df[TARGET]

    # Recency weights for the training split
    n_train = len(train_df)
    train_weights = np.array([0.85 ** (n_train - 1 - i) for i in range(n_train)])
    train_weights = train_weights / train_weights.sum() * n_train

    # Train the performance model
    model = LinearRegression()
    model.fit(X_train, y_train, sample_weight=train_weights)

    # ----------------------------------------
    # RMSE EVALUATION
    # Compute metrics but only use them as an
    # informational signal — never block the
    # forecast when the sample size is small.
    # ----------------------------------------
    y_pred_test = model.predict(X_test)

    mse  = round(float(mean_squared_error(y_test, y_pred_test)), 4)
    rmse = round(float(np.sqrt(mse)), 4)
    mae  = round(float(mean_absolute_error(y_test, y_pred_test)), 4)
    r2   = round(float(model.score(X_test, y_test)), 4)

    error_metrics = {
        "mse":  mse,
        "rmse": rmse,
        "mae":  mae,
        "r2":   r2,
        "threshold": RMSE_THRESHOLD,
        "split_fallback": split_fallback,
    }

    # Flag low confidence when RMSE exceeds threshold, but still forecast.
    low_confidence = rmse > RMSE_THRESHOLD
    notification   = (
        f"Forecast confidence is low (RMSE {rmse:.4f} exceeds {RMSE_THRESHOLD}). "
        "More semestral records will improve accuracy."
        if low_confidence else None
    )

    # ----------------------------------------
    # RETRAIN ON FULL DATASET FOR FORECASTING
    # After validation, retrain on all records
    # with recency weighting so the most recent
    # semesters exert stronger influence on the
    # regression coefficients.
    # ----------------------------------------
    # Recency weights: exponential decay so the
    # latest record has weight 1.0 and each prior
    # record is discounted by 15 % per step.
    n_all = len(df)
    recency_weights = np.array([0.85 ** (n_all - 1 - i) for i in range(n_all)])
    recency_weights = recency_weights / recency_weights.sum() * n_all  # keep scale

    model.fit(df[FEATURES], df[TARGET], sample_weight=recency_weights)

    # Extract coefficients
    coefficients = {"intercept": round(float(model.intercept_), 4)}
    for feat, coef in zip(FEATURES, model.coef_):
        coefficients[feat] = round(float(coef), 4)

    # ----------------------------------------
    # FORECAST FUTURE FEATURE VALUES
    # Project each HR metric (non-time features)
    # using its own trend line, then predict the
    # score from those plus the future Time_Index.
    # ----------------------------------------
    HR_FEATURES = [f for f in FEATURES if f != "Time_Index"]
    future_features = {}
    last_t = int(df["Time_Index"].max())

    for feat in HR_FEATURES:
        feat_model = LinearRegression()
        feat_model.fit(df[["Time_Index"]], df[feat])
        future_t = pd.DataFrame({"Time_Index": [last_t + 1, last_t + 2]})
        future_vals = feat_model.predict(future_t)

        if feat == "Attendance_Rate_Pct":
            future_vals = np.clip(future_vals, 70, 100)
        elif feat in ("Absenteeism_Days", "Tardiness_Incidents"):
            future_vals = np.clip(future_vals, 0, None).round().astype(int)
        elif feat == "Training_Completion_Status":
            # Use last 4 semesters (2 years) for a more stable probability estimate
            recent_df = df.tail(4)
            prob = recent_df[feat].mean()
            future_vals = np.array([round(prob)] * 2)

        future_features[feat] = future_vals

    # Supply future Time_Index values directly
    future_features["Time_Index"] = np.array([last_t + 1, last_t + 2])

    future_X = pd.DataFrame(future_features)[FEATURES]

    # Generate future semester labels (TC-04)
    last_year_data = df[df["Year"] == last_year]
    last_period    = int(last_year_data["Period_Num"].max())

    future_labels = []
    s, y = last_period, last_year
    for _ in range(2):
        s += 1
        if s > 2:
            s = 1
            y += 1
        future_labels.append(f"{y}-S{s}")

    # Predict next 2 semesters
    future_preds  = model.predict(future_X)
    future_preds  = np.clip(future_preds, 1.0, 5.0)

    # Anchor blend: pull each forecast value toward the latest actual score so
    # that recent performance is visibly reflected in the projection.
    latest_actual = float(df[TARGET].iloc[-1])
    future_preds  = np.array([
        ANCHOR_WEIGHT * latest_actual + (1 - ANCHOR_WEIGHT) * v
        for v in future_preds
    ])
    future_preds  = np.clip(future_preds, 1.0, 5.0)

    forecast_scores = [round(float(v), 2) for v in future_preds]

    # ----------------------------------------
    # TREND ANALYSIS (TC-05)
    # Use last 4 semesters (2 years) for a
    # stable recent average — consistent with
    # the test model discussion.
    # ----------------------------------------
    recent_avg   = round(float(df.tail(4)[TARGET].mean()), 2)
    forecast_avg = round(float(future_preds.mean()), 2)
    delta        = forecast_avg - recent_avg

    if delta > 0.1:
        trend = "IMPROVING"
    elif delta < -0.1:
        trend = "DECLINING"
    else:
        trend = "STABLE"

    result = {
        "status": "ok",
        "employee_name": employee_name,
        "historical": historical_block,
        "forecast": {
            "labels": future_labels,
            "scores": forecast_scores,
            "semester_labels": ["First Semester (Jan - June)", "Second Semester (July - Dec)"],
        },
        "trend": trend,
        "recent_avg": recent_avg,
        "forecast_avg": forecast_avg,
        "coefficients": coefficients,
        "error_metrics": error_metrics,
    }

    if low_confidence:
        result["low_confidence"] = True
        result["notification"]   = notification

    return result
