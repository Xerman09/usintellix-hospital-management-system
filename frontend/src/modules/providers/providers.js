import { getUser } from "../../core/session.js";
import { fetchProviders, createProvider, updateProvider, deleteProvider } from "./providers.service.js?v=2";
import { todayISO } from "../../core/timezone.js";
import { fetchEmployeesByRole } from "../employees/employees.service.js";
import { escapeHtml } from "../appointments/appointment-format.js";
import { fetchSpecializations } from "../specializations/specializations.service.js?v=1";

const FIELDS = ["employee_id", "license_number", "ptr_number", "ptr_date", "s2_number", "s2_expiry_date", "npi_number", "dea_number"];
const EDIT_FIELDS = FIELDS.filter((field) => field !== "employee_id");

let providersCache = [];
let specializations = [];
const SPEC_GROUPS = [["surgical", "Surgical"], ["anesthesiology", "Anesthesiology"], ["medical", "Medical"], ["other", "Other"]];

export async function initProviders()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    const specResult = await fetchSpecializations({ include_inactive: 1 });
    specializations = specResult?.success ? specResult.data.rows : [];

    await loadProviders();
    setupProviderFilters();

    document.getElementById("subSpecSearch").addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll("#subSpecList label").forEach((l) => { l.hidden = q !== "" && !l.textContent.toLowerCase().includes(q); });
    });
    // The main specialization isn't also a sub-specialization.
    document.getElementById("primary_specialization_id").addEventListener("change", (e) => {
        document.querySelectorAll("#subSpecList input").forEach((c) => {
            c.disabled = c.value === e.target.value;
            if (c.disabled) c.checked = false;
        });
    });

    const modalOverlay = document.getElementById("addProviderModalOverlay");
    const form = document.getElementById("addProviderForm");

    const openModal = async () => {
        form.reset();
        setProviderModalMode(null);
        await loadDoctorEmployees();
        modalOverlay.classList.add("open");
    };
    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddProviderModal").addEventListener("click", openModal);
    document.getElementById("closeAddProviderModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddProvider").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const data = {};
        const editingId = document.getElementById("provider_id").value;

        // Editing sends every field, so a cleared one is cleared.
        (editingId ? EDIT_FIELDS : FIELDS).forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "" || editingId) {
                data[field] = value;
            }
        });
        data.primary_specialization_id = document.getElementById("primary_specialization_id").value;
        data.sub_specialization_ids = [...document.querySelectorAll("#subSpecList input:checked")].map((c) => Number(c.value));

        const result = editingId ? await updateProvider(Number(editingId), data) : await createProvider(data);

        if (!result.success) {
            showAlert(result.message || (editingId ? "Failed to update provider." : "Failed to create provider."), "error");

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
        showListAlert(editingId ? "Provider updated successfully." : "Provider added successfully.", "success");
        await loadProviders();
    });

    document.getElementById("providersTableBody").addEventListener("click", async (event) => {
        const edit = event.target.closest("[data-edit-provider]");
        if (!edit) return;
        const provider = providersCache.find((p) => String(p.id) === edit.dataset.editProvider);
        if (!provider) return;
        setProviderModalMode(provider);
        modalOverlay.classList.add("open");
        document.getElementById("primary_specialization_id").focus();
    });
}

/** null = adding a provider; a provider = editing their specialty and licenses. */
function setProviderModalMode(provider)
{
    const employeeSelect = document.getElementById("employee_id");
    const name = provider ? [provider.first_name, provider.middle_name, provider.last_name, provider.suffix].filter(Boolean).join(" ") : "";

    document.getElementById("provider_id").value = provider ? provider.id : "";
    document.getElementById("providerModalTitle").textContent = provider ? `Edit Provider — ${name}` : "Add Provider";
    document.getElementById("providerModalSubtitle").textContent = provider
        ? "Update the specialty and the licenses printed on prescriptions. PTR is renewed every year; the S2 license has an expiry."
        : "Mark an existing employee (doctor role) as a provider and record their credentials.";
    document.getElementById("providerSubmitBtn").textContent = provider ? "Save Changes" : "Add Provider";

    employeeSelect.closest(".form-group").hidden = !!provider;
    employeeSelect.disabled = !!provider;

    if (provider) {
        EDIT_FIELDS.forEach((field) => {
            document.getElementById(field).value = provider[field] ?? "";
        });
    }

    renderSpecializationPickers(provider);
}

/** Main specialization (grouped select) and sub-specializations (checkboxes); switched-off ones only if the doctor has them. */
function renderSpecializationPickers(provider)
{
    const mine = new Set((provider?.specializations || []).map((s) => s.id));
    const usable = specializations.filter((s) => s.is_active || mine.has(s.id));
    const primary = provider?.primary_specialization_id ?? "";
    const subs = new Set(provider?.sub_specialization_ids || []);

    document.getElementById("primary_specialization_id").innerHTML = `<option value="">Choose...</option>` + SPEC_GROUPS.map(([cat, label]) => {
        const list = usable.filter((s) => s.category === cat);
        return list.length ? `<optgroup label="${label}">${list.map((s) =>
            `<option value="${s.id}"${String(primary) === String(s.id) ? " selected" : ""}>${escapeHtml(s.name)}${s.is_active ? "" : " (switched off)"}</option>`).join("")}</optgroup>` : "";
    }).join("");

    document.getElementById("subSpecSearch").value = "";
    document.getElementById("subSpecList").innerHTML = SPEC_GROUPS.map(([cat, label]) => {
        const list = usable.filter((s) => s.category === cat);
        return list.length ? `<div class="grp">${label}</div>` + list.map((s) => `
            <label><input type="checkbox" value="${s.id}"${subs.has(s.id) ? " checked" : ""}${String(primary) === String(s.id) ? " disabled" : ""}> ${escapeHtml(s.name)}</label>`).join("") : "";
    }).join("") || `<span style="color:var(--text-muted);font-size:12.5px;">No specializations yet. Add them under Specializations.</span>`;
}

async function loadDoctorEmployees()
{
    const result = await fetchEmployeesByRole("doctor");
    const select = document.getElementById("employee_id");

    select.querySelectorAll("option[data-dynamic]").forEach((option) => option.remove());

    if (result.success) {
        if (!result.data.length) {
            const option = document.createElement("option");

            option.value = "";
            option.textContent = "No employees with the doctor role yet";
            option.disabled = true;
            option.dataset.dynamic = "true";

            select.appendChild(option);
            return;
        }

        result.data.forEach((employee) => {
            const option = document.createElement("option");

            option.value = employee.id;
            option.dataset.dynamic = "true";
            option.textContent = `${employee.first_name} ${employee.last_name} (${employee.employee_no})`;

            select.appendChild(option);
        });
    }
}

async function loadProviders()
{
    const result = await fetchProviders();

    providersCache = result.success ? result.data : [];

    renderProvidersTable(providersCache);
}

function setupProviderFilters()
{
    const searchInput = document.getElementById("providerSearchInput");
    const searchClear = document.getElementById("providerSearchClear");

    if (!searchInput || !searchClear) return;

    const applyFilters = () => renderProvidersTable(getFilteredProviders(searchInput));

    searchInput.addEventListener("input", () => {
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        applyFilters();
    });
    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.classList.remove("show");
        applyFilters();
        searchInput.focus();
    });
}

function getFilteredProviders(searchInput)
{
    const term = searchInput.value.trim().toLowerCase();

    if (term === "") {
        return providersCache;
    }

    return providersCache.filter((provider) => {
        const haystack = [
            provider.first_name,
            provider.middle_name,
            provider.last_name,
            provider.suffix,
            provider.specialty,
            ...(provider.specializations || []).map((s) => s.name),
            provider.department_name
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(term);
    });
}

function renderProvidersTable(providers)
{
    const tbody = document.getElementById("providersTableBody");
    const countText = document.getElementById("providerCountText");

    if (!tbody || !countText) {
        return;
    }

    countText.textContent = `${providersCache.length} ${providersCache.length === 1 ? "provider" : "providers"}`;

    if (!providers.length) {
        const noneAtAll = providersCache.length === 0;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="prov-empty-state">
                    <strong>${noneAtAll ? "No providers yet" : "No matching providers"}</strong>
                    <p>${noneAtAll ? "Providers you register will appear here." : "Try a different search term."}</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = providers.map((provider) => `
        <tr>
            <td class="prov-name">${escapeHtml([provider.first_name, provider.middle_name, provider.last_name, provider.suffix].filter(Boolean).join(" "))}</td>
            <td class="prov-muted">${escapeHtml(provider.department_name ?? "-")}</td>
            <td>${escapeHtml(provider.primary_specialization || provider.specialty || "-")}${(provider.specializations || []).filter((s) => !s.is_primary).length
                ? `<span class="prov-spec-subs">${escapeHtml(provider.specializations.filter((s) => !s.is_primary).map((s) => s.name).join(", "))}</span>` : ""}</td>
            <td class="prov-muted">${licensesCell(provider)}</td>
            <td class="prov-muted">${escapeHtml(provider.email)}</td>
            <td class="prov-muted">${escapeHtml(provider.phone)}</td>
            <td><div class="prov-actions"><button class="btn-edit" data-edit-provider="${provider.id}">Edit</button><button class="btn-danger" data-id="${provider.id}">Delete</button></div></td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".btn-danger").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this provider? This will not affect existing patient records.")) {
                return;
            }

            await deleteProvider(btn.getAttribute("data-id"));
            await loadProviders();
        });
    });
}

function licensesCell(provider)
{
    const parts = [
        provider.license_number ? `PRC ${escapeHtml(provider.license_number)}` : null,
        provider.ptr_number ? `PTR ${escapeHtml(provider.ptr_number)}` : null
    ].filter(Boolean);

    if (provider.s2_number) {
        const expired = provider.s2_expiry_date && provider.s2_expiry_date < todayISO();
        parts.push(`S2 ${escapeHtml(provider.s2_number)}${expired ? ` <span style="color:#b91c1c;font-weight:700;">(expired)</span>` : ""}`);
    }

    return parts.length ? parts.join("<br>") : "-";
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

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
