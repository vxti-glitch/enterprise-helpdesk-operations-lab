# Ticket records

`generated/` contains one Markdown file for each simulated record in `data/tickets.csv`. Do not edit those Markdown files directly; update the CSV and run:

```powershell
python tools/labtool.py generate
python tools/labtool.py validate
```

Every record includes the initial report, meaningful work notes, root cause or bounded finding, resolution, validation, user communication, escalation details when applicable, and a calculated simplified SLA result.
