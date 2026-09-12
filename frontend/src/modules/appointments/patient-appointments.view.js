export function PatientAppointmentsView()
{
    return `
<div class="pt-appt-page">
    <div class="pt-appt-topbar">
        <div>
            <h1>Appointments</h1>
            <p>Your upcoming and past visits</p>
        </div>

        <div class="pt-appt-topbar-actions">
            <div class="pt-appt-view-switch">
                <button type="button" class="pt-appt-view-btn active" data-view="list">List</button>
                <button type="button" class="pt-appt-view-btn" data-view="calendar">Calendar</button>
            </div>
            <button type="button" class="pt-appt-request-btn" id="apptRequestBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Request Appointment
            </button>
        </div>
    </div>

    <div class="pt-appt-body">
        <div class="pt-appt-view-panel" id="apptListView">
            <div class="appt-section">
                <h2 class="appt-section-title">Upcoming</h2>
                <div class="appt-list" id="apptUpcomingList">
                    <div class="appt-empty">Loading...</div>
                </div>
            </div>

            <div class="appt-section">
                <h2 class="appt-section-title">Past</h2>
                <div class="appt-list" id="apptPastList">
                    <div class="appt-empty">Loading...</div>
                </div>
            </div>
        </div>

        <div class="pt-appt-view-panel" id="apptCalendarView" hidden>
            <div class="pt-appt-cal-nav">
                <button type="button" class="pt-appt-nav-btn" id="apptCalPrev" aria-label="Previous month">&lsaquo;</button>
                <span class="pt-appt-cal-label" id="apptCalLabel"></span>
                <button type="button" class="pt-appt-nav-btn" id="apptCalNext" aria-label="Next month">&rsaquo;</button>
            </div>

            <div class="appt-month-grid" id="apptCalGrid"></div>

            <div class="appt-section pt-appt-cal-day">
                <h2 class="appt-section-title" id="apptCalDayTitle">Select a date</h2>
                <div class="appt-list" id="apptCalDayList">
                    <div class="appt-empty">Click a date on the calendar to see that day's appointments.</div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="apptRequestModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Request an Appointment</h2>
            <button type="button" class="modal-close" id="apptRequestCloseBtn">&times;</button>
        </div>
        <p class="form-subtitle">Pick a provider and an open time below. Your request goes straight onto the schedule.</p>

        <div id="apptRequestAlert"></div>

        <form id="apptRequestForm">
            <div class="form-grid">
                <div class="form-group">
                    <label>Provider</label>
                    <select id="apptReqProvider" class="form-input">
                        <option value="">Select provider</option>
                    </select>
                    <span class="form-error" id="err-provider_id"></span>
                </div>

                <div class="form-group">
                    <label>Facility</label>
                    <select id="apptReqFacility" class="form-input">
                        <option value="">Any facility</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Date</label>
                    <input type="date" id="apptReqDate" class="form-input">
                    <span class="form-error" id="err-appointment_date"></span>
                </div>

                <div class="form-group full">
                    <label>Available Times</label>
                    <div class="appt-slot-picker" id="apptSlotPicker">
                        <div class="appt-slot-empty">Choose a provider and date to see open times.</div>
                    </div>
                    <span class="form-error" id="err-appointment_time"></span>
                </div>

                <div class="form-group full">
                    <label>Reason for Visit</label>
                    <input type="text" id="apptReqReason" class="form-input" placeholder="e.g. Annual physical, follow-up, new symptom...">
                </div>

                <div class="form-group full">
                    <label>Additional Notes</label>
                    <textarea id="apptReqNotes" class="form-input" placeholder="Optional"></textarea>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="apptRequestCancelBtn">Cancel</button>
                <button class="login-btn" type="submit" id="apptRequestSubmitBtn">Request Appointment</button>
            </div>
        </form>
    </div>
</div>
`;
}
