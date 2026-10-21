import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js?v=5";
import { openSurgeryRequestForm } from "../surgery-requests/surgery-request-panel.js?v=4";
const LAB_ORDER_ROLES = ["admin", "doctor", "clinician", "nurse", "charge_nurse"];

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
 * Phase 4, disposition (doctor): home, admit (Inpatient Admissions + a ward bed -- or, no bed free,
 * the patient waits in the ER until "Admit to bed"), transfer, OR (a surgery request), died. The ER
 * report is er-report.js.
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
.erp-boarding { border: 1px solid #93c5fd; background: #eff6ff; color: #1e3a8a; border-radius: 8px; padding: 5px 8px; font-size: 12.5px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
:root[data-theme="dark"] .erp-boarding { background: #172554; color: #bfdbfe; border-color: #1e40af; }
.erx [data-k][hidden] { display: none; }
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

function traumaSummaryChip(v) {
    const ts = v.trauma_summary;
    if (!ts) return "";
    const gcsTxt = `GCS ${ts.gcs_total}${ts.gcs_intubated_flag ? "T" : ""}/15 (E${ts.gcs_eye}V${ts.gcs_verbal}M${ts.gcs_motor})`;
    const isCriticalGcs = ts.gcs_total <= 8;
    const isPosFast = ts.fast_exam_result === "Positive Free Fluid";
    const bg = isCriticalGcs || isPosFast ? "#fef2f2" : "#fff7ed";
    const border = isCriticalGcs || isPosFast ? "#fca5a5" : "#fdba74";
    const color = isCriticalGcs || isPosFast ? "#991b1b" : "#9a3412";
    return `<div style="margin:3px 0"><button type="button" data-trauma="${v.id}" style="font:inherit;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:6px;cursor:pointer;border:1px solid ${border};background:${bg};color:${color};text-align:left">
        🚑 Trauma · ${esc(gcsTxt)} · FAST: ${esc(ts.fast_exam_result)}${ts.shock_index ? ` · SI ${ts.shock_index}` : ""}
    </button></div>`;
}

function actions(v) {
    const unk = v.patient.registration_status === "unidentified";
    return `<div class="acts">
        ${data.can_triage ? `<button type="button" class="erp-b sm" style="background:#dc2626;border-color:#dc2626;color:#fff;font-weight:700" data-trauma="${v.id}">🚑 Trauma Fast-Sheet</button>` : ""}
        ${data.can_triage ? `<button type="button" class="erp-b sm" style="background:#7c3aed;border-color:#7c3aed;color:#fff;font-weight:700" data-statbundles="${v.id}">⚡ STAT Bundles</button>` : ""}
        ${data.can_triage ? `<button type="button" class="erp-b sm" data-proto="${v.id}">Protocols…</button>` : ""}
        ${data.can_triage ? `<button type="button" class="erp-b sm ${v.status === "waiting" ? "go" : ""}" data-triage="${v.id}">${v.status === "waiting" ? "Triage" : "Re-triage"}</button>` : ""}
        ${data.can_assign ? `<button type="button" class="erp-b sm" data-assign="${v.id}">Bed / staff…</button>` : ""}
        ${LAB_ORDER_ROLES.includes(getUser()?.role) && ["waiting", "triaged"].includes(v.status) ? `<button type="button" class="erp-b sm" data-labs="${v.id}">Labs…</button>
        <button type="button" class="erp-b sm" data-imaging="${v.id}">Imaging…</button>` : ""}
        ${data.can_dispose && v.status === "triaged" ? `<button type="button" class="erp-b sm blue" data-dispo="${v.id}">${v.disposition?.boarding ? "Change disposition…" : "Disposition…"}</button>` : ""}
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
        ${boardingHtml(v)}${traumaSummaryChip(v)}${protocolChips(v)}${careTeam(v)}${ordersHtml(v.orders)}${actions(v)}</div>`;
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
                ${data.can_report ? `<button type="button" class="erp-b" data-report>ER report</button>` : ""}
                ${data.can_register ? `<button type="button" class="erp-b go" data-register>+ Register patient</button>` : ""}</div></div>
        <div class="erp-counts" role="list">
            <div class="erp-count ${c.triage_over ? "warn" : ""}" role="listitem"><b>${c.waiting}</b>waiting for triage${c.triage_over ? ` · ${c.triage_over} over target` : ""}</div>
            <div class="erp-count ${c.doctor_over ? "warn" : ""}" role="listitem"><b>${c.no_doctor}</b>need a doctor${c.doctor_over ? ` · ${c.doctor_over} over target` : ""}</div>
            ${[1, 2, 3, 4, 5].map((a) => `<div class="erp-count" role="listitem"><b>${c.by_acuity[a]}</b>${lvl(a)}</div>`).join("")}
            <div class="erp-count" role="listitem"><b>${free}</b>free bed${free === 1 ? "" : "s"} of ${data.beds.length}</div>
            ${c.unidentified ? `<div class="erp-count warn" role="listitem"><b>${c.unidentified}</b>unidentified</div>` : ""}
            ${c.boarding ? `<div class="erp-count warn" role="listitem"><b>${c.boarding}</b>admitted, waiting for a ward bed</div>` : ""}
            ${c.trauma_cases ? `<div class="erp-count bad" role="listitem"><b>${c.trauma_cases}</b>🚑 active trauma resuscitation${c.trauma_cases === 1 ? "" : "s"}</div>` : ""}
            ${c.protocols ? `<div class="erp-count ${c.protocol_late ? "bad" : ""}" role="listitem"><b>${c.protocols}</b>protocol${c.protocols === 1 ? "" : "s"} running${c.protocol_late ? ` · ${c.protocol_late} step${c.protocol_late === 1 ? "" : "s"} late` : ""}</div>` : ""}
        </div>`;
    const wrTable = (list, title) => `<h2>${title} (${list.length})</h2>
        ${list.length ? `<div class="erp-wrap"><table><thead><tr><th>Arrived</th><th>Patient</th><th>Level</th><th>Complaint</th><th>Waiting</th><th>Care team</th>${view === "list" ? "<th>Bed</th><th>Vital signs</th>" : ""}<th></th></tr></thead><tbody>
            ${list.map((v) => `<tr data-row="${v.id}"><td class="nw">${esc(hm(v.arrived_at))}<div class="muted">${esc(v.arrival_mode)}</div></td>
                <td>${patientCell(v)}</td><td>${v.acuity ? lvl(v.acuity) : `<span class="er-tag">Not triaged</span>`}</td>
                <td>${esc(v.triage?.chief_complaint || v.chief_complaint || "—")}${v.triage?.undertriage_reason ? `<div class="muted" style="font-size:12px">Level kept: ${esc(v.triage.undertriage_reason)}</div>` : ""}</td>
                <td>${waitText(v.wait)}${boardingHtml(v)}${traumaSummaryChip(v)}${protocolChips(v)}${ordersHtml(v.orders)}</td><td>${careTeam(v)}</td>
                ${view === "list" ? `<td>${esc(v.bed_name || "Waiting room")}</td><td>${vitals(v.triage)}</td>` : ""}<td>${actions(v)}</td></tr>`).join("")}</tbody></table></div>`
            : `<div class="erp-empty">Nobody here.</div>`}`;
    const board = `
        ${data.beds.length ? Object.entries(areas).map(([a, beds]) => `<div class="erp-area">${esc(data.options.areas[a] || a)}</div>
            <div class="erp-beds">${beds.map((b) => bedCard(b, b.visit_id ? byId[b.visit_id] : null)).join("")}</div>`).join("")
            : `<div class="erp-empty">No ER beds set up yet.${data.settings ? " Add them under ER settings below." : " Ask the admin to add them."}</div>`}
        ${wrTable(waitingRoom, "Waiting room (no bed)")}`;
    root.innerHTML = head + (view === "board" ? board : wrTable(data.visits, "All patients in the ER"))
        + (data.closed.length ? `<details style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Closed in the last 12 hours (${data.closed.length})</summary>
            <div class="erp-wrap" style="margin-top:8px"><table><thead><tr><th>Arrived</th><th>Patient</th><th>Left the ER</th><th>Where to</th></tr></thead><tbody>
            ${data.closed.map((v) => `<tr><td class="nw">${esc(hm(v.arrived_at))} · ${esc(v.visit_no)}</td><td>${esc(v.patient.name)}</td><td class="nw">${esc(hm(v.closed_at))} <span class="muted">(${mins(v.minutes_in_er)} in ER)</span></td>
                <td>${dispositionText(v)}</td></tr>`).join("")}</tbody></table></div></details>` : "")
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
    const trm = t.closest("[data-trauma]");
    if (trm) return openTraumaFastSheet(Number(trm.dataset.trauma));
    const sb = t.closest("[data-statbundles]");
    if (sb) return openTraumaFastSheet(Number(sb.dataset.statbundles), "bundles");
    const dp = t.closest("[data-dispo]");
    if (dp) return openDisposition(Number(dp.dataset.dispo));
    const lb = t.closest("[data-labs]");
    if (lb) return import("../lab/lab-order.js?v=6").then((m) => m.openLabOrder({ er_visit_id: Number(lb.dataset.labs) }, () => load()));
    const im = t.closest("[data-imaging]");
    if (im) return import("../radiology/rad-order.js?v=6").then((m) => m.openRadOrder({ er_visit_id: Number(im.dataset.imaging) }, () => load()));
    const ab = t.closest("[data-admitbed]");
    if (ab) return openAdmitBed(Number(ab.dataset.admitbed));
    if (t.closest("[data-report]")) return window.__openDashboardTab?.("er_report", "ER Report");
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

/* ---------------- disposition (Phase 4) ---------------- */

/** "Admitted ADM-2026-0012, MED-W bed 4 — Pneumonia" etc. */
function dispositionText(v) {
    const d = v.disposition || {};
    if (!d.kind) return v.status === "left" ? "Left without being seen" : v.status === "cancelled" ? `Registered in error${v.close_reason ? ` — ${esc(v.close_reason)}` : ""}` : "";
    const dx = d.diagnosis ? ` — ${esc(d.diagnosis)}` : "";
    switch (d.kind) {
        case "home": return `Discharged home${dx}${d.follow_up ? ` · follow-up: ${esc(d.follow_up)}` : ""}`;
        case "admit": return d.boarding ? `Admit to ${esc(d.admit_ward)} — waiting for a bed ${mins(d.boarding_minutes || 0)}${dx}`
            : `Admitted ${esc(d.admission_number || "")}${d.admitted_bed ? `, ${esc(d.admitted_bed)}` : ""}${dx}`;
        case "transfer": return `Transferred to ${esc(d.transfer_facility)}${dx}`;
        case "or": return `To the OR — ${esc(d.surgery_request_number || "")}${dx}`;
        case "died": return `Died in the ER at ${esc(hm(d.died_at))}`;
        default: return "";
    }
}

function boardingHtml(v) {
    if (!v.disposition?.boarding) return "";
    return `<div class="erp-boarding">🛏 ${dispositionText(v)}${data.can_bed ? ` <button type="button" class="erp-b sm blue" data-admitbed="${v.id}">Admit to bed…</button>` : ""}</div>`;
}

const bedOptions = (o, selected, wardFirst = null) => {
    const wards = [...o.wards].sort((a, b) => (b.id === wardFirst) - (a.id === wardFirst));
    return wards.filter((w) => o.beds.some((b) => b.ward_id === w.id)).map((w) => `<optgroup label="${esc(w.name)} (${w.free} free)">
        ${o.beds.filter((b) => b.ward_id === w.id).map((b) => `<option value="${b.id}" ${b.id === selected ? "selected" : ""}>${esc(w.code)} bed ${esc(b.bed)} · ${esc(b.room)} · ${esc(b.type)}</option>`).join("")}</optgroup>`).join("");
};

/** preset: values to start from (after making a surgery request: {kind: "or", surgery_request_id, diagnosis, notes}). */
export async function openDisposition(id, preset = {}) {
    const [r, o] = await Promise.all([api(`/er/show?id=${id}`).catch(() => null), api(`/er/disposition/options?id=${id}`).catch(() => null)]);
    if (!r?.success || !o?.success) return showToast(r?.message || o?.message || "Could not open the visit.", "error");
    const v = r.data;
    const opt = o.data;
    const d = v.disposition || {};
    const me = getUser() || {};
    const kind0 = preset.kind || d.kind || "home";
    const attending = d.attending_user_id || (["doctor", "clinician"].includes(me.role) ? Number(me.id) : v.doctor_user_id);
    const canSr = ["admin", "doctor"].includes(me.role);
    const m = modal(`Disposition — ${esc(v.patient.name)}`, `${esc(v.visit_no)} · ${ageSex(v.patient)}${v.acuity ? ` · level ${v.acuity}` : ""} · in the ER ${mins(v.minutes_in_er)}`, `
        <div><span class="lbl" id="erDL">Where does the patient go?</span><div class="erx-seg" role="radiogroup" aria-labelledby="erDL">
            ${Object.entries(data.options.dispositions).map(([k, l]) => `<label><input type="radio" name="disposition" value="${k}" ${k === kind0 ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div></div>
        <div data-k="home admit transfer or"><label for="erDDx">ER diagnosis</label><input type="text" id="erDDx" name="diagnosis" maxlength="255" autocomplete="off"
            value="${esc(preset.diagnosis ?? d.diagnosis ?? "")}" placeholder="e.g. Community-acquired pneumonia"></div>
        <div data-k="home"><label for="erDFu">Follow-up <span style="font-weight:400">(optional)</span></label><input type="text" id="erDFu" name="follow_up" maxlength="255" autocomplete="off" value="${esc(d.follow_up || "")}" placeholder="e.g. OPD Internal Medicine in 1 week; return if worse"></div>
        <div data-k="admit" class="erx-grid two">
            <div><label for="erDBed">Ward bed</label><select id="erDBed" name="bed_id"><option value="">No bed free yet — wait in the ER for one</option>${bedOptions(opt, preset.bed_id, d.admit_ward_id)}</select></div>
            <div data-noward><label for="erDWard">Ward to wait for</label><select id="erDWard" name="ward_id"><option value="">Choose…</option>
                ${opt.wards.map((w) => `<option value="${w.id}" ${w.id === d.admit_ward_id ? "selected" : ""}>${esc(w.name)} (${w.free} free)</option>`).join("")}</select></div>
            <div><label for="erDType">Admission</label><select id="erDType" name="admission_type">${opt.admission_types.map((t) => `<option ${t === d.admission_type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
            <div><label for="erDAtt">Attending doctor</label><select id="erDAtt" name="attending_user_id"><option value="">Choose…</option>
                ${opt.doctors.map((x) => `<option value="${x.id}" ${Number(x.id) === Number(attending) ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
            <div><label for="erDIso">Isolation</label><select id="erDIso" name="isolation">${opt.isolation.map((t) => `<option ${t === (d.isolation || "Standard") ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
        </div>
        <div data-k="admit" class="erx-note">The admission is made in Inpatient Admissions (source: Emergency Room). With no bed free, the patient stays on the ER board as “waiting for a bed” until someone admits them to one.</div>
        <div data-k="transfer" class="erx-grid two">
            <div><label for="erDFac">To which facility</label><input type="text" id="erDFac" name="facility" maxlength="150" autocomplete="off"></div>
            <div><label for="erDWhy">Why</label><input type="text" id="erDWhy" name="reason" maxlength="255" autocomplete="off" placeholder="e.g. needs cardiac surgery; no ICU bed"></div>
            <div><label for="erDMode">How</label><select id="erDMode" name="mode"><option value="">Choose…</option>${opt.transfer_modes.map((t) => `<option>${esc(t)}</option>`).join("")}</select></div>
            <div><label for="erDAcc">Accepting doctor <span style="font-weight:400">(optional)</span></label><input type="text" id="erDAcc" name="accepting_doctor" maxlength="150" autocomplete="off"></div>
        </div>
        <div data-k="or"><span class="lbl" id="erDSrL">Surgery request</span>
            ${opt.surgery_requests.length ? `<div class="erx-res" role="radiogroup" aria-labelledby="erDSrL">${opt.surgery_requests.map((x) => `<label><input type="radio" name="surgery_request_id" value="${x.id}" ${Number(x.id) === Number(preset.surgery_request_id) || opt.surgery_requests.length === 1 ? "checked" : ""}>
                <span><b>${esc(x.request_number)}</b> ${esc(x.procedure_name)} <span class="muted">· ${esc(x.priority)} · ${esc(x.status)}</span></span></label>`).join("")}</div>`
                : `<div class="erx-note">No open surgery request for this patient.</div>`}
            ${canSr ? `<div class="erp-inline"><button type="button" class="erp-b sm" data-newsr>New surgery request…</button><span class="muted" style="font-size:12px">Opens the Surgery Requests form (Emergency priority); you come back here after saving.</span></div>`
                : `<div class="muted" style="font-size:12px">A doctor makes the surgery request (Surgery Requests).</div>`}</div>
        <div data-k="died"><label for="erDTime">Time of death</label><input type="time" id="erDTime" name="time" style="max-width:160px"></div>
        <div><label for="erDNotes" data-noteslbl>Notes</label><textarea id="erDNotes" name="notes" maxlength="1000">${esc(preset.notes ?? d.notes ?? "")}</textarea></div>`,
        `<button type="button" class="erp-b" data-x>Cancel</button><button type="button" class="erp-b blue" data-save>Save</button>`);
    m.ov.querySelector(".erx").classList.add("wide");
    const kind = () => m.ov.querySelector('input[name="disposition"]:checked').value;
    const NOTES = { home: "Instructions for the patient", admit: "Notes for the ward", transfer: "Notes (condition, what was given)", or: "Notes", died: "Cause and notes" };
    const SAVE = { home: "Discharge home", admit: "Admit", transfer: "Transfer", or: "To the OR", died: "Record death" };
    const sync = () => {
        const k = kind();
        m.ov.querySelectorAll("[data-k]").forEach((s) => (s.hidden = !s.dataset.k.split(" ").includes(k)));
        m.$("[data-noward]").hidden = !!m.$("#erDBed").value;
        m.$("[data-noteslbl]").innerHTML = `${NOTES[k]} <span style="font-weight:400">(optional)</span>`;
        m.$("[data-save]").textContent = k === "admit" && !m.$("#erDBed").value ? "Admit — wait for a bed" : SAVE[k];
    };
    m.ov.querySelectorAll('input[name="disposition"]').forEach((x) => x.addEventListener("change", sync));
    m.$("#erDBed").addEventListener("change", sync);
    sync();
    (m.ov.querySelector('input[name="disposition"]:checked')).focus();
    const val = (n) => m.ov.querySelector(`[name="${n}"]`)?.value.trim() ?? "";
    const body = () => {
        const k = kind();
        const b = { id, disposition: k, diagnosis: val("diagnosis"), notes: val("notes") };
        if (k === "home") b.follow_up = val("follow_up");
        if (k === "admit") Object.assign(b, { bed_id: val("bed_id"), ward_id: val("bed_id") ? "" : val("ward_id"), admission_type: val("admission_type"), attending_user_id: val("attending_user_id"), isolation: val("isolation") });
        if (k === "transfer") Object.assign(b, { facility: val("facility"), reason: val("reason"), mode: val("mode"), accepting_doctor: val("accepting_doctor") });
        if (k === "or") b.surgery_request_id = m.ov.querySelector('input[name="surgery_request_id"]:checked')?.value || "";
        if (k === "died") b.time = val("time");
        return b;
    };
    m.$("[data-newsr]")?.addEventListener("click", () => {
        const keep = { kind: "or", diagnosis: val("diagnosis"), notes: val("notes") };
        m.close();
        openSurgeryRequestForm({
            patient: { id: v.patient.id, name: v.patient.name }, openDetail: false,
            defaults: { priority: "Emergency / STAT", notes: `From the ER (${v.visit_no}).${keep.diagnosis ? ` ER diagnosis: ${keep.diagnosis}.` : ""}` },
            onSaved: (res) => openDisposition(id, { ...keep, surgery_request_id: res?.data?.id }),
        });
    });
    m.$("[data-save]").onclick = async (ev) => {
        const b = body();
        if (b.disposition === "died" && ev.target.dataset.sure !== "1") {
            ev.target.dataset.sure = "1";
            ev.target.textContent = "Press again to record the death";
            return m.err("This closes the ER visit as died.");
        }
        ev.target.disabled = true;
        const res = await post("/er/disposition", b);
        ev.target.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not save.", res?.errors);
        m.close();
        showToast(res.message, "success", 6000);
        load();
    };
}

export async function openAdmitBed(id) {
    const [r, o] = await Promise.all([api(`/er/show?id=${id}`).catch(() => null), api(`/er/disposition/options?id=${id}`).catch(() => null)]);
    if (!r?.success || !o?.success) return showToast(r?.message || o?.message || "Could not open the visit.", "error");
    const v = r.data;
    const d = v.disposition;
    const m = modal(`Admit to bed — ${esc(v.patient.name)}`, `${esc(v.visit_no)} · admission decided ${esc(hm(d.at))}${d.by_name ? ` by ${esc(d.by_name)}` : ""} · waiting ${mins(d.boarding_minutes || 0)}`, `
        <div class="erx-note">${esc(d.admit_ward || "")} · ${esc(d.admission_type || "")} · attending ${esc(d.attending || "")}${d.diagnosis ? ` · ${esc(d.diagnosis)}` : ""}</div>
        ${o.data.beds.length ? `<div><label for="erABd">Ward bed</label><select id="erABd" name="bed_id"><option value="">Choose a free bed…</option>${bedOptions(o.data, null, d.admit_ward_id)}</select></div>`
            : `<div class="erx-note warn">No ward bed is free right now.</div>`}`,
        `<button type="button" class="erp-b" data-x>Cancel</button>${o.data.beds.length ? `<button type="button" class="erp-b blue" data-save>Admit</button>` : ""}`);
    (m.$("#erABd") || m.$("[data-x]")).focus();
    m.$("[data-save]")?.addEventListener("click", async (ev) => {
        if (!m.$("#erABd").value) return m.err("Choose the bed.", { bed_id: 1 });
        ev.target.disabled = true;
        const res = await post("/er/admit-bed", { id, bed_id: m.$("#erABd").value });
        ev.target.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not save.", res?.errors);
        m.close();
        showToast(res.message, "success", 6000);
        load();
    });
}

/* ---------------- Phase 5: Trauma & Resuscitation Fast-Sheet (er_trauma_records) ---------------- */

const ATLS_INTERVENTIONS = [
    "Rigid Cervical Collar & Inline C-Spine Stabilization",
    "2x Large-Bore IVs (14G/16G) or Intraosseous (IO) Access",
    "Supplemental High-Flow O₂ / Airway Adjunct",
    "Tranexamic Acid (TXA) 1g IV Loading Dose",
    "Type & Crossmatch + Uncrossed O-Neg Blood Ready",
    "Massive Transfusion Protocol (MTP) Activated",
    "Pelvic Binder / Direct Hemorrhage Tourniquet",
    "Warming Blanket / Warmed IV Crystalloids (39°C)",
    "Tetanus Toxoid / Antibiotic Prophylaxis",
    "Portable Chest & Pelvis X-Ray at Bedside"
];

export async function openTraumaFastSheet(visitId, initialTab = "form") {
    const [vRes, tRes, bRes] = await Promise.all([
        api(`/er/show?id=${visitId}`).catch(() => null),
        api(`/er/trauma?visit_id=${visitId}`).catch(() => null),
        api(`/er/resuscitation-bundles?visit_id=${visitId}`).catch(() => null)
    ]);

    if (!vRes?.success) {
        return showToast(vRes?.message || "Could not open ER visit.", "error");
    }

    const v = vRes.data;
    const tData = tRes?.data || { records: [], options: {} };
    let records = tData.records || [];
    const bData = bRes?.data || { orders: [], catalog: [] };
    let bundleOrders = bData.orders || [];
    const bundleCatalog = bData.catalog || [];
    const me = getUser() || {};
    const defaultLeader = v.doctor_name || me.full_name || me.name || me.username || "Trauma Team Leader, MD";
    const tri = v.triage || {};

    const m = modal(
        `🚑 Trauma & Resuscitation Fast-Sheet — ${esc(v.patient.name)}`,
        `${esc(v.visit_no)} · ${ageSex(v.patient)}${v.acuity ? ` · ESI Level ${v.acuity}` : ""} · Bed: ${esc(v.bed_name || "Resus Bay")}`,
        `
        <!-- INSTANT 1-CLICK STAT RESUSCITATION ORDER BUNDLES BAR -->
        <div style="background:linear-gradient(135deg,#1e1b4b 0%,#31102f 100%);border:1px solid #6366f1;border-radius:10px;padding:10px 12px;color:#fff">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                <div>
                    <div style="font-size:12.5px;font-weight:800;color:#fde047;letter-spacing:.02em">⚡ INSTANT 1-CLICK STAT RESUSCITATION ORDER BUNDLES</div>
                    <div style="font-size:11px;color:#cbd5e1">Dispatches immediate STAT requisitions to Blood Bank, Clinical Lab &amp; Bedside Radiology</div>
                </div>
                <span id="trmBundleQuickStatus" style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,0.14);color:#e2e8f0">
                    ${bundleOrders.length} STAT Bundle${bundleOrders.length === 1 ? "" : "s"} Ordered
                </span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">
                <button type="button" class="erp-b sm" data-fire-bundle="mtp_activation" style="background:#dc2626;border-color:#f87171;color:#fff;font-weight:800;text-align:left;padding:7px 10px">
                    🩸 1-Click Massive Transfusion (MTP)
                    <div style="font-size:10.5px;font-weight:500;opacity:.92;margin-top:2px">4u PRBC · 4u FFP · 1u Plt · TXA 1g · Ca²⁺</div>
                </button>
                <button type="button" class="erp-b sm" data-fire-bundle="trauma_lab_panel" style="background:#0284c7;border-color:#38bdf8;color:#fff;font-weight:800;text-align:left;padding:7px 10px">
                    🧪 1-Click STAT Trauma Lab Panel
                    <div style="font-size:10.5px;font-weight:500;opacity:.92;margin-top:2px">Type/Cross · CBC · Coags/Fibr · ABG/Lactate · CMP</div>
                </button>
                <button type="button" class="erp-b sm" data-fire-bundle="emergency_bedside_imaging" style="background:#7c3aed;border-color:#a78bfa;color:#fff;font-weight:800;text-align:left;padding:7px 10px">
                    🩻 1-Click Emergency Bedside Imaging
                    <div style="font-size:10.5px;font-weight:500;opacity:.92;margin-top:2px">Portable CXR &amp; Pelvis · eFAST · Trauma CT Pan-Scan</div>
                </button>
                <button type="button" class="erp-b sm" data-fire-bundle="full_trauma_megabundle" style="background:#b45309;border-color:#fbbf24;color:#fff;font-weight:800;text-align:left;padding:7px 10px">
                    🚨 1-Click Full Trauma Mega-Bundle
                    <div style="font-size:10.5px;font-weight:500;opacity:.92;margin-top:2px">Simultaneous MTP + Trauma Labs + Bedside Imaging</div>
                </button>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:8px;gap:8px;flex-wrap:wrap">
            <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button type="button" class="erp-b sm blue" id="btnTabTraumaForm">⚡ Fast-Sheet Assessment (GCS · ATLS · FAST)</button>
                <button type="button" class="erp-b sm" id="btnTabTraumaBundles">🧪 STAT Order Bundles (<span id="trmBundleCount">${bundleOrders.length}</span>)</button>
                <button type="button" class="erp-b sm" id="btnTabTraumaHistory">📜 Resuscitation Log (<span id="trmLogCount">${records.length}</span>)</button>
            </div>
            <span id="trmEditingBadge" style="font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:12px;background:#fee2e2;color:#991b1b">New Resuscitation Entry</span>
        </div>

        <!-- PANE 1: FAST-SHEET FORM -->
        <div id="paneTraumaForm" style="display:grid;gap:12px">
            <input type="hidden" id="trmRecordId" value="">

            <!-- Section 0: Trauma Activation & Mechanism of Injury -->
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:10px 12px">
                <div style="font-size:12px;font-weight:800;color:#991b1b;text-transform:uppercase;margin-bottom:8px">🚨 Trauma Activation &amp; Mechanism of Injury (MOI)</div>
                <div class="erx-grid two">
                    <div>
                        <label for="trmActivationLevel">Trauma Activation Level *</label>
                        <select id="trmActivationLevel" name="trauma_activation_level">
                            <option value="Level 1 - Full Trauma Team Activation">🔴 Level 1 - Full Trauma Team Activation</option>
                            <option value="Level 2 - Modified Trauma Activation">🟠 Level 2 - Modified Trauma Activation</option>
                            <option value="Level 3 - Trauma Consult / Fast-Track">🟡 Level 3 - Trauma Consult / Fast-Track</option>
                        </select>
                    </div>
                    <div>
                        <label for="trmMechanism">Mechanism of Injury (MOI) *</label>
                        <input type="text" id="trmMechanism" name="mechanism_of_injury" list="trmMoiList" placeholder="e.g. High-Velocity MVC, Fall >20ft, GSW..." value="${esc(tri.chief_complaint || v.chief_complaint || "")}">
                        <datalist id="trmMoiList">
                            ${(tData.options?.mechanisms_of_injury || [
                                "High-Velocity MVC (Motor Vehicle Collision)",
                                "Motorcycle / Bicycle Collision",
                                "Pedestrian Struck by Vehicle",
                                "Fall from Height (>20 ft / >6 m)",
                                "Ground-Level Fall with Head Trauma",
                                "Penetrating Trauma — Gunshot Wound (GSW)",
                                "Penetrating Trauma — Stab / Impale Wound",
                                "Blunt Assault / Crush Injury",
                                "Blast / Thermal / Electrical Burn Trauma"
                            ]).map((x) => `<option value="${esc(x)}"></option>`).join("")}
                        </datalist>
                    </div>
                </div>
                <div style="margin-top:8px">
                    <label for="trmInjuryDetails">Pre-Hospital / EMS &amp; Injury Kinematics</label>
                    <input type="text" id="trmInjuryDetails" name="injury_details" placeholder="e.g. Unrestrained driver, 70mph rollover, +LOC at scene, EMS applied C-collar &amp; 500mL LR...">
                </div>
            </div>

            <!-- ================================================================== -->
            <!-- SECTION 1: GLASGOW COMA SCALE (GCS) CALCULATOR (E 1-4, V 1-5, M 1-6)-->
            <!-- ================================================================== -->
            <div style="border:1px solid #93c5fd;background:#eff6ff;border-radius:10px;padding:12px">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                    <div>
                        <div style="font-size:13px;font-weight:800;color:#1e3a8a">🧠 1. GLASGOW COMA SCALE (GCS) CALCULATOR</div>
                        <div style="font-size:11.5px;color:#1d4ed8">Eye (1–4) + Verbal (1–5) + Motor (1–6) = Total Score (3–15)</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px">
                        <label style="display:inline-flex;align-items:center;gap:5px;margin:0;font-size:12px;color:#1e3a8a;cursor:pointer">
                            <input type="checkbox" id="trmGcsIntubated"> Intubated (T)
                        </label>
                        <div id="trmGcsLiveBadge" style="padding:5px 12px;border-radius:8px;font-weight:800;font-size:14px;background:#16a34a;color:#fff;font-variant-numeric:tabular-nums">
                            GCS 15/15 (E4 V5 M6) · Mild / Alert
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">
                    <!-- Eye Opening (1-4) -->
                    <div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px">
                        <label for="trmGcsEye" style="color:#1e3a8a;font-weight:700">👁️ Eye Opening (E: 1–4)</label>
                        <select id="trmGcsEye" name="gcs_eye">
                            <option value="4" selected>4 — Spontaneous opening</option>
                            <option value="3">3 — To verbal command / speech</option>
                            <option value="2">2 — To pain / pressure stimulus</option>
                            <option value="1">1 — No eye opening</option>
                        </select>
                    </div>
                    <!-- Verbal Response (1-5) -->
                    <div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px">
                        <label for="trmGcsVerbal" style="color:#1e3a8a;font-weight:700">🗣️ Verbal Response (V: 1–5)</label>
                        <select id="trmGcsVerbal" name="gcs_verbal">
                            <option value="5" selected>5 — Oriented &amp; conversing</option>
                            <option value="4">4 — Confused / disoriented</option>
                            <option value="3">3 — Inappropriate words</option>
                            <option value="2">2 — Incomprehensible sounds / moans</option>
                            <option value="1">1 — No verbal response / Intubated (1T)</option>
                        </select>
                    </div>
                    <!-- Motor Response (1-6) -->
                    <div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px">
                        <label for="trmGcsMotor" style="color:#1e3a8a;font-weight:700">💪 Motor Response (M: 1–6)</label>
                        <select id="trmGcsMotor" name="gcs_motor">
                            <option value="6" selected>6 — Obeys commands</option>
                            <option value="5">5 — Localizes supraorbital/trapezius pain</option>
                            <option value="4">4 — Normal flexion / withdrawal from pain</option>
                            <option value="3">3 — Abnormal flexion (Decorticate)</option>
                            <option value="2">2 — Extension to pain (Decerebrate)</option>
                            <option value="1">1 — No motor response (Flaccid)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- ================================================================== -->
            <!-- SECTION 2: ATLS PRIMARY SURVEY CHECKLIST (A - B - C - D - E)        -->
            <!-- ================================================================== -->
            <div style="border:1px solid var(--border-color);background:var(--bg-surface-alt);border-radius:10px;padding:12px">
                <div style="font-size:13px;font-weight:800;color:var(--text-primary);margin-bottom:8px">
                    🛡️ 2. ATLS PRIMARY SURVEY CHECKLIST (A · B · C · D · E)
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                    <!-- A: Airway with C-Spine -->
                    <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-left:4px solid #dc2626;border-radius:8px;padding:9px 11px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                            <span style="font-weight:800;font-size:12.5px;color:#dc2626">A — Airway &amp; C-Spine Protection</span>
                            <label style="display:inline-flex;align-items:center;gap:4px;margin:0;font-size:11.5px;color:#991b1b;cursor:pointer">
                                <input type="checkbox" id="trmCspine" checked> Rigid C-Collar On
                            </label>
                        </div>
                        <select id="trmAirwayStatus" style="margin-bottom:5px">
                            <option value="Patent & Self-Maintaining">Patent &amp; Self-Maintaining</option>
                            <option value="Partial Obstruction — Suctioned / Jaw Thrust">Partial Obstruction — Suctioned / Jaw Thrust</option>
                            <option value="Oropharyngeal / Nasopharyngeal Airway (OPA/NPA)">Oropharyngeal / Nasopharyngeal Airway (OPA/NPA)</option>
                            <option value="Rapid Sequence Intubation (RSI) — ETT Secured">Rapid Sequence Intubation (RSI) — ETT Secured</option>
                            <option value="Surgical Cricothyrotomy / Tracheostomy">Surgical Cricothyrotomy / Tracheostomy</option>
                        </select>
                        <input type="text" id="trmAirwayNotes" placeholder="Airway/C-spine notes (e.g. ETT 7.5mm @ 22cm lip, EtCO2+)">
                    </div>

                    <!-- B: Breathing & Ventilation -->
                    <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-left:4px solid #2563eb;border-radius:8px;padding:9px 11px">
                        <div style="font-weight:800;font-size:12.5px;color:#2563eb;margin-bottom:4px">B — Breathing &amp; Ventilation</div>
                        <select id="trmBreathingStatus" style="margin-bottom:5px">
                            <option value="Bilateral Equal Breath Sounds">Bilateral Equal Breath Sounds</option>
                            <option value="Diminished / Absent Left Breath Sounds">Diminished / Absent Left Breath Sounds</option>
                            <option value="Diminished / Absent Right Breath Sounds">Diminished / Absent Right Breath Sounds</option>
                            <option value="Tension Pneumothorax — Needle Decompression">Tension Pneumothorax — Needle Decompression</option>
                            <option value="Tube Thoracostomy (Chest Tube) Inserted">Tube Thoracostomy (Chest Tube) Inserted</option>
                            <option value="Flail Chest / Open Pneumothorax (3-Sided Dressing)">Flail Chest / Open Pneumothorax</option>
                        </select>
                        <input type="text" id="trmBreathingNotes" placeholder="Trachea midline, chest wall excursion, O₂ flow / vent settings...">
                    </div>

                    <!-- C: Circulation & Hemorrhage Control -->
                    <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-left:4px solid #e11d48;border-radius:8px;padding:9px 11px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                            <span style="font-weight:800;font-size:12.5px;color:#e11d48">C — Circulation &amp; Hemorrhage</span>
                            <span id="trmShockIndexBadge" style="font-size:11px;font-weight:800;padding:1px 7px;border-radius:10px;background:#f1f5f9;color:#475569">Shock Index: --</span>
                        </div>
                        <select id="trmCirculationStatus" style="margin-bottom:5px">
                            <option value="Hemodynamically Stable — Strong Central/Distal Pulses">Hemodynamically Stable — Strong Pulses</option>
                            <option value="Class I–II Hemorrhagic Shock (Tachycardic)">Class I–II Hemorrhagic Shock (Tachycardic)</option>
                            <option value="Class III–IV Severe Hemorrhagic Shock (Hypotensive)">Class III–IV Severe Hemorrhagic Shock (Hypotensive)</option>
                            <option value="Active External Hemorrhage — Direct Pressure / Tourniquet">Active External Hemorrhage — Tourniquet Applied</option>
                            <option value="Unstable Pelvic Ring — Pelvic Binder Applied">Unstable Pelvic Ring — Pelvic Binder Applied</option>
                            <option value="Traumatic Arrest — Resuscitative Thoracotomy / CPR">Traumatic Arrest — CPR / MTP Running</option>
                        </select>
                        <input type="text" id="trmCirculationNotes" placeholder="Pulses, cap refill, tourniquet time, IV/IO lines, blood products...">
                    </div>

                    <!-- D: Disability / Pupils -->
                    <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-left:4px solid #7c3aed;border-radius:8px;padding:9px 11px">
                        <div style="font-weight:800;font-size:12.5px;color:#7c3aed;margin-bottom:4px">D — Disability &amp; Pupillary Exam</div>
                        <select id="trmDisabilityPupils" style="margin-bottom:5px">
                            <option value="PERRLA (Equal, Round, Reactive 3mm/3mm)">PERRLA (Equal, Round, Reactive 3mm/3mm)</option>
                            <option value="Anisocoria — Unilateral Fixed & Dilated (Blown Pupil!)">⚠️ Anisocoria — Unilateral Fixed &amp; Dilated (Blown Pupil!)</option>
                            <option value="Bilateral Fixed & Dilated Pupils">🚨 Bilateral Fixed &amp; Dilated Pupils</option>
                            <option value="Sluggish / Pinpoint Pupils">Sluggish / Pinpoint Pupils</option>
                        </select>
                        <input type="text" id="trmDisabilityNotes" placeholder="Pupil size L/R (mm), gross motor/sensory lateralizing signs...">
                    </div>
                </div>

                <!-- E: Exposure & Environmental Control -->
                <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-left:4px solid #d97706;border-radius:8px;padding:9px 11px;margin-bottom:10px">
                    <div style="font-weight:800;font-size:12.5px;color:#d97706;margin-bottom:4px">E — Exposure, Log-Roll Spine Exam &amp; Hypothermia Prevention</div>
                    <input type="text" id="trmExposureNotes" placeholder="Full exposure completed, log-roll thoracic/lumbar tenderness/step-off, long-bone deformities, active warming blanket applied...">
                </div>

                <!-- ATLS Immediate Resuscitation Checklist -->
                <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-radius:8px;padding:9px 11px">
                    <div style="font-size:11.5px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">✅ ATLS Primary Resuscitation Interventions Performed</div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:5px;font-size:12px">
                        ${ATLS_INTERVENTIONS.map((item, idx) => `
                            <label style="display:flex;align-items:center;gap:6px;margin:0;font-weight:500;color:var(--text-primary);cursor:pointer">
                                <input type="checkbox" class="trm-atls-chk" value="${esc(item)}" ${idx < 3 ? "checked" : ""}>
                                <span>${esc(item)}</span>
                            </label>
                        `).join("")}
                    </div>
                </div>
            </div>

            <!-- ================================================================== -->
            <!-- SECTION 3: FAST / eFAST BEDSIDE ULTRASOUND RESULT                  -->
            <!-- ================================================================== -->
            <div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:10px;padding:12px">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                    <div>
                        <div style="font-size:13px;font-weight:800;color:#78350f">📡 3. FAST / eFAST BEDSIDE ULTRASOUND EXAM</div>
                        <div style="font-size:11.5px;color:#92400e">Focused Assessment with Sonography for Trauma (Pericardial, RUQ, LUQ, Pelvis, Thorax)</div>
                    </div>
                    <div style="min-width:220px">
                        <select id="trmFastOverall" name="fast_exam_result" style="font-weight:800">
                            <option value="Negative">🟢 Negative (No Free Fluid)</option>
                            <option value="Positive Free Fluid">🔴 POSITIVE FREE FLUID (Hemoperitoneum/Tamponade)</option>
                            <option value="Indeterminate">🟡 Indeterminate / Repeat Exam Needed</option>
                            <option value="Not Performed">⚪ Not Performed</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:8px">
                    <div style="background:#fff;border:1px solid #fde68a;border-radius:6px;padding:6px 8px">
                        <label for="trmFastRuq" style="font-size:11px;color:#78350f">RUQ (Morison's Pouch)</label>
                        <select id="trmFastRuq" class="trm-fast-win">
                            <option value="Negative">Negative</option>
                            <option value="Positive Free Fluid">🔴 Positive Free Fluid</option>
                            <option value="Indeterminate">Indeterminate</option>
                        </select>
                    </div>
                    <div style="background:#fff;border:1px solid #fde68a;border-radius:6px;padding:6px 8px">
                        <label for="trmFastLuq" style="font-size:11px;color:#78350f">LUQ (Splenorenal)</label>
                        <select id="trmFastLuq" class="trm-fast-win">
                            <option value="Negative">Negative</option>
                            <option value="Positive Free Fluid">🔴 Positive Free Fluid</option>
                            <option value="Indeterminate">Indeterminate</option>
                        </select>
                    </div>
                    <div style="background:#fff;border:1px solid #fde68a;border-radius:6px;padding:6px 8px">
                        <label for="trmFastPelvis" style="font-size:11px;color:#78350f">Pelvis (Pouch of Douglas)</label>
                        <select id="trmFastPelvis" class="trm-fast-win">
                            <option value="Negative">Negative</option>
                            <option value="Positive Free Fluid">🔴 Positive Free Fluid</option>
                            <option value="Indeterminate">Indeterminate</option>
                        </select>
                    </div>
                    <div style="background:#fff;border:1px solid #fde68a;border-radius:6px;padding:6px 8px">
                        <label for="trmFastPeri" style="font-size:11px;color:#78350f">Subxiphoid (Pericardial)</label>
                        <select id="trmFastPeri" class="trm-fast-win">
                            <option value="Negative">Negative</option>
                            <option value="Positive Free Fluid">🔴 Positive Effusion</option>
                            <option value="Indeterminate">Indeterminate</option>
                        </select>
                    </div>
                    <div style="background:#fff;border:1px solid #fde68a;border-radius:6px;padding:6px 8px">
                        <label for="trmEfastThorax" style="font-size:11px;color:#78350f">eFAST Thorax (Lung Slide)</label>
                        <select id="trmEfastThorax">
                            <option value="Normal Lung Sliding B/L">Normal Sliding B/L</option>
                            <option value="Absent Sliding — Pneumothorax L">🔴 Absent Slide Left</option>
                            <option value="Absent Sliding — Pneumothorax R">🔴 Absent Slide Right</option>
                            <option value="Hemothorax Fluid Seen">🔴 Hemothorax Fluid</option>
                        </select>
                    </div>
                </div>
                <input type="text" id="trmFastNotes" placeholder="Sonographer / FAST findings (e.g. Anechoic stripe in Morison's pouch -> STAT OR exploratory laparotomy)...">
            </div>

            <!-- Resuscitation Hemodynamics, Plan & Team Leader Sign-Off -->
            <div class="erx-grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
                <div><label for="trmSbp">Systolic BP</label><input type="number" id="trmSbp" value="${esc(tri.bp_systolic ?? "")}" placeholder="mmHg"></div>
                <div><label for="trmDbp">Diastolic BP</label><input type="number" id="trmDbp" value="${esc(tri.bp_diastolic ?? "")}" placeholder="mmHg"></div>
                <div><label for="trmHr">Heart Rate</label><input type="number" id="trmHr" value="${esc(tri.heart_rate ?? "")}" placeholder="bpm"></div>
                <div><label for="trmRr">Resp Rate</label><input type="number" id="trmRr" value="${esc(tri.resp_rate ?? "")}" placeholder="/min"></div>
                <div><label for="trmSpo2">SpO₂ (%)</label><input type="number" id="trmSpo2" value="${esc(tri.spo2 ?? "")}" placeholder="%"></div>
            </div>

            <div class="erx-grid two">
                <div>
                    <label for="trmDispositionPlan">Immediate Trauma Disposition Plan</label>
                    <select id="trmDispositionPlan">
                        <option value="CT Trauma Pan-Scan (Hemodynamically Stable)">CT Trauma Pan-Scan (Hemodynamically Stable)</option>
                        <option value="STAT Operating Room — Exploratory Laparotomy / Thoracotomy">🚨 STAT Operating Room — Damage Control Surgery</option>
                        <option value="Interventional Radiology — Angioembolization">Interventional Radiology — Angioembolization</option>
                        <option value="Trauma ICU / Surgical Critical Care Admission">Trauma ICU / Surgical Critical Care Admission</option>
                        <option value="Neurosurgery Emergent Craniotomy / ICP Monitor">Neurosurgery Emergent Craniotomy / EVD</option>
                        <option value="Continue Resuscitation Bay Serial Monitoring">Continue Resuscitation Bay Serial Monitoring</option>
                    </select>
                </div>
                <div>
                    <label for="trmLeaderName">Trauma Team Leader / Attending MD *</label>
                    <input type="text" id="trmLeaderName" name="trauma_team_leader_name" value="${esc(defaultLeader)}" placeholder="Dr. Name, MD">
                </div>
            </div>

            <div>
                <label for="trmSummary">Secondary Survey &amp; Resuscitation Summary Notes</label>
                <textarea id="trmSummary" placeholder="Secondary head-to-toe findings, lacerations/fractures splinted, blood products infused, family notification..."></textarea>
            </div>
        </div>

        <!-- PANE 2: STAT RESUSCITATION ORDER BUNDLES -->
        <div id="paneTraumaBundles" style="display:none;gap:12px"></div>

        <!-- PANE 3: SERIAL RESUSCITATION LOG -->
        <div id="paneTraumaHistory" style="display:none"></div>
        `,
        `<button type="button" class="erp-b" data-x>Close</button><button type="button" class="erp-b go" id="btnSaveTraumaFastSheet">💾 Save Trauma &amp; Resuscitation Fast-Sheet</button>`
    );

    m.ov.querySelector(".erx").style.maxWidth = "960px";

    // Tab switching
    const tabForm = m.$("#btnTabTraumaForm");
    const tabBundles = m.$("#btnTabTraumaBundles");
    const tabHist = m.$("#btnTabTraumaHistory");
    const paneForm = m.$("#paneTraumaForm");
    const paneBundles = m.$("#paneTraumaBundles");
    const paneHist = m.$("#paneTraumaHistory");
    const saveBtn = m.$("#btnSaveTraumaFastSheet");

    const showTab = (which) => {
        paneForm.style.display = which === "form" ? "grid" : "none";
        paneBundles.style.display = which === "bundles" ? "grid" : "none";
        paneHist.style.display = which === "history" ? "block" : "none";
        saveBtn.style.display = which === "form" ? "inline-block" : "none";
        tabForm.classList.toggle("blue", which === "form");
        tabBundles.classList.toggle("blue", which === "bundles");
        tabHist.classList.toggle("blue", which === "history");
        if (which === "bundles") renderBundlesPane();
        if (which === "history") renderTraumaHistory();
    };
    tabForm.onclick = () => showTab("form");
    tabBundles.onclick = () => showTab("bundles");
    tabHist.onclick = () => showTab("history");

    const fireStatBundle = async (bundleCode, triggerBtn = null) => {
        const indication = m.$("#trmMechanism")?.value?.trim() || tri.chief_complaint || v.chief_complaint || "Emergency Trauma / Resuscitation STAT";
        if (triggerBtn) triggerBtn.disabled = true;
        const res = await post("/er/resuscitation-bundles/order", {
            visit_id: visitId,
            bundle_code: bundleCode,
            clinical_indication: indication
        });
        if (triggerBtn) triggerBtn.disabled = false;

        if (!res?.success) {
            return showToast(res?.message || "Could not dispatch STAT resuscitation bundle.", "error");
        }

        bundleOrders = res.data?.orders || [];
        m.$("#trmBundleCount").textContent = bundleOrders.length;
        m.$("#trmBundleQuickStatus").textContent = `${bundleOrders.length} STAT Bundle${bundleOrders.length === 1 ? "" : "s"} Ordered`;

        // Auto-check corresponding ATLS intervention boxes when MTP or Imaging/Labs are fired
        if (bundleCode === "mtp_activation" || bundleCode === "full_trauma_megabundle") {
            m.ov.querySelectorAll(".trm-atls-chk").forEach((c) => {
                if (c.value.includes("Massive Transfusion") || c.value.includes("Tranexamic") || c.value.includes("Type & Crossmatch")) {
                    c.checked = true;
                }
            });
        }
        if (bundleCode === "emergency_bedside_imaging" || bundleCode === "full_trauma_megabundle") {
            m.ov.querySelectorAll(".trm-atls-chk").forEach((c) => {
                if (c.value.includes("Portable Chest & Pelvis")) {
                    c.checked = true;
                }
            });
        }

        showToast(res.message, "success", 6000);
        if (paneBundles.style.display !== "none") {
            renderBundlesPane();
        }
        load();
    };

    m.ov.querySelectorAll("[data-fire-bundle]").forEach((btn) => {
        btn.onclick = () => fireStatBundle(btn.dataset.fireBundle, btn);
    });

    const renderBundlesPane = () => {
        paneBundles.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px">
                ${bundleCatalog.map((b) => `
                    <div style="border:1px solid var(--border-color);border-top:4px solid ${esc(b.badge_color || "#dc2626")};border-radius:10px;padding:12px;background:var(--bg-surface);display:flex;flex-direction:column;justify-content:space-between;gap:8px">
                        <div>
                            <div style="font-weight:800;font-size:13.5px;color:var(--text-primary)">${esc(b.icon || "⚡")} ${esc(b.title)}</div>
                            <div class="muted" style="font-size:11.5px;margin:4px 0 8px">${esc(b.description)}</div>
                            <div style="display:grid;gap:3px;font-size:11.5px">
                                ${(b.items || []).map((it) => `<div>• <b>${esc(it.type)}:</b> ${esc(it.name)}</div>`).join("")}
                            </div>
                        </div>
                        <button type="button" class="erp-b sm" data-pane-fire="${esc(b.code)}" style="background:${esc(b.badge_color || "#dc2626")};border-color:${esc(b.badge_color || "#dc2626")};color:#fff;font-weight:800;width:100%">
                            ⚡ Order ${esc(b.category)} STAT
                        </button>
                    </div>
                `).join("")}
            </div>

            <div style="margin-top:6px">
                <div style="font-weight:800;font-size:13px;margin-bottom:8px">📋 Dispatched STAT Resuscitation Bundles for This Visit (${bundleOrders.length})</div>
                ${bundleOrders.length ? `<div style="display:grid;gap:8px">${bundleOrders.map((o) => `
                    <div style="border:1px solid var(--border-color);border-radius:8px;padding:10px 12px;background:var(--bg-surface-alt)">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                            <div>
                                <span style="font-family:monospace;font-weight:800;background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:5px;font-size:12px">${esc(o.bundle_order_no)}</span>
                                <b style="margin-left:6px">${esc(o.bundle_title)}</b>
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11.5px;font-weight:700">
                                ${o.linked_lab_request_no ? `<span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px">🧪 Lab Req: ${esc(o.linked_lab_request_no)}</span>` : ""}
                                ${o.linked_rad_request_no ? `<span style="background:#f3e8ff;color:#6d28d9;padding:2px 8px;border-radius:6px">🩻 Rad Req: ${esc(o.linked_rad_request_no)}</span>` : ""}
                                <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:6px">✅ ${esc(o.status)}</span>
                            </div>
                        </div>
                        ${o.blood_bank_status ? `<div style="font-size:12px;color:#b91c1c;font-weight:700;margin-top:4px">🩸 Blood Bank: ${esc(o.blood_bank_status)}</div>` : ""}
                        <div class="muted" style="font-size:11.5px;margin-top:4px">Ordered at ${esc(o.ordered_at)} by <b>${esc(o.ordered_by_name)}</b> · Indication: ${esc(o.clinical_indication || "STAT Resuscitation")}</div>
                    </div>
                `).join("")}</div>` : `<div class="erp-empty">No STAT resuscitation bundles ordered for this visit yet. Click any bundle above to dispatch in one click.</div>`}
            </div>
        `;

        paneBundles.querySelectorAll("[data-pane-fire]").forEach((btn) => {
            btn.onclick = () => fireStatBundle(btn.dataset.paneFire, btn);
        });
    };

    if (initialTab !== "form") {
        showTab(initialTab);
    }

    // Live GCS Calculator
    const updateGcsCalculator = () => {
        const e = Number(m.$("#trmGcsEye").value) || 4;
        const vScore = Number(m.$("#trmGcsVerbal").value) || 5;
        const mScore = Number(m.$("#trmGcsMotor").value) || 6;
        const intub = m.$("#trmGcsIntubated").checked;
        const total = e + vScore + mScore;
        const badge = m.$("#trmGcsLiveBadge");
        let bg = "#16a34a";
        let label = "Mild / Alert";
        if (total <= 8) {
            bg = "#dc2626";
            label = "🚨 SEVERE TBI / COMA (≤8: INTUBATE!)";
        } else if (total <= 12) {
            bg = "#d97706";
            label = "⚠️ Moderate TBI (9–12)";
        }
        badge.style.background = bg;
        badge.textContent = `GCS ${total}${intub ? "T" : ""}/15 (E${e} V${vScore} M${mScore}) · ${label}`;
    };

    m.$("#trmGcsEye").addEventListener("change", updateGcsCalculator);
    m.$("#trmGcsVerbal").addEventListener("change", updateGcsCalculator);
    m.$("#trmGcsMotor").addEventListener("change", updateGcsCalculator);
    m.$("#trmGcsIntubated").addEventListener("change", updateGcsCalculator);

    // Live Shock Index Calculator (HR / SBP)
    const updateShockIndex = () => {
        const sbp = Number(m.$("#trmSbp").value) || 0;
        const hr = Number(m.$("#trmHr").value) || 0;
        const badge = m.$("#trmShockIndexBadge");
        if (sbp > 0 && hr > 0) {
            const si = (hr / sbp).toFixed(2);
            const high = Number(si) > 0.9;
            badge.style.background = high ? "#fee2e2" : "#dcfce7";
            badge.style.color = high ? "#991b1b" : "#166534";
            badge.textContent = `Shock Index: ${si}${high ? " (⚠️ >0.9 Shock!)" : " (Normal)"}`;
        } else {
            badge.style.background = "#f1f5f9";
            badge.style.color = "#475569";
            badge.textContent = "Shock Index: --";
        }
    };
    m.$("#trmSbp").addEventListener("input", updateShockIndex);
    m.$("#trmHr").addEventListener("input", updateShockIndex);
    updateShockIndex();

    // Auto-upgrade overall FAST result when any window is Positive Free Fluid
    m.ov.querySelectorAll(".trm-fast-win").forEach((sel) => {
        sel.addEventListener("change", () => {
            const anyPos = Array.from(m.ov.querySelectorAll(".trm-fast-win")).some((s) => s.value === "Positive Free Fluid");
            if (anyPos) {
                m.$("#trmFastOverall").value = "Positive Free Fluid";
            }
        });
    });

    const populateFormFromRecord = (rec) => {
        m.$("#trmRecordId").value = rec.id;
        m.$("#trmEditingBadge").textContent = `Editing ${rec.trauma_record_no}`;
        m.$("#trmActivationLevel").value = rec.trauma_activation_level || "Level 1 - Full Trauma Team Activation";
        m.$("#trmMechanism").value = rec.mechanism_of_injury || "";
        m.$("#trmInjuryDetails").value = rec.injury_details || "";
        m.$("#trmGcsEye").value = rec.gcs_eye || 4;
        m.$("#trmGcsVerbal").value = rec.gcs_verbal || 5;
        m.$("#trmGcsMotor").value = rec.gcs_motor || 6;
        m.$("#trmGcsIntubated").checked = Boolean(rec.gcs_intubated_flag);
        updateGcsCalculator();

        m.$("#trmAirwayStatus").value = rec.atls_airway_status || "Patent & Self-Maintaining";
        m.$("#trmCspine").checked = Boolean(rec.atls_cspine_immobilized);
        m.$("#trmAirwayNotes").value = rec.atls_airway_notes || "";
        m.$("#trmBreathingStatus").value = rec.atls_breathing_status || "Bilateral Equal Breath Sounds";
        m.$("#trmBreathingNotes").value = rec.atls_breathing_notes || "";
        m.$("#trmCirculationStatus").value = rec.atls_circulation_status || "Hemodynamically Stable — Strong Central/Distal Pulses";
        m.$("#trmCirculationNotes").value = rec.atls_circulation_notes || "";
        m.$("#trmDisabilityPupils").value = rec.atls_disability_pupils || "PERRLA (Equal, Round, Reactive 3mm/3mm)";
        m.$("#trmDisabilityNotes").value = rec.atls_disability_notes || "";
        m.$("#trmExposureNotes").value = rec.atls_exposure_notes || "";

        const chkSet = new Set(Array.isArray(rec.atls_checklist) ? rec.atls_checklist : []);
        m.ov.querySelectorAll(".trm-atls-chk").forEach((c) => {
            c.checked = chkSet.has(c.value);
        });

        m.$("#trmFastOverall").value = rec.fast_exam_result || "Negative";
        m.$("#trmFastRuq").value = rec.fast_ruq_morison || "Negative";
        m.$("#trmFastLuq").value = rec.fast_luq_splenorenal || "Negative";
        m.$("#trmFastPelvis").value = rec.fast_pelvis_pouch || "Negative";
        m.$("#trmFastPeri").value = rec.fast_pericardial || "Negative";
        m.$("#trmEfastThorax").value = rec.efast_thorax_pneumo || "Normal Lung Sliding B/L";
        m.$("#trmFastNotes").value = rec.fast_notes || "";

        m.$("#trmSbp").value = rec.bp_systolic ?? "";
        m.$("#trmDbp").value = rec.bp_diastolic ?? "";
        m.$("#trmHr").value = rec.heart_rate ?? "";
        m.$("#trmRr").value = rec.resp_rate ?? "";
        m.$("#trmSpo2").value = rec.spo2 ?? "";
        updateShockIndex();

        m.$("#trmDispositionPlan").value = rec.trauma_disposition_plan || "CT Trauma Pan-Scan (Hemodynamically Stable)";
        m.$("#trmLeaderName").value = rec.trauma_team_leader_name || defaultLeader;
        m.$("#trmSummary").value = rec.resuscitation_summary || "";
        showTab("form");
    };

    const renderTraumaHistory = () => {
        if (!records.length) {
            paneHist.innerHTML = `<div class="erp-empty">No trauma resuscitation surveys recorded for this visit yet.</div>`;
            return;
        }
        paneHist.innerHTML = `<div style="display:grid;gap:10px">${records.map((r) => {
            const gcsBadgeColor = r.gcs_total <= 8 ? "#dc2626" : r.gcs_total <= 12 ? "#d97706" : "#16a34a";
            const fastColor = r.fast_exam_result === "Positive Free Fluid" ? "#dc2626" : r.fast_exam_result === "Indeterminate" ? "#d97706" : "#15803d";
            const chkList = Array.isArray(r.atls_checklist) ? r.atls_checklist : [];
            return `
            <div style="border:1px solid var(--border-color);border-radius:10px;padding:12px;background:var(--bg-surface)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--border-color);padding-bottom:8px;margin-bottom:8px">
                    <div>
                        <span style="font-family:monospace;font-weight:800;background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:6px;font-size:12px">${esc(r.trauma_record_no)}</span>
                        <b style="margin-left:6px">${esc(r.trauma_activation_level)}</b>
                        <div class="muted" style="font-size:12px;margin-top:2px">🕒 ${esc(r.resuscitation_timestamp)} · MOI: <b>${esc(r.mechanism_of_injury)}</b> · Team Leader: <b>${esc(r.trauma_team_leader_name)}</b></div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center">
                        <span style="background:${gcsBadgeColor};color:#fff;padding:3px 9px;border-radius:6px;font-size:12px;font-weight:800">GCS ${r.gcs_total}${r.gcs_intubated_flag ? "T" : ""}/15 (E${r.gcs_eye}V${r.gcs_verbal}M${r.gcs_motor})</span>
                        <span style="background:${fastColor};color:#fff;padding:3px 9px;border-radius:6px;font-size:12px;font-weight:800">FAST: ${esc(r.fast_exam_result)}</span>
                        <button type="button" class="erp-b sm" data-edit-trm="${r.id}">Edit</button>
                        <button type="button" class="erp-b sm" data-del-trm="${r.id}">Delete</button>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;font-size:12.5px;margin-bottom:8px">
                    <div><b>A (Airway/C-Spine):</b> ${esc(r.atls_airway_status)} (${r.atls_cspine_immobilized ? "C-Collar On" : "Cleared"})${r.atls_airway_notes ? ` — ${esc(r.atls_airway_notes)}` : ""}</div>
                    <div><b>B (Breathing):</b> ${esc(r.atls_breathing_status)}${r.atls_breathing_notes ? ` — ${esc(r.atls_breathing_notes)}` : ""}</div>
                    <div><b>C (Circulation):</b> ${esc(r.atls_circulation_status)}${r.shock_index ? ` (SI: ${r.shock_index})` : ""}${r.atls_circulation_notes ? ` — ${esc(r.atls_circulation_notes)}` : ""}</div>
                    <div><b>D (Pupils/Neuro):</b> ${esc(r.atls_disability_pupils)}${r.atls_disability_notes ? ` — ${esc(r.atls_disability_notes)}` : ""}</div>
                    <div><b>E (Exposure):</b> ${esc(r.atls_exposure_notes || "Full exposure & warming")}</div>
                    <div><b>FAST Windows:</b> RUQ: ${esc(r.fast_ruq_morison)} · LUQ: ${esc(r.fast_luq_splenorenal)} · Pelvis: ${esc(r.fast_pelvis_pouch)} · Pericardial: ${esc(r.fast_pericardial)} · eFAST: ${esc(r.efast_thorax_pneumo)}</div>
                </div>
                ${chkList.length ? `<div style="font-size:11.5px;color:var(--text-muted);margin-bottom:4px"><b>Interventions:</b> ${chkList.map((c) => `✓ ${esc(c)}`).join(" · ")}</div>` : ""}
                ${r.trauma_disposition_plan ? `<div style="font-size:12px"><b>Plan:</b> ${esc(r.trauma_disposition_plan)}${r.resuscitation_summary ? ` — ${esc(r.resuscitation_summary)}` : ""}</div>` : ""}
            </div>`;
        }).join("")}</div>`;

        paneHist.querySelectorAll("[data-edit-trm]").forEach((b) => {
            b.onclick = () => {
                const target = records.find((x) => x.id === Number(b.dataset.editTrm));
                if (target) populateFormFromRecord(target);
            };
        });
        paneHist.querySelectorAll("[data-del-trm]").forEach((b) => {
            b.onclick = async () => {
                if (!confirm("Delete this trauma resuscitation record?")) return;
                const dRes = await post("/er/trauma/delete", { id: Number(b.dataset.delTrm) });
                if (dRes?.success) {
                    records = dRes.data?.records || [];
                    m.$("#trmLogCount").textContent = records.length;
                    renderTraumaHistory();
                    showToast(dRes.message, "success");
                    load();
                } else {
                    showToast(dRes?.message || "Could not delete.", "error");
                }
            };
        });
    };

    saveBtn.onclick = async () => {
        const checklist = Array.from(m.ov.querySelectorAll(".trm-atls-chk:checked")).map((c) => c.value);
        const payload = {
            id: m.$("#trmRecordId").value ? Number(m.$("#trmRecordId").value) : null,
            visit_id: visitId,
            trauma_activation_level: m.$("#trmActivationLevel").value,
            mechanism_of_injury: m.$("#trmMechanism").value.trim(),
            injury_details: m.$("#trmInjuryDetails").value.trim(),
            gcs_eye: Number(m.$("#trmGcsEye").value),
            gcs_verbal: Number(m.$("#trmGcsVerbal").value),
            gcs_motor: Number(m.$("#trmGcsMotor").value),
            gcs_intubated_flag: m.$("#trmGcsIntubated").checked ? 1 : 0,
            atls_airway_status: m.$("#trmAirwayStatus").value,
            atls_cspine_immobilized: m.$("#trmCspine").checked ? 1 : 0,
            atls_airway_notes: m.$("#trmAirwayNotes").value.trim(),
            atls_breathing_status: m.$("#trmBreathingStatus").value,
            atls_breathing_notes: m.$("#trmBreathingNotes").value.trim(),
            atls_circulation_status: m.$("#trmCirculationStatus").value,
            atls_circulation_notes: m.$("#trmCirculationNotes").value.trim(),
            atls_disability_pupils: m.$("#trmDisabilityPupils").value,
            atls_disability_notes: m.$("#trmDisabilityNotes").value.trim(),
            atls_exposure_notes: m.$("#trmExposureNotes").value.trim(),
            atls_checklist: checklist,
            fast_exam_result: m.$("#trmFastOverall").value,
            fast_ruq_morison: m.$("#trmFastRuq").value,
            fast_luq_splenorenal: m.$("#trmFastLuq").value,
            fast_pelvis_pouch: m.$("#trmFastPelvis").value,
            fast_pericardial: m.$("#trmFastPeri").value,
            efast_thorax_pneumo: m.$("#trmEfastThorax").value,
            fast_notes: m.$("#trmFastNotes").value.trim(),
            bp_systolic: m.$("#trmSbp").value,
            bp_diastolic: m.$("#trmDbp").value,
            heart_rate: m.$("#trmHr").value,
            resp_rate: m.$("#trmRr").value,
            spo2: m.$("#trmSpo2").value,
            trauma_disposition_plan: m.$("#trmDispositionPlan").value,
            trauma_team_leader_name: m.$("#trmLeaderName").value.trim(),
            resuscitation_summary: m.$("#trmSummary").value.trim()
        };

        saveBtn.disabled = true;
        const res = await post("/er/trauma/save", payload);
        saveBtn.disabled = false;
        if (!res?.success) {
            return m.err(res?.message || "Could not save trauma record.", res?.errors);
        }
        m.err("");
        records = res.data?.records || [];
        m.$("#trmLogCount").textContent = records.length;
        m.$("#trmRecordId").value = "";
        m.$("#trmEditingBadge").textContent = "New Resuscitation Entry";
        showToast(res.message, "success", 5000);
        showTab("history");
        load();
    };
}
