import { fetchAppointments } from "../appointments/appointments.service.js?v=4";
import { formatApptDate, formatApptTime, statusLabel } from "../appointments/appointment-format.js?v=4";
import { fetchHealthSummary } from "../health-records/health-records.service.js";
import { fetchAllergies } from "../allergies/allergies.service.js";
import { fetchPatientAllergies, addPatientAllergy, removePatientAllergy } from "../patient-allergies/patient-allergies.service.js?v=4";
import { getUser } from "../../core/session.js?v=5";
import { fetchPatientContactHistory } from "./patients.service.js";

export function initPatientProfile(patient)
{
    const tabs = document.querySelectorAll(".modal-tab");
    const panels = document.querySelectorAll(".modal-tab-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            document.querySelector(`.modal-tab-panel[data-panel="${tab.getAttribute("data-tab")}"]`).classList.add("active");
        });
    });

    loadPatientAppointments(patient);
    loadOverviewSections(patient);
    loadOverviewAllergies(patient);
    loadPatientContactHistory(patient);
}

const OVERVIEW_LIST_SECTIONS = [
    { key: "problems", emptyMessage: "No active problems recorded." },
    { key: "medications", emptyMessage: "No active medications recorded." },
    { key: "prescriptions", emptyMessage: "No prescriptions on file." },
    { key: "clinical_reminders", emptyMessage: "No clinical reminders on file." }
];

async function loadOverviewSections(patient)
{
    const result = await fetchHealthSummary(patient.id);

    if (!result.success || !result.data) {
        [...OVERVIEW_LIST_SECTIONS.map((s) => s.key), "care_provider"].forEach((key) => {
            const el = document.getElementById(`overview-${key}`);

            if (el) {
                el.innerHTML = `<p class="table-empty" style="padding: 10px 0; text-align: left;">Unable to load.</p>`;
            }
        });

        return;
    }

    renderOverviewCareTeam(result.data.care_provider);

    OVERVIEW_LIST_SECTIONS.forEach((section) => {
        renderOverviewList(`overview-${section.key}`, result.data[section.key], section.emptyMessage);
    });
}

async function loadOverviewAllergies(patient)
{
    const el = document.getElementById("overview-allergies");

    if (!el) {
        return;
    }

    const result = await fetchPatientAllergies(patient.id);

    renderOverviewAllergies(patient, result.success ? result.data : []);
}

async function renderOverviewAllergies(patient, allergies)
{
    const el = document.getElementById("overview-allergies");

    if (!el) {
        return;
    }

    const isDoctor = getUser()?.role === "doctor";

    const list = allergies.length
        ? `<ul style="margin: 0 0 10px; padding-left: 18px;">
            ${allergies.map((allergy) => `
                <li style="margin-bottom: 4px;">
                    ${allergy.name}
                    ${isDoctor ? `<button type="button" class="btn-danger" data-remove-allergy="${allergy.id}" style="margin-left: 8px; padding: 2px 8px; font-size: 12px;">Remove</button>` : ""}
                </li>
            `).join("")}
           </ul>`
        : `<p class="table-empty" style="padding: 10px 0 4px; text-align: left;">No allergies recorded.</p>`;

    if (!isDoctor) {
        el.innerHTML = list;
        return;
    }

    const catalogResult = await fetchAllergies();
    const catalog = catalogResult.success ? catalogResult.data : [];
    const recordedIds = new Set(allergies.map((allergy) => String(allergy.allergy_id)));
    const available = catalog.filter((allergy) => !recordedIds.has(String(allergy.id)));

    el.innerHTML = `
        ${list}
        <div style="display: flex; gap: 10px; align-items: center;">
            <select id="overviewAllergySelect" class="form-input" style="max-width: 260px;">
                <option value="">Select allergy...</option>
                ${available.map((allergy) => `<option value="${allergy.id}">${allergy.name}</option>`).join("")}
            </select>
            <button type="button" class="btn-edit" id="overviewAllergyAddBtn">+ Add</button>
        </div>
        <p id="overviewAllergyMsg" style="margin: 8px 0 0;"></p>
    `;

    document.getElementById("overviewAllergyAddBtn").addEventListener("click", async () => {
        const select = document.getElementById("overviewAllergySelect");
        const msg = document.getElementById("overviewAllergyMsg");
        const allergyId = select.value;

        if (!allergyId) {
            msg.textContent = "Select an allergy first.";
            msg.style.color = "#d92d20";
            return;
        }

        const result = await addPatientAllergy(patient.id, allergyId);

        if (!result.success) {
            msg.textContent = result.message || "Failed to add allergy.";
            msg.style.color = "#d92d20";
            return;
        }

        loadOverviewAllergies(patient);
    });

    el.querySelectorAll("[data-remove-allergy]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const result = await removePatientAllergy(btn.getAttribute("data-remove-allergy"));

            if (result.success) {
                loadOverviewAllergies(patient);
            }
        });
    });
}

function renderOverviewCareTeam(provider)
{
    const el = document.getElementById("overview-care_provider");

    if (!el) {
        return;
    }

    if (!provider) {
        el.innerHTML = `<p class="table-empty" style="padding: 10px 0; text-align: left;">No care provider assigned.</p>`;
        return;
    }

    el.innerHTML = `<p>${[provider.first_name, provider.last_name].filter(Boolean).join(" ")}${provider.specialty ? ` — ${provider.specialty}` : ""}</p>`;
}

function renderOverviewList(elementId, records, emptyMessage)
{
    const el = document.getElementById(elementId);

    if (!el) {
        return;
    }

    el.innerHTML = (Array.isArray(records) && records.length)
        ? `<p>${records.length} record(s) on file.</p>`
        : `<p class="table-empty" style="padding: 10px 0; text-align: left;">${emptyMessage}</p>`;
}

async function loadPatientAppointments(patient)
{
    const tbody = document.getElementById("patientAppointmentsBody");

    if (!tbody) {
        return;
    }

    const result = await fetchAppointments({ patient_id: patient.id });

    if (!result.success || !result.data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No appointments recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = result.data.map((appointment) => `
        <tr>
            <td>${formatApptDate(appointment.appointment_date)}</td>
            <td>${formatApptTime(appointment.appointment_time)}</td>
            <td>${appointment.provider_first_name} ${appointment.provider_last_name}</td>
            <td>${appointment.reason ?? "-"}</td>
            <td><span class="status-badge ${appointment.status}">${statusLabel(appointment.status)}</span></td>
        </tr>
    `).join("");
}

function escapeHtml(str)
{
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadPatientContactHistory(patient)
{
    const tbody = document.getElementById("profileContactHistoryBody");
    const countEl = document.getElementById("profileContactHistoryCount");
    if (!tbody) return;

    const res = await fetchPatientContactHistory(patient.id);
    const records = res.success ? (res.data || []) : [];

    if (countEl) {
        countEl.textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;
    }

    if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No address or contact history recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map((row) => {
        const isCurrent = Number(row.is_current) === 1;
        const statusBadge = isCurrent
            ? `<span class="badge" style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">Current Active</span>`
            : `<span class="badge" style="background:#64748b;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">Historical</span>`;

        const addressParts = [
            row.address_line,
            row.address_line2,
            row.city,
            row.province,
            row.postal_code,
            row.country
        ].filter(Boolean).join(", ") || "—";

        const contactParts = [];
        if (row.mobile_phone) contactParts.push(`📱 Mobile: ${escapeHtml(row.mobile_phone)}`);
        if (row.home_phone) contactParts.push(`📞 Home: ${escapeHtml(row.home_phone)}`);
        if (row.work_phone) contactParts.push(`💼 Work: ${escapeHtml(row.work_phone)}`);
        if (row.email) contactParts.push(`✉️ ${escapeHtml(row.email)}`);
        const contactHtml = contactParts.length ? contactParts.join("<br>") : `<span style="color:var(--text-muted);">No phone/email</span>`;

        const fromDate = row.effective_from ? String(row.effective_from).slice(0, 10) : "—";
        const toDate = isCurrent ? "Present / Active" : (row.effective_to ? String(row.effective_to).slice(0, 10) : "—");
        const effectivePeriod = `<strong>${fromDate}</strong> &rarr; <span style="${isCurrent ? 'color:#16a34a;font-weight:600;' : ''}">${toDate}</span>`;
        const reason = escapeHtml(row.change_reason || "Demographic Record");
        const recordedBy = row.recorded_by_user ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">By: ${escapeHtml(row.recorded_by_user)}</div>` : "";

        return `
            <tr>
                <td>${statusBadge}</td>
                <td><strong style="text-transform: capitalize;">${escapeHtml(row.address_type || "residential")}</strong></td>
                <td><div style="font-size:13px;font-weight:500;">${escapeHtml(addressParts)}</div></td>
                <td style="font-size:12px;line-height:1.4;">${contactHtml}</td>
                <td style="font-size:12px;white-space:nowrap;">${effectivePeriod}</td>
                <td><div style="font-size:12px;">${reason}</div>${recordedBy}</td>
            </tr>
        `;
    }).join("");
}
