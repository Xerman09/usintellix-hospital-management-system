import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { ChartLabelPopupMarkup } from "./popup-chart-label.view.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;
let currentPatient = null;
let zoom = 1;

export async function openChartLabelPopup() {
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
    zoom = 1;

    document.getElementById("chartLabelPopupOverlay").classList.add("open");
    renderSheet();
}

function closeChartLabelPopup() {
    document.getElementById("chartLabelPopupOverlay").classList.remove("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = ChartLabelPopupMarkup();
    document.body.appendChild(container);

    document.getElementById("pclCloseBtn").addEventListener("click", closeChartLabelPopup);
    document.getElementById("chartLabelPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "chartLabelPopupOverlay") closeChartLabelPopup();
    });
    document.getElementById("pclZoomInBtn").addEventListener("click", () => applyZoom(0.1));
    document.getElementById("pclZoomOutBtn").addEventListener("click", () => applyZoom(-0.1));
    document.getElementById("pclCopies").addEventListener("input", renderSheet);
    document.getElementById("pclPrintBtn").addEventListener("click", printSheet);

    modalReady = true;
}

function applyZoom(delta) {
    zoom = Math.min(2, Math.max(0.3, +(zoom + delta).toFixed(2)));
    const sheet = document.getElementById("pclSheet");
    sheet.style.transform = `scale(${zoom})`;
}

function labelHtml() {
    const today = new Date().toISOString().slice(0, 10);
    return `
        <div class="pcl-label">
            ${escapeHtml(`${currentPatient.first_name} ${currentPatient.last_name}`)}<br>
            ${escapeHtml(String(currentPatient.birthdate || "").slice(0, 10))}<br>
            ${today}<br>
            ${currentPatient.id}
        </div>
    `;
}

function renderSheet() {
    const copiesInput = document.getElementById("pclCopies");
    const copies = Math.max(1, Math.min(60, parseInt(copiesInput.value, 10) || 30));

    const sheet = document.getElementById("pclSheet");
    sheet.innerHTML = Array.from({ length: copies }, () => labelHtml()).join("");
}

function printSheet() {
    const copiesInput = document.getElementById("pclCopies");
    const copies = Math.max(1, Math.min(60, parseInt(copiesInput.value, 10) || 30));
    const labels = Array.from({ length: copies }, () => labelHtml()).join("");

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    printWindow.document.write(`
        <html>
        <head>
            <title>Chart Labels</title>
            <style>
                @page { size: letter; margin: 0; }
                body { margin: 0; }
                .pcl-print-sheet {
                    width: 8.5in; padding: 0.5in 0.1875in; box-sizing: border-box;
                    display: grid; grid-template-columns: repeat(3, 2.625in); column-gap: 0.125in; row-gap: 0;
                }
                .pcl-label {
                    width: 2.625in; height: 1in; box-sizing: border-box; padding: 6px 8px;
                    font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #000;
                    overflow: hidden;
                }
            </style>
        </head>
        <body>
            <div class="pcl-print-sheet">${labels}</div>
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
