import {
    fetchVendors,
    fetchVendorStats,
    fetchVendor,
    createVendor,
    updateVendor,
    deleteVendor,
    fetchVendorDossier,
    getVendorExportCsvUrl
} from "./business-associates.service.js?v=1";
import { showToast } from "../../core/toast.js";

const CATEGORY_LABELS = {
    cloud_hosting: "Cloud Hosting & Infrastructure",
    communications: "Communications & SMS Gateway",
    email_relay: "Email Relay",
    laboratory_interface: "Laboratory Interface / Diagnostic",
    billing_clearinghouse: "Billing Clearinghouse / EDI",
    transcription_ai: "Medical Transcription / AI",
    it_managed_services: "IT Managed Services / Security",
    document_destruction: "Document Destruction / Shredding",
    legal_audit_consulting: "Legal, Audit & Compliance",
    other: "Other Business Associate"
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
            day: "numeric"
        });
    } catch {
        return isoStr;
    }
}

export function initBusinessAssociates() {
    const root = document.querySelector(".baa-container");
    if (!root) return;

    let cachedVendors = [];

    // KPI Elements
    const kpiTotal = document.getElementById("kpiTotalVendors");
    const kpiActive = document.getElementById("kpiActiveBaas");
    const kpiExpiring = document.getElementById("kpiExpiringSoon");
    const kpiExpired = document.getElementById("kpiExpiredBaas");
    const kpiMissing = document.getElementById("kpiMissingBaas");
    const kpiSub = document.getElementById("kpiSubcontractors");

    // Alert Banner
    const alertBanner = document.getElementById("baaAuditAlertBanner");
    const alertText = document.getElementById("baaAlertText");
    const btnFilterAlert = document.getElementById("btnFilterAlertVendors");

    // Toolbar Elements
    const searchInput = document.getElementById("inputBaaSearch");
    const categorySelect = document.getElementById("selectBaaCategory");
    const statusSelect = document.getElementById("selectBaaStatus");
    const subCheckbox = document.getElementById("checkFilterSubcontractor");
    const btnRefresh = document.getElementById("btnRefreshBaa");
    const btnExportCsv = document.getElementById("btnExportBaaCsv");
    const btnNewVendor = document.getElementById("btnNewVendor");

    const tableBody = document.getElementById("baaTableBody");

    // Intake Modal Elements
    const modalIntake = document.getElementById("modalBaaIntake");
    const intakeTitle = document.getElementById("intakeModalTitle");
    const btnCloseIntake = document.getElementById("btnCloseIntakeModal");
    const btnCancelIntake = document.getElementById("btnCancelIntake");
    const btnSaveVendor = document.getElementById("btnSaveVendor");

    const editIdInput = document.getElementById("editVendorId");
    const inputName = document.getElementById("inputVendorName");
    const selectCategory = document.getElementById("selectVendorCategory");
    const textDesc = document.getElementById("textareaServiceDesc");
    const inputPhi = document.getElementById("inputPhiTypes");
    const inputContactName = document.getElementById("inputContactName");
    const inputContactEmail = document.getElementById("inputContactEmail");
    const inputContactPhone = document.getElementById("inputContactPhone");
    const inputAddress = document.getElementById("inputVendorAddress");
    const checkSignedBaa = document.getElementById("checkHasSignedBaa");
    const inputExecDate = document.getElementById("inputBaaExecDate");
    const inputExpDate = document.getElementById("inputBaaExpDate");
    const inputAuditDate = document.getElementById("inputAuditDate");
    const inputReviewDate = document.getElementById("inputReviewDate");
    const inputDoc = document.getElementById("inputDocFilename");
    const inputSla = document.getElementById("inputSlaHours");
    const checkSub = document.getElementById("checkSubcontractor");
    const checkSoc = document.getElementById("checkSoc2");
    const textNotes = document.getElementById("textareaNotes");

    // Dossier Modal Elements
    const modalDossier = document.getElementById("modalBaaDossier");
    const btnCloseDossierModal = document.getElementById("btnCloseDossierModal");
    const btnCloseDossier = document.getElementById("btnCloseDossier");
    const btnPrintDossier = document.getElementById("btnPrintDossier");
    const dossierPrintArea = document.getElementById("baaDossierPrintArea");

    // ==========================================
    // INITIALIZATION & DATA LOADING
    // ==========================================
    loadStats();
    loadVendors();

    async function loadStats() {
        try {
            const res = await fetchVendorStats();
            if (!res || !res.data) return;
            const d = res.data;

            if (kpiTotal) kpiTotal.textContent = d.total_vendors || 0;
            if (kpiActive) kpiActive.textContent = d.active_baas || 0;
            if (kpiExpiring) kpiExpiring.textContent = d.expiring_soon || 0;
            if (kpiExpired) kpiExpired.textContent = d.expired_baas || 0;
            if (kpiMissing) kpiMissing.textContent = d.missing_baas || 0;
            if (kpiSub) kpiSub.textContent = d.subcontractors_count || 0;

            if (d.critical_alert) {
                if (alertBanner) alertBanner.style.display = "flex";
                if (alertText) {
                    alertText.innerHTML = `
                        <strong>CRITICAL HIPAA AUDIT ALERT:</strong> 
                        ${d.missing_baas > 0 ? `<strong>${d.missing_baas}</strong> vendor(s) lack an executed BAA` : ''}
                        ${d.missing_baas > 0 && d.expired_baas > 0 ? ' and ' : ''}
                        ${d.expired_baas > 0 ? `<strong>${d.expired_baas}</strong> vendor BAA(s) have expired` : ''}! 
                        Covered entities are strictly prohibited from sharing ePHI without an active agreement under 45 CFR § 164.502(e).
                    `;
                }
            } else {
                if (alertBanner) alertBanner.style.display = "none";
            }
        } catch (err) {
            console.error("Failed to load vendor stats:", err);
        }
    }

    async function loadVendors() {
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: #94a3b8;">Loading Business Associate registry...</td></tr>`;
        }
        try {
            const filters = getActiveFilters();
            const res = await fetchVendors(filters);
            if (!res || !res.data) {
                renderTable([]);
                return;
            }
            cachedVendors = Array.isArray(res.data) ? res.data : [];
            renderTable(cachedVendors);
        } catch (err) {
            console.error("Failed to load vendors:", err);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #dc2626;">Error loading vendor registry. Please try refreshing.</td></tr>`;
            }
            showToast("Failed to fetch vendors", "error");
        }
    }

    function getActiveFilters() {
        return {
            search: searchInput ? searchInput.value.trim() : "",
            category: categorySelect ? categorySelect.value : "",
            status: statusSelect ? statusSelect.value : "",
            subcontractor: subCheckbox && subCheckbox.checked ? "1" : ""
        };
    }

    // ==========================================
    // TABLE RENDERING
    // ==========================================
    function renderTable(vendors) {
        if (!tableBody) return;
        if (!vendors || vendors.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom: 8px;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        <div style="font-weight: 600; font-size: 14px; color: #334155;">No Business Associate Vendors Found</div>
                        <div style="font-size: 12px; margin-top: 4px;">Click "Register New Vendor" above to document a third-party associate under 45 CFR § 164.502(e).</div>
                    </td>
                </tr>
            `;
            return;
        }

        const rows = vendors.map(v => {
            const name = escapeHtml(v.vendor_name);
            const categoryLabel = CATEGORY_LABELS[v.vendor_category] || v.vendor_category || "Vendor";
            const serviceDesc = escapeHtml(v.service_description);
            const phiTypes = escapeHtml(v.phi_data_types_handled);

            const contactName = escapeHtml(v.primary_contact_name || "--");
            const contactEmail = escapeHtml(v.primary_contact_email || "");
            const contactPhone = escapeHtml(v.primary_contact_phone || "");

            const execDate = formatDate(v.baa_execution_date);
            const expDate = v.baa_expiration_date ? formatDate(v.baa_expiration_date) : "Indefinite / Perpetual";

            // Status Pill
            let statusPill = "";
            const daysRemaining = v.days_until_expiration;
            if (v.baa_status === "missing_baa") {
                statusPill = `<span class="status-pill status-missing">⚠️ MISSING BAA</span>`;
            } else if (v.baa_status === "expired") {
                statusPill = `<span class="status-pill status-expired">🔴 EXPIRED (${Math.abs(daysRemaining)}d ago)</span>`;
            } else if (v.baa_status === "expiring_soon") {
                statusPill = `<span class="status-pill status-expiring">⏰ EXPIRING (${daysRemaining}d)</span>`;
            } else {
                statusPill = `<span class="status-pill status-active">✓ ACTIVE</span>`;
            }

            // Safeguards info
            const subBadge = v.subcontractor_handling_phi ?
                `<span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">Subcontractor ePHI</span>` :
                `<span style="color: #94a3b8; font-size: 11px;">No Subcontractors</span>`;

            const socBadge = v.soc2_or_hitrust_certified ?
                `<span style="background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">SOC2 / HITRUST</span>` : '';

            const slaBadge = `<span style="font-size: 11px; color: #475569; font-weight: 600;">${v.breach_notification_sla_hours || 72}h SLA</span>`;

            return `
                <tr data-id="${v.id}">
                    <td>
                        <strong style="color: #0f172a; font-size: 13.5px;">${name}</strong>
                        <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${categoryLabel}</div>
                    </td>
                    <td style="max-width: 250px;">
                        <div style="color: #334155; font-size: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${serviceDesc}">
                            ${serviceDesc}
                        </div>
                        <div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 3px;">
                            PHI: ${phiTypes}
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: #1e293b;">${contactName}</div>
                        ${contactEmail ? `<div style="font-size: 11.5px; color: #2563eb;"><a href="mailto:${contactEmail}" style="color: inherit; text-decoration: none;">${contactEmail}</a></div>` : ''}
                        ${contactPhone ? `<div style="font-size: 11px; color: #64748b;">${contactPhone}</div>` : ''}
                    </td>
                    <td>
                        <div style="font-size: 12px;"><strong>Executed:</strong> ${execDate}</div>
                        <div style="font-size: 12px; color: ${v.baa_status === 'expired' ? '#dc2626' : (v.baa_status === 'expiring_soon' ? '#b45309' : '#475569')};">
                            <strong>Expires:</strong> ${expDate}
                        </div>
                    </td>
                    <td>${statusPill}</td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                            ${subBadge}
                            ${socBadge}
                            ${slaBadge}
                        </div>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button type="button" class="baa-btn-secondary baa-btn-sm btn-dossier" data-id="${v.id}" title="Compile OCR Question #1 Compliance Dossier">
                            Dossier
                        </button>
                        <button type="button" class="baa-btn-secondary baa-btn-sm btn-edit" data-id="${v.id}" title="Edit Vendor Profile">
                            Edit
                        </button>
                        <button type="button" class="baa-btn-secondary baa-btn-sm btn-delete" data-id="${v.id}" title="Remove Vendor" style="color: #dc2626;">
                            &times;
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        tableBody.innerHTML = rows;

        // Wire Action Buttons
        tableBody.querySelectorAll(".btn-dossier").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                openDossierModal(id);
            });
        });

        tableBody.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                const vendor = cachedVendors.find(x => x.id === id);
                if (vendor) openIntakeModal(vendor);
            });
        });

        tableBody.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = parseInt(btn.dataset.id);
                const vendor = cachedVendors.find(x => x.id === id);
                const vName = vendor ? vendor.vendor_name : `#${id}`;
                if (!confirm(`Are you sure you want to remove '${vName}' from the active Business Associate inventory? This action is permanently audit-logged under HIPAA regulations.`)) {
                    return;
                }

                try {
                    const res = await deleteVendor(id);
                    if (res && res.success) {
                        showToast(`Vendor '${vName}' removed from inventory`, "success");
                        loadStats();
                        loadVendors();
                    } else {
                        showToast(res.message || "Failed to remove vendor", "error");
                    }
                } catch (err) {
                    showToast("Error deleting vendor", "error");
                }
            });
        });
    }

    // ==========================================
    // FILTER EVENT HANDLERS
    // ==========================================
    let searchDebounce = null;
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(loadVendors, 300);
        });
    }

    if (categorySelect) categorySelect.addEventListener("change", loadVendors);
    if (statusSelect) statusSelect.addEventListener("change", loadVendors);
    if (subCheckbox) subCheckbox.addEventListener("change", loadVendors);

    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => {
            loadStats();
            loadVendors();
            showToast("Vendor inventory refreshed", "info");
        });
    }

    if (btnFilterAlert) {
        btnFilterAlert.addEventListener("click", () => {
            if (statusSelect) {
                statusSelect.value = "missing_baa";
            }
            loadVendors();
        });
    }

    if (btnExportCsv) {
        btnExportCsv.addEventListener("click", () => {
            const filters = getActiveFilters();
            const url = getVendorExportCsvUrl(filters);
            window.location.href = url;
            showToast("Exporting official BAA compliance CSV...", "info");
        });
    }

    // ==========================================
    // INTAKE & EDIT MODAL
    // ==========================================
    if (btnNewVendor) {
        btnNewVendor.addEventListener("click", () => openIntakeModal(null));
    }

    function openIntakeModal(vendor = null) {
        if (!modalIntake) return;
        if (vendor) {
            intakeTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                Edit Vendor Profile: ${escapeHtml(vendor.vendor_name)}
            `;
            editIdInput.value = vendor.id;
            inputName.value = vendor.vendor_name || "";
            selectCategory.value = vendor.vendor_category || "other";
            textDesc.value = vendor.service_description || "";
            inputPhi.value = vendor.phi_data_types_handled || "";
            inputContactName.value = vendor.primary_contact_name || "";
            inputContactEmail.value = vendor.primary_contact_email || "";
            inputContactPhone.value = vendor.primary_contact_phone || "";
            inputAddress.value = vendor.vendor_address || "";
            checkSignedBaa.checked = Boolean(parseInt(vendor.has_signed_baa));
            inputExecDate.value = vendor.baa_execution_date || "";
            inputExpDate.value = vendor.baa_expiration_date || "";
            inputAuditDate.value = vendor.last_compliance_audit_date || "";
            inputReviewDate.value = vendor.next_review_deadline || "";
            inputDoc.value = vendor.baa_document_filename || "";
            inputSla.value = vendor.breach_notification_sla_hours || 72;
            checkSub.checked = Boolean(parseInt(vendor.subcontractor_handling_phi));
            checkSoc.checked = Boolean(parseInt(vendor.soc2_or_hitrust_certified));
            textNotes.value = vendor.notes || "";
        } else {
            intakeTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                Register Business Associate Vendor (§ 164.502(e))
            `;
            editIdInput.value = "";
            inputName.value = "";
            selectCategory.value = "cloud_hosting";
            textDesc.value = "";
            inputPhi.value = "Demographics, Clinical Records";
            inputContactName.value = "";
            inputContactEmail.value = "";
            inputContactPhone.value = "";
            inputAddress.value = "";
            checkSignedBaa.checked = true;
            inputExecDate.value = new Date().toISOString().split("T")[0];
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 2);
            inputExpDate.value = nextYear.toISOString().split("T")[0];
            inputAuditDate.value = new Date().toISOString().split("T")[0];
            const nextReview = new Date();
            nextReview.setFullYear(nextReview.getFullYear() + 1);
            inputReviewDate.value = nextReview.toISOString().split("T")[0];
            inputDoc.value = "";
            inputSla.value = 72;
            checkSub.checked = false;
            checkSoc.checked = true;
            textNotes.value = "";
        }
        modalIntake.style.display = "flex";
    }

    function closeIntakeModal() {
        if (modalIntake) modalIntake.style.display = "none";
    }

    if (btnCloseIntake) btnCloseIntake.addEventListener("click", closeIntakeModal);
    if (btnCancelIntake) btnCancelIntake.addEventListener("click", closeIntakeModal);

    if (btnSaveVendor) {
        btnSaveVendor.addEventListener("click", async () => {
            const vName = inputName.value.trim();
            const sDesc = textDesc.value.trim();
            const phi = inputPhi.value.trim();

            if (!vName) {
                showToast("Vendor legal name is required", "warning");
                inputName.focus();
                return;
            }
            if (!sDesc) {
                showToast("Service description is required", "warning");
                textDesc.focus();
                return;
            }
            if (!phi) {
                showToast("PHI data types handled is required", "warning");
                inputPhi.focus();
                return;
            }

            const payload = {
                vendor_name: vName,
                vendor_category: selectCategory.value,
                service_description: sDesc,
                phi_data_types_handled: phi,
                primary_contact_name: inputContactName.value.trim(),
                primary_contact_email: inputContactEmail.value.trim(),
                primary_contact_phone: inputContactPhone.value.trim(),
                vendor_address: inputAddress.value.trim(),
                has_signed_baa: checkSignedBaa.checked ? 1 : 0,
                baa_execution_date: inputExecDate.value || null,
                baa_expiration_date: inputExpDate.value || null,
                last_compliance_audit_date: inputAuditDate.value || null,
                next_review_deadline: inputReviewDate.value || null,
                baa_document_filename: inputDoc.value.trim(),
                subcontractor_handling_phi: checkSub.checked ? 1 : 0,
                soc2_or_hitrust_certified: checkSoc.checked ? 1 : 0,
                breach_notification_sla_hours: parseInt(inputSla.value) || 72,
                notes: textNotes.value.trim()
            };

            const isEdit = Boolean(editIdInput.value);
            btnSaveVendor.disabled = true;
            btnSaveVendor.textContent = "Saving...";

            try {
                let res;
                if (isEdit) {
                    res = await updateVendor(parseInt(editIdInput.value), payload);
                } else {
                    res = await createVendor(payload);
                }

                if (res && res.success) {
                    showToast(isEdit ? "Vendor profile updated successfully" : "Business Associate registered with signed BAA tracking", "success");
                    closeIntakeModal();
                    loadStats();
                    loadVendors();
                } else {
                    showToast(res.message || "Failed to save vendor record", "error");
                }
            } catch (err) {
                showToast("Error saving vendor record", "error");
            } finally {
                btnSaveVendor.disabled = false;
                btnSaveVendor.textContent = "Save Vendor Record";
            }
        });
    }

    // ==========================================
    // DOSSIER & OCR AUDIT PACK MODAL
    // ==========================================
    async function openDossierModal(vendorId) {
        if (!modalDossier) return;
        dossierPrintArea.innerHTML = `<div style="text-align: center; padding: 32px; color: #94a3b8;">Compiling formal BAA compliance dossier...</div>`;
        modalDossier.style.display = "flex";

        try {
            const res = await fetchVendorDossier(vendorId);
            if (!res || !res.data) {
                dossierPrintArea.innerHTML = `<div style="color: #dc2626; text-align: center; padding: 24px;">Failed to compile compliance dossier.</div>`;
                return;
            }

            const d = res.data;
            const v = d.vendor;
            const cert = d.compliance_certification;

            dossierPrintArea.innerHTML = `
                <div style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.6; max-width: 750px; margin: 0 auto;">
                    <!-- Letterhead -->
                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 24px;">
                        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(d.facility_name)}</h2>
                        <div style="font-size: 13px;">${escapeHtml(d.facility_address)}</div>
                        <div style="font-size: 12px; font-weight: bold; margin-top: 4px; color: #333;">Office of the HIPAA Privacy &amp; Information Security Officer</div>
                    </div>

                    <!-- Title & Date -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
                        <div>
                            <h3 style="margin: 0; font-size: 16px; text-transform: uppercase;">Business Associate Compliance Dossier</h3>
                            <div style="font-size: 11px; font-style: italic; color: #444;">${escapeHtml(d.statutory_authority)}</div>
                        </div>
                        <div style="font-size: 12px;"><strong>Report Date:</strong> ${escapeHtml(d.report_date)}</div>
                    </div>

                    <!-- Vendor Profile Table -->
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9; width: 30%;"><strong>Vendor Legal Name:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;"><strong>${escapeHtml(v.vendor_name)}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Vendor Category:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(CATEGORY_LABELS[v.vendor_category] || v.vendor_category)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Services Provided:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(v.service_description)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>PHI Data Handled:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(v.phi_data_types_handled)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Primary Contact:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(v.primary_contact_name || 'N/A')} (${escapeHtml(v.primary_contact_email || 'N/A')}, ${escapeHtml(v.primary_contact_phone || 'N/A')})</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Corporate Address:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(v.vendor_address || 'N/A')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>BAA Execution Date:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${formatDate(v.baa_execution_date)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>BAA Expiration Date:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${v.baa_expiration_date ? formatDate(v.baa_expiration_date) : 'Indefinite / Continuous'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Compliance Status:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: ${v.baa_status === 'active' ? '#15803d' : '#dc2626'};">
                                ${escapeHtml(v.baa_status.toUpperCase().replace('_', ' '))}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Breach Notification SLA:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(v.breach_notification_sla_hours)} Hours Written Notice</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Executed Contract File:</strong></td>
                            <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${escapeHtml(v.baa_document_filename || 'Verified Physical Contract on File')}</td>
                        </tr>
                    </table>

                    <!-- Statutory Warranties (§ 164.504(e)(2)) -->
                    <h4 style="margin: 16px 0 6px 0; text-transform: uppercase; font-size: 13px;">Statutory Terms &amp; Conditions Attestation</h4>
                    <ul style="font-size: 12px; line-height: 1.6; margin-top: 0; padding-left: 20px;">
                        <li><strong>Administrative, Physical &amp; Technical Safeguards (§ 164.504(e)(2)(ii)(B)):</strong> ${escapeHtml(cert.contractual_safeguards)}</li>
                        <li><strong>Subcontractor Warranties (§ 164.504(e)(2)(ii)(D)):</strong> ${escapeHtml(cert.subcontractor_assurances)}</li>
                        <li><strong>Security Incident &amp; Breach Reporting SLA (§ 164.504(e)(2)(ii)(C)):</strong> ${escapeHtml(cert.breach_reporting_mandate)}</li>
                        <li><strong>HHS Secretary Inspection Rights (§ 164.504(e)(2)(ii)(I)):</strong> ${escapeHtml(cert.books_and_records_access)}</li>
                        <li><strong>Termination Rights Upon HIPAA Breach (§ 164.504(e)(2)(iii)):</strong> ${escapeHtml(cert.termination_upon_breach)}</li>
                    </ul>

                    <!-- Certification Block -->
                    <div style="margin-top: 36px; border-top: 1px solid #000; padding-top: 16px; display: flex; justify-content: space-between;">
                        <div>
                            <div>Certified by:</div>
                            <div style="margin-top: 20px; font-weight: bold; border-bottom: 1px dotted #000; display: inline-block; min-width: 200px;">
                                ${escapeHtml(d.investigating_officer)}
                            </div>
                            <div style="font-size: 12px; color: #444;">HIPAA Privacy &amp; Information Security Officer</div>
                            <div style="font-size: 11px; color: #666;">${escapeHtml(d.facility_name)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; font-family: monospace; color: #666;">
                                OCR AUDIT REGISTRY ID: BAA-${v.id}<br>
                                TIMESTAMP: ${new Date().toISOString()}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            dossierPrintArea.innerHTML = `<div style="color: #dc2626; text-align: center; padding: 24px;">Error compiling compliance dossier: ${escapeHtml(err.message)}</div>`;
        }
    }

    if (btnPrintDossier) {
        btnPrintDossier.addEventListener("click", () => {
            window.print();
        });
    }

    function closeDossierModal() {
        if (modalDossier) modalDossier.style.display = "none";
    }

    if (btnCloseDossierModal) btnCloseDossierModal.addEventListener("click", closeDossierModal);
    if (btnCloseDossier) btnCloseDossier.addEventListener("click", closeDossierModal);
}
