import { fetchUniqueSeenPatients } from "./unique-seen-patients.service.js";

export async function initUniqueSeenPatientsReport() {
    document.getElementById("uspSubmitBtn").addEventListener("click", loadReport);
}

async function loadReport() {
    const tbody = document.getElementById("uspTableBody");
    const tfoot = document.getElementById("uspTableFoot");

    tbody.innerHTML = `<tr><td colspan="8" class="usp-empty-state">Loading...</td></tr>`;
    tfoot.innerHTML = "";

    const result = await fetchUniqueSeenPatients({
        date_from: document.getElementById("uspDateFrom").value,
        date_to: document.getElementById("uspDateTo").value
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="usp-empty-state">Failed to load data.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
}

function renderTable(rows) {
    const tbody = document.getElementById("uspTableBody");
    const tfoot = document.getElementById("uspTableFoot");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="usp-empty-state">No visits found for the selected criteria.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    let totalVisits = 0;

    tbody.innerHTML = rows.map((row) => {
        totalVisits += Number(row.visits || 0);

        return `
            <tr>
                <td>${formatDate(row.last_visit)}</td>
                <td>${escapeHtml(row.patient_name)}</td>
                <td style="text-align: right;">${row.visits}</td>
                <td style="text-align: right;">${row.age ?? "-"}</td>
                <td>${escapeHtml(capitalize(row.sex) || "-")}</td>
                <td>${escapeHtml(row.race || "-")}</td>
                <td>${escapeHtml(row.primary_insurance || "-")}</td>
                <td>${escapeHtml(row.secondary_insurance || "-")}</td>
            </tr>
        `;
    }).join("");

    tfoot.innerHTML = `
        <tr>
            <td colspan="2">Total</td>
            <td style="text-align: right;">${totalVisits}</td>
            <td colspan="5">${rows.length} unique patient${rows.length === 1 ? "" : "s"}</td>
        </tr>
    `;
}

function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB");
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
