# KB004 - Troubleshoot VPN connectivity

**Audience:** Tier 1 remote support<br>
**Portfolio status:** SIMULATED procedure

## Separate three failure types

1. **Internet unavailable:** Fix or hand off the underlying connection before the VPN.
2. **VPN cannot establish:** Check client service, time, version, error code, approved MFA flow, and account eligibility.
3. **VPN connects but resource fails:** Check internal DNS, route, and required port; compare another internal resource and another user when authorized.

Never ask the user to read an MFA code to the technician. Never disable endpoint security or alter concentrator/firewall rules as a shortcut.

## Validate

- VPN status is connected.
- Internal DNS returns the approved lab answer.
- The required internal TCP port succeeds.
- The user opens the original resource.

## Escalate when

The client evidence points to missing routes, concentrator/certificate problems, many affected users, blocked approved ports, repeated unexplained MFA failures, or policy/authorization changes.

## Handoff evidence

Include client version, error text, time zone and timestamp, ISP/network type, internal resolution result, route result, port result, scope, and any workaround.
