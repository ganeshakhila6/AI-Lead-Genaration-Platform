"""Local OpenAI request and token usage tracking for the dashboard."""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import threading
import time

import requests


USAGE_PATH = Path(__file__).resolve().parent.parent / "data" / "openai_usage.json"
_usage_lock = threading.RLock()
OPENAI_API_ROOT = "https://api.openai.com/v1"


def _current_period():
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _empty_usage(period=None):
    return {
        "period": period or _current_period(),
        "total_requests": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "last_model": "",
        "last_updated": "",
    }


def _read_usage():
    try:
        usage = json.loads(USAGE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        usage = _empty_usage()
    if usage.get("period") != _current_period():
        return _empty_usage()
    return {**_empty_usage(), **usage}


def _write_usage(usage):
    USAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = USAGE_PATH.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(usage, indent=2), encoding="utf-8")
    temporary_path.replace(USAGE_PATH)


def _number(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def record_usage(response, operation="openai_request"):
    """Record token usage returned by an OpenAI SDK response."""
    usage = getattr(response, "usage", None)
    if usage is None:
        return

    input_tokens = _number(
        getattr(usage, "prompt_tokens", getattr(usage, "input_tokens", 0))
    )
    output_tokens = _number(
        getattr(usage, "completion_tokens", getattr(usage, "output_tokens", 0))
    )
    total_tokens = _number(getattr(usage, "total_tokens", 0))
    if not total_tokens:
        total_tokens = input_tokens + output_tokens

    with _usage_lock:
        data = _read_usage()
        data["total_requests"] += 1
        data["input_tokens"] += input_tokens
        data["output_tokens"] += output_tokens
        data["total_tokens"] += total_tokens
        data["last_model"] = str(getattr(response, "model", "") or operation)
        data["last_updated"] = datetime.now(timezone.utc).isoformat()
        _write_usage(data)


def get_usage():
    """Return current-month local or organization-level usage."""
    with _usage_lock:
        data = _read_usage()

    result = {
        **data,
        "usage_source": "local response tracking",
    }

    live_usage = get_live_usage()
    if live_usage:
        result.update(live_usage)
    return result


def _admin_get(path, params=None):
    admin_key = os.getenv("OPENAI_ADMIN_KEY", "").strip()
    if not admin_key:
        return None
    response = requests.get(
        f"{OPENAI_API_ROOT}{path}",
        headers={"Authorization": f"Bearer {admin_key}"},
        params=params or {},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def get_live_usage():
    """Read current-month organization usage using an OpenAI Admin key."""
    if not os.getenv("OPENAI_ADMIN_KEY", "").strip():
        return None

    now = int(time.time())
    current = datetime.now(timezone.utc)
    month_start = int(
        datetime(current.year, current.month, 1, tzinfo=timezone.utc).timestamp()
    )
    try:
        usage_response = _admin_get(
            "/organization/usage/completions",
            {
                "start_time": month_start,
                "end_time": now,
                "bucket_width": "1d",
                "limit": 31,
            },
        )
        input_tokens = 0
        output_tokens = 0
        total_requests = 0
        for bucket in usage_response.get("data", []):
            for result in bucket.get("results", []):
                input_tokens += _number(result.get("input_tokens"))
                output_tokens += _number(result.get("output_tokens"))
                total_requests += _number(result.get("num_model_requests"))

        costs_response = _admin_get(
            "/organization/costs",
            {
                "start_time": month_start,
                "end_time": now,
                "bucket_width": "1d",
                "limit": 31,
            },
        )
        cost_usd = 0.0
        for bucket in costs_response.get("data", []):
            for result in bucket.get("results", []):
                amount = result.get("amount") or {}
                if str(amount.get("currency", "")).lower() == "usd":
                    cost_usd += float(amount.get("value") or 0)

        total_tokens = input_tokens + output_tokens

        return {
            "total_requests": total_requests,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "usage_source": "OpenAI Organization Usage API",
            "scope": "organization",
            "cost_usd": round(cost_usd, 6),
            "live_updated_at": datetime.now(timezone.utc).isoformat(),
        }
    except (OSError, ValueError, KeyError, requests.RequestException):
        return {
            "usage_source": "local response tracking",
            "live_error": "OpenAI Admin API usage is unavailable; showing local tracking.",
        }
