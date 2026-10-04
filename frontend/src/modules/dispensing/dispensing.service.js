import { api } from "../../core/api.js";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};

/** filters: view (to_fill | partial | expired | dispensed | closed | all), q? */
export async function fetchDispensingQueue(filters) {
    return api(`/dispensing${query(filters)}`);
}

export async function fetchDispensingDetail(prescriptionId) {
    return api(`/dispensing/show${query({ id: prescriptionId })}`);
}

export async function fetchDispensingOptions() {
    return api("/dispensing/options");
}

/** data: prescription_id, warehouse_id, notes?, items: [{prescription_item_id, quantity, lot_id?}] */
export async function dispensePrescription(data) {
    return api("/dispensing", { method: "POST", body: JSON.stringify(data) });
}

export async function voidDispense(dispenseId, reason) {
    return api("/dispensing/void", { method: "POST", body: JSON.stringify({ id: dispenseId, reason }) });
}

export async function closePrescription(prescriptionId, reason) {
    return api("/dispensing/close", { method: "POST", body: JSON.stringify({ id: prescriptionId, reason }) });
}

export async function declineRefillRequest(requestId, reason) {
    return api("/dispensing/refill-decline", { method: "POST", body: JSON.stringify({ id: requestId, reason }) });
}

/** The second check of a high-alert dispensing: {confirmed, notes?} */
export async function checkDispense(dispenseId, data) {
    return api("/dispensing/check", { method: "POST", body: JSON.stringify({ id: dispenseId, ...data }) });
}

export async function recordDispensePayment(dispenseId, payment) {
    return api("/dispensing/payment", { method: "POST", body: JSON.stringify({ id: dispenseId, ...payment }) });
}

export async function fetchChargeSlip(dispenseId) {
    return api(`/dispensing/charge-slip${query({ id: dispenseId })}`);
}

export async function fetchDispenseLabels(dispenseId) {
    return api(`/dispensing/labels${query({ id: dispenseId })}`);
}
