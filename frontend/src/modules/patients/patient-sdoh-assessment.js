import { showToast } from "../../core/toast.js";
import { fetchSdohAssessment, saveSdohAssessment } from "./patient-sdoh-assessment.service.js";

export const SDOH_ITEMS = [
    {
        key: "housing_stability", label: "Housing Stability", options: [
            { value: "stable", label: "Stable, no concerns" },
            { value: "worried", label: "Worried about losing housing" },
            { value: "unstable", label: "Homeless or unstably housed" }
        ]
    },
    {
        key: "housing_quality", label: "Housing Quality", options: [
            { value: "no_problems", label: "No problems" },
            { value: "some_problems", label: "Some problems (pests, mold, heat)" },
            { value: "significant_problems", label: "Significant problems" }
        ]
    },
    {
        key: "food_insecurity", label: "Food Insecurity", options: [
            { value: "never", label: "Never worried about food running out" },
            { value: "sometimes", label: "Sometimes worried" },
            { value: "often", label: "Often worried" }
        ]
    },
    {
        key: "transportation", label: "Transportation Barriers", options: [
            { value: "no_barriers", label: "No barriers" },
            { value: "occasional", label: "Occasional barriers" },
            { value: "frequent", label: "Frequent barriers" }
        ]
    },
    {
        key: "utilities", label: "Utility Needs", options: [
            { value: "no_risk", label: "No risk of shutoff" },
            { value: "at_risk", label: "At risk of shutoff" },
            { value: "shut_off", label: "Services already shut off" }
        ]
    },
    {
        key: "financial_strain", label: "Financial Strain", options: [
            { value: "not_hard", label: "Not hard at all" },
            { value: "somewhat_hard", label: "Somewhat hard" },
            { value: "very_hard", label: "Very hard" }
        ]
    },
    {
        key: "employment_status", label: "Employment Status", options: [
            { value: "employed", label: "Employed" },
            { value: "unemployed_looking", label: "Unemployed, looking" },
            { value: "unemployed_not_looking", label: "Unemployed, not looking" },
            { value: "unable_to_work", label: "Unable to work" },
            { value: "retired", label: "Retired" }
        ]
    },
    {
        key: "education_level", label: "Education Level", options: [
            { value: "less_than_hs", label: "Less than high school" },
            { value: "hs_or_ged", label: "High school / GED" },
            { value: "some_college", label: "Some college" },
            { value: "college_plus", label: "College graduate or higher" }
        ]
    },
    {
        key: "social_isolation", label: "Social Isolation / Support", options: [
            { value: "rarely", label: "Rarely feels isolated" },
            { value: "sometimes", label: "Sometimes feels isolated" },
            { value: "often", label: "Often feels isolated" }
        ]
    },
    {
        key: "interpersonal_safety", label: "Personal Safety at Home", options: [
            { value: "safe", label: "Feels safe" },
            { value: "some_concerns", label: "Some concerns" },
            { value: "significant_concerns", label: "Significant concerns" }
        ]
    },
    {
        key: "disability_adl", label: "Difficulty with Daily Activities", options: [
            { value: "no_difficulty", label: "No difficulty" },
            { value: "some_difficulty", label: "Some difficulty" },
            { value: "significant_difficulty", label: "Significant difficulty" }
        ]
    }
];

const OPTION_LABELS = SDOH_ITEMS.reduce((map, item) => {
    item.options.forEach((opt) => { map[`${item.key}:${opt.value}`] = opt.label; });
    return map;
}, {});

let currentPatientId = null;
let currentData = [];

export async function initSdohAssessment(patientId)
{
    currentPatientId = patientId;
    currentData = [];

    renderFields();
    renderLoading();

    const editBtn = document.getElementById("pdSdohAssessmentEditBtn");

    editBtn.disabled = true;
    editBtn.addEventListener("click", enterEditMode);
    document.getElementById("pdSdohAssessmentCancelBtn").addEventListener("click", exitEditMode);
    document.getElementById("pdSdohAssessmentEdit").addEventListener("submit", handleSave);

    const result = await fetchSdohAssessment(patientId);

    currentData = result.success ? result.data : [];

    editBtn.disabled = false;
    renderView();
}

function renderLoading()
{
    document.getElementById("pdSdohAssessmentViewContent").innerHTML = `
        <div class="pd-loading-inline">
            <span class="pd-loading-spinner"></span>
            Loading...
        </div>
    `;
}

function renderFields()
{
    const container = document.getElementById("pdSdohAssessmentFields");

    container.innerHTML = SDOH_ITEMS.map((item) => `
        <div class="pd-life-row">
            <div class="pd-life-label">${escapeHtml(item.label)}:</div>
            <div class="pd-life-main">
                <div class="pd-life-status">
                    ${item.options.map((opt) => `
                        <label class="pd-life-radio">
                            <input type="radio" name="pdSdoh_${item.key}" value="${escapeHtml(opt.value)}"> ${escapeHtml(opt.label)}
                        </label>
                    `).join("")}
                </div>
                <input type="text" class="form-input pd-life-notes" id="pdSdoh_${item.key}_notes" placeholder="Notes">
            </div>
        </div>
    `).join("");
}

function renderView()
{
    const view = document.getElementById("pdSdohAssessmentViewContent");
    const byKey = new Map(currentData.map((record) => [record.item_key, record]));

    const lines = [];

    SDOH_ITEMS.forEach((item) => {
        const record = byKey.get(item.key);

        if (!record) {
            return;
        }

        const parts = [];

        if (record.response_value) {
            parts.push(escapeHtml(OPTION_LABELS[`${item.key}:${record.response_value}`] || record.response_value));
        }

        if (record.notes) {
            parts.push(escapeHtml(record.notes));
        }

        if (parts.length) {
            lines.push(`<div class="pd-gh-view-item">${escapeHtml(item.label)}: ${parts.join(" &middot; ")}</div>`);
        }
    });

    view.innerHTML = lines.length
        ? lines.join("")
        : `<p class="pd-chart-nav-empty">No SDOH assessment recorded yet.</p>`;
}

function enterEditMode()
{
    const byKey = new Map(currentData.map((record) => [record.item_key, record]));

    SDOH_ITEMS.forEach((item) => {
        const record = byKey.get(item.key);

        document.querySelectorAll(`input[name="pdSdoh_${item.key}"]`).forEach((input) => { input.checked = false; });

        if (record?.response_value) {
            const radio = document.querySelector(`input[name="pdSdoh_${item.key}"][value="${record.response_value}"]`);

            if (radio) {
                radio.checked = true;
            }
        }

        document.getElementById(`pdSdoh_${item.key}_notes`).value = record?.notes || "";
    });

    document.getElementById("pdSdohAssessmentView").style.display = "none";
    document.getElementById("pdSdohAssessmentEdit").style.display = "block";
}

function exitEditMode()
{
    document.getElementById("pdSdohAssessmentEdit").style.display = "none";
    document.getElementById("pdSdohAssessmentView").style.display = "block";
}

async function handleSave(event)
{
    event.preventDefault();

    const entries = SDOH_ITEMS.map((item) => {
        const checkedRadio = document.querySelector(`input[name="pdSdoh_${item.key}"]:checked`);

        return {
            item_key: item.key,
            response_value: checkedRadio ? checkedRadio.value : "",
            notes: document.getElementById(`pdSdoh_${item.key}_notes`).value.trim()
        };
    });

    const result = await saveSdohAssessment(currentPatientId, entries);

    if (!result.success) {
        showToast(result.message || "Failed to save SDOH Assessment.", "error");
        return;
    }

    const result2 = await fetchSdohAssessment(currentPatientId);

    currentData = result2.success ? result2.data : [];

    showToast("SDOH Assessment saved successfully.", "success");
    renderView();
    exitEditMode();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
