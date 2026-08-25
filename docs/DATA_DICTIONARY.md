# Data dictionary

> All values described here are fictional portfolio data.

## Tickets and requests

`data/tickets.csv` contains final record metadata and narrative fields. Incidents use `INC###`; service requests use `REQ###`. Migrated request records retain their previous `INC###` value in `legacy_id` so old references can be understood without treating a request as an incident.

| Field group | Meaning |
|---|---|
| `ticket_id`, `legacy_id`, `type` | Record identity and incident/request distinction |
| `caller_id`, `caller`, `department`, `asset_id` | Stable fictional relationship keys and display context |
| `impact`, `urgency`, `priority`, `priority_override_reason` | Priority policy inputs; an exception requires a documented reason |
| `assignment_group`, `resolution_state`, `final_state`, `resolution_code` | Final modeled resolver, resolution state, closure state, and outcome code |
| `initial_report` through `user_communication` | Interview-ready fictional narrative, not a production transcript |
| `opened_at`, `first_response_at`, `resolved_at`, `escalated`, `first_contact_resolution` | Human-readable summary values that validation checks against the event history |
| `evidence_ref` | Repository-relative path under `evidence/`, or `none` |

## Event history

`data/ticket_events.csv` is the source of truth for operational timing and state transitions.

| Event | Meaning |
|---|---|
| `Opened` | Fictional report entered the historical record |
| `Acknowledged` | First Tier 1 response; used for response timing |
| `Work note` | Internal documented observation or next action |
| `Assigned` / `Escalated` | Assignment and resolver handoff; escalation is derived from the event |
| `Pending user` / `Pending vendor` | Explicit intermediate fictional state; the simplified SLA model does not pause its clock |
| `First-contact resolution` | Event marker used with no escalation to derive FCR |
| `Resolved` / `Closed` | Resolution timing and historical closure |

All timestamps are ISO 8601 UTC values. The simplified SLA clock is continuous elapsed time. It intentionally excludes business-hours calendars, holidays, maintenance windows, and pause accounting.

## Relationships

- `caller_id` resolves to `data/users.csv`. For a service request, it is the beneficiary and must equal `requested_for_user_id`.
- `asset_id` resolves to `data/assets.csv`.
- `assignment_group` resolves to `data/resolver_groups.csv`.
- Service requests require exactly one `data/request_items.csv` row and at least one contiguous, ordered `data/request_tasks.csv` row. `requested_by_user_id` and `requested_for_user_id` are distinct, validated relationships.
- `kb_reference` resolves to an article under `kb/` unless its value is `none`.
- `priority` must match `data/priority_matrix.csv` unless `priority_override_reason` is present.

## ServiceNow-style staging data

`data/servicenow_import/` is a **mapping aid** for a personal developer instance, not a ready-to-run production import. It uses external source IDs, labels every row simulated, keeps incidents separate from requests, and expects users, resolver groups, transforms, and system-managed numbering to be configured by the learner.

## Evidence values

| Label | Meaning |
|---|---|
| `SIMULATED` | Fictitious content made for the portfolio lab |
| `SAMPLE OUTPUT` | Committed synthetic example of an evidence format |
| `APPLICATION SCREENSHOT` | Genuine view of this static console displaying simulated data |
| `LAB-EXECUTED` | Reserved for evidence personally captured in an authorized lab after redaction |
