import { fetchAppointments } from "../appointments/appointments.service.js";
import { formatApptDate, formatApptTime, statusLabel } from "../appointments/appointment-format.js";

export function initPatientProfile(patient)
{
    const tabs = document.querySelectorAll(".modal-tab");
    const panels = document.querySelectorAll(".modal-tab-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            document.querySelector(`.modal-tab-panel[data-panel="${tab.getAttribute("data-tab")}"]`).classList.add("active");
        });
    });

    loadPatientAppointments(patient);
}

async function loadPatientAppointments(patient)
{
    const tbody = document.getElementById("patientAppointmentsBody");

    if (!tbody) {
        return;
    }

    const result = await fetchAppointments({ patient_id: patient.id });

    if (!result.success || !result.data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No appointments recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = result.data.map((appointment) => `
        <tr>
            <td>${formatApptDate(appointment.appointment_date)}</td>
            <td>${formatApptTime(appointment.appointment_time)}</td>
            <td>${appointment.provider_first_name} ${appointment.provider_last_name}</td>
            <td>${appointment.reason ?? "-"}</td>
            <td><span class="status-badge ${appointment.status}">${statusLabel(appointment.status)}</span></td>
        </tr>
    `).join("");
}
