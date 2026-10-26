export function ClaimDenialParetoView() {
    return `
<style>
.cdp-container {
    padding: 24px;
    max-width: 100%;
    box-sizing: border-box;
    font-family: var(--font-primary, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    color: #1e293b;
    background: #f8fafc;
    min-height: calc(100vh - 70px);
}

/* Header */
.cdp-header {
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
.cdp-header-left h1 {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.cdp-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.cdp-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

/* Buttons */
.cdp-btn {
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
.cdp-btn-primary { background: #2563eb; color: #ffffff; }
.cdp-btn-primary:hover { background: #1d4ed8; }
.cdp-btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
.cdp-btn-secondary:hover { background: #f1f5f9; }

/* Filter Bar */
.cdp-filter-bar {
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
.cdp-filter-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.cdp-filter-label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.cdp-select {
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
.cdp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}
.cdp-kpi-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 18px 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    position: relative;
}
.cdp-kpi-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
}
.cdp-kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.cdp-kpi-value {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 6px;
}
.cdp-kpi-subtext {
    font-size: 12px;
    color: #64748b;
}
.cdp-kpi-formula {
    font-size: 11px;
    color: #94a3b8;
    font-style: italic;
    border-top: 1px dashed #e2e8f0;
    padding-top: 8px;
    margin-top: 8px;
}

/* Badges */
.cdp-badge-optimal { background: #dcfce7; color: #166534; }
.cdp-badge-warning { background: #fef3c7; color: #92400e; }
.cdp-badge-danger  { background: #fee2e2; color: #991b1b; }
.cdp-badge-info    { background: #e0f2fe; color: #075985; }

/* Panels */
.cdp-panel {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 22px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.cdp-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}
.cdp-panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Tables */
.cdp-table-responsive {
    overflow-x: auto;
    width: 100%;
}
.cdp-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12.5px;
    text-align: left;
}
.cdp-table th {
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
.cdp-table td {
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: top;
}
.cdp-table tr:hover td {
    background: #f8fafc;
}

.cdp-carc-pill {
    display: inline-block;
    background: #1e293b;
    color: #38bdf8;
    font-family: monospace;
    font-size: 11.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
}

@media print {
    .cdp-header-actions, .cdp-filter-bar, .cdp-btn { display: none !important; }
    .cdp-container { padding: 0; background: #ffffff; }
}
</style>

<div class="cdp-container" id="cdpRoot">
    <!-- Header -->
    <div class="cdp-header">
        <div class="cdp-header-left">
            <h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Claim Denial Rate &amp; CARC Pareto Analytics
            </h1>
            <p>Measures gross denial percentages and visualizes top root-cause CARC denial codes (e.g., 42% Prior Auth, 28% Medical Necessity) to drive immediate billing corrections</p>
        </div>
        <div class="cdp-header-actions">
            <button class="cdp-btn cdp-btn-secondary" id="cdpPrintBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print CARC Pareto Report</span>
            </button>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="cdp-filter-bar">
        <div class="cdp-filter-group">
            <span class="cdp-filter-label">Payer / HMO:</span>
            <select id="cdpPayerSelect" class="cdp-select">
                <option value="">All Payers &amp; HMOs</option>
            </select>

            <span class="cdp-filter-label" style="margin-left:8px;">Appeal Status:</span>
            <select id="cdpStatusSelect" class="cdp-select">
                <option value="">All Denial Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="appeal_in_progress">Appeal In Progress</option>
                <option value="appeal_submitted">Appeal Submitted</option>
                <option value="overturned_won">Overturned / Recovered</option>
                <option value="upheld_lost">Upheld / Written Off</option>
            </select>
        </div>
        <div class="cdp-filter-group">
            <button class="cdp-btn cdp-btn-primary" id="cdpApplyBtn">Apply Filter</button>
        </div>
    </div>

    <!-- Core Denial Rate KPI Cards -->
    <div class="cdp-kpi-grid">
        <!-- 1. Gross Claim Denial Rate % -->
        <div class="cdp-kpi-card">
            <span class="cdp-kpi-badge cdp-badge-warning" id="cdpDenialRateBadge">HFMA Target &lt; 5%</span>
            <div class="cdp-kpi-label">Gross Claim Denial Rate %</div>
            <div class="cdp-kpi-value" id="cdpKpiDenialRate" style="color:#dc2626;">--%</div>
            <div class="cdp-kpi-subtext">
                <strong id="cdpKpiDeniedCount">0</strong> denied / <span id="cdpKpiTotalSubmitted">0</span> submitted claims
            </div>
            <div class="cdp-kpi-formula">
                Gross Denial % = (Denied Claims / Total Claims Submitted) &times; 100%
            </div>
        </div>

        <!-- 2. Gross Dollar Denial % -->
        <div class="cdp-kpi-card">
            <span class="cdp-kpi-badge cdp-badge-danger">Revenue At Risk</span>
            <div class="cdp-kpi-label">Gross Dollar Denial Rate %</div>
            <div class="cdp-kpi-value" id="cdpKpiDollarDenialRate">--%</div>
            <div class="cdp-kpi-subtext">
                Active Denied Pool: <strong id="cdpKpiDeniedAmount" style="color:#dc2626;">--</strong>
            </div>
            <div class="cdp-kpi-formula">
                Denied Dollars / Total Gross Billed Charges &times; 100%
            </div>
        </div>

        <!-- 3. First-Pass Clean Claim Rate % -->
        <div class="cdp-kpi-card">
            <span class="cdp-kpi-badge cdp-badge-info">Target &ge; 95%</span>
            <div class="cdp-kpi-label">First-Pass Clean Claim Rate</div>
            <div class="cdp-kpi-value" id="cdpKpiCleanClaimRate" style="color:#2563eb;">--%</div>
            <div class="cdp-kpi-subtext">
                <strong id="cdpKpiCleanCount">0</strong> claims paid on 1st submission
            </div>
            <div class="cdp-kpi-formula">
                Clean Claims Paid without Edits / Total Submitted
            </div>
        </div>

        <!-- 4. Top CARC Root Causes (80/20 Vital Few) -->
        <div class="cdp-kpi-card">
            <span class="cdp-kpi-badge cdp-badge-danger">Pareto Vital Few</span>
            <div class="cdp-kpi-label">Top 2 Root-Cause Drivers</div>
            <div class="cdp-kpi-value" id="cdpKpiTopTwoShare" style="color:#d97706;">--%</div>
            <div class="cdp-kpi-subtext" id="cdpKpiTopTwoDetail">
                Prior Auth + Medical Necessity
            </div>
            <div class="cdp-kpi-formula">
                CO-197 (Prior Auth) + CO-50 (Medical Necessity) Share
            </div>
        </div>

        <!-- 5. Appeal Overturn Recovery % -->
        <div class="cdp-kpi-card">
            <span class="cdp-kpi-badge cdp-badge-optimal">RCM Recovery</span>
            <div class="cdp-kpi-label">Appeal Recovery Rate %</div>
            <div class="cdp-kpi-value" id="cdpKpiRecoveryRate" style="color:#059669;">--%</div>
            <div class="cdp-kpi-subtext">
                Recovered: <strong id="cdpKpiRecoveredAmt" style="color:#059669;">--</strong>
            </div>
            <div class="cdp-kpi-formula">
                Overturned &amp; Paid on Appeal / Total Denied Dollars
            </div>
        </div>
    </div>

    <!-- Dual-Axis SVG CARC 80/20 Pareto Chart -->
    <div class="cdp-panel">
        <div class="cdp-panel-header">
            <div>
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    CARC Root-Cause 80/20 Pareto Chart (Denied Dollars &amp; Cumulative Curve)
                </h3>
                <span style="font-size:12px; color:#64748b;">Bars show % of total denied dollars per CARC root-cause; orange curve tracks cumulative % against the 80% Pareto cutoff</span>
            </div>
        </div>
        <div id="cdpParetoSvgWrap" style="width:100%; min-height:310px;"></div>
    </div>

    <!-- CARC Root-Cause & Immediate Billing Correction Matrix -->
    <div class="cdp-panel">
        <div class="cdp-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                CARC Root-Cause Breakdown &amp; Immediate Billing Correction Playbook
            </h3>
            <span style="font-size:12px; color:#64748b;">Actionable Front-End &amp; Coding Prevention Rules</span>
        </div>
        <div class="cdp-table-responsive">
            <table class="cdp-table" id="cdpParetoTable">
                <thead>
                    <tr>
                        <th>CARC Code</th>
                        <th>Root-Cause Category</th>
                        <th style="text-align:center;">Claims</th>
                        <th style="text-align:right;">Denied Amount</th>
                        <th style="text-align:right;">Denial Share %</th>
                        <th style="text-align:right;">Cumulative %</th>
                        <th style="text-align:right;">Overturned %</th>
                        <th>Responsible Team</th>
                        <th>Immediate Billing Correction Protocol</th>
                    </tr>
                </thead>
                <tbody id="cdpParetoTableBody">
                    <tr>
                        <td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">
                            Loading CARC Pareto root-cause matrix...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Active Claim Denials Worklist -->
    <div class="cdp-panel">
        <div class="cdp-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Denied Claims Remittance &amp; Root-Cause Audit Ledger
            </h3>
            <span style="font-size:12px; color:#64748b;" id="cdpWorklistCountLabel">Showing denied claims</span>
        </div>
        <div class="cdp-table-responsive">
            <table class="cdp-table" id="cdpWorklistTable">
                <thead>
                    <tr>
                        <th>Denial / Claim #</th>
                        <th>Payer / HMO</th>
                        <th>Denial Date</th>
                        <th>CARC / RARC</th>
                        <th style="text-align:right;">Denied Amt</th>
                        <th style="text-align:right;">Recovered</th>
                        <th>Specific Root-Cause Analysis</th>
                        <th>Resolution / Corrective Action</th>
                        <th style="text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody id="cdpWorklistTableBody">
                    <tr>
                        <td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">
                            Loading claim denials worklist...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;
}
