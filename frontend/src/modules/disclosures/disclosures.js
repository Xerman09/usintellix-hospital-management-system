import {
    fetchDisclosures,
    fetchDisclosureStats,
    fetchDisclosureReport,
    getDisclosureExportCsvUrl,
    addDisclosure,
    updateDisclosure,
    removeDisclosure
} from "./disclosures.service.js?v=6";
import { fetchPatients } from "../patients/patients.service.js?v=6";
import { showToast } from "../../core/toast.js";

const LEGAL_BASIS_LABELS = {
    court_order_subpoena: "Court Order / Subpoena (§ 164.512(e))",
    public_health: "Public Health Reporting (§ 164.512(b))",
    law_enforcement: "Law Enforcement Request (§ 164.512(f))",
    health_oversight: "Health Oversight Agency Audit (§ 164.512(d))",
    hie_exchange: "Health Information Exchange (HIE)",
    abuse_neglect: "Abuse / Neglect Reporting (§ 164.512(c))",
    threat_safety: "Averting Serious Threat (§ 164.512(j))",
    workers_comp: "Workers' Compensation (§ 164.512(l))",
    coroner_medical_examiner: "Coroner / Medical Examiner (§ 164.512(g))",
    organ_procurement: "Organ Donation Procurement (§ 164.512(h))",
    other_non_tpo: "Other Authorized Non-TPO Release"
};

const LEGAL_BASIS_BADGES = {
    court_order_subpoena: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    public_health: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    law_enforcement: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
    health_oversight: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    hie_exchange: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
    abuse_neglect: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
    threat_safety: { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" },
    workers_comp: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
    coroner_medical_examiner: { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
    organ_procurement: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
    other_non_tpo: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" }
};

const MEDIUM_LABELS = {
    electronic_portal: "Electronic Portal / API Feed",
    secure_email: "Encrypted Secure Email",
    encrypted_media: "Encrypted Storage Media",
    fax: "Secure HIPAA Fax",
    paper_mail: "Certified Paper Mail",
    in_person: "In-Person Handover"
};

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(isoStr) {
    if (!isoStr) return "--";
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return isoStr;
    }
}

export function initDisclosures() {
    const root = document.getElementById("disclosuresModuleRoot");
    if (!root) return;

    let cachedPatients = [];
    let cachedDisclosures = [];
    let activeReportData = null;

    // Default filter to 6 years back (§ 164.528 standard)
    const today = new Date();
    const sixYearsAgo = new Date();
    sixYearsAgo.setFullYear(today.getFullYear() - 6);

    const fromInput = document.getElementById("discFilterFrom");
    const toInput = document.getElementById("discFilterTo");
    const searchInput = document.getElementById("discFilterSearch");
    const basisSelect = document.getElementById("discFilterBasis");

    if (fromInput) fromInput.value = sixYearsAgo.toISOString().split("T")[0];
    if (toInput) toInput.value = today.toISOString().split("T")[0];

    // Load Initial Data
    loadPatients();
    loadStats();
    loadTable();

    // -------------------------------------------------------------------------
    // Quick Presets
    // -------------------------------------------------------------------------
    root.querySelectorAll(".disc-preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const preset = btn.dataset.preset;
            const now = new Date();
            const nowStr = now.toISOString().split("T")[0];

            if (preset === "6years") {
                const past = new Date();
                past.setFullYear(now.getFullYear() - 6);
                fromInput.value = past.toISOString().split("T")[0];
                toInput.value = nowStr;
            } else if (preset === "1year") {
                const past = new Date();
                past.setFullYear(now.getFullYear() - 1);
                fromInput.value = past.toISOString().split("T")[0];
                toInput.value = nowStr;
            } else if (preset === "90days") {
                const past = new Date();
                past.setDate(now.getDate() - 90);
                fromInput.value = past.toISOString().split("T")[0];
                toInput.value = nowStr;
            } else if (preset === "all") {
                fromInput.value = "";
                toInput.value = "";
            }

            loadStats();
            loadTable();
        });
    });

    // Filter Buttons
    document.getElementById("btnApplyDiscFilters")?.addEventListener("click", () => {
        loadStats();
        loadTable();
    });

    document.getElementById("btnResetDiscFilters")?.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (basisSelect) basisSelect.value = "";
        if (fromInput) fromInput.value = "";
        if (toInput) toInput.value = "";
        loadStats();
        loadTable();
    });

    searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            loadStats();
            loadTable();
        }
    });

    // -------------------------------------------------------------------------
    // Export CSV
    // -------------------------------------------------------------------------
    document.getElementById("btnExportDisclosuresCsv")?.addEventListener("click", () => {
        const filters = getFilterParams();
        const exportUrl = getDisclosureExportCsvUrl(filters);
        window.open(exportUrl, "_blank");
    });

    // -------------------------------------------------------------------------
    // Record / Edit Modal Handlers
    // -------------------------------------------------------------------------
    const recordModal = document.getElementById("recordDisclosureModalOverlay");
    const recordForm = document.getElementById("recordDisclosureForm");

    document.getElementById("btnOpenNewDisclosureModal")?.addEventListener("click", () => {
        openRecordModal();
    });

    document.getElementById("btnCloseRecordDisclosureModal")?.addEventListener("click", () => {
        closeRecordModal();
    });

    document.getElementById("btnCancelRecordDisclosure")?.addEventListener("click", () => {
        closeRecordModal();
    });

    recordModal?.addEventListener("click", (e) => {
        if (e.target === recordModal) closeRecordModal();
    });

    recordForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await handleRecordSubmit();
    });

    // -------------------------------------------------------------------------
    // Patient Accounting Statement Modal Handlers
    // -------------------------------------------------------------------------
    const reportModal = document.getElementById("accountingReportModalOverlay");

    document.getElementById("btnOpenAccountingReportModal")?.addEventListener("click", () => {
        openReportModal();
    });

    document.getElementById("btnCloseAccountingReportModal")?.addEventListener("click", () => {
        closeReportModal();
    });

    document.getElementById("btnCancelAccountingReport")?.addEventListener("click", () => {
        closeReportModal();
    });

    reportModal?.addEventListener("click", (e) => {
        if (e.target === reportModal) closeReportModal();
    });

    document.getElementById("btnGenerateReportView")?.addEventListener("click", async () => {
        await handleGenerateReport();
    });

    document.getElementById("btnPrintAccountingReport")?.addEventListener("click", () => {
        if (!activeReportData) return;
        printAccountingStatement(activeReportData);
    });

    // =========================================================================
    // Core Functions
    // =========================================================================
    function getFilterParams() {
        return {
            search: searchInput ? searchInput.value.trim() : "",
            legal_basis: basisSelect ? basisSelect.value : "",
            from: fromInput ? fromInput.value : "",
            to: toInput ? toInput.value : ""
        };
    }

    async function loadPatients() {
        try {
            const res = await fetchPatients();
            cachedPatients = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

            const recSelect = document.getElementById("rec_patient_id");
            const rptSelect = document.getElementById("rpt_patient_id");

            const optionsHtml = '<option value="">Select patient...</option>' +
                cachedPatients.map(p => {
                    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
                    const mrn = p.patient_no || p.id;
                    return `<option value="${p.id}">${escapeHtml(name)} (MRN: ${escapeHtml(mrn)})</option>`;
                }).join("");

            if (recSelect) recSelect.innerHTML = optionsHtml;
            if (rptSelect) rptSelect.innerHTML = optionsHtml;
        } catch (err) {
            console.error("Failed to load patients for disclosure module:", err);
        }
    }

    async function loadStats() {
        try {
            const filters = getFilterParams();
            const res = await fetchDisclosureStats(filters);
            if (res && res.success && res.data) {
                const s = res.data;
                const setEl = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = val !== undefined ? val : "0";
                };
                setEl("statTotalDisclosures", s.total_disclosures);
                setEl("statSubpoenas", s.subpoenas_court_orders);
                setEl("statPublicHealth", s.public_health);
                setEl("statLawEnforcement", s.law_enforcement);
                setEl("statHie", s.hie_exchanges);
                setEl("statSixYears", s.six_year_window_count);
            }
        } catch (err) {
            console.error("Failed to fetch disclosure stats:", err);
        }
    }

    async function loadTable() {
        const tbody = document.getElementById("disclosuresTableBody");
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="table-empty" style="padding: 24px; text-align: center; color: #64748b;">
                    Loading disclosures log...
                </td>
            </tr>
        `;

        try {
            const filters = getFilterParams();
            const res = await fetchDisclosures(filters);

            if (res && res.success && Array.isArray(res.data)) {
                cachedDisclosures = res.data;
                renderTable(cachedDisclosures);
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="table-empty" style="padding: 24px; text-align: center; color: #ef4444;">
                            Failed to retrieve disclosure records.
                        </td>
                    </tr>
                `;
            }
        } catch (err) {
            console.error("Failed to load disclosures:", err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-empty" style="padding: 24px; text-align: center; color: #ef4444;">
                        An error occurred while loading disclosures.
                    </td>
                </tr>
            `;
        }
    }

    function renderTable(disclosures) {
        const tbody = document.getElementById("disclosuresTableBody");
        if (!tbody) return;

        if (!disclosures || disclosures.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-empty" style="padding: 32px; text-align: center; color: #64748b;">
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#94a3b8" stroke-width="1.8" style="margin-bottom: 8px; display: inline-block;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #475569;">No External Disclosures Recorded</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">No PHI releases match the selected filters or date period.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = disclosures.map(d => {
            const basisKey = d.legal_basis || "other_non_tpo";
            const basisLabel = LEGAL_BASIS_LABELS[basisKey] || basisKey;
            const badgeStyle = LEGAL_BASIS_BADGES[basisKey] || LEGAL_BASIS_BADGES.other_non_tpo;
            const patientName = `${d.first_name || ""} ${d.last_name || ""}`.trim() || `Patient #${d.patient_id}`;
            const patientMrn = d.patient_no ? `MRN: ${d.patient_no}` : `ID: ${d.patient_id}`;
            const recordedByName = d.created_by_name ? escapeHtml(d.created_by_name) : "Staff";
            const mediumLabel = MEDIUM_LABELS[d.disclosure_medium] || d.disclosure_medium || "Direct";

            return `
                <tr style="border-bottom: 1px solid #f1f5f9;" data-id="${d.id}">
                    <!-- DATE -->
                    <td style="padding: 12px 14px; font-size: 12.5px; color: #334155; white-space: nowrap; vertical-align: top;">
                        <span style="font-weight: 600; color: #0f172a;">${formatDate(d.disclosure_date)}</span>
                    </td>

                    <!-- PATIENT -->
                    <td style="padding: 12px 14px; font-size: 12.5px; vertical-align: top;">
                        <div style="font-weight: 700; color: #0284c7;">${escapeHtml(patientName)}</div>
                        <div style="font-size: 11px; color: #64748b;">${escapeHtml(patientMrn)}</div>
                    </td>

                    <!-- LEGAL BASIS -->
                    <td style="padding: 12px 14px; font-size: 12px; vertical-align: top;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 11px; background: ${badgeStyle.bg}; color: ${badgeStyle.color}; border: 1px solid ${badgeStyle.border};">
                            ${escapeHtml(basisLabel)}
                        </span>
                    </td>

                    <!-- RECIPIENT -->
                    <td style="padding: 12px 14px; font-size: 12.5px; vertical-align: top; max-width: 180px;">
                        <div style="font-weight: 600; color: #1e293b;">${escapeHtml(d.recipient)}</div>
                        ${d.recipient_address ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(d.recipient_address)}</div>` : ""}
                        ${d.requestor_name ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">Req: ${escapeHtml(d.requestor_name)}</div>` : ""}
                    </td>

                    <!-- PURPOSE & RECORDS -->
                    <td style="padding: 12px 14px; font-size: 12px; vertical-align: top; max-width: 240px;">
                        <div style="font-weight: 600; color: #334155;">${escapeHtml(d.purpose || d.description || "--")}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                            <span style="font-weight: 600;">Records:</span> ${escapeHtml(d.records_disclosed || "Chart records")}
                        </div>
                    </td>

                    <!-- MEDIUM & REF -->
                    <td style="padding: 12px 14px; font-size: 11.5px; vertical-align: top;">
                        <div style="color: #475569;">${escapeHtml(mediumLabel)}</div>
                        ${d.reference_number ? `<div style="font-size: 11px; font-family: monospace; font-weight: 600; color: #0369a1; margin-top: 2px;">Ref: ${escapeHtml(d.reference_number)}</div>` : ""}
                    </td>

                    <!-- RECORDED BY -->
                    <td style="padding: 12px 14px; font-size: 11.5px; color: #64748b; vertical-align: top; white-space: nowrap;">
                        <div>${recordedByName}</div>
                    </td>

                    <!-- ACTIONS -->
                    <td style="padding: 12px 14px; text-align: right; vertical-align: top; white-space: nowrap;">
                        <div style="display: inline-flex; gap: 4px;">
                            <button type="button" class="btn-sm btn-edit-disclosure" data-id="${d.id}" title="Edit statutory details" style="padding: 4px 8px; font-size: 11.5px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; color: #334155;">
                                Edit
                            </button>
                            <button type="button" class="btn-sm btn-statement-disclosure" data-patient-id="${d.patient_id}" title="Generate Patient Accounting Statement" style="padding: 4px 8px; font-size: 11.5px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; cursor: pointer; color: #065f46;">
                                Statement
                            </button>
                            <button type="button" class="btn-sm btn-delete-disclosure" data-id="${d.id}" data-recipient="${escapeHtml(d.recipient)}" title="Delete disclosure record" style="padding: 4px 8px; font-size: 11.5px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; cursor: pointer; color: #b91c1c;">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        // Wire Table Action Events
        tbody.querySelectorAll(".btn-edit-disclosure").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id, 10);
                const disc = cachedDisclosures.find(x => parseInt(x.id, 10) === id);
                if (disc) openRecordModal(disc);
            });
        });

        tbody.querySelectorAll(".btn-statement-disclosure").forEach(btn => {
            btn.addEventListener("click", () => {
                const patientId = parseInt(btn.dataset.patientId, 10);
                openReportModal(patientId);
            });
        });

        tbody.querySelectorAll(".btn-delete-disclosure").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = parseInt(btn.dataset.id, 10);
                const recipient = btn.dataset.recipient || "selected entity";
                if (!confirm(`Are you sure you want to delete the disclosure record to "${recipient}"?\n\nUnder HIPAA § 164.528, this deletion event will be permanently recorded in the immutable audit trail.`)) {
                    return;
                }

                try {
                    const res = await removeDisclosure(id);
                    if (res && res.success) {
                        showToast("Disclosure record deleted and event logged in audit trail.", "success");
                        loadStats();
                        loadTable();
                    } else {
                        showToast(res.message || "Failed to delete disclosure record.", "error");
                    }
                } catch (err) {
                    console.error("Failed to remove disclosure:", err);
                    showToast("Error communicating with server.", "error");
                }
            });
        });
    }

    // =========================================================================
    // Record / Edit Modal Functions
    // =========================================================================
    function openRecordModal(disc = null) {
        if (!recordModal) return;
        const titleEl = document.getElementById("recordDisclosureModalTitle");
        const alertEl = document.getElementById("recordDisclosureFormAlert");
        if (alertEl) alertEl.innerHTML = "";

        // Clear errors
        recordForm.querySelectorAll(".form-error").forEach(el => el.textContent = "");

        if (disc) {
            if (titleEl) titleEl.textContent = "Edit External Disclosure Record";
            document.getElementById("rec_disclosure_id").value = disc.id;
            document.getElementById("rec_patient_id").value = disc.patient_id;
            document.getElementById("rec_patient_id").disabled = true; // Cannot reassign patient

            const discDate = disc.disclosure_date ? disc.disclosure_date.substring(0, 10) : "";
            document.getElementById("rec_disclosure_date").value = discDate;
            document.getElementById("rec_legal_basis").value = disc.legal_basis || "court_order_subpoena";
            document.getElementById("rec_recipient").value = disc.recipient || "";
            document.getElementById("rec_recipient_address").value = disc.recipient_address || "";
            document.getElementById("rec_requestor_name").value = disc.requestor_name || "";
            document.getElementById("rec_disclosure_medium").value = disc.disclosure_medium || "electronic_portal";
            document.getElementById("rec_reference_number").value = disc.reference_number || "";
            document.getElementById("rec_purpose").value = disc.purpose || disc.description || "";
            document.getElementById("rec_records_disclosed").value = disc.records_disclosed || "";
            document.getElementById("rec_description").value = disc.description || "";
        } else {
            if (titleEl) titleEl.textContent = "Record External Disclosure";
            recordForm.reset();
            document.getElementById("rec_disclosure_id").value = "";
            document.getElementById("rec_patient_id").disabled = false;
            document.getElementById("rec_disclosure_date").value = new Date().toISOString().split("T")[0];
            document.getElementById("rec_legal_basis").value = "court_order_subpoena";
            document.getElementById("rec_disclosure_medium").value = "electronic_portal";
        }

        recordModal.classList.add("open");
    }

    function closeRecordModal() {
        if (!recordModal) return;
        recordModal.classList.remove("open");
        recordForm.reset();
        document.getElementById("rec_disclosure_id").value = "";
        document.getElementById("rec_patient_id").disabled = false;
    }

    async function handleRecordSubmit() {
        const id = document.getElementById("rec_disclosure_id").value;
        const patientId = document.getElementById("rec_patient_id").value;
        const disclosureDate = document.getElementById("rec_disclosure_date").value;
        const legalBasis = document.getElementById("rec_legal_basis").value;
        const recipient = document.getElementById("rec_recipient").value.trim();
        const recipientAddress = document.getElementById("rec_recipient_address").value.trim();
        const requestorName = document.getElementById("rec_requestor_name").value.trim();
        const disclosureMedium = document.getElementById("rec_disclosure_medium").value;
        const referenceNumber = document.getElementById("rec_reference_number").value.trim();
        const purpose = document.getElementById("rec_purpose").value.trim();
        const recordsDisclosed = document.getElementById("rec_records_disclosed").value.trim();
        const description = document.getElementById("rec_description").value.trim();

        // Validate
        let hasErrors = false;
        const setError = (field, msg) => {
            const errEl = document.getElementById(`err-${field}`);
            if (errEl) errEl.textContent = msg;
            if (msg) hasErrors = true;
        };

        setError("rec_patient_id", !patientId ? "Patient is required." : "");
        setError("rec_disclosure_date", !disclosureDate ? "Date is required." : "");
        setError("rec_recipient", !recipient ? "Recipient is required." : "");
        setError("rec_purpose", !purpose ? "Statement of purpose is required under § 164.528(b)(2)(iv)." : "");
        setError("rec_records_disclosed", !recordsDisclosed ? "Specific records disclosed is required under § 164.528(b)(2)(iii)." : "");

        if (hasErrors) return;

        const payload = {
            disclosure_date: disclosureDate,
            legal_basis: legalBasis,
            recipient: recipient,
            recipient_address: recipientAddress,
            requestor_name: requestorName,
            disclosure_medium: disclosureMedium,
            reference_number: referenceNumber,
            purpose: purpose,
            records_disclosed: recordsDisclosed,
            description: description
        };

        const submitBtn = document.getElementById("btnSubmitRecordDisclosure");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving...";
        }

        try {
            let res;
            if (id) {
                res = await updateDisclosure(id, payload);
            } else {
                res = await addDisclosure(patientId, payload);
            }

            if (res && res.success) {
                showToast(id ? "Disclosure record updated successfully." : "Disclosure recorded successfully in HIPAA accounting ledger.", "success");
                closeRecordModal();
                loadStats();
                loadTable();
            } else {
                const alertEl = document.getElementById("recordDisclosureFormAlert");
                if (alertEl) {
                    alertEl.innerHTML = `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; color: #991b1b; font-size: 13px; margin-bottom: 12px;">
                            ${escapeHtml(res.message || "Failed to save disclosure record.")}
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error("Failed to save disclosure:", err);
            const alertEl = document.getElementById("recordDisclosureFormAlert");
            if (alertEl) {
                alertEl.innerHTML = `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; color: #991b1b; font-size: 13px; margin-bottom: 12px;">
                        A network or server error occurred.
                    </div>
                `;
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Save Disclosure Record";
            }
        }
    }

    // =========================================================================
    // Report Modal Functions
    // =========================================================================
    function openReportModal(patientId = null) {
        if (!reportModal) return;
        const previewArea = document.getElementById("accountingReportPreviewArea");
        const printBtn = document.getElementById("btnPrintAccountingReport");
        const alertEl = document.getElementById("accountingReportAlert");

        if (previewArea) previewArea.style.display = "none";
        if (printBtn) printBtn.style.display = "none";
        if (alertEl) alertEl.innerHTML = "";
        activeReportData = null;

        // Set default 6 year dates
        const now = new Date();
        const sixYrs = new Date();
        sixYrs.setFullYear(now.getFullYear() - 6);

        const rptFrom = document.getElementById("rpt_from_date");
        const rptTo = document.getElementById("rpt_to_date");
        const rptPatient = document.getElementById("rpt_patient_id");

        if (rptFrom) rptFrom.value = sixYrs.toISOString().split("T")[0];
        if (rptTo) rptTo.value = now.toISOString().split("T")[0];

        if (patientId && rptPatient) {
            rptPatient.value = patientId;
            reportModal.classList.add("open");
            // Auto generate statement if pre-selected
            handleGenerateReport();
        } else {
            reportModal.classList.add("open");
        }
    }

    function closeReportModal() {
        if (!reportModal) return;
        reportModal.classList.remove("open");
        activeReportData = null;
    }

    async function handleGenerateReport() {
        const patientSelect = document.getElementById("rpt_patient_id");
        const fromInput = document.getElementById("rpt_from_date");
        const toInput = document.getElementById("rpt_to_date");
        const previewArea = document.getElementById("accountingReportPreviewArea");
        const previewContent = document.getElementById("printableReportContent");
        const printBtn = document.getElementById("btnPrintAccountingReport");
        const alertEl = document.getElementById("accountingReportAlert");

        const patientId = patientSelect ? patientSelect.value : "";
        if (!patientId) {
            if (alertEl) {
                alertEl.innerHTML = `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; color: #991b1b; font-size: 13px; margin-bottom: 12px;">
                        Please select a patient to generate an Accounting of Disclosures statement.
                    </div>
                `;
            }
            return;
        }

        if (alertEl) alertEl.innerHTML = "";
        const fromVal = fromInput ? fromInput.value : "";
        const toVal = toInput ? toInput.value : "";

        try {
            const res = await fetchDisclosureReport(patientId, fromVal, toVal);
            if (res && res.success && res.data) {
                activeReportData = res.data;
                renderReportPreview(activeReportData);
                if (previewArea) previewArea.style.display = "block";
                if (printBtn) printBtn.style.display = "inline-flex";
            } else {
                if (alertEl) {
                    alertEl.innerHTML = `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; color: #991b1b; font-size: 13px; margin-bottom: 12px;">
                            ${escapeHtml(res.message || "Failed to compile accounting statement.")}
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error("Failed to generate disclosure report:", err);
            if (alertEl) {
                alertEl.innerHTML = `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; color: #991b1b; font-size: 13px; margin-bottom: 12px;">
                        An error occurred while compiling the report.
                    </div>
                `;
            }
        }
    }

    function renderReportPreview(data) {
        const previewContent = document.getElementById("printableReportContent");
        if (!previewContent) return;

        const fac = data.facility || {};
        const pat = data.patient || {};
        const disclosures = data.disclosures || [];

        let rowsHtml = "";
        if (disclosures.length === 0) {
            rowsHtml = `
                <tr>
                    <td colspan="6" style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">
                        No reportable disclosures were made for this individual during the requested accounting period.
                    </td>
                </tr>
            `;
        } else {
            rowsHtml = disclosures.map((d, idx) => {
                const basisKey = d.legal_basis || "other_non_tpo";
                const basisLabel = LEGAL_BASIS_LABELS[basisKey] || basisKey;
                const mediumLabel = MEDIUM_LABELS[d.disclosure_medium] || d.disclosure_medium || "Direct";

                return `
                    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11.5px;">
                        <td style="padding: 10px 8px; font-weight: 600; color: #0f172a; white-space: nowrap;">
                            ${formatDate(d.disclosure_date)}
                        </td>
                        <td style="padding: 10px 8px;">
                            <div style="font-weight: 700; color: #1e293b;">${escapeHtml(d.recipient)}</div>
                            ${d.recipient_address ? `<div style="font-size: 10.5px; color: #64748b;">${escapeHtml(d.recipient_address)}</div>` : ""}
                            ${d.requestor_name ? `<div style="font-size: 10.5px; color: #475569;">Official: ${escapeHtml(d.requestor_name)}</div>` : ""}
                        </td>
                        <td style="padding: 10px 8px; color: #0369a1; font-weight: 600;">
                            ${escapeHtml(basisLabel)}
                        </td>
                        <td style="padding: 10px 8px; color: #334155;">
                            ${escapeHtml(d.purpose || d.description || "--")}
                        </td>
                        <td style="padding: 10px 8px; color: #475569;">
                            ${escapeHtml(d.records_disclosed || "Chart records")}
                        </td>
                        <td style="padding: 10px 8px; color: #64748b; white-space: nowrap;">
                            <div>${escapeHtml(mediumLabel)}</div>
                            ${d.reference_number ? `<div style="font-family: monospace; font-size: 10px; color: #0f172a;">${escapeHtml(d.reference_number)}</div>` : ""}
                        </td>
                    </tr>
                `;
            }).join("");
        }

        previewContent.innerHTML = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
                <!-- LETTERHEAD -->
                <div style="border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">${escapeHtml(fac.name || "USIntellix Hospital & Health Systems")}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            ${escapeHtml(fac.street || "")}, ${escapeHtml(fac.city || "")}, ${escapeHtml(fac.state || "")} ${escapeHtml(fac.postal_code || "")}
                            &bull; Phone: ${escapeHtml(fac.phone || "")} &bull; Email: ${escapeHtml(fac.email || "")}
                        </div>
                        <div style="font-size: 12px; font-weight: 700; color: #0369a1; margin-top: 4px;">
                            Office of the HIPAA Privacy Official &bull; Health Information Management
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; background: #0f172a; color: white; padding: 4px 10px; border-radius: 4px;">
                            OFFICIAL LEGAL RECORD
                        </span>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Generated: ${data.generated_at}</div>
                    </div>
                </div>

                <!-- TITLE -->
                <div style="text-align: center; margin-bottom: 18px;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${escapeHtml(data.report_title || "Accounting of Disclosures of Protected Health Information")}
                    </h3>
                    <div style="font-size: 11.5px; font-weight: 600; color: #0284c7; margin-top: 3px;">
                        Statutory Authority: 45 CFR § 164.528 (HIPAA Privacy Rule)
                    </div>
                </div>

                <!-- PATIENT DEMOGRAPHICS & ACCOUNTING SCOPE -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px;">
                    <div>
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Individual Details</div>
                        <div><strong style="color: #334155;">Patient Name:</strong> ${escapeHtml(pat.name || "--")}</div>
                        <div><strong style="color: #334155;">Medical Record # (MRN):</strong> ${escapeHtml(pat.patient_no || pat.id || "--")}</div>
                        <div><strong style="color: #334155;">Date of Birth:</strong> ${escapeHtml(pat.birthdate || "--")} &bull; <strong style="color: #334155;">Sex:</strong> ${escapeHtml(pat.sex || "N/A")}</div>
                        <div><strong style="color: #334155;">Contact Phone:</strong> ${escapeHtml(pat.phone || "--")}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Accounting Period &amp; Scope</div>
                        <div><strong style="color: #334155;">Period Covered:</strong> ${escapeHtml(data.period_from)} through ${escapeHtml(data.period_to)}</div>
                        <div><strong style="color: #334155;">Total Reportable Disclosures:</strong> <span style="font-weight: 700; color: #0284c7;">${data.disclosures_count}</span></div>
                        <div><strong style="color: #334155;">Statutory Period:</strong> § 164.528(a)(1) (Up to 6 years prior)</div>
                        <div><strong style="color: #334155;">Audit Trail Status:</strong> Cryptographically Verified</div>
                    </div>
                </div>

                <!-- TABLE -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
                    <thead>
                        <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 10.5px; text-transform: uppercase; color: #475569; text-align: left;">
                            <th style="padding: 8px;">Date</th>
                            <th style="padding: 8px;">Recipient &amp; Address</th>
                            <th style="padding: 8px;">Statutory Basis</th>
                            <th style="padding: 8px;">Statement of Purpose</th>
                            <th style="padding: 8px;">Records Disclosed</th>
                            <th style="padding: 8px;">Medium / Ref #</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <!-- STATUTORY EXEMPTION NOTICE -->
                <div style="font-size: 10.5px; color: #64748b; background: #f8fafc; border-left: 3px solid #0284c7; padding: 8px 12px; margin-bottom: 20px; line-height: 1.5;">
                    <strong style="color: #334155;">Statutory Notice:</strong> ${escapeHtml(data.statutory_notice)}
                </div>

                <!-- PRIVACY OFFICER CERTIFICATION & SIGNATURE BLOCK -->
                <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 11.5px;">
                    <div>
                        <div style="font-weight: 700; color: #0f172a; margin-bottom: 30px;">Privacy Officer Certification:</div>
                        <div style="border-bottom: 1px solid #0f172a; width: 85%;"></div>
                        <div style="font-weight: 600; color: #334155; margin-top: 4px;">Authorized HIPAA Privacy Official</div>
                        <div style="color: #64748b; font-size: 10.5px;">USIntellix Hospital &amp; Health Systems</div>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: #0f172a; margin-bottom: 30px;">Certification Date:</div>
                        <div style="border-bottom: 1px solid #0f172a; width: 60%;"></div>
                        <div style="font-weight: 600; color: #334155; margin-top: 4px;">Date of Official Issuance</div>
                        <div style="color: #64748b; font-size: 10.5px;">Official Seal &amp; Audit ID: ${data.patient.patient_no || data.patient.id}-${Date.now().toString(36).toUpperCase()}</div>
                    </div>
                </div>
            </div>
        `;
    }

    function printAccountingStatement(data) {
        const printWindow = window.open("", "_blank", "width=900,height=750");
        if (!printWindow) {
            showToast("Pop-up blocked. Please allow pop-ups to print the statement.", "error");
            return;
        }

        const fac = data.facility || {};
        const pat = data.patient || {};
        const disclosures = data.disclosures || [];

        let rowsHtml = "";
        if (disclosures.length === 0) {
            rowsHtml = `
                <tr>
                    <td colspan="6" style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">
                        No reportable disclosures were made for this individual during the requested accounting period.
                    </td>
                </tr>
            `;
        } else {
            rowsHtml = disclosures.map(d => {
                const basisKey = d.legal_basis || "other_non_tpo";
                const basisLabel = LEGAL_BASIS_LABELS[basisKey] || basisKey;
                const mediumLabel = MEDIUM_LABELS[d.disclosure_medium] || d.disclosure_medium || "Direct";

                return `
                    <tr style="border-bottom: 1px solid #ddd; font-size: 11px;">
                        <td style="padding: 8px 6px; font-weight: 600; color: #000; white-space: nowrap;">
                            ${formatDate(d.disclosure_date)}
                        </td>
                        <td style="padding: 8px 6px;">
                            <div style="font-weight: 700; color: #000;">${escapeHtml(d.recipient)}</div>
                            ${d.recipient_address ? `<div style="font-size: 10px; color: #555;">${escapeHtml(d.recipient_address)}</div>` : ""}
                            ${d.requestor_name ? `<div style="font-size: 10px; color: #333;">Official: ${escapeHtml(d.requestor_name)}</div>` : ""}
                        </td>
                        <td style="padding: 8px 6px; color: #000; font-weight: 600;">
                            ${escapeHtml(basisLabel)}
                        </td>
                        <td style="padding: 8px 6px; color: #333;">
                            ${escapeHtml(d.purpose || d.description || "--")}
                        </td>
                        <td style="padding: 8px 6px; color: #444;">
                            ${escapeHtml(d.records_disclosed || "Chart records")}
                        </td>
                        <td style="padding: 8px 6px; color: #555; white-space: nowrap;">
                            <div>${escapeHtml(mediumLabel)}</div>
                            ${d.reference_number ? `<div style="font-family: monospace; font-size: 10px; color: #000;">${escapeHtml(d.reference_number)}</div>` : ""}
                        </td>
                    </tr>
                `;
            }).join("");
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Accounting of Disclosures - ${escapeHtml(pat.name || "Patient")}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 30px; color: #111; line-height: 1.4; }
                    @page { size: portrait; margin: 20mm; }
                    table { width: 100%; border-collapse: collapse; }
                    th { background: #f1f5f9; border-top: 1.5px solid #333; border-bottom: 1.5px solid #333; font-size: 10.5px; text-transform: uppercase; padding: 7px 6px; text-align: left; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-size: 19px; font-weight: 800; color: #0f172a;">${escapeHtml(fac.name || "USIntellix Hospital & Health Systems")}</div>
                        <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                            ${escapeHtml(fac.street || "")}, ${escapeHtml(fac.city || "")}, ${escapeHtml(fac.state || "")} ${escapeHtml(fac.postal_code || "")}
                            &bull; Phone: ${escapeHtml(fac.phone || "")} &bull; Email: ${escapeHtml(fac.email || "")}
                        </div>
                        <div style="font-size: 11.5px; font-weight: 700; color: #0369a1; margin-top: 4px;">
                            Office of the HIPAA Privacy Official &bull; Health Information Management
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; background: #0f172a; color: white; padding: 4px 8px; border-radius: 4px;">
                            OFFICIAL LEGAL RECORD
                        </span>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Generated: ${data.generated_at}</div>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 16px;">
                    <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                        ${escapeHtml(data.report_title || "Accounting of Disclosures of Protected Health Information")}
                    </h2>
                    <div style="font-size: 11px; font-weight: 600; color: #0284c7; margin-top: 2px;">
                        Statutory Authority: 45 CFR § 164.528 (HIPAA Privacy Rule)
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; margin-bottom: 16px; font-size: 11.5px;">
                    <div style="flex: 1;">
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Individual Details</div>
                        <div><strong>Patient Name:</strong> ${escapeHtml(pat.name || "--")}</div>
                        <div><strong>Medical Record # (MRN):</strong> ${escapeHtml(pat.patient_no || pat.id || "--")}</div>
                        <div><strong>Date of Birth:</strong> ${escapeHtml(pat.birthdate || "--")} &bull; <strong>Sex:</strong> ${escapeHtml(pat.sex || "N/A")}</div>
                        <div><strong>Contact Phone:</strong> ${escapeHtml(pat.phone || "--")}</div>
                    </div>
                    <div style="flex: 1; padding-left: 20px;">
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Accounting Period &amp; Scope</div>
                        <div><strong>Period Covered:</strong> ${escapeHtml(data.period_from)} through ${escapeHtml(data.period_to)}</div>
                        <div><strong>Total Disclosures:</strong> ${data.disclosures_count}</div>
                        <div><strong>Statutory Lookback:</strong> § 164.528(a)(1) (Up to 6 years prior)</div>
                        <div><strong>Audit Verification:</strong> Cryptographically Verified</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 14%;">Date</th>
                            <th style="width: 22%;">Recipient &amp; Address</th>
                            <th style="width: 20%;">Statutory Basis</th>
                            <th style="width: 20%;">Statement of Purpose</th>
                            <th style="width: 14%;">Records Disclosed</th>
                            <th style="width: 10%;">Medium / Ref</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div style="font-size: 10px; color: #475569; background: #f8fafc; border-left: 3px solid #0284c7; padding: 8px 10px; margin-top: 16px; margin-bottom: 24px; line-height: 1.4;">
                    <strong>Statutory Notice:</strong> ${escapeHtml(data.statutory_notice)}
                </div>

                <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 11px;">
                    <div style="width: 45%;">
                        <div style="font-weight: 700; color: #000; margin-bottom: 35px;">Privacy Officer Certification:</div>
                        <div style="border-bottom: 1px solid #000;"></div>
                        <div style="font-weight: 600; margin-top: 4px;">Authorized HIPAA Privacy Official</div>
                        <div style="color: #64748b; font-size: 10px;">USIntellix Hospital &amp; Health Systems</div>
                    </div>
                    <div style="width: 40%;">
                        <div style="font-weight: 700; color: #000; margin-bottom: 35px;">Certification Date:</div>
                        <div style="border-bottom: 1px solid #000;"></div>
                        <div style="font-weight: 600; margin-top: 4px;">Date of Official Issuance</div>
                        <div style="color: #64748b; font-size: 10px;">Audit ID: ${data.patient.patient_no || data.patient.id}-${Date.now().toString(36).toUpperCase()}</div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
