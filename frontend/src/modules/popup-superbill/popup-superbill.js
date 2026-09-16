import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { SuperbillPopupMarkup } from "./popup-superbill.view.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;

export async function openSuperbillPopup() {
    ensureModalInjected();

    const patientNo = getLastActivePatientChart();

    if (!patientNo || patientNo === "null") {
        showToast("Open a patient's chart first.", "error");
        return;
    }

    const patientsResult = await api("/patients");

    if (!patientsResult.success) {
        showToast("Failed to load patient.", "error");
        return;
    }

    const patient = patientsResult.data.find((p) => p.patient_no === patientNo);

    if (!patient) {
        showToast("Patient not found.", "error");
        return;
    }

    const body = document.getElementById("superbillPopupBody");
    body.innerHTML = `<p style="padding: 20px; text-align: center; color: #666;">Loading...</p>`;
    document.getElementById("superbillPopupOverlay").classList.add("open");

    const result = await api(`/reports/visits/superbill?${new URLSearchParams({ patient_id: patient.id }).toString()}`);

    if (!result.success) {
        body.innerHTML = `<p style="padding: 20px; text-align: center; color: red;">Failed to load superbill data.</p>`;
        return;
    }

    body.innerHTML = renderSuperbillDocument(result.data);
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = SuperbillPopupMarkup();
    document.body.appendChild(container);

    const close = () => document.getElementById("superbillPopupOverlay").classList.remove("open");

    document.getElementById("psbCloseBtn").addEventListener("click", close);
    document.getElementById("superbillPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "superbillPopupOverlay") close();
    });
    document.getElementById("psbPrintBtn").addEventListener("click", printSuperbill);

    modalReady = true;
}

function printSuperbill() {
    const doc = document.querySelector("#superbillPopupBody .psb-doc");
    if (!doc) return;

    const printWindow = window.open("", "_blank", "width=900,height=1000");
    printWindow.document.write(`
        <html>
        <head>
            <title>Superbill</title>
            <style>
                body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 24px; }
                .sb-table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; margin-top: 14px; }
                .sb-table td, .sb-table th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; font-size: 11px; }
                .sb-checkbox { width: 25px; border-right: 1px solid #000; text-align: center; }
                .sb-header-row { display: flex; flex-wrap: wrap; gap: 6px 24px; margin-bottom: 4px; font-size: 12px; }
                .sb-value { font-weight: 600; }
                .sb-charges-list { font-size: 11px; padding: 4px; list-style: none; margin: 0; }
                .sb-charges-list li { padding: 2px 0; border-bottom: 1px dashed #ccc; }
                .sb-empty-note { color: #666; font-style: italic; }
            </style>
        </head>
        <body>${doc.outerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function renderSuperbillDocument(data) {
    const clinic = data.clinic || {};
    const patient = data.patient;
    const encounter = data.encounter;

    if (!patient) {
        return `<p style="padding: 20px; text-align: center; color: red;">Patient not found.</p>`;
    }

    const clinicHeader = `
        <strong>${escapeHtml(clinic.name || "")}</strong><br>
        <span>${escapeHtml(clinic.street || "")}</span><br>
        <span>${escapeHtml(clinic.city_state_zip || "")}</span><br>
        <span>${escapeHtml(clinic.country || "")}</span>
    `;

    if (!encounter) {
        return `
            <div class="psb-doc">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <h2 style="font-size: 20px; font-weight: bold; margin: 0;">Superbill/Fee Sheet</h2>
                    <div style="text-align: right; font-size: 12px; line-height: 1.2;">${clinicHeader}</div>
                </div>
                <div class="sb-header-row">
                    <div>Patient: <span class="sb-value">${escapeHtml(patient.name)}</span></div>
                    <div>DOB: <span class="sb-value">${formatDate(patient.dob)}</span></div>
                </div>
                <p class="sb-empty-note" style="margin-top: 20px;">This patient has no recorded visits yet -- a superbill needs an encounter to fill in Date of Service, charges, and balance.</p>
            </div>
        `;
    }

    const totals = data.totals || { charges: 0, payments: 0, adjustments: 0, balance: 0 };
    const chargesListHtml = (data.charges && data.charges.length)
        ? `<ul class="sb-charges-list">${data.charges.map((c) => `<li>${escapeHtml(c.code)} &mdash; ${escapeHtml(c.description)} (${formatMoney(c.total)})</li>`).join("")}</ul>`
        : `<span class="sb-empty-note">No charges entered for this visit.</span>`;

    return `
        <div class="psb-doc">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <h2 style="font-size: 20px; font-weight: bold; margin: 0;">Superbill/Fee Sheet</h2>
                <div style="text-align: right; font-size: 12px; line-height: 1.2;">${clinicHeader}</div>
            </div>

            <div class="sb-header-row">
                <div>Patient: <span class="sb-value">${escapeHtml(patient.name)}</span></div>
                <div>DOB: <span class="sb-value">${formatDate(patient.dob)}</span></div>
                <div>Date of Service: <span class="sb-value">${formatDate(encounter.date_of_service)}</span></div>
                <div>Ref Prov: <span class="sb-value">${escapeHtml(encounter.referring_provider_name || "—")}</span></div>
            </div>

            <table class="sb-table">
                <tr>
                    <td colspan="4" style="text-align: center; font-weight: bold; font-size: 14px; padding: 15px;">
                        New Patient${encounter.is_new_patient ? " &#10003;" : ""}
                    </td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Comprehensive</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Extended</td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Brief</td>
                    <td colspan="4" style="text-align: center; font-weight: bold; font-size: 14px; padding: 15px;">
                        Established Patient${!encounter.is_new_patient ? " &#10003;" : ""}
                    </td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Comprehensive</td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Limited</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Brief</td>
                    <td colspan="4" rowspan="4" style="padding: 8px; font-size: 12px;">
                        <strong>Charges:</strong>
                        ${chargesListHtml}
                    </td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Detailed</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Limited</td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Extended</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Detailed</td>
                </tr>

                <tr>
                    <td colspan="3" style="height: 40px;">Patient: <span class="sb-value">${escapeHtml(patient.name)}</span></td>
                    <td colspan="5">DOB: <span class="sb-value">${formatDate(patient.dob)}</span> &nbsp; ID: <span class="sb-value">${escapeHtml(patient.patient_no)}</span></td>
                    <td colspan="4" rowspan="8" style="padding: 6px; font-size: 11px;">
                        <strong>Notes:</strong><br>
                        ${encounter.billing_note ? escapeHtml(encounter.billing_note) : `<span class="sb-empty-note">None</span>`}
                    </td>
                </tr>
                <tr>
                    <td colspan="3" style="height: 40px;">Provider: <span class="sb-value">${escapeHtml(encounter.provider_name || "Unassigned")}</span></td>
                    <td colspan="5">Reason: <span class="sb-value">${escapeHtml(encounter.reason_for_visit || "—")}</span></td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 40px;">Insurance: <span class="sb-value">${escapeHtml((data.insurance && data.insurance.name) || "None on file")}</span></td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 40px;">Prior Visit: <span class="sb-value">${data.prior_visit ? formatDate(data.prior_visit) : "None (first visit)"}</span></td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 40px;">Today's Charges: <span class="sb-value">${formatMoney(totals.charges)}</span></td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 40px;">Today's Balance: <span class="sb-value">${formatMoney(totals.balance)}</span></td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 40px;"></td>
                </tr>
                <tr>
                    <td colspan="8" style="border-bottom: none; height: 40px;"></td>
                </tr>
                <tr>
                    <td colspan="8" style="border-top: none;"></td>
                    <td colspan="4" style="height: 60px; vertical-align: bottom;">Signature: <span style="display:inline-block; border-bottom: 1px solid #000; width: 80%; margin-left: 5px;"></span></td>
                </tr>
            </table>
        </div>
    `;
}

function formatDate(value) {
    if (!value) return "—";
    return String(value).slice(0, 10);
}

function formatMoney(value) {
    const n = Number(value) || 0;
    return `$${n.toFixed(2)}`;
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
