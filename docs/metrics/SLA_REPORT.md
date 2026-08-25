# SLA and service-desk metrics

> **SIMULATED PORTFOLIO METRICS.** Calculated from fictional event timestamps in `data/ticket_events.csv`. They are not production KPIs or employment results.

## Summary

| Metric | Calculated result |
|---|---:|
| Records | 40 |
| First-contact resolutions | 26 (65.0%) |
| Escalations | 8 (20.0%) |
| Records meeting response and resolution targets | 37 (92.5%) |
| Average first response | 18.7 min |
| Median first response | 16.5 min |
| Average resolution | 13.0 hr |
| Median resolution | 1.1 hr |

## Results by priority

| Priority | Records | Response met | Resolution met | Both met | Compliance |
|---|---:|---:|---:|---:|---:|
| P1 | 1 | 1 | 1 | 1 | 100.0% |
| P2 | 6 | 6 | 6 | 6 | 100.0% |
| P3 | 30 | 30 | 28 | 28 | 93.3% |
| P4 | 3 | 3 | 2 | 2 | 66.7% |

## Records that missed a target

| Record | Priority | Response | Resolution | Missed measure |
|---|---|---:|---:|---|
| INC019 | P3 | 25 min | 3.1 days | resolution |
| INC033 | P3 | 35 min | 3.1 days | resolution |
| INC038 | P4 | 1.0 hr | 6.1 days | resolution |

The dataset intentionally retains difficult fictional cases. INC019 includes an intermittent-Wi-Fi observation window, INC033 includes an application-owner compatibility fix, and INC038 includes extended inventory reconciliation.

## Definitions

- **First-contact resolution:** derived from a `First-contact resolution` event with no `Escalated` event.
- **Escalation:** derived from an `Escalated` event in the fictional record history.
- **SLA compliance:** first acknowledgement and resolution events must meet the priority targets in `data/sla_targets.csv`.
- **Elapsed-time model:** continuous elapsed minutes. It does not model business-hours calendars, holidays, or paused SLA clocks.

Regenerate with `python tools/labtool.py generate` and verify with `python tools/labtool.py validate --strict-baseline`.
