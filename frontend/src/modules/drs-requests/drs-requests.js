import {
    fetchDrsRequests,
    fetchDrsStats,
    createDrsRequest,
    grantDrsExtension,
    fetchDrsExtensionNotice,
    fulfillDrsRequest,
    denyDrsRequest,
    fetchDrsBundle,
    getDrsRegistryExportCsvUrl
} from "./drs-requests.service.js?v=1";
import { fetchPatients } from "../patients/patients.service.js?v=2";

let currentFilters = {
    search: "",
    status: "",
    format_requested: "",
    urgency: ""
};

let activeBundleData = null;
let searchDebounceTimeout = null;

export async function initDrsRequests(container) {
    if (!container) return;

    setupEventListeners(container);
    await loadPipelineData(container);
}

function setupEventListeners(container) {
    // Refresh button
    const btnRefresh = container.querySelector("#btnRefreshDrs");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => loadPipelineData(container));
    }

    // Export CSV button
    const btnExport = container.querySelector("#btnExportDrsCsv");
    if (btnExport) {
        btnExport.addEventListener("click", () => {
            window.location.href = getDrsRegistryExportCsvUrl();
        });
    }

    // Search filter
    const searchInput = container.querySelector("#drsSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(() => {
                currentFilters.search = e.target.value.trim();
                loadRequestsList(container);
            }, 300);
        });
    }

    // Status filter
    const statusSelect = container.querySelector("#drsStatusFilter");
    if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
            currentFilters.status = e.target.value;
            loadRequestsList(container);
        });
    }

    // Format filter
    const formatSelect = container.querySelector("#drsFormatFilter");
    if (formatSelect) {
        formatSelect.addEventListener("change", (e) => {
            currentFilters.format_requested = e.target.value;
            loadRequestsList(container);
        });
    }

    // Urgency buttons
    const urgencyBtns = container.querySelectorAll(".drs-urgency-btn");
    urgencyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            urgencyBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilters.urgency = btn.dataset.urgency || "";
            loadRequestsList(container);
        });
    });

    // Intake Modal open/close
    const btnOpenIntake = container.querySelector("#btnOpenDrsIntakeModal");
    const intakeOverlay = container.querySelector("#modalDrsIntakeOverlay");
    const btnCloseIntake = container.querySelector("#btnCloseDrsIntakeModal");
    const btnCancelIntake = container.querySelector("#btnCancelDrsIntake");

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
    const formIntake = container.querySelector("#formDrsIntake");
    if (formIntake) {
        formIntake.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitIntakeForm(container);
        });
    }

    // Extension Modal close
    const extOverlay = container.querySelector("#modalDrsExtensionOverlay");
    const btnCloseExt = container.querySelector("#btnCloseDrsExtensionModal");
    const btnCancelExt = container.querySelector("#btnCancelDrsExtension");
    const closeExt = () => { if (extOverlay) extOverlay.style.display = "none"; };
    if (btnCloseExt) btnCloseExt.addEventListener("click", closeExt);
    if (btnCancelExt) btnCancelExt.addEventListener("click", closeExt);

    // Extension Form Submit
    const formExt = container.querySelector("#formDrsExtension");
    if (formExt) {
        formExt.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitExtensionForm(container);
        });
    }

    // Bundle Modal close
    const bundleOverlay = container.querySelector("#modalDrsBundleOverlay");
    const btnCloseBundle = container.querySelector("#btnCloseDrsBundleModal");
    if (btnCloseBundle && bundleOverlay) {
        btnCloseBundle.addEventListener("click", () => {
            bundleOverlay.style.display = "none";
        });
    }

    // Bundle Actions: JSON download & Print PDF
    const btnDownloadJson = container.querySelector("#btnDownloadDrsJson");
    if (btnDownloadJson) {
        btnDownloadJson.addEventListener("click", () => downloadBundleJson());
    }

    const btnPrintPdf = container.querySelector("#btnPrintDrsPdfBundle");
    if (btnPrintPdf) {
        btnPrintPdf.addEventListener("click", () => printBundlePdf());
    }

    // Notice Modal close
    const noticeOverlay = container.querySelector("#modalDrsNoticeOverlay");
    const btnCloseNotice = container.querySelector("#btnCloseDrsNoticeModal");
    if (btnCloseNotice && noticeOverlay) {
        btnCloseNotice.addEventListener("click", () => {
            noticeOverlay.style.display = "none";
        });
    }

    const btnPrintNotice = container.querySelector("#btnPrintNoticeLetter");
    if (btnPrintNotice) {
        btnPrintNotice.addEventListener("click", () => printNoticeLetter());
    }
}

async function loadPipelineData(container) {
    await Promise.all([
        loadStats(container),
        loadRequestsList(container)
    ]);
}

async function loadStats(container) {
    try {
        const res = await fetchDrsStats();
        if (!res || !res.success) return;

        const data = res.data || {};
        const setVal = (id, val) => {
            const el = container.querySelector(id);
            if (el) el.textContent = val;
        };

        setVal("#statDrsTotal", data.total_requests ?? 0);
        setVal("#statDrsPending", data.active_pending ?? 0);
        setVal("#statDrsImpending", data.impending_count ?? 0);
        setVal("#statDrsOverdue", data.overdue_count ?? 0);
        setVal("#statDrsExtensions", data.extensions_active ?? 0);
        setVal("#statDrsCompliance", (data.compliance_rate ?? 100) + "%");

        const banner = container.querySelector("#drsOverdueBanner");
        if (banner) {
            banner.style.display = (data.overdue_count > 0) ? "block" : "none";
        }
    } catch (err) {
        console.error("Failed to load DRS stats:", err);
    }
}

async function loadRequestsList(container) {
    const tbody = container.querySelector("#drsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="padding: 30px; text-align: center; color: #94a3b8;">
                Loading Right of Access requests...
            </td>
        </tr>
    `;

    try {
        const res = await fetchDrsRequests(currentFilters);
        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #ef4444;">Failed to load records.</td></tr>`;
            return;
        }

        const items = res.data || [];
        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 36px; text-align: center; color: #94a3b8;">
                        <div style="font-size: 14px; font-weight: 500;">No Right of Access requests match the selected filters.</div>
                        <div style="font-size: 12px; margin-top: 4px;">Click "Log Right of Access Request" to intake a new patient request.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(r => renderRowHtml(r)).join("");
        attachRowActionListeners(container);
    } catch (err) {
        console.error("Failed to load DRS list:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #ef4444;">An unexpected error occurred.</td></tr>`;
    }
}

function renderRowHtml(r) {
    // 30-Day Countdown Badge
    let timerBadge = "";
    if (r.status === "fulfilled") {
        timerBadge = `<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 600;">✓ Fulfilled</span>`;
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

    // Fee Compliance Badge
    const feeVal = parseFloat(r.fee_assessed || 0);
    const feeBadge = (feeVal === 0)
        ? `<span style="color: #059669; font-weight: 600;">$0.00 (Portal Free)</span>`
        : `<span style="color: #475569; font-weight: 600;">$${feeVal.toFixed(2)} (${formatFeeCategory(r.fee_category)})</span>`;

    // Status Badge
    const statusMap = {
        pending: { label: "Pending", bg: "#fef3c7", fg: "#b45309" },
        in_review: { label: "In Review", bg: "#e0f2fe", fg: "#0369a1" },
        extension_granted: { label: "Ext Granted", bg: "#f3e8ff", fg: "#6b21a8" },
        fulfilled: { label: "Fulfilled", bg: "#dcfce7", fg: "#15803d" },
        denied: { label: "Denied", bg: "#f1f5f9", fg: "#475569" },
        cancelled: { label: "Cancelled", bg: "#f1f5f9", fg: "#94a3b8" }
    };
    const s = statusMap[r.status] || { label: r.status, bg: "#f1f5f9", fg: "#475569" };
    const statusBadge = `<span style="background: ${s.bg}; color: ${s.fg}; font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">${s.label}</span>`;

    const canExtend = !r.is_extended && !['fulfilled', 'denied', 'cancelled'].includes(r.status);
    const canFulfill = !['fulfilled', 'denied', 'cancelled'].includes(r.status);

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">
                ${r.request_number}
            </td>
            <td style="padding: 12px 16px;">
                <div style="font-weight: 600; color: #1e293b;">${escapeHtml(r.patient_name)}</div>
                <div style="font-size: 11.5px; color: #64748b;">No: ${escapeHtml(r.patient_no)} &bull; DOB: ${r.birthdate || 'N/A'}</div>
            </td>
            <td style="padding: 12px 16px;">
                <div style="color: #334155;">${r.request_date}</div>
                <div style="font-size: 11px; color: #64748b; text-transform: capitalize;">${(r.request_channel || '').replace('_', ' ')}</div>
            </td>
            <td style="padding: 12px 16px;">
                <div style="font-weight: 500; color: #334155;">${formatRequestedLabel(r.format_requested)}</div>
                <div style="font-size: 11px; color: #64748b; text-transform: capitalize;">${(r.delivery_method || '').replace('_', ' ')}</div>
            </td>
            <td style="padding: 12px 16px;">
                ${timerBadge}
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Due: ${r.effective_deadline}</div>
            </td>
            <td style="padding: 12px 16px;">
                ${feeBadge}
            </td>
            <td style="padding: 12px 16px;">
                ${statusBadge}
            </td>
            <td style="padding: 12px 16px; text-align: right;">
                <div style="display: inline-flex; gap: 6px; align-items: center;">
                    <button type="button" class="btn-drs-bundle" data-patient-id="${r.patient_id}" data-req-id="${r.id}" title="Compile and export complete Designated Record Set bundle" style="background: #0284c7; color: #fff; border: none; padding: 5px 9px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                        📦 DRS Bundle
                    </button>
                    ${canExtend ? `
                        <button type="button" class="btn-drs-extend" data-id="${r.id}" title="Grant statutory 30-day extension (§ 164.524(b)(2)(ii))" style="background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; padding: 5px 9px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                            ⏳ +30d
                        </button>
                    ` : ''}
                    ${r.is_extended ? `
                        <button type="button" class="btn-drs-notice" data-id="${r.id}" title="Print statutory extension notice letter" style="background: #ffffff; color: #6b21a8; border: 1px solid #cbd5e1; padding: 5px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            📜 Notice
                        </button>
                    ` : ''}
                    ${canFulfill ? `
                        <button type="button" class="btn-drs-fulfill" data-id="${r.id}" data-num="${r.request_number}" title="Mark as fulfilled" style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 5px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                            ✓
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function attachRowActionListeners(container) {
    // Compile Bundle button
    container.querySelectorAll(".btn-drs-bundle").forEach(btn => {
        btn.addEventListener("click", () => {
            const patientId = parseInt(btn.dataset.patientId, 10);
            openBundleModal(container, patientId);
        });
    });

    // Grant Extension button
    container.querySelectorAll(".btn-drs-extend").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            openExtensionModal(container, id);
        });
    });

    // Extension Notice Letter button
    container.querySelectorAll(".btn-drs-notice").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            openNoticeModal(container, id);
        });
    });

    // Fulfill button
    container.querySelectorAll(".btn-drs-fulfill").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            const num = btn.dataset.num;
            if (confirm(`Confirm fulfillment of Right of Access request ${num}?\n\nThis will record completion under 45 CFR § 164.524 in the tamper-evident audit trail.`)) {
                try {
                    const res = await fulfillDrsRequest(id, { fulfillment_date: new Date().toISOString().split("T")[0] });
                    if (res && res.success) {
                        alert(res.message);
                        await loadPipelineData(container);
                    } else {
                        alert(res?.message || "Failed to fulfill request.");
                    }
                } catch (err) {
                    alert("Error fulfilling request.");
                }
            }
        });
    });
}

function setupIntakePatientSearch(container) {
    const input = container.querySelector("#intakePatientSearch");
    const hiddenId = container.querySelector("#intakePatientId");
    const label = container.querySelector("#intakePatientSelectedLabel");

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
    const form = container.querySelector("#formDrsIntake");
    if (form) form.reset();

    const dateInput = container.querySelector("#intakeRequestDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    const label = container.querySelector("#intakePatientSelectedLabel");
    if (label) label.style.display = "none";

    const hiddenId = container.querySelector("#intakePatientId");
    if (hiddenId) hiddenId.value = "";
}

async function submitIntakeForm(container) {
    const form = container.querySelector("#formDrsIntake");
    const patientId = parseInt(container.querySelector("#intakePatientId").value, 10);

    if (!patientId) {
        alert("Please search and select a valid patient.");
        return;
    }

    const payload = {
        patient_id: patientId,
        request_date: container.querySelector("#intakeRequestDate").value,
        requestor_type: container.querySelector("#intakeRequestorType").value,
        requestor_name: container.querySelector("#intakeRequestorName").value.trim(),
        requestor_contact: container.querySelector("#intakeRequestorContact").value.trim(),
        request_channel: container.querySelector("#intakeRequestChannel").value,
        format_requested: container.querySelector("#intakeFormatRequested").value,
        delivery_method: container.querySelector("#intakeDeliveryMethod").value,
        records_scope: container.querySelector("#intakeRecordsScope").value,
        fee_category: container.querySelector("#intakeFeeCategory").value,
        fee_assessed: parseFloat(container.querySelector("#intakeFeeAssessed").value || 0),
        fee_breakdown: container.querySelector("#intakeFeeBreakdown").value.trim(),
        notes: container.querySelector("#intakeNotes").value.trim()
    };

    try {
        const res = await createDrsRequest(payload);
        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalDrsIntakeOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to log Right of Access request.");
        }
    } catch (err) {
        alert("Error submitting request: " + err.message);
    }
}

function openExtensionModal(container, id) {
    const overlay = container.querySelector("#modalDrsExtensionOverlay");
    const hiddenId = container.querySelector("#extRequestId");
    const form = container.querySelector("#formDrsExtension");

    if (form) form.reset();
    if (hiddenId) hiddenId.value = id;
    if (overlay) overlay.style.display = "flex";
}

async function submitExtensionForm(container) {
    const id = parseInt(container.querySelector("#extRequestId").value, 10);
    const reason = container.querySelector("#extReason").value;
    const rationale = container.querySelector("#extRationale").value.trim();

    if (!rationale) {
        alert("Please provide an evidentiary rationale for the statutory extension.");
        return;
    }

    try {
        const res = await grantDrsExtension(id, {
            extension_reason: reason,
            extension_rationale: rationale
        });

        if (res && res.success) {
            alert(res.message);
            container.querySelector("#modalDrsExtensionOverlay").style.display = "none";
            await loadPipelineData(container);
        } else {
            alert(res?.message || "Failed to apply extension.");
        }
    } catch (err) {
        alert("Error granting extension: " + err.message);
    }
}

async function openBundleModal(container, patientId) {
    const overlay = container.querySelector("#modalDrsBundleOverlay");
    const loading = container.querySelector("#drsBundleLoading");
    const content = container.querySelector("#drsBundleContent");

    if (!overlay) return;
    overlay.style.display = "flex";
    if (loading) loading.style.display = "block";
    if (content) content.style.display = "none";

    try {
        const res = await fetchDrsBundle(patientId);
        if (!res || !res.success) {
            alert(res?.message || "Failed to compile Designated Record Set.");
            overlay.style.display = "none";
            return;
        }

        activeBundleData = res.data;
        const p = activeBundleData.patient || {};
        const c = activeBundleData.clinical_records || {};
        const b = activeBundleData.billing_records || {};

        container.querySelector("#bundlePatientName").textContent = p.name || "Patient";
        container.querySelector("#bundlePatientNo").textContent = p.patient_no || "N/A";
        container.querySelector("#bundlePatientDob").textContent = p.birthdate || "N/A";
        container.querySelector("#bundlePatientSex").textContent = (p.sex || "").toUpperCase();

        container.querySelector("#bundleCountEncounters").textContent = (c.encounters_and_visits || []).length;
        container.querySelector("#bundleCountProblems").textContent = (c.problem_list || []).length;
        container.querySelector("#bundleCountAllergies").textContent = (c.allergies_and_intolerances || []).length;
        container.querySelector("#bundleCountMeds").textContent = (c.medications_active || []).length;
        container.querySelector("#bundleCountLabs").textContent = (c.diagnostic_procedure_results || []).length;
        container.querySelector("#bundleCountLedger").textContent = (b.financial_ledger || []).length;

        if (loading) loading.style.display = "none";
        if (content) content.style.display = "block";
    } catch (err) {
        console.error("Bundle collation error:", err);
        alert("Failed to compile Designated Record Set bundle.");
        overlay.style.display = "none";
    }
}

async function openNoticeModal(container, id) {
    const overlay = container.querySelector("#modalDrsNoticeOverlay");
    const letterBox = container.querySelector("#drsNoticeLetterContainer");

    if (!overlay || !letterBox) return;
    letterBox.innerHTML = "Loading extension notice...";
    overlay.style.display = "flex";

    try {
        const res = await fetchDrsExtensionNotice(id);
        if (!res || !res.success) {
            letterBox.innerHTML = `<span style="color:#ef4444;">Failed to load notice.</span>`;
            return;
        }

        const n = res.data;
        letterBox.innerHTML = `
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
                <h3 style="margin: 0; font-size: 18px; color: #0f172a;">${escapeHtml(n.facility_name)}</h3>
                <div style="font-size: 12px; color: #64748b;">${escapeHtml(n.facility_address)}</div>
                <div style="font-size: 12px; color: #64748b;">Office of the Privacy Officer &bull; Tel: ${escapeHtml(n.privacy_office_phone)}</div>
            </div>

            <div style="text-align: right; font-size: 13px; margin-bottom: 16px;">
                <strong>Date:</strong> ${n.notice_date}
            </div>

            <div style="margin-bottom: 16px; font-size: 13.5px;">
                <strong>To:</strong> ${escapeHtml(n.patient_name)} (Patient ID: ${escapeHtml(n.patient_no)})<br>
                <strong>Re:</strong> Notice of 30-Day Extension for Designated Record Set Request (${escapeHtml(n.request_number)})
            </div>

            <p style="font-size: 13.5px; margin: 12px 0;">
                Dear ${escapeHtml(n.patient_name)},
            </p>
            <p style="font-size: 13.5px; margin: 12px 0;">
                Thank you for your request dated <strong>${n.request_date}</strong> to inspect or obtain a copy of your Designated Record Set under the HIPAA Privacy Rule (45 CFR § 164.524).
            </p>
            <p style="font-size: 13.5px; margin: 12px 0;">
                In accordance with <strong>45 CFR § 164.524(b)(2)(ii)</strong>, this letter serves as formal written notification that our organization requires an extension of up to 30 calendar days beyond the initial 30-day deadline of <strong>${n.initial_deadline}</strong>.
            </p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; padding: 12px; margin: 14px 0; font-size: 13px;">
                <strong>Reason for Delay:</strong><br>
                ${escapeHtml(n.extension_reason)}
                <div style="margin-top: 6px; color: #475569;">
                    ${escapeHtml(n.extension_rationale)}
                </div>
            </div>
            <p style="font-size: 13.5px; margin: 12px 0;">
                We will complete action on your request and deliver your records no later than <strong>${n.extended_deadline}</strong>.
            </p>
            <p style="font-size: 13.5px; margin: 12px 0;">
                If you have questions regarding this extension, you may contact our Privacy Office at ${escapeHtml(n.privacy_office_phone)} or via email at ${escapeHtml(n.privacy_office_email)}.
            </p>
            <div style="margin-top: 24px; font-size: 13px;">
                Sincerely,<br><br>
                <strong>Privacy Officer &amp; Health Information Management</strong><br>
                ${escapeHtml(n.facility_name)}
            </div>
        `;
    } catch (err) {
        letterBox.innerHTML = `<span style="color:#ef4444;">Error generating extension notice.</span>`;
    }
}

function downloadBundleJson() {
    if (!activeBundleData) {
        alert("No active bundle data to download.");
        return;
    }

    const patientNo = activeBundleData.patient?.patient_no || "PATIENT";
    const blob = new Blob([JSON.stringify(activeBundleData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DRS_Designated_Record_Set_${patientNo}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printBundlePdf() {
    if (!activeBundleData) {
        alert("No active bundle data available.");
        return;
    }

    // Critical Pattern from dashboard_reports skill: Synchronous popup to avoid browser blockers
    const reportWindow = window.open("", "_blank", "width=900,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to view and print the Designated Record Set bundle.");
        return;
    }

    reportWindow.document.open();
    reportWindow.document.write(generateBundleHtml(activeBundleData));
    reportWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
    reportWindow.document.close();
}

function printNoticeLetter() {
    const letter = document.getElementById("drsNoticeLetterContainer");
    if (!letter) return;

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
            <title>Statutory Extension Notice - 45 CFR § 164.524(b)(2)(ii)</title>
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

function generateBundleHtml(bundle) {
    const p = bundle.patient || {};
    const c = bundle.clinical_records || {};
    const b = bundle.billing_records || {};
    const meta = bundle.metadata || {};

    const problemsHtml = (c.problem_list || []).map(pr => `
        <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(pr.code || '')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(pr.title || pr.description || 'Diagnosis')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${pr.onset_date || pr.created_at || 'N/A'}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(pr.status || 'Active')}</td>
        </tr>
    `).join("") || '<tr><td colspan="4" style="padding: 8px; color: #94a3b8;">No documented active problems.</td></tr>';

    const allergiesHtml = (c.allergies_and_intolerances || []).map(al => `
        <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(al.title || al.allergen || 'Allergy')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(al.reaction || 'Unspecified')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(al.severity || 'Moderate')}</td>
        </tr>
    `).join("") || '<tr><td colspan="3" style="padding: 8px; color: #94a3b8;">No known drug allergies (NKDA).</td></tr>';

    const medsHtml = (c.medications_active || []).map(m => `
        <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(m.title || m.drug_name || 'Medication')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(m.dosage || 'As directed')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${m.start_date || 'Current'}</td>
        </tr>
    `).join("") || '<tr><td colspan="3" style="padding: 8px; color: #94a3b8;">No active medications recorded.</td></tr>';

    const ledgerHtml = (b.financial_ledger || []).slice(0, 50).map(l => `
        <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${l.entry_date || 'N/A'}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(l.description || l.code || 'Service')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${parseFloat(l.charge || 0).toFixed(2)}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${parseFloat(l.payment || 0).toFixed(2)}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${parseFloat(l.balance || 0).toFixed(2)}</td>
        </tr>
    `).join("") || '<tr><td colspan="5" style="padding: 8px; color: #94a3b8;">No billing ledger entries found.</td></tr>';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Designated Record Set - ${escapeHtml(p.name)} (${escapeHtml(p.patient_no)})</title>
            <style>
                @page { size: letter; margin: 18mm 15mm; }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #1e293b; line-height: 1.5; padding: 20px; }
                h1 { font-size: 20px; margin: 0 0 4px 0; color: #0f172a; }
                h2 { font-size: 14px; margin: 20px 0 8px 0; color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 4px; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; }
                th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 6px 10px; font-size: 11px; text-transform: uppercase; }
                .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px;">
                <div>
                    <h1>${escapeHtml(meta.facility_name)}</h1>
                    <div style="font-size: 11px; color: #64748b;">Complete Designated Record Set (DRS) &bull; 45 CFR § 164.501 &amp; § 164.524</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #64748b;">
                    <div><strong>Generated:</strong> ${meta.generated_at}</div>
                    <div><strong>Standard:</strong> ${meta.electronic_format_standard}</div>
                </div>
            </div>

            <div class="meta-box">
                <table style="margin: 0; width: 100%;">
                    <tr>
                        <td><strong>Patient Name:</strong> ${escapeHtml(p.name)}</td>
                        <td><strong>Patient ID:</strong> ${escapeHtml(p.patient_no)}</td>
                        <td><strong>Date of Birth:</strong> ${p.birthdate || 'N/A'}</td>
                        <td><strong>Sex:</strong> ${(p.sex || '').toUpperCase()}</td>
                    </tr>
                </table>
            </div>

            <h2>1. Active Problems &amp; Diagnostic History</h2>
            <table>
                <thead><tr><th>ICD-10 Code</th><th>Condition / Diagnosis</th><th>Onset Date</th><th>Status</th></tr></thead>
                <tbody>${problemsHtml}</tbody>
            </table>

            <h2>2. Allergies &amp; Adverse Reactions</h2>
            <table>
                <thead><tr><th>Allergen</th><th>Reaction Description</th><th>Severity</th></tr></thead>
                <tbody>${allergiesHtml}</tbody>
            </table>

            <h2>3. Active Medications &amp; Prescriptions</h2>
            <table>
                <thead><tr><th>Medication</th><th>Dosage &amp; Instructions</th><th>Start Date</th></tr></thead>
                <tbody>${medsHtml}</tbody>
            </table>

            <h2>4. Billing Ledger &amp; Financial Accounting Statement</h2>
            <table>
                <thead><tr><th>Date</th><th>Service / Code Description</th><th style="text-align:right;">Charge</th><th style="text-align:right;">Payment</th><th style="text-align:right;">Balance</th></tr></thead>
                <tbody>${ledgerHtml}</tbody>
            </table>

            <div style="margin-top: 30px; font-size: 10.5px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center;">
                This document constitutes the official Designated Record Set under HIPAA 45 CFR § 164.501 and § 164.524. Confidential Protected Health Information.
            </div>
        </body>
        </html>
    `;
}

function formatFeeCategory(cat) {
    const map = {
        none_zero_fee: "Zero Fee",
        electronic_media_safe_harbor: "Media Safe Harbor",
        paper_copying_supplies: "Paper Supplies",
        actual_postage: "Postage"
    };
    return map[cat] || cat;
}

function formatRequestedLabel(fmt) {
    const map = {
        electronic_pdf: "Electronic PDF",
        machine_readable_json: "JSON Machine-Readable",
        paper_printout: "Paper Printout",
        portal_download: "Portal Download",
        all_formats: "All Formats"
    };
    return map[fmt] || fmt;
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
