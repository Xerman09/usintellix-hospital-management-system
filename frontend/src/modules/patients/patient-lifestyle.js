import { showToast } from "../../core/toast.js";
import { fetchLifestyle, saveLifestyle } from "./patient-lifestyle.service.js";

export const LIFESTYLE_ITEMS = [
    { key: "tobacco", label: "Tobacco", hasStatus: true, isTobacco: true },
    { key: "coffee", label: "Coffee", hasStatus: true },
    { key: "alcohol", label: "Alcohol", hasStatus: true },
    { key: "recreational_drugs", label: "Recreational Drugs", hasStatus: true },
    { key: "counseling", label: "Counseling", hasStatus: true },
    { key: "exercise_patterns", label: "Exercise Patterns", hasStatus: true },
    { key: "hazardous_activities", label: "Hazardous Activities", hasStatus: true },
    { key: "sleep_patterns", label: "Sleep Patterns", hasStatus: false },
    { key: "seatbelt_use", label: "Seatbelt Use", hasStatus: false }
];

export const TOBACCO_STATUS_OPTIONS = [
    "Unassigned",
    "Current Every Day Smoker",
    "Current Some Day Smoker",
    "Former Smoker",
    "Never Smoker",
    "Smoker, Current Status Unknown",
    "Unknown If Ever Smoked",
    "Heavy Tobacco Smoker",
    "Light Tobacco Smoker"
];

const STATUS_LABELS = { current: "Current", quit: "Quit", never: "Never", na: "N/A" };

let currentPatientId = null;
let currentData = [];

export async function initLifestyle(patientId)
{
    currentPatientId = patientId;
    currentData = [];

    renderFields();
    renderLoading();

    const editBtn = document.getElementById("pdLifestyleEditBtn");

    editBtn.disabled = true;
    editBtn.addEventListener("click", enterEditMode);
    document.getElementById("pdLifestyleCancelBtn").addEventListener("click", exitEditMode);
    document.getElementById("pdLifestyleEdit").addEventListener("submit", handleSave);

    const result = await fetchLifestyle(patientId);

    currentData = result.success ? result.data : [];

    editBtn.disabled = false;
    renderView();
}

function renderLoading()
{
    document.getElementById("pdLifestyleViewContent").innerHTML = `
        <div class="pd-loading-inline">
            <span class="pd-loading-spinner"></span>
            Loading...
        </div>
    `;
}

function renderFields()
{
    const container = document.getElementById("pdLifestyleFields");

    container.innerHTML = LIFESTYLE_ITEMS.map((item) => `
        <div class="pd-life-row">
            <div class="pd-life-label">${escapeHtml(item.label)}:</div>
            <div class="pd-life-main">
                <input type="text" class="form-input pd-life-notes" id="pdLife_${item.key}_notes" placeholder="Notes">
                ${item.isTobacco ? `
                    <select class="form-input pd-life-tobacco-status" id="pdLife_${item.key}_tobacco_status">
                        ${TOBACCO_STATUS_OPTIONS.map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join("")}
                    </select>
                ` : ""}
                ${item.hasStatus ? `
                    <div class="pd-life-status">
                        <span class="pd-life-status-label">Status:</span>
                        <label class="pd-life-radio"><input type="radio" name="pdLifeStatus_${item.key}" value="current"> Current</label>
                        <label class="pd-life-radio"><input type="radio" name="pdLifeStatus_${item.key}" value="quit"> Quit</label>
                        <input type="text" class="form-input pd-life-quit-date" id="pdLife_${item.key}_quit_date" placeholder="Quit date">
                        <label class="pd-life-radio"><input type="radio" name="pdLifeStatus_${item.key}" value="never"> Never</label>
                        <label class="pd-life-radio"><input type="radio" name="pdLifeStatus_${item.key}" value="na"> N/A</label>
                    </div>
                ` : ""}
                ${item.isTobacco ? `
                    <div class="pd-life-pack-years">
                        <span>Cigarette pack-years (Number of packs per day multiplied by number of years smoked)</span>
                        <input type="text" class="form-input" id="pdLife_${item.key}_pack_years" placeholder="0">
                    </div>
                ` : ""}
            </div>
        </div>
    `).join("");
}

function renderView()
{
    const view = document.getElementById("pdLifestyleViewContent");
    const byKey = new Map(currentData.map((record) => [record.item_key, record]));

    const lines = [];

    LIFESTYLE_ITEMS.forEach((item) => {
        const record = byKey.get(item.key);

        if (!record) {
            return;
        }

        const parts = [];

        if (record.notes) {
            parts.push(escapeHtml(record.notes));
        }

        if (record.status) {
            const statusText = record.status === "quit" && record.quit_date
                ? `Quit (${escapeHtml(record.quit_date)})`
                : STATUS_LABELS[record.status] || record.status;

            parts.push(`Status: ${statusText}`);
        }

        if (item.isTobacco && record.tobacco_status && record.tobacco_status !== "Unassigned") {
            parts.push(escapeHtml(record.tobacco_status));
        }

        if (parts.length) {
            lines.push(`<div class="pd-gh-view-item">${escapeHtml(item.label)}: ${parts.join(" &middot; ")}</div>`);
        }
    });

    const tobaccoRecord = byKey.get("tobacco");

    lines.push(`<div class="pd-gh-view-item pd-life-pack-years-view">Cigarette Pack Years <strong>${escapeHtml(tobaccoRecord?.cigarette_pack_years || "0")}</strong></div>`);

    view.innerHTML = lines.length
        ? lines.join("")
        : `<p class="pd-chart-nav-empty">No lifestyle information recorded yet.</p>`;
}

function enterEditMode()
{
    const byKey = new Map(currentData.map((record) => [record.item_key, record]));

    LIFESTYLE_ITEMS.forEach((item) => {
        const record = byKey.get(item.key);

        document.getElementById(`pdLife_${item.key}_notes`).value = record?.notes || "";

        if (item.hasStatus) {
            const status = record?.status || "";
            const radio = status
                ? document.querySelector(`input[name="pdLifeStatus_${item.key}"][value="${status}"]`)
                : null;

            document.querySelectorAll(`input[name="pdLifeStatus_${item.key}"]`).forEach((input) => { input.checked = false; });

            if (radio) {
                radio.checked = true;
            }

            document.getElementById(`pdLife_${item.key}_quit_date`).value = record?.quit_date || "";
        }

        if (item.isTobacco) {
            document.getElementById(`pdLife_${item.key}_tobacco_status`).value = record?.tobacco_status || "Unassigned";
            document.getElementById(`pdLife_${item.key}_pack_years`).value = record?.cigarette_pack_years || "";
        }
    });

    document.getElementById("pdLifestyleView").style.display = "none";
    document.getElementById("pdLifestyleEdit").style.display = "block";
}

function exitEditMode()
{
    document.getElementById("pdLifestyleEdit").style.display = "none";
    document.getElementById("pdLifestyleView").style.display = "block";
}

async function handleSave(event)
{
    event.preventDefault();

    const entries = LIFESTYLE_ITEMS.map((item) => {
        const entry = {
            item_key: item.key,
            notes: document.getElementById(`pdLife_${item.key}_notes`).value.trim()
        };

        if (item.hasStatus) {
            const checkedRadio = document.querySelector(`input[name="pdLifeStatus_${item.key}"]:checked`);

            entry.status = checkedRadio ? checkedRadio.value : "";
            entry.quit_date = document.getElementById(`pdLife_${item.key}_quit_date`).value.trim();
        }

        if (item.isTobacco) {
            entry.tobacco_status = document.getElementById(`pdLife_${item.key}_tobacco_status`).value;
            entry.cigarette_pack_years = document.getElementById(`pdLife_${item.key}_pack_years`).value.trim();
        }

        return entry;
    });

    const result = await saveLifestyle(currentPatientId, entries);

    if (!result.success) {
        showToast(result.message || "Failed to save lifestyle.", "error");
        return;
    }

    const result2 = await fetchLifestyle(currentPatientId);

    currentData = result2.success ? result2.data : [];

    showToast("Lifestyle saved successfully.", "success");
    renderView();
    exitEditMode();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
