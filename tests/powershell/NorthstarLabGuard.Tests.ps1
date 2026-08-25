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

Describe 'Invoke-AccountSupport safety ordering' {
    It 'checks ShouldProcess before prompting for a password' {
        $scriptPath = Join-Path $PSScriptRoot '..\..\scripts\powershell\Invoke-AccountSupport.ps1'
        $content = Get-Content -LiteralPath $scriptPath -Raw
        if ($content.IndexOf('ShouldProcess($target, $operation)') -ge $content.IndexOf("Read-Host 'Enter a temporary LAB password")) {
            throw 'The secure password prompt must appear after the ShouldProcess check.'
        }
    }
}
