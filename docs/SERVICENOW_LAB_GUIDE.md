# ServiceNow-style learning guide

This repository is not affiliated with ServiceNow. The data uses familiar ITSM concepts so it can be recreated in a Personal Developer Instance or another ticketing tool.

## Recommended learning scope

Start by manually creating six representative records:

| Ticket | Why recreate it |
|---|---|
| INC002 | Routine identity resolution and validation |
| INC009 | Security escalation with a clean handoff |
| INC012 | DNS isolation and ticket-ready evidence |
| INC025 | Microsoft 365 application troubleshooting simulation |
| INC037 | Service request fulfilled by another group |
| INC040 | Business-impact triage and proactive communication |

## Suggested users and groups

Import or manually create the fictional users from `data/users.csv`. Suggested assignment groups are in `data/groups.csv`: Service Desk Tier 1, Service Desk Tier 2, Network Operations, Security Operations, Identity and Access, Endpoint Management, Microsoft 365 Support, Application Support, and Asset Management.

## Field mapping

`data/servicenow_import/incidents.csv` is generated for readable mapping. Common destinations are:

| Repository field | Common incident concept |
|---|---|
| `number` | Ticket number |
| `caller_id` | Caller |
| `short_description` | Summary |
| `description` | Initial report |
| `impact` / `urgency` / `priority` | Triage |
| `category` / `subcategory` | Classification |
| `assignment_group` | Current resolver group |
| `work_notes` | Diagnostic steps and observations |
| `close_notes` | Root cause, resolution, validation, communication |
| `u_kb_reference` | Portfolio KB link |
| `u_asset_id` | Synthetic asset relationship |

Field names, choice values, roles, and import behavior vary by instance. Inspect your table dictionary and test with a few records. Do not run bulk imports into a tenant you do not own or administer.

## Workflow exercise

For each representative ticket:

1. Record the caller's words without diagnosing prematurely.
2. Set impact and urgency, then confirm the resulting priority against `data/sla_targets.csv`.
3. Add concise work notes after each meaningful check.
4. Attach only sanitized evidence.
5. Either resolve within Tier 1 scope or reassign using `docs/workflows/ESCALATION_MATRIX.md`.
6. Record validation and a user-facing message before closure.

## Screenshot evidence

Capture your own instance only. Useful screenshots include an incident queue, one routine resolution, one escalation, the priority fields, one KB article, and a report/dashboard. Do not add fabricated UI screenshots. Follow `docs/EVIDENCE_GUIDE.md` before publishing.
