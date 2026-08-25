#Requires -Version 5.1
<#
.SYNOPSIS
Queries or performs a guarded Tier 1 account action in the isolated lab.

.DESCRIPTION
Query is read-only and is the default. Mutating actions require -Execute, verify
the exact domain DNS root, honor -WhatIf/-Confirm, and write a secret-free local
audit event. Password reset uses a secure prompt and never writes the value.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z][a-z0-9._-]{1,19}$')]
    [string]$SamAccountName,

    [ValidateSet('Query', 'Unlock', 'ResetPassword', 'Enable', 'Disable', 'AddGroup', 'RemoveGroup')]
    [string]$Action = 'Query',

    [string]$GroupName,

    [switch]$Execute,

    [ValidateNotNullOrEmpty()]
    [string]$ExpectedDomainDnsRoot = 'northstar.example',

    [string]$AuditPath = (Join-Path $PSScriptRoot '..\..\evidence\private\ad_action_audit.jsonl')
)

$ErrorActionPreference = 'Stop'
Import-Module ActiveDirectory -ErrorAction Stop
$domain = Get-ADDomain -ErrorAction Stop
if ($domain.DNSRoot -ine $ExpectedDomainDnsRoot) {
    throw "Safety stop: connected domain '$($domain.DNSRoot)' does not exactly match '$ExpectedDomainDnsRoot'."
}

$user = Get-ADUser -Identity $SamAccountName -Properties Enabled, LockedOut, PasswordExpired, MemberOf, UserPrincipalName -ErrorAction Stop
if ($Action -eq 'Query') {
    $user | Select-Object SamAccountName, UserPrincipalName, Enabled, LockedOut, PasswordExpired, DistinguishedName, MemberOf
    return
}

if (-not $Execute) {
    throw "Action '$Action' is state-changing. Review Query output; then use -Execute -WhatIf before an authorized lab change."
}

if ($Action -in @('AddGroup', 'RemoveGroup') -and [string]::IsNullOrWhiteSpace($GroupName)) {
    throw "-GroupName is required for action '$Action'."
}

$changed = $false
switch ($Action) {
    'Unlock' {
        if ($PSCmdlet.ShouldProcess($SamAccountName, 'Unlock lab account')) {
            Unlock-ADAccount -Identity $user
            $changed = $true
        }
    }
    'ResetPassword' {
        $temporaryPassword = Read-Host 'Enter a temporary LAB password (input is hidden and will not be logged)' -AsSecureString
        if ($PSCmdlet.ShouldProcess($SamAccountName, 'Reset lab password and require change at next sign-in')) {
            Set-ADAccountPassword -Identity $user -Reset -NewPassword $temporaryPassword
            Set-ADUser -Identity $user -ChangePasswordAtLogon $true
            $changed = $true
        }
        $temporaryPassword = $null
    }
    'Enable' {
        if ($PSCmdlet.ShouldProcess($SamAccountName, 'Enable lab account')) {
            Enable-ADAccount -Identity $user
            $changed = $true
        }
    }
    'Disable' {
        if ($PSCmdlet.ShouldProcess($SamAccountName, 'Disable lab account')) {
            Disable-ADAccount -Identity $user
            $changed = $true
        }
    }
    'AddGroup' {
        $group = Get-ADGroup -Identity $GroupName -ErrorAction Stop
        if ($PSCmdlet.ShouldProcess("$SamAccountName -> $GroupName", 'Add lab group membership')) {
            Add-ADGroupMember -Identity $group -Members $user
            $changed = $true
        }
    }
    'RemoveGroup' {
        $group = Get-ADGroup -Identity $GroupName -ErrorAction Stop
        if ($PSCmdlet.ShouldProcess("$SamAccountName -> $GroupName", 'Remove lab group membership')) {
            Remove-ADGroupMember -Identity $group -Members $user -Confirm:$false
            $changed = $true
        }
    }
}

if ($changed) {
    $auditDirectory = Split-Path -Parent $AuditPath
    if ($auditDirectory -and -not (Test-Path -LiteralPath $auditDirectory)) {
        New-Item -ItemType Directory -Path $auditDirectory -Force | Out-Null
    }
    [pscustomobject]@{
        timestamp_utc  = [DateTime]::UtcNow.ToString('o')
        simulation     = $true
        domain         = $domain.DNSRoot
        operator       = [System.Environment]::UserName
        action         = $Action
        sam_account    = $SamAccountName
        group          = $GroupName
        secret_recorded = $false
    } | ConvertTo-Json -Compress | Add-Content -LiteralPath $AuditPath -Encoding UTF8
    Write-Host "Completed '$Action' in the isolated lab. A secret-free local audit event was written."
}
