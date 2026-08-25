# Contributing

This repository is designed to be forked and customized as a learning lab.

Before opening a pull request:

1. Keep all company, user, asset, and ticket data clearly fictional.
2. Do not include secrets, real identities, or proprietary ticket content.
3. Run `python tools/labtool.py validate`.
4. Run `python -m unittest discover -s tests -v`.
5. On Windows, run the PowerShell parser check described in `docs/QUICKSTART.md`.
6. Regenerate derived files with `python tools/labtool.py generate` and commit intentional changes.

Ticket fields and SLA definitions are documented in `docs/DATA_DICTIONARY.md`.
