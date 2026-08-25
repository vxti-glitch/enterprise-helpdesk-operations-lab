#Requires -Version 5.1
<#
.SYNOPSIS
Plans or creates the marked Northstar portfolio-lab OU and group structure.

.DESCRIPTION
The default mode is a read-only plan. Execution is fixed to northstar.example,
creates a sentinel-marked root OU, and labels every created group synthetic.
No parameter can retarget this script to another domain.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [switch]$Execute,

    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$GroupsCsvPath = (Join-Path $PSScriptRoot '..\..\data\ad_groups.csv')
)

$ErrorActionPreference = 'Stop'
$modulePath = Join-Path $PSScriptRoot 'NorthstarLabGuard.psm1'
$departmentOus = @('Finance', 'HR', 'Sales', 'Operations', 'Engineering', 'Management')
$controlOus = @('Disabled Users', 'Service Accounts', 'Workstations', 'Groups', 'Users')
$groups = Import-Csv -LiteralPath $GroupsCsvPath

if (-not $Execute) {
    [pscustomobject]@{
        Mode         = 'PLAN ONLY - no AD module import and no changes'
        Domain       = 'northstar.example (fixed)'
        RootOu       = 'OU=Northstar Lab with required synthetic sentinel'
        ChildOus     = ($controlOus -join ', ')
        UserOus      = ($departmentOus -join ', ')
        AllowedGroups = ($groups.group_name -join ', ')
        NextStep     = 'Review; then use -Execute -WhatIf in an isolated lab.'
    } | Format-List
    return
}

Import-Module $modulePath -Force
$domain = Assert-NorthstarDomain
$rootDn = "OU=Northstar Lab,$($domain.DistinguishedName)"
$rootSentinel = 'SYNTHETIC-NORTHSTAR-PORTFOLIO-LAB-V2'
$usersDn = "OU=Users,$rootDn"
$groupsDn = "OU=Groups,$rootDn"

function Test-AdObjectExists {
    param([Parameter(Mandatory)][string]$Identity)
    try {
        $null = Get-ADObject -Identity $Identity -ErrorAction Stop
        return $true
    }
    catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
        return $false
    }
}

if (-not (Test-AdObjectExists -Identity $rootDn)) {
    if ($PSCmdlet.ShouldProcess($rootDn, 'Create sentinel-marked portfolio lab root OU')) {
        New-ADOrganizationalUnit -Name 'Northstar Lab' -Path $domain.DistinguishedName -Description $rootSentinel -ProtectedFromAccidentalDeletion $true
    }
}
else {
    $existingRoot = Get-ADOrganizationalUnit -Identity $rootDn -Properties Description -ErrorAction Stop
    if ($existingRoot.Description -cne $rootSentinel) {
        throw "Safety stop: existing '$rootDn' is not marked with the required synthetic-lab sentinel."
    }
}

foreach ($ouName in $controlOus) {
    $ouDn = "OU=$ouName,$rootDn"
    if (-not (Test-AdObjectExists -Identity $ouDn)) {
        if ($PSCmdlet.ShouldProcess($ouDn, 'Create protected portfolio lab OU')) {
            New-ADOrganizationalUnit -Name $ouName -Path $rootDn -ProtectedFromAccidentalDeletion $true
        }
    }
}

foreach ($department in $departmentOus) {
    $departmentDn = "OU=$department,$usersDn"
    if (-not (Test-AdObjectExists -Identity $departmentDn)) {
        if ($PSCmdlet.ShouldProcess($departmentDn, 'Create protected synthetic user department OU')) {
            New-ADOrganizationalUnit -Name $department -Path $usersDn -ProtectedFromAccidentalDeletion $true
        }
    }
}

foreach ($group in $groups) {
    $existing = Get-ADGroup -Filter "SamAccountName -eq '$($group.group_name)'" -Properties Description, DistinguishedName -ErrorAction Stop
    if ($null -eq $existing) {
        if ($PSCmdlet.ShouldProcess($group.group_name, "Create allowlisted synthetic group in $groupsDn")) {
            New-ADGroup -Name $group.group_name -SamAccountName $group.group_name -GroupScope Global -GroupCategory Security -Path $groupsDn -Description "SYNTHETIC Northstar portfolio lab group; $($group.description)"
        }
    }
    elseif (-not (Test-NorthstarDescendant -DistinguishedName $existing.DistinguishedName -AncestorDn $groupsDn)) {
        throw "Safety stop: matching group '$($group.group_name)' exists outside the marked lab Groups OU."
    }
}

Write-Host 'Northstar portfolio-lab structure processing completed. Review WhatIf output or query the marked OU before any user import.'
