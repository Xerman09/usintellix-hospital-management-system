import {
    fetchOrSchedule, fetchOrCase, fetchOrOptions, fetchOrSuites, checkOrBooking, bookOrRequest, rescheduleOrCase, cancelOrCase,
    fetchOrBlocks, saveOrBlock, removeOrBlock, setOrTurnover
} from "./or-schedule.service.js?v=1";
import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";
import { openOrCase } from "../or-board/or-case-panel.js?v=3";

const DAY_START = 7 * 60;
const DAY_END = 21 * 60;
const TEAM_FIELDS = ["lead_surgeon_user_id", "assistant_surgeon_user_id", "anesthesiologist_user_id", "scrub_nurse_user_id", "circulating_nurse_user_id"];
const LIVE_STAGES = ["In Room / Induction", "Incision / In Progress", "Closing / Extubation", "In PACU"];

let state = { start: todayISO(), days: 1, data: null, options: null };
let booking = null; // the open booking / change dialog
let checkTimer = null;
let escapeBound = false;

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toMin = (t) => {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const time12 = (t) => {
    const m = toMin(t);
    if (m == null) return "";
    const h = Math.floor(m / 60);
    return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const fmtDate = (iso, opts = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) => {
    if (!iso) return "";
    const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", opts);
};
const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const pct = (min) => ((min - DAY_START) / (DAY_END - DAY_START)) * 100;
const priorityClass = (p) => (p === "Emergency / STAT" ? "emergency" : p === "Urgent" ? "urgent" : "");
const isAdmin = () => getUser()?.role === "admin";

export async function initOrSchedule() {
    state = { start: todayISO(), days: 1, data: null, options: null };
    booking = null;

    document.querySelectorAll("[data-ors-days]").forEach((b) => b.addEventListener("click", () => {
        state.days = Number(b.dataset.orsDays);
        document.querySelectorAll("[data-ors-days]").forEach((x) => x.classList.toggle("active", x === b));
        load();
    }));
    $("orsPrev").addEventListener("click", () => { state.start = addDays(state.data?.start || state.start, -state.days); load(); });
    $("orsNext").addEventListener("click", () => { state.start = addDays(state.data?.start || state.start, state.days); load(); });
    $("orsToday").addEventListener("click", () => { state.start = todayISO(); load(); });
    $("orsDate").addEventListener("change", () => { if ($("orsDate").value) { state.start = $("orsDate").value; load(); } });
    ["orsSpec", "orsSuite", "orsSurgeon"].forEach((id) => $(id).addEventListener("change", load));
    $("orsCalendar").addEventListener("click", onCalendarClick);
    $("orsReady").addEventListener("click", (e) => {
        const b = e.target.closest("[data-ors-book]");
        if (b) openBooking({ requestId: Number(b.dataset.orsBook) });
    });
    $("orsBlocksBtn").hidden = !isAdmin();
    $("orsBlocksBtn").addEventListener("click", openBlocks);
    if (!escapeBound) {
        document.addEventListener("keydown", onEscape);
        escapeBound = true;
    }

    const o = await fetchOrOptions();
    if (o?.success) {
        state.options = o.data;
        $("orsSpec").innerHTML = `<option value="">All specializations</option>` + o.data.specializations.filter((s) => s.category === "surgical")
            .map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
        $("orsSurgeon").innerHTML = `<option value="">All surgeons</option>` + o.data.doctors.filter((d) => !d.is_anesthesiologist)
            .map((d) => `<option value="${d.user_id}">${esc(d.name)}</option>`).join("");
    }
    await load();
}

function onEscape(e) {
    if (e.key !== "Escape" || !$("orsBookOverlay")) return;
    for (const id of ["orsDialogOverlay", "orsBookOverlay", "orsCaseOverlay", "orsBlocksOverlay"]) {
        if ($(id).classList.contains("open")) {
            $(id).classList.remove("open");
            break;
        }
    }
}

async function load() {
    const keepSuite = $("orsSuite").value;
    const r = await fetchOrSchedule({ start: state.start, days: state.days, suite_id: keepSuite, specialization_id: $("orsSpec").value, surgeon_user_id: $("orsSurgeon").value });
    if (!r?.success) {
        $("orsCalendar").innerHTML = `<div class="ors-empty">${esc(r?.message || "Couldn't load the schedule.")}</div>`;
        return;
    }
    state.data = r.data;
    state.start = r.data.start;
    $("orsDate").value = r.data.start;
    $("orsRange").textContent = r.data.days === 1 ? fmtDate(r.data.start, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : `${fmtDate(r.data.start, { month: "short", day: "numeric" })} – ${fmtDate(r.data.end, { month: "short", day: "numeric", year: "numeric" })}`;
    if (!keepSuite) {
        $("orsSuite").innerHTML = `<option value="">All suites</option>` + r.data.suites.map((s) => `<option value="${s.id}">${esc(s.suite_name)}</option>`).join("");
    }
    r.data.days === 1 ? renderDay() : renderWeek();
    renderReady();
}

/* ---------------------------------------------------------------
 * Calendar
 * ------------------------------------------------------------- */

function renderDay() {
    const d = state.data;
    const date = d.start;
    if (!d.suites.length) {
        $("orsCalendar").innerHTML = `<div class="ors-empty">No active OR suites. Register one under OR Management.</div>`;
        return;
    }
    const hours = (DAY_END - DAY_START) / 60;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const showNow = date === todayISO() && nowMin >= DAY_START && nowMin <= DAY_END;

    const rows = d.suites.map((s) => {
        const blocks = d.blocks.filter((b) => b.or_suite_id === Number(s.id) && b.date === date);
        const cases = d.cases.filter((c) => Number(c.or_suite_id) === Number(s.id) && c.scheduled_date === date);
        return `
            <div class="ors-row">
                <div class="ors-suite"><strong>${esc(s.suite_name)}</strong>
                    <span class="ors-sub">${esc(s.suite_type)} · cleaning ${s.turnover_minutes} min</span>
                    ${s.bookable ? "" : `<span class="ors-badge bad" style="margin-top:3px;">${esc(s.status)}</span>`}</div>
                <div class="ors-track${s.bookable ? "" : " off"}" style="--hours:${hours}" data-ors-slot="${s.id}" title="${s.bookable ? "Click to book here" : `${esc(s.status)} — can't be booked`}">
                    ${blocks.map((b) => `<div class="ors-block" style="left:${pct(toMin(b.start_time))}%;width:${pct(toMin(b.end_time)) - pct(toMin(b.start_time))}%"><em>${esc(b.specialization_name)} block</em></div>`).join("")}
                    ${cases.map((c) => {
                        const st = toMin(c.scheduled_start_time);
                        const en = toMin(c.scheduled_end_time) || st + Number(c.estimated_duration_minutes);
                        const live = LIVE_STAGES.includes(c.perioperative_stage);
                        return `<div class="ors-clean" style="left:${pct(en)}%;width:${pct(en + Number(s.turnover_minutes)) - pct(en)}%"></div>
                            <div class="ors-case ${live ? "live" : priorityClass(c.case_priority)}" style="left:${pct(st)}%;width:${Math.max(pct(en) - pct(st), 2)}%" data-ors-case="${c.id}"
                                title="${esc(`${time12(c.scheduled_start_time)}–${time12(c.scheduled_end_time)} ${c.procedure_name} — ${c.patient_name} (${c.perioperative_stage})`)}">
                                <strong>${esc(time12(c.scheduled_start_time))} ${esc(c.procedure_name)}${c.laterality ? ` (${esc(c.laterality)})` : ""}</strong>
                                <span>${esc(c.patient_name)} · ${esc(c.lead_surgeon || "")}</span></div>`;
                    }).join("")}
                    ${showNow ? `<div class="ors-now" style="left:${pct(nowMin)}%"></div>` : ""}
                </div>
            </div>`;
    }).join("");

    const labels = Array.from({ length: hours + 1 }, (_, i) => DAY_START + i * 60)
        .map((m) => `<span style="left:${pct(m)}%">${m === DAY_END ? "" : time12(hhmm(m)).replace(":00", "")}</span>`).join("");

    $("orsCalendar").innerHTML = `<div class="ors-day"><div class="ors-day-inner">
        <div class="ors-hours"><div></div><div>${labels}</div></div>${rows}</div></div>`;
}

function renderWeek() {
    const d = state.data;
    const dates = Array.from({ length: 7 }, (_, i) => addDays(d.start, i));
    const today = todayISO();
    $("orsCalendar").innerHTML = d.suites.length ? `<div class="ors-week"><table>
        <thead><tr><th style="width:150px;">Suite</th>${dates.map((x) => `<th class="${x === today ? "today" : ""}">${esc(fmtDate(x, { weekday: "short", month: "short", day: "numeric" }))}</th>`).join("")}</tr></thead>
        <tbody>${d.suites.map((s) => `
            <tr><td class="suite"><strong>${esc(s.suite_name)}</strong><span class="ors-sub">cleaning ${s.turnover_minutes} min</span>${s.bookable ? "" : `<span class="ors-badge bad">${esc(s.status)}</span>`}</td>
            ${dates.map((x) => `<td data-ors-cell="${s.id}|${x}" title="${s.bookable ? "Click to book on this day" : ""}">
                ${d.blocks.filter((b) => b.or_suite_id === Number(s.id) && b.date === x).map((b) => `<span class="ors-chip block">${esc(b.start_time)}–${esc(b.end_time)} ${esc(b.specialization_name)}</span>`).join("")}
                ${d.cases.filter((c) => Number(c.or_suite_id) === Number(s.id) && c.scheduled_date === x).map((c) =>
                    `<span class="ors-chip ${priorityClass(c.case_priority)}" data-ors-case="${c.id}" title="${esc(`${c.patient_name} — ${c.lead_surgeon || ""}`)}">${esc(time12(c.scheduled_start_time))} ${esc(c.procedure_name)}</span>`).join("")}
            </td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="ors-empty">No active OR suites.</div>`;
}

function renderReady() {
    const ready = state.data.ready;
    $("orsReadyCount").textContent = ready.length;
    $("orsReady").innerHTML = ready.length ? ready.map((r) => `
        <div class="ors-req">
            <strong>${esc(r.procedure_name)}${r.laterality ? ` (${esc(r.laterality)})` : ""}</strong>
            <span class="ors-sub">${esc(r.patient_name)} · ${esc(r.request_number)}</span>
            <span class="ors-sub">${esc(r.specialization_name || "")} · ${esc(r.surgeon_name || "")}</span>
            <div class="row"><span>${r.priority === "Emergency / STAT" ? `<span class="ors-badge emergency">Emergency</span>` : r.priority === "Urgent" ? `<span class="ors-badge urgent">Urgent</span>` : ""}
                <span class="ors-sub" style="display:inline;">${r.preferred_date ? `Preferred ${esc(fmtDate(r.preferred_date, { month: "short", day: "numeric" }))}` : "Any date"}</span></span>
                <button type="button" class="ors-btn small primary" data-ors-book="${r.id}">Book</button></div>
        </div>`).join("") : `<div class="ors-empty">Nothing is waiting. Requests appear here once their readiness checklist is done (Surgery Requests).</div>`;
}

function onCalendarClick(e) {
    const c = e.target.closest("[data-ors-case]");
    if (c) return openCase(Number(c.dataset.orsCase));
    const track = e.target.closest("[data-ors-slot]");
    if (track) {
        const suite = state.data.suites.find((s) => String(s.id) === track.dataset.orsSlot);
        if (!suite?.bookable) return showToast(`${suite?.suite_name || "This suite"} is ${suite?.status || "unavailable"} and can't be booked.`, "error");
        const rect = track.getBoundingClientRect();
        const min = DAY_START + Math.round(((e.clientX - rect.left) / rect.width) * (DAY_END - DAY_START) / 15) * 15;
        return openBooking({ suiteId: Number(suite.id), date: state.data.start, start: hhmm(Math.min(Math.max(min, DAY_START), DAY_END - 15)) });
    }
    const cell = e.target.closest("[data-ors-cell]");
    if (cell) {
        const [suiteId, date] = cell.dataset.orsCell.split("|");
        const suite = state.data.suites.find((s) => String(s.id) === suiteId);
        if (!suite?.bookable) return;
        openBooking({ suiteId: Number(suiteId), date, start: "08:00" });
    }
}

/* ---------------------------------------------------------------
 * Booking / changing a booking
 * ------------------------------------------------------------- */

function doctorOptions(specId, selected, anesthesia = false) {
    const docs = state.options?.doctors || [];
    const fits = (d) => (anesthesia ? d.is_anesthesiologist : specId && d.specialization_ids.includes(Number(specId)));
    const opt = (d) => `<option value="${d.user_id}"${String(selected ?? "") === String(d.user_id) ? " selected" : ""}>${esc(d.name)}${d.specializations.length ? ` — ${esc(d.specializations.join(", "))}` : ""}</option>`;
    const spec = state.options?.specializations.find((s) => s.id === Number(specId));
    const match = docs.filter(fits);
    const rest = docs.filter((d) => !fits(d));
    return (match.length ? `<optgroup label="${anesthesia ? "Anesthesiologists" : `${esc(spec?.name || "")} surgeons`}">${match.map(opt).join("")}</optgroup>` : "")
        + (rest.length ? `<optgroup label="Other doctors (a reason is needed)">${rest.map(opt).join("")}</optgroup>` : "");
}

function staffOptions(selected) {
    const staff = state.options?.staff || [];
    const opt = (s) => `<option value="${s.user_id}"${String(selected ?? "") === String(s.user_id) ? " selected" : ""}>${esc(s.name)}${s.role ? ` (${esc(s.role)})` : ""}</option>`;
    return `<option value="">-- None --</option>` + `<optgroup label="Staff">${staff.filter((s) => !s.is_doctor).map(opt).join("")}</optgroup>`
        + `<optgroup label="Doctors">${staff.filter((s) => s.is_doctor).map(opt).join("")}</optgroup>`;
}

/**
 * New booking: { requestId?, suiteId?, date?, start? }.
 * Change booking: { caseRow } (the case from GET /or-schedule/case).
 */
function openBooking({ requestId = null, suiteId = null, date = null, start = null, caseRow = null }) {
    const ready = state.data.ready;
    const change = !!caseRow;
    const req = change ? null : (ready.find((r) => r.id === requestId) || null);
    if (!change && !ready.length) return showToast("No surgery requests are ready to schedule.", "info");
    booking = { change, caseRow, request: req };

    const c = caseRow || {};
    const suites = state.data.suites;
    $("orsBookModal").innerHTML = `
        <div class="ors-mhead"><div><h2 id="orsBookTitle">${change ? `Change booking — ${esc(c.case_number)}` : "Book surgery"}</h2>
            <span class="ors-sub">${change ? esc(`${c.procedure_name} — ${c.patient_name}`) : "Choose the request, the suite and the time; the team is checked for conflicts as you go."}</span></div>
            <button type="button" class="ors-x" data-close aria-label="Close">&times;</button></div>
        <form id="orsBookForm" novalidate>
            <div class="ors-mbody">
                <div id="orsBookAlert"></div>
                ${change ? "" : `<label class="ors-field"><span>Surgery request *</span><select id="orsReq">${ready.map((r) =>
                    `<option value="${r.id}"${req && req.id === r.id ? " selected" : ""}>${esc(`${r.request_number} — ${r.procedure_name}${r.laterality ? ` (${r.laterality})` : ""} — ${r.patient_name}`)}</option>`).join("")}</select></label>
                    <div class="ors-summary" id="orsReqSummary"></div>`}
                <div class="ors-section">When and where</div>
                <div class="ors-grid">
                    <label class="ors-field"><span>Suite *</span><select id="orsBSuite">${suites.map((s) =>
                        `<option value="${s.id}"${String(suiteId ?? c.or_suite_id ?? "") === String(s.id) ? " selected" : ""}${s.bookable ? "" : " disabled"}>${esc(s.suite_name)}${s.bookable ? "" : ` (${esc(s.status)})`}</option>`).join("")}</select>
                        <span class="ors-err" data-err="or_suite_id"></span></label>
                    <label class="ors-field"><span>Date *</span><input type="date" id="orsBDate" min="${todayISO()}" value="${esc(date || c.scheduled_date || req?.preferred_date || state.data.start)}"><span class="ors-err" data-err="scheduled_date"></span></label>
                    <label class="ors-field"><span>Start *</span><input type="time" id="orsBStart" step="900" value="${esc(start || String(c.scheduled_start_time || "08:00").slice(0, 5))}"><span class="ors-err" data-err="scheduled_start_time"></span></label>
                    <label class="ors-field"><span>Duration (minutes) *</span><input type="number" id="orsBDur" min="5" max="1440" step="5" value="${esc(c.estimated_duration_minutes || "")}"><span class="ors-err" data-err="estimated_duration_minutes"></span></label>
                </div>
                <div class="ors-section">Surgical team</div>
                <div class="ors-grid">
                    <label class="ors-field"><span>Surgeon *</span><select id="orsBLead"></select><span class="ors-err" data-err="lead_surgeon_user_id"></span></label>
                    <label class="ors-field"><span>Assistant surgeon</span><select id="orsBAsst"></select><span class="ors-err" data-err="assistant_surgeon_user_id"></span></label>
                    ${change ? "" : `<label class="ors-field"><span>Anesthesia</span><select id="orsBAnesType">${(state.options?.anesthesia_types || []).map((a) => `<option value="${esc(a.value)}">${esc(a.label)}</option>`).join("")}</select></label>`}
                    <label class="ors-field"><span id="orsBAnesLabel">Anesthesiologist *</span><select id="orsBAnes"></select><span class="ors-err" data-err="anesthesiologist_user_id"></span></label>
                    <label class="ors-field"><span>Scrub nurse</span><select id="orsBScrub">${staffOptions(c.scrub_nurse_user_id)}</select><span class="ors-err" data-err="scrub_nurse_user_id"></span></label>
                    <label class="ors-field"><span>Circulating nurse</span><select id="orsBCirc">${staffOptions(c.circulating_nurse_user_id)}</select><span class="ors-err" data-err="circulating_nurse_user_id"></span></label>
                    <label class="ors-field wide" id="orsBOverrideWrap" hidden><span>Reason for a doctor outside the specialization *</span>
                        <input id="orsBOverride" maxlength="255" placeholder="e.g. Covering; emergency" value="${esc(c.surgeon_override_reason || "")}"><span class="ors-sub" id="orsBOverrideWhy"></span><span class="ors-err" data-err="team_override_reason"></span></label>
                </div>
                ${change ? `<label class="ors-field"><span>Reason for moving it (needed when the suite, date or time changes)</span><textarea id="orsBReason" maxlength="500" placeholder="e.g. Surgeon delayed in another case"></textarea><span class="ors-err" data-err="reason"></span></label>` : ""}
                <div class="ors-avail" id="orsAvail">Checking…</div>
                <label class="ors-check" id="orsAckWrap" hidden><input type="checkbox" id="orsAck"> <span>Book anyway — I've read the warnings above.</span></label>
            </div>
            <div class="ors-mfoot"><button type="button" class="ors-btn" data-close>Cancel</button><button type="submit" class="ors-btn primary" id="orsBSave">${change ? "Save changes" : "Book"}</button></div>
        </form>`;

    const m = $("orsBookModal");
    m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => $("orsBookOverlay").classList.remove("open")));
    $("orsReq")?.addEventListener("change", () => applyRequest(true));
    ["orsBSuite", "orsBDate", "orsBStart", "orsBDur", "orsBLead", "orsBAsst", "orsBAnes", "orsBScrub", "orsBCirc", "orsBAnesType"].forEach((id) =>
        $(id)?.addEventListener("change", () => { updateTeamHints(); scheduleCheck(); }));
    $("orsBDur").addEventListener("input", scheduleCheck);
    $("orsBookForm").addEventListener("submit", submitBooking);

    if (change) {
        $("orsBLead").innerHTML = `<option value="">-- Choose --</option>` + doctorOptions(c.specialization_id, c.lead_surgeon_user_id);
        $("orsBAsst").innerHTML = `<option value="">-- None --</option>` + doctorOptions(c.specialization_id, c.assistant_surgeon_user_id);
        $("orsBAnes").innerHTML = `<option value="">-- None --</option>` + doctorOptions(null, c.anesthesiologist_user_id, true);
        booking.local = c.anesthesia_type === "Local";
    } else {
        applyRequest(false);
    }
    updateTeamHints();
    $("orsBookOverlay").classList.add("open");
    scheduleCheck(0);
}

function currentRequest() {
    return state.data.ready.find((r) => String(r.id) === $("orsReq")?.value) || null;
}

/** Fills the dialog from the chosen request: its surgeon, duration, anesthesia, preferred date. */
function applyRequest(changed) {
    const r = currentRequest();
    booking.request = r;
    if (!r) return;
    $("orsReqSummary").innerHTML = `
        <div><span>Patient</span><strong>${esc(r.patient_name)}</strong><span class="ors-sub">${esc(r.patient_no || "")}</span></div>
        <div><span>Surgery</span><strong>${esc(r.procedure_name)}${r.laterality ? ` (${esc(r.laterality)})` : ""}</strong><span class="ors-sub">${esc(r.specialization_name || "")}</span></div>
        <div><span>Diagnosis</span><strong>${esc(r.diagnosis || "—")}</strong></div>
        <div><span>Priority · preferred</span><strong>${esc(r.priority === "Emergency / STAT" ? "Emergency" : r.priority)} · ${r.preferred_date ? esc(fmtDate(r.preferred_date)) : "any date"}</strong></div>`;
    $("orsBLead").innerHTML = `<option value="">-- Choose --</option>` + doctorOptions(r.specialization_id, r.surgeon_user_id);
    $("orsBAsst").innerHTML = `<option value="">-- None --</option>` + doctorOptions(r.specialization_id, null);
    $("orsBAnes").innerHTML = `<option value="">-- Choose --</option>` + doctorOptions(null, (state.options?.doctors || []).filter((d) => d.is_anesthesiologist).length === 1
        ? state.options.doctors.find((d) => d.is_anesthesiologist).user_id : null, true);
    const surgery = (state.options?.surgeries || []).find((s) => s.id === r.surgery_id);
    if (!$("orsBDur").value || changed) $("orsBDur").value = surgery?.default_duration_minutes || 60;
    if (surgery?.default_anesthesia_type && $("orsBAnesType")) $("orsBAnesType").value = surgery.default_anesthesia_type;
    if (changed && r.preferred_date && r.preferred_date >= todayISO()) $("orsBDate").value = r.preferred_date;
    if (changed) scheduleCheck(0);
}

function specIdNow() {
    return booking.change ? booking.caseRow.specialization_id : booking.request?.specialization_id;
}

function updateTeamHints() {
    const local = booking.change ? booking.local : $("orsBAnesType")?.value === "Local";
    $("orsBAnesLabel").textContent = local ? "Anesthesiologist (not needed for local)" : "Anesthesiologist *";
    const docs = state.options?.doctors || [];
    const why = [];
    const lead = docs.find((d) => String(d.user_id) === $("orsBLead").value);
    const spec = state.options?.specializations.find((s) => s.id === Number(specIdNow()));
    if (lead && spec && !lead.specialization_ids.includes(spec.id)) why.push(`${lead.name} isn't listed under ${spec.name}.`);
    const anes = docs.find((d) => String(d.user_id) === $("orsBAnes").value);
    if (!local && anes && !anes.is_anesthesiologist) why.push(`${anes.name} isn't listed under Anesthesiology.`);
    $("orsBOverrideWrap").hidden = !why.length;
    $("orsBOverrideWhy").textContent = why.join(" ");
}

function proposal() {
    const p = {
        or_suite_id: $("orsBSuite").value, scheduled_date: $("orsBDate").value, scheduled_start_time: $("orsBStart").value,
        estimated_duration_minutes: $("orsBDur").value, specialization_id: specIdNow(),
        patient_id: booking.change ? booking.caseRow.patient_id : booking.request?.patient_id,
        lead_surgeon_user_id: $("orsBLead").value, assistant_surgeon_user_id: $("orsBAsst").value, anesthesiologist_user_id: $("orsBAnes").value,
        scrub_nurse_user_id: $("orsBScrub").value, circulating_nurse_user_id: $("orsBCirc").value
    };
    if (!booking.change && $("orsBAnesType")?.value === "Local") p.anesthesiologist_user_id = "";
    return p;
}

function scheduleCheck(delay = 350) {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(runCheck, delay);
}

/** Live availability: conflicts (red) and block-time warnings (amber). */
async function runCheck() {
    if (!$("orsAvail")) return;
    const p = proposal();
    if (!p.or_suite_id || !p.scheduled_date || !p.scheduled_start_time || !p.estimated_duration_minutes) {
        $("orsAvail").className = "ors-avail";
        $("orsAvail").textContent = "Choose the suite, date, start and duration.";
        return;
    }
    const r = await checkOrBooking({ ...p, exclude_case_id: booking.change ? booking.caseRow.id : "" });
    if (!r?.success || !$("orsAvail")) return;
    const errors = Object.values(r.data.errors || {});
    const warnings = r.data.warnings || [];
    const end = hhmm((toMin(p.scheduled_start_time) || 0) + Number(p.estimated_duration_minutes));
    booking.warnings = warnings;
    if (errors.length) {
        $("orsAvail").className = "ors-avail bad";
        $("orsAvail").innerHTML = `<strong>Not available:</strong><ul>${errors.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    } else if (warnings.length) {
        $("orsAvail").className = "ors-avail warn";
        $("orsAvail").innerHTML = `<strong>Free ${esc(time12(p.scheduled_start_time))}–${esc(time12(end))}, but:</strong><ul>${warnings.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    } else {
        $("orsAvail").className = "ors-avail ok";
        $("orsAvail").innerHTML = `&#10003; Available ${esc(time12(p.scheduled_start_time))}–${esc(time12(end))}${p.lead_surgeon_user_id ? " — the team is free" : ""}.`;
    }
    $("orsAckWrap").hidden = !(warnings.length && !errors.length);
}

function clearBookErrors() {
    $("orsBookAlert").innerHTML = "";
    document.querySelectorAll("#orsBookForm [data-err]").forEach((e) => { e.textContent = ""; });
    document.querySelectorAll("#orsBookForm .has-error").forEach((e) => e.classList.remove("has-error"));
}

async function submitBooking(e) {
    e.preventDefault();
    clearBookErrors();
    const p = proposal();
    const data = {
        ...p, team_override_reason: $("orsBOverrideWrap").hidden ? "" : $("orsBOverride").value.trim(),
        acknowledge_warnings: $("orsAck").checked ? 1 : ""
    };
    if (booking.warnings?.length && !$("orsAck").checked && !$("orsAckWrap").hidden) {
        $("orsBookAlert").innerHTML = `<div class="ors-alert">Tick "Book anyway" to confirm the warnings, or choose another time.</div>`;
        return;
    }
    let res;
    $("orsBSave").disabled = true;
    if (booking.change) {
        res = await rescheduleOrCase({ id: booking.caseRow.id, ...data, reason: $("orsBReason").value.trim() });
    } else {
        res = await bookOrRequest({ request_id: $("orsReq").value, ...data, anesthesia_type: $("orsBAnesType").value });
    }
    $("orsBSave").disabled = false;

    if (!res?.success) {
        if (res?.needs_ack) {
            booking.warnings = res.warnings || [];
            $("orsAvail").className = "ors-avail warn";
            $("orsAvail").innerHTML = `<strong>Please confirm:</strong><ul>${booking.warnings.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
            $("orsAckWrap").hidden = false;
        }
        $("orsBookAlert").innerHTML = `<div class="ors-alert">${esc(res?.message || "Couldn't save the booking.")}</div>`;
        Object.entries(res?.errors || {}).forEach(([key, msg]) => {
            const slot = document.querySelector(`#orsBookForm [data-err="${key}"]`);
            if (key === "team_override_reason") $("orsBOverrideWrap").hidden = false;
            if (slot) {
                slot.textContent = msg;
                slot.closest(".ors-field")?.classList.add("has-error");
            } else if (key === "patient_id") {
                $("orsBookAlert").innerHTML += `<div class="ors-alert" style="margin-top:6px;">${esc(msg)}</div>`;
            }
        });
        return;
    }
    $("orsBookOverlay").classList.remove("open");
    showToast(res.message, "success");
    if (!booking.change && p.scheduled_date) state.start = p.scheduled_date;
    await load();
}

/* ---------------------------------------------------------------
 * Case: details, history, change, cancel
 * ------------------------------------------------------------- */

const ACTIONS = { booked: "Booked", rescheduled: "Moved", team_changed: "Team changed", cancelled: "Cancelled", stage: "Stage" };

async function openCase(id) {
    const r = await fetchOrCase(id);
    if (!r?.success) return showToast(r?.message || "Couldn't open the case.", "error");
    const { case: c, request, history } = r.data;
    const team = [["Surgeon", c.lead_surgeon], ["Assistant", c.assistant_surgeon], ["Anesthesiologist", c.anesthesiologist], ["Scrub nurse", c.scrub_nurse], ["Circulating nurse", c.circulating_nurse]];
    const histLine = (h) => {
        const d = h.details || {};
        let what = "";
        if (h.action === "booked") what = `${fmtDate(d.date)} ${time12(d.start)}, ${d.suite || ""}${d.request ? ` (from ${d.request})` : ""}`;
        if (h.action === "rescheduled") what = `from ${fmtDate(d.from?.date)} ${time12(d.from?.start)} ${d.from?.suite || ""} → ${fmtDate(d.to?.date)} ${time12(d.to?.start)} ${d.to?.suite || ""}`;
        if (h.action === "stage") what = `${d.from || ""} → ${d.to || ""}`;
        if (h.action === "cancelled" && d.request) what = `request ${d.request}`;
        return `<div class="${esc(h.action)}"><strong>${esc(ACTIONS[h.action] || h.action)}</strong> ${esc(what)}
            ${h.reason ? `<span class="ors-sub">Reason: ${esc(h.reason)}</span>` : ""}
            ${(d.warnings || []).length ? `<span class="ors-sub">Booked despite: ${esc(d.warnings.join(" "))}</span>` : ""}
            <span class="ors-sub">${esc(h.user_name || "")} · ${esc(fmtDate(h.created_at))} ${esc(String(h.created_at).slice(11, 16))}</span></div>`;
    };

    $("orsCaseModal").innerHTML = `
        <div class="ors-mhead"><div><h2 id="orsCaseTitle">${esc(c.case_number)} — ${esc(c.procedure_name)}${c.laterality ? ` (${esc(c.laterality)})` : ""}</h2>
            <span class="ors-sub">${esc(c.perioperative_stage)} · ${esc(c.surgical_specialty || "")}</span></div>
            <button type="button" class="ors-x" data-close aria-label="Close">&times;</button></div>
        <div class="ors-mbody">
            ${c.perioperative_stage === "Cancelled" ? `<div class="ors-avail bad">Cancelled${c.cancelled_by_name ? ` by ${esc(c.cancelled_by_name)}` : ""}: ${esc(c.cancellation_reason || "")}</div>` : ""}
            <div class="ors-summary">
                <div><span>Patient</span><strong>${esc(c.patient_name)}</strong><span class="ors-sub">${esc([c.patient_mrn, c.patient_age ? `${c.patient_age} yrs` : "", c.gender].filter(Boolean).join(" · "))}</span></div>
                <div><span>When</span><strong>${esc(fmtDate(c.scheduled_date))}</strong><span class="ors-sub">${esc(time12(c.scheduled_start_time))}–${esc(time12(c.scheduled_end_time))} (${c.estimated_duration_minutes} min)</span></div>
                <div><span>Where</span><strong>${esc(c.or_suite_name)}</strong></div>
                <div><span>Priority · anesthesia</span><strong>${esc(c.case_priority)} · ${esc(c.anesthesia_type)}</strong></div>
                ${c.preop_diagnosis ? `<div><span>Diagnosis</span><strong>${esc(c.preop_diagnosis)}</strong></div>` : ""}
                ${request ? `<div><span>Request</span><strong>${esc(request.request_number)}</strong><span class="ors-sub">Readiness ${request.readiness_done}/${request.readiness_total}</span></div>` : ""}
            </div>
            <div class="ors-section">Team</div>
            <div class="ors-grid">${team.map(([label, name]) => `<div><span class="ors-sub" style="margin:0;">${label}</span><strong>${esc(name || "—")}</strong></div>`).join("")}</div>
            ${c.surgeon_override_reason ? `<span class="ors-sub">Outside the specialization: ${esc(c.surgeon_override_reason)}</span>` : ""}
            <div class="ors-section">History</div>
            <div class="ors-hist">${history.length ? history.map(histLine).join("") : `<span class="ors-sub">No history recorded.</span>`}</div>
        </div>
        <div class="ors-mfoot">
            <div class="left">${c.can_move ? `<button type="button" class="ors-btn" id="orsCaseChange">Change booking…</button><button type="button" class="ors-btn" id="orsCaseCancel">Cancel case…</button>` : ""}</div>
            ${c.perioperative_stage === "Cancelled" ? "" : `<button type="button" class="ors-btn primary" id="orsCaseRecord">Open case record</button>`}
            <button type="button" class="ors-btn" data-close>Close</button>
        </div>`;
    const m = $("orsCaseModal");
    $("orsCaseRecord")?.addEventListener("click", () => {
        $("orsCaseOverlay").classList.remove("open");
        openOrCase(c.id, { onChange: load });
    });
    m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => $("orsCaseOverlay").classList.remove("open")));
    $("orsCaseChange")?.addEventListener("click", () => {
        $("orsCaseOverlay").classList.remove("open");
        openBooking({ caseRow: c });
    });
    $("orsCaseCancel")?.addEventListener("click", () => cancelDialog(c));
    $("orsCaseOverlay").classList.add("open");
}

function cancelDialog(c) {
    $("orsDialogModal").innerHTML = `
        <div class="ors-mhead"><h2 id="orsDialogTitle">Cancel ${esc(c.case_number)}?</h2><button type="button" class="ors-x" data-close aria-label="Close">&times;</button></div>
        <div class="ors-mbody">
            <p style="margin:0;">${esc(c.procedure_name)} for ${esc(c.patient_name)}, ${esc(fmtDate(c.scheduled_date))} ${esc(time12(c.scheduled_start_time))}. The team${c.patient_id ? " and the patient" : ""} get a message.</p>
            <div id="orsCancelAlert"></div>
            <label class="ors-field"><span>Reason *</span><textarea id="orsCancelReason" maxlength="500" placeholder="e.g. Patient has a fever"></textarea></label>
            ${c.surgery_request_id ? `<label class="ors-check"><input type="checkbox" id="orsCancelReturn" checked> <span>Put the surgery request back on the ready list to book again (untick if the surgery won't happen).</span></label>` : ""}
        </div>
        <div class="ors-mfoot"><button type="button" class="ors-btn" data-close>Back</button><button type="button" class="ors-btn danger" id="orsCancelOk">Cancel case</button></div>`;
    const close = () => $("orsDialogOverlay").classList.remove("open");
    $("orsDialogModal").querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    $("orsCancelOk").addEventListener("click", async () => {
        const reason = $("orsCancelReason").value.trim();
        if (!reason) {
            $("orsCancelAlert").innerHTML = `<div class="ors-alert">Enter a reason.</div>`;
            return;
        }
        $("orsCancelOk").disabled = true;
        const res = await cancelOrCase(c.id, reason, $("orsCancelReturn") ? $("orsCancelReturn").checked : true);
        $("orsCancelOk").disabled = false;
        if (!res?.success) {
            $("orsCancelAlert").innerHTML = `<div class="ors-alert">${esc(res?.message || "Couldn't cancel it.")}</div>`;
            return;
        }
        close();
        $("orsCaseOverlay").classList.remove("open");
        showToast(res.message, "success");
        await load();
    });
    $("orsDialogOverlay").classList.add("open");
    $("orsCancelReason").focus();
}

/* ---------------------------------------------------------------
 * Block times & cleaning time (admin)
 * ------------------------------------------------------------- */

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function openBlocks(editing = null) {
    const [b, s] = await Promise.all([fetchOrBlocks(), fetchOrSuites()]);
    if (!b?.success || !s?.success) return showToast("Couldn't load the block times.", "error");
    const blocks = b.data;
    const suites = s.data;
    const specs = (state.options?.specializations || []).filter((x) => x.category === "surgical");
    const e = editing && typeof editing === "object" && editing.id ? editing : {};

    $("orsBlocksModal").innerHTML = `
        <div class="ors-mhead"><div><h2 id="orsBlocksTitle">Block times &amp; cleaning time</h2>
            <span class="ors-sub">Reserve a suite for a specialization on a weekday. Bookings outside their specialization's block get a warning; nothing is refused.</span></div>
            <button type="button" class="ors-x" data-close aria-label="Close">&times;</button></div>
        <div class="ors-mbody">
            <div style="overflow-x:auto;"><table class="ors-table">
                <thead><tr><th>Suite</th><th>Day</th><th>Time</th><th>Specialization</th><th>Dates</th><th></th></tr></thead>
                <tbody>${blocks.length ? blocks.map((x) => `<tr>
                    <td>${esc(x.suite_name)}</td><td>${esc(x.day_name)}</td><td>${esc(x.start_time)}–${esc(x.end_time)}</td><td><strong>${esc(x.specialization_name)}</strong>${x.notes ? `<span class="ors-sub">${esc(x.notes)}</span>` : ""}</td>
                    <td>${x.effective_from || x.effective_to ? `${esc(x.effective_from ? fmtDate(x.effective_from, { month: "short", day: "numeric", year: "numeric" }) : "…")} – ${esc(x.effective_to ? fmtDate(x.effective_to, { month: "short", day: "numeric", year: "numeric" }) : "…")}` : "Every week"}</td>
                    <td style="white-space:nowrap;text-align:right;"><button type="button" class="ors-btn small" data-ors-edit-block="${x.id}">Edit</button> <button type="button" class="ors-btn small" data-ors-del-block="${x.id}">Remove</button></td></tr>`).join("")
                    : `<tr><td colspan="6" class="ors-empty">No block times yet.</td></tr>`}</tbody></table></div>
            <form id="orsBlockForm" novalidate>
                <div class="ors-section">${e.id ? "Edit block time" : "Add a block time"}</div>
                <div id="orsBlockAlert"></div>
                <div class="ors-grid" style="margin-top:10px;">
                    <label class="ors-field"><span>Suite *</span><select id="orsKSuite">${suites.map((x) => `<option value="${x.id}"${String(e.or_suite_id) === String(x.id) ? " selected" : ""}>${esc(x.suite_name)}</option>`).join("")}</select><span class="ors-err" data-err="or_suite_id"></span></label>
                    <label class="ors-field"><span>Specialization *</span><select id="orsKSpec"><option value="">Choose…</option>${specs.map((x) => `<option value="${x.id}"${String(e.specialization_id) === String(x.id) ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select><span class="ors-err" data-err="specialization_id"></span></label>
                    <label class="ors-field"><span>Day *</span><select id="orsKDay">${DAY_NAMES.slice(1).map((d, i) => `<option value="${i + 1}"${Number(e.day_of_week) === i + 1 ? " selected" : ""}>${d}</option>`).join("")}</select></label>
                    <label class="ors-field"><span>From *</span><input type="time" id="orsKStart" step="900" value="${esc(e.start_time || "08:00")}"><span class="ors-err" data-err="start_time"></span></label>
                    <label class="ors-field"><span>To *</span><input type="time" id="orsKEnd" step="900" value="${esc(e.end_time || "12:00")}"><span class="ors-err" data-err="end_time"></span></label>
                    <label class="ors-field"><span>Starting (optional)</span><input type="date" id="orsKFrom" value="${esc(e.effective_from || "")}"><span class="ors-err" data-err="effective_from"></span></label>
                    <label class="ors-field"><span>Until (optional)</span><input type="date" id="orsKTo" value="${esc(e.effective_to || "")}"><span class="ors-err" data-err="effective_to"></span></label>
                    <label class="ors-field"><span>Notes</span><input id="orsKNotes" maxlength="255" value="${esc(e.notes || "")}" placeholder="e.g. Elective CS list"></label>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">${e.id ? `<button type="button" class="ors-btn" id="orsKNew">New instead</button>` : ""}<button type="submit" class="ors-btn primary">${e.id ? "Save block" : "Add block"}</button></div>
            </form>
            <div class="ors-section">Cleaning time between cases</div>
            <div class="ors-grid">${suites.map((x) => `<label class="ors-field"><span>${esc(x.suite_name)}</span>
                <div style="display:flex;gap:6px;"><input type="number" min="0" max="240" step="5" data-ors-turnover="${x.id}" value="${esc(x.turnover_minutes ?? 30)}" aria-label="Minutes"><button type="button" class="ors-btn small" data-ors-save-turnover="${x.id}">Save</button></div></label>`).join("")}</div>
        </div>
        <div class="ors-mfoot"><button type="button" class="ors-btn" data-close>Close</button></div>`;

    const m = $("orsBlocksModal");
    m.querySelectorAll("[data-close]").forEach((x) => x.addEventListener("click", () => { $("orsBlocksOverlay").classList.remove("open"); load(); }));
    m.querySelectorAll("[data-ors-edit-block]").forEach((x) => x.addEventListener("click", () => openBlocks(blocks.find((k) => String(k.id) === x.dataset.orsEditBlock))));
    $("orsKNew")?.addEventListener("click", () => openBlocks());
    m.querySelectorAll("[data-ors-del-block]").forEach((x) => x.addEventListener("click", async () => {
        const res = await removeOrBlock(Number(x.dataset.orsDelBlock));
        showToast(res?.message || "Couldn't remove it.", res?.success ? "success" : "error");
        if (res?.success) openBlocks();
    }));
    m.querySelectorAll("[data-ors-save-turnover]").forEach((x) => x.addEventListener("click", async () => {
        const input = m.querySelector(`[data-ors-turnover="${x.dataset.orsSaveTurnover}"]`);
        const res = await setOrTurnover(Number(x.dataset.orsSaveTurnover), Number(input.value));
        showToast(res?.message || "Couldn't save it.", res?.success ? "success" : "error");
    }));
    $("orsBlockForm").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        $("orsBlockAlert").innerHTML = "";
        m.querySelectorAll("#orsBlockForm [data-err]").forEach((x) => { x.textContent = ""; });
        const res = await saveOrBlock({
            id: e.id || "", or_suite_id: $("orsKSuite").value, specialization_id: $("orsKSpec").value, day_of_week: $("orsKDay").value,
            start_time: $("orsKStart").value, end_time: $("orsKEnd").value, effective_from: $("orsKFrom").value, effective_to: $("orsKTo").value, notes: $("orsKNotes").value.trim()
        });
        if (!res?.success) {
            $("orsBlockAlert").innerHTML = `<div class="ors-alert">${esc(res?.message || "Couldn't save it.")}</div>`;
            Object.entries(res?.errors || {}).forEach(([k, msg]) => {
                const slot = m.querySelector(`#orsBlockForm [data-err="${k}"]`);
                if (slot) slot.textContent = msg;
            });
            return;
        }
        showToast(res.message, "success");
        openBlocks();
    });
    $("orsBlocksOverlay").classList.add("open");
}
