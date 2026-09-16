import { fetchInsuranceDistribution } from "./insurance-distribution.service.js";

export async function initInsuranceDistributionReport() {
    document.getElementById("pidSubmitBtn").addEventListener("click", loadReport);
}

async function loadReport() {
    const tbody = document.getElementById("pidTableBody");
    const tfoot = document.getElementById("pidTableFoot");

    tbody.innerHTML = `<tr><td colspan="5" class="pid-empty-state">Loading...</td></tr>`;
    tfoot.innerHTML = "";

    const result = await fetchInsuranceDistribution({
        date_from: document.getElementById("pidDateFrom").value,
        date_to: document.getElementById("pidDateTo").value
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="5" class="pid-empty-state">Failed to load data.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
}

function renderTable(rows) {
    const tbody = document.getElementById("pidTableBody");
    const tfoot = document.getElementById("pidTableFoot");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="pid-empty-state">No visits found for the selected criteria.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    let totalCharges = 0;
    let totalVisits = 0;
    let totalPatients = 0;

    tbody.innerHTML = rows.map((row) => {
        totalCharges += Number(row.charges || 0);
        totalVisits += Number(row.visits || 0);
        totalPatients += Number(row.patients || 0);

        return `
            <tr>
                <td>${escapeHtml(row.primary_insurance)}</td>
                <td style="text-align: right;">${Number(row.charges || 0).toFixed(2)}</td>
                <td style="text-align: right;">${row.visits}</td>
                <td style="text-align: right;">${row.patients}</td>
                <td style="text-align: right;">${Number(row.pt_percent || 0).toFixed(1)}%</td>
            </tr>
        `;
    }).join("");

    tfoot.innerHTML = `
        <tr>
            <td>Total</td>
            <td style="text-align: right;">${totalCharges.toFixed(2)}</td>
            <td style="text-align: right;">${totalVisits}</td>
            <td style="text-align: right;">${totalPatients}</td>
            <td style="text-align: right;">100.0%</td>
        </tr>
    `;
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
