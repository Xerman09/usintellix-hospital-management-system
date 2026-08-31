import { getUser } from "../../core/session.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchPatientProcedureResultsForPatient } from "../patient-results/patient-results.service.js";

let allResults = [];
let items = []; // [{ name, count }]
let selectedItems = new Set();

export async function initLabsTrend()
{
    const user = getUser();

    if (!user) {
        window.location.hash = "#/dashboard";
        return;
    }

    allResults = [];
    items = [];
    selectedItems = new Set();

    document.getElementById("ltBackBtn").addEventListener("click", goBackToPatient);

    const patientNo = getLastActivePatientChart();

    if (!patientNo || patientNo === "null") {
        renderNoPatient("Open a patient's chart first, then come back to Labs.");
        return;
    }

    const patientsResult = await fetchPatients();
    const patient = patientsResult.success ? patientsResult.data.find((p) => p.patient_no === patientNo) : null;

    if (!patient) {
        renderNoPatient("The active patient chart could not be resolved.");
        return;
    }

    const resultsResult = await fetchPatientProcedureResultsForPatient(patient.id);

    allResults = resultsResult.success ? resultsResult.data : [];
    items = buildItemList(allResults);

    wireMultiselect();
    wireToggleAll();

    document.getElementById("ltSubmitBtn").addEventListener("click", renderOutput);

    renderDropdown();
}

function goBackToPatient()
{
    if (window.tabManager && window.tabManager.tabs.has("patient_chart")) {
        window.tabManager.switchTab("patient_chart");
        return;
    }

    window.location.hash = "#/dashboard";
}

function renderNoPatient(message)
{
    document.getElementById("ltMultiselect").style.display = "none";
    document.querySelector(".lt-divider").style.display = "none";
    document.getElementById("ltResults").innerHTML = `<p class="lt-no-params">${escapeHtml(message)}</p>`;
    document.getElementById("ltSubmitBtn").disabled = true;
    document.getElementById("ltToggleAll").disabled = true;
}

function buildItemList(results)
{
    const counts = new Map();

    results.forEach((r) => {
        if (!r.name) return;
        counts.set(r.name, (counts.get(r.name) || 0) + 1);
    });

    return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function wireMultiselect()
{
    const box = document.getElementById("ltMultiselectBox");
    const filterInput = document.getElementById("ltItemFilter");
    const dropdown = document.getElementById("ltDropdown");

    box.addEventListener("click", () => {
        filterInput.focus();
        openDropdown();
    });

    filterInput.addEventListener("focus", openDropdown);
    filterInput.addEventListener("input", () => renderDropdown(filterInput.value));

    document.addEventListener("click", (event) => {
        if (!document.getElementById("ltMultiselect").contains(event.target)) {
            dropdown.style.display = "none";
        }
    });
}

function openDropdown()
{
    renderDropdown(document.getElementById("ltItemFilter").value);
    document.getElementById("ltDropdown").style.display = "block";
}

function wireToggleAll()
{
    document.getElementById("ltToggleAll").addEventListener("change", (event) => {
        selectedItems = event.target.checked ? new Set(items.map((i) => i.name)) : new Set();
        renderChips();
        renderDropdown(document.getElementById("ltItemFilter").value);
    });
}

function renderDropdown(filterText = "")
{
    const dropdown = document.getElementById("ltDropdown");
    const needle = filterText.trim().toLowerCase();

    const visible = items.filter((item) => item.name.toLowerCase().includes(needle));

    if (!visible.length) {
        dropdown.innerHTML = `<div class="lt-dropdown-empty">${items.length ? "No matching items." : "No lab results recorded for this patient yet."}</div>`;
        return;
    }

    dropdown.innerHTML = visible.map((item) => `
        <label class="lt-dropdown-item">
            <input type="checkbox" data-item="${escapeHtml(item.name)}" ${selectedItems.has(item.name) ? "checked" : ""}>
            ${escapeHtml(item.name)}
            <span class="lt-item-count">(${item.count})</span>
        </label>
    `).join("");

    dropdown.querySelectorAll("input[data-item]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const name = checkbox.dataset.item;

            if (checkbox.checked) {
                selectedItems.add(name);
            } else {
                selectedItems.delete(name);
            }

            renderChips();
            syncToggleAllState();
        });
    });
}

function renderChips()
{
    const box = document.getElementById("ltMultiselectBox");
    const filterInput = document.getElementById("ltItemFilter");

    box.querySelectorAll(".lt-chip").forEach((chip) => chip.remove());

    [...selectedItems].forEach((name) => {
        const chip = document.createElement("span");

        chip.className = "lt-chip";
        chip.innerHTML = `${escapeHtml(name)} <button type="button" class="lt-chip-remove" data-remove="${escapeHtml(name)}">&times;</button>`;
        box.insertBefore(chip, filterInput);
    });

    box.querySelectorAll(".lt-chip-remove").forEach((btn) => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            selectedItems.delete(btn.dataset.remove);
            renderChips();
            renderDropdown(filterInput.value);
            syncToggleAllState();
        });
    });
}

function syncToggleAllState()
{
    const toggleAll = document.getElementById("ltToggleAll");

    toggleAll.checked = items.length > 0 && selectedItems.size === items.length;
    toggleAll.indeterminate = selectedItems.size > 0 && selectedItems.size < items.length;
}

function renderOutput()
{
    const resultsContainer = document.getElementById("ltResults");

    if (!selectedItems.size) {
        resultsContainer.innerHTML = `<p class="lt-no-params">No parameters selected.</p>`;
        return;
    }

    const outputMode = document.querySelector('input[name="ltOutput"]:checked').value;
    const rows = allResults.filter((r) => selectedItems.has(r.name));

    resultsContainer.innerHTML = outputMode === "list" ? renderListOutput(rows) : renderMatrixOutput(rows);
}

function renderListOutput(rows)
{
    if (!rows.length) {
        return `<p class="lt-no-params">No results recorded yet for the selected items.</p>`;
    }

    const body = rows.map((r) => `
        <tr>
            <td>${escapeHtml(dateOf(r))}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${valueCell(r, false)}</td>
            <td>${escapeHtml(r.units || "")}</td>
            <td>${escapeHtml(r.reference_range || "")}</td>
        </tr>
    `).join("");

    return `
        <div class="lt-results-table-wrap">
            <table class="lt-results-table">
                <thead>
                    <tr><th>Date</th><th>Item</th><th>Value</th><th>Units</th><th>Range</th></tr>
                </thead>
                <tbody>${body}</tbody>
            </table>
        </div>
    `;
}

function renderMatrixOutput(rows)
{
    if (!rows.length) {
        return `<p class="lt-no-params">No results recorded yet for the selected items.</p>`;
    }

    const dates = [...new Set(rows.map((r) => dateOf(r)))].sort();
    const itemNames = [...selectedItems].filter((name) => rows.some((r) => r.name === name));

    const cellMap = new Map();
    rows.forEach((r) => cellMap.set(`${dateOf(r)}|${r.name}`, r));

    const headerCells = itemNames.map((name) => `<th>${escapeHtml(name)}</th>`).join("");

    const bodyRows = dates.map((date) => {
        const cells = itemNames.map((name) => {
            const r = cellMap.get(`${date}|${name}`);

            return `<td>${r ? valueCell(r) : `<span class="lt-empty-cell">&mdash;</span>`}</td>`;
        }).join("");

        return `<tr><td>${escapeHtml(date)}</td>${cells}</tr>`;
    }).join("");

    return `
        <div class="lt-results-table-wrap">
            <table class="lt-results-table">
                <thead>
                    <tr><th>Date</th>${headerCells}</tr>
                </thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
    `;
}

function dateOf(r)
{
    return r.result_date || r.order_date || "";
}

function valueCell(r, includeUnits = true)
{
    const value = escapeHtml(includeUnits ? [r.value, r.units].filter(Boolean).join(" ") : (r.value || ""));

    return Number(r.is_abnormal) ? `<span class="lt-abn-value">${value}</span>` : value;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
