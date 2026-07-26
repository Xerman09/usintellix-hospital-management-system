export function PayerTypesView()
{
    return `
<style>
.pt-page {
    width: 100%;
}

.pt-card {
    width: 100%;
}

.pt-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.pt-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.pt-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, #1d4ed8, #1d4ed8);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(29,78,216,.28);
}

.pt-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.pt-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pt-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.pt-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, #1d4ed8, #1d4ed8);
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(29,78,216,.24);
    transition: .18s;
    white-space: nowrap;
}

.pt-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(29,78,216,.3);
}

.pt-add-btn svg {
    width: 16px;
    height: 16px;
}

.pt-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.pt-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #eff6ff;
    color: #1e40af;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.pt-stat-pill svg {
    width: 14px;
    height: 14px;
}

.pt-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.pt-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.pt-search-input {
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

.pt-search-input:focus {
    border-color: #1d4ed8;
    background: white;
    box-shadow: 0 0 0 4px rgba(29,78,216,.1);
}

.pt-search-clear {
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

.pt-search-clear.show {
    display: flex;
}

.pt-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.pt-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.pt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.pt-table tbody tr {
    animation: pt-row-in .25s ease both;
}

@keyframes pt-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.pt-table th {
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

.pt-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.pt-table tbody tr:last-child td {
    border-bottom: none;
}

.pt-table tbody tr:hover {
    background: #fafbff;
}

.pt-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pt-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #eff6ff;
    color: #1e40af;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.pt-name {
    font-weight: 600;
    color: #1a2338;
}

.pt-description {
    color: #71809b;
}

.pt-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.pt-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.pt-icon-btn {
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

.pt-icon-btn svg {
    width: 13px;
    height: 13px;
}

.pt-icon-btn.edit {
    background: #dbeafe;
    color: #1e40af;
}

.pt-icon-btn.edit:hover {
    background: #bfdbfe;
}

.pt-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.pt-icon-btn.delete:hover {
    background: #fecaca;
}

.pt-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.pt-empty-state .pt-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pt-empty-state .pt-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.pt-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.pt-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.pt-skeleton-row td {
    padding: 16px 18px;
}

.pt-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: pt-shimmer 1.4s ease infinite;
}

@keyframes pt-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.pt-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1d4ed8, #1d4ed8);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.pt-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .pt-header { flex-direction: column; }
    .pt-add-btn { width: 100%; justify-content: center; }
    .pt-toolbar { flex-direction: column; align-items: stretch; }
    .pt-search-wrap { max-width: none; }
}
</style>

<div class="pt-page">
    <div class="pt-card">
        <div class="pt-header">
            <div class="pt-header-title">
                <div class="pt-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path><circle cx="7" cy="15" r="1"></circle></svg>
                </div>
                <div>
                    <h1>Payer Type Management</h1>
                    <p class="form-subtitle">Payer types registered here become available when recording patient billing and insurance information.</p>
                </div>
            </div>
            <button type="button" class="pt-add-btn" id="openAddPayerTypeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Payer Type
            </button>
        </div>

        <div class="pt-toolbar">
            <span class="pt-stat-pill" id="payerTypeCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg>
                <span id="payerTypeCountText">0 payer types</span>
            </span>
            <div class="pt-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="pt-search-input" id="payerTypeSearch" placeholder="Search payer types...">
                <button type="button" class="pt-search-clear" id="payerTypeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="pt-table-wrap">
            <table class="pt-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="payerTypesTableBody">
                    <tr class="pt-skeleton-row"><td colspan="3"><div class="pt-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="pt-skeleton-row"><td colspan="3"><div class="pt-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="pt-skeleton-row"><td colspan="3"><div class="pt-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="payerTypeModalOverlay">
    <div class="modal-box">
        <div class="pt-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path><circle cx="7" cy="15" r="1"></circle></svg>
        </div>
        <div class="modal-header">
            <h2 id="payerTypeModalTitle">Add Payer Type</h2>
            <button type="button" class="modal-close" id="closePayerTypeModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a payer type used when recording patient billing and insurance information.</p>

        <div id="formAlert"></div>

        <form id="payerTypeForm">
            <input type="hidden" id="payer_type_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g HMO">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelPayerType">Cancel</button>
                <button class="login-btn" type="submit" id="savePayerTypeBtn">Add Payer Type</button>
            </div>
        </form>
    </div>
</div>
`;
}
