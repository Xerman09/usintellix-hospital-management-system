import { fetchAlerts, fetchAlert, fetchAlertOptions, markAlertRead, markAllAlertsRead, acknowledgeAlert, sendAlert } from "./alerts.service.js?v=2";
import { esc, fmtDateTime, ago, URGENCY_LABEL, openAlertLink, hasLink, refreshAlerts, onAlertsChanged, takePendingAlert } from "./alert-bell.js?v=2";
import { initAlertAdmin, showEscalation, showReport } from "./alerts-admin.js?v=1";
import { fetchPatients } from "../patients/patients.service.js";
import { showToast } from "../../core/toast.js";

const $ = (id) => document.getElementById(id);
let filters = { status: "all", urgency: "", q: "", page: 1 };
let data = null;
let options = null;
let patients = null;
let searchTimer = null;
let unsubscribe = null;
let reloadSeq = 0;
let globalBound = false;

export function initAlerts() {
    const page = $("alpPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    filters = { status: "all", urgency: "", q: "", page: 1 };
    initAlertAdmin({ openModal, closeModal, openDetail });

    // Admin: My alerts / Escalation / Report.
    $("alpPageTabs").addEventListener("click", (e) => {
        const b = e.target.closest("[data-section]");
        if (!b) return;
        $("alpPageTabs").querySelectorAll("button").forEach((x) => {
            x.classList.toggle("active", x === b);
            x.setAttribute("aria-selected", x === b ? "true" : "false");
        });
        ["alpMine", "alpEsc", "alpReport"].forEach((id) => ($(id).hidden = id !== b.dataset.section));
        $("alpSend").style.visibility = b.dataset.section === "alpMine" ? "" : "hidden";
        if (b.dataset.section === "alpEsc") showEscalation();
        if (b.dataset.section === "alpReport") showReport();
    });

    page.querySelectorAll(".alp-tabs button").forEach((b) => b.addEventListener("click", () => {
        page.querySelectorAll(".alp-tabs button").forEach((x) => {
            x.classList.toggle("active", x === b);
            x.setAttribute("aria-selected", x === b ? "true" : "false");
        });
        filters.status = b.dataset.status;
        filters.page = 1;
        load();
    }));
    $("alpUrgency").addEventListener("change", (e) => {
        filters.urgency = e.target.value;
        filters.page = 1;
        load();
    });
    $("alpQ").addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            filters.q = e.target.value.trim();
            filters.page = 1;
            load();
        }, 300);
    });
    $("alpReadAll").addEventListener("click", async () => {
        const res = await markAllAlertsRead();
        showToast(res?.message || "Done.", res?.success ? "success" : "error");
        refreshAlerts();
        load();
    });
    $("alpSend").addEventListener("click", openSend);
    $("alpList").addEventListener("click", onRowClick);
    $("alpList").addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target.matches(".alp-row")) {
            e.preventDefault();
            onRowClick(e);
        }
    });
    $("alpPager").addEventListener("click", (e) => {
        const p = Number(e.target.closest("[data-page]")?.dataset.page);
        if (p) {
            filters.page = p;
            load();
        }
    });
    $("alpOverlay").addEventListener("click", (e) => {
        if (e.target.id === "alpOverlay") closeModal();
    });

    // Keep the list in step with the bell (new alerts, acknowledgements elsewhere).
    unsubscribe?.();
    unsubscribe = onAlertsChanged(() => {
        if (!$("alpPage")) {
            unsubscribe?.();
            return;
        }
        if (!$("alpOverlay").classList.contains("open")) load(true);
    });
    if (!globalBound) {
        globalBound = true;
        window.addEventListener("alerts:changed", () => $("alpPage") && load(true));
        window.addEventListener("alerts:open", () => {
            const id = $("alpPage") && takePendingAlert();
            if (id) openDetail(id);
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && $("alpOverlay")?.classList.contains("open") && !document.getElementById("albOverlay")?.classList.contains("open")) closeModal();
        });
    }
    load();
    const pending = takePendingAlert();
    if (pending) openDetail(pending);
}

async function load(quiet = false) {
    const list = $("alpList");
    if (!list) return;
    if (!quiet) list.innerHTML = `<div class="alp-empty">Loading…</div>`;
    const seq = ++reloadSeq;
    const res = await fetchAlerts(filters).catch(() => null);
    if (seq !== reloadSeq || !$("alpList")) return;
    if (!res?.success) {
        list.innerHTML = `<div class="alp-empty">Could not load alerts. ${esc(res?.message || "")}</div>`;
        return;
    }
    data = res.data;
    $("alpSend").hidden = !data.can_send;
    $("alpPageTabs").hidden = !data.can_manage;
    renderList();
}

function stateHtml(a) {
    if (a.acknowledged_at) return `<span class="alb-pill done">Acknowledged</span><div class="alp-sub">${esc(a.acknowledged_by_name || "")}</div>`;
    if (a.resolved_at) return `<span class="alb-pill done">Closed</span>`;
    if (a.open) return `<span class="alb-pill ${a.urgency}">Waiting</span>${a.escalation_level ? `<div class="alp-sub">Escalated · level ${a.escalation_level}</div>` : ""}`;
    return a.read ? `<span class="alp-sub">Read</span>` : `<span class="alp-sub">Unread</span>`;
}

function renderList() {
    const list = $("alpList");
    const rows = data.rows;
    const empty = {
        all: "No alerts yet.", unread: "No unread alerts. You're all caught up.",
        open: "Nothing is waiting for an acknowledgement.", closed: "No closed alerts.",
    }[filters.status];
    list.innerHTML = rows.length ? rows.map((a) => `
        <div class="alp-row ${a.read ? "" : "unread"}" tabindex="0" role="button" data-id="${a.id}" aria-label="${esc(a.title)}">
            <span class="alp-dot" aria-hidden="true"></span>
            <div>
                <div class="alp-title">${a.urgency !== "info" ? `<span class="alb-pill ${a.urgency}">${URGENCY_LABEL[a.urgency]}</span>` : ""}${esc(a.title)}</div>
                <div class="alp-sub">${esc([a.type_label, a.patient_name ? `Patient: ${a.patient_name}` : "", `From ${a.created_by_name}`].filter(Boolean).join(" · "))}</div>
            </div>
            <div class="alp-when" title="${esc(fmtDateTime(a.created_at))}">${esc(ago(a.created_at))}</div>
            <div class="alp-state">${stateHtml(a)}</div>
        </div>`).join("") : `<div class="alp-empty">${q() ? "No alerts match your search." : empty}</div>`;

    const pages = Math.max(1, Math.ceil(data.total / data.per_page));
    $("alpPager").innerHTML = data.total ? `
        <span>${data.total} alert${data.total === 1 ? "" : "s"}${pages > 1 ? ` · page ${data.page} of ${pages}` : ""}</span>
        ${pages > 1 ? `<div>
            <button type="button" class="alp-btn" data-page="${data.page - 1}" ${data.page <= 1 ? "disabled" : ""}>Previous</button>
            <button type="button" class="alp-btn" data-page="${data.page + 1}" ${data.page >= pages ? "disabled" : ""}>Next</button></div>` : ""}` : "";
}

const q = () => filters.q || filters.urgency;

function onRowClick(e) {
    const id = Number(e.target.closest(".alp-row")?.dataset.id);
    if (id) openDetail(id);
}

/* ---------------- detail with the trail ---------------- */

async function openDetail(id) {
    const modal = $("alpModal");
    if (!modal) return;
    modal.innerHTML = `<div class="alp-mbody" style="padding:24px">Loading…</div>`;
    openModal();
    const res = await fetchAlert(id).catch(() => null);
    if (!res?.success) {
        modal.innerHTML = `<div class="alp-mhead"><h2 id="alpModalTitle">Alert</h2><button type="button" class="alp-x" data-close aria-label="Close">×</button></div>
            <div class="alp-mbody"><p>${esc(res?.message || "Could not load the alert.")}</p></div>`;
        modal.querySelector("[data-close]").onclick = closeModal;
        return;
    }
    const a = res.data;
    if (!a.read && !a.open) {
        markAlertRead(id).then(() => {
            refreshAlerts();
            load(true);
        }).catch(() => {});
    }
    renderDetail(a);
}

function renderDetail(a) {
    const modal = $("alpModal");
    const status = a.acknowledged_at ? `Acknowledged by ${a.acknowledged_by_name || "—"} · ${fmtDateTime(a.acknowledged_at)}`
        : a.resolved_at ? `Closed ${fmtDateTime(a.resolved_at)}${a.resolve_note ? ` — ${a.resolve_note}` : ""}`
        : a.open ? "Waiting for someone to acknowledge" : a.requires_ack ? "" : "No acknowledgement needed";
    const t = (v) => (v ? esc(fmtDateTime(v)) : "—");
    modal.innerHTML = `
        <div class="alp-mhead">
            <div><span class="alb-pill ${a.urgency}">${URGENCY_LABEL[a.urgency]}</span><span class="alp-sub" style="display:inline">${esc(a.type_label)}</span>
                <h2 id="alpModalTitle">${esc(a.title)}</h2></div>
            <button type="button" class="alp-x" data-close aria-label="Close">×</button>
        </div>
        <div class="alp-mbody">
            ${a.body ? `<p class="body">${esc(a.body)}</p>` : ""}
            <dl class="alp-facts">
                <dt>Sent</dt><dd>${t(a.created_at)} by ${esc(a.created_by_name)}</dd>
                ${a.patient_name ? `<dt>Patient</dt><dd>${esc(a.patient_name)}${a.patient_no ? ` (${esc(a.patient_no)})` : ""}</dd>` : ""}
                <dt>Sent to</dt><dd>${esc(a.targets.map((x) => x.label).join(", "))}</dd>
                ${status ? `<dt>Status</dt><dd>${esc(status)}</dd>` : ""}
                ${a.ack_note ? `<dt>Note</dt><dd>${esc(a.ack_note)}</dd>` : ""}
            </dl>
            ${a.escalations?.length || a.next_escalation ? `<div class="alp-h3">Escalation</div>
                <ul style="margin:0 0 6px;padding-left:18px;line-height:1.6">
                    ${(a.escalations || []).map((e) => `<li>Level ${e.level}: not acknowledged in ${e.waited_minutes} min — sent to <strong>${esc(e.to)}</strong> at ${t(e.escalated_at)}</li>`).join("")}
                    ${a.next_escalation ? `<li>Next: if nobody acknowledges by <strong>${t(a.next_escalation.at)}</strong>${a.next_escalation.minutes_left ? ` (in ${a.next_escalation.minutes_left} min)` : ""}, it goes to <strong>${esc(a.next_escalation.to)}</strong>.</li>` : ""}
                </ul>` : ""}
            <div class="alp-h3">Who saw it</div>
            ${a.receipts.length ? `<div class="alp-tablewrap"><table class="alp-table">
                <thead><tr><th>Person</th><th>Reached screen</th><th>Seen</th><th>Opened</th><th>Acknowledged</th></tr></thead>
                <tbody>${a.receipts.map((r) => `<tr><td>${esc(r.name || "—")}</td><td>${t(r.delivered_at)}</td><td>${t(r.seen_at)}</td><td>${t(r.read_at)}</td><td>${t(r.acknowledged_at)}</td></tr>`).join("")}</tbody>
            </table></div>` : `<p class="alp-sub">It hasn't reached anyone's screen yet.</p>`}
            ${a.open ? `<label for="alpAckNote" class="alp-h3" style="display:block">Note (optional)</label>
                <textarea id="alpAckNote" maxlength="500" style="width:100%;box-sizing:border-box;min-height:56px;border:1px solid var(--border-color);border-radius:8px;padding:8px 10px;font:inherit;background:var(--bg-surface-alt);color:var(--text-primary)"></textarea>` : ""}
        </div>
        <div class="alp-mfoot">
            <button type="button" class="alp-btn" data-close>Close</button>
            ${hasLink(a) ? `<button type="button" class="alp-btn" data-open>${a.link?.or_case ? "Open the case" : a.link?.patient_id || a.patient_id ? "Open the patient" : "Open"}</button>` : ""}
            ${a.open ? `<button type="button" class="alp-btn red" data-ack>Acknowledge</button>` : ""}
        </div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeModal));
    const open = modal.querySelector("[data-open]");
    if (open) open.onclick = () => {
        closeModal();
        openAlertLink(a);
    };
    const ack = modal.querySelector("[data-ack]");
    if (ack) ack.onclick = async () => {
        ack.disabled = true;
        const res = await acknowledgeAlert(a.id, $("alpAckNote")?.value || "").catch(() => null);
        ack.disabled = false;
        if (!res?.success) {
            showToast(res?.message || "Could not acknowledge.", "error");
            return;
        }
        showToast(res.message);
        refreshAlerts();
        load(true);
        openDetail(a.id);
    };
    setTimeout(() => modal.querySelector("[data-ack], [data-close]")?.focus(), 0);
}

function openModal() {
    $("alpOverlay").classList.add("open");
}

function closeModal() {
    $("alpOverlay")?.classList.remove("open");
}

/* ---------------- send ---------------- */

let send = null;

async function openSend() {
    const modal = $("alpModal");
    modal.innerHTML = `<div class="alp-mbody" style="padding:24px">Loading…</div>`;
    openModal();
    if (!options) {
        const res = await fetchAlertOptions().catch(() => null);
        if (!res?.success) {
            showToast("Could not load the recipients.", "error");
            closeModal();
            return;
        }
        options = res.data;
    }
    send = { targets: [], patient: null };
    const isAdmin = !!data?.can_send_everyone;
    modal.innerHTML = `
        <div class="alp-mhead"><h2 id="alpModalTitle">Send alert</h2><button type="button" class="alp-x" data-close aria-label="Close">×</button></div>
        <form class="alp-mbody alp-form" id="alpSendForm" novalidate>
            <div>
                <label>Urgency</label>
                <div class="alp-urg" role="radiogroup" aria-label="Urgency">
                    <label><input type="radio" name="urgency" value="info" checked> Info</label>
                    <label><input type="radio" name="urgency" value="urgent"> Urgent</label>
                    <label><input type="radio" name="urgency" value="critical"> Critical</label>
                </div>
                <div class="alp-hint" id="alpUrgHint">Shows in the bell. No acknowledgement needed.</div>
            </div>
            <div>
                <label for="alpTitle">What is it about?</label>
                <input id="alpTitle" maxlength="200" placeholder="e.g. Bed 4 patient needs a doctor review">
                <div class="alp-err" data-err="title"></div>
            </div>
            <div>
                <label for="alpBody">Details (optional)</label>
                <textarea id="alpBody" maxlength="2000"></textarea>
            </div>
            <div>
                <label for="alpPatientQ">Patient (optional)</label>
                <div id="alpPatientBox"></div>
                <div class="alp-err" data-err="patient_id"></div>
            </div>
            <div>
                <label for="alpTType">Send to</label>
                <div class="alp-target-add">
                    <select id="alpTType" aria-label="Recipient type">
                        <option value="user">A person</option>
                        <option value="role">A role</option>
                        <option value="department">A unit</option>
                        ${isAdmin ? `<option value="everyone">Everyone</option>` : ""}
                    </select>
                    <select id="alpTValue" aria-label="Recipient"></select>
                    <button type="button" class="alp-btn" id="alpTAdd">Add</button>
                </div>
                <div class="alp-chips" id="alpChips"></div>
                <div class="alp-err" data-err="targets"></div>
            </div>
        </form>
        <div class="alp-mfoot">
            <button type="button" class="alp-btn" data-close>Cancel</button>
            <button type="button" class="alp-btn primary" id="alpSendGo">Send</button>
        </div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeModal));
    modal.querySelectorAll('input[name="urgency"]').forEach((r) => r.addEventListener("change", () => {
        const v = modal.querySelector('input[name="urgency"]:checked').value;
        $("alpUrgHint").textContent = {
            info: "Shows in the bell. No acknowledgement needed.",
            urgent: "Pops up in the corner with a sound and stays until someone acknowledges it.",
            critical: "Pops up in the middle of the screen with a sound, and keeps beeping until someone acknowledges it.",
        }[v];
        $("alpSendGo").className = `alp-btn ${v === "critical" ? "red" : "primary"}`;
    }));
    $("alpTType").addEventListener("change", fillTargetValues);
    $("alpTAdd").addEventListener("click", addTarget);
    $("alpChips").addEventListener("click", (e) => {
        const i = e.target.closest("[data-rm]")?.dataset.rm;
        if (i != null) {
            send.targets.splice(Number(i), 1);
            renderChips();
        }
    });
    $("alpSendGo").addEventListener("click", submitSend);
    $("alpSendForm").addEventListener("submit", (e) => e.preventDefault());
    fillTargetValues();
    renderPatientBox();
    setTimeout(() => $("alpTitle")?.focus(), 0);
}

function fillTargetValues() {
    const type = $("alpTType").value;
    const sel = $("alpTValue");
    const role = (r) => r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    sel.disabled = type === "everyone";
    sel.innerHTML = type === "user" ? options.users.map((u) => `<option value="${u.id}">${esc(u.name)} (${esc(role(u.role))})</option>`).join("")
        : type === "role" ? options.roles.map((r) => `<option value="${esc(r)}">All ${esc(role(r))}s</option>`).join("")
        : type === "department" ? options.departments.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("")
        : `<option value="">All staff</option>`;
}

function addTarget() {
    const type = $("alpTType").value;
    const sel = $("alpTValue");
    const value = sel.value;
    const label = type === "everyone" ? "Everyone (all staff)" : sel.options[sel.selectedIndex]?.text;
    if (type !== "everyone" && !value) return;
    const key = `${type}:${value}`;
    if (send.targets.some((t) => t.key === key)) return;
    send.targets.push({ key, type, value, label });
    renderChips();
}

function renderChips() {
    $("alpChips").innerHTML = send.targets.map((t, i) => `<span class="alp-chip">${esc(t.label)}<button type="button" data-rm="${i}" aria-label="Remove ${esc(t.label)}">×</button></span>`).join("");
    $("alpModal").querySelector('[data-err="targets"]').textContent = "";
}

/* Patient: picked from the registered patient list only (typed text alone is never sent). */
async function loadPatients() {
    if (!patients) {
        const res = await fetchPatients().catch(() => null);
        patients = res?.success && Array.isArray(res.data) ? res.data : null;
    }
    return patients || [];
}

const patientName = (p) => [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ");

function patientMatches(term) {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    return (patients || []).filter((p) => {
        const hay = [p.first_name, p.middle_name, p.last_name, p.patient_no].filter(Boolean).join(" ").toLowerCase();
        return words.every((w) => hay.includes(w));
    });
}

async function renderPatientBox() {
    const box = $("alpPatientBox");
    if (!box) return;
    const err = $("alpModal").querySelector('[data-err="patient_id"]');
    if (err) err.textContent = "";
    if (send.patient) {
        box.innerHTML = `<div class="alp-picked"><span>${esc(send.patient.label)}</span><button type="button" class="alp-btn" id="alpPatientClear">Change</button></div>`;
        $("alpPatientClear").onclick = () => {
            send.patient = null;
            renderPatientBox();
            setTimeout(() => $("alpPatientQ")?.focus(), 0);
        };
        return;
    }
    box.innerHTML = `<input id="alpPatientQ" type="search" placeholder="Search the patient list by name or patient number" autocomplete="off"
            role="combobox" aria-expanded="false" aria-controls="alpPatientResults" aria-autocomplete="list">
        <div id="alpPatientResults"></div>`;
    const input = $("alpPatientQ");
    const out = $("alpPatientResults");
    let shown = [];

    const show = async () => {
        const term = input.value.trim();
        if (!patients) {
            out.innerHTML = `<div class="alp-hint">Loading the patient list…</div>`;
            await loadPatients();
            if (!$("alpPatientQ") || input.value.trim() !== term) return;
            if (!patients) {
                out.innerHTML = `<div class="alp-hint">Could not load the patient list.</div>`;
                return;
            }
        }
        const all = term ? patientMatches(term) : patients;
        shown = all.slice(0, 8);
        input.setAttribute("aria-expanded", shown.length ? "true" : "false");
        out.innerHTML = shown.length ? `<div class="alp-patient-results" role="listbox">${shown.map((p) => `
            <button type="button" role="option" data-pid="${p.id}">${esc(patientName(p))}
                <span class="alp-sub" style="display:inline">${esc([p.patient_no, p.birthdate, p.sex].filter(Boolean).join(" · "))}</span></button>`).join("")}</div>
            ${all.length > shown.length ? `<div class="alp-hint">${all.length - shown.length} more — keep typing to narrow it down.</div>` : ""}`
            : `<div class="alp-hint">No registered patient matches "${esc(term)}". Only patients in the patient list can be chosen.</div>`;
    };
    const pick = (id) => {
        const p = (patients || []).find((x) => Number(x.id) === Number(id));
        if (!p) return;
        send.patient = { id: Number(p.id), label: `${patientName(p)} (${p.patient_no || p.id})` };
        renderPatientBox();
    };

    input.addEventListener("focus", show);
    input.addEventListener("input", show);
    input.addEventListener("keydown", (e) => {
        // Enter picks the only match; it never submits typed text.
        if (e.key === "Enter") {
            e.preventDefault();
            if (shown.length === 1) pick(shown[0].id);
        }
    });
    out.onclick = (ev) => {
        const b = ev.target.closest("[data-pid]");
        if (b) pick(b.dataset.pid);
    };
}

async function submitSend() {
    const modal = $("alpModal");
    modal.querySelectorAll(".alp-err").forEach((e) => (e.textContent = ""));
    const title = $("alpTitle").value.trim();
    let bad = false;
    if (!title) {
        modal.querySelector('[data-err="title"]').textContent = "Enter what the alert is about.";
        bad = true;
    }
    // Text in the patient box that wasn't picked from the list: don't send without the patient.
    if (!send.patient && $("alpPatientQ")?.value.trim()) {
        modal.querySelector('[data-err="patient_id"]').textContent = "Choose the patient from the list, or clear the box to send without a patient.";
        bad = true;
    }
    if (!send.targets.length) {
        modal.querySelector('[data-err="targets"]').textContent = "Add at least one recipient (choose, then press Add).";
        bad = true;
    }
    if (bad) return;
    const btn = $("alpSendGo");
    btn.disabled = true;
    const res = await sendAlert({
        urgency: modal.querySelector('input[name="urgency"]:checked').value,
        title,
        body: $("alpBody").value.trim(),
        patient_id: send.patient?.id || null,
        targets: send.targets.map((t) => (t.type === "role" ? { type: "role", role: t.value } : t.type === "everyone" ? { type: "everyone" } : { type: t.type, id: Number(t.value) })),
    }).catch(() => null);
    btn.disabled = false;
    if (!res?.success) {
        const errs = res?.errors || {};
        Object.entries(errs).forEach(([k, v]) => {
            const el = modal.querySelector(`[data-err="${k}"]`);
            if (el) el.textContent = v;
        });
        if (!Object.keys(errs).length || !Object.keys(errs).some((k) => modal.querySelector(`[data-err="${k}"]`))) {
            showToast(res?.message || "Could not send the alert.", "error");
        }
        return;
    }
    showToast("Alert sent.");
    closeModal();
    refreshAlerts();
    load(true);
}
