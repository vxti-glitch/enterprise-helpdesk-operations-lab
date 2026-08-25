# KB008 - Windows Update and storage triage

**Audience:** Tier 1 endpoint support<br>
**Portfolio status:** SIMULATED procedure

## Collect before changing

- Update name and error code.
- Last successful update and restart.
- Free space and largest storage categories.
- Power, network, encryption, and device-management state.
- Any documented compatibility hold.

## Low-risk remediation order

1. Restart when approved and pending.
2. Free space from approved temporary locations.
3. Confirm important user data is synchronized or backed up before removing local copies.
4. Retry the update through the approved management path.
5. Record the result and post-restart build.

Do not delete user folders, bypass a compatibility hold, disable security controls, or use undocumented registry changes.

## Validate

The update reports success; restart completes; the target build is present; free space remains above the support threshold; and core applications open.

## Escalate when

Encryption/recovery state is unclear; repeated component-store errors occur; a vendor compatibility hold exists; many devices fail; rollback is required; or data loss is suspected.
