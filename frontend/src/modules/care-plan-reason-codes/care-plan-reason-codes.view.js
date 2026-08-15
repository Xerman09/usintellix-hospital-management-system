export function CarePlanReasonCodesView()
{
    return `
<style>
.cprc-page {
    width: 100%;
}

.cprc-card {
    width: 100%;
}

.cprc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.cprc-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.cprc-icon-badge {
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

.cprc-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.cprc-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.cprc-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.cprc-add-btn {
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

.cprc-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.cprc-add-btn svg {
    width: 16px;
    height: 16px;
}

.cprc-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.cprc-stat-pill {
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

.cprc-stat-pill svg {
    width: 14px;
    height: 14px;
}

.cprc-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.cprc-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.cprc-search-input {
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

.cprc-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.cprc-search-clear {
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

.cprc-search-clear.show {
    display: flex;
}

.cprc-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.cprc-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.cprc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.cprc-table tbody tr {
    animation: cprc-row-in .25s ease both;
}

@keyframes cprc-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.cprc-table th {
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

.cprc-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.cprc-table tbody tr:last-child td {
    border-bottom: none;
}

.cprc-table tbody tr {
    transition: background .12s;
}

.cprc-table tbody tr:hover {
    background: #fafbff;
}

.cprc-code-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cprc-avatar {
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

.cprc-code {
    font-weight: 600;
    color: #1a2338;
}

.cprc-description {
    color: #71809b;
}

.cprc-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.cprc-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.cprc-icon-btn {
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

.cprc-icon-btn svg {
    width: 13px;
    height: 13px;
}

.cprc-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.cprc-icon-btn.edit:hover {
    background: var(--accent-border);
}

.cprc-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.cprc-icon-btn.delete:hover {
    background: #fecaca;
}

.cprc-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.cprc-empty-state .cprc-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cprc-empty-state .cprc-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.cprc-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.cprc-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.cprc-skeleton-row td {
    padding: 16px 18px;
}

.cprc-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: cprc-shimmer 1.4s ease infinite;
}

@keyframes cprc-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.cprc-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.cprc-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .cprc-header { flex-direction: column; }
    .cprc-add-btn { width: 100%; justify-content: center; }
    .cprc-toolbar { flex-direction: column; align-items: stretch; }
    .cprc-search-wrap { max-width: none; }
}
</style>

<div class="cprc-page">
    <div class="cprc-card">
        <div class="cprc-header">
            <div class="cprc-header-title">
                <div class="cprc-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11H3v10h6z"></path><path d="M21 3h-6v18h6z"></path><path d="M9 7h6"></path><path d="M9 3h6v4H9z"></path></svg>
                </div>
                <div>
                    <h1>Care Plan Reason Code Management</h1>
                    <p class="form-subtitle">Reason codes registered here become available when documenting why a patient's care plan was added to, changed, or discontinued.</p>
                </div>
            </div>
            <button type="button" class="cprc-add-btn" id="openAddCarePlanReasonCodeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Reason Code
            </button>
        </div>

        <div class="cprc-toolbar">
            <span class="cprc-stat-pill" id="carePlanReasonCodeCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                <span id="carePlanReasonCodeCountText">0 reason codes</span>
            </span>
            <div class="cprc-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="cprc-search-input" id="carePlanReasonCodeSearch" placeholder="Search reason codes...">
                <button type="button" class="cprc-search-clear" id="carePlanReasonCodeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="cprc-table-wrap">
            <table class="cprc-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="carePlanReasonCodesTableBody">
                    <tr class="cprc-skeleton-row"><td colspan="3"><div class="cprc-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="cprc-skeleton-row"><td colspan="3"><div class="cprc-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="cprc-skeleton-row"><td colspan="3"><div class="cprc-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="carePlanReasonCodeModalOverlay">
    <div class="modal-box">
        <div class="cprc-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11H3v10h6z"></path><path d="M21 3h-6v18h6z"></path><path d="M9 7h6"></path><path d="M9 3h6v4H9z"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="carePlanReasonCodeModalTitle">Add Reason Code</h2>
            <button type="button" class="modal-close" id="closeCarePlanReasonCodeModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a reason code used when documenting a care plan change.</p>

        <div id="formAlert"></div>

        <form id="carePlanReasonCodeForm">
            <input type="hidden" id="care_plan_reason_code_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Code</label>
                    <input id="code" class="form-input" placeholder="e.g GOAL-MET">
                    <span class="form-error" id="err-code"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="e.g Goal has been met">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCarePlanReasonCode">Cancel</button>
                <button class="login-btn" type="submit" id="saveCarePlanReasonCodeBtn">Add Reason Code</button>
            </div>
        </form>
    </div>
</div>
`;
}
