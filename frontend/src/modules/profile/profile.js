import { fetchProfile, updateProfile, changePassword, uploadAvatar, removeAvatar } from "./profile.service.js";
import { getUser, saveUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { renderAvatar } from "../../core/avatar.js";

const EMPLOYEE_FIELDS = ["first_name", "middle_name", "last_name", "suffix", "email", "phone"];

const PATIENT_FIELDS = [
    "first_name", "middle_name", "last_name", "suffix",
    "contact_email", "mobile_phone", "home_phone", "work_phone",
    "address_line", "city", "province", "zip_code"
];

let currentProfile = null;

export async function initProfile()
{
    enablePasswordToggles();

    const result = await fetchProfile();

    if (!result.success) {
        showAlert("formAlert", result.message || "Failed to load profile.", "error");
        return;
    }

    currentProfile = result.data;

    renderProfile(currentProfile);
    setupEditProfileModal();
    setupChangePasswordModal();
    setupAvatarMenu();
}

function renderProfile(profile)
{
    const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

    document.getElementById("profileHeaderName").textContent = displayName || profile.username || "My Profile";
    document.getElementById("profileHeaderSub").textContent =
        `${capitalize(profile.role || "")}${profile.username ? " · @" + profile.username : ""}`;

    renderAvatar(document.getElementById("profileAvatarDisplay"), profile);
    document.getElementById("removeAvatarBtn").style.display = profile.avatar ? "" : "none";

    document.getElementById("ro_username").textContent = profile.username || "-";
    document.getElementById("ro_role").textContent = capitalize(profile.role || "-");
    document.getElementById("ro_first_name").textContent = profile.first_name || "-";
    document.getElementById("ro_middle_name").textContent = profile.middle_name || "-";
    document.getElementById("ro_last_name").textContent = profile.last_name || "-";
    document.getElementById("ro_suffix").textContent = profile.suffix || "-";

    if (profile.kind === "employee") {
        document.querySelectorAll(".profile-employee-field").forEach((el) => el.style.display = "");

        document.getElementById("ro_no_group").style.display = "";
        document.getElementById("ro_no_label").textContent = "Employee No.";
        document.getElementById("ro_no").textContent = profile.employee_no || "-";

        document.getElementById("ro_email").textContent = profile.email || "-";
        document.getElementById("ro_phone").textContent = profile.phone || "-";

        if (profile.department_name) {
            document.getElementById("ro_department_group").style.display = "";
            document.getElementById("ro_department").textContent = profile.department_name;
        }
    } else if (profile.kind === "patient") {
        document.querySelectorAll(".profile-patient-field").forEach((el) => el.style.display = "");

        document.getElementById("ro_no_group").style.display = "";
        document.getElementById("ro_no_label").textContent = "Patient No.";
        document.getElementById("ro_no").textContent = profile.patient_no || "-";

        document.getElementById("ro_contact_email").textContent = profile.contact_email || "-";
        document.getElementById("ro_mobile_phone").textContent = profile.mobile_phone || "-";
        document.getElementById("ro_home_phone").textContent = profile.home_phone || "-";
        document.getElementById("ro_work_phone").textContent = profile.work_phone || "-";
        document.getElementById("ro_address_line").textContent = profile.address_line || "-";
        document.getElementById("ro_city").textContent = profile.city || "-";
        document.getElementById("ro_province").textContent = profile.province || "-";
        document.getElementById("ro_zip_code").textContent = profile.zip_code || "-";
    }
}

function setupEditProfileModal()
{
    const fields = currentProfile.kind === "patient" ? PATIENT_FIELDS : EMPLOYEE_FIELDS;

    const modalOverlay = document.getElementById("editProfileModalOverlay");
    const form = document.getElementById("editProfileForm");

    const openModal = () => {
        clearFieldErrors(fields, "edit_");
        document.getElementById("editProfileFormAlert").innerHTML = "";

        fields.forEach((field) => {
            const input = document.getElementById(`edit_${field}`);

            if (input) {
                input.value = currentProfile[field] || "";
            }
        });

        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("openEditProfileModal").addEventListener("click", openModal);
    document.getElementById("closeEditProfileModal").addEventListener("click", closeModal);
    document.getElementById("cancelEditProfile").addEventListener("click", closeModal);

    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearFieldErrors(fields, "edit_");

        const data = {};

        fields.forEach((field) => {
            data[field] = document.getElementById(`edit_${field}`).value.trim();
        });

        const result = await updateProfile(data);

        if (!result.success) {
            showAlert("editProfileFormAlert", result.message || "Failed to update profile.", "error");

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

        currentProfile = { ...currentProfile, ...data };
        renderProfile(currentProfile);

        const user = getUser();

        if (user) {
            saveUser({ ...user, ...result.data.user });
        }

        const profileName = document.getElementById("profileName");

        if (profileName) {
            profileName.textContent = `${result.data.user.first_name} ${result.data.user.last_name}`;
        }

        closeModal();
        showToast("Profile updated successfully.", "success");
    });
}

function setupChangePasswordModal()
{
    const modalOverlay = document.getElementById("changePasswordModalOverlay");
    const form = document.getElementById("passwordForm");

    const openModal = () => {
        form.reset();
        clearFieldErrors(["current_password", "new_password", "confirm_password"], "");
        document.getElementById("passwordFormAlert").innerHTML = "";
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
    };

    document.getElementById("openChangePasswordModal").addEventListener("click", openModal);
    document.getElementById("closeChangePasswordModal").addEventListener("click", closeModal);
    document.getElementById("cancelChangePassword").addEventListener("click", closeModal);

    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearFieldErrors(["current_password", "new_password", "confirm_password"], "");

        const currentPassword = document.getElementById("current_password").value;
        const newPassword = document.getElementById("new_password").value;
        const confirmPassword = document.getElementById("confirm_password").value;

        if (newPassword !== confirmPassword) {
            document.getElementById("err-confirm_password").textContent = "Passwords do not match.";
            return;
        }

        const result = await changePassword({
            current_password: currentPassword,
            new_password: newPassword
        });

        if (!result.success) {
            showAlert("passwordFormAlert", result.message || "Failed to change password.", "error");
            return;
        }

        closeModal();
        showToast("Password changed successfully.", "success");
    });
}

function setupAvatarMenu()
{
    const menuWrap = document.getElementById("avatarMenuWrap");
    const trigger = document.getElementById("avatarMenuTrigger");
    const chooseBtn = document.getElementById("chooseAvatarBtn");
    const removeBtn = document.getElementById("removeAvatarBtn");
    const input = document.getElementById("avatarFileInput");

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

        const result = await removeAvatar();

        if (!result.success) {
            showToast(result.message || "Failed to remove photo.", "error");
            return;
        }

        applyAvatarUpdate(result.data.user.avatar);
        showToast("Profile photo removed successfully.", "success");
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

        const result = await uploadAvatar(file);

        input.value = "";

        if (!result.success) {
            showToast(result.message || "Failed to update photo.", "error");
            return;
        }

        applyAvatarUpdate(result.data.user.avatar);
        showToast("Profile photo updated successfully.", "success");
    });
}

function applyAvatarUpdate(avatar)
{
    currentProfile = { ...currentProfile, avatar };

    renderAvatar(document.getElementById("profileAvatarDisplay"), currentProfile);
    renderAvatar(document.getElementById("avatarLetter"), currentProfile);
    document.getElementById("removeAvatarBtn").style.display = avatar ? "" : "none";

    const user = getUser();

    if (user) {
        saveUser({ ...user, avatar });
    }
}

function capitalize(text)
{
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function clearFieldErrors(fields, prefix)
{
    fields.forEach((field) => {
        const errorEl = document.getElementById(`err-${prefix}${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}
