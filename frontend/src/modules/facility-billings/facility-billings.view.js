export function FacilityBillingsView()
{
    return `
<style>
.fb-page {
    width: 100%;
}

.fb-card {
    width: 100%;
}

.fb-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.fb-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.fb-icon-badge {
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

.fb-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.fb-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.fb-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.fb-add-btn {
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

.fb-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(29,78,216,.3);
}

.fb-add-btn svg {
    width: 16px;
    height: 16px;
}

.fb-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.fb-stat-pill {
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

.fb-stat-pill svg {
    width: 14px;
    height: 14px;
}

.fb-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.fb-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.fb-search-input {
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

.fb-search-input:focus {
    border-color: #1d4ed8;
    background: white;
    box-shadow: 0 0 0 4px rgba(29,78,216,.1);
}

.fb-search-clear {
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

.fb-search-clear.show {
    display: flex;
}

.fb-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.fb-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.fb-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.fb-table tbody tr {
    animation: fb-row-in .25s ease both;
}

@keyframes fb-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.fb-table th {
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

.fb-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.fb-table tbody tr:last-child td {
    border-bottom: none;
}

.fb-table tbody tr:hover {
    background: #fafbff;
}

.fb-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.fb-avatar {
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

.fb-name {
    font-weight: 600;
    color: #1a2338;
}

.fb-rate {
    font-weight: 700;
    color: #15803d;
}

.fb-description {
    color: #71809b;
}

.fb-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.fb-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.fb-icon-btn {
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

.fb-icon-btn svg {
    width: 13px;
    height: 13px;
}

.fb-icon-btn.edit {
    background: #dbeafe;
    color: #1e40af;
}

.fb-icon-btn.edit:hover {
    background: #bfdbfe;
}

.fb-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.fb-icon-btn.delete:hover {
    background: #fecaca;
}

.fb-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.fb-empty-state .fb-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.fb-empty-state .fb-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.fb-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.fb-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.fb-skeleton-row td {
    padding: 16px 18px;
}

.fb-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: fb-shimmer 1.4s ease infinite;
}

@keyframes fb-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.fb-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1d4ed8, #1d4ed8);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.fb-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.fb-rate-input-wrap {
    position: relative;
}

.fb-rate-input-wrap span {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #71809b;
    font-size: 13.5px;
    font-weight: 600;
    pointer-events: none;
}

.fb-rate-input-wrap input {
    padding-left: 30px;
}

@media (max-width: 640px) {
    .fb-header { flex-direction: column; }
    .fb-add-btn { width: 100%; justify-content: center; }
    .fb-toolbar { flex-direction: column; align-items: stretch; }
    .fb-search-wrap { max-width: none; }
}
</style>

<div class="fb-page">
    <div class="fb-card">
        <div class="fb-header">
            <div class="fb-header-title">
                <div class="fb-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20M6 15h4"></path></svg>
                </div>
                <div>
                    <h1>Facility Billing</h1>
                    <p class="form-subtitle">Billing rates registered here become available when charging for facility usage.</p>
                </div>
            </div>
            <button type="button" class="fb-add-btn" id="openAddFacilityBillingModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Facility Billing
            </button>
        </div>

        <div class="fb-toolbar">
            <span class="fb-stat-pill" id="facilityBillingCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg>
                <span id="facilityBillingCountText">0 billing records</span>
            </span>
            <div class="fb-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="fb-search-input" id="facilityBillingSearch" placeholder="Search billing records...">
                <button type="button" class="fb-search-clear" id="facilityBillingSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="fb-table-wrap">
            <table class="fb-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Rate</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="facilityBillingsTableBody">
                    <tr class="fb-skeleton-row"><td colspan="4"><div class="fb-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="fb-skeleton-row"><td colspan="4"><div class="fb-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="fb-skeleton-row"><td colspan="4"><div class="fb-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="facilityBillingModalOverlay">
    <div class="modal-box">
        <div class="fb-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20M6 15h4"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="facilityBillingModalTitle">Add Facility Billing</h2>
            <button type="button" class="modal-close" id="closeFacilityBillingModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a billing rate used when charging for facility usage.</p>

        <div id="formAlert"></div>

        <form id="facilityBillingForm">
            <input type="hidden" id="facility_billing_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Radiology Standard Fee">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Rate</label>
                    <div class="fb-rate-input-wrap">
                        <span>&#8369;</span>
                        <input id="rate" type="number" step="0.01" min="0" class="form-input" placeholder="0.00">
                    </div>
                    <span class="form-error" id="err-rate"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelFacilityBilling">Cancel</button>
                <button class="login-btn" type="submit" id="saveFacilityBillingBtn">Add Facility Billing</button>
            </div>
        </form>
    </div>
</div>
`;
}
