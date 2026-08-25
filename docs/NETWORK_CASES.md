# Network troubleshooting case matrix

The ten networking tickets use the same layered method: define scope, inspect the client, test addressing/routing, separate IP from DNS, test the application port, and validate the original task.

| Ticket | Symptom | Key observation | Modeled action | Boundary |
|---|---|---|---|---|
| INC011 | No websites | APIPA and no gateway | Rejoin approved Wi-Fi and renew DHCP | Escalate if multiple clients fail DHCP |
| INC012 | Internal hostname fails | IP and TCP work; DNS server is wrong | Restore approved lab DNS setting | No unapproved DNS-server change |
| INC013 | IP works; hostname fails | Stale negative client cache | Flush client resolver cache | Escalate wrong authoritative record |
| INC014 | 169.254 address after roaming | DHCP not completed | Reconnect and renew | Do not alter scopes from Tier 1 |
| INC015 | VPN connected; resource fails | Multi-user missing route evidence | Escalate to Network Operations | No concentrator/route modification |
| INC016 | VPN cannot connect | Local client service stopped | Start approved service | Escalate auth/certificate/infrastructure failures |
| INC017 | One site fails | Private window works | Clear only affected site data | Preserve broader browser state |
| INC018 | No adapter connection | Wi-Fi adapter disabled | Enable adapter | Confirm no hardware/driver error first |
| INC019 | Intermittent Wi-Fi | Driver and power events | Approved driver/power remediation | Observe over time; SLA miss is documented |
| INC020 | Required port times out | Same result on two clients | Escalate with route/port evidence | No firewall-rule change by Tier 1 |

## Ticket-note pattern

Good notes connect each test to a conclusion:

> Confirmed valid client address and gateway. IP connectivity to the lab service succeeded, but the internal hostname returned no answer. Adapter configuration showed an unapproved DNS server. Restored the approved lab DNS assignment, cleared the local resolver cache, and confirmed both name resolution and the original application connection.

Avoid notes such as "ran ipconfig" or "fixed internet" because they omit the observation, decision, and validation.

## Run the collector

`Invoke-NetworkTriage.ps1` is read-only. Point it at a host you are authorized to test and save raw output under the Git-ignored `evidence/private/` directory. Sanitize all local names and addresses before publishing.
