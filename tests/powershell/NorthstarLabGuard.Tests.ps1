$modulePath = Join-Path $PSScriptRoot '..\..\scripts\powershell\NorthstarLabGuard.psm1'
Import-Module $modulePath -Force

Describe 'NorthstarLabGuard containment' {
    BeforeEach {
        $script:Context = [pscustomobject]@{
            RootDn      = 'OU=Northstar Lab,DC=northstar,DC=example'
            GroupsDn    = 'OU=Groups,OU=Northstar Lab,DC=northstar,DC=example'
            UserMarker  = 'SYNTHETIC Northstar portfolio lab identity'
            GroupMarker = 'SYNTHETIC Northstar portfolio lab group'
        }
    }

    It 'accepts a marked synthetic user under the marked lab OU' {
        $user = [pscustomobject]@{
            SamAccountName = 'mchen'
            DistinguishedName = 'CN=Maya Chen,OU=Finance,OU=Users,OU=Northstar Lab,DC=northstar,DC=example'
            Description = 'SYNTHETIC Northstar portfolio lab identity; user_id=USR001'
            AdminCount = 0
            IsCriticalSystemObject = $false
        }
        try {
            $null = Assert-NorthstarLabUser -User $user -Context $script:Context
        }
        catch {
            throw "Expected marked synthetic user to be accepted, but received: $($_.Exception.Message)"
        }
    }

    It 'rejects a user outside the marked lab OU' {
        $user = [pscustomobject]@{
            SamAccountName = 'outside'
            DistinguishedName = 'CN=Outside User,OU=Users,DC=northstar,DC=example'
            Description = 'SYNTHETIC Northstar portfolio lab identity'
            AdminCount = 0
            IsCriticalSystemObject = $false
        }
        $threw = $false
        try { $null = Assert-NorthstarLabUser -User $user -Context $script:Context } catch { $threw = $true }
        if (-not $threw) { throw 'Expected an outside-OU user to be rejected.' }
    }

    It 'rejects protected accounts even if they are inside the lab OU' {
        $user = [pscustomobject]@{
            SamAccountName = 'protected'
            DistinguishedName = 'CN=Protected,OU=Users,OU=Northstar Lab,DC=northstar,DC=example'
            Description = 'SYNTHETIC Northstar portfolio lab identity'
            AdminCount = 1
            IsCriticalSystemObject = $false
        }
        $threw = $false
        try { $null = Assert-NorthstarLabUser -User $user -Context $script:Context } catch { $threw = $true }
        if (-not $threw) { throw 'Expected a protected user to be rejected.' }
    }

    It 'rejects a group that is not explicitly allowlisted' {
        $group = [pscustomobject]@{
            SamAccountName = 'Domain Admins'
            DistinguishedName = 'CN=Domain Admins,OU=Groups,OU=Northstar Lab,DC=northstar,DC=example'
            Description = 'SYNTHETIC Northstar portfolio lab group'
            AdminCount = 0
            IsCriticalSystemObject = $false
        }
        $threw = $false
        try { $null = Assert-NorthstarLabGroup -Group $group -Context $script:Context -AllowedGroupNames @('GG-Finance') } catch { $threw = $true }
        if (-not $threw) { throw 'Expected a non-allowlisted group to be rejected.' }
    }
}

Describe 'NorthstarLabGuard audit-path containment' {
    BeforeEach {
        $script:PrivateRoot = Join-Path $TestDrive 'evidence\private'
    }

    It 'accepts a valid child path' {
        $candidate = Join-Path $script:PrivateRoot 'ad\actions.jsonl'
        $actual = Resolve-NorthstarLabChildPath -CandidatePath $candidate -RootPath $script:PrivateRoot
        if ($actual -ne [System.IO.Path]::GetFullPath($candidate)) {
            throw 'Expected a valid audit child path to be returned unchanged after resolution.'
        }
    }

    It 'rejects a sibling-prefix escape' {
        $candidate = "$($script:PrivateRoot)-escape\actions.jsonl"
        $threw = $false
        try { $null = Resolve-NorthstarLabChildPath -CandidatePath $candidate -RootPath $script:PrivateRoot } catch { $threw = $true }
        if (-not $threw) { throw 'Expected sibling-prefix audit path escape to be rejected.' }
    }

    It 'rejects parent traversal' {
        $candidate = Join-Path $script:PrivateRoot '..\outside\actions.jsonl'
        $threw = $false
        try { $null = Resolve-NorthstarLabChildPath -CandidatePath $candidate -RootPath $script:PrivateRoot } catch { $threw = $true }
        if (-not $threw) { throw 'Expected parent-traversal audit path escape to be rejected.' }
    }

    It 'rejects an absolute outside path' {
        $candidate = Join-Path $TestDrive 'outside\actions.jsonl'
        $threw = $false
        try { $null = Resolve-NorthstarLabChildPath -CandidatePath $candidate -RootPath $script:PrivateRoot } catch { $threw = $true }
        if (-not $threw) { throw 'Expected absolute outside audit path to be rejected.' }
    }

    It 'accepts alternate separators for a valid child' {
        $candidate = "$(($script:PrivateRoot -replace '\\', '/'))/ad/actions.jsonl"
        try { $null = Resolve-NorthstarLabChildPath -CandidatePath $candidate -RootPath $script:PrivateRoot } catch { throw "Expected alternate separators to remain inside the audit root: $($_.Exception.Message)" }
    }
}

Describe 'Invoke-AccountSupport safety ordering' {
    It 'checks ShouldProcess before prompting for a password' {
        $scriptPath = Join-Path $PSScriptRoot '..\..\scripts\powershell\Invoke-AccountSupport.ps1'
        $content = Get-Content -LiteralPath $scriptPath -Raw
        if ($content.IndexOf('ShouldProcess($target, $operation)') -ge $content.IndexOf("Read-Host 'Enter a temporary LAB password")) {
            throw 'The secure password prompt must appear after the ShouldProcess check.'
        }
    }

    It 'uses resolved path containment rather than a string prefix comparison' {
        $scriptPath = Join-Path $PSScriptRoot '..\..\scripts\powershell\Invoke-AccountSupport.ps1'
        $content = Get-Content -LiteralPath $scriptPath -Raw
        if ($content -notmatch 'Resolve-NorthstarLabChildPath') {
            throw 'Expected the account-support script to use resolved audit-path containment.'
        }
        if ($content -match 'fullAuditPath\.StartsWith') {
            throw 'A string-prefix audit-path containment check must not remain.'
        }
    }
}
