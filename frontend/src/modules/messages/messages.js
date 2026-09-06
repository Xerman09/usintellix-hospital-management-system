import { getUser } from "../../core/session.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import {
    fetchMyMessages, fetchRecipientOptions, createConversation, sendMessage, deleteMessage,
    fetchMessageTypes, fetchMessageStatuses
} from "./messages.service.js";
import { fetchMyRecalls, createRecall } from "../recalls/recalls.service.js";
import { RecallsView } from "../recalls/recalls.view.js";
import { initRecalls } from "../recalls/recalls.js";
import { fetchMyReminders, createReminder, completeReminder } from "../reminders/reminders.service.js";

let messagesCache = [];
let selectedIds = new Set();
let typeOptions = [];
let statusOptions = [];
let recipientLookup = new Map();
let patientLookup = new Map();

let recallsCache = [];
let recallPatientLookup = new Map();

let remindersCache = [];
let reminderPatientLookup = new Map();

export async function initMessages()
{
    const root = document.querySelector(".msg-page");

    if (!root || root.dataset.initialized) {
        return;
    }

    root.dataset.initialized = "1";

    await loadCatalogOptions();

    setupSectionTabs();
    setupFilters();
    setupSelection();
    await setupAddMessageModal();
    await setupReminders();
    await setupRecalls();

    document.getElementById("msgScopeFilter").addEventListener("change", loadMyMessages);

    await loadMyMessages();
}

async function loadCatalogOptions()
{
    const [typesResult, statusesResult] = await Promise.all([
        fetchMessageTypes(),
        fetchMessageStatuses()
    ]);

    typeOptions = typesResult.success ? typesResult.data : [];
    statusOptions = statusesResult.success ? statusesResult.data : [];

    fillOptions(document.getElementById("msgFilterType"), typeOptions, "All Types");
    fillOptions(document.getElementById("msgFilterStatus"), statusOptions, "All Statuses");
}

function fillOptions(select, items, placeholder)
{
    const current = select.value;

    select.innerHTML = `<option value="">${placeholder}</option>` +
        items.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("");

    select.value = current;
}

function setupSectionTabs()
{
    const tabs = document.querySelectorAll("#msgSectionTabs .modal-tab");
    const panels = document.querySelectorAll("[data-section-panel]");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            document
                .querySelector(`[data-section-panel="${tab.getAttribute("data-section")}"]`)
                .classList.add("active");
        });
    });
}

function setupFilters()
{
    const toggles = document.querySelectorAll("[data-filter-toggle]");

    const inputFor = {
        from: document.getElementById("msgFilterFrom"),
        patients: document.getElementById("msgFilterPatients"),
        type: document.getElementById("msgFilterType"),
        date: document.getElementById("msgFilterDate"),
        status: document.getElementById("msgFilterStatus")
    };

    toggles.forEach((toggle) => {
        const key = toggle.getAttribute("data-filter-toggle");
        const input = inputFor[key];

        toggle.addEventListener("change", () => {
            input.hidden = !toggle.checked;

            if (!toggle.checked) {
                input.value = "";
            }

            renderMyMessagesTable();
        });
    });

    Object.values(inputFor).forEach((input) => {
        input.addEventListener("input", renderMyMessagesTable);
        input.addEventListener("change", renderMyMessagesTable);
    });
}

function setupSelection()
{
    const selectAll = document.getElementById("msgSelectAll");
    const deleteBtn = document.getElementById("deleteSelectedMessagesBtn");

    selectAll.addEventListener("change", () => {
        selectedIds = selectAll.checked
            ? new Set(getFilteredMessages().map((m) => m.id))
            : new Set();

        document.querySelectorAll("#myMessagesTableBody [data-row-select]").forEach((box) => {
            box.checked = selectAll.checked;
        });

        updateDeleteButtonState();
    });

    deleteBtn.addEventListener("click", async () => {
        if (!selectedIds.size) {
            return;
        }

        if (!confirm(`Delete ${selectedIds.size} selected message(s)?`)) {
            return;
        }

        for (const id of selectedIds) {
            await deleteMessage(id);
        }

        selectedIds = new Set();
        showListAlert("Message(s) deleted successfully.", "success");
        await loadMyMessages();
    });
}

function updateDeleteButtonState()
{
    document.getElementById("deleteSelectedMessagesBtn").disabled = selectedIds.size === 0;

    const selectAll = document.getElementById("msgSelectAll");
    const visible = getFilteredMessages();

    selectAll.checked = visible.length > 0 && visible.every((m) => selectedIds.has(m.id));
}

async function setupAddMessageModal()
{
    const user = getUser();
    const modalOverlay = document.getElementById("addMessageModalOverlay");
    const form = document.getElementById("addMessageForm");
    const patientFieldGroup = document.getElementById("msgPatientFieldGroup");

    setupSearchClear("msg_recipient_search", "msgRecipientClear");
    setupSearchClear("msg_patient_search", "msgPatientClear");

    const openModal = async () => {
        form.reset();
        document.getElementById("formAlert").innerHTML = "";
        document.getElementById("err-recipient_id").textContent = "";
        document.getElementById("err-body").textContent = "";
        document.getElementById("msg_recipient_search").value = "";
        document.getElementById("msg_patient_search").value = "";

        fillOptions(document.getElementById("msg_type_id"), typeOptions, "Select type");
        fillOptions(document.getElementById("msg_status_id"), statusOptions, "Select status");

        patientFieldGroup.style.display = user?.role === "patient" ? "none" : "";

        await Promise.all([
            loadRecipientOptions(),
            user?.role === "patient" ? Promise.resolve() : loadPatientOptions()
        ]);

        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
    };

    document.getElementById("openAddMessageModal").addEventListener("click", openModal);
    document.getElementById("closeAddMessageModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddMessage").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-recipient_id").textContent = "";
        document.getElementById("err-body").textContent = "";

        const recipientId = recipientLookup.get(document.getElementById("msg_recipient_search").value.trim()) ?? "";
        const typeId = document.getElementById("msg_type_id").value;
        const statusId = document.getElementById("msg_status_id").value;
        const patientId = patientLookup.get(document.getElementById("msg_patient_search").value.trim()) ?? "";
        const body = document.getElementById("msg_body").value.trim();

        if (!recipientId) {
            document.getElementById("err-recipient_id").textContent = "Choose a recipient.";
            return;
        }

        if (!body) {
            document.getElementById("err-body").textContent = "Message body is required.";
            return;
        }

        const conversationResult = await createConversation({
            participant_ids: [Number(recipientId)]
        });

        if (!conversationResult.success) {
            showAlert("formAlert", conversationResult.message || "Failed to start conversation.", "error");
            return;
        }

        const conversationId = conversationResult.data.conversation_id;
        const messageResult = await sendMessage(conversationId, body, {
            type_id: typeId || null,
            status_id: statusId || null,
            patient_id: patientId || null
        });

        if (!messageResult.success) {
            showAlert("formAlert", messageResult.message || "Failed to send message.", "error");
            return;
        }

        closeModal();
        showListAlert("Message sent successfully.", "success");
        await loadMyMessages();
    });
}

function setupSearchClear(inputId, clearBtnId)
{
    const input = document.getElementById(inputId);

    document.getElementById(clearBtnId).addEventListener("click", () => {
        input.value = "";
        input.focus();
    });
}

async function loadRecipientOptions()
{
    const datalist = document.getElementById("msgRecipientDatalist");

    datalist.innerHTML = "";
    recipientLookup = new Map();

    const result = await fetchRecipientOptions();

    if (!result.success) {
        return;
    }

    result.data.forEach((recipient) => {
        const label = `${recipient.display_name} (${capitalize(recipient.role)})`;

        recipientLookup.set(label, String(recipient.id));

        const option = document.createElement("option");

        option.value = label;

        datalist.appendChild(option);
    });
}

async function loadPatientOptions()
{
    const datalist = document.getElementById("msgPatientDatalist");

    datalist.innerHTML = "";
    patientLookup = new Map();

    const result = await fetchPatients();

    if (!result.success) {
        return;
    }

    result.data.forEach((patient) => {
        const label = `${[patient.first_name, patient.last_name].filter(Boolean).join(" ")} (${patient.patient_no})`;

        patientLookup.set(label, String(patient.id));

        const option = document.createElement("option");

        option.value = label;

        datalist.appendChild(option);
    });
}

async function loadMyMessages()
{
    const scope = document.getElementById("msgScopeFilter").value;
    const result = await fetchMyMessages(scope);

    messagesCache = result.success ? result.data : [];
    selectedIds = new Set();

    renderMyMessagesTable();
}

function getFilteredMessages()
{
    const from = document.getElementById("msgFilterFrom").value.trim().toLowerCase();
    const patients = document.getElementById("msgFilterPatients").value.trim().toLowerCase();
    const type = document.getElementById("msgFilterType").value;
    const date = document.getElementById("msgFilterDate").value;
    const status = document.getElementById("msgFilterStatus").value;

    return messagesCache.filter((message) => {
        if (from && !(message.sender_name || "").toLowerCase().includes(from)) {
            return false;
        }

        if (patients && !(message.patient_name || "").toLowerCase().includes(patients)) {
            return false;
        }

        if (type && String(message.type_id) !== type) {
            return false;
        }

        if (date && (message.created_at || "").slice(0, 10) !== date) {
            return false;
        }

        if (status && String(message.status_id) !== status) {
            return false;
        }

        return true;
    });
}

function renderMyMessagesTable()
{
    const tbody = document.getElementById("myMessagesTableBody");
    const countText = document.getElementById("msgCountText");
    const user = getUser();

    const messages = getFilteredMessages();

    countText.textContent = `${messages.length} ${messages.length === 1 ? "message" : "messages"}`;

    if (!messages.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="msg-empty-state">
                    <strong>No messages found</strong>
                    <p>Try adjusting your filters, or send a new message.</p>
                </td>
            </tr>
        `;
        updateDeleteButtonState();
        return;
    }

    tbody.innerHTML = messages.map((message) => {
        const isUnread = Boolean(Number(message.is_unread));
        const isInactive = message.deleted_at !== null;
        const senderLabel = message.sender_id === user?.id ? "You" : escapeHtml(message.sender_name);

        const statusBadge = isInactive
            ? `<span class="msg-badge inactive">Inactive</span>`
            : `<span class="msg-badge neutral">${message.status_name ? escapeHtml(message.status_name) : "&mdash;"}</span>`;

        return `
        <tr class="${isUnread && !isInactive ? "unread" : ""}">
            <td><input type="checkbox" data-row-select value="${message.id}" ${selectedIds.has(message.id) ? "checked" : ""}></td>
            <td>${senderLabel}</td>
            <td>${escapeHtml(message.type_name || "—")}</td>
            <td>${escapeHtml(message.patient_name || "—")}</td>
            <td>${escapeHtml(truncate(message.body, 80))}</td>
            <td>${escapeHtml((message.created_at || "").slice(0, 16).replace("T", " "))}</td>
            <td>${statusBadge}</td>
        </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-row-select]").forEach((box) => {
        box.addEventListener("change", () => {
            const id = Number(box.value);

            if (box.checked) {
                selectedIds.add(id);
            } else {
                selectedIds.delete(id);
            }

            updateDeleteButtonState();
        });
    });

    updateDeleteButtonState();
}

function truncate(text, length)
{
    const value = text || "";

    return value.length > length ? `${value.slice(0, length)}...` : value;
}

function capitalize(value)
{
    const text = value || "";

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

const alertTimers = new Map();

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;

    scheduleAlertClear(containerId);
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;

    scheduleAlertClear("listAlert");
}

function scheduleAlertClear(containerId)
{
    if (alertTimers.has(containerId)) {
        clearTimeout(alertTimers.get(containerId));
    }

    const timer = setTimeout(() => {
        const container = document.getElementById(containerId);

        if (container) {
            container.innerHTML = "";
        }

        alertTimers.delete(containerId);
    }, 3000);

    alertTimers.set(containerId, timer);
}


async function setupRecalls()
{
    const user = getUser();
    const isStaff = user?.role !== "patient";

    document.getElementById("recallAddBtnWrap").style.display = isStaff ? "" : "none";
    document.getElementById("recallPatientFieldGroup").style.display = isStaff ? "" : "none";

    await Promise.all([
        loadRecallFacilityOptions(),
        loadRecallProviderOptions(),
        isStaff ? loadRecallPatientOptions() : Promise.resolve()
    ]);

    setupSearchClear("recall_patient_search", "recallPatientClear");
    setupRecallFormModal();

    document.getElementById("goToRecallBoard").addEventListener("click", goToRecallBoard);

    await loadRecalls();
}

async function loadRecallFacilityOptions()
{
    const formSelect = document.getElementById("recall_facility_id");

    const result = await fetchFacilities();
    const facilities = result.success ? result.data : [];

    const options = facilities.map((facility) => `<option value="${facility.id}">${escapeHtml(facility.name)}</option>`).join("");

    formSelect.innerHTML = `<option value="">Select facility</option>` + options;
}

async function loadRecallProviderOptions()
{
    const formSelect = document.getElementById("recall_provider_id");

    const result = await fetchProviders();
    const providers = result.success ? result.data : [];

    const options = providers.map((provider) => {
        const label = [provider.first_name, provider.last_name].filter(Boolean).join(" ");
        return `<option value="${provider.id}">${escapeHtml(label)}</option>`;
    }).join("");

    formSelect.innerHTML = `<option value="">Select provider</option>` + options;
}

async function loadRecallPatientOptions()
{
    const datalist = document.getElementById("recallPatientDatalist");

    datalist.innerHTML = "";
    recallPatientLookup = new Map();

    const result = await fetchPatients();

    if (!result.success) {
        return;
    }

    result.data.forEach((patient) => {
        const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(" ");
        const label = `${fullName} (${patient.patient_no})`;

        recallPatientLookup.set(label, { id: String(patient.id), birthdate: patient.birthdate });

        const option = document.createElement("option");

        option.value = label;

        datalist.appendChild(option);
    });
}

function calculateAge(birthdate)
{
    if (!birthdate) {
        return null;
    }

    const dob = new Date(birthdate);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
}

function renderPatientDobAge(birthdate)
{
    const el = document.getElementById("recall_patient_dob_age");

    if (!birthdate) {
        el.textContent = "—";
        return;
    }

    const age = calculateAge(birthdate);

    el.textContent = `${birthdate} (${age} ${age === 1 ? "yr" : "yrs"} old)`;
}

function setupRecallFormModal()
{
    const modalOverlay = document.getElementById("recallFormModalOverlay");
    const form = document.getElementById("recallForm");

    const resetForm = () => {
        form.reset();
        document.getElementById("recall_id").value = "";
        document.getElementById("recall_patient_search").value = "";
        document.getElementById("recall_status").value = "pending";
        document.getElementById("recallFormAlert").innerHTML = "";
        document.getElementById("err-patient_id").textContent = "";
        document.getElementById("err-recall_date").textContent = "";
        document.getElementById("err-provider_id").textContent = "";
        document.getElementById("err-facility_id").textContent = "";
        document.getElementById("err-reason").textContent = "";
        renderPatientDobAge(null);
    };

    const openAddModal = () => {
        resetForm();
        document.getElementById("recallFormModalTitle").textContent = "New Recall";
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("openAddRecallModal").addEventListener("click", openAddModal);
    document.getElementById("closeRecallFormModal").addEventListener("click", closeModal);
    document.getElementById("cancelRecallForm").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.getElementById("recall_patient_search").addEventListener("input", (event) => {
        const patient = recallPatientLookup.get(event.target.value.trim());

        renderPatientDobAge(patient ? patient.birthdate : null);
    });

    document.querySelectorAll('input[name="recall_date_quickpick"]').forEach((radio) => {
        radio.addEventListener("change", () => {
            const years = Number(radio.value);
            const target = new Date();

            target.setFullYear(target.getFullYear() + years);

            document.getElementById("recall_date").value = target.toISOString().slice(0, 10);
        });
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-patient_id").textContent = "";
        document.getElementById("err-recall_date").textContent = "";
        document.getElementById("err-provider_id").textContent = "";
        document.getElementById("err-facility_id").textContent = "";
        document.getElementById("err-reason").textContent = "";

        const patient = recallPatientLookup.get(document.getElementById("recall_patient_search").value.trim());
        const facilityId = document.getElementById("recall_facility_id").value;
        const providerId = document.getElementById("recall_provider_id").value;
        const recallDate = document.getElementById("recall_date").value;

        const data = {
            facility_id: facilityId || null,
            provider_id: providerId || null,
            recall_date: recallDate || null,
            reason: document.getElementById("recall_reason").value.trim() || null,
            status: document.getElementById("recall_status").value,
            notes: document.getElementById("recall_notes").value.trim() || null
        };

        let hasError = false;

        if (!patient) {
            document.getElementById("err-patient_id").textContent = "Choose a patient.";
            hasError = true;
        }

        if (!recallDate) {
            document.getElementById("err-recall_date").textContent = "Recall date is required.";
            hasError = true;
        }

        if (!providerId) {
            document.getElementById("err-provider_id").textContent = "Provider is required.";
            hasError = true;
        }

        if (!facilityId) {
            document.getElementById("err-facility_id").textContent = "Facility is required.";
            hasError = true;
        }

        if (hasError) {
            return;
        }

        const result = await createRecall({ ...data, patient_id: patient.id });

        if (!result.success) {
            showAlert("recallFormAlert", result.message || "Failed to save recall.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert("Recall scheduled successfully.", "success");
        await loadRecalls();
    });
}

async function loadRecalls()
{
    const result = await fetchMyRecalls();

    recallsCache = result.success ? result.data : [];

    renderRecallsMiniList();
}

function renderRecallsMiniList()
{
    const container = document.getElementById("recallsMiniList");

    const upcoming = recallsCache.filter((recall) => recall.status === "pending").slice(0, 5);

    if (!upcoming.length) {
        container.innerHTML = `<p class="table-empty">No recalls registered yet.</p>`;
        return;
    }

    container.innerHTML = upcoming.map((recall) => {
        const patientName = escapeHtml([recall.patient_first_name, recall.patient_last_name].filter(Boolean).join(" ") || "—");

        return `
        <div class="rec-mini-item">
            <div class="rec-mini-info">
                <strong>${patientName}</strong>
                <span>${escapeHtml(recall.reason || "No reason specified")}</span>
            </div>
            <div class="rec-mini-date">
                <span>${escapeHtml(recall.recall_date || "—")}</span>
            </div>
        </div>
        `;
    }).join("");
}

function goToRecallBoard()
{
    window.tabManager.openTab("recalls", "Recalls", () => {
        setTimeout(initRecalls, 0);
        return RecallsView();
    }, true);
}

async function setupReminders()
{
    const user = getUser();
    const isStaff = user?.role !== "patient";

    document.getElementById("reminderPatientFieldGroup").style.display = isStaff ? "" : "none";

    await Promise.all([
        loadReminderRecipientOptions(),
        isStaff ? loadReminderPatientOptions() : Promise.resolve()
    ]);

    setupSearchClear("reminder_patient_search", "reminderPatientClear");
    setupReminderFormModal();
    setupReminderLogModal();

    await loadReminders();
}

async function loadReminderRecipientOptions()
{
    const select = document.getElementById("reminder_recipients_select");
    const user = getUser();

    select.innerHTML = "";

    if (user?.id) {
        const myselfOption = document.createElement("option");

        myselfOption.value = String(user.id);
        myselfOption.textContent = "Myself";

        select.appendChild(myselfOption);
    }

    const result = await fetchRecipientOptions();

    if (!result.success) {
        return;
    }

    result.data.forEach((recipient) => {
        const option = document.createElement("option");

        option.value = String(recipient.id);
        option.textContent = `${recipient.display_name} (${capitalize(recipient.role)})`;

        select.appendChild(option);
    });
}

async function loadReminderPatientOptions()
{
    const datalist = document.getElementById("reminderPatientDatalist");

    datalist.innerHTML = "";
    reminderPatientLookup = new Map();

    const result = await fetchPatients();

    if (!result.success) {
        return;
    }

    result.data.forEach((patient) => {
        const label = `${[patient.first_name, patient.last_name].filter(Boolean).join(" ")} (${patient.patient_no})`;

        reminderPatientLookup.set(label, String(patient.id));

        const option = document.createElement("option");

        option.value = label;

        datalist.appendChild(option);
    });
}

function setupReminderFormModal()
{
    const modalOverlay = document.getElementById("reminderFormModalOverlay");
    const form = document.getElementById("reminderForm");
    const bodyInput = document.getElementById("reminder_body");
    const charsRemaining = document.getElementById("reminderCharsRemaining");

    const resetForm = () => {
        form.reset();
        document.getElementById("reminder_patient_search").value = "";
        document.getElementById("reminderFormAlert").innerHTML = "";
        document.getElementById("err-recipient_ids").textContent = "";
        document.getElementById("err-body").textContent = "";
        document.querySelectorAll("#reminder_recipients_select option").forEach((opt) => {
            opt.selected = false;
        });
        charsRemaining.value = "160";
    };

    const openModal = () => {
        resetForm();
        renderReminderSentToday();
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("openAddReminderModal").addEventListener("click", openModal);
    document.getElementById("closeReminderFormModal").addEventListener("click", closeModal);
    document.getElementById("resetReminderForm").addEventListener("click", resetForm);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.getElementById("reminderSelectAllRecipients").addEventListener("click", () => {
        document.querySelectorAll("#reminder_recipients_select option").forEach((opt) => {
            opt.selected = true;
        });
    });

    bodyInput.addEventListener("input", () => {
        charsRemaining.value = String(160 - bodyInput.value.length);
    });

    document.getElementById("reminder_time_span").addEventListener("change", (event) => {
        const span = event.target.value;

        if (!span) {
            return;
        }

        const amount = parseInt(span, 10);
        const unit = span.slice(-1);
        const target = new Date();

        if (unit === "d") {
            target.setDate(target.getDate() + amount);
        } else if (unit === "w") {
            target.setDate(target.getDate() + (amount * 7));
        } else if (unit === "m") {
            target.setMonth(target.getMonth() + amount);
        } else if (unit === "y") {
            target.setFullYear(target.getFullYear() + amount);
        }

        document.getElementById("reminder_due_date").value = target.toISOString().slice(0, 10);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-recipient_ids").textContent = "";
        document.getElementById("err-body").textContent = "";

        const recipientIds = Array.from(document.getElementById("reminder_recipients_select").selectedOptions)
            .map((opt) => Number(opt.value));
        const patientId = reminderPatientLookup.get(document.getElementById("reminder_patient_search").value.trim()) ?? "";
        const dueDate = document.getElementById("reminder_due_date").value;
        const priority = document.querySelector('input[name="reminder_priority"]:checked')?.value || "low";
        const requireEachComplete = document.getElementById("reminder_require_each_complete").checked;
        const messageBody = bodyInput.value.trim();

        let hasError = false;

        if (!recipientIds.length) {
            document.getElementById("err-recipient_ids").textContent = "Choose at least one recipient.";
            hasError = true;
        }

        if (!messageBody) {
            document.getElementById("err-body").textContent = "Message is required.";
            hasError = true;
        }

        if (hasError) {
            return;
        }

        const result = await createReminder({
            recipient_ids: recipientIds,
            patient_id: patientId || null,
            due_date: dueDate || null,
            priority,
            require_each_complete: requireEachComplete,
            body: messageBody
        });

        if (!result.success) {
            showAlert("reminderFormAlert", result.message || "Failed to send reminder.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        resetForm();
        showListAlert("Reminder sent successfully.", "success");
        await loadReminders();
        renderReminderSentToday();
    });
}

function renderReminderSentToday()
{
    const container = document.getElementById("reminderSentTodayList");
    const user = getUser();
    const today = new Date().toISOString().slice(0, 10);

    const sentToday = remindersCache.filter((reminder) =>
        reminder.sender_id === user?.id && (reminder.created_at || "").slice(0, 10) === today);

    if (!sentToday.length) {
        container.innerHTML = `<p class="table-empty">No Messages Found</p>`;
        return;
    }

    container.innerHTML = sentToday.map((reminder) => `
        <div class="rec-mini-item">
            <div class="rec-mini-info">
                <strong>${escapeHtml(truncate(reminder.body, 60))}</strong>
                <span>${escapeHtml(reminder.patient_name || "No patient linked")}</span>
            </div>
            <div class="rec-mini-date">
                <span>${escapeHtml((reminder.created_at || "").slice(11, 16))}</span>
            </div>
        </div>
    `).join("");
}

async function loadReminders()
{
    const result = await fetchMyReminders();

    remindersCache = result.success ? result.data : [];

    renderRemindersMiniList();
}

function renderRemindersMiniList()
{
    const container = document.getElementById("remindersMiniList");

    const pending = remindersCache.filter((reminder) =>
        Boolean(Number(reminder.is_recipient)) && !reminder.my_completed_at);

    if (!pending.length) {
        container.innerHTML = `<p class="table-empty">No Reminders</p>`;
        return;
    }

    container.innerHTML = pending.map((reminder) => {
        const patientName = escapeHtml(reminder.patient_name || "No patient linked");

        return `
        <div class="rec-mini-item">
            <div class="rec-mini-info">
                <strong>${escapeHtml(truncate(reminder.body, 80))}</strong>
                <span>From ${escapeHtml(reminder.sender_name || "—")} &middot; ${patientName}</span>
            </div>
            <div class="rec-mini-date">
                <span class="rem-priority-badge ${escapeHtml(reminder.priority || "low")}">${escapeHtml(reminder.priority || "low")}</span>
                <span>${escapeHtml(reminder.due_date || "No due date")}</span>
                <button type="button" class="rem-complete-btn" data-reminder-complete="${reminder.id}">Mark Completed</button>
            </div>
        </div>
        `;
    }).join("");

    container.querySelectorAll("[data-reminder-complete]").forEach((button) => {
        button.addEventListener("click", async () => {
            const id = Number(button.getAttribute("data-reminder-complete"));

            const result = await completeReminder(id);

            if (!result.success) {
                showListAlert(result.message || "Failed to update reminder.", "error");
                return;
            }

            showListAlert("Reminder marked as completed.", "success");
            await loadReminders();
        });
    });
}

function setupReminderLogModal()
{
    const modalOverlay = document.getElementById("reminderLogModalOverlay");

    const openModal = () => {
        renderReminderLog();
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("openReminderLogModal").addEventListener("click", openModal);
    document.getElementById("closeReminderLogModal").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
}

function renderReminderLog()
{
    const tbody = document.getElementById("reminderLogTableBody");

    if (!remindersCache.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No reminders found.</td></tr>`;
        return;
    }

    tbody.innerHTML = remindersCache.map((reminder) => {
        const isRecipient = Boolean(Number(reminder.is_recipient));
        const totalRecipients = Number(reminder.recipient_count) || 0;
        const completedRecipients = Number(reminder.completed_count) || 0;

        let status = "Pending";

        if (isRecipient) {
            status = reminder.my_completed_at ? "Completed" : "Pending";
        } else if (totalRecipients > 0 && completedRecipients >= totalRecipients) {
            status = "Completed";
        }

        return `
        <tr>
            <td>${escapeHtml(reminder.due_date || "—")}</td>
            <td>${escapeHtml(reminder.sender_name || "—")}</td>
            <td>${escapeHtml(reminder.patient_name || "—")}</td>
            <td>${escapeHtml(truncate(reminder.body, 80))}</td>
            <td><span class="rem-priority-badge ${escapeHtml(reminder.priority || "low")}">${escapeHtml(reminder.priority || "low")}</span></td>
            <td>${escapeHtml(status)}</td>
        </tr>
        `;
    }).join("");
}
