export function FacilitiesView()
{
    return `
<style>
.fac-page {
    width: 100%;
}

.fac-card {
    width: 100%;
}

.fac-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.fac-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.fac-icon-badge {
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

.fac-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.fac-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.fac-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.fac-add-btn {
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

.fac-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.fac-add-btn svg {
    width: 16px;
    height: 16px;
}

.fac-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.fac-stat-pill {
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

.fac-stat-pill svg {
    width: 14px;
    height: 14px;
}

.fac-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.fac-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.fac-search-input {
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

.fac-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.fac-search-clear {
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

.fac-search-clear.show {
    display: flex;
}

.fac-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.fac-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.fac-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.fac-table tbody tr {
    animation: fac-row-in .25s ease both;
}

@keyframes fac-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.fac-table th {
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

.fac-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.fac-table tbody tr:last-child td {
    border-bottom: none;
}

.fac-table tbody tr:hover {
    background: #fafbff;
}

.fac-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.fac-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.fac-name {
    font-weight: 600;
    color: #1a2338;
}

.fac-muted {
    color: #71809b;
}

.fac-muted.empty {
    font-style: italic;
    color: #a2aec4;
}

.fac-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--accent-light);
    color: var(--accent-text);
    font-size: 12px;
    font-weight: 600;
}

.fac-tag.empty {
    background: none;
    color: #a2aec4;
    font-style: italic;
    font-weight: 400;
    padding: 0;
}

.fac-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
}

.fac-status-badge.active {
    background: #dcfce7;
    color: #15803d;
}

.fac-status-badge.inactive {
    background: #f1f4fa;
    color: #71809b;
}

.fac-status-badge .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.fac-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.fac-icon-btn {
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

.fac-icon-btn svg {
    width: 13px;
    height: 13px;
}

.fac-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.fac-icon-btn.edit:hover {
    background: var(--accent-border);
}

.fac-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.fac-icon-btn.delete:hover {
    background: #fecaca;
}

.fac-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.fac-empty-state .fac-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.fac-empty-state .fac-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.fac-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.fac-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.fac-skeleton-row td {
    padding: 16px 18px;
}

.fac-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: fac-shimmer 1.4s ease infinite;
}

@keyframes fac-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.fac-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.fac-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

/* ===== Facility form ===== */

.fac-name-group {
    margin-bottom: 22px;
}

.fac-section {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid #e5e9f2;
}

.fac-section:first-of-type {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
}

.fac-section-label {
    font-size: 13.5px;
    font-weight: 700;
    color: #1a2338;
    margin: 0 0 2px;
}

.fac-section-desc {
    font-size: 12px;
    color: #8792a6;
    margin: 0 0 14px;
}

.fac-checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #52627a;
    cursor: pointer;
    margin-bottom: 12px;
}

.fac-checkbox-label input {
    width: 15px;
    height: 15px;
    accent-color: var(--accent);
    cursor: pointer;
}

.fac-mailing-block {
    margin-top: 12px;
    padding: 14px 14px 2px;
    border: 1px dashed #d9e1ee;
    border-radius: 8px;
}

.fac-mailing-block[hidden] {
    display: none;
}

.fac-color-field {
    display: flex;
    align-items: center;
    gap: 8px;
}

.fac-color-native {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    padding: 2px;
    border: 1.5px solid #d9e1ee;
    border-radius: 7px;
    background: white;
    cursor: pointer;
}

.fac-color-hex {
    flex: 1;
    max-width: 160px;
    font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
    font-size: 13px;
}

.fac-tax-id-wrap {
    display: flex;
    gap: 8px;
}

.fac-tax-id-wrap select {
    flex: 0 0 84px;
}

.fac-tax-id-wrap .form-input {
    flex: 1;
}

.fac-check-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 14px;
}

.fac-check-item {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 9px 11px;
    border: 1px solid #e5e9f2;
    border-radius: 7px;
    cursor: pointer;
    transition: border-color .12s, background-color .12s;
}

.fac-check-item:hover {
    border-color: var(--accent-border);
    background: #fafbff;
}

.fac-check-item input {
    margin-top: 2px;
    width: 14px;
    height: 14px;
    accent-color: var(--accent);
    cursor: pointer;
    flex-shrink: 0;
}

.fac-check-item input:disabled {
    cursor: not-allowed;
}

.fac-check-text strong {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: #25324b;
    line-height: 1.3;
}

.fac-check-text em {
    display: block;
    font-style: normal;
    font-size: 11px;
    color: #a2aec4;
    margin-top: 1px;
}

.fac-check-item.is-disabled {
    opacity: .55;
}

.fac-check-item.is-disabled:hover {
    border-color: #e5e9f2;
    background: none;
}

.fac-check-item.is-danger-active {
    border-color: #fca5a5;
    background: #fef2f2;
}

.fac-info-textarea {
    width: 100%;
    min-height: 80px;
    padding: 10px 13px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    font-family: inherit;
    color: #24324a;
    background: #fbfcfe;
    resize: vertical;
    transition: .15s;
}

.fac-info-textarea:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

@media (max-width: 640px) {
    .fac-header { flex-direction: column; }
    .fac-add-btn { width: 100%; justify-content: center; }
    .fac-toolbar { flex-direction: column; align-items: stretch; }
    .fac-search-wrap { max-width: none; }
    .fac-check-grid { grid-template-columns: 1fr; }
}
</style>

<div class="fac-page">
    <div class="fac-card">
        <div class="fac-header">
            <div class="fac-header-title">
                <div class="fac-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"></path></svg>
                </div>
                <div>
                    <h1>Facilities</h1>
                    <p class="form-subtitle">Facilities registered here become available for scheduling, billing, and resource management across the system.</p>
                </div>
            </div>
            <button type="button" class="fac-add-btn" id="openAddFacilityModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Facility
            </button>
        </div>

        <div class="fac-toolbar">
            <span class="fac-stat-pill" id="facilityCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"></path></svg>
                <span id="facilityCountText">0 facilities</span>
            </span>
            <div class="fac-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="fac-search-input" id="facilitySearch" placeholder="Search facilities...">
                <button type="button" class="fac-search-clear" id="facilitySearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="fac-table-wrap">
            <table class="fac-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Organization Type</th>
                        <th>Phone</th>
                        <th>City</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="facilitiesTableBody">
                    <tr class="fac-skeleton-row"><td colspan="6"><div class="fac-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="fac-skeleton-row"><td colspan="6"><div class="fac-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="fac-skeleton-row"><td colspan="6"><div class="fac-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="facilityModalOverlay">
    <div class="modal-box" style="max-width: 920px;">
        <div class="fac-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="facilityModalTitle">Add Facility</h2>
            <button type="button" class="modal-close" id="closeFacilityModal">&times;</button>
        </div>
        <p class="form-subtitle">Register a facility used for scheduling, billing, and resource management.</p>

        <div id="formAlert"></div>

        <form id="facilityForm">
            <input type="hidden" id="record_id">

            <div class="form-group fac-name-group">
                <label>Facility Name</label>
                <input id="name" class="form-input" placeholder="Facility Name">
                <span class="form-error" id="err-name"></span>
            </div>

            <div class="fac-section">
                <p class="fac-section-label">Address</p>
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Street Address</label>
                        <input id="physical_address_line1" class="form-input" placeholder="Street address">
                    </div>
                    <div class="form-group">
                        <label>City</label>
                        <input id="physical_city" class="form-input" placeholder="City">
                    </div>
                    <div class="form-group">
                        <label>State</label>
                        <input id="physical_state" class="form-input" placeholder="State">
                    </div>
                    <div class="form-group">
                        <label>Zip Code</label>
                        <input id="physical_zip" class="form-input" placeholder="Zip code">
                    </div>
                    <div class="form-group">
                        <label>Country</label>
                        <input id="physical_country" class="form-input" placeholder="Country">
                    </div>
                </div>

                <label class="fac-checkbox-label" style="margin-top: 14px;">
                    <input type="checkbox" id="different_mailing_address">
                    Mailing address is different from the address above
                </label>

                <div class="fac-mailing-block" id="mailingAddressBlock" hidden>
                    <div class="form-grid">
                        <div class="form-group full">
                            <label>Mailing Street Address</label>
                            <input id="mailing_address_line1" class="form-input" placeholder="Street address">
                        </div>
                        <div class="form-group">
                            <label>City</label>
                            <input id="mailing_city" class="form-input" placeholder="City">
                        </div>
                        <div class="form-group">
                            <label>State</label>
                            <input id="mailing_state" class="form-input" placeholder="State">
                        </div>
                        <div class="form-group">
                            <label>Zip Code</label>
                            <input id="mailing_zip" class="form-input" placeholder="Zip code">
                        </div>
                        <div class="form-group">
                            <label>Country</label>
                            <input id="mailing_country" class="form-input" placeholder="Country">
                        </div>
                    </div>
                </div>
            </div>

            <div class="fac-section">
                <p class="fac-section-label">Contact</p>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Phone</label>
                        <input id="phone" class="form-input" placeholder="Phone">
                    </div>
                    <div class="form-group">
                        <label>Fax</label>
                        <input id="fax" class="form-input" placeholder="Fax">
                    </div>
                    <div class="form-group">
                        <label>Website</label>
                        <input id="website" class="form-input" placeholder="Website">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input id="email" class="form-input" placeholder="Email">
                    </div>
                </div>
            </div>

            <div class="fac-section">
                <p class="fac-section-label">Classification</p>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Organization Type</label>
                        <select id="organization_type_id" class="form-input">
                            <option value="">-- Select Organization Type --</option>
                        </select>
                        <span class="form-error" id="err-organization_type_id"></span>
                    </div>

                    <div class="form-group">
                        <label>POS Code</label>
                        <select id="pos_code_id" class="form-input">
                            <option value="">-- Select POS Code --</option>
                        </select>
                        <span class="form-error" id="err-pos_code_id"></span>
                    </div>

                    <div class="form-group full">
                        <label>Facility Taxonomy</label>
                        <input id="facility_taxonomy" class="form-input" placeholder="Facility Taxonomy">
                    </div>
                </div>

                <div class="form-group" style="margin-top: 4px;">
                    <label>Color Tag *</label>
                    <div class="fac-color-field">
                        <input type="color" id="color_native" class="fac-color-native" value="#1d4ed8">
                        <input id="color" class="form-input fac-color-hex" placeholder="#1d4ed8" value="#1d4ed8">
                    </div>
                    <span class="form-error" id="err-color"></span>
                </div>
            </div>

            <div class="fac-section">
                <p class="fac-section-label">Billing &amp; Identifiers</p>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Billing Attn</label>
                        <input id="billing_attn" class="form-input" placeholder="Billing Attn">
                    </div>

                    <div class="form-group">
                        <label>Tax ID</label>
                        <div class="fac-tax-id-wrap">
                            <select id="tax_id_type" class="form-input">
                                <option value="EIN">EIN</option>
                                <option value="SSN">SSN</option>
                            </select>
                            <input id="tax_id" class="form-input" placeholder="Tax ID">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>IBAN</label>
                        <input id="iban" class="form-input" placeholder="IBAN">
                    </div>

                    <div class="form-group">
                        <label>OID</label>
                        <input id="oid" class="form-input" placeholder="OID">
                    </div>

                    <div class="form-group">
                        <label>CLIA Number</label>
                        <input id="clia_number" class="form-input" placeholder="CLIA Number">
                    </div>

                    <div class="form-group">
                        <label>Facility Lab Code</label>
                        <input id="facility_lab_code" class="form-input" placeholder="Facility Lab Code">
                    </div>

                    <div class="form-group full">
                        <label>Facility NPI</label>
                        <input id="facility_npi" class="form-input" placeholder="Facility NPI">
                    </div>
                </div>
            </div>

            <div class="fac-section">
                <p class="fac-section-label">Status</p>
                <div class="fac-check-grid">
                    <label class="fac-check-item" id="item_is_billing_location">
                        <input type="checkbox" id="is_billing_location">
                        <span class="fac-check-text"><strong>Billing Location</strong></span>
                    </label>
                    <label class="fac-check-item is-disabled" id="item_accepts_assignment">
                        <input type="checkbox" id="accepts_assignment" disabled>
                        <span class="fac-check-text"><strong>Accepts Assignment</strong><em>Requires Billing Location</em></span>
                    </label>
                    <label class="fac-check-item" id="item_is_service_location">
                        <input type="checkbox" id="is_service_location">
                        <span class="fac-check-text"><strong>Service Location</strong></span>
                    </label>
                    <label class="fac-check-item" id="item_is_primary_business_entity">
                        <input type="checkbox" id="is_primary_business_entity">
                        <span class="fac-check-text"><strong>Primary Business Entity</strong></span>
                    </label>
                    <label class="fac-check-item" id="item_is_inactive">
                        <input type="checkbox" id="is_inactive">
                        <span class="fac-check-text"><strong>Facility Inactive</strong></span>
                    </label>
                </div>
            </div>

            <div class="fac-section">
                <p class="fac-section-label">Notes</p>
                <textarea id="info" class="fac-info-textarea" placeholder="Additional notes about this facility"></textarea>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelFacility">Cancel</button>
                <button class="login-btn" type="submit" id="saveFacilityBtn">Add Facility</button>
            </div>
        </form>
    </div>
</div>
`;
}
