#Requires -Version 5.1
<#
.SYNOPSIS
Plans or imports the synthetic Northstar users as disabled AD accounts.

.DESCRIPTION
Default mode prints the plan. -Execute requires the exact isolated lab domain,
supports -WhatIf, creates accounts disabled with no password, and makes a second
pass for manager relationships. No credential is generated, printed, or logged.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [switch]$Execute,

    [ValidateNotNullOrEmpty()]
    [string]$ExpectedDomainDnsRoot = 'northstar.example',

    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$UsersCsvPath = (Join-Path $PSScriptRoot '..\..\data\users.csv')
)

$ErrorActionPreference = 'Stop'
$users = Import-Csv -LiteralPath $UsersCsvPath

if (-not $Execute) {
    $users | Select-Object display_name, sam_account_name, department, employment_status, user_principal_name | Format-Table -AutoSize
    Write-Host 'PLAN ONLY: no AD module was imported and no changes were attempted.'
    Write-Host 'Next step: use -Execute -WhatIf on the exact northstar.example lab domain.'
    return
}

Import-Module ActiveDirectory -ErrorAction Stop
$domain = Get-ADDomain -ErrorAction Stop
if ($domain.DNSRoot -ine $ExpectedDomainDnsRoot) {
    throw "Safety stop: connected domain '$($domain.DNSRoot)' does not exactly match '$ExpectedDomainDnsRoot'."
}

$rootDn = "OU=Northstar Lab,$($domain.DistinguishedName)"
if (-not (Get-ADOrganizationalUnit -Identity $rootDn -ErrorAction Stop)) {
    throw "Required lab OU '$rootDn' was not found. Run New-LabAdStructure.ps1 first."
}

foreach ($user in $users) {
    $existing = Get-ADUser -Filter "SamAccountName -eq '$($user.sam_account_name)'" -ErrorAction Stop
    if ($null -ne $existing) {
        Write-Verbose "Skipping existing account $($user.sam_account_name)."
        continue
    }

    $targetOu = if ($user.employment_status -eq 'Inactive') {
        "OU=Disabled Users,$rootDn"
    }
    else {
        "OU=$($user.department),$rootDn"
    }

    if ($PSCmdlet.ShouldProcess($user.sam_account_name, "Create disabled synthetic user in $targetOu")) {
        New-ADUser -Name $user.display_name `
            -GivenName $user.given_name `
            -Surname $user.surname `
            -DisplayName $user.display_name `
            -SamAccountName $user.sam_account_name `
            -UserPrincipalName $user.user_principal_name `
            -Department $user.department `
            -Title $user.title `
            -Path $targetOu `
            -Enabled $false `
            -Description 'SYNTHETIC Northstar portfolio lab identity'
    }
}

foreach ($user in $users | Where-Object { $_.manager_email }) {
    $employee = Get-ADUser -Filter "SamAccountName -eq '$($user.sam_account_name)'" -ErrorAction SilentlyContinue
    $manager = Get-ADUser -Filter "UserPrincipalName -eq '$($user.manager_email)'" -ErrorAction SilentlyContinue
    if ($employee -and $manager -and $employee.Manager -ne $manager.DistinguishedName) {
        if ($PSCmdlet.ShouldProcess($employee.SamAccountName, "Set manager to $($manager.SamAccountName)")) {
            Set-ADUser -Identity $employee -Manager $manager
        }
    }
}

Write-Host 'Synthetic user import processing completed. Accounts remain disabled and have no password.'
