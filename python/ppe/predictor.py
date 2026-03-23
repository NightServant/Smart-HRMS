"""
PPE Predictor — Linear Regression for employee performance forecasting.

Adapted from /Users/gabe/PycharmProjects/LinearRegression/test_model.py.
Receives historical records as JSON (no SQL, no CSV reading).
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

# Column mapping: database snake_case → algorithm names
COLUMN_MAP = {
    "attendance_punctuality_rate": "Attendance_Rate_Pct",
    "absenteeism_days": "Absenteeism_Days",
    "tardiness_incidents": "Tardiness_Incidents",
    "training_completion_status": "Training_Completion_Status",
    "evaluated_performance_score": "Evaluated_Performance_Score",
    "year": "Year",
    "quarter": "Quarter",
}

FEATURES = [
    "Attendance_Rate_Pct",
    "Absenteeism_Days",
    "Tardiness_Incidents",
    "Training_Completion_Status",
]
TARGET = "Evaluated_Performance_Score"


def predict(payload: dict) -> dict:
    employee_name = payload.get("employee_name", "Unknown")
    records = payload.get("records", [])

    if len(records) < 8:
        return {
            "status": "insufficient_data",
            "employee_name": employee_name,
            "notification": f"Need at least 8 quarterly records to generate predictions. Found {len(records)}.",
        }

    # Build DataFrame and apply column mapping
    df = pd.DataFrame(records).rename(columns=COLUMN_MAP)

    # Ensure numeric types
    for col in FEATURES + [TARGET]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["Quarter_Num"] = df["Quarter"].str.replace("Q", "").astype(int)
    df = df.sort_values(["Year", "Quarter_Num"]).reset_index(drop=True)
    df["Time_Index"] = range(1, len(df) + 1)

    # Build historical labels and scores (quarterly)
    historical_labels = [f"{int(r.Year)}-Q{int(r.Quarter_Num)}" for r in df.itertuples()]
    historical_scores = [round(float(v), 2) for v in df[TARGET].tolist()]

    # Build yearly averages for historical chart
    yearly_avg = df.groupby("Year")[TARGET].mean()
    historical_yearly_labels = [str(int(y)) for y in yearly_avg.index]
    historical_yearly_scores = [round(float(v), 2) for v in yearly_avg.values]

    # Split: all years < max_year for training, max_year for testing
    last_year = int(df["Year"].max())
    train_df = df[df["Year"] < last_year]
    test_df = df[df["Year"] == last_year]

    if len(train_df) < 4:
        return {
            "status": "insufficient_data",
            "employee_name": employee_name,
            "notification": "Not enough training data (need at least 2 years of records).",
        }

    # Train performance model
    X_train = train_df[FEATURES]
    y_train = train_df[TARGET]

    model = LinearRegression()
    model.fit(X_train, y_train)

    # Extract coefficients
    coefficients = {"intercept": round(float(model.intercept_), 4)}
    for feat, coef in zip(FEATURES, model.coef_):
        coefficients[feat] = round(float(coef), 4)

    # Forecast future feature values using per-feature time trends
    recent_df = df.tail(4)
    future_features = {}

    for feat in FEATURES:
        feat_model = LinearRegression()
        feat_model.fit(df[["Time_Index"]], df[feat])
        last_t = int(df["Time_Index"].max())
        future_vals = feat_model.predict([[last_t + i] for i in range(1, 5)])

        if feat == "Attendance_Rate_Pct":
            future_vals = np.clip(future_vals, 70, 100)
        elif feat in ("Absenteeism_Days", "Tardiness_Incidents"):
            future_vals = np.clip(future_vals, 0, None).round().astype(int)
        elif feat == "Training_Completion_Status":
            prob = recent_df[feat].mean()
            future_vals = np.array([round(prob)] * 4)

        future_features[feat] = future_vals

    future_X = pd.DataFrame(future_features)

    # Generate future quarter labels
    last_year_data = df[df["Year"] == last_year]
    last_quarter = int(last_year_data["Quarter_Num"].max())

    future_labels = []
    q, y = last_quarter, last_year
    for _ in range(4):
        q += 1
        if q > 4:
            q = 1
            y += 1
        future_labels.append(f"{y}-Q{q}")

    # Predict next 4 quarters
    future_preds = model.predict(future_X)
    future_preds = np.clip(future_preds, 1.0, 5.0)
    forecast_scores = [round(float(v), 2) for v in future_preds]

    # Trend analysis
    recent_avg = round(float(df.tail(4)[TARGET].mean()), 2)
    forecast_avg = round(float(future_preds.mean()), 2)
    delta = forecast_avg - recent_avg

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
        },
        "forecast": {
            "labels": future_labels,
            "scores": forecast_scores,
        },
        "trend": trend,
        "recent_avg": recent_avg,
        "forecast_avg": forecast_avg,
        "coefficients": coefficients,
    }
