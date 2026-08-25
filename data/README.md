# Synthetic lab data

Every row in this directory is fictional portfolio data.

- `users.csv`: 15 recurring fictional identities using `northstar.example`.
- `assets.csv`: 20 fictional Windows devices with `SYN-` serial markers and RFC 5737 addresses.
- `groups.csv`: Proposed lab security groups and fictional owners.
- `sla_targets.csv`: Simplified elapsed-minute response and resolution targets.
- `tickets.csv`: Canonical source for 40 incident/request records.
- `servicenow_import/incidents.csv`: Generated mapping aid for a learning instance; not a native platform export.

Edit source CSVs with a CSV-aware application and preserve headers. Run `python tools/labtool.py generate` followed by `python tools/labtool.py validate` after every change.
