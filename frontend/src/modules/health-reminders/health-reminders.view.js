export function HealthRemindersView()
{
    return `
<style>
.hr-page {
    width: 100%;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #0f172a;
    padding-bottom: 32px;
}

.hr-header-card {
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 24px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.hr-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
}

.hr-header-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.hr-header-text h1 {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    color: #0f172a;
}

.hr-header-text p {
    margin: 3px 0 0;
    font-size: 13px;
    color: #64748b;
}

/* Stats Row */
.hr-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
}

.hr-stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.hr-stat-icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.hr-stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.1;
}

.hr-stat-label {
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
}

/* Filter Tabs */
.hr-filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
    flex-wrap: wrap;
}

.hr-filter-btn {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid transparent;
    padding: 7px 16px;
    border-radius: 20px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.hr-filter-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
}

.hr-filter-btn.active {
    background: #2563eb;
    color: #ffffff;
}

.hr-filter-count {
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.08);
}

.hr-filter-btn.active .hr-filter-count {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
}

/* Reminders List & Cards */
.hr-section {
    margin-bottom: 28px;
}

.hr-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.hr-section-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
}

.hr-cards-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.hr-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.hr-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
}

.hr-card-past-due {
    border-left: 4px solid #ef4444;
}

.hr-card-due {
    border-left: 4px solid #3b82f6;
}

.hr-card-sent {
    border-left: 4px solid #10b981;
}

.hr-card-main {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    flex: 1;
}

.hr-card-icon-box {
    width: 42px;
    height: 42px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.hr-card-content {
    flex: 1;
}

.hr-card-category {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 7px;
    border-radius: 4px;
    margin-bottom: 5px;
}

.hr-card-title {
    font-size: 15px;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 5px 0;
    line-height: 1.35;
}

.hr-card-meta {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 12.5px;
    color: #64748b;
    flex-wrap: wrap;
}

.hr-card-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.hr-card-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.hr-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.hr-badge-past-due {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

.hr-badge-due {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
}

.hr-badge-sent {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
}

.hr-btn-schedule {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
}

.hr-btn-schedule:hover {
    background: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
}

.hr-empty-box {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    padding: 36px 20px;
    text-align: center;
    color: #64748b;
}

.hr-empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
}

/* Dark mode */
:root[data-theme="dark"] .hr-page {
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .hr-header-card {
    background: var(--bg-surface-alt, #172033);
    border-color: var(--border-color, #334155);
}
:root[data-theme="dark"] .hr-header-icon {
    background: rgba(37, 99, 235, 0.18);
    color: #60a5fa;
}
:root[data-theme="dark"] .hr-header-text h1 {
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .hr-header-text p {
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .hr-stat-card {
    background: var(--bg-surface, #1e293b);
    border-color: var(--border-color, #334155);
}
:root[data-theme="dark"] .hr-stat-value {
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .hr-stat-label {
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .hr-filter-bar {
    border-bottom-color: var(--border-color, #334155);
}
:root[data-theme="dark"] .hr-filter-btn {
    background: var(--bg-surface, #1e293b);
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .hr-filter-btn:hover {
    background: var(--bg-surface-alt, #334155);
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .hr-filter-btn.active {
    background: #3b82f6;
    color: #ffffff;
}
:root[data-theme="dark"] .hr-section-title {
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .hr-card {
    background: var(--bg-surface, #1e293b);
    border-color: var(--border-color, #334155);
}
:root[data-theme="dark"] .hr-card-title {
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .hr-card-meta {
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .hr-empty-box {
    background: var(--bg-surface-alt, #172033);
    border-color: var(--border-color, #334155);
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .hr-btn-schedule {
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.35);
}
:root[data-theme="dark"] .hr-btn-schedule:hover {
    background: #2563eb;
    color: #ffffff;
}
</style>

<div class="hr-page">
    <!-- Header Card -->
    <div class="hr-header-card">
        <div class="hr-header-left">
            <div class="hr-header-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </div>
            <div class="hr-header-text">
                <h1>Health Reminders</h1>
                <p>Preventive care, routine screenings, and clinical assessments due for you</p>
            </div>
        </div>
        <div>
            <button type="button" class="hr-btn-schedule" id="hrBtnScheduleGlobal" style="padding: 10px 18px; font-size: 13px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Schedule Appointment
            </button>
        </div>
    </div>

    <!-- Summary Stats -->
    <div class="hr-stats-grid">
        <div class="hr-stat-card">
            <div class="hr-stat-icon-wrap" style="background: #eff6ff; color: #2563eb;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div>
                <div class="hr-stat-value" id="hrStatTotal">0</div>
                <div class="hr-stat-label">Total Reminders</div>
            </div>
        </div>
        <div class="hr-stat-card">
            <div class="hr-stat-icon-wrap" style="background: #fef2f2; color: #dc2626;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div>
                <div class="hr-stat-value" id="hrStatPastDue" style="color: #dc2626;">0</div>
                <div class="hr-stat-label">Past Due Items</div>
            </div>
        </div>
        <div class="hr-stat-card">
            <div class="hr-stat-icon-wrap" style="background: #eff6ff; color: #2563eb;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div>
                <div class="hr-stat-value" id="hrStatDue" style="color: #2563eb;">0</div>
                <div class="hr-stat-label">Due Now</div>
            </div>
        </div>
        <div class="hr-stat-card">
            <div class="hr-stat-icon-wrap" style="background: #ecfdf5; color: #059669;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
                <div class="hr-stat-value" id="hrStatSent" style="color: #059669;">0</div>
                <div class="hr-stat-label">Sent / Acknowledged</div>
            </div>
        </div>
    </div>

    <!-- Filter Buttons -->
    <div class="hr-filter-bar">
        <button type="button" class="hr-filter-btn active" data-filter="all">
            All Reminders <span class="hr-filter-count" id="hrCountAll">0</span>
        </button>
        <button type="button" class="hr-filter-btn" data-filter="past_due">
            ⚠️ Past Due <span class="hr-filter-count" id="hrCountPastDue">0</span>
        </button>
        <button type="button" class="hr-filter-btn" data-filter="due">
            ⏱️ Due Now <span class="hr-filter-count" id="hrCountDue">0</span>
        </button>
        <button type="button" class="hr-filter-btn" data-filter="sent">
            ✓ Sent / Acknowledged <span class="hr-filter-count" id="hrCountSent">0</span>
        </button>
    </div>

    <!-- Sections -->
    <div class="hr-section" id="hrSectionDue">
        <div class="hr-section-header">
            <h2 class="hr-section-title">
                <span style="color: #2563eb;">⚡</span> Action Required / Due Now
            </h2>
        </div>
        <div class="hr-cards-list" id="healthRemindersDue">
            <div class="hr-empty-box">Loading health reminders...</div>
        </div>
    </div>

    <div class="hr-section" id="hrSectionSent">
        <div class="hr-section-header">
            <h2 class="hr-section-title">
                <span style="color: #059669;">✓</span> Sent &amp; Acknowledged Reminders
            </h2>
        </div>
        <div class="hr-cards-list" id="healthRemindersSent">
            <div class="hr-empty-box">Loading...</div>
        </div>
    </div>
</div>

<!-- Modal for Scheduling Appointment with Auto-Fill -->
<div class="modal-overlay" id="hrApptModalOverlay">
    <div class="modal-box" style="max-width: 620px;">
        <div class="modal-header">
            <div>
                <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;" id="hrModalTitle">Schedule Clinical Visit</h2>
                <p style="margin: 3px 0 0; font-size: 12.5px; color: #64748b;">Request an appointment for your preventive care or screening item</p>
            </div>
            <button type="button" class="modal-close" id="hrModalCloseBtn">&times;</button>
        </div>

        <div id="hrModalReminderBanner" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 16px 0 20px 0; display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px; flex-shrink: 0;" id="hrModalBannerIcon">🩺</div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #dbeafe; color: #1d4ed8;" id="hrModalBannerCategory">ASSESSMENT</span>
                    <span style="font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 9999px;" id="hrModalBannerUrgency">Action Due</span>
                </div>
                <strong style="font-size: 14px; color: #0f172a;" id="hrModalBannerItem">Assessment - Coumadin Management INR Monitoring</strong>
            </div>
        </div>

        <div id="hrModalAlert"></div>

        <form id="hrModalForm">
            <div class="form-grid">
                <div class="form-group">
                    <label>Preferred Provider <span style="color: #ef4444;">*</span></label>
                    <select id="hrModalProvider" class="form-input">
                        <option value="">Select healthcare provider</option>
                    </select>
                    <span class="form-error" id="hr-err-provider_id"></span>
                </div>

                <div class="form-group">
                    <label>Facility Location</label>
                    <select id="hrModalFacility" class="form-input">
                        <option value="">Any available facility</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Preferred Date <span style="color: #ef4444;">*</span></label>
                    <input type="date" id="hrModalDate" class="form-input">
                    <span class="form-error" id="hr-err-appointment_date"></span>
                </div>

                <div class="form-group full">
                    <label>Available Times <span style="color: #ef4444;">*</span></label>
                    <div class="appt-slot-picker" id="hrModalSlotPicker">
                        <div class="appt-slot-empty">Choose a provider and date to see open appointment times.</div>
                    </div>
                    <span class="form-error" id="hr-err-appointment_time"></span>
                </div>

                <div class="form-group full">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label style="margin: 0;">Reason for Visit <span style="color: #ef4444;">*</span></label>
                        <span style="font-size: 11px; color: #0284c7; font-weight: 600;">✨ Auto-filled from Health Reminder</span>
                    </div>
                    <input type="text" id="hrModalReason" class="form-input" style="background: #f8fafc; font-weight: 500;" placeholder="e.g. Assessment - Coumadin Management INR Monitoring">
                    <span class="form-error" id="hr-err-reason"></span>
                </div>

                <div class="form-group full">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label style="margin: 0;">Additional Clinical Notes</label>
                        <span style="font-size: 11px; color: #0284c7; font-weight: 600;">✨ Auto-filled Details</span>
                    </div>
                    <textarea id="hrModalNotes" class="form-input" style="height: 68px; background: #f8fafc; font-size: 12.5px; line-height: 1.4;" placeholder="Optional clinical background or patient symptoms..."></textarea>
                </div>
            </div>

            <div class="form-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="btn-secondary" id="hrModalCancelBtn">Cancel</button>
                <button class="login-btn" type="submit" id="hrModalSubmitBtn" style="padding: 0 20px;">
                    Confirm &amp; Request Visit &rarr;
                </button>
            </div>
        </form>
    </div>
</div>
`;
}
