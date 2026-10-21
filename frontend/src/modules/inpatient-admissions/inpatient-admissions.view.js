export function InpatientAdmissionsView() {
    return `
    <div class="inpatient-wrapper" id="inpatientWrapper">
        <style>
            .inpatient-wrapper {
                padding: 24px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #1e293b;
                background: #f8fafc;
                min-height: 100vh;
                box-sizing: border-box;
                transition: all 0.2s ease;
            }

            /* Fullscreen Whiteboard Mode */
            .inpatient-wrapper.inpatient-fullscreen {
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

            /* Command Header */
            .inpatient-command-strip {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #fff;
                padding: 10px 18px;
                border-radius: 10px;
                margin-bottom: 20px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .inpatient-command-left {
                display: flex;
                align-items: center;
                gap: 14px;
            }
            .inpatient-live-beacon {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(16, 185, 129, 0.2);
                border: 1px solid rgba(16, 185, 129, 0.4);
                color: #6ee7b7;
                padding: 3px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .inpatient-pulse-dot {
                width: 8px;
                height: 8px;
                background-color: #10b981;
                border-radius: 50%;
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                animation: inpatient-pulse 2s infinite;
            }
            @keyframes inpatient-pulse {
                0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
                100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            .inpatient-command-title {
                font-size: 16px;
                font-weight: 700;
                letter-spacing: 0.2px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .inpatient-command-right {
                display: flex;
                align-items: center;
                gap: 16px;
                font-size: 13px;
                color: #cbd5e1;
            }
            .inpatient-clock-box {
                background: rgba(255, 255, 255, 0.1);
                padding: 4px 12px;
                border-radius: 6px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 13px;
                color: #38bdf8;
                font-weight: 600;
                border: 1px solid rgba(56, 189, 248, 0.2);
            }

            /* Action Buttons Strip */
            .inpatient-top-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 20px;
            }
            .inpatient-title-area h2 {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 4px 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .inpatient-title-area p {
                font-size: 13px;
                color: #64748b;
                margin: 0;
            }
            .inpatient-actions-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            .btn-inpatient {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                font-size: 13px;
                font-weight: 600;
                border-radius: 6px;
                border: 1px solid transparent;
                cursor: pointer;
                transition: all 0.15s ease;
                text-decoration: none;
            }
            .btn-inpatient-primary {
                background: #0284c7;
                color: #fff;
            }
            .btn-inpatient-primary:hover {
                background: #0369a1;
            }
            .btn-inpatient-secondary {
                background: #fff;
                color: #334155;
                border-color: #cbd5e1;
            }
            .btn-inpatient-secondary:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }
            .btn-inpatient-dark {
                background: #1e293b;
                color: #f8fafc;
            }
            .btn-inpatient-dark:hover {
                background: #0f172a;
            }
            .btn-inpatient-success {
                background: #10b981;
                color: #fff;
            }
            .btn-inpatient-success:hover {
                background: #059669;
            }

            /* Analytics KPI Cards Grid */
            .inpatient-kpis-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
                margin-bottom: 24px;
            }
            .inpatient-kpi-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 14px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                position: relative;
                overflow: hidden;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .inpatient-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.08);
            }
            .inpatient-kpi-title {
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .inpatient-kpi-value {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.1;
                display: flex;
                align-items: baseline;
                gap: 4px;
            }
            .inpatient-kpi-sub {
                font-size: 11px;
                color: #94a3b8;
                margin-top: 4px;
            }
            .inpatient-kpi-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
            }
            .kpi-bar-blue { background: #3b82f6; }
            .kpi-bar-green { background: #10b981; }
            .kpi-bar-red { background: #ef4444; }
            .kpi-bar-amber { background: #f59e0b; }
            .kpi-bar-orange { background: #f97316; }
            .kpi-bar-purple { background: #8b5cf6; }
            .kpi-bar-slate { background: #64748b; }

            /* Filter & Search Bar */
            .inpatient-filter-bar {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 14px 18px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 14px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.03);
            }
            .inpatient-filter-left {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .inpatient-filter-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .inpatient-ward-pills {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
            }
            .ward-pill-btn {
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                border-radius: 20px;
                border: 1px solid #e2e8f0;
                background: #f8fafc;
                color: #475569;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .ward-pill-btn:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .ward-pill-btn.active {
                background: #0284c7;
                color: #fff;
                border-color: #0284c7;
                box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
            }
            .inpatient-search-input {
                padding: 7px 12px;
                font-size: 13px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                width: 220px;
                background: #fff;
                color: #1e293b;
                transition: border-color 0.15s ease;
            }
            .inpatient-search-input:focus {
                border-color: #0284c7;
                outline: none;
            }
            .inpatient-select {
                padding: 7px 12px;
                font-size: 13px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                background: #fff;
                color: #1e293b;
            }

            /* View Switcher */
            .inpatient-view-switcher {
                display: inline-flex;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                overflow: hidden;
                background: #f1f5f9;
            }
            .inpatient-view-btn {
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                border: none;
                background: transparent;
                color: #64748b;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .inpatient-view-btn.active {
                background: #fff;
                color: #0284c7;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }

            /* Whiteboard Section Styles */
            .inpatient-ward-section {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 18px;
                margin-bottom: 24px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.03);
            }
            .ward-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid #f1f5f9;
                flex-wrap: wrap;
                gap: 12px;
            }
            .ward-header-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .ward-header-title h3 {
                font-size: 17px;
                font-weight: 700;
                margin: 0;
                color: #0f172a;
            }
            .ward-type-badge {
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .badge-icu { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
            .badge-surgical { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
            .badge-medical { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .badge-pediatric { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-isolation { background: #fce7f3; color: #be185d; border: 1px solid #fbcfe8; }
            
            .ward-header-meta {
                display: flex;
                align-items: center;
                gap: 16px;
                font-size: 12px;
                color: #64748b;
            }
            .ward-meter-bar {
                width: 100px;
                height: 8px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
            }
            .ward-meter-fill {
                height: 100%;
                background: #0284c7;
                border-radius: 4px;
            }

            /* Beds Grid Layout */
            .inpatient-beds-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }

            /* Individual Bed Card */
            .inpatient-bed-card {
                background: #fff;
                border-radius: 10px;
                border: 2px solid #e2e8f0;
                padding: 14px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
                transition: all 0.2s ease;
            }
            .inpatient-bed-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px -2px rgba(0,0,0,0.08);
            }

            /* Card State Borders & Glows */
            .bed-card-available {
                border-color: #10b981;
                background: #f0fdf4;
            }
            .bed-card-occupied {
                border-color: #ef4444;
                background: #fff;
            }
            .bed-card-pending-discharge {
                border-color: #f59e0b;
                background: #fffbeb;
            }
            .bed-card-dirty {
                border-color: #f97316;
                background: #fff7ed;
            }
            .bed-card-maintenance {
                border-color: #64748b;
                background: #f8fafc;
            }

            .bed-card-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 10px;
            }
            .bed-number-box {
                display: flex;
                flex-direction: column;
            }
            .bed-number {
                font-size: 17px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.1;
            }
            .bed-room {
                font-size: 11px;
                color: #64748b;
                font-weight: 600;
            }
            
            /* Status Pills */
            .bed-status-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
            }
            .status-pill-available {
                background: #dcfce7;
                color: #166534;
                border: 1px solid #bbf7d0;
            }
            .status-pill-occupied {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
            }
            .status-pill-pending-discharge {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            .status-pill-dirty {
                background: #ffedd5;
                color: #9a3412;
                border: 1px solid #fed7aa;
            }
            .status-pill-maintenance {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #cbd5e1;
            }

            /* Card Content Details */
            .bed-patient-info {
                margin: 8px 0;
                padding: 8px 10px;
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid #f1f5f9;
                border-radius: 6px;
            }
            .bed-patient-name {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .bed-patient-name a {
                color: #0284c7;
                text-decoration: none;
            }
            .bed-patient-name a:hover {
                text-decoration: underline;
            }
            .bed-patient-mrn {
                font-size: 11px;
                font-family: ui-monospace, monospace;
                color: #64748b;
                background: #f1f5f9;
                padding: 1px 5px;
                border-radius: 4px;
            }
            .bed-details-list {
                font-size: 12px;
                color: #334155;
                margin-top: 6px;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            .bed-detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .bed-detail-label {
                color: #64748b;
                font-size: 11px;
            }
            .bed-detail-val {
                font-weight: 600;
            }

            /* Isolation Precautions Badge */
            .isolation-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                margin-top: 4px;
            }
            .iso-contact { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
            .iso-droplet { background: #e0f2fe; color: #0284c7; border: 1px solid #7dd3fc; }
            .iso-airborne { background: #fce7f3; color: #db2777; border: 1px solid #f472b6; }
            .iso-strict { background: #fef2f2; color: #991b1b; border: 1px solid #ef4444; font-weight: 800; }

            /* Card Actions */
            .bed-card-actions {
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px dashed #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                flex-wrap: wrap;
            }
            .bed-action-btn {
                padding: 5px 9px;
                font-size: 11px;
                font-weight: 600;
                border-radius: 4px;
                border: 1px solid transparent;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                text-decoration: none;
            }
            .btn-act-admit {
                background: #10b981;
                color: #fff;
                width: 100%;
                justify-content: center;
                padding: 7px;
            }
            .btn-act-admit:hover { background: #059669; }
            .btn-act-transfer {
                background: #e0e7ff;
                color: #4338ca;
                border-color: #c7d2fe;
            }
            .btn-act-transfer:hover { background: #c7d2fe; }
            .btn-act-discharge {
                background: #fef2f2;
                color: #dc2626;
                border-color: #fecaca;
            }
            .btn-act-discharge:hover { background: #fee2e2; }
            .btn-act-pending {
                background: #fef3c7;
                color: #92400e;
                border-color: #fde68a;
            }
            .btn-act-pending:hover { background: #fde68a; }
            .btn-act-sanitize {
                background: #f97316;
                color: #fff;
                width: 100%;
                justify-content: center;
                padding: 7px;
            }
            .btn-act-sanitize:hover { background: #ea580c; }
            .btn-act-maint {
                background: #f1f5f9;
                color: #475569;
                border-color: #cbd5e1;
            }
            .btn-act-maint:hover { background: #e2e8f0; }

            /* Census Table View */
            .inpatient-table-container {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                overflow-x: auto;
                box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                margin-bottom: 24px;
            }
            .inpatient-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                text-align: left;
            }
            .inpatient-table th {
                background: #f8fafc;
                padding: 12px 14px;
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #e2e8f0;
            }
            .inpatient-table td {
                padding: 12px 14px;
                border-bottom: 1px solid #f1f5f9;
                color: #334155;
            }
            .inpatient-table tr:hover td {
                background: #f8fafc;
            }

            /* Activity Feed */
            .inpatient-activity-feed {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 18px;
                margin-top: 20px;
            }
            .activity-header {
                font-size: 15px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .activity-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 0;
                border-bottom: 1px solid #f1f5f9;
                font-size: 13px;
            }
            .activity-item:last-child {
                border-bottom: none;
            }
            .activity-icon {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                flex-shrink: 0;
            }
            .icon-transfer { background: #e0e7ff; color: #4f46e5; }

            /* Modal Styles */
            .inpatient-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(3px);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            }
            .inpatient-modal-backdrop.open {
                display: flex;
            }
            .inpatient-modal-content {
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                width: 100%;
                max-width: 650px;
                max-height: 90vh;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                animation: modalPop 0.15s ease-out;
            }
            @keyframes modalPop {
                0% { opacity: 0; transform: scale(0.96); }
                100% { opacity: 1; transform: scale(1); }
            }
            .inpatient-modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
                border-top-left-radius: 12px;
                border-top-right-radius: 12px;
            }
            .inpatient-modal-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 700;
                color: #0f172a;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .inpatient-modal-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #64748b;
                line-height: 1;
            }
            .inpatient-modal-close:hover {
                color: #0f172a;
            }
            .inpatient-modal-body {
                padding: 20px;
            }
            .inpatient-modal-footer {
                padding: 14px 20px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                border-bottom-left-radius: 12px;
                border-bottom-right-radius: 12px;
            }
            .form-grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
            }
            .form-group {
                margin-bottom: 14px;
            }
            .form-group label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #334155;
                margin-bottom: 5px;
            }
            .form-control {
                width: 100%;
                padding: 8px 12px;
                font-size: 13px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                background: #fff;
                color: #1e293b;
                box-sizing: border-box;
            }
            .form-control:focus {
                outline: none;
                border-color: #0284c7;
            }
            .jcaho-notice-box {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 6px;
                padding: 10px 14px;
                font-size: 12px;
                color: #1e40af;
                margin-bottom: 16px;
                display: flex;
                align-items: flex-start;
                gap: 10px;
            }

            /* Dark Mode Theme Support */
            :root[data-theme="dark"] .inpatient-wrapper {
                background: #0b1120;
                color: #f1f5f9;
            }
            :root[data-theme="dark"] .inpatient-title-area h2 {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .inpatient-kpi-card,
            :root[data-theme="dark"] .inpatient-filter-bar,
            :root[data-theme="dark"] .inpatient-ward-section,
            :root[data-theme="dark"] .inpatient-table-container,
            :root[data-theme="dark"] .inpatient-activity-feed,
            :root[data-theme="dark"] .inpatient-modal-content {
                background: #1e293b;
                border-color: #334155;
                color: #f1f5f9;
            }
            :root[data-theme="dark"] .inpatient-modal-header,
            :root[data-theme="dark"] .inpatient-modal-footer,
            :root[data-theme="dark"] .inpatient-table th {
                background: #0f172a;
                border-color: #334155;
                color: #94a3b8;
            }
            :root[data-theme="dark"] .inpatient-table td {
                border-color: #334155;
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .inpatient-table tr:hover td {
                background: #1e293b;
            }
            :root[data-theme="dark"] .ward-header {
                border-color: #334155;
            }
            :root[data-theme="dark"] .ward-header-title h3 {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .inpatient-bed-card {
                background: #1e293b;
                border-color: #334155;
            }
            :root[data-theme="dark"] .bed-card-available {
                background: #064e3b22;
                border-color: #059669;
            }
            :root[data-theme="dark"] .bed-card-occupied {
                background: #7f1d1d22;
                border-color: #dc2626;
            }
            :root[data-theme="dark"] .bed-card-pending-discharge {
                background: #78350f22;
                border-color: #d97706;
            }
            :root[data-theme="dark"] .bed-card-dirty {
                background: #7c2d1222;
                border-color: #ea580c;
            }
            :root[data-theme="dark"] .bed-card-maintenance {
                background: #33415522;
                border-color: #64748b;
            }
            :root[data-theme="dark"] .bed-number {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .bed-patient-info {
                background: #0f172a88;
                border-color: #334155;
            }
            :root[data-theme="dark"] .bed-patient-name {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .bed-details-list {
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .form-control,
            :root[data-theme="dark"] .inpatient-select,
            :root[data-theme="dark"] .inpatient-search-input {
                background: #0f172a;
                border-color: #334155;
                color: #f8fafc;
            }
            :root[data-theme="dark"] .btn-inpatient-secondary {
                background: #1e293b;
                border-color: #475569;
                color: #f1f5f9;
            }
            :root[data-theme="dark"] .btn-inpatient-secondary:hover {
                background: #334155;
            }
            :root[data-theme="dark"] .ward-pill-btn {
                background: #0f172a;
                border-color: #334155;
                color: #94a3b8;
            }
            :root[data-theme="dark"] .ward-pill-btn:hover {
                background: #1e293b;
                color: #f8fafc;
            }
            :root[data-theme="dark"] .ward-pill-btn.active {
                background: #0284c7;
                color: #fff;
                border-color: #0284c7;
            }
            :root[data-theme="dark"] .inpatient-view-switcher {
                background: #0f172a;
                border-color: #334155;
            }
            :root[data-theme="dark"] .inpatient-view-btn {
                color: #94a3b8;
            }
            :root[data-theme="dark"] .inpatient-view-btn.active {
                background: #1e293b;
                color: #38bdf8;
            }
        </style>

        <!-- Command Strip -->
        <div class="inpatient-command-strip">
            <div class="inpatient-command-left">
                <div class="inpatient-live-beacon">
                    <span class="inpatient-pulse-dot"></span>
                    <span>LIVE CENSUS FEED</span>
                </div>
                <div class="inpatient-command-title">
                    <span>🏥 Hospital Inpatient Bed Management & Ward Census (ADT)</span>
                </div>
            </div>
            <div class="inpatient-command-right">
                <span id="inpatientLiveDate">Today</span>
                <div class="inpatient-clock-box" id="inpatientLiveClock">00:00:00</div>
                <button class="btn-inpatient btn-inpatient-dark" id="btnInpatientFullscreen" title="Toggle Fullscreen Theater Display">
                    🖥️ Whiteboard Mode
                </button>
            </div>
        </div>

        <!-- Top Header & Primary Actions -->
        <div class="inpatient-top-bar">
            <div class="inpatient-title-area">
                <h2>Inpatient Bed Census & Whiteboard</h2>
                <p>Real-time ward occupancy, admission tracking, electronic transfers, and infection control turnover.</p>
            </div>
            <div class="inpatient-actions-group">
                <button class="btn-inpatient btn-inpatient-primary" id="btnOpenAdmitModal">
                    ➕ Admit Patient (ADT)
                </button>
                <button class="btn-inpatient btn-inpatient-secondary" id="btnOpenTransferModal">
                    🔄 Bed-to-Bed Transfer
                </button>
                <button class="btn-inpatient btn-inpatient-secondary" id="btnOpenConfigModal">
                    ⚙️ Register Ward / Bed
                </button>
                <button class="btn-inpatient btn-inpatient-secondary" id="btnInpatientRefresh" title="Refresh Live Census">
                    🔄 Refresh
                </button>
            </div>
        </div>

        <!-- Analytics KPI Cards -->
        <div class="inpatient-kpis-grid">
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">Total Licensed Beds</div>
                <div class="inpatient-kpi-value" id="kpiTotalBeds">--</div>
                <div class="inpatient-kpi-sub" id="kpiActiveWards">Across 5 Active Wards</div>
                <div class="inpatient-kpi-bar kpi-bar-blue"></div>
            </div>
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">Occupancy Rate (BOR)</div>
                <div class="inpatient-kpi-value" id="kpiBorRate">--%</div>
                <div class="inpatient-kpi-sub" id="kpiActiveInpatients">-- Inpatients</div>
                <div class="inpatient-kpi-bar kpi-bar-purple"></div>
            </div>
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">🟢 Available & Ready</div>
                <div class="inpatient-kpi-value" id="kpiAvailableBeds" style="color: #10b981;">--</div>
                <div class="inpatient-kpi-sub">Sanitized for Admission</div>
                <div class="inpatient-kpi-bar kpi-bar-green"></div>
            </div>
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">🔴 Occupied Beds</div>
                <div class="inpatient-kpi-value" id="kpiOccupiedBeds" style="color: #ef4444;">--</div>
                <div class="inpatient-kpi-sub">Active Bed Holds</div>
                <div class="inpatient-kpi-bar kpi-bar-red"></div>
            </div>
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">🟡 Pending Discharge</div>
                <div class="inpatient-kpi-value" id="kpiPendingBeds" style="color: #f59e0b;">--</div>
                <div class="inpatient-kpi-sub">Orders Written / Meds Awaited</div>
                <div class="inpatient-kpi-bar kpi-bar-amber"></div>
            </div>
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">🟠 Dirty / Turnover</div>
                <div class="inpatient-kpi-value" id="kpiDirtyBeds" style="color: #f97316;">--</div>
                <div class="inpatient-kpi-sub">Needs Terminal Cleaning</div>
                <div class="inpatient-kpi-bar kpi-bar-orange"></div>
            </div>
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">Average Length of Stay</div>
                <div class="inpatient-kpi-value" id="kpiAlos">-- <span style="font-size: 14px; font-weight: 500;">Days</span></div>
                <div class="inpatient-kpi-sub">Quality Analytics (ALOS)</div>
                <div class="inpatient-kpi-bar kpi-bar-blue"></div>
            </div>
            <div class="inpatient-kpi-card">
                <div class="inpatient-kpi-title">⚠️ Isolation Precautions</div>
                <div class="inpatient-kpi-value" id="kpiIsolationCases" style="color: #be185d;">--</div>
                <div class="inpatient-kpi-sub">Contact / Droplet / Airborne</div>
                <div class="inpatient-kpi-bar kpi-bar-red"></div>
            </div>
            <div class="inpatient-kpi-card" id="kpiCardPendingHandovers" style="cursor: pointer;" title="Click to review pending transfer handovers">
                <div class="inpatient-kpi-title">🤝 Pending Handover Sign-Off</div>
                <div class="inpatient-kpi-value" id="kpiPendingHandovers" style="color: #6366f1;">--</div>
                <div class="inpatient-kpi-sub">Receiving Nurse Acceptance Awaited</div>
                <div class="inpatient-kpi-bar" style="background: #6366f1;"></div>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="inpatient-filter-bar">
            <div class="inpatient-filter-left">
                <div class="inpatient-ward-pills" id="inpatientWardPills">
                    <button class="ward-pill-btn active" data-ward="all">All Hospital Wards</button>
                    <!-- Dynamically populated wards -->
                </div>
            </div>
            <div class="inpatient-filter-right">
                <select class="inpatient-select" id="inpatientStatusFilter">
                    <option value="all">All Bed Statuses</option>
                    <option value="Available">🟢 Available & Sanitized</option>
                    <option value="Occupied">🔴 Occupied</option>
                    <option value="Pending Discharge">🟡 Pending Discharge</option>
                    <option value="Dirty / Turnover">🟠 Dirty / Turnover</option>
                    <option value="Maintenance">⚙️ Maintenance / Blocked</option>
                </select>
                <input type="text" class="inpatient-search-input" id="inpatientSearch" placeholder="🔍 Search Bed, Room, Patient, Doctor..." />
                
                <div class="inpatient-view-switcher">
                    <button class="inpatient-view-btn active" id="viewModeFloorplan" title="Interactive Whiteboard Floorplan">
                        🛏️ Floorplan
                    </button>
                    <button class="inpatient-view-btn" id="viewModeTable" title="Census Roster Table View">
                        📋 Roster Table
                    </button>
                </div>
            </div>
        </div>

        <!-- Whiteboard Floorplan Container -->
        <div id="inpatientFloorplanContainer">
            <!-- Dynamic ward sections & beds grid inserted here -->
        </div>

        <!-- Roster Table Container (Hidden by default) -->
        <div id="inpatientTableContainer" style="display: none;">
            <div class="inpatient-table-container">
                <table class="inpatient-table">
                    <thead>
                        <tr>
                            <th>Ward / Floor</th>
                            <th>Room & Bed</th>
                            <th>Bed Type</th>
                            <th>Status</th>
                            <th>Patient / MRN</th>
                            <th>Age / Sex</th>
                            <th>Attending Physician</th>
                            <th>Admission Date / LOS</th>
                            <th>Diagnosis & Isolation</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inpatientTableBody">
                        <!-- Dynamic rows inserted here -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Recent ADT Activity Stream -->
        <div class="inpatient-activity-feed" id="inpatientActivityFeed">
            <div class="activity-header">
                <span>📋 Recent Inpatient ADT Transfers & Activity Stream</span>
            </div>
            <div id="inpatientRecentActivityList">
                <!-- Dynamic activity items -->
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: ADMIT PATIENT (ADT)                                      -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalAdmitPatient">
            <div class="inpatient-modal-content">
                <div class="inpatient-modal-header">
                    <h3>🏥 Inpatient Admission (ADT Engine)</h3>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <form id="formAdmitPatient">
                    <div class="inpatient-modal-body">
                        <div class="jcaho-notice-box">
                            <span>ℹ️</span>
                            <div>
                                <strong>Electronic ADT Direct Admission:</strong> Patient will be assigned to the selected sanitized bed. Status will automatically update to <strong>Occupied</strong>.
                            </div>
                        </div>

                        <!-- Target Bed Selection -->
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Target Hospital Bed <span style="color: red;">*</span></label>
                                <select class="form-control" name="bed_id" id="admitBedSelect" required>
                                    <option value="">-- Choose Available Bed --</option>
                                    <!-- Populated dynamically -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Admission Date & Time <span style="color: red;">*</span></label>
                                <input type="datetime-local" class="form-control" name="admission_date" id="admitDateInput" required />
                            </div>
                        </div>

                        <!-- Patient Selection -->
                        <div class="form-group">
                            <label>Select Registered EHR Patient</label>
                            <select class="form-control" id="admitPatientSelect" name="patient_id">
                                <option value="">-- Choose from Patient Registry --</option>
                            </select>
                        </div>

                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Patient Full Name <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" name="patient_name" id="admitPatientName" placeholder="John Doe" required />
                            </div>
                            <div class="form-group">
                                <label>Patient MRN / Number</label>
                                <input type="text" class="form-control" name="patient_mrn" id="admitPatientMrn" placeholder="PAT-000001" />
                            </div>
                        </div>

                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Patient Age</label>
                                <input type="number" class="form-control" name="patient_age" id="admitPatientAge" min="0" max="130" placeholder="45" />
                            </div>
                            <div class="form-group">
                                <label>Gender</label>
                                <select class="form-control" name="gender" id="admitPatientGender">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other / Unknown</option>
                                </select>
                            </div>
                        </div>

                        <!-- Admission Clinical Context -->
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Admission Source <span style="color: red;">*</span></label>
                                <select class="form-control" name="admission_source" required>
                                    <option value="Outpatient Clinic">Outpatient Clinic</option>
                                    <option value="Emergency Room (ER)">Emergency Room (ER)</option>
                                    <option value="Post-Op PACU / Surgical">Post-Op PACU / Surgical</option>
                                    <option value="Direct Transfer / Outside Hospital">Direct Transfer / Outside Hospital</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Admission Priority Type <span style="color: red;">*</span></label>
                                <select class="form-control" name="admission_type" required>
                                    <option value="Elective">Elective</option>
                                    <option value="Emergency / STAT">Emergency / STAT</option>
                                    <option value="Urgent">Urgent</option>
                                    <option value="Newborn">Newborn</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Admitting Diagnosis <span style="color: red;">*</span></label>
                            <input type="text" class="form-control" name="admitting_diagnosis" placeholder="e.g. Acute Appendicitis, CHF Exacerbation" required />
                        </div>

                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Attending Physician <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" name="attending_physician" placeholder="Dr. Robert Martinez, MD" required />
                            </div>
                            <div class="form-group">
                                <label>Primary Assigned Nurse</label>
                                <input type="text" class="form-control" name="primary_nurse" placeholder="Nurse Carla Santos, RN" />
                            </div>
                        </div>

                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Infection Isolation Precautions <span style="color: red;">*</span></label>
                                <select class="form-control" name="isolation_precautions" required>
                                    <option value="Standard">Standard Precautions (Universal)</option>
                                    <option value="Contact">Contact Isolation (MRSA, VRE, C. diff)</option>
                                    <option value="Droplet">Droplet Isolation (Influenza, Meningitis)</option>
                                    <option value="Airborne">Airborne Isolation (TB, Measles, Negative Pressure)</option>
                                    <option value="Strict Protective Neutropenic">Strict Protective (Neutropenic / Transplant)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Expected Discharge Date</label>
                                <input type="date" class="form-control" name="expected_discharge_date" />
                            </div>
                        </div>
                    </div>
                    <div class="inpatient-modal-footer">
                        <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn-inpatient btn-inpatient-primary">Confirm Admission</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: TRANSFER PATIENT & SBAR NURSE HANDOVER                   -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalTransferPatient">
            <div class="inpatient-modal-content" style="max-width: 820px; width: 95%; max-height: 92vh; display: flex; flex-direction: column;">
                <div class="inpatient-modal-header" style="flex-shrink: 0;">
                    <div>
                        <h3>🔄 Patient Bed Transfer & SBAR Nurse Handover</h3>
                        <div style="font-size: 11.5px; color: var(--text-muted, #64748b); margin-top: 2px;">
                            Joint Commission / Enterprise Nursing Clinical Handover Protocol (Dual Sign-Off)
                        </div>
                    </div>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <form id="formTransferPatient" style="display: flex; flex-direction: column; overflow: hidden; height: 100%;">
                    <div class="inpatient-modal-body" style="overflow-y: auto; flex: 1; padding: 20px;">
                        <div class="jcaho-notice-box" style="margin-bottom: 14px;">
                            <span>🛡️</span>
                            <div>
                                <strong>Clinical Safety Protocol:</strong> Vacated bed will automatically transition to <strong>Dirty / Turnover</strong> and enter the EVS turnover pipeline. A structured SBAR handover and sending nurse sign-off are required.
                            </div>
                        </div>

                        <!-- Patient & Destination Selection -->
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Active Inpatient to Transfer <span style="color: red;">*</span></label>
                                <select class="form-control" name="admission_id" id="transferAdmissionSelect" required>
                                    <option value="">-- Choose Admitted Patient --</option>
                                    <!-- Populated dynamically -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Destination Bed (Available Only) <span style="color: red;">*</span></label>
                                <select class="form-control" name="to_bed_id" id="transferToBedSelect" required>
                                    <option value="">-- Choose Destination Bed --</option>
                                    <!-- Populated dynamically -->
                                </select>
                            </div>
                        </div>

                        <div class="form-group" id="transferCurrentLocationBox" style="display: none; margin-bottom: 14px;">
                            <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; display: flex; justify-content: space-between;">
                                <div><strong>Current Location:</strong> <span id="transferCurrentLocText">--</span></div>
                                <div id="transferPatientMetaText" style="color: #64748b;"></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Reason for Transfer <span style="color: red;">*</span></label>
                            <input type="text" class="form-control" name="transfer_reason" id="transferReasonInput" placeholder="e.g. Clinical escalation to ICU, Post-op surgical stepdown, Telemetry monitoring" required />
                        </div>

                        <!-- Structured SBAR Handover Section -->
                        <div style="margin: 18px 0 10px 0; border-top: 2px solid #e2e8f0; padding-top: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                    <span>📋</span> Structured SBAR Nursing Clinical Handover Protocol
                                </div>
                                <span style="font-size: 11px; background: #eff6ff; color: #1d4ed8; font-weight: 700; padding: 2px 8px; border-radius: 4px;">SBAR Standard</span>
                            </div>

                            <!-- S - Situation -->
                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">S — Situation (Current Status & Trigger for Transfer) <span style="color: red;">*</span></label>
                                <textarea class="form-control" name="sbar_situation" id="sbarSituation" rows="2" placeholder="Briefly state current clinical situation, vital stability, and why transfer is indicated now..." required></textarea>
                            </div>

                            <!-- B - Background -->
                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">B — Background (Clinical Context & History)</label>
                                <textarea class="form-control" name="sbar_background" id="sbarBackground" rows="2" placeholder="Primary diagnosis, relevant surgical procedures, isolation precautions, significant allergies, code status..."></textarea>
                            </div>

                            <!-- A - Assessment & Vitals -->
                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">A — Assessment & Transfer Vital Signs</label>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                                    <div>
                                        <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Blood Pressure</label>
                                        <input type="text" class="form-control" name="vitals_bp" id="transferVitalsBp" placeholder="120/80" style="height: 32px; font-size: 12px;" />
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Heart Rate (bpm)</label>
                                        <input type="number" class="form-control" name="vitals_hr" id="transferVitalsHr" placeholder="78" style="height: 32px; font-size: 12px;" />
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Resp Rate (/min)</label>
                                        <input type="number" class="form-control" name="vitals_rr" id="transferVitalsRr" placeholder="18" style="height: 32px; font-size: 12px;" />
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Temp (°C)</label>
                                        <input type="text" class="form-control" name="vitals_temp" id="transferVitalsTemp" placeholder="36.8" style="height: 32px; font-size: 12px;" />
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">SpO2 (%)</label>
                                        <input type="number" class="form-control" name="vitals_spo2" id="transferVitalsSpo2" placeholder="98" style="height: 32px; font-size: 12px;" />
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Pain Scale</label>
                                        <input type="text" class="form-control" name="vitals_pain" id="transferVitalsPain" placeholder="2/10" style="height: 32px; font-size: 12px;" />
                                    </div>
                                </div>
                                <textarea class="form-control" name="sbar_assessment" id="sbarAssessment" rows="2" placeholder="Clinical assessment: mental status, IV line locations/patency, active infusions, oxygen therapy, surgical drains, intake/output..."></textarea>
                            </div>

                            <!-- R - Recommendation -->
                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">R — Recommendation & Next Critical Actions</label>
                                <textarea class="form-control" name="sbar_recommendation" id="sbarRecommendation" rows="2" placeholder="Recommendations for receiving unit: monitoring frequency, pending lab/imaging results, next due medications..."></textarea>
                            </div>
                        </div>

                        <!-- Sending Nurse Handover Sign-off Box -->
                        <div style="background: #f1f5f9; padding: 14px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 14px;">
                            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <span>✍️</span> 1. Sending Nurse Handover Sign-Off (Departure Unit)
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group" style="margin-bottom: 8px;">
                                    <label>Sending Nurse Name & Credential <span style="color: red;">*</span></label>
                                    <input type="text" class="form-control" name="sending_nurse_name" id="transferSendingNurseName" placeholder="e.g. Nurse Sarah Jenkins, BSN, RN" required />
                                </div>
                                <div class="form-group" style="margin-bottom: 8px;">
                                    <label>Electronic Sign-Off Timestamp</label>
                                    <input type="text" class="form-control" id="transferSendingNurseTimestamp" value="Current System Timestamp" readonly style="background: #e2e8f0; color: #64748b;" />
                                </div>
                            </div>
                            <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 4px; color: #334155;">
                                <input type="checkbox" id="chkSendingNurseCertify" required checked style="margin-top: 2px;" />
                                <span>I certify that I have conducted a direct clinical handover to the receiving unit and communicated all critical patient data, pending orders, and precautions.</span>
                            </label>
                        </div>

                        <!-- Optional Bedside Dual Sign-Off Co-Sign Toggle -->
                        <div style="margin-top: 14px; background: #faf5ff; padding: 14px; border-radius: 6px; border: 1px solid #e9d5ff;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #6b21a8; cursor: pointer; margin-bottom: 0;">
                                <input type="checkbox" id="transferBedsideCosignToggle" />
                                <span>🤝 Receiving Nurse is Present at Bedside (Co-Sign Dual Handover Now)</span>
                            </label>
                            
                            <div id="transferBedsideCosignSection" style="display: none; margin-top: 12px; border-top: 1px dashed #d8b4fe; padding-top: 10px;">
                                <div class="form-grid-2">
                                    <div class="form-group" style="margin-bottom: 8px;">
                                        <label>Receiving Nurse Name & Credential</label>
                                        <input type="text" class="form-control" name="receiving_nurse_name" id="transferBedsideReceivingName" placeholder="e.g. Nurse Jennifer Lopez, RN" />
                                    </div>
                                    <div class="form-group" style="margin-bottom: 8px;">
                                        <label>Acceptance Notes</label>
                                        <input type="text" class="form-control" name="receiving_acceptance_notes" placeholder="Patient verified at bedside, vitals reviewed." />
                                    </div>
                                </div>
                                <div style="font-size: 11.5px; color: #7e22ce;">
                                    Checking this completes the dual signature simultaneously upon transfer submission.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="inpatient-modal-footer" style="flex-shrink: 0;">
                        <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn-inpatient btn-inpatient-primary" id="btnSubmitTransfer">Authorize Transfer & Sign Handover</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: RECEIVING NURSE HANDOVER BEDSIDE SIGN-OFF               -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalAcceptTransferHandover">
            <div class="inpatient-modal-content" style="max-width: 680px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="inpatient-modal-header" style="flex-shrink: 0;">
                    <div>
                        <h3>🤝 Receiving Ward Nurse Handover Sign-Off</h3>
                        <div style="font-size: 11.5px; color: var(--text-muted, #64748b); margin-top: 2px;">
                            Bedside Patient Verification & Acceptance Dual Signature
                        </div>
                    </div>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <form id="formAcceptHandover" style="display: flex; flex-direction: column; overflow: hidden; height: 100%;">
                    <div class="inpatient-modal-body" style="overflow-y: auto; flex: 1; padding: 20px;">
                        <input type="hidden" id="acceptTransferId" />

                        <!-- Transfer Summary Banner -->
                        <div id="acceptTransferBanner" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 14px; font-size: 13px;">
                            <!-- Populated dynamically -->
                        </div>

                        <!-- SBAR Preview Box -->
                        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 14px; font-size: 12.5px;">
                            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 13px;">SBAR Handover Report from Sending Unit:</div>
                            <div style="margin-bottom: 6px;"><strong>S (Situation):</strong> <span id="acceptSbarSituation">--</span></div>
                            <div style="margin-bottom: 6px;"><strong>B (Background):</strong> <span id="acceptSbarBackground">--</span></div>
                            <div style="margin-bottom: 6px;"><strong>A (Assessment):</strong> <span id="acceptSbarAssessment">--</span></div>
                            <div style="margin-bottom: 6px;" id="acceptVitalsRow"></div>
                            <div><strong>R (Recommendation):</strong> <span id="acceptSbarRecommendation">--</span></div>
                        </div>

                        <!-- Bedside Clinical Verification Checklist -->
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 14px;">
                            <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 8px;">
                                Bedside Clinical Verification Checklist *
                            </div>
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-bottom: 6px; cursor: pointer;">
                                <input type="checkbox" id="chkAcceptIdBand" required checked />
                                <span>Patient 2-identifier verification (wristband barcode, name & birthdate confirmed).</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-bottom: 6px; cursor: pointer;">
                                <input type="checkbox" id="chkAcceptVitals" required checked />
                                <span>Patient received in clinically stable condition matching SBAR assessment.</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; cursor: pointer;">
                                <input type="checkbox" id="chkAcceptInfusions" required checked />
                                <span>IV lines, infusions, medications, and equipment verified.</span>
                            </label>
                        </div>

                        <!-- Receiving Nurse Sign-Off Form -->
                        <div class="form-group">
                            <label>Handover Disposition *</label>
                            <select class="form-control" id="acceptHandoverStatus" style="font-weight: 700;">
                                <option value="Accepted" style="color: #10b981;">🟢 ACCEPTED — Patient safely received in unit, bedside handover verified.</option>
                                <option value="Rejected" style="color: #ef4444;">🔴 REJECTED / DISPUTED — Clinical handover discrepancy noted.</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Receiving Ward Nurse Name & Credential <span style="color: red;">*</span></label>
                            <input type="text" class="form-control" id="acceptReceivingNurseName" placeholder="e.g. Nurse Jennifer Lopez, BSN, RN" required />
                        </div>

                        <div class="form-group">
                            <label>Bedside Acceptance Notes & Observations</label>
                            <textarea class="form-control" id="acceptReceivingNotes" rows="2" placeholder="e.g. Patient arrived via gurney, settled in bed, call bell in reach, telemetry connected..."></textarea>
                        </div>
                    </div>
                    <div class="inpatient-modal-footer" style="flex-shrink: 0;">
                        <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn-inpatient btn-inpatient-success" id="btnSubmitAcceptHandover">Sign & Accept Patient Handover</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: DUAL SIGNATURE HANDOVER CERTIFICATE / REPORT             -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalTransferHandoverReport">
            <div class="inpatient-modal-content" style="max-width: 720px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="inpatient-modal-header" style="flex-shrink: 0;">
                    <div>
                        <h3>📜 Nursing Clinical Handover Record</h3>
                        <div style="font-size: 11.5px; color: var(--text-muted, #64748b);">Official Dual Sign-Off Certificate & SBAR Audit Log</div>
                    </div>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <div class="inpatient-modal-body" id="transferHandoverReportContent" style="overflow-y: auto; flex: 1; padding: 20px;">
                    <div style="text-align: center; padding: 30px; color: #64748b;">Loading handover record...</div>
                </div>
                <div class="inpatient-modal-footer" style="flex-shrink: 0;">
                    <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Close</button>
                    <button type="button" class="btn-inpatient btn-inpatient-primary" id="btnPrintHandoverRecord">🖨️ Print Certificate</button>
                </div>
            </div>
        </div>


        <!-- ============================================================== -->
        <!-- MODAL: DISCHARGE PATIENT                                        -->
        <!-- ============================================================== -->
        <!-- MODAL: PATIENT DISCHARGE & CLINICAL DISCHARGE SUMMARY          -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalDischargePatient">
            <div class="inpatient-modal-content" style="max-width: 840px; width: 95%; max-height: 92vh; display: flex; flex-direction: column;">
                <div class="inpatient-modal-header" style="flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h3>📋 Inpatient Clinical Discharge Summary</h3>
                        <span id="dischargeSummaryStatusBadge" style="font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 700; background: #fef3c7; color: #b45309; text-transform: uppercase;">Draft In-Progress</span>
                    </div>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <form id="formDischargePatient" style="display: flex; flex-direction: column; overflow: hidden; height: 100%;">
                    <input type="hidden" name="admission_id" id="dischargeAdmissionId" />
                    <div class="inpatient-modal-body" style="overflow-y: auto; flex: 1; padding: 18px 24px;">
                        <div class="jcaho-notice-box" style="margin-bottom: 14px;">
                            <span>🧹</span>
                            <div>
                                <strong>JCAHO Environmental &amp; ADT Governance:</strong> Finalizing this clinical summary will officially discharge the patient, record the electronic physician signature, and automatically transition Bed to <strong>Dirty / Turnover</strong> for housekeeping terminal decontamination.
                            </div>
                        </div>

                        <!-- Patient Demographic Context -->
                        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div>
                                <div style="font-size: 15px; font-weight: 700; color: #0f172a;" id="dischargePatientName">Patient Name</div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                    Admission: <strong id="dischargeAdmissionNo" style="color: #0f172a;">--</strong> | 
                                    Bed: <strong id="dischargeBedNo" style="color: #0f172a;">--</strong> | 
                                    LOS: <strong id="dischargeLos" style="color: #0f172a;">--</strong>
                                </div>
                            </div>
                            <div id="dischargeDocNumberBox" style="font-size: 12px; color: #475569; background: #fff; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-family: monospace;">
                                Doc #: <span id="dischargeDocNumber">New Draft</span>
                            </div>
                        </div>

                        <!-- Timing, Disposition, and Condition -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Discharge Date &amp; Time <span style="color: red;">*</span></label>
                                <input type="datetime-local" class="form-control" name="discharge_date" id="dischargeDateInput" required />
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Discharge Condition <span style="color: red;">*</span></label>
                                <select class="form-control" name="discharge_condition" id="dischargeConditionSelect" required>
                                    <option value="Improved">Improved (Stable)</option>
                                    <option value="Recovered">Recovered (Resolved)</option>
                                    <option value="Deteriorated">Deteriorated</option>
                                    <option value="Against Medical Advice (AMA)">Against Medical Advice (AMA)</option>
                                    <option value="Expired">Expired / Deceased</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Discharge Disposition <span style="color: red;">*</span></label>
                                <select class="form-control" name="discharge_disposition" id="dischargeDispositionSelect" required>
                                    <option value="Discharged Home with Self-Care">Discharged Home with Self-Care</option>
                                    <option value="Discharged Home with Home Health Care">Discharged Home with Home Health Care</option>
                                    <option value="Transferred to Skilled Nursing / Rehab">Transferred to Skilled Nursing / Rehab Facility</option>
                                    <option value="Transferred to Long-Term Acute Care (LTACH)">Transferred to Long-Term Acute Care (LTACH)</option>
                                    <option value="Left Against Medical Advice (AMA)">Left Against Medical Advice (AMA)</option>
                                    <option value="Hospice / Palliative Care">Hospice / Palliative Care</option>
                                    <option value="Expired / Deceased">Expired / Deceased</option>
                                </select>
                            </div>
                        </div>

                        <!-- Diagnoses -->
                        <div class="form-grid-2" style="margin-bottom: 14px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Admitting Diagnosis <span style="color: red;">*</span></label>
                                <textarea class="form-control" name="admitting_diagnosis" id="dischargeAdmittingDiagnosis" rows="2" placeholder="Initial clinical presentation / reason for inpatient stay" required></textarea>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Final Discharge Diagnosis <span style="color: red;">*</span></label>
                                <textarea class="form-control" name="discharge_diagnosis" id="dischargeFinalDiagnosis" rows="2" placeholder="Primary and secondary confirmed discharge diagnoses" required></textarea>
                            </div>
                        </div>

                        <!-- Hospital Course -->
                        <div class="form-group" style="margin-bottom: 14px;">
                            <label>Hospital Course Summary <span style="color: red;">*</span></label>
                            <textarea class="form-control" name="hospital_course_summary" id="dischargeHospitalCourse" rows="3" placeholder="Document clinical progression, therapies administered, diagnostic investigations, and response to treatment..." required></textarea>
                        </div>

                        <!-- Procedures -->
                        <div class="form-group" style="margin-bottom: 14px;">
                            <label>Significant Procedures &amp; Interventions</label>
                            <input type="text" class="form-control" name="significant_procedures" id="dischargeProcedures" placeholder="e.g. Diagnostic Laparoscopy, Central Line Placement, Appendectomy (or None)" />
                        </div>

                        <!-- Discharge Medications -->
                        <div class="form-group" style="margin-bottom: 14px;">
                            <label>Discharge Medications &amp; Regimen Reconciliation</label>
                            <textarea class="form-control" name="discharge_medications" id="dischargeMedications" rows="3" placeholder="Document reconciled take-home medications, dosage, route, frequency, and duration..." style="font-family: monospace; font-size: 12px;"></textarea>
                        </div>

                        <!-- Diet & Activity -->
                        <div class="form-grid-2" style="margin-bottom: 14px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Dietary Instructions</label>
                                <input type="text" class="form-control" name="diet_instructions" id="dischargeDietInstructions" placeholder="e.g. Low sodium, diabetic meal plan, regular as tolerated" />
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Activity &amp; Physical Restrictions</label>
                                <input type="text" class="form-control" name="activity_restrictions" id="dischargeActivityRestrictions" placeholder="e.g. Ambulation as tolerated; no heavy lifting &gt; 10 lbs for 2 weeks" />
                            </div>
                        </div>

                        <!-- Follow-up Instructions -->
                        <div class="form-group" style="margin-bottom: 14px;">
                            <label>Follow-Up Instructions &amp; Emergency Precautions <span style="color: red;">*</span></label>
                            <textarea class="form-control" name="follow_up_instructions" id="dischargeFollowUpInstructions" rows="2" placeholder="Clinic return dates, primary physician follow-up, and red flag symptoms requiring immediate ED return..." required></textarea>
                        </div>

                        <!-- Attending Physician & Electronic Signature -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-top: 10px;">
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 10px;">
                                Attending Physician Electronic Signature &amp; Certification
                            </div>
                            <div class="form-grid-2" style="margin-bottom: 8px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label>Attending Physician Name <span style="color: red;">*</span></label>
                                    <input type="text" class="form-control" name="attending_physician_name" id="dischargePhysicianName" placeholder="Dr. Robert Martinez, MD" required />
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label>Physician License / PRC #</label>
                                    <input type="text" class="form-control" name="physician_license_number" id="dischargePhysicianLicense" placeholder="e.g. PRC-0184920" />
                                </div>
                            </div>
                            <div id="dischargeSignatureStamp" style="font-size: 11px; color: #475569; font-family: monospace; background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #cbd5e1; margin-top: 6px;">
                                Signature status: Pending electronic certification on finalization.
                            </div>
                        </div>
                    </div>
                    <div class="inpatient-modal-footer" style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 24px;">
                        <div>
                            <button type="button" class="btn-inpatient btn-inpatient-secondary" id="btnPrintDischargeSummaryPdf" style="display: inline-flex; align-items: center; gap: 6px;">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"></path></svg>
                                Print / Export PDF Summary
                            </button>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Cancel</button>
                            <button type="button" class="btn-inpatient btn-inpatient-secondary" id="btnSaveDischargeDraft" style="font-weight: 600;">💾 Save Draft</button>
                            <button type="submit" class="btn-inpatient btn-inpatient-success" id="btnFinalizeDischarge" style="font-weight: 700;">✍️ Sign, Finalize &amp; Release Bed</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: HOUSEKEEPING TERMINAL SANITIZATION                       -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalSanitizeBed">
            <div class="inpatient-modal-content" style="max-width: 500px;">
                <div class="inpatient-modal-header">
                    <h3>🧹 Terminal Environmental Cleaning Sign-off</h3>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <form id="formSanitizeBed">
                    <input type="hidden" name="bed_id" id="sanitizeBedId" />
                    <div class="inpatient-modal-body">
                        <p style="font-size: 13px; color: #475569; margin-top: 0;">
                            Confirm completion of hospital terminal cleaning and disinfection for <strong id="sanitizeBedNumber">Bed</strong>.
                        </p>

                        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; margin-bottom: 14px;">
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <input type="checkbox" checked required /> Linen stripped, bed washed with hospital-grade disinfectant
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <input type="checkbox" checked required /> High-touch surfaces (bed rails, call light, IV poles) sanitized
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" checked required /> New sanitized linens placed; ready for patient admission
                            </label>
                        </div>

                        <div class="form-group">
                            <label>Housekeeper / Sanitization Staff Sign-off</label>
                            <input type="text" class="form-control" name="staff_name" placeholder="Environmental Services Staff Name" required />
                        </div>
                    </div>
                    <div class="inpatient-modal-footer">
                        <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn-inpatient btn-inpatient-success">Sign-off & Mark Available</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: REGISTER WARD / BED                                      -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalConfigWardBed">
            <div class="inpatient-modal-content">
                <div class="inpatient-modal-header">
                    <h3>⚙️ Ward & Bed Facility Registration</h3>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <div class="inpatient-modal-body">
                    <!-- Tab Switcher inside Modal -->
                    <div style="display: flex; gap: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; padding-bottom: 8px;">
                        <button type="button" class="btn-inpatient btn-inpatient-primary" id="btnTabNewBed" style="padding: 6px 12px; font-size: 12px;">+ Add Hospital Bed</button>
                        <button type="button" class="btn-inpatient btn-inpatient-secondary" id="btnTabNewWard" style="padding: 6px 12px; font-size: 12px;">+ Add Hospital Ward</button>
                    </div>

                    <!-- Form New Bed -->
                    <form id="formNewBed">
                        <div class="form-group">
                            <label>Assigned Hospital Ward <span style="color: red;">*</span></label>
                            <select class="form-control" name="ward_id" id="newBedWardSelect" required>
                                <option value="">-- Choose Ward --</option>
                            </select>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Bed Number / Identifier <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" name="bed_number" placeholder="e.g. ICU-07, MED-205" required />
                            </div>
                            <div class="form-group">
                                <label>Room Number <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" name="room_number" placeholder="e.g. Room 205-A" required />
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Bed Classification Type <span style="color: red;">*</span></label>
                            <select class="form-control" name="bed_type" required>
                                <option value="Standard Acute Bed">Standard Acute Bed</option>
                                <option value="ICU Monitor Bed">ICU Monitor Bed</option>
                                <option value="Negative Pressure Isolation">Negative Pressure Isolation</option>
                                <option value="Stepdown Bed">Stepdown Bed</option>
                                <option value="Pediatric Crib">Pediatric Crib</option>
                                <option value="Labor & Delivery Bed">Labor & Delivery Bed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Clinical Features / Equipment</label>
                            <input type="text" class="form-control" name="features" placeholder="e.g. Ventilator, Central Telemetry, Dialysis Port, Bariatric" />
                        </div>
                        <div style="text-align: right; margin-top: 16px;">
                            <button type="submit" class="btn-inpatient btn-inpatient-primary">Save New Bed</button>
                        </div>
                    </form>

                    <!-- Form New Ward (Hidden by default) -->
                    <form id="formNewWard" style="display: none;">
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Ward Code <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" name="ward_code" placeholder="e.g. MAT, ONC, NEURO" required />
                            </div>
                            <div class="form-group">
                                <label>Ward Display Name <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" name="ward_name" placeholder="e.g. Oncology Inpatient Ward" required />
                            </div>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Ward Classification Type <span style="color: red;">*</span></label>
                                <select class="form-control" name="ward_type" required>
                                    <option value="Medical">Medical Ward</option>
                                    <option value="Surgical">Surgical Ward</option>
                                    <option value="ICU">Intensive Care Unit (ICU)</option>
                                    <option value="Pediatric">Pediatric Unit</option>
                                    <option value="Isolation">Isolation Rooms</option>
                                    <option value="Maternity">Maternity Unit</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Gender Restriction</label>
                                <select class="form-control" name="gender_restriction">
                                    <option value="All">All / Co-ed</option>
                                    <option value="Male Only">Male Only</option>
                                    <option value="Female Only">Female Only</option>
                                    <option value="Pediatric">Pediatric</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Floor / Wing Location</label>
                                <input type="text" class="form-control" name="floor_location" placeholder="e.g. 4th Floor - East Wing" />
                            </div>
                            <div class="form-group">
                                <label>Head Nurse / Nurse Manager</label>
                                <input type="text" class="form-control" name="head_nurse" placeholder="Nurse Manager Name, BSN" />
                            </div>
                        </div>
                        <div style="text-align: right; margin-top: 16px;">
                            <button type="submit" class="btn-inpatient btn-inpatient-primary">Save New Ward</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: DAILY DOCTOR WARD ROUNDS (inpatient_daily_rounds)        -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalDailyWardRound">
            <div class="inpatient-modal-content" style="max-width: 900px; width: 95%; max-height: 94vh; display: flex; flex-direction: column;">
                <div class="inpatient-modal-header" style="flex-shrink: 0; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fff;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">🩺</span>
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: #fff;">Daily Doctor Ward Round</h3>
                            <span style="font-size: 11px; color: #94a3b8;">Structured inpatient morning progression &amp; clinical trajectory note</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span id="dailyRoundNumberBadge" style="font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 700; background: #38bdf8; color: #0f172a; font-family: monospace;">New Round</span>
                        <button class="inpatient-modal-close" data-close-modal style="color: #cbd5e1;">&times;</button>
                    </div>
                </div>

                <!-- Patient Demographic Banner -->
                <div style="background: #f1f5f9; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; flex-shrink: 0;">
                    <div>
                        <div style="font-size: 15px; font-weight: 700; color: #0f172a;" id="roundPatientName">Patient Name</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                            MRN: <strong id="roundPatientMrn" style="color: #0f172a;">--</strong> |
                            Age/Gender: <strong id="roundPatientAgeGender" style="color: #0f172a;">--</strong> |
                            Ward/Bed: <strong id="roundBedNo" style="color: #0f172a;">--</strong> |
                            LOS: <strong id="roundLos" style="color: #0f172a;">--</strong>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: #475569;">
                            Diagnosis: <strong id="roundAdmittingDiag" style="color: #0f172a;">--</strong>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            Attending: <span id="roundAttendingPhysician">--</span>
                        </div>
                    </div>
                </div>

                <!-- Tab Navigation: New Round vs History -->
                <div style="display: flex; border-bottom: 1px solid #e2e8f0; background: #fff; padding: 0 20px; flex-shrink: 0;">
                    <button type="button" id="tabBtnNewRound" class="daily-round-tab active" style="padding: 10px 18px; border: none; background: transparent; font-weight: 600; font-size: 13px; color: #2563eb; border-bottom: 2px solid #2563eb; cursor: pointer;">
                        📝 Document Today's Round
                    </button>
                    <button type="button" id="tabBtnRoundHistory" class="daily-round-tab" style="padding: 10px 18px; border: none; background: transparent; font-weight: 600; font-size: 13px; color: #64748b; border-bottom: 2px solid transparent; cursor: pointer;">
                        📜 Round History &amp; Trajectory (<span id="roundHistoryCount">0</span>)
                    </button>
                </div>

                <!-- Form & Body Container -->
                <form id="formDailyWardRound" style="display: flex; flex-direction: column; overflow: hidden; height: 100%; margin: 0;">
                    <input type="hidden" name="admission_id" id="roundAdmissionId" />
                    <input type="hidden" name="patient_id" id="roundPatientId" />
                    <input type="hidden" name="id" id="roundRecordId" />

                    <!-- TAB PANE 1: DOCUMENT ROUND -->
                    <div id="paneNewRound" class="inpatient-modal-body" style="overflow-y: auto; flex: 1; padding: 18px 24px;">
                        <!-- Row: Date/Time, Rounding Physician, Target Discharge Date -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">Round Date &amp; Time <span style="color: red;">*</span></label>
                                <input type="datetime-local" class="form-control" name="round_datetime" id="roundDateTimeInput" required style="width: 100%; padding: 7px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px;" />
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">Rounding Physician <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" name="rounding_physician_name" id="roundPhysicianNameInput" placeholder="Dr. First Last, MD" required style="width: 100%; padding: 7px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px;" />
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">Target Discharge Date</label>
                                <input type="date" class="form-control" name="target_discharge_date" id="roundTargetDischargeInput" style="width: 100%; padding: 7px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px;" />
                            </div>
                        </div>

                        <!-- Clinical Trajectory Selector -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                            <label style="font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
                                🎯 Clinical Trajectory <span style="color: red;">*</span>
                            </label>
                            <input type="hidden" name="clinical_trajectory" id="roundTrajectoryInput" value="Stable" />
                            <div id="roundTrajectoryButtonGroup" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                                <button type="button" class="trajectory-btn" data-val="Critical" style="padding: 8px 6px; border-radius: 6px; border: 2px solid #e2e8f0; background: #fff; color: #dc2626; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center; transition: all 0.15s;">
                                    🔴 Critical
                                </button>
                                <button type="button" class="trajectory-btn" data-val="Guarded" style="padding: 8px 6px; border-radius: 6px; border: 2px solid #e2e8f0; background: #fff; color: #ea580c; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center; transition: all 0.15s;">
                                    🟠 Guarded
                                </button>
                                <button type="button" class="trajectory-btn active-trajectory" data-val="Stable" style="padding: 8px 6px; border-radius: 6px; border: 2px solid #ca8a04; background: #fef9c3; color: #854d0e; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center; transition: all 0.15s;">
                                    🟡 Stable
                                </button>
                                <button type="button" class="trajectory-btn" data-val="Improving" style="padding: 8px 6px; border-radius: 6px; border: 2px solid #e2e8f0; background: #fff; color: #16a34a; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center; transition: all 0.15s;">
                                    🟢 Improving
                                </button>
                                <button type="button" class="trajectory-btn" data-val="Discharge Ready" style="padding: 8px 6px; border-radius: 6px; border: 2px solid #e2e8f0; background: #fff; color: #0284c7; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center; transition: all 0.15s;">
                                    🔵 Discharge Ready
                                </button>
                            </div>
                            <div id="roundTrajectoryDesc" style="font-size: 11px; color: #64748b; margin-top: 8px; font-style: italic;">
                                Vital signs stable, acute symptoms controlled, progressing on regimen.
                            </div>
                        </div>

                        <!-- Diet and Activity Orders -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">🍲 Diet Order</label>
                                <select class="form-control" name="diet_order" id="roundDietSelect" style="width: 100%; padding: 7px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px;">
                                    <option value="Regular Diet">Regular Diet</option>
                                    <option value="Low Salt / Low Sodium Diet">Low Salt / Low Sodium Diet</option>
                                    <option value="Diabetic / Consistent Carb Diet">Diabetic / Consistent Carb Diet</option>
                                    <option value="Renal Diet">Renal Diet</option>
                                    <option value="Soft / Easy to Chew Diet">Soft / Easy to Chew Diet</option>
                                    <option value="Pureed Diet">Pureed Diet</option>
                                    <option value="Full Liquid Diet">Full Liquid Diet</option>
                                    <option value="Clear Liquid Diet">Clear Liquid Diet</option>
                                    <option value="NPO (Nil Per Os / Nothing by mouth)">NPO (Nil Per Os / Nothing by mouth)</option>
                                    <option value="Enteral / Tube Feeding">Enteral / Tube Feeding</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">🚶 Activity / Mobilization Order</label>
                                <select class="form-control" name="activity_order" id="roundActivitySelect" style="width: 100%; padding: 7px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px;">
                                    <option value="Ambulate as tolerated / Ad lib">Ambulate as tolerated / Ad lib</option>
                                    <option value="Ambulate with assistance">Ambulate with assistance</option>
                                    <option value="Up in chair as tolerated">Up in chair as tolerated</option>
                                    <option value="Dangle at bedside">Dangle at bedside</option>
                                    <option value="Bedrest with Bathroom Privileges (BRP)">Bedrest with Bathroom Privileges (BRP)</option>
                                    <option value="Strict Bedrest">Strict Bedrest</option>
                                </select>
                            </div>
                        </div>

                        <!-- Structured SOAP Clinical Notes -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                                    <span>🗣️ Subjective Observations</span>
                                    <span style="font-weight: 400; font-size: 11px; color: #94a3b8;">Overnight events, symptoms, pain</span>
                                </label>
                                <textarea class="form-control" name="subjective" id="roundSubjectiveInput" rows="4" placeholder="Patient reports improved sleep. No chest pain or SOB overnight. Tolerating oral fluids well. Pain score 2/10 at surgical site..." style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px; font-family: inherit; resize: vertical;"></textarea>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                                    <span>🔬 Objective Physical Exam &amp; Vitals</span>
                                    <span style="font-weight: 400; font-size: 11px; color: #94a3b8;">Physical exam, labs, telemetry, I/O</span>
                                </label>
                                <textarea class="form-control" name="objective" id="roundObjectiveInput" rows="4" placeholder="Vitals: BP 122/78, HR 74 regular, SpO2 98% room air, Temp 36.8C. Lungs clear bilaterally. Abdomen soft, non-tender. Dressing clean, dry, and intact..." style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px; font-family: inherit; resize: vertical;"></textarea>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                                    <span>🧠 Clinical Assessment <span style="color: red;">*</span></span>
                                    <span style="font-weight: 400; font-size: 11px; color: #94a3b8;">Impression, progress</span>
                                </label>
                                <textarea class="form-control" name="assessment" id="roundAssessmentInput" rows="4" required placeholder="POD #2 laparoscopic appendectomy, clinically improving. Acute inflammatory response resolving. Afebrile with normalizing leukocytosis..." style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px; font-family: inherit; resize: vertical;"></textarea>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                                    <span>📋 Daily Treatment Plan <span style="color: red;">*</span></span>
                                    <span style="font-weight: 400; font-size: 11px; color: #94a3b8;">Meds, diagnostics, IV, consults</span>
                                </label>
                                <textarea class="form-control" name="plan" id="roundPlanInput" rows="4" required placeholder="1. Discontinue IV maintenance fluids; encourage PO hydration.&#10;2. Transition to oral analgesics (Paracetamol 1g PO Q8H PRN).&#10;3. Advance diet to Regular. Ambulate TID.&#10;4. Anticipate discharge tomorrow if tolerating diet..." style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px; font-family: inherit; resize: vertical;"></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- TAB PANE 2: ROUND HISTORY -->
                    <div id="paneRoundHistory" class="inpatient-modal-body" style="overflow-y: auto; flex: 1; padding: 18px 24px; display: none;">
                        <div id="dailyRoundHistoryList">
                            <!-- Populated dynamically via renderRoundHistory() -->
                        </div>
                    </div>

                    <!-- Footer Controls -->
                    <div class="inpatient-modal-footer" style="padding: 12px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                            <span>🔒</span> Ward round entries are time-stamped with audit attribution and sync to EHR timeline.
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Close</button>
                            <button type="submit" class="btn-inpatient btn-inpatient-primary" id="btnSubmitDailyRound">💾 Save Ward Round</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>


    </div>
    `;
}
