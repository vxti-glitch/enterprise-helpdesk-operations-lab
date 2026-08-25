# Interview discussion guide

## Thirty-second project summary

"I built a simulated enterprise help-desk operations lab around a fictional company. I modeled 40 incidents and requests, linked them to synthetic users and assets, wrote concise troubleshooting and escalation notes, created safe Active Directory and network-triage scripts, documented onboarding and offboarding, and generated SLA metrics directly from the ticket timestamps. The ServiceNow and cloud records are clearly simulations; the scripts are designed for an isolated lab."

## Three stories to know well

### INC012 - isolate DNS from general connectivity

Explain why a successful gateway/IP test but failed hostname resolution narrows the problem, what evidence you would attach, how you would correct an approved DNS configuration, and how you would validate both name resolution and application access.

### INC009 - recognize the Tier 1 security boundary

Explain identity verification, collection of time/device/location facts, session-protection steps permitted by policy, evidence preservation, and escalation. Do not claim to have performed threat hunting or completed a forensic investigation.

### INC040 - prioritize business impact and communication

Explain why an executive title alone does not automatically create a P1, how you kept the user updated before a meeting, why the technical fix was still documented, and how validation closed the loop.

## Likely questions

### Did you support real Northstar employees?

No. Northstar is fictional, and the repository labels all users and tickets as simulated. The value is the process, automation, documentation, and reproducibility.

### Are these screenshots from ServiceNow?

No screenshots are supplied. The fields are ServiceNow-style learning records. If I recreate records in my own PDI, I will label those images as lab-executed.

### How is the 92.5% SLA rate calculated?

The Python tool compares first-response and resolution timestamps with the priority targets. A ticket passes only if both targets pass. Three deliberately challenging cases miss resolution targets.

### Why are some tickets escalated?

Tier 1 should not bypass approval, modify infrastructure without authorization, or investigate security events beyond its scope. Eight tickets include evidence-rich handoffs to the correct resolver group.

### What would you change in a real environment?

Use the organization's actual priority matrix, business-hour calendars, pause conditions, data-retention controls, approved remote tools, knowledge approval process, CMDB model, and role-based permissions.

## Honest phrasing

Say: "I modeled," "I documented," "I wrote and tested," "in my lab," and "the simulated record shows."

Avoid: "I supported users at Northstar," "I managed a production tenant," "I met company SLA," or "I resolved a real security incident."
