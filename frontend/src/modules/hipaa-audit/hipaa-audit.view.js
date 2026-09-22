export function HipaaAuditView()
{
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

        /* Dark Mode */
        :root[data-theme="dark"] .hipaa-audit-wrapper {
            color: #e2e8f0;
        }
        :root[data-theme="dark"] .hipaa-audit-header h1 {
            color: #f8fafc !important;
        }
        :root[data-theme="dark"] .hipaa-pill-retention {
            background: #064e3b;
            color: #a7f3d0;
            border-color: #047857;
        }
        :root[data-theme="dark"] .hipaa-pill-hash {
            background: #1e3a8a;
            color: #bfdbfe;
            border-color: #2563eb;
        }
        :root[data-theme="dark"] .hipaa-audit-wrapper .card {
            background: #1e293b !important;
            border-color: #334155 !important;
        }
        :root[data-theme="dark"] .hipaa-audit-wrapper label {
            color: #cbd5e1 !important;
        }
        :root[data-theme="dark"] .hipaa-audit-wrapper input,
        :root[data-theme="dark"] .hipaa-audit-wrapper select {
            background: #0f172a !important;
            border-color: #334155 !important;
            color: #f8fafc !important;
            color-scheme: dark;
        }
        :root[data-theme="dark"] .hipaa-audit-wrapper thead {
            background: #0f172a !important;
            border-bottom-color: #334155 !important;
        }
        :root[data-theme="dark"] .hipaa-audit-wrapper th {
            color: #94a3b8 !important;
        }
        :root[data-theme="dark"] .hipaa-audit-wrapper td {
            color: #e2e8f0 !important;
            border-bottom-color: #334155 !important;
        }
        :root[data-theme="dark"] .hipaa-hash-cell {
            background: #0f172a;
            color: #94a3b8;
        }
        :root[data-theme="dark"] #hipaaPaginationBar {
            background: #0f172a !important;
            border-top-color: #334155 !important;
            color: #94a3b8 !important;
        }
        :root[data-theme="dark"] .hipaa-retention-card {
            background: #0f172a !important;
            border-color: #334155 !important;
            color: #e2e8f0 !important;
        }
        :root[data-theme="dark"] .hipaa-retention-stat {
            background: #1e293b !important;
            border-color: #334155 !important;
        }
        :root[data-theme="dark"] .hipaa-retention-stat-val {
            color: #f8fafc !important;
        }
    </style>

    <div class="hipaa-audit-wrapper">
        <div class="hipaa-audit-header">
            <div>
                <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 4px;">
                    HIPAA Compliance Audit Trail &amp; Retention Console
                </h1>
                <p style="font-size: 13px; color: #64748b; margin: 0;">
                    Enforces 45 CFR &sect; 164.312(b) Cryptographic Audit Controls &amp; &sect; 164.316(b)(2)(i) Mandatory 6-Year Retention.
                </p>
                <div class="hipaa-audit-badges">
                    <span class="hipaa-compliance-pill hipaa-pill-retention">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        § 164.316(b)(2)(i): 6-Year Immutable Retention Active
                    </span>
                    <span class="hipaa-compliance-pill hipaa-pill-hash">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                        § 164.312(b): HMAC-SHA256 Chained
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

        <div id="hipaaRetentionPolicyContainer" style="display: none;"></div>
        <div id="hipaaVerifyResultContainer" style="display: none;"></div>

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
    `;
}

