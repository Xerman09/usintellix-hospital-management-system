import { fetchPatientDocuments, uploadPatientDocument } from "../patient-documents/patient-documents.service.js";
import { escapeHtml } from "../appointments/appointment-format.js";
import { api, API_URL } from "../../core/api.js";
import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";

export async function initDocuments()
{
    const container = document.getElementById("docsListContainer");

    if (!container) {
        return;
    }

    renderWelcomeName();
    setupToolbar();
    setupUploadModal();
    setupSignatureModal();
    setupSelectFormDropdown();
    await loadDocuments();
}

function renderWelcomeName()
{
    const el = document.getElementById("docsWelcomeName");

    if (!el) {
        return;
    }

    const user = getUser();
    const name = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "";

    el.textContent = name ? `, ${name}` : "";
}

async function loadDocuments()
{
    const container = document.getElementById("docsListContainer");

    if (!container) {
        return;
    }

    try {
        const result = await fetchPatientDocuments();

        renderDocuments(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load documents", error);
        container.innerHTML = `<p class="table-empty">Unable to load documents right now.</p>`;
    }
}

function setupToolbar()
{
    document.getElementById("docsReloadBtn").addEventListener("click", loadDocuments);

    document.getElementById("docsExitBtn").addEventListener("click", () => {
        window.tabManager.closeTab("documents");
    });
}

function setupUploadModal()
{
    const overlay = document.getElementById("docsUploadModalOverlay");
    const form = document.getElementById("docsUploadForm");

    const openModal = () => {
        document.getElementById("docsUploadFormAlert").innerHTML = "";
        form.reset();
        overlay.classList.add("open");
    };

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("docsUploadBtn").addEventListener("click", openModal);
    document.getElementById("docsUploadModalClose").addEventListener("click", closeModal);
    document.getElementById("docsUploadCancelBtn").addEventListener("click", closeModal);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fileInput = document.getElementById("docsUpload_file");
        const file = fileInput.files[0];

        if (!file) {
            showAlert("docsUploadFormAlert", "Please choose a file to upload.", "error");
            return;
        }

        const details = {
            category: document.getElementById("docsUpload_category").value,
            description: document.getElementById("docsUpload_description").value.trim()
        };

        // Patients upload only to their own record; the backend resolves
        // the actual patient_id from the session and ignores this value.
        const result = await uploadPatientDocument("", file, details);

        if (!result.success) {
            showAlert("docsUploadFormAlert", result.message || "Failed to upload document.", "error");
            return;
        }

        closeModal();
        await loadDocuments();
    });
}

function setupSignatureModal()
{
    const overlay = document.getElementById("docsSignatureModalOverlay");
    const openBtn = document.getElementById("docsSignatureOpenBtn");
    const cancelBtn = document.getElementById("docsSignatureCancelBtn");
    const clearBtn = document.getElementById("docsSignatureClearBtn");
    const saveBtn = document.getElementById("docsSignatureSaveBtn");
    const useCurrentBtn = document.getElementById("docsSignatureUseCurrentBtn");
    const canvas = document.getElementById("docsSignatureCanvas");
    
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

    openBtn.addEventListener("click", () => {
        clearCanvas();
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
            showAlert("docsUploadFormAlert", "Please draw your signature first.", "error");
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
                
                // Assuming showToast is a global or helper
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

function setupSelectFormDropdown()
{
    const btn = document.getElementById("docsSelectFormBtn");
    const dropdown = document.getElementById("docsSelectFormDropdown");

    if (!btn || !dropdown) return;

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdown.style.display === "none") {
            dropdown.style.display = "block";
        } else {
            dropdown.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (dropdown.style.display === "block" && !dropdown.contains(e.target) && e.target !== btn) {
            dropdown.style.display = "none";
        }
    });

    // Optional: Add click handlers for the options
    const options = dropdown.querySelectorAll(".docs-form-option");
    options.forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.preventDefault();
            dropdown.style.display = "none";
            // Logic to handle form selection could go here
        });
    });
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}

function formatFileSize(bytes)
{
    if (!bytes) {
        return "-";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderDocuments(documents)
{
    const container = document.getElementById("docsListContainer");

    if (!documents.length) {
        container.innerHTML = `<p class="table-empty">No documents have been shared with you yet.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>Size</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${documents.map((doc) => `
                        <tr>
                            <td>${escapeHtml(doc.original_filename)}</td>
                            <td>${escapeHtml(doc.category || "-")}</td>
                            <td>${escapeHtml(doc.uploaded_by_name || "-")}</td>
                            <td>${escapeHtml((doc.created_at || "").slice(0, 10) || "-")}</td>
                            <td>${formatFileSize(doc.file_size)}</td>
                            <td><a href="${API_URL}${doc.file_path}" target="_blank" rel="noopener">Download</a></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}
