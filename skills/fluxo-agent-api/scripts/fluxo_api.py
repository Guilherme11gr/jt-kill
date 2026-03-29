#!/usr/bin/env python3
"""
Helper for the Fluxo Agent API.

Modes:
- env: show resolved environment
- curl: print an authenticated curl command
- request: execute the request and print the response
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import sys
from pathlib import Path
from typing import Dict, Iterable, Optional, Tuple
from urllib import error, parse, request

DEFAULT_API_URL = "http://localhost:3005/api/agent"
DEFAULT_AGENT_NAME = "Codex Skill"
ENV_FILES = (".env.local", ".env")


def parse_key_value(items: Iterable[str]) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for item in items:
        if "=" not in item:
            raise ValueError(f"Expected key=value, got: {item}")
        key, value = item.split("=", 1)
        key = key.strip()
        if not key:
            raise ValueError(f"Empty key in: {item}")
        result[key] = value
    return result


def find_env_file(start: Path) -> Optional[Path]:
    current = start.resolve()
    candidates = [current] + list(current.parents)

    for directory in candidates:
        for filename in ENV_FILES:
            candidate = directory / filename
            if candidate.is_file():
                return candidate
    return None


def load_dotenv(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if value.startswith(("\"", "'")) and value.endswith(("\"", "'")) and len(value) >= 2:
            value = value[1:-1]
        env[key] = value
    return env


def resolve_config(cwd: Path) -> Tuple[Dict[str, str], Optional[Path]]:
    env_path = find_env_file(cwd)
    file_values = load_dotenv(env_path) if env_path else {}

    config = {
        "FLUXO_AGENT_KEY": os.environ.get("FLUXO_AGENT_KEY", file_values.get("FLUXO_AGENT_KEY", "")),
        "FLUXO_AGENT_API_URL": os.environ.get("FLUXO_AGENT_API_URL", file_values.get("FLUXO_AGENT_API_URL", DEFAULT_API_URL)),
        "FLUXO_AGENT_NAME": os.environ.get("FLUXO_AGENT_NAME", file_values.get("FLUXO_AGENT_NAME", DEFAULT_AGENT_NAME)),
    }
    return config, env_path


def join_url(base_url: str, path: str, query: Dict[str, str]) -> str:
    normalized_base = base_url.rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"
    url = f"{normalized_base}{normalized_path}"
    if query:
        url = f"{url}?{parse.urlencode(query)}"
    return url


def load_json_payload(raw_data: Optional[str], data_file: Optional[str]) -> Optional[str]:
    if raw_data and data_file:
        raise ValueError("Use --data or --data-file, not both.")
    if data_file:
        return Path(data_file).read_text(encoding="utf-8")
    return raw_data


def build_headers(config: Dict[str, str], extra_headers: Dict[str, str], include_json: bool) -> Dict[str, str]:
    headers = {
        "Authorization": f"Bearer {config['FLUXO_AGENT_KEY']}",
        "X-Agent-Name": config["FLUXO_AGENT_NAME"],
    }
    if include_json:
        headers["Content-Type"] = "application/json; charset=utf-8"
    headers.update(extra_headers)
    return headers


def require_key(config: Dict[str, str]) -> None:
    if not config["FLUXO_AGENT_KEY"]:
        raise SystemExit(
            "Missing FLUXO_AGENT_KEY. Add it to the current project's .env.local or export it in the shell."
        )


def print_env(config: Dict[str, str], env_path: Optional[Path]) -> None:
    masked = f"agk_...{config['FLUXO_AGENT_KEY'][-4:]}" if config["FLUXO_AGENT_KEY"] else "(missing)"
    print(json.dumps({
        "envFile": str(env_path) if env_path else None,
        "apiUrl": config["FLUXO_AGENT_API_URL"],
        "agentName": config["FLUXO_AGENT_NAME"],
        "apiKey": masked,
    }, indent=2))


def print_curl(method: str, url: str, headers: Dict[str, str], payload: Optional[str]) -> None:
    parts = ["curl", "-sS", "-X", method.upper(), shlex.quote(url)]
    for key, value in headers.items():
        parts.extend(["-H", shlex.quote(f"{key}: {value}")])
    if payload:
        parts.extend(["--data", shlex.quote(payload)])
    print(" ".join(parts))


def execute_request(method: str, url: str, headers: Dict[str, str], payload: Optional[str], pretty: bool) -> int:
    body = payload.encode("utf-8") if payload else None
    req = request.Request(url, data=body, method=method.upper())
    for key, value in headers.items():
        req.add_header(key, value)

    try:
        with request.urlopen(req) as response:
            raw = response.read().decode("utf-8")
            if not raw:
                return 0
            if pretty:
                print(json.dumps(json.loads(raw), indent=2, ensure_ascii=False))
            else:
                print(raw)
            return 0
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        if raw:
            print(raw, file=sys.stderr)
        else:
            print(f"HTTP {exc.code}", file=sys.stderr)
        return exc.code or 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Fluxo Agent API helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("env", help="Show resolved env settings")

    def add_request_args(name: str, help_text: str) -> argparse.ArgumentParser:
        sub = subparsers.add_parser(name, help=help_text)
        sub.add_argument("method", help="HTTP method, for example GET or POST")
        sub.add_argument("path", help="Path relative to /api/agent, for example /tasks")
        sub.add_argument("--query", action="append", default=[], help="Query param in key=value form")
        sub.add_argument("--header", action="append", default=[], help="Extra header in key=value form")
        sub.add_argument("--data", help="Inline JSON body")
        sub.add_argument("--data-file", help="Read JSON body from file")
        sub.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
        return sub

    add_request_args("curl", "Print a curl command")
    add_request_args("request", "Execute the request")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    cwd = Path.cwd()
    config, env_path = resolve_config(cwd)

    if args.command == "env":
        print_env(config, env_path)
        return 0

    require_key(config)

    query = parse_key_value(args.query)
    extra_headers = parse_key_value(args.header)
    payload = load_json_payload(args.data, args.data_file)

    if payload:
        json.loads(payload)

    url = join_url(config["FLUXO_AGENT_API_URL"], args.path, query)
    headers = build_headers(config, extra_headers, include_json=payload is not None)

    if args.command == "curl":
        print_curl(args.method, url, headers, payload)
        return 0

    return execute_request(args.method, url, headers, payload, args.pretty)


if __name__ == "__main__":
    sys.exit(main())
