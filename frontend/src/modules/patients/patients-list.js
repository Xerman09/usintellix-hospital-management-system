import { getUser } from "../../core/session.js";
import { fetchPatients, deletePatient, createPatient, updatePatient } from "./patients.service.js";
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

let currentDashboardPatient = null;
let activeDemoTab = "who";

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
    "emergency_contact_name", "emergency_relationship", "emergency_phone", "emergency_address"
];

const EDIT_FIELDS = [
    "first_name", "middle_name", "last_name", "suffix", "sex",
    "birthdate", "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "emergency_contact_name", "emergency_relationship", "emergency_phone", "emergency_address",
    "employer_occupation", "employer_name", "employer_address_line", "employer_address_line2",
    "employer_city", "employer_state", "employer_postal_code", "employer_country",
    "employer_industry", "employer_employment_start_date", "employer_employment_end_date",
    "date_deceased", "reason_deceased",
    "guardian_name", "guardian_relationship", "guardian_sex", "guardian_address",
    "guardian_city", "guardian_state", "guardian_postal_code", "guardian_country",
    "guardian_phone", "guardian_work_phone", "guardian_email"
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

    activeDemoTab = "who";
    document.querySelectorAll("#pdDemoTabs .pd-demo-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-demo-tab") === "who");
    });
    renderDemographics(patient);

    loadDashboardAllergies(patient);
    loadDashboardProblems(patient);
    loadDashboardMedications(patient);
}

function renderDemographics(patient)
{
    const panels = document.getElementById("pdDemoPanels");

    if (!panels) {
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
            field("Contact Email", patient.contact_email),
            field("Emergency Contact", patient.emergency_contact_name),
            field("Emergency Relationship", patient.emergency_relationship),
            field("Emergency Phone", patient.emergency_phone),
            field("Emergency Address", patient.emergency_address)
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
        ],
        related: [
            field("Guardian Name", patient.guardian_name),
            field("Relationship", patient.guardian_relationship),
            field("Sex", patient.guardian_sex ? patient.guardian_sex.charAt(0).toUpperCase() + patient.guardian_sex.slice(1) : ""),
            field("Address", patient.guardian_address),
            field("City", patient.guardian_city),
            field("State", patient.guardian_state),
            field("Postal Code", patient.guardian_postal_code),
            field("Country", patient.guardian_country),
            field("Phone", patient.guardian_phone),
            field("Work Phone", patient.guardian_work_phone),
            field("Email", patient.guardian_email)
        ]
    };

    const rows = tabRows[activeDemoTab] || [];
    const relatedPersonsNote = activeDemoTab === "related"
        ? `<div style="margin-top: 14px;">
                <span class="pd-demo-label">Related Persons</span>
                <p class="pd-demo-value empty" style="margin-top: 4px;">None recorded.</p>
           </div>`
        : "";

    panels.innerHTML = `<div class="pd-demo-grid">${rows.join("")}</div>${relatedPersonsNote}`;
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

    document.getElementById("edit_emergency_contact_name").value = patient.emergency_contact_name ?? "";
    document.getElementById("edit_emergency_relationship").value = patient.emergency_relationship ?? "";
    document.getElementById("edit_emergency_phone").value = patient.emergency_phone ?? "";
    document.getElementById("edit_emergency_address").value = patient.emergency_address ?? "";

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

    document.getElementById("edit_guardian_name").value = patient.guardian_name ?? "";
    document.getElementById("edit_guardian_relationship").value = patient.guardian_relationship ?? "";
    document.getElementById("edit_guardian_sex").value = patient.guardian_sex ?? "";
    document.getElementById("edit_guardian_address").value = patient.guardian_address ?? "";
    document.getElementById("edit_guardian_city").value = patient.guardian_city ?? "";
    document.getElementById("edit_guardian_state").value = patient.guardian_state ?? "";
    document.getElementById("edit_guardian_postal_code").value = patient.guardian_postal_code ?? "";
    document.getElementById("edit_guardian_country").value = patient.guardian_country ?? "";
    document.getElementById("edit_guardian_phone").value = patient.guardian_phone ?? "";
    document.getElementById("edit_guardian_work_phone").value = patient.guardian_work_phone ?? "";
    document.getElementById("edit_guardian_email").value = patient.guardian_email ?? "";

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
