import { showToast } from "../../core/toast.js";
import {
    fetchVisitorPasses,
    fetchActiveVisitors,
    fetchVisitorStats,
    fetchAdmissionsOptions,
    issueVisitorPass,
    checkOutVisitorPass,
    verifyVisitorBarcode,
    revokeVisitorPass,
    openBadgePrintWindow
} from "./visitor-management.service.js";

let pollIntervalId = null;
let currentAdmissionsCache = [];
let passToRevokeId = null;

export async function initVisitorManagement(user) {
    const wrapper = document.getElementById("visitorManagementWrapper");
    if (!wrapper) return;

    // Clear any previous intervals
    if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
    }

    // Bind event listeners
    bindTabs();
    bindScanner();
    bindIssueModal();
    bindRevokeModal();
    bindFilters();

    // Initial load
    await loadDashboardStats();
    await loadActiveVisitors();
    await populateAdmissionsDropdown();
    renderPolicies();

    // Start 5s live polling for active visitors tab
    pollIntervalId = setInterval(async () => {
        const activeTab = document.querySelector(".vm-tab-btn.active");
        if (activeTab && activeTab.getAttribute("data-tab") === "active") {
            await loadActiveVisitors(true);
            await loadDashboardStats(true);
        }
    }, 5000);
}

/**
 * Tab switching logic
 */
function bindTabs() {
    const tabBtns = document.querySelectorAll(".vm-tab-btn");
    const panes = {
        active: document.getElementById("vmTabActive"),
        all: document.getElementById("vmTabAll"),
        policies: document.getElementById("vmTabPolicies")
    };

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-tab");
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            Object.keys(panes).forEach(k => {
                if (panes[k]) {
                    panes[k].style.display = (k === target) ? "block" : "none";
                }
            });

            if (target === "all") {
                loadAllPasses();
            } else if (target === "active") {
                loadActiveVisitors();
            }
        });
    });

    const refreshBtn = document.getElementById("vmBtnRefreshActive");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            loadDashboardStats();
            loadActiveVisitors();
            showToast("Visitor data refreshed", "info");
        });
    }
}

/**
 * Barcode Scanner & Instant Verification
 */
function bindScanner() {
    const input = document.getElementById("vmBarcodeScannerInput");
    const verifyBtn = document.getElementById("vmBtnVerifyBarcode");
    const checkOutBtn = document.getElementById("vmBtnQuickCheckOut");
    const resultCard = document.getElementById("vmScanResultCard");

    async function handleVerify() {
        const val = input.value.trim();
        if (!val) {
            input.focus();
            return;
        }

        try {
            const res = await verifyVisitorBarcode(val);
            if (res.success && res.data) {
                renderScanResult(res.data);
            } else {
                renderScanError(res.message || "Pass verification failed.");
            }
        } catch (err) {
            renderScanError(err.message || "Invalid or unrecognized visitor pass.");
        }
    }

    async function handleQuickCheckOut() {
        const val = input.value.trim();
        if (!val) {
            input.focus();
            showToast("Scan or enter barcode / pass number to check out", "warning");
            return;
        }

        try {
            const res = await checkOutVisitorPass(val);
            if (res.success) {
                showToast(res.message || "Visitor checked out successfully", "success");
                input.value = "";
                if (resultCard) resultCard.style.display = "none";
                await loadDashboardStats();
                await loadActiveVisitors();
            } else {
                showToast(res.message || "Check-out failed", "error");
            }
        } catch (err) {
            showToast(err.message || "Check-out failed", "error");
        }
    }

    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleVerify();
            }
        });
    }

    if (verifyBtn) verifyBtn.addEventListener("click", handleVerify);
    if (checkOutBtn) checkOutBtn.addEventListener("click", handleQuickCheckOut);
}

function renderScanResult(data) {
    const resultCard = document.getElementById("vmScanResultCard");
    if (!resultCard) return;

    const pass = data.pass || {};
    const status = data.status || "Unknown";
    const statusClass = "status-" + status.toLowerCase().replace(/\s+/g, '-');

    resultCard.className = `vm-scan-result-card ${statusClass}`;
    resultCard.style.display = "flex";

    resultCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
            <div style="font-size: 26px;">
                ${status === 'Active' ? '✅' : status === 'Expired' ? '⚠️' : status === 'Revoked' ? '🚫' : 'ℹ️'}
            </div>
            <div>
                <div style="font-size: 15px; font-weight: 800;">
                    ${escapeHtml(pass.visitor_name || 'Visitor')} &bull; <span style="font-family: monospace;">${escapeHtml(pass.pass_number || '')}</span>
                </div>
                <div style="font-size: 12.5px; opacity: 0.9; margin-top: 2px;">
                    Visiting: <strong>${escapeHtml(pass.display_patient_name || pass.patient_name || 'Patient')}</strong> &bull; 
                    Ward: <strong>${escapeHtml(pass.ward_name || '')}</strong> (Room ${escapeHtml(pass.room_number || '')}, Bed ${escapeHtml(pass.bed_number || '')})
                </div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <span class="vm-status-pill ${escapeHtml(status.replace(/\s+/g, '-'))}">${escapeHtml(status)}</span>
            ${status === 'Active' ? `
                <button class="vm-btn vm-btn-success" id="vmBtnResultCheckOut" style="padding: 6px 12px; font-size: 12px;">
                    Check Out Now
                </button>
                <button class="vm-btn" id="vmBtnResultPrint" style="padding: 6px 12px; font-size: 12px;">
                    Reprint Badge
                </button>
            ` : ''}
        </div>
    `;

    const checkOutBtn = document.getElementById("vmBtnResultCheckOut");
    if (checkOutBtn) {
        checkOutBtn.addEventListener("click", async () => {
            const res = await checkOutVisitorPass(pass.id);
            if (res.success) {
                showToast("Visitor checked out successfully", "success");
                resultCard.style.display = "none";
                document.getElementById("vmBarcodeScannerInput").value = "";
                await loadDashboardStats();
                await loadActiveVisitors();
            }
        });
    }

    const printBtn = document.getElementById("vmBtnResultPrint");
    if (printBtn) {
        printBtn.addEventListener("click", () => {
            openBadgePrintWindow(pass.id);
        });
    }
}

function renderScanError(msg) {
    const resultCard = document.getElementById("vmScanResultCard");
    if (!resultCard) return;

    resultCard.className = "vm-scan-result-card status-revoked";
    resultCard.style.display = "flex";
    resultCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">❌</div>
            <div>
                <div style="font-size: 14px; font-weight: 800;">Verification Failed</div>
                <div style="font-size: 12.5px; opacity: 0.9;">${escapeHtml(msg)}</div>
            </div>
        </div>
        <button class="vm-btn" onclick="document.getElementById('vmScanResultCard').style.display='none'" style="padding: 4px 10px; font-size: 12px;">
            Dismiss
        </button>
    `;
}

/**
 * Load KPIs & Dashboard Stats
 */
async function loadDashboardStats(silent = false) {
    try {
        const res = await fetchVisitorStats();
        if (res.success && res.data) {
            const summary = res.data.summary || {};
            const activeEl = document.getElementById("kpiActiveVisitors");
            const checkedInEl = document.getElementById("kpiCheckedInToday");
            const checkedOutEl = document.getElementById("kpiCheckedOutToday");
            const expiredEl = document.getElementById("kpiExpiredToday");
            const tabCountEl = document.getElementById("tabActiveCount");

            if (activeEl) activeEl.textContent = summary.active_visitors || 0;
            if (checkedInEl) checkedInEl.textContent = summary.checked_in_today || 0;
            if (checkedOutEl) checkedOutEl.textContent = summary.checked_out_today || 0;
            if (expiredEl) expiredEl.textContent = summary.expired_today || 0;
            if (tabCountEl) tabCountEl.textContent = summary.active_visitors || 0;

            // Update ward filters if options exist
            if (res.data.ward_distribution) {
                populateWardFilters(res.data.ward_distribution);
            }
        }
    } catch (err) {
        if (!silent) console.error("Error loading visitor dashboard stats:", err);
    }
}

function populateWardFilters(wards) {
    const activeFilter = document.getElementById("vmActiveWardFilter");
    const allFilter = document.getElementById("vmAllWardFilter");

    if (activeFilter && activeFilter.options.length <= 1) {
        wards.forEach(w => {
            const opt = document.createElement("option");
            opt.value = w.ward_id;
            opt.textContent = `${w.ward_name} (${w.active_visitors || 0} active)`;
            activeFilter.appendChild(opt);
        });
    }

    if (allFilter && allFilter.options.length <= 1) {
        wards.forEach(w => {
            const opt = document.createElement("option");
            opt.value = w.ward_id;
            opt.textContent = w.ward_name;
            allFilter.appendChild(opt);
        });
    }
}

/**
 * Load Active Visitors Feed
 */
async function loadActiveVisitors(silent = false) {
    const tbody = document.getElementById("vmActiveTableBody");
    const timeEl = document.getElementById("vmLastRefreshedTime");
    const wardFilter = document.getElementById("vmActiveWardFilter");
    const searchInput = document.getElementById("vmActiveSearchInput");

    const wardId = wardFilter ? wardFilter.value : "";
    const search = searchInput ? searchInput.value.trim() : "";

    try {
        const res = await fetchActiveVisitors({ ward_id: wardId, search: search });
        if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

        if (res.success && res.data) {
            const visitors = res.data;
            if (tbody) {
                if (visitors.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 36px; color: #64748b;">
                                <div style="font-size: 24px; margin-bottom: 6px;">🚪</div>
                                <strong>No active visitors currently in hospital wards.</strong>
                                <div style="font-size: 12px; margin-top: 4px;">Click "Issue Visitor Pass" to check in a new visitor.</div>
                            </td>
                        </tr>
                    `;
                    return;
                }

                tbody.innerHTML = visitors.map(v => {
                    const elapsed = parseInt(v.elapsed_minutes || 0, 10);
                    const remaining = parseInt(v.remaining_minutes || 0, 10);
                    let timeBadgeClass = "ok";
                    let timeText = `${remaining} min remaining`;

                    if (remaining <= 0) {
                        timeBadgeClass = "expired";
                        timeText = `Overdue by ${Math.abs(remaining)} min`;
                    } else if (remaining < 30) {
                        timeBadgeClass = "warning";
                        timeText = `${remaining} min left`;
                    }

                    return `
                        <tr data-pass-id="${v.id}">
                            <td>
                                <strong style="font-family: monospace; font-size: 13.5px; color: #0284c7;">
                                    ${escapeHtml(v.pass_number)}
                                </strong>
                                ${v.is_emergency_exception == 1 ? '<span style="display:block; font-size: 10px; color: #b45309; font-weight: bold;">[EMERGENCY EXCEPTION]</span>' : ''}
                            </td>
                            <td>
                                <strong style="font-size: 13.5px;">${escapeHtml(v.visitor_name)}</strong>
                                <div style="font-size: 11.5px; color: #64748b;">
                                    ${escapeHtml(v.id_document_type)}: ${escapeHtml(v.id_document_number)} &bull; ${escapeHtml(v.phone)}
                                </div>
                            </td>
                            <td>
                                <div style="font-weight: 700;">${escapeHtml(v.display_patient_name || v.patient_first_name + ' ' + v.patient_last_name)}</div>
                                <div style="font-size: 11.5px; color: #64748b;">
                                    ${escapeHtml(v.ward_name || 'Ward')} &bull; Room ${escapeHtml(v.room_number || '')} / Bed ${escapeHtml(v.bed_number || '')}
                                </div>
                            </td>
                            <td>
                                <span style="font-weight: 600; color: #334155;">${escapeHtml(v.relationship_to_patient)}</span>
                            </td>
                            <td>
                                <div style="font-size: 12.5px;">${formatDateTime(v.check_in_time)}</div>
                                <div style="font-size: 11px; color: #64748b;">In ward: ${elapsed} mins</div>
                            </td>
                            <td>
                                <div style="font-size: 12.5px;">${formatDateTime(v.valid_until)}</div>
                            </td>
                            <td>
                                <span class="vm-status-pill Active">Active</span>
                                <span class="vm-badge-time ${timeBadgeClass}" style="margin-left: 6px;">${timeText}</span>
                            </td>
                            <td style="text-align: right; white-space: nowrap;">
                                <button class="vm-btn vm-btn-success btn-action-checkout" data-id="${v.id}" data-number="${escapeHtml(v.pass_number)}" style="padding: 5px 9px; font-size: 12px;">
                                    Check Out
                                </button>
                                <button class="vm-btn btn-action-print" data-id="${v.id}" style="padding: 5px 9px; font-size: 12px;" title="Print Badge">
                                    🖨️
                                </button>
                                <button class="vm-btn vm-btn-danger btn-action-revoke" data-id="${v.id}" data-name="${escapeHtml(v.visitor_name)}" data-number="${escapeHtml(v.pass_number)}" style="padding: 5px 9px; font-size: 12px;" title="Revoke Pass">
                                    Revoke
                                </button>
                            </td>
                        </tr>
                    `;
                }).join("");

                bindTableActions(tbody);
            }
        }
    } catch (err) {
        if (!silent) console.error("Error loading active visitors:", err);
    }
}

function bindTableActions(container) {
    container.querySelectorAll(".btn-action-checkout").forEach(btn => {
        btn.addEventListener("click", async () => {
            const passId = btn.getAttribute("data-id");
            const passNumber = btn.getAttribute("data-number");
            btn.disabled = true;
            try {
                const res = await checkOutVisitorPass(passId);
                if (res.success) {
                    showToast(`Visitor pass ${passNumber} checked out`, "success");
                    await loadDashboardStats();
                    await loadActiveVisitors();
                } else {
                    showToast(res.message || "Failed to check out", "error");
                    btn.disabled = false;
                }
            } catch (err) {
                showToast(err.message || "Failed to check out", "error");
                btn.disabled = false;
            }
        });
    });

    container.querySelectorAll(".btn-action-print").forEach(btn => {
        btn.addEventListener("click", () => {
            const passId = btn.getAttribute("data-id");
            openBadgePrintWindow(passId);
        });
    });

    container.querySelectorAll(".btn-action-revoke").forEach(btn => {
        btn.addEventListener("click", () => {
            const passId = btn.getAttribute("data-id");
            const visitorName = btn.getAttribute("data-name");
            const passNumber = btn.getAttribute("data-number");
            openRevokeModal(passId, visitorName, passNumber);
        });
    });
}

/**
 * Load All Visitor Passes (History)
 */
async function loadAllPasses() {
    const tbody = document.getElementById("vmAllTableBody");
    const status = document.getElementById("vmAllStatusFilter").value;
    const wardId = document.getElementById("vmAllWardFilter").value;
    const date = document.getElementById("vmAllDateFilter").value;
    const search = document.getElementById("vmAllSearchInput").value.trim();

    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: #94a3b8;">Loading history...</td></tr>`;
    }

    try {
        const res = await fetchVisitorPasses({ status, ward_id: wardId, date, search });
        if (res.success && res.data && tbody) {
            const passes = res.data;
            if (passes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 32px; color: #64748b;">No visitor passes found for selected filters.</td></tr>`;
                return;
            }

            tbody.innerHTML = passes.map(p => {
                const statusClass = (p.status || "").replace(/\s+/g, '-');
                return `
                    <tr>
                        <td><strong style="font-family: monospace; color: #0284c7;">${escapeHtml(p.pass_number)}</strong></td>
                        <td>
                            <strong>${escapeHtml(p.visitor_name)}</strong>
                            <div style="font-size: 11px; color: #64748b;">${escapeHtml(p.phone)}</div>
                        </td>
                        <td>${escapeHtml(p.id_document_type)}: ${escapeHtml(p.id_document_number)}</td>
                        <td>
                            <strong>${escapeHtml(p.display_patient_name || 'Patient')}</strong>
                            <div style="font-size: 11px; color: #64748b;">Rm ${escapeHtml(p.room_number || '')} / Bed ${escapeHtml(p.bed_number || '')}</div>
                        </td>
                        <td>${escapeHtml(p.ward_name || '')}</td>
                        <td>${formatDateTime(p.check_in_time)}</td>
                        <td>${p.check_out_time ? formatDateTime(p.check_out_time) : '<span style="color: #94a3b8;">—</span>'}</td>
                        <td>
                            <span class="vm-status-pill ${statusClass}">${escapeHtml(p.status)}</span>
                            ${p.revocation_reason ? `<div style="font-size: 10.5px; color: #b91c1c; margin-top: 2px;">${escapeHtml(p.revocation_reason)}</div>` : ''}
                        </td>
                        <td><small>${escapeHtml(p.issued_by_name || 'System')}</small></td>
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="vm-btn btn-action-print" data-id="${p.id}" style="padding: 4px 8px; font-size: 11.5px;">Badge</button>
                            ${p.status === 'Active' ? `
                                <button class="vm-btn vm-btn-success btn-action-checkout" data-id="${p.id}" data-number="${escapeHtml(p.pass_number)}" style="padding: 4px 8px; font-size: 11.5px;">Check Out</button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            }).join("");

            bindTableActions(tbody);
        }
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #ef4444; padding: 20px;">Failed to load records: ${escapeHtml(err.message)}</td></tr>`;
    }
}

/**
 * Filter bindings
 */
function bindFilters() {
    const activeSearch = document.getElementById("vmActiveSearchInput");
    const activeWard = document.getElementById("vmActiveWardFilter");

    if (activeSearch) activeSearch.addEventListener("input", debounce(() => loadActiveVisitors(), 300));
    if (activeWard) activeWard.addEventListener("change", () => loadActiveVisitors());

    const btnApplyAll = document.getElementById("vmBtnApplyAllFilter");
    const btnResetAll = document.getElementById("vmBtnResetAllFilter");

    if (btnApplyAll) btnApplyAll.addEventListener("click", () => loadAllPasses());
    if (btnResetAll) {
        btnResetAll.addEventListener("click", () => {
            document.getElementById("vmAllStatusFilter").value = "";
            document.getElementById("vmAllWardFilter").value = "";
            document.getElementById("vmAllDateFilter").value = "";
            document.getElementById("vmAllSearchInput").value = "";
            loadAllPasses();
        });
    }
}

/**
 * Issue Pass Modal
 */
function bindIssueModal() {
    const modal = document.getElementById("vmIssueModal");
    const openBtn = document.getElementById("vmBtnOpenIssueModal");
    const closeBtn = document.getElementById("vmBtnCloseIssueModal");
    const cancelBtn = document.getElementById("vmBtnCancelIssueModal");
    const form = document.getElementById("vmIssueForm");
    const admissionSelect = document.getElementById("vmIssueAdmissionSelect");
    const noticeBox = document.getElementById("vmAdmissionPolicyNotice");
    const noticeText = document.getElementById("vmAdmissionPolicyNoticeText");

    if (openBtn) {
        openBtn.addEventListener("click", async () => {
            modal.style.display = "flex";
            await populateAdmissionsDropdown();
            if (noticeBox) noticeBox.style.display = "none";
        });
    }

    const closeModal = () => {
        if (modal) modal.style.display = "none";
        if (form) form.reset();
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (admissionSelect) {
        admissionSelect.addEventListener("change", () => {
            const admId = parseInt(admissionSelect.value, 10);
            const found = currentAdmissionsCache.find(a => parseInt(a.admission_id, 10) === admId);

            if (found && noticeBox && noticeText) {
                const count = parseInt(found.active_visitor_count || 0, 10);
                const quota = parseInt(found.max_quota || 2, 10);
                const isFull = count >= quota;

                noticeBox.style.display = "flex";
                if (isFull) {
                    noticeBox.className = "vm-policy-notice warning full-width";
                    noticeText.innerHTML = `<strong>⚠️ Quota Alert:</strong> This bedside already has <strong>${count} of ${quota}</strong> active visitors. Additional passes will require an Emergency Exception override.`;
                } else {
                    noticeBox.className = "vm-policy-notice full-width";
                    noticeText.innerHTML = `<strong>Bedside Visitor Quota:</strong> ${count} of ${quota} allowed active visitors currently present at bedside (${escapeHtml(found.ward_name)} - Room ${escapeHtml(found.room_number)} / Bed ${escapeHtml(found.bed_number)}).`;
                }
            } else if (noticeBox) {
                noticeBox.style.display = "none";
            }
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById("vmBtnSubmitIssue");
            submitBtn.disabled = true;
            submitBtn.textContent = "Validating & Issuing...";

            const payload = {
                admission_id: parseInt(admissionSelect.value, 10),
                visitor_name: document.getElementById("vmIssueVisitorName").value.trim(),
                relationship_to_patient: document.getElementById("vmIssueRelationship").value,
                id_document_type: document.getElementById("vmIssueIdDocType").value,
                id_document_number: document.getElementById("vmIssueIdDocNumber").value.trim(),
                phone: document.getElementById("vmIssuePhone").value.trim(),
                duration_minutes: parseInt(document.getElementById("vmIssueDuration").value || 120, 10),
                is_emergency_exception: document.getElementById("vmIssueEmergencyException").checked ? 1 : 0,
                notes: document.getElementById("vmIssueNotes").value.trim()
            };

            try {
                const res = await issueVisitorPass(payload);
                if (res.success) {
                    showToast(res.message || "Visitor pass issued successfully!", "success");
                    closeModal();
                    await loadDashboardStats();
                    await loadActiveVisitors();

                    // Open thermal printable badge
                    if (res.data && res.data.pass_id) {
                        openBadgePrintWindow(res.data.pass_id);
                    }
                } else {
                    showToast(res.message || "Failed to issue visitor pass", "error");
                }
            } catch (err) {
                showToast(err.message || "Error issuing visitor pass", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Issue Pass & Print Badge";
            }
        });
    }
}

async function populateAdmissionsDropdown() {
    const select = document.getElementById("vmIssueAdmissionSelect");
    if (!select) return;

    try {
        const res = await fetchAdmissionsOptions();
        if (res.success && res.data) {
            currentAdmissionsCache = res.data;
            select.innerHTML = '<option value="">-- Choose Admitted Patient --</option>';

            res.data.forEach(adm => {
                const opt = document.createElement("option");
                opt.value = adm.admission_id;
                const count = adm.active_visitor_count || 0;
                const quota = adm.max_quota || 2;
                opt.textContent = `${adm.patient_name} (MRN: ${adm.patient_mrn || 'N/A'}) - ${adm.ward_name} Rm ${adm.room_number}/Bed ${adm.bed_number} [Visitors: ${count}/${quota}]`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error populating admissions options:", err);
    }
}

/**
 * Revoke Pass Modal
 */
function bindRevokeModal() {
    const modal = document.getElementById("vmRevokeModal");
    const closeBtn = document.getElementById("vmBtnCloseRevokeModal");
    const cancelBtn = document.getElementById("vmBtnCancelRevokeModal");
    const confirmBtn = document.getElementById("vmBtnConfirmRevoke");
    const textEl = document.getElementById("vmRevokeModalText");

    const closeModal = () => {
        if (modal) modal.style.display = "none";
        passToRevokeId = null;
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            if (!passToRevokeId) return;

            const reasonSelect = document.getElementById("vmRevokeReasonSelect").value;
            const detail = document.getElementById("vmRevokeReasonDetail").value.trim();
            const fullReason = detail ? `${reasonSelect} - ${detail}` : reasonSelect;

            confirmBtn.disabled = true;
            confirmBtn.textContent = "Revoking...";

            try {
                const res = await revokeVisitorPass(passToRevokeId, fullReason);
                if (res.success) {
                    showToast(res.message || "Pass revoked successfully", "success");
                    closeModal();
                    await loadDashboardStats();
                    await loadActiveVisitors();
                } else {
                    showToast(res.message || "Failed to revoke pass", "error");
                }
            } catch (err) {
                showToast(err.message || "Failed to revoke pass", "error");
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Revoke Immediately";
            }
        });
    }
}

function openRevokeModal(passId, visitorName, passNumber) {
    const modal = document.getElementById("vmRevokeModal");
    const textEl = document.getElementById("vmRevokeModalText");
    if (!modal) return;

    passToRevokeId = passId;
    if (textEl) {
        textEl.innerHTML = `Are you sure you want to revoke pass <strong>${escapeHtml(passNumber)}</strong> for visitor <strong>${escapeHtml(visitorName)}</strong>? This will immediately terminate hospital access and log a security audit event.`;
    }
    modal.style.display = "flex";
}

/**
 * Render Ward Visiting Policies
 */
function renderPolicies() {
    const container = document.getElementById("vmPolicyGrid");
    if (!container) return;

    const policies = [
        {
            ward_type: "ICU / Intensive Care",
            visiting_hours: "11:00 AM - 12:00 PM & 5:00 PM - 6:00 PM",
            quota: "2 visitors per bed (Strict Split Slots)",
            age: "Minimum 12 years old",
            overnight: "Not Permitted (Restricted Access)",
            notes: "Strict aseptic infection protocol required before bedside entry."
        },
        {
            ward_type: "General Inpatient Ward",
            visiting_hours: "10:00 AM - 8:00 PM (Continuous)",
            quota: "2 visitors per bed simultaneously",
            age: "Minimum 12 years old",
            overnight: "1 Companion allowed with Charge Nurse authorization",
            notes: "Quiet hours observed strictly after 8:00 PM."
        },
        {
            ward_type: "Maternity Ward",
            visiting_hours: "10:00 AM - 8:00 PM (Continuous)",
            quota: "2 visitors per bed simultaneously",
            age: "Siblings permitted under adult supervision",
            overnight: "1 designated birth companion / spouse permitted",
            notes: "Photo ID required for neonatal unit access validation."
        },
        {
            ward_type: "Pediatric Ward",
            visiting_hours: "8:00 AM - 8:00 PM (Continuous)",
            quota: "2 visitors per bed simultaneously",
            age: "No minimum restriction with parent present",
            overnight: "Both parents / guardians permitted 24/7",
            notes: "Parental badge must remain visible at all times."
        },
        {
            ward_type: "Isolation / Infectious Unit",
            visiting_hours: "Clinical Exception Only",
            quota: "1 visitor with Attending Physician clearance",
            age: "Adults 18+ only",
            overnight: "Strictly Prohibited",
            notes: "Full PPE donning required. Exception logged in security audit."
        }
    ];

    container.innerHTML = policies.map(p => `
        <div class="vm-policy-card">
            <div>
                <div class="vm-policy-card-header">
                    <h3>${escapeHtml(p.ward_type)}</h3>
                    <span class="vm-status-pill Active" style="font-size: 11px;">Enforced</span>
                </div>
                <div class="vm-policy-specs">
                    <div class="vm-policy-spec-row">
                        <span class="label">Visiting Hours:</span>
                        <span class="val" style="color: #0284c7;">${escapeHtml(p.visiting_hours)}</span>
                    </div>
                    <div class="vm-policy-spec-row">
                        <span class="label">Bedside Quota:</span>
                        <span class="val">${escapeHtml(p.quota)}</span>
                    </div>
                    <div class="vm-policy-spec-row">
                        <span class="label">Age Restriction:</span>
                        <span class="val">${escapeHtml(p.age)}</span>
                    </div>
                    <div class="vm-policy-spec-row">
                        <span class="label">Overnight Stay:</span>
                        <span class="val">${escapeHtml(p.overnight)}</span>
                    </div>
                </div>
            </div>
            <div style="font-size: 12px; color: #64748b; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
                ℹ️ ${escapeHtml(p.notes)}
            </div>
        </div>
    `).join("");
}

// Helpers
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
}

function formatDateTime(str) {
    if (!str) return '—';
    const d = new Date(str.replace(/-/g, "/"));
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}
