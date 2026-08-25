#Requires -Version 5.1
<#
.SYNOPSIS
Plans or creates the Northstar OU and security-group structure.

.DESCRIPTION
Without -Execute, prints a deterministic plan and does not import the AD module.
With -Execute, requires an exact domain DNS root of northstar.example and honors
-WhatIf/-Confirm through SupportsShouldProcess. Existing objects are skipped.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [switch]$Execute,

    [ValidateNotNullOrEmpty()]
    [string]$ExpectedDomainDnsRoot = 'northstar.example',

    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$GroupsCsvPath = (Join-Path $PSScriptRoot '..\..\data\groups.csv')
)

$ErrorActionPreference = 'Stop'
$departmentOus = @('Finance', 'HR', 'Sales', 'Operations', 'Engineering', 'Management')
$controlOus = @('Disabled Users', 'Service Accounts', 'Workstations', 'Groups')
$groups = Import-Csv -LiteralPath $GroupsCsvPath

if (-not $Execute) {
    [pscustomobject]@{
        Mode                  = 'PLAN ONLY - no changes'
        ExpectedDomainDnsRoot = $ExpectedDomainDnsRoot
        RootOu                = 'Northstar Lab'
        ChildOus              = ($departmentOus + $controlOus) -join ', '
        Groups                = ($groups.group_name) -join ', '
        NextStep              = 'Review; then use -Execute -WhatIf on an isolated lab domain.'
    } | Format-List
    return
}

Import-Module ActiveDirectory -ErrorAction Stop
$domain = Get-ADDomain -ErrorAction Stop
if ($domain.DNSRoot -ine $ExpectedDomainDnsRoot) {
    throw "Safety stop: connected domain '$($domain.DNSRoot)' does not exactly match '$ExpectedDomainDnsRoot'."
}

$rootDn = "OU=Northstar Lab,$($domain.DistinguishedName)"
$groupsDn = "OU=Groups,$rootDn"

function Test-AdObjectExists {
    param([string]$Identity)
    try {
        $null = Get-ADObject -Identity $Identity -ErrorAction Stop
        return $true
    }
    catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
        return $false
    }
}

if (-not (Test-AdObjectExists -Identity $rootDn)) {
    if ($PSCmdlet.ShouldProcess($rootDn, 'Create lab root organizational unit')) {
        New-ADOrganizationalUnit -Name 'Northstar Lab' -Path $domain.DistinguishedName `
            -ProtectedFromAccidentalDeletion $true
    }
}

foreach ($ouName in ($departmentOus + $controlOus)) {
    $ouDn = "OU=$ouName,$rootDn"
    if (-not (Test-AdObjectExists -Identity $ouDn)) {
        if ($PSCmdlet.ShouldProcess($ouDn, 'Create lab organizational unit')) {
            New-ADOrganizationalUnit -Name $ouName -Path $rootDn `
                -ProtectedFromAccidentalDeletion $true
        }
    }
}

foreach ($group in $groups) {
    $existing = Get-ADGroup -Filter "SamAccountName -eq '$($group.group_name)'" -ErrorAction Stop
    if ($null -eq $existing) {
        if ($PSCmdlet.ShouldProcess($group.group_name, "Create global security group in $groupsDn")) {
            New-ADGroup -Name $group.group_name -SamAccountName $group.group_name `
                -GroupScope Global -GroupCategory Security -Path $groupsDn `
                -Description $group.description
        }
    }
}

Write-Host 'Northstar lab AD structure processing completed. Review WhatIf output or query AD to validate.'
