function dateTimeRecurrenceBlock(prefix)
{
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return `
        <div class="appt-datetime-box">
            <div class="form-grid">
                <div class="form-group full rp-permissions">
                    <label class="rp-checkbox">
                        <input type="radio" name="${prefix}daytype" id="${prefix}daytype_time" value="time" checked>
                        Time
                    </label>
                    <label class="rp-checkbox">
                        <input type="radio" name="${prefix}daytype" id="${prefix}daytype_allday" value="allday">
                        All Day Event
                    </label>
                </div>
            </div>

            <div class="form-grid">
                <div class="form-group">
                    <label>Date</label>
                    <input id="${prefix}appointment_date" type="date" class="form-input">
                    <span class="form-error" id="err-${prefix}appointment_date"></span>
                </div>
                <div class="form-group" id="${prefix}timeGroup">
                    <label>Time</label>
                    <input id="${prefix}appointment_time" type="time" class="form-input">
                    <span class="form-error" id="err-${prefix}appointment_time"></span>
                </div>
            </div>

            <div class="appt-recurrence-box">
                <div class="appt-recur-option">
                    <label class="rp-checkbox">
                        <input type="checkbox" id="${prefix}recur_repeat">
                        Repeating Appointment
                    </label>

                    <div class="appt-recur-specifics form-grid" id="${prefix}repeatGroup" hidden>
                        <div class="form-group">
                            <label>Position</label>
                            <select id="${prefix}recurrence_position" class="form-input">
                                <option value="every">Every</option>
                                <option value="2nd">2nd</option>
                                <option value="3rd">3rd</option>
                                <option value="4th">4th</option>
                                <option value="last">Last</option>
                            </select>
                            <span class="form-error" id="err-${prefix}recurrence_position"></span>
                        </div>
                        <div class="form-group">
                            <label>Day Type</label>
                            <select id="${prefix}recurrence_day_type" class="form-input">
                                <option value="day">Day</option>
                                <option value="weekday">Weekday</option>
                                <option value="weekend_day">Weekend Day</option>
                                <option value="sunday">Sunday</option>
                                <option value="monday">Monday</option>
                                <option value="tuesday">Tuesday</option>
                                <option value="wednesday">Wednesday</option>
                                <option value="thursday">Thursday</option>
                                <option value="friday">Friday</option>
                                <option value="saturday">Saturday</option>
                            </select>
                            <span class="form-error" id="err-${prefix}recurrence_day_type"></span>
                        </div>
                    </div>
                </div>

                <div class="appt-recur-option">
                    <label class="rp-checkbox">
                        <input type="checkbox" id="${prefix}recur_dow">
                        Days of the Week
                    </label>

                    <div class="appt-recur-specifics" id="${prefix}dowGroup" hidden>
                        <div class="rp-permissions">
                            ${days.map((day) => `
                                <label class="rp-checkbox">
                                    <input type="checkbox" class="${prefix}dow-check" value="${day}">
                                    ${day}
                                </label>
                            `).join("")}
                        </div>
                        <span class="form-error" id="err-${prefix}recurrence_days_of_week"></span>
                    </div>
                </div>

                <div class="appt-recur-option" id="${prefix}untilGroup" hidden>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Until</label>
                        <input id="${prefix}recurrence_until_date" type="date" class="form-input">
                        <span class="form-error" id="err-${prefix}recurrence_until_date"></span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function AppointmentCalendarView({ subtitle, showProviderField })
{
    return `
<style>
.appt-page {
    width: 100%;
    font-size: 13.5px;
}

.appt-card {
    width: 100%;
}

.appt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.appt-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.appt-icon-badge {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 7px;
    border: 1px solid #dbe1ea;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.appt-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.appt-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.appt-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.appt-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;
    margin: 16px 0 6px;
}

.appt-toolbar-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.appt-toolbar-nav {
    display: flex;
    align-items: center;
    gap: 10px;
}

.appt-tool-btn {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    background: white;
    color: #42536b;
    cursor: pointer;
}

.appt-tool-btn:hover {
    background: #f8fafc;
}

.appt-tool-btn:disabled {
    opacity: .45;
    cursor: default;
    pointer-events: none;
}

.appt-tool-btn svg {
    width: 16px;
    height: 16px;
}

.appt-tool-btn--accent {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
}

.appt-tool-btn--accent:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.appt-nav-label {
    font-size: 13.5px;
    font-weight: 700;
    color: #25324b;
    min-width: 190px;
    text-align: center;
}

.appt-search-wrap[hidden] {
    display: none;
}

.appt-search-input {
    height: 32px;
    padding: 0 10px;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    font-size: 12.5px;
    width: 220px;
}

.appt-view-switch {
    display: flex;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    overflow: hidden;
}

.appt-view-btn {
    padding: 0 14px;
    height: 32px;
    border: none;
    border-left: 1px solid #dbe1ea;
    background: white;
    font-size: 12.5px;
    font-weight: 600;
    color: #71809b;
    cursor: pointer;
}

.appt-view-btn:first-child {
    border-left: none;
}

.appt-view-btn.active {
    background: var(--accent);
    color: white;
}

#addAppointmentModalOverlay .modal-box,
#findAvailableModalOverlay .modal-box {
    max-width: 920px;
}

.appt-datetime-box {
    border: 1px solid #e5e9f0;
    border-radius: 10px;
    padding: 16px 16px 4px;
    margin: 4px 0 16px;
    background: #fbfcfe;
}

.appt-recurrence-box {
    margin-top: 4px;
    padding: 14px;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    background: white;
}

.appt-recur-option {
    margin-bottom: 14px;
}

.appt-recur-option:last-child {
    margin-bottom: 0;
}

.appt-recur-specifics {
    margin-top: 10px;
    padding-left: 26px;
}

.appt-edit-scope-box {
    max-width: 440px;
}

.appt-edit-scope-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 18px;
}

.appt-edit-scope-actions .btn-secondary {
    flex: none;
    height: 46px;
}

.appt-edit-scope-actions #cancelEditScope {
    color: #71809b;
    border-color: transparent;
}

.appt-form-actions {
    flex-wrap: wrap;
}

.appt-form-actions .btn-secondary,
.appt-form-actions .btn-danger {
    flex: 0 0 auto;
    min-width: 120px;
    height: 54px;
}

.appt-form-actions .login-btn {
    flex: 0 0 auto;
    min-width: 140px;
    margin-left: auto;
}

.fa-day-section {
    margin-top: 16px;
}

.fa-day-heading {
    font-size: 13px;
    font-weight: 700;
    color: #25324b;
    margin-bottom: 8px;
}

.fa-slot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 6px;
}

.fa-slot-btn {
    padding: 6px 4px;
    border-radius: 6px;
    border: 1px solid #dbe1ea;
    background: white;
    font-size: 12px;
    font-weight: 600;
    color: #25324b;
    cursor: pointer;
}

.fa-slot-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.fa-slot-btn.booked {
    background: #f1f5f9;
    color: #b6c0d0;
    cursor: not-allowed;
    text-decoration: line-through;
}

:root[data-theme="dark"] .appt-tool-btn:not(.appt-tool-btn--accent) {
    background: var(--bg-surface);
    border-color: var(--border-color);
    color: var(--text-muted);
}
:root[data-theme="dark"] .appt-tool-btn:not(.appt-tool-btn--accent):hover { background: var(--bg-surface-alt); }
:root[data-theme="dark"] .appt-nav-label { color: var(--text-primary); }
:root[data-theme="dark"] .appt-view-switch { border-color: var(--border-color); }
:root[data-theme="dark"] .appt-view-btn {
    background: var(--bg-surface);
    border-left-color: var(--border-color);
    color: var(--text-muted);
}
:root[data-theme="dark"] .appt-datetime-box,
:root[data-theme="dark"] .appt-recurrence-box {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
}
:root[data-theme="dark"] .fa-day-heading { color: var(--text-primary); }
:root[data-theme="dark"] .fa-slot-btn {
    background: var(--bg-surface);
    border-color: var(--border-color);
    color: var(--text-primary);
}
:root[data-theme="dark"] .fa-slot-btn.booked { background: var(--bg-surface-alt); color: var(--text-muted); }
</style>
<div class="appt-page">
    <div class="appt-card">
        <div class="appt-header">
            <div class="appt-header-title">
                <div class="appt-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
                </div>
                <div>
                    <h1>Appointments</h1>
                    <p class="form-subtitle">${subtitle}</p>
                </div>
            </div>
        </div>

        <div class="appt-toolbar">
            <div class="appt-toolbar-group">
                <button type="button" class="appt-tool-btn" id="apptToggleCalendar" title="Show/hide calendar" aria-label="Show/hide calendar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"></path></svg>
                </button>
                <button type="button" class="appt-tool-btn appt-tool-btn--accent" id="openAddAppointmentModal" title="New appointment" aria-label="New appointment">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                </button>
                <button type="button" class="appt-tool-btn" id="apptSearchToggle" title="Search appointments" aria-label="Search appointments">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                </button>
                <div class="appt-search-wrap" id="apptSearchWrap" hidden>
                    <input type="text" id="apptSearchInput" class="appt-search-input" placeholder="Search patient, provider, or reason...">
                </div>
            </div>

            <div class="appt-toolbar-nav">
                <button type="button" class="appt-tool-btn" id="apptNavPrev" aria-label="Previous">&lsaquo;</button>
                <span class="appt-nav-label" id="apptNavLabel"></span>
                <button type="button" class="appt-tool-btn" id="apptNavNext" aria-label="Next">&rsaquo;</button>
            </div>

            <div class="appt-toolbar-group">
                <button type="button" class="appt-tool-btn" id="apptPrintBtn" title="Print" aria-label="Print">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </button>
                <button type="button" class="appt-tool-btn" id="apptRefreshBtn" title="Refresh" aria-label="Refresh">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>
                </button>
                <div class="appt-view-switch">
                    <button type="button" class="appt-view-btn active" data-view="day">Day</button>
                    <button type="button" class="appt-view-btn" data-view="week">Week</button>
                    <button type="button" class="appt-view-btn" data-view="month">Month</button>
                </div>
            </div>
        </div>

        <div id="listAlert"></div>

        <div class="calendar-layout">
            <div class="calendar-panel">
                <div class="calendar-header">
                    <button type="button" id="calPrevMonth">&lsaquo;</button>
                    <h3 id="calMonthLabel"></h3>
                    <button type="button" id="calNextMonth">&rsaquo;</button>
                </div>
                <div class="mini-cal-grid" id="calendarGrid"></div>
            </div>

            <div class="timeline-panel">
                <div class="appt-timeline" id="apptViewBody"></div>
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

        <div id="formAlert"></div>

        <div class="modal-tabs">
            <button type="button" class="modal-tab active" data-tab="patient">Patient Appointment</button>
            <button type="button" class="modal-tab" data-tab="provider">Provider Block</button>
        </div>

        <form id="addAppointmentForm">
            <input type="hidden" id="appointment_id">
            <input type="hidden" id="recurrence_group_id">

            <div class="modal-tab-panel active" data-panel="patient">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="p_visit_category_id" class="form-input">
                            <option value="">Select category</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Title</label>
                        <input id="p_title" class="form-input" placeholder="Optional">
                    </div>

                    <div class="form-group">
                        <label>Facility</label>
                        <select id="p_facility_id" class="form-input">
                            <option value="">Select facility</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Billing Facility</label>
                        <select id="p_billing_facility_id" class="form-input">
                            <option value="">Select facility</option>
                        </select>
                    </div>

                    <div class="form-group full">
                        <label>Patient</label>
                        <select id="p_patient_id" class="form-input">
                            <option value="">Select patient</option>
                        </select>
                        <span class="form-error" id="err-p_patient_id"></span>
                    </div>

                    ${showProviderField ? `
                    <div class="form-group full">
                        <label>Provider</label>
                        <select id="p_provider_id" class="form-input">
                            <option value="">Select provider</option>
                        </select>
                        <span class="form-error" id="err-p_provider_id"></span>
                    </div>
                    ` : ""}
                </div>

                ${dateTimeRecurrenceBlock("p_")}

                <div class="form-grid">
                    <div class="form-group full" id="p_statusFieldGroup" style="display: none;">
                        <label>Status</label>
                        <select id="p_status" class="form-input">
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Room Number</label>
                        <select id="p_room_id" class="form-input">
                            <option value="">Select room</option>
                        </select>
                    </div>

                    <div class="form-group full">
                        <label>Comments</label>
                        <textarea id="p_notes" class="form-input" style="min-height: 70px;"></textarea>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="provider">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="b_provider_category_id" class="form-input">
                            <option value="">Select category</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Facility</label>
                        <select id="b_facility_id" class="form-input">
                            <option value="">Select facility</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Billing Facility</label>
                        <select id="b_billing_facility_id" class="form-input">
                            <option value="">Select facility</option>
                        </select>
                    </div>

                    ${showProviderField ? `
                    <div class="form-group">
                        <label>Provider</label>
                        <select id="b_provider_id" class="form-input">
                            <option value="">Select provider</option>
                        </select>
                        <span class="form-error" id="err-b_provider_id"></span>
                    </div>
                    ` : ""}
                </div>

                ${dateTimeRecurrenceBlock("b_")}

                <div class="form-grid">
                    <div class="form-group">
                        <label>Exclusive Category</label>
                        <select id="b_visit_category_id" class="form-input">
                            <option value="">Select category</option>
                        </select>
                    </div>

                    <div class="form-group full">
                        <label>Comments</label>
                        <textarea id="b_notes" class="form-input" style="min-height: 70px;"></textarea>
                    </div>
                </div>
            </div>

            <div class="form-actions appt-form-actions">
                <button type="button" class="btn-secondary" id="cancelAddAppointment">Cancel</button>
                <button type="button" class="btn-danger" id="deleteAppointmentBtn" style="display: none;">Delete</button>
                <button type="button" class="btn-secondary" id="duplicateAppointmentBtn" style="display: none;">Create Duplicate</button>
                <button type="button" class="btn-secondary" id="findAvailableBtn">Find Available</button>
                <button class="login-btn" type="submit">Save</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="findAvailableModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Find Available Time</h2>
            <button type="button" class="modal-close" id="closeFindAvailableModal">&times;</button>
        </div>
        <p class="form-subtitle">Search this provider's open slots (8:00 AM&ndash;5:00 PM, 30-minute increments).</p>

        <div id="findAvailableAlert"></div>

        <div class="form-grid">
            <div class="form-group">
                <label>Start Date</label>
                <input id="fa_start_date" type="date" class="form-input">
            </div>
            <div class="form-group">
                <label>Number of Days</label>
                <input id="fa_days" type="number" min="1" max="60" value="7" class="form-input">
            </div>
        </div>

        <div class="form-actions">
            <button type="button" class="btn-secondary" id="closeFindAvailableBtn">Close</button>
            <button type="button" class="login-btn" id="faSearchBtn">Search</button>
        </div>

        <div id="findAvailableResults"></div>
    </div>
</div>

<div class="modal-overlay" id="editScopeModalOverlay">
    <div class="modal-box appt-edit-scope-box">
        <div class="modal-header">
            <h2>Edit Recurring Appointment</h2>
        </div>
        <p class="form-subtitle">This appointment is part of a recurring series. Which occurrences should this change apply to?</p>

        <div class="appt-edit-scope-actions">
            <button type="button" class="btn-secondary" data-scope="all">All Occurrences</button>
            <button type="button" class="btn-secondary" data-scope="future">This and Future Occurrences</button>
            <button type="button" class="btn-secondary" data-scope="this">Just This Occurrence</button>
            <button type="button" class="btn-secondary" id="cancelEditScope">Cancel</button>
        </div>
    </div>
</div>
`;
}
