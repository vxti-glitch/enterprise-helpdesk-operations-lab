# KB003 - Basic DNS and network triage

**Audience:** Tier 1 service desk<br>
**Portfolio status:** SIMULATED procedure

## Isolate the failing layer

1. Define scope: one application, one device, one location, or multiple users.
2. Inspect adapter state, address, subnet, gateway, and DNS servers.
3. Treat a `169.254.x.x` address as evidence that normal DHCP addressing was not obtained.
4. Test the local gateway when policy permits.
5. Test a known IP endpoint separately from a hostname.
6. Resolve the exact hostname and compare the answer with the approved record.
7. Test the required TCP port; a successful ping does not prove application-port availability.

The read-only `Invoke-NetworkTriage.ps1` records these observations in JSON.

## Common interpretations

| Observation | Likely layer to investigate next |
|---|---|
| Adapter disabled | Local endpoint |
| APIPA address and no gateway | DHCP or association |
| IP works; hostname fails | DNS client/server/path |
| DNS works; one TCP port fails for one client | Client firewall/application |
| Same port fails for multiple clients | Network/service owner escalation |

## Validate

Repeat the originally failing action and at least one lower-layer test. Record actual results rather than "network fixed."

## Escalate when

Multiple users or sites are affected; an infrastructure change is required; DNS records are wrong; packet loss is persistent; a required route is missing; or a security control may be blocking access.
