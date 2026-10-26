export function ClinicalSafetyScorecardView() {
    return `
<style>
.cqs-container {
    padding: 24px;
    max-width: 100%;
    box-sizing: border-box;
    font-family: var(--font-primary, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    color: #1e293b;
    background: #f8fafc;
    min-height: calc(100vh - 70px);
}

/* Header */
.cqs-header {
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
.cqs-header-left h1 {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.cqs-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.cqs-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

/* Buttons */
.cqs-btn {
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
.cqs-btn-primary { background: #2563eb; color: #ffffff; }
.cqs-btn-primary:hover { background: #1d4ed8; }
.cqs-btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
.cqs-btn-secondary:hover { background: #f1f5f9; }
.cqs-btn-success { background: #059669; color: #ffffff; }
.cqs-btn-success:hover { background: #047857; }

/* Filter Bar */
.cqs-filter-bar {
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
.cqs-filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.cqs-filter-label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.cqs-input, .cqs-select {
    padding: 7px 12px;
    font-size: 13px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #f8fafc;
    color: #1e293b;
    outline: none;
}
.cqs-input:focus, .cqs-select:focus {
    border-color: #2563eb;
    background: #ffffff;
}
.cqs-btn-pill {
    padding: 6px 13px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 20px;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.15s;
}
.cqs-btn-pill.active, .cqs-btn-pill:hover {
    background: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
}

/* Executive Composite Safety Banner */
.cqs-composite-banner {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #ffffff;
    border-radius: 12px;
    padding: 22px 28px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 24px;
    box-shadow: 0 4px 16px rgba(15,23,42,0.12);
}
.cqs-composite-score-wrap {
    display: flex;
    align-items: center;
    gap: 20px;
}
.cqs-score-circle {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(56, 189, 248, 0.15);
    border: 3px solid #38bdf8;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 800;
    color: #38bdf8;
    line-height: 1;
}
.cqs-score-circle span {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    margin-top: 2px;
}
.cqs-composite-info h2 {
    font-size: 18px;
    margin: 0 0 4px 0;
    font-weight: 700;
    color: #ffffff;
}
.cqs-composite-info p {
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
}
.cqs-pillars-bar {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}
.cqs-pillar-box {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 10px 14px;
    min-width: 130px;
}
.cqs-pillar-name {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}
.cqs-pillar-pts {
    font-size: 16px;
    font-weight: 700;
    color: #f8fafc;
}

/* 4 Core Pillars Grid */
.cqs-pillars-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}
@media (max-width: 900px) {
    .cqs-pillars-grid { grid-template-columns: 1fr; }
}

.cqs-card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 22px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
}
.cqs-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f1f5f9;
}
.cqs-card-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px 0;
}
.cqs-card-subtitle {
    font-size: 12px;
    color: #64748b;
    margin: 0;
}
.cqs-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 12px;
    white-space: nowrap;
}
.badge-optimal { background: #dcfce7; color: #166534; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-danger  { background: #fee2e2; color: #991b1b; }
.badge-neutral { background: #f1f5f9; color: #475569; }

/* Main Stat Hero in Card */
.cqs-stat-hero {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 14px;
}
.cqs-stat-value {
    font-size: 36px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1;
}
.cqs-stat-unit {
    font-size: 16px;
    font-weight: 600;
    color: #64748b;
}
.cqs-stat-target {
    font-size: 12px;
    color: #64748b;
    margin-left: auto;
    text-align: right;
}

/* Micro-Grid for Sub-metrics */
.cqs-sub-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 16px;
}
.cqs-sub-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
}
.cqs-sub-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 4px;
}
.cqs-sub-value {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
}
.cqs-sub-meta {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
}

/* Acuity Bar Breakdown */
.cqs-bar-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.cqs-bar-item {
    display: grid;
    grid-template-columns: 140px 1fr 60px 70px;
    align-items: center;
    gap: 10px;
    font-size: 12px;
}
.cqs-bar-track {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
}
.cqs-bar-fill {
    height: 100%;
    border-radius: 4px;
    background: #2563eb;
    transition: width 0.3s;
}

/* Tables Section */
.cqs-panel {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.cqs-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}
.cqs-panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Tables */
.cqs-table-responsive {
    overflow-x: auto;
    width: 100%;
}
.cqs-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    text-align: left;
}
.cqs-table th {
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
.cqs-table td {
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: middle;
}
.cqs-table tr:hover td {
    background: #f8fafc;
}

/* Modal */
.cqs-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(2px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}
.cqs-modal {
    background: #ffffff;
    border-radius: 12px;
    width: 100%;
    max-width: 620px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    overflow: hidden;
}
.cqs-modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.cqs-modal-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
}
.cqs-modal-body {
    padding: 20px;
    max-height: 75vh;
    overflow-y: auto;
}
.cqs-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.cqs-form-col-2 {
    grid-column: span 2;
}
.cqs-form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
.cqs-form-group label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
}
.cqs-modal-footer {
    padding: 14px 20px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

@media print {
    .cqs-header-actions, .cqs-filter-bar, .cqs-btn { display: none !important; }
    .cqs-container { padding: 0; background: #ffffff; }
    .cqs-card, .cqs-composite-banner, .cqs-panel { break-inside: avoid; border: 1px solid #ccc; box-shadow: none; }
}
</style>

<div class="cqs-container" id="cqsRoot">
    <!-- Header -->
    <div class="cqs-header">
        <div class="cqs-header-left">
            <h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                </svg>
                Executive Clinical Quality Scorecard
            </h1>
            <p>Hospital-Wide Clinical Safety Benchmarks: 30-Day Readmissions, Device-Associated HAI Rates, ER Turnaround, and Caesarean Section %</p>
        </div>
        <div class="cqs-header-actions">
            <button class="cqs-btn cqs-btn-success" id="cqsNewDeliveryBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>+ Log Delivery Event</span>
            </button>
            <button class="cqs-btn cqs-btn-secondary" id="cqsPrintBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print Scorecard Report</span>
            </button>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="cqs-filter-bar">
        <div class="cqs-filter-group">
            <span class="cqs-filter-label">Quick Preset:</span>
            <button class="cqs-btn-pill" data-days="30">30 Days</button>
            <button class="cqs-btn-pill active" data-days="60">60 Days</button>
            <button class="cqs-btn-pill" data-days="90">90 Days</button>
            <button class="cqs-btn-pill" data-days="365">1 Year</button>
        </div>
        <div class="cqs-filter-group">
            <span class="cqs-filter-label">Scorecard Period:</span>
            <input type="date" id="cqsDateFrom" class="cqs-input">
            <span style="color: #94a3b8;">&rarr;</span>
            <input type="date" id="cqsDateTo" class="cqs-input">
            <button class="cqs-btn cqs-btn-primary" id="cqsFilterApplyBtn">
                Refresh Scorecard
            </button>
        </div>
    </div>

    <!-- Executive Composite Safety Banner -->
    <div class="cqs-composite-banner">
        <div class="cqs-composite-score-wrap">
            <div class="cqs-score-circle" id="cqsScoreCircle">
                <span id="cqsCompositeScore">--</span>
                <span>/ 100</span>
            </div>
            <div class="cqs-composite-info">
                <h2>Composite Hospital Safety Index</h2>
                <p>Overall accreditation rating: <strong id="cqsGradeLabel" style="color: #38bdf8;">Evaluating...</strong></p>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                    Reporting window: <span id="cqsPeriodLabel">--</span>
                </div>
            </div>
        </div>
        <div class="cqs-pillars-bar">
            <div class="cqs-pillar-box">
                <div class="cqs-pillar-name">1. Readmission</div>
                <div class="cqs-pillar-pts"><span id="cqsPtsReadm">0</span> / 25 pts</div>
            </div>
            <div class="cqs-pillar-box">
                <div class="cqs-pillar-name">2. HAI Devices</div>
                <div class="cqs-pillar-pts"><span id="cqsPtsHai">0</span> / 25 pts</div>
            </div>
            <div class="cqs-pillar-box">
                <div class="cqs-pillar-name">3. ER Turnaround</div>
                <div class="cqs-pillar-pts"><span id="cqsPtsEr">0</span> / 25 pts</div>
            </div>
            <div class="cqs-pillar-box">
                <div class="cqs-pillar-name">4. C-Section %</div>
                <div class="cqs-pillar-pts"><span id="cqsPtsCs">0</span> / 25 pts</div>
            </div>
        </div>
    </div>

    <!-- 4 Core Pillars Grid -->
    <div class="cqs-pillars-grid">

        <!-- PILLAR 1: 30-Day Readmission Rate % -->
        <div class="cqs-card">
            <div class="cqs-card-header">
                <div>
                    <h3 class="cqs-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        30-Day Readmission Rate %
                    </h3>
                    <p class="cqs-card-subtitle">Unplanned returns within 30 days of inpatient discharge</p>
                </div>
                <span class="cqs-badge badge-optimal" id="cqsReadmStatus">Optimal</span>
            </div>

            <div class="cqs-stat-hero">
                <span class="cqs-stat-value" id="cqsReadmRate">--</span>
                <span class="cqs-stat-unit">%</span>
                <div class="cqs-stat-target">
                    CMS Threshold: <strong>&lt; 8.0%</strong><br>
                    <span style="font-size:11px;" id="cqsReadmVariance">Variance: 0.0%</span>
                </div>
            </div>

            <div class="cqs-sub-grid">
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label">Readmissions</div>
                    <div class="cqs-sub-value" id="cqsReadmCount" style="color: #ef4444;">--</div>
                    <div class="cqs-sub-meta">30-day returns</div>
                </div>
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label">Total Discharges</div>
                    <div class="cqs-sub-value" id="cqsDischargesCount">--</div>
                    <div class="cqs-sub-meta">Surveillance pool</div>
                </div>
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label">Preventable</div>
                    <div class="cqs-sub-value" id="cqsPreventableCount" style="color: #f59e0b;">--</div>
                    <div class="cqs-sub-meta">Root cause flagged</div>
                </div>
            </div>

            <div>
                <div style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
                    Top Readmission Diagnoses:
                </div>
                <div id="cqsTopReadmCauses" style="display:flex; flex-direction:column; gap:4px; font-size:12px; color:#334155;">
                    <span style="color:#94a3b8;">Loading diagnoses...</span>
                </div>
            </div>
        </div>

        <!-- PILLAR 2: HAI Device-Associated Rates per 1,000 Device Days -->
        <div class="cqs-card">
            <div class="cqs-card-header">
                <div>
                    <h3 class="cqs-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        </svg>
                        Device-Associated HAI Rates
                    </h3>
                    <p class="cqs-card-subtitle">Infections per 1,000 Device Exposure Days (NHSN Standards)</p>
                </div>
                <span class="cqs-badge badge-neutral" id="cqsHaiStatus">Composite: --</span>
            </div>

            <div class="cqs-sub-grid">
                <!-- CAUTI -->
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label" style="display:flex; justify-content:space-between;">
                        <span>CAUTI Rate</span>
                        <span style="font-size:10px; color:#10b981;">Target &lt; 1.5</span>
                    </div>
                    <div class="cqs-sub-value" id="cqsCautiRate">--</div>
                    <div class="cqs-sub-meta">
                        <span id="cqsCautiCases">0</span> cases / <span id="cqsFoleyDays">0</span> foley-days
                    </div>
                </div>

                <!-- CLABSI -->
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label" style="display:flex; justify-content:space-between;">
                        <span>CLABSI Rate</span>
                        <span style="font-size:10px; color:#10b981;">Target &lt; 0.8</span>
                    </div>
                    <div class="cqs-sub-value" id="cqsClabsiRate">--</div>
                    <div class="cqs-sub-meta">
                        <span id="cqsClabsiCases">0</span> cases / <span id="cqsClDays">0</span> line-days
                    </div>
                </div>

                <!-- VAP -->
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label" style="display:flex; justify-content:space-between;">
                        <span>VAP Rate</span>
                        <span style="font-size:10px; color:#10b981;">Target &lt; 1.0</span>
                    </div>
                    <div class="cqs-sub-value" id="cqsVapRate">--</div>
                    <div class="cqs-sub-meta">
                        <span id="cqsVapCases">0</span> cases / <span id="cqsVentDays">0</span> vent-days
                    </div>
                </div>
            </div>

            <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-top: auto;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#475569; font-weight:600;">Composite Device Infection Rate:</span>
                    <strong id="cqsCompositeHaiRate" style="color:#0f172a;">-- / 1,000 days</strong>
                </div>
                <div style="color:#64748b; font-size:11px;">
                    Total Device Exposure: <strong id="cqsTotalDevDays">0</strong> catheter, line &amp; ventilator days
                </div>
            </div>
        </div>

        <!-- PILLAR 3: ER Door-to-Doctor Turnaround Time -->
        <div class="cqs-card">
            <div class="cqs-card-header">
                <div>
                    <h3 class="cqs-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ER Door-to-Doctor Turnaround
                    </h3>
                    <p class="cqs-card-subtitle">Minutes elapsed from emergency arrival to physician bedside evaluation</p>
                </div>
                <span class="cqs-badge badge-optimal" id="cqsErStatus">Optimal</span>
            </div>

            <div class="cqs-stat-hero">
                <span class="cqs-stat-value" id="cqsErMedian">--</span>
                <span class="cqs-stat-unit">mins (Median)</span>
                <div class="cqs-stat-target">
                    National Target: <strong>&le; 30 mins</strong><br>
                    <span style="font-size:11px;">90th Percentile: <strong id="cqsErP90">--m</strong></span>
                </div>
            </div>

            <div style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; margin-bottom: 8px;">
                Turnaround by ESI Triage Acuity:
            </div>

            <div class="cqs-bar-list" id="cqsAcuityList">
                <!-- Dynamically populated acuity rows -->
            </div>
        </div>

        <!-- PILLAR 4: Caesarean Section Rate % -->
        <div class="cqs-card">
            <div class="cqs-card-header">
                <div>
                    <h3 class="cqs-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                            <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"></path>
                            <path d="M19 12a7 7 0 0 0-7-7 7 7 0 0 0-7 7"></path>
                        </svg>
                        Caesarean Section Rate %
                    </h3>
                    <p class="cqs-card-subtitle">Maternal &amp; neonatal surgical delivery quality benchmarks</p>
                </div>
                <span class="cqs-badge badge-optimal" id="cqsCsStatus">Evaluated</span>
            </div>

            <div class="cqs-stat-hero">
                <span class="cqs-stat-value" id="cqsCsOverall">--</span>
                <span class="cqs-stat-unit">% Overall</span>
                <div class="cqs-stat-target">
                    WHO Benchmark: <strong>10% - 15%</strong><br>
                    <span style="font-size:11px;">Total Deliveries: <strong id="cqsTotalDeliveries">0</strong></span>
                </div>
            </div>

            <!-- NTSV Benchmark Box -->
            <div style="background: #fdf4ff; border: 1px solid #f5d0fe; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-size: 13px; color: #86198f;">NTSV Caesarean Section Rate:</strong>
                        <div style="font-size: 11px; color: #a21caf;">Nulliparous, Term, Singleton, Vertex (Leapfrog target &lt; 23.6%)</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size: 20px; font-weight: 800; color: #86198f;" id="cqsNtsvRate">--%</span>
                        <div style="font-size: 10px; color: #a21caf;" id="cqsNtsvStatus">Benchmark Target: &lt; 23.6%</div>
                    </div>
                </div>
            </div>

            <!-- Delivery Mode Breakdown -->
            <div class="cqs-sub-grid" style="margin-bottom:0;">
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label">Vaginal Spontaneous</div>
                    <div class="cqs-sub-value" id="cqsVagSpont" style="color: #059669;">0</div>
                </div>
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label">Elective C-Section</div>
                    <div class="cqs-sub-value" id="cqsCsElective" style="color: #2563eb;">0</div>
                </div>
                <div class="cqs-sub-box">
                    <div class="cqs-sub-label">Emergency STAT CS</div>
                    <div class="cqs-sub-value" id="cqsCsEmergency" style="color: #ef4444;">0</div>
                </div>
            </div>
        </div>

    </div>

    <!-- Recent Deliveries Registry Table -->
    <div class="cqs-panel">
        <div class="cqs-panel-header">
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                Obstetric Deliveries &amp; Caesarean Section Audit Registry
            </h3>
            <span style="font-size: 12px; color: #64748b;" id="cqsDeliveryCountLabel">Showing deliveries</span>
        </div>
        <div class="cqs-table-responsive">
            <table class="cqs-table" id="cqsDeliveriesTable">
                <thead>
                    <tr>
                        <th>Delivery #</th>
                        <th>Mother Name / MRN</th>
                        <th>Date &amp; Time</th>
                        <th>Gestational Age</th>
                        <th>Delivery Mode</th>
                        <th>Robson Classification Group</th>
                        <th>Indication</th>
                        <th>Attending OB</th>
                        <th style="text-align:center;">Baby Weight / APGAR</th>
                    </tr>
                </thead>
                <tbody id="cqsDeliveriesTableBody">
                    <tr>
                        <td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">
                            Loading deliveries registry...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal: Log New Delivery -->
<div class="cqs-modal-backdrop" id="cqsDeliveryModal">
    <div class="cqs-modal">
        <div class="cqs-modal-header">
            <h3>Log Obstetric Delivery Record</h3>
            <button type="button" style="background:none; border:none; font-size:18px; cursor:pointer;" id="cqsModalCloseBtn">&times;</button>
        </div>
        <form id="cqsDeliveryForm">
            <div class="cqs-modal-body">
                <div class="cqs-form-grid">
                    <div class="cqs-form-group">
                        <label>Mother Patient Name *</label>
                        <input type="text" name="patient_name" class="cqs-input" placeholder="e.g. Maria Santos" required>
                    </div>
                    <div class="cqs-form-group">
                        <label>Patient MRN</label>
                        <input type="text" name="patient_mrn" class="cqs-input" placeholder="e.g. PAT-000008">
                    </div>
                    <div class="cqs-form-group">
                        <label>Delivery Date &amp; Time *</label>
                        <input type="datetime-local" name="delivery_datetime" class="cqs-input" required>
                    </div>
                    <div class="cqs-form-group">
                        <label>Gestational Weeks</label>
                        <input type="number" step="0.1" name="gestational_weeks" class="cqs-input" value="39.0" required>
                    </div>
                    <div class="cqs-form-group">
                        <label>Delivery Method *</label>
                        <select name="delivery_type" class="cqs-select" required>
                            <option value="Vaginal Spontaneous">Vaginal Spontaneous</option>
                            <option value="Vaginal Assisted (Vacuum/Forceps)">Vaginal Assisted (Vacuum/Forceps)</option>
                            <option value="Cesarean Elective">Cesarean Elective</option>
                            <option value="Cesarean Emergency / STAT">Cesarean Emergency / STAT</option>
                        </select>
                    </div>
                    <div class="cqs-form-group">
                        <label>Robson Classification Group</label>
                        <select name="robson_group" class="cqs-select">
                            <option value="Group 1 (Nulliparous, Single Cephalic, >=37w, Spontaneous)">Group 1: Nulliparous, Single, Cephalic, &ge;37w, Spontaneous</option>
                            <option value="Group 2 (Nulliparous, Single Cephalic, >=37w, Induced/CS pre-labor)">Group 2: Nulliparous, Single, Cephalic, &ge;37w, Induced/CS</option>
                            <option value="Group 3 (Multiparous, Single Cephalic, >=37w, Spontaneous, No prior CS)">Group 3: Multiparous, Single, Cephalic, &ge;37w, No prior CS</option>
                            <option value="Group 5 (Multiparous, Single Cephalic, >=37w, >=1 Prior CS)">Group 5: Multiparous, Single, Cephalic, &ge;37w, &ge;1 Prior CS</option>
                            <option value="Group 6 (Nulliparous Breech)">Group 6: Nulliparous Breech</option>
                            <option value="Group 8 (Multiple Gestations / Twins)">Group 8: Twins / Multiples</option>
                        </select>
                    </div>
                    <div class="cqs-form-group cqs-form-col-2">
                        <label>Indication (if C-Section or Operative)</label>
                        <input type="text" name="indication" class="cqs-input" placeholder="e.g. Fetal distress, Arrest of dilation, Previous C-section">
                    </div>
                    <div class="cqs-form-group">
                        <label>Attending Obstetrician *</label>
                        <input type="text" name="attending_obstetrician" class="cqs-input" value="Dr. Patricia Santos, MD" required>
                    </div>
                    <div class="cqs-form-group">
                        <label>Baby Gender</label>
                        <select name="baby_gender" class="cqs-select">
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                        </select>
                    </div>
                    <div class="cqs-form-group">
                        <label>Birth Weight (grams)</label>
                        <input type="number" name="birth_weight_grams" class="cqs-input" value="3250">
                    </div>
                    <div class="cqs-form-group">
                        <label>APGAR Score (1m / 5m)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="number" name="apgar_1min" class="cqs-input" placeholder="1m" value="8" min="0" max="10">
                            <input type="number" name="apgar_5min" class="cqs-input" placeholder="5m" value="9" min="0" max="10">
                        </div>
                    </div>
                </div>
            </div>
            <div class="cqs-modal-footer">
                <button type="button" class="cqs-btn cqs-btn-secondary" id="cqsModalCancelBtn">Cancel</button>
                <button type="submit" class="cqs-btn cqs-btn-success" id="cqsSaveDeliveryBtn">Save Delivery Record</button>
            </div>
        </form>
    </div>
</div>
`;
}
