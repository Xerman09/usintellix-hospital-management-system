export function ManageModulesView() {
    return `
    <div class="bm-page fade-in">
        <div class="bm-header">
            <div>
                <h1 class="bm-title">Business Module Access</h1>
                <p class="bm-subtitle">Manage which hospital and clinical modules this business can access. Disabled modules are hidden from the navigation bar and Quick Jump across all roles.</p>
            </div>
            <div class="bm-header-actions">
                <button type="button" class="btn btn-secondary" id="bmResetBtn" disabled>Reset</button>
                <button type="button" class="btn btn-primary" id="bmSaveBtn" disabled>Save Changes</button>
            </div>
        </div>

        <div class="bm-kpi-grid" id="bmKpiGrid">
            <div class="bm-kpi-card">
                <span class="bm-kpi-label">Enabled Modules</span>
                <strong class="bm-kpi-value bm-kpi-green" id="bmKpiEnabled">--</strong>
            </div>
            <div class="bm-kpi-card">
                <span class="bm-kpi-label">Disabled Modules</span>
                <strong class="bm-kpi-value bm-kpi-muted" id="bmKpiDisabled">--</strong>
            </div>
            <div class="bm-kpi-card">
                <span class="bm-kpi-label">Core (Required)</span>
                <strong class="bm-kpi-value bm-kpi-blue" id="bmKpiCore">--</strong>
            </div>
            <div class="bm-kpi-card">
                <span class="bm-kpi-label">Total Modules</span>
                <strong class="bm-kpi-value" id="bmKpiTotal">--</strong>
            </div>
        </div>

        <div class="bm-presets-bar" id="bmPresetsBar">
            <span class="bm-presets-label">Quick Business Profiles:</span>
            <div class="bm-presets-list" id="bmPresetsList">
                <!-- Populated dynamically -->
            </div>
        </div>

        <div class="bm-toolbar">
            <div class="bm-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" id="bmSearchInput" class="bm-search-input" placeholder="Search modules by name or feature..." autocomplete="off">
            </div>
            <div class="bm-category-pills" id="bmCategoryPills">
                <!-- Populated dynamically -->
            </div>
        </div>

        <div class="bm-unsaved-banner" id="bmUnsavedBanner" style="display: none;">
            <span id="bmUnsavedText">You have unsaved module access changes.</span>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary btn-sm" id="bmBannerResetBtn">Discard</button>
                <button type="button" class="btn btn-primary btn-sm" id="bmBannerSaveBtn">Save &amp; Apply</button>
            </div>
        </div>

        <div class="bm-grid" id="bmModulesGrid">
            <div class="bm-loading">Loading business modules...</div>
        </div>
    </div>
    `;
}
