import {
    fetchWorkforceStats,
    fetchStaffTrainingList,
    recordTrainingEvent,
    fetchTrainingDetails,
    fetchSanctionsList,
    recordSanctionEvent,
    updateSanctionEvent,
    fetchSanctionDossier
} from "./workforce-governance.service.js";
import { showToast } from "../../core/toast.js";

let currentStaffList = [];
let currentSanctionsList = [];
let activeTrainingFilter = "all";
let activeSanctionFilter = "all";
let trainingSearchTerm = "";
let sanctionSearchTerm = "";
let selectedCertData = null;
let selectedDossierData = null;

export async function initWorkforceGovernance(container = document) {
    setupTabSwitching(container);
    setupFilterPills(container);
    setupSearchInputs(container);
    setupModals(container);
    setupFormSubmissions(container);
    setupPrintHandlers(container);

    await refreshDashboard(container);
}

async function refreshDashboard(container) {
    await Promise.all([
        loadStats(container),
        loadStaffList(container),
        loadSanctionsList(container)
    ]);
}

async function loadStats(container) {
    try {
        const res = await fetchWorkforceStats();
        if (!res || !res.success || !res.data) return;

        const d = res.data;
        const totalWorkforce = container.querySelector("#kpiTotalWorkforce");
        const complianceRate = container.querySelector("#kpiComplianceRate");
        const compliantStaff = container.querySelector("#kpiCompliantStaff");
        const overdueCount = container.querySelector("#kpiOverdueCount");
        const approachingCount = container.querySelector("#kpiApproachingCount");
        const totalSanctions = container.querySelector("#kpiTotalSanctions");
        const activeSanctions = container.querySelector("#kpiActiveSanctions");
        const severeSanctions = container.querySelector("#kpiSevereSanctions");

        if (totalWorkforce) totalWorkforce.textContent = d.total_workforce;
        if (complianceRate) complianceRate.textContent = `${d.compliance_rate}%`;
        if (compliantStaff) compliantStaff.textContent = `${d.compliant_count} compliant members`;
        if (overdueCount) overdueCount.textContent = d.overdue_count;
        if (approachingCount) approachingCount.textContent = d.approaching_count;
        if (totalSanctions) totalSanctions.textContent = d.total_sanctions;
        if (activeSanctions) activeSanctions.textContent = `${d.active_sanctions} active / under review`;
        if (severeSanctions) severeSanctions.textContent = d.severe_sanctions;
    } catch (e) {
        console.error("Error loading workforce stats:", e);
    }
}

async function loadStaffList(container) {
    const tbody = container.querySelector("#tbodyWorkforceTrainings");
    if (!tbody) return;

    try {
        const res = await fetchStaffTrainingList({
            search: trainingSearchTerm,
            status: activeTrainingFilter
        });

        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #dc2626; padding: 24px;">Failed to load staff list.</td></tr>`;
            return;
        }

        currentStaffList = res.data || [];
        populateEmployeeDropdowns(container, currentStaffList);

        if (currentStaffList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 32px;">No workforce members match the selected criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = currentStaffList.map(staff => {
            const statusBadge = getStatusBadge(staff.evaluated_status, staff.days_remaining);
            const scoreDisplay = staff.hipaa_training_score !== null && staff.hipaa_training_score !== undefined
                ? `<span style="font-weight: 700; color: #047857;">${staff.hipaa_training_score}%</span>`
                : `<span style="color: #94a3b8;">N/A</span>`;

            const certDisplay = staff.hipaa_cert_ref
                ? `<span class="wg-code">${escapeHtml(staff.hipaa_cert_ref)}</span>`
                : `<span style="color: #94a3b8;">None</span>`;

            return `
            <tr>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${escapeHtml(staff.full_name)}</div>
                    <div style="font-size: 11px; color: #64748b;">${escapeHtml(staff.employee_no || 'No ID')} &bull; @${escapeHtml(staff.username || 'n/a')}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(staff.role_name || 'Staff')}</div>
                    <div style="font-size: 11px; color: #64748b;">${escapeHtml(staff.department_name || 'General')}</div>
                </td>
                <td>${staff.hire_date ? staff.hire_date.substring(0, 10) : 'N/A'}</td>
                <td>${staff.hipaa_initial_training_date || '<span style="color:#dc2626;font-weight:600;">Pending</span>'}</td>
                <td>${staff.hipaa_last_refresher_date || '<span style="color:#94a3b8;">Never</span>'}</td>
                <td>
                    <strong>${staff.hipaa_next_refresher_due || 'Immediate'}</strong>
                    ${staff.days_remaining !== undefined ? `<div style="font-size: 11px; color: ${staff.days_remaining < 0 ? '#dc2626' : (staff.days_remaining <= 30 ? '#d97706' : '#15803d')}; font-weight: 600;">${staff.days_remaining < 0 ? Math.abs(staff.days_remaining) + 'd overdue' : staff.days_remaining + 'd left'}</div>` : ''}
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div>${scoreDisplay}</div>
                    <div style="margin-top: 2px;">${certDisplay}</div>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="wg-btn wg-btn-outline btn-record-single-training" data-emp-id="${staff.id}" data-emp-name="${escapeHtml(staff.full_name)}" style="padding: 5px 9px; font-size: 11px;">
                        <i class="fa-solid fa-plus"></i> Record
                    </button>
                    ${staff.hipaa_cert_ref ? `
                    <button type="button" class="wg-btn wg-btn-outline btn-view-cert" data-emp-id="${staff.id}" style="padding: 5px 9px; font-size: 11px; margin-left: 4px;">
                        <i class="fa-solid fa-certificate"></i> Cert
                    </button>
                    ` : ''}
                </td>
            </tr>
            `;
        }).join('');

        // Wire record training buttons
        tbody.querySelectorAll(".btn-record-single-training").forEach(btn => {
            btn.addEventListener("click", () => {
                const empId = btn.getAttribute("data-emp-id");
                openRecordTrainingModal(container, empId);
            });
        });

        // Wire certificate view buttons
        tbody.querySelectorAll(".btn-view-cert").forEach(btn => {
            btn.addEventListener("click", async () => {
                const empId = btn.getAttribute("data-emp-id");
                await showCertificateForStaff(container, empId);
            });
        });

    } catch (e) {
        console.error("Error loading staff list:", e);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #dc2626; padding: 24px;">Exception loading staff list.</td></tr>`;
    }
}

async function loadSanctionsList(container) {
    const tbody = container.querySelector("#tbodySanctions");
    if (!tbody) return;

    try {
        const res = await fetchSanctionsList({
            search: sanctionSearchTerm,
            status: activeSanctionFilter
        });

        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #dc2626; padding: 24px;">Failed to load sanctions log.</td></tr>`;
            return;
        }

        currentSanctionsList = res.data || [];

        if (currentSanctionsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 32px;">No disciplinary sanctions recorded under this filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = currentSanctionsList.map(s => {
            const sevBadge = getSeverityBadge(s.severity_level);
            const actionText = formatAction(s.disciplinary_action);

            return `
            <tr>
                <td>
                    <span class="wg-code">${escapeHtml(s.sanction_code)}</span>
                    ${s.incident_number ? `<div style="font-size: 10px; color: #6366f1; margin-top: 2px;">Ref: ${escapeHtml(s.incident_number)}</div>` : ''}
                </td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${escapeHtml(s.full_name)}</div>
                    <div style="font-size: 11px; color: #64748b;">${escapeHtml(s.employee_no || '')} &bull; ${escapeHtml(s.department_name || '')}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${formatCategory(s.violation_category)}</div>
                    <div style="font-size: 11px; color: #64748b;">Date: ${s.violation_date}</div>
                </td>
                <td>${sevBadge}</td>
                <td>
                    <div style="font-weight: 700; color: ${s.disciplinary_action === 'immediate_termination' ? '#dc2626' : (s.disciplinary_action === 'suspension_without_pay' ? '#c2410c' : '#334155')};">${actionText}</div>
                    ${s.suspension_days > 0 ? `<div style="font-size: 11px; color: #b91c1c;">${s.suspension_days} days suspension</div>` : ''}
                </td>
                <td>${s.sanction_effective_date}</td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(s.sanctioning_officer_name)}</div>
                    <div style="font-size: 11px; color: #64748b;">${escapeHtml(s.sanctioning_officer_role)}</div>
                </td>
                <td>
                    <span class="badge-status ${s.status === 'closed_remediated' ? 'badge-compliant' : (s.status === 'under_investigation' ? 'badge-approaching' : 'badge-overdue')}">
                        ${s.status.toUpperCase().replace('_', ' ')}
                    </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="wg-btn wg-btn-outline btn-view-dossier" data-sanction-id="${s.id}" style="padding: 5px 9px; font-size: 11px;">
                        <i class="fa-solid fa-file-shield"></i> Dossier
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        tbody.querySelectorAll(".btn-view-dossier").forEach(btn => {
            btn.addEventListener("click", async () => {
                const sanctionId = btn.getAttribute("data-sanction-id");
                await showSanctionDossier(container, sanctionId);
            });
        });

    } catch (e) {
        console.error("Error loading sanctions list:", e);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #dc2626; padding: 24px;">Exception loading sanctions log.</td></tr>`;
    }
}

function setupTabSwitching(container) {
    const btnTrainings = container.querySelector("#tabBtnTrainings");
    const btnSanctions = container.querySelector("#tabBtnSanctions");
    const contentTrainings = container.querySelector("#tabContentTrainings");
    const contentSanctions = container.querySelector("#tabContentSanctions");

    if (!btnTrainings || !btnSanctions) return;

    btnTrainings.addEventListener("click", () => {
        btnTrainings.classList.add("active");
        btnSanctions.classList.remove("active");
        contentTrainings.classList.add("active");
        contentSanctions.classList.remove("active");
    });

    btnSanctions.addEventListener("click", () => {
        btnSanctions.classList.add("active");
        btnTrainings.classList.remove("active");
        contentSanctions.classList.add("active");
        contentTrainings.classList.remove("active");
    });
}

function setupFilterPills(container) {
    // Training filter pills
    const tPills = container.querySelectorAll("#trainingFilterPills .wg-pill");
    tPills.forEach(pill => {
        pill.addEventListener("click", async () => {
            tPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeTrainingFilter = pill.getAttribute("data-filter");
            await loadStaffList(container);
        });
    });

    // Sanction filter pills
    const sPills = container.querySelectorAll("#sanctionFilterPills .wg-pill");
    sPills.forEach(pill => {
        pill.addEventListener("click", async () => {
            sPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeSanctionFilter = pill.getAttribute("data-filter");
            await loadSanctionsList(container);
        });
    });
}

function setupSearchInputs(container) {
    let tTimeout = null;
    const tInput = container.querySelector("#trainingSearchInput");
    if (tInput) {
        tInput.addEventListener("input", () => {
            clearTimeout(tTimeout);
            tTimeout = setTimeout(async () => {
                trainingSearchTerm = tInput.value.trim();
                await loadStaffList(container);
            }, 300);
        });
    }

    let sTimeout = null;
    const sInput = container.querySelector("#sanctionSearchInput");
    if (sInput) {
        sInput.addEventListener("input", () => {
            clearTimeout(sTimeout);
            sTimeout = setTimeout(async () => {
                sanctionSearchTerm = sInput.value.trim();
                await loadSanctionsList(container);
            }, 300);
        });
    }
}

function setupModals(container) {
    // Record Training Modal
    const btnOpenRecordTraining = container.querySelector("#btnOpenRecordTrainingModal");
    const modalRecordTraining = container.querySelector("#modalRecordTrainingOverlay");
    const btnCloseRecordTraining = container.querySelector("#btnCloseRecordTrainingModal");
    const btnCancelRecordTraining = container.querySelector("#btnCancelRecordTraining");

    if (btnOpenRecordTraining && modalRecordTraining) {
        btnOpenRecordTraining.addEventListener("click", () => openRecordTrainingModal(container));
    }
    if (btnCloseRecordTraining && modalRecordTraining) {
        btnCloseRecordTraining.addEventListener("click", () => modalRecordTraining.classList.remove("open"));
    }
    if (btnCancelRecordTraining && modalRecordTraining) {
        btnCancelRecordTraining.addEventListener("click", () => modalRecordTraining.classList.remove("open"));
    }

    // Log Sanction Modal
    const btnOpenLogSanction = container.querySelector("#btnOpenLogSanctionModal");
    const modalLogSanction = container.querySelector("#modalLogSanctionOverlay");
    const btnCloseLogSanction = container.querySelector("#btnCloseLogSanctionModal");
    const btnCancelLogSanction = container.querySelector("#btnCancelLogSanction");

    if (btnOpenLogSanction && modalLogSanction) {
        btnOpenLogSanction.addEventListener("click", () => openLogSanctionModal(container));
    }
    if (btnCloseLogSanction && modalLogSanction) {
        btnCloseLogSanction.addEventListener("click", () => modalLogSanction.classList.remove("open"));
    }
    if (btnCancelLogSanction && modalLogSanction) {
        btnCancelLogSanction.addEventListener("click", () => modalLogSanction.classList.remove("open"));
    }

    // Cert Modal Close
    const modalCert = container.querySelector("#modalTrainingCertOverlay");
    const btnCloseCert = container.querySelector("#btnCloseTrainingCertModal");
    const btnCancelCert = container.querySelector("#btnCancelTrainingCert");
    if (btnCloseCert && modalCert) {
        btnCloseCert.addEventListener("click", () => modalCert.classList.remove("open"));
    }
    if (btnCancelCert && modalCert) {
        btnCancelCert.addEventListener("click", () => modalCert.classList.remove("open"));
    }

    // Dossier Modal Close
    const modalDossier = container.querySelector("#modalSanctionDossierOverlay");
    const btnCloseDossier = container.querySelector("#btnCloseSanctionDossierModal");
    const btnCancelDossier = container.querySelector("#btnCancelSanctionDossier");
    if (btnCloseDossier && modalDossier) {
        btnCloseDossier.addEventListener("click", () => modalDossier.classList.remove("open"));
    }
    if (btnCancelDossier && modalDossier) {
        btnCancelDossier.addEventListener("click", () => modalDossier.classList.remove("open"));
    }
}

function openRecordTrainingModal(container, preselectedEmpId = null) {
    const modal = container.querySelector("#modalRecordTrainingOverlay");
    if (!modal) return;

    const empSelect = modal.querySelector("#trainingEmployeeId");
    if (empSelect && preselectedEmpId) {
        empSelect.value = preselectedEmpId;
    }

    const compDate = modal.querySelector("#trainingCompletionDate");
    if (compDate && !compDate.value) {
        compDate.value = new Date().toISOString().split("T")[0];
    }

    modal.classList.add("open");
}

function openLogSanctionModal(container) {
    const modal = container.querySelector("#modalLogSanctionOverlay");
    if (!modal) return;

    const vDate = modal.querySelector("#sanctionViolationDate");
    const effDate = modal.querySelector("#sanctionEffectiveDate");
    const today = new Date().toISOString().split("T")[0];

    if (vDate && !vDate.value) vDate.value = today;
    if (effDate && !effDate.value) effDate.value = today;

    modal.classList.add("open");
}

function populateEmployeeDropdowns(container, staffList) {
    const tSelect = container.querySelector("#trainingEmployeeId");
    const sSelect = container.querySelector("#sanctionEmployeeId");

    const optionsHtml = `<option value="">Select workforce member...</option>` +
        staffList.map(s => `<option value="${s.id}">${escapeHtml(s.full_name)} (${s.employee_no || 'ID#' + s.id} &bull; ${escapeHtml(s.role_name || 'Staff')})</option>`).join('');

    if (tSelect) tSelect.innerHTML = optionsHtml;
    if (sSelect) sSelect.innerHTML = optionsHtml;
}

function setupFormSubmissions(container) {
    // Record Training Form
    const formTraining = container.querySelector("#formRecordTraining");
    if (formTraining) {
        formTraining.addEventListener("submit", async (e) => {
            e.preventDefault();

            const data = {
                employee_id: parseInt(formTraining.querySelector("#trainingEmployeeId").value, 10),
                training_type: formTraining.querySelector("#trainingType").value,
                completion_date: formTraining.querySelector("#trainingCompletionDate").value,
                curriculum_title: formTraining.querySelector("#trainingCurriculum").value.trim(),
                score_percent: parseFloat(formTraining.querySelector("#trainingScore").value),
                delivery_method: formTraining.querySelector("#trainingDeliveryMethod").value,
                trainer_or_proctor: formTraining.querySelector("#trainingProctor").value.trim(),
                verification_notes: formTraining.querySelector("#trainingNotes").value.trim()
            };

            const submitBtn = formTraining.querySelector("#btnSubmitRecordTraining");
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

            try {
                const res = await recordTrainingEvent(data);
                if (res && res.success) {
                    showToast("HIPAA training certification recorded successfully.", "success");
                    container.querySelector("#modalRecordTrainingOverlay").classList.remove("open");
                    formTraining.reset();
                    await refreshDashboard(container);
                } else {
                    showToast(res.message || "Failed to record training event.", "error");
                }
            } catch (err) {
                console.error("Training submission error:", err);
                showToast(err.message || "Error submitting training record.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Save &amp; Generate Certificate</span>`;
            }
        });
    }

    // Log Sanction Form
    const formSanction = container.querySelector("#formLogSanction");
    if (formSanction) {
        formSanction.addEventListener("submit", async (e) => {
            e.preventDefault();

            const data = {
                employee_id: parseInt(formSanction.querySelector("#sanctionEmployeeId").value, 10),
                violation_date: formSanction.querySelector("#sanctionViolationDate").value,
                violation_category: formSanction.querySelector("#sanctionCategory").value,
                severity_level: formSanction.querySelector("#sanctionSeverity").value,
                disciplinary_action: formSanction.querySelector("#sanctionAction").value,
                sanction_effective_date: formSanction.querySelector("#sanctionEffectiveDate").value,
                investigation_findings: formSanction.querySelector("#sanctionFindings").value.trim(),
                disciplinary_rationale: formSanction.querySelector("#sanctionRationale").value.trim(),
                remediation_required: formSanction.querySelector("#sanctionRemediation").value,
                suspension_days: parseInt(formSanction.querySelector("#sanctionSuspensionDays").value || 0, 10),
                sanctioning_officer_name: formSanction.querySelector("#sanctionOfficerName").value.trim(),
                sanctioning_officer_role: formSanction.querySelector("#sanctionOfficerRole").value.trim(),
                signoff_date: new Date().toISOString().split("T")[0]
            };

            const submitBtn = formSanction.querySelector("#btnSubmitLogSanction");
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

            try {
                const res = await recordSanctionEvent(data);
                if (res && res.success) {
                    showToast(`Disciplinary sanction ${res.data.sanction_code} recorded successfully.`, "success");
                    container.querySelector("#modalLogSanctionOverlay").classList.remove("open");
                    formSanction.reset();
                    await refreshDashboard(container);
                } else {
                    showToast(res.message || "Failed to record disciplinary sanction.", "error");
                }
            } catch (err) {
                console.error("Sanction submission error:", err);
                showToast(err.message || "Error submitting disciplinary sanction.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-gavel"></i> <span>Record Disciplinary Sanction</span>`;
            }
        });
    }
}

async function showCertificateForStaff(container, empId) {
    const modal = container.querySelector("#modalTrainingCertOverlay");
    const content = container.querySelector("#trainingCertContent");
    if (!modal || !content) return;

    const staff = currentStaffList.find(s => String(s.id) === String(empId));
    if (!staff) return;

    selectedCertData = {
        staff_name: staff.full_name,
        employee_no: staff.employee_no || `EMP-${staff.id}`,
        role: staff.role_name || 'Staff',
        department: staff.department_name || 'General Operations',
        cert_code: staff.hipaa_cert_ref || 'CERT-PENDING',
        curriculum: staff.hipaa_curriculum_name || 'HIPAA Security Awareness & Privacy Rule Certification',
        score: staff.hipaa_training_score !== null ? staff.hipaa_training_score : 100,
        completion_date: staff.hipaa_last_refresher_date || staff.hipaa_initial_training_date || new Date().toISOString().split("T")[0],
        expiration_date: staff.hipaa_next_refresher_due || 'One Year After Completion',
        delivery_method: 'Online LMS E-Learning with Proctored Knowledge Assessment',
        facility_name: 'USIntellix Healthcare System'
    };

    content.innerHTML = `
    <div class="wg-printable-box" style="text-align: center; border: 4px double #0f172a; padding: 32px 24px; background: #ffffff;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #4f46e5; margin-bottom: 8px;">
            USINTELLIX HEALTHCARE SYSTEM &bull; COMPLIANCE &amp; PRIVACY OFFICE
        </div>
        <div style="font-size: 24px; font-weight: 800; color: #0f172a; font-family: serif; letter-spacing: 1px; margin-bottom: 4px;">
            CERTIFICATE OF HIPAA SECURITY &amp; PRIVACY COMPLIANCE
        </div>
        <div style="font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 24px;">
            In full satisfaction of Federal Statutory Requirements under 45 CFR § 164.308(a)(5)
        </div>

        <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">This certifies that workforce member</div>
        <div style="font-size: 26px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #cbd5e1; display: inline-block; padding-bottom: 4px; min-width: 320px; margin-bottom: 12px;">
            ${escapeHtml(selectedCertData.staff_name)}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 20px;">
            Employee No: <strong>${escapeHtml(selectedCertData.employee_no)}</strong> &bull; Role: <strong>${escapeHtml(selectedCertData.role)}</strong> &bull; Dept: <strong>${escapeHtml(selectedCertData.department)}</strong>
        </div>

        <div style="max-width: 540px; margin: 0 auto 24px; font-size: 13px; color: #334155; line-height: 1.6;">
            Has successfully completed the prescribed curriculum and demonstrated mastery of electronic Protected Health Information (ePHI) safeguards, breach notification protocols, and privacy policies:
            <div style="font-weight: 700; color: #4338ca; margin-top: 6px; font-size: 14px;">
                "${escapeHtml(selectedCertData.curriculum)}"
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 14px 0; margin-bottom: 24px;">
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Score Achieved</div>
                <div style="font-size: 16px; font-weight: 800; color: #047857;">${selectedCertData.score}% (PASSED)</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Completion Date</div>
                <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${selectedCertData.completion_date}</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Annual Renewal Due</div>
                <div style="font-size: 15px; font-weight: 700; color: #b45309;">${selectedCertData.expiration_date}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 16px;">
            <div style="text-align: left;">
                <div style="font-family: monospace; font-size: 12px; font-weight: 700; color: #334155;">Cert Ref: ${escapeHtml(selectedCertData.cert_code)}</div>
                <div style="font-size: 10px; color: #94a3b8;">Cryptographic Audit Validated &bull; System Generated</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Dr. Elizabeth Warren, JD, CHPC</div>
                <div style="font-size: 11px; color: #64748b;">Chief Privacy &amp; Security Compliance Officer</div>
            </div>
        </div>
    </div>
    `;

    modal.classList.add("open");
}

async function showSanctionDossier(container, sanctionId) {
    const modal = container.querySelector("#modalSanctionDossierOverlay");
    const content = container.querySelector("#sanctionDossierContent");
    if (!modal || !content) return;

    try {
        const res = await fetchSanctionDossier(sanctionId);
        if (!res || !res.success || !res.data) {
            showToast("Failed to load sanction dossier.", "error");
            return;
        }

        const d = res.data;
        const s = d.sanction;
        selectedDossierData = d;

        content.innerHTML = `
        <div class="wg-printable-box" style="border: 2px solid #0f172a; padding: 24px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                    <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${escapeHtml(d.facility_name)}</div>
                    <div style="font-size: 12px; color: #64748b;">${escapeHtml(d.facility_address)}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #4f46e5; margin-top: 4px;">OFFICIAL WORKFORCE DISCIPLINARY SANCTION RECORD</div>
                </div>
                <div style="text-align: right;">
                    <div class="wg-code" style="font-size: 14px; padding: 4px 8px;">${escapeHtml(s.sanction_code)}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${s.sanction_effective_date}</div>
                </div>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <div style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Statutory Citation &amp; Regulatory Mandate</div>
                <div style="font-size: 12px; color: #7f1d1d; margin-top: 2px;">
                    This disciplinary sanction is documented and maintained pursuant to <strong>45 CFR § 164.308(a)(1)(ii)(C)</strong> (*Sanction Policy*) requiring covered entities to apply and record appropriate disciplinary sanctions against workforce members who fail to comply with security and privacy safeguards.
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Workforce Member Sanctioned</div>
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${escapeHtml(s.full_name)}</div>
                    <div style="font-size: 12px; color: #64748b;">${escapeHtml(s.employee_no || '')} &bull; ${escapeHtml(s.role_name || 'Staff')} &bull; ${escapeHtml(s.department_name || '')}</div>
                </div>
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Disciplinary Action &amp; Severity</div>
                    <div style="font-size: 15px; font-weight: 800; color: #b91c1c;">${formatAction(s.disciplinary_action)}</div>
                    <div style="font-size: 12px; color: #64748b;">Severity: <strong>${s.severity_level.toUpperCase()}</strong> &bull; Status: <strong>${s.status.toUpperCase()}</strong></div>
                </div>
            </div>

            <div style="margin-bottom: 14px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px;">Violation Category &amp; Timeline</div>
                <div style="font-size: 13px; color: #1e293b;">
                    <strong>Category:</strong> ${formatCategory(s.violation_category)}<br>
                    <strong>Violation Date:</strong> ${s.violation_date} | <strong>Reported Date:</strong> ${s.reported_date} | <strong>Effective:</strong> ${s.sanction_effective_date}
                    ${s.suspension_days > 0 ? `<br><strong style="color:#b91c1c;">Suspension Duration:</strong> ${s.suspension_days} calendar days (without pay)` : ''}
                </div>
            </div>

            <div style="margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; margin-bottom: 4px;">Forensic Investigation Findings</div>
                <div style="font-size: 12px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(s.investigation_findings)}</div>
            </div>

            <div style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; margin-bottom: 4px;">Disciplinary Rationale &amp; Corrective Remediation</div>
                <div style="font-size: 12px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(s.disciplinary_rationale)}</div>
                <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
                    <strong>Mandatory Remediation:</strong> ${formatRemediation(s.remediation_required)}
                    ${s.remediation_deadline ? ` (Deadline: ${s.remediation_deadline})` : ''}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                <div>
                    <div style="font-size: 10px; color: #94a3b8;">HIPAA Audit Ledger Integrity Verified</div>
                    <div style="font-size: 11px; font-family: monospace; color: #64748b;">45 CFR § 164.308(a)(1)(ii)(C) &bull; Signoff: ${s.signoff_date}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(s.sanctioning_officer_name)}</div>
                    <div style="font-size: 11px; color: #64748b;">${escapeHtml(s.sanctioning_officer_role)}</div>
                </div>
            </div>
        </div>
        `;

        modal.classList.add("open");
    } catch (e) {
        console.error("Error showing sanction dossier:", e);
        showToast("Error retrieving sanction dossier.", "error");
    }
}

function setupPrintHandlers(container) {
    // Print Training Certificate
    const btnPrintCert = container.querySelector("#btnPrintTrainingCert");
    if (btnPrintCert) {
        btnPrintCert.addEventListener("click", () => {
            if (!selectedCertData) return;
            printContentDirectly("HIPAA_Training_Certificate", getTrainingCertPrintHtml(selectedCertData));
        });
    }

    // Print Sanction Dossier
    const btnPrintDossier = container.querySelector("#btnPrintSanctionDossier");
    if (btnPrintDossier) {
        btnPrintDossier.addEventListener("click", () => {
            if (!selectedDossierData) return;
            printContentDirectly("Workforce_Disciplinary_Sanction_Dossier", getSanctionDossierPrintHtml(selectedDossierData));
        });
    }
}

function printContentDirectly(title, html) {
    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) {
        showToast("Please allow popups to print official compliance dossiers.", "warning");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                @page { size: letter; margin: 15mm; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                    color: #0f172a;
                    margin: 0;
                    padding: 20px;
                    background: #ffffff;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${html}
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function getTrainingCertPrintHtml(d) {
    return `
    <div style="text-align: center; border: 4px double #0f172a; padding: 40px 24px; background: #ffffff;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #4f46e5; margin-bottom: 8px;">
            ${escapeHtml(d.facility_name)} &bull; COMPLIANCE &amp; PRIVACY OFFICE
        </div>
        <div style="font-size: 26px; font-weight: 800; color: #0f172a; font-family: serif; letter-spacing: 1px; margin-bottom: 4px;">
            CERTIFICATE OF HIPAA SECURITY &amp; PRIVACY COMPLIANCE
        </div>
        <div style="font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 24px;">
            In full satisfaction of Federal Statutory Requirements under 45 CFR § 164.308(a)(5)
        </div>

        <div style="font-size: 14px; color: #475569; margin-bottom: 6px;">This certifies that workforce member</div>
        <div style="font-size: 28px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #cbd5e1; display: inline-block; padding-bottom: 4px; min-width: 320px; margin-bottom: 12px;">
            ${escapeHtml(d.staff_name)}
        </div>
        <div style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
            Employee No: <strong>${escapeHtml(d.employee_no)}</strong> &bull; Role: <strong>${escapeHtml(d.role)}</strong> &bull; Department: <strong>${escapeHtml(d.department)}</strong>
        </div>

        <div style="max-width: 580px; margin: 0 auto 28px; font-size: 14px; color: #334155; line-height: 1.6;">
            Has successfully completed the prescribed curriculum and demonstrated mastery of electronic Protected Health Information (ePHI) safeguards, breach notification protocols, and privacy policies:
            <div style="font-weight: 700; color: #4338ca; margin-top: 6px; font-size: 15px;">
                "${escapeHtml(d.curriculum)}"
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 16px 0; margin-bottom: 28px;">
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Score Achieved</div>
                <div style="font-size: 18px; font-weight: 800; color: #047857;">${d.score}% (PASSED)</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Completion Date</div>
                <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${d.completion_date}</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Annual Renewal Due</div>
                <div style="font-size: 16px; font-weight: 700; color: #b45309;">${d.expiration_date}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 16px;">
            <div style="text-align: left;">
                <div style="font-family: monospace; font-size: 12px; font-weight: 700; color: #334155;">Cert Ref: ${escapeHtml(d.cert_code)}</div>
                <div style="font-size: 10px; color: #94a3b8;">Cryptographic Audit Validated &bull; System Generated</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Dr. Elizabeth Warren, JD, CHPC</div>
                <div style="font-size: 11px; color: #64748b;">Chief Privacy &amp; Security Compliance Officer</div>
            </div>
        </div>
    </div>
    `;
}

function getSanctionDossierPrintHtml(d) {
    const s = d.sanction;
    return `
    <div style="border: 2px solid #0f172a; padding: 24px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
                <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${escapeHtml(d.facility_name)}</div>
                <div style="font-size: 12px; color: #64748b;">${escapeHtml(d.facility_address)}</div>
                <div style="font-size: 12px; font-weight: 700; color: #4f46e5; margin-top: 4px;">OFFICIAL WORKFORCE DISCIPLINARY SANCTION RECORD</div>
            </div>
            <div style="text-align: right;">
                <div style="font-family: monospace; font-weight: 700; font-size: 15px;">${escapeHtml(s.sanction_code)}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${s.sanction_effective_date}</div>
            </div>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Statutory Authority: 45 CFR § 164.308(a)(1)(ii)(C)</div>
            <div style="font-size: 12px; color: #7f1d1d; margin-top: 2px;">
                This disciplinary action was administered and logged per federal requirements mandating sanctions against workforce members violating HIPAA security and privacy safeguards.
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Workforce Member Sanctioned</div>
                <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${escapeHtml(s.full_name)}</div>
                <div style="font-size: 12px; color: #64748b;">${escapeHtml(s.employee_no || '')} &bull; ${escapeHtml(s.role_name || 'Staff')} &bull; ${escapeHtml(s.department_name || '')}</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Disciplinary Action &amp; Severity</div>
                <div style="font-size: 16px; font-weight: 800; color: #b91c1c;">${formatAction(s.disciplinary_action)}</div>
                <div style="font-size: 12px; color: #64748b;">Severity: <strong>${s.severity_level.toUpperCase()}</strong> &bull; Status: <strong>${s.status.toUpperCase()}</strong></div>
            </div>
        </div>

        <div style="margin-bottom: 14px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px;">Violation Details &amp; Timeline</div>
            <div style="font-size: 13px; color: #1e293b;">
                <strong>Category:</strong> ${formatCategory(s.violation_category)}<br>
                <strong>Violation Date:</strong> ${s.violation_date} | <strong>Reported Date:</strong> ${s.reported_date} | <strong>Effective:</strong> ${s.sanction_effective_date}
                ${s.suspension_days > 0 ? `<br><strong style="color:#b91c1c;">Suspension Duration:</strong> ${s.suspension_days} calendar days (without pay)` : ''}
            </div>
        </div>

        <div style="margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; margin-bottom: 4px;">Forensic Investigation Findings</div>
            <div style="font-size: 12px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(s.investigation_findings)}</div>
        </div>

        <div style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; margin-bottom: 4px;">Disciplinary Rationale &amp; Remediation</div>
            <div style="font-size: 12px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(s.disciplinary_rationale)}</div>
            <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
                <strong>Mandatory Remediation:</strong> ${formatRemediation(s.remediation_required)}
                ${s.remediation_deadline ? ` (Deadline: ${s.remediation_deadline})` : ''}
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 14px;">
            <div>
                <div style="font-size: 10px; color: #94a3b8;">HIPAA Audit Ledger Integrity Verified</div>
                <div style="font-size: 11px; font-family: monospace; color: #64748b;">45 CFR § 164.308(a)(1)(ii)(C) &bull; Signoff: ${s.signoff_date}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(s.sanctioning_officer_name)}</div>
                <div style="font-size: 11px; color: #64748b;">${escapeHtml(s.sanctioning_officer_role)}</div>
            </div>
        </div>
    </div>
    `;
}

function getStatusBadge(status, daysRemaining) {
    if (status === 'compliant') {
        return `<span class="badge-status badge-compliant"><i class="fa-solid fa-circle-check"></i> COMPLIANT</span>`;
    }
    if (status === 'approaching_due') {
        return `<span class="badge-status badge-approaching"><i class="fa-solid fa-clock"></i> DUE SOON (${daysRemaining}d)</span>`;
    }
    if (status === 'exempt') {
        return `<span class="badge-status badge-exempt">EXEMPT</span>`;
    }
    return `<span class="badge-status badge-overdue"><i class="fa-solid fa-circle-exclamation"></i> OVERDUE</span>`;
}

function getSeverityBadge(sev) {
    switch (sev) {
        case 'minor':
            return `<span class="badge-status badge-sev-minor">MINOR</span>`;
        case 'moderate':
            return `<span class="badge-status badge-sev-moderate">MODERATE</span>`;
        case 'serious':
            return `<span class="badge-status badge-sev-serious">SERIOUS</span>`;
        case 'critical_gross_misconduct':
            return `<span class="badge-status badge-sev-critical">CRITICAL</span>`;
        default:
            return `<span class="badge-status">${sev.toUpperCase()}</span>`;
    }
}

function formatCategory(cat) {
    const map = {
        'unauthorized_phi_snooping': 'Unauthorized PHI Snooping',
        'improper_phi_disclosure': 'Improper PHI Disclosure',
        'credential_sharing': 'Credential / Password Sharing',
        'unencrypted_device': 'Unencrypted Device / Insecure Storage',
        'failure_to_report_incident': 'Failure to Report Incident',
        'phishing_social_engineering': 'Phishing / Social Engineering',
        'willful_neglect_data_theft': 'Willful Neglect / Data Exfiltration',
        'other_policy_breach': 'Other Policy Breach'
    };
    return map[cat] || cat.replace(/_/g, ' ');
}

function formatAction(act) {
    const map = {
        'verbal_counseling': 'Verbal Counseling & Retraining',
        'written_reprimand': 'Written Warning / Reprimand',
        'suspension_without_pay': 'Suspension Without Pay',
        'immediate_termination': 'Immediate Termination',
        'credential_revocation_referral': 'Licensure / OCR Referral'
    };
    return map[act] || act.replace(/_/g, ' ');
}

function formatRemediation(rem) {
    const map = {
        'mandatory_retraining': 'Mandatory Retraining & Examination',
        'supervised_audit_period': '90-Day Supervised Audit Period',
        'access_downgrade': 'Permanent Privilege Downgrade',
        'none': 'None Required'
    };
    return map[rem] || rem.replace(/_/g, ' ');
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
