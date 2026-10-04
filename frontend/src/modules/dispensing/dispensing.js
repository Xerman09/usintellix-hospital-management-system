import {
    fetchDispensingQueue, fetchDispensingDetail, fetchDispensingOptions, dispensePrescription,
    voidDispense, closePrescription, fetchDispenseLabels, declineRefillRequest, recordDispensePayment, fetchChargeSlip
} from "./dispensing.service.js?v=3";
import { formatQty, formatDate, formatMoney, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
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
    const setCount = (el, n) => { el.hidden = !n; el.textContent = n; };
    setCount($("dpCountToFill"), queue.counts.to_fill);
    setCount($("dpCountRefills"), queue.counts.refills);
    setCount($("dpCountExpired"), queue.counts.expired);
    renderQueue();
}

function statusBadge(row) {
    if (row.is_expired && ["pending", "partial"].includes(row.dispense_status)) return `<span class="dp-badge expired">Expired</span>`;
    return `<span class="dp-badge ${escapeHtml(row.dispense_status)}">${escapeHtml(row.status_label || row.dispense_status)}</span>`;
}

function renderQueue() {
    const rows = queue.rows;
    const empty = {
        to_fill: "No prescriptions are waiting to be dispensed.", refills: "No refill requests are waiting.", partial: "No prescriptions are partly dispensed.",
        expired: "No unfilled prescriptions have expired.", dispensed: "Nothing dispensed yet.", closed: "No closed prescriptions.", all: "No prescriptions."
    }[view];

    $("dpQueue").innerHTML = rows.length ? `
        <div class="dp-card">
            <div class="dp-table-wrap"><table class="dp-table wide">
                <thead><tr><th>Prescription</th><th>Patient</th><th>Medicines</th><th>Doctor</th><th>Status</th></tr></thead>
                <tbody>${rows.map((r) => `
                    <tr class="dp-click" data-dp-open="${r.id}" tabindex="0" title="Open to dispense">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.rx_number)}</strong>
                            <span class="dp-sub">${escapeHtml(formatDate(r.prescribed_date))}</span>
                            ${r.valid_until ? `<span class="dp-sub">Valid until ${escapeHtml(formatDate(r.valid_until))}</span>` : ""}</td>
                        <td><strong>${escapeHtml(r.patient_name)}</strong><span class="dp-sub">${escapeHtml(r.patient_no || "")}</span></td>
                        <td>${r.medicines.slice(0, 4).map((m) => `<span class="dp-sub" style="margin:0;color:var(--text-primary);">${escapeHtml(m)}</span>`).join("")}
                            ${r.medicines.length > 4 ? `<span class="dp-sub">+ ${r.medicines.length - 4} more</span>` : ""}
                            ${r.catalog_count < r.line_count ? `<span class="dp-sub">${r.line_count - r.catalog_count} not from the catalog</span>` : ""}</td>
                        <td>${escapeHtml(r.prescriber_name || "—")}</td>
                        <td>${statusBadge(r)}${r.refill_requests ? ` <span class="dp-badge partial">Refill requested</span>` : ""}${r.has_dangerous_drug ? ` <span class="dp-badge dd">Dangerous drug</span>` : ""}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            ${queue.truncated ? `<p class="dp-note">Showing the first 300. Search to narrow it down.</p>` : ""}
            ${view === "to_fill" ? `<p class="dp-note">Oldest first. Expired prescriptions are under Expired — they can't be filled.</p>` : ""}
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
        banners.push(`<div class="dp-banner ok"><span>&#10003; Dispensed under <strong>${escapeHtml(lastDispensed.number)}</strong>${h ? ` — ${h.balance > 0.004 ? `<strong>${formatMoney(h.balance)}</strong> to pay` : h.net_amount > 0 ? "paid" : "no charge"}` : ""}.</span>
            <span class="dp-actions">${h && h.balance > 0.004 ? `<button type="button" class="dp-btn small primary" data-dp-pay="${h.id}">Record payment</button>` : ""}
            <button type="button" class="dp-btn small" data-dp-slip="${lastDispensed.id}">Print charge slip</button>
            <button type="button" class="dp-btn small" data-dp-labels="${lastDispensed.id}">Print labels</button></span></div>`);
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
                <span>${statusBadge({ ...d, dispense_status: d.dispense_status, status_label: d.status_label, is_expired: rx.is_expired })}</span></div>
            <div class="dp-facts">
                <div><span>Patient</span><strong>${escapeHtml(d.patient.name)}</strong><span class="dp-sub" style="text-transform:none;letter-spacing:0;font-weight:400;">${escapeHtml([d.patient.patient_no, d.patient.age != null ? `${d.patient.age} yrs` : null, d.patient.sex].filter(Boolean).join(" · "))}</span></div>
                <div><span>Prescribed by</span><strong>${escapeHtml(rx.prescriber_name || "—")}</strong></div>
                <div><span>Date</span><strong>${escapeHtml(formatDate(rx.prescribed_date))}</strong></div>
                <div><span>Valid until</span><strong>${rx.valid_until ? escapeHtml(formatDate(rx.valid_until)) : "—"}</strong></div>
                ${rx.diagnosis ? `<div><span>Diagnosis</span><strong>${escapeHtml(rx.diagnosis)}</strong></div>` : ""}
                ${rx.notes ? `<div><span>Doctor's notes</span><strong>${escapeHtml(rx.notes)}</strong></div>` : ""}
            </div>
        </div>
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
                            ${h.status === "voided" ? ` <span class="dp-badge voided">Undone</span>` : ""}</div>
                        <div class="dp-actions">
                            ${h.status === "completed" && h.balance > 0.004 ? `<button type="button" class="dp-btn small primary" data-dp-pay="${h.id}">Record payment</button>` : ""}
                            <button type="button" class="dp-btn small" data-dp-slip="${h.id}">Charge slip</button>
                            ${h.status === "completed" ? `<button type="button" class="dp-btn small" data-dp-labels="${h.id}">Print labels</button>
                                <button type="button" class="dp-btn small" data-dp-void="${h.id}">Undo…</button>` : ""}
                        </div>
                    </div>
                    <ul>${h.items.map((i) => `<li>${escapeHtml(i.title)} — ${formatQty(i.quantity)} ${escapeHtml(i.unit_name || "")}${i.fill_label ? ` <span class="dp-badge partial">${escapeHtml(i.fill_label)}</span>` : ""} <span class="dp-sub" style="display:inline;">lot ${escapeHtml(i.lot_number)}${i.expires_date ? `, exp ${escapeHtml(formatDate(i.expires_date))}` : ""}</span></li>`).join("")}</ul>
                    <div class="dp-money"><span>Total <strong>${formatMoney(h.net_amount)}</strong>${h.discount_amount > 0 ? ` <span class="dp-sub" style="display:inline;">(${escapeHtml(h.discount_label || "discount")} −${formatMoney(h.discount_amount)}${h.discount_id_no ? `, ID ${escapeHtml(h.discount_id_no)}` : ""})</span>` : ""}</span>
                        <span>Paid <strong>${formatMoney(h.paid_amount)}</strong></span>
                        <span>${h.balance < -0.004 ? `<strong style="color:#b91c1c;">Refund due ${formatMoney(-h.balance)}</strong>` : h.balance > 0.004 ? `Balance <strong>${formatMoney(h.balance)}</strong>` : `<span class="dp-badge dispensed">Settled</span>`}</span></div>
                    ${h.notes ? `<span class="dp-sub">${escapeHtml(h.notes)}</span>` : ""}
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
    const labels = event.target.closest("[data-dp-labels]");
    if (labels) return printLabels(Number(labels.dataset.dpLabels));
    const undo = event.target.closest("[data-dp-void]");
    if (undo) return confirmVoid(Number(undo.dataset.dpVoid));
    const pay = event.target.closest("[data-dp-pay]");
    if (pay) return confirmPayment(Number(pay.dataset.dpPay));
    const slip = event.target.closest("[data-dp-slip]");
    if (slip) return printChargeSlip(Number(slip.dataset.dpSlip));
    const decline = event.target.closest("[data-dp-decline]");
    if (decline) return confirmDecline(Number(decline.dataset.dpDecline));
    if (event.target.closest("#dpDispense")) return confirmDispense();
    if (event.target.closest("#dpClose")) return confirmClose();
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
        items.push({ prescription_item_id: item.id, quantity: qty, lot_id: lotId, refill, title: item.title, unit: item.drug_unit_name || "units", unit_price: item.unit_price,
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
            <ul>${items.map((i) => `<li>${escapeHtml(i.title)} — <strong>${formatQty(i.quantity)} ${escapeHtml(i.unit)}</strong>${i.fill ? ` <span class="dp-badge partial">${escapeHtml(i.fill)}</span>` : ""}${i.unit_price != null ? ` · ${formatMoney(i.quantity * i.unit_price)}` : ""}</li>`).join("")}</ul>
            <p>Charge: <strong>${formatMoney(money.net)}</strong>${money.discount > 0 ? ` (${formatMoney(money.gross)} less ${escapeHtml(discount.label)} ${formatMoney(money.discount)})` : ""}, added to the patient's ledger.</p>
            ${unpriced.length ? `<p style="color:#b45309;">No selling price is set for ${unpriced.map((i) => escapeHtml(i.title)).join(", ")} in the Drug Catalog, so ${unpriced.length === 1 ? "it is" : "they are"} charged ₱0.00.</p>` : ""}
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

function confirmVoid(dispenseId) {
    const h = detail.history.find((x) => x.id === dispenseId);
    openDialog({
        title: `Undo ${h?.dispense_number || "dispensing"}`,
        body: `<p>The medicines go back into stock, in the lots they came from, and the prescription shows them as not given. Only do this if the patient didn't get them or returned them unopened.</p>
            <label for="dpReason">Reason</label><textarea id="dpReason" maxlength="500" placeholder="e.g. Given to the wrong patient"></textarea>`,
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
    ($("dpDialogBody").querySelector("textarea") || $("dpDialogOk")).focus();
}

/* ---------------------------------------------------------------
 * Labels
 * ------------------------------------------------------------- */

async function printLabels(dispenseId) {
    // Open first, while the click still counts, so pop-up blockers allow it.
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write(`<p style="font-family:Arial;padding:20px;">Preparing labels...</p>`);

    const result = await fetchDispenseLabels(dispenseId);
    if (!result?.success) {
        win.close();
        showToast(result?.message || "Couldn't load the labels.", "error");
        return;
    }

    const l = result.data;
    const name = (i) => i.generic_name
        ? `<strong>${escapeHtml(i.generic_name.toUpperCase())}</strong>${i.brand_name ? ` (${escapeHtml(i.brand_name)})` : ""} ${escapeHtml([i.strength, i.dosage_form].filter(Boolean).join(" "))}`
        : `<strong>${escapeHtml(i.title)}</strong>`;

    win.document.open();
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Labels ${escapeHtml(l.dispense_number)}</title>
<style>
    @page { size: A4 portrait; margin: 10mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 10px; }
    .sheet { display: flex; flex-wrap: wrap; gap: 6mm; }
    .label { width: 90mm; min-height: 50mm; border: 1px solid #111827; border-radius: 3mm; padding: 3mm 4mm; font-size: 10.5px; page-break-inside: avoid; display: flex; flex-direction: column; gap: 1.5mm; }
    .fac { font-size: 9.5px; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid #d1d5db; padding-bottom: 1mm; }
    .pt { font-size: 12px; font-weight: 700; }
    .med { font-size: 12px; } .qty { font-weight: 700; }
    .sig { font-size: 12px; border: 1px dashed #9ca3af; padding: 1.5mm 2mm; border-radius: 2mm; }
    .meta { font-size: 9.5px; color: #374151; display: flex; justify-content: space-between; gap: 4px; flex-wrap: wrap; }
    .warn { font-size: 9px; color: #374151; margin-top: auto; }
</style></head><body><div class="sheet">
${l.items.map((i) => `
    <div class="label">
        <div class="fac">${escapeHtml(l.facility?.name || "Pharmacy")}${l.facility?.phone ? ` · ${escapeHtml(l.facility.phone)}` : ""}</div>
        <div class="pt">${escapeHtml(l.patient_name)}</div>
        <div class="med">${name(i)} — <span class="qty">${formatQty(i.quantity)} ${escapeHtml(i.unit_name || "")}</span></div>
        <div class="sig">${escapeHtml([i.dosage, i.frequency, i.route && i.route !== "Oral" ? i.route : null].filter(Boolean).join(", ") || "As directed")}${i.directions ? ` — ${escapeHtml(i.directions)}` : ""}</div>
        <div class="meta"><span>Lot ${escapeHtml(i.lots || "")}</span>${i.fill_label ? `<span><strong>${escapeHtml(i.fill_label)}</strong></span>` : ""}</div>
        <div class="meta"><span>${escapeHtml(l.rx_number)} · ${escapeHtml(l.dispense_number)}</span><span>${escapeHtml(formatDate(l.dispensed_date))}</span></div>
        <div class="meta"><span>Dr. ${escapeHtml(l.prescriber_name || "")}</span></div>
        <div class="warn">Keep out of reach of children. Store as directed.</div>
    </div>`).join("")}
</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script></body></html>`);
    win.document.close();
}

function formatPlain(value) {
    return String(Math.round(Number(value) * 1000) / 1000);
}
