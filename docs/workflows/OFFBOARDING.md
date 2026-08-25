# Offboarding workflow - REQ002 / RITM002 (fictional)

> **SIMULATED PORTFOLIO WORKFLOW.** Lucas Reed and every approval, system, and result below are fictional.

## Request

- Employee: Lucas Reed, Sales Representative
- Manager: Daniel Brooks
- Effective time: 2026-07-17, 17:00 ET
- Device: NS-LT-014
- Access: Sales, VPN, remote-worker baseline, Microsoft 365 standard apps

## Timing and separation of duties

HR provides the authoritative effective time. Tier 1 does not disable an account early, decide data ownership, search user content, or transfer mailbox/OneDrive data without approval.

| Stage | Owner | Simulated action | Validation/evidence |
|---|---|---|---|
| Intake | HR / manager | Confirm identity, effective time, manager, and legal hold requirements | Approved request and time zone recorded |
| Identity containment | IAM | Disable account at effective time; revoke sessions if available | Account disabled and sign-in blocked |
| Access cleanup | IAM | Remove non-retention groups and VPN access | Before/after group list attached |
| Data preservation | M365 / manager | Preserve or transfer authorized business data | Approval and destination recorded; content not exposed in ticket |
| Licensing | M365 | Remove/reassign license after preservation gates | License state recorded |
| Device recovery | Manager / Endpoint | Recover NS-LT-014 and accessories | Custody and condition updated in asset inventory |
| Reset/redeployment | Endpoint | Wipe/reimage under approved process | Device moves to `Stock` only after validation |
| Closure | Tier 1 | Confirm every child task and notify request owner | Audit trail complete; no secrets in notes |

## Escalation conditions

Escalate immediately for a missing device, disputed termination time, legal hold, suspicious access after the effective time, unavailable manager, or request to access user content without approval.

## Ticket-ready closure note

"Executed the fictional offboarding checklist at the approved effective time. Identity disablement, session revocation, group cleanup, data-preservation approval, license handling, and device recovery were tracked as separate control steps. NS-LT-014 custody was updated and the request owner was notified. This record is a simulation and does not represent a production account change."
