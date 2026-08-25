#Requires -Version 5.1
<#
.SYNOPSIS
Runs read-only checks for the optional isolated Northstar Active Directory lab.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$checks = [System.Collections.Generic.List[object]]::new()
function Add-CheckResult {
    param([string]$Check, [bool]$Passed, [string]$Detail)
    $checks.Add([pscustomobject]@{ Check = $Check; Passed = $Passed; Detail = $Detail })
}

$isWindowsPlatform = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
Add-CheckResult -Check 'Windows host' -Passed $isWindowsPlatform -Detail ([System.Environment]::OSVersion.VersionString)
$module = Get-Module -ListAvailable -Name ActiveDirectory | Select-Object -First 1
Add-CheckResult -Check 'ActiveDirectory module' -Passed ($null -ne $module) -Detail $(if ($module) { $module.Path } else { 'Not installed' })

if ($module) {
    try {
        Import-Module (Join-Path $PSScriptRoot 'NorthstarLabGuard.psm1') -Force
        $context = Get-NorthstarLabContext
        Add-CheckResult -Check 'Fixed synthetic DNS root' -Passed $true -Detail $context.Domain.DNSRoot
        Add-CheckResult -Check 'Synthetic lab sentinel' -Passed $true -Detail $context.RootDn
        $dc = Get-ADDomainController -Discover -Writable -DomainName 'northstar.example' -ErrorAction Stop
        Add-CheckResult -Check 'Writable domain controller' -Passed $true -Detail $dc.HostName
        $dns = Resolve-DnsName -Name $dc.HostName -ErrorAction Stop | Select-Object -First 1
        Add-CheckResult -Check 'Discovered DC DNS resolution' -Passed $true -Detail $dns.Name
    }
    catch {
        Add-CheckResult -Check 'Synthetic lab discovery' -Passed $false -Detail $_.Exception.Message
    }
}

$checks | Format-Table -AutoSize
if ($checks.Passed -contains $false) {
    throw 'One or more lab prerequisites failed. No changes were attempted.'
}
Write-Host 'All read-only prerequisites passed for the sentinel-marked isolated Northstar lab.'
