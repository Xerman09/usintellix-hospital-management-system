import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} from "./holidays.service.js";

const FIELDS = ["hd_name", "hd_holiday_date", "hd_description"];

let holidays = [];
let searchTerm = "";

export async function initHolidays()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("holidayModalOverlay");
    const modalTitle = document.getElementById("holidayModalTitle");
    const saveBtn = document.getElementById("saveHolidayBtn");
    const idInput = document.getElementById("holiday_id");
    const form = document.getElementById("holidayForm");
    const searchInput = document.getElementById("holidaySearch");
    const searchClear = document.getElementById("holidaySearchClear");

    const openModal = (holiday) => {
        clearErrors();
        document.getElementById("hdFormAlert").innerHTML = "";

        if (holiday) {
            modalTitle.textContent = "Edit Holiday";
            saveBtn.textContent = "Save Changes";
            idInput.value = holiday.id;
            document.getElementById("hd_name").value = holiday.name ?? "";
            document.getElementById("hd_holiday_date").value = holiday.holiday_date ?? "";
            document.getElementById("hd_recurs_yearly").checked = Boolean(Number(holiday.recurs_yearly));
            document.getElementById("hd_description").value = holiday.description ?? "";
        } else {
            modalTitle.textContent = "Add Holiday";
            saveBtn.textContent = "Add Holiday";
            idInput.value = "";
            form.reset();
        }

        modalOverlay.classList.add("open");
    };
    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        idInput.value = "";
        clearErrors();
        document.getElementById("hdFormAlert").innerHTML = "";
    };

    document.getElementById("openAddHolidayModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeHolidayModal").addEventListener("click", closeModal);
    document.getElementById("cancelHoliday").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        renderRows(openModal);
    });

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchTerm = "";
        searchClear.classList.remove("show");
        renderRows(openModal);
        searchInput.focus();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const data = {
            name: document.getElementById("hd_name").value.trim(),
            holiday_date: document.getElementById("hd_holiday_date").value,
            recurs_yearly: document.getElementById("hd_recurs_yearly").checked,
            description: document.getElementById("hd_description").value.trim() || null
        };

        const editingId = idInput.value;
        const result = editingId
            ? await updateHoliday(editingId, data)
            : await createHoliday(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save holiday.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-hd_${field}`);
                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showToast(editingId ? "Holiday updated successfully." : "Holiday added successfully.", "success");
        await loadHolidays(openModal);
    });

    await loadHolidays(openModal);
}

async function loadHolidays(openModal)
{
    const result = await fetchHolidays();
    holidays = result.success ? result.data : [];
    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("holidaysTableBody");
    const countText = document.getElementById("holidayCountText");

    countText.textContent = `${holidays.length} ${holidays.length === 1 ? "holiday" : "holidays"}`;

    const filtered = searchTerm
        ? holidays.filter((holiday) =>
            holiday.name.toLowerCase().includes(searchTerm) ||
            (holiday.description ?? "").toLowerCase().includes(searchTerm))
        : holidays;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(holidays.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((holiday) => `
        <tr>
            <td>
                <div class="hd-name-cell">
                    <div class="hd-avatar">${escapeHtml((holiday.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="hd-name">${escapeHtml(holiday.name)}</span>
                </div>
            </td>
            <td>${escapeHtml(formatDate(holiday.holiday_date))}</td>
            <td>
                <span class="hd-recurs-badge ${Number(holiday.recurs_yearly) ? "yes" : "no"}">
                    ${Number(holiday.recurs_yearly) ? "Yes" : "No"}
                </span>
            </td>
            <td class="hd-description ${holiday.description ? "" : "empty"}">${escapeHtml(holiday.description || "No description provided")}</td>
            <td>
                <div class="hd-actions">
                    <button class="hd-icon-btn edit" data-edit-id="${holiday.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="hd-icon-btn delete" data-id="${holiday.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const holiday = holidays.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));
            if (holiday) {
                openModal(holiday);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const holidayId = btn.getAttribute("data-id");
            showConfirmDeleteModal(async () => {
                const result = await deleteHoliday(holidayId);
                if (!result.success) {
                    showToast(result.message || "Failed to delete holiday.", "error");
                    return;
                }
                showToast("Holiday deleted successfully.", "success");
                await loadHolidays(openModal);
            });
        });
    });
}

function showConfirmDeleteModal(onConfirm)
{
    const modal = document.getElementById("hdConfirmDeleteModal");
    const cancelBtn = document.getElementById("hdCancelDeleteBtn");
    const confirmBtn = document.getElementById("hdConfirmDeleteBtn");

    const closeHandler = () => {
        modal.classList.remove("open");
        cancelBtn.removeEventListener("click", closeHandler);
        confirmBtn.removeEventListener("click", confirmHandler);
    };

    const confirmHandler = () => {
        onConfirm();
        closeHandler();
    };

    cancelBtn.addEventListener("click", closeHandler);
    confirmBtn.addEventListener("click", confirmHandler);

    modal.classList.add("open");
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No holidays yet" : "No matching holidays";
    const message = noneAtAll
        ? "Add your first holiday to start blocking dates on the calendar."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="5" class="hd-empty-state">
                <div class="hd-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
                </div>
                <strong>${heading}</strong>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function formatDate(value)
{
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(value)
{
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function clearErrors()
{
    FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-${field}`);
        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showAlert(message, type)
{
    const container = document.getElementById("hdFormAlert");
    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
