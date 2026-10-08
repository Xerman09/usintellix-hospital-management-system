import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * Daily census (module 11, Phase 1; tab "census"): the midnight census per ward (start of day,
 * admitted, transferred in / out, discharged, died, patients at midnight, beds), by doctor and by
 * specialization, saved each day. Today is shown live ("so far"); past days come from the saved
 * census. The admin can recalculate a past day (e.g. after a late discharge was entered). Printable.
 * Phase 2: the printable daily census sheet (printCensusSheet: patients per ward and the day's
 * movements) and a link to the census reports (census-report.js).
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`);
const longDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const CSS = `
.cen { padding: 20px 24px 40px; max-width: 1280px; margin: 0 auto; color: var(--text-primary); }
@media (max-width: 600px) { .cen { padding: 16px 16px 32px; } }
.cen-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 10px; }
.cen h1 { margin: 0; font-size: 22px; }
.cen-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.cen-nav { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.cen-nav input { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); max-width: 100%; }
.cen-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.cen-b.go { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.cen-b:disabled { opacity: .5; cursor: default; }
.cen-b:focus-visible, .cen-nav input:focus-visible, .cen-inline input:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.cen-status { margin: 12px 0; padding: 8px 12px; border-radius: 10px; font-size: 13px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.cen-status.live { border-color: #93c5fd; background: #eff6ff; color: #1e3a8a; }
:root[data-theme="dark"] .cen-status.live { background: #172554; color: #dbeafe; border-color: #1e40af; }
.cen-inline { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
.cen-inline input { flex: 1 1 240px; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.cen-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin: 14px 0 6px; }
.cen-tile { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; background: var(--bg-surface); }
.cen-tile small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.cen-tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.cen-tile span { font-size: 12px; color: var(--text-muted); }
.cen h2 { font-size: 16px; margin: 22px 0 8px; }
.cen-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.cen table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.cen th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.cen td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
.cen .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.cen tfoot td { font-weight: 700; background: var(--bg-surface-alt); }
.cen .muted { color: var(--text-muted); }
.cen .strong { font-weight: 700; }
.cen-bar { display: inline-block; vertical-align: middle; width: 60px; height: 8px; border-radius: 4px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); margin-left: 6px; overflow: hidden; }
.cen-bar i { display: block; height: 100%; background: #2563eb; border-radius: 4px 0 0 4px; }
.cen-bar.full i { background: #b45309; }
.cen-two { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; }
.cen-two > section { min-width: 0; }
@media (max-width: 900px) { .cen-two { grid-template-columns: 1fr; } }
.cen-link { border: 0; background: none; color: #1d4ed8; font: inherit; cursor: pointer; padding: 0; text-decoration: underline; }
:root[data-theme="dark"] .cen-link { color: #93c5fd; }
.cen-empty { padding: 22px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
`;

let current = "";
let last = null;

export function CensusView() {
    if (!document.getElementById("cen-style")) {
        const st = document.createElement("style");
        st.id = "cen-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    return `<div class="cen" id="census"><div class="cen-empty">Loading…</div></div>`;
}

export function initCensus() {
    current = "";
    load();
}

async function load(date = current) {
    const root = document.getElementById("census");
    if (!root) return;
    const r = await api(`/census${date ? `?date=${encodeURIComponent(date)}` : ""}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="cen-empty">${esc(r?.message || "Could not load the census.")}</div>`;
        return;
    }
    last = r.data;
    current = last.date;
    render(root, last);
}

const sourceText = (s) => ({
    auto: "Saved automatically",
    backfill: "Saved later from the records (beds out of service were not known)",
    manual: "Recalculated",
}[s.source] || "Saved");

function occBar(p) {
    if (p === null || p === undefined) return "";
    return `<span class="cen-bar${p >= 90 ? " full" : ""}" aria-hidden="true"><i style="width:${Math.min(100, p)}%"></i></span>`;
}

function render(root, d) {
    const t = d.totals;
    const nowLabel = d.is_today ? "Now" : "At midnight";
    const transfers = t.transferred_in;
    const status = d.is_today
        ? `<div class="cen-status live" role="status"><b>Today so far — live.</b> The census for today is saved after midnight. Patients "now" are those in the wards at this moment.</div>`
        : d.saved
            ? `<div class="cen-status" role="status"><b>${esc(sourceText(d.saved))}</b> ${esc(String(d.saved.saved_at).slice(0, 16))}${d.saved.saved_by_name ? ` by ${esc(d.saved.saved_by_name)}` : ""}${d.saved.note ? ` — ${esc(d.saved.note)}` : ""}.</div>`
            : `<div class="cen-status" role="status"><b>Not saved</b> (older than a month when the census started): shown from the records as they are now.</div>`;
    const wardRow = (w, foot = false) => `<tr>
        <td class="${foot ? "" : "strong"}">${foot ? "All wards" : esc(w.ward_name)}</td>
        <td class="n">${w.start_count}</td><td class="n">${w.admitted}</td><td class="n">${w.transferred_in}</td><td class="n">${w.transferred_out}</td>
        <td class="n">${w.discharged}</td><td class="n">${w.died}</td><td class="n strong">${w.midnight_count}</td>
        <td class="n">${w.total_beds}</td><td class="n">${foot ? (t.oos_known ? t.out_of_service_beds : "—") : (w.out_of_service_beds ?? "—")}</td><td class="n">${w.available_beds}</td>
        <td class="n">${pct(w.occupancy_pct)}${occBar(w.occupancy_pct)}</td></tr>`;
    const unmatched = d.doctors.filter((x) => !x.specialization).length;
    root.innerHTML = `
        <div class="cen-head">
            <div><h1>Daily census</h1><div class="cen-sub">${esc(longDate(d.date))}${d.is_today ? " (today)" : ""}</div></div>
            <div class="cen-nav">
                <button type="button" class="cen-b" data-go="${esc(d.prev)}" aria-label="Previous day">‹ Previous</button>
                <label class="muted" for="cenDate" style="font-size:12px">Day</label><input type="date" id="cenDate" value="${esc(d.date)}" max="${esc(d.today)}">
                <button type="button" class="cen-b" data-go="${esc(d.next || "")}" ${d.next ? "" : "disabled"} aria-label="Next day">Next ›</button>
                ${d.is_today ? "" : `<button type="button" class="cen-b" data-go="${esc(d.today)}">Today</button>`}
                <button type="button" class="cen-b go" data-sheet>Census sheet</button>
                <button type="button" class="cen-b" data-print>Print summary</button>
                <button type="button" class="cen-b" data-reports>Reports</button>
                ${d.can_save && !d.is_today ? `<button type="button" class="cen-b" data-recalc>Recalculate…</button>` : ""}
            </div>
        </div>
        ${status}
        <div class="cen-tiles" role="list">
            <div class="cen-tile" role="listitem"><small>Patients ${d.is_today ? "now" : "at midnight"}</small><b>${t.midnight_count}</b><span>${t.start_count} at the start of the day</span></div>
            <div class="cen-tile" role="listitem"><small>Admitted</small><b>${t.admitted}</b></div>
            <div class="cen-tile" role="listitem"><small>Discharged</small><b>${t.discharged}</b><span>alive</span></div>
            <div class="cen-tile" role="listitem"><small>Died</small><b>${t.died}</b></div>
            <div class="cen-tile" role="listitem"><small>Ward transfers</small><b>${transfers}</b></div>
            <div class="cen-tile" role="listitem"><small>Occupancy</small><b>${pct(t.occupancy_pct)}</b><span>${t.midnight_count} of ${t.total_beds} beds</span></div>
            <div class="cen-tile" role="listitem"><small>Available beds</small><b>${t.available_beds}</b><span>${t.oos_known ? `${t.out_of_service_beds} out of service` : "out of service not known"}</span></div>
        </div>
        <h2>By ward</h2>
        ${d.wards.length ? `<div class="cen-wrap"><table><thead><tr><th>Ward</th><th class="n">Start of day</th><th class="n">Admitted</th><th class="n">Transferred in</th><th class="n">Transferred out</th>
            <th class="n">Discharged</th><th class="n">Died</th><th class="n">${nowLabel}</th><th class="n">Beds</th><th class="n">Out of service</th><th class="n">Available</th><th class="n">Occupancy</th></tr></thead>
            <tbody>${d.wards.map((w) => wardRow(w)).join("")}</tbody><tfoot>${wardRow(t, true)}</tfoot></table></div>
            <div class="cen-sub">Start of day + admitted + transferred in − transferred out − discharged − died = ${nowLabel.toLowerCase()}. Occupancy = patients ${d.is_today ? "now" : "at midnight"} ÷ beds.</div>`
            : `<div class="cen-empty">No wards.</div>`}
        <div class="cen-two">
            <section><h2>By doctor</h2>
                ${d.doctors.length ? `<div class="cen-wrap"><table><thead><tr><th>Attending doctor</th><th>Specialization</th><th class="n">Patients</th><th class="n">Admitted</th><th class="n">Discharged</th><th class="n">Died</th></tr></thead><tbody>
                    ${d.doctors.map((x) => `<tr><td class="strong">${esc(x.doctor_name)}</td><td>${x.specialization ? esc(x.specialization) : `<span class="muted">Not set</span>`}</td>
                        <td class="n strong">${x.patients}</td><td class="n">${x.admitted}</td><td class="n">${x.discharged}</td><td class="n">${x.died}</td></tr>`).join("")}</tbody></table></div>
                    ${unmatched ? `<div class="cen-sub">“Not set”: the attending written on the admission didn't match a doctor in Providers, so the specialization isn't known. Patients = ${d.is_today ? "now" : "at midnight"}.</div>` : ""}`
                    : `<div class="cen-empty">No inpatients this day.</div>`}
            </section>
            <section><h2>By specialization</h2>
                ${d.specializations.length ? `<div class="cen-wrap"><table><thead><tr><th>Specialization</th><th class="n">Doctors</th><th class="n">Patients</th><th class="n">Admitted</th><th class="n">Discharged</th><th class="n">Died</th></tr></thead><tbody>
                    ${d.specializations.map((x) => `<tr><td class="strong">${x.specialization ? esc(x.specialization) : `<span class="muted">Not set</span>`}</td><td class="n">${x.doctors}</td>
                        <td class="n strong">${x.patients}</td><td class="n">${x.admitted}</td><td class="n">${x.discharged}</td><td class="n">${x.died}</td></tr>`).join("")}</tbody></table></div>`
                    : `<div class="cen-empty">No inpatients this day.</div>`}
            </section>
        </div>
        <h2>Last 14 days</h2>
        ${d.trend.length ? `<div class="cen-wrap"><table><thead><tr><th>Day</th><th class="n">At midnight</th><th class="n">Admitted</th><th class="n">Discharged</th><th class="n">Died</th><th class="n">Transfers</th><th class="n">Occupancy</th></tr></thead><tbody>
            ${[...d.trend].reverse().map((x) => `<tr><td><button type="button" class="cen-link" data-go="${esc(x.date)}">${esc(shortDate(x.date))}</button></td><td class="n strong">${x.midnight_count}</td>
                <td class="n">${x.admitted}</td><td class="n">${x.discharged}</td><td class="n">${x.died}</td><td class="n">${x.transfers}</td><td class="n">${pct(x.occupancy_pct)}${occBar(x.occupancy_pct)}</td></tr>`).join("")}</tbody></table></div>`
            : `<div class="cen-empty">No saved days yet: the first census is saved after midnight.</div>`}`;

    root.onclick = async (ev) => {
        const go = ev.target.closest("[data-go]");
        if (go && go.dataset.go) return load(go.dataset.go);
        if (ev.target.closest("[data-print]")) return printCensus(d);
        if (ev.target.closest("[data-sheet]")) return printCensusSheet(d.date);
        if (ev.target.closest("[data-reports]")) return window.__openDashboardTab?.("census_report", "Census Reports");
        if (ev.target.closest("[data-recalc]")) {
            root.querySelector(".cen-inline")?.remove();
            root.querySelector(".cen-status").insertAdjacentHTML("beforeend", `<div class="cen-inline">
                <input type="text" maxlength="255" data-note aria-label="Why recalculate (optional)" placeholder="Why (optional), e.g. a discharge was entered late">
                <button type="button" class="cen-b go" data-recalc-go>Recalculate and save ${esc(shortDate(d.date))}</button><button type="button" class="cen-b" data-recalc-back>Back</button></div>`);
            root.querySelector("[data-note]").focus();
            return;
        }
        if (ev.target.closest("[data-recalc-back]")) return root.querySelector(".cen-inline")?.remove();
        const go2 = ev.target.closest("[data-recalc-go]");
        if (go2) {
            go2.disabled = true;
            const r = await api("/census/save", { method: "POST", body: JSON.stringify({ date: d.date, note: root.querySelector("[data-note]").value.trim() }) }).catch(() => null);
            go2.disabled = false;
            showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
            if (r?.success) load(d.date);
        }
    };
    root.querySelector("#cenDate").onchange = (ev) => ev.target.value && load(ev.target.value);
}

function printCensus(d) {
    const win = window.open("", "_blank");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    const t = d.totals;
    const now = d.is_today ? "Now" : "Midnight";
    const row = (w, label) => `<tr><td>${esc(label ?? w.ward_name)}</td><td class="n">${w.start_count}</td><td class="n">${w.admitted}</td><td class="n">${w.transferred_in}</td>
        <td class="n">${w.transferred_out}</td><td class="n">${w.discharged}</td><td class="n">${w.died}</td><td class="n b">${w.midnight_count}</td><td class="n">${w.total_beds}</td>
        <td class="n">${label ? (t.oos_known ? t.out_of_service_beds : "—") : (w.out_of_service_beds ?? "—")}</td><td class="n">${w.available_beds}</td><td class="n">${pct(w.occupancy_pct)}</td></tr>`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Census ${esc(d.date)}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 10pt; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    h1 { margin: 0; font-size: 17pt; } h2 { font-size: 11pt; margin: 12px 0 4px; text-transform: uppercase; }
    .sub { color: #444; font-size: 9.5pt; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 8.5pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 4px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 4px 5px; } .n { text-align: right; } .b { font-weight: bold; } tfoot td { font-weight: bold; border-top: 1.5px solid #111; }
    .two { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; } tr { page-break-inside: avoid; }
    footer { margin-top: 12px; font-size: 8.5pt; color: #555; display: flex; justify-content: space-between; }
    .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<header><div><div class="sub">${esc(d.hospital?.name || "")}</div><h1>Daily census — ${esc(longDate(d.date))}</h1></div>
    <div class="sub" style="text-align:right">${d.is_today ? "Today so far (live, not saved yet)" : d.saved ? `${esc(sourceText(d.saved))} ${esc(String(d.saved.saved_at).slice(0, 16))}` : "Not saved"}<br>
    Patients ${d.is_today ? "now" : "at midnight"}: <b>${t.midnight_count}</b> · Occupancy ${pct(t.occupancy_pct)}</div></header>
<table><thead><tr><th>Ward</th><th class="n">Start</th><th class="n">Admitted</th><th class="n">Trf in</th><th class="n">Trf out</th><th class="n">Discharged</th><th class="n">Died</th>
    <th class="n">${now}</th><th class="n">Beds</th><th class="n">Out of service</th><th class="n">Available</th><th class="n">Occupancy</th></tr></thead>
<tbody>${d.wards.map((w) => row(w)).join("")}</tbody><tfoot>${row(t, "All wards")}</tfoot></table>
<div class="two">
<div><h2>By doctor</h2><table><thead><tr><th>Doctor</th><th>Specialization</th><th class="n">Patients</th><th class="n">Adm</th><th class="n">Disch</th><th class="n">Died</th></tr></thead><tbody>
${d.doctors.map((x) => `<tr><td>${esc(x.doctor_name)}</td><td>${esc(x.specialization || "Not set")}</td><td class="n b">${x.patients}</td><td class="n">${x.admitted}</td><td class="n">${x.discharged}</td><td class="n">${x.died}</td></tr>`).join("") || `<tr><td colspan="6">None</td></tr>`}
</tbody></table></div>
<div><h2>By specialization</h2><table><thead><tr><th>Specialization</th><th class="n">Patients</th><th class="n">Adm</th><th class="n">Disch</th><th class="n">Died</th></tr></thead><tbody>
${d.specializations.map((x) => `<tr><td>${esc(x.specialization || "Not set")}</td><td class="n b">${x.patients}</td><td class="n">${x.admitted}</td><td class="n">${x.discharged}</td><td class="n">${x.died}</td></tr>`).join("") || `<tr><td colspan="5">None</td></tr>`}
</tbody></table></div></div>
<footer><span>Census ${esc(d.date)}</span><span>Confidential — for hospital use</span></footer>
</body></html>`);
    win.document.close();
}

/* ---------------- the daily census sheet (Phase 2) ---------------- */

const EVENT = { admitted: "Admitted", transferred_in: "Transferred in", transferred_out: "Transferred out", discharged: "Discharged", died: "Died" };

/** The printable daily census sheet: per ward the patients at midnight and the day's movements. */
export async function printCensusSheet(date) {
    const win = window.open("", "_blank");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write(`<p style="font-family:Arial;padding:20px;">Preparing the census sheet…</p>`);
    const r = await api(`/census/sheet?date=${encodeURIComponent(date)}`).catch(() => null);
    if (!r?.success) {
        win.close();
        showToast(r?.message || "Couldn't load the census sheet.", "error");
        return;
    }
    win.document.open();
    win.document.write(censusSheetHtml(r.data));
    win.document.close();
}

export function censusSheetHtml(d) {
    const t = d.totals;
    const now = d.is_today ? "now" : "at midnight";
    const hm = (dt) => esc(String(dt || "").slice(11, 16));
    const used = d.wards.filter((w) => w.patients.length || w.movements.length);
    const wardPage = (w) => `<section class="w">
        <h2>${esc(w.ward_name)}</h2>
        <div class="cnt">Start of day <b>${w.start_count}</b> · Admitted <b>${w.admitted}</b> · Transferred in <b>${w.transferred_in}</b> · Transferred out <b>${w.transferred_out}</b>
            · Discharged <b>${w.discharged}</b> · Died <b>${w.died}</b> · Patients ${now} <b>${w.midnight_count}</b> · Beds <b>${w.total_beds}</b> · Available <b>${w.available_beds}</b>
            · Occupancy <b>${pct(w.occupancy_pct)}</b></div>
        <h3>Patients ${now} (${w.patients.length})</h3>
        ${w.patients.length ? `<table><thead><tr><th>#</th><th>Bed</th><th>Patient</th><th>Patient no.</th><th>Age / sex</th><th>Admitted</th><th class="n">Day</th><th>Attending</th><th>Admitting diagnosis</th></tr></thead><tbody>
            ${w.patients.map((p, i) => `<tr><td class="n">${i + 1}</td><td class="nw">${esc(p.bed_label || "—")}</td><td><b>${esc(p.patient_name)}</b></td><td>${esc(p.patient_no || "—")}</td>
                <td>${p.age ?? "—"} / ${esc((p.gender || "—").slice(0, 1))}</td><td class="nw">${esc(String(p.admission_date).slice(0, 10))}</td><td class="n">${p.stay_day}</td>
                <td>${esc(p.doctor_name || "—")}</td><td>${esc(p.diagnosis || "")}</td></tr>`).join("")}</tbody></table>` : `<p class="none">No patients.</p>`}
        <h3>Movements (${w.movements.length})</h3>
        ${w.movements.length ? `<table><thead><tr><th>Time</th><th>Event</th><th>Patient</th><th>Patient no.</th><th>Bed</th><th>From / to · details</th></tr></thead><tbody>
            ${w.movements.map((m) => `<tr class="${m.event}"><td class="nw">${hm(m.event_at)}</td><td><b>${esc(EVENT[m.event] || m.event)}</b></td><td>${esc(m.patient_name)}</td><td>${esc(m.patient_no || "—")}</td>
                <td class="nw">${esc(m.bed_label || "—")}</td><td>${m.other_ward ? `${m.event === "transferred_in" ? "from" : "to"} ${esc(m.other_ward)}` : esc(m.detail || "")}</td></tr>`).join("")}</tbody></table>` : `<p class="none">No admissions, transfers, discharges or deaths.</p>`}
        <div class="sig"><div>Prepared by (nurse on duty)</div><div>Checked by (charge nurse)</div></div>
    </section>`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Census sheet ${esc(d.date)}</title>
<style>
    @page { size: A4 landscape; margin: 11mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 9.5pt; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    h1 { margin: 0; font-size: 16pt; letter-spacing: .02em; } h2 { font-size: 13pt; margin: 0 0 3px; } h3 { font-size: 9.5pt; margin: 10px 0 3px; text-transform: uppercase; letter-spacing: .03em; }
    .sub { color: #444; font-size: 9pt; } .cnt { font-size: 9pt; color: #222; border: 1px solid #999; padding: 4px 8px; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 7.5pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 4px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 4px; vertical-align: top; } tr { page-break-inside: avoid; } .n { text-align: right; } .nw { white-space: nowrap; }
    tfoot td { font-weight: bold; border-top: 1.5px solid #111; } tr.died td { font-weight: bold; }
    .w { page-break-before: always; } .none { color: #555; margin: 2px 0; }
    .sig { margin-top: 22px; display: flex; gap: 40px; page-break-inside: avoid; } .sig div { flex: 1; border-top: 1px solid #111; padding-top: 3px; font-size: 8.5pt; }
    footer { margin-top: 10px; font-size: 8pt; color: #555; display: flex; justify-content: space-between; }
    .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<header><div><div class="sub">${esc(d.hospital?.name || "")}</div><h1>DAILY CENSUS SHEET</h1></div>
    <div class="sub" style="text-align:right"><b>${esc(longDate(d.date))}</b><br>${d.is_today ? "Today so far (live — not the midnight census yet)" : d.saved ? `${esc(sourceText(d.saved))} ${esc(String(d.saved.saved_at).slice(0, 16))}` : "Not saved"}
    ${d.from_records && !d.is_today ? "<br>Patient lists rebuilt from the records" : ""}</div></header>
<table><thead><tr><th>Ward</th><th class="n">Start</th><th class="n">Admitted</th><th class="n">Trf in</th><th class="n">Trf out</th><th class="n">Discharged</th><th class="n">Died</th>
    <th class="n">${d.is_today ? "Now" : "Midnight"}</th><th class="n">Beds</th><th class="n">Available</th><th class="n">Occupancy</th></tr></thead><tbody>
${d.wards.map((w) => `<tr><td>${esc(w.ward_name)}</td><td class="n">${w.start_count}</td><td class="n">${w.admitted}</td><td class="n">${w.transferred_in}</td><td class="n">${w.transferred_out}</td>
    <td class="n">${w.discharged}</td><td class="n">${w.died}</td><td class="n"><b>${w.midnight_count}</b></td><td class="n">${w.total_beds}</td><td class="n">${w.available_beds}</td><td class="n">${pct(w.occupancy_pct)}</td></tr>`).join("")}
</tbody><tfoot><tr><td>All wards</td><td class="n">${t.start_count}</td><td class="n">${t.admitted}</td><td class="n">${t.transferred_in}</td><td class="n">${t.transferred_out}</td><td class="n">${t.discharged}</td>
    <td class="n">${t.died}</td><td class="n">${t.midnight_count}</td><td class="n">${t.total_beds}</td><td class="n">${t.available_beds}</td><td class="n">${pct(t.occupancy_pct)}</td></tr></tfoot></table>
<div class="sig"><div>Prepared by (admitting / records)</div><div>Noted by (chief nurse)</div></div>
${used.map(wardPage).join("")}
<footer><span>Printed ${esc(String(d.printed_at || "").slice(0, 16))}${d.printed_by ? ` by ${esc(d.printed_by)}` : ""}</span><span>Confidential patient information</span></footer>
</body></html>`;
}
