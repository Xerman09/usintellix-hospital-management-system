import {
    fetchDrugInventory, fetchDrugInventoryOptions, fetchDrugCatalog, fetchDrug,
    createDrug, updateDrug, deleteDrug, receiveStock, importDrugs, transferDrugLot, destroyDrugLot,
    fetchRecalls, fetchRecallDetail, createRecall, updateRecallStatus,
    fetchQuarantineData, runQuarantineScan, releaseQuarantine, fetchQuarantineLogs,
    searchLotsForRecall, traceLotRecall, quarantineLotStockImmediate, createLotRecallRecord,
    updatePatientOutreachStatus, fetchLotRecallsList,
    fetchCompoundingRecords, fetchCompoundingDetail, fetchCompoundingFormulas,
    createCompoundingRecord, inspectCompoundingRecord, fetchCompoundingLabel,
    fetchNarcoticsVaultStats, fetchNarcoticsVaultItems, fetchNarcoticsVaultMovements,
    recordNarcoticsVaultMovement, verifyWitnessCredentials, setSecurityPin,
    fetchShiftAudits, recordShiftAudit
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
    setupCompounding();
    setupNarcoticsVault();

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
        if (view === "recalls") { loadQuarantineData(); loadRecalls(); populateLotTraceAutocomplete(); }
    }
    const compoundingPanel = document.getElementById("diCompoundingPanel");
    if (compoundingPanel) {
        compoundingPanel.classList.toggle("active", view === "compounding");
        if (view === "compounding") { loadCompoundingRecords(); loadMasterFormulas(); }
    }
    const narcoticsPanel = document.getElementById("diNarcoticsVaultPanel");
    if (narcoticsPanel) {
        narcoticsPanel.classList.toggle("active", view === "narcotics");
        if (view === "narcotics") {
            loadNarcoticsStats();
            loadNarcoticsItems();
            loadNarcoticsMovements();
            loadShiftAudits();
        }
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

    // Lot Recall Trace Engine
    const traceBtn = document.getElementById("diTraceLotBtn");
    if (traceBtn) traceBtn.addEventListener("click", () => handleTraceLot());

    const traceInput = document.getElementById("diTraceLotInput");
    if (traceInput) {
        traceInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleTraceLot();
            }
        });
    }

    const clearTraceBtn = document.getElementById("diClearTraceBtn");
    if (clearTraceBtn) clearTraceBtn.addEventListener("click", clearLotTrace);

    const closeOutreachBtn = document.getElementById("diCloseOutreachModal");
    if (closeOutreachBtn) closeOutreachBtn.addEventListener("click", closeOutreachModal);

    const cancelOutreachBtn = document.getElementById("diCancelOutreach");
    if (cancelOutreachBtn) cancelOutreachBtn.addEventListener("click", closeOutreachModal);

    const outreachForm = document.getElementById("diOutreachForm");
    if (outreachForm) outreachForm.addEventListener("submit", handleOutreachSubmit);
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
 * Lot Recall Trace Engine & Patient Outreach (pharmacy_lot_recalls)
 * ------------------------------------------------------------- */

let lastTracedLotData = null;

async function populateLotTraceAutocomplete() {
    const datalist = document.getElementById("diTraceLotsDatalist");
    if (!datalist) return;

    try {
        const res = await searchLotsForRecall("", 50);
        if (res?.success && Array.isArray(res.data)) {
            datalist.innerHTML = res.data.map((l) =>
                `<option value="${escapeHtml(l.lot_number)}">${escapeHtml(l.drug_name)} (${l.total_on_hand} on hand${l.is_quarantined ? ' - Quarantined' : ''})</option>`
            ).join("");
        }
    } catch (e) {
        console.error("Failed to populate trace datalist", e);
    }
}

async function handleTraceLot(lotOverride = null) {
    const input = document.getElementById("diTraceLotInput");
    const lotNumber = (lotOverride || input?.value || "").trim();

    if (!lotNumber) {
        showToast("Please enter or select a lot number to trace.", "warning");
        input?.focus();
        return;
    }

    if (input) input.value = lotNumber;

    const container = document.getElementById("diTraceResultsContainer");
    if (!container) return;

    container.style.display = "block";
    container.innerHTML = `
        <div style="padding:24px; text-align:center; color:var(--text-muted);">
            <div class="di-spinner" style="margin:0 auto 12px; width:28px; height:28px; border:3px solid #ccc; border-top-color:#b91c1c; border-radius:50%; animation:di-spin 0.8s linear infinite;"></div>
            Tracing hospital stock and patient distribution across all facilities for lot <strong>${escapeHtml(lotNumber)}</strong>...
        </div>
    `;

    try {
        const res = await traceLotRecall(lotNumber);
        if (!res?.success) {
            container.innerHTML = `
                <div class="di-empty-state" style="color:#b91c1c; padding:20px; text-align:center;">
                    &#9888; ${escapeHtml(res?.message || "Lot number not found in hospital inventory or dispensing records.")}
                </div>
            `;
            return;
        }

        lastTracedLotData = res.data;
        renderLotTraceResults(res.data);
    } catch (err) {
        container.innerHTML = `
            <div class="di-empty-state" style="color:#b91c1c; padding:20px;">
                Failed to communicate with recall trace engine: ${escapeHtml(err.message)}
            </div>
        `;
    }
}

function clearLotTrace() {
    const input = document.getElementById("diTraceLotInput");
    if (input) input.value = "";
    const container = document.getElementById("diTraceResultsContainer");
    if (container) {
        container.style.display = "none";
        container.innerHTML = "";
    }
    lastTracedLotData = null;
}

function renderLotTraceResults(data) {
    const container = document.getElementById("diTraceResultsContainer");
    if (!container) return;

    const { lot_number, drug, hospital_stock, patient_distribution, active_recall } = data;
    const { total_remaining_units, total_quarantined_units, unquarantined_units, breakdown } = hospital_stock;
    const { total_dispensed_units, unique_patients_count, contacted_count, pending_outreach_count, patients } = patient_distribution;

    const hasUnquarantined = unquarantined_units > 0;

    // Stock rows
    const stockRows = breakdown.length ? breakdown.map((s) => `
        <tr>
            <td><strong>${escapeHtml(s.warehouse_name)}</strong> <span class="di-sub">(${escapeHtml(s.warehouse_code || 'WH-' + s.warehouse_id)})</span></td>
            <td><code style="font-weight:700;">${escapeHtml(s.lot_number)}</code></td>
            <td>${s.expires_date ? s.expires_date : '—'}</td>
            <td>
                ${s.days_to_expiry !== null ? (
                    s.days_to_expiry <= 0 ? '<span class="di-badge alert" style="font-size:10px;">EXPIRED</span>' :
                    s.days_to_expiry <= 30 ? `<span class="di-badge alert" style="font-size:10px;">${s.days_to_expiry}d left</span>` :
                    s.days_to_expiry <= 60 ? `<span class="di-badge low" style="font-size:10px;">${s.days_to_expiry}d left</span>` :
                    `<span class="di-badge" style="font-size:10px;">${s.days_to_expiry}d left</span>`
                ) : '—'}
            </td>
            <td class="num"><strong style="font-size:14px;">${s.quantity_on_hand}</strong></td>
            <td>
                ${s.is_quarantined
                    ? `<span class="di-badge alert" style="font-weight:700;">QUARANTINED LOCK</span><div class="di-sub" style="font-size:10.5px;">${escapeHtml(s.quarantine_reason || 'Locked')}</div>`
                    : '<span class="di-badge ok" style="font-weight:600;">ACTIVE IN STOCK</span>'}
            </td>
        </tr>
    `).join("") : '<tr><td colspan="6" class="di-empty-state">No on-hand units remaining in hospital storage locations.</td></tr>';

    // Status badge mapper
    const outreachBadge = (st) => {
        switch (st) {
            case 'contacted_informed':
                return '<span class="di-badge ok" style="font-weight:600;">&#10003; Contacted &amp; Informed</span>';
            case 'voicemail_left':
                return '<span class="di-badge cold">Voicemail / Message Left</span>';
            case 'product_returned':
                return '<span class="di-badge" style="background:#e0e7ff; color:#3730a3; font-weight:600;">&#128230; Product Returned</span>';
            case 'replacement_dispensed':
                return '<span class="di-badge ok" style="background:#dcfce7; color:#166534; font-weight:600;">Replacement Dispensed</span>';
            case 'adverse_event':
                return '<span class="di-badge alert" style="font-weight:700;">&#9888; Adverse Event Reported</span>';
            case 'unreachable':
                return '<span class="di-badge" style="background:#fee2e2; color:#991b1b;">Unreachable</span>';
            case 'pending':
            default:
                return '<span class="di-badge low" style="font-weight:600;">Pending Outreach</span>';
        }
    };

    // Patient rows
    const patientRows = patients.length ? patients.map((p, idx) => `
        <tr data-patient-idx="${idx}">
            <td>
                <strong>${escapeHtml(p.patient_name)}</strong>
                <div class="di-sub">MRN: <strong>${escapeHtml(p.patient_no)}</strong> · ${p.sex ? escapeHtml(p.sex) : ''}${p.age !== null ? `, ${p.age} y/o` : ''}</div>
            </td>
            <td>
                ${p.primary_phone !== 'None Recorded'
                    ? `<a href="tel:${escapeHtml(p.primary_phone)}" style="font-weight:700; color:#1d4ed8; text-decoration:underline;">&#128222; ${escapeHtml(p.primary_phone)}</a>`
                    : '<span style="color:var(--text-muted);">None Recorded</span>'}
                ${p.mobile_phone && p.mobile_phone !== p.primary_phone ? `<div class="di-sub">Mobile: ${escapeHtml(p.mobile_phone)}</div>` : ''}
                ${p.home_phone && p.home_phone !== p.primary_phone ? `<div class="di-sub">Home: ${escapeHtml(p.home_phone)}</div>` : ''}
                ${p.emergency_contact ? `<div class="di-sub" style="color:#b91c1c;">Emerg: ${escapeHtml(p.emergency_contact)}</div>` : ''}
            </td>
            <td>
                <span class="di-badge" style="font-size:10.5px;">${escapeHtml(p.dispense_source)}</span>
                <div class="di-sub">${p.dispensed_date || '—'} · Ref: ${escapeHtml(p.reference_number || '—')}</div>
            </td>
            <td class="num"><strong style="font-size:14px; color:#b91c1c;">${p.quantity_dispensed}</strong></td>
            <td>
                <div>Dr. ${escapeHtml(p.prescribing_doctor)}</div>
                <div class="di-sub">Staff: ${escapeHtml(p.dispensing_staff)}</div>
            </td>
            <td>
                <div>${outreachBadge(p.outreach_status)}</div>
                ${p.last_contact_attempt_at ? `<div class="di-sub" style="font-size:10px;">Last Attempt: ${formatDate(p.last_contact_attempt_at)}</div>` : ''}
                ${p.patient_response_notes ? `<div class="di-sub" style="font-style:italic; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${escapeHtml(p.patient_response_notes)}"</div>` : ''}
            </td>
            <td>
                <button type="button" class="di-btn small di-log-outreach-btn" data-patient-idx="${idx}" style="font-size:11px;">
                    &#9998; Log Call
                </button>
            </td>
        </tr>
    `).join("") : '<tr><td colspan="7" class="di-empty-state" style="color:#15803d;">&#10003; No patient dispensing or administration records found for this lot.</td></tr>';

    container.innerHTML = `
        <div style="background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px; padding:16px; margin-bottom:16px;">
            <!-- Drug & Lot Header Banner -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                <div>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span class="di-badge alert" style="font-size:13px; font-weight:800; padding:4px 10px;">LOT #${escapeHtml(lot_number)}</span>
                        <h3 style="margin:0; font-size:18px; color:var(--text-primary);">${escapeHtml(drug.drug_name)}</h3>
                    </div>
                    <div style="margin-top:4px; font-size:13px; color:var(--text-muted);">
                        Generic: <strong>${escapeHtml(drug.generic_name)}</strong> · Strength: <strong>${escapeHtml(drug.strength)}</strong> · Supplier: ${escapeHtml(drug.primary_supplier_name || '—')}
                    </div>
                    ${activeRecall ? `
                        <div style="margin-top:6px; display:inline-block; background:#fee2e2; border:1px solid #f87171; border-radius:4px; padding:3px 8px; font-size:11.5px; color:#991b1b; font-weight:700;">
                            &#9888; Active Recall: ${escapeHtml(activeRecall.recall_reference)} (${escapeHtml(activeRecall.recall_class)}) — ${escapeHtml(activeRecall.recall_reason)}
                        </div>
                    ` : ''}
                </div>

                <!-- Trace Top Actions -->
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    ${hasUnquarantined ? `
                        <button type="button" class="di-btn primary" id="diQuarantineAllStockBtn" style="background:#dc2626; border-color:#dc2626; font-weight:700;">
                            &#128274; Quarantine Remaining Stock (${unquarantined_units} units)
                        </button>
                    ` : `
                        <span class="di-badge alert" style="font-size:12px; font-weight:700; padding:6px 12px;">
                            &#128274; ALL REMAINING STOCK QUARANTINED
                        </span>
                    `}
                    <button type="button" class="di-btn" id="diExportOutreachCsvBtn">
                        &#128190; Export Outreach CSV
                    </button>
                    <button type="button" class="di-btn" id="diPrintOutreachSheetBtn">
                        &#128438; Print Call Sheet
                    </button>
                    ${!activeRecall ? `
                        <button type="button" class="di-btn" id="diInitFormalRecallBtn" style="border-color:#b91c1c; color:#b91c1c; font-weight:600;">
                            &#9888; Initiate Formal Recall
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Trace Summary KPI Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin-bottom:16px;">
                <div style="padding:10px 14px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px;">
                    <span class="di-sub" style="margin:0;">Remaining Hospital Stock</span>
                    <strong style="font-size:18px; color:${hasUnquarantined ? '#b91c1c' : '#15803d'};">${total_remaining_units}</strong>
                    <div class="di-sub" style="font-size:10.5px;">across ${hospital_stock.warehouses_count} storage location(s)</div>
                </div>
                <div style="padding:10px 14px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px;">
                    <span class="di-sub" style="margin:0;">Total Patients Dispensed</span>
                    <strong style="font-size:18px; color:#1d4ed8;">${unique_patients_count}</strong>
                    <div class="di-sub" style="font-size:10.5px;">require clinical outreach</div>
                </div>
                <div style="padding:10px 14px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px;">
                    <span class="di-sub" style="margin:0;">Total Doses / Units Dispensed</span>
                    <strong style="font-size:18px;">${total_dispensed_units}</strong>
                    <div class="di-sub" style="font-size:10.5px;">given to patients</div>
                </div>
                <div style="padding:10px 14px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px;">
                    <span class="di-sub" style="margin:0;">Outreach Progress</span>
                    <strong style="font-size:18px; color:${pending_outreach_count === 0 && unique_patients_count > 0 ? '#15803d' : '#ea580c'};">
                        ${contacted_count} / ${unique_patients_count}
                    </strong>
                    <div class="di-sub" style="font-size:10.5px;">${pending_outreach_count} pending calls</div>
                </div>
            </div>

            <!-- Section 1A: Remaining Hospital Stock Breakdown -->
            <div style="margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h4 style="margin:0; font-size:14px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        <span>&#127973;</span> Hospital On-Hand Stock by Storage Location
                    </h4>
                    ${hasUnquarantined ? `
                        <span class="di-badge alert" style="font-size:11px;">⚠️ Active dispensing stock remains!</span>
                    ` : ''}
                </div>
                <div class="di-table-wrap" style="max-height:180px; overflow-y:auto; background:var(--bg-surface);">
                    <table class="di-table">
                        <thead>
                            <tr>
                                <th>Warehouse / Storage Location</th>
                                <th>Lot Number</th>
                                <th>Expiry Date</th>
                                <th>Shelf Life</th>
                                <th class="num">On-Hand Qty</th>
                                <th>Quarantine Status</th>
                            </tr>
                        </thead>
                        <tbody>${stockRows}</tbody>
                    </table>
                </div>
            </div>

            <!-- Section 1B: Complete Patient Distribution History & Outreach -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                    <h4 style="margin:0; font-size:14px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        <span>&#128101;</span> Patient Distribution History &amp; Outreach Roster (${unique_patients_count} Patients)
                    </h4>
                    <span class="di-sub">Instant telephone outreach directory for patient safety notification</span>
                </div>
                <div class="di-table-wrap" style="max-height:360px; overflow-y:auto; background:var(--bg-surface);">
                    <table class="di-table">
                        <thead>
                            <tr>
                                <th>Patient Name &amp; MRN</th>
                                <th>Outreach Phone Number(s)</th>
                                <th>Dispense Details</th>
                                <th class="num">Qty Dispensed</th>
                                <th>Prescriber / Staff</th>
                                <th>Outreach Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>${patientRows}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Bind event listeners for actions
    const quarantineAllBtn = document.getElementById("diQuarantineAllStockBtn");
    if (quarantineAllBtn) {
        quarantineAllBtn.addEventListener("click", () => handleQuarantineStockForTracedLot(lot_number));
    }

    const exportCsvBtn = document.getElementById("diExportOutreachCsvBtn");
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener("click", () => {
            window.location.href = `/api/drug-inventory/recall-trace/export-csv?lot_number=${encodeURIComponent(lot_number)}`;
        });
    }

    const printSheetBtn = document.getElementById("diPrintOutreachSheetBtn");
    if (printSheetBtn) {
        printSheetBtn.addEventListener("click", () => printRecallOutreachSheet(data));
    }

    const initRecallBtn = document.getElementById("diInitFormalRecallBtn");
    if (initRecallBtn) {
        initRecallBtn.addEventListener("click", () => {
            openInitiateRecallModal();
            const lotInput = document.getElementById("di_recall_lot_number");
            if (lotInput) lotInput.value = lot_number;
            const drugSelect = document.getElementById("di_recall_drug_id");
            if (drugSelect && drug.drug_id) drugSelect.value = drug.drug_id;
        });
    }

    container.querySelectorAll(".di-log-outreach-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-patient-idx"), 10);
            openOutreachModal(patients[idx], lot_number);
        });
    });
}

async function handleQuarantineStockForTracedLot(lotNumber) {
    if (!confirm(`Are you sure you want to immediately lock and quarantine all remaining on-hand stock for lot '${lotNumber}' across all hospital locations? This will instantly prevent dispensing.`)) {
        return;
    }

    try {
        const res = await quarantineLotStockImmediate(lotNumber, "Manufacturer Recall Quarantine Lock");
        if (res?.success) {
            showToast(res.message, "success");
            handleTraceLot(lotNumber);
            loadQuarantineData();
        } else {
            showToast(res?.message || "Failed to quarantine lot stock.", "error");
        }
    } catch (e) {
        showToast("Error quarantining lot stock: " + e.message, "error");
    }
}

function openOutreachModal(patient, lotNumber) {
    const summary = document.getElementById("diOutreachPatientSummary");
    if (summary) {
        summary.innerHTML = `
            <div style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
                ${escapeHtml(patient.patient_name)} (MRN: ${escapeHtml(patient.patient_no)})
            </div>
            <div style="font-size:12.5px; color:var(--text-muted);">
                Recalled Lot: <strong>${escapeHtml(lotNumber)}</strong> · Dispensed Qty: <strong>${patient.quantity_dispensed}</strong> on ${patient.dispensed_date || '—'}<br>
                Address: ${escapeHtml(patient.address)}
            </div>
        `;
    }

    document.getElementById("di_outreach_id").value = patient.outreach_id || "";
    document.getElementById("di_outreach_lot_number").value = lotNumber;
    document.getElementById("di_outreach_status").value = patient.outreach_status || "contacted_informed";
    document.getElementById("di_outreach_phone").value = patient.primary_phone !== "None Recorded" ? patient.primary_phone : "";
    document.getElementById("di_outreach_returned_units").value = patient.units_returned || 0;
    document.getElementById("di_outreach_replacement_issued").checked = !!patient.replacement_issued;
    document.getElementById("di_outreach_notes").value = patient.patient_response_notes || "";

    document.getElementById("diOutreachModalOverlay")?.classList.add("open");
}

function closeOutreachModal() {
    document.getElementById("diOutreachModalOverlay")?.classList.remove("open");
}

async function handleOutreachSubmit(e) {
    e.preventDefault();
    const outreachId = parseInt(document.getElementById("di_outreach_id").value, 10);
    const lotNumber = document.getElementById("di_outreach_lot_number").value;

    const payload = {
        outreach_status: document.getElementById("di_outreach_status").value,
        contacted_phone: document.getElementById("di_outreach_phone").value.trim(),
        units_returned: parseFloat(document.getElementById("di_outreach_returned_units").value) || 0,
        replacement_issued: document.getElementById("di_outreach_replacement_issued").checked,
        patient_response_notes: document.getElementById("di_outreach_notes").value.trim()
    };

    if (!outreachId) {
        showToast("Please initiate a formal recall record first to track persistent outreach tasks across sessions.", "warning");
        closeOutreachModal();
        return;
    }

    try {
        const res = await updatePatientOutreachStatus(outreachId, payload);
        if (res?.success) {
            showToast(res.message, "success");
            closeOutreachModal();
            if (lotNumber) handleTraceLot(lotNumber);
        } else {
            showToast(res?.message || "Failed to save outreach log.", "error");
        }
    } catch (err) {
        showToast("Error updating outreach: " + err.message, "error");
    }
}

function printRecallOutreachSheet(traceData) {
    const { lot_number, drug, hospital_stock, patient_distribution, active_recall } = traceData;
    const { patients } = patient_distribution;

    const win = window.open("", "_blank");
    if (!win) {
        showToast("Popup blocked. Please allow popups to print outreach call sheet.", "warning");
        return;
    }

    const rows = patients.map((p, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>
                <strong>${escapeHtml(p.patient_name)}</strong><br>
                <small>MRN: ${escapeHtml(p.patient_no)} · ${p.sex ? escapeHtml(p.sex) : ''}${p.age !== null ? `, ${p.age} y/o` : ''}</small><br>
                <small>${escapeHtml(p.address)}</small>
            </td>
            <td>
                <strong>${escapeHtml(p.primary_phone)}</strong>
                ${p.emergency_contact ? `<br><small style="color:#b91c1c;">Emerg: ${escapeHtml(p.emergency_contact)}</small>` : ''}
            </td>
            <td>${p.dispensed_date || '—'}<br><small>${escapeHtml(p.dispense_source)}</small></td>
            <td style="text-align:right;"><strong>${p.quantity_dispensed}</strong></td>
            <td>Dr. ${escapeHtml(p.prescribing_doctor)}</td>
            <td style="text-align:center; font-weight:700;">${escapeHtml(p.outreach_status.replace('_', ' ').toUpperCase())}</td>
            <td style="width:160px; border-bottom:1px solid #000;">&nbsp;</td>
        </tr>
    `).join("");

    win.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Patient Recall Outreach Call Sheet - Lot ${escapeHtml(lot_number)}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11.5px; margin: 20px; color: #111; }
        h1 { margin: 0 0 2px; font-size: 17px; color: #b91c1c; }
        .meta-box { border: 1px solid #ccc; background: #fafafa; padding: 10px 14px; margin-bottom: 14px; border-radius: 4px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #bbb; padding: 5px 7px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.5px; }
        @media print {
            body { margin: 10px; }
            button { display: none; }
        }
    </style>
</head>
<body>
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
            <h1>HOSPITAL PHARMACY - DRUG BATCH RECALL OUTREACH ROSTER</h1>
            <div style="font-size:12px; color:#555;">Official Patient Safety Notification Directory</div>
        </div>
        <div style="text-align:right; font-size:11px;">
            Printed on: <strong>${new Date().toLocaleString()}</strong><br>
            Total Dispensed Patients: <strong>${patients.length}</strong>
        </div>
    </div>

    <div class="meta-box">
        <div class="grid">
            <div>
                <strong>Medicine:</strong> ${escapeHtml(drug.drug_name)}<br>
                <strong>Generic / Strength:</strong> ${escapeHtml(drug.generic_name)} (${escapeHtml(drug.strength)})<br>
                <strong>Recalled Lot Number:</strong> <span style="font-weight:700; color:#b91c1c;">${escapeHtml(lot_number)}</span>
            </div>
            <div>
                <strong>Remaining Hospital Stock:</strong> ${hospital_stock.total_remaining_units} units (${hospital_stock.warehouses_count} location(s))<br>
                <strong>Quarantine Status:</strong> ${hospital_stock.unquarantined_units > 0 ? '<span style="color:#b91c1c;">⚠️ UNQUARANTINED UNITS REMAIN</span>' : '<span style="color:#15803d;">✔ ALL ON-HAND UNITS LOCKED</span>'}<br>
                ${activeRecall ? `<strong>Recall Advisory:</strong> ${escapeHtml(activeRecall.recall_reference)} (${escapeHtml(activeRecall.recall_class)})` : ''}
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:30px;">#</th>
                <th>Patient Details &amp; Address</th>
                <th>Contact Phone Numbers</th>
                <th>Dispensed Date</th>
                <th style="text-align:right;">Qty</th>
                <th>Prescribing Doctor</th>
                <th>Current Status</th>
                <th>Call Signature &amp; Notes</th>
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


/* ---------------------------------------------------------------
 * Extemporaneous Compounding & Specialized Formulations Workbook
 * ------------------------------------------------------------- */

let allCompoundingRecords = [];
let allMasterFormulas = [];

function setupCompounding() {
    const newBtn = document.getElementById("diNewCompoundBtn");
    if (newBtn) newBtn.addEventListener("click", () => {
        showView("compounding");
        openNewCompoundingModal();
    });

    const openModalBtn = document.getElementById("diOpenCompoundingModalBtn");
    if (openModalBtn) openModalBtn.addEventListener("click", openNewCompoundingModal);

    const closeModalBtn = document.getElementById("diCloseCompoundingModal");
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeCompoundingModal);

    const cancelModalBtn = document.getElementById("diCancelCompounding");
    if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeCompoundingModal);

    const refreshBtn = document.getElementById("diCompoundingRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", loadCompoundingRecords);

    const searchInput = document.getElementById("diCompoundSearch");
    if (searchInput) searchInput.addEventListener("input", filterAndRenderCompounding);

    const typeFilter = document.getElementById("diCompoundTypeFilter");
    if (typeFilter) typeFilter.addEventListener("change", filterAndRenderCompounding);

    const statusFilter = document.getElementById("diCompoundStatusFilter");
    if (statusFilter) statusFilter.addEventListener("change", filterAndRenderCompounding);

    const addIngBtn = document.getElementById("diAddIngredientRowBtn");
    if (addIngBtn) addIngBtn.addEventListener("click", () => addIngredientRow());

    const formulaSelect = document.getElementById("di_compound_formula_select");
    if (formulaSelect) formulaSelect.addEventListener("change", applyMasterFormulaPreset);

    const prepAtInput = document.getElementById("di_compound_prep_at");
    if (prepAtInput) prepAtInput.addEventListener("change", updateBudPreview);

    const budHoursInput = document.getElementById("di_compound_bud_hours");
    if (budHoursInput) budHoursInput.addEventListener("input", updateBudPreview);

    const compoundForm = document.getElementById("diCompoundingForm");
    if (compoundForm) compoundForm.addEventListener("submit", handleCompoundingSubmit);

    // Inspection modal
    const closeInspectBtn = document.getElementById("diCloseInspectModal");
    if (closeInspectBtn) closeInspectBtn.addEventListener("click", closeInspectModal);

    const cancelInspectBtn = document.getElementById("diCancelInspect");
    if (cancelInspectBtn) cancelInspectBtn.addEventListener("click", closeInspectModal);

    const inspectForm = document.getElementById("diInspectForm");
    if (inspectForm) inspectForm.addEventListener("submit", handleInspectSubmit);

    // Detail modal
    const closeDetailBtn = document.getElementById("diCloseCompoundDetailModal");
    if (closeDetailBtn) closeDetailBtn.addEventListener("click", () => {
        document.getElementById("diCompoundingDetailModalOverlay")?.classList.remove("open");
    });
}

async function loadCompoundingRecords() {
    const tbody = document.getElementById("diCompoundingBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="di-empty-state">Loading compounding workbook...</td></tr>';

    try {
        const res = await fetchCompoundingRecords();
        if (!res?.success) {
            tbody.innerHTML = `<tr><td colspan="8" class="di-empty-state">${escapeHtml(res?.message || "Failed to load compounding records.")}</td></tr>`;
            return;
        }

        allCompoundingRecords = res.data || [];

        // Calculate metrics
        const total = allCompoundingRecords.length;
        const pending = allCompoundingRecords.filter((r) => r.status === "prepared" || r.inspection_status === "pending").length;
        const approved = allCompoundingRecords.filter((r) => r.status === "inspected_approved").length;
        const expired = allCompoundingRecords.filter((r) => r.is_expired).length;

        const elTot = document.getElementById("diStatCompoundTotal");
        if (elTot) elTot.textContent = total;
        const elPen = document.getElementById("diStatCompoundPending");
        if (elPen) elPen.textContent = pending;
        const elApp = document.getElementById("diStatCompoundApproved");
        if (elApp) elApp.textContent = approved;
        const elExp = document.getElementById("diStatCompoundExpired");
        if (elExp) elExp.textContent = expired;

        filterAndRenderCompounding();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="di-empty-state">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function loadMasterFormulas() {
    const select = document.getElementById("di_compound_formula_select");
    if (!select) return;

    try {
        const res = await fetchCompoundingFormulas();
        if (res?.success && Array.isArray(res.data)) {
            allMasterFormulas = res.data;
            select.innerHTML = '<option value="">-- Custom Formulation (Enter details below) --</option>' +
                allMasterFormulas.map((f) => `<option value="${f.id}">${escapeHtml(f.formula_code)}: ${escapeHtml(f.name)} (${f.standard_yield_quantity} ${f.yield_unit})</option>`).join("");
        }
    } catch (e) {
        console.error("Failed to load master formulas", e);
    }
}

function filterAndRenderCompounding() {
    const tbody = document.getElementById("diCompoundingBody");
    if (!tbody) return;

    const term = (document.getElementById("diCompoundSearch")?.value || "").trim().toLowerCase();
    const type = document.getElementById("diCompoundTypeFilter")?.value || "";
    const status = document.getElementById("diCompoundStatusFilter")?.value || "";

    const filtered = allCompoundingRecords.filter((r) => {
        if (type && r.formulation_type !== type) return false;
        if (status && r.status !== status) return false;
        if (!term) return true;
        return (
            (r.compounding_number || "").toLowerCase().includes(term) ||
            (r.formulation_name || "").toLowerCase().includes(term) ||
            (r.patient_name || "").toLowerCase().includes(term) ||
            (r.patient_no || "").toLowerCase().includes(term) ||
            (r.cleanroom_hood_number || "").toLowerCase().includes(term)
        );
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="di-empty-state">No compounding records match your filter.</td></tr>';
        return;
    }

    const typeBadge = (t) => {
        switch (t) {
            case "tpn":
                return '<span class="di-badge alert" style="font-weight:700;">TPN Parenteral</span>';
            case "oncology_dilution":
                return '<span class="di-badge alert" style="background:#fef2f2; color:#991b1b; font-weight:700;">Oncology Cytotoxic</span>';
            case "iv_admixture":
                return '<span class="di-badge ok" style="font-weight:600;">IV Admixture</span>';
            case "pediatric_suspension":
                return '<span class="di-badge cold">Pediatric Oral</span>';
            default:
                return `<span class="di-badge">${escapeHtml(t)}</span>`;
        }
    };

    const budBadge = (r) => {
        if (r.is_expired) {
            return '<span class="di-badge alert" style="font-weight:800;">BUD EXPIRED</span>';
        }
        if (r.hours_until_bud !== null && r.hours_until_bud <= 12) {
            return `<span class="di-badge alert" style="font-size:10.5px;">Expires in ${r.hours_until_bud}h</span>`;
        }
        if (r.hours_until_bud !== null && r.hours_until_bud <= 24) {
            return `<span class="di-badge low" style="font-size:10.5px;">Expires in ${r.hours_until_bud}h</span>`;
        }
        return `<span class="di-badge ok" style="font-size:10.5px;">Valid (${r.hours_until_bud}h left)</span>`;
    };

    const dualSignBadge = (r) => {
        if (r.inspection_status === "approved" || r.status === "inspected_approved") {
            return `<span class="di-badge ok" style="font-weight:700;">&#10003; APPROVED</span><div class="di-sub" style="font-size:10px;">By ${escapeHtml(r.inspected_by_name || 'Pharmacist')}</div>`;
        }
        if (r.inspection_status === "rejected" || r.status === "inspected_rejected") {
            return `<span class="di-badge alert" style="font-weight:700;">&#10007; REJECTED</span><div class="di-sub" style="font-size:10px;">By ${escapeHtml(r.inspected_by_name || 'Pharmacist')}</div>`;
        }
        return '<span class="di-badge low" style="font-weight:700; animation:di-pulse 1.5s infinite;">&#9888; PENDING 2ND CHECK</span>';
    };

    tbody.innerHTML = filtered.map((r) => `
        <tr>
            <td>
                <a href="javascript:void(0)" class="di-view-compound-btn" data-record-id="${r.id}" style="font-weight:700; color:#1d4ed8; text-decoration:underline;">
                    ${escapeHtml(r.compounding_number)}
                </a>
                <div class="di-sub">${formatDate(r.prepared_at)}</div>
            </td>
            <td>
                <strong>${escapeHtml(r.formulation_name)}</strong>
                <div style="margin-top:2px;">${typeBadge(r.formulation_type)}</div>
                <div class="di-sub">${r.ingredients_count} raw ingredient(s) consumed</div>
            </td>
            <td>
                ${r.patient_name ? `
                    <strong>${escapeHtml(r.patient_name)}</strong>
                    <div class="di-sub">MRN: ${escapeHtml(r.patient_no || '—')}</div>
                ` : '<span class="di-badge cold" style="font-size:11px;">Ward / Floor Stock</span>'}
            </td>
            <td>
                <strong>${r.yield_quantity} ${escapeHtml(r.yield_unit)}</strong>
                <div class="di-sub">&#127973; ${escapeHtml(r.cleanroom_hood_number)}</div>
            </td>
            <td>
                <div><strong>${formatDate(r.beyond_use_date)}</strong> <small>${String(r.beyond_use_date).slice(11, 16)}</small></div>
                <div style="margin-top:2px;">${budBadge(r)}</div>
                <div class="di-sub" style="font-size:10.5px;">${escapeHtml(r.storage_condition)}</div>
            </td>
            <td>
                <div>${escapeHtml(r.prepared_by_name || 'Pharmacist')}</div>
                <div class="di-sub">Prep User</div>
            </td>
            <td>
                ${dualSignBadge(r)}
            </td>
            <td>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button type="button" class="di-btn small di-view-compound-btn" data-record-id="${r.id}" title="View Workbook Log">
                        Workbook
                    </button>
                    ${r.inspection_status === "pending" ? `
                        <button type="button" class="di-btn small primary di-inspect-compound-btn" data-record-id="${r.id}" style="background:#15803d; border-color:#15803d; font-weight:600;" title="Dual Verification Sign-off">
                            &#9989; Dual Check
                        </button>
                    ` : ''}
                    <button type="button" class="di-btn small di-print-label-btn" data-record-id="${r.id}" title="Print Thermal Formulation Label">
                        &#128438; Label
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    // Bind event listeners
    tbody.querySelectorAll(".di-view-compound-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-record-id"), 10);
            viewCompoundingDetail(id);
        });
    });

    tbody.querySelectorAll(".di-inspect-compound-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-record-id"), 10);
            openInspectModal(id);
        });
    });

    tbody.querySelectorAll(".di-print-label-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-record-id"), 10);
            printCompoundingLabel(id);
        });
    });
}

function openNewCompoundingModal() {
    const alertEl = document.getElementById("diCompoundingAlert");
    if (alertEl) alertEl.innerHTML = "";

    document.getElementById("di_compound_formula_select").value = "";
    document.getElementById("di_compound_name").value = "";
    document.getElementById("di_compound_type").value = "iv_admixture";
    document.getElementById("di_compound_patient_search").value = "";
    document.getElementById("di_compound_patient_id").value = "";
    document.getElementById("di_compound_hood").value = "Laminar Flow Hood LFH-01";
    document.getElementById("di_compound_yield_qty").value = "1000";
    document.getElementById("di_compound_yield_unit").value = "mL";
    document.getElementById("di_compound_bud_hours").value = "24";
    document.getElementById("di_compound_storage").value = "Refrigerate (2-8°C)";
    document.getElementById("di_compound_instructions").value = "";
    document.getElementById("di_compound_prep_notes").value = "";

    // Set default prepared_at to now in local datetime format
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById("di_compound_prep_at").value = localNow;

    updateBudPreview();

    // Clear ingredients and add 2 initial empty rows
    const tbody = document.getElementById("diCompoundIngredientsBody");
    if (tbody) {
        tbody.innerHTML = "";
        addIngredientRow({ name: "0.9% Sodium Chloride IV Bag (Vehicle)", lot: "", qty: 1000, unit: "mL" });
        addIngredientRow({ name: "Active Pharmaceutical Ingredient / Concentrate", lot: "", qty: 20, unit: "mL" });
    }

    document.getElementById("diCompoundingModalOverlay")?.classList.add("open");
}

function closeCompoundingModal() {
    document.getElementById("diCompoundingModalOverlay")?.classList.remove("open");
}

function addIngredientRow(preset = {}) {
    const tbody = document.getElementById("diCompoundIngredientsBody");
    if (!tbody) return;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>
            <input type="text" class="di-ing-name" placeholder="Medicine / Ingredient Name" value="${escapeHtml(preset.name || '')}" required style="width:100%;">
        </td>
        <td>
            <input type="text" class="di-ing-lot" placeholder="Raw Batch Lot #" value="${escapeHtml(preset.lot || '')}" required style="width:100%; font-weight:600;">
        </td>
        <td>
            <input type="date" class="di-ing-exp" value="${preset.exp || ''}" style="width:100%;">
        </td>
        <td>
            <div style="display:flex; gap:4px;">
                <input type="number" step="0.001" min="0.001" class="di-ing-qty" placeholder="Qty" value="${preset.qty || 1}" required style="flex:2;">
                <input type="text" class="di-ing-unit" placeholder="Unit" value="${escapeHtml(preset.unit || 'mL')}" required style="flex:1;">
            </div>
        </td>
        <td style="text-align:center;">
            <button type="button" class="di-btn small di-remove-ing-btn" style="color:#b91c1c; border-color:#fca5a5;" title="Remove Ingredient">&times;</button>
        </td>
    `;

    row.querySelector(".di-remove-ing-btn").addEventListener("click", () => {
        if (tbody.querySelectorAll("tr").length > 1) {
            row.remove();
        } else {
            showToast("At least one raw ingredient is required.", "warning");
        }
    });

    tbody.appendChild(row);
}

function applyMasterFormulaPreset() {
    const formulaId = parseInt(document.getElementById("di_compound_formula_select")?.value, 10);
    if (!formulaId) return;

    const formula = allMasterFormulas.find((f) => f.id === formulaId);
    if (!formula) return;

    document.getElementById("di_compound_name").value = formula.name;
    document.getElementById("di_compound_type").value = formula.formulation_type;
    document.getElementById("di_compound_hood").value = formula.default_cleanroom_hood || "Laminar Flow Hood LFH-01";
    document.getElementById("di_compound_yield_qty").value = formula.standard_yield_quantity;
    document.getElementById("di_compound_yield_unit").value = formula.yield_unit;
    document.getElementById("di_compound_bud_hours").value = formula.default_bud_hours;
    document.getElementById("di_compound_storage").value = formula.default_storage_condition;
    document.getElementById("di_compound_instructions").value = formula.standard_sop_instructions || "";

    updateBudPreview();
}

function updateBudPreview() {
    const prepAtVal = document.getElementById("di_compound_prep_at")?.value;
    const hoursVal = parseInt(document.getElementById("di_compound_bud_hours")?.value, 10) || 24;
    const previewEl = document.getElementById("di_compound_bud_preview");

    if (!previewEl) return;

    if (!prepAtVal) {
        previewEl.value = "—";
        return;
    }

    try {
        const d = new Date(prepAtVal);
        d.setHours(d.getHours() + hoursVal);
        const pad = (n) => String(n).padStart(2, "0");
        previewEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} (${hoursVal}h BUD)`;
    } catch (e) {
        previewEl.value = "—";
    }
}

async function handleCompoundingSubmit(e) {
    e.preventDefault();
    const alertEl = document.getElementById("diCompoundingAlert");
    if (alertEl) alertEl.innerHTML = "";

    const rows = document.querySelectorAll("#diCompoundIngredientsBody tr");
    const ingredients = [];
    rows.forEach((r) => {
        const name = r.querySelector(".di-ing-name")?.value.trim();
        const lot = r.querySelector(".di-ing-lot")?.value.trim();
        const exp = r.querySelector(".di-ing-exp")?.value;
        const qty = parseFloat(r.querySelector(".di-ing-qty")?.value) || 0;
        const unit = r.querySelector(".di-ing-unit")?.value.trim();

        if (name && lot && qty > 0) {
            ingredients.push({
                ingredient_name: name,
                source_lot_number: lot,
                source_lot_expiry: exp || null,
                quantity_consumed: qty,
                unit: unit || "mL"
            });
        }
    });

    if (!ingredients.length) {
        showToast("Please document at least one raw ingredient with lot number.", "warning");
        return;
    }

    const payload = {
        formula_id: parseInt(document.getElementById("di_compound_formula_select")?.value, 10) || null,
        formulation_name: document.getElementById("di_compound_name")?.value.trim(),
        formulation_type: document.getElementById("di_compound_type")?.value,
        cleanroom_hood_number: document.getElementById("di_compound_hood")?.value.trim(),
        yield_quantity: parseFloat(document.getElementById("di_compound_yield_qty")?.value) || 1,
        yield_unit: document.getElementById("di_compound_yield_unit")?.value.trim(),
        prepared_at: document.getElementById("di_compound_prep_at")?.value.replace("T", " ") + ":00",
        bud_hours: parseInt(document.getElementById("di_compound_bud_hours")?.value, 10) || 24,
        storage_condition: document.getElementById("di_compound_storage")?.value,
        special_instructions: document.getElementById("di_compound_instructions")?.value.trim(),
        preparation_notes: document.getElementById("di_compound_prep_notes")?.value.trim(),
        ingredients
    };

    try {
        const res = await createCompoundingRecord(payload);
        if (!res?.success) {
            if (alertEl) alertEl.innerHTML = `<div class="di-empty-state" style="color:#b91c1c; padding:8px; margin-bottom:8px;">${escapeHtml(res?.message || "Failed to create compounding record.")}</div>`;
            showToast(res?.message || "Failed to log formulation", "error");
            return;
        }

        showToast(res.message, "success");
        closeCompoundingModal();
        loadCompoundingRecords();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

async function openInspectModal(recordId) {
    const summary = document.getElementById("diInspectSummary");
    if (!summary) return;
    summary.innerHTML = "Loading formulation details...";

    document.getElementById("di_inspect_record_id").value = recordId;
    document.getElementById("chk_particulate_free").checked = false;
    document.getElementById("chk_container_intact").checked = false;
    document.getElementById("chk_labeling_correct").checked = false;
    document.getElementById("chk_volume_verified").checked = false;
    document.getElementById("chk_bud_verified").checked = false;
    document.getElementById("di_inspect_notes").value = "";
    document.getElementById("di_inspect_decision").value = "approved";

    document.getElementById("diCompoundingInspectModalOverlay")?.classList.add("open");

    try {
        const res = await fetchCompoundingDetail(recordId);
        if (!res?.success) {
            summary.innerHTML = `<span style="color:#b91c1c;">Failed to load: ${escapeHtml(res?.message)}</span>`;
            return;
        }

        const { record, ingredients } = res.data;
        summary.innerHTML = `
            <div style="font-size:15px; font-weight:700; color:#1d4ed8; margin-bottom:4px;">
                ${escapeHtml(record.compounding_number)}: ${escapeHtml(record.formulation_name)}
            </div>
            <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:8px;">
                Type: <strong>${escapeHtml(record.formulation_type)}</strong> · Yield: <strong>${record.yield_quantity} ${escapeHtml(record.yield_unit)}</strong><br>
                Cleanroom Hood: <strong>${escapeHtml(record.cleanroom_hood_number)}</strong> (${escapeHtml(record.cleanroom_suite)})<br>
                Prepared By: <strong>${escapeHtml(record.prepared_by_name || 'Pharmacist')}</strong> on ${formatDate(record.prepared_at)}<br>
                Beyond-Use Date (BUD): <strong style="color:#b91c1c;">${formatDate(record.beyond_use_date)}</strong> · Storage: <strong>${escapeHtml(record.storage_condition)}</strong>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:4px; padding:6px 10px;">
                <div style="font-weight:700; font-size:11.5px; text-transform:uppercase; margin-bottom:4px;">Consumed Raw Ingredients:</div>
                ${ingredients.map((i) => `<div style="font-size:12px;">• ${escapeHtml(i.ingredient_name)}: <strong>${i.quantity_consumed} ${escapeHtml(i.unit)}</strong> (Lot: <code style="font-weight:700;">${escapeHtml(i.source_lot_number)}</code>)</div>`).join("")}
            </div>
        `;
    } catch (e) {
        summary.innerHTML = `<span style="color:#b91c1c;">Error: ${escapeHtml(e.message)}</span>`;
    }
}

function closeInspectModal() {
    document.getElementById("diCompoundingInspectModalOverlay")?.classList.remove("open");
}

async function handleInspectSubmit(e) {
    e.preventDefault();
    const recordId = parseInt(document.getElementById("di_inspect_record_id")?.value, 10);
    if (!recordId) return;

    const payload = {
        decision: document.getElementById("di_inspect_decision")?.value,
        particulate_free: document.getElementById("chk_particulate_free")?.checked,
        container_intact: document.getElementById("chk_container_intact")?.checked,
        labeling_correct: document.getElementById("chk_labeling_correct")?.checked,
        volume_verified: document.getElementById("chk_volume_verified")?.checked,
        bud_verified: document.getElementById("chk_bud_verified")?.checked,
        inspection_notes: document.getElementById("di_inspect_notes")?.value.trim(),
        emergency_self_sign_override: document.getElementById("di_inspect_emergency_override")?.checked
    };

    try {
        const res = await inspectCompoundingRecord(recordId, payload);
        if (!res?.success) {
            showToast(res?.message || "Inspection sign-off failed", "error");
            return;
        }

        showToast(res.message, "success");
        closeInspectModal();
        loadCompoundingRecords();
    } catch (err) {
        showToast("Error during inspection sign-off: " + err.message, "error");
    }
}

async function viewCompoundingDetail(recordId) {
    const overlay = document.getElementById("diCompoundingDetailModalOverlay");
    const body = document.getElementById("diCompoundDetailBody");
    if (!overlay || !body) return;

    overlay.classList.add("open");
    body.innerHTML = "Loading compounding workbook details...";

    try {
        const res = await fetchCompoundingDetail(recordId);
        if (!res?.success) {
            body.innerHTML = `<div class="di-empty-state" style="color:#b91c1c;">${escapeHtml(res?.message || "Failed to load record.")}</div>`;
            return;
        }

        const { record, ingredients } = res.data;
        const checks = record.visual_inspection_checks || {};

        body.innerHTML = `
            <div style="background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px; padding:16px; margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div>
                        <span class="di-badge alert" style="font-size:12px; font-weight:800;">${escapeHtml(record.compounding_number)}</span>
                        <h3 style="margin:4px 0 0; font-size:18px; color:var(--text-primary);">${escapeHtml(record.formulation_name)}</h3>
                    </div>
                    <div style="text-align:right;">
                        <span class="di-badge ${record.status === 'inspected_approved' ? 'ok' : (record.status === 'inspected_rejected' ? 'alert' : 'low')}" style="font-size:12px; font-weight:700;">
                            ${escapeHtml(record.status.toUpperCase().replace('_', ' '))}
                        </span>
                        <div class="di-sub" style="margin-top:4px;">Lot: <strong>${escapeHtml(record.resulting_lot_number || '—')}</strong></div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:12.5px;">
                    <div><strong>Formulation Type:</strong> ${escapeHtml(record.formulation_type)}</div>
                    <div><strong>Total Yield:</strong> ${record.yield_quantity} ${escapeHtml(record.yield_unit)}</div>
                    <div><strong>Cleanroom Hood:</strong> ${escapeHtml(record.cleanroom_hood_number)}</div>
                    <div><strong>Cleanroom Suite:</strong> ${escapeHtml(record.cleanroom_suite)}</div>
                    <div><strong>Prepared Date:</strong> ${formatDate(record.prepared_at)} ${String(record.prepared_at).slice(11, 16)}</div>
                    <div><strong>Beyond-Use Date (BUD):</strong> <span style="font-weight:700; color:#b91c1c;">${formatDate(record.beyond_use_date)} ${String(record.beyond_use_date).slice(11, 16)}</span></div>
                    <div><strong>Storage Condition:</strong> ${escapeHtml(record.storage_condition)}</div>
                    <div><strong>Target Patient:</strong> ${escapeHtml(record.patient_name || 'Ward / Floor Stock')} ${record.patient_no ? '(' + escapeHtml(record.patient_no) + ')' : ''}</div>
                </div>

                ${record.special_instructions ? `
                    <div style="margin-top:10px; font-size:12.5px; background:var(--bg-surface); padding:8px; border-radius:4px;">
                        <strong>SOP Instructions:</strong> ${escapeHtml(record.special_instructions)}
                    </div>
                ` : ''}
            </div>

            <!-- Consumed Ingredients -->
            <div style="margin-bottom:14px;">
                <h4 style="margin:0 0 6px; font-size:14px;">Consumed Raw Ingredients &amp; Manufacturer Lots</h4>
                <div class="di-table-wrap">
                    <table class="di-table">
                        <thead>
                            <tr>
                                <th>Ingredient Name</th>
                                <th>Manufacturer Lot #</th>
                                <th>Lot Expiry</th>
                                <th class="num">Quantity Consumed</th>
                                <th>Warehouse Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ingredients.map((i) => `
                                <tr>
                                    <td><strong>${escapeHtml(i.ingredient_name)}</strong></td>
                                    <td><code style="font-weight:700;">${escapeHtml(i.source_lot_number)}</code></td>
                                    <td>${i.source_lot_expiry || '—'}</td>
                                    <td class="num"><strong>${i.quantity_consumed} ${escapeHtml(i.unit)}</strong></td>
                                    <td>${escapeHtml(i.warehouse_name || 'Central Pharmacy')}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Dual Sign-Off Audit Trail -->
            <div style="background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px; padding:14px;">
                <h4 style="margin:0 0 10px; font-size:13.5px; color:var(--text-primary);">Mandatory Dual Pharmacist Sign-Off Audit Trail</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; font-size:12.5px;">
                    <div style="border-right:1px solid var(--border-color); padding-right:10px;">
                        <strong style="color:#1d4ed8;">1. Preparing Pharmacist Sign-Off</strong><br>
                        Pharmacist: <strong>${escapeHtml(record.prepared_by_name || 'Pharmacist')}</strong><br>
                        Timestamp: ${formatDate(record.prepared_at)} ${String(record.prepared_at).slice(11, 16)}<br>
                        Notes: <em>${escapeHtml(record.preparation_notes || 'Preparation documented according to formula.')}</em>
                    </div>
                    <div>
                        <strong style="color:${record.inspection_status === 'approved' ? '#15803d' : '#ea580c'};">2. Verifying Pharmacist Dual Sign-Off</strong><br>
                        Status: <strong>${escapeHtml((record.inspection_status || 'PENDING').toUpperCase())}</strong><br>
                        ${record.inspected_by_name ? `
                            Pharmacist: <strong>${escapeHtml(record.inspected_by_name)}</strong><br>
                            Timestamp: ${formatDate(record.inspected_at)} ${String(record.inspected_at).slice(11, 16)}<br>
                            Notes: <em>${escapeHtml(record.inspection_notes || '—')}</em><br>
                            <small>Visual checks verified: Clarity: ${checks.particulate_free ? '✔' : '—'}, Container: ${checks.container_intact ? '✔' : '—'}, Label: ${checks.labeling_correct ? '✔' : '—'}, Yield: ${checks.volume_verified ? '✔' : '—'}, BUD: ${checks.bud_verified ? '✔' : '—'}</small>
                        ` : '<span class="di-badge low" style="margin-top:6px;">Awaiting second pharmacist visual check</span>'}
                    </div>
                </div>
            </div>

            <div class="form-actions" style="margin-top:14px;">
                <button type="button" class="btn-secondary" id="diCloseCompoundDetailBtn">Close</button>
                <button type="button" class="di-btn" id="diPrintLabelFromDetailBtn">&#128438; Print Label</button>
            </div>
        `;

        document.getElementById("diCloseCompoundDetailBtn")?.addEventListener("click", () => overlay.classList.remove("open"));
        document.getElementById("diPrintLabelFromDetailBtn")?.addEventListener("click", () => printCompoundingLabel(recordId));
    } catch (e) {
        body.innerHTML = `<div class="di-empty-state" style="color:#b91c1c;">Error: ${escapeHtml(e.message)}</div>`;
    }
}

async function printCompoundingLabel(recordId) {
    try {
        const res = await fetchCompoundingLabel(recordId);
        if (!res?.success) {
            showToast("Failed to fetch label data: " + res?.message, "error");
            return;
        }

        const l = res.data;
        const win = window.open("", "_blank");
        if (!win) {
            showToast("Please allow popups to print auxiliary formulation label.", "warning");
            return;
        }

        win.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Compounding Auxiliary Label - ${escapeHtml(l.compounding_number)}</title>
    <style>
        body { font-family: monospace, Arial, sans-serif; margin: 10px; font-size: 11px; }
        .label-card { width: 380px; border: 2px solid #000; padding: 12px; border-radius: 4px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
        .h-title { font-size: 13px; font-weight: bold; }
        .h-sub { font-size: 9.5px; }
        .drug-name { font-size: 14px; font-weight: bold; margin: 6px 0; }
        .bud-box { background: #000; color: #fff; padding: 4px 6px; font-weight: bold; font-size: 11.5px; margin: 8px 0; text-align: center; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; }
        .signatures { margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; font-size: 9.5px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="label-card">
        <div class="header">
            <div class="h-title">HOSPITAL PHARMACY COMPOUNDING UNIT</div>
            <div class="h-sub">Sterile Admixture &amp; Specialized Formulations</div>
        </div>

        <div><strong>CMP #:</strong> ${escapeHtml(l.compounding_number)} · <strong>LOT:</strong> ${escapeHtml(l.resulting_lot_number)}</div>
        <div class="drug-name">${escapeHtml(l.formulation_name)}</div>
        <div><strong>Total Volume / Yield:</strong> ${escapeHtml(l.yield_quantity)}</div>
        <div><strong>Patient:</strong> ${escapeHtml(l.patient_name)} (${escapeHtml(l.patient_no)})</div>

        <div class="bud-box">
            BEYOND-USE DATE (BUD): ${escapeHtml(l.beyond_use_date)}
        </div>

        <div class="grid">
            <div><strong>Storage:</strong> ${escapeHtml(l.storage_condition)}</div>
            <div><strong>Hood #:</strong> ${escapeHtml(l.cleanroom_hood_number)}</div>
            <div><strong>Prepared:</strong> ${escapeHtml(l.prepared_at)}</div>
            <div><strong>Suite:</strong> Cleanroom ISO 5</div>
        </div>

        ${l.special_instructions ? `<div style="margin-top:6px; font-size:9.5px;"><strong>Directions:</strong> ${escapeHtml(l.special_instructions)}</div>` : ''}

        <div class="signatures">
            <div>
                <strong>Prep Pharmacist:</strong><br>
                ${escapeHtml(l.prepared_by)}<br>
                <em>Initials / Verified</em>
            </div>
            <div>
                <strong>Dual Check Pharmacist:</strong><br>
                ${escapeHtml(l.inspected_by)}<br>
                <em>${escapeHtml(l.inspection_status.toUpperCase())}</em>
            </div>
        </div>
    </div>
    <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
        win.document.close();
    } catch (err) {
        showToast("Error generating label: " + err.message, "error");
    }
}

/* ---------------------------------------------------------------
 * Central Pharmacy Narcotics Safe Perpetual Ledger & Dual-Custody
 * ------------------------------------------------------------- */

let allVaultItems = [];
let allVaultMovements = [];
let allShiftAudits = [];
let activeNvTab = "ledger";

function setupNarcoticsVault() {
    // Toolbar and Quick Buttons
    const logBtn = document.getElementById("diLogNarcoticBtn");
    if (logBtn) logBtn.addEventListener("click", () => {
        showView("narcotics");
        openNarcoticsMovementModal();
    });

    const openMovBtn = document.getElementById("diOpenMovementModalBtn");
    if (openMovBtn) openMovBtn.addEventListener("click", () => openNarcoticsMovementModal());

    const auditBtn = document.getElementById("diAuditNarcoticBtn");
    if (auditBtn) auditBtn.addEventListener("click", () => {
        showView("narcotics");
        openShiftAuditModal();
    });

    const openAuditBtn = document.getElementById("diOpenShiftAuditBtn");
    if (openAuditBtn) openAuditBtn.addEventListener("click", () => openShiftAuditModal());

    const pinBtn = document.getElementById("diOpenPinSetupBtn");
    if (pinBtn) pinBtn.addEventListener("click", () => openPinSetupModal());

    const refreshBtn = document.getElementById("diNarcoticsRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", () => {
        loadNarcoticsStats();
        loadNarcoticsItems();
        loadNarcoticsMovements();
        loadShiftAudits();
        showToast("Narcotics Safe Vault refreshed", "info");
    });

    // Sub-Navigation Tabs inside Narcotics Vault
    const tabs = [
        { id: "diNvTabLedger", name: "ledger" },
        { id: "diNvTabInventory", name: "inventory" },
        { id: "diNvTabAudits", name: "audits" }
    ];
    tabs.forEach(({ id, name }) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", () => switchNarcoticsSubtab(name));
    });

    // Filters
    const schedFilter = document.getElementById("diNvScheduleFilter");
    if (schedFilter) schedFilter.addEventListener("change", () => {
        renderNarcoticsLedger();
        renderNarcoticsInventory();
    });

    const mtypeFilter = document.getElementById("diNvMovementTypeFilter");
    if (mtypeFilter) mtypeFilter.addEventListener("change", renderNarcoticsLedger);

    const searchInput = document.getElementById("diNarcoticsSearchInput");
    if (searchInput) searchInput.addEventListener("input", () => {
        renderNarcoticsLedger();
        renderNarcoticsInventory();
    });

    // Movement Item Select Change
    const itemSelect = document.getElementById("di_mov_vault_item_id");
    if (itemSelect) itemSelect.addEventListener("change", () => {
        const selectedId = parseInt(itemSelect.value, 10);
        const item = allVaultItems.find(v => v.id === selectedId);
        const info = document.getElementById("diMovItemInfo");
        if (item && info) {
            info.innerHTML = `<strong>Safe Location:</strong> ${escapeHtml(item.safe_location)} · <strong>Current Balance:</strong> <span style="font-weight:700; color:${item.is_low_stock ? '#dc2626' : '#16a34a'};">${item.current_balance} ${escapeHtml(item.package_form)}(s)</span> · <strong>Min Par:</strong> ${item.minimum_safe_par}`;
        } else if (info) {
            info.innerHTML = "";
        }
    });

    // Movement Modal Form Submit
    const movForm = document.getElementById("diNarcoticsMovementForm");
    if (movForm) movForm.addEventListener("submit", handleNarcoticsMovementSubmit);

    const closeMovBtn = document.getElementById("diCloseMovementModal");
    if (closeMovBtn) closeMovBtn.addEventListener("click", closeNarcoticsMovementModal);

    const cancelMovBtn = document.getElementById("diCancelMovement");
    if (cancelMovBtn) cancelMovBtn.addEventListener("click", closeNarcoticsMovementModal);

    // Shift Audit Modal Form Submit
    const auditForm = document.getElementById("diNarcoticsShiftAuditForm");
    if (auditForm) auditForm.addEventListener("submit", handleShiftAuditSubmit);

    const closeAuditBtn = document.getElementById("diCloseShiftAuditModal");
    if (closeAuditBtn) closeAuditBtn.addEventListener("click", closeShiftAuditModal);

    const cancelAuditBtn = document.getElementById("diCancelShiftAudit");
    if (cancelAuditBtn) cancelAuditBtn.addEventListener("click", closeShiftAuditModal);

    // PIN Setup Form Submit
    const pinForm = document.getElementById("diSetPinForm");
    if (pinForm) pinForm.addEventListener("submit", handleSetPinSubmit);

    const closePinBtn = document.getElementById("diCloseSetPinModal");
    if (closePinBtn) closePinBtn.addEventListener("click", closePinSetupModal);

    const cancelPinBtn = document.getElementById("diCancelSetPin");
    if (cancelPinBtn) cancelPinBtn.addEventListener("click", closePinSetupModal);
}

function switchNarcoticsSubtab(tab) {
    activeNvTab = tab;
    ["ledger", "inventory", "audits"].forEach(t => {
        const btn = document.getElementById(`diNvTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const panel = document.getElementById(`diNvSubpanel${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (btn) btn.classList.toggle("active", t === tab);
        if (panel) panel.style.display = (t === tab) ? "block" : "none";
    });

    if (tab === "ledger") renderNarcoticsLedger();
    if (tab === "inventory") renderNarcoticsInventory();
    if (tab === "audits") renderShiftAudits();
}

async function loadNarcoticsStats() {
    try {
        const res = await fetchNarcoticsVaultStats();
        if (res.success && res.data) {
            const s = res.data;
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setVal("diKpiVaultTotalUnits", s.total_units_in_safe.toLocaleString());
            setVal("diKpiVaultSched2", s.schedule_ii_items.toLocaleString());
            setVal("diKpiVaultLowStock", s.low_stock_items.toLocaleString());
            setVal("diKpiVaultTodayMovements", s.today_movements.toLocaleString());
            
            const auditEl = document.getElementById("diKpiVaultAuditStatus");
            if (auditEl) {
                if (s.unresolved_discrepancies > 0) {
                    auditEl.textContent = `${s.unresolved_discrepancies} Discrepancy`;
                    auditEl.style.color = "#dc2626";
                } else {
                    auditEl.textContent = "100% Balanced";
                    auditEl.style.color = "#16a34a";
                }
            }
        }
    } catch (err) {
        console.error("Failed to load narcotics stats", err);
    }
}

async function loadNarcoticsItems() {
    try {
        const res = await fetchNarcoticsVaultItems();
        if (res.success && Array.isArray(res.data)) {
            allVaultItems = res.data;
            renderNarcoticsInventory();
            populateVaultItemSelect();
        }
    } catch (err) {
        console.error("Failed to load narcotics items", err);
    }
}

async function loadNarcoticsMovements() {
    try {
        const res = await fetchNarcoticsVaultMovements({ limit: 150 });
        if (res.success && Array.isArray(res.data)) {
            allVaultMovements = res.data;
            renderNarcoticsLedger();
        }
    } catch (err) {
        console.error("Failed to load narcotics movements", err);
    }
}

async function loadShiftAudits() {
    try {
        const res = await fetchShiftAudits();
        if (res.success && Array.isArray(res.data)) {
            allShiftAudits = res.data;
            renderShiftAudits();
        }
    } catch (err) {
        console.error("Failed to load shift audits", err);
    }
}

function populateVaultItemSelect() {
    const sel = document.getElementById("di_mov_vault_item_id");
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- Select Narcotic Item from Central Safe --</option>' +
        allVaultItems.map(item => `
            <option value="${item.id}">
                ${escapeHtml(item.item_code)} &mdash; ${escapeHtml(item.brand_and_strength)} (${item.current_balance} ${escapeHtml(item.package_form)}s on hand)
            </option>
        `).join("");
    if (currentVal) sel.value = currentVal;
}

function renderNarcoticsLedger() {
    const tbody = document.getElementById("diNvLedgerBody");
    if (!tbody) return;

    const schedVal = document.getElementById("diNvScheduleFilter")?.value || "";
    const mtypeVal = document.getElementById("diNvMovementTypeFilter")?.value || "";
    const searchVal = (document.getElementById("diNarcoticsSearchInput")?.value || "").toLowerCase().trim();

    const filtered = allVaultMovements.filter(m => {
        if (schedVal && m.dea_schedule !== schedVal) return false;
        if (mtypeVal && m.movement_type !== mtypeVal) return false;
        if (searchVal) {
            const haystack = `${m.transaction_number} ${m.item_code} ${m.brand_and_strength} ${m.lot_number} ${m.reference_number || ""} ${m.ward_destination || ""} ${m.witness_1_name} ${m.witness_2_name}`.toLowerCase();
            if (!haystack.includes(searchVal)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="di-empty-state">No perpetual safe movements found matching filters.</td></tr>`;
        return;
    }

    const typeConfig = {
        transfer_to_ward: { label: "Ward Transfer Out", color: "#2563eb", bg: "#eff6ff" },
        receipt_po: { label: "Safe Intake (PO)", color: "#16a34a", bg: "#f0fdf4" },
        ward_return: { label: "Ward Return In", color: "#7c3aed", bg: "#f5f3ff" },
        destruction_waste: { label: "Destruction / Waste", color: "#dc2626", bg: "#fef2f2" },
        audit_adjustment: { label: "Audit Count Adj", color: "#d97706", bg: "#fffbeb" },
        rx_direct_dispense: { label: "Direct Dispense", color: "#0d9488", bg: "#f0fdfa" }
    };

    tbody.innerHTML = filtered.map(m => {
        const conf = typeConfig[m.movement_type] || { label: m.movement_type, color: "#475569", bg: "#f8fafc" };
        const isIn = m.quantity_in > 0;
        const qtyDisplay = isIn
            ? `<span style="font-weight:700; color:#16a34a;">+${m.quantity_in}</span>`
            : `<span style="font-weight:700; color:#dc2626;">-${m.quantity_out}</span>`;

        const schedColor = m.dea_schedule === "Schedule II" ? "#dc2626" : "#b45309";

        return `
            <tr>
                <td><strong>${escapeHtml(m.transaction_number)}</strong></td>
                <td style="font-size:12px; white-space:nowrap;">${escapeHtml(m.created_at)}</td>
                <td>
                    <div style="font-weight:600; color:#1e293b;">${escapeHtml(m.brand_and_strength)}</div>
                    <div style="font-size:11px; display:flex; gap:6px; align-items:center; margin-top:2px;">
                        <span style="font-family:monospace; background:var(--bg-surface-alt); padding:1px 4px; border-radius:3px;">${escapeHtml(m.item_code)}</span>
                        <span style="color:${schedColor}; font-weight:600;">${escapeHtml(m.dea_schedule)}</span>
                    </div>
                </td>
                <td>
                    <span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:11.5px; font-weight:600; background:${conf.bg}; color:${conf.color};">
                        ${escapeHtml(conf.label)}
                    </span>
                </td>
                <td style="font-size:12px;">
                    <div><strong>Lot:</strong> ${escapeHtml(m.lot_number)}</div>
                    <div style="color:var(--text-muted); font-size:11px;">Exp: ${m.lot_expiry ? escapeHtml(m.lot_expiry) : 'N/A'}</div>
                </td>
                <td style="font-size:13px; text-align:center;">
                    ${qtyDisplay} <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(m.package_form || 'units')}</span>
                </td>
                <td style="font-size:12px;">
                    <div style="color:var(--text-muted); font-size:11px;">Prev: ${m.balance_before}</div>
                    <div style="font-weight:700; color:#1e293b;">New: ${m.balance_after}</div>
                </td>
                <td style="font-size:12px;">
                    ${m.ward_destination ? `<div><strong>Ward:</strong> ${escapeHtml(m.ward_destination)}</div>` : ''}
                    ${m.reference_number ? `<div style="font-size:11px; color:var(--text-muted);">Ref: ${escapeHtml(m.reference_number)}</div>` : ''}
                    ${m.dual_custody_notes ? `<div style="font-style:italic; font-size:11px; color:var(--text-muted); margin-top:2px;">"${escapeHtml(m.dual_custody_notes)}"</div>` : ''}
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
                        <div style="display:flex; align-items:center; gap:4px;">
                            <span style="color:#16a34a;">&#10003;</span>
                            <strong>W1:</strong> ${escapeHtml(m.witness_1_name)}
                            <span style="color:var(--text-muted); font-size:10px;">(${escapeHtml(m.witness_1_auth_method)})</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px;">
                            <span style="color:#16a34a;">&#10003;</span>
                            <strong>W2:</strong> ${escapeHtml(m.witness_2_name)}
                            <span style="color:var(--text-muted); font-size:10px;">(${escapeHtml(m.witness_2_auth_method)})</span>
                        </div>
                    </div>
                </td>
                <td>
                    <button type="button" class="di-btn" style="padding:2px 8px; font-size:11px;" onclick="window.diQuickTransferItem(${m.vault_item_id})">
                        Transfer Out
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function renderNarcoticsInventory() {
    const tbody = document.getElementById("diNvInventoryBody");
    if (!tbody) return;

    const schedVal = document.getElementById("diNvScheduleFilter")?.value || "";
    const searchVal = (document.getElementById("diNarcoticsSearchInput")?.value || "").toLowerCase().trim();

    const filtered = allVaultItems.filter(item => {
        if (schedVal && item.dea_schedule !== schedVal) return false;
        if (searchVal) {
            const haystack = `${item.item_code} ${item.brand_and_strength} ${item.safe_location} ${item.catalog_drug_name}`.toLowerCase();
            if (!haystack.includes(searchVal)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="di-empty-state">No controlled substances found in central safe.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const schedColor = item.dea_schedule === "Schedule II" ? "#dc2626" : "#b45309";
        const balColor = item.is_low_stock ? "#dc2626" : "#16a34a";
        const statusBadge = item.is_low_stock
            ? `<span style="padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:#fef2f2; color:#dc2626;">&#9888; LOW PAR</span>`
            : `<span style="padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; background:#f0fdf4; color:#16a34a;">In Par</span>`;

        return `
            <tr>
                <td><strong style="font-family:monospace;">${escapeHtml(item.item_code)}</strong></td>
                <td>
                    <div style="font-weight:600; color:#1e293b;">${escapeHtml(item.brand_and_strength)}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.catalog_drug_name)}</div>
                </td>
                <td><span style="font-weight:700; color:${schedColor};">${escapeHtml(item.dea_schedule)}</span></td>
                <td style="font-size:12px;">${escapeHtml(item.safe_location)}</td>
                <td style="font-size:12px; text-transform:capitalize;">${escapeHtml(item.package_form)}</td>
                <td style="font-size:15px; font-weight:700; color:${balColor};">
                    ${item.current_balance} <span style="font-size:11px; font-weight:normal; color:var(--text-muted);">${escapeHtml(item.package_form)}s</span>
                </td>
                <td style="font-size:12px;">
                    Min: <strong>${item.minimum_safe_par}</strong> · Max: <strong>${item.maximum_safe_capacity}</strong>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button type="button" class="di-btn primary" style="background:#b45309; border-color:#b45309; padding:2px 8px; font-size:11px;" onclick="window.diQuickTransferItem(${item.id})">
                            &#128272; Transfer
                        </button>
                        <button type="button" class="di-btn" style="padding:2px 8px; font-size:11px;" onclick="window.diQuickReturnItem(${item.id})">
                            Return
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function renderShiftAudits() {
    const tbody = document.getElementById("diNvAuditsBody");
    if (!tbody) return;

    if (allShiftAudits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="di-empty-state">No shift safe count audits recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = allShiftAudits.map(a => {
        const isBalanced = (a.discrepancies_detected === 0 && a.status === "balanced_verified");
        const statusBadge = isBalanced
            ? `<span style="padding:3px 8px; border-radius:12px; font-size:11.5px; font-weight:700; background:#f0fdf4; color:#16a34a;">&#9989; 100% Balanced</span>`
            : `<span style="padding:3px 8px; border-radius:12px; font-size:11.5px; font-weight:700; background:#fef2f2; color:#dc2626;">&#9888; ${a.discrepancies_detected} Variance(s)</span>`;

        const sealBadge = a.safe_seal_intact
            ? `<span style="color:#16a34a; font-size:12px;">&#10003; Intact ${a.safe_seal_number ? `(${escapeHtml(a.safe_seal_number)})` : ''}</span>`
            : `<span style="color:#dc2626; font-size:12px; font-weight:700;">&#9888; Broken / Replaced</span>`;

        return `
            <tr>
                <td><strong>${escapeHtml(a.audit_number)}</strong></td>
                <td style="font-weight:600;">${escapeHtml(a.shift_name)}</td>
                <td style="font-size:12px;">${escapeHtml(a.audit_date)}</td>
                <td>${sealBadge}</td>
                <td style="font-size:12px;">
                    <div>${escapeHtml(a.auditor_1_name)}</div>
                    <div style="font-size:10px; color:var(--text-muted);">${escapeHtml(a.auditor_1_role)}</div>
                </td>
                <td style="font-size:12px;">
                    <div>${escapeHtml(a.auditor_2_name)}</div>
                    <div style="font-size:10px; color:var(--text-muted);">${escapeHtml(a.auditor_2_role)}</div>
                </td>
                <td style="text-align:center; font-weight:600;">${a.total_items_counted}</td>
                <td style="text-align:center; font-weight:700; color:${a.discrepancies_detected > 0 ? '#dc2626' : '#16a34a'};">
                    ${a.discrepancies_detected}
                </td>
                <td>${statusBadge}</td>
                <td>
                    <button type="button" class="di-btn" style="padding:2px 8px; font-size:11px;" onclick="window.diViewShiftAuditDetail(${a.id})">
                        View Log
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Global quick actions for inline buttons
window.diQuickTransferItem = function(itemId) {
    openNarcoticsMovementModal(itemId, "transfer_to_ward");
};

window.diQuickReturnItem = function(itemId) {
    openNarcoticsMovementModal(itemId, "ward_return");
};

window.diViewShiftAuditDetail = function(auditId) {
    const audit = allShiftAudits.find(a => a.id === auditId);
    if (!audit) return;
    const itemsHtml = (audit.items || []).map(it => `
        <tr>
            <td><strong>${escapeHtml(it.item_code)}</strong></td>
            <td>${escapeHtml(it.brand_and_strength)}</td>
            <td>${it.book_balance}</td>
            <td style="font-weight:700;">${it.physical_count}</td>
            <td style="font-weight:700; color:${Math.abs(it.variance) > 0.001 ? '#dc2626' : '#16a34a'};">
                ${it.variance > 0 ? `+${it.variance}` : it.variance}
            </td>
            <td>${it.variance_reason ? escapeHtml(it.variance_reason) : '&mdash;'}</td>
        </tr>
    `).join("");

    alert(`Audit ${audit.audit_number} (${audit.shift_name} on ${audit.audit_date})\nAuditors: ${audit.auditor_1_name} & ${audit.auditor_2_name}\nSeal: ${audit.safe_seal_intact ? 'Intact' : 'Broken'}\nDiscrepancies: ${audit.discrepancies_detected}\nNotes: ${audit.audit_notes || 'None'}`);
};

function openNarcoticsMovementModal(itemId = null, defaultType = "transfer_to_ward") {
    populateVaultItemSelect();
    const sel = document.getElementById("di_mov_vault_item_id");
    if (sel && itemId) {
        sel.value = itemId;
        sel.dispatchEvent(new Event("change"));
    }

    const typeSel = document.getElementById("di_mov_type");
    if (typeSel && defaultType) typeSel.value = defaultType;

    // Reset inputs
    document.getElementById("di_mov_quantity").value = "";
    document.getElementById("di_mov_lot_number").value = "";
    document.getElementById("di_mov_lot_expiry").value = "";
    document.getElementById("di_mov_reference_number").value = "";
    document.getElementById("di_mov_ward_destination").value = "";
    document.getElementById("di_mov_notes").value = "";
    document.getElementById("di_mov_w1_user").value = "";
    document.getElementById("di_mov_w1_pin").value = "";
    document.getElementById("di_mov_w2_user").value = "";
    document.getElementById("di_mov_w2_pin").value = "";

    const err = document.getElementById("diMovWitnessError");
    if (err) { err.style.display = "none"; err.textContent = ""; }

    const overlay = document.getElementById("diNarcoticsMovementModalOverlay");
    if (overlay) overlay.classList.add("active");
}

function closeNarcoticsMovementModal() {
    const overlay = document.getElementById("diNarcoticsMovementModalOverlay");
    if (overlay) overlay.classList.remove("active");
}

async function handleNarcoticsMovementSubmit(e) {
    e.preventDefault();
    const err = document.getElementById("diMovWitnessError");
    if (err) err.style.display = "none";

    const vaultItemId = parseInt(document.getElementById("di_mov_vault_item_id").value, 10);
    const movementType = document.getElementById("di_mov_type").value;
    const quantity = parseFloat(document.getElementById("di_mov_quantity").value);
    const lotNumber = document.getElementById("di_mov_lot_number").value.trim();
    const lotExpiry = document.getElementById("di_mov_lot_expiry").value;
    const referenceNumber = document.getElementById("di_mov_reference_number").value.trim();
    const wardDestination = document.getElementById("di_mov_ward_destination").value.trim();
    const notes = document.getElementById("di_mov_notes").value.trim();

    const w1User = document.getElementById("di_mov_w1_user").value.trim();
    const w1Pin = document.getElementById("di_mov_w1_pin").value.trim();
    const w2User = document.getElementById("di_mov_w2_user").value.trim();
    const w2Pin = document.getElementById("di_mov_w2_pin").value.trim();

    if (!vaultItemId || !movementType || !quantity || !lotNumber) {
        showToast("Please fill all required movement fields.", "error");
        return;
    }

    if (!w1User || !w1Pin || !w2User || !w2Pin) {
        if (err) {
            err.textContent = "Both Witness 1 and Witness 2 must provide their Username and Security PIN / Password.";
            err.style.display = "block";
        }
        return;
    }

    if (w1User.toLowerCase() === w2User.toLowerCase()) {
        if (err) {
            err.textContent = "Dual Custody Mandate: Witness 1 and Witness 2 cannot be the same user account.";
            err.style.display = "block";
        }
        return;
    }

    try {
        const payload = {
            vault_item_id: vaultItemId,
            movement_type: movementType,
            quantity: quantity,
            lot_number: lotNumber,
            lot_expiry: lotExpiry || null,
            reference_number: referenceNumber || null,
            ward_destination: wardDestination || null,
            dual_custody_notes: notes || null,
            witness_1_username: w1User,
            witness_1_pin: w1Pin,
            witness_2_username: w2User,
            witness_2_pin: w2Pin
        };

        const res = await recordNarcoticsVaultMovement(payload);
        if (res.success) {
            showToast(res.message, "success");
            closeNarcoticsMovementModal();
            loadNarcoticsStats();
            loadNarcoticsItems();
            loadNarcoticsMovements();
        } else {
            if (err) {
                err.textContent = res.message;
                err.style.display = "block";
            }
            showToast(res.message, "error");
        }
    } catch (error) {
        if (err) {
            err.textContent = error.message;
            err.style.display = "block";
        }
        showToast("Movement failed: " + error.message, "error");
    }
}

function openShiftAuditModal() {
    const dateInput = document.getElementById("di_audit_date");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    document.getElementById("di_audit_seal_number").value = "";
    document.getElementById("di_audit_seal_intact").checked = true;
    document.getElementById("di_audit_notes").value = "";
    document.getElementById("di_audit_a1_user").value = "";
    document.getElementById("di_audit_a1_pin").value = "";
    document.getElementById("di_audit_a2_user").value = "";
    document.getElementById("di_audit_a2_pin").value = "";

    const err = document.getElementById("diAuditWitnessError");
    if (err) { err.style.display = "none"; err.textContent = ""; }

    // Render count table
    const tbody = document.getElementById("diAuditItemsCountBody");
    if (tbody) {
        if (allVaultItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="di-empty-state">No safe items to count.</td></tr>`;
        } else {
            tbody.innerHTML = allVaultItems.map(item => `
                <tr data-vault-item-id="${item.id}" data-book-bal="${item.current_balance}">
                    <td><strong>${escapeHtml(item.item_code)}</strong></td>
                    <td>
                        <div style="font-weight:600;">${escapeHtml(item.brand_and_strength)}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.dea_schedule)}</div>
                    </td>
                    <td style="font-size:12px;">${escapeHtml(item.safe_location)}</td>
                    <td style="font-size:14px; font-weight:700; color:#1e293b;">
                        ${item.current_balance} ${escapeHtml(item.package_form)}s
                    </td>
                    <td>
                        <input type="number" step="1" min="0" class="di-phys-count-input" data-item-id="${item.id}" value="${item.current_balance}" style="width:100px; height:28px; padding:0 6px; font-weight:700; text-align:right;" required>
                    </td>
                    <td class="di-variance-cell" data-item-id="${item.id}" style="font-weight:700; color:#16a34a;">
                        0.00
                    </td>
                    <td>
                        <input type="text" class="di-variance-reason-input" data-item-id="${item.id}" placeholder="Required if variance != 0" style="width:100%; height:28px; padding:0 6px; font-size:12px;">
                    </td>
                </tr>
            `).join("");

            // Attach input event listeners for live variance updates
            tbody.querySelectorAll(".di-phys-count-input").forEach(inp => {
                inp.addEventListener("input", () => {
                    const id = inp.getAttribute("data-item-id");
                    const row = inp.closest("tr");
                    const bookBal = parseFloat(row.getAttribute("data-book-bal") || "0");
                    const phys = parseFloat(inp.value || "0");
                    const diff = Math.round((phys - bookBal) * 100) / 100;
                    const varCell = row.querySelector(".di-variance-cell");
                    if (varCell) {
                        varCell.textContent = diff > 0 ? `+${diff}` : `${diff}`;
                        varCell.style.color = Math.abs(diff) > 0.001 ? "#dc2626" : "#16a34a";
                    }
                });
            });
        }
    }

    const overlay = document.getElementById("diNarcoticsShiftAuditModalOverlay");
    if (overlay) overlay.classList.add("active");
}

function closeShiftAuditModal() {
    const overlay = document.getElementById("diNarcoticsShiftAuditModalOverlay");
    if (overlay) overlay.classList.remove("active");
}

async function handleShiftAuditSubmit(e) {
    e.preventDefault();
    const err = document.getElementById("diAuditWitnessError");
    if (err) err.style.display = "none";

    const shiftName = document.getElementById("di_audit_shift_name").value;
    const auditDate = document.getElementById("di_audit_date").value;
    const sealNumber = document.getElementById("di_audit_seal_number").value.trim();
    const sealIntact = document.getElementById("di_audit_seal_intact").checked;
    const notes = document.getElementById("di_audit_notes").value.trim();

    const a1User = document.getElementById("di_audit_a1_user").value.trim();
    const a1Pin = document.getElementById("di_audit_a1_pin").value.trim();
    const a2User = document.getElementById("di_audit_a2_user").value.trim();
    const a2Pin = document.getElementById("di_audit_a2_pin").value.trim();

    if (!a1User || !a1Pin || !a2User || !a2Pin) {
        if (err) {
            err.textContent = "Both Auditor 1 and Auditor 2 must enter their Username and Security PIN / Password.";
            err.style.display = "block";
        }
        return;
    }

    if (a1User.toLowerCase() === a2User.toLowerCase()) {
        if (err) {
            err.textContent = "Dual Auditor Mandate: End-of-shift safe count must be co-verified by two separate staff members.";
            err.style.display = "block";
        }
        return;
    }

    // Collect physical counts
    const countRows = document.querySelectorAll("#diAuditItemsCountBody tr[data-vault-item-id]");
    const items = [];
    for (const row of countRows) {
        const vItemId = parseInt(row.getAttribute("data-vault-item-id"), 10);
        const countInput = row.querySelector(".di-phys-count-input");
        const reasonInput = row.querySelector(".di-variance-reason-input");
        const physCount = countInput ? parseFloat(countInput.value || "0") : 0;
        const reason = reasonInput ? reasonInput.value.trim() : "";

        items.push({
            vault_item_id: vItemId,
            physical_count: physCount,
            variance_reason: reason
        });
    }

    try {
        const payload = {
            shift_name: shiftName,
            audit_date: auditDate,
            safe_seal_intact: sealIntact ? 1 : 0,
            safe_seal_number: sealNumber || null,
            audit_notes: notes || null,
            auditor_1_username: a1User,
            auditor_1_pin: a1Pin,
            auditor_2_username: a2User,
            auditor_2_pin: a2Pin,
            items: items
        };

        const res = await recordShiftAudit(payload);
        if (res.success) {
            showToast(res.message, res.discrepancies_detected > 0 ? "warning" : "success");
            closeShiftAuditModal();
            loadNarcoticsStats();
            loadShiftAudits();
        } else {
            if (err) {
                err.textContent = res.message;
                err.style.display = "block";
            }
            showToast(res.message, "error");
        }
    } catch (error) {
        if (err) {
            err.textContent = error.message;
            err.style.display = "block";
        }
        showToast("Shift audit failed: " + error.message, "error");
    }
}

function openPinSetupModal() {
    document.getElementById("di_pin_curr_pwd").value = "";
    document.getElementById("di_pin_val").value = "";
    document.getElementById("di_pin_val_confirm").value = "";
    const status = document.getElementById("diSetPinStatus");
    if (status) { status.style.display = "none"; status.textContent = ""; }

    const overlay = document.getElementById("diNarcoticsSetPinModalOverlay");
    if (overlay) overlay.classList.add("active");
}

function closePinSetupModal() {
    const overlay = document.getElementById("diNarcoticsSetPinModalOverlay");
    if (overlay) overlay.classList.remove("active");
}

async function handleSetPinSubmit(e) {
    e.preventDefault();
    const status = document.getElementById("diSetPinStatus");
    if (status) status.style.display = "none";

    const currPwd = document.getElementById("di_pin_curr_pwd").value;
    const newPin = document.getElementById("di_pin_val").value.trim();
    const confirmPin = document.getElementById("di_pin_val_confirm").value.trim();

    if (!/^\d{4,8}$/.test(newPin)) {
        if (status) {
            status.textContent = "Security PIN must be 4 to 8 numeric digits.";
            status.style.color = "#dc2626";
            status.style.display = "block";
        }
        return;
    }

    if (newPin !== confirmPin) {
        if (status) {
            status.textContent = "PIN confirmation does not match.";
            status.style.color = "#dc2626";
            status.style.display = "block";
        }
        return;
    }

    try {
        const res = await setSecurityPin(newPin, currPwd);
        if (res.success) {
            showToast("Security PIN updated successfully!", "success");
            closePinSetupModal();
        } else {
            if (status) {
                status.textContent = res.message;
                status.style.color = "#dc2626";
                status.style.display = "block";
            }
        }
    } catch (error) {
        if (status) {
            status.textContent = error.message;
            status.style.color = "#dc2626";
            status.style.display = "block";
        }
    }
}
