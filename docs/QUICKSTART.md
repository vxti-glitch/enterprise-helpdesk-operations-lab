# Quick-start guide

The base repository runs without a domain controller, ServiceNow instance, or Microsoft 365 tenant. Python commands use only the standard library.

## 1. Validate the committed lab

From the repository root:

```powershell
python tools/labtool.py validate
python tools/labtool.py metrics
python -m unittest discover -s tests -v
```

`validate` checks schemas, row counts, unique IDs, fictional-domain markers, ticket timestamps, SLA references, linked KB articles, linked assets, generated ticket files, and the expected portfolio metrics. `metrics` prints the current report to the console. Tests exercise the same calculations independently.

## 2. Regenerate derived files

After editing CSV source data:

```powershell
python tools/labtool.py generate
python tools/labtool.py validate
```

Generation rewrites only these derived artifacts:

- `tickets/generated/INC001.md` through `INC040.md`
- `docs/metrics/SLA_REPORT.md`
- `evidence/generated/metrics.json`
- `data/servicenow_import/incidents.csv`

The import CSV uses readable field names that can be mapped into a learning instance. It is not represented as a native ServiceNow export.

## 3. Run read-only Windows network triage

```powershell
.\scripts\powershell\Invoke-NetworkTriage.ps1 `
  -TargetHost example.com `
  -TcpPort 443 `
  -OutputPath .\evidence\private\my-network-check.json
```

The script collects local adapter configuration, default route state, DNS resolution, ICMP results, and a TCP connection test. It changes no system settings.

## 4. Parse-check PowerShell locally

This confirms syntax without importing AD modules or executing a command:

```powershell
$failed = $false
Get-ChildItem .\scripts\powershell\*.ps1 | ForEach-Object {
    $tokens = $null
    $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile(
        $_.FullName,
        [ref]$tokens,
        [ref]$errors
    )
    if ($errors.Count -gt 0) {
        $failed = $true
        $errors | Format-List
    }
}
if ($failed) { throw "PowerShell parse errors found." }
```

## 5. Optional isolated AD lab

Prerequisites:

- An isolated Windows Server VM with an AD forest whose DNS root is exactly `northstar.example`.
- The ActiveDirectory PowerShell module.
- A snapshot/checkpoint before making changes.
- Authorization to modify the lab.

First review the plan:

```powershell
.\scripts\powershell\Test-LabPrerequisites.ps1
.\scripts\powershell\New-LabAdStructure.ps1
.\scripts\powershell\Import-LabUsers.ps1
```

Then preview state-changing cmdlets:

```powershell
.\scripts\powershell\New-LabAdStructure.ps1 -Execute -WhatIf
.\scripts\powershell\Import-LabUsers.ps1 -Execute -WhatIf
```

Only remove `-WhatIf` after reviewing the exact targets. Imported accounts are disabled and have no password. Use `Invoke-AccountSupport.ps1` to set a temporary password through a secure prompt and enable one lab account when needed.

## 6. Optional ServiceNow learning instance

Follow `docs/SERVICENOW_LAB_GUIDE.md`. Recreate a small representative subset before attempting all 40 records. Keep screenshots under `evidence/private/` until they pass the privacy checklist.

## 7. Customize honestly

Replace the fictional company name, cases, metrics, and evidence only after understanding the changes. If you execute a step in your own lab, describe it as hands-on lab work. If you only review the supplied simulation, describe it as a modeled workflow.
