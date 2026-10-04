import { fetchPharmacyReportOptions, fetchPharmacyReport } from "./pharmacy-reports.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";

const STATUS = { completed: "Given", voided: "Undone", all: "Given and undone" };

let options = { warehouses: [], drugs: [], controlled_drugs: [], prescribers: [], dispensers: [], classes: [] };
let activeTab = "log";
let lastData = null;
let filters = {};

const $ = (id) => document.getElementById(id);

function defaults() {
    return {
        date_from: `${todayISO().slice(0, 8)}01`, date_to: todayISO(),
        // Unfilled: any time, unless narrowed down.
        rx_from: "", rx_to: "",
        warehouse_id: "", drug_id: "", dd_drug_id: "", prescriber_id: "", dispensed_by: "",
        status: "completed", flag: "", q: "", class: "dangerous", state: "all"
    };
}

/* ---------------------------------------------------------------
 * Tabs: which filters each uses, how it draws, and its CSV
 * ------------------------------------------------------------- */

const TABS = [
    {
        id: "log", label: "Dispensing Log", report: "dispensing-log",
        fields: ["date_from", "date_to", "warehouse_id", "drug_id", "prescriber_id", "dispensed_by", "status", "flag", "q"],
        params: (f) => ({ date_from: f.date_from, date_to: f.date_to, warehouse_id: f.warehouse_id, drug_id: f.drug_id, prescriber_id: f.prescriber_id,
            dispensed_by: f.dispensed_by, status: f.status, flag: f.flag, q: f.q }),
        render: renderLog, csv: csvLog
    },
    {
        id: "dd", label: "Dangerous Drugs Register", report: "dangerous-drugs",
        fields: ["class", "dd_drug_id", "warehouse_id", "date_from", "date_to"],
        params: (f) => ({ class: f.class, drug_id: f.dd_drug_id, warehouse_id: f.warehouse_id, date_from: f.date_from, date_to: f.date_to }),
        render: renderRegister, csv: csvRegister, portrait: false
    },
    {
        id: "unfilled", label: "Unfilled Prescriptions", report: "unfilled",
        fields: ["state", "prescriber_id", "rx_from", "rx_to"],
        params: (f) => ({ state: f.state, prescriber_id: f.prescriber_id, date_from: f.rx_from, date_to: f.rx_to }),
        render: renderUnfilled, csv: csvUnfilled
    },
    {
        id: "doctors", label: "Prescriptions by Doctor", report: "by-prescriber",
        fields: ["date_from", "date_to", "prescriber_id"],
        params: (f) => ({ date_from: f.date_from, date_to: f.date_to, prescriber_id: f.prescriber_id }),
        render: renderDoctors, csv: csvDoctors
    }
];

export async function initPharmacyReports() {
    activeTab = "log";
    lastData = null;
    filters = defaults();

    const result = await fetchPharmacyReportOptions();
    if (result?.success) options = result.data;

    renderTabs();
    renderFilters();
    await run();
}

function tab() {
    return TABS.find((t) => t.id === activeTab) || TABS[0];
}

function renderTabs() {
    $("phrTabs").innerHTML = TABS.map((t) => `<button type="button" data-phr-tab="${t.id}" class="${t.id === activeTab ? "active" : ""}">${t.label}</button>`).join("");
    $("phrTabs").querySelectorAll("[data-phr-tab]").forEach((btn) => btn.addEventListener("click", async () => {
        activeTab = btn.dataset.phrTab;
        renderTabs();
        renderFilters();
        await run();
    }));
}

function select(name, list, placeholder, label) {
    return `<label>${label}<select data-phr-filter="${name}"><option value="">${placeholder}</option>${list.map((o) =>
        `<option value="${o.id}" ${String(filters[name]) === String(o.id) ? "selected" : ""}>${escapeHtml(o.name)}</option>`).join("")}</select></label>`;
}

function choice(name, label, pairs) {
    return `<label>${label}<select data-phr-filter="${name}">${pairs.map(([v, text]) =>
        `<option value="${v}" ${filters[name] === v ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></label>`;
}

function renderFilters() {
    const t = tab();
    const ddDrugs = options.controlled_drugs.filter((d) => filters.class === "all"
        || d.controlled_class === (options.classes.find((c) => c.value === filters.class)?.label));
    const parts = t.fields.map((f) => ({
        date_from: `<label>${t.id === "doctors" ? "Prescribed from" : "From"}<input type="date" data-phr-filter="date_from" value="${filters.date_from}"></label>`,
        date_to: `<label>To<input type="date" data-phr-filter="date_to" value="${filters.date_to}"></label>`,
        rx_from: `<label>Prescribed from<input type="date" data-phr-filter="rx_from" value="${filters.rx_from}"></label>`,
        rx_to: `<label>To<input type="date" data-phr-filter="rx_to" value="${filters.rx_to}"></label>`,
        warehouse_id: select("warehouse_id", options.warehouses, "All locations", "Location"),
        drug_id: select("drug_id", options.drugs, "All medicines", "Medicine"),
        dd_drug_id: select("dd_drug_id", ddDrugs, "Every drug in the class", "Drug"),
        prescriber_id: select("prescriber_id", options.prescribers, "All doctors", "Doctor"),
        dispensed_by: select("dispensed_by", options.dispensers, "Anyone", "Dispensed by"),
        status: choice("status", "Show", Object.entries(STATUS)),
        flag: choice("flag", "Medicines", [["", "All"], ["high_alert", "High-alert only"], ["controlled", "Dangerous drugs & precursors"]]),
        class: choice("class", "Class", [...options.classes.map((c) => [c.value, c.label]), ["all", "Both"]]),
        state: choice("state", "Which", [["all", "Still open and lapsed"], ["open", "Can still be filled"], ["lapsed", "Lapsed unfilled"]]),
        q: `<label>Search<input type="search" data-phr-filter="q" value="${escapeHtml(filters.q)}" placeholder="Patient, Rx or DSP no."></label>`
    }[f])).join("");

    $("phrFilters").innerHTML = `${parts}
        <div class="phr-actions">
            <button type="button" class="phr-btn small primary" id="phrRun">Show</button>
            <button type="button" class="phr-btn small" id="phrCsv">Export CSV</button>
            <button type="button" class="phr-btn small" id="phrPrint">Print</button>
        </div>`;

    $("phrFilters").querySelectorAll("[data-phr-filter]").forEach((el) => {
        const key = el.dataset.phrFilter;
        el.addEventListener("change", () => {
            filters[key] = el.value;
            if (key === "class") {
                filters.dd_drug_id = "";
                renderFilters();
            }
            // Pickers re-run straight away; dates and search wait for "Show" (or Enter).
            if (el.tagName === "SELECT") run();
        });
        if (el.type === "search") {
            el.addEventListener("input", () => { filters.q = el.value; });
            el.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
        }
    });
    $("phrRun").addEventListener("click", run);
    $("phrCsv").addEventListener("click", exportCsv);
    $("phrPrint").addEventListener("click", printReport);
}

async function run() {
    const t = tab();
    lastData = null;
    const params = t.params(filters);

    if (params.date_from && params.date_to && params.date_from > params.date_to) {
        $("phrBody").innerHTML = `<div class="phr-empty">The "from" date is after the "to" date.</div>`;
        return;
    }

    $("phrBody").innerHTML = `<div class="phr-empty">Loading...</div>`;
    const result = await fetchPharmacyReport(t.report, params);

    if (activeTab !== t.id) return; // switched tabs while loading

    if (!result?.success) {
        $("phrBody").innerHTML = `<div class="phr-empty">${escapeHtml(result?.message || "Couldn't load the report.")}</div>`;
        return;
    }

    lastData = result.data;
    $("phrBody").innerHTML = t.render(result.data);
}

const time = (dt) => (dt ? String(dt).slice(11, 16) : "");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ---------------------------------------------------------------
 * Dispensing log
 * ------------------------------------------------------------- */

function renderLog(d) {
    const t = d.totals;
    return `
        <div class="phr-stats">
            <div class="phr-stat"><strong>${t.dispensings}</strong><span>Dispensings · ${plural(t.patients, "patient")}</span></div>
            <div class="phr-stat"><strong>${t.lines}</strong><span>Medicine lines given (per lot)</span></div>
            <div class="phr-stat"><strong>${formatMoney(t.charged)}</strong><span>Charged to patients (after discounts)</span></div>
            <div class="phr-stat"><strong>${formatMoney(t.cost_value)}</strong><span>Value at cost</span></div>
            <div class="phr-stat ${t.awaiting_check ? "bad" : ""}"><strong>${t.awaiting_check}</strong><span>High-alert still to be checked</span></div>
            ${d.filters.status !== "completed" ? `<div class="phr-stat"><strong>${t.voided}</strong><span>Undone</span></div>` : ""}
        </div>
        <div class="phr-card">
            <div class="phr-card-title">Medicines Given <span style="text-transform:none;font-weight:400;">Newest first${d.filters.date_from ? ` · ${formatDate(d.filters.date_from)} – ${formatDate(d.filters.date_to || todayISO())}` : ""}</span></div>
            ${d.rows.length ? `
            <div class="phr-table-wrap"><table class="phr-table">
                <thead><tr><th>Date</th><th>Dispensing</th><th>Patient</th><th>Medicine</th><th class="num">Qty</th><th>Lot</th><th>Location</th><th>Doctor</th><th>Given by</th><th>Second check</th></tr></thead>
                <tbody>${d.rows.map((r) => `
                    <tr class="${r.status === "voided" ? "voided" : ""}">
                        <td style="white-space:nowrap;">${formatDate(r.dispensed_date)}<span class="phr-sub">${time(r.dispensed_at)}</span></td>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.dispense_number)}</strong><span class="phr-sub">${escapeHtml(r.rx_number)}</span>
                            ${r.status === "voided" ? `<span class="phr-badge muted">Undone</span>${r.void_reason ? `<span class="phr-sub">${escapeHtml(r.void_reason)}</span>` : ""}` : ""}</td>
                        <td>${escapeHtml(r.patient_name)}<span class="phr-sub">${escapeHtml(r.patient_no || "")}</span></td>
                        <td>${escapeHtml(r.drug_name)}${r.fill_label ? `<span class="phr-sub">${escapeHtml(r.fill_label)}</span>` : ""}
                            ${r.is_controlled ? `<span class="phr-badge dd">${r.controlled_class.startsWith("Dangerous") ? "Dangerous drug" : "Precursor"}</span>` : ""}
                            ${r.is_high_alert ? `<span class="phr-badge ha">High-alert</span>` : ""}</td>
                        <td class="num">${formatQty(r.quantity)}<span class="phr-sub">${escapeHtml(r.unit_name || "")}</span></td>
                        <td style="white-space:nowrap;">${escapeHtml(r.lot_number)}${r.expires_date ? `<span class="phr-sub">exp ${formatDate(r.expires_date)}</span>` : ""}</td>
                        <td>${escapeHtml(r.warehouse_name)}</td>
                        <td>${escapeHtml(r.prescriber_name || "—")}</td>
                        <td>${escapeHtml(r.dispensed_by_name || "—")}</td>
                        <td>${r.check_status === "checked" ? `${escapeHtml(r.checked_by_name || "—")}<span class="phr-sub">${formatDate(String(r.checked_at).slice(0, 10))} ${time(r.checked_at)}</span>`
                            : r.check_status === "awaiting" ? (r.status === "completed" ? `<span class="phr-badge warn">Waiting</span>` : `<span class="phr-sub" style="margin:0;">Not checked</span>`)
                            : `<span class="phr-sub" style="margin:0;">Not needed</span>`}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            ${d.truncated ? `<p class="phr-note">Showing the first 5,000 lines. Narrow the dates or filters to see the rest.</p>` : ""}` : `<div class="phr-empty">Nothing dispensed with these filters.</div>`}
            <p class="phr-note">One line per medicine per lot. Charged = what the patient was charged for the medicines shown; undone dispensings aren't counted.</p>
        </div>`;
}

function csvLog(d) {
    return [
        ["Date", "Time", "Dispensing No.", "Rx No.", "Status", "Patient No.", "Patient", "Medicine", "Generic Name", "Class", "High-alert", "Fill", "Quantity", "Unit",
            "Lot", "Expiry", "Location", "Doctor", "Given By", "Second Check By", "Checked At", "Value at Cost", "Undo Reason"],
        ...d.rows.map((r) => [r.dispensed_date, time(r.dispensed_at), r.dispense_number, r.rx_number, r.status === "voided" ? "Undone" : "Given", r.patient_no, r.patient_name,
            r.drug_name, r.generic_name, r.controlled_class, r.is_high_alert ? "Yes" : "", r.fill_label || "Original", r.quantity, r.unit_name, r.lot_number, r.expires_date,
            r.warehouse_name, r.prescriber_name, r.dispensed_by_name, r.checked_by_name || (r.check_status === "awaiting" ? (r.status === "completed" ? "Waiting" : "Not checked") : ""), r.checked_at || "", r.cost_value, r.void_reason || ""])
    ];
}

/* ---------------------------------------------------------------
 * Dangerous Drugs register
 * ------------------------------------------------------------- */

function drugTitle(s) {
    return s.generic_name
        ? `${escapeHtml(s.generic_name.toUpperCase())}${s.brand_name ? ` (${escapeHtml(s.brand_name)})` : ""} ${escapeHtml([s.strength, s.dosage_form].filter(Boolean).join(" "))}`
        : escapeHtml(s.drug_name);
}

function renderRegister(d) {
    const off = d.sections.filter((s) => s.reconciled === false);
    const head = `
        <div class="phr-stats">
            <div class="phr-stat"><strong>${d.sections.length}</strong><span>Drugs with movement or stock${d.drug_count > d.sections.length ? ` (of ${d.drug_count} in the class)` : ""}</span></div>
            <div class="phr-stat"><strong>${formatQty(d.sections.reduce((n, s) => n + s.total_in, 0))}</strong><span>Units in</span></div>
            <div class="phr-stat"><strong>${formatQty(d.sections.reduce((n, s) => n + s.total_out, 0))}</strong><span>Units out</span></div>
            <div class="phr-stat ${off.length ? "bad" : "good"}"><strong>${off.length ? off.length : "&#10003;"}</strong><span>${off.length ? "Don't match the stock on hand" : "Every balance matches the stock on hand"}</span></div>
        </div>
        <p class="phr-note" style="margin:0 0 12px;">${escapeHtml(d.facility?.name || "")}${d.facility?.address ? ` · ${escapeHtml(d.facility.address)}` : ""} · ${d.warehouse_name ? escapeHtml(d.warehouse_name) : "All locations"}
            · ${d.filters.date_from ? `${formatDate(d.filters.date_from)} – ${formatDate(d.filters.date_to || todayISO())}` : `Up to ${formatDate(d.filters.date_to || todayISO())}`}</p>`;

    if (!d.sections.length) {
        return `${head}<div class="phr-empty">${d.drug_count ? "None of these drugs moved in this period or are in stock." : "No drug in the Drug Catalog is marked with this class. Set the controlled-drug class on a drug in Drug Catalog &amp; Stock."}</div>`;
    }

    return head + d.sections.map((s) => `
        <div class="phr-card">
            <div class="phr-drug-head">
                <h2>${drugTitle(s)}</h2>
                <span class="phr-sub"><span class="phr-badge dd">${escapeHtml(s.controlled_class)}</span> · in ${escapeHtml(s.unit_name || "units")}</span>
            </div>
            <div class="phr-table-wrap"><table class="phr-table">
                <thead><tr><th>Date</th><th>Entry</th><th>Reference</th><th>Received from / Given to</th><th>Prescription</th><th>Prescriber</th><th>Lot</th><th class="num">In</th><th class="num">Out</th><th class="num">Balance</th><th>Recorded by</th></tr></thead>
                <tbody>
                    <tr><td colspan="9"><strong>Balance brought forward</strong></td><td class="num"><strong>${formatQty(s.opening_balance)}</strong></td><td></td></tr>
                    ${s.rows.map((r) => `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(r.date)}</td>
                        <td>${escapeHtml(r.type_label)}${r.reason ? `<span class="phr-sub">${escapeHtml(r.reason)}</span>` : ""}</td>
                        <td style="white-space:nowrap;">${escapeHtml(r.reference_no || "—")}</td>
                        <td>${escapeHtml(r.counterparty || "—")}${r.patient_no ? `<span class="phr-sub">${escapeHtml(r.patient_no)}</span>` : ""}${r.patient_address ? `<span class="phr-sub">${escapeHtml(r.patient_address)}</span>` : ""}</td>
                        <td style="white-space:nowrap;">${r.rx_number ? `${escapeHtml(r.rx_number)}${r.prescribed_date ? `<span class="phr-sub">${formatDate(r.prescribed_date)}</span>` : ""}` : "—"}</td>
                        <td>${r.prescriber_name ? `${escapeHtml(r.prescriber_name)}<span class="phr-sub">${r.prescriber_s2 ? `S2 ${escapeHtml(r.prescriber_s2)}` : "No S2 on file"}${r.prescriber_prc ? ` · PRC ${escapeHtml(r.prescriber_prc)}` : ""}</span>` : "—"}</td>
                        <td style="white-space:nowrap;">${escapeHtml(r.lot_number)}${r.expires_date ? `<span class="phr-sub">exp ${formatDate(r.expires_date)}</span>` : ""}<span class="phr-sub">${escapeHtml(r.warehouse_name)}</span></td>
                        <td class="num">${r.quantity_in != null ? formatQty(r.quantity_in) : ""}</td>
                        <td class="num">${r.quantity_out != null ? formatQty(r.quantity_out) : ""}</td>
                        <td class="num"><strong>${formatQty(r.balance)}</strong></td>
                        <td>${escapeHtml(r.recorded_by || "—")}</td>
                    </tr>`).join("")}
                </tbody>
                <tfoot><tr><td colspan="7">Totals · closing balance</td><td class="num">${formatQty(s.total_in)}</td><td class="num">${formatQty(s.total_out)}</td><td class="num">${formatQty(s.closing_balance)}</td><td></td></tr></tfoot>
            </table></div>
            ${!s.rows.length ? `<p class="phr-note">No movement in this period.</p>` : ""}
            ${s.reconciled === false ? `<p class="phr-note" style="color:#b91c1c;font-weight:600;">The register ends at ${formatQty(s.closing_balance)} but ${formatQty(s.on_hand)} is on hand — a difference of ${formatQty(Math.abs(s.closing_balance - s.on_hand))}. Investigate and report the discrepancy.</p>`
                : s.reconciled ? `<p class="phr-note">Matches the ${formatQty(s.on_hand)} on hand.</p>` : ""}
        </div>`).join("") + `
        <div class="phr-signs">
            <div>Prepared by (Pharmacist): ______________________________ &nbsp; PRC No.: __________</div>
            <div>Noted by (S2 license holder): ______________________________ &nbsp; Date: __________</div>
        </div>`;
}

function csvRegister(d) {
    const rows = [["Drug", "Generic Name", "Strength", "Class", "Unit", "Date", "Entry", "Reference", "Received From / Given To", "Patient No.", "Patient Address",
        "Rx No.", "Rx Date", "Prescriber", "Prescriber S2", "Prescriber PRC", "Lot", "Expiry", "Location", "In", "Out", "Balance", "Recorded By"]];
    d.sections.forEach((s) => {
        const base = [s.drug_name, s.generic_name, s.strength, s.controlled_class, s.unit_name];
        rows.push([...base, d.filters.date_from || "", "Balance brought forward", "", "", "", "", "", "", "", "", "", "", "", "", "", "", s.opening_balance, ""]);
        s.rows.forEach((r) => rows.push([...base, r.date, r.type_label, r.reference_no, r.counterparty, r.patient_no, r.patient_address, r.rx_number, r.prescribed_date,
            r.prescriber_name, r.prescriber_s2, r.prescriber_prc, r.lot_number, r.expires_date, r.warehouse_name, r.quantity_in ?? "", r.quantity_out ?? "", r.balance, r.recorded_by]));
    });
    return rows;
}

/* ---------------------------------------------------------------
 * Unfilled prescriptions
 * ------------------------------------------------------------- */

function renderUnfilled(d) {
    const t = d.totals;
    return `
        <div class="phr-stats">
            <div class="phr-stat"><strong>${t.count}</strong><span>Prescriptions not fully given</span></div>
            <div class="phr-stat"><strong>${t.open}</strong><span>Can still be filled</span></div>
            <div class="phr-stat ${t.lapsed ? "bad" : ""}"><strong>${t.lapsed}</strong><span>Lapsed before being filled</span></div>
            <div class="phr-stat"><strong>${t.never_given}</strong><span>Nothing given yet · ${t.partly_given} partly given</span></div>
            ${t.controlled ? `<div class="phr-stat"><strong>${t.controlled}</strong><span>With a dangerous drug or precursor</span></div>` : ""}
        </div>
        <div class="phr-card">
            <div class="phr-card-title">Not Yet Filled or Partly Filled <span style="text-transform:none;font-weight:400;">Oldest first</span></div>
            ${d.rows.length ? `
            <div class="phr-table-wrap"><table class="phr-table">
                <thead><tr><th>Prescription</th><th>Patient</th><th>Doctor</th><th>Medicines (given / prescribed)</th><th class="num">Waiting</th><th>Status</th></tr></thead>
                <tbody>${d.rows.map((r) => `
                    <tr>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.rx_number)}</strong><span class="phr-sub">${formatDate(r.prescribed_date)}</span></td>
                        <td>${escapeHtml(r.patient_name)}<span class="phr-sub">${escapeHtml([r.patient_no, r.mobile_phone].filter(Boolean).join(" · "))}</span></td>
                        <td>${escapeHtml(r.prescriber_name || "—")}</td>
                        <td><ul class="phr-meds">${r.medicines.map((m) => `<li>${escapeHtml(m.title)}
                            ${!m.in_catalog ? `<span class="phr-sub" style="display:inline;">— not in the catalog</span>`
                                : m.is_complete ? `<span class="phr-badge ok">Given</span>`
                                : `<span class="phr-sub" style="display:inline;">— ${formatQty(m.given)} / ${m.prescribed_quantity != null ? `${formatQty(m.prescribed_quantity)} ${escapeHtml(m.unit_name || "")}` : escapeHtml(m.quantity || "?")}</span>`}
                            ${m.fill_label ? `<span class="phr-badge muted">${escapeHtml(m.fill_label)}</span>` : ""}
                            ${m.is_controlled ? `<span class="phr-badge dd">DD</span>` : ""}${m.is_high_alert ? ` <span class="phr-badge ha">High-alert</span>` : ""}</li>`).join("")}</ul></td>
                        <td class="num">${plural(r.days_waiting, "day")}</td>
                        <td>${r.is_lapsed ? `<span class="phr-badge bad">Lapsed</span><span class="phr-sub">on ${formatDate(r.fillable_until)}</span>`
                            : `<span class="phr-badge ${r.dispense_status === "partial" ? "warn" : "muted"}">${escapeHtml(r.status_label)}</span>${r.fillable_until ? `<span class="phr-sub">until ${formatDate(r.fillable_until)}</span>` : ""}`}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            ${d.truncated ? `<p class="phr-note">Showing the first 5,000. Narrow it down by doctor or date.</p>` : ""}` : `<div class="phr-empty">Every prescription in this range has been filled.</div>`}
            <p class="phr-note">Lapsed = the prescription's validity (or refill period, once refills started) ended before it was fully given. Cancelled and closed prescriptions aren't listed. Open a prescription under Dispensing to fill it.</p>
        </div>`;
}

function csvUnfilled(d) {
    const rows = [["Rx No.", "Prescribed", "Patient No.", "Patient", "Mobile", "Doctor", "Status", "Lapsed", "Fillable Until", "Days Waiting", "Medicine", "Given", "Prescribed Qty", "Unit"]];
    d.rows.forEach((r) => r.medicines.forEach((m) => rows.push([r.rx_number, r.prescribed_date, r.patient_no, r.patient_name, r.mobile_phone, r.prescriber_name,
        r.status_label, r.is_lapsed ? "Yes" : "No", r.fillable_until, r.days_waiting, m.title, m.in_catalog ? m.given : "", m.prescribed_quantity ?? m.quantity, m.unit_name])));
    return rows;
}

/* ---------------------------------------------------------------
 * Prescriptions by doctor
 * ------------------------------------------------------------- */

function renderDoctors(d) {
    const t = d.totals;
    const rate = (v) => (v == null ? "—" : `${v}%`);
    return `
        <div class="phr-stats">
            <div class="phr-stat"><strong>${t.total}</strong><span>Prescriptions · ${plural(t.medicines, "medicine")}</span></div>
            <div class="phr-stat good"><strong>${rate(t.fill_rate)}</strong><span>Fully dispensed here</span></div>
            <div class="phr-stat ${t.lapsed ? "bad" : ""}"><strong>${t.lapsed}</strong><span>Lapsed unfilled</span></div>
            <div class="phr-stat"><strong>${t.controlled}</strong><span>With a dangerous drug or precursor</span></div>
        </div>
        <div class="phr-card">
            <div class="phr-card-title">By Doctor <span style="text-transform:none;font-weight:400;">${formatDate(d.filters.date_from)} – ${formatDate(d.filters.date_to)}</span></div>
            ${d.rows.length ? `
            <div class="phr-table-wrap"><table class="phr-table">
                <thead><tr><th>Doctor</th><th class="num">Prescriptions</th><th class="num">Medicines</th><th class="num">Dispensed</th><th class="num">Partly</th><th class="num">Waiting</th><th class="num">Lapsed</th><th class="num">Closed</th><th class="num">Cancelled</th><th class="num">DD</th><th>Fill Rate</th><th>Most Prescribed</th></tr></thead>
                <tbody>${d.rows.map((r) => `
                    <tr>
                        <td><strong>${escapeHtml(r.prescriber_name)}</strong><span class="phr-sub">${plural(r.patients, "patient")}</span></td>
                        <td class="num"><strong>${r.total}</strong></td>
                        <td class="num">${r.medicines}</td>
                        <td class="num">${r.dispensed}</td>
                        <td class="num">${r.partial || "—"}</td>
                        <td class="num">${r.open || "—"}</td>
                        <td class="num">${r.lapsed ? `<span class="phr-up">${r.lapsed}</span>` : "—"}</td>
                        <td class="num">${r.closed || "—"}</td>
                        <td class="num">${r.cancelled || "—"}</td>
                        <td class="num">${r.controlled || "—"}</td>
                        <td><span class="phr-rate">${rate(r.fill_rate)}</span>${r.fill_rate != null ? `<div class="phr-bar"><span style="width:${Math.min(100, r.fill_rate)}%"></span></div>` : ""}</td>
                        <td>${r.top_medicines.map((m) => `<span class="phr-sub" style="margin:0;color:var(--text-primary);">${escapeHtml(m.medicine)} <span style="color:var(--text-muted);">× ${m.times}</span></span>`).join("") || "—"}</td>
                    </tr>`).join("")}</tbody>
            </table></div>` : `<div class="phr-empty">No prescriptions written in this period.</div>`}
            <p class="phr-note">Waiting includes partly dispensed ones still within their validity. Fill rate = fully dispensed ÷ prescriptions the pharmacy could fill (not cancelled, with at least one Drug Catalog medicine).</p>
        </div>`;
}

function csvDoctors(d) {
    return [
        ["Doctor", "Patients", "Prescriptions", "Medicines", "Dispensed", "Partly Dispensed", "Waiting", "Lapsed", "Closed", "Cancelled", "Not From Catalog", "With Dangerous Drug", "Fill Rate %", "Most Prescribed"],
        ...d.rows.map((r) => [r.prescriber_name, r.patients, r.total, r.medicines, r.dispensed, r.partial, r.open, r.lapsed, r.closed, r.cancelled, r.outside, r.controlled,
            r.fill_rate ?? "", r.top_medicines.map((m) => `${m.medicine} x${m.times}`).join("; ")])
    ];
}

/* ---------------------------------------------------------------
 * Export & print
 * ------------------------------------------------------------- */

function exportCsv() {
    if (!lastData) {
        showToast("Show the report first.", "info");
        return;
    }

    const rows = tab().csv(lastData);
    const cell = (v) => {
        const text = String(v ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${tab().report}-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function printReport() {
    if (!lastData) {
        showToast("Show the report first.", "info");
        return;
    }

    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    const t = tab();
    const scope = [...$("phrFilters").querySelectorAll("select")].map((s) => s.value ? s.selectedOptions[0].textContent : "").filter(Boolean).join(" · ");
    const params = t.params(filters);
    const period = params.date_from || params.date_to ? `${params.date_from ? formatDate(params.date_from) : "Start"} – ${formatDate(params.date_to || todayISO())} · ` : "";
    const title = t.id === "dd" ? "Dangerous Drugs Register (RA 9165)" : t.label;

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<style>
    @page { size: A4 landscape; margin: 10mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10.5px; margin: 0; padding: 16px; }
    h1 { margin: 0 0 2px; font-size: 18px; } h2 { font-size: 13px; margin: 0; } .muted, .phr-sub, .phr-note { color: #4b5563; font-size: 9.5px; display: block; }
    .phr-stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; } .phr-stat { border: 1px solid #d1d5db; padding: 6px 10px; min-width: 150px; }
    .phr-stat strong { display: block; font-size: 14px; } .phr-card { margin-bottom: 14px; ${t.id === "dd" ? "page-break-inside: auto;" : ""} } .phr-card-title { font-weight: 700; text-transform: uppercase; font-size: 10.5px; margin: 10px 0 6px; }
    .phr-drug-head { display: flex; justify-content: space-between; align-items: baseline; margin: 12px 0 6px; }
    table { width: 100%; border-collapse: collapse; } th { background: #f3f4f6; text-align: left; font-size: 9px; text-transform: uppercase; padding: 4px; border: 1px solid #d1d5db; }
    td { padding: 4px; border: 1px solid #d1d5db; vertical-align: top; } tfoot td { font-weight: 700; } .num { text-align: right; white-space: nowrap; } tr { page-break-inside: avoid; }
    tr.voided td { color: #6b7280; text-decoration: line-through; }
    .phr-bar { display: none; } .phr-badge { font-weight: 700; font-size: 9px; } .phr-badge::before { content: "["; } .phr-badge::after { content: "]"; }
    .phr-empty { padding: 10px; border: 1px dashed #d1d5db; color: #4b5563; } .phr-meds { margin: 0; padding-left: 14px; }
    .phr-signs { display: flex; flex-direction: column; gap: 26px; margin-top: 34px; font-size: 11px; page-break-inside: avoid; }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="muted">${escapeHtml(period)}${escapeHtml(scope || "All")} · printed ${formatDate(todayISO())}</div>
${$("phrBody").innerHTML}
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body></html>`);
    win.document.close();
}
