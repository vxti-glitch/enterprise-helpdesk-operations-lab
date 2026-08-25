# Asset management workflow

`data/assets.csv` is a synthetic lightweight inventory, not a full CMDB. It demonstrates consistent identification, ownership, status, location, lifecycle dates, and verification.

## Lifecycle states

| State | Meaning in the lab | Required next action |
|---|---|---|
| Stock | Ready but unassigned | Verify build/readiness before assignment |
| Assigned | Custody linked to a fictional user | Confirm periodically and at role/location change |
| Shared | Department-owned fixed endpoint | Record location and designated owner |
| Loaner | Temporary issue pool | Record checkout and return date in a real implementation |
| Repair | Unavailable pending diagnosis/vendor work | Track custody and return expectation |
| Recovered | Returned after offboarding | Reconcile accessories; wipe/reimage before Stock |

## Controls demonstrated

- Unique `asset_id`, hostname, and `SYN-` serial.
- User and department relationship.
- Documentation-only IP address.
- Purchase, warranty, and last-verification dates.
- Clear separation between Recovered and ready-to-assign Stock.

## Reconciliation case

INC038 intentionally exceeds its simplified P4 SLA while reconciling a missing device. The correct response is to verify physical tag, serial, hostname, location, last check-in, and source identifier before adding or deleting a record. In the simulated case, a trailing-space mismatch caused the inventory join to fail; correction restored one canonical record.

## Production extensions

A real CMDB would need history, custody acknowledgements, encryption/compliance state, disposal certificates, procurement/warranty sources, role-based access, audit logs, and a reconciliation process. Do not publish real serials or hardware hashes.
