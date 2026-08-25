# SLA and service-desk metrics

> **SIMULATED PORTFOLIO METRICS.** Calculated from fictional timestamps in `data/tickets.csv`. They are not production KPIs or employment results.

## Summary

| Metric | Calculated result |
|---|---:|
| Tickets | 40 |
| First-contact resolutions | 26 (65.0%) |
| Escalations | 8 (20.0%) |
| Tickets meeting response and resolution targets | 37 (92.5%) |
| Average first response | 19 min |
| Median first response | 16 min |
| Average resolution | 13.0 hr |
| Median resolution | 1.1 hr |

## Results by priority

| Priority | Tickets | Response met | Resolution met | Both met | Compliance |
|---|---:|---:|---:|---:|---:|
| P1 | 1 | 1 | 1 | 1 | 100.0% |
| P2 | 6 | 6 | 6 | 6 | 100.0% |
| P3 | 30 | 30 | 28 | 28 | 93.3% |
| P4 | 3 | 3 | 2 | 2 | 66.7% |

## Tickets that missed a target

| Ticket | Priority | Response | Resolution | Missed measure |
|---|---|---:|---:|---|
| INC019 | P3 | 25 min | 3.1 days | resolution |
| INC033 | P3 | 35 min | 3.1 days | resolution |
| INC038 | P4 | 1.0 hr | 6.1 days | resolution |

The dataset intentionally includes difficult cases instead of making every record pass. INC019 required an extended intermittent-Wi-Fi observation window, INC033 required an application-owner compatibility fix, and INC038 required extended inventory reconciliation.

## Definitions

- **First-contact resolution:** `first_contact_resolution=true` in the modeled record; resolved by Tier 1 in the first support interaction without reassignment or later user contact.
- **Escalation:** `escalated=true`; Tier 1 handed the record to another fictional resolver group.
- **SLA compliance:** both first-response and resolution elapsed minutes are within the priority targets in `data/sla_targets.csv`.
- **Elapsed-time model:** continuous elapsed minutes, not a production business-hours calendar. No pause states, holidays, or maintenance exclusions are applied.

Regenerate with `python tools/labtool.py generate` and verify with `python tools/labtool.py validate`.
