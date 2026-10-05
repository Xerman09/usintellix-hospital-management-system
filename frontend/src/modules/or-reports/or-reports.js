import { fetchOrReportOptions, fetchOrReport } from "./or-reports.service.js?v=1";
import { openOrCase } from "../or-board/or-case-panel.js?v=3";
import { todayISO } from "../../core/timezone.js";

let state = { report: "utilization", data: null, options: null, tables: {} };
let loadSeq = 0;
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = (v) => (v == null ? "—" : Number(v).toLocaleString());
const pct = (v) => (v == null ? "—" : `${v}%`);
const mins = (v) => {
    if (v == null) return "—";
    const m = Math.round(v);
    return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
};
const hours = (v) => (v == null ? "—" : `${(v / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`);
const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
/** A bar for a percentage; tone: higher-is-better (good) or lower-is-better (low). */
const bar = (value, tone = "good", max = 100) => {
    if (value == null) return "—";
    const w = Math.max(0, Math.min(100, (value / max) * 100));
    const cls = tone === "good" ? (value >= 80 ? "good" : value >= 50 ? "warn" : "bad") : tone === "low" ? (value <= 5 ? "good" : value <= 15 ? "warn" : "bad") : "";
    return `<div class="orr-bar ${cls}"><i style="width:${w}%"></i><span>${value}%</span></div>`;
};

export async function initOrReports() {
    state = { report: "utilization", data: null, options: null, tables: {} };
    const today = todayISO();
    $("orrFrom").value = `${today.slice(0, 8)}01`;
    $("orrTo").value = today;
    document.querySelectorAll("[data-orr]").forEach((b) => b.addEventListener("click", () => {
        state.report = b.dataset.orr;
        document.querySelectorAll("[data-orr]").forEach((x) => x.classList.toggle("active", x === b));
        load();
    }));
    ["orrFrom", "orrTo", "orrSpec", "orrSuite", "orrHours", "orrDays"].forEach((id) => $(id).addEventListener("change", load));
    document.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => {
        const t = todayISO();
        const [y, m] = t.split("-").map(Number);
        const iso = (yy, mm, dd) => `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        if (b.dataset.range === "month") { $("orrFrom").value = iso(y, m, 1); $("orrTo").value = t; }
        if (b.dataset.range === "last") {
            const ly = m === 1 ? y - 1 : y, lm = m === 1 ? 12 : m - 1;
            $("orrFrom").value = iso(ly, lm, 1);
            $("orrTo").value = iso(ly, lm, new Date(ly, lm, 0).getDate());
        }
        if (b.dataset.range === "year") { $("orrFrom").value = iso(y, 1, 1); $("orrTo").value = t; }
        load();
    }));
    $("orrPrint").addEventListener("click", () => window.print());
    $("orrBody").addEventListener("click", onBodyClick);

    const o = await fetchOrReportOptions();
    if (o?.success) {
        state.options = o.data;
        $("orrSpec").innerHTML = `<option value="">All specializations</option>` + o.data.specializations
            .sort((a, b) => (a.category === "surgical" ? 0 : 1) - (b.category === "surgical" ? 0 : 1) || a.name.localeCompare(b.name))
            .map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
        $("orrSuite").innerHTML = `<option value="">All suites</option>` + o.data.suites.map((s) => `<option value="${s.id}">${esc(s.suite_name)}</option>`).join("");
    }
    await load();
}

async function load() {
    const seq = ++loadSeq;
    document.querySelectorAll("[data-only]").forEach((el) => { el.hidden = el.dataset.only !== state.report; });
    $("orrBody").innerHTML = `<div class="orr-empty">Loading...</div>`;
    const filters = { date_from: $("orrFrom").value, date_to: $("orrTo").value, specialization_id: $("orrSpec").value, suite_id: $("orrSuite").value };
    if (state.report === "utilization") Object.assign(filters, { hours_per_day: $("orrHours").value, operating_days: $("orrDays").value });
    const r = await fetchOrReport(state.report, filters);
    if (seq !== loadSeq || !$("orrBody")) return;
    if (!r?.success) {
        $("orrBody").innerHTML = `<div class="orr-empty">${esc(r?.message || "Couldn't load the report.")}</div>`;
        return;
    }
    state.data = r.data;
    state.tables = {};
    const html = { utilization, timeliness, cancellations, volume, compliance, ssi }[state.report](r.data);
    $("orrBody").innerHTML = html;
}

function kpis(items) {
    return `<div class="orr-kpis">${items.map(([label, value, sub]) => `<div class="orr-kpi"><span>${esc(label)}</span><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ""}</div>`).join("")}</div>`;
}

/** A card with a table; columns: [label, row => html, csv value fn?, right-aligned?]. Rows with case_id open the case. */
function table(id, title, columns, rows, empty = "Nothing for these filters.") {
    state.tables[id] = { title, columns, rows };
    return `<div class="orr-card"><div class="orr-card-head"><span>${esc(title)}</span>${rows.length ? `<button type="button" class="orr-btn small" data-csv="${id}">CSV</button>` : ""}</div>
        ${rows.length ? `<div class="orr-wrap"><table class="orr-table"><thead><tr>${columns.map((c) => `<th class="${c[3] ? "r" : ""}">${esc(c[0])}</th>`).join("")}</tr></thead><tbody>
            ${rows.map((r) => `<tr ${r.case_id ? `data-case="${r.case_id}" title="Open the case"` : ""}>${columns.map((c) => `<td class="${c[3] ? "r" : ""}">${c[1](r)}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>` : `<div class="orr-empty">${esc(empty)}</div>`}</div>`;
}

function onBodyClick(e) {
    const csv = e.target.closest("[data-csv]");
    if (csv) return downloadCsv(csv.dataset.csv);
    const row = e.target.closest("[data-case]");
    if (row) openOrCase(Number(row.dataset.case), { onChange: load });
}

function downloadCsv(id) {
    const t = state.tables[id];
    if (!t) return;
    const strip = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent.trim(); };
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [t.columns.map((c) => cell(c[0])).join(","), ...t.rows.map((r) => t.columns.map((c) => cell(c[2] ? c[2](r) : strip(c[1](r)))).join(","))];
    const f = state.data.filters;
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${t.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${f.date_from}-to-${f.date_to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------------------------------------------------------------
 * Reports
 * ------------------------------------------------------------- */

function utilization(d) {
    const s = d.summary;
    return `<p class="orr-note">Time in the room (in → out) against staffed time: ${esc(d.filters.hours_per_day)} h a day × ${d.operating_days} operating days per suite.
        ${d.filters.specialization_id ? "With a specialization chosen, only its cases count toward each suite's time." : ""}</p>
        ${kpis([
            ["Utilization", pct(s.used_pct), `${hours(s.used_minutes)} of ${hours(s.staffed_minutes)}`],
            ["Booked", pct(s.booked_pct), "planned durations"],
            ["Cases", n(s.cases), s.missing_times ? `${s.missing_times} without in/out times` : ""]
        ])}
        ${table("suite", "By suite", [
            ["Suite", (r) => `<strong>${esc(r.suite)}</strong>`, (r) => r.suite],
            ["Cases", (r) => n(r.cases), (r) => r.cases, true],
            ["Booked", (r) => hours(r.booked_minutes), (r) => r.booked_minutes, true],
            ["In room", (r) => hours(r.used_minutes), (r) => r.used_minutes, true],
            ["Staffed", (r) => hours(r.staffed_minutes), (r) => r.staffed_minutes, true],
            ["Utilization", (r) => bar(r.used_pct), (r) => r.used_pct]
        ], d.by_suite)}
        ${table("spec", "By specialization", [
            ["Specialization", (r) => `<strong>${esc(r.specialization)}</strong>`, (r) => r.specialization],
            ["Cases", (r) => n(r.cases), (r) => r.cases, true],
            ["In room", (r) => hours(r.used_minutes), (r) => r.used_minutes, true],
            ["Share of OR time", (r) => bar(r.share_pct, ""), (r) => r.share_pct],
            ["Block time", (r) => (r.block_minutes ? hours(r.block_minutes) : "—"), (r) => r.block_minutes, true],
            ["Block used", (r) => (r.block_use_pct == null ? "—" : bar(r.block_use_pct, "good", Math.max(100, r.block_use_pct))), (r) => r.block_use_pct]
        ], d.by_specialization)}`;
}

function timeliness(d) {
    const s = d.summary;
    return `<p class="orr-note">A first case is on time if the patient is in the room within ${d.grace_minutes} minutes of the booked start. Turnover is the cleaning time between cases, recorded when the next patient goes in.</p>
        ${kpis([
            ["First-case on time", pct(s.on_time_pct), `${n(s.on_time)} of ${n(s.first_cases)} first cases`],
            ["Late by (average)", mins(s.avg_minutes_late), "late first cases"],
            ["Turnover (average)", mins(s.turnover_avg), `median ${mins(s.turnover_median)} · ${n(s.turnovers)} turnovers`],
            ["Over the cleaning target", n(s.turnover_over_target), "turnovers"]
        ])}
        ${table("suite", "By suite", [
            ["Suite", (r) => `<strong>${esc(r.suite)}</strong>`, (r) => r.suite],
            ["First cases", (r) => n(r.first_cases), (r) => r.first_cases, true],
            ["On time", (r) => bar(r.on_time_pct), (r) => r.on_time_pct],
            ["Turnovers", (r) => n(r.turnovers), (r) => r.turnovers, true],
            ["Average", (r) => mins(r.turnover_avg), (r) => r.turnover_avg, true],
            ["Median", (r) => mins(r.turnover_median), (r) => r.turnover_median, true],
            ["Target", (r) => mins(r.turnover_target), (r) => r.turnover_target, true],
            ["Over target", (r) => n(r.over_target), (r) => r.over_target, true]
        ], d.by_suite)}
        ${table("late", "Late first cases", [
            ["Date", (r) => esc(fmtDate(r.date)), (r) => r.date],
            ["Case", (r) => esc(r.case_number), (r) => r.case_number],
            ["Suite", (r) => esc(r.suite), (r) => r.suite],
            ["Surgeon", (r) => esc(r.surgeon), (r) => r.surgeon],
            ["Procedure", (r) => esc(r.procedure), (r) => r.procedure],
            ["Booked", (r) => esc(r.booked), (r) => r.booked, true],
            ["In room", (r) => esc(r.in_room), (r) => r.in_room, true],
            ["Late", (r) => `<span class="orr-pill ${r.minutes_late > 30 ? "bad" : "warn"}">${mins(r.minutes_late)}</span>`, (r) => r.minutes_late, true],
            ["Delay reason", (r) => esc(r.delay_reason || "—"), (r) => r.delay_reason]
        ], d.late_first_cases, "No late first cases.")}`;
}

function cancellations(d) {
    const s = d.summary;
    return `${kpis([
            ["Cancelled", n(s.cancelled), `of ${n(s.booked)} booked`],
            ["Cancellation rate", pct(s.rate_pct), ""],
            ["On the day", n(s.same_day), "cancelled on or after the surgery date"],
            ["Abandoned in the room", n(s.abandoned), "before the incision"]
        ])}
        <div class="orr-grid2">
        ${table("reason", "By reason", [
            ["Reason", (r) => esc(r.reason), (r) => r.reason],
            ["Cases", (r) => n(r.count), (r) => r.count, true],
            ["On the day", (r) => n(r.same_day), (r) => r.same_day, true]
        ], d.by_reason, "No cancellations.")}
        ${table("spec", "By specialization", [
            ["Specialization", (r) => esc(r.specialization), (r) => r.specialization],
            ["Booked", (r) => n(r.booked), (r) => r.booked, true],
            ["Cancelled", (r) => n(r.cancelled), (r) => r.cancelled, true],
            ["Rate", (r) => bar(r.rate_pct, "low"), (r) => r.rate_pct]
        ], d.by_specialization)}
        </div>
        ${table("cases", "Cancelled cases", [
            ["Date", (r) => `${esc(fmtDate(r.date))} ${esc(r.start)}`, (r) => `${r.date} ${r.start}`],
            ["Case", (r) => esc(r.case_number), (r) => r.case_number],
            ["Patient", (r) => esc(r.patient), (r) => r.patient],
            ["Procedure", (r) => esc(r.procedure), (r) => r.procedure],
            ["Surgeon", (r) => esc(r.surgeon), (r) => r.surgeon],
            ["Reason", (r) => `${esc(r.reason)} ${r.abandoned ? `<span class="orr-pill bad">In the room</span>` : r.same_day ? `<span class="orr-pill warn">On the day</span>` : ""}`, (r) => r.reason],
            ["Cancelled by", (r) => `${esc(r.cancelled_by || "")}<br><small>${esc(fmtDate(r.cancelled_at))}</small>`, (r) => `${r.cancelled_by || ""} ${r.cancelled_at || ""}`]
        ], d.cases, "No cancellations.")}`;
}

function volume(d) {
    const s = d.summary;
    const cols = (first) => [
        [first, (r) => `<strong>${esc(r.label)}</strong>`, (r) => r.label],
        ["Cases", (r) => n(r.cases), (r) => r.cases, true],
        ["Urgent / emergency", (r) => n(r.urgent_or_emergency), (r) => r.urgent_or_emergency, true],
        ["Avg in room", (r) => mins(r.avg_in_room), (r) => r.avg_in_room, true],
        ["Avg incision → closing", (r) => mins(r.avg_surgery), (r) => r.avg_surgery, true],
        ["Avg planned", (r) => mins(r.avg_planned), (r) => r.avg_planned, true],
        ["Total in room", (r) => hours(r.total_in_room), (r) => r.total_in_room, true]
    ];
    return `<p class="orr-note">Completed cases: the patient went out of the room (recovery or released).</p>
        ${kpis([["Completed cases", n(s.completed), ""], ["Surgeons", n(s.surgeons), ""], ["Procedures", n(s.procedures), ""]])}
        ${table("surgeon", "By surgeon", cols("Surgeon"), d.by_surgeon)}
        ${table("spec", "By specialization", cols("Specialization"), d.by_specialization)}
        ${table("proc", "By procedure", cols("Procedure"), d.by_procedure)}`;
}

function compliance(d) {
    const s = d.summary;
    return `<p class="orr-note">For completed cases: each part of the WHO checklist done, and done in time — Sign-In before the patient went into the room, Time-Out before the incision, Sign-Out before leaving the room.</p>
        ${kpis([
            ["Fully compliant", pct(s.full_pct), `${n(s.full)} of ${n(s.cases)} cases`],
            ["Sign-In in time", pct(s.sign_in_pct), `${n(s.sign_in_done)} done`],
            ["Time-Out in time", pct(s.time_out_pct), `${n(s.time_out_done)} done`],
            ["Sign-Out in time", pct(s.sign_out_pct), `${n(s.sign_out_done)} done`],
            ["Count discrepancies", n(s.count_issues), ""],
            ["Near misses", n(s.near_misses), `${n(s.equipment_problems)} equipment problems`]
        ])}
        ${table("spec", "By specialization", [
            ["Specialization", (r) => `<strong>${esc(r.specialization)}</strong>`, (r) => r.specialization],
            ["Cases", (r) => n(r.cases), (r) => r.cases, true],
            ["Fully compliant", (r) => bar(r.full_pct), (r) => r.full_pct],
            ["Time-Out before incision", (r) => bar(r.time_out_pct), (r) => r.time_out_pct]
        ], d.by_specialization)}
        ${table("ex", "Cases to review", [
            ["Date", (r) => esc(fmtDate(r.date)), (r) => r.date],
            ["Case", (r) => esc(r.case_number), (r) => r.case_number],
            ["Procedure", (r) => esc(r.procedure), (r) => r.procedure],
            ["Surgeon", (r) => esc(r.surgeon), (r) => r.surgeon],
            ["Checklist", (r) => `<span class="orr-pill ${r.compliant ? "ok" : "bad"}">${r.compliant ? "Compliant" : "Not compliant"}</span>`, (r) => (r.compliant ? "Compliant" : "Not compliant")],
            ["Issues", (r) => r.issues.map((i) => `<span class="orr-pill ${/missing|late/.test(i) ? "bad" : "warn"}">${esc(i)}</span>`).join(""), (r) => r.issues.join("; ")]
        ], d.exceptions, "Every completed case was fully compliant.")}`;
}

function ssi(d) {
    const s = d.summary;
    return `<p class="orr-note">Surgical-site infections from the HAI &amp; SSI register (type SSI) for the same patient with onset within ${d.window_days} days of surgery (${d.window_days_implant} with an implant).
        Record new infections in <a href="javascript:void(0)" onclick="window.__openDashboardTab && window.__openDashboardTab('clinic_hai_ssi', 'HAI & SSI Infections')">HAI &amp; SSI Infections</a>.</p>
        ${kpis([
            ["SSI rate", pct(s.rate_pct), `${n(s.infected)} of ${n(s.cases)} completed cases`],
            ["Still in follow-up", n(s.in_follow_up), "surveillance window still open"]
        ])}
        <div class="orr-grid2">
        ${table("spec", "By specialization", [
            ["Specialization", (r) => `<strong>${esc(r.specialization)}</strong>`, (r) => r.specialization],
            ["Cases", (r) => n(r.cases), (r) => r.cases, true],
            ["Infections", (r) => n(r.infections), (r) => r.infections, true],
            ["Rate", (r) => bar(r.rate_pct, "low"), (r) => r.rate_pct]
        ], d.by_specialization)}
        ${table("wound", "By wound class", [
            ["Wound class", (r) => `<strong>${esc(r.wound_class)}</strong>`, (r) => r.wound_class],
            ["Cases", (r) => n(r.cases), (r) => r.cases, true],
            ["Infections", (r) => n(r.infections), (r) => r.infections, true],
            ["Rate", (r) => bar(r.rate_pct, "low"), (r) => r.rate_pct]
        ], d.by_wound_class)}
        </div>
        ${table("inf", "Infections", [
            ["Tracking no.", (r) => esc(r.tracking_number), (r) => r.tracking_number],
            ["Case", (r) => esc(r.case_number), (r) => r.case_number],
            ["Patient", (r) => esc(r.patient), (r) => r.patient],
            ["Procedure", (r) => esc(r.procedure), (r) => r.procedure],
            ["Surgeon", (r) => esc(r.surgeon), (r) => r.surgeon],
            ["Surgery", (r) => esc(fmtDate(r.surgery_date)), (r) => r.surgery_date],
            ["Onset", (r) => `${esc(fmtDate(r.onset_date))}<br><small>day ${r.days_after}</small>`, (r) => r.onset_date],
            ["Type", (r) => esc(r.category), (r) => r.category],
            ["Pathogen", (r) => esc(r.pathogen || "—"), (r) => r.pathogen],
            ["Status", (r) => `<span class="orr-pill ${r.status === "Resolved" || r.status === "Closed" ? "ok" : "warn"}">${esc(r.status)}</span>`, (r) => r.status]
        ], d.infections, "No surgical-site infections recorded for these cases.")}
        ${table("watch", "In follow-up (surveillance window open)", [
            ["Case", (r) => esc(r.case_number), (r) => r.case_number],
            ["Patient", (r) => esc(r.patient), (r) => r.patient],
            ["Procedure", (r) => `${esc(r.procedure)}${r.implant ? ` <span class="orr-pill">Implant</span>` : ""}`, (r) => r.procedure],
            ["Surgeon", (r) => esc(r.surgeon), (r) => r.surgeon],
            ["Surgery", (r) => esc(fmtDate(r.surgery_date)), (r) => r.surgery_date],
            ["Watch until", (r) => esc(fmtDate(r.watch_until)), (r) => r.watch_until]
        ], d.follow_up, "No cases in follow-up.")}`;
}
