import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

let currentActivePatientNo = null;
let isAllPatientsScope = false;
let currentTab = 'clinical'; // 'clinical' or 'prior_auth'
let state = {
    clinical: [],
    priorAuths: [],
    stats: {},
    insurances: [],
    patient: null,
    patients: []
};
let selectedClinicalIds = new Set();
let currentReviewItem = null;
let listenerAttached = false;

export async function initAuthorizations() {
    currentActivePatientNo = getLastActivePatientChart();
    isAllPatientsScope = (!currentActivePatientNo || currentActivePatientNo === 'null');

    setupEventListeners();
    await loadAuthorizations();

    if (!listenerAttached) {
        window.addEventListener('activePatientChanged', async () => {
            if (document.getElementById("authScopeBanner")) {
                currentActivePatientNo = getLastActivePatientChart();
                isAllPatientsScope = false;
                await loadAuthorizations();
            }
        });
        listenerAttached = true;
    }
}

function setupEventListeners() {
    // 1. Tab switching
    const clinicalTabBtn = document.getElementById("authTabClinicalBtn");
    const priorTabBtn = document.getElementById("authTabPriorAuthBtn");
    const clinicalSection = document.getElementById("authClinicalTableSection");
    const priorSection = document.getElementById("authPriorTableSection");
    const batchActions = document.getElementById("authClinicalBatchActions");

    if (clinicalTabBtn && priorTabBtn) {
        clinicalTabBtn.onclick = () => {
            currentTab = 'clinical';
            clinicalTabBtn.classList.add("active");
            priorTabBtn.classList.remove("active");
            if (clinicalSection) clinicalSection.style.display = "block";
            if (priorSection) priorSection.style.display = "none";
            if (batchActions) batchActions.style.display = "flex";
            renderClinicalTable();
        };

        priorTabBtn.onclick = () => {
            currentTab = 'prior_auth';
            priorTabBtn.classList.add("active");
            clinicalTabBtn.classList.remove("active");
            if (clinicalSection) clinicalSection.style.display = "none";
            if (priorSection) priorSection.style.display = "block";
            if (batchActions) batchActions.style.display = "none";
            renderPriorTable();
        };
    }

    // 2. Scope toggle (Active Patient vs All Patients)
    const toggleScopeBtn = document.getElementById("authToggleScopeBtn");
    if (toggleScopeBtn) {
        toggleScopeBtn.onclick = async () => {
            isAllPatientsScope = !isAllPatientsScope;
            await loadAuthorizations();
        };
    }

    // 3. Search and filter
    const searchInput = document.getElementById("authSearchInput");
    if (searchInput) {
        let debounceTimer = null;
        searchInput.oninput = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadAuthorizations();
            }, 300);
        };
    }

    const statusFilter = document.getElementById("authStatusFilter");
    if (statusFilter) {
        statusFilter.onchange = () => {
            loadAuthorizations();
        };
    }

    const refreshBtn = document.getElementById("authRefreshBtn");
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            loadAuthorizations();
        };
    }

    // 4. Select All Checkbox for Clinical Queue
    const selectAllCb = document.getElementById("authSelectAllClinical");
    if (selectAllCb) {
        selectAllCb.onchange = (e) => {
            const checked = e.target.checked;
            const checkboxes = document.querySelectorAll(".auth-clinical-cb");
            selectedClinicalIds.clear();
            checkboxes.forEach(cb => {
                cb.checked = checked;
                if (checked) {
                    selectedClinicalIds.add(Number(cb.dataset.id));
                }
            });
            updateBatchSignButton();
        };
    }

    // 5. Batch Sign button
    const batchSignBtn = document.getElementById("authBatchSignBtn");
    if (batchSignBtn) {
        batchSignBtn.onclick = async () => {
            if (selectedClinicalIds.size === 0) return;
            if (!confirm(`Are you sure you want to authorize and sign all ${selectedClinicalIds.size} selected items?`)) return;

            try {
                const res = await api('/authorizations/clinical/batch-sign', {
                    method: 'POST',
                    body: JSON.stringify({
                        ids: Array.from(selectedClinicalIds),
                        action: 'authorize',
                        comments: 'Attending physician batch clinical review & sign-off.'
                    })
                });

                if (res.success) {
                    showToast(res.message || 'Items authorized successfully.', 'success');
                    selectedClinicalIds.clear();
                    updateBatchSignButton();
                    await loadAuthorizations();
                } else {
                    showToast(res.message || 'Failed to sign items.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Error executing batch sign.', 'error');
            }
        };
    }

    // 6. Review & Sign Modal Handlers
    const signModal = document.getElementById("authSignModal");
    const signClose = document.getElementById("authSignModalClose");
    const signCancel = document.getElementById("authSignCancelBtn");
    const signApprove = document.getElementById("authSignApproveBtn");
    const signReturn = document.getElementById("authSignReturnBtn");

    const closeSignModal = () => {
        if (signModal) signModal.style.display = "none";
        currentReviewItem = null;
    };

    if (signClose) signClose.onclick = closeSignModal;
    if (signCancel) signCancel.onclick = closeSignModal;

    if (signApprove) {
        signApprove.onclick = async () => {
            if (!currentReviewItem) return;
            const confirmCb = document.getElementById("authSignConfirmCheckbox");
            if (confirmCb && !confirmCb.checked) {
                showToast("Please certify that you have reviewed this document.", "warning");
                return;
            }

            const comments = document.getElementById("authSignComments")?.value || "";
            const reviewerName = document.getElementById("authSignReviewerName")?.value || "";

            try {
                const res = await api('/authorizations/clinical/sign', {
                    method: 'POST',
                    body: JSON.stringify({
                        id: currentReviewItem.id,
                        action: 'authorize',
                        comments: comments,
                        signer_name: reviewerName
                    })
                });

                if (res.success) {
                    showToast("Clinical note authorized & signed successfully!", "success");
                    closeSignModal();
                    await loadAuthorizations();
                } else {
                    showToast(res.message || "Sign-off failed.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error authorizing document.", "error");
            }
        };
    }

    if (signReturn) {
        signReturn.onclick = async () => {
            if (!currentReviewItem) return;
            const comments = document.getElementById("authSignComments")?.value || "";
            if (!comments.trim()) {
                showToast("Please provide return comments or revision instructions for the author.", "warning");
                return;
            }

            try {
                const res = await api('/authorizations/clinical/sign', {
                    method: 'POST',
                    body: JSON.stringify({
                        id: currentReviewItem.id,
                        action: 'return',
                        comments: comments
                    })
                });

                if (res.success) {
                    showToast("Document returned to staff for revision.", "info");
                    closeSignModal();
                    await loadAuthorizations();
                } else {
                    showToast(res.message || "Failed to return document.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error returning document.", "error");
            }
        };
    }

    // 7. Prior Auth Modal Handlers
    const newPriorBtn = document.getElementById("authNewPriorAuthBtn");
    const priorModal = document.getElementById("authPriorModal");
    const priorClose = document.getElementById("authPriorModalClose");
    const priorCancel = document.getElementById("authPriorModalCancel");
    const priorSave = document.getElementById("authPriorModalSave");

    const closePriorModal = () => {
        if (priorModal) priorModal.style.display = "none";
    };

    if (newPriorBtn) {
        newPriorBtn.onclick = () => {
            openPriorAuthModal();
        };
    }
    if (priorClose) priorClose.onclick = closePriorModal;
    if (priorCancel) priorCancel.onclick = closePriorModal;

    if (priorSave) {
        priorSave.onclick = async () => {
            const patientId = document.getElementById("authPriorPatientSelect")?.value;
            const payerName = document.getElementById("authPriorPayerName")?.value;
            const authNumber = document.getElementById("authPriorNumber")?.value;
            const cptCode = document.getElementById("authPriorCpt")?.value;
            const serviceDesc = document.getElementById("authPriorService")?.value;
            const unitsApproved = document.getElementById("authPriorApprovedUnits")?.value;
            const unitsUsed = document.getElementById("authPriorUsedUnits")?.value;
            const startDate = document.getElementById("authPriorStartDate")?.value;
            const endDate = document.getElementById("authPriorEndDate")?.value;
            const providerName = document.getElementById("authPriorProvider")?.value;
            const status = document.getElementById("authPriorStatus")?.value;
            const notes = document.getElementById("authPriorNotes")?.value;
            const id = document.getElementById("authPriorId")?.value;

            if (!patientId) {
                showToast("Please select a patient.", "warning");
                return;
            }
            if (!payerName?.trim()) {
                showToast("Please enter insurance payer name.", "warning");
                return;
            }
            if (!authNumber?.trim()) {
                showToast("Please enter authorization number.", "warning");
                return;
            }
            if (!serviceDesc?.trim()) {
                showToast("Please enter service description.", "warning");
                return;
            }
            if (!startDate || !endDate) {
                showToast("Please provide both start and expiration dates.", "warning");
                return;
            }

            try {
                const res = await api('/authorizations/prior-auth/save', {
                    method: 'POST',
                    body: JSON.stringify({
                        id: id ? Number(id) : null,
                        patient_id: Number(patientId),
                        payer_name: payerName.trim(),
                        auth_number: authNumber.trim(),
                        cpt_code: cptCode?.trim() || null,
                        service_description: serviceDesc.trim(),
                        units_approved: Number(unitsApproved) || 1,
                        units_used: Number(unitsUsed) || 0,
                        start_date: startDate,
                        end_date: endDate,
                        provider_name: providerName?.trim() || null,
                        status: status || 'Active',
                        notes: notes?.trim() || null
                    })
                });

                if (res.success) {
                    showToast(id ? "Prior authorization updated!" : "Prior authorization created successfully!", "success");
                    closePriorModal();
                    await loadAuthorizations();
                } else {
                    showToast(res.message || "Failed to save prior authorization.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error saving prior authorization.", "error");
            }
        };
    }

    // 8. Print Modal Handlers
    const printModal = document.getElementById("authPrintModal");
    const printClose = document.getElementById("authPrintModalClose");
    const printCloseBtn = document.getElementById("authPrintCloseBtn");
    const printTrigger = document.getElementById("authPrintTriggerBtn");

    const closePrintModal = () => {
        if (printModal) printModal.style.display = "none";
    };

    if (printClose) printClose.onclick = closePrintModal;
    if (printCloseBtn) printCloseBtn.onclick = closePrintModal;
    if (printTrigger) {
        printTrigger.onclick = () => {
            const content = document.getElementById("authPrintSlipContent")?.innerHTML;
            if (!content) return;
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Prior Authorization Verification Slip</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
                        h2 { margin: 0 0 4px 0; color: #0284c7; }
                        hr { border: none; border-top: 1px solid #cbd5e1; margin: 16px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                        th { background: #f8fafc; font-size: 12px; text-transform: uppercase; }
                        .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; background: #dcfce7; color: #15803d; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        };
    }
}

/**
 * Fetch live authorizations data from backend
 */
async function loadAuthorizations() {
    const searchVal = document.getElementById("authSearchInput")?.value || "";
    const statusVal = document.getElementById("authStatusFilter")?.value || "all";

    let url = `/authorizations?tab=all`;
    if (!isAllPatientsScope && currentActivePatientNo) {
        url += `&patient_no=${encodeURIComponent(currentActivePatientNo)}`;
    }
    if (statusVal && statusVal !== 'all') {
        url += `&status=${encodeURIComponent(statusVal)}`;
    }
    if (searchVal.trim()) {
        url += `&search=${encodeURIComponent(searchVal.trim())}`;
    }

    try {
        const res = await api(url);
        if (res.success && res.data) {
            state.clinical = res.data.clinical_authorizations || [];
            state.priorAuths = res.data.prior_authorizations || [];
            state.stats = res.data.stats || {};
            state.insurances = res.data.insurances || [];
            state.patient = res.data.patient || null;
            state.patients = res.data.patients || [];

            renderBanner();
            renderKpis();
            renderTabCounts();

            if (currentTab === 'clinical') {
                renderClinicalTable();
            } else {
                renderPriorTable();
            }
        }
    } catch (err) {
        console.error("Failed to load authorizations:", err);
        showToast("Error retrieving authorizations from database.", "error");
    }
}

/**
 * Render Active Patient Scope Banner
 */
function renderBanner() {
    const banner = document.getElementById("authScopeBanner");
    const avatar = document.getElementById("authPatientAvatar");
    const nameEl = document.getElementById("authPatientName");
    const metaEl = document.getElementById("authPatientMeta");
    const badgeEl = document.getElementById("authPatientBadge");
    const toggleLabel = document.getElementById("authToggleScopeLabel");

    if (!banner) return;

    if (!isAllPatientsScope && state.patient) {
        const p = state.patient;
        const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || 'PT';
        if (avatar) avatar.textContent = initials;
        if (nameEl) nameEl.textContent = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        if (metaEl) metaEl.textContent = `Chart: ${p.patient_no} | DOB: ${p.birthdate || 'N/A'} | Sex: ${p.sex || 'N/A'}`;
        if (badgeEl) {
            badgeEl.className = "auth-badge auth-badge-active";
            badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span> Active Open Patient`;
        }
        if (toggleLabel) toggleLabel.textContent = "View All Patients Queue";
    } else {
        if (avatar) avatar.textContent = "ALL";
        if (nameEl) nameEl.textContent = "All Patients Clinic Queue";
        if (metaEl) metaEl.textContent = `Showing clinic-wide authorizable notes and insurance prior auths`;
        if (badgeEl) {
            badgeEl.className = "auth-badge auth-badge-all";
            badgeEl.innerHTML = `<i class="fas fa-hospital-user"></i> Clinic-Wide View`;
        }
        if (toggleLabel) toggleLabel.textContent = currentActivePatientNo ? `Switch to Active Patient (${currentActivePatientNo})` : "Filter by Patient";
    }
}

/**
 * Render KPI Statistics
 */
function renderKpis() {
    const pendingEl = document.getElementById("authKpiPending");
    const authEl = document.getElementById("authKpiAuthorized");
    const activePaEl = document.getElementById("authKpiActivePa");
    const expiringEl = document.getElementById("authKpiExpiring");

    if (pendingEl) pendingEl.textContent = state.stats.pending_clinical || 0;
    if (authEl) authEl.textContent = state.stats.authorized_clinical || 0;
    if (activePaEl) activePaEl.textContent = state.stats.active_prior_auth || 0;
    if (expiringEl) expiringEl.textContent = state.stats.expiring_prior_auth || 0;
}

/**
 * Update tab counter badges
 */
function renderTabCounts() {
    const clinicalCount = document.getElementById("authTabClinicalCount");
    const priorCount = document.getElementById("authTabPriorAuthCount");

    const pendingClinical = state.clinical.filter(c => c.status === 'pending').length;
    if (clinicalCount) clinicalCount.textContent = pendingClinical;

    const activePa = state.priorAuths.filter(p => p.status === 'Active').length;
    if (priorCount) priorCount.textContent = activePa;
}

/**
 * Render Clinical Sign-Offs Queue Table
 */
function renderClinicalTable() {
    const tbody = document.getElementById("authClinicalTableBody");
    if (!tbody) return;

    if (!state.clinical || state.clinical.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-clipboard-check" style="font-size: 32px; margin-bottom: 10px; display: block; color: #cbd5e1;"></i>
                    No clinical documentation awaiting sign-off matching current filter.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.clinical.map(item => {
        const isPending = (item.status === 'pending');
        const isAuthorized = (item.status === 'authorized');
        const statusTagClass = isPending ? 'auth-tag-pending' : (isAuthorized ? 'auth-tag-authorized' : 'auth-tag-returned');
        const statusLabel = isPending ? 'Pending Sign-Off' : (isAuthorized ? 'Authorized' : 'Returned');

        const excerpt = item.content ? (item.content.length > 80 ? item.content.substring(0, 80) + '...' : item.content) : 'No content preview';
        const dateDisplay = item.service_date ? item.service_date.replace('T', ' ').substring(0, 16) : 'N/A';
        const isChecked = selectedClinicalIds.has(String(item.id));

        return `
            <tr data-id="${item.id}">
                <td style="text-align: center;">
                    ${isPending ? `<input type="checkbox" class="auth-clinical-cb" data-id="${item.id}" ${isChecked ? 'checked' : ''}>` : ''}
                </td>
                <td style="white-space: nowrap; font-weight: 500;">
                    ${escapeHtml(dateDisplay)}
                </td>
                <td>
                    <div style="font-weight: 600; color: #0284c7;">${escapeHtml(item.patient_name || 'Patient')}</div>
                    <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(item.patient_no || '')}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(item.document_type || 'Note')}</div>
                    <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(item.title || '')}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${escapeHtml(item.author_name || 'Staff')}</div>
                    <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(item.author_role || '')}</div>
                </td>
                <td style="max-width: 250px;">
                    <span style="font-family: monospace; font-size: 12px; color: #475569;" title="${escapeHtml(item.content || '')}">
                        ${escapeHtml(excerpt)}
                    </span>
                </td>
                <td>
                    <span class="auth-status-tag ${statusTagClass}">
                        <i class="fas ${isPending ? 'fa-clock' : (isAuthorized ? 'fa-check' : 'fa-undo')}"></i>
                        ${statusLabel}
                    </span>
                </td>
                <td style="font-size: 12px;">
                    ${item.authorized_by_name ? `<div>${escapeHtml(item.authorized_by_name)}</div><div style="color: #94a3b8; font-size: 11px;">${escapeHtml(item.authorized_at || '')}</div>` : '<span style="color: #94a3b8;">—</span>'}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="auth-btn-outline auth-review-btn" data-id="${item.id}" style="padding: 4px 10px; font-size: 12px;">
                        <i class="fas fa-search-plus"></i> ${isPending ? 'Review & Sign' : 'View Details'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Attach row checkbox handlers
    tbody.querySelectorAll(".auth-clinical-cb").forEach(cb => {
        cb.onchange = (e) => {
            const id = String(e.target.dataset.id);
            if (e.target.checked) {
                selectedClinicalIds.add(id);
            } else {
                selectedClinicalIds.delete(id);
            }
            updateBatchSignButton();
        };
    });

    // Attach Review & Sign buttons
    tbody.querySelectorAll(".auth-review-btn").forEach(btn => {
        btn.onclick = () => {
            const id = String(btn.dataset.id);
            const item = state.clinical.find(c => String(c.id) === id);
            if (item) openReviewModal(item);
        };
    });
}

/**
 * Open Review & Sign Modal for a specific note
 */
function openReviewModal(item) {
    currentReviewItem = item;
    const modal = document.getElementById("authSignModal");
    if (!modal) return;

    document.getElementById("authSignPatientName").textContent = `${item.patient_name || 'Patient'} (${item.patient_no || ''})`;
    document.getElementById("authSignNoteType").textContent = `${item.document_type || 'Clinical Document'} - ${item.title || ''}`;
    document.getElementById("authSignAuthor").textContent = `${item.author_name || 'Staff'} (${item.author_role || 'Author'})`;
    document.getElementById("authSignDate").textContent = item.service_date ? item.service_date.replace('T', ' ') : '';
    document.getElementById("authSignContent").textContent = item.content || '(No narrative text recorded)';
    document.getElementById("authSignComments").value = item.comments || '';

    const isPending = (item.status === 'pending');
    const approveBtn = document.getElementById("authSignApproveBtn");
    const returnBtn = document.getElementById("authSignReturnBtn");
    const confirmCb = document.getElementById("authSignConfirmCheckbox");

    if (approveBtn) approveBtn.style.display = isPending ? 'inline-flex' : 'none';
    if (returnBtn) returnBtn.style.display = isPending ? 'inline-flex' : 'none';
    if (confirmCb) {
        confirmCb.parentElement.style.display = isPending ? 'flex' : 'none';
        confirmCb.checked = true;
    }

    modal.style.display = "flex";
}

/**
 * Update Batch Sign button state
 */
function updateBatchSignButton() {
    const btn = document.getElementById("authBatchSignBtn");
    const countEl = document.getElementById("authSelectedCount");
    if (!btn || !countEl) return;

    countEl.textContent = selectedClinicalIds.size;
    btn.style.display = selectedClinicalIds.size > 0 ? "inline-flex" : "none";
}

/**
 * Render Prior Authorizations Table
 */
function renderPriorTable() {
    const tbody = document.getElementById("authPriorTableBody");
    if (!tbody) return;

    if (!state.priorAuths || state.priorAuths.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-id-card-alt" style="font-size: 32px; margin-bottom: 10px; display: block; color: #cbd5e1;"></i>
                    No prior authorizations found for current selection.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.priorAuths.map(pa => {
        const remaining = Math.max(0, Number(pa.units_approved) - Number(pa.units_used));
        let unitsBadgeClass = 'auth-units-good';
        if (remaining === 0) unitsBadgeClass = 'auth-units-empty';
        else if (remaining <= 2) unitsBadgeClass = 'auth-units-low';

        const isExpired = (pa.effective_status === 'Expired');
        const isActive = (pa.status === 'Active' && !isExpired);
        let statusTagClass = 'auth-tag-active';
        if (isExpired) statusTagClass = 'auth-tag-expired';
        else if (pa.status === 'Completed') statusTagClass = 'auth-tag-completed';
        else if (pa.status === 'Denied') statusTagClass = 'auth-tag-denied';
        else if (pa.status === 'Pending') statusTagClass = 'auth-tag-pending';

        return `
            <tr data-id="${pa.id}">
                <td>
                    <div style="font-family: monospace; font-weight: 700; color: #0284c7; font-size: 13.5px;">
                        ${escapeHtml(pa.auth_number)}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(pa.provider_name || 'Clinic')}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(pa.patient_name || 'Patient')}</div>
                    <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(pa.patient_no || '')}</div>
                </td>
                <td style="font-weight: 500;">
                    ${escapeHtml(pa.payer_name)}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${pa.cpt_code ? `<span style="background: #e2e8f0; color: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">CPT ${escapeHtml(pa.cpt_code)}</span>` : ''}
                        <span style="font-weight: 500;">${escapeHtml(pa.service_description)}</span>
                    </div>
                </td>
                <td style="font-size: 12px; white-space: nowrap;">
                    <div>${escapeHtml(pa.start_date)}</div>
                    <div style="color: ${isExpired ? '#dc2626' : '#64748b'}; font-weight: ${isExpired ? '600' : 'normal'};">
                        to ${escapeHtml(pa.end_date)}
                    </div>
                </td>
                <td style="text-align: center; font-weight: 600;">${pa.units_approved}</td>
                <td style="text-align: center;">${pa.units_used}</td>
                <td style="text-align: center;">
                    <span class="auth-units-badge ${unitsBadgeClass}">
                        ${remaining}
                    </span>
                </td>
                <td>
                    <span class="auth-status-tag ${statusTagClass}">
                        ${escapeHtml(isExpired ? 'Expired' : pa.status)}
                    </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: flex; justify-content: flex-end; gap: 4px;">
                        ${isActive && remaining > 0 ? `
                            <button class="auth-btn-success auth-log-visit-btn" data-id="${pa.id}" style="padding: 4px 8px; font-size: 11.5px;" title="Log 1 visit unit against this auth">
                                <i class="fas fa-plus"></i> Log Visit
                            </button>
                        ` : ''}
                        <button class="auth-btn-outline auth-print-slip-btn" data-id="${pa.id}" style="padding: 4px 8px; font-size: 11.5px;" title="Print Verification Slip">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="auth-btn-outline auth-edit-pa-btn" data-id="${pa.id}" style="padding: 4px 8px; font-size: 11.5px;" title="Edit Prior Auth">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Attach Log Visit Unit
    tbody.querySelectorAll(".auth-log-visit-btn").forEach(btn => {
        btn.onclick = async () => {
            const id = Number(btn.dataset.id);
            const pa = state.priorAuths.find(p => Number(p.id) === id);
            if (!pa) return;

            if (!confirm(`Log 1 encounter visit unit used for Auth #${pa.auth_number}?`)) return;

            try {
                const res = await api('/authorizations/prior-auth/decrement', {
                    method: 'POST',
                    body: JSON.stringify({ id: id })
                });
                if (res.success) {
                    showToast("Encounter visit logged against prior authorization!", "success");
                    await loadAuthorizations();
                } else {
                    showToast(res.message || "Failed to log visit.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error updating authorized units.", "error");
            }
        };
    });

    // Attach Edit Prior Auth
    tbody.querySelectorAll(".auth-edit-pa-btn").forEach(btn => {
        btn.onclick = () => {
            const id = Number(btn.dataset.id);
            const pa = state.priorAuths.find(p => Number(p.id) === id);
            if (pa) openPriorAuthModal(pa);
        };
    });

    // Attach Print Slip
    tbody.querySelectorAll(".auth-print-slip-btn").forEach(btn => {
        btn.onclick = () => {
            const id = Number(btn.dataset.id);
            const pa = state.priorAuths.find(p => Number(p.id) === id);
            if (pa) openPrintModal(pa);
        };
    });
}

/**
 * Open Modal for New or Edit Prior Auth
 */
function openPriorAuthModal(pa = null) {
    const modal = document.getElementById("authPriorModal");
    const title = document.getElementById("authPriorModalTitle");
    const patientSelect = document.getElementById("authPriorPatientSelect");
    const payerDatalist = document.getElementById("authInsuranceDatalist");

    if (!modal) return;

    // Populate patient dropdown
    if (patientSelect) {
        patientSelect.innerHTML = state.patients.map(p => {
            const isSelected = pa ? (Number(p.id) === Number(pa.patient_id)) : (state.patient && Number(p.id) === Number(state.patient.id));
            return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.patient_no)})</option>`;
        }).join('');
    }

    // Populate insurance suggestions
    if (payerDatalist) {
        payerDatalist.innerHTML = state.insurances.map(i => `<option value="${escapeHtml(i.name)}">`).join('');
    }

    const today = new Date().toISOString().split('T')[0];
    const sixMonthsLater = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (pa) {
        if (title) title.textContent = `Edit Prior Authorization #${pa.auth_number}`;
        document.getElementById("authPriorId").value = pa.id;
        document.getElementById("authPriorPayerName").value = pa.payer_name || '';
        document.getElementById("authPriorNumber").value = pa.auth_number || '';
        document.getElementById("authPriorCpt").value = pa.cpt_code || '';
        document.getElementById("authPriorService").value = pa.service_description || '';
        document.getElementById("authPriorApprovedUnits").value = pa.units_approved || 1;
        document.getElementById("authPriorUsedUnits").value = pa.units_used || 0;
        document.getElementById("authPriorStartDate").value = pa.start_date || today;
        document.getElementById("authPriorEndDate").value = pa.end_date || sixMonthsLater;
        document.getElementById("authPriorProvider").value = pa.provider_name || '';
        document.getElementById("authPriorStatus").value = pa.status || 'Active';
        document.getElementById("authPriorNotes").value = pa.notes || '';
    } else {
        if (title) title.textContent = "New Prior Authorization";
        document.getElementById("authPriorId").value = '';
        document.getElementById("authPriorPayerName").value = state.insurances[0]?.name || '';
        document.getElementById("authPriorNumber").value = `PA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        document.getElementById("authPriorCpt").value = '';
        document.getElementById("authPriorService").value = '';
        document.getElementById("authPriorApprovedUnits").value = '1';
        document.getElementById("authPriorUsedUnits").value = '0';
        document.getElementById("authPriorStartDate").value = today;
        document.getElementById("authPriorEndDate").value = sixMonthsLater;
        document.getElementById("authPriorProvider").value = 'Supervising Physician, MD';
        document.getElementById("authPriorStatus").value = 'Active';
        document.getElementById("authPriorNotes").value = '';
    }

    modal.style.display = "flex";
}

/**
 * Open Print Modal for Prior Auth Slip
 */
function openPrintModal(pa) {
    const modal = document.getElementById("authPrintModal");
    const container = document.getElementById("authPrintSlipContent");
    if (!modal || !container) return;

    const remaining = Math.max(0, Number(pa.units_approved) - Number(pa.units_used));

    container.innerHTML = `
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="margin: 0; color: #0284c7;">USINTELLIX HEALTHCARE SYSTEM</h2>
            <div style="font-size: 13px; color: #64748b;">Prior Authorization Verification & Encounter Certification Slip</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div>
                <strong style="font-size: 12px; color: #64748b; text-transform: uppercase;">Patient Information</strong>
                <div style="font-size: 15px; font-weight: bold; margin-top: 2px;">${escapeHtml(pa.patient_name || 'Patient')}</div>
                <div style="font-size: 13px; color: #475569;">Chart Number: <strong>${escapeHtml(pa.patient_no || 'N/A')}</strong></div>
            </div>
            <div>
                <strong style="font-size: 12px; color: #64748b; text-transform: uppercase;">Payer / Insurance</strong>
                <div style="font-size: 15px; font-weight: bold; margin-top: 2px;">${escapeHtml(pa.payer_name)}</div>
                <div style="font-size: 13px; color: #475569;">Rendering Provider: ${escapeHtml(pa.provider_name || 'Clinic')}</div>
            </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; color: #64748b;">Authorization Number:</span>
                <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #0284c7;">${escapeHtml(pa.auth_number)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px;">
                <span>Procedure / CPT Code:</span>
                <strong>${pa.cpt_code ? escapeHtml(pa.cpt_code) + ' — ' : ''}${escapeHtml(pa.service_description)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px;">
                <span>Validity Period:</span>
                <strong>${escapeHtml(pa.start_date)} to ${escapeHtml(pa.end_date)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
                <span>Status:</span>
                <span class="badge" style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:4px; font-weight:bold;">${escapeHtml(pa.status)}</span>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; text-align: center; font-size: 13.5px;">
            <thead>
                <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 8px;">Approved Units</th>
                    <th style="padding: 8px;">Units Used</th>
                    <th style="padding: 8px;">Remaining Units</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; font-size: 16px; font-weight: bold;">${pa.units_approved}</td>
                    <td style="padding: 10px; font-size: 16px; font-weight: bold;">${pa.units_used}</td>
                    <td style="padding: 10px; font-size: 16px; font-weight: bold; color: #16a34a;">${remaining}</td>
                </tr>
            </tbody>
        </table>

        ${pa.notes ? `
            <div style="margin-bottom: 16px;">
                <strong style="font-size: 12px; color: #64748b;">CLINICAL NOTES / GUIDELINES:</strong>
                <div style="font-size: 13px; color: #334155; margin-top: 4px; background: #fff; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 4px;">
                    ${escapeHtml(pa.notes)}
                </div>
            </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b;">
            <div>Printed on: ${new Date().toLocaleString()}</div>
            <div>Authorized Signature: _______________________</div>
        </div>
    `;

    modal.style.display = "flex";
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
