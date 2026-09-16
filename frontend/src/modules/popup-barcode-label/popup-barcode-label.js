import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { BarcodeLabelPopupMarkup } from "./popup-barcode-label.view.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;
let currentPatient = null;
let zoom = 1;

export async function openBarcodeLabelPopup() {
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

    document.getElementById("barcodeLabelPopupOverlay").classList.add("open");
    renderBarcode();
}

function closeBarcodeLabelPopup() {
    document.getElementById("barcodeLabelPopupOverlay").classList.remove("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = BarcodeLabelPopupMarkup();
    document.body.appendChild(container);

    document.getElementById("pblCloseBtn").addEventListener("click", closeBarcodeLabelPopup);
    document.getElementById("barcodeLabelPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "barcodeLabelPopupOverlay") closeBarcodeLabelPopup();
    });
    document.getElementById("pblZoomInBtn").addEventListener("click", () => applyZoom(0.15));
    document.getElementById("pblZoomOutBtn").addEventListener("click", () => applyZoom(-0.15));
    document.getElementById("pblFormat").addEventListener("change", renderBarcode);
    document.getElementById("pblPrintBtn").addEventListener("click", printBarcode);

    modalReady = true;
}

function applyZoom(delta) {
    zoom = Math.min(3, Math.max(0.3, +(zoom + delta).toFixed(2)));
    document.getElementById("pblSheet").style.transform = `scale(${zoom})`;
}

function renderBarcode() {
    if (typeof JsBarcode === "undefined") {
        showToast("Barcode library failed to load.", "error");
        return;
    }

    const format = document.getElementById("pblFormat").value;
    const svg = document.getElementById("pblBarcode");

    JsBarcode(svg, currentPatient.patient_no, {
        format,
        displayValue: true,
        fontSize: 16,
        height: 80,
        margin: 10,
        text: `${currentPatient.first_name} ${currentPatient.last_name} - ${currentPatient.patient_no}`
    });
}

function printBarcode() {
    const format = document.getElementById("pblFormat").value;

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    printWindow.document.write(`
        <html>
        <head>
            <title>Barcode Label</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"><\/script>
            <style>
                @page { size: letter; margin: 0.5in; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; height: 10in; font-family: Arial, sans-serif; }
            </style>
        </head>
        <body>
            <svg id="printBarcode"></svg>
            <script>
                window.onload = function () {
                    JsBarcode("#printBarcode", ${JSON.stringify(currentPatient.patient_no)}, {
                        format: ${JSON.stringify(format)},
                        displayValue: true,
                        fontSize: 16,
                        height: 80,
                        margin: 10,
                        text: ${JSON.stringify(`${currentPatient.first_name} ${currentPatient.last_name} - ${currentPatient.patient_no}`)}
                    });
                    window.focus();
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
