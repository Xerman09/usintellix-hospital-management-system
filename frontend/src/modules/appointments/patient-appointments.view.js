export function PatientAppointmentsView()
{
    return `
<div class="pt-appt-page">
    <div class="pt-appt-topbar">
        <div>
            <h1>Appointments</h1>
            <p>Your upcoming and past visits</p>
        </div>

        <div class="pt-appt-view-switch">
            <button type="button" class="pt-appt-view-btn active" data-view="list">List</button>
            <button type="button" class="pt-appt-view-btn" data-view="calendar">Calendar</button>
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
`;
}
