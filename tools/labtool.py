#!/usr/bin/env python3
"""Validate and render the synthetic Enterprise Help Desk Operations Lab.

Only Python's standard library is required. Source data lives under data/;
generated Markdown, JSON, and mapping CSV files are deterministic.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import statistics
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
TICKET_OUTPUT = ROOT / "tickets" / "generated"
METRICS_REPORT = ROOT / "docs" / "metrics" / "SLA_REPORT.md"
METRICS_JSON = ROOT / "evidence" / "generated" / "metrics.json"
SERVICENOW_IMPORT = DATA / "servicenow_import" / "incidents.csv"

TICKET_FIELDS = (
    "ticket_id",
    "type",
    "opened_at",
    "first_response_at",
    "resolved_at",
    "caller",
    "department",
    "summary",
    "impact",
    "urgency",
    "priority",
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

EXPECTED = {
    "tickets": 40,
    "users": 15,
    "assets": 20,
    "kb_articles": 10,
    "first_contact_resolutions": 26,
    "escalations": 8,
    "sla_compliant": 37,
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


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def truthy(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized not in {"true", "false"}:
        raise ValueError(f"Expected true/false, received {value!r}")
    return normalized == "true"


def minutes_between(start: str, end: str) -> float:
    return (parse_utc(end) - parse_utc(start)).total_seconds() / 60.0


def format_minutes(value: float) -> str:
    if value < 60:
        return f"{value:.0f} min"
    hours = value / 60.0
    if hours < 48:
        return f"{hours:.1f} hr"
    return f"{hours / 24.0:.1f} days"


def load_targets() -> dict[str, dict[str, str]]:
    return {row["priority"]: row for row in read_csv(DATA / "sla_targets.csv")}


def measure_tickets(
    tickets: Iterable[dict[str, str]],
    targets: dict[str, dict[str, str]] | None = None,
) -> list[TicketMeasurement]:
    targets = targets or load_targets()
    measurements: list[TicketMeasurement] = []
    for ticket in tickets:
        target = targets[ticket["priority"]]
        response_minutes = minutes_between(ticket["opened_at"], ticket["first_response_at"])
        resolution_minutes = minutes_between(ticket["opened_at"], ticket["resolved_at"])
        response_target = int(target["response_target_minutes"])
        resolution_target = int(target["resolution_target_minutes"])
        measurements.append(
            TicketMeasurement(
                ticket_id=ticket["ticket_id"],
                priority=ticket["priority"],
                response_minutes=response_minutes,
                resolution_minutes=resolution_minutes,
                response_target_minutes=response_target,
                resolution_target_minutes=resolution_target,
                response_met=response_minutes <= response_target,
                resolution_met=resolution_minutes <= resolution_target,
            )
        )
    return measurements


def calculate_metrics(tickets: list[dict[str, str]]) -> dict[str, object]:
    measurements = measure_tickets(tickets)
    by_priority: dict[str, dict[str, object]] = {}
    for priority in ("P1", "P2", "P3", "P4"):
        subset = [m for m in measurements if m.priority == priority]
        by_priority[priority] = {
            "tickets": len(subset),
            "response_met": sum(m.response_met for m in subset),
            "resolution_met": sum(m.resolution_met for m in subset),
            "both_met": sum(m.sla_met for m in subset),
            "compliance_percent": round(100.0 * sum(m.sla_met for m in subset) / len(subset), 1)
            if subset
            else 0.0,
        }

    total = len(tickets)
    fcr = sum(truthy(ticket["first_contact_resolution"]) for ticket in tickets)
    escalations = sum(truthy(ticket["escalated"]) for ticket in tickets)
    compliant = sum(measurement.sla_met for measurement in measurements)
    missed = [
        {
            "ticket_id": measurement.ticket_id,
            "priority": measurement.priority,
            "response_minutes": round(measurement.response_minutes, 1),
            "resolution_minutes": round(measurement.resolution_minutes, 1),
            "response_met": measurement.response_met,
            "resolution_met": measurement.resolution_met,
        }
        for measurement in measurements
        if not measurement.sla_met
    ]
    return {
        "dataset_label": "SIMULATED PORTFOLIO DATA",
        "ticket_count": total,
        "first_contact_resolutions": fcr,
        "first_contact_resolution_percent": round(100.0 * fcr / total, 1),
        "escalations": escalations,
        "escalation_percent": round(100.0 * escalations / total, 1),
        "sla_compliant": compliant,
        "sla_compliance_percent": round(100.0 * compliant / total, 1),
        "average_response_minutes": round(
            statistics.fmean(m.response_minutes for m in measurements), 1
        ),
        "median_response_minutes": round(
            statistics.median(m.response_minutes for m in measurements), 1
        ),
        "average_resolution_minutes": round(
            statistics.fmean(m.resolution_minutes for m in measurements), 1
        ),
        "median_resolution_minutes": round(
            statistics.median(m.resolution_minutes for m in measurements), 1
        ),
        "by_priority": by_priority,
        "missed_sla_tickets": missed,
    }


def md(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def ticket_markdown(ticket: dict[str, str], measurement: TicketMeasurement) -> str:
    evidence = (
        f"[`{md(ticket['evidence_ref'])}`](../../{md(ticket['evidence_ref'])})"
        if ticket["evidence_ref"] != "none"
        else "No committed evidence file; see the evidence capture guide."
    )
    escalation = ""
    if truthy(ticket["escalated"]):
        escalation = f"""
## Escalation handoff

- **Destination:** {md(ticket['assignment_group'])}
- **Scope statement:** Tier 1 documented the client-side facts and did not exceed its fictional authorization boundary.
- **Handoff package:** Initial report, scope, diagnostic results, timestamps, action already taken, evidence reference, and requested resolver action.
"""

    return f"""# {md(ticket['ticket_id'])} - {md(ticket['summary'])}

> **SIMULATED PORTFOLIO TICKET.** The company, caller, systems, timestamps, and results are fictional. This is not a production record or proof of employment.

## Record

| Field | Value |
|---|---|
| Ticket | {md(ticket['ticket_id'])} |
| Type | {md(ticket['type'])} |
| Caller | {md(ticket['caller'])} - {md(ticket['department'])} |
| Asset | {md(ticket['asset_id'])} |
| Environment | {md(ticket['environment'])} |
| Category | {md(ticket['category'])} / {md(ticket['subcategory'])} |
| Impact / urgency | {md(ticket['impact'])} / {md(ticket['urgency'])} |
| Priority | {md(ticket['priority'])} |
| Assignment group | {md(ticket['assignment_group'])} |
| Final state | {md(ticket['state'])} - {md(ticket['resolution_code'])} |
| Escalated | {md(ticket['escalated'])} |
| First-contact resolution | {md(ticket['first_contact_resolution'])} |
| KB reference | {md(ticket['kb_reference'])} |

## Timeline

| Event | UTC timestamp |
|---|---|
| Opened | {md(ticket['opened_at'])} |
| First response | {md(ticket['first_response_at'])} |
| Resolved | {md(ticket['resolved_at'])} |

## Initial report

{md(ticket['initial_report'])}

## Work notes

{md(ticket['diagnostic_summary'])}

## Root cause or bounded finding

{md(ticket['root_cause'])}

## Resolution

{md(ticket['resolution'])}

## Validation

{md(ticket['validation'])}

## User communication

{md(ticket['user_communication'])}
{escalation}
## SLA result

| Measure | Actual | Target | Met? |
|---|---:|---:|---:|
| First response | {format_minutes(measurement.response_minutes)} | {format_minutes(measurement.response_target_minutes)} | {'Yes' if measurement.response_met else 'No'} |
| Resolution | {format_minutes(measurement.resolution_minutes)} | {format_minutes(measurement.resolution_target_minutes)} | {'Yes' if measurement.resolution_met else 'No'} |

**Overall simplified SLA:** {'Met' if measurement.sla_met else 'Missed'}

## Evidence

{evidence}
"""


def metrics_markdown(metrics: dict[str, object]) -> str:
    priority_lines = []
    for priority in ("P1", "P2", "P3", "P4"):
        row = metrics["by_priority"][priority]  # type: ignore[index]
        priority_lines.append(
            f"| {priority} | {row['tickets']} | {row['response_met']} | "
            f"{row['resolution_met']} | {row['both_met']} | {row['compliance_percent']:.1f}% |"
        )
    missed_lines = []
    for row in metrics["missed_sla_tickets"]:  # type: ignore[assignment]
        missed_lines.append(
            f"| {row['ticket_id']} | {row['priority']} | "
            f"{format_minutes(row['response_minutes'])} | "
            f"{format_minutes(row['resolution_minutes'])} | "
            f"{'response' if not row['response_met'] else 'resolution'} |"
        )
    return f"""# SLA and service-desk metrics

> **SIMULATED PORTFOLIO METRICS.** Calculated from fictional timestamps in `data/tickets.csv`. They are not production KPIs or employment results.

## Summary

| Metric | Calculated result |
|---|---:|
| Tickets | {metrics['ticket_count']} |
| First-contact resolutions | {metrics['first_contact_resolutions']} ({metrics['first_contact_resolution_percent']:.1f}%) |
| Escalations | {metrics['escalations']} ({metrics['escalation_percent']:.1f}%) |
| Tickets meeting response and resolution targets | {metrics['sla_compliant']} ({metrics['sla_compliance_percent']:.1f}%) |
| Average first response | {format_minutes(metrics['average_response_minutes'])} |
| Median first response | {format_minutes(metrics['median_response_minutes'])} |
| Average resolution | {format_minutes(metrics['average_resolution_minutes'])} |
| Median resolution | {format_minutes(metrics['median_resolution_minutes'])} |

## Results by priority

| Priority | Tickets | Response met | Resolution met | Both met | Compliance |
|---|---:|---:|---:|---:|---:|
{chr(10).join(priority_lines)}

## Tickets that missed a target

| Ticket | Priority | Response | Resolution | Missed measure |
|---|---|---:|---:|---|
{chr(10).join(missed_lines)}

The dataset intentionally includes difficult cases instead of making every record pass. INC019 required an extended intermittent-Wi-Fi observation window, INC033 required an application-owner compatibility fix, and INC038 required extended inventory reconciliation.

## Definitions

- **First-contact resolution:** `first_contact_resolution=true` in the modeled record; resolved by Tier 1 in the first support interaction without reassignment or later user contact.
- **Escalation:** `escalated=true`; Tier 1 handed the record to another fictional resolver group.
- **SLA compliance:** both first-response and resolution elapsed minutes are within the priority targets in `data/sla_targets.csv`.
- **Elapsed-time model:** continuous elapsed minutes, not a production business-hours calendar. No pause states, holidays, or maintenance exclusions are applied.

Regenerate with `python tools/labtool.py generate` and verify with `python tools/labtool.py validate`.
"""


def service_now_csv(tickets: list[dict[str, str]]) -> str:
    output = io.StringIO(newline="")
    fields = [
        "number",
        "caller_id",
        "short_description",
        "description",
        "impact",
        "urgency",
        "priority",
        "category",
        "subcategory",
        "assignment_group",
        "state",
        "opened_at",
        "resolved_at",
        "work_notes",
        "close_notes",
        "u_kb_reference",
        "u_asset_id",
        "u_simulation_label",
    ]
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for ticket in tickets:
        writer.writerow(
            {
                "number": ticket["ticket_id"],
                "caller_id": ticket["caller"],
                "short_description": ticket["summary"],
                "description": ticket["initial_report"],
                "impact": ticket["impact"],
                "urgency": ticket["urgency"],
                "priority": ticket["priority"],
                "category": ticket["category"],
                "subcategory": ticket["subcategory"],
                "assignment_group": ticket["assignment_group"],
                "state": ticket["state"],
                "opened_at": ticket["opened_at"],
                "resolved_at": ticket["resolved_at"],
                "work_notes": ticket["diagnostic_summary"],
                "close_notes": " ".join(
                    [
                        f"Root cause/finding: {ticket['root_cause']}",
                        f"Resolution: {ticket['resolution']}",
                        f"Validation: {ticket['validation']}",
                        f"User communication: {ticket['user_communication']}",
                    ]
                ),
                "u_kb_reference": ticket["kb_reference"],
                "u_asset_id": ticket["asset_id"],
                "u_simulation_label": "SIMULATED PORTFOLIO DATA",
            }
        )
    return output.getvalue()


def expected_artifacts(tickets: list[dict[str, str]]) -> dict[Path, str]:
    measurements = {m.ticket_id: m for m in measure_tickets(tickets)}
    metrics = calculate_metrics(tickets)
    artifacts = {
        TICKET_OUTPUT / f"{ticket['ticket_id']}.md": ticket_markdown(
            ticket, measurements[ticket["ticket_id"]]
        )
        for ticket in tickets
    }
    artifacts[METRICS_REPORT] = metrics_markdown(metrics)
    artifacts[METRICS_JSON] = json.dumps(
        {"source": "data/tickets.csv", "metrics": metrics}, indent=2, sort_keys=True
    ) + "\n"
    artifacts[SERVICENOW_IMPORT] = service_now_csv(tickets)
    return artifacts


def write_exact(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as stream:
        stream.write(content)


def generate() -> None:
    tickets = read_csv(DATA / "tickets.csv")
    for path, content in expected_artifacts(tickets).items():
        write_exact(path, content)
    print(f"Generated {len(tickets)} ticket files and 3 derived reports/import artifacts.")


def _duplicate_values(rows: list[dict[str, str]], field: str) -> list[str]:
    counts = Counter(row[field] for row in rows)
    return sorted(value for value, count in counts.items() if count > 1)


def validate() -> list[str]:
    errors: list[str] = []
    tickets = read_csv(DATA / "tickets.csv")
    users = read_csv(DATA / "users.csv")
    assets = read_csv(DATA / "assets.csv")
    targets = load_targets()
    kb_files = sorted((ROOT / "kb").glob("KB[0-9][0-9][0-9]-*.md"))

    if not tickets:
        return ["data/tickets.csv contains no records"]
    missing_fields = [field for field in TICKET_FIELDS if field not in tickets[0]]
    if missing_fields:
        errors.append(f"tickets.csv is missing fields: {', '.join(missing_fields)}")

    counts = {
        "tickets": len(tickets),
        "users": len(users),
        "assets": len(assets),
        "kb_articles": len(kb_files),
    }
    for key, expected in EXPECTED.items():
        if key in counts and counts[key] != expected:
            errors.append(f"Expected {expected} {key}; found {counts[key]}")

    expected_ids = {f"INC{number:03d}" for number in range(1, 41)}
    actual_ids = {ticket["ticket_id"] for ticket in tickets}
    if actual_ids != expected_ids:
        errors.append(
            "Ticket IDs differ from INC001-INC040: "
            f"missing={sorted(expected_ids - actual_ids)}, extra={sorted(actual_ids - expected_ids)}"
        )
    for path, rows, field in (
        ("tickets.csv", tickets, "ticket_id"),
        ("users.csv", users, "user_id"),
        ("assets.csv", assets, "asset_id"),
    ):
        duplicates = _duplicate_values(rows, field)
        if duplicates:
            errors.append(f"{path} has duplicate {field} values: {duplicates}")

    user_names = {user["display_name"] for user in users}
    asset_ids = {asset["asset_id"] for asset in assets}
    kb_ids = {path.name[:5] for path in kb_files}
    for user in users:
        if not user["user_principal_name"].endswith("@northstar.example"):
            errors.append(f"Nonfictional UPN domain for {user['user_id']}")
    for asset in assets:
        if not asset["synthetic_serial"].startswith("SYN-"):
            errors.append(f"Asset {asset['asset_id']} lacks SYN- serial marker")
        if not asset["documentation_ip"].startswith("192.0.2."):
            errors.append(f"Asset {asset['asset_id']} is outside the documentation IP range")

    for ticket in tickets:
        ticket_id = ticket["ticket_id"]
        if ticket["caller"] not in user_names:
            errors.append(f"{ticket_id} references unknown caller {ticket['caller']!r}")
        if ticket["asset_id"] not in asset_ids:
            errors.append(f"{ticket_id} references unknown asset {ticket['asset_id']!r}")
        if ticket["priority"] not in targets:
            errors.append(f"{ticket_id} references unknown priority {ticket['priority']!r}")
        if ticket["kb_reference"] != "none" and ticket["kb_reference"] not in kb_ids:
            errors.append(f"{ticket_id} references missing KB {ticket['kb_reference']!r}")
        for boolean_field in ("escalated", "first_contact_resolution"):
            try:
                truthy(ticket[boolean_field])
            except ValueError as exc:
                errors.append(f"{ticket_id} {boolean_field}: {exc}")
        try:
            opened = parse_utc(ticket["opened_at"])
            responded = parse_utc(ticket["first_response_at"])
            resolved = parse_utc(ticket["resolved_at"])
            if not opened <= responded <= resolved:
                errors.append(f"{ticket_id} timestamps are not ordered opened <= response <= resolved")
        except ValueError as exc:
            errors.append(f"{ticket_id} has invalid timestamp: {exc}")
        if ticket["evidence_ref"] != "none" and not (ROOT / ticket["evidence_ref"]).is_file():
            errors.append(f"{ticket_id} evidence path does not exist: {ticket['evidence_ref']}")

    metrics = calculate_metrics(tickets)
    metric_expectations = {
        "first_contact_resolutions": EXPECTED["first_contact_resolutions"],
        "escalations": EXPECTED["escalations"],
        "sla_compliant": EXPECTED["sla_compliant"],
    }
    for field, expected in metric_expectations.items():
        if metrics[field] != expected:
            errors.append(f"Expected {field}={expected}; calculated {metrics[field]}")

    expected = expected_artifacts(tickets)
    for path, content in expected.items():
        if not path.is_file():
            errors.append(f"Generated artifact is missing: {path.relative_to(ROOT)}")
            continue
        actual = path.read_text(encoding="utf-8")
        if actual != content:
            errors.append(
                f"Generated artifact is stale: {path.relative_to(ROOT)}; run labtool.py generate"
            )
    generated_ticket_files = set(TICKET_OUTPUT.glob("INC*.md")) if TICKET_OUTPUT.exists() else set()
    expected_ticket_files = {path for path in expected if path.parent == TICKET_OUTPUT}
    unexpected = generated_ticket_files - expected_ticket_files
    if unexpected:
        errors.append(
            "Unexpected generated ticket files: "
            + ", ".join(str(path.relative_to(ROOT)) for path in sorted(unexpected))
        )

    forbidden_markers = ("@gmail.com", "@outlook.com", "@yahoo.com", "password=", "api_key=")
    for csv_path in DATA.glob("*.csv"):
        lowered = csv_path.read_text(encoding="utf-8-sig").lower()
        for marker in forbidden_markers:
            if marker in lowered:
                errors.append(f"Potential real or secret data marker {marker!r} in {csv_path.name}")

    markdown_link = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for markdown_path in ROOT.rglob("*.md"):
        for raw_target in markdown_link.findall(markdown_path.read_text(encoding="utf-8")):
            target = raw_target.strip().strip("<>").split("#", 1)[0]
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            resolved = (markdown_path.parent / target).resolve()
            if not resolved.exists():
                errors.append(
                    f"Broken local Markdown link in {markdown_path.relative_to(ROOT)}: {raw_target}"
                )
    return errors


def command_validate() -> int:
    errors = validate()
    if errors:
        print("Validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    metrics = calculate_metrics(read_csv(DATA / "tickets.csv"))
    print(
        "Validation passed: "
        f"{metrics['ticket_count']} tickets, "
        f"{metrics['first_contact_resolution_percent']:.1f}% FCR, "
        f"{metrics['escalations']} escalations, "
        f"{metrics['sla_compliance_percent']:.1f}% simplified SLA compliance."
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate and render the synthetic help-desk portfolio lab."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("validate", help="Validate data, relationships, metrics, and artifacts")
    subparsers.add_parser("generate", help="Regenerate tickets, metrics, and import mapping")
    subparsers.add_parser("metrics", help="Print the calculated Markdown metrics report")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "validate":
        return command_validate()
    if args.command == "generate":
        generate()
        return 0
    if args.command == "metrics":
        print(metrics_markdown(calculate_metrics(read_csv(DATA / "tickets.csv"))))
        return 0
    raise AssertionError(f"Unhandled command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
