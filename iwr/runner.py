"""
runner.py — Stdin/Stdout bridge for Node.js middleware.

Usage:
    echo '{"action": "route_ipcr", "payload": {...}}' | python runner.py

Reads a JSON object from stdin, calls WorkflowRouter, writes JSON to stdout.
"""

import sys
import json
import os
from datetime import date

# Ensure the iwr directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from workflow_router import WorkflowRouter


def main():
    try:
        raw = sys.stdin.read()
        request = json.loads(raw)

        action = request.get("action")
        payload = request.get("payload", {})

        router = WorkflowRouter()

        if action == "route_ipcr":
            result = router.route_ipcr(payload)
        elif action == "route_leave":
            # Convert start_date string to date object if present
            if "start_date" in payload and isinstance(payload["start_date"], str):
                payload["start_date"] = date.fromisoformat(payload["start_date"])
            result = router.route_leave(payload)
        else:
            result = {"status": "error", "notification": f"Unknown action: {action}"}

        # Ensure all values are JSON-serializable
        for key, value in result.items():
            if isinstance(value, date):
                result[key] = value.isoformat()

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            "status": "error",
            "notification": str(e),
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
