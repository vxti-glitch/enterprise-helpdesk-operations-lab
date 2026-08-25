# Onboarding workflow - REQ001 / RITM001 (fictional)

> **SIMULATED PORTFOLIO WORKFLOW.** Jordan Kim and every approval, system, and result below are fictional.

## Request

- Employee: Jordan Kim, Junior Financial Analyst
- Start: 2026-07-13, 09:00 ET
- Manager: Maya Chen
- Work arrangement: Hybrid
- Required access: Finance group, VPN, remote-worker baseline, Microsoft 365 standard apps, Finance printer
- Device: NS-LT-015

## Control gates and tasks

| Stage | Owner | Required input | Simulated action | Validation/evidence |
|---|---|---|---|---|
| HR intake | HR | Legal name, start date, manager, role | Create onboarding request | HR approval attached to request |
| Identity | Tier 1 / IAM | Approved username and department | Create disabled AD account in Finance OU | Query identity and OU; no password in ticket |
| Access | Manager / data owner | Group and application approvals | Add approved groups only | Compare membership with approved list |
| Cloud | M365 Support | License approval | Assign fictional standard license and manager | Sign-in/license state recorded as simulated |
| MFA | User / Tier 1 | Verified identity | Guide enrollment; never request the code | User confirms successful challenge |
| Asset | Endpoint | Stock and shipping/location | Assign NS-LT-015 and standard profile | Asset record shows assigned/verified |
| Endpoint | Endpoint | Device profile | Join/enroll and apply compliance baseline | Device status recorded as simulated unless executed |
| Handoff | Tier 1 | All required tasks complete | Send first-login and support instructions | User and manager confirm access |

## Ticket-ready work note

"Verified approved onboarding request and start date. Created the staged identity in the Finance OU, applied only the manager-approved access groups, and linked asset NS-LT-015. Cloud license, MFA, and endpoint enrollment steps are documented simulations in this repository. Validation checklist confirms identity attributes, group list, device assignment, and user handoff; no password or authentication secret was recorded."

## Closure criteria

- User and manager identities verified.
- Required approvals present.
- Account attributes and group membership match the request.
- Device ownership and status updated.
- First login and MFA confirmed in the lab, if executed.
- User receives support contact and acceptable-use guidance.
- Incomplete downstream tasks remain assigned; the parent request is not closed early.
