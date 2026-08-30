export function VendorsView()
{
    return `
<style>
.ven-page {
    width: 100%;
    font-size: 13.5px;
}

.ven-card {
    width: 100%;
}

.ven-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.ven-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.ven-icon-badge {
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

.ven-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.ven-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.ven-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.ven-add-btn {
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

.ven-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.ven-add-btn svg {
    width: 14px;
    height: 14px;
}

.ven-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 16px 0 14px;
    flex-wrap: wrap;
}

.ven-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: #55647c;
    white-space: nowrap;
}

.ven-stat-pill svg {
    width: 13px;
    height: 13px;
    color: #8b98ac;
}

.ven-search-wrap {
    position: relative;
    flex: 1;
    max-width: 280px;
    min-width: 190px;
}

.ven-search-wrap svg {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: #96a2b8;
    pointer-events: none;
}

.ven-search-input {
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

.ven-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.ven-search-clear {
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

.ven-search-clear.show {
    display: flex;
}

.ven-search-clear:hover {
    background: #eef1f6;
    color: #38455a;
}

.ven-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.ven-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.ven-table th {
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

.ven-table td {
    padding: 9px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.ven-table tbody tr:last-child td {
    border-bottom: none;
}

.ven-table tbody tr:hover {
    background: #f8fafc;
}

.ven-name {
    font-weight: 600;
    color: #14181f;
}

.ven-muted {
    color: #6b7787;
}

.ven-muted.empty {
    color: #a3adbd;
    font-style: italic;
}

.ven-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
}

.ven-empty-state {
    text-align: center;
    padding: 48px 20px !important;
}

.ven-empty-state .ven-empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 14px;
    border-radius: 14px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ven-empty-state .ven-empty-icon svg {
    width: 22px;
    height: 22px;
    color: #a2aec4;
}

.ven-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 13px;
}

.ven-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 14px;
    margin-bottom: 4px;
}

.ven-skeleton-row td {
    padding: 12px 14px;
}

.ven-skeleton-bar {
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(90deg, #eef1f5 25%, #e4e8ee 37%, #eef1f5 63%);
    background-size: 400% 100%;
    animation: ven-shimmer 1.4s ease infinite;
}

@keyframes ven-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

@media (max-width: 640px) {
    .ven-header { flex-direction: column; align-items: stretch; }
    .ven-add-btn { width: 100%; justify-content: center; }
    .ven-toolbar { flex-direction: column; align-items: stretch; }
    .ven-search-wrap { max-width: none; }
}
</style>

<div class="ven-page">
    <div class="ven-card">
        <div class="ven-header">
            <div class="ven-header-title">
                <div class="ven-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"></path><path d="M9 21v-6h6v6"></path></svg>
                </div>
                <div>
                    <h1>Vendor Management</h1>
                    <p class="form-subtitle">Lab vendors available in the "Load Lab Compendium" Vendor list.</p>
                </div>
            </div>
            <button type="button" class="ven-add-btn" id="openAddVendorModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add Vendor
            </button>
        </div>

        <div id="listAlert"></div>

        <div class="ven-toolbar">
            <span class="ven-stat-pill" id="vendorCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"></path></svg>
                <span id="vendorCountText">0 vendors</span>
            </span>
            <div class="ven-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" id="vendorSearchInput" class="ven-search-input" placeholder="Search by name or NPI...">
                <button type="button" class="ven-search-clear" id="vendorSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="ven-table-wrap">
            <table class="ven-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>NPI</th>
                        <th>CLIA Number</th>
                        <th>Lab Code</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="vendorsTableBody">
                    <tr class="ven-skeleton-row"><td colspan="5"><div class="ven-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="ven-skeleton-row"><td colspan="5"><div class="ven-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="ven-skeleton-row"><td colspan="5"><div class="ven-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="vendorModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="vendorModalTitle">Add Vendor</h2>
            <button type="button" class="modal-close" id="closeVendorModal">&times;</button>
        </div>
        <p class="form-subtitle">Vendors are the labs/organizations you can select when loading a lab compendium file.</p>

        <div id="formAlert"></div>

        <form id="vendorForm">
            <input type="hidden" id="vendor_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="vendor_name" class="form-input" placeholder="e.g Diagnostic Pathology Medical Group">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>NPI</label>
                    <input id="vendor_npi" class="form-input" placeholder="10-digit National Provider Identifier">
                    <span class="form-error" id="err-facility_npi"></span>
                </div>

                <div class="form-group">
                    <label>CLIA Number</label>
                    <input id="vendor_clia" class="form-input" placeholder="Optional">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Lab Code</label>
                    <input id="vendor_lab_code" class="form-input" placeholder="Optional">
                    <span class="form-error"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelVendor">Cancel</button>
                <button class="login-btn" type="submit" id="saveVendorBtn">Add Vendor</button>
            </div>
        </form>
    </div>
</div>
`;
}
