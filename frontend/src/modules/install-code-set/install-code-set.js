import { showToast } from "../../core/toast.js";
import { installCodeSet } from "../codes/codes.service.js";

export async function initInstallCodeSet()
{
    document.getElementById("icsSubmitBtn").addEventListener("click", handleSubmit);
}

async function handleSubmit()
{
    const codeType = document.getElementById("icsCodeType").value;
    const fileInput = document.getElementById("icsFile");
    const replaceEntireSet = document.getElementById("icsReplace").checked;
    const resultsEl = document.getElementById("icsResults");

    document.getElementById("icsAlert").innerHTML = "";
    resultsEl.style.display = "none";
    resultsEl.innerHTML = "";

    if (!codeType) {
        showAlert("Please select a code type.", "error");
        return;
    }

    if (!fileInput.files.length) {
        showAlert("Please choose a source file to upload.", "error");
        return;
    }

    const submitBtn = document.getElementById("icsSubmitBtn");
    const originalLabel = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.textContent = "Installing... please wait";

    const result = await installCodeSet(codeType, fileInput.files[0], replaceEntireSet);

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalLabel;

    if (!result.success) {
        showAlert(result.message || "Failed to install code set.", "error");
        return;
    }

    showToast(result.message, "success");

    const inserted = result.data?.inserted ?? 0;
    const skipped = result.data?.skipped ?? [];
    const replacedCount = result.data?.replaced_count ?? 0;

    resultsEl.style.display = "";
    resultsEl.innerHTML = `
        ${replacedCount ? `<p>${replacedCount} existing code(s) of this type were removed before installing.</p>` : ""}
        <p>${inserted} code(s) installed.</p>
        ${skipped.length ? `
            <p>${skipped.length} row(s) skipped:</p>
            <ul>${skipped.map((row) => `<li>${escapeHtml(row)}</li>`).join("")}</ul>
        ` : ""}
    `;

    fileInput.value = "";
}

function showAlert(message, type)
{
    document.getElementById("icsAlert").innerHTML = `<div class="form-alert ${type}">${escapeHtml(message)}</div>`;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
