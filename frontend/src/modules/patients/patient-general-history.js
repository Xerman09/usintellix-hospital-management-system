import { showToast } from "../../core/toast.js";
import { fetchGeneralHistory, saveGeneralHistory } from "./patient-general-history.service.js";

export const RISK_FACTORS = [
    { key: "varicose_veins", label: "Varicose Veins" },
    { key: "hypertension", label: "Hypertension" },
    { key: "diabetes", label: "Diabetes" },
    { key: "sickle_cell", label: "Sickle Cell" },
    { key: "fibroids", label: "Fibroids" },
    { key: "pid", label: "PID (Pelvic Inflammatory Disease)" },
    { key: "severe_migraine", label: "Severe Migraine" },
    { key: "heart_disease", label: "Heart Disease" },
    { key: "thrombosis_stroke", label: "Thrombosis/Stroke" },
    { key: "hepatitis", label: "Hepatitis" },
    { key: "gall_bladder_condition", label: "Gall Bladder Condition" },
    { key: "breast_disease", label: "Breast Disease" },
    { key: "depression", label: "Depression" },
    { key: "allergies", label: "Allergies" },
    { key: "infertility", label: "Infertility" },
    { key: "asthma", label: "Asthma" },
    { key: "epilepsy", label: "Epilepsy" },
    { key: "contact_lenses", label: "Contact Lenses" },
    { key: "contraceptive_complication", label: "Contraceptive Complication", specify: true },
    { key: "other", label: "Other", specify: true }
];

export const EXAMS = [
    { key: "breast_exam", label: "Breast Exam" },
    { key: "cardiac_echo", label: "Cardiac Echo" },
    { key: "ecg", label: "ECG" },
    { key: "gynecological_exam", label: "Gynecological Exam" },
    { key: "mammogram", label: "Mammogram" },
    { key: "physical_exam", label: "Physical Exam" },
    { key: "prostate_exam", label: "Prostate Exam" },
    { key: "rectal_exam", label: "Rectal Exam" },
    { key: "sigmoid_colonoscopy", label: "Sigmoid/Colonoscopy" },
    { key: "retinal_exam", label: "Retinal Exam" },
    { key: "flu_vaccination", label: "Flu Vaccination" },
    { key: "pneumonia_vaccination", label: "Pneumonia Vaccination" },
    { key: "ldl", label: "LDL" },
    { key: "hemoglobin", label: "Hemoglobin" },
    { key: "psa", label: "PSA" }
];

const STATUS_LABELS = { na: "N/A", normal: "Normal", abnormal: "Abnormal" };

let currentPatientId = null;
let currentData = { risk_factors: [], exams: [] };

export async function initGeneralHistory(patientId)
{
    currentPatientId = patientId;
    currentData = { risk_factors: [], exams: [] };

    renderChecklist();
    renderExamRows();
    renderLoading();

    const editBtn = document.getElementById("pdGeneralHistoryEditBtn");

    editBtn.disabled = true;
    editBtn.addEventListener("click", enterEditMode);
    document.getElementById("pdGeneralHistoryCancelBtn").addEventListener("click", exitEditMode);
    document.getElementById("pdGeneralHistoryEdit").addEventListener("submit", handleSave);

    const result = await fetchGeneralHistory(patientId);

    currentData = result.success ? result.data : { risk_factors: [], exams: [] };

    editBtn.disabled = false;
    renderView();
}

function renderLoading()
{
    const loadingHtml = `
        <div class="pd-loading-inline">
            <span class="pd-loading-spinner"></span>
            Loading...
        </div>
    `;

    document.getElementById("pdGeneralHistoryRiskFactorsView").innerHTML = loadingHtml;
    document.getElementById("pdGeneralHistoryExamsView").innerHTML = loadingHtml;
}

function renderChecklist()
{
    const container = document.getElementById("pdGeneralHistoryRiskFactorsEdit");

    container.innerHTML = RISK_FACTORS.map((riskFactor) => `
        <label class="pd-gh-check">
            <input type="checkbox" data-risk-factor-key="${riskFactor.key}">
            <span>${escapeHtml(riskFactor.label)}${riskFactor.specify ? " (specify)" : ""}</span>
            ${riskFactor.specify ? `<input type="text" class="pd-gh-specify-input" data-risk-factor-specify="${riskFactor.key}" placeholder="Specify..." style="display: none;">` : ""}
        </label>
    `).join("");

    container.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const key = checkbox.getAttribute("data-risk-factor-key");
            const specifyInput = container.querySelector(`[data-risk-factor-specify="${key}"]`);

            if (specifyInput) {
                specifyInput.style.display = checkbox.checked ? "inline-block" : "none";

                if (!checkbox.checked) {
                    specifyInput.value = "";
                }
            }
        });
    });
}

function renderExamRows()
{
    const tbody = document.getElementById("pdGeneralHistoryExamsEdit");

    tbody.innerHTML = EXAMS.map((exam) => `
        <tr>
            <td>${escapeHtml(exam.label)}</td>
            <td class="pd-gh-radio-cell"><input type="radio" name="pdGhExamStatus_${exam.key}" value="na" checked></td>
            <td class="pd-gh-radio-cell"><input type="radio" name="pdGhExamStatus_${exam.key}" value="normal"></td>
            <td class="pd-gh-radio-cell"><input type="radio" name="pdGhExamStatus_${exam.key}" value="abnormal"></td>
            <td><input type="text" class="form-input pd-gh-exam-notes" data-exam-notes="${exam.key}" placeholder="Date/Notes"></td>
        </tr>
    `).join("");
}

function renderView()
{
    const riskFactorsView = document.getElementById("pdGeneralHistoryRiskFactorsView");
    const examsView = document.getElementById("pdGeneralHistoryExamsView");
    if (!riskFactorsView || !examsView) return;

    const selectedRiskFactors = RISK_FACTORS.filter((riskFactor) =>
        currentData.risk_factors.some((record) => record.risk_factor_key === riskFactor.key));

    riskFactorsView.innerHTML = selectedRiskFactors.length
        ? selectedRiskFactors.map((riskFactor) => {
            const record = currentData.risk_factors.find((r) => r.risk_factor_key === riskFactor.key);
            const specify = record?.specify_text ? ` (${escapeHtml(record.specify_text)})` : "";

            return `<div class="pd-gh-view-item">${escapeHtml(riskFactor.label)}${specify}</div>`;
        }).join("")
        : `<p class="pd-chart-nav-empty">No risk factors recorded yet.</p>`;

    const recordedExams = currentData.exams.filter((record) => record.status !== "na" || record.notes);

    examsView.innerHTML = recordedExams.length
        ? recordedExams.map((record) => {
            const exam = EXAMS.find((item) => item.key === record.exam_key);
            const label = exam ? exam.label : record.exam_key;
            const notes = record.notes ? ` &mdash; ${escapeHtml(record.notes)}` : "";

            return `<div class="pd-gh-view-item">${escapeHtml(label)}: <strong>${STATUS_LABELS[record.status] || record.status}</strong>${notes}</div>`;
        }).join("")
        : `<p class="pd-chart-nav-empty">No exams or tests recorded yet.</p>`;
}

function enterEditMode()
{
    const selected = new Map(currentData.risk_factors.map((record) => [record.risk_factor_key, record.specify_text]));

    document.querySelectorAll("#pdGeneralHistoryRiskFactorsEdit input[type=checkbox]").forEach((checkbox) => {
        const key = checkbox.getAttribute("data-risk-factor-key");
        const isChecked = selected.has(key);

        checkbox.checked = isChecked;

        const specifyInput = document.querySelector(`[data-risk-factor-specify="${key}"]`);

        if (specifyInput) {
            specifyInput.style.display = isChecked ? "inline-block" : "none";
            specifyInput.value = isChecked ? (selected.get(key) || "") : "";
        }
    });

    const examsByKey = new Map(currentData.exams.map((record) => [record.exam_key, record]));

    EXAMS.forEach((exam) => {
        const record = examsByKey.get(exam.key);
        const status = record?.status || "na";
        const radio = document.querySelector(`input[name="pdGhExamStatus_${exam.key}"][value="${status}"]`);

        if (radio) {
            radio.checked = true;
        }

        const notesInput = document.querySelector(`[data-exam-notes="${exam.key}"]`);

        if (notesInput) {
            notesInput.value = record?.notes || "";
        }
    });

    document.getElementById("pdGeneralHistoryView").style.display = "none";
    document.getElementById("pdGeneralHistoryEdit").style.display = "block";
}

function exitEditMode()
{
    document.getElementById("pdGeneralHistoryEdit").style.display = "none";
    document.getElementById("pdGeneralHistoryView").style.display = "block";
}

async function handleSave(event)
{
    event.preventDefault();

    const riskFactors = [];

    document.querySelectorAll("#pdGeneralHistoryRiskFactorsEdit input[type=checkbox]:checked").forEach((checkbox) => {
        const key = checkbox.getAttribute("data-risk-factor-key");
        const specifyInput = document.querySelector(`[data-risk-factor-specify="${key}"]`);

        riskFactors.push({
            key,
            specify_text: specifyInput ? specifyInput.value.trim() : ""
        });
    });

    const exams = EXAMS.map((exam) => {
        const checkedRadio = document.querySelector(`input[name="pdGhExamStatus_${exam.key}"]:checked`);
        const notesInput = document.querySelector(`[data-exam-notes="${exam.key}"]`);

        return {
            key: exam.key,
            status: checkedRadio ? checkedRadio.value : "na",
            notes: notesInput ? notesInput.value.trim() : ""
        };
    });

    const result = await saveGeneralHistory(currentPatientId, riskFactors, exams);

    if (!result.success) {
        showToast(result.message || "Failed to save general history.", "error");
        return;
    }

    currentData = {
        risk_factors: riskFactors.map((rf) => ({ risk_factor_key: rf.key, specify_text: rf.specify_text || null })),
        exams: exams.map((exam) => ({ exam_key: exam.key, status: exam.status, notes: exam.notes || null }))
    };

    showToast("General history saved successfully.", "success");
    renderView();
    exitEditMode();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
