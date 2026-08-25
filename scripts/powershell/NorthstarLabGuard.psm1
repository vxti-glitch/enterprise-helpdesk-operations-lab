Set-StrictMode -Version Latest

$script:NorthstarDomain = 'northstar.example'
$script:NorthstarRootOuName = 'Northstar Lab'
$script:NorthstarSentinel = 'SYNTHETIC-NORTHSTAR-PORTFOLIO-LAB-V2'
$script:NorthstarUserMarker = 'SYNTHETIC Northstar portfolio lab identity'
$script:NorthstarGroupMarker = 'SYNTHETIC Northstar portfolio lab group'

function Test-NorthstarDescendant {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$DistinguishedName,
        [Parameter(Mandatory)][string]$AncestorDn
    )

    return $DistinguishedName -ieq $AncestorDn -or $DistinguishedName.EndsWith(",$AncestorDn", [System.StringComparison]::OrdinalIgnoreCase)
}

function Resolve-NorthstarLabChildPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$CandidatePath,
        [Parameter(Mandatory)][string]$RootPath
    )

    $root = [System.IO.Path]::GetFullPath($RootPath).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $candidate = [System.IO.Path]::GetFullPath($CandidatePath)
    $relative = [System.IO.Path]::GetRelativePath($root, $candidate)
    $parentPrefix = "..$([System.IO.Path]::DirectorySeparatorChar)"
    if (
        $relative -eq '..' -or
        $relative.StartsWith($parentPrefix, [System.StringComparison]::Ordinal) -or
        [System.IO.Path]::IsPathRooted($relative)
    ) {
        throw "Safety stop: path '$CandidatePath' must remain under '$root'."
    }
    return $candidate
}

function Assert-NorthstarDomain {
    [CmdletBinding()]
    param()

    $domain = Get-ADDomain -ErrorAction Stop
    if ($domain.DNSRoot -ine $script:NorthstarDomain) {
        throw "Safety stop: connected domain '$($domain.DNSRoot)' is not the fixed '$script:NorthstarDomain' portfolio lab domain."
    }
    return $domain
}

function Get-NorthstarLabContext {
    [CmdletBinding()]
    param()

    Import-Module ActiveDirectory -ErrorAction Stop
    $domain = Assert-NorthstarDomain
    $rootDn = "OU=$script:NorthstarRootOuName,$($domain.DistinguishedName)"
    $root = Get-ADOrganizationalUnit -Identity $rootDn -Properties Description -ErrorAction Stop
    if ($root.Description -cne $script:NorthstarSentinel) {
        throw "Safety stop: '$rootDn' is not marked with the expected synthetic-lab sentinel."
    }
    [pscustomobject]@{
        Domain      = $domain
        RootDn      = $rootDn
        UsersDn     = "OU=Users,$rootDn"
        DisabledDn  = "OU=Disabled Users,$rootDn"
        GroupsDn    = "OU=Groups,$rootDn"
        Sentinel    = $script:NorthstarSentinel
        UserMarker  = $script:NorthstarUserMarker
        GroupMarker = $script:NorthstarGroupMarker
    }
}

function Assert-NorthstarLabUser {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$User,
        [Parameter(Mandatory)]$Context
    )

    if (-not (Test-NorthstarDescendant -DistinguishedName $User.DistinguishedName -AncestorDn $Context.RootDn)) {
        throw "Safety stop: user '$($User.SamAccountName)' is outside the marked Northstar Lab OU."
    }
    if ($User.DistinguishedName -match '(?i),OU=Service Accounts,') {
        throw "Safety stop: service accounts are never eligible for help-desk mutations."
    }
    if ($User.AdminCount -eq 1 -or $User.IsCriticalSystemObject -eq $true) {
        throw "Safety stop: protected or administrative object '$($User.SamAccountName)' is never eligible for mutation."
    }
    if ($User.Description -notlike "*$($Context.UserMarker)*") {
        throw "Safety stop: user '$($User.SamAccountName)' lacks the required synthetic identity marker."
    }
    return $User
}

function Get-NorthstarLabUser {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$SamAccountName,
        [Parameter(Mandatory)]$Context
    )

    $user = Get-ADUser -Identity $SamAccountName -Properties Enabled, LockedOut, PasswordExpired, MemberOf, UserPrincipalName, Description, AdminCount, IsCriticalSystemObject, Manager -ErrorAction Stop
    return Assert-NorthstarLabUser -User $user -Context $Context
}

function Assert-NorthstarLabGroup {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Group,
        [Parameter(Mandatory)]$Context,
        [Parameter(Mandatory)][string[]]$AllowedGroupNames
    )

    if ($AllowedGroupNames -notcontains $Group.SamAccountName) {
        throw "Safety stop: group '$($Group.SamAccountName)' is not in the explicit synthetic-lab allowlist."
    }
    if (-not (Test-NorthstarDescendant -DistinguishedName $Group.DistinguishedName -AncestorDn $Context.GroupsDn)) {
        throw "Safety stop: group '$($Group.SamAccountName)' is outside the marked lab Groups OU."
    }
    if ($Group.AdminCount -eq 1 -or $Group.IsCriticalSystemObject -eq $true) {
        throw "Safety stop: protected or administrative group '$($Group.SamAccountName)' is never eligible for mutation."
    }
    if ($Group.Description -notlike "*$($Context.GroupMarker)*") {
        throw "Safety stop: group '$($Group.SamAccountName)' lacks the required synthetic group marker."
    }
    return $Group
}

function Get-NorthstarLabGroup {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$GroupName,
        [Parameter(Mandatory)]$Context,
        [Parameter(Mandatory)][string[]]$AllowedGroupNames
    )

    $group = Get-ADGroup -Identity $GroupName -Properties Description, AdminCount, IsCriticalSystemObject, Members -ErrorAction Stop
    return Assert-NorthstarLabGroup -Group $group -Context $Context -AllowedGroupNames $AllowedGroupNames
}

function Write-NorthstarLabAudit {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$AuditPath,
        [Parameter(Mandatory)]$Context,
        [Parameter(Mandatory)][ValidatePattern('^(?:INC|REQ)\d{3}$')][string]$TicketId,
        [Parameter(Mandatory)][string]$Action,
        [Parameter(Mandatory)][string]$Outcome,
        [Parameter(Mandatory)][string]$SamAccountName,
        [string]$GroupName,
        [string]$Detail
    )

    $auditFile = [System.IO.Path]::GetFullPath($AuditPath)
    $auditDirectory = Split-Path -Parent $auditFile
    if ($auditDirectory -and -not (Test-Path -LiteralPath $auditDirectory)) {
        New-Item -ItemType Directory -Path $auditDirectory -Force | Out-Null
    }
    [pscustomobject]@{
        timestamp_utc   = [DateTime]::UtcNow.ToString('o')
        simulation      = $true
        domain          = $Context.Domain.DNSRoot
        ticket_id       = $TicketId
        operator        = [System.Environment]::UserName
        action          = $Action
        outcome         = $Outcome
        sam_account     = $SamAccountName
        group           = $GroupName
        detail          = $Detail
        secret_recorded = $false
    } | ConvertTo-Json -Compress | Add-Content -LiteralPath $auditFile -Encoding UTF8
}

Export-ModuleMember -Function Assert-NorthstarDomain, Get-NorthstarLabContext, Assert-NorthstarLabUser, Get-NorthstarLabUser, Assert-NorthstarLabGroup, Get-NorthstarLabGroup, Write-NorthstarLabAudit, Test-NorthstarDescendant, Resolve-NorthstarLabChildPath
