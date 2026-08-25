# KB002 - Troubleshoot an account lockout

**Audience:** Tier 1 service desk<br>
**Portfolio status:** SIMULATED procedure

## Triage

1. Verify the caller and exact account.
2. Distinguish locked, disabled, expired, and incorrect-password states.
3. Ask when the issue began and which devices or apps were used immediately beforehand.
4. Check permitted account-state and lockout-source information.
5. Look for saved credentials in approved client locations such as VPN, mail, mapped drives, phones, or scheduled tasks.

## Resolution pattern

Remove or update the stale saved credential before unlocking the account. Unlocking first may only restart the cycle. Use `Invoke-AccountSupport.ps1` in query mode before any lab action.

## Validate

- Account is no longer locked.
- One deliberate sign-in succeeds.
- Lockout does not return during the agreed observation window.
- Required applications reconnect with the current identity.

## Escalate when

The source is unknown and recurring; many accounts lock simultaneously; the account is privileged; event data indicates password spray or suspicious geography; domain-controller replication is unhealthy; or policy requires security review.
