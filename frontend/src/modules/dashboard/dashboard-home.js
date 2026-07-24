import { fetchDashboardStats } from "./dashboard-home.service.js";

const ICONS = {
    patients: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>`,
    staff: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>`,
    calendarToday: `<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path><circle cx="12" cy="15" r="2"></circle>`,
    calendarWeek: `<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18M8 15h.01M12 15h.01M16 15h.01"></path>`,
    upcoming: `<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path>`
};

function icon(name)
{
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}

export async function initDashboardHome(user)
{
    const result = await fetchDashboardStats();

    if (!result.success) {
        document.getElementById("dhSubtitle").textContent = "Unable to load your overview right now.";
        document.getElementById("dhStatsGrid").innerHTML = "";
        return;
    }

    const stats = result.data;

    renderHeader(user, stats);
    renderHeaderActions(user);

    if (stats.role_scope === "staff") {
        renderStaffStats(stats);
        renderActivityTable("staff", stats.recent_appointments, "Recent Appointments");
    } else if (stats.role_scope === "doctor") {
        renderDoctorStats(stats);
        renderActivityTable("doctor", stats.recent_appointments, "Your Recent Appointments");
    } else {
        renderPatientStats(stats);
        renderActivityTable("patient", stats.recent_appointments, "Your Appointment History");
    }
}

function renderHeader(user, stats)
{
    const subtitles = {
        staff: "Here's what's happening across the hospital today.",
        doctor: stats.has_provider_record
            ? "Here's an overview of your patients and schedule."
            : "Your account isn't linked to a provider record yet — contact an administrator.",
        patient: "Here's an overview of your upcoming care."
    };

    document.getElementById("dhSubtitle").textContent = subtitles[stats.role_scope] || "";
}

function renderHeaderActions(user)
{
    const container = document.getElementById("dhHeaderActions");
    const addIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>`;

    if (user.role === "admin") {
        container.innerHTML = `<a href="#/employees/create" class="dh-action-btn">${addIcon} Add Employee</a>`;
    } else if (user.role === "receptionist") {
        container.innerHTML = `<a href="#/patients/create" class="dh-action-btn">${addIcon} Register Patient</a>`;
    } else {
        container.innerHTML = "";
    }
}

function renderStaffStats(stats)
{
    setStatsGrid([
        { icon: "patients", variant: "", value: stats.patients_total, label: "Active Patients" },
        { icon: "staff", variant: "alt", value: stats.staff_total, label: "Total Staff" },
        { icon: "calendarToday", variant: "warn", value: stats.appointments_today, label: "Today's Appointments" },
        { icon: "calendarWeek", variant: "", value: stats.appointments_this_week, label: "This Week's Appointments" }
    ]);
}

function renderDoctorStats(stats)
{
    setStatsGrid([
        { icon: "patients", variant: "", value: stats.patients_total, label: "My Patients" },
        { icon: "calendarToday", variant: "warn", value: stats.appointments_today, label: "Today's Appointments" },
        { icon: "upcoming", variant: "alt", value: stats.appointments_upcoming, label: "Upcoming Appointments" }
    ]);
}

function renderPatientStats(stats)
{
    setStatsGrid([
        { icon: "upcoming", variant: "alt", value: stats.appointments_upcoming, label: "Upcoming Appointments" }
    ]);

    const slot = document.getElementById("dhHighlightSlot");
    const next = stats.next_appointment;

    if (!next) {
        slot.innerHTML = "";
        return;
    }

    const providerName = [next.provider_first_name, next.provider_last_name].filter(Boolean).join(" ");
    const when = formatDateTime(next.appointment_date, next.appointment_time);

    slot.innerHTML = `
        <div class="dh-highlight-card">
            <div class="dh-highlight-label">Next Appointment</div>
            <div class="dh-highlight-main">${escapeHtml(when)}</div>
            <div class="dh-highlight-sub">${providerName ? `with Dr. ${escapeHtml(providerName)}` : ""}${next.reason ? ` &middot; ${escapeHtml(next.reason)}` : ""}</div>
        </div>
    `;
}

function setStatsGrid(cards)
{
    const grid = document.getElementById("dhStatsGrid");

    grid.innerHTML = cards.map((card) => `
        <div class="dh-stat-card">
            <div class="dh-stat-icon ${card.variant}">${icon(card.icon)}</div>
            <div class="dh-stat-body">
                <div class="dh-stat-value">${card.value}</div>
                <div class="dh-stat-label">${escapeHtml(card.label)}</div>
            </div>
        </div>
    `).join("");
}

function renderActivityTable(scope, rows, title)
{
    document.getElementById("dhActivityTitle").textContent = title;

    const thead = document.getElementById("dhTableHead");
    const tbody = document.getElementById("dhTableBody");

    const columns = scope === "staff"
        ? ["Patient", "Provider", "Date &amp; Time", "Status"]
        : scope === "doctor"
            ? ["Patient", "Date &amp; Time", "Status"]
            : ["Provider", "Date &amp; Time", "Status"];

    thead.innerHTML = `<tr>${columns.map((col) => `<th>${col}</th>`).join("")}</tr>`;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="${columns.length}" class="dh-empty-row">No appointments to show yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => {
        const patientName = [row.patient_first_name, row.patient_last_name].filter(Boolean).join(" ");
        const providerName = [row.provider_first_name, row.provider_last_name].filter(Boolean).join(" ");
        const when = formatDateTime(row.appointment_date, row.appointment_time);
        const status = `<span class="status-badge ${row.status}">${escapeHtml(formatStatus(row.status))}</span>`;

        if (scope === "staff") {
            return `<tr><td>${escapeHtml(patientName)}</td><td>${escapeHtml(providerName)}</td><td>${escapeHtml(when)}</td><td>${status}</td></tr>`;
        }

        if (scope === "doctor") {
            return `<tr><td>${escapeHtml(patientName)}</td><td>${escapeHtml(when)}</td><td>${status}</td></tr>`;
        }

        return `<tr><td>${providerName ? "Dr. " + escapeHtml(providerName) : "-"}</td><td>${escapeHtml(when)}</td><td>${status}</td></tr>`;
    }).join("");
}

function formatDateTime(dateStr, timeStr)
{
    if (!dateStr) {
        return "-";
    }

    const date = new Date(`${dateStr}T${timeStr || "00:00:00"}`);

    if (Number.isNaN(date.getTime())) {
        return dateStr;
    }

    const dateFormatted = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

    if (!timeStr) {
        return dateFormatted;
    }

    const timeFormatted = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    return `${dateFormatted}, ${timeFormatted}`;
}

function formatStatus(status)
{
    return (status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
