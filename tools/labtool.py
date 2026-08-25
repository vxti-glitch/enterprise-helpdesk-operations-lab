#!/usr/bin/env python3
"""Validate, render, package, and locally serve the simulated portfolio lab.

The standard-library-only tool treats CSV files under ``data/`` as canonical
fictional source material. Reports, human-readable records, import staging
files, and the browser console payload are derived artifacts.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import http.server
import ipaddress
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import webbrowser
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from functools import partial
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
KB = ROOT / "kb"
TICKET_OUTPUT = ROOT / "tickets" / "generated"
METRICS_REPORT = ROOT / "docs" / "metrics" / "SLA_REPORT.md"
METRICS_JSON = ROOT / "evidence" / "generated" / "metrics.json"
CONSOLE_JSON = ROOT / "web" / "data" / "lab.json"
IMPORT_DIR = DATA / "servicenow_import"

SIMULATION_LABEL = (
    "SIMULATED PORTFOLIO LAB — Historical fictional service-desk data, "
    "not production activity or employment results."
)
TICKET_ID_RE = re.compile(r"^(?:INC|REQ)\d{3}$")
EVENT_ID_RE = re.compile(r"^EVT\d{4,}$")
USER_ID_RE = re.compile(r"^USR\d{3}$")
ASSET_ID_RE = re.compile(r"^NS-(?:LT|WS)-\d{3}$")
SYNTHETIC_DOMAIN = "northstar.example"

TICKET_FIELDS = (
    "ticket_id",
    "legacy_id",
    "type",
    "opened_at",
    "first_response_at",
    "resolved_at",
    "caller_id",
    "caller",
    "department",
    "summary",
    "impact",
    "urgency",
    "priority",
    "priority_override_reason",
    "category",
    "subcategory",
    "assignment_group",
    "state",
    "resolution_code",
    "escalated",
    "first_contact_resolution",
    "kb_reference",
    "asset_id",
    "environment",
    "initial_report",
    "diagnostic_summary",
    "root_cause",
    "resolution",
    "validation",
    "user_communication",
    "evidence_ref",
)
EVENT_FIELDS = (
    "event_id",
    "ticket_id",
    "occurred_at",
    "event_type",
    "actor_role",
    "assignment_group",
    "state",
    "visibility",
    "note",
)
USER_FIELDS = (
    "user_id",
    "display_name",
    "given_name",
    "surname",
    "sam_account_name",
    "user_principal_name",
    "department",
    "title",
    "manager_email",
    "work_arrangement",
    "employment_status",
    "asset_id",
)
ASSET_FIELDS = (
    "asset_id",
    "asset_type",
    "manufacturer",
    "model",
    "synthetic_serial",
    "hostname",
    "assigned_to",
    "department",
    "os",
    "status",
    "location",
    "documentation_ip",
    "purchase_date",
    "warranty_end",
    "last_verified",
)
AD_GROUP_FIELDS = ("group_id", "group_name", "group_type", "owner", "description")
RESOLVER_GROUP_FIELDS = ("resolver_group_id", "name", "tier", "scope", "simulation_note")
SLA_FIELDS = ("priority", "response_target_minutes", "resolution_target_minutes", "description")
PRIORITY_MATRIX_FIELDS = ("impact", "urgency", "priority", "policy_note")
REQUEST_ITEM_FIELDS = (
    "request_id",
    "request_item_id",
    "requested_for_user_id",
    "requested_service",
    "approval_state",
    "fulfillment_group",
    "state",
)
REQUEST_TASK_FIELDS = (
    "request_item_id",
    "task_id",
    "sequence",
    "assignment_group",
    "state",
    "task_summary",
)

STRICT_BASELINE = {
    "tickets": 40,
    "users": 15,
    "assets": 20,
    "first_contact_resolutions": 26,
    "escalations": 8,
    "sla_compliant": 37,
    "priority_counts": {"P1": 1, "P2": 6, "P3": 30, "P4": 3},
    "intentional_sla_misses": {"INC019", "INC033", "INC038"},
}

FORBIDDEN_MARKERS = (
    "@gmail.com",
    "@outlook.com",
    "@yahoo.com",
    "password=",
    "api_key=",
    "aws_secret_access_key",
    "ghp_",
    "github_pat_",
)
TEXT_EXTENSIONS = {
    ".csv",
    ".md",
    ".py",
    ".ps1",
    ".yml",
    ".yaml",
    ".json",
    ".txt",
    ".html",
    ".css",
    ".js",
}


@dataclass(frozen=True)
class TicketMeasurement:
    ticket_id: str
    priority: str
    response_minutes: float
    resolution_minutes: float
    response_target_minutes: int
    resolution_target_minutes: int
    response_met: bool
    resolution_met: bool

    @property
    def sla_met(self) -> bool:
        return self.response_met and self.resolution_met


class LabDataError(ValueError):
    """Raised for deliberate validation failures before artifact generation."""


def is_within(path: Path, directory: Path) -> bool:
    try:
        path.resolve().relative_to(directory.resolve())
        return True
    except ValueError:
        return False


def parse_utc(value: str) -> datetime:
    if not value.strip():
        raise ValueError("value is blank")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp must include a UTC offset or Z suffix")
    return parsed


def truthy(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized not in {"true", "false"}:
        raise ValueError(f"expected true or false, received {value!r}")
    return normalized == "true"


def minutes_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 60.0


def format_minutes(value: float) -> str:
    if value < 60:
        return f"{value:.0f} min"
    hours = value / 60.0
    if hours < 48:
        return f"{hours:.1f} hr"
    return f"{hours / 24.0:.1f} days"


def markdown_escape(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def read_csv(path: Path, required_fields: Iterable[str], errors: list[str]) -> list[dict[str, str]]:
    relative = path.relative_to(ROOT) if is_within(path, ROOT) else path
    if not path.is_file():
        errors.append(f"{relative}: required file is missing")
        return []
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            headers = reader.fieldnames or []
            duplicate_headers = sorted(
                {name for name in headers if name and headers.count(name) > 1}
            )
            if duplicate_headers:
                errors.append(f"{relative}: duplicate columns: {', '.join(duplicate_headers)}")
            missing = [field for field in required_fields if field not in headers]
            if missing:
                errors.append(f"{relative}: missing columns: {', '.join(missing)}")
                return []
            rows: list[dict[str, str]] = []
            for row_number, row in enumerate(reader, start=2):
                if None in row:
                    errors.append(f"{relative}:{row_number}: contains more values than headers")
                    continue
                rows.append(
                    {key: (value or "").strip() for key, value in row.items() if key is not None}
                )
            if not rows:
                errors.append(f"{relative}: contains no records")
            return rows
    except (OSError, csv.Error, UnicodeError) as exc:
        errors.append(f"{relative}: unable to read CSV: {exc}")
        return []


def duplicate_values(rows: list[dict[str, str]], field: str) -> list[str]:
    counts = Counter(row.get(field, "") for row in rows)
    return sorted(value for value, count in counts.items() if value and count > 1)


def validate_required_values(
    label: str, rows: list[dict[str, str]], fields: Iterable[str], errors: list[str]
) -> None:
    for row_number, row in enumerate(rows, start=2):
        for field in fields:
            if not row.get(field, ""):
                errors.append(f"{label}:{row_number}:{field}: value is required")


def read_lab_data(errors: list[str]) -> dict[str, list[dict[str, str]]]:
    sources = {
        "tickets": (DATA / "tickets.csv", TICKET_FIELDS),
        "events": (DATA / "ticket_events.csv", EVENT_FIELDS),
        "users": (DATA / "users.csv", USER_FIELDS),
        "assets": (DATA / "assets.csv", ASSET_FIELDS),
        "ad_groups": (DATA / "ad_groups.csv", AD_GROUP_FIELDS),
        "resolver_groups": (DATA / "resolver_groups.csv", RESOLVER_GROUP_FIELDS),
        "sla_targets": (DATA / "sla_targets.csv", SLA_FIELDS),
        "priority_matrix": (DATA / "priority_matrix.csv", PRIORITY_MATRIX_FIELDS),
        "request_items": (DATA / "request_items.csv", REQUEST_ITEM_FIELDS),
        "request_tasks": (DATA / "request_tasks.csv", REQUEST_TASK_FIELDS),
    }
    return {name: read_csv(path, fields, errors) for name, (path, fields) in sources.items()}


def index_by(rows: list[dict[str, str]], key: str) -> dict[str, dict[str, str]]:
    return {row[key]: row for row in rows if row.get(key)}


def event_models(
    tickets: list[dict[str, str]],
    events: list[dict[str, str]],
    targets: dict[str, dict[str, str]],
    errors: list[str],
) -> dict[str, dict[str, object]]:
    events_by_ticket: dict[str, list[dict[str, str]]] = defaultdict(list)
    for event in events:
        events_by_ticket[event["ticket_id"]].append(event)
    models: dict[str, dict[str, object]] = {}
    for ticket in tickets:
        ticket_id = ticket["ticket_id"]
        ordered = events_by_ticket.get(ticket_id, [])
        if not ordered:
            errors.append(f"{ticket_id}: has no event history")
            continue
        parsed: list[tuple[datetime, dict[str, str]]] = []
        for event in ordered:
            try:
                parsed.append((parse_utc(event["occurred_at"]), event))
            except ValueError as exc:
                errors.append(f"{event['event_id']}: invalid occurred_at: {exc}")
        if len(parsed) != len(ordered):
            continue
        parsed.sort(key=lambda pair: pair[0])
        if [event["event_id"] for _, event in parsed] != [event["event_id"] for event in ordered]:
            errors.append(
                f"{ticket_id}: ticket_events.csv must be ordered chronologically for each record"
            )
        by_type: dict[str, list[tuple[datetime, dict[str, str]]]] = defaultdict(list)
        for timestamp, event in parsed:
            by_type[event["event_type"]].append((timestamp, event))
        if any(
            len(by_type[event_type]) != 1
            for event_type in ("Opened", "Acknowledged", "Resolved", "Closed")
        ):
            errors.append(
                f"{ticket_id}: requires exactly one Opened, Acknowledged, Resolved, and Closed event"
            )
            continue
        opened, acknowledged, resolved, closed = (
            by_type[event_type][0][0]
            for event_type in ("Opened", "Acknowledged", "Resolved", "Closed")
        )
        if not opened <= acknowledged <= resolved <= closed:
            errors.append(
                f"{ticket_id}: event timeline must be opened <= acknowledged <= resolved <= closed"
            )
            continue
        if ticket["priority"] not in targets:
            errors.append(f"{ticket_id}: unknown SLA priority {ticket['priority']!r}")
            continue
        target = targets[ticket["priority"]]
        try:
            response_target = int(target["response_target_minutes"])
            resolution_target = int(target["resolution_target_minutes"])
        except ValueError:
            errors.append(
                f"{ticket_id}: SLA targets for {ticket['priority']} must be integer minutes"
            )
            continue
        escalated = bool(by_type["Escalated"])
        fcr = bool(by_type["First-contact resolution"]) and not escalated
        response_minutes = minutes_between(opened, acknowledged)
        resolution_minutes = minutes_between(opened, resolved)
        models[ticket_id] = {
            "events": [event for _, event in parsed],
            "opened": opened,
            "acknowledged": acknowledged,
            "resolved": resolved,
            "closed": closed,
            "escalated": escalated,
            "first_contact_resolution": fcr,
            "response_minutes": response_minutes,
            "resolution_minutes": resolution_minutes,
            "response_target_minutes": response_target,
            "resolution_target_minutes": resolution_target,
            "response_met": response_minutes <= response_target,
            "resolution_met": resolution_minutes <= resolution_target,
            "reopened": bool(by_type["Reopened"]),
        }
    return models


def measurements_from_models(
    models: dict[str, dict[str, object]], tickets: list[dict[str, str]]
) -> list[TicketMeasurement]:
    return [
        TicketMeasurement(
            ticket_id=ticket["ticket_id"],
            priority=ticket["priority"],
            response_minutes=float(models[ticket["ticket_id"]]["response_minutes"]),
            resolution_minutes=float(models[ticket["ticket_id"]]["resolution_minutes"]),
            response_target_minutes=int(models[ticket["ticket_id"]]["response_target_minutes"]),
            resolution_target_minutes=int(models[ticket["ticket_id"]]["resolution_target_minutes"]),
            response_met=bool(models[ticket["ticket_id"]]["response_met"]),
            resolution_met=bool(models[ticket["ticket_id"]]["resolution_met"]),
        )
        for ticket in tickets
    ]


def calculate_metrics(
    tickets: list[dict[str, str]], models: dict[str, dict[str, object]]
) -> dict[str, object]:
    measurements = measurements_from_models(models, tickets)
    by_priority: dict[str, dict[str, object]] = {}
    for priority in ("P1", "P2", "P3", "P4"):
        subset = [measurement for measurement in measurements if measurement.priority == priority]
        compliant = sum(measurement.sla_met for measurement in subset)
        by_priority[priority] = {
            "tickets": len(subset),
            "response_met": sum(item.response_met for item in subset),
            "resolution_met": sum(item.resolution_met for item in subset),
            "both_met": compliant,
            "compliance_percent": round(100 * compliant / len(subset), 1) if subset else 0.0,
        }
    total = len(tickets)
    fcr = sum(bool(models[ticket["ticket_id"]]["first_contact_resolution"]) for ticket in tickets)
    escalations = sum(bool(models[ticket["ticket_id"]]["escalated"]) for ticket in tickets)
    compliant = sum(measurement.sla_met for measurement in measurements)
    missed = [
        {
            "ticket_id": item.ticket_id,
            "priority": item.priority,
            "response_minutes": round(item.response_minutes, 1),
            "resolution_minutes": round(item.resolution_minutes, 1),
            "response_met": item.response_met,
            "resolution_met": item.resolution_met,
            "missed_measure": "both"
            if not item.response_met and not item.resolution_met
            else ("response" if not item.response_met else "resolution"),
        }
        for item in measurements
        if not item.sla_met
    ]
    return {
        "dataset_label": "SIMULATED PORTFOLIO METRICS",
        "ticket_count": total,
        "first_contact_resolutions": fcr,
        "first_contact_resolution_percent": round(100 * fcr / total, 1),
        "escalations": escalations,
        "escalation_percent": round(100 * escalations / total, 1),
        "sla_compliant": compliant,
        "sla_compliance_percent": round(100 * compliant / total, 1),
        "average_response_minutes": round(
            statistics.fmean(item.response_minutes for item in measurements), 1
        ),
        "median_response_minutes": round(
            statistics.median(item.response_minutes for item in measurements), 1
        ),
        "average_resolution_minutes": round(
            statistics.fmean(item.resolution_minutes for item in measurements), 1
        ),
        "median_resolution_minutes": round(
            statistics.median(item.resolution_minutes for item in measurements), 1
        ),
        "by_priority": by_priority,
        "by_category": dict(sorted(Counter(ticket["category"] for ticket in tickets).items())),
        "missed_sla_tickets": missed,
    }


def validate_markdown_links(errors: list[str]) -> None:
    pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for markdown_path in ROOT.rglob("*.md"):
        if any(part in {".git", "dist", "__pycache__"} for part in markdown_path.parts):
            continue
        for raw_target in pattern.findall(markdown_path.read_text(encoding="utf-8")):
            target = raw_target.strip().strip("<>").split("#", 1)[0]
            if not target or target.startswith(("https://", "http://", "mailto:")):
                continue
            resolved = (markdown_path.parent / target).resolve()
            if not is_within(resolved, ROOT):
                errors.append(
                    f"{markdown_path.relative_to(ROOT)}: local Markdown link escapes the repository: {raw_target}"
                )
            elif not resolved.exists():
                errors.append(
                    f"{markdown_path.relative_to(ROOT)}: broken local Markdown link: {raw_target}"
                )


def validate_secret_markers(errors: list[str]) -> None:
    try:
        tracked = subprocess.run(
            ["git", "ls-files"], cwd=ROOT, check=True, text=True, capture_output=True
        ).stdout.splitlines()
    except (OSError, subprocess.CalledProcessError):
        tracked = [str(path.relative_to(ROOT)) for path in ROOT.rglob("*") if path.is_file()]
    for name in tracked:
        path = ROOT / name
        if path.resolve() == Path(__file__).resolve():
            continue
        if path.suffix.lower() not in TEXT_EXTENSIONS or not path.is_file():
            continue
        content = path.read_text(encoding="utf-8", errors="ignore").lower()
        for marker in FORBIDDEN_MARKERS:
            if marker in content:
                errors.append(f"Potential personal or secret marker {marker!r} in {name}")


def validate_evidence_path(ticket_id: str, value: str, errors: list[str]) -> None:
    if value == "none":
        return
    if not value or Path(value).is_absolute() or ".." in Path(value).parts:
        errors.append(
            f"{ticket_id}: evidence_ref must be a repository-relative path inside evidence/"
        )
        return
    candidate = (ROOT / value).resolve()
    if not is_within(candidate, ROOT / "evidence"):
        errors.append(f"{ticket_id}: evidence_ref escapes evidence/: {value}")
    elif not candidate.is_file():
        errors.append(f"{ticket_id}: evidence_ref does not exist: {value}")


def validate(strict_baseline: bool = False) -> list[str]:
    """Return human-readable validation errors; this function never writes files."""
    errors: list[str] = []
    data = read_lab_data(errors)
    tickets, events, users, assets = data["tickets"], data["events"], data["users"], data["assets"]
    ad_groups, resolver_groups = data["ad_groups"], data["resolver_groups"]
    targets_rows, matrix_rows = data["sla_targets"], data["priority_matrix"]
    request_items, request_tasks = data["request_items"], data["request_tasks"]
    if not all(
        (tickets, events, users, assets, ad_groups, resolver_groups, targets_rows, matrix_rows)
    ):
        validate_markdown_links(errors)
        validate_secret_markers(errors)
        return errors
    for source, rows, fields in (
        (
            "data/tickets.csv",
            tickets,
            (
                "ticket_id",
                "type",
                "opened_at",
                "first_response_at",
                "resolved_at",
                "caller_id",
                "caller",
                "department",
                "summary",
                "impact",
                "urgency",
                "priority",
                "category",
                "assignment_group",
                "state",
                "evidence_ref",
            ),
        ),
        ("data/ticket_events.csv", events, EVENT_FIELDS),
        (
            "data/users.csv",
            users,
            (
                "user_id",
                "display_name",
                "sam_account_name",
                "user_principal_name",
                "department",
                "asset_id",
            ),
        ),
        (
            "data/assets.csv",
            assets,
            ("asset_id", "synthetic_serial", "hostname", "documentation_ip", "status"),
        ),
        ("data/ad_groups.csv", ad_groups, AD_GROUP_FIELDS),
        ("data/resolver_groups.csv", resolver_groups, RESOLVER_GROUP_FIELDS),
        ("data/sla_targets.csv", targets_rows, SLA_FIELDS),
        ("data/priority_matrix.csv", matrix_rows, PRIORITY_MATRIX_FIELDS),
    ):
        validate_required_values(source, rows, fields, errors)
    for source, rows, field in (
        ("data/tickets.csv", tickets, "ticket_id"),
        ("data/ticket_events.csv", events, "event_id"),
        ("data/users.csv", users, "user_id"),
        ("data/assets.csv", assets, "asset_id"),
        ("data/ad_groups.csv", ad_groups, "group_name"),
        ("data/resolver_groups.csv", resolver_groups, "name"),
        ("data/request_items.csv", request_items, "request_item_id"),
        ("data/request_tasks.csv", request_tasks, "task_id"),
    ):
        duplicates = duplicate_values(rows, field)
        if duplicates:
            errors.append(f"{source}: duplicate {field} values: {', '.join(duplicates)}")
    ticket_ids, users_by_id, users_by_name, assets_by_id = (
        {row["ticket_id"] for row in tickets},
        index_by(users, "user_id"),
        index_by(users, "display_name"),
        index_by(assets, "asset_id"),
    )
    targets = index_by(targets_rows, "priority")
    matrix = {(row["impact"], row["urgency"]): row["priority"] for row in matrix_rows}
    resolver_names = {row["name"] for row in resolver_groups}
    kb_ids = {path.name[:5] for path in KB.glob("KB[0-9][0-9][0-9]-*.md")}
    request_item_by_request, task_item_ids = (
        index_by(request_items, "request_id"),
        {row["request_item_id"] for row in request_tasks},
    )
    for ticket in tickets:
        ticket_id = ticket["ticket_id"]
        if not TICKET_ID_RE.fullmatch(ticket_id):
            errors.append(f"{ticket_id or '<blank>'}: ticket_id must match INC### or REQ###")
        if ticket["legacy_id"] and not re.fullmatch(r"^INC\d{3}$", ticket["legacy_id"]):
            errors.append(f"{ticket_id}: legacy_id must match INC### when present")
        if ticket["type"] not in {"Incident", "Service Request"}:
            errors.append(f"{ticket_id}: type must be Incident or Service Request")
        if ticket["type"] == "Incident" and not ticket_id.startswith("INC"):
            errors.append(f"{ticket_id}: Incident records must use INC identifiers")
        if ticket["type"] == "Service Request" and not ticket_id.startswith("REQ"):
            errors.append(f"{ticket_id}: Service Request records must use REQ identifiers")
        if ticket["caller_id"] not in users_by_id:
            errors.append(f"{ticket_id}: references unknown caller_id {ticket['caller_id']!r}")
        elif users_by_id[ticket["caller_id"]]["display_name"] != ticket["caller"]:
            errors.append(f"{ticket_id}: caller does not match caller_id")
        if ticket["asset_id"] not in assets_by_id:
            errors.append(f"{ticket_id}: references unknown asset {ticket['asset_id']!r}")
        if ticket["assignment_group"] not in resolver_names:
            errors.append(
                f"{ticket_id}: unknown final resolver group {ticket['assignment_group']!r}"
            )
        if ticket["priority"] not in targets:
            errors.append(f"{ticket_id}: unknown priority {ticket['priority']!r}")
        expected_priority = matrix.get((ticket["impact"], ticket["urgency"]))
        if expected_priority is None:
            errors.append(
                f"{ticket_id}: missing priority-matrix mapping for {ticket['impact']} / {ticket['urgency']}"
            )
        elif ticket["priority"] != expected_priority and not ticket["priority_override_reason"]:
            errors.append(
                f"{ticket_id}: priority {ticket['priority']} differs from matrix {expected_priority} without override reason"
            )
        if ticket["kb_reference"] != "none" and ticket["kb_reference"] not in kb_ids:
            errors.append(f"{ticket_id}: references missing KB {ticket['kb_reference']!r}")
        if ticket["type"] == "Service Request":
            item = request_item_by_request.get(ticket_id)
            if not item:
                errors.append(f"{ticket_id}: Service Request requires a request_items.csv record")
            elif item["requested_for_user_id"] not in users_by_id:
                errors.append(
                    f"{ticket_id}: request item requested_for_user_id must resolve to a fictional user"
                )
            elif item["fulfillment_group"] not in resolver_names:
                errors.append(f"{ticket_id}: request item uses unknown fulfillment group")
            elif item["request_item_id"] not in task_item_ids:
                errors.append(f"{ticket_id}: request item requires at least one request task")
        try:
            truthy(ticket["escalated"])
            truthy(ticket["first_contact_resolution"])
        except ValueError as exc:
            errors.append(f"{ticket_id}: {exc}")
        validate_evidence_path(ticket_id, ticket["evidence_ref"], errors)
    valid_upns = {user["user_principal_name"] for user in users}
    for user in users:
        if not USER_ID_RE.fullmatch(user["user_id"]):
            errors.append(f"{user['user_id']}: user_id must match USR###")
        if not user["user_principal_name"].endswith(f"@{SYNTHETIC_DOMAIN}"):
            errors.append(f"{user['user_id']}: UPN must use synthetic {SYNTHETIC_DOMAIN}")
        if user["manager_email"] and user["manager_email"] not in valid_upns:
            errors.append(f"{user['user_id']}: manager_email does not resolve to a fictional user")
        if user["asset_id"] and user["asset_id"] not in assets_by_id:
            errors.append(f"{user['user_id']}: assigned asset does not exist")
    serials, hosts, ips = set(), set(), set()
    for asset in assets:
        if not ASSET_ID_RE.fullmatch(asset["asset_id"]):
            errors.append(f"{asset['asset_id']}: asset_id must match NS-LT-### or NS-WS-###")
        if not asset["synthetic_serial"].startswith("SYN-"):
            errors.append(f"{asset['asset_id']}: synthetic_serial must begin with SYN-")
        for value, label, seen in (
            (asset["synthetic_serial"], "synthetic_serial", serials),
            (asset["hostname"], "hostname", hosts),
            (asset["documentation_ip"], "documentation_ip", ips),
        ):
            if value in seen:
                errors.append(f"{asset['asset_id']}: duplicate {label} {value!r}")
            seen.add(value)
        try:
            if ipaddress.ip_address(asset["documentation_ip"]) not in ipaddress.ip_network(
                "192.0.2.0/24"
            ):
                errors.append(
                    f"{asset['asset_id']}: documentation_ip must use RFC 5737 192.0.2.0/24"
                )
        except ValueError:
            errors.append(f"{asset['asset_id']}: documentation_ip is not valid IPv4")
        if asset["assigned_to"] and asset["assigned_to"] not in users_by_name:
            errors.append(f"{asset['asset_id']}: assigned_to does not resolve to a fictional user")
    for event in events:
        if not EVENT_ID_RE.fullmatch(event["event_id"]):
            errors.append(f"{event['event_id'] or '<blank>'}: event_id must match EVT####")
        if event["ticket_id"] not in ticket_ids:
            errors.append(f"{event['event_id']}: references unknown ticket {event['ticket_id']!r}")
        if event["assignment_group"] not in resolver_names:
            errors.append(
                f"{event['event_id']}: references unknown resolver group {event['assignment_group']!r}"
            )
        if event["visibility"] not in {"Public", "Internal"}:
            errors.append(f"{event['event_id']}: visibility must be Public or Internal")
        try:
            parse_utc(event["occurred_at"])
        except ValueError as exc:
            errors.append(f"{event['event_id']}: invalid occurred_at: {exc}")
    models = event_models(tickets, events, targets, errors)
    if len(models) == len(tickets):
        for ticket in tickets:
            model = models[ticket["ticket_id"]]
            for field, derived in {
                "opened_at": model["opened"],
                "first_response_at": model["acknowledged"],
                "resolved_at": model["resolved"],
            }.items():
                try:
                    if parse_utc(ticket[field]) != derived:
                        errors.append(
                            f"{ticket['ticket_id']}: {field} must match the event-derived timeline"
                        )
                except ValueError as exc:
                    errors.append(f"{ticket['ticket_id']}: invalid {field}: {exc}")
            if truthy(ticket["escalated"]) != bool(model["escalated"]):
                errors.append(
                    f"{ticket['ticket_id']}: escalated summary field differs from event history"
                )
            if truthy(ticket["first_contact_resolution"]) != bool(
                model["first_contact_resolution"]
            ):
                errors.append(
                    f"{ticket['ticket_id']}: first_contact_resolution summary field differs from event history"
                )
        metrics = calculate_metrics(tickets, models)
        if strict_baseline:
            for key, actual in (
                ("tickets", len(tickets)),
                ("users", len(users)),
                ("assets", len(assets)),
                ("first_contact_resolutions", metrics["first_contact_resolutions"]),
                ("escalations", metrics["escalations"]),
                ("sla_compliant", metrics["sla_compliant"]),
            ):
                if actual != STRICT_BASELINE[key]:
                    errors.append(
                        f"Strict baseline: expected {key}={STRICT_BASELINE[key]}; found {actual}"
                    )
            priority_counts = {
                key: value["tickets"] for key, value in metrics["by_priority"].items()
            }
            if priority_counts != STRICT_BASELINE["priority_counts"]:
                errors.append(f"Strict baseline: unexpected priority counts {priority_counts}")
            misses = {row["ticket_id"] for row in metrics["missed_sla_tickets"]}
            if misses != STRICT_BASELINE["intentional_sla_misses"]:
                errors.append(f"Strict baseline: unexpected SLA misses {sorted(misses)}")
    validate_markdown_links(errors)
    validate_secret_markers(errors)
    return errors


def load_validated(
    strict_baseline: bool = False,
) -> tuple[dict[str, list[dict[str, str]]], dict[str, dict[str, object]], dict[str, object]]:
    errors = validate(strict_baseline=strict_baseline)
    if errors:
        raise LabDataError("\n".join(errors))
    bootstrap_errors: list[str] = []
    data = read_lab_data(bootstrap_errors)
    models = event_models(
        data["tickets"], data["events"], index_by(data["sla_targets"], "priority"), bootstrap_errors
    )
    if bootstrap_errors:
        raise LabDataError("\n".join(bootstrap_errors))
    return data, models, calculate_metrics(data["tickets"], models)


def ticket_markdown(ticket: dict[str, str], model: dict[str, object]) -> str:
    evidence = (
        f"[`{markdown_escape(ticket['evidence_ref'])}`](../../{markdown_escape(ticket['evidence_ref'])})"
        if ticket["evidence_ref"] != "none"
        else "No committed evidence file; see the evidence capture guide."
    )
    timeline = "\n".join(
        f"| {markdown_escape(event['event_type'])} | {markdown_escape(event['occurred_at'])} | {markdown_escape(event['assignment_group'])} | {markdown_escape(event['state'])} |"
        for event in model["events"]
    )
    escalation = (
        f"""\n## Escalation handoff\n\n- **Destination:** {markdown_escape(ticket['assignment_group'])}\n- **Scope statement:** Tier 1 documented client-side facts and did not exceed the fictional authorization boundary.\n- **Handoff package:** report, scope, diagnostic result, event timeline, requested resolver action, and evidence reference.\n"""
        if model["escalated"]
        else ""
    )
    return f"""# {markdown_escape(ticket['ticket_id'])} - {markdown_escape(ticket['summary'])}

> **SIMULATED PORTFOLIO RECORD.** The company, people, systems, timestamps, and results are fictional. This is not production activity or proof of employment.

## Record

| Field | Value |
|---|---|
| Identifier | {markdown_escape(ticket['ticket_id'])} |
| Legacy identifier | {markdown_escape(ticket['legacy_id'] or 'None')} |
| Type | {markdown_escape(ticket['type'])} |
| Caller | {markdown_escape(ticket['caller'])} - {markdown_escape(ticket['department'])} |
| Asset | {markdown_escape(ticket['asset_id'])} |
| Category | {markdown_escape(ticket['category'])} / {markdown_escape(ticket['subcategory'])} |
| Impact / urgency / priority | {markdown_escape(ticket['impact'])} / {markdown_escape(ticket['urgency'])} / {markdown_escape(ticket['priority'])} |
| Final resolver group | {markdown_escape(ticket['assignment_group'])} |
| Final state | {markdown_escape(ticket['state'])} - {markdown_escape(ticket['resolution_code'])} |
| Event-derived escalation | {model['escalated']} |
| Event-derived first-contact resolution | {model['first_contact_resolution']} |
| KB reference | {markdown_escape(ticket['kb_reference'])} |

## Event timeline

| Event | UTC timestamp | Assignment group | State |
|---|---|---|---|
{timeline}

## Initial report

{markdown_escape(ticket['initial_report'])}

## Diagnostic observations

{markdown_escape(ticket['diagnostic_summary'])}

## Root cause or bounded finding

{markdown_escape(ticket['root_cause'])}

## Resolution

{markdown_escape(ticket['resolution'])}

## Validation

{markdown_escape(ticket['validation'])}

## User communication

{markdown_escape(ticket['user_communication'])}
{escalation}
## Simplified SLA result

| Measure | Actual | Target | Met? |
|---|---:|---:|---:|
| First response | {format_minutes(float(model['response_minutes']))} | {format_minutes(float(model['response_target_minutes']))} | {'Yes' if model['response_met'] else 'No'} |
| Resolution | {format_minutes(float(model['resolution_minutes']))} | {format_minutes(float(model['resolution_target_minutes']))} | {'Yes' if model['resolution_met'] else 'No'} |

**Overall simplified SLA:** {'Met' if model['response_met'] and model['resolution_met'] else 'Missed'}

## Evidence

{evidence}
"""


def metrics_markdown(metrics: dict[str, object]) -> str:
    priority_lines = [
        f"| {priority} | {metrics['by_priority'][priority]['tickets']} | {metrics['by_priority'][priority]['response_met']} | {metrics['by_priority'][priority]['resolution_met']} | {metrics['by_priority'][priority]['both_met']} | {metrics['by_priority'][priority]['compliance_percent']:.1f}% |"
        for priority in ("P1", "P2", "P3", "P4")
    ]
    missed_lines = [
        f"| {row['ticket_id']} | {row['priority']} | {format_minutes(row['response_minutes'])} | {format_minutes(row['resolution_minutes'])} | {row['missed_measure']} |"
        for row in metrics["missed_sla_tickets"]
    ]
    return f"""# SLA and service-desk metrics

> **SIMULATED PORTFOLIO METRICS.** Calculated from fictional event timestamps in `data/ticket_events.csv`. They are not production KPIs or employment results.

## Summary

| Metric | Calculated result |
|---|---:|
| Records | {metrics['ticket_count']} |
| First-contact resolutions | {metrics['first_contact_resolutions']} ({metrics['first_contact_resolution_percent']:.1f}%) |
| Escalations | {metrics['escalations']} ({metrics['escalation_percent']:.1f}%) |
| Records meeting response and resolution targets | {metrics['sla_compliant']} ({metrics['sla_compliance_percent']:.1f}%) |
| Average first response | {format_minutes(metrics['average_response_minutes'])} |
| Median first response | {format_minutes(metrics['median_response_minutes'])} |
| Average resolution | {format_minutes(metrics['average_resolution_minutes'])} |
| Median resolution | {format_minutes(metrics['median_resolution_minutes'])} |

## Results by priority

| Priority | Records | Response met | Resolution met | Both met | Compliance |
|---|---:|---:|---:|---:|---:|
{chr(10).join(priority_lines)}

## Records that missed a target

| Record | Priority | Response | Resolution | Missed measure |
|---|---|---:|---:|---|
{chr(10).join(missed_lines)}

The dataset intentionally retains difficult fictional cases. INC019 includes an intermittent-Wi-Fi observation window, INC033 includes an application-owner compatibility fix, and INC038 includes extended inventory reconciliation.

## Definitions

- **First-contact resolution:** derived from a `First-contact resolution` event with no `Escalated` event.
- **Escalation:** derived from an `Escalated` event in the fictional record history.
- **SLA compliance:** first acknowledgement and resolution events must meet the priority targets in `data/sla_targets.csv`.
- **Elapsed-time model:** continuous elapsed minutes. It does not model business-hours calendars, holidays, or paused SLA clocks.

Regenerate with `python tools/labtool.py generate` and verify with `python tools/labtool.py validate --strict-baseline`.
"""


def csv_text(rows: Iterable[dict[str, object]], fieldnames: list[str]) -> str:
    import io

    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def service_now_staging(tickets: list[dict[str, str]], record_type: str) -> str:
    fields = [
        "external_source_id",
        "legacy_id",
        "record_type",
        "caller_id",
        "short_description",
        "impact",
        "urgency",
        "priority",
        "category",
        "subcategory",
        "final_resolver_group",
        "final_state",
        "opened_at_utc",
        "resolved_at_utc",
        "u_asset_id",
        "u_kb_reference",
        "u_simulation_label",
    ]
    rows = [
        {
            "external_source_id": ticket["ticket_id"],
            "legacy_id": ticket["legacy_id"],
            "record_type": ticket["type"],
            "caller_id": ticket["caller_id"],
            "short_description": ticket["summary"],
            "impact": ticket["impact"],
            "urgency": ticket["urgency"],
            "priority": ticket["priority"],
            "category": ticket["category"],
            "subcategory": ticket["subcategory"],
            "final_resolver_group": ticket["assignment_group"],
            "final_state": ticket["state"],
            "opened_at_utc": ticket["opened_at"],
            "resolved_at_utc": ticket["resolved_at"],
            "u_asset_id": ticket["asset_id"],
            "u_kb_reference": ticket["kb_reference"],
            "u_simulation_label": "SIMULATED PORTFOLIO DATA",
        }
        for ticket in tickets
        if ticket["type"] == record_type
    ]
    return csv_text(rows, fields)


def kb_index() -> list[dict[str, str]]:
    articles = []
    for path in sorted(KB.glob("KB[0-9][0-9][0-9]-*.md")):
        title = next(
            (
                line.removeprefix("# ")
                for line in path.read_text(encoding="utf-8").splitlines()
                if line.startswith("# ")
            ),
            path.stem,
        )
        articles.append(
            {
                "id": path.name[:5],
                "title": title,
                "path": str(path.relative_to(ROOT)).replace("\\", "/"),
            }
        )
    return articles


def console_payload(
    data: dict[str, list[dict[str, str]]],
    models: dict[str, dict[str, object]],
    metrics: dict[str, object],
) -> dict[str, object]:
    request_items, tasks_by_item = index_by(data["request_items"], "request_id"), defaultdict(list)
    for task in data["request_tasks"]:
        tasks_by_item[task["request_item_id"]].append(task)
    tickets = []
    for source in data["tickets"]:
        model, ticket = models[source["ticket_id"]], dict(source)
        ticket.update(
            {
                "events": model["events"],
                "response_minutes": round(float(model["response_minutes"]), 1),
                "resolution_minutes": round(float(model["resolution_minutes"]), 1),
                "response_met": model["response_met"],
                "resolution_met": model["resolution_met"],
                "sla_met": bool(model["response_met"]) and bool(model["resolution_met"]),
                "event_derived_escalated": model["escalated"],
                "event_derived_fcr": model["first_contact_resolution"],
                "request_item": request_items.get(source["ticket_id"]),
            }
        )
        ticket["request_tasks"] = (
            tasks_by_item[ticket["request_item"]["request_item_id"]]
            if ticket["request_item"]
            else []
        )
        tickets.append(ticket)
    people = []
    for user in data["users"]:
        person = dict(user)
        person["related_ticket_ids"] = [
            ticket["ticket_id"] for ticket in tickets if ticket["caller_id"] == user["user_id"]
        ]
        people.append(person)
    inventory = []
    for asset in data["assets"]:
        item = dict(asset)
        item["related_ticket_ids"] = [
            ticket["ticket_id"] for ticket in tickets if ticket["asset_id"] == asset["asset_id"]
        ]
        item["assigned_user_id"] = next(
            (
                user["user_id"]
                for user in data["users"]
                if user["display_name"] == asset["assigned_to"]
            ),
            "",
        )
        inventory.append(item)
    return {
        "label": SIMULATION_LABEL,
        "generated_at_note": "Deterministic artifact generated from fictional repository data; not live operational data.",
        "metrics": metrics,
        "tickets": tickets,
        "people": people,
        "assets": inventory,
        "kb": kb_index(),
        "resolver_groups": data["resolver_groups"],
        "ad_groups": data["ad_groups"],
        "featured_ticket_ids": ["INC002", "INC009", "INC012", "INC040"],
        "intentional_miss_explanations": {
            "INC019": "Intermittent Wi-Fi required a fictional observation window.",
            "INC033": "An application-owner compatibility fix exceeded Tier 1 scope.",
            "INC038": "Inventory reconciliation required an extended fictional data-quality review.",
        },
        "workflows": [
            {
                "id": "onboarding",
                "title": "Onboarding",
                "path": "docs/workflows/ONBOARDING.md",
                "description": "Approved identity, access, asset, and validation sequence.",
            },
            {
                "id": "offboarding",
                "title": "Offboarding",
                "path": "docs/workflows/OFFBOARDING.md",
                "description": "Approved containment, custody, and audit sequence.",
            },
            {
                "id": "escalation",
                "title": "Escalation matrix",
                "path": "docs/workflows/ESCALATION_MATRIX.md",
                "description": "Tier 1 scope, destination, and required handoff evidence.",
            },
        ],
        "evidence_guide": "docs/EVIDENCE_GUIDE.md",
    }


def expected_artifacts(
    data: dict[str, list[dict[str, str]]],
    models: dict[str, dict[str, object]],
    metrics: dict[str, object],
) -> dict[Path, str]:
    artifacts = {
        TICKET_OUTPUT / f"{ticket['ticket_id']}.md": ticket_markdown(
            ticket, models[ticket["ticket_id"]]
        )
        for ticket in data["tickets"]
    }
    artifacts.update(
        {
            METRICS_REPORT: metrics_markdown(metrics),
            METRICS_JSON: json.dumps(
                {"source": "data/ticket_events.csv", "metrics": metrics}, indent=2, sort_keys=True
            )
            + "\n",
            CONSOLE_JSON: json.dumps(
                console_payload(data, models, metrics), indent=2, sort_keys=True
            )
            + "\n",
            IMPORT_DIR / "incidents.csv": service_now_staging(data["tickets"], "Incident"),
            IMPORT_DIR / "requests.csv": service_now_staging(data["tickets"], "Service Request"),
        }
    )
    return artifacts


def allowed_output(path: Path) -> bool:
    return any(
        is_within(path, directory)
        for directory in (
            TICKET_OUTPUT,
            METRICS_REPORT.parent,
            METRICS_JSON.parent,
            CONSOLE_JSON.parent,
            IMPORT_DIR,
        )
    )


def write_atomic(artifacts: dict[Path, str]) -> None:
    for destination in artifacts:
        if not allowed_output(destination) or not is_within(destination, ROOT):
            raise LabDataError(
                f"Refusing generated artifact outside allowed directories: {destination}"
            )
    with tempfile.TemporaryDirectory(prefix="labtool-", dir=ROOT) as temporary:
        stage_root, backup_root = Path(temporary) / "stage", Path(temporary) / "backup"
        for destination, content in artifacts.items():
            staged = stage_root / destination.relative_to(ROOT)
            staged.parent.mkdir(parents=True, exist_ok=True)
            staged.write_text(content, encoding="utf-8", newline="")
        stale_tickets = set(TICKET_OUTPUT.glob("*.md")) - {
            path for path in artifacts if path.parent == TICKET_OUTPUT
        }
        touched, originals = list(artifacts) + list(stale_tickets), {}
        for destination in touched:
            if destination.exists():
                backup = backup_root / destination.relative_to(ROOT)
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(destination, backup)
                originals[destination] = backup
        try:
            for destination in artifacts:
                destination.parent.mkdir(parents=True, exist_ok=True)
                os.replace(stage_root / destination.relative_to(ROOT), destination)
            for stale in stale_tickets:
                stale.unlink()
        except OSError as exc:
            for destination in touched:
                try:
                    if destination in originals:
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(originals[destination], destination)
                    elif destination.exists():
                        destination.unlink()
                except OSError:
                    pass
            raise LabDataError(
                f"Generation failed; original artifacts were restored: {exc}"
            ) from exc


def generate(strict_baseline: bool = False) -> None:
    data, models, metrics = load_validated(strict_baseline)
    artifacts = expected_artifacts(data, models, metrics)
    write_atomic(artifacts)
    print(
        f"Generated {len(data['tickets'])} record files and {len(artifacts) - len(data['tickets'])} derived artifacts."
    )


def validate_generated_artifacts(errors: list[str], strict_baseline: bool = False) -> None:
    try:
        data, models, metrics = load_validated(strict_baseline)
    except LabDataError:
        return
    expected = expected_artifacts(data, models, metrics)
    for destination, content in expected.items():
        if not destination.is_file():
            errors.append(f"Generated artifact is missing: {destination.relative_to(ROOT)}")
        elif destination.read_text(encoding="utf-8") != content:
            errors.append(
                f"Generated artifact is stale: {destination.relative_to(ROOT)}; run labtool.py generate"
            )
    expected_tickets = {path for path in expected if path.parent == TICKET_OUTPUT}
    if TICKET_OUTPUT.exists():
        unexpected = set(TICKET_OUTPUT.glob("*.md")) - expected_tickets
        if unexpected:
            errors.append(
                "Unexpected generated ticket files: "
                + ", ".join(str(path.relative_to(ROOT)) for path in sorted(unexpected))
            )


def command_validate(strict_baseline: bool) -> int:
    errors = validate(strict_baseline)
    if not errors:
        validate_generated_artifacts(errors, strict_baseline)
    if errors:
        print("Validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    data, models, metrics = load_validated(strict_baseline)
    print(
        f"Validation passed: {len(data['tickets'])} records, {metrics['first_contact_resolution_percent']:.1f}% event-derived FCR, {metrics['escalations']} event-derived escalations, {metrics['sla_compliance_percent']:.1f}% simplified SLA compliance."
    )
    return 0


def command_serve(port: int, open_browser: bool) -> int:
    errors = validate(False)
    if errors:
        print("Cannot serve an invalid lab:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    web_root = ROOT / "web"
    if not web_root.is_dir():
        print("Cannot serve: web/ is missing", file=sys.stderr)
        return 1
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(web_root))
    server, url = (
        http.server.ThreadingHTTPServer(("127.0.0.1", port), handler),
        f"http://127.0.0.1:{port}/",
    )
    print(
        f"Serving the simulated Operations Console at {url}\nPress Ctrl+C to stop the local server."
    )
    if open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nLocal server stopped.")
    finally:
        server.server_close()
    return 0


def command_package(output: Path) -> int:
    errors = validate(True)
    if not errors:
        validate_generated_artifacts(errors, True)
    if errors:
        print("Cannot package an invalid lab:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    status = subprocess.run(
        ["git", "status", "--porcelain"], cwd=ROOT, text=True, capture_output=True
    )
    if status.returncode or status.stdout.strip():
        print(
            "Cannot package: worktree must be clean so the archive exactly represents a commit.",
            file=sys.stderr,
        )
        return 1
    output = output.resolve()
    if not is_within(output, ROOT / "dist"):
        print("Package output must be inside dist/.", file=sys.stderr)
        return 1
    output.parent.mkdir(parents=True, exist_ok=True)
    archive = subprocess.run(
        ["git", "archive", "--format=zip", "--output", str(output), "HEAD"],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if archive.returncode:
        print(f"git archive failed: {archive.stderr}", file=sys.stderr)
        return 1
    checksum = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix(output.suffix + ".sha256").write_text(
        f"{checksum}  {output.name}\n", encoding="ascii"
    )
    print(f"Created {output.relative_to(ROOT)}\nSHA-256: {checksum}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate and render the simulated help-desk portfolio lab."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command, help_text in (
        ("validate", "Validate canonical data and generated artifacts"),
        ("generate", "Regenerate all derived artifacts"),
        ("metrics", "Print the event-derived metrics report"),
    ):
        child = subparsers.add_parser(command, help=help_text)
        child.add_argument(
            "--strict-baseline",
            action="store_true",
            help="Also enforce the committed 40-record demonstration baseline",
        )
    serve = subparsers.add_parser("serve", help="Serve the static Operations Console locally")
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument(
        "--open", action="store_true", help="Open the local console in the default browser"
    )
    package = subparsers.add_parser(
        "package", help="Create a validated, commit-exact ZIP under dist/"
    )
    package.add_argument(
        "--output", type=Path, default=ROOT / "dist" / "enterprise-helpdesk-operations-lab.zip"
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "validate":
            return command_validate(args.strict_baseline)
        if args.command == "generate":
            generate(args.strict_baseline)
            return 0
        if args.command == "metrics":
            _, _, metrics = load_validated(args.strict_baseline)
            print(metrics_markdown(metrics))
            return 0
        if args.command == "serve":
            return command_serve(args.port, args.open)
        if args.command == "package":
            return command_package(args.output)
    except LabDataError as exc:
        print("Operation failed:", file=sys.stderr)
        for line in str(exc).splitlines():
            print(f"- {line}", file=sys.stderr)
        return 1
    except (OSError, ValueError) as exc:
        print(f"Operation failed safely: {exc}", file=sys.stderr)
        return 1
    raise AssertionError(f"Unhandled command {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
