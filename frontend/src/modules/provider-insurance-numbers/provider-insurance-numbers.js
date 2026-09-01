import { showToast } from "../../core/toast.js";
import { fetchProviderInsuranceNumbers, updateProviderInsuranceNumbers } from "./provider-insurance-numbers.service.js";

let rows = [];

export async function initProviderInsuranceNumbers()
{
    wireModal();
    await loadRows();
}

async function loadRows()
{
    const tbody = document.getElementById("pinTableBody");
    tbody.innerHTML = `<tr><td colspan="4" class="pin-loading">Loading...</td></tr>`;

    const result = await fetchProviderInsuranceNumbers();

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="4" class="pin-loading">${escapeHtml(result.message || "Failed to load insurance numbers.")}</td></tr>`;
        return;
    }

    rows = result.data || [];
    renderRows();
}

function renderRows()
{
    const tbody = document.getElementById("pinTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="pin-empty">No providers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td><button type="button" class="pin-name-link" data-provider-id="${row.provider_id}">${escapeHtml(row.name)}</button></td>
            <td>${cell(row.provider_number)}</td>
            <td>${cell(row.rendering_number)}</td>
            <td>${cell(row.group_number)}</td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-provider-id]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(Number(btn.dataset.providerId)));
    });
}

function cell(value)
{
    return value ? escapeHtml(value) : `<span class="pin-default">Default</span>`;
}

function wireModal()
{
    const overlay = document.getElementById("pinModalOverlay");
    const form = document.getElementById("pinForm");

    document.getElementById("pinModalClose").addEventListener("click", closeModal);
    document.getElementById("pinCancelBtn").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeModal();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const providerId = Number(document.getElementById("pin_provider_id").value);
        const data = {
            provider_number: document.getElementById("pin_provider_number").value.trim(),
            rendering_number: document.getElementById("pin_rendering_number").value.trim(),
            group_number: document.getElementById("pin_group_number").value.trim()
        };

        const result = await updateProviderInsuranceNumbers(providerId, data);

        if (!result.success) {
            document.getElementById("pinModalFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to save.")}</div>`;
            return;
        }

        closeModal();
        showToast("Insurance numbers updated successfully.", "success");
        await loadRows();
    });
}

function openModal(providerId)
{
    const row = rows.find((r) => r.provider_id === providerId);

    if (!row) return;

    document.getElementById("pinModalFormAlert").innerHTML = "";
    document.getElementById("pinModalTitle").textContent = `Edit Insurance Numbers — ${row.name}`;
    document.getElementById("pin_provider_id").value = row.provider_id;
    document.getElementById("pin_provider_number").value = row.provider_number || "";
    document.getElementById("pin_rendering_number").value = row.rendering_number || "";
    document.getElementById("pin_group_number").value = row.group_number || "";

    document.getElementById("pinModalOverlay").classList.add("open");
}

function closeModal()
{
    document.getElementById("pinModalOverlay").classList.remove("open");
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
