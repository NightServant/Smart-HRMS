"""
ATRE Runner — Stdin/Stdout JSON entry point.

Usage:
  echo '{"action":"recommend","payload":{...}}' | python runner.py
"""

import json
import sys

from recommender import recommend


def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)

        action = data.get("action")
        payload = data.get("payload", {})

        if action != "recommend":
            print(json.dumps({
                "status": "error",
                "notification": f"Unknown action: {action}",
            }))
            sys.exit(1)

        result = recommend(payload)
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
            "notification": f"ATRE error: {e}",
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
