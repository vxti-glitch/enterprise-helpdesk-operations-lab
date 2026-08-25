import assert from "node:assert/strict";
import test from "node:test";
import { sortTickets, ticketMatches } from "./filters.js";

const tickets = [
  { ticket_id: "INC009", legacy_id: "", summary: "Suspicious sign-in", caller: "Ava", category: "Security", assignment_group: "Security Operations", priority: "P1", type: "Incident", sla_met: true, event_derived_escalated: true, event_derived_fcr: false, opened_at: "2026-01-01T10:00:00Z", response_minutes: 9, resolution_minutes: 210 },
  { ticket_id: "REQ001", legacy_id: "INC004", summary: "New hire", caller: "Jordan", category: "Identity", assignment_group: "Service Desk Tier 1", priority: "P3", type: "Service Request", sla_met: true, event_derived_escalated: false, event_derived_fcr: true, opened_at: "2026-01-02T10:00:00Z", response_minutes: 18, resolution_minutes: 80 },
];

test("ticket search includes a legacy identifier", () => {
  assert.equal(ticketMatches(tickets[1], { query: "inc004" }), true);
});

test("combined filters retain only matching event-derived records", () => {
  assert.deepEqual(tickets.filter((ticket) => ticketMatches(ticket, { priority: "P1", escalated: "true", sla: "true" })), [tickets[0]]);
});

test("response-time sorting is numeric", () => {
  assert.deepEqual(sortTickets(tickets, "response-asc").map((ticket) => ticket.ticket_id), ["INC009", "REQ001"]);
});
