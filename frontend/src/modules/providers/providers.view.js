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
                        <th>Specialty</th>
                        <th>NPI</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
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
        <p class="form-subtitle">Register a provider (physician) record, based on OpenEMR provider fields.</p>

        <div id="formAlert"></div>

        <form id="addProviderForm">
            <div class="form-grid">
                <div class="form-group">
                    <label>Title</label>
                    <select id="title" class="form-input">
                        <option value="">Select title</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                    </select>
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Specialty</label>
                    <input id="specialty" class="form-input" placeholder="e.g Cardiology">
                    <span class="form-error" id="err-specialty"></span>
                </div>

                <div class="form-group">
                    <label>First Name</label>
                    <input id="first_name" class="form-input" placeholder="First name">
                    <span class="form-error" id="err-first_name"></span>
                </div>

                <div class="form-group">
                    <label>Middle Name</label>
                    <input id="middle_name" class="form-input" placeholder="Middle name (optional)">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Last Name</label>
                    <input id="last_name" class="form-input" placeholder="Last name">
                    <span class="form-error" id="err-last_name"></span>
                </div>

                <div class="form-group">
                    <label>Suffix</label>
                    <input id="suffix" class="form-input" placeholder="Jr, Sr, III (optional)">
                    <span class="form-error"></span>
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

                <div class="form-group">
                    <label>Department</label>
                    <select id="department_id" class="form-input">
                        <option value="">Select department</option>
                    </select>
                    <span class="form-error" id="err-department_id"></span>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input id="email" type="email" class="form-input" placeholder="name@example.com">
                    <span class="form-error" id="err-email"></span>
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input id="phone" class="form-input" placeholder="09XXXXXXXXX">
                    <span class="form-error" id="err-phone"></span>
                </div>

                <div class="form-group">
                    <label>Status</label>
                    <select id="status" class="form-input">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
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
