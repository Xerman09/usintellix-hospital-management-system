import { fetchOrBoard, setOrSuiteStatus } from "./or-board.service.js?v=3";
import {
    openOrCase, advanceStage, ensureOrCaseRoot, esc, parseDT, fmtTime, fmtTimeOfDay, fmtDate, fmtMin, minutesSince, STAGE_SHORT, GATES, PHASE_LABELS
} from "./or-case-panel.js?v=3";
import { showToast } from "../../core/toast.js";
import { systemNow, todayISO } from "../../core/timezone.js";

const IN_ROOM = ["In Room / Induction", "Incision / In Progress", "Closing / Extubation"];
const WAITING = ["Scheduled", "Pre-Op Holding"];
const REFRESH_MS = 30000;
const TICK_MS = 15000;
/** Minutes past the booked start before a case counts as late. */
const LATE_AFTER = 10;

let state = { date: todayISO(), data: null, loadedAt: null };
let refreshTimer = null;
let tickTimer = null;
const $ = (id) => document.getElementById(id);
const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
};

export async function initOrBoard() {
    ensureOrCaseRoot();
    state = { date: todayISO(), data: null, loadedAt: null };
    const shift = (n) => {
        const d = parseDT(`${state.date} 12:00`);
        d.setDate(d.getDate() + n);
        state.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        load();
    };
    $("orbPrev").addEventListener("click", () => shift(-1));
    $("orbNext").addEventListener("click", () => shift(1));
    $("orbToday").addEventListener("click", () => { state.date = todayISO(); load(); });
    $("orbDate").addEventListener("change", () => { if ($("orbDate").value) { state.date = $("orbDate").value; load(); } });
    $("orbInitials").checked = store.get("orb.initials") === "1";
    $("orbInitials").addEventListener("change", () => { store.set("orb.initials", $("orbInitials").checked ? "1" : "0"); render(); });
    $("orbTheater").addEventListener("click", toggleTheater);
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && $("orbPage")?.classList.contains("orb-theater")) setTheater(false);
    });
    $("orbPage").addEventListener("click", onClick);

    clearInterval(refreshTimer);
    clearInterval(tickTimer);
    refreshTimer = setInterval(() => { if (!alive()) return; if (!document.hidden) load(true); }, REFRESH_MS);
    tickTimer = setInterval(() => { if (!alive()) return; clock(); render(); }, TICK_MS);
    clock();
    await load();
}

/** The tab was closed: stop the timers. */
function alive() {
    if ($("orbPage")) return true;
    clearInterval(refreshTimer);
    clearInterval(tickTimer);
    return false;
}

function clock() {
    const now = systemNow();
    $("orbClock").textContent = fmtTime(now);
    $("orbDateLabel").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

async function load(silent = false) {
    const r = await fetchOrBoard(state.date);
    if (!r?.success) {
        if (!silent) $("orbSuites").innerHTML = `<div class="orb-empty">${esc(r?.message || "Couldn't load the board.")}</div>`;
        return;
    }
    state.data = r.data;
    state.date = r.data.date;
    state.loadedAt = systemNow();
    $("orbDate").value = r.data.date;
    render();
}

function toggleTheater() {
    setTheater(!$("orbPage").classList.contains("orb-theater"));
}

function setTheater(on) {
    const page = $("orbPage");
    page.classList.toggle("orb-theater", on);
    $("orbTheater").innerHTML = on ? "&#x2715; Exit theater" : "&#x26F6; Theater mode";
    if (on && !document.fullscreenElement) page.requestFullscreen?.().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

/* ---------------------------------------------------------------
 * Rendering
 * ------------------------------------------------------------- */

const initials = () => $("orbInitials")?.checked;
const patientName = (c) => {
    if (!initials()) return esc(c.patient_name);
    return esc(String(c.patient_name || "").split(/\s+/).filter(Boolean).filter((_, i, a) => i === 0 || i === a.length - 1).map((w) => `${w[0].toUpperCase()}.`).join(" "));
};
const priorityPill = (c) => (c.case_priority === "Emergency / STAT" ? `<span class="orb-pill bad">Emergency</span>` : c.case_priority === "Urgent" ? `<span class="orb-pill warn">Urgent</span>` : "");
const startAt = (c) => parseDT(`${c.scheduled_date} ${c.scheduled_start_time}`);

/** Delay facts for a case, from the booked start, the times stamped and now. */
function timing(c) {
    const now = systemNow();
    const start = startAt(c);
    const inRoom = parseDT(c.actual_in_room_time);
    const out = parseDT(c.actual_out_room_time);
    const est = Number(c.estimated_duration_minutes) || 0;
    const t = { lateBy: 0, startedLate: 0, elapsed: null, over: 0, est };
    if (WAITING.includes(c.perioperative_stage) && start && now > start) t.lateBy = (now - start) / 60000;
    if (inRoom && start) t.startedLate = (inRoom - start) / 60000;
    if (inRoom) {
        t.elapsed = ((out || now) - inRoom) / 60000;
        t.over = t.elapsed - est;
    }
    return t;
}

function delayChips(c, t) {
    const chips = [];
    if (t.lateBy > LATE_AFTER) chips.push(`<span class="orb-pill bad">Late start · ${fmtMin(t.lateBy)}</span>`);
    if (t.startedLate > LATE_AFTER && !WAITING.includes(c.perioperative_stage)) chips.push(`<span class="orb-pill warn">Started ${fmtMin(t.startedLate)} late</span>`);
    if (IN_ROOM.includes(c.perioperative_stage) && t.over > 0) chips.push(`<span class="orb-pill bad">Running ${fmtMin(t.over)} over</span>`);
    if (c.delay_reason) chips.push(`<span class="orb-pill warn" title="Delay reason">${esc(c.delay_reason)}</span>`);
    return chips.join("");
}

function isDelayed(c) {
    if (c.perioperative_stage === "Cancelled") return false;
    const t = timing(c);
    return t.lateBy > LATE_AFTER || (IN_ROOM.includes(c.perioperative_stage) && t.over > 0);
}

function checks(c, compact = false) {
    const due = c.next_stage ? GATES[c.next_stage] : null;
    return ["sign_in", "time_out", "sign_out"].map((p) => {
        const at = c.checklist[p];
        if (compact) return `<i class="${at ? "ok" : ""}" title="${PHASE_LABELS[p]}${at ? ` done ${esc(fmtTime(at))}` : " not done"}">${p === "sign_in" ? "SI" : p === "time_out" ? "TO" : "SO"}</i>`;
        return `<span class="orb-check ${at ? "ok" : due === p ? "due" : ""}">${at ? "✓" : "○"} ${PHASE_LABELS[p]}${at ? ` ${esc(fmtTime(at))}` : ""}</span>`;
    }).join("");
}

function nextButton(c) {
    if (!c.next_stage || c.perioperative_stage === "Cancelled" || !state.data.is_today && WAITING.includes(c.perioperative_stage)) return "";
    if (c.next_stage === "Transferred / Discharged") {
        const ready = c.recovery && c.recovery.criteria_met === c.recovery.criteria_total;
        return `<button type="button" class="orb-btn small ${ready ? "go" : ""}" data-orb-recovery="${c.id}">Release…</button>`;
    }
    const gate = GATES[c.next_stage];
    const needs = gate && !c.checklist[gate];
    return needs
        ? `<button type="button" class="orb-btn small need" data-orb-check="${c.id}" data-phase="${gate}">Do the ${PHASE_LABELS[gate]}</button>`
        : `<button type="button" class="orb-btn small go" data-orb-next="${c.id}">${esc(STAGE_SHORT[c.next_stage])} →</button>`;
}

function render() {
    const d = state.data;
    if (!d || !$("orbSuites")) return;
    const cases = d.cases;
    const delayed = cases.filter(isDelayed).length;
    $("orbKpis").innerHTML = [
        ["Cases", d.counts.total, ""], ["Waiting", d.counts.waiting, ""], ["In the room", d.counts.in_room, "live"], ["Recovery", d.counts.recovery, ""],
        ["Done", d.counts.done, ""], ["Delayed", delayed, delayed ? "warn" : ""], ["Cancelled", d.counts.cancelled, ""]
    ].map(([l, v, cls]) => `<div class="orb-kpi ${cls}"><span>${l}</span><strong>${v}</strong></div>`).join("");
    $("orbUpdated").textContent = state.loadedAt ? `${d.is_today ? "Live · " : `${fmtDate(d.date)} · `}updated ${fmtTime(state.loadedAt)}` : "";

    $("orbSuites").innerHTML = d.suites.length ? d.suites.map(suiteCard).join("") : `<div class="orb-empty">No OR suites are set up.</div>`;

    const pacu = cases.filter((c) => c.perioperative_stage === "In PACU");
    $("orbPacuWrap").hidden = !pacu.length;
    $("orbPacuCount").textContent = pacu.length;
    $("orbPacu").innerHTML = pacu.map(pacuRow).join("");

    $("orbListNote").textContent = d.is_today ? "Includes cases from earlier days still in the room or in recovery." : "";
    $("orbList").innerHTML = cases.length ? `<table class="orb-table"><thead><tr><th>Start</th><th>Case</th><th>Patient</th><th>Surgery</th><th>Suite</th><th>Surgeon</th><th>Stage</th><th>Checklist</th><th>Timing</th></tr></thead><tbody>
        ${cases.map((c) => {
            const t = timing(c);
            return `<tr data-orb-open="${c.id}" class="${c.perioperative_stage === "Cancelled" ? "cancelled" : ""}">
                <td>${esc(fmtTimeOfDay(c.scheduled_start_time))}${c.scheduled_date !== d.date ? `<span class="orb-sub">${esc(fmtDate(c.scheduled_date))}</span>` : ""}</td>
                <td>${esc(c.case_number)} ${priorityPill(c)}</td>
                <td>${patientName(c)}${c.allergies.length ? ` <span class="orb-pill bad" title="${esc(c.allergies.join(", "))}">⚠</span>` : ""}</td>
                <td>${esc(c.procedure_name)}${c.laterality ? ` (${esc(c.laterality)})` : ""}<span class="orb-sub">${esc(c.surgical_specialty || "")}</span></td>
                <td>${esc(c.or_suite_name)}</td><td>${esc(c.lead_surgeon)}</td>
                <td><span class="orb-pill ${IN_ROOM.includes(c.perioperative_stage) ? "live" : c.perioperative_stage === "Cancelled" ? "bad" : ""}">${esc(STAGE_SHORT[c.perioperative_stage] || c.perioperative_stage)}</span></td>
                <td><span class="orb-mini">${checks(c, true)}</span></td>
                <td>${t.elapsed != null ? `${fmtMin(t.elapsed)} of ${fmtMin(t.est)}` : `${fmtMin(t.est)} planned`}<div class="orb-chips" style="margin-top:3px;">${delayChips(c, t)}</div></td></tr>`;
        }).join("")}</tbody></table>` : `<div class="orb-empty">No cases booked for ${esc(fmtDate(d.date))}.</div>`;
}

function suiteCard(s) {
    const c = s.current_case;
    const down = ["Maintenance", "Blocked"].includes(s.status);
    const cleaning = s.status === "Cleaning / Turnover";
    const cls = c ? "surgery" : cleaning ? "cleaning" : down ? "down" : "";
    const cleanMin = cleaning && s.turnover_started_at ? minutesSince(s.turnover_started_at) : null;
    const statusPill = c ? `<span class="orb-pill live"><span class="orb-dot"></span> In surgery</span>`
        : cleaning ? `<span class="orb-pill warn">Cleaning${cleanMin != null ? ` · ${fmtMin(cleanMin)} of ${s.turnover_minutes}m` : ""}</span>`
        : down ? `<span class="orb-pill">${esc(s.status)}</span>` : `<span class="orb-pill ok">Available</span>`;

    let main;
    if (c) {
        const t = timing(c);
        const since = c.stage_since ? minutesSince(c.stage_since) : null;
        const pct = t.est ? Math.min(100, Math.round((t.elapsed / t.est) * 100)) : 0;
        main = `
            <div class="orb-stage"><strong>${esc(STAGE_SHORT[c.perioperative_stage])}</strong><span class="t">${since != null ? `${fmtMin(since)} in stage` : ""}</span></div>
            <div class="orb-who"><b>${patientName(c)}</b> <span class="orb-sub" style="display:inline;">${esc([c.patient_age ? `${c.patient_age}y` : "", c.gender ? c.gender[0] : ""].filter(Boolean).join(" "))}${initials() ? "" : ` · ${esc(c.patient_mrn || "")}`}</span>
                ${c.allergies.length ? `<span class="orb-pill bad" title="${esc(c.allergies.join(", "))}">⚠ Allergy</span>` : ""} ${priorityPill(c)}</div>
            <div class="orb-proc">${esc(c.procedure_name)}${c.laterality ? ` (${esc(c.laterality)})` : ""}<span class="orb-sub">${esc(c.surgical_specialty || "")} · ${esc(c.anesthesia_type)} · ${esc(c.case_number)}</span></div>
            <div class="orb-team">Surgeon <span>${esc(c.lead_surgeon)}</span>${c.assistant_surgeon ? ` · Asst <span>${esc(c.assistant_surgeon)}</span>` : ""}<br>
                Anesthesia <span>${esc(c.anesthesiologist)}</span>${c.scrub_nurse || c.circulating_nurse ? `<br>Nurses <span>${esc([c.scrub_nurse, c.circulating_nurse].filter(Boolean).join(", "))}</span>` : ""}</div>
            <div class="orb-bar ${t.over > 0 ? "over" : ""}" title="Time in the room vs. planned"><i style="width:${pct}%"></i></div>
            <div class="orb-timing"><span>In room ${esc(fmtTime(c.actual_in_room_time))}${c.actual_incision_time ? ` · Incision ${esc(fmtTime(c.actual_incision_time))}` : ""}</span><span>${fmtMin(t.elapsed)} of ${fmtMin(t.est)}</span></div>
            <div class="orb-chips">${checks(c)}</div>
            ${delayChips(c, t) ? `<div class="orb-chips">${delayChips(c, t)}</div>` : ""}
            <div class="orb-actions">${nextButton(c)}<button type="button" class="orb-btn small" data-orb-open="${c.id}">Open case</button></div>`;
    } else {
        const next = s.queue[0];
        main = `<div class="orb-free">${cleaning ? `<strong>Room being cleaned</strong>${cleanMin != null && cleanMin > s.turnover_minutes ? `<span class="orb-pill bad" style="margin-top:4px;">${fmtMin(cleanMin - s.turnover_minutes)} over the cleaning time</span>` : ""}`
                : down ? `<strong>${esc(s.status)}</strong>Not available for cases` : `<strong>Room free</strong>${next ? "" : "No more cases today"}`}</div>
            ${cleaning ? `<div class="orb-actions"><button type="button" class="orb-btn small go" data-orb-ready="${s.id}">Room is clean — ready</button></div>` : ""}
            ${next ? nextCase(next) : ""}`;
    }

    const queue = c ? s.queue : s.queue.slice(1);
    return `<div class="orb-suite ${cls}">
        <div class="orb-suite-head"><div><strong>${esc(s.suite_name)}</strong><span class="orb-sub">${esc(s.suite_code)} · ${esc(s.suite_type)}</span></div>${statusPill}</div>
        <div class="orb-suite-body">${main}
            ${queue.length ? `<div class="orb-queue"><span>Up next</span>${queue.map((q) => `<div class="orb-qrow" data-orb-open="${q.id}">
                <span class="tm">${esc(fmtTimeOfDay(q.scheduled_start_time))}</span><span class="n">${patientName(q)} — ${esc(q.procedure_name)}</span>
                <span class="orb-mini">${checks(q, true)}</span></div>`).join("")}</div>` : ""}
            ${s.done.length ? `<span class="orb-sub">${s.done.length} done ${state.data.is_today ? "today" : "that day"}: ${s.done.map((x) => `${esc(x.case_number)} (${esc(STAGE_SHORT[x.perioperative_stage])})`).join(", ")}</span>` : ""}
        </div></div>`;
}

function pacuRow(c) {
    const r = c.recovery || {};
    const since = c.actual_out_room_time ? minutesSince(c.actual_out_room_time) : null;
    const ready = r.criteria_total && r.criteria_met === r.criteria_total;
    return `<div class="orb-prow ${ready ? "ready" : ""}">
        <div class="orb-who"><b>${patientName(c)}</b> ${c.allergies.length ? `<span class="orb-pill bad">⚠ Allergy</span>` : ""}
            <span class="orb-sub">${esc(c.procedure_name)} · ${esc(c.case_number)}${c.pacu_bed_no ? ` · PACU bed ${esc(c.pacu_bed_no)}` : ""}</span></div>
        <div class="orb-scores"><span>Aldrete <b>${r.aldrete ?? "–"}</b>/10</span><span>Pain <b>${r.pain ?? "–"}</b>/10</span><span>In recovery <b>${since != null ? fmtMin(since) : "–"}</b></span></div>
        <div class="orb-chips"><span class="orb-pill ${ready ? "ok" : "warn"}" title="${esc((r.unmet || []).join("; "))}">${ready ? "Ready for release" : `${r.criteria_met ?? 0}/${r.criteria_total ?? 5} release criteria`}</span>
            ${r.readings ? "" : `<span class="orb-pill bad">No readings yet</span>`}</div>
        <div class="orb-actions">${nextButton(c)}<button type="button" class="orb-btn small" data-orb-open="${c.id}">Open case</button></div>
    </div>`;
}

function nextCase(c) {
    const t = timing(c);
    const start = startAt(c);
    const until = start ? (start - systemNow()) / 60000 : null;
    return `<div class="orb-queue" style="border-top:none;padding-top:0;"><span>Next case</span>
        <div class="orb-who"><b>${patientName(c)}</b> ${priorityPill(c)} ${c.allergies.length ? `<span class="orb-pill bad">⚠ Allergy</span>` : ""}</div>
        <div class="orb-proc">${esc(c.procedure_name)}${c.laterality ? ` (${esc(c.laterality)})` : ""}<span class="orb-sub">${esc(c.lead_surgeon)} · ${esc(fmtTimeOfDay(c.scheduled_start_time))}${until != null && until > 0 && state.data.is_today ? ` · in ${fmtMin(until)}` : ""} · ${esc(STAGE_SHORT[c.perioperative_stage])}</span></div>
        <div class="orb-chips">${checks(c)}${delayChips(c, t)}</div>
        <div class="orb-actions">${nextButton(c)}<button type="button" class="orb-btn small" data-orb-open="${c.id}">Open case</button></div></div>`;
}

/* ---------------------------------------------------------------
 * Actions
 * ------------------------------------------------------------- */

function findCase(id) {
    return state.data?.cases.find((c) => Number(c.id) === Number(id));
}

async function onClick(e) {
    const next = e.target.closest("[data-orb-next]");
    if (next) {
        const c = findCase(next.dataset.orbNext);
        if (c) advanceStage(c, { onDone: () => load(true) });
        return;
    }
    const recovery = e.target.closest("[data-orb-recovery]");
    if (recovery) {
        openOrCase(Number(recovery.dataset.orbRecovery), { tab: "recovery", onChange: () => load(true) });
        return;
    }
    const check = e.target.closest("[data-orb-check]");
    if (check) {
        openOrCase(Number(check.dataset.orbCheck), { tab: "checklist", onChange: () => load(true) });
        return;
    }
    const ready = e.target.closest("[data-orb-ready]");
    if (ready) {
        ready.disabled = true;
        const res = await setOrSuiteStatus(Number(ready.dataset.orbReady), "Available");
        showToast(res?.success ? "Room marked ready." : res?.message || "Couldn't update the room.", res?.success ? "success" : "error");
        await load(true);
        return;
    }
    const open = e.target.closest("[data-orb-open]");
    if (open) openOrCase(Number(open.dataset.orbOpen), { onChange: () => load(true) });
}
