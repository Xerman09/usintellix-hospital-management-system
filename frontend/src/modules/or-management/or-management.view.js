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
