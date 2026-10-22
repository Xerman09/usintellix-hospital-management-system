import {
    fetchDrugInventory, fetchDrugInventoryOptions, fetchDrugCatalog, fetchDrug,
    createDrug, updateDrug, deleteDrug, receiveStock, importDrugs, transferDrugLot, destroyDrugLot,
    fetchRecalls, fetchRecallDetail, createRecall, updateRecallStatus,
    fetchQuarantineData, runQuarantineScan, releaseQuarantine, fetchQuarantineLogs
} from "./drug-inventory.service.js";
import { showToast } from "../../core/toast.js";
import { systemNow } from "../../core/timezone.js?v=3";
import { custodianHint } from "../../core/custodian.js";

const EMPTY_OPTIONS = {
    warehouses: [], facilities: [], dosage_forms: [], routes: [], units: [], categories: [], suppliers: [],
    product_types: [], controlled_classes: [], storage_conditions: [], intervals: [], destruction_methods: []
};

const OTHER_SUPPLIER = "__other";

const MEDICINE_TYPES = ["Drug", "Vaccine"];
const EXPIRY_WARNING_DAYS = 90;

const CSV_COLUMNS = [
    "generic_name", "brand_name", "strength", "dosage_form", "route", "category", "manufacturer",
    "registration_number", "barcode", "product_type", "controlled_class", "requires_prescription",
    "storage_condition", "is_high_alert", "is_lasa", "dispensing_unit", "package_unit", "package_quantity",
    "reorder_level", "max_stock", "unit_cost", "selling_price", "preferred_supplier"
];

// preferred_supplier is left blank so the example row imports on any system.
const CSV_EXAMPLE = [
    "Paracetamol", "Biogesic", "500 mg", "Tablet", "Oral", "Analgesic / Antipyretic", "Unilab",
    "DR-XY12345", "4800000000000", "Drug", "None", "no",
    "Room temperature (15-30 °C)", "no", "no", "tablet", "box", "100",
    "200", "2000", "1.50", "3.00", ""
];

// Drug form fields: [input id suffix, payload key, kind]
const DRUG_TEXT_FIELDS = [
    "generic_name", "brand_name", "strength", "manufacturer", "registration_number", "barcode", "ndc", "rxcui"
];
const DRUG_SELECT_FIELDS = [
    "product_type", "dosage_form_id", "route_id", "category_id", "controlled_class", "storage_condition",
    "dispensing_unit_id", "package_unit_id", "preferred_supplier_id"
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
    setupRecalls();

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
    fill("di_preferred_supplier_id", options.suppliers, "-- None --");

    const receiveSupplier = document.getElementById("di_rcv_supplier_id");
    fill("di_rcv_supplier_id", options.suppliers, "-- Not specified --");
    receiveSupplier.appendChild(new Option("Other (not in the list)...", OTHER_SUPPLIER));
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
    const recallsPanel = document.getElementById("diRecallsPanel");
    if (recallsPanel) {
        recallsPanel.classList.toggle("active", view === "recalls");
        if (view === "recalls") { loadQuarantineData(); loadRecalls(); }
    }
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

    const subParts = [
        drug.manufacturer,
        drug.registration_number ? `Reg. ${drug.registration_number}` : null,
        drug.preferred_supplier_name ? `Supplier: ${drug.preferred_supplier_name}` : null
    ].filter(Boolean);

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
    "received_date", "supplier_id", "supplier", "invoice_number", "unit_cost", "notes"
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
    document.getElementById("di_rcv_supplier_id").addEventListener("change", syncOtherSupplierInput);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearFormErrors("diReceiveForm", "diReceiveAlert");

        const payload = {};
        RECEIVE_FIELDS.forEach((f) => { payload[f] = document.getElementById(`di_rcv_${f}`).value.trim(); });

        // A listed supplier is sent by id; "Other" sends the typed name.
        if (payload.supplier_id === OTHER_SUPPLIER) {
            payload.supplier_id = "";
        } else {
            payload.supplier = "";
        }

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
        showAlert("diReceiveAlert", "No storage locations exist yet. Add one under Pharmacy > Storage Locations first.", "error");
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

    const rcvLocation = document.getElementById("di_rcv_warehouse_id");
    const showRcvCustodian = () => {
        const hint = custodianText(rcvLocation.value);
        document.getElementById("diRcvCustodian").textContent = hint.text;
        document.getElementById("diRcvCustodian").classList.toggle("warn", hint.warn);
    };
    rcvLocation.onchange = showRcvCustodian;
    setTimeout(showRcvCustodian, 0);

    if (options.warehouses.length === 1) {
        document.getElementById("di_rcv_warehouse_id").value = String(options.warehouses[0].id);
    }

    document.getElementById("di_rcv_supplier_id").value = "";
    syncOtherSupplierInput();
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

    // Default to the drug's preferred supplier unless one was already picked.
    const supplierSelect = document.getElementById("di_rcv_supplier_id");
    const preferred = drug?.preferred_supplier_id ? String(drug.preferred_supplier_id) : "";

    if (!supplierSelect.value && preferred && [...supplierSelect.options].some((o) => o.value === preferred)) {
        supplierSelect.value = preferred;
    }

    updateReceiveTotal();
}

function syncOtherSupplierInput() {
    const isOther = document.getElementById("di_rcv_supplier_id").value === OTHER_SUPPLIER;
    const input = document.getElementById("di_rcv_supplier");

    input.hidden = !isOther;

    if (isOther) {
        input.focus();
    } else {
        input.value = "";
    }
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

const MAX_IMPORT_ROWS = 1000;

const ICON_OK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
const ICON_SKIP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

// Parsed file: { header: [...], rows: [{ line, cells, data, errors }] }
let importFile = null;
let importSkipped = [];

function setupImportModal() {
    const overlay = document.getElementById("diImportModalOverlay");
    const fileInput = document.getElementById("di_import_file");
    const dropzone = document.getElementById("diDropzone");
    const runBtn = document.getElementById("diRunImport");
    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diImportBtn").addEventListener("click", () => {
        resetImport();
        renderImportReference();
        overlay.classList.add("open");
    });

    document.getElementById("diCloseImportModal").addEventListener("click", closeModal);
    document.getElementById("diCancelImport").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    document.getElementById("diTemplateBtn").addEventListener("click", downloadImportTemplate);
    document.getElementById("diDownloadTemplate").addEventListener("click", downloadImportTemplate);

    fileInput.addEventListener("change", () => {
        if (fileInput.files[0]) loadImportFile(fileInput.files[0]);
    });

    ["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
    }));

    ["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
    }));

    dropzone.addEventListener("drop", (event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file) loadImportFile(file);
    });

    document.getElementById("diFileRemove").addEventListener("click", resetImport);
    document.getElementById("diProblemsOnly").addEventListener("change", renderImportPreview);

    runBtn.addEventListener("click", runImport);
}

function resetImport() {
    importFile = null;
    importSkipped = [];

    document.getElementById("di_import_file").value = "";
    document.getElementById("diImportAlert").innerHTML = "";
    document.getElementById("diDropzone").hidden = false;
    document.getElementById("diFileChip").hidden = true;
    document.getElementById("diReviewStep").hidden = true;
    document.getElementById("diProblemsOnly").checked = false;
    document.getElementById("diImportSteps").hidden = false;
    document.getElementById("diImportResult").hidden = true;
    document.getElementById("diImportResult").innerHTML = "";
    document.getElementById("diImportFootnote").textContent = "Rows with problems are skipped; the rest are imported.";
    document.getElementById("diCancelImport").textContent = "Cancel";

    const runBtn = document.getElementById("diRunImport");
    runBtn.hidden = false;
    runBtn.disabled = true;
    runBtn.textContent = "Import";
}

async function loadImportFile(file) {
    const alertBox = document.getElementById("diImportAlert");
    alertBox.innerHTML = "";

    if (!/\.csv$/i.test(file.name)) {
        showAlert("diImportAlert", "Please choose a .csv file. In Excel, use File > Save As > CSV UTF-8.", "error");
        return;
    }

    const parsed = parseCsv((await file.text()).replace(/^\ufeff/, ""));
    const header = (parsed[0] || []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

    if (!header.includes("generic_name")) {
        showAlert("diImportAlert", "This file has no generic_name column. Start from the template so the headers match.", "error");
        return;
    }

    const rows = parsed.slice(1)
        .map((cells, i) => ({ line: i + 2, cells }))
        .filter((r) => r.cells.some((c) => c.trim() !== ""));

    if (!rows.length) {
        showAlert("diImportAlert", "The file has a header row but no drugs under it.", "error");
        return;
    }

    if (rows.length > MAX_IMPORT_ROWS) {
        showAlert("diImportAlert", `This file has ${rows.length.toLocaleString()} rows. Split it into files of ${MAX_IMPORT_ROWS.toLocaleString()} rows or fewer.`, "error");
        return;
    }

    rows.forEach((row) => {
        row.data = Object.fromEntries(header.map((key, i) => [key, (row.cells[i] ?? "").trim()]));
    });

    validateImportRows(rows);

    importFile = { name: file.name, size: file.size, header, rows };

    document.getElementById("diDropzone").hidden = true;
    document.getElementById("diFileChip").hidden = false;
    document.getElementById("diFileName").textContent = file.name;
    document.getElementById("diFileInfo").textContent = `${formatFileSize(file.size)} · ${rows.length} ${rows.length === 1 ? "row" : "rows"}`;
    document.getElementById("diReviewStep").hidden = false;

    const unknown = header.filter((h) => h && !CSV_COLUMNS.includes(h));
    document.getElementById("diReviewNote").textContent = unknown.length
        ? `These columns aren't recognised and will be ignored: ${unknown.join(", ")}.`
        : "";

    renderImportPreview();
}

/**
 * Mirrors the server's rules so problems show up before importing. The
 * server still validates every row it receives.
 */
function validateImportRows(rows) {
    const byName = (list) => new Set(list.map((item) => (item.name ?? item).toLowerCase()));
    const sets = {
        dosage_form: byName(options.dosage_forms),
        route: byName(options.routes),
        category: byName(options.categories),
        dispensing_unit: byName(options.units),
        package_unit: byName(options.units),
        preferred_supplier: byName(options.suppliers),
        product_type: byName(options.product_types),
        controlled_class: byName(options.controlled_classes),
        storage_condition: byName(options.storage_conditions)
    };
    const labels = {
        dosage_form: "Dosage form", route: "Route", category: "Category", dispensing_unit: "Dispensing unit",
        package_unit: "Package unit", preferred_supplier: "Supplier", product_type: "Product type", controlled_class: "Controlled class",
        storage_condition: "Storage"
    };
    const keyOf = (d) => [d.generic_name, d.brand_name, (d.strength || "").replace(/\s+/g, ""), d.dosage_form]
        .map((v) => (v || "").trim().toLowerCase()).join("|");

    const existing = new Set(catalog.map((drug) => keyOf({
        generic_name: drug.generic_name, brand_name: drug.brand_name, strength: drug.strength, dosage_form: drug.dosage_form_name
    })));
    const seen = new Map();

    rows.forEach((row) => {
        const d = row.data;
        const errors = [];
        const type = d.product_type || "Drug";
        const isMedicine = MEDICINE_TYPES.some((t) => t.toLowerCase() === type.toLowerCase());

        if (!d.generic_name) errors.push("Generic name is missing.");
        if (type.toLowerCase() === "drug" && !d.strength) errors.push("Strength is missing.");
        if (isMedicine && !d.dosage_form) errors.push("Dosage form is missing.");
        if (!d.dispensing_unit) errors.push("Dispensing unit is missing.");

        Object.entries(sets).forEach(([field, allowed]) => {
            if (d[field] && !allowed.has(d[field].toLowerCase())) {
                errors.push(`${labels[field]} "${d[field]}" isn't in the list.`);
            }
        });

        if (d.package_unit && !(Number(d.package_quantity) > 0)) errors.push("Package quantity is needed with a package unit.");

        ["package_quantity", "reorder_level", "max_stock", "unit_cost", "selling_price"].forEach((field) => {
            if (d[field] && (Number.isNaN(Number(d[field])) || Number(d[field]) < 0)) {
                errors.push(`${field.replace(/_/g, " ")} must be a number of 0 or more.`);
            }
        });

        if (d.generic_name) {
            const key = keyOf(d);

            if (existing.has(key)) {
                errors.push("Already in the catalog.");
            } else if (seen.has(key)) {
                errors.push(`Duplicate of line ${seen.get(key)}.`);
            } else {
                seen.set(key, row.line);
            }
        }

        row.errors = errors;
    });
}

function renderImportPreview() {
    const rows = importFile?.rows || [];
    const bad = rows.filter((r) => r.errors.length);
    const good = rows.length - bad.length;
    const problemsOnly = document.getElementById("diProblemsOnly").checked;
    const runBtn = document.getElementById("diRunImport");

    document.getElementById("diReviewStats").innerHTML = `
        <span class="di-stat"><strong>${rows.length}</strong> rows</span>
        <span class="di-stat ok"><strong>${good}</strong> ready</span>
        ${bad.length ? `<span class="di-stat bad"><strong>${bad.length}</strong> need attention</span>` : ""}
    `;

    document.getElementById("diProblemsOnly").parentElement.style.display = bad.length ? "" : "none";

    const shown = problemsOnly ? bad : rows;

    document.getElementById("diPreviewBody").innerHTML = shown.length ? shown.map((r) => {
        const d = r.data;
        const name = [d.generic_name, d.strength].filter(Boolean).join(" ") + (d.brand_name ? ` (${d.brand_name})` : "");

        return `
            <tr class="${r.errors.length ? "has-issue" : ""}">
                <td>${r.line}</td>
                <td>${escapeHtml(name || "—")}</td>
                <td>${escapeHtml(d.dosage_form || "—")}</td>
                <td>${escapeHtml(d.dispensing_unit || "—")}</td>
                <td>${r.errors.length
                    ? `<span class="di-status-bad">${escapeHtml(r.errors.join(" "))}</span>`
                    : `<span class="di-status-ok">Ready</span>`}</td>
            </tr>
        `;
    }).join("") : `<tr><td colspan="5" class="di-empty-state">No rows to show.</td></tr>`;

    runBtn.disabled = good === 0;
    runBtn.textContent = good ? `Import ${good} ${good === 1 ? "drug" : "drugs"}` : "Nothing to import";
    document.getElementById("diImportFootnote").textContent = bad.length
        ? `${bad.length} ${bad.length === 1 ? "row" : "rows"} with problems will be skipped.`
        : "All rows look good.";
}

async function runImport() {
    const runBtn = document.getElementById("diRunImport");
    const ready = importFile.rows.filter((r) => !r.errors.length);

    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="di-spinner" aria-hidden="true"></span>Importing...`;
    document.getElementById("diImportAlert").innerHTML = "";

    const result = await importDrugs(ready.map((r) => r.data));

    if (!result.success) {
        renderImportPreview();
        showAlert("diImportAlert", result.message || "Import failed. Nothing was saved.", "error");
        return;
    }

    // Server reports failures by position in what we sent (+2 for the
    // header line); map them back to the line numbers in the user's file.
    const serverFailed = (result.data.failed || []).map((f) => {
        const row = ready[f.row - 2];
        return { ...row, errors: f.errors };
    });

    importSkipped = [...importFile.rows.filter((r) => r.errors.length), ...serverFailed]
        .sort((a, b) => a.line - b.line);

    renderImportResult(result.data.created);

    if (result.data.created > 0) await loadCatalog();
}

function renderImportResult(created) {
    const skipped = importSkipped.length;
    const resultBox = document.getElementById("diImportResult");

    document.getElementById("diImportSteps").hidden = true;
    resultBox.hidden = false;

    resultBox.innerHTML = `
        <div class="di-result-head">
            <div class="di-result-card ok">${ICON_OK}<div><strong>${created}</strong><span>${created === 1 ? "drug" : "drugs"} imported</span></div></div>
            ${skipped ? `<div class="di-result-card bad">${ICON_SKIP}<div><strong>${skipped}</strong><span>${skipped === 1 ? "row" : "rows"} skipped</span></div></div>` : ""}
        </div>
        ${skipped ? `
            <div class="di-result-sub">
                <h3>Skipped rows</h3>
                <button type="button" class="di-btn" id="diDownloadSkipped">Download skipped rows to fix</button>
            </div>
            <div class="di-preview-wrap">
                <table class="di-preview-table">
                    <thead><tr><th>Line</th><th>Drug</th><th>Reason</th></tr></thead>
                    <tbody>${importSkipped.map((r) => `
                        <tr class="has-issue">
                            <td>${r.line}</td>
                            <td>${escapeHtml([r.data.generic_name, r.data.strength].filter(Boolean).join(" ") || "—")}</td>
                            <td><span class="di-status-bad">${escapeHtml(r.errors.join(" "))}</span></td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            </div>` : ""}
    `;

    document.getElementById("diDownloadSkipped")?.addEventListener("click", downloadSkippedRows);

    const runBtn = document.getElementById("diRunImport");
    runBtn.hidden = true;
    document.getElementById("diCancelImport").textContent = "Done";
    document.getElementById("diImportFootnote").innerHTML = skipped
        ? `Fix the skipped rows, then <a href="#" id="diImportAnother">import that file</a>.`
        : `<a href="#" id="diImportAnother">Import another file</a>`;

    document.getElementById("diImportAnother").addEventListener("click", (event) => {
        event.preventDefault();
        resetImport();
    });
}

function downloadSkippedRows() {
    const header = [...importFile.header, "import_error"];
    const lines = importSkipped.map((r) => [...importFile.header.map((_, i) => r.cells[i] ?? ""), r.errors.join(" ")]);
    const base = importFile.name.replace(/\.csv$/i, "");

    saveCsv([header, ...lines], `${base}-skipped.csv`);
}

function renderImportReference() {
    const chips = (list) => `<div class="di-ref-chips">${list.map((v) => `<code>${escapeHtml(v.name ?? v)}</code>`).join("")}</div>`;
    const row = (label, content) => `<div class="di-ref-row"><span>${label}</span>${content}</div>`;

    document.getElementById("diImportReference").innerHTML = [
        row("Required", `<div>generic_name, dispensing_unit; plus strength for drugs and dosage_form for drugs/vaccines</div>`),
        row("Yes / No columns", `<div>requires_prescription, is_high_alert, is_lasa &mdash; use yes/no or 1/0</div>`),
        row("Numbers", `<div>package_quantity, reorder_level, max_stock, unit_cost, selling_price &mdash; plain numbers, no &#8369; sign</div>`),
        row("dosage_form", chips(options.dosage_forms)),
        row("route", chips(options.routes)),
        row("dispensing_unit / package_unit", chips(options.units)),
        row("category", chips(options.categories)),
        row("preferred_supplier", options.suppliers.length
            ? chips(options.suppliers)
            : `<div>No suppliers yet &mdash; add them under Pharmacy &gt; Suppliers, or leave this column blank</div>`),
        row("product_type", chips(options.product_types)),
        row("controlled_class", chips(options.controlled_classes)),
        row("storage_condition", chips(options.storage_conditions))
    ].join("");
}

function downloadImportTemplate() {
    saveCsv([CSV_COLUMNS, CSV_EXAMPLE], "drug-catalog-template.csv");
}

function saveCsv(rows, filename) {
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    // The BOM makes Excel open the file as UTF-8 (the example row has a degree sign).
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

/** "Custodian: X (alternate: Y)" for a storage location, or a prompt to assign one. */
function custodianText(warehouseId, action = "Receiving into") {
    return custodianHint(options.warehouses.find((w) => Number(w.id) === Number(warehouseId)), action);
}

function openDestroyModal(lotId) {
    activeDestroyLot = allRows.find((r) => r.lot_id === lotId);

    if (!activeDestroyLot) return;

    // Disposal is the custodian's responsibility -- say who that is.
    const custodianNote = document.getElementById("diDestroyCustodian");
    const hint = custodianText(activeDestroyLot.warehouse_id, "Disposal from");
    custodianNote.className = `di-custodian-note ${hint.warn ? "warn" : ""}`;
    custodianNote.textContent = hint.text ? `${hint.text} Record a witness below.` : "";
    custodianNote.hidden = !hint.text;

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
    const d = systemNow();
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

/* ---------------------------------------------------------------
 * Drug Batch / Lot Recalls & Quarantine
 * ------------------------------------------------------------- */

let allRecalls = [];

function setupRecalls() {
    const scanBtn = document.getElementById("diRunQuarantineScanBtn");
    if (scanBtn) scanBtn.addEventListener("click", handleRunQuarantineScan);

    const logsBtn = document.getElementById("diQuarantineLogsBtn");
    if (logsBtn) logsBtn.addEventListener("click", openQuarantineLogsModal);

    const closeLogsBtn = document.getElementById("diCloseQuarantineLogsModal");
    if (closeLogsBtn) closeLogsBtn.addEventListener("click", () => {
        document.getElementById("diQuarantineLogsModalOverlay")?.classList.remove("open");
    });

    const closeReleaseBtn = document.getElementById("diCloseReleaseQuarantineModal");
    if (closeReleaseBtn) closeReleaseBtn.addEventListener("click", closeReleaseQuarantineModal);

    const cancelReleaseBtn = document.getElementById("diCancelReleaseQuarantine");
    if (cancelReleaseBtn) cancelReleaseBtn.addEventListener("click", closeReleaseQuarantineModal);

    const releaseForm = document.getElementById("diReleaseQuarantineForm");
    if (releaseForm) releaseForm.addEventListener("submit", handleReleaseQuarantineSubmit);

    const initBtn = document.getElementById("diInitiateRecallBtn");
    if (initBtn) initBtn.addEventListener("click", openInitiateRecallModal);

    const closeInitBtn = document.getElementById("diCloseInitiateRecallModal");
    if (closeInitBtn) closeInitBtn.addEventListener("click", closeInitiateRecallModal);

    const cancelInitBtn = document.getElementById("diCancelInitiateRecall");
    if (cancelInitBtn) cancelInitBtn.addEventListener("click", closeInitiateRecallModal);

    const initForm = document.getElementById("diInitiateRecallForm");
    if (initForm) initForm.addEventListener("submit", handleInitiateRecallSubmit);

    const closeDetailBtn = document.getElementById("diCloseRecallDetailModal");
    if (closeDetailBtn) closeDetailBtn.addEventListener("click", () => {
        document.getElementById("diRecallDetailModalOverlay")?.classList.remove("open");
    });

    const refreshBtn = document.getElementById("diRecallsRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", loadRecalls);

    const searchInput = document.getElementById("diRecallsSearch");
    if (searchInput) searchInput.addEventListener("input", filterAndRenderRecalls);

    const statusFilter = document.getElementById("diRecallsStatusFilter");
    if (statusFilter) statusFilter.addEventListener("change", filterAndRenderRecalls);
}

async function loadRecalls() {
    const tbody = document.getElementById("diRecallsBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="di-empty-state">Loading recalls...</td></tr>';

    const res = await fetchRecalls();
    if (!res?.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="di-empty-state">${escapeHtml(res?.message || "Failed to load recalls.")}</td></tr>`;
        return;
    }

    allRecalls = res.data || [];
    filterAndRenderRecalls();
}

function filterAndRenderRecalls() {
    const tbody = document.getElementById("diRecallsBody");
    if (!tbody) return;

    const term = (document.getElementById("diRecallsSearch")?.value || "").trim().toLowerCase();
    const status = document.getElementById("diRecallsStatusFilter")?.value || "";

    const filtered = allRecalls.filter((r) => {
        if (status && r.status !== status) return false;
        if (!term) return true;
        return (
            (r.recall_number || "").toLowerCase().includes(term) ||
            (r.drug_name || "").toLowerCase().includes(term) ||
            (r.lot_number || "").toLowerCase().includes(term) ||
            (r.reason || "").toLowerCase().includes(term) ||
            (r.fda_advisory_ref || "").toLowerCase().includes(term)
        );
    });

    const countEl = document.getElementById("diRecallsCount");
    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${allRecalls.length} recall(s)`;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="di-empty-state">No batch recalls match your criteria.</td></tr>';
        return;
    }

    const classBadge = (cls) => {
        if (cls === "Class I") return '<span class="di-badge alert" style="font-weight:700;">Class I (Life Threat)</span>';
        if (cls === "Class II") return '<span class="di-badge low" style="font-weight:600;">Class II (Serious)</span>';
        return '<span class="di-badge cold">Class III (Minor)</span>';
    };

    const statusBadge = (st) => {
        if (st === "quarantined" || st === "active") return '<span class="di-badge alert" style="font-weight:700;">QUARANTINED</span>';
        if (st === "returned_to_supplier") return '<span class="di-badge low">Returned to Supplier</span>';
        if (st === "closed") return '<span class="di-badge" style="background:#e5e7eb;color:#374151;">Closed</span>';
        return `<span class="di-badge">${escapeHtml(st)}</span>`;
    };

    tbody.innerHTML = filtered.map((r) => `
        <tr>
            <td><strong>${escapeHtml(r.recall_number)}</strong><span class="di-sub">${formatDate(r.initiated_at)}</span></td>
            <td>${classBadge(r.recall_class)}</td>
            <td>
                <strong>${escapeHtml(r.drug_name)}</strong>
                <span class="di-sub">Lot: <code style="font-weight:700;color:#b91c1c;">${escapeHtml(r.lot_number)}</code> ${r.strength ? '· ' + escapeHtml(r.strength) : ''}</span>
            </td>
            <td>
                <strong>${r.quarantined_quantity} ${escapeHtml(r.unit_name || "units")}</strong>
                <span class="di-sub">${r.quarantined_lots_count} storage lot(s) locked</span>
            </td>
            <td>
                <strong style="color:${r.affected_patients_count > 0 ? '#b91c1c' : 'inherit'}; font-size:14px;">${r.affected_patients_count}</strong>
                <span class="di-sub">${r.affected_patients_count === 1 ? 'patient' : 'patients'} dispensed</span>
            </td>
            <td>
                <span>${escapeHtml(r.reason)}</span>
                ${r.fda_advisory_ref ? `<span class="di-sub">Ref: ${escapeHtml(r.fda_advisory_ref)}</span>` : ''}
            </td>
            <td>${statusBadge(r.status)}</td>
            <td>
                <button type="button" class="di-btn small primary" data-recall-id="${r.id}">View &amp; Trace</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-recall-id]").forEach((btn) => {
        btn.addEventListener("click", () => viewRecallDetail(Number(btn.dataset.recallId)));
    });
}

function openInitiateRecallModal() {
    const overlay = document.getElementById("diInitiateRecallModalOverlay");
    if (!overlay) return;

    // Populate drugs dropdown
    const select = document.getElementById("di_recall_drug_id");
    if (select) {
        select.innerHTML = '<option value="">-- Choose Medicine --</option>';
        catalog.forEach((d) => {
            select.appendChild(new Option(d.name + (d.strength ? ' (' + d.strength + ')' : ''), d.id));
        });
    }

    document.getElementById("diInitiateRecallForm")?.reset();
    const alertEl = document.getElementById("diInitiateRecallAlert");
    if (alertEl) alertEl.innerHTML = "";

    overlay.classList.add("open");
}

function closeInitiateRecallModal() {
    document.getElementById("diInitiateRecallModalOverlay")?.classList.remove("open");
}

async function handleInitiateRecallSubmit(e) {
    e.preventDefault();
    const alertEl = document.getElementById("diInitiateRecallAlert");
    if (alertEl) alertEl.innerHTML = "";

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const data = {
        drug_id: document.getElementById("di_recall_drug_id").value,
        lot_number: document.getElementById("di_recall_lot_number").value.trim(),
        recall_class: document.getElementById("di_recall_class").value,
        fda_advisory_ref: document.getElementById("di_recall_fda_ref").value.trim(),
        reason: document.getElementById("di_recall_reason").value.trim(),
        notes: document.getElementById("di_recall_notes").value.trim()
    };

    const res = await createRecall(data);
    if (submitBtn) submitBtn.disabled = false;

    if (!res?.success) {
        if (alertEl) alertEl.innerHTML = `<div class="form-alert error" style="margin-bottom:12px;">${escapeHtml(res?.message || "Failed to initiate recall.")}</div>`;
        return;
    }

    showToast(res.message, "success");
    closeInitiateRecallModal();
    showView("recalls");
    await Promise.all([loadRecalls(), loadInventory()]);

    if (res.data?.id) {
        viewRecallDetail(res.data.id);
    }
}

async function viewRecallDetail(recallId) {
    const overlay = document.getElementById("diRecallDetailModalOverlay");
    const body = document.getElementById("diRecallDetailBody");
    if (!overlay || !body) return;

    overlay.classList.add("open");
    body.innerHTML = '<div class="di-empty-state">Loading recall details &amp; tracing affected patients...</div>';

    const res = await fetchRecallDetail(recallId);
    if (!res?.success) {
        body.innerHTML = `<div class="di-empty-state">${escapeHtml(res?.message || "Failed to load recall details.")}</div>`;
        return;
    }

    const { recall, quarantined_lots, affected_patients } = res.data;
    document.getElementById("diRecallDetailTitle").innerHTML = `Batch Recall ${escapeHtml(recall.recall_number)} <span class="di-sub" style="display:inline;font-size:13px;font-weight:normal;">(${escapeHtml(recall.recall_class)})</span>`;

    const lotRows = (quarantined_lots || []).map((l) => `
        <tr>
            <td><strong>${escapeHtml(l.warehouse_name)}</strong></td>
            <td><code>${escapeHtml(l.lot_number)}</code></td>
            <td class="num"><strong>${l.quantity_on_hand}</strong></td>
            <td>${l.expires_date ? formatDate(l.expires_date) : '—'}</td>
            <td><span class="di-badge alert">QUARANTINED</span></td>
        </tr>
    `).join("");

    const patientRows = (affected_patients || []).map((p, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(p.patient_name)}</strong><span class="di-sub">MRN: ${escapeHtml(p.patient_no || '—')}</span></td>
            <td><strong style="color:#0284c7;">${escapeHtml(p.phone_number)}</strong></td>
            <td>${p.sex || '—'} / ${p.age != null ? p.age + ' yo' : '—'}</td>
            <td class="num"><strong>${p.quantity_dispensed}</strong></td>
            <td>${formatDate(p.dispensed_date)}<span class="di-sub">${escapeHtml(p.dispense_number)}</span></td>
            <td>${escapeHtml(p.prescribing_doctor)}<span class="di-sub">Rx: ${escapeHtml(p.rx_number)}</span></td>
        </tr>
    `).join("");

    body.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:16px;">
            <div style="padding:10px 14px; background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px;">
                <span class="di-sub" style="margin:0;">Medicine</span>
                <strong style="font-size:14px;">${escapeHtml(recall.drug_name)}</strong>
            </div>
            <div style="padding:10px 14px; background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px;">
                <span class="di-sub" style="margin:0;">Recalled Lot</span>
                <strong style="font-size:14px; color:#b91c1c;">${escapeHtml(recall.lot_number)}</strong>
            </div>
            <div style="padding:10px 14px; background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px;">
                <span class="di-sub" style="margin:0;">Quarantined In-Stock</span>
                <strong style="font-size:14px;">${recall.quarantined_quantity} ${escapeHtml(recall.unit_name || 'units')}</strong>
            </div>
            <div style="padding:10px 14px; background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px;">
                <span class="di-sub" style="margin:0;">Affected Patients Traced</span>
                <strong style="font-size:14px; color:${affected_patients.length > 0 ? '#b91c1c' : 'inherit'};">${affected_patients.length}</strong>
            </div>
        </div>

        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px 14px; margin-bottom:16px; font-size:13px; color:#991b1b;">
            <strong>Reason for Recall:</strong> ${escapeHtml(recall.reason)}
            ${recall.fda_advisory_ref ? `<div style="margin-top:4px;"><strong>FDA Reference:</strong> ${escapeHtml(recall.fda_advisory_ref)}</div>` : ''}
            ${recall.notes ? `<div style="margin-top:4px;"><strong>Hospital Action Notes:</strong> ${escapeHtml(recall.notes)}</div>` : ''}
        </div>

        <!-- Quarantined Lots Table -->
        <h3 style="font-size:14px; margin:0 0 8px;">1. Quarantined Storage Lots (Locked Across All Locations)</h3>
        <div class="di-table-wrap" style="margin-bottom:18px;">
            <table class="di-table">
                <thead>
                    <tr><th>Storage Location</th><th>Lot Number</th><th class="num">Quarantined Qty</th><th>Expiry Date</th><th>Status</th></tr>
                </thead>
                <tbody>${lotRows || '<tr><td colspan="5" class="di-empty-state">No on-hand stock found for this lot.</td></tr>'}</tbody>
            </table>
        </div>

        <!-- Affected Patients Traceability -->
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">
            <h3 style="font-size:14px; margin:0;">2. Patient Traceability &amp; Notification List (${affected_patients.length})</h3>
            ${affected_patients.length > 0 ? `<button type="button" class="di-btn small" id="diPrintTraceListBtn">&#128424; Print Patient Call List</button>` : ''}
        </div>
        <div class="di-table-wrap" style="max-height:260px; overflow-y:auto; margin-bottom:18px;">
            <table class="di-table">
                <thead>
                    <tr><th>#</th><th>Patient Name &amp; MRN</th><th>Phone Number</th><th>Demographics</th><th class="num">Qty Dispensed</th><th>Dispense Date</th><th>Prescriber</th></tr>
                </thead>
                <tbody>${patientRows || '<tr><td colspan="7" class="di-empty-state" style="color:#15803d;">&#10003; No patients were dispensed medication from this recalled lot.</td></tr>'}</tbody>
            </table>
        </div>

        <!-- Status Management Action Footer -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding-top:14px; border-top:1px solid var(--border-color);">
            <div style="font-size:12.5px; color:var(--text-muted);">
                Current Status: <strong>${escapeHtml(recall.status)}</strong> · Initiated by ${escapeHtml(recall.initiated_by_name || 'Staff')} on ${formatDate(recall.initiated_at)}
            </div>
            <div style="display:flex; gap:8px;">
                ${recall.status !== 'returned_to_supplier' && recall.status !== 'closed' ? `
                    <button type="button" class="di-btn small" id="diMarkReturnedBtn">Mark Returned to Supplier</button>
                ` : ''}
                ${recall.status !== 'closed' ? `
                    <button type="button" class="di-btn small primary" id="diCloseRecallBtn">Close Recall</button>
                ` : `<span class="di-badge" style="background:#dcfce7;color:#166534;">Closed on ${formatDate(recall.closed_at)}</span>`}
            </div>
        </div>
    `;

    const printBtn = document.getElementById("diPrintTraceListBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => printPatientTraceList(recall, affected_patients));
    }

    const returnBtn = document.getElementById("diMarkReturnedBtn");
    if (returnBtn) {
        returnBtn.addEventListener("click", async () => {
            if (!confirm(`Confirm marking remaining ${recall.quarantined_quantity} units of lot ${recall.lot_number} as Returned to Supplier?`)) return;
            const upRes = await updateRecallStatus(recall.id, "returned_to_supplier", "Stock returned to manufacturer / distributor.");
            if (upRes?.success) {
                showToast(upRes.message, "success");
                viewRecallDetail(recall.id);
                loadRecalls();
            } else {
                showToast(upRes?.message || "Failed to update status", "error");
            }
        });
    }

    const closeBtn = document.getElementById("diCloseRecallBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", async () => {
            const note = prompt("Enter closing resolution note:", "All quarantined units reconciled and affected patients notified.");
            if (note === null) return;
            const upRes = await updateRecallStatus(recall.id, "closed", note);
            if (upRes?.success) {
                showToast(upRes.message, "success");
                viewRecallDetail(recall.id);
                loadRecalls();
            } else {
                showToast(upRes?.message || "Failed to close recall", "error");
            }
        });
    }
}

function printPatientTraceList(recall, patients) {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
        showToast("Pop-up blocked. Please allow pop-ups to print the patient call list.", "error");
        return;
    }

    const rows = patients.map((p, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(p.patient_name)}</strong> (MRN: ${escapeHtml(p.patient_no || '—')})</td>
            <td><strong>${escapeHtml(p.phone_number)}</strong></td>
            <td>${escapeHtml(p.dispensed_date)}</td>
            <td>${p.quantity_dispensed}</td>
            <td>${escapeHtml(p.prescribing_doctor)}</td>
            <td style="width:140px; border-bottom:1px solid #000;">&nbsp;</td>
        </tr>
    `).join("");

    win.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Patient Recall Call List - ${escapeHtml(recall.recall_number)}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
        h1 { margin: 0 0 4px; font-size: 18px; color: #b91c1c; }
        .meta { margin-bottom: 16px; font-size: 12px; border-bottom: 2px solid #ccc; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; }
    </style>
</head>
<body>
    <h1>DRUG BATCH RECALL - PATIENT NOTIFICATION LIST</h1>
    <div class="meta">
        <strong>Recall #:</strong> ${escapeHtml(recall.recall_number)} (${escapeHtml(recall.recall_class)})<br>
        <strong>Medicine:</strong> ${escapeHtml(recall.drug_name)} · <strong>Lot Number:</strong> ${escapeHtml(recall.lot_number)}<br>
        <strong>Reason:</strong> ${escapeHtml(recall.reason)}<br>
        <strong>Total Traced Patients:</strong> ${patients.length}
    </div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Patient Name</th>
                <th>Phone Number</th>
                <th>Dispensed Date</th>
                <th>Qty</th>
                <th>Prescriber</th>
                <th>Call Result / Notes</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
    win.document.close();
}

/* ---------------------------------------------------------------
 * Near-Expiry Automated Quarantine Lock (<60 Days) Logic
 * ------------------------------------------------------------- */

let currentQuarantineData = null;

async function loadQuarantineData() {
    const tbody = document.getElementById("diQuarantineLotsBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="di-empty-state">Scanning for near-expiry quarantined lots...</td></tr>';

    const res = await fetchQuarantineData();
    if (!res?.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="di-empty-state">${escapeHtml(res?.message || "Failed to load quarantine data.")}</td></tr>`;
        return;
    }

    currentQuarantineData = res.data;
    const { stats, lots } = res.data;

    const elLocked = document.getElementById("diStatLockedLots");
    if (elLocked) elLocked.textContent = stats.total_quarantined_lots;
    const elExpired = document.getElementById("diStatExpired");
    if (elExpired) elExpired.textContent = stats.expired_count;
    const elCritical = document.getElementById("diStatCritical");
    if (elCritical) elCritical.textContent = stats.under_30_days_count;
    const elWarning = document.getElementById("diStatWarning");
    if (elWarning) elWarning.textContent = stats.under_60_days_count;
    const elQty = document.getElementById("diStatQuarantinedQty");
    if (elQty) elQty.textContent = stats.total_quantity_quarantined;

    if (!lots || !lots.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="di-empty-state" style="color:#15803d;">&#10003; No lots are currently locked under near-expiry quarantine. All active stock expires in &gt; 60 days.</td></tr>';
        return;
    }

    const urgencyBadge = (lot) => {
        if (lot.days_until_expiry < 0) {
            return '<span class="di-badge alert" style="font-weight:700;">EXPIRED (' + Math.abs(lot.days_until_expiry) + 'd ago)</span>';
        }
        if (lot.days_until_expiry <= 30) {
            return '<span class="di-badge alert" style="background:#ffedd5;color:#c2410c;font-weight:700;">CRITICAL (' + lot.days_until_expiry + 'd left)</span>';
        }
        return '<span class="di-badge low" style="font-weight:600;">&lt;60d WARNING (' + lot.days_until_expiry + 'd left)</span>';
    };

    tbody.innerHTML = lots.map((l) => `
        <tr>
            <td>
                <strong>${escapeHtml(l.drug_name)}</strong>
                <span class="di-sub">${escapeHtml([l.generic_name, l.strength].filter(Boolean).join(" · "))}</span>
            </td>
            <td><strong>${escapeHtml(l.warehouse_name)}</strong></td>
            <td><code>${escapeHtml(l.lot_number)}</code></td>
            <td><strong>${formatDate(l.expires_date)}</strong></td>
            <td>${urgencyBadge(l)}</td>
            <td class="num"><strong style="color:#b91c1c;">${l.quantity_on_hand}</strong> ${escapeHtml(l.unit_name)}</td>
            <td>
                <span class="di-badge alert" style="font-size:10.5px;">QUARANTINED LOCK</span>
                <span class="di-sub">${escapeHtml(l.quarantine_reason)}</span>
            </td>
            <td>
                <button type="button" class="di-btn small" data-release-lot-id="${l.id}">Release Override</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-release-lot-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const lotId = Number(btn.dataset.releaseLotId);
            const lot = (currentQuarantineData?.lots || []).find((x) => x.id === lotId);
            if (lot) openReleaseQuarantineModal(lot);
        });
    });
}

async function handleRunQuarantineScan() {
    const btn = document.getElementById("diRunQuarantineScanBtn");
    if (btn) btn.disabled = true;

    showToast("Running near-expiry automated quarantine scan (<60 days)...", "info");
    const res = await runQuarantineScan(60);
    if (btn) btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Quarantine scan failed.", "error");
        return;
    }

    showToast(res.message, res.data?.lots_quarantined_count > 0 ? "warning" : "success");
    await Promise.all([loadQuarantineData(), loadInventory(), loadCatalog()]);
}

function openReleaseQuarantineModal(lot) {
    const overlay = document.getElementById("diReleaseQuarantineModalOverlay");
    const summary = document.getElementById("diReleaseLotSummary");
    const idInput = document.getElementById("di_release_lot_id");
    const reasonInput = document.getElementById("di_release_reason");
    if (!overlay || !summary || !idInput) return;

    idInput.value = lot.id;
    if (reasonInput) reasonInput.value = "";

    summary.innerHTML = `
        <div><strong>Medicine:</strong> ${escapeHtml(lot.drug_name)} (${escapeHtml(lot.strength || '')})</div>
        <div><strong>Lot Number:</strong> <code>${escapeHtml(lot.lot_number)}</code> · <strong>Location:</strong> ${escapeHtml(lot.warehouse_name)}</div>
        <div><strong>Expiry Date:</strong> ${formatDate(lot.expires_date)} (${lot.days_until_expiry} day(s) remaining)</div>
        <div><strong>Quantity Locked:</strong> ${lot.quantity_on_hand} ${escapeHtml(lot.unit_name)}</div>
    `;

    overlay.classList.add("open");
}

function closeReleaseQuarantineModal() {
    document.getElementById("diReleaseQuarantineModalOverlay")?.classList.remove("open");
}

async function handleReleaseQuarantineSubmit(e) {
    e.preventDefault();
    const lotId = Number(document.getElementById("di_release_lot_id")?.value);
    const reason = (document.getElementById("di_release_reason")?.value || "").trim();
    if (!lotId || !reason) {
        showToast("Please provide a documented clinical justification.", "error");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const res = await releaseQuarantine(lotId, reason);
    if (submitBtn) submitBtn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Failed to release quarantine.", "error");
        return;
    }

    showToast(res.message, "success");
    closeReleaseQuarantineModal();
    await Promise.all([loadQuarantineData(), loadInventory(), loadCatalog()]);
}

async function openQuarantineLogsModal() {
    const overlay = document.getElementById("diQuarantineLogsModalOverlay");
    const tbody = document.getElementById("diQuarantineLogsBody");
    if (!overlay || !tbody) return;

    overlay.classList.add("open");
    tbody.innerHTML = '<tr><td colspan="7" class="di-empty-state">Loading cron logs...</td></tr>';

    const res = await fetchQuarantineLogs();
    if (!res?.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="di-empty-state">${escapeHtml(res?.message || "Failed to load logs.")}</td></tr>`;
        return;
    }

    const logs = res.data || [];
    if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="di-empty-state">No execution logs recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map((l) => `
        <tr>
            <td><strong>${formatDate(l.executed_at)}</strong><span class="di-sub">${String(l.executed_at).slice(11, 19)}</span></td>
            <td><code style="font-weight:600;">${escapeHtml(l.execution_type)}</code></td>
            <td>&lt; ${l.threshold_days} days</td>
            <td class="num"><strong style="color:${l.lots_quarantined_count > 0 ? '#b91c1c' : 'inherit'};">${l.lots_quarantined_count}</strong></td>
            <td class="num"><strong>${l.total_quantity_quarantined}</strong></td>
            <td>${escapeHtml(l.executed_by_name)}</td>
            <td><span class="di-sub" style="font-size:12px;">${escapeHtml(l.summary_notes || '—')}</span></td>
        </tr>
    `).join("");
}
