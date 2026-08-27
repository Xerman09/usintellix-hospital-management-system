import { showToast } from "../../core/toast.js";
import { fetchRelativesHistory, saveRelativesHistory } from "./patient-relatives-history.service.js";

export const CONDITIONS = [
    { key: "cancer", label: "Cancer" },
    { key: "diabetes", label: "Diabetes" },
    { key: "heart_problems", label: "Heart Problems" },
    { key: "epilepsy", label: "Epilepsy" },
    { key: "suicide", label: "Suicide" },
    { key: "tuberculosis", label: "Tuberculosis" },
    { key: "high_blood_pressure", label: "High Blood Pressure" },
    { key: "stroke", label: "Stroke" },
    { key: "mental_illness", label: "Mental Illness" }
];

let currentPatientId = null;
let currentData = [];

export async function initRelativesHistory(patientId)
{
    currentPatientId = patientId;
    currentData = [];

    renderFields();
    renderLoading();

    const editBtn = document.getElementById("pdRelativesHistoryEditBtn");

    editBtn.disabled = true;
    editBtn.addEventListener("click", enterEditMode);
    document.getElementById("pdRelativesHistoryCancelBtn").addEventListener("click", exitEditMode);
    document.getElementById("pdRelativesHistoryEdit").addEventListener("submit", handleSave);

    const result = await fetchRelativesHistory(patientId);

    currentData = result.success ? result.data : [];

    editBtn.disabled = false;
    renderView();
}

function renderLoading()
{
    document.getElementById("pdRelativesHistoryViewContent").innerHTML = `
        <div class="pd-loading-inline">
            <span class="pd-loading-spinner"></span>
            Loading...
        </div>
    `;
}

function renderFields()
{
    const container = document.getElementById("pdRelativesHistoryFields");

    container.innerHTML = CONDITIONS.map((condition) => `
        <div class="pd-rel-row">
            <div class="pd-rel-label">${escapeHtml(condition.label)}:</div>
            <input type="text" class="form-input" id="pdRel_${condition.key}" placeholder="Notes">
        </div>
    `).join("");
}

function renderView()
{
    const view = document.getElementById("pdRelativesHistoryViewContent");
    if (!view) return;

    const recorded = CONDITIONS.filter((condition) =>
        currentData.some((record) => record.condition_key === condition.key));

    view.innerHTML = recorded.length
        ? recorded.map((condition) => {
            const record = currentData.find((r) => r.condition_key === condition.key);

            return `<div class="pd-gh-view-item">${escapeHtml(condition.label)}: ${escapeHtml(record.notes || "")}</div>`;
        }).join("")
        : `<p class="pd-chart-nav-empty">No relatives' conditions recorded yet.</p>`;
}

function enterEditMode()
{
    CONDITIONS.forEach((condition) => {
        const record = currentData.find((item) => item.condition_key === condition.key);

        document.getElementById(`pdRel_${condition.key}`).value = record?.notes || "";
    });

    document.getElementById("pdRelativesHistoryView").style.display = "none";
    document.getElementById("pdRelativesHistoryEdit").style.display = "block";
}

function exitEditMode()
{
    document.getElementById("pdRelativesHistoryEdit").style.display = "none";
    document.getElementById("pdRelativesHistoryView").style.display = "block";
}

async function handleSave(event)
{
    event.preventDefault();

    const entries = CONDITIONS.map((condition) => ({
        condition_key: condition.key,
        notes: document.getElementById(`pdRel_${condition.key}`).value.trim()
    }));

    const result = await saveRelativesHistory(currentPatientId, entries);

    if (!result.success) {
        showToast(result.message || "Failed to save relatives history.", "error");
        return;
    }

    currentData = entries
        .filter((entry) => entry.notes !== "")
        .map((entry) => ({ condition_key: entry.condition_key, notes: entry.notes }));

    showToast("Relatives history saved successfully.", "success");
    renderView();
    exitEditMode();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
