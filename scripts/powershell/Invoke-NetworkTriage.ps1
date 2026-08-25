#Requires -Version 5.1
<#
.SYNOPSIS
Collects read-only network troubleshooting evidence from a Windows endpoint.

.DESCRIPTION
Captures adapter/IP configuration, default routes, DNS resolution, ICMP reachability,
and one TCP-port test. It changes no network settings. Output is designed to be
sanitized before it is added to a public portfolio.
#>
[CmdletBinding()]
param(
    [ValidateNotNullOrEmpty()]
    [string]$TargetHost = 'example.com',

    [ValidateRange(1, 65535)]
    [int]$TcpPort = 443,

    [string]$OutputPath
)

$ErrorActionPreference = 'Continue'
$capturedAt = [DateTime]::UtcNow.ToString('o')

$ipConfiguration = Get-NetIPConfiguration -ErrorAction SilentlyContinue | ForEach-Object {
    [pscustomobject]@{
        interface_alias = $_.InterfaceAlias
        interface_index = $_.InterfaceIndex
        ipv4_addresses  = @($_.IPv4Address.IPAddress)
        ipv4_gateway    = @($_.IPv4DefaultGateway.NextHop)
        dns_servers     = @($_.DNSServer.ServerAddresses)
    }
}

$defaultRoutes = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric |
    Select-Object InterfaceAlias, NextHop, RouteMetric, State

$dnsAnswers = @()
$dnsError = $null
try {
    $dnsAnswers = Resolve-DnsName -Name $TargetHost -ErrorAction Stop |
        Select-Object Name, Type, IPAddress, NameHost
}
catch {
    $dnsError = $_.Exception.Message
}

$icmpSucceeded = Test-Connection -ComputerName $TargetHost -Count 2 -Quiet -ErrorAction SilentlyContinue
$tcpResult = Test-NetConnection -ComputerName $TargetHost -Port $TcpPort -InformationLevel Detailed -WarningAction SilentlyContinue

$result = [ordered]@{
    label                    = 'LAB-EXECUTED READ-ONLY OUTPUT - REVIEW BEFORE PUBLISHING'
    captured_at_utc          = $capturedAt
    computer_name            = [System.Environment]::MachineName
    target_host              = $TargetHost
    tcp_port                 = $TcpPort
    ip_configuration         = @($ipConfiguration)
    default_routes           = @($defaultRoutes)
    dns_answers              = @($dnsAnswers)
    dns_error                = $dnsError
    icmp_succeeded           = [bool]$icmpSucceeded
    tcp_succeeded            = [bool]$tcpResult.TcpTestSucceeded
    remote_address           = [string]$tcpResult.RemoteAddress
    source_address           = [string]$tcpResult.SourceAddress
    state_changes_attempted  = $false
}

$json = $result | ConvertTo-Json -Depth 6
$json

if ($OutputPath) {
    $parent = Split-Path -Parent $OutputPath
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $json | Set-Content -LiteralPath $OutputPath -Encoding UTF8
    Write-Host "Read-only evidence written to '$OutputPath'. Review it for real identifiers before publishing."
}
