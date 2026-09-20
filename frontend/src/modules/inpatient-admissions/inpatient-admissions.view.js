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
        <!-- MODAL: TRANSFER PATIENT                                         -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalTransferPatient">
            <div class="inpatient-modal-content">
                <div class="inpatient-modal-header">
                    <h3>🔄 Electronic Patient Transfer (Bed-to-Bed / Ward-to-Ward)</h3>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <form id="formTransferPatient">
                    <div class="inpatient-modal-body">
                        <div class="jcaho-notice-box">
                            <span>🛡️</span>
                            <div>
                                <strong>Infection Control & Safety Protocol:</strong> The vacated bed will automatically transition to <strong>Dirty / Turnover</strong> and will require terminal housekeeping sanitization.
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Active Inpatient to Transfer <span style="color: red;">*</span></label>
                            <select class="form-control" name="admission_id" id="transferAdmissionSelect" required>
                                <option value="">-- Choose Admitted Patient --</option>
                                <!-- Populated dynamically -->
                            </select>
                        </div>

                        <div class="form-group" id="transferCurrentLocationBox" style="display: none;">
                            <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                                <strong>Current Location:</strong> <span id="transferCurrentLocText">--</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Destination Hospital Bed (Available Only) <span style="color: red;">*</span></label>
                            <select class="form-control" name="to_bed_id" id="transferToBedSelect" required>
                                <option value="">-- Choose Destination Bed --</option>
                                <!-- Populated dynamically -->
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Reason for Transfer <span style="color: red;">*</span></label>
                            <input type="text" class="form-control" name="transfer_reason" placeholder="e.g. Clinical escalation to ICU, Post-op surgical stepdown, Isolation requirement" required />
                        </div>

                        <div class="form-group">
                            <label>Clinical Handover & Transfer Notes</label>
                            <textarea class="form-control" name="transfer_notes" rows="3" placeholder="Document patient condition, IV infusions, oxygen requirements, nursing handoff report..."></textarea>
                        </div>

                        <div class="form-group">
                            <label>Transferred By (Nurse / Physician)</label>
                            <input type="text" class="form-control" name="transferred_by" placeholder="Charge Nurse / Attending Doctor" />
                        </div>
                    </div>
                    <div class="inpatient-modal-footer">
                        <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn-inpatient btn-inpatient-primary">Authorize & Complete Transfer</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: DISCHARGE PATIENT                                        -->
        <!-- ============================================================== -->
        <div class="inpatient-modal-backdrop" id="modalDischargePatient">
            <div class="inpatient-modal-content">
                <div class="inpatient-modal-header">
                    <h3>🚪 Inpatient Discharge & Disposition</h3>
                    <button class="inpatient-modal-close" data-close-modal>&times;</button>
                </div>
                <form id="formDischargePatient">
                    <input type="hidden" name="admission_id" id="dischargeAdmissionId" />
                    <div class="inpatient-modal-body">
                        <div class="jcaho-notice-box">
                            <span>🧹</span>
                            <div>
                                <strong>JCAHO Terminal Cleaning Mandate:</strong> Discharging this patient will release the bed and automatically mark it as <strong>Dirty / Turnover</strong>. A terminal disinfection sign-off will be required before another patient can be admitted.
                            </div>
                        </div>

                        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a;" id="dischargePatientName">Patient Name</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                Admission: <span id="dischargeAdmissionNo">--</span> | Bed: <span id="dischargeBedNo">--</span> | LOS: <span id="dischargeLos">--</span>
                            </div>
                        </div>

                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Discharge Date & Time <span style="color: red;">*</span></label>
                                <input type="datetime-local" class="form-control" name="discharge_date" id="dischargeDateInput" required />
                            </div>
                            <div class="form-group">
                                <label>Discharge Disposition <span style="color: red;">*</span></label>
                                <select class="form-control" name="discharge_disposition" required>
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

                        <div class="form-group">
                            <label>Discharging Attending Physician</label>
                            <input type="text" class="form-control" name="discharge_physician" id="dischargePhysician" placeholder="Dr. Robert Martinez, MD" />
                        </div>

                        <div class="form-group">
                            <label>Discharge Summary & Take-Home Instructions</label>
                            <textarea class="form-control" name="discharge_notes" rows="3" placeholder="Document post-discharge instructions, follow-up appointments, wound care, prescription reconciliation..."></textarea>
                        </div>
                    </div>
                    <div class="inpatient-modal-footer">
                        <button type="button" class="btn-inpatient btn-inpatient-secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn-inpatient btn-inpatient-success">Finalize Discharge & Release Bed</button>
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

    </div>
    `;
}
