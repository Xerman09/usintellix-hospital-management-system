import { changePassword } from "./profile.service.js";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";

const EYE_OPEN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_CLOSED = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

export function initChangePassword() {
    const form = document.getElementById("cpForm");
    const currentPassInput = document.getElementById("cpCurrentPassword");
    const newPassInput = document.getElementById("cpNewPassword");
    const confirmPassInput = document.getElementById("cpConfirmPassword");
    const alertEl = document.getElementById("cpAlert");
    const submitBtn = document.getElementById("cpSubmitBtn");

    if (!form || !currentPassInput || !newPassInput || !confirmPassInput) return;

    // Setup password toggle buttons
    const toggleBtns = form.querySelectorAll(".cp-toggle-btn");
    toggleBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-toggle-for");
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPass = input.type === "password";
            input.type = isPass ? "text" : "password";
            btn.innerHTML = isPass ? EYE_CLOSED : EYE_OPEN;
            btn.setAttribute("aria-label", isPass ? "Hide password" : "Show password");
        });
    });

    // Setup live rules validator
    const updateRules = () => {
        const val = newPassInput.value;
        const confirmVal = confirmPassInput.value;

        const ruleMinLength = document.getElementById("ruleMinLength");
        const ruleUppercase = document.getElementById("ruleUppercase");
        const ruleLowercase = document.getElementById("ruleLowercase");
        const ruleNumber = document.getElementById("ruleNumber");
        const ruleSpecial = document.getElementById("ruleSpecial");
        const ruleMatch = document.getElementById("ruleMatch");

        if (ruleMinLength) ruleMinLength.classList.toggle("valid", val.length >= 8);
        if (ruleUppercase) ruleUppercase.classList.toggle("valid", /[A-Z]/.test(val));
        if (ruleLowercase) ruleLowercase.classList.toggle("valid", /[a-z]/.test(val));
        if (ruleNumber) ruleNumber.classList.toggle("valid", /[0-9]/.test(val));
        if (ruleSpecial) ruleSpecial.classList.toggle("valid", /[^A-Za-z0-9]/.test(val));
        if (ruleMatch) ruleMatch.classList.toggle("valid", Boolean(val && confirmVal && val === confirmVal));
    };

    newPassInput.addEventListener("input", updateRules);
    confirmPassInput.addEventListener("input", updateRules);

    const clearErrors = () => {
        ["errCpCurrentPassword", "errCpNewPassword", "errCpConfirmPassword"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = "";
                el.style.display = "none";
            }
        });
        if (alertEl) {
            alertEl.innerHTML = "";
            alertEl.className = "cp-alert";
            alertEl.style.display = "none";
        }
    };

    form.addEventListener("reset", () => {
        setTimeout(() => {
            clearErrors();
            updateRules();
        }, 10);
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        const currentPassword = currentPassInput.value;
        const newPassword = newPassInput.value;
        const confirmPassword = confirmPassInput.value;

        let hasError = false;

        if (!currentPassword) {
            const errEl = document.getElementById("errCpCurrentPassword");
            if (errEl) {
                errEl.textContent = "Current password is required.";
                errEl.style.display = "block";
            }
            hasError = true;
        }

        if (newPassword !== confirmPassword) {
            const errEl = document.getElementById("errCpConfirmPassword");
            if (errEl) {
                errEl.textContent = "New password and confirmation do not match.";
                errEl.style.display = "block";
            }
            hasError = true;
        }

        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            const errEl = document.getElementById("errCpNewPassword");
            if (errEl) {
                errEl.textContent = "Password does not meet the complexity requirements.";
                errEl.style.display = "block";
            }
            hasError = true;
        }

        if (hasError) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="0.85"></path>
            </svg>
            Updating...
        `;

        try {
            const result = await changePassword({
                current_password: currentPassword,
                new_password: newPassword
            });

            if (!result.success) {
                const errorMsg = result.message || "Failed to update password. Please check your credentials.";
                if (alertEl) {
                    alertEl.className = "cp-alert error";
                    alertEl.textContent = errorMsg;
                    alertEl.style.display = "flex";
                }
                if (result.errors?.new_password) {
                    const errEl = document.getElementById("errCpNewPassword");
                    if (errEl) {
                        errEl.textContent = result.errors.new_password;
                        errEl.style.display = "block";
                    }
                }
                if (result.message && /current password/i.test(result.message)) {
                    const errCurrentEl = document.getElementById("errCpCurrentPassword");
                    if (errCurrentEl) {
                        errCurrentEl.textContent = result.message;
                        errCurrentEl.style.display = "block";
                    }
                }
                showToast(errorMsg, "error");
                return;
            }

            // Success!
            form.reset();
            updateRules();

            if (alertEl) {
                alertEl.className = "cp-alert success";
                alertEl.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><strong>Password updated successfully!</strong> Your credentials have been refreshed and your expiration notice cleared.</span>
                `;
                alertEl.style.display = "flex";
            }

            showToast("Password updated successfully.", "success");

            // Dismiss the warning banner from the dashboard
            const banner = document.getElementById("passwordExpirationBanner");
            if (banner) {
                banner.style.display = "none";
            }
            sessionStorage.setItem("pw_exp_banner_dismissed", "1");

            // Update user in session if available
            const user = getUser();
            if (user) {
                user.password_expiring_soon = false;
                user.days_until_expiration = 90;
            }
        } catch (err) {
            if (alertEl) {
                alertEl.className = "cp-alert error";
                alertEl.textContent = "An error occurred while changing password. Please try again.";
                alertEl.style.display = "flex";
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Update Password
            `;
        }
    });
}
