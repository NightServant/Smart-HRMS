"""
FlatFAT Configuration — Weights, thresholds, and scoring rules.

This file defines all configurable parameters for the FlatFAT algorithm.
Modify these values to adjust algorithm behavior.
"""

# Scoring Weights (must sum to 1.0)
WEIGHTS = {
    "performance": 0.50,      # Historical performance rating (50%)
    "attendance": 0.30,       # Attendance percentage (30%)
    "task_completion": 0.20,  # Task completion percentage (20%)
}

# Risk Status Thresholds
THRESHOLDS = {
    "high_risk": 3.0,         # Score < 3.0 = High Risk
    "satisfactory": 3.0,      # Score >= 3.0 = Satisfactory
}

# Status Mapping
STATUS_MAP = {
    "high_risk": "High Risk",
    "satisfactory": "Satisfactory",
    "excellent": "Excellent",
}

# Default Values (for employees with missing data)
DEFAULTS = {
    "performance_rating": 2.5,      # Default performance rating (out of 5.0)
    "attendance_percentage": 80.0,  # Default attendance % (out of 100)
    "task_completion": 75.0,        # Default task completion % (out of 100)
}

# Time Thresholds for Status Determination
TIME_THRESHOLDS = {
    "on_time_until": 9,  # Clock-ins at or before 9 AM = "On Time"
    "late_after": 9,     # Clock-ins after 9 AM = "Late"
}

# Aggregation Rules
AGGREGATION = {
    "min_employees": 1,           # Minimum employees to include in aggregate
    "exclude_inactive": False,    # Whether to exclude inactive employees
    "round_decimals": 2,          # Round final score to 2 decimals
}

# Caching Rules (optional)
CACHING = {
    "enable": True,
    "ttl_seconds": 300,  # 5 minutes
}
