#Requires -Version 5.1
<#
.SYNOPSIS
Plans or imports disabled synthetic users into the marked Northstar lab only.

.DESCRIPTION
No password is generated. Execution requires the sentinel-marked Northstar Lab
OU, creates disabled identities with a synthetic marker, and refuses to reuse a
matching account outside the lab boundary.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [switch]$Execute,

    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$UsersCsvPath = (Join-Path $PSScriptRoot '..\..\data\users.csv')
)

$ErrorActionPreference = 'Stop'
$users = Import-Csv -LiteralPath $UsersCsvPath

if (-not $Execute) {
    $users | Select-Object user_id, display_name, sam_account_name, department, employment_status, user_principal_name | Format-Table -AutoSize
    Write-Host 'PLAN ONLY: no Active Directory module was imported and no changes were attempted.'
    Write-Host 'Next step: use -Execute -WhatIf only after building the sentinel-marked northstar.example lab.'
    return
}

Import-Module (Join-Path $PSScriptRoot 'NorthstarLabGuard.psm1') -Force
$context = Get-NorthstarLabContext

foreach ($user in $users) {
    $targetOu = if ($user.employment_status -eq 'Inactive') { $context.DisabledDn } else { "OU=$($user.department),$($context.UsersDn)" }
    $existing = @(Get-ADUser -Filter "SamAccountName -eq '$($user.sam_account_name)'" -Properties Description, AdminCount, IsCriticalSystemObject, Manager -ErrorAction Stop)
    if ($existing.Count -gt 1) {
        throw "Safety stop: more than one AD object matched '$($user.sam_account_name)'."
    }
    if ($existing.Count -eq 1) {
        $null = Assert-NorthstarLabUser -User $existing[0] -Context $context
        Write-Verbose "Synthetic lab user '$($user.sam_account_name)' already exists; no duplicate will be created."
        continue
    }
    if ($PSCmdlet.ShouldProcess($user.sam_account_name, "Create disabled synthetic user in $targetOu")) {
        New-ADUser -Name $user.display_name -GivenName $user.given_name -Surname $user.surname -DisplayName $user.display_name -SamAccountName $user.sam_account_name -UserPrincipalName $user.user_principal_name -Department $user.department -Title $user.title -Path $targetOu -Enabled $false -Description "SYNTHETIC Northstar portfolio lab identity; user_id=$($user.user_id)"
    }
}

if ($WhatIfPreference) {
    Write-Host 'WHATIF COMPLETE: manager relationships were not evaluated because the synthetic users were not created.'
    return
}

foreach ($user in ($users | Where-Object { $_.manager_email })) {
    $employee = Get-NorthstarLabUser -SamAccountName $user.sam_account_name -Context $context
    $managerMatches = @(Get-ADUser -Filter "UserPrincipalName -eq '$($user.manager_email)'" -Properties Description, AdminCount, IsCriticalSystemObject, Manager -ErrorAction Stop)
    if ($managerMatches.Count -ne 1) {
        throw "Safety stop: manager lookup for '$($user.manager_email)' did not return exactly one synthetic lab identity."
    }
    $manager = Assert-NorthstarLabUser -User $managerMatches[0] -Context $context
    if ($employee.Manager -ne $manager.DistinguishedName) {
        if ($PSCmdlet.ShouldProcess($employee.SamAccountName, "Set synthetic lab manager to $($manager.SamAccountName)")) {
            Set-ADUser -Identity $employee -Manager $manager
        }
    }
}

Write-Host 'Synthetic user import completed. Accounts remain disabled and no password was generated, displayed, or logged.'
