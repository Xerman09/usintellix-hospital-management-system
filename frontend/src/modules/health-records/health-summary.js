import { fetchHealthSummary } from "./health-records.service.js";
import { HRS_SECTIONS } from "./health-summary.view.js?v=2";
import { formatApptDate, formatApptTime, statusLabel, escapeHtml } from "../appointments/appointment-format.js";

// Sections with their own detailed-table renderer, as opposed to the
// generic "N record(s) on file" placeholder used for the rest.
const CUSTOM_RENDERED_KEYS = ["care_provider", "encounters", "allergies", "medications", "prescriptions", "problems", "immunizations"];

const EMPTY_SECTION_KEYS = HRS_SECTIONS
    .map((section) => section.key)
    .filter((key) => !CUSTOM_RENDERED_KEYS.includes(key));

const EMPTY_TEXT_OVERRIDES = {
    results: "No Results"
};

export async function initHealthSummary(options = {})
{
    const result = await fetchHealthSummary(options.patientId);

    if (!result.success || !result.data) {
        document.getElementById("hrsPatientName").textContent = "Unable to load health summary";
        document.getElementById("hrsPatientNo").textContent = result.message || "Please try again.";
        return;
    }

    renderHeader(result.data.demographics);
    renderAboutContact(result.data.demographics);
    renderCareProvider(result.data.care_provider);
    renderAllergiesTable(result.data.allergies);
    renderEncounters(result.data.encounters);
    renderImmunizations(result.data.immunizations);
    renderDrugTable("hrs-medications", result.data.medications, "No records found.");
    renderDrugTable("hrs-prescriptions", result.data.prescriptions, "No Results");
    renderProblems(result.data.problems);
    renderEmptySections(result.data);
}

function renderHeader(demographics)
{
    const fullName = [demographics.first_name, demographics.middle_name, demographics.last_name, demographics.suffix].filter(Boolean).join(" ");

    document.getElementById("hrsPatientName").textContent = fullName;
    document.getElementById("hrsPatientNo").textContent = `Patient No: ${demographics.patient_no}`;
    document.getElementById("hrsAvatar").textContent = (demographics.first_name || "?").charAt(0).toUpperCase();
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

function renderAboutContact(d)
{
    const container = document.getElementById("hrsAboutContact");

    if (!container) return;

    const sex = d.sex ? d.sex.charAt(0).toUpperCase() + d.sex.slice(1) : "-";
    const civilStatus = d.civil_status ? d.civil_status.charAt(0).toUpperCase() + d.civil_status.slice(1) : "-";
    const address = [d.address_line, d.city, d.province, d.zip_code].filter(Boolean).join(", ") || "-";

    container.innerHTML = `
        <div>
            <label class="hrs-subcard-label">About</label>
            <div class="form-grid">
                <div class="form-group"><label>Sex</label><p>${sex}</p></div>
                <div class="form-group"><label>Civil Status</label><p>${civilStatus}</p></div>
                <div class="form-group"><label>Birthdate</label><p>${formatDate(d.birthdate) || "-"}</p></div>
                <div class="form-group"><label>Blood Type</label><p>${d.blood_type ?? "-"}</p></div>
                <div class="form-group"><label>Height</label><p>${d.height ?? "-"} cm</p></div>
                <div class="form-group"><label>Weight</label><p>${d.weight ?? "-"} kg</p></div>
                <div class="form-group"><label>Race</label><p>${d.race ?? "-"}</p></div>
                <div class="form-group"><label>Ethnicity</label><p>${d.ethnicity ?? "-"}</p></div>
                <div class="form-group"><label>Religion</label><p>${d.religion ?? "-"}</p></div>
                <div class="form-group"><label>Language</label><p>${d.language ?? "-"}</p></div>
            </div>
        </div>
        <div>
            <label class="hrs-subcard-label">Contact</label>
            <div class="form-grid">
                <div class="form-group full"><label>Address</label><p>${address}</p></div>
                <div class="form-group"><label>Home Phone</label><p>${d.home_phone ?? "-"}</p></div>
                <div class="form-group"><label>Mobile Phone</label><p>${d.mobile_phone ?? "-"}</p></div>
                <div class="form-group"><label>Work Phone</label><p>${d.work_phone ?? "-"}</p></div>
            </div>
        </div>
    `;
}

function renderCareProvider(provider)
{
    const el = document.getElementById("hrs-care_provider");

    if (!el) return;

    if (!provider) {
        el.innerHTML = `<p class="hrs-widget-empty-text">No care provider assigned.</p>`;
        return;
    }

    el.innerHTML = `
        <div class="form-grid">
            <div class="form-group"><label>Name</label><p>${[provider.first_name, provider.last_name].filter(Boolean).join(" ") || "-"}</p></div>
            <div class="form-group"><label>Specialty</label><p>${provider.specialty ?? "-"}</p></div>
            <div class="form-group"><label>Department</label><p>${provider.department_name ?? "-"}</p></div>
            <div class="form-group"><label>NPI Number</label><p>${provider.npi_number ?? "-"}</p></div>
            <div class="form-group"><label>License Number</label><p>${provider.license_number ?? "-"}</p></div>
            <div class="form-group"><label>Phone</label><p>${provider.phone ?? "-"}</p></div>
            <div class="form-group"><label>Email</label><p>${provider.email ?? "-"}</p></div>
        </div>
    `;
}

function renderAllergiesTable(allergies)
{
    renderListTable(
        "hrs-allergies",
        allergies,
        "No records found.",
        ["Title", "Reported Date", "Start Date", "End Date", "Referrer"],
        (allergy) => `
            <tr>
                <td>${escapeHtml(allergy.name)}</td>
                <td>${formatDateTime(allergy.created_at)}</td>
                <td>${formatDate(allergy.begin_date)}</td>
                <td>${formatDate(allergy.end_date)}</td>
                <td>${escapeHtml(allergy.referred_by || "-")}</td>
            </tr>
        `
    );
}

function renderImmunizations(immunizations)
{
    renderListTable(
        "hrs-immunizations",
        immunizations,
        "No records found.",
        ["Vaccine", "Date Administered", "Manufacturer", "Administered By"],
        (imm) => `
            <tr>
                <td>${escapeHtml(imm.vaccine_name || imm.cvx_code || "-")}</td>
                <td>${formatDateTime(imm.administered_at)}</td>
                <td>${escapeHtml(imm.manufacturer || "-")}</td>
                <td>${escapeHtml(imm.administered_by_provider_name || imm.administered_by || "-")}</td>
            </tr>
        `
    );
}

function renderDrugTable(elementId, records, emptyMessage)
{
    renderListTable(
        elementId,
        records,
        emptyMessage,
        ["Drug", "Start Date", "Last Modified", "End Date"],
        (drug) => `
            <tr>
                <td>${escapeHtml(drug.title)}</td>
                <td>${formatDate(drug.begin_date)}</td>
                <td>${formatDateTime(drug.updated_at || drug.created_at)}</td>
                <td>${formatDate(drug.end_date)}</td>
            </tr>
        `
    );
}

function renderProblems(problems)
{
    renderListTable(
        "hrs-problems",
        problems,
        "No records found.",
        ["Title", "Reported Date", "Start Date", "End Date"],
        (problem) => `
            <tr>
                <td>${escapeHtml(problem.title)}</td>
                <td>${formatDateTime(problem.created_at)}</td>
                <td>${formatDate(problem.begin_date)}</td>
                <td>${formatDate(problem.end_date)}</td>
            </tr>
        `
    );
}

function renderListTable(elementId, records, emptyMessage, headers, rowRenderer)
{
    const el = document.getElementById(elementId);

    if (!el) return;

    if (!records || !records.length) {
        el.innerHTML = `<p class="hrs-widget-empty-text">${emptyMessage}</p>`;
        return;
    }

    el.innerHTML = `
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
                <tbody>${records.map(rowRenderer).join("")}</tbody>
            </table>
        </div>
    `;
}

function formatDateTime(value)
{
    if (!value) {
        return "-";
    }

    const date = new Date(String(value).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderEncounters(encounters)
{
    const el = document.getElementById("hrs-encounters");

    if (!el) return;

    if (!encounters || !encounters.length) {
        el.innerHTML = `<p class="hrs-widget-empty-text">No encounters recorded.</p>`;
        return;
    }

    el.innerHTML = `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Date</th><th>Time</th><th>Provider</th><th>Reason</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${encounters.map((encounter) => `
                        <tr>
                            <td>${formatApptDate(encounter.appointment_date)}</td>
                            <td>${formatApptTime(encounter.appointment_time)}</td>
                            <td>${encounter.provider_first_name} ${encounter.provider_last_name}</td>
                            <td>${encounter.reason ?? "-"}</td>
                            <td><span class="status-badge ${encounter.status}">${statusLabel(encounter.status)}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderEmptySections(data)
{
    EMPTY_SECTION_KEYS.forEach((key) => {
        const el = document.getElementById(`hrs-${key}`);

        if (!el) return;

        const records = data[key];
        const emptyText = EMPTY_TEXT_OVERRIDES[key] || "No data recorded on file.";

        el.innerHTML = (Array.isArray(records) && records.length)
            ? `<p class="hrs-widget-empty-text">${records.length} record(s) on file.</p>`
            : `<p class="hrs-widget-empty-text">${emptyText}</p>`;
    });
}
