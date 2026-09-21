import { api } from "../../core/api.js";
import { showToast } from "../../core/toast.js";

let currentPage = 1;
const pageSize = 20;

export async function initHipaaAudit()
{
    currentPage = 1;
    bindAuditEvents();
    await loadAuditLogs();
}

function bindAuditEvents()
{
    const btnFilter = document.getElementById("btnApplyHipaaFilters");
    const btnReset = document.getElementById("btnResetHipaaFilters");
    const btnVerify = document.getElementById("btnVerifyChain");
    const btnPrev = document.getElementById("btnHipaaPrevPage");
    const btnNext = document.getElementById("btnHipaaNextPage");

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
