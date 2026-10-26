export function ClinicalQualityDashboardView() {
    return `
<style>
.cqd-container {
    padding: 24px;
    max-width: 100%;
    box-sizing: border-box;
    font-family: var(--font-primary, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    color: #1e293b;
    background: #f8fafc;
    min-height: calc(100vh - 70px);
}

/* Header */
.cqd-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
    background: #ffffff;
    padding: 20px 24px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.cqd-header-left h1 {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.cqd-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.cqd-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

/* Action Buttons */
.cqd-btn {
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
.cqd-btn-primary {
    background: #2563eb;
    color: #ffffff;
}
.cqd-btn-primary:hover {
    background: #1d4ed8;
}
.cqd-btn-secondary {
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
}
.cqd-btn-secondary:hover {
    background: #f1f5f9;
}
.cqd-btn-success {
    background: #059669;
    color: #ffffff;
}
.cqd-btn-success:hover {
    background: #047857;
}

/* Filters Bar */
.cqd-filter-bar {
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
.cqd-filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.cqd-filter-label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.cqd-select, .cqd-input {
    padding: 7px 12px;
    font-size: 13px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #f8fafc;
    color: #1e293b;
    outline: none;
    transition: border 0.15s;
}
.cqd-select:focus, .cqd-input:focus {
    border-color: #2563eb;
    background: #ffffff;
}
.cqd-btn-pill {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 20px;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.15s;
}
.cqd-btn-pill.active, .cqd-btn-pill:hover {
    background: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
}

/* Real-time Banner */
.cqd-snapshot-strip {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #ffffff;
    padding: 14px 22px;
    border-radius: 10px;
    margin-bottom: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
}
.cqd-snapshot-title {
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 8px;
}
.cqd-snapshot-metrics {
    display: flex;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
}
.cqd-snap-item {
    font-size: 13px;
    display: flex;
    align-items: baseline;
    gap: 6px;
}
.cqd-snap-item strong {
    font-size: 17px;
    font-weight: 700;
    color: #38bdf8;
}

/* KPI Cards Grid */
.cqd-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}
.cqd-kpi-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 18px 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    position: relative;
    overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s;
}
.cqd-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.cqd-kpi-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
}
.cqd-kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.cqd-kpi-value {
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 6px;
}
.cqd-kpi-unit {
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
}
.cqd-kpi-formula {
    font-size: 11px;
    color: #94a3b8;
    font-style: italic;
    border-top: 1px dashed #e2e8f0;
    padding-top: 8px;
    margin-top: 8px;
}

/* Status colors */
.status-optimal { background: #dcfce7; color: #166534; }
.status-warning { background: #fef3c7; color: #92400e; }
.status-danger  { background: #fee2e2; color: #991b1b; }
.status-neutral { background: #f1f5f9; color: #475569; }

/* Visual Charts & Content Grid */
.cqd-chart-section {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 22px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.cqd-chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f1f5f9;
}
.cqd-chart-tabs {
    display: flex;
    gap: 8px;
}
.cqd-tab-btn {
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
.cqd-tab-btn.active {
    background: #eff6ff;
    color: #2563eb;
    border-color: #bfdbfe;
}
.cqd-chart-svg-wrap {
    width: 100%;
    min-height: 280px;
    position: relative;
}

/* Tables Section */
.cqd-panel {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.cqd-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}
.cqd-panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Modern Data Table */
.cqd-table-responsive {
    overflow-x: auto;
    width: 100%;
}
.cqd-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    text-align: left;
}
.cqd-table th {
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
.cqd-table td {
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: middle;
}
.cqd-table tr:hover td {
    background: #f8fafc;
}

/* Progress bar inside table */
.cqd-bar-cell {
    min-width: 130px;
}
.cqd-bar-track {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 4px;
}
.cqd-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
}

/* Loading State */
.cqd-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #ffffff;
    animation: cqdSpin 0.8s ease-in-out infinite;
}
@keyframes cqdSpin {
    to { transform: rotate(360deg); }
}

@media print {
    .cqd-header-actions, .cqd-filter-bar, .cqd-chart-tabs { display: none !important; }
    .cqd-container { padding: 0; background: #ffffff; }
    .cqd-kpi-card, .cqd-chart-section, .cqd-panel { border: 1px solid #ccc; box-shadow: none; break-inside: avoid; }
}
</style>

<div class="cqd-container" id="cqdRoot">
    <!-- Header -->
    <div class="cqd-header">
        <div class="cqd-header-left">
            <h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Clinical Quality &amp; Hospital Utilization Analytics
            </h1>
            <p>Automated Bed Census &amp; Utilization Engine: BOR %, ALOS, BTI, 30-Day Readmission &amp; Mortality Tracking</p>
        </div>
        <div class="cqd-header-actions">
            <button class="cqd-btn cqd-btn-success" id="cqdRunAggregationBtn" title="Trigger immediate bed census recalculation">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>⚡ Run Census Engine Now</span>
            </button>
            <button class="cqd-btn cqd-btn-secondary" id="cqdPrintBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print / PDF Report</span>
            </button>
        </div>
    </div>

    <!-- Filters Bar -->
    <div class="cqd-filter-bar">
        <div class="cqd-filter-group">
            <span class="cqd-filter-label">Quick Range:</span>
            <button class="cqd-btn-pill" data-days="7">7 Days</button>
            <button class="cqd-btn-pill active" data-days="30">30 Days</button>
            <button class="cqd-btn-pill" data-days="90">90 Days</button>
            <button class="cqd-btn-pill" data-days="365">1 Year</button>
        </div>

        <div class="cqd-filter-group">
            <span class="cqd-filter-label">Date Range:</span>
            <input type="date" id="cqdDateFrom" class="cqd-input">
            <span style="color: #94a3b8;">&rarr;</span>
            <input type="date" id="cqdDateTo" class="cqd-input">
        </div>

        <div class="cqd-filter-group">
            <span class="cqd-filter-label">Ward Scope:</span>
            <select id="cqdWardSelect" class="cqd-select">
                <option value="0">All Wards (Entire Hospital)</option>
            </select>
            <button class="cqd-btn cqd-btn-primary" id="cqdFilterApplyBtn">
                Apply Filters
            </button>
        </div>
    </div>

    <!-- Real-time Midnight / Today Census Banner -->
    <div class="cqd-snapshot-strip" id="cqdSnapshotStrip">
        <div class="cqd-snapshot-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>LATEST BED CENSUS SNAPSHOT (<span id="cqdSnapDate">Today</span>)</span>
        </div>
        <div class="cqd-snapshot-metrics">
            <div class="cqd-snap-item">
                <span>Total Beds:</span>
                <strong id="cqdSnapAvail">-</strong>
            </div>
            <div class="cqd-snap-item">
                <span>Occupied:</span>
                <strong id="cqdSnapOccupied" style="color:#f59e0b;">-</strong>
            </div>
            <div class="cqd-snap-item">
                <span>Vacant:</span>
                <strong id="cqdSnapVacant" style="color:#10b981;">-</strong>
            </div>
            <div class="cqd-snap-item">
                <span>In Maintenance:</span>
                <strong id="cqdSnapBlocked" style="color:#ef4444;">-</strong>
            </div>
            <div class="cqd-snap-item">
                <span>Today's BOR:</span>
                <strong id="cqdSnapBor" style="color:#38bdf8;">-%</strong>
            </div>
        </div>
    </div>

    <!-- Core Utilization & Quality KPI Cards -->
    <div class="cqd-kpi-grid">
        <!-- BOR % Card -->
        <div class="cqd-kpi-card">
            <span class="cqd-kpi-badge status-optimal" id="cqdBorBadge">Optimal</span>
            <div class="cqd-kpi-label">Bed Occupancy Rate (BOR %)</div>
            <div class="cqd-kpi-value"><span id="cqdKpiBor">--</span><span class="cqd-kpi-unit">%</span></div>
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">
                <span id="cqdOccDays">0</span> / <span id="cqdAvailDays">0</span> bed-days
            </div>
            <div class="cqd-kpi-formula">
                BOR = (Occupied Bed Days / Available Bed Days) &times; 100%
            </div>
        </div>

        <!-- ALOS Card -->
        <div class="cqd-kpi-card">
            <span class="cqd-kpi-badge status-optimal" id="cqdAlosBadge">Favorable</span>
            <div class="cqd-kpi-label">Average Length of Stay (ALOS)</div>
            <div class="cqd-kpi-value"><span id="cqdKpiAlos">--</span><span class="cqd-kpi-unit">days</span></div>
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">
                Total stay days: <span id="cqdStayDays">0</span> across <span id="cqdDischarges">0</span> discharges
            </div>
            <div class="cqd-kpi-formula">
                ALOS = (&sum; Inpatient Discharge Days) / Total Discharges
            </div>
        </div>

        <!-- BTI Card -->
        <div class="cqd-kpi-card">
            <span class="cqd-kpi-badge status-neutral" id="cqdBtiBadge">Target: 1-2 d</span>
            <div class="cqd-kpi-label">Bed Turnover Interval (BTI)</div>
            <div class="cqd-kpi-value"><span id="cqdKpiBti">--</span><span class="cqd-kpi-unit">days</span></div>
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">
                Vacant bed-days: <span id="cqdVacantDays">0</span>
            </div>
            <div class="cqd-kpi-formula">
                BTI = Vacant Bed Days / Total Discharges
            </div>
        </div>

        <!-- 30-Day Readmission Rate -->
        <div class="cqd-kpi-card">
            <span class="cqd-kpi-badge status-optimal" id="cqdReadmBadge">CMS &lt; 8%</span>
            <div class="cqd-kpi-label">30-Day Readmission Rate</div>
            <div class="cqd-kpi-value"><span id="cqdKpiReadm">--</span><span class="cqd-kpi-unit">%</span></div>
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">
                Unplanned returns: <span id="cqdReadmCount">0</span>
            </div>
            <div class="cqd-kpi-formula">
                JCAHO / CMS Benchmark: &lt; 8.0%
            </div>
        </div>

        <!-- Inpatient Mortality Rate -->
        <div class="cqd-kpi-card">
            <span class="cqd-kpi-badge status-optimal" id="cqdMortBadge">Target &lt; 2%</span>
            <div class="cqd-kpi-label">Inpatient Mortality Rate</div>
            <div class="cqd-kpi-value"><span id="cqdKpiMort">--</span><span class="cqd-kpi-unit">%</span></div>
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">
                Deaths: <span id="cqdMortCount">0</span>
            </div>
            <div class="cqd-kpi-formula">
                Deaths / (Discharges + Deaths) &times; 100%
            </div>
        </div>

        <!-- HAI / SSI Cases -->
        <div class="cqd-kpi-card">
            <span class="cqd-kpi-badge status-neutral" id="cqdHaiBadge">JCAHO Metric</span>
            <div class="cqd-kpi-label">Healthcare Infections (HAI)</div>
            <div class="cqd-kpi-value"><span id="cqdKpiHai">0</span><span class="cqd-kpi-unit">cases</span></div>
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">
                Rate: <span id="cqdHaiRate">0.0</span> / 1,000 pt-days
            </div>
            <div class="cqd-kpi-formula">
                Surgical Site &amp; Inpatient HAI Incidents
            </div>
        </div>
    </div>

    <!-- Trend Visualizations -->
    <div class="cqd-chart-section">
        <div class="cqd-chart-header">
            <div>
                <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                    Hospital Utilization &amp; Clinical Quality Trends
                </h3>
                <span style="font-size: 12px; color: #64748b;" id="cqdChartPeriodLabel">Past 30 Days</span>
            </div>
            <div class="cqd-chart-tabs">
                <button class="cqd-tab-btn active" data-chart="bor">Bed Occupancy (BOR %)</button>
                <button class="cqd-tab-btn" data-chart="alos_bti">ALOS &amp; Turnover (BTI)</button>
                <button class="cqd-tab-btn" data-chart="flow">Admissions &amp; Discharges</button>
                <button class="cqd-tab-btn" data-chart="quality">Readmission &amp; Mortality</button>
            </div>
        </div>
        <div class="cqd-chart-svg-wrap" id="cqdChartWrap">
            <!-- Dynamic SVG Chart injected here -->
        </div>
    </div>

    <!-- Ward Breakdown Table -->
    <div class="cqd-panel">
        <div class="cqd-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                Ward Utilization &amp; Capacity Breakdown
            </h3>
            <span style="font-size: 12px; color: #64748b;" id="cqdWardCountLabel">-- Active Units</span>
        </div>
        <div class="cqd-table-responsive">
            <table class="cqd-table" id="cqdWardTable">
                <thead>
                    <tr>
                        <th>Ward / Nursing Unit</th>
                        <th>Type</th>
                        <th style="text-align:center;">Capacity</th>
                        <th>Occupancy Rate (BOR %)</th>
                        <th style="text-align:right;">ALOS</th>
                        <th style="text-align:right;">BTI</th>
                        <th style="text-align:center;">Adm / Disch</th>
                        <th style="text-align:center;">Readm / Deaths</th>
                        <th style="text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody id="cqdWardTableBody">
                    <tr>
                        <td colspan="9" style="text-align:center; padding: 24px; color: #94a3b8;">
                            Loading ward utilization data...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Daily Census Ledger -->
    <div class="cqd-panel">
        <div class="cqd-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Daily Bed Census &amp; Aggregation Audit Ledger
            </h3>
            <span style="font-size: 12px; color: #64748b;">Historical Daily Rollups</span>
        </div>
        <div class="cqd-table-responsive">
            <table class="cqd-table" id="cqdLedgerTable">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Scope</th>
                        <th style="text-align:right;">Available</th>
                        <th style="text-align:right;">Occupied</th>
                        <th style="text-align:right;">Vacant</th>
                        <th style="text-align:right;">Adm</th>
                        <th style="text-align:right;">Disch</th>
                        <th style="text-align:right;">BOR %</th>
                        <th style="text-align:right;">ALOS (d)</th>
                        <th style="text-align:right;">BTI (d)</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody id="cqdLedgerTableBody">
                    <tr>
                        <td colspan="11" style="text-align:center; padding: 20px; color: #94a3b8;">
                            Loading ledger...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;
}
