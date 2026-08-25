export function normalized(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export function ticketMatches(ticket, filters) {
  const searchable = [
    ticket.ticket_id,
    ticket.legacy_id,
    ticket.summary,
    ticket.caller,
    ticket.category,
    ticket.assignment_group,
  ].map(normalized).join(" ");
  if (filters.query && !searchable.includes(normalized(filters.query))) return false;
  if (filters.priority && ticket.priority !== filters.priority) return false;
  if (filters.category && ticket.category !== filters.category) return false;
  if (filters.type && ticket.type !== filters.type) return false;
  if (filters.sla && String(ticket.sla_met) !== filters.sla) return false;
  if (filters.escalated && String(ticket.event_derived_escalated) !== filters.escalated) return false;
  if (filters.fcr && String(ticket.event_derived_fcr) !== filters.fcr) return false;
  if (filters.group && ticket.assignment_group !== filters.group) return false;
  return true;
}

export function sortTickets(tickets, sort) {
  const direction = sort === "opened-desc" || sort === "response-desc" || sort === "resolution-desc" ? -1 : 1;
  const selector = {
    "id-asc": (ticket) => ticket.ticket_id,
    "opened-asc": (ticket) => ticket.opened_at,
    "opened-desc": (ticket) => ticket.opened_at,
    "priority-asc": (ticket) => ticket.priority,
    "response-asc": (ticket) => ticket.response_minutes,
    "response-desc": (ticket) => ticket.response_minutes,
    "resolution-asc": (ticket) => ticket.resolution_minutes,
    "resolution-desc": (ticket) => ticket.resolution_minutes,
  }[sort] ?? ((ticket) => ticket.ticket_id);
  return [...tickets].sort((left, right) => {
    const a = selector(left);
    const b = selector(right);
    return typeof a === "number" ? (a - b) * direction : String(a).localeCompare(String(b)) * direction;
  });
}
