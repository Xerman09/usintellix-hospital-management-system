export function RecallsView()
{
    return `
<style>
.rec-page {
    width: 100%;
    font-size: 13.5px;
}

.rec-card {
    width: 100%;
}

.rec-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
    flex-wrap: wrap;
}

.rec-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.rec-icon-badge {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 7px;
    border: 1px solid #dbe1ea;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.rec-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.rec-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.rec-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.rec-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s;
    white-space: nowrap;
}

.rec-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.rec-add-btn svg {
    width: 14px;
    height: 14px;
}

.rec-filters {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    margin: 18px 0;
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.rec-filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 150px;
}

.rec-filter-group label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
    color: #6b7787;
}

.rec-filter-group .form-input {
    height: 34px;
    padding: 0 10px;
    font-size: 12.5px;
}

.rec-filter-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.rec-filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.rec-filter-btn:hover {
    background: #1742b0;
}

.rec-filter-btn svg {
    width: 14px;
    height: 14px;
}

.rec-clear-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    background: white;
    color: #3b475a;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s, border-color .12s;
    white-space: nowrap;
}

.rec-clear-btn:hover {
    background: #f1f5f9;
    border-color: #c8d2e0;
}

.rec-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.rec-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #42536b;
    font-size: 12px;
    font-weight: 600;
}

.rec-stat-pill svg {
    width: 13px;
    height: 13px;
}

.rec-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.rec-table {
    width: 100%;
    border-collapse: collapse;
}

.rec-table th,
.rec-table td {
    font-size: 12.5px;
    padding: 9px 14px;
    white-space: nowrap;
}

.rec-table th {
    text-align: left;
    color: #6b7787;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    border-bottom: 1px solid #eef1f5;
}

.rec-table td {
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.rec-table tbody tr:last-child td {
    border-bottom: none;
}

.rec-table tbody tr:hover {
    background: #f8fafc;
}

.rec-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
}

.rec-badge.neutral {
    background: #eef2ff;
    color: var(--accent-text, #3730a3);
}

.rec-badge.inactive {
    background: #f1f5f9;
    color: #8b98ac;
}

.rec-empty-state {
    text-align: center;
    padding: 40px 10px;
    color: #8b98ac;
}

.rec-empty-state strong {
    display: block;
    margin-bottom: 4px;
    color: #42536b;
}

.rec-empty-state p {
    margin: 0;
    font-size: 12px;
}

.rec-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.rec-readonly-field {
    margin: 0;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #42536b;
    font-size: 13.5px;
}

.rec-quickpicks {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 8px;
}

.rec-quickpick {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    font-weight: 500;
    color: #52627a;
    cursor: pointer;
}

.rec-quickpick input {
    accent-color: var(--accent);
    cursor: pointer;
}

.rec-search-wrap {
    position: relative;
    flex: 1;
}

.rec-search-wrap svg {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: #94a3b8;
    pointer-events: none;
}

.rec-search-input {
    padding-left: 30px !important;
}

@media (max-width: 640px) {
    .rec-header { flex-direction: column; align-items: stretch; }
    .rec-filter-group { min-width: 100%; }
}

:root[data-theme="dark"] .rec-filters { background: var(--bg-surface-alt); border-color: var(--border-color); }
:root[data-theme="dark"] .rec-filter-group label { color: var(--text-muted); }
:root[data-theme="dark"] .rec-clear-btn { background: var(--bg-surface); border-color: var(--border-color); color: var(--text-primary); }
:root[data-theme="dark"] .rec-clear-btn:hover { background: var(--bg-surface-alt); }
:root[data-theme="dark"] .rec-stat-pill { background: var(--bg-surface-alt); color: var(--text-muted); }
</style>

<div class="rec-page">
    <div class="rec-card">
        <div class="rec-header">
            <div class="rec-header-title">
                <div class="rec-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                </div>
                <div>
                    <h1>Recall Board</h1>
                    <p class="form-subtitle">Track and follow up on patient recalls.</p>
                </div>
            </div>
            <div id="recallAddBtnWrap">
                <button type="button" class="rec-add-btn" id="openAddRecallModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                    New Recall
                </button>
            </div>
        </div>

        <div id="listAlert"></div>

        <div class="rec-filters">
            <div class="rec-filter-group">
                <label>Facility</label>
                <select id="filter_facility_id" class="form-input">
                    <option value="">All Facilities</option>
                </select>
            </div>

            <div class="rec-filter-group">
                <label>Provider</label>
                <select id="filter_provider_id" class="form-input">
                    <option value="">All Providers</option>
                </select>
            </div>

            <div class="rec-filter-group">
                <label>Patient No.</label>
                <input type="text" id="filter_patient_no" class="form-input" placeholder="e.g PAT-000001">
            </div>

            <div class="rec-filter-group">
                <label>Patient Name</label>
                <input type="text" id="filter_patient_name" class="form-input" list="recallFilterPatientDatalist" placeholder="Search name...">
                <datalist id="recallFilterPatientDatalist"></datalist>
            </div>

            <div class="rec-filter-group">
                <label>Date From</label>
                <input type="date" id="filter_date_from" class="form-input">
            </div>

            <div class="rec-filter-group">
                <label>Date Until</label>
                <input type="date" id="filter_date_until" class="form-input">
            </div>

            <div class="rec-filter-actions">
                <button type="button" class="rec-filter-btn" id="applyRecallFilters">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    Filter
                </button>
                <button type="button" class="rec-clear-btn" id="clearRecallFilters">Clear</button>
            </div>
        </div>

        <div class="rec-toolbar">
            <span class="rec-stat-pill" id="recallCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                <span id="recallCountText">0 recalls</span>
            </span>
        </div>

        <div class="rec-table-wrap">
            <table class="rec-table">
                <thead>
                    <tr>
                        <th>Patient No.</th>
                        <th>Patient Name</th>
                        <th>Reason</th>
                        <th>Recall Date</th>
                        <th>Facility</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="recallsTableBody">
                    <tr><td colspan="8" class="table-empty">Loading recalls...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="recallFormModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="recallFormModalTitle">New Recall</h2>
            <button type="button" class="modal-close" id="closeRecallFormModal">&times;</button>
        </div>

        <div id="recallFormAlert"></div>

        <form id="recallForm">
            <input type="hidden" id="recall_id">

            <div class="form-group full" id="recallPatientFieldGroup">
                <label>Patient</label>
                <div class="rec-picker-row">
                    <div class="rec-search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                        <input type="text" class="form-input rec-search-input" id="recall_patient_search" list="recallPatientDatalist" placeholder="Search patient...">
                        <datalist id="recallPatientDatalist"></datalist>
                    </div>
                    <button type="button" class="rec-clear-btn" id="recallPatientClear">Clear</button>
                </div>
                <span class="form-error" id="err-patient_id"></span>
            </div>

            <div class="form-group full">
                <label>Date of Birth / Age</label>
                <p id="recall_patient_dob_age" class="rec-readonly-field">—</p>
            </div>

            <div class="form-grid">
                <div class="form-group">
                    <label>Facility *</label>
                    <select id="recall_facility_id" class="form-input">
                        <option value="">Select facility</option>
                    </select>
                    <span class="form-error" id="err-facility_id"></span>
                </div>

                <div class="form-group">
                    <label>Provider *</label>
                    <select id="recall_provider_id" class="form-input">
                        <option value="">Select provider</option>
                    </select>
                    <span class="form-error" id="err-provider_id"></span>
                </div>

                <div class="form-group full">
                    <label>Recall Date *</label>
                    <input id="recall_date" type="date" class="form-input">
                    <div class="rec-quickpicks">
                        <label class="rec-quickpick">
                            <input type="radio" name="recall_date_quickpick" value="1">
                            +1 Year
                        </label>
                        <label class="rec-quickpick">
                            <input type="radio" name="recall_date_quickpick" value="2">
                            +2 Years
                        </label>
                        <label class="rec-quickpick">
                            <input type="radio" name="recall_date_quickpick" value="3">
                            +3 Years
                        </label>
                    </div>
                    <span class="form-error" id="err-recall_date"></span>
                </div>

                <div class="form-group">
                    <label>Status</label>
                    <select id="recall_status" class="form-input">
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Reason</label>
                    <input id="recall_reason" class="form-input" placeholder="e.g. Annual physical follow-up">
                    <span class="form-error" id="err-reason"></span>
                </div>

                <div class="form-group full">
                    <label>Notes</label>
                    <textarea id="recall_notes" class="form-input" style="min-height: 90px;" placeholder="Optional"></textarea>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelRecallForm">Cancel</button>
                <button class="login-btn" type="submit">Save Recall</button>
            </div>
        </form>
    </div>
</div>
`;
}
