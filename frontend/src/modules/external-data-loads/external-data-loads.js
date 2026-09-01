import { showToast } from "../../core/toast.js";
import { fetchExternalDataLoads, stageExternalDataFile, upgradeExternalDataSet } from "../codes/codes.service.js";

const HELP_TEXT = {
    ICD10: "Download the CMS ICD-10-CM/PCS order files (or PCS codes file) as a .zip, or a .csv in this system's generic import format, then stage it below.",
    RXNORM: "Download the RxNorm full monthly release .zip from the National Library of Medicine's RxNorm site (requires a free UMLS account), then stage it below. The installer automatically locates RXNCONSO.RRF inside the archive.",
    SNOMED: "Download a SNOMED CT release as a .zip, or a .csv in this system's generic import format, then stage it below.",
    CQM_VALUESET: "Download the CQM Valueset release as a .zip, or a .csv in this system's generic import format, then stage it below."
};

let sectionsData = [];

export async function initExternalDataLoads()
{
    document.querySelectorAll("[data-toggle]").forEach((header) => {
        header.addEventListener("click", () => toggleSection(header.dataset.toggle));
    });

    await loadOverview();
}

function toggleSection(key)
{
    document.querySelectorAll(".edl-section").forEach((section) => {
        section.classList.toggle("open", section.dataset.key === key);
    });
}

async function loadOverview()
{
    const result = await fetchExternalDataLoads();

    if (!result.success) {
        showToast(result.message || "Failed to load external data load status.", "error");
        return;
    }

    sectionsData = result.data || [];
    sectionsData.forEach(renderSection);
}

function renderSection(section)
{
    renderInstalledPanel(section);
    renderStagedPanel(section);
}

function renderInstalledPanel(section)
{
    const el = document.getElementById(`edlInstalled_${section.section_key}`);

    if (!el) return;

    if (!section.installed) {
        el.innerHTML = `<h3>Installed Release</h3><p class="edl-empty">Not installed</p>`;
        return;
    }

    const installed = section.installed;

    el.innerHTML = `
        <h3>Installed Release</h3>
        <div class="edl-installed-row"><strong>Name:</strong><span>${escapeHtml(installed.release_label)}</span></div>
        <div class="edl-installed-row"><strong>Revision:</strong><span>${escapeHtml(installed.revision || "-")}</span></div>
        <div class="edl-installed-row"><strong>Release Date:</strong><span>${escapeHtml(installed.release_date || "-")}</span></div>
    `;
}

function renderStagedPanel(section)
{
    const el = document.getElementById(`edlStaged_${section.section_key}`);

    if (!el) return;

    const staged = section.staged || [];
    const isInstalled = !!section.installed;

    const stagedListHtml = staged.length
        ? staged.map((file) => `
            <div class="edl-staged-item">
                <span class="edl-staged-filename">${escapeHtml(file.filename)}</span>
                <p class="edl-staged-note">
                    ${isInstalled
                        ? `${escapeHtml(file.filename)} is a more recent version of the following database: ${escapeHtml(section.label)}`
                        : `${escapeHtml(file.filename)} is staged for installation.`}
                </p>
                <button type="button" class="edl-upgrade-btn" data-upgrade="${section.section_key}" data-filename="${escapeHtml(file.filename)}">UPGRADE</button>
            </div>
        `).join("")
        : `
            <p class="edl-empty">No files staged for installation</p>
            <p class="edl-help-note">${escapeHtml(HELP_TEXT[section.section_key] || "")}</p>
        `;

    el.innerHTML = `
        <h3>Staged Releases</h3>
        ${stagedListHtml}
        <div class="edl-stage-form">
            <input type="file" id="edlFile_${section.section_key}" accept=".zip,.rrf,.csv,.txt">
            <button type="button" class="edl-stage-btn" data-stage="${section.section_key}">Stage a file</button>
        </div>
    `;

    el.querySelectorAll("[data-upgrade]").forEach((btn) => {
        btn.addEventListener("click", () => handleUpgrade(section.section_key, btn.dataset.filename));
    });

    const stageBtn = el.querySelector("[data-stage]");

    if (stageBtn) {
        stageBtn.addEventListener("click", () => handleStage(section.section_key));
    }
}

async function handleStage(sectionKey)
{
    const fileInput = document.getElementById(`edlFile_${sectionKey}`);
    const alertEl = document.getElementById(`edlAlert_${sectionKey}`);

    alertEl.innerHTML = "";

    if (!fileInput.files.length) {
        alertEl.innerHTML = `<div class="form-alert error">Please choose a file to stage.</div>`;
        return;
    }

    const stageBtn = document.querySelector(`[data-stage="${sectionKey}"]`);
    stageBtn.disabled = true;
    stageBtn.textContent = "Staging...";

    const result = await stageExternalDataFile(sectionKey, fileInput.files[0]);

    if (!result.success) {
        alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to stage file.")}</div>`;
        stageBtn.disabled = false;
        stageBtn.textContent = "Stage a file";
        return;
    }

    showToast(result.message, "success");
    await refreshSection(sectionKey);
}

async function handleUpgrade(sectionKey, filename)
{
    const alertEl = document.getElementById(`edlAlert_${sectionKey}`);
    alertEl.innerHTML = "";

    const btn = document.querySelector(`[data-upgrade="${sectionKey}"][data-filename="${cssEscape(filename)}"]`);

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Installing... please wait";
    }

    const result = await upgradeExternalDataSet(sectionKey, filename);

    if (!result.success) {
        alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to install code set.")}</div>`;
        if (btn) {
            btn.disabled = false;
            btn.textContent = "UPGRADE";
        }
        return;
    }

    showToast(result.message, "success");
    await refreshSection(sectionKey);
}

async function refreshSection(sectionKey)
{
    const result = await fetchExternalDataLoads();

    if (!result.success) {
        return;
    }

    sectionsData = result.data || [];
    const section = sectionsData.find((item) => item.section_key === sectionKey);

    if (section) {
        renderSection(section);
    }
}

function cssEscape(value)
{
    return String(value).replace(/(["\\])/g, "\\$1");
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
