import { fetchInventoryTransactions } from "./inventory-transactions.service.js";

export async function initInventoryTransactionsReport() {
    document.getElementById("itSubmitBtn").addEventListener("click", loadTransactions);
}

async function loadTransactions() {
    const tbody = document.getElementById("itTableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="it-empty-state">Loading...</td></tr>`;

    const result = await fetchInventoryTransactions({
        type: document.getElementById("itType").value,
        date_from: document.getElementById("itDateFrom").value,
        date_to: document.getElementById("itDateTo").value
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="it-empty-state">Failed to load transactions.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
}

function renderTable(rows) {
    const tbody = document.getElementById("itTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="it-empty-state">No inventory transactions found for the selected criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => {
        const badgeClass = row.type === "Destroyed" ? "destroyed" : "transfer";

        return `
            <tr>
                <td>${formatDateTime(row.event_date)}</td>
                <td><span class="it-type-badge ${badgeClass}">${escapeHtml(row.type)}</span></td>
                <td>${escapeHtml(row.drug_name)}</td>
                <td>${escapeHtml(row.ndc || "-")}</td>
                <td style="text-align: right;">${formatQuantity(row.quantity)}</td>
                <td>${escapeHtml(row.detail)}</td>
                <td>${escapeHtml(row.recorded_by || "-")}</td>
            </tr>
        `;
    }).join("");
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
