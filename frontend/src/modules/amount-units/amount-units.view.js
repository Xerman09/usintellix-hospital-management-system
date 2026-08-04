export function AmountUnitsView()
{
    return `
<style>
.au-page {
    width: 100%;
}

.au-card {
    width: 100%;
}

.au-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.au-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.au-icon-badge {
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

.au-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.au-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.au-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.au-add-btn {
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

.au-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.au-add-btn svg {
    width: 16px;
    height: 16px;
}

.au-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.au-stat-pill {
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

.au-stat-pill svg {
    width: 14px;
    height: 14px;
}

.au-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.au-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.au-search-input {
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

.au-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.au-search-clear {
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

.au-search-clear.show {
    display: flex;
}

.au-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.au-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.au-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.au-table tbody tr {
    animation: au-row-in .25s ease both;
}

@keyframes au-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.au-table th {
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

.au-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.au-table tbody tr:last-child td {
    border-bottom: none;
}

.au-table tbody tr {
    transition: background .12s;
}

.au-table tbody tr:hover {
    background: #fafbff;
}

.au-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.au-avatar {
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

.au-name {
    font-weight: 600;
    color: #1a2338;
}

.au-description {
    color: #71809b;
}

.au-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.au-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.au-icon-btn {
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

.au-icon-btn svg {
    width: 13px;
    height: 13px;
}

.au-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.au-icon-btn.edit:hover {
    background: var(--accent-border);
}

.au-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.au-icon-btn.delete:hover {
    background: #fecaca;
}

.au-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.au-empty-state .au-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.au-empty-state .au-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.au-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.au-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.au-skeleton-row td {
    padding: 16px 18px;
}

.au-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: au-shimmer 1.4s ease infinite;
}

@keyframes au-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.au-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.au-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .au-header { flex-direction: column; }
    .au-add-btn { width: 100%; justify-content: center; }
    .au-toolbar { flex-direction: column; align-items: stretch; }
    .au-search-wrap { max-width: none; }
}
</style>

<div class="au-page">
    <div class="au-card">
        <div class="au-header">
            <div class="au-header-title">
                <div class="au-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"></path><path d="M9 3v6H3"></path><path d="M9 3 3 9"></path><path d="M15 15h6M18 12v6"></path></svg>
                </div>
                <div>
                    <h1>Amount Units</h1>
                    <p class="form-subtitle">Units registered here become available when recording the amount of a medication or immunization given.</p>
                </div>
            </div>
            <button type="button" class="au-add-btn" id="openAddAmountUnitModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Unit
            </button>
        </div>

        <div class="au-toolbar">
            <span class="au-stat-pill" id="amountUnitCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"></path></svg>
                <span id="amountUnitCountText">0 units</span>
            </span>
            <div class="au-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="au-search-input" id="amountUnitSearch" placeholder="Search units...">
                <button type="button" class="au-search-clear" id="amountUnitSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="au-table-wrap">
            <table class="au-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="amountUnitsTableBody">
                    <tr class="au-skeleton-row"><td colspan="3"><div class="au-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="au-skeleton-row"><td colspan="3"><div class="au-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="au-skeleton-row"><td colspan="3"><div class="au-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="amountUnitModalOverlay">
    <div class="modal-box">
        <div class="au-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"></path><path d="M9 3v6H3"></path><path d="M9 3 3 9"></path><path d="M15 15h6M18 12v6"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="amountUnitModalTitle">Add Unit</h2>
            <button type="button" class="modal-close" id="closeAmountUnitModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a unit used when recording medication and immunization amounts.</p>

        <div id="formAlert"></div>

        <form id="amountUnitForm">
            <input type="hidden" id="amount_unit_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g mL">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAmountUnit">Cancel</button>
                <button class="login-btn" type="submit" id="saveAmountUnitBtn">Add Unit</button>
            </div>
        </form>
    </div>
</div>
`;
}
