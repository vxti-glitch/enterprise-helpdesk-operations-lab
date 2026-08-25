# Release after merge

Do this only after the pull request is merged to `main`, all GitHub checks are green, and the Pages deployment has completed. Do not create a release from an unmerged branch.

1. Pull the merged `main` branch and run the documented full validation set.
2. Create the clean commit-exact archive with `python tools/labtool.py package`.
3. Confirm the generated SHA-256 file matches the ZIP.
4. Create the release using the approved release notes:

```powershell
gh release create v2.0.0 .\dist\enterprise-helpdesk-operations-lab.zip .\dist\enterprise-helpdesk-operations-lab.zip.sha256 --title "v2.0.0 — Quality and credibility pass" --notes-file .\docs\releases\v2.0.0.md
```

5. Confirm the live console still shows its simulated-data boundary.
