export function ClinicalRemindersView()
{
    return `
<style>
.cr-page {
    width: 100%;
    font-size: 13.5px;
}

.cr-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
    flex-wrap: wrap;
}

.cr-title-block h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.cr-title-block p {
    margin: 4px 0 0;
    font-size: 13.5px;
    color: #4a5568;
}

.cr-patient-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.cr-patient-link:hover {
    text-decoration: underline;
}

.cr-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 14px;
    border-radius: 6px;
    border: 1px solid #c3cbd8;
    background: #eef1f5;
    color: #1c2534;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.cr-back-btn:hover {
    background: #e2e7ee;
}

.cr-back-btn svg {
    width: 14px;
    height: 14px;
}

.cr-tabs {
    display: flex;
    gap: 3px;
}

.cr-tab {
    padding: 9px 20px;
    background: #e6eaf1;
    border: 1px solid #d7dee8;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    font-size: 13px;
    font-weight: 600;
    color: #5a6579;
    cursor: pointer;
}

.cr-tab.active {
    background: white;
    color: #1a2338;
    position: relative;
    top: 1px;
}

.cr-panel-wrap {
    background: white;
    border: 1px solid #d7dee8;
    border-radius: 0 8px 8px 8px;
    padding: 22px 20px;
}

.cr-panel {
    display: none;
}

.cr-panel.active {
    display: block;
}

.cr-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.cr-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 2px;
    border-bottom: 1px solid #eef1f5;
}

.cr-list li:last-child {
    border-bottom: none;
}

.cr-item-link {
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    color: #1a2338;
    font-size: 13.5px;
    cursor: pointer;
}

.cr-item-link.clickable {
    color: var(--accent);
}

.cr-item-link.clickable:hover {
    text-decoration: underline;
}

.cr-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
}

.cr-status.not_due { color: #15803d; }
.cr-status.past_due { color: #b91c1c; }

.cr-status-icon {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: white;
}

.cr-status.not_due .cr-status-icon { background: #15803d; }
.cr-status.past_due .cr-status-icon { background: #b91c1c; }

.cr-empty,
.cr-placeholder {
    margin: 0;
    padding: 16px 2px;
    color: #71809b;
}

:root[data-theme="dark"] .cr-title-block h1 { color: var(--text-primary); }
:root[data-theme="dark"] .cr-title-block p { color: var(--text-muted); }
:root[data-theme="dark"] .cr-back-btn { background: var(--bg-surface-alt); border-color: var(--border-color); color: var(--text-primary); }
:root[data-theme="dark"] .cr-back-btn:hover { background: var(--bg-surface); }
:root[data-theme="dark"] .cr-tab { background: var(--bg-surface-alt); border-color: var(--border-color); color: var(--text-muted); }
:root[data-theme="dark"] .cr-tab.active { background: var(--bg-surface); color: var(--text-primary); }
:root[data-theme="dark"] .cr-panel-wrap { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .cr-list li { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .cr-item-link { color: var(--text-primary); }
:root[data-theme="dark"] .cr-item-link.clickable { color: var(--accent); }
:root[data-theme="dark"] .cr-empty,
:root[data-theme="dark"] .cr-placeholder { color: var(--text-muted); }
</style>

<div class="cr-page">
    <div class="cr-toolbar">
        <div class="cr-title-block">
            <h1>Clinical Reminders</h1>
            <p>for <button type="button" class="cr-patient-link" id="crPatientLink">...</button></p>
        </div>
        <button type="button" class="cr-back-btn" id="crBackBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
            Back To Patient
        </button>
    </div>

    <div class="cr-tabs">
        <button type="button" class="cr-tab active" data-cr-tab="main">Main</button>
        <button type="button" class="cr-tab" data-cr-tab="plans">Plans</button>
        <button type="button" class="cr-tab" data-cr-tab="admin">Admin</button>
    </div>

    <div class="cr-panel-wrap">
        <div class="cr-panel active" data-cr-panel="main">
            <ul class="cr-list" id="crRemindersList">
                <li class="cr-empty">Loading...</li>
            </ul>
        </div>
        <div class="cr-panel" data-cr-panel="plans">
            <p class="cr-placeholder">No reminder plans configured. Plans are grouped under Admin &rsaquo; Practice &rsaquo; Plans Configuration.</p>
        </div>
        <div class="cr-panel" data-cr-panel="admin">
            <p class="cr-placeholder">Clinical decision rules are configured under Admin &rsaquo; Practice &rsaquo; Rules.</p>
        </div>
    </div>
</div>

<div class="modal-overlay" id="crReminderFormModalOverlay">
    <div class="modal-box" style="max-width: 680px;">
        <div class="modal-header">
            <h2 id="crReminderFormTitle">Assessment</h2>
            <button type="button" class="modal-close" id="closeCrReminderFormModal">&times;</button>
        </div>
        <p class="form-subtitle">Update clinical decision rule status.</p>

        <form id="crReminderForm" onsubmit="event.preventDefault();">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                    <label class="form-label required">Date/Time</label>
                    <input type="datetime-local" class="form-input" id="crReminderDate" required>
                </div>

                <div class="form-group">
                    <label class="form-label required">Completed</label>
                    <select class="form-input" id="crReminderCompleted" required>
                        <option value="yes">YES</option>
                        <option value="no">NO</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Results/Details</label>
                <textarea class="form-input" id="crReminderDetails" style="height: 70px; resize: vertical;"></textarea>
            </div>

            <div class="form-actions" style="margin-top: 16px;">
                <button type="button" class="btn-secondary" id="crReminderFormCancelBtn">Cancel</button>
                <button type="button" class="btn-primary-inline" id="crReminderFormSaveBtn">Save</button>
            </div>
        </form>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0 16px;">

        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">History</h3>
            <span style="font-size: 12px; color: var(--text-muted);" id="crReminderHistoryCount">0 record(s)</span>
        </div>

        <div class="data-table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date/Time</th>
                        <th>Completed</th>
                        <th>Results/Details</th>
                    </tr>
                </thead>
                <tbody id="crReminderHistoryTableBody">
                    <tr><td colspan="3" class="table-empty">No history recorded yet.</td></tr>
                </tbody>
            </table>
        </div>

        <div class="form-actions" style="margin-top: 20px; justify-content: flex-end;">
            <button type="button" class="btn-secondary" id="closeCrReminderFormModalBottom">Close</button>
        </div>
    </div>
</div>
`;
}
