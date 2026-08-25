# KB007 - MFA enrollment and repeated prompt troubleshooting

**Audience:** Tier 1 identity support<br>
**Portfolio status:** SIMULATED procedure

## Safety rules

- Verify identity through the approved process before changing registration state.
- Never ask for or record a one-time code, push approval, recovery code, or QR secret.
- Tell users to deny prompts they did not initiate and report unfamiliar sign-in alerts.

## Enrollment checks

1. Confirm the allowed authentication method and supported device.
2. Check automatic date, time, and time zone.
3. Restart the registration session if it is stale.
4. Confirm the user completes the challenge privately.

## Repeated prompt checks

Compare web and desktop behavior; check for a recent password change; sign out of affected apps; remove only approved stale work credentials; restart; and perform one clean sign-in.

## Escalate when

The user reports an unfamiliar prompt or location; identity cannot be verified; registration reset is outside role scope; Conditional Access blocks the attempt; risk state is elevated; or prompts continue across devices.
