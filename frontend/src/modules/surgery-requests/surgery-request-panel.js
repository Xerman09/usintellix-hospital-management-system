/**
 * Surgery request dialogs, shared by the patient chart (Surgeries widget)
 * and the Surgery Requests worklist:
 *   * openSurgeryRequestForm({ patient, encounterId?, requestId?, onSaved? })
 *   * openSurgeryRequest(id, { onChange? }) -- details + readiness checklist
 * The dialogs live in their own container on <body>.
 */
import {
    fetchSurgeryRequest, fetchSurgeryRequestOptions, saveSurgeryRequest, saveSurgeryRequestCheck,
    readySurgeryRequestNow, cancelSurgeryRequest, searchIcd10
} from "./surgery-requests.service.js?v=1";
import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";

const REQUEST_ROLES = ["admin", "doctor"];
const SPEC_GROUPS = [["surgical", "Surgical"], ["anesthesiology", "Anesthesiology"], ["medical", "Medical"], ["other", "Other"]];
const STYLE = `
<style>
#srRoot [hidden] { display: none !important; }
.sr-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: none; align-items: flex-start; justify-content: center; z-index: 2100; padding: 28px 16px; overflow-y: auto; }
.sr-overlay.open { display: flex; }
.sr-overlay.top { z-index: 2200; }
.sr-modal { background: var(--bg-surface); color: var(--text-primary); border-radius: 12px; width: 100%; max-width: 560px; box-shadow: 0 20px 50px rgba(0,0,0,.3); font-size: 13.5px; }
.sr-modal.wide { max-width: 880px; }
.sr-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.sr-head h2 { margin: 0; font-size: 16px; }
.sr-head .sr-sub { margin-top: 3px; }
.sr-x { background: none; border: none; font-size: 22px; line-height: 1; color: var(--text-muted); cursor: pointer; }
.sr-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.sr-foot { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border-color); }
.sr-foot .left { margin-right: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.sr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.sr-btn:hover { background: var(--bg-surface-alt); }
.sr-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.sr-btn.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
.sr-btn.warn { border-color: #d97706; background: #d97706; color: #fff; }
.sr-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.sr-btn:disabled { opacity: .55; cursor: default; }
.sr-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
.sr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.sr-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; position: relative; }
.sr-field.wide { grid-column: 1 / -1; }
.sr-field > span:first-child { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.sr-field input, .sr-field select, .sr-field textarea { height: 36px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface);
    color: var(--text-primary); font-size: 13px; font-family: inherit; width: 100%; box-sizing: border-box; min-width: 0; }
.sr-field textarea { height: auto; min-height: 60px; padding: 8px 10px; resize: vertical; }
.sr-field.has-error input, .sr-field.has-error select, .sr-field.has-error textarea { border-color: #dc2626; }
.sr-err { font-size: 11.5px; color: #dc2626; }
.sr-err:empty { display: none; }
.sr-hint, .sr-sub { font-size: 11.5px; color: var(--text-muted); }
.sr-alert { padding: 9px 12px; border-radius: 8px; font-size: 12.5px; border: 1px solid #fca5a5; background: #fef2f2; color: #991b1b; }
.sr-banner { padding: 10px 14px; border-radius: 10px; font-size: 12.5px; border: 1px solid; }
.sr-banner.ok { border-color: #86efac; background: #f0fdf4; color: #166534; }
.sr-banner.warn { border-color: #fcd34d; background: #fffbeb; color: #92400e; }
.sr-banner.bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
.sr-icd-list { position: absolute; top: 100%; left: 0; right: 0; z-index: 5; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;
    box-shadow: 0 10px 24px rgba(0,0,0,.18); max-height: 240px; overflow-y: auto; margin-top: 2px; }
.sr-icd-list button { display: block; width: 100%; text-align: left; border: none; background: none; padding: 7px 10px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; font-family: inherit; }
.sr-icd-list button:hover, .sr-icd-list button:focus { background: var(--bg-surface-alt); }
.sr-icd-list b { margin-right: 6px; }
.sr-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: var(--accent-light); color: var(--accent-text, var(--accent)); font-size: 12px; font-weight: 600; }
.sr-chip button { background: none; border: none; color: inherit; cursor: pointer; font-size: 14px; padding: 0; }
.sr-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.sr-badge.requested { background: #e0f2fe; color: #075985; }
.sr-badge.planning { background: #fef3c7; color: #92400e; }
.sr-badge.ready { background: #dcfce7; color: #166534; }
.sr-badge.scheduled { background: #ede9fe; color: #5b21b6; }
.sr-badge.cancelled, .sr-badge.muted { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.sr-badge.emergency { background: #fee2e2; color: #991b1b; }
.sr-badge.urgent { background: #ffedd5; color: #9a3412; }
.sr-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px 16px; }
.sr-facts div > span { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); font-weight: 600; }
.sr-facts div > strong { font-size: 13px; }
.sr-progress { height: 8px; border-radius: 999px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); overflow: hidden; }
.sr-progress span { display: block; height: 100%; background: #16a34a; }
.sr-checks { display: flex; flex-direction: column; border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; }
.sr-check { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
.sr-check:last-child { border-bottom: none; }
.sr-check .ico { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800;
    border: 2px solid var(--border-color); color: var(--text-muted); }
.sr-check.done .ico { background: #16a34a; border-color: #16a34a; color: #fff; }
.sr-check.not_needed .ico { background: var(--bg-surface-alt); color: var(--text-muted); }
.sr-check.pending.required .ico { border-color: #d97706; }
.sr-check .lbl { font-weight: 700; }
.sr-check .acts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.sr-allergy { display: inline-flex; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; background: #fee2e2; color: #991b1b; margin: 2px 4px 2px 0; }
:root[data-theme="dark"] .sr-alert, :root[data-theme="dark"] .sr-banner.bad { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.45); color: #fecaca; }
:root[data-theme="dark"] .sr-banner.ok { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); color: #bbf7d0; }
:root[data-theme="dark"] .sr-banner.warn { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); color: #fde68a; }
:root[data-theme="dark"] .sr-err { color: #fca5a5; }
:root[data-theme="dark"] .sr-badge.requested { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .sr-badge.planning { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .sr-badge.ready { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .sr-badge.scheduled { background: rgba(139,92,246,.22); color: #ddd6fe; }
:root[data-theme="dark"] .sr-badge.emergency, :root[data-theme="dark"] .sr-allergy { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .sr-badge.urgent { background: rgba(249,115,22,.18); color: #fed7aa; }
@media (max-width: 640px) {
    .sr-overlay { padding: 10px 6px; }
    .sr-check { grid-template-columns: 26px minmax(0, 1fr); }
    .sr-check .acts { grid-column: 1 / -1; justify-content: flex-start; }
}
</style>`;

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fmtDateTime = (v) => (v ? `${fmtDate(v)} ${String(v).slice(11, 16)}` : "");

export const priorityBadge = (p) => p === "Emergency / STAT" ? `<span class="sr-badge emergency">Emergency</span>`
    : p === "Urgent" ? `<span class="sr-badge urgent">Urgent</span>` : `<span class="sr-badge muted">Elective</span>`;
export const statusBadge = (r) => `<span class="sr-badge ${esc(r.status)}">${esc(r.status_label || r.status)}</span>`;

/** The dialogs' container and styles (badges included) -- call before showing badges elsewhere. */
export function ensureRoot() {
    if ($("srRoot")) return;
    const root = document.createElement("div");
    root.id = "srRoot";
    root.innerHTML = `${STYLE}
        <div class="sr-overlay" id="srFormOverlay" role="dialog" aria-modal="true" aria-labelledby="srFormTitle"><div class="sr-modal wide" id="srFormModal"></div></div>
        <div class="sr-overlay" id="srDetailOverlay" role="dialog" aria-modal="true" aria-labelledby="srDetailTitle"><div class="sr-modal wide" id="srDetailModal"></div></div>
        <div class="sr-overlay top" id="srDialogOverlay" role="dialog" aria-modal="true" aria-labelledby="srDialogTitle"><div class="sr-modal" id="srDialogModal"></div></div>`;
    document.body.appendChild(root);
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        for (const id of ["srDialogOverlay", "srFormOverlay", "srDetailOverlay"]) {
            if ($(id)?.classList.contains("open")) {
                $(id).classList.remove("open");
                break;
            }
        }
    });
}

const canRequest = () => REQUEST_ROLES.includes(getUser()?.role);

/* ---------------------------------------------------------------
 * Request form (new / edit)
 * ------------------------------------------------------------- */

let form = { options: null, patient: null, request: null, onSaved: null, icdTimer: null };

/**
 * patient: {id, name}; encounterId: the visit it's requested from (optional);
 * requestId: edit that request instead; onSaved(result) after saving.
 */
export async function openSurgeryRequestForm({ patient, encounterId = null, requestId = null, onSaved = null }) {
    ensureRoot();
    if (!canRequest()) {
        showToast("Only doctors can request surgery.", "error");
        return;
    }

    let request = null;
    if (requestId) {
        const r = await fetchSurgeryRequest(requestId);
        if (!r?.success) return showToast(r?.message || "Couldn't open the request.", "error");
        request = r.data;
        patient = { id: request.patient_id, name: request.patient_name };
    }

    const o = await fetchSurgeryRequestOptions(patient.id);
    if (!o?.success) return showToast(o?.message || "Couldn't load the form.", "error");
    form = { options: o.data, patient, request, onSaved, icdTimer: null };

    const opts = o.data;
    const r = request || {};
    $("srFormModal").innerHTML = `
        <div class="sr-head"><div><h2 id="srFormTitle">${request ? `Edit ${esc(request.request_number)}` : "Request surgery"}</h2>
            <div class="sr-sub">${esc(patient.name || "")}</div></div><button type="button" class="sr-x" data-sr-close="srFormOverlay" aria-label="Close">&times;</button></div>
        <form id="srForm" autocomplete="off" novalidate>
            <div class="sr-body">
                <div id="srFormAlert"></div>
                <div class="sr-section">Surgery</div>
                <div class="sr-grid">
                    <label class="sr-field"><span>Specialization *</span><select id="srSpec"></select><span class="sr-err" data-err="specialization_id"></span></label>
                    <label class="sr-field"><span>Surgery *</span><select id="srSurgery"></select><span class="sr-err" data-err="surgery_id"></span></label>
                    <label class="sr-field" id="srProcWrap" hidden><span>Procedure (not in the list) *</span><input id="srProc" maxlength="255" value="${esc(r.surgery_id ? "" : r.procedure_name || "")}"></label>
                    <label class="sr-field"><span id="srSideLabel">Side</span><select id="srSide"><option value="">Not applicable</option>
                        ${opts.lateralities.map((l) => `<option${r.laterality === l ? " selected" : ""}>${esc(l)}</option>`).join("")}</select><span class="sr-err" data-err="laterality"></span></label>
                </div>
                <div class="sr-banner warn" id="srSurgeryHint" hidden></div>
                <div class="sr-field wide">
                    <span>Diagnosis (ICD-10) *</span>
                    <div id="srDiagChosen"></div>
                    <input id="srDiagSearch" placeholder="Search by code or words, e.g. K80 or cholelithiasis" aria-label="Search ICD-10">
                    <div class="sr-icd-list" id="srIcdList" hidden></div>
                    <input id="srDiagText" maxlength="255" placeholder="…or describe it if no code fits" value="${esc(r.diagnosis_code ? "" : r.diagnosis_text || "")}">
                    <span class="sr-err" data-err="diagnosis_code"></span>
                </div>
                <div class="sr-section">Surgeon and timing</div>
                <div class="sr-grid">
                    <label class="sr-field"><span>Surgeon *</span><select id="srSurgeon"></select><span class="sr-err" data-err="surgeon_user_id"></span></label>
                    <label class="sr-field"><span>Priority *</span><select id="srPriority">${opts.priorities.map((p) => `<option value="${esc(p)}"${(r.priority || "Elective") === p ? " selected" : ""}>${esc(p === "Emergency / STAT" ? "Emergency" : p)}</option>`).join("")}</select></label>
                    <label class="sr-field"><span>Preferred date</span><input type="date" id="srDate" min="${todayISO()}" value="${esc(r.preferred_date || "")}"><span class="sr-err" data-err="preferred_date"></span></label>
                    <label class="sr-field wide" id="srOverrideWrap" hidden><span>Reason for a surgeon outside the specialization *</span>
                        <input id="srOverride" maxlength="255" placeholder="e.g. Covering; specialist on leave" value="${esc(r.surgeon_override_reason || "")}"><span class="sr-hint" id="srOverrideWhy"></span>
                        <span class="sr-err" data-err="surgeon_override_reason"></span></label>
                    <label class="sr-field"><span>Expected duration (minutes)</span><input type="number" id="srDuration" min="5" max="1440" step="5" value="${esc(r.estimated_duration_minutes || "")}"><span class="sr-err" data-err="estimated_duration_minutes"></span></label>
                    <label class="sr-field"><span>Anesthesia</span><select id="srAnes"><option value="">Not decided</option>${opts.anesthesia_types.map((a) =>
                        `<option value="${esc(a.value)}"${r.anesthesia_type === a.value ? " selected" : ""}>${esc(a.label)}</option>`).join("")}</select></label>
                    <label class="sr-field"><span>Visit</span><select id="srVisit"><option value="">Not tied to a visit</option>${opts.encounters.map((e) =>
                        `<option value="${e.id}"${String(r.encounter_id ?? encounterId ?? "") === String(e.id) ? " selected" : ""}>${esc(fmtDateTime(e.date_of_service))}${e.reason_for_visit ? ` — ${esc(String(e.reason_for_visit).slice(0, 40))}` : ""}</option>`).join("")}</select>
                        <span class="sr-err" data-err="encounter_id"></span></label>
                    <label class="sr-field wide"><span>Notes for the team</span><textarea id="srNotes" maxlength="5000" placeholder="e.g. Diabetic — schedule first case; latex allergy">${esc(r.notes || "")}</textarea></label>
                </div>
            </div>
            <div class="sr-foot"><button type="button" class="sr-btn" data-sr-close="srFormOverlay">Cancel</button><button type="submit" class="sr-btn primary" id="srFormSave">${request ? "Save changes" : "Request surgery"}</button></div>
        </form>`;

    $("srSpec").innerHTML = `<option value="">-- Choose --</option>` + SPEC_GROUPS.map(([cat, label]) => {
        const list = opts.specializations.filter((s) => s.category === cat);
        return list.length ? `<optgroup label="${label}">${list.map((s) => `<option value="${s.id}"${String(r.specialization_id || "") === String(s.id) ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</optgroup>` : "";
    }).join("");
    renderSurgeries(r.surgery_id ?? (request ? "other" : ""));
    renderSurgeons(r.surgeon_user_id);
    setDiagnosis(r.diagnosis_code ? { code: r.diagnosis_code, description: r.diagnosis_text } : null);
    applySurgery(false);

    $("srSpec").addEventListener("change", () => { renderSurgeries(""); renderSurgeons(); applySurgery(true); });
    $("srSurgery").addEventListener("change", () => applySurgery(true));
    $("srSurgeon").addEventListener("change", updateOverride);
    $("srDiagSearch").addEventListener("input", onIcdInput);
    $("srDiagSearch").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); $("srIcdList").hidden = true; } });
    $("srIcdList").addEventListener("click", (e) => {
        const b = e.target.closest("[data-code]");
        if (b) setDiagnosis({ code: b.dataset.code, description: b.dataset.desc });
    });
    $("srDiagChosen").addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) setDiagnosis(null); });
    $("srForm").addEventListener("submit", submitForm);
    $("srFormModal").querySelectorAll("[data-sr-close]").forEach((b) => b.addEventListener("click", () => $(b.dataset.srClose).classList.remove("open")));

    $("srFormOverlay").classList.add("open");
    $("srSpec").focus();
}

function selectedSpecId() {
    return Number($("srSpec").value || 0);
}

function selectedSurgery() {
    return form.options.surgeries.find((s) => String(s.id) === $("srSurgery").value) || null;
}

function renderSurgeries(selected) {
    const spec = selectedSpecId();
    const list = form.options.surgeries.filter((s) => s.specialization_id === spec);
    $("srSurgery").innerHTML = spec
        ? `<option value="">-- Choose (${list.length}) --</option>` + list.map((s) => `<option value="${s.id}"${String(selected) === String(s.id) ? " selected" : ""}>${esc(s.name)}${s.code ? ` (${esc(s.code)})` : ""}</option>`).join("")
            + `<option value="other"${selected === "other" ? " selected" : ""}>Other — not in the list…</option>`
        : `<option value="">-- Choose the specialization first --</option>`;
}

/** Doctors of the specialization first (the requesting doctor picked when they qualify); others need a reason. */
function renderSurgeons(selected = null) {
    const spec = selectedSpecId();
    const docs = form.options.doctors;
    const match = docs.filter((d) => spec && d.specialization_ids.includes(spec));
    const rest = docs.filter((d) => !(spec && d.specialization_ids.includes(spec)));
    const me = form.options.current_user_id;
    const pick = selected ?? (match.some((d) => d.user_id === me) ? me : (match.length === 1 ? match[0].user_id : ""));
    const specName = form.options.specializations.find((s) => s.id === spec)?.name;
    const opt = (d) => `<option value="${d.user_id}"${String(pick) === String(d.user_id) ? " selected" : ""}>${esc(d.name)}${d.user_id === me ? " (you)" : ""}${d.specializations.length ? ` — ${esc(d.specializations.join(", "))}` : ""}</option>`;
    $("srSurgeon").innerHTML = `<option value="">-- Choose the surgeon --</option>`
        + (match.length ? `<optgroup label="${esc(specName || "")} surgeons">${match.map(opt).join("")}</optgroup>` : "")
        + (rest.length ? `<optgroup label="Other doctors (a reason is needed)">${rest.map(opt).join("")}</optgroup>` : "");
    updateOverride();
}

function updateOverride() {
    const spec = selectedSpecId();
    const doc = form.options.doctors.find((d) => String(d.user_id) === $("srSurgeon").value);
    const outside = doc && spec && !doc.specialization_ids.includes(spec);
    $("srOverrideWrap").hidden = !outside;
    const specName = form.options.specializations.find((s) => s.id === spec)?.name || "";
    $("srOverrideWhy").textContent = outside ? `${doc.name} isn't listed under ${specName}.` : "";
}

/** Shows what the surgery needs and fills its defaults (when changed by the user). */
function applySurgery(fillDefaults) {
    const other = $("srSurgery").value === "other";
    $("srProcWrap").hidden = !other;
    const s = selectedSurgery();
    $("srSideLabel").textContent = s?.requires_laterality ? "Side *" : "Side";
    if (s && fillDefaults) {
        $("srDuration").value = s.default_duration_minutes;
        if (s.default_anesthesia_type) $("srAnes").value = s.default_anesthesia_type;
    }
    const hints = s ? [
        `${esc(s.category)} · usually ${s.default_duration_minutes} min`,
        s.requires_laterality ? "Give the side." : "",
        s.usually_needs_blood ? "Usually needs blood — typing / crossmatch goes on the checklist." : "",
        s.usually_needs_implants ? "Usually needs implants — arranging them goes on the checklist." : ""
    ].filter(Boolean) : [];
    $("srSurgeryHint").hidden = !hints.length;
    $("srSurgeryHint").innerHTML = hints.join(" · ");
}

function setDiagnosis(dx) {
    $("srIcdList").hidden = true;
    $("srDiagSearch").value = "";
    $("srDiagChosen").innerHTML = dx ? `<span class="sr-chip" data-code="${esc(dx.code)}"><b>${esc(dx.code)}</b> ${esc(dx.description || "")}<button type="button" data-clear aria-label="Remove diagnosis">&times;</button></span>` : "";
    $("srDiagSearch").hidden = !!dx;
    $("srDiagText").hidden = !!dx;
}

function onIcdInput() {
    clearTimeout(form.icdTimer);
    const q = $("srDiagSearch").value.trim();
    if (q.length < 2) {
        $("srIcdList").hidden = true;
        return;
    }
    form.icdTimer = setTimeout(async () => {
        const r = await searchIcd10(q);
        if ($("srDiagSearch").value.trim() !== q) return;
        const items = r?.success ? (r.data.items || []) : [];
        $("srIcdList").innerHTML = items.length
            ? items.map((i) => `<button type="button" data-code="${esc(i.code)}" data-desc="${esc(i.description)}"><b>${esc(i.code)}</b>${esc(i.description)}</button>`).join("")
            : `<div class="sr-hint" style="padding:8px 10px;">No ICD-10 match. Describe the diagnosis in the box below instead.</div>`;
        $("srIcdList").hidden = false;
    }, 250);
}

function clearFormErrors() {
    $("srFormAlert").innerHTML = "";
    document.querySelectorAll("#srForm [data-err]").forEach((e) => { e.textContent = ""; });
    document.querySelectorAll("#srForm .has-error").forEach((e) => e.classList.remove("has-error"));
}

async function submitForm(event) {
    event.preventDefault();
    clearFormErrors();
    const surgery = $("srSurgery").value;
    const chosen = $("srDiagChosen").querySelector("[data-code]");
    const data = {
        id: form.request?.id, version: form.request?.version, patient_id: form.patient.id,
        encounter_id: $("srVisit").value, specialization_id: $("srSpec").value,
        surgery_id: surgery === "other" ? "" : surgery, procedure_name: surgery === "other" ? $("srProc").value.trim() : "",
        laterality: $("srSide").value, diagnosis_code: chosen?.dataset.code || "", diagnosis_text: chosen ? "" : $("srDiagText").value.trim(),
        surgeon_user_id: $("srSurgeon").value, surgeon_override_reason: $("srOverrideWrap").hidden ? "" : $("srOverride").value.trim(),
        priority: $("srPriority").value, preferred_date: $("srDate").value, estimated_duration_minutes: $("srDuration").value,
        anesthesia_type: $("srAnes").value, notes: $("srNotes").value.trim()
    };

    $("srFormSave").disabled = true;
    const result = await saveSurgeryRequest(data);
    $("srFormSave").disabled = false;

    if (!result?.success) {
        $("srFormAlert").innerHTML = `<div class="sr-alert">${esc(result?.message || "Couldn't save the request.")}</div>`;
        Object.entries(result?.errors || {}).forEach(([key, msg]) => {
            const slot = document.querySelector(`#srForm [data-err="${key}"]`) || document.querySelector(`#srForm [data-err="surgery_id"]`);
            if (key === "surgeon_override_reason") $("srOverrideWrap").hidden = false;
            if (slot) {
                slot.textContent = msg;
                slot.closest(".sr-field")?.classList.add("has-error");
            }
        });
        $("srFormAlert").scrollIntoView({ block: "nearest" });
        return;
    }

    $("srFormOverlay").classList.remove("open");
    showToast(result.message, "success");
    const id = form.request?.id || result.data?.id;
    if (form.onSaved) await form.onSaved(result);
    if (id) openSurgeryRequest(id, { onChange: form.onSaved });
}

/* ---------------------------------------------------------------
 * Detail + readiness checklist
 * ------------------------------------------------------------- */

let detail = { request: null, onChange: null };

export async function openSurgeryRequest(id, { onChange = null } = {}) {
    ensureRoot();
    detail.onChange = onChange || detail.onChange;
    const r = await fetchSurgeryRequest(id);
    if (!r?.success) return showToast(r?.message || "Couldn't open the request.", "error");
    detail.request = r.data;
    renderDetail();
    $("srDetailOverlay").classList.add("open");
}

async function reloadDetail() {
    await openSurgeryRequest(detail.request.id);
    if (detail.onChange) await detail.onChange();
}

function renderDetail() {
    const r = detail.request;
    const requester = canRequest();
    const pct = r.readiness_total ? Math.round(r.readiness_done * 100 / r.readiness_total) : 100;
    const banners = [];
    if (r.status === "ready" && r.ready_override_reason) {
        banners.push(`<div class="sr-banner warn"><strong>Emergency — sent to scheduling before the checklist was finished</strong>${r.ready_override_by_name ? ` by ${esc(r.ready_override_by_name)}` : ""}: ${esc(r.ready_override_reason)}</div>`);
    } else if (r.status === "ready") {
        banners.push(`<div class="sr-banner ok">&#10003; Ready for scheduling${r.ready_at ? ` since ${esc(fmtDateTime(r.ready_at))}` : ""}. The OR can book it.</div>`);
    }
    if (r.status === "cancelled") {
        banners.push(`<div class="sr-banner bad">Cancelled${r.cancelled_by_name ? ` by ${esc(r.cancelled_by_name)}` : ""}${r.cancelled_at ? ` on ${esc(fmtDate(r.cancelled_at))}` : ""}: ${esc(r.cancel_reason || "")}</div>`);
    }

    const detailText = (item) => {
        const d = item.details || {};
        const parts = item.fields.filter((f) => d[f.key]).map((f) => `${esc(f.label)}: <strong>${esc(f.key === "signed_date" ? fmtDate(d[f.key]) : d[f.key])}</strong>`);
        return parts.join(" · ");
    };

    $("srDetailModal").innerHTML = `
        <div class="sr-head"><div><h2 id="srDetailTitle">${esc(r.request_number)} — ${esc(r.procedure_name)}${r.laterality ? ` (${esc(r.laterality)})` : ""}</h2>
            <div class="sr-sub">${statusBadge(r)} ${priorityBadge(r.priority)} <span style="margin-left:4px;">${esc(r.specialization_name || "")}</span></div></div>
            <button type="button" class="sr-x" data-sr-close="srDetailOverlay" aria-label="Close">&times;</button></div>
        <div class="sr-body">
            ${banners.join("")}
            <div class="sr-facts">
                <div><span>Patient</span><strong>${esc(r.patient_name)}</strong><div class="sr-sub">${esc([r.patient_no, r.patient_age != null ? `${r.patient_age} yrs` : null, r.patient_sex].filter(Boolean).join(" · "))}</div></div>
                <div><span>Diagnosis</span><strong>${esc(r.diagnosis || "—")}</strong></div>
                <div><span>Surgeon</span><strong>${esc(r.surgeon_name || "—")}</strong>${r.surgeon_override_reason ? `<div class="sr-sub">Outside the specialization: ${esc(r.surgeon_override_reason)}</div>` : ""}</div>
                <div><span>Preferred date</span><strong>${r.preferred_date ? esc(fmtDate(r.preferred_date)) : "Any"}</strong></div>
                <div><span>Duration · anesthesia</span><strong>${r.estimated_duration_minutes} min · ${esc(r.anesthesia_type || "not decided")}</strong></div>
                <div><span>Requested</span><strong>${esc(r.requested_by_name || "—")}</strong><div class="sr-sub">${esc(fmtDateTime(r.created_at))}${r.encounter_date ? ` · visit ${esc(fmtDate(r.encounter_date))}` : ""}</div></div>
                ${r.notes ? `<div style="grid-column:1/-1;"><span>Notes</span><strong style="font-weight:400;white-space:pre-wrap;">${esc(r.notes)}</strong></div>` : ""}
            </div>
            <div>
                <div class="sr-section" style="display:flex;justify-content:space-between;gap:8px;"><span>Pre-op readiness</span><span>${r.readiness_done} of ${r.readiness_total} required</span></div>
                <div class="sr-progress" style="margin:8px 0 10px;"><span style="width:${pct}%"></span></div>
                <div style="margin-bottom:10px;"><span class="sr-sub">Allergies on the chart: </span>${r.allergies.length
                    ? r.allergies.map((a) => `<span class="sr-allergy">${esc(a.name || "Allergy")}${a.reaction ? ` — ${esc(a.reaction)}` : ""}</span>`).join("")
                    : `<strong>None recorded</strong> <span class="sr-sub">(confirm with the patient)</span>`}</div>
                <div class="sr-checks">${r.checklist.map((item) => `
                    <div class="sr-check ${item.status}${item.required ? " required" : ""}">
                        <span class="ico" aria-hidden="true">${item.status === "done" ? "&#10003;" : item.status === "not_needed" ? "–" : ""}</span>
                        <div>
                            <div><span class="lbl">${esc(item.label)}</span> ${item.required ? `<span class="sr-badge planning">Required</span>` : `<span class="sr-badge muted">Optional</span>`}
                                ${item.status === "not_needed" ? `<span class="sr-badge muted">Not needed</span>` : ""}</div>
                            ${item.status === "pending" ? `<div class="sr-sub">${esc(item.hint)}</div>` : ""}
                            ${detailText(item) ? `<div class="sr-sub" style="color:var(--text-primary);">${detailText(item)}</div>` : ""}
                            ${item.notes ? `<div class="sr-sub">${esc(item.notes)}</div>` : ""}
                            ${item.confirmed_by_name ? `<div class="sr-sub">${item.status === "done" ? "Confirmed" : "Marked"} by ${esc(item.confirmed_by_name)} · ${esc(fmtDateTime(item.confirmed_at))}</div>` : ""}
                        </div>
                        <div class="acts">${r.can_check ? (item.status === "pending"
                            ? `<button type="button" class="sr-btn small primary" data-sr-done="${item.key}">Done…</button>${item.can_skip ? `<button type="button" class="sr-btn small" data-sr-skip="${item.key}">Not needed…</button>` : ""}`
                            : `<button type="button" class="sr-btn small" data-sr-done="${item.key}">Edit…</button><button type="button" class="sr-btn small" data-sr-undo="${item.key}">Undo</button>`) : ""}</div>
                    </div>`).join("")}</div>
            </div>
        </div>
        <div class="sr-foot">
            <div class="left">
                ${requester && r.can_edit ? `<button type="button" class="sr-btn" id="srEdit">Edit request</button>` : ""}
                ${requester && r.can_edit ? `<button type="button" class="sr-btn" id="srCancel">Cancel request…</button>` : ""}
            </div>
            ${requester && r.can_override ? `<button type="button" class="sr-btn warn" id="srOverrideNow">Emergency — ready now…</button>` : ""}
            <button type="button" class="sr-btn" data-sr-close="srDetailOverlay">Close</button>
        </div>`;

    const m = $("srDetailModal");
    m.querySelectorAll("[data-sr-close]").forEach((b) => b.addEventListener("click", () => $(b.dataset.srClose).classList.remove("open")));
    m.querySelectorAll("[data-sr-done]").forEach((b) => b.addEventListener("click", () => checkDialog(b.dataset.srDone, "done")));
    m.querySelectorAll("[data-sr-skip]").forEach((b) => b.addEventListener("click", () => checkDialog(b.dataset.srSkip, "not_needed")));
    m.querySelectorAll("[data-sr-undo]").forEach((b) => b.addEventListener("click", async () => {
        const res = await saveSurgeryRequestCheck({ request_id: r.id, item_key: b.dataset.srUndo, status: "pending" });
        showToast(res?.message || "Couldn't undo it.", res?.success ? "success" : "error");
        if (res?.success) await reloadDetail();
    }));
    $("srEdit")?.addEventListener("click", () => {
        $("srDetailOverlay").classList.remove("open");
        openSurgeryRequestForm({ patient: { id: r.patient_id, name: r.patient_name }, requestId: r.id, onSaved: detail.onChange });
    });
    $("srCancel")?.addEventListener("click", () => reasonDialog({
        title: `Cancel ${r.request_number}?`, text: "The request stops here; its checklist is kept for the record.", label: "Reason", okLabel: "Cancel request", okClass: "danger",
        placeholder: "e.g. Patient declined surgery", run: (reason) => cancelSurgeryRequest(r.id, reason)
    }));
    $("srOverrideNow")?.addEventListener("click", () => reasonDialog({
        title: "Send to scheduling now?", text: `${r.readiness_done} of ${r.readiness_total} required checks are done. For an emergency the OR can book it now; the remaining items stay open on the checklist.`,
        label: "Why it can't wait", okLabel: "Ready now", okClass: "warn", placeholder: "e.g. Ruptured appendix with peritonitis", run: (reason) => readySurgeryRequestNow(r.id, reason)
    }));
}

/** Done (with the item's details) or not needed (with a reason). */
function checkDialog(key, status) {
    const r = detail.request;
    const item = r.checklist.find((i) => i.key === key);
    const d = status === "done" ? (item.details || {}) : {};
    const opts = form.options || {};
    const field = (f) => {
        if (f.key === "relationship") {
            const rel = ["Self", "Parent", "Spouse", "Child", "Sibling", "Guardian", "Other"];
            return `<label class="sr-field"><span>${esc(f.label)}</span><select data-f="${f.key}"><option value="">Choose…</option>${rel.map((x) => `<option${d[f.key] === x ? " selected" : ""}>${x}</option>`).join("")}</select><span class="sr-err" data-err="${f.key}"></span></label>`;
        }
        if (f.key === "blood_type") {
            const types = opts.blood_types || ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
            return `<label class="sr-field"><span>${esc(f.label)} *</span><select data-f="${f.key}"><option value="">Choose…</option>${types.map((x) => `<option${d[f.key] === x ? " selected" : ""}>${x}</option>`).join("")}</select><span class="sr-err" data-err="${f.key}"></span></label>`;
        }
        if (f.key === "signed_date") {
            return `<label class="sr-field"><span>${esc(f.label)}</span><input type="date" data-f="${f.key}" max="${todayISO()}" value="${esc(d[f.key] || todayISO())}"><span class="sr-err" data-err="${f.key}"></span></label>`;
        }
        if (f.key === "units") {
            return `<label class="sr-field"><span>${esc(f.label)}</span><input type="number" min="0" max="50" data-f="${f.key}" value="${esc(d[f.key] ?? "")}"><span class="sr-err" data-err="${f.key}"></span></label>`;
        }
        return `<label class="sr-field"><span>${esc(f.label)}${f.key === "signed_by" ? " *" : ""}</span><input data-f="${f.key}" maxlength="255" value="${esc(d[f.key] || "")}"><span class="sr-err" data-err="${f.key}"></span></label>`;
    };

    $("srDialogModal").innerHTML = `
        <div class="sr-head"><div><h2 id="srDialogTitle">${esc(item.label)}</h2><div class="sr-sub">${status === "done" ? esc(item.hint) : "Mark this item as not needed for this patient."}</div></div>
            <button type="button" class="sr-x" data-close aria-label="Close">&times;</button></div>
        <form id="srCheckForm" novalidate>
            <div class="sr-body">
                <div id="srCheckAlert"></div>
                ${key === "allergies" && status === "done" ? `<div>${r.allergies.length ? r.allergies.map((a) => `<span class="sr-allergy">${esc(a.name || "Allergy")}${a.reaction ? ` — ${esc(a.reaction)}` : ""}</span>`).join("") : "<strong>No allergies on the chart.</strong>"}
                    <div class="sr-sub">Confirm with the patient; add any new allergy to the chart.</div></div>` : ""}
                ${status === "done" && item.fields.length ? `<div class="sr-grid">${item.fields.map(field).join("")}</div>` : ""}
                <label class="sr-field"><span>${status === "not_needed" ? "Why it isn't needed *" : "Notes"}</span><textarea id="srCheckNotes" maxlength="500" placeholder="${status === "not_needed" ? "e.g. Healthy 25-year-old, no clearance needed per surgeon" : "Optional"}">${esc(status === item.status ? item.notes || "" : "")}</textarea><span class="sr-err" data-err="notes"></span></label>
            </div>
            <div class="sr-foot"><button type="button" class="sr-btn" data-close>Cancel</button><button type="submit" class="sr-btn primary" id="srCheckSave">${status === "done" ? "Mark done" : "Not needed"}</button></div>
        </form>`;
    const close = () => $("srDialogOverlay").classList.remove("open");
    $("srDialogModal").querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    $("srCheckForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        $("srCheckAlert").innerHTML = "";
        document.querySelectorAll("#srCheckForm [data-err]").forEach((x) => { x.textContent = ""; });
        const details = {};
        document.querySelectorAll("#srCheckForm [data-f]").forEach((x) => { details[x.dataset.f] = x.value.trim(); });
        $("srCheckSave").disabled = true;
        const res = await saveSurgeryRequestCheck({ request_id: r.id, item_key: key, status, details, notes: $("srCheckNotes").value.trim() });
        $("srCheckSave").disabled = false;
        if (!res?.success) {
            $("srCheckAlert").innerHTML = `<div class="sr-alert">${esc(res?.message || "Couldn't save it.")}</div>`;
            Object.entries(res?.errors || {}).forEach(([k, msg]) => {
                const slot = document.querySelector(`#srCheckForm [data-err="${k}"]`);
                if (slot) slot.textContent = msg;
            });
            return;
        }
        close();
        showToast(res.message, "success");
        await reloadDetail();
    });
    $("srDialogOverlay").classList.add("open");
    ($("srDialogModal").querySelector("[data-f]") || $("srCheckNotes")).focus();
}

function reasonDialog({ title, text, label, okLabel, okClass, placeholder, run }) {
    $("srDialogModal").innerHTML = `
        <div class="sr-head"><h2 id="srDialogTitle">${esc(title)}</h2><button type="button" class="sr-x" data-close aria-label="Close">&times;</button></div>
        <div class="sr-body"><p style="margin:0;">${esc(text)}</p><div id="srReasonAlert"></div>
            <label class="sr-field"><span>${esc(label)} *</span><textarea id="srReason" maxlength="500" placeholder="${esc(placeholder)}"></textarea></label></div>
        <div class="sr-foot"><button type="button" class="sr-btn" data-close>Back</button><button type="button" class="sr-btn ${okClass}" id="srReasonOk">${esc(okLabel)}</button></div>`;
    const close = () => $("srDialogOverlay").classList.remove("open");
    $("srDialogModal").querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    $("srReasonOk").addEventListener("click", async () => {
        const reason = $("srReason").value.trim();
        if (!reason) {
            $("srReasonAlert").innerHTML = `<div class="sr-alert">Enter a reason.</div>`;
            return;
        }
        $("srReasonOk").disabled = true;
        const res = await run(reason);
        $("srReasonOk").disabled = false;
        if (!res?.success) {
            $("srReasonAlert").innerHTML = `<div class="sr-alert">${esc(res?.message || "Couldn't do it.")}</div>`;
            return;
        }
        close();
        showToast(res.message, "success");
        await reloadDetail();
    });
    $("srDialogOverlay").classList.add("open");
    $("srReason").focus();
}
