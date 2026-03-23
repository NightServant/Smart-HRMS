"""
PPE Runner — Stdin/Stdout entry point for Predictive Performance Evaluation.

Reads JSON from stdin, dispatches to predictor, prints JSON result to stdout.
"""

import json
import sys

from predictor import predict


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

        result = predict(payload)
        print(json.dumps(result))

    except Exception as exc:
        print(json.dumps({
            "status": "error",
            "notification": f"PPE runner error: {str(exc)}",
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
