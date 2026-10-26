export function DepartmentalProfitabilityView() {
    return `
<style>
.dpm-container {
    padding: 24px;
    max-width: 100%;
    box-sizing: border-box;
    font-family: var(--font-primary, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    color: #1e293b;
    background: #f8fafc;
    min-height: calc(100vh - 70px);
}

/* Header */
.dpm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
    background: #ffffff;
    padding: 22px 26px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.dpm-header-left h1 {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.dpm-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.dpm-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

/* Buttons */
.dpm-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
}
.dpm-btn-primary { background: #2563eb; color: #ffffff; }
.dpm-btn-primary:hover { background: #1d4ed8; }
.dpm-btn-success { background: #059669; color: #ffffff; }
.dpm-btn-success:hover { background: #047857; }
.dpm-btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
.dpm-btn-secondary:hover { background: #f1f5f9; }

/* Filter Bar */
.dpm-filter-bar {
    background: #ffffff;
    padding: 16px 20px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.dpm-filter-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.dpm-filter-label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.dpm-select {
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #f8fafc;
    color: #0f172a;
    outline: none;
}

/* KPI Grid */
.dpm-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}
.dpm-kpi-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 18px 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    position: relative;
}
.dpm-kpi-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
}
.dpm-kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.dpm-kpi-value {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 6px;
}
.dpm-kpi-subtext {
    font-size: 12px;
    color: #64748b;
}
.dpm-kpi-formula {
    font-size: 11px;
    color: #94a3b8;
    font-style: italic;
    border-top: 1px dashed #e2e8f0;
    padding-top: 8px;
    margin-top: 8px;
}

/* Status Pill Colors */
.dpm-badge-leader { background: #dcfce7; color: #166534; }
.dpm-badge-profit { background: #e0f2fe; color: #075985; }
.dpm-badge-thin   { background: #fef3c7; color: #92400e; }
.dpm-badge-loss   { background: #fee2e2; color: #991b1b; }
.dpm-badge-overhd { background: #f1f5f9; color: #475569; }

/* Direct Cost Drivers Strip */
.dpm-drivers-card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.dpm-drivers-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}
.dpm-stacked-bar {
    width: 100%;
    height: 16px;
    background: #f1f5f9;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    margin-bottom: 14px;
}
.dpm-driver-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
}
.dpm-driver-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
}

/* Panels & Tables */
.dpm-panel {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.dpm-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}
.dpm-panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
}
.dpm-table-responsive {
    overflow-x: auto;
    width: 100%;
}
.dpm-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12.5px;
    text-align: left;
}
.dpm-table th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.4px;
    white-space: nowrap;
}
.dpm-table td {
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: middle;
}
.dpm-table tr:hover td {
    background: #f8fafc;
}

@media print {
    .dpm-header-actions, .dpm-filter-bar, .dpm-btn { display: none !important; }
    .dpm-container { padding: 0; background: #ffffff; }
}
</style>

<div class="dpm-container" id="dpmRoot">
    <!-- Header -->
    <div class="dpm-header">
        <div class="dpm-header-left">
            <h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Departmental Profitability &amp; Cost Center Margins
            </h1>
            <p>Aggregates department gross collections minus direct operational costs (staff salaries, medications, consumed surgical supplies) to compute Department Contribution Margin %</p>
        </div>
        <div class="dpm-header-actions">
            <button class="dpm-btn dpm-btn-success" id="dpmRecalcBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>⚡ Recalculate Cost Centers</span>
            </button>
            <button class="dpm-btn dpm-btn-secondary" id="dpmPrintBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print Cost Center Report</span>
            </button>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="dpm-filter-bar">
        <div class="dpm-filter-group">
            <span class="dpm-filter-label">Fiscal Month:</span>
            <select id="dpmMonthSelect" class="dpm-select"></select>

            <span class="dpm-filter-label" style="margin-left:10px;">Cost Center Category:</span>
            <select id="dpmTypeSelect" class="dpm-select">
                <option value="">All Cost Center Categories</option>
                <option value="Surgical & Perioperative">Surgical &amp; Perioperative</option>
                <option value="Clinical Specialty">Clinical Specialty</option>
                <option value="Critical Care / Inpatient">Critical Care / Inpatient</option>
                <option value="Diagnostic & Ancillary">Diagnostic &amp; Ancillary</option>
                <option value="Emergency Services">Emergency Services</option>
                <option value="Administrative / Overhead">Administrative / Overhead</option>
            </select>
        </div>
        <div class="dpm-filter-group">
            <button class="dpm-btn dpm-btn-primary" id="dpmApplyBtn">Apply Filter</button>
        </div>
    </div>

    <!-- Executive KPI Cards -->
    <div class="dpm-kpi-grid">
        <!-- 1. Gross Collections -->
        <div class="dpm-kpi-card">
            <span class="dpm-kpi-badge dpm-badge-profit">Revenue Inflow</span>
            <div class="dpm-kpi-label">Department Gross Collections</div>
            <div class="dpm-kpi-value" id="dpmKpiCollections">--</div>
            <div class="dpm-kpi-subtext">
                Cash: <strong id="dpmKpiCash">--</strong> | Insurance: <strong id="dpmKpiIns">--</strong>
            </div>
            <div class="dpm-kpi-formula">
                Billed Charges minus Contractual Write-offs &amp; Discounts
            </div>
        </div>

        <!-- 2. Direct Operational Costs -->
        <div class="dpm-kpi-card">
            <span class="dpm-kpi-badge dpm-badge-thin">Direct COGS &amp; Labor</span>
            <div class="dpm-kpi-label">Total Direct Operational Costs</div>
            <div class="dpm-kpi-value" id="dpmKpiDirectCosts">--</div>
            <div class="dpm-kpi-subtext">
                Salaries + Medications + Consumed Surgical Supplies
            </div>
            <div class="dpm-kpi-formula">
                Direct Costs = Staff Salaries + Meds + Surgical Supplies + Biomed
            </div>
        </div>

        <!-- 3. Contribution Margin ($ and %) -->
        <div class="dpm-kpi-card">
            <span class="dpm-kpi-badge dpm-badge-leader" id="dpmKpiContribBadge">Contribution</span>
            <div class="dpm-kpi-label">Department Contribution Margin %</div>
            <div class="dpm-kpi-value" id="dpmKpiContribPct" style="color:#059669;">--%</div>
            <div class="dpm-kpi-subtext">
                Contribution Margin ($): <strong id="dpmKpiContribAmt" style="color:#0f172a;">--</strong>
            </div>
            <div class="dpm-kpi-formula">
                (Gross Collections - Direct Operational Costs) / Gross Collections &times; 100%
            </div>
        </div>

        <!-- 4. Net Operating Income -->
        <div class="dpm-kpi-card">
            <span class="dpm-kpi-badge dpm-badge-overhd">Full Absorption</span>
            <div class="dpm-kpi-label">Net Operating Income (Post-Overhead)</div>
            <div class="dpm-kpi-value" id="dpmKpiNetIncome">--</div>
            <div class="dpm-kpi-subtext">
                Net Margin: <strong id="dpmKpiNetPct">--%</strong> | Profitable Units: <strong id="dpmProfitableCount">0</strong>
            </div>
            <div class="dpm-kpi-formula">
                Contribution Margin minus Allocated Indirect Overhead
            </div>
        </div>
    </div>

    <!-- Direct Operational Cost Drivers Breakdown (Salaries, Medications, Surgical Supplies) -->
    <div class="dpm-drivers-card">
        <div class="dpm-drivers-header">
            <div>
                <h3 style="margin:0 0 4px 0; font-size:15px; font-weight:700; color:#0f172a;">
                    Direct Operational Cost Composition (Hospital-Wide Cost Centers)
                </h3>
                <span style="font-size:12px; color:#64748b;">Breakdown of direct departmental expenditures subtracted from gross collections</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:#0f172a;">
                Total Direct Costs: <span id="dpmDriversTotalCost">--</span>
            </div>
        </div>

        <div class="dpm-stacked-bar">
            <div id="dpmBarSalaries" style="background:#2563eb; height:100%; width:48%;" title="Staff Salaries"></div>
            <div id="dpmBarMeds" style="background:#059669; height:100%; width:24%;" title="Medications"></div>
            <div id="dpmBarSupplies" style="background:#d97706; height:100%; width:24%;" title="Consumed Surgical Supplies"></div>
            <div id="dpmBarMaint" style="background:#64748b; height:100%; width:4%;" title="Equipment Maintenance"></div>
        </div>

        <div class="dpm-driver-grid">
            <div class="dpm-driver-item">
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                    <span style="width:10px; height:10px; border-radius:2px; background:#2563eb;"></span>
                    1. Staff Salaries &amp; Commissions
                </div>
                <div style="font-size:17px; font-weight:800; color:#0f172a;" id="dpmCostSalaries">--</div>
                <div style="font-size:11px; color:#64748b;"><span id="dpmPctSalaries">0%</span> of direct operational costs</div>
            </div>

            <div class="dpm-driver-item">
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                    <span style="width:10px; height:10px; border-radius:2px; background:#059669;"></span>
                    2. Consumed Medications &amp; Drugs
                </div>
                <div style="font-size:17px; font-weight:800; color:#0f172a;" id="dpmCostMeds">--</div>
                <div style="font-size:11px; color:#64748b;"><span id="dpmPctMeds">0%</span> of direct operational costs</div>
            </div>

            <div class="dpm-driver-item">
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                    <span style="width:10px; height:10px; border-radius:2px; background:#d97706;"></span>
                    3. Consumed Surgical Supplies
                </div>
                <div style="font-size:17px; font-weight:800; color:#0f172a;" id="dpmCostSupplies">--</div>
                <div style="font-size:11px; color:#64748b;"><span id="dpmPctSupplies">0%</span> of direct operational costs</div>
            </div>

            <div class="dpm-driver-item">
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                    <span style="width:10px; height:10px; border-radius:2px; background:#64748b;"></span>
                    4. Biomedical Equipment Maint.
                </div>
                <div style="font-size:17px; font-weight:800; color:#0f172a;" id="dpmCostMaint">--</div>
                <div style="font-size:11px; color:#64748b;"><span id="dpmPctMaint">0%</span> of direct operational costs</div>
            </div>
        </div>
    </div>

    <!-- Visual Contribution Margin % Chart by Department -->
    <div class="dpm-panel">
        <div class="dpm-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Department Contribution Margin % Comparison
            </h3>
            <span style="font-size:12px; color:#64748b;">Ranked by Contribution Margin ($)</span>
        </div>
        <div id="dpmChartWrap" style="width:100%; min-height:240px;"></div>
    </div>

    <!-- Detailed Cost Center Profitability Ledger Table -->
    <div class="dpm-panel">
        <div class="dpm-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                Departmental Cost Center P&amp;L &amp; Contribution Margin Statement
            </h3>
            <span style="font-size:12px; color:#64748b;" id="dpmDeptCountLabel">12 Cost Centers</span>
        </div>
        <div class="dpm-table-responsive">
            <table class="dpm-table" id="dpmTable">
                <thead>
                    <tr>
                        <th>Cost Center &amp; Department</th>
                        <th>Category</th>
                        <th style="text-align:center;">Volume</th>
                        <th style="text-align:right;">Gross Collections</th>
                        <th style="text-align:right;">(-) Staff Salaries</th>
                        <th style="text-align:right;">(-) Medications</th>
                        <th style="text-align:right;">(-) Surgical Supplies</th>
                        <th style="text-align:right;">Total Direct Costs</th>
                        <th style="text-align:right;">Contribution Margin ($)</th>
                        <th style="text-align:right;">Contribution Margin (%)</th>
                        <th style="text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody id="dpmTableBody">
                    <tr>
                        <td colspan="11" style="text-align:center; padding:24px; color:#94a3b8;">
                            Loading departmental cost center profitability statement...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;
}
