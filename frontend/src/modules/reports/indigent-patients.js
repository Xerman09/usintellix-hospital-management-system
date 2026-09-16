import { fetchIndigentPatientsReport } from "./indigent-patients.service.js";
import { fetchPatients, setPatientIndigentStatus } from "../patients/patients.service.js";
import { showToast } from "../../core/toast.js";

let allPatients = [];

export async function initIndigentPatientsReport() {
    document.getElementById("indgSubmitBtn").addEventListener("click", loadReport);

    document.getElementById("indgManageBtn").addEventListener("click", openManageModal);
    document.getElementById("indgCloseManageModal").addEventListener("click", closeManageModal);
    document.getElementById("indgManageModalOverlay").addEventListener("click", (event) => {
        if (event.target.id === "indgManageModalOverlay") closeManageModal();
    });

    document.getElementById("indgAddPatientBtn").addEventListener("click", openPatientPicker);
    document.getElementById("closePatientPickerModal").addEventListener("click", closePatientPicker);
    document.getElementById("patientPickerModalOverlay").addEventListener("click", (event) => {
        if (event.target.id === "patientPickerModalOverlay") closePatientPicker();
    });
    document.getElementById("patientPickerSearch").addEventListener("input", (event) => {
        renderPatientPickerList(event.target.value.trim().toLowerCase());
    });
}

async function loadReport() {
    const tbody = document.getElementById("indgTableBody");
    const tfoot = document.getElementById("indgTableFoot");

    tbody.innerHTML = `<tr><td colspan="8" class="indg-empty-state">Loading...</td></tr>`;
    tfoot.innerHTML = "";

    const result = await fetchIndigentPatientsReport({
        date_from: document.getElementById("indgDateFrom").value,
        date_to: document.getElementById("indgDateTo").value
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="indg-empty-state">Failed to load data.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
}

function renderTable(rows) {
    const tbody = document.getElementById("indgTableBody");
    const tfoot = document.getElementById("indgTableFoot");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="indg-empty-state">No visits found for the selected criteria.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    let totalAmount = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    tbody.innerHTML = rows.map((row) => {
        totalAmount += Number(row.amount || 0);
        totalPaid += Number(row.paid || 0);
        totalBalance += Number(row.balance || 0);

        return `
            <tr>
                <td>${escapeHtml(row.patient_name)}</td>
                <td>${escapeHtml(row.ssn || "-")}</td>
                <td>${escapeHtml(String(row.invoice))}</td>
                <td>${formatDate(row.svc_date)}</td>
                <td>${row.due_date ? formatDate(row.due_date) : "-"}</td>
                <td style="text-align: right;">${Number(row.amount || 0).toFixed(2)}</td>
                <td style="text-align: right;">${Number(row.paid || 0).toFixed(2)}</td>
                <td style="text-align: right;">${Number(row.balance || 0).toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    tfoot.innerHTML = `
        <tr>
            <td colspan="5">Total</td>
            <td style="text-align: right;">${totalAmount.toFixed(2)}</td>
            <td style="text-align: right;">${totalPaid.toFixed(2)}</td>
            <td style="text-align: right;">${totalBalance.toFixed(2)}</td>
        </tr>
    `;
}

async function openManageModal() {
    document.getElementById("indgManageAlert").innerHTML = "";
    document.getElementById("indgManageModalOverlay").classList.add("open");
    await loadManageList();
}

function closeManageModal() {
    document.getElementById("indgManageModalOverlay").classList.remove("open");
}

async function loadManageList() {
    const list = document.getElementById("indgManageList");
    list.innerHTML = `<div class="indg-empty-state">Loading...</div>`;

    const result = await fetchPatients();
    allPatients = result.success ? result.data : [];

    const indigentPatients = allPatients.filter((p) => Number(p.is_indigent) === 1);

    if (!indigentPatients.length) {
        list.innerHTML = `<div class="indg-empty-state">No patients marked indigent yet.</div>`;
        return;
    }

    list.innerHTML = indigentPatients.map((p) => `
        <div class="indg-manage-row">
            <span>${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</span>
            <button type="button" class="indg-remove-btn" data-patient-id="${p.id}">Remove</button>
        </div>
    `).join("");

    list.querySelectorAll(".indg-remove-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-patient-id");
            const result = await setPatientIndigentStatus(id, false);

            if (!result.success) {
                document.getElementById("indgManageAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to update.")}</div>`;
                return;
            }

            showToast("Removed from indigent list.", "success");
            await loadManageList();
        });
    });
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

    const candidates = allPatients.filter((p) => Number(p.is_indigent) !== 1);

    const filtered = term
        ? candidates.filter((p) => {
            const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
            return fullName.includes(term) || (p.patient_no || "").toLowerCase().includes(term);
        })
        : candidates;

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
        row.addEventListener("click", async () => {
            const id = row.getAttribute("data-patient-id");
            const result = await setPatientIndigentStatus(id, true);

            closePatientPicker();

            if (!result.success) {
                document.getElementById("indgManageAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to update.")}</div>`;
                return;
            }

            showToast("Added to indigent list.", "success");
            await loadManageList();
        });

        row.addEventListener("mouseenter", () => { row.style.background = "#f7fafc"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
    });
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value.replace(" ", "T"));

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
