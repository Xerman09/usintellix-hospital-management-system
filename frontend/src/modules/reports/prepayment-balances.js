import { fetchPrepaymentBalances } from "./prepayment-balances.service.js";
import { fetchPatients } from "../patients/patients.service.js";
import { logReportRun } from "./report-history.js";

const SERVICE_LABELS = {
    check: "Check Payment",
    cash: "Cash",
    credit_card: "Credit Card",
    eft: "EFT / Direct Deposit",
    other: "Other"
};

let allPatients = [];
let selectedPatient = null;

export async function initPrepaymentBalancesReport() {
    await loadPatients();

    document.getElementById("ppbSubmitBtn")?.addEventListener("click", fetchReport);
    document.getElementById("ppbPatientBtn")?.addEventListener("click", openPatientPicker);
    document.getElementById("ppbPatientClear")?.addEventListener("click", clearSelectedPatient);

    document.getElementById("closePatientPickerModal")?.addEventListener("click", closePatientPicker);
    document.getElementById("patientPickerModalOverlay")?.addEventListener("click", (event) => {
        if (event.target.id === "patientPickerModalOverlay") closePatientPicker();
    });
    document.getElementById("patientPickerSearch")?.addEventListener("input", (event) => {
        renderPatientPickerList(event.target.value.trim().toLowerCase());
    });
}

async function loadPatients() {
    const result = await fetchPatients();
    allPatients = result.success ? result.data : [];
}

function openPatientPicker() {
    document.getElementById("patientPickerSearch").value = "";
    document.getElementById("patientPickerModalOverlay").classList.add("open");
    renderPatientPickerList("");
    document.getElementById("patientPickerSearch").focus();
}

function closePatientPicker() {
    document.getElementById("patientPickerModalOverlay").classList.remove("open");
}

function renderPatientPickerList(term) {
    const list = document.getElementById("patientPickerList");
    if (!list) return;

    const filtered = term
        ? allPatients.filter((p) => {
            const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
            return fullName.includes(term) || (p.patient_no || "").toLowerCase().includes(term);
        })
        : allPatients;

    if (filtered.length === 0) {
        list.innerHTML = `<div style="padding: 14px; color: #718096; font-style: italic; font-size: 13px;">No matching patients.</div>`;
        return;
    }

    list.innerHTML = filtered.slice(0, 50).map((p) => `
        <div class="patient-picker-row" data-patient-id="${p.id}" style="padding: 10px 14px; border-bottom: 1px solid #edf2f7; cursor: pointer; font-size: 13px; display: flex; justify-content: space-between;">
            <span>${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</span>
            <span style="color: #718096;">${escapeHtml(p.patient_no || "")}</span>
        </div>
    `).join("");

    list.querySelectorAll(".patient-picker-row").forEach((row) => {
        row.addEventListener("click", () => {
            const patient = allPatients.find((p) => String(p.id) === row.getAttribute("data-patient-id"));
            if (patient) selectPatient(patient);
            closePatientPicker();
        });

        row.addEventListener("mouseenter", () => { row.style.background = "#f7fafc"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
    });
}

function selectPatient(patient) {
    selectedPatient = patient;
    document.getElementById("ppbPatientBtn").value = `${patient.last_name}, ${patient.first_name}`;
    document.getElementById("ppbPatientId").value = patient.id;
}

function clearSelectedPatient() {
    selectedPatient = null;
    document.getElementById("ppbPatientBtn").value = "";
    document.getElementById("ppbPatientId").value = "";
}

async function fetchReport() {
    const dateFrom = document.getElementById("ppbDateFrom")?.value || "";
    const dateTo = document.getElementById("ppbDateTo")?.value || "";
    const patientId = selectedPatient ? selectedPatient.id : "";
    const globalOnly = document.getElementById("ppbGlobalOnly")?.checked || false;

    const resultsArea = document.getElementById("ppbResultsArea");
    const tbody = document.getElementById("ppbTableBody");

    if (!tbody || !resultsArea) return;

    resultsArea.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="7" class="ppb-empty-state">Loading data...</td></tr>`;

    const result = await fetchPrepaymentBalances({
        date_from: dateFrom,
        date_to: dateTo,
        patient_id: patientId,
        global_only: globalOnly
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="ppb-empty-state">Failed to load data.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
    logReportRun("Prepayment Balances", "prepayment_balances", {
        date_from: dateFrom, date_to: dateTo, patient_id: patientId, global_only: globalOnly
    });
}

function renderTable(rows) {
    const tbody = document.getElementById("ppbTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="ppb-empty-state">No open prepayments found for the selected criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${formatDate(row.payment_date)}</td>
            <td>${escapeHtml(SERVICE_LABELS[row.payment_method] || row.payment_method || "-")}</td>
            <td>${escapeHtml(row.check_number || "-")}</td>
            <td>${escapeHtml(row.patient || "-")}</td>
            <td style="text-align: right;">${Number(row.payment_amount || 0).toFixed(2)}</td>
            <td style="text-align: right;">${Number(row.allocated_to_patients || 0).toFixed(2)}</td>
            <td style="text-align: right;" class="ppb-balance">${Number(row.balance || 0).toFixed(2)}</td>
        </tr>
    `).join("");
}

function formatDate(value) {
    if (!value) return "";

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
