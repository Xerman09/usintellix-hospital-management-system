import { api } from "../../core/api.js";

export async function initCareCoordination() {
    try {
        const data = await api('/care-coordination');
        renderTable(data);
        attachExpandListeners();
    } catch (e) {
        console.error("Failed to load care coordination data", e);
        const tbody = document.getElementById("careCoordinationTableBody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: red;">Failed to load data.</td></tr>`;
    }
}

function renderTable(data) {
    const tbody = document.getElementById("careCoordinationTableBody");
    if (!tbody) return;

    let html = "";
    if (data.length === 0) {
        html = `<tr><td colspan="11" style="text-align: center;">No records found.</td></tr>`;
    } else {
        data.forEach((row, idx) => {
            const isExpanded = false; // default collapsed
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; ${isExpanded ? 'background-color: #f8fafc;' : ''}">
                    <td style="text-align: center; cursor: pointer;" class="expand-toggle" data-idx="${idx}">
                        <span style="display: inline-block; transform: ${isExpanded ? 'rotate(90deg)' : 'rotate(0)'}; transition: transform 0.2s;">▶</span>
                    </td>
                    <td>${row.id})</td>
                    <td>${row.pid}</td>
                    <td style="color: #64748b;">${escapeHtml(row.name)}</td>
                    <td>${row.encounterCount}</td>
                    <td>${row.totalTransfers}</td>
                    <td>${row.successfulTransfers}</td>
                    <td>${escapeHtml(row.lastVisit)}</td>
                    <td>${escapeHtml(row.creationDate)}</td>
                    <td style="text-align: center;"><input type="checkbox"></td>
                    <td style="text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; opacity: 0.5;">
                            <div style="width: 14px; height: 14px; background: #94a3b8; border-radius: 2px;"></div>
                            <div style="width: 14px; height: 14px; background: #94a3b8; border-radius: 2px;"></div>
                        </div>
                    </td>
                </tr>
            `;

            if (row.encounters && row.encounters.length > 0) {
                html += `
                    <tr class="nested-row nested-row-${idx}" style="display: ${isExpanded ? 'table-row' : 'none'};">
                        <td colspan="11" style="padding: 12px 40px; background-color: white; border-bottom: 1px solid #e2e8f0;">
                            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                                <thead style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                                    <tr>
                                        <th style="padding: 8px; text-align: left;">#</th>
                                        <th style="padding: 8px; text-align: left;">Encounter</th>
                                        <th style="padding: 8px; text-align: left;">DOS</th>
                                        <th style="padding: 8px; text-align: center;">Transferred Date</th>
                                        <th style="padding: 8px; text-align: center;">Transferred By</th>
                                        <th style="padding: 8px; text-align: left;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${row.encounters.map(enc => `
                                        <tr>
                                            <td style="padding: 8px;">${escapeHtml(enc.id)}</td>
                                            <td style="padding: 8px;">Encounter ${escapeHtml(enc.id)}</td>
                                            <td style="padding: 8px;">${escapeHtml(enc.dos)}</td>
                                            <td style="padding: 8px; text-align: center;">${escapeHtml(enc.transferredDate)}</td>
                                            <td style="padding: 8px; text-align: center;">${escapeHtml(enc.transferredBy)}</td>
                                            <td style="padding: 8px;">${escapeHtml(enc.status)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                `;
            }
        });
    }

    tbody.innerHTML = html;
}

function attachExpandListeners() {
    const tbody = document.getElementById("careCoordinationTableBody");
    if (!tbody) return;

    tbody.addEventListener("click", (e) => {
        const toggleBtn = e.target.closest('.expand-toggle');
        if (toggleBtn) {
            const idx = toggleBtn.getAttribute('data-idx');
            const nestedRow = tbody.querySelector(`.nested-row-${idx}`);
            if (nestedRow) {
                const isHidden = nestedRow.style.display === 'none';
                nestedRow.style.display = isHidden ? 'table-row' : 'none';
                
                const icon = toggleBtn.querySelector('span');
                if (icon) {
                    icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0)';
                }
                
                const parentRow = toggleBtn.closest('tr');
                if (isHidden) {
                    parentRow.style.backgroundColor = '#f8fafc';
                } else {
                    parentRow.style.backgroundColor = 'transparent';
                }
            }
        }
    });
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
