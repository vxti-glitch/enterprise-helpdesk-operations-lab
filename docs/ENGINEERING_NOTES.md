# Engineering notes

This document records verified design decisions in this fictional portfolio project. It describes repository changes, not personal employment or production work.

## Reliability and traceability

- The console payload, Markdown records, SLA report, and ITSM staging files are generated from canonical fictional CSV and event data.
- The validator checks UTC timestamps, event order, final resolver/state agreement, request beneficiaries, task sequencing, generated-file freshness, evidence paths, and common secret markers.
- Simplified SLA calculations use continuous elapsed time. They are deliberately not production KPIs.

## Reviewer experience

- The ticket search updates its result region without rebuilding the form, preserving keyboard focus while typing.
- Hash-route navigation moves forward routes to their heading and exposes a direct four-step tour.
- Mobile layouts keep the evidence ledger reachable at narrow widths and avoid hiding all tables globally.
- Browser tests cover filtering, route behavior, relationships, tour progression, narrow layout overflow, accessibility, and console errors.

## Guarded learning-lab scripts

- AD mutations remain limited to a sentinel-marked fictional `northstar.example` lab, marked objects, approved groups, explicit execution, and `ShouldProcess`.
- Audit output is contained with resolved relative-path validation rather than a string-prefix comparison.
- These controls reduce risk in an isolated learning lab. They do not grant authorization or replace backups, review, or organizational safeguards.
