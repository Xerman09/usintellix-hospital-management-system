export function HipaaAuditView(options = {})
{
    const initialTab = options.initialTab || 'auth';

    return `
    <style>
        .hipaa-audit-wrapper {
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .hipaa-audit-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 20px;
        }
        .hipaa-audit-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 8px;
        }
        .hipaa-compliance-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11.5px;
            font-weight: 600;
            letter-spacing: 0.02em;
        }
        .hipaa-pill-retention {
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .hipaa-pill-hash {
            background: #eff6ff;
            color: #1e40af;
            border: 1px solid #bfdbfe;
        }
        .hipaa-pill-diffs {
            background: #fdf4ff;
            color: #86198f;
            border: 1px solid #f0abfc;
        }
        .hipaa-pill-auth {
            background: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        .hipaa-audit-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
        }
        .hipaa-audit-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .hipaa-badge-auth { background: #e0e7ff; color: #3730a3; }
        .hipaa-badge-chart { background: #dbeafe; color: #1e40af; }
        .hipaa-badge-emergency { background: #fee2e2; color: #991b1b; }
        .hipaa-badge-export { background: #fef3c7; color: #92400e; }
        .hipaa-badge-security { background: #f3e8ff; color: #6b21a8; }
        .hipaa-hash-cell {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11.5px;
            color: #475569;
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .hipaa-verify-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13.5px;
        }
        .hipaa-verify-card.status-verified {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
        }
        .hipaa-verify-card.status-tampered {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
        }
        .hipaa-retention-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 20px;
            color: #1e293b;
        }
        .hipaa-retention-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 12px;
        }
        .hipaa-retention-stat {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
        }
        .hipaa-retention-stat-label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 2px;
        }
        .hipaa-retention-stat-val {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
        }

        /* Unified KPI Grid */
        .unified-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .unified-kpi-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .unified-kpi-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        .unified-kpi-title {
            font-size: 11.5px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .unified-kpi-value {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
        }
        .unified-kpi-subtext {
            font-size: 12px;
            color: #64748b;
        }

        /* Top Module Navigation Pills */
        .audit-mode-selector {
            display: flex;
            gap: 6px;
            background: #f1f5f9;
            padding: 4px;
            border-radius: 8px;
            margin-bottom: 20px;
            width: fit-content;
            flex-wrap: wrap;
        }
        .audit-mode-btn {
            border: none;
            background: transparent;
            padding: 8px 18px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease-in-out;
        }
        .audit-mode-btn:hover {
            color: #0f172a;
        }
        .audit-mode-btn.active {
            background: #ffffff;
            color: #2563eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Auth Subtab Buttons */
        .auth-subtab-group {
            display: flex;
            gap: 6px;
            margin-bottom: 16px;
        }
        .auth-subtab-btn {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 12.5px;
            font-weight: 600;
            color: #475569;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        .auth-subtab-btn.active {
            background: #2563eb;
            color: #ffffff;
            border-color: #2563eb;
        }

        /* Live session pulse indicator */
        @keyframes pulseGreen {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .live-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-block;
            animation: pulseGreen 2s infinite;
        }

        /* Auth Badges */
        .auth-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-transform: uppercase;
        }
        .auth-badge-success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .auth-badge-failed { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .auth-badge-locked { background: #450a0a; color: #fecaca; border: 1px solid #991b1b; }
        .auth-badge-2fa { background: #e0e7ff; color: #3730a3; border: 1px solid #a5b4fc; }
        .auth-badge-revoked { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
        .auth-badge-logout { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

        /* Diff Badges */
        .diff-action-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-transform: uppercase;
        }
        .diff-action-create { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
        .diff-action-update { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .diff-action-delete { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .diff-field-chip {
            display: inline-block;
            background: #f1f5f9;
            color: #334155;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 11.5px;
            font-family: ui-monospace, Menlo, Consolas, monospace;
            margin: 2px 3px 2px 0;
            border: 1px solid #e2e8f0;
        }
        .diff-table-chip {
            display: inline-block;
            font-weight: 600;
            color: #0f172a;
            font-family: ui-monospace, Menlo, Consolas, monospace;
            background: #f8fafc;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
        }

        /* Modal Styles */
        .diff-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .diff-modal-content {
            background: #ffffff;
            border-radius: 12px;
            max-width: 980px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            animation: modalFadeIn 0.2s ease-out;
        }
        @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
        }
        .diff-modal-header {
            padding: 16px 24px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .diff-modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }
        .diff-modal-footer {
            padding: 14px 24px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        /* Side-by-side comparison boxes */
        .diff-side-by-side {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
        }
        @media (max-width: 768px) {
            .diff-side-by-side {
                grid-template-columns: 1fr;
            }
        }
        .diff-box {
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
        }
        .diff-box-old {
            background: #fef2f2;
            border: 1px solid #fecaca;
        }
        .diff-box-new {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }
        .diff-box-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 12px;
        }
        .diff-box-old .diff-box-title { color: #991b1b; }
        .diff-box-new .diff-box-title { color: #166534; }
        .diff-table-grid {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .diff-table-grid th {
            background: #f8fafc;
            padding: 10px 14px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
        }
        .diff-table-grid td {
            padding: 10px 14px;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            vertical-align: top;
        }
        .diff-cell-old { background: #fef2f2; color: #991b1b; font-weight: 500; word-break: break-word; }
        .diff-cell-new { background: #f0fdf4; color: #166534; font-weight: 500; word-break: break-word; }

        /* Dark Mode */
        :root[data-theme="dark"] .hipaa-audit-wrapper { color: #e2e8f0; }
        :root[data-theme="dark"] .hipaa-audit-header h1 { color: #f8fafc !important; }
        :root[data-theme="dark"] .hipaa-pill-retention { background: #064e3b; color: #a7f3d0; border-color: #047857; }
        :root[data-theme="dark"] .hipaa-pill-hash { background: #1e3a8a; color: #bfdbfe; border-color: #2563eb; }
        :root[data-theme="dark"] .hipaa-pill-diffs { background: #581c87; color: #f0abfc; border-color: #7e22ce; }
        :root[data-theme="dark"] .hipaa-pill-auth { background: #064e3b; color: #86efac; border-color: #059669; }
        :root[data-theme="dark"] .audit-mode-selector { background: #0f172a; }
        :root[data-theme="dark"] .audit-mode-btn { color: #94a3b8; }
        :root[data-theme="dark"] .audit-mode-btn.active { background: #1e293b; color: #60a5fa; }
        :root[data-theme="dark"] .unified-kpi-card { background: #1e293b; border-color: #334155; }
        :root[data-theme="dark"] .unified-kpi-value { color: #f8fafc; }
        :root[data-theme="dark"] .auth-subtab-btn { background: #0f172a; border-color: #334155; color: #94a3b8; }
        :root[data-theme="dark"] .auth-subtab-btn.active { background: #2563eb; color: #ffffff; }
        :root[data-theme="dark"] .hipaa-audit-wrapper .card { background: #1e293b !important; border-color: #334155 !important; }
        :root[data-theme="dark"] .hipaa-audit-wrapper label { color: #cbd5e1 !important; }
        :root[data-theme="dark"] .hipaa-audit-wrapper input,
        :root[data-theme="dark"] .hipaa-audit-wrapper select {
            background: #0f172a !important;
            border-color: #334155 !important;
            color: #f8fafc !important;
            color-scheme: dark;
        }
        :root[data-theme="dark"] .hipaa-audit-wrapper thead { background: #0f172a !important; border-bottom-color: #334155 !important; }
        :root[data-theme="dark"] .hipaa-audit-wrapper th { color: #94a3b8 !important; }
        :root[data-theme="dark"] .hipaa-audit-wrapper td { color: #e2e8f0 !important; border-bottom-color: #334155 !important; }
        :root[data-theme="dark"] .hipaa-hash-cell { background: #0f172a; color: #94a3b8; }
        :root[data-theme="dark"] #hipaaPaginationBar,
        :root[data-theme="dark"] #diffsPaginationBar,
        :root[data-theme="dark"] #authPaginationBar {
            background: #0f172a !important;
            border-top-color: #334155 !important;
            color: #94a3b8 !important;
        }
        :root[data-theme="dark"] .diff-field-chip { background: #0f172a; border-color: #334155; color: #94a3b8; }
        :root[data-theme="dark"] .diff-table-chip { background: #0f172a; border-color: #334155; color: #e2e8f0; }
        :root[data-theme="dark"] .diff-modal-content { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
        :root[data-theme="dark"] .diff-modal-header,
        :root[data-theme="dark"] .diff-modal-footer { background: #0f172a; border-color: #334155; }
        :root[data-theme="dark"] .diff-box-old { background: rgba(153, 27, 27, 0.2); border-color: #7f1d1d; }
        :root[data-theme="dark"] .diff-box-old .diff-box-title { color: #fca5a5; }
        :root[data-theme="dark"] .diff-box-new { background: rgba(22, 101, 52, 0.2); border-color: #14532d; }
        :root[data-theme="dark"] .diff-box-new .diff-box-title { color: #86efac; }
        :root[data-theme="dark"] .diff-table-grid { background: #0f172a; border-color: #334155; }
        :root[data-theme="dark"] .diff-table-grid th { background: #1e293b; color: #94a3b8; border-color: #334155; }
        :root[data-theme="dark"] .diff-table-grid td { border-color: #334155; }
        :root[data-theme="dark"] .diff-cell-old { background: rgba(153, 27, 27, 0.25); color: #fca5a5; }
        :root[data-theme="dark"] .diff-cell-new { background: rgba(22, 101, 52, 0.25); color: #86efac; }
    </style>

    <div class="hipaa-audit-wrapper">
        <div class="hipaa-audit-header">
            <div>
                <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 4px;">
                    Unified System &amp; Security Logs Console
                </h1>
                <p style="font-size: 13px; color: #64748b; margin: 0;">
                    Centralized governance dashboard for Authentication &amp; Active Sessions, Granular Data Change Diffs, and Cryptographic HMAC Audit Trails.
                </p>
                <div class="hipaa-audit-badges">
                    <span class="hipaa-compliance-pill hipaa-pill-auth">
                        <span class="live-dot"></span>
                        Active Session Guard: Online
                    </span>
                    <span class="hipaa-compliance-pill hipaa-pill-retention">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        § 164.316(b)(2)(i): 6-Year Immutable Lock Active
                    </span>
                    <span class="hipaa-compliance-pill hipaa-pill-hash">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                        § 164.312(b): HMAC-SHA256 Chained
                    </span>
                    <span class="hipaa-compliance-pill hipaa-pill-diffs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Granular Diff Snapshots: Active
                    </span>
                </div>
            </div>
            <div class="hipaa-audit-actions">
                <button id="btnRetentionPolicyModal" class="btn btn-outline-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-weight: 600;">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Retention Policy
                </button>
                <button id="btnVerifyChain" class="btn btn-outline-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-weight: 600;">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="m9 12 2 2 4-4"/>
                    </svg>
                    Verify Chain
                </button>
                <button id="btnExportHipaaCsv" class="btn btn-success btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-weight: 600; background: #059669; border-color: #059669; color: #ffffff;">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export CSV
                </button>
                <button id="btnExportHipaaPdf" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-weight: 600; background: #2563eb; border-color: #2563eb; color: #ffffff;">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Export PDF Report
                </button>
            </div>
        </div>

        <!-- Real-Time Top Unified KPIs -->
        <div class="unified-kpi-grid">
            <div class="unified-kpi-card">
                <div class="unified-kpi-top">
                    <span class="unified-kpi-title">Active User Sessions</span>
                    <span class="live-dot" title="Real-Time Active Sessions Monitor"></span>
                </div>
                <div class="unified-kpi-value" id="kpiActiveSessions">--</div>
                <div class="unified-kpi-subtext" id="kpiActiveSessionsSub">Live concurrent users</div>
            </div>

            <div class="unified-kpi-card">
                <div class="unified-kpi-top">
                    <span class="unified-kpi-title">24h Logins &amp; Challenges</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                </div>
                <div class="unified-kpi-value" id="kpiAuthSuccess">--</div>
                <div class="unified-kpi-subtext" id="kpiAuthFailed">-- failed challenges</div>
            </div>

            <div class="unified-kpi-card">
                <div class="unified-kpi-top">
                    <span class="unified-kpi-title">Data Change Diffs</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div class="unified-kpi-value" id="kpiDataDiffs">--</div>
                <div class="unified-kpi-subtext">Granular entity deltas</div>
            </div>

            <div class="unified-kpi-card">
                <div class="unified-kpi-top">
                    <span class="unified-kpi-title">Cryptographic Logs</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="unified-kpi-value" id="kpiTotalHmac">--</div>
                <div class="unified-kpi-subtext">SHA-256 HMAC chained</div>
            </div>
        </div>

        <div id="hipaaRetentionPolicyContainer" style="display: none;"></div>
        <div id="hipaaVerifyResultContainer" style="display: none;"></div>

        <!-- Centralized Mode Selector: 3 Core Security Consoles -->
        <div class="audit-mode-selector">
            <button id="btnTabAuth" class="audit-mode-btn ${initialTab === 'auth' ? 'active' : ''}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Authentication &amp; Session Logs
            </button>
            <button id="btnTabDiffs" class="audit-mode-btn ${initialTab === 'diffs' ? 'active' : ''}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Data Change Diffs (Field Snapshots)
            </button>
            <button id="btnTabActivity" class="audit-mode-btn ${initialTab === 'activity' || initialTab === 'hmac' ? 'active' : ''}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Cryptographic HMAC Audit Trails (§ 164.312(b))
            </button>
        </div>

        <!-- ========================================== -->
        <!-- CONSOLE 1: AUTHENTICATION & SESSION LOGS   -->
        <!-- ========================================== -->
        <div id="hipaaAuthSection" style="${initialTab === 'auth' ? '' : 'display: none;'}">
            <!-- Sub-Switcher: Events vs Active Sessions -->
            <div class="auth-subtab-group">
                <button id="btnSubTabEvents" class="auth-subtab-btn active">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Authentication Events &amp; Lockouts
                </button>
                <button id="btnSubTabSessions" class="auth-subtab-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    Active &amp; Concurrent User Sessions
                </button>
            </div>

            <!-- Auth Filters -->
            <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: flex-end;">
                    <div id="authFilterActionGroup">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Event Action</label>
                        <select id="authFilterAction" class="form-control form-select-sm" style="width: 100%;">
                            <option value="">All Security Events</option>
                            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS (Authenticated)</option>
                            <option value="LOGIN_FAILED">LOGIN_FAILED (Challenge Failed)</option>
                            <option value="ACCOUNT_LOCKED">ACCOUNT_LOCKED (Brute-Force Guard)</option>
                            <option value="2FA_OTP_VERIFIED">2FA_OTP_VERIFIED (Two-Factor Passed)</option>
                            <option value="LOGOUT">LOGOUT (Session Ended)</option>
                            <option value="SESSION_REVOKED">SESSION_REVOKED (Admin Force-Logout)</option>
                        </select>
                    </div>

                    <div id="authFilterStatusGroup" style="display: none;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Session Status</label>
                        <select id="authFilterStatus" class="form-control form-select-sm" style="width: 100%;">
                            <option value="">All Session States</option>
                            <option value="active" selected>Active / Online Sessions Only</option>
                            <option value="inactive">Terminated / Revoked Sessions</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">From Date</label>
                        <input type="date" id="authFilterDateFrom" class="form-control form-control-sm" style="width: 100%;">
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">To Date</label>
                        <input type="date" id="authFilterDateTo" class="form-control form-control-sm" style="width: 100%;">
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Search Keyword</label>
                        <input type="text" id="authFilterSearch" class="form-control form-control-sm" placeholder="User, IP, device, reason..." style="width: 100%;">
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button id="btnApplyAuthFilters" class="btn btn-sm btn-primary" style="flex: 1; font-weight: 600;">Filter</button>
                        <button id="btnResetAuthFilters" class="btn btn-sm btn-secondary" style="flex: 1; font-weight: 600;">Reset</button>
                    </div>
                </div>
            </div>

            <!-- Auth Data Table Card -->
            <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto;">
                    <table class="table mb-0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead id="authTableHead" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <tr>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 60px;">ID</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 160px;">Timestamp</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">User Identity</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 140px;">Event Action</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Security Narrative &amp; Details</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 130px;">IP Address</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 160px;">Client User-Agent</th>
                            </tr>
                        </thead>
                        <tbody id="authTableBody">
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">
                                    Loading authentication records...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Auth Pagination Bar -->
                <div id="authPaginationBar" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
                    <span id="authPageInfo">Showing page 1</span>
                    <div style="display: flex; gap: 8px;">
                        <button id="btnAuthPrevPage" class="btn btn-sm btn-outline-secondary" disabled>&larr; Previous</button>
                        <button id="btnAuthNextPage" class="btn btn-sm btn-outline-secondary" disabled>Next &rarr;</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========================================== -->
        <!-- CONSOLE 2: DATA CHANGE DIFFS               -->
        <!-- ========================================== -->
        <div id="hipaaDiffsSection" style="${initialTab === 'diffs' ? '' : 'display: none;'}">
            <!-- Filter Bar for Diffs -->
            <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: flex-end;">
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Table Name</label>
                        <select id="diffFilterTable" class="form-control form-select-sm" style="width: 100%;">
                            <option value="">All Audited Tables</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Action</label>
                        <select id="diffFilterAction" class="form-control form-select-sm" style="width: 100%;">
                            <option value="">All Actions</option>
                            <option value="UPDATE">UPDATE (Modifications)</option>
                            <option value="CREATE">CREATE (Insertions)</option>
                            <option value="DELETE">DELETE (Removals)</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">From Date</label>
                        <input type="date" id="diffFilterDateFrom" class="form-control form-control-sm" style="width: 100%;">
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">To Date</label>
                        <input type="date" id="diffFilterDateTo" class="form-control form-control-sm" style="width: 100%;">
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Search Keyword</label>
                        <input type="text" id="diffFilterSearch" class="form-control form-control-sm" placeholder="Table, record ID, user, field..." style="width: 100%;">
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button id="btnApplyDiffFilters" class="btn btn-sm btn-primary" style="flex: 1; font-weight: 600;">Filter</button>
                        <button id="btnResetDiffFilters" class="btn btn-sm btn-secondary" style="flex: 1; font-weight: 600;">Reset</button>
                    </div>
                </div>
            </div>

            <!-- Diffs Table Card -->
            <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto;">
                    <table class="table mb-0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <tr>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 60px;">ID</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 150px;">Timestamp</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Audited Entity / Table</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 100px;">Record ID</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; width: 100px;">Action</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Modified Attributes</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Editor / User</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">IP Address</th>
                                <th style="padding: 10px 14px; text-align: center; font-weight: 600; color: #475569; width: 110px;">Inspection</th>
                            </tr>
                        </thead>
                        <tbody id="diffsTableBody">
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
                                    Loading entity data diffs...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Diffs Pagination Bar -->
                <div id="diffsPaginationBar" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
                    <span id="diffsPageInfo">Showing page 1</span>
                    <div style="display: flex; gap: 8px;">
                        <button id="btnDiffsPrevPage" class="btn btn-sm btn-outline-secondary" disabled>&larr; Previous</button>
                        <button id="btnDiffsNextPage" class="btn btn-sm btn-outline-secondary" disabled>Next &rarr;</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========================================== -->
        <!-- CONSOLE 3: CRYPTOGRAPHIC HMAC AUDIT TRAILS -->
        <!-- ========================================== -->
        <div id="hipaaActivitySection" style="${initialTab === 'activity' || initialTab === 'hmac' ? '' : 'display: none;'}">
            <!-- Filters Section -->
            <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: flex-end;">
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Category</label>
                        <select id="hipaaFilterCategory" class="form-control form-select-sm" style="width: 100%;">
                            <option value="">All Categories</option>
                            <option value="AUTHENTICATION">Authentication</option>
                            <option value="CHART_ACCESS">Chart Access</option>
                            <option value="CLINICAL_DATA">Clinical Data</option>
                            <option value="EXPORT_PRINT">Export &amp; Print</option>
                            <option value="EMERGENCY_ACCESS">Emergency Access (Break-Glass)</option>
                            <option value="ADMIN_SECURITY">Administrative &amp; Security</option>
                            <option value="DISCLOSURE">Accounting of Disclosures</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">From Date</label>
                        <input type="date" id="hipaaFilterDateFrom" class="form-control form-control-sm" style="width: 100%;">
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">To Date</label>
                        <input type="date" id="hipaaFilterDateTo" class="form-control form-control-sm" style="width: 100%;">
                    </div>

                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Search Keyword</label>
                        <input type="text" id="hipaaFilterSearch" class="form-control form-control-sm" placeholder="User, patient, description..." style="width: 100%;">
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button id="btnApplyHipaaFilters" class="btn btn-sm btn-primary" style="flex: 1; font-weight: 600;">Filter</button>
                        <button id="btnResetHipaaFilters" class="btn btn-sm btn-secondary" style="flex: 1; font-weight: 600;">Reset</button>
                    </div>
                </div>
            </div>

            <!-- Audit Table Card -->
            <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto;">
                    <table class="table mb-0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <tr>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">ID</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Timestamp (UTC)</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Category</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Action</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">User</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Patient</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Details / Justification</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">IP Address</th>
                                <th style="padding: 10px 14px; text-align: left; font-weight: 600; color: #475569;">Tamper Hash</th>
                            </tr>
                        </thead>
                        <tbody id="hipaaAuditTableBody">
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
                                    Loading HIPAA audit logs...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination Bar -->
                <div id="hipaaPaginationBar" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
                    <span id="hipaaPageInfo">Showing page 1</span>
                    <div style="display: flex; gap: 8px;">
                        <button id="btnHipaaPrevPage" class="btn btn-sm btn-outline-secondary" disabled>&larr; Previous</button>
                        <button id="btnHipaaNextPage" class="btn btn-sm btn-outline-secondary" disabled>Next &rarr;</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========================================== -->
        <!-- SIDE-BY-SIDE VISUAL DIFF MODAL CONTAINER   -->
        <!-- ========================================== -->
        <div id="auditDiffModalContainer"></div>

        <!-- ========================================== -->
        <!-- SESSION REVOCATION MODAL CONTAINER         -->
        <!-- ========================================== -->
        <div id="authRevokeModalContainer"></div>
    </div>
    `;
}
