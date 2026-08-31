import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { fetchPatients } from "../patients/patients.service.js";
import { validatePatientMerge, mergePatients } from "./patient-merge.service.js";

let patients = [];
let selected = { target: null, source: null };
let activePickerRole = null;
let pendingDedupe = false;

export async function initPatientMerge()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    selected = { target: null, source: null };

    const result = await fetchPatients();
    patients = result.success ? result.data : [];

    wirePicker();
    wireConfirmModal();

    document.getElementById("pmTargetInput").addEventListener("click", () => openPicker("target"));
    document.getElementById("pmSourceInput").addEventListener("click", () => openPicker("source"));

    document.getElementById("pmMergeBtn").addEventListener("click", () => openConfirm(false));
    document.getElementById("pmMergeDedupeBtn").addEventListener("click", () => openConfirm(true));
}

function wirePicker()
{
    const overlay = document.getElementById("pmPickerModalOverlay");
    const searchInput = document.getElementById("pmPickerSearch");

    document.getElementById("pmPickerClose").addEventListener("click", closePicker);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closePicker();
    });

    searchInput.addEventListener("input", () => renderPickerList(searchInput.value));
}

function openPicker(role)
{
    activePickerRole = role;
    document.getElementById("pmPickerTitle").textContent = role === "target" ? "Select Target Patient" : "Select Source Patient";
    document.getElementById("pmPickerSearch").value = "";
    renderPickerList("");
    document.getElementById("pmPickerModalOverlay").classList.add("open");
    document.getElementById("pmPickerSearch").focus();
}

function closePicker()
{
    document.getElementById("pmPickerModalOverlay").classList.remove("open");
    activePickerRole = null;
}

function renderPickerList(searchTerm)
{
    const list = document.getElementById("pmPickerList");
    const needle = searchTerm.trim().toLowerCase();

    const otherRole = activePickerRole === "target" ? "source" : "target";
    const excludedId = selected[otherRole]?.id ?? null;

    const filtered = patients.filter((patient) => {
        if (!needle) return true;
        const haystack = `${patient.first_name} ${patient.last_name} ${patient.patient_no}`.toLowerCase();
        return haystack.includes(needle);
    });

    if (!filtered.length) {
        list.innerHTML = `<div class="pm-picker-empty">No matching patients.</div>`;
        return;
    }

    list.innerHTML = filtered.map((patient) => {
        const isExcluded = patient.id === excludedId;
        return `
            <div class="pm-picker-item ${isExcluded ? "disabled" : ""}" data-id="${patient.id}">
                <span class="pm-picker-name">${escapeHtml(`${patient.last_name}, ${patient.first_name}`)}</span>
                <span class="pm-picker-meta">${escapeHtml(patient.patient_no)} &bull; DOB ${escapeHtml(patient.birthdate || "-")}${isExcluded ? " &bull; already selected as the other chart" : ""}</span>
            </div>
        `;
    }).join("");

    list.querySelectorAll(".pm-picker-item:not(.disabled)").forEach((item) => {
        item.addEventListener("click", () => {
            const patient = patients.find((p) => String(p.id) === item.dataset.id);
            selectPatient(activePickerRole, patient);
            closePicker();
        });
    });
}

async function selectPatient(role, patient)
{
    selected[role] = patient;

    const input = document.getElementById(role === "target" ? "pmTargetInput" : "pmSourceInput");
    input.textContent = `${patient.last_name}, ${patient.first_name} (${patient.patient_no})`;
    input.classList.add("selected");

    document.getElementById("pmFormAlert").innerHTML = "";

    await refreshMergeAvailability();
}

async function refreshMergeAvailability()
{
    const mergeBtn = document.getElementById("pmMergeBtn");
    const dedupeBtn = document.getElementById("pmMergeDedupeBtn");

    if (!selected.target || !selected.source) {
        mergeBtn.disabled = true;
        dedupeBtn.disabled = true;
        return;
    }

    const result = await validatePatientMerge(selected.target.id, selected.source.id);

    if (!result.success) {
        mergeBtn.disabled = true;
        dedupeBtn.disabled = true;
        showFormAlert(result.message || "This pair cannot be merged.", result.errors);
        return;
    }

    document.getElementById("pmFormAlert").innerHTML = "";
    mergeBtn.disabled = false;
    dedupeBtn.disabled = false;
}

function showFormAlert(message, errors)
{
    const detail = errors ? Object.values(errors).filter(Boolean).join(" ") : "";
    document.getElementById("pmFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(detail || message)}</div>`;
}

function wireConfirmModal()
{
    const overlay = document.getElementById("pmConfirmModalOverlay");

    document.getElementById("pmConfirmClose").addEventListener("click", closeConfirm);
    document.getElementById("pmConfirmCancelBtn").addEventListener("click", closeConfirm);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeConfirm();
    });

    document.getElementById("pmConfirmProceedBtn").addEventListener("click", proceedMerge);
}

function openConfirm(dedupe)
{
    pendingDedupe = dedupe;

    document.getElementById("pmConfirmSummary").innerHTML = `
        <div><strong>Target (kept):</strong> ${escapeHtml(`${selected.target.last_name}, ${selected.target.first_name}`)} (${escapeHtml(selected.target.patient_no)})</div>
        <div><strong>Source (deleted after merge):</strong> ${escapeHtml(`${selected.source.last_name}, ${selected.source.first_name}`)} (${escapeHtml(selected.source.patient_no)})</div>
        <div><strong>Encounter deduplication:</strong> ${dedupe ? "Yes" : "No"}</div>
    `;

    document.getElementById("pmConfirmModalOverlay").classList.add("open");
}

function closeConfirm()
{
    document.getElementById("pmConfirmModalOverlay").classList.remove("open");
}

async function proceedMerge()
{
    const proceedBtn = document.getElementById("pmConfirmProceedBtn");
    proceedBtn.disabled = true;
    proceedBtn.textContent = "Merging...";

    const result = await mergePatients(selected.target.id, selected.source.id, pendingDedupe);

    proceedBtn.disabled = false;
    proceedBtn.textContent = "Yes, Merge Patients";

    if (!result.success) {
        closeConfirm();
        showFormAlert(result.message || "Failed to merge patients.", result.errors);
        showToast(result.message || "Failed to merge patients.", "error");
        return;
    }

    closeConfirm();
    showToast(result.message || "Patients merged successfully.", "success");

    selected = { target: null, source: null };
    resetPickerInputs();

    patients = patients.filter((p) => p.id !== result.data.source_patient_id);
}

function resetPickerInputs()
{
    const targetInput = document.getElementById("pmTargetInput");
    const sourceInput = document.getElementById("pmSourceInput");

    targetInput.textContent = "(Click to select)";
    targetInput.classList.remove("selected");

    sourceInput.textContent = "Click to select";
    sourceInput.classList.remove("selected");

    document.getElementById("pmMergeBtn").disabled = true;
    document.getElementById("pmMergeDedupeBtn").disabled = true;
    document.getElementById("pmFormAlert").innerHTML = "";
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
