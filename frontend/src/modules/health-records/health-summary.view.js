// Sections rendered as full-width record tables (the "Health Snapshot"
// medical lists), as opposed to the narrower key/value CCD sections.
export const HRS_WIDE_KEYS = ["immunizations", "medications", "prescriptions", "allergies", "problems", "results"];

export const HRS_SECTIONS = [
    { key: "care_provider", label: "Care Providers", icon: "people" },
    { key: "immunizations", label: "Patient Immunization", icon: "syringe" },
    { key: "medications", label: "Current Medications", icon: "pill" },
    { key: "prescriptions", label: "Active Prescriptions", icon: "pill" },
    { key: "allergies", label: "Medication Allergy List", icon: "alert" },
    { key: "problems", label: "Current Problems List", icon: "issue" },
    { key: "results", label: "Lab Results", icon: "pulse" },
    { key: "procedures", label: "History of Procedures", icon: "clipboard" },
    { key: "advance_directives", label: "Advance Directives", icon: "document" },
    { key: "functional_status", label: "Functional Status", icon: "pulse" },
    { key: "encounters", label: "Encounters", icon: "calendar" },
    { key: "payers", label: "Payers", icon: "shield" },
    { key: "assessments", label: "Assessments", icon: "clipboard" },
    { key: "treatment_plan", label: "Treatment Plan", icon: "document" },
    { key: "goals", label: "Goals", icon: "target" },
    { key: "health_concerns", label: "Health Concerns", icon: "issue" },
    { key: "reasons_for_referral", label: "Reasons for Referral", icon: "referral" },
    { key: "mental_status", label: "Mental Status", icon: "brain" },
    { key: "social_history", label: "Social History", icon: "people" },
    { key: "vital_signs", label: "Vital Signs", icon: "pulse" },
    { key: "medical_equipment", label: "Medical Equipment", icon: "equipment" }
];

const HRS_ICONS = {
    people: '<circle cx="12" cy="8" r="4"></circle><path d="M6 21v-2a6 6 0 0 1 12 0v2"></path>',
    alert: '<path d="M12 2 2 22h20L12 2Z"></path><path d="M12 9v5M12 17h.01"></path>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path>',
    issue: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>',
    clipboard: '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 3v2h6V3M9 11h6M9 15h4"></path>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>',
    document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6M9 13h6M9 17h6"></path>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M12 10v6M9 13h6"></path>',
    syringe: '<path d="M18 11.5 22 6l-4-4-5.5 4M18 11.5 8 21H3v-5l10-10 5 5.5Z"></path>',
    shield: '<path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z"></path>',
    target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>',
    referral: '<path d="m17 2 4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
    brain: '<path d="M12 2a7 7 0 0 0-7 7c0 3 2 4 2 6v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1c0-2 2-3 2-6a7 7 0 0 0-7-7Z"></path><path d="M9 18h6"></path>',
    equipment: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9Z"></path>'
};

function hrsIcon(name)
{
    return HRS_ICONS[name] || HRS_ICONS.document;
}

export function HealthSummaryView()
{
    const widgets = HRS_SECTIONS.map((section) => `
        <div class="hrs-widget${HRS_WIDE_KEYS.includes(section.key) ? " hrs-widget--wide" : ""}" id="hrs-widget-${section.key}">
            <div class="hrs-widget-header">
                <div class="hrs-widget-header-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${hrsIcon(section.icon)}</svg>
                    <h3>${section.label}</h3>
                </div>
            </div>
            <div class="hrs-widget-body" id="hrs-${section.key}">
                <p class="hrs-widget-empty-text">Loading...</p>
            </div>
        </div>
    `).join("");

    return `
<div class="hrs-page">
        <div class="hrs-topbar">
            <div class="hrs-topbar-title">
                <div class="hrs-topbar-avatar" id="hrsAvatar">?</div>
                <div>
                    <h2 id="hrsPatientName">Loading...</h2>
                    <p id="hrsPatientNo">Health Records Summary</p>
                </div>
            </div>
        </div>

        <div class="hrs-main">
            <div class="hrs-widget hrs-widget-about">
                <div class="hrs-widget-header">
                    <div class="hrs-widget-header-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="M4 9h16M9 4v16"></path></svg>
                        <h3>About &amp; Contact</h3>
                    </div>
                </div>
                <div class="hrs-widget-body">
                    <div id="hrsAboutContact" class="hrs-about-grid">
                        <div>
                            <label class="hrs-subcard-label">About</label>
                            <p class="hrs-widget-empty-text">Loading...</p>
                        </div>
                        <div>
                            <label class="hrs-subcard-label">Contact</label>
                            <p class="hrs-widget-empty-text">Loading...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="hrs-widget-grid">
                ${widgets}
            </div>
        </div>
</div>
`;
}
