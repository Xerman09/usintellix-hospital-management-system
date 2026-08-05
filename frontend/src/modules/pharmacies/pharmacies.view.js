export function PharmaciesView()
{
    return `
<style>
.pharmacy-page {
    width: 100%;
}

.pharmacy-card {
    width: 100%;
}

.pharmacy-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.pharmacy-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.pharmacy-icon-badge {
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

.pharmacy-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.pharmacy-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pharmacy-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.pharmacy-add-btn {
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

.pharmacy-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.pharmacy-add-btn svg {
    width: 16px;
    height: 16px;
}

.pharmacy-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.pharmacy-stat-pill {
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

.pharmacy-stat-pill svg {
    width: 14px;
    height: 14px;
}

.pharmacy-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.pharmacy-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.pharmacy-search-input {
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

.pharmacy-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.pharmacy-search-clear {
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

.pharmacy-search-clear.show {
    display: flex;
}

.pharmacy-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.pharmacy-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.pharmacy-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.pharmacy-table tbody tr {
    animation: pharmacy-row-in .25s ease both;
}

@keyframes pharmacy-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.pharmacy-table th {
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

.pharmacy-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.pharmacy-table tbody tr:last-child td {
    border-bottom: none;
}

.pharmacy-table tbody tr:hover {
    background: #fafbff;
}

.pharmacy-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pharmacy-avatar {
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

.pharmacy-name {
    font-weight: 600;
    color: #1a2338;
}

.pharmacy-method-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f4fa;
    color: #52627a;
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
}

.pharmacy-address {
    color: #71809b;
}

.pharmacy-address.empty {
    font-style: italic;
    color: #a2aec4;
}

.pharmacy-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.pharmacy-icon-btn {
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

.pharmacy-icon-btn svg {
    width: 13px;
    height: 13px;
}

.pharmacy-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.pharmacy-icon-btn.edit:hover {
    background: var(--accent-border);
}

.pharmacy-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.pharmacy-icon-btn.delete:hover {
    background: #fecaca;
}

.pharmacy-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.pharmacy-empty-state .pharmacy-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pharmacy-empty-state .pharmacy-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.pharmacy-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.pharmacy-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.pharmacy-skeleton-row td {
    padding: 16px 18px;
}

.pharmacy-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: pharmacy-shimmer 1.4s ease infinite;
}

@keyframes pharmacy-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.pharmacy-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.pharmacy-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .pharmacy-header { flex-direction: column; }
    .pharmacy-add-btn { width: 100%; justify-content: center; }
    .pharmacy-toolbar { flex-direction: column; align-items: stretch; }
    .pharmacy-search-wrap { max-width: none; }
}
</style>

<div class="pharmacy-page">
    <div class="pharmacy-card">
        <div class="pharmacy-header">
            <div class="pharmacy-header-title">
                <div class="pharmacy-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6.5"></path><path d="M12 11V7"></path><path d="M10 9h4"></path><circle cx="17.5" cy="17.5" r="4.5"></circle><path d="M17.5 15.5v4M15.5 17.5h4"></path></svg>
                </div>
                <div>
                    <h1>Pharmacies</h1>
                    <p class="form-subtitle">Pharmacies registered here become available for prescription routing and referrals.</p>
                </div>
            </div>
            <button type="button" class="pharmacy-add-btn" id="openAddPharmacyModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add a Pharmacy
            </button>
        </div>

        <div class="pharmacy-toolbar">
            <span class="pharmacy-stat-pill" id="pharmacyCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6.5"></path></svg>
                <span id="pharmacyCountText">0 pharmacies</span>
            </span>
            <div class="pharmacy-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="pharmacy-search-input" id="pharmacySearch" placeholder="Search pharmacies...">
                <button type="button" class="pharmacy-search-clear" id="pharmacySearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="pharmacy-table-wrap">
            <table class="pharmacy-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Default Method</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="pharmaciesTableBody">
                    <tr class="pharmacy-skeleton-row"><td colspan="4"><div class="pharmacy-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="pharmacy-skeleton-row"><td colspan="4"><div class="pharmacy-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="pharmacy-skeleton-row"><td colspan="4"><div class="pharmacy-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="pharmacyModalOverlay">
    <div class="modal-box">
        <div class="pharmacy-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6.5"></path><path d="M12 11V7"></path><path d="M10 9h4"></path><circle cx="17.5" cy="17.5" r="4.5"></circle><path d="M17.5 15.5v4M15.5 17.5h4"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="pharmacyModalTitle">Add a Pharmacy</h2>
            <button type="button" class="modal-close" id="closePharmacyModal">&times;</button>
        </div>
        <p class="form-subtitle">Enter the pharmacy's details below.</p>

        <div id="formAlert"></div>

        <form id="pharmacyForm">
            <input type="hidden" id="pharmacy_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Walgreens Pharmacy">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Address</label>
                    <input id="address" class="form-input" placeholder="Street address">
                    <span class="form-error" id="err-address"></span>
                </div>

                <div class="form-group full">
                    <label>Address 2</label>
                    <input id="address2" class="form-input" placeholder="Suite, unit, etc. (optional)">
                    <span class="form-error" id="err-address2"></span>
                </div>

                <div class="form-group">
                    <label>City</label>
                    <input id="city" class="form-input" placeholder="City">
                    <span class="form-error" id="err-city"></span>
                </div>

                <div class="form-group">
                    <label>State</label>
                    <input id="state" class="form-input" placeholder="State">
                    <span class="form-error" id="err-state"></span>
                </div>

                <div class="form-group">
                    <label>Zip Code</label>
                    <input id="zip" class="form-input" placeholder="Zip code">
                    <span class="form-error" id="err-zip"></span>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input id="email" type="email" class="form-input" placeholder="pharmacy@example.com">
                    <span class="form-error" id="err-email"></span>
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input id="phone" class="form-input" placeholder="Phone number">
                    <span class="form-error" id="err-phone"></span>
                </div>

                <div class="form-group">
                    <label>Fax</label>
                    <input id="fax" class="form-input" placeholder="Fax number">
                    <span class="form-error" id="err-fax"></span>
                </div>

                <div class="form-group">
                    <label>NPI</label>
                    <input id="npi" class="form-input" placeholder="NPI">
                    <span class="form-error" id="err-npi"></span>
                </div>

                <div class="form-group">
                    <label>NCPDP</label>
                    <input id="ncpdp" class="form-input" placeholder="NCPDP">
                    <span class="form-error" id="err-ncpdp"></span>
                </div>

                <div class="form-group">
                    <label>Default Method</label>
                    <select id="default_method" class="form-input">
                        <option value="">None Selected</option>
                        <option value="print">Print</option>
                        <option value="email">Email</option>
                        <option value="fax">Fax</option>
                        <option value="transmit">Transmit</option>
                        <option value="erx">eRx</option>
                    </select>
                    <span class="form-error" id="err-default_method"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelPharmacy">Cancel</button>
                <button class="login-btn" type="submit" id="savePharmacyBtn">Add a Pharmacy</button>
            </div>
        </form>
    </div>
</div>
`;
}
