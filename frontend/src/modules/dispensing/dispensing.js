import {
    fetchDispensingQueue, fetchDispensingDetail, fetchDispensingOptions, dispensePrescription,
    voidDispense, closePrescription, fetchDispenseLabels, saveDispenseAuxiliaryLabel, declineRefillRequest, recordDispensePayment, fetchChargeSlip, checkDispense,
    saveClinicalVerification
} from "./dispensing.service.js?v=9";
import { formatQty, formatDate, formatMoney, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=5";
import { showToast } from "../../core/toast.js";

const LOCATION_KEY = "dp_location";
const EPSILON = 0.0005;

let view = "to_fill";
let queue = null;
let detail = null;
let warehouses = [];
let discounts = [];
let paymentMethods = [];
let searchTimer = null;
let lastDispensed = null; // {id, number, net} -- offered for payment and printing

const $ = (id) => document.getElementById(id);

export async function initDispensing() {
    view = "to_fill";
    queue = null;
    detail = null;
    lastDispensed = null;

    $("dpViews").querySelectorAll("[data-dp-view]").forEach((btn) => btn.addEventListener("click", () => {
        view = btn.dataset.dpView;
        $("dpViews").querySelectorAll("[data-dp-view]").forEach((b) => b.classList.toggle("active", b === btn));
        loadQueue();
    }));
    $("dpSearch").addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadQueue, 300);
    });
    $("dpRefresh").addEventListener("click", loadQueue);
    $("dpBack").addEventListener("click", showQueue);
    $("dpDetail").addEventListener("click", onDetailClick);
    $("dpDetail").addEventListener("input", onDetailInput);
    $("dpDetail").addEventListener("change", onDetailChange);

    const options = await fetchDispensingOptions();
    warehouses = options?.success ? options.data.warehouses : [];
    discounts = options?.success ? options.data.discounts : [];
    paymentMethods = options?.success ? options.data.payment_methods : [];
    await loadQueue();
}

/* ---------------------------------------------------------------
 * Queue
 * ------------------------------------------------------------- */

async function loadQueue() {
    if (!queue) $("dpQueue").innerHTML = `<div class="dp-empty">Loading...</div>`;
    const result = await fetchDispensingQueue({ view, q: $("dpSearch").value.trim() });

    if (!result?.success) {
        $("dpQueue").innerHTML = `<div class="dp-empty">${escapeHtml(result?.message || "Couldn't load the prescriptions.")}</div>`;
        return;
    }

    queue = result.data;
    const setCount = (el, n) => { if (el) { el.hidden = !n; el.textContent = n; } };
    setCount($("dpCountToFill"), queue.counts.to_fill);
    setCount($("dpCountToVerify"), queue.counts.to_verify);
    setCount($("dpCountRefills"), queue.counts.refills);
    setCount($("dpCountExpired"), queue.counts.expired);
    setCount($("dpCountToCheck"), queue.counts.to_check);
    renderQueue();
}

function statusBadge(row) {
    if (row.is_expired && ["pending", "partial"].includes(row.dispense_status)) return `<span class="dp-badge expired">Expired</span>`;
    return `<span class="dp-badge ${escapeHtml(row.dispense_status)}">${escapeHtml(row.status_label || row.dispense_status)}</span>`;
}

function clinicalVerificationBadge(status) {
    const st = status || "Pending Review";
    if (st === "Approved") return `<span class="dp-badge dispensed" title="Pharmacist Clinical Verification: Approved">&#10003; Rx Verified</span>`;
    if (st === "Intervention Needed") return `<span class="dp-badge dd" title="Pharmacist Clinical Verification: Intervention Needed">&#9888; Intervention Needed</span>`;
    if (st === "Clarification Requested") return `<span class="dp-badge ha" title="Pharmacist Clinical Verification: Prescriber Clarification Requested">&#10067; Clarification Req.</span>`;
    if (st === "Rejected") return `<span class="dp-badge expired" title="Pharmacist Clinical Verification: Rejected">&#128683; Rejected</span>`;
    return `<span class="dp-badge partial" title="Awaiting Pharmacist Clinical Verification">&#9203; Pending Verification</span>`;
}

function renderQueue() {
    const rows = queue.rows;
    const empty = {
        to_fill: "No prescriptions are waiting to be dispensed.",
        to_verify: "All active prescriptions have been clinically verified and approved by a pharmacist.",
        refills: "No refill requests are waiting.",
        partial: "No prescriptions are partly dispensed.",
        to_check: "No high-alert dispensings are waiting for a second check.",
        expired: "No unfilled prescriptions have expired.",
        dispensed: "Nothing dispensed yet.",
        closed: "No closed prescriptions.",
        all: "No prescriptions."
    }[view];

    $("dpQueue").innerHTML = rows.length ? `
        <div class="dp-card">
            <div class="dp-table-wrap"><table class="dp-table wide">
                <thead><tr><th>Prescription</th><th>Patient</th><th>Medicines</th><th>Doctor</th><th>Clinical Review &amp; Status</th></tr></thead>
                <tbody>${rows.map((r) => `
                    <tr class="dp-click" data-dp-open="${r.id}" tabindex="0" title="Open for clinical verification and dispensing">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.rx_number)}</strong>
                            <span class="dp-sub">${escapeHtml(formatDate(r.prescribed_date))}</span>
                            ${r.valid_until ? `<span class="dp-sub">Valid until ${escapeHtml(formatDate(r.valid_until))}</span>` : ""}</td>
                        <td><strong>${escapeHtml(r.patient_name)}</strong><span class="dp-sub">${escapeHtml(r.patient_no || "")}</span></td>
                        <td>${r.medicines.slice(0, 4).map((m) => `<span class="dp-sub" style="margin:0;color:var(--text-primary);">${escapeHtml(m)}</span>`).join("")}
                            ${r.medicines.length > 4 ? `<span class="dp-sub">+ ${r.medicines.length - 4} more</span>` : ""}
                            ${r.catalog_count < r.line_count ? `<span class="dp-sub">${r.line_count - r.catalog_count} not from the catalog</span>` : ""}</td>
                        <td>${escapeHtml(r.prescriber_name || "—")}</td>
                        <td>${clinicalVerificationBadge(r.clinical_verification_status)} ${statusBadge(r)}${r.refill_requests ? ` <span class="dp-badge partial">Refill requested</span>` : ""}${r.has_dangerous_drug ? ` <span class="dp-badge dd">Dangerous drug</span>` : ""}${r.awaiting_check ? ` <span class="dp-badge ha">Awaiting 2nd check</span>` : ""}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            ${queue.truncated ? `<p class="dp-note">Showing the first 300. Search to narrow it down.</p>` : ""}
            ${view === "to_fill" ? `<p class="dp-note">Oldest first. Expired prescriptions are under Expired — they can't be filled.</p>` : ""}
            ${view === "to_verify" ? `<p class="dp-note">Pharmacist Clinical Verification Queue: review renal adjustment (eGFR/CrCl), patient weight (mg/kg), and clinical indications before physical product picking.</p>` : ""}
            ${view === "to_check" ? `<p class="dp-note">Dispensings with a high-alert medicine. Someone other than the person who prepared it checks it before it's handed over.</p>` : ""}
        </div>` : `<div class="dp-empty">${escapeHtml(empty)}</div>`;

    $("dpQueue").querySelectorAll("[data-dp-open]").forEach((row) => {
        const open = () => openDetail(Number(row.dataset.dpOpen));
        row.addEventListener("click", open);
        row.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
    });
}

function showQueue() {
    $("dpDetailPanel").hidden = true;
    $("dpQueuePanel").hidden = false;
    loadQueue();
}

/* ---------------------------------------------------------------
 * One prescription
 * ------------------------------------------------------------- */

async function openDetail(prescriptionId, keepMessage = false) {
    $("dpQueuePanel").hidden = true;
    $("dpDetailPanel").hidden = false;
    if (!keepMessage) lastDispensed = null;
    if (!detail || detail.prescription.id !== prescriptionId) $("dpDetail").innerHTML = `<div class="dp-empty">Loading...</div>`;

    const result = await fetchDispensingDetail(prescriptionId);
    if (!result?.success) {
        detail = null;
        $("dpDetail").innerHTML = `<div class="dp-empty">${escapeHtml(result?.message || "Couldn't load the prescription.")}</div>`;
        return;
    }

    detail = result.data;
    renderDetail();
}

function chosenLocation() {
    const select = $("dpLocation");
    if (select && select.value) return Number(select.value);
    let saved = null;
    try { saved = Number(localStorage.getItem(LOCATION_KEY)); } catch (e) { /* storage unavailable */ }
    if (saved && warehouses.some((w) => Number(w.id) === saved)) return saved;
    const pharmacy = warehouses.find((w) => /pharmacy/i.test(`${w.name} ${w.location_type || ""}`));
    return Number((pharmacy || warehouses[0])?.id || 0);
}

function lotsAt(item, warehouseId) {
    return item.lots.filter((l) => l.warehouse_id === warehouseId);
}

function renderDetail() {
    const d = detail;
    const rx = d.prescription;
    const location = chosenLocation();
    const unit = (item) => escapeHtml(item.drug_unit_name || "units");
    const open = d.can_dispense; // something can be given now: a fill under way or a refill

    const banners = [];
    if (lastDispensed) {
        const h = d.history.find((x) => x.id === lastDispensed.id);
        const held = h && h.status === "completed" && h.check_status === "awaiting";
        banners.push(held
            ? `<div class="dp-banner warn" style="justify-content:space-between;flex-wrap:wrap;"><span>&#10003; Dispensed under <strong>${escapeHtml(lastDispensed.number)}</strong>. It has a <strong>high-alert medicine</strong>: label it, then have someone else do the second check before handing it over and taking payment.</span>
                <span class="dp-actions"><button type="button" class="dp-btn small" data-dp-labels="${lastDispensed.id}">&#127991; Dosing &amp; Auxiliary Labels</button></span></div>`
            : `<div class="dp-banner ok"><span>&#10003; Dispensed under <strong>${escapeHtml(lastDispensed.number)}</strong>${h ? ` — ${h.balance > 0.004 ? `<strong>${formatMoney(h.balance)}</strong> to pay` : h.net_amount > 0 ? "paid" : "no charge"}` : ""}.</span>
            <span class="dp-actions">${h && h.balance > 0.004 ? `<button type="button" class="dp-btn small primary" data-dp-pay="${h.id}">Record payment</button>` : ""}
            <button type="button" class="dp-btn small" data-dp-slip="${lastDispensed.id}">Print charge slip</button>
            <button type="button" class="dp-btn small" data-dp-labels="${lastDispensed.id}">&#127991; Dosing &amp; Auxiliary Labels</button></span></div>`);
    } else if (d.awaiting_check) {
        banners.push(`<div class="dp-banner warn">&#9888; ${d.awaiting_check === 1 ? "A dispensing" : `${d.awaiting_check} dispensings`} below ${d.awaiting_check === 1 ? "has" : "have"} a high-alert medicine waiting for its second check. Don't hand ${d.awaiting_check === 1 ? "it" : "them"} over until checked.</div>`);
    }
    if (d.blocked_reason) {
        const reason = d.blocked_reason.replace(/(\d{4}-\d{2}-\d{2})/g, (iso) => formatDate(iso));
        banners.push(`<div class="dp-banner bad">&#9888; ${escapeHtml(reason)}</div>`);
    }
    if (d.dispense_status === "closed") {
        banners.push(`<div class="dp-banner warn">Closed${d.closed_by_name ? ` by ${escapeHtml(d.closed_by_name)}` : ""}${d.closed_at ? ` on ${escapeHtml(formatDate(String(d.closed_at).slice(0, 10)))}` : ""}${d.close_reason ? ` — ${escapeHtml(d.close_reason)}` : ""}.</div>`);
    }
    if (rx.has_dangerous_drug) {
        banners.push(`<div class="dp-banner warn">Dangerous drug (RA 9165): check the DOH special prescription form and the S2 details before giving it.</div>`);
    }

    const rows = rx.items.map((item) => {
        if (!item.can_dispense) {
            return `<tr class="done"><td><strong>${escapeHtml(item.title)}</strong><span class="dp-sub">Not in the Drug Catalog — can't be dispensed from stock.</span></td>
                <td class="num">${escapeHtml(item.quantity || "—")}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td></td><td colspan="2"></td></tr>`;
        }

        const lots = lotsAt(item, location);
        const available = lots.reduce((sum, l) => sum + l.quantity, 0);
        // A medicine is either giving its current fill, or (fill done) ready for its next refill.
        const refill = !item.can_give_now && item.can_refill;
        const giveable = item.can_give_now || refill;
        const remaining = refill ? item.prescribed_quantity : item.remaining_quantity;
        const done = item.is_complete && !refill;
        // A refill is only filled in when the patient asked for it; otherwise the pharmacist enters it.
        const fits = remaining != null ? Math.min(remaining, available) : 0;
        const suggested = !giveable || (refill && !item.refill_request) || fits <= EPSILON ? "" : fits;
        const sig = [item.dosage, item.frequency, item.directions].filter(Boolean).join(" · ");
        const req = item.refill_request;

        return `
            <tr data-line="${item.id}" data-refill="${refill ? "1" : ""}" class="${done ? "done" : ""}">
                <td><strong>${escapeHtml(item.title)}</strong>
                    ${item.refills_allowed ? `<span class="dp-sub">${escapeHtml(refill ? `Next: refill ${item.refills_used + 1} of ${item.refills_allowed}` : item.fill_label)} · ${item.refills_remaining} refill${item.refills_remaining === 1 ? "" : "s"} left</span>` : ""}
                    ${req ? `<span class="dp-sub" style="color:var(--text-primary);"><span class="dp-badge partial">Refill requested</span> ${escapeHtml(formatDate(String(req.created_at).slice(0, 10)))}${req.source === "portal" ? " via the patient portal" : req.requested_by_name ? ` by ${escapeHtml(req.requested_by_name)}` : ""}${req.notes ? ` — “${escapeHtml(req.notes)}”` : ""}
                        <button type="button" class="dp-btn small" data-dp-decline="${req.id}" style="margin-left:4px;">Decline…</button></span>` : ""}
                    ${item.drug_generic_name || item.drug_strength ? `<span class="dp-sub">${escapeHtml([item.drug_generic_name, item.drug_strength, item.drug_dosage_form].filter(Boolean).join(" · "))}</span>` : ""}
                    ${sig ? `<span class="dp-sub">Sig: ${escapeHtml(sig)}</span>` : ""}
                    ${item.is_dangerous_drug ? `<span class="dp-badge dd" style="margin-top:3px;">Dangerous drug</span>` : ""}
                    ${item.is_high_alert ? `<span class="dp-badge ha" style="margin-top:3px;">High-alert</span>` : ""}
                    <span class="dp-err" data-dp-err="${item.id}"></span></td>
                <td class="num">${item.prescribed_quantity != null ? `${formatQty(item.prescribed_quantity)} <span class="dp-sub" style="display:inline;">${unit(item)}</span>` : `${escapeHtml(item.quantity || "—")}<span class="dp-sub">you decide</span>`}</td>
                <td class="num">${refill ? "—" : item.dispensed_quantity ? formatQty(item.dispensed_quantity) : "—"}${item.dispensed_total > item.dispensed_quantity + EPSILON ? `<span class="dp-sub">${formatQty(item.dispensed_total)} in all</span>` : ""}</td>
                <td class="num">${done ? `<span class="dp-badge dispensed">Done</span>` : remaining != null ? `<strong>${formatQty(remaining)}</strong>${refill ? `<span class="dp-sub">per refill</span>` : ""}` : "—"}</td>
                <td class="num">${available > EPSILON ? formatQty(available) : `<span class="dp-badge expired">None</span>`}</td>
                <td class="num">${item.unit_price != null ? formatMoney(item.unit_price) : `<span class="dp-sub" style="margin:0;">No price</span>`}</td>
                <td>${giveable ? `<input type="number" class="dp-qty" min="0" step="any" inputmode="decimal" data-dp-qty="${item.id}" value="${suggested === "" ? "" : formatPlain(suggested)}" aria-label="Quantity to give of ${escapeHtml(item.title)}${refill ? " as a refill" : ""}" placeholder="${refill ? "Refill" : ""}">` : ""}</td>
                <td>${giveable ? `<select class="dp-lot" data-dp-lot="${item.id}" aria-label="Lot for ${escapeHtml(item.title)}">
                        <option value="">Earliest expiry first</option>
                        ${lots.map((l) => `<option value="${l.id}">${escapeHtml(l.lot_number)}${l.expires_date ? ` · exp ${escapeHtml(formatDate(l.expires_date))}` : ""} · ${formatQty(l.quantity)} left</option>`).join("")}
                    </select>` : ""}</td>
            </tr>`;
    }).join("");

    $("dpDetail").innerHTML = `
        ${banners.join("")}
        <div class="dp-card">
            <div class="dp-card-title"><span style="text-transform:none;font-size:16px;color:var(--text-primary);">${escapeHtml(rx.rx_number)}</span>
                <span>${clinicalVerificationBadge(d.clinical_verification?.verification_status)} ${statusBadge({ ...d, dispense_status: d.dispense_status, status_label: d.status_label, is_expired: rx.is_expired })}</span></div>
            <div class="dp-facts">
                <div><span>Patient</span><strong>${escapeHtml(d.patient.name)}</strong><span class="dp-sub" style="text-transform:none;letter-spacing:0;font-weight:400;">${escapeHtml([d.patient.patient_no, d.patient.age != null ? `${d.patient.age} yrs` : null, d.patient.sex, d.patient.latest_weight_kg ? `${d.patient.latest_weight_kg} kg` : null].filter(Boolean).join(" · "))}</span></div>
                <div><span>Prescribed by</span><strong>${escapeHtml(rx.prescriber_name || "—")}</strong></div>
                <div><span>Date</span><strong>${escapeHtml(formatDate(rx.prescribed_date))}</strong></div>
                <div><span>Valid until</span><strong>${rx.valid_until ? escapeHtml(formatDate(rx.valid_until)) : "—"}</strong></div>
                ${rx.diagnosis ? `<div><span>Diagnosis / Indication</span><strong>${escapeHtml(rx.diagnosis)}</strong></div>` : ""}
                ${rx.notes ? `<div><span>Doctor's notes</span><strong>${escapeHtml(rx.notes)}</strong></div>` : ""}
            </div>
        </div>
        ${renderClinicalVerificationCard(d)}
        <div class="dp-card">
            <div class="dp-card-title"><span>Medicines</span><small>Quantities in each medicine's dispensing unit</small></div>
            ${open ? `<div class="dp-form-row">
                <label>Dispense from<select id="dpLocation">${warehouses.map((w) => `<option value="${w.id}"${Number(w.id) === location ? " selected" : ""}>${escapeHtml(w.name)}</option>`).join("")}</select></label>
                <label class="dp-grow">Notes (optional)<input id="dpNotes" maxlength="500" placeholder="e.g. Patient will come back for the rest"></label>
            </div>
            <span class="dp-err" data-dp-err="general" style="margin-bottom:8px;"></span>` : ""}
            <div class="dp-table-wrap"><table class="dp-table wide">
                <thead><tr><th>Medicine</th><th class="num">Prescribed</th><th class="num">Given</th><th class="num">Remaining</th><th class="num">Usable here</th><th class="num">Price</th><th>Give now</th><th>Lot</th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div>
            ${open ? `<div class="dp-charge">
                <div class="dp-form-row">
                    <label>Discount<select id="dpDiscount">
                        <option value="">None</option>
                        ${discounts.map((x) => `<option value="${escapeHtml(x.value)}">${escapeHtml(x.label)}${x.rate ? ` — ${x.rate}%` : ""}</option>`).join("")}
                    </select></label>
                    <label id="dpDiscountIdWrap" hidden>ID number<input id="dpDiscountId" maxlength="50" placeholder="e.g. SC / PWD ID no."></label>
                    <label id="dpDiscountRateWrap" hidden>Discount %<input id="dpDiscountRate" type="number" min="0" max="100" step="0.01" style="width:90px;"></label>
                    <label id="dpDiscountReasonWrap" hidden class="dp-grow">Reason<input id="dpDiscountReason" maxlength="255" placeholder="Why the discount is given"></label>
                </div>
                <div class="dp-totals" id="dpTotals"></div>
            </div>
            ${d.patient.age != null && d.patient.age >= 60 ? `<p class="dp-note">The patient is ${d.patient.age} — the Senior Citizen discount (20%) applies with their ID.</p>` : ""}
            <span class="dp-err" data-dp-err="discount"></span>
            <div class="dp-actions" style="margin-top:14px;justify-content:flex-end;">
                ${d.can_close ? `<button type="button" class="dp-btn" id="dpClose">Close prescription…</button>` : ""}
                <button type="button" class="dp-btn primary" id="dpDispense">Dispense</button>
            </div>
            <p class="dp-note">Expired lots are never used. "Earliest expiry first" may take from several lots. Prices are the Drug Catalog selling price; the charge goes to the patient's ledger. Senior Citizen / PWD VAT exemption isn't worked out automatically.</p>`
            : d.can_close ? `<div class="dp-actions" style="margin-top:14px;justify-content:flex-end;"><button type="button" class="dp-btn" id="dpClose">Close prescription…</button></div>` : ""}
        </div>
        <div class="dp-card">
            <div class="dp-card-title"><span>Dispensing history</span></div>
            ${d.history.length ? `<div class="dp-history">${d.history.map((h) => `
                <div class="dp-hist ${h.status}">
                    <div class="dp-hist-head">
                        <div><strong>${escapeHtml(h.dispense_number)}</strong> <span class="dp-sub" style="display:inline;">${escapeHtml(formatDate(h.dispensed_date))} · ${escapeHtml(h.warehouse_name)} · ${escapeHtml(h.dispensed_by_name || "")}</span>
                            ${h.status === "voided" ? ` <span class="dp-badge voided">Undone</span>` : ""}
                            ${h.status === "completed" && h.check_status === "awaiting" ? ` <span class="dp-badge ha">Awaiting 2nd check</span>` : ""}
                            ${h.check_status === "checked" ? ` <span class="dp-badge dispensed">Checked</span>` : ""}</div>
                        <div class="dp-actions">
                            ${h.can_check ? `<button type="button" class="dp-btn small primary" data-dp-check="${h.id}">Second check…</button>` : ""}
                            ${h.status === "completed" && h.check_status !== "awaiting" && h.balance > 0.004 ? `<button type="button" class="dp-btn small primary" data-dp-pay="${h.id}">Record payment</button>` : ""}
                            ${h.status === "completed" && h.check_status === "awaiting" ? "" : `<button type="button" class="dp-btn small" data-dp-slip="${h.id}">Charge slip</button>`}
                            ${h.status === "completed" ? `<button type="button" class="dp-btn small" data-dp-labels="${h.id}">&#127991; Dosing &amp; Auxiliary Labels</button>
                                <button type="button" class="dp-btn small" data-dp-void="${h.id}">Undo…</button>` : ""}
                        </div>
                    </div>
                    <ul>${h.items.map((i) => `<li>${escapeHtml(i.title)} — ${formatQty(i.quantity)} ${escapeHtml(i.unit_name || "")}${i.is_high_alert ? ` <span class="dp-badge ha">High-alert</span>` : ""}${i.fill_label ? ` <span class="dp-badge partial">${escapeHtml(i.fill_label)}</span>` : ""} <span class="dp-sub" style="display:inline;">lot ${escapeHtml(i.lot_number)}${i.expires_date ? `, exp ${escapeHtml(formatDate(i.expires_date))}` : ""}</span></li>`).join("")}</ul>
                    <div class="dp-money"><span>Total <strong>${formatMoney(h.net_amount)}</strong>${h.discount_amount > 0 ? ` <span class="dp-sub" style="display:inline;">(${escapeHtml(h.discount_label || "discount")} −${formatMoney(h.discount_amount)}${h.discount_id_no ? `, ID ${escapeHtml(h.discount_id_no)}` : ""})</span>` : ""}</span>
                        <span>Paid <strong>${formatMoney(h.paid_amount)}</strong></span>
                        <span>${h.balance < -0.004 ? `<strong style="color:#b91c1c;">Refund due ${formatMoney(-h.balance)}</strong>` : h.balance > 0.004 ? `Balance <strong>${formatMoney(h.balance)}</strong>` : `<span class="dp-badge dispensed">Settled</span>`}</span></div>
                    ${h.notes ? `<span class="dp-sub">${escapeHtml(h.notes)}</span>` : ""}
                    ${h.status === "completed" && h.check_status === "awaiting" && h.prepared_by_viewer ? `<span class="dp-sub">You prepared this, so someone else has to do the second check.</span>` : ""}
                    ${h.check_status === "checked" ? `<span class="dp-sub">Second check by ${escapeHtml(h.checked_by_name || "—")}${h.checked_at ? ` on ${escapeHtml(formatDate(String(h.checked_at).slice(0, 10)))} ${escapeHtml(String(h.checked_at).slice(11, 16))}` : ""}${h.check_notes ? ` — “${escapeHtml(h.check_notes)}”` : ""}</span>` : ""}
                    ${h.status === "voided" ? `<span class="dp-sub">Undone${h.voided_by_name ? ` by ${escapeHtml(h.voided_by_name)}` : ""}: ${escapeHtml(h.void_reason || "")}</span>` : ""}
                </div>`).join("")}</div>`
            : `<div class="dp-empty">Nothing dispensed from this prescription yet.</div>`}
        </div>`;
    updateTotals();
}

function onDetailChange(event) {
    if (event.target.id === "dpDiscount") {
        const type = event.target.value;
        $("dpDiscountIdWrap").hidden = !["senior", "pwd"].includes(type);
        $("dpDiscountRateWrap").hidden = type !== "other";
        $("dpDiscountReasonWrap").hidden = type !== "other";
        updateTotals();
        return;
    }
    if (event.target.id === "dpLocation") {
        try { localStorage.setItem(LOCATION_KEY, event.target.value); } catch (e) { /* storage unavailable */ }
        // Keep the notes; quantities follow the new location's stock.
        const notes = $("dpNotes")?.value || "";
        renderDetail();
        if ($("dpNotes")) $("dpNotes").value = notes;
    }
}

function onDetailInput(event) {
    if (event.target.matches("[data-dp-qty], #dpDiscountRate")) updateTotals();
    const line = event.target.closest("[data-line]");
    if (line) {
        line.classList.remove("has-error");
        const err = line.querySelector("[data-dp-err]");
        if (err) err.textContent = "";
    }
}

function onDetailClick(event) {
    const quickVerify = event.target.closest("[data-dp-quick-verify]");
    if (quickVerify) return submitClinicalVerification(quickVerify.dataset.dpQuickVerify);
    if (event.target.closest("#dpSaveClinicalVerificationBtn")) return submitClinicalVerification(null);

    const labels = event.target.closest("[data-dp-labels]");
    if (labels) return printLabels(Number(labels.dataset.dpLabels));
    const undo = event.target.closest("[data-dp-void]");
    if (undo) return confirmVoid(Number(undo.dataset.dpVoid));
    const second = event.target.closest("[data-dp-check]");
    if (second) return confirmCheck(Number(second.dataset.dpCheck));
    const pay = event.target.closest("[data-dp-pay]");
    if (pay) return confirmPayment(Number(pay.dataset.dpPay));
    const slip = event.target.closest("[data-dp-slip]");
    if (slip) return printChargeSlip(Number(slip.dataset.dpSlip));
    const decline = event.target.closest("[data-dp-decline]");
    if (decline) return confirmDecline(Number(decline.dataset.dpDecline));
    if (event.target.closest("#dpDispense")) return confirmDispense();
    if (event.target.closest("#dpClose")) return confirmClose();
}

function renderClinicalVerificationCard(d) {
    const rx = d.prescription || {};
    const cv = d.clinical_verification || null;
    const st = cv?.verification_status || "Pending Review";
    const weightKg = cv?.patient_weight_kg ?? d.patient?.latest_weight_kg ?? 68.0;
    const egfr = cv?.egfr_crcl_ml_min ?? 90.0;
    const renalStatus = cv?.renal_adjustment_status || "Normal Renal Function — No Adjustment Needed";
    const weightStatus = cv?.weight_dosing_status || "Appropriate for Weight / Age";
    const indication = cv?.documented_indication || rx.diagnosis || "Outpatient clinical pharmacotherapy";
    const indOk = cv ? Number(cv.indication_verified) === 1 : true;
    const allergyOk = cv ? Number(cv.allergy_cross_check_passed) === 1 : true;
    const interOk = cv ? Number(cv.drug_interaction_check_passed) === 1 : true;
    const dupOk = cv ? Number(cv.duplicate_therapy_check_passed) === 1 : true;
    const intCat = cv?.intervention_category || "None — Regimen Clinically Appropriate";
    const notes = cv?.clinical_review_notes || "";
    const prescContacted = cv ? Number(cv.prescriber_contacted) === 1 : false;
    const rphName = cv?.pharmacist_name || "RPh. Clarissa Mendoza, PharmD (Clinical Pharmacist)";
    const rphLic = cv?.pharmacist_license_no || "PRC-RPH-0094821";

    const borderColor = st === "Approved"
        ? "#16a34a"
        : ["Intervention Needed", "Clarification Requested", "Rejected"].includes(st)
            ? "#dc2626"
            : "#0284c7";

    const allergiesList = (d.patient?.allergies || [])
        .map((a) => `${a.allergen || ""}${a.reaction ? ` (${a.reaction})` : ""}`)
        .filter(Boolean)
        .join(", ");

    return `
        <div class="dp-card" style="border-left: 4px solid ${borderColor};">
            <div class="dp-card-title" style="margin-bottom: 10px;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="color:var(--text-primary);font-size:13.5px;">&#129658; Pharmacist Clinical Verification Queue (Renal, Weight &amp; Indication Review)</span>
                    ${cv?.verification_number ? `<span class="dp-badge pending" style="font-family:monospace;">${escapeHtml(cv.verification_number)}</span>` : ""}
                    ${clinicalVerificationBadge(st)}
                </div>
                <div class="dp-actions">
                    <button type="button" class="dp-btn small primary" data-dp-quick-verify="Approved" style="background:#16a34a;border-color:#15803d;">
                        &#10003; Quick Approve Rx
                    </button>
                    <button type="button" class="dp-btn small" data-dp-quick-verify="Intervention Needed" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">
                        &#9888; Intervention Needed
                    </button>
                    <button type="button" class="dp-btn small" data-dp-quick-verify="Clarification Requested" style="background:#ffedd5;color:#9a3412;border-color:#fed7aa;">
                        &#10067; Request Clarification
                    </button>
                    <button type="button" class="dp-btn small danger" data-dp-quick-verify="Rejected">
                        &#128683; Reject
                    </button>
                </div>
            </div>

            ${allergiesList ? `<div class="dp-banner warn" style="margin-bottom:10px;padding:7px 12px;"><strong>Documented Patient Allergies:</strong> ${escapeHtml(allergiesList)}</div>` : ""}

            <div class="dp-form-row" style="margin-bottom:10px;">
                <label style="flex:1 1 200px;">Verification Decision *
                    <select id="dpCvStatus" style="font-weight:700;">
                        ${["Pending Review", "Approved", "Intervention Needed", "Clarification Requested", "Rejected"]
                            .map((opt) => `<option value="${escapeHtml(opt)}"${st === opt ? " selected" : ""}>${escapeHtml(opt)}</option>`)
                            .join("")}
                    </select>
                </label>
                <label style="flex:0 1 130px;">eGFR / CrCl (mL/min)
                    <input type="number" id="dpCvEgfr" step="0.1" min="1" max="200" value="${escapeHtml(String(egfr))}">
                </label>
                <label style="flex:1 1 240px;">Renal Dose Adjustment Review *
                    <select id="dpCvRenalStatus">
                        ${[
                            "Normal Renal Function — No Adjustment Needed",
                            "Renal Dose Adjustment Verified",
                            "Renal Dose Reduction Required",
                            "Contraindicated in Renal Impairment"
                        ].map((opt) => `<option value="${escapeHtml(opt)}"${renalStatus === opt ? " selected" : ""}>${escapeHtml(opt)}</option>`).join("")}
                    </select>
                </label>
                <label style="flex:0 1 120px;">Patient Weight (kg)
                    <input type="number" id="dpCvWeightKg" step="0.1" min="0.5" max="400" value="${escapeHtml(String(weightKg))}">
                </label>
                <label style="flex:1 1 230px;">Weight &amp; Age Dosing Review *
                    <select id="dpCvWeightStatus">
                        ${[
                            "Appropriate for Weight / Age",
                            "Weight-Based Dose Verified (mg/kg)",
                            "Dose Too High for Weight (Overdose Risk)",
                            "Subtherapeutic Dose for Weight"
                        ].map((opt) => `<option value="${escapeHtml(opt)}"${weightStatus === opt ? " selected" : ""}>${escapeHtml(opt)}</option>`).join("")}
                    </select>
                </label>
            </div>

            <div class="dp-form-row" style="margin-bottom:10px;">
                <label class="dp-grow">Verified Clinical Indication / Diagnosis *
                    <input type="text" id="dpCvIndication" value="${escapeHtml(indication)}" placeholder="e.g. Community-Acquired Pneumonia, Essential Hypertension">
                </label>
                <label style="flex:1 1 240px;">Pharmacist Intervention Category
                    <select id="dpCvInterventionCat">
                        ${[
                            "None — Regimen Clinically Appropriate",
                            "Renal Dose Adjustment",
                            "Weight-Based Dose Modification",
                            "Drug-Allergy Cross-Reactivity Alert",
                            "Major Drug-Drug Interaction",
                            "Therapeutic Duplication",
                            "Formulary Substitution",
                            "Duration / Frequency Clarification"
                        ].map((opt) => `<option value="${escapeHtml(opt)}"${intCat === opt ? " selected" : ""}>${escapeHtml(opt)}</option>`).join("")}
                    </select>
                </label>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:14px;padding:8px 12px;background:var(--bg-surface-alt);border-radius:8px;margin-bottom:10px;font-size:12.5px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
                    <input type="checkbox" id="dpCvIndOk" ${indOk ? "checked" : ""}> Indication Matches Regimen
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
                    <input type="checkbox" id="dpCvAllergyOk" ${allergyOk ? "checked" : ""}> Allergy Cross-Check Passed
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
                    <input type="checkbox" id="dpCvInterOk" ${interOk ? "checked" : ""}> No Major Drug Interactions
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
                    <input type="checkbox" id="dpCvDupOk" ${dupOk ? "checked" : ""}> No Duplicate Therapy
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#b45309;">
                    <input type="checkbox" id="dpCvPrescriberContacted" ${prescContacted ? "checked" : ""}> Prescriber Contacted for Clarification
                </label>
            </div>

            <div class="dp-form-row" style="margin-bottom:0;">
                <label class="dp-grow">Clinical Pharmacist Review / Intervention Notes
                    <input type="text" id="dpCvNotes" value="${escapeHtml(notes)}" placeholder="e.g. Verified CrCl > 60 mL/min, weight-appropriate dosing, no allergy or DDI conflicts.">
                </label>
                <label style="flex:0 1 240px;">Verifying Clinical Pharmacist
                    <input type="text" id="dpCvPharmacistName" value="${escapeHtml(rphName)}">
                </label>
                <label style="flex:0 1 140px;">PRC License No.
                    <input type="text" id="dpCvPharmacistLic" value="${escapeHtml(rphLic)}">
                </label>
                <button type="button" class="dp-btn primary" id="dpSaveClinicalVerificationBtn">
                    &#128190; Save Verification
                </button>
            </div>
            ${cv?.pharmacist_signature ? `<p class="dp-note" style="color:#15803d;font-weight:600;">&#10003; ${escapeHtml(cv.pharmacist_signature)}</p>` : ""}
        </div>
    `;
}

async function submitClinicalVerification(quickStatus = null) {
    if (!detail?.prescription?.id) return;

    const statusEl = $("dpCvStatus");
    if (quickStatus && statusEl) {
        statusEl.value = quickStatus;
    }

    const chosenStatus = quickStatus || statusEl?.value || "Approved";
    const btn = $("dpSaveClinicalVerificationBtn");
    if (btn) btn.disabled = true;

    const payload = {
        prescription_id:                detail.prescription.id,
        patient_id:                     detail.patient?.id || null,
        verification_status:            chosenStatus,
        egfr_crcl_ml_min:               $("dpCvEgfr")?.value ?? 90,
        renal_adjustment_status:        $("dpCvRenalStatus")?.value || "Normal Renal Function — No Adjustment Needed",
        patient_weight_kg:              $("dpCvWeightKg")?.value ?? 68,
        weight_dosing_status:           $("dpCvWeightStatus")?.value || "Appropriate for Weight / Age",
        documented_indication:          $("dpCvIndication")?.value || "",
        intervention_category:          $("dpCvInterventionCat")?.value || "None — Regimen Clinically Appropriate",
        indication_verified:            $("dpCvIndOk")?.checked ? 1 : 0,
        allergy_cross_check_passed:     $("dpCvAllergyOk")?.checked ? 1 : 0,
        drug_interaction_check_passed:  $("dpCvInterOk")?.checked ? 1 : 0,
        duplicate_therapy_check_passed: $("dpCvDupOk")?.checked ? 1 : 0,
        prescriber_contacted:           $("dpCvPrescriberContacted")?.checked ? 1 : 0,
        clinical_review_notes:          $("dpCvNotes")?.value || "",
        pharmacist_name:                $("dpCvPharmacistName")?.value || "RPh. Clarissa Mendoza, PharmD (Clinical Pharmacist)",
        pharmacist_license_no:          $("dpCvPharmacistLic")?.value || "PRC-RPH-0094821",
    };

    try {
        const res = await saveClinicalVerification(payload);
        if (res?.success) {
            showToast(res.message || `Clinical verification saved (${chosenStatus}).`, "success");
            await openDetail(detail.prescription.id, true);
        } else {
            showToast(res?.message || "Failed to save clinical verification.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error saving Pharmacist Clinical Verification.", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

/* ---------------------------------------------------------------
 * Dispense, undo, close
 * ------------------------------------------------------------- */

function collectDispense() {
    const location = chosenLocation();
    const errors = {};
    const items = [];

    detail.prescription.items.filter((i) => i.can_give_now || i.can_refill).forEach((item) => {
        const input = document.querySelector(`[data-dp-qty="${item.id}"]`);
        if (!input || input.value.trim() === "") return;
        const refill = !item.can_give_now && item.can_refill;
        const remaining = refill ? item.prescribed_quantity : item.remaining_quantity;
        const qty = Number(input.value);
        const lotId = Number(document.querySelector(`[data-dp-lot="${item.id}"]`)?.value || 0) || null;

        if (!Number.isFinite(qty) || qty < 0) {
            errors[item.id] = "Enter a quantity of 0 or more.";
            return;
        }
        if (qty === 0) return;
        if (remaining != null && qty > remaining + EPSILON) {
            errors[item.id] = refill ? `A refill is up to ${formatQty(remaining)}.` : `Only ${formatQty(remaining)} left to give.`;
            return;
        }
        const lots = lotsAt(item, location).filter((l) => !lotId || l.id === lotId);
        const available = lots.reduce((sum, l) => sum + l.quantity, 0);
        if (qty > available + EPSILON) {
            errors[item.id] = `Only ${formatQty(available)} usable ${lotId ? "in that lot" : "here"}.`;
            return;
        }
        items.push({ prescription_item_id: item.id, quantity: qty, lot_id: lotId, refill, title: item.title, unit: item.drug_unit_name || "units", unit_price: item.unit_price, high_alert: item.is_high_alert,
            fill: refill ? `refill ${item.refills_used + 1} of ${item.refills_allowed}` : item.current_fill > 1 ? item.fill_label.toLowerCase() : "" });
    });

    return { location, items, errors };
}

function showLineErrors(errors) {
    Object.entries(errors).forEach(([lineId, message]) => {
        const row = document.querySelector(`[data-line="${lineId}"]`);
        if (row) {
            row.classList.add("has-error");
            row.querySelector("[data-dp-err]").textContent = message;
        } else {
            const general = document.querySelector('[data-dp-err="general"]');
            if (general) general.textContent = message;
        }
    });
}

function confirmDispense() {
    document.querySelectorAll("#dpDetail [data-dp-err]").forEach((el) => { el.textContent = ""; });
    document.querySelectorAll("#dpDetail tr.has-error").forEach((el) => el.classList.remove("has-error"));

    const { location, items, errors } = collectDispense();
    if (Object.keys(errors).length) {
        showLineErrors(errors);
        return;
    }
    if (!location) {
        document.querySelector('[data-dp-err="general"]').textContent = "Choose the storage location you're dispensing from.";
        return;
    }
    if (!items.length) {
        document.querySelector('[data-dp-err="general"]').textContent = "Enter how much of at least one medicine you're giving.";
        return;
    }

    const where = warehouses.find((w) => Number(w.id) === location)?.name || "";
    const notes = $("dpNotes")?.value.trim() || "";
    const discount = readDiscount();
    if (discount.error) {
        document.querySelector('[data-dp-err="discount"]').textContent = discount.error;
        return;
    }
    const money = totalsFor(items, discount.rate);
    const unpriced = items.filter((i) => i.unit_price == null);

    openDialog({
        title: `Dispense ${detail.prescription.rx_number}`,
        body: `<p>Give these to <strong>${escapeHtml(detail.patient.name)}</strong> from <strong>${escapeHtml(where)}</strong>:</p>
            <ul>${items.map((i) => `<li>${escapeHtml(i.title)} — <strong>${formatQty(i.quantity)} ${escapeHtml(i.unit)}</strong>${i.high_alert ? ` <span class="dp-badge ha">High-alert</span>` : ""}${i.fill ? ` <span class="dp-badge partial">${escapeHtml(i.fill)}</span>` : ""}${i.unit_price != null ? ` · ${formatMoney(i.quantity * i.unit_price)}` : ""}</li>`).join("")}</ul>
            <p>Charge: <strong>${formatMoney(money.net)}</strong>${money.discount > 0 ? ` (${formatMoney(money.gross)} less ${escapeHtml(discount.label)} ${formatMoney(money.discount)})` : ""}, added to the patient's ledger.</p>
            ${unpriced.length ? `<p style="color:#b45309;">No selling price is set for ${unpriced.map((i) => escapeHtml(i.title)).join(", ")} in the Drug Catalog, so ${unpriced.length === 1 ? "it is" : "they are"} charged ₱0.00.</p>` : ""}
            ${items.some((i) => i.high_alert) ? `<p style="color:#9a3412;"><strong>High-alert medicine:</strong> after dispensing, someone else must do a second check before it's handed over and paid for.</p>` : ""}
            <p>Stock is deducted now. If it's a mistake, you can undo it afterwards.</p>`,
        okLabel: "Dispense",
        run: async () => {
            const result = await dispensePrescription({
                prescription_id: detail.prescription.id, warehouse_id: location, notes,
                discount_type: discount.type, discount_id_no: discount.id_no, discount_rate: discount.type === "other" ? discount.rate : "", discount_reason: discount.reason,
                items: items.map(({ prescription_item_id, quantity, lot_id, refill }) => ({ prescription_item_id, quantity, lot_id, refill }))
            });
            if (!result?.success && result?.errors) {
                // Line problems go on the lines; the dialog closes so they can be seen.
                const lineErrors = {};
                Object.entries(result.errors).forEach(([key, message]) => {
                    const m = key.match(/^items\.(\d+)$/);
                    if (key.startsWith("discount")) {
                        setTimeout(() => { document.querySelector('[data-dp-err="discount"]').textContent = message; }, 0);
                        return;
                    }
                    lineErrors[m ? m[1] : "general"] = message;
                });
                setTimeout(() => showLineErrors(lineErrors), 0);
                return { success: true, quiet: true, failed: result.message };
            }
            if (result?.success) {
                lastDispensed = { id: result.data.dispense_id, number: result.data.dispense_number, net: result.data.net_amount };
            }
            return result;
        },
        after: async (result) => {
            if (result?.failed) {
                showToast(result.failed, "error");
                return;
            }
            await openDetail(detail.prescription.id, true);
            loadQueue();
        }
    });
}

/** The discount chosen on screen: {type, rate, id_no, reason, label} or {error}. */
function readDiscount() {
    const type = $("dpDiscount")?.value || "";
    if (!type) return { type: "", rate: 0, id_no: "", reason: "", label: "" };
    const option = discounts.find((x) => x.value === type);
    const idNo = $("dpDiscountId").value.trim();
    const reason = $("dpDiscountReason").value.trim();
    if (type === "other") {
        const rate = Number($("dpDiscountRate").value);
        if (!(rate > 0 && rate <= 100)) return { error: "Enter a discount between 0 and 100%." };
        if (!reason) return { error: "Enter why the discount is given." };
        return { type, rate, id_no: idNo, reason, label: `${rate}% discount` };
    }
    if (!idNo) return { error: `Enter the ${type === "senior" ? "Senior Citizen" : "PWD"} ID number.` };
    return { type, rate: option?.rate || 0, id_no: idNo, reason, label: option?.label || "discount" };
}

/** Same rounding as the server: per medicine, to the centavo. */
function totalsFor(items, rate) {
    let gross = 0;
    let discount = 0;
    items.forEach((i) => {
        const g = Math.round(i.quantity * (i.unit_price || 0) * 100) / 100;
        gross += g;
        discount += Math.round(g * rate) / 100;
    });
    return { gross, discount, net: Math.round((gross - discount) * 100) / 100 };
}

function updateTotals() {
    const box = $("dpTotals");
    if (!box) return;
    const { items } = collectDispense();
    const discount = readDiscount();
    const rate = discount.error ? (discounts.find((x) => x.value === $("dpDiscount").value)?.rate || Number($("dpDiscountRate").value) || 0) : discount.rate;
    const money = totalsFor(items, rate || 0);
    box.innerHTML = `<span>Subtotal</span><span>${formatMoney(money.gross)}</span>
        ${money.discount > 0 ? `<span>Discount</span><span>−${formatMoney(money.discount)}</span>` : ""}
        <span class="dp-due">To charge</span><span class="dp-due">${formatMoney(money.net)}</span>`;
}

function confirmPayment(dispenseId) {
    const h = detail.history.find((x) => x.id === dispenseId);
    if (!h) return;
    openDialog({
        title: `Payment for ${h.dispense_number}`,
        body: `<p>${escapeHtml(detail.patient.name)} owes <strong>${formatMoney(h.balance)}</strong> for this dispensing. The payment is recorded in the patient's ledger.</p>
            <label for="dpPayAmount">Amount received</label><input id="dpPayAmount" type="number" min="0" step="0.01" value="${h.balance.toFixed(2)}">
            <label for="dpPayMethod">Paid by</label><select id="dpPayMethod">${paymentMethods.map((m) => `<option>${escapeHtml(m)}</option>`).join("")}</select>
            <label for="dpPayRef">Reference (optional)</label><input id="dpPayRef" maxlength="100" placeholder="e.g. GCash ref, OR number">`,
        okLabel: "Record Payment",
        check: () => {
            const amount = Number($("dpPayAmount").value);
            if (!(amount > 0)) return "Enter the amount received.";
            if (amount > h.balance + 0.004) return `At most ${formatMoney(h.balance)} is owed.`;
            return null;
        },
        run: () => recordDispensePayment(dispenseId, { amount: Number($("dpPayAmount").value), method: $("dpPayMethod").value, reference: $("dpPayRef").value.trim() }),
        after: async () => {
            await openDetail(detail.prescription.id, true);
        }
    });
}

async function printChargeSlip(dispenseId) {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write(`<p style="font-family:Arial;padding:20px;">Preparing the charge slip...</p>`);

    const result = await fetchChargeSlip(dispenseId);
    if (!result?.success) {
        win.close();
        showToast(result?.message || "Couldn't load the charge slip.", "error");
        return;
    }

    const s = result.data;
    win.document.open();
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Charge slip ${escapeHtml(s.dispense_number)}</title>
<style>
    @page { size: A5 portrait; margin: 10mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0 auto; padding: 16px; max-width: 148mm; }
    h1 { margin: 0; font-size: 15px; text-align: center; text-transform: uppercase; } .c { text-align: center; } .muted { color: #4b5563; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; } th, td { padding: 4px 3px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
    th { font-size: 10px; text-transform: uppercase; color: #4b5563; } .n { text-align: right; white-space: nowrap; } .b { font-weight: 700; }
    .tot td { border: none; padding: 2px 3px; } .void { color: #b91c1c; font-weight: 700; text-align: center; border: 2px solid #b91c1c; padding: 4px; margin: 8px 0; }
    .note { margin-top: 14px; border-top: 1px dashed #9ca3af; padding-top: 6px; font-size: 10.5px; color: #374151; text-align: center; }
</style></head><body>
    <h1>${escapeHtml(s.facility?.name || "Pharmacy")}</h1>
    ${s.facility?.address || s.facility?.phone ? `<div class="c muted">${escapeHtml([s.facility.address, s.facility.phone].filter(Boolean).join(" · "))}</div>` : ""}
    <div class="c b" style="margin-top:6px;">PHARMACY CHARGE SLIP</div>
    ${s.status !== "completed" ? `<div class="void">UNDONE — CHARGES CANCELLED</div>` : ""}
    <table class="tot" style="margin-top:6px;">
        <tr><td>Patient</td><td class="b">${escapeHtml(s.patient_name)}${s.patient_no ? ` (${escapeHtml(s.patient_no)})` : ""}</td></tr>
        <tr><td>Date</td><td>${escapeHtml(formatDate(s.dispensed_date))}</td></tr>
        <tr><td>Reference</td><td>${escapeHtml(s.dispense_number)} · ${escapeHtml(s.rx_number)}</td></tr>
        ${s.prescriber_name ? `<tr><td>Doctor</td><td>${escapeHtml(s.prescriber_name)}</td></tr>` : ""}
    </table>
    <table>
        <thead><tr><th>Medicine</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Amount</th></tr></thead>
        <tbody>${s.charges.map((c) => `<tr><td>${escapeHtml(c.description)}</td><td class="n">${formatQty(c.quantity)}</td><td class="n">${formatMoney(c.unit_price)}</td><td class="n">${formatMoney(c.gross_amount)}</td></tr>`).join("")}</tbody>
    </table>
    <table class="tot" style="margin-top:6px;">
        <tr><td>Subtotal</td><td class="n">${formatMoney(s.gross_amount)}</td></tr>
        ${s.discount_amount > 0 ? `<tr><td>Less ${escapeHtml(s.discount_label || "discount")} (${s.discount_rate}%)${s.discount_id_no ? `<br><span class="muted">ID ${escapeHtml(s.discount_id_no)}</span>` : ""}${s.discount_reason ? `<br><span class="muted">${escapeHtml(s.discount_reason)}</span>` : ""}</td><td class="n">−${formatMoney(s.discount_amount)}</td></tr>` : ""}
        <tr><td class="b">Total</td><td class="n b">${formatMoney(s.net_amount)}</td></tr>
        ${s.payments.map((p) => `<tr><td>Paid ${escapeHtml(formatDate(p.date))} · ${escapeHtml(p.method)}</td><td class="n">−${formatMoney(p.amount)}</td></tr>`).join("")}
        <tr><td class="b">${s.balance < 0 ? "Refund due" : "Balance"}</td><td class="n b">${formatMoney(Math.abs(s.balance))}</td></tr>
    </table>
    ${s.discount_id_no ? `<div style="margin-top:22px;width:60%;border-top:1px solid #111827;padding-top:3px;font-size:11px;">Signature of ${s.discount_label && s.discount_label.startsWith("PWD") ? "PWD" : "Senior Citizen"} / representative</div>` : ""}
    <div class="note">This is not an official receipt.</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script></body></html>`);
    win.document.close();
}

const CHECK_POINTS = [
    "Right patient — name and patient number match the prescription",
    "Right medicine and strength, against the prescription (generic name)",
    "Right quantity, counted again",
    "Lot and expiry date — not expired, matches the label",
    "Right dose, frequency and route on the label",
    "Directions and warnings explained or ready to explain to the patient"
];

function confirmCheck(dispenseId) {
    const h = detail.history.find((x) => x.id === dispenseId);
    if (!h) return;
    const finish = openDialog({
        title: `Second check — ${h.dispense_number}`,
        body: `<p>Prepared by <strong>${escapeHtml(h.dispensed_by_name || "—")}</strong> for <strong>${escapeHtml(detail.patient.name)}</strong>${detail.patient.patient_no ? ` (${escapeHtml(detail.patient.patient_no)})` : ""}, prescription ${escapeHtml(detail.prescription.rx_number)}:</p>
            <ul>${h.items.map((i) => `<li>${escapeHtml(i.title)} — <strong>${formatQty(i.quantity)} ${escapeHtml(i.unit_name || "")}</strong>${i.is_high_alert ? ` <span class="dp-badge ha">High-alert</span>` : ""} <span class="dp-sub" style="display:inline;">lot ${escapeHtml(i.lot_number)}${i.expires_date ? `, exp ${escapeHtml(formatDate(i.expires_date))}` : ""}</span></li>`).join("")}</ul>
            <p style="margin-bottom:0;">Check the medicines themselves, not just the screen. Tick each point:</p>
            <ul class="dp-checklist">${CHECK_POINTS.map((p, n) => `<li><label><input type="checkbox" data-dp-point="${n}"> ${escapeHtml(p)}</label></li>`).join("")}</ul>
            <label for="dpCheckNotes">Notes (optional)</label><input id="dpCheckNotes" maxlength="500" placeholder="e.g. Insulin units confirmed with the doctor">
            <p style="margin:12px 0 0;">Something wrong? <button type="button" class="dp-link-btn" id="dpCheckFail">It didn't pass — undo the dispensing…</button></p>`,
        okLabel: "Checked — OK to Hand Over",
        check: () => [...document.querySelectorAll("[data-dp-point]")].every((c) => c.checked) ? null : "Tick every point once you have checked it.",
        run: () => checkDispense(dispenseId, { confirmed: true, notes: $("dpCheckNotes").value.trim() }),
        after: async () => {
            lastDispensed = null;
            await openDetail(detail.prescription.id, true);
            loadQueue();
        }
    });
    $("dpCheckFail").onclick = () => {
        finish();
        confirmVoid(dispenseId, "Failed the second check: ");
    };
}

function confirmVoid(dispenseId, presetReason = "") {
    const h = detail.history.find((x) => x.id === dispenseId);
    openDialog({
        title: `Undo ${h?.dispense_number || "dispensing"}`,
        body: `<p>The medicines go back into stock, in the lots they came from, and the prescription shows them as not given. Only do this if the patient didn't get them or returned them unopened.</p>
            <label for="dpReason">Reason</label><textarea id="dpReason" maxlength="500" placeholder="e.g. Given to the wrong patient">${escapeHtml(presetReason)}</textarea>`,
        okLabel: "Undo Dispensing", okClass: "danger",
        check: () => $("dpReason").value.trim() ? null : "Enter a reason.",
        run: () => voidDispense(dispenseId, $("dpReason").value.trim()),
        after: async () => {
            lastDispensed = null;
            await openDetail(detail.prescription.id, true);
            loadQueue();
        }
    });
}

function confirmDecline(requestId) {
    const item = detail.prescription.items.find((i) => i.refill_request?.id === requestId);
    openDialog({
        title: "Decline refill request",
        body: `<p>${escapeHtml(detail.patient.name)} asked for a refill of <strong>${escapeHtml(item?.title || "a medicine")}</strong>. The patient will see your reason in the portal.</p>
            <label for="dpReason">Reason</label><textarea id="dpReason" maxlength="500" placeholder="e.g. Please see your doctor before the next refill"></textarea>`,
        okLabel: "Decline Refill", okClass: "danger",
        check: () => $("dpReason").value.trim() ? null : "Enter a reason.",
        run: () => declineRefillRequest(requestId, $("dpReason").value.trim()),
        after: async () => {
            await openDetail(detail.prescription.id, true);
            loadQueue();
        }
    });
}

function confirmClose() {
    openDialog({
        title: `Close ${detail.prescription.rx_number}`,
        body: `<p>Stop dispensing this prescription. What was already given stays recorded; nothing more — including refills — can be given from it, and any waiting refill request is declined.</p>
            <label for="dpReason">Reason</label><textarea id="dpReason" maxlength="500" placeholder="e.g. Patient bought the rest elsewhere"></textarea>`,
        okLabel: "Close Prescription", okClass: "danger",
        check: () => $("dpReason").value.trim() ? null : "Enter a reason.",
        run: () => closePrescription(detail.prescription.id, $("dpReason").value.trim()),
        after: async () => {
            await openDetail(detail.prescription.id, true);
            loadQueue();
        }
    });
}

function openDialog({ title, body, okLabel, okClass = "primary", check = null, run, after = null }) {
    const overlay = $("dpDialogOverlay");
    const finish = () => {
        overlay.classList.remove("open");
        $("dpDialogOk").onclick = null;
        document.removeEventListener("keydown", onKey);
    };
    const onKey = (event) => { if (event.key === "Escape") finish(); };

    $("dpDialogTitle").textContent = title;
    $("dpDialogBody").innerHTML = body;
    $("dpDialogAlert").innerHTML = "";
    $("dpDialogOk").textContent = okLabel;
    $("dpDialogOk").className = `dp-btn ${okClass}`;
    $("dpDialogOk").disabled = false;

    $("dpDialogOk").onclick = async () => {
        const problem = check?.();
        if (problem) {
            $("dpDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(problem)}</div>`;
            return;
        }
        $("dpDialogOk").disabled = true;
        const result = await run();
        $("dpDialogOk").disabled = false;

        if (!result?.success) {
            $("dpDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message || "Something went wrong.")}</div>`;
            return;
        }
        finish();
        if (result.message && !result.quiet) showToast(result.message, "success");
        if (after) await after(result);
    };

    $("dpDialogClose").onclick = finish;
    $("dpDialogCancel").onclick = finish;
    overlay.onclick = (event) => { if (event.target === overlay) finish(); };
    document.addEventListener("keydown", onKey);
    overlay.classList.add("open");
    const field = $("dpDialogBody").querySelector("textarea") || $("dpDialogOk");
    field.focus();
    if (field.tagName === "TEXTAREA") field.setSelectionRange(field.value.length, field.value.length);
    return finish;
}

/* ---------------------------------------------------------------
 * Standardized Dosing & Auxiliary Label Generator (Thermal Printer Ready)
 * ------------------------------------------------------------- */

async function printLabels(dispenseId) {
    // Open first, while the click still counts, so pop-up blockers allow it.
    const win = window.open("", "_blank", "width=1080,height=920");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write(`<p style="font-family:Arial,sans-serif;padding:20px;">Generating standardized dosing &amp; auxiliary warning labels...</p>`);

    const result = await fetchDispenseLabels(dispenseId);
    if (!result?.success) {
        win.close();
        showToast(result?.message || "Couldn't load the labels.", "error");
        return;
    }

    const l = result.data;
    const catalog = Array.isArray(l.auxiliary_catalog) ? l.auxiliary_catalog : [];
    const defaultFormat = l.items?.[0]?.label_format || "thermal_80x50";

    // Expose save handler so the print studio window can persist custom auxiliary stickers & SIG
    win.__saveAuxiliaryLabelItem = async (payload) => {
        try {
            return await saveDispenseAuxiliaryLabel(payload);
        } catch (err) {
            return { success: false, message: err?.message || "Save failed." };
        }
    };

    const initialPayloadJson = JSON.stringify({
        dispense_id: l.dispense_id || dispenseId,
        dispense_number: l.dispense_number,
        dispensed_date: formatDate(l.dispensed_date),
        rx_number: l.rx_number,
        patient_name: l.patient_name,
        patient_no: l.patient_no,
        prescriber_name: l.prescriber_name,
        warehouse_name: l.warehouse_name,
        facility: l.facility || {},
        catalog,
        default_format: defaultFormat,
        items: (l.items || []).map((item) => ({
            ...item,
            formatted_qty: `${formatQty(item.quantity)} ${item.unit_name || "units"}`.trim(),
            formatted_expiry: item.earliest_expiry ? formatDate(item.earliest_expiry) : ""
        }))
    }).replace(/<\//g, "<\\/");

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Thermal Dosing & Auxiliary Labels — ${escapeHtml(l.dispense_number)}</title>
<style id="dynamicPageStyle">
    @page { size: 80mm 55mm; margin: 2mm; }
</style>
<style>
    * { box-sizing: border-box; }
    body {
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #f1f5f9;
        margin: 0;
        padding: 0;
    }
    .studio-bar {
        background: #0f172a;
        color: #f8fafc;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        border-bottom: 3px solid #2563eb;
        position: sticky;
        top: 0;
        z-index: 100;
    }
    .studio-bar h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .studio-bar small {
        color: #94a3b8;
        font-size: 12px;
        display: block;
        margin-top: 2px;
    }
    .studio-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }
    .studio-controls select, .studio-btn {
        height: 34px;
        padding: 0 12px;
        border-radius: 6px;
        font-size: 12.5px;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        border: 1px solid #334155;
    }
    .studio-controls select {
        background: #1e293b;
        color: #f8fafc;
    }
    .studio-btn {
        background: #1e293b;
        color: #f8fafc;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .studio-btn.primary {
        background: #2563eb;
        border-color: #1d4ed8;
        color: #ffffff;
    }
    .studio-btn.success {
        background: #16a34a;
        border-color: #15803d;
        color: #ffffff;
    }
    .studio-workspace {
        max-width: 1120px;
        margin: 16px auto;
        padding: 0 16px 32px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
    }
    .customizer-card {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 14px 16px;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .customizer-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e2e8f0;
    }
    .customizer-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 10px;
    }
    .customizer-field label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #475569;
        margin-bottom: 4px;
    }
    .customizer-field input {
        width: 100%;
        height: 32px;
        padding: 0 9px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 12.5px;
    }
    .ums-inputs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 10px;
    }
    .sticker-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .sticker-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        border: 1.5px solid #cbd5e1;
        background: #f8fafc;
        color: #334155;
        user-select: none;
        transition: all .12s ease;
    }
    .sticker-pill.active {
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
        transform: translateY(-1px);
    }

    /* Thermal Label Sheet Layout */
    .sheet {
        display: flex;
        flex-wrap: wrap;
        gap: 6mm;
        justify-content: center;
    }
    .sheet.fmt-thermal_80x50 .thermal-label {
        width: 80mm;
        min-height: 50mm;
    }
    .sheet.fmt-thermal_100x60 .thermal-label {
        width: 100mm;
        min-height: 60mm;
    }
    .sheet.fmt-a4_sheet .thermal-label {
        width: 92mm;
        min-height: 54mm;
    }

    .thermal-label {
        background: #ffffff;
        color: #000000;
        border: 1.8px solid #000000;
        border-radius: 2.5mm;
        padding: 2.5mm 3mm;
        font-size: 10px;
        page-break-inside: avoid;
        break-inside: avoid;
        display: flex;
        flex-direction: column;
        gap: 1.4mm;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .tl-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1.5px solid #000;
        padding-bottom: 1mm;
        font-size: 8.5px;
        line-height: 1.2;
    }
    .tl-fac-name {
        font-weight: 900;
        text-transform: uppercase;
        font-size: 9.5px;
        letter-spacing: 0.3px;
    }
    .tl-rx-strip {
        font-family: "Courier New", Courier, monospace;
        font-weight: 800;
        font-size: 9px;
        text-align: right;
    }
    .tl-patient-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 4px;
        background: #f1f5f9;
        border: 1px solid #000;
        padding: 1mm 1.8mm;
        border-radius: 1.2mm;
    }
    .tl-patient-name {
        font-size: 11.5px;
        font-weight: 900;
        text-transform: uppercase;
    }
    .tl-patient-mrn {
        font-size: 9px;
        font-weight: 700;
    }
    .tl-drug-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 6px;
        padding: 0.5mm 0;
    }
    .tl-drug-title {
        font-size: 12px;
        font-weight: 900;
        line-height: 1.2;
    }
    .tl-drug-qty {
        font-size: 10.5px;
        font-weight: 900;
        border: 1.2px solid #000;
        padding: 0.4mm 1.6mm;
        border-radius: 1.2mm;
        white-space: nowrap;
    }
    .tl-sig-box {
        border: 1.5px solid #000;
        border-radius: 1.5mm;
        padding: 1.4mm 2mm;
        background: #fffbeb;
    }
    .tl-sig-label {
        font-size: 7.5px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: #334155;
        margin-bottom: 0.5mm;
    }
    .tl-sig-text {
        font-size: 10.5px;
        font-weight: 900;
        line-height: 1.25;
        color: #000;
    }
    .tl-ums-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border: 1px solid #000;
        border-radius: 1.2mm;
        overflow: hidden;
        font-size: 8px;
        text-align: center;
    }
    .tl-ums-cell {
        border-right: 1px solid #000;
        padding: 0.7mm 1mm;
        background: #ffffff;
    }
    .tl-ums-cell:last-child {
        border-right: none;
    }
    .tl-ums-cell.active {
        background: #dbeafe;
        font-weight: 900;
    }
    .tl-ums-period {
        font-size: 7px;
        font-weight: 800;
        text-transform: uppercase;
        display: block;
    }
    .tl-ums-dose {
        font-size: 8.5px;
        font-weight: 900;
        display: block;
        margin-top: 0.3mm;
    }
    .tl-aux-stack {
        display: flex;
        flex-direction: column;
        gap: 1mm;
        margin-top: 0.5mm;
    }
    .tl-aux-sticker {
        display: flex;
        align-items: center;
        gap: 1.8mm;
        padding: 0.9mm 1.8mm;
        border-radius: 1.2mm;
        border: 1.2px solid #000;
        font-size: 8.5px;
        font-weight: 900;
        line-height: 1.15;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .tl-aux-icon {
        font-size: 11px;
        line-height: 1;
        flex: none;
    }
    .tl-meta-foot {
        margin-top: auto;
        padding-top: 1mm;
        border-top: 1px dashed #64748b;
        font-size: 8px;
        display: flex;
        justify-content: space-between;
        gap: 4px;
        flex-wrap: wrap;
        color: #1e293b;
    }

    @media print {
        body { background: #ffffff; }
        .no-print { display: none !important; }
        .studio-workspace { margin: 0; padding: 0; max-width: none; }
        .sheet { gap: 3mm; justify-content: flex-start; }
        .thermal-label {
            box-shadow: none;
            page-break-after: always;
            break-after: page;
        }
        .sheet.fmt-a4_sheet .thermal-label {
            page-break-after: auto;
            break-after: auto;
        }
    }
</style>
</head>
<body>
    <div class="studio-bar no-print">
        <div>
            <h1>&#127991; Standardized Dosing &amp; Auxiliary Thermal Label Generator</h1>
            <small>Rx ${escapeHtml(l.rx_number)} · Dispense ${escapeHtml(l.dispense_number)} · Patient: ${escapeHtml(l.patient_name)} (${escapeHtml(l.patient_no)})</small>
        </div>
        <div class="studio-controls">
            <label style="font-size:12px;font-weight:700;color:#cbd5e1;">Printer Format:
                <select id="labelFormatSelect">
                    <option value="thermal_80x50">80×50mm Direct Thermal Roll (Zebra / Brother)</option>
                    <option value="thermal_100x60">100×60mm Large Thermal Rx Label</option>
                    <option value="a4_sheet">A4 Multi-Up Pharmacy Sticker Sheet</option>
                </select>
            </label>
            <button type="button" class="studio-btn success" id="saveAllLabelsBtn">&#128190; Save Customizations</button>
            <button type="button" class="studio-btn primary" id="printThermalBtn">&#128424; Print Thermal Labels</button>
        </div>
    </div>

    <div class="studio-workspace">
        <div id="customizerContainer" class="no-print" style="display:flex;flex-direction:column;gap:12px;"></div>
        <div id="thermalSheet" class="sheet fmt-thermal_80x50"></div>
    </div>

<script>
(function() {
    const state = ${initialPayloadJson};
    let currentFormat = state.default_format || "thermal_80x50";

    const fmtSelect = document.getElementById("labelFormatSelect");
    const pageStyle = document.getElementById("dynamicPageStyle");
    const customizerContainer = document.getElementById("customizerContainer");
    const thermalSheet = document.getElementById("thermalSheet");

    fmtSelect.value = currentFormat;

    function esc(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function updatePageSizeStyle() {
        thermalSheet.className = "sheet fmt-" + currentFormat;
        if (currentFormat === "thermal_80x50") {
            pageStyle.textContent = "@page { size: 80mm 55mm; margin: 2mm; }";
        } else if (currentFormat === "thermal_100x60") {
            pageStyle.textContent = "@page { size: 100mm 65mm; margin: 2mm; }";
        } else {
            pageStyle.textContent = "@page { size: A4 portrait; margin: 8mm; }";
        }
    }

    function renderCustomizers() {
        customizerContainer.innerHTML = state.items.map((item, idx) => {
            const ums = item.ums_schedule || { morning: "", noon: "", evening: "", bedtime: "" };
            const activeCodes = new Set(item.auxiliary_codes || []);
            const medTitle = item.generic_name
                ? (item.generic_name.toUpperCase() + (item.brand_name ? " (" + item.brand_name + ")" : "") + " " + [item.strength, item.dosage_form].filter(Boolean).join(" "))
                : item.title;

            return \`
                <div class="customizer-card" data-item-idx="\${idx}">
                    <div class="customizer-head">
                        <div>
                            <strong style="font-size:13.5px;color:#0f172a;">Line #\${idx + 1}: \${esc(medTitle)}</strong>
                            <span style="margin-left:8px;font-size:12px;color:#475569;font-weight:700;">Qty: \${esc(item.formatted_qty)}</span>
                        </div>
                        <span id="saveStatus_\${idx}" style="font-size:11.5px;color:#16a34a;font-weight:700;">\${item.is_customized ? "✓ Customized" : "Auto-detected"}</span>
                    </div>

                    <div class="customizer-grid">
                        <div class="customizer-field">
                            <label>Standardized Patient Dosing Directions (SIG)</label>
                            <input type="text" data-field="standardized_sig" data-idx="\${idx}" value="\${esc(item.standardized_sig || "")}">
                        </div>
                        <div class="customizer-field">
                            <label>Additional Custom Warning Note (Optional)</label>
                            <input type="text" data-field="custom_warning_note" data-idx="\${idx}" value="\${esc(item.custom_warning_note || "")}" placeholder="e.g. Discard remaining suspension after 14 days">
                        </div>
                    </div>

                    <div class="ums-inputs">
                        <div class="customizer-field">
                            <label>🌅 Morning Dose</label>
                            <input type="text" data-ums="morning" data-idx="\${idx}" value="\${esc(ums.morning || "")}" placeholder="e.g. 1 tab">
                        </div>
                        <div class="customizer-field">
                            <label>☀️ Noon Dose</label>
                            <input type="text" data-ums="noon" data-idx="\${idx}" value="\${esc(ums.noon || "")}" placeholder="e.g. 1 tab">
                        </div>
                        <div class="customizer-field">
                            <label>🌆 Evening Dose</label>
                            <input type="text" data-ums="evening" data-idx="\${idx}" value="\${esc(ums.evening || "")}" placeholder="e.g. 1 tab">
                        </div>
                        <div class="customizer-field">
                            <label>🌙 Bedtime Dose</label>
                            <input type="text" data-ums="bedtime" data-idx="\${idx}" value="\${esc(ums.bedtime || "")}" placeholder="e.g. 1 tab">
                        </div>
                    </div>

                    <div class="customizer-field">
                        <label>Standardized Auxiliary Warning Stickers (Click to Toggle on Thermal Label)</label>
                        <div class="sticker-pills">
                            \${state.catalog.map((st) => {
                                const isOn = activeCodes.has(st.code);
                                const style = isOn
                                    ? \`background:\${st.bg_color};border-color:\${st.border_color};color:\${st.text_color};\`
                                    : "";
                                return \`<button type="button" class="sticker-pill \${isOn ? "active" : ""}" style="\${style}" data-toggle-sticker="\${esc(st.code)}" data-idx="\${idx}">
                                    <span>\${st.icon}</span> <span>\${esc(st.short_label)}</span>
                                </button>\`;
                            }).join("")}
                        </div>
                    </div>
                </div>
            \`;
        }).join("");
    }

    function renderThermalLabels() {
        updatePageSizeStyle();
        thermalSheet.innerHTML = state.items.map((item) => {
            const ums = item.ums_schedule || { morning: "", noon: "", evening: "", bedtime: "" };
            const hasUms = Boolean(ums.morning || ums.noon || ums.evening || ums.bedtime);
            const activeCodes = item.auxiliary_codes || [];
            const stickers = activeCodes
                .map((code) => state.catalog.find((c) => c.code === code))
                .filter(Boolean);

            const drugDisplay = item.generic_name
                ? \`<strong>\${esc(item.generic_name.toUpperCase())}</strong>\${item.brand_name ? " (" + esc(item.brand_name) + ")" : ""} \${esc([item.strength, item.dosage_form].filter(Boolean).join(" "))}\`
                : \`<strong>\${esc(item.title)}</strong>\`;

            return \`
                <div class="thermal-label">
                    <div class="tl-header">
                        <div>
                            <div class="tl-fac-name">\${esc(state.facility?.name || "HOSPITAL PHARMACY")}</div>
                            <div>\${esc([state.facility?.address, state.facility?.phone].filter(Boolean).join(" · "))}</div>
                        </div>
                        <div class="tl-rx-strip">
                            <div>\${esc(state.rx_number)}</div>
                            <div>\${esc(state.dispense_number)}</div>
                        </div>
                    </div>

                    <div class="tl-patient-row">
                        <span class="tl-patient-name">\${esc(state.patient_name)}</span>
                        <span class="tl-patient-mrn">MRN: \${esc(state.patient_no)} · \${esc(state.dispensed_date)}</span>
                    </div>

                    <div class="tl-drug-row">
                        <div class="tl-drug-title">\${drugDisplay}</div>
                        <div class="tl-drug-qty">QTY: \${esc(item.formatted_qty)}</div>
                    </div>

                    <div class="tl-sig-box">
                        <div class="tl-sig-label">Standardized Dosing Instructions</div>
                        <div class="tl-sig-text">\${esc(item.standardized_sig || "TAKE AS DIRECTED BY PHYSICIAN")}</div>
                    </div>

                    \${hasUms ? \`
                    <div class="tl-ums-grid">
                        <div class="tl-ums-cell \${ums.morning ? "active" : ""}">
                            <span class="tl-ums-period">🌅 Morning</span>
                            <span class="tl-ums-dose">\${esc(ums.morning || "—")}</span>
                        </div>
                        <div class="tl-ums-cell \${ums.noon ? "active" : ""}">
                            <span class="tl-ums-period">☀️ Noon</span>
                            <span class="tl-ums-dose">\${esc(ums.noon || "—")}</span>
                        </div>
                        <div class="tl-ums-cell \${ums.evening ? "active" : ""}">
                            <span class="tl-ums-period">🌆 Evening</span>
                            <span class="tl-ums-dose">\${esc(ums.evening || "—")}</span>
                        </div>
                        <div class="tl-ums-cell \${ums.bedtime ? "active" : ""}">
                            <span class="tl-ums-period">🌙 Bedtime</span>
                            <span class="tl-ums-dose">\${esc(ums.bedtime || "—")}</span>
                        </div>
                    </div>\` : ""}

                    <div class="tl-aux-stack">
                        \${stickers.map((st) => \`
                            <div class="tl-aux-sticker" style="background:\${st.bg_color};border-color:\${st.border_color};color:\${st.text_color};">
                                <span class="tl-aux-icon">\${st.icon}</span>
                                <span>\${esc(st.banner_text)}</span>
                            </div>
                        \`).join("")}
                        \${item.custom_warning_note ? \`
                            <div class="tl-aux-sticker" style="background:#f1f5f9;border-color:#334155;color:#0f172a;">
                                <span class="tl-aux-icon">📌</span>
                                <span>\${esc(item.custom_warning_note)}</span>
                            </div>
                        \` : ""}
                    </div>

                    <div class="tl-meta-foot">
                        <span>Lot: \${esc(item.lots || "—")}\${item.fill_label ? " · " + esc(item.fill_label) : ""}</span>
                        <span>Prescriber: Dr. \${esc(state.prescriber_name || "—")}</span>
                        <span>Keep out of reach of children</span>
                    </div>
                </div>
            \`;
        }).join("");
    }

    customizerContainer.addEventListener("input", function(e) {
        const idx = Number(e.target.dataset.idx);
        if (!Number.isFinite(idx) || !state.items[idx]) return;

        if (e.target.dataset.field) {
            state.items[idx][e.target.dataset.field] = e.target.value;
            renderThermalLabels();
        } else if (e.target.dataset.ums) {
            if (!state.items[idx].ums_schedule) {
                state.items[idx].ums_schedule = { morning: "", noon: "", evening: "", bedtime: "" };
            }
            state.items[idx].ums_schedule[e.target.dataset.ums] = e.target.value;
            renderThermalLabels();
        }
    });

    customizerContainer.addEventListener("click", function(e) {
        const pill = e.target.closest("[data-toggle-sticker]");
        if (!pill) return;
        const idx = Number(pill.dataset.idx);
        const code = pill.dataset.toggleSticker;
        if (!Number.isFinite(idx) || !state.items[idx]) return;

        const list = Array.isArray(state.items[idx].auxiliary_codes) ? [...state.items[idx].auxiliary_codes] : [];
        const pos = list.indexOf(code);
        if (pos >= 0) {
            list.splice(pos, 1);
        } else {
            list.push(code);
        }
        state.items[idx].auxiliary_codes = list;
        renderCustomizers();
        renderThermalLabels();
    });

    fmtSelect.addEventListener("change", function() {
        currentFormat = fmtSelect.value;
        renderThermalLabels();
    });

    document.getElementById("saveAllLabelsBtn").addEventListener("click", async function() {
        const btn = this;
        btn.disabled = true;
        btn.textContent = "Saving...";
        for (let idx = 0; idx < state.items.length; idx++) {
            const item = state.items[idx];
            if (typeof window.__saveAuxiliaryLabelItem === "function") {
                const res = await window.__saveAuxiliaryLabelItem({
                    dispense_id: state.dispense_id,
                    prescription_item_id: item.prescription_item_id,
                    standardized_sig: item.standardized_sig,
                    ums_schedule: item.ums_schedule,
                    auxiliary_codes: item.auxiliary_codes,
                    custom_warning_note: item.custom_warning_note,
                    label_format: currentFormat
                });
                const badge = document.getElementById("saveStatus_" + idx);
                if (badge && res?.success) {
                    badge.textContent = "✓ Saved to Rx Label Record";
                }
            }
        }
        btn.disabled = false;
        btn.innerHTML = "&#10003; Saved Customizations";
        setTimeout(() => { btn.innerHTML = "&#128190; Save Customizations"; }, 2000);
    });

    document.getElementById("printThermalBtn").addEventListener("click", function() {
        window.focus();
        window.print();
    });

    renderCustomizers();
    renderThermalLabels();
})();
<\/script>
</body>
</html>`);
    win.document.close();
}

function formatPlain(value) {
    return String(Math.round(Number(value) * 1000) / 1000);
}
