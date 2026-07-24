export function InsurancesView()
{
    return `
<style>
.ins-page {
    width: 100%;
}

.ins-card {
    width: 100%;
}

.ins-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.ins-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.ins-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(79,70,229,.28);
}

.ins-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.ins-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.ins-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.ins-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, #4f46e5, #2563eb);
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(37,99,235,.24);
    transition: .18s;
    white-space: nowrap;
}

.ins-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(37,99,235,.3);
}

.ins-add-btn svg {
    width: 16px;
    height: 16px;
}

.ins-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.ins-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.ins-stat-pill svg {
    width: 14px;
    height: 14px;
}

.ins-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.ins-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.ins-search-input {
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

.ins-search-input:focus {
    border-color: #4f46e5;
    background: white;
    box-shadow: 0 0 0 4px rgba(79,70,229,.1);
}

.ins-search-clear {
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

.ins-search-clear.show {
    display: flex;
}

.ins-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.ins-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.ins-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.ins-table tbody tr {
    animation: ins-row-in .25s ease both;
}

@keyframes ins-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.ins-table th {
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

.ins-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.ins-table tbody tr:last-child td {
    border-bottom: none;
}

.ins-table tbody tr:hover {
    background: #fafbff;
}

.ins-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.ins-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #eef2ff;
    color: #4338ca;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.ins-name-wrap {
    display: flex;
    flex-direction: column;
}

.ins-name {
    font-weight: 600;
    color: #1a2338;
}

.ins-subtext {
    font-size: 12px;
    color: #a2aec4;
}

.ins-id-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f4fa;
    color: #52627a;
    font-size: 12px;
    font-weight: 700;
    font-family: "Courier New", monospace;
}

.ins-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 12px;
    font-weight: 600;
}

.ins-tag.empty {
    background: none;
    color: #a2aec4;
    font-style: italic;
    font-weight: 400;
    padding: 0;
}

.ins-muted {
    color: #71809b;
}

.ins-muted.empty {
    font-style: italic;
    color: #a2aec4;
}

.ins-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.ins-icon-btn {
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

.ins-icon-btn svg {
    width: 13px;
    height: 13px;
}

.ins-icon-btn.edit {
    background: #e0e7ff;
    color: #4338ca;
}

.ins-icon-btn.edit:hover {
    background: #c7d2fe;
}

.ins-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.ins-icon-btn.delete:hover {
    background: #fecaca;
}

.ins-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.ins-empty-state .ins-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ins-empty-state .ins-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.ins-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.ins-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.ins-skeleton-row td {
    padding: 16px 18px;
}

.ins-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: ins-shimmer 1.4s ease infinite;
}

@keyframes ins-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.ins-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.ins-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.ins-section-label {
    grid-column: 1 / -1;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: #a2aec4;
    margin: 14px 0 2px;
}

.ins-section-label:first-child {
    margin-top: 0;
}

@media (max-width: 640px) {
    .ins-header { flex-direction: column; }
    .ins-add-btn { width: 100%; justify-content: center; }
    .ins-toolbar { flex-direction: column; align-items: stretch; }
    .ins-search-wrap { max-width: none; }
}
</style>

<div class="ins-page">
    <div class="ins-card">
        <div class="ins-header">
            <div class="ins-header-title">
                <div class="ins-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <div>
                    <h1>Insurance Management</h1>
                    <p class="form-subtitle">Insurance companies registered here become available for patient billing, claims, and eligibility.</p>
                </div>
            </div>
            <button type="button" class="ins-add-btn" id="openAddInsuranceModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Insurance
            </button>
        </div>

        <div class="ins-toolbar">
            <span class="ins-stat-pill" id="insuranceCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z"></path></svg>
                <span id="insuranceCountText">0 insurances</span>
            </span>
            <div class="ins-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="ins-search-input" id="insuranceSearch" placeholder="Search insurances...">
                <button type="button" class="ins-search-clear" id="insuranceSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="ins-table-wrap">
            <table class="ins-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Insurance ID</th>
                        <th>Payer Type</th>
                        <th>Phone</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="insurancesTableBody">
                    <tr class="ins-skeleton-row"><td colspan="5"><div class="ins-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="ins-skeleton-row"><td colspan="5"><div class="ins-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="ins-skeleton-row"><td colspan="5"><div class="ins-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="insuranceModalOverlay">
    <div class="modal-box" style="max-width: 820px;">
        <div class="ins-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z"></path><path d="m9 12 2 2 4-4"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="insuranceModalTitle">Add Insurance</h2>
            <button type="button" class="modal-close" id="closeInsuranceModal">&times;</button>
        </div>
        <p class="form-subtitle">Register an insurance company and its billing/EDI classification.</p>

        <div id="formAlert"></div>

        <form id="insuranceForm">
            <input type="hidden" id="record_id">
            <div class="form-grid">
                <div class="ins-section-label">Basic Information</div>

                <div class="form-group">
                    <label>Insurance ID</label>
                    <input id="insurance_id" class="form-input" placeholder="e.g INS-0001">
                    <span class="form-error" id="err-insurance_id"></span>
                </div>

                <div class="form-group">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Maxicare Healthcare Corp.">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Attention</label>
                    <input id="attention" class="form-input" placeholder="e.g Claims Department">
                    <span class="form-error" id="err-attention"></span>
                </div>

                <div class="ins-section-label">Address</div>

                <div class="form-group full">
                    <label>Address 1</label>
                    <input id="address_line1" class="form-input" placeholder="Street address">
                    <span class="form-error" id="err-address_line1"></span>
                </div>

                <div class="form-group full">
                    <label>Address 2</label>
                    <input id="address_line2" class="form-input" placeholder="Suite, floor, etc. (optional)">
                    <span class="form-error" id="err-address_line2"></span>
                </div>

                <div class="form-group">
                    <label>City</label>
                    <input id="city" class="form-input" placeholder="City">
                    <span class="form-error" id="err-city"></span>
                </div>

                <div class="form-group">
                    <label>State</label>
                    <input id="state" class="form-input" placeholder="State/Province">
                    <span class="form-error" id="err-state"></span>
                </div>

                <div class="form-group">
                    <label>Zip</label>
                    <input id="zip" class="form-input" placeholder="Zip/Postal code">
                    <span class="form-error" id="err-zip"></span>
                </div>

                <div class="form-group">
                    <label>Country</label>
                    <input id="country" class="form-input" placeholder="Country">
                    <span class="form-error" id="err-country"></span>
                </div>

                <div class="ins-section-label">Contact &amp; Billing Codes</div>

                <div class="form-group">
                    <label>Phone</label>
                    <input id="phone" class="form-input" placeholder="Phone number">
                    <span class="form-error" id="err-phone"></span>
                </div>

                <div class="form-group">
                    <label>Payer ID</label>
                    <input id="payer_id" class="form-input" placeholder="Payer identification number">
                    <span class="form-error" id="err-payer_id"></span>
                </div>

                <div class="ins-section-label">Classification</div>

                <div class="form-group">
                    <label>Payer Type</label>
                    <select id="payer_type_id" class="form-input">
                        <option value="">Select payer type</option>
                    </select>
                    <span class="form-error" id="err-payer_type_id"></span>
                </div>

                <div class="form-group">
                    <label>X12 Partner</label>
                    <select id="x12_partner_id" class="form-input">
                        <option value="">Select X12 partner</option>
                    </select>
                    <span class="form-error" id="err-x12_partner_id"></span>
                </div>

                <div class="form-group full">
                    <label>CQM Source of Payment</label>
                    <select id="cqm_source_of_payment_id" class="form-input">
                        <option value="">Select source of payment</option>
                    </select>
                    <span class="form-error" id="err-cqm_source_of_payment_id"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelInsurance">Cancel</button>
                <button class="login-btn" type="submit" id="saveInsuranceBtn">Add Insurance</button>
            </div>
        </form>
    </div>
</div>
`;
}
