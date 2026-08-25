# KB001 - Reset a Windows domain password

**Audience:** Tier 1 service desk<br>
**Applies to:** Authorized Active Directory lab or approved enterprise workflow<br>
**Portfolio status:** SIMULATED procedure

## Before changing anything

1. Verify the caller using the approved identity process. Never use details supplied only by the caller as the sole proof.
2. Confirm the correct account and whether it is enabled, locked, expired, or subject to a security hold.
3. Ask whether the user recently changed the password and whether phones, VPN clients, scheduled tasks, or mapped resources may be retrying an old credential.
4. Do not put a temporary password, MFA code, or recovery answer in the ticket.

## Resolution

Use the approved admin tool to set a temporary password and require a change at next sign-in. In this lab, preview `Invoke-AccountSupport.ps1 -Action ResetPassword -SamAccountName <name>` first; use `-Execute -WhatIf` before an authorized live lab change.

## Validate

- The user reaches the change-password prompt.
- The new user-selected password is accepted.
- Windows and one required business resource open.
- No repeated lockout is observed during the validation window.

## Escalate when

Identity cannot be verified; the account is privileged; a legal/security hold exists; reset is immediately followed by unexplained lockout; replication errors appear; or the requested action is outside role permission.

## Ticket note

Record identity verification, account state, approved action, change-at-next-sign-in setting, and user validation. Record no password.
