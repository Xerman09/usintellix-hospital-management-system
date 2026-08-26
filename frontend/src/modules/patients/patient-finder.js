import { getUser } from "../../core/session.js";
import { fetchPatients } from "./patients.service.js";
import { openPatientChartTab } from "./patients-list.js?v=47";
import { patientAvatarHtml } from "../../core/patient-avatar.js";

let finderPatientsCache = [];

export async function initPatientFinder()
{
    const user = getUser();

    if (!user || !["admin", "receptionist", "doctor"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    const pageRoot = document.querySelector(".fnd-page");

    if (!pageRoot || pageRoot.dataset.wired === "true") {
        return;
    }

    pageRoot.dataset.wired = "true";

    const result = await fetchPatients();

    finderPatientsCache = result.success ? result.data : [];

    const searchInput = document.getElementById("finderSearchInput");

    searchInput.addEventListener("input", () => renderFinderResults(searchInput.value));
    searchInput.focus();

    renderFinderResults("");
}

function renderFinderResults(term)
{
    const body = document.getElementById("finderResultsBody");
    const query = term.trim().toLowerCase();

    if (!body) {
        return;
    }

    if (query === "") {
        body.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="fnd-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
                        <strong>Start typing to search</strong>
                        <p>Search by patient name or patient number.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const matches = finderPatientsCache.filter((patient) => {
        const haystack = [
            patient.patient_no,
            patient.first_name,
            patient.middle_name,
            patient.last_name,
            patient.suffix
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(query);
    });

    if (!matches.length) {
        body.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="fnd-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
                        <strong>No matching patients</strong>
                        <p>Try a different name or patient number.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = matches.map((patient) => {
        const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
        const sex = (patient.sex || "").toLowerCase();
        const sexLabel = sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Not set";
        const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";

        return `
        <tr class="fnd-row" data-row-id="${patient.id}">
            <td><span class="fnd-patient-no">${escapeHtml(patient.patient_no)}</span></td>
            <td>
                <div class="fnd-name-cell">
                    <div class="fnd-avatar">${patientAvatarHtml(patient)}</div>
                    <span class="fnd-name">${escapeHtml(fullName)}</span>
                </div>
            </td>
            <td><span class="fnd-muted ${sex ? "" : "empty"}">${escapeHtml(sexLabel)}</span></td>
            <td class="fnd-muted ${patient.birthdate ? "" : "empty"}">${escapeHtml(patient.birthdate ? formatDate(patient.birthdate) : "No birthdate")}</td>
            <td><span class="fnd-tag ${providerName ? "" : "empty"}">${providerName ? escapeHtml(providerName) : "Unassigned"}</span></td>
            <td>
                <button type="button" class="fnd-view-btn" data-view-id="${patient.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    View Chart
                </button>
            </td>
        </tr>
        `;
    }).join("");

    body.querySelectorAll("[data-view-id]").forEach((btn) => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            openPatientFromFinder(btn.getAttribute("data-view-id"));
        });
    });

    body.querySelectorAll(".fnd-row").forEach((row) => {
        row.addEventListener("click", () => openPatientFromFinder(row.getAttribute("data-row-id")));
    });
}

function openPatientFromFinder(id)
{
    const patient = finderPatientsCache.find((p) => String(p.id) === id);

    if (patient) {
        openPatientChartTab(patient);
    }
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function formatDate(value)
{
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
