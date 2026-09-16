import { fetchInventoryActivity } from "./inventory-activity.service.js";
import { fetchDrugInventoryOptions } from "../drug-inventory/drug-inventory.service.js";

const FOR_OPTIONS = {
    product: { placeholder: "-- All Products --", key: "drugs" },
    warehouse: { placeholder: "-- All Warehouses --", key: "warehouses" },
    facility: { placeholder: "-- All Facilities --", key: "facilities" }
};

const GROUP_LABELS = {
    product: "Product",
    warehouse: "Warehouse",
    facility: "Facility"
};

let options = { drugs: [], warehouses: [], facilities: [] };

export async function initInventoryActivityReport() {
    await loadOptions();
    populateForSelect("product");

    document.getElementById("iaBy").addEventListener("change", (event) => {
        populateForSelect(event.target.value);
    });

    document.getElementById("iaSubmitBtn").addEventListener("click", loadActivity);
}

async function loadOptions() {
    const result = await fetchDrugInventoryOptions();

    if (result.success) {
        options = {
            drugs: result.data.drugs || [],
            warehouses: result.data.warehouses || [],
            facilities: result.data.facilities || []
        };
    }
}

function populateForSelect(by) {
    const config = FOR_OPTIONS[by] || FOR_OPTIONS.product;
    const select = document.getElementById("iaFor");

    select.innerHTML = `<option value="">${config.placeholder}</option>`;
    (options[config.key] || []).forEach((item) => {
        select.appendChild(new Option(item.name, item.id));
    });
}

async function loadActivity() {
    const by = document.getElementById("iaBy").value;
    const forId = document.getElementById("iaFor").value;
    const details = document.getElementById("iaDetails").checked;

    const tbody = document.getElementById("iaTableBody");
    renderHead(details, by);
    tbody.innerHTML = `<tr><td colspan="7" class="ia-empty-state">Loading...</td></tr>`;

    const result = await fetchInventoryActivity({
        date_from: document.getElementById("iaDateFrom").value,
        date_to: document.getElementById("iaDateTo").value,
        by,
        for_id: forId,
        details
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="ia-empty-state">Failed to load activity.</td></tr>`;
        return;
    }

    if (details) {
        renderDetailTable(result.data || []);
    } else {
        renderSummaryTable(result.data || [], by);
    }
}

function renderHead(details, by) {
    const thead = document.getElementById("iaTableHead");

    thead.innerHTML = details
        ? `<tr><th>Date</th><th>Type</th><th>Drug</th><th>NDC</th><th style="text-align: right;">Qty</th><th>Detail</th><th>Recorded By</th></tr>`
        : `<tr><th>${GROUP_LABELS[by] || "Group"}</th><th style="text-align: right;">Transferred</th><th style="text-align: right;">Destroyed</th><th style="text-align: right;">Events</th></tr>`;
}

function renderDetailTable(rows) {
    const tbody = document.getElementById("iaTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="ia-empty-state">No inventory activity found for the selected criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => {
        const badgeClass = row.type === "Destroyed" ? "destroyed" : "transfer";

        return `
            <tr>
                <td>${formatDateTime(row.event_date)}</td>
                <td><span class="ia-type-badge ${badgeClass}">${escapeHtml(row.type)}</span></td>
                <td>${escapeHtml(row.drug_name)}</td>
                <td>${escapeHtml(row.ndc || "-")}</td>
                <td style="text-align: right;">${formatQuantity(row.quantity)}</td>
                <td>${escapeHtml(row.detail)}</td>
                <td>${escapeHtml(row.recorded_by || "-")}</td>
            </tr>
        `;
    }).join("");
}

function renderSummaryTable(rows) {
    const tbody = document.getElementById("iaTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="ia-empty-state">No inventory activity found for the selected criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${escapeHtml(row.group_label)}</td>
            <td style="text-align: right;">${formatQuantity(row.transferred_qty)}</td>
            <td style="text-align: right;">${formatQuantity(row.destroyed_qty)}</td>
            <td style="text-align: right;">${row.event_count}</td>
        </tr>
    `).join("");
}

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, "");
}

function formatDateTime(value) {
    if (!value) return "";

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB") + " " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
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
