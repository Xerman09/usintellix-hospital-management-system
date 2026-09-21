/**
 * Batch Communication Tool View (OpenEMR-Style)
 * Matching the exact OpenEMR layout and uploaded screenshots:
 * - Tabs: BatchCom, SMS Notification, Email Notification, SMS/Email Alert Settings
 * - SMS Notification tab matching media_1789835922595.png
 * - Email Notification tab matching media_1789835928427.png
 * - SMS/Email Alert Settings tab matching media_1789835933859.png
 * - Full Light & Dark mode support
 */
export function BatchComView() {
    return `
<style>
.bc-container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text-primary, #1e293b);
}

/* OpenEMR Tabs Bar */
.bc-tabs-bar {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid #d1d5db;
    margin-bottom: 28px;
    padding-left: 2px;
}

:root[data-theme="dark"] .bc-tabs-bar {
    border-bottom-color: #334155;
}

.bc-tab-btn {
    background: transparent;
    border: 1px solid transparent;
    border-bottom: none;
    padding: 7px 18px 8px 18px;
    font-size: 14.5px;
    font-weight: 500;
    color: #4b5563;
    cursor: pointer;
    border-radius: 4px 4px 0 0;
    margin-bottom: -1px;
    transition: all 0.15s ease;
}

:root[data-theme="dark"] .bc-tab-btn {
    color: #94a3b8;
}

.bc-tab-btn:hover {
    color: #1d4ed8;
    background: #f1f5f9;
}

:root[data-theme="dark"] .bc-tab-btn:hover {
    color: #38bdf8;
    background: #1e293b;
}

.bc-tab-btn.active {
    background: #ffffff;
    border-color: #d1d5db #d1d5db transparent #d1d5db;
    color: #111827;
    font-weight: 600;
}

:root[data-theme="dark"] .bc-tab-btn.active {
    background: #0f172a;
    border-color: #334155 #334155 transparent #334155;
    color: #f8fafc;
}

/* Page Header Title matching screenshots */
.bc-header-title {
    font-size: 32px;
    font-weight: 500;
    margin: 0 0 28px 0;
    line-height: 1.25;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
}

.bc-title-blue {
    color: #2563eb;
    font-weight: 600;
}

.bc-title-dark {
    color: #1e293b;
    font-weight: 400;
}

:root[data-theme="dark"] .bc-title-dark {
    color: #f1f5f9;
}

/* Grid Layouts for BatchCom tab */
.bc-grid-row1 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;
}

.bc-grid-row2 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
}

@media (max-width: 900px) {
    .bc-grid-row1 {
        grid-template-columns: repeat(2, 1fr);
    }
    .bc-grid-row2 {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 550px) {
    .bc-grid-row1 {
        grid-template-columns: 1fr;
    }
}

/* Filter Cards */
.bc-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 16px 18px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

:root[data-theme="dark"] .bc-card {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.bc-card-label {
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
    margin-bottom: 10px;
}

:root[data-theme="dark"] .bc-card-label {
    color: #cbd5e1;
}

.bc-select, .bc-input-field {
    width: 100%;
    height: 38px;
    padding: 6px 12px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 14px;
    color: #1e293b;
    background: #ffffff;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

:root[data-theme="dark"] .bc-select,
:root[data-theme="dark"] .bc-input-field {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

.bc-select:focus, .bc-input-field:focus, .bc-textarea-field:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.bc-range-container {
    display: flex;
    align-items: center;
    gap: 8px;
}

.bc-range-sep {
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
}

:root[data-theme="dark"] .bc-range-sep {
    color: #94a3b8;
}

/* OpenEMR Check Button Style */
.bc-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 16px;
    flex-wrap: wrap;
}

.bc-save-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #e2e8f0;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    padding: 7px 18px;
    font-size: 14.5px;
    font-weight: 500;
    color: #1e293b;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.15s ease;
}

.bc-save-btn:hover {
    background: #cbd5e1;
    border-color: #64748b;
}

.bc-save-btn:active {
    transform: translateY(1px);
}

:root[data-theme="dark"] .bc-save-btn {
    background: #334155;
    border-color: #475569;
    color: #f8fafc;
}

:root[data-theme="dark"] .bc-save-btn:hover {
    background: #475569;
    border-color: #64748b;
}

.bc-check {
    font-size: 14px;
    font-weight: bold;
}

.bc-broadcast-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #2563eb;
    color: #ffffff;
    border: 1px solid #1d4ed8;
    border-radius: 4px;
    padding: 7px 18px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
}

.bc-broadcast-btn:hover {
    background: #1d4ed8;
}

/* OpenEMR Form Rows for SMS, Email, Settings */
.bc-form-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-bottom: 22px;
}

.bc-form-row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    margin-bottom: 22px;
}

@media (max-width: 768px) {
    .bc-form-row-2, .bc-form-row-3 {
        grid-template-columns: 1fr;
        gap: 16px;
    }
}

.bc-field-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.bc-field-label {
    font-size: 14.5px;
    color: #1e293b;
    font-weight: 500;
}

:root[data-theme="dark"] .bc-field-label {
    color: #cbd5e1;
}

.bc-usable-tags {
    font-size: 14px;
    color: #1e293b;
    margin: 18px 0 10px 0;
    line-height: 1.4;
    font-weight: 400;
}

:root[data-theme="dark"] .bc-usable-tags {
    color: #cbd5e1;
}

.bc-textarea-field {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 14.5px;
    line-height: 1.5;
    color: #1e293b;
    background: #ffffff;
    box-sizing: border-box;
    font-family: inherit;
    resize: vertical;
    outline: none;
    margin-bottom: 20px;
}

:root[data-theme="dark"] .bc-textarea-field {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

/* Results & Logs Card */
.bc-results-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    margin-top: 24px;
}

:root[data-theme="dark"] .bc-results-card {
    background: #1e293b;
    border-color: #334155;
}

.bc-results-header {
    padding: 14px 18px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14.5px;
    font-weight: 600;
    color: #1e293b;
}

:root[data-theme="dark"] .bc-results-header {
    background: #0f172a;
    border-bottom-color: #334155;
    color: #f1f5f9;
}

.bc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.bc-table th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
    text-align: left;
    padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
}

:root[data-theme="dark"] .bc-table th {
    background: #1e293b;
    color: #94a3b8;
    border-bottom-color: #334155;
}

.bc-table td {
    padding: 11px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: middle;
}

:root[data-theme="dark"] .bc-table td {
    border-bottom-color: #334155;
    color: #cbd5e1;
}

.bc-table tr:hover td {
    background: #f8fafc;
}

:root[data-theme="dark"] .bc-table tr:hover td {
    background: #0f172a;
}

.bc-tag-green {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background: #dcfce7;
    color: #166534;
}

:root[data-theme="dark"] .bc-tag-green {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
}

.bc-tag-amber {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background: #fef3c7;
    color: #b45309;
}

:root[data-theme="dark"] .bc-tag-amber {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
}

.bc-btn-outline {
    background: transparent;
    border: 1px solid #cbd5e1;
    color: #475569;
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 13px;
    cursor: pointer;
}

.bc-btn-outline:hover {
    background: #f1f5f9;
    color: #1e293b;
}

:root[data-theme="dark"] .bc-btn-outline {
    border-color: #475569;
    color: #cbd5e1;
}

:root[data-theme="dark"] .bc-btn-outline:hover {
    background: #334155;
    color: #f8fafc;
}
</style>

<div class="bc-container">
    <!-- Top OpenEMR Tabs Bar -->
    <div class="bc-tabs-bar">
        <button class="bc-tab-btn active" id="bcTabBatchCom" data-tab="batch_com">BatchCom</button>
        <button class="bc-tab-btn" id="bcTabSms" data-tab="sms">SMS Notification</button>
        <button class="bc-tab-btn" id="bcTabEmail" data-tab="email">Email Notification</button>
        <button class="bc-tab-btn" id="bcTabSettings" data-tab="settings">SMS/Email Alert Settings</button>
    </div>

    <!-- TAB 1: BatchCom (Main Screen from media_1789835601487.png) -->
    <div id="bcSectionBatchCom">
        <h1 class="bc-header-title">
            <span class="bc-title-blue">Batch Communication Tool</span>
        </h1>

        <!-- Top Row 4 Cards -->
        <div class="bc-grid-row1">
            <div class="bc-card">
                <div class="bc-card-label">Process:</div>
                <select class="bc-select" id="bcProcessSelect">
                    <option value="csv">Download CSV File</option>
                    <option value="preview" selected>Preview Patient List</option>
                    <option value="sms">Send SMS</option>
                    <option value="email">Send Email</option>
                </select>
            </div>
            <div class="bc-card">
                <div class="bc-card-label">Override HIPAA choice:</div>
                <select class="bc-select" id="bcOverrideHipaaSelect">
                    <option value="0" selected>No</option>
                    <option value="1">Yes</option>
                </select>
            </div>
            <div class="bc-card">
                <div class="bc-card-label">Sort by</div>
                <select class="bc-select" id="bcSortBySelect">
                    <option value="zip" selected>Zip Code</option>
                    <option value="name">Name</option>
                    <option value="age">Age</option>
                    <option value="patient_no">Patient ID</option>
                </select>
            </div>
            <div class="bc-card">
                <div class="bc-card-label">Gender:</div>
                <select class="bc-select" id="bcGenderSelect">
                    <option value="any" selected>Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                </select>
            </div>
        </div>

        <!-- Bottom Row 3 Cards -->
        <div class="bc-grid-row2">
            <!-- Age Range -->
            <div class="bc-card">
                <div class="bc-card-label">Age Range:</div>
                <div class="bc-range-container">
                    <input type="number" class="bc-input-field" id="bcAgeMin" placeholder="any" min="0" max="150">
                    <span class="bc-range-sep">to</span>
                    <input type="number" class="bc-input-field" id="bcAgeMax" placeholder="any" min="0" max="150">
                </div>
            </div>

            <!-- Appointment within -->
            <div class="bc-card">
                <div class="bc-card-label">Appointment within:</div>
                <div class="bc-range-container">
                    <input type="date" class="bc-input-field" id="bcApptFrom" placeholder="any date">
                    <span class="bc-range-sep">to</span>
                    <input type="date" class="bc-input-field" id="bcApptTo" placeholder="any date">
                </div>
            </div>

            <!-- Seen within -->
            <div class="bc-card">
                <div class="bc-card-label">Seen within:</div>
                <div class="bc-range-container">
                    <input type="date" class="bc-input-field" id="bcSeenFrom" placeholder="any date">
                    <span class="bc-range-sep">to</span>
                    <input type="date" class="bc-input-field" id="bcSeenTo" placeholder="any date">
                </div>
            </div>
        </div>

        <!-- Action Button: [✔ Process] -->
        <div class="bc-action-bar">
            <button type="button" class="bc-save-btn" id="bcProcessBtn">
                <span class="bc-check">✔</span> Process
            </button>
            <div style="font-size: 13.5px; color: #64748b;">
                Matched Patients: <strong id="bcMatchedCountBadge" style="color: #2563eb;">0</strong>
            </div>
        </div>

        <!-- Matched Patients Results Table -->
        <div class="bc-results-card" id="bcResultsContainer">
            <div class="bc-results-header">
                <div>
                    <span>Matched Patients Result</span>
                    <span id="bcResultsCount" style="font-size: 12.5px; font-weight: normal; color: #64748b; margin-left: 8px;">(0 found)</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="bc-btn-outline" id="bcSelectAllBtn">Select All</button>
                    <button class="bc-btn-outline" id="bcDownloadCsvActionBtn">
                        <i class="fas fa-file-csv"></i> Download CSV
                    </button>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table class="bc-table">
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">
                                <input type="checkbox" id="bcMasterCheckbox">
                            </th>
                            <th>Patient ID</th>
                            <th>Name</th>
                            <th>Sex</th>
                            <th>Age</th>
                            <th>Zip Code</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Next Appt</th>
                            <th>Last Seen</th>
                            <th>HIPAA</th>
                        </tr>
                    </thead>
                    <tbody id="bcTableBody">
                        <tr><td colspan="11" style="text-align: center; padding: 30px; color: #94a3b8;">Click Process to query patients.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 2: SMS Notification (Exact Match to media_1789835922595.png) -->
    <div id="bcSectionSms" style="display: none;">
        <h1 class="bc-header-title">
            <span class="bc-title-blue">Batch Communication Tool</span>
            <span class="bc-title-dark">SMS Notification</span>
        </h1>

        <!-- Row 1: SMS Gateway and Name of Provider -->
        <div class="bc-form-row-2">
            <div class="bc-field-group">
                <label class="bc-field-label">SMS Gateway:</label>
                <select class="bc-input-field" id="bcSmsGateway">
                    <option value="CLICKATELL" selected>CLICKATELL</option>
                    <option value="TWILIO">TWILIO</option>
                    <option value="PLIVO">PLIVO</option>
                    <option value="GENERIC_HTTP">GENERIC HTTP</option>
                </select>
            </div>
            <div class="bc-field-group">
                <label class="bc-field-label">Name of Provider:</label>
                <input type="text" class="bc-input-field" id="bcSmsProviderName" value="EMR GROUP 1 .. SMS">
            </div>
        </div>

        <!-- Row 2: Tag Hint Label -->
        <div class="bc-usable-tags">
            SMS Text Usable Tags:***NAME***, ***PROVIDER***, ***DATE***, ***STARTTIME***, ***ENDTIME*** (i.e. Dear ***NAME***):
        </div>

        <!-- Row 3: Textarea -->
        <textarea class="bc-textarea-field" id="bcSmsTemplateText" rows="8">Welcome to EMR GROUP 1.. SMS</textarea>

        <!-- Row 4: Action Buttons -->
        <div class="bc-action-bar">
            <button type="button" class="bc-save-btn" id="bcSaveSmsBtn">
                <span class="bc-check">✔</span> Save
            </button>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span style="font-size: 13px; color: #64748b;" id="bcSmsCharsDisplay">0 / 160 characters</span>
                <button type="button" class="bc-broadcast-btn" id="bcBroadcastSmsBtn">
                    <i class="fas fa-paper-plane"></i> Send SMS to Matched Patients (<span class="bc-sms-recip-count">0</span>)
                </button>
            </div>
        </div>

        <!-- Outbound SMS Delivery History -->
        <div class="bc-results-card">
            <div class="bc-results-header">
                <strong>Recent Outbound SMS Logs</strong>
                <button class="bc-btn-outline" id="bcRefreshSmsLogsBtn">Refresh</button>
            </div>
            <table class="bc-table">
                <thead>
                    <tr>
                        <th>Date / Time</th>
                        <th>Patient</th>
                        <th>Target Phone</th>
                        <th>Message Content</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="bcSmsLogsTableBody">
                    <tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">Loading SMS logs...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 3: Email Notification (Exact Match to media_1789835928427.png) -->
    <div id="bcSectionEmail" style="display: none;">
        <h1 class="bc-header-title">
            <span class="bc-title-blue">Batch Communication Tool</span>
            <span class="bc-title-dark">Email Notification</span>
        </h1>

        <!-- Row 1: Email Sender, Email Subject, Name of Provider -->
        <div class="bc-form-row-3">
            <div class="bc-field-group">
                <label class="bc-field-label">Email Sender:</label>
                <input type="text" class="bc-input-field" id="bcEmailSender" value="EMR Group">
            </div>
            <div class="bc-field-group">
                <label class="bc-field-label">Email Subject:</label>
                <input type="text" class="bc-input-field" id="bcEmailSubject" value="Welcome to EMR GROUP">
            </div>
            <div class="bc-field-group">
                <label class="bc-field-label">Name of Provider:</label>
                <input type="text" class="bc-input-field" id="bcEmailProviderName" value="EMR GROUP">
            </div>
        </div>

        <!-- Row 2: Tag Hint Label -->
        <div class="bc-usable-tags">
            Email Text Usable Tags: ***NAME***, ***PROVIDER***, ***DATE***, ***STARTTIME***, ***ENDTIME*** (i.e. Dear ***NAME***):
        </div>

        <!-- Row 3: Textarea -->
        <textarea class="bc-textarea-field" id="bcEmailTemplateText" rows="8">Welcome to EMR GROUP . Email</textarea>

        <!-- Row 4: Action Buttons -->
        <div class="bc-action-bar">
            <button type="button" class="bc-save-btn" id="bcSaveEmailBtn">
                <span class="bc-check">✔</span> Save
            </button>
            <button type="button" class="bc-broadcast-btn" id="bcBroadcastEmailBtn">
                <i class="fas fa-paper-plane"></i> Send Email to Matched Patients (<span class="bc-email-recip-count">0</span>)
            </button>
        </div>

        <!-- Outbound Email Delivery History -->
        <div class="bc-results-card">
            <div class="bc-results-header">
                <strong>Recent Outbound Email Logs</strong>
                <button class="bc-btn-outline" id="bcRefreshEmailLogsBtn">Refresh</button>
            </div>
            <table class="bc-table">
                <thead>
                    <tr>
                        <th>Date / Time</th>
                        <th>Patient</th>
                        <th>Recipient Email</th>
                        <th>Subject & Message</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="bcEmailLogsTableBody">
                    <tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">Loading email logs...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 4: SMS/Email Alert Settings (Exact Match to media_1789835933859.png) -->
    <div id="bcSectionSettings" style="display: none;">
        <h1 class="bc-header-title">
            <span class="bc-title-blue">Batch Communication Tool</span>
            <span class="bc-title-dark">SMS/Email Alert Settings</span>
        </h1>

        <!-- Row 1: SMS send before, Email send before -->
        <div class="bc-form-row-2">
            <div class="bc-field-group">
                <label class="bc-field-label">SMS send before:</label>
                <input type="text" class="bc-input-field" id="bcAlertSmsSendBefore" value="150">
            </div>
            <div class="bc-field-group">
                <label class="bc-field-label">Email send before:</label>
                <input type="text" class="bc-input-field" id="bcAlertEmailSendBefore" value="150">
            </div>
        </div>

        <!-- Row 2: Username for SMS Gateway, Password for SMS Gateway -->
        <div class="bc-form-row-2">
            <div class="bc-field-group">
                <label class="bc-field-label">Username for SMS Gateway:</label>
                <input type="text" class="bc-input-field" id="bcAlertSmsUsername" placeholder="Enter SMS gateway username" autocomplete="off">
            </div>
            <div class="bc-field-group">
                <label class="bc-field-label">Password for SMS Gateway:</label>
                <input type="password" class="bc-input-field" id="bcAlertSmsPassword" placeholder="••••••••" autocomplete="new-password">
                <small class="bc-hint-text" id="bcAlertSmsPasswordHint" style="font-size: 11px; color: #64748b; margin-top: 4px; display: block;">Leave blank or masked to keep server secret unchanged.</small>
            </div>
        </div>

        <!-- Row 3: SMS Gateway API key (Full Width) -->
        <div class="bc-field-group" style="margin-bottom: 24px;">
            <label class="bc-field-label">SMS Gateway API key:</label>
            <input type="password" class="bc-input-field" id="bcAlertSmsApiKey" placeholder="••••••••" autocomplete="off">
            <small class="bc-hint-text" id="bcAlertSmsApiKeyHint" style="font-size: 11px; color: #64748b; margin-top: 4px; display: block;">Leave blank or masked to keep server secret unchanged.</small>
        </div>

        <!-- Row 4: Action Button: [✔ Save] -->
        <div class="bc-action-bar">
            <button type="button" class="bc-save-btn" id="bcSaveAlertSettingsBtn">
                <span class="bc-check">✔</span> Save
            </button>
        </div>
    </div>
</div>
`;
}
