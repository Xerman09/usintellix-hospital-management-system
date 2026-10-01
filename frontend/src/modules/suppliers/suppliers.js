import {
    fetchSuppliers, fetchSupplier, fetchSupplierOptions, createSupplier, updateSupplier, deleteSupplier
} from "./suppliers.service.js";
import { showToast } from "../../core/toast.js";

const TEXT_FIELDS = [
    "name", "contact_person", "phone", "mobile", "email", "website", "address_line", "city",
    "province", "postal_code", "country", "tin", "fda_license_number", "license_expiry", "notes"
];
const SELECT_FIELDS = ["supplier_type", "payment_terms"];

let options = { supplier_types: [], payment_terms: [], product_types: [], license_warning_days: 60 };
let suppliers = [];
let editing = null;

export async function initSuppliers() {
    const result = await fetchSupplierOptions();

    if (result.success) {
        options = { ...options, ...result.data };
    }

    fillSelect("spTypeFilter", options.supplier_types, "All types");
    fillSelect("spSuppliesFilter", options.product_types, "Supplies anything");
    fillSelect("sp_supplier_type", options.supplier_types, null);
    fillSelect("sp_payment_terms", options.payment_terms, "-- Not set --");

    document.getElementById("spProductTypes").innerHTML = options.product_types.map((type) => `
        <label class="sp-toggle"><input type="checkbox" value="${escapeHtml(type)}"><span>${escapeHtml(type)}</span></label>
    `).join("");

    ["spSearch", "spTypeFilter", "spSuppliesFilter", "spLicenseFilter"].forEach((id) => {
        document.getElementById(id).addEventListener(id === "spSearch" ? "input" : "change", () => {
            syncStatHighlight();
            render();
        });
    });

    document.getElementById("spShowInactive").addEventListener("change", load);

    document.querySelectorAll("[data-sp-stat]").forEach((card) => {
        card.addEventListener("click", () => {
            const value = card.dataset.spStat;
            const filter = document.getElementById("spLicenseFilter");
            filter.value = value === "all" || filter.value === value ? "" : value;
            syncStatHighlight();
            render();
        });
    });

    setupModal();
    await load();
}

async function load() {
    const result = await fetchSuppliers(document.getElementById("spShowInactive").checked);

    if (!result.success) {
        suppliers = [];
        document.getElementById("spBody").innerHTML = `<tr><td colspan="8" class="sp-empty">Failed to load suppliers.</td></tr>`;
        return;
    }

    suppliers = result.data || [];
    renderStats();
    render();
}

function renderStats() {
    const active = suppliers.filter((s) => s.is_active);

    document.getElementById("spStatActive").textContent = active.length;
    document.getElementById("spStatExpiring").textContent = active.filter((s) => s.license_status === "expiring").length;
    document.getElementById("spStatExpired").textContent = active.filter((s) => s.license_status === "expired").length;
    document.getElementById("spStatNone").textContent = active.filter((s) => !s.license_status).length;
}

function syncStatHighlight() {
    const value = document.getElementById("spLicenseFilter").value;

    document.querySelectorAll("[data-sp-stat]").forEach((card) => {
        card.classList.toggle("active", value !== "" && card.dataset.spStat === value);
    });
}

function render() {
    const term = document.getElementById("spSearch").value.trim().toLowerCase();
    const type = document.getElementById("spTypeFilter").value;
    const supplies = document.getElementById("spSuppliesFilter").value;
    const license = document.getElementById("spLicenseFilter").value;
    const tbody = document.getElementById("spBody");

    const rows = suppliers.filter((s) => {
        if (type && s.supplier_type !== type) return false;
        if (supplies && !s.product_types.includes(supplies)) return false;
        if (license === "none" && s.license_status) return false;
        if (license && license !== "none" && s.license_status !== license) return false;
        if (!term) return true;

        return [s.name, s.code, s.contact_person, s.email, s.phone, s.mobile, s.tin, s.city, s.province, s.fda_license_number]
            .some((v) => (v || "").toLowerCase().includes(term));
    });

    document.getElementById("spCount").textContent = `${rows.length} of ${suppliers.length} ${suppliers.length === 1 ? "supplier" : "suppliers"}`;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="sp-empty">${suppliers.length
            ? "No suppliers match these filters."
            : "No suppliers yet. Click &ldquo;+ Add Supplier&rdquo; to add your first one."}</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(renderRow).join("");

    tbody.querySelectorAll("[data-sp-open]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(Number(btn.dataset.spOpen)));
    });
}

function renderRow(s) {
    const contactLines = [
        s.phone || s.mobile ? escapeHtml([s.phone, s.mobile].filter(Boolean).join(" · ")) : "",
        s.email ? `<a href="mailto:${escapeHtml(s.email)}">${escapeHtml(s.email)}</a>` : ""
    ].filter(Boolean);

    const location = [s.city, s.province].filter(Boolean).join(", ");
    const terms = [s.payment_terms, s.lead_time_days != null ? `${s.lead_time_days}-day lead time` : null].filter(Boolean);

    return `
        <tr>
            <td style="min-width:200px;">
                <button type="button" class="sp-name" data-sp-open="${s.id}">${escapeHtml(s.name)}</button>
                <span class="sp-sub">${escapeHtml(s.code || "")} &middot; ${escapeHtml(s.supplier_type)}</span>
                ${s.is_active ? "" : `<span class="sp-badge inactive" style="margin-top:4px;">Inactive</span>`}
            </td>
            <td>${s.product_types.length
                ? `<div class="sp-chips">${s.product_types.map((t) => `<span class="sp-chip">${escapeHtml(t)}</span>`).join("")}</div>`
                : `<span class="sp-sub">—</span>`}</td>
            <td style="min-width:170px;">
                ${escapeHtml(s.contact_person || "—")}
                ${contactLines.map((line) => `<span class="sp-sub">${line}</span>`).join("")}
            </td>
            <td>${escapeHtml(location || "—")}</td>
            <td>${renderLicense(s)}</td>
            <td>${terms.length ? terms.map((t, i) => i ? `<span class="sp-sub">${escapeHtml(t)}</span>` : escapeHtml(t)).join("") : "—"}</td>
            <td>${s.receipt_count
                ? `${s.receipt_count}<span class="sp-sub">last ${formatDate(s.last_received)}</span>`
                : `<span class="sp-sub">None yet</span>`}
                ${s.item_count ? `<span class="sp-sub">${s.item_count} ${s.item_count === 1 ? "item" : "items"}</span>` : ""}</td>
            <td><button type="button" class="sp-btn small" data-sp-open="${s.id}">Edit</button></td>
        </tr>
    `;
}

function renderLicense(s) {
    if (!s.license_status) {
        return s.fda_license_number
            ? `${escapeHtml(s.fda_license_number)}<span class="sp-sub">No expiry date</span>`
            : `<span class="sp-badge none">Not on file</span>`;
    }

    const label = { valid: "Valid", expiring: "Expiring", expired: "Expired" }[s.license_status];

    return `
        ${s.fda_license_number ? escapeHtml(s.fda_license_number) : ""}
        <span class="sp-sub"><span class="sp-badge ${s.license_status}">${label}</span> ${formatDate(s.license_expiry)}</span>
    `;
}

/* ---------------------------------------------------------------
 * Add / Edit modal
 * ------------------------------------------------------------- */

function setupModal() {
    const overlay = document.getElementById("spModalOverlay");
    const form = document.getElementById("spForm");
    const close = () => overlay.classList.remove("open");

    document.getElementById("spAddBtn").addEventListener("click", () => openModal(null));
    document.getElementById("spCloseModal").addEventListener("click", close);
    document.getElementById("spCancel").addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });

    document.getElementById("sp_license_expiry").addEventListener("change", updateLicenseHint);

    document.getElementById("spDeleteBtn").addEventListener("click", async () => {
        if (!editing || !confirm(`Delete supplier "${editing.name}"?`)) return;

        const result = await deleteSupplier(editing.id);

        if (!result.success) {
            showAlert(result.message || "Failed to delete the supplier.");
            return;
        }

        close();
        showToast(result.message || "Supplier deleted.", "success");
        await load();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearErrors();

        const payload = {};
        TEXT_FIELDS.forEach((f) => { payload[f] = document.getElementById(`sp_${f}`).value.trim(); });
        SELECT_FIELDS.forEach((f) => { payload[f] = document.getElementById(`sp_${f}`).value; });
        payload.lead_time_days = document.getElementById("sp_lead_time_days").value;
        payload.is_active = document.getElementById("sp_is_active").checked;
        payload.product_types = [...document.querySelectorAll("#spProductTypes input:checked")].map((cb) => cb.value);

        if (!payload.name) {
            document.getElementById("err-sp_name").textContent = "Supplier name is required.";
            document.getElementById("sp_name").focus();
            return;
        }

        const saveBtn = document.getElementById("spSaveBtn");
        saveBtn.disabled = true;

        const result = editing ? await updateSupplier(editing.id, payload) : await createSupplier(payload);

        saveBtn.disabled = false;

        if (!result.success) {
            const errors = result.errors && typeof result.errors === "object" ? result.errors : null;

            if (errors) {
                Object.entries(errors).forEach(([field, message]) => {
                    const el = document.getElementById(`err-sp_${field}`);
                    if (el) el.textContent = message;
                });
                showAlert("Please fix the highlighted fields.");
                [...document.querySelectorAll("#spForm .form-error")].find((el) => el.textContent)
                    ?.scrollIntoView({ block: "center", behavior: "smooth" });
            } else {
                showAlert(result.message || "Failed to save the supplier.");
            }

            return;
        }

        close();
        showToast(editing ? "Supplier updated." : `Supplier added as ${result.data?.code || ""}.`.trim(), "success");
        await load();
    });
}

async function openModal(id) {
    const form = document.getElementById("spForm");
    form.reset();
    clearErrors();
    editing = null;

    if (id) {
        const result = await fetchSupplier(id);

        if (!result.success) {
            showToast(result.message || "Failed to load the supplier.", "error");
            return;
        }

        editing = result.data;
    }

    const s = editing;

    document.getElementById("spModalTitle").textContent = s ? `${s.name}` : "Add Supplier";
    document.getElementById("spSaveBtn").textContent = s ? "Save Changes" : "Add Supplier";
    document.getElementById("spDeleteBtn").hidden = !s;

    TEXT_FIELDS.forEach((f) => { document.getElementById(`sp_${f}`).value = s ? (s[f] ?? "") : ""; });
    SELECT_FIELDS.forEach((f) => { document.getElementById(`sp_${f}`).value = s ? (s[f] ?? "") : ""; });
    document.getElementById("sp_lead_time_days").value = s?.lead_time_days ?? "";
    document.getElementById("sp_is_active").checked = s ? s.is_active : true;

    if (!s) {
        document.getElementById("sp_supplier_type").value = options.supplier_types[0] || "";
        document.getElementById("sp_country").value = "Philippines";
    }

    document.querySelectorAll("#spProductTypes input").forEach((cb) => {
        cb.checked = Boolean(s?.product_types.includes(cb.value));
    });

    renderItems(s?.items || null);
    updateLicenseHint();

    document.getElementById("spModalOverlay").classList.add("open");
    document.getElementById("sp_name").focus();
}

function renderItems(items) {
    const section = document.getElementById("spItemsSection");
    section.hidden = items === null;

    if (items === null) return;

    document.getElementById("spItemsBody").innerHTML = items.length ? items.map((item) => `
        <tr>
            <td>${escapeHtml(item.name)}
                ${item.is_preferred ? `<span class="sp-badge preferred">Preferred</span>` : ""}
                ${item.is_active ? "" : `<span class="sp-badge inactive">Inactive</span>`}</td>
            <td>${item.receipt_count || "—"}</td>
            <td>${item.receipt_count ? `${formatQuantity(item.total_quantity)} ${escapeHtml(item.unit_name || "")}` : "—"}</td>
            <td>${item.last_received ? formatDate(item.last_received) : "—"}</td>
            <td>${item.last_unit_cost != null ? formatMoney(item.last_unit_cost) : "—"}</td>
        </tr>
    `).join("") : `<tr><td colspan="5" class="sp-empty">Nothing received from this supplier yet. Pick it in Receive Stock, or set it as a drug's preferred supplier.</td></tr>`;
}

function updateLicenseHint() {
    const value = document.getElementById("sp_license_expiry").value;
    const hint = document.getElementById("spLicenseHint");

    if (!value) {
        hint.textContent = "";
        return;
    }

    const days = Math.round((new Date(`${value}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);

    hint.textContent = days < 0
        ? `Expired ${Math.abs(days)} day(s) ago`
        : days === 0 ? "Expires today" : `Expires in ${days} day(s)`;
    hint.style.color = days < 0 ? "#dc2626" : days <= options.license_warning_days ? "#d97706" : "";
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

function fillSelect(id, values, placeholder) {
    const el = document.getElementById(id);
    el.innerHTML = (placeholder !== null ? `<option value="">${escapeHtml(placeholder)}</option>` : "")
        + values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}

function clearErrors() {
    document.getElementById("spAlert").innerHTML = "";
    document.querySelectorAll("#spForm .form-error").forEach((el) => { el.textContent = ""; });
}

function showAlert(message) {
    document.getElementById("spAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(3).replace(/\.?0+$/, "");
}

function formatMoney(value) {
    return "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
