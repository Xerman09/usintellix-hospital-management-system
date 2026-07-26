export function X12PartnersView()
{
    return `
<style>
.x12-page {
    width: 100%;
}

.x12-card {
    width: 100%;
}

.x12-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.x12-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.x12-icon-badge {
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

.x12-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.x12-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.x12-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.x12-add-btn {
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

.x12-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(29,78,216,.3);
}

.x12-add-btn svg {
    width: 16px;
    height: 16px;
}

.x12-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.x12-stat-pill {
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

.x12-stat-pill svg {
    width: 14px;
    height: 14px;
}

.x12-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.x12-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.x12-search-input {
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

.x12-search-input:focus {
    border-color: #1d4ed8;
    background: white;
    box-shadow: 0 0 0 4px rgba(29,78,216,.1);
}

.x12-search-clear {
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

.x12-search-clear.show {
    display: flex;
}

.x12-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.x12-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.x12-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.x12-table tbody tr {
    animation: x12-row-in .25s ease both;
}

@keyframes x12-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.x12-table th {
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

.x12-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.x12-table tbody tr:last-child td {
    border-bottom: none;
}

.x12-table tbody tr:hover {
    background: #fafbff;
}

.x12-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.x12-avatar {
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

.x12-name {
    font-weight: 600;
    color: #1a2338;
}

.x12-id-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f4fa;
    color: #52627a;
    font-size: 12px;
    font-weight: 700;
    font-family: "Courier New", monospace;
}

.x12-description {
    color: #71809b;
}

.x12-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.x12-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.x12-icon-btn {
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

.x12-icon-btn svg {
    width: 13px;
    height: 13px;
}

.x12-icon-btn.edit {
    background: #dbeafe;
    color: #1e40af;
}

.x12-icon-btn.edit:hover {
    background: #bfdbfe;
}

.x12-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.x12-icon-btn.delete:hover {
    background: #fecaca;
}

.x12-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.x12-empty-state .x12-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.x12-empty-state .x12-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.x12-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.x12-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.x12-skeleton-row td {
    padding: 16px 18px;
}

.x12-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: x12-shimmer 1.4s ease infinite;
}

@keyframes x12-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.x12-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1d4ed8, #1d4ed8);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.x12-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.x12-partner-id-input {
    font-family: "Courier New", monospace;
}

@media (max-width: 640px) {
    .x12-header { flex-direction: column; }
    .x12-add-btn { width: 100%; justify-content: center; }
    .x12-toolbar { flex-direction: column; align-items: stretch; }
    .x12-search-wrap { max-width: none; }
}
</style>

<div class="x12-page">
    <div class="x12-card">
        <div class="x12-header">
            <div class="x12-header-title">
                <div class="x12-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m9 15 6-6"></path></svg>
                </div>
                <div>
                    <h1>X12 Partner Management</h1>
                    <p class="form-subtitle">Trading partners registered here become available for EDI (X12) claims, eligibility, and remittance transactions.</p>
                </div>
            </div>
            <button type="button" class="x12-add-btn" id="openAddX12PartnerModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create X12 Partner
            </button>
        </div>

        <div class="x12-toolbar">
            <span class="x12-stat-pill" id="x12PartnerCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                <span id="x12PartnerCountText">0 partners</span>
            </span>
            <div class="x12-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="x12-search-input" id="x12PartnerSearch" placeholder="Search partners...">
                <button type="button" class="x12-search-clear" id="x12PartnerSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="x12-table-wrap">
            <table class="x12-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Partner ID</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="x12PartnersTableBody">
                    <tr class="x12-skeleton-row"><td colspan="4"><div class="x12-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="x12-skeleton-row"><td colspan="4"><div class="x12-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="x12-skeleton-row"><td colspan="4"><div class="x12-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="x12PartnerModalOverlay">
    <div class="modal-box">
        <div class="x12-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m9 15 6-6"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="x12PartnerModalTitle">Add X12 Partner</h2>
            <button type="button" class="modal-close" id="closeX12PartnerModal">&times;</button>
        </div>
        <p class="form-subtitle">Define an EDI trading partner used for X12 transactions.</p>

        <div id="formAlert"></div>

        <form id="x12PartnerForm">
            <input type="hidden" id="x12_partner_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Availity Clearinghouse">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Partner ID</label>
                    <input id="partner_id" class="form-input x12-partner-id-input" placeholder="e.g ISA/GS sender-receiver ID">
                    <span class="form-error" id="err-partner_id"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelX12Partner">Cancel</button>
                <button class="login-btn" type="submit" id="saveX12PartnerBtn">Add X12 Partner</button>
            </div>
        </form>
    </div>
</div>
`;
}
