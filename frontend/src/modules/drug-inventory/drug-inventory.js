import {
    fetchDrugInventory, fetchDrugInventoryOptions, fetchDrugCatalog, fetchDrug,
    createDrug, updateDrug, deleteDrug, receiveStock, importDrugs, transferDrugLot, destroyDrugLot
} from "./drug-inventory.service.js";
import { showToast } from "../../core/toast.js";

const EMPTY_OPTIONS = {
    warehouses: [], facilities: [], dosage_forms: [], routes: [], units: [], categories: [],
    product_types: [], controlled_classes: [], storage_conditions: [], intervals: [], destruction_methods: []
};

const MEDICINE_TYPES = ["Drug", "Vaccine"];
const EXPIRY_WARNING_DAYS = 90;

const CSV_COLUMNS = [
    "generic_name", "brand_name", "strength", "dosage_form", "route", "category", "manufacturer",
    "registration_number", "barcode", "product_type", "controlled_class", "requires_prescription",
    "storage_condition", "is_high_alert", "is_lasa", "dispensing_unit", "package_unit", "package_quantity",
    "reorder_level", "max_stock", "unit_cost", "selling_price"
];

const CSV_EXAMPLE = [
    "Paracetamol", "Biogesic", "500 mg", "Tablet", "Oral", "Analgesic / Antipyretic", "Unilab",
    "DR-XY12345", "4800000000000", "Drug", "None", "no",
    "Room temperature (15-30 °C)", "no", "no", "tablet", "box", "100",
    "200", "2000", "1.50", "3.00"
];

// Drug form fields: [input id suffix, payload key, kind]
const DRUG_TEXT_FIELDS = [
    "generic_name", "brand_name", "strength", "manufacturer", "registration_number", "barcode", "ndc", "rxcui"
];
const DRUG_SELECT_FIELDS = [
    "product_type", "dosage_form_id", "route_id", "category_id", "controlled_class", "storage_condition",
    "dispensing_unit_id", "package_unit_id"
];
const DRUG_NUMBER_FIELDS = [
    "package_quantity", "min_level_global", "max_level_global", "on_order", "unit_cost", "selling_price"
];
const DRUG_FLAG_FIELDS = [
    "requires_prescription", "is_high_alert", "is_lasa", "is_active", "allow_inventory",
    "allow_multiple_lots", "allow_combining_lots", "is_consumable"
];

let options = { ...EMPTY_OPTIONS };

let catalog = [];
let allRows = [];
let filteredRows = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";

let editingDrug = null;
let activeTransferLot = null;
let activeDestroyLot = null;
let importRows = [];

export async function initDrugInventory() {
    await loadOptions();

    setupViewTabs();
    setupCatalogFilters();
    setupStockFilters();
    setupDrugModal();
    setupReceiveModal();
    setupImportModal();
    setupTransferModal();
    setupDestroyModal();

    await Promise.all([loadCatalog(), loadInventory()]);
}

async function loadOptions() {
    const result = await fetchDrugInventoryOptions();
    options = result.success ? { ...EMPTY_OPTIONS, ...result.data } : { ...EMPTY_OPTIONS };

    const fill = (id, items, placeholder, toOption = (item) => [item.name, item.id]) => {
        const el = document.getElementById(id);
        el.innerHTML = placeholder !== null ? `<option value="">${placeholder}</option>` : "";
        items.forEach((item) => {
            const [label, value] = toOption(item);
            el.appendChild(new Option(label, value));
        });
    };

    const plain = (item) => [item, item];

    ["diFacilityFilter", "di_rcv_facility_id", "di_tran_facility_id"].forEach((id) => {
        const el = document.getElementById(id);
        options.facilities.forEach((f) => el.appendChild(new Option(f.name, f.id)));
    });

    ["diWarehouseFilter", "di_rcv_warehouse_id", "di_tran_warehouse_id"].forEach((id) => {
        const el = document.getElementById(id);
        if (id !== "diWarehouseFilter") el.innerHTML = `<option value="">-- Select --</option>`;
        options.warehouses.forEach((w) => el.appendChild(new Option(w.name, w.id)));
    });

    ["diProductTypeFilter", "diCatalogTypeFilter"].forEach((id) => {
        const el = document.getElementById(id);
        options.product_types.forEach((t) => el.appendChild(new Option(t, t)));
    });

    const categoryFilter = document.getElementById("diCategoryFilter");
    options.categories.forEach((c) => categoryFilter.appendChild(new Option(c.name, c.id)));

    fill("di_product_type", options.product_types, null, plain);
    fill("di_dosage_form_id", options.dosage_forms, "-- Select --");
    fill("di_route_id", options.routes, "-- Select --");
    fill("di_category_id", options.categories, "-- Select --");
    fill("di_controlled_class", options.controlled_classes, null, plain);
    fill("di_storage_condition", options.storage_conditions, "-- Not specified --", plain);
    fill("di_dispensing_unit_id", options.units, "-- Select --");
    fill("di_package_unit_id", options.units, "-- None --");
    fill("di_destroy_method", options.destruction_methods, "-- Select --", plain);
}

function setupViewTabs() {
    document.querySelectorAll("[data-di-view]").forEach((btn) => {
        btn.addEventListener("click", () => showView(btn.getAttribute("data-di-view")));
    });
}

function showView(view) {
    document.querySelectorAll("[data-di-view]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-di-view") === view);
    });
    document.getElementById("diCatalogPanel").classList.toggle("active", view === "catalog");
    document.getElementById("diStockPanel").classList.toggle("active", view === "stock");
}

/* ---------------------------------------------------------------
 * Drug Catalog
 * ------------------------------------------------------------- */

function setupCatalogFilters() {
    document.getElementById("diCatalogSearch").addEventListener("input", renderCatalog);
    document.getElementById("diCategoryFilter").addEventListener("change", renderCatalog);
    document.getElementById("diCatalogTypeFilter").addEventListener("change", renderCatalog);
    document.getElementById("diLowStockOnly").addEventListener("change", renderCatalog);
    document.getElementById("diCatalogShowInactive").addEventListener("change", loadCatalog);
}

async function loadCatalog() {
    const tbody = document.getElementById("diCatalogBody");
    tbody.innerHTML = `<tr><td colspan="7" class="di-empty-state">Loading...</td></tr>`;

    const result = await fetchDrugCatalog(document.getElementById("diCatalogShowInactive").checked);

    if (!result.success) {
        catalog = [];
        tbody.innerHTML = `<tr><td colspan="7" class="di-empty-state">Failed to load the drug catalog.</td></tr>`;
        return;
    }

    catalog = result.data || [];
    renderCatalog();
}

function isLowStock(drug) {
    if (!drug.allow_inventory) return false;
    return drug.qoh <= 0 || (drug.min_level_global > 0 && drug.qoh <= drug.min_level_global);
}

function renderCatalog() {
    const tbody = document.getElementById("diCatalogBody");
    const term = document.getElementById("diCatalogSearch").value.trim().toLowerCase();
    const categoryId = document.getElementById("diCategoryFilter").value;
    const productType = document.getElementById("diCatalogTypeFilter").value;
    const lowOnly = document.getElementById("diLowStockOnly").checked;

    const rows = catalog.filter((drug) => {
        if (categoryId && String(drug.category_id) !== categoryId) return false;
        if (productType && drug.product_type !== productType) return false;
        if (lowOnly && !isLowStock(drug)) return false;
        if (!term) return true;

        return [drug.name, drug.generic_name, drug.brand_name, drug.registration_number, drug.barcode, drug.manufacturer, drug.ndc]
            .some((field) => (field || "").toLowerCase().includes(term));
    });

    document.getElementById("diCatalogCount").textContent =
        `${rows.length} of ${catalog.length} ${catalog.length === 1 ? "drug" : "drugs"}`;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="di-empty-state">${catalog.length
            ? "No drugs match these filters."
            : "No drugs registered yet. Use &ldquo;+ Register Drug&rdquo; or &ldquo;Import CSV&rdquo; to add your first."}</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(renderCatalogRow).join("");

    tbody.querySelectorAll("[data-edit-drug]").forEach((btn) => {
        btn.addEventListener("click", () => openDrugModal(Number(btn.getAttribute("data-edit-drug"))));
    });

    tbody.querySelectorAll("[data-receive-drug]").forEach((btn) => {
        btn.addEventListener("click", () => openReceiveModal(Number(btn.getAttribute("data-receive-drug"))));
    });
}

function renderCatalogRow(drug) {
    const badges = [];

    badges.push(drug.requires_prescription
        ? `<span class="di-badge rx" title="Prescription required">Rx</span>`
        : `<span class="di-badge otc" title="Over the counter">OTC</span>`);

    if (drug.controlled_class && drug.controlled_class !== "None") {
        const label = drug.controlled_class.startsWith("Dangerous") ? "Dangerous Drug" : "Precursor";
        badges.push(`<span class="di-badge dd" title="${escapeHtml(drug.controlled_class)}">${label}</span>`);
    }

    if (drug.is_high_alert) badges.push(`<span class="di-badge alert">High-alert</span>`);
    if (drug.is_lasa) badges.push(`<span class="di-badge lasa" title="Look-alike / sound-alike">LASA</span>`);
    if (/refrigerated|frozen/i.test(drug.storage_condition || "")) {
        badges.push(`<span class="di-badge cold" title="${escapeHtml(drug.storage_condition)}">Cold chain</span>`);
    }
    if (!drug.is_active) badges.push(`<span class="di-badge inactive">Inactive</span>`);

    const subParts = [drug.manufacturer, drug.registration_number ? `Reg. ${drug.registration_number}` : null].filter(Boolean);

    let stockCell;

    if (!drug.allow_inventory) {
        stockCell = `<span class="di-sub">Not tracked</span>`;
    } else {
        const unit = drug.dispensing_unit_name || "";
        let flag = "";

        if (drug.qoh <= 0) flag = ` <span class="di-badge out">Out of stock</span>`;
        else if (isLowStock(drug)) flag = ` <span class="di-badge low">Low</span>`;

        const packages = drug.package_quantity > 0 && drug.package_unit_name && drug.qoh > 0
            ? `&asymp; ${formatQuantity(drug.qoh / drug.package_quantity)} ${escapeHtml(drug.package_unit_name)} &middot; `
            : "";

        stockCell = `${formatQuantity(drug.qoh)} ${escapeHtml(unit)}${flag}
            <span class="di-sub">${packages}${drug.lot_count} ${drug.lot_count === 1 ? "lot" : "lots"}${drug.min_level_global > 0 ? ` &middot; reorder at ${formatQuantity(drug.min_level_global)}` : ""}</span>`;
    }

    const expiryClass = expiryState(drug.next_expiry);
    const canReceive = drug.allow_inventory && drug.is_active;

    return `
        <tr>
            <td style="white-space:normal;min-width:260px;">
                <span class="di-drug-name">${escapeHtml(drug.name)}</span>
                ${subParts.length ? `<span class="di-sub">${escapeHtml(subParts.join(" · "))}</span>` : ""}
                <div class="di-badges">${badges.join("")}</div>
            </td>
            <td>${escapeHtml(drug.category_name || "-")}</td>
            <td>${escapeHtml(drug.route_name || "-")}</td>
            <td>${stockCell}</td>
            <td class="${expiryClass}">${drug.next_expiry ? formatDate(drug.next_expiry) : "-"}</td>
            <td>${drug.selling_price != null ? formatMoney(drug.selling_price) : "-"}
                ${drug.unit_cost != null ? `<span class="di-sub">cost ${formatMoney(drug.unit_cost)}</span>` : ""}</td>
            <td>
                <div class="di-row-actions">
                    ${canReceive ? `<button type="button" class="di-tran-btn" data-receive-drug="${drug.id}">Receive</button>` : ""}
                    <button type="button" class="di-tran-btn" data-edit-drug="${drug.id}">Edit</button>
                </div>
            </td>
        </tr>
    `;
}

/* ---------------------------------------------------------------
 * Register / Edit Drug
 * ------------------------------------------------------------- */

function setupDrugModal() {
    const overlay = document.getElementById("diAddDrugModalOverlay");
    const form = document.getElementById("diAddDrugForm");

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diAddDrugBtn").addEventListener("click", () => openDrugModal(null));
    document.getElementById("diAddTemplateRowBtn").addEventListener("click", () => addTemplateRow());
    document.getElementById("diCloseAddDrugModal").addEventListener("click", closeModal);
    document.getElementById("diCancelAddDrug").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    document.getElementById("di_product_type").addEventListener("change", applyDrugFormRules);
    document.getElementById("di_allow_inventory").addEventListener("change", applyDrugFormRules);
    document.getElementById("di_controlled_class").addEventListener("change", applyDrugFormRules);

    ["di_generic_name", "di_brand_name", "di_strength", "di_dosage_form_id"].forEach((id) => {
        document.getElementById(id).addEventListener("input", updateNamePreview);
        document.getElementById(id).addEventListener("change", updateNamePreview);
    });

    ["di_package_unit_id", "di_package_quantity", "di_dispensing_unit_id"].forEach((id) => {
        document.getElementById(id).addEventListener("input", updatePackageHint);
        document.getElementById(id).addEventListener("change", updatePackageHint);
    });

    document.getElementById("diDeleteDrugBtn").addEventListener("click", async () => {
        if (!editingDrug || !confirm(`Delete "${editingDrug.name}" from the catalog?`)) return;

        const result = await deleteDrug(editingDrug.id);

        if (!result.success) {
            showAlert("diAddDrugAlert", result.message || "Failed to delete the drug.", "error");
            return;
        }

        closeModal();
        showToast("Drug deleted.", "success");
        await Promise.all([loadCatalog(), loadInventory()]);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearFormErrors("diAddDrugForm", "diAddDrugAlert");

        const payload = readDrugForm();
        const saveBtn = document.getElementById("diSaveDrugBtn");
        saveBtn.disabled = true;

        const result = editingDrug
            ? await updateDrug(editingDrug.id, payload)
            : await createDrug(payload);

        saveBtn.disabled = false;

        if (!result.success) {
            showFieldErrors(result, "diAddDrugAlert", (field) => `err-di_${field}`, "Failed to save the drug.");
            return;
        }

        const wasEditing = Boolean(editingDrug);
        const newDrugId = result.data?.drug_id;

        closeModal();
        showToast(wasEditing ? "Drug updated." : `Registered ${result.data?.name || "drug"}.`, "success");
        await Promise.all([loadCatalog(), loadInventory()]);

        if (!wasEditing && newDrugId && payload.allow_inventory && options.warehouses.length
            && confirm("Drug registered. Receive its first stock now?")) {
            openReceiveModal(newDrugId);
        }
    });
}

async function openDrugModal(drugId) {
    const form = document.getElementById("diAddDrugForm");
    form.reset();
    clearFormErrors("diAddDrugForm", "diAddDrugAlert");
    editingDrug = null;

    if (drugId) {
        const result = await fetchDrug(drugId);

        if (!result.success) {
            showToast(result.message || "Failed to load the drug.", "error");
            return;
        }

        editingDrug = result.data;
    }

    const drug = editingDrug;

    document.getElementById("diDrugModalTitle").textContent = drug ? "Edit Drug" : "Register Drug";
    document.getElementById("diSaveDrugBtn").textContent = drug ? "Save Changes" : "Register Drug";
    document.getElementById("diDeleteDrugBtn").style.display = drug ? "" : "none";

    if (drug) {
        DRUG_TEXT_FIELDS.forEach((f) => { document.getElementById(`di_${f}`).value = drug[f] ?? ""; });
        DRUG_SELECT_FIELDS.forEach((f) => { document.getElementById(`di_${f}`).value = drug[f] ?? ""; });
        DRUG_NUMBER_FIELDS.forEach((f) => { document.getElementById(`di_${f}`).value = drug[f] ?? ""; });
        DRUG_FLAG_FIELDS.forEach((f) => { document.getElementById(`di_${f}`).checked = Boolean(drug[f]); });

        if (drug.ndc || drug.rxcui) document.querySelector("#diAddDrugForm .di-advanced").open = true;
    } else {
        document.getElementById("di_product_type").value = "Drug";
        document.getElementById("di_controlled_class").value = "None";
        ["min_level_global", "max_level_global", "on_order"].forEach((f) => { document.getElementById(`di_${f}`).value = "0"; });
        document.querySelector("#diAddDrugForm .di-advanced").open = false;
    }

    resetTemplateRows(drug?.templates || []);
    applyDrugFormRules();
    updatePackageHint();

    document.getElementById("diAddDrugModalOverlay").classList.add("open");
    document.getElementById("di_generic_name").focus();
}

function applyDrugFormRules() {
    const type = document.getElementById("di_product_type").value;
    const isMedicine = MEDICINE_TYPES.includes(type);
    const tracksStock = document.getElementById("di_allow_inventory").checked;
    const controlled = document.getElementById("di_controlled_class").value !== "None";
    const rxBox = document.getElementById("di_requires_prescription");

    document.getElementById("di_generic_label").textContent = isMedicine ? "Generic Name" : "Item Name";
    document.getElementById("di_strength_req").style.display = type === "Drug" ? "" : "none";
    document.getElementById("di_form_req").style.display = isMedicine ? "" : "none";
    document.getElementById("di_unit_req").style.display = tracksStock ? "" : "none";

    if (controlled) {
        rxBox.checked = true;
        rxBox.disabled = true;
        rxBox.parentElement.title = "Dangerous drugs and precursors always need a prescription";
    } else {
        rxBox.disabled = false;
        rxBox.parentElement.title = "";
    }

    updateNamePreview();
}

function updateNamePreview() {
    const generic = document.getElementById("di_generic_name").value.trim();
    const brand = document.getElementById("di_brand_name").value.trim();
    const strength = document.getElementById("di_strength").value.trim();
    const formSelect = document.getElementById("di_dosage_form_id");
    const formName = formSelect.value ? formSelect.options[formSelect.selectedIndex].text : "";

    let name = [generic, strength, formName === "Other" ? "" : formName].filter(Boolean).join(" ");
    if (brand) name += ` (${brand})`;

    document.getElementById("diNamePreview").textContent = generic ? name : "—";

    const warning = document.getElementById("diDupWarning");
    const duplicate = generic ? findDuplicate(generic, brand, strength, formSelect.value) : null;

    warning.classList.toggle("show", Boolean(duplicate));
    warning.textContent = duplicate
        ? `Already registered as "${duplicate.name}". Saving will be blocked unless the brand, strength or form differs.`
        : "";
}

function findDuplicate(generic, brand, strength, dosageFormId) {
    const norm = (v) => (v || "").trim().toLowerCase();
    const normStrength = (v) => norm(v).replace(/\s+/g, "");

    return catalog.find((drug) => drug.id !== editingDrug?.id
        && norm(drug.generic_name) === norm(generic)
        && norm(drug.brand_name) === norm(brand)
        && normStrength(drug.strength) === normStrength(strength)
        && String(drug.dosage_form_id || "") === String(dosageFormId || "")) || null;
}

function updatePackageHint() {
    const unitSelect = document.getElementById("di_dispensing_unit_id");
    const pkgSelect = document.getElementById("di_package_unit_id");
    const qty = Number(document.getElementById("di_package_quantity").value);
    const hint = document.getElementById("diPackageHint");

    if (pkgSelect.value && qty > 0 && unitSelect.value) {
        hint.textContent = `1 ${pkgSelect.options[pkgSelect.selectedIndex].text} = ${formatQuantity(qty)} ${unitSelect.options[unitSelect.selectedIndex].text}`;
    } else {
        hint.innerHTML = "&nbsp;";
    }
}

function readDrugForm() {
    const payload = {};

    DRUG_TEXT_FIELDS.forEach((f) => { payload[f] = document.getElementById(`di_${f}`).value.trim(); });
    DRUG_SELECT_FIELDS.forEach((f) => { payload[f] = document.getElementById(`di_${f}`).value; });
    DRUG_NUMBER_FIELDS.forEach((f) => { payload[f] = document.getElementById(`di_${f}`).value; });
    DRUG_FLAG_FIELDS.forEach((f) => { payload[f] = document.getElementById(`di_${f}`).checked; });

    payload.templates = readTemplateRows();

    return payload;
}

function resetTemplateRows(templates) {
    document.getElementById("diTemplatesBody").innerHTML = "";

    templates.forEach((t) => addTemplateRow(t));

    for (let i = templates.length; i < 2; i++) {
        addTemplateRow();
    }
}

function addTemplateRow(template = null) {
    const intervalOptions = `<option value="">--</option>` + options.intervals.map((i) => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join("");

    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input type="text" data-tpl-field="name"></td>
        <td><input type="text" data-tpl-field="schedule"></td>
        <td><select data-tpl-field="interval_type">${intervalOptions}</select></td>
        <td><input type="text" data-tpl-field="basic_units"></td>
        <td><input type="number" min="0" data-tpl-field="refills" value="0"></td>
        <td><input type="checkbox" data-tpl-field="is_standard"></td>
        <td><button type="button" class="di-remove-template-row" title="Remove row">&times;</button></td>
    `;

    if (template) {
        row.querySelector('[data-tpl-field="name"]').value = template.name ?? "";
        row.querySelector('[data-tpl-field="schedule"]').value = template.schedule ?? "";
        row.querySelector('[data-tpl-field="interval_type"]').value = template.interval_type ?? "";
        row.querySelector('[data-tpl-field="basic_units"]').value = template.basic_units ?? "";
        row.querySelector('[data-tpl-field="refills"]').value = template.refills ?? 0;
        row.querySelector('[data-tpl-field="is_standard"]').checked = Number(template.is_standard) === 1;
    }

    row.querySelector(".di-remove-template-row").addEventListener("click", () => row.remove());

    document.getElementById("diTemplatesBody").appendChild(row);
}

function readTemplateRows() {
    return [...document.querySelectorAll("#diTemplatesBody tr")].map((row) => ({
        name: row.querySelector('[data-tpl-field="name"]').value.trim(),
        schedule: row.querySelector('[data-tpl-field="schedule"]').value.trim(),
        interval_type: row.querySelector('[data-tpl-field="interval_type"]').value,
        basic_units: row.querySelector('[data-tpl-field="basic_units"]').value.trim(),
        refills: row.querySelector('[data-tpl-field="refills"]').value,
        is_standard: row.querySelector('[data-tpl-field="is_standard"]').checked
    }));
}

/* ---------------------------------------------------------------
 * Receive Stock
 * ------------------------------------------------------------- */

const RECEIVE_FIELDS = [
    "drug_id", "warehouse_id", "facility_id", "lot_number", "expires_date", "quantity", "quantity_in",
    "received_date", "supplier", "invoice_number", "unit_cost", "notes"
];

function setupReceiveModal() {
    const overlay = document.getElementById("diReceiveModalOverlay");
    const form = document.getElementById("diReceiveForm");
    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diReceiveBtn").addEventListener("click", () => openReceiveModal(null));
    document.getElementById("diCloseReceiveModal").addEventListener("click", closeModal);
    document.getElementById("diCancelReceive").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    document.getElementById("di_rcv_drug_id").addEventListener("change", applyReceiveDrug);
    document.getElementById("di_rcv_quantity").addEventListener("input", updateReceiveTotal);
    document.getElementById("di_rcv_quantity_in").addEventListener("change", updateReceiveTotal);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearFormErrors("diReceiveForm", "diReceiveAlert");

        const payload = {};
        RECEIVE_FIELDS.forEach((f) => { payload[f] = document.getElementById(`di_rcv_${f}`).value.trim(); });

        if (!payload.drug_id) {
            document.getElementById("err-di_rcv_drug_id").textContent = "Choose a drug.";
            return;
        }

        const submitBtn = form.querySelector(".login-btn");
        submitBtn.disabled = true;
        const result = await receiveStock(payload);
        submitBtn.disabled = false;

        if (!result.success) {
            showFieldErrors(result, "diReceiveAlert", (field) => `err-di_rcv_${field}`, "Failed to receive stock.");
            return;
        }

        closeModal();
        showToast(result.message || "Stock received.", "success");
        await Promise.all([loadCatalog(), loadInventory()]);
    });
}

function openReceiveModal(drugId) {
    const form = document.getElementById("diReceiveForm");
    form.reset();
    clearFormErrors("diReceiveForm", "diReceiveAlert");

    if (!options.warehouses.length) {
        showAlert("diReceiveAlert", "No warehouses exist yet. Add one under Inventory > Manage Warehouses first.", "error");
    }

    const select = document.getElementById("di_rcv_drug_id");
    const receivable = catalog.filter((d) => d.allow_inventory && d.is_active);

    select.innerHTML = `<option value="">-- Select a drug --</option>` +
        receivable.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
    select.value = drugId ? String(drugId) : "";

    const today = isoToday();
    document.getElementById("di_rcv_received_date").value = today;
    document.getElementById("di_rcv_received_date").max = today;
    document.getElementById("di_rcv_expires_date").min = isoDateOffset(1);

    if (options.warehouses.length === 1) {
        document.getElementById("di_rcv_warehouse_id").value = String(options.warehouses[0].id);
    }

    applyReceiveDrug();
    document.getElementById("diReceiveModalOverlay").classList.add("open");
}

function applyReceiveDrug() {
    const drug = catalog.find((d) => String(d.id) === document.getElementById("di_rcv_drug_id").value);
    const unitSelect = document.getElementById("di_rcv_quantity_in");
    const isMedicine = !drug || MEDICINE_TYPES.includes(drug.product_type);

    const unitLabel = drug?.dispensing_unit_name || "unit";
    unitSelect.innerHTML = `<option value="unit">${escapeHtml(unitLabel)}</option>`;

    if (drug && drug.package_quantity > 0 && drug.package_unit_name) {
        unitSelect.innerHTML += `<option value="package">${escapeHtml(drug.package_unit_name)} (&times;${formatQuantity(drug.package_quantity)})</option>`;
    }

    document.getElementById("di_rcv_lot_req").style.display = isMedicine ? "" : "none";
    document.getElementById("di_rcv_exp_req").style.display = isMedicine ? "" : "none";

    if (drug?.unit_cost != null && !document.getElementById("di_rcv_unit_cost").value) {
        document.getElementById("di_rcv_unit_cost").value = drug.unit_cost;
    }

    updateReceiveTotal();
}

function updateReceiveTotal() {
    const drug = catalog.find((d) => String(d.id) === document.getElementById("di_rcv_drug_id").value);
    const qty = Number(document.getElementById("di_rcv_quantity").value);
    const inPackages = document.getElementById("di_rcv_quantity_in").value === "package";
    const hint = document.getElementById("diReceiveTotal");

    if (drug && qty > 0 && inPackages) {
        hint.textContent = `= ${formatQuantity(qty * drug.package_quantity)} ${drug.dispensing_unit_name || "units"} added to stock`;
    } else if (drug) {
        hint.textContent = `Currently on hand: ${formatQuantity(drug.qoh)} ${drug.dispensing_unit_name || ""}`;
    } else {
        hint.innerHTML = "&nbsp;";
    }
}

/* ---------------------------------------------------------------
 * CSV Import
 * ------------------------------------------------------------- */

function setupImportModal() {
    const overlay = document.getElementById("diImportModalOverlay");
    const fileInput = document.getElementById("di_import_file");
    const runBtn = document.getElementById("diRunImport");
    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diImportBtn").addEventListener("click", () => {
        fileInput.value = "";
        importRows = [];
        runBtn.disabled = true;
        document.getElementById("diImportSummary").innerHTML = "&nbsp;";
        document.getElementById("diImportResults").innerHTML = "";
        document.getElementById("diImportAlert").innerHTML = "";
        overlay.classList.add("open");
    });

    document.getElementById("diCloseImportModal").addEventListener("click", closeModal);
    document.getElementById("diCancelImport").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    document.getElementById("diDownloadTemplate").addEventListener("click", (event) => {
        event.preventDefault();
        const csv = [CSV_COLUMNS, CSV_EXAMPLE].map((row) => row.map(csvEscape).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "drug-catalog-template.csv";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    fileInput.addEventListener("change", async () => {
        document.getElementById("diImportResults").innerHTML = "";
        document.getElementById("diImportAlert").innerHTML = "";
        importRows = [];
        runBtn.disabled = true;

        const file = fileInput.files[0];
        if (!file) return;

        const parsed = parseCsv((await file.text()).replace(/^﻿/, ""));

        if (parsed.length < 2) {
            showAlert("diImportAlert", "The file has no data rows.", "error");
            return;
        }

        const header = parsed[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

        if (!header.includes("generic_name")) {
            showAlert("diImportAlert", "Missing the generic_name column. Start from the CSV template.", "error");
            return;
        }

        importRows = parsed.slice(1)
            .filter((cells) => cells.some((c) => c.trim() !== ""))
            .map((cells) => Object.fromEntries(header.map((key, i) => [key, (cells[i] ?? "").trim()])));

        document.getElementById("diImportSummary").textContent = `${importRows.length} row(s) ready to import.`;
        runBtn.disabled = importRows.length === 0;
    });

    runBtn.addEventListener("click", async () => {
        runBtn.disabled = true;
        runBtn.textContent = "Importing...";

        const result = await importDrugs(importRows);

        runBtn.textContent = "Import";

        if (!result.success) {
            runBtn.disabled = false;
            showAlert("diImportAlert", result.message || "Import failed.", "error");
            return;
        }

        const { created, failed } = result.data;
        showAlert("diImportAlert", result.message, failed.length ? "warning" : "success");

        document.getElementById("diImportResults").innerHTML = failed.map((f) => `
            <li><strong>Row ${f.row}${f.name ? ` &middot; ${escapeHtml(f.name)}` : ""}:</strong>
                <span class="di-sub">${escapeHtml(f.errors.join(" "))}</span></li>
        `).join("");

        importRows = [];
        fileInput.value = "";
        document.getElementById("diImportSummary").innerHTML = "&nbsp;";

        if (created > 0) await loadCatalog();
    });
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else cell += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            row.push(cell); cell = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(cell); rows.push(row); row = []; cell = "";
        } else {
            cell += ch;
        }
    }

    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }

    return rows;
}

function csvEscape(value) {
    const s = String(value ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ---------------------------------------------------------------
 * Stock on Hand (lots)
 * ------------------------------------------------------------- */

function setupStockFilters() {
    document.getElementById("diFacilityFilter").addEventListener("change", loadInventory);
    document.getElementById("diWarehouseFilter").addEventListener("change", loadInventory);
    document.getElementById("diProductTypeFilter").addEventListener("change", loadInventory);
    document.getElementById("diShowEmptyLots").addEventListener("change", loadInventory);
    document.getElementById("diShowInactive").addEventListener("change", loadInventory);
    document.getElementById("diRefreshBtn").addEventListener("click", loadInventory);

    document.getElementById("diPageSize").addEventListener("change", (event) => {
        pageSize = Number(event.target.value);
        currentPage = 1;
        render();
    });

    document.getElementById("diSearchInput").addEventListener("input", (event) => {
        searchTerm = event.target.value.trim().toLowerCase();
        currentPage = 1;
        applySearch();
        render();
    });
}

async function loadInventory() {
    const tbody = document.getElementById("diTableBody");
    tbody.innerHTML = `<tr><td colspan="9" class="di-empty-state">Loading...</td></tr>`;

    const result = await fetchDrugInventory({
        facility_id: document.getElementById("diFacilityFilter").value,
        warehouse_id: document.getElementById("diWarehouseFilter").value,
        product_type: document.getElementById("diProductTypeFilter").value,
        show_empty_lots: document.getElementById("diShowEmptyLots").checked,
        show_inactive: document.getElementById("diShowInactive").checked
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="9" class="di-empty-state">Failed to load inventory.</td></tr>`;
        return;
    }

    allRows = result.data || [];
    currentPage = 1;
    applySearch();
    render();
}

function applySearch() {
    filteredRows = !searchTerm ? allRows : allRows.filter((row) => [
        row.name, row.ndc, row.form, row.lot_number, row.facility_name, row.warehouse_name, row.product_type
    ].some((field) => (field || "").toLowerCase().includes(searchTerm)));
}

function render() {
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = filteredRows.slice(start, start + pageSize);

    renderTable(pageRows);
    renderFooter(total, start, pageRows.length);
    renderPagination(totalPages);
}

function renderTable(rows) {
    const tbody = document.getElementById("diTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="di-empty-state">No stock on hand matches. Use &ldquo;Receive Stock&rdquo; to add some.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td class="di-drug-name">${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.form || "-")}</td>
            <td>${escapeHtml(row.lot_number)}</td>
            <td>${escapeHtml(row.facility_name || "N/A")}</td>
            <td>${escapeHtml(row.warehouse_name)}</td>
            <td>${formatQuantity(row.quantity_on_hand)} ${escapeHtml(row.unit || "")}</td>
            <td class="${expiryState(row.expires_date)}">${row.expires_date ? formatDate(row.expires_date) : "-"}</td>
            <td><button type="button" class="di-tran-btn" data-tran-lot="${row.lot_id}">Tran</button></td>
            <td><button type="button" class="di-destroy-btn" data-destroy-lot="${row.lot_id}">Destroy</button></td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-tran-lot]").forEach((btn) => {
        btn.addEventListener("click", () => openTransferModal(Number(btn.getAttribute("data-tran-lot"))));
    });

    tbody.querySelectorAll("[data-destroy-lot]").forEach((btn) => {
        btn.addEventListener("click", () => openDestroyModal(Number(btn.getAttribute("data-destroy-lot"))));
    });
}

function renderFooter(total, start, shown) {
    document.getElementById("diFooterInfo").textContent = total
        ? `Showing ${start + 1} to ${start + shown} of ${total} entries`
        : "Showing 0 entries";
}

function renderPagination(totalPages) {
    const wrap = document.getElementById("diPagination");

    let html = `<button type="button" class="di-page-btn" id="diPrevPage" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;

    for (let p = 1; p <= totalPages; p++) {
        html += `<button type="button" class="di-page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    }

    html += `<button type="button" class="di-page-btn" id="diNextPage" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

    wrap.innerHTML = html;

    wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => { currentPage = Number(btn.getAttribute("data-page")); render(); });
    });

    document.getElementById("diPrevPage")?.addEventListener("click", () => { currentPage--; render(); });
    document.getElementById("diNextPage")?.addEventListener("click", () => { currentPage++; render(); });
}

function setupTransferModal() {
    const overlay = document.getElementById("diTransferModalOverlay");
    const form = document.getElementById("diTransferForm");

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diCloseTransferModal").addEventListener("click", closeModal);
    document.getElementById("diCancelTransfer").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("diTransferAlert").innerHTML = "";
        document.querySelectorAll("#diTransferForm .form-error").forEach((el) => { el.textContent = ""; });

        const result = await transferDrugLot(activeTransferLot.lot_id, {
            warehouse_id: document.getElementById("di_tran_warehouse_id").value,
            facility_id: document.getElementById("di_tran_facility_id").value,
            lot_number: document.getElementById("di_tran_lot_number").value.trim(),
            quantity: document.getElementById("di_tran_quantity").value,
            notes: document.getElementById("di_tran_notes").value.trim()
        });

        if (!result.success) {
            showAlert("diTransferAlert", result.message || "Failed to transfer.", "error");
            return;
        }

        closeModal();
        showToast("Transferred successfully.", "success");
        await Promise.all([loadCatalog(), loadInventory()]);
    });
}

function openTransferModal(lotId) {
    activeTransferLot = allRows.find((r) => r.lot_id === lotId);

    if (!activeTransferLot) return;

    document.getElementById("diTransferSource").innerHTML = `
        <strong>${escapeHtml(activeTransferLot.name)}</strong> &middot; Lot ${escapeHtml(activeTransferLot.lot_number)}
        &middot; ${formatQuantity(activeTransferLot.quantity_on_hand)} on hand at ${escapeHtml(activeTransferLot.warehouse_name)}
    `;

    document.getElementById("diTransferAlert").innerHTML = "";
    document.querySelectorAll("#diTransferForm .form-error").forEach((el) => { el.textContent = ""; });

    document.getElementById("di_tran_warehouse_id").value = "";
    document.getElementById("di_tran_facility_id").value = activeTransferLot.facility_id || "";
    document.getElementById("di_tran_lot_number").value = activeTransferLot.lot_number;
    document.getElementById("di_tran_quantity").value = "";
    document.getElementById("di_tran_notes").value = "";

    document.getElementById("diTransferModalOverlay").classList.add("open");
}

function setupDestroyModal() {
    const overlay = document.getElementById("diDestroyModalOverlay");
    const form = document.getElementById("diDestroyForm");

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diCloseDestroyModal").addEventListener("click", closeModal);
    document.getElementById("diCancelDestroy").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("diDestroyAlert").innerHTML = "";
        document.querySelectorAll("#diDestroyForm .form-error").forEach((el) => { el.textContent = ""; });

        const result = await destroyDrugLot(activeDestroyLot.lot_id, {
            quantity: document.getElementById("di_destroy_quantity").value,
            destroyed_date: document.getElementById("di_destroy_date").value,
            method: document.getElementById("di_destroy_method").value,
            witness: document.getElementById("di_destroy_witness").value.trim(),
            notes: document.getElementById("di_destroy_notes").value.trim()
        });

        if (!result.success) {
            showAlert("diDestroyAlert", result.message || "Failed to destroy.", "error");
            return;
        }

        closeModal();
        showToast("Drug destroyed and recorded successfully.", "success");
        await Promise.all([loadCatalog(), loadInventory()]);
    });
}

function openDestroyModal(lotId) {
    activeDestroyLot = allRows.find((r) => r.lot_id === lotId);

    if (!activeDestroyLot) return;

    document.getElementById("diDestroySource").innerHTML = `
        <strong>${escapeHtml(activeDestroyLot.name)}</strong> &middot; Lot ${escapeHtml(activeDestroyLot.lot_number)}
        &middot; ${formatQuantity(activeDestroyLot.quantity_on_hand)} on hand at ${escapeHtml(activeDestroyLot.warehouse_name)}
    `;

    document.getElementById("diDestroyAlert").innerHTML = "";
    document.querySelectorAll("#diDestroyForm .form-error").forEach((el) => { el.textContent = ""; });

    document.getElementById("di_destroy_quantity").value = "";
    document.getElementById("di_destroy_date").value = isoToday();
    document.getElementById("di_destroy_method").value = "";
    document.getElementById("di_destroy_witness").value = "";
    document.getElementById("di_destroy_notes").value = "";

    document.getElementById("diDestroyModalOverlay").classList.add("open");
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

function clearFormErrors(formId, alertId) {
    document.getElementById(alertId).innerHTML = "";
    document.querySelectorAll(`#${formId} .form-error`).forEach((el) => { el.textContent = ""; });
}

function showFieldErrors(result, alertId, errorElementId, fallback) {
    const errors = result.errors && typeof result.errors === "object" ? result.errors : null;

    if (errors && Object.keys(errors).length) {
        showAlert(alertId, "Please fix the highlighted fields.", "error");

        Object.entries(errors).forEach(([field, message]) => {
            const el = document.getElementById(errorElementId(field));
            if (el) el.textContent = message;
        });

        const firstError = [...document.querySelectorAll(".form-error")].find((el) => el.textContent && el.offsetParent);
        firstError?.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
    }

    showAlert(alertId, result.message || fallback, "error");
}

function expiryState(value) {
    if (!value) return "";

    const date = value.slice(0, 10);

    if (date <= isoToday()) return "di-expired";
    if (date <= isoDateOffset(EXPIRY_WARNING_DAYS)) return "di-expiring";

    return "";
}

function isoToday() {
    return isoDateOffset(0);
}

function isoDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, "");
}

function formatMoney(value) {
    return "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB");
}

function showAlert(containerId, message, type) {
    document.getElementById(containerId).innerHTML = `<div class="form-alert ${type}">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
