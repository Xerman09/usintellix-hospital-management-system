import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js?v=5";
import { esc, dtl, when, waited, ensureCss, tube, modal, labelPreview, printLabels } from "./lab-ui.js?v=5";
import { loadResults, resultsHtml, onResultsClick } from "./lab-results.js?v=7";
import { loadCharges, chargesHtml, onChargesClick } from "./lab-charges.js?v=4";

/*
 * Lab worklist (module 14, Phase 1; tab "lab_worklist"): lab requests from the clinic, the ER, the wards and the ICU
 * still to collect -- STAT first, then by the time they are due, overdue ones flagged -- and the specimens collected
 * in the last 24 hours. Collect: check the patient's identity, tick the tests taken now (grouped into tubes in the
 * order of draw), who took them and when; each tube gets an accession number and a barcode label to print.
 * Phase 2 (lab staff): "To result", "To verify", "Released" -- lab-results.js.
 * Phase 3: "Charges" (what each released test cost the patient, test prices) -- lab-charges.js -- and the Lab Report.
 */

const RESULT_VIEWS = ["enter", "verify", "released"];
const LAB_ROLES = ["admin", "lab_technician"];

let state = { view: "collect", source: "", q: "", section: "", only: "" };
let data = null;
let timer = null;

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

export function LabWorklistView() {
    ensureCss();
    return `<div class="lab" id="labRoot"><div class="lab-empty">Loading…</div></div>`;
}

export function initLabWorklist() {
    clearInterval(timer);
    load();
    timer = setInterval(() => {
        if (!document.getElementById("labRoot")) return clearInterval(timer);
        if (document.hidden || state.view === "charges" || document.querySelector(".lbx-ov")) return;
        load(true);
    }, 30000);
}

async function load(quiet = false) {
    const root = document.getElementById("labRoot");
    if (!root) return;
    if (RESULT_VIEWS.includes(state.view) || state.view === "charges") {
        const d = state.view === "charges" ? await loadCharges(root, state, load) : await loadResults(root, state, load);
        if (d.error) {
            if (!quiet) root.innerHTML = `<div class="lab-empty">${esc(d.error)}</div>`;
            return;
        }
        data = d;
        return render(root);
    }
    const q = new URLSearchParams(Object.entries({ view: state.view, source: state.source, q: state.q }).filter(([, v]) => v));
    const r = await api(`/lab/worklist?${q}`).catch(() => null);
    if (!r?.success) {
        if (!quiet) root.innerHTML = `<div class="lab-empty">${esc(r?.message || "Could not load the worklist.")}</div>`;
        return;
    }
    data = r.data;
    render(root);
}

function row(x) {
    const o = data.options;
    const p = x.patient;
    const todo = x.tests.filter((t) => t.status === "pending");
    const done = x.tests.filter((t) => !["pending", "cancelled"].includes(t.status));
    const due = !x.due ? `<span class="muted">collect ${esc(when(x.collect_at))}</span>`
        : x.overdue ? `<span class="lab-late">waiting ${esc(waited(x.minutes_waiting))}</span>` : `<span class="muted">waiting ${esc(waited(x.minutes_waiting))}</span>`;
    const collectView = data.view === "collect";
    return `<div class="lab-req ${esc(x.priority)} ${x.due ? "" : "later"}">
        <div>
            <div>${x.priority !== "routine" ? `<span class="lab-pri ${esc(x.priority)}">${esc(o.priorities[x.priority])}</span> ` : ""}<span class="who">${esc(p.name)}</span></div>
            <div class="muted">${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}${p.sex ? ` · ${esc(String(p.sex).charAt(0).toUpperCase())}` : ""}${p.birthdate ? ` · born ${esc(p.birthdate)}` : ""}</div>
            <div><b>${esc(x.location || x.source_label)}</b>${x.location ? ` <span class="muted">(${esc(x.source_label)})</span>` : ""}</div>
        </div>
        <div>
            <div>${(collectView ? todo : x.tests.filter((t) => t.status !== "cancelled")).map((t) => tube(t.container, o.containers, `${esc(t.code || t.name)}`, collectView ? false : t.status === "pending")).join("")}
                ${collectView && done.length ? `<span class="muted" style="font-size:12px">· ${done.length} already collected</span>` : ""}</div>
            ${x.clinical_info ? `<div>${esc(x.clinical_info)}</div>` : ""}
            ${x.fasting ? `<div><b>Fasting</b> sample</div>` : ""}
            <div class="muted" style="font-size:12px">${esc(x.request_no)} · ordered ${esc(when(x.ordered_at))}${x.ordering_doctor ? ` by ${esc(x.ordering_doctor)}` : ""}${x.order_mode !== "written" ? ` (${esc(data.options.modes[x.order_mode] || x.order_mode).toLowerCase()}${x.ordered_by ? `, entered by ${esc(x.ordered_by)}` : ""})` : ""}</div>
            ${x.specimens.filter((s) => !collectView || !s.voided).map((s) => `<div class="lab-spec ${s.voided ? "void" : ""}">${tube(s.container, o.containers, `<span class="lab-acc">${esc(s.accession_no)}</span>`)}
                ${esc(s.tests.join(", "))} · ${esc(when(s.collected_at))}${s.collected_by ? ` by ${esc(s.collected_by)}` : ""}${s.method ? ` · ${esc(s.method)}` : ""}${s.site ? ` (${esc(s.site)})` : ""}
                ${s.voided ? ` · voided: ${esc(s.void_reason || "")}` : `${s.labels_printed ? ` · <span class="muted">${s.labels_printed} label print${s.labels_printed === 1 ? "" : "s"}</span>` : ""}
                ${!collectView && data.can_collect ? ` <button type="button" class="lab-b sm" data-void="${s.id}">Void…</button>` : ""}`}</div>`).join("")}
        </div>
        <div class="acts">
            <div style="width:100%;text-align:right">${collectView ? due : ""}</div>
            ${collectView && data.can_collect ? `<button type="button" class="lab-b ${x.due ? "blue" : ""} sm" data-collect="${x.id}">Collect…</button>` : ""}
            ${x.specimens.some((s) => !s.voided) ? `<button type="button" class="lab-b sm" data-labels="${x.id}">Labels</button>` : ""}
            ${collectView && data.can_cancel && todo.length ? `<button type="button" class="lab-b sm" data-cancel="${x.id}">Cancel a test…</button>` : ""}
        </div></div>`;
}

function render(root) {
    const c = data.counts;
    const focus = document.activeElement?.id;
    const results = RESULT_VIEWS.includes(state.view);
    const charges = state.view === "charges";
    const lab = LAB_ROLES.includes(getUser()?.role);
    const admin = getUser()?.role === "admin";
    const tab = (v, l) => `<button type="button" data-view="${v}" aria-pressed="${state.view === v}">${l}</button>`;
    const peso = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    root.innerHTML = `
        <div class="lab-head"><div><h1>Lab worklist</h1><div class="lab-sub">${charges ? "What the lab work cost each patient: a test is charged to the patient's ledger when its result is released, at the price on the catalog."
            : results ? "Results: typed by the lab, verified and released by a medical technologist. Released results reach the chart, the critical value alerts and the results inbox."
            : "Lab requests from the clinic, the ER, the wards and the ICU. STAT first, then by the time they're due."}${charges ? "" : " Refreshes every 30 seconds."}</div></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${charges && admin ? `<button type="button" class="lab-b" data-prices>Test prices…</button>` : ""}
            ${results && data.is_admin ? `<button type="button" class="lab-b" data-staff>Lab staff…</button>` : ""}
            ${lab ? `<button type="button" class="lab-b" data-report>Lab report</button>` : ""}</div></div>
        <div class="lab-counts" role="list">${charges ? `
            <div role="listitem"><b>${data.counts.charges_today}</b>charges today</div>
            <div role="listitem"><b>${esc(peso(data.counts.amount_today))}</b>charged today</div>
            <div role="listitem" class="${data.counts.to_charge ? "bad" : ""}"><b>${data.counts.to_charge}</b>released but not charged</div>
            <div role="listitem"><b>${data.counts.voided_week}</b>voided this week</div>
            <div role="listitem" class="${data.counts.tests_without_price ? "bad" : ""}"><b>${data.counts.tests_without_price}</b>tests with no price</div>` : results ? `
            <div role="listitem"><b>${c.to_enter}</b>tests to result</div>
            <div role="listitem"><b>${c.to_verify}</b>to verify</div>
            <div role="listitem" class="${c.critical ? "bad" : ""}"><b>${c.critical}</b>critical waiting for verification</div>
            <div role="listitem" class="${c.returned ? "bad" : ""}"><b>${c.returned}</b>returned to the bench</div>
            <div role="listitem"><b>${c.released_today}</b>released today</div>` : `
            <div role="listitem"><b>${c.to_collect}</b>to collect</div><div role="listitem"><b>${c.due}</b>due now</div>
            <div role="listitem" class="${c.stat ? "bad" : ""}"><b>${c.stat}</b>STAT</div>
            <div role="listitem" class="${c.overdue ? "bad" : ""}"><b>${c.overdue}</b>overdue</div>
            <div role="listitem"><b>${c.collected_today}</b>specimens collected today</div>`}
        </div>
        <div class="lab-tools">
            <span class="lab-tabs" role="group" aria-label="Show">${tab("collect", "To collect")}${tab("collected", "Collected (last 24 h)")}${lab ? tab("enter", "To result") + tab("verify", "To verify") + tab("released", "Released") + tab("charges", "Charges") : ""}</span>
            ${charges ? `<label class="lbx-chk" style="margin:0"><input type="checkbox" id="labOnly" ${state.only ? "checked" : ""}> Not charged yet only</label>`
                : results ? `<select id="labSec" aria-label="Lab section"><option value="">All sections</option>${Object.entries(data.sections).map(([k, l]) => `<option value="${k}" ${state.section === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`
                : `<select id="labSrc" aria-label="From where"><option value="">From everywhere</option>${Object.entries(data.options.sources).map(([k, l]) => `<option value="${k}" ${state.source === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`}
            <input type="search" id="labQ" value="${esc(state.q)}" placeholder="${charges ? "Patient, MRN, test or accession no." : "Patient, MRN, request or accession no."}" aria-label="Search">
        </div>
        ${charges ? chargesHtml(data) : results ? resultsHtml(data) : data.requests.length ? `<div class="lab-list">${data.requests.map(row).join("")}</div>`
            : `<div class="lab-empty">${data.view === "collect" ? "Nothing to collect." : "No specimens collected in the last 24 hours."}</div>`}`;
    if (focus === "labQ") {
        const q = root.querySelector("#labQ");
        q.focus();
        q.setSelectionRange(q.value.length, q.value.length);
    }
    root.onclick = onClick;
    const src = root.querySelector("#labSrc");
    if (src) {
        src.onchange = (e) => {
            state.source = e.target.value;
            load();
        };
    }
    const only = root.querySelector("#labOnly");
    if (only) {
        only.onchange = (e) => {
            state.only = e.target.checked ? "unbilled" : "";
            load();
        };
    }
    const sec = root.querySelector("#labSec");
    if (sec) {
        sec.onchange = (e) => {
            state.section = e.target.value;
            load();
        };
    }
    let t = null;
    root.querySelector("#labQ").oninput = (e) => {
        clearTimeout(t);
        t = setTimeout(() => {
            state.q = e.target.value.trim();
            load();
        }, 350);
    };
}

async function onClick(e) {
    const v = e.target.closest("[data-view]");
    if (v) {
        state.view = v.dataset.view;
        return load();
    }
    if (e.target.closest("[data-report]")) return window.__openDashboardTab?.("lab_report", "Lab Report");
    if (state.view === "charges") {
        if (await onChargesClick(e)) return;
    } else if (RESULT_VIEWS.includes(state.view) && (await onResultsClick(e))) {
        return;
    }
    const c = e.target.closest("[data-collect]");
    if (c) return openCollect(Number(c.dataset.collect));
    const l = e.target.closest("[data-labels]");
    if (l) return openLabels(Number(l.dataset.labels));
    const x = e.target.closest("[data-cancel]");
    if (x) return openCancel(Number(x.dataset.cancel));
    const vd = e.target.closest("[data-void]");
    if (vd) {
        const holder = vd.parentElement;
        vd.outerHTML = `<span data-voidbox><input type="text" maxlength="255" data-why placeholder="Why void? (wrong patient, clotted…)" aria-label="Why void this specimen"
            style="border:1px solid var(--border-color);border-radius:6px;padding:4px 6px;background:var(--bg-surface);color:var(--text-primary)">
            <button type="button" class="lab-b sm" data-voidgo="${vd.dataset.void}">Void</button></span>`;
        holder.querySelector("[data-why]").focus();
        return;
    }
    const vg = e.target.closest("[data-voidgo]");
    if (vg) {
        const why = vg.parentElement.querySelector("[data-why]");
        if (!why.value.trim()) return why.focus();
        vg.disabled = true;
        const r = await post("/lab/specimen/void", { id: Number(vg.dataset.voidgo), reason: why.value.trim() });
        vg.disabled = false;
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error", 6000);
        if (r?.success) load(true);
    }
}

/* ---------------- collect ---------------- */

function openCollect(id) {
    const x = data.requests.find((r) => r.id === id);
    if (!x) return;
    const o = data.options;
    const p = x.patient;
    const me = getUser();
    const groups = {};
    x.tests.filter((t) => t.status === "pending").forEach((t) => (groups[t.container] ??= []).push(t));
    const order = Object.keys(groups).sort((a, b) => (o.containers[a]?.[3] ?? 99) - (o.containers[b]?.[3] ?? 99));
    const m = modal(`Collect — ${esc(x.request_no)}`, `${x.priority !== "routine" ? `<b>${esc(o.priorities[x.priority])}</b> · ` : ""}${esc(x.location || x.source_label)}`, `
        <div class="lbx-id"><b>${esc(p.name)}</b><span>MRN <b>${esc(p.mrn || "—")}</b> · born <b>${esc(p.birthdate || "?")}</b>${p.age !== null ? ` (${p.age} y)` : ""}${p.sex ? ` · ${esc(p.sex)}` : ""}</span>
            <label class="lbx-chk" style="margin-top:6px"><input type="checkbox" name="id_checked"> I checked the patient's identity with two identifiers (name and date of birth or MRN on the wristband), and I label the tubes at the bedside.</label></div>
        ${x.fasting ? `<div class="lbx-note warn"><b>Fasting sample.</b> Check the patient has not eaten.</div>` : ""}
        ${x.clinical_info ? `<div class="lbx-note">${esc(x.clinical_info)}</div>` : ""}
        <div><span class="lbl">Tubes in the order of draw — untick a test not taken now (it stays on the worklist)</span>
            <div style="display:grid;gap:6px" data-field="order_ids" tabindex="-1">${order.map((k, i) => `<div class="lbx-tube"><div class="t"><i style="background:${esc(o.containers[k]?.[1] || "#6b7280")}"></i>${i + 1}. ${esc(o.containers[k]?.[0] || k)}</div>
                ${groups[k].map((t) => `<label><input type="checkbox" name="order" value="${t.id}" checked> ${esc(t.name)}${t.code ? ` <span class="muted">${esc(t.code)}</span>` : ""}</label>`).join("")}</div>`).join("")}</div></div>
        <div class="lbx-grid">
            <div><label for="lbcAt">Collected at <span style="font-weight:400">(blank = now)</span></label><input type="datetime-local" id="lbcAt" name="collected_at" max="${esc(dtl(data.now))}"></div>
            <div><label for="lbcBy">Collected by</label><select id="lbcBy" name="collector_id"><option value="">Me${me?.username ? ` (${esc(me.username)})` : ""}</option>
                ${data.collectors.filter((u) => Number(u.id) !== Number(me?.id)).map((u) => `<option value="${u.id}">${esc(u.name)} · ${esc(String(u.role).replace("_", " "))}</option>`).join("")}</select></div>
            <div><label for="lbcM">How</label><select id="lbcM" name="method"><option value="">—</option>${Object.entries(o.methods).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
            <div><label for="lbcS">Site <span style="font-weight:400">(optional)</span></label><input type="text" id="lbcS" name="site" maxlength="60" placeholder="e.g. left antecubital" autocomplete="off"></div>
        </div>
        <div><label for="lbcN">Notes <span style="font-weight:400">(optional)</span></label><input type="text" id="lbcN" name="notes" maxlength="255" placeholder="e.g. difficult draw, patient on oxygen" autocomplete="off"></div>`,
        `<button type="button" class="lab-b" data-x>Cancel</button><button type="button" class="lab-b blue" data-save>Collected — make labels</button>`);
    m.ov.querySelector('input[name="id_checked"]').focus();
    m.$("[data-save]").onclick = async (ev) => {
        const ids = [...m.ov.querySelectorAll('input[name="order"]:checked')].map((c) => Number(c.value));
        ev.target.disabled = true;
        const r = await post("/lab/collect", { request_id: id, order_ids: ids, id_checked: m.val("id_checked"), collected_at: m.val("collected_at"), collector_id: m.val("collector_id"),
            method: m.val("method"), site: m.val("site"), notes: m.val("notes") });
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors);
        m.close();
        showToast(r.message, "success", 6000);
        load(true);
        showLabels(r.data.specimens, true);
    };
}

/* ---------------- labels ---------------- */

async function openLabels(id) {
    const x = data.requests.find((r) => r.id === id);
    const ids = x.specimens.filter((s) => !s.voided).map((s) => s.id);
    showLabels(null, false, ids, x);
}

function showLabels(specimens, fresh, ids = null, x = null) {
    const m = modal(fresh ? "Print the labels" : `Labels — ${esc(x.request_no)}`, fresh ? "Stick each label on its tube at the bedside, before leaving the patient." : "Reprint (counted on the specimen).",
        specimens ? labelPreview(specimens) : `<div class="lbx-labels">${x.specimens.filter((s) => !s.voided).map((s) => `<label class="lbx-chk"><input type="checkbox" value="${s.id}" checked> <span class="lab-acc">${esc(s.accession_no)}</span> ${esc(s.container_label)} · ${esc(s.tests.join(", "))}</label>`).join("")}</div>`,
        `<button type="button" class="lab-b" data-x>${fresh ? "Done" : "Cancel"}</button><button type="button" class="lab-b blue" data-print>Print ${fresh ? `${specimens.length} label${specimens.length === 1 ? "" : "s"}` : "labels"}</button>`);
    m.$("[data-print]").focus();
    m.$("[data-print]").onclick = async (ev) => {
        const chosen = specimens ? specimens.map((s) => s.id) : [...m.ov.querySelectorAll(".lbx-labels input:checked")].map((c) => Number(c.value));
        if (!chosen.length) return m.err("Tick the labels to print.");
        ev.target.disabled = true;
        const r = await post("/lab/labels", { ids: chosen });
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not print.");
        if (printLabels(r.data.specimens)) {
            if (!fresh) m.close();
            load(true);
        }
    };
}

/* ---------------- cancel a test ---------------- */

function openCancel(id) {
    const x = data.requests.find((r) => r.id === id);
    const todo = x.tests.filter((t) => t.status === "pending");
    const m = modal(`Cancel a test — ${esc(x.request_no)}`, esc(x.patient.name), `
        <div><span class="lbl">Test</span><div style="display:grid;gap:4px" data-field="order_id" tabindex="-1">${todo.map((t, i) => `<label class="lbx-chk"><input type="radio" name="order_id" value="${t.id}" ${i === 0 ? "checked" : ""}> ${esc(t.name)}</label>`).join("")}</div></div>
        <div><label for="lbxWhy">Why</label><input type="text" id="lbxWhy" name="reason" maxlength="255" placeholder="e.g. done this morning, ordered on the wrong patient" autocomplete="off"></div>`,
        `<button type="button" class="lab-b" data-x>Keep it</button><button type="button" class="lab-b blue" data-save>Cancel the test</button>`);
    m.$("#lbxWhy").focus();
    m.$("[data-save]").onclick = async (ev) => {
        ev.target.disabled = true;
        const r = await post("/lab/cancel-test", { order_id: Number(m.val("order_id")), reason: m.val("reason") });
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors);
        m.close();
        showToast(r.message, "success");
        load(true);
    };
}
