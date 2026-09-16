export function IndigentPatientsView() {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    return `
<style>
.indg-page {
    width: 100%;
    font-size: 13.5px;
}

.indg-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
}

.indg-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.indg-manage-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
}

.indg-manage-btn:hover { background: var(--bg-surface-alt); }

.indg-filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
    margin-bottom: 16px;
}

.indg-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.indg-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.3;
    white-space: nowrap;
}

.indg-filter-bar input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    color-scheme: light;
}

:root[data-theme="dark"] .indg-filter-bar input[type="date"] {
    color-scheme: dark;
}

.indg-divider {
    width: 1px;
    height: 24px;
    background: var(--border-color);
}

.indg-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 16px;
    border-radius: 5px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    margin-left: auto;
}

.indg-submit-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.indg-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.indg-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.indg-table th {
    text-align: left;
    padding: 10px 14px;
    color: var(--text-primary);
    font-weight: 700;
    font-size: 13px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.indg-table td {
    padding: 9px 14px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
    white-space: nowrap;
}

.indg-table tbody tr:last-child td { border-bottom: none; }

.indg-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.indg-table tfoot td {
    border-top: 2px solid var(--border-color);
    font-weight: 700;
    color: var(--text-primary);
}

.indg-manage-list {
    max-height: 260px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 14px;
}

.indg-manage-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    font-size: 13px;
    color: var(--text-primary);
}

.indg-manage-row:last-child { border-bottom: none; }

.indg-remove-btn {
    border: none;
    background: none;
    color: #b91c1c;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
}

:root[data-theme="dark"] .indg-remove-btn { color: #fca5a5; }

.indg-add-patient-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px;
    border-radius: 5px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
}

.indg-add-patient-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
</style>

<div class="indg-page">
    <div class="indg-toolbar">
        <h2 class="indg-title">Report - Indigent Patients</h2>
        <button type="button" class="indg-manage-btn" id="indgManageBtn">Manage Indigent List</button>
    </div>

    <div class="indg-filter-bar">
        <div class="indg-filter-group">
            <label>Visits<br>From:</label>
            <input type="date" id="indgDateFrom" value="${from}">
        </div>
        <div class="indg-filter-group">
            <label>To:</label>
            <input type="date" id="indgDateTo" value="${to}">
        </div>
        <div class="indg-divider"></div>
        <button type="button" class="indg-submit-btn" id="indgSubmitBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Submit
        </button>
    </div>

    <div class="indg-table-wrap">
        <table class="indg-table">
            <thead>
                <tr>
                    <th>Patient</th><th>SSN</th><th>Invoice</th><th>Svc Date</th><th>Due Date</th>
                    <th style="text-align: right;">Amount</th><th style="text-align: right;">Paid</th><th style="text-align: right;">Balance</th>
                </tr>
            </thead>
            <tbody id="indgTableBody"><tr><td colspan="8" class="indg-empty-state">Click Submit to view the report.</td></tr></tbody>
            <tfoot id="indgTableFoot"></tfoot>
        </table>
    </div>
</div>

<div class="modal-overlay" id="indgManageModalOverlay">
    <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
            <h2>Manage Indigent List</h2>
            <button type="button" class="modal-close" id="indgCloseManageModal">&times;</button>
        </div>

        <div id="indgManageAlert"></div>

        <div class="indg-manage-list" id="indgManageList"></div>

        <div class="form-actions" style="justify-content: flex-start;">
            <button type="button" class="indg-add-patient-btn" id="indgAddPatientBtn">+ Add Patient</button>
        </div>
    </div>
</div>

<div class="modal-overlay" id="patientPickerModalOverlay">
    <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
            <h2>Select Patient</h2>
            <button type="button" class="modal-close" id="closePatientPickerModal">&times;</button>
        </div>
        <input type="text" id="patientPickerSearch" class="form-input" placeholder="Search by name or patient no..." style="margin-bottom: 14px;">
        <div id="patientPickerList" style="max-height: 320px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;"></div>
    </div>
</div>
    `;
}
