import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from "./appointments.service.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { renderAppointmentRows } from "./appointment-table.js";

const FIELDS = ["patient_id", "provider_id", "appointment_date", "appointment_time", "reason"];

let appointmentsCache = [];

export async function initAppointmentsList()
{
    await loadPatientOptions();
    await loadProviderOptions();
    await loadAppointments();
    setupAppointmentFilters();

    const modalOverlay = document.getElementById("addAppointmentModalOverlay");
    const form = document.getElementById("addAppointmentForm");

    const openAddModal = () => {
        form.reset();
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
        document.getElementById("appointment_id").value = "";
        document.getElementById("appointment_date").min = new Date().toISOString().split("T")[0];
        document.getElementById("appointmentModalTitle").textContent = "New Appointment";
        document.getElementById("statusFieldGroup").style.display = "none";
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddAppointmentModal").addEventListener("click", openAddModal);
    document.getElementById("closeAddAppointmentModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddAppointment").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const id = document.getElementById("appointment_id").value;
        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        if (id) {
            data.status = document.getElementById("status").value;
        }

        const result = id
            ? await updateAppointment(id, data)
            : await createAppointment(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save appointment.", "error");

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
        showListAlert(id ? "Appointment updated successfully." : "Appointment scheduled successfully.", "success");
        await loadAppointments();
    });
}

function openEditModal(appointment)
{
    const modalOverlay = document.getElementById("addAppointmentModalOverlay");

    document.getElementById("appointment_id").value = appointment.id;
    document.getElementById("patient_id").value = appointment.patient_id;
    document.getElementById("provider_id").value = appointment.provider_id;
    document.getElementById("appointment_date").removeAttribute("min");
    document.getElementById("appointment_date").value = appointment.appointment_date;
    document.getElementById("appointment_time").value = appointment.appointment_time.slice(0, 5);
    document.getElementById("reason").value = appointment.reason ?? "";
    document.getElementById("status").value = appointment.status;

    document.getElementById("appointmentModalTitle").textContent = "Edit Appointment";
    document.getElementById("statusFieldGroup").style.display = "block";

    clearErrors();
    document.getElementById("formAlert").innerHTML = "";

    modalOverlay.classList.add("open");
}

async function loadPatientOptions()
{
    const result = await fetchPatients();
    const select = document.getElementById("patient_id");

    if (result.success) {
        result.data.forEach((patient) => {
            const option = document.createElement("option");

            option.value = patient.id;
            option.textContent = `${[patient.first_name, patient.last_name].filter(Boolean).join(" ")} (${patient.patient_no})`;

            select.appendChild(option);
        });
    }
}

async function loadProviderOptions()
{
    const result = await fetchProviders();
    const select = document.getElementById("provider_id");

    if (result.success) {
        result.data.forEach((provider) => {
            const option = document.createElement("option");

            option.value = provider.id;
            option.textContent = `${provider.first_name} ${provider.last_name}${provider.specialty ? " — " + provider.specialty : ""}`;

            select.appendChild(option);
        });
    }
}

async function loadAppointments()
{
    const result = await fetchAppointments();

    appointmentsCache = result.success ? result.data : [];

    renderAppointmentsTable(appointmentsCache);
}

function setupAppointmentFilters()
{
    const searchInput = document.getElementById("appointmentSearchInput");
    const statusFilter = document.getElementById("appointmentStatusFilter");

    const applyFilters = () => renderAppointmentsTable(getFilteredAppointments(searchInput, statusFilter));

    searchInput.addEventListener("input", applyFilters);
    statusFilter.addEventListener("change", applyFilters);
}

function getFilteredAppointments(searchInput, statusFilter)
{
    const term = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    return appointmentsCache.filter((appointment) => {
        if (status !== "all" && appointment.status !== status) {
            return false;
        }

        if (term === "") {
            return true;
        }

        const haystack = [
            appointment.patient_first_name,
            appointment.patient_last_name,
            appointment.patient_no,
            appointment.provider_first_name,
            appointment.provider_last_name,
            appointment.reason
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(term);
    });
}

function renderAppointmentsTable(appointments)
{
    renderAppointmentRows("appointmentsTableBody", appointments, {
        showDate: true,
        showProvider: true,
        emptyMessage: "No appointments scheduled yet.",
        onEdit: openEditModal,
        onCancel: async (id) => {
            await deleteAppointment(id);
            await loadAppointments();
        }
    });
}

function clearErrors()
{
    FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showAlert(message, type)
{
    const container = document.getElementById("formAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
