import { getUser } from "../../core/session.js";
import { fetchPatients, deletePatient, createPatient, updatePatient } from "./patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";

const FIELDS = [
    "username", "password", "first_name", "middle_name",
    "last_name", "suffix", "sex", "birthdate",
    "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "emergency_contact_name", "emergency_relationship", "emergency_phone", "emergency_address"
];

const EDIT_FIELDS = [
    "first_name", "middle_name", "last_name", "suffix", "sex",
    "birthdate", "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "emergency_contact_name", "emergency_relationship", "emergency_phone", "emergency_address"
];

let patientsCache = [];

export async function initPatientsList()
{
    const user = getUser();

    if (!user || !["admin", "receptionist", "doctor"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    await loadPatients(user);
    setupPatientFilters(user);
    setupPatientDashboardModal();

    if (user.role !== "doctor") {
        await setupEditPatientModal(user);
    }

    if (user.role === "receptionist") {
        await setupAddPatientModal(user);
    }
}

function setupPatientDashboardModal()
{
    const modalOverlay = document.getElementById("patientDashboardModalOverlay");

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("closePatientDashboardModal").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
}

function openPatientDashboardModal(patient)
{
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const initial = (patient.first_name || "?").charAt(0).toUpperCase();
    const sex = patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "";
    const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";

    document.getElementById("pdAvatar").textContent = initial;
    document.getElementById("pdSidebarAvatar").textContent = initial;
    document.getElementById("pdName").textContent = fullName;
    document.getElementById("pdSidebarName").textContent = fullName;
    document.getElementById("pdSubtitle").textContent = `Patient No: ${patient.patient_no}`;
    document.getElementById("pdSidebarSub").textContent = `Patient No: ${patient.patient_no}`;

    setFact("pdFactSex", sex);
    setFact("pdFactBirthdate", patient.birthdate);
    setFact("pdFactBloodType", patient.blood_type);
    setFact("pdFactProvider", providerName);

    document.getElementById("patientDashboardModalOverlay").classList.add("open");
}

function setFact(elementId, value)
{
    const el = document.getElementById(elementId);

    el.textContent = value || "Not set";
    el.classList.toggle("empty", !value);
}

function setupPatientFilters(user)
{
    const searchInput = document.getElementById("patientSearchInput");
    const searchClear = document.getElementById("patientSearchClear");
    const providerFilter = document.getElementById("patientProviderFilter");

    const applyFilters = () => renderPatientsTable(getFilteredPatients(searchInput, providerFilter), user);

    searchInput.addEventListener("input", () => {
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        applyFilters();
    });
    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.classList.remove("show");
        applyFilters();
        searchInput.focus();
    });
    providerFilter.addEventListener("change", applyFilters);
}

function getFilteredPatients(searchInput, providerFilter)
{
    const term = searchInput.value.trim().toLowerCase();
    const providerScope = providerFilter.value;

    return patientsCache.filter((patient) => {
        if (providerScope === "unassigned" && patient.provider_id) {
            return false;
        }

        if (term === "") {
            return true;
        }

        const haystack = [
            patient.patient_no,
            patient.first_name,
            patient.middle_name,
            patient.last_name,
            patient.suffix
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(term);
    });
}

function wireModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            modalBox.querySelector(`.modal-tab-panel[data-panel="${tab.getAttribute("data-tab")}"]`).classList.add("active");
        });
    });
}

function resetModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((t, i) => t.classList.toggle("active", i === 0));
    panels.forEach((p, i) => p.classList.toggle("active", i === 0));
}

async function setupAddPatientModal(user)
{
    enablePasswordToggles();
    document.getElementById("birthdate").max = new Date().toISOString().split("T")[0];
    await loadProviderOptions("provider_id");

    const modalOverlay = document.getElementById("addPatientModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");
    const form = document.getElementById("addPatientForm");

    wireModalTabs(modalBox);

    const openModal = () => {
        resetModalTabs(modalBox);
        modalOverlay.classList.add("open");
    };
    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors(FIELDS, "");
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddPatientModal").addEventListener("click", openModal);
    document.getElementById("closeAddPatientModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddPatient").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors(FIELDS, "");

        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const result = await createPatient(data);

        if (!result.success) {
            showAlert("formAlert", result.message || "Failed to register patient.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert(`Patient registered successfully. Patient No: ${result.data.patient_no}`, "success");
        await loadPatients(user);
    });
}

async function setupEditPatientModal(user)
{
    document.getElementById("edit_birthdate").max = new Date().toISOString().split("T")[0];
    await loadProviderOptions("edit_provider_id");

    const modalOverlay = document.getElementById("editPatientModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");
    const form = document.getElementById("editPatientForm");

    wireModalTabs(modalBox);

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors(EDIT_FIELDS, "edit_");
        document.getElementById("editFormAlert").innerHTML = "";
    };

    document.getElementById("closeEditPatientModal").addEventListener("click", closeModal);
    document.getElementById("cancelEditPatient").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    const deleteBtn = document.getElementById("deletePatientFromEdit");

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Delete this patient? This can be reversed by an administrator (soft delete).")) {
                return;
            }

            const id = document.getElementById("edit_id").value;

            await deletePatient(id);
            closeModal();
            showListAlert("Patient deleted successfully.", "success");
            await loadPatients(user);
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors(EDIT_FIELDS, "edit_");

        const id = document.getElementById("edit_id").value;
        const data = {};

        EDIT_FIELDS.forEach((field) => {
            const value = document.getElementById(`edit_${field}`).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const result = await updatePatient(id, data);

        if (!result.success) {
            showAlert("editFormAlert", result.message || "Failed to update patient.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-edit_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert("Patient updated successfully.", "success");
        await loadPatients(user);
    });
}

function openEditModal(patient)
{
    const modalOverlay = document.getElementById("editPatientModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");

    resetModalTabs(modalBox);

    document.getElementById("edit_id").value = patient.id;
    document.getElementById("edit_first_name").value = patient.first_name ?? "";
    document.getElementById("edit_middle_name").value = patient.middle_name ?? "";
    document.getElementById("edit_last_name").value = patient.last_name ?? "";
    document.getElementById("edit_suffix").value = patient.suffix ?? "";
    document.getElementById("edit_sex").value = patient.sex ?? "";
    document.getElementById("edit_birthdate").value = patient.birthdate ?? "";
    document.getElementById("edit_civil_status").value = patient.civil_status ?? "";
    document.getElementById("edit_blood_type").value = patient.blood_type ?? "";
    document.getElementById("edit_height").value = patient.height ?? "";
    document.getElementById("edit_weight").value = patient.weight ?? "";
    document.getElementById("edit_provider_id").value = patient.provider_id ?? "";
    document.getElementById("edit_allow_sms").value = patient.allow_sms ?? "";
    document.getElementById("edit_allow_voice_calls").value = patient.allow_voice_calls ?? "";
    document.getElementById("edit_allow_email").value = patient.allow_email ?? "";
    document.getElementById("edit_allow_hie").value = patient.allow_hie ?? "";
    document.getElementById("edit_race").value = patient.race ?? "";
    document.getElementById("edit_ethnicity").value = patient.ethnicity ?? "";
    document.getElementById("edit_religion").value = patient.religion ?? "";
    document.getElementById("edit_language").value = patient.language ?? "";

    document.getElementById("edit_address_line").value = patient.contact_address_line ?? "";
    document.getElementById("edit_city").value = patient.contact_city ?? "";
    document.getElementById("edit_province").value = patient.contact_province ?? "";
    document.getElementById("edit_zip_code").value = patient.contact_zip_code ?? "";
    document.getElementById("edit_home_phone").value = patient.contact_home_phone ?? "";
    document.getElementById("edit_mobile_phone").value = patient.contact_mobile_phone ?? "";
    document.getElementById("edit_work_phone").value = patient.contact_work_phone ?? "";
    document.getElementById("edit_contact_email").value = patient.contact_email ?? "";

    document.getElementById("edit_emergency_contact_name").value = patient.emergency_contact_name ?? "";
    document.getElementById("edit_emergency_relationship").value = patient.emergency_relationship ?? "";
    document.getElementById("edit_emergency_phone").value = patient.emergency_phone ?? "";
    document.getElementById("edit_emergency_address").value = patient.emergency_address ?? "";

    modalOverlay.classList.add("open");
}

async function loadProviderOptions(selectId)
{
    const result = await fetchProviders();
    const select = document.getElementById(selectId);

    if (result.success) {
        result.data.forEach((provider) => {
            const option = document.createElement("option");

            option.value = provider.id;
            option.textContent = `${provider.first_name} ${provider.last_name}${provider.specialty ? " — " + provider.specialty : ""}`;

            select.appendChild(option);
        });
    }
}

async function loadPatients(user)
{
    const result = await fetchPatients();

    patientsCache = result.success ? result.data : [];

    renderPatientsTable(patientsCache, user);
}

function renderPatientsTable(patients, user)
{
    const tbody = document.getElementById("patientsTableBody");
    const countText = document.getElementById("patientCountText");
    const canDelete = user.role === "admin";
    const canEdit = user.role === "admin" || user.role === "receptionist";

    countText.textContent = `${patientsCache.length} ${patientsCache.length === 1 ? "patient" : "patients"}`;

    if (!patients.length) {
        tbody.innerHTML = renderEmptyState(patientsCache.length === 0);
        return;
    }

    tbody.innerHTML = patients.map((patient) => {
        const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
        const sex = (patient.sex || "").toLowerCase();
        const sexLabel = sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Not set";
        const sexClass = sex === "male" || sex === "female" ? sex : "unset";
        const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";

        return `
        <tr class="pat-row" data-row-id="${patient.id}">
            <td><span class="pat-patient-no">${escapeHtml(patient.patient_no)}</span></td>
            <td>
                <div class="pat-name-cell">
                    <div class="pat-avatar">${escapeHtml((patient.first_name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pat-name">${escapeHtml(fullName)}</span>
                </div>
            </td>
            <td><span class="pat-sex-badge ${sexClass}">${escapeHtml(sexLabel)}</span></td>
            <td class="pat-muted ${patient.birthdate ? "" : "empty"}">${escapeHtml(patient.birthdate || "No birthdate")}</td>
            <td><span class="pat-tag ${providerName ? "" : "empty"}">${providerName ? escapeHtml(providerName) : "Unassigned"}</span></td>
            <td>
                <div class="pat-actions">
                    <button class="pat-icon-btn view" data-dashboard-id="${patient.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        View</button>
                    ${canEdit
                        ? `<button class="pat-icon-btn edit" data-edit-id="${patient.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                            Edit</button>`
                        : ""}
                    ${canDelete ? `<button class="pat-icon-btn delete" data-id="${patient.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                            Delete</button>` : ""}
                </div>
            </td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("[data-dashboard-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const patient = patientsCache.find((p) => String(p.id) === btn.getAttribute("data-dashboard-id"));

            if (patient) {
                openPatientDashboardModal(patient);
            }
        });
    });

    tbody.querySelectorAll(".pat-row").forEach((row) => {
        row.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }

            const patient = patientsCache.find((p) => String(p.id) === row.getAttribute("data-row-id"));

            if (patient) {
                openPatientDashboardModal(patient);
            }
        });
    });

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const patient = patientsCache.find((p) => String(p.id) === btn.getAttribute("data-edit-id"));

            if (patient) {
                openEditModal(patient);
            }
        });
    });

    if (canDelete) {
        tbody.querySelectorAll(".pat-icon-btn.delete").forEach((btn) => {
            btn.addEventListener("click", async () => {
                if (!confirm("Delete this patient? This can be reversed by an administrator (soft delete).")) {
                    return;
                }

                await deletePatient(btn.getAttribute("data-id"));
                await loadPatients(user);
            });
        });
    }
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No patients yet" : "No matching patients";
    const message = noneAtAll
        ? "Registered patients will appear here."
        : "Try a different search term or filter.";

    return `
        <tr>
            <td colspan="6" class="pat-empty-state">
                <div class="pat-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <strong>${heading}</strong>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function clearErrors(fields, prefix)
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

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
