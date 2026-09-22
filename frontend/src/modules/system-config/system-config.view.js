export const CONFIG_CATEGORIES = [
    "Appearance", "Branding", "Login Page", "Locale", "Features", "Report",
    "Billing", "E-Sign", "Documents", "Calendar", "Insurance", "Security",
    "Notifications", "CDR", "Logging", "Miscellaneous", "Portal", "Connectors",
    "Rx", "PDF", "Patient Banner Bar", "Encounter Form", "Questionnaires", "Carecoordination"
];

function slug(label) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function appearancePanelHtml() {
    return `
        <h2>Appearance <span class="sc-hint">(*need to logout/login after changing these settings)</span></h2>

        <div class="sc-row">
            <label>Tabs Layout Theme*</label>
            <select id="scTabsLayoutTheme" class="sc-field">
                <option value="compact">Compact</option>
                <option value="full" selected>Full</option>
            </select>
        </div>

        <div class="sc-row">
            <label>General Theme*</label>
            <select id="scGeneralTheme" class="sc-field">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </div>

        <div class="sc-row sc-row-tall">
            <label>Hide selected cards on patient dashboard</label>
            <select id="scHiddenCards" class="sc-field" multiple size="10">
                <option value="none">None or Reset</option>
                <option value="allergies">Allergies</option>
                <option value="amendments">Amendments</option>
                <option value="disclosures">Disclosures</option>
                <option value="insurance">Insurance</option>
                <option value="labs">Labs</option>
                <option value="medical_problems">Medical Problems</option>
                <option value="medications">Medications</option>
                <option value="prescriptions">Prescriptions</option>
                <option value="vitals">Vitals</option>
                <option value="care_team">Care Team</option>
                <option value="care_experience_preferences">Care Experience Preferences</option>
                <option value="treatment_intervention_preferences">Treatment Intervention Preferences</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Add Patient Name To Window Title</label>
            <input type="checkbox" id="scAddPatientNameTitle">
        </div>

        <div class="sc-row">
            <label>Enable Compact Mode</label>
            <input type="checkbox" id="scCompactMode">
        </div>

        <div class="sc-row">
            <label>Search Patient By Any Demographics</label>
            <select id="scSearchByDemographics" class="sc-field">
                <option value="off">Off</option>
                <option value="single">Single</option>
                <option value="dual">Dual</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Default Encounter View</label>
            <select id="scDefaultEncounterView" class="sc-field">
                <option value="clinical">Clinical View</option>
                <option value="billing">Billing View</option>
                <option value="summary">Summary View</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Enable Fees Submenu</label>
            <input type="checkbox" id="scEnableFeesSubmenu" checked>
        </div>

        <div class="sc-row">
            <label>Enable Batch Payment</label>
            <input type="checkbox" id="scEnableBatchPayment" checked>
        </div>

        <div class="sc-row">
            <label>Enable Posting</label>
            <input type="checkbox" id="scEnablePosting" checked>
        </div>

        <div class="sc-row">
            <label>Enable EDI History</label>
            <input type="checkbox" id="scEnableEdiHistory" checked>
        </div>

        <div class="sc-row">
            <label>Encounter Page Size</label>
            <select id="scEncounterPageSize" class="sc-field">
                <option value="10">10</option>
                <option value="20" selected>20</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Patient List Page Size</label>
            <select id="scPatientListPageSize" class="sc-field">
                <option value="10" selected>10</option>
                <option value="20">20</option>
                <option value="50">50</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Patient List New Window</label>
            <input type="checkbox" id="scPatientListNewWindow">
        </div>

        <div class="sc-row">
            <label>Right Justify Labels in Demographics</label>
            <input type="checkbox" id="scRightJustifyLabels">
        </div>

        <div class="sc-row">
            <label>Number of Messages Displayed in Patient Summary</label>
            <input type="number" id="scMessagesInSummary" class="sc-field" value="3" min="0">
        </div>

        <div class="sc-row">
            <label>Maximum number of patients on Recent Patient list</label>
            <input type="number" id="scRecentPatientsMax" class="sc-field" value="20" min="0">
        </div>

        <div class="sc-row">
            <label>Vitals Form Options</label>
            <select id="scVitalsFormOptions" class="sc-field">
                <option value="standard">Standard</option>
                <option value="expanded">Expanded</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Vitals Form Max Historical Columns To Display</label>
            <input type="number" id="scVitalsMaxColumns" class="sc-field" value="2" min="0">
        </div>

        <div class="sc-row">
            <label>How to sort a drop-lists</label>
            <select id="scDropListSort" class="sc-field">
                <option value="seq">Sort by seq</option>
                <option value="alpha">Sort alphabetically</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Prevent Web Browser Refresh*</label>
            <select id="scPreventBrowserRefresh" class="sc-field">
                <option value="warn">Warn and prevent web browser refresh</option>
                <option value="off">Do not warn</option>
            </select>
        </div>

        <div class="sc-row">
            <label>Form ActionBar (save, cancel, etc) position</label>
            <select id="scFormActionBarPosition" class="sc-field">
                <option value="top">Top of Form (default)</option>
                <option value="bottom">Bottom of Form</option>
            </select>
        </div>

        <div class="sc-panel-footer">
            <button type="button" class="sc-save-btn" data-save-btn>&#10003; Save</button>
            <span class="sc-panel-footer-label">Appearance <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg></span>
        </div>
    `;
}

function placeholderPanelHtml(label) {
    return `
        <h2>${label}</h2>
        <p class="sc-placeholder">Settings for ${label} haven't been built yet.</p>
    `;
}

export function SystemConfigView() {
    const sidebarItems = CONFIG_CATEGORIES.map((label, index) => `
        <a href="#" class="sc-sidebar-item ${index === 0 ? "active" : ""}" data-category="${slug(label)}">${label}</a>
    `).join("");

    const panels = CONFIG_CATEGORIES.map((label, index) => `
        <div class="sc-panel ${index === 0 ? "active" : ""}" data-panel="${slug(label)}">
            ${index === 0 ? appearancePanelHtml() : placeholderPanelHtml(label)}
        </div>
    `).join("");

    return `
        <style>
            .sc-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; height: 100%; display: flex; flex-direction: column; background: #ffffff; }

            .sc-header-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #4a72b0;
                color: white;
                padding: 14px 20px;
            }

            .sc-header-bar h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }

            .sc-collapse-btn { background: none; border: none; color: rgba(255,255,255,.85); cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .sc-collapse-btn:hover { color: white; }

            .sc-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 20px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
            }

            .sc-save-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 18px;
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: background 0.15s ease, box-shadow 0.15s ease;
            }

            .sc-save-btn:hover { background: #1d4ed8; }

            .sc-search-form { display: flex; gap: 0; }

            .sc-search-input {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px 0 0 6px;
                font-size: 13px;
                width: 260px;
                background: #ffffff;
                color: #1e293b;
                outline: none;
            }
            .sc-search-input:focus { border-color: #3b82f6; }

            .sc-search-btn {
                padding: 8px 16px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 0 6px 6px 0;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: background 0.15s ease;
            }
            .sc-search-btn:hover { background: #2563eb; }

            .sc-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }

            .sc-sidebar {
                width: 220px;
                flex-shrink: 0;
                border-right: 1px solid #e2e8f0;
                overflow-y: auto;
                background: #f8fafc;
                transition: width .15s, opacity .15s;
            }

            .sc-wrapper.sc-collapsed .sc-sidebar { width: 0; opacity: 0; overflow: hidden; border-right: none; }

            .sc-sidebar-item {
                display: block;
                padding: 11px 16px;
                color: #334155;
                text-decoration: none;
                font-size: 13.5px;
                font-weight: 500;
                border-bottom: 1px solid #edf2f7;
                transition: all 0.15s ease;
            }

            .sc-sidebar-item:hover { background: #e2e8f0; color: #0f172a; }
            .sc-sidebar-item.active { background: #2563eb; color: white; font-weight: 600; border-left: 4px solid #1d4ed8; }

            .sc-content { flex: 1; overflow-y: auto; padding: 24px 28px; background: #ffffff; }

            .sc-panel { display: none; max-width: 960px; }
            .sc-panel.active { display: block; }

            .sc-panel h2 { margin: 0 0 20px; font-size: 20px; font-weight: 700; color: #0f172a; }
            .sc-panel h2 .sc-hint { font-size: 13px; font-weight: normal; color: #64748b; }

            .sc-row {
                display: grid;
                grid-template-columns: 1fr 340px;
                align-items: center;
                gap: 20px;
                padding: 12px 0;
                border-bottom: 1px solid #f1f5f9;
            }

            .sc-row.sc-row-hidden { display: none; }
            .sc-row-tall { align-items: start; }

            .sc-row label { font-size: 13.5px; color: #334155; font-weight: 500; line-height: 1.4; }

            .sc-field {
                width: 100%;
                padding: 7px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13.5px;
                color: #0f172a;
                background-color: #ffffff;
                box-sizing: border-box;
                outline: none;
                transition: border-color 0.15s, box-shadow 0.15s;
            }

            .sc-field:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            }

            select.sc-field[multiple] {
                padding: 6px;
                border-radius: 6px;
            }
            select.sc-field[multiple] option {
                padding: 6px 10px;
                border-radius: 4px;
                margin: 1px 0;
                color: #1e293b;
                font-size: 13px;
            }
            select.sc-field[multiple] option:hover {
                background: #f1f5f9;
            }
            select.sc-field[multiple] option:checked {
                background: #2563eb;
                color: #ffffff;
                font-weight: 600;
            }

            .sc-row input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: #2563eb;
                cursor: pointer;
            }

            .sc-panel-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-top: 24px;
                margin-top: 16px;
                border-top: 1px solid #e2e8f0;
            }

            .sc-panel-footer-label { display: flex; align-items: center; gap: 6px; color: #2563eb; font-size: 13px; font-weight: 600; }

            .sc-placeholder { color: #64748b; font-size: 14px; font-style: italic; }

            /* ============================================================ */
            /* DARK MODE OVERRIDES FOR SYSTEM CONFIG                        */
            /* ============================================================ */
            :root[data-theme="dark"] .sc-wrapper {
                background: #0b1120;
                color: #f8fafc;
                color-scheme: dark;
            }

            :root[data-theme="dark"] .sc-header-bar {
                background: #1e293b;
                border-bottom: 1px solid #334155;
                color: #f8fafc;
            }

            :root[data-theme="dark"] .sc-collapse-btn {
                color: #94a3b8;
            }
            :root[data-theme="dark"] .sc-collapse-btn:hover {
                color: #f8fafc;
            }

            :root[data-theme="dark"] .sc-toolbar {
                background: #0f172a;
                border-bottom: 1px solid #1e293b;
            }

            :root[data-theme="dark"] .sc-save-btn {
                background: #0284c7;
                color: #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            }
            :root[data-theme="dark"] .sc-save-btn:hover {
                background: #0369a1;
            }

            :root[data-theme="dark"] .sc-search-input {
                background: #1e293b;
                border-color: #334155;
                color: #f8fafc;
            }
            :root[data-theme="dark"] .sc-search-input::placeholder {
                color: #64748b;
            }
            :root[data-theme="dark"] .sc-search-input:focus {
                border-color: #38bdf8;
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
            }

            :root[data-theme="dark"] .sc-search-btn {
                background: #0284c7;
                color: #ffffff;
            }
            :root[data-theme="dark"] .sc-search-btn:hover {
                background: #0369a1;
            }

            :root[data-theme="dark"] .sc-sidebar {
                background: #0f172a;
                border-right-color: #1e293b;
            }

            :root[data-theme="dark"] .sc-sidebar-item {
                color: #94a3b8;
                border-bottom-color: #1e293b;
                background: transparent;
            }
            :root[data-theme="dark"] .sc-sidebar-item:nth-child(even) {
                background: transparent;
            }
            :root[data-theme="dark"] .sc-sidebar-item:hover {
                background: #1e293b;
                color: #f8fafc;
            }
            :root[data-theme="dark"] .sc-sidebar-item.active {
                background: #0284c7;
                color: #ffffff;
                font-weight: 600;
                border-left: 4px solid #38bdf8;
            }

            :root[data-theme="dark"] .sc-content {
                background: #0b1120;
            }

            :root[data-theme="dark"] .sc-panel h2 {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .sc-panel h2 .sc-hint {
                color: #94a3b8;
            }

            :root[data-theme="dark"] .sc-row {
                border-bottom-color: #1e293b;
            }

            :root[data-theme="dark"] .sc-row label {
                color: #e2e8f0;
                font-weight: 500;
            }

            :root[data-theme="dark"] .sc-field {
                background: #1e293b;
                border-color: #334155;
                color: #f8fafc;
            }
            :root[data-theme="dark"] .sc-field:focus {
                border-color: #38bdf8;
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
            }
            :root[data-theme="dark"] .sc-field option {
                background: #1e293b;
                color: #f8fafc;
            }

            :root[data-theme="dark"] select.sc-field[multiple] {
                background: #1e293b;
                border-color: #334155;
            }
            :root[data-theme="dark"] select.sc-field[multiple] option {
                background: #1e293b;
                color: #cbd5e1;
            }
            :root[data-theme="dark"] select.sc-field[multiple] option:hover {
                background: #334155;
                color: #ffffff;
            }
            :root[data-theme="dark"] select.sc-field[multiple] option:checked {
                background: #0284c7 !important;
                color: #ffffff !important;
            }

            :root[data-theme="dark"] .sc-row input[type="checkbox"] {
                accent-color: #0284c7;
            }

            :root[data-theme="dark"] .sc-panel-footer {
                border-top-color: #1e293b;
            }
            :root[data-theme="dark"] .sc-panel-footer-label {
                color: #38bdf8;
            }
            :root[data-theme="dark"] .sc-placeholder {
                color: #64748b;
            }

            /* Custom Dark Scrollbars */
            :root[data-theme="dark"] .sc-sidebar::-webkit-scrollbar,
            :root[data-theme="dark"] .sc-content::-webkit-scrollbar,
            :root[data-theme="dark"] select.sc-field[multiple]::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            :root[data-theme="dark"] .sc-sidebar::-webkit-scrollbar-track,
            :root[data-theme="dark"] .sc-content::-webkit-scrollbar-track,
            :root[data-theme="dark"] select.sc-field[multiple]::-webkit-scrollbar-track {
                background: #0f172a;
            }
            :root[data-theme="dark"] .sc-sidebar::-webkit-scrollbar-thumb,
            :root[data-theme="dark"] .sc-content::-webkit-scrollbar-thumb,
            :root[data-theme="dark"] select.sc-field[multiple]::-webkit-scrollbar-thumb {
                background: #334155;
                border-radius: 3px;
            }
            :root[data-theme="dark"] .sc-sidebar::-webkit-scrollbar-thumb:hover,
            :root[data-theme="dark"] .sc-content::-webkit-scrollbar-thumb:hover,
            :root[data-theme="dark"] select.sc-field[multiple]::-webkit-scrollbar-thumb:hover {
                background: #475569;
            }
        </style>

        <div class="sc-wrapper" id="scWrapper">
            <div class="sc-header-bar">
                <h1>Edit Configuration</h1>
                <button type="button" class="sc-collapse-btn" id="scCollapseBtn" title="Collapse sidebar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"></path></svg>
                </button>
            </div>

            <div class="sc-toolbar">
                <button type="button" class="sc-save-btn" id="scSaveTopBtn">&#10003; Save</button>
                <div class="sc-search-form">
                    <input type="text" id="scSearchInput" class="sc-search-input" placeholder="Search configuration">
                    <button type="button" class="sc-search-btn" id="scSearchBtn">&#128269; Search</button>
                </div>
            </div>

            <div class="sc-body">
                <div class="sc-sidebar" id="scSidebar">
                    ${sidebarItems}
                </div>
                <div class="sc-content" id="scContent">
                    ${panels}
                </div>
            </div>
        </div>
    `;
}
