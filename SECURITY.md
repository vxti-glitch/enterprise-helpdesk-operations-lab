# Security and privacy policy

This is a public portfolio simulation. Do not submit real operational data in an issue, pull request, screenshot, or commit.

## Never publish

- Passwords, temporary passwords, recovery codes, API keys, tokens, cookies, or certificate private keys.
- Real employee names, personal email addresses, phone numbers, ticket text, or identity attributes.
- Real device serial numbers, hardware hashes, public IP addresses, tenant IDs, subscription IDs, or internal DNS names.
- Screenshots showing browser profiles, favorites, taskbars, notifications, chat messages, QR codes, or account menus.

## Evidence review checklist

1. Capture only an isolated lab or simulation.
2. Crop to the relevant application area.
3. Search the image and nearby text for real names, email addresses, hostnames, IDs, and tokens.
4. Redact before committing; do not rely on a GitHub deletion to remove a secret from history.
5. Store unreviewed evidence under `evidence/private/`, which Git ignores.

## Script safeguards

AD-changing scripts in this repository require `-Execute`, support `-WhatIf`, and verify the exact lab DNS root. Review every planned change first. These safeguards reduce risk; they do not replace backups, authorization, or an isolated lab.

For a sensitive accidental commit, rotate the exposed credential first, then remove it from Git history and GitHub according to your organization's process.
