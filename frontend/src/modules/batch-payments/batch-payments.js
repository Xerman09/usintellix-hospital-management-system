import {
    fetchBatchPayments, fetchBatchPayment, createBatchPayment, updateBatchPayment,
    deleteBatchPayment, setBatchPaymentGlobal, allocateBatchPayment, removeBatchPaymentAllocation
} from "./batch-payments.service.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchPatientEncounters } from "../encounters/encounters.service.js";
import { showToast } from "../../core/toast.js";

const HEADER_FIELDS = [
    "payment_date", "post_to_date", "payment_method", "check_number", "payment_amount",
    "paying_entity", "payment_category", "payment_from", "payor_id", "deposit_date", "description"
];

const PAYMENT_METHOD_LABELS = {
    check: "Check Payment", cash: "Cash", credit_card: "Credit Card", eft: "EFT / Direct Deposit", other: "Other"
};

let currentBatch = null;
let allPatients = null;
let selectedPatient = null;
let allocateEncounters = [];

export async function initBatchPayments() {
    document.querySelectorAll("[data-bp-tab]").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.getAttribute("data-bp-tab")));
    });

    document.getElementById("bpSaveBtn").addEventListener("click", saveBatch);
    document.getElementById("bpCancelBtn").addEventListener("click", resetForm);
    document.getElementById("bpDeleteBtn").addEventListener("click", deleteCurrentBatch);
    document.getElementById("bpAllocateToggleBtn").addEventListener("click", toggleAllocateCard);

    document.getElementById("bp_payment_amount").addEventListener("input", recomputeUndistributedLocal);

    document.getElementById("bpResetGlobalBtn").addEventListener("click", async () => {
        if (!currentBatch) return;
        await applyGlobal(0);
    });

    document.getElementById("bp_distributed_to_global").addEventListener("change", async (event) => {
        if (!currentBatch) return;
        await applyGlobal(parseFloat(event.target.value) || 0);
    });

    setupPatientSearch();

    document.getElementById("bpPatientSearchInput").addEventListener("focus", () => {
        renderPatientSearchResults(document.getElementById("bpPatientSearchInput").value.trim());
    });

    document.getElementById("bpAddAllocationBtn").addEventListener("click", addAllocation);

    document.getElementById("bpSearchBtn").addEventListener("click", runSearch);

    resetForm();
}

function switchTab(tab) {
    document.querySelectorAll("[data-bp-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-bp-tab") === tab);
    });

    document.querySelectorAll("[data-bp-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-bp-panel") === tab);
    });
}

function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="form-alert ${type}">${escapeHtml(message)}</div>`;
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function resetForm() {
    currentBatch = null;

    document.getElementById("bp_payment_date").value = todayIso();
    document.getElementById("bp_post_to_date").value = todayIso();
    document.getElementById("bp_payment_method").value = "check";
    document.getElementById("bp_check_number").value = "";
    document.getElementById("bp_payment_amount").value = "0.00";
    document.getElementById("bp_paying_entity").value = "insurance";
    document.getElementById("bp_payment_category").value = "Insurance Payment";
    document.getElementById("bp_payment_from").value = "";
    document.getElementById("bp_payor_id").value = "";
    document.getElementById("bp_deposit_date").value = "";
    document.getElementById("bp_description").value = "";
    document.getElementById("bp_distributed_to_global").value = "0.00";
    document.getElementById("bp_distributed_to_global").disabled = true;
    document.getElementById("bpUndistributedBox").textContent = "0.00";
    document.getElementById("bpFormAlert").innerHTML = "";
    document.getElementById("bpSaveBtn").textContent = "";
    document.getElementById("bpSaveBtn").innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Save Changes
    `;
    document.getElementById("bpDeleteBtn").style.display = "none";

    document.getElementById("bpAllocateToggleBtn").disabled = true;
    document.getElementById("bpAllocateToggleBtn").title = "Save the payment first";
    document.getElementById("bpAllocateCard").classList.remove("open");

    clearSelectedPatient();
    document.getElementById("bpAllocationsBody").innerHTML = `<tr><td colspan="6" class="bp-empty-state">No allocations yet.</td></tr>`;
    document.getElementById("bpAllocateSummary").innerHTML = "";
}

function recomputeUndistributedLocal() {
    const amount = parseFloat(document.getElementById("bp_payment_amount").value) || 0;
    const global = parseFloat(document.getElementById("bp_distributed_to_global").value) || 0;
    const distributedToPatients = currentBatch ? currentBatch.distributed_to_patients : 0;

    document.getElementById("bpUndistributedBox").textContent = formatCurrency(amount - global - distributedToPatients);
}

function readHeaderForm() {
    return {
        payment_date: document.getElementById("bp_payment_date").value,
        post_to_date: document.getElementById("bp_post_to_date").value,
        payment_method: document.getElementById("bp_payment_method").value,
        check_number: document.getElementById("bp_check_number").value.trim(),
        payment_amount: parseFloat(document.getElementById("bp_payment_amount").value) || 0,
        paying_entity: document.getElementById("bp_paying_entity").value,
        payment_category: document.getElementById("bp_payment_category").value,
        payment_from: document.getElementById("bp_payment_from").value.trim(),
        payor_id: document.getElementById("bp_payor_id").value.trim(),
        deposit_date: document.getElementById("bp_deposit_date").value,
        description: document.getElementById("bp_description").value.trim()
    };
}

async function saveBatch() {
    document.getElementById("bpFormAlert").innerHTML = "";

    const details = readHeaderForm();

    const result = currentBatch
        ? await updateBatchPayment(currentBatch.id, details)
        : await createBatchPayment(details);

    if (!result.success) {
        showAlert("bpFormAlert", result.message || "Failed to save the payment.", "error");
        return;
    }

    const id = currentBatch ? currentBatch.id : result.data.id;
    showToast("Payment saved successfully.", "success");
    await loadBatch(id);
}

async function loadBatch(id) {
    const result = await fetchBatchPayment(id);

    if (!result.success) {
        showAlert("bpFormAlert", result.message || "Failed to load the payment.", "error");
        return;
    }

    currentBatch = result.data;
    populateFormFromBatch(currentBatch);
}

function populateFormFromBatch(batch) {
    document.getElementById("bp_payment_date").value = (batch.payment_date || "").slice(0, 10);
    document.getElementById("bp_post_to_date").value = (batch.post_to_date || "").slice(0, 10);
    document.getElementById("bp_payment_method").value = batch.payment_method || "check";
    document.getElementById("bp_check_number").value = batch.check_number || "";
    document.getElementById("bp_payment_amount").value = Number(batch.payment_amount).toFixed(2);
    document.getElementById("bp_paying_entity").value = batch.paying_entity || "insurance";
    document.getElementById("bp_payment_category").value = batch.payment_category || "Insurance Payment";
    document.getElementById("bp_payment_from").value = batch.payment_from || "";
    document.getElementById("bp_payor_id").value = batch.payor_id || "";
    document.getElementById("bp_deposit_date").value = (batch.deposit_date || "").slice(0, 10);
    document.getElementById("bp_description").value = batch.description || "";
    document.getElementById("bp_distributed_to_global").value = Number(batch.distributed_to_global).toFixed(2);
    document.getElementById("bp_distributed_to_global").disabled = false;
    document.getElementById("bpUndistributedBox").textContent = formatCurrency(batch.undistributed);

    document.getElementById("bpSaveBtn").innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Update Changes
    `;
    document.getElementById("bpDeleteBtn").style.display = "inline-flex";

    document.getElementById("bpAllocateToggleBtn").disabled = false;
    document.getElementById("bpAllocateToggleBtn").title = "";

    renderAllocateSummary();
    renderAllocationsTable();
    switchTab("new");
}

async function applyGlobal(amount) {
    const result = await setBatchPaymentGlobal(currentBatch.id, amount);

    if (!result.success) {
        showAlert("bpFormAlert", result.message || "Failed to update.", "error");
        document.getElementById("bp_distributed_to_global").value = Number(currentBatch.distributed_to_global).toFixed(2);
        return;
    }

    await loadBatch(currentBatch.id);
}

async function deleteCurrentBatch() {
    if (!currentBatch) return;

    if (!confirm("Delete this payment?")) {
        return;
    }

    const result = await deleteBatchPayment(currentBatch.id);

    if (!result.success) {
        showAlert("bpFormAlert", result.message || "Failed to delete.", "error");
        return;
    }

    showToast("Payment deleted.", "success");
    resetForm();
}

function toggleAllocateCard() {
    if (!currentBatch) return;

    document.getElementById("bpAllocateCard").classList.toggle("open");
}

function renderAllocateSummary() {
    const summary = document.getElementById("bpAllocateSummary");

    summary.innerHTML = `
        <span>Payment Amount <strong>$${formatCurrency(currentBatch.payment_amount)}</strong></span>
        <span>Distributed to Global <strong>$${formatCurrency(currentBatch.distributed_to_global)}</strong></span>
        <span>Distributed to Patients <strong>$${formatCurrency(currentBatch.distributed_to_patients)}</strong></span>
        <span>Undistributed <strong>$${formatCurrency(currentBatch.undistributed)}</strong></span>
    `;
}

function renderAllocationsTable() {
    const tbody = document.getElementById("bpAllocationsBody");
    const allocations = currentBatch.allocations || [];

    if (!allocations.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="bp-empty-state">No allocations yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = allocations.map((a) => `
        <tr>
            <td>${escapeHtml(a.patient_name)} <span style="color:var(--text-muted); font-size:11.5px;">(${escapeHtml(a.patient_no || "")})</span></td>
            <td>${a.date_of_service ? escapeHtml(formatDate(a.date_of_service)) : `<span style="color:var(--text-muted);">Unapplied</span>`}</td>
            <td class="bp-money">$${formatCurrency(a.payment_amount)}</td>
            <td class="bp-money">$${formatCurrency(a.adjustment_amount)}</td>
            <td>${escapeHtml(a.notes || "")}</td>
            <td><button type="button" class="bp-icon-btn" data-remove-allocation="${a.id}" title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"></path></svg>
            </button></td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-remove-allocation]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const result = await removeBatchPaymentAllocation(btn.getAttribute("data-remove-allocation"));

            if (!result.success) {
                showAlert("bpAllocateAlert", result.message || "Failed to remove allocation.", "error");
                return;
            }

            await loadBatch(currentBatch.id);
        });
    });
}

function setupPatientSearch() {
    const input = document.getElementById("bpPatientSearchInput");

    input.addEventListener("input", () => renderPatientSearchResults(input.value.trim()));

    document.getElementById("bpClearSelectedPatient").addEventListener("click", clearSelectedPatient);

    document.addEventListener("click", (event) => {
        const wrap = document.querySelector(".bp-patient-search-wrap");
        if (wrap && !wrap.contains(event.target)) {
            document.getElementById("bpPatientSearchResults").classList.remove("open");
        }
    });
}

async function renderPatientSearchResults(term) {
    if (!allPatients) {
        const result = await fetchPatients();
        allPatients = result.success ? result.data : [];
    }

    const list = document.getElementById("bpPatientSearchResults");

    const filtered = term
        ? allPatients.filter((p) => {
            const name = `${p.first_name} ${p.last_name}`.toLowerCase();
            return name.includes(term.toLowerCase()) || (p.patient_no || "").toLowerCase().includes(term.toLowerCase());
        })
        : allPatients;

    if (!filtered.length) {
        list.innerHTML = `<div class="bp-patient-search-row">No matching patients.</div>`;
    } else {
        list.innerHTML = filtered.slice(0, 30).map((p) => `
            <div class="bp-patient-search-row" data-patient-id="${p.id}">
                <span>${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</span>
                <span style="color:var(--text-muted);">${escapeHtml(p.patient_no || "")}</span>
            </div>
        `).join("");
    }

    list.classList.add("open");

    list.querySelectorAll("[data-patient-id]").forEach((row) => {
        row.addEventListener("click", () => {
            const patient = allPatients.find((p) => String(p.id) === row.getAttribute("data-patient-id"));
            if (patient) selectPatient(patient);
            list.classList.remove("open");
        });
    });
}

async function selectPatient(patient) {
    selectedPatient = patient;

    document.getElementById("bpPatientSearchInput").style.display = "none";
    document.getElementById("bpSelectedPatientLabel").textContent = `${patient.last_name}, ${patient.first_name} (${patient.patient_no || ""})`;
    document.getElementById("bpSelectedPatientChip").classList.add("open");

    const encounterSelect = document.getElementById("bpAllocateEncounter");
    encounterSelect.innerHTML = `<option value="">-- Unapplied / patient balance --</option>`;

    const result = await fetchPatientEncounters(patient.id);
    allocateEncounters = result.success ? result.data : [];

    allocateEncounters.forEach((enc) => {
        const option = document.createElement("option");
        option.value = enc.id;
        option.textContent = `${(enc.date_of_service || "").slice(0, 10)} -- ${enc.reason || enc.visit_category_name || "Visit"}`;
        encounterSelect.appendChild(option);
    });
}

function clearSelectedPatient() {
    selectedPatient = null;
    allocateEncounters = [];

    document.getElementById("bpPatientSearchInput").value = "";
    document.getElementById("bpPatientSearchInput").style.display = "block";
    document.getElementById("bpSelectedPatientChip").classList.remove("open");
    document.getElementById("bpAllocateEncounter").innerHTML = `<option value="">-- Unapplied / patient balance --</option>`;
}

async function addAllocation() {
    document.getElementById("bpAllocateAlert").innerHTML = "";

    if (!selectedPatient) {
        showAlert("bpAllocateAlert", "Select a patient first.", "error");
        return;
    }

    const paymentAmount = parseFloat(document.getElementById("bpAllocatePaymentAmount").value) || 0;
    const adjustmentAmount = parseFloat(document.getElementById("bpAllocateAdjustmentAmount").value) || 0;

    if (paymentAmount <= 0 && adjustmentAmount <= 0) {
        showAlert("bpAllocateAlert", "Enter a payment or adjustment amount.", "error");
        return;
    }

    const result = await allocateBatchPayment(currentBatch.id, {
        patient_id: selectedPatient.id,
        encounter_id: document.getElementById("bpAllocateEncounter").value || null,
        payment_amount: paymentAmount,
        adjustment_amount: adjustmentAmount,
        notes: document.getElementById("bpAllocateNotes").value.trim()
    });

    if (!result.success) {
        showAlert("bpAllocateAlert", result.message || "Failed to allocate.", "error");
        return;
    }

    document.getElementById("bpAllocatePaymentAmount").value = "0.00";
    document.getElementById("bpAllocateAdjustmentAmount").value = "0.00";
    document.getElementById("bpAllocateNotes").value = "";
    clearSelectedPatient();

    showToast("Allocated successfully.", "success");
    await loadBatch(currentBatch.id);
}

async function runSearch() {
    const tbody = document.getElementById("bpSearchResultsBody");
    tbody.innerHTML = `<tr><td colspan="7" class="bp-empty-state">Loading...</td></tr>`;

    const result = await fetchBatchPayments({
        from: document.getElementById("bpSearchFrom").value,
        to: document.getElementById("bpSearchTo").value,
        payment_method: document.getElementById("bpSearchMethod").value,
        check_number: document.getElementById("bpSearchCheckNumber").value.trim(),
        payment_from: document.getElementById("bpSearchPaymentFrom").value.trim()
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="bp-empty-state">Failed to load payments.</td></tr>`;
        return;
    }

    renderSearchResults(result.data || []);
}

function renderSearchResults(rows) {
    const tbody = document.getElementById("bpSearchResultsBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="bp-empty-state">No payments match your search.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr class="bp-clickable" data-batch-id="${row.id}">
            <td>${escapeHtml(formatDate(row.payment_date))}</td>
            <td>${escapeHtml(PAYMENT_METHOD_LABELS[row.payment_method] || row.payment_method)}</td>
            <td>${escapeHtml(row.check_number || "-")}</td>
            <td>${escapeHtml(row.payment_from || "-")}</td>
            <td class="bp-money">$${formatCurrency(row.payment_amount)}</td>
            <td class="bp-money">$${formatCurrency(row.distributed_to_patients + row.distributed_to_global)}</td>
            <td class="bp-money">$${formatCurrency(row.undistributed)}</td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-batch-id]").forEach((tr) => {
        tr.addEventListener("click", () => loadBatch(Number(tr.getAttribute("data-batch-id"))));
    });
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
