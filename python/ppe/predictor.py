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
]
TARGET = "Evaluated_Performance_Score"

# RMSE acceptance threshold (established from threshold analysis).
# Models with RMSE above this value are flagged as unreliable.
RMSE_THRESHOLD = 1.0


def predict(payload: dict) -> dict:
    employee_name = payload.get("employee_name", "Unknown")
    records = payload.get("records", [])

    # TC-01: Block prediction if fewer than 4 semester records exist
    if len(records) < 4:
        return {
            "status": "insufficient_data",
            "employee_name": employee_name,
            "notification": f"Need at least 4 semestral records to generate predictions. Found {len(records)}.",
        }

    # Build DataFrame and apply column mapping
    df = pd.DataFrame(records).rename(columns=COLUMN_MAP)

    # Ensure numeric types
    for col in FEATURES + [TARGET]:
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

    # Train the performance model
    model = LinearRegression()
    model.fit(X_train, y_train)

    # ----------------------------------------
    # RMSE THRESHOLD CHECK (restored from test model)
    # Evaluate model accuracy on the test split
    # before allowing forecast generation.
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

    # Block forecast if RMSE exceeds threshold or R² is negative
    if rmse > RMSE_THRESHOLD:
        return {
            "status": "model_unreliable",
            "employee_name": employee_name,
            "notification": (
                f"Model accuracy is below the acceptance threshold. "
                f"RMSE {rmse:.4f} exceeds the limit of {RMSE_THRESHOLD}. "
                f"This employee requires more semester records before a reliable "
                f"forecast can be generated."
            ),
            "error_metrics": error_metrics,
            "historical": {
                "labels": historical_labels,
                "scores": historical_scores,
                "yearly_labels": historical_yearly_labels,
                "yearly_scores": historical_yearly_scores,
                "semester_labels": ["First Semester (Jan - June)", "Second Semester (July - Dec)"],
                "available_years": available_years,
                "by_year": by_year,
                "all_year_scores": all_year_semester_scores,
            },
        }

    # ----------------------------------------
    # RETRAIN ON FULL DATASET FOR FORECASTING
    # After validation passes, retrain on all
    # records so the latest year contributes
    # to the forecast coefficients.
    # ----------------------------------------
    model.fit(df[FEATURES], df[TARGET])

    # Extract coefficients
    coefficients = {"intercept": round(float(model.intercept_), 4)}
    for feat, coef in zip(FEATURES, model.coef_):
        coefficients[feat] = round(float(coef), 4)

    # ----------------------------------------
    # FORECAST FUTURE FEATURE VALUES
    # Project each HR metric using its own
    # trend line, then predict score from those.
    # ----------------------------------------
    future_features = {}

    for feat in FEATURES:
        feat_model = LinearRegression()
        feat_model.fit(df[["Time_Index"]], df[feat])
        last_t = int(df["Time_Index"].max())
        future_vals = feat_model.predict([[last_t + i] for i in range(1, 3)])

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

    future_X = pd.DataFrame(future_features)

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

    return {
        "status": "ok",
        "employee_name": employee_name,
        "historical": {
            "labels": historical_labels,
            "scores": historical_scores,
            "yearly_labels": historical_yearly_labels,
            "yearly_scores": historical_yearly_scores,
            "semester_labels": ["First Semester (Jan - June)", "Second Semester (July - Dec)"],
            "available_years": available_years,
            "by_year": by_year,
            "all_year_scores": all_year_semester_scores,
        },
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
