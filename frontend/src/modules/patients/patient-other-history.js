import { showToast } from "../../core/toast.js";
import { fetchOtherHistory, saveOtherHistory } from "./patient-other-history.service.js";

let currentPatientId = null;
let currentData = { name_1: null, value_1: null, name_2: null, value_2: null, additional_history: null };

export async function initOtherHistory(patientId)
{
    currentPatientId = patientId;
    currentData = { name_1: null, value_1: null, name_2: null, value_2: null, additional_history: null };

    renderLoading();

    const editBtn = document.getElementById("pdOtherHistoryEditBtn");

    editBtn.disabled = true;
    editBtn.addEventListener("click", enterEditMode);
    document.getElementById("pdOtherHistoryCancelBtn").addEventListener("click", exitEditMode);
    document.getElementById("pdOtherHistoryEdit").addEventListener("submit", handleSave);

    const result = await fetchOtherHistory(patientId);

    currentData = result.success ? result.data : currentData;

    editBtn.disabled = false;
    renderView();
}

function renderLoading()
{
    document.getElementById("pdOtherHistoryViewContent").innerHTML = `
        <div class="pd-loading-inline">
            <span class="pd-loading-spinner"></span>
            Loading...
        </div>
    `;
}

function renderView()
{
    const view = document.getElementById("pdOtherHistoryViewContent");
    const lines = [];

    if (currentData.name_1 || currentData.value_1) {
        lines.push(`<div class="pd-gh-view-item">${escapeHtml(currentData.name_1 || "Name/Value")}: ${escapeHtml(currentData.value_1 || "")}</div>`);
    }

    if (currentData.name_2 || currentData.value_2) {
        lines.push(`<div class="pd-gh-view-item">${escapeHtml(currentData.name_2 || "Name/Value")}: ${escapeHtml(currentData.value_2 || "")}</div>`);
    }

    if (currentData.additional_history) {
        lines.push(`<div class="pd-gh-view-item"><strong>Additional History:</strong> ${escapeHtml(currentData.additional_history)}</div>`);
    }

    view.innerHTML = lines.length
        ? lines.join("")
        : `<p class="pd-chart-nav-empty">No additional information recorded yet.</p>`;
}

function enterEditMode()
{
    document.getElementById("pdOther_name_1").value = currentData.name_1 || "";
    document.getElementById("pdOther_value_1").value = currentData.value_1 || "";
    document.getElementById("pdOther_name_2").value = currentData.name_2 || "";
    document.getElementById("pdOther_value_2").value = currentData.value_2 || "";
    document.getElementById("pdOther_additional_history").value = currentData.additional_history || "";

    document.getElementById("pdOtherHistoryView").style.display = "none";
    document.getElementById("pdOtherHistoryEdit").style.display = "block";
}

function exitEditMode()
{
    document.getElementById("pdOtherHistoryEdit").style.display = "none";
    document.getElementById("pdOtherHistoryView").style.display = "block";
}

async function handleSave(event)
{
    event.preventDefault();

    const data = {
        name_1: document.getElementById("pdOther_name_1").value.trim(),
        value_1: document.getElementById("pdOther_value_1").value.trim(),
        name_2: document.getElementById("pdOther_name_2").value.trim(),
        value_2: document.getElementById("pdOther_value_2").value.trim(),
        additional_history: document.getElementById("pdOther_additional_history").value.trim()
    };

    const result = await saveOtherHistory(currentPatientId, data);

    if (!result.success) {
        showToast(result.message || "Failed to save other history.", "error");
        return;
    }

    currentData = {
        name_1: data.name_1 || null,
        value_1: data.value_1 || null,
        name_2: data.name_2 || null,
        value_2: data.value_2 || null,
        additional_history: data.additional_history || null
    };

    showToast("Other history saved successfully.", "success");
    renderView();
    exitEditMode();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
