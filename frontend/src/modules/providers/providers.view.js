export function ProvidersView()
{
    return `
<style>
.prov-page {
    width: 100%;
    font-size: 13.5px;
}

.prov-card {
    width: 100%;
}

.prov-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.prov-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.prov-icon-badge {
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

.prov-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.prov-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.prov-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.prov-add-btn {
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

.prov-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.prov-add-btn svg {
    width: 14px;
    height: 14px;
}

.prov-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 16px 0 14px;
    flex-wrap: wrap;
}

.prov-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: #55647c;
    white-space: nowrap;
}

.prov-stat-pill svg {
    width: 13px;
    height: 13px;
    color: #8b98ac;
}

.prov-toolbar-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    justify-content: flex-end;
    flex-wrap: wrap;
}

.prov-search-wrap {
    position: relative;
    flex: 1;
    max-width: 280px;
    min-width: 190px;
}

.prov-search-wrap svg {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: #96a2b8;
    pointer-events: none;
}

.prov-search-input {
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

.prov-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.prov-search-clear {
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

.prov-search-clear.show {
    display: flex;
}

.prov-search-clear:hover {
    background: #eef1f6;
    color: #38455a;
}

.prov-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.prov-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.prov-table th {
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

.prov-table td {
    padding: 9px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.prov-table tbody tr:last-child td {
    border-bottom: none;
}

.prov-table tbody tr:hover {
    background: #f8fafc;
}

.prov-name {
    font-weight: 600;
    color: #14181f;
}

.prov-muted {
    color: #6b7787;
}

.prov-actions {
    display: flex;
    justify-content: flex-end;
}

.prov-empty-state {
    text-align: left;
    padding: 32px 20px !important;
}

.prov-empty-state strong {
    display: block;
    color: #29323f;
    font-size: 13.5px;
    font-weight: 600;
}

.prov-empty-state p {
    margin: 2px 0 0;
    color: #6b7787;
    font-size: 13px;
}

.prov-skeleton-row td {
    padding: 12px 14px;
}

.prov-skeleton-bar {
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(90deg, #eef1f5 25%, #e4e8ee 37%, #eef1f5 63%);
    background-size: 400% 100%;
    animation: prov-shimmer 1.4s ease infinite;
}

@keyframes prov-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

@media (max-width: 640px) {
    .prov-header { flex-direction: column; align-items: stretch; }
    .prov-add-btn { width: 100%; justify-content: center; }
    .prov-toolbar { flex-direction: column; align-items: stretch; }
    .prov-toolbar-controls { justify-content: stretch; }
    .prov-search-wrap { max-width: none; }
}
</style>

<div class="prov-page">
    <div class="prov-card">
        <div class="prov-header">
            <div class="prov-header-title">
                <div class="prov-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                    <h1>Registered Providers</h1>
                    <p class="form-subtitle">Providers listed here become available in the patient registration form.</p>
                </div>
            </div>
            <button type="button" class="prov-add-btn" id="openAddProviderModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Provider
            </button>
        </div>

        <div id="listAlert"></div>

        <div class="prov-toolbar">
            <span class="prov-stat-pill" id="providerCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span id="providerCountText">0 providers</span>
            </span>
            <div class="prov-toolbar-controls">
                <div class="prov-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    <input type="text" id="providerSearchInput" class="prov-search-input" placeholder="Search by name or specialty...">
                    <button type="button" class="prov-search-clear" id="providerSearchClear" aria-label="Clear search">&times;</button>
                </div>
            </div>
        </div>

        <div class="prov-table-wrap">
            <table class="prov-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Specialty</th>
                        <th>NPI</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="providersTableBody">
                    <tr class="prov-skeleton-row"><td colspan="7"><div class="prov-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="prov-skeleton-row"><td colspan="7"><div class="prov-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="prov-skeleton-row"><td colspan="7"><div class="prov-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="addProviderModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Add Provider</h2>
            <button type="button" class="modal-close" id="closeAddProviderModal">&times;</button>
        </div>
        <p class="form-subtitle">Mark an existing employee (doctor role) as a provider and record their credentials.</p>

        <div id="formAlert"></div>

        <form id="addProviderForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Employee (Doctor)</label>
                    <select id="employee_id" class="form-input">
                        <option value="">Select employee</option>
                    </select>
                    <span class="form-error" id="err-employee_id"></span>
                </div>

                <div class="form-group full">
                    <label>Specialty</label>
                    <input id="specialty" class="form-input" placeholder="e.g Cardiology">
                    <span class="form-error" id="err-specialty"></span>
                </div>

                <div class="form-group">
                    <label>NPI Number</label>
                    <input id="npi_number" class="form-input" placeholder="National Provider Identifier">
                    <span class="form-error" id="err-npi_number"></span>
                </div>

                <div class="form-group">
                    <label>State License Number</label>
                    <input id="license_number" class="form-input" placeholder="License number">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>DEA Number</label>
                    <input id="dea_number" class="form-input" placeholder="DEA number (optional)">
                    <span class="form-error"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAddProvider">Cancel</button>
                <button class="login-btn" type="submit">Add Provider</button>
            </div>
        </form>
    </div>
</div>
`;
}
