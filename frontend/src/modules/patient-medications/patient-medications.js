import { getUser } from "../../core/session.js?v=5";
import { showToast } from "../../core/toast.js";
import {
    fetchPatientMedications,
    addPatientMedication,
    updatePatientMedication,
    removePatientMedication
} from "./patient-medications.service.js";
import {
    requestPrescriptionRefill,
    cancelRefillRequest
} from "../patient-prescriptions/patient-prescriptions.service.js?v=8";

let allMedications = [];
let currentFilter = "all";
let currentSearch = "";
let isInitialized = false;

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return (unsafe + "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export async function initPatientMedications() {
    const user = getUser();
    if (!user) return;

    let container = document.getElementById("patientMedicationsList");
    if (!container) {
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 50));
            container = document.getElementById("patientMedicationsList");
            if (container) break;
        }
        if (!container) return;
    }

    setupEventListeners();
    await loadMedications();
}

async function loadMedications() {
    const container = document.getElementById("patientMedicationsList");
    if (!container) return;

    container.innerHTML = `
        <div class="pmed-empty-state">
            <p>Loading medications...</p>
        </div>
    `;

    try {
        const response = await fetchPatientMedications();

        if (!response?.success) {
            container.innerHTML = `
                <div class="pmed-empty-state">
                    <h3>Error Loading Medications</h3>
                    <p>${escapeHtml(response?.message || "Unable to load your medications right now.")}</p>
                    <button type="button" class="pmed-btn pmed-btn-outline" id="pmedRetryBtn">Try Again</button>
                </div>
            `;
            document.getElementById("pmedRetryBtn")?.addEventListener("click", loadMedications);
            return;
        }

        allMedications = response.data || [];
        updateCounts();
        renderMedications();

    } catch (e) {
        console.error("Medications load error:", e);
        container.innerHTML = `
            <div class="pmed-empty-state">
                <h3>Error Loading Medications</h3>
                <p>An unexpected error occurred while loading your medications.</p>
                <button type="button" class="pmed-btn pmed-btn-outline" id="pmedRetryBtn">Try Again</button>
            </div>
        `;
        document.getElementById("pmedRetryBtn")?.addEventListener("click", loadMedications);
    }
}

function updateCounts() {
    const total = allMedications.length;
    const active = allMedications.filter(m => m.status === "active").length;
    const rx = allMedications.filter(m => m.record_type === "prescription").length;
    const otc = allMedications.filter(m => m.record_type === "medication").length;
    const completed = allMedications.filter(m => m.status === "completed" || m.status === "cancelled").length;

    const elTotal = document.getElementById("countAll");
    const elActive = document.getElementById("countActive");
    const elRx = document.getElementById("countRx");
    const elOtc = document.getElementById("countOtc");
    const elCompleted = document.getElementById("countCompleted");

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elRx) elRx.textContent = rx;
    if (elOtc) elOtc.textContent = otc;
    if (elCompleted) elCompleted.textContent = completed;
}

function getFilteredMedications() {
    return allMedications.filter(med => {
        // Tab Filter
        if (currentFilter === "active" && med.status !== "active") return false;
        if (currentFilter === "prescription" && med.record_type !== "prescription") return false;
        if (currentFilter === "medication" && med.record_type !== "medication") return false;
        if (currentFilter === "completed" && (med.status !== "completed" && med.status !== "cancelled")) return false;

        // Search Filter
        if (currentSearch.trim() !== "") {
            const q = currentSearch.toLowerCase().trim();
            const titleMatch = (med.title || "").toLowerCase().includes(q);
            const dosageMatch = (med.dosage || "").toLowerCase().includes(q);
            const directionsMatch = (med.directions || "").toLowerCase().includes(q);
            const prescriberMatch = (med.prescriber_name || "").toLowerCase().includes(q);
            const rxMatch = (med.rx_number || "").toLowerCase().includes(q);
            if (!titleMatch && !dosageMatch && !directionsMatch && !prescriberMatch && !rxMatch) {
                return false;
            }
        }

        return true;
    });
}

function renderMedications() {
    const container = document.getElementById("patientMedicationsList");
    if (!container) return;

    const list = getFilteredMedications();

    if (list.length === 0) {
        if (currentSearch.trim() !== "") {
            container.innerHTML = `
                <div class="pmed-empty-state">
                    <h3>No matching medications</h3>
                    <p>No medications matched your search term "<strong>${escapeHtml(currentSearch)}</strong>".</p>
                    <button type="button" class="pmed-btn pmed-btn-outline" id="pmedClearSearchBtn">Clear Search</button>
                </div>
            `;
            document.getElementById("pmedClearSearchBtn")?.addEventListener("click", () => {
                const searchInput = document.getElementById("pmedSearchInput");
                if (searchInput) searchInput.value = "";
                currentSearch = "";
                renderMedications();
            });
            return;
        }

        container.innerHTML = `
            <div class="pmed-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <h3>No medications on file</h3>
                <p>You currently do not have any ${currentFilter !== 'all' ? currentFilter : ''} medications recorded in your health record.</p>
                <button type="button" class="pmed-btn pmed-btn-primary" id="pmedEmptyRecordBtn">+ Record Medication</button>
            </div>
        `;
        document.getElementById("pmedEmptyRecordBtn")?.addEventListener("click", openRecordModal);
        return;
    }

    let html = `<div class="pmed-list">`;

    list.forEach(med => {
        const isRx = med.record_type === "prescription";
        const isActive = med.status === "active";
        const isCancelled = med.status === "cancelled";

        const iconClass = !isActive ? "completed" : isRx ? "prescription" : "medication";
        const typeBadge = isRx
            ? `<span class="pmed-badge pmed-badge-rx">Prescription</span>`
            : `<span class="pmed-badge pmed-badge-otc">Home / OTC</span>`;

        const statusBadge = isActive
            ? `<span class="pmed-badge pmed-badge-active">Active</span>`
            : isCancelled
                ? `<span class="pmed-badge pmed-badge-cancelled">Cancelled</span>`
                : `<span class="pmed-badge pmed-badge-completed">Completed</span>`;

        // Refill request pending badge
        const pendingRefill = med.refill_request?.status === "pending";
        const refillPendingBadge = pendingRefill
            ? `<span class="pmed-badge pmed-badge-refill-pending">Refill Requested (${formatDate(med.refill_request.created_at)})</span>`
            : "";

        const prescriber = med.prescriber_name ? `Dr. ${med.prescriber_name}` : (isRx ? "Care Provider" : "Self-Reported");

        // Refill footer details
        let refillText = "";
        if (isRx) {
            if (med.is_closed) {
                refillText = `<span style="color:var(--text-muted, #94a3b8);">Prescription closed by pharmacy</span>`;
            } else if (med.refills_allowed > 0) {
                const remaining = med.refills_remaining ?? med.refills_allowed;
                refillText = `<span><strong>${remaining}</strong> of ${med.refills_allowed} refills remaining</span>`;
                if (med.refill_until) {
                    refillText += ` · <span style="font-size:12px; color:var(--text-muted, #64748b);">Valid until ${formatDate(med.refill_until)}</span>`;
                }
            } else {
                refillText = `<span style="color:var(--text-muted, #64748b);">No refills remaining</span>`;
            }
        }

        html += `
            <div class="pmed-card ${!isActive ? 'inactive' : ''}" data-id="${med.id}" data-type="${med.record_type}">
                <div class="pmed-card-header">
                    <div class="pmed-card-title-wrap">
                        <div class="pmed-pill-icon ${iconClass}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path>
                                <path d="m8.5 8.5 7 7"></path>
                            </svg>
                        </div>
                        <div class="pmed-card-titles">
                            <h3>${escapeHtml(med.title)}</h3>
                            <div class="pmed-badges-row">
                                ${typeBadge}
                                ${statusBadge}
                                ${refillPendingBadge}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pmed-card-body">
                    <div class="pmed-info-item">
                        <label>Dosage & Strength</label>
                        <span>${escapeHtml(med.dosage || "-")}</span>
                    </div>
                    <div class="pmed-info-item">
                        <label>Schedule / Frequency</label>
                        <span>${escapeHtml(med.frequency || med.dosage || "As directed")}</span>
                    </div>
                    <div class="pmed-info-item">
                        <label>Prescriber</label>
                        <span>${escapeHtml(prescriber)}</span>
                    </div>
                    <div class="pmed-info-item">
                        <label>Dates</label>
                        <span>${formatDate(med.begin_date)} ${med.end_date ? '– ' + formatDate(med.end_date) : '(Ongoing)'}</span>
                    </div>
                    ${med.rx_number ? `
                    <div class="pmed-info-item">
                        <label>Rx Number</label>
                        <span>${escapeHtml(med.rx_number)}</span>
                    </div>
                    ` : ""}
                    ${med.pharmacy ? `
                    <div class="pmed-info-item">
                        <label>Pharmacy</label>
                        <span>${escapeHtml(med.pharmacy)}</span>
                    </div>
                    ` : ""}
                    ${med.directions ? `
                    <div class="pmed-directions">
                        <strong>Directions:</strong> ${escapeHtml(med.directions)}
                    </div>
                    ` : ""}
                </div>

                <div class="pmed-card-footer">
                    <div class="pmed-refill-status">
                        ${refillText}
                    </div>
                    <div class="pmed-card-actions">
                        ${isRx ? `
                            ${pendingRefill ? `
                                <button type="button" class="pmed-btn pmed-btn-danger btn-cancel-refill" data-request-id="${med.refill_request.id}">
                                    Cancel Request
                                </button>
                            ` : isActive ? `
                                <button type="button" class="pmed-btn pmed-btn-refill btn-request-refill" data-rx-id="${med.id}" data-title="${escapeHtml(med.title)}" data-info="${escapeHtml(med.dosage || '')} · ${escapeHtml(prescriber)}">
                                    Request Refill
                                </button>
                            ` : ""}
                            <button type="button" class="pmed-btn pmed-btn-outline btn-view-details" data-id="${med.id}">
                                Details
                            </button>
                        ` : `
                            <button type="button" class="pmed-btn pmed-btn-outline btn-edit-med" data-id="${med.id}">
                                Edit
                            </button>
                            <button type="button" class="pmed-btn pmed-btn-danger btn-delete-med" data-id="${med.id}">
                                Remove
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;

    attachCardActions();
}

function attachCardActions() {
    // Request Refill Buttons
    document.querySelectorAll(".btn-request-refill").forEach(btn => {
        btn.addEventListener("click", () => {
            const rxId = btn.getAttribute("data-rx-id");
            const title = btn.getAttribute("data-title");
            const info = btn.getAttribute("data-info");
            openRefillModal(rxId, title, info);
        });
    });

    // Cancel Refill Request Buttons
    document.querySelectorAll(".btn-cancel-refill").forEach(btn => {
        btn.addEventListener("click", async () => {
            const requestId = btn.getAttribute("data-request-id");
            if (!confirm("Are you sure you want to cancel this refill request?")) return;

            btn.disabled = true;
            btn.textContent = "Cancelling...";

            const res = await cancelRefillRequest(requestId);
            if (!res?.success) {
                showToast(res?.message || "Failed to cancel refill request.", "error");
                btn.disabled = false;
                btn.textContent = "Cancel Request";
                return;
            }

            showToast("Refill request cancelled.", "success");
            await loadMedications();
        });
    });

    // View Details Buttons
    document.querySelectorAll(".btn-view-details").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            const med = allMedications.find(m => m.id === id);
            if (med) openDetailsModal(med);
        });
    });

    // Edit Home Medication Buttons
    document.querySelectorAll(".btn-edit-med").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            const med = allMedications.find(m => m.id === id);
            if (med) openRecordModal(med);
        });
    });

    // Delete Home Medication Buttons
    document.querySelectorAll(".btn-delete-med").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            if (!confirm("Are you sure you want to remove this medication from your record?")) return;

            btn.disabled = true;
            try {
                const res = await removePatientMedication(id);
                if (!res?.success) {
                    showToast(res?.message || "Failed to remove medication.", "error");
                    btn.disabled = false;
                    return;
                }

                showToast("Medication removed successfully.", "success");
                await loadMedications();
            } catch (err) {
                console.error("Remove med error:", err);
                showToast("An error occurred while removing medication.", "error");
                btn.disabled = false;
            }
        });
    });
}

function setupEventListeners() {
    // Filter Buttons
    const filterTabs = document.getElementById("pmedFilterTabs");
    if (filterTabs) {
        filterTabs.querySelectorAll(".pmed-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                filterTabs.querySelectorAll(".pmed-filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentFilter = btn.getAttribute("data-filter") || "all";
                renderMedications();
            });
        });
    }

    // Search Input
    const searchInput = document.getElementById("pmedSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value || "";
            renderMedications();
        });
    }

    // Record Medication Modal triggers
    document.getElementById("btnOpenRecordModal")?.addEventListener("click", () => openRecordModal());
    document.getElementById("pmedCloseRecordModal")?.addEventListener("click", closeRecordModal);
    document.getElementById("pmedCancelRecordModal")?.addEventListener("click", closeRecordModal);

    // Refill Modal triggers
    document.getElementById("pmedCloseRefillModal")?.addEventListener("click", closeRefillModal);
    document.getElementById("pmedCancelRefillModal")?.addEventListener("click", closeRefillModal);

    // Details Modal triggers
    document.getElementById("pmedCloseDetailsModal")?.addEventListener("click", closeDetailsModal);
    document.getElementById("pmedCloseDetailsBtn")?.addEventListener("click", closeDetailsModal);

    // Form Submissions
    document.getElementById("pmedRecordForm")?.addEventListener("submit", handleRecordSubmit);
    document.getElementById("pmedRefillForm")?.addEventListener("submit", handleRefillSubmit);
}

function openRecordModal(med = null) {
    const modal = document.getElementById("pmedRecordModal");
    if (!modal) return;

    const modalTitle = document.getElementById("pmedRecordModalTitle");
    const inputId = document.getElementById("pmedRecordId");
    const inputTitle = document.getElementById("pmedFormTitle");
    const inputDosage = document.getElementById("pmedFormDosage");
    const inputFreq = document.getElementById("pmedFormFrequency");
    const inputStart = document.getElementById("pmedFormStartDate");
    const inputEnd = document.getElementById("pmedFormEndDate");
    const inputComments = document.getElementById("pmedFormComments");

    if (med) {
        if (modalTitle) modalTitle.textContent = "Edit Medication";
        if (inputId) inputId.value = med.id;
        if (inputTitle) inputTitle.value = med.title || "";
        if (inputDosage) inputDosage.value = med.dosage || "";
        if (inputFreq) inputFreq.value = med.frequency || "";
        if (inputStart) inputStart.value = med.begin_date ? med.begin_date.slice(0, 10) : "";
        if (inputEnd) inputEnd.value = med.end_date ? med.end_date.slice(0, 10) : "";
        if (inputComments) inputComments.value = med.comments || med.directions || "";
    } else {
        if (modalTitle) modalTitle.textContent = "Record Medication";
        if (inputId) inputId.value = "";
        if (inputTitle) inputTitle.value = "";
        if (inputDosage) inputDosage.value = "";
        if (inputFreq) inputFreq.value = "";
        if (inputStart) inputStart.value = new Date().toISOString().slice(0, 10);
        if (inputEnd) inputEnd.value = "";
        if (inputComments) inputComments.value = "";
    }

    modal.classList.add("open");
}

function closeRecordModal() {
    document.getElementById("pmedRecordModal")?.classList.remove("open");
}

async function handleRecordSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("pmedSaveRecordBtn");
    if (btn) btn.disabled = true;

    const id = document.getElementById("pmedRecordId")?.value;
    const title = document.getElementById("pmedFormTitle")?.value?.trim();
    const dosage = document.getElementById("pmedFormDosage")?.value?.trim();
    const freq = document.getElementById("pmedFormFrequency")?.value?.trim();
    const start = document.getElementById("pmedFormStartDate")?.value || null;
    const end = document.getElementById("pmedFormEndDate")?.value || null;
    const comments = document.getElementById("pmedFormComments")?.value?.trim() || null;

    if (!title) {
        showToast("Medication name is required.", "error");
        if (btn) btn.disabled = false;
        return;
    }

    const payload = {
        title,
        begin_date: start,
        end_date: end,
        medication_usage: [dosage, freq].filter(Boolean).join(" · ") || dosage || null,
        comments,
        verification_status: "Confirmed"
    };

    try {
        let res;
        if (id) {
            res = await updatePatientMedication(parseInt(id, 10), payload);
        } else {
            res = await addPatientMedication(null, null, payload);
        }

        if (!res?.success) {
            showToast(res?.message || "Failed to save medication.", "error");
            if (btn) btn.disabled = false;
            return;
        }

        showToast(id ? "Medication updated successfully." : "Medication recorded successfully.", "success");
        closeRecordModal();
        await loadMedications();
    } catch (err) {
        console.error("Save medication error:", err);
        showToast("An error occurred while saving.", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

function openRefillModal(rxId, title, info) {
    const modal = document.getElementById("pmedRefillModal");
    if (!modal) return;

    document.getElementById("pmedRefillRxId").value = rxId;
    document.getElementById("pmedRefillMedTitle").textContent = title;
    document.getElementById("pmedRefillMedInfo").textContent = info;
    document.getElementById("pmedRefillNotes").value = "";

    modal.classList.add("open");
}

function closeRefillModal() {
    document.getElementById("pmedRefillModal")?.classList.remove("open");
}

async function handleRefillSubmit(e) {
    e.preventDefault();
    const rxId = document.getElementById("pmedRefillRxId")?.value;
    const notes = document.getElementById("pmedRefillNotes")?.value?.trim();
    const btn = document.getElementById("pmedSubmitRefillBtn");

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Submitting...";
    }

    try {
        const res = await requestPrescriptionRefill(rxId, notes);

        if (!res?.success) {
            showToast(res?.message || "Failed to submit refill request.", "error");
            if (btn) {
                btn.disabled = false;
                btn.textContent = "Submit Refill Request";
            }
            return;
        }

        const destination = res.data?.sent_to === "pharmacy" ? "the pharmacy" : "your care provider";
        showToast(`Refill request submitted to ${destination}.`, "success");
        closeRefillModal();
        await loadMedications();
    } catch (err) {
        console.error("Refill request error:", err);
        showToast("An error occurred while submitting refill request.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Submit Refill Request";
        }
    }
}

function openDetailsModal(med) {
    const modal = document.getElementById("pmedDetailsModal");
    const content = document.getElementById("pmedDetailsContent");
    if (!modal || !content) return;

    const prescriber = med.prescriber_name ? `Dr. ${med.prescriber_name}` : "Self-Reported";
    const remaining = med.refills_remaining ?? med.refills_allowed ?? 0;

    content.innerHTML = `
        <div style="margin-bottom:16px;">
            <h4 class="pmed-card-titles" style="margin:0 0 8px 0; font-size:17px;">
                <span class="val">${escapeHtml(med.title)}</span>
            </h4>
            <div class="pmed-badges-row">
                <span class="pmed-badge ${med.status === 'active' ? 'pmed-badge-active' : 'pmed-badge-completed'}">${escapeHtml(med.status.toUpperCase())}</span>
                <span class="pmed-badge ${med.record_type === 'prescription' ? 'pmed-badge-rx' : 'pmed-badge-otc'}">${med.record_type === 'prescription' ? 'Prescription' : 'Home / OTC'}</span>
            </div>
        </div>

        <div class="pmed-details-grid" style="margin-bottom:16px;">
            <div class="pmed-details-item">
                <label>Dosage</label>
                <div class="val">${escapeHtml(med.dosage || "-")}</div>
            </div>
            <div class="pmed-details-item">
                <label>Frequency</label>
                <div class="val">${escapeHtml(med.frequency || "As directed")}</div>
            </div>
            <div class="pmed-details-item">
                <label>Prescriber</label>
                <div class="val">${escapeHtml(prescriber)}</div>
            </div>
            <div class="pmed-details-item">
                <label>Rx Number</label>
                <div class="val">${escapeHtml(med.rx_number || "N/A")}</div>
            </div>
            <div class="pmed-details-item">
                <label>Quantity</label>
                <div class="val">${escapeHtml(med.quantity || "-")}</div>
            </div>
            <div class="pmed-details-item">
                <label>Refills</label>
                <div class="val">${med.record_type === 'prescription' ? `${remaining} of ${med.refills_allowed} remaining` : 'N/A'}</div>
            </div>
            <div class="pmed-details-item">
                <label>Start Date</label>
                <div class="val">${formatDate(med.begin_date)}</div>
            </div>
            <div class="pmed-details-item">
                <label>End Date</label>
                <div class="val">${formatDate(med.end_date)}</div>
            </div>
            ${med.pharmacy ? `
            <div class="pmed-details-item" style="grid-column: 1 / -1;">
                <label>Dispensing Pharmacy</label>
                <div class="val">${escapeHtml(med.pharmacy)}</div>
            </div>
            ` : ""}
        </div>

        ${med.directions ? `
        <div class="pmed-directions">
            <strong>Instructions:</strong><br>
            <span>${escapeHtml(med.directions)}</span>
        </div>
        ` : ""}
    `;

    modal.classList.add("open");
}

function closeDetailsModal() {
    document.getElementById("pmedDetailsModal")?.classList.remove("open");
}
