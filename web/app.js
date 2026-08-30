import { sortTickets, ticketMatches } from "./filters.js";

const main = document.querySelector("main");
const label = document.querySelector("#simulation-label");
const sourceRoot = "https://github.com/vxti-glitch/enterprise-helpdesk-operations-lab/blob/main/";
const baseTitle = "Northstar Help Desk Operations Console";
let lab;
let booted = false;
let tourStep = null;
let assetFilter = { status: "", department: "", location: "", type: "" };
let ticketFilters = { query: "", priority: "", category: "", type: "", sla: "", escalated: "", fcr: "", group: "", sort: "id-asc" };

const tour = [
  { route: "#/overview", title: "Start with the event-derived overview", text: "The dashboard makes the fictional scope, metrics, and intentionally difficult SLA cases clear in seconds." },
  { route: "#/tickets/INC012", title: "Follow a diagnosis", text: "INC012 traces a DNS symptom through isolation, resolution, validation, and user communication." },
  { route: "#/tickets/INC009", title: "Review security scope discipline", text: "INC009 documents what Tier 1 recorded, escalated, and did not claim to investigate." },
  { route: "#/assets/NS-LT-005", title: "Connect support work to inventory", text: "The asset view links a fictional device, user, and historical records." },
];

function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
function unique(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function route() { return location.hash.replace(/^#/, "") || "/overview"; }
function recordLink(id) { return `#/tickets/${encodeURIComponent(id)}`; }
function assetLink(id) { return `#/assets/${encodeURIComponent(id)}`; }
function personLink(id) { return `#/people/${encodeURIComponent(id)}`; }
function formatMinutes(value) {
  const rendered = Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
  if (value < 60) return `${rendered} min`;
  if (value < 2880) return `${(value / 60).toFixed(1)} hr`;
  return `${(value / 1440).toFixed(1)} days`;
}
function utc(value) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)); }
function pill(text, type = "neutral") { return `<span class="pill ${type}">${escapeHtml(text)}</span>`; }
function slaPill(ticket) { return ticket.sla_met ? pill("SLA met", "met") : pill("SLA missed", "missed"); }
function booleanPill(value, yes, no, yesType = "met") { return value ? pill(yes, yesType) : pill(no, "neutral"); }
function externalPath(path, text = path) { return `<a href="${sourceRoot}${encodeURI(path)}">${escapeHtml(text)}</a>`; }
function pageHead(eyebrow, title, description) { return `<section class="page-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p class="lede">${escapeHtml(description)}</p></section>`; }
function personFor(ticket) { return lab.people.find((person) => person.user_id === ticket.caller_id); }
function userFor(id) { return lab.people.find((person) => person.user_id === id); }
function assetFor(ticket) { return lab.assets.find((asset) => asset.asset_id === ticket.asset_id); }
function kbFor(id) { return lab.kb.find((article) => article.id === id); }

function setDocument(title, description) {
  document.title = `${title} | ${baseTitle}`;
  document.querySelector("link[rel=canonical]")?.setAttribute("href", `${location.origin}${location.pathname}`);
  document.querySelector("meta[property='og:title']")?.setAttribute("content", `${title} | ${baseTitle}`);
  document.querySelector("meta[property='og:description']")?.setAttribute("content", description);
}

function navState(current) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === current;
    if (active) {
      link.setAttribute("aria-current", "page");
      requestAnimationFrame(() => link.scrollIntoView({ block: "nearest", inline: "center" }));
    } else link.removeAttribute("aria-current");
  });
}

function tourPanel() {
  if (tourStep === null) return "";
  const item = tour[tourStep];
  return `<section class="tour" aria-labelledby="tour-heading" tabindex="-1" data-tour><div><p class="eyebrow" aria-live="polite">90-second reviewer tour · ${tourStep + 1} of ${tour.length}</p><h2 id="tour-heading">${escapeHtml(item.title)}</h2><p>${escapeHtml(item.text)}</p></div><div class="button-row"><button class="button-secondary" data-action="end-tour">End tour</button><button class="button" data-action="next-tour">${tourStep === tour.length - 1 ? "Finish tour" : "Next stop"}</button></div></section>`;
}

function renderOverview() {
  navState("overview");
  const metrics = lab.metrics;
  const bars = Object.entries(metrics.by_priority).map(([priority, row]) => `<div class="bar-row"><strong>${priority}</strong><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${row.compliance_percent}%"></div></div><small>${row.both_met}/${row.tickets} · ${row.compliance_percent}%</small></div>`).join("");
  const barText = Object.entries(metrics.by_priority).map(([priority, row]) => `${priority} ${row.compliance_percent} percent`).join(", ");
  const misses = metrics.missed_sla_tickets.map((item) => `<li><a href="${recordLink(item.ticket_id)}"><strong>${item.ticket_id}</strong> · ${item.priority} · ${item.missed_measure} target missed<br><span>${escapeHtml(lab.intentional_miss_explanations[item.ticket_id])}</span></a></li>`).join("");
  const cases = lab.featured_ticket_ids.map((id) => lab.tickets.find((ticket) => ticket.ticket_id === id)).filter(Boolean).map((ticket) => `<article class="card case-card"><div class="ticket-card-header"><span class="record-id">${ticket.ticket_id}</span>${slaPill(ticket)}</div><h3>${escapeHtml(ticket.summary)}</h3><p>${escapeHtml(ticket.category)} · ${ticket.event_derived_escalated ? "escalation judgment" : "Tier 1 resolution"}</p><a href="${recordLink(ticket.ticket_id)}" aria-label="Open case ${ticket.ticket_id}: ${escapeHtml(ticket.summary)}">Open case <span aria-hidden="true">→</span></a></article>`).join("");
  const categories = Object.entries(metrics.by_category).sort((a, b) => b[1] - a[1]).map(([category, count]) => `<li><strong>${escapeHtml(category)}</strong><br><span>${count} fictional record${count === 1 ? "" : "s"}</span></li>`).join("");
  const metric = (value, text) => `<article class="metric"><span class="value">${escapeHtml(value)}</span><small>${escapeHtml(text)}</small></article>`;
  main.innerHTML = `${tourPanel()}<section class="hero"><div>${pageHead("Historical operations snapshot", "Make the help-desk story easy to review.", "A static, event-derived console built from fictional Northstar portfolio records. It is an interview study tool—not a live ticket queue or a claim of employment.")}<div class="button-row"><button class="button" data-action="start-tour">Start 90-second tour</button><a class="button-secondary" href="#/tickets">Explore all records</a></div></div><aside class="hero-note"><strong>How to read this project</strong><p>Metrics and timelines derive from committed fictional events. The three missed targets remain visible by design to show prioritization and escalation reasoning.</p><a href="#/evidence">See evidence boundaries and capture guidance</a></aside></section><section class="metric-grid" aria-label="Event-derived simulated portfolio metrics">${metric(metrics.ticket_count, "historical fictional records")}${metric(`${metrics.sla_compliant}/${metrics.ticket_count}`, `${metrics.sla_compliance_percent}% simplified SLA compliance`)}${metric(`${metrics.first_contact_resolutions}/${metrics.ticket_count}`, `${metrics.first_contact_resolution_percent}% first-contact resolution`)}${metric(`${metrics.escalations}/${metrics.ticket_count}`, `${metrics.escalation_percent}% documented escalation`)}</section><section class="panel-grid"><article class="card"><h2>Compliance by priority</h2><p>Continuous elapsed-time model; no business-hours or pause-state exclusions.</p><div class="bar-list" role="img" aria-label="Simplified SLA compliance: ${escapeHtml(barText)}.">${bars}</div></article><article class="card"><h2>Read the misses, not just the percentage</h2><p>These intentional fictional exceptions are more useful in an interview than a perfect score.</p><ul class="miss-list">${misses}</ul></article></section><section><h2>Four cases worth discussing</h2><div class="case-grid">${cases}</div></section><section class="panel-grid"><article class="card"><h2>Category volume</h2><ul class="compact-list">${categories}</ul></article><article class="card"><h2>Metric context</h2><p><strong>Median first response:</strong> ${formatMinutes(metrics.median_response_minutes)}<br><strong>Median resolution:</strong> ${formatMinutes(metrics.median_resolution_minutes)}<br><strong>Average resolution:</strong> ${formatMinutes(metrics.average_resolution_minutes)}</p><p>The average resolution time is intentionally pulled upward by the three retained long-running fictional cases.</p><a href="#/tickets">Filter the full historical snapshot</a></article></section>`;
  return ["Overview", "A simulated, event-derived enterprise help-desk portfolio lab."];
}

function selectOptions(values, selected, labelText) { return `<option value="">All ${escapeHtml(labelText)}</option>${values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}`; }
function ticketRow(ticket) { return `<tr><td><a class="record-id" href="${recordLink(ticket.ticket_id)}">${ticket.ticket_id}</a>${ticket.legacy_id ? `<br><small>Legacy ${ticket.legacy_id}</small>` : ""}</td><td><a href="${recordLink(ticket.ticket_id)}">${escapeHtml(ticket.summary)}</a><br><small>${escapeHtml(ticket.caller)} · ${escapeHtml(ticket.category)}</small></td><td>${pill(ticket.priority, ticket.priority === "P1" ? "missed" : ticket.priority === "P2" ? "warning" : "neutral")}</td><td>${escapeHtml(ticket.type)}</td><td>${escapeHtml(ticket.assignment_group)}</td><td>${slaPill(ticket)}</td><td>${formatMinutes(ticket.response_minutes)}</td><td>${formatMinutes(ticket.resolution_minutes)}</td></tr>`; }
function ticketCard(ticket) { return `<article class="ticket-card"><div class="ticket-card-header"><a class="record-id" href="${recordLink(ticket.ticket_id)}">${ticket.ticket_id}</a>${slaPill(ticket)}</div><h3><a href="${recordLink(ticket.ticket_id)}">${escapeHtml(ticket.summary)}</a></h3><p>${pill(ticket.priority)} ${booleanPill(ticket.event_derived_escalated, "Escalated", "No escalation")}</p><dl><dt>Caller</dt><dd>${escapeHtml(ticket.caller)}</dd><dt>Category</dt><dd>${escapeHtml(ticket.category)}</dd><dt>Final resolver</dt><dd>${escapeHtml(ticket.assignment_group)}</dd><dt>Response</dt><dd>${formatMinutes(ticket.response_minutes)}</dd></dl></article>`; }
function matchingTickets() { return sortTickets(lab.tickets.filter((ticket) => ticketMatches(ticket, ticketFilters)), ticketFilters.sort); }

function queueStrip() {
  const queues = [
    { key: "all", label: "All records", count: lab.tickets.length },
    { key: "tier1", label: "Tier 1 resolved", count: lab.tickets.filter((ticket) => ticket.assignment_group === "Service Desk Tier 1").length },
    { key: "escalated", label: "Escalated", count: lab.tickets.filter((ticket) => ticket.event_derived_escalated).length },
    { key: "sla-missed", label: "SLA missed", count: lab.tickets.filter((ticket) => !ticket.sla_met).length },
    { key: "priority", label: "P1 priority", count: lab.tickets.filter((ticket) => ticket.priority === "P1").length },
  ];
  return `<nav class="queue-strip" aria-label="Saved technician views"><span class="queue-label">Saved views</span>${queues.map((queue) => `<button type="button" data-action="apply-queue" data-queue="${queue.key}"><span>${queue.label}</span><strong>${queue.count}</strong></button>`).join("")}</nav>`;
}

function applyQueue(queue) {
  ticketFilters = { query: "", priority: "", category: "", type: "", sla: "", escalated: "", fcr: "", group: "", sort: "id-asc" };
  if (queue === "tier1") ticketFilters.group = "Service Desk Tier 1";
  else if (queue === "escalated") ticketFilters.escalated = "true";
  else if (queue === "sla-missed") ticketFilters.sla = "false";
  else if (queue === "priority") ticketFilters.priority = "P1";
  render();
}

function noteComposer(ticket) {
  return `<section class="note-composer card" aria-labelledby="note-composer-title"><div class="composer-heading"><div><p class="eyebrow">Technician workspace</p><h2 id="note-composer-title">Draft an update</h2></div><span class="pill neutral">Local simulation</span></div><div class="note-tabs" role="tablist" aria-label="Update visibility"><button type="button" class="is-active" role="tab" aria-selected="true" data-action="note-type" data-note-type="Internal">Internal work note</button><button type="button" role="tab" aria-selected="false" data-action="note-type" data-note-type="User-facing">Public reply</button></div><label for="note-draft">Update for ${escapeHtml(ticket.ticket_id)}</label><textarea id="note-draft" rows="4" placeholder="Document the evidence collected, action taken, validation, or next owner."></textarea><div class="composer-actions"><p id="note-status" role="status" aria-live="polite">Drafts stay in this browser and are not saved.</p><button class="button" type="button" data-action="add-note" data-note-type="Internal">Add simulated work note</button></div></section>`;
}

function renderTicketResults() {
  const matching = matchingTickets();
  const active = Object.entries(ticketFilters).filter(([key, value]) => value && key !== "sort").length;
  document.querySelector("#filter-result").innerHTML = `<strong>${matching.length}</strong> of ${lab.tickets.length} records shown${active ? ` · ${active} active filter${active === 1 ? "" : "s"}` : ""}.`;
  document.querySelector("#ticket-results").innerHTML = matching.length ? `<h2 class="sr-only">Matching records</h2><div class="ticket-table-wrap"><table><caption>Historical fictional help-desk records. Select a record to inspect its event timeline and supporting relationships.</caption><thead><tr><th>Record</th><th>Summary</th><th>Priority</th><th>Type</th><th>Final resolver</th><th>SLA</th><th>Response</th><th>Resolution</th></tr></thead><tbody>${matching.map(ticketRow).join("")}</tbody></table></div><div class="ticket-cards">${matching.map(ticketCard).join("")}</div>` : `<div class="empty-state"><h2>No records match these filters</h2><p>Clear one or more filters, or search for a known record such as INC009.</p><button class="button" data-action="clear-ticket-filters">Clear all filters</button></div>`;
}

function renderTickets() {
  navState("tickets");
  const categories = unique(lab.tickets.map((ticket) => ticket.category));
  const groups = unique(lab.tickets.map((ticket) => ticket.assignment_group));
  main.innerHTML = `${tourPanel()}${pageHead("Historical fictional records", "Ticket explorer", "Search and combine event-derived filters. Every record is closed because this is a completed historical portfolio snapshot, not a live queue.")}${queueStrip()}<form class="filter-panel" id="ticket-filters"><div class="primary-filter-grid"><div class="field"><label for="query">Search records</label><input id="query" name="query" type="search" value="${escapeHtml(ticketFilters.query)}" placeholder="INC009, summary, caller…"></div><div class="field"><label for="sort">Sort by</label><select id="sort" name="sort"><option value="id-asc">Record identifier</option><option value="opened-asc">Opened date, oldest first</option><option value="opened-desc">Opened date, newest first</option><option value="priority-asc">Priority</option><option value="response-asc">Response time, shortest</option><option value="response-desc">Response time, longest</option><option value="resolution-asc">Resolution time, shortest</option><option value="resolution-desc">Resolution time, longest</option></select></div></div><details class="filter-disclosure"><summary>More filters</summary><div class="filter-grid"><div class="field"><label for="priority">Priority</label><select id="priority" name="priority">${selectOptions(["P1", "P2", "P3", "P4"], ticketFilters.priority, "priorities")}</select></div><div class="field"><label for="category">Category</label><select id="category" name="category">${selectOptions(categories, ticketFilters.category, "categories")}</select></div><div class="field"><label for="type">Record type</label><select id="type" name="type">${selectOptions(["Incident", "Service Request"], ticketFilters.type, "record types")}</select></div><div class="field"><label for="sla">SLA result</label><select id="sla" name="sla"><option value="">All SLA results</option><option value="true">Met</option><option value="false">Missed</option></select></div><div class="field"><label for="escalated">Escalation</label><select id="escalated" name="escalated"><option value="">All escalation states</option><option value="true">Escalated</option><option value="false">Not escalated</option></select></div><div class="field"><label for="fcr">First-contact resolution</label><select id="fcr" name="fcr"><option value="">All FCR states</option><option value="true">First-contact resolution</option><option value="false">Not first-contact</option></select></div><div class="field"><label for="group">Final resolver group</label><select id="group" name="group">${selectOptions(groups, ticketFilters.group, "resolver groups")}</select></div></div></details></form><div class="filter-summary"><p id="filter-result" aria-live="polite"></p><button class="link-button" data-action="clear-ticket-filters">Clear all filters</button></div><section id="ticket-results"></section>`;
  const form = document.querySelector("#ticket-filters");
  form.sort.value = ticketFilters.sort;
  form.addEventListener("input", (event) => { ticketFilters = { ...ticketFilters, [event.target.name]: event.target.value }; renderTicketResults(); });
  form.addEventListener("change", (event) => { ticketFilters = { ...ticketFilters, [event.target.name]: event.target.value }; renderTicketResults(); });
  renderTicketResults();
  return ["Tickets", "Search fictional help-desk records and inspect their event-derived relationships."];
}

function ticketDetail(id) {
  const ticket = lab.tickets.find((candidate) => candidate.ticket_id === id || candidate.legacy_id === id);
  if (!ticket) return renderNotFound("Ticket not found", "The record may have been renamed or does not exist in the fictional data set.");
  navState("tickets");
  const person = personFor(ticket);
  const asset = assetFor(ticket);
  const kb = ticket.kb_reference === "none" ? null : kbFor(ticket.kb_reference);
  const timeline = ticket.events.map((event) => `<li><strong>${escapeHtml(event.event_type)}</strong> ${event.visibility === "Internal" ? pill("Internal") : pill("User-facing", "met")}<time>${escapeHtml(utc(event.occurred_at))} UTC · ${escapeHtml(event.assignment_group)} · ${escapeHtml(event.state)}</time><span>${escapeHtml(event.note)}</span></li>`).join("");
  const item = ticket.request_item;
  const requestedBy = item ? userFor(item.requested_by_user_id) : null;
  const requestedFor = item ? userFor(item.requested_for_user_id) : null;
  const requestWork = item ? `<section class="card"><h2>Request fulfillment</h2><p><strong>${escapeHtml(item.request_item_id)}</strong> · ${escapeHtml(item.requested_service)}</p><dl class="detail-dl"><dt>Requested by</dt><dd>${requestedBy ? `<a href="${personLink(requestedBy.user_id)}">${escapeHtml(requestedBy.display_name)}</a>` : escapeHtml(item.requested_by_user_id)}</dd><dt>Requested for</dt><dd>${requestedFor ? `<a href="${personLink(requestedFor.user_id)}">${escapeHtml(requestedFor.display_name)}</a>` : escapeHtml(item.requested_for_user_id)}</dd></dl><p>${pill(item.approval_state, "met")} ${pill(item.state)}</p><ol class="compact-list">${ticket.request_tasks.map((task) => `<li><strong>${escapeHtml(task.task_id)}</strong> · ${escapeHtml(task.assignment_group)}<br>${escapeHtml(task.task_summary)}</li>`).join("")}</ol></section>` : "";
  const missed = lab.intentional_miss_explanations[ticket.ticket_id];
  main.innerHTML = `${tourPanel()}<p class="crumb"><a href="#/tickets">Tickets</a> / ${escapeHtml(ticket.ticket_id)}</p><section class="detail-top"><div><p class="eyebrow">${escapeHtml(ticket.type)} · completed fictional record</p><h1>${escapeHtml(ticket.ticket_id)} — ${escapeHtml(ticket.summary)}</h1><div class="detail-meta">${pill(ticket.priority, ticket.priority === "P1" ? "missed" : "warning")}${slaPill(ticket)}${booleanPill(ticket.event_derived_escalated, "Escalated", "No escalation")}${booleanPill(ticket.event_derived_fcr, "First-contact resolution", "Not first-contact")}</div></div><button class="button-secondary" data-action="copy-link">Copy record link</button></section>${missed ? `<p class="callout"><strong>Intentional fictional SLA exception:</strong> ${escapeHtml(missed)}</p>` : ""}<section class="detail-grid"><div><h2>Event timeline</h2><ol class="timeline">${timeline}</ol>${noteComposer(ticket)}</div><aside class="record-panel"><h2>Record context</h2><dl class="detail-dl"><dt>Caller / beneficiary</dt><dd>${person ? `<a href="${personLink(person.user_id)}">${escapeHtml(person.display_name)}</a>` : escapeHtml(ticket.caller)}</dd><dt>Asset</dt><dd>${asset ? `<a href="${assetLink(asset.asset_id)}">${escapeHtml(asset.asset_id)}</a>` : escapeHtml(ticket.asset_id)}</dd><dt>Environment</dt><dd>${escapeHtml(ticket.environment)}</dd><dt>Assignment group</dt><dd>${escapeHtml(ticket.assignment_group)}</dd><dt>Impact</dt><dd>${escapeHtml(ticket.impact)}</dd><dt>Urgency</dt><dd>${escapeHtml(ticket.urgency)}</dd><dt>Resolution state</dt><dd>${escapeHtml(ticket.resolution_state)}</dd><dt>Final state</dt><dd>${escapeHtml(ticket.final_state)}</dd><dt>Opened</dt><dd>${escapeHtml(utc(ticket.opened_at))} UTC</dd></dl></aside></section><section class="detail-grid"><div class="narrative"><article class="card"><h2>Initial report</h2><p>${escapeHtml(ticket.initial_report)}</p></article><article class="card"><h2>Diagnostic observations</h2><p>${escapeHtml(ticket.diagnostic_summary)}</p></article><article class="card"><h2>Root cause or bounded finding</h2><p>${escapeHtml(ticket.root_cause)}</p></article><article class="card"><h2>Resolution and validation</h2><p><strong>Resolution:</strong> ${escapeHtml(ticket.resolution)}</p><p><strong>Validation:</strong> ${escapeHtml(ticket.validation)}</p></article><article class="card"><h2>User communication</h2><p>${escapeHtml(ticket.user_communication)}</p></article></div><aside class="key-value"><section class="record-panel"><h2>Simplified SLA</h2><div><strong>First response</strong><br>${formatMinutes(ticket.response_minutes)} actual · target ${formatMinutes(ticket.response_target_minutes)}<br>${ticket.response_met ? pill("Target met", "met") : pill("Target missed", "missed")}</div><div><strong>Resolution</strong><br>${formatMinutes(ticket.resolution_minutes)} actual · target ${formatMinutes(ticket.resolution_target_minutes)}<br>${ticket.resolution_met ? pill("Target met", "met") : pill("Target missed", "missed")}</div></section><section class="record-panel"><h2>Related knowledge &amp; evidence</h2><p>${kb ? externalPath(kb.path, `${kb.id} — ${kb.title}`) : "No linked KB for this fictional record."}</p><p>${ticket.evidence_ref !== "none" ? externalPath(ticket.evidence_ref, "View committed sample evidence") : `No committed evidence. ${externalPath(lab.evidence_guide, "Use the capture guide")}.`}</p></section>${ticket.event_derived_escalated ? `<section class="record-panel"><h2>Escalation handoff</h2><p>Tier 1 documented fictional client-side facts, stayed within scope, and handed the record to <strong>${escapeHtml(ticket.assignment_group)}</strong>.</p></section>` : ""}</aside></section>${requestWork}`;
  return [`${ticket.ticket_id} — ${ticket.summary}`, "A completed fictional help-desk record with its event timeline and supporting relationships."];
}

function renderAssets() {
  navState("assets");
  const visible = lab.assets.filter((asset) => (!assetFilter.status || asset.status === assetFilter.status) && (!assetFilter.department || asset.department === assetFilter.department) && (!assetFilter.location || asset.location === assetFilter.location) && (!assetFilter.type || asset.asset_type === assetFilter.type));
  const cards = visible.map((asset) => `<article class="card"><div class="ticket-card-header"><a class="record-id" href="${assetLink(asset.asset_id)}">${asset.asset_id}</a>${pill(asset.status, asset.status === "Assigned" ? "met" : asset.status === "Repair" ? "warning" : "neutral")}</div><h3>${escapeHtml(asset.manufacturer)} ${escapeHtml(asset.model)}</h3><p>${escapeHtml(asset.asset_type)} · ${escapeHtml(asset.location)}</p><p><strong>Assigned:</strong> ${asset.assigned_user_id ? `<a href="${personLink(asset.assigned_user_id)}">${escapeHtml(asset.assigned_to)}</a>` : "No assigned user"}<br><strong>Related records:</strong> ${asset.related_ticket_ids.length}</p></article>`).join("");
  const people = lab.people.map((person) => `<li><a href="${personLink(person.user_id)}"><strong>${escapeHtml(person.display_name)}</strong></a> · ${escapeHtml(person.department)}<br><small>${escapeHtml(person.work_arrangement)} · ${person.related_ticket_ids.length} related fictional records</small></li>`).join("");
  main.innerHTML = `${tourPanel()}${pageHead("Fictional inventory relationships", "Assets and people", "Browse synthetic Windows assets and their modeled relationships to fictional users and completed support records. No live device actions are available here.")}<form class="filter-panel" id="asset-filters"><div class="filter-grid"><div class="field"><label for="asset-status">Lifecycle status</label><select id="asset-status" name="status">${selectOptions(unique(lab.assets.map((asset) => asset.status)), assetFilter.status, "statuses")}</select></div><div class="field"><label for="asset-department">Department</label><select id="asset-department" name="department">${selectOptions(unique(lab.assets.map((asset) => asset.department)), assetFilter.department, "departments")}</select></div><div class="field"><label for="asset-location">Location</label><select id="asset-location" name="location">${selectOptions(unique(lab.assets.map((asset) => asset.location)), assetFilter.location, "locations")}</select></div><div class="field"><label for="asset-type">Asset type</label><select id="asset-type" name="type">${selectOptions(unique(lab.assets.map((asset) => asset.asset_type)), assetFilter.type, "asset types")}</select></div></div></form><div class="filter-summary"><p aria-live="polite"><strong>${visible.length}</strong> of ${lab.assets.length} synthetic assets shown.</p><button class="link-button" data-action="clear-asset-filters">Clear asset filters</button></div><section><h2 class="sr-only">Synthetic asset records</h2><div class="case-grid">${cards}</div></section><section class="panel-grid"><article class="card"><h2>People directory</h2><p>Representative fictional directory for a 75-person company model; it is not a complete employee directory.</p><ul class="compact-list">${people}</ul></article><article class="card"><h2>Lifecycle language</h2><p><strong>Assigned</strong> means the fictional asset is in use. <strong>Recovered</strong> means custody was returned. <strong>Stock</strong> means available for approved fulfillment. <strong>Repair</strong> needs remediation before reassignment.</p></article></section>`;
  document.querySelector("#asset-filters").addEventListener("change", (event) => { assetFilter = { ...assetFilter, [event.target.name]: event.target.value }; render(); });
  return ["Assets and people", "Fictional asset, person, and record relationships for the portfolio lab."];
}

function renderAsset(id) {
  const asset = lab.assets.find((candidate) => candidate.asset_id === id);
  if (!asset) return renderNotFound("Asset not found", "This synthetic inventory record does not exist.");
  navState("assets");
  const tickets = asset.related_ticket_ids.map((ticketId) => lab.tickets.find((ticket) => ticket.ticket_id === ticketId)).filter(Boolean);
  main.innerHTML = `${tourPanel()}<p class="crumb"><a href="#/assets">Inventory</a> / ${asset.asset_id}</p>${pageHead("Synthetic asset record", `${asset.asset_id} — ${asset.manufacturer} ${asset.model}`, "Fictional inventory context only. This view cannot perform remote actions, wipes, or account changes.")}<section class="detail-grid"><article class="record-panel"><h2>Asset details</h2><dl class="detail-dl"><dt>Status</dt><dd>${pill(asset.status, asset.status === "Assigned" ? "met" : "neutral")}</dd><dt>Type</dt><dd>${escapeHtml(asset.asset_type)}</dd><dt>Hostname</dt><dd>${escapeHtml(asset.hostname)}</dd><dt>Synthetic serial</dt><dd>${escapeHtml(asset.synthetic_serial)}</dd><dt>Location</dt><dd>${escapeHtml(asset.location)}</dd><dt>Last verified</dt><dd>${escapeHtml(asset.last_verified)}</dd><dt>Assigned user</dt><dd>${asset.assigned_user_id ? `<a href="${personLink(asset.assigned_user_id)}">${escapeHtml(asset.assigned_to)}</a>` : "No assigned user"}</dd></dl></article><article class="record-panel"><h2>Related historical records</h2>${tickets.length ? `<ul class="compact-list">${tickets.map((ticket) => `<li><a href="${recordLink(ticket.ticket_id)}"><strong>${ticket.ticket_id}</strong> — ${escapeHtml(ticket.summary)}</a><br>${slaPill(ticket)}</li>`).join("")}</ul>` : "No related records in this fictional dataset."}</article></section>`;
  return [`${asset.asset_id} inventory record`, "A fictional asset record connected to related users and cases."];
}

function renderPerson(id) {
  const person = lab.people.find((candidate) => candidate.user_id === id);
  if (!person) return renderNotFound("Person not found", "This fictional person record does not exist.");
  navState("assets");
  const asset = lab.assets.find((candidate) => candidate.asset_id === person.asset_id);
  const tickets = person.related_ticket_ids.map((ticketId) => lab.tickets.find((ticket) => ticket.ticket_id === ticketId)).filter(Boolean);
  main.innerHTML = `${tourPanel()}<p class="crumb"><a href="#/assets">Inventory</a> / ${escapeHtml(person.display_name)}</p>${pageHead("Fictional person record", person.display_name, "Representative fictional directory context. It is used only to demonstrate ticket and asset relationships.")}<section class="detail-grid"><article class="record-panel"><h2>Person context</h2><dl class="detail-dl"><dt>Department</dt><dd>${escapeHtml(person.department)}</dd><dt>Title</dt><dd>${escapeHtml(person.title)}</dd><dt>Work arrangement</dt><dd>${escapeHtml(person.work_arrangement)}</dd><dt>Identity</dt><dd class="wrap-anywhere">${escapeHtml(person.user_principal_name)}</dd><dt>Assigned asset</dt><dd>${asset ? `<a href="${assetLink(asset.asset_id)}">${asset.asset_id}</a>` : "None"}</dd></dl></article><article class="record-panel"><h2>Related historical records</h2><ul class="compact-list">${tickets.map((ticket) => `<li><a href="${recordLink(ticket.ticket_id)}"><strong>${ticket.ticket_id}</strong> — ${escapeHtml(ticket.summary)}</a><br>${escapeHtml(ticket.category)} · ${slaPill(ticket)}</li>`).join("")}</ul></article></section>`;
  return [`${person.display_name} fictional person record`, "A fictional person record used only for ticket and asset relationship modeling."];
}

function renderPlaybooks() {
  navState("playbooks");
  const kb = lab.kb.map((article) => `<li>${externalPath(article.path, `${article.id} — ${article.title}`)}</li>`).join("");
  main.innerHTML = `${tourPanel()}${pageHead("Repeatable support decisions", "Playbooks and knowledge", "Concise fictional workflows show the information, approval, validation, and escalation boundaries behind the portfolio records.")}<section class="panel-grid"><article class="card"><h2>Onboarding</h2><ol class="step-list"><li><strong>Verify inputs</strong><br>Approved requester, start date, manager, job function, and fulfillment scope.</li><li><strong>Prepare least-privilege access</strong><br>Create a disabled synthetic identity and route tenant or device work to the approved resolver group.</li><li><strong>Assign and validate asset</strong><br>Document synthetic asset custody, profile readiness, and first-sign-in checklist.</li><li><strong>Close with evidence</strong><br>Record approval, task outcomes, validation, and a plain-language update.</li></ol>${externalPath("docs/workflows/ONBOARDING.md", "Read the full onboarding workflow")}</article><article class="card"><h2>Offboarding</h2><ol class="step-list"><li><strong>Confirm authority and timing</strong><br>Verify the approved request and any security or legal hold before making changes.</li><li><strong>Contain within scope</strong><br>Use marked lab account controls only; route non-Tier 1 work through the escalation matrix.</li><li><strong>Recover custody</strong><br>Record the synthetic asset tag, recovery status, and handoff.</li><li><strong>Validate and document</strong><br>Confirm the fictional record state and complete task outcomes.</li></ol>${externalPath("docs/workflows/OFFBOARDING.md", "Read the full offboarding workflow")}</article></section><section class="panel-grid"><article class="card"><h2>Knowledge base</h2><p>Search is intentionally simple: use your browser find command or choose an article below. The console never presents documentation as a production knowledge system.</p><ul class="compact-list">${kb}</ul></article><article class="card"><h2>Escalation matrix</h2><div class="table-wrap"><table><caption>Fictional Tier 1 handoff expectations.</caption><thead><tr><th>Trigger</th><th>Tier 1 responsibility</th><th>Destination</th></tr></thead><tbody><tr><td>Suspicious sign-in or phishing</td><td>Preserve safe facts, give user guidance, do not investigate beyond scope</td><td>Security Operations</td></tr><tr><td>DNS, VPN, route, or infrastructure fault</td><td>Capture safe client observations and scope</td><td>Network Operations</td></tr><tr><td>Tenant, mailbox, or identity entitlement</td><td>Verify approval and document requested outcome</td><td>Microsoft 365 Support</td></tr><tr><td>Enrollment or compliance profile</td><td>Verify asset and fulfillment inputs</td><td>Endpoint Management</td></tr></tbody></table></div>${externalPath("docs/workflows/ESCALATION_MATRIX.md", "Read the full escalation matrix")}</article></section><section class="architecture"><h2>Architecture and trust boundary</h2><pre>Fictional users → Tier 1 service desk → Windows support workflow
                              ├─ Optional AD/DNS learning lab (sentinel-marked)
                              ├─ Simulated M365 / Entra / Intune concepts
                              └─ Fictional resolver groups

Canonical fictional CSV + events → validator → reports / import staging / static console → GitHub portfolio</pre><p>Trust boundary: this repository does not connect to a real tenant, ServiceNow instance, VPN, or unmarked Active Directory domain.</p>${externalPath("docs/ARCHITECTURE.md", "Read full architecture documentation")}</section>`;
  return ["Playbooks and knowledge", "Fictional workflows and knowledge articles for the Northstar portfolio lab."];
}

function renderEvidence() {
  navState("evidence");
  const data = lab.tickets.map((ticket) => ({ ticket, label: ticket.evidence_ref === "none" ? "No committed evidence" : "Sample output", path: ticket.evidence_ref === "none" ? null : ticket.evidence_ref }));
  const table = data.map(({ ticket, label: evidenceLabel, path }) => `<tr><td><a class="record-id" href="${recordLink(ticket.ticket_id)}">${ticket.ticket_id}</a></td><td>${pill(evidenceLabel)}</td><td>${path ? externalPath(path, "View committed sample") : `Use ${externalPath(lab.evidence_guide, "the capture guide")}`}</td></tr>`).join("");
  const cards = data.map(({ ticket, label: evidenceLabel, path }) => `<article class="evidence-card"><strong><a class="record-id" href="${recordLink(ticket.ticket_id)}">${ticket.ticket_id}</a></strong>${pill(evidenceLabel)}<p>${path ? externalPath(path, "View committed sample") : `Use ${externalPath(lab.evidence_guide, "the capture guide")}`}</p></article>`).join("");
  main.innerHTML = `${tourPanel()}${pageHead("Evidence boundaries", "What this project proves—and what it does not", "The fictional records, metrics, and application views demonstrate project design, documentation, and safe lab workflow thinking. They do not demonstrate production access or employment.")}<section class="boundary-card card"><div><p class="eyebrow">Portfolio boundaries</p><h2>Review the scope before the metrics</h2><p>Northstar is a completed, event-derived simulation. It demonstrates service-desk workflow design, documentation, data validation, and safe lab controls—not paid support work, production access, or a live queue.</p></div><div class="button-row"><a class="button-secondary" href="https://github.com/vxti-glitch/enterprise-helpdesk-operations-lab/blob/main/docs/SIMULATION_BOUNDARIES.md">Simulation boundaries</a><a class="button-secondary" href="https://github.com/vxti-glitch/enterprise-helpdesk-operations-lab/blob/main/docs/EVIDENCE_GUIDE.md">Evidence guide</a></div></section><section class="capability-map"><h2>Capability map</h2><div class="case-grid"><article class="card"><h3>Ticket triage and prioritization</h3><p><strong>Artifact:</strong> 40 validated fictional records, priority matrix, event timelines and queue filters.</p><p><strong>Limit:</strong> simulated historical data, not production ticket volume.</p></article><article class="card"><h3>Documentation and escalation</h3><p><strong>Artifact:</strong> ticket narratives, work-note composer, escalation matrix and committed sample evidence.</p><p><strong>Limit:</strong> local browser simulation; no external messages are sent.</p></article><article class="card"><h3>SLA and reporting reasoning</h3><p><strong>Artifact:</strong> event-derived response/resolution metrics with three intentional misses and automated tests.</p><p><strong>Limit:</strong> simplified continuous elapsed-time targets, not an employer SLA.</p></article><article class="card"><h3>Identity, endpoint and lifecycle safety</h3><p><strong>Artifact:</strong> onboarding/offboarding playbooks and marked-lab PowerShell guard tests.</p><p><strong>Limit:</strong> no real tenant, production directory, or unmarked environment.</p></article></div></section><section class="panel-grid"><article class="card"><h2>Evidence labels</h2><dl class="detail-dl"><dt>${pill("SIMULATED")}</dt><dd>Fictional records, people, assets, and outcomes created for this portfolio.</dd><dt>${pill("SAMPLE OUTPUT")}</dt><dd>Committed text examples of what an evidence artifact can look like.</dd><dt>${pill("APPLICATION SCREENSHOT", "met")}</dt><dd>Genuine screenshot of this console showing simulated data; proves the application was built, not third-party platform experience.</dd><dt>${pill("LAB-EXECUTED", "warning")}</dt><dd>Reserved for sanitized evidence personally captured in an authorized lab.</dd></dl></article><article class="card"><h2>Source of truth and controls</h2><p>The canonical fictional records and events are validated before derived Markdown, metrics, import staging files, or browser data can be generated.</p><ul><li>Event-derived response, escalation, FCR, and SLA calculations.</li><li>Schema, relationship, path-containment, and stale-artifact checks.</li><li>Marked-OU and allowlisted-group safety controls in mutation scripts.</li><li>Local-only evidence staging under a Git-ignored private folder.</li></ul><a href="#/playbooks">Review workflow boundaries</a></article></section><section><h2>Evidence ledger</h2><div class="evidence-table-wrap"><table class="evidence-table"><caption>Per-record committed evidence status. A missing evidence file is shown honestly rather than replaced with a fabricated screenshot.</caption><thead><tr><th>Record</th><th>Label</th><th>Reference</th></tr></thead><tbody>${table}</tbody></table></div><div class="evidence-cards">${cards}</div></section><section class="callout"><strong>Personal next step:</strong> perform a small number of cases in an isolated Windows/AD or ServiceNow learning lab, capture your own redacted evidence, and label it LAB-EXECUTED only after you personally performed it.</section>`;
  return ["Evidence and about", "What the fictional portfolio lab demonstrates and the boundary for personal evidence."];
}

function renderNotFound(title, text) { navState(""); main.innerHTML = `<div class="empty-state"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p><a class="button" href="#/overview">Return to overview</a></div>`; return [title, text]; }
function manageFocus({ routeChanged, focusTour }) { if (!booted) return; if (routeChanged) window.scrollTo({ top: 0, left: 0, behavior: "auto" }); const target = focusTour ? main.querySelector("[data-tour]") : main.querySelector("h1"); if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); } }

function render({ routeChanged = false, focusTour = false } = {}) {
  const [section, identifier] = route().split("/").filter(Boolean);
  let page;
  if (section === "tour") { tourStep = 0; page = renderOverview(); }
  else if (section === "overview") page = renderOverview();
  else if (section === "tickets" && identifier) page = ticketDetail(decodeURIComponent(identifier));
  else if (section === "tickets") page = renderTickets();
  else if (section === "assets" && identifier) page = renderAsset(decodeURIComponent(identifier));
  else if (section === "assets") page = renderAssets();
  else if (section === "people" && identifier) page = renderPerson(decodeURIComponent(identifier));
  else if (section === "playbooks") page = renderPlaybooks();
  else if (section === "evidence") page = renderEvidence();
  else page = renderNotFound("Page not found", "Choose a route from the primary navigation.");
  setDocument(...page);
  manageFocus({ routeChanged, focusTour: focusTour || tourStep !== null });
  booted = true;
}

main.addEventListener("click", async (event) => {
  const control = event.target.closest("[data-action]");
  const action = control?.dataset.action;
  if (!action) return;
  if (action === "start-tour") { tourStep = 0; if (location.hash === tour[0].route) render({ focusTour: true }); else location.hash = tour[0].route; }
  else if (action === "next-tour") { tourStep += 1; if (tourStep >= tour.length) { tourStep = null; location.hash = "#/overview"; } else location.hash = tour[tourStep].route; }
  else if (action === "end-tour") { tourStep = null; render(); }
  else if (action === "clear-ticket-filters") { ticketFilters = { query: "", priority: "", category: "", type: "", sla: "", escalated: "", fcr: "", group: "", sort: "id-asc" }; document.querySelector("#ticket-filters")?.reset(); renderTicketResults(); document.querySelector("#query")?.focus(); }
  else if (action === "apply-queue") applyQueue(control.dataset.queue);
  else if (action === "clear-asset-filters") { assetFilter = { status: "", department: "", location: "", type: "" }; render(); }
  else if (action === "note-type") {
    document.querySelectorAll("[data-action='note-type']").forEach((button) => {
      const active = button === control;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const addButton = document.querySelector("[data-action='add-note']");
    addButton.dataset.noteType = control.dataset.noteType;
    addButton.textContent = control.dataset.noteType === "Internal" ? "Add simulated work note" : "Add simulated public reply";
  }
  else if (action === "add-note") {
    const draft = document.querySelector("#note-draft");
    const status = document.querySelector("#note-status");
    if (!draft.value.trim()) { status.textContent = "Enter a short update before adding it to the simulated timeline."; draft.focus(); return; }
    const item = document.createElement("li");
    item.className = "draft-event";
    item.innerHTML = `<strong>Draft update</strong> ${pill(control.dataset.noteType, control.dataset.noteType === "User-facing" ? "met" : "neutral")}<time>${escapeHtml(new Date().toLocaleString())} · Browser-only simulation</time><span>${escapeHtml(draft.value.trim())}</span>`;
    document.querySelector(".timeline").appendChild(item);
    draft.value = "";
    status.textContent = "Simulated update added locally. Refreshing the page removes it.";
  }
  else if (action === "copy-link") { try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}${location.hash}`); event.target.textContent = "Link copied"; } catch { event.target.textContent = "Copy unavailable"; } }
});
window.addEventListener("hashchange", () => render({ routeChanged: true, focusTour: tourStep !== null }));

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
