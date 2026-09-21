export function HipaaAuditView()
{
    return `
    <div class="hipaa-audit-wrapper p-4">
        <div class="hipaa-audit-header">
            <div>
                <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 4px;">
                    HIPAA Compliance Audit Trail &amp; Integrity Verification
                </h1>
                <p style="font-size: 13px; color: #64748b; margin: 0;">
                    Enforces 45 CFR &sect; 164.312(b) &amp; &sect; 164.312(c)(1) with tamper-evident cryptographic SHA-256 HMAC hash chaining.
                </p>
            </div>
            <div>
                <button id="btnVerifyChain" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="m9 12 2 2 4-4"/>
                    </svg>
                    Verify Cryptographic Chain Integrity
                </button>
            </div>
        </div>

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
                        <option value="EMERGENCY_ACCESS">Emergency Access (Break-Glass)</option>
                        <option value="RECORD_EXPORT">Record Export</option>
                        <option value="SECURITY_EVENT">Security Event</option>
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
                    <button id="btnApplyHipaaFilters" class="btn btn-sm btn-primary" style="flex: 1;">Filter</button>
                    <button id="btnResetHipaaFilters" class="btn btn-sm btn-secondary" style="flex: 1;">Reset</button>
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
