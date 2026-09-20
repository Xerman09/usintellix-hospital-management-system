export function OrManagementView() {
    return `
    <div class="or-wrapper" id="orWrapper">
        <style>
            .or-wrapper {
                padding: 24px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #1e293b;
                background: #f8fafc;
                min-height: 100vh;
                box-sizing: border-box;
            }

            /* Header */
            .or-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e2e8f0;
            }
            .or-header-left h1 {
                font-size: 24px;
                font-weight: 700;
                color: #0f172a;
                margin: 0 0 4px 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .or-header-left p {
                font-size: 13px;
                color: #64748b;
                margin: 0;
            }
            .or-header-actions {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            .or-live-clock {
                background: #0f172a;
                color: #38bdf8;
                font-family: monospace;
                font-size: 14px;
                font-weight: 700;
                padding: 7px 14px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .or-btn-primary {
                background: #0284c7;
                color: #fff;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: background 0.15s;
            }
            .or-btn-primary:hover { background: #0369a1; }
            .or-btn-secondary {
                background: #fff;
                color: #334155;
                border: 1px solid #cbd5e1;
                padding: 8px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.15s;
            }
            .or-btn-secondary:hover { background: #f1f5f9; }

            /* OR Suite Live Status Cards Grid */
            .or-suites-section {
                margin-bottom: 24px;
            }
            .or-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .or-section-title {
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #475569;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .or-suites-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }
            .or-suite-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                transition: transform 0.15s, box-shadow 0.15s;
                position: relative;
                overflow: hidden;
            }
            .or-suite-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
            }
            .or-suite-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 10px;
            }
            .or-suite-code {
                font-size: 12px;
                font-weight: 700;
                color: #0284c7;
                background: #e0f2fe;
                padding: 2px 8px;
                border-radius: 4px;
            }
            .or-suite-name {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
                margin: 4px 0 2px;
            }
            .or-suite-floor {
                font-size: 11px;
                color: #64748b;
            }
            .or-suite-status-badge {
                font-size: 11px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 12px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .or-suite-status-badge.in-surgery {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fca5a5;
            }
            .or-pulse-dot {
                width: 8px;
                height: 8px;
                background: #ef4444;
                border-radius: 50%;
                animation: orPulse 1.5s infinite;
            }
            @keyframes orPulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .or-suite-status-badge.available {
                background: #dcfce7;
                color: #166534;
                border: 1px solid #86efac;
            }
            .or-suite-status-badge.turnover {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            .or-suite-status-badge.maintenance {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #cbd5e1;
            }
            .or-suite-active-case {
                margin-top: 12px;
                padding: 10px 12px;
                background: #f8fafc;
                border-radius: 6px;
                border-left: 3px solid #0284c7;
                font-size: 12px;
            }
            .or-suite-active-case.surgery {
                border-left-color: #ef4444;
                background: #fff5f5;
            }
            .or-suite-case-proc {
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 3px;
                line-height: 1.3;
            }
            .or-suite-case-patient {
                color: #475569;
                margin-bottom: 2px;
            }
            .or-suite-case-surgeon {
                font-size: 11px;
                color: #64748b;
            }
            .or-suite-next {
                margin-top: 10px;
                font-size: 11px;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            /* KPI Cards */
            .or-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .or-kpi-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 16px 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }
            .or-kpi-label {
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .or-kpi-value {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                margin: 4px 0 2px;
            }
            .or-kpi-sub {
                font-size: 11px;
                color: #94a3b8;
            }
            .or-kpi-card.blue { border-left: 4px solid #0284c7; }
            .or-kpi-card.red { border-left: 4px solid #ef4444; }
            .or-kpi-card.purple { border-left: 4px solid #8b5cf6; }
            .or-kpi-card.green { border-left: 4px solid #10b981; }
            .or-kpi-card.amber { border-left: 4px solid #f59e0b; }

            /* Filter & View Controls Bar */
            .or-controls-bar {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 14px 18px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 14px;
            }
            .or-filters-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                flex: 1;
            }
            .or-input, .or-select {
                padding: 7px 11px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 12px;
                background: #fff;
                color: #1e293b;
            }
            .or-search-box {
                flex: 1;
                min-width: 200px;
            }
            .or-view-switcher {
                display: flex;
                background: #f1f5f9;
                padding: 3px;
                border-radius: 8px;
                gap: 2px;
            }
            .or-view-btn {
                border: none;
                background: none;
                padding: 6px 14px;
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .or-view-btn.active {
                background: #fff;
                color: #0284c7;
                box-shadow: 0 1px 2px rgba(0,0,0,0.06);
            }

            /* Live Whiteboard Flowboard (Kanban) */
            .or-whiteboard {
                display: grid;
                grid-template-columns: repeat(6, minmax(240px, 1fr));
                gap: 14px;
                overflow-x: auto;
                padding-bottom: 12px;
            }
            .or-column {
                background: #f1f5f9;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                min-height: 400px;
                max-height: 75vh;
            }
            .or-column-header {
                padding: 10px 14px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #e2e8f0;
                border-top-left-radius: 7px;
                border-top-right-radius: 7px;
            }
            .or-column-title {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #334155;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .or-column-count {
                background: #fff;
                color: #0f172a;
                font-size: 11px;
                font-weight: 700;
                padding: 1px 7px;
                border-radius: 10px;
            }
            .or-column-cards {
                padding: 10px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
                flex: 1;
            }
            .or-case-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                transition: transform 0.12s, box-shadow 0.12s;
                position: relative;
            }
            .or-case-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07);
            }
            .or-case-card.priority-emergency {
                border-left: 4px solid #ef4444;
            }
            .or-case-card.priority-urgent {
                border-left: 4px solid #f59e0b;
            }
            .or-case-card.priority-elective {
                border-left: 4px solid #3b82f6;
            }
            .or-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .or-card-num {
                font-family: monospace;
                font-size: 11px;
                font-weight: 700;
                color: #0284c7;
            }
            .or-card-suite {
                font-size: 10px;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 4px;
                background: #f1f5f9;
                color: #475569;
            }
            .or-card-patient {
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 4px;
            }
            .or-card-proc {
                font-size: 12px;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 6px;
                line-height: 1.3;
            }
            .or-card-surgeon {
                font-size: 11px;
                color: #64748b;
                margin-bottom: 8px;
            }
            .or-card-chips {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }
            .or-chip {
                font-size: 10px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 4px;
            }
            .or-chip-green { background: #dcfce7; color: #166534; }
            .or-chip-amber { background: #fef3c7; color: #92400e; }
            .or-chip-red   { background: #fee2e2; color: #991b1b; }
            .or-chip-blue  { background: #e0f2fe; color: #0369a1; }
            .or-card-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #f1f5f9;
                padding-top: 8px;
                margin-top: 6px;
            }
            .or-btn-advance {
                background: #0284c7;
                color: #fff;
                border: none;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
            }
            .or-btn-advance:hover { background: #0369a1; }
            .or-btn-view {
                background: #f8fafc;
                color: #475569;
                border: 1px solid #cbd5e1;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
            }
            .or-btn-view:hover { background: #f1f5f9; }

            /* Detailed Schedule Table View */
            .or-table-wrapper {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                overflow-x: auto;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }
            .or-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                text-align: left;
            }
            .or-table thead tr {
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
            }
            .or-table th {
                padding: 12px 14px;
                font-weight: 600;
                color: #475569;
                white-space: nowrap;
            }
            .or-table td {
                padding: 12px 14px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .or-table tbody tr:hover {
                background: #f8fafc;
            }

            /* Priority and Stage Badges */
            .or-badge-stage {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
            }
            .or-badge-priority {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .or-priority-elective  { background: #e0f2fe; color: #0369a1; }
            .or-priority-urgent    { background: #fef3c7; color: #92400e; }
            .or-priority-emergency { background: #fee2e2; color: #991b1b; }

            /* Modal Overlays */
            .or-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.65);
                backdrop-filter: blur(2px);
                z-index: 10000;
                display: none;
                justify-content: center;
                align-items: center;
                padding: 20px;
                overflow-y: auto;
            }
            .or-modal-box {
                background: #fff;
                border-radius: 12px;
                width: 100%;
                max-width: 760px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
                border: 1px solid #cbd5e1;
                overflow: hidden;
                margin: auto;
            }
            .or-modal-header {
                background: #0f172a;
                color: #fff;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .or-modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
            .or-modal-close-x {
                background: none;
                border: none;
                color: #94a3b8;
                font-size: 22px;
                cursor: pointer;
            }
            .or-modal-body {
                padding: 20px;
                max-height: 75vh;
                overflow-y: auto;
            }
            .or-modal-footer {
                padding: 14px 20px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: #f8fafc;
            }
            .or-form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
            }
            .or-form-grid .full-width { grid-column: 1 / -1; }
            .or-form-group label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #475569;
                margin-bottom: 5px;
            }
            .or-form-group input,
            .or-form-group select,
            .or-form-group textarea {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 12px;
                background: #fff;
                color: #1e293b;
                box-sizing: border-box;
            }
            .or-section-divider {
                grid-column: 1 / -1;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #0284c7;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 4px;
                margin-top: 6px;
            }

            /* =========================================================
               DARK MODE STYLES (:root[data-theme="dark"])
               ========================================================= */
            :root[data-theme="dark"] .or-wrapper {
                background-color: transparent !important;
                color: #f1f5f9 !important;
            }
            :root[data-theme="dark"] .or-header {
                border-bottom-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-header-left h1 {
                color: #f1f5f9 !important;
            }
            :root[data-theme="dark"] .or-header-left p,
            :root[data-theme="dark"] .or-section-title,
            :root[data-theme="dark"] .or-kpi-sub,
            :root[data-theme="dark"] .or-suite-floor {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-suite-card,
            :root[data-theme="dark"] .or-kpi-card,
            :root[data-theme="dark"] .or-controls-bar,
            :root[data-theme="dark"] .or-table-wrapper {
                background-color: #1e293b !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-kpi-value,
            :root[data-theme="dark"] .or-suite-name,
            :root[data-theme="dark"] .or-suite-case-proc,
            :root[data-theme="dark"] .or-card-patient,
            :root[data-theme="dark"] .or-card-proc {
                color: #f1f5f9 !important;
            }
            :root[data-theme="dark"] .or-suite-active-case {
                background-color: #0f172a !important;
            }
            :root[data-theme="dark"] .or-input,
            :root[data-theme="dark"] .or-select {
                background-color: #0f172a !important;
                border-color: #334155 !important;
                color: #f1f5f9 !important;
            }
            :root[data-theme="dark"] .or-view-switcher {
                background-color: #0f172a !important;
            }
            :root[data-theme="dark"] .or-view-btn {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-view-btn.active {
                background-color: #1e293b !important;
                color: #38bdf8 !important;
            }
            :root[data-theme="dark"] .or-column {
                background-color: #0f172a !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-column-header {
                background-color: #1e293b !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-column-title {
                color: #cbd5e1 !important;
            }
            :root[data-theme="dark"] .or-column-count {
                background-color: #334155 !important;
                color: #f1f5f9 !important;
            }
            :root[data-theme="dark"] .or-case-card {
                background-color: #1e293b !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-card-actions {
                border-top-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-btn-view {
                background-color: #334155 !important;
                color: #f1f5f9 !important;
                border-color: #475569 !important;
            }
            :root[data-theme="dark"] .or-table thead tr {
                background-color: #0f172a !important;
                border-bottom-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-table th {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-table td {
                color: #cbd5e1 !important;
                border-bottom-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-table tbody tr:hover {
                background-color: #0f172a !important;
            }
            :root[data-theme="dark"] .or-modal-box {
                background-color: #1e293b !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-modal-footer {
                background-color: #0f172a !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-form-group label {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-form-group input,
            :root[data-theme="dark"] .or-form-group select,
            :root[data-theme="dark"] .or-form-group textarea {
                background-color: #0f172a !important;
                border-color: #334155 !important;
                color: #f1f5f9 !important;
            }
            :root[data-theme="dark"] .or-section-divider {
                color: #38bdf8 !important;
                border-bottom-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-btn-secondary {
                background-color: #1e293b !important;
                border-color: #334155 !important;
                color: #f1f5f9 !important;
            }

            @media print {
                .or-header-actions, .or-controls-bar, .or-modal-overlay, .sidebar, .top-navbar { display: none !important; }
                .or-wrapper { padding: 0 !important; background: #fff !important; }
                .or-suite-card, .or-kpi-card, .or-table-wrapper { box-shadow: none !important; border: 1px solid #ccc !important; }
            }
        </style>

        <!-- Header -->
        <div class="or-header">
            <div class="or-header-left">
                <h1>
                    <span>&#127973;</span>
                    Operating Room (OR) Management
                </h1>
                <p>Perioperative Suite Allocation, Live Surgical Whiteboard, Stage Transitions &amp; Utilization Tracking</p>
            </div>
            <div class="or-header-actions">
                <div class="or-live-clock" id="orLiveClock">--:--:--</div>
                <input type="date" id="orFilterDate" class="or-input" style="font-weight: 600; padding: 8px 12px;" />
                <button type="button" class="or-btn-primary" id="orBookCaseBtn">
                    <span>+</span> Book Surgical Case
                </button>
                <button type="button" class="or-btn-secondary" id="orSuiteStatusBtn">
                    <span>&#9881;</span> Room Status
                </button>
                <button type="button" class="or-btn-secondary" id="orPrintBtn">
                    <span>&#128438;</span> Print OR Schedule
                </button>
            </div>
        </div>

        <!-- Live OR Suites Status Cards -->
        <div class="or-suites-section">
            <div class="or-section-header">
                <div class="or-section-title">
                    <span>&#128716;</span>
                    Operating Room Suites &mdash; Live Status &amp; Turnover
                </div>
                <div style="font-size: 11px; color: #64748b;">
                    Updates automatically every 30s
                </div>
            </div>
            <div class="or-suites-grid" id="orSuitesGrid">
                <div style="padding: 30px; text-align: center; color: #64748b; font-style: italic; grid-column: 1 / -1;">
                    Loading Operating Room Suites...
                </div>
            </div>
        </div>

        <!-- KPI Metrics Summary Cards -->
        <div class="or-kpi-grid">
            <div class="or-kpi-card blue">
                <div class="or-kpi-label">Total Cases Today</div>
                <div class="or-kpi-value" id="orKpiTotalCases">--</div>
                <div class="or-kpi-sub" id="orKpiElectiveCount">-- elective booked</div>
            </div>
            <div class="or-kpi-card red">
                <div class="or-kpi-label">Active in Surgery</div>
                <div class="or-kpi-value" id="orKpiInProgress">--</div>
                <div class="or-kpi-sub">currently in OR suites</div>
            </div>
            <div class="or-kpi-card purple">
                <div class="or-kpi-label">In PACU Recovery</div>
                <div class="or-kpi-value" id="orKpiInPacu">--</div>
                <div class="or-kpi-sub">post-anesthesia recovery</div>
            </div>
            <div class="or-kpi-card green">
                <div class="or-kpi-label">OR Utilization Rate</div>
                <div class="or-kpi-value" id="orKpiUtilization">--%</div>
                <div class="or-kpi-sub">operational hours capacity</div>
            </div>
            <div class="or-kpi-card amber">
                <div class="or-kpi-label">Avg Turnover Time</div>
                <div class="or-kpi-value" id="orKpiTurnover">-- min</div>
                <div class="or-kpi-sub">room wheels-out to wheels-in</div>
            </div>
            <div class="or-kpi-card red">
                <div class="or-kpi-label">Urgent / Emergency</div>
                <div class="or-kpi-value" id="orKpiUrgent">--</div>
                <div class="or-kpi-sub">priority expedited cases</div>
            </div>
        </div>

        <!-- Controls Bar & View Switcher -->
        <div class="or-controls-bar">
            <div class="or-filters-group">
                <select id="orSuiteFilter" class="or-select" style="min-width: 140px;">
                    <option value="all">All OR Suites</option>
                </select>
                <select id="orSpecialtyFilter" class="or-select" style="min-width: 140px;">
                    <option value="all">All Specialties</option>
                </select>
                <select id="orPriorityFilter" class="or-select">
                    <option value="all">All Priorities</option>
                    <option value="Elective">Elective</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency / STAT">Emergency / STAT</option>
                </select>
                <select id="orStageFilter" class="or-select">
                    <option value="all">All Stages</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Pre-Op Holding">Pre-Op Holding</option>
                    <option value="In Room / Induction">In Room / Induction</option>
                    <option value="Incision / In Progress">Incision / In Progress</option>
                    <option value="Closing / Extubation">Closing / Extubation</option>
                    <option value="In PACU">In PACU</option>
                    <option value="Transferred / Discharged">Transferred / Done</option>
                </select>
                <input type="text" id="orSearchInput" class="or-input or-search-box" placeholder="Search case #, patient, surgeon, procedure..." />
                <button type="button" class="or-btn-secondary" id="orResetFilterBtn" style="padding: 7px 12px;">Reset</button>
            </div>
            <div class="or-view-switcher">
                <button type="button" class="or-view-btn active" id="orViewWhiteboardBtn">
                    <span>&#128202;</span> Live Whiteboard
                </button>
                <button type="button" class="or-view-btn" id="orViewTableBtn">
                    <span>&#9776;</span> Schedule Table
                </button>
            </div>
        </div>

        <!-- VIEW 1: Live Whiteboard Flowboard (Kanban) -->
        <div id="orWhiteboardContainer">
            <div class="or-whiteboard" id="orWhiteboard">
                <!-- Column 1: Scheduled -->
                <div class="or-column" data-stage="Scheduled">
                    <div class="or-column-header">
                        <span class="or-column-title">&#128197; Scheduled</span>
                        <span class="or-column-count" id="orCountScheduled">0</span>
                    </div>
                    <div class="or-column-cards" id="orColScheduled"></div>
                </div>

                <!-- Column 2: Pre-Op Holding -->
                <div class="or-column" data-stage="Pre-Op Holding">
                    <div class="or-column-header">
                        <span class="or-column-title">&#9203; Pre-Op Holding</span>
                        <span class="or-column-count" id="orCountPreOp">0</span>
                    </div>
                    <div class="or-column-cards" id="orColPreOp"></div>
                </div>

                <!-- Column 3: In Room / Induction -->
                <div class="or-column" data-stage="In Room / Induction">
                    <div class="or-column-header">
                        <span class="or-column-title">&#128682; In Room / Induction</span>
                        <span class="or-column-count" id="orCountInRoom">0</span>
                    </div>
                    <div class="or-column-cards" id="orColInRoom"></div>
                </div>

                <!-- Column 4: Incision / In Progress -->
                <div class="or-column" data-stage="Incision / In Progress">
                    <div class="or-column-header" style="background: #fee2e2;">
                        <span class="or-column-title" style="color: #991b1b;">&#128298; Incision / In Progress</span>
                        <span class="or-column-count" id="orCountIncision" style="background: #ef4444; color: #fff;">0</span>
                    </div>
                    <div class="or-column-cards" id="orColIncision"></div>
                </div>

                <!-- Column 5: In PACU Recovery -->
                <div class="or-column" data-stage="In PACU">
                    <div class="or-column-header" style="background: #f3e8ff;">
                        <span class="or-column-title" style="color: #6b21a8;">&#128716; In PACU</span>
                        <span class="or-column-count" id="orCountPACU">0</span>
                    </div>
                    <div class="or-column-cards" id="orColPACU"></div>
                </div>

                <!-- Column 6: Transferred / Done -->
                <div class="or-column" data-stage="Transferred / Discharged">
                    <div class="or-column-header" style="background: #dcfce7;">
                        <span class="or-column-title" style="color: #166534;">&#10003; Transferred / Done</span>
                        <span class="or-column-count" id="orCountDone">0</span>
                    </div>
                    <div class="or-column-cards" id="orColDone"></div>
                </div>
            </div>
        </div>

        <!-- VIEW 2: Detailed Schedule Table View -->
        <div id="orTableContainer" style="display: none;">
            <div class="or-table-wrapper">
                <table class="or-table">
                    <thead>
                        <tr>
                            <th>Case #</th>
                            <th>Time</th>
                            <th>OR Suite</th>
                            <th>Patient</th>
                            <th>Procedure &amp; Specialty</th>
                            <th>Lead Surgeon</th>
                            <th>Anesthesia</th>
                            <th>Priority</th>
                            <th>Perioperative Stage</th>
                            <th>Pre-Op Ready</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="orTableBody">
                        <tr>
                            <td colspan="11" style="padding: 30px; text-align: center; color: #64748b;">
                                Loading cases...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>

    <!-- =========================================================
         MODAL 1: BOOK / SCHEDULE SURGICAL CASE
         ========================================================= -->
    <div class="or-modal-overlay" id="orBookModal">
        <div class="or-modal-box">
            <div class="or-modal-header">
                <h3>&#128197; Book / Schedule Surgical Case</h3>
                <button type="button" class="or-modal-close-x" id="orCloseBookModal">&times;</button>
            </div>
            <form id="orBookForm" autocomplete="off">
                <div class="or-modal-body">
                    <div class="or-form-grid">

                        <!-- Patient Selector Box -->
                        <div class="or-form-group full-width" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 4px;">
                            <label style="font-weight: 700; color: #166534; display: flex; align-items: center; gap: 6px;">
                                <span>&#128100; Select Patient from EHR Patient List</span>
                                <span style="font-size: 11px; font-weight: 400; color: #15803d;">(Auto-populates Name, MRN, Age &amp; Gender)</span>
                            </label>
                            <select id="orFPatientSelect" class="or-select" style="width: 100%; border-color: #86efac;">
                                <option value="">-- Loading patients... --</option>
                            </select>
                            <input type="hidden" id="orFPatientId" />
                        </div>

                        <div class="or-form-group">
                            <label>Patient Full Name *</label>
                            <input type="text" id="orFPatientName" required placeholder="Patient full name" />
                        </div>
                        <div class="or-form-group">
                            <label>Patient MRN / Patient No</label>
                            <input type="text" id="orFPatientMrn" placeholder="PAT-XXXXXX" />
                        </div>
                        <div class="or-form-group">
                            <label>Age</label>
                            <input type="number" id="orFPatientAge" placeholder="e.g. 45" />
                        </div>
                        <div class="or-form-group">
                            <label>Gender</label>
                            <select id="orFGender">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div class="or-section-divider">OR Scheduling &amp; Room Details</div>

                        <div class="or-form-group">
                            <label>OR Suite *</label>
                            <select id="orFSuiteId" required>
                                <option value="">-- Select OR Suite --</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>Scheduled Date *</label>
                            <input type="date" id="orFDate" required />
                        </div>
                        <div class="or-form-group">
                            <label>Scheduled Start Time *</label>
                            <input type="time" id="orFStartTime" required value="08:00" />
                        </div>
                        <div class="or-form-group">
                            <label>Est. Duration (Minutes) *</label>
                            <input type="number" id="orFDuration" required value="120" min="15" step="15" />
                        </div>
                        <div class="or-form-group">
                            <label>Case Priority *</label>
                            <select id="orFPriority" required>
                                <option value="Elective">Elective</option>
                                <option value="Urgent">Urgent</option>
                                <option value="Emergency / STAT">Emergency / STAT</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>Initial Stage</label>
                            <select id="orFStage">
                                <option value="Scheduled">Scheduled</option>
                                <option value="Pre-Op Holding">Pre-Op Holding</option>
                                <option value="In Room / Induction">In Room / Induction</option>
                            </select>
                        </div>

                        <div class="or-section-divider">Procedure &amp; Surgical Team</div>

                        <div class="or-form-group">
                            <label>Surgical Specialty *</label>
                            <select id="orFSpecialty" required>
                                <option value="General Surgery">General Surgery</option>
                                <option value="Orthopedic Surgery">Orthopedic Surgery</option>
                                <option value="Cardiothoracic Surgery">Cardiothoracic Surgery</option>
                                <option value="Neurosurgery">Neurosurgery</option>
                                <option value="OB-GYN Surgery">OB-GYN Surgery</option>
                                <option value="Urology">Urology</option>
                                <option value="Otolaryngology (ENT)">Otolaryngology (ENT)</option>
                                <option value="Ophthalmology">Ophthalmology</option>
                                <option value="Plastics &amp; Reconstructive">Plastics &amp; Reconstructive</option>
                                <option value="Vascular Surgery">Vascular Surgery</option>
                                <option value="Pediatric Surgery">Pediatric Surgery</option>
                                <option value="Gastroenterology / GI Surgery">Gastroenterology / GI Surgery</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>Procedure Name *</label>
                            <input type="text" id="orFProcedure" required placeholder="e.g. Laparoscopic Cholecystectomy" />
                        </div>
                        <div class="or-form-group full-width">
                            <label>Pre-Op Diagnosis</label>
                            <input type="text" id="orFPreopDiag" placeholder="e.g. Acute Cholecystitis with Cholelithiasis" />
                        </div>
                        <div class="or-form-group">
                            <label>Lead Operating Surgeon *</label>
                            <input type="text" id="orFSurgeon" required placeholder="e.g. Dr. Mark Villareal, MD, FPCS" />
                        </div>
                        <div class="or-form-group">
                            <label>Assistant Surgeon</label>
                            <input type="text" id="orFAssistant" placeholder="Assistant surgeon name" />
                        </div>
                        <div class="or-form-group">
                            <label>Anesthesiologist *</label>
                            <input type="text" id="orFAnesthesiologist" required placeholder="e.g. Dr. Karen Ong, MD, DPBA" />
                        </div>
                        <div class="or-form-group">
                            <label>Anesthesia Type *</label>
                            <select id="orFAnesthesiaType" required>
                                <option value="General">General (Endotracheal)</option>
                                <option value="General (TIVA)">General (TIVA - Total Intravenous)</option>
                                <option value="Spinal">Spinal Anesthesia</option>
                                <option value="Epidural">Epidural Anesthesia</option>
                                <option value="MAC / Sedation">MAC / Monitored Anesthesia Care</option>
                                <option value="Regional Block">Regional Nerve Block</option>
                                <option value="Local">Local Anesthesia</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>Scrub Nurse</label>
                            <input type="text" id="orFScrub" placeholder="Scrub nurse name" />
                        </div>
                        <div class="or-form-group">
                            <label>Circulating Nurse</label>
                            <input type="text" id="orFCirculator" placeholder="Circulating nurse name" />
                        </div>

                        <div class="or-section-divider">Pre-Operative Readiness Checks</div>

                        <div class="or-form-group full-width" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                                <input type="checkbox" id="orFPreopCleared" checked style="width: 16px; height: 16px; accent-color: #0284c7;" />
                                <span>Pre-Op Anesthesia Clearance Complete</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                                <input type="checkbox" id="orFConsentSigned" checked style="width: 16px; height: 16px; accent-color: #0284c7;" />
                                <span>Informed Surgical Consent Signed</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                                <input type="checkbox" id="orFBloodReserved" style="width: 16px; height: 16px; accent-color: #0284c7;" />
                                <span>Blood Products Reserved in Blood Bank</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                                <input type="checkbox" id="orFImplantsRequired" style="width: 16px; height: 16px; accent-color: #0284c7;" />
                                <span>Special Implants / Hardware Needed</span>
                            </label>
                        </div>

                        <div class="or-form-group full-width">
                            <label>Clinical Notes / Special Equipment Requests</label>
                            <textarea id="orFNotes" rows="2" placeholder="e.g. C-Arm requested, latex allergy, prone position, intra-op frozen section"></textarea>
                        </div>

                    </div>
                </div>
                <div class="or-modal-footer">
                    <button type="button" class="or-btn-secondary" id="orCancelBookBtn">Cancel</button>
                    <button type="submit" class="or-btn-primary" id="orSubmitBookBtn">Confirm &amp; Schedule Case</button>
                </div>
            </form>
        </div>
    </div>

    <!-- =========================================================
         MODAL 2: QUICK STAGE TRANSITION MODAL
         ========================================================= -->
    <div class="or-modal-overlay" id="orStageModal">
        <div class="or-modal-box" style="max-width: 520px;">
            <div class="or-modal-header">
                <h3>&#9889; Advance Perioperative Stage</h3>
                <button type="button" class="or-modal-close-x" id="orCloseStageModal">&times;</button>
            </div>
            <form id="orStageForm">
                <input type="hidden" id="orStageCaseId" />
                <div class="or-modal-body">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;" id="orStageCaseHeader">
                        <div style="font-size: 11px; color: #64748b; font-family: monospace;" id="orStageCaseNumber">OR-XXXX-XXXX</div>
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a;" id="orStagePatient">Patient Name</div>
                        <div style="font-size: 12px; color: #334155; margin-top: 2px;" id="orStageProcedure">Procedure</div>
                    </div>

                    <div class="or-form-group" style="margin-bottom: 16px;">
                        <label style="font-weight: 700; font-size: 13px;">New Perioperative Stage *</label>
                        <select id="orStageSelect" class="or-select" style="font-size: 13px; padding: 8px 12px;" required>
                            <option value="Pre-Op Holding">&#9203; Pre-Op Holding (Site Marked, Consented)</option>
                            <option value="In Room / Induction">&#128682; In Room / Anesthesia Induction</option>
                            <option value="Incision / In Progress">&#128298; Incision / In Progress (Time-Out Done)</option>
                            <option value="Closing / Extubation">&#129527; Closing / Extubation (Counts Complete)</option>
                            <option value="In PACU">&#128716; In PACU (Transferred to Recovery)</option>
                            <option value="Transferred / Discharged">&#10003; Transferred to Ward / Discharged</option>
                            <option value="Cancelled">&#10060; Cancelled</option>
                        </select>
                    </div>

                    <!-- Stage Specific Fields: PACU -->
                    <div id="orStagePacuFields" style="display: none; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
                        <div class="or-form-group" style="margin-bottom: 8px;">
                            <label>PACU Bed Number</label>
                            <input type="text" id="orStagePacuBed" placeholder="e.g. PACU-03" value="PACU-01" />
                        </div>
                        <div class="or-form-group" style="margin-bottom: 8px;">
                            <label>Estimated Blood Loss (mL)</label>
                            <input type="number" id="orStageEbl" placeholder="e.g. 100" />
                        </div>
                        <div class="or-form-group">
                            <label>Confirmed Post-Op Diagnosis</label>
                            <input type="text" id="orStagePostopDiag" placeholder="Confirmed post-op diagnosis" />
                        </div>
                    </div>

                    <!-- Stage Specific Fields: Discharged -->
                    <div id="orStageDischargeFields" style="display: none; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
                        <div class="or-form-group" style="margin-bottom: 8px;">
                            <label>PACU Discharge Aldrete Score (0 - 10) *</label>
                            <input type="number" id="orStageAldrete" min="0" max="10" value="9" />
                        </div>
                        <div class="or-form-group">
                            <label>Post-Op Disposition Destination</label>
                            <select id="orStageDisposition">
                                <option value="Surgical Inpatient Ward">Surgical Inpatient Ward</option>
                                <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                                <option value="Outpatient Same-Day Discharge">Outpatient Same-Day Discharge</option>
                            </select>
                        </div>
                    </div>

                    <!-- Stage Specific Fields: Cancelled -->
                    <div id="orStageCancelFields" style="display: none; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
                        <div class="or-form-group">
                            <label style="color: #991b1b;">Reason for Cancellation *</label>
                            <input type="text" id="orStageCancelReason" placeholder="e.g. Patient acute illness, fever, consent withdrawn" />
                        </div>
                    </div>

                </div>
                <div class="or-modal-footer">
                    <button type="button" class="or-btn-secondary" id="orCancelStageBtn">Cancel</button>
                    <button type="submit" class="or-btn-primary" id="orSubmitStageBtn">Update Stage</button>
                </div>
            </form>
        </div>
    </div>

    <!-- =========================================================
         MODAL 3: CASE DETAILS & PACU RECORD MODAL
         ========================================================= -->
    <div class="or-modal-overlay" id="orDetailModal">
        <div class="or-modal-box">
            <div class="or-modal-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span id="orDCaseNumber" style="font-family: monospace; font-size: 17px; font-weight: 700; color: #38bdf8;">OR-XXXX-XXXX</span>
                    <span id="orDStageBadge" class="or-badge-stage">Stage</span>
                </div>
                <button type="button" class="or-modal-close-x" id="orCloseDetailModal">&times;</button>
            </div>
            <div class="or-modal-body">
                <!-- Patient Bar -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;" id="orDPatientBar">
                    <div>
                        <div style="font-size: 15px; font-weight: 700; color: #0f172a;" id="orDPatientName">Patient Name</div>
                        <div style="font-size: 12px; color: #64748b;" id="orDPatientDetails">MRN &bull; Age/Sex</div>
                    </div>
                    <div id="orDPatientChartLink"></div>
                </div>

                <!-- Case Summary Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; font-size: 12px;">
                    <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <strong style="color: #64748b; display: block; font-size: 11px;">PROCEDURE</strong>
                        <span id="orDProcedure" style="font-weight: 700; font-size: 13px; color: #0f172a;">--</span>
                    </div>
                    <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <strong style="color: #64748b; display: block; font-size: 11px;">OR SUITE &amp; SPECIALTY</strong>
                        <span id="orDSuiteSpecialty" style="font-weight: 600;">--</span>
                    </div>
                    <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <strong style="color: #64748b; display: block; font-size: 11px;">LEAD SURGEON</strong>
                        <span id="orDSurgeon" style="font-weight: 600;">--</span>
                    </div>
                    <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <strong style="color: #64748b; display: block; font-size: 11px;">ANESTHESIA</strong>
                        <span id="orDAnesthesia" style="font-weight: 600;">--</span>
                    </div>
                </div>

                <!-- Perioperative Milestones Timeline -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; margin-bottom: 10px;">
                        &#9201; Perioperative Milestones Timeline
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; font-size: 11px; text-align: center;">
                        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <div style="color: #64748b; font-weight: 600;">Scheduled Start</div>
                            <div id="orDTimeScheduled" style="font-weight: 700; color: #0f172a; margin-top: 3px;">--</div>
                        </div>
                        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <div style="color: #64748b; font-weight: 600;">In Room / Induction</div>
                            <div id="orDTimeInRoom" style="font-weight: 700; color: #0284c7; margin-top: 3px;">--</div>
                        </div>
                        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <div style="color: #64748b; font-weight: 600;">Surgical Incision</div>
                            <div id="orDTimeIncision" style="font-weight: 700; color: #dc2626; margin-top: 3px;">--</div>
                        </div>
                        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <div style="color: #64748b; font-weight: 600;">Closing / Extubation</div>
                            <div id="orDTimeClosing" style="font-weight: 700; color: #0f172a; margin-top: 3px;">--</div>
                        </div>
                        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <div style="color: #64748b; font-weight: 600;">Out of OR &rarr; PACU</div>
                            <div id="orDTimeOutRoom" style="font-weight: 700; color: #7c3aed; margin-top: 3px;">--</div>
                        </div>
                    </div>
                </div>

                <!-- PACU Recovery Section -->
                <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 14px; margin-bottom: 16px;" id="orDPacuSection">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #7c3aed; margin-bottom: 8px;">
                        &#128716; Post-Anesthesia Care Unit (PACU) Recovery Record
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; font-size: 12px;">
                        <div><strong>PACU Bed:</strong> <span id="orDPacuBed">--</span></div>
                        <div><strong>Aldrete Discharge Score:</strong> <span id="orDAldrete">-- / 10</span></div>
                        <div><strong>Estimated Blood Loss:</strong> <span id="orDEbl">-- mL</span></div>
                        <div><strong>Post-Op Disposition:</strong> <span id="orDDisposition">--</span></div>
                    </div>
                </div>

                <!-- Surgical Safety Checklist Link -->
                <div id="orDSafetyChecklistLink" style="margin-bottom: 14px;"></div>

                <!-- Clinical Notes -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px;">
                    <strong style="color: #64748b; font-size: 11px; display: block; margin-bottom: 4px;">NOTES / OBSERVATIONS</strong>
                    <p id="orDNotes" style="margin: 0; color: #334155; white-space: pre-wrap;">None documented.</p>
                </div>
            </div>
            <div class="or-modal-footer">
                <button type="button" class="or-btn-secondary" id="orCloseDetailBtn">Close</button>
            </div>
        </div>
    </div>

    <!-- =========================================================
         MODAL 4: OR SUITE STATUS & TURNOVER MODAL
         ========================================================= -->
    <div class="or-modal-overlay" id="orSuiteModal">
        <div class="or-modal-box" style="max-width: 600px;">
            <div class="or-modal-header">
                <h3>&#9881; OR Suites Status &amp; Turnover Management</h3>
                <button type="button" class="or-modal-close-x" id="orCloseSuiteModal">&times;</button>
            </div>
            <div class="or-modal-body">
                <p style="font-size: 12px; color: #64748b; margin: 0 0 16px;">
                    Set room status to trigger environmental cleaning, turnover timers, or maintenance holds.
                </p>
                <div id="orSuiteStatusList" style="display: flex; flex-direction: column; gap: 12px;">
                    <!-- Populated dynamically -->
                </div>
            </div>
            <div class="or-modal-footer">
                <button type="button" class="or-btn-secondary" id="orCloseSuiteBtn">Done</button>
            </div>
        </div>
    </div>
    `;
}
