#Requires -Version 5.1
<#
.SYNOPSIS
Runs read-only checks for the optional Northstar Active Directory lab.

.DESCRIPTION
This script changes nothing. It verifies Windows, the ActiveDirectory module,
domain discovery, the exact reserved lab DNS root, a writable domain controller,
and DNS resolution. It refuses to describe another domain as the target lab.
#>
[CmdletBinding()]
param(
    [ValidateNotNullOrEmpty()]
    [string]$ExpectedDomainDnsRoot = 'northstar.example'
)

$ErrorActionPreference = 'Stop'
$checks = [System.Collections.Generic.List[object]]::new()

function Add-CheckResult {
    param(
        [string]$Check,
        [bool]$Passed,
        [string]$Detail
    )
    $checks.Add([pscustomobject]@{
            Check  = $Check
            Passed = $Passed
            Detail = $Detail
        })
}

$isWindowsPlatform = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
Add-CheckResult -Check 'Windows host' -Passed $isWindowsPlatform -Detail ([System.Environment]::OSVersion.VersionString)

$module = Get-Module -ListAvailable -Name ActiveDirectory | Select-Object -First 1
Add-CheckResult -Check 'ActiveDirectory module' -Passed ($null -ne $module) -Detail $(
    if ($module) { $module.Path } else { 'Not installed' }
)

if ($null -ne $module) {
    try {
        Import-Module ActiveDirectory -ErrorAction Stop
        $domain = Get-ADDomain -ErrorAction Stop
        $matches = $domain.DNSRoot -ieq $ExpectedDomainDnsRoot
        Add-CheckResult -Check 'Exact lab DNS root' -Passed $matches -Detail $domain.DNSRoot
        if ($matches) {
            $dc = Get-ADDomainController -Discover -Writable -DomainName $ExpectedDomainDnsRoot -ErrorAction Stop
            Add-CheckResult -Check 'Writable domain controller' -Passed $true -Detail $dc.HostName
            $dns = Resolve-DnsName -Name $ExpectedDomainDnsRoot -ErrorAction Stop | Select-Object -First 1
            Add-CheckResult -Check 'Lab DNS resolution' -Passed $true -Detail ($dns.Name)
        }
    }
    catch {
        Add-CheckResult -Check 'Domain discovery' -Passed $false -Detail $_.Exception.Message
    }
}

$checks | Format-Table -AutoSize
if ($checks.Passed -contains $false) {
    throw 'One or more lab prerequisites failed. No changes were attempted.'
}

Write-Host 'All read-only prerequisite checks passed for the isolated Northstar lab.'
