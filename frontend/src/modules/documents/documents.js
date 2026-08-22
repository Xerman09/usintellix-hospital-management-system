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
        
        // Update highlight status right before showing the dropdown
        updateDropdownStatus();

        if (dropdown.style.display === "none") {
            dropdown.style.display = "block";
        } else {
            dropdown.style.display = "none";
        }
    });

    document.addEventListener("click", () => {
        dropdown.style.display = "none";
    });

    // Optional: Add click handlers for the options
    const options = dropdown.querySelectorAll(".docs-form-option");
    options.forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.preventDefault();
            dropdown.style.display = "none";
            const formType = opt.getAttribute("data-form");
            
            if (formType === "hipaa") {
                openHipaaForm();
            } else if (formType === "insurance") {
                openInsuranceForm();
            }
        });
    });

    // Run once on init to set the initial state
    updateDropdownStatus();

    document.getElementById("docsFormDismissBtn")?.addEventListener("click", closeForm);
    document.getElementById("docsFormDismissBtnBottom")?.addEventListener("click", closeForm);

    document.getElementById("docsActivitiesBtn")?.addEventListener("click", openActivitiesView);

    document.getElementById("docsSubmitCompletedBtn")?.addEventListener("click", () => {
        if (typeof showToast === 'function') {
            showToast("Updates Successful", "success");
        }
        
        if (document.getElementById("docsFormBody")?.style.display === "block") {
            localStorage.setItem('hipaa_status', 'In Review');
        } else if (document.getElementById("docsInsuranceFormBody")?.style.display === "block") {
            localStorage.setItem('insurance_status', 'In Review');
        }
        
        closeForm();
    });

    document.getElementById("docsFormDeleteBtn")?.addEventListener("click", () => {
        const modal = document.getElementById("docsDeleteConfirmModalOverlay");
        if (modal) modal.style.display = "flex";
    });

    document.getElementById("docsDeleteCancelModalBtn")?.addEventListener("click", () => {
        const modal = document.getElementById("docsDeleteConfirmModalOverlay");
        if (modal) modal.style.display = "none";
    });

    document.getElementById("docsDeleteConfirmModalBtn")?.addEventListener("click", () => {
        const modal = document.getElementById("docsDeleteConfirmModalOverlay");
        if (modal) modal.style.display = "none";

        if (typeof showToast === 'function') {
            showToast("Delete Successful", "success");
        }
        
        if (document.getElementById("docsFormBody")?.style.display === "block") {
            localStorage.removeItem('hipaa_status');
        } else if (document.getElementById("docsInsuranceFormBody")?.style.display === "block") {
            localStorage.removeItem('insurance_status');
        }
        
        closeForm();
    });

    document.getElementById("docsInsuranceFormDismissBtn")?.addEventListener("click", closeForm);
    document.getElementById("docsInsuranceFormDismissBtnBottom")?.addEventListener("click", closeForm);

    document.getElementById("docsInsuranceFormDeleteBtn")?.addEventListener("click", () => {
        const modal = document.getElementById("docsDeleteConfirmModalOverlay");
        if (modal) modal.style.display = "flex";
    });
}

function updateDropdownStatus() {
    const hipaaStatus = localStorage.getItem('hipaa_status');
    const hipaaOption = document.querySelector('.docs-form-option[data-form="hipaa"]');
    
    if (hipaaOption) {
        if (hipaaStatus === 'In Review') {
            hipaaOption.style.backgroundColor = '#dcfce7'; // light green
            hipaaOption.style.color = '#166534'; // dark green text
            hipaaOption.style.fontWeight = '500';
        } else {
            hipaaOption.style.backgroundColor = 'transparent';
            hipaaOption.style.color = '#475569';
            hipaaOption.style.fontWeight = 'normal';
        }
    }

    const insStatus = localStorage.getItem('insurance_status');
    const insOption = document.querySelector('.docs-form-option[data-form="insurance"]');
    if (insOption) {
        if (insStatus === 'In Review') {
            insOption.style.backgroundColor = '#dcfce7';
            insOption.style.color = '#166534';
            insOption.style.fontWeight = '500';
        } else {
            insOption.style.backgroundColor = 'transparent';
            insOption.style.color = '#475569';
            insOption.style.fontWeight = 'normal';
        }
    }
}

function openHipaaForm()
{
    const mainBody = document.getElementById("docsMainBody");
    const formBody = document.getElementById("docsFormBody");
    const activitiesBody = document.getElementById("docsActivitiesBody");
    const editingBar = document.getElementById("docsEditingBar");
    
    // Toggle toolbar buttons
    document.getElementById("docsSaveDraftBtn").style.display = "flex";
    document.getElementById("docsSubmitCompletedBtn").style.display = "flex";

    // Toggle views
    if (mainBody) mainBody.style.display = "none";
    if (activitiesBody) activitiesBody.style.display = "none";
    const insBody = document.getElementById("docsInsuranceFormBody");
    if (insBody) insBody.style.display = "none";
    if (editingBar) editingBar.style.display = "flex";
    if (formBody) formBody.style.display = "block";

    // Set Date and Status
    const today = new Date().toISOString().split('T')[0];
    const todayDisplay = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    document.getElementById("docsFormHeaderDate").textContent = todayDisplay;
    document.getElementById("hipaaGivenToday").textContent = today;
    document.getElementById("hipaaGivenToday2").textContent = today;

    const status = localStorage.getItem('hipaa_status') || 'New';
    document.getElementById("docsFormHeaderStatus").textContent = status;
    if (status === 'In Review') {
        document.getElementById("docsFormDeleteBtn").style.display = "flex";
    } else {
        document.getElementById("docsFormDeleteBtn").style.display = "none";
    }

    // Load Patient Data
    const user = getUser();
    if (!user) return;

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    document.getElementById("hipaaPatientName").textContent = fullName;
    document.getElementById("hipaaPatientName2").textContent = fullName;
    
    // Since we don't store sex/dob in session user, fetch profile if needed, or leave blank if not available.
    // For now we try to populate what we can from session user.
    document.getElementById("hipaaPatientSex").textContent = user.sex || "Unknown";
    document.getElementById("hipaaPatientId").textContent = user.id;
    document.getElementById("hipaaPatientDob").textContent = user.birthdate || "Unknown";
    document.getElementById("hipaaPatientAddress").textContent = user.address_line || "Unknown";
    document.getElementById("hipaaPatientZip").textContent = user.zip_code || "Unknown";
    document.getElementById("hipaaPatientCity").textContent = user.city || "Unknown";
    document.getElementById("hipaaPatientState").textContent = user.province || "Unknown";
    document.getElementById("hipaaPatientPhone").textContent = user.phone || "Unknown";

    // Fetch Profile for full details and signature
    api("/profile", { method: "GET" }).then(res => {
        if (res.success && res.data) {
            const p = res.data;
            const pName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            document.getElementById("hipaaPatientName").textContent = pName;
            document.getElementById("hipaaPatientName2").textContent = pName;
            document.getElementById("hipaaPatientSex").textContent = p.sex || "Unknown";
            document.getElementById("hipaaPatientId").textContent = p.id;
            document.getElementById("hipaaPatientDob").textContent = p.birthdate || "Unknown";
            
            document.getElementById("hipaaPatientAddress").textContent = p.address_line || "Unknown";
            document.getElementById("hipaaPatientZip").textContent = p.zip_code || "Unknown";
            document.getElementById("hipaaPatientCity").textContent = p.city || "Unknown";
            document.getElementById("hipaaPatientState").textContent = p.province || "Unknown";
            document.getElementById("hipaaPatientPhone").textContent = p.home_phone || p.mobile_phone || p.phone || "Unknown";

            if (p.signature) {
                document.getElementById("hipaaSignatureImg").src = p.signature;
                document.getElementById("hipaaSignatureImg").style.display = "inline-block";
                document.getElementById("hipaaSignaturePlaceholder").style.display = "none";
            }
        }
    });
}

function openInsuranceForm()
{
    const mainBody = document.getElementById("docsMainBody");
    const formBody = document.getElementById("docsFormBody");
    const insBody = document.getElementById("docsInsuranceFormBody");
    const activitiesBody = document.getElementById("docsActivitiesBody");
    const editingBar = document.getElementById("docsEditingBar");
    
    // Toggle toolbar buttons
    document.getElementById("docsSaveDraftBtn").style.display = "flex";
    document.getElementById("docsSubmitCompletedBtn").style.display = "flex";

    // Toggle views
    if (mainBody) mainBody.style.display = "none";
    if (activitiesBody) activitiesBody.style.display = "none";
    if (formBody) formBody.style.display = "none";
    if (editingBar) editingBar.style.display = "flex";
    if (insBody) insBody.style.display = "block";

    // Set Date and Status
    const today = new Date().toISOString().split('T')[0];
    const todayDisplay = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    document.getElementById("docsInsuranceFormHeaderDate").textContent = todayDisplay;
    document.getElementById("insuranceGivenToday").textContent = today;

    const status = localStorage.getItem('insurance_status') || 'New';
    document.getElementById("docsInsuranceFormHeaderStatus").textContent = status;
    if (status === 'In Review') {
        document.getElementById("docsInsuranceFormDeleteBtn").style.display = "flex";
    } else {
        document.getElementById("docsInsuranceFormDeleteBtn").style.display = "none";
    }

    // Load Patient Data
    const user = getUser();
    if (!user) return;

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    document.getElementById("insurancePatientName").textContent = fullName;
}

function openActivitiesView()
{
    document.getElementById("docsMainBody").style.display = "none";
    document.getElementById("docsFormBody").style.display = "none";
    document.getElementById("docsInsuranceFormBody").style.display = "none";
    document.getElementById("docsEditingBar").style.display = "none";
    document.getElementById("docsActivitiesBody").style.display = "block";
    
    // Revert toolbar buttons
    document.getElementById("docsSaveDraftBtn").style.display = "none";
    document.getElementById("docsSubmitCompletedBtn").style.display = "none";

    const tbody = document.getElementById("docsActivitiesTableBody");
    tbody.innerHTML = ""; // clear previous

    const hipaaStatus = localStorage.getItem('hipaa_status');
    if (hipaaStatus === "In Review") {
        // Create mock row from screenshot
        const todayDisplay = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        tr.innerHTML = `
            <td style="padding: 10px 12px; font-weight: bold;">2</td>
            <td style="padding: 10px 12px;">
                <span class="docs-activity-link" style="color: #2563eb; border: 1px solid #22c55e; padding: 2px 6px; display: inline-block; cursor: pointer;">Hipaa Document</span>
            </td>
            <td style="padding: 10px 12px;">${todayDisplay}</td>
            <td style="padding: 10px 12px;">Pending</td>
            <td style="padding: 10px 12px;">In Review</td>
            <td style="padding: 10px 12px;">No</td>
            <td style="padding: 10px 12px;">Pending</td>
        `;
        tbody.appendChild(tr);

        tr.querySelector(".docs-activity-link").addEventListener("click", () => {
            openHipaaForm();
        });
    }

    const insStatus = localStorage.getItem('insurance_status');
    if (insStatus === "In Review") {
        const todayDisplay = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        tr.innerHTML = `
            <td style="padding: 10px 12px; font-weight: bold;">3</td>
            <td style="padding: 10px 12px;">
                <span class="docs-activity-link-ins" style="color: #2563eb; border: 1px solid #22c55e; padding: 2px 6px; display: inline-block; cursor: pointer;">Insurance Info</span>
            </td>
            <td style="padding: 10px 12px;">${todayDisplay}</td>
            <td style="padding: 10px 12px;">Pending</td>
            <td style="padding: 10px 12px;">In Review</td>
            <td style="padding: 10px 12px;">No</td>
            <td style="padding: 10px 12px;">Pending</td>
        `;
        tbody.appendChild(tr);

        tr.querySelector(".docs-activity-link-ins").addEventListener("click", () => {
            openInsuranceForm();
        });
    }
}

function closeForm()
{
    const mainBody = document.getElementById("docsMainBody");
    const formBody = document.getElementById("docsFormBody");
    const insBody = document.getElementById("docsInsuranceFormBody");
    
    // Revert toolbar buttons
    document.getElementById("docsSaveDraftBtn").style.display = "none";
    document.getElementById("docsSubmitCompletedBtn").style.display = "none";

    // Toggle views
    if (mainBody) mainBody.style.display = "block";
    if (formBody) formBody.style.display = "none";
    if (insBody) insBody.style.display = "none";
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
