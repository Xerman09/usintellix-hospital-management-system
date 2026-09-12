export function PatientRecallsView()
{
    return `
<div class="pt-appt-page">
    <div class="pt-appt-topbar">
        <div>
            <h1>Recalls</h1>
            <p>Your scheduled and past recalls</p>
        </div>
    </div>

    <div class="pt-appt-body">
        <div class="appt-section">
            <h2 class="appt-section-title">Upcoming</h2>
            <div class="appt-list" id="patientRecallsUpcoming">
                <div class="appt-empty">Loading...</div>
            </div>
        </div>

        <div class="appt-section">
            <h2 class="appt-section-title">Past</h2>
            <div class="appt-list" id="patientRecallsPast">
                <div class="appt-empty">Loading...</div>
            </div>
        </div>
    </div>
</div>
`;
}
