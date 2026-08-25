# Lab architecture and trust boundaries

> **Simulation boundary:** Every component, person, asset, record, and metric described here is fictional or an optional personal learning-lab exercise. Nothing in this repository connects automatically to an employer system.

## Purpose

Northstar models a completed historical service-desk snapshot for a fictional 75-person hybrid organization. The goal is to make the relationship between help-desk decisions, structured documentation, evidence, and automation easy to demonstrate in an interview.

```text
Fictional callers
      │
      ▼
Tickets + request items + event history ──► Validation ──► Markdown records
      │                                         │               SLA report
      │                                         │               ITSM staging CSVs
      │                                         └──────────────► Static Operations Console
      │
      ├─ Windows endpoint and network-triage learning cases
      ├─ Optional sentinel-marked AD/DNS learning lab
      └─ Fictional resolver groups for documented escalation handoffs
```

## Canonical data flow

| Source | Role |
|---|---|
| `data/tickets.csv` | Fictional narrative, classification, relationships, resolution state, final closure state, and resolver metadata |
| `data/ticket_events.csv` | Canonical event history for opened, acknowledged, work-note, assignment, pending, escalation, first-contact resolution, resolution, and closure events |
| `data/users.csv` / `data/assets.csv` | Stable fictional identities and assets |
| `data/ad_groups.csv` | Synthetic AD access-group allowlist for the optional lab |
| `data/resolver_groups.csv` | Fictional help-desk resolver groups; deliberately separate from AD access groups |
| `data/request_items.csv` / `data/request_tasks.csv` | Fictional request fulfillment, approval, and task relationships |
| `data/priority_matrix.csv` | Impact/urgency policy used to validate priority selection |

`tools/labtool.py validate` verifies schemas, values, request/task graphs, priority policy, UTC event order, summary-to-event state agreement, evidence-path containment, known marker patterns, Markdown links, and freshness of all generated artifacts. The strict baseline is optional so learners can customize the dataset while still using generic schema and relationship validation.

## Generated outputs

- `tickets/generated/` — one human-readable fictional record per incident or request.
- `docs/metrics/SLA_REPORT.md` and `evidence/generated/metrics.json` — event-derived simplified SLA reporting.
- `data/servicenow_import/incidents.csv` and `requests.csv` — separate **staging** mappings, not direct production exports.
- `web/data/lab.json` — normalized local data for the static Operations Console.

Generation validates before it writes, stages every output under a temporary directory, refuses path escape attempts, and restores touched outputs if a replacement fails.

## Optional AD/DNS learning-lab boundary

The AD scripts are intentionally not generic administration tools.

- Fixed synthetic DNS root: `northstar.example`.
- Required root: `OU=Northstar Lab,DC=northstar,DC=example`.
- Required root sentinel: `SYNTHETIC-NORTHSTAR-PORTFOLIO-LAB-V2`.
- Eligible users require the `SYNTHETIC Northstar portfolio lab identity` marker and must remain under the marked root OU.
- Eligible groups must be in `OU=Groups` under the marked root, use the synthetic group marker, and appear in `data/ad_groups.csv`.
- Protected, administrative, service-account, outside-OU, and unmarked objects are rejected before a mutation cmdlet is reached.

State-changing actions require `-Execute`, a fictional ticket/request ID, `ShouldProcess`, a resolved audit path contained under ignored `evidence/private/`, and a secret-free audit line. `-WhatIf` must not prompt for a password.

## Console boundary

The static console is a reviewer experience, not an ITSM system. It provides no authentication, write controls, live SLA clock, device action, ticket update, asset wipe, or third-party integration. It reads only the generated local JSON artifact and uses hash routes so record links reload safely on GitHub Pages.
