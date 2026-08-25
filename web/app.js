import { sortTickets, ticketMatches } from "./filters.js";

const main = document.querySelector("main");
const label = document.querySelector("#simulation-label");
const sourceRoot = "https://github.com/vxti-glitch/enterprise-helpdesk-operations-lab/blob/main/";
let lab;
let tourStep = null;
let assetFilter = { status: "", department: "", location: "", type: "" };
let ticketFilters = { query: "", priority: "", category: "", type: "", sla: "", escalated: "", fcr: "", group: "", sort: "id-asc" };

const tour = [
  { route: "#/overview", title: "Start with the event-derived overview", text: "The dashboard makes the fictional scope, metrics, and intentionally difficult SLA cases clear in seconds." },
  { route: "#/tickets/INC012", title: "Follow a diagnosis", text: "INC012 shows the interview-ready path from client symptom to DNS isolation, resolution, validation, and user communication." },
  { route: "#/tickets/INC009", title: "Review security scope discipline", text: "INC009 demonstrates what Tier 1 documented, what was escalated, and what Tier 1 deliberately did not claim to investigate." },
  { route: "#/assets/NS-LT-005", title: "Connect support work to inventory", text: "The asset view links a fictional device, its assigned user, and the related historical records." },
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function unique(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function route() { return location.hash.replace(/^#/, "") || "/overview"; }
function recordLink(id) { return `#/tickets/${encodeURIComponent(id)}`; }
function assetLink(id) { return `#/assets/${encodeURIComponent(id)}`; }
function personLink(id) { return `#/people/${encodeURIComponent(id)}`; }
function formatMinutes(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 2880) return `${(minutes / 60).toFixed(1)} hr`;
  return `${(minutes / 1440).toFixed(1)} days`;
}
function utc(value) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)); }
function metric(value, labelText) { return `<article class="metric"><span class="value">${escapeHtml(value)}</span><small>${escapeHtml(labelText)}</small></article>`; }
function pill(text, type = "neutral") { return `<span class="pill ${type}">${escapeHtml(text)}</span>`; }
function slaPill(ticket) { return ticket.sla_met ? pill("SLA met", "met") : pill("SLA missed", "missed"); }
function booleanPill(value, yes, no) { return value ? pill(yes, "warning") : pill(no, "neutral"); }
function externalPath(path, text = path) { return `<a href="${sourceRoot}${encodeURI(path)}">${escapeHtml(text)}</a>`; }
function personFor(ticket) { return lab.people.find((person) => person.user_id === ticket.caller_id); }
function assetFor(ticket) { return lab.assets.find((asset) => asset.asset_id === ticket.asset_id); }
function kbFor(id) { return lab.kb.find((article) => article.id === id); }

function navState(current) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === current;
    if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  });
}

function tourPanel() {
  if (tourStep === null) return "";
  const item = tour[tourStep];
  const last = tourStep === tour.length - 1;
  return `<section class="tour" aria-label="90-second reviewer tour" tabindex="-1">
    <div><p class="eyebrow">90-second reviewer tour · ${tourStep + 1} of ${tour.length}</p><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>
    <div class="button-row"><button class="button-secondary" data-action="end-tour">End tour</button><button class="button" data-action="next-tour">${last ? "Finish tour" : "Next stop"}</button></div>
  </section>`;
}

function pageHead(eyebrow, title, description) {
  return `<section class="page-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p class="lede">${escapeHtml(description)}</p></section>`;
}

function renderOverview() {
  navState("overview");
  const metrics = lab.metrics;
  const priorityBars = Object.entries(metrics.by_priority).map(([priority, row]) => `<div class="bar-row"><strong>${priority}</strong><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${row.compliance_percent}%"></div></div><small>${row.both_met}/${row.tickets} · ${row.compliance_percent}%</small></div>`).join("");
  const categoryRows = Object.entries(metrics.by_category).sort((a, b) => b[1] - a[1]).map(([category, count]) => `<li><strong>${escapeHtml(category)}</strong><br><span>${count} fictional records</span></li>`).join("");
  const missRows = metrics.missed_sla_tickets.map((item) => `<li><a href="${recordLink(item.ticket_id)}"><strong>${escapeHtml(item.ticket_id)}</strong> · ${escapeHtml(item.priority)} · ${escapeHtml(item.missed_measure)} target missed<br><span>${escapeHtml(lab.intentional_miss_explanations[item.ticket_id] ?? "Retained fictional difficult case.")}</span></a></li>`).join("");
  const cases = lab.featured_ticket_ids.map((id) => lab.tickets.find((ticket) => ticket.ticket_id === id)).filter(Boolean).map((ticket) => `<article class="card case-card"><div class="ticket-card-header"><span class="record-id">${ticket.ticket_id}</span>${slaPill(ticket)}</div><h3>${escapeHtml(ticket.summary)}</h3><p>${escapeHtml(ticket.category)} · ${ticket.event_derived_escalated ? "escalation judgment" : "Tier 1 resolution"}</p><a href="${recordLink(ticket.ticket_id)}">Open case <span aria-hidden="true">→</span></a></article>`).join("");
  main.innerHTML = `${tourPanel()}
    <section class="hero">
      <div>${pageHead("Historical operations snapshot", "Make the help-desk story easy to review.", "A static, event-derived console built from fictional Northstar portfolio records. It is an interview study tool—not a live ticket queue or a claim of employment.")}
        <div class="button-row"><button class="button" data-action="start-tour">Start 90-second tour</button><a class="button-secondary" href="#/tickets">Explore all records</a></div>
      </div>
      <aside class="hero-note"><strong>How to read this project</strong><p>Metrics and timelines are derived from committed fictional events. The three missed targets remain visible by design; their purpose is to show prioritization and escalation reasoning.</p><a href="#/evidence">See evidence boundaries and capture guidance</a></aside>
    </section>
    <section class="metric-grid" aria-label="Event-derived simulated portfolio metrics">
      ${metric(metrics.ticket_count, "historical fictional records")}
      ${metric(`${metrics.sla_compliant}/${metrics.ticket_count}`, `${metrics.sla_compliance_percent}% simplified SLA compliance`) }
      ${metric(`${metrics.first_contact_resolutions}/${metrics.ticket_count}`, `${metrics.first_contact_resolution_percent}% first-contact resolution`) }
      ${metric(`${metrics.escalations}/${metrics.ticket_count}`, `${metrics.escalation_percent}% documented escalation`) }
    </section>
    <section class="panel-grid"><article class="card"><h2>Compliance by priority</h2><p>Continuous elapsed-time model; no business-hours or pause-state exclusions.</p><div class="bar-list" role="img" aria-label="Simplified SLA compliance: P1 100 percent, P2 100 percent, P3 93.3 percent, P4 66.7 percent.">${priorityBars}</div></article>
      <article class="card"><h2>Read the misses, not just the percentage</h2><p>These intentional fictional exceptions are more useful in an interview than a perfect score.</p><ul class="miss-list">${missRows}</ul></article></section>
    <section><h2>Four cases worth discussing</h2><div class="case-grid">${cases}</div></section>
    <section class="panel-grid"><article class="card"><h2>Category volume</h2><ul class="compact-list">${categoryRows}</ul></article><article class="card"><h2>Metric context</h2><p><strong>Median first response:</strong> ${formatMinutes(metrics.median_response_minutes)}<br><strong>Median resolution:</strong> ${formatMinutes(metrics.median_resolution_minutes)}</p><p>The average resolution time is intentionally pulled upward by the three retained long-running fictional cases.</p><a href="#/tickets">Filter the full historical snapshot</a></article></section>`;
}

function selectOptions(values, selected, labelText) {
  return `<option value="">All ${escapeHtml(labelText)}</option>${values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}`;
}

function ticketRow(ticket) {
  return `<tr><td><a class="record-id" href="${recordLink(ticket.ticket_id)}">${escapeHtml(ticket.ticket_id)}</a>${ticket.legacy_id ? `<br><small>Legacy ${escapeHtml(ticket.legacy_id)}</small>` : ""}</td><td><a href="${recordLink(ticket.ticket_id)}">${escapeHtml(ticket.summary)}</a><br><small>${escapeHtml(ticket.caller)} · ${escapeHtml(ticket.category)}</small></td><td>${pill(ticket.priority, ticket.priority === "P1" ? "missed" : ticket.priority === "P2" ? "warning" : "neutral")}</td><td>${escapeHtml(ticket.type)}</td><td>${escapeHtml(ticket.assignment_group)}</td><td>${slaPill(ticket)}</td><td>${formatMinutes(ticket.response_minutes)}</td><td>${formatMinutes(ticket.resolution_minutes)}</td></tr>`;
}

function ticketCard(ticket) {
  return `<article class="ticket-card"><div class="ticket-card-header"><a class="record-id" href="${recordLink(ticket.ticket_id)}">${escapeHtml(ticket.ticket_id)}</a>${slaPill(ticket)}</div><h3><a href="${recordLink(ticket.ticket_id)}">${escapeHtml(ticket.summary)}</a></h3><p>${pill(ticket.priority)} ${booleanPill(ticket.event_derived_escalated, "Escalated", "No escalation")}</p><dl><dt>Caller</dt><dd>${escapeHtml(ticket.caller)}</dd><dt>Category</dt><dd>${escapeHtml(ticket.category)}</dd><dt>Final resolver</dt><dd>${escapeHtml(ticket.assignment_group)}</dd><dt>Response</dt><dd>${formatMinutes(ticket.response_minutes)}</dd></dl></article>`;
}

function renderTickets() {
  navState("tickets");
  const filters = ticketFilters;
  const matching = sortTickets(lab.tickets.filter((ticket) => ticketMatches(ticket, filters)), filters.sort);
  const categories = unique(lab.tickets.map((ticket) => ticket.category));
  const groups = unique(lab.tickets.map((ticket) => ticket.assignment_group));
  const active = Object.entries(filters).filter(([key, value]) => value && key !== "sort").length;
  main.innerHTML = `${tourPanel()}${pageHead("Historical fictional records", "Ticket explorer", "Search and combine event-derived filters. Every record is closed because this is a completed historical portfolio snapshot, not a live queue.")}
    <form class="filter-panel" id="ticket-filters"><div class="filter-grid">
      <div class="field"><label for="query">Search records</label><input id="query" name="query" type="search" value="${escapeHtml(filters.query)}" placeholder="INC009, summary, caller…"></div>
      <div class="field"><label for="priority">Priority</label><select id="priority" name="priority">${selectOptions(["P1", "P2", "P3", "P4"], filters.priority, "priorities")}</select></div>
      <div class="field"><label for="category">Category</label><select id="category" name="category">${selectOptions(categories, filters.category, "categories")}</select></div>
      <div class="field"><label for="type">Record type</label><select id="type" name="type">${selectOptions(["Incident", "Service Request"], filters.type, "record types")}</select></div>
      <div class="field"><label for="sla">SLA result</label><select id="sla" name="sla"><option value="">All SLA results</option><option value="true" ${filters.sla === "true" ? "selected" : ""}>Met</option><option value="false" ${filters.sla === "false" ? "selected" : ""}>Missed</option></select></div>
      <div class="field"><label for="escalated">Escalation</label><select id="escalated" name="escalated"><option value="">All escalation states</option><option value="true" ${filters.escalated === "true" ? "selected" : ""}>Escalated</option><option value="false" ${filters.escalated === "false" ? "selected" : ""}>Not escalated</option></select></div>
      <div class="field"><label for="fcr">First-contact resolution</label><select id="fcr" name="fcr"><option value="">All FCR states</option><option value="true" ${filters.fcr === "true" ? "selected" : ""}>First-contact resolution</option><option value="false" ${filters.fcr === "false" ? "selected" : ""}>Not first-contact</option></select></div>
      <div class="field"><label for="group">Final resolver group</label><select id="group" name="group">${selectOptions(groups, filters.group, "resolver groups")}</select></div>
      <div class="field"><label for="sort">Sort by</label><select id="sort" name="sort"><option value="id-asc" ${filters.sort === "id-asc" ? "selected" : ""}>Record identifier</option><option value="opened-asc" ${filters.sort === "opened-asc" ? "selected" : ""}>Opened date, oldest first</option><option value="opened-desc" ${filters.sort === "opened-desc" ? "selected" : ""}>Opened date, newest first</option><option value="priority-asc" ${filters.sort === "priority-asc" ? "selected" : ""}>Priority</option><option value="response-asc" ${filters.sort === "response-asc" ? "selected" : ""}>Response time, shortest</option><option value="response-desc" ${filters.sort === "response-desc" ? "selected" : ""}>Response time, longest</option><option value="resolution-asc" ${filters.sort === "resolution-asc" ? "selected" : ""}>Resolution time, shortest</option><option value="resolution-desc" ${filters.sort === "resolution-desc" ? "selected" : ""}>Resolution time, longest</option></select></div>
    </div></form>
    <div class="filter-summary"><p id="filter-result" aria-live="polite"><strong>${matching.length}</strong> of ${lab.tickets.length} records shown${active ? ` · ${active} active filter${active === 1 ? "" : "s"}` : ""}.</p><button class="link-button" data-action="clear-ticket-filters">Clear all filters</button></div>
    ${matching.length ? `<div class="table-wrap"><table><caption>Historical fictional help-desk records. Select a record to inspect the event timeline and supporting relationships.</caption><thead><tr><th>Record</th><th>Summary</th><th>Priority</th><th>Type</th><th>Final resolver</th><th>SLA</th><th>Response</th><th>Resolution</th></tr></thead><tbody>${matching.map(ticketRow).join("")}</tbody></table></div><div class="ticket-cards">${matching.map(ticketCard).join("")}</div>` : `<div class="empty-state"><h2>No records match these filters</h2><p>Clear one or more filters, or search for a known record such as INC009.</p><button class="button" data-action="clear-ticket-filters">Clear all filters</button></div>`}`;
  const form = document.querySelector("#ticket-filters");
  form.addEventListener("input", updateTicketFilters);
  form.addEventListener("change", updateTicketFilters);
}

function updateTicketFilters(event) {
  ticketFilters = { ...ticketFilters, [event.target.name]: event.target.value };
  renderTickets();
}

function ticketDetail(id) {
  const ticket = lab.tickets.find((candidate) => candidate.ticket_id === id || candidate.legacy_id === id);
  if (!ticket) return renderNotFound("Ticket not found", "The record may have been renamed or does not exist in the fictional data set.");
  navState("tickets");
  const person = personFor(ticket);
  const asset = assetFor(ticket);
  const kb = ticket.kb_reference === "none" ? null : kbFor(ticket.kb_reference);
  const timeline = ticket.events.map((event) => `<li><strong>${escapeHtml(event.event_type)}</strong> ${event.visibility === "Internal" ? pill("Internal", "neutral") : pill("User-facing", "met")}<time>${escapeHtml(utc(event.occurred_at))} UTC · ${escapeHtml(event.assignment_group)} · ${escapeHtml(event.state)}</time><span>${escapeHtml(event.note)}</span></li>`).join("");
  const requestWork = ticket.request_item ? `<section class="card"><h2>Request fulfillment</h2><p><strong>${escapeHtml(ticket.request_item.request_item_id)}</strong> · ${escapeHtml(ticket.request_item.requested_service)}</p><p>${pill(ticket.request_item.approval_state, "met")} ${pill(ticket.request_item.state, "neutral")}</p><ul class="compact-list">${ticket.request_tasks.map((task) => `<li><strong>${escapeHtml(task.task_id)}</strong> · ${escapeHtml(task.assignment_group)}<br>${escapeHtml(task.task_summary)}</li>`).join("")}</ul></section>` : "";
  const missNote = lab.intentional_miss_explanations[ticket.ticket_id];
  main.innerHTML = `${tourPanel()}<p class="crumb"><a href="#/tickets">Tickets</a> / ${escapeHtml(ticket.ticket_id)}</p><section class="detail-top"><div><p class="eyebrow">${escapeHtml(ticket.type)} · completed fictional record</p><h1>${escapeHtml(ticket.ticket_id)} — ${escapeHtml(ticket.summary)}</h1><div class="detail-meta">${pill(ticket.priority, ticket.priority === "P1" ? "missed" : "warning")}${slaPill(ticket)}${booleanPill(ticket.event_derived_escalated, "Escalated", "No escalation")}${booleanPill(ticket.event_derived_fcr, "First-contact resolution", "Not first-contact")}</div></div><button class="button-secondary" data-action="copy-link">Copy record link</button></section>
    ${missNote ? `<p class="callout"><strong>Intentional fictional SLA exception:</strong> ${escapeHtml(missNote)}</p>` : ""}
    <section class="detail-grid"><div><h2>Event timeline</h2><ol class="timeline">${timeline}</ol></div><aside class="record-panel"><h2>Record context</h2><dl class="detail-dl"><dt>Caller</dt><dd>${person ? `<a href="${personLink(person.user_id)}">${escapeHtml(person.display_name)}</a>` : escapeHtml(ticket.caller)}</dd><dt>Asset</dt><dd>${asset ? `<a href="${assetLink(asset.asset_id)}">${escapeHtml(asset.asset_id)}</a>` : escapeHtml(ticket.asset_id)}</dd><dt>Environment</dt><dd>${escapeHtml(ticket.environment)}</dd><dt>Final resolver</dt><dd>${escapeHtml(ticket.assignment_group)}</dd><dt>Opened</dt><dd>${escapeHtml(utc(ticket.opened_at))} UTC</dd><dt>Legacy ID</dt><dd>${escapeHtml(ticket.legacy_id || "None")}</dd></dl></aside></section>
    <section class="detail-grid"><div class="narrative"><article class="card"><h2>Initial report</h2><p>${escapeHtml(ticket.initial_report)}</p></article><article class="card"><h2>Diagnostic observations</h2><p>${escapeHtml(ticket.diagnostic_summary)}</p></article><article class="card"><h2>Root cause or bounded finding</h2><p>${escapeHtml(ticket.root_cause)}</p></article><article class="card"><h2>Resolution and validation</h2><p><strong>Resolution:</strong> ${escapeHtml(ticket.resolution)}</p><p><strong>Validation:</strong> ${escapeHtml(ticket.validation)}</p></article><article class="card"><h2>User communication</h2><p>${escapeHtml(ticket.user_communication)}</p></article></div><aside class="key-value"><section class="record-panel"><h2>Simplified SLA</h2><div><strong>First response</strong><br>${formatMinutes(ticket.response_minutes)} actual · target ${ticket.priority === "P1" ? "15 min" : ticket.priority === "P2" ? "30 min" : ticket.priority === "P3" ? "4.0 hr" : "24.0 hr"}<br>${ticket.response_met ? pill("Target met", "met") : pill("Target missed", "missed")}</div><div><strong>Resolution</strong><br>${formatMinutes(ticket.resolution_minutes)} actual<br>${ticket.resolution_met ? pill("Target met", "met") : pill("Target missed", "missed")}</div></section>
      <section class="record-panel"><h2>Related knowledge &amp; evidence</h2><p>${kb ? externalPath(kb.path, `${kb.id} — ${kb.title}`) : "No linked KB for this fictional record."}</p><p>${ticket.evidence_ref !== "none" ? `${pill("Sample output", "neutral")} ${externalPath(ticket.evidence_ref, "View committed sample evidence")}` : `No committed evidence. ${externalPath(lab.evidence_guide, "Use the capture guide")}.`}</p></section>${ticket.event_derived_escalated ? `<section class="record-panel"><h2>Escalation handoff</h2><p>Tier 1 documented the fictional client-side facts, stayed within scope, and handed the record to <strong>${escapeHtml(ticket.assignment_group)}</strong>.</p></section>` : ""}</aside></section>${requestWork}`;
}

function renderAssets() {
  navState("assets");
  const visible = lab.assets.filter((asset) => (!assetFilter.status || asset.status === assetFilter.status) && (!assetFilter.department || asset.department === assetFilter.department) && (!assetFilter.location || asset.location === assetFilter.location) && (!assetFilter.type || asset.asset_type === assetFilter.type));
  const assetCards = visible.map((asset) => `<article class="card"><div class="ticket-card-header"><a class="record-id" href="${assetLink(asset.asset_id)}">${escapeHtml(asset.asset_id)}</a>${pill(asset.status, asset.status === "Assigned" ? "met" : asset.status === "Repair" ? "warning" : "neutral")}</div><h3>${escapeHtml(asset.manufacturer)} ${escapeHtml(asset.model)}</h3><p>${escapeHtml(asset.asset_type)} · ${escapeHtml(asset.location)}</p><p><strong>Assigned:</strong> ${asset.assigned_user_id ? `<a href="${personLink(asset.assigned_user_id)}">${escapeHtml(asset.assigned_to)}</a>` : "No assigned user"}<br><strong>Related records:</strong> ${asset.related_ticket_ids.length}</p></article>`).join("");
  const people = lab.people.map((person) => `<li><a href="${personLink(person.user_id)}"><strong>${escapeHtml(person.display_name)}</strong></a> · ${escapeHtml(person.department)}<br><small>${escapeHtml(person.work_arrangement)} · ${person.related_ticket_ids.length} related fictional records</small></li>`).join("");
  main.innerHTML = `${tourPanel()}${pageHead("Fictional inventory relationships", "Assets and people", "Browse synthetic Windows assets and their modeled relationships to fictional users and completed support records. No live device actions are available here.")}
    <form class="filter-panel" id="asset-filters"><div class="filter-grid"><div class="field"><label for="asset-status">Lifecycle status</label><select id="asset-status" name="status">${selectOptions(unique(lab.assets.map((asset) => asset.status)), assetFilter.status, "statuses")}</select></div><div class="field"><label for="asset-department">Department</label><select id="asset-department" name="department">${selectOptions(unique(lab.assets.map((asset) => asset.department)), assetFilter.department, "departments")}</select></div><div class="field"><label for="asset-location">Location</label><select id="asset-location" name="location">${selectOptions(unique(lab.assets.map((asset) => asset.location)), assetFilter.location, "locations")}</select></div><div class="field"><label for="asset-type">Asset type</label><select id="asset-type" name="type">${selectOptions(unique(lab.assets.map((asset) => asset.asset_type)), assetFilter.type, "asset types")}</select></div></div></form>
    <div class="filter-summary"><p aria-live="polite"><strong>${visible.length}</strong> of ${lab.assets.length} synthetic assets shown.</p><button class="link-button" data-action="clear-asset-filters">Clear asset filters</button></div><section class="case-grid">${assetCards}</section><section class="panel-grid"><article class="card"><h2>People directory</h2><p>Representative fictional directory for a 75-person company model; it is not a complete employee directory.</p><ul class="compact-list">${people}</ul></article><article class="card"><h2>Lifecycle language</h2><p><strong>Assigned</strong> means the fictional asset is in use. <strong>Recovered</strong> means custody was returned. <strong>Stock</strong> means available for approved fulfillment. <strong>Repair</strong> needs remediation before reassignment.</p></article></section>`;
  document.querySelector("#asset-filters").addEventListener("change", (event) => { assetFilter = { ...assetFilter, [event.target.name]: event.target.value }; renderAssets(); });
}

function renderAsset(id) {
  const asset = lab.assets.find((candidate) => candidate.asset_id === id);
  if (!asset) return renderNotFound("Asset not found", "This synthetic inventory record does not exist.");
  navState("assets");
  const tickets = asset.related_ticket_ids.map((ticketId) => lab.tickets.find((ticket) => ticket.ticket_id === ticketId)).filter(Boolean);
  main.innerHTML = `${tourPanel()}<p class="crumb"><a href="#/assets">Inventory</a> / ${escapeHtml(asset.asset_id)}</p>${pageHead("Synthetic asset record", `${asset.asset_id} — ${asset.manufacturer} ${asset.model}`, "Fictional inventory context only. This view cannot perform remote actions, wipes, or account changes.")}
    <section class="detail-grid"><article class="record-panel"><h2>Asset details</h2><dl class="detail-dl"><dt>Status</dt><dd>${pill(asset.status, asset.status === "Assigned" ? "met" : "neutral")}</dd><dt>Type</dt><dd>${escapeHtml(asset.asset_type)}</dd><dt>Hostname</dt><dd>${escapeHtml(asset.hostname)}</dd><dt>Synthetic serial</dt><dd>${escapeHtml(asset.synthetic_serial)}</dd><dt>Location</dt><dd>${escapeHtml(asset.location)}</dd><dt>Last verified</dt><dd>${escapeHtml(asset.last_verified)}</dd><dt>Assigned user</dt><dd>${asset.assigned_user_id ? `<a href="${personLink(asset.assigned_user_id)}">${escapeHtml(asset.assigned_to)}</a>` : "No assigned user"}</dd></dl></article><article class="record-panel"><h2>Related historical records</h2>${tickets.length ? `<ul class="compact-list">${tickets.map((ticket) => `<li><a href="${recordLink(ticket.ticket_id)}"><strong>${escapeHtml(ticket.ticket_id)}</strong> — ${escapeHtml(ticket.summary)}</a><br>${slaPill(ticket)} ${booleanPill(ticket.event_derived_escalated, "Escalated", "No escalation")}</li>`).join("")}</ul>` : "No related records in this fictional dataset."}</article></section>`;
}

function renderPerson(id) {
  const person = lab.people.find((candidate) => candidate.user_id === id);
  if (!person) return renderNotFound("Person not found", "This fictional person record does not exist.");
  navState("assets");
  const asset = lab.assets.find((candidate) => candidate.asset_id === person.asset_id);
  const tickets = person.related_ticket_ids.map((ticketId) => lab.tickets.find((ticket) => ticket.ticket_id === ticketId)).filter(Boolean);
  main.innerHTML = `${tourPanel()}<p class="crumb"><a href="#/assets">Inventory</a> / ${escapeHtml(person.display_name)}</p>${pageHead("Fictional person record", person.display_name, "Representative fictional directory context. It is used only to demonstrate ticket and asset relationships.")}
    <section class="detail-grid"><article class="record-panel"><h2>Person context</h2><dl class="detail-dl"><dt>Department</dt><dd>${escapeHtml(person.department)}</dd><dt>Title</dt><dd>${escapeHtml(person.title)}</dd><dt>Work arrangement</dt><dd>${escapeHtml(person.work_arrangement)}</dd><dt>Identity</dt><dd>${escapeHtml(person.user_principal_name)}</dd><dt>Assigned asset</dt><dd>${asset ? `<a href="${assetLink(asset.asset_id)}">${escapeHtml(asset.asset_id)}</a>` : "None"}</dd></dl></article><article class="record-panel"><h2>Related historical records</h2><ul class="compact-list">${tickets.map((ticket) => `<li><a href="${recordLink(ticket.ticket_id)}"><strong>${escapeHtml(ticket.ticket_id)}</strong> — ${escapeHtml(ticket.summary)}</a><br>${escapeHtml(ticket.category)} · ${slaPill(ticket)}</li>`).join("")}</ul></article></section>`;
}

function renderPlaybooks() {
  navState("playbooks");
  const kbRows = lab.kb.map((article) => `<li><a href="${externalPath(article.path).match(/href="([^"]+)"/)[1]}"><strong>${escapeHtml(article.id)}</strong> — ${escapeHtml(article.title)}</a></li>`).join("");
  main.innerHTML = `${tourPanel()}${pageHead("Repeatable support decisions", "Playbooks and knowledge", "Concise fictional workflows show the information, approval, validation, and escalation boundaries behind the portfolio records.")}
    <section class="panel-grid"><article class="card"><h2>Onboarding</h2><ol class="step-list"><li><strong>Verify inputs</strong><br>Approved requester, start date, manager, job function, and fulfillment scope.</li><li><strong>Prepare least-privilege access</strong><br>Create a disabled synthetic identity and route tenant or device work to the approved resolver group.</li><li><strong>Assign and validate asset</strong><br>Document synthetic asset custody, profile readiness, and first-sign-in checklist.</li><li><strong>Close with evidence</strong><br>Record approval, task outcomes, validation, and a plain-language update.</li></ol>${externalPath("docs/workflows/ONBOARDING.md", "Read the full onboarding workflow")}</article><article class="card"><h2>Offboarding</h2><ol class="step-list"><li><strong>Confirm authority and timing</strong><br>Verify the approved request and any security or legal hold before making changes.</li><li><strong>Contain within scope</strong><br>Use the marked lab account controls only; route non-Tier 1 work through the escalation matrix.</li><li><strong>Recover custody</strong><br>Record the synthetic asset tag, recovery status, and handoff.</li><li><strong>Validate and document</strong><br>Confirm the fictional record state and complete task outcomes.</li></ol>${externalPath("docs/workflows/OFFBOARDING.md", "Read the full offboarding workflow")}</article></section>
    <section class="panel-grid"><article class="card"><h2>Knowledge base</h2><p>Search is intentionally simple: use your browser find command or choose an article below. The console never presents documentation as a production knowledge system.</p><ul class="compact-list">${kbRows}</ul></article><article class="card"><h2>Escalation matrix</h2><table><caption>Fictional Tier 1 handoff expectations.</caption><thead><tr><th>Trigger</th><th>Tier 1 responsibility</th><th>Destination</th></tr></thead><tbody><tr><td>Suspicious sign-in or phishing</td><td>Preserve safe facts, give user guidance, do not investigate beyond scope</td><td>Security Operations</td></tr><tr><td>DNS, VPN, route, or infrastructure fault</td><td>Capture safe client observations and scope</td><td>Network Operations</td></tr><tr><td>Tenant, mailbox, or identity entitlement</td><td>Verify approval and document requested outcome</td><td>Microsoft 365 Support</td></tr><tr><td>Enrollment or compliance profile</td><td>Verify asset and fulfillment inputs</td><td>Endpoint Management</td></tr></tbody></table>${externalPath("docs/workflows/ESCALATION_MATRIX.md", "Read the full escalation matrix")}</article></section>
    <section class="architecture"><h2>Architecture and trust boundary</h2><pre aria-label="Text diagram: fictional users enter the service desk. Tier 1 uses a Windows lab client, optional Active Directory and DNS lab, and simulated cloud workflows. Escalations go to fictional resolver groups. Canonical fictional data is validated and rendered into the console and GitHub portfolio.">Fictional users → Tier 1 service desk → Windows support workflow
                              ├─ Optional AD/DNS learning lab (sentinel-marked)
                              ├─ Simulated M365 / Entra / Intune concepts
                              └─ Fictional resolver groups

Canonical fictional CSV + events → validator → reports / import staging / static console → GitHub portfolio</pre><p>Trust boundary: this repository does not connect to a real tenant, ServiceNow instance, VPN, or unmarked Active Directory domain.</p>${externalPath("docs/ARCHITECTURE.md", "Read full architecture documentation")}</section>`;
}

function renderEvidence() {
  navState("evidence");
  const rows = lab.tickets.map((ticket) => `<tr><td><a class="record-id" href="${recordLink(ticket.ticket_id)}">${escapeHtml(ticket.ticket_id)}</a></td><td>${ticket.evidence_ref === "none" ? pill("No committed evidence", "neutral") : pill("Sample output", "neutral")}</td><td>${ticket.evidence_ref === "none" ? `Use ${externalPath(lab.evidence_guide, "the capture guide")}` : externalPath(ticket.evidence_ref, "View committed sample")}</td></tr>`).join("");
  main.innerHTML = `${tourPanel()}${pageHead("Evidence boundaries", "What this project proves—and what it does not", "The fictional records, metrics, and application views demonstrate project design, documentation, and safe lab workflow thinking. They do not demonstrate production access or employment.")}
    <section class="panel-grid"><article class="card"><h2>Evidence labels</h2><dl class="detail-dl"><dt>${pill("SIMULATED", "neutral")}</dt><dd>Fictional records, people, assets, and outcomes created for this portfolio.</dd><dt>${pill("SAMPLE OUTPUT", "neutral")}</dt><dd>Committed text examples of what an evidence artifact can look like.</dd><dt>${pill("APPLICATION SCREENSHOT", "met")}</dt><dd>Genuine screenshot of this console showing simulated data; proves the application was built, not third-party platform experience.</dd><dt>${pill("LAB-EXECUTED", "warning")}</dt><dd>Reserved for sanitized evidence personally captured in an authorized lab.</dd></dl></article><article class="card"><h2>Source of truth and controls</h2><p>The canonical fictional records and events are validated before derived Markdown, metrics, import staging files, or browser data can be generated.</p><ul><li>Event-derived response, escalation, FCR, and SLA calculations.</li><li>Schema, relationship, path-containment, and stale-artifact checks.</li><li>Marked-OU and allowlisted-group safety controls in mutation scripts.</li><li>Local-only evidence staging under a Git-ignored private folder.</li></ul><a href="#/playbooks">Review workflow boundaries</a></article></section>
    <section><h2>Evidence ledger</h2><div class="table-wrap"><table class="evidence-table"><caption>Per-record committed evidence status. A missing evidence file is shown honestly rather than replaced with a fabricated screenshot.</caption><thead><tr><th>Record</th><th>Label</th><th>Reference</th></tr></thead><tbody>${rows}</tbody></table></div></section>
    <section class="callout"><strong>Personal next step:</strong> perform a small number of cases in an isolated Windows/AD or ServiceNow learning lab, capture your own redacted evidence, and label it LAB-EXECUTED only after you personally performed it.</section>`;
}

function renderNotFound(title, text) { navState(""); main.innerHTML = `<div class="empty-state"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p><a class="button" href="#/overview">Return to overview</a></div>`; }

function render() {
  const pieces = route().split("/").filter(Boolean);
  const [section, identifier] = pieces;
  if (section === "overview") renderOverview();
  else if (section === "tickets" && identifier) ticketDetail(decodeURIComponent(identifier));
  else if (section === "tickets") renderTickets();
  else if (section === "assets" && identifier) renderAsset(decodeURIComponent(identifier));
  else if (section === "assets") renderAssets();
  else if (section === "people" && identifier) renderPerson(decodeURIComponent(identifier));
  else if (section === "playbooks") renderPlaybooks();
  else if (section === "evidence") renderEvidence();
  else renderNotFound("Page not found", "Choose a route from the primary navigation.");
  main.focus({ preventScroll: true });
}

main.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "start-tour") {
    tourStep = 0;
    if (location.hash === tour[tourStep].route) render(); else location.hash = tour[tourStep].route;
  }
  if (action === "next-tour") { tourStep += 1; if (tourStep >= tour.length) { tourStep = null; location.hash = "#/overview"; } else { location.hash = tour[tourStep].route; } }
  if (action === "end-tour") { tourStep = null; render(); }
  if (action === "clear-ticket-filters") { ticketFilters = { query: "", priority: "", category: "", type: "", sla: "", escalated: "", fcr: "", group: "", sort: "id-asc" }; renderTickets(); }
  if (action === "clear-asset-filters") { assetFilter = { status: "", department: "", location: "", type: "" }; renderAssets(); }
  if (action === "copy-link") {
    const url = `${location.origin}${location.pathname}${location.hash}`;
    try { await navigator.clipboard.writeText(url); event.target.textContent = "Link copied"; } catch { event.target.textContent = "Copy unavailable"; }
  }
});

window.addEventListener("hashchange", render);

async function boot() {
  try {
    const response = await fetch("data/lab.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`data/lab.json returned ${response.status}`);
    lab = await response.json();
    label.textContent = lab.label;
    render();
  } catch (error) {
    main.innerHTML = `<div class="empty-state"><h1>Console data is unavailable</h1><p>Run <code>python tools/labtool.py generate</code> from the repository root, then start the console with <code>python tools/labtool.py serve</code>.</p><p>${escapeHtml(error.message)}</p></div>`;
  }
}

boot();
