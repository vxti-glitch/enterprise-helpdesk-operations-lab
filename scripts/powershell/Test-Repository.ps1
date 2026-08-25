#Requires -Version 5.1
<#
.SYNOPSIS
Runs all local, non-destructive repository quality checks.
#>
[CmdletBinding()]
param(
    [string]$PythonCommand = 'python'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Push-Location $repoRoot
try {
    & $PythonCommand 'tools\labtool.py' validate
    if ($LASTEXITCODE -ne 0) {
        throw 'Lab data validation failed.'
    }

    & $PythonCommand -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) {
        throw 'Python unit tests failed.'
    }

    $parseFailed = $false
    Get-ChildItem -LiteralPath (Join-Path $repoRoot 'scripts\powershell') -Filter '*.ps1' | ForEach-Object {
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

    Write-Host 'All repository checks passed.'
}
finally {
    Pop-Location
}
