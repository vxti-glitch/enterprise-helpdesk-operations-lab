# ServiceNow personal developer instance guide

> **Simulation boundary:** This is a mapping and study guide. The repository does not claim a live ServiceNow instance, production import, or platform administration experience.

## Purpose

Use a ServiceNow Personal Developer Instance only to recreate a small subset of the fictional workflows after studying the repository. The static Operations Console remains the primary portfolio experience.

## Suggested recreation set

| Record | What to practice |
|---|---|
| INC012 | Incident categorization, work note, resolution, validation, and linked KB |
| INC009 | Security handoff with a deliberately bounded Tier 1 scope statement |
| INC040 | Time-sensitive but non-P1 prioritization and user fallback communication |
| REQ001 / RITM001 | Onboarding request, approval, and fulfillment tasks |
| REQ002 / RITM002 | Offboarding request, custody, and validation tasks |
| REQ006 / RITM006 | Device-deployment request routed to Endpoint Management |

## Staging files

Run `python tools/labtool.py generate` to create:

- `data/servicenow_import/incidents.csv`
- `data/servicenow_import/requests.csv`

They are deliberately **not** direct production imports. They use external source IDs, fictional caller IDs, display-name resolver groups, custom simulation fields, and data that must be mapped to the tables and choice values in your own learning instance. Platform-generated numbers, users, groups, request items, and transform maps must be created or mapped by you.

## Honest evidence standard

If you personally recreate a case, capture only redacted evidence from your authorized PDI and label it `LAB-EXECUTED`. A screenshot of the Northstar console is an `APPLICATION SCREENSHOT` displaying simulated data; it does not demonstrate ServiceNow experience.
