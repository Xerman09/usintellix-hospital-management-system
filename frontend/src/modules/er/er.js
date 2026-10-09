import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";

/*
 * ER (module 12, Phase 1; tab "er"): the ER board, quick registration and triage.
 *   * Register: a patient with a chart (search), a new patient (name, sex, birth date or age), or an
 *     unknown patient (sex, estimated age, description) under a temporary name.
 *   * Triage: acuity 1-5, chief complaint, vital signs; danger-zone vitals suggest level 2.
 *   * Identify an unknown patient: fill in the details, or merge into their existing chart.
 *   * Close: left without being seen, or registered in error.
 * Phase 2, the tracking board: ER beds with the patient, level, time waiting against the target for
 * that level, doctor, nurse, labs and imaging pending (Board view; List view = the tables). Assign
 * bed / doctor / nurse ("I'll see this patient"). Admin: ER beds, waiting-time targets, the ER team.
 * Phase 3, protocols: chest pain, stroke, sepsis -- started at triage (ticked from the complaint and
 * vital signs) or from the board; a timed checklist per patient (Protocols dialog), late steps alert the
 * doctor. Admin: the step targets.
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
.erp-views { display: inline-flex; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
.erp-views button { border: 0; background: var(--bg-surface); color: var(--text-primary); padding: 7px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.erp-views button[aria-pressed="true"] { background: #1d4ed8; color: #fff; }
.erp-area { margin: 14px 0 6px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.erp-beds { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr)); gap: 10px; }
.erp-bed { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); padding: 10px 12px; display: grid; gap: 5px; font-size: 13px; min-width: 0; }
.erp-bed.over { border-color: #f59e0b; box-shadow: inset 4px 0 0 #f59e0b; }
.erp-bed.l1 { box-shadow: inset 4px 0 0 #b91c1c; }
.erp-bed.free { border-style: dashed; color: var(--text-muted); }
.erp-bed-h { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.erp-bed-h b { font-size: 14px; }
.erp-bed .who { font-weight: 700; overflow-wrap: anywhere; }
.erp-ord { display: flex; flex-wrap: wrap; gap: 4px; }
.erp-ord span { font-size: 11.5px; padding: 1px 7px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.erp-ord span.pend { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
:root[data-theme="dark"] .erp-ord span.pend { background: #451a03; color: #fde68a; border-color: #92400e; }
.erp-set { margin-top: 22px; border: 1px solid var(--border-color); border-radius: 12px; padding: 0 14px; background: var(--bg-surface); }
.erp-set summary { cursor: pointer; font-weight: 700; padding: 12px 0; }
.erp-set h3 { font-size: 14px; margin: 14px 0 6px; }
.erp-set .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; margin: 8px 0; }
.erp-set .row > div { min-width: 0; }
.erp-set label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.erp-set input, .erp-set select { border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 8px; font: inherit; background: var(--bg-surface); color: var(--text-primary); max-width: 100%; }
.erx-chk { display: inline-flex !important; gap: 6px; align-items: center; color: var(--text-primary) !important; font-weight: 600; margin-top: 4px; }
.erp-pr { display: flex; flex-wrap: wrap; gap: 4px; }
.erp-pr button { font: inherit; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer; border: 1px solid #93c5fd; background: #eff6ff; color: #1e3a8a; text-align: left; }
.erp-pr button.late { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
.erp-pr button.done { border-color: var(--border-color); background: var(--bg-surface-alt); color: var(--text-muted); }
.erp-pr button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 1px; }
:root[data-theme="dark"] .erp-pr button { background: #172554; color: #bfdbfe; border-color: #1e40af; }
:root[data-theme="dark"] .erp-pr button.late { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
:root[data-theme="dark"] .erp-pr button.done { background: var(--bg-surface-alt); color: var(--text-muted); border-color: var(--border-color); }
.erp-count.bad { border-color: #fca5a5; background: #fef2f2; color: #7f1d1d; }
:root[data-theme="dark"] .erp-count.bad { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
.erx.wide { max-width: 860px; }
.erq { border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.erq-h { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 12px; align-items: baseline; padding: 10px 12px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
.erq-h h3 { margin: 0; font-size: 15px; }
.erq-about { font-size: 12.5px; color: var(--text-muted); padding: 8px 12px 0; }
.erq-step { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 4px 8px; padding: 9px 12px; border-top: 1px solid var(--border-color); }
.erq-step:first-of-type { border-top: 0; }
.erq-ico { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; border: 2px solid var(--border-color); color: var(--text-muted); }
.erq-step.done .erq-ico { background: #15803d; border-color: #15803d; color: #fff; }
.erq-step.na .erq-ico { background: var(--bg-surface-alt); }
.erq-step.late .erq-ico { border-color: #b91c1c; color: #b91c1c; }
.erq-step.late { background: #fef2f2; }
:root[data-theme="dark"] .erq-step.late { background: #2a0a0a; }
.erq-lbl { font-weight: 700; }
.erq-meta { font-size: 12.5px; color: var(--text-muted); }
.erq-meta .bad { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .erq-meta .bad { color: #fca5a5; }
.erq-ctl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; }
.erq-ctl input { border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 7px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
.erq-ctl input[type=time] { width: 110px; }
.erq-ctl input[type=number] { width: 100px; }
.erq-foot { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 9px 12px; border-top: 1px solid var(--border-color); }
.erq-foot input { flex: 1 1 220px; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 8px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
.erx-protos { display: grid; gap: 6px; }
.erx-protos label { display: flex; gap: 8px; align-items: flex-start; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; margin: 0; cursor: pointer; color: var(--text-primary); font-weight: 600; }
.erx-protos label:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; }
:root[data-theme="dark"] .erx-protos label:has(input:checked) { background: #172554; }
.erx-protos small { display: block; font-weight: 400; color: var(--text-muted); font-size: 12px; }
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
        const typing = document.activeElement?.closest?.("#erBoard") && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
        if (!document.hidden && !document.querySelector(".erx-ov") && !document.querySelector("#erBoard [data-closebox]") && !typing && !settingsDirty) load();
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
let view = "board";
try {
    view = localStorage.getItem("erView") || "board";
} catch (e) {}
let settingsOpen = false;
let settingsDirty = false;

/** "Waiting for a doctor 42 min — target 30 min (over)". */
function waitText(w) {
    if (!w || w.stage === "closed") return "";
    const tgt = w.target === 0 ? "at once" : `${w.target} min`;
    if (w.stage === "seen") return `<span class="muted">Seen after ${mins(w.minutes)} (target ${tgt})</span>`;
    const what = w.stage === "triage" ? "Waiting for triage" : "Waiting for a doctor";
    return `<span class="${w.over ? "erp-late" : "muted"}">${what} ${mins(w.minutes)} — target ${tgt}${w.over ? " · over" : ""}</span>`;
}

function ordersHtml(o) {
    if (!o) return "";
    const one = (label, p, d) => (p || d ? `<span class="${p ? "pend" : ""}">${label}: ${p ? `${p} pending` : ""}${p && d ? ", " : ""}${d ? `${d} done` : ""}</span>` : "");
    const h = one("Labs", o.lab_pending, o.lab_done) + one("Imaging", o.imaging_pending, o.imaging_done);
    return h ? `<div class="erp-ord">${h}</div>` : "";
}

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

function careTeam(v) {
    const role = getUser()?.role;
    const meDoc = data.can_assign && !v.doctor_user_id && ["doctor", "clinician"].includes(role) && v.status === "triaged";
    const meNurse = data.can_assign && !v.nurse_user_id && ["nurse", "charge_nurse"].includes(role);
    return `<div>Doctor: ${v.doctor_name ? `<b>${esc(v.doctor_name)}</b>` : `<span class="muted">none</span>`}${meDoc ? ` <button type="button" class="erp-b sm blue" data-me="doctor" data-id="${v.id}">I'll see this patient</button>` : ""}</div>
        <div>Nurse: ${v.nurse_name ? esc(v.nurse_name) : `<span class="muted">none</span>`}${meNurse ? ` <button type="button" class="erp-b sm" data-me="nurse" data-id="${v.id}">I'm the nurse</button>` : ""}</div>`;
}

/* ---------------- protocols (Phase 3) ---------------- */

/** "ECG 4 min left" / "ECG 3 min late". */
function dueText(n) {
    if (!n) return "";
    return n.remaining > 0 ? `${esc(shortStep(n.label))} in ${mins(n.remaining)}` : `${esc(shortStep(n.label))} ${mins(-n.remaining)} late`;
}
const shortStep = (l) => String(l).split(/ (?:—|done|sent|measured|checked|taken|given|recorded|scored|started|read by)/)[0];

function protocolChips(v) {
    const list = (v.protocols || []).filter((p) => p.status !== "stopped");
    if (!list.length) return "";
    return `<div class="erp-pr">${list.map((p) => {
        const cls = p.status === "complete" ? "done" : p.late ? "late" : "";
        const txt = p.status === "complete" ? "done ✓" : p.late ? `${p.late} late · ${dueText(p.next)}` : p.next ? dueText(p.next) : `${p.done}/${p.total}`;
        return `<button type="button" class="${cls}" data-proto="${v.id}" aria-label="${esc(p.label)} protocol: ${esc(txt)}. Open the checklist">⏱ ${esc(p.label)} · ${txt}</button>`;
    }).join("")}</div>`;
}

function actions(v) {
    const unk = v.patient.registration_status === "unidentified";
    return `<div class="acts">
        ${data.can_triage ? `<button type="button" class="erp-b sm" data-proto="${v.id}">Protocols…</button>` : ""}
        ${data.can_triage ? `<button type="button" class="erp-b sm ${v.status === "waiting" ? "go" : ""}" data-triage="${v.id}">${v.status === "waiting" ? "Triage" : "Re-triage"}</button>` : ""}
        ${data.can_assign ? `<button type="button" class="erp-b sm" data-assign="${v.id}">Bed / staff…</button>` : ""}
        ${unk && data.can_register ? `<button type="button" class="erp-b sm blue" data-identify="${v.id}">Identify</button>` : ""}
        <button type="button" class="erp-b sm" data-chart="${v.patient.id}">Chart</button>
        ${data.can_register ? `<button type="button" class="erp-b sm" data-close="${v.id}" aria-label="Close ${esc(v.visit_no)}">Close…</button>` : ""}
    </div>`;
}

function bedCard(b, v) {
    if (!v) {
        const waiting = data.visits.filter((x) => !x.er_bed_id);
        return `<div class="erp-bed free" data-bed="${b.id}"><div class="erp-bed-h"><b>${esc(b.name)}</b><span>Free</span></div>
            ${data.can_assign && waiting.length ? `<div class="erp-inline" style="margin:0"><select data-putin aria-label="Put a patient in ${esc(b.name)}"><option value="">Put a patient here…</option>
                ${waiting.map((x) => `<option value="${x.id}">${x.acuity ? `L${x.acuity} · ` : ""}${esc(x.patient.name)}</option>`).join("")}</select></div>` : ""}</div>`;
    }
    const over = v.wait.over && v.wait.stage !== "seen";
    return `<div class="erp-bed ${over ? "over" : ""} ${v.acuity === 1 ? "l1" : ""}" data-row="${v.id}">
        <div class="erp-bed-h"><b>${esc(b.name)}</b>${v.acuity ? lvl(v.acuity) : `<span class="er-tag">Not triaged</span>`}</div>
        <div class="who">${esc(v.patient.name)}${v.patient.registration_status === "unidentified" ? `<span class="er-tag unk">Unidentified</span>` : ""} <span class="muted" style="font-weight:400">${ageSex(v.patient)}</span></div>
        ${v.triage?.chief_complaint || v.chief_complaint ? `<div>${esc(v.triage?.chief_complaint || v.chief_complaint)}</div>` : ""}
        ${v.allergies?.length ? `<div style="font-size:12px;color:#b91c1c;font-weight:700">Allergies: ${esc(v.allergies.map((a) => a.name).join(", "))}</div>` : ""}
        <div>${waitText(v.wait)} <span class="muted">· in ER ${mins(v.minutes_in_er)}</span></div>
        ${protocolChips(v)}${careTeam(v)}${ordersHtml(v.orders)}${actions(v)}</div>`;
}

function render(root) {
    const c = data.counts;
    const T = data.options.targets;
    const waitingRoom = data.visits.filter((v) => !v.er_bed_id);
    const byId = Object.fromEntries(data.visits.map((v) => [v.id, v]));
    const areas = {};
    data.beds.forEach((b) => (areas[b.area] ??= []).push(b));
    const free = data.beds.filter((b) => !b.visit_id).length;
    const head = `
        <div class="erp-head"><div><h1>Emergency Room</h1><div class="erp-sub">Targets: triage ${T[0]} min; doctor by level — ${[1, 2, 3, 4, 5].map((a) => `${a}: ${T[a] === 0 ? "at once" : T[a] + " min"}`).join(", ")}. Refreshes every 20 seconds.</div></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <div class="erp-views" role="group" aria-label="View"><button type="button" data-view="board" aria-pressed="${view === "board"}">Board</button><button type="button" data-view="list" aria-pressed="${view === "list"}">List</button></div>
                ${data.can_register ? `<button type="button" class="erp-b go" data-register>+ Register patient</button>` : ""}</div></div>
        <div class="erp-counts" role="list">
            <div class="erp-count ${c.triage_over ? "warn" : ""}" role="listitem"><b>${c.waiting}</b>waiting for triage${c.triage_over ? ` · ${c.triage_over} over target` : ""}</div>
            <div class="erp-count ${c.doctor_over ? "warn" : ""}" role="listitem"><b>${c.no_doctor}</b>need a doctor${c.doctor_over ? ` · ${c.doctor_over} over target` : ""}</div>
            ${[1, 2, 3, 4, 5].map((a) => `<div class="erp-count" role="listitem"><b>${c.by_acuity[a]}</b>${lvl(a)}</div>`).join("")}
            <div class="erp-count" role="listitem"><b>${free}</b>free bed${free === 1 ? "" : "s"} of ${data.beds.length}</div>
            ${c.unidentified ? `<div class="erp-count warn" role="listitem"><b>${c.unidentified}</b>unidentified</div>` : ""}
            ${c.protocols ? `<div class="erp-count ${c.protocol_late ? "bad" : ""}" role="listitem"><b>${c.protocols}</b>protocol${c.protocols === 1 ? "" : "s"} running${c.protocol_late ? ` · ${c.protocol_late} step${c.protocol_late === 1 ? "" : "s"} late` : ""}</div>` : ""}
        </div>`;
    const wrTable = (list, title) => `<h2>${title} (${list.length})</h2>
        ${list.length ? `<div class="erp-wrap"><table><thead><tr><th>Arrived</th><th>Patient</th><th>Level</th><th>Complaint</th><th>Waiting</th><th>Care team</th>${view === "list" ? "<th>Bed</th><th>Vital signs</th>" : ""}<th></th></tr></thead><tbody>
            ${list.map((v) => `<tr data-row="${v.id}"><td class="nw">${esc(hm(v.arrived_at))}<div class="muted">${esc(v.arrival_mode)}</div></td>
                <td>${patientCell(v)}</td><td>${v.acuity ? lvl(v.acuity) : `<span class="er-tag">Not triaged</span>`}</td>
                <td>${esc(v.triage?.chief_complaint || v.chief_complaint || "—")}${v.triage?.undertriage_reason ? `<div class="muted" style="font-size:12px">Level kept: ${esc(v.triage.undertriage_reason)}</div>` : ""}</td>
                <td>${waitText(v.wait)}${protocolChips(v)}${ordersHtml(v.orders)}</td><td>${careTeam(v)}</td>
                ${view === "list" ? `<td>${esc(v.bed_name || "Waiting room")}</td><td>${vitals(v.triage)}</td>` : ""}<td>${actions(v)}</td></tr>`).join("")}</tbody></table></div>`
            : `<div class="erp-empty">Nobody here.</div>`}`;
    const board = `
        ${data.beds.length ? Object.entries(areas).map(([a, beds]) => `<div class="erp-area">${esc(data.options.areas[a] || a)}</div>
            <div class="erp-beds">${beds.map((b) => bedCard(b, b.visit_id ? byId[b.visit_id] : null)).join("")}</div>`).join("")
            : `<div class="erp-empty">No ER beds set up yet.${data.settings ? " Add them under ER settings below." : " Ask the admin to add them."}</div>`}
        ${wrTable(waitingRoom, "Waiting room (no bed)")}`;
    root.innerHTML = head + (view === "board" ? board : wrTable(data.visits, "All patients in the ER"))
        + (data.closed.length ? `<details style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Closed in the last 12 hours (${data.closed.length})</summary>
            <div class="erp-wrap" style="margin-top:8px"><table><thead><tr><th>Arrived</th><th>Patient</th><th>Closed</th><th>Why</th></tr></thead><tbody>
            ${data.closed.map((v) => `<tr><td class="nw">${esc(hm(v.arrived_at))} · ${esc(v.visit_no)}</td><td>${esc(v.patient.name)}</td><td class="nw">${esc(hm(v.closed_at))}</td>
                <td>${v.status === "left" ? "Left without being seen" : "Registered in error"}${v.close_reason && v.status === "cancelled" ? ` — ${esc(v.close_reason)}` : ""}</td></tr>`).join("")}</tbody></table></div></details>` : "")
        + (data.settings ? settingsHtml(data.settings) : "");
    root.onclick = onBoardClick;
    root.querySelectorAll("[data-putin]").forEach((sel) => sel.addEventListener("change", async () => {
        if (!sel.value) return;
        sel.disabled = true;
        const r = await post("/er/assign", { id: Number(sel.value), er_bed_id: Number(sel.closest("[data-bed]").dataset.bed) });
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        load();
    }));
    const set = root.querySelector(".erp-set");
    if (set) {
        set.addEventListener("toggle", () => {
            settingsOpen = set.open;
            if (!set.open) settingsDirty = false;
        });
        set.addEventListener("input", () => (settingsDirty = true));
    }
}

/* ---------------- settings (admin) ---------------- */

function settingsHtml(st) {
    const inTeam = new Set(st.team.map((t) => Number(t.user_id)));
    return `<details class="erp-set" ${settingsOpen ? "open" : ""}><summary>ER settings (admin): beds, waiting-time targets, ER team</summary>
        <h3>ER beds</h3>
        ${st.beds.length ? `<div class="erp-wrap"><table><thead><tr><th>Bed</th><th>Area</th><th>Status</th><th></th></tr></thead><tbody>
            ${st.beds.map((b) => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.area_label)}</td><td>${b.is_active ? (b.visit_id ? "In use" : "Free") : `<span class="muted">Switched off</span>`}</td>
                <td style="text-align:right"><button type="button" class="erp-b sm" data-bedtoggle="${b.id}" data-name="${esc(b.name)}" data-area="${esc(b.area)}" data-on="${b.is_active ? 0 : 1}">${b.is_active ? "Switch off" : "Switch on"}</button></td></tr>`).join("")}
            </tbody></table></div>` : `<div class="erp-empty">No beds yet.</div>`}
        <div class="row"><div><label for="erbPrefix">Add beds named</label><input id="erbPrefix" maxlength="30" placeholder="e.g. Bay" size="10"></div>
            <div><label for="erbCount">How many</label><input id="erbCount" type="number" min="1" max="50" value="1" style="width:80px"></div>
            <div><label for="erbArea">Area</label><select id="erbArea">${Object.entries(st.areas).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
            <button type="button" class="erp-b" data-bedadd>Add</button></div>
        <div class="muted" style="font-size:12px">“Bay” × 3 adds Bay 1, Bay 2, Bay 3 (numbering continues after the beds already there).</div>
        <h3>Waiting-time targets (minutes from arrival)</h3>
        <div class="row">
            <div><label for="ert0">Triage</label><input id="ert0" type="number" min="0" max="1440" value="${st.targets[0]}" style="width:80px"></div>
            ${[1, 2, 3, 4, 5].map((a) => `<div><label for="ert${a}">Doctor, level ${a}</label><input id="ert${a}" type="number" min="0" max="1440" value="${st.targets[a]}" style="width:80px"></div>`).join("")}
            <button type="button" class="erp-b" data-targets>Save targets</button></div>
        <div class="muted" style="font-size:12px">Past the target, the ER team gets an alert (level 1: critical; 2–3: urgent; 4–5: information). 0 = at once.</div>
        <h3>Protocol timers (minutes)</h3>
        <div class="row">${Object.entries(st.protocols).map(([k, p]) => Object.entries(p.steps).filter(([, s]) => s.target !== null).map(([sk, s]) =>
            `<div><label for="erpt_${k}_${sk}">${esc(p.label)}: ${esc(shortStep(s.label))}</label><input id="erpt_${k}_${sk}" data-pt="${k}" data-ps="${sk}" type="number" min="1" max="1440" value="${s.target}" style="width:80px" title="Built-in: ${s.default_target} min"></div>`).join("")).join("")}
            <button type="button" class="erp-b" data-ptsave>Save protocol timers</button></div>
        <div class="muted" style="font-size:12px">Chest pain and stroke count from arrival; sepsis from when it is recognised (triage, or when started later). A step past its time alerts the patient's doctor (no doctor yet: the ER team's doctors, otherwise all doctors) and nurse.</div>
        <h3>ER team <span class="muted" style="font-weight:400">(gets the waiting-time alerts; nobody on it: charge nurses, and all doctors for patients waiting for one)</span></h3>
        ${st.team.length ? `<div class="erp-wrap"><table><tbody>${st.team.map((t) => `<tr><td><b>${esc(t.name)}</b></td><td>${esc(String(t.role || "").replace("_", " "))}</td>
            <td style="text-align:right"><button type="button" class="erp-b sm" data-team="${t.user_id}" data-on="0">Remove</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="erp-empty">Nobody on the ER team.</div>`}
        <div class="row"><div><label for="erTeamAdd">Add</label><select id="erTeamAdd"><option value="">Choose a doctor or nurse…</option>
            ${st.staff.filter((s) => !inTeam.has(s.id)).map((s) => `<option value="${s.id}">${esc(s.name)} (${esc(s.role.replace("_", " "))})</option>`).join("")}</select></div>
            <button type="button" class="erp-b" data-teamadd>Add to ER team</button></div>
        <div style="height:12px"></div></details>`;
}

async function onBoardClick(e) {
    const t = e.target;
    const vb = t.closest("[data-view]");
    if (vb) {
        view = vb.dataset.view;
        try {
            localStorage.setItem("erView", view);
        } catch (err) {}
        return render(document.getElementById("erBoard"));
    }
    if (t.closest("[data-register]")) return openRegister();
    const tri = t.closest("[data-triage]");
    if (tri) return openTriage(Number(tri.dataset.triage));
    const as = t.closest("[data-assign]");
    if (as) return openAssign(Number(as.dataset.assign));
    const pr = t.closest("[data-proto]");
    if (pr) return openProtocols(Number(pr.dataset.proto));
    const me = t.closest("[data-me]");
    if (me) {
        me.disabled = true;
        const r = await post("/er/assign", { id: Number(me.dataset.id), me: me.dataset.me });
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        return load();
    }
    const idf = t.closest("[data-identify]");
    if (idf) return openIdentify(Number(idf.dataset.identify));
    const ch = t.closest("[data-chart]");
    if (ch) return window.__openPatientChartFromReport?.(ch.dataset.chart);
    const cl = t.closest("[data-close]");
    if (cl) {
        document.querySelector("#erBoard .erp-inline:not(:has([data-putin]))")?.remove();
        cl.closest(".acts").insertAdjacentHTML("afterend", `<div class="erp-inline" data-closebox="${cl.dataset.close}">
            <button type="button" class="erp-b sm" data-closego="left">Left without being seen</button>
            <input type="text" maxlength="255" data-closenote aria-label="What was wrong (registered in error)" placeholder="Registered in error: what was wrong">
            <button type="button" class="erp-b sm" data-closego="cancelled">Registered in error</button>
            <button type="button" class="erp-b sm" data-closeback>Back</button></div>`);
        cl.closest(".acts").nextElementSibling.querySelector("[data-closego]").focus();
        return;
    }
    if (t.closest("[data-closeback]")) return t.closest(".erp-inline").remove();
    const go = t.closest("[data-closego]");
    if (go) {
        const box = go.closest(".erp-inline");
        const id = Number(box.dataset.closebox);
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
        return;
    }
    // Settings (admin)
    const after = (r) => {
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        if (r?.success) {
            settingsDirty = false;
            load();
        }
    };
    const bt = t.closest("[data-bedtoggle]");
    if (bt) return after(await post("/er/beds", { id: Number(bt.dataset.bedtoggle), name: bt.dataset.name, area: bt.dataset.area, is_active: Number(bt.dataset.on) }));
    if (t.closest("[data-bedadd]")) {
        const prefix = document.getElementById("erbPrefix").value.trim();
        if (!prefix) return document.getElementById("erbPrefix").focus();
        return after(await post("/er/beds", { prefix, count: Number(document.getElementById("erbCount").value || 1), area: document.getElementById("erbArea").value }));
    }
    if (t.closest("[data-ptsave]")) {
        const targets = {};
        document.querySelectorAll("#erBoard [data-pt]").forEach((i) => ((targets[i.dataset.pt] ??= {})[i.dataset.ps] = i.value.trim()));
        return after(await post("/er/protocol-targets", { targets }));
    }
    if (t.closest("[data-targets]")) return after(await post("/er/targets", { targets: [0, 1, 2, 3, 4, 5].map((a) => document.getElementById(`ert${a}`).value.trim()) }));
    const tm = t.closest("[data-team]");
    if (tm) return after(await post("/er/team", { user_id: Number(tm.dataset.team), on: 0 }));
    if (t.closest("[data-teamadd]")) {
        const id = document.getElementById("erTeamAdd").value;
        if (!id) return document.getElementById("erTeamAdd").focus();
        return after(await post("/er/team", { user_id: Number(id), on: 1 }));
    }
}

/* ---------------- bed / doctor / nurse ---------------- */

async function openAssign(id) {
    const r = await api(`/er/show?id=${id}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the visit.", "error");
    const v = r.data;
    const freeBeds = data.beds.filter((b) => !b.visit_id || b.id === v.er_bed_id);
    const staff = (roles) => data.staff.filter((s) => roles.includes(s.role));
    const opt = (s, cur) => `<option value="${s.id}" ${s.id === cur ? "selected" : ""}>${esc(s.name)}${s.er_team ? " · ER team" : ""}</option>`;
    const m = modal(`Bed and care team — ${esc(v.patient.name)}`, `${esc(v.visit_no)}${v.acuity ? ` · level ${v.acuity}` : " · not triaged yet"}`, `
        <div class="erx-grid two">
            <div><label for="erABed">Bed</label><select id="erABed" name="er_bed_id"><option value="">Waiting room (no bed)</option>
                ${freeBeds.map((b) => `<option value="${b.id}" ${b.id === v.er_bed_id ? "selected" : ""}>${esc(b.name)} · ${esc(b.area_label)}</option>`).join("")}</select></div>
            <div><label for="erADoc">Doctor</label><select id="erADoc" name="doctor_user_id"><option value="">None yet</option>${staff(["doctor", "clinician"]).map((s) => opt(s, v.doctor_user_id)).join("")}</select></div>
            <div><label for="erANurse">Nurse</label><select id="erANurse" name="nurse_user_id"><option value="">None yet</option>${staff(["nurse", "charge_nurse"]).map((s) => opt(s, v.nurse_user_id)).join("")}</select></div>
        </div>
        <div class="erx-note">${v.doctor_at ? `Seen by a doctor at ${esc(hm(v.doctor_at))} (${mins(v.wait.minutes)} after arrival). Changing the doctor keeps that time.`
            : "The first doctor assigned counts as the patient being seen: the waiting time stops and the waiting alert closes."}</div>`,
        `<button type="button" class="erp-b" data-x>Cancel</button><button type="button" class="erp-b blue" data-save>Save</button>`);
    m.$("#erABed").focus();
    m.$("[data-save]").onclick = async (ev) => {
        ev.target.disabled = true;
        const res = await post("/er/assign", { id, er_bed_id: m.$("#erABed").value, doctor_user_id: m.$("#erADoc").value, nurse_user_id: m.$("#erANurse").value });
        ev.target.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not save.", res?.errors);
        m.close();
        showToast(res.message, "success");
        load();
    };
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
    const running = new Set((v.protocols || []).filter((x) => x.status !== "stopped").map((x) => x.protocol));
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
        <div><span class="lbl" id="erProtoL">Protocols <span style="font-weight:400">(ticked from the complaint and vital signs — untick if they don't apply)</span></span>
            <div class="erx-protos" role="group" aria-labelledby="erProtoL">${Object.entries(o.protocols).map(([k, pr]) => {
                const on = running.has(k);
                return `<label><input type="checkbox" name="proto" value="${k}" ${on ? "checked disabled" : ""}><span>${esc(pr.label)}${on ? " — running" : ""}<small data-why-${k}>${esc(pr.about)}</small></span></label>`;
            }).join("")}</div></div>
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
        const sug = suggestProtocols(val("chief_complaint"), { temperature_c: val("temperature_c"), heart_rate: val("heart_rate"), resp_rate: val("resp_rate"), bp_systolic: val("bp_systolic"), gcs: val("gcs") });
        m.ov.querySelectorAll('input[name="proto"]:not(:disabled)').forEach((cb) => {
            if (!cb.dataset.touched) cb.checked = !!sug[cb.value];
            const why = m.$(`[data-why-${cb.value}]`);
            why.textContent = sug[cb.value] ? `Suggested: ${sug[cb.value]}.` : o.protocols[cb.value].about;
        });
    };
    // A box the user ticked or unticked is theirs: the suggestion no longer changes it.
    m.ov.querySelectorAll('input[name="proto"]').forEach((cb) => ["input", "change"].forEach((ev) => cb.addEventListener(ev, () => (cb.dataset.touched = "1"))));
    m.ov.addEventListener("input", check);
    m.ov.addEventListener("change", check);
    check();
    (m.ov.querySelector('input[name="acuity"]:checked') || m.ov.querySelector('input[name="acuity"]')).focus();
    m.$("[data-save]").onclick = async (ev) => {
        const body = { id };
        ["acuity", "chief_complaint", "bp_systolic", "bp_diastolic", "heart_rate", "resp_rate", "spo2", "temperature_c", "pain_score", "gcs", "blood_glucose", "weight_kg", "pregnant",
            "allergies_note", "notes", "undertriage_reason"].forEach((k) => (body[k] = k === "acuity" ? (m.ov.querySelector('input[name="acuity"]:checked')?.value || "") : val(k)));
        body.on_oxygen = m.ov.querySelector('[name="on_oxygen"]').checked ? 1 : 0;
        body.protocols = [...m.ov.querySelectorAll('input[name="proto"]:checked:not(:disabled)')].map((x) => x.value);
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

/* ---------------- protocols: suggestion (same rules as the server) ---------------- */

function suggestProtocols(complaint, vs) {
    const P = data.options.protocols;
    const c = ` ${String(complaint || "").toLowerCase()} `;
    const hit = (k) => P[k].keywords.find((w) => new RegExp(`(?<![a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`).test(c));
    const out = {};
    ["chest_pain", "stroke"].forEach((k) => {
        const w = hit(k);
        if (w) out[k] = `“${w}” in the complaint`;
    });
    const n = (x) => (x === "" || x === null || x === undefined ? null : Number(x));
    const [t, hr, rr, sbp, gcs] = [n(vs.temperature_c), n(vs.heart_rate), n(vs.resp_rate), n(vs.bp_systolic), n(vs.gcs)];
    const word = hit("sepsis");
    const infection = !!word || (t !== null && (t >= 38.3 || t < 36));
    const sirs = (t !== null && (t > 38 || t < 36)) + (hr !== null && hr > 90) + (rr !== null && rr > 20);
    const qsofa = (rr !== null && rr >= 22) + (sbp !== null && sbp <= 100) + (gcs !== null && gcs < 15);
    if (infection && (sirs >= 2 || qsofa >= 2)) out.sepsis = `${word ? `“${word}”` : `temperature ${t}°`}${qsofa >= 2 ? ` and qSOFA ${qsofa}` : ` and ${sirs} SIRS signs`}`;
    return out;
}

/* ---------------- protocols: the checklist dialog ---------------- */

export async function openProtocols(visitId) {
    const r = await api(`/er/show?id=${visitId}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the visit.", "error");
    let v = r.data;
    let changed = false;
    const can = data.can_triage;
    const open = ["waiting", "triaged"].includes(v.status);
    const m = modal(`Protocols — ${esc(v.patient.name)}`, `${esc(v.visit_no)} · ${ageSex(v.patient)} · arrived ${esc(hm(v.arrived_at))}${v.acuity ? ` · level ${v.acuity}` : ""}`, "", `<button type="button" class="erp-b" data-x>Close</button>`);
    m.ov.querySelector(".erx").classList.add("wide");
    const body = m.$(".erx-body");
    const closeBtn = m.ov.querySelectorAll("[data-x]");
    closeBtn.forEach((b) => b.addEventListener("click", () => changed && load()));

    const stepMeta = (p, s) => {
        const due = s.target !== null ? `target ${s.target === 0 ? "at once" : `${s.target} min`} (by ${esc(hm(s.due_at))})` : "";
        if (s.status === "done") {
            const who = s.auto ? "filled in automatically" : s.recorded_by_name ? `by ${esc(s.recorded_by_name)}` : "";
            // Last known well: the time (with the date when it isn't the day it was recorded).
            const lkw = (x) => (x.slice(0, 10) === String(s.done_at).slice(0, 10) ? `last known well ${hm(x + ":00")}` : `last known well ${x.slice(0, 10)} ${hm(x + ":00")}`);
            const val = s.value ? ` · <b>${esc(s.input === "lkw" && s.value !== "Unknown" ? lkw(s.value) : s.value)}${s.number ? ` ${esc(s.number.unit)}` : ""}</b>` : "";
            const win = s.window_end ? ` · thrombolysis window ${s.window_left > 0 ? `until ${esc(hm(s.window_end))} (${mins(s.window_left)} left)` : `<span class="bad">passed at ${esc(hm(s.window_end))}</span>`}` : "";
            return `Done ${esc(hm(s.done_at))}${s.target !== null ? ` — ${s.done_late ? `<span class="bad">${mins(s.minutes)}, over the ${s.target} min target</span>` : `${mins(s.minutes)}, within ${s.target} min`}` : ""}${val} · ${who}${win}`;
        }
        if (s.status === "na") return `${esc(s.na || "Not needed")}${s.recorded_by_name ? ` · ${esc(s.recorded_by_name)}` : ""}`;
        if (s.late) return `<span class="bad">${mins(-s.remaining)} late</span> — ${due}${s.alerted ? " · doctor alerted" : ""}`;
        if (s.remaining !== null && p.status === "active" && open) return `${mins(s.remaining)} left — ${due}`;
        return due || "No time target";
    };
    const ctl = (p, s) => {
        const id = `${p.id}_${s.key}`;
        if (!can || p.status === "stopped") return "";
        if (s.status !== "pending") return `<div class="erq-ctl"><button type="button" class="erp-b sm" data-undo="${p.id}" data-step="${s.key}">Undo</button></div>`;
        const time = s.input === "lkw" ? "" : `<label class="muted" for="erqT_${id}" style="font-size:12px">at</label><input type="time" id="erqT_${id}" data-time aria-label="Time it was done (blank = now)" title="Blank = now">`;
        let main;
        if (s.result) main = s.result.map((x) => `<button type="button" class="erp-b sm blue" data-done="${p.id}" data-step="${s.key}" data-value="${esc(x)}">${esc(x)}</button>`).join("");
        else if (s.number) main = `<input type="number" data-val min="${s.number.min}" max="${s.number.max}" step="${s.number.decimals ? "0.1" : "1"}" aria-label="${esc(s.label)} (${esc(s.number.unit)})" placeholder="${esc(s.number.unit)}"><button type="button" class="erp-b sm blue" data-done="${p.id}" data-step="${s.key}">Done</button>`;
        else if (s.input === "lkw") main = `<input type="datetime-local" data-val aria-label="Last known well"><button type="button" class="erp-b sm blue" data-done="${p.id}" data-step="${s.key}">Save</button><button type="button" class="erp-b sm" data-done="${p.id}" data-step="${s.key}" data-value="unknown">Unknown</button>`;
        else main = `<button type="button" class="erp-b sm blue" data-done="${p.id}" data-step="${s.key}">Done</button>`;
        return `<div class="erq-ctl">${main}${time}${s.na ? `<button type="button" class="erp-b sm" data-na="${p.id}" data-step="${s.key}" title="${esc(s.na)}">${esc(s.na.split(" (")[0])}</button>` : ""}</div>`;
    };
    const card = (p) => `<section class="erq" data-p="${p.id}" aria-label="${esc(p.label)} protocol">
        <div class="erq-h"><h3>⏱ ${esc(p.label)} ${p.status === "complete" ? `<span class="er-tag">Complete</span>` : p.status === "stopped" ? `<span class="er-tag">Stopped</span>` : p.late ? `<span class="er-tag unk">${p.late} late</span>` : ""}</h3>
            <span class="erq-meta">Started ${esc(hm(p.started_at))}${p.started_via === "triage" ? " at triage" : ""}${p.started_by_name ? ` by ${esc(p.started_by_name)}` : ""} · clock from ${p.clock === "arrival" ? "arrival" : "recognition"} ${esc(hm(p.clock_at))}${p.status === "active" && open ? ` · ${mins(Math.max(0, p.elapsed))} so far` : ""}</span></div>
        ${p.status === "stopped" ? `<div class="erq-about">Stopped ${esc(hm(p.stopped_at))}${p.stopped_by_name ? ` by ${esc(p.stopped_by_name)}` : ""}: ${esc(p.stop_reason)}</div>` : `<div class="erq-about">${esc(p.about)}</div>`}
        <div style="margin-top:6px">${p.steps.map((s) => `<div class="erq-step ${s.status} ${s.late ? "late" : ""}">
            <span class="erq-ico" aria-hidden="true">${s.status === "done" ? "✓" : s.status === "na" ? "–" : s.late ? "!" : ""}</span>
            <div><div class="erq-lbl">${esc(s.label)}<span class="sr-only"> — ${s.status === "pending" ? (s.late ? "late" : "to do") : s.status === "done" ? "done" : "not needed"}</span></div>
                <div class="erq-meta">${stepMeta(p, s)}</div>
                ${s.hint && s.status === "pending" ? `<div class="erq-meta">${esc(s.hint)}</div>` : ""}
                ${s.orders?.length ? `<div class="erq-meta">Orders: ${s.orders.map((o) => `${esc(o.name)} (${esc(o.status)})`).join(", ")}</div>` : ""}
                ${ctl(p, s)}</div></div>`).join("")}</div>
        ${can && p.status !== "stopped" ? `<div class="erq-foot"><input type="text" maxlength="255" data-reason aria-label="Why stop the ${esc(p.label)} protocol" placeholder="Stop: why (e.g. ruled out, other diagnosis)"><button type="button" class="erp-b sm" data-stop="${p.id}">Stop protocol</button></div>` : ""}
    </section>`;
    const render = () => {
        const live = v.protocols.filter((p) => p.status !== "stopped");
        const stopped = v.protocols.filter((p) => p.status === "stopped");
        const running = new Set(live.map((p) => p.protocol));
        const startable = Object.entries(data.options.protocols).filter(([k]) => !running.has(k));
        body.innerHTML = `${!open ? `<div class="erx-note">This ER visit is closed.</div>` : ""}
            ${live.length ? live.map(card).join("") : `<div class="erp-empty">No protocol running for this patient.</div>`}
            ${can && open && startable.length ? `<div><span class="lbl">Start a protocol</span><div class="erp-inline" style="margin-top:0">${startable.map(([k, pr]) => `<button type="button" class="erp-b" data-start="${k}" title="${esc(pr.about)}">Start ${esc(pr.label)}</button>`).join("")}</div></div>` : ""}
            ${stopped.length ? `<details><summary style="cursor:pointer;font-weight:600">Stopped (${stopped.length})</summary><div style="display:grid;gap:10px;margin-top:8px">${stopped.map(card).join("")}</div></details>` : ""}`;
    };
    const run = async (btn, path, payload) => {
        btn.disabled = true;
        const res = await post(path, payload);
        btn.disabled = false;
        if (!res?.success) {
            m.err(res?.message || "Could not save.");
            return false;
        }
        m.err("");
        changed = true;
        v = res.data;
        const focusKey = btn.dataset.step ? `[data-p="${btn.dataset.done || btn.dataset.na || btn.dataset.undo}"]` : null;
        render();
        showToast(res.message, "success");
        // Next: the first step still to do in the same protocol.
        (focusKey && (body.querySelector(`${focusKey} .erq-step.pending button, ${focusKey} .erq-step.pending input`) || body.querySelector(`${focusKey} .erq-step button`))
            || body.querySelector("button"))?.focus?.();
        return true;
    };
    body.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const row = b.closest(".erq-step");
        const time = row?.querySelector("[data-time]")?.value || "";
        if (b.dataset.start) return run(b, "/er/protocol/start", { id: v.id, protocol: b.dataset.start });
        if (b.dataset.done) {
            let value = b.dataset.value ?? row.querySelector("[data-val]")?.value?.trim() ?? "";
            const inp = row.querySelector("[data-val]");
            if (b.dataset.value === undefined && inp && !value) {
                inp.setAttribute("aria-invalid", "true");
                inp.focus();
                return m.err("Enter the value first.");
            }
            return run(b, "/er/protocol/step", { protocol_id: Number(b.dataset.done), step: b.dataset.step, action: "done", value, time });
        }
        if (b.dataset.na) return run(b, "/er/protocol/step", { protocol_id: Number(b.dataset.na), step: b.dataset.step, action: "na", time });
        if (b.dataset.undo) return run(b, "/er/protocol/step", { protocol_id: Number(b.dataset.undo), step: b.dataset.step, action: "undo" });
        if (b.dataset.stop) {
            const reason = b.closest(".erq-foot").querySelector("[data-reason]");
            if (!reason.value.trim()) {
                reason.setAttribute("aria-invalid", "true");
                reason.focus();
                return m.err("Say why the protocol is stopped.");
            }
            return run(b, "/er/protocol/stop", { protocol_id: Number(b.dataset.stop), reason: reason.value.trim() });
        }
    });
    render();
    (body.querySelector(".erq-step.late button, .erq-step.pending button") || body.querySelector("button") || m.$("[data-x]")).focus();
}
