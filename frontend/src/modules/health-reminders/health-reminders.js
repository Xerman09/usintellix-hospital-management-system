import { fetchMyReminders } from "../patient-reminders/patient-reminders.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { createAppointment, fetchAvailableSlots } from "../appointments/appointments.service.js";
import { formatApptTime, escapeHtml, toDateStr } from "../appointments/appointment-format.js";
import { showToast } from "../../core/toast.js";
import { systemNow } from "../../core/timezone.js";

let allRemindersData = [];
let activeFilter = "all";
let providersLoaded = false;
let selectedModalSlotTime = null;
let currentSchedulingReminder = null;

export async function initHealthReminders()
{
    const dueList = document.getElementById("healthRemindersDue");
    const sentList = document.getElementById("healthRemindersSent");

    if (!dueList || !sentList) {
        return;
    }

    // Setup modal listeners
    setupHealthReminderModal();

    // Attach global schedule button
    const globalScheduleBtn = document.getElementById("hrBtnScheduleGlobal");
    if (globalScheduleBtn) {
        globalScheduleBtn.addEventListener("click", () => openScheduleModal(null));
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
            const reminderId = btn.getAttribute("data-reminder-id");
            const reminder = allRemindersData.find(r => String(r.id) === String(reminderId));
            openScheduleModal(reminder);
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

    // Parse category & title from item_label
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
        <div class="hr-card ${cardVariant}" data-reminder-id="${reminder.id}">
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
                <button type="button" class="hr-btn-schedule hr-btn-card-schedule" data-reminder-id="${reminder.id}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Schedule Visit
                </button>
            </div>
        </div>
    `;
}

function getIconEmojiForTitle(title)
{
    const t = (title || "").toLowerCase();
    if (t.includes("coumadin") || t.includes("inr") || t.includes("blood") || t.includes("heart")) return "🩸";
    if (t.includes("diabetes") || t.includes("a1c") || t.includes("glucose") || t.includes("microalbumin")) return "🧪";
    if (t.includes("allergy") || t.includes("penicillin")) return "🛡️";
    if (t.includes("eye") || t.includes("vision")) return "👁️";
    if (t.includes("foot") || t.includes("podiatry")) return "🦶";
    if (t.includes("social security") || t.includes("number") || t.includes("data entry")) return "📋";
    return "🩺";
}

export async function openScheduleModal(reminder = null)
{
    currentSchedulingReminder = reminder;
    const overlay = document.getElementById("hrApptModalOverlay");
    if (!overlay) return;

    clearModalErrors();
    const alertEl = document.getElementById("hrModalAlert");
    if (alertEl) alertEl.innerHTML = "";

    // Load providers & facilities
    if (!providersLoaded) {
        providersLoaded = true;
        await loadModalPickers();
    }

    const today = toDateStr(systemNow());
    const dateInput = document.getElementById("hrModalDate");
    if (dateInput) {
        dateInput.min = today;
        if (!dateInput.value) dateInput.value = today;
    }

    // Auto-fill Reminder Details
    const banner = document.getElementById("hrModalReminderBanner");
    const bannerCategory = document.getElementById("hrModalBannerCategory");
    const bannerItem = document.getElementById("hrModalBannerItem");
    const bannerUrgency = document.getElementById("hrModalBannerUrgency");
    const bannerIcon = document.getElementById("hrModalBannerIcon");

    const reasonInput = document.getElementById("hrModalReason");
    const notesInput = document.getElementById("hrModalNotes");
    const titleEl = document.getElementById("hrModalTitle");

    if (reminder) {
        if (banner) banner.style.display = "flex";
        const rawLabel = reminder.item_label || "Health Reminder";
        const isPastDue = !reminder.date_sent && reminder.due_status === "past_due";
        const formattedDate = formatDate(reminder.date_sent || reminder.date_created);

        let category = "Clinical Assessment";
        let cleanTitle = rawLabel;
        if (rawLabel.includes(" - ")) {
            const parts = rawLabel.split(" - ");
            category = parts[0].trim();
            cleanTitle = parts.slice(1).join(" - ").trim();
        }

        if (titleEl) titleEl.textContent = `Schedule Visit: ${cleanTitle}`;
        if (bannerCategory) bannerCategory.textContent = category.toUpperCase();
        if (bannerItem) bannerItem.textContent = rawLabel;
        if (bannerUrgency) {
            bannerUrgency.textContent = isPastDue ? "⚠️ Past Due" : "⏱️ Action Due";
            bannerUrgency.style.background = isPastDue ? "#fef2f2" : "#eff6ff";
            bannerUrgency.style.color = isPastDue ? "#dc2626" : "#2563eb";
        }
        if (bannerIcon) bannerIcon.textContent = getIconEmojiForTitle(cleanTitle);

        // AUTO-FILL Reason for Visit
        if (reasonInput) {
            reasonInput.value = `Health Reminder: ${rawLabel}`;
        }

        // AUTO-FILL Additional Notes
        if (notesInput) {
            notesInput.value = `Scheduled in response to clinical reminder: ${rawLabel} (${isPastDue ? 'Past Due' : 'Due Now'}). Identified on ${formattedDate}.`;
        }

    } else {
        if (banner) banner.style.display = "none";
        if (titleEl) titleEl.textContent = "Schedule General Clinical Visit";
        if (reasonInput) reasonInput.value = "General Preventive Health Checkup";
        if (notesInput) notesInput.value = "Routine health maintenance and clinical assessments review.";
    }

    // Auto-select first provider if none selected
    const providerSelect = document.getElementById("hrModalProvider");
    if (providerSelect && providerSelect.options.length > 1 && !providerSelect.value) {
        providerSelect.selectedIndex = 1;
    }

    // Load available slots
    loadModalSlots();

    overlay.classList.add("open");
}

function setupHealthReminderModal()
{
    const overlay = document.getElementById("hrApptModalOverlay");
    const closeBtn = document.getElementById("hrModalCloseBtn");
    const cancelBtn = document.getElementById("hrModalCancelBtn");
    const form = document.getElementById("hrModalForm");
    const providerSelect = document.getElementById("hrModalProvider");
    const facilitySelect = document.getElementById("hrModalFacility");
    const dateInput = document.getElementById("hrModalDate");

    if (!overlay || !form) return;

    const closeModal = () => {
        overlay.classList.remove("open");
        selectedModalSlotTime = null;
        currentSchedulingReminder = null;
    };

    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    providerSelect?.addEventListener("change", loadModalSlots);
    dateInput?.addEventListener("change", loadModalSlots);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearModalErrors();
        const alertEl = document.getElementById("hrModalAlert");
        if (alertEl) alertEl.innerHTML = "";

        const providerId = providerSelect?.value;
        const date = dateInput?.value;
        const reason = document.getElementById("hrModalReason")?.value.trim() || "";
        const notes = document.getElementById("hrModalNotes")?.value.trim() || "";
        const facilityId = facilitySelect?.value || null;

        let hasError = false;
        if (!providerId) {
            showModalError("provider_id", "Please select a provider.");
            hasError = true;
        }
        if (!date) {
            showModalError("appointment_date", "Please select a date.");
            hasError = true;
        }
        if (!selectedModalSlotTime) {
            showModalError("appointment_time", "Please choose an available appointment time slot.");
            hasError = true;
        }
        if (!reason) {
            showModalError("reason", "Please provide a reason for the visit.");
            hasError = true;
        }

        if (hasError) return;

        const submitBtn = document.getElementById("hrModalSubmitBtn");
        const originalLabel = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.textContent = "Requesting Appointment...";

        try {
            const result = await createAppointment({
                provider_id: providerId,
                facility_id: facilityId || null,
                appointment_date: date,
                appointment_time: selectedModalSlotTime,
                reason: reason,
                notes: notes || null
            });

            if (!result.success) {
                if (alertEl) alertEl.innerHTML = `<div class="form-alert error" style="background: #fef2f2; color: #b91c1c; padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #fecaca; font-size: 13px;">${escapeHtml(result.message || "Failed to schedule appointment.")}</div>`;
                return;
            }

            if (typeof showToast === "function") {
                showToast("Appointment successfully requested! Added to your schedule.", "success");
            }

            // Visually mark the reminder card
            if (currentSchedulingReminder) {
                const card = document.querySelector(`[data-reminder-id="${currentSchedulingReminder.id}"]`);
                if (card) {
                    const actionWrap = card.querySelector(".hr-card-actions");
                    if (actionWrap) {
                        actionWrap.innerHTML = `<span class="hr-badge hr-badge-sent" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 600;">✓ Appointment Requested</span>`;
                    }
                }
            }

            closeModal();

        } catch (err) {
            console.error("Failed to request appointment from reminder", err);
            if (alertEl) alertEl.innerHTML = `<div class="form-alert error" style="background: #fef2f2; color: #b91c1c; padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #fecaca; font-size: 13px;">${escapeHtml(err.message || "Unable to submit appointment request.")}</div>`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalLabel;
        }
    });
}

async function loadModalPickers()
{
    const providerSelect = document.getElementById("hrModalProvider");
    const facilitySelect = document.getElementById("hrModalFacility");

    try {
        const result = await fetchProviders();
        if (result.success && providerSelect) {
            providerSelect.innerHTML = `<option value="">Select healthcare provider</option>`;
            (result.data || []).forEach((provider) => {
                const name = [provider.first_name, provider.last_name].filter(Boolean).join(" ");
                const option = document.createElement("option");
                option.value = provider.id;
                option.textContent = provider.specialty ? `Dr. ${name} — ${provider.specialty}` : `Dr. ${name}`;
                providerSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Failed to load providers", error);
    }

    try {
        const result = await fetchFacilities();
        if (result.success && facilitySelect) {
            facilitySelect.innerHTML = `<option value="">Any available facility</option>`;
            (result.data || []).forEach((facility) => {
                const option = document.createElement("option");
                option.value = facility.id;
                option.textContent = facility.name;
                facilitySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Failed to load facilities", error);
    }
}

async function loadModalSlots()
{
    const providerSelect = document.getElementById("hrModalProvider");
    const dateInput = document.getElementById("hrModalDate");
    const picker = document.getElementById("hrModalSlotPicker");

    if (!providerSelect || !dateInput || !picker) return;

    const providerId = providerSelect.value;
    const date = dateInput.value;
    selectedModalSlotTime = null;

    if (!providerId || !date) {
        picker.innerHTML = `<div class="appt-slot-empty">Choose a provider and date to see open appointment times.</div>`;
        return;
    }

    picker.innerHTML = `<div class="appt-slot-empty">Loading available times...</div>`;

    try {
        const result = await fetchAvailableSlots({ provider_id: providerId, start_date: date, days: 1 });

        if (!result.success || !result.data?.length) {
            picker.innerHTML = `<div class="appt-slot-empty">Unable to load available times.</div>`;
            return;
        }

        const slots = result.data[0]?.slots || [];

        if (!slots.length) {
            picker.innerHTML = `<div class="appt-slot-empty">No times found for this date.</div>`;
            return;
        }

        if (!slots.some((slot) => slot.available)) {
            picker.innerHTML = `<div class="appt-slot-empty">This provider is fully booked on this date. Try another date.</div>`;
            return;
        }

        picker.innerHTML = `<div class="appt-slot-grid">${slots.map((slot) => `
            <button type="button" class="appt-slot-btn ${slot.available ? "" : "unavailable"}" data-time="${slot.time}" ${slot.available ? "" : "disabled"}>${formatApptTime(slot.time)}</button>
        `).join("")}</div>`;

        picker.querySelectorAll(".appt-slot-btn:not(.unavailable)").forEach((btn) => {
            btn.addEventListener("click", () => {
                picker.querySelectorAll(".appt-slot-btn").forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedModalSlotTime = btn.getAttribute("data-time");
                clearModalErrors();
            });
        });
    } catch (error) {
        console.error("Failed to load available slots", error);
        picker.innerHTML = `<div class="appt-slot-empty">Unable to load available times.</div>`;
    }
}

function showModalError(field, message)
{
    const errorEl = document.getElementById(`hr-err-${field}`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = "block";
    }
}

function clearModalErrors()
{
    document.querySelectorAll('[id^="hr-err-"]').forEach((el) => {
        el.textContent = "";
        el.style.display = "none";
    });
}

function formatDate(value)
{
    if (!value) return "-";

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
