export function MessagesView()
{
    return `
<style>
.msg-page {
    width: 100%;
    font-size: 13.5px;
}

.msg-card {
    width: 100%;
}

.msg-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.msg-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.msg-icon-badge {
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

.msg-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.msg-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.msg-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.msg-panel-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 16px 0 12px;
}

.msg-panel-header-row h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #29323f;
}

.msg-filter-select {
    padding: 7px 10px;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    font-size: 12.5px;
    color: #29323f;
    background: white;
}

.msg-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.msg-stat-pill {
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

.msg-stat-pill svg {
    width: 13px;
    height: 13px;
}

.msg-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.msg-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 14px;
    cursor: pointer;
}

.msg-add-btn:hover {
    opacity: .92;
}

.msg-add-btn svg {
    width: 14px;
    height: 14px;
}

.msg-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.msg-table {
    width: 100%;
    border-collapse: collapse;
}

.msg-table th,
.msg-table td {
    font-size: 12.5px;
    padding: 9px 14px;
}

.msg-table th {
    text-align: left;
    color: #6b7787;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    border-bottom: 1px solid #eef1f5;
}

.msg-table td {
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.msg-table tbody tr:last-child td {
    border-bottom: none;
}

.msg-table tbody tr:hover {
    background: #f8fafc;
}

.msg-th-filter {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.msg-filter-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}

.msg-filter-input {
    padding: 4px 6px;
    border: 1px solid #dbe1ea;
    border-radius: 5px;
    font-size: 11.5px;
    font-weight: 400;
}

.msg-empty-state {
    text-align: center;
    padding: 30px 10px;
    color: #8b98ac;
}

.msg-empty-state strong {
    display: block;
    margin-bottom: 4px;
    color: #42536b;
}

.msg-empty-state p {
    margin: 0;
    font-size: 12px;
}

.msg-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
}

.msg-badge.neutral {
    background: #eef2ff;
    color: var(--accent-text, #3730a3);
}

.msg-badge.inactive {
    background: #f1f5f9;
    color: #8b98ac;
}

tr.unread {
    font-weight: 700;
}

.rec-mini-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
}

.rec-mini-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    background: white;
}

.rec-mini-info strong {
    display: block;
    font-size: 13.5px;
    color: #25324b;
}

.rec-mini-info span {
    display: block;
    font-size: 12px;
    color: #8b98ac;
    margin-top: 2px;
}

.rec-mini-date {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
}

.rec-mini-date span {
    font-size: 12.5px;
    font-weight: 600;
    color: #42536b;
}

.msg-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 50px 10px;
    color: #8b98ac;
    text-align: center;
}

.msg-placeholder svg {
    width: 30px;
    height: 30px;
    color: #c3cbd9;
}

.msg-placeholder strong {
    color: #42536b;
    font-size: 13.5px;
}

.msg-placeholder p {
    margin: 0;
    font-size: 12px;
}

.msg-to-label {
    font-weight: 600;
}

.msg-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.msg-search-wrap {
    position: relative;
    flex: 1;
}

.msg-search-wrap svg {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: #94a3b8;
    pointer-events: none;
}

.msg-search-input {
    padding-left: 30px !important;
}

.msg-picker-clear {
    flex-shrink: 0;
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

.msg-clear-btn {
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

.msg-clear-btn:hover {
    background: #f1f5f9;
    border-color: #c8d2e0;
}
</style>
<div class="msg-page">
    <div class="msg-card">
        <div class="msg-header">
            <div class="msg-header-title">
                <div class="msg-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="m4 6 8 7 8-7"></path></svg>
                </div>
                <div>
                    <h1>Messages</h1>
                    <p class="form-subtitle">Send and manage messages, reminders, and recalls.</p>
                </div>
            </div>
        </div>

        <div class="modal-tabs" id="msgSectionTabs">
            <button type="button" class="modal-tab active" data-section="messages">Messages</button>
            <button type="button" class="modal-tab" data-section="reminders">Reminders</button>
            <button type="button" class="modal-tab" data-section="recalls">Recalls</button>
        </div>

        <div id="listAlert"></div>

        <div class="modal-tab-panel active" data-section-panel="messages">
            <div class="msg-panel-header-row">
                <h2>My Messages</h2>
                <select id="msgScopeFilter" class="msg-filter-select">
                    <option value="all">All Messages</option>
                    <option value="active" selected>Show Active</option>
                    <option value="inactive">Show Inactive</option>
                </select>
            </div>

            <div class="msg-toolbar">
                <span class="msg-stat-pill" id="msgCountPill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="m4 6 8 7 8-7"></path></svg>
                    <span id="msgCountText">0 messages</span>
                </span>
                <div class="msg-toolbar-actions">
                    <button type="button" class="msg-add-btn" id="openAddMessageModal">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                        Add New Message
                    </button>
                    <button type="button" class="btn-danger" id="deleteSelectedMessagesBtn" disabled>Delete Message</button>
                </div>
            </div>

            <div class="msg-table-wrap">
                <table class="msg-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="msgSelectAll"></th>
                            <th>
                                <div class="msg-th-filter">
                                    <label class="msg-filter-toggle">
                                        <input type="checkbox" data-filter-toggle="from">
                                        From
                                    </label>
                                    <input type="text" class="msg-filter-input" id="msgFilterFrom" placeholder="Sender..." hidden>
                                </div>
                            </th>
                            <th>
                                <div class="msg-th-filter">
                                    <label class="msg-filter-toggle">
                                        <input type="checkbox" data-filter-toggle="type">
                                        Type
                                    </label>
                                    <select class="msg-filter-input" id="msgFilterType" hidden>
                                        <option value="">All Types</option>
                                    </select>
                                </div>
                            </th>
                            <th>
                                <div class="msg-th-filter">
                                    <label class="msg-filter-toggle">
                                        <input type="checkbox" data-filter-toggle="patients">
                                        Patient
                                    </label>
                                    <input type="text" class="msg-filter-input" id="msgFilterPatients" placeholder="Patient..." hidden>
                                </div>
                            </th>
                            <th>Message</th>
                            <th>
                                <div class="msg-th-filter">
                                    <label class="msg-filter-toggle">
                                        <input type="checkbox" data-filter-toggle="date">
                                        Date
                                    </label>
                                    <input type="date" class="msg-filter-input" id="msgFilterDate" hidden>
                                </div>
                            </th>
                            <th>
                                <div class="msg-th-filter">
                                    <label class="msg-filter-toggle">
                                        <input type="checkbox" data-filter-toggle="status">
                                        Status
                                    </label>
                                    <select class="msg-filter-input" id="msgFilterStatus" hidden>
                                        <option value="">All Statuses</option>
                                    </select>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="myMessagesTableBody">
                        <tr><td colspan="7" class="table-empty">Loading messages...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-panel" data-section-panel="reminders">
            <div class="msg-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <strong>Reminders</strong>
                <p>This module is currently under development.</p>
            </div>
        </div>

        <div class="modal-tab-panel" data-section-panel="recalls">
            <div class="msg-panel-header-row">
                <h2>Upcoming Recalls</h2>
                <div class="msg-toolbar-actions" id="recallAddBtnWrap">
                    <button type="button" class="msg-clear-btn" id="goToRecallBoard">Recall Board</button>
                    <button type="button" class="msg-add-btn" id="openAddRecallModal">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                        Add Recall
                    </button>
                </div>
            </div>

            <div class="rec-mini-list" id="recallsMiniList">
                <p class="table-empty">Loading recalls...</p>
            </div>
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
                <div class="msg-picker-row">
                    <div class="msg-search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                        <input type="text" class="form-input msg-search-input" id="recall_patient_search" list="recallPatientDatalist" placeholder="Search patient...">
                        <datalist id="recallPatientDatalist"></datalist>
                    </div>
                    <button type="button" class="msg-clear-btn msg-picker-clear" id="recallPatientClear">Clear</button>
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

<div class="modal-overlay" id="addMessageModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>New Message</h2>
            <button type="button" class="modal-close" id="closeAddMessageModal">&times;</button>
        </div>
        <p class="form-subtitle">Send a message to another user in the system.</p>

        <div id="formAlert"></div>

        <form id="addMessageForm">
            <div class="form-grid">
                <div class="form-group">
                    <label>Type</label>
                    <select id="msg_type_id" class="form-input">
                        <option value="">Select type</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Status</label>
                    <select id="msg_status_id" class="form-input">
                        <option value="">Select status</option>
                    </select>
                </div>
            </div>

            <div class="form-group full" id="msgPatientFieldGroup">
                <label>Patient</label>
                <div class="msg-picker-row">
                    <div class="msg-search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                        <input type="text" class="form-input msg-search-input" id="msg_patient_search" list="msgPatientDatalist" placeholder="Search patient...">
                        <datalist id="msgPatientDatalist"></datalist>
                    </div>
                    <button type="button" class="btn-secondary msg-picker-clear" id="msgPatientClear">Clear</button>
                </div>
            </div>

            <div class="form-group full">
                <label class="msg-to-label">To:</label>
                <div class="msg-picker-row">
                    <div class="msg-search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                        <input type="text" class="form-input msg-search-input" id="msg_recipient_search" list="msgRecipientDatalist" placeholder="Search user to send...">
                        <datalist id="msgRecipientDatalist"></datalist>
                    </div>
                    <button type="button" class="btn-secondary msg-picker-clear" id="msgRecipientClear">Clear</button>
                </div>
                <span class="form-error" id="err-recipient_id"></span>
            </div>

            <div class="form-group full">
                <label>Message</label>
                <textarea id="msg_body" class="form-input" style="min-height: 140px;"></textarea>
                <span class="form-error" id="err-body"></span>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAddMessage">Cancel</button>
                <button class="login-btn" type="submit">Send Message</button>
            </div>
        </form>
    </div>
</div>
`;
}
