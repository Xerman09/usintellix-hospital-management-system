import { getUser } from "../../core/session.js";
import { fetchPatients } from "../patients/patients.service.js";
import {
    fetchMyMessages, fetchRecipientOptions, createConversation, sendMessage, deleteMessage,
    fetchMessageTypes, fetchMessageStatuses
} from "./messages.service.js";

let messagesCache = [];
let selectedIds = new Set();
let typeOptions = [];
let statusOptions = [];
let recipientLookup = new Map();
let patientLookup = new Map();

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

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
