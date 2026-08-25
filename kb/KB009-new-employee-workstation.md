# KB009 - New employee workstation checklist

**Audience:** Tier 1 and endpoint fulfillment<br>
**Portfolio status:** SIMULATED procedure

## Required request data

- Approved employee identity, manager, role, department, start date, time zone, and location.
- Approved access groups, applications, license profile, and special hardware.
- Asset ID, synthetic serial, stock state, and shipping/custody plan.

## Sequence

1. Stage the identity without placing a password in the ticket.
2. Apply only approved group memberships.
3. Assign the asset and standard endpoint profile.
4. Complete domain join or enrollment in the authorized lab.
5. Apply updates and approved applications.
6. Guide private MFA enrollment.
7. Test sign-in, network, required apps, and one business resource.
8. Provide support and acceptable-use instructions.

## Closure gate

Do not close the parent request while a required identity, device, license, or access task remains incomplete. Record owners and due times for downstream tasks.

## Escalate when

Approval is missing; the role is privileged; stock is unavailable; a hardware hash/serial is duplicated; enrollment or compliance fails; shipping is disputed; or requested access conflicts with least privilege.
