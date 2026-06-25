"""
FlatFAT Runner — Stdin/Stdout JSON entry point.

Usage:
  echo '{"action":"employee_score","payload":{"employee_id":"...", "data":{...}}}' | python runner.py
"""

import json
import sys
from typing import Any

from config import WEIGHTS, THRESHOLDS, DEFAULTS, CACHING
from flatfat_engine import FlatFATEngine


def main():
    try:
        raw = sys.stdin.read()
        request = json.loads(raw)

        action = request.get("action")
        payload = request.get("payload", {})

        # Initialize engine with config
        config = {
            "weights": WEIGHTS,
            "thresholds": THRESHOLDS,
            "defaults": DEFAULTS,
        }
        engine = FlatFATEngine(config)

        # Route to appropriate action
        if action == "employee_score":
            result = handle_employee_score(engine, payload)

        elif action == "department_aggregate":
            result = handle_department_aggregate(engine, payload)

        elif action == "organization_aggregate":
            result = handle_organization_aggregate(engine, payload)

        else:
            result = {
                "status": "error",
                "notification": f"Unknown action: {action}. Valid actions: employee_score, department_aggregate, organization_aggregate",
            }

        print(json.dumps(result, default=str))

    except json.JSONDecodeError as e:
        print(json.dumps({
            "status": "error",
            "notification": f"Invalid JSON input: {e}",
        }))
        sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "status": "error",
            "notification": f"FlatFAT error: {e}",
        }))
        sys.exit(1)


def handle_employee_score(engine: FlatFATEngine, payload: dict) -> dict:
    """Calculate score for a single employee."""
    try:
        employee_id = payload.get("employee_id")
        data = payload.get("data", {})
        quarter = payload.get("quarter")

        if not employee_id:
            return {
                "status": "error",
                "notification": "Missing employee_id in payload",
            }

        score = engine.calculate_employee_score(employee_id, data, quarter)
        return {
            "status": "success",
            "data": score,
        }

    except Exception as e:
        return {
            "status": "error",
            "notification": f"Error calculating employee score: {e}",
        }


def handle_department_aggregate(engine: FlatFATEngine, payload: dict) -> dict:
    """Aggregate scores by department."""
    try:
        department_id = payload.get("department_id")
        employee_scores = payload.get("employee_scores", [])
        quarter = payload.get("quarter")

        if not department_id:
            return {
                "status": "error",
                "notification": "Missing department_id in payload",
            }

        if not employee_scores:
            return {
                "status": "error",
                "notification": "Missing employee_scores in payload",
            }

        aggregate = engine.calculate_department_aggregate(
            department_id, employee_scores, quarter
        )
        return {
            "status": "success",
            "data": aggregate,
        }

    except Exception as e:
        return {
            "status": "error",
            "notification": f"Error calculating department aggregate: {e}",
        }


def handle_organization_aggregate(engine: FlatFATEngine, payload: dict) -> dict:
    """Aggregate scores organization-wide."""
    try:
        employee_scores = payload.get("employee_scores", [])
        quarter = payload.get("quarter")

        if not employee_scores:
            return {
                "status": "error",
                "notification": "Missing employee_scores in payload",
            }

        aggregate = engine.calculate_organization_aggregate(
            employee_scores, quarter
        )
        return {
            "status": "success",
            "data": aggregate,
        }

    except Exception as e:
        return {
            "status": "error",
            "notification": f"Error calculating organization aggregate: {e}",
        }


if __name__ == "__main__":
    main()
