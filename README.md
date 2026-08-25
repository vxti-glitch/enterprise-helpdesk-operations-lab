# Enterprise Help Desk Operations Lab

> **Portfolio simulation - not employment history.** Northstar Solutions, every person, ticket, device, timestamp, hostname, email address, and result in this repository is fictional. The material demonstrates a repeatable lab process and does not claim access to a production environment or work performed for an employer.

This repository models the day-to-day work of a Tier 1 remote service desk: intake, triage, troubleshooting, documentation, escalation, identity lifecycle tasks, endpoint inventory, and service-level reporting. It connects the skills on my IT support resume - Windows 10/11, Active Directory, Microsoft 365/Entra ID concepts, Intune/Autopilot concepts, DNS/TCP troubleshooting, ticket documentation, PowerShell, Python, CSV, JSON, Markdown, and GitHub Actions - into one honest end-to-end portfolio project.

## What is included

| Area | Portfolio evidence |
|---|---|
| Ticketing | 40 ServiceNow-style simulated incidents and requests with consistent fields, work notes, resolutions, and escalations |
| Active Directory | Safe PowerShell lab scripts for OU/group setup, disabled-user import, and common account-support actions |
| Networking | DNS, ICMP, TCP-port, route, and adapter triage script plus documented network cases |
| Lifecycle operations | Complete onboarding and offboarding workflows with approval and validation gates |
| Asset management | 20 synthetic Windows-device records with ownership, lifecycle status, and verification dates |
| Knowledge management | 10 Tier 1 knowledge-base articles linked to recurring ticket scenarios |
| Service operations | Priority matrix, SLA targets, escalation matrix, and metrics calculated from ticket timestamps |
| Evidence | Sanitized sample outputs, an evidence manifest, and a screenshot capture plan - no invented screenshots |
| Quality | Standard-library Python validator, unit tests, PowerShell parse checks, and GitHub Actions |

## Measured lab results

The committed report is generated from `data/tickets.csv`; the figures are not typed into the report by hand.

| Metric | Result |
|---|---:|
| Tickets modeled | 40 |
| First-contact resolutions | 26 (65.0%) |
| Escalations | 8 (20.0%) |
| Tickets meeting both SLA targets | 37 (92.5%) |
| Knowledge-base articles | 10 |
| Synthetic assets | 20 |

See [the generated SLA report](docs/metrics/SLA_REPORT.md) for definitions, priority-level results, and the three intentionally missed targets.

## Repository map

```text
enterprise-helpdesk-operations-lab/
|-- data/                         Synthetic source data and import-ready CSVs
|-- docs/                         Architecture, setup, workflows, evidence, and interview notes
|-- evidence/                     Clearly labeled sample and generated lab evidence
|-- kb/                           Ten knowledge-base articles
|-- scripts/powershell/           Safe AD and Windows troubleshooting scripts
|-- templates/                    Reusable ticket and evidence templates
|-- tickets/generated/            Forty generated, human-readable ticket records
|-- tools/labtool.py              Validator, report generator, and ticket renderer
`-- tests/                         Standard-library unit tests
```

## Quick start

Python 3.10 or newer is recommended. No third-party Python packages are required.

```powershell
python tools/labtool.py validate
python tools/labtool.py metrics
python tools/labtool.py generate
python -m unittest discover -s tests -v
```

On Windows, run the complete check set with one command:

```powershell
.\scripts\powershell\Test-Repository.ps1
```

On a Windows lab machine, the read-only network triage script can be run separately:

```powershell
.\scripts\powershell\Invoke-NetworkTriage.ps1 -TargetHost example.com -TcpPort 443
```

The AD scripts default to planning or read-only behavior. State-changing operations require `-Execute`, support `-WhatIf`, and refuse to run unless the connected AD DNS root exactly matches `northstar.example`. Read [the quick-start guide](docs/QUICKSTART.md) before using them.

## Suggested review path

1. Start with [the architecture](docs/ARCHITECTURE.md) and [simulation boundaries](docs/SIMULATION_BOUNDARIES.md).
2. Read a routine resolution such as [INC012](tickets/generated/INC012.md), a security escalation such as [INC009](tickets/generated/INC009.md), and the priority-handling case [INC040](tickets/generated/INC040.md).
3. Review [onboarding](docs/workflows/ONBOARDING.md), [offboarding](docs/workflows/OFFBOARDING.md), and [the escalation matrix](docs/workflows/ESCALATION_MATRIX.md).
4. Study the [AD lab](docs/ACTIVE_DIRECTORY_LAB.md), [network case matrix](docs/NETWORK_CASES.md), and [asset lifecycle](docs/ASSET_MANAGEMENT.md).
5. Inspect the scripts and run the validator and tests.
6. Use [the evidence guide](docs/EVIDENCE_GUIDE.md) and [project checklist](docs/PROJECT_CHECKLIST.md) to add only evidence you personally capture.

## Optional hands-on environment

The repository is useful without paid services or cloud tenants. An optional implementation can include:

- One Windows Server evaluation VM for AD DS and DNS.
- One Windows 11 evaluation VM joined to the isolated lab domain.
- A ServiceNow Personal Developer Instance for recreating a subset of the ticket workflow.
- A legitimate Microsoft 365/Entra/Intune lab tenant, if independently available.

Microsoft 365, Entra ID, Intune, Autopilot, VPN, and ServiceNow actions remain documented simulations unless you personally execute and capture them in an authorized lab. Never describe the CSV records as a ServiceNow export or the workflow notes as production experience.

## Honest resume language

Suggested project entry after you have reviewed and can explain the material:

> **Enterprise Help Desk Operations Lab | Windows, Active Directory, PowerShell, ITSM**<br>
> Built a fictional service-desk environment with 40 documented incidents and requests spanning identity, Microsoft 365, endpoint, networking, and security triage; recorded resolution, validation, escalation, and user communication notes.<br>
> Created safe AD lab scripts, 10 knowledge-base articles, a 20-device synthetic asset inventory, onboarding/offboarding workflows, and reproducible SLA reporting from timestamped ticket data.

Use "built," "modeled," "simulated," or "lab" - never "supported 75 users" or "maintained production SLA."

## Safety and privacy

- All data uses reserved domains, documentation IP ranges, and obviously synthetic serials.
- No passwords, tokens, tenant identifiers, API keys, real employee data, or real serial numbers belong in this repository.
- Review [SECURITY.md](SECURITY.md) before publishing screenshots or command output.
- This project is not affiliated with or endorsed by ServiceNow or Microsoft.

## License

Code is available under the [MIT License](LICENSE). Documentation and simulated data may be reused with attribution, but customize them before presenting the lab as your own work.
