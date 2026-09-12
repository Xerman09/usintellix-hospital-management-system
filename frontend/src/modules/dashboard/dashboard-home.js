import { fetchDashboardStats } from "./dashboard-home.service.js";
import { fetchPatientDashboardSummary, fetchAiHealthAssessment } from "../patients/patients.service.js";

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

    if (!document.getElementById("dhSubtitle")) {
        return;
    }

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
        container.innerHTML = ``;
    } else if (user.role === "receptionist") {
        container.innerHTML = `<a href="#/patients/create" class="dh-action-btn primary">${addIcon} Register Patient</a>`;
    } else {
        container.innerHTML = "";
    }
}

function renderStaffStats(stats)
{
    const layout = document.querySelector(".dh-layout-grid");
    if (layout) layout.style.gridTemplateColumns = "1fr";

    setStatsGrid([
        { icon: "patients", variant: "", value: stats.patients_total, label: "Total Patients" },
        { icon: "staff", variant: "alt", value: stats.staff_total, label: "Active Staff" },
        { icon: "calendarToday", variant: "warn", value: stats.appointments_today, label: "Today's Volume" },
        { icon: "calendarWeek", variant: "", value: stats.appointments_this_week, label: "Weekly Volume" }
    ]);

    renderCharts(stats);
}

function renderDoctorStats(stats)
{
    const layout = document.querySelector(".dh-layout-grid");
    if (layout) layout.style.gridTemplateColumns = "1fr";

    setStatsGrid([
        { icon: "patients", variant: "", value: stats.patients_total, label: "My Patients" },
        { icon: "calendarToday", variant: "warn", value: stats.appointments_today, label: "Today's Volume" },
        { icon: "upcoming", variant: "alt", value: stats.appointments_upcoming, label: "Upcoming Appts" }
    ]);

    renderCharts(stats);
}

function renderPatientStats(stats)
{
    const layout = document.querySelector(".dh-layout-grid");
    if (layout) layout.style.gridTemplateColumns = "1fr";

    setStatsGrid([
        { icon: "upcoming", variant: "alt", value: stats.appointments_upcoming, label: "Upcoming Appointments" }
    ]);

    const slot = document.getElementById("dhHighlightSlot");
    const next = stats.next_appointment;

    if (!next) {
        slot.innerHTML = "";
    } else {
        const providerName = [next.provider_first_name, next.provider_last_name].filter(Boolean).join(" ");
        const when = formatDateTime(next.appointment_date, next.appointment_time);

        slot.innerHTML = `
            <div class="dh-highlight-card">
                <div class="dh-highlight-info">
                    <div class="dh-highlight-label">Next Appointment</div>
                    <div class="dh-highlight-main">${escapeHtml(when)}</div>
                    <div class="dh-highlight-sub">${providerName ? `with Dr. ${escapeHtml(providerName)}` : ""}${next.reason ? ` &middot; ${escapeHtml(next.reason)}` : ""}</div>
                </div>
            </div>
        `;
    }
    
    // AI Report Setup for Patient Portal
    const aiPanel = document.getElementById("dhAiReportPanel");
    if (aiPanel && stats.has_patient_record) {
        aiPanel.style.display = "block";
        
        (async () => {
            const content = document.getElementById("dhAiReportContent");
            try {
                const summaryRes = await fetchPatientDashboardSummary(stats.patient_id);
                if (!summaryRes.success) {
                    content.innerHTML = `<div style="color: #b91c1c;">Failed to load health summary data.</div>`;
                    return;
                }
                
                const aiRes = await fetchAiHealthAssessment(stats.patient_id, summaryRes.data);
                if (!aiRes.success) {
                    content.innerHTML = `<div style="color: #b91c1c;">Failed to generate AI report: ${escapeHtml(aiRes.message || "")}</div>`;
                    return;
                }
                
                content.innerHTML = generateEmbeddedAiReportHtml(aiRes.data);
            } catch (err) {
                content.innerHTML = `<div style="color: #b91c1c;">An error occurred while analyzing health records.</div>`;
            }
        })();
    }
}

function setStatsGrid(cards)
{
    const grid = document.getElementById("dhStatsGrid");

    grid.innerHTML = cards.map((card) => {
        const trendHtml = card.trend !== undefined
            ? `<div class="dh-stat-trend ${card.trend > 0 ? '' : card.trend < 0 ? 'negative' : 'neutral'}">${card.trend > 0 ? '+' : ''}${card.trend}%</div>`
            : '';

        return `
        <div class="dh-stat-card ${card.variant || ''}">
            <div class="dh-stat-header">
                <div class="dh-stat-label">${escapeHtml(card.label)}</div>
                <div class="dh-stat-icon">${icon(card.icon)}</div>
            </div>
            <div class="dh-stat-body">
                <div class="dh-stat-value">${card.value}</div>
                ${trendHtml}
            </div>
        </div>
        `;
    }).join("");
}

const SVG_NS = "http://www.w3.org/2000/svg";

// Colors are CSS custom properties (defined on .dh-page, themed for dark
// mode) from the dataviz skill's validated 4-slot categorical order --
// see the comment beside --dh-status-scheduled in dashboard-home.view.js.
const APPOINTMENT_STATUS_META = {
    scheduled: { label: "Scheduled", color: "var(--dh-status-scheduled)" },
    completed: { label: "Completed", color: "var(--dh-status-completed)" },
    cancelled: { label: "Cancelled", color: "var(--dh-status-cancelled)" },
    no_show: { label: "No Show", color: "var(--dh-status-no_show)" }
};

function renderCharts(stats)
{
    const grid = document.getElementById("dhChartsGrid");

    if (!grid) {
        return;
    }

    grid.className = "dh-charts-grid two-col";
    grid.innerHTML = `
        <div class="dh-chart-panel">
            <h3 class="dh-chart-title">Appointment Volume</h3>
            <p class="dh-chart-subtitle">Last 14 days</p>
            <div class="dh-chart-wrap" id="dhTrendChartWrap"></div>
        </div>
        <div class="dh-chart-panel">
            <h3 class="dh-chart-title">Appointments by Status</h3>
            <p class="dh-chart-subtitle">Last 30 days</p>
            <div class="dh-chart-wrap" id="dhStatusChartWrap"></div>
        </div>
    `;

    renderAppointmentTrendChart(document.getElementById("dhTrendChartWrap"), stats.appointment_trend || []);
    renderStatusBreakdownChart(document.getElementById("dhStatusChartWrap"), stats.appointment_status_breakdown || {});
}

/**
 * A line chart of daily appointment volume with a crosshair + tooltip that
 * snaps to the nearest day, keyboard-focusable the same as hover per the
 * dataviz interaction contract.
 */
function renderAppointmentTrendChart(container, trend)
{
    if (!container) {
        return;
    }

    if (!trend.length || trend.every((day) => day.count === 0)) {
        container.innerHTML = `<div class="dh-chart-empty">No appointment activity in the last 14 days.</div>`;
        return;
    }

    const width = 560;
    const height = 180;
    const padTop = 16;
    const padBottom = 24;
    const padLeft = 8;
    const padRight = 32;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;
    const baselineY = padTop + plotHeight;

    const maxCount = Math.max(1, ...trend.map((day) => day.count));
    const stepX = trend.length > 1 ? plotWidth / (trend.length - 1) : 0;

    const points = trend.map((day, i) => ({
        x: padLeft + stepX * i,
        y: padTop + plotHeight - (day.count / maxCount) * plotHeight,
        date: day.date,
        count: day.count
    }));

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const last = points[points.length - 1];
    const areaPath = `${linePath} L${last.x.toFixed(1)},${baselineY} L${points[0].x.toFixed(1)},${baselineY} Z`;

    container.innerHTML = "";

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "dh-chart-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute(
        "aria-label",
        `Appointment volume over the last 14 days, ending at ${last.count} on ${formatFullDate(last.date)}`
    );

    const baseline = document.createElementNS(SVG_NS, "line");
    baseline.setAttribute("x1", String(padLeft));
    baseline.setAttribute("x2", String(width - padRight));
    baseline.setAttribute("y1", String(baselineY));
    baseline.setAttribute("y2", String(baselineY));
    baseline.setAttribute("class", "dh-line-baseline");
    svg.appendChild(baseline);

    const area = document.createElementNS(SVG_NS, "path");
    area.setAttribute("d", areaPath);
    area.setAttribute("class", "dh-line-area");
    svg.appendChild(area);

    const line = document.createElementNS(SVG_NS, "path");
    line.setAttribute("d", linePath);
    line.setAttribute("class", "dh-line-path");
    svg.appendChild(line);

    const endLabel = document.createElementNS(SVG_NS, "text");
    endLabel.setAttribute("x", String(last.x - 4));
    endLabel.setAttribute("y", String(Math.max(12, last.y - 8)));
    endLabel.setAttribute("text-anchor", "end");
    endLabel.setAttribute("class", "dh-line-endlabel");
    endLabel.textContent = String(last.count);
    svg.appendChild(endLabel);

    const firstDateLabel = document.createElementNS(SVG_NS, "text");
    firstDateLabel.setAttribute("x", String(points[0].x));
    firstDateLabel.setAttribute("y", String(height - 4));
    firstDateLabel.setAttribute("class", "dh-line-axislabel");
    firstDateLabel.textContent = formatShortDate(points[0].date);
    svg.appendChild(firstDateLabel);

    const lastDateLabel = document.createElementNS(SVG_NS, "text");
    lastDateLabel.setAttribute("x", String(last.x));
    lastDateLabel.setAttribute("y", String(height - 4));
    lastDateLabel.setAttribute("text-anchor", "end");
    lastDateLabel.setAttribute("class", "dh-line-axislabel");
    lastDateLabel.textContent = formatShortDate(last.date);
    svg.appendChild(lastDateLabel);

    const crosshair = document.createElementNS(SVG_NS, "line");
    crosshair.setAttribute("y1", String(padTop));
    crosshair.setAttribute("y2", String(baselineY));
    crosshair.setAttribute("class", "dh-line-crosshair");
    svg.appendChild(crosshair);

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("r", "4");
    dot.setAttribute("class", "dh-line-dot");
    svg.appendChild(dot);

    const tooltip = document.createElement("div");
    tooltip.className = "dh-chart-tooltip";

    const hitWidth = plotWidth / trend.length;

    points.forEach((p) => {
        const hit = document.createElementNS(SVG_NS, "rect");
        hit.setAttribute("x", String(Math.max(0, p.x - hitWidth / 2)));
        hit.setAttribute("y", "0");
        hit.setAttribute("width", String(hitWidth));
        hit.setAttribute("height", String(height));
        hit.setAttribute("class", "dh-line-hit");
        hit.setAttribute("tabindex", "0");
        hit.setAttribute("role", "button");
        hit.setAttribute("aria-label", `${formatFullDate(p.date)}: ${p.count} appointment${p.count === 1 ? "" : "s"}`);

        const activate = () => {
            crosshair.setAttribute("x1", String(p.x));
            crosshair.setAttribute("x2", String(p.x));
            crosshair.style.opacity = "1";
            dot.setAttribute("cx", String(p.x));
            dot.setAttribute("cy", String(p.y));
            dot.style.opacity = "1";

            tooltip.innerHTML = "";

            const valueEl = document.createElement("strong");
            valueEl.textContent = `${p.count} appointment${p.count === 1 ? "" : "s"}`;
            tooltip.appendChild(valueEl);
            tooltip.appendChild(document.createElement("br"));
            tooltip.appendChild(document.createTextNode(formatFullDate(p.date)));

            tooltip.style.left = `${(p.x / width) * 100}%`;
            tooltip.style.top = `${(p.y / height) * 100}%`;
            tooltip.classList.add("visible");
        };

        const deactivate = () => {
            crosshair.style.opacity = "0";
            dot.style.opacity = "0";
            tooltip.classList.remove("visible");
        };

        hit.addEventListener("pointerenter", activate);
        hit.addEventListener("pointermove", activate);
        hit.addEventListener("pointerleave", deactivate);
        hit.addEventListener("focus", activate);
        hit.addEventListener("blur", deactivate);

        svg.appendChild(hit);
    });

    container.appendChild(svg);
    container.appendChild(tooltip);
}

/**
 * A horizontal bar breakdown of appointments by status, reusing this app's
 * existing status-badge colors so the chart and the badges elsewhere on
 * this page speak the same color language.
 */
function renderStatusBreakdownChart(container, breakdown)
{
    if (!container) {
        return;
    }

    const entries = Object.keys(APPOINTMENT_STATUS_META).map((key) => ({
        key,
        label: APPOINTMENT_STATUS_META[key].label,
        color: APPOINTMENT_STATUS_META[key].color,
        count: breakdown[key] || 0
    }));

    const total = entries.reduce((sum, entry) => sum + entry.count, 0);

    if (!total) {
        container.innerHTML = `<div class="dh-chart-empty">No appointments in the last 30 days.</div>`;
        return;
    }

    const maxCount = Math.max(...entries.map((entry) => entry.count), 1);

    container.innerHTML = "";

    const bars = document.createElement("div");
    bars.className = "dh-bars";

    const tooltip = document.createElement("div");
    tooltip.className = "dh-chart-tooltip";

    entries.forEach((entry) => {
        const pct = Math.round((entry.count / total) * 100);

        const row = document.createElement("div");
        row.className = "dh-bar-row";

        const label = document.createElement("div");
        label.className = "dh-bar-label";
        label.textContent = entry.label;

        const track = document.createElement("div");
        track.className = "dh-bar-track";
        track.setAttribute("tabindex", "0");
        track.setAttribute("role", "img");
        track.setAttribute("aria-label", `${entry.label}: ${entry.count} appointments, ${pct}%`);

        const fill = document.createElement("div");
        fill.className = "dh-bar-fill";
        fill.style.width = `${(entry.count / maxCount) * 100}%`;
        fill.style.background = entry.color;
        track.appendChild(fill);

        const value = document.createElement("div");
        value.className = "dh-bar-value";
        value.textContent = String(entry.count);

        const showTooltip = () => {
            row.classList.add("is-hovered");
            tooltip.innerHTML = "";

            const strong = document.createElement("strong");
            strong.textContent = `${entry.count} (${pct}%)`;
            tooltip.appendChild(strong);
            tooltip.appendChild(document.createElement("br"));
            tooltip.appendChild(document.createTextNode(entry.label));

            const rowRect = row.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            tooltip.style.left = `${rowRect.left - containerRect.left + rowRect.width / 2}px`;
            tooltip.style.top = `${rowRect.top - containerRect.top}px`;
            tooltip.classList.add("visible");
        };

        const hideTooltip = () => {
            row.classList.remove("is-hovered");
            tooltip.classList.remove("visible");
        };

        track.addEventListener("pointerenter", showTooltip);
        track.addEventListener("pointerleave", hideTooltip);
        track.addEventListener("focus", showTooltip);
        track.addEventListener("blur", hideTooltip);

        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(value);
        bars.appendChild(row);
    });

    container.appendChild(bars);
    container.appendChild(tooltip);
}

function formatShortDate(dateStr)
{
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(dateStr)
{
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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

function generateEmbeddedAiReportHtml(aiData) {
    const data = aiData.analysis || {};
    const warningsHtml = (data.warnings || []).map(w => `<li style="margin-bottom: 6px;">${escapeHtml(w)}</li>`).join("");
    const recsHtml = (data.recommendations || []).map(r => `<li style="margin-bottom: 6px;">${escapeHtml(r)}</li>`).join("");
    
    return `
        <div style="font-size: 13.5px; color: #29323f;">
            <p style="margin: 0 0 16px; font-style: italic; color: #55647c;">
                ${escapeHtml(data.summary || "")}
            </p>
            
            <h3 style="font-size: 14px; color: #b91c1c; margin: 0 0 8px;">Critical Warnings &amp; Contraindications</h3>
            <ul style="margin: 0 0 20px; padding-left: 20px;">
                ${warningsHtml || "<li>No warnings identified.</li>"}
            </ul>
            
            <h3 style="font-size: 14px; color: #047857; margin: 0 0 8px;">Recommendations &amp; Next Steps</h3>
            <ul style="margin: 0 0 20px; padding-left: 20px;">
                ${recsHtml || "<li>No specific recommendations.</li>"}
            </ul>
            
            <div style="font-size: 11.5px; color: #8b98ac; border-top: 1px solid #e5e9f0; padding-top: 12px; margin-top: 12px;">
                Disclaimer: This report is generated by Artificial Intelligence. It is intended to assist healthcare professionals and should not replace clinical judgement. Generated at ${escapeHtml(data.generated_at || new Date().toLocaleString())}
            </div>
        </div>
    `;
}
