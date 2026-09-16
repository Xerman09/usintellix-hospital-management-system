import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { CheckoutPopupMarkup, CheckoutView } from "./popup-checkout.view.js";
import { fetchPatientEncounters } from "../encounters/encounters.service.js";
import { fetchEncounterBillingCodes } from "../encounter-billing-codes/encounter-billing-codes.service.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;
let currentPatientId = null;
let currentEncounter = null;
let originalItemsTotal = 0;

export async function openCheckoutPopup() {
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

    currentPatientId = patient.id;
    const patientName = `${patient.first_name} ${patient.last_name}`.trim();

    const body = document.getElementById("checkoutPopupBody");
    body.innerHTML = `<p class="pco-muted">Loading...</p>`;
    document.getElementById("checkoutPopupOverlay").classList.add("open");

    const encountersRes = await fetchPatientEncounters(patient.id);

    if (!encountersRes.success || !encountersRes.data.length) {
        body.innerHTML = `<p class="pco-muted">This patient has no recorded visits yet -- there's nothing to check out.</p>`;
        return;
    }

    currentEncounter = encountersRes.data[0];

    body.innerHTML = CheckoutView(patientName);
    document.getElementById("pcoCancelBtn").addEventListener("click", closeCheckoutPopup);
    document.getElementById("pcoDiscount").addEventListener("input", recalculateAmountPaid);
    document.getElementById("pcoSaveBtn").addEventListener("click", saveCheckout);
    document.getElementById("pcoPostingDate").value = String(currentEncounter.date_of_service).slice(0, 10);

    await loadItems(currentEncounter.id);
}

function closeCheckoutPopup() {
    document.getElementById("checkoutPopupOverlay").classList.remove("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = CheckoutPopupMarkup();
    document.body.appendChild(container);

    document.getElementById("pcoCloseBtn").addEventListener("click", closeCheckoutPopup);
    document.getElementById("checkoutPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "checkoutPopupOverlay") closeCheckoutPopup();
    });

    modalReady = true;
}

async function loadItems(encounterId) {
    const tbody = document.getElementById("pcoItemsBody");
    const res = await fetchEncounterBillingCodes(encounterId);

    if (!res.success || !res.data.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="pco-muted">No billed items for this visit.</td></tr>`;
        originalItemsTotal = 0;
        recalculateAmountPaid();
        return;
    }

    const dateStr = String(currentEncounter.date_of_service).slice(0, 10);

    tbody.innerHTML = res.data.map((item) => {
        const amount = Number(item.total) || 0;
        return `
        <tr>
            <td>${dateStr}</td>
            <td>${escapeHtml(item.description || "")}</td>
            <td class="pco-num">${item.units}</td>
            <td class="pco-num">
                <input type="number" step="0.01" min="0" class="pco-amount-input pco-item-amount"
                       value="${amount.toFixed(2)}" data-original="${amount}" ${amount === 0 ? "disabled" : ""}>
            </td>
        </tr>
        `;
    }).join("");

    originalItemsTotal = res.data.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    document.querySelectorAll(".pco-item-amount").forEach((input) => {
        input.addEventListener("input", recalculateAmountPaid);
    });

    recalculateAmountPaid();
}

function recalculateAmountPaid() {
    const itemsTotal = [...document.querySelectorAll(".pco-item-amount")]
        .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

    const discount = parseFloat(document.getElementById("pcoDiscount")?.value) || 0;
    const amountPaid = Math.max(0, itemsTotal - discount);

    const amountPaidInput = document.getElementById("pcoAmountPaid");
    if (amountPaidInput) amountPaidInput.value = amountPaid.toFixed(2);
}

async function saveCheckout() {
    const discount = parseFloat(document.getElementById("pcoDiscount").value) || 0;
    const amountPaid = parseFloat(document.getElementById("pcoAmountPaid").value) || 0;
    const postingDate = document.getElementById("pcoPostingDate").value;
    const paymentMethod = document.getElementById("pcoPaymentMethod").value;
    const paymentRef = document.getElementById("pcoPaymentRef").value.trim();

    if (amountPaid <= 0 && discount <= 0) {
        showToast("Enter an amount paid or a discount before saving.", "error");
        return;
    }

    if (!postingDate) {
        showToast("Posting date is required.", "error");
        return;
    }

    const itemsTotal = [...document.querySelectorAll(".pco-item-amount")]
        .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

    // Whatever's no longer covered by the (possibly edited) item amounts
    // plus the collected payment is recorded as a real ledger adjustment
    // -- e.g. a per-line correction or the discount -- rather than left
    // to silently vanish from the running balance.
    const adjustment = Math.max(0, (originalItemsTotal - itemsTotal)) + discount;

    const notesParts = [paymentMethod];
    if (paymentRef) notesParts.push(`Ref# ${paymentRef}`);

    const saveBtn = document.getElementById("pcoSaveBtn");
    saveBtn.disabled = true;

    const result = await api("/patient-ledger", {
        method: "POST",
        body: JSON.stringify({
            patient_id: currentPatientId,
            encounter_id: currentEncounter.id,
            payment_amount: amountPaid,
            adjustment_amount: adjustment,
            payment_date: postingDate,
            payment_type: paymentMethod.toUpperCase(),
            payer_type: "patient",
            notes: notesParts.join(" - ")
        })
    });

    saveBtn.disabled = false;

    if (!result.success) {
        showToast(result.message || "Failed to save checkout.", "error");
        return;
    }

    showToast("Checkout saved.", "success");
    closeCheckoutPopup();
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
