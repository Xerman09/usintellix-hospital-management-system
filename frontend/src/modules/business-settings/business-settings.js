import { fetchBusinessSettings, updateBusinessSettings, uploadBusinessLogo, removeBusinessLogo } from "./business-settings.service.js";
import { BusinessInfoSectionView, HipaaOfficersSectionView } from "./business-settings.view.js";
import { 
    fetchHipaaOfficers, 
    fetchHipaaOfficerStats, 
    updateHipaaOfficer, 
    fetchAppointmentAttestation, 
    getHipaaOfficersExportCsvUrl 
} from "./hipaa-officers.service.js";
import { API_URL } from "../../core/api.js?v=5";
import { clearBrandingCache, applyBranding } from "../../core/branding.js";
import { showToast } from "../../core/toast.js";
import { PharmaciesView } from "../pharmacies/pharmacies.view.js";
import { initPharmacies } from "../pharmacies/pharmacies.js";
import { InsurancesView } from "../insurances/insurances.view.js";
import { initInsurances } from "../insurances/insurances.js";
import { X12PartnersView } from "../x12-partners/x12-partners.view.js";
import { initX12Partners } from "../x12-partners/x12-partners.js";
import { ProviderInsuranceNumbersView } from "../provider-insurance-numbers/provider-insurance-numbers.view.js";
import { initProviderInsuranceNumbers } from "../provider-insurance-numbers/provider-insurance-numbers.js";
import { DocumentCategoriesView } from "../document-categories/document-categories.view.js";
import { initDocumentCategories } from "../document-categories/document-categories.js";
import { Hl7ViewerView } from "../hl7-viewer/hl7-viewer.view.js";
import { initHl7Viewer } from "../hl7-viewer/hl7-viewer.js";

let currentSettings = null;

const SECTIONS = {
    general: {
        render: BusinessInfoSectionView,
        init: initBusinessInfoSection
    },
    hipaa_officers: {
        render: HipaaOfficersSectionView,
        init: initHipaaOfficersSection
    },
    pharmacies: {
        render: PharmaciesView,
        init: initPharmacies
    },
    insurance_companies: {
        render: InsurancesView,
        init: initInsurances
    },
    insurance_numbers: {
        render: ProviderInsuranceNumbersView,
        init: initProviderInsuranceNumbers
    },
    x12_partners: {
        render: X12PartnersView,
        init: initX12Partners
    },
    document_categories: {
        render: DocumentCategoriesView,
        init: initDocumentCategories
    },
    hl7_viewer: {
        render: Hl7ViewerView,
        init: initHl7Viewer
    }
};

export async function initBusinessSettings(initialSection = "general")
{
    const sidebar = document.getElementById("psSidebar");

    sidebar.querySelectorAll(".ps-nav-link").forEach((link) => {
        link.addEventListener("click", () => selectSection(link.dataset.section));
    });

    const targetSection = initialSection && SECTIONS[initialSection] ? initialSection : "general";
    await selectSection(targetSection);
}

export { selectSection as selectBusinessSettingsSection };

async function selectSection(sectionKey)
{
    const sidebar = document.getElementById("psSidebar");
    const content = document.getElementById("psContent");
    const section = SECTIONS[sectionKey];

    if (!section) return;

    sidebar.querySelectorAll(".ps-nav-link").forEach((link) => {
        link.classList.toggle("active", link.dataset.section === sectionKey);
    });

    content.innerHTML = section.render();
    await section.init();
}

async function initBusinessInfoSection()
{
    const result = await fetchBusinessSettings();

    if (!result.success) {
        showAlert("formAlert", result.message || "Failed to load business information.", "error");
        return;
    }

    currentSettings = result.data;

    renderSettings(currentSettings);
    setupEditBusinessModal();
    setupLogoMenu();
}

function renderSettings(settings)
{
    document.getElementById("businessHeaderName").textContent = settings.name || "Business Information";
    document.getElementById("ro_business_name").textContent = settings.name || "-";
    document.getElementById("ro_business_address").textContent = settings.address || "-";
    document.getElementById("ro_business_phone").textContent = settings.phone || "-";
    document.getElementById("ro_business_email").textContent = settings.email || "-";
    document.getElementById("logoPreview").src = settings.logo ? `${API_URL}${settings.logo}` : "./assets/logo.png?v=1";
    document.getElementById("removeLogoBtn").style.display = settings.logo ? "" : "none";
}

function setupEditBusinessModal()
{
    const modalOverlay = document.getElementById("editBusinessModalOverlay");
    const form = document.getElementById("editBusinessForm");

    const openModal = () => {
        document.getElementById("err-edit_name").textContent = "";
        document.getElementById("err-edit_email").textContent = "";
        document.getElementById("editBusinessFormAlert").innerHTML = "";
        document.getElementById("edit_business_name").value = currentSettings.name || "";
        document.getElementById("edit_business_address").value = currentSettings.address || "";
        document.getElementById("edit_business_phone").value = currentSettings.phone || "";
        document.getElementById("edit_business_email").value = currentSettings.email || "";
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("openEditBusinessModal").addEventListener("click", openModal);
    document.getElementById("closeEditBusinessModal").addEventListener("click", closeModal);
    document.getElementById("cancelEditBusiness").addEventListener("click", closeModal);

    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-edit_name").textContent = "";
        document.getElementById("err-edit_email").textContent = "";

        const name = document.getElementById("edit_business_name").value.trim();
        const address = document.getElementById("edit_business_address").value.trim();
        const phone = document.getElementById("edit_business_phone").value.trim();
        const email = document.getElementById("edit_business_email").value.trim();

        const result = await updateBusinessSettings({ name, address, phone, email });

        if (!result.success) {
            showAlert("editBusinessFormAlert", result.message || "Failed to update business information.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-edit_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        applySettingsUpdate(result.data);
        closeModal();
        showToast("Business information updated successfully.", "success");
    });
}

function setupLogoMenu()
{
    const menuWrap = document.getElementById("logoMenuWrap");
    const trigger = document.getElementById("logoMenuTrigger");
    const chooseBtn = document.getElementById("chooseLogoBtn");
    const removeBtn = document.getElementById("removeLogoBtn");
    const input = document.getElementById("logoFileInput");

    const closeMenu = () => menuWrap.classList.remove("open");

    trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        menuWrap.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
        if (!menuWrap.contains(event.target)) {
            closeMenu();
        }
    });

    chooseBtn.addEventListener("click", () => {
        closeMenu();
        input.click();
    });

    removeBtn.addEventListener("click", async () => {
        closeMenu();

        const result = await removeBusinessLogo();

        if (!result.success) {
            showToast(result.message || "Failed to remove logo.", "error");
            return;
        }

        applySettingsUpdate(result.data);
        showToast("Business logo removed successfully.", "success");
    });

    input.addEventListener("change", async () => {
        const file = input.files[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            showToast("Please choose an image file.", "error");
            input.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast("Image must be 2MB or smaller.", "error");
            input.value = "";
            return;
        }

        const result = await uploadBusinessLogo(file);

        input.value = "";

        if (!result.success) {
            showToast(result.message || "Failed to update logo.", "error");
            return;
        }

        applySettingsUpdate(result.data);
        showToast("Business logo updated successfully.", "success");
    });
}

function applySettingsUpdate(settings)
{
    currentSettings = settings;
    renderSettings(settings);

    clearBrandingCache();
    applyBranding(settings);
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}

// =========================================================================
// HIPAA Privacy & Security Officers Section Controller (§ 164.530 / § 164.308)
// =========================================================================
let currentOfficers = null;

async function initHipaaOfficersSection() {
    await loadOfficersData();
    setupHipaaOfficersEvents();
}

async function loadOfficersData() {
    try {
        const [officersRes, statsRes] = await Promise.all([
            fetchHipaaOfficers(),
            fetchHipaaOfficerStats()
        ]);

        if (officersRes && officersRes.success && officersRes.data) {
            currentOfficers = officersRes.data;
            renderOfficersCards(currentOfficers);
        }

        if (statsRes && statsRes.success && statsRes.data) {
            renderOfficersStats(statsRes.data);
        }
    } catch (err) {
        console.error("Failed to load HIPAA officers data:", err);
        showToast("Failed to load HIPAA officer designations.", "error");
    }
}

function renderOfficersStats(stats) {
    const pStatus = document.getElementById("hoStatPrivacyStatus");
    const pTenure = document.getElementById("hoStatPrivacyTenure");
    const sStatus = document.getElementById("hoStatSecurityStatus");
    const sTenure = document.getElementById("hoStatSecurityTenure");
    const audits = document.getElementById("hoStatGovernanceAudits");

    if (pStatus) pStatus.textContent = stats.privacy_officer_active ? "ACTIVE" : "INACTIVE";
    if (pTenure) pTenure.textContent = `${stats.privacy_tenure_days || 0} Days Appointed`;
    if (sStatus) sStatus.textContent = stats.security_officer_active ? "ACTIVE" : "INACTIVE";
    if (sTenure) sTenure.textContent = `${stats.security_tenure_days || 0} Days Appointed`;
    if (audits) audits.textContent = stats.governance_audit_events || 0;
}

function renderOfficersCards(officers) {
    const p = officers.privacy_officer;
    const s = officers.security_officer;

    if (p) {
        setText("cardPrivacyOfficerName", p.full_name);
        setText("cardPrivacyOfficerTitle", p.title);
        setText("cardPrivacyOfficerEmail", p.email);
        setText("cardPrivacyOfficerPhone", p.phone + (p.extension ? ` / Ext. ${p.extension}` : ""));
        setText("cardPrivacyOfficerAddress", p.physical_office_address || "100 Healthcare Boulevard, Suite 500, Medical District, NY 10001");
        setText("cardPrivacyOfficerAppointed", p.appointment_date || "2024-01-15");
        setText("cardPrivacyOfficerAppointedBy", p.appointed_by_name || "Board of Directors / Chief Executive Officer");
        setText("cardPrivacyOfficerScope", p.responsibilities_scope || "--");
    }

    if (s) {
        setText("cardSecurityOfficerName", s.full_name);
        setText("cardSecurityOfficerTitle", s.title);
        setText("cardSecurityOfficerEmail", s.email);
        setText("cardSecurityOfficerPhone", s.phone + (s.extension ? ` / Ext. ${s.extension}` : ""));
        setText("cardSecurityOfficerAddress", s.physical_office_address || "100 Healthcare Boulevard, Suite 500, Medical District, NY 10001");
        setText("cardSecurityOfficerAppointed", s.appointment_date || "2024-01-15");
        setText("cardSecurityOfficerAppointedBy", s.appointed_by_name || "Board of Directors / Chief Executive Officer");
        setText("cardSecurityOfficerScope", s.responsibilities_scope || "--");
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || "--";
}

function setupHipaaOfficersEvents() {
    // CSV export
    const btnCsv = document.getElementById("btnExportHipaaOfficersCsv");
    if (btnCsv) {
        btnCsv.onclick = () => {
            window.open(getHipaaOfficersExportCsvUrl(), "_blank");
        };
    }

    // Edit Privacy Officer
    const btnEditP = document.getElementById("btnEditPrivacyOfficer");
    if (btnEditP) {
        btnEditP.onclick = () => openEditOfficerModal("privacy_officer");
    }

    // Edit Security Officer
    const btnEditS = document.getElementById("btnEditSecurityOfficer");
    if (btnEditS) {
        btnEditS.onclick = () => openEditOfficerModal("security_officer");
    }

    // Print Privacy Attestation
    const btnPrintP = document.getElementById("btnPrintPrivacyAttestation");
    if (btnPrintP) {
        btnPrintP.onclick = () => printOfficerAttestation("privacy_officer");
    }

    // Print Security Attestation
    const btnPrintS = document.getElementById("btnPrintSecurityAttestation");
    if (btnPrintS) {
        btnPrintS.onclick = () => printOfficerAttestation("security_officer");
    }

    // Modal close & cancel
    const btnCloseModal = document.getElementById("btnCloseEditOfficerModal");
    const btnCancelModal = document.getElementById("btnCancelEditOfficer");
    if (btnCloseModal) btnCloseModal.onclick = closeEditOfficerModal;
    if (btnCancelModal) btnCancelModal.onclick = closeEditOfficerModal;

    // Form submit
    const form = document.getElementById("formEditHipaaOfficer");
    if (form) {
        form.onsubmit = handleSaveOfficerDesignation;
    }
}

function openEditOfficerModal(type) {
    const modal = document.getElementById("modalEditHipaaOfficer");
    if (!modal || !currentOfficers) return;

    const officer = currentOfficers[type];
    if (!officer) return;

    const titleEl = document.getElementById("modalEditOfficerTitle");
    if (titleEl) {
        titleEl.textContent = type === "privacy_officer" 
            ? "Edit HIPAA Privacy Official Designation (45 CFR § 164.530(a))" 
            : "Edit HIPAA Security Official Designation (45 CFR § 164.308(a)(2))";
    }

    document.getElementById("editOfficerType").value = type;
    document.getElementById("editOfficerFullName").value = officer.full_name || "";
    document.getElementById("editOfficerTitle").value = officer.title || "";
    document.getElementById("editOfficerEmail").value = officer.email || "";
    document.getElementById("editOfficerPhone").value = officer.phone || "";
    document.getElementById("editOfficerExtension").value = officer.extension || "";
    document.getElementById("editOfficerAppointmentDate").value = officer.appointment_date || "";
    document.getElementById("editOfficerAddress").value = officer.physical_office_address || "";
    document.getElementById("editOfficerAppointedBy").value = officer.appointed_by_name || "";
    document.getElementById("editOfficerScope").value = officer.responsibilities_scope || "";
    document.getElementById("editOfficerNotes").value = officer.notes || "";
    document.getElementById("editOfficerActive").value = officer.is_active ? "1" : "0";

    const alertEl = document.getElementById("alertEditOfficer");
    if (alertEl) alertEl.style.display = "none";

    modal.classList.add("open");
}

function closeEditOfficerModal() {
    const modal = document.getElementById("modalEditHipaaOfficer");
    if (modal) modal.classList.remove("open");
}

async function handleSaveOfficerDesignation(e) {
    e.preventDefault();

    const type = document.getElementById("editOfficerType").value;
    const fullName = document.getElementById("editOfficerFullName").value.trim();
    const title = document.getElementById("editOfficerTitle").value.trim();
    const email = document.getElementById("editOfficerEmail").value.trim();
    const phone = document.getElementById("editOfficerPhone").value.trim();
    const extension = document.getElementById("editOfficerExtension").value.trim();
    const appointmentDate = document.getElementById("editOfficerAppointmentDate").value;
    const address = document.getElementById("editOfficerAddress").value.trim();
    const appointedBy = document.getElementById("editOfficerAppointedBy").value.trim();
    const scope = document.getElementById("editOfficerScope").value.trim();
    const notes = document.getElementById("editOfficerNotes").value.trim();
    const isActive = document.getElementById("editOfficerActive").value === "1";

    const alertEl = document.getElementById("alertEditOfficer");
    const saveBtn = document.getElementById("btnSaveOfficerDesignation");

    if (!fullName || !title || !email || !phone || !appointmentDate) {
        if (alertEl) {
            alertEl.style.display = "block";
            alertEl.style.background = "#fef2f2";
            alertEl.style.color = "#991b1b";
            alertEl.style.border = "1px solid #fecaca";
            alertEl.textContent = "Please fill in all required fields (Name, Title, Email, Phone, Appointment Date).";
        }
        return;
    }

    const payload = {
        full_name: fullName,
        title: title,
        email: email,
        phone: phone,
        extension: extension || null,
        appointment_date: appointmentDate,
        physical_office_address: address || null,
        appointed_by_name: appointedBy || null,
        responsibilities_scope: scope || null,
        notes: notes || null,
        is_active: isActive
    };

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving Designation...";
    }

    try {
        const res = await updateHipaaOfficer(type, payload);
        if (res && res.success) {
            showToast("HIPAA Officer Designation updated successfully. Changes dynamically propagated.", "success");
            closeEditOfficerModal();
            await loadOfficersData();
        } else {
            if (alertEl) {
                alertEl.style.display = "block";
                alertEl.style.background = "#fef2f2";
                alertEl.style.color = "#991b1b";
                alertEl.style.border = "1px solid #fecaca";
                alertEl.textContent = res.message || "Failed to update officer designation.";
            }
        }
    } catch (err) {
        console.error("Save officer designation error:", err);
        if (alertEl) {
            alertEl.style.display = "block";
            alertEl.style.background = "#fef2f2";
            alertEl.style.color = "#991b1b";
            alertEl.style.border = "1px solid #fecaca";
            alertEl.textContent = "Network error while saving officer designation.";
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Official Designation";
        }
    }
}

async function printOfficerAttestation(type) {
    try {
        const res = await fetchAppointmentAttestation(type);
        if (!res || !res.success || !res.data) {
            showToast("Failed to compile appointment attestation certificate.", "error");
            return;
        }

        const data = res.data;
        const printWindow = window.open("", "_blank", "width=850,height=950");
        if (!printWindow) {
            showToast("Pop-up blocked. Please allow pop-ups to print the appointment attestation.", "error");
            return;
        }

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${data.statutory_role} Appointment Attestation</title>
    <style>
        @page { size: letter portrait; margin: 18mm 20mm; }
        body {
            font-family: 'Times New Roman', Times, serif;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            background: #ffffff;
            line-height: 1.5;
        }
        .cert-border {
            border: 4px double #0f172a;
            padding: 30px;
            position: relative;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .org-name {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .doc-title {
            font-size: 18px;
            font-weight: 700;
            margin: 12px 0 4px;
            color: #0369a1;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .citation {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            font-style: italic;
        }
        .officer-block {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 16px 20px;
            margin: 20px 0;
            font-size: 14px;
        }
        .officer-name {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
        }
        .officer-title {
            font-size: 15px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 12px;
        }
        .field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
            font-size: 13px;
        }
        .statement-text {
            font-size: 14px;
            text-align: justify;
            margin: 20px 0;
            line-height: 1.6;
        }
        .scope-text {
            font-size: 12.5px;
            background: #ffffff;
            border-left: 3px solid #0284c7;
            padding: 10px 14px;
            margin: 16px 0;
            font-style: italic;
            color: #334155;
        }
        .sig-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 45px;
            padding-top: 20px;
            border-top: 1px solid #94a3b8;
        }
        .sig-line {
            border-bottom: 1px solid #0f172a;
            margin-bottom: 6px;
            height: 35px;
        }
        .sig-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .sig-sub {
            font-size: 11px;
            color: #64748b;
        }
        .seal-stamp {
            text-align: right;
            margin-top: 20px;
            font-size: 10px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="cert-border">
        <div class="header">
            <div class="org-name">${data.covered_entity}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                ${data.facility_address} &bull; Telephone: ${data.facility_phone}
            </div>
            <div class="doc-title">Official Statutory Officer Designation Certificate</div>
            <div class="citation">Issued Pursuant to Federal Mandate: ${data.statutory_citation}</div>
        </div>

        <p class="statement-text">
            <strong>BE IT KNOWN TO ALL REGULATORY BODIES AND AUTHORIZED PARTIES:</strong> 
            Pursuant to the Administrative Simplification provisions of the Health Insurance Portability and Accountability Act of 1996 (HIPAA) and the Health Information Technology for Economic and Clinical Health (HITECH) Act, the governing authority of <strong>${data.covered_entity}</strong> has formally appointed and designated the following executive to serve as the official <strong>${data.statutory_role}</strong>:
        </p>

        <div class="officer-block">
            <div class="officer-name">${data.full_name}</div>
            <div class="officer-title">${data.title}</div>
            <div class="field-grid">
                <div><strong>Direct Telephone:</strong> ${data.phone} ${data.extension ? `(Ext. ${data.extension})` : ""}</div>
                <div><strong>Official Email:</strong> ${data.email}</div>
                <div><strong>Office Location:</strong> ${data.office_address || "Corporate Compliance Office"}</div>
                <div><strong>Appointment Effective Date:</strong> ${data.appointment_date}</div>
                <div><strong>Appointed By:</strong> ${data.appointed_by}</div>
                <div><strong>Designation Status:</strong> ${data.is_active ? "Active &amp; In Good Standing" : "Archived Designation"}</div>
            </div>
        </div>

        <p class="statement-text">
            ${data.certification_statement}
        </p>

        <div class="scope-text">
            <strong>Statutory Scope of Responsibilities:</strong><br>
            ${data.responsibilities || "--"}
        </div>

        <div style="font-size: 11px; color: #64748b; margin-top: 14px;">
            <strong>Statutory Retention Mandate:</strong> ${data.retention_mandate}. This instrument constitutes prima facie documentation of compliance for inspection by the U.S. Department of Health and Human Services (HHS), Office for Civil Rights (OCR), and the Centers for Medicare &amp; Medicaid Services (CMS).
        </div>

        <div class="sig-grid">
            <div>
                <div class="sig-line"></div>
                <div class="sig-title">Appointing Executive / Governing Board</div>
                <div class="sig-sub">${data.appointed_by} &bull; ${data.covered_entity}</div>
                <div class="sig-sub">Date of Attestation: ${data.attestation_date}</div>
            </div>
            <div>
                <div class="sig-line"></div>
                <div class="sig-title">Designated HIPAA Officer Acknowledgment</div>
                <div class="sig-sub">${data.full_name} &bull; ${data.title}</div>
                <div class="sig-sub">Oath of Statutory Stewardship &bull; Effective ${data.appointment_date}</div>
            </div>
        </div>

        <div class="seal-stamp">
            OFFICIAL COMPLIANCE RECORD &bull; DOCUMENT CONTROL ID: HIPAA-OFFICER-${data.officer_type.toUpperCase()}-${Date.now().toString(36).toUpperCase()}
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
    } catch (err) {
        console.error("Print attestation error:", err);
        showToast("Failed to print appointment attestation certificate.", "error");
    }
}
