import { fetchHealthSummary } from "./health-records.service.js";
import { HRS_SECTIONS } from "./health-summary.view.js?v=2";
import { formatApptDate, formatApptTime, statusLabel } from "../appointments/appointment-format.js";

const EMPTY_SECTION_KEYS = HRS_SECTIONS
    .map((section) => section.key)
    .filter((key) => !["care_provider", "encounters", "allergies"].includes(key));

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
    renderAllergies(result.data.allergies);
    renderEncounters(result.data.encounters);
    renderEmptySections(result.data);
}

function renderHeader(demographics)
{
    document.getElementById("hrsPatientName").textContent =
        [demographics.first_name, demographics.middle_name, demographics.last_name, demographics.suffix].filter(Boolean).join(" ");

    document.getElementById("hrsPatientNo").textContent = `Patient No: ${demographics.patient_no}`;
}

function renderAboutContact(d)
{
    const container = document.getElementById("hrsAboutContact");

    if (!container) return;

    const sex = d.sex ? d.sex.charAt(0).toUpperCase() + d.sex.slice(1) : "-";
    const civilStatus = d.civil_status ? d.civil_status.charAt(0).toUpperCase() + d.civil_status.slice(1) : "-";
    const address = [d.address_line, d.city, d.province, d.zip_code].filter(Boolean).join(", ") || "-";
    const emergencyContact = d.emergency_contact_name
        ? `${d.emergency_contact_name} (${d.emergency_relationship ?? "-"}) &mdash; ${d.emergency_phone ?? "-"}`
        : "-";

    container.innerHTML = `
        <div>
            <label style="display: block; font-weight: 600; margin-bottom: 8px;">About</label>
            <div class="form-grid">
                <div class="form-group"><label>Sex</label><p>${sex}</p></div>
                <div class="form-group"><label>Civil Status</label><p>${civilStatus}</p></div>
                <div class="form-group"><label>Birthdate</label><p>${d.birthdate ?? "-"}</p></div>
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
            <label style="display: block; font-weight: 600; margin-bottom: 8px;">Contact</label>
            <div class="form-grid">
                <div class="form-group full"><label>Address</label><p>${address}</p></div>
                <div class="form-group"><label>Home Phone</label><p>${d.home_phone ?? "-"}</p></div>
                <div class="form-group"><label>Mobile Phone</label><p>${d.mobile_phone ?? "-"}</p></div>
                <div class="form-group"><label>Work Phone</label><p>${d.work_phone ?? "-"}</p></div>
                <div class="form-group full"><label>Emergency Contact</label><p>${emergencyContact}</p></div>
            </div>
        </div>
    `;
}

function renderCareProvider(provider)
{
    const el = document.getElementById("hrs-care_provider");

    if (!el) return;

    if (!provider) {
        el.innerHTML = `<p class="table-empty" style="padding: 10px 0; text-align: left;">No care provider assigned.</p>`;
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

function renderAllergies(allergies)
{
    const el = document.getElementById("hrs-allergies");

    if (!el) return;

    if (!allergies || !allergies.length) {
        el.innerHTML = `<p class="table-empty" style="padding: 10px 0; text-align: left;">No allergies recorded.</p>`;
        return;
    }

    el.innerHTML = `<ul style="margin: 0; padding-left: 18px;">${allergies.map((allergy) => `<li>${allergy.name}</li>`).join("")}</ul>`;
}

function renderEncounters(encounters)
{
    const el = document.getElementById("hrs-encounters");

    if (!el) return;

    if (!encounters || !encounters.length) {
        el.innerHTML = `<p class="table-empty" style="padding: 10px 0; text-align: left;">No encounters recorded.</p>`;
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

        el.innerHTML = (Array.isArray(records) && records.length)
            ? `<p class="table-empty" style="padding: 10px 0; text-align: left;">${records.length} record(s) on file.</p>`
            : `<p class="table-empty" style="padding: 10px 0; text-align: left;">No data recorded on file.</p>`;
    });
}
