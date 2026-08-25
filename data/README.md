# Fictional source data

Every CSV in this directory uses fictional people, reserved `northstar.example` identities, synthetic serials, and RFC 5737 documentation IP addresses.

| File | Role |
|---|---|
| `tickets.csv` | Fictional record metadata and interview-ready narrative |
| `ticket_events.csv` | Canonical timing, assignment, escalation, FCR, and closure history |
| `users.csv` / `assets.csv` | Stable fictional people and inventory relationships |
| `ad_groups.csv` | Allowlisted synthetic AD lab groups; not ITSM resolver groups |
| `resolver_groups.csv` | Fictional help-desk assignment and escalation groups |
| `priority_matrix.csv` / `sla_targets.csv` | Priority policy and simplified continuous-elapsed-time SLA targets |
| `request_items.csv` / `request_tasks.csv` | Fictional request approvals and fulfillment tasks |
| `servicenow_import/` | Generated incident/request **staging** mappings for a personal learning instance |

Do not hand-edit derived artifacts. Change canonical CSV data, run `python tools/labtool.py generate`, then run `python tools/labtool.py validate`.
