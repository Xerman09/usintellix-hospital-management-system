import { fetchEscalation, saveEscalation, removeEscalation, fetchAlertReport, fetchAlertOptions } from "./alerts.service.js?v=2";
import { esc, fmtDateTime, URGENCY_LABEL } from "./alert-bell.js?v=10";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";

/*
 * Admin parts of the Alerts page (Phase 2):
 *  - Escalation: per alert type, who an unacknowledged alert goes to next and after how long.
 *  - Report: response times and unacknowledged alerts.
 */

const $ = (id) => document.getElementById(id);
let ctx = null;          // { openModal, closeModal, openDetail }
let settings = null;
let options = null;
let draft = null;        // the policy being edited
let report = null;
let reportFilters = { from: "", to: "", type: "", urgency: "" };
let reportSeq = 0;

const roleName = (r) => String(r || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const mins = (v) => (v == null ? "—" : `${v} min`);

export function initAlertAdmin(context) {
    ctx = context;
    report = null;
    settings = null;
    const fresh = { from: "", to: "", type: "", urgency: "" };
    reportFilters = fresh;
}

export function showEscalation() {
    if (settings) renderEscalation();
    loadEscalation();
}

export function showReport() {
    if (report) renderReport();
    else loadReport();
}

/* ---------------- escalation ---------------- */

async function loadEscalation() {
    const box = $("alpEsc");
    if (!box) return;
    if (!settings) box.innerHTML = `<div class="alp-empty">Loading…</div>`;
    const [res, opt] = await Promise.all([fetchEscalation().catch(() => null), options ? null : fetchAlertOptions().catch(() => null)]);
    if (opt?.success) options = opt.data;
    if (!$("alpEsc")) return;
    if (!res?.success) {
        box.innerHTML = `<div class="alp-empty">Could not load the escalation settings. ${esc(res?.message || "")}</div>`;
        return;
    }
    settings = res.data;
    renderEscalation();
}

function chainHtml(p) {
    if (!p.is_active) return `<div class="alp-chain"><span class="alp-off">Escalation is off for this type — alerts stay with whoever they were sent to.</span></div>`;
    if (!p.steps.length) return `<div class="alp-chain"><span class="alp-off">No levels.</span></div>`;
    return `<div class="alp-chain"><span class="lvl">Sent to its recipients</span>${p.steps.map((s) =>
        `<span class="arrow">→ not acknowledged in ${s.wait_minutes} min →</span><span class="lvl">${esc(s.label)}</span>`).join("")}</div>`;
}

function renderEscalation() {
    const box = $("alpEsc");
    if (!box || !settings) return;
    const scope = (p) => (p.applies_to === "urgent" ? "Urgent and critical alerts" : "Critical alerts");
    box.innerHTML = `
        <p class="alp-intro">When an alert isn't acknowledged in time it goes to the next level as well (the earlier recipients still have it).
            Set a chain for each alert type; types without their own use the default. Example: nurse → charge nurse → doctor → admin.</p>
        ${settings.policies.map((p) => `
            <div class="alp-pol">
                <div class="alp-pol-head">
                    <div><h3>${esc(p.type_label)}</h3>
                        <div class="alp-sub">${esc(scope(p))}${p.updated_at ? ` · changed ${esc(fmtDateTime(p.updated_at))}${p.updated_by_name ? ` by ${esc(p.updated_by_name)}` : ""}` : ""}</div></div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <button type="button" class="alp-btn" data-edit="${esc(p.alert_type)}">Edit</button>
                        ${p.alert_type !== "*" ? `<button type="button" class="alp-btn" data-remove="${esc(p.alert_type)}">Use the default</button>` : ""}
                    </div>
                </div>
                ${chainHtml(p)}
            </div>`).join("")}
        ${settings.unconfigured_types.length ? `<button type="button" class="alp-btn primary" id="alpEscAdd">Set a chain for an alert type</button>` : ""}`;
    box.onclick = (e) => {
        const edit = e.target.closest("[data-edit]")?.dataset.edit;
        const remove = e.target.closest("[data-remove]")?.dataset.remove;
        if (edit) openEditor(settings.policies.find((p) => p.alert_type === edit));
        else if (remove) confirmRemove(remove);
        else if (e.target.id === "alpEscAdd") openEditor(null);
    };
}

function openEditor(policy) {
    if (!options) {
        showToast("Could not load the recipients. Try again.", "error");
        loadEscalation();
        return;
    }
    const base = policy || settings.policies.find((p) => p.alert_type === "*");
    draft = {
        isNew: !policy,
        alert_type: policy ? policy.alert_type : settings.unconfigured_types[0],
        applies_to: base?.applies_to || "critical",
        is_active: policy ? policy.is_active : true,
        // A new type starts from a copy of the default chain.
        steps: (base?.steps || []).map((s) => ({ wait_minutes: s.wait_minutes, target_type: s.target_type, target_id: s.target_id, target_role: s.target_role })),
    };
    if (!draft.steps.length) draft.steps.push({ wait_minutes: 5, target_type: "role", target_role: options.roles[0], target_id: null });
    ctx.openModal();
    renderEditor(policy);
}

function stepValueOptions(s) {
    if (s.target_type === "role") return options.roles.map((r) => `<option value="${esc(r)}" ${r === s.target_role ? "selected" : ""}>All ${esc(roleName(r))}s</option>`).join("");
    if (s.target_type === "user") return `<option value="">Choose a person…</option>` + options.users.map((u) => `<option value="${u.id}" ${u.id === s.target_id ? "selected" : ""}>${esc(u.name)} (${esc(roleName(u.role))})</option>`).join("");
    return `<option value="">Choose a unit…</option>` + options.departments.map((d) => `<option value="${d.id}" ${d.id === s.target_id ? "selected" : ""}>${esc(d.name)}</option>`).join("");
}

function stepsHtml() {
    return draft.steps.map((s, i) => `
        <div class="alp-step" data-step="${i}">
            <span class="n">Level ${i + 1}</span>
            <div style="display:flex;align-items:center;gap:6px"><input type="number" id="alpW${i}" min="1" max="1440" value="${esc(s.wait_minutes)}" data-f="wait_minutes" aria-label="Level ${i + 1}: minutes without acknowledgement"><span class="alp-sub" style="margin:0">min</span></div>
            <select data-f="target_type" aria-label="Level ${i + 1}: goes to">
                <option value="role" ${s.target_type === "role" ? "selected" : ""}>A role</option>
                <option value="user" ${s.target_type === "user" ? "selected" : ""}>A person</option>
                <option value="department" ${s.target_type === "department" ? "selected" : ""}>A unit</option>
            </select>
            <select data-f="target" aria-label="Level ${i + 1}: recipient">${stepValueOptions(s)}</select>
            <button type="button" class="alp-icon-btn" data-rm-step="${i}" aria-label="Remove level ${i + 1}" ${draft.steps.length === 1 ? "disabled" : ""}>×</button>
            <div class="alp-err" data-err="steps.${i}.wait_minutes" style="grid-column:1/-1"></div>
            <div class="alp-err" data-err="steps.${i}.target" style="grid-column:1/-1"></div>
        </div>`).join("");
}

function renderEditor(policy) {
    const modal = $("alpModal");
    const typeName = (t) => (t === "*" ? "All other alert types (default)" : settings.types[t] || t);
    modal.innerHTML = `
        <div class="alp-mhead"><h2 id="alpModalTitle">${draft.isNew ? "Escalation for an alert type" : `Escalation: ${esc(typeName(draft.alert_type))}`}</h2>
            <button type="button" class="alp-x" data-close aria-label="Close">×</button></div>
        <form class="alp-mbody alp-form" id="alpEscForm" novalidate>
            ${draft.isNew ? `<div><label for="alpEscType">Alert type</label>
                <select id="alpEscType">${settings.unconfigured_types.map((t) => `<option value="${esc(t)}" ${t === draft.alert_type ? "selected" : ""}>${esc(typeName(t))}</option>`).join("")}</select>
                <div class="alp-err" data-err="alert_type"></div></div>` : ""}
            <label class="alp-switch"><input type="checkbox" id="alpEscActive" ${draft.is_active ? "checked" : ""}> Escalate this type</label>
            <div id="alpEscBody" ${draft.is_active ? "" : "hidden"}>
                <label>Escalate</label>
                <div class="alp-urg" role="radiogroup" aria-label="Which alerts escalate">
                    <label><input type="radio" name="applies_to" value="critical" ${draft.applies_to === "critical" ? "checked" : ""}> Critical only</label>
                    <label><input type="radio" name="applies_to" value="urgent" ${draft.applies_to === "urgent" ? "checked" : ""}> Urgent and critical</label>
                </div>
                <label style="margin-top:12px">Levels — if still not acknowledged after the minutes shown, it also goes to:</label>
                <div class="alp-steps" id="alpSteps">${stepsHtml()}</div>
                <div class="alp-err" data-err="steps"></div>
                <button type="button" class="alp-btn" id="alpAddStep" style="margin-top:8px" ${draft.steps.length >= 6 ? "disabled" : ""}>Add a level</button>
                <div class="alp-hint">The minutes count from when the alert was sent (level 1) or from the previous level.</div>
            </div>
        </form>
        <div class="alp-mfoot">
            <button type="button" class="alp-btn" data-close>Cancel</button>
            <button type="button" class="alp-btn primary" id="alpEscSave">Save</button>
        </div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = ctx.closeModal));
    $("alpEscType")?.addEventListener("change", (e) => (draft.alert_type = e.target.value));
    $("alpEscActive").addEventListener("change", (e) => {
        draft.is_active = e.target.checked;
        $("alpEscBody").hidden = !draft.is_active;
    });
    modal.querySelectorAll('input[name="applies_to"]').forEach((r) => r.addEventListener("change", () => (draft.applies_to = r.value)));
    $("alpAddStep").addEventListener("click", () => {
        const last = draft.steps[draft.steps.length - 1];
        draft.steps.push({ wait_minutes: last?.wait_minutes || 5, target_type: "role", target_role: options.roles.includes("admin") ? "admin" : options.roles[0], target_id: null });
        redrawSteps();
    });
    $("alpSteps").addEventListener("input", onStepInput);
    $("alpSteps").addEventListener("change", onStepInput);
    $("alpSteps").addEventListener("click", (e) => {
        const i = e.target.closest("[data-rm-step]")?.dataset.rmStep;
        if (i != null && draft.steps.length > 1) {
            draft.steps.splice(Number(i), 1);
            redrawSteps();
        }
    });
    $("alpEscSave").addEventListener("click", submitEditor);
    $("alpEscForm").addEventListener("submit", (e) => e.preventDefault());
}

function redrawSteps() {
    $("alpSteps").innerHTML = stepsHtml();
    $("alpAddStep").disabled = draft.steps.length >= 6;
}

function onStepInput(e) {
    const row = e.target.closest("[data-step]");
    if (!row) return;
    const s = draft.steps[Number(row.dataset.step)];
    const f = e.target.dataset.f;
    if (f === "wait_minutes") s.wait_minutes = e.target.value;
    else if (f === "target_type" && e.type === "change") {
        s.target_type = e.target.value;
        s.target_id = null;
        s.target_role = s.target_type === "role" ? options.roles[0] : null;
        row.querySelector('[data-f="target"]').innerHTML = stepValueOptions(s);
    } else if (f === "target") {
        if (s.target_type === "role") s.target_role = e.target.value;
        else s.target_id = e.target.value ? Number(e.target.value) : null;
    }
}

async function submitEditor() {
    const modal = $("alpModal");
    modal.querySelectorAll(".alp-err").forEach((x) => (x.textContent = ""));
    const btn = $("alpEscSave");
    btn.disabled = true;
    const res = await saveEscalation({
        alert_type: draft.alert_type, applies_to: draft.applies_to, is_active: draft.is_active ? 1 : 0,
        steps: draft.is_active ? draft.steps.map((s) => ({ wait_minutes: Number(s.wait_minutes), target_type: s.target_type, target_id: s.target_id, target_role: s.target_role })) : [],
    }).catch(() => null);
    btn.disabled = false;
    if (!res?.success) {
        const errs = res?.errors || {};
        let shown = false;
        Object.entries(errs).forEach(([k, v]) => {
            const el = modal.querySelector(`[data-err="${k}"]`);
            if (el) {
                el.textContent = v;
                shown = true;
            }
        });
        if (!shown) showToast(res?.message || "Could not save.", "error");
        return;
    }
    showToast("Escalation saved.");
    ctx.closeModal();
    loadEscalation();
}

function confirmRemove(type) {
    const modal = $("alpModal");
    const name = settings.types[type] || type;
    modal.innerHTML = `
        <div class="alp-mhead"><h2 id="alpModalTitle">Use the default for ${esc(name)}?</h2><button type="button" class="alp-x" data-close aria-label="Close">×</button></div>
        <div class="alp-mbody"><p>This type's own chain is removed and its alerts escalate like every other type (the default chain).</p></div>
        <div class="alp-mfoot"><button type="button" class="alp-btn" data-close>Cancel</button><button type="button" class="alp-btn primary" id="alpRmGo">Use the default</button></div>`;
    ctx.openModal();
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = ctx.closeModal));
    $("alpRmGo").onclick = async () => {
        $("alpRmGo").disabled = true;
        const res = await removeEscalation(type).catch(() => null);
        if (!res?.success) {
            $("alpRmGo").disabled = false;
            showToast(res?.message || "Could not remove.", "error");
            return;
        }
        showToast(res.message);
        ctx.closeModal();
        loadEscalation();
    };
    setTimeout(() => $("alpRmGo")?.focus(), 0);
}

/* ---------------- report ---------------- */

async function loadReport() {
    const box = $("alpReport");
    if (!box) return;
    if (!report) box.innerHTML = `<div class="alp-empty">Loading…</div>`;
    else box.querySelector("#alpRepBody")?.setAttribute("aria-busy", "true");
    const seq = ++reportSeq;
    const res = await fetchAlertReport(reportFilters).catch(() => null);
    if (seq !== reportSeq || !$("alpReport")) return;
    if (!res?.success) {
        box.innerHTML = `<div class="alp-empty">Could not load the report. ${esc(res?.message || "")}</div>`;
        return;
    }
    report = res.data;
    reportFilters.from = report.from;
    reportFilters.to = report.to;
    renderReport();
}

function statRow(b, firstCol) {
    return `<tr><td>${firstCol}</td><td class="num">${b.total}</td><td class="num">${b.acknowledged}</td>
        <td class="num">${b.open ? `<strong style="color:#dc2626">${b.open}</strong>` : 0}</td><td class="num">${b.escalated}</td>
        <td class="num">${mins(b.avg_minutes)}</td><td class="num">${mins(b.median_minutes)}</td><td class="num">${b.on_time_pct == null ? "—" : `${b.on_time_pct}%`}</td></tr>`;
}

function alertCell(r) {
    return `<button type="button" class="alp-link" data-alert="${r.id}">${r.urgency !== "info" ? `<span class="alb-pill ${r.urgency}">${URGENCY_LABEL[r.urgency]}</span>` : ""}${esc(r.title)}</button>
        <div class="alp-sub">${esc([r.type_label, r.patient_name].filter(Boolean).join(" · "))}</div>`;
}

const age = (m) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d`);

function renderReport() {
    const box = $("alpReport");
    if (!box || !report) return;
    const s = report.summary;
    const headStats = `<thead><tr><th></th><th class="num">Alerts</th><th class="num">Acknowledged</th><th class="num">Not acknowledged</th><th class="num">Escalated</th>
        <th class="num">Average</th><th class="num">Median</th><th class="num">Within ${report.on_time_minutes} min</th></tr></thead>`;
    const types = Object.entries(settingsTypes());
    box.innerHTML = `
        <div class="alp-bar">
            <label class="alp-sub" for="alpRFrom" style="margin:0">From</label><input type="date" id="alpRFrom" value="${esc(reportFilters.from)}" max="${esc(todayISO())}" style="flex:0 0 auto;width:150px;min-width:0">
            <label class="alp-sub" for="alpRTo" style="margin:0">to</label><input type="date" id="alpRTo" value="${esc(reportFilters.to)}" style="flex:0 0 auto;width:150px;min-width:0">
            <select id="alpRType" aria-label="Alert type"><option value="">All types</option>${types.map(([k, v]) => `<option value="${esc(k)}" ${k === reportFilters.type ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
            <select id="alpRUrg" aria-label="Urgency"><option value="">All urgencies</option>${["critical", "urgent", "info"].map((u) => `<option value="${u}" ${u === reportFilters.urgency ? "selected" : ""}>${URGENCY_LABEL[u]}</option>`).join("")}</select>
            <button type="button" class="alp-btn" id="alpRPrint">Print</button>
            <button type="button" class="alp-btn" data-csv>Export CSV</button>
        </div>
        <div id="alpRepBody">
        <div class="alp-kpis">
            <div class="alp-kpi"><div class="v">${s.total}</div><div class="l">Alerts sent</div></div>
            <div class="alp-kpi"><div class="v">${s.acknowledged} / ${s.needs_ack}</div><div class="l">Acknowledged (of those needing it)</div></div>
            <div class="alp-kpi ${s.open ? "bad" : ""}"><div class="v">${s.open}</div><div class="l">Still not acknowledged</div></div>
            <div class="alp-kpi"><div class="v">${mins(s.median_minutes)}</div><div class="l">Median time to acknowledge</div></div>
            <div class="alp-kpi"><div class="v">${mins(s.avg_minutes)}</div><div class="l">Average · longest ${mins(s.max_minutes)}</div></div>
            <div class="alp-kpi"><div class="v">${s.on_time_pct == null ? "—" : `${s.on_time_pct}%`}</div><div class="l">Acknowledged within ${report.on_time_minutes} min</div></div>
            <div class="alp-kpi"><div class="v">${s.escalated}</div><div class="l">Escalated</div></div>
        </div>

        <div class="alp-rcard"><h3>Not acknowledged <span class="alp-sub">${report.open.length} open, oldest first</span></h3>
            ${report.open.length ? `<div class="alp-tablewrap"><table class="alp-table"><thead><tr><th>Alert</th><th>Sent</th><th class="num">Waiting</th><th>Sent to</th><th class="num">Escalation level</th></tr></thead>
            <tbody>${report.open.map((r) => `<tr><td>${alertCell(r)}</td><td>${esc(fmtDateTime(r.created_at))}</td><td class="num">${age(r.age_minutes)}</td><td>${esc(r.sent_to || "")}</td><td class="num">${r.escalation_level || "—"}</td></tr>`).join("")}</tbody></table></div>`
            : `<p class="alp-sub">Every alert in this period that needed an acknowledgement got one.</p>`}</div>

        <div class="alp-rcard"><h3>By alert type</h3>
            ${report.by_type.length ? `<div class="alp-tablewrap"><table class="alp-table">${headStats}<tbody>${report.by_type.map((b) => statRow(b, esc(b.label))).join("")}</tbody></table></div>` : `<p class="alp-sub">No alerts needing an acknowledgement in this period.</p>`}</div>

        <div class="alp-grid2">
            <div class="alp-rcard"><h3>By urgency</h3>
                ${report.by_urgency.length ? `<div class="alp-tablewrap"><table class="alp-table">${headStats}<tbody>${report.by_urgency.map((b) => statRow(b, `<span class="alb-pill ${b.key}">${esc(b.label)}</span>`)).join("")}</tbody></table></div>` : `<p class="alp-sub">—</p>`}</div>
            <div class="alp-rcard"><h3>Who acknowledged</h3>
                ${report.by_responder.length ? `<div class="alp-tablewrap"><table class="alp-table"><thead><tr><th>Person</th><th class="num">Acknowledged</th><th class="num">Average</th><th class="num">Median</th></tr></thead>
                <tbody>${report.by_responder.sort((a, b) => b.count - a.count).map((b) => `<tr><td>${esc(b.name)}</td><td class="num">${b.count}</td><td class="num">${mins(b.avg_minutes)}</td><td class="num">${mins(b.median_minutes)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="alp-sub">No acknowledgements yet.</p>`}</div>
        </div>

        <div class="alp-rcard"><h3>Slowest to acknowledge</h3>
            ${report.slowest.length ? `<div class="alp-tablewrap"><table class="alp-table"><thead><tr><th>Alert</th><th>Sent</th><th>Acknowledged by</th><th class="num">Took</th><th class="num">Escalation level</th></tr></thead>
            <tbody>${report.slowest.map((r) => `<tr><td>${alertCell(r)}</td><td>${esc(fmtDateTime(r.created_at))}</td><td>${esc(r.acknowledged_by_name || "—")}</td><td class="num">${mins(r.ack_minutes)}</td><td class="num">${r.escalation_level || "—"}</td></tr>`).join("")}</tbody></table></div>` : `<p class="alp-sub">No acknowledgements yet.</p>`}</div>
        </div>`;

    const refilter = () => {
        reportFilters = { from: $("alpRFrom").value, to: $("alpRTo").value, type: $("alpRType").value, urgency: $("alpRUrg").value };
        loadReport();
    };
    ["alpRFrom", "alpRTo", "alpRType", "alpRUrg"].forEach((id) => $(id).addEventListener("change", refilter));
    $("alpRPrint").onclick = () => window.print();
    box.querySelector("[data-csv]").onclick = exportCsv;
    box.onclick = (e) => {
        const id = Number(e.target.closest("[data-alert]")?.dataset.alert);
        if (id) ctx.openDetail(id);
    };
}

function settingsTypes() {
    return settings?.types || options?.types || {
        manual: "Message", system: "System", critical_lab: "Critical lab result", code_blue: "Code Blue", low_stock: "Low stock",
        vitals: "Vital signs", medication: "Medication", or_case: "Surgery", task: "Task",
    };
}

function exportCsv() {
    const cell = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
    };
    const head = ["Alert #", "Sent", "Type", "Urgency", "Title", "Patient", "Sent to", "Escalation level", "Acknowledged", "Acknowledged by", "Minutes to acknowledge"];
    const lines = [head, ...report.rows.map((r) => [r.id, r.created_at, r.type_label, r.urgency, r.title, r.patient_name || "", r.sent_to || "",
        r.escalation_level, r.acknowledged_at || "", r.acknowledged_by_name || "", r.ack_minutes ?? ""])].map((r) => r.map(cell).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `alert-log_${report.from}_to_${report.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
