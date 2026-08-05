import { showToast } from "../../core/toast.js";
import { fetchFamilyHistory, saveFamilyHistory } from "./patient-family-history.service.js";
import { openCodePicker } from "./code-picker.js";

export const RELATIONS = [
    { key: "father", label: "Father" },
    { key: "mother", label: "Mother" },
    { key: "siblings", label: "Siblings" },
    { key: "spouse", label: "Spouse" },
    { key: "offspring", label: "Offspring" }
];

let currentPatientId = null;

export async function initFamilyHistory(patientId)
{
    currentPatientId = patientId;

    renderRows();

    document.getElementById("pdFamilyHistoryForm").addEventListener("submit", handleSave);

    const result = await fetchFamilyHistory(patientId);
    const entries = result.success ? result.data : [];

    populateRows(entries);
}

function renderRows()
{
    const container = document.getElementById("pdFamilyHistoryRows");

    container.innerHTML = RELATIONS.map((relation) => `
        <div class="pd-fh-row">
            <div class="pd-fh-cell pd-fh-cell-label">${escapeHtml(relation.label)}:</div>
            <div class="pd-fh-cell">
                <input type="text" class="form-input" id="pdFh_${relation.key}_description" placeholder="Notes">
            </div>
            <div class="pd-fh-cell pd-fh-cell-label">Diagnosis Code:</div>
            <div class="pd-fh-cell pd-fh-code-cell">
                <input type="text" class="form-input pd-fh-code-input" id="pdFh_${relation.key}_code" readonly placeholder="Click to select a code" data-relation="${relation.key}">
                <input type="hidden" id="pdFh_${relation.key}_code_value">
                <input type="hidden" id="pdFh_${relation.key}_code_description">
            </div>
        </div>
    `).join("");

    container.querySelectorAll(".pd-fh-code-input").forEach((input) => {
        input.addEventListener("click", () => {
            const relationKey = input.getAttribute("data-relation");

            openCodePicker({
                defaultType: "ICD10",
                onSelect: ({ code, description }) => {
                    document.getElementById(`pdFh_${relationKey}_code_value`).value = code;
                    document.getElementById(`pdFh_${relationKey}_code_description`).value = description;
                    input.value = `${code} - ${description}`;
                }
            });
        });
    });
}

function populateRows(entries)
{
    RELATIONS.forEach((relation) => {
        const entry = entries.find((item) => item.relation_key === relation.key);

        document.getElementById(`pdFh_${relation.key}_description`).value = entry?.description || "";

        const code = entry?.diagnosis_code || "";
        const codeDescription = entry?.diagnosis_code_description || "";

        document.getElementById(`pdFh_${relation.key}_code_value`).value = code;
        document.getElementById(`pdFh_${relation.key}_code_description`).value = codeDescription;
        document.getElementById(`pdFh_${relation.key}_code`).value = code ? `${code} - ${codeDescription}` : "";
    });
}

async function handleSave(event)
{
    event.preventDefault();

    const entries = RELATIONS.map((relation) => ({
        relation_key: relation.key,
        description: document.getElementById(`pdFh_${relation.key}_description`).value.trim(),
        diagnosis_code: document.getElementById(`pdFh_${relation.key}_code_value`).value.trim(),
        diagnosis_code_description: document.getElementById(`pdFh_${relation.key}_code_description`).value.trim()
    }));

    const result = await saveFamilyHistory(currentPatientId, entries);

    if (!result.success) {
        showToast(result.message || "Failed to save family history.", "error");
        return;
    }

    showToast("Family history saved successfully.", "success");
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
