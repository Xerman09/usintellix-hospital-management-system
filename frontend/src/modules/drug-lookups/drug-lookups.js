import { api } from "../../core/api.js";
import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { DRUG_LOOKUPS } from "./drug-lookups.view.js";

export async function initDrugLookup(key) {
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    const c = DRUG_LOOKUPS[key];
    const p = c.prefix;
    const $ = (suffix) => document.getElementById(`${p}${suffix}`);

    let items = [];

    const clearErrors = () => {
        $("Alert").innerHTML = "";
        $("-err-name").textContent = "";
        $("-err-description").textContent = "";
    };

    const openModal = (item) => {
        clearErrors();
        $("Form").reset();
        $("_id").value = item ? item.id : "";
        $("_name").value = item ? item.name : "";
        $("_description").value = item ? (item.description ?? "") : "";
        $("ModalTitle").textContent = item ? `Edit ${c.singular}` : `Add ${c.singular}`;
        $("SaveBtn").textContent = item ? "Save Changes" : `Add ${c.singular}`;
        $("ModalOverlay").classList.add("open");
        $("_name").focus();
    };

    const closeModal = () => $("ModalOverlay").classList.remove("open");

    const render = () => {
        const term = $("Search").value.trim().toLowerCase();
        const rows = term
            ? items.filter((i) => i.name.toLowerCase().includes(term) || (i.description ?? "").toLowerCase().includes(term))
            : items;

        $("Count").textContent = `${items.length} ${items.length === 1 ? c.singular.toLowerCase() : c.title.toLowerCase()}`;

        if (!rows.length) {
            $("Body").innerHTML = `<tr><td colspan="4" class="dl-empty">${items.length ? "No matches." : `No ${c.title.toLowerCase()} yet.`}</td></tr>`;
            return;
        }

        $("Body").innerHTML = rows.map((i) => `
            <tr>
                <td><strong>${escapeHtml(i.name)}</strong></td>
                <td class="${i.description ? "" : "dl-muted"}">${escapeHtml(i.description || "—")}</td>
                <td class="dl-muted">${i.drug_count} ${i.drug_count === 1 ? "drug" : "drugs"}</td>
                <td>
                    <div class="dl-actions">
                        <button type="button" class="dl-btn" data-edit="${i.id}">Edit</button>
                        <button type="button" class="dl-btn danger" data-delete="${i.id}" ${i.drug_count ? `disabled title="In use by ${i.drug_count} drug(s)"` : ""}>Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");

        $("Body").querySelectorAll("[data-edit]").forEach((btn) => {
            btn.addEventListener("click", () => openModal(items.find((i) => String(i.id) === btn.dataset.edit)));
        });

        $("Body").querySelectorAll("[data-delete]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const item = items.find((i) => String(i.id) === btn.dataset.delete);
                if (!item || !confirm(`Delete "${item.name}"?`)) return;

                const result = await api(c.endpoint, { method: "DELETE", body: JSON.stringify({ id: item.id }) });

                if (!result.success) {
                    showToast(result.message || "Failed to delete.", "error");
                    return;
                }

                showToast(result.message, "success");
                await load();
            });
        });
    };

    const load = async () => {
        const result = await api(c.endpoint);
        items = result.success ? result.data : [];

        if (!result.success) {
            $("Body").innerHTML = `<tr><td colspan="4" class="dl-empty">Failed to load ${c.title.toLowerCase()}.</td></tr>`;
            return;
        }

        render();
    };

    $("AddBtn").addEventListener("click", () => openModal(null));
    $("CloseModal").addEventListener("click", closeModal);
    $("Cancel").addEventListener("click", closeModal);
    $("ModalOverlay").addEventListener("click", (event) => { if (event.target === $("ModalOverlay")) closeModal(); });
    $("Search").addEventListener("input", render);

    $("Form").addEventListener("submit", async (event) => {
        event.preventDefault();
        clearErrors();

        const id = $("_id").value;
        const body = {
            name: $("_name").value.trim(),
            description: $("_description").value.trim()
        };

        const result = await api(c.endpoint, {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(id ? { id: Number(id), ...body } : body)
        });

        if (!result.success) {
            $("Alert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to save.")}</div>`;
            Object.entries(result.errors || {}).forEach(([field, message]) => {
                const el = $(`-err-${field}`);
                if (el) el.textContent = message;
            });
            return;
        }

        closeModal();
        showToast(result.message, "success");
        await load();
    });

    await load();
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
