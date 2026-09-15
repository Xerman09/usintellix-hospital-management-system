import {
    searchBillingWorklist, fetchBillingCriteriaOptions,
    markEncountersCleared, reopenEncounters, updateEncounterX12Status
} from "./billing-manager.service.js";
import { fetchPatients } from "../patients/patients.service.js";
import { openPatientChartTab, openFeeSheetForEncounter } from "../patients/patients-list.js?v=54";
import { showToast } from "../../core/toast.js";

const CRITERIA_LABELS = {
    date_of_service: "Date of Service",
    date_of_entry: "Date of Entry",
    billing_status: "Billing Status",
    claim_type: "Claim Type",
    patient_name: "Patient Name",
    patient_id: "Patient Id",
    insurance: "Insurance Company",
    encounter: "Encounter",
    provider: "Provider",
    facility: "Facility"
};

const BILL_STATUS_LABELS = { unassigned: "Unassigned", cleared: "Cleared" };
const X12_STATUS_LABELS = { unassigned: "Unassigned", sent: "Sent", accepted: "Accepted", rejected: "Rejected" };

let criteriaOptions = { providers: [], facilities: [], insurances: [] };
let currentCriteria = [];
let activeCriteriaType = null;
let allPatients = null;

export async function initBillingManager() {
    await loadCriteriaOptions();

    document.querySelectorAll("#bmCriteriaTypeList [data-criteria-type]").forEach((btn) => {
        btn.addEventListener("click", () => selectCriteriaType(btn.getAttribute("data-criteria-type")));
    });

    document.getElementById("bmAddCriteriaBtn")?.addEventListener("click", addCriteria);
    document.getElementById("bmClearCriteriaBtn")?.addEventListener("click", clearCriteria);
    document.getElementById("bmUpdateListBtn")?.addEventListener("click", runSearch);
    document.getElementById("bmSelectAllBtn")?.addEventListener("click", selectAllCheckboxes);
    document.getElementById("bmMarkClearedBtn")?.addEventListener("click", () => bulkUpdateBillStatus("cleared"));
    document.getElementById("bmReopenBtn")?.addEventListener("click", () => bulkUpdateBillStatus("unassigned"));
    document.getElementById("bmMaskToggle")?.addEventListener("click", () => {
        document.getElementById("bmPage")?.classList.toggle("bm-masked");
    });

    renderCurrentCriteriaList();
    await runSearch();
}

async function loadCriteriaOptions() {
    const result = await fetchBillingCriteriaOptions();
    criteriaOptions = result.success ? result.data : { providers: [], facilities: [], insurances: [] };
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function selectCriteriaType(type) {
    activeCriteriaType = type;

    document.querySelectorAll("#bmCriteriaTypeList [data-criteria-type]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-criteria-type") === type);
    });

    const fields = document.getElementById("bmCriteriaValueFields");
    const form = document.getElementById("bmCriteriaValueForm");

    fields.innerHTML = buildValueFieldsHtml(type);
    form.classList.add("open");

    document.getElementById("bmCriteriaTodayBtn")?.addEventListener("click", () => {
        document.getElementById("bmCriteriaFrom").value = todayIso();
        document.getElementById("bmCriteriaTo").value = todayIso();
    });
}

function buildValueFieldsHtml(type) {
    if (type === "date_of_service" || type === "date_of_entry") {
        return `
            <div class="bm-criteria-value-row">
                <div>
                    <label>From</label>
                    <input type="date" id="bmCriteriaFrom" value="${todayIso()}">
                </div>
                <div>
                    <label>To</label>
                    <input type="date" id="bmCriteriaTo" value="${todayIso()}">
                </div>
            </div>
            <button type="button" class="bm-add-criteria-btn" id="bmCriteriaTodayBtn" style="background:var(--bg-surface-alt); border-color:var(--border-color); color:var(--text-primary); margin-bottom:8px;">Today</button>
        `;
    }

    if (type === "billing_status") {
        return `
            <label>Status</label>
            <select id="bmCriteriaValue">
                <option value="unassigned">Unbilled</option>
                <option value="cleared">Cleared</option>
            </select>
        `;
    }

    if (type === "claim_type") {
        return `
            <label>Claim Type</label>
            <select id="bmCriteriaValue">
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="tertiary">Tertiary</option>
            </select>
        `;
    }

    if (type === "insurance") {
        const options = criteriaOptions.insurances.map((i) => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join("");
        return `<label>Insurance Company</label><select id="bmCriteriaValue">${options || `<option value="">No insurances on file</option>`}</select>`;
    }

    if (type === "provider") {
        const options = criteriaOptions.providers.map((p) => `<option value="${p.id}">${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</option>`).join("");
        return `<label>Provider</label><select id="bmCriteriaValue">${options || `<option value="">No providers on file</option>`}</select>`;
    }

    if (type === "facility") {
        const options = criteriaOptions.facilities.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("");
        return `<label>Facility</label><select id="bmCriteriaValue">${options || `<option value="">No facilities on file</option>`}</select>`;
    }

    const placeholder = type === "patient_name" ? "Search by name..." : type === "patient_id" ? "Patient No..." : "Encounter Id...";
    return `<label>${CRITERIA_LABELS[type]}</label><input type="${type === "encounter" ? "number" : "text"}" id="bmCriteriaValue" placeholder="${placeholder}">`;
}

function addCriteria() {
    if (!activeCriteriaType) return;

    const type = activeCriteriaType;
    let criterion;
    let label;

    if (type === "date_of_service" || type === "date_of_entry") {
        const from = document.getElementById("bmCriteriaFrom")?.value || "";
        const to = document.getElementById("bmCriteriaTo")?.value || "";

        if (!from && !to) {
            showToast("Enter a date range.", "error");
            return;
        }

        criterion = { type, from, to };
        label = `${CRITERIA_LABELS[type]} = ${from === to ? (from === todayIso() ? "Today" : from) : `${from || "..."} to ${to || "..."}`}`;
    } else {
        const valueEl = document.getElementById("bmCriteriaValue");
        const value = valueEl?.value || "";

        if (!value) {
            showToast("Enter a value for this criteria.", "error");
            return;
        }

        criterion = { type, value };
        label = `${CRITERIA_LABELS[type]} = ${valueEl.tagName === "SELECT" ? valueEl.options[valueEl.selectedIndex].textContent : value}`;
    }

    currentCriteria.push({ ...criterion, label });
    renderCurrentCriteriaList();

    document.getElementById("bmCriteriaValueForm").classList.remove("open");
    document.querySelectorAll("#bmCriteriaTypeList [data-criteria-type]").forEach((btn) => btn.classList.remove("active"));
    activeCriteriaType = null;
}

function removeCriteria(index) {
    currentCriteria.splice(index, 1);
    renderCurrentCriteriaList();
}

function clearCriteria() {
    currentCriteria = [];
    renderCurrentCriteriaList();
}

function renderCurrentCriteriaList() {
    const list = document.getElementById("bmCurrentCriteriaList");

    if (!currentCriteria.length) {
        list.innerHTML = `<li class="bm-current-criteria-empty">No criteria yet -- results default to the most recent 200 visits.</li>`;
        return;
    }

    list.innerHTML = currentCriteria.map((c, index) => `
        <li class="bm-current-criteria-item">
            <span>${escapeHtml(c.label)}</span>
            <button type="button" class="bm-current-criteria-remove" data-remove-criteria="${index}" title="Remove">&times;</button>
        </li>
    `).join("");

    list.querySelectorAll("[data-remove-criteria]").forEach((btn) => {
        btn.addEventListener("click", () => removeCriteria(Number(btn.getAttribute("data-remove-criteria"))));
    });
}

async function runSearch() {
    const results = document.getElementById("bmResults");
    const summaryBar = document.getElementById("bmSummaryBar");

    results.innerHTML = `<div class="bm-empty-state">Loading...</div>`;
    summaryBar.innerHTML = "";

    const payload = currentCriteria.map(({ label, ...rest }) => rest);
    const result = await searchBillingWorklist(payload);

    if (!result.success) {
        results.innerHTML = `<div class="bm-empty-state">Failed to load the billing worklist.</div>`;
        return;
    }

    renderResults(result.data || { patients: [], summary: {} });
}

function renderResults(data) {
    const results = document.getElementById("bmResults");
    const summaryBar = document.getElementById("bmSummaryBar");
    const patients = data.patients || [];
    const summary = data.summary || {};

    if (!patients.length) {
        results.innerHTML = `<div class="bm-empty-state">No visits match the current criteria.</div>`;
        summaryBar.innerHTML = "";
        return;
    }

    summaryBar.innerHTML = `
        <span>${summary.patient_count ?? patients.length} patient${(summary.patient_count ?? patients.length) === 1 ? "" : "s"}</span>
        <span>${summary.encounter_count ?? 0} visit${(summary.encounter_count ?? 0) === 1 ? "" : "s"}</span>
        <span>Total Charges <strong class="bm-money-mask">$${formatCurrency(summary.total_charges)}</strong></span>
    `;

    results.innerHTML = patients.map((patient) => `
        <div class="bm-patient-group">
            <div class="bm-patient-name-row">
                <span class="bm-patient-name">${escapeHtml(patient.patient_name)}</span>
                <span class="bm-patient-meta">(${escapeHtml(patient.patient_no || "")}${patient.age != null ? ` &middot; ${patient.age}y` : ""})</span>
            </div>
            ${patient.encounters.map((enc) => renderEncounterBlock(patient, enc)).join("")}
        </div>
    `).join("");

    results.querySelectorAll("[data-encounter-chip]").forEach((chip) => {
        chip.addEventListener("click", () => {
            openEncounterFeeSheet(Number(chip.getAttribute("data-patient-id")), Number(chip.getAttribute("data-encounter-chip")));
        });
    });

    results.querySelectorAll("[data-expand-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const encId = btn.getAttribute("data-expand-toggle");
            const panel = document.querySelector(`[data-encounter-detail="${encId}"]`);
            const isOpen = panel.classList.toggle("open");
            btn.textContent = isOpen ? "(Collapse)" : "(Expand)";
        });
    });

    results.querySelectorAll("[data-bill-status-select]").forEach((select) => {
        select.addEventListener("change", async () => {
            const encId = Number(select.getAttribute("data-bill-status-select"));
            const result = select.value === "cleared"
                ? await markEncountersCleared([encId])
                : await reopenEncounters([encId]);

            if (!result.success) {
                showToast(result.message || "Failed to update billing status.", "error");
            }

            await runSearch();
        });
    });

    results.querySelectorAll("[data-x12-status-select]").forEach((select) => {
        select.addEventListener("change", async () => {
            const encId = Number(select.getAttribute("data-x12-status-select"));
            const result = await updateEncounterX12Status(encId, select.value);

            if (!result.success) {
                showToast(result.message || "Failed to update X12 status.", "error");
            }
        });
    });
}

function renderEncounterBlock(patient, encounter) {
    const dateLabel = formatDate(encounter.date_of_service);
    const insuranceClass = patient.has_insurance ? "bm-chip-insurance" : "bm-chip-insurance none";

    const chargeRows = encounter.charges.length
        ? encounter.charges.map((c) => `
            <tr>
                <td data-encounter-charge="${encounter.encounter_id}"><input type="checkbox" data-charge-checkbox data-encounter-id="${encounter.encounter_id}"></td>
                <td>${escapeHtml(c.code_type || "-")}: ${escapeHtml(c.code || "-")}</td>
                <td>${escapeHtml(c.description || "-")}</td>
                <td class="bm-money-mask">$${formatCurrency(c.total)}</td>
                <td>${c.provider_name ? `<span class="bm-charge-provider">${escapeHtml(c.provider_name)}</span>` : "-"}</td>
                <td>${escapeHtml(dateLabel)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="6" style="color:var(--text-muted); font-style:italic;">No charges recorded for this visit yet.</td></tr>`;

    return `
        <div class="bm-encounter-block">
            <div class="bm-encounter-row">
                <span class="bm-chip bm-chip-encounter" data-encounter-chip="${encounter.encounter_id}" data-patient-id="${patient.patient_id}" title="Open this visit's Fee Sheet">Encounter ${escapeHtml(dateLabel)}</span>
                <span class="bm-chip ${insuranceClass}">${patient.has_insurance ? "Insurance" : "No Insurance"}</span>
                <span class="bm-chip bm-chip-mbo" title="Medical Billing Office routing -- not available in this build">MBO</span>
                <button type="button" class="bm-expand-toggle" data-expand-toggle="${encounter.encounter_id}">(Expand)</button>
            </div>

            <div class="bm-encounter-detail" data-encounter-detail="${encounter.encounter_id}">
                <table class="bm-charge-table">
                    <thead>
                        <tr><th></th><th>Code</th><th>Description</th><th>Price</th><th>Provider</th><th>Date</th></tr>
                    </thead>
                    <tbody>${chargeRows}</tbody>
                </table>

                <div class="bm-claim-status-row">
                    <div class="bm-claim-status-group">
                        Bill:
                        <select data-bill-status-select="${encounter.encounter_id}">
                            ${Object.entries(BILL_STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${encounter.bill_status === value ? "selected" : ""}>${label}</option>`).join("")}
                        </select>
                    </div>
                    <div class="bm-claim-status-group">
                        X12:
                        <select data-x12-status-select="${encounter.encounter_id}">
                            ${Object.entries(X12_STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${encounter.x12_status === value ? "selected" : ""}>${label}</option>`).join("")}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function selectAllCheckboxes() {
    document.querySelectorAll("[data-charge-checkbox]").forEach((cb) => { cb.checked = true; });
}

function getSelectedEncounterIds() {
    const ids = new Set();

    document.querySelectorAll("[data-charge-checkbox]:checked").forEach((cb) => {
        ids.add(Number(cb.getAttribute("data-encounter-id")));
    });

    return [...ids];
}

async function bulkUpdateBillStatus(status) {
    const encounterIds = getSelectedEncounterIds();

    if (!encounterIds.length) {
        showToast("Check at least one charge line first (its visit will be marked).", "error");
        return;
    }

    const result = status === "cleared"
        ? await markEncountersCleared(encounterIds)
        : await reopenEncounters(encounterIds);

    if (!result.success) {
        showToast(result.message || "Failed to update billing status.", "error");
        return;
    }

    showToast(result.message || "Updated.", "success");
    await runSearch();
}

async function openEncounterFeeSheet(patientId, encounterId) {
    if (!allPatients) {
        const result = await fetchPatients();
        allPatients = result.success ? result.data : [];
    }

    const patient = allPatients.find((p) => p.id === patientId);

    if (!patient) {
        showToast("Could not find that patient's record.", "error");
        return;
    }

    openPatientChartTab(patient);

    setTimeout(() => openFeeSheetForEncounter(encounterId), 250);
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
