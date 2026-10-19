export function VisitorManagementView(user) {
    const role = (user && user.role) ? user.role : "staff";
    const canRevoke = ["admin", "security", "charge_nurse", "doctor"].includes(role);

    return `
    <div class="vm-wrapper" id="visitorManagementWrapper">
        <style>
            .vm-wrapper {
                padding: 24px;
                color: var(--text-primary, #1e293b);
                background: var(--bg-page, #f8fafc);
                min-height: calc(100vh - 60px);
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }

            /* Header Section */
            .vm-header-strip {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 20px;
            }

            .vm-title-group h2 {
                margin: 0 0 4px 0;
                font-size: 22px;
                font-weight: 800;
                color: var(--text-primary, #0f172a);
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .vm-title-group p {
                margin: 0;
                font-size: 13px;
                color: var(--text-muted, #64748b);
            }

            .vm-actions-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .vm-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                font-size: 13px;
                font-weight: 600;
                border-radius: 6px;
                border: 1px solid var(--border-color, #cbd5e1);
                background: var(--bg-surface, #ffffff);
                color: var(--text-primary, #1e293b);
                cursor: pointer;
                transition: all 0.15s ease;
                text-decoration: none;
            }

            .vm-btn:hover {
                background: var(--bg-surface-alt, #f1f5f9);
                border-color: var(--accent, #0284c7);
            }

            .vm-btn-primary {
                background: #0284c7;
                color: #ffffff;
                border-color: #0284c7;
            }

            .vm-btn-primary:hover {
                background: #0369a1;
                border-color: #0369a1;
                color: #ffffff;
            }

            .vm-btn-success {
                background: #10b981;
                color: #ffffff;
                border-color: #10b981;
            }

            .vm-btn-success:hover {
                background: #059669;
                border-color: #059669;
                color: #ffffff;
            }

            .vm-btn-danger {
                background: #ef4444;
                color: #ffffff;
                border-color: #ef4444;
            }

            .vm-btn-danger:hover {
                background: #dc2626;
                border-color: #dc2626;
                color: #ffffff;
            }

            /* Scanner Bar */
            .vm-scanner-bar {
                background: #ffffff;
                border: 2px solid #0284c7;
                border-radius: 10px;
                padding: 16px 20px;
                margin-bottom: 24px;
                box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .vm-scanner-controls {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            .vm-scan-input-wrap {
                flex: 1;
                min-width: 280px;
                position: relative;
            }

            .vm-scan-input-wrap svg {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #64748b;
                width: 20px;
                height: 20px;
            }

            .vm-scan-input {
                width: 100%;
                box-sizing: border-box;
                padding: 10px 12px 10px 42px;
                font-size: 14px;
                font-weight: 600;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                outline: none;
                transition: border-color 0.2s;
            }

            .vm-scan-input:focus {
                border-color: #0284c7;
                box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
            }

            .vm-scan-result-card {
                display: none;
                padding: 14px 18px;
                border-radius: 8px;
                border: 1px solid;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                animation: vmFadeIn 0.2s ease-in-out;
            }

            @keyframes vmFadeIn {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .vm-scan-result-card.status-active {
                background: #ecfdf5;
                border-color: #10b981;
                color: #065f46;
            }

            .vm-scan-result-card.status-expired {
                background: #fffbeb;
                border-color: #f59e0b;
                color: #92400e;
            }

            .vm-scan-result-card.status-revoked {
                background: #fef2f2;
                border-color: #ef4444;
                color: #991b1b;
            }

            .vm-scan-result-card.status-checked-out {
                background: #f8fafc;
                border-color: #94a3b8;
                color: #475569;
            }

            /* KPI Ribbon */
            .vm-kpi-ribbon {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .vm-kpi-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 18px 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.03);
            }

            .vm-kpi-icon {
                width: 48px;
                height: 48px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .vm-kpi-icon.blue { background: #e0f2fe; color: #0284c7; }
            .vm-kpi-icon.emerald { background: #d1fae5; color: #059669; }
            .vm-kpi-icon.amber { background: #fef3c7; color: #d97706; }
            .vm-kpi-icon.purple { background: #f3e8ff; color: #7c3aed; }

            .vm-kpi-info h4 {
                margin: 0 0 2px 0;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #64748b;
                font-weight: 700;
            }

            .vm-kpi-info .vm-kpi-value {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                line-height: 1.1;
            }

            /* Tab Navigation */
            .vm-tabs-bar {
                display: flex;
                border-bottom: 2px solid #e2e8f0;
                margin-bottom: 20px;
                gap: 8px;
            }

            .vm-tab-btn {
                padding: 10px 18px;
                font-size: 13.5px;
                font-weight: 600;
                color: #64748b;
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                margin-bottom: -2px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .vm-tab-btn:hover {
                color: #0284c7;
            }

            .vm-tab-btn.active {
                color: #0284c7;
                border-bottom-color: #0284c7;
            }

            .vm-live-dot {
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                display: inline-block;
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
                animation: vmPulse 1.5s infinite;
            }

            @keyframes vmPulse {
                0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
                70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }

            /* Filter Controls Strip */
            .vm-filter-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 16px;
                background: #ffffff;
                padding: 12px 16px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }

            .vm-filter-inputs {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .vm-filter-select, .vm-filter-input {
                padding: 7px 12px;
                font-size: 13px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                outline: none;
                background: #ffffff;
                color: #1e293b;
            }

            .vm-filter-select:focus, .vm-filter-input:focus {
                border-color: #0284c7;
            }

            /* Data Tables */
            .vm-table-container {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow-x: auto;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }

            .vm-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 13px;
            }

            .vm-table th {
                background: #f8fafc;
                padding: 12px 16px;
                font-weight: 700;
                color: #475569;
                border-bottom: 1px solid #e2e8f0;
                white-space: nowrap;
            }

            .vm-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                color: #1e293b;
                vertical-align: middle;
            }

            .vm-table tr:last-child td {
                border-bottom: none;
            }

            .vm-table tr:hover td {
                background: #f8fafc;
            }

            /* Status Badges */
            .vm-status-pill {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11.5px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .vm-status-pill.Active { background: #d1fae5; color: #065f46; }
            .vm-status-pill.Expired { background: #fef3c7; color: #92400e; }
            .vm-status-pill.Checked-Out { background: #e2e8f0; color: #475569; }
            .vm-status-pill.Revoked { background: #fee2e2; color: #991b1b; }

            .vm-badge-time {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            }

            .vm-badge-time.ok { background: #ecfdf5; color: #047857; }
            .vm-badge-time.warning { background: #fffbeb; color: #b45309; }
            .vm-badge-time.expired { background: #fef2f2; color: #b91c1c; }

            /* Policy Grid */
            .vm-policy-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 20px;
            }

            .vm-policy-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }

            .vm-policy-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid #f1f5f9;
            }

            .vm-policy-card-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
            }

            .vm-policy-specs {
                display: flex;
                flex-direction: column;
                gap: 10px;
                font-size: 13px;
                margin-bottom: 14px;
            }

            .vm-policy-spec-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .vm-policy-spec-row .label {
                color: #64748b;
                font-weight: 500;
            }

            .vm-policy-spec-row .val {
                color: #0f172a;
                font-weight: 700;
            }

            /* Modals */
            .vm-modal-backdrop {
                display: none;
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(15, 23, 42, 0.55);
                backdrop-filter: blur(2px);
                z-index: 9999;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            }

            .vm-modal-content {
                background: #ffffff;
                border-radius: 12px;
                width: 100%;
                max-width: 620px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                display: flex;
                flex-direction: column;
            }

            .vm-modal-header {
                padding: 18px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .vm-modal-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 800;
                color: #0f172a;
            }

            .vm-modal-close {
                background: none;
                border: none;
                font-size: 22px;
                color: #94a3b8;
                cursor: pointer;
                line-height: 1;
            }

            .vm-modal-close:hover {
                color: #0f172a;
            }

            .vm-modal-body {
                padding: 20px 24px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .vm-form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            .vm-form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .vm-form-group.full-width {
                grid-column: 1 / -1;
            }

            .vm-form-group label {
                font-size: 12.5px;
                font-weight: 700;
                color: #334155;
            }

            .vm-form-input, .vm-form-select, .vm-form-textarea {
                padding: 9px 12px;
                font-size: 13px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                outline: none;
                box-sizing: border-box;
                width: 100%;
                background: #fff;
            }

            .vm-form-input:focus, .vm-form-select:focus, .vm-form-textarea:focus {
                border-color: #0284c7;
                box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
            }

            .vm-policy-notice {
                padding: 12px 14px;
                border-radius: 6px;
                font-size: 12.5px;
                display: flex;
                align-items: flex-start;
                gap: 8px;
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                color: #0369a1;
            }

            .vm-policy-notice.warning {
                background: #fffbeb;
                border-color: #fde68a;
                color: #b45309;
            }

            .vm-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: #f8fafc;
                border-bottom-left-radius: 12px;
                border-bottom-right-radius: 12px;
            }
        </style>

        <!-- Top Header Strip -->
        <div class="vm-header-strip">
            <div class="vm-title-group">
                <h2>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    Hospital Visitor Governance &amp; Security Console
                </h2>
                <p>Real-time inpatient visitor logging, bedside quota enforcement, visiting hours policy compliance, and thermal pass printing.</p>
            </div>
            <div class="vm-actions-group">
                <button class="vm-btn vm-btn-primary" id="vmBtnOpenIssueModal">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Issue Visitor Pass
                </button>
                <button class="vm-btn" id="vmBtnRefreshActive">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                    Refresh
                </button>
            </div>
        </div>

        <!-- Security Barcode Scanner & Rapid Verification Bar -->
        <div class="vm-scanner-bar">
            <div class="vm-scanner-controls">
                <div class="vm-scan-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h2v14H3zm4 0h1v14H7zm3 0h3v14h-3zm5 0h1v14h-1zm3 0h3v14h-3z"></path></svg>
                    <input type="text" id="vmBarcodeScannerInput" class="vm-scan-input" placeholder="Scan visitor badge barcode or enter pass # (e.g. VIS-2026-00001)..." autocomplete="off" />
                </div>
                <button class="vm-btn vm-btn-primary" id="vmBtnVerifyBarcode">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    Verify Pass
                </button>
                <button class="vm-btn vm-btn-success" id="vmBtnQuickCheckOut">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Quick Check-Out
                </button>
            </div>

            <!-- Dynamic Verification Result Card -->
            <div id="vmScanResultCard" class="vm-scan-result-card">
                <!-- Injected dynamically via JS -->
            </div>
        </div>

        <!-- KPI Ribbon -->
        <div class="vm-kpi-ribbon" id="vmKpiRibbon">
            <div class="vm-kpi-card">
                <div class="vm-kpi-icon emerald">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div class="vm-kpi-info">
                    <h4>Active in Hospital</h4>
                    <p class="vm-kpi-value" id="kpiActiveVisitors">0</p>
                </div>
            </div>
            <div class="vm-kpi-card">
                <div class="vm-kpi-icon blue">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                </div>
                <div class="vm-kpi-info">
                    <h4>Checked In Today</h4>
                    <p class="vm-kpi-value" id="kpiCheckedInToday">0</p>
                </div>
            </div>
            <div class="vm-kpi-card">
                <div class="vm-kpi-icon purple">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <div class="vm-kpi-info">
                    <h4>Checked Out Today</h4>
                    <p class="vm-kpi-value" id="kpiCheckedOutToday">0</p>
                </div>
            </div>
            <div class="vm-kpi-card">
                <div class="vm-kpi-icon amber">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div class="vm-kpi-info">
                    <h4>Expired Today</h4>
                    <p class="vm-kpi-value" id="kpiExpiredToday">0</p>
                </div>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="vm-tabs-bar">
            <button class="vm-tab-btn active" data-tab="active">
                <span class="vm-live-dot"></span>
                Live Active Visitors (<span id="tabActiveCount">0</span>)
            </button>
            <button class="vm-tab-btn" data-tab="all">
                All Passes &amp; History
            </button>
            <button class="vm-tab-btn" data-tab="policies">
                Ward Visiting Hours &amp; Quotas
            </button>
        </div>

        <!-- Tab 1: Live Active Visitors -->
        <div id="vmTabActive" class="vm-tab-pane">
            <div class="vm-filter-bar">
                <div class="vm-filter-inputs">
                    <input type="text" id="vmActiveSearchInput" class="vm-filter-input" placeholder="Search by visitor, patient, room, or pass #..." style="width: 280px;" />
                    <select id="vmActiveWardFilter" class="vm-filter-select">
                        <option value="">All Hospital Wards</option>
                    </select>
                </div>
                <div style="font-size: 12px; color: #64748b; font-weight: 500;">
                    Auto-refreshing every 5s • <span id="vmLastRefreshedTime">Just now</span>
                </div>
            </div>

            <div class="vm-table-container">
                <table class="vm-table" id="vmActiveTable">
                    <thead>
                        <tr>
                            <th>Pass Number</th>
                            <th>Visitor Details</th>
                            <th>Patient &amp; Bedside Location</th>
                            <th>Relationship</th>
                            <th>Check-In Time</th>
                            <th>Valid Until</th>
                            <th>Status &amp; Time Remaining</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="vmActiveTableBody">
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 32px; color: #94a3b8;">
                                Loading live active visitors...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 2: All Passes & History -->
        <div id="vmTabAll" class="vm-tab-pane" style="display: none;">
            <div class="vm-filter-bar">
                <div class="vm-filter-inputs">
                    <input type="text" id="vmAllSearchInput" class="vm-filter-input" placeholder="Search visitor name, ID, patient, pass #..." style="width: 250px;" />
                    <select id="vmAllStatusFilter" class="vm-filter-select">
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Checked Out">Checked Out</option>
                        <option value="Expired">Expired</option>
                        <option value="Revoked">Revoked</option>
                    </select>
                    <select id="vmAllWardFilter" class="vm-filter-select">
                        <option value="">All Wards</option>
                    </select>
                    <input type="date" id="vmAllDateFilter" class="vm-filter-input" />
                    <button class="vm-btn" id="vmBtnApplyAllFilter">Filter</button>
                    <button class="vm-btn" id="vmBtnResetAllFilter">Reset</button>
                </div>
            </div>

            <div class="vm-table-container">
                <table class="vm-table" id="vmAllTable">
                    <thead>
                        <tr>
                            <th>Pass #</th>
                            <th>Visitor Name</th>
                            <th>ID Document</th>
                            <th>Patient / Bed</th>
                            <th>Ward</th>
                            <th>Check-In</th>
                            <th>Check-Out</th>
                            <th>Status</th>
                            <th>Issuer</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="vmAllTableBody">
                        <tr>
                            <td colspan="10" style="text-align: center; padding: 32px; color: #94a3b8;">
                                Click filter or select date to view history.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 3: Ward Visiting Policies & Quotas -->
        <div id="vmTabPolicies" class="vm-tab-pane" style="display: none;">
            <div class="vm-policy-grid" id="vmPolicyGrid">
                <!-- Injected dynamically via JS -->
            </div>
        </div>

        <!-- Modal: Issue New Visitor Pass -->
        <div class="vm-modal-backdrop" id="vmIssueModal">
            <div class="vm-modal-content">
                <div class="vm-modal-header">
                    <h3>Issue Hospital Visitor Pass</h3>
                    <button type="button" class="vm-modal-close" id="vmBtnCloseIssueModal">&times;</button>
                </div>
                <form id="vmIssueForm">
                    <div class="vm-modal-body">
                        <!-- Patient Inpatient Admission Selector -->
                        <div class="vm-form-group full-width">
                            <label>Admitted Inpatient (Select Room &amp; Bed) *</label>
                            <select id="vmIssueAdmissionSelect" class="vm-form-select" required>
                                <option value="">-- Choose Admitted Patient --</option>
                            </select>
                        </div>

                        <!-- Bedside Quota & Visiting Hours Notice -->
                        <div id="vmAdmissionPolicyNotice" class="vm-policy-notice full-width" style="display: none;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <div id="vmAdmissionPolicyNoticeText">Checking policy &amp; quota status...</div>
                        </div>

                        <div class="vm-form-row">
                            <div class="vm-form-group">
                                <label>Visitor Full Name *</label>
                                <input type="text" id="vmIssueVisitorName" class="vm-form-input" placeholder="e.g. Maria Santos" required />
                            </div>
                            <div class="vm-form-group">
                                <label>Relationship to Patient *</label>
                                <select id="vmIssueRelationship" class="vm-form-select" required>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Child">Child / Offspring</option>
                                    <option value="Sibling">Sibling</option>
                                    <option value="Relative">Relative</option>
                                    <option value="Friend">Friend</option>
                                    <option value="Legal Guardian">Legal Guardian</option>
                                    <option value="Caregiver">Caregiver</option>
                                    <option value="Legal Counsel">Legal Counsel</option>
                                    <option value="Clergy">Clergy</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="vm-form-row">
                            <div class="vm-form-group">
                                <label>ID Document Type *</label>
                                <select id="vmIssueIdDocType" class="vm-form-select" required>
                                    <option value="National ID">National ID / PhilSys</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Driver License">Driver's License</option>
                                    <option value="SSS/UMID">SSS / UMID</option>
                                    <option value="Voter ID">Voter's ID</option>
                                    <option value="Company/Office ID">Company / Corporate ID</option>
                                    <option value="School ID">Student / School ID</option>
                                    <option value="Other Government ID">Other Government ID</option>
                                </select>
                            </div>
                            <div class="vm-form-group">
                                <label>ID Document Number *</label>
                                <input type="text" id="vmIssueIdDocNumber" class="vm-form-input" placeholder="ID or Card Number" required />
                            </div>
                        </div>

                        <div class="vm-form-row">
                            <div class="vm-form-group">
                                <label>Contact Phone Number *</label>
                                <input type="tel" id="vmIssuePhone" class="vm-form-input" placeholder="e.g. 0917-123-4567" required />
                            </div>
                            <div class="vm-form-group">
                                <label>Pass Duration (Minutes)</label>
                                <input type="number" id="vmIssueDuration" class="vm-form-input" value="120" min="15" max="720" step="15" />
                            </div>
                        </div>

                        <div class="vm-form-group full-width">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #b45309; font-weight: 700;">
                                <input type="checkbox" id="vmIssueEmergencyException" value="1" />
                                Clinical / Emergency Override Exception (Bypass Visiting Hours Restrictions)
                            </label>
                        </div>

                        <div class="vm-form-group full-width">
                            <label>Pass Notes / Remarks</label>
                            <textarea id="vmIssueNotes" class="vm-form-textarea" rows="2" placeholder="Optional security notes or exception justification..."></textarea>
                        </div>
                    </div>
                    <div class="vm-modal-footer">
                        <button type="button" class="vm-btn" id="vmBtnCancelIssueModal">Cancel</button>
                        <button type="submit" class="vm-btn vm-btn-primary" id="vmBtnSubmitIssue">
                            Issue Pass &amp; Print Badge
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal: Revoke Pass -->
        <div class="vm-modal-backdrop" id="vmRevokeModal">
            <div class="vm-modal-content" style="max-width: 480px;">
                <div class="vm-modal-header" style="background: #fef2f2;">
                    <h3 style="color: #991b1b;">Revoke Visitor Pass</h3>
                    <button type="button" class="vm-modal-close" id="vmBtnCloseRevokeModal">&times;</button>
                </div>
                <div class="vm-modal-body">
                    <p id="vmRevokeModalText" style="font-size: 13.5px; color: #475569; margin: 0;"></p>
                    <div class="vm-form-group full-width">
                        <label>Reason for Revocation *</label>
                        <select id="vmRevokeReasonSelect" class="vm-form-select">
                            <option value="Security Policy Violation">Security Policy Violation</option>
                            <option value="Patient Requested Visitor Removal">Patient Requested Visitor Removal</option>
                            <option value="Disruptive / Aggressive Behavior">Disruptive / Aggressive Behavior</option>
                            <option value="Infection Control / Health Risk">Infection Control / Health Risk</option>
                            <option value="Unauthorized Area Access">Unauthorized Area Access</option>
                            <option value="Excessive Overstay / Refusal to Leave">Excessive Overstay / Refusal to Leave</option>
                            <option value="Other">Other Specific Incident</option>
                        </select>
                    </div>
                    <div class="vm-form-group full-width">
                        <label>Additional Incident Details</label>
                        <textarea id="vmRevokeReasonDetail" class="vm-form-textarea" rows="3" placeholder="Provide details for security audit log..."></textarea>
                    </div>
                </div>
                <div class="vm-modal-footer">
                    <button type="button" class="vm-btn" id="vmBtnCancelRevokeModal">Cancel</button>
                    <button type="button" class="vm-btn vm-btn-danger" id="vmBtnConfirmRevoke">Revoke Immediately</button>
                </div>
            </div>
        </div>
    </div>
    `;
}
