import { fetchBusinessSettings, updateBusinessSettings, uploadBusinessLogo, removeBusinessLogo } from "./business-settings.service.js";
import { BusinessInfoSectionView, PlaceholderSectionView } from "./business-settings.view.js";
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

let currentSettings = null;

const SECTIONS = {
    general: {
        render: BusinessInfoSectionView,
        init: initBusinessInfoSection
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
        render: () => PlaceholderSectionView("HL7 Viewer", "This system doesn't currently receive HL7 messages, so there's nothing to view yet."),
        init: () => {}
    }
};

export async function initBusinessSettings()
{
    const sidebar = document.getElementById("psSidebar");

    sidebar.querySelectorAll(".ps-nav-link").forEach((link) => {
        link.addEventListener("click", () => selectSection(link.dataset.section));
    });

    await selectSection("general");
}

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
