import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { esc, ago } from "../alerts/alert-bell.js?v=11";

/*
 * My Work: the first screen after login -- what is assigned to me today.
 *   nurse:    my patients this shift, medicines due, vitals due, tasks (hand-overs, reminders)
 *   everyone: tasks (Phase 2) -- given to me, my role, or me as the patient's nurse, with a due
 *             time; Done records who and when. "I gave" shows who did mine and when.
 *   doctor:   my admitted patients, results to review, today's appointments, OR cases
 *   pharmacy: orders to verify, ward restock requests
 *   lab:      pending lab and radiology orders
 * Every line opens the screen where the work is done. Refreshes every minute while open.
 */

const REFRESH_MS = 60000;
/** Roles that land on My Work after signing in. */
export const MY_WORK_ROLES = ["nurse", "charge_nurse", "cna", "doctor", "clinician", "pharmacist", "lab_technician", "admin"];
const LOGIN_FLAG = "myWorkAtLogin";

let timer = null;
let data = null;
let seq = 0;
let taskView = "mine";   // mine | given | done

/** Set when the person signs in: the dashboard opens on My Work. */
export function markMyWorkLogin() {
    try { sessionStorage.setItem(LOGIN_FLAG, "1"); } catch { /* storage blocked */ }
}

/** Was My Work asked for by a fresh sign-in? (asked once) */
export function takeMyWorkLogin() {
    try {
        const v = sessionStorage.getItem(LOGIN_FLAG) === "1";
        sessionStorage.removeItem(LOGIN_FLAG);
        return v;
    } catch {
        return false;
    }
}

const CSS = `
.mw { padding: 20px 24px 40px; max-width: 1400px; margin: 0 auto; color: var(--text-primary); }
.mw-head { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; }
.mw-head h1 { margin: 0; font-size: 22px; }
.mw-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.mw-tools { display: flex; gap: 8px; align-items: center; color: var(--text-muted); font-size: 12.5px; }
.mw-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.mw-btn:hover { background: var(--bg-surface-alt); }
.mw-btn:focus-visible, .mw-row:focus-visible, .mw-tile:focus-visible, .mw-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.mw-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 18px; }
.mw-tile { text-align: left; border: 1px solid var(--border-color); background: var(--bg-surface); color: inherit; border-radius: 12px; padding: 12px 14px; cursor: pointer; font: inherit; }
.mw-tile:hover { background: var(--bg-surface-alt); }
.mw-tile .k { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.mw-tile .v { font-size: 26px; font-weight: 800; line-height: 1.2; margin-top: 2px; }
.mw-tile .s { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.mw-tile.red { border-color: #fca5a5; }
.mw-tile.red .v { color: #b91c1c; }
.mw-tile.amber .v { color: #b45309; }
:root[data-theme="dark"] .mw-tile.red { border-color: #7f1d1d; }
:root[data-theme="dark"] .mw-tile.red .v { color: #fca5a5; }
:root[data-theme="dark"] .mw-tile.amber .v { color: #fbbf24; }
.mw-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
@media (max-width: 1100px) { .mw-grid { grid-template-columns: minmax(0, 1fr); } }
.mw-card { border: 1px solid var(--border-color); background: var(--bg-surface); border-radius: 12px; overflow: hidden; scroll-margin-top: 80px; }
.mw-card.wide { grid-column: 1 / -1; }
.mw-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
.mw-card-head h2 { margin: 0; font-size: 15px; }
.mw-count { font-size: 12px; font-weight: 700; color: var(--text-muted); margin-left: 6px; }
.mw-link { background: none; border: 0; color: var(--accent); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 2px 4px; border-radius: 4px; white-space: nowrap; }
.mw-link:hover { text-decoration: underline; }
.mw-list { max-height: 440px; overflow-y: auto; }
.mw-row { display: flex; gap: 12px; align-items: flex-start; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--border-color); background: none; color: inherit; font: inherit; padding: 10px 16px; cursor: pointer; }
.mw-row:last-child { border-bottom: 0; }
.mw-row:hover { background: var(--bg-surface-alt); }
.mw-row.red { box-shadow: inset 4px 0 0 #dc2626; }
.mw-row.amber { box-shadow: inset 4px 0 0 #f59e0b; }
.mw-main { flex: 1; min-width: 0; }
.mw-title { font-weight: 700; font-size: 13.5px; overflow-wrap: anywhere; }
.mw-meta { color: var(--text-muted); font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
.mw-side { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; max-width: 50%; }
.mw-time { font-weight: 800; font-size: 14px; min-width: 48px; font-variant-numeric: tabular-nums; }
.mw-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--bg-surface-alt); color: var(--text-muted); white-space: nowrap; }
.mw-pill.red { background: #fee2e2; color: #b91c1c; }
.mw-pill.amber { background: #fef3c7; color: #92400e; }
.mw-pill.green { background: #dcfce7; color: #166534; }
.mw-pill.blue { background: var(--accent-light); color: var(--accent); }
:root[data-theme="dark"] .mw-pill.red { background: #7f1d1d; color: #fecaca; }
:root[data-theme="dark"] .mw-pill.amber { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .mw-pill.green { background: #14532d; color: #bbf7d0; }
.mw-empty { padding: 22px 16px; text-align: center; color: var(--text-muted); font-size: 13px; }
.mw-note { padding: 8px 16px; font-size: 12px; color: var(--text-muted); background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
.mw-done { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 6px; padding: 3px 9px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.mw-done:hover { background: var(--bg-surface-alt); }
.mw-loading { padding: 40px; text-align: center; color: var(--text-muted); }
.mw-tabs { display: flex; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; }
.mw-tab { border: 1px solid var(--border-color); background: transparent; color: var(--text-muted); border-radius: 999px; padding: 3px 11px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.mw-tab[aria-selected="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
.mw-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.mw-new { border: 1px solid var(--accent); background: var(--accent); color: #fff; border-radius: 8px; padding: 5px 11px; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.mw-new:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.mw-inline { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 16px 10px 16px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
.mw-inline input { flex: 1 1 200px; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 9px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
.mw-inline input[aria-invalid="true"] { border-color: #dc2626; }
.mw-inline .mw-err { flex-basis: 100%; color: #dc2626; font-size: 12px; }
.mw-done.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.mw-sep { padding: 6px 16px; font-size: 11.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--text-muted); background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
@media (max-width: 600px) { .mw { padding: 14px 16px 32px; } .mw-side { max-width: 45%; } }
`;

export function MyWorkView() {
    return `<style>${CSS}</style><div class="mw" id="myWork"><div class="mw-loading">Loading your work…</div></div>`;
}

export function initMyWork() {
    clearInterval(timer);
    load();
    timer = setInterval(() => {
        if (!document.getElementById("myWork")) {
            clearInterval(timer);
            return;
        }
        if (!document.hidden && !document.querySelector("#myWork .mw-inline")) load(true);
    }, REFRESH_MS);
}

async function load(quiet = false) {
    const root = document.getElementById("myWork");
    if (!root) return;
    const n = ++seq;
    const res = await api("/my-work").catch(() => null);
    if (n !== seq || !document.getElementById("myWork")) return;
    if (!res?.success) {
        if (!quiet) root.innerHTML = `<div class="mw-empty">${esc(res?.message || "Could not load your work. Try again.")}</div>`;
        return;
    }
    data = res.data;
    const keep = document.activeElement?.dataset?.mwKey;
    const scroll = [...root.querySelectorAll(".mw-list")].map((l) => l.scrollTop);
    render(root);
    root.querySelectorAll(".mw-list").forEach((l, i) => { l.scrollTop = scroll[i] || 0; });
    if (keep) root.querySelector(`[data-mw-key="${window.CSS.escape(keep)}"]`)?.focus();
}

/* ---------------- helpers ---------------- */

const hm = (dt) => (dt ? String(dt).slice(11, 16) : "");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const bed = (p) => [p.ward, p.bed].filter(Boolean).join(" · ");
const waited = (min) => (min < 60 ? `${min} min` : min < 1440 ? `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ""}`.trim() : plural(Math.floor(min / 1440), "day"));

function greeting() {
    const h = Number(String(data.now).slice(11, 13));
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function longDate(d) {
    const [y, m, day] = String(d).split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day));
    return dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

function tile(target, label, value, sub, tone = "") {
    return `<button type="button" class="mw-tile ${tone}" data-mw-go="${target}"><div class="k">${esc(label)}</div><div class="v">${value}</div>${sub ? `<div class="s">${sub}</div>` : ""}</button>`;
}

function card(id, title, count, body, { link, note, wide } = {}) {
    return `<section class="mw-card${wide ? " wide" : ""}" id="mw-${id}" aria-labelledby="mw-${id}-h">
        <div class="mw-card-head"><h2 id="mw-${id}-h">${esc(title)}${count != null ? `<span class="mw-count">${count}</span>` : ""}</h2>
            ${link ? `<button type="button" class="mw-link" data-mw-tab="${link[0]}" data-mw-title="${esc(link[1])}">${esc(link[2] || "Open")} →</button>` : ""}</div>
        ${note ? `<div class="mw-note">${note}</div>` : ""}
        <div class="mw-list">${body}</div></section>`;
}

const empty = (t) => `<div class="mw-empty">${esc(t)}</div>`;

function row(key, act, { tone = "", title, meta = "", side = "", lead = "", extra = "" }) {
    return `<div class="mw-row ${tone}" role="button" tabindex="0" data-mw-key="${esc(key)}" data-mw-act="${esc(act)}">
        ${lead}<div class="mw-main"><div class="mw-title">${title}</div>${meta ? `<div class="mw-meta">${meta}</div>` : ""}</div>
        ${side || extra ? `<div class="mw-side">${side}${extra}</div>` : ""}</div>`;
}

const pill = (t, tone = "") => `<span class="mw-pill ${tone}">${t}</span>`;

/* ---------------- sections ---------------- */

const VITALS = { overdue: ["Vitals overdue", "red"], due: ["Vitals due", "amber"], due_soon: ["Vitals due soon", ""] };

function nurseSections(s, cna) {
    const pts = s.patients.items;
    const tiles = [
        tile("patients", "My patients", s.patients.count, data.shift?.name ? esc(`${data.shift.name} shift`) : ""),
        cna ? "" : tile("meds", "Medicines", s.meds.late + s.meds.due, s.meds.late ? `<b>${s.meds.late} late</b> · ${s.meds.due} due` : `${s.meds.due} due now`, s.meds.late ? "red" : s.meds.due ? "amber" : ""),
        tile("vitals", "Vitals", s.vitals.overdue + s.vitals.due, s.vitals.overdue ? `<b>${s.vitals.overdue} overdue</b> · ${s.vitals.due} due` : `${s.vitals.due} due · ${s.vitals.due_soon} soon`, s.vitals.overdue ? "red" : s.vitals.due ? "amber" : ""),
        tasksTile(s),
    ].join("");

    const patientRows = pts.map((p) => {
        const pills = [];
        if (p.meds?.late) pills.push(pill(`${p.meds.late} late med${p.meds.late > 1 ? "s" : ""}`, "red"));
        else if (p.meds?.due) pills.push(pill(`${p.meds.due} med${p.meds.due > 1 ? "s" : ""} due`, "amber"));
        if (p.vitals && VITALS[p.vitals.state]) pills.push(pill(VITALS[p.vitals.state][0], VITALS[p.vitals.state][1]));
        if (p.vitals?.news2?.score >= 5) pills.push(pill(`NEWS2 ${p.vitals.news2.score}`, "red"));
        if (p.isolation) pills.push(pill(esc(p.isolation), "blue"));
        if (p.handover && !p.handover.received) pills.push(pill("Hand-over to read", "amber"));
        return row(`p${p.admission_id}`, `chart:${p.patient_id}`, {
            title: esc(p.patient_name), meta: [bed(p), p.diagnosis, p.my_role === "cna" ? `CNA (nurse: ${p.nurse_name || "—"})` : p.cna_name ? `CNA: ${p.cna_name}` : ""].filter(Boolean).map(esc).join(" · "),
            side: pills.join(""),
        });
    }).join("");

    const medRows = cna ? "" : s.meds.items.map((p) => row(`m${p.admission_id}`, `mar:${p.admission_id}`, {
        tone: p.meds.late ? "red" : "amber", title: esc(p.patient_name), meta: esc(bed(p)) + (p.meds.next_due_at ? ` · ${p.meds.next_due_at <= data.now ? "due since" : "next"} ${esc(hm(p.meds.next_due_at))}` : ""),
        side: (p.meds.late ? pill(`${p.meds.late} late`, "red") : "") + (p.meds.due ? pill(`${p.meds.due} due`, "amber") : "") + (p.meds.late_high_alert ? pill("High-alert late", "red") : ""),
    })).join("");

    const vitalRows = s.vitals.items.map((p) => {
        const [label, tone] = VITALS[p.vitals.state];
        const when = p.vitals.never ? "never taken" : p.vitals.minutes >= 0 ? `due ${esc(hm(p.vitals.next_due))}` : `due at ${esc(hm(p.vitals.next_due))}`;
        return row(`v${p.admission_id}`, "tab:inpatient_vitals:Vital Signs", {
            tone, title: esc(p.patient_name), meta: `${esc(bed(p))} · ${when}`,
            side: pill(label, tone) + (p.vitals.news2 ? pill(`NEWS2 ${p.vitals.news2.score}`, p.vitals.news2.score >= 5 ? "red" : "") : ""),
        });
    }).join("");

    return `<div class="mw-tiles">${tiles}</div><div class="mw-grid">
        ${card("patients", "My patients", s.patients.count, patientRows || empty("No patients assigned to you this shift. The charge nurse assigns them in Shift Assignments."),
            { link: ["nurse_assignments", "Shift Assignments", "Assignments"], wide: true })}
        ${cna ? "" : card("meds", "Medicines due", s.meds.late + s.meds.due, medRows || empty("No medicines late or due for your patients right now."), { link: ["mar", "Medicine Rounds", "Medicine rounds"] })}
        ${card("vitals", "Vitals due", s.vitals.items.length, vitalRows || empty("All your patients' vitals are up to date."), { link: ["inpatient_vitals", "Vital Signs", "Vital signs"] })}
        ${tasksCard(s)}
    </div>`;
}

function doctorSections(s) {
    const r = s.results;
    const tiles = [
        tile("patients", "My inpatients", s.patients.count, s.patients.items.some((p) => p.critical_labs) ? "<b>critical lab waiting</b>" : "", s.patients.items.some((p) => p.critical_labs) ? "red" : ""),
        tile("results", "Results to review", r.to_review, r.overdue ? `<b>${r.overdue} over ${r.review_days} days</b>` : r.new ? `${r.new} new` : "", r.overdue ? "red" : r.to_review ? "amber" : ""),
        tile("appointments", "Appointments today", s.appointments.count, s.appointments.items.length ? `next ${esc(nextAppt(s.appointments.items) || "—")}` : ""),
        tile("or", "OR cases", s.or_cases.count, s.or_cases.items.length ? "today & tomorrow" : ""),
        tasksTile(s),
    ].join("");

    const patientRows = s.patients.items.map((p) => row(`p${p.admission_id}`, `chart:${p.patient_id}`, {
        tone: p.critical_labs ? "red" : p.news2?.score >= 5 ? "amber" : "", title: esc(p.patient_name),
        meta: [bed(p), p.nurse_name ? `Nurse: ${p.nurse_name}` : "", p.status === "Pending Discharge" ? "Pending discharge" : ""].filter(Boolean).map(esc).join(" · "),
        side: (p.critical_labs ? pill(`⚠ Critical lab${p.critical_labs > 1 ? ` ×${p.critical_labs}` : ""}`, "red") : "")
            + (p.news2 ? pill(`NEWS2 ${p.news2.score}`, p.news2.score >= 7 ? "red" : p.news2.score >= 5 ? "amber" : "") : "")
            + (p.vitals_state === "overdue" ? pill("Vitals overdue", "amber") : "") + (p.isolation ? pill(esc(p.isolation), "blue") : ""),
    })).join("");

    const resultRows = r.items.map((x) => row(`r${x.order_id}`, `result:${x.order_id}`, {
        tone: x.critical ? "red" : x.review_overdue ? "red" : x.abnormal ? "amber" : "",
        title: `${esc(x.patient_name)} — ${esc(x.test_name || "Result")}`, meta: esc(x.summary || plural(x.results, "result")),
        side: (x.critical ? pill("Critical", "red") : x.abnormal ? pill("Abnormal", "amber") : "") + (x.kind === "radiology" ? pill("Radiology") : "")
            + (x.review_overdue ? pill(`${plural(x.days_waiting, "day")} unreviewed`, "red") : pill(ago(x.resulted_at, data.now))),
    })).join("");

    const apptRows = s.appointments.items.map((a) => row(`a${a.id}`, a.patient_id ? `chart:${a.patient_id}` : "tab:appointments:Calendar", {
        lead: `<div class="mw-time">${a.time ? esc(a.time) : "All day"}</div>`, title: esc(a.patient_name || "—"),
        meta: [a.reason, a.category].filter(Boolean).map(esc).join(" · "), side: a.status ? pill(esc(a.status)) : "",
    })).join("");

    const orRows = s.or_cases.items.map((c) => row(`o${c.id}`, `or:${c.id}`, {
        lead: `<div class="mw-time">${esc(c.start)}</div>`, title: `${esc(c.procedure || "Surgery")} — ${esc(c.patient_name)}`,
        meta: [c.date !== data.today ? "Tomorrow" : "Today", c.suite, c.case_number, c.my_role].filter(Boolean).map(esc).join(" · "),
        side: (c.priority && c.priority !== "Elective" ? pill(esc(c.priority), "red") : "") + (c.stage ? pill(esc(c.stage), "blue") : ""),
    })).join("");

    return `<div class="mw-tiles">${tiles}</div><div class="mw-grid">
        ${card("patients", "My inpatients", s.patients.count, patientRows || empty(s.patients.linked
            ? "None of your patients are admitted." : "Your user isn't linked to a provider record, so your patients can't be found. Ask an administrator to link it."),
            { note: "Admitted patients you are the doctor of (on their record, or the attending on the admission). Sickest first." })}
        ${card("results", "Results to review", r.to_review, resultRows || empty("Nothing waiting for your sign-off."),
            { note: r.overdue ? `<b style="color:#b91c1c">${r.overdue} not reviewed within ${r.review_days} days.</b> Open one to mark it reviewed.` : "Open a result to mark it reviewed." })}
        ${card("appointments", "Today's appointments", s.appointments.count, apptRows || empty(s.appointments.linked ? "No appointments today." : "Your user isn't linked to a provider record."),
            { link: ["appointments", "Calendar", "Calendar"] })}
        ${card("or", "OR cases", s.or_cases.count, orRows || empty("No surgery for you today or tomorrow."), { link: ["or_schedule", "OR Schedule", "OR schedule"] })}
        ${tasksCard(s)}
    </div>`;
}

function nextAppt(items) {
    const now = hm(data.now);
    return items.find((a) => a.time && a.time >= now)?.time || null;
}

function pharmacySections(s) {
    const v = s.verify;
    const r = s.restock;
    const verifyRows = v.items.map((o) => row(`v${o.id}`, "tab:med_verification:Order Verification", {
        tone: o.is_stat ? "red" : o.waiting_minutes > 60 ? "amber" : "", title: `${esc(o.summary)}`,
        meta: [o.patient_name, [o.ward, o.bed].filter(Boolean).join(" "), o.ordered_by_name ? `by ${o.ordered_by_name}` : ""].filter(Boolean).map(esc).join(" · "),
        side: (o.is_stat ? pill("STAT", "red") : "") + (o.high_alert ? pill("High-alert", "amber") : "") + (o.controlled ? pill(esc(o.controlled), "amber") : "")
            + (o.warnings ? pill(plural(o.warnings, "warning"), "amber") : "") + pill(`waiting ${waited(o.waiting_minutes)}`),
    })).join("");
    const restockRows = r.items.map((x) => row(`s${x.id}`, "tab:restock_queue:Restock Requests", {
        tone: x.urgent ? "red" : "", title: `${esc(x.ward_name || "Ward")} — ${esc(x.st_number)}`,
        meta: [plural(x.lines, "item"), x.is_auto ? "Automatic (below minimum)" : "Asked by the ward", x.urgent_reason].filter(Boolean).map(esc).join(" · "),
        side: (x.urgent ? pill("Urgent", "red") : "") + pill(`waiting ${waited(x.waiting_minutes)}`),
    })).join("");
    return {
        tiles: tile("verify", "Orders to verify", v.count, v.stat ? `<b>${v.stat} STAT</b>` : "", v.stat ? "red" : v.count ? "amber" : "")
            + tile("restock", "Restock requests", r.waiting, r.urgent ? `<b>${r.urgent} urgent</b>` : `${r.on_the_way} on the way`, r.urgent ? "red" : ""),
        cards: card("verify", "Orders to verify", v.count, verifyRows || empty("No medicine orders waiting for verification."), { link: ["med_verification", "Order Verification", "Verification queue"] })
            + card("restock", "Restock requests", r.waiting, restockRows || empty("No ward is waiting for a restock."), { link: ["restock_queue", "Restock Requests", "Restock queue"] }),
    };
}

function labSections(s) {
    const rows = (list, key) => list.items.map((o) => row(`${key}${o.id}`, `labres:${o.patient_id}`, {
        tone: o.days_waiting >= 2 ? "red" : o.days_waiting === 1 ? "amber" : "",
        title: `${esc(o.test_name || "Order")} — ${esc(o.patient_name)}`,
        meta: [o.location || "Outpatient", o.ordering_doctor ? `Dr ${o.ordering_doctor}` : "", `ordered ${o.order_date}`, o.specimen].filter(Boolean).map(esc).join(" · "),
        side: pill(o.status === "collected" ? "Collected" : "Pending", o.status === "collected" ? "blue" : "") + (o.days_waiting ? pill(`${plural(o.days_waiting, "day")}`, o.days_waiting >= 2 ? "red" : "amber") : ""),
    })).join("");
    return {
        tiles: tile("lab", "Lab orders pending", s.lab.count, `${s.lab.pending} to collect · ${s.lab.collected} collected`, s.lab.items.some((o) => o.days_waiting >= 2) ? "red" : "")
            + tile("radiology", "Radiology pending", s.radiology.count, `${s.radiology.pending} pending · ${s.radiology.collected} in progress`, s.radiology.items.some((o) => o.days_waiting >= 2) ? "red" : ""),
        cards: card("lab", "Pending lab orders", s.lab.count, rows(s.lab, "l") || empty("No lab orders pending."), { note: "Admitted patients first, then oldest. Open one to enter its results." })
            + card("radiology", "Pending radiology orders", s.radiology.count, rows(s.radiology, "x") || empty("No radiology orders pending.")),
    };
}

/* ---------------- tasks ---------------- */

/** "14:00", or "Oct 9 14:00" when not today. */
function dueLabel(dt) {
    if (!dt) return "";
    if (String(dt).slice(0, 10) === data.today) return hm(dt);
    const [, m, d] = String(dt).slice(0, 10).split("-").map(Number);
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d} ${hm(dt)}`;
}

function lateLabel(min) {
    return min < 60 ? `${min} min late` : `${waited(min)} late`;
}

function tasksTile(s) {
    const w = s.work_tasks || { count: 0, overdue: 0 };
    const other = s.tasks?.count || 0;
    const overdueOther = (s.tasks?.items || []).some((t) => t.overdue);
    const sub = w.overdue ? `<b>${w.overdue} overdue</b>` : w.items?.[0] ? `next ${esc(dueLabel(w.items[0].due_at))}` : other ? "hand-overs, reminders" : "";
    return tile("tasks", "Tasks", w.count + other, sub, w.overdue || overdueOther ? "red" : w.items?.some((t) => t.priority === "urgent") ? "amber" : "");
}

function taskRow(t, mode) {
    const who = t.assign_type === "user" ? "" : t.assignee_label;
    const meta = [t.patient_name ? `${t.patient_name}${t.location ? ` · ${t.location}` : ""}` : "", mode === "given" ? `For ${t.assignee_label.replace(/^The /, "the ")}` : who,
        mode !== "given" && t.created_by_name ? `From ${t.created_by_name}` : "", t.details].filter(Boolean).map(esc).join(" · ");
    let side = "";
    let extra = "";
    let tone = "";
    if (t.status === "open") {
        tone = t.overdue ? "red" : t.priority === "urgent" ? "amber" : "";
        side = (t.overdue ? pill(lateLabel(t.minutes_late), "red") : "") + (t.priority === "urgent" ? pill("Urgent", "amber") : "");
        extra = mode === "given"
            ? `<button type="button" class="mw-done" data-mw-task-edit="${t.id}">Change</button><button type="button" class="mw-done" data-mw-task-cancel="${t.id}">Cancel</button>`
            : `<button type="button" class="mw-done" data-mw-task-done="${t.id}">Done</button>`;
    } else if (t.status === "done") {
        side = pill(`✓ ${esc(t.completed_by_name || "")} ${esc(dueLabel(t.completed_at))}`, "green");
    } else {
        side = pill(`Cancelled${t.cancelled_by_name ? ` by ${esc(t.cancelled_by_name)}` : ""}`);
    }
    const note = t.status === "done" && t.completion_note ? ` · “${esc(t.completion_note)}”` : t.status === "cancelled" && t.cancel_reason ? ` · ${esc(t.cancel_reason)}` : "";
    return row(`k${t.id}`, t.patient_id ? `chart:${t.patient_id}` : "none", {
        tone, lead: `<div class="mw-time">${esc(dueLabel(t.due_at))}</div>`, title: esc(t.title), meta: meta + note, side, extra,
    });
}

function otherRows(s) {
    return (s.tasks?.items || []).map((t) => t.type === "handover"
        ? row(`t-h${t.admission_id}`, `chart:${t.patient_id}`, { tone: "amber", title: esc(t.title), meta: esc(t.detail), side: pill("Hand-over", "amber") })
        : row(`t-r${t.id}`, t.patient_id ? `chart:${t.patient_id}` : "tab:messaging:Messages", {
            tone: t.overdue ? "red" : t.priority === "high" ? "amber" : "", title: esc(t.title),
            meta: [t.patient_name, t.detail, t.due_date ? (t.overdue ? `was due ${t.due_date}` : "due today") : ""].filter(Boolean).map(esc).join(" · "),
            side: pill("Reminder") + (t.priority === "high" ? pill("High", "amber") : "") + (t.overdue ? pill("Overdue", "red") : ""),
            extra: `<button type="button" class="mw-done" data-mw-done="${t.id}">Done</button>`,
        })).join("");
}

function tasksCard(s) {
    const w = s.work_tasks || { items: [], done: [], assigned: [], count: 0 };
    const others = otherRows(s);
    const tab = (v, label) => `<button type="button" class="mw-tab" role="tab" data-mw-tview="${v}" aria-selected="${taskView === v}">${label}</button>`;
    let body;
    if (taskView === "given") {
        body = w.assigned.map((t) => taskRow(t, "given")).join("") || empty("You haven't given any tasks in the last day.");
    } else if (taskView === "done") {
        body = w.done.map((t) => taskRow(t, "done")).join("") || empty("Nothing done in the last 12 hours.");
    } else {
        const mine = w.items.map((t) => taskRow(t, "mine")).join("");
        body = mine + (others ? (mine ? `<div class="mw-sep">Hand-overs &amp; reminders</div>` : "") + others : "") || empty("No tasks for you right now.");
    }
    const openGiven = w.assigned.filter((t) => t.status === "open").length;
    return `<section class="mw-card" id="mw-tasks" aria-labelledby="mw-tasks-h">
        <div class="mw-card-head"><h2 id="mw-tasks-h">Tasks<span class="mw-count">${w.count + (s.tasks?.count || 0)}</span></h2>
            <button type="button" class="mw-new" data-mw-task-new>+ New task</button></div>
        <div class="mw-tabs" role="tablist" aria-label="Tasks">
            ${tab("mine", `For me${w.count ? ` (${w.count})` : ""}`)}${tab("given", `I gave${openGiven ? ` (${openGiven} open)` : ""}`)}${tab("done", `Done${w.done.length ? ` (${w.done.length})` : ""}`)}
        </div>
        <div class="mw-list">${body}</div></section>`;
}

function findTask(id) {
    const w = data.sections.work_tasks || {};
    return [...(w.items || []), ...(w.assigned || []), ...(w.done || [])].find((t) => t.id === id);
}

/** A note / reason box under the row; Enter confirms, Escape closes. */
function inlineBox(rowEl, { label, placeholder, button, required, onSubmit }) {
    rowEl.parentElement.querySelectorAll(".mw-inline").forEach((x) => x.remove());
    rowEl.insertAdjacentHTML("afterend", `<div class="mw-inline"><input type="text" maxlength="300" aria-label="${esc(label)}" placeholder="${esc(placeholder)}">
        <button type="button" class="mw-done primary">${esc(button)}</button><button type="button" class="mw-done" data-x>Close</button><div class="mw-err" role="alert"></div></div>`);
    const box = rowEl.nextElementSibling;
    const input = box.querySelector("input");
    const go = async () => {
        const v = input.value.trim();
        if (required && !v) {
            input.setAttribute("aria-invalid", "true");
            box.querySelector(".mw-err").textContent = `${label} is required.`;
            input.focus();
            return;
        }
        box.querySelectorAll("button").forEach((b) => (b.disabled = true));
        const err = await onSubmit(v);
        box.querySelectorAll("button").forEach((b) => (b.disabled = false));
        if (err) {
            box.querySelector(".mw-err").textContent = err;
            input.focus();
        }
    };
    box.querySelector(".primary").onclick = go;
    box.querySelector("[data-x]").onclick = () => {
        box.remove();
        rowEl.focus();
    };
    input.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === "Enter") go();
        if (e.key === "Escape") box.querySelector("[data-x]").click();
    };
    input.focus();
}

async function newTask(task = null) {
    const { openTaskForm } = await import("../tasks/task-form.js?v=1");
    openTaskForm({ task, onSaved: () => load(true) });
}

function render(root) {
    const s = data.sections;
    const shift = data.shift?.name ? ` · ${esc(data.shift.name)} shift ${esc(data.shift.start || "")}–${esc(data.shift.end || "")}` : "";
    let body = "";
    if (data.view === "nurse" || data.view === "cna") body = nurseSections(s, data.view === "cna");
    else if (data.view === "doctor") body = doctorSections(s);
    else if (data.view === "pharmacy") {
        const p = pharmacySections(s);
        body = `<div class="mw-tiles">${p.tiles}${tasksTile(s)}</div><div class="mw-grid">${p.cards}${tasksCard(s)}</div>`;
    } else if (data.view === "lab") {
        const l = labSections(s);
        body = `<div class="mw-tiles">${l.tiles}${tasksTile(s)}</div><div class="mw-grid">${l.cards}${tasksCard(s)}</div>`;
    } else if (data.view === "admin") {
        const p = pharmacySections(s);
        const l = labSections(s);
        body = `<div class="mw-tiles">${p.tiles}${l.tiles}${tasksTile(s)}</div><div class="mw-grid">${p.cards}${l.cards}${tasksCard(s)}</div>`;
    } else {
        body = empty("My Work isn't set up for your role.");
    }
    root.innerHTML = `
        <div class="mw-head">
            <div><h1>My Work</h1><div class="mw-sub">${greeting()}${data.name ? `, ${esc(data.name)}` : ""} · ${esc(longDate(data.today))}${shift}</div></div>
            <div class="mw-tools"><span>Updated ${esc(hm(data.now))}</span><button type="button" class="mw-btn" data-mw-refresh>Refresh</button></div>
        </div>${body}`;
    root.querySelector("[data-mw-refresh]").onclick = () => load();
    root.onclick = onClick;
    root.onkeydown = (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target.matches(".mw-row") && !e.target.closest(".mw-inline")) {
            e.preventDefault();
            act(e.target.dataset.mwAct);
        }
    };
}

/* ---------------- actions ---------------- */

async function onClick(e) {
    const done = e.target.closest("[data-mw-done]");
    if (done) {
        e.stopPropagation();
        done.disabled = true;
        const res = await api("/reminders/complete", { method: "POST", body: JSON.stringify({ reminder_id: Number(done.dataset.mwDone) }) }).catch(() => null);
        if (!res?.success) {
            done.disabled = false;
            showToast(res?.message || "Could not mark it done.", "error");
            return;
        }
        showToast("Task done.", "success");
        load(true);
        return;
    }
    const tv = e.target.closest("[data-mw-tview]");
    if (tv) {
        taskView = tv.dataset.mwTview;
        const card = document.getElementById("mw-tasks");
        card.outerHTML = tasksCard(data.sections);
        document.querySelector(`#mw-tasks [data-mw-tview="${taskView}"]`)?.focus();
        return;
    }
    if (e.target.closest("[data-mw-task-new]")) {
        newTask();
        return;
    }
    const tEdit = e.target.closest("[data-mw-task-edit]");
    if (tEdit) {
        e.stopPropagation();
        newTask(findTask(Number(tEdit.dataset.mwTaskEdit)));
        return;
    }
    const tDone = e.target.closest("[data-mw-task-done]");
    const tCancel = e.target.closest("[data-mw-task-cancel]");
    if (tDone || tCancel) {
        e.stopPropagation();
        const id = Number((tDone || tCancel).dataset[tDone ? "mwTaskDone" : "mwTaskCancel"]);
        inlineBox((tDone || tCancel).closest(".mw-row"), tDone
            ? { label: "Note", placeholder: "Note (optional), e.g. dressing changed, wound clean", button: "Mark done",
                onSubmit: (note) => taskCall("/tasks/complete", { id, note }) }
            : { label: "Reason", placeholder: "Why is it cancelled?", button: "Cancel task", required: true,
                onSubmit: (reason) => taskCall("/tasks/cancel", { id, reason }) });
        return;
    }
    if (e.target.closest(".mw-inline")) return;
    const go = e.target.closest("[data-mw-go]");
    if (go) {
        const el = document.getElementById(`mw-${go.dataset.mwGo}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        el?.querySelector(".mw-row")?.focus({ preventScroll: true });
        return;
    }
    const tab = e.target.closest("[data-mw-tab]");
    if (tab) {
        window.__openDashboardTab?.(tab.dataset.mwTab, tab.dataset.mwTitle);
        return;
    }
    const r = e.target.closest(".mw-row");
    if (r) act(r.dataset.mwAct);
}

async function taskCall(url, body) {
    const res = await api(url, { method: "POST", body: JSON.stringify(body) }).catch(() => null);
    if (!res?.success) return res?.message || "Could not save. Try again.";
    showToast(res.message, "success");
    await load(true);
    return null;
}

async function act(a) {
    const [kind, ...rest] = String(a).split(":");
    const arg = rest[0];
    if (kind === "chart" && arg && arg !== "null") {
        window.__openPatientChartFromReport?.(arg);
    } else if (kind === "mar") {
        const { openMar } = await import("../mar/mar.js?v=6");
        openMar(Number(arg));
    } else if (kind === "result") {
        const { openResultByOrder } = await import("../results-inbox/results-inbox.js?v=4");
        openResultByOrder(Number(arg));
    } else if (kind === "or") {
        const { openOrCase } = await import("../or-board/or-case-panel.js?v=4");
        openOrCase(Number(arg));
    } else if (kind === "labres") {
        // The patient's chart, then Patient Results (it shows the active chart's orders).
        await window.__openPatientChartFromReport?.(arg);
        window.__openDashboardTab?.("procedure_patient_results", "Patient Results");
    } else if (kind === "tab") {
        window.__openDashboardTab?.(arg, rest[1] || arg);
    }
}
