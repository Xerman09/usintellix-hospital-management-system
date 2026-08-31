import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";

// "Procedure Orders and Reports" backs the "Electronic Reports" nav item.
// options.defaultCurrentPatientOnly is kept as an entry point so a future
// caller (e.g. a patient-scoped launch point) can pre-check the filter.
export async function initProcedureReports(options = {})
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    document.getElementById("prCurrentPatientOnly").checked = Boolean(options.defaultCurrentPatientOnly);

    await Promise.all([loadProviders(), loadLabs()]);

    document.getElementById("prFilterBtn").addEventListener("click", renderResults);
    document.getElementById("prProcessBtn").addEventListener("click", handleProcessResults);

    renderResults();
}

async function loadProviders()
{
    const select = document.getElementById("prProvider");
    const result = await fetchProviders();
    const providers = result.success ? result.data : [];

    select.innerHTML = `<option value="">-- All Providers --</option>`
        + providers.map((provider) => `<option value="${provider.id}">${escapeHtml([provider.first_name, provider.last_name].filter(Boolean).join(" "))}</option>`).join("");
}

async function loadLabs()
{
    const result = await fetchFacilities();
    const labs = result.success ? result.data.filter((facility) => facility.facility_npi) : [];

    const optionsHtml = `<option value="">All Labs</option>`
        + labs.map((lab) => `<option value="${lab.id}">${escapeHtml(lab.name)}</option>`).join("");

    document.getElementById("prProcessLab").innerHTML = optionsHtml;
    document.getElementById("prLab").innerHTML = optionsHtml;
}

function handleProcessResults()
{
    showToast("No results are available to process yet.", "error");
}

function renderResults()
{
    const tbody = document.getElementById("prResultsBody");

    const from = document.getElementById("prFromDate").value;
    const to = document.getElementById("prToDate").value;
    const status = document.getElementById("prStatus").selectedOptions[0]?.textContent;
    const providerName = document.getElementById("prProvider").selectedOptions[0]?.textContent;
    const labName = document.getElementById("prLab").selectedOptions[0]?.textContent;
    const currentPatientOnly = document.getElementById("prCurrentPatientOnly").checked;

    const filterParts = [];

    if (from) filterParts.push(`From ${from}`);
    if (to) filterParts.push(`to ${to}`);
    if (status) filterParts.push(status);
    if (providerName && providerName !== "-- All Providers --") filterParts.push(providerName);
    if (labName && labName !== "All Labs") filterParts.push(labName);

    if (currentPatientOnly) {
        const patientNo = getLastActivePatientChart();

        filterParts.push(patientNo ? `Patient ${patientNo}` : "no active patient chart");
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="9">
                <div class="pr-results-empty">
                    <div class="pr-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
                    </div>
                    <strong>No results found</strong>
                    <p>${filterParts.length ? `No procedure reports match: ${escapeHtml(filterParts.join(", "))}.` : "Adjust the filters above and click Filter."}</p>
                </div>
            </td>
        </tr>
    `;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
