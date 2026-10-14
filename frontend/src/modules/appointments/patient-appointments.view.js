export function PatientAppointmentsView()
{
    return `
<style>
/* ========================================================
   PREMIUM PATIENT APPOINTMENTS & CALENDAR STYLING
   ======================================================== */
.pt-appt-page {
    display: flex;
    flex-direction: column;
    margin: -24px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text-primary, #1e293b);
}

.pt-appt-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid var(--border-color, #e5e9f0);
    background: var(--bg-surface, #ffffff);
    flex-wrap: wrap;
    gap: 16px;
}

:root[data-theme="dark"] .pt-appt-topbar {
    border-bottom-color: var(--border-color);
}

.pt-appt-topbar h1 {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    color: var(--text-primary, #14181f);
    letter-spacing: -0.01em;
}

.pt-appt-topbar p {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--text-muted, #6b7787);
}

.pt-appt-topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Modern Segmented View Switch */
.pt-appt-view-switch {
    display: inline-flex;
    background: var(--bg-surface-alt, #f1f5f9);
    border: 1px solid var(--border-color, #dbe1ea);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
}

.pt-appt-view-btn {
    padding: 6px 16px;
    height: 30px;
    border: none;
    background: transparent;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted, #64748b);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.pt-appt-view-btn:hover {
    color: var(--text-primary, #0f172a);
}

.pt-appt-view-btn.active {
    background: var(--bg-surface, #ffffff);
    color: #0284c7;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

:root[data-theme="dark"] .pt-appt-view-btn.active {
    color: #38bdf8;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.pt-appt-request-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 16px;
    height: 36px;
    border-radius: 6px;
    background: #0284c7;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid #0284c7;
    cursor: pointer;
    transition: all 0.15s ease;
}

.pt-appt-request-btn:hover {
    background: #0369a1;
    border-color: #0369a1;
}

.pt-appt-request-btn svg {
    width: 15px;
    height: 15px;
}

.pt-appt-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* ========================================================
   PREMIUM CALENDAR CARD
   ======================================================== */
.appt-calendar-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 12px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06);
    overflow: hidden;
}

:root[data-theme="dark"] .appt-calendar-card {
    background: var(--bg-surface);
    border-color: var(--border-color);
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.4);
}

/* Calendar Navigation Bar */
.pt-appt-cal-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--bg-surface, #ffffff);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    flex-wrap: wrap;
    gap: 12px;
}

:root[data-theme="dark"] .pt-appt-cal-nav {
    background: var(--bg-surface);
    border-bottom-color: var(--border-color);
}

.pt-appt-cal-nav-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pt-appt-cal-label {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    letter-spacing: -0.01em;
}

:root[data-theme="dark"] .pt-appt-cal-label {
    color: var(--text-primary);
}

.pt-cal-month-badge {
    font-size: 11.5px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 12px;
    background: var(--bg-surface-alt, #f1f5f9);
    color: var(--text-muted, #475569);
    border: 1px solid var(--border-color, #e2e8f0);
}

:root[data-theme="dark"] .pt-cal-month-badge {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-muted);
}

.pt-appt-cal-nav-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.pt-appt-today-btn {
    height: 32px;
    padding: 0 14px;
    font-size: 12.5px;
    font-weight: 600;
    border-radius: 6px;
    border: 1px solid var(--border-color, #cbd5e1);
    background: var(--bg-surface-alt, #ffffff);
    color: var(--text-primary, #334155);
    cursor: pointer;
    transition: all 0.15s ease;
}

.pt-appt-today-btn:hover {
    background: var(--bg-surface);
    border-color: #0284c7;
    color: #0284c7;
}

:root[data-theme="dark"] .pt-appt-today-btn:hover {
    border-color: #38bdf8;
    color: #38bdf8;
}

.pt-appt-nav-btn {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: 1px solid var(--border-color, #cbd5e1);
    background: var(--bg-surface-alt, #ffffff);
    color: var(--text-primary, #475569);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
}

.pt-appt-nav-btn:hover {
    border-color: #0284c7;
    color: #0284c7;
}

:root[data-theme="dark"] .pt-appt-nav-btn:hover {
    border-color: #38bdf8;
    color: #38bdf8;
}

.pt-appt-nav-btn svg {
    width: 16px;
    height: 16px;
}

/* DOW Ribbon Header */
.appt-month-dow-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: var(--bg-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
}

:root[data-theme="dark"] .appt-month-dow-row {
    background: var(--bg-surface-alt);
    border-bottom-color: var(--border-color);
}

.appt-month-dow {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-muted, #64748b);
    padding: 10px 4px;
    text-transform: uppercase;
}

/* Hairline Grid of Day Cells */
.appt-month-cells-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--border-color, #e2e8f0);
}

:root[data-theme="dark"] .appt-month-cells-grid {
    background: var(--border-color);
}

.appt-month-day {
    position: relative;
    min-height: 115px;
    padding: 8px 10px;
    background: var(--bg-surface, #ffffff);
    cursor: pointer;
    transition: background 0.15s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
    box-sizing: border-box;
}

:root[data-theme="dark"] .appt-month-day {
    background: var(--bg-surface);
}

.appt-month-day:hover {
    background: var(--bg-surface-alt, #f8fafc);
}

:root[data-theme="dark"] .appt-month-day:hover {
    background: rgba(255, 255, 255, 0.03);
}

.appt-month-day.other-month {
    background: rgba(248, 250, 252, 0.6);
    opacity: 0.45;
}

:root[data-theme="dark"] .appt-month-day.other-month {
    background: rgba(15, 23, 42, 0.4);
    opacity: 0.4;
}

.appt-month-day.selected {
    background: rgba(2, 132, 199, 0.1) !important;
    outline: 2px solid #0284c7;
    outline-offset: -2px;
}

:root[data-theme="dark"] .appt-month-day.selected {
    background: rgba(56, 189, 248, 0.12) !important;
    outline: 2px solid #38bdf8;
    outline-offset: -2px;
}

.appt-month-day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    min-height: 24px;
}

.appt-month-daynum {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #334155);
}

.appt-month-day.other-month .appt-month-daynum {
    color: var(--text-muted, #94a3b8);
}

.appt-month-daynum.today-pill {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #0284c7;
    color: #ffffff !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    font-weight: 700;
    box-shadow: 0 0 10px rgba(2, 132, 199, 0.5);
}

.appt-day-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    background: rgba(2, 132, 199, 0.15);
    color: #0284c7;
}

:root[data-theme="dark"] .appt-day-badge {
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
}

.appt-day-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-muted, #94a3b8);
}

/* Appointment Chips */
.appt-month-chips {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

.appt-month-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    background: #e0f2fe;
    border: 1px solid #bae6fd;
    color: #0369a1;
    transition: all 0.12s ease;
    overflow: hidden;
}

:root[data-theme="dark"] .appt-month-chip {
    background: rgba(2, 132, 199, 0.22);
    border-color: rgba(56, 189, 248, 0.35);
    color: #e0f2fe;
}

.appt-month-chip:hover {
    background: #bae6fd;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

:root[data-theme="dark"] .appt-month-chip:hover {
    background: rgba(2, 132, 199, 0.35);
    border-color: #38bdf8;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
}

.appt-month-chip.other-month-chip {
    opacity: 0.6;
    background: var(--bg-surface-alt, #f1f5f9);
    border-color: var(--border-color, #e2e8f0);
    color: var(--text-muted, #64748b);
}

.appt-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #0284c7;
    flex-shrink: 0;
}

:root[data-theme="dark"] .appt-chip-dot {
    background: #38bdf8;
    box-shadow: 0 0 6px rgba(56, 189, 248, 0.6);
}

.appt-chip-time {
    font-weight: 700;
    color: #0284c7;
    flex-shrink: 0;
}

:root[data-theme="dark"] .appt-chip-time {
    color: #38bdf8;
}

.appt-chip-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.appt-month-more {
    font-size: 11px;
    font-weight: 600;
    color: #0284c7;
    padding: 2px 4px;
}

:root[data-theme="dark"] .appt-month-more {
    color: #38bdf8;
}

/* Day Agenda Section Below Calendar */
.pt-appt-cal-day-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

:root[data-theme="dark"] .pt-appt-cal-day-card {
    background: var(--bg-surface);
    border-color: var(--border-color);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.pt-appt-cal-day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    padding-bottom: 12px;
}

:root[data-theme="dark"] .pt-appt-cal-day-header {
    border-bottom-color: var(--border-color);
}

.pt-appt-cal-day-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 8px;
}

.appt-empty-agenda {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: var(--text-muted, #64748b);
    font-size: 13.5px;
    padding: 16px 0;
    flex-wrap: wrap;
}

.appt-empty-agenda-left {
    display: flex;
    align-items: center;
    gap: 10px;
}
</style>

<div class="pt-appt-page">
    <div class="pt-appt-topbar">
        <div>
            <h1>Appointments</h1>
            <p>Your upcoming and past visits</p>
        </div>

        <div class="pt-appt-topbar-actions">
            <div class="pt-appt-view-switch">
                <button type="button" class="pt-appt-view-btn" data-view="list">List View</button>
                <button type="button" class="pt-appt-view-btn active" data-view="calendar">Calendar View</button>
            </div>
            <button type="button" class="pt-appt-request-btn" id="apptRequestBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Request Appointment
            </button>
        </div>
    </div>

    <div class="pt-appt-body">
        <!-- List View Panel -->
        <div class="pt-appt-view-panel" id="apptListView" hidden>
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

        <!-- Calendar View Panel -->
        <div class="pt-appt-view-panel" id="apptCalendarView">
            <div class="appt-calendar-card">
                <div class="pt-appt-cal-nav">
                    <div class="pt-appt-cal-nav-left">
                        <span class="pt-appt-cal-label" id="apptCalLabel"></span>
                        <span class="pt-cal-month-badge" id="apptCalMonthCount">0 appointments</span>
                    </div>

                    <div class="pt-appt-cal-nav-controls">
                        <button type="button" class="pt-appt-today-btn" id="apptCalToday">Today</button>
                        <button type="button" class="pt-appt-nav-btn" id="apptCalPrev" aria-label="Previous month" title="Previous month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button type="button" class="pt-appt-nav-btn" id="apptCalNext" aria-label="Next month" title="Next month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Calendar Grid Container -->
                <div id="apptCalGrid"></div>
            </div>

            <!-- Day Agenda Card Below Calendar -->
            <div class="pt-appt-cal-day-card">
                <div class="pt-appt-cal-day-header">
                    <h3 id="apptCalDayTitle">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Select a date
                    </h3>
                </div>
                <div class="appt-list" id="apptCalDayList">
                    <div class="appt-empty">Click any date on the calendar to see that day's scheduled appointments.</div>
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
