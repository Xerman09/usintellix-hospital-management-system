import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchMedicalProblems,
    createMedicalProblem,
    updateMedicalProblem,
    deleteMedicalProblem
} from "./medical-problems.service.js";

const FIELDS = ["name", "description"];

let problems = [];
let searchTerm = "";

export async function initMedicalProblems()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("medicalProblemModalOverlay");
    const modalTitle = document.getElementById("medicalProblemModalTitle");
    const saveBtn = document.getElementById("saveMedicalProblemBtn");
    const idInput = document.getElementById("medical_problem_id");
    const form = document.getElementById("medicalProblemForm");
    const searchInput = document.getElementById("medicalProblemSearch");
    const searchClear = document.getElementById("medicalProblemSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Medical Problem";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Medical Problem";
            saveBtn.textContent = "Add Medical Problem";
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
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddMedicalProblemModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeMedicalProblemModal").addEventListener("click", closeModal);
    document.getElementById("cancelMedicalProblem").addEventListener("click", closeModal);
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

        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const editingId = idInput.value;
        const result = editingId
            ? await updateMedicalProblem(editingId, data)
            : await createMedicalProblem(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save medical problem.", "error");

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
        showToast(editingId ? "Medical problem updated successfully." : "Medical problem added successfully.", "success");
        await loadMedicalProblems(openModal);
    });

    await loadMedicalProblems(openModal);
}

async function loadMedicalProblems(openModal)
{
    const result = await fetchMedicalProblems();

    problems = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("medicalProblemsTableBody");
    const countText = document.getElementById("medicalProblemCountText");

    countText.textContent = `${problems.length} ${problems.length === 1 ? "medical problem" : "medical problems"}`;

    const filtered = searchTerm
        ? problems.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : problems;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(problems.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="mp-name-cell">
                    <div class="mp-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="mp-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="mp-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="mp-actions">
                    <button class="mp-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="mp-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = problems.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this medical problem?")) {
                return;
            }

            const result = await deleteMedicalProblem(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete medical problem.", "error");
                return;
            }

            showToast("Medical problem deleted successfully.", "success");
            await loadMedicalProblems(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No medical problems yet" : "No matching medical problems";
    const message = noneAtAll
        ? "Create your first medical problem to start recording patient medical history."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="mp-empty-state">
                <div class="mp-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.5A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4Z"></path></svg>
                </div>
                <strong>${heading}</strong>
                <p>${message}</p>
            </td>
        </tr>
    `;
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
    const container = document.getElementById("formAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
