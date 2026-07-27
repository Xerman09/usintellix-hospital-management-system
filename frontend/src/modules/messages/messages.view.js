export function MessagesView()
{
    return `
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

            <div class="table-wrap">
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
            <div class="msg-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                <strong>Recalls</strong>
                <p>This module is currently under development.</p>
            </div>
        </div>
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
