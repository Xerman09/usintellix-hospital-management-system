import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";

let currentPatientId = null;

function formatDob(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatTimestamp(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr.replace(" ", "T"));
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

async function lookupPatient() {
    const input = document.getElementById("ctPatientIdInput");
    const errorEl = document.getElementById("ctLookupError");
    const patientBox = document.getElementById("ctPatientBox");

    const identifier = input?.value.trim();

    if (errorEl) errorEl.style.display = "none";
    if (patientBox) patientBox.style.display = "none";
    currentPatientId = null;

    if (!identifier) {
        if (errorEl) {
            errorEl.textContent = "Enter a patient ID to look up.";
            errorEl.style.display = "block";
        }
        input?.focus();
        return;
    }

    const result = await api(`/chart-tracker/lookup?patient_id=${encodeURIComponent(identifier)}`);

    if (!result.success) {
        if (errorEl) {
            errorEl.textContent = result.message || "No patient found for that ID.";
            errorEl.style.display = "block";
        }
        return;
    }

    const data = result.data;
    currentPatientId = data.patient_id;

    document.getElementById("ctPatientNo").textContent = data.patient_no;
    document.getElementById("ctPatientName").textContent = `${data.last_name}, ${data.first_name}`;
    document.getElementById("ctPatientDob").textContent = formatDob(data.birthdate);
    document.getElementById("ctCurrentLocation").textContent = data.current_location;

    const destinationInput = document.getElementById("ctDestinationInput");
    if (destinationInput) destinationInput.value = "";

    const saveMsg = document.getElementById("ctSaveMsg");
    if (saveMsg) saveMsg.style.display = "none";

    if (patientBox) patientBox.style.display = "block";
}

async function saveCheckIn() {
    if (!currentPatientId) return;

    const destinationInput = document.getElementById("ctDestinationInput");
    const saveMsg = document.getElementById("ctSaveMsg");
    const destination = destinationInput?.value.trim();

    if (!destination) {
        if (saveMsg) {
            saveMsg.style.color = "#f87171";
            saveMsg.textContent = "Enter where the chart is being checked in to.";
            saveMsg.style.display = "block";
        }
        destinationInput?.focus();
        return;
    }

    const result = await api(`/chart-tracker/check-in`, {
        method: "POST",
        body: JSON.stringify({
            patient_id: currentPatientId,
            destination
        })
    });

    if (!result.success) {
        if (saveMsg) {
            saveMsg.style.color = "#f87171";
            saveMsg.textContent = result.message || "Failed to save the chart location.";
            saveMsg.style.display = "block";
        }
        return;
    }

    document.getElementById("ctCurrentLocation").textContent = result.data.current_location;
    if (destinationInput) destinationInput.value = "";

    if (saveMsg) {
        saveMsg.style.color = "#4ade80";
        saveMsg.textContent = `Saved. Checked in at ${formatTimestamp(result.data.last_moved_at)}.`;
        saveMsg.style.display = "block";
    }
}

export function initChartTracker() {
    currentPatientId = null;

    const lookupBtn = document.getElementById("ctLookupBtn");
    const patientIdInput = document.getElementById("ctPatientIdInput");
    const saveBtn = document.getElementById("ctSaveBtn");
    const destinationInput = document.getElementById("ctDestinationInput");

    lookupBtn?.addEventListener("click", lookupPatient);
    patientIdInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            lookupPatient();
        }
    });

    saveBtn?.addEventListener("click", saveCheckIn);
    destinationInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            saveCheckIn();
        }
    });

    // Auto-lookup active patient if available
    const activePatient = getLastActivePatientChart();
    if (activePatient && activePatient !== "null" && patientIdInput && !patientIdInput.value) {
        patientIdInput.value = activePatient;
        lookupPatient();
    }
}
