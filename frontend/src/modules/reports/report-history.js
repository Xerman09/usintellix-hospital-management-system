import { api } from "../../core/api.js";

async function fetchReportHistory() {
    const dateFrom = document.getElementById("rhDateFrom")?.value || "";
    const dateTo = document.getElementById("rhDateTo")?.value || "";
    const tbody = document.getElementById("rhTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">Loading...</td></tr>`;

    try {
        const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
        const result = await api(`/reports/history?${params.toString()}`);

        if (result.success) {
            renderRhTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; text-align: center; color: red;">Failed to load: ${result.message}</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; text-align: center; color: red;">Error fetching report history.</td></tr>`;
        console.error("Report History Error:", err);
    }
}

function renderRhTable(data) {
    const tbody = document.getElementById("rhTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">No report history found for the selected date range.</td></tr>`;
        return;
    }

    data.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.style.backgroundColor = idx % 2 === 0 ? "white" : "#f7fafc";

        const statusColor = item.status === 'Completed' ? '#276749' : item.status === 'Failed' ? '#c53030' : '#2b6cb0';
        tr.innerHTML = `
            <td style="padding: 10px 16px; color: #2b6cb0;">${item.title || ''}</td>
            <td style="padding: 10px 16px; color: #4a5568;">${item.date || ''}</td>
            <td style="padding: 10px 16px; color: ${statusColor}; font-weight: 500;">${item.status || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Call this from any report submit handler to log the report run.
 * @param {string} title - Human readable report name
 * @param {string} reportType - Internal type identifier
 * @param {object} filters - The filter values used
 */
export async function logReportRun(title, reportType, filters = {}) {
    try {
        await api("/reports/history", {
            method: "POST",
            body: JSON.stringify({ title, report_type: reportType, status: "Completed", filters }),
        });
    } catch (err) {
        // Non-critical — don't block the report from showing
        console.warn("Could not log report run:", err);
    }
}

export function initReportHistory() {
    const form = document.getElementById("rhForm");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            fetchReportHistory();
        });
    }

    const refreshBtn = document.getElementById("rhRefreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchReportHistory);
    }

    // Auto-load on open
    fetchReportHistory();
}
