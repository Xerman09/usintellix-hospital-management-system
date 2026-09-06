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
                <option value="full">Full</option>
                <option value="multiple">Multiple</option>
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
            .sc-wrapper { font-family: Arial, sans-serif; height: 100%; display: flex; flex-direction: column; }

            .sc-header-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #4a72b0;
                color: white;
                padding: 14px 20px;
            }

            .sc-header-bar h1 { margin: 0; font-size: 20px; font-weight: 600; }

            .sc-collapse-btn { background: none; border: none; color: rgba(255,255,255,.85); cursor: pointer; }
            .sc-collapse-btn:hover { color: white; }

            .sc-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 20px;
                border-bottom: 1px solid #e2e8f0;
            }

            .sc-save-btn {
                padding: 8px 16px;
                background: #3f5f8a;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            }

            .sc-save-btn:hover { background: #35507a; }

            .sc-search-form { display: flex; gap: 0; }

            .sc-search-input {
                padding: 8px 12px;
                border: 1px solid #cbd5e0;
                border-radius: 4px 0 0 4px;
                font-size: 13px;
                width: 260px;
            }

            .sc-search-btn {
                padding: 8px 14px;
                background: #3f5f8a;
                color: white;
                border: none;
                border-radius: 0 4px 4px 0;
                cursor: pointer;
                font-size: 13px;
            }

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
                padding: 12px 16px;
                color: #1a202c;
                text-decoration: none;
                font-size: 13px;
                border-bottom: 1px solid #edf2f7;
            }

            .sc-sidebar-item:nth-child(even) { background: #eef2fb; }
            .sc-sidebar-item:hover { background: #e2e8f0; }
            .sc-sidebar-item.active { background: #4a72b0; color: white; font-weight: 600; }

            .sc-content { flex: 1; overflow-y: auto; padding: 20px 24px; }

            .sc-panel { display: none; }
            .sc-panel.active { display: block; }

            .sc-panel h2 { margin: 0 0 16px; font-size: 20px; color: #1a202c; }
            .sc-panel h2 .sc-hint { font-size: 13px; font-weight: normal; color: #718096; }

            .sc-row {
                display: grid;
                grid-template-columns: 1fr 320px;
                align-items: center;
                gap: 16px;
                padding: 10px 0;
                border-bottom: 1px solid #edf2f7;
            }

            .sc-row.sc-row-hidden { display: none; }
            .sc-row-tall { align-items: start; }

            .sc-row label { font-size: 13px; color: #2d3748; }

            .sc-field {
                width: 100%;
                padding: 6px 10px;
                border: 1px solid #cbd5e0;
                border-radius: 4px;
                font-size: 13px;
                color: #2d3748;
                box-sizing: border-box;
            }

            select.sc-field[multiple] { padding: 4px; }
            select.sc-field[multiple] option { padding: 3px 6px; color: #2c5282; }

            .sc-panel-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-top: 16px;
                margin-top: 8px;
            }

            .sc-panel-footer-label { display: flex; align-items: center; gap: 6px; color: #4a72b0; font-size: 13px; }

            .sc-placeholder { color: #718096; font-size: 13px; font-style: italic; }
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
