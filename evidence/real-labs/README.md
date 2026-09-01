# Future real-lab evidence schema

This directory may contain at most three genuine, sanitized lab records. It currently contains no lab results. Do not generate an entry from Northstar cases, sample output, fixtures, or browser simulation.

Each entry must be a separate Markdown file with every field below:

```markdown
# LAB-EXECUTED: <short task name>

- Date and time (UTC):
- Environment and version:
- Authorization and owner:
- Synthetic or sanitized identities used:
- Starting state / symptom:
- Safety boundary and rollback plan:

## Commands or actions performed

Record exact commands or UI actions. Remove secrets and identifying values.

## Evidence

List sanitized artifact paths, timestamps, exit states, and relevant observations. Screenshots must show only the authorized lab.

## Hypothesis timeline

Record each hypothesis, the test used, and whether the evidence supported or rejected it.

## Root cause

State only what the captured evidence supports.

## Fix

Record the approved correction and its scope.

## Validation

Repeat the original task and record the observable before/after result.

## Cleanup

Restore temporary settings, remove test accounts/files, stop captures, and confirm the lab's final state.

## Limitations

List what was not tested and why the result does not establish production behavior.
```

Before committing, redact credentials, tokens, recovery keys, tenant/domain identifiers, public IPs, hostnames, usernames, personal data, and unrelated logs. Link each artifact from its record, keep raw captures in an ignored private location, and label any supporting sample separately from `LAB-EXECUTED` evidence.
