import { fetchMyReminders } from "../patient-reminders/patient-reminders.service.js";
import { escapeHtml } from "../appointments/appointment-format.js";

let allRemindersData = [];
let activeFilter = "all";

export async function initHealthReminders()
{
    const dueList = document.getElementById("healthRemindersDue");
    const sentList = document.getElementById("healthRemindersSent");

    if (!dueList || !sentList) {
        return;
    }

    // Attach global schedule button
    const globalScheduleBtn = document.getElementById("hrBtnScheduleGlobal");
    if (globalScheduleBtn) {
        globalScheduleBtn.addEventListener("click", () => navigateToAppointments());
    }

    // Attach filter buttons
    const filterBtns = document.querySelectorAll(".hr-filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeFilter = btn.getAttribute("data-filter") || "all";
            applyFilterAndRender();
        });
    });

    try {
        const result = await fetchMyReminders();

        if (!result.success) {
            throw new Error(result.message);
        }

        allRemindersData = result.data || [];
        updateKpis(allRemindersData);
        applyFilterAndRender();

    } catch (error) {
        console.error("Failed to load health reminders", error);
        dueList.innerHTML = `<div class="hr-empty-box"><div class="hr-empty-icon">⚠️</div>Unable to load health reminders right now. Please try again later.</div>`;
        sentList.innerHTML = "";
    }
}

function updateKpis(reminders)
{
    const total = reminders.length;
    const pastDue = reminders.filter(r => !r.date_sent && r.due_status === "past_due").length;
    const dueNow = reminders.filter(r => !r.date_sent && r.due_status !== "past_due").length;
    const sent = reminders.filter(r => r.date_sent).length;

    const elTotal = document.getElementById("hrStatTotal");
    const elPastDue = document.getElementById("hrStatPastDue");
    const elDue = document.getElementById("hrStatDue");
    const elSent = document.getElementById("hrStatSent");

    const countAll = document.getElementById("hrCountAll");
    const countPastDue = document.getElementById("hrCountPastDue");
    const countDue = document.getElementById("hrCountDue");
    const countSent = document.getElementById("hrCountSent");

    if (elTotal) elTotal.textContent = total;
    if (elPastDue) elPastDue.textContent = pastDue;
    if (elDue) elDue.textContent = dueNow;
    if (elSent) elSent.textContent = sent;

    if (countAll) countAll.textContent = total;
    if (countPastDue) countPastDue.textContent = pastDue;
    if (countDue) countDue.textContent = dueNow;
    if (countSent) countSent.textContent = sent;
}

function applyFilterAndRender()
{
    const dueContainer = document.getElementById("healthRemindersDue");
    const sentContainer = document.getElementById("healthRemindersSent");
    const dueSection = document.getElementById("hrSectionDue");
    const sentSection = document.getElementById("hrSectionSent");

    if (!dueContainer || !sentContainer) return;

    let due = allRemindersData.filter(r => !r.date_sent);
    let sent = allRemindersData.filter(r => r.date_sent);

    if (activeFilter === "past_due") {
        due = due.filter(r => r.due_status === "past_due");
        if (dueSection) dueSection.style.display = "block";
        if (sentSection) sentSection.style.display = "none";
    } else if (activeFilter === "due") {
        due = due.filter(r => r.due_status !== "past_due");
        if (dueSection) dueSection.style.display = "block";
        if (sentSection) sentSection.style.display = "none";
    } else if (activeFilter === "sent") {
        if (dueSection) dueSection.style.display = "none";
        if (sentSection) sentSection.style.display = "block";
    } else {
        if (dueSection) dueSection.style.display = "block";
        if (sentSection) sentSection.style.display = "block";
    }

    renderCardList(dueContainer, due, "Nothing due right now — you are all caught up with your preventive care!");
    renderCardList(sentContainer, sent, "No completed or acknowledged reminders yet.");

    // Attach card schedule buttons
    document.querySelectorAll(".hr-btn-card-schedule").forEach(btn => {
        btn.addEventListener("click", () => {
            const itemTitle = btn.getAttribute("data-item") || "";
            navigateToAppointments(itemTitle);
        });
    });
}

function renderCardList(container, rows, emptyMessage)
{
    if (!rows || rows.length === 0) {
        container.innerHTML = `
            <div class="hr-empty-box">
                <div class="hr-empty-icon">✓</div>
                <div>${escapeHtml(emptyMessage)}</div>
            </div>
        `;
        return;
    }

    container.innerHTML = rows.map(reminderCard).join("");
}

function reminderCard(reminder)
{
    const isPastDue = !reminder.date_sent && reminder.due_status === "past_due";
    const isSent = Boolean(reminder.date_sent);

    let cardVariant = "hr-card-due";
    let badgeHtml = `<span class="hr-badge hr-badge-due"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Action Due</span>`;

    if (isPastDue) {
        cardVariant = "hr-card-past-due";
        badgeHtml = `<span class="hr-badge hr-badge-past-due"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Past Due</span>`;
    } else if (isSent) {
        cardVariant = "hr-card-sent";
        badgeHtml = `<span class="hr-badge hr-badge-sent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Sent / Handled</span>`;
    }

    // Parse category & title from item_label (e.g. "Assessment - Coumadin Management INR Monitoring")
    const rawLabel = reminder.item_label || "Health Reminder";
    let category = "Clinical Assessment";
    let title = rawLabel;

    if (rawLabel.includes(" - ")) {
        const parts = rawLabel.split(" - ");
        category = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    } else if (reminder.action_type) {
        category = reminder.action_type;
    }

    // Category styling
    let catBg = "#eff6ff";
    let catColor = "#1d4ed8";
    if (category.toLowerCase().includes("data entry")) {
        catBg = "#faf5ff";
        catColor = "#7e22ce";
    } else if (category.toLowerCase().includes("treatment") || category.toLowerCase().includes("rx")) {
        catBg = "#ecfdf5";
        catColor = "#047857";
    } else if (category.toLowerCase().includes("measurement")) {
        catBg = "#fff7ed";
        catColor = "#c2410c";
    }

    // Pick contextual icon
    const titleLower = title.toLowerCase();
    let iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
    let iconBg = "#eff6ff";

    if (titleLower.includes("coumadin") || titleLower.includes("inr") || titleLower.includes("blood") || titleLower.includes("cardiac")) {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
        iconBg = "#fef2f2";
    } else if (titleLower.includes("diabetes") || titleLower.includes("a1c") || titleLower.includes("glucose") || titleLower.includes("microalbumin")) {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg>`;
        iconBg = "#f0f9ff";
    } else if (titleLower.includes("allergy") || titleLower.includes("penicillin")) {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
        iconBg = "#fffbeb";
    } else if (titleLower.includes("eye") || titleLower.includes("vision")) {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        iconBg = "#faf5ff";
    } else if (titleLower.includes("foot") || titleLower.includes("podiatry")) {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 12h16M4 8h16"/></svg>`;
        iconBg = "#ecfdf5";
    } else if (titleLower.includes("social security") || titleLower.includes("number") || titleLower.includes("data entry")) {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>`;
        iconBg = "#eef2ff";
    }

    const datePrefix = reminder.date_sent ? "Sent" : "Identified";
    const dateValue = reminder.date_sent || reminder.date_created;
    const formattedDate = formatDate(dateValue);

    return `
        <div class="hr-card ${cardVariant}">
            <div class="hr-card-main">
                <div class="hr-card-icon-box" style="background: ${iconBg};">
                    ${iconSvg}
                </div>
                <div class="hr-card-content">
                    <span class="hr-card-category" style="background: ${catBg}; color: ${catColor};">
                        ${escapeHtml(category)}
                    </span>
                    <h3 class="hr-card-title">${escapeHtml(title)}</h3>
                    <div class="hr-card-meta">
                        <span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${datePrefix}: ${formattedDate}
                        </span>
                        <span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                            Status: ${isPastDue ? "Immediate Action Needed" : (isSent ? "Completed" : "Scheduled Check")}
                        </span>
                    </div>
                </div>
            </div>

            <div class="hr-card-actions">
                ${badgeHtml}
                <button type="button" class="hr-btn-schedule hr-btn-card-schedule" data-item="${escapeHtml(title)}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Schedule Visit
                </button>
            </div>
        </div>
    `;
}

function navigateToAppointments(contextItem = "")
{
    if (typeof window.__openDashboardTab === "function") {
        window.__openDashboardTab("appointments", "Appointments");
        return;
    }

    const apptLink = document.querySelector('a[data-tab="appointments"]');
    if (apptLink) {
        apptLink.click();
        return;
    }

    if (window.tabManager && typeof window.tabManager.openTab === "function") {
        window.tabManager.openTab("appointments", "Appointments");
    }
}

function formatDate(value)
{
    if (!value) return "-";

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
