export function CompletionStatusesView()
{
    return `
<style>
.cs-page {
    width: 100%;
}

.cs-card {
    width: 100%;
}

.cs-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.cs-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.cs-icon-badge {
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

.cs-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.cs-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.cs-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.cs-add-btn {
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

.cs-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.cs-add-btn svg {
    width: 16px;
    height: 16px;
}

.cs-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.cs-stat-pill {
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

.cs-stat-pill svg {
    width: 14px;
    height: 14px;
}

.cs-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.cs-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.cs-search-input {
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

.cs-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.cs-search-clear {
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

.cs-search-clear.show {
    display: flex;
}

.cs-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.cs-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.cs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.cs-table tbody tr {
    animation: cs-row-in .25s ease both;
}

@keyframes cs-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.cs-table th {
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

.cs-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.cs-table tbody tr:last-child td {
    border-bottom: none;
}

.cs-table tbody tr {
    transition: background .12s;
}

.cs-table tbody tr:hover {
    background: #fafbff;
}

.cs-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cs-avatar {
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

.cs-name {
    font-weight: 600;
    color: #1a2338;
}

.cs-description {
    color: #71809b;
}

.cs-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.cs-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.cs-icon-btn {
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

.cs-icon-btn svg {
    width: 13px;
    height: 13px;
}

.cs-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.cs-icon-btn.edit:hover {
    background: var(--accent-border);
}

.cs-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.cs-icon-btn.delete:hover {
    background: #fecaca;
}

.cs-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.cs-empty-state .cs-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cs-empty-state .cs-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.cs-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.cs-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.cs-skeleton-row td {
    padding: 16px 18px;
}

.cs-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: cs-shimmer 1.4s ease infinite;
}

@keyframes cs-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.cs-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.cs-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .cs-header { flex-direction: column; }
    .cs-add-btn { width: 100%; justify-content: center; }
    .cs-toolbar { flex-direction: column; align-items: stretch; }
    .cs-search-wrap { max-width: none; }
}
</style>

<div class="cs-page">
    <div class="cs-card">
        <div class="cs-header">
            <div class="cs-header-title">
                <div class="cs-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>
                </div>
                <div>
                    <h1>Completion Status Management</h1>
                    <p class="form-subtitle">Statuses registered here become available when recording whether a medication or immunization was completed.</p>
                </div>
            </div>
            <button type="button" class="cs-add-btn" id="openAddCompletionStatusModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Status
            </button>
        </div>

        <div class="cs-toolbar">
            <span class="cs-stat-pill" id="completionStatusCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"></path></svg>
                <span id="completionStatusCountText">0 statuses</span>
            </span>
            <div class="cs-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="cs-search-input" id="completionStatusSearch" placeholder="Search statuses...">
                <button type="button" class="cs-search-clear" id="completionStatusSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="cs-table-wrap">
            <table class="cs-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="completionStatusesTableBody">
                    <tr class="cs-skeleton-row"><td colspan="3"><div class="cs-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="cs-skeleton-row"><td colspan="3"><div class="cs-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="cs-skeleton-row"><td colspan="3"><div class="cs-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="completionStatusModalOverlay">
    <div class="modal-box">
        <div class="cs-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="completionStatusModalTitle">Add Status</h2>
            <button type="button" class="modal-close" id="closeCompletionStatusModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a status used when recording a completed medication or immunization.</p>

        <div id="formAlert"></div>

        <form id="completionStatusForm">
            <input type="hidden" id="completion_status_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Completed">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCompletionStatus">Cancel</button>
                <button class="login-btn" type="submit" id="saveCompletionStatusBtn">Add Status</button>
            </div>
        </form>
    </div>
</div>
`;
}
