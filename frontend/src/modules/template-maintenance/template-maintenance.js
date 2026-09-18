import { showToast } from "../../core/toast.js";
import { fetchDocumentTemplates, uploadDocumentTemplate, deleteDocumentTemplate } from "../document-templates/document-templates.service.js";
import { API_URL } from "../../core/api.js";
import { fetchPatients } from "../patients/patients.service.js";
import {
    fetchTemplateCategories, createTemplateCategory, updateTemplateCategory, deleteTemplateCategory,
    fetchTemplateGroups, createTemplateGroup, updateTemplateGroup, deleteTemplateGroup,
    fetchTemplateProfiles, createTemplateProfile, updateTemplateProfile, deleteTemplateProfile, setTemplateProfileActive,
    fetchDefaultTemplateAssignments, fetchPatientTemplateAssignments, assignTemplates, unassignTemplate,
    updateTemplateFileCategory
} from "./template-maintenance.service.js";
import { TemplateMaintenanceView } from "./template-maintenance.view.js";

let repositoryTemplates = [];
let categories = [];
let groups = [];
let profiles = [];
let patientsCache = [];

// scope.type: "none" | "all_patients" | "patient"
let scope = { type: "none", patientId: null, patientLabel: "" };

let wired = false;

/**
 * Opens Template Maintenance as a modal, optionally pre-scoped to one
 * patient (the "Documents / Assign" action on that patient's Patient
 * Portal / API Access widget passes their own patient object; the File
 * Management nav entry opens it unscoped). The modal is a singleton --
 * injected into <body> once on first open from wherever it's triggered,
 * then just shown/reset on every open after that, since it needs to be
 * reachable from any page, not just one pre-rendered view's own markup.
 */
export async function openTemplateMaintenance(presetPatient = null)
{
    if (!document.getElementById("templateMaintenanceModalOverlay")) {
        document.body.insertAdjacentHTML("beforeend", TemplateMaintenanceView());
    }

    if (!wired) {
        wireTemplateMaintenance();
        wired = true;
    }

    document.getElementById("templateMaintenanceModalOverlay").classList.add("open");

    await Promise.all([loadCategories(), loadRepository(), loadGroups(), loadProfiles()]);
    // Those four ran in parallel, so a render that reads another one's
    // state (repository rows read categories; the portal profiles table
    // reads groups) could have run before its dependency settled -- now
    // that everything above is guaranteed done, re-render both once more.
    renderRepositoryTable();
    renderProfilesPortalTable();
    await loadDefaultAssignments();

    if (presetPatient) {
        applyScope("patient", presetPatient.id, patientLabel(presetPatient));
        document.getElementById("tmplScopeSearch").value = patientLabel(presetPatient);
    } else {
        applyScope("none", null, "");
        document.getElementById("tmplScopeSearch").value = "";
    }
}

/** Kept as the historical entry point name used by the patient chart's
 * Patient Portal / API Access widget -- just forwards to the modal now. */
export function openTemplateMaintenanceForPatient(patient)
{
    return openTemplateMaintenance(patient);
}

function wireTemplateMaintenance()
{
    const closeModal = () => document.getElementById("templateMaintenanceModalOverlay").classList.remove("open");

    document.getElementById("tmplHelpLink").addEventListener("click", () => {
        showToast("No help documentation is configured for this screen yet.", "success");
    });

    document.getElementById("tmplDashboardBtn").addEventListener("click", closeModal);
    document.getElementById("closeTemplateMaintenanceModal").addEventListener("click", closeModal);
    document.getElementById("templateMaintenanceModalOverlay").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) closeModal();
    });

    wireScopeSearch();
    wireRepositoryPanel();
    wireUpload();
    wireSectionToggles();
    setupCategoriesModal();
    setupGroupsModal();
    setupProfilesModal();
}

function patientLabel(patient)
{
    const name = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");

    return `${name} (${patient.patient_no})`;
}

// ---------------------------------------------------------------------
// Category dropdown + Repository panel (checkboxes + Submit = bulk tag)
// ---------------------------------------------------------------------

async function loadCategories()
{
    const result = await fetchTemplateCategories();
    categories = result.success ? result.data : [];

    const options = `<option value="">Select...</option>` +
        categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

    document.getElementById("tmplCategorySelect").innerHTML = options;

    const profileCategorySelect = document.getElementById("tmplProfileCategory");
    if (profileCategorySelect) {
        profileCategorySelect.innerHTML = `<option value="">None</option>` +
            categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    }

    renderCategoriesTable();
}

function setupCategoriesModal()
{
    const overlay = document.getElementById("tmplCategoriesModalOverlay");
    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("tmplCategoriesBtn").addEventListener("click", () => {
        overlay.classList.add("open");
        resetCategoryForm();
        loadCategories();
    });
    document.getElementById("closeTmplCategoriesModal").addEventListener("click", closeModal);
    document.getElementById("tmplCategoryCancelBtn").addEventListener("click", resetCategoryForm);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeModal();
    });

    document.getElementById("tmplCategoryForm").addEventListener("submit", async () => {
        const id = document.getElementById("tmplCategoryId").value;
        const name = document.getElementById("tmplCategoryName").value.trim();
        const description = document.getElementById("tmplCategoryDescription").value.trim();

        document.getElementById("err-tmplCategoryName").textContent = "";

        if (!name) {
            document.getElementById("err-tmplCategoryName").textContent = "Name is required.";
            return;
        }

        const data = { name, description };
        const result = id ? await updateTemplateCategory(id, data) : await createTemplateCategory(data);

        if (!result.success) {
            document.getElementById("tmplCategoryFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to save category.")}</div>`;
            if (result.errors?.name) document.getElementById("err-tmplCategoryName").textContent = result.errors.name;
            return;
        }

        showToast(result.message, "success");
        resetCategoryForm();
        await loadCategories();
        await loadRepository();
    });
}

function resetCategoryForm()
{
    document.getElementById("tmplCategoryId").value = "";
    document.getElementById("tmplCategoryName").value = "";
    document.getElementById("tmplCategoryDescription").value = "";
    document.getElementById("tmplCategoryFormAlert").innerHTML = "";
    document.getElementById("err-tmplCategoryName").textContent = "";
    document.getElementById("tmplCategorySaveBtn").textContent = "Add Category";
}

function renderCategoriesTable()
{
    const tbody = document.getElementById("tmplCategoriesTableBody");
    if (!tbody) return;

    tbody.innerHTML = categories.length
        ? categories.map((c) => `
            <tr>
                <td>${escapeHtml(c.name)}</td>
                <td>${c.description ? escapeHtml(c.description) : "-"}</td>
                <td>
                    <button type="button" class="btn-secondary tmpl-category-edit-btn" data-category-id="${c.id}" style="padding: 4px 8px; margin-right: 4px;">Edit</button>
                    <button type="button" class="btn-secondary tmpl-category-delete-btn" data-category-id="${c.id}" style="padding: 4px 8px; color: #dc2626;">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="3" class="table-empty">No categories yet.</td></tr>`;

    tbody.querySelectorAll(".tmpl-category-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const category = categories.find((c) => String(c.id) === btn.getAttribute("data-category-id"));
            if (!category) return;

            document.getElementById("tmplCategoryId").value = category.id;
            document.getElementById("tmplCategoryName").value = category.name;
            document.getElementById("tmplCategoryDescription").value = category.description || "";
            document.getElementById("tmplCategorySaveBtn").textContent = "Save Changes";
        });
    });

    tbody.querySelectorAll(".tmpl-category-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this category?")) return;

            const result = await deleteTemplateCategory(btn.getAttribute("data-category-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete category.", "error");
                return;
            }

            showToast(result.message, "success");
            await loadCategories();
            await loadRepository();
        });
    });
}

async function loadRepository()
{
    const result = await fetchDocumentTemplates();
    repositoryTemplates = result.success ? result.data : [];

    renderRepositoryTable();
    renderGroupTemplatesPicker();
    renderSectionCount("tmplRepositoryCount", repositoryTemplates.length);
}

function renderRepositoryTable()
{
    const tbody = document.getElementById("tmplRepositoryBody");
    if (!tbody) return;

    tbody.innerHTML = repositoryTemplates.length
        ? repositoryTemplates.map((tpl) => `
            <tr>
                <td><input type="checkbox" class="tmpl-template-checkbox" data-filename="${escapeAttr(tpl.filename)}"></td>
                <td>
                    <select class="tmpl-row-category-select" data-filename="${escapeAttr(tpl.filename)}">
                        <option value="">Uncategorized</option>
                        ${categories.map((c) => `<option value="${c.id}" ${c.id === tpl.category_id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
                    </select>
                </td>
                <td>
                    <button type="button" class="tmpl-name-link tmpl-template-open-btn" data-path="${escapeAttr(tpl.file_path)}">${escapeHtml(displayName(tpl.filename))}</button>
                    <button type="button" class="tmpl-delete-link tmpl-template-delete-btn" data-filename="${escapeAttr(tpl.filename)}">Delete</button>
                </td>
                <td>${tpl.size ?? "-"}</td>
                <td>${escapeHtml(String(tpl.modified_at || "").slice(0, 10))}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="5" class="table-empty">No templates in the repository yet.</td></tr>`;

    tbody.querySelectorAll(".tmpl-row-category-select").forEach((select) => {
        select.addEventListener("change", async () => {
            select.disabled = true;

            const result = await updateTemplateFileCategory(select.getAttribute("data-filename"), select.value || null);

            select.disabled = false;

            if (!result.success) {
                showToast(result.message || "Failed to update category.", "error");
                return;
            }

            await loadRepository();
        });
    });

    tbody.querySelectorAll(".tmpl-template-open-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            window.open(`${API_URL}${btn.getAttribute("data-path")}`, "_blank", "noopener");
        });
    });

    tbody.querySelectorAll(".tmpl-template-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const filename = btn.getAttribute("data-filename");

            if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

            const result = await deleteDocumentTemplate(filename);

            if (!result.success) {
                showToast(result.message || "Failed to delete template.", "error");
                return;
            }

            showToast(result.message, "success");
            await loadRepository();
        });
    });
}

/**
 * The repository has no separate display-name field (see
 * DocumentTemplateService) -- the destination filename chosen at upload
 * time doubles as the friendly name, so this just drops a redundant
 * extension for a cleaner label without inventing data that isn't there.
 */
function displayName(filename)
{
    return filename.replace(/\.[a-z0-9]+$/i, "");
}

function wireRepositoryPanel()
{
    document.getElementById("tmplSelectAllTemplates").addEventListener("change", (event) => {
        document.querySelectorAll(".tmpl-template-checkbox").forEach((cb) => {
            cb.checked = event.target.checked;
        });
    });

    document.getElementById("tmplSubmitBtn").addEventListener("click", async () => {
        const filenames = checkedTemplateFilenames();
        const categoryId = document.getElementById("tmplCategorySelect").value;

        if (!filenames.length) {
            showToast("Check at least one template first.", "error");
            return;
        }
        if (!categoryId) {
            showToast("Choose a Category first.", "error");
            return;
        }

        for (const filename of filenames) {
            await updateTemplateFileCategory(filename, categoryId);
        }

        showToast(`Category applied to ${filenames.length} template${filenames.length === 1 ? "" : "s"}.`, "success");
        await loadRepository();
    });

    document.getElementById("tmplAssignBtn").addEventListener("click", handleAssign);
}

function wireUpload()
{
    const uploadRow = document.getElementById("tmplUploadRow");

    document.getElementById("tmplUploadToggleBtn").addEventListener("click", () => {
        document.getElementById("tmplRepositorySectionBody").style.display = "";
        uploadRow.style.display = uploadRow.style.display === "none" ? "flex" : "none";
    });

    document.getElementById("tmplUploadCancelBtn").addEventListener("click", () => {
        uploadRow.style.display = "none";
        document.getElementById("tmplUploadAlert").innerHTML = "";
    });

    document.getElementById("tmplUploadConfirmBtn").addEventListener("click", async () => {
        const fileInput = document.getElementById("tmplUploadFile");
        const nameInput = document.getElementById("tmplUploadName");
        const alertEl = document.getElementById("tmplUploadAlert");

        alertEl.innerHTML = "";

        if (!fileInput.files.length) {
            alertEl.innerHTML = `<div class="form-alert error">Please choose a file to upload.</div>`;
            return;
        }

        const destination = nameInput.value.trim() || fileInput.files[0].name;
        const result = await uploadDocumentTemplate(fileInput.files[0], destination);

        if (!result.success) {
            alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to upload template.")}</div>`;
            return;
        }

        showToast(result.message, "success");
        fileInput.value = "";
        nameInput.value = "";
        uploadRow.style.display = "none";
        await loadRepository();
    });
}

function checkedTemplateFilenames()
{
    return [...document.querySelectorAll(".tmpl-template-checkbox:checked")].map((cb) => cb.getAttribute("data-filename"));
}

async function handleAssign()
{
    const filenames = checkedTemplateFilenames();

    if (!filenames.length) {
        showToast("Check at least one template first.", "error");
        return;
    }

    if (scope.type === "none") {
        showToast('Search "All Patients" or a specific patient above first.', "error");
        return;
    }

    const categoryId = document.getElementById("tmplCategorySelect").value || null;
    const patientId = scope.type === "patient" ? scope.patientId : null;

    const result = await assignTemplates(patientId, filenames, categoryId);

    if (!result.success) {
        showToast(result.message || "Failed to assign templates.", "error");
        return;
    }

    showToast(result.message, "success");

    document.querySelectorAll(".tmpl-template-checkbox:checked").forEach((cb) => { cb.checked = false; });
    document.getElementById("tmplSelectAllTemplates").checked = false;

    await refreshAssignmentLists();
}

// ---------------------------------------------------------------------
// Scope search ("All Patients" / "Repository" / a specific patient)
// ---------------------------------------------------------------------

function wireScopeSearch()
{
    const input = document.getElementById("tmplScopeSearch");
    const dropdown = document.getElementById("tmplScopeDropdown");

    const openDropdown = async () => {
        if (!patientsCache.length) {
            const result = await fetchPatients();
            patientsCache = result.success ? result.data : [];
        }

        renderScopeDropdown(input.value.trim().toLowerCase());
        dropdown.hidden = false;
    };

    input.addEventListener("focus", openDropdown);
    input.addEventListener("input", openDropdown);

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".tmpl-search-wrap")) {
            dropdown.hidden = true;
        }
    });

    document.getElementById("tmplSearchBtn").addEventListener("click", openDropdown);

    document.getElementById("tmplClearBtn").addEventListener("click", () => {
        input.value = "";
        dropdown.hidden = true;
        applyScope("none", null, "");
    });
}

function renderScopeDropdown(term)
{
    const dropdown = document.getElementById("tmplScopeDropdown");

    const matchingPatients = term
        ? patientsCache.filter((p) => patientLabel(p).toLowerCase().includes(term)).slice(0, 20)
        : [];

    const fixedOptions = [
        { key: "all_patients", label: "All Patients" },
        { key: "repository", label: "Repository" }
    ].filter((opt) => !term || opt.label.toLowerCase().includes(term));

    dropdown.innerHTML =
        fixedOptions.map((opt) => `<div class="tmpl-search-option${scope.type === opt.key ? " active" : ""}" data-scope-key="${opt.key}">${opt.label}</div>`).join("") +
        matchingPatients.map((p) => `<div class="tmpl-search-option" data-patient-id="${p.id}">${escapeHtml(patientLabel(p))}</div>`).join("");

    if (!fixedOptions.length && !matchingPatients.length) {
        dropdown.innerHTML = `<div class="tmpl-search-option" style="cursor: default;">No matches.</div>`;
    }

    dropdown.querySelectorAll("[data-scope-key]").forEach((el) => {
        el.addEventListener("click", () => {
            const key = el.getAttribute("data-scope-key");
            document.getElementById("tmplScopeSearch").value = el.textContent;
            dropdown.hidden = true;
            applyScope(key === "all_patients" ? "all_patients" : "repository", null, "");
        });
    });

    dropdown.querySelectorAll("[data-patient-id]").forEach((el) => {
        el.addEventListener("click", () => {
            const patient = patientsCache.find((p) => String(p.id) === el.getAttribute("data-patient-id"));
            if (!patient) return;

            document.getElementById("tmplScopeSearch").value = patientLabel(patient);
            dropdown.hidden = true;
            applyScope("patient", patient.id, patientLabel(patient));
        });
    });
}

function applyScope(type, patientId, label)
{
    scope = { type, patientId, patientLabel: label };
    renderScopeLabel();
    refreshAssignmentLists();
}

function renderScopeLabel()
{
    const el = document.getElementById("tmplCurrentScopeLabel");

    if (scope.type === "all_patients") {
        el.innerHTML = `Scope: <strong>All Patients</strong> -- Assign applies checked templates as a practice-wide default.`;
    } else if (scope.type === "patient") {
        el.innerHTML = `Scope: <strong>${escapeHtml(scope.patientLabel)}</strong> -- Assign applies checked templates to this patient only.`;
    } else if (scope.type === "repository") {
        el.innerHTML = `Scope: <strong>Repository</strong> -- browsing only. Choose "All Patients" or a patient to Assign.`;
    } else {
        el.textContent = 'No scope selected -- search "All Patients" or a patient\'s name above.';
    }
}

async function refreshAssignmentLists()
{
    await loadDefaultAssignments();

    if (scope.type === "patient") {
        await loadPatientAssignments(scope.patientId);
    } else {
        document.getElementById("tmplAssignedBody").innerHTML = `<p class="tmpl-empty">Select a specific patient above to see their assigned templates.</p>`;
    }
}

// ---------------------------------------------------------------------
// Default Patient Templates / Patient Assigned Templates lists
// ---------------------------------------------------------------------

function wireSectionToggles()
{
    document.getElementById("tmplRepositoryToggle").addEventListener("click", () => {
        toggleSection("tmplRepositorySectionBody");
    });
    document.getElementById("tmplDefaultToggle").addEventListener("click", () => {
        toggleSection("tmplDefaultBody");
    });
    document.getElementById("tmplAssignedToggle").addEventListener("click", () => {
        toggleSection("tmplAssignedBody");
    });
}

function toggleSection(bodyId)
{
    const body = document.getElementById(bodyId);
    body.style.display = body.style.display === "none" ? "" : "none";
}

function renderSectionCount(elId, count)
{
    const el = document.getElementById(elId);
    if (el) el.textContent = `(${count})`;
}

async function loadDefaultAssignments()
{
    const result = await fetchDefaultTemplateAssignments();
    const rows = result.success ? result.data : [];

    renderAssignmentList("tmplDefaultBody", rows, "No default templates assigned yet.");
    renderSectionCount("tmplDefaultCount", rows.length);
}

async function loadPatientAssignments(patientId)
{
    const result = await fetchPatientTemplateAssignments(patientId);
    const rows = result.success ? result.data : [];

    renderAssignmentList("tmplAssignedBody", rows, "No templates assigned to this patient yet.");
    renderSectionCount("tmplAssignedCount", rows.length);
}

/**
 * An assignment row only stores patient_id/filename/category/assigned_at
 * -- Size and Last Modified come from the repository's own listing for
 * that filename (looked up client-side), same real file metadata the
 * Template Repository table shows, not fabricated. Last Modified stays
 * blank for an assignment itself since assignments aren't edited after
 * creation, only removed -- there's nothing real to show there.
 */
function renderAssignmentList(bodyId, rows, emptyText)
{
    const body = document.getElementById(bodyId);
    if (!body) return;

    if (!rows.length) {
        body.innerHTML = `<p class="tmpl-empty">${escapeHtml(emptyText)}</p>`;
        return;
    }

    body.innerHTML = `
        <div class="data-table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Category</th><th>Template Actions</th><th>Size</th><th>Created</th><th>Last Modified</th></tr>
                </thead>
                <tbody>
                    ${rows.map((row) => {
                        const tpl = repositoryTemplates.find((t) => t.filename === row.template_filename);

                        return `
                        <tr>
                            <td>${row.category_name ? escapeHtml(row.category_name) : "General"}</td>
                            <td>
                                <button type="button" class="tmpl-name-link tmpl-template-open-btn" data-path="${escapeAttr(tpl?.file_path || "")}" ${tpl ? "" : "disabled"}>${escapeHtml(displayName(row.template_filename))}</button>
                                <button type="button" class="tmpl-delete-link tmpl-unassign-btn" data-assignment-id="${row.id}" data-body-id="${bodyId}">Delete</button>
                            </td>
                            <td>${tpl?.size ?? "-"}</td>
                            <td>${escapeHtml(String(row.assigned_at || "").slice(0, 10))}</td>
                            <td></td>
                        </tr>
                    `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;

    body.querySelectorAll(".tmpl-template-open-btn:not([disabled])").forEach((btn) => {
        btn.addEventListener("click", () => {
            window.open(`${API_URL}${btn.getAttribute("data-path")}`, "_blank", "noopener");
        });
    });

    body.querySelectorAll(".tmpl-unassign-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this template assignment?")) return;

            const result = await unassignTemplate(btn.getAttribute("data-assignment-id"));

            if (!result.success) {
                showToast(result.message || "Failed to unassign.", "error");
                return;
            }

            if (btn.getAttribute("data-body-id") === "tmplDefaultBody") {
                await loadDefaultAssignments();
            } else {
                await loadPatientAssignments(scope.patientId);
            }
        });
    });
}

// ---------------------------------------------------------------------
// Groups modal
// ---------------------------------------------------------------------

function setupGroupsModal()
{
    const overlay = document.getElementById("tmplGroupsModalOverlay");
    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("tmplGroupsBtn").addEventListener("click", () => {
        overlay.classList.add("open");
        resetGroupForm();
        loadGroups();
    });
    document.getElementById("closeTmplGroupsModal").addEventListener("click", closeModal);
    document.getElementById("tmplGroupCancelBtn").addEventListener("click", resetGroupForm);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeModal();
    });

    document.getElementById("tmplGroupForm").addEventListener("submit", async () => {
        const id = document.getElementById("tmplGroupId").value;
        const name = document.getElementById("tmplGroupName").value.trim();
        const description = document.getElementById("tmplGroupDescription").value.trim();
        const templates = [...document.querySelectorAll(".tmpl-group-template-checkbox:checked")].map((cb) => cb.getAttribute("data-filename"));

        document.getElementById("err-tmplGroupName").textContent = "";

        if (!name) {
            document.getElementById("err-tmplGroupName").textContent = "Name is required.";
            return;
        }

        const data = { name, description, templates };
        const result = id ? await updateTemplateGroup(id, data) : await createTemplateGroup(data);

        if (!result.success) {
            document.getElementById("tmplGroupFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to save group.")}</div>`;
            if (result.errors?.name) document.getElementById("err-tmplGroupName").textContent = result.errors.name;
            return;
        }

        showToast(result.message, "success");
        resetGroupForm();
        await loadGroups();
    });
}

function resetGroupForm()
{
    document.getElementById("tmplGroupId").value = "";
    document.getElementById("tmplGroupName").value = "";
    document.getElementById("tmplGroupDescription").value = "";
    document.getElementById("tmplGroupFormAlert").innerHTML = "";
    document.getElementById("err-tmplGroupName").textContent = "";
    document.getElementById("tmplGroupSaveBtn").textContent = "Add Group";
    renderGroupTemplatesPicker([]);
}

function renderGroupTemplatesPicker(checkedFilenames = [])
{
    const container = document.getElementById("tmplGroupTemplatesPicker");
    if (!container) return;

    container.innerHTML = repositoryTemplates.length
        ? repositoryTemplates.map((tpl) => `
            <label style="display:flex; align-items:center; gap:8px; padding:4px 0; font-weight:400; font-size:13.5px;">
                <input type="checkbox" class="tmpl-group-template-checkbox" data-filename="${escapeAttr(tpl.filename)}" ${checkedFilenames.includes(tpl.filename) ? "checked" : ""}>
                ${escapeHtml(tpl.filename)}
            </label>
        `).join("")
        : `<span style="color: var(--text-muted); font-size: 13px;">No templates in the repository yet.</span>`;
}

async function loadGroups()
{
    const result = await fetchTemplateGroups();
    groups = result.success ? result.data : [];

    renderGroupsTable();

    const profileGroupSelect = document.getElementById("tmplProfileGroup");
    if (profileGroupSelect) {
        profileGroupSelect.innerHTML = `<option value="">None</option>` +
            groups.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");
    }
}

function renderGroupsTable()
{
    const tbody = document.getElementById("tmplGroupsTableBody");
    if (!tbody) return;

    tbody.innerHTML = groups.length
        ? groups.map((g) => `
            <tr>
                <td>${escapeHtml(g.name)}</td>
                <td>${g.templates.length} template${g.templates.length === 1 ? "" : "s"}</td>
                <td>
                    <button type="button" class="btn-secondary tmpl-group-edit-btn" data-group-id="${g.id}" style="padding: 4px 8px; margin-right: 4px;">Edit</button>
                    <button type="button" class="btn-secondary tmpl-group-assign-btn" data-group-id="${g.id}" style="padding: 4px 8px; margin-right: 4px;">Assign</button>
                    <button type="button" class="btn-secondary tmpl-group-delete-btn" data-group-id="${g.id}" style="padding: 4px 8px; color: #dc2626;">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="3" class="table-empty">No groups yet.</td></tr>`;

    tbody.querySelectorAll(".tmpl-group-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const group = groups.find((g) => String(g.id) === btn.getAttribute("data-group-id"));
            if (!group) return;

            document.getElementById("tmplGroupId").value = group.id;
            document.getElementById("tmplGroupName").value = group.name;
            document.getElementById("tmplGroupDescription").value = group.description || "";
            document.getElementById("tmplGroupSaveBtn").textContent = "Save Changes";
            renderGroupTemplatesPicker(group.templates);
        });
    });

    tbody.querySelectorAll(".tmpl-group-assign-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const group = groups.find((g) => String(g.id) === btn.getAttribute("data-group-id"));
            if (!group) return;

            if (scope.type === "none" || scope.type === "repository") {
                showToast('Search "All Patients" or a specific patient above first.', "error");
                return;
            }
            if (!group.templates.length) {
                showToast("This group has no templates in it.", "error");
                return;
            }

            const categoryId = document.getElementById("tmplCategorySelect").value || null;
            const patientId = scope.type === "patient" ? scope.patientId : null;

            const result = await assignTemplates(patientId, group.templates, categoryId);

            if (!result.success) {
                showToast(result.message || "Failed to assign group.", "error");
                return;
            }

            showToast(result.message, "success");
            await refreshAssignmentLists();
        });
    });

    tbody.querySelectorAll(".tmpl-group-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this group?")) return;

            const result = await deleteTemplateGroup(btn.getAttribute("data-group-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete group.", "error");
                return;
            }

            showToast(result.message, "success");
            await loadGroups();
        });
    });
}

// ---------------------------------------------------------------------
// Profiles modal
// ---------------------------------------------------------------------

function setupProfilesModal()
{
    const overlay = document.getElementById("tmplProfilesModalOverlay");
    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("tmplProfilesBtn").addEventListener("click", () => {
        overlay.classList.add("open");
        resetProfileForm();
        loadProfiles();
    });
    document.getElementById("closeTmplProfilesModal").addEventListener("click", closeModal);
    document.getElementById("tmplProfileCancelBtn").addEventListener("click", resetProfileForm);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeModal();
    });

    document.getElementById("tmplProfileForm").addEventListener("submit", async () => {
        const id = document.getElementById("tmplProfileId").value;
        const name = document.getElementById("tmplProfileName").value.trim();
        const categoryId = document.getElementById("tmplProfileCategory").value || null;
        const templateGroupId = document.getElementById("tmplProfileGroup").value || null;
        const description = document.getElementById("tmplProfileDescription").value.trim();

        document.getElementById("err-tmplProfileName").textContent = "";

        if (!name) {
            document.getElementById("err-tmplProfileName").textContent = "Name is required.";
            return;
        }

        const data = { name, category_id: categoryId, template_group_id: templateGroupId, description };
        const result = id ? await updateTemplateProfile(id, data) : await createTemplateProfile(data);

        if (!result.success) {
            document.getElementById("tmplProfileFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to save profile.")}</div>`;
            if (result.errors?.name) document.getElementById("err-tmplProfileName").textContent = result.errors.name;
            return;
        }

        showToast(result.message, "success");
        resetProfileForm();
        await loadProfiles();
    });
}

function resetProfileForm()
{
    document.getElementById("tmplProfileId").value = "";
    document.getElementById("tmplProfileName").value = "";
    document.getElementById("tmplProfileCategory").value = "";
    document.getElementById("tmplProfileGroup").value = "";
    document.getElementById("tmplProfileDescription").value = "";
    document.getElementById("tmplProfileFormAlert").innerHTML = "";
    document.getElementById("err-tmplProfileName").textContent = "";
    document.getElementById("tmplProfileSaveBtn").textContent = "Add Profile";
}

async function loadProfiles()
{
    const result = await fetchTemplateProfiles();
    profiles = result.success ? result.data : [];

    renderProfilesTable();
    renderProfilesPortalTable();
}

/**
 * The "Profiles in Portal" table on the main page -- a live view of the
 * same profiles managed in the Profiles modal, with an Active toggle.
 * "Assigned Templates" only shows something for a profile whose Group
 * has member templates; a profile's own model here doesn't support
 * assigning individual templates directly (only via a Group), so that
 * column honestly reads "-" rather than a fabricated count.
 */
function renderProfilesPortalTable()
{
    const tbody = document.getElementById("tmplProfilesPortalBody");
    if (!tbody) return;

    tbody.innerHTML = profiles.length
        ? profiles.map((p) => {
            const group = groups.find((g) => g.id === p.template_group_id);
            const templateCount = group ? group.templates.length : 0;

            return `
                <tr>
                    <td><input type="checkbox" class="tmpl-profile-active-toggle" data-profile-id="${p.id}" ${p.active ? "checked" : ""}></td>
                    <td>${escapeHtml(p.name)}</td>
                    <td>${templateCount ? `${templateCount} template${templateCount === 1 ? "" : "s"}` : "-"}</td>
                    <td>${p.group_name ? escapeHtml(p.group_name) : "-"}</td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="4" class="table-empty">No profiles yet -- use "Profiles" in the toolbar to add one.</td></tr>`;

    tbody.querySelectorAll(".tmpl-profile-active-toggle").forEach((checkbox) => {
        checkbox.addEventListener("change", async () => {
            checkbox.disabled = true;

            const result = await setTemplateProfileActive(checkbox.getAttribute("data-profile-id"), checkbox.checked);

            checkbox.disabled = false;

            if (!result.success) {
                checkbox.checked = !checkbox.checked;
                showToast(result.message || "Failed to update profile.", "error");
                return;
            }

            const profile = profiles.find((p) => String(p.id) === checkbox.getAttribute("data-profile-id"));
            if (profile) profile.active = checkbox.checked ? 1 : 0;
        });
    });
}

function renderProfilesTable()
{
    const tbody = document.getElementById("tmplProfilesTableBody");
    if (!tbody) return;

    tbody.innerHTML = profiles.length
        ? profiles.map((p) => `
            <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${p.category_name ? escapeHtml(p.category_name) : "-"}</td>
                <td>${p.group_name ? escapeHtml(p.group_name) : "-"}</td>
                <td>
                    <button type="button" class="btn-secondary tmpl-profile-load-btn" data-profile-id="${p.id}" style="padding: 4px 8px; margin-right: 4px;">Load</button>
                    <button type="button" class="btn-secondary tmpl-profile-delete-btn" data-profile-id="${p.id}" style="padding: 4px 8px; color: #dc2626;">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="4" class="table-empty">No profiles yet.</td></tr>`;

    tbody.querySelectorAll(".tmpl-profile-load-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const profile = profiles.find((p) => String(p.id) === btn.getAttribute("data-profile-id"));
            if (!profile) return;

            document.getElementById("tmplCategorySelect").value = profile.category_id || "";

            document.querySelectorAll(".tmpl-template-checkbox").forEach((cb) => { cb.checked = false; });

            if (profile.template_group_id) {
                const group = groups.find((g) => g.id === profile.template_group_id);
                if (group) {
                    group.templates.forEach((filename) => {
                        const cb = document.querySelector(`.tmpl-template-checkbox[data-filename="${cssEscape(filename)}"]`);
                        if (cb) cb.checked = true;
                    });
                }
            }

            document.getElementById("tmplProfilesModalOverlay").classList.remove("open");
            showToast(`Loaded "${profile.name}" -- category and group templates preselected.`, "success");
        });
    });

    tbody.querySelectorAll(".tmpl-profile-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this profile?")) return;

            const result = await deleteTemplateProfile(btn.getAttribute("data-profile-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete profile.", "error");
                return;
            }

            showToast(result.message, "success");
            await loadProfiles();
        });
    });
}

// ---------------------------------------------------------------------

function cssEscape(value)
{
    return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}

function escapeHtml(value)
{
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function escapeAttr(value)
{
    return escapeHtml(value).replace(/"/g, "&quot;");
}
