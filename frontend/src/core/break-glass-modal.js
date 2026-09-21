import { api } from "./api.js?v=6";
import { showToast } from "./toast.js";

/**
 * HIPAA Emergency Break-Glass Access Controller (§ 164.312(a)(2)(ii) & § 164.502(b))
 */

let activeModalOverlay = null;

export function initBreakGlassListener() {
    window.addEventListener("hipaaBreakGlassRequired", (e) => {
        const detail = e.detail || {};
        const patientId = detail.patient_id;
        if (patientId) {
            openBreakGlassModal({
                patientId: patientId,
                patientName: detail.patient_name || `Patient #${patientId}`,
                onSuccess: () => {
                    // Trigger refresh of active patient chart or view
                    window.dispatchEvent(new CustomEvent("hipaaBreakGlassGranted", { detail: { patientId } }));
                }
            });
        }
    });
}

export function openBreakGlassModal({ patientId, patientName, onSuccess, onCancel }) {
    if (activeModalOverlay) {
        activeModalOverlay.remove();
        activeModalOverlay = null;
    }

    const modalHtml = `
    <div class="modal-overlay" id="breakGlassModalOverlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; backdrop-filter: blur(4px);">
        <div class="modal-card" style="background: #ffffff; border-radius: 12px; max-width: 560px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); overflow: hidden; border: 2px solid #ef4444; animation: bgModalFadeIn 0.2s ease-out;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #b91c1c, #dc2626); color: #ffffff; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(255, 255, 255, 0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        ⚠️
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">Emergency Break-Glass Override</h3>
                        <div style="font-size: 12px; color: #fecaca; margin-top: 2px;">HIPAA § 164.312(a)(2)(ii) &amp; § 164.502(b)</div>
                    </div>
                </div>
                <button type="button" id="btnBreakGlassClose" style="background: transparent; border: none; color: #ffffff; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
            </div>

            <!-- Body -->
            <div style="padding: 24px;">
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin-bottom: 18px; font-size: 13px; color: #991b1b; line-height: 1.5;">
                    <strong>Access Restriction Notice:</strong> You are not currently assigned as the attending provider for <strong>${escapeHtml(patientName || `Patient #${patientId}`)}</strong>.
                    Under the <strong>HIPAA Minimum Necessary Rule</strong>, clinical chart access is restricted unless emergency medical care is required.
                </div>

                <div style="font-size: 13px; color: #334155; margin-bottom: 16px; line-height: 1.5;">
                    Invoking <strong>Break-Glass</strong> grants temporary, emergency session access to this patient's clinical chart. An immutable, high-priority audit record will be logged with your user credentials, timestamp, and clinical justification.
                </div>

                <form id="breakGlassForm">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 6px; text-transform: uppercase;">
                            Emergency Category <span style="color: #ef4444;">*</span>
                        </label>
                        <select id="breakGlassCategory" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff; color: #0f172a;" required>
                            <option value="">-- Select emergency category --</option>
                            <option value="Acute Emergency / Trauma Stabilization">Acute Emergency / Trauma Stabilization</option>
                            <option value="Cross-Coverage / On-Call Provider">Cross-Coverage / On-Call Provider</option>
                            <option value="Urgent Clinical Consultation">Urgent Clinical Consultation</option>
                            <option value="Primary Attending Off-Duty / Unavailable">Primary Attending Off-Duty / Unavailable</option>
                            <option value="Critical Vitals / Lab Deterioration">Critical Vitals / Lab Deterioration</option>
                            <option value="Other Clinical Emergency">Other Clinical Emergency</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 6px; text-transform: uppercase;">
                            Clinical Justification &amp; Notes <span style="color: #ef4444;">*</span>
                        </label>
                        <textarea id="breakGlassReason" rows="3" placeholder="Provide clinical rationale for accessing this patient's chart (e.g. Acute chest pain cross-coverage in ED)..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: inherit;" required minlength="10"></textarea>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Minimum 10 characters. Required for HIPAA audit compliance.</div>
                    </div>

                    <div style="margin-bottom: 20px; display: flex; align-items: flex-start; gap: 8px;">
                        <input type="checkbox" id="breakGlassCertify" style="margin-top: 3px;" required>
                        <label for="breakGlassCertify" style="font-size: 12px; color: #475569; line-height: 1.4; cursor: pointer;">
                            I certify that emergency clinical access is strictly necessary for immediate medical care, in compliance with 45 CFR § 164.502(b).
                        </label>
                    </div>

                    <div id="breakGlassError" style="display: none; padding: 10px; background: #fee2e2; color: #b91c1c; border-radius: 6px; font-size: 12px; margin-bottom: 16px;"></div>

                    <!-- Footer -->
                    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        <button type="button" id="btnBreakGlassCancel" style="padding: 10px 18px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Cancel
                        </button>
                        <button type="submit" id="btnBreakGlassSubmit" style="padding: 10px 20px; border: none; background: #dc2626; color: #ffffff; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <span>⚡ Authorize Emergency Access</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = modalHtml;
    document.body.appendChild(container.firstElementChild);
    activeModalOverlay = document.getElementById("breakGlassModalOverlay");

    const closeBtn = document.getElementById("btnBreakGlassClose");
    const cancelBtn = document.getElementById("btnBreakGlassCancel");
    const form = document.getElementById("breakGlassForm");
    const categorySelect = document.getElementById("breakGlassCategory");
    const reasonTextarea = document.getElementById("breakGlassReason");
    const certifyCheck = document.getElementById("breakGlassCertify");
    const submitBtn = document.getElementById("btnBreakGlassSubmit");
    const errorDiv = document.getElementById("breakGlassError");

    function closeModal() {
        if (activeModalOverlay) {
            activeModalOverlay.remove();
            activeModalOverlay = null;
        }
        if (onCancel) onCancel();
    }

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    categorySelect.addEventListener("change", () => {
        if (categorySelect.value && !reasonTextarea.value) {
            reasonTextarea.value = categorySelect.value + ": ";
            reasonTextarea.focus();
        }
    });

    form.onsubmit = async (e) => {
        e.preventDefault();

        if (!certifyCheck.checked) {
            errorDiv.textContent = "You must certify compliance before proceeding.";
            errorDiv.style.display = "block";
            return;
        }

        const category = categorySelect.value.trim();
        const reason = reasonTextarea.value.trim();

        if (!category) {
            errorDiv.textContent = "Please select an emergency category.";
            errorDiv.style.display = "block";
            return;
        }

        if (reason.length < 10) {
            errorDiv.textContent = "Please provide a clinical justification of at least 10 characters.";
            errorDiv.style.display = "block";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = "Logging &amp; Granting...";
        errorDiv.style.display = "none";

        try {
            const fullReason = `[${category}] ${reason}`;
            const res = await api("/patients/break-glass", {
                method: "POST",
                body: JSON.stringify({
                    patient_id: patientId,
                    reason: fullReason
                })
            });

            if (res && res.success) {
                showToast("Emergency Break-Glass access granted and logged in HIPAA audit trail.", "warning");
                if (activeModalOverlay) {
                    activeModalOverlay.remove();
                    activeModalOverlay = null;
                }
                if (onSuccess) onSuccess();
            } else {
                errorDiv.textContent = res?.message || "Failed to authorize Break-Glass access.";
                errorDiv.style.display = "block";
                submitBtn.disabled = false;
                submitBtn.innerHTML = "⚡ Authorize Emergency Access";
            }
        } catch (err) {
            errorDiv.textContent = "An error occurred while communicating with the server.";
            errorDiv.style.display = "block";
            submitBtn.disabled = false;
            submitBtn.innerHTML = "⚡ Authorize Emergency Access";
        }
    };
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
