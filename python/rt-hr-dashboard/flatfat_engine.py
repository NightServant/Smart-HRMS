"""
FlatFAT Engine — Flexible Layered Performance Aggregation and Forecasting Algorithm.

Calculates performance scores by combining:
- Historical performance rating (DPCR scores from IPCR)
- Attendance percentage (from biometric punch records)
- Task completion percentage (from evaluations)

All inputs are normalized to 0-1 scale, weighted, and converted to 1-5 DPCR scale.
"""

import json
from datetime import datetime, timedelta
from typing import Any, Optional


class FlatFATEngine:
    """Main FlatFAT scoring engine."""

    def __init__(self, config: dict):
        """
        Initialize with configuration.

        Args:
            config: Dictionary with weights, thresholds, defaults
        """
        self.weights = config.get("weights", {})
        self.thresholds = config.get("thresholds", {})
        self.defaults = config.get("defaults", {})

    def calculate_employee_score(
        self, employee_id: str, data: dict, quarter: Optional[str] = None
    ) -> dict:
        """
        Calculate performance score for a single employee.

        Args:
            employee_id: Employee ID
            data: Dictionary with metrics {
                'performance_rating': float (1-5),
                'attendance_pct': float (0-100),
                'task_completion_pct': float (0-100),
            }
            quarter: Optional quarter string (Q1, Q2, Q3, Q4)

        Returns:
            Dictionary with score and breakdown:
            {
                'employee_id': str,
                'final_rating': float (1-5),
                'performance_pct': float,
                'attendance_pct': float,
                'task_pct': float,
                'risk_status': str,
                'quarter': str,
                'component_scores': {...},
                'timestamp': ISO string,
            }
        """
        # Extract metrics with defaults
        performance_rating = data.get("performance_rating", self.defaults.get(
            "performance_rating", 2.5))
        attendance_pct = data.get("attendance_pct", self.defaults.get(
            "attendance_percentage", 80.0))
        task_completion_pct = data.get("task_completion_pct", self.defaults.get(
            "task_completion", 75.0))

        # Normalize to 0-1 scale
        norm_performance = max(0, min(1, performance_rating / 5.0))
        norm_attendance = max(0, min(1, attendance_pct / 100.0))
        norm_task = max(0, min(1, task_completion_pct / 100.0))

        # Apply weights
        weighted_performance = norm_performance * \
            self.weights.get("performance", 0.50)
        weighted_attendance = norm_attendance * \
            self.weights.get("attendance", 0.30)
        weighted_task = norm_task * self.weights.get("task_completion", 0.20)

        # Calculate total normalized score
        total_normalized = weighted_performance + weighted_attendance + weighted_task

        # Convert back to 1-5 DPCR scale
        final_rating = total_normalized * 5.0

        # Determine risk status
        high_risk_threshold = self.thresholds.get("high_risk", 3.0)
        if final_rating < high_risk_threshold:
            risk_status = "High Risk"
        else:
            risk_status = "Satisfactory"

        return {
            "employee_id": employee_id,
            "final_rating": round(final_rating, 2),
            "performance_pct": round(performance_rating, 2),
            "attendance_pct": round(attendance_pct, 2),
            "task_pct": round(task_completion_pct, 2),
            "risk_status": risk_status,
            "quarter": quarter or self._get_current_quarter(),
            "component_scores": {
                "weighted_performance": round(weighted_performance * 5, 2),
                "weighted_attendance": round(weighted_attendance * 5, 2),
                "weighted_task": round(weighted_task * 5, 2),
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    def calculate_department_aggregate(
        self, department_id: str, employee_scores: list[dict], quarter: Optional[str] = None
    ) -> dict:
        """
        Aggregate scores by department.

        Args:
            department_id: Department identifier
            employee_scores: List of score dictionaries from calculate_employee_score
            quarter: Optional quarter

        Returns:
            Aggregated score dictionary
        """
        if not employee_scores:
            return {
                "department_id": department_id,
                "total_employees": 0,
                "average_rating": 0,
                "high_risk_count": 0,
                "satisfactory_count": 0,
                "quarter": quarter or self._get_current_quarter(),
            }

        total_employees = len(employee_scores)
        average_rating = sum(
            score.get("final_rating", 0) for score in employee_scores
        ) / total_employees if total_employees > 0 else 0

        high_risk_count = sum(
            1 for score in employee_scores
            if score.get("risk_status") == "High Risk"
        )
        satisfactory_count = total_employees - high_risk_count

        return {
            "department_id": department_id,
            "total_employees": total_employees,
            "average_rating": round(average_rating, 2),
            "high_risk_count": high_risk_count,
            "satisfactory_count": satisfactory_count,
            "high_risk_percentage": round(
                (high_risk_count / total_employees * 100) if total_employees > 0 else 0, 2),
            "quarter": quarter or self._get_current_quarter(),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def calculate_organization_aggregate(
        self, employee_scores: list[dict], quarter: Optional[str] = None
    ) -> dict:
        """
        Aggregate scores organization-wide.

        Args:
            employee_scores: List of score dictionaries
            quarter: Optional quarter

        Returns:
            Organization-wide aggregate
        """
        if not employee_scores:
            return {
                "scope": "organization",
                "total_employees": 0,
                "average_rating": 0,
                "high_risk_count": 0,
                "satisfactory_count": 0,
                "quarter": quarter or self._get_current_quarter(),
            }

        total_employees = len(employee_scores)
        average_rating = sum(
            score.get("final_rating", 0) for score in employee_scores
        ) / total_employees if total_employees > 0 else 0

        high_risk_count = sum(
            1 for score in employee_scores
            if score.get("risk_status") == "High Risk"
        )
        satisfactory_count = total_employees - high_risk_count

        avg_attendance = sum(
            score.get("attendance_pct", 0) for score in employee_scores
        ) / total_employees if total_employees > 0 else 0

        avg_task = sum(
            score.get("task_pct", 0) for score in employee_scores
        ) / total_employees if total_employees > 0 else 0

        return {
            "scope": "organization",
            "total_employees": total_employees,
            "average_rating": round(average_rating, 2),
            "high_risk_count": high_risk_count,
            "satisfactory_count": satisfactory_count,
            "high_risk_percentage": round(
                (high_risk_count / total_employees * 100) if total_employees > 0 else 0, 2),
            "average_attendance_pct": round(avg_attendance, 2),
            "average_task_completion_pct": round(avg_task, 2),
            "quarter": quarter or self._get_current_quarter(),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _get_current_quarter(self) -> str:
        """Determine current quarter (Q1-Q4)."""
        month = datetime.now().month
        quarter = (month - 1) // 3 + 1
        return f"Q{quarter}"
