import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { fetchDuplicateGroups, dismissDuplicateGroup } from "./patient-duplicates.service.js";
import { mergePatients } from "../patient-merge/patient-merge.service.js";

let groups = [];
let pendingMerge = null;

export async function initPatientDuplicates()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    document.getElementById("pd2RecalcBtn").addEventListener("click", loadGroups);
    document.getElementById("pd2PrintBtn").addEventListener("click", () => window.print());
    document.getElementById("pd2ExportBtn").addEventListener("click", exportSpreadsheet);

    wireConfirmModal();

    await loadGroups();
}

async function loadGroups()
{
    const tbody = document.getElementById("pd2TableBody");
    tbody.innerHTML = `<tr><td colspan="12" class="pd2-loading">Loading...</td></tr>`;
    document.getElementById("pd2FormAlert").innerHTML = "";

    const result = await fetchDuplicateGroups();

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="12" class="pd2-loading">${escapeHtml(result.message || "Failed to load duplicate groups.")}</td></tr>`;
        return;
    }

    groups = result.data || [];
    renderGroups();
}

function renderGroups()
{
    const tbody = document.getElementById("pd2TableBody");

    if (!groups.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12">
                    <div class="pd2-empty-state">
                        <div class="pd2-empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                        </div>
                        <strong>No duplicate patients found</strong>
                        <p>Every active patient chart has a unique name and date of birth.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = groups.map((group) => renderGroup(group)).join(`<tr class="pd2-group-spacer"><td colspan="12"></td></tr>`);

    wireGroupRows();
}

function renderGroup(group)
{
    const rows = group.patients.map((patient) => `
        <tr class="${patient.suggested_scope === "merge_to" ? "pd2-row-to" : "pd2-row-from"}" data-group-key="${escapeHtml(group.group_key)}" data-patient-id="${patient.id}">
            <td>
                <select class="pd2-actions-select" data-role-select>
                    <option value="">-- Select --</option>
                    <option value="merge_to" ${patient.suggested_scope === "merge_to" ? "selected" : ""}>Merge To (Target)</option>
                    <option value="merge_from" ${patient.suggested_scope === "merge_from" ? "selected" : ""}>Merge From (Source)</option>
                </select>
            </td>
            <td class="pd2-score">${group.score}</td>
            <td class="pd2-pid">${patient.id}</td>
            <td class="pd2-pid">${escapeHtml(patient.patient_no)}</td>
            <td data-scope-label>${patient.suggested_scope === "merge_to" ? "Merge To" : "Merge From"}</td>
            <td>${escapeHtml(patient.name)}</td>
            <td>${escapeHtml(patient.birthdate || "")}</td>
            <td>${escapeHtml(capitalize(patient.sex))}</td>
            <td>${escapeHtml(patient.email || "")}</td>
            <td>${escapeHtml(patient.phone || "")}</td>
            <td>${escapeHtml(patient.registered || "")}</td>
            <td>${escapeHtml(patient.address || "")}</td>
        </tr>
    `).join("");

    const footer = `
        <tr class="pd2-group-footer" data-group-key="${escapeHtml(group.group_key)}">
            <td colspan="12">
                <button type="button" class="pd2-group-btn merge" data-merge-group="${escapeHtml(group.group_key)}">Merge Selected</button>
                <button type="button" class="pd2-group-btn dismiss" data-dismiss-group="${escapeHtml(group.group_key)}">Not a Duplicate</button>
            </td>
        </tr>
    `;

    return rows + footer;
}

function wireGroupRows()
{
    document.querySelectorAll("tr[data-group-key][data-patient-id]").forEach((row) => {
        const select = row.querySelector("[data-role-select]");
        const label = row.querySelector("[data-scope-label]");

        select.addEventListener("change", () => {
            label.textContent = select.value === "merge_to" ? "Merge To" : select.value === "merge_from" ? "Merge From" : "-";
            row.classList.toggle("pd2-row-to", select.value === "merge_to");
            row.classList.toggle("pd2-row-from", select.value === "merge_from");
        });
    });

    document.querySelectorAll("[data-merge-group]").forEach((btn) => {
        btn.addEventListener("click", () => openMergeConfirm(btn.dataset.mergeGroup));
    });

    document.querySelectorAll("[data-dismiss-group]").forEach((btn) => {
        btn.addEventListener("click", () => handleDismiss(btn.dataset.dismissGroup));
    });
}

function openMergeConfirm(groupKey)
{
    const rows = [...document.querySelectorAll(`tr[data-group-key="${cssEscape(groupKey)}"][data-patient-id]`)];
    const group = groups.find((g) => g.group_key === groupKey);

    const targets = rows.filter((row) => row.querySelector("[data-role-select]").value === "merge_to");
    const sources = rows.filter((row) => row.querySelector("[data-role-select]").value === "merge_from");

    if (targets.length !== 1) {
        showFormAlert("Select exactly one \"Merge To (Target)\" chart for this group before merging.");
        return;
    }

    if (!sources.length) {
        showFormAlert("Select at least one \"Merge From (Source)\" chart for this group before merging.");
        return;
    }

    document.getElementById("pd2FormAlert").innerHTML = "";

    const targetId = Number(targets[0].dataset.patientId);
    const sourceIds = sources.map((row) => Number(row.dataset.patientId));

    const targetPatient = group.patients.find((p) => p.id === targetId);
    const sourcePatients = group.patients.filter((p) => sourceIds.includes(p.id));

    pendingMerge = { targetId, sourceIds };

    document.getElementById("pd2ConfirmSummary").innerHTML = `
        <div><strong>Target (kept):</strong> ${escapeHtml(targetPatient.name)} (${escapeHtml(targetPatient.patient_no)})</div>
        <div><strong>Sources (deleted after merge):</strong> ${sourcePatients.map((p) => `${escapeHtml(p.name)} (${escapeHtml(p.patient_no)})`).join(", ")}</div>
    `;

    document.getElementById("pd2ConfirmModalOverlay").classList.add("open");
}

function wireConfirmModal()
{
    const overlay = document.getElementById("pd2ConfirmModalOverlay");

    document.getElementById("pd2ConfirmClose").addEventListener("click", closeConfirm);
    document.getElementById("pd2ConfirmCancelBtn").addEventListener("click", closeConfirm);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeConfirm();
    });

    document.getElementById("pd2ConfirmProceedBtn").addEventListener("click", proceedMerge);
}

function closeConfirm()
{
    document.getElementById("pd2ConfirmModalOverlay").classList.remove("open");
    pendingMerge = null;
}

async function proceedMerge()
{
    if (!pendingMerge) return;

    const proceedBtn = document.getElementById("pd2ConfirmProceedBtn");
    proceedBtn.disabled = true;
    proceedBtn.textContent = "Merging...";

    const { targetId, sourceIds } = pendingMerge;
    let mergedCount = 0;

    for (const sourceId of sourceIds) {
        const result = await mergePatients(targetId, sourceId, false);

        if (!result.success) {
            proceedBtn.disabled = false;
            proceedBtn.textContent = "Yes, Merge Patients";
            closeConfirm();
            showToast(`Merged ${mergedCount} of ${sourceIds.length} chart(s), then failed: ${result.message || "Unknown error."}`, "error");
            await loadGroups();
            return;
        }

        mergedCount++;
    }

    proceedBtn.disabled = false;
    proceedBtn.textContent = "Yes, Merge Patients";
    closeConfirm();
    showToast(`Merged ${mergedCount} chart(s) successfully.`, "success");

    await loadGroups();
}

async function handleDismiss(groupKey)
{
    const result = await dismissDuplicateGroup(groupKey);

    if (!result.success) {
        showToast(result.message || "Failed to dismiss group.", "error");
        return;
    }

    showToast("Marked as not a duplicate.", "success");
    groups = groups.filter((g) => g.group_key !== groupKey);
    renderGroups();
}

function exportSpreadsheet()
{
    if (!groups.length) {
        showToast("There's nothing to export.", "error");
        return;
    }

    const header = ["Score", "Pid", "Public", "Scope", "Name", "DOB", "Gender", "Email", "Telephone", "Registered", "Address"];
    const lines = [header.join(",")];

    groups.forEach((group) => {
        group.patients.forEach((patient) => {
            const scope = patient.suggested_scope === "merge_to" ? "Merge To" : "Merge From";
            const row = [
                group.score, patient.id, patient.patient_no, scope, patient.name,
                patient.birthdate || "", capitalize(patient.sex), patient.email || "",
                patient.phone || "", patient.registered || "", patient.address || ""
            ];
            lines.push(row.map(csvCell).join(","));
        });
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `duplicate-patients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function csvCell(value)
{
    const str = String(value ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function showFormAlert(message)
{
    document.getElementById("pd2FormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
}

function capitalize(value)
{
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function cssEscape(value)
{
    return value.replace(/["\\]/g, "\\$&");
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
