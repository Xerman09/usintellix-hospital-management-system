export function PriceLevelsView()
{
    return `
<style>
.pl-page {
    width: 100%;
}

.pl-card {
    width: 100%;
}

.pl-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.pl-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.pl-icon-badge {
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

.pl-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.pl-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pl-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.pl-add-btn {
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

.pl-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.pl-add-btn svg {
    width: 16px;
    height: 16px;
}

.pl-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.pl-stat-pill {
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

.pl-stat-pill svg {
    width: 14px;
    height: 14px;
}

.pl-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.pl-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.pl-search-input {
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

.pl-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.pl-search-clear {
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

.pl-search-clear.show {
    display: flex;
}

.pl-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.pl-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.pl-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.pl-table tbody tr {
    animation: pl-row-in .25s ease both;
}

@keyframes pl-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.pl-table th {
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

.pl-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.pl-table tbody tr:last-child td {
    border-bottom: none;
}

.pl-table tbody tr {
    transition: background .12s;
}

.pl-table tbody tr:hover {
    background: #fafbff;
}

.pl-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pl-avatar {
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

.pl-name {
    font-weight: 600;
    color: #1a2338;
}

.pl-description {
    color: #71809b;
}

.pl-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.pl-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.pl-icon-btn {
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

.pl-icon-btn svg {
    width: 13px;
    height: 13px;
}

.pl-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.pl-icon-btn.edit:hover {
    background: var(--accent-border);
}

.pl-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.pl-icon-btn.delete:hover {
    background: #fecaca;
}

.pl-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.pl-empty-state .pl-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pl-empty-state .pl-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.pl-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.pl-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.pl-skeleton-row td {
    padding: 16px 18px;
}

.pl-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: pl-shimmer 1.4s ease infinite;
}

@keyframes pl-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.pl-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.pl-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .pl-header { flex-direction: column; }
    .pl-add-btn { width: 100%; justify-content: center; }
    .pl-toolbar { flex-direction: column; align-items: stretch; }
    .pl-search-wrap { max-width: none; }
}
</style>

<div class="pl-page">
    <div class="pl-card">
        <div class="pl-header">
            <div class="pl-header-title">
                <div class="pl-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div>
                    <h1>Price Level Management</h1>
                    <p class="form-subtitle">Price levels registered here become available when setting fees on the billing catalog.</p>
                </div>
            </div>
            <button type="button" class="pl-add-btn" id="openAddPriceLevelModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Price Level
            </button>
        </div>

        <div class="pl-toolbar">
            <span class="pl-stat-pill" id="priceLevelCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                <span id="priceLevelCountText">0 price levels</span>
            </span>
            <div class="pl-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="pl-search-input" id="priceLevelSearch" placeholder="Search price levels...">
                <button type="button" class="pl-search-clear" id="priceLevelSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="pl-table-wrap">
            <table class="pl-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="priceLevelsTableBody">
                    <tr class="pl-skeleton-row"><td colspan="3"><div class="pl-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="pl-skeleton-row"><td colspan="3"><div class="pl-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="pl-skeleton-row"><td colspan="3"><div class="pl-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="priceLevelModalOverlay">
    <div class="modal-box">
        <div class="pl-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="priceLevelModalTitle">Add Price Level</h2>
            <button type="button" class="modal-close" id="closePriceLevelModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a price level used on the billing fee catalog.</p>

        <div id="formAlert"></div>

        <form id="priceLevelForm">
            <input type="hidden" id="price_level_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Standard">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelPriceLevel">Cancel</button>
                <button class="login-btn" type="submit" id="savePriceLevelBtn">Add Price Level</button>
            </div>
        </form>
    </div>
</div>
`;
}
