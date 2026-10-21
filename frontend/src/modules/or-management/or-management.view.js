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
                transition: all 0.2s ease;
            }

            /* Fullscreen Theater Mode */
            .or-wrapper.or-fullscreen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 9999;
                padding: 20px;
                overflow-y: auto;
                background: #0f172a;
                color: #f1f5f9;
            }

            /* Top Announcement / Clinical Command Banner */
            .or-command-strip {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #fff;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
            }
            .or-command-strip-left {
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 600;
                letter-spacing: 0.3px;
            }
            .or-live-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.4);
                color: #fca5a5;
                padding: 2px 8px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .or-pulse-dot {
                width: 8px;
                height: 8px;
                background: #ef4444;
                border-radius: 50%;
                animation: orPulse 1.4s infinite;
            }
            @keyframes orPulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8); }
                70% { transform: scale(1.1); box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .or-command-strip-right {
                display: flex;
                align-items: center;
                gap: 16px;
                font-family: monospace;
                color: #94a3b8;
            }
            .or-digital-clock {
                color: #38bdf8;
                font-weight: 700;
                font-size: 13px;
            }

            /* Main Header */
            .or-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e2e8f0;
            }
            .or-header-left h1 {
                font-size: 22px;
                font-weight: 800;
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

            /* Date Navigator */
            .or-date-nav {
                display: flex;
                align-items: center;
                background: #fff;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 2px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            }
            .or-date-nav-btn {
                background: none;
                border: none;
                color: #475569;
                padding: 6px 10px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: background 0.15s;
            }
            .or-date-nav-btn:hover {
                background: #f1f5f9;
                color: #0f172a;
            }
            .or-date-input {
                border: none;
                font-size: 13px;
                font-weight: 600;
                color: #0f172a;
                padding: 6px 8px;
                outline: none;
                cursor: pointer;
            }

            /* Action Buttons */
            .or-btn-primary {
                background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                color: #fff;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 7px;
                box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
                transition: all 0.15s ease;
            }
            .or-btn-primary:hover {
                background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(2, 132, 199, 0.35);
            }
            .or-btn-secondary {
                background: #fff;
                color: #334155;
                border: 1px solid #cbd5e1;
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
                transition: all 0.15s;
            }
            .or-btn-secondary:hover {
                background: #f8fafc;
                border-color: #94a3b8;
                transform: translateY(-1px);
            }

            /* KPI Cards Grid */
            .or-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 14px;
                margin-bottom: 24px;
            }
            .or-kpi-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 16px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                transition: transform 0.15s, box-shadow 0.15s;
            }
            .or-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.08);
            }
            .or-kpi-card::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
            }
            .or-kpi-card.blue::before { background: linear-gradient(90deg, #0284c7, #38bdf8); }
            .or-kpi-card.red::before { background: linear-gradient(90deg, #ef4444, #f87171); }
            .or-kpi-card.purple::before { background: linear-gradient(90deg, #8b5cf6, #c084fc); }
            .or-kpi-card.green::before { background: linear-gradient(90deg, #10b981, #34d399); }
            .or-kpi-card.amber::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

            .or-kpi-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .or-kpi-label {
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .or-kpi-icon {
                font-size: 16px;
                opacity: 0.8;
            }
            .or-kpi-value {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.1;
                margin-bottom: 4px;
            }
            .or-kpi-sub {
                font-size: 11px;
                color: #94a3b8;
                font-weight: 500;
            }

            /* OR Suite Live Status Grid */
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
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                color: #334155;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .or-suites-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
                gap: 16px;
            }
            .or-suite-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                transition: transform 0.15s, box-shadow 0.15s;
            }
            .or-suite-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px -2px rgba(0, 0, 0, 0.08);
            }
            .or-suite-card::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
            }
            .or-suite-card.status-in-surgery::before {
                background: linear-gradient(90deg, #ef4444, #dc2626);
                animation: orPulseBorder 2s infinite;
            }
            @keyframes orPulseBorder {
                0% { opacity: 0.8; }
                50% { opacity: 1; filter: brightness(1.2); }
                100% { opacity: 0.8; }
            }
            .or-suite-card.status-turnover::before {
                background: linear-gradient(90deg, #f59e0b, #d97706);
            }
            .or-suite-card.status-available::before {
                background: linear-gradient(90deg, #10b981, #059669);
            }
            .or-suite-card.status-maintenance::before {
                background: #94a3b8;
            }

            .or-suite-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 10px;
            }
            .or-suite-code {
                font-size: 11px;
                font-weight: 800;
                color: #0284c7;
                background: #e0f2fe;
                padding: 2px 7px;
                border-radius: 5px;
                display: inline-block;
                margin-bottom: 4px;
            }
            .or-suite-name {
                font-size: 15px;
                font-weight: 700;
                color: #0f172a;
                margin: 0 0 2px;
            }
            .or-suite-floor {
                font-size: 11px;
                color: #64748b;
            }

            .or-suite-status-badge {
                font-size: 11px;
                font-weight: 700;
                padding: 4px 9px;
                border-radius: 12px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                white-space: nowrap;
            }
            .or-suite-status-badge.in-surgery {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fca5a5;
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

            /* Suite Active Case Callout Box */
            .or-suite-active-box {
                margin: 10px 0;
                padding: 10px 12px;
                border-radius: 8px;
                font-size: 12px;
                position: relative;
            }
            .or-suite-active-box.surgery {
                background: #fff5f5;
                border: 1px solid #fecaca;
                border-left: 4px solid #ef4444;
            }
            .or-suite-active-box.turnover {
                background: #fffbeb;
                border: 1px solid #fef3c7;
                border-left: 4px solid #f59e0b;
            }
            .or-suite-active-box.available {
                background: #f0fdf4;
                border: 1px solid #dcfce7;
                border-left: 4px solid #10b981;
            }
            .or-suite-active-box.maintenance {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-left: 4px solid #64748b;
            }

            .or-suite-progress-track {
                height: 5px;
                background: #e2e8f0;
                border-radius: 3px;
                overflow: hidden;
                margin: 8px 0 4px;
            }
            .or-suite-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #ef4444, #f87171);
                border-radius: 3px;
                transition: width 0.3s;
            }

            .or-suite-next-box {
                font-size: 11px;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 5px;
                margin-top: 6px;
                padding-top: 6px;
                border-top: 1px dashed #e2e8f0;
            }

            /* Controls & Filters Bar */
            .or-controls-bar {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 12px 16px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
            }
            .or-filters-group {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                flex: 1;
            }
            .or-input, .or-select {
                padding: 7px 11px;
                border: 1px solid #cbd5e1;
                border-radius: 7px;
                font-size: 12px;
                background: #fff;
                color: #1e293b;
                outline: none;
                transition: border-color 0.15s, box-shadow 0.15s;
            }
            .or-input:focus, .or-select:focus {
                border-color: #0284c7;
                box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
            }
            .or-search-wrap {
                position: relative;
                flex: 1;
                min-width: 220px;
            }
            .or-search-wrap input {
                width: 100%;
                padding-left: 28px;
                padding-right: 26px;
                box-sizing: border-box;
            }
            .or-search-icon {
                position: absolute;
                left: 9px;
                top: 50%;
                transform: translateY(-50%);
                color: #94a3b8;
                font-size: 12px;
                pointer-events: none;
            }
            .or-search-clear {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #94a3b8;
                font-size: 13px;
                cursor: pointer;
                display: none;
            }
            .or-search-clear:hover { color: #0f172a; }

            /* View Switcher */
            .or-view-switcher {
                display: flex;
                background: #f1f5f9;
                padding: 3px;
                border-radius: 8px;
                gap: 3px;
            }
            .or-view-btn {
                border: none;
                background: none;
                padding: 6px 14px;
                font-size: 12px;
                font-weight: 700;
                color: #64748b;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .or-view-btn.active {
                background: #fff;
                color: #0284c7;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            }

            /* Live Whiteboard Flowboard (Kanban) */
            .or-whiteboard {
                display: grid;
                grid-template-columns: repeat(6, minmax(250px, 1fr));
                gap: 14px;
                overflow-x: auto;
                padding-bottom: 16px;
            }
            .or-column {
                background: #f8fafc;
                border-radius: 10px;
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                min-height: 440px;
                max-height: 75vh;
            }
            .or-column-header {
                padding: 10px 14px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top-left-radius: 9px;
                border-top-right-radius: 9px;
                font-weight: 700;
                font-size: 12px;
            }
            .or-column-header.c-sched { background: #f1f5f9; color: #334155; }
            .or-column-header.c-preop { background: #fef3c7; color: #92400e; }
            .or-column-header.c-inroom { background: #e0f2fe; color: #0369a1; }
            .or-column-header.c-incision { background: #fee2e2; color: #991b1b; }
            .or-column-header.c-pacu { background: #f3e8ff; color: #6b21a8; }
            .or-column-header.c-done { background: #dcfce7; color: #166534; }

            .or-column-title {
                display: flex;
                align-items: center;
                gap: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .or-column-count {
                background: #fff;
                font-size: 11px;
                font-weight: 800;
                padding: 1px 7px;
                border-radius: 12px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            }
            .or-column-cards {
                padding: 10px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
                flex: 1;
            }

            /* Case Card Inside Kanban */
            .or-case-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                transition: transform 0.12s, box-shadow 0.12s;
                position: relative;
            }
            .or-case-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.08);
            }
            .or-case-card.priority-emergency {
                border-left: 4px solid #ef4444;
            }
            .or-case-card.priority-urgent {
                border-left: 4px solid #f59e0b;
            }
            .or-case-card.priority-elective {
                border-left: 4px solid #0284c7;
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

            /* Patient Info in Card with Avatar Pill */
            .or-card-patient-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
            }
            .or-avatar-pill {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                background: linear-gradient(135deg, #0284c7, #38bdf8);
                color: #fff;
                font-size: 10px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .or-card-patient-name {
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
                line-height: 1.2;
            }
            .or-card-patient-meta {
                font-size: 10px;
                color: #64748b;
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
                color: #475569;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .or-card-chips {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }
            .or-chip {
                font-size: 10px;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 4px;
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }
            .or-chip-green { background: #dcfce7; color: #166534; }
            .or-chip-amber { background: #fef3c7; color: #92400e; }
            .or-chip-red   { background: #fee2e2; color: #991b1b; }
            .or-chip-blue  { background: #e0f2fe; color: #0369a1; }
            .or-chip-purple{ background: #f3e8ff; color: #6b21a8; }

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
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.15s;
            }
            .or-btn-advance:hover { background: #0369a1; }
            .or-btn-view {
                background: #f8fafc;
                color: #475569;
                border: 1px solid #cbd5e1;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
            }
            .or-btn-view:hover { background: #f1f5f9; color: #0f172a; }

            /* Detailed Schedule Table */
            .or-table-wrapper {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow-x: auto;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
            }
            .or-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                text-align: left;
            }
            .or-table thead tr {
                background: #f8fafc;
                border-bottom: 2px solid #e2e8f0;
            }
            .or-table th {
                padding: 12px 14px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-size: 11px;
            }
            .or-table td {
                padding: 12px 14px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .or-table tbody tr:hover {
                background: #f8fafc;
            }

            /* Stepper Dots for Milestones in Table */
            .or-stepper-dots {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-top: 4px;
            }
            .or-stepper-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #cbd5e1;
            }
            .or-stepper-dot.active {
                background: #0284c7;
            }
            .or-stepper-dot.done {
                background: #10b981;
            }

            /* Modals Overlays & Box */
            .or-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.65);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: none;
                justify-content: center;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
                animation: orFadeIn 0.15s ease-out;
            }
            @keyframes orFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .or-modal-box {
                background: #fff;
                border-radius: 12px;
                width: 100%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                overflow: hidden;
            }
            .or-modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            }
            .or-modal-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .or-modal-close-x {
                background: none;
                border: none;
                font-size: 20px;
                color: #94a3b8;
                cursor: pointer;
                padding: 0 4px;
                border-radius: 4px;
            }
            .or-modal-close-x:hover { color: #0f172a; background: #e2e8f0; }
            .or-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            .or-modal-footer {
                padding: 14px 20px;
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }

            /* Form Layout in Modals */
            .or-form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
            }
            .or-form-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .or-form-group.full-width {
                grid-column: 1 / -1;
            }
            .or-form-group label {
                font-size: 11px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }
            .or-form-group input,
            .or-form-group select,
            .or-form-group textarea {
                padding: 8px 11px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13px;
                color: #1e293b;
                outline: none;
                transition: border-color 0.15s, box-shadow 0.15s;
            }
            .or-form-group input:focus,
            .or-form-group select:focus,
            .or-form-group textarea:focus {
                border-color: #0284c7;
                box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
            }
            .or-section-divider {
                grid-column: 1 / -1;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                color: #0284c7;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 4px;
                margin-top: 10px;
            }

            /* =========================================================
               DARK MODE COMPLIANCE (:root[data-theme="dark"])
               ========================================================= */
            :root[data-theme="dark"] .or-wrapper {
                background: #090d16 !important;
                color: #e2e8f0 !important;
            }
            :root[data-theme="dark"] .or-header {
                border-bottom-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-header-left h1 {
                color: #f8fafc !important;
            }
            :root[data-theme="dark"] .or-section-title {
                color: #cbd5e1 !important;
            }
            :root[data-theme="dark"] .or-date-nav,
            :root[data-theme="dark"] .or-suite-card,
            :root[data-theme="dark"] .or-kpi-card,
            :root[data-theme="dark"] .or-controls-bar,
            :root[data-theme="dark"] .or-table-wrapper {
                background-color: #0f172a !important;
                border-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-date-input {
                background-color: transparent !important;
                color: #f1f5f9 !important;
            }
            :root[data-theme="dark"] .or-date-nav-btn {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-date-nav-btn:hover {
                background-color: #1e293b !important;
                color: #f8fafc !important;
            }
            :root[data-theme="dark"] .or-kpi-value,
            :root[data-theme="dark"] .or-suite-name,
            :root[data-theme="dark"] .or-card-patient-name {
                color: #f8fafc !important;
            }
            :root[data-theme="dark"] .or-input,
            :root[data-theme="dark"] .or-select {
                background-color: #1e293b !important;
                border-color: #334155 !important;
                color: #f8fafc !important;
            }
            :root[data-theme="dark"] .or-view-switcher {
                background-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-view-btn {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-view-btn.active {
                background-color: #0f172a !important;
                color: #38bdf8 !important;
            }
            :root[data-theme="dark"] .or-column {
                background-color: #0b1120 !important;
                border-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-column-header.c-sched { background: #1e293b !important; color: #cbd5e1 !important; }
            :root[data-theme="dark"] .or-column-header.c-preop { background: #291e0a !important; color: #fde68a !important; }
            :root[data-theme="dark"] .or-column-header.c-inroom { background: #0c2738 !important; color: #7dd3fc !important; }
            :root[data-theme="dark"] .or-column-header.c-incision { background: #3b1212 !important; color: #fca5a5 !important; }
            :root[data-theme="dark"] .or-column-header.c-pacu { background: #28103d !important; color: #d8b4fe !important; }
            :root[data-theme="dark"] .or-column-header.c-done { background: #062b19 !important; color: #86efac !important; }
            :root[data-theme="dark"] .or-column-count {
                background-color: #1e293b !important;
                color: #f8fafc !important;
            }
            :root[data-theme="dark"] .or-case-card {
                background-color: #0f172a !important;
                border-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-card-proc {
                color: #e2e8f0 !important;
            }
            :root[data-theme="dark"] .or-card-actions {
                border-top-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-btn-view {
                background-color: #1e293b !important;
                color: #cbd5e1 !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-btn-view:hover {
                background-color: #334155 !important;
                color: #fff !important;
            }
            :root[data-theme="dark"] .or-table thead tr {
                background-color: #0f172a !important;
                border-bottom-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-table th {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-table td {
                color: #cbd5e1 !important;
                border-bottom-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-table tbody tr:hover {
                background-color: #1e293b !important;
            }
            :root[data-theme="dark"] .or-modal-box {
                background-color: #0f172a !important;
                border: 1px solid #334155 !important;
            }
            :root[data-theme="dark"] .or-modal-header,
            :root[data-theme="dark"] .or-modal-footer {
                background-color: #1e293b !important;
                border-color: #334155 !important;
            }
            :root[data-theme="dark"] .or-modal-header h3 {
                color: #f8fafc !important;
            }
            :root[data-theme="dark"] .or-form-group label {
                color: #94a3b8 !important;
            }
            :root[data-theme="dark"] .or-form-group input,
            :root[data-theme="dark"] .or-form-group select,
            :root[data-theme="dark"] .or-form-group textarea {
                background-color: #1e293b !important;
                border-color: #334155 !important;
                color: #f8fafc !important;
            }
            :root[data-theme="dark"] .or-suite-active-box.surgery {
                background-color: #2b1111 !important;
                border-color: #451a1a !important;
            }
            :root[data-theme="dark"] .or-suite-active-box.turnover {
                background-color: #261b0a !important;
                border-color: #452b0a !important;
            }
            :root[data-theme="dark"] .or-suite-active-box.available {
                background-color: #0b2216 !important;
                border-color: #0f3d24 !important;
            }
            :root[data-theme="dark"] .or-btn-secondary {
                background-color: #1e293b !important;
                border-color: #334155 !important;
                color: #e2e8f0 !important;
            }
            :root[data-theme="dark"] .or-btn-secondary:hover {
                background-color: #334155 !important;
            }

            @media print {
                .or-command-strip, .or-header-actions, .or-controls-bar, .or-modal-overlay, .sidebar, .top-navbar { display: none !important; }
                .or-wrapper { padding: 0 !important; background: #fff !important; }
                .or-suite-card, .or-kpi-card, .or-table-wrapper { box-shadow: none !important; border: 1px solid #ccc !important; }
            }
        .or-ferr { display: block; font-size: 11.5px; color: #dc2626; margin-top: 3px; }
.or-ferr:empty { display: none; }
.or-fhint { display: block; font-size: 11.5px; color: #64748b; margin-top: 3px; }
.or-fhints { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; }
.or-form-group.has-error input, .or-form-group.has-error select { border-color: #dc2626 !important; }
.or-falert { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; border-radius: 8px; padding: 9px 12px; font-size: 12.5px; margin-bottom: 10px; }
:root[data-theme="dark"] .or-ferr { color: #fca5a5; }
:root[data-theme="dark"] .or-fhints { background: rgba(59,130,246,.12); border-color: rgba(59,130,246,.4); color: #bfdbfe; }
:root[data-theme="dark"] .or-falert { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.45); color: #fecaca; }
</style>

        <!-- Top Command Strip / Live Operational Ribbon -->
        <div class="or-command-strip">
            <div class="or-command-strip-left">
                <div class="or-live-badge">
                    <span class="or-pulse-dot"></span>
                    <span>LIVE SURGICAL BOARD</span>
                </div>
                <span style="color: #cbd5e1; font-weight: 400;">Perioperative Command &amp; Room Turnover Center</span>
            </div>
            <div class="or-command-strip-right">
                <span id="orLiveDateStr">Loading date...</span>
                <span class="or-digital-clock" id="orLiveClock">--:--:--</span>
                <span style="font-size: 11px; background: #334155; padding: 2px 6px; border-radius: 4px; color: #38bdf8;">SYNC: 30s</span>
            </div>
        </div>

        <!-- Header -->
        <div class="or-header">
            <div class="or-header-left">
                <h1>
                    <span style="color: #0284c7;">&#127973;</span>
                    Operating Room (OR) Management
                </h1>
                <p>Real-Time Perioperative Suite Allocation, Whiteboard Flowboard &amp; Milestone Analytics</p>
            </div>
            <div class="or-header-actions">
                <!-- Date Quick Navigator -->
                <div class="or-date-nav">
                    <button type="button" class="or-date-nav-btn" id="orDatePrevBtn" title="Previous Day">&#9664;</button>
                    <input type="date" id="orFilterDate" class="or-date-input" />
                    <button type="button" class="or-date-nav-btn" id="orDateTodayBtn" title="Today">Today</button>
                    <button type="button" class="or-date-nav-btn" id="orDateNextBtn" title="Next Day">&#9654;</button>
                </div>

                <button type="button" class="or-btn-primary" id="orBookCaseBtn">
                    <span>+</span> Book Surgical Case
                </button>
                <button type="button" class="or-btn-secondary" id="orRegisterSuiteBtn" style="border-color: #0d9488; color: #0f766e;">
                    <span>&#127973;</span> Register OR Suite
                </button>
                <button type="button" class="or-btn-secondary" id="orSuiteStatusBtn">
                    <span>&#9881;</span> Room Status
                </button>
                <button type="button" class="or-btn-secondary" id="orFullscreenBtn" title="Toggle Fullscreen Theater Mode">
                    <span>&#x26F6;</span> Theater Mode
                </button>
                <button type="button" class="or-btn-secondary" id="orPrintBtn" title="Print Schedule">
                    <span>&#128438;</span> Print
                </button>
            </div>
        </div>

        <!-- KPI Metrics Summary Cards -->
        <div class="or-kpi-grid">
            <div class="or-kpi-card blue">
                <div class="or-kpi-header">
                    <span class="or-kpi-label">Total Cases Today</span>
                    <span class="or-kpi-icon">&#128197;</span>
                </div>
                <div class="or-kpi-value" id="orKpiTotalCases">--</div>
                <div class="or-kpi-sub" id="orKpiElectiveCount">-- elective booked</div>
            </div>
            <div class="or-kpi-card red">
                <div class="or-kpi-header">
                    <span class="or-kpi-label">Active in Surgery</span>
                    <span class="or-kpi-icon" style="color: #ef4444;">&#9889;</span>
                </div>
                <div class="or-kpi-value" id="orKpiInProgress" style="color: #dc2626;">--</div>
                <div class="or-kpi-sub">currently in OR suites</div>
            </div>
            <div class="or-kpi-card purple">
                <div class="or-kpi-header">
                    <span class="or-kpi-label">In PACU Recovery</span>
                    <span class="or-kpi-icon" style="color: #8b5cf6;">&#128716;</span>
                </div>
                <div class="or-kpi-value" id="orKpiInPacu" style="color: #7c3aed;">--</div>
                <div class="or-kpi-sub">post-anesthesia recovery</div>
            </div>
            <div class="or-kpi-card green">
                <div class="or-kpi-header">
                    <span class="or-kpi-label">OR Utilization Rate</span>
                    <span class="or-kpi-icon" style="color: #10b981;">&#9685;</span>
                </div>
                <div class="or-kpi-value" id="orKpiUtilization" style="color: #059669;">--%</div>
                <div class="or-kpi-sub">operational hours capacity</div>
            </div>
            <div class="or-kpi-card amber">
                <div class="or-kpi-header">
                    <span class="or-kpi-label">Avg Turnover Time</span>
                    <span class="or-kpi-icon" style="color: #f59e0b;">&#9201;</span>
                </div>
                <div class="or-kpi-value" id="orKpiTurnover">-- min</div>
                <div class="or-kpi-sub">target: &lt; 30 min</div>
            </div>
            <div class="or-kpi-card red">
                <div class="or-kpi-header">
                    <span class="or-kpi-label">Urgent / Emergency</span>
                    <span class="or-kpi-icon" style="color: #ef4444;">&#128680;</span>
                </div>
                <div class="or-kpi-value" id="orKpiUrgent">--</div>
                <div class="or-kpi-sub">priority expedited cases</div>
            </div>
        </div>

        <!-- Live OR Suites Status Cards Grid -->
        <div class="or-suites-section">
            <div class="or-section-header">
                <div class="or-section-title">
                    <span style="color: #0284c7;">&#128716;</span>
                    Operating Room Suites &mdash; Live Status &amp; Turnover
                </div>
                <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                    <span class="or-pulse-dot" style="width: 6px; height: 6px;"></span>
                    <span>Live room sensors active</span>
                </div>
            </div>
            <div class="or-suites-grid" id="orSuitesGrid">
                <div style="padding: 30px; text-align: center; color: #64748b; font-style: italic; grid-column: 1 / -1;">
                    Loading Operating Room Suites...
                </div>
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
                
                <div class="or-search-wrap">
                    <span class="or-search-icon">&#128269;</span>
                    <input type="text" id="orSearchInput" class="or-input" placeholder="Search case #, patient, surgeon, procedure..." />
                    <button type="button" id="orSearchClearBtn" class="or-search-clear" title="Clear search">&times;</button>
                </div>

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
                    <div class="or-column-header c-sched">
                        <span class="or-column-title">&#128197; 1. Scheduled</span>
                        <span class="or-column-count" id="orCountScheduled">0</span>
                    </div>
                    <div class="or-column-cards" id="orColScheduled"></div>
                </div>

                <!-- Column 2: Pre-Op Holding -->
                <div class="or-column" data-stage="Pre-Op Holding">
                    <div class="or-column-header c-preop">
                        <span class="or-column-title">&#9203; 2. Pre-Op Prep</span>
                        <span class="or-column-count" id="orCountPreOp">0</span>
                    </div>
                    <div class="or-column-cards" id="orColPreOp"></div>
                </div>

                <!-- Column 3: In Room / Induction -->
                <div class="or-column" data-stage="In Room / Induction">
                    <div class="or-column-header c-inroom">
                        <span class="or-column-title">&#128682; 3. In Room / Anes</span>
                        <span class="or-column-count" id="orCountInRoom">0</span>
                    </div>
                    <div class="or-column-cards" id="orColInRoom"></div>
                </div>

                <!-- Column 4: Incision / In Progress -->
                <div class="or-column" data-stage="Incision / In Progress">
                    <div class="or-column-header c-incision">
                        <span class="or-column-title" style="color: #991b1b;">&#128298; 4. Incision / OR</span>
                        <span class="or-column-count" id="orCountIncision" style="background: #ef4444; color: #fff;">0</span>
                    </div>
                    <div class="or-column-cards" id="orColIncision"></div>
                </div>

                <!-- Column 5: In PACU Recovery -->
                <div class="or-column" data-stage="In PACU">
                    <div class="or-column-header c-pacu">
                        <span class="or-column-title" style="color: #6b21a8;">&#128716; 5. In PACU</span>
                        <span class="or-column-count" id="orCountPACU">0</span>
                    </div>
                    <div class="or-column-cards" id="orColPACU"></div>
                </div>

                <!-- Column 6: Transferred / Done -->
                <div class="or-column" data-stage="Transferred / Discharged">
                    <div class="or-column-header c-done">
                        <span class="or-column-title" style="color: #166534;">&#10003; 6. Transferred / Done</span>
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
                            <th>Perioperative Progress</th>
                            <th>Readiness</th>
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
                    <div id="orFAlert"></div>
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
                            <span class="or-ferr" data-err="patient_name"></span>
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
                            <span class="or-ferr" data-err="or_suite_id"></span>
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

                        <div class="or-section-divider">Procedure &amp; Surgical Team</div>

                        <div class="or-form-group">
                            <label>Specialization *</label>
                            <select id="orFSpecialty"><option value="">-- Loading... --</option></select>
                            <span class="or-ferr" data-err="specialization_id"></span>
                        </div>
                        <div class="or-form-group">
                            <label>Surgery *</label>
                            <select id="orFSurgery"><option value="">-- Choose the specialization first --</option></select>
                            <span class="or-ferr" data-err="surgery_id"></span>
                        </div>
                        <div class="or-form-group" id="orFProcedureWrap" hidden>
                            <label>Procedure (not in the list) *</label>
                            <input type="text" id="orFProcedure" placeholder="e.g. Exploratory laparotomy" />
                            <span class="or-ferr" data-err="procedure_name"></span>
                        </div>
                        <div class="or-form-group">
                            <label id="orFLateralityLabel">Side</label>
                            <select id="orFLaterality">
                                <option value="">Not applicable</option>
                                <option value="Left">Left</option>
                                <option value="Right">Right</option>
                                <option value="Bilateral">Bilateral (both)</option>
                            </select>
                            <span class="or-ferr" data-err="laterality"></span>
                        </div>
                        <div class="or-form-group full-width or-fhints" id="orFHints" hidden></div>
                        <div class="or-form-group full-width">
                            <label>Pre-Op Diagnosis</label>
                            <input type="text" id="orFPreopDiag" placeholder="e.g. Acute Cholecystitis with Cholelithiasis" />
                        </div>
                        <div class="or-form-group">
                            <label>Lead Surgeon *</label>
                            <select id="orFSurgeon"></select>
                            <span class="or-ferr" data-err="lead_surgeon_user_id"></span>
                        </div>
                        <div class="or-form-group">
                            <label>Assistant Surgeon</label>
                            <select id="orFAssistant"></select>
                            <span class="or-ferr" data-err="assistant_surgeon_user_id"></span>
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
                                <option value="Local">Local Anesthesia (by the surgeon)</option>
                            </select>
                            <span class="or-ferr" data-err="anesthesia_type"></span>
                        </div>
                        <div class="or-form-group">
                            <label id="orFAnesLabel">Anesthesiologist *</label>
                            <select id="orFAnesthesiologist"></select>
                            <span class="or-ferr" data-err="anesthesiologist_user_id"></span>
                        </div>
                        <div class="or-form-group full-width" id="orFOverrideWrap" hidden>
                            <label>Reason for choosing a doctor outside the specialization *</label>
                            <input type="text" id="orFOverrideReason" maxlength="255" placeholder="e.g. Emergency; covering for Dr. Cruz" />
                            <span class="or-fhint" id="orFOverrideWhy"></span>
                            <span class="or-ferr" data-err="team_override_reason"></span>
                        </div>
                        <div class="or-form-group">
                            <label>Scrub Nurse</label>
                            <select id="orFScrub"></select>
                            <span class="or-ferr" data-err="scrub_nurse_user_id"></span>
                        </div>
                        <div class="or-form-group">
                            <label>Circulating Nurse</label>
                            <select id="orFCirculator"></select>
                            <span class="or-ferr" data-err="circulating_nurse_user_id"></span>
                        </div>

                        <div class="or-section-divider">Pre-Operative Readiness Checks</div>

                        <div class="or-form-group full-width" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                                <input type="checkbox" id="orFPreopCleared" style="width: 16px; height: 16px; accent-color: #0284c7;" />
                                <span>Pre-Op Anesthesia Clearance Complete</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                                <input type="checkbox" id="orFConsentSigned" style="width: 16px; height: 16px; accent-color: #0284c7;" />
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
                    <span id="orDCaseNumber" style="font-family: monospace; font-size: 17px; font-weight: 700; color: #0284c7;">OR-XXXX-XXXX</span>
                    <span id="orDStageBadge" class="or-chip or-chip-blue">Stage</span>
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

                <!-- Electronic Anesthesia Record Summary -->
                <div id="orDAnesthesiaRecordSummary" style="margin-bottom: 14px;"></div>

                <!-- Clinical Notes -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px;">
                    <strong style="color: #64748b; font-size: 11px; display: block; margin-bottom: 4px;">NOTES / OBSERVATIONS</strong>
                    <p id="orDNotes" style="margin: 0; color: #334155; white-space: pre-wrap;">None documented.</p>
                </div>
            </div>
            <div class="or-modal-footer">
                <button type="button" class="or-btn-primary" id="orOpenAnesthesiaFromDetailBtn" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
                    &#128137; Electronic Anesthesia Record
                </button>
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

    <!-- =========================================================
         MODAL 5: REGISTER & CONFIGURE OPERATING ROOM SUITES
         ========================================================= -->
    <div class="or-modal-overlay" id="orRegisterSuiteModal">
        <div class="or-modal-box" style="max-width: 750px;">
            <div class="or-modal-header">
                <h3>&#127973; Operating Room Suite Master &amp; Registration</h3>
                <button type="button" class="or-modal-close-x" id="orCloseRegSuiteModal">&times;</button>
            </div>
            
            <!-- Modal Internal Tabs -->
            <div style="display: flex; gap: 8px; padding: 12px 20px 0; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <button type="button" id="orTabRegSuiteNew" class="or-view-btn active" style="padding: 8px 16px; border-radius: 6px 6px 0 0;">
                    + Register New OR Suite
                </button>
                <button type="button" id="orTabRegSuiteList" class="or-view-btn" style="padding: 8px 16px; border-radius: 6px 6px 0 0;">
                    &#9776; Registered Suites Directory (<span id="orRegSuitesCount">0</span>)
                </button>
            </div>

            <!-- Tab 1: Registration Form -->
            <div id="orPanelRegSuiteNew">
                <form id="orRegisterSuiteForm">
                    <input type="hidden" id="orRegEditSuiteId" value="" />
                    <div class="or-modal-body">
                        <div class="or-form-grid">
                            <div class="or-form-group">
                                <label>OR Suite Code *</label>
                                <input type="text" id="orRegSuiteCode" required placeholder="e.g. OR-07, HYBRID-01, PEDS-01" />
                            </div>
                            <div class="or-form-group">
                                <label>Suite Name *</label>
                                <input type="text" id="orRegSuiteName" required placeholder="e.g. Pediatric Surgery Suite 7" />
                            </div>
                            <div class="or-form-group">
                                <label>Suite Classification / Type *</label>
                                <select id="orRegSuiteType" required>
                                    <option value="Major OR">Major Operating Room (Inpatient)</option>
                                    <option value="Minor OR">Minor Procedure OR (Ambulatory)</option>
                                    <option value="Endoscopy">Endoscopy / Colonoscopy Suite</option>
                                    <option value="Hybrid OR">Hybrid Angio / Vascular OR</option>
                                    <option value="Cath Lab">Cardiac Catheterization Suite</option>
                                </select>
                            </div>
                            <div class="or-form-group">
                                <label>Floor &amp; Building Location *</label>
                                <input type="text" id="orRegFloorLocation" required value="3rd Floor - Surgical Tower" placeholder="e.g. 3rd Floor - West Wing" />
                            </div>
                            <div class="or-form-group">
                                <label>Initial Operational Status</label>
                                <select id="orRegInitialStatus">
                                    <option value="Available">Available (Ready for Surgery)</option>
                                    <option value="Cleaning / Turnover">Cleaning / Turnover</option>
                                    <option value="Maintenance">Maintenance Hold</option>
                                    <option value="Blocked">Blocked / Reserved</option>
                                </select>
                            </div>
                            <div class="or-form-group">
                                <label>Specialty Capabilities / Focus</label>
                                <input type="text" id="orRegCapabilities" placeholder="e.g. Pediatric Surgery, Neonatal, General" />
                            </div>
                            <div class="or-form-group full-width">
                                <label>Specialized Surgical Equipment &amp; Features</label>
                                <textarea id="orRegEquipment" rows="2" placeholder="e.g. C-Arm Fluoroscopy, 4K Laparoscopic Tower, Operating Microscope, DaVinci Robot, Ultrasonic Aspirator"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="or-modal-footer">
                        <button type="button" class="or-btn-secondary" id="orCancelRegSuiteBtn">Cancel</button>
                        <button type="submit" class="or-btn-primary" id="orSubmitRegSuiteBtn" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);">
                            Save &amp; Register OR Suite
                        </button>
                    </div>
                </form>
            </div>

            <!-- Tab 2: Registered Suites Directory -->
            <div id="orPanelRegSuiteList" style="display: none;">
                <div class="or-modal-body" style="padding: 16px 20px;">
                    <table class="or-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name &amp; Location</th>
                                <th>Type</th>
                                <th>Equipment Spec</th>
                                <th>Status</th>
                                <th style="text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="orRegSuitesTableBody">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
                <div class="or-modal-footer">
                    <button type="button" class="or-btn-secondary" id="orCloseRegSuiteListBtn">Close</button>
                </div>
            </div>

        </div>
    </div>

    <!-- =========================================================
         MODAL 6: ELECTRONIC ANESTHESIA RECORD WORKSPACE (or_anesthesia_records)
         ASA I-VI + E, Mallampati I-IV, Modality, Drugs, EBL & PACU Aldrete 0-10
         ========================================================= -->
    <div class="or-modal-overlay" id="orAnesthesiaModal">
        <div class="or-modal-box" style="max-width: 1040px; width: 96%;">
            <div class="or-modal-header" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #fff; border-bottom: 1px solid #4338ca;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span style="font-size: 20px;">&#128137;</span>
                    <div>
                        <h3 style="margin: 0; color: #fff; font-size: 16px; font-weight: 800;">
                            Electronic Anesthesia Record &amp; PACU Aldrete Scoring Workspace
                        </h3>
                        <div style="font-size: 11px; color: #c7d2fe; margin-top: 2px;" id="orAnesHeaderSubtitle">
                            Pre-Op ASA Physical Status (I&ndash;VI + E) &bull; Mallampati Airway (I&ndash;IV) &bull; Intra-Op Pharmacology &amp; Fluid/EBL &bull; PACU Aldrete Recovery (0&ndash;10)
                        </div>
                    </div>
                    <span id="orAnesRecordNumBadge" style="background: rgba(255,255,255,0.15); color: #e0e7ff; padding: 3px 10px; border-radius: 999px; font-family: monospace; font-size: 11px; font-weight: 700;">
                        NEW RECORD
                    </span>
                    <span id="orAnesStatusBadge" style="background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;">
                        Draft / Intra-Op
                    </span>
                </div>
                <button type="button" class="or-modal-close-x" id="orCloseAnesthesiaModal" style="color: #e0e7ff;">&times;</button>
            </div>

            <form id="orAnesthesiaForm">
                <input type="hidden" id="orAnesRecordId" value="" />
                <input type="hidden" id="orAnesSurgicalCaseId" value="" />
                <input type="hidden" id="orAnesPatientId" value="" />

                <div class="or-modal-body" style="max-height: 78vh; overflow-y: auto; padding: 18px 22px;">
                    <!-- Patient & Surgical Case Context Banner -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <div style="font-size: 14px; font-weight: 800; color: #0f172a;" id="orAnesPatientBanner">Patient Name (MRN)</div>
                            <div style="font-size: 12px; color: #475569; margin-top: 2px;" id="orAnesCaseBanner">Procedure &bull; OR Suite &bull; Lead Surgeon</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="font-size: 11px; font-weight: 700; color: #475569;">1-Click Protocol Preset:</span>
                            <button type="button" class="or-btn-secondary or-anes-preset-btn" data-preset="general_ett" style="padding: 4px 10px; font-size: 11px; background: #eef2ff; color: #3730a3; border-color: #c7d2fe;">
                                &#9889; General ETT
                            </button>
                            <button type="button" class="or-btn-secondary or-anes-preset-btn" data-preset="spinal_heavy" style="padding: 4px 10px; font-size: 11px; background: #f0fdf4; color: #166534; border-color: #bbf7d0;">
                                &#9889; Spinal 0.5% Heavy
                            </button>
                            <button type="button" class="or-btn-secondary or-anes-preset-btn" data-preset="epidural_cse" style="padding: 4px 10px; font-size: 11px; background: #ecfeff; color: #155e75; border-color: #a5f3fc;">
                                &#9889; Epidural / CSE
                            </button>
                            <button type="button" class="or-btn-secondary or-anes-preset-btn" data-preset="mac_sedation" style="padding: 4px 10px; font-size: 11px; background: #fffbeb; color: #92400e; border-color: #fde68a;">
                                &#9889; MAC Sedation
                            </button>
                        </div>
                    </div>

                    <!-- SECTION 1: ASA Physical Status (I-VI + E) & Mallampati Airway Classification (Class I-IV) -->
                    <div class="or-form-section-title" style="color: #4338ca; border-bottom-color: #e0e7ff;">
                        1. Pre-Anesthesia ASA Physical Status (I&ndash;VI + Emergency E) &amp; Mallampati Airway Classification (Class I&ndash;IV)
                    </div>
                    <div class="or-form-grid" style="margin-bottom: 18px;">
                        <div class="or-form-group">
                            <label>ASA Physical Status Classification *</label>
                            <select id="orAnesAsaStatus" required style="font-weight: 700;">
                                <option value="ASA I">ASA I &mdash; Normal healthy patient</option>
                                <option value="ASA II" selected>ASA II &mdash; Mild systemic disease (e.g. controlled HTN/DM)</option>
                                <option value="ASA III">ASA III &mdash; Severe systemic disease (substantive limitation)</option>
                                <option value="ASA IV">ASA IV &mdash; Severe systemic disease (constant threat to life)</option>
                                <option value="ASA V">ASA V &mdash; Moribund patient not expected to survive without surgery</option>
                                <option value="ASA VI">ASA VI &mdash; Declared brain-dead organ donor</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>ASA Emergency Modifier (&lsquo;E&rsquo;) &amp; Live Classification</label>
                            <div style="display: flex; align-items: center; gap: 12px; height: 38px; background: #f8fafc; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; font-weight: 700; color: #dc2626; font-size: 12px;">
                                    <input type="checkbox" id="orAnesAsaEmergency" style="width: 16px; height: 16px;" />
                                    Emergency Case (&lsquo;-E&rsquo; Suffix)
                                </label>
                                <span id="orAnesAsaLiveBadge" style="margin-left: auto; background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 999px; font-weight: 800; font-size: 12px;">
                                    ASA II
                                </span>
                            </div>
                        </div>
                        <div class="or-form-group">
                            <label>Mallampati Airway Score (Class I&ndash;IV) *</label>
                            <select id="orAnesMallampati" required style="font-weight: 700;">
                                <option value="Class I" selected>Class I &mdash; Soft palate, uvula, fauces, pillars fully visible</option>
                                <option value="Class II">Class II &mdash; Soft palate, major part of uvula, fauces visible</option>
                                <option value="Class III">Class III &mdash; Soft palate &amp; base of uvula visible only</option>
                                <option value="Class IV">Class IV &mdash; Hard palate only visible (Difficult Airway Risk)</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>Thyromental Distance &amp; Neck Mobility</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <select id="orAnesThyromental">
                                    <option value=">= 6.5 cm (Normal)">TMD &ge; 6.5 cm (Normal)</option>
                                    <option value="6.0 - 6.5 cm (Borderline)">TMD 6.0&ndash;6.5 cm</option>
                                    <option value="< 6.0 cm (Short / Difficult)">TMD &lt; 6.0 cm (Short)</option>
                                </select>
                                <select id="orAnesNeckMobility">
                                    <option value="Full Range of Motion">Neck: Full ROM</option>
                                    <option value="Mildly Restricted">Neck: Mild Restriction</option>
                                    <option value="Severely Limited / C-Collar">Neck: Limited / C-Spine</option>
                                </select>
                            </div>
                        </div>
                        <div class="or-form-group">
                            <label>Dentition Status &amp; NPO Fasting Hours</label>
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
                                <input type="text" id="orAnesDentition" value="Intact / Normal" placeholder="e.g. Intact, Upper dentures removed, Loose incisors" />
                                <input type="number" id="orAnesNpoHours" step="0.5" min="0" max="72" value="8" placeholder="NPO hrs" title="NPO Fasting Hours" />
                            </div>
                        </div>
                        <div class="or-form-group">
                            <label>Anticipated Difficult Airway Alert</label>
                            <div style="display: flex; align-items: center; gap: 10px; height: 38px; background: #fff1f2; padding: 0 12px; border: 1px solid #fecdd3; border-radius: 6px;">
                                <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; font-weight: 700; color: #be123c; font-size: 12px;">
                                    <input type="checkbox" id="orAnesDifficultAirway" style="width: 16px; height: 16px;" />
                                    &#9888; Difficult Airway Anticipated (Video Laryngoscope / Bougie Standby)
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 2: Anesthesia Technique & Airway Management -->
                    <div class="or-form-section-title" style="color: #0284c7; border-bottom-color: #bae6fd;">
                        2. Anesthesia Modality, Airway Device &amp; Laryngoscopy
                    </div>
                    <div class="or-form-grid" style="margin-bottom: 18px;">
                        <div class="or-form-group">
                            <label>Anesthesia Modality / Technique *</label>
                            <select id="orAnesType" required style="font-weight: 700;">
                                <option value="General" selected>General Anesthesia (GA)</option>
                                <option value="Spinal">Spinal (Subarachnoid Neuraxial Block)</option>
                                <option value="Epidural">Epidural Anesthesia / Analgesia</option>
                                <option value="Combined Spinal-Epidural (CSE)">Combined Spinal-Epidural (CSE)</option>
                                <option value="MAC">MAC (Monitored Anesthesia Care / Conscious Sedation)</option>
                                <option value="Regional Nerve Block">Regional Peripheral Nerve Block (Ultrasound-Guided)</option>
                                <option value="Local">Local Infiltration Only</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>Airway Device</label>
                            <select id="orAnesAirwayDevice">
                                <option value="ETT Cuffed" selected>Endotracheal Tube (ETT Cuffed Oral)</option>
                                <option value="ETT Reinforced">Reinforced / Armored ETT</option>
                                <option value="Double-Lumen ETT">Double-Lumen ETT (One-Lung Ventilation)</option>
                                <option value="LMA (Supraglottic)">Laryngeal Mask Airway (LMA / i-gel)</option>
                                <option value="Nasal Cannula O2">Nasal Cannula O2 (Spontaneous Breathing)</option>
                                <option value="Simple Face Mask O2">Simple / Hudson Face Mask O2</option>
                                <option value="Room Air">Room Air (Spontaneous)</option>
                            </select>
                        </div>
                        <div class="or-form-group">
                            <label>ETT / LMA Size (mm) &amp; Lip Depth (cm)</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <input type="text" id="orAnesEttSize" value="7.5" placeholder="Size e.g. 7.5 mm" />
                                <input type="text" id="orAnesEttDepth" value="21" placeholder="Depth e.g. 21 cm" />
                            </div>
                        </div>
                        <div class="or-form-group">
                            <label>Laryngoscopy &amp; Cormack-Lehane Grade</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <select id="orAnesLaryngoscopy">
                                    <option value="Video Laryngoscope (GlideScope/C-MAC)">Video Laryngoscope</option>
                                    <option value="Direct Macintosh #3/#4">Direct Macintosh Blade</option>
                                    <option value="Direct Miller Blade">Direct Miller Blade</option>
                                    <option value="Fiberoptic Bronchoscope">Awake Fiberoptic</option>
                                    <option value="N/A (No Laryngoscopy)">N/A (Neuraxial / MAC)</option>
                                </select>
                                <select id="orAnesCormackGrade">
                                    <option value="Grade I">Cormack-Lehane Grade I</option>
                                    <option value="Grade IIa">Cormack-Lehane Grade IIa</option>
                                    <option value="Grade IIb">Cormack-Lehane Grade IIb</option>
                                    <option value="Grade III">Cormack-Lehane Grade III</option>
                                    <option value="Grade IV">Cormack-Lehane Grade IV</option>
                                    <option value="N/A (Neuraxial/MAC)">N/A (Neuraxial/MAC)</option>
                                </select>
                            </div>
                        </div>
                        <div class="or-form-group">
                            <label>Intubation Attempts</label>
                            <input type="number" id="orAnesIntubationAttempts" min="0" max="10" value="1" />
                        </div>
                        <div class="or-form-group">
                            <label>Ventilator Mode &amp; Settings</label>
                            <input type="text" id="orAnesVentilatorMode" value="VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)" placeholder="e.g. VCV TV 450mL, RR 12, PEEP 5, FiO2 50%" />
                        </div>
                    </div>

                    <!-- SECTION 3: Induction, Maintenance, Regional & Reversal Drugs -->
                    <div class="or-form-section-title" style="color: #0d9488; border-bottom-color: #99f6e4;">
                        3. Anesthesia Pharmacology: Induction, Maintenance, Neuraxial &amp; Reversal Agents
                    </div>
                    <div class="or-form-grid" style="margin-bottom: 18px;">
                        <div class="or-form-group full-width">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;">
                                <label style="margin: 0;">Induction Agents &amp; Neuromuscular Blockers (IV Boluses)</label>
                                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesInductionDrugs" data-drug="Propofol 160mg IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Propofol 160mg</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesInductionDrugs" data-drug="Fentanyl 100mcg IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Fentanyl 100mcg</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesInductionDrugs" data-drug="Midazolam 2mg IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Midazolam 2mg</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesInductionDrugs" data-drug="Rocuronium 50mg IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Rocuronium 50mg</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesInductionDrugs" data-drug="Lidocaine 1% 60mg IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Lidocaine 60mg</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesInductionDrugs" data-drug="Ketamine 50mg IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Ketamine 50mg</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesInductionDrugs" data-drug="Etomidate 20mg IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Etomidate 20mg</button>
                                </div>
                            </div>
                            <textarea id="orAnesInductionDrugs" rows="2" placeholder="e.g. Midazolam 2mg IV, Fentanyl 100mcg IV, Lidocaine 60mg IV, Propofol 160mg IV, Rocuronium 50mg IV"></textarea>
                        </div>

                        <div class="or-form-group full-width">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;">
                                <label style="margin: 0;">Maintenance Agents (Volatile Inhalational / TIVA Infusions)</label>
                                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesMaintenanceAgents" data-drug="Sevoflurane 2.0% End-Tidal (1.0 MAC) in O2/Air 50%" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Sevoflurane 2.0%</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesMaintenanceAgents" data-drug="Desflurane 6.0% in O2/Air" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Desflurane 6%</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesMaintenanceAgents" data-drug="Propofol TIVA 100mcg/kg/min" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Propofol TIVA</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesMaintenanceAgents" data-drug="Remifentanil 0.1mcg/kg/min IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Remifentanil</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesMaintenanceAgents" data-drug="Dexmedetomidine 0.4mcg/kg/hr IV" style="font-size: 10px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Dexmedetomidine</button>
                                </div>
                            </div>
                            <textarea id="orAnesMaintenanceAgents" rows="2" placeholder="e.g. Sevoflurane 2.0% ET in 50% O2 / Air at 2L/min fresh gas flow; Fentanyl 50mcg IV redose"></textarea>
                        </div>

                        <div class="or-form-group">
                            <label>Spinal / Epidural / Regional Block Details (If Applicable)</label>
                            <textarea id="orAnesRegionalDetails" rows="2" placeholder="e.g. L3-L4 interspace, 25G Pencan Quincke needle, Bupivacaine 0.5% Heavy 12.5mg + Morphine 100mcg IT, T4 sensory block"></textarea>
                        </div>

                        <div class="or-form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="margin: 0;">Reversal, Emergence &amp; PONV Prophylaxis</label>
                                <div style="display: flex; gap: 4px;">
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesReversalDrugs" data-drug="Sugammadex 200mg IV" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ Sugammadex</button>
                                    <button type="button" class="or-anes-drug-chip" data-target="orAnesReversalDrugs" data-drug="Ondansetron 4mg IV + Dexamethasone 8mg IV" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer;">+ PONV Dual</button>
                                </div>
                            </div>
                            <textarea id="orAnesReversalDrugs" rows="2" placeholder="e.g. Sugammadex 200mg IV (TOF > 0.9), Ondansetron 4mg IV, Dexamethasone 8mg IV, Ketorolac 30mg IV"></textarea>
                        </div>
                    </div>

                    <!-- SECTION 4: Intraoperative Fluid Balance & Estimated Blood Loss (EBL) -->
                    <div class="or-form-section-title" style="color: #dc2626; border-bottom-color: #fecaca;">
                        4. Intraoperative Fluid Balance &amp; Estimated Blood Loss (EBL)
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
                        <div class="or-form-group">
                            <label style="color: #dc2626; font-weight: 800;">Estimated Blood Loss (EBL mL) *</label>
                            <input type="number" id="orAnesEblMl" min="0" step="10" value="150" class="or-anes-fluid-input" style="border-color: #fca5a5; background: #fef2f2; font-weight: 800; color: #991b1b;" />
                        </div>
                        <div class="or-form-group">
                            <label>Urine Output (Foley mL)</label>
                            <input type="number" id="orAnesUrineMl" min="0" step="10" value="300" class="or-anes-fluid-input" />
                        </div>
                        <div class="or-form-group">
                            <label style="color: #0284c7;">Crystalloids In (LR / NaCl mL)</label>
                            <input type="number" id="orAnesCrystalloidsMl" min="0" step="50" value="1200" class="or-anes-fluid-input" />
                        </div>
                        <div class="or-form-group">
                            <label style="color: #0284c7;">Colloids / Albumin In (mL)</label>
                            <input type="number" id="orAnesColloidsMl" min="0" step="50" value="0" class="or-anes-fluid-input" />
                        </div>
                        <div class="or-form-group">
                            <label style="color: #be123c;">Blood Products In (pRBC/FFP mL)</label>
                            <input type="number" id="orAnesBloodProductsMl" min="0" step="50" value="0" class="or-anes-fluid-input" />
                        </div>
                        <div class="or-form-group">
                            <label>Net Intra-Op Fluid Balance</label>
                            <div id="orAnesNetFluidBadge" style="height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 800; font-size: 13px; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;">
                                +750 mL
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 5: PACU Aldrete Recovery Score Calculator (0–10) -->
                    <div class="or-form-section-title" style="color: #7c3aed; border-bottom-color: #ddd6fe;">
                        5. PACU Post-Anesthesia Aldrete Recovery Score Calculator (0&ndash;10)
                    </div>
                    <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                            <div style="font-size: 12px; color: #5b21b6; font-weight: 600;">
                                Score each of the 5 physiological recovery parameters from <strong>0 to 2</strong> (Score &ge; 9/10 required for safe PACU discharge):
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span id="orAnesAldreteTotalBadge" style="background: #16a34a; color: #fff; padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 800;">
                                    Aldrete Score: 10 / 10
                                </span>
                                <span id="orAnesAldreteReadinessText" style="font-size: 12px; font-weight: 700; color: #15803d;">
                                    &#10003; Ready for PACU Discharge
                                </span>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                            <div class="or-form-group" style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e9d5ff;">
                                <label style="color: #6d28d9;">1. Activity (Motor)</label>
                                <select id="orAnesAldreteActivity" class="or-anes-aldrete-select">
                                    <option value="2" selected>2 &mdash; Moves 4 extremities voluntarily</option>
                                    <option value="1">1 &mdash; Moves 2 extremities voluntarily</option>
                                    <option value="0">0 &mdash; Unable to move extremities (0)</option>
                                </select>
                            </div>
                            <div class="or-form-group" style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e9d5ff;">
                                <label style="color: #6d28d9;">2. Respiration</label>
                                <select id="orAnesAldreteRespiration" class="or-anes-aldrete-select">
                                    <option value="2" selected>2 &mdash; Breathes deeply &amp; coughs freely</option>
                                    <option value="1">1 &mdash; Dyspnea or limited breathing</option>
                                    <option value="0">0 &mdash; Apneic / Mechanical ventilation</option>
                                </select>
                            </div>
                            <div class="or-form-group" style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e9d5ff;">
                                <label style="color: #6d28d9;">3. Circulation (BP)</label>
                                <select id="orAnesAldreteCirculation" class="or-anes-aldrete-select">
                                    <option value="2" selected>2 &mdash; BP &plusmn;20% of pre-anesthetic level</option>
                                    <option value="1">1 &mdash; BP &plusmn;20&ndash;49% of pre-anesthetic</option>
                                    <option value="0">0 &mdash; BP &plusmn;50% of pre-anesthetic level</option>
                                </select>
                            </div>
                            <div class="or-form-group" style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e9d5ff;">
                                <label style="color: #6d28d9;">4. Consciousness</label>
                                <select id="orAnesAldreteConsciousness" class="or-anes-aldrete-select">
                                    <option value="2" selected>2 &mdash; Fully awake &amp; oriented</option>
                                    <option value="1">1 &mdash; Arousable on calling name</option>
                                    <option value="0">0 &mdash; Not responding to stimuli</option>
                                </select>
                            </div>
                            <div class="or-form-group" style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e9d5ff;">
                                <label style="color: #6d28d9;">5. Oxygenation (SpO2)</label>
                                <select id="orAnesAldreteOxygenation" class="or-anes-aldrete-select">
                                    <option value="2" selected>2 &mdash; SpO2 &gt; 92% on room air</option>
                                    <option value="1">1 &mdash; Needs O2 to keep SpO2 &gt; 90%</option>
                                    <option value="0">0 &mdash; SpO2 &lt; 90% even with O2</option>
                                </select>
                            </div>
                        </div>

                        <div class="or-form-group" style="margin-top: 10px;">
                            <label>PACU Handoff &amp; Recovery Orders (Analgesia, O2, Monitoring)</label>
                            <input type="text" id="orAnesPacuNotes" placeholder="e.g. Maintain O2 2L/min via NC, monitor vitals q15min x 1hr, Morphine 2mg IV PRN severe pain (NRS >= 7)" />
                        </div>
                    </div>

                    <!-- SECTION 6: Anesthesia Milestones, Complications & Sign-Off -->
                    <div class="or-form-section-title" style="color: #334155; border-bottom-color: #cbd5e1;">
                        6. Anesthesia Timestamps, Intra-Op Complications &amp; Attending Sign-Off
                    </div>
                    <div class="or-form-grid">
                        <div class="or-form-group">
                            <label>Anesthesia Start / Induction / Emergence / End</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <input type="datetime-local" id="orAnesStartTime" title="Anesthesia Start Time" />
                                <input type="datetime-local" id="orAnesEndTime" title="Anesthesia End Time" />
                            </div>
                        </div>
                        <div class="or-form-group">
                            <label>Attending Anesthesiologist *</label>
                            <input type="text" id="orAnesAnesthesiologist" required placeholder="e.g. Dr. Elena Rostova (Anesthesiology)" />
                        </div>
                        <div class="or-form-group">
                            <label>Intraoperative Complications / Adverse Events</label>
                            <input type="text" id="orAnesComplications" value="None — Hemodynamically stable throughout procedure" placeholder="e.g. None, or transient post-induction hypotension responsive to Phenylephrine 100mcg" />
                        </div>
                        <div class="or-form-group">
                            <label>Record Status &amp; Digital Signature</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <select id="orAnesRecordStatus">
                                    <option value="Draft / Intra-Op">Draft / Intra-Op</option>
                                    <option value="Signed & Finalized">Signed &amp; Finalized</option>
                                </select>
                                <input type="text" id="orAnesSignature" placeholder="Digital signature / PIN" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="or-modal-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div style="font-size: 11px; color: #64748b;">
                        Saving automatically syncs <strong>Anesthesia Type, EBL (mL), &amp; PACU Aldrete Score</strong> to the OR Case Board.
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="button" class="or-btn-secondary" id="orCancelAnesthesiaBtn">Close</button>
                        <button type="submit" class="or-btn-primary" id="orSaveAnesthesiaDraftBtn" data-finalize="0" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">
                            &#128190; Save Anesthesia Record
                        </button>
                        <button type="button" class="or-btn-primary" id="orFinalizeAnesthesiaBtn" style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);">
                            &#9998; Sign &amp; Finalize Record
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    `;
}
