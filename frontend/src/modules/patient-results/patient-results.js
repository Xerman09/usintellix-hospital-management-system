import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { ProcedureOrderConfigsView } from "../procedure-order-configs/procedure-order-configs.view.js";
import { initProcedureOrderConfigs } from "../procedure-order-configs/procedure-order-configs.js";
import {
    fetchPatientProcedureOrders,
    createPatientProcedureOrder,
    updatePatientProcedureOrder,
    fetchPatientProcedureResults,
    savePatientProcedureResults
} from "./patient-results.service.js";

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "collected", label: "Collected" },
    { value: "resulted", label: "Resulted" },
    { value: "reviewed", label: "Reviewed" },
    { value: "cancelled", label: "Cancelled" }
];

let currentPatientId = null;

export async function initPatientResults()
{
    const user = getUser();

    if (!user) {
        window.location.hash = "#/dashboard";
        return;
    }

    const container = document.getElementById("ptResOrders");
    const orderBtn = document.getElementById("ptResOrderBtn");
    const patientNo = getLastActivePatientChart();

    if (!patientNo || patientNo === "null") {
        container.innerHTML = emptyState("No active patient chart", "Open a patient's chart first, then come back to Patient Results.");
        orderBtn.disabled = true;
        return;
    }

    const patientsResult = await fetchPatients();
    const patient = patientsResult.success ? patientsResult.data.find((p) => p.patient_no === patientNo) : null;

    if (!patient) {
        container.innerHTML = emptyState("Patient not found", "The active patient chart could not be resolved.");
        orderBtn.disabled = true;
        return;
    }

    currentPatientId = patient.id;

    await Promise.all([loadProviders(), loadVendors()]);
    wireOrderModal();

    document.getElementById("ptResRefreshBtn").addEventListener("click", () => loadOrders());
    orderBtn.addEventListener("click", openOrderModal);

    await loadOrders();
}

async function loadProviders()
{
    const select = document.getElementById("ptResProviderSelect");
    const result = await fetchProviders();
    const providers = result.success ? result.data : [];

    select.innerHTML = `<option value="">-- None --</option>`
        + providers.map((p) => `<option value="${p.id}">${escapeHtml([p.first_name, p.last_name].filter(Boolean).join(" "))}</option>`).join("");
}

async function loadVendors()
{
    const select = document.getElementById("ptResVendorSelect");
    const result = await fetchFacilities();
    const vendors = result.success ? result.data.filter((facility) => facility.facility_npi) : [];

    select.innerHTML = `<option value="">-- None (This Facility) --</option>`
        + vendors.map((v) => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join("");
}

function wireOrderModal()
{
    const modalOverlay = document.getElementById("ptResOrderModalOverlay");
    const pickerOverlay = document.getElementById("ptResPickerModalOverlay");
    const pickerContent = document.getElementById("ptResPickerContent");
    const procedureInput = document.getElementById("ptResProcedureInput");
    const procedureIdInput = document.getElementById("ptResProcedureId");
    const form = document.getElementById("ptResOrderForm");

    procedureInput.addEventListener("click", () => {
        pickerContent.innerHTML = ProcedureOrderConfigsView();

        initProcedureOrderConfigs({
            onSelect: (item) => {
                procedureInput.value = item.name;
                procedureIdInput.value = item.id;
                pickerOverlay.classList.remove("open");
            }
        });

        pickerOverlay.classList.add("open");
    });

    document.getElementById("ptResPickerClose").addEventListener("click", () => {
        pickerOverlay.classList.remove("open");
    });

    pickerOverlay.addEventListener("click", (event) => {
        if (event.target === pickerOverlay) {
            pickerOverlay.classList.remove("open");
        }
    });

    document.getElementById("ptResOrderModalClose").addEventListener("click", closeOrderModal);
    document.getElementById("ptResOrderCancelBtn").addEventListener("click", closeOrderModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeOrderModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearOrderFormErrors();

        const data = {
            patient_id: currentPatientId,
            procedure_order_config_id: procedureIdInput.value,
            provider_id: document.getElementById("ptResProviderSelect").value || null,
            vendor_facility_id: document.getElementById("ptResVendorSelect").value || null,
            order_date: document.getElementById("ptResOrderDate").value,
            specimen: document.getElementById("ptResSpecimen").value.trim() || null
        };

        const result = await createPatientProcedureOrder(data);

        if (!result.success) {
            showOrderFormAlert(result.message || "Failed to place order.");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const el = document.getElementById(`err-${field}`);

                    if (el) el.textContent = message;
                });
            }

            return;
        }

        closeOrderModal();
        showToast("Procedure ordered successfully.", "success");
        await loadOrders();
    });
}

function openOrderModal()
{
    document.getElementById("ptResOrderForm").reset();
    document.getElementById("ptResProcedureId").value = "";
    clearOrderFormErrors();
    document.getElementById("ptResOrderFormAlert").innerHTML = "";
    document.getElementById("ptResOrderDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("ptResOrderModalOverlay").classList.add("open");
}

function closeOrderModal()
{
    document.getElementById("ptResOrderModalOverlay").classList.remove("open");
}

function clearOrderFormErrors()
{
    document.querySelectorAll("#ptResOrderForm .form-error").forEach((el) => { el.textContent = ""; });
}

function showOrderFormAlert(message)
{
    document.getElementById("ptResOrderFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
}

async function loadOrders()
{
    const container = document.getElementById("ptResOrders");

    container.innerHTML = `<div class="pt-res-loading">Loading...</div>`;

    const result = await fetchPatientProcedureOrders(currentPatientId);

    if (!result.success) {
        container.innerHTML = emptyState("Failed to load", result.message || "Could not load procedure orders.");
        return;
    }

    const orders = result.data || [];

    if (!orders.length) {
        container.innerHTML = emptyState("No procedure orders yet", "Use \"Order Procedure\" to place the first order for this patient.");
        return;
    }

    const resultLists = await Promise.all(orders.map((order) => fetchPatientProcedureResults(order.id)));

    container.innerHTML = orders
        .map((order, index) => renderOrderCard(order, resultLists[index].success ? resultLists[index].data : []))
        .join("");

    wireOrderCards();
}

function renderOrderCard(order, results)
{
    const providerName = [order.provider_first_name, order.provider_last_name].filter(Boolean).join(" ") || "—";

    return `
    <div class="pt-res-card" data-order-id="${order.id}">
        <table class="pt-res-order-table">
            <thead>
                <tr class="pt-res-group-row">
                    <th colspan="3">Order</th>
                    <th colspan="3">Report</th>
                </tr>
                <tr class="pt-res-col-row">
                    <th>Date</th><th>Procedure Name</th><th>Reported</th>
                    <th>Ext Time Collected</th><th>Specimen</th><th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${escapeHtml(order.order_date || "")}</td>
                    <td>
                        <strong>${escapeHtml(order.procedure_name || "")}</strong>
                        ${order.identifying_code ? `<div class="pt-res-subtext">${escapeHtml(order.identifying_code)}</div>` : ""}
                        <div class="pt-res-subtext">Provider: ${escapeHtml(providerName)}</div>
                    </td>
                    <td>${order.reported_at ? escapeHtml(order.reported_at) : "—"}</td>
                    <td><input type="datetime-local" class="pt-res-input" data-field="ext_time_collected" value="${toDatetimeLocal(order.ext_time_collected)}"></td>
                    <td><input type="text" class="pt-res-input" data-field="specimen" value="${escapeHtml(order.specimen || "")}"></td>
                    <td>
                        <select class="pt-res-input" data-field="status">
                            ${STATUS_OPTIONS.map((opt) => `<option value="${opt.value}" ${order.status === opt.value ? "selected" : ""}>${opt.label}</option>`).join("")}
                        </select>
                    </td>
                </tr>
            </tbody>
        </table>

        <table class="pt-res-results-table">
            <thead>
                <tr class="pt-res-group-row"><th colspan="9">Results and Recommendations</th></tr>
                <tr class="pt-res-col-row">
                    <th>Code</th><th>Name</th><th>Date</th><th>End Date</th><th>Abn</th><th>Value</th><th>Units</th><th>Range</th><th></th>
                </tr>
            </thead>
            <tbody class="pt-res-results-body">
                ${results.map((r) => renderResultRow(r)).join("")}
            </tbody>
        </table>

        <div class="pt-res-card-actions">
            <button type="button" class="pt-res-add-row-btn">+ Add Result Row</button>
            <button type="button" class="pt-res-save-btn">Save</button>
        </div>
    </div>
    `;
}

function renderResultRow(r = {})
{
    return `
    <tr class="pt-res-result-row">
        <td><input type="text" class="pt-res-cell-input" data-field="code" value="${escapeHtml(r.code || "")}"></td>
        <td><input type="text" class="pt-res-cell-input" data-field="name" value="${escapeHtml(r.name || "")}" placeholder="Result name"></td>
        <td><input type="date" class="pt-res-cell-input" data-field="result_date" value="${r.result_date || ""}"></td>
        <td><input type="date" class="pt-res-cell-input" data-field="end_date" value="${r.end_date || ""}"></td>
        <td class="pt-res-abn-cell"><input type="checkbox" data-field="is_abnormal" ${Number(r.is_abnormal) ? "checked" : ""}></td>
        <td><input type="text" class="pt-res-cell-input" data-field="value" value="${escapeHtml(r.value || "")}"></td>
        <td><input type="text" class="pt-res-cell-input" data-field="units" value="${escapeHtml(r.units || "")}"></td>
        <td><input type="text" class="pt-res-cell-input" data-field="reference_range" value="${escapeHtml(r.reference_range || "")}"></td>
        <td><button type="button" class="pt-res-remove-row-btn" title="Remove row">&times;</button></td>
    </tr>
    `;
}

function wireOrderCards()
{
    document.querySelectorAll(".pt-res-card").forEach((card) => {
        const orderId = card.dataset.orderId;
        const resultsBody = card.querySelector(".pt-res-results-body");

        card.querySelector(".pt-res-add-row-btn").addEventListener("click", () => {
            resultsBody.insertAdjacentHTML("beforeend", renderResultRow());
            wireRemoveButtons(resultsBody);
        });

        card.querySelector(".pt-res-save-btn").addEventListener("click", () => saveOrderCard(orderId, card));

        wireRemoveButtons(resultsBody);
    });
}

function wireRemoveButtons(resultsBody)
{
    resultsBody.querySelectorAll(".pt-res-remove-row-btn").forEach((btn) => {
        btn.onclick = () => btn.closest("tr").remove();
    });
}

async function saveOrderCard(orderId, card)
{
    const saveBtn = card.querySelector(".pt-res-save-btn");

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const extTimeCollected = card.querySelector('[data-field="ext_time_collected"]').value;
    const specimen = card.querySelector('[data-field="specimen"]').value.trim();
    const status = card.querySelector('[data-field="status"]').value;

    const orderUpdate = await updatePatientProcedureOrder(orderId, {
        ext_time_collected: extTimeCollected ? `${extTimeCollected.replace("T", " ")}:00` : "",
        specimen,
        status
    });

    if (!orderUpdate.success) {
        showToast(orderUpdate.message || "Failed to update order.", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
        return;
    }

    const rows = [...card.querySelectorAll(".pt-res-result-row")]
        .map((row) => ({
            code: row.querySelector('[data-field="code"]').value.trim() || null,
            name: row.querySelector('[data-field="name"]').value.trim(),
            result_date: row.querySelector('[data-field="result_date"]').value || null,
            end_date: row.querySelector('[data-field="end_date"]').value || null,
            is_abnormal: row.querySelector('[data-field="is_abnormal"]').checked,
            value: row.querySelector('[data-field="value"]').value.trim() || null,
            units: row.querySelector('[data-field="units"]').value.trim() || null,
            reference_range: row.querySelector('[data-field="reference_range"]').value.trim() || null
        }))
        .filter((row) => row.name);

    const resultsSave = await savePatientProcedureResults(orderId, rows);

    saveBtn.disabled = false;
    saveBtn.textContent = "Save";

    if (!resultsSave.success) {
        showToast(resultsSave.message || "Failed to save results.", "error");
        return;
    }

    showToast("Results saved successfully.", "success");
    await loadOrders();
}

function toDatetimeLocal(value)
{
    if (!value) return "";

    return value.replace(" ", "T").slice(0, 16);
}

function emptyState(title, message)
{
    return `
    <div class="pt-res-empty">
        <div class="pt-res-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
        </div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
    </div>
    `;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
