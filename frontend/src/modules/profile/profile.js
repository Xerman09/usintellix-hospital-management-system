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
    
    // Who
    document.getElementById("oemr_name").textContent = displayName || profile.username || "Phil Belford";
    document.getElementById("oemr_external_id").textContent = profile.patient_no || profile.employee_no || "1";
    document.getElementById("oemr_dob").textContent = "1972-02-09";
    document.getElementById("oemr_birth_sex").textContent = "Male";
    document.getElementById("oemr_ss").textContent = "333222333";
    document.getElementById("oemr_marital_status").textContent = "Single";
    document.getElementById("oemr_sex").textContent = "Male";

    // Contact
    document.getElementById("oemr_address").textContent = profile.address_line || "6666 String Street";
    document.getElementById("oemr_city").textContent = profile.city || "Longview";
    document.getElementById("oemr_state").textContent = profile.province || "Florida";
    document.getElementById("oemr_postal_code").textContent = profile.zip_code || "44433";
    document.getElementById("oemr_country").textContent = "USA";
    document.getElementById("oemr_mothers_name").textContent = "Gardner";
    document.getElementById("oemr_emergency_contact").textContent = "Wilma";
    document.getElementById("oemr_emergency_phone").textContent = "222-333-4444";
    document.getElementById("oemr_home_phone").textContent = profile.home_phone || "333-444-2222";
    document.getElementById("oemr_work_phone").textContent = profile.work_phone || "555-444-3333";
    document.getElementById("oemr_mobile_phone").textContent = profile.mobile_phone || "222-444-2222";
    document.getElementById("oemr_contact_email").textContent = profile.contact_email || profile.email || "heya@invalid.email.com";

    // Choices
    document.getElementById("oemr_provider").textContent = "Charlie Sullivan";
    document.getElementById("oemr_pharmacy").textContent = "";
    document.getElementById("oemr_hipaa").textContent = "YES";
    document.getElementById("oemr_allow_voice").textContent = "YES";
    document.getElementById("oemr_leave_message").textContent = "Phil";
    document.getElementById("oemr_allow_mail").textContent = "YES";
    document.getElementById("oemr_allow_sms").textContent = "YES";
    document.getElementById("oemr_allow_email").textContent = "YES";
    document.getElementById("oemr_allow_immun_reg").textContent = "YES";
    document.getElementById("oemr_allow_immun_share").textContent = "YES";
    document.getElementById("oemr_allow_health_exchange").textContent = "YES";
    document.getElementById("oemr_allow_patient_portal").textContent = "YES";

    // Employer
    document.getElementById("oemr_occupation").textContent = "Pen User";

    // Stats
    document.getElementById("oemr_language").textContent = "English";

    // Insurance 1
    document.getElementById("oemr_ins1_provider").textContent = "Aekna";
    document.getElementById("oemr_ins1_plan").textContent = "Bad Plan";
    document.getElementById("oemr_ins1_policy").textContent = "555";
    document.getElementById("oemr_ins1_group").textContent = "444";
    document.getElementById("oemr_ins1_sub_first").textContent = "Phil";
    document.getElementById("oemr_ins1_sub_last").textContent = "Belford";
    document.getElementById("oemr_ins1_sub_rel").textContent = "self";
    document.getElementById("oemr_ins1_sub_ss").textContent = "333222333";
    document.getElementById("oemr_ins1_sub_dob").textContent = "1972-02-09";
    document.getElementById("oemr_ins1_sub_phone").textContent = "333-444-2222";
    document.getElementById("oemr_ins1_sub_address").textContent = "6666 String Street";
    document.getElementById("oemr_ins1_sub_zip").textContent = "44433";
    document.getElementById("oemr_ins1_sub_city").textContent = "Longview";
    document.getElementById("oemr_ins1_sub_state").textContent = "FL";
    document.getElementById("oemr_ins1_sub_country").textContent = "USA";
    document.getElementById("oemr_ins1_sub_emp").textContent = "Using Pens Inc.";
    document.getElementById("oemr_ins1_sub_emp_street").textContent = "23344 Watchahee Road";
    document.getElementById("oemr_ins1_sub_emp_city").textContent = "Longview";
    document.getElementById("oemr_ins1_sub_emp_zip").textContent = "44433";
    document.getElementById("oemr_ins1_sub_emp_state").textContent = "FL";
    document.getElementById("oemr_ins1_sub_emp_country").textContent = "USA";
}

function setupEditProfileModal()
{
    const modalOverlay = document.getElementById("editProfileModalOverlay");
    const form = document.getElementById("editProfileForm");
    
    // We mock the new fields that may not exist in currentProfile yet
    const ALL_FIELDS = [
        "first_name", "middle_name", "last_name", "dob", "gender", "marital_status",
        "address_line", "city", "province", "zip_code", "county", "country",
        "home_phone", "work_phone", "mobile_phone", "notify_phone", "notify_rel",
        "contact_email", "email_direct", "language", "family_size", "mothers_name", 
        "guardians_name", "hipaa_message"
    ];

    const loadPendingEdits = () => {
        let pendingEdits = {};
        try {
            pendingEdits = JSON.parse(localStorage.getItem("pending_profile_edits") || "{}");
        } catch (e) { }

        ALL_FIELDS.forEach((field) => {
            const input = document.getElementById(`edit_${field}`);
            const pendingNote = document.getElementById(`pending_${field}`);
            
            if (input) {
                // Determine original value
                let origVal = "";
                if (field === "dob") origVal = "1972-02-09";
                else if (field === "gender") origVal = "Male";
                else if (field === "marital_status") origVal = "Single";
                else if (field === "country") origVal = "USA";
                else if (field === "language") origVal = "English";
                else origVal = currentProfile[field] || "";

                if (pendingEdits[field] && pendingEdits[field] !== origVal) {
                    input.value = pendingEdits[field];
                    if (pendingNote) {
                        pendingNote.textContent = origVal || "(empty)";
                        pendingNote.style.color = "#ef4444";
                        pendingNote.style.fontSize = "11px";
                        pendingNote.style.marginTop = "4px";
                        pendingNote.style.display = "block";
                    }
                } else {
                    input.value = origVal;
                    if (pendingNote) {
                        pendingNote.textContent = "";
                        pendingNote.style.display = "none";
                    }
                }
            }
        });
    };

    const openModal = () => {
        document.getElementById("editProfileFormAlert").innerHTML = "";
        loadPendingEdits();
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("openEditProfileModal").addEventListener("click", openModal);
    document.getElementById("closeEditProfileModal").addEventListener("click", closeModal);
    document.getElementById("cancelEditProfile").addEventListener("click", closeModal);
    
    document.getElementById("revertEditProfileBtn").addEventListener("click", () => {
        localStorage.removeItem("pending_profile_edits");
        loadPendingEdits();
    });

    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const pendingEdits = {};
        ALL_FIELDS.forEach((field) => {
            const input = document.getElementById(`edit_${field}`);
            if (input) {
                pendingEdits[field] = input.value;
            }
        });

        localStorage.setItem("pending_profile_edits", JSON.stringify(pendingEdits));

        showToast("Changes submitted for approval", "success");
        closeModal();
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
