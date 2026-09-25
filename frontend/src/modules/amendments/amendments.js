import {
    fetchAmendmentPipeline,
    fetchAmendmentStats,
    fetchAmendment,
    storeStatutoryAmendment,
    grantAmendmentExtension,
    fetchAmendmentExtensionNotice,
    acceptStatutoryAmendment,
    denyStatutoryAmendment,
    fetchAmendmentDenialNotice,
    fileStatementOfDisagreement,
    fileStatementOfRebuttal,
    getAmendmentRegistryExportCsvUrl
} from "./amendments.service.js?v=2";
import { fetchPatients } from "../patients/patients.service.js?v=2";
import { AmendmentsView } from "./amendments.view.js?v=1";

let currentFilters = {
    search: "",
    status: "",
    filter: ""
};

let searchDebounceTimeout = null;
let activeExtensionNoticeData = null;
let activeDenialNoticeData = null;

export async function initAmendments(container) {
    if (!container) return;

    container.innerHTML = AmendmentsView.render();

    attachEventListeners(container);
    await loadPipelineData(container);
}

function attachEventListeners(container) {
    // Refresh button
    const btnRefresh = container.querySelector("#btnRefreshAmend");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", async () => {
            await loadPipelineData(container);
        });
    }

    // Export CSV
    const btnExport = container.querySelector("#btnExportAmendCsv");
    if (btnExport) {
        btnExport.addEventListener("click", () => {
            window.location.href = getAmendmentRegistryExportCsvUrl();
        });
    }

    // Search input
    const searchInput = container.querySelector("#amendSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(() => {
                currentFilters.search = e.target.value.trim();
                loadAmendmentsList(container);
            }, 300);
        });
    }

    // Status filter
    const statusSelect = container.querySelector("#amendStatusFilter");
    if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
            currentFilters.status = e.target.value;
            loadAmendmentsList(container);
        });
    }

    // Quick filter buttons (urgency/disagreements)
    const filterBtns = container.querySelectorAll(".amend-filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilters.filter = btn.dataset.filter || "";
            loadAmendmentsList(container);
        });
    });

    // Intake Modal open/close
    const btnOpenIntake = container.querySelector("#btnOpenAmendIntakeModal");
    const intakeOverlay = container.querySelector("#modalAmendIntakeOverlay");
    const btnCloseIntake = container.querySelector("#btnCloseAmendIntakeModal");
    const btnCancelIntake = container.querySelector("#btnCancelAmendIntake");

    if (btnOpenIntake && intakeOverlay) {
        btnOpenIntake.addEventListener("click", () => {
            resetIntakeForm(container);
            intakeOverlay.style.display = "flex";
        });
    }

    const closeIntake = () => { if (intakeOverlay) intakeOverlay.style.display = "none"; };
    if (btnCloseIntake) btnCloseIntake.addEventListener("click", closeIntake);
    if (btnCancelIntake) btnCancelIntake.addEventListener("click", closeIntake);

    // Patient search inside Intake modal
    setupIntakePatientSearch(container);

    // Intake Form Submit
    const formIntake = container.querySelector("#formAmendIntake");
    if (formIntake) {
        formIntake.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitIntakeForm(container);
        });
    }

    // Extension Modal close
    const extOverlay = container.querySelector("#modalAmendExtensionOverlay");
    const btnCloseExt = container.querySelector("#btnCloseAmendExtensionModal");
    const btnCancelExt = container.querySelector("#btnCancelAmendExtension");
    const closeExt = () => { if (extOverlay) extOverlay.style.display = "none"; };
    if (btnCloseExt) btnCloseExt.addEventListener("click", closeExt);
    if (btnCancelExt) btnCancelExt.addEventListener("click", closeExt);

    // Extension Form Submit
    const formExt = container.querySelector("#formAmendExtension");
    if (formExt) {
        formExt.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitExtensionForm(container);
        });
    }

    // Decision Modal close & cancel
    const decisionOverlay = container.querySelector("#modalAmendDecisionOverlay");
    const btnCloseDecision = container.querySelector("#btnCloseAmendDecisionModal");
    const closeDecision = () => { if (decisionOverlay) decisionOverlay.style.display = "none"; };
    if (btnCloseDecision) btnCloseDecision.addEventListener("click", closeDecision);
    container.querySelectorAll(".btnCancelDecision").forEach(btn => btn.addEventListener("click", closeDecision));

    // Decision Toggle Radio
    const radios = container.querySelectorAll("input[name='amendDecisionChoice']");
    radios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            const isAccept = e.target.value === "accept";
            container.querySelector("#decisionAcceptSection").style.display = isAccept ? "block" : "none";
            container.querySelector("#decisionDenySection").style.display = isAccept ? "none" : "block";
        });
    });

    // Accept Form Submit
    const formAccept = container.querySelector("#formAmendAccept");
    if (formAccept) {
        formAccept.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitAcceptForm(container);
        });
    }

    // Deny Form Submit
    const formDeny = container.querySelector("#formAmendDeny");
    if (formDeny) {
        formDeny.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitDenyForm(container);
        });
    }

    // Disagreement Modal close
    const disagreeOverlay = container.querySelector("#modalAmendDisagreementOverlay");
    const btnCloseDisagree = container.querySelector("#btnCloseAmendDisagreementModal");
    const btnCancelDisagree = container.querySelector("#btnCancelAmendDisagreement");
    const closeDisagree = () => { if (disagreeOverlay) disagreeOverlay.style.display = "none"; };
    if (btnCloseDisagree) btnCloseDisagree.addEventListener("click", closeDisagree);
    if (btnCancelDisagree) btnCancelDisagree.addEventListener("click", closeDisagree);

    // Disagreement Form Submit
    const formDisagree = container.querySelector("#formAmendDisagreement");
    if (formDisagree) {
        formDisagree.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitDisagreementForm(container);
        });
    }

    // Rebuttal Modal close
    const rebuttalOverlay = container.querySelector("#modalAmendRebuttalOverlay");
    const btnCloseRebuttal = container.querySelector("#btnCloseAmendRebuttalModal");
    const btnCancelRebuttal = container.querySelector("#btnCancelAmendRebuttal");
    const closeRebuttal = () => { if (rebuttalOverlay) rebuttalOverlay.style.display = "none"; };
    if (btnCloseRebuttal) btnCloseRebuttal.addEventListener("click", closeRebuttal);
    if (btnCancelRebuttal) btnCancelRebuttal.addEventListener("click", closeRebuttal);

    // Rebuttal Form Submit
    const formRebuttal = container.querySelector("#formAmendRebuttal");
    if (formRebuttal) {
        formRebuttal.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitRebuttalForm(container);
        });
    }

    // Extension Notice Modal close & print
    const extNoticeOverlay = container.querySelector("#modalAmendExtensionNoticeOverlay");
    const btnCloseExtNotice = container.querySelector("#btnCloseAmendExtensionNoticeModal");
    if (btnCloseExtNotice && extNoticeOverlay) {
        btnCloseExtNotice.addEventListener("click", () => {
            extNoticeOverlay.style.display = "none";
        });
    }
    const btnPrintExtLetter = container.querySelector("#btnPrintAmendExtensionLetter");
    if (btnPrintExtLetter) {
        btnPrintExtLetter.addEventListener("click", () => printExtensionNoticeLetter());
    }

    // Denial Notice Modal close & print
    const denialNoticeOverlay = container.querySelector("#modalAmendDenialNoticeOverlay");
    const btnCloseDenialNotice = container.querySelector("#btnCloseAmendDenialNoticeModal");
    if (btnCloseDenialNotice && denialNoticeOverlay) {
        btnCloseDenialNotice.addEventListener("click", () => {
            denialNoticeOverlay.style.display = "none";
        });
    }
    const btnPrintDenialLetter = container.querySelector("#btnPrintAmendDenialLetter");
    if (btnPrintDenialLetter) {
        btnPrintDenialLetter.addEventListener("click", () => printDenialNoticeLetter());
    }
}

async function loadPipelineData(container) {
    await Promise.all([
        loadStats(container),
        loadAmendmentsList(container)
    ]);
}

async function loadStats(container) {
    try {
        const res = await fetchAmendmentStats();
        if (!res || !res.success) return;

        const data = res.data || {};
        const setVal = (id, val) => {
            const el = container.querySelector(id);
            if (el) el.textContent = val;
        };

        setVal("#statAmendTotal", data.total_requests ?? 0);
        setVal("#statAmendPending", data.active_pending ?? 0);
        setVal("#statAmendImpending", data.impending_count ?? 0);
        setVal("#statAmendOverdue", data.overdue_count ?? 0);
        setVal("#statAmendExtensions", data.extensions_active ?? 0);
        setVal("#statAmendAccepted", data.accepted_count ?? 0);
        setVal("#statAmendDenied", data.denied_count ?? 0);
        setVal("#statAmendDisagreements", data.disagreements_count ?? 0);

        const banner = container.querySelector("#amendOverdueBanner");
        if (banner) {
            banner.style.display = (data.overdue_count > 0) ? "block" : "none";
        }
    } catch (err) {
        console.error("Failed to load Amendment stats:", err);
    }
}

async function loadAmendmentsList(container) {
    const tbody = container.querySelector("#amendTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="padding: 30px; text-align: center; color: #94a3b8;">
                Loading PHI amendment requests...
            </td>
        </tr>
    `;

    try {
        const res = await fetchAmendmentPipeline(currentFilters);
        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #ef4444;">Failed to load records.</td></tr>`;
            return;
        }

        const items = res.data || [];
        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 36px; text-align: center; color: #94a3b8;">
                        <div style="font-size: 14px; font-weight: 500;">No PHI amendment requests match the selected filters.</div>
                        <div style="font-size: 12px; margin-top: 4px;">Click "Log PHI Amendment Request" to intake a new patient request.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(r => renderRowHtml(r)).join("");
        attachRowActionListeners(container);
    } catch (err) {
        console.error("Failed to load amendment list:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #ef4444;">An unexpected error occurred.</td></tr>`;
    }
}

function renderRowHtml(r) {
    // 60-Day Countdown Badge
    let timerBadge = "";
    if (r.status === "accepted") {
        timerBadge = `<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 600;">✓ Accepted</span>`;
    } else if (r.status === "denied") {
        timerBadge = `<span style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 600;">✕ Denied</span>`;
    } else if (r.is_overdue) {
        timerBadge = `
            <span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; animation: pulse 2s infinite;">
                🚨 OVERDUE (${Math.abs(r.days_remaining)}d)
            </span>
        `;
    } else if (r.is_impending) {
        timerBadge = `
            <span style="background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                ⚠️ ${r.days_remaining}d left
            </span>
        `;
    } else {
        timerBadge = `
            <span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 600;">
                ⏳ ${r.days_remaining}d left
            </span>
        `;
    }

    if (r.is_extended) {
        timerBadge += ` <span style="background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: 700; margin-left: 2px;">+30d Ext</span>`;
    }

    // Status Badge
    const statusMap = {
        pending: { label: "Pending", bg: "#fef3c7", fg: "#b45309" },
        pending_review: { label: "Pending Review", bg: "#fef3c7", fg: "#b45309" },
        in_review: { label: "In Review", bg: "#e0f2fe", fg: "#0369a1" },
        extension_granted: { label: "Ext Granted", bg: "#f3e8ff", fg: "#6b21a8" },
        accepted: { label: "Accepted", bg: "#dcfce7", fg: "#15803d" },
        denied: { label: "Denied", bg: "#f1f5f9", fg: "#475569" },
        disagreement_filed: { label: "Disagreement Filed", bg: "#fee2e2", fg: "#b91c1c" },
        rebuttal_filed: { label: "Rebuttal Filed", bg: "#fef3c7", fg: "#b45309" }
    };
    const s = statusMap[r.status] || { label: r.status, bg: "#f1f5f9", fg: "#475569" };
    const statusBadge = `<span style="background: ${s.bg}; color: ${s.fg}; font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">${s.label}</span>`;

    // Statutory ground or disagreement summary
    let groundOrDisagreementHtml = "";
    if (r.status === "accepted") {
        groundOrDisagreementHtml = `<span style="color: #059669; font-weight: 600; font-size: 12px;">Permanently Linked to EHR</span>`;
    } else if (r.status === "denied") {
        const groundsLabels = {
            not_created_by_entity: "Not Created by Entity",
            not_part_of_drs: "Not Part of DRS",
            exempt_from_access: "Exempt Under § 164.524",
            accurate_and_complete: "Accurate & Complete"
        };
        const groundText = groundsLabels[r.denial_statutory_ground] || r.denial_statutory_ground || "Statutory Ground";
        groundOrDisagreementHtml = `
            <div style="font-size: 11.5px; font-weight: 600; color: #dc2626;">${escapeHtml(groundText)}</div>
        `;
        if (r.statement_of_disagreement) {
            groundOrDisagreementHtml += `
                <div style="margin-top: 2px;">
                    <span style="background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">Disagreement Linked</span>
                </div>
            `;
        }
        if (r.statement_of_rebuttal) {
            groundOrDisagreementHtml += `
                <div style="margin-top: 2px;">
                    <span style="background: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">Rebuttal Linked</span>
                </div>
            `;
        }
    } else {
        groundOrDisagreementHtml = `<span style="color: #94a3b8; font-size: 12px;">Under Review</span>`;
    }

    const canAdjudicate = !['accepted', 'denied'].includes(r.status);
    const canExtend = !r.is_extended && !['accepted', 'denied'].includes(r.status);
    const hasDisagreement = !!r.statement_of_disagreement;
    const hasRebuttal = !!r.statement_of_rebuttal;

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">
                ${r.amendment_number || ('AMD-' + r.id)}
            </td>
            <td style="padding: 12px 16px;">
                <div style="font-weight: 600; color: #1e293b;">${escapeHtml(r.patient_name || ('Patient #' + r.patient_id))}</div>
                <div style="font-size: 11px; color: #64748b;">${escapeHtml(r.patient_no || '')} &bull; ${r.request_date}</div>
            </td>
            <td style="padding: 12px 16px; max-width: 240px;">
                <div style="font-weight: 600; font-size: 12px; color: #334155;">
                    ${escapeHtml(r.target_record_label || formatTargetRecordType(r.target_record_type))}
                </div>
                <div style="font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                    <em>"${escapeHtml(r.disputed_text || '')}"</em>
                </div>
            </td>
            <td style="padding: 12px 16px;">
                <div>${timerBadge}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Due: ${r.effective_deadline || r.initial_deadline || 'N/A'}</div>
            </td>
            <td style="padding: 12px 16px;">
                ${statusBadge}
            </td>
            <td style="padding: 12px 16px;">
                ${groundOrDisagreementHtml}
            </td>
            <td style="padding: 12px 16px; text-align: right;">
                <div style="display: inline-flex; gap: 6px; align-items: center;">
                    ${canAdjudicate ? `
                        <button type="button" class="btn-amend-adjudicate" data-id="${r.id}" style="background: #0284c7; color: #fff; border: none; padding: 5px 9px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                            Adjudicate
                        </button>
                    ` : ''}

                    ${canExtend ? `
                        <button type="button" class="btn-amend-extend" data-id="${r.id}" title="Grant 30-Day Extension (§ 164.526(b))" style="background: #f3e8ff; color: #7c3aed; border: 1px solid #d8b4fe; padding: 5px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                            +30d Ext
                        </button>
                    ` : ''}

                    ${r.is_extended ? `
                        <button type="button" class="btn-amend-view-ext-notice" data-id="${r.id}" title="View Written Extension Notice" style="background: #faf5ff; color: #9333ea; border: 1px solid #e9d5ff; padding: 5px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            📜 Notice
                        </button>
                    ` : ''}

                    ${r.status === 'denied' ? `
                        <button type="button" class="btn-amend-view-denial-notice" data-id="${r.id}" title="View Written Denial Letter" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 5px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            ✉️ Denial Letter
                        </button>
                        ${!hasDisagreement ? `
                            <button type="button" class="btn-amend-disagreement" data-id="${r.id}" title="File Patient Statement of Disagreement" style="background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; padding: 5px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                                Disagreement
                            </button>
                        ` : (!hasRebuttal ? `
                            <button type="button" class="btn-amend-rebuttal" data-id="${r.id}" title="File Covered Entity Statement of Rebuttal" style="background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 5px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                                Rebuttal
                            </button>
                        ` : '')}
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function attachRowActionListeners(container) {
    // Adjudicate button
    container.querySelectorAll(".btn-amend-adjudicate").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            await openDecisionModal(container, id);
        });
    });

    // Extend button
    container.querySelectorAll(".btn-amend-extend").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            openExtensionModal(container, id);
        });
    });

    // View Extension Notice
    container.querySelectorAll(".btn-amend-view-ext-notice").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            await viewExtensionNotice(container, id);
        });
    });

    // View Denial Notice
    container.querySelectorAll(".btn-amend-view-denial-notice").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            await viewDenialNotice(container, id);
        });
    });

    // Disagreement button
    container.querySelectorAll(".btn-amend-disagreement").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            openDisagreementModal(container, id);
        });
    });

    // Rebuttal button
    container.querySelectorAll(".btn-amend-rebuttal").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            openRebuttalModal(container, id);
        });
    });
}

function setupIntakePatientSearch(container) {
    const input = container.querySelector("#intakeAmendPatientSearch");
    const hiddenId = container.querySelector("#intakeAmendPatientId");
    const label = container.querySelector("#intakeAmendPatientSelectedLabel");

    if (!input || !hiddenId) return;

    let debounce = null;
    input.addEventListener("input", (e) => {
        clearTimeout(debounce);
        const term = e.target.value.trim();
        if (term.length < 2) return;

        debounce = setTimeout(async () => {
            try {
                const res = await fetchPatients({ search: term, limit: 5 });
                const patients = res?.data?.patients || res?.data || [];
                if (patients.length > 0) {
                    const p = patients[0];
                    hiddenId.value = p.id;
                    if (label) {
                        label.textContent = `Selected: ${p.first_name} ${p.last_name} (${p.patient_no || 'ID: ' + p.id})`;
                        label.style.display = "block";
                    }
                }
            } catch (err) {
                console.error("Patient search error:", err);
            }
        }, 300);
    });
}

function resetIntakeForm(container) {
    const form = container.querySelector("#formAmendIntake");
    if (form) form.reset();

    const dateInput = container.querySelector("#intakeAmendDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    const label = container.querySelector("#intakeAmendPatientSelectedLabel");
    if (label) label.style.display = "none";

    const hiddenId = container.querySelector("#intakeAmendPatientId");
    if (hiddenId) hiddenId.value = "";
}

async function submitIntakeForm(container) {
    const patientId = parseInt(container.querySelector("#intakeAmendPatientId").value, 10);
    if (!patientId) {
        alert("Please search and select a valid patient.");
        return;
    }

    const payload = {
        patient_id: patientId,
        request_date: container.querySelector("#intakeAmendDate").value,
        requester_type: container.querySelector("#intakeAmendRequesterType").value,
        requester_contact: container.querySelector("#intakeAmendRequesterContact").value.trim(),
        target_record_type: container.querySelector("#intakeAmendTargetRecordType").value,
        target_record_label: container.querySelector("#intakeAmendTargetLabel").value.trim(),
        disputed_text: container.querySelector("#intakeAmendDisputedText").value.trim(),
        requested_amendment: container.querySelector("#intakeAmendRequestedAmendment").value.trim()
    };

    try {
        const res = await storeStatutoryAmendment(payload);
        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalAmendIntakeOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to log amendment request.");
        }
    } catch (err) {
        alert("Error submitting amendment request: " + err.message);
    }
}

function openExtensionModal(container, id) {
    const overlay = container.querySelector("#modalAmendExtensionOverlay");
    const hiddenId = container.querySelector("#extAmendId");
    const form = container.querySelector("#formAmendExtension");

    if (form) form.reset();
    if (hiddenId) hiddenId.value = id;
    if (overlay) overlay.style.display = "flex";
}

async function submitExtensionForm(container) {
    const id = parseInt(container.querySelector("#extAmendId").value, 10);
    const reason = container.querySelector("#extAmendReason").value;
    const rationale = container.querySelector("#extAmendRationale").value.trim();

    if (!rationale) {
        alert("Please provide an evidentiary rationale for the statutory extension.");
        return;
    }

    try {
        const res = await grantAmendmentExtension(id, {
            extension_reason: reason,
            extension_rationale: rationale
        });

        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalAmendExtensionOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to grant extension.");
        }
    } catch (err) {
        alert("Error granting extension: " + err.message);
    }
}

async function openDecisionModal(container, id) {
    const overlay = container.querySelector("#modalAmendDecisionOverlay");
    const summary = container.querySelector("#decisionTargetSummary");
    const acceptId = container.querySelector("#acceptAmendId");
    const denyId = container.querySelector("#denyAmendId");

    acceptId.value = id;
    denyId.value = id;

    // Reset forms
    container.querySelector("#formAmendAccept").reset();
    container.querySelector("#formAmendDeny").reset();

    // Default to accept
    const radios = container.querySelectorAll("input[name='amendDecisionChoice']");
    radios.forEach(r => { if (r.value === "accept") r.checked = true; });
    container.querySelector("#decisionAcceptSection").style.display = "block";
    container.querySelector("#decisionDenySection").style.display = "none";

    summary.innerHTML = "Loading request details...";
    overlay.style.display = "flex";

    try {
        const res = await fetchAmendment(id);
        if (res && res.success && res.data) {
            const r = res.data;
            summary.innerHTML = `
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                    ${escapeHtml(r.amendment_number || ('AMD-' + r.id))} &bull; ${escapeHtml(r.patient_name || '')}
                </div>
                <div style="margin-bottom: 4px;"><strong>Target:</strong> ${escapeHtml(r.target_record_label || formatTargetRecordType(r.target_record_type))}</div>
                <div style="margin-bottom: 4px;"><strong>Disputed:</strong> <em>"${escapeHtml(r.disputed_text || '')}"</em></div>
                <div><strong>Requested Amendment:</strong> ${escapeHtml(r.requested_amendment || '')}</div>
            `;
        }
    } catch (err) {
        summary.innerHTML = "Unable to fetch detailed summary.";
    }
}

async function submitAcceptForm(container) {
    const id = parseInt(container.querySelector("#acceptAmendId").value, 10);
    const notes = container.querySelector("#acceptNotes").value.trim();

    try {
        const res = await acceptStatutoryAmendment(id, { acceptance_notes: notes });
        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalAmendDecisionOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to accept amendment.");
        }
    } catch (err) {
        alert("Error accepting amendment: " + err.message);
    }
}

async function submitDenyForm(container) {
    const id = parseInt(container.querySelector("#denyAmendId").value, 10);
    const ground = container.querySelector("#denyStatutoryGround").value;
    const rationale = container.querySelector("#denyRationale").value.trim();

    if (!rationale) {
        alert("Please provide a plain-language explanation of the denial rationale for the patient.");
        return;
    }

    try {
        const res = await denyStatutoryAmendment(id, {
            denial_statutory_ground: ground,
            denial_rationale: rationale
        });
        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalAmendDecisionOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to deny amendment.");
        }
    } catch (err) {
        alert("Error denying amendment: " + err.message);
    }
}

function openDisagreementModal(container, id) {
    const overlay = container.querySelector("#modalAmendDisagreementOverlay");
    const hiddenId = container.querySelector("#disagreeAmendId");
    const form = container.querySelector("#formAmendDisagreement");

    if (form) form.reset();
    if (hiddenId) hiddenId.value = id;
    container.querySelector("#disagreeDisseminate").checked = true;
    if (overlay) overlay.style.display = "flex";
}

async function submitDisagreementForm(container) {
    const id = parseInt(container.querySelector("#disagreeAmendId").value, 10);
    const statement = container.querySelector("#disagreeText").value.trim();
    const disseminate = container.querySelector("#disagreeDisseminate").checked ? 1 : 0;

    if (!statement) {
        alert("Please enter the patient's statement of disagreement.");
        return;
    }

    try {
        const res = await fileStatementOfDisagreement(id, {
            statement_of_disagreement: statement,
            future_disclosure_dissemination_requested: disseminate
        });
        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalAmendDisagreementOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to file statement of disagreement.");
        }
    } catch (err) {
        alert("Error filing disagreement: " + err.message);
    }
}

function openRebuttalModal(container, id) {
    const overlay = container.querySelector("#modalAmendRebuttalOverlay");
    const hiddenId = container.querySelector("#rebuttalAmendId");
    const form = container.querySelector("#formAmendRebuttal");

    if (form) form.reset();
    if (hiddenId) hiddenId.value = id;
    if (overlay) overlay.style.display = "flex";
}

async function submitRebuttalForm(container) {
    const id = parseInt(container.querySelector("#rebuttalAmendId").value, 10);
    const rebuttal = container.querySelector("#rebuttalText").value.trim();

    if (!rebuttal) {
        alert("Please enter the covered entity's statement of rebuttal.");
        return;
    }

    try {
        const res = await fileStatementOfRebuttal(id, {
            statement_of_rebuttal: rebuttal
        });
        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalAmendRebuttalOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to file rebuttal.");
        }
    } catch (err) {
        alert("Error filing rebuttal: " + err.message);
    }
}

async function viewExtensionNotice(container, id) {
    const overlay = container.querySelector("#modalAmendExtensionNoticeOverlay");
    const letter = container.querySelector("#amendExtensionLetterContainer");

    letter.innerHTML = "Loading extension notice...";
    overlay.style.display = "flex";

    try {
        const res = await fetchAmendmentExtensionNotice(id);
        if (!res || !res.success || !res.data) {
            letter.innerHTML = "Failed to load extension notice.";
            return;
        }

        const d = res.data;
        activeExtensionNoticeData = d;

        letter.innerHTML = `
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${escapeHtml(d.facility_name)}</div>
                <div style="font-size: 12px; color: #64748b;">Notice of Statutory Extension &bull; HIPAA 45 CFR § 164.526(b)(2)(ii)</div>
            </div>

            <div style="margin-bottom: 18px; font-size: 13px;">
                <div><strong>Date of Notice:</strong> ${d.notice_date}</div>
                <div><strong>To:</strong> ${escapeHtml(d.patient_name)} (ID: ${escapeHtml(d.patient_no || 'N/A')})</div>
                <div><strong>Regarding Amendment Request #:</strong> ${escapeHtml(d.amendment_number)}</div>
                <div><strong>Initial Request Date:</strong> ${d.initial_request_date}</div>
            </div>

            <p style="font-size: 13px;">Dear ${escapeHtml(d.patient_name)},</p>

            <p style="font-size: 13px;">
                In accordance with the Health Insurance Portability and Accountability Act (HIPAA) Privacy Rule, 45 CFR § 164.526(b)(2)(ii), this correspondence serves as official written notification that our organization requires an extension of up to <strong>30 calendar days</strong> to complete the review of and act upon your request to amend your Protected Health Information (PHI).
            </p>

            <div style="background: #f8fafc; border-left: 4px solid #7c3aed; padding: 12px; margin: 16px 0; font-size: 12.5px;">
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Reason for Extension:</div>
                <div style="color: #475569; margin-bottom: 6px;">${escapeHtml(d.extension_reason)}</div>
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Specific Rationale:</div>
                <div style="color: #475569;">${escapeHtml(d.extension_rationale)}</div>
            </div>

            <p style="font-size: 13px;">
                Our organization will complete our review and provide you with formal written notification of acceptance or denial no later than <strong>${d.extended_deadline}</strong>.
            </p>

            <p style="font-size: 13px;">
                If you have questions regarding this extension, please contact the HIPAA Privacy Officer at <strong>${escapeHtml(d.privacy_officer_contact)}</strong>.
            </p>

            <div style="margin-top: 30px; font-size: 12.5px;">
                <div>Sincerely,</div>
                <div style="font-weight: 700; margin-top: 15px;">Office of the HIPAA Privacy Officer</div>
                <div>${escapeHtml(d.facility_name)}</div>
            </div>
        `;
    } catch (err) {
        letter.innerHTML = "Error generating extension letter.";
    }
}

async function viewDenialNotice(container, id) {
    const overlay = container.querySelector("#modalAmendDenialNoticeOverlay");
    const letter = container.querySelector("#amendDenialLetterContainer");

    letter.innerHTML = "Loading statutory denial notice...";
    overlay.style.display = "flex";

    try {
        const res = await fetchAmendmentDenialNotice(id);
        if (!res || !res.success || !res.data) {
            letter.innerHTML = "Failed to load denial notice.";
            return;
        }

        const d = res.data;
        activeDenialNoticeData = d;

        letter.innerHTML = `
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${escapeHtml(d.facility_name)}</div>
                <div style="font-size: 12px; color: #64748b;">Statutory Written Denial of Amendment &bull; 45 CFR § 164.526(d)(1)</div>
            </div>

            <div style="margin-bottom: 18px; font-size: 13px;">
                <div><strong>Date of Notice:</strong> ${d.notice_date}</div>
                <div><strong>To:</strong> ${escapeHtml(d.patient_name)} (ID: ${escapeHtml(d.patient_no || 'N/A')})</div>
                <div><strong>Regarding Amendment Request #:</strong> ${escapeHtml(d.amendment_number)}</div>
                <div><strong>Initial Request Date:</strong> ${d.initial_request_date}</div>
            </div>

            <p style="font-size: 13px;">Dear ${escapeHtml(d.patient_name)},</p>

            <p style="font-size: 13px;">
                We have completed our review of your request to amend your Protected Health Information (PHI) regarding the following record: <strong>${escapeHtml(d.target_record_label || 'Clinical Record')}</strong>. After careful clinical and compliance review, we regret to inform you that your request for amendment has been <strong>denied</strong> pursuant to 45 CFR § 164.526(a)(2).
            </p>

            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; font-size: 12.5px;">
                <div style="font-weight: 700; color: #991b1b; margin-bottom: 4px;">Cited Statutory Ground for Denial:</div>
                <div style="color: #7f1d1d; font-weight: 600; margin-bottom: 6px;">${escapeHtml(d.statutory_ground_label)} (${escapeHtml(d.statutory_ground_citation)})</div>
                <div style="font-weight: 700; color: #991b1b; margin-bottom: 4px;">Plain-Language Denial Rationale:</div>
                <div style="color: #7f1d1d;">${escapeHtml(d.denial_rationale)}</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin: 18px 0; font-size: 12px; line-height: 1.6;">
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">YOUR STATUTORY RIGHTS UNDER 45 CFR § 164.526:</div>
                <ul style="margin: 0; padding-left: 18px; color: #334155;">
                    <li style="margin-bottom: 6px;">
                        <strong>Right to Submit a Statement of Disagreement (§ 164.526(d)(2)):</strong> You have the right to submit a written Statement of Disagreement stating the basis for your disagreement. If submitted, our organization will permanently link your statement to the disputed record.
                    </li>
                    <li style="margin-bottom: 6px;">
                        <strong>Right to Dissemination on Future Disclosures (§ 164.526(d)(4)):</strong> If you choose not to submit a statement of disagreement, you may still request that your original amendment request and our written denial notice accompany any future disclosure of the disputed record.
                    </li>
                    <li>
                        <strong>Right to File a Formal Complaint (§ 164.530(d)):</strong> You may file a complaint with our Privacy Officer at <strong>${escapeHtml(d.privacy_officer_contact)}</strong> or with the Secretary of the U.S. Department of Health and Human Services (HHS Office for Civil Rights). There will be no retaliation for filing a complaint.
                    </li>
                </ul>
            </div>

            <div style="margin-top: 30px; font-size: 12.5px;">
                <div>Sincerely,</div>
                <div style="font-weight: 700; margin-top: 15px;">Office of the HIPAA Privacy Officer</div>
                <div>${escapeHtml(d.facility_name)}</div>
            </div>
        `;
    } catch (err) {
        letter.innerHTML = "Error generating statutory denial letter.";
    }
}

function printExtensionNoticeLetter() {
    const letter = document.getElementById("amendExtensionLetterContainer");
    if (!letter) return;

    // Critical Pattern from dashboard_reports skill: Synchronous popup to avoid browser blockers
    const printWin = window.open("", "_blank", "width=850,height=750,scrollbars=yes");
    if (!printWin) {
        alert("Please enable pop-ups to print the extension letter.");
        return;
    }

    printWin.document.open();
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Statutory Extension Notice - 45 CFR § 164.526(b)(2)(ii)</title>
            <style>
                body { font-family: Georgia, serif; line-height: 1.6; padding: 40px; color: #1e293b; }
            </style>
        </head>
        <body>
            ${letter.innerHTML}
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `);
    printWin.document.close();
}

function printDenialNoticeLetter() {
    const letter = document.getElementById("amendDenialLetterContainer");
    if (!letter) return;

    // Critical Pattern from dashboard_reports skill: Synchronous popup to avoid browser blockers
    const printWin = window.open("", "_blank", "width=850,height=750,scrollbars=yes");
    if (!printWin) {
        alert("Please enable pop-ups to print the statutory denial letter.");
        return;
    }

    printWin.document.open();
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Statutory Denial Notice - 45 CFR § 164.526(d)(1)</title>
            <style>
                body { font-family: Georgia, serif; line-height: 1.6; padding: 40px; color: #1e293b; }
            </style>
        </head>
        <body>
            ${letter.innerHTML}
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `);
    printWin.document.close();
}

function formatTargetRecordType(t) {
    const map = {
        clinical_note: "Clinical Progress Note",
        problem_diagnosis: "Problem / Diagnosis",
        medication_entry: "Medication / Rx",
        allergy_entry: "Allergy Record",
        lab_result: "Lab / Diagnostic Result",
        billing_entry: "Billing Entry",
        general_drs: "Designated Record Set Item"
    };
    return map[t] || t || "EHR Record";
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
