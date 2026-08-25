# Data dictionary

## `data/tickets.csv`

| Field | Meaning |
|---|---|
| `ticket_id` | Synthetic record number (`INC001`-`INC040`) |
| `type` | Incident or service request |
| `opened_at` | ISO 8601 UTC timestamp for intake |
| `first_response_at` | First technician acknowledgement |
| `resolved_at` | Resolution/fulfillment timestamp; includes downstream completion after escalation |
| `caller` / `department` | Fictional user context |
| `summary` | Concise reported issue |
| `impact` | `1-High`, `2-Medium`, or `3-Low` |
| `urgency` | `1-High`, `2-Medium`, or `3-Low` |
| `priority` | `P1` through `P4`; target lookup key |
| `category` / `subcategory` | Routing and reporting classification |
| `assignment_group` | Final resolver group in the modeled workflow |
| `state` | Final state represented by the record |
| `resolution_code` | Modeled closure classification |
| `escalated` | Whether Tier 1 handed the record to another group |
| `first_contact_resolution` | Whether Tier 1 resolved it in the first support interaction without reassignment or later user contact |
| `kb_reference` | Linked article under `kb/`, when relevant |
| `asset_id` | Linked synthetic device, when relevant |
| `environment` | Supported platform/context |
| `initial_report` | Caller-facing problem statement |
| `diagnostic_summary` | Meaningful checks and results, not a click-by-click transcript |
| `root_cause` | Confirmed cause or bounded finding when escalated |
| `resolution` | Action taken by Tier 1 or final resolver |
| `validation` | Evidence that service was restored or the request completed |
| `user_communication` | Closure or handoff message phrased for the user |
| `evidence_ref` | Sanitized committed evidence path, or `none` |

## SLA calculation

Targets in `data/sla_targets.csv` use elapsed minutes for reproducibility. This simplified model does not pause for business hours, awaiting-user state, maintenance windows, or holidays. A ticket is compliant only when both response and resolution durations are less than or equal to the priority targets.

## `data/users.csv`

Every identity is fictional and uses the reserved `northstar.example` domain. `sam_account_name` is used by the optional AD import script. `manager_email` provides workflow context only.

## `data/assets.csv`

Serial values begin with `SYN-` and are not manufacturer serial numbers. IP addresses use RFC 5737 documentation networks. `last_verified` is a synthetic date used in the inventory exercise.
