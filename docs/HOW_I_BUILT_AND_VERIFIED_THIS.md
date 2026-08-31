# How I built and verified this

I built Northstar as a static, offline portfolio lab around fictional service-desk records. The browser is a historical console, not a live queue. The repository keeps the source data, generator, derived reports, optional learning-lab scripts, safety tests, and synthetic screenshots together so I can trace a displayed statement back to a committed record or event.

## Data and event model

Each incident or request has stable fictional relationships to a caller, asset, resolver group, knowledge article, and optional evidence reference. Requests also have one request item and ordered fulfillment tasks. A separate event history records opening, acknowledgement, work notes, assignments, escalation, pending states, resolution, and closure. The generator derives timing and simplified SLA results from those events instead of trusting summary fields in a ticket row.

The generated Markdown, console payload, metrics, and optional ServiceNow learning-instance staging mappings all come from the same canonical fictional data. The staging files remain mapping aids; they are not a production import and do not prove platform administration.

## AI assistance and my responsibility

AI/Codex assisted with drafting, code iteration, tests, and documentation structure. I am responsible for reviewing the retained design, running the checks, correcting mistakes, understanding the code and data model, and keeping every simulation and execution boundary visible. The fictional cases and generated metrics are not employment results.

## What I reviewed and tested locally

- Canonical schemas, required values, UTC timestamps, event order, relationships, priority policy, request/task graphs, summary-to-event agreement, evidence-path containment, Markdown links, and generated-file freshness.
- Python unit tests for metrics, validation failures, output containment, archive construction, and derived console data.
- JavaScript filter, route, relationship, tour, and reporting logic.
- Browser interaction, narrow-layout overflow, console-error, and accessibility checks.
- PowerShell parsing and containment tests for the sentinel-marked `northstar.example` learning-lab boundary.
- Regeneration of derived records and the commit-exact release-package contents.

These checks prove the assertions they make against fictional data and controlled stubs. They do not prove ServiceNow, AD, Microsoft 365, Entra, Intune, VPN, endpoint, or live-user administration.

## Mistakes I corrected during development

1. I separated service requests from incidents and retained legacy IDs instead of pretending every record shared one incident lifecycle.
2. I made the event history the source for acknowledgement, escalation, resolution, and closure timing instead of trusting duplicated summary timestamps and flags.
3. I replaced unsafe string-prefix output containment with resolved path checks so a similarly named directory cannot pass the guard.
4. I retained three deliberately missed fictional SLA targets and documented the continuous-clock limitation instead of presenting a perfect or production-grade metric.

## Tradeoffs

1. A static offline console is easy to inspect and safe to publish, but it cannot demonstrate live ITSM integrations, authentication, assignment engines, or platform controls.
2. A continuous elapsed-time SLA model is deterministic and teachable, but it omits business hours, holidays, pause states, calendars, and contractual policies.
3. Committing generated artifacts makes drift reviewable, but it requires freshness checks so source and derived files cannot silently diverge.

## What remains fictional or unverified

Northstar Solutions, all people, assets, cases, timestamps, metrics, and sample evidence are fictional. The application screenshots are genuine views of this static console displaying simulated data. No committed file proves paid support work, real users, a production SLA, a ServiceNow instance, tenant administration, or execution of the documented procedures on company systems.
