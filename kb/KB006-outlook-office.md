# KB006 - Outlook and Office application checklist

**Audience:** Tier 1 service desk<br>
**Portfolio status:** SIMULATED procedure

## Determine the scope

- Does web mail or the web application work?
- Is one profile, one file, one add-in, one Office app, or the whole service affected?
- What changed: password, update, profile, add-in, network, or account?
- Is the desktop app online and signed in with the approved work identity?

## Low-risk checks

1. Record the error and application version.
2. Check online/offline state and the selected account.
3. Test safe mode when available.
4. Disable only the isolated problematic add-in.
5. Repair or recreate a local profile only after confirming server-side data availability.

Do not claim a mailbox or service is healthy solely because the application opens.

## Validate

Test the original action: open, send/receive, save, activation, or template use. Restart and repeat when the failure involved startup.

## Escalate when

Web and desktop access both fail; service health is degraded; mail flow or compliance investigation is required; profile repair risks local-only data; licensing is not approved; or multiple clients reproduce an update-compatibility issue.
