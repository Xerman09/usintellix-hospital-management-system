function catalogSection({ key, title, subtitle, tbodyId, countPillId, countTextId, addBtnId, searchId, searchClearId })
{
    return `
    <div class="mts-section">
        <div class="mts-section-header">
            <div>
                <h2>${title}</h2>
                <p class="form-subtitle">${subtitle}</p>
            </div>
            <button type="button" class="mts-add-btn" id="${addBtnId}" data-catalog="${key}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add
            </button>
        </div>

        <div class="mts-toolbar">
            <span class="mts-stat-pill" id="${countPillId}">
                <span id="${countTextId}">0 entries</span>
            </span>
            <div class="mts-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="mts-search-input" id="${searchId}" placeholder="Search...">
                <button type="button" class="mts-search-clear" id="${searchClearId}" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="mts-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="${tbodyId}">
                    <tr><td colspan="2" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;
}

export function MessageSettingsView()
{
    return `
<style>
.mts-page {
    width: 100%;
    font-size: 13.5px;
}

.mts-card {
    width: 100%;
}

.mts-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.mts-icon-badge {
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

.mts-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.mts-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.mts-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
}

.mts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-top: 20px;
}

.mts-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.mts-section-header h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #14181f;
}

.mts-section-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12px;
}

.mts-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
}

.mts-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.mts-add-btn svg {
    width: 13px;
    height: 13px;
}

.mts-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 12px 0 10px;
}

.mts-stat-pill {
    font-size: 12px;
    font-weight: 600;
    color: #55647c;
    white-space: nowrap;
}

.mts-search-wrap {
    position: relative;
    flex: 1;
    max-width: 220px;
}

.mts-search-wrap svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 13px;
    height: 13px;
    color: #96a2b8;
    pointer-events: none;
}

.mts-search-input {
    width: 100%;
    height: 30px;
    padding: 0 28px 0 30px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 12.5px;
    background: white;
}

.mts-search-clear {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 4px;
    background: none;
    color: #8b98ac;
    font-size: 13px;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
}

.mts-search-clear.show {
    display: flex;
}

.mts-page .table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.mts-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.mts-table th {
    text-align: left;
    padding: 8px 12px;
    color: #6b7787;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: #f8fafc;
    border-bottom: 1px solid #e5e9f0;
}

.mts-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.mts-table tbody tr:last-child td {
    border-bottom: none;
}

.mts-table tbody tr:hover {
    background: #f8fafc;
}

.mts-row-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
}

@media (max-width: 860px) {
    .mts-grid { grid-template-columns: 1fr; }
}

:root[data-theme="dark"] .mts-section-header h2 { color: var(--text-primary); }
:root[data-theme="dark"] .mts-page .table-wrap { border-color: var(--border-color); }
</style>

<div class="mts-page">
    <div class="mts-card">
        <div class="mts-header">
            <div class="mts-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="m4 6 8 7 8-7"></path></svg>
            </div>
            <div>
                <h1>Message Types &amp; Statuses</h1>
                <p class="form-subtitle">Manage the type and status options available when composing messages.</p>
            </div>
        </div>

        <div id="listAlert"></div>

        <div class="mts-grid">
            ${catalogSection({
                key: "types",
                title: "Message Types",
                subtitle: "e.g. Chart Note, Insurance, Pharmacy...",
                tbodyId: "messageTypesTableBody",
                countPillId: "typesCountPill",
                countTextId: "typesCountText",
                addBtnId: "openAddTypeModal",
                searchId: "typesSearch",
                searchClearId: "typesSearchClear"
            })}
            ${catalogSection({
                key: "statuses",
                title: "Message Statuses",
                subtitle: "e.g. New, Read, In Progress...",
                tbodyId: "messageStatusesTableBody",
                countPillId: "statusesCountPill",
                countTextId: "statusesCountText",
                addBtnId: "openAddStatusModal",
                searchId: "statusesSearch",
                searchClearId: "statusesSearchClear"
            })}
        </div>
    </div>
</div>

<div class="modal-overlay" id="catalogEntryModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="catalogEntryModalTitle">Add Entry</h2>
            <button type="button" class="modal-close" id="closeCatalogEntryModal">&times;</button>
        </div>

        <div id="formAlert"></div>

        <form id="catalogEntryForm">
            <input type="hidden" id="catalog_entry_id">
            <input type="hidden" id="catalog_entry_kind">

            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="catalog_entry_name" class="form-input" placeholder="e.g Chart Note">
                    <span class="form-error" id="err-name"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCatalogEntry">Cancel</button>
                <button class="login-btn" type="submit" id="saveCatalogEntryBtn">Add</button>
            </div>
        </form>
    </div>
</div>
`;
}
