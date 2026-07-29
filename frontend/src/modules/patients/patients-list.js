import { getUser } from "../../core/session.js";
import { fetchPatients, deletePatient, createPatient, updatePatient, fetchPatientDashboardSummary } from "./patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { fetchAllergies } from "../allergies/allergies.service.js";
import { fetchPatientAllergies, addPatientAllergy, updatePatientAllergy, removePatientAllergy } from "../patient-allergies/patient-allergies.service.js?v=1";
import { fetchIcd10Diagnoses } from "../icd10-diagnoses/icd10-diagnoses.service.js";
import { searchCqmValuesetCodes } from "../cqm-valuesets/cqm-valuesets.service.js";
import { fetchMedicalProblems } from "../medical-problems/medical-problems.service.js";
import {
    fetchPatientMedicalProblems,
    addPatientMedicalProblem,
    updatePatientMedicalProblem,
    removePatientMedicalProblem
} from "../patient-medical-problems/patient-medical-problems.service.js";
import { fetchMedications } from "../medications/medications.service.js";
import {
    fetchPatientMedications,
    addPatientMedication,
    updatePatientMedication,
    removePatientMedication
} from "../patient-medications/patient-medications.service.js";
import {
    fetchPatientPrescriptions,
    addPatientPrescription,
    updatePatientPrescription,
    removePatientPrescription
} from "../patient-prescriptions/patient-prescriptions.service.js";
import {
    fetchRelatedPersons, addRelatedPerson, updateRelatedPerson, removeRelatedPerson,
    fetchTelecoms, addTelecom, updateTelecom, removeTelecom,
    fetchAddresses, addAddress, updateAddress, removeAddress
} from "../related-persons/related-persons.service.js";
import { fetchCountries, fetchPhProvinces, isPhilippines } from "../related-persons/geography.service.js";
import { fetchPatientDisclosures, addDisclosure, updateDisclosure, removeDisclosure } from "../disclosures/disclosures.service.js";
import {
    fetchPatientMessages, sendPatientMessage, fetchMessageTypes, fetchMessageStatuses, fetchRecipientOptions
} from "../messages/messages.service.js";
import { fetchPatientAmendments, addAmendment, updateAmendment, removeAmendment } from "../amendments/amendments.service.js";

const ALLERGY_DETAIL_FIELDS = [
    "begin_date", "end_date", "reaction", "severity", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const PROBLEM_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const MEDICATION_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "medication_usage", "request_intent",
    "is_primary_record", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const PRESCRIPTION_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "quantity", "dosage", "route",
    "frequency", "refills", "directions", "substitution_allowed", "pharmacy",
    "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

let currentDashboardPatient = null;
let currentEditPatient = null;
let activeDemoTab = "who";
let dashboardRelatedPersons = [];

const CODE_SOURCE_LABELS = {
    ICD10CM: "ICD-10-CM",
    ICD9CM: "ICD-9-CM",
    SNOMEDCT: "SNOMED CT",
    LOINC: "LOINC",
    RXNORM: "RxNorm",
    CPT: "CPT",
    HCPCS: "HCPCS",
    CVX: "CVX"
};

let scmSource = "icd10";
let scmSearchTerm = "";
let scmCurrentPage = 1;
let scmTotalPages = 1;
let scmTotalItems = 0;
let scmItems = [];
let scmSearchDebounce = null;
let scmSort = { field: null, dir: 1 };

const FIELDS = [
    "username", "password", "first_name", "middle_name",
    "last_name", "suffix", "sex", "birthdate",
    "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "employer_occupation", "employer_name", "employer_address_line", "employer_address_line2",
    "employer_city", "employer_state", "employer_postal_code", "employer_country",
    "employer_industry", "employer_employment_start_date", "employer_employment_end_date",
    "date_deceased", "reason_deceased"
];

const EDIT_FIELDS = [
    "first_name", "middle_name", "last_name", "suffix", "sex",
    "birthdate", "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "employer_occupation", "employer_name", "employer_address_line", "employer_address_line2",
    "employer_city", "employer_state", "employer_postal_code", "employer_country",
    "employer_industry", "employer_employment_start_date", "employer_employment_end_date",
    "date_deceased", "reason_deceased"
];

let patientsCache = [];

export async function initPatientsList()
{
    const user = getUser();

    if (!user || !["admin", "receptionist", "doctor"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    const pageRoot = document.querySelector(".pat-page");

    if (!pageRoot || pageRoot.dataset.wired === "true") {
        return;
    }

    pageRoot.dataset.wired = "true";

    await loadPatients(user);
    setupPatientFilters(user);
    setupPatientDashboardModal();
    setupAllergyModals();
    setupProblemModals();
    setupMedicationModals();
    setupPrescriptionModals();
    setupDisclosureModals();
    setupMessageModals();
    setupAmendmentModals();
    setupRelatedPersonModals();
    setupSelectCodesModal();

    if (user.role !== "doctor") {
        await setupEditPatientModal(user);
    }

    if (user.role === "receptionist") {
        await setupAddPatientModal(user);
    }
}

function setupPatientDashboardModal()
{
    const modalOverlay = document.getElementById("patientDashboardModalOverlay");

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("closePatientDashboardModal").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.querySelectorAll("#pdDemoTabs .pd-demo-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
            activeDemoTab = btn.getAttribute("data-demo-tab");
            document.querySelectorAll("#pdDemoTabs .pd-demo-tab").forEach((b) => b.classList.toggle("active", b === btn));

            if (currentDashboardPatient) {
                renderDemographics(currentDashboardPatient);
            }
        });
    });

    setupChartNav();

    // "Edit" on the Related Persons widget jumps straight into the Edit
    // Patient modal's Related Persons tab, reusing that CRUD instead of
    // duplicating it inside the (read-only) Patient Dashboard.
    document.getElementById("pdRelatedPersonsAddBtn").addEventListener("click", () => {
        if (!currentDashboardPatient) {
            return;
        }

        closeModal();
        openEditModal(currentDashboardPatient);

        const editModalBox = document.getElementById("editPatientModalOverlay").querySelector(".modal-box");
        const relatedPersonsTab = editModalBox.querySelector('.modal-tab[data-tab="related_persons"]');

        if (relatedPersonsTab) {
            relatedPersonsTab.click();
        }
    });
}

const CHART_NAV_LABELS = {
    dashboard: "Dashboard",
    history: "History",
    assessments: "Assessments",
    report: "Report",
    documents: "Documents",
    transactions: "Transactions",
    issues: "Issues",
    ledger: "Ledger",
    external_data: "External Data"
};

// Sections with an existing widget on the dashboard grid scroll straight to
// it; everything else (no backend/UI built yet) shows the placeholder panel.
const CHART_NAV_WIDGET_TARGETS = {
    documents: "pdWidget-documents",
    issues: "pdWidget-issues"
};

function setupChartNav()
{
    document.querySelectorAll("#pdChartNav .pd-chart-nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-chart-nav");

            if (key === "assessments") {
                const expanded = btn.classList.toggle("expanded");
                document.getElementById("pdAssessmentsSubmenu").classList.toggle("expanded", expanded);
                return;
            }

            document.querySelectorAll("#pdChartNav .pd-chart-nav-btn").forEach((b) => b.classList.toggle("active", b === btn));

            const widgetGrid = document.getElementById("pdWidgetGrid");
            const placeholder = document.getElementById("pdChartPlaceholder");
            const widgetTarget = CHART_NAV_WIDGET_TARGETS[key];

            if (key === "dashboard" || widgetTarget) {
                widgetGrid.style.display = "";
                placeholder.style.display = "none";

                const pdMain = document.querySelector(".pd-main");
                const target = widgetTarget ? document.getElementById(widgetTarget) : null;

                if (target && pdMain) {
                    pdMain.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
                } else if (pdMain) {
                    pdMain.scrollTo({ top: 0, behavior: "smooth" });
                }
            } else {
                widgetGrid.style.display = "none";
                document.getElementById("pdChartPlaceholderTitle").textContent = CHART_NAV_LABELS[key] || "Section";
                placeholder.style.display = "flex";
            }
        });
    });
}

function resetChartNav()
{
    document.querySelectorAll("#pdChartNav .pd-chart-nav-btn").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-chart-nav") === "dashboard");
        b.classList.remove("expanded");
    });
    document.getElementById("pdAssessmentsSubmenu").classList.remove("expanded");
    document.getElementById("pdWidgetGrid").style.display = "";
    document.getElementById("pdChartPlaceholder").style.display = "none";
}

function openPatientDashboardModal(patient)
{
    currentDashboardPatient = patient;

    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const initial = (patient.first_name || "?").charAt(0).toUpperCase();
    const sex = patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "";
    const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";

    document.getElementById("pdAvatar").textContent = initial;
    document.getElementById("pdSidebarAvatar").textContent = initial;
    document.getElementById("pdName").textContent = fullName;
    document.getElementById("pdSidebarName").textContent = fullName;
    document.getElementById("pdSubtitle").textContent = `Patient No: ${patient.patient_no}`;
    document.getElementById("pdSidebarSub").textContent = `Patient No: ${patient.patient_no}`;

    setFact("pdFactSex", sex);
    setFact("pdFactBirthdate", patient.birthdate);
    setFact("pdFactBloodType", patient.blood_type);
    setFact("pdFactProvider", providerName);

    document.getElementById("patientDashboardModalOverlay").classList.add("open");

    resetChartNav();

    activeDemoTab = "who";
    dashboardRelatedPersons = [];
    document.querySelectorAll("#pdDemoTabs .pd-demo-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-demo-tab") === "who");
    });
    renderDemographics(patient);

    loadPatientDashboardWidgets(patient);
}

// The widgets used to each fire their own request when the dashboard
// opened (8 separate GETs). Against a remote database, each one pays a
// fresh connection round-trip, and PHP's single-threaded built-in dev
// server processes them one at a time -- so opening the dashboard could
// take several seconds. Fetching everything in one batched request
// (see PatientController::dashboardSummary) cuts that to a single
// round-trip; render functions are unchanged and reused as-is.
async function loadPatientDashboardWidgets(patient)
{
    const widgetBodyIds = [
        "pdAllergiesBody", "pdProblemsBody", "pdMedicationsBody", "pdPrescriptionsBody",
        "pdRelatedPersonsBody", "pdDisclosuresBody", "pdMessagesBody", "pdAmendmentsBody"
    ];

    try {
        const result = await fetchPatientDashboardSummary(patient.id);

        if (!result.success) {
            widgetBodyIds.forEach((id) => {
                const body = document.getElementById(id);
                if (body) body.innerHTML = `<div class="pd-widget-empty"><p>${escapeHtml(result.message || "Unable to load this section right now.")}</p></div>`;
            });
            return;
        }

        const data = result.data || {};

        renderDashboardAllergies(data.allergies || []);
        renderDashboardProblems(data.problems || []);
        renderDashboardMedications(data.medications || []);
        renderDashboardPrescriptions(data.prescriptions || []);
        renderDashboardDisclosures(data.disclosures || []);
        renderDashboardMessages(data.messages || []);
        renderDashboardAmendments(data.amendments || []);

        dashboardRelatedPersons = data.related_persons || [];
        renderDashboardRelatedPersons(dashboardRelatedPersons);

        if (activeDemoTab === "related" && currentDashboardPatient === patient) {
            renderDemographics(patient);
        }
    } catch (error) {
        console.error("Failed to load patient dashboard summary", error);
        widgetBodyIds.forEach((id) => {
            const body = document.getElementById(id);
            if (body) body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load this section right now.</p></div>`;
        });
    }
}

async function loadDashboardAmendments(patient)
{
    const body = document.getElementById("pdAmendmentsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientAmendments(patient.id);

        renderDashboardAmendments(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load amendments", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load amendments right now.</p></div>`;
    }
}

function renderDashboardAmendments(amendments)
{
    const body = document.getElementById("pdAmendmentsBody");

    if (!body) {
        return;
    }

    body.innerHTML = amendments.length
        ? `<div class="pd-allergy-list">
            ${amendments.map((amendment) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(truncate(amendment.description, 60))}${amendment.status ? ` &middot; ${escapeHtml(amendment.status)}` : ""}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
            <p>No amendment requests available.</p>
           </div>`;
}

function truncate(text, length)
{
    const value = text || "";

    return value.length > length ? `${value.slice(0, length)}...` : value;
}

async function loadDashboardMessages(patient)
{
    const body = document.getElementById("pdMessagesBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientMessages(patient.id);

        renderDashboardMessages(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load messages", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load messages right now.</p></div>`;
    }
}

function renderDashboardMessages(messages)
{
    const body = document.getElementById("pdMessagesBody");

    if (!body) {
        return;
    }

    body.innerHTML = messages.length
        ? `<div class="pd-allergy-list">
            ${messages.slice(0, 5).map((message) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(message.sender_name || "Unknown")}${message.type_name ? ` &middot; ${escapeHtml(message.type_name)}` : ""}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="m4 6 8 7 8-7"></path></svg>
            <p>No messages recorded for this patient.</p>
           </div>`;
}

async function loadDashboardDisclosures(patient)
{
    const body = document.getElementById("pdDisclosuresBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientDisclosures(patient.id);

        renderDashboardDisclosures(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load disclosures", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load disclosures right now.</p></div>`;
    }
}

function renderDashboardDisclosures(disclosures)
{
    const body = document.getElementById("pdDisclosuresBody");

    if (!body) {
        return;
    }

    body.innerHTML = disclosures.length
        ? `<div class="pd-allergy-list">
            ${disclosures.map((disclosure) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(disclosure.recipient)}${disclosure.disclosure_type ? ` &middot; ${escapeHtml(disclosure.disclosure_type)}` : ""}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16h16"></path><path d="m8 15 4-6 3 3 5-7"></path></svg>
            <p>No disclosures recorded for this patient.</p>
           </div>`;
}

function renderDashboardRelatedPersons(persons)
{
    const body = document.getElementById("pdRelatedPersonsBody");

    if (!body) {
        return;
    }

    body.innerHTML = persons.length
        ? `<div class="pd-allergy-list">
            ${persons.map((person) => {
                const fullName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
                const relationship = person.relationship ? ` (${escapeHtml(person.relationship)})` : "";

                return `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(fullName)}${relationship}</span>
                </div>
                `;
            }).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
            <p>No related persons recorded.</p>
           </div>`;
}

function renderDemographics(patient)
{
    const panels = document.getElementById("pdDemoPanels");

    if (!panels) {
        return;
    }

    if (activeDemoTab === "related") {
        panels.innerHTML = renderRelatedPersonsPanel(dashboardRelatedPersons);
        return;
    }

    const field = (label, value) => `
        <div class="pd-demo-field">
            <span class="pd-demo-label">${escapeHtml(label)}</span>
            <span class="pd-demo-value${value ? "" : " empty"}">${escapeHtml(value || "Not set")}</span>
        </div>
    `;

    const sexLabel = patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "";
    const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";
    const yesNo = (value) => (value === "yes" ? "Yes" : value === "no" ? "No" : "");

    const tabRows = {
        who: [
            field("First Name", patient.first_name),
            field("Middle Name", patient.middle_name),
            field("Last Name", patient.last_name),
            field("Suffix", patient.suffix),
            field("Sex", sexLabel),
            field("Birthdate", patient.birthdate),
            field("Civil Status", patient.civil_status),
            field("Blood Type", patient.blood_type),
            field("Height (cm)", patient.height),
            field("Weight (kg)", patient.weight)
        ],
        contact: [
            field("Address Line", patient.contact_address_line),
            field("City", patient.contact_city),
            field("Province", patient.contact_province),
            field("Zip Code", patient.contact_zip_code),
            field("Home Phone", patient.contact_home_phone),
            field("Mobile Phone", patient.contact_mobile_phone),
            field("Work Phone", patient.contact_work_phone),
            field("Contact Email", patient.contact_email)
        ],
        choices: [
            field("Care Provider", providerName),
            field("Allow SMS", yesNo(patient.allow_sms)),
            field("Allow Voice Calls", yesNo(patient.allow_voice_calls)),
            field("Allow Email", yesNo(patient.allow_email)),
            field("Allow Health Info Exchange", yesNo(patient.allow_hie))
        ],
        stats: [
            field("Language", patient.language),
            field("Race", patient.race),
            field("Ethnicity", patient.ethnicity),
            field("Religion", patient.religion)
        ],
        employer: [
            field("Occupation", patient.employer_occupation),
            field("Employer Name", patient.employer_name),
            field("Employer Address", patient.employer_address_line),
            field("Employer Address Line 2", patient.employer_address_line2),
            field("City", patient.employer_city),
            field("State", patient.employer_state),
            field("Postal Code", patient.employer_postal_code),
            field("Country", patient.employer_country),
            field("Industry", patient.employer_industry),
            field("Employment Start Date", patient.employer_employment_start_date),
            field("Employment End Date", patient.employer_employment_end_date)
        ],
        misc: [
            field("Date Deceased", patient.date_deceased),
            field("Reason Deceased", patient.reason_deceased)
        ]
    };

    const rows = tabRows[activeDemoTab] || [];

    panels.innerHTML = `<div class="pd-demo-grid">${rows.join("")}</div>`;
}

function renderRelatedPersonsPanel(persons)
{
    if (!persons.length) {
        return `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
            <p>No related persons recorded.</p>
           </div>`;
    }

    const field = (label, value) => `
        <div class="pd-demo-field">
            <span class="pd-demo-label">${escapeHtml(label)}</span>
            <span class="pd-demo-value${value ? "" : " empty"}">${escapeHtml(value || "Not set")}</span>
        </div>
    `;

    const yesNo = (value) => (Number(value) ? "Yes" : "No");

    return persons.map((person) => {
        const fullName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
        const genderLabel = person.gender ? person.gender.charAt(0).toUpperCase() + person.gender.slice(1) : "";

        return `
        <div class="pd-related-card">
            <div class="pd-related-card-header">
                <strong>${escapeHtml(fullName)}</strong>
                ${person.relationship ? `<span class="pd-related-badge">${escapeHtml(person.relationship)}</span>` : ""}
            </div>
            <div class="pd-demo-grid">
                ${field("Role", person.role)}
                ${field("Phone", person.phone)}
                ${field("Date of Birth", person.date_of_birth)}
                ${field("Gender", genderLabel)}
                ${field("Primary Contact", yesNo(person.is_primary_contact))}
                ${field("Emergency Contact", yesNo(person.is_emergency_contact))}
                ${field("Can Make Medical Decisions", yesNo(person.can_make_medical_decisions))}
                ${field("Can Receive Medical Info", yesNo(person.can_receive_medical_info))}
                ${field("Notes", person.notes)}
            </div>
        </div>
        `;
    }).join("");
}

async function loadDashboardAllergies(patient)
{
    const body = document.getElementById("pdAllergiesBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientAllergies(patient.id);

        renderDashboardAllergies(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load allergies", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load allergies right now.</p></div>`;
    }
}

function renderDashboardAllergies(allergies)
{
    const body = document.getElementById("pdAllergiesBody");

    if (!body) {
        return;
    }

    body.innerHTML = allergies.length
        ? `<div class="pd-allergy-list">
            ${allergies.map((allergy) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(allergy.name)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
            <p>No known allergies recorded.</p>
           </div>`;
}

async function loadDashboardProblems(patient)
{
    const body = document.getElementById("pdProblemsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientMedicalProblems(patient.id);

        renderDashboardProblems(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load medical problems", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load problems right now.</p></div>`;
    }
}

function renderDashboardProblems(problems)
{
    const body = document.getElementById("pdProblemsBody");

    if (!body) {
        return;
    }

    const active = problems.filter((problem) => !problem.end_date);

    body.innerHTML = active.length
        ? `<div class="pd-allergy-list">
            ${active.map((problem) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(problem.title)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>
            <p>No active problems recorded.</p>
           </div>`;
}

async function loadDashboardMedications(patient)
{
    const body = document.getElementById("pdMedicationsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientMedications(patient.id);

        renderDashboardMedications(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load medications", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load medications right now.</p></div>`;
    }
}

function renderDashboardMedications(medications)
{
    const body = document.getElementById("pdMedicationsBody");

    if (!body) {
        return;
    }

    const active = medications.filter((medication) => !medication.end_date);

    body.innerHTML = active.length
        ? `<div class="pd-allergy-list">
            ${active.map((medication) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(medication.title)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
            <p>No active medications recorded.</p>
           </div>`;
}

async function loadDashboardPrescriptions(patient)
{
    const body = document.getElementById("pdPrescriptionsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientPrescriptions(patient.id);

        renderDashboardPrescriptions(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load prescriptions", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load prescriptions right now.</p></div>`;
    }
}

function renderDashboardPrescriptions(prescriptions)
{
    const body = document.getElementById("pdPrescriptionsBody");

    if (!body) {
        return;
    }

    const active = prescriptions.filter((prescription) => !prescription.end_date);

    body.innerHTML = active.length
        ? `<div class="pd-allergy-list">
            ${active.map((prescription) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(prescription.title)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6M9 15h6M9 11h3"></path></svg>
            <p>No prescriptions recorded.</p>
           </div>`;
}

function setupAllergyModals()
{
    const detailOverlay = document.getElementById("allergyDetailModalOverlay");
    const formOverlay = document.getElementById("allergyFormModalOverlay");
    const form = document.getElementById("allergyForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdAllergiesAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openAllergyDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeAllergyDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("allergyMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("allergyMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddAllergyBtn").addEventListener("click", () => {
        openAllergyFormModal(null);
    });

    document.getElementById("openSelectCodesBtn").addEventListener("click", () => {
        openSelectCodesModal("allergy_coding");
    });

    document.getElementById("closeAllergyFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelAllergyForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("allergy_record_id").value;
        const allergyId = document.getElementById("allergy_catalog_id").value;
        const errEl = document.getElementById("err-allergy_catalog_id");

        errEl.textContent = "";

        if (!recordId && !allergyId) {
            errEl.textContent = "Select an allergy.";
            return;
        }

        const details = {};

        ALLERGY_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`allergy_${field}`).value.trim();
        });

        const result = recordId
            ? await updatePatientAllergy(recordId, details)
            : await addPatientAllergy(currentDashboardPatient.id, allergyId, details);

        if (!result.success) {
            showAlert("allergyFormAlert", result.message || "Failed to save allergy.", "error");
            return;
        }

        closeForm();
        await loadAllergyDetailTable(currentDashboardPatient);
        await loadDashboardAllergies(currentDashboardPatient);
    });
}

let scmSelectedMap = new Map();
let scmTargetFieldId = "allergy_coding";

function setupSelectCodesModal()
{
    const overlay = document.getElementById("selectCodesModalOverlay");
    const sourceSelect = document.getElementById("scmSourceSelect");
    const searchInput = document.getElementById("scmSearchInput");
    const prevBtn = document.getElementById("scmPrevPage");
    const nextBtn = document.getElementById("scmNextPage");
    const confirmBtn = document.getElementById("confirmSelectCodes");

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("closeSelectCodesModal").addEventListener("click", closeModal);
    document.getElementById("cancelSelectCodes").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    sourceSelect.addEventListener("change", () => {
        scmSource = sourceSelect.value;
        scmCurrentPage = 1;
        loadScmResults();
    });

    searchInput.addEventListener("input", () => {
        clearTimeout(scmSearchDebounce);
        scmSearchDebounce = setTimeout(() => {
            scmSearchTerm = searchInput.value.trim();
            scmCurrentPage = 1;
            loadScmResults();
        }, 300);
    });

    document.getElementById("scmSearchBtn").addEventListener("click", () => {
        scmSearchTerm = searchInput.value.trim();
        scmCurrentPage = 1;
        loadScmResults();
    });

    document.getElementById("scmClearBtn").addEventListener("click", () => {
        searchInput.value = "";
        scmSearchTerm = "";
        scmCurrentPage = 1;
        loadScmResults();
    });

    prevBtn.addEventListener("click", () => {
        if (scmCurrentPage > 1) {
            scmCurrentPage -= 1;
            loadScmResults();
        }
    });

    nextBtn.addEventListener("click", () => {
        if (scmCurrentPage < scmTotalPages) {
            scmCurrentPage += 1;
            loadScmResults();
        }
    });

    document.querySelectorAll("#selectCodesModalOverlay .scm-table th[data-sort]").forEach((th) => {
        th.addEventListener("click", () => {
            const field = th.getAttribute("data-sort");
            scmSort = { field, dir: scmSort.field === field ? -scmSort.dir : 1 };
            renderScmTable();
        });
    });

    confirmBtn.addEventListener("click", () => {
        if (!scmSelectedMap.size) {
            return;
        }

        const parts = Array.from(scmSelectedMap.values()).map((item) => {
            const systemLabel = CODE_SOURCE_LABELS[item.code_system] || item.code_system;

            return `${item.code} - ${item.description || ""} (${systemLabel})`.trim();
        });

        document.getElementById(scmTargetFieldId).value = parts.join("\n");

        closeModal();
    });
}

function openSelectCodesModal(targetFieldId = "allergy_coding")
{
    scmTargetFieldId = targetFieldId;
    scmSource = "icd10";
    scmSearchTerm = "";
    scmCurrentPage = 1;
    scmSort = { field: null, dir: 1 };
    scmSelectedMap = new Map();

    document.getElementById("scmSourceSelect").value = "icd10";
    document.getElementById("scmSearchInput").value = "";
    document.getElementById("selectCodesModalOverlay").classList.add("open");

    loadScmResults();
}

function updateScmSelectionUI()
{
    const count = scmSelectedMap.size;

    document.getElementById("confirmSelectCodes").disabled = count === 0;
    document.getElementById("scmSelectedCount").textContent = count
        ? `${count} code${count === 1 ? "" : "s"} selected`
        : "";
}

async function loadScmResults()
{
    const tbody = document.getElementById("scmTableBody");

    tbody.innerHTML = `<tr><td colspan="2" class="scm-empty">Loading...</td></tr>`;

    let result;

    if (scmSource === "icd10") {
        result = await fetchIcd10Diagnoses(scmCurrentPage, 50, scmSearchTerm);

        if (result.success) {
            scmItems = result.data.items.map((row) => ({
                code: row.code,
                description: row.description,
                code_system: "ICD10CM"
            }));
            scmTotalItems = result.data.total;
            scmTotalPages = Math.max(1, result.data.total_pages);
            scmCurrentPage = result.data.page;
        }
    } else {
        const mode = scmSource === "oid" ? "oid" : "name";

        result = await searchCqmValuesetCodes(scmSearchTerm, mode, scmCurrentPage, 50);

        if (result.success) {
            scmItems = result.data.items.map((row) => ({
                code: row.code,
                description: row.description,
                code_system: row.code_system
            }));
            scmTotalItems = result.data.total;
            scmTotalPages = Math.max(1, result.data.total_pages);
            scmCurrentPage = result.data.page;
        }
    }

    if (!result.success) {
        scmItems = [];
        scmTotalItems = 0;
        scmTotalPages = 1;
    }

    renderScmTable();
    renderScmPagination();
    updateScmSelectionUI();
}

function renderScmTable()
{
    const tbody = document.getElementById("scmTableBody");

    let items = scmItems;

    if (scmSort.field) {
        items = [...items].sort((a, b) => {
            const av = (a[scmSort.field] || "").toString().toLowerCase();
            const bv = (b[scmSort.field] || "").toString().toLowerCase();

            if (av < bv) return -1 * scmSort.dir;
            if (av > bv) return 1 * scmSort.dir;
            return 0;
        });
    }

    document.getElementById("scmSortArrowCode").textContent =
        scmSort.field === "code" ? (scmSort.dir === 1 ? "▲" : "▼") : "";
    document.getElementById("scmSortArrowDescription").textContent =
        scmSort.field === "description" ? (scmSort.dir === 1 ? "▲" : "▼") : "";

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="scm-empty">No codes found.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map((item) => {
        const key = `${scmSource}::${item.code}`;
        const isSelected = scmSelectedMap.has(key);

        return `
        <tr data-code="${escapeHtml(item.code)}" class="${isSelected ? "selected" : ""}">
            <td><span class="scm-code-badge">${escapeHtml(item.code)}</span></td>
            <td>${escapeHtml(item.description || "")}</td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("tr[data-code]").forEach((row) => {
        row.addEventListener("click", () => {
            const code = row.getAttribute("data-code");
            const item = items.find((entry) => entry.code === code);
            const key = `${scmSource}::${code}`;

            if (scmSelectedMap.has(key)) {
                scmSelectedMap.delete(key);
                row.classList.remove("selected");
            } else {
                scmSelectedMap.set(key, item);
                row.classList.add("selected");
            }

            updateScmSelectionUI();
        });
    });
}

function renderScmPagination()
{
    const info = document.getElementById("scmPageInfo");
    const indicator = document.getElementById("scmPageIndicator");
    const prevBtn = document.getElementById("scmPrevPage");
    const nextBtn = document.getElementById("scmNextPage");

    if (!scmTotalItems) {
        info.textContent = "";
    } else {
        const start = (scmCurrentPage - 1) * 50 + 1;
        const end = Math.min(scmCurrentPage * 50, scmTotalItems);

        info.textContent = `Showing ${start}-${end} of ${scmTotalItems}`;
    }

    indicator.textContent = `Page ${scmCurrentPage} of ${scmTotalPages}`;
    prevBtn.disabled = scmCurrentPage <= 1;
    nextBtn.disabled = scmCurrentPage >= scmTotalPages;
}

async function openAllergyDetailModal(patient)
{
    document.getElementById("allergyDetailAlert").innerHTML = "";
    document.getElementById("allergyDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddAllergyBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadAllergyDetailTable(patient);
}

async function loadAllergyDetailTable(patient)
{
    const tbody = document.getElementById("allergyDetailTableBody");

    try {
        const result = await fetchPatientAllergies(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(result.message || "Unable to load allergies.")}</td></tr>`;
            return;
        }

        renderAllergyDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient allergies", error);
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Unable to load allergies right now. Please try again.</td></tr>`;
    }
}

function renderAllergyDetailTable(patient, allergies)
{
    const tbody = document.getElementById("allergyDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!allergies.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No allergies recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = allergies.map((allergy) => {
        const isActive = !allergy.end_date;

        return `
        <tr>
            <td>${escapeHtml(allergy.name)}</td>
            <td>${escapeHtml(allergy.reaction || "-")}</td>
            <td>${escapeHtml(allergy.severity || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((allergy.updated_at || allergy.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-allergy="${allergy.id}">Edit</button>
                       <button class="btn-danger" data-remove-allergy="${allergy.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-allergy]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const allergy = allergies.find((a) => String(a.id) === btn.getAttribute("data-edit-allergy"));

            if (allergy) {
                openAllergyFormModal(allergy);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-allergy]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this allergy record?")) {
                return;
            }

            const result = await removePatientAllergy(btn.getAttribute("data-remove-allergy"));

            if (!result.success) {
                showAlert("allergyDetailAlert", result.message || "Failed to remove allergy.", "error");
                return;
            }

            await loadAllergyDetailTable(currentDashboardPatient);
            await loadDashboardAllergies(currentDashboardPatient);
        });
    });
}

async function openAllergyFormModal(existingRecord)
{
    const formOverlay = document.getElementById("allergyFormModalOverlay");
    const title = document.getElementById("allergyFormTitle");
    const recordIdInput = document.getElementById("allergy_record_id");
    const catalogSelect = document.getElementById("allergy_catalog_id");

    document.getElementById("allergyFormAlert").innerHTML = "";
    document.getElementById("allergyForm").reset();
    document.getElementById("err-allergy_catalog_id").textContent = "";

    const moreToggle = document.getElementById("allergyMoreToggle");
    const moreFields = document.getElementById("allergyMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchAllergies();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Select allergy...</option>` +
        catalog.map((allergy) => `<option value="${allergy.id}">${escapeHtml(allergy.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Allergy";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.allergy_id;
        catalogSelect.disabled = true;

        ALLERGY_DETAIL_FIELDS.forEach((field) => {
            document.getElementById(`allergy_${field}`).value = existingRecord[field] ?? "";
        });

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Allergy";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("allergy_verification_status").value = "Unconfirmed";
    }

    formOverlay.classList.add("open");
}

function setupProblemModals()
{
    const detailOverlay = document.getElementById("problemDetailModalOverlay");
    const formOverlay = document.getElementById("problemFormModalOverlay");
    const form = document.getElementById("problemForm");
    const catalogSelect = document.getElementById("problem_catalog_id");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdProblemsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openProblemDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeProblemDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("problemMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("problemMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddProblemBtn").addEventListener("click", () => {
        openProblemFormModal(null);
    });

    document.getElementById("openSelectCodesBtnProblem").addEventListener("click", () => {
        openSelectCodesModal("problem_coding");
    });

    catalogSelect.addEventListener("change", () => {
        const selectedOption = catalogSelect.options[catalogSelect.selectedIndex];

        if (catalogSelect.value && selectedOption) {
            document.getElementById("problem_title").value = selectedOption.textContent;
        }
    });

    document.getElementById("closeProblemFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelProblemForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("problem_record_id").value;
        const catalogId = catalogSelect.value;
        const errEl = document.getElementById("err-problem_title");

        errEl.textContent = "";

        const details = {};

        PROBLEM_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`problem_${field}`).value.trim();
        });

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientMedicalProblem(recordId, details)
            : await addPatientMedicalProblem(currentDashboardPatient.id, catalogId || null, details);

        if (!result.success) {
            showAlert("problemFormAlert", result.message || "Failed to save problem.", "error");
            return;
        }

        closeForm();
        await loadProblemDetailTable(currentDashboardPatient);
        await loadDashboardProblems(currentDashboardPatient);
    });
}

async function openProblemDetailModal(patient)
{
    document.getElementById("problemDetailAlert").innerHTML = "";
    document.getElementById("problemDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddProblemBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadProblemDetailTable(patient);
}

async function loadProblemDetailTable(patient)
{
    const tbody = document.getElementById("problemDetailTableBody");

    try {
        const result = await fetchPatientMedicalProblems(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load problems.")}</td></tr>`;
            return;
        }

        renderProblemDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient medical problems", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load problems right now. Please try again.</td></tr>`;
    }
}

function renderProblemDetailTable(patient, problems)
{
    const tbody = document.getElementById("problemDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!problems.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No medical problems recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = problems.map((problem) => {
        const isActive = !problem.end_date;

        return `
        <tr>
            <td>${escapeHtml(problem.title)}</td>
            <td>${escapeHtml(problem.occurrence || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((problem.updated_at || problem.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-problem="${problem.id}">Edit</button>
                       <button class="btn-danger" data-remove-problem="${problem.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-problem]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const problem = problems.find((p) => String(p.id) === btn.getAttribute("data-edit-problem"));

            if (problem) {
                openProblemFormModal(problem);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-problem]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this problem record?")) {
                return;
            }

            const result = await removePatientMedicalProblem(btn.getAttribute("data-remove-problem"));

            if (!result.success) {
                showAlert("problemDetailAlert", result.message || "Failed to remove problem.", "error");
                return;
            }

            await loadProblemDetailTable(currentDashboardPatient);
            await loadDashboardProblems(currentDashboardPatient);
        });
    });
}

async function openProblemFormModal(existingRecord)
{
    const formOverlay = document.getElementById("problemFormModalOverlay");
    const title = document.getElementById("problemFormTitle");
    const recordIdInput = document.getElementById("problem_record_id");
    const catalogSelect = document.getElementById("problem_catalog_id");

    document.getElementById("problemFormAlert").innerHTML = "";
    document.getElementById("problemForm").reset();
    document.getElementById("err-problem_title").textContent = "";

    const moreToggle = document.getElementById("problemMoreToggle");
    const moreFields = document.getElementById("problemMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchMedicalProblems();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Custom / type your own...</option>` +
        catalog.map((problem) => `<option value="${problem.id}">${escapeHtml(problem.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Problem";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.problem_id ?? "";
        catalogSelect.disabled = true;

        PROBLEM_DETAIL_FIELDS.forEach((field) => {
            document.getElementById(`problem_${field}`).value = existingRecord[field] ?? "";
        });

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Problem";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("problem_verification_status").value = "Unconfirmed";
    }

    formOverlay.classList.add("open");
}

function setupMedicationModals()
{
    const detailOverlay = document.getElementById("medicationDetailModalOverlay");
    const formOverlay = document.getElementById("medicationFormModalOverlay");
    const form = document.getElementById("medicationForm");
    const catalogSelect = document.getElementById("medication_catalog_id");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdMedicationsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openMedicationDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeMedicationDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("medicationMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("medicationMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddMedicationBtn").addEventListener("click", () => {
        openMedicationFormModal(null);
    });

    document.getElementById("openSelectCodesBtnMedication").addEventListener("click", () => {
        openSelectCodesModal("medication_coding");
    });

    catalogSelect.addEventListener("change", () => {
        const selectedOption = catalogSelect.options[catalogSelect.selectedIndex];

        if (catalogSelect.value && selectedOption) {
            document.getElementById("medication_title").value = selectedOption.textContent;
        }
    });

    document.getElementById("closeMedicationFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelMedicationForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("medication_record_id").value;
        const catalogId = catalogSelect.value;
        const errEl = document.getElementById("err-medication_title");

        errEl.textContent = "";

        const details = {};

        MEDICATION_DETAIL_FIELDS.forEach((field) => {
            if (field === "is_primary_record") {
                return;
            }

            details[field] = document.getElementById(`medication_${field}`).value.trim();
        });

        details.is_primary_record = document.querySelector('input[name="medication_is_primary_record"]:checked').value;

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientMedication(recordId, details)
            : await addPatientMedication(currentDashboardPatient.id, catalogId || null, details);

        if (!result.success) {
            showAlert("medicationFormAlert", result.message || "Failed to save medication.", "error");
            return;
        }

        closeForm();
        await loadMedicationDetailTable(currentDashboardPatient);
        await loadDashboardMedications(currentDashboardPatient);
    });
}

async function openMedicationDetailModal(patient)
{
    document.getElementById("medicationDetailAlert").innerHTML = "";
    document.getElementById("medicationDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddMedicationBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadMedicationDetailTable(patient);
}

async function loadMedicationDetailTable(patient)
{
    const tbody = document.getElementById("medicationDetailTableBody");

    try {
        const result = await fetchPatientMedications(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load medications.")}</td></tr>`;
            return;
        }

        renderMedicationDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient medications", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load medications right now. Please try again.</td></tr>`;
    }
}

function renderMedicationDetailTable(patient, medications)
{
    const tbody = document.getElementById("medicationDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!medications.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No medications recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = medications.map((medication) => {
        const isActive = !medication.end_date;

        return `
        <tr>
            <td>${escapeHtml(medication.title)}</td>
            <td>${escapeHtml(medication.occurrence || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((medication.updated_at || medication.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-medication="${medication.id}">Edit</button>
                       <button class="btn-danger" data-remove-medication="${medication.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-medication]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const medication = medications.find((m) => String(m.id) === btn.getAttribute("data-edit-medication"));

            if (medication) {
                openMedicationFormModal(medication);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-medication]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this medication record?")) {
                return;
            }

            const result = await removePatientMedication(btn.getAttribute("data-remove-medication"));

            if (!result.success) {
                showAlert("medicationDetailAlert", result.message || "Failed to remove medication.", "error");
                return;
            }

            await loadMedicationDetailTable(currentDashboardPatient);
            await loadDashboardMedications(currentDashboardPatient);
        });
    });
}

async function openMedicationFormModal(existingRecord)
{
    const formOverlay = document.getElementById("medicationFormModalOverlay");
    const title = document.getElementById("medicationFormTitle");
    const recordIdInput = document.getElementById("medication_record_id");
    const catalogSelect = document.getElementById("medication_catalog_id");

    document.getElementById("medicationFormAlert").innerHTML = "";
    document.getElementById("medicationForm").reset();
    document.getElementById("err-medication_title").textContent = "";

    const moreToggle = document.getElementById("medicationMoreToggle");
    const moreFields = document.getElementById("medicationMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchMedications();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Custom / type your own...</option>` +
        catalog.map((medication) => `<option value="${medication.id}">${escapeHtml(medication.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Medication";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.medication_id ?? "";
        catalogSelect.disabled = true;

        MEDICATION_DETAIL_FIELDS.forEach((field) => {
            if (field === "is_primary_record") {
                return;
            }

            document.getElementById(`medication_${field}`).value = existingRecord[field] ?? "";
        });

        document.getElementById(
            Number(existingRecord.is_primary_record) ? "medication_is_primary_record_yes" : "medication_is_primary_record_no"
        ).checked = true;

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Medication";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("medication_verification_status").value = "Unconfirmed";
        document.getElementById("medication_is_primary_record_yes").checked = true;
    }

    formOverlay.classList.add("open");
}

function setupPrescriptionModals()
{
    const detailOverlay = document.getElementById("prescriptionDetailModalOverlay");
    const formOverlay = document.getElementById("prescriptionFormModalOverlay");
    const form = document.getElementById("prescriptionForm");
    const catalogSelect = document.getElementById("prescription_catalog_id");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdPrescriptionsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openPrescriptionDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closePrescriptionDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("prescriptionMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("prescriptionMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddPrescriptionBtn").addEventListener("click", () => {
        openPrescriptionFormModal(null);
    });

    document.getElementById("openSelectCodesBtnPrescription").addEventListener("click", () => {
        openSelectCodesModal("prescription_coding");
    });

    catalogSelect.addEventListener("change", () => {
        const selectedOption = catalogSelect.options[catalogSelect.selectedIndex];

        if (catalogSelect.value && selectedOption) {
            document.getElementById("prescription_title").value = selectedOption.textContent;
        }
    });

    document.getElementById("closePrescriptionFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelPrescriptionForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("prescription_record_id").value;
        const catalogId = catalogSelect.value;
        const errEl = document.getElementById("err-prescription_title");

        errEl.textContent = "";

        const details = {};

        PRESCRIPTION_DETAIL_FIELDS.forEach((field) => {
            if (field === "substitution_allowed") {
                return;
            }

            details[field] = document.getElementById(`prescription_${field}`).value.trim();
        });

        details.substitution_allowed = document.querySelector('input[name="prescription_substitution_allowed"]:checked').value;

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientPrescription(recordId, details)
            : await addPatientPrescription(currentDashboardPatient.id, catalogId || null, details);

        if (!result.success) {
            showAlert("prescriptionFormAlert", result.message || "Failed to save prescription.", "error");
            return;
        }

        closeForm();
        await loadPrescriptionDetailTable(currentDashboardPatient);
        await loadDashboardPrescriptions(currentDashboardPatient);
    });
}

async function openPrescriptionDetailModal(patient)
{
    document.getElementById("prescriptionDetailAlert").innerHTML = "";
    document.getElementById("prescriptionDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddPrescriptionBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadPrescriptionDetailTable(patient);
}

async function loadPrescriptionDetailTable(patient)
{
    const tbody = document.getElementById("prescriptionDetailTableBody");

    try {
        const result = await fetchPatientPrescriptions(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load prescriptions.")}</td></tr>`;
            return;
        }

        renderPrescriptionDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient prescriptions", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load prescriptions right now. Please try again.</td></tr>`;
    }
}

function renderPrescriptionDetailTable(patient, prescriptions)
{
    const tbody = document.getElementById("prescriptionDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!prescriptions.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No prescriptions recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = prescriptions.map((prescription) => {
        const isActive = !prescription.end_date;

        return `
        <tr>
            <td>${escapeHtml(prescription.title)}</td>
            <td>${escapeHtml(prescription.dosage || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((prescription.updated_at || prescription.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-prescription="${prescription.id}">Edit</button>
                       <button class="btn-danger" data-remove-prescription="${prescription.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-prescription]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const prescription = prescriptions.find((p) => String(p.id) === btn.getAttribute("data-edit-prescription"));

            if (prescription) {
                openPrescriptionFormModal(prescription);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-prescription]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this prescription record?")) {
                return;
            }

            const result = await removePatientPrescription(btn.getAttribute("data-remove-prescription"));

            if (!result.success) {
                showAlert("prescriptionDetailAlert", result.message || "Failed to remove prescription.", "error");
                return;
            }

            await loadPrescriptionDetailTable(currentDashboardPatient);
            await loadDashboardPrescriptions(currentDashboardPatient);
        });
    });
}

async function openPrescriptionFormModal(existingRecord)
{
    const formOverlay = document.getElementById("prescriptionFormModalOverlay");
    const title = document.getElementById("prescriptionFormTitle");
    const recordIdInput = document.getElementById("prescription_record_id");
    const catalogSelect = document.getElementById("prescription_catalog_id");

    document.getElementById("prescriptionFormAlert").innerHTML = "";
    document.getElementById("prescriptionForm").reset();
    document.getElementById("err-prescription_title").textContent = "";

    const moreToggle = document.getElementById("prescriptionMoreToggle");
    const moreFields = document.getElementById("prescriptionMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchMedications();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Custom / type your own...</option>` +
        catalog.map((medication) => `<option value="${medication.id}">${escapeHtml(medication.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Prescription";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.medication_id ?? "";
        catalogSelect.disabled = true;

        PRESCRIPTION_DETAIL_FIELDS.forEach((field) => {
            if (field === "substitution_allowed") {
                return;
            }

            document.getElementById(`prescription_${field}`).value = existingRecord[field] ?? "";
        });

        document.getElementById(
            Number(existingRecord.substitution_allowed) ? "prescription_substitution_allowed_yes" : "prescription_substitution_allowed_no"
        ).checked = true;

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Prescription";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("prescription_verification_status").value = "Unconfirmed";
        document.getElementById("prescription_substitution_allowed_yes").checked = true;
    }

    formOverlay.classList.add("open");
}

const DISCLOSURE_DETAIL_FIELDS = ["disclosure_date", "disclosure_type", "recipient", "description"];

function setupDisclosureModals()
{
    const detailOverlay = document.getElementById("disclosureDetailModalOverlay");
    const formOverlay = document.getElementById("disclosureFormModalOverlay");
    const form = document.getElementById("disclosureForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdDisclosuresAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openDisclosureDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeDisclosureDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddDisclosureBtn").addEventListener("click", () => {
        openDisclosureFormModal(null);
    });

    document.getElementById("closeDisclosureFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelDisclosureForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("disclosure_record_id").value;
        const errEl = document.getElementById("err-disclosure_recipient");

        errEl.textContent = "";

        const details = {};

        DISCLOSURE_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`disclosure_${field}`).value.trim();
        });

        if (!details.recipient) {
            errEl.textContent = "Recipient is required.";
            return;
        }

        const result = recordId
            ? await updateDisclosure(recordId, details)
            : await addDisclosure(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("disclosureFormAlert", result.message || "Failed to save disclosure.", "error");
            return;
        }

        closeForm();
        await loadDisclosureDetailTable(currentDashboardPatient);
        await loadDashboardDisclosures(currentDashboardPatient);
    });
}

async function openDisclosureDetailModal(patient)
{
    document.getElementById("disclosureDetailAlert").innerHTML = "";
    document.getElementById("disclosureDetailModalOverlay").classList.add("open");

    await loadDisclosureDetailTable(patient);
}

async function loadDisclosureDetailTable(patient)
{
    const tbody = document.getElementById("disclosureDetailTableBody");

    try {
        const result = await fetchPatientDisclosures(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load disclosures.")}</td></tr>`;
            return;
        }

        renderDisclosureDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient disclosures", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load disclosures right now. Please try again.</td></tr>`;
    }
}

function renderDisclosureDetailTable(disclosures)
{
    const tbody = document.getElementById("disclosureDetailTableBody");

    if (!disclosures.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No disclosures recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = disclosures.map((disclosure) => `
        <tr>
            <td>${escapeHtml((disclosure.disclosure_date || "").slice(0, 10) || "-")}</td>
            <td>${escapeHtml(disclosure.disclosure_type || "-")}</td>
            <td>${escapeHtml(disclosure.recipient)}</td>
            <td>${escapeHtml(disclosure.provider_name || "-")}</td>
            <td class="table-actions">
                <button class="btn-edit" data-edit-disclosure="${disclosure.id}">Edit</button>
                <button class="btn-danger" data-remove-disclosure="${disclosure.id}">Delete</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-disclosure]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const disclosure = disclosures.find((d) => String(d.id) === btn.getAttribute("data-edit-disclosure"));

            if (disclosure) {
                openDisclosureFormModal(disclosure);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-disclosure]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this disclosure record?")) {
                return;
            }

            const result = await removeDisclosure(btn.getAttribute("data-remove-disclosure"));

            if (!result.success) {
                showAlert("disclosureDetailAlert", result.message || "Failed to remove disclosure.", "error");
                return;
            }

            await loadDisclosureDetailTable(currentDashboardPatient);
            await loadDashboardDisclosures(currentDashboardPatient);
        });
    });
}

function openDisclosureFormModal(existingRecord)
{
    const formOverlay = document.getElementById("disclosureFormModalOverlay");
    const title = document.getElementById("disclosureFormTitle");
    const recordIdInput = document.getElementById("disclosure_record_id");

    document.getElementById("disclosureFormAlert").innerHTML = "";
    document.getElementById("disclosureForm").reset();
    document.getElementById("err-disclosure_recipient").textContent = "";

    if (existingRecord) {
        title.textContent = "Edit Disclosure";
        recordIdInput.value = existingRecord.id;
        document.getElementById("disclosure_disclosure_date").value = (existingRecord.disclosure_date || "").slice(0, 10);
        document.getElementById("disclosure_disclosure_type").value = existingRecord.disclosure_type || "Treatment";
        document.getElementById("disclosure_recipient").value = existingRecord.recipient || "";
        document.getElementById("disclosure_description").value = existingRecord.description || "";
    } else {
        title.textContent = "Record Disclosure";
        recordIdInput.value = "";
        document.getElementById("disclosure_disclosure_type").value = "Treatment";
    }

    formOverlay.classList.add("open");
}

const AMENDMENT_DETAIL_FIELDS = ["requested_date", "requested_by", "description", "status", "comments"];

function setupAmendmentModals()
{
    const detailOverlay = document.getElementById("amendmentDetailModalOverlay");
    const formOverlay = document.getElementById("amendmentFormModalOverlay");
    const form = document.getElementById("amendmentForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdAmendmentsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openAmendmentDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeAmendmentDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddAmendmentBtn").addEventListener("click", () => {
        openAmendmentFormModal(null);
    });

    document.getElementById("closeAmendmentFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelAmendmentForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("amendment_record_id").value;
        const errEl = document.getElementById("err-amendment_description");

        errEl.textContent = "";

        const details = {};

        AMENDMENT_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`amendment_${field}`).value.trim();
        });

        if (!details.description) {
            errEl.textContent = "Request description is required.";
            return;
        }

        const result = recordId
            ? await updateAmendment(recordId, details)
            : await addAmendment(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("amendmentFormAlert", result.message || "Failed to save amendment request.", "error");
            return;
        }

        closeForm();
        await loadAmendmentDetailTable(currentDashboardPatient);
        await loadDashboardAmendments(currentDashboardPatient);
    });
}

async function openAmendmentDetailModal(patient)
{
    document.getElementById("amendmentDetailAlert").innerHTML = "";
    document.getElementById("amendmentDetailModalOverlay").classList.add("open");

    await loadAmendmentDetailTable(patient);
}

async function loadAmendmentDetailTable(patient)
{
    const tbody = document.getElementById("amendmentDetailTableBody");

    try {
        const result = await fetchPatientAmendments(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load amendments.")}</td></tr>`;
            return;
        }

        renderAmendmentDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient amendments", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load amendments right now. Please try again.</td></tr>`;
    }
}

function renderAmendmentDetailTable(amendments)
{
    const tbody = document.getElementById("amendmentDetailTableBody");

    if (!amendments.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No amendment requests available.</td></tr>`;
        return;
    }

    tbody.innerHTML = amendments.map((amendment) => `
        <tr>
            <td>${escapeHtml((amendment.requested_date || "").slice(0, 10) || "-")}</td>
            <td>${escapeHtml(amendment.description)}</td>
            <td>${escapeHtml(amendment.requested_by || "-")}</td>
            <td>${escapeHtml(amendment.status || "Pending")}</td>
            <td class="table-actions">
                <button class="btn-edit" data-edit-amendment="${amendment.id}">Edit</button>
                <button class="btn-danger" data-remove-amendment="${amendment.id}">Delete</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-amendment]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const amendment = amendments.find((a) => String(a.id) === btn.getAttribute("data-edit-amendment"));

            if (amendment) {
                openAmendmentFormModal(amendment);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-amendment]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this amendment request?")) {
                return;
            }

            const result = await removeAmendment(btn.getAttribute("data-remove-amendment"));

            if (!result.success) {
                showAlert("amendmentDetailAlert", result.message || "Failed to remove amendment request.", "error");
                return;
            }

            await loadAmendmentDetailTable(currentDashboardPatient);
            await loadDashboardAmendments(currentDashboardPatient);
        });
    });
}

function openAmendmentFormModal(existingRecord)
{
    const formOverlay = document.getElementById("amendmentFormModalOverlay");
    const title = document.getElementById("amendmentFormTitle");
    const recordIdInput = document.getElementById("amendment_record_id");

    document.getElementById("amendmentFormAlert").innerHTML = "";
    document.getElementById("amendmentForm").reset();
    document.getElementById("err-amendment_description").textContent = "";

    if (existingRecord) {
        title.textContent = "Edit Amendment";
        recordIdInput.value = existingRecord.id;
        document.getElementById("amendment_requested_date").value = (existingRecord.requested_date || "").slice(0, 10);
        document.getElementById("amendment_requested_by").value = existingRecord.requested_by || "Patient";
        document.getElementById("amendment_description").value = existingRecord.description || "";
        document.getElementById("amendment_status").value = existingRecord.status || "";
        document.getElementById("amendment_comments").value = existingRecord.comments || "";
    } else {
        title.textContent = "Add Amendment";
        recordIdInput.value = "";
        document.getElementById("amendment_requested_date").value = new Date().toISOString().slice(0, 10);
        document.getElementById("amendment_requested_by").value = "Patient";
        document.getElementById("amendment_status").value = "";
    }

    formOverlay.classList.add("open");
}

let messageCatalogsLoaded = false;
let messageTypeOptions = [];
let messageStatusOptions = [];
let messageRecipientOptions = [];

function setupMessageModals()
{
    const detailOverlay = document.getElementById("messageDetailModalOverlay");
    const formOverlay = document.getElementById("messageFormModalOverlay");
    const form = document.getElementById("messageForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdMessagesAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openMessageDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeMessageDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddMessageModalPd").addEventListener("click", () => {
        openMessageFormModal();
    });

    document.getElementById("closeMessageFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelMessageForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recipientErrEl = document.getElementById("err-message_recipient_id");
        const bodyErrEl = document.getElementById("err-message_body");

        recipientErrEl.textContent = "";
        bodyErrEl.textContent = "";

        const recipientId = document.getElementById("message_recipient_id").value;
        const typeId = document.getElementById("message_type_id").value;
        const statusId = document.getElementById("message_status_id").value;
        const body = document.getElementById("message_body").value.trim();

        if (!recipientId) {
            recipientErrEl.textContent = "Choose a recipient.";
            return;
        }

        if (!body) {
            bodyErrEl.textContent = "Message body is required.";
            return;
        }

        const result = await sendPatientMessage(currentDashboardPatient.id, recipientId, body, {
            type_id: typeId || null,
            status_id: statusId || null
        });

        if (!result.success) {
            showAlert("messageFormAlert", result.message || "Failed to send message.", "error");
            return;
        }

        closeForm();
        await loadMessageDetailTable(currentDashboardPatient);
        await loadDashboardMessages(currentDashboardPatient);
    });
}

async function openMessageDetailModal(patient)
{
    document.getElementById("messageDetailAlert").innerHTML = "";
    document.getElementById("messageDetailModalOverlay").classList.add("open");

    await loadMessageDetailTable(patient);
}

async function loadMessageDetailTable(patient)
{
    const tbody = document.getElementById("messageDetailTableBody");

    try {
        const result = await fetchPatientMessages(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load messages.")}</td></tr>`;
            return;
        }

        renderMessageDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient messages", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load messages right now. Please try again.</td></tr>`;
    }
}

function renderMessageDetailTable(messages)
{
    const tbody = document.getElementById("messageDetailTableBody");

    if (!messages.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No messages recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = messages.map((message) => `
        <tr>
            <td>${escapeHtml((message.created_at || "").slice(0, 16).replace("T", " ") || "-")}</td>
            <td>${escapeHtml(message.sender_name || "-")}</td>
            <td>${escapeHtml(message.type_name || "-")}</td>
            <td>${escapeHtml(message.status_name || "-")}</td>
            <td>${escapeHtml(message.body || "-")}</td>
        </tr>
    `).join("");
}

async function loadMessageCatalogsIfNeeded()
{
    if (messageCatalogsLoaded) {
        return;
    }

    const [typesResult, statusesResult, recipientsResult] = await Promise.all([
        fetchMessageTypes(),
        fetchMessageStatuses(),
        fetchRecipientOptions()
    ]);

    messageTypeOptions = typesResult.success ? typesResult.data : [];
    messageStatusOptions = statusesResult.success ? statusesResult.data : [];
    messageRecipientOptions = recipientsResult.success ? recipientsResult.data : [];
    messageCatalogsLoaded = true;
}

async function openMessageFormModal()
{
    document.getElementById("messageFormAlert").innerHTML = "";
    document.getElementById("messageForm").reset();
    document.getElementById("err-message_recipient_id").textContent = "";
    document.getElementById("err-message_body").textContent = "";

    await loadMessageCatalogsIfNeeded();

    const typeSelect = document.getElementById("message_type_id");
    const statusSelect = document.getElementById("message_status_id");
    const recipientSelect = document.getElementById("message_recipient_id");

    typeSelect.innerHTML = `<option value="">Select type</option>` +
        messageTypeOptions.map((type) => `<option value="${type.id}">${escapeHtml(type.name)}</option>`).join("");

    statusSelect.innerHTML = `<option value="">Select status</option>` +
        messageStatusOptions.map((status) => `<option value="${status.id}">${escapeHtml(status.name)}</option>`).join("");

    recipientSelect.innerHTML = `<option value="">Select recipient</option>` +
        messageRecipientOptions.map((recipient) => `<option value="${recipient.id}">${escapeHtml(recipient.display_name)} (${escapeHtml(capitalize(recipient.role))})</option>`).join("");

    document.getElementById("messageFormModalOverlay").classList.add("open");
}

function capitalize(value)
{
    const text = value || "";

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function setFact(elementId, value)
{
    const el = document.getElementById(elementId);

    el.textContent = value || "Not set";
    el.classList.toggle("empty", !value);
}

function setupPatientFilters(user)
{
    const searchInput = document.getElementById("patientSearchInput");
    const searchClear = document.getElementById("patientSearchClear");
    const providerFilter = document.getElementById("patientProviderFilter");

    const applyFilters = () => renderPatientsTable(getFilteredPatients(searchInput, providerFilter), user);

    searchInput.addEventListener("input", () => {
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        applyFilters();
    });
    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.classList.remove("show");
        applyFilters();
        searchInput.focus();
    });
    providerFilter.addEventListener("change", applyFilters);
}

function getFilteredPatients(searchInput, providerFilter)
{
    const term = searchInput.value.trim().toLowerCase();
    const providerScope = providerFilter.value;

    return patientsCache.filter((patient) => {
        if (providerScope === "unassigned" && patient.provider_id) {
            return false;
        }

        if (term === "") {
            return true;
        }

        const haystack = [
            patient.patient_no,
            patient.first_name,
            patient.middle_name,
            patient.last_name,
            patient.suffix
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(term);
    });
}

function wireModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            modalBox.querySelector(`.modal-tab-panel[data-panel="${tab.getAttribute("data-tab")}"]`).classList.add("active");
        });
    });
}

function resetModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((t, i) => t.classList.toggle("active", i === 0));
    panels.forEach((p, i) => p.classList.toggle("active", i === 0));
}

async function setupAddPatientModal(user)
{
    enablePasswordToggles();
    document.getElementById("birthdate").max = new Date().toISOString().split("T")[0];
    await loadProviderOptions("provider_id");

    const modalOverlay = document.getElementById("addPatientModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");
    const form = document.getElementById("addPatientForm");

    wireModalTabs(modalBox);

    const openModal = () => {
        resetModalTabs(modalBox);
        modalOverlay.classList.add("open");
    };
    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors(FIELDS, "");
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddPatientModal").addEventListener("click", openModal);
    document.getElementById("closeAddPatientModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddPatient").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors(FIELDS, "");

        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const result = await createPatient(data);

        if (!result.success) {
            showAlert("formAlert", result.message || "Failed to register patient.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert(`Patient registered successfully. Patient No: ${result.data.patient_no}`, "success");
        await loadPatients(user);
    });
}

async function setupEditPatientModal(user)
{
    document.getElementById("edit_birthdate").max = new Date().toISOString().split("T")[0];
    await loadProviderOptions("edit_provider_id");

    const modalOverlay = document.getElementById("editPatientModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");
    const form = document.getElementById("editPatientForm");

    wireModalTabs(modalBox);

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors(EDIT_FIELDS, "edit_");
        document.getElementById("editFormAlert").innerHTML = "";
    };

    document.getElementById("closeEditPatientModal").addEventListener("click", closeModal);
    document.getElementById("cancelEditPatient").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    const deleteBtn = document.getElementById("deletePatientFromEdit");

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Delete this patient? This can be reversed by an administrator (soft delete).")) {
                return;
            }

            const id = document.getElementById("edit_id").value;

            await deletePatient(id);
            closeModal();
            showListAlert("Patient deleted successfully.", "success");
            await loadPatients(user);
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors(EDIT_FIELDS, "edit_");

        const id = document.getElementById("edit_id").value;
        const data = {};

        EDIT_FIELDS.forEach((field) => {
            const value = document.getElementById(`edit_${field}`).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const result = await updatePatient(id, data);

        if (!result.success) {
            showAlert("editFormAlert", result.message || "Failed to update patient.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-edit_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert("Patient updated successfully.", "success");
        await loadPatients(user);
    });
}

let currentRelatedPersonPatientId = null;
let relatedPersonsCache = [];
let telecomsCache = [];
let addressesCache = [];
let geographyLoaded = false;

function setupRelatedPersonModals()
{
    const addOverlay = document.getElementById("addRelatedPersonModalOverlay");
    const addForm = document.getElementById("addRelatedPersonForm");
    const detailOverlay = document.getElementById("relatedPersonDetailModalOverlay");
    const detailForm = document.getElementById("relatedPersonDetailForm");

    document.getElementById("openAddRelatedPersonBtn").addEventListener("click", () => {
        if (!currentEditPatient) {
            return;
        }

        addForm.reset();
        document.getElementById("relatedPersonFormAlert").innerHTML = "";
        clearRelatedPersonBasicErrors();
        addOverlay.classList.add("open");
    });

    document.getElementById("closeAddRelatedPersonModal").addEventListener("click", closeAddRelatedPersonModal);
    document.getElementById("cancelAddRelatedPerson").addEventListener("click", closeAddRelatedPersonModal);
    addOverlay.addEventListener("click", (event) => {
        if (event.target === addOverlay) {
            closeAddRelatedPersonModal();
        }
    });

    addForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearRelatedPersonBasicErrors();

        const data = {
            first_name: document.getElementById("rp_first_name").value.trim(),
            middle_name: document.getElementById("rp_middle_name").value.trim(),
            last_name: document.getElementById("rp_last_name").value.trim(),
            phone: document.getElementById("rp_phone").value.trim(),
            date_of_birth: document.getElementById("rp_date_of_birth").value,
            gender: document.getElementById("rp_gender").value,
            notes: document.getElementById("rp_notes").value.trim()
        };

        const result = await addRelatedPerson(currentEditPatient.id, data);

        if (!result.success) {
            showAlert("relatedPersonFormAlert", result.message || "Failed to add related person.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-rp_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeAddRelatedPersonModal();
        await loadRelatedPersons(currentEditPatient.id);

        const newPerson = relatedPersonsCache.find((p) => String(p.id) === String(result.data.id))
            || { id: result.data.id, first_name: data.first_name, last_name: data.last_name };

        await openRelatedPersonDetailModal(newPerson);
    });

    document.getElementById("closeRelatedPersonDetailModal").addEventListener("click", closeRelatedPersonDetailModal);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeRelatedPersonDetailModal();
        }
    });

    detailForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = document.getElementById("rpd_id").value;

        const data = {
            relationship: document.getElementById("rpd_relationship").value.trim(),
            role: document.getElementById("rpd_role").value.trim(),
            contact_priority: document.getElementById("rpd_contact_priority").value,
            relationship_start_date: document.getElementById("rpd_relationship_start_date").value,
            relationship_end_date: document.getElementById("rpd_relationship_end_date").value,
            is_primary_contact: document.getElementById("rpd_is_primary_contact").checked ? 1 : 0,
            is_emergency_contact: document.getElementById("rpd_is_emergency_contact").checked ? 1 : 0,
            can_make_medical_decisions: document.getElementById("rpd_can_make_medical_decisions").checked ? 1 : 0,
            can_receive_medical_info: document.getElementById("rpd_can_receive_medical_info").checked ? 1 : 0
        };

        const result = await updateRelatedPerson(id, data);

        if (!result.success) {
            showAlert("rpDetailAlert", result.message || "Failed to save relationship details.", "error");
            return;
        }

        // Also save an in-progress telecom/address entry if that inline
        // form is open and actually has something filled in — an open but
        // untouched form is left alone rather than erroring on save.
        const telecomFormOpen = !document.getElementById("rpTelecomForm").hidden;
        const addressFormOpen = !document.getElementById("rpAddressForm").hidden;

        if (telecomFormOpen && document.getElementById("rpt_value").value.trim() !== "") {
            const telecomResult = await saveTelecomFromForm(id);

            if (!telecomResult.success) {
                if (telecomResult.errors && telecomResult.errors.value) {
                    document.getElementById("err-rpt_value").textContent = telecomResult.errors.value;
                }

                showAlert("rpDetailAlert", telecomResult.message || "Relationship details saved, but the telecom contact failed to save.", "error");
                await loadRelatedPersons(currentRelatedPersonPatientId);
                return;
            }

            hideTelecomForm();
            await loadTelecomsTable(id);
        }

        if (addressFormOpen && document.getElementById("rpa_address_line").value.trim() !== "") {
            const addressResult = await saveAddressFromForm(id);

            if (!addressResult.success) {
                if (addressResult.errors && addressResult.errors.address_line) {
                    document.getElementById("err-rpa_address_line").textContent = addressResult.errors.address_line;
                }

                showAlert("rpDetailAlert", addressResult.message || "Relationship details saved, but the address failed to save.", "error");
                await loadRelatedPersons(currentRelatedPersonPatientId);
                return;
            }

            hideAddressForm();
            await loadAddressesTable(id);
        }

        showAlert("rpDetailAlert", "Details saved.", "success");
        await loadRelatedPersons(currentRelatedPersonPatientId);
    });

    setupTelecomInlineForm();
    setupAddressInlineForm();
}

function closeAddRelatedPersonModal()
{
    document.getElementById("addRelatedPersonModalOverlay").classList.remove("open");
    document.getElementById("addRelatedPersonForm").reset();
}

function closeRelatedPersonDetailModal()
{
    document.getElementById("relatedPersonDetailModalOverlay").classList.remove("open");
    hideTelecomForm();
    hideAddressForm();
}

function clearRelatedPersonBasicErrors()
{
    ["first_name", "last_name"].forEach((field) => {
        const el = document.getElementById(`err-rp_${field}`);

        if (el) {
            el.textContent = "";
        }
    });
}

async function loadRelatedPersons(patientId)
{
    currentRelatedPersonPatientId = patientId;

    const result = await fetchRelatedPersons(patientId);

    relatedPersonsCache = result.success ? result.data : [];

    renderRelatedPersonsTable();
}

function renderRelatedPersonsTable()
{
    const tbody = document.getElementById("relatedPersonsTableBody");
    const countText = document.getElementById("relatedPersonsCountText");

    countText.textContent = `${relatedPersonsCache.length} ${relatedPersonsCache.length === 1 ? "related person" : "related persons"}`;

    if (!relatedPersonsCache.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No related persons recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = relatedPersonsCache.map((person) => {
        const fullName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");

        const tags = [];

        if (Number(person.is_primary_contact)) tags.push("Primary");
        if (Number(person.is_emergency_contact)) tags.push("Emergency");
        if (Number(person.can_make_medical_decisions)) tags.push("Medical Decisions");
        if (Number(person.can_receive_medical_info)) tags.push("Receives Info");

        return `
        <tr>
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(person.relationship || "-")}</td>
            <td>${escapeHtml(person.role || "-")}</td>
            <td>${person.contact_priority ?? "-"}</td>
            <td>
                <div class="rp-permission-tags">
                    ${tags.length ? tags.map((t) => `<span class="rp-permission-tag">${t}</span>`).join("") : "-"}
                </div>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" data-edit-rp="${person.id}">Edit</button>
                    <button class="btn-danger" data-remove-rp="${person.id}">Delete</button>
                </div>
            </td>
        </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-edit-rp]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const person = relatedPersonsCache.find((p) => String(p.id) === btn.getAttribute("data-edit-rp"));

            if (person) {
                openRelatedPersonDetailModal(person);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-rp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this related person?")) {
                return;
            }

            const result = await removeRelatedPerson(btn.getAttribute("data-remove-rp"));

            if (!result.success) {
                showListAlert(result.message || "Failed to remove related person.", "error");
                return;
            }

            await loadRelatedPersons(currentRelatedPersonPatientId);
        });
    });
}

async function openRelatedPersonDetailModal(person)
{
    document.getElementById("rpDetailAlert").innerHTML = "";
    document.getElementById("rpd_id").value = person.id;
    document.getElementById("rpDetailTitle").textContent =
        [person.first_name, person.last_name].filter(Boolean).join(" ") || "Related Person";

    document.getElementById("rpd_relationship").value = person.relationship ?? "";
    document.getElementById("rpd_role").value = person.role ?? "";
    document.getElementById("rpd_contact_priority").value = person.contact_priority ?? "";
    document.getElementById("rpd_relationship_start_date").value = person.relationship_start_date ?? "";
    document.getElementById("rpd_relationship_end_date").value = person.relationship_end_date ?? "";
    document.getElementById("rpd_is_primary_contact").checked = Boolean(Number(person.is_primary_contact));
    document.getElementById("rpd_is_emergency_contact").checked = Boolean(Number(person.is_emergency_contact));
    document.getElementById("rpd_can_make_medical_decisions").checked = Boolean(Number(person.can_make_medical_decisions));
    document.getElementById("rpd_can_receive_medical_info").checked = Boolean(Number(person.can_receive_medical_info));

    hideTelecomForm();
    hideAddressForm();

    document.getElementById("relatedPersonDetailModalOverlay").classList.add("open");

    await Promise.all([
        loadTelecomsTable(person.id),
        loadAddressesTable(person.id)
    ]);
}


// ---- Telecom Contacts (nested under a related person) ----

function setupTelecomInlineForm()
{
    const formBox = document.getElementById("rpTelecomForm");

    document.getElementById("rpToggleTelecomFormBtn").addEventListener("click", () => {
        if (formBox.hidden) {
            openTelecomForm(null);
        } else {
            hideTelecomForm();
        }
    });

}

/**
 * Save whatever is currently in the telecom inline form. Shared by its own
 * Save button and by the main "Save Details" submit so one click can save
 * relationship details + an in-progress telecom entry together.
 */
async function saveTelecomFromForm(relatedPersonId)
{
    document.getElementById("err-rpt_value").textContent = "";

    const id = document.getElementById("rpt_id").value;

    const data = {
        type: document.getElementById("rpt_type").value,
        contact_use: document.getElementById("rpt_contact_use").value,
        rank_order: document.getElementById("rpt_rank_order").value,
        is_primary: document.getElementById("rpt_is_primary").checked ? 1 : 0,
        value: document.getElementById("rpt_value").value.trim(),
        active_from: document.getElementById("rpt_active_from").value,
        notes: document.getElementById("rpt_notes").value.trim()
    };

    return id
        ? await updateTelecom(id, data)
        : await addTelecom(relatedPersonId, data);
}

function openTelecomForm(existing)
{
    const formBox = document.getElementById("rpTelecomForm");

    document.getElementById("rpt_id").value = existing?.id ?? "";
    document.getElementById("rpt_type").value = existing?.type ?? "";
    document.getElementById("rpt_contact_use").value = existing?.contact_use ?? "";
    document.getElementById("rpt_rank_order").value = existing?.rank_order ?? "";
    document.getElementById("rpt_is_primary").checked = Boolean(Number(existing?.is_primary));
    document.getElementById("rpt_value").value = existing?.value ?? "";
    document.getElementById("rpt_active_from").value = existing?.active_from ?? "";
    document.getElementById("rpt_notes").value = existing?.notes ?? "";
    document.getElementById("err-rpt_value").textContent = "";

    formBox.hidden = false;
}

function hideTelecomForm()
{
    document.getElementById("rpTelecomForm").hidden = true;
}

async function loadTelecomsTable(relatedPersonId)
{
    const result = await fetchTelecoms(relatedPersonId);

    telecomsCache = result.success ? result.data : [];

    renderTelecomsTable();
}

function renderTelecomsTable()
{
    const tbody = document.getElementById("rpTelecomsTableBody");

    if (!telecomsCache.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No telecom contacts yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = telecomsCache.map((t) => `
        <tr>
            <td>${escapeHtml(t.type || "-")}</td>
            <td>${escapeHtml(t.contact_use || "-")}</td>
            <td>${escapeHtml(t.value)}</td>
            <td>${Number(t.is_primary) ? "Yes" : "No"}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" data-edit-telecom="${t.id}">Edit</button>
                    <button class="btn-danger" data-remove-telecom="${t.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-telecom]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const t = telecomsCache.find((entry) => String(entry.id) === btn.getAttribute("data-edit-telecom"));

            if (t) {
                openTelecomForm(t);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-telecom]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this telecom contact?")) {
                return;
            }

            const result = await removeTelecom(btn.getAttribute("data-remove-telecom"));

            if (!result.success) {
                showAlert("rpDetailAlert", result.message || "Failed to remove telecom contact.", "error");
                return;
            }

            await loadTelecomsTable(document.getElementById("rpd_id").value);
        });
    });
}


// ---- Addresses (nested under a related person) ----

function setupAddressInlineForm()
{
    const formBox = document.getElementById("rpAddressForm");

    document.getElementById("rpToggleAddressFormBtn").addEventListener("click", () => {
        if (formBox.hidden) {
            openAddressForm(null);
        } else {
            hideAddressForm();
        }
    });

    document.getElementById("rpa_country").addEventListener("input", updateProvinceOptionsForCountry);
}

/**
 * Save whatever is currently in the address inline form. Shared by its own
 * Save button and by the main "Save Details" submit so one click can save
 * relationship details + an in-progress address together.
 */
async function saveAddressFromForm(relatedPersonId)
{
    document.getElementById("err-rpa_address_line").textContent = "";

    const id = document.getElementById("rpa_id").value;

    const data = {
        address_use: document.getElementById("rpa_address_use").value,
        address_type: document.getElementById("rpa_address_type").value,
        start_date: document.getElementById("rpa_start_date").value,
        end_date: document.getElementById("rpa_end_date").value,
        address_line: document.getElementById("rpa_address_line").value.trim(),
        city: document.getElementById("rpa_city").value.trim(),
        county_district: document.getElementById("rpa_county_district").value.trim(),
        state_province: document.getElementById("rpa_state_province").value.trim(),
        postal_code: document.getElementById("rpa_postal_code").value.trim(),
        country: document.getElementById("rpa_country").value.trim(),
        priority: document.getElementById("rpa_priority").value,
        notes: document.getElementById("rpa_notes").value.trim()
    };

    return id
        ? await updateAddress(id, data)
        : await addAddress(relatedPersonId, data);
}

async function openAddressForm(existing)
{
    const formBox = document.getElementById("rpAddressForm");

    document.getElementById("rpa_id").value = existing?.id ?? "";
    document.getElementById("rpa_address_use").value = existing?.address_use ?? "";
    document.getElementById("rpa_address_type").value = existing?.address_type ?? "";
    document.getElementById("rpa_start_date").value = existing?.start_date ?? "";
    document.getElementById("rpa_end_date").value = existing?.end_date ?? "";
    document.getElementById("rpa_address_line").value = existing?.address_line ?? "";
    document.getElementById("rpa_city").value = existing?.city ?? "";
    document.getElementById("rpa_county_district").value = existing?.county_district ?? "";
    document.getElementById("rpa_state_province").value = existing?.state_province ?? "";
    document.getElementById("rpa_postal_code").value = existing?.postal_code ?? "";
    document.getElementById("rpa_country").value = existing?.country ?? "Philippines";
    document.getElementById("rpa_priority").value = existing?.priority ?? "";
    document.getElementById("rpa_notes").value = existing?.notes ?? "";
    document.getElementById("err-rpa_address_line").textContent = "";

    formBox.hidden = false;

    await loadGeographyOptions();
    await updateProvinceOptionsForCountry();
}

function hideAddressForm()
{
    document.getElementById("rpAddressForm").hidden = true;
}

async function loadGeographyOptions()
{
    if (geographyLoaded) {
        return;
    }

    const countries = await fetchCountries();
    const countryDatalist = document.getElementById("rpaCountryDatalist");

    countryDatalist.innerHTML = countries.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");

    geographyLoaded = true;
}

async function updateProvinceOptionsForCountry()
{
    const countryValue = document.getElementById("rpa_country").value;
    const provinceDatalist = document.getElementById("rpaProvinceDatalist");

    if (!isPhilippines(countryValue)) {
        provinceDatalist.innerHTML = "";
        return;
    }

    const provinces = await fetchPhProvinces();

    provinceDatalist.innerHTML = provinces.map((p) => `<option value="${escapeHtml(p)}"></option>`).join("");
}

async function loadAddressesTable(relatedPersonId)
{
    const result = await fetchAddresses(relatedPersonId);

    addressesCache = result.success ? result.data : [];

    renderAddressesTable();
}

function renderAddressesTable()
{
    const tbody = document.getElementById("rpAddressesTableBody");

    if (!addressesCache.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No addresses yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = addressesCache.map((a) => `
        <tr>
            <td>${escapeHtml(a.address_use || "-")}</td>
            <td>${escapeHtml(a.address_type || "-")}</td>
            <td>${escapeHtml(a.address_line || "-")}</td>
            <td>${escapeHtml(a.city || "-")}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" data-edit-address="${a.id}">Edit</button>
                    <button class="btn-danger" data-remove-address="${a.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-address]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const a = addressesCache.find((entry) => String(entry.id) === btn.getAttribute("data-edit-address"));

            if (a) {
                openAddressForm(a);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-address]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this address?")) {
                return;
            }

            const result = await removeAddress(btn.getAttribute("data-remove-address"));

            if (!result.success) {
                showAlert("rpDetailAlert", result.message || "Failed to remove address.", "error");
                return;
            }

            await loadAddressesTable(document.getElementById("rpd_id").value);
        });
    });
}


function openEditModal(patient)
{
    const modalOverlay = document.getElementById("editPatientModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");

    resetModalTabs(modalBox);

    document.getElementById("edit_id").value = patient.id;
    document.getElementById("edit_first_name").value = patient.first_name ?? "";
    document.getElementById("edit_middle_name").value = patient.middle_name ?? "";
    document.getElementById("edit_last_name").value = patient.last_name ?? "";
    document.getElementById("edit_suffix").value = patient.suffix ?? "";
    document.getElementById("edit_sex").value = patient.sex ?? "";
    document.getElementById("edit_birthdate").value = patient.birthdate ?? "";
    document.getElementById("edit_civil_status").value = patient.civil_status ?? "";
    document.getElementById("edit_blood_type").value = patient.blood_type ?? "";
    document.getElementById("edit_height").value = patient.height ?? "";
    document.getElementById("edit_weight").value = patient.weight ?? "";
    document.getElementById("edit_provider_id").value = patient.provider_id ?? "";
    document.getElementById("edit_allow_sms").value = patient.allow_sms ?? "";
    document.getElementById("edit_allow_voice_calls").value = patient.allow_voice_calls ?? "";
    document.getElementById("edit_allow_email").value = patient.allow_email ?? "";
    document.getElementById("edit_allow_hie").value = patient.allow_hie ?? "";
    document.getElementById("edit_race").value = patient.race ?? "";
    document.getElementById("edit_ethnicity").value = patient.ethnicity ?? "";
    document.getElementById("edit_religion").value = patient.religion ?? "";
    document.getElementById("edit_language").value = patient.language ?? "";

    document.getElementById("edit_address_line").value = patient.contact_address_line ?? "";
    document.getElementById("edit_city").value = patient.contact_city ?? "";
    document.getElementById("edit_province").value = patient.contact_province ?? "";
    document.getElementById("edit_zip_code").value = patient.contact_zip_code ?? "";
    document.getElementById("edit_home_phone").value = patient.contact_home_phone ?? "";
    document.getElementById("edit_mobile_phone").value = patient.contact_mobile_phone ?? "";
    document.getElementById("edit_work_phone").value = patient.contact_work_phone ?? "";
    document.getElementById("edit_contact_email").value = patient.contact_email ?? "";

    currentEditPatient = patient;
    loadRelatedPersons(patient.id);

    document.getElementById("edit_employer_occupation").value = patient.employer_occupation ?? "";
    document.getElementById("edit_employer_name").value = patient.employer_name ?? "";
    document.getElementById("edit_employer_address_line").value = patient.employer_address_line ?? "";
    document.getElementById("edit_employer_address_line2").value = patient.employer_address_line2 ?? "";
    document.getElementById("edit_employer_city").value = patient.employer_city ?? "";
    document.getElementById("edit_employer_state").value = patient.employer_state ?? "";
    document.getElementById("edit_employer_postal_code").value = patient.employer_postal_code ?? "";
    document.getElementById("edit_employer_country").value = patient.employer_country ?? "";
    document.getElementById("edit_employer_industry").value = patient.employer_industry ?? "";
    document.getElementById("edit_employer_employment_start_date").value = patient.employer_employment_start_date ?? "";
    document.getElementById("edit_employer_employment_end_date").value = patient.employer_employment_end_date ?? "";

    document.getElementById("edit_date_deceased").value = patient.date_deceased ?? "";
    document.getElementById("edit_reason_deceased").value = patient.reason_deceased ?? "";

    modalOverlay.classList.add("open");
}

async function loadProviderOptions(selectId)
{
    const result = await fetchProviders();
    const select = document.getElementById(selectId);

    if (result.success) {
        result.data.forEach((provider) => {
            const option = document.createElement("option");

            option.value = provider.id;
            option.textContent = `${provider.first_name} ${provider.last_name}${provider.specialty ? " — " + provider.specialty : ""}`;

            select.appendChild(option);
        });
    }
}

async function loadPatients(user)
{
    const result = await fetchPatients();

    patientsCache = result.success ? result.data : [];

    renderPatientsTable(patientsCache, user);
}

function renderPatientsTable(patients, user)
{
    const tbody = document.getElementById("patientsTableBody");
    const countText = document.getElementById("patientCountText");
    const canDelete = user.role === "admin";
    const canEdit = user.role === "admin" || user.role === "receptionist";

    countText.textContent = `${patientsCache.length} ${patientsCache.length === 1 ? "patient" : "patients"}`;

    if (!patients.length) {
        tbody.innerHTML = renderEmptyState(patientsCache.length === 0);
        return;
    }

    tbody.innerHTML = patients.map((patient) => {
        const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
        const sex = (patient.sex || "").toLowerCase();
        const sexLabel = sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Not set";
        const sexClass = sex === "male" || sex === "female" ? sex : "unset";
        const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";

        return `
        <tr class="pat-row" data-row-id="${patient.id}">
            <td><span class="pat-patient-no">${escapeHtml(patient.patient_no)}</span></td>
            <td>
                <div class="pat-name-cell">
                    <div class="pat-avatar">${escapeHtml((patient.first_name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pat-name">${escapeHtml(fullName)}</span>
                </div>
            </td>
            <td><span class="pat-sex-badge ${sexClass}">${escapeHtml(sexLabel)}</span></td>
            <td class="pat-muted ${patient.birthdate ? "" : "empty"}">${escapeHtml(patient.birthdate || "No birthdate")}</td>
            <td><span class="pat-tag ${providerName ? "" : "empty"}">${providerName ? escapeHtml(providerName) : "Unassigned"}</span></td>
            <td>
                <div class="pat-actions">
                    <button class="pat-icon-btn view" data-dashboard-id="${patient.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        View</button>
                    ${canEdit
                        ? `<button class="pat-icon-btn edit" data-edit-id="${patient.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                            Edit</button>`
                        : ""}
                    ${canDelete ? `<button class="pat-icon-btn delete" data-id="${patient.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                            Delete</button>` : ""}
                </div>
            </td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("[data-dashboard-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const patient = patientsCache.find((p) => String(p.id) === btn.getAttribute("data-dashboard-id"));

            if (patient) {
                openPatientDashboardModal(patient);
            }
        });
    });

    tbody.querySelectorAll(".pat-row").forEach((row) => {
        row.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }

            const patient = patientsCache.find((p) => String(p.id) === row.getAttribute("data-row-id"));

            if (patient) {
                openPatientDashboardModal(patient);
            }
        });
    });

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const patient = patientsCache.find((p) => String(p.id) === btn.getAttribute("data-edit-id"));

            if (patient) {
                openEditModal(patient);
            }
        });
    });

    if (canDelete) {
        tbody.querySelectorAll(".pat-icon-btn.delete").forEach((btn) => {
            btn.addEventListener("click", async () => {
                if (!confirm("Delete this patient? This can be reversed by an administrator (soft delete).")) {
                    return;
                }

                await deletePatient(btn.getAttribute("data-id"));
                await loadPatients(user);
            });
        });
    }
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No patients yet" : "No matching patients";
    const message = noneAtAll
        ? "Registered patients will appear here."
        : "Try a different search term or filter.";

    return `
        <tr>
            <td colspan="6" class="pat-empty-state">
                <div class="pat-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <strong>${heading}</strong>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function clearErrors(fields, prefix)
{
    fields.forEach((field) => {
        const errorEl = document.getElementById(`err-${prefix}${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
