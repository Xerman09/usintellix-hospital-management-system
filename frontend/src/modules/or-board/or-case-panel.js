/**
 * The OR case record (Surgery Phase 4), opened from the OR Live Board,
 * OR Management and the OR Schedule: stages in order, the WHO safety
 * checklist (Sign-In, Time-Out, Sign-Out), anesthesia times and vitals,
 * medicines / fluids / supplies / implants (deducted from stock) and
 * specimens.
 */
import {
    fetchOrRecord, moveOrStage, undoOrStage, cancelOrCaseLive, setOrDelay, saveOrChecklist, saveOrTimes, addOrVitals, removeOrVitals,
    fetchOrStock, addOrItem, voidOrItem, addOrSpecimen, removeOrSpecimen,
    addOrPacu, removeOrPacu, releaseOrCase, saveOrReport, signOrReport, addOrAddendum, fetchOrReportPrint, postOrCharges, voidOrCharge
} from "./or-board.service.js?v=3";
import { API_URL } from "../../core/api.js?v=5";
import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { systemNow, toDateTimeInput, todayISO } from "../../core/timezone.js";

export const STAGES = ["Scheduled", "Pre-Op Holding", "In Room / Induction", "Incision / In Progress", "Closing / Extubation", "In PACU", "Transferred / Discharged"];
export const STAGE_SHORT = {
    "Scheduled": "Scheduled", "Pre-Op Holding": "Pre-op holding", "In Room / Induction": "In room", "Incision / In Progress": "Surgery",
    "Closing / Extubation": "Closing", "In PACU": "Out of room", "Transferred / Discharged": "Transferred", "Cancelled": "Cancelled"
};
/** The checklist phase needed before entering a stage. */
export const GATES = { "In Room / Induction": "sign_in", "Incision / In Progress": "time_out", "In PACU": "sign_out" };
export const PHASE_LABELS = { sign_in: "Sign-In", time_out: "Time-Out", sign_out: "Sign-Out" };

export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/** "YYYY-MM-DD HH:MM[:SS]" (system wall clock) => Date with the same local fields, comparable with systemNow(). */
export const parseDT = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s || ""));
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : null;
};
export const fmtTime = (s) => {
    const d = s instanceof Date ? s : parseDT(s);
    if (!d) return "";
    const h = d.getHours();
    return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const fmtTimeOfDay = (t) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ""));
    if (!m) return "";
    const h = +m[1];
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};
export const fmtDate = (s) => {
    const d = parseDT(String(s).length === 10 ? `${s} 00:00` : s);
    return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
};
/** Minutes as "1h 05m" / "25m". */
export const fmtMin = (min) => {
    const m = Math.max(0, Math.round(min));
    return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
};
export const minutesSince = (s) => {
    const d = parseDT(s);
    return d ? (systemNow() - d) / 60000 : null;
};
const nowInput = () => toDateTimeInput(systemNow());
const toInput = (s) => (s ? String(s).slice(0, 16).replace(" ", "T") : "");
const num = (v) => (v === null || v === undefined || v === "" ? "" : String(v));
const qty = (v) => (v == null ? "" : String(Math.round(Number(v) * 1000) / 1000));
const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
};

const STYLES = `
.orc-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: none; align-items: flex-start; justify-content: center; z-index: 2100; padding: 20px 14px; overflow-y: auto; }
.orc-overlay.open { display: flex; }
.orc-overlay.top { z-index: 2150; }
.orc-overlay [hidden] { display: none !important; }
.orc-modal { background: var(--bg-surface); color: var(--text-primary); border-radius: 12px; width: 100%; max-width: 1080px; box-shadow: 0 20px 50px rgba(0,0,0,.3); font-size: 13.5px; min-width: 0; }
.orc-modal.narrow { max-width: 520px; }
.orc-mhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.orc-mhead h2 { margin: 0; font-size: 17px; line-height: 1.3; }
.orc-x { background: none; border: none; font-size: 24px; line-height: 1; color: var(--text-muted); cursor: pointer; padding: 0 4px; }
.orc-sub { display: block; font-size: 12px; color: var(--text-muted); margin-top: 3px; }
.orc-mbody { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.orc-mfoot { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border-color); }
.orc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.orc-btn:hover { background: var(--bg-surface-alt); }
.orc-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.orc-btn.go { border-color: #16a34a; background: #16a34a; color: #fff; }
.orc-btn.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
.orc-btn.ghost-danger { color: #b91c1c; }
.orc-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.orc-btn:disabled { opacity: .55; cursor: default; }
.orc-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.orc-pill.ok { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.orc-pill.bad { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.orc-pill.warn { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.orc-pill.info { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
.orc-pill.live { background: #dcfce7; color: #166534; border-color: #86efac; }
.orc-allergy { display: inline-flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }

.orc-steps { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0; padding: 4px 0 0; }
.orc-step { position: relative; text-align: center; padding: 0 4px; min-width: 0; }
.orc-step::before { content: ""; position: absolute; top: 11px; left: -50%; width: 100%; height: 3px; background: var(--border-color); z-index: 0; }
.orc-step:first-child::before { display: none; }
.orc-step.done::before, .orc-step.current::before { background: #16a34a; }
.orc-dot { position: relative; z-index: 1; width: 24px; height: 24px; border-radius: 50%; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center;
    background: var(--bg-surface); border: 2px solid var(--border-color); font-size: 12px; font-weight: 800; color: var(--text-muted); }
.orc-step.done .orc-dot { background: #16a34a; border-color: #16a34a; color: #fff; }
.orc-step.current .orc-dot { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 4px rgba(59,130,246,.2); }
.orc-step strong { display: block; font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.orc-step small { display: block; font-size: 10.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.orc-gate { display: block; margin: 3px auto 0; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 1px 6px; width: max-content; max-width: 100%; }
.orc-gate.ok { background: #dcfce7; color: #166534; }
.orc-gate.todo { background: #fef3c7; color: #92400e; }

.orc-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.orc-actions .spacer { flex: 1; }
.orc-needs { font-size: 12px; color: #92400e; font-weight: 600; }
.orc-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border-color); overflow-x: auto; margin: 0 -20px; padding: 0 20px; }
.orc-tabs button { border: none; background: none; padding: 9px 12px; font-weight: 600; font-size: 12.5px; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; font-family: inherit; }
.orc-tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
.orc-tabs .count { font-size: 10.5px; background: var(--bg-surface-alt); border-radius: 999px; padding: 0 6px; margin-left: 4px; }

.orc-phases { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
.orc-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.orc-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-weight: 700; }
.orc-card-head .orc-sub { margin: 0; font-weight: 500; }
.orc-card-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
.orc-card.done { border-color: #86efac; }
.orc-card.done .orc-card-head { background: #f0fdf4; border-radius: 10px 10px 0 0; }
.orc-card.locked { opacity: .75; }
.orc-item { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; }
.orc-item.has-error > label, .orc-item.has-error > .orc-q { color: #b91c1c; }
.orc-q { font-weight: 600; }
.orc-chk { display: flex; gap: 8px; align-items: flex-start; cursor: pointer; }
.orc-chk input { width: 17px; height: 17px; margin-top: 0; flex: none; accent-color: #16a34a; }
.orc-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.orc-opts label { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--border-color); border-radius: 999px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
.orc-opts input { accent-color: var(--accent); margin: 0; }
.orc-opts label:has(input:checked) { border-color: var(--accent); background: var(--accent-light); color: var(--accent-text, var(--accent)); font-weight: 600; }
.orc-err { font-size: 11.5px; color: #dc2626; }
.orc-err:empty { display: none; }
.orc-answers { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.orc-answers li { display: flex; gap: 6px; }
.orc-answers li::before { content: "✓"; color: #16a34a; font-weight: 800; }
.orc-answers li.flag::before { content: "!"; color: #d97706; }
.orc-answers li.todo { color: var(--text-muted); }
.orc-answers li.todo::before { content: "◦"; color: var(--text-muted); }
.orc-count { display: grid; grid-template-columns: minmax(0, 1fr) 70px 70px; gap: 6px; }

.orc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px 12px; }
.orc-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.orc-field.wide { grid-column: 1 / -1; }
.orc-field > span:first-child { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.orc-field input, .orc-field select, .orc-field textarea, .orc-count input, .orc-count select { height: 34px; padding: 0 9px; border-radius: 6px; border: 1px solid var(--border-color);
    background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; width: 100%; box-sizing: border-box; min-width: 0; }
.orc-field textarea { height: auto; min-height: 52px; padding: 7px 9px; resize: vertical; }
.orc-field.has-error input, .orc-field.has-error select, .orc-field.has-error textarea { border-color: #dc2626; }
.orc-inline { display: flex; gap: 6px; }
.orc-inline > :first-child { flex: 1; min-width: 0; }
.orc-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-top: 4px; }
.orc-note { font-size: 12px; color: var(--text-muted); }
.orc-alert { padding: 9px 12px; border-radius: 8px; font-size: 12.5px; border: 1px solid #fca5a5; background: #fef2f2; color: #991b1b; }
.orc-alert.warn { border-color: #fcd34d; background: #fffbeb; color: #92400e; }
.orc-alert.info { border-color: #bfdbfe; background: #eff6ff; color: #1e3a8a; }
.orc-alert:empty { display: none; }

.orc-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 8px; }
.orc-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.orc-table th { text-align: left; padding: 7px 8px; font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.orc-table td { padding: 7px 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.orc-table tr:last-child td { border-bottom: none; }
.orc-table tr.voided td { color: var(--text-muted); }
.orc-table th.r, .orc-table td.r { text-align: right; white-space: nowrap; }
.orc-table tr.has-error td { background: rgba(220,38,38,.08); }
.orc-table tr.voided td.name { text-decoration: line-through; }
.orc-table .x { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 0 4px; text-decoration: underline; }
.orc-empty { padding: 18px; text-align: center; color: var(--text-muted); font-size: 12.5px; }

.orc-chart { width: 100%; height: auto; max-height: 240px; display: block; color: var(--text-primary); }
.orc-legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11.5px; color: var(--text-muted); }
.orc-legend i { display: inline-block; width: 14px; height: 3px; vertical-align: middle; margin-right: 4px; border-radius: 2px; }

.orc-results { border: 1px solid var(--border-color); border-radius: 8px; max-height: 210px; overflow-y: auto; }
.orc-result { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 7px 10px; border-bottom: 1px solid var(--border-color); cursor: pointer; font-size: 12.5px; }
.orc-result:last-child { border-bottom: none; }
.orc-result:hover { background: var(--bg-surface-alt); }
.orc-result.none { opacity: .55; cursor: not-allowed; }
.orc-picked { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent-light); }
.orc-seg { display: inline-flex; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
.orc-seg button { height: 30px; padding: 0 12px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12px; cursor: pointer; font-family: inherit; }
.orc-seg button:last-child { border-right: none; }
.orc-seg button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.orc-pref { display: flex; flex-wrap: wrap; gap: 6px; }
.orc-pref button { border: 1px dashed var(--border-color); background: var(--bg-surface); border-radius: 999px; padding: 4px 10px; font-size: 12px; cursor: pointer; color: var(--text-primary); font-family: inherit; }
.orc-pref button:hover { border-color: var(--accent); color: var(--accent); }
.orc-hist { display: flex; flex-direction: column; gap: 8px; }
.orc-hist div { border-left: 3px solid var(--border-color); padding: 2px 0 2px 10px; font-size: 12.5px; }
.orc-hist div.stage { border-left-color: #16a34a; }
.orc-hist div.checklist { border-left-color: #2563eb; }
.orc-hist div.undone, .orc-hist div.cancelled, .orc-hist div.stage_undone { border-left-color: #dc2626; }

:root[data-theme="dark"] .orc-pill.ok, :root[data-theme="dark"] .orc-pill.live, :root[data-theme="dark"] .orc-gate.ok { background: rgba(34,197,94,.18); color: #bbf7d0; border-color: rgba(34,197,94,.4); }
:root[data-theme="dark"] .orc-pill.bad { background: rgba(239,68,68,.18); color: #fecaca; border-color: rgba(239,68,68,.4); }
:root[data-theme="dark"] .orc-pill.warn, :root[data-theme="dark"] .orc-gate.todo { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.4); }
:root[data-theme="dark"] .orc-pill.info { background: rgba(59,130,246,.18); color: #bfdbfe; border-color: rgba(59,130,246,.4); }
:root[data-theme="dark"] .orc-card.done .orc-card-head { background: rgba(34,197,94,.10); }
:root[data-theme="dark"] .orc-card.done { border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .orc-alert { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.45); color: #fecaca; }
:root[data-theme="dark"] .orc-alert.warn { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); color: #fde68a; }
:root[data-theme="dark"] .orc-alert.info { background: rgba(59,130,246,.12); border-color: rgba(59,130,246,.45); color: #bfdbfe; }
:root[data-theme="dark"] .orc-needs { color: #fde68a; }
:root[data-theme="dark"] .orc-err { color: #fca5a5; }
:root[data-theme="dark"] .orc-btn.ghost-danger { color: #fca5a5; }

.orc-criteria { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 6px; }
.orc-criteria li { display: flex; gap: 8px; align-items: flex-start; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 12.5px; }
.orc-criteria li b { display: block; }
.orc-criteria li::before { content: "✗"; font-weight: 800; color: #dc2626; }
.orc-criteria li.met { border-color: #86efac; background: #f0fdf4; }
.orc-criteria li.met::before { content: "✓"; color: #16a34a; }
.orc-ald { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 6px 10px; align-items: center; font-size: 12.5px; }
.orc-ald > span { font-weight: 600; }
.orc-total { font-size: 22px; font-weight: 800; }
.orc-total.good { color: #16a34a; }
.orc-total.low { color: #d97706; }
.orc-report-view h4 { margin: 10px 0 3px; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); }
.orc-report-view p { margin: 0; white-space: pre-wrap; font-size: 13px; }
.orc-addenda { display: flex; flex-direction: column; gap: 8px; }
.orc-addenda div { border-left: 3px solid #2563eb; padding: 2px 0 2px 10px; font-size: 12.5px; white-space: pre-wrap; }
:root[data-theme="dark"] .orc-criteria li.met { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }

@media (max-width: 900px) { .orc-phases { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) {
    .orc-ald { grid-template-columns: minmax(0, 1fr); }
    .orc-overlay { padding: 8px 4px; }
    .orc-mhead, .orc-mbody, .orc-mfoot { padding-left: 12px; padding-right: 12px; }
    .orc-tabs { margin: 0 -12px; padding: 0 12px; }
    .orc-steps { grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 12px; }
    .orc-step:nth-child(5)::before { display: none; }
}`;

let state = { id: null, data: null, tab: null, onChange: null };
let escapeBound = false;
let stockTimer = null;
const $ = (id) => document.getElementById(id);

/** Adds the styles and the dialog containers once. */
export function ensureOrCaseRoot() {
    if (!$("orc-styles")) {
        const style = document.createElement("style");
        style.id = "orc-styles";
        style.textContent = STYLES;
        document.head.appendChild(style);
    }
    if (!$("orcOverlay")) {
        const wrap = document.createElement("div");
        wrap.innerHTML = `
            <div class="orc-overlay" id="orcOverlay" role="dialog" aria-modal="true" aria-labelledby="orcTitle"><div class="orc-modal" id="orcModal"></div></div>
            <div class="orc-overlay top" id="orcDialogOverlay" role="dialog" aria-modal="true" aria-labelledby="orcDialogTitle"><div class="orc-modal narrow" id="orcDialog"></div></div>`;
        while (wrap.firstElementChild) document.body.appendChild(wrap.firstElementChild);
        $("orcOverlay").addEventListener("mousedown", (e) => { if (e.target === $("orcOverlay")) closeCase(); });
    }
    if (!escapeBound) {
        document.addEventListener("keydown", (e) => {
            if (e.key !== "Escape") return;
            if ($("orcDialogOverlay")?.classList.contains("open")) closeDialog();
            else if ($("orcOverlay")?.classList.contains("open")) closeCase();
        });
        escapeBound = true;
    }
}

function closeCase() {
    $("orcOverlay").classList.remove("open");
    state.id = null;
}
function closeDialog() {
    $("orcDialogOverlay").classList.remove("open");
}
function changed() {
    if (typeof state.onChange === "function") state.onChange();
}

/** Opens the case record. tab: checklist | anesthesia | medicines | supplies | specimens | history */
export async function openOrCase(id, { tab = null, onChange = null } = {}) {
    ensureOrCaseRoot();
    state = { id, data: null, tab: tab || null, onChange };
    itemForm = { kind: null, fromStock: true, picked: null, results: [] };
    $("orcModal").innerHTML = `<div class="orc-mbody"><div class="orc-empty">Loading the case…</div></div>`;
    $("orcOverlay").classList.add("open");
    await reload(tab);
}

async function reload(tab = null) {
    const r = await fetchOrRecord(state.id);
    if (!r?.success) {
        $("orcModal").innerHTML = `<div class="orc-mhead"><h2 id="orcTitle">Case</h2><button type="button" class="orc-x" data-orc-close aria-label="Close">&times;</button></div>
            <div class="orc-mbody"><div class="orc-alert">${esc(r?.message || "Couldn't open the case.")}</div></div>`;
        $("orcModal").querySelector("[data-orc-close]").addEventListener("click", closeCase);
        return;
    }
    state.data = r.data;
    if (tab) state.tab = tab;
    else if (!state.tab) state.tab = defaultTab(r.data);
    render();
}

function defaultTab(d) {
    const stage = d.case.perioperative_stage;
    if (stage === "In PACU") return "recovery";
    if (stage === "Transferred / Discharged") return d.postop.report.status === "signed" ? "recovery" : "report";
    return ["Incision / In Progress", "Closing / Extubation"].includes(stage) && !d.next_needs ? "anesthesia" : "checklist";
}

/* ---------------------------------------------------------------
 * Layout
 * ------------------------------------------------------------- */

function render() {
    const d = state.data;
    const c = d.case;
    const cancelled = c.perioperative_stage === "Cancelled";
    const live = d.items.filter((i) => !i.voided_at);
    const counts = {
        medicines: live.filter((i) => ["medicine", "fluid", "blood"].includes(i.kind)).length,
        supplies: live.filter((i) => ["supply", "implant"].includes(i.kind)).length,
        specimens: d.specimens.length,
        anesthesia: d.vitals.length
    };
    const doneCount = Object.keys(d.checklist.done || {}).length;
    const tabs = [
        ["checklist", `Safety checklist <span class="count">${doneCount}/3</span>`],
        ["anesthesia", `Anesthesia &amp; vitals${counts.anesthesia ? ` <span class="count">${counts.anesthesia}</span>` : ""}`],
        ["medicines", `Medicines &amp; fluids${counts.medicines ? ` <span class="count">${counts.medicines}</span>` : ""}`],
        ["supplies", `Supplies &amp; implants${counts.supplies ? ` <span class="count">${counts.supplies}</span>` : ""}`],
        ["specimens", `Specimens${counts.specimens ? ` <span class="count">${counts.specimens}</span>` : ""}`],
        ["recovery", `Recovery${d.postop.observations.length ? ` <span class="count">${d.postop.observations.length}</span>` : ""}`],
        ["report", `Operative report${d.postop.report.status === "signed" ? ` <span class="count">✓</span>` : d.postop.report.exists ? ` <span class="count">draft</span>` : ""}`],
        ["charges", `Charges${d.charges.billing_status === "billed" ? ` <span class="count">${esc(peso(d.charges.totals.net))}</span>` : ""}`],
        ["history", "Timeline"]
    ];
    const team = [["Surgeon", c.lead_surgeon], ["Assistant", c.assistant_surgeon], ["Anesthesia", c.anesthesiologist], ["Scrub", c.scrub_nurse], ["Circulating", c.circulating_nurse]]
        .filter(([, n]) => n).map(([r, n]) => `${r}: ${esc(n)}`).join(" · ");
    const needs = d.next_needs;
    // Pre-op holding and going into the room happen only on the booked day.
    const notToday = ["Pre-Op Holding", "In Room / Induction"].includes(d.next_stage) && c.scheduled_date !== todayISO();

    $("orcModal").innerHTML = `
        <div class="orc-mhead">
            <div style="min-width:0;">
                <h2 id="orcTitle">${esc(c.case_number)} — ${esc(c.procedure_name)}${c.laterality ? ` (${esc(c.laterality)})` : ""}</h2>
                <span class="orc-sub"><strong>${esc(c.patient_name)}</strong> · ${esc([c.patient_mrn, c.patient_age ? `${c.patient_age} yrs` : "", c.gender].filter(Boolean).join(" · "))}
                    · ${esc(c.or_suite_name)} · ${esc(fmtDate(c.scheduled_date))} ${esc(fmtTimeOfDay(c.scheduled_start_time))} · ${esc(c.surgical_specialty || "")}</span>
                <span class="orc-sub">${team}</span>
                <div class="orc-allergy">
                    <span class="orc-pill ${cancelled ? "bad" : "info"}">${esc(STAGE_SHORT[c.perioperative_stage] || c.perioperative_stage)}</span>
                    <span class="orc-pill ${c.case_priority === "Elective" ? "" : "bad"}">${esc(c.case_priority)}</span>
                    <span class="orc-pill">${esc(c.anesthesia_type)}</span>
                    ${d.allergies.length ? d.allergies.map((a) => `<span class="orc-pill bad" title="${esc([a.reaction, a.severity].filter(Boolean).join(", "))}">⚠ Allergy: ${esc(a.name)}</span>`).join("")
                        : `<span class="orc-pill">No allergies on the chart</span>`}
                    ${Number(c.count_issue) ? `<span class="orc-pill bad">Count discrepancy</span>` : ""}
                    ${c.delay_reason ? `<span class="orc-pill warn">Delay: ${esc(c.delay_reason)}</span>` : ""}
                </div>
            </div>
            <button type="button" class="orc-x" data-orc-close aria-label="Close">&times;</button>
        </div>
        <div class="orc-mbody">
            ${cancelled ? `<div class="orc-alert">Cancelled${c.cancelled_by_name ? ` by ${esc(c.cancelled_by_name)}` : ""}: ${esc(c.cancellation_reason || "")}</div>` : stepper(d)}
            ${cancelled ? "" : `<div class="orc-actions">
                ${notToday ? `<button type="button" class="orc-btn" disabled>Next: ${esc(d.next_label)} →</button>
                    <span class="orc-needs">Booked for ${esc(fmtDate(c.scheduled_date))}; stages start on the day. To do it today, move the booking on the OR Schedule.</span>`
                : d.next_stage ? `<button type="button" class="orc-btn ${needs ? "" : "go"}" id="orcNext">${needs ? `Do the ${PHASE_LABELS[needs]} first`
                    : d.next_stage === "Transferred / Discharged" ? "Release from recovery…" : `Next: ${esc(d.next_label)} →`}</button>` : `<span class="orc-pill ok">Released: ${esc(c.postop_disposition || "")}</span>`}
                ${needs && !notToday ? `<span class="orc-needs">${esc(d.next_label)} needs the ${PHASE_LABELS[needs]}.</span>` : ""}
                <span class="spacer"></span>
                <button type="button" class="orc-btn small" id="orcDelay">${c.delay_reason ? "Change delay reason" : "Delay reason…"}</button>
                ${d.can_undo ? `<button type="button" class="orc-btn small" id="orcUndo">Undo last stage…</button>` : ""}
                ${d.can_cancel ? `<button type="button" class="orc-btn small ghost-danger" id="orcCancel">Cancel case…</button>` : ""}
            </div>`}
            <div class="orc-tabs" role="tablist">${tabs.map(([k, label]) => `<button type="button" role="tab" data-orc-tab="${k}" class="${state.tab === k ? "active" : ""}">${label}</button>`).join("")}</div>
            <div id="orcTabBody"></div>
        </div>`;

    const m = $("orcModal");
    m.querySelector("[data-orc-close]").addEventListener("click", closeCase);
    m.querySelectorAll("[data-orc-tab]").forEach((b) => b.addEventListener("click", () => { state.tab = b.dataset.orcTab; render(); }));
    $("orcNext")?.addEventListener("click", () => {
        if (needs) {
            state.tab = "checklist";
            render();
            document.querySelector(`[data-orc-phase="${needs}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            return;
        }
        if (d.next_stage === "Transferred / Discharged") {
            state.tab = "recovery";
            render();
            $("orcRelease")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            return;
        }
        advanceStage(stageRow(d), { onDone: async () => { changed(); await reload(); } });
    });
    $("orcUndo")?.addEventListener("click", undoDialog);
    $("orcDelay")?.addEventListener("click", delayDialog);
    $("orcCancel")?.addEventListener("click", cancelDialog);
    renderTab();
}

function stageRow(d) {
    return { id: d.case.id, case_number: d.case.case_number, procedure_name: d.case.procedure_name, patient_name: d.case.patient_name,
        perioperative_stage: d.case.perioperative_stage, next_stage: d.next_stage, pacu_bed_no: d.case.pacu_bed_no };
}

function stepper(d) {
    const stage = d.case.perioperative_stage;
    const idx = STAGES.indexOf(stage);
    const latest = {};
    d.stages.filter((s) => !s.undone_at).forEach((s) => { latest[s.stage] = s; });
    const done = d.checklist.done || {};
    return `<div class="orc-steps">${STAGES.map((s, i) => {
        const cls = i < idx ? "done" : i === idx ? "current" : "";
        const at = latest[s];
        const gate = GATES[s];
        return `<div class="orc-step ${cls}">
            <div class="orc-dot">${i < idx ? "✓" : i + 1}</div>
            <strong title="${esc(s)}">${esc(STAGE_SHORT[s])}</strong>
            <small>${at ? `${esc(fmtTime(at.at))}${at.user_name ? ` · ${esc(at.user_name)}` : ""}` : i === 0 ? esc(fmtTimeOfDay(d.case.scheduled_start_time)) : "&nbsp;"}</small>
            ${gate ? `<span class="orc-gate ${done[gate] ? "ok" : "todo"}">${done[gate] ? "✓" : "◦"} ${PHASE_LABELS[gate]}</span>` : ""}
        </div>`;
    }).join("")}</div>`;
}

function renderTab() {
    const body = $("orcTabBody");
    if (!body) return;
    ({ checklist: renderChecklist, anesthesia: renderAnesthesia, medicines: () => renderItems(["medicine", "fluid", "blood"]),
        supplies: () => renderItems(["supply", "implant"]), specimens: renderSpecimens, recovery: renderRecovery, report: renderReport, charges: renderCharges, history: renderHistory }[state.tab] || renderChecklist)(body);
}

/* ---------------------------------------------------------------
 * Stage moves (also used by the board)
 * ------------------------------------------------------------- */

/** The "move to the next stage" dialog. row: id, case_number, procedure_name, patient_name, perioperative_stage, next_stage. */
export function advanceStage(row, { onDone = null } = {}) {
    ensureOrCaseRoot();
    const next = row.next_stage;
    if (!next) return;
    // Leaving recovery goes through the release form (criteria, then a bed / home).
    if (next === "Transferred / Discharged") {
        openOrCase(row.id, { tab: "recovery", onChange: onDone });
        return;
    }
    const label = STAGE_SHORT[next];
    const extra = next === "In PACU"
        ? `<label class="orc-field"><span>PACU bed</span><input id="orcStBed" maxlength="50" value="${esc(row.pacu_bed_no || "")}" placeholder="e.g. PACU-2"></label>`
        : "";
    $("orcDialog").innerHTML = `
        <div class="orc-mhead"><div><h2 id="orcDialogTitle">${esc(row.case_number)}: ${esc(label)}</h2>
            <span class="orc-sub">${esc(row.procedure_name)} — ${esc(row.patient_name)}</span></div>
            <button type="button" class="orc-x" data-close aria-label="Close">&times;</button></div>
        <div class="orc-mbody">
            <div class="orc-alert" id="orcStAlert"></div>
            <p style="margin:0;">Move from <strong>${esc(STAGE_SHORT[row.perioperative_stage])}</strong> to <strong>${esc(label)}</strong>. The time and your name are recorded.</p>
            <div class="orc-seg" role="group" aria-label="When"><button type="button" class="active" data-when="now">Now</button><button type="button" data-when="earlier">It happened earlier</button></div>
            <label class="orc-field" id="orcStAtWrap" hidden><span>When it happened</span><input type="datetime-local" id="orcStAt" value="${nowInput()}"></label>
            ${extra}
        </div>
        <div class="orc-mfoot"><button type="button" class="orc-btn" data-close>Back</button><button type="button" class="orc-btn go" id="orcStOk">Move to ${esc(label)}</button></div>`;
    const dlg = $("orcDialog");
    dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeDialog));
    dlg.querySelectorAll("[data-when]").forEach((b) => b.addEventListener("click", () => {
        dlg.querySelectorAll("[data-when]").forEach((x) => x.classList.toggle("active", x === b));
        $("orcStAtWrap").hidden = b.dataset.when !== "earlier";
    }));
    $("orcStOk").addEventListener("click", async () => {
        const payload = { id: row.id, stage: next };
        if (!$("orcStAtWrap").hidden) payload.at = $("orcStAt").value;
        if ($("orcStBed")) payload.pacu_bed_no = $("orcStBed").value;
        $("orcStOk").disabled = true;
        const res = await moveOrStage(payload);
        $("orcStOk").disabled = false;
        if (!res?.success) {
            if (res?.needs_check) {
                closeDialog();
                showToast(res.message, "error");
                openOrCase(row.id, { tab: "checklist", onChange: onDone });
                return;
            }
            $("orcStAlert").textContent = res?.message || "Couldn't move the case.";
            return;
        }
        closeDialog();
        showToast(res.message, "success");
        if (onDone) await onDone();
    });
    $("orcDialogOverlay").classList.add("open");
}

function reasonDialog({ title, intro, label, placeholder, okLabel, okClass = "primary", value = "", required = true, onOk }) {
    $("orcDialog").innerHTML = `
        <div class="orc-mhead"><h2 id="orcDialogTitle">${esc(title)}</h2><button type="button" class="orc-x" data-close aria-label="Close">&times;</button></div>
        <div class="orc-mbody">
            ${intro ? `<p style="margin:0;">${intro}</p>` : ""}
            <div class="orc-alert" id="orcRAlert"></div>
            <label class="orc-field"><span>${esc(label)}${required ? " *" : ""}</span><textarea id="orcRText" maxlength="255" placeholder="${esc(placeholder || "")}">${esc(value)}</textarea></label>
        </div>
        <div class="orc-mfoot"><button type="button" class="orc-btn" data-close>Back</button><button type="button" class="orc-btn ${okClass}" id="orcROk">${esc(okLabel)}</button></div>`;
    $("orcDialog").querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeDialog));
    $("orcROk").addEventListener("click", async () => {
        const text = $("orcRText").value.trim();
        if (required && !text) {
            $("orcRAlert").textContent = "Enter a reason.";
            return;
        }
        $("orcROk").disabled = true;
        const res = await onOk(text);
        $("orcROk").disabled = false;
        if (!res?.success) {
            $("orcRAlert").textContent = res?.message || "Couldn't save it.";
            return;
        }
        closeDialog();
        showToast(res.message, "success");
        changed();
        await reload();
    });
    $("orcDialogOverlay").classList.add("open");
    $("orcRText").focus();
}

function undoDialog() {
    const c = state.data.case;
    const prev = STAGES[STAGES.indexOf(c.perioperative_stage) - 1];
    reasonDialog({
        title: `Undo ${STAGE_SHORT[c.perioperative_stage]}?`,
        intro: `${esc(c.case_number)} goes back to <strong>${esc(STAGE_SHORT[prev] || "")}</strong>. The move stays in the timeline, marked undone.`,
        label: "Reason", placeholder: "e.g. Clicked by mistake", okLabel: "Undo stage", okClass: "danger",
        onOk: (reason) => undoOrStage(c.id, reason)
    });
}

function delayDialog() {
    const c = state.data.case;
    reasonDialog({
        title: "Delay reason", intro: "Why the case is starting late or running over. It shows on the board; leave it empty to clear it.",
        label: "Reason", placeholder: "e.g. Waiting for blood; previous case ran over", okLabel: "Save", value: c.delay_reason || "", required: false,
        onOk: (reason) => setOrDelay(c.id, reason)
    });
}

function cancelDialog() {
    const c = state.data.case;
    const inRoom = c.perioperative_stage === "In Room / Induction";
    reasonDialog({
        title: `Cancel ${c.case_number}?`,
        intro: inRoom ? "The patient is in the room but there is no incision yet. The case is recorded as abandoned and the suite goes to cleaning." : "The team and the patient get a message.",
        label: "Reason", placeholder: "e.g. Patient unstable after induction", okLabel: "Cancel case", okClass: "danger",
        onOk: (reason) => cancelOrCaseLive(c.id, reason)
    });
}

/* ---------------------------------------------------------------
 * WHO safety checklist
 * ------------------------------------------------------------- */

function renderChecklist(body) {
    const d = state.data;
    const cl = d.checklist;
    body.innerHTML = `
        <p class="orc-note" style="margin:0 0 10px;">WHO Surgical Safety Checklist. Each part is done once, read aloud with the team, and saved with your name and the time.
            The Sign-In is needed before the patient goes into the room, the Time-Out before the incision, and the Sign-Out before the patient leaves the room.</p>
        <div class="orc-phases">${["sign_in", "time_out", "sign_out"].map((p) => phaseCard(p, cl.definition[p], cl.done?.[p], cl.available[p], cl.blocked_reason[p])).join("")}</div>`;
    body.querySelectorAll("form[data-orc-phase]").forEach(bindPhaseForm);
}

function phaseCard(phase, def, done, available, blocked) {
    const head = `<div class="orc-card-head"><span>${esc(def.label)}<span class="orc-sub">${esc(def.when)}</span></span>
        ${done ? `<span class="orc-pill ok">Done</span>` : available ? `<span class="orc-pill warn">To do</span>` : `<span class="orc-pill">Not yet</span>`}</div>`;
    if (done) {
        return `<div class="orc-card done" data-orc-phase="${phase}">${head}<div class="orc-card-body">
            <span class="orc-note">By ${esc(done.completed_by_name || "")} at ${esc(fmtTime(done.completed_at))}</span>
            <ul class="orc-answers">${def.items.map((it) => answerLine(it, done.answers)).join("")}</ul>
            ${done.answers.count_notes ? `<span class="orc-note">Counts: ${esc(done.answers.count_notes)}</span>` : ""}
            ${done.notes ? `<span class="orc-note">Notes: ${esc(done.notes)}</span>` : ""}
        </div></div>`;
    }
    if (!available) {
        return `<div class="orc-card locked" data-orc-phase="${phase}">${head}<div class="orc-card-body"><span class="orc-note">${esc(blocked || "")}</span>
            <ul class="orc-answers">${def.items.map((it) => `<li class="todo">${esc(it.label)}</li>`).join("")}</ul></div></div>`;
    }
    const d = state.data;
    return `<form class="orc-card" data-orc-phase="${phase}" novalidate>${head}<div class="orc-card-body">
        <div class="orc-alert" data-alert></div>
        ${def.items.map((it) => itemInput(phase, it, d)).join("")}
        ${phase === "sign_out" ? `<div class="orc-item" data-key="count_notes" data-count-notes hidden><span class="orc-q">What was done about the count *</span>
            <div class="orc-field"><textarea name="count_notes" maxlength="500" placeholder="e.g. X-ray ordered; result"></textarea></div><span class="orc-err"></span></div>` : ""}
        <label class="orc-field"><span>Notes</span><textarea name="__notes" maxlength="1000"></textarea></label>
        <button type="submit" class="orc-btn go">Complete ${esc(def.label)}</button>
    </div></form>`;
}

function itemInput(phase, it, d) {
    const key = it.key;
    const err = `<span class="orc-err"></span>`;
    if (it.type === "check") {
        return `<div class="orc-item" data-key="${key}"><label class="orc-chk"><input type="checkbox" name="${key}"> <span>${esc(it.label)}</span></label>${err}</div>`;
    }
    if (it.type === "choice") {
        const hint = key === "allergy" ? (d.allergies.length ? `<span class="orc-pill bad" style="align-self:flex-start;">Chart: ${esc(d.allergies.map((a) => a.name).join(", "))}</span>` : `<span class="orc-note">No allergies on the chart.</span>`)
            : key === "site_marked" && d.case.laterality ? `<span class="orc-pill warn" style="align-self:flex-start;">${esc(d.case.laterality)} side</span>` : "";
        return `<div class="orc-item" data-key="${key}"><span class="orc-q">${esc(it.label)}</span>${hint}
            <div class="orc-opts">${Object.entries(it.options).map(([v, l]) => `<label><input type="radio" name="${key}" value="${esc(v)}"> ${esc(l)}</label>`).join("")}</div>
            ${it.detail_on ? `<div class="orc-field" data-detail-for="${key}" data-detail-on="${esc(it.detail_on)}" hidden><textarea name="${key}_detail" maxlength="500" placeholder="Details"></textarea></div>` : ""}
            ${err}</div>`;
    }
    if (it.type === "text") {
        const value = key === "procedure_performed" ? d.case.procedure_name + (d.case.laterality ? ` (${d.case.laterality})` : "") : "";
        return `<div class="orc-item" data-key="${key}"><span class="orc-q">${esc(it.label)}${it.optional ? "" : " *"}</span>
            <div class="orc-field"><input name="${key}" maxlength="255" value="${esc(value)}"></div>${err}</div>`;
    }
    if (it.type === "count") {
        return `<div class="orc-item" data-key="${key}"><span class="orc-q">${esc(it.label)}</span>
            <div class="orc-count"><select name="${key}__status" aria-label="${esc(it.label)} result"><option value="">Result…</option>
                ${Object.entries(state.data.checklist.count_statuses).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>
                <input type="number" min="0" name="${key}__before" placeholder="Before" aria-label="Count before"><input type="number" min="0" name="${key}__after" placeholder="After" aria-label="Count after"></div>
            ${err}</div>`;
    }
    return "";
}

function answerLine(it, a) {
    const v = a[it.key];
    if (it.type === "check") return `<li>${esc(it.label)}</li>`;
    if (it.type === "choice") {
        const flag = (it.key === "equipment_problems" || it.key === "near_miss") && v === "yes";
        return `<li class="${flag ? "flag" : ""}"><span>${esc(it.label)} <strong>${esc(it.options[v] || v || "")}</strong>${a[`${it.key}_detail`] ? ` — ${esc(a[`${it.key}_detail`])}` : ""}</span></li>`;
    }
    if (it.type === "text") return v ? `<li><span>${esc(it.label)}: <strong>${esc(v)}</strong></span></li>` : "";
    if (it.type === "count" && v) {
        const flag = ["resolved", "unresolved"].includes(v.status);
        return `<li class="${flag ? "flag" : ""}"><span>${esc(it.label)}: <strong>${esc(state.data.checklist.count_statuses[v.status] || v.status)}</strong>${v.before != null || v.after != null ? ` (${v.before ?? "–"} / ${v.after ?? "–"})` : ""}</span></li>`;
    }
    return "";
}

function bindPhaseForm(form) {
    const phase = form.dataset.orcPhase;
    const def = state.data.checklist.definition[phase];
    const syncDetails = () => {
        form.querySelectorAll("[data-detail-for]").forEach((w) => {
            const picked = form.querySelector(`input[name="${w.dataset.detailFor}"]:checked`);
            w.hidden = !picked || picked.value !== w.dataset.detailOn;
        });
        const notes = form.querySelector("[data-count-notes]");
        if (notes) notes.hidden = ![...form.querySelectorAll("select[name$='__status']")].some((s) => s.value === "unresolved");
    };
    form.addEventListener("change", syncDetails);
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const answers = {};
        def.items.forEach((it) => {
            const k = it.key;
            if (it.type === "check") answers[k] = form.querySelector(`[name="${k}"]`).checked;
            else if (it.type === "choice") {
                answers[k] = form.querySelector(`input[name="${k}"]:checked`)?.value || null;
                const det = form.querySelector(`[name="${k}_detail"]`);
                if (det) answers[`${k}_detail`] = det.value;
            } else if (it.type === "text") answers[k] = form.querySelector(`[name="${k}"]`).value;
            else if (it.type === "count") {
                answers[k] = { status: form.querySelector(`[name="${k}__status"]`).value, before: form.querySelector(`[name="${k}__before"]`).value, after: form.querySelector(`[name="${k}__after"]`).value };
            }
        });
        const cn = form.querySelector(`[name="count_notes"]`);
        if (cn) answers.count_notes = cn.value;
        form.querySelectorAll(".orc-item").forEach((el) => { el.classList.remove("has-error"); el.querySelector(".orc-err").textContent = ""; });
        form.querySelector("[data-alert]").textContent = "";
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        const res = await saveOrChecklist(state.id, phase, answers, form.querySelector(`[name="__notes"]`).value);
        btn.disabled = false;
        if (!res?.success) {
            form.querySelector("[data-alert]").textContent = res?.message || "Couldn't save it.";
            Object.entries(res?.errors || {}).forEach(([k, msg]) => {
                const el = form.querySelector(`.orc-item[data-key="${k}"]`);
                if (el) {
                    el.hidden = false;
                    el.classList.add("has-error");
                    el.querySelector(".orc-err").textContent = msg;
                }
            });
            form.querySelector(".has-error")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            return;
        }
        showToast(res.message, "success");
        changed();
        await reload();
    });
}

/* ---------------------------------------------------------------
 * Anesthesia & vitals
 * ------------------------------------------------------------- */

function renderAnesthesia(body) {
    const d = state.data;
    const c = d.case;
    const inRoom = ["In Room / Induction", "Incision / In Progress", "Closing / Extubation", "In PACU", "Transferred / Discharged"].includes(c.perioperative_stage);
    const milestones = [["In room", c.actual_in_room_time], ["Incision", c.actual_incision_time], ["Closing", c.actual_closing_time], ["Out of room", c.actual_out_room_time]];
    const anesMin = c.anesthesia_start_time ? ((parseDT(c.anesthesia_end_time) || systemNow()) - parseDT(c.anesthesia_start_time)) / 60000 : null;
    body.innerHTML = `
        <div class="orc-section">Times, blood loss and urine output</div>
        <form id="orcTimes" class="orc-grid" novalidate style="margin-top:8px;">
            <label class="orc-field" data-key="anesthesia_start_time"><span>Anesthesia start</span><div class="orc-inline"><input type="datetime-local" name="anesthesia_start_time" value="${esc(toInput(c.anesthesia_start_time))}" ${d.can_record ? "" : "disabled"}>
                <button type="button" class="orc-btn small" data-now="anesthesia_start_time" ${d.can_record ? "" : "disabled"}>Now</button></div><span class="orc-err"></span></label>
            <label class="orc-field" data-key="anesthesia_end_time"><span>Anesthesia end</span><div class="orc-inline"><input type="datetime-local" name="anesthesia_end_time" value="${esc(toInput(c.anesthesia_end_time))}" ${d.can_record ? "" : "disabled"}>
                <button type="button" class="orc-btn small" data-now="anesthesia_end_time" ${d.can_record ? "" : "disabled"}>Now</button></div><span class="orc-err"></span></label>
            <label class="orc-field" data-key="estimated_blood_loss_ml"><span>Estimated blood loss (mL)</span><input type="number" min="0" name="estimated_blood_loss_ml" value="${esc(num(c.estimated_blood_loss_ml))}" ${d.can_record ? "" : "disabled"}><span class="orc-err"></span></label>
            <label class="orc-field" data-key="urine_output_ml"><span>Urine output (mL)</span><input type="number" min="0" name="urine_output_ml" value="${esc(num(c.urine_output_ml))}" ${d.can_record ? "" : "disabled"}><span class="orc-err"></span></label>
            <div class="orc-field wide"><div class="orc-actions"><button type="submit" class="orc-btn primary" ${d.can_record ? "" : "disabled"}>Save</button>
                <span class="orc-note">${anesMin != null ? `Anesthesia time ${fmtMin(anesMin)}${c.anesthesia_end_time ? "" : " so far"} · ` : ""}${milestones.map(([l, t]) => `${l} ${t ? esc(fmtTime(t)) : "—"}`).join(" · ")}</span></div>
                <div class="orc-alert" id="orcTimesAlert"></div></div>
        </form>
        <div class="orc-section">Vitals</div>
        ${d.vitals.length ? vitalsChart(d.vitals) : ""}
        ${inRoom ? `<form id="orcVitals" class="orc-grid" novalidate>
            <label class="orc-field" data-key="recorded_at"><span>Time</span><input type="datetime-local" name="recorded_at" value="${nowInput()}"><span class="orc-err"></span></label>
            ${[["heart_rate", "HR (/min)"], ["bp_systolic", "BP systolic"], ["bp_diastolic", "BP diastolic"], ["spo2", "SpO₂ (%)"], ["etco2", "EtCO₂ (mmHg)"], ["resp_rate", "RR (/min)"], ["temperature", "Temp (°C)"]]
                .map(([k, l]) => `<label class="orc-field" data-key="${k}"><span>${l}</span><input type="number" step="${k === "temperature" ? "0.1" : "1"}" name="${k}"><span class="orc-err"></span></label>`).join("")}
            <label class="orc-field" data-key="notes"><span>Note</span><input name="notes" maxlength="255"></label>
            <div class="orc-field wide"><div class="orc-actions"><button type="submit" class="orc-btn primary">Add reading</button><div class="orc-alert" id="orcVitalsAlert" style="flex:1;"></div></div></div>
        </form>` : `<div class="orc-alert info">Vitals are recorded once the patient is in the room.</div>`}
        ${d.vitals.length ? `<div class="orc-table-wrap"><table class="orc-table"><thead><tr><th>Time</th><th>HR</th><th>BP</th><th>SpO₂</th><th>EtCO₂</th><th>RR</th><th>Temp</th><th>Note</th><th>By</th><th></th></tr></thead><tbody>
            ${[...d.vitals].reverse().map((v) => `<tr><td>${esc(fmtTime(v.recorded_at))}</td><td>${esc(num(v.heart_rate))}</td>
                <td>${v.bp_systolic != null || v.bp_diastolic != null ? `${esc(num(v.bp_systolic))}/${esc(num(v.bp_diastolic))}` : ""}</td><td>${esc(num(v.spo2))}</td><td>${esc(num(v.etco2))}</td>
                <td>${esc(num(v.resp_rate))}</td><td>${esc(num(v.temperature))}</td><td>${esc(v.notes || "")}</td><td>${esc(v.recorded_by || "")}</td>
                <td><button type="button" class="x" data-rm-vital="${v.id}">Remove</button></td></tr>`).join("")}</tbody></table></div>` : ""}`;

    const times = $("orcTimes");
    times.querySelectorAll("[data-now]").forEach((b) => b.addEventListener("click", () => { times.querySelector(`[name="${b.dataset.now}"]`).value = nowInput(); }));
    times.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = { id: c.id, revision: c.revision };
        ["anesthesia_start_time", "anesthesia_end_time", "estimated_blood_loss_ml", "urine_output_ml"].forEach((k) => { data[k] = times.querySelector(`[name="${k}"]`).value; });
        const res = await saveOrTimes(data);
        showErrors(times, res, $("orcTimesAlert"));
        if (res?.success) {
            showToast(res.message, "success");
            changed();
            await reload();
        }
    });
    $("orcVitals")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const data = { case_id: c.id };
        f.querySelectorAll("input").forEach((i) => { data[i.name] = i.value; });
        const res = await addOrVitals(data);
        showErrors(f, res, $("orcVitalsAlert"));
        if (res?.success) {
            showToast(res.message, "success");
            await reload();
        }
    });
    body.querySelectorAll("[data-rm-vital]").forEach((b) => b.addEventListener("click", async () => {
        const res = await removeOrVitals(Number(b.dataset.rmVital));
        showToast(res?.message || "Couldn't remove it.", res?.success ? "success" : "error");
        if (res?.success) await reload();
    }));
}

function showErrors(form, res, alertEl) {
    form.querySelectorAll("[data-key]").forEach((el) => { el.classList.remove("has-error"); const e = el.querySelector(".orc-err"); if (e) e.textContent = ""; });
    if (alertEl) alertEl.textContent = "";
    if (res?.success) return;
    if (alertEl) alertEl.textContent = res?.message || "Couldn't save it.";
    Object.entries(res?.errors || {}).forEach(([k, msg]) => {
        const el = form.querySelector(`[data-key="${k}"]`);
        if (el) {
            el.classList.add("has-error");
            const e = el.querySelector(".orc-err");
            if (e) e.textContent = msg;
        }
    });
}

function vitalsChart(vitals) {
    const pts = vitals.map((v) => ({ ...v, t: parseDT(v.recorded_at)?.getTime() })).filter((v) => v.t);
    if (!pts.length) return "";
    const W = 640, H = 170, L = 34, R = 8, T = 8, B = 22;
    let t0 = Math.min(...pts.map((p) => p.t)), t1 = Math.max(...pts.map((p) => p.t));
    if (t1 - t0 < 30 * 60000) t1 = t0 + 30 * 60000;
    const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
    const y = (v) => T + (1 - Math.min(200, Math.max(0, v)) / 200) * (H - T - B);
    const series = [["heart_rate", "#dc2626", ""], ["bp_systolic", "#2563eb", ""], ["bp_diastolic", "#2563eb", "4 3"], ["spo2", "#16a34a", ""]];
    const lines = series.map(([k, color, dash]) => {
        const s = pts.filter((p) => p[k] != null);
        if (!s.length) return "";
        return `<polyline fill="none" stroke="${color}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ""} points="${s.map((p) => `${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ")}"/>`
            + s.map((p) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p[k]).toFixed(1)}" r="2.6" fill="${color}"><title>${esc(fmtTime(p.recorded_at))}: ${p[k]}</title></circle>`).join("");
    }).join("");
    const grid = [0, 50, 100, 150, 200].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" stroke-opacity=".12"/><text x="${L - 6}" y="${y(v) + 3}" font-size="9" text-anchor="end" fill="currentColor" fill-opacity=".55">${v}</text>`).join("");
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
        const t = t0 + f * (t1 - t0);
        return `<text x="${x(t)}" y="${H - 6}" font-size="9" text-anchor="middle" fill="currentColor" fill-opacity=".55">${esc(fmtTime(new Date(t)))}</text>`;
    }).join("");
    return `<svg class="orc-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vitals over time">${grid}${ticks}${lines}</svg>
        <div class="orc-legend"><span><i style="background:#dc2626"></i>Heart rate</span><span><i style="background:#2563eb"></i>BP systolic</span>
            <span><i style="background:repeating-linear-gradient(90deg,#2563eb 0 4px,transparent 4px 7px)"></i>BP diastolic</span><span><i style="background:#16a34a"></i>SpO₂</span></div>`;
}

/* ---------------------------------------------------------------
 * Medicines, fluids, blood, supplies, implants
 * ------------------------------------------------------------- */

let itemForm = { kind: null, fromStock: true, picked: null, results: [] };

function renderItems(kinds) {
    const d = state.data;
    const list = d.items.filter((i) => kinds.includes(i.kind));
    const meds = kinds.includes("medicine");
    if (!kinds.includes(itemForm.kind)) itemForm = { kind: kinds[0], fromStock: true, picked: null, results: [] };
    const pref = d.preference_items.filter((p) => (meds ? p.item_type === "medicine" : p.item_type === "supply"));
    const instruments = meds ? [] : d.preference_items.filter((p) => p.item_type === "instrument");

    const body = $("orcTabBody");
    body.innerHTML = `
        ${list.length ? `<div class="orc-table-wrap"><table class="orc-table"><thead><tr>
            <th>${meds ? "Time" : "Type"}</th><th>Item</th><th>${meds ? "Dose · route" : "Details"}</th><th>From stock</th><th>${meds ? "Given by" : "Recorded by"}</th><th></th></tr></thead><tbody>
            ${list.map((i) => `<tr class="${i.voided_at ? "voided" : ""}">
                <td>${meds ? esc(fmtTime(i.given_at || i.created_at)) : esc(i.kind_label)}</td>
                <td class="name"><strong>${esc(i.name)}</strong>${meds && i.kind !== "medicine" ? ` <span class="orc-pill">${esc(i.kind_label)}</span>` : ""}
                    ${i.is_controlled ? ` <span class="orc-pill bad">DD</span>` : ""}${i.is_high_alert ? ` <span class="orc-pill warn">High alert</span>` : ""}
                    ${i.voided_at ? `<span class="orc-sub">Removed by ${esc(i.voided_by_name || "")}: ${esc(i.void_reason || "")}</span>` : ""}</td>
                <td>${meds ? esc([i.dose, i.route].filter(Boolean).join(" · "))
                    : esc([i.lot_number ? `Lot ${i.lot_number}` : "", i.serial_number ? `S/N ${i.serial_number}` : "", i.expires_date ? `exp ${i.expires_date}` : "",
                        i.manufacturer, i.catalog_no ? `Cat. ${i.catalog_no}` : "", i.size, i.body_site].filter(Boolean).join(" · "))}${i.notes ? `<span class="orc-sub">${esc(i.notes)}</span>` : ""}</td>
                <td>${i.quantity != null && i.warehouse_name ? `${esc(qty(i.quantity))} ${esc(i.unit_name || "")} · ${esc(i.warehouse_name)}
                    <span class="orc-sub">${i.lots.map((l) => `Lot ${esc(l.lot_number)} × ${esc(qty(l.quantity))}`).join(", ")}</span>` : `<span class="orc-sub" style="margin:0;">Not from stock</span>`}</td>
                <td>${esc(meds ? i.given_by_name || "" : i.recorded_by || "")}</td>
                <td>${i.voided_at ? "" : `<button type="button" class="x" data-void="${i.id}">Remove</button>`}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="orc-empty">Nothing recorded yet.</div>`}
        ${d.can_record ? `
            <div class="orc-section">Record ${meds ? "a medicine, fluid or blood product" : "a supply or implant"}</div>
            ${pref.length ? `<div><span class="orc-note">From the preference card for ${esc(d.case.surgery_name || d.case.procedure_name)}:</span>
                <div class="orc-pref" style="margin-top:6px;">${pref.map((p, n) => `<button type="button" data-pref="${n}">+ ${esc(p.name)} × ${esc(qty(p.quantity))}${p.unit_name ? ` ${esc(p.unit_name)}` : ""}</button>`).join("")}</div></div>` : ""}
            ${instruments.length ? `<span class="orc-note">Instrument sets on the card (not taken from stock): ${esc(instruments.map((p) => p.name).join(", "))}</span>` : ""}
            <form id="orcItem" novalidate class="orc-card"><div class="orc-card-body" id="orcItemBody"></div></form>`
        : `<div class="orc-alert info">${d.case.perioperative_stage === "Cancelled" ? "The case was cancelled." : "Items are recorded from pre-op holding on."}</div>`}`;

    body.querySelectorAll("[data-void]").forEach((b) => b.addEventListener("click", () => {
        const item = d.items.find((i) => i.id === Number(b.dataset.void));
        reasonDialog({
            title: `Remove ${item.name}?`, intro: item.drug_id ? "It comes off the record and the stock goes back to the lots it was taken from." : "It comes off the record (kept, marked removed).",
            label: "Reason", placeholder: "e.g. Recorded twice; opened but not used", okLabel: "Remove", okClass: "danger",
            onOk: (reason) => voidOrItem(item.id, reason)
        });
    }));
    body.querySelectorAll("[data-pref]").forEach((b) => b.addEventListener("click", () => {
        const p = pref[Number(b.dataset.pref)];
        itemForm = { kind: meds ? "medicine" : "supply", fromStock: !!p.drug_id, picked: null, results: [], prefill: p };
        drawItemForm(kinds);
        if (p.drug_id) {
            loadStock(p.name, (rows) => {
                const hit = rows.find((r) => r.id === p.drug_id);
                if (hit) pick(hit, kinds);
                $("orcItem").querySelector('[name="quantity"]').value = qty(p.quantity);
            });
        } else {
            $("orcItem").querySelector('[name="name"]').value = p.name;
        }
        $("orcItem").scrollIntoView({ block: "nearest", behavior: "smooth" });
    }));
    if ($("orcItem")) {
        drawItemForm(kinds);
        $("orcItem").addEventListener("submit", (e) => submitItem(e, kinds));
    }
}

function warehouseId() {
    const whs = state.data.options.warehouses;
    const saved = Number(store.get("orc.warehouse"));
    return whs.some((w) => Number(w.id) === saved) ? saved : Number(whs[0]?.id || 0);
}

function drawItemForm(kinds) {
    const d = state.data;
    const f = itemForm;
    const k = f.kind;
    const given = ["medicine", "fluid", "blood"].includes(k);
    const implant = k === "implant";
    const team = d.options.team;
    const picked = f.picked;
    $("orcItemBody").innerHTML = `
        <div class="orc-alert" id="orcItemAlert"></div>
        <div class="orc-actions">
            <div class="orc-seg" role="group" aria-label="Kind">${kinds.map((x) => `<button type="button" data-kind="${x}" class="${x === k ? "active" : ""}">${esc(d.options.item_kinds[x])}</button>`).join("")}</div>
            <div class="orc-seg" role="group" aria-label="Source"><button type="button" data-src="stock" class="${f.fromStock ? "active" : ""}">From stock</button><button type="button" data-src="free" class="${f.fromStock ? "" : "active"}">Not from stock</button></div>
        </div>
        ${f.fromStock ? `
            <div class="orc-grid">
                <label class="orc-field" data-key="warehouse_id"><span>Taken from</span><select name="warehouse_id">${d.options.warehouses.map((w) => `<option value="${w.id}" ${Number(w.id) === warehouseId() ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select><span class="orc-err"></span></label>
                <label class="orc-field" data-key="drug_id" style="grid-column: span 2;"><span>Find the item</span><input name="__q" placeholder="Type a name…" autocomplete="off" value="${esc(picked ? "" : f.q || "")}"><span class="orc-err"></span></label>
            </div>
            ${picked ? `<div class="orc-picked"><span><strong>${esc(picked.name)}</strong> · ${esc(qty(picked.usable))} ${esc(picked.unit_name || "")} usable here
                ${picked.is_controlled ? ` <span class="orc-pill bad">Dangerous drug</span>` : ""}${picked.is_high_alert ? ` <span class="orc-pill warn">High alert</span>` : ""}</span>
                <button type="button" class="orc-btn small" data-unpick>Change</button></div>`
                : `<div class="orc-results" id="orcResults">${resultsHtml()}</div>`}
            <div class="orc-grid">
                <label class="orc-field" data-key="quantity"><span>Quantity used${picked?.unit_name ? ` (${esc(picked.unit_name)})` : ""} *</span><input type="number" min="0" step="any" name="quantity" value="${implant ? "1" : ""}"><span class="orc-err"></span></label>
                <label class="orc-field" data-key="lot_id"><span>Lot${implant ? " *" : ""}</span><select name="lot_id">${implant ? `<option value="">Choose the lot…</option>` : `<option value="">Earliest expiry first</option>`}
                    ${(picked?.lots || []).map((l) => `<option value="${l.id}">${esc(l.lot_number)}${l.expires_date ? ` · exp ${esc(l.expires_date)}` : ""} · ${esc(qty(l.quantity))} left</option>`).join("")}</select><span class="orc-err"></span></label>
            </div>`
        : `<div class="orc-grid"><label class="orc-field wide" data-key="name"><span>${implant ? "Implant" : "Item"} *</span><input name="name" maxlength="255" placeholder="${given ? "e.g. Cefazolin" : implant ? "e.g. Titanium plate 6-hole" : "e.g. Hemostatic gauze"}"><span class="orc-err"></span></label>
            ${given ? "" : `<label class="orc-field" data-key="quantity"><span>Quantity</span><input type="number" min="0" step="any" name="quantity" value="1"><span class="orc-err"></span></label>`}</div>`}
        ${given ? `<div class="orc-grid">
            <label class="orc-field" data-key="dose"><span>Dose / volume${f.fromStock ? "" : " *"}</span><input name="dose" maxlength="100" placeholder="${k === "fluid" ? "e.g. 1000 mL" : k === "blood" ? "e.g. 1 unit PRBC" : "e.g. 2 g"}"><span class="orc-err"></span></label>
            <label class="orc-field" data-key="route"><span>Route</span><select name="route"><option value="">—</option>${d.options.routes.map((r) => `<option ${r === "IV" && k !== "medicine" ? "selected" : ""}>${esc(r)}</option>`).join("")}</select><span class="orc-err"></span></label>
            <label class="orc-field" data-key="given_at"><span>Given at</span><input type="datetime-local" name="given_at" value="${nowInput()}"><span class="orc-err"></span></label>
            <label class="orc-field" data-key="given_by"><span>Given by</span><select name="given_by"><option value="">Me</option>${team.map((t) => `<option value="${t.user_id}">${esc(t.name)} (${esc(t.role)})</option>`).join("")}</select><span class="orc-err"></span></label>
        </div>` : ""}
        ${implant ? `<div class="orc-grid">
            ${f.fromStock ? "" : `<label class="orc-field" data-key="lot_number"><span>Lot number *</span><input name="lot_number" maxlength="100"><span class="orc-err"></span></label>
                <label class="orc-field" data-key="expires_date"><span>Expiry</span><input type="date" name="expires_date"><span class="orc-err"></span></label>`}
            <label class="orc-field" data-key="serial_number"><span>Serial number</span><input name="serial_number" maxlength="100"></label>
            <label class="orc-field"><span>Manufacturer</span><input name="manufacturer" maxlength="150"></label>
            <label class="orc-field"><span>Catalog / ref. no.</span><input name="catalog_no" maxlength="100"></label>
            <label class="orc-field"><span>Size</span><input name="size" maxlength="50"></label>
            <label class="orc-field"><span>Body site</span><input name="body_site" maxlength="150"></label>
        </div>` : ""}
        <label class="orc-field"><span>Notes</span><input name="notes" maxlength="500"></label>
        <div class="orc-actions"><button type="submit" class="orc-btn primary">Record ${esc(d.options.item_kinds[k].toLowerCase())}</button>
            ${f.fromStock ? `<span class="orc-note">Deducted from the location's stock, earliest expiry first, through the medicine ledger.</span>` : ""}</div>`;

    const body = $("orcItemBody");
    body.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => { itemForm.kind = b.dataset.kind; drawItemForm(kinds); }));
    body.querySelectorAll("[data-src]").forEach((b) => b.addEventListener("click", () => { itemForm.fromStock = b.dataset.src === "stock"; itemForm.picked = null; drawItemForm(kinds); }));
    body.querySelector("[data-unpick]")?.addEventListener("click", () => { itemForm.picked = null; drawItemForm(kinds); loadStock(itemForm.q || ""); });
    const wh = body.querySelector('[name="warehouse_id"]');
    wh?.addEventListener("change", () => { store.set("orc.warehouse", wh.value); itemForm.picked = null; drawItemForm(kinds); loadStock(itemForm.q || ""); });
    const q = body.querySelector('[name="__q"]');
    q?.addEventListener("input", () => {
        itemForm.q = q.value;
        clearTimeout(stockTimer);
        stockTimer = setTimeout(() => loadStock(q.value), 250);
    });
    body.querySelector("#orcResults")?.addEventListener("click", (e) => {
        const row = e.target.closest("[data-pick]");
        if (!row || row.classList.contains("none")) return;
        const hit = itemForm.results.find((r) => r.id === Number(row.dataset.pick));
        if (hit) pick(hit, kinds);
    });
    if (f.fromStock && !picked && !f.results.length) loadStock(f.q || "");
}

function resultsHtml() {
    const rows = itemForm.results;
    if (!rows.length) return `<div class="orc-empty">${itemForm.loading ? "Searching…" : "No catalog items match."}</div>`;
    return rows.map((r) => `<div class="orc-result ${r.usable > 0 ? "" : "none"}" data-pick="${r.id}">
        <span><strong>${esc(r.name)}</strong>${r.strength ? ` ${esc(r.strength)}` : ""} <span class="orc-sub" style="display:inline;">${esc(r.product_type)}</span>
            ${r.is_controlled ? ` <span class="orc-pill bad">DD</span>` : ""}${r.is_high_alert ? ` <span class="orc-pill warn">High alert</span>` : ""}</span>
        <span class="orc-pill ${r.usable > 0 ? "ok" : ""}">${r.usable > 0 ? `${esc(qty(r.usable))} ${esc(r.unit_name || "")}` : "None here"}</span></div>`).join("");
}

let stockSeq = 0;

async function loadStock(q, then = null) {
    const whSel = document.querySelector('#orcItem [name="warehouse_id"]');
    const wh = whSel ? whSel.value : warehouseId();
    const seq = ++stockSeq;
    itemForm.loading = true;
    const res = await fetchOrStock(wh, q);
    if (seq !== stockSeq) return;
    itemForm.loading = false;
    itemForm.results = res?.success ? res.data : [];
    const box = $("orcResults");
    if (box) box.innerHTML = resultsHtml();
    if (then) then(itemForm.results);
}

function pick(row, kinds) {
    itemForm.picked = row;
    const keepQty = document.querySelector('#orcItem [name="quantity"]')?.value;
    drawItemForm(kinds);
    if (keepQty) document.querySelector('#orcItem [name="quantity"]').value = keepQty;
}

async function submitItem(e, kinds) {
    e.preventDefault();
    const f = e.target;
    const val = (n) => f.querySelector(`[name="${n}"]`)?.value ?? "";
    const data = { case_id: state.id, kind: itemForm.kind, notes: val("notes") };
    if (itemForm.fromStock) {
        if (!itemForm.picked) {
            showErrors(f, { success: false, message: "Choose the item from the list.", errors: { drug_id: "Choose the item." } }, $("orcItemAlert"));
            return;
        }
        Object.assign(data, { drug_id: itemForm.picked.id, warehouse_id: val("warehouse_id"), quantity: val("quantity"), lot_id: val("lot_id") });
    } else {
        Object.assign(data, { name: val("name"), quantity: val("quantity") });
    }
    ["dose", "route", "given_at", "given_by", "lot_number", "expires_date", "serial_number", "manufacturer", "catalog_no", "size", "body_site"].forEach((k) => {
        if (f.querySelector(`[name="${k}"]`)) data[k] = val(k);
    });
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    const res = await addOrItem(data);
    btn.disabled = false;
    showErrors(f, res, $("orcItemAlert"));
    if (!res?.success) return;
    showToast(res.message, "success");
    itemForm = { kind: itemForm.kind, fromStock: itemForm.fromStock, picked: null, results: [], q: "" };
    changed();
    await reload();
}

/* ---------------------------------------------------------------
 * Specimens
 * ------------------------------------------------------------- */

function renderSpecimens(body) {
    const d = state.data;
    const open = ["In Room / Induction", "Incision / In Progress", "Closing / Extubation", "In PACU", "Transferred / Discharged"].includes(d.case.perioperative_stage);
    body.innerHTML = `
        ${d.specimens.length ? `<div class="orc-table-wrap"><table class="orc-table"><thead><tr><th>Time</th><th>Specimen</th><th>Type</th><th>Containers</th><th>Sent to</th><th>By</th><th></th></tr></thead><tbody>
            ${d.specimens.map((s) => `<tr><td>${esc(fmtTime(s.collected_at))}</td><td><strong>${esc(s.description)}</strong>${s.body_site ? `<span class="orc-sub">${esc(s.body_site)}</span>` : ""}${s.notes ? `<span class="orc-sub">${esc(s.notes)}</span>` : ""}</td>
                <td>${esc(s.specimen_type)}</td><td>${s.container_count}</td><td>${esc(s.sent_to || "")}</td><td>${esc(s.recorded_by || "")}</td>
                <td><button type="button" class="x" data-rm-spec="${s.id}">Remove</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="orc-empty">No specimens recorded.</div>`}
        ${open ? `<div class="orc-section">Record a specimen</div>
            <form id="orcSpec" class="orc-grid" novalidate>
                <label class="orc-field wide" data-key="description"><span>Specimen *</span><input name="description" maxlength="255" placeholder="e.g. Gallbladder"><span class="orc-err"></span></label>
                <label class="orc-field" data-key="specimen_type"><span>Type *</span><select name="specimen_type"><option value="">Choose…</option>${d.options.specimen_types.map((t) => `<option>${esc(t)}</option>`).join("")}</select><span class="orc-err"></span></label>
                <label class="orc-field"><span>Body site</span><input name="body_site" maxlength="150"></label>
                <label class="orc-field" data-key="container_count"><span>Containers</span><input type="number" min="1" max="50" name="container_count" value="1"><span class="orc-err"></span></label>
                <label class="orc-field"><span>Sent to</span><input name="sent_to" maxlength="150" placeholder="e.g. Pathology"></label>
                <label class="orc-field" data-key="collected_at"><span>Time</span><input type="datetime-local" name="collected_at" value="${nowInput()}"><span class="orc-err"></span></label>
                <label class="orc-field wide"><span>Notes</span><input name="notes" maxlength="500"></label>
                <div class="orc-field wide"><div class="orc-actions"><button type="submit" class="orc-btn primary">Record specimen</button><div class="orc-alert" id="orcSpecAlert" style="flex:1;"></div></div></div>
            </form>` : `<div class="orc-alert info">Specimens are recorded once the patient is in the room.</div>`}`;
    $("orcSpec")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = { case_id: state.id };
        e.target.querySelectorAll("input, select").forEach((i) => { data[i.name] = i.value; });
        const res = await addOrSpecimen(data);
        showErrors(e.target, res, $("orcSpecAlert"));
        if (res?.success) {
            showToast(res.message, "success");
            await reload();
        }
    });
    body.querySelectorAll("[data-rm-spec]").forEach((b) => b.addEventListener("click", async () => {
        const res = await removeOrSpecimen(Number(b.dataset.rmSpec));
        showToast(res?.message || "Couldn't remove it.", res?.success ? "success" : "error");
        if (res?.success) await reload();
    }));
}

/* ---------------------------------------------------------------
 * Timeline
 * ------------------------------------------------------------- */

const ACTIONS = { booked: "Booked", rescheduled: "Moved", team_changed: "Team changed", cancelled: "Cancelled", stage: "Stage", stage_undone: "Stage undone", checklist: "Checklist", delay: "Delay reason",
    released: "Released from recovery", report_signed: "Operative report signed", report_addendum: "Addendum to the operative report",
    charged: "Charged", charge_voided: "Charge voided" };

function renderHistory(body) {
    const d = state.data;
    const line = (h) => {
        const x = h.details || {};
        let what = "";
        if (h.action === "stage") what = `${STAGE_SHORT[x.from] || x.from || ""} → ${STAGE_SHORT[x.to] || x.to || ""}${x.at ? ` (at ${fmtTime(x.at)}, recorded late)` : ""}${x.turnover_minutes != null ? ` · room cleaning took ${x.turnover_minutes} min` : ""}`;
        if (h.action === "stage_undone") what = `${STAGE_SHORT[x.from] || x.from || ""} taken back to ${STAGE_SHORT[x.to] || x.to || ""}`;
        if (h.action === "checklist") what = `${x.label || x.phase || ""} done${x.late ? " (recorded late)" : ""}`;
        if (h.action === "booked") what = `${fmtDate(x.date)} ${fmtTimeOfDay(x.start)}, ${x.suite || ""}`;
        if (h.action === "charged") what = `${x.lines} line${x.lines === 1 ? "" : "s"}, ${peso(x.net)}${x.discount ? ` (${x.discount} discount)` : ""}`;
        if (h.action === "charge_voided") what = `${x.description || ""}${x.net != null ? `, ${peso(x.net)}` : ""}`;
        if (h.action === "released") what = `${x.disposition || ""}${(x.unmet || []).length ? ` — criteria not met: ${x.unmet.join(", ")}` : ""}`;
        if (h.action === "rescheduled") what = `to ${fmtDate(x.to?.date)} ${fmtTimeOfDay(x.to?.start)} ${x.to?.suite || ""}`;
        return `<div class="${esc(h.action)}"><strong>${esc(ACTIONS[h.action] || h.action)}</strong> ${esc(what)}
            ${h.reason ? `<span class="orc-sub">${h.action === "delay" ? "" : "Reason: "}${esc(h.reason)}</span>` : ""}
            <span class="orc-sub">${esc(h.user_name || "")} · ${esc(fmtDate(h.created_at))} ${esc(fmtTime(h.created_at))}</span></div>`;
    };
    body.innerHTML = `<div class="orc-hist">${d.history.length ? d.history.map(line).join("") : `<span class="orc-note">Nothing recorded yet.</span>`}</div>`;
}

/* ---------------------------------------------------------------
 * Recovery (PACU): readings, release criteria, release
 * ------------------------------------------------------------- */

function renderRecovery(body) {
    const d = state.data;
    const po = d.postop;
    const c = d.case;
    const obs = po.observations;
    const unmet = po.criteria.filter((x) => !x.met);
    const before = !["In PACU", "Transferred / Discharged"].includes(c.perioperative_stage);
    const opts = po.release_options;
    const bedGroups = {};
    (opts?.beds || []).forEach((b) => { (bedGroups[`${b.ward_name}${b.ward_type === "ICU" && !/ICU/.test(b.ward_name) ? " (ICU)" : ""}`] ||= []).push(b); });
    const r = po.release;

    const releasedBox = r ? `<div class="orc-alert info"><strong>Released ${esc(fmtDate(r.at))} ${esc(fmtTime(r.at))}</strong>${r.by_name ? ` by ${esc(r.by_name)}` : ""}: ${esc(r.disposition || "")}
        ${r.admission ? `<br>Admission ${esc(r.admission.admission_number)} — ${esc(r.admission.ward_name)}, bed ${esc(r.admission.bed_number)} (${esc(r.admission.status)})` : ""}
        ${r.override_reason ? `<br>Released with criteria not met: ${esc(r.override_reason)}` : ""}${r.notes ? `<br>Notes: ${esc(r.notes)}` : ""}
        ${r.history_added ? "<br>Added to the patient's surgical history." : ""}</div>` : "";

    const readings = obs.length ? `<div class="orc-table-wrap"><table class="orc-table"><thead><tr><th>Time</th><th>Aldrete</th><th>Pain</th><th>Nausea</th><th>HR</th><th>BP</th><th>SpO₂</th><th>RR</th><th>Temp</th><th>Note</th><th>By</th><th></th></tr></thead><tbody>
        ${[...obs].reverse().map((o) => `<tr><td>${esc(fmtTime(o.recorded_at))}</td>
            <td>${o.aldrete_total != null ? `<strong>${o.aldrete_total}</strong>/10` : ""}</td><td>${o.pain_score != null ? `${o.pain_score}/10` : ""}</td>
            <td>${o.nausea == null ? "" : o.nausea ? "Yes" : "No"}</td><td>${esc(num(o.heart_rate))}</td>
            <td>${o.bp_systolic != null || o.bp_diastolic != null ? `${esc(num(o.bp_systolic))}/${esc(num(o.bp_diastolic))}` : ""}</td><td>${esc(num(o.spo2))}</td>
            <td>${esc(num(o.resp_rate))}</td><td>${esc(num(o.temperature))}</td><td>${esc(o.notes || "")}</td><td>${esc(o.recorded_by || "")}</td>
            <td>${po.can_observe ? `<button type="button" class="x" data-rm-pacu="${o.id}">Remove</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`
        : `<div class="orc-empty">No recovery readings yet.</div>`;

    const vitalFields = [["heart_rate", "HR (/min)"], ["bp_systolic", "BP systolic"], ["bp_diastolic", "BP diastolic"], ["spo2", "SpO₂ (%)"], ["resp_rate", "RR (/min)"], ["temperature", "Temp (°C)"]];
    const readingForm = po.can_observe ? `<form id="orcPacu" class="orc-card" novalidate><div class="orc-card-body">
        <div class="orc-grid">
            <label class="orc-field" data-key="recorded_at"><span>Time</span><input type="datetime-local" name="recorded_at" value="${nowInput()}"><span class="orc-err"></span></label>
            <label class="orc-field" data-key="pain_score"><span>Pain (0–10)</span><select name="pain_score"><option value="">—</option>${Array.from({ length: 11 }, (_, i) => `<option>${i}</option>`).join("")}</select><span class="orc-err"></span></label>
            <label class="orc-field" data-key="nausea"><span>Nausea / vomiting</span><select name="nausea"><option value="">—</option><option value="0">No</option><option value="1">Yes</option></select></label>
            ${vitalFields.map(([k, l]) => `<label class="orc-field" data-key="${k}"><span>${l}</span><input type="number" step="${k === "temperature" ? "0.1" : "1"}" name="${k}"><span class="orc-err"></span></label>`).join("")}
        </div>
        <div class="orc-item" data-key="aldrete"><span class="orc-q">Modified Aldrete score <span class="orc-total" id="orcAldTotal">–</span><span class="orc-note"> / 10 · ${po.thresholds.aldrete} or more to release</span></span>
            <div class="orc-ald">${Object.entries(po.aldrete).map(([k, a]) => `<span>${esc(a.label)}</span>
                <div class="orc-opts">${Object.entries(a.options).sort((x, y) => y[0] - x[0]).map(([v, l]) => `<label title="${esc(l)}"><input type="radio" name="ald_${k}" value="${v}"> ${v} · ${esc(l)}</label>`).join("")}</div>`).join("")}</div>
            <span class="orc-err"></span></div>
        <label class="orc-field"><span>Note</span><input name="notes" maxlength="255"></label>
        <div class="orc-actions"><button type="submit" class="orc-btn primary">Add reading</button><div class="orc-alert" id="orcPacuAlert" style="flex:1;"></div></div>
    </div></form>` : "";

    const releaseForm = po.can_release ? `
        <div class="orc-section" id="orcRelease">Release from recovery</div>
        <form id="orcRel" class="orc-card" novalidate><div class="orc-card-body">
            <div class="orc-alert" id="orcRelAlert"></div>
            <div class="orc-seg" role="group" aria-label="Destination"><button type="button" data-dest="bed" class="active">Ward / ICU bed</button><button type="button" data-dest="home">Home</button><button type="button" data-dest="facility">Another facility</button></div>
            <div data-for="bed">
                ${opts.open_admission ? `<p class="orc-note" style="margin:0 0 6px;">Admission ${esc(opts.open_admission.admission_number)} is open (${esc(opts.open_admission.ward_name)}, bed ${esc(opts.open_admission.bed_number)}). It moves to the bed chosen.</p>`
                    : `<p class="orc-note" style="margin:0 0 6px;">A new admission is made in Inpatient Admissions (source: Post-Op PACU).</p>`}
                <label class="orc-field" data-key="bed_id"><span>Bed *</span><select name="bed_id"><option value="">Choose a bed…</option>
                    ${opts.open_admission ? `<option value="${opts.open_admission.bed_id}">Keep current bed — ${esc(opts.open_admission.bed_number)} (${esc(opts.open_admission.ward_name)})</option>` : ""}
                    ${Object.entries(bedGroups).map(([w, beds]) => `<optgroup label="${esc(w)}">${beds.map((b) => `<option value="${b.id}">${esc(b.bed_number)} · room ${esc(b.room_number)} · ${esc(b.bed_type)}${b.gender_restriction !== "All" ? ` · ${esc(b.gender_restriction)}` : ""}</option>`).join("")}</optgroup>`).join("")}
                </select><span class="orc-err"></span></label>
                ${opts.beds.length ? "" : `<p class="orc-note">No beds are available. Free a bed under Room &amp; Bed Management.</p>`}
            </div>
            <label class="orc-field" data-key="facility" data-for="facility" hidden><span>Facility *</span><input name="facility" maxlength="80"><span class="orc-err"></span></label>
            ${unmet.length ? `<label class="orc-field" data-key="override_reason"><span>Criteria not met (${esc(unmet.map((x) => x.label).join("; "))}) — reason to release anyway *</span>
                <textarea name="override_reason" maxlength="255" placeholder="e.g. Anesthesiologist reviewed; to ICU for monitoring"></textarea><span class="orc-err"></span></label>` : ""}
            <label class="orc-field"><span>Notes</span><input name="notes" maxlength="500"></label>
            <div class="orc-actions"><button type="submit" class="orc-btn go">Release patient</button>
                <span class="orc-note">The case is closed as Transferred / Discharged and added to the surgical history.</span></div>
        </div></form>` : "";

    body.innerHTML = before ? `<div class="orc-alert info">Recovery starts when the patient leaves the room (Out of room).</div>` : `${releasedBox}
        <div class="orc-section">Release criteria</div>
        <ul class="orc-criteria">${po.criteria.map((x) => `<li class="${x.met ? "met" : ""}"><span><b>${esc(x.label)}</b><span class="orc-note">${esc(x.detail)}</span></span></li>`).join("")}</ul>
        <div class="orc-section">Recovery readings</div>
        ${readings}${readingForm}${releaseForm}`;

    const pacu = $("orcPacu");
    if (pacu) {
        const total = () => {
            const vals = Object.keys(po.aldrete).map((k) => pacu.querySelector(`input[name="ald_${k}"]:checked`)?.value);
            const el = $("orcAldTotal");
            if (vals.every((v) => v != null)) {
                const t = vals.reduce((a, v) => a + Number(v), 0);
                el.textContent = t;
                el.className = `orc-total ${t >= po.thresholds.aldrete ? "good" : "low"}`;
            } else {
                el.textContent = vals.some((v) => v != null) ? "…" : "–";
                el.className = "orc-total";
            }
        };
        pacu.addEventListener("change", total);
        pacu.addEventListener("submit", async (e) => {
            e.preventDefault();
            const data = { case_id: c.id, aldrete: {} };
            pacu.querySelectorAll("input:not([type=radio]), select").forEach((i) => { data[i.name] = i.value; });
            Object.keys(po.aldrete).forEach((k) => { data.aldrete[k] = pacu.querySelector(`input[name="ald_${k}"]:checked`)?.value ?? ""; });
            const res = await addOrPacu(data);
            showErrors(pacu, res, $("orcPacuAlert"));
            if (res?.success) {
                showToast(res.message, "success");
                changed();
                await reload();
            }
        });
    }
    body.querySelectorAll("[data-rm-pacu]").forEach((b) => b.addEventListener("click", async () => {
        const res = await removeOrPacu(Number(b.dataset.rmPacu));
        showToast(res?.message || "Couldn't remove it.", res?.success ? "success" : "error");
        if (res?.success) await reload();
    }));

    const rel = $("orcRel");
    if (rel) {
        let dest = "bed";
        rel.querySelectorAll("[data-dest]").forEach((b) => b.addEventListener("click", () => {
            dest = b.dataset.dest;
            rel.querySelectorAll("[data-dest]").forEach((x) => x.classList.toggle("active", x === b));
            rel.querySelectorAll("[data-for]").forEach((x) => { x.hidden = x.dataset.for !== dest; });
        }));
        rel.addEventListener("submit", async (e) => {
            e.preventDefault();
            const v = (n) => rel.querySelector(`[name="${n}"]`)?.value ?? "";
            const btn = rel.querySelector("button[type=submit]");
            btn.disabled = true;
            const res = await releaseOrCase({ id: c.id, destination: dest, bed_id: v("bed_id"), facility: v("facility"), override_reason: v("override_reason"), notes: v("notes") });
            btn.disabled = false;
            showErrors(rel, res, $("orcRelAlert"));
            if (!res?.success) return;
            showToast(res.message, "success", 6000);
            changed();
            await reload("report");
        });
    }
}

/* ---------------------------------------------------------------
 * Operative report
 * ------------------------------------------------------------- */

const REPORT_FIELDS = [
    ["preop_diagnosis", "Pre-op diagnosis", "input", false],
    ["postop_diagnosis", "Post-op diagnosis", "input", true],
    ["procedure_performed", "Procedure performed", "input", true],
    ["indications", "Indications", "textarea", false],
    ["findings", "Findings", "textarea", true],
    ["technique", "Description of the procedure", "textarea", true],
    ["drains", "Drains / closure", "input", false],
    ["postop_plan", "Post-op plan / orders", "textarea", false]
];

function renderReport(body) {
    const d = state.data;
    const rep = d.postop.report;
    const f = rep.fields;
    const me = getUser() || {};
    const isSurgeon = rep.surgeon_user_ids.includes(Number(me.id));
    const signed = rep.status === "signed";
    const canAddendum = signed && (isSurgeon || me.role === "admin");
    const isDoctor = ["doctor", "admin"].includes(me.role);
    const header = `<div class="orc-actions" style="margin-bottom:10px;">
        <span class="orc-pill ${signed ? "ok" : rep.exists ? "warn" : ""}">${signed ? "Signed" : rep.exists ? "Draft" : "Not started"}</span>
        <span class="orc-note">${signed ? `Signed by ${esc(rep.signed_by_name || "")} ${esc(fmtDate(rep.signed_at))} ${esc(fmtTime(rep.signed_at))}`
            : rep.updated_at ? `Last saved by ${esc(rep.updated_by_name || "")} ${esc(fmtTime(rep.updated_at))}` : ""}</span>
        <span class="spacer"></span>
        ${rep.exists ? `<button type="button" class="orc-btn small" id="orcPrintReport">Print</button>` : ""}</div>`;

    if (signed) {
        body.innerHTML = `${header}<div class="orc-report-view">
            ${REPORT_FIELDS.filter(([k]) => f[k]).map(([k, label]) => `<h4>${esc(label)}</h4><p>${esc(f[k])}</p>`).join("")}
            <h4>Complications</h4><p>${f.complications_none ? "None" : esc(f.complications || "")}</p>
            <h4>Condition at the end of surgery</h4><p>${esc(f.condition_at_end || "")}</p></div>
            <div class="orc-section">Addenda</div>
            <div class="orc-addenda">${rep.addenda.length ? rep.addenda.map((a) => `<div>${esc(a.body)}<span class="orc-sub">${esc(a.by_name || "")} · ${esc(fmtDate(a.created_at))} ${esc(fmtTime(a.created_at))}</span></div>`).join("") : `<span class="orc-note">None.</span>`}</div>
            ${canAddendum ? `<form id="orcAdd" class="orc-grid" novalidate><label class="orc-field wide" data-key="body"><span>Add an addendum</span><textarea name="body" maxlength="5000"></textarea><span class="orc-err"></span></label>
                <div class="orc-field wide"><div class="orc-actions"><button type="submit" class="orc-btn primary">Add addendum</button><div class="orc-alert" id="orcAddAlert" style="flex:1;"></div></div></div></form>` : ""}`;
    } else if (!rep.can_edit) {
        body.innerHTML = `${header}<div class="orc-alert info">${d.case.perioperative_stage === "Cancelled" ? "The case was cancelled." : "The operative report is written from closing on."}</div>`;
    } else if (!isDoctor) {
        body.innerHTML = `${header}<div class="orc-alert info">The operative report is written by the surgical team (doctors).</div>`;
    } else {
        body.innerHTML = `${header}
            <form id="orcReport" class="orc-grid" novalidate>
                <div class="orc-alert" id="orcReportAlert" style="grid-column:1/-1;"></div>
                ${REPORT_FIELDS.map(([k, label, type, req]) => `<label class="orc-field ${type === "textarea" ? "wide" : ""}" data-key="${k}"><span>${esc(label)}${req ? " *" : ""}</span>
                    ${type === "textarea" ? `<textarea name="${k}" rows="${k === "technique" ? 7 : 3}">${esc(f[k] || "")}</textarea>` : `<input name="${k}" maxlength="500" value="${esc(f[k] || "")}">`}<span class="orc-err"></span></label>`).join("")}
                <div class="orc-field wide" data-key="complications"><span>Complications *</span>
                    <label class="orc-chk"><input type="checkbox" name="complications_none" ${f.complications_none ? "checked" : ""}> <span>None</span></label>
                    <textarea name="complications" rows="2" ${f.complications_none ? "hidden" : ""}>${esc(f.complications || "")}</textarea><span class="orc-err"></span></div>
                <label class="orc-field" data-key="condition_at_end"><span>Condition at the end *</span><select name="condition_at_end"><option value="">Choose…</option>
                    ${d.postop.conditions.map((x) => `<option ${x === f.condition_at_end ? "selected" : ""}>${esc(x)}</option>`).join("")}</select><span class="orc-err"></span></label>
                <div class="orc-field wide"><span class="orc-note">The printout also lists the team, the times, blood loss, implants (with lot numbers) and specimens from the case record.</span></div>
                <div class="orc-field wide"><div class="orc-actions">
                    <button type="button" class="orc-btn" id="orcReportSave">Save draft</button>
                    ${isSurgeon ? `<button type="button" class="orc-btn go" id="orcReportSign">Sign report</button>` : `<span class="orc-note">Only the case's surgeon (${esc(d.case.lead_surgeon)}${d.case.assistant_surgeon ? ` or ${esc(d.case.assistant_surgeon)}` : ""}) can sign it.</span>`}
                    <span class="orc-note">Once signed it can't be changed; corrections become addenda.</span></div></div>
            </form>`;
        const form = $("orcReport");
        form.querySelector('[name="complications_none"]').addEventListener("change", (e) => { form.querySelector('[name="complications"]').hidden = e.target.checked; });
        const collect = () => {
            const data = { id: d.case.id, revision: rep.revision };
            form.querySelectorAll("input:not([type=checkbox]), textarea, select").forEach((i) => { data[i.name] = i.value; });
            data.complications_none = form.querySelector('[name="complications_none"]').checked ? 1 : 0;
            return data;
        };
        const submit = async (fn, btn) => {
            btn.disabled = true;
            const res = await fn(collect());
            btn.disabled = false;
            if (res?.success) {
                showToast(res.message, "success");
                changed();
                await reload("report");
                return;
            }
            // A failed sign still saved the draft: reload (new revision), then show what's missing.
            if (/saved as a draft/.test(res?.message || "")) await reload("report");
            const form2 = $("orcReport");
            if (form2) showErrors(form2, res, $("orcReportAlert"));
        };
        $("orcReportSave").addEventListener("click", (e) => submit(saveOrReport, e.currentTarget));
        $("orcReportSign")?.addEventListener("click", (e) => submit(signOrReport, e.currentTarget));
    }

    $("orcPrintReport")?.addEventListener("click", () => printOperativeReport(d.case.id));
    $("orcAdd")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const res = await addOrAddendum(d.case.id, e.target.querySelector('[name="body"]').value);
        showErrors(e.target, res, $("orcAddAlert"));
        if (res?.success) {
            showToast(res.message, "success");
            await reload("report");
        }
    });
}

export async function printOperativeReport(caseId) {
    // Open the window first, while the click still counts, so pop-up blockers allow it.
    const win = window.open("", "_blank", "width=860,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write("<p style=\"font-family:Arial;padding:20px;\">Preparing the operative report...</p>");
    const res = await fetchOrReportPrint(caseId);
    if (!res?.success) {
        win.close();
        showToast(res?.message || "Couldn't load the report to print.", "error");
        return;
    }
    win.document.open();
    win.document.write(operativeReportHtml(res.data));
    win.document.close();
}

export function operativeReportHtml(data) {
    const b = data.business || {};
    const c = data.case;
    const r = data.report;
    const f = r.fields;
    const signed = r.status === "signed";
    const dt = (s) => (s ? `${fmtDate(s)} ${fmtTime(s)}` : "—");
    const tm = (s) => (s ? fmtTime(s) : "—");
    const contacts = [b.phone ? `Tel. ${b.phone}` : null, b.email].filter(Boolean).join("  ·  ");
    const cell = (label, value) => `<div class="c"><span>${esc(label)}</span><b>${value ? esc(value) : "&nbsp;"}</b></div>`;
    const section = (label, text) => (text ? `<h3>${esc(label)}</h3><p>${esc(text)}</p>` : "");
    const minutes = (a, z) => (a && z ? fmtMin((parseDT(z) - parseDT(a)) / 60000) : "—");

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Operative report ${esc(c.case_number)} - ${esc(c.patient_name)}</title>
<style>
    /* No page margin: the browser leaves out its own date / title / URL lines. */
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 14mm 15mm 12mm; }
    .head { display: flex; align-items: center; justify-content: center; gap: 12px; text-align: center; }
    .head img { height: 60px; width: auto; max-width: 100px; object-fit: contain; }
    .head h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: .5px; }
    .head .sub { font-size: 11px; color: #374151; margin-top: 2px; }
    .rule { border: 0; border-top: 2.5px solid #111827; margin: 8px 0 0; }
    h2 { text-align: center; margin: 10px 0 4px; font-size: 15px; letter-spacing: 1px; }
    .ref { text-align: center; font-size: 11px; color: #374151; margin-bottom: 10px; }
    .draft { border: 2px solid #b45309; color: #92400e; text-align: center; font-weight: 700; padding: 5px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #9ca3af; border-bottom: 0; border-right: 0; }
    .grid.three { grid-template-columns: repeat(3, 1fr); }
    .c { border-right: 1px solid #9ca3af; border-bottom: 1px solid #9ca3af; padding: 4px 6px; min-width: 0; }
    .c span { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .4px; color: #4b5563; }
    .c b { font-size: 11.5px; font-weight: 600; }
    h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; margin: 12px 0 3px; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; }
    p { margin: 0; white-space: pre-wrap; line-height: 1.45; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d1d5db; padding: 3px 5px; text-align: left; }
    th { background: #f3f4f6; font-size: 9.5px; text-transform: uppercase; }
    .sign { margin: 26px 0 0 auto; width: 55%; text-align: center; font-size: 11px; }
    .sign .line { border-top: 1px solid #111827; padding-top: 3px; font-weight: 700; font-size: 12.5px; text-transform: uppercase; }
    .add { border-left: 3px solid #6b7280; padding-left: 8px; margin-top: 6px; }
    .foot { margin-top: 14px; border-top: 1px dashed #9ca3af; padding-top: 4px; font-size: 9.5px; color: #4b5563; display: flex; justify-content: space-between; }
    @media screen { body { background: #e5e7eb; } .page { background: #fff; max-width: 210mm; min-height: 297mm; margin: 16px auto; box-shadow: 0 2px 10px rgba(0,0,0,.15); } }
</style></head><body><div class="page">
    <div class="head">
        ${b.logo ? `<img src="${esc(API_URL + b.logo)}" alt="">` : ""}
        <div><h1>${esc(b.name || "")}</h1>${b.address ? `<div class="sub">${esc(b.address)}</div>` : ""}${contacts ? `<div class="sub">${esc(contacts)}</div>` : ""}</div>
    </div>
    <hr class="rule">
    <h2>OPERATIVE REPORT</h2>
    <div class="ref">${esc(c.case_number)} · ${esc(fmtDate(c.scheduled_date))} · ${esc(c.or_suite_name)}</div>
    ${signed ? "" : `<div class="draft">DRAFT — NOT YET SIGNED BY THE SURGEON</div>`}
    <div class="grid">
        ${cell("Patient", c.patient_name)}${cell("Hospital no.", c.patient_mrn)}${cell("Age / sex", [c.patient_age ? `${c.patient_age} yrs` : "", c.gender].filter(Boolean).join(" / "))}${cell("Priority", c.case_priority)}
        ${cell("Surgeon", c.lead_surgeon)}${cell("Assistant", c.assistant_surgeon)}${cell("Anesthesiologist", c.anesthesiologist)}${cell("Anesthesia", c.anesthesia_type)}
        ${cell("Scrub nurse", c.scrub_nurse)}${cell("Circulating nurse", c.circulating_nurse)}${cell("Specialization", c.surgical_specialty)}${cell("Side", c.laterality)}
    </div>
    <div class="grid three" style="margin-top:6px;">
        ${cell("In room – out of room", `${tm(c.actual_in_room_time)} – ${tm(c.actual_out_room_time)}`)}
        ${cell("Incision – closing", `${tm(c.actual_incision_time)} – ${tm(c.actual_closing_time)} (${minutes(c.actual_incision_time, c.actual_closing_time)})`)}
        ${cell("Anesthesia", `${tm(c.anesthesia_start_time)} – ${tm(c.anesthesia_end_time)}`)}
        ${cell("Estimated blood loss", c.estimated_blood_loss_ml != null ? `${c.estimated_blood_loss_ml} mL` : "—")}
        ${cell("Urine output", c.urine_output_ml != null ? `${c.urine_output_ml} mL` : "—")}
        ${cell("Condition at the end", f.condition_at_end)}
    </div>
    ${section("Pre-operative diagnosis", f.preop_diagnosis)}
    ${section("Post-operative diagnosis", f.postop_diagnosis)}
    ${section("Procedure performed", f.procedure_performed)}
    ${section("Indications", f.indications)}
    ${section("Findings", f.findings)}
    ${section("Description of the procedure", f.technique)}
    <h3>Complications</h3><p>${f.complications_none ? "None" : esc(f.complications || "")}</p>
    ${section("Drains / closure", f.drains)}
    ${data.implants.length ? `<h3>Implants</h3><table><thead><tr><th>Implant</th><th>Lot no.</th><th>Serial no.</th><th>Manufacturer</th><th>Site</th></tr></thead><tbody>
        ${data.implants.map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.lot_number || "")}</td><td>${esc(i.serial_number || "")}</td><td>${esc(i.manufacturer || "")}</td><td>${esc(i.body_site || "")}</td></tr>`).join("")}</tbody></table>` : ""}
    ${data.specimens.length ? `<h3>Specimens</h3><table><thead><tr><th>Specimen</th><th>Type</th><th>Sent to</th></tr></thead><tbody>
        ${data.specimens.map((s) => `<tr><td>${esc(s.description)}</td><td>${esc(s.specimen_type)}</td><td>${esc(s.sent_to || "")}</td></tr>`).join("")}</tbody></table>` : ""}
    ${section("Post-operative plan", f.postop_plan)}
    <div class="sign">
        <div class="line">${esc(signed ? r.signed_by_name || c.lead_surgeon : c.lead_surgeon)}</div>
        <div>Surgeon${data.surgeon.license_number ? ` · Lic. No. ${esc(data.surgeon.license_number)}` : ""}${data.surgeon.ptr_number ? ` · PTR No. ${esc(data.surgeon.ptr_number)}` : ""}</div>
        <div>${signed ? `Signed electronically ${esc(dt(r.signed_at))}` : "Not signed"}</div>
    </div>
    ${r.addenda.length ? `<h3>Addenda</h3>${r.addenda.map((a) => `<div class="add"><p>${esc(a.body)}</p><div style="font-size:10px;color:#4b5563;">${esc(a.by_name || "")} · ${esc(dt(a.created_at))}</div></div>`).join("")}` : ""}
    <div class="foot"><span>${esc(c.case_number)} · ${esc(c.patient_name)}</span><span>Printed ${esc(dt(nowInput().replace("T", " ")))}</span></div>
</div><script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`;
}

/* ---------------------------------------------------------------
 * Charges (Phase 6): posted to the patient ledger
 * ------------------------------------------------------------- */

const peso = (v) => `₱${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function renderCharges(body) {
    const d = state.data;
    const ch = d.charges;
    const live = ch.charges.filter((c) => c.status === "charged");
    const posted = ch.charges.length ? `<div class="orc-table-wrap"><table class="orc-table"><thead><tr><th>Type</th><th>Description</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Discount</th><th class="r">Net</th><th>Posted</th><th></th></tr></thead><tbody>
        ${ch.charges.map((c) => `<tr class="${c.status === "voided" ? "voided" : ""}"><td>${esc(c.type_label)}</td>
            <td class="name">${esc(c.description)}${c.status === "voided" ? `<span class="orc-sub">Voided by ${esc(c.voided_by_name || "")}: ${esc(c.void_reason || "")}</span>` : ""}</td>
            <td class="r">${esc(qty(c.quantity))}</td><td class="r">${peso(c.unit_price)}</td><td class="r">${c.discount_amount ? `−${peso(c.discount_amount)}` : ""}</td>
            <td class="r"><strong>${peso(c.net_amount)}</strong></td><td>${esc(fmtDate(c.charge_date))}<span class="orc-sub">${esc(c.posted_by || "")}</span></td>
            <td>${c.status === "charged" ? `<button type="button" class="x" data-void-charge="${c.id}">Void</button>` : ""}</td></tr>`).join("")}
        <tr><td colspan="4" class="r"><strong>Total charged</strong></td><td class="r">${ch.totals.discount ? `−${peso(ch.totals.discount)}` : ""}</td><td class="r"><strong>${peso(ch.totals.net)}</strong></td><td colspan="2"></td></tr>
        </tbody></table></div>` : `<div class="orc-empty">Nothing charged yet.</div>`;
    const ph = ch.philhealth ? `<div class="orc-alert info">PhilHealth case rate${ch.philhealth.code ? ` ${esc(ch.philhealth.code)}` : ""}${ch.philhealth.amount != null ? ` — ${peso(ch.philhealth.amount)}` : ""}: recorded only, not deducted from the bill yet.</div>` : "";
    const disc = ch.discount;

    body.innerHTML = `
        <div class="orc-actions" style="margin-bottom:10px;"><span class="orc-pill ${ch.billing_status === "billed" ? "ok" : ""}">${ch.billing_status === "billed" ? "Billed" : "Not billed"}</span>
            <span class="orc-note">Charges go to the patient's ledger (type "Surgery"), where payments are recorded.</span></div>
        ${ph}
        <div class="orc-section">Charged</div>
        ${posted}
        ${!ch.can_bill ? `<div class="orc-alert info" style="margin-top:10px;">${esc(ch.blocked_reason || "")}</div>` : `
        <div class="orc-section" style="margin-top:6px;">To charge</div>
        <form id="orcCharge" novalidate class="orc-card"><div class="orc-card-body">
            <div class="orc-alert" id="orcChargeAlert"></div>
            <div class="orc-table-wrap"><table class="orc-table" id="orcChargeLines"><thead><tr><th></th><th>Type</th><th>Description</th><th class="r">Qty</th><th class="r">Price (₱)</th><th class="r">Amount</th></tr></thead><tbody>
                ${ch.pending.map((l, n) => chargeRow(l, n)).join("")}
            </tbody></table></div>
            <div><button type="button" class="orc-btn small" id="orcChargeAdd">+ Another charge</button>
                <span class="orc-note">Lines with no price aren't charged now; they stay here for later.</span></div>
            ${disc ? `<div class="orc-note">Discount for this case: <strong>${esc(ch.discounts[disc.type]?.label || disc.type)} ${esc(String(disc.rate))}%</strong>${disc.id_no ? ` (ID ${esc(disc.id_no)})` : ""} — applied to these lines too.</div>`
                : `<div class="orc-grid">
                    <label class="orc-field" data-key="discount_type"><span>Discount</span><select name="discount_type"><option value="">None</option>
                        ${Object.entries(ch.discounts).map(([k, x]) => `<option value="${esc(k)}">${esc(x.label)}${x.rate ? ` (${x.rate}%)` : ""}</option>`).join("")}</select><span class="orc-err"></span></label>
                    <label class="orc-field" data-key="discount_id_no" data-disc="id" hidden><span>ID number *</span><input name="discount_id_no" maxlength="50"><span class="orc-err"></span></label>
                    <label class="orc-field" data-key="discount_rate" data-disc="other" hidden><span>Discount % *</span><input name="discount_rate" type="number" min="0" max="100" step="0.01"><span class="orc-err"></span></label>
                    <label class="orc-field" data-key="discount_reason" data-disc="other" hidden><span>Reason *</span><input name="discount_reason" maxlength="255"><span class="orc-err"></span></label>
                </div>`}
            <div class="orc-actions"><button type="submit" class="orc-btn primary">Post charges</button><span class="orc-note" id="orcChargeTotal"></span></div>
        </div></form>`}`;

    body.querySelectorAll("[data-void-charge]").forEach((b) => b.addEventListener("click", () => {
        const c = ch.charges.find((x) => x.id === Number(b.dataset.voidCharge));
        reasonDialog({
            title: "Void this charge?", intro: `${esc(c.description)} — ${peso(c.net_amount)}. It comes off the patient's ledger (kept, marked voided). If it was paid, refund it in the ledger.`,
            label: "Reason", placeholder: "e.g. Wrong amount", okLabel: "Void charge", okClass: "danger",
            onOk: (reason) => voidOrCharge(c.id, reason)
        });
    }));

    const form = $("orcCharge");
    if (!form) return;
    const lines = $("orcChargeLines").querySelector("tbody");
    let extra = ch.pending.length;
    const total = () => {
        let sum = 0;
        lines.querySelectorAll("tr").forEach((tr) => {
            const on = tr.querySelector("[data-on]").checked;
            const amount = (Number(tr.querySelector("[data-q]").value) || 0) * (Number(tr.querySelector("[data-p]").value) || 0);
            tr.querySelector("[data-amt]").textContent = tr.querySelector("[data-p]").value === "" ? "" : peso(amount);
            if (on && tr.querySelector("[data-p]").value !== "") sum += amount;
        });
        const rate = disc ? disc.rate : { senior: 20, pwd: 20 }[form.querySelector('[name="discount_type"]')?.value] ?? Number(form.querySelector('[name="discount_rate"]')?.value || 0);
        $("orcChargeTotal").textContent = `To post: ${peso(sum)}${rate ? ` less ${rate}% = ${peso(sum * (1 - rate / 100))}` : ""}`;
    };
    form.addEventListener("input", total);
    form.addEventListener("change", (e) => {
        if (e.target.name === "discount_type") {
            const t = e.target.value;
            form.querySelectorAll("[data-disc]").forEach((el) => { el.hidden = !((el.dataset.disc === "id" && (t === "senior" || t === "pwd")) || (el.dataset.disc === "other" && t === "other")); });
        }
        total();
    });
    $("orcChargeAdd").addEventListener("click", () => {
        lines.insertAdjacentHTML("beforeend", chargeRow({ charge_type: "other", type_label: "Other", description: "", quantity: 1, unit_price: null, item_id: null }, extra++, true));
        lines.lastElementChild.querySelector("[data-desc]").focus();
    });
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = { id: d.case.id, lines: [] };
        lines.querySelectorAll("tr").forEach((tr) => {
            if (!tr.querySelector("[data-on]").checked) return;
            payload.lines.push({ charge_type: tr.dataset.type, item_id: tr.dataset.item || null, provider_user_id: tr.dataset.provider || null,
                description: tr.querySelector("[data-desc]").value, quantity: tr.querySelector("[data-q]").value, unit_price: tr.querySelector("[data-p]").value });
        });
        ["discount_type", "discount_id_no", "discount_rate", "discount_reason"].forEach((k) => { const el = form.querySelector(`[name="${k}"]`); if (el) payload[k] = el.value; });
        lines.querySelectorAll("tr").forEach((tr) => tr.classList.remove("has-error"));
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        const res = await postOrCharges(payload);
        btn.disabled = false;
        showErrors(form, res, $("orcChargeAlert"));
        if (!res?.success) {
            // Line errors are keyed by their position among the lines sent.
            const sent = [...lines.querySelectorAll("tr")].filter((tr) => tr.querySelector("[data-on]").checked);
            Object.entries(res?.errors || {}).forEach(([k, msg]) => {
                const m = /^lines\.(\d+)$/.exec(k);
                if (m && sent[+m[1]]) {
                    sent[+m[1]].classList.add("has-error");
                    sent[+m[1]].title = msg;
                }
            });
            if (res?.errors) $("orcChargeAlert").textContent = `${res.message} ${Object.values(res.errors).join(" ")}`;
            return;
        }
        showToast(res.message, "success", 6000);
        changed();
        await reload("charges");
    });
    total();
}

function chargeRow(l, n, editable = false) {
    return `<tr data-type="${esc(l.charge_type)}" data-item="${l.item_id ?? ""}" data-provider="${l.provider_user_id ?? ""}">
        <td><input type="checkbox" data-on checked aria-label="Charge this line"></td>
        <td>${esc(l.type_label)}</td>
        <td><input data-desc maxlength="255" value="${esc(l.description)}" ${editable ? 'placeholder="What is charged"' : ""} style="width:100%;min-width:180px;height:30px;border:1px solid var(--border-color);border-radius:6px;padding:0 8px;background:var(--bg-surface);color:var(--text-primary);"></td>
        <td class="r"><input data-q type="number" min="0" step="any" value="${esc(qty(l.quantity))}" style="width:70px;height:30px;border:1px solid var(--border-color);border-radius:6px;padding:0 6px;text-align:right;background:var(--bg-surface);color:var(--text-primary);"></td>
        <td class="r"><input data-p type="number" min="0" step="0.01" value="${l.unit_price != null ? esc(String(l.unit_price)) : ""}" placeholder="—" style="width:110px;height:30px;border:1px solid var(--border-color);border-radius:6px;padding:0 6px;text-align:right;background:var(--bg-surface);color:var(--text-primary);"></td>
        <td class="r" data-amt></td></tr>`;
}
