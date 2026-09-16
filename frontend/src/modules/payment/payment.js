import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { PaymentPopupMarkup, PaymentView } from "./payment.view.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;

export async function openPaymentPopup() {
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

    const patientName = `${patient.first_name} ${patient.last_name}`.trim();

    document.getElementById("paymentPopupBody").innerHTML = PaymentView(patientName);
    document.getElementById("paymentPopupOverlay").classList.add("open");

    document.getElementById("pmtCancelBtn").addEventListener("click", closePaymentPopup);

    await loadPaymentData(patient.id);
}

function closePaymentPopup() {
    document.getElementById("paymentPopupOverlay").classList.remove("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = PaymentPopupMarkup();
    document.body.appendChild(container);

    document.getElementById("pmtCloseBtn").addEventListener("click", closePaymentPopup);
    document.getElementById("paymentPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "paymentPopupOverlay") closePaymentPopup();
    });

    modalReady = true;
}

/**
 * "Payment against" (Co Pay / Invoice Balance / Pre Pay) is the closest
 * thing this schema has to a payment *category*; there's no dedicated
 * column for it on `patient_ledger_payments`, so it's stored in the same
 * free-text `payment_type` field the existing Ledger/Fee Sheet "Add
 * Copay" modal already uses that way (defaults to the literal string
 * "COPAY" -- see `patients-list.js`'s `openLedgerPaymentModal()`). The
 * actual payment *method* (Check/Cash/Credit Card) the UI asks for is a
 * different concept, so it's recorded in `notes` instead of overwriting
 * payment_type with it -- that's what the original version of this file
 * did, which silently broke the "Co Pay Paid" column below (it detects
 * a copay by checking whether the ledger description contains the text
 * "COPAY", which never happened once payment_type was always overwritten
 * with the method name instead).
 */
const AGAINST_TO_PAYMENT_TYPE = {
    copay: "COPAY",
    invoice: "PAYMENT",
    prepay: "PREPAY"
};

async function loadPaymentData(patientId) {
    const tbody = document.querySelector(".pmt-table tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="padding: 10px;">Loading...</td></tr>`;

    const res = await api(`/patient-ledger?patient_id=${patientId}&from=2000-01-01&to=2099-12-31`);
    if (!res.success) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 10px; color: red;">Failed to load data.</td></tr>`;
        return;
    }

    const rows = res.data.rows || [];
    const encountersMap = {};

    rows.forEach((row) => {
        const encId = row.encounter_id;
        if (!encId) return;

        if (!encountersMap[encId]) {
            encountersMap[encId] = {
                id: encId,
                date: row.entry_date ? row.entry_date.substring(0, 10) : (row.billed_date ? row.billed_date.substring(0, 10) : ""),
                totalCharge: 0,
                insurancePayment: 0,
                patientPayment: 0,
                coPayPaid: 0
            };
        }

        if (row.row_type === "charge") {
            encountersMap[encId].totalCharge += row.charge;
        } else if (row.row_type === "payment") {
            if (row.payor === "Insurance") {
                encountersMap[encId].insurancePayment += row.payment;
            } else {
                encountersMap[encId].patientPayment += row.payment;
                if (row.description && row.description.includes("COPAY")) {
                    encountersMap[encId].coPayPaid += row.payment;
                }
            }
        }
    });

    const today = new Date().toISOString().substring(0, 10);

    let html = `
        <tr>
            <td style="padding: 10px;">${today}</td>
            <td colspan="8" class="pmt-muted" style="padding: 10px; text-align: left;">New visit / pre-payment not yet tied to a specific encounter</td>
            <td style="padding: 10px;"><input type="number" step="0.01" min="0" class="pmt-pay-input" data-date="${today}" data-encounter-id="" /></td>
        </tr>
    `;

    Object.values(encountersMap).forEach((enc) => {
        const insBal = enc.totalCharge - enc.insurancePayment;
        const patBal = enc.totalCharge - enc.insurancePayment - enc.patientPayment;

        html += `
        <tr>
            <td style="padding: 10px;">${enc.date}</td>
            <td>${enc.id}</td>
            <td>${enc.totalCharge ? enc.totalCharge.toFixed(2) : ""}</td>
            <td>${enc.insurancePayment ? enc.insurancePayment.toFixed(2) : ""}</td>
            <td>${enc.patientPayment ? enc.patientPayment.toFixed(2) : ""}</td>
            <td>${enc.coPayPaid ? (-enc.coPayPaid).toFixed(2) : ""}</td>
            <td class="pmt-muted" title="No per-visit required co-pay amount is tracked in this system.">&mdash;</td>
            <td>${insBal > 0 ? insBal.toFixed(2) : ""}</td>
            <td>${patBal > 0 ? patBal.toFixed(2) : ""}</td>
            <td style="padding: 10px;"><input type="number" step="0.01" min="0" class="pmt-pay-input" data-date="${enc.date}" data-encounter-id="${enc.id}" /></td>
        </tr>
        `;
    });

    if (Object.keys(encountersMap).length === 0) {
        html += `<tr><td colspan="10" class="pmt-muted" style="padding: 10px;">No prior encounters found for this patient.</td></tr>`;
    }

    tbody.innerHTML = html;

    const totalInput = document.getElementById("pmtTotalInput");
    const payInputs = document.querySelectorAll(".pmt-pay-input");

    payInputs.forEach((input) => {
        input.addEventListener("input", () => {
            let total = 0;
            payInputs.forEach((inp) => {
                const val = parseFloat(inp.value);
                if (!isNaN(val)) total += val;
            });
            if (totalInput) totalInput.value = total.toFixed(2);
        });
    });

    const generateBtn = document.getElementById("generateInvoiceBtn");
    if (generateBtn) {
        generateBtn.addEventListener("click", () => submitPayment(patientId, payInputs));
    }
}

async function submitPayment(patientId, payInputs) {
    const todayStr = new Date().toISOString().substring(0, 10);
    const paymentsToProcess = [];

    payInputs.forEach((inp) => {
        const val = parseFloat(inp.value);
        if (!isNaN(val) && val > 0) {
            paymentsToProcess.push({
                amount: val,
                date: inp.getAttribute("data-date"),
                encounter_id: inp.getAttribute("data-encounter-id")
            });
        }
    });

    if (paymentsToProcess.length === 0) {
        showToast("Please enter a payment amount.", "error");
        return;
    }

    const paymentMethod = document.getElementById("paymentMethod")?.value || "Check Payment";
    const paymentRef = document.getElementById("paymentRef")?.value || "";
    const coverage = document.querySelector('input[name="coverage"]:checked')?.value || "insurance";
    const against = document.querySelector('input[name="against"]:checked')?.value || "copay";

    for (const p of paymentsToProcess) {
        if (!p.encounter_id) {
            const c = confirm("This payment isn't tied to a specific visit yet -- it will be recorded as a pre-payment on the patient's account. Continue?");
            if (!c) return;
        } else if (p.date < todayStr) {
            const c = confirm("You are posting against an old encounter. Continue?");
            if (!c) return;
        }
    }

    const notesParts = [paymentMethod];
    if (paymentRef) notesParts.push(`Ref# ${paymentRef}`);

    for (const p of paymentsToProcess) {
        const body = {
            patient_id: patientId,
            payment_amount: p.amount,
            payment_date: todayStr,
            payment_type: AGAINST_TO_PAYMENT_TYPE[against] || "PAYMENT",
            encounter_id: p.encounter_id ? parseInt(p.encounter_id, 10) : null,
            payer_type: coverage === "self" ? "patient" : "insurance",
            notes: notesParts.join(" - ")
        };

        await api("/patient-ledger", {
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    showToast("Payment(s) successfully recorded.", "success");
    await loadPaymentData(patientId);
}
