const PROFILE_TABS = [
    "overview", "appointments", "encounters", "procedures",
    "laboratory", "medications", "billing", "documents"
];

const TAB_LABELS = {
    overview: "Overview",
    appointments: "Appointments",
    encounters: "Encounters",
    procedures: "Procedures",
    laboratory: "Laboratory",
    medications: "Medications",
    billing: "Billing",
    documents: "Documents"
};

export function PatientProfileView(patient)
{
    const tabs = PROFILE_TABS.map((tab, i) => `
        <button type="button" class="modal-tab${i === 0 ? " active" : ""}" data-tab="${tab}">${TAB_LABELS[tab]}</button>
    `).join("");

    const panels = PROFILE_TABS.map((tab, i) => `
        <div class="modal-tab-panel${i === 0 ? " active" : ""}" data-panel="${tab}">
            ${tab === "overview" ? overviewPanel(patient)
                : tab === "appointments" ? appointmentsPanel()
                : placeholderPanel(TAB_LABELS[tab])}
        </div>
    `).join("");

    return `
<div class="form-page">
    <div class="form-card form-card--wide">
        <div class="panel-header-row">
            <div>
                <h1>${[patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ")}</h1>
                <p class="form-subtitle">Patient No: ${patient.patient_no} &middot; View only</p>
            </div>
        </div>

        <div class="modal-tabs">
            ${tabs}
        </div>

        ${panels}
    </div>
</div>
`;
}

function overviewPanel(patient)
{
    return `
        <div class="form-grid">
            <div class="form-group">
                <label>Sex</label>
                <p>${patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "-"}</p>
            </div>
            <div class="form-group">
                <label>Birthdate</label>
                <p>${patient.birthdate ?? "-"}</p>
            </div>
            <div class="form-group">
                <label>Civil Status</label>
                <p>${patient.civil_status ?? "-"}</p>
            </div>
            <div class="form-group">
                <label>Blood Type</label>
                <p>${patient.blood_type ?? "-"}</p>
            </div>
            <div class="form-group">
                <label>Height (cm)</label>
                <p>${patient.height ?? "-"}</p>
            </div>
            <div class="form-group">
                <label>Weight (kg)</label>
                <p>${patient.weight ?? "-"}</p>
            </div>
            <div class="form-group">
                <label>Provider</label>
                <p>${patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "-"}</p>
            </div>
        </div>
        <p class="table-empty" style="padding: 20px 0; text-align: left;">Full patient record view (history, contact, insurance, etc.) is under development.</p>
    `;
}

function appointmentsPanel()
{
    return `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Provider</th>
                        <th>Reason</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="patientAppointmentsBody">
                    <tr><td colspan="5" class="table-empty">Loading appointments...</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

function placeholderPanel(label)
{
    return `<div style="padding: 40px 0;" class="table-empty">${label} module is under development.</div>`;
}
