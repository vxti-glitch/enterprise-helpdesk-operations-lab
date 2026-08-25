# Evidence guide

Strong evidence proves a decision or outcome. It does not need to prove every mouse click.

## Committed sample evidence

The files under `evidence/sample/` are text-only examples labeled `SIMULATED SAMPLE OUTPUT`. They demonstrate what to capture and how to annotate it. They are not logs from a real employer or production tenant.

## Recommended hands-on captures

| Evidence ID | Capture | What it should prove |
|---|---|---|
| EV-01 | Service desk queue | Categorization, priority, state, and assignment |
| EV-02 | Resolved DNS ticket | Observations, fix, validation, and user message |
| EV-03 | Security escalation | Scope discipline and useful handoff notes |
| EV-04 | AD OU tree | Intentional identity structure |
| EV-05 | PowerShell `-WhatIf` output | Change review before execution |
| EV-06 | Disabled synthetic user import | Safe staged provisioning |
| EV-07 | Network-triage JSON | Repeatable technical evidence |
| EV-08 | Windows client domain membership | Endpoint/domain relationship |
| EV-09 | Asset inventory view | Ownership and lifecycle status |
| EV-10 | Onboarding request | Approval and task dependencies |
| EV-11 | Offboarding request | Timing, containment, recovery, and audit trail |
| EV-12 | Knowledge article | Reusable support documentation |
| EV-13 | SLA report | Calculated operational reporting |
| EV-14 | Architecture diagram | Environment and escalation boundaries |

## Capture manifest

For each new artifact, copy `templates/evidence_log.md` and record:

- The evidence ID and related ticket or workflow.
- Whether it is simulated or personally lab-executed.
- The system and lab date.
- What the artifact proves.
- Redactions performed.
- The validation result.

For a personally completed exercise, use the stricter [personal-lab manifest template](../templates/personal_lab_manifest.md) and follow the [three-case roadmap](PERSONAL_LAB_ROADMAP.md). Do not create a `LAB-EXECUTED` label or manifest before completing the exercise yourself.

## Publishing workflow

1. Save raw captures to `evidence/private/`.
2. Redact and crop a copy.
3. Confirm that every visible identity and identifier is fictional.
4. Place application screenshots only in `evidence/screenshots/application/`. Place approved personal-lab captures only in `evidence/screenshots/lab-executed/`.
5. Add the matching `evidence/manifests/<same-file-stem>.md` manifest and update the README link.
6. Run the validator before committing.
