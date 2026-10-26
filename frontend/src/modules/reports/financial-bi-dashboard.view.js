export function FinancialBiDashboardView() {
    return `
<style>
.fbi-container {
    padding: 24px;
    max-width: 100%;
    box-sizing: border-box;
    font-family: var(--font-primary, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    color: #1e293b;
    background: #f8fafc;
    min-height: calc(100vh - 70px);
}

/* Header */
.fbi-header {
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
.fbi-header-left h1 {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.fbi-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.fbi-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

/* Action Buttons */
.fbi-btn {
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
    text-decoration: none;
}
.fbi-btn-primary { background: #0284c7; color: #ffffff; }
.fbi-btn-primary:hover { background: #0369a1; }
.fbi-btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
.fbi-btn-secondary:hover { background: #f1f5f9; }

/* Filter Bar */
.fbi-filter-bar {
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
.fbi-filter-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.fbi-filter-label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.fbi-select {
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #f8fafc;
    color: #0f172a;
    outline: none;
}
.fbi-select:focus {
    border-color: #0284c7;
    background: #ffffff;
}

/* Core KPI Grid */
.fbi-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}
.fbi-kpi-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 18px 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    position: relative;
    transition: transform 0.15s, box-shadow 0.15s;
}
.fbi-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.fbi-kpi-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
}
.fbi-kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.fbi-kpi-value {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 6px;
}
.fbi-kpi-subtext {
    font-size: 12px;
    color: #64748b;
}
.fbi-kpi-formula {
    font-size: 11px;
    color: #94a3b8;
    font-style: italic;
    border-top: 1px dashed #e2e8f0;
    padding-top: 8px;
    margin-top: 8px;
}

/* Status colors */
.fbi-optimal { background: #dcfce7; color: #166534; }
.fbi-warning { background: #fef3c7; color: #92400e; }
.fbi-danger  { background: #fee2e2; color: #991b1b; }
.fbi-neutral { background: #f1f5f9; color: #475569; }

/* Cash vs Accruals Split Banner */
.fbi-split-banner {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 18px 22px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.fbi-split-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}
.fbi-split-track {
    width: 100%;
    height: 14px;
    background: #e2e8f0;
    border-radius: 7px;
    overflow: hidden;
    display: flex;
    margin-bottom: 10px;
}
.fbi-split-bar-ins {
    background: #0284c7;
    height: 100%;
}
.fbi-split-bar-cash {
    background: #10b981;
    height: 100%;
}
.fbi-split-legend {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #475569;
}

/* Charts Section */
.fbi-chart-section {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 22px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.fbi-chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}
.fbi-chart-tabs {
    display: flex;
    gap: 8px;
}
.fbi-tab-btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
}
.fbi-tab-btn.active {
    background: #f0f9ff;
    color: #0284c7;
    border-color: #bae6fd;
}
.fbi-chart-svg-wrap {
    width: 100%;
    min-height: 280px;
    position: relative;
}

/* Panels */
.fbi-panel {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.fbi-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}
.fbi-panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Modern Data Table */
.fbi-table-responsive {
    overflow-x: auto;
    width: 100%;
}
.fbi-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    text-align: left;
}
.fbi-table th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    white-space: nowrap;
}
.fbi-table td {
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: middle;
}
.fbi-table tr:hover td {
    background: #f8fafc;
}

/* Loss Making Deficit Box */
.fbi-loss-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 24px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
}
.fbi-loss-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #fee2e2;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.fbi-loss-content h4 {
    margin: 0 0 4px 0;
    color: #991b1b;
    font-size: 15px;
    font-weight: 700;
}
.fbi-loss-content p {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #7f1d1d;
}

@media print {
    .fbi-header-actions, .fbi-filter-bar, .fbi-chart-tabs, .fbi-btn { display: none !important; }
    .fbi-container { padding: 0; background: #ffffff; }
    .fbi-kpi-card, .fbi-panel, .fbi-chart-section { break-inside: avoid; border: 1px solid #ccc; box-shadow: none; }
}
</style>

<div class="fbi-container" id="fbiRoot">
    <!-- Header -->
    <div class="fbi-header">
        <div class="fbi-header-left">
            <h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Financial &amp; Business Intelligence (BI) Analytics
            </h1>
            <p>Hospital Bed Productivity, Revenue Per Available Bed (RevPAB), Department Margins &amp; Deficit Detection</p>
        </div>
        <div class="fbi-header-actions">
            <button class="fbi-btn fbi-btn-secondary" id="fbiPrintBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print Executive Report</span>
            </button>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="fbi-filter-bar">
        <div class="fbi-filter-group">
            <span class="fbi-filter-label">Reporting Month:</span>
            <select id="fbiMonthSelect" class="fbi-select">
                <!-- Dynamically populated months -->
            </select>
            <span style="font-size:12px; color:#64748b;" id="fbiPeriodDetail"></span>
        </div>
        <div class="fbi-filter-group">
            <button class="fbi-btn fbi-btn-primary" id="fbiRefreshBtn">
                Refresh Financial Analytics
            </button>
        </div>
    </div>

    <!-- Core Financial BI & Bed Productivity KPI Cards -->
    <div class="fbi-kpi-grid">
        <!-- 1. RevPAB -->
        <div class="fbi-kpi-card">
            <span class="fbi-kpi-badge fbi-optimal" id="fbiRevpabTier">High Yield</span>
            <div class="fbi-kpi-label">Revenue Per Available Bed (RevPAB)</div>
            <div class="fbi-kpi-value" id="fbiRevpabVal">--</div>
            <div class="fbi-kpi-subtext">
                <span id="fbiAvailBedDays">0</span> available bed-days capacity
            </div>
            <div class="fbi-kpi-formula">
                RevPAB = Total Inpatient Revenue / Total Available Bed Days
            </div>
        </div>

        <!-- 2. RevPOB -->
        <div class="fbi-kpi-card">
            <span class="fbi-kpi-badge fbi-neutral" id="fbiRevpobBadge">Daily Yield</span>
            <div class="fbi-kpi-label">Revenue Per Occupied Bed (RevPOB)</div>
            <div class="fbi-kpi-value" id="fbiRevpobVal">--</div>
            <div class="fbi-kpi-subtext">
                <span id="fbiOccBedDays">0</span> occupied bed-days (<span id="fbiBorPct">0</span>% BOR)
            </div>
            <div class="fbi-kpi-formula">
                RevPOB = Total Inpatient Revenue / Occupied Bed Days
            </div>
        </div>

        <!-- 3. Net Inpatient Revenue -->
        <div class="fbi-kpi-card">
            <span class="fbi-kpi-badge fbi-neutral">Accrued &amp; Cash</span>
            <div class="fbi-kpi-label">Net Inpatient Revenue</div>
            <div class="fbi-kpi-value" id="fbiNetRevVal">--</div>
            <div class="fbi-kpi-subtext">
                Gross: <span id="fbiGrossRevVal">--</span> | Allowances: <span id="fbiDiscountsVal">--</span>
            </div>
            <div class="fbi-kpi-formula">
                Inclusive of Accommodation, OR, Pharmacy, Lab, Imaging
            </div>
        </div>

        <!-- 4. Operating Margin % -->
        <div class="fbi-kpi-card">
            <span class="fbi-kpi-badge fbi-optimal" id="fbiMarginBadge">Profitable</span>
            <div class="fbi-kpi-label">Hospital Operating Margin</div>
            <div class="fbi-kpi-value" id="fbiMarginPctVal">--%</div>
            <div class="fbi-kpi-subtext">
                Net Margin: <strong id="fbiMarginAmtVal" style="color:#059669;">--</strong>
            </div>
            <div class="fbi-kpi-formula">
                Margin = Net Revenue - Total Allocated Operating Costs
            </div>
        </div>
    </div>

    <!-- Loss-Making & Deficit Alert Banner (Conditional) -->
    <div class="fbi-loss-banner" id="fbiLossBanner" style="display:none;">
        <div class="fbi-loss-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>
        <div class="fbi-loss-content" style="flex:1;">
            <h4>C-Suite Alert: <span id="fbiLossCount">0</span> Loss-Making / Underutilized Facilities Detected</h4>
            <p>
                Total operating deficit across underperforming wards is <strong id="fbiTotalDeficit">--</strong>.
                Low occupancy and high fixed biomedical/nursing overhead are eroding hospital net margins.
            </p>
            <div id="fbiLossUnitsList" style="display:flex; gap:12px; flex-wrap:wrap; margin-top:8px;"></div>
        </div>
    </div>

    <!-- Cash vs. Insurance Accruals Split Banner -->
    <div class="fbi-split-banner">
        <div class="fbi-split-header">
            <div>
                <strong style="font-size: 14px; color: #0f172a;">Cash Collections vs. Insurance Claims Accruals</strong>
                <div style="font-size: 11px; color: #64748b;">Distribution of total hospital inpatient revenues</div>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
                Total: <span id="fbiSplitTotalRevenue">--</span>
            </div>
        </div>
        <div class="fbi-split-track">
            <div class="fbi-split-bar-ins" id="fbiSplitBarIns" style="width: 70%;" title="Insurance Accruals"></div>
            <div class="fbi-split-bar-cash" id="fbiSplitBarCash" style="width: 30%;" title="Cash Collections"></div>
        </div>
        <div class="fbi-split-legend">
            <span style="display:flex; align-items:center; gap:6px;">
                <span style="width:10px; height:10px; background:#0284c7; border-radius:2px; display:inline-block;"></span>
                Insurance / HMO Accruals (AR): <strong id="fbiInsAccruedAmt">--</strong> (<span id="fbiInsPct">--%</span>)
            </span>
            <span style="display:flex; align-items:center; gap:6px;">
                <span style="width:10px; height:10px; background:#10b981; border-radius:2px; display:inline-block;"></span>
                Cash / Direct Patient Paid: <strong id="fbiCashAmt">--</strong> (<span id="fbiCashPct">--%</span>)
            </span>
        </div>
    </div>

    <!-- Multi-Month BI Trends Chart -->
    <div class="fbi-chart-section">
        <div class="fbi-chart-header">
            <div>
                <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                    Executive Financial Trajectory &amp; Productivity Trends
                </h3>
                <span style="font-size: 12px; color: #64748b;" id="fbiChartSublabel">Monthly Historical Performance</span>
            </div>
            <div class="fbi-chart-tabs">
                <button class="fbi-tab-btn active" data-chart="revpab">RevPAB Yield (₱/bed-day)</button>
                <button class="fbi-tab-btn" data-chart="revenue_cost">Revenue vs. Cost &amp; Margin</button>
                <button class="fbi-tab-btn" data-chart="accruals">Cash vs. Insurance Accruals</button>
            </div>
        </div>
        <div class="fbi-chart-svg-wrap" id="fbiChartWrap">
            <!-- Dynamic SVG injected here -->
        </div>
    </div>

    <!-- Ward Class Comparison Benchmarks (ICU vs Private Suite vs General Ward) -->
    <div class="fbi-panel">
        <div class="fbi-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                Facility Tier Benchmarks: ICU vs. Private Suite vs. General Ward
            </h3>
            <span style="font-size: 12px; color: #64748b;">Asset Yield Comparison</span>
        </div>
        <div class="fbi-table-responsive">
            <table class="fbi-table" id="fbiClassTable">
                <thead>
                    <tr>
                        <th>Ward Class / Tier</th>
                        <th style="text-align:center;">Beds</th>
                        <th style="text-align:right;">Avail Bed-Days</th>
                        <th style="text-align:right;">Occupancy (BOR)</th>
                        <th style="text-align:right;">RevPAB (₱/day)</th>
                        <th style="text-align:right;">RevPOB (₱/day)</th>
                        <th style="text-align:right;">Net Revenue</th>
                        <th style="text-align:right;">Operating Cost</th>
                        <th style="text-align:right;">Department Margin</th>
                        <th style="text-align:center;">Yield Status</th>
                    </tr>
                </thead>
                <tbody id="fbiClassTableBody">
                    <tr>
                        <td colspan="10" style="text-align:center; padding:20px; color:#94a3b8;">
                            Loading facility class comparison...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Detailed Ward-by-Ward Margin & Productivity Ranking Table -->
    <div class="fbi-panel">
        <div class="fbi-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                Department Margin &amp; Bed Productivity Rankings
            </h3>
            <span style="font-size: 12px; color: #64748b;" id="fbiWardCountLabel">Ranked by RevPAB</span>
        </div>
        <div class="fbi-table-responsive">
            <table class="fbi-table" id="fbiWardTable">
                <thead>
                    <tr>
                        <th>Ward / Nursing Unit</th>
                        <th>Classification</th>
                        <th style="text-align:center;">Capacity</th>
                        <th style="text-align:right;">Occupancy</th>
                        <th style="text-align:right;">RevPAB</th>
                        <th style="text-align:right;">RevPOB</th>
                        <th style="text-align:right;">Total Revenue</th>
                        <th style="text-align:right;">Operating Costs</th>
                        <th style="text-align:right;">Department Margin</th>
                        <th style="text-align:center;">Financial Status</th>
                    </tr>
                </thead>
                <tbody id="fbiWardTableBody">
                    <tr>
                        <td colspan="10" style="text-align:center; padding:20px; color:#94a3b8;">
                            Loading department rankings...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;
}
