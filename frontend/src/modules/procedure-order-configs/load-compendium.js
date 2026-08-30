import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { fetchProcedureOrderConfigs, loadProcedureOrderCompendium } from "./procedure-order-configs.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";

export async function initLoadCompendium()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    await Promise.all([loadVendors(), loadContainerGroups()]);

    document.getElementById("lcSubmitBtn").addEventListener("click", handleSubmit);
}

async function loadVendors()
{
    const select = document.getElementById("lcVendor");

    if (!select) return;

    const result = await fetchFacilities();
    const facilities = (result.success ? result.data : []).filter((facility) => facility.facility_npi);

    select.innerHTML = `<option value="">Select vendor...</option>`
        + facilities.map((facility) => `<option value="${facility.id}">${escapeHtml(facility.facility_npi)}: ${escapeHtml(facility.name)}</option>`).join("");
}

async function loadContainerGroups()
{
    const select = document.getElementById("lcContainerGroup");

    if (!select) return;

    const result = await fetchProcedureOrderConfigs();
    const groups = result.success ? (result.data.items || []).filter((item) => item.procedure_tier === "group") : [];

    select.innerHTML = `<option value="">Select group...</option>`
        + groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join("");
}

async function handleSubmit()
{
    const vendorId = document.getElementById("lcVendor").value;
    const action = document.getElementById("lcAction").value;
    const containerGroupId = document.getElementById("lcContainerGroup").value;
    const fileInput = document.getElementById("lcFile");
    const resultsEl = document.getElementById("lcResults");

    document.getElementById("lcAlert").innerHTML = "";
    resultsEl.style.display = "none";
    resultsEl.innerHTML = "";

    if (!vendorId) {
        showAlert("Please select a vendor.", "error");
        return;
    }

    if (!containerGroupId) {
        showAlert("Please select a container group.", "error");
        return;
    }

    if (!fileInput.files.length) {
        showAlert("Please choose a file to upload.", "error");
        return;
    }

    const formData = new FormData();

    formData.append("vendor_id", vendorId);
    formData.append("action", action);
    formData.append("container_group_id", containerGroupId);
    formData.append("file", fileInput.files[0]);

    const submitBtn = document.getElementById("lcSubmitBtn");

    submitBtn.disabled = true;

    const result = await loadProcedureOrderCompendium(formData);

    submitBtn.disabled = false;

    if (!result.success) {
        showAlert(result.message || "Failed to load compendium.", "error");
        return;
    }

    showToast(result.message, "success");

    const created = result.data?.created ?? 0;
    const failed = result.data?.failed ?? [];

    resultsEl.style.display = "";
    resultsEl.innerHTML = `
        <p>${created} order definition(s) created.</p>
        ${failed.length ? `
            <p>${failed.length} row(s) failed:</p>
            <ul>${failed.map((row) => `<li>Row ${row.row} (${escapeHtml(row.name)}): ${escapeHtml(Object.values(row.errors).join(", "))}</li>`).join("")}</ul>
        ` : ""}
    `;

    fileInput.value = "";
}

function showAlert(message, type)
{
    document.getElementById("lcAlert").innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
