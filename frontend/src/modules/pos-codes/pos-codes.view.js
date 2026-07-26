export function PosCodesView()
{
    return `
<style>
.pos-page {
    width: 100%;
}

.pos-card {
    width: 100%;
}

.pos-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.pos-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.pos-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(var(--accent-rgb),.28);
}

.pos-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.pos-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pos-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.pos-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(var(--accent-rgb),.24);
    transition: .18s;
    white-space: nowrap;
}

.pos-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.pos-add-btn svg {
    width: 16px;
    height: 16px;
}

.pos-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.pos-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: var(--accent-light);
    color: var(--accent-text);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.pos-stat-pill svg {
    width: 14px;
    height: 14px;
}

.pos-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.pos-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.pos-search-input {
    width: 100%;
    height: 40px;
    padding: 0 34px 0 38px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    color: #24324a;
    background: #fbfcfe;
    transition: .15s;
}

.pos-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.pos-search-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 6px;
    background: #eef1f7;
    color: #71809b;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
}

.pos-search-clear.show {
    display: flex;
}

.pos-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.pos-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.pos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.pos-table tbody tr {
    animation: pos-row-in .25s ease both;
}

@keyframes pos-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.pos-table th {
    text-align: left;
    padding: 14px 18px;
    color: #71809b;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .4px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    white-space: nowrap;
}

.pos-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.pos-table tbody tr:last-child td {
    border-bottom: none;
}

.pos-table tbody tr:hover {
    background: #fafbff;
}

.pos-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pos-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--accent-light);
    color: var(--accent-text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.pos-name {
    font-weight: 600;
    color: #1a2338;
}

.pos-code-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f4fa;
    color: #52627a;
    font-size: 12px;
    font-weight: 700;
    font-family: "Courier New", monospace;
}

.pos-description {
    color: #71809b;
}

.pos-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.pos-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.pos-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: .12s;
}

.pos-icon-btn svg {
    width: 13px;
    height: 13px;
}

.pos-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.pos-icon-btn.edit:hover {
    background: var(--accent-border);
}

.pos-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.pos-icon-btn.delete:hover {
    background: #fecaca;
}

.pos-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.pos-empty-state .pos-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pos-empty-state .pos-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.pos-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.pos-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.pos-skeleton-row td {
    padding: 16px 18px;
}

.pos-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: pos-shimmer 1.4s ease infinite;
}

@keyframes pos-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.pos-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.pos-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.pos-code-input {
    font-family: "Courier New", monospace;
}

@media (max-width: 640px) {
    .pos-header { flex-direction: column; }
    .pos-add-btn { width: 100%; justify-content: center; }
    .pos-toolbar { flex-direction: column; align-items: stretch; }
    .pos-search-wrap { max-width: none; }
}
</style>

<div class="pos-page">
    <div class="pos-card">
        <div class="pos-header">
            <div class="pos-header-title">
                <div class="pos-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6"></path></svg>
                </div>
                <div>
                    <h1>POS Code Management</h1>
                    <p class="form-subtitle">Place of Service codes registered here become available when billing for where a service was rendered.</p>
                </div>
            </div>
            <button type="button" class="pos-add-btn" id="openAddPosCodeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create POS Code
            </button>
        </div>

        <div class="pos-toolbar">
            <span class="pos-stat-pill" id="posCodeCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V9l7-6 7 6v12"></path></svg>
                <span id="posCodeCountText">0 POS codes</span>
            </span>
            <div class="pos-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="pos-search-input" id="posCodeSearch" placeholder="Search POS codes...">
                <button type="button" class="pos-search-clear" id="posCodeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="pos-table-wrap">
            <table class="pos-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="posCodesTableBody">
                    <tr class="pos-skeleton-row"><td colspan="4"><div class="pos-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="pos-skeleton-row"><td colspan="4"><div class="pos-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="pos-skeleton-row"><td colspan="4"><div class="pos-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="posCodeModalOverlay">
    <div class="modal-box">
        <div class="pos-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="posCodeModalTitle">Add POS Code</h2>
            <button type="button" class="modal-close" id="closePosCodeModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a Place of Service code used for billing.</p>

        <div id="formAlert"></div>

        <form id="posCodeForm">
            <input type="hidden" id="record_id">
            <div class="form-grid">
                <div class="form-group">
                    <label>Code</label>
                    <input id="code" class="form-input pos-code-input" placeholder="e.g 11">
                    <span class="form-error" id="err-code"></span>
                </div>

                <div class="form-group">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Office">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelPosCode">Cancel</button>
                <button class="login-btn" type="submit" id="savePosCodeBtn">Add POS Code</button>
            </div>
        </form>
    </div>
</div>
`;
}
