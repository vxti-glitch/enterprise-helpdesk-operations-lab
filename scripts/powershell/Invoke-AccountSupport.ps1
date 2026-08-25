#Requires -Version 5.1
<#
.SYNOPSIS
Queries or performs a tightly guarded Tier 1 account action in the isolated lab.

.DESCRIPTION
Query is read-only. Every mutation requires -Execute, a synthetic INC/REQ ID,
the fixed northstar.example domain, a sentinel-marked OU, a marked synthetic
user, and (for membership changes) an explicitly allowlisted marked group.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z][a-z0-9._-]{1,19}$')]
    [string]$SamAccountName,

    [ValidateSet('Query', 'Unlock', 'ResetPassword', 'Enable', 'Disable', 'AddGroup', 'RemoveGroup')]
    [string]$Action = 'Query',

    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._ -]{0,63}$')]
    [string]$GroupName,

    [ValidatePattern('^(?:INC|REQ)\d{3}$')]
    [string]$TicketId,

    [switch]$Execute,

    [string]$AuditPath = (Join-Path $PSScriptRoot '..\..\evidence\private\ad_action_audit.jsonl')
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'NorthstarLabGuard.psm1') -Force
$context = Get-NorthstarLabContext
$user = Get-NorthstarLabUser -SamAccountName $SamAccountName -Context $context

if ($Action -eq 'Query') {
    $user | Select-Object SamAccountName, UserPrincipalName, Enabled, LockedOut, PasswordExpired, DistinguishedName, MemberOf, Description
    return
}

if (-not $Execute) {
    throw "Action '$Action' is state-changing. Review Query output; then use -Execute -TicketId INC### or REQ### -WhatIf before an authorized synthetic lab change."
}
if ([string]::IsNullOrWhiteSpace($TicketId)) {
    throw "Action '$Action' requires a synthetic -TicketId such as INC012 or REQ001."
}
if ($Action -in @('AddGroup', 'RemoveGroup') -and [string]::IsNullOrWhiteSpace($GroupName)) {
    throw "-GroupName is required for action '$Action'."
}

$privateEvidenceRoot = Join-Path $PSScriptRoot '..\..\evidence\private'
$fullAuditPath = Resolve-NorthstarLabChildPath -CandidatePath $AuditPath -RootPath $privateEvidenceRoot

$allowedGroupNames = @(
    Import-Csv -LiteralPath (Join-Path $PSScriptRoot '..\..\data\ad_groups.csv') | ForEach-Object {
        if ([string]::IsNullOrWhiteSpace($_.group_name) -or $_.group_name -notmatch '^[A-Za-z0-9][A-Za-z0-9._ -]{0,63}$') {
            throw "Safety stop: ad_groups.csv contains an invalid lab group name '$($_.group_name)'."
        }
        $_.group_name
    }
)
$group = $null
if ($Action -in @('AddGroup', 'RemoveGroup')) {
    $group = Get-NorthstarLabGroup -GroupName $GroupName -Context $context -AllowedGroupNames $allowedGroupNames
}

$target = if ($group) { "$SamAccountName -> $GroupName" } else { $SamAccountName }
$operation = switch ($Action) {
    'Unlock' { 'Unlock marked synthetic lab account' }
    'ResetPassword' { 'Reset marked synthetic lab password and require change at next sign-in' }
    'Enable' { 'Enable marked synthetic lab account' }
    'Disable' { 'Disable marked synthetic lab account' }
    'AddGroup' { 'Add marked synthetic user to allowlisted lab group' }
    'RemoveGroup' { 'Remove marked synthetic user from allowlisted lab group' }
}

if (-not $PSCmdlet.ShouldProcess($target, $operation)) {
    [pscustomobject]@{ simulation = $true; ticket_id = $TicketId; action = $Action; outcome = 'Planned'; target = $target; state_changed = $false; secret_recorded = $false }
    return
}

$outcome = 'Succeeded'
$detail = ''
$changed = $false
try {
    switch ($Action) {
        'Unlock' {
            if ($user.LockedOut) { Unlock-ADAccount -Identity $user; $changed = $true; $detail = 'Unlocked marked synthetic account.' }
            else { $outcome = 'NotNeeded'; $detail = 'Account was not locked.' }
        }
        'ResetPassword' {
            $temporaryPassword = Read-Host 'Enter a temporary LAB password (hidden and never logged)' -AsSecureString
            try {
                Set-ADAccountPassword -Identity $user -Reset -NewPassword $temporaryPassword
                try {
                    Set-ADUser -Identity $user -ChangePasswordAtLogon $true
                    $changed = $true; $detail = 'Password reset and change-at-logon flag applied; secret was not recorded.'
                }
                catch {
                    $outcome = 'Partial'; $detail = 'Password reset completed but change-at-logon failed; review the marked lab account manually.'
                    Write-NorthstarLabAudit -AuditPath $fullAuditPath -Context $context -TicketId $TicketId -Action $Action -Outcome $outcome -SamAccountName $SamAccountName -GroupName $GroupName -Detail $detail
                    throw
                }
            }
            finally { $temporaryPassword = $null }
        }
        'Enable' {
            if (-not $user.Enabled) { Enable-ADAccount -Identity $user; $changed = $true; $detail = 'Enabled marked synthetic account.' }
            else { $outcome = 'NotNeeded'; $detail = 'Account was already enabled.' }
        }
        'Disable' {
            if ($user.Enabled) { Disable-ADAccount -Identity $user; $changed = $true; $detail = 'Disabled marked synthetic account.' }
            else { $outcome = 'NotNeeded'; $detail = 'Account was already disabled.' }
        }
        'AddGroup' {
            if ($user.MemberOf -contains $group.DistinguishedName) { $outcome = 'NotNeeded'; $detail = 'Membership already present.' }
            else { Add-ADGroupMember -Identity $group -Members $user; $changed = $true; $detail = 'Added marked user to allowlisted marked group.' }
        }
        'RemoveGroup' {
            if ($user.MemberOf -notcontains $group.DistinguishedName) { $outcome = 'NotNeeded'; $detail = 'Membership was not present.' }
            else { Remove-ADGroupMember -Identity $group -Members $user -Confirm:$false; $changed = $true; $detail = 'Removed marked user from allowlisted marked group.' }
        }
    }
    $postCheck = Get-NorthstarLabUser -SamAccountName $SamAccountName -Context $context
    Write-NorthstarLabAudit -AuditPath $fullAuditPath -Context $context -TicketId $TicketId -Action $Action -Outcome $outcome -SamAccountName $SamAccountName -GroupName $GroupName -Detail $detail
    [pscustomobject]@{ simulation = $true; ticket_id = $TicketId; action = $Action; outcome = $outcome; target = $target; state_changed = $changed; secret_recorded = $false; post_check_dn = $postCheck.DistinguishedName; detail = $detail }
}
catch {
    if ($outcome -ne 'Partial') {
        $failureDetail = if ($detail) { "$detail Failure: $($_.Exception.Message)" } else { $_.Exception.Message }
        Write-NorthstarLabAudit -AuditPath $fullAuditPath -Context $context -TicketId $TicketId -Action $Action -Outcome 'Failed' -SamAccountName $SamAccountName -GroupName $GroupName -Detail $failureDetail
    }
    throw
}
