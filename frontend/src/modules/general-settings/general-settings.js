import { fetchGeneralSettings, updateGeneralSettings, fetchTimezones, updateTimezone } from "./general-settings.service.js";
import { fetchRoles } from "../role-management/role-management.service.js";
import { showToast } from "../../core/toast.js";
import { setSystemTimezone, systemParts } from "../../core/timezone.js";

let currentSettings = null;
let rolesCatalog = [];
let timezoneGroups = null;
let clockTimer = null;

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
    setSystemTimezone(currentSettings.timezone);

    renderSettings(currentSettings);
    renderTimezone(currentSettings);
    setupEditGeneralSettingsModal();
    setupEditTimezoneModal();
}

/**
 * Show the system timezone and a live clock in it -- the time the whole
 * app now uses for "today" and "now", whatever this computer is set to.
 */
function renderTimezone(settings)
{
    document.getElementById("ro_tz_name").textContent = settings.timezone || "-";

    const offsetEl = document.getElementById("ro_tz_offset");
    offsetEl.textContent = settings.timezone_offset ? `UTC${settings.timezone_offset}` : "";
    offsetEl.hidden = !settings.timezone_offset;

    const clockEl = document.getElementById("ro_tz_clock");

    clearInterval(clockTimer);

    const tick = () => {
        if (!document.body.contains(clockEl)) {
            clearInterval(clockTimer);
            return;
        }

        const p = systemParts();

        clockEl.textContent = new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second).toLocaleString(undefined, {
            weekday: "short", year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
    };

    tick();
    clockTimer = setInterval(tick, 1000);
}

function setupEditTimezoneModal()
{
    const modalOverlay = document.getElementById("editTimezoneModalOverlay");
    const form = document.getElementById("editTimezoneForm");
    const select = document.getElementById("tz_select");
    const search = document.getElementById("tz_search");
    const browserHint = document.getElementById("tzBrowserHint");
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const normalize = (text) => text.toLowerCase().replace(/[\s_/()]+/g, "");

    // Keeps the chosen zone selected while the list is being filtered.
    let chosen = "";

    const renderOptions = () => {
        const term = normalize(search.value);

        select.innerHTML = Object.entries(timezoneGroups || {}).map(([region, zones]) => {
            const matches = zones.filter((zone) => !term || normalize(zone.label).includes(term));

            return matches.length
                ? `<optgroup label="${escapeHtml(region)}">${matches.map((zone) => `
                    <option value="${escapeHtml(zone.name)}">${escapeHtml(zone.label)}</option>
                `).join("")}</optgroup>`
                : "";
        }).join("");

        select.value = chosen;
        select.selectedOptions[0]?.scrollIntoView({ block: "nearest" });
    };

    const showBrowserHint = () => {
        const differs = browserZone && browserZone !== chosen;
        browserHint.hidden = !differs;
        browserHint.innerHTML = differs
            ? `This computer is set to <strong>${escapeHtml(browserZone)}</strong>. <button type="button" id="tzUseBrowser">Use it</button>`
            : "";
    };

    search.addEventListener("input", renderOptions);

    select.addEventListener("change", () => {
        chosen = select.value;
        showBrowserHint();
    });

    browserHint.addEventListener("click", (event) => {
        if (event.target.id !== "tzUseBrowser") return;
        chosen = browserZone;
        search.value = "";
        renderOptions();
        showBrowserHint();
    });

    const openModal = async () => {
        document.getElementById("gsTimezoneAlert").innerHTML = "";
        document.getElementById("err-timezone").textContent = "";
        document.getElementById("editTimezoneFormAlert").innerHTML = "";

        if (!timezoneGroups) {
            const result = await fetchTimezones();

            if (!result.success) {
                showAlert("gsTimezoneAlert", result.message || "Failed to load the list of timezones.", "error");
                return;
            }

            timezoneGroups = result.data;
        }

        chosen = currentSettings.timezone || "";
        search.value = "";

        modalOverlay.classList.add("open");
        renderOptions();
        showBrowserHint();
        search.focus();
    };

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("openEditTimezoneModal").addEventListener("click", openModal);
    document.getElementById("closeEditTimezoneModal").addEventListener("click", closeModal);
    document.getElementById("cancelEditTimezone").addEventListener("click", closeModal);

    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-timezone").textContent = "";

        if (!chosen) {
            document.getElementById("err-timezone").textContent = "Choose a timezone from the list.";
            return;
        }

        const result = await updateTimezone(chosen);

        if (!result.success) {
            showAlert("editTimezoneFormAlert", result.message || "Failed to update the system timezone.", "error");

            if (result.errors?.timezone) {
                document.getElementById("err-timezone").textContent = result.errors.timezone;
            }

            return;
        }

        currentSettings = result.data;
        setSystemTimezone(currentSettings.timezone);
        renderTimezone(currentSettings);
        closeModal();
        showToast("System timezone updated. Other computers pick it up the next time they open or reload the system.", "success");
    });
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
