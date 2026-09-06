import { api } from "../../core/api.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchPatients } from "../patients/patients.service.js";
import { logReportRun } from "./report-history.js";

let allPatients = [];
let selectedPatient = null;
let currentReportData = { rows: [], totals: {} };

export async function initPatientLedgerByDateReport() {
    await Promise.all([loadFacilities(), loadProviders(), loadPatients()]);

    document.getElementById("plSubmitBtn")?.addEventListener("click", fetchLedger);
    document.getElementById("plPrintBtn")?.addEventListener("click", printReport);
    document.getElementById("plMaskToggle")?.addEventListener("click", toggleMask);

    document.getElementById("plPatientBtn")?.addEventListener("click", openPatientPicker);
    document.getElementById("closePatientPickerModal")?.addEventListener("click", closePatientPicker);
    document.getElementById("patientPickerModalOverlay")?.addEventListener("click", (event) => {
        if (event.target.id === "patientPickerModalOverlay") closePatientPicker();
    });
    document.getElementById("patientPickerSearch")?.addEventListener("input", (event) => {
        renderPatientPickerList(event.target.value.trim().toLowerCase());
    });
}

async function loadFacilities() {
    const select = document.getElementById("plFacility");
    if (!select) return;

    const result = await fetchFacilities();

    if (result.success) {
        result.data.forEach((facility) => {
            const option = document.createElement("option");
            option.value = facility.id;
            option.textContent = facility.name;
            select.appendChild(option);
        });
    }
}

async function loadProviders() {
    const select = document.getElementById("plProvider");
    if (!select) return;

    const result = await fetchProviders();

    if (result.success) {
        result.data.forEach((provider) => {
            const option = document.createElement("option");
            option.value = provider.id;
            option.textContent = `${provider.last_name}, ${provider.first_name}`;
            select.appendChild(option);
        });
    }
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
    const btn = document.getElementById("plPatientBtn");
    btn.innerHTML = `${escapeHtml(patient.last_name)}, ${escapeHtml(patient.first_name)} <span class="pl-patient-clear" id="plPatientClear" title="Clear">&times;</span>`;

    document.getElementById("plPatientClear")?.addEventListener("click", (event) => {
        event.stopPropagation();
        clearSelectedPatient();
    });
}

function clearSelectedPatient() {
    selectedPatient = null;
    document.getElementById("plPatientBtn").textContent = "Click To Select";
}

function toggleMask() {
    document.getElementById("plWrapper")?.classList.toggle("pl-masked");
}

async function fetchLedger() {
    const facilityId = document.getElementById("plFacility")?.value || "";
    const providerId = document.getElementById("plProvider")?.value || "";
    const dateFrom = document.getElementById("plDateFrom")?.value || "";
    const dateTo = document.getElementById("plDateTo")?.value || "";
    const patientId = selectedPatient ? selectedPatient.id : "";

    const instructionText = document.getElementById("plInstructionText");
    const resultsArea = document.getElementById("plResultsArea");
    const printBtn = document.getElementById("plPrintBtn");
    const tbody = document.getElementById("plTableBody");

    if (!tbody || !resultsArea) return;

    if (instructionText) instructionText.style.display = "none";
    resultsArea.style.display = "block";
    if (printBtn) printBtn.style.display = "flex";

    tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            provider_id: providerId,
            date_from: dateFrom,
            date_to: dateTo,
            patient_id: patientId
        });

        const result = await api(`/reports/financial/patient-ledger?${params.toString()}`);

        if (result.success) {
            currentReportData = result.data || { rows: [], totals: {} };
            renderTable();
            logReportRun("Patient Ledger by Date", "patient_ledger_by_date", { facility_id: facilityId, provider_id: providerId, date_from: dateFrom, date_to: dateTo, patient_id: patientId });
        } else {
            currentReportData = { rows: [], totals: {} };
            tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        currentReportData = { rows: [], totals: {} };
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable() {
    const tbody = document.getElementById("plTableBody");
    if (!tbody) return;

    const rows = currentReportData.rows || [];
    const totals = currentReportData.totals || {};

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No ledger activity found for the selected criteria.</td></tr>`;
    } else {
        tbody.innerHTML = rows.map((row) => `
            <tr class="${row.row_type === 'payment' ? 'pl-row-payment' : ''}">
                <td>${escapeHtml(row.patient_name)}</td>
                <td>${escapeHtml(row.code || "")}</td>
                <td>${escapeHtml(row.description || "")}</td>
                <td>${escapeHtml(row.billed_date || "")}${row.payor ? " / " + escapeHtml(row.payor) : ""}</td>
                <td>${escapeHtml(row.type || "")}</td>
                <td style="text-align: right;">${row.units ?? ""}</td>
                <td style="text-align: right;" class="pl-money">${Number(row.charge || 0) > 0 ? Number(row.charge).toFixed(2) : ""}</td>
                <td style="text-align: right;" class="pl-money">${Number(row.payment || 0) > 0 ? Number(row.payment).toFixed(2) : ""}</td>
                <td style="text-align: right;" class="pl-money">${Number(row.adjustment || 0) > 0 ? Number(row.adjustment).toFixed(2) : ""}</td>
                <td style="text-align: right;" class="pl-money">${Number(row.balance || 0).toFixed(2)}</td>
            </tr>
        `).join("");
    }

    document.getElementById("plTotalUnits").textContent = totals.units ?? 0;
    document.getElementById("plTotalCharge").textContent = Number(totals.charge || 0).toFixed(2);
    document.getElementById("plTotalPayment").textContent = Number(totals.payment || 0).toFixed(2);
    document.getElementById("plTotalAdjustment").textContent = Number(totals.adjustment || 0).toFixed(2);
    document.getElementById("plTotalBalance").textContent = Number(totals.balance || 0).toFixed(2);
}

function printReport() {
    const reportWindow = window.open("", "_blank", "width=1100,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to print the report.");
        return;
    }

    const tableHtml = document.querySelector(".pl-report-wrapper table")?.outerHTML || "";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Patient Ledger by Date</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
                h1 { margin-bottom: 5px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #e2e8f0; padding: 8px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #edf2f7; }
                tfoot td { border-top: 2px solid #2d3748; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Report - Patient Ledger by Date</h1>
            ${tableHtml}
            <script>
                window.onload = function() { window.print(); };
            </script>
        </body>
        </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
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
