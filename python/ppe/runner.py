"""
PPE Runner — Stdin/Stdout entry point for Predictive Performance Evaluation.

Reads JSON from stdin, dispatches to predictor, prints JSON result to stdout.
"""

import json
import math
import sys

import numpy as np

from predictor import predict


def sanitize_for_json(value):
    if isinstance(value, dict):
        return {key: sanitize_for_json(item) for key, item in value.items()}

    if isinstance(value, list):
        return [sanitize_for_json(item) for item in value]

    if isinstance(value, tuple):
        return [sanitize_for_json(item) for item in value]

    if isinstance(value, np.ndarray):
        return [sanitize_for_json(item) for item in value.tolist()]

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating, float)):
        numeric_value = float(value)
        return numeric_value if math.isfinite(numeric_value) else None

    return value


def main():
    try:
        raw = sys.stdin.read()
        request = json.loads(raw)

        action = request.get("action")
        payload = request.get("payload", {})

        if action != "predict":
            print(json.dumps({
                "status": "error",
                "notification": f"Unknown action: {action}",
            }))
            sys.exit(1)

        result = sanitize_for_json(predict(payload))
        print(json.dumps(result, allow_nan=False))

    except Exception as exc:
        print(json.dumps({
            "status": "error",
            "notification": f"PPE runner error: {str(exc)}",
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
