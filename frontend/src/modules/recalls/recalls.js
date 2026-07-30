import { getUser } from "../../core/session.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchMyRecalls, createRecall, updateRecall, deleteRecall } from "./recalls.service.js";
import { setPendingAppointmentPatient } from "../../core/pending-appointment.js";
import { AppointmentsListView } from "../appointments/appointments-list.view.js?v=7";
import { initAppointmentsList } from "../appointments/appointments-list.js?v=7";
import { DoctorCalendarView } from "../appointments/doctor-calendar.view.js?v=7";
import { initDoctorCalendar } from "../appointments/doctor-calendar.js?v=7";

const RECALL_STATUS_LABELS = {
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled"
};

let recallsCache = [];
let recallPatientLookup = new Map();
let patientNameLookup = new Map();

export async function initRecalls()
{
    // Dashboard tab restoration can call this twice in a row for the same
    // rendered DOM (once for re-opening the tab, once for re-activating
    // it). Without this guard that means two sets of listeners on every
    // button -- most importantly the form's submit handler, which would
    // create every new recall twice.
    const root = document.querySelector(".rec-page");

    if (!root || root.dataset.initialized) {
        return;
    }

    root.dataset.initialized = "1";

    const user = getUser();
    const isStaff = user?.role !== "patient";

    document.getElementById("recallAddBtnWrap").style.display = isStaff ? "" : "none";
    document.getElementById("recallPatientFieldGroup").style.display = isStaff ? "" : "none";

    await Promise.all([
        loadFacilityOptions(),
        loadProviderOptions(),
        isStaff ? loadRecallPatientOptions() : Promise.resolve()
    ]);

    setupSearchClear("recall_patient_search", "recallPatientClear");
    setupFilters();
    setupRecallFormModal(isStaff);

    await loadRecalls();
}

async function loadFacilityOptions()
{
    const filterSelect = document.getElementById("filter_facility_id");
    const formSelect = document.getElementById("recall_facility_id");

    const result = await fetchFacilities();
    const facilities = result.success ? result.data : [];

    const options = facilities.map((facility) => `<option value="${facility.id}">${escapeHtml(facility.name)}</option>`).join("");

    filterSelect.innerHTML = `<option value="">All Facilities</option>` + options;
    formSelect.innerHTML = `<option value="">Select facility</option>` + options;
}

async function loadProviderOptions()
{
    const filterSelect = document.getElementById("filter_provider_id");
    const formSelect = document.getElementById("recall_provider_id");

    const result = await fetchProviders();
    const providers = result.success ? result.data : [];

    const options = providers.map((provider) => {
        const label = [provider.first_name, provider.last_name].filter(Boolean).join(" ");
        return `<option value="${provider.id}">${escapeHtml(label)}</option>`;
    }).join("");

    filterSelect.innerHTML = `<option value="">All Providers</option>` + options;
    formSelect.innerHTML = `<option value="">Select provider</option>` + options;
}

async function loadRecallPatientOptions()
{
    const datalist = document.getElementById("recallPatientDatalist");
    const nameDatalist = document.getElementById("recallFilterPatientDatalist");

    datalist.innerHTML = "";
    nameDatalist.innerHTML = "";
    recallPatientLookup = new Map();
    patientNameLookup = new Map();

    const result = await fetchPatients();

    if (!result.success) {
        return;
    }

    result.data.forEach((patient) => {
        const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(" ");
        const label = `${fullName} (${patient.patient_no})`;

        recallPatientLookup.set(label, { id: String(patient.id), birthdate: patient.birthdate });

        const option = document.createElement("option");

        option.value = label;

        datalist.appendChild(option);

        if (!patientNameLookup.has(fullName)) {
            patientNameLookup.set(fullName, patient.patient_no);

            const nameOption = document.createElement("option");

            nameOption.value = fullName;

            nameDatalist.appendChild(nameOption);
        }
    });
}

function calculateAge(birthdate)
{
    if (!birthdate) {
        return null;
    }

    const dob = new Date(birthdate);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
}

function renderPatientDobAge(birthdate)
{
    const el = document.getElementById("recall_patient_dob_age");

    if (!birthdate) {
        el.textContent = "—";
        return;
    }

    const age = calculateAge(birthdate);

    el.textContent = `${birthdate} (${age} ${age === 1 ? "yr" : "yrs"} old)`;
}

function setupSearchClear(inputId, clearBtnId)
{
    const input = document.getElementById(inputId);

    document.getElementById(clearBtnId).addEventListener("click", () => {
        input.value = "";
        input.focus();
    });
}

function setupFilters()
{
    document.getElementById("applyRecallFilters").addEventListener("click", renderRecallsTable);

    document.getElementById("clearRecallFilters").addEventListener("click", () => {
        document.getElementById("filter_facility_id").value = "";
        document.getElementById("filter_provider_id").value = "";
        document.getElementById("filter_patient_no").value = "";
        document.getElementById("filter_patient_name").value = "";
        document.getElementById("filter_date_from").value = "";
        document.getElementById("filter_date_until").value = "";
        renderRecallsTable();
    });

    document.getElementById("filter_patient_name").addEventListener("input", (event) => {
        const patientNo = patientNameLookup.get(event.target.value.trim());

        if (patientNo) {
            document.getElementById("filter_patient_no").value = patientNo;
        }
    });
}

function setupRecallFormModal(isStaff)
{
    const modalOverlay = document.getElementById("recallFormModalOverlay");
    const form = document.getElementById("recallForm");

    const resetForm = () => {
        form.reset();
        document.getElementById("recall_id").value = "";
        document.getElementById("recall_patient_search").value = "";
        document.getElementById("recall_status").value = "pending";
        document.getElementById("recallFormAlert").innerHTML = "";
        document.getElementById("err-patient_id").textContent = "";
        document.getElementById("err-recall_date").textContent = "";
        document.getElementById("err-provider_id").textContent = "";
        document.getElementById("err-facility_id").textContent = "";
        document.getElementById("err-reason").textContent = "";
        renderPatientDobAge(null);
    };

    const openAddModal = () => {
        resetForm();
        document.getElementById("recallFormModalTitle").textContent = "New Recall";
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    if (isStaff) {
        document.getElementById("openAddRecallModal").addEventListener("click", openAddModal);
    }

    document.getElementById("closeRecallFormModal").addEventListener("click", closeModal);
    document.getElementById("cancelRecallForm").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.getElementById("recall_patient_search").addEventListener("input", (event) => {
        const patient = recallPatientLookup.get(event.target.value.trim());

        renderPatientDobAge(patient ? patient.birthdate : null);
    });

    document.querySelectorAll('input[name="recall_date_quickpick"]').forEach((radio) => {
        radio.addEventListener("change", () => {
            const years = Number(radio.value);
            const target = new Date();

            target.setFullYear(target.getFullYear() + years);

            document.getElementById("recall_date").value = target.toISOString().slice(0, 10);
        });
    });

    document.getElementById("recallsTableBody").addEventListener("click", async (event) => {
        const editBtn = event.target.closest("[data-edit-recall]");
        const deleteBtn = event.target.closest("[data-delete-recall]");
        const scheduleBtn = event.target.closest("[data-schedule-recall]");

        if (scheduleBtn) {
            const recall = recallsCache.find((r) => r.id === Number(scheduleBtn.getAttribute("data-schedule-recall")));

            if (recall) {
                goToScheduleAppointment(recall.patient_id, recall.provider_id);
            }

            return;
        }

        if (editBtn) {
            const recall = recallsCache.find((r) => r.id === Number(editBtn.getAttribute("data-edit-recall")));

            if (!recall) {
                return;
            }

            resetForm();
            document.getElementById("recallFormModalTitle").textContent = "Edit Recall";
            document.getElementById("recall_id").value = recall.id;

            const patientLabel = `${[recall.patient_first_name, recall.patient_last_name].filter(Boolean).join(" ")} (${recall.patient_no})`;

            document.getElementById("recall_patient_search").value = patientLabel;
            recallPatientLookup.set(patientLabel, { id: String(recall.patient_id), birthdate: recall.patient_birthdate });
            renderPatientDobAge(recall.patient_birthdate);

            document.getElementById("recall_facility_id").value = recall.facility_id ?? "";
            document.getElementById("recall_provider_id").value = recall.provider_id ?? "";
            document.getElementById("recall_date").value = recall.recall_date ?? "";
            document.getElementById("recall_reason").value = recall.reason ?? "";
            document.getElementById("recall_status").value = recall.status ?? "pending";
            document.getElementById("recall_notes").value = recall.notes ?? "";

            modalOverlay.classList.add("open");
        }

        if (deleteBtn) {
            const id = Number(deleteBtn.getAttribute("data-delete-recall"));

            if (!confirm("Remove this recall?")) {
                return;
            }

            const result = await deleteRecall(id);

            if (!result.success) {
                showListAlert(result.message || "Failed to remove recall.", "error");
                return;
            }

            showListAlert("Recall removed successfully.", "success");
            await loadRecalls();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-patient_id").textContent = "";
        document.getElementById("err-recall_date").textContent = "";
        document.getElementById("err-provider_id").textContent = "";
        document.getElementById("err-facility_id").textContent = "";
        document.getElementById("err-reason").textContent = "";

        const id = document.getElementById("recall_id").value;
        const patient = recallPatientLookup.get(document.getElementById("recall_patient_search").value.trim());
        const facilityId = document.getElementById("recall_facility_id").value;
        const providerId = document.getElementById("recall_provider_id").value;
        const recallDate = document.getElementById("recall_date").value;

        const data = {
            facility_id: facilityId || null,
            provider_id: providerId || null,
            recall_date: recallDate || null,
            reason: document.getElementById("recall_reason").value.trim() || null,
            status: document.getElementById("recall_status").value,
            notes: document.getElementById("recall_notes").value.trim() || null
        };

        let hasError = false;

        if (!id && !patient) {
            document.getElementById("err-patient_id").textContent = "Choose a patient.";
            hasError = true;
        }

        if (!recallDate) {
            document.getElementById("err-recall_date").textContent = "Recall date is required.";
            hasError = true;
        }

        if (!providerId) {
            document.getElementById("err-provider_id").textContent = "Provider is required.";
            hasError = true;
        }

        if (!facilityId) {
            document.getElementById("err-facility_id").textContent = "Facility is required.";
            hasError = true;
        }

        if (hasError) {
            return;
        }

        const result = id
            ? await updateRecall(Number(id), data)
            : await createRecall({ ...data, patient_id: patient.id });

        if (!result.success) {
            showAlert("recallFormAlert", result.message || "Failed to save recall.", "error");

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
        showListAlert(id ? "Recall updated successfully." : "Recall scheduled successfully.", "success");
        await loadRecalls();
    });
}

async function loadRecalls()
{
    const result = await fetchMyRecalls();

    recallsCache = result.success ? result.data : [];

    renderRecallsTable();
}

function getFilteredRecalls()
{
    const facilityId = document.getElementById("filter_facility_id").value;
    const providerId = document.getElementById("filter_provider_id").value;
    const patientNo = document.getElementById("filter_patient_no").value.trim().toLowerCase();
    const patientName = document.getElementById("filter_patient_name").value.trim().toLowerCase();
    const dateFrom = document.getElementById("filter_date_from").value;
    const dateUntil = document.getElementById("filter_date_until").value;

    return recallsCache.filter((recall) => {
        if (facilityId && String(recall.facility_id) !== facilityId) {
            return false;
        }

        if (providerId && String(recall.provider_id) !== providerId) {
            return false;
        }

        if (patientNo && !(recall.patient_no || "").toLowerCase().includes(patientNo)) {
            return false;
        }

        const fullName = [recall.patient_first_name, recall.patient_last_name].filter(Boolean).join(" ").toLowerCase();

        if (patientName && !fullName.includes(patientName)) {
            return false;
        }

        if (dateFrom && (!recall.recall_date || recall.recall_date < dateFrom)) {
            return false;
        }

        if (dateUntil && (!recall.recall_date || recall.recall_date > dateUntil)) {
            return false;
        }

        return true;
    });
}

function renderRecallsTable()
{
    const tbody = document.getElementById("recallsTableBody");
    const countText = document.getElementById("recallCountText");
    const user = getUser();
    const isStaff = user?.role !== "patient";

    const recalls = getFilteredRecalls();

    countText.textContent = `${recalls.length} ${recalls.length === 1 ? "recall" : "recalls"}`;

    if (!recalls.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="rec-empty-state">
                    <strong>No recalls registered yet</strong>
                    <p>${isStaff ? "Schedule a recall, or adjust your filters." : "You have no recalls yet."}</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = recalls.map((recall) => {
        const patientName = escapeHtml([recall.patient_first_name, recall.patient_last_name].filter(Boolean).join(" ") || "—");
        const providerName = escapeHtml([recall.provider_first_name, recall.provider_last_name].filter(Boolean).join(" ") || "—");
        const statusLabel = RECALL_STATUS_LABELS[recall.status] || capitalize(recall.status || "");
        const badgeClass = recall.status === "pending" ? "neutral" : "inactive";

        const actions = isStaff ? `
            <button type="button" class="btn-edit" title="Schedule appointment" data-schedule-recall="${recall.id}">Schedule</button>
            <button type="button" class="btn-edit" data-edit-recall="${recall.id}">Edit</button>
            <button type="button" class="btn-edit" style="color:#b91c1c;" data-delete-recall="${recall.id}">Delete</button>
        ` : "";

        return `
        <tr>
            <td>${escapeHtml(recall.patient_no || "—")}</td>
            <td>${patientName}</td>
            <td>${escapeHtml(recall.reason || "—")}</td>
            <td>${escapeHtml(recall.recall_date || "—")}</td>
            <td>${escapeHtml(recall.facility_name || "—")}</td>
            <td>${providerName}</td>
            <td><span class="rec-badge ${badgeClass}">${escapeHtml(statusLabel)}</span></td>
            <td>${actions}</td>
        </tr>
        `;
    }).join("");
}

function goToScheduleAppointment(patientId, providerId)
{
    setPendingAppointmentPatient(patientId, providerId);

    const user = getUser();
    const isDoctor = user?.role === "doctor";

    window.tabManager.openTab("appointments", "Calendar", () => {
        setTimeout(() => (isDoctor ? initDoctorCalendar() : initAppointmentsList()), 0);
        return isDoctor ? DoctorCalendarView() : AppointmentsListView();
    }, true);
}

function capitalize(value)
{
    const text = value || "";

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
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
