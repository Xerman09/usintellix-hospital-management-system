import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { PatientIssuesModalMarkup } from "./patient-issues.view.js";
import { showToast } from "../../core/toast.js";

import { fetchPatientAllergies, addPatientAllergy } from "../patient-allergies/patient-allergies.service.js";
import { fetchPatientMedicalProblems, addPatientMedicalProblem } from "../patient-medical-problems/patient-medical-problems.service.js";
import { fetchPatientMedications, addPatientMedication } from "../patient-medications/patient-medications.service.js";
import { fetchPatientSurgeries, addPatientSurgery } from "../patient-surgeries/patient-surgeries.service.js";
import { fetchPatientDentalIssues, addPatientDentalIssue } from "../patient-dental-issues/patient-dental-issues.service.js";
import { fetchPatientHealthConcerns, addPatientHealthConcern } from "../patient-health-concerns/patient-health-concerns.service.js";

import { fetchAllergies } from "../allergies/allergies.service.js";
import { fetchMedicalProblems } from "../medical-problems/medical-problems.service.js";
import { fetchMedications } from "../medications/medications.service.js";
import { fetchSurgeries } from "../surgeries/surgeries.service.js";

import { fetchPatientEncounters, linkIssueToEncounter, unlinkIssueFromEncounter } from "../encounters/encounters.service.js";

const ISSUE_TYPES = {
    problem: {
        label: "Problem",
        fetchList: fetchPatientMedicalProblems,
        create: (patientId, catalogId, details) => addPatientMedicalProblem(patientId, catalogId, details),
        catalogFetch: fetchMedicalProblems,
        catalogRequired: false
    },
    health_concern: {
        label: "Health Concern",
        fetchList: fetchPatientHealthConcerns,
        create: (patientId, _catalogId, details) => addPatientHealthConcern(patientId, details),
        catalogFetch: null,
        catalogRequired: false
    },
    allergy: {
        label: "Allergy",
        fetchList: fetchPatientAllergies,
        create: (patientId, catalogId, details) => addPatientAllergy(patientId, catalogId, details),
        catalogFetch: fetchAllergies,
        catalogRequired: true
    },
    medication: {
        label: "Medication",
        fetchList: fetchPatientMedications,
        create: (patientId, catalogId, details) => addPatientMedication(patientId, catalogId, details),
        catalogFetch: fetchMedications,
        catalogRequired: false
    },
    surgery: {
        label: "Surgery",
        fetchList: fetchPatientSurgeries,
        create: (patientId, catalogId, details) => addPatientSurgery(patientId, catalogId, details),
        catalogFetch: fetchSurgeries,
        catalogRequired: false
    },
    dental: {
        label: "Dental",
        fetchList: fetchPatientDentalIssues,
        create: (patientId, _catalogId, details) => addPatientDentalIssue(patientId, details),
        catalogFetch: null,
        catalogRequired: false
    }
};

let modalReady = false;
let currentPatient = null; // { id, name }
let issueRows = [];        // normalized { key, issue_type, issue_id, title, description, date }
let encounterRows = [];    // { id, date, reason, provider, linkedSet: Set<"type:id"> }
let selected = null;       // { kind: 'issue'|'encounter', ...key }
let currentSection = "issues";
let catalogItems = [];
let selectedCatalogId = null;

export async function openIssuesPopup() {
    ensureModalInjected();

    const patientNo = getLastActivePatientChart();

    if (!patientNo || patientNo === "null") {
        showToast("Open a patient's chart first.", "error");
        return;
    }

    const patientsRes = await api("/patients");

    if (!patientsRes.success) {
        showToast("Failed to load patient.", "error");
        return;
    }

    const patient = patientsRes.data.find((p) => p.patient_no === patientNo);

    if (!patient) {
        showToast("Patient not found.", "error");
        return;
    }

    currentPatient = { id: patient.id, name: `${patient.first_name} ${patient.last_name}` };
    selected = null;
    currentSection = "issues";
    document.getElementById("pisSectionIssues").checked = true;

    document.getElementById("issuesModalOverlay").classList.add("open");
    document.getElementById("pisTitleBar").textContent = `Issues and Encounters for ${currentPatient.name} (${currentPatient.id})`;

    await loadData();
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = PatientIssuesModalMarkup();
    document.body.appendChild(container);

    wireStaticHandlers();
    modalReady = true;
}

function wireStaticHandlers() {
    document.getElementById("pisCloseBtn").addEventListener("click", closeIssuesModal);
    document.getElementById("pisCancelBtn").addEventListener("click", closeIssuesModal);
    document.getElementById("pisSaveBtn").addEventListener("click", closeIssuesModal);
    document.getElementById("issuesModalOverlay").addEventListener("click", (event) => {
        if (event.target.id === "issuesModalOverlay") closeIssuesModal();
    });

    document.getElementById("pisSectionIssues").addEventListener("change", () => switchSection("issues"));
    document.getElementById("pisSectionEncounters").addEventListener("change", () => switchSection("encounters"));

    document.getElementById("pisAddIssueBtn").addEventListener("click", openAddIssueModal);

    document.getElementById("aiCloseBtn").addEventListener("click", closeAddIssueModal);
    document.getElementById("aiCancelBtn").addEventListener("click", closeAddIssueModal);
    document.getElementById("addIssueModalOverlay").addEventListener("click", (event) => {
        if (event.target.id === "addIssueModalOverlay") closeAddIssueModal();
    });

    document.querySelectorAll('input[name="aiType"]').forEach((radio) => {
        radio.addEventListener("change", onAiTypeChange);
    });

    document.getElementById("aiCatalogSearch").addEventListener("input", onCatalogSearchInput);
    document.getElementById("aiMoreToggle").addEventListener("click", () => {
        document.getElementById("aiMoreFields").classList.toggle("open");
    });

    document.getElementById("aiSaveBtn").addEventListener("click", submitAddIssue);
}

function closeIssuesModal() {
    document.getElementById("issuesModalOverlay").classList.remove("open");
}

async function loadData() {
    const tbody = document.getElementById("pisTableBody");
    tbody.innerHTML = `<tr><td class="pis-empty-state">Loading...</td></tr>`;

    const [allergies, problems, medications, surgeries, dental, healthConcerns, encounters] = await Promise.all([
        fetchPatientAllergies(currentPatient.id),
        fetchPatientMedicalProblems(currentPatient.id),
        fetchPatientMedications(currentPatient.id),
        fetchPatientSurgeries(currentPatient.id),
        fetchPatientDentalIssues(currentPatient.id),
        fetchPatientHealthConcerns(currentPatient.id),
        fetchPatientEncounters(currentPatient.id)
    ]);

    issueRows = [
        ...normalizeRows(allergies, "allergy", (r) => r.name, (r) => r.description, (r) => r.begin_date),
        ...normalizeRows(problems, "problem", (r) => r.title, (r) => r.comments, (r) => r.begin_date),
        ...normalizeRows(medications, "medication", (r) => r.title, (r) => r.comments, (r) => r.begin_date),
        ...normalizeRows(surgeries, "surgery", (r) => r.title, (r) => r.comments, (r) => r.begin_date),
        ...normalizeRows(dental, "dental", (r) => r.title, (r) => r.comments, (r) => r.begin_date),
        ...normalizeRows(healthConcerns, "health_concern", (r) => r.title, (r) => r.comments, (r) => r.begin_date)
    ];

    encounterRows = (encounters.success ? encounters.data : []).map((e) => ({
        id: e.id,
        date: e.date_of_service,
        reason: e.reason_for_visit,
        provider: e.encounter_provider_name,
        linkedSet: new Set((e.linked_issues || "").split(",").filter(Boolean))
    }));

    document.getElementById("pisTitleBar").textContent = `Issues and Encounters for ${currentPatient.name} (${currentPatient.id})`;

    render();
}

function normalizeRows(result, type, titleFn, descFn, dateFn) {
    if (!result.success) return [];

    return result.data.map((r) => ({
        key: `${type}:${r.id}`,
        issue_type: type,
        issue_id: r.id,
        typeLabel: ISSUE_TYPES[type].label,
        title: titleFn(r) || "",
        description: descFn(r) || "",
        date: dateFn(r) || ""
    }));
}

function switchSection(section) {
    currentSection = section;
    render();
}

function render() {
    if (currentSection === "issues") {
        renderIssuesTable();
    } else {
        renderEncountersTable();
    }
}

function presentingComplaintFor(issueKey) {
    const enc = encounterRows.find((e) => e.linkedSet.has(issueKey));
    return enc ? (enc.reason || "") : "";
}

function renderIssuesTable() {
    document.getElementById("pisTableHead").innerHTML = `
        <tr><th>Type</th><th>Title</th><th>Description</th><th>Date</th><th>Presenting Complaint</th></tr>
    `;

    const tbody = document.getElementById("pisTableBody");

    if (!issueRows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="pis-empty-state">No issues recorded for this patient.</td></tr>`;
        return;
    }

    const highlightSet = selected && selected.kind === "encounter"
        ? encounterRows.find((e) => e.id === selected.encounter_id)?.linkedSet || new Set()
        : new Set();

    tbody.innerHTML = issueRows.map((row) => {
        const isSelected = selected && selected.kind === "issue" && selected.issue_type === row.issue_type && selected.issue_id === row.issue_id;
        const isRelated = highlightSet.has(row.key);
        const cls = isSelected ? "pis-selected" : (isRelated ? "pis-related" : "");

        return `
            <tr class="${cls}" data-key="${row.key}" data-type="${row.issue_type}" data-id="${row.issue_id}">
                <td>${escapeHtml(row.typeLabel)}</td>
                <td>${escapeHtml(row.title)}</td>
                <td>${escapeHtml(row.description)}</td>
                <td>${formatDate(row.date)}</td>
                <td>${escapeHtml(presentingComplaintFor(row.key))}</td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("tr[data-key]").forEach((tr) => {
        tr.addEventListener("click", () => onRowClick({
            kind: "issue",
            issue_type: tr.getAttribute("data-type"),
            issue_id: Number(tr.getAttribute("data-id"))
        }));
    });
}

function renderEncountersTable() {
    document.getElementById("pisTableHead").innerHTML = `
        <tr><th>Date</th><th>Provider</th><th>Reason</th></tr>
    `;

    const tbody = document.getElementById("pisTableBody");

    if (!encounterRows.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="pis-empty-state">No encounters recorded for this patient.</td></tr>`;
        return;
    }

    const selectedIssueKey = selected && selected.kind === "issue" ? `${selected.issue_type}:${selected.issue_id}` : null;

    tbody.innerHTML = encounterRows.map((enc) => {
        const isSelected = selected && selected.kind === "encounter" && selected.encounter_id === enc.id;
        const isRelated = selectedIssueKey && enc.linkedSet.has(selectedIssueKey);
        const cls = isSelected ? "pis-selected" : (isRelated ? "pis-related" : "");

        return `
            <tr class="${cls}" data-id="${enc.id}">
                <td>${formatDate(enc.date)}</td>
                <td>${escapeHtml(enc.provider || "-")}</td>
                <td>${escapeHtml(enc.reason || "-")}</td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
        tr.addEventListener("click", () => onRowClick({ kind: "encounter", encounter_id: Number(tr.getAttribute("data-id")) }));
    });
}

async function onRowClick(record) {
    if (!selected || selected.kind === record.kind) {
        const isSameRow = selected
            && selected.kind === record.kind
            && (record.kind === "issue"
                ? selected.issue_type === record.issue_type && selected.issue_id === record.issue_id
                : selected.encounter_id === record.encounter_id);

        selected = isSameRow ? null : record;
        render();
        return;
    }

    const issueRef = selected.kind === "issue" ? selected : record;
    const encounterRef = selected.kind === "encounter" ? selected : record;

    await toggleRelation(issueRef, encounterRef);
}

async function toggleRelation(issueRef, encounterRef) {
    const issueKey = `${issueRef.issue_type}:${issueRef.issue_id}`;
    const encounter = encounterRows.find((e) => e.id === encounterRef.encounter_id);

    if (!encounter) return;

    const isRelated = encounter.linkedSet.has(issueKey);

    const result = isRelated
        ? await unlinkIssueFromEncounter(encounter.id, issueRef.issue_type, issueRef.issue_id)
        : await linkIssueToEncounter(encounter.id, issueRef.issue_type, issueRef.issue_id);

    if (!result.success) {
        showToast(result.message || "Failed to update relationship.", "error");
        return;
    }

    if (isRelated) {
        encounter.linkedSet.delete(issueKey);
    } else {
        encounter.linkedSet.add(issueKey);
    }

    showToast(isRelated ? "Relationship removed." : "Relationship added.", "success");
    render();
}

// ---- Add Issue modal ----

function openAddIssueModal() {
    document.getElementById("addIssueForm")?.reset();
    document.getElementById("aiAlert").innerHTML = "";
    document.querySelector('input[name="aiType"][value="problem"]').checked = true;
    document.getElementById("aiTitle").value = "";
    document.getElementById("aiCatalogSearch").value = "";
    document.getElementById("aiCatalogDropdown").classList.remove("open");
    document.getElementById("aiBeginDate").value = "";
    document.getElementById("aiEndDate").value = "";
    document.getElementById("aiComments").value = "";
    document.getElementById("aiMoreFields").classList.remove("open");
    ["aiCoding", "aiOccurrence", "aiOutcome", "aiClassificationType", "aiReferredBy", "aiDestination"].forEach((id) => {
        document.getElementById(id).value = "";
    });
    document.getElementById("aiVerificationStatus").value = "Unconfirmed";

    selectedCatalogId = null;
    onAiTypeChange();

    document.getElementById("addIssueModalOverlay").classList.add("open");
}

function closeAddIssueModal() {
    document.getElementById("addIssueModalOverlay").classList.remove("open");
}

async function onAiTypeChange() {
    const type = document.querySelector('input[name="aiType"]:checked').value;
    const config = ISSUE_TYPES[type];

    selectedCatalogId = null;
    document.getElementById("aiCatalogSearch").value = "";
    document.getElementById("aiCatalogDropdown").classList.remove("open");

    const titleInput = document.getElementById("aiTitle");
    const catalogInput = document.getElementById("aiCatalogSearch");

    if (config.catalogRequired) {
        titleInput.disabled = true;
        titleInput.placeholder = "Not used for Allergy -- select from list";
        titleInput.value = "";
    } else {
        titleInput.disabled = false;
        titleInput.placeholder = "Type your own";
    }

    if (config.catalogFetch) {
        catalogInput.disabled = false;
        catalogInput.placeholder = "Search catalog...";
        const result = await config.catalogFetch();
        catalogItems = result.success ? result.data : [];
    } else {
        catalogInput.disabled = true;
        catalogInput.placeholder = "No catalog for this issue type";
        catalogItems = [];
    }
}

function onCatalogSearchInput(event) {
    const term = event.target.value.trim().toLowerCase();
    const dropdown = document.getElementById("aiCatalogDropdown");

    if (!term) {
        dropdown.classList.remove("open");
        selectedCatalogId = null;
        return;
    }

    const matches = catalogItems.filter((c) => c.name.toLowerCase().includes(term)).slice(0, 30);

    if (!matches.length) {
        dropdown.innerHTML = `<div class="ai-catalog-item" style="font-style:italic;color:var(--text-muted);">No matches.</div>`;
        dropdown.classList.add("open");
        return;
    }

    dropdown.innerHTML = matches.map((c) => `<div class="ai-catalog-item" data-id="${c.id}" data-name="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>`).join("");
    dropdown.classList.add("open");

    dropdown.querySelectorAll(".ai-catalog-item[data-id]").forEach((item) => {
        item.addEventListener("click", () => {
            selectedCatalogId = Number(item.getAttribute("data-id"));
            document.getElementById("aiCatalogSearch").value = item.getAttribute("data-name");

            const type = document.querySelector('input[name="aiType"]:checked').value;
            if (!ISSUE_TYPES[type].catalogRequired) {
                document.getElementById("aiTitle").value = item.getAttribute("data-name");
            }

            dropdown.classList.remove("open");
        });
    });
}

async function submitAddIssue() {
    const type = document.querySelector('input[name="aiType"]:checked').value;
    const config = ISSUE_TYPES[type];
    const alertEl = document.getElementById("aiAlert");

    alertEl.innerHTML = "";

    const title = document.getElementById("aiTitle").value.trim();

    if (config.catalogRequired && !selectedCatalogId) {
        alertEl.innerHTML = `<div class="form-alert error">Select an item from the list.</div>`;
        return;
    }

    if (!config.catalogRequired && !title && !selectedCatalogId) {
        alertEl.innerHTML = `<div class="form-alert error">Enter a title or select one from the list.</div>`;
        return;
    }

    const details = {
        title: config.catalogRequired ? undefined : (title || document.getElementById("aiCatalogSearch").value.trim()),
        begin_date: document.getElementById("aiBeginDate").value || null,
        end_date: document.getElementById("aiEndDate").value || null,
        comments: document.getElementById("aiComments").value.trim() || null,
        coding: document.getElementById("aiCoding").value.trim() || null,
        occurrence: document.getElementById("aiOccurrence").value.trim() || null,
        outcome: document.getElementById("aiOutcome").value.trim() || null,
        classification_type: document.getElementById("aiClassificationType").value.trim() || null,
        verification_status: document.getElementById("aiVerificationStatus").value,
        referred_by: document.getElementById("aiReferredBy").value.trim() || null,
        destination: document.getElementById("aiDestination").value.trim() || null
    };

    const result = await config.create(currentPatient.id, selectedCatalogId, details);

    if (!result.success) {
        const hasFieldErrors = result.errors && Object.keys(result.errors).length > 0;
        alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(hasFieldErrors ? Object.values(result.errors).join(" ") : (result.message || "Failed to add issue."))}</div>`;
        return;
    }

    showToast("Issue added successfully.", "success");
    closeAddIssueModal();
    await loadData();
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB");
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
