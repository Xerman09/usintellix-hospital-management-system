import { formatApptDate, formatApptTime, statusLabel } from "./appointment-format.js";

/**
 * Shared table shell (thead + empty tbody) reused by the admin/receptionist
 * Appointments page and the doctor calendar's Appointment List / Day Details panels,
 * so all three stay visually and structurally identical.
 */
export function appointmentTableShell({ tbodyId, showDate = true, showProvider = false, emptyMessage = "Loading..." })
{
    const colspan = 5 + (showDate ? 1 : 0) + (showProvider ? 1 : 0);

    return `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        ${showDate ? "<th>Date</th>" : ""}
                        <th>Time</th>
                        <th>Patient</th>
                        ${showProvider ? "<th>Provider</th>" : ""}
                        <th>Reason</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="${tbodyId}">
                    <tr><td colspan="${colspan}" class="table-empty">${emptyMessage}</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Shared row rendering + Edit/Cancel wiring for an appointment table body.
 * onEdit(appointment) opens whichever edit modal the calling page owns;
 * onCancel(id, appointmentDate) performs the delete and any page-specific refresh.
 */
export function renderAppointmentRows(tbodyId, appointments, { showDate = true, showProvider = false, emptyMessage = "No appointments found.", onEdit, onCancel })
{
    const tbody = document.getElementById(tbodyId);
    const colspan = 5 + (showDate ? 1 : 0) + (showProvider ? 1 : 0);

    if (!appointments.length) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="table-empty">${emptyMessage}</td></tr>`;
        return;
    }

    tbody.innerHTML = appointments.map((appointment) => `
        <tr>
            ${showDate ? `<td>${formatApptDate(appointment.appointment_date)}</td>` : ""}
            <td>${formatApptTime(appointment.appointment_time)}</td>
            <td>${[appointment.patient_first_name, appointment.patient_last_name].filter(Boolean).join(" ")}</td>
            ${showProvider ? `<td>${appointment.provider_first_name} ${appointment.provider_last_name}</td>` : ""}
            <td>${appointment.reason ?? "-"}</td>
            <td><span class="status-badge ${appointment.status}">${statusLabel(appointment.status)}</span></td>
            <td class="table-actions">
                <button class="btn-edit" data-edit-id="${appointment.id}">Edit</button>
                <button class="btn-danger" data-id="${appointment.id}" data-date="${appointment.appointment_date}">Cancel</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const appointment = appointments.find((a) => String(a.id) === btn.getAttribute("data-edit-id"));

            if (appointment) {
                onEdit(appointment);
            }
        });
    });

    tbody.querySelectorAll(".btn-danger").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this appointment?")) {
                return;
            }

            await onCancel(btn.getAttribute("data-id"), btn.getAttribute("data-date"));
        });
    });
}
