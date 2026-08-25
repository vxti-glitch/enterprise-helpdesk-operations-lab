# Optional Active Directory lab

This section turns the documented identity cases into hands-on practice. It is optional; the committed repository does not claim these commands were executed.

## Safety boundary

Use an isolated virtual network and disposable Windows Server/client VMs. Take a checkpoint before promotion and before bulk changes. Do not connect the lab to an employer domain, production tenant, or network you do not administer.

The reserved DNS root is fixed to `northstar.example`; the scripts reject every other connected domain and require `OU=Northstar Lab` to carry the sentinel `SYNTHETIC-NORTHSTAR-PORTFOLIO-LAB-V2` before a mutation is possible.

## Build outline

1. Create one Windows Server evaluation VM and one Windows 11 evaluation VM.
2. Assign the server a stable private lab address and use it as the client's lab DNS server.
3. Install AD DS and DNS through Server Manager or the approved PowerShell path.
4. Create a new forest named `northstar.example` and use `NORTHSTAR` as the NetBIOS name.
5. Restart, sign in with the lab administrator, and take a new checkpoint.
6. Run `Test-LabPrerequisites.ps1`.
7. Run `New-LabAdStructure.ps1` in plan mode, then `-Execute -WhatIf`, then authorized execution.
8. Run `Import-LabUsers.ps1` through the same plan/WhatIf/execution sequence.
9. Query an account with `Invoke-AccountSupport.ps1`; reset and enable only the one synthetic identity needed for a case.
10. Join the Windows 11 VM to the lab domain and validate DNS, sign-in, and group-dependent access.

## Example forest commands

These commands are intentionally not wrapped in an automatic script because promotion changes the VM role and requires an explicit operator decision.

```powershell
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
Install-ADDSForest `
  -DomainName 'northstar.example' `
  -DomainNetbiosName 'NORTHSTAR' `
  -InstallDns
```

Run them only inside the disposable server VM after reviewing Microsoft's prompts and supplying the Directory Services Restore Mode password privately.

## Hands-on exercises

| Exercise | Related record | Success evidence |
|---|---|---|
| Query and unlock a synthetic account | INC002 | Before/after account state without passwords |
| Reset a password securely | INC001 | `-WhatIf` plus change-at-next-sign-in state |
| Apply an approved department group | INC003 | Membership comparison and share validation |
| Stage Jordan Kim's identity | REQ001 | Disabled import; approved OU and manager relationship |
| Disable and move Lucas Reed | REQ002 | Effective-time note; disabled state; group reconciliation |
| Test DNS from the client | INC012 | Adapter DNS; lookup failure; approved correction; validation |

## Evidence rules

Capture only the Northstar lab. Hide administrator names, VM host details, real local usernames, and hypervisor metadata. A screenshot of a result should include a short manifest explaining what it proves and what was redacted.

## Cleanup

Prefer reverting the VM checkpoint. If retaining the lab, power it off when unused, keep it isolated, and record the state. Do not reuse lab passwords anywhere else.
