import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * ER (module 12, Phase 1; tab "er"): the ER board, quick registration and triage.
 *   * Register: a patient with a chart (search), a new patient (name, sex, birth date or age), or an
 *     unknown patient (sex, estimated age, description) under a temporary name.
 *   * Triage: acuity 1-5, chief complaint, vital signs; danger-zone vitals suggest level 2.
 *   * Identify an unknown patient: fill in the details, or merge into their existing chart.
 *   * Close: left without being seen, or registered in error.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hm = (dt) => String(dt || "").slice(11, 16);
const mins = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

const CSS = `
.erp { padding: 20px 24px 40px; max-width: 1320px; margin: 0 auto; color: var(--text-primary); }
@media (max-width: 600px) { .erp { padding: 16px 16px 32px; } }
.erp-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 12px; }
.erp h1 { margin: 0; font-size: 22px; }
.erp-sub { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
.erp-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.erp-b.go { background: #b91c1c; border-color: #b91c1c; color: #fff; }
.erp-b.blue { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.erp-b.sm { padding: 5px 9px; font-size: 12.5px; }
.erp-b:disabled { opacity: .55; cursor: default; }
.erp-b:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.erp-counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 14px; }
.erp-count { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.erp-count b { font-size: 18px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.erp-count.warn { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
:root[data-theme="dark"] .erp-count.warn { background: #451a03; color: #fde68a; border-color: #92400e; }
.erp h2 { font-size: 16px; margin: 18px 0 8px; }
.erp-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.erp table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.erp th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.erp td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.erp .nw { white-space: nowrap; }
.erp .muted, .erx .muted { color: var(--text-muted); }
.erp .acts { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end; }
.erp-empty { padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.erp-late { color: #b45309; font-weight: 700; }
:root[data-theme="dark"] .erp-late { color: #fcd34d; }
.er-lvl { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-weight: 800; font-size: 12px; white-space: nowrap; color: #fff; }
.er-lvl.l1 { background: #b91c1c; } .er-lvl.l2 { background: #c2410c; } .er-lvl.l3 { background: #facc15; color: #422006; } .er-lvl.l4 { background: #15803d; } .er-lvl.l5 { background: #1d4ed8; }
.er-tag { display: inline-block; padding: 1px 7px; border-radius: 6px; font-size: 11px; font-weight: 700; background: var(--bg-surface-alt); border: 1px solid var(--border-color); margin-left: 4px; }
.er-tag.unk { background: #fef3c7; border-color: #fcd34d; color: #78350f; }
:root[data-theme="dark"] .er-tag.unk { background: #451a03; border-color: #92400e; color: #fde68a; }
.er-vit { font-size: 12px; line-height: 1.5; font-variant-numeric: tabular-nums; }
.er-vit .bad { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .er-vit .bad { color: #fca5a5; }
.erp-inline { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 6px; }
.erp-inline input { flex: 1 1 200px; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 8px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }

.erx-ov { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 5100; display: flex; align-items: center; justify-content: center; padding: 16px; }
.erx { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 720px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
.erx-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 14px 18px 8px; border-bottom: 1px solid var(--border-color); }
.erx-head h2 { margin: 0; font-size: 18px; }
.erx-x { border: 0; background: none; font-size: 22px; cursor: pointer; color: var(--text-muted); padding: 2px 8px; border-radius: 6px; }
.erx-x:focus-visible { outline: 3px solid #93c5fd; }
.erx-body { padding: 12px 18px; overflow: auto; display: grid; gap: 12px; font-size: 13.5px; }
.erx-foot { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 18px 14px; border-top: 1px solid var(--border-color); }
.erx label, .erx .lbl { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.erx input[type=text], .erx input[type=number], .erx input[type=date], .erx input[type=time], .erx select, .erx textarea {
    width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.erx textarea { min-height: 54px; resize: vertical; }
.erx [aria-invalid="true"] { border-color: #dc2626 !important; }
.erx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(140px, 100%), 1fr)); gap: 10px; }
.erx-grid.two { grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr)); }
.erx-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.erx-seg label { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 1px solid var(--border-color); border-radius: 999px; margin: 0; font-size: 13px; color: var(--text-primary); cursor: pointer; font-weight: 600; }
.erx-seg label:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
:root[data-theme="dark"] .erx-seg label:has(input:checked) { background: #172554; color: #bfdbfe; }
.erx-lvls { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
@media (max-width: 640px) { .erx-lvls { grid-template-columns: 1fr; } }
.erx-lvls label { display: block; border: 2px solid var(--border-color); border-radius: 10px; padding: 8px; margin: 0; cursor: pointer; color: var(--text-primary); font-weight: 400; }
.erx-lvls label:has(input:checked) { border-color: #1d4ed8; box-shadow: 0 0 0 2px #93c5fd; }
.erx-lvls input { position: absolute; opacity: 0; }
.erx-lvls label:has(input:focus-visible) { outline: 3px solid #93c5fd; }
.erx-lvls small { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 4px; line-height: 1.3; }
.erx-res { display: grid; gap: 4px; max-height: 220px; overflow: auto; }
.erx-res label { display: flex; gap: 8px; align-items: center; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; margin: 0; cursor: pointer; color: var(--text-primary); font-weight: 400; }
.erx-res label:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; }
:root[data-theme="dark"] .erx-res label:has(input:checked) { background: #172554; }
.erx-res label.off { opacity: .6; cursor: not-allowed; }
.erx-note { border-radius: 10px; padding: 8px 10px; font-size: 13px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.erx-note.warn { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
.erx-note.bad { border-color: #fca5a5; background: #fef2f2; color: #7f1d1d; }
:root[data-theme="dark"] .erx-note.warn { background: #451a03; color: #fde68a; border-color: #92400e; }
:root[data-theme="dark"] .erx-note.bad { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
.erx-err { color: #dc2626; font-size: 12.5px; min-height: 1em; margin-right: auto; }
.erx-chk { display: inline-flex !important; gap: 6px; align-items: center; color: var(--text-primary) !important; font-weight: 600; margin-top: 4px; }
`;

let data = null;
let timer = null;

function ensureCss() {
    if (!document.getElementById("erp-style")) {
        const st = document.createElement("style");
        st.id = "erp-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}

export function ErView() {
    ensureCss();
    return `<div class="erp" id="erBoard"><div class="erp-empty">Loading…</div></div>`;
}

export function initEr() {
    clearInterval(timer);
    load();
    timer = setInterval(() => {
        if (!document.getElementById("erBoard")) return clearInterval(timer);
        if (!document.hidden && !document.querySelector(".erx-ov") && !document.querySelector("#erBoard .erp-inline")) load();
    }, 20000);
}

async function load() {
    const root = document.getElementById("erBoard");
    if (!root) return;
    const r = await api("/er").catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="erp-empty">${esc(r?.message || "Could not load the ER.")}</div>`;
        return;
    }
    data = r.data;
    render(root);
}

/* ---------------- board ---------------- */

const lvl = (a) => (a ? `<span class="er-lvl l${a}">${a} · ${esc(data?.options?.acuity?.[a]?.label || "")}</span>` : "");
const ageSex = (p) => `${p.age ?? "?"}${p.dob_estimated ? " (est.)" : ""} y · ${esc((p.sex || "").charAt(0).toUpperCase())}`;

function patientCell(v) {
    const p = v.patient;
    const unk = p.registration_status === "unidentified";
    return `<b>${esc(p.name)}</b>${unk ? `<span class="er-tag unk">Unidentified</span>` : p.registration_status === "quick" ? `<span class="er-tag" title="Quick registration: complete it at Patients">Quick reg.</span>` : ""}
        <div class="muted">${esc(p.patient_no)} · ${ageSex(p)} · ${esc(v.visit_no)}</div>
        ${unk && v.description ? `<div class="muted" style="font-size:12px">${esc(v.description)}</div>` : ""}
        ${v.allergies?.length ? `<div style="font-size:12px;color:#b91c1c;font-weight:700">Allergies: ${esc(v.allergies.map((a) => a.name).join(", "))}</div>` : ""}`;
}

function vitals(t) {
    if (!t) return "";
    const danger = (t.danger_vitals || "").split(", ");
    const isBad = (k) => danger.some((d) => d.startsWith(k));
    const parts = [
        t.bp_systolic ? `BP ${t.bp_systolic}/${t.bp_diastolic}` : null,
        t.heart_rate ? `<span class="${isBad("HR") ? "bad" : ""}">HR ${t.heart_rate}</span>` : null,
        t.resp_rate ? `<span class="${isBad("RR") ? "bad" : ""}">RR ${t.resp_rate}</span>` : null,
        t.spo2 ? `<span class="${isBad("SpO") ? "bad" : ""}">SpO₂ ${t.spo2}%${t.on_oxygen ? " on O₂" : ""}</span>` : null,
        t.temperature_c ? `T ${t.temperature_c}°` : null,
        t.pain_score !== null ? `Pain ${t.pain_score}/10` : null,
        t.gcs ? `GCS ${t.gcs}` : null,
        t.blood_glucose ? `Glu ${t.blood_glucose}` : null,
    ].filter(Boolean);
    return `<div class="er-vit">${parts.join(" · ") || `<span class="muted">No vital signs (level 1)</span>`}</div>`;
}

function actions(v) {
    const unk = v.patient.registration_status === "unidentified";
    return `<div class="acts">
        ${data.can_triage ? `<button type="button" class="erp-b sm ${v.status === "waiting" ? "go" : ""}" data-triage="${v.id}">${v.status === "waiting" ? "Triage" : "Re-triage"}</button>` : ""}
        ${unk && data.can_register ? `<button type="button" class="erp-b sm blue" data-identify="${v.id}">Identify</button>` : ""}
        <button type="button" class="erp-b sm" data-chart="${v.patient.id}">Chart</button>
        ${data.can_register ? `<button type="button" class="erp-b sm" data-close="${v.id}" aria-label="Close ${esc(v.visit_no)}">Close…</button>` : ""}
    </div>`;
}

function render(root) {
    const c = data.counts;
    const T = data.options.triage_target_min;
    const waiting = data.visits.filter((v) => v.status === "waiting");
    const triaged = data.visits.filter((v) => v.status === "triaged");
    root.innerHTML = `
        <div class="erp-head"><div><h1>Emergency Room</h1><div class="erp-sub">Triage within ${T} minutes of arrival. Refreshes every 20 seconds.</div></div>
            ${data.can_register ? `<button type="button" class="erp-b go" data-register>+ Register patient</button>` : ""}</div>
        <div class="erp-counts" role="list">
            <div class="erp-count ${c.over_target ? "warn" : ""}" role="listitem"><b>${c.waiting}</b>waiting for triage${c.over_target ? ` · ${c.over_target} over ${T} min` : ""}</div>
            ${[1, 2, 3, 4, 5].map((a) => `<div class="erp-count" role="listitem"><b>${c.by_acuity[a]}</b>${lvl(a)}</div>`).join("")}
            ${c.unidentified ? `<div class="erp-count warn" role="listitem"><b>${c.unidentified}</b>unidentified</div>` : ""}
        </div>
        <h2>Waiting for triage (${waiting.length})</h2>
        ${waiting.length ? `<div class="erp-wrap"><table><thead><tr><th>Arrived</th><th>Patient</th><th>How they came</th><th>Complaint</th><th></th></tr></thead><tbody>
            ${waiting.map((v) => `<tr data-row="${v.id}"><td class="nw">${esc(hm(v.arrived_at))}<div class="${v.minutes_waiting > T ? "erp-late" : "muted"}">${mins(v.minutes_waiting)}${v.minutes_waiting > T ? ` — over ${T} min` : ""}</div></td>
                <td>${patientCell(v)}</td><td>${esc(v.arrival_mode)}${v.brought_by ? `<div class="muted">${esc(v.brought_by)}</div>` : ""}</td>
                <td>${esc(v.chief_complaint || "—")}</td><td>${actions(v)}</td></tr>`).join("")}</tbody></table></div>`
            : `<div class="erp-empty">Nobody waiting for triage.</div>`}
        <h2>Triaged (${triaged.length})</h2>
        ${triaged.length ? `<div class="erp-wrap"><table><thead><tr><th>Level</th><th>Patient</th><th>Chief complaint</th><th>Vital signs</th><th>Triaged</th><th>In ER</th><th></th></tr></thead><tbody>
            ${triaged.map((v) => `<tr data-row="${v.id}"><td>${lvl(v.acuity)}</td><td>${patientCell(v)}</td>
                <td>${esc(v.triage?.chief_complaint || "")}${v.triage?.undertriage_reason ? `<div class="muted" style="font-size:12px">Level kept: ${esc(v.triage.undertriage_reason)}</div>` : ""}</td>
                <td>${vitals(v.triage)}</td>
                <td class="nw">${esc(hm(v.triage?.triaged_at))}<div class="muted">${esc(v.triage?.triaged_by_name || "")}</div><div class="muted">${mins(v.minutes_waiting)} after arrival</div></td>
                <td class="nw">${mins(v.minutes_in_er)}</td><td>${actions(v)}</td></tr>`).join("")}</tbody></table></div>`
            : `<div class="erp-empty">No triaged patients.</div>`}
        ${data.closed.length ? `<details style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Closed in the last 12 hours (${data.closed.length})</summary>
            <div class="erp-wrap" style="margin-top:8px"><table><thead><tr><th>Arrived</th><th>Patient</th><th>Closed</th><th>Why</th></tr></thead><tbody>
            ${data.closed.map((v) => `<tr><td class="nw">${esc(hm(v.arrived_at))} · ${esc(v.visit_no)}</td><td>${esc(v.patient.name)}</td><td class="nw">${esc(hm(v.closed_at))}</td>
                <td>${v.status === "left" ? "Left without being seen" : "Registered in error"}${v.close_reason && v.status === "cancelled" ? ` — ${esc(v.close_reason)}` : ""}</td></tr>`).join("")}</tbody></table></div></details>` : ""}`;
    root.onclick = onBoardClick;
}

async function onBoardClick(e) {
    const t = e.target;
    if (t.closest("[data-register]")) return openRegister();
    const tri = t.closest("[data-triage]");
    if (tri) return openTriage(Number(tri.dataset.triage));
    const idf = t.closest("[data-identify]");
    if (idf) return openIdentify(Number(idf.dataset.identify));
    const ch = t.closest("[data-chart]");
    if (ch) return window.__openPatientChartFromReport?.(ch.dataset.chart);
    const cl = t.closest("[data-close]");
    if (cl) {
        const row = cl.closest("tr");
        document.querySelector("#erBoard .erp-inline")?.remove();
        cl.closest("td").insertAdjacentHTML("beforeend", `<div class="erp-inline">
            <button type="button" class="erp-b sm" data-closego="left">Left without being seen</button>
            <input type="text" maxlength="255" data-closenote aria-label="What was wrong (registered in error)" placeholder="Registered in error: what was wrong">
            <button type="button" class="erp-b sm" data-closego="cancelled">Registered in error</button>
            <button type="button" class="erp-b sm" data-closeback>Back</button></div>`);
        row.querySelector("[data-closego]").focus();
        return;
    }
    if (t.closest("[data-closeback]")) return t.closest(".erp-inline").remove();
    const go = t.closest("[data-closego]");
    if (go) {
        const box = go.closest(".erp-inline");
        const id = Number(box.closest("tr").dataset.row);
        const note = box.querySelector("[data-closenote]").value.trim();
        if (go.dataset.closego === "cancelled" && !note) {
            box.querySelector("[data-closenote]").setAttribute("aria-invalid", "true");
            box.querySelector("[data-closenote]").focus();
            return showToast("Say what was wrong with the registration.", "error");
        }
        go.disabled = true;
        const r = await post("/er/close", { id, reason: go.dataset.closego, note });
        go.disabled = false;
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        if (r?.success) load();
    }
}

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

/* ---------------- modal helper ---------------- */

function modal(title, sub, bodyHtml, footHtml) {
    ensureCss();
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "erx-ov";
    ov.innerHTML = `<div class="erx" role="dialog" aria-modal="true" aria-labelledby="erxTitle">
        <div class="erx-head"><div><h2 id="erxTitle">${title}</h2>${sub ? `<div class="erp-sub">${sub}</div>` : ""}</div><button type="button" class="erx-x" data-x aria-label="Close">×</button></div>
        <div class="erx-body">${bodyHtml}</div>
        <div class="erx-foot"><span class="erx-err" role="alert"></span>${footHtml}</div></div>`;
    document.body.appendChild(ov);
    const close = () => {
        ov.remove();
        document.removeEventListener("keydown", onKey, true);
        opener?.focus?.();
    };
    const onKey = (k) => {
        if (k.key === "Escape") {
            k.stopPropagation();
            close();
        }
    };
    document.addEventListener("keydown", onKey, true);
    ov.querySelectorAll("[data-x]").forEach((b) => (b.onclick = close));
    const $ = (s) => ov.querySelector(s);
    const err = (msg, errors) => {
        $(".erx-err").textContent = msg || "";
        ov.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
        let first = null;
        Object.keys(errors || {}).forEach((k) => {
            const f = ov.querySelector(`[name="${k}"]`);
            if (f) {
                f.setAttribute("aria-invalid", "true");
                first ??= f;
            }
        });
        first?.focus();
    };
    return { ov, $, close, err };
}

function searchBox(m, name, onPick, allowOpen = false) {
    let t = null;
    const input = m.$(`[data-search="${name}"]`);
    const res = m.$(`[data-results="${name}"]`);
    input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(async () => {
            const q = input.value.trim();
            if (q.length < 2) return (res.innerHTML = "");
            const r = await api(`/er/patients?q=${encodeURIComponent(q)}`).catch(() => null);
            const list = r?.success ? r.data : [];
            res.innerHTML = list.length ? list.map((p) => {
                const off = !allowOpen && p.open_visit;
                return `<label class="${off ? "off" : ""}"><input type="radio" name="${name}" value="${p.id}" ${off ? "disabled" : ""}>
                    <span><b>${esc(p.name)}</b> <span class="muted">${esc(p.patient_no)} · ${esc(p.birthdate)}${p.dob_estimated ? " (est.)" : ""} · ${ageSex(p)}</span>
                    ${p.open_visit ? `<span class="er-tag">In the ER now (${esc(p.open_visit)})</span>` : ""}${p.registration_status === "unidentified" ? `<span class="er-tag unk">Unknown patient</span>` : ""}</span></label>`;
            }).join("") : `<div class="muted">No chart found. Try another spelling, the patient no., or the birth date (YYYY-MM-DD).</div>`;
            res.querySelectorAll("input").forEach((x) => x.addEventListener("change", () => onPick?.(x.value)));
        }, 300);
    });
}

/* ---------------- registration ---------------- */

export function openRegister() {
    const o = data.options;
    const m = modal("Register ER patient", "Quick registration — the full registration can be completed later.", `
        <div><span class="lbl" id="erMode">Who is the patient?</span>
            <div class="erx-seg" role="radiogroup" aria-labelledby="erMode">
                <label><input type="radio" name="mode" value="existing" checked> Has a chart</label>
                <label><input type="radio" name="mode" value="new"> New patient</label>
                <label><input type="radio" name="mode" value="unknown"> Unknown / can't identify</label></div></div>
        <div data-sec="existing"><label for="erSearch">Find the chart</label><input type="text" id="erSearch" data-search="patient_id" placeholder="Name, patient no. or birth date (YYYY-MM-DD)" autocomplete="off">
            <div class="erx-res" data-results="patient_id" style="margin-top:6px"></div></div>
        <div data-sec="new" hidden><div class="erx-grid two">
            <div><label for="erFirst">First name</label><input type="text" id="erFirst" name="first_name" maxlength="100" autocomplete="off"></div>
            <div><label for="erMiddle">Middle name <span style="font-weight:400">(optional)</span></label><input type="text" id="erMiddle" name="middle_name" maxlength="100" autocomplete="off"></div>
            <div><label for="erLast">Last name</label><input type="text" id="erLast" name="last_name" maxlength="100" autocomplete="off"></div>
            <div><label for="erDob">Birth date</label><input type="date" id="erDob" name="birthdate"></div>
            <div><label for="erAgeN">Or age (years) <span style="font-weight:400">if the birth date isn't known</span></label><input type="number" id="erAgeN" name="age" min="0" max="120"></div></div>
            <div data-dups></div></div>
        <div data-sec="unknown" hidden>
            <div class="erx-note">A temporary name like “Unknown Male (ER-…)” is used until the patient is identified. Record what helps identify them.</div>
            <div class="erx-grid two" style="margin-top:8px"><div><label for="erAgeU">Estimated age (years, optional)</label><input type="number" id="erAgeU" name="age_u" min="0" max="120"></div></div>
            <div style="margin-top:8px"><label for="erDesc">Description</label><textarea id="erDesc" name="description" maxlength="500" placeholder="e.g. found at Rizal Ave; blue shirt, tattoo on left arm; brought by bystander"></textarea></div></div>
        <div data-sec="sex" hidden><span class="lbl" id="erSexL">Sex</span><div class="erx-seg" role="radiogroup" aria-labelledby="erSexL">
            <label><input type="radio" name="sex" value="male"> Male</label><label><input type="radio" name="sex" value="female"> Female</label></div></div>
        <div class="erx-grid two">
            <div><label for="erArr">How they came</label><select id="erArr" name="arrival_mode"><option value="">Choose…</option>${o.arrival_modes.map((x) => `<option>${esc(x)}</option>`).join("")}</select></div>
            <div><label for="erBy">Brought by <span style="font-weight:400">(optional)</span></label><input type="text" id="erBy" name="brought_by" maxlength="150" placeholder="e.g. mother, EMS unit 4" autocomplete="off"></div>
            <div><label for="erCc">Complaint <span style="font-weight:400">(optional)</span></label><input type="text" id="erCc" name="chief_complaint" maxlength="255" placeholder="In their words" autocomplete="off"></div>
            <div><label for="erTime">Arrived at <span style="font-weight:400">(blank = now)</span></label><input type="time" id="erTime" name="arrived_time"></div></div>`,
        `<button type="button" class="erp-b" data-x>Cancel</button><button type="button" class="erp-b go" data-save>Register</button>`);
    const mode = () => m.ov.querySelector('input[name="mode"]:checked').value;
    const sync = () => {
        const md = mode();
        m.ov.querySelectorAll("[data-sec]").forEach((s) => (s.hidden = !(s.dataset.sec === md || (s.dataset.sec === "sex" && md !== "existing"))));
    };
    m.ov.querySelectorAll('input[name="mode"]').forEach((x) => x.addEventListener("change", sync));
    sync();
    searchBox(m, "patient_id");
    m.$("#erSearch").focus();
    let confirmNew = false;
    const save = async () => {
        const md = mode();
        const v = (s) => m.$(s)?.value.trim() ?? "";
        const body = { mode: md, arrival_mode: v("#erArr"), brought_by: v("#erBy"), chief_complaint: v("#erCc"), arrived_time: v("#erTime") };
        if (md === "existing") {
            body.patient_id = m.ov.querySelector('input[name="patient_id"]:checked')?.value || "";
            if (!body.patient_id) return m.err("Find and choose the patient's chart (or choose New / Unknown).", { patient_id: 1 }) || m.$("#erSearch").focus();
        } else {
            body.sex = m.ov.querySelector('input[name="sex"]:checked')?.value || "";
            if (md === "new") Object.assign(body, { first_name: v("#erFirst"), middle_name: v("#erMiddle"), last_name: v("#erLast"), birthdate: v("#erDob"), age: v("#erAgeN"), confirm_new: confirmNew ? 1 : 0 });
            else Object.assign(body, { age: v("#erAgeU"), description: v("#erDesc") });
        }
        const btn = m.$("[data-save]");
        btn.disabled = true;
        const r = await post("/er/register", body);
        btn.disabled = false;
        if (!r?.success) {
            if (r?.possible_duplicates?.length) {
                m.$("[data-dups]").innerHTML = `<div class="erx-note warn" style="margin-top:8px"><b>This may be a patient who already has a chart:</b>
                    <div class="erx-res" style="margin-top:6px">${r.possible_duplicates.map((p) => `<label><input type="radio" name="dup" value="${p.id}">
                        <span><b>${esc(p.name)}</b> <span class="muted">${esc(p.patient_no)} · ${esc(p.birthdate)} · ${ageSex(p)}</span></span></label>`).join("")}</div>
                    <div class="erp-inline"><button type="button" class="erp-b sm blue" data-usedup>Use the chosen chart</button><button type="button" class="erp-b sm" data-notdup>No — this is someone else</button></div></div>`;
                m.$("[data-usedup]").onclick = () => {
                    const id = m.ov.querySelector('input[name="dup"]:checked')?.value;
                    if (!id) return m.err("Choose the chart to use.");
                    m.ov.querySelector('input[name="mode"][value="existing"]').checked = true;
                    sync();
                    m.$("[data-results=patient_id]").innerHTML = `<label><input type="radio" name="patient_id" value="${id}" checked><span>${esc(m.ov.querySelector(`input[name="dup"][value="${id}"]`).closest("label").innerText)}</span></label>`;
                    m.err("");
                };
                m.$("[data-notdup]").onclick = () => {
                    confirmNew = true;
                    m.$("[data-dups]").innerHTML = "";
                    save();
                };
            }
            return m.err(r?.message || "Could not register. Try again.", r?.errors);
        }
        m.close();
        showToast(r.message, "success", 5000);
        await load();
        if (data.can_triage) openTriage(r.data.id);
    };
    m.$("[data-save]").onclick = save;
}

/* ---------------- triage ---------------- */

/** Same limits as the server: HR / RR above the age limit, SpO₂ under 92%. */
function danger(vs, ageMonths) {
    const [hr, rr] = ageMonths < 3 ? [180, 50] : ageMonths < 36 ? [160, 40] : ageMonths < 96 ? [140, 30] : [100, 20];
    const out = [];
    if (vs.heart_rate && Number(vs.heart_rate) > hr) out.push(`HR ${vs.heart_rate}`);
    if (vs.resp_rate && Number(vs.resp_rate) > rr) out.push(`RR ${vs.resp_rate}`);
    if (vs.spo2 && Number(vs.spo2) < 92) out.push(`SpO₂ ${vs.spo2}%`);
    return out;
}

export async function openTriage(id) {
    const r = await api(`/er/show?id=${id}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the visit.", "error");
    const v = r.data;
    const p = v.patient;
    const o = data.options;
    const prev = v.triage;
    const ageMonths = (p.age ?? 30) * 12;
    const num = (name, label, attrs = "") => `<div><label for="erT_${name}">${label}</label><input type="number" id="erT_${name}" name="${name}" ${attrs} inputmode="decimal"></div>`;
    const m = modal(`${prev ? "Re-triage" : "Triage"} — ${esc(p.name)}`, `${esc(v.visit_no)} · ${ageSex(p)} · arrived ${esc(hm(v.arrived_at))} (${esc(v.arrival_mode)})`, `
        ${v.allergies.length ? `<div class="erx-note bad"><b>Allergies on the chart:</b> ${esc(v.allergies.map((a) => a.name + (a.reaction ? ` (${a.reaction})` : "")).join("; "))}</div>`
            : `<div class="erx-note">No allergies on the chart. Ask the patient.</div>`}
        ${prev ? `<div class="erx-note">Last triage ${esc(hm(prev.triaged_at))} by ${esc(prev.triaged_by_name || "")}: ${lvl(prev.acuity)} ${esc(prev.chief_complaint)}${vitals(prev)}</div>` : ""}
        <div><span class="lbl" id="erLvlL">Acuity level</span><div class="erx-lvls" role="radiogroup" aria-labelledby="erLvlL">
            ${[1, 2, 3, 4, 5].map((a) => `<label><input type="radio" name="acuity" value="${a}" ${prev?.acuity === a ? "checked" : ""}>${lvl(a)}<small>${esc(o.acuity[a].hint)}</small></label>`).join("")}</div></div>
        <div><label for="erT_cc">Chief complaint</label><input type="text" id="erT_cc" name="chief_complaint" maxlength="255" value="${esc(prev?.chief_complaint || v.chief_complaint || "")}" autocomplete="off"></div>
        <div><span class="lbl">Vital signs <span style="font-weight:400">(BP, HR, RR and SpO₂ are needed for levels 2–5)</span></span>
        <div class="erx-grid">
            ${num("bp_systolic", "BP systolic", 'min="40" max="300"')}${num("bp_diastolic", "BP diastolic", 'min="20" max="200"')}
            ${num("heart_rate", "Heart rate /min", 'min="20" max="300"')}${num("resp_rate", "Breathing /min", 'min="4" max="80"')}
            <div><label for="erT_spo2">SpO₂ %</label><input type="number" id="erT_spo2" name="spo2" min="50" max="100"><label class="erx-chk"><input type="checkbox" name="on_oxygen"> on oxygen</label></div>
            ${num("temperature_c", "Temperature °C", 'min="25" max="45" step="0.1"')}${num("pain_score", "Pain 0–10", 'min="0" max="10"')}
            ${num("gcs", "GCS 3–15", 'min="3" max="15"')}${num("blood_glucose", "Glucose mg/dL", 'min="10" max="1500"')}${num("weight_kg", "Weight kg", 'min="0.3" max="400" step="0.1"')}
            ${p.sex === "female" ? `<div><label for="erT_preg">Pregnant</label><select id="erT_preg" name="pregnant"><option value="">—</option><option value="no">No</option><option value="yes">Yes</option><option value="unknown">Unknown</option></select></div>` : ""}
        </div></div>
        <div data-danger hidden class="erx-note warn" role="status"></div>
        <div data-why hidden><label for="erT_why">Why level <span data-lv></span> and not 2?</label><input type="text" id="erT_why" name="undertriage_reason" maxlength="255" placeholder="e.g. HR 110 from fever, settled; seen by ER doctor" autocomplete="off"></div>
        <div class="erx-grid two">
            <div><label for="erT_al">Allergies (as told)</label><input type="text" id="erT_al" name="allergies_note" maxlength="255" placeholder="e.g. penicillin — rash; none known" autocomplete="off"></div>
            <div><label for="erT_n">Notes</label><input type="text" id="erT_n" name="notes" maxlength="1000" autocomplete="off"></div></div>`,
        `<button type="button" class="erp-b" data-x>Cancel</button><button type="button" class="erp-b go" data-save>${prev ? "Save re-triage" : "Save triage"}</button>`);
    const val = (n) => m.ov.querySelector(`[name="${n}"]`)?.value.trim() ?? "";
    const check = () => {
        const d = danger({ heart_rate: val("heart_rate"), resp_rate: val("resp_rate"), spo2: val("spo2") }, ageMonths);
        const a = Number(m.ov.querySelector('input[name="acuity"]:checked')?.value || 0);
        const box = m.$("[data-danger]");
        box.hidden = !d.length;
        box.innerHTML = d.length ? `<b>Danger-zone vital signs:</b> ${esc(d.join(", "))} — consider level 2.` : "";
        m.$("[data-why]").hidden = !(d.length && a >= 3);
        m.$("[data-lv]").textContent = a || "";
    };
    m.ov.addEventListener("input", check);
    m.ov.addEventListener("change", check);
    (m.ov.querySelector('input[name="acuity"]:checked') || m.ov.querySelector('input[name="acuity"]')).focus();
    m.$("[data-save]").onclick = async (ev) => {
        const body = { id };
        ["acuity", "chief_complaint", "bp_systolic", "bp_diastolic", "heart_rate", "resp_rate", "spo2", "temperature_c", "pain_score", "gcs", "blood_glucose", "weight_kg", "pregnant",
            "allergies_note", "notes", "undertriage_reason"].forEach((k) => (body[k] = k === "acuity" ? (m.ov.querySelector('input[name="acuity"]:checked')?.value || "") : val(k)));
        body.on_oxygen = m.ov.querySelector('[name="on_oxygen"]').checked ? 1 : 0;
        if (!body.acuity) return m.err("Choose the acuity level (1–5).", { acuity: 1 });
        ev.target.disabled = true;
        const res = await post("/er/triage", body);
        ev.target.disabled = false;
        if (!res?.success) {
            if (res?.errors?.undertriage_reason) m.$("[data-why]").hidden = false;
            return m.err(res?.message || "Could not save.", res?.errors);
        }
        m.close();
        showToast(res.message, "success");
        load();
    };
}

/* ---------------- identify ---------------- */

export async function openIdentify(id) {
    const r = await api(`/er/show?id=${id}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the visit.", "error");
    const v = r.data;
    const m = modal(`Identify — ${esc(v.patient.name)}`, `${esc(v.visit_no)}${v.description ? ` · ${esc(v.description)}` : ""}`, `
        <div><span class="lbl" id="erIdL">Does the patient have a chart here?</span><div class="erx-seg" role="radiogroup" aria-labelledby="erIdL">
            <label><input type="radio" name="how" value="merge" checked> Has a chart — merge into it</label>
            <label><input type="radio" name="how" value="details"> No chart — enter the details</label></div></div>
        <div data-sec="merge"><label for="erIdS">Find their chart</label><input type="text" id="erIdS" data-search="patient_id" placeholder="Name, patient no. or birth date (YYYY-MM-DD)" autocomplete="off">
            <div class="erx-res" data-results="patient_id" style="margin-top:6px"></div>
            <div class="erx-note warn" style="margin-top:8px">Everything recorded on the temporary chart (this visit, triage, orders, results…) moves to the chosen chart, and the temporary chart is closed. This can't be undone.</div></div>
        <div data-sec="details" hidden><div class="erx-grid two">
            <div><label for="erIdF">First name</label><input type="text" id="erIdF" name="first_name" maxlength="100" autocomplete="off"></div>
            <div><label for="erIdM">Middle name <span style="font-weight:400">(optional)</span></label><input type="text" id="erIdM" name="middle_name" maxlength="100" autocomplete="off"></div>
            <div><label for="erIdLn">Last name</label><input type="text" id="erIdLn" name="last_name" maxlength="100" autocomplete="off"></div>
            <div><label for="erIdD">Birth date</label><input type="date" id="erIdD" name="birthdate"></div></div>
            <div style="margin-top:8px"><span class="lbl" id="erIdSx">Sex</span><div class="erx-seg" role="radiogroup" aria-labelledby="erIdSx">
                <label><input type="radio" name="sex" value="male" ${v.patient.sex === "male" ? "checked" : ""}> Male</label><label><input type="radio" name="sex" value="female" ${v.patient.sex === "female" ? "checked" : ""}> Female</label></div></div></div>`,
        `<button type="button" class="erp-b" data-x>Cancel</button><button type="button" class="erp-b blue" data-save>Identify</button>`);
    const how = () => m.ov.querySelector('input[name="how"]:checked').value;
    const sync = () => m.ov.querySelectorAll("[data-sec]").forEach((s) => (s.hidden = s.dataset.sec !== how()));
    m.ov.querySelectorAll('input[name="how"]').forEach((x) => x.addEventListener("change", sync));
    searchBox(m, "patient_id", null, true);
    m.$("#erIdS").focus();
    m.$("[data-save]").onclick = async (ev) => {
        const body = { id, how: how() };
        if (body.how === "merge") {
            body.patient_id = m.ov.querySelector('input[name="patient_id"]:checked')?.value || "";
            if (!body.patient_id) return m.err("Find and choose their chart.") || m.$("#erIdS").focus();
            const label = m.ov.querySelector('input[name="patient_id"]:checked').closest("label").querySelector("b").textContent;
            if (ev.target.dataset.sure !== body.patient_id) {
                ev.target.dataset.sure = body.patient_id;
                ev.target.textContent = `Merge into ${label}`;
                return m.err(`Press again to merge into ${label}'s chart.`);
            }
        } else {
            const v2 = (s) => m.$(s).value.trim();
            Object.assign(body, { first_name: v2("#erIdF"), middle_name: v2("#erIdM"), last_name: v2("#erIdLn"), birthdate: v2("#erIdD"), sex: m.ov.querySelector('input[name="sex"]:checked')?.value || "" });
        }
        ev.target.disabled = true;
        const res = await post("/er/identify", body);
        ev.target.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not save.", res?.errors);
        m.close();
        showToast(res.message, "success", 6000);
        load();
    };
}
