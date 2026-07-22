import { appointmentTableShell } from "./appointment-table.js";

export function DoctorCalendarView()
{
    return `
<div class="form-page">
    <div class="form-card form-card--calendar">
        <div class="panel-header-row">
            <div>
                <h1>Appointments</h1>
                <p class="form-subtitle">Your schedule and today's reminders.</p>
            </div>
            <button type="button" class="btn-primary-inline" id="openAddAppointmentModal">+ New Appointment</button>
        </div>

        <div id="listAlert"></div>

        <div class="calendar-layout">
            <div class="appointment-list-panel">
                <h3 id="appointmentListLabel">Appointment List</h3>
                ${appointmentTableShell({ tbodyId: "doctorAppointmentsListBody", showDate: false, showProvider: false })}
            </div>

            <div class="calendar-panel">
                <div class="calendar-header">
                    <button type="button" id="calPrevMonth">&lsaquo;</button>
                    <h3 id="calMonthLabel"></h3>
                    <button type="button" id="calNextMonth">&rsaquo;</button>
                </div>
                <div class="calendar-grid" id="calendarGrid"></div>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="addAppointmentModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="appointmentModalTitle">New Appointment</h2>
            <button type="button" class="modal-close" id="closeAddAppointmentModal">&times;</button>
        </div>
        <p class="form-subtitle">Book a visit with one of your assigned patients.</p>

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
