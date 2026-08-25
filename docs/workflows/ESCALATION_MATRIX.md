# Escalation matrix

| Condition | Tier 1 actions | Destination | Minimum handoff evidence |
|---|---|---|---|
| Suspected phishing or unexpected sign-in | Verify reporter; capture time, sender/location/device facts; follow approved account-protection step; preserve message/alert | Security Operations | Scope, timestamps, affected identity, indicators, actions already taken |
| Internal DNS/VPN issue affects multiple users or infrastructure | Confirm scope; compare wired/wireless/VPN; capture resolution, route, and port results; avoid unapproved server changes | Network Operations | Affected sites/users, start time, exact tests and results, client configuration |
| Access requires owner approval or privileged role | Confirm identity and business need; locate approval; do not self-approve | Identity and Access | Requested resource/role, manager/owner, approval status, error text |
| Shared mailbox or M365 policy change | Reproduce and verify current assignment; capture user/service state | Microsoft 365 Support | Identity, mailbox/resource, license state, timestamps, screenshots with redaction |
| Application failure persists after client-side repair | Reproduce; collect version, logs, error code, recent change, and workaround | Application Support | Steps to reproduce, versions, logs, business impact, rollback result |
| New or replacement device fulfillment | Verify request, role, location, approvals, stock, and software profile | Endpoint Management | Request, user, asset, profile, deadline, shipping/location |
| Missing device or inventory mismatch | Verify last assigned user/location and check-in; do not alter custody records without evidence | Asset Management | Asset ID, serial, owner, last verification, discrepancy |

## Escalation note format

1. Symptom and business impact.
2. Scope and reproduction status.
3. Exact checks performed and their results.
4. Changes already made.
5. Relevant timestamps and evidence paths.
6. Specific action requested from the receiving group.
7. User communication and next-update expectation.
