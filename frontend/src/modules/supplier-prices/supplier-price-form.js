/**
 * The "Add / Edit Supplier Price" modal, shared by the Supplier Prices
 * page and the Products & Prices tab of a supplier.
 *
 *   const form = createSupplierPriceForm({ mount, id: "spf", onSaved });
 *   form.open({ listing });                          // edit
 *   form.open({ drugId });                           // new, item preset
 *   form.open({ supplierId, lockSupplier: true });   // new, from a supplier
 *
 * Options (items + suppliers) are re-fetched on every open so items or
 * suppliers added in other tabs show up without a reload.
 */

import {
    fetchSupplierPrices, fetchSupplierPriceOptions, createSupplierPrice, updateSupplierPrice, deleteSupplierPrice
} from "./supplier-prices.service.js?v=2";
import { showToast } from "../../core/toast.js";

const STYLE_ID = "supplier-price-form-styles";

const TEXT_FIELDS = ["supplier_item_code", "price", "price_as_of", "min_order_qty", "discount_value", "discount_label",
    "discount_starts", "discount_ends", "discount_min_qty", "notes"];

/**
 * @param {object} config
 * @param {HTMLElement} config.mount   element the modal is appended to
 * @param {string} config.id           unique prefix for element ids
 * @param {() => any} [config.onSaved] called after a save or removal
 */
export function createSupplierPriceForm(config) {
    injectStyles();

    const p = config.id;
    const $ = (suffix) => document.getElementById(`${p}${suffix}`);
    const field = (name) => document.getElementById(`${p}_${name}`);
    const radio = (name) => document.querySelector(`#${p}Form input[name="${p}_${name}"]:checked`)?.value || "";
    const setRadio = (name, value) => {
        const input = document.querySelector(`#${p}Form input[name="${p}_${name}"][value="${value}"]`);
        if (input) input.checked = true;
    };

    let options = { drugs: [], suppliers: [] };
    let editing = null;
    let lastOpts = {};
    // Every existing price (all suppliers), used to stop a second price
    // for a supplier + item that already has one.
    let allListings = [];

    config.mount.insertAdjacentHTML("beforeend", markup(p));

    const overlay = $("Overlay");
    const form = $("Form");
    const close = () => overlay.classList.remove("open");

    $("Close").addEventListener("click", close);
    $("Cancel").addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });

    field("drug_id").addEventListener("change", () => {
        applyDrug();
        refreshAvailability();
    });
    field("supplier_id").addEventListener("change", refreshAvailability);
    form.addEventListener("input", updateSummary);
    form.addEventListener("change", (event) => {
        if (event.target.name === `${p}_discount_type`) applyDiscountType();
        if (event.target.name === `${p}_price_basis`) applyDrug();
        updateSummary();
    });

    $("Delete").addEventListener("click", async () => {
        if (!editing || !confirm(`Remove ${editing.supplier_name}'s price for ${editing.drug_name}?`)) return;

        const result = await deleteSupplierPrice(editing.id);

        if (!result.success) {
            showAlert(result.message || "Failed to remove the price.");
            return;
        }

        close();
        showToast("Supplier price removed.", "success");
        await config.onSaved?.();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearErrors();

        if (findDuplicate()) {
            refreshAvailability();
            return;
        }

        const payload = {
            drug_id: field("drug_id").value,
            supplier_id: field("supplier_id").value,
            price_basis: radio("price_basis"),
            discount_type: radio("discount_type"),
            is_active: field("is_active").checked
        };
        TEXT_FIELDS.forEach((f) => { payload[f] = field(f).value.trim(); });

        $("Save").disabled = true;
        const result = editing ? await updateSupplierPrice(editing.id, payload) : await createSupplierPrice(payload);
        $("Save").disabled = false;

        if (!result.success) {
            const errors = result.errors && typeof result.errors === "object" ? result.errors : null;

            if (errors) {
                Object.entries(errors).forEach(([name, message]) => {
                    const el = document.getElementById(`err-${p}_${name}`);
                    if (el) el.textContent = message;
                });
                showAlert("Please fix the highlighted fields.");
            } else {
                showAlert(result.message || "Failed to save the price.");
            }

            return;
        }

        close();
        showToast(editing ? "Supplier price updated." : "Supplier price added.", "success");
        await config.onSaved?.();
    });

    /**
     * @param {object} [opts]
     * @param {object} [opts.listing]        listing to edit
     * @param {number} [opts.drugId]         preset item for a new price
     * @param {number} [opts.supplierId]     preset supplier for a new price
     * @param {boolean} [opts.lockSupplier]  keep the supplier fixed
     */
    async function open(opts = {}) {
        const [result, listingsResult] = await Promise.all([fetchSupplierPriceOptions(), fetchSupplierPrices(true)]);

        if (!result.success || !listingsResult.success) {
            showToast(result.message || listingsResult.message || "Couldn't load items and suppliers.", "error");
            return;
        }

        options = result.data;
        allListings = listingsResult.data || [];
        editing = opts.listing || null;
        lastOpts = opts;

        form.reset();
        clearErrors();
        fillSelects(editing);

        $("Title").textContent = editing ? "Edit Supplier Price" : "Add Supplier Price";
        $("Save").textContent = editing ? "Save Changes" : "Save Price";
        $("Delete").hidden = !editing;

        const lock = Boolean(opts.lockSupplier && (opts.supplierId || editing));
        field("supplier_id").disabled = lock;
        $("SupplierHint").hidden = !lock;

        if (editing) {
            field("drug_id").value = editing.drug_id;
            field("supplier_id").value = editing.supplier_id;
            TEXT_FIELDS.forEach((f) => { field(f).value = editing[f] ?? ""; });
            setRadio("price_basis", editing.price_basis);
            setRadio("discount_type", editing.discount_type);
            field("is_active").checked = editing.is_active;
        } else {
            field("drug_id").value = opts.drugId ? String(opts.drugId) : "";
            field("supplier_id").value = opts.supplierId ? String(opts.supplierId) : "";
            field("price_as_of").value = isoToday();
        }

        applyDrug();
        applyDiscountType();
        updateSummary();
        refreshAvailability();

        overlay.classList.add("open");

        const focusTarget = editing ? "price" : !field("drug_id").value ? "drug_id" : !field("supplier_id").value ? "supplier_id" : "price";
        field(focusTarget).focus();
    }

    function fillSelects(listing) {
        field("drug_id").innerHTML = `<option value="">-- Select a medicine or item --</option>` +
            options.drugs.map((d) => `<option value="${d.id}" data-label="${escapeHtml(d.name)}${d.is_active ? "" : " (inactive)"}"></option>`).join("");

        const suppliers = [...options.suppliers];

        // A listing for a since-deactivated supplier must still be editable.
        if (listing && !suppliers.some((s) => s.id === listing.supplier_id)) {
            suppliers.push({ id: listing.supplier_id, name: `${listing.supplier_name} (inactive)` });
        }

        field("supplier_id").innerHTML = `<option value="">-- Select a supplier --</option>` +
            suppliers.map((s) => `<option value="${s.id}" data-label="${escapeHtml(s.name)}"></option>`).join("");
    }

    /** The existing price (other than the one being edited) for the chosen supplier + item, if any. */
    function findDuplicate() {
        const supplierId = Number(field("supplier_id").value);
        const drugId = Number(field("drug_id").value);

        if (!supplierId || !drugId) return null;

        return allListings.find((l) => l.supplier_id === supplierId && l.drug_id === drugId && l.id !== editing?.id) || null;
    }

    /**
     * Greys out items the chosen supplier already has a price for, and
     * suppliers that already price the chosen item, then warns (and
     * blocks saving) if the current pick is still a duplicate.
     */
    function refreshAvailability() {
        const supplierId = Number(field("supplier_id").value);
        const drugId = Number(field("drug_id").value);
        const others = allListings.filter((l) => l.id !== editing?.id);

        const takenDrugs = new Set(others.filter((l) => l.supplier_id === supplierId).map((l) => l.drug_id));
        const takenSuppliers = new Set(others.filter((l) => l.drug_id === drugId).map((l) => l.supplier_id));

        [...field("drug_id").options].forEach((option) => {
            if (!option.value) return;
            const taken = supplierId && takenDrugs.has(Number(option.value));
            option.disabled = Boolean(taken) && option.value !== field("drug_id").value;
            option.textContent = option.dataset.label + (taken ? " — already listed" : "");
        });

        [...field("supplier_id").options].forEach((option) => {
            if (!option.value) return;
            const taken = drugId && takenSuppliers.has(Number(option.value));
            option.disabled = Boolean(taken) && option.value !== field("supplier_id").value;
            option.textContent = option.dataset.label + (taken ? " — already has a price" : "");
        });

        const duplicate = findDuplicate();
        const warning = $("Duplicate");

        warning.hidden = !duplicate;
        $("Save").disabled = Boolean(duplicate);

        if (duplicate) {
            warning.innerHTML = `
                <span><strong>${escapeHtml(duplicate.supplier_name)}</strong> already has a price for this item
                (${formatMoney(duplicate.price)} per ${escapeHtml(duplicate.price_basis === "package" ? (duplicate.package_unit_name || "package") : (duplicate.unit_name || "unit"))}).
                Each supplier can have one price per item.</span>
                <button type="button" class="spf-btn" id="${p}EditExisting">Edit existing price</button>
            `;
            $("EditExisting").addEventListener("click", () => open({ ...lastOpts, listing: duplicate, drugId: undefined, supplierId: undefined }));
        }
    }

    function selectedDrug() {
        return options.drugs.find((d) => String(d.id) === field("drug_id").value) || null;
    }

    function applyDrug() {
        const drug = selectedDrug();
        const unit = drug?.unit_name || "unit";
        const hasPackage = Boolean(drug?.package_quantity > 0 && drug?.package_unit_name);
        const packageRadio = document.querySelector(`#${p}Form input[name="${p}_price_basis"][value="package"]`);

        $("BasisUnit").textContent = `Per ${unit}`;
        $("BasisPackage").textContent = hasPackage
            ? `Per ${drug.package_unit_name} (${formatQty(drug.package_quantity)} ${unit})`
            : "Per package";

        packageRadio.disabled = !hasPackage;
        packageRadio.parentElement.title = hasPackage ? "" : "Set a package size on this item in the drug catalog to price it per package.";

        if (!hasPackage && packageRadio.checked) setRadio("price_basis", "unit");

        const basisLabel = radio("price_basis") === "package" ? drug?.package_unit_name : unit;
        $("MinOrderHint").textContent = `In ${basisLabel || "units"}`;

        updateSummary();
    }

    function applyDiscountType() {
        const type = radio("discount_type");
        $("DiscountFields").hidden = type === "none";
        $("DiscountValueLabel").innerHTML = `${type === "percent" ? "Discount (%)" : "Discount (&#8369;)"}<span class="req">*</span>`;
    }

    /** Live "you pay" line, using the same rules as the server. */
    function updateSummary() {
        const drug = selectedDrug();
        const price = Number(field("price").value);
        const basis = radio("price_basis");
        const type = radio("discount_type");
        const value = Number(field("discount_value").value);
        const unit = drug?.unit_name || "unit";
        const basisLabel = basis === "package" ? (drug?.package_unit_name || "package") : unit;

        if (!(price > 0)) {
            $("Summary").innerHTML = "Enter a price to see the cost per unit.";
            return;
        }

        let pay = price;
        if (type === "percent" && value > 0 && value < 100) pay = Math.round(price * (100 - value)) / 100;
        if (type === "amount" && value > 0 && value < price) pay = Math.round((price - value) * 100) / 100;

        const perUnit = basis === "package" && drug?.package_quantity > 0 ? pay / drug.package_quantity : null;
        const saved = price - pay;

        $("Summary").innerHTML = `
            You pay <strong>${formatMoney(pay)}</strong> per ${escapeHtml(basisLabel)}
            ${perUnit != null ? `&nbsp;(${formatMoney(perUnit, 4)} per ${escapeHtml(unit)})` : ""}
            ${saved > 0 ? `&nbsp;<span class="save">&mdash; saves ${formatMoney(saved)}</span>` : ""}
        `;
    }

    function clearErrors() {
        $("Alert").innerHTML = "";
        form.querySelectorAll(".form-error").forEach((el) => { el.textContent = ""; });
    }

    function showAlert(message) {
        $("Alert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    }

    return { open };
}

/* ---------------------------------------------------------------
 * Shared formatting (also used by the pages that show prices)
 * ------------------------------------------------------------- */

export function formatMoney(value, maxDecimals = 2) {
    return "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals });
}

export function formatQty(value) {
    const num = Number(value);
    return Number.isInteger(num) ? num.toLocaleString() : String(Number(num.toFixed(3)));
}

export function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const TAG_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;

/** Discount tag + one-line details for a listing; "—" when there's none. */
export function renderDiscountTag(listing) {
    const l = listing;

    if (!l.discount_status) return `<span class="spf-sub">—</span>`;

    const basisLabel = l.price_basis === "package" ? (l.package_unit_name || "package") : (l.unit_name || "unit");
    const amount = l.discount_type === "percent" ? `${formatQty(l.discount_value)}% OFF` : `${formatMoney(l.discount_value)} OFF`;
    const cls = { active: "promo", scheduled: "scheduled", expired: "expired" }[l.discount_status];
    const when = l.discount_status === "scheduled"
        ? `Starts ${formatDate(l.discount_starts)}`
        : l.discount_status === "expired"
            ? `Ended ${formatDate(l.discount_ends)}`
            : l.discount_ends ? `Until ${formatDate(l.discount_ends)}` : "No end date";

    const details = [l.discount_label, when, l.discount_min_qty ? `Min. ${formatQty(l.discount_min_qty)} ${basisLabel}` : null].filter(Boolean);

    return `<span class="spf-tag ${cls}">${TAG_ICON}${amount}</span><span class="spf-sub">${escapeHtml(details.join(" · "))}</span>`;
}

export function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isoToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function markup(p) {
    return `
<div class="modal-overlay spf-overlay" id="${p}Overlay">
    <div class="modal-box spf-modal">
        <div class="modal-header">
            <h2 id="${p}Title">Add Supplier Price</h2>
            <button type="button" class="modal-close" id="${p}Close" aria-label="Close">&times;</button>
        </div>

        <div id="${p}Alert"></div>

        <form id="${p}Form" novalidate>
            <div class="spf-section">
                <div class="spf-section-title">Item &amp; Supplier</div>
                <div class="spf-grid">
                    <div class="spf-field span-2">
                        <label for="${p}_drug_id">Medicine / Item<span class="req">*</span></label>
                        <select id="${p}_drug_id"></select>
                        <span class="form-error" id="err-${p}_drug_id"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_supplier_id">Supplier<span class="req">*</span></label>
                        <select id="${p}_supplier_id"></select>
                        <span class="spf-hint" id="${p}SupplierHint" hidden>Adding to this supplier's product list</span>
                        <span class="form-error" id="err-${p}_supplier_id"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_supplier_item_code">Supplier's Item Code</label>
                        <input type="text" id="${p}_supplier_item_code" maxlength="100" placeholder="Their SKU / catalog no.">
                    </div>
                </div>
                <div class="spf-duplicate" id="${p}Duplicate" role="alert" hidden></div>
            </div>

            <div class="spf-section">
                <div class="spf-section-title">Price</div>
                <div class="spf-grid">
                    <div class="spf-field span-2">
                        <label>Priced per</label>
                        <div class="spf-seg">
                            <label><input type="radio" name="${p}_price_basis" value="unit" checked><span id="${p}BasisUnit">Unit</span></label>
                            <label><input type="radio" name="${p}_price_basis" value="package"><span id="${p}BasisPackage">Package</span></label>
                        </div>
                        <span class="form-error" id="err-${p}_price_basis"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_price">Price (&#8369;)<span class="req">*</span></label>
                        <input type="number" id="${p}_price" min="0" step="0.01" placeholder="0.00">
                        <span class="form-error" id="err-${p}_price"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_price_as_of">Price as of</label>
                        <input type="date" id="${p}_price_as_of">
                        <span class="spf-hint">Date of the quotation</span>
                        <span class="form-error" id="err-${p}_price_as_of"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_min_order_qty">Minimum Order</label>
                        <input type="number" id="${p}_min_order_qty" min="0" step="1">
                        <span class="spf-hint" id="${p}MinOrderHint">In the unit priced above</span>
                        <span class="form-error" id="err-${p}_min_order_qty"></span>
                    </div>
                </div>
            </div>

            <div class="spf-section">
                <div class="spf-section-title">Discount</div>
                <div class="spf-grid">
                    <div class="spf-field span-2">
                        <div class="spf-seg">
                            <label><input type="radio" name="${p}_discount_type" value="none" checked><span>No discount</span></label>
                            <label><input type="radio" name="${p}_discount_type" value="percent"><span>% off</span></label>
                            <label><input type="radio" name="${p}_discount_type" value="amount"><span>&#8369; off</span></label>
                        </div>
                        <span class="form-error" id="err-${p}_discount_type"></span>
                    </div>
                </div>
                <div class="spf-grid" id="${p}DiscountFields" hidden>
                    <div class="spf-field">
                        <label for="${p}_discount_value" id="${p}DiscountValueLabel">Discount<span class="req">*</span></label>
                        <input type="number" id="${p}_discount_value" min="0" step="0.01">
                        <span class="form-error" id="err-${p}_discount_value"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_discount_label">Promo Name / Tag</label>
                        <input type="text" id="${p}_discount_label" maxlength="100" placeholder="e.g. Bulk order promo">
                    </div>
                    <div class="spf-field">
                        <label for="${p}_discount_starts">Valid From</label>
                        <input type="date" id="${p}_discount_starts">
                        <span class="form-error" id="err-${p}_discount_starts"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_discount_ends">Valid Until</label>
                        <input type="date" id="${p}_discount_ends">
                        <span class="form-error" id="err-${p}_discount_ends"></span>
                    </div>
                    <div class="spf-field">
                        <label for="${p}_discount_min_qty">Minimum Qty to Qualify</label>
                        <input type="number" id="${p}_discount_min_qty" min="0" step="1">
                        <span class="spf-hint">Leave blank if it applies to any order</span>
                        <span class="form-error" id="err-${p}_discount_min_qty"></span>
                    </div>
                </div>
            </div>

            <div class="spf-summary" id="${p}Summary">Enter a price to see the cost per unit.</div>

            <div class="spf-grid">
                <div class="spf-field">
                    <label for="${p}_notes">Notes</label>
                    <input type="text" id="${p}_notes" maxlength="255">
                </div>
                <div class="spf-field">
                    <label>Status</label>
                    <label class="spf-check"><input type="checkbox" id="${p}_is_active" checked> Currently available from this supplier</label>
                </div>
            </div>

            <div class="spf-footer">
                <button type="button" class="spf-delete" id="${p}Delete" hidden>Remove Price</button>
                <div class="spf-footer-right">
                    <button type="button" class="spf-btn" id="${p}Cancel">Cancel</button>
                    <button type="submit" class="spf-btn primary" id="${p}Save">Save Price</button>
                </div>
            </div>
        </form>
    </div>
</div>`;
}

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
/* Opens on top of the supplier window, so it must stack above other modals. */
.spf-overlay { z-index: 1001; }
.spf-modal { max-width: 760px; }
.spf-section { border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 16px 6px; margin-bottom: 14px; }
.spf-section-title { margin: 0 0 10px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; }
.spf-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 16px; margin-bottom: 10px; }
.spf-grid[hidden] { display: none; }
.spf-grid .span-2 { grid-column: 1 / -1; }
.spf-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.spf-field label .req { color: #dc2626; margin-left: 2px; }
.spf-field input:not([type="radio"]):not([type="checkbox"]), .spf-field select {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.spf-field select:disabled { opacity: .75; cursor: not-allowed; }
.spf-field .form-error { display: block; }
.spf-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }
.spf-hint[hidden] { display: none; }
.spf-duplicate {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; font-size: 12.5px;
    border: 1px solid #f59e0b; background: #fffbeb; color: #92400e;
}
.spf-duplicate[hidden] { display: none; }
.spf-duplicate .spf-btn { height: 30px; font-size: 12px; }
:root[data-theme="dark"] .spf-duplicate { background: rgba(245,158,11,.12); color: #fde68a; border-color: rgba(245,158,11,.5); }
.spf-check { display: inline-flex; align-items: center; gap: 6px; height: 34px; font-size: 12.5px; color: var(--text-primary); }

.spf-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
.spf-seg label { position: relative; margin: 0; }
.spf-seg input { position: absolute; opacity: 0; pointer-events: none; }
.spf-seg span {
    display: inline-flex; align-items: center; height: 32px; padding: 0 14px; cursor: pointer;
    font-size: 12.5px; font-weight: 600; color: var(--text-primary); background: var(--bg-surface); border-right: 1px solid var(--border-color);
}
.spf-seg label:last-child span { border-right: none; }
.spf-seg input:checked + span { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.spf-seg input:disabled + span { opacity: .45; cursor: not-allowed; }
.spf-seg input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: -2px; }

.spf-summary {
    display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 10px 14px; margin-bottom: 14px; border-radius: 8px;
    background: var(--bg-surface-alt); border: 1px dashed var(--border-color); font-size: 13px; color: var(--text-muted);
}
.spf-summary strong { color: var(--text-primary); font-size: 15px; }
.spf-summary .save { color: #15803d; font-weight: 600; }
:root[data-theme="dark"] .spf-summary .save { color: #86efac; }

.spf-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 13px; cursor: pointer;
}
.spf-btn:hover { background: var(--bg-surface-alt); }
.spf-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.spf-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.spf-btn:disabled { opacity: .5; cursor: not-allowed; }
.spf-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-color); }
.spf-footer-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.spf-delete { height: 36px; padding: 0 14px; border-radius: 6px; border: 1px solid #fca5a5; background: transparent; color: #b91c1c; font-weight: 600; cursor: pointer; }
.spf-delete[hidden] { display: none; }
.spf-delete:hover { background: #fee2e2; }
:root[data-theme="dark"] .spf-delete { color: #fca5a5; border-color: rgba(252,165,165,.5); }
:root[data-theme="dark"] .spf-delete:hover { background: rgba(239,68,68,.15); }

/* Price tags, shared by every page that lists supplier prices */
.spf-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.spf-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.spf-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.spf-tag svg { width: 11px; height: 11px; }
.spf-tag.best { background: #dcfce7; color: #166534; }
.spf-tag.promo { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.spf-tag.scheduled { background: #e0f2fe; color: #075985; }
.spf-tag.expired, .spf-tag.inactive { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.spf-tag.duplicate { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
:root[data-theme="dark"] .spf-tag.duplicate { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.5); }
.spf-tag.preferred { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
:root[data-theme="dark"] .spf-tag.best { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .spf-tag.promo { background: rgba(249,115,22,.18); color: #fed7aa; border-color: rgba(249,115,22,.5); }
:root[data-theme="dark"] .spf-tag.scheduled { background: rgba(14,165,233,.18); color: #bae6fd; }
.spf-strike { text-decoration: line-through; color: var(--text-muted); font-size: 12px; margin-right: 4px; }
.spf-price { font-weight: 700; }

@media (max-width: 720px) {
    .spf-grid { grid-template-columns: 1fr; }
}
`;
    document.head.appendChild(style);
}
