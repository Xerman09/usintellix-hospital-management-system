import {
    fetchAnnouncements,
    fetchAnnouncementRoles,
    fetchAnnouncement,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementImageUrl
} from "./announcements.service.js";
import { showToast } from "../../core/toast.js";

let availableRoles = [];
let currentAnnouncements = [];
let activeFilters = {
    search: "",
    status: "all",
    priority: "all",
    role: "all"
};

export async function initAnnouncements() {
    setupModals();
    setupFilters();
    setupForm();
    await loadRoles();
    await loadAnnouncements();
}

async function loadRoles() {
    try {
        const res = await fetchAnnouncementRoles();
        if (res.success && Array.isArray(res.data)) {
            availableRoles = res.data;
            populateRolesCheckboxes();
            populateRoleFilterSelect();
        }
    } catch (e) {
        console.error("Failed to load roles", e);
    }
}

function populateRoleFilterSelect() {
    const select = document.getElementById("annRoleFilter");
    if (!select) return;

    select.innerHTML = `<option value="all">All Roles</option>`;
    availableRoles.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.role;
        opt.textContent = r.label;
        select.appendChild(opt);
    });
}

function populateRolesCheckboxes() {
    const container = document.getElementById("annRolesCheckboxesGrid");
    if (!container) return;

    container.innerHTML = "";
    availableRoles.forEach(r => {
        const label = document.createElement("label");
        label.className = "ann-checkbox-label";
        label.innerHTML = `
            <input type="checkbox" name="role_items" value="${escapeHtml(r.role)}">
            <span>${escapeHtml(r.label)}</span>
        `;
        container.appendChild(label);
    });

    const allCheckbox = document.getElementById("annRoleAllCheckbox");
    const roleCheckboxes = container.querySelectorAll('input[name="role_items"]');

    if (allCheckbox) {
        allCheckbox.onchange = () => {
            if (allCheckbox.checked) {
                roleCheckboxes.forEach(cb => { cb.checked = false; });
            }
        };

        roleCheckboxes.forEach(cb => {
            cb.onchange = () => {
                const anyChecked = Array.from(roleCheckboxes).some(c => c.checked);
                if (anyChecked) {
                    allCheckbox.checked = false;
                } else {
                    allCheckbox.checked = true;
                }
            };
        });
    }
}

async function loadAnnouncements() {
    const grid = document.getElementById("announcementsGrid");
    if (!grid) return;

    grid.innerHTML = `
        <div class="ann-empty-wrap">
            <div style="font-weight: 500;">Loading announcements...</div>
        </div>
    `;

    try {
        const res = await fetchAnnouncements(activeFilters);
        if (res.success && res.data) {
            currentAnnouncements = res.data.announcements || [];
            updateStats(res.data.counts || {});
            renderAnnouncements(currentAnnouncements);
        } else {
            grid.innerHTML = `
                <div class="ann-empty-wrap">
                    <div style="color: #dc2626;">Failed to load announcements: ${escapeHtml(res.message || "Unknown error")}</div>
                </div>
            `;
        }
    } catch (e) {
        grid.innerHTML = `
            <div class="ann-empty-wrap">
                <div style="color: #dc2626;">Network error while fetching announcements.</div>
            </div>
        `;
    }
}

function updateStats(counts) {
    const totalEl = document.getElementById("annStatTotal");
    const activeEl = document.getElementById("annStatActive");
    const scheduledEl = document.getElementById("annStatScheduled");
    const expiredEl = document.getElementById("annStatExpired");

    if (totalEl) totalEl.textContent = counts.total ?? 0;
    if (activeEl) activeEl.textContent = counts.active ?? 0;
    if (scheduledEl) scheduledEl.textContent = counts.scheduled ?? 0;
    if (expiredEl) expiredEl.textContent = (counts.expired ?? 0) + (counts.inactive ?? 0);
}

function renderAnnouncements(items) {
    const grid = document.getElementById("announcementsGrid");
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="ann-empty-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <div class="ann-empty-title">No announcements found</div>
                <div class="ann-empty-desc">Create your first announcement to keep hospital staff and patients informed.</div>
                <button type="button" class="ann-btn-primary" onclick="document.getElementById('annOpenCreateBtn')?.click();">
                    Create Announcement
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => {
        const imageUrl = getAnnouncementImageUrl(item.image_url);
        const mediaHtml = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">`
            : `<div class="ann-card-no-img">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                 <span>No image uploaded</span>
               </div>`;

        const statusClass = `ann-badge-${item.computed_status}`;
        const statusLabel = capitalize(item.computed_status);

        const priorityClass = `ann-priority-${item.priority || "normal"}`;
        const priorityLabel = capitalize(item.priority || "normal");

        const targetRoles = item.target_roles || [];
        const isAllRoles = targetRoles.includes("all") || targetRoles.length === 0;
        const rolesHtml = isAllRoles
            ? `<span class="ann-role-chip" style="background: #e0f2fe; color: #0369a1; font-weight: 600;">All Roles</span>`
            : targetRoles.map(r => `<span class="ann-role-chip">${escapeHtml(capitalize(r))}</span>`).join("");

        const endText = item.formatted_end ? item.formatted_end : "Ongoing";

        return `
        <div class="ann-card" data-id="${item.id}">
            <div class="ann-card-media">
                ${mediaHtml}
                <div class="ann-card-badges">
                    <span class="ann-badge ${statusClass}">${statusLabel}</span>
                    <span class="ann-priority-badge ${priorityClass}">${priorityLabel}</span>
                </div>
            </div>
            <div class="ann-card-body">
                <h3 class="ann-card-title">${escapeHtml(item.title)}</h3>
                <p class="ann-card-content">${escapeHtml(item.content)}</p>
                <div class="ann-card-meta">
                    <div class="ann-meta-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>${escapeHtml(item.formatted_start)} &rarr; ${escapeHtml(endText)}</span>
                    </div>
                    <div class="ann-meta-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <div class="ann-roles-wrap">${rolesHtml}</div>
                    </div>
                </div>
            </div>
            <div class="ann-card-actions">
                <button type="button" class="ann-action-btn view-btn" data-id="${item.id}">View Details</button>
                <button type="button" class="ann-action-btn edit-btn" data-id="${item.id}">Edit</button>
                <button type="button" class="ann-action-btn delete delete-btn" data-id="${item.id}">Delete</button>
            </div>
        </div>
        `;
    }).join("");

    // Attach card action listeners
    grid.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", () => openViewModal(parseInt(btn.dataset.id)));
    });

    grid.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(parseInt(btn.dataset.id)));
    });

    grid.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => handleDelete(parseInt(btn.dataset.id)));
    });
}

function setupFilters() {
    const searchInput = document.getElementById("annSearchInput");
    const statusSelect = document.getElementById("annStatusFilter");
    const roleSelect = document.getElementById("annRoleFilter");
    const resetBtn = document.getElementById("annResetFiltersBtn");

    let debounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                activeFilters.search = e.target.value.trim();
                loadAnnouncements();
            }, 300);
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
            activeFilters.status = e.target.value;
            loadAnnouncements();
        });
    }

    if (roleSelect) {
        roleSelect.addEventListener("change", (e) => {
            activeFilters.role = e.target.value;
            loadAnnouncements();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            activeFilters = { search: "", status: "all", priority: "all", role: "all" };
            if (searchInput) searchInput.value = "";
            if (statusSelect) statusSelect.value = "all";
            if (roleSelect) roleSelect.value = "all";
            loadAnnouncements();
        });
    }
}

function setupModals() {
    const openCreateBtn = document.getElementById("annOpenCreateBtn");
    const formModal = document.getElementById("annFormModalOverlay");
    const formClose = document.getElementById("annFormModalClose");
    const formCancel = document.getElementById("annFormCancelBtn");

    const viewModal = document.getElementById("annViewModalOverlay");
    const viewClose = document.getElementById("annViewModalClose");
    const viewCloseBtn = document.getElementById("annViewCloseBtn");

    if (openCreateBtn) {
        openCreateBtn.addEventListener("click", () => openCreateModal());
    }

    const closeForm = () => {
        if (formModal) formModal.classList.remove("open");
    };

    if (formClose) formClose.addEventListener("click", closeForm);
    if (formCancel) formCancel.addEventListener("click", closeForm);

    const closeView = () => {
        if (viewModal) viewModal.classList.remove("open");
    };

    if (viewClose) viewClose.addEventListener("click", closeView);
    if (viewCloseBtn) viewCloseBtn.addEventListener("click", closeView);

    // Click outside to close
    window.addEventListener("click", (e) => {
        if (e.target === formModal) closeForm();
        if (e.target === viewModal) closeView();
    });

    // Dropzone image upload trigger
    const dropzone = document.getElementById("annImageDropzone");
    const fileInput = document.getElementById("annImageFileInput");
    const previewWrap = document.getElementById("annImagePreviewWrap");
    const previewImg = document.getElementById("annImagePreviewTag");
    const removeImgBtn = document.getElementById("annRemoveImageBtn");
    const removeImageFlag = document.getElementById("annRemoveImageInput");

    if (dropzone && fileInput) {
        dropzone.addEventListener("click", () => fileInput.click());

        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "#2563eb";
            dropzone.style.background = "#eff6ff";
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.style.borderColor = "";
            dropzone.style.background = "";
        });

        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "";
            dropzone.style.background = "";
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelected(fileInput.files[0]);
            }
        });

        fileInput.addEventListener("change", () => {
            if (fileInput.files && fileInput.files[0]) {
                handleFileSelected(fileInput.files[0]);
            }
        });
    }

    function handleFileSelected(file) {
        if (!file.type.startsWith("image/")) {
            showToast("Please choose a valid image file (JPG, PNG, WEBP, GIF).", "error");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast("File is too large. Max 10MB.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            previewImg.src = evt.target.result;
            previewWrap.style.display = "block";
            dropzone.style.display = "none";
            if (removeImageFlag) removeImageFlag.value = "0";
        };
        reader.readAsDataURL(file);
    }

    if (removeImgBtn) {
        removeImgBtn.addEventListener("click", () => {
            if (fileInput) fileInput.value = "";
            previewImg.src = "";
            previewWrap.style.display = "none";
            dropzone.style.display = "block";
            if (removeImageFlag) removeImageFlag.value = "1";
        });
    }
}

async function openCreateModal() {
    const modal = document.getElementById("annFormModalOverlay");
    const form = document.getElementById("announcementForm");
    const title = document.getElementById("annFormModalTitle");
    const idInput = document.getElementById("annIdInput");
    const removeImgFlag = document.getElementById("annRemoveImageInput");
    const fileInput = document.getElementById("annImageFileInput");
    const dropzone = document.getElementById("annImageDropzone");
    const previewWrap = document.getElementById("annImagePreviewWrap");
    const previewImg = document.getElementById("annImagePreviewTag");

    if (!modal || !form) return;

    // Ensure roles are fetched and populated
    if (!availableRoles || availableRoles.length === 0) {
        await loadRoles();
    } else {
        populateRolesCheckboxes();
    }

    form.reset();
    idInput.value = "";
    removeImgFlag.value = "0";
    if (fileInput) fileInput.value = "";
    if (previewImg) previewImg.src = "";
    if (previewWrap) previewWrap.style.display = "none";
    if (dropzone) dropzone.style.display = "block";

    title.textContent = "New Announcement";

    // Set default start_date to current local time (YYYY-MM-DDTHH:mm)
    const now = new Date();
    const localIso = formatForDateTimeLocal(now);
    const startDateInput = document.getElementById("annStartDateInput");
    if (startDateInput) startDateInput.value = localIso;

    // Reset roles
    const allCheckbox = document.getElementById("annRoleAllCheckbox");
    if (allCheckbox) allCheckbox.checked = true;
    document.querySelectorAll('input[name="role_items"]').forEach(cb => cb.checked = false);

    modal.classList.add("open");
}

async function openEditModal(id) {
    const modal = document.getElementById("annFormModalOverlay");
    const title = document.getElementById("annFormModalTitle");
    const idInput = document.getElementById("annIdInput");
    const removeImgFlag = document.getElementById("annRemoveImageInput");
    const fileInput = document.getElementById("annImageFileInput");
    const dropzone = document.getElementById("annImageDropzone");
    const previewWrap = document.getElementById("annImagePreviewWrap");
    const previewImg = document.getElementById("annImagePreviewTag");

    try {
        // Ensure roles are fetched and populated
        if (!availableRoles || availableRoles.length === 0) {
            await loadRoles();
        } else {
            populateRolesCheckboxes();
        }

        const res = await fetchAnnouncement(id);
        if (!res.success || !res.data) {
            showToast("Failed to load announcement details.", "error");
            return;
        }

        const data = res.data;
        title.textContent = "Edit Announcement";
        idInput.value = data.id;
        removeImgFlag.value = "0";
        if (fileInput) fileInput.value = "";

        document.getElementById("annTitleInput").value = data.title || "";
        document.getElementById("annContentInput").value = data.content || "";
        document.getElementById("annPrioritySelect").value = data.priority || "normal";
        document.getElementById("annStatusSelect").value = data.status || "active";

        if (data.start_date) {
            document.getElementById("annStartDateInput").value = formatForDateTimeLocal(new Date(data.start_date));
        }
        if (data.end_date) {
            document.getElementById("annEndDateInput").value = formatForDateTimeLocal(new Date(data.end_date));
        } else {
            document.getElementById("annEndDateInput").value = "";
        }

        // Target roles
        const rawRoles = data.target_roles || [];
        const targetRoles = rawRoles.map(r => String(r).toLowerCase());
        const isAll = targetRoles.includes("all") || targetRoles.length === 0;
        const allCheckbox = document.getElementById("annRoleAllCheckbox");
        if (allCheckbox) allCheckbox.checked = isAll;

        document.querySelectorAll('input[name="role_items"]').forEach(cb => {
            cb.checked = !isAll && targetRoles.includes(cb.value.toLowerCase());
        });

        // Image
        if (data.image_url) {
            const fullUrl = getAnnouncementImageUrl(data.image_url);
            previewImg.src = fullUrl;
            previewWrap.style.display = "block";
            dropzone.style.display = "none";
        } else {
            previewImg.src = "";
            previewWrap.style.display = "none";
            dropzone.style.display = "block";
        }

        modal.classList.add("open");
    } catch (e) {
        showToast("Error retrieving announcement.", "error");
    }
}

async function openViewModal(id) {
    const modal = document.getElementById("annViewModalOverlay");
    if (!modal) return;

    try {
        const res = await fetchAnnouncement(id);
        if (!res.success || !res.data) {
            showToast("Failed to load announcement.", "error");
            return;
        }

        const data = res.data;
        document.getElementById("annViewTitle").textContent = data.title;
        document.getElementById("annViewContent").textContent = data.content;
        document.getElementById("annViewStart").textContent = data.formatted_start || data.start_date;
        document.getElementById("annViewEnd").textContent = data.formatted_end || data.end_date || "Ongoing";
        document.getElementById("annViewPriority").textContent = capitalize(data.priority || "normal");
        document.getElementById("annViewAuthor").textContent = data.author_name || "Staff";

        const targetRoles = data.target_roles || [];
        const isAll = targetRoles.includes("all") || targetRoles.length === 0;
        document.getElementById("annViewAudience").textContent = isAll
            ? "All Roles (Everyone)"
            : targetRoles.map(r => capitalize(r)).join(", ");

        const statusClass = `ann-badge-${data.computed_status}`;
        document.getElementById("annViewStatusBadge").innerHTML = `
            <span class="ann-badge ${statusClass}">${capitalize(data.computed_status)}</span>
        `;

        const heroWrap = document.getElementById("annViewHero");
        const heroImg = document.getElementById("annViewHeroImg");
        if (data.image_url) {
            heroImg.src = getAnnouncementImageUrl(data.image_url);
            heroWrap.style.display = "block";
        } else {
            heroWrap.style.display = "none";
        }

        modal.classList.add("open");
    } catch (e) {
        showToast("Error loading details.", "error");
    }
}

function setupForm() {
    const form = document.getElementById("announcementForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("annFormSubmitBtn");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";

        try {
            const formData = new FormData(form);

            // Determine selected roles
            const allCheckbox = document.getElementById("annRoleAllCheckbox");
            let selectedRoles = [];
            if (allCheckbox && allCheckbox.checked) {
                selectedRoles = ["all"];
            } else {
                document.querySelectorAll('input[name="role_items"]:checked').forEach(cb => {
                    selectedRoles.push(cb.value);
                });
                if (selectedRoles.length === 0) {
                    selectedRoles = ["all"];
                }
            }

            formData.delete("roles");
            selectedRoles.forEach(r => formData.append("roles[]", r));

            const id = document.getElementById("annIdInput").value;
            let res;
            if (id) {
                res = await updateAnnouncement(formData);
            } else {
                res = await createAnnouncement(formData);
            }

            if (res.success) {
                showToast(res.message || "Announcement saved successfully!", "success");
                document.getElementById("annFormModalOverlay")?.classList.remove("open");
                await loadAnnouncements();
            } else {
                const msg = res.message || (res.errors ? Object.values(res.errors).join("<br>") : "Failed to save announcement.");
                showToast(msg, "error");
            }
        } catch (err) {
            showToast("An error occurred while saving.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) {
        return;
    }

    try {
        const res = await deleteAnnouncement(id);
        if (res.success) {
            showToast(res.message || "Announcement deleted successfully.", "success");
            await loadAnnouncements();
        } else {
            showToast(res.message || "Failed to delete announcement.", "error");
        }
    } catch (e) {
        showToast("Error deleting announcement.", "error");
    }
}

function formatForDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(value) {
    if (!value) return "";
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}