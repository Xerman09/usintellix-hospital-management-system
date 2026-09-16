import { fetchFinancialSummaryByServiceCode } from "./financial-summary-service-code.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { logReportRun } from "./report-history.js";

export async function initFinancialSummaryServiceCodeReport() {
    await Promise.all([loadFacilities(), loadProviders()]);

    document.getElementById("fscSubmitBtn")?.addEventListener("click", fetchReport);
}

async function loadFacilities() {
    const select = document.getElementById("fscFacility");
    if (!select) return;

    const result = await fetchFacilities();

    if (result.success) {
        result.data.forEach((facility) => {
            const option = document.createElement("option");
            option.value = facility.id;
            option.textContent = facility.name;
            select.appendChild(option);
        });
    }
}

async function loadProviders() {
    const select = document.getElementById("fscProvider");
    if (!select) return;

    const result = await fetchProviders();

    if (result.success) {
        result.data.forEach((provider) => {
            const option = document.createElement("option");
            option.value = provider.id;
            option.textContent = `${provider.last_name}, ${provider.first_name}`;
            select.appendChild(option);
        });
    }
}

async function fetchReport() {
    const facilityId = document.getElementById("fscFacility")?.value || "";
    const providerId = document.getElementById("fscProvider")?.value || "";
    const dateFrom = document.getElementById("fscDateFrom")?.value || "";
    const dateTo = document.getElementById("fscDateTo")?.value || "";

    const instructionText = document.getElementById("fscInstructionText");
    const resultsArea = document.getElementById("fscResultsArea");
    const tbody = document.getElementById("fscTableBody");

    if (!tbody || !resultsArea) return;

    if (instructionText) instructionText.style.display = "none";
    resultsArea.style.display = "block";

    tbody.innerHTML = `<tr><td colspan="5" class="fsc-empty-state">Loading data...</td></tr>`;

    const result = await fetchFinancialSummaryByServiceCode({
        facility_id: facilityId,
        provider_id: providerId,
        date_from: dateFrom,
        date_to: dateTo
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="5" class="fsc-empty-state">Failed to load data.</td></tr>`;
        updateGrandTotal(0, 0);
        return;
    }

    renderTable(result.data || []);
    logReportRun("Financial Summary by Service Code", "financial_summary_by_service_code", {
        facility_id: facilityId, provider_id: providerId, date_from: dateFrom, date_to: dateTo
    });
}

function renderTable(rows) {
    const tbody = document.getElementById("fscTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="fsc-empty-state">No data available for the selected criteria.</td></tr>`;
        updateGrandTotal(0, 0);
        return;
    }

    let grandQty = 0;
    let grandCharges = 0;

    tbody.innerHTML = rows.map((row) => {
        const qty = Number(row.qty || 0);
        const charges = Number(row.charges || 0);

        grandQty += qty;
        grandCharges += charges;

        return `
            <tr>
                <td>${escapeHtml(row.code_type)}</td>
                <td>${escapeHtml(row.code)}</td>
                <td>${escapeHtml(row.description)}</td>
                <td style="text-align: right;">${qty}</td>
                <td style="text-align: right;">${charges.toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    updateGrandTotal(grandQty, grandCharges);
}

function updateGrandTotal(qty, charges) {
    document.getElementById("fscGrandQty").textContent = qty;
    document.getElementById("fscGrandCharges").textContent = Number(charges).toFixed(2);
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
