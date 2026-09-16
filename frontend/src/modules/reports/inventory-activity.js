import { fetchInventoryActivity } from "./inventory-activity.service.js";

export async function initInventoryActivityReport() {
    document.getElementById("iaRefreshBtn").addEventListener("click", loadActivity);

    await loadActivity();
}

async function loadActivity() {
    const tbody = document.getElementById("iaTableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="ia-empty-state">Loading...</td></tr>`;

    const result = await fetchInventoryActivity({
        date_from: document.getElementById("iaDateFrom").value,
        date_to: document.getElementById("iaDateTo").value
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="ia-empty-state">Failed to load activity.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
}

function renderTable(rows) {
    const tbody = document.getElementById("iaTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="ia-empty-state">No inventory activity found for the selected range.</td></tr>`;
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
