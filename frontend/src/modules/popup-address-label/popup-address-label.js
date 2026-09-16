import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { AddressLabelPopupMarkup } from "./popup-address-label.view.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;
let currentPatient = null;
let zoom = 1;
let rotated = false;

export async function openAddressLabelPopup() {
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
    rotated = false;

    document.getElementById("addressLabelPopupOverlay").classList.add("open");
    renderLabel();
}

function closeAddressLabelPopup() {
    document.getElementById("addressLabelPopupOverlay").classList.remove("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = AddressLabelPopupMarkup();
    document.body.appendChild(container);

    document.getElementById("palCloseBtn").addEventListener("click", closeAddressLabelPopup);
    document.getElementById("addressLabelPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "addressLabelPopupOverlay") closeAddressLabelPopup();
    });
    document.getElementById("palZoomInBtn").addEventListener("click", () => applyZoom(0.15));
    document.getElementById("palZoomOutBtn").addEventListener("click", () => applyZoom(-0.15));
    document.getElementById("palRotateBtn").addEventListener("click", toggleRotate);
    document.getElementById("palPrintBtn").addEventListener("click", printLabel);

    modalReady = true;
}

function applyZoom(delta) {
    zoom = Math.min(3, Math.max(0.3, +(zoom + delta).toFixed(2)));
    document.getElementById("palSheet").style.transform = `scale(${zoom})`;
}

function toggleRotate() {
    rotated = !rotated;
    document.getElementById("palRotateBtn").classList.toggle("active", rotated);
    document.getElementById("palLabelText").style.transform = rotated ? "rotate(-90deg)" : "";
}

function addressLines() {
    const name = `${currentPatient.first_name} ${currentPatient.last_name}`;
    const street = currentPatient.contact_address_line || "";
    const cityStateZip = [
        currentPatient.contact_city,
        [currentPatient.contact_province, currentPatient.contact_zip_code].filter(Boolean).join(" ")
    ].filter(Boolean).join(", ");

    return [name, street, cityStateZip].filter(Boolean);
}

function renderLabel() {
    const lines = addressLines();
    document.getElementById("palLabelText").innerHTML = lines.map((line) => escapeHtml(line)).join("<br>");

    if (!currentPatient.contact_address_line) {
        showToast("No mailing address on file for this patient -- printing name only.", "error");
    }
}

function printLabel() {
    const lines = addressLines();
    const linesHtml = lines.map((line) => escapeHtml(line)).join("<br>");
    const rotateCss = rotated ? "transform: rotate(-90deg);" : "";

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    printWindow.document.write(`
        <html>
        <head>
            <title>Address Label</title>
            <style>
                @page { size: letter; margin: 0.5in; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; height: 10in; font-family: Arial, sans-serif; }
                .pal-print-text { font-size: 18px; line-height: 1.5; text-align: center; white-space: nowrap; ${rotateCss} }
            </style>
        </head>
        <body>
            <div class="pal-print-text">${linesHtml}</div>
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
