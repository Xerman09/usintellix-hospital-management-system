import { api } from "../../core/api.js?v=5";
import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";

export function initSettings() {
    const btnDigitalSignature = document.getElementById("btnDigitalSignature");
    const btnManageLogin = document.getElementById("btnManageLogin");
    const btnSelectTheme = document.getElementById("btnSelectTheme");

    setupSignatureModal(btnDigitalSignature);
    setupLoginCredentialsModal(btnManageLogin);
    
    if (btnSelectTheme) {
        btnSelectTheme.addEventListener("click", (e) => {
            e.preventDefault();
            const appearanceBtn = document.querySelector('a[data-tab="appearance"]');
            if (appearanceBtn) {
                appearanceBtn.click();
            } else {
                if (typeof showToast === 'function') showToast("Appearance module not found.", "error");
            }
        });
    }
}

function setupLoginCredentialsModal(openBtn) {
    const overlay = document.getElementById("settingsLoginModalOverlay");
    const closeBtn = document.getElementById("settingsLoginCloseBtn");
    const helpToggle = document.getElementById("settingsHelpToggle");
    const helpContent = document.getElementById("settingsHelpContent");
    const helpArrow = document.getElementById("settingsHelpArrow");
    const saveBtn = document.getElementById("settingsLoginSaveBtn");
    
    if (!overlay || !openBtn) return;
    
    // Set user info
    const user = getUser();
    if (user) {
        const portalIdEl = document.getElementById("settingsPortalId");
        const patientIdEl = document.getElementById("settingsPatientId");
        const changeUsernameEl = document.getElementById("settingsChangeUsername");
        
        if (portalIdEl) portalIdEl.value = user.username || user.email || "";
        if (patientIdEl) patientIdEl.value = user.id || "";
        if (changeUsernameEl) changeUsernameEl.placeholder = user.username || user.email || "";
    }
    
    openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Reset fields
        document.getElementById("settingsChangeUsername").value = "";
        document.getElementById("settingsConfirmUsername").value = "";
        document.getElementById("settingsChangePassword").value = "";
        document.getElementById("settingsConfirmPassword").value = "";
        document.getElementById("settingsCurrentPassword").value = "";
        
        overlay.classList.add("open");
    });
    
    closeBtn.addEventListener("click", () => {
        overlay.classList.remove("open");
    });
    
    if (helpToggle && helpContent && helpArrow) {
        helpToggle.addEventListener("click", () => {
            if (helpContent.style.display === "none") {
                helpContent.style.display = "block";
                helpArrow.style.transform = "rotate(90deg)";
            } else {
                helpContent.style.display = "none";
                helpArrow.style.transform = "rotate(0deg)";
            }
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const currentPass = document.getElementById("settingsCurrentPassword").value;
            if (!currentPass) {
                if (typeof showToast === 'function') showToast("Current password is required to save changes.", "error");
                return;
            }
            
            // Simulate saving
            if (typeof showToast === 'function') showToast("Login credentials updated successfully.", "success");
            overlay.classList.remove("open");
        });
    }
}

function setupSignatureModal(openBtn) {
    const overlay = document.getElementById("settingsSignatureModalOverlay");
    const cancelBtn = document.getElementById("settingsSignatureCancelBtn");
    const clearBtn = document.getElementById("settingsSignatureClearBtn");
    const saveBtn = document.getElementById("settingsSignatureSaveBtn");
    const useCurrentBtn = document.getElementById("settingsSignatureUseCurrentBtn");
    const canvas = document.getElementById("settingsSignatureCanvas");

    if (!overlay || !openBtn || !canvas) return;

    const ctx = canvas.getContext("2d");
    let isDrawing = false;
    let hasDrawn = false;
    let existingSignature = null;

    // Fetch existing signature to populate "Use Current" if available
    const user = getUser();
    if (user && user.signature) {
        existingSignature = user.signature;
    }

    const startDrawing = (e) => {
        isDrawing = true;
        hasDrawn = true;
        draw(e);
    };

    const stopDrawing = () => {
        isDrawing = false;
        ctx.beginPath();
    };

    const draw = (e) => {
        if (!isDrawing) return;

        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clearCanvas = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        ctx.beginPath();
    };

    // Mouse events
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    // Touch events
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);

    openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearCanvas();
        if (existingSignature) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                hasDrawn = true;
            };
            img.src = existingSignature;
        }
        useCurrentBtn.style.display = existingSignature ? "block" : "none";
        overlay.classList.add("open");
    });

    cancelBtn.addEventListener("click", () => {
        overlay.classList.remove("open");
    });

    clearBtn.addEventListener("click", clearCanvas);

    useCurrentBtn.addEventListener("click", () => {
        if (existingSignature) {
            const img = new Image();
            img.onload = () => {
                clearCanvas();
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                hasDrawn = true;
            };
            img.src = existingSignature;
        }
    });

    saveBtn.addEventListener("click", async () => {
        if (!hasDrawn) {
            if (typeof showToast === 'function') showToast("Please draw your signature first.", "error");
            overlay.classList.remove("open");
            return;
        }

        const originalText = saveBtn.textContent;
        saveBtn.textContent = "Saving...";
        saveBtn.disabled = true;

        try {
            const dataUrl = canvas.toDataURL("image/png");

            const response = await api("/profile/signature", {
                method: "POST",
                body: JSON.stringify({ signature: dataUrl })
            });

            if (response.success) {
                // Update local session user
                const user = getUser();
                if (user) {
                    user.signature = dataUrl;
                    sessionStorage.setItem("user", JSON.stringify(user));
                }
                existingSignature = dataUrl;

                if (typeof showToast === 'function') showToast("Signature saved successfully.", "success");
                overlay.classList.remove("open");
            } else {
                throw new Error(response.message || "Failed to save signature.");
            }
        } catch (err) {
            console.error("Signature save error:", err);
            if (typeof showToast === 'function') showToast(err.message, "error");
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });
}
