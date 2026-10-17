import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

let currentPage = 1;
const pageSize = 20;

let currentDiffPage = 1;
const diffPageSize = 20;
let currentTab = 'activity';
let distinctTablesLoaded = false;

export async function initHipaaAudit(options = {})
{
    currentPage = 1;
    currentDiffPage = 1;
    distinctTablesLoaded = false;
    currentTab = options.initialTab || (window.__initialAuditTab || 'activity');
    window.__initialAuditTab = null;

    bindAuditEvents();
    bindDiffEvents();

    switchAuditTab(currentTab);

    if (currentTab === 'activity') {
        await loadAuditLogs();
    } else {
        await loadDistinctTables();
        await loadAuditDiffs();
    }
}

function bindAuditEvents()
{
    const btnTabActivity = document.getElementById("btnTabActivity");
    const btnTabDiffs = document.getElementById("btnTabDiffs");

    if (btnTabActivity) {
        btnTabActivity.onclick = () => switchAuditTab('activity');
    }
    if (btnTabDiffs) {
        btnTabDiffs.onclick = () => switchAuditTab('diffs');
    }
    const btnFilter = document.getElementById("btnApplyHipaaFilters");
    const btnReset = document.getElementById("btnResetHipaaFilters");
    const btnVerify = document.getElementById("btnVerifyChain");
    const btnPrev = document.getElementById("btnHipaaPrevPage");
    const btnNext = document.getElementById("btnHipaaNextPage");
    const btnExportCsv = document.getElementById("btnExportHipaaCsv");
    const btnExportPdf = document.getElementById("btnExportHipaaPdf");
    const btnRetention = document.getElementById("btnRetentionPolicyModal");

    if (btnFilter) {
        btnFilter.onclick = () => {
            currentPage = 1;
            loadAuditLogs();
        };
    }

    if (btnReset) {
        btnReset.onclick = () => {
            const categorySelect = document.getElementById("hipaaFilterCategory");
            const dateFromInput = document.getElementById("hipaaFilterDateFrom");
            const dateToInput = document.getElementById("hipaaFilterDateTo");
            const searchInput = document.getElementById("hipaaFilterSearch");

            if (categorySelect) categorySelect.value = "";
            if (dateFromInput) dateFromInput.value = "";
            if (dateToInput) dateToInput.value = "";
            if (searchInput) searchInput.value = "";

            currentPage = 1;
            loadAuditLogs();
        };
    }

    if (btnPrev) {
        btnPrev.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                loadAuditLogs();
            }
        };
    }

    if (btnNext) {
        btnNext.onclick = () => {
            currentPage++;
            loadAuditLogs();
        };
    }

    if (btnVerify) {
        btnVerify.onclick = async () => {
            btnVerify.disabled = true;
            const originalHtml = btnVerify.innerHTML;
            btnVerify.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="width: 14px; height: 14px; border-width: 2px;"></span>
                Verifying Chain...
            `;

            try {
                const res = await api("/hipaa-audit-logs/verify");
                displayVerificationResult(res?.data || res);
            } catch (err) {
                showToast("Failed to verify audit log chain.", "error");
            } finally {
                btnVerify.disabled = false;
                btnVerify.innerHTML = originalHtml;
            }
        };
    }

    if (btnRetention) {
        btnRetention.onclick = async () => {
            const container = document.getElementById("hipaaRetentionPolicyContainer");
            if (!container) return;

            if (container.style.display !== "none") {
                container.style.display = "none";
                return;
            }

            btnRetention.disabled = true;
            try {
                const res = await api("/hipaa-audit-logs/retention-policy");
                if (res?.success) {
                    displayRetentionPolicy(res.data);
                } else {
                    showToast(res?.message || "Failed to load retention policy.", "error");
                }
            } catch (err) {
                showToast("Failed to check retention policy status.", "error");
            } finally {
                btnRetention.disabled = false;
            }
        };
    }

    if (btnExportCsv) {
        btnExportCsv.onclick = async () => {
            btnExportCsv.disabled = true;
            const originalHtml = btnExportCsv.innerHTML;
            btnExportCsv.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="width: 13px; height: 13px; border-width: 2px;"></span>
                Exporting CSV...
            `;

            try {
                const params = getFilterParams();
                const res = await api(`/hipaa-audit-logs/export-csv?${params.toString()}`);

                if (res?.success && res.data?.csv) {
                    const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = res.data.filename || `HIPAA_Audit_Report_${Date.now()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast(`HIPAA Audit Report CSV downloaded (${res.data.total_records} records).`, "success");
                } else {
                    showToast(res?.message || "Failed to export audit report.", "error");
                }
            } catch (err) {
                showToast("An error occurred during CSV export.", "error");
            } finally {
                btnExportCsv.disabled = false;
                btnExportCsv.innerHTML = originalHtml;
            }
        };
    }

    if (btnExportPdf) {
        btnExportPdf.onclick = async () => {
            // 1. Open popup window synchronously BEFORE fetching to bypass popup blockers
            const reportWindow = window.open("", "_blank", "width=1050,height=850,scrollbars=yes");
            if (!reportWindow) {
                showToast("Please allow pop-ups for this site to generate the PDF report.", "error");
                return;
            }

            // 2. Render immediate loading placeholder
            reportWindow.document.open();
            reportWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Generating HIPAA Compliance Audit Report...</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
                        .spinner { width: 36px; height: 36px; border: 3px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
                        @keyframes spin { to { transform: rotate(360deg); } }
                    </style>
                </head>
                <body>
                    <div class="spinner"></div>
                    <h2 style="margin: 0 0 6px;">Generating Official HIPAA Audit Report...</h2>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Validating cryptographic SHA-256 chain and compiling records.</p>
                </body>
                </html>
            `);

            btnExportPdf.disabled = true;
            const originalHtml = btnExportPdf.innerHTML;
            btnExportPdf.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="width: 13px; height: 13px; border-width: 2px;"></span>
                Generating PDF...
            `;

            try {
                const params = getFilterParams();
                const res = await api(`/hipaa-audit-logs/export-report?${params.toString()}`);

                if (!res || !res.success || !res.data) {
                    reportWindow.document.open();
                    reportWindow.document.write(`<h2 style="color: #ef4444; text-align: center; padding: 40px;">Failed to generate report: ${escapeHtml(res?.message || 'Server error')}</h2>`);
                    reportWindow.document.close();
                    return;
                }

                // 3. Render printable HIPAA Compliance Audit Report
                const reportHtml = generateAuditReportHtml(res.data);
                reportWindow.document.open();
                reportWindow.document.write(reportHtml);
                reportWindow.document.close();

                showToast(`HIPAA Audit Report generated (${res.data.total} records).`, "success");
            } catch (err) {
                reportWindow.document.open();
                reportWindow.document.write(`<h2 style="color: #ef4444; text-align: center; padding: 40px;">Error generating report.</h2>`);
                reportWindow.document.close();
                showToast("Failed to generate PDF audit report.", "error");
            } finally {
                btnExportPdf.disabled = false;
                btnExportPdf.innerHTML = originalHtml;
            }
        };
    }
}

function switchAuditTab(tab)
{
    currentTab = tab;
    const btnTabActivity = document.getElementById("btnTabActivity");
    const btnTabDiffs = document.getElementById("btnTabDiffs");
    const sectionActivity = document.getElementById("hipaaActivitySection");
    const sectionDiffs = document.getElementById("hipaaDiffsSection");

    if (tab === 'diffs') {
        if (btnTabActivity) btnTabActivity.classList.remove('active');
        if (btnTabDiffs) btnTabDiffs.classList.add('active');
        if (sectionActivity) sectionActivity.style.display = 'none';
        if (sectionDiffs) sectionDiffs.style.display = '';

        if (!distinctTablesLoaded) {
            loadDistinctTables();
            distinctTablesLoaded = true;
        }
        loadAuditDiffs();
    } else {
        if (btnTabActivity) btnTabActivity.classList.add('active');
        if (btnTabDiffs) btnTabDiffs.classList.remove('active');
        if (sectionActivity) sectionActivity.style.display = '';
        if (sectionDiffs) sectionDiffs.style.display = 'none';
    }
}

function bindDiffEvents()
{
    const btnFilter = document.getElementById("btnApplyDiffFilters");
    const btnReset = document.getElementById("btnResetDiffFilters");
    const btnPrev = document.getElementById("btnDiffsPrevPage");
    const btnNext = document.getElementById("btnDiffsNextPage");

    if (btnFilter) {
        btnFilter.onclick = () => {
            currentDiffPage = 1;
            loadAuditDiffs();
        };
    }

    if (btnReset) {
        btnReset.onclick = () => {
            const tableSelect = document.getElementById("diffFilterTable");
            const actionSelect = document.getElementById("diffFilterAction");
            const dateFromInput = document.getElementById("diffFilterDateFrom");
            const dateToInput = document.getElementById("diffFilterDateTo");
            const searchInput = document.getElementById("diffFilterSearch");

            if (tableSelect) tableSelect.value = "";
            if (actionSelect) actionSelect.value = "";
            if (dateFromInput) dateFromInput.value = "";
            if (dateToInput) dateToInput.value = "";
            if (searchInput) searchInput.value = "";

            currentDiffPage = 1;
            loadAuditDiffs();
        };
    }

    if (btnPrev) {
        btnPrev.onclick = () => {
            if (currentDiffPage > 1) {
                currentDiffPage--;
                loadAuditDiffs();
            }
        };
    }

    if (btnNext) {
        btnNext.onclick = () => {
            currentDiffPage++;
            loadAuditDiffs();
        };
    }
}

async function loadDistinctTables()
{
    const select = document.getElementById("diffFilterTable");
    if (!select) return;

    try {
        const res = await api('/audit-diffs/tables');
        if (res?.success && Array.isArray(res.data?.tables)) {
            const currentVal = select.value;
            let optionsHtml = '<option value="">All Audited Tables</option>';
            res.data.tables.forEach(tbl => {
                optionsHtml += `<option value="${escapeHtml(tbl)}">${escapeHtml(tbl)}</option>`;
            });
            select.innerHTML = optionsHtml;
            if (currentVal) select.value = currentVal;
        }
    } catch (e) {
        console.error('Failed to load distinct tables', e);
    }
}

async function loadAuditDiffs()
{
    const tbody = document.getElementById("diffsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
                <span class="spinner-border spinner-border-sm" role="status" style="width: 14px; height: 14px; border-width: 2px;"></span>
                Loading entity data change diffs...
            </td>
        </tr>
    `;

    const table = document.getElementById("diffFilterTable")?.value || "";
    const action = document.getElementById("diffFilterAction")?.value || "";
    const dateFrom = document.getElementById("diffFilterDateFrom")?.value || "";
    const dateTo = document.getElementById("diffFilterDateTo")?.value || "";
    const search = document.getElementById("diffFilterSearch")?.value || "";

    const params = new URLSearchParams({
        page: String(currentDiffPage),
        limit: String(diffPageSize)
    });

    if (table) params.append("table_name", table);
    if (action) params.append("action", action);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (search) params.append("search", search);

    try {
        const res = await api(`/audit-diffs?${params.toString()}`);

        if (!res || !res.success) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 24px; color: #ef4444;">
                        ${escapeHtml(res?.message || "Error loading audit diff records.")}
                    </td>
                </tr>
            `;
            return;
        }

        const { diffs, pagination } = res.data;

        if (!diffs || diffs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 32px; color: #64748b;">
                        No entity data change diffs match your filter criteria.
                    </td>
                </tr>
            `;
            updateDiffsPagination(pagination);
            return;
        }

        let rowsHtml = "";
        diffs.forEach(diff => {
            let actionBadge = "";
            if (diff.action === "CREATE") {
                actionBadge = `<span class="diff-action-badge diff-action-create">CREATE</span>`;
            } else if (diff.action === "DELETE") {
                actionBadge = `<span class="diff-action-badge diff-action-delete">DELETE</span>`;
            } else {
                actionBadge = `<span class="diff-action-badge diff-action-update">UPDATE</span>`;
            }

            const changedFields = Array.isArray(diff.changed_fields) ? diff.changed_fields : [];
            let fieldsDisplay = "";
            const maxChips = 4;
            changedFields.slice(0, maxChips).forEach(f => {
                fieldsDisplay += `<span class="diff-field-chip">${escapeHtml(f)}</span>`;
            });
            if (changedFields.length > maxChips) {
                fieldsDisplay += `<span class="diff-field-chip" style="background: #e0e7ff; color: #3730a3; font-weight: 600;">+${changedFields.length - maxChips} more</span>`;
            }
            if (changedFields.length === 0) {
                fieldsDisplay = `<span style="color: #94a3b8; font-style: italic;">None</span>`;
            }

            const editor = diff.full_name
                ? `${escapeHtml(diff.full_name)} <span style="font-size: 11px; color: #64748b;">(${escapeHtml(diff.role_name || diff.username)})</span>`
                : (diff.username ? `${escapeHtml(diff.username)} <span style="font-size: 11px; color: #64748b;">(${escapeHtml(diff.role_name || 'user')})</span>` : '<span style="color: #94a3b8;">System</span>');

            rowsHtml += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">#${diff.id}</td>
                    <td style="padding: 10px 14px; white-space: nowrap; color: #334155;">${escapeHtml(diff.created_at)}</td>
                    <td style="padding: 10px 14px;">
                        <span class="diff-table-chip">${escapeHtml(diff.table_name)}</span>
                    </td>
                    <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">#${diff.record_id}</td>
                    <td style="padding: 10px 14px;">${actionBadge}</td>
                    <td style="padding: 10px 14px; max-width: 280px;">${fieldsDisplay}</td>
                    <td style="padding: 10px 14px;">${editor}</td>
                    <td style="padding: 10px 14px; font-family: monospace; font-size: 12px; color: #475569;">${escapeHtml(diff.ip_address || '127.0.0.1')}</td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <button class="btn btn-sm btn-outline-primary btn-view-diff" data-id="${diff.id}" style="font-size: 11.5px; font-weight: 600; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View Diff
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = rowsHtml;
        updateDiffsPagination(pagination);

        // Bind inspection click events
        tbody.querySelectorAll(".btn-view-diff").forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute("data-id");
                if (id) openDiffModal(parseInt(id, 10));
            };
        });

    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 24px; color: #ef4444;">
                    Failed to communicate with audit diff service: ${escapeHtml(err.message || 'Unknown error')}
                </td>
            </tr>
        `;
    }
}

function updateDiffsPagination(pagination)
{
    const pageInfo = document.getElementById("diffsPageInfo");
    const btnPrev = document.getElementById("btnDiffsPrevPage");
    const btnNext = document.getElementById("btnDiffsNextPage");

    const page = pagination?.page || 1;
    const totalPages = pagination?.total_pages || 1;
    const total = pagination?.total || 0;

    if (pageInfo) {
        pageInfo.textContent = `Page ${page} of ${totalPages} (${total} total diff entries)`;
    }

    if (btnPrev) {
        btnPrev.disabled = page <= 1;
    }

    if (btnNext) {
        btnNext.disabled = page >= totalPages;
    }
}

async function openDiffModal(diffId)
{
    const container = document.getElementById("auditDiffModalContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="diff-modal-backdrop" id="auditDiffModal">
            <div class="diff-modal-content" style="max-width: 600px; padding: 30px; text-align: center;">
                <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem; margin-bottom: 12px;"></div>
                <div style="font-weight: 600; color: #0f172a;">Retrieving granular diff snapshot #${diffId}...</div>
            </div>
        </div>
    `;

    try {
        const res = await api(`/audit-diffs/show?id=${diffId}`);
        if (!res || !res.success || !res.data) {
            showToast("Failed to load diff record.", "error");
            closeDiffModal();
            return;
        }

        const diff = res.data;
        const changedFields = Array.isArray(diff.changed_fields) ? diff.changed_fields : [];

        let actionBadgeClass = "diff-action-update";
        if (diff.action === "CREATE") actionBadgeClass = "diff-action-create";
        if (diff.action === "DELETE") actionBadgeClass = "diff-action-delete";

        const editorName = diff.full_name || diff.username || "System Administrator";
        const editorRole = diff.role_name || "admin";

        container.innerHTML = `
            <div class="diff-modal-backdrop" id="auditDiffModal">
                <div class="diff-modal-content">
                    <div class="diff-modal-header">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                Entity Data Diff: <span class="diff-table-chip">${escapeHtml(diff.table_name)}</span> #<span style="color: #2563eb;">${diff.record_id}</span>
                            </h3>
                            <span class="diff-action-badge ${actionBadgeClass}">${escapeHtml(diff.action)}</span>
                        </div>
                        <button id="btnCloseDiffModal" style="font-size: 24px; line-height: 1; border: none; background: transparent; cursor: pointer; color: #64748b; padding: 0 4px;">&times;</button>
                    </div>

                    <div class="diff-modal-body">
                        <!-- Metadata banner -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px;">
                            <div>
                                <strong style="color: #64748b; display: block; text-transform: uppercase; font-size: 10px; margin-bottom: 2px;">Timestamp (UTC)</strong>
                                <span style="font-weight: 600; color: #1e293b;">${escapeHtml(diff.created_at)}</span>
                            </div>
                            <div>
                                <strong style="color: #64748b; display: block; text-transform: uppercase; font-size: 10px; margin-bottom: 2px;">Editor / Author</strong>
                                <span style="font-weight: 600; color: #1e293b;">${escapeHtml(editorName)} <span style="color: #64748b; font-weight: normal;">(${escapeHtml(editorRole)})</span></span>
                            </div>
                            <div>
                                <strong style="color: #64748b; display: block; text-transform: uppercase; font-size: 10px; margin-bottom: 2px;">Client IP Address</strong>
                                <span style="font-family: monospace; color: #1e293b;">${escapeHtml(diff.ip_address || '127.0.0.1')}</span>
                            </div>
                            <div>
                                <strong style="color: #64748b; display: block; text-transform: uppercase; font-size: 10px; margin-bottom: 2px;">Modified Attributes</strong>
                                <span style="font-weight: 700; color: #2563eb;">${changedFields.length} field(s) altered</span>
                            </div>
                        </div>

                        <!-- Side-by-side Visual Highlight Containers -->
                        <div class="diff-side-by-side">
                            <!-- RED: Original Values (Before) -->
                            <div class="diff-box diff-box-old">
                                <div class="diff-box-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                    Original Values (Before Modification)
                                </div>
                                ${renderSideSnapshot(diff.old_values, changedFields, 'old')}
                            </div>

                            <!-- GREEN: Updated Values (After) -->
                            <div class="diff-box diff-box-new">
                                <div class="diff-box-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    Updated Values (After Modification)
                                </div>
                                ${renderSideSnapshot(diff.new_values, changedFields, 'new')}
                            </div>
                        </div>

                        <!-- Granular Field Delta Comparison Table -->
                        <h4 style="font-size: 13.5px; font-weight: 700; margin: 0 0 10px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            Granular Field-by-Field Delta Comparison
                        </h4>
                        <table class="diff-table-grid">
                            <thead>
                                <tr>
                                    <th style="width: 200px;">Modified Attribute</th>
                                    <th>Original Snapshot (Prior Value)</th>
                                    <th style="width: 44px; text-align: center;">&Delta;</th>
                                    <th>Updated Snapshot (New Value)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderFieldDeltas(changedFields, diff.old_values, diff.new_values)}
                            </tbody>
                        </table>
                    </div>

                    <div class="diff-modal-footer">
                        <button class="btn btn-secondary btn-sm" id="btnCloseDiffModalFooter" style="font-weight: 600; padding: 6px 18px;">
                            Close Inspection
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind dismiss handlers
        const modalBackdrop = document.getElementById("auditDiffModal");
        const btnClose = document.getElementById("btnCloseDiffModal");
        const btnCloseFooter = document.getElementById("btnCloseDiffModalFooter");

        if (btnClose) btnClose.onclick = closeDiffModal;
        if (btnCloseFooter) btnCloseFooter.onclick = closeDiffModal;
        if (modalBackdrop) {
            modalBackdrop.onclick = (e) => {
                if (e.target === modalBackdrop) closeDiffModal();
            };
        }

        const handleEscape = (e) => {
            if (e.key === "Escape") {
                closeDiffModal();
                window.removeEventListener("keydown", handleEscape);
            }
        };
        window.addEventListener("keydown", handleEscape);

    } catch (err) {
        showToast("Error displaying diff: " + err.message, "error");
        closeDiffModal();
    }
}

function closeDiffModal()
{
    const container = document.getElementById("auditDiffModalContainer");
    if (container) {
        container.innerHTML = "";
    }
}

function renderSideSnapshot(values, changedFields, type)
{
    if (!values || typeof values !== 'object' || Object.keys(values).length === 0) {
        const message = type === 'old' 
            ? 'Record Created New (No prior snapshot)' 
            : 'Record Deleted (No post snapshot)';
        return `
            <div style="padding: 16px; font-size: 13px; font-style: italic; color: #64748b; text-align: center; background: rgba(255, 255, 255, 0.6); border-radius: 6px;">
                ${escapeHtml(message)}
            </div>
        `;
    }

    let itemsHtml = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    Object.keys(values).forEach(key => {
        const isChanged = changedFields.includes(key);
        const valDisplay = formatValueDisplay(values[key]);

        if (type === 'old') {
            const bg = isChanged ? '#fee2e2' : '#ffffff';
            const border = isChanged ? '#fca5a5' : '#e2e8f0';
            const labelColor = isChanged ? '#991b1b' : '#64748b';
            const valColor = isChanged ? '#7f1d1d' : '#1e293b';
            const decoration = isChanged ? 'line-through' : 'none';

            itemsHtml += `
                <div style="padding: 8px 10px; border-radius: 6px; background: ${bg}; border: 1px solid ${border};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <strong style="font-size: 11px; text-transform: uppercase; color: ${labelColor}; font-family: ui-monospace, Menlo, monospace;">${escapeHtml(key)}</strong>
                        ${isChanged ? '<span class="badge bg-danger" style="font-size: 9.5px; padding: 2px 5px;">MODIFIED</span>' : ''}
                    </div>
                    <div style="font-size: 13px; color: ${valColor}; text-decoration: ${decoration}; word-break: break-word;">${valDisplay}</div>
                </div>
            `;
        } else {
            const bg = isChanged ? '#dcfce7' : '#ffffff';
            const border = isChanged ? '#86efac' : '#e2e8f0';
            const labelColor = isChanged ? '#166534' : '#64748b';
            const valColor = isChanged ? '#14532d' : '#1e293b';
            const fontWeight = isChanged ? '600' : 'normal';

            itemsHtml += `
                <div style="padding: 8px 10px; border-radius: 6px; background: ${bg}; border: 1px solid ${border};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <strong style="font-size: 11px; text-transform: uppercase; color: ${labelColor}; font-family: ui-monospace, Menlo, monospace;">${escapeHtml(key)}</strong>
                        ${isChanged ? '<span class="badge bg-success" style="font-size: 9.5px; padding: 2px 5px;">UPDATED</span>' : ''}
                    </div>
                    <div style="font-size: 13px; color: ${valColor}; font-weight: ${fontWeight}; word-break: break-word;">${valDisplay}</div>
                </div>
            `;
        }
    });
    itemsHtml += '</div>';
    return itemsHtml;
}

function renderFieldDeltas(changedFields, oldValues, newValues)
{
    if (!changedFields || changedFields.length === 0) {
        return `
            <tr>
                <td colspan="4" style="text-align: center; padding: 18px; color: #64748b; font-style: italic;">
                    No granular field deltas recorded.
                </td>
            </tr>
        `;
    }

    let rows = "";
    changedFields.forEach(field => {
        const oldVal = (oldValues && field in oldValues) ? oldValues[field] : null;
        const newVal = (newValues && field in newValues) ? newValues[field] : null;

        rows += `
            <tr>
                <td style="font-weight: 700; color: #1e293b; font-family: ui-monospace, Menlo, monospace; font-size: 12.5px;">
                    ${escapeHtml(field)}
                </td>
                <td class="diff-cell-old">
                    <span style="text-decoration: line-through; opacity: 0.9;">
                        ${formatValueDisplay(oldVal)}
                    </span>
                </td>
                <td style="text-align: center; font-weight: 700; color: #64748b;">
                    &rarr;
                </td>
                <td class="diff-cell-new">
                    <strong>
                        ${formatValueDisplay(newVal)}
                    </strong>
                </td>
            </tr>
        `;
    });

    return rows;
}

function formatValueDisplay(val)
{
    if (val === null || val === undefined) {
        return '<em style="color: #94a3b8; font-weight: normal;">NULL / Empty</em>';
    }
    if (typeof val === 'boolean') {
        return `<span class="badge ${val ? 'bg-success' : 'bg-secondary'}" style="font-size: 11px;">${val ? 'True' : 'False'}</span>`;
    }
    if (typeof val === 'object') {
        return `<pre style="margin: 0; font-size: 11.5px; font-family: ui-monospace, Menlo, monospace; max-height: 140px; overflow-y: auto; background: rgba(0,0,0,0.03); padding: 4px 6px; border-radius: 4px;">${escapeHtml(JSON.stringify(val, null, 2))}</pre>`;
    }
    return escapeHtml(String(val));
}

async function loadAuditLogs()
{
    const tbody = document.getElementById("hipaaAuditTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
                Loading HIPAA audit logs...
            </td>
        </tr>
    `;

    const category = document.getElementById("hipaaFilterCategory")?.value || "";
    const dateFrom = document.getElementById("hipaaFilterDateFrom")?.value || "";
    const dateTo = document.getElementById("hipaaFilterDateTo")?.value || "";
    const search = document.getElementById("hipaaFilterSearch")?.value || "";

    const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize)
    });

    if (category) params.append("category", category);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (search) params.append("search", search);

    const res = await api(`/hipaa-audit-logs?${params.toString()}`);

    if (!res || !res.success) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 24px; color: #ef4444;">
                    ${escapeHtml(res?.message || "Error loading audit records.")}
                </td>
            </tr>
        `;
        return;
    }

    const { logs, pagination } = res.data;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
                    No HIPAA audit records found matching the criteria.
                </td>
            </tr>
        `;
        updatePagination(pagination || { page: 1, total_pages: 1, total: 0 });
        return;
    }

    let rowsHtml = "";
    logs.forEach((log) => {
        const badgeClass = getBadgeClass(log.event_category);
        const patientDisplay = log.patient_id 
            ? `${escapeHtml(log.patient_last_name || '')}, ${escapeHtml(log.patient_first_name || '')} (#${log.patient_id})`
            : '<span style="color: #94a3b8;">&mdash;</span>';

        const userDisplay = log.username
            ? `${escapeHtml(log.username)} <span style="font-size: 11px; color: #64748b;">(${escapeHtml(log.user_role)})</span>`
            : `<span style="color: #94a3b8;">System (${escapeHtml(log.user_role || 'anonymous')})</span>`;

        const shortHash = log.tamper_hash ? log.tamper_hash.substring(0, 14) + "..." : "&mdash;";

        rowsHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">#${log.id}</td>
                <td style="padding: 10px 14px; white-space: nowrap; color: #334155;">${escapeHtml(log.created_at)}</td>
                <td style="padding: 10px 14px;">
                    <span class="hipaa-audit-badge ${badgeClass}">${escapeHtml(log.event_category)}</span>
                </td>
                <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">${escapeHtml(log.action)}</td>
                <td style="padding: 10px 14px;">${userDisplay}</td>
                <td style="padding: 10px 14px;">${patientDisplay}</td>
                <td style="padding: 10px 14px; max-width: 320px; color: #334155;">${escapeHtml(log.description)}</td>
                <td style="padding: 10px 14px; font-family: monospace; font-size: 12px; color: #475569;">${escapeHtml(log.ip_address || '')}</td>
                <td style="padding: 10px 14px;">
                    <span class="hipaa-hash-cell" title="Full HMAC Hash: ${escapeHtml(log.tamper_hash || '')}">${shortHash}</span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
    updatePagination(pagination);
}

function updatePagination(pagination)
{
    const pageInfo = document.getElementById("hipaaPageInfo");
    const btnPrev = document.getElementById("btnHipaaPrevPage");
    const btnNext = document.getElementById("btnHipaaNextPage");

    const page = pagination?.page || 1;
    const totalPages = pagination?.total_pages || 1;
    const total = pagination?.total || 0;

    if (pageInfo) {
        pageInfo.textContent = `Page ${page} of ${totalPages} (${total} total records)`;
    }

    if (btnPrev) {
        btnPrev.disabled = page <= 1;
    }

    if (btnNext) {
        btnNext.disabled = page >= totalPages;
    }
}

function displayVerificationResult(verification)
{
    const container = document.getElementById("hipaaVerifyResultContainer");
    if (!container) return;

    container.style.display = "block";

    if (verification?.valid) {
        container.innerHTML = `
            <div class="hipaa-verify-card status-verified">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m9 12 2 2 4-4"/>
                    </svg>
                    <div>
                        <strong style="display: block; font-size: 14px;">Cryptographic Chain Integrity Verified</strong>
                        <span style="font-size: 13px;">${escapeHtml(verification.message)} Total verified entries: <strong>${verification.total_verified}</strong>.</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-success" onclick="document.getElementById('hipaaVerifyResultContainer').style.display='none'">Dismiss</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="hipaa-verify-card status-tampered">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div>
                        <strong style="display: block; font-size: 14px;">Cryptographic Integrity Violation Detected!</strong>
                        <span style="font-size: 13px;">${escapeHtml(verification.message || 'Log tampering detected.')} Potential breach at record <strong>#${verification.corrupted_id}</strong>.</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="document.getElementById('hipaaVerifyResultContainer').style.display='none'">Dismiss</button>
            </div>
        `;
    }
}

function getBadgeClass(category)
{
    switch (category) {
        case "AUTHENTICATION": return "hipaa-badge-auth";
        case "CHART_ACCESS": return "hipaa-badge-chart";
        case "EMERGENCY_ACCESS": return "hipaa-badge-emergency";
        case "RECORD_EXPORT": return "hipaa-badge-export";
        case "SECURITY_EVENT": return "hipaa-badge-security";
        default: return "badge-secondary";
    }
}

function escapeHtml(str)
{
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getFilterParams()
{
    const category = document.getElementById("hipaaFilterCategory")?.value || "";
    const dateFrom = document.getElementById("hipaaFilterDateFrom")?.value || "";
    const dateTo = document.getElementById("hipaaFilterDateTo")?.value || "";
    const search = document.getElementById("hipaaFilterSearch")?.value || "";

    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (search) params.append("search", search);

    return params;
}

function displayRetentionPolicy(policy)
{
    const container = document.getElementById("hipaaRetentionPolicyContainer");
    if (!container) return;

    container.style.display = "block";

    const triggerBadge = policy.database_triggers?.retention_guard_active 
        ? `<span class="badge bg-success" style="font-size: 11px; padding: 4px 8px;">Active (Engine-Level)</span>`
        : `<span class="badge bg-danger" style="font-size: 11px; padding: 4px 8px;">Inactive</span>`;

    const immutabilityBadge = policy.database_triggers?.immutability_guard_active
        ? `<span class="badge bg-success" style="font-size: 11px; padding: 4px 8px;">Active (Append-Only)</span>`
        : `<span class="badge bg-danger" style="font-size: 11px; padding: 4px 8px;">Inactive</span>`;

    container.innerHTML = `
        <div class="hipaa-retention-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                    <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 4px; display: flex; align-items: center; gap: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        HIPAA § 164.316(b)(2)(i) 6-Year Immutable Retention Policy Status
                    </h3>
                    <p style="font-size: 12.5px; color: #64748b; margin: 0;">
                        ${escapeHtml(policy.certification || 'Mandatory 6-year retention locked.')}
                    </p>
                </div>
                <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('hipaaRetentionPolicyContainer').style.display='none'">Close</button>
            </div>

            <div class="hipaa-retention-grid">
                <div class="hipaa-retention-stat">
                    <div class="hipaa-retention-stat-label">Total Protected Records</div>
                    <div class="hipaa-retention-stat-val">${policy.total_records || 0}</div>
                    <div style="font-size: 11px; color: #059669; margin-top: 2px;">100% under 6-year lock</div>
                </div>

                <div class="hipaa-retention-stat">
                    <div class="hipaa-retention-stat-label">Mandatory Retention Window</div>
                    <div class="hipaa-retention-stat-val">6 Years (2,191 Days)</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">45 CFR § 164.316(b)(2)(i)</div>
                </div>

                <div class="hipaa-retention-stat">
                    <div class="hipaa-retention-stat-label">Earliest Audit Record</div>
                    <div class="hipaa-retention-stat-val" style="font-size: 14px;">${escapeHtml(policy.earliest_record_date || 'None')}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${policy.active_history_days || 0} day(s) active</div>
                </div>

                <div class="hipaa-retention-stat">
                    <div class="hipaa-retention-stat-label">Purge Eligible Records</div>
                    <div class="hipaa-retention-stat-val" style="color: #2563eb;">${policy.purge_eligible_records || 0}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Cutoff: ${escapeHtml(policy.retention_cutoff_date || '6 years prior')}</div>
                </div>
            </div>

            <div style="display: flex; gap: 24px; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; flex-wrap: wrap;">
                <div><strong>Database Retention Trigger:</strong> ${triggerBadge}</div>
                <div><strong>Database Immutability Trigger:</strong> ${immutabilityBadge}</div>
                <div><strong>Regulation:</strong> <code style="font-size: 11.5px;">${escapeHtml(policy.regulation)}</code></div>
            </div>
        </div>
    `;
}

function generateAuditReportHtml(data)
{
    const logs = data.logs || [];
    const hospital = data.hospital || { name: "USIntellix Healthcare System", facility_id: "FAC-USINT-2026" };
    const exportedBy = data.exported_by || { username: "admin", role: "admin" };
    const verification = data.verification || {};
    const retention = data.retention || {};
    const filterSummary = data.filter_summary || "All Records";
    const exportedAt = data.exported_at || new Date().toISOString();

    const isVerified = verification.valid === true;
    const verifiedBadge = isVerified
        ? `<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; border: 1px solid #86efac;">✓ CRYPTOGRAPHIC INTEGRITY VERIFIED (SHA-256 HMAC CHAIN)</span>`
        : `<span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; border: 1px solid #fca5a5;">⚠ INTEGRITY WARNING: CHAIN IRREGULARITY</span>`;

    let rowsHtml = "";
    logs.forEach((log) => {
        const patientName = (log.patient_last_name || log.patient_first_name)
            ? `${escapeHtml(log.patient_last_name || '')}, ${escapeHtml(log.patient_first_name || '')}`
            : '—';
        const userDisplay = log.username 
            ? `${escapeHtml(log.username)} (${escapeHtml(log.user_role)})` 
            : 'System';

        rowsHtml += `
            <tr>
                <td style="font-weight: 600; color: #475569;">#${log.id}</td>
                <td style="white-space: nowrap;">${escapeHtml(log.created_at)}</td>
                <td><span style="font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 3px; background: #f1f5f9;">${escapeHtml(log.event_category)}</span></td>
                <td style="font-weight: 600;">${escapeHtml(log.action)}</td>
                <td>${userDisplay}</td>
                <td>${patientName}</td>
                <td style="max-width: 260px; word-break: break-word;">${escapeHtml(log.description)}</td>
                <td style="font-family: monospace; font-size: 11px;">${escapeHtml(log.ip_address || '')}</td>
                <td style="font-family: monospace; font-size: 10px; color: #475569; word-break: break-all;" title="${escapeHtml(log.tamper_hash || '')}">
                    ${escapeHtml(log.tamper_hash ? log.tamper_hash.substring(0, 16) + '...' : '—')}
                </td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>HIPAA Compliance Audit Report - ${escapeHtml(hospital.name)}</title>
            <style>
                @page {
                    size: letter landscape;
                    margin: 12mm 10mm 15mm 10mm;
                    @bottom-right {
                        content: counter(page) " of " counter(pages);
                    }
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    color: #0f172a;
                    background: #ffffff;
                    margin: 0;
                    padding: 20px;
                    font-size: 12px;
                    line-height: 1.4;
                }
                .report-header {
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .hospital-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #0f172a;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                    margin: 0 0 2px;
                }
                .report-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #2563eb;
                    margin: 0 0 4px;
                }
                .statutory-notice {
                    font-size: 11px;
                    color: #475569;
                    margin: 0;
                }
                .confidential-banner {
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-left: 4px solid #ef4444;
                    padding: 8px 12px;
                    margin-bottom: 16px;
                    font-size: 11px;
                    color: #334155;
                }
                .meta-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                }
                .meta-item {
                    font-size: 11.5px;
                }
                .meta-item strong {
                    display: block;
                    font-size: 10px;
                    text-transform: uppercase;
                    color: #64748b;
                    margin-bottom: 2px;
                }
                table.audit-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                    margin-bottom: 24px;
                }
                table.audit-table th {
                    background: #f1f5f9;
                    border-bottom: 2px solid #cbd5e1;
                    border-top: 1px solid #cbd5e1;
                    padding: 8px 6px;
                    text-align: left;
                    font-weight: 700;
                    color: #334155;
                    font-size: 10.5px;
                    text-transform: uppercase;
                }
                table.audit-table td {
                    border-bottom: 1px solid #e2e8f0;
                    padding: 6px;
                    vertical-align: top;
                }
                table.audit-table tr:nth-child(even) {
                    background: #fcfdfe;
                }
                .certification-block {
                    page-break-inside: avoid;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    background: #f8fafc;
                    padding: 14px 18px;
                    margin-top: 20px;
                }
                .sig-lines {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr;
                    gap: 24px;
                    margin-top: 30px;
                }
                .sig-line {
                    border-top: 1px solid #0f172a;
                    padding-top: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #334155;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="background: #2563eb; color: white; padding: 10px 16px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <span><strong>Print Preview:</strong> Use your browser's Print Dialog to "Save as PDF" or send to an authorized compliance printer.</span>
                <button onclick="window.print()" style="background: white; color: #2563eb; font-weight: bold; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer;">Print / Save as PDF</button>
            </div>

            <div class="report-header">
                <div>
                    <h1 class="hospital-title">${escapeHtml(hospital.name)}</h1>
                    <div class="report-title">HIPAA Compliance Audit Trail Report (Official Record)</div>
                    <p class="statutory-notice">
                        Statutory Mandate: <strong>45 CFR § 164.312(b)</strong> (Audit Controls) &bull; <strong>§ 164.316(b)(2)(i)</strong> (6-Year Retention)
                    </p>
                </div>
                <div style="text-align: right;">
                    ${verifiedBadge}
                    <div style="font-size: 10.5px; color: #64748b; margin-top: 6px;">
                        Facility ID: <strong>${escapeHtml(hospital.facility_id)}</strong> &bull; Generated: <strong>${escapeHtml(exportedAt)} UTC</strong>
                    </div>
                </div>
            </div>

            <div class="confidential-banner">
                <strong>WARNING &bull; PROTECTED HEALTH INFORMATION (PHI):</strong> This document contains sensitive electronic Protected Health Information and administrative access records protected by federal law (45 CFR Parts 160 and 164). Unauthorized copying, distribution, or retention is strictly punishable under HIPAA enforcement provisions.
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <strong>Report Scope / Filter</strong>
                    <span>${escapeHtml(filterSummary)}</span>
                </div>
                <div class="meta-item">
                    <strong>Total Audit Events</strong>
                    <span><strong>${logs.length}</strong> Event Record(s)</span>
                </div>
                <div class="meta-item">
                    <strong>Generated By</strong>
                    <span>${escapeHtml(exportedBy.username)} (${escapeHtml(exportedBy.role)})</span>
                </div>
                <div class="meta-item">
                    <strong>Retention Policy</strong>
                    <span style="color: #059669; font-weight: 600;">6-Year Immutable Lock Active</span>
                </div>
            </div>

            <table class="audit-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">ID</th>
                        <th style="width: 120px;">Timestamp (UTC)</th>
                        <th style="width: 90px;">Category</th>
                        <th style="width: 110px;">Action</th>
                        <th style="width: 120px;">User</th>
                        <th style="width: 120px;">Patient</th>
                        <th>Details / Clinical Justification</th>
                        <th style="width: 90px;">IP Address</th>
                        <th style="width: 130px;">HMAC Tamper Hash</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="certification-block">
                <div style="font-size: 11px; color: #334155; line-height: 1.5;">
                    <strong>COMPLIANCE ATTESTATION &amp; RETENTION CERTIFICATE (§ 164.316(b)(2)(i)):</strong><br>
                    I hereby certify that this audit report contains genuine, unedited log entries extracted from the cryptographically secured, append-only repository of USIntellix Healthcare System. Each entry has been authenticated against sequential SHA-256 HMAC tamper-evident chaining. In compliance with 45 CFR § 164.316(b)(2)(i), these audit records are bound by an immutable 6-year retention policy and cannot be altered or truncated prior to statutory expiration.
                </div>
                <div class="sig-lines">
                    <div class="sig-line">Privacy &amp; Security Compliance Officer Signature</div>
                    <div class="sig-line">Print Name &amp; Title</div>
                    <div class="sig-line">Date of Certification</div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 400);
                };
            </script>
        </body>
        </html>
    `;
}
