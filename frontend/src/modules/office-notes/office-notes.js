import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { addOfficeNote, updateOfficeNote, deleteOfficeNote } from "./office-notes.service.js";

let currentActivePatientNo = null;
let isAllPatientsScope = false;
let notesState = {
    rows: [],
    total: 0,
    patient: null,
    patients: []
};
let listenerAttached = false;

export async function initOfficeNotes() {
    currentActivePatientNo = getLastActivePatientChart();
    isAllPatientsScope = (!currentActivePatientNo || currentActivePatientNo === 'null');

    setupEventListeners();
    await loadNotes();

    if (!listenerAttached) {
        window.addEventListener('activePatientChanged', async () => {
            if (document.getElementById("onScopeBanner")) {
                currentActivePatientNo = getLastActivePatientChart();
                isAllPatientsScope = false;
                await loadNotes();
            }
        });
        listenerAttached = true;
    }
}

function setupEventListeners() {
    // 1. Scope toggle
    const toggleBtn = document.getElementById("onToggleScopeBtn");
    if (toggleBtn) {
        toggleBtn.onclick = async () => {
            isAllPatientsScope = !isAllPatientsScope;
            await loadNotes();
        };
    }

    // 2. Search input
    const searchInput = document.getElementById("onSearchInput");
    if (searchInput) {
        let debounceTimer = null;
        searchInput.oninput = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadNotes();
            }, 300);
        };
    }

    // 3. Status filter
    const statusFilter = document.getElementById("onStatusFilter");
    if (statusFilter) {
        statusFilter.onchange = () => {
            loadNotes();
        };
    }

    // 4. Refresh button
    const refreshBtn = document.getElementById("onRefreshBtn");
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            loadNotes();
        };
    }

    // 5. Add Note button & Modal
    const newNoteBtn = document.getElementById("onNewNoteBtn");
    const modal = document.getElementById("onNoteModal");
    const closeBtn = document.getElementById("onModalClose");
    const cancelBtn = document.getElementById("onModalCancelBtn");
    const saveBtn = document.getElementById("onModalSaveBtn");

    const closeModal = () => {
        if (modal) modal.style.display = "none";
    };

    if (newNoteBtn) {
        newNoteBtn.onclick = () => openNoteModal();
    }
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const id = document.getElementById("onNoteId")?.value;
            const patientId = document.getElementById("onModalPatientSelect")?.value;
            const noteText = document.getElementById("onModalNoteText")?.value?.trim();
            const isActive = document.getElementById("onModalActiveCb")?.checked ? 1 : 0;

            if (!patientId) {
                showToast("Please select a patient.", "warning");
                return;
            }

            if (!noteText) {
                showToast("Please enter office note content.", "warning");
                return;
            }

            try {
                if (id) {
                    const res = await updateOfficeNote(Number(id), {
                        note: noteText,
                        active: isActive
                    });
                    if (res.success) {
                        showToast("Office note updated successfully.", "success");
                        closeModal();
                        await loadNotes();
                    } else {
                        showToast(res.message || "Failed to update note.", "error");
                    }
                } else {
                    const res = await addOfficeNote(Number(patientId), noteText);
                    if (res.success) {
                        showToast("Office note added successfully.", "success");
                        closeModal();
                        await loadNotes();
                    } else {
                        showToast(res.message || "Failed to add note.", "error");
                    }
                }
            } catch (err) {
                console.error(err);
                showToast("Error saving office note.", "error");
            }
        };
    }
}

async function loadNotes() {
    const search = document.getElementById("onSearchInput")?.value?.trim() || "";
    const filter = document.getElementById("onStatusFilter")?.value || "active";

    let queryParts = [`filter=${encodeURIComponent(filter)}`];
    if (!isAllPatientsScope && currentActivePatientNo) {
        queryParts.push(`patient_no=${encodeURIComponent(currentActivePatientNo)}`);
    }
    if (search) {
        queryParts.push(`search=${encodeURIComponent(search)}`);
    }

    try {
        const res = await api(`/office-notes?${queryParts.join('&')}`);
        if (res.success && res.data) {
            notesState = res.data;
            renderBanner();
            renderTable();
        }
    } catch (err) {
        console.error("Failed to fetch office notes", err);
        showToast("Error loading office notes.", "error");
    }
}

function renderBanner() {
    const banner = document.getElementById("onScopeBanner");
    const avatar = document.getElementById("onPatientAvatar");
    const nameEl = document.getElementById("onPatientName");
    const metaEl = document.getElementById("onPatientMeta");
    const badgeEl = document.getElementById("onPatientBadge");
    const toggleLabel = document.getElementById("onToggleScopeLabel");

    if (!banner) return;

    if (!isAllPatientsScope && notesState.patient) {
        const p = notesState.patient;
        const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || 'PT';
        if (avatar) avatar.textContent = initials;
        if (nameEl) nameEl.textContent = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        if (metaEl) metaEl.textContent = `Chart: ${p.patient_no} | DOB: ${p.birthdate || 'N/A'} | Sex: ${p.sex || 'N/A'}`;
        if (badgeEl) {
            badgeEl.className = "on-badge on-badge-active";
            badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span> Active Open Patient`;
        }
        if (toggleLabel) toggleLabel.textContent = "View All Patients Notes";
    } else {
        if (avatar) avatar.textContent = "ALL";
        if (nameEl) nameEl.textContent = "All Patients Office Notes";
        if (metaEl) metaEl.textContent = "Showing practice-wide administrative and clinical office notes";
        if (badgeEl) {
            badgeEl.className = "on-badge on-badge-all";
            badgeEl.innerHTML = `<i class="fas fa-hospital-user"></i> Practice-Wide View`;
        }
        if (toggleLabel) toggleLabel.textContent = currentActivePatientNo ? `Switch to Active Patient (${currentActivePatientNo})` : "Filter by Patient";
    }
}

function renderTable() {
    const tbody = document.getElementById("onTableBody");
    const countLabel = document.getElementById("onTotalCountLabel");
    if (!tbody) return;

    const rows = notesState.rows || [];
    if (countLabel) {
        countLabel.textContent = `Total: ${rows.length} note${rows.length === 1 ? '' : 's'}`;
    }

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-sticky-note" style="font-size: 32px; margin-bottom: 10px; display: block; color: #cbd5e1;"></i>
                    No office notes found matching current filters.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = rows.map(note => {
        const isActive = Number(note.active) === 1;
        const statusClass = isActive ? 'on-tag-active' : 'on-tag-inactive';
        const statusText = isActive ? 'Active' : 'Inactive';
        const dateDisplay = note.created_at ? formatDateTime(note.created_at) : 'N/A';

        return `
            <tr data-id="${note.id}">
                <td style="white-space: nowrap; font-weight: 500;">
                    ${escapeHtml(dateDisplay)}
                </td>
                <td>
                    <div style="font-weight: 600; color: #0284c7;">${escapeHtml(note.patient_name || 'Patient')}</div>
                    <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(note.patient_no || '')}</div>
                </td>
                <td style="font-weight: 500;">
                    ${escapeHtml(note.author || 'Staff')}
                </td>
                <td style="line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                    ${escapeHtml(note.note)}
                </td>
                <td style="text-align: center;">
                    <span class="on-tag ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: flex; justify-content: flex-end; gap: 5px;">
                        <button class="on-btn-outline on-toggle-active-btn" data-id="${note.id}" data-active="${isActive ? 0 : 1}" style="padding: 4px 8px; font-size: 11.5px;" title="${isActive ? 'Set Inactive' : 'Set Active'}">
                            <i class="fas ${isActive ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        </button>
                        <button class="on-btn-outline on-edit-btn" data-id="${note.id}" style="padding: 4px 8px; font-size: 11.5px;" title="Edit Note">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="on-btn-outline on-delete-btn" data-id="${note.id}" style="padding: 4px 8px; font-size: 11.5px; color: #dc2626; border-color: #fca5a5;" title="Delete Note">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Toggle Active / Inactive
    tbody.querySelectorAll(".on-toggle-active-btn").forEach(btn => {
        btn.onclick = async () => {
            const id = Number(btn.dataset.id);
            const newActive = Number(btn.dataset.active);
            try {
                const res = await updateOfficeNote(id, { active: newActive });
                if (res.success) {
                    showToast(`Note marked as ${newActive ? 'Active' : 'Inactive'}.`, "success");
                    await loadNotes();
                } else {
                    showToast(res.message || "Failed to update note status.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error updating note status.", "error");
            }
        };
    });

    // Edit Note
    tbody.querySelectorAll(".on-edit-btn").forEach(btn => {
        btn.onclick = () => {
            const id = Number(btn.dataset.id);
            const note = notesState.rows.find(n => Number(n.id) === id);
            if (note) openNoteModal(note);
        };
    });

    // Delete Note
    tbody.querySelectorAll(".on-delete-btn").forEach(btn => {
        btn.onclick = async () => {
            const id = Number(btn.dataset.id);
            if (!confirm("Are you sure you want to delete this office note?")) return;

            try {
                const res = await deleteOfficeNote(id);
                if (res.success) {
                    showToast("Office note deleted.", "success");
                    await loadNotes();
                } else {
                    showToast(res.message || "Failed to delete note.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error deleting note.", "error");
            }
        };
    });
}

function openNoteModal(note = null) {
    const modal = document.getElementById("onNoteModal");
    const title = document.getElementById("onModalTitle");
    const patientSelect = document.getElementById("onModalPatientSelect");
    const noteInput = document.getElementById("onModalNoteText");
    const activeCb = document.getElementById("onModalActiveCb");
    const idInput = document.getElementById("onNoteId");

    if (!modal) return;

    // Populate patient select
    if (patientSelect) {
        patientSelect.innerHTML = (notesState.patients || []).map(p => {
            const isSelected = note 
                ? (Number(p.id) === Number(note.patient_id)) 
                : (notesState.patient && Number(p.id) === Number(notesState.patient.id));
            return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.patient_no)})</option>`;
        }).join('');
    }

    if (note) {
        if (title) title.textContent = "Edit Office Note";
        if (idInput) idInput.value = note.id;
        if (noteInput) noteInput.value = note.note || '';
        if (activeCb) activeCb.checked = (Number(note.active) === 1);
    } else {
        if (title) title.textContent = "Add Office Note";
        if (idInput) idInput.value = '';
        if (noteInput) noteInput.value = '';
        if (activeCb) activeCb.checked = true;
    }

    modal.style.display = "flex";
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDateTime(value) {
    if (!value) return "N/A";
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}
