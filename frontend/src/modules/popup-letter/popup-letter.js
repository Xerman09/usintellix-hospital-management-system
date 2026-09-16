import { api, API_URL } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { getUser } from "../../core/session.js";
import { LetterPopupMarkup, LetterView } from "./popup-letter.view.js";
import { fetchEmployees } from "../employees/employees.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchDocumentTemplates } from "../document-templates/document-templates.service.js";
import { savePatientLetter, updatePatientLetter } from "../patient-letters/patient-letters.service.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;
let currentPatient = null;
let currentLetterId = null;
let employeesAll = [];
let providersAll = [];
let templatesAll = [];
let clinicInfo = null;

const TEXT_TEMPLATE_EXTENSIONS = ["html", "htm", "txt"];

export async function openLetterPopup() {
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

    currentPatient = patient;
    currentLetterId = null;

    const body = document.getElementById("letterPopupBody");
    body.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-muted);">Loading...</p>`;
    document.getElementById("letterPopupOverlay").classList.add("open");

    const [employeesRes, providersRes, templatesRes] = await Promise.all([
        fetchEmployees(),
        fetchProviders(),
        fetchDocumentTemplates()
    ]);

    employeesAll = employeesRes.success ? employeesRes.data : [];
    providersAll = providersRes.success ? providersRes.data : [];
    templatesAll = templatesRes.success ? templatesRes.data : [];

    const patientLabel = `${patient.first_name} ${patient.last_name} (${patient.id})`;
    body.innerHTML = LetterView(patientLabel);

    document.getElementById("pltDate").value = new Date().toISOString().slice(0, 10);
    populateSpecialtyOptions();
    populateStaffOptions(employeesAll);
    populateTemplateOptions();
    populateSpecialFieldOptions();
    preselectFromCurrentUser();

    document.getElementById("pltSpecialty").addEventListener("change", onSpecialtyChange);
    document.getElementById("pltTemplate").addEventListener("change", onTemplateChange);
    document.getElementById("pltSpecialField").addEventListener("change", onInsertSpecialField);
    document.getElementById("pltSaveNewBtn").addEventListener("click", saveAsNew);
    document.getElementById("pltSaveChangesBtn").addEventListener("click", saveChanges);
    document.getElementById("pltGenerateBtn").addEventListener("click", generateLetter);
}

function closeLetterPopup() {
    document.getElementById("letterPopupOverlay").classList.remove("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = LetterPopupMarkup();
    document.body.appendChild(container);

    document.getElementById("pltCloseBtn").addEventListener("click", closeLetterPopup);
    document.getElementById("letterPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "letterPopupOverlay") closeLetterPopup();
    });

    modalReady = true;
}

function populateSpecialtyOptions() {
    const select = document.getElementById("pltSpecialty");
    const specialties = [...new Set(providersAll.map((p) => p.specialty).filter(Boolean))].sort();

    select.innerHTML = `<option value="">All</option>` +
        specialties.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
}

function employeeLabel(emp) {
    return `${emp.last_name}, ${emp.first_name}`;
}

function populateStaffOptions(employees) {
    const optionsHtml = employees.map((emp) => `<option value="${emp.id}">${escapeHtml(employeeLabel(emp))}</option>`).join("");

    const fromSelect = document.getElementById("pltFrom");
    const toSelect = document.getElementById("pltTo");
    const prevFrom = fromSelect.value;
    const prevTo = toSelect.value;

    fromSelect.innerHTML = optionsHtml;
    toSelect.innerHTML = optionsHtml;

    if (employees.some((e) => String(e.id) === prevFrom)) fromSelect.value = prevFrom;
    if (employees.some((e) => String(e.id) === prevTo)) toSelect.value = prevTo;
}

function preselectFromCurrentUser() {
    const user = getUser();
    if (!user) return;

    const match = employeesAll.find((emp) => String(emp.user_id) === String(user.id));
    if (match) {
        document.getElementById("pltFrom").value = String(match.id);
    }
}

function onSpecialtyChange() {
    const specialty = document.getElementById("pltSpecialty").value;

    if (!specialty) {
        populateStaffOptions(employeesAll);
        return;
    }

    const employeeIds = new Set(
        providersAll.filter((p) => p.specialty === specialty).map((p) => String(p.employee_id))
    );
    const filtered = employeesAll.filter((emp) => employeeIds.has(String(emp.id)));

    populateStaffOptions(filtered.length ? filtered : employeesAll);
}

function populateTemplateOptions() {
    const select = document.getElementById("pltTemplate");
    select.innerHTML = `<option value="">(none)</option>` +
        templatesAll.map((t) => `<option value="${escapeHtml(t.filename)}">${escapeHtml(t.filename)}</option>`).join("");
}

async function onTemplateChange() {
    const filename = document.getElementById("pltTemplate").value;
    if (!filename) return;

    const template = templatesAll.find((t) => t.filename === filename);
    if (!template) return;

    const ext = filename.split(".").pop().toLowerCase();

    if (!TEXT_TEMPLATE_EXTENSIONS.includes(ext)) {
        showToast(`"${filename}" isn't a text-based template, so it can't be loaded into the letter body automatically -- open it separately to use as a reference.`, "error");
        return;
    }

    const bodyField = document.getElementById("pltBody");
    if (bodyField.value.trim() && !confirm("Replace the current letter body with this template's content?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}${template.file_path}`);
        bodyField.value = await response.text();
    } catch (err) {
        showToast("Failed to load template content.", "error");
    }
}

function populateSpecialFieldOptions() {
    const select = document.getElementById("pltSpecialField");
    const fields = specialFieldTokens();

    select.innerHTML = `<option value="">- Choose -</option>` +
        fields.map((f) => `<option value="${escapeHtml(f.label)}">${escapeHtml(f.label)}</option>`).join("");
}

function specialFieldTokens() {
    const dateVal = document.getElementById("pltDate")?.value || new Date().toISOString().slice(0, 10);
    const fromLabel = selectedStaffLabel("pltFrom");
    const toLabel = selectedStaffLabel("pltTo");

    return [
        { label: "Patient Name", value: () => `${currentPatient.first_name} ${currentPatient.last_name}` },
        { label: "Patient ID", value: () => String(currentPatient.id) },
        { label: "Date", value: () => dateVal },
        { label: "From", value: () => fromLabel },
        { label: "To", value: () => toLabel },
        { label: "Facility Name", value: () => (clinicInfo && clinicInfo.name) || "" }
    ];
}

function selectedStaffLabel(selectId) {
    const select = document.getElementById(selectId);
    const emp = employeesAll.find((e) => String(e.id) === select?.value);
    return emp ? employeeLabel(emp) : "";
}

async function onInsertSpecialField() {
    const select = document.getElementById("pltSpecialField");
    const label = select.value;
    if (!label) return;

    if (!clinicInfo) {
        const res = await api("/reports/visits/superbill");
        if (res.success) clinicInfo = res.data.clinic;
    }

    const token = specialFieldTokens().find((f) => f.label === label);
    const value = token ? token.value() : "";

    insertAtCursor(document.getElementById("pltBody"), value);
    select.value = "";
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;

    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    const cursor = start + text.length;
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
}

function collectLetterData() {
    const fromSelect = document.getElementById("pltFrom");
    const toSelect = document.getElementById("pltTo");

    return {
        from_employee_id: fromSelect.value || null,
        from_name: selectedStaffLabel("pltFrom") || null,
        to_employee_id: toSelect.value || null,
        to_name: selectedStaffLabel("pltTo") || null,
        specialty: document.getElementById("pltSpecialty").value || null,
        template_filename: document.getElementById("pltTemplate").value || null,
        print_format: document.getElementById("pltPrintFormat").value,
        letter_date: document.getElementById("pltDate").value,
        body: document.getElementById("pltBody").value
    };
}

async function saveAsNew() {
    const data = collectLetterData();

    if (!data.letter_date) {
        showToast("Date is required.", "error");
        return;
    }

    const result = await savePatientLetter(currentPatient.id, data);

    if (!result.success) {
        showToast(result.message || "Failed to save letter.", "error");
        return;
    }

    currentLetterId = result.data.id;
    document.getElementById("pltSaveChangesBtn").disabled = false;
    showToast("Letter saved.", "success");
}

async function saveChanges() {
    if (!currentLetterId) {
        showToast("Use \"Save as New\" first.", "error");
        return;
    }

    const data = collectLetterData();

    if (!data.letter_date) {
        showToast("Date is required.", "error");
        return;
    }

    const result = await updatePatientLetter(currentLetterId, data);

    if (!result.success) {
        showToast(result.message || "Failed to update letter.", "error");
        return;
    }

    showToast("Letter updated.", "success");
}

async function generateLetter() {
    if (!clinicInfo) {
        const res = await api("/reports/visits/superbill");
        if (res.success) clinicInfo = res.data.clinic;
    }

    const data = collectLetterData();
    const printFormat = data.print_format;
    const bodyHtml = printFormat === "plain"
        ? `<pre style="font-family: 'Courier New', monospace; white-space: pre-wrap;">${escapeHtml(data.body)}</pre>`
        : `<div style="white-space: pre-wrap;">${escapeHtml(data.body).replace(/\n/g, "<br>")}</div>`;

    const printWindow = window.open("", "_blank", "width=850,height=1000");
    printWindow.document.write(`
        <html>
        <head>
            <title>Letter</title>
            <style>
                body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 30px; }
                .plt-print-header { text-align: right; font-size: 12px; margin-bottom: 20px; }
                .plt-print-meta { margin-bottom: 20px; font-size: 13px; }
                .plt-print-meta div { margin-bottom: 4px; }
            </style>
        </head>
        <body>
            <div class="plt-print-header">
                <strong>${escapeHtml((clinicInfo && clinicInfo.name) || "")}</strong><br>
                ${escapeHtml((clinicInfo && clinicInfo.street) || "")}<br>
                ${escapeHtml((clinicInfo && clinicInfo.city_state_zip) || "")}
            </div>
            <div class="plt-print-meta">
                <div>Date: ${escapeHtml(data.letter_date)}</div>
                <div>From: ${escapeHtml(data.from_name || "")}</div>
                <div>To: ${escapeHtml(data.to_name || "")}</div>
                <div>Re: ${escapeHtml(`${currentPatient.first_name} ${currentPatient.last_name} (${currentPatient.id})`)}</div>
            </div>
            ${bodyHtml}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
