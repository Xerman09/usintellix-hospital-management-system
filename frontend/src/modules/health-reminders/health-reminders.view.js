export function HealthRemindersView()
{
    return `
<div class="pt-appt-page">
    <div class="pt-appt-topbar">
        <div>
            <h1>Health Reminders</h1>
            <p>Preventive care and screenings due for you</p>
        </div>
    </div>

    <div class="pt-appt-body">
        <div class="appt-section">
            <h2 class="appt-section-title">Due Now</h2>
            <div class="appt-list" id="healthRemindersDue">
                <div class="appt-empty">Loading...</div>
            </div>
        </div>

        <div class="appt-section">
            <h2 class="appt-section-title">Sent / Acknowledged</h2>
            <div class="appt-list" id="healthRemindersSent">
                <div class="appt-empty">Loading...</div>
            </div>
        </div>
    </div>
</div>
`;
}
