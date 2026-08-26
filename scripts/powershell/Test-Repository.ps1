#Requires -Version 5.1
<#
.SYNOPSIS
Runs all local, non-destructive repository quality checks.
#>
[CmdletBinding()]
param(
    [string]$PythonCommand = 'python',
    [switch]$SkipPester
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Push-Location $repoRoot
try {
    & $PythonCommand 'tools\labtool.py' validate --strict-baseline
    if ($LASTEXITCODE -ne 0) {
        throw 'Lab data validation failed.'
    }

    & $PythonCommand -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) {
        throw 'Python unit tests failed.'
    }

    $parseFailed = $false
    Get-ChildItem -Path (Join-Path $repoRoot 'scripts\powershell\*') -Include '*.ps1', '*.psm1' -File | ForEach-Object {
        $tokens = $null
        $parseErrors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile(
            $_.FullName,
            [ref]$tokens,
            [ref]$parseErrors
        )
        if ($parseErrors.Count -gt 0) {
            $parseFailed = $true
            $parseErrors | ForEach-Object { Write-Error "$($_.Extent.File): $($_.Message)" }
        }
    }
    if ($parseFailed) {
        throw 'PowerShell parser validation failed.'
    }

    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($null -eq $node) {
        throw 'Node.js is required for the static-console unit test. Install Node.js 20+ or run the Python-only checks manually.'
    }
    & $node.Source '--test' 'web\filters.test.mjs'
    if ($LASTEXITCODE -ne 0) {
        throw 'JavaScript filter and routing tests failed.'
    }

    if (-not $SkipPester) {
        $pester = Get-Module -ListAvailable -Name Pester | Sort-Object Version -Descending | Select-Object -First 1
        if ($null -eq $pester) {
            throw 'Pester is required for PowerShell safety tests. Install Pester or use -SkipPester only for a limited local syntax check.'
        }
        Import-Module $pester.Path -Force
        $pesterResult = Invoke-Pester -Path (Join-Path $repoRoot 'tests\powershell\NorthstarLabGuard.Tests.ps1') -PassThru
        if ($pesterResult.FailedCount -gt 0) {
            throw 'PowerShell safety tests failed.'
        }
    }

    $scriptAnalyzer = Get-Module -ListAvailable -Name PSScriptAnalyzer | Sort-Object Version -Descending | Select-Object -First 1
    if ($scriptAnalyzer) {
        Import-Module $scriptAnalyzer.Path -Force
        $analysis = Invoke-ScriptAnalyzer -Path (Join-Path $repoRoot 'scripts\powershell') -Recurse -Severity Error
        if ($analysis) {
            $analysis | Format-Table -AutoSize | Out-String | Write-Error
            throw 'PSScriptAnalyzer reported error-severity findings.'
        }
    }
    else {
        Write-Warning 'PSScriptAnalyzer is not installed; parser and Pester checks were completed, but analyzer rules were skipped locally.'
    }

    Write-Host 'All repository checks passed.'
}
finally {
    Pop-Location
}
