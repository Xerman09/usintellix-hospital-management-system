export const HRS_SECTIONS = [
    { key: "care_provider", label: "Care Providers" },
    { key: "allergies", label: "Allergies, Adverse Reactions, Alerts" },
    { key: "medications", label: "History of Medication Use" },
    { key: "problems", label: "Problem List / Diagnosis List" },
    { key: "procedures", label: "History of Procedures" },
    { key: "results", label: "Relevant Diagnostic Tests / Lab Data" },
    { key: "advance_directives", label: "Advance Directives" },
    { key: "functional_status", label: "Functional Status" },
    { key: "encounters", label: "Encounters" },
    { key: "immunizations", label: "Immunizations" },
    { key: "payers", label: "Payers" },
    { key: "assessments", label: "Assessments" },
    { key: "treatment_plan", label: "Treatment Plan" },
    { key: "goals", label: "Goals" },
    { key: "health_concerns", label: "Health Concerns" },
    { key: "reasons_for_referral", label: "Reasons for Referral" },
    { key: "mental_status", label: "Mental Status" },
    { key: "social_history", label: "Social History" },
    { key: "vital_signs", label: "Vital Signs" },
    { key: "medical_equipment", label: "Medical Equipment" }
];

export function HealthSummaryView()
{
    const sections = HRS_SECTIONS.map((section) => `
        <div class="hrs-section" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e7ebf3;">
            <h2 style="font-size: 16px; margin: 0 0 12px; color: #25324b;">${section.label}</h2>
            <div id="hrs-${section.key}">
                <p class="table-empty" style="padding: 10px 0; text-align: left;">Loading...</p>
            </div>
        </div>
    `).join("");

    return `
<div class="form-page">
    <div class="form-card form-card--wide" style="max-width: 960px;">
        <div class="panel-header-row">
            <div>
                <h1 id="hrsPatientName">Loading...</h1>
                <p class="form-subtitle" id="hrsPatientNo">Health Records Summary</p>
            </div>
        </div>

        <div id="hrsAboutContact" class="form-grid">
            <div class="form-group"><label>About</label><p>Loading...</p></div>
            <div class="form-group"><label>Contact</label><p>Loading...</p></div>
        </div>

        ${sections}
    </div>
</div>
`;
}
