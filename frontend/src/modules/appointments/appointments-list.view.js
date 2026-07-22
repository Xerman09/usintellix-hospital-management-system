import { appointmentTableShell } from "./appointment-table.js";

export function AppointmentsListView(user)
{
    return `
<div class="form-page">
    <div class="form-card">
        <div class="panel-header-row">
            <div>
                <h1>Appointments</h1>
                <p class="form-subtitle">Schedule and manage patient appointments.</p>
            </div>
            <div class="panel-header-actions">
                <input type="text" id="appointmentSearchInput" class="form-input search-input" placeholder="Search by patient, provider, or reason...">
                <select id="appointmentStatusFilter" class="form-input filter-select">
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                </select>
                <button type="button" class="btn-primary-inline" id="openAddAppointmentModal">+ New Appointment</button>
            </div>
        </div>

        <div id="listAlert"></div>

        ${appointmentTableShell({ tbodyId: "appointmentsTableBody", showDate: true, showProvider: true, emptyMessage: "Loading appointments..." })}
    </div>
</div>

<div class="modal-overlay" id="addAppointmentModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="appointmentModalTitle">New Appointment</h2>
            <button type="button" class="modal-close" id="closeAddAppointmentModal">&times;</button>
        </div>
        <p class="form-subtitle">Book a visit for a patient with one of your providers.</p>

        <div id="formAlert"></div>

        <form id="addAppointmentForm">
            <input type="hidden" id="appointment_id">

            <div class="form-grid">
                <div class="form-group full">
                    <label>Patient</label>
                    <select id="patient_id" class="form-input">
                        <option value="">Select patient</option>
                    </select>
                    <span class="form-error" id="err-patient_id"></span>
                </div>

                <div class="form-group full">
                    <label>Provider</label>
                    <select id="provider_id" class="form-input">
                        <option value="">Select provider</option>
                    </select>
                    <span class="form-error" id="err-provider_id"></span>
                </div>

                <div class="form-group">
                    <label>Date</label>
                    <input id="appointment_date" type="date" class="form-input">
                    <span class="form-error" id="err-appointment_date"></span>
                </div>

                <div class="form-group">
                    <label>Time</label>
                    <input id="appointment_time" type="time" class="form-input">
                    <span class="form-error" id="err-appointment_time"></span>
                </div>

                <div class="form-group full">
                    <label>Reason</label>
                    <input id="reason" class="form-input" placeholder="e.g Follow-up checkup (optional)">
                    <span class="form-error"></span>
                </div>

                <div class="form-group full" id="statusFieldGroup" style="display: none;">
                    <label>Status</label>
                    <select id="status" class="form-input">
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                    </select>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAddAppointment">Cancel</button>
                <button class="login-btn" type="submit">Save Appointment</button>
            </div>
        </form>
    </div>
</div>
`;
}
