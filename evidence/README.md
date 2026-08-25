# Evidence

Evidence is split into three areas:

- `sample/` contains committed text examples labeled as simulations.
- `generated/` contains deterministic metrics produced from synthetic event data.
- `screenshots/application/` contains genuine screenshots of this static Northstar console displaying simulated data.
- `screenshots/lab-executed/` is reserved for redacted evidence personally captured in an authorized lab; each file requires a matching manifest under `manifests/`.
- `private/` is Git-ignored staging for raw local captures and audit output.

No committed file should imply production access or employment. The application screenshots are not third-party platform screenshots. Use `templates/evidence_log.md` for every new artifact and follow `docs/EVIDENCE_GUIDE.md`.
