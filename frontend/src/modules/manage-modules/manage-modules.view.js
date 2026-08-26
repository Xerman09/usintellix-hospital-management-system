export function ManageModulesView() {
    return `
    <div class="report-wrapper fade-in" style="padding: 24px; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px;">
        <div style="text-align: center;">
            <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 16px;">
                <button type="button" class="btn-secondary">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Modules Help
                </button>
                <button type="button" class="btn-secondary">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M2 12h4l2-9 5 18 2-9h4"></path></svg>
                    Visit Third Party Modules Wiki
                </button>
            </div>
            <h1 style="font-size: 24px; font-weight: 500; color: #1e293b; margin: 0;">Custom Module Listings</h1>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">ID</th>
                        <th>Module</th>
                        <th>Release</th>
                        <th>Status</th>
                        <th>Menu Text</th>
                        <th>Nick Name</th>
                        <th>Type</th>
                        <th>Dependency Modules</th>
                        <th>Action</th>
                        <th>Configuration</th>
                    </tr>
                </thead>
                <tbody id="customModulesTableBody">
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
            <h1 style="font-size: 24px; font-weight: 500; color: #1e293b; margin: 0;">Lamina's Module Listings</h1>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">ID</th>
                        <th>Module</th>
                        <th>Release</th>
                        <th>Status</th>
                        <th>Menu Text</th>
                        <th>Nick Name</th>
                        <th>Type</th>
                        <th>Dependency Modules</th>
                        <th>Action</th>
                        <th>Configuration</th>
                    </tr>
                </thead>
                <tbody id="laminasModulesTableBody">
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>
    </div>
    `;
}
