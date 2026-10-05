import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { escapeHtml } from "../appointments/appointment-format.js";
import { fetchSurgeryCatalog, fetchSurgery, fetchSurgeryOptions, createSurgery, updateSurgery, deleteSurgery } from "./surgeries.service.js?v=2";

let rows = [];
let options = { specializations: [], categories: [], anesthesia_types: [], wound_classes: [], item_types: [], drugs: [] };
let editing = null;

const $ = (id) => document.getElementById(id);
const money = (v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function initSurgeries()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    rows = [];
    editing = null;

    $("openAddSurgeryModal").addEventListener("click", () => openForm(null));
    $("surgerySearch").addEventListener("input", render);
    $("sgSpecFilter").addEventListener("change", render);
    $("sgShowOff").addEventListener("change", load);
    $("surgeryForm").addEventListener("submit", submit);
    document.querySelectorAll("[data-sg-close]").forEach((b) => b.addEventListener("click", closeForm));
    document.querySelectorAll("[data-sg-confirm-close]").forEach((b) => b.addEventListener("click", () => $("sgConfirm").classList.remove("open")));
    document.querySelectorAll("[data-sg-add]").forEach((b) => b.addEventListener("click", () => addItem({ item_type: b.dataset.sgAdd, quantity: 1 }, true)));
    $("sgItems").addEventListener("click", (e) => {
        const remove = e.target.closest("[data-sg-remove]");
        if (remove) {
            remove.closest(".sg-item").remove();
            toggleItemsHead();
        }
    });
    $("sgItems").addEventListener("change", (e) => {
        if (e.target.matches("[data-f='item_type']")) swapItemInput(e.target.closest(".sg-item"));
    });
    $("sgBody").addEventListener("click", onRowClick);

    const result = await fetchSurgeryOptions();
    if (result?.success) options = result.data;
    $("sgSpecFilter").innerHTML = `<option value="">All specializations</option>` + specOptions("", false);

    await load();
}

/** Specializations grouped by type, surgical first. */
function specOptions(selected, onlyActive = true, keepId = null)
{
    const groups = [["surgical", "Surgical"], ["anesthesiology", "Anesthesiology"], ["medical", "Medical"], ["other", "Other"]];
    return groups.map(([cat, label]) => {
        const list = options.specializations.filter((s) => s.category === cat && (!onlyActive || s.is_active || s.id === keepId));
        return list.length ? `<optgroup label="${label}">${list.map((s) =>
            `<option value="${s.id}"${String(selected) === String(s.id) ? " selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}</optgroup>` : "";
    }).join("");
}

async function load()
{
    const result = await fetchSurgeryCatalog({ include_inactive: $("sgShowOff").checked ? 1 : "" });
    if (!result?.success) {
        $("sgBody").innerHTML = `<div class="ss-empty">${escapeHtml(result?.message || "Couldn't load the surgeries.")}</div>`;
        return;
    }
    rows = result.data;
    render();
}

function render()
{
    const q = $("surgerySearch").value.trim().toLowerCase();
    const spec = $("sgSpecFilter").value;
    const shown = rows.filter((r) => (!spec || String(r.specialization_id) === spec)
        && (!q || `${r.name} ${r.code || ""} ${r.description || ""}`.toLowerCase().includes(q)));
    const anesthesia = (v) => options.anesthesia_types.find((a) => a.value === v)?.label || v;

    $("sgBody").innerHTML = shown.length ? `
        <div class="ss-table-wrap"><table class="ss-table">
            <thead><tr><th>Surgery</th><th>Specialization</th><th>Category</th><th class="num">Duration</th><th>Anesthesia</th><th>Needs</th><th class="num">OR fee</th><th class="num">Card</th><th></th></tr></thead>
            <tbody>${shown.map((r) => `
                <tr class="${r.is_active ? "" : "off"}">
                    <td><strong>${escapeHtml(r.name)}</strong>
                        ${r.code ? `<span class="ss-sub">Code ${escapeHtml(r.code)}</span>` : ""}
                        ${r.description ? `<span class="ss-sub">${escapeHtml(r.description)}</span>` : ""}
                        ${r.is_active ? "" : `<span class="ss-badge off" style="margin-top:3px;">Switched off</span>`}</td>
                    <td>${r.specialization_name ? `<span class="ss-badge ${escapeHtml(r.specialization_category || "other")}">${escapeHtml(r.specialization_name)}</span>` : `<span class="ss-badge warn">Not set</span>`}</td>
                    <td>${escapeHtml(r.category)}${r.wound_class ? `<span class="ss-sub">${escapeHtml(r.wound_class)}</span>` : ""}</td>
                    <td class="num">${r.default_duration_minutes} min</td>
                    <td>${r.default_anesthesia_type ? escapeHtml(anesthesia(r.default_anesthesia_type)) : "—"}</td>
                    <td><div class="ss-tags">${[r.requires_laterality ? "Side" : "", r.usually_needs_blood ? "Blood" : "", r.usually_needs_implants ? "Implants" : ""]
                        .filter(Boolean).map((t) => `<span class="ss-badge muted">${t}</span>`).join("") || "—"}</div></td>
                    <td class="num">${r.default_or_fee != null ? money(r.default_or_fee) : "—"}</td>
                    <td class="num">${r.item_count ? `${r.item_count} item${r.item_count === 1 ? "" : "s"}` : "—"}</td>
                    <td class="actions"><button type="button" class="ss-btn small" data-sg-edit="${r.id}">Edit</button><button type="button" class="ss-btn small" data-sg-delete="${r.id}">Delete</button></td>
                </tr>`).join("")}</tbody>
        </table></div>` : `<div class="ss-empty">${rows.length ? "No surgeries match." : "No surgery types yet. Add the surgeries your hospital performs."}</div>`;
}

async function onRowClick(event)
{
    const edit = event.target.closest("[data-sg-edit]");
    if (edit) {
        const result = await fetchSurgery(Number(edit.dataset.sgEdit));
        if (!result?.success) return showToast(result?.message || "Couldn't open the surgery.", "error");
        return openForm(result.data);
    }
    const del = event.target.closest("[data-sg-delete]");
    if (del) confirmDelete(rows.find((r) => r.id === Number(del.dataset.sgDelete)));
}

function openForm(surgery)
{
    editing = surgery || null;
    const s = surgery || {};
    $("surgeryModalTitle").textContent = surgery ? `Edit ${surgery.name}` : "Add surgery type";
    $("sgName").value = s.name || "";
    $("sgSpec").innerHTML = `<option value="">Choose...</option>` + specOptions(s.specialization_id || "", true, s.specialization_id);
    $("sgCode").value = s.code || "";
    $("sgCategory").innerHTML = options.categories.map((c) => `<option${(s.category || "Major") === c ? " selected" : ""}>${escapeHtml(c)}</option>`).join("");
    $("sgDescription").value = s.description || "";
    $("sgDuration").value = s.default_duration_minutes || 60;
    $("sgAnesthesia").innerHTML = `<option value="">Not set</option>` + options.anesthesia_types.map((a) =>
        `<option value="${escapeHtml(a.value)}"${s.default_anesthesia_type === a.value ? " selected" : ""}>${escapeHtml(a.label)}</option>`).join("");
    $("sgWound").innerHTML = `<option value="">Not set</option>` + options.wound_classes.map((w) => `<option${s.wound_class === w ? " selected" : ""}>${escapeHtml(w)}</option>`).join("");
    $("sgFee").value = s.default_or_fee ?? "";
    $("sgSurgeonFee").value = s.default_surgeon_fee ?? "";
    $("sgAnesFee").value = s.default_anesthesia_fee ?? "";
    $("sgPhCode").value = s.philhealth_case_rate_code || "";
    $("sgPhAmount").value = s.philhealth_case_rate_amount ?? "";
    $("sgLaterality").checked = !!s.requires_laterality;
    $("sgBlood").checked = !!s.usually_needs_blood;
    $("sgImplants").checked = !!s.usually_needs_implants;
    $("sgActive").checked = surgery ? !!s.is_active : true;
    $("sgItems").innerHTML = "";
    (s.preference_items || []).forEach((item) => addItem(item));
    toggleItemsHead();
    clearErrors();
    $("surgeryModalOverlay").classList.add("open");
    $("sgName").focus();
}

function closeForm()
{
    $("surgeryModalOverlay").classList.remove("open");
}

function drugChoices(type, selected)
{
    // Supplies first for supplies, medicines (non-consumables) first for medicines; all can be picked.
    const preferred = options.drugs.filter((d) => (type === "supply") === d.is_consumable);
    const rest = options.drugs.filter((d) => (type === "supply") !== d.is_consumable);
    const opt = (d) => `<option value="${d.id}"${String(selected) === String(d.id) ? " selected" : ""}>${escapeHtml(d.name)}${d.unit_name ? ` (${escapeHtml(d.unit_name)})` : ""}</option>`;
    return `<option value="">Choose from the Drug Catalog...</option>`
        + (preferred.length ? `<optgroup label="${type === "supply" ? "Supplies" : "Medicines"}">${preferred.map(opt).join("")}</optgroup>` : "")
        + (rest.length ? `<optgroup label="Other items">${rest.map(opt).join("")}</optgroup>` : "");
}

function itemInput(type, item = {})
{
    return type === "instrument"
        ? `<input data-f="name" maxlength="255" placeholder="e.g. Laparoscopy set" value="${escapeHtml(item.name || "")}" aria-label="Instrument set">`
        : `<select data-f="drug_id" aria-label="Item">${drugChoices(type, item.drug_id)}</select>`;
}

function addItem(item, focus = false)
{
    const row = document.createElement("div");
    row.className = "sg-item";
    row.innerHTML = `
        <select data-f="item_type" aria-label="Type">${options.item_types.map((t) => `<option value="${t.value}"${item.item_type === t.value ? " selected" : ""}>${escapeHtml(t.label)}</option>`).join("")}</select>
        <div data-slot>${itemInput(item.item_type, item)}</div>
        <input data-f="quantity" type="number" min="0.01" step="any" value="${item.quantity ?? 1}" aria-label="Quantity">
        <input data-f="notes" maxlength="255" placeholder="Notes" value="${escapeHtml(item.notes || "")}" aria-label="Notes">
        <button type="button" class="sg-item-remove" data-sg-remove title="Remove" aria-label="Remove">&times;</button>
        <span class="ss-err" data-item-err></span>`;
    $("sgItems").appendChild(row);
    toggleItemsHead();
    if (focus) row.querySelector("[data-slot] input, [data-slot] select")?.focus();
}

function swapItemInput(row)
{
    const type = row.querySelector("[data-f='item_type']").value;
    row.querySelector("[data-slot]").innerHTML = itemInput(type);
}

function toggleItemsHead()
{
    $("sgItemsHead").hidden = !$("sgItems").children.length;
}

function clearErrors()
{
    $("surgFormAlert").innerHTML = "";
    document.querySelectorAll("#surgeryForm [data-err], #surgeryForm [data-item-err]").forEach((e) => { e.textContent = ""; });
    document.querySelectorAll("#surgeryForm .has-error").forEach((e) => e.classList.remove("has-error"));
}

async function submit(event)
{
    event.preventDefault();
    clearErrors();

    const items = [...$("sgItems").querySelectorAll(".sg-item")].map((row) => ({
        item_type: row.querySelector("[data-f='item_type']").value,
        name: row.querySelector("[data-f='name']")?.value.trim() || "",
        drug_id: row.querySelector("[data-f='drug_id']")?.value || "",
        quantity: row.querySelector("[data-f='quantity']").value,
        notes: row.querySelector("[data-f='notes']").value.trim()
    }));
    const data = {
        name: $("sgName").value.trim(), specialization_id: $("sgSpec").value, code: $("sgCode").value.trim(), category: $("sgCategory").value,
        description: $("sgDescription").value.trim(), default_duration_minutes: $("sgDuration").value, default_anesthesia_type: $("sgAnesthesia").value,
        wound_class: $("sgWound").value, default_or_fee: $("sgFee").value, default_surgeon_fee: $("sgSurgeonFee").value,
        default_anesthesia_fee: $("sgAnesFee").value, philhealth_case_rate_code: $("sgPhCode").value.trim(), philhealth_case_rate_amount: $("sgPhAmount").value, requires_laterality: $("sgLaterality").checked ? 1 : 0,
        usually_needs_blood: $("sgBlood").checked ? 1 : 0, usually_needs_implants: $("sgImplants").checked ? 1 : 0, is_active: $("sgActive").checked ? 1 : 0,
        preference_items: items
    };

    $("saveSurgeryBtn").disabled = true;
    const result = editing ? await updateSurgery(editing.id, data) : await createSurgery(data);
    $("saveSurgeryBtn").disabled = false;

    if (!result?.success) {
        $("surgFormAlert").innerHTML = `<div class="ss-alert">${escapeHtml(result?.message || "Couldn't save the surgery.")}</div>`;
        const itemRows = [...$("sgItems").querySelectorAll(".sg-item")];
        Object.entries(result?.errors || {}).forEach(([key, message]) => {
            const m = key.match(/^preference_items\.(\d+)$/);
            if (m && itemRows[Number(m[1])]) {
                itemRows[Number(m[1])].classList.add("has-error");
                itemRows[Number(m[1])].querySelector("[data-item-err]").textContent = message;
                return;
            }
            const el = document.querySelector(`#surgeryForm [data-err="${key}"]`);
            if (el) {
                el.textContent = message;
                el.closest(".ss-field")?.classList.add("has-error");
            }
        });
        return;
    }

    closeForm();
    showToast(result.message, "success");
    await load();
}

function confirmDelete(row)
{
    if (!row) return;
    $("sgConfirmTitle").textContent = `Delete ${row.name}?`;
    $("sgConfirmBody").innerHTML = `<p style="margin:0;">It disappears from the list and can't be booked. Cases and patient records that already name it keep it. To keep it on the list without booking it, edit it and untick <strong>Active</strong> instead.</p>`;
    $("sgConfirmOk").onclick = async () => {
        $("sgConfirmOk").disabled = true;
        const result = await deleteSurgery(row.id);
        $("sgConfirmOk").disabled = false;
        $("sgConfirm").classList.remove("open");
        showToast(result?.message || "Couldn't delete it.", result?.success ? "success" : "error");
        if (result?.success) await load();
    };
    $("sgConfirm").classList.add("open");
}
