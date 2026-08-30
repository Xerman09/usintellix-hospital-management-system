export function ContainerGroupsView()
{
    return `
<style>
.cg-page {
    width: 100%;
    font-size: 13.5px;
}

.cg-card {
    width: 100%;
}

.cg-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.cg-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cg-icon-badge {
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

.cg-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.cg-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.cg-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.cg-add-btn {
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

.cg-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.cg-add-btn svg {
    width: 14px;
    height: 14px;
}

.cg-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 16px 0 14px;
    flex-wrap: wrap;
}

.cg-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: #55647c;
    white-space: nowrap;
}

.cg-stat-pill svg {
    width: 13px;
    height: 13px;
    color: #8b98ac;
}

.cg-search-wrap {
    position: relative;
    flex: 1;
    max-width: 280px;
    min-width: 190px;
}

.cg-search-wrap svg {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: #96a2b8;
    pointer-events: none;
}

.cg-search-input {
    width: 100%;
    height: 32px;
    padding: 0 30px 0 32px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 13px;
    color: #1c2534;
    background: white;
    transition: border-color .12s;
}

.cg-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.cg-search-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    background: none;
    color: #8b98ac;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
}

.cg-search-clear.show {
    display: flex;
}

.cg-search-clear:hover {
    background: #eef1f6;
    color: #38455a;
}

.cg-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.cg-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.cg-table th {
    text-align: left;
    padding: 9px 14px;
    color: #6b7787;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: #f8fafc;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
}

.cg-table td {
    padding: 9px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.cg-table tbody tr:last-child td {
    border-bottom: none;
}

.cg-table tbody tr:hover {
    background: #f8fafc;
}

.cg-name {
    font-weight: 600;
    color: #14181f;
}

.cg-muted {
    color: #6b7787;
}

.cg-muted.empty {
    color: #a3adbd;
    font-style: italic;
}

.cg-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
}

.cg-empty-state {
    text-align: center;
    padding: 48px 20px !important;
}

.cg-empty-state .cg-empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 14px;
    border-radius: 14px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cg-empty-state .cg-empty-icon svg {
    width: 22px;
    height: 22px;
    color: #a2aec4;
}

.cg-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 13px;
}

.cg-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 14px;
    margin-bottom: 4px;
}

.cg-skeleton-row td {
    padding: 12px 14px;
}

.cg-skeleton-bar {
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(90deg, #eef1f5 25%, #e4e8ee 37%, #eef1f5 63%);
    background-size: 400% 100%;
    animation: cg-shimmer 1.4s ease infinite;
}

@keyframes cg-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

@media (max-width: 640px) {
    .cg-header { flex-direction: column; align-items: stretch; }
    .cg-add-btn { width: 100%; justify-content: center; }
    .cg-toolbar { flex-direction: column; align-items: stretch; }
    .cg-search-wrap { max-width: none; }
}
</style>

<div class="cg-page">
    <div class="cg-card">
        <div class="cg-header">
            <div class="cg-header-title">
                <div class="cg-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
                </div>
                <div>
                    <h1>Container Group Name Management</h1>
                    <p class="form-subtitle">Top-level groups available in the "Load Lab Compendium" Container Group Name list.</p>
                </div>
            </div>
            <button type="button" class="cg-add-btn" id="openAddContainerGroupModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add Container Group
            </button>
        </div>

        <div id="listAlert"></div>

        <div class="cg-toolbar">
            <span class="cg-stat-pill" id="containerGroupCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
                <span id="containerGroupCountText">0 groups</span>
            </span>
            <div class="cg-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" id="containerGroupSearchInput" class="cg-search-input" placeholder="Search by name...">
                <button type="button" class="cg-search-clear" id="containerGroupSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="cg-table-wrap">
            <table class="cg-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Sequence</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="containerGroupsTableBody">
                    <tr class="cg-skeleton-row"><td colspan="4"><div class="cg-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="cg-skeleton-row"><td colspan="4"><div class="cg-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="cg-skeleton-row"><td colspan="4"><div class="cg-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="containerGroupModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="containerGroupModalTitle">Add Container Group</h2>
            <button type="button" class="modal-close" id="closeContainerGroupModal">&times;</button>
        </div>
        <p class="form-subtitle">Container groups are the top-level categories you can load a lab compendium file into (e.g. "Laboratory", "Radiology").</p>

        <div id="formAlert"></div>

        <form id="containerGroupForm">
            <input type="hidden" id="container_group_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="container_group_name" class="form-input" placeholder="e.g Laboratory">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="container_group_description" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-description"></span>
                </div>

                <div class="form-group">
                    <label>Sequence</label>
                    <input id="container_group_sequence" type="number" class="form-input" value="0">
                    <span class="form-error" id="err-sequence"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelContainerGroup">Cancel</button>
                <button class="login-btn" type="submit" id="saveContainerGroupBtn">Add Container Group</button>
            </div>
        </form>
    </div>
</div>
`;
}
