"""
PPE Predictor — Linear Regression for employee performance forecasting.

Adapted from /Users/gabe/PycharmProjects/LinearRegression/test_model.py.
Receives historical records as JSON (no SQL, no CSV reading).
Uses semestral periods (S1=Jan-Jun, S2=Jul-Dec) instead of quarterly.
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
    "period": "Period",
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

    # Train the performance model on the complete semestral history so
    # the latest available year contributes to the forecast.
    X_train = df[FEATURES]
    y_train = df[TARGET]

    model = LinearRegression()
    model.fit(X_train, y_train)

    # Extract coefficients
    coefficients = {"intercept": round(float(model.intercept_), 4)}
    for feat, coef in zip(FEATURES, model.coef_):
        coefficients[feat] = round(float(coef), 4)

    # Forecast future feature values using per-feature time trends
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
            recent_df = df.tail(2)
            prob = recent_df[feat].mean()
            future_vals = np.array([round(prob)] * 2)

        future_features[feat] = future_vals

    future_X = pd.DataFrame(future_features)

    # Generate future semester labels
    last_year = int(df["Year"].max())
    last_year_data = df[df["Year"] == last_year]
    last_period = int(last_year_data["Period_Num"].max())

    future_labels = []
    s, y = last_period, last_year
    for _ in range(2):
        s += 1
        if s > 2:
            s = 1
            y += 1
        future_labels.append(f"{y}-S{s}")

    # Predict next 2 semesters
    future_preds = model.predict(future_X)
    future_preds = np.clip(future_preds, 1.0, 5.0)
    forecast_scores = [round(float(v), 2) for v in future_preds]

    # Trend analysis
    recent_avg = round(float(df.tail(2)[TARGET].mean()), 2)
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
    }
