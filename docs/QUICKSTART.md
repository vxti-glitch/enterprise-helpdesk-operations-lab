# Quick start

The console itself runs without a domain controller, ServiceNow instance, Microsoft 365 tenant, Docker, database, or runtime JavaScript package. The optional browser regression checks use the pinned development dependencies in `package-lock.json`.

## Run the console

The published simulated demo is available at [GitHub Pages](https://vxti-glitch.github.io/enterprise-helpdesk-operations-lab/). To run your local copy:

```powershell
python tools/labtool.py generate --strict-baseline
python tools/labtool.py validate --strict-baseline
python tools/labtool.py serve
```

Open the local address printed by the server. The console reads `web/data/lab.json`, a generated artifact created from the fictional CSV and event data.

## Validate and test

```powershell
.\scripts\powershell\Test-Repository.ps1
```

Individual commands:

```powershell
python tools/labtool.py metrics --strict-baseline
python -m unittest discover -s tests -v
node --test web/filters.test.mjs
Invoke-Pester .\tests\powershell\NorthstarLabGuard.Tests.ps1
```

`validate` performs generic schema and relationship validation. `--strict-baseline` additionally checks the committed 40-record demonstration totals. Use generic validation while customizing the lab; use strict baseline to confirm the published demonstration state.

## Regenerate derived files

After editing canonical fictional data, run:

```powershell
python tools/labtool.py generate
python tools/labtool.py validate
```

Generation produces human-readable records, event-derived metrics, separate incident/request staging mappings, and console data. It validates before writing, stages outputs, and refuses destinations outside the allowed generated directories. `serve` refuses to start if these derived artifacts are stale, so run `generate` first after a source-data edit.

## Package a clean commit

After committing all changes and confirming a clean worktree:

```powershell
python tools/labtool.py package
```

This creates a Git-archive ZIP and SHA-256 checksum under `dist/`. The command refuses to package a dirty or invalid repository.

## Optional isolated AD lab

Read [the AD lab guide](ACTIVE_DIRECTORY_LAB.md) first. The scripts are intentionally fixed to `northstar.example` and a sentinel-marked `OU=Northstar Lab`; they are not reusable generic administration scripts.

```powershell
.\scripts\powershell\Test-LabPrerequisites.ps1
.\scripts\powershell\New-LabAdStructure.ps1
.\scripts\powershell\New-LabAdStructure.ps1 -Execute -WhatIf
.\scripts\powershell\Import-LabUsers.ps1
.\scripts\powershell\Import-LabUsers.ps1 -Execute -WhatIf
```

Only remove `-WhatIf` in a disposable, authorized lab after reviewing the target. State-changing account support also requires `-Execute` and a fictional `-TicketId` such as `INC012`.

## Optional ServiceNow learning instance

Follow [the ServiceNow PDI guide](SERVICENOW_LAB_GUIDE.md) and recreate a small representative set. Keep raw evidence under `evidence/private/` until it has been redacted and truthfully labeled.
