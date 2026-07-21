export function ProvidersView()
{
    return `
<div class="form-page">
    <div class="form-card">
        <div class="panel-header-row">
            <div>
                <h1>Registered Providers</h1>
                <p class="form-subtitle">Providers listed here become available in the patient registration form.</p>
            </div>
            <button type="button" class="btn-primary-inline" id="openAddProviderModal">+ Create Provider</button>
        </div>

        <div id="listAlert"></div>

        <div class="table-wrap">
            <table class="data-table">
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
                    <tr><td colspan="7" class="table-empty">Loading providers...</td></tr>
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
