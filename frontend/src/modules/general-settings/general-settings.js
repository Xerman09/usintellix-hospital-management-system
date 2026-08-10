import { fetchGeneralSettings, updateGeneralSettings } from "./general-settings.service.js";
import { fetchRoles } from "../role-management/role-management.service.js";
import { showToast } from "../../core/toast.js";

let currentSettings = null;
let rolesCatalog = [];

export async function initGeneralSettings()
{
    // Sequential, not Promise.all -- both calls need the PHP session, and
    // firing them concurrently can contend for the session file lock and
    // drop one of the two responses under load.
    const settingsResult = await fetchGeneralSettings();

    if (!settingsResult.success) {
        showAlert("gsFormAlert", settingsResult.message || "Failed to load general settings.", "error");
        return;
    }

    const rolesResult = await fetchRoles();

    rolesCatalog = rolesResult.success ? rolesResult.data : [];

    if (!rolesResult.success) {
        showAlert("gsFormAlert", rolesResult.message || "Failed to load roles -- \"Applies To\" will be empty until this succeeds.", "error");
    }

    currentSettings = settingsResult.data;

    renderSettings(currentSettings);
    setupEditGeneralSettingsModal();
}

function renderSettings(settings)
{
    const enabled = !!settings.two_factor_enabled;
    const statusEl = document.getElementById("ro_tfa_status");

    statusEl.textContent = enabled ? "Enabled" : "Disabled";
    statusEl.classList.toggle("on", enabled);
    statusEl.classList.toggle("off", !enabled);

    document.getElementById("ro_tfa_method").textContent = enabled
        ? (settings.two_factor_method === "email" ? "Email" : "SMS")
        : "-";

    const rolesEl = document.getElementById("ro_tfa_roles");
    const roleIds = settings.two_factor_role_ids || [];
    const roleNames = rolesCatalog.filter((r) => roleIds.includes(r.id)).map((r) => r.name);

    rolesEl.innerHTML = (enabled && roleNames.length)
        ? roleNames.map((name) => `<span class="gs-role-chip">${escapeHtml(name)}</span>`).join("")
        : "<p>-</p>";
}

function setupEditGeneralSettingsModal()
{
    const modalOverlay = document.getElementById("editGeneralSettingsModalOverlay");
    const form = document.getElementById("editGeneralSettingsForm");
    const detailSection = document.getElementById("tfaDetailSection");
    const roleChecklist = document.getElementById("tfaRoleChecklist");

    roleChecklist.innerHTML = rolesCatalog.length
        ? rolesCatalog.map((role) => `
            <label><input type="checkbox" class="tfa-role-checkbox" value="${role.id}"> ${escapeHtml(role.name)}</label>
        `).join("")
        : `<p style="color:#888; font-style:italic;">No roles could be loaded. Close this and reopen the page to retry.</p>`;

    const toggleDetail = () => {
        detailSection.classList.toggle("open", document.getElementById("tfa_enabled_yes").checked);
    };

    document.getElementById("tfa_enabled_yes").addEventListener("change", toggleDetail);
    document.getElementById("tfa_enabled_no").addEventListener("change", toggleDetail);

    const openModal = () => {
        document.getElementById("err-tfa_method").textContent = "";
        document.getElementById("err-tfa_role_ids").textContent = "";
        document.getElementById("editGeneralSettingsFormAlert").innerHTML = "";

        const enabled = !!currentSettings.two_factor_enabled;

        document.getElementById("tfa_enabled_yes").checked = enabled;
        document.getElementById("tfa_enabled_no").checked = !enabled;

        document.getElementById("tfa_method_sms").checked = currentSettings.two_factor_method !== "email";
        document.getElementById("tfa_method_email").checked = currentSettings.two_factor_method === "email";

        const roleIds = (currentSettings.two_factor_role_ids || []).map(String);

        roleChecklist.querySelectorAll(".tfa-role-checkbox").forEach((cb) => {
            cb.checked = roleIds.includes(cb.value);
        });

        toggleDetail();

        modalOverlay.classList.add("open");
    };

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("openEditGeneralSettingsModal").addEventListener("click", openModal);
    document.getElementById("closeEditGeneralSettingsModal").addEventListener("click", closeModal);
    document.getElementById("cancelEditGeneralSettings").addEventListener("click", closeModal);

    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-tfa_method").textContent = "";
        document.getElementById("err-tfa_role_ids").textContent = "";

        const enabled = document.getElementById("tfa_enabled_yes").checked;
        const method = document.getElementById("tfa_method_email").checked ? "email" : "sms";
        const roleIds = Array.from(roleChecklist.querySelectorAll(".tfa-role-checkbox:checked")).map((cb) => cb.value);

        const result = await updateGeneralSettings({
            two_factor_enabled: enabled,
            two_factor_method: enabled ? method : "",
            role_ids: enabled ? roleIds : []
        });

        if (!result.success) {
            showAlert("editGeneralSettingsFormAlert", result.message || "Failed to update general settings.", "error");

            if (result.errors) {
                if (result.errors.two_factor_method) {
                    document.getElementById("err-tfa_method").textContent = result.errors.two_factor_method;
                }
                if (result.errors.role_ids) {
                    document.getElementById("err-tfa_role_ids").textContent = result.errors.role_ids;
                }
            }

            return;
        }

        currentSettings = result.data;
        renderSettings(currentSettings);
        closeModal();
        showToast("General settings updated successfully.", "success");
    });
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}
