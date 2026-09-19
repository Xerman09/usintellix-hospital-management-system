export function TemplateMaintenanceView()
{
    return `
<style>
.tmpl-modal-box {
    max-width: 1100px;
    width: 100%;
}

.tmpl-page {
    width: 100%;
}

.tmpl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 20px;
}

.tmpl-header h1 {
    margin: 0;
    font-size: 22px;
    color: var(--text-primary);
}

.tmpl-header-actions {
    display: flex;
    align-items: center;
    gap: 20px;
    font-size: 14px;
    color: var(--text-primary);
}

.tmpl-header-actions label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.tmpl-header-actions a {
    color: var(--accent);
    text-decoration: none;
    cursor: pointer;
}

.tmpl-dashboard-btn {
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 18px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
}

.tmpl-toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #23272f;
    padding: 14px 16px;
    border-radius: 8px 8px 0 0;
    flex-wrap: wrap;
}

.tmpl-toolbar-label {
    color: white;
    font-weight: 700;
    font-size: 14px;
}

.tmpl-category-select {
    min-width: 220px;
    height: 36px;
    border-radius: 6px;
    border: none;
    padding: 0 10px;
}

.tmpl-toolbar-btn {
    height: 36px;
    padding: 0 16px;
    border-radius: 6px;
    border: none;
    background: #cbd5e1;
    color: #1e293b;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.tmpl-toolbar-btn:hover {
    background: #b6c2d1;
}

.tmpl-toolbar-spacer {
    flex: 1;
}

.tmpl-search-row {
    display: flex;
    align-items: stretch;
    gap: 0;
    background: #23272f;
    padding: 0 16px 16px;
    border-radius: 0 0 8px 8px;
    position: relative;
}

.tmpl-search-wrap {
    position: relative;
    flex: 1;
}

.tmpl-search-input {
    width: 100%;
    height: 40px;
    border: 2px solid var(--accent);
    border-right: none;
    border-radius: 4px 0 0 4px;
    padding: 0 12px;
    font-size: 14px;
    box-sizing: border-box;
}

.tmpl-search-dropdown {
    position: absolute;
    top: 42px;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 0 0 6px 6px;
    max-height: 260px;
    overflow-y: auto;
    z-index: 20;
    box-shadow: 0 8px 20px rgba(0,0,0,.2);
}

.tmpl-search-option {
    padding: 10px 14px;
    font-size: 14.5px;
    color: #1e293b;
    cursor: pointer;
    border-bottom: 1px solid #f0f2f7;
}

.tmpl-search-option:hover,
.tmpl-search-option.active {
    background: #2563eb;
    color: white;
}

.tmpl-search-btn,
.tmpl-clear-btn {
    height: 40px;
    padding: 0 18px;
    border: none;
    background: #cbd5e1;
    color: #1e293b;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.tmpl-search-btn {
    border-radius: 0;
}

.tmpl-clear-btn {
    border-radius: 0 4px 4px 0;
}

.tmpl-current-scope {
    margin: 14px 0;
    font-size: 14px;
    color: var(--text-primary);
}

.tmpl-current-scope strong {
    color: var(--accent);
}

.tmpl-repo-panel {
    margin-bottom: 20px;
}

.tmpl-section {
    border-top: 1px solid var(--border-color);
    padding-top: 14px;
    margin-top: 14px;
}

.tmpl-section-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: var(--accent);
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
}

.tmpl-section-toggle svg {
    width: 18px;
    height: 18px;
}

.tmpl-section-body {
    margin-top: 14px;
}

.tmpl-empty {
    color: var(--text-muted);
    font-size: 13.5px;
    padding: 8px 0;
}

.tmpl-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.tmpl-upload-btn {
    height: 32px;
    padding: 0 14px;
    border-radius: 6px;
    border: none;
    background: var(--accent-lighter);
    color: var(--accent-text);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.tmpl-upload-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0;
    flex-wrap: wrap;
}

.tmpl-row-category-select {
    width: 100%;
    min-width: 140px;
    height: 34px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    padding: 0 8px;
    font-size: 13px;
}

.tmpl-name-link {
    color: var(--accent);
    background: none;
    border: 1px solid var(--accent);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.tmpl-name-link:hover {
    background: var(--accent-lighter);
}

.tmpl-delete-link {
    color: #b91c1c;
    background: none;
    border: 1px solid #dc2626;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-left: 6px;
}

.tmpl-delete-link:hover {
    background: #fee2e2;
}

.tmpl-section-count {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-muted);
}

@media (max-width: 720px) {
    .tmpl-header { flex-direction: column; align-items: flex-start; }
    .tmpl-toolbar { flex-direction: column; align-items: stretch; }
    .tmpl-category-select { width: 100%; }
}
</style>

<div class="modal-overlay" id="templateMaintenanceModalOverlay">
<div class="modal-box tmpl-modal-box">
<div class="tmpl-page">
    <div class="tmpl-header">
        <h1>Template Maintenance</h1>
        <div class="tmpl-header-actions">
            <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13.5px;"><input type="checkbox" id="tmplFullEditor" checked> Full Editor</label>
            <button type="button" class="btn-secondary" id="tmplHelpLink" style="padding: 6px 14px; font-size: 13px; font-weight: 500;">Help</button>
            <button type="button" class="tmpl-dashboard-btn" id="tmplDashboardBtn">Dashboard</button>
            <button type="button" class="modal-close" id="closeTemplateMaintenanceModal">&times;</button>
        </div>
    </div>

    <div class="tmpl-toolbar">
        <span class="tmpl-toolbar-label">Scope</span>
        <span class="tmpl-toolbar-label">Category</span>
        <select class="tmpl-category-select" id="tmplCategorySelect">
            <option value="">Select...</option>
        </select>
        <button type="button" class="tmpl-toolbar-btn" id="tmplCategoriesBtn" title="Manage Categories">+ Category</button>
        <button type="button" class="tmpl-toolbar-btn" id="tmplSubmitBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Submit
        </button>
        <button type="button" class="tmpl-toolbar-btn" id="tmplProfilesBtn">Profiles</button>
        <button type="button" class="tmpl-toolbar-btn" id="tmplGroupsBtn">Groups</button>
        <button type="button" class="tmpl-toolbar-btn" id="tmplAssignBtn">Assign</button>
    </div>

    <div class="tmpl-search-row">
        <div class="tmpl-search-wrap">
            <input type="text" class="tmpl-search-input" id="tmplScopeSearch" placeholder="Type to search.">
            <div class="tmpl-search-dropdown" id="tmplScopeDropdown" hidden></div>
        </div>
        <button type="button" class="tmpl-search-btn" id="tmplSearchBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
            Search
        </button>
        <button type="button" class="tmpl-clear-btn" id="tmplClearBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 6 6 18M6 6l12 12"></path></svg>
            Clear
        </button>
    </div>

    <div class="tmpl-current-scope" id="tmplCurrentScopeLabel">No scope selected -- search "All Patients" or a patient's name above.</div>

    <div class="tmpl-section">
        <div class="tmpl-section-header">
            <button type="button" class="tmpl-section-toggle" id="tmplRepositoryToggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Template Repository
                <span class="tmpl-section-count" id="tmplRepositoryCount"></span>
            </button>
            <button type="button" class="tmpl-upload-btn" id="tmplUploadToggleBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 3v12M7 8l5-5 5 5"></path><path d="M5 21h14"></path></svg>
                Upload
            </button>
        </div>
        <div class="tmpl-section-body" id="tmplRepositorySectionBody" style="display: none;">
            <div class="tmpl-upload-row" id="tmplUploadRow" style="display: none;">
                <input type="file" id="tmplUploadFile">
                <input type="text" class="form-input" id="tmplUploadName" placeholder="Destination filename (optional)" style="max-width: 260px;">
                <button type="button" class="btn-primary-inline" id="tmplUploadConfirmBtn">Upload</button>
                <button type="button" class="btn-secondary" id="tmplUploadCancelBtn">Cancel</button>
            </div>
            <div id="tmplUploadAlert"></div>
            <div class="data-table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="tmplSelectAllTemplates"></th>
                            <th>Category</th>
                            <th>Template Actions</th>
                            <th>Size</th>
                            <th>Last Modified</th>
                        </tr>
                    </thead>
                    <tbody id="tmplRepositoryBody">
                        <tr><td colspan="5" class="table-empty">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="tmpl-section">
        <h3 style="font-size: 15px; color: var(--text-primary); margin: 0 0 12px;">Profiles in Portal</h3>
        <div class="data-table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th style="width: 60px;">Active</th><th>Profile</th><th>Assigned Templates</th><th>Assigned Groups</th></tr>
                </thead>
                <tbody id="tmplProfilesPortalBody">
                    <tr><td colspan="4" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="tmpl-section">
        <button type="button" class="tmpl-section-toggle" id="tmplDefaultToggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            Default Patient Templates
            <span class="tmpl-section-count" id="tmplDefaultCount"></span>
        </button>
        <div class="tmpl-section-body" id="tmplDefaultBody" style="display: none;"></div>
    </div>

    <div class="tmpl-section">
        <button type="button" class="tmpl-section-toggle" id="tmplAssignedToggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            Patient Assigned Templates
            <span class="tmpl-section-count" id="tmplAssignedCount"></span>
        </button>
        <div class="tmpl-section-body" id="tmplAssignedBody" style="display: none;"></div>
    </div>
</div>
</div>
</div>

<div class="modal-overlay" id="tmplCategoriesModalOverlay">
    <div class="modal-box" style="max-width: 560px;">
        <div class="modal-header">
            <h2>Template Categories</h2>
            <button type="button" class="modal-close" id="closeTmplCategoriesModal">&times;</button>
        </div>
        <p class="form-subtitle">The Category picker's options -- tag templates with these from the toolbar.</p>

        <div id="tmplCategoryFormAlert"></div>

        <form id="tmplCategoryForm" onsubmit="event.preventDefault();">
            <input type="hidden" id="tmplCategoryId">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Category Name</label>
                    <input id="tmplCategoryName" class="form-input" placeholder="e.g. Consent Forms">
                    <span class="form-error" id="err-tmplCategoryName"></span>
                </div>
                <div class="form-group full">
                    <label>Description</label>
                    <input id="tmplCategoryDescription" class="form-input" placeholder="Optional description">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="tmplCategoryCancelBtn">Cancel</button>
                <button class="btn-primary-inline" type="submit" id="tmplCategorySaveBtn">Add Category</button>
            </div>
        </form>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0 14px;">

        <div class="data-table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Description</th><th style="width: 110px;">Actions</th></tr>
                </thead>
                <tbody id="tmplCategoriesTableBody">
                    <tr><td colspan="3" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="tmplGroupsModalOverlay">
    <div class="modal-box" style="max-width: 680px;">
        <div class="modal-header">
            <h2>Template Groups</h2>
            <button type="button" class="modal-close" id="closeTmplGroupsModal">&times;</button>
        </div>
        <p class="form-subtitle">A named bundle of templates you can assign together in one action.</p>

        <div id="tmplGroupFormAlert"></div>

        <form id="tmplGroupForm" onsubmit="event.preventDefault();">
            <input type="hidden" id="tmplGroupId">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Group Name</label>
                    <input id="tmplGroupName" class="form-input" placeholder="e.g. New Patient Intake Packet">
                    <span class="form-error" id="err-tmplGroupName"></span>
                </div>
                <div class="form-group full">
                    <label>Description</label>
                    <input id="tmplGroupDescription" class="form-input" placeholder="Optional description">
                </div>
                <div class="form-group full">
                    <label>Templates in this Group</label>
                    <div id="tmplGroupTemplatesPicker" style="max-height: 160px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 8px;"></div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="tmplGroupCancelBtn">Cancel</button>
                <button class="btn-primary-inline" type="submit" id="tmplGroupSaveBtn">Add Group</button>
            </div>
        </form>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0 14px;">

        <div class="data-table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Templates</th><th style="width: 150px;">Actions</th></tr>
                </thead>
                <tbody id="tmplGroupsTableBody">
                    <tr><td colspan="3" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="tmplProfilesModalOverlay">
    <div class="modal-box" style="max-width: 640px;">
        <div class="modal-header">
            <h2>Template Profiles</h2>
            <button type="button" class="modal-close" id="closeTmplProfilesModal">&times;</button>
        </div>
        <p class="form-subtitle">A saved Category + Group preset you can load into the toolbar in one click.</p>

        <div id="tmplProfileFormAlert"></div>

        <form id="tmplProfileForm" onsubmit="event.preventDefault();">
            <input type="hidden" id="tmplProfileId">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Profile Name</label>
                    <input id="tmplProfileName" class="form-input" placeholder="e.g. Standard Adult Intake">
                    <span class="form-error" id="err-tmplProfileName"></span>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="tmplProfileCategory" class="form-input">
                        <option value="">None</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Group</label>
                    <select id="tmplProfileGroup" class="form-input">
                        <option value="">None</option>
                    </select>
                </div>
                <div class="form-group full">
                    <label>Description</label>
                    <input id="tmplProfileDescription" class="form-input" placeholder="Optional description">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="tmplProfileCancelBtn">Cancel</button>
                <button class="btn-primary-inline" type="submit" id="tmplProfileSaveBtn">Add Profile</button>
            </div>
        </form>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0 14px;">

        <div class="data-table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Category</th><th>Group</th><th style="width: 150px;">Actions</th></tr>
                </thead>
                <tbody id="tmplProfilesTableBody">
                    <tr><td colspan="4" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;
}
