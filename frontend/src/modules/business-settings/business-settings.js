import { fetchBusinessSettings, updateBusinessSettings, uploadBusinessLogo, removeBusinessLogo } from "./business-settings.service.js";
import { API_URL } from "../../core/api.js";
import { clearBrandingCache, applyBranding } from "../../core/branding.js";
import { showToast } from "../../core/toast.js";

let currentSettings = null;

export async function initBusinessSettings()
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
