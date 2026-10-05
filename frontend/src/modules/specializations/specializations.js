import { fetchSpecializations, saveSpecialization, setSpecializationActive } from "./specializations.service.js?v=1";
import { escapeHtml } from "../appointments/appointment-format.js";
import { showToast } from "../../core/toast.js";

let rows = [];
let categories = [];
let tab = "all";
let editing = null;

const $ = (id) => document.getElementById(id);

export async function initSpecializations() {
    rows = [];
    tab = "all";
    editing = null;

    $("spAdd").addEventListener("click", () => openForm(null));
    $("spSearch").addEventListener("input", render);
    $("spShowOff").addEventListener("change", load);
    $("spForm").addEventListener("submit", submit);
    document.querySelectorAll("[data-sp-close]").forEach((b) => b.addEventListener("click", closeForm));
    document.querySelectorAll("[data-sp-confirm-close]").forEach((b) => b.addEventListener("click", () => $("spConfirm").classList.remove("open")));
    $("spBody").addEventListener("click", onRowClick);

    await load();
}

async function load() {
    const result = await fetchSpecializations({ include_inactive: $("spShowOff").checked ? 1 : "" });
    if (!result?.success) {
        $("spBody").innerHTML = `<div class="ss-empty">${escapeHtml(result?.message || "Couldn't load the specializations.")}</div>`;
        return;
    }
    rows = result.data.rows;
    categories = result.data.categories;
    renderTabs();
    render();
}

function renderTabs() {
    const count = (c) => rows.filter((r) => c === "all" || r.category === c).length;
    $("spTabs").innerHTML = [["all", "All"], ...categories.map((c) => [c.value, c.label])]
        .map(([v, label]) => `<button type="button" data-sp-tab="${v}" class="${tab === v ? "active" : ""}">${escapeHtml(label)} (${count(v)})</button>`).join("");
    $("spTabs").querySelectorAll("[data-sp-tab]").forEach((b) => b.addEventListener("click", () => {
        tab = b.dataset.spTab;
        renderTabs();
        render();
    }));
}

function render() {
    const q = $("spSearch").value.trim().toLowerCase();
    const shown = rows.filter((r) => (tab === "all" || r.category === tab)
        && (!q || `${r.name} ${r.description || ""}`.toLowerCase().includes(q)));

    $("spBody").innerHTML = shown.length ? `
        <div class="ss-table-wrap"><table class="ss-table">
            <thead><tr><th>Specialization</th><th>Type</th><th class="num">Doctors</th><th class="num">Surgery types</th><th>Status</th><th></th></tr></thead>
            <tbody>${shown.map((r) => `
                <tr class="${r.is_active ? "" : "off"}">
                    <td><strong>${escapeHtml(r.name)}</strong>${r.description ? `<span class="ss-sub">${escapeHtml(r.description)}</span>` : ""}</td>
                    <td><span class="ss-badge ${escapeHtml(r.category)}">${escapeHtml(r.category_label)}</span></td>
                    <td class="num">${r.doctor_count || "—"}</td>
                    <td class="num">${r.surgery_count || "—"}</td>
                    <td>${r.is_active ? `<span class="ss-badge medical">Active</span>` : `<span class="ss-badge off">Switched off</span>`}</td>
                    <td class="actions">
                        <button type="button" class="ss-btn small" data-sp-edit="${r.id}">Edit</button>
                        <button type="button" class="ss-btn small" data-sp-toggle="${r.id}">${r.is_active ? "Switch off" : "Switch on"}</button>
                    </td>
                </tr>`).join("")}</tbody>
        </table></div>` : `<div class="ss-empty">${rows.length ? "No specializations match." : "No specializations yet."}</div>`;
}

function onRowClick(event) {
    const edit = event.target.closest("[data-sp-edit]");
    if (edit) return openForm(rows.find((r) => r.id === Number(edit.dataset.spEdit)));
    const toggle = event.target.closest("[data-sp-toggle]");
    if (toggle) return confirmToggle(rows.find((r) => r.id === Number(toggle.dataset.spToggle)));
}

function openForm(row) {
    editing = row || null;
    $("spModalTitle").textContent = row ? `Edit ${row.name}` : "Add specialization";
    $("spName").value = row?.name || "";
    $("spDescription").value = row?.description || "";
    $("spCategory").innerHTML = `<option value="">Choose...</option>` + categories.map((c) =>
        `<option value="${c.value}"${(row?.category || (tab !== "all" ? tab : "")) === c.value ? " selected" : ""}>${escapeHtml(c.label)}</option>`).join("");
    clearErrors();
    $("spOverlay").classList.add("open");
    $("spName").focus();
}

function closeForm() {
    $("spOverlay").classList.remove("open");
}

function clearErrors() {
    $("spAlert").innerHTML = "";
    document.querySelectorAll("#spForm [data-err]").forEach((e) => { e.textContent = ""; });
    document.querySelectorAll("#spForm .has-error").forEach((e) => e.classList.remove("has-error"));
}

async function submit(event) {
    event.preventDefault();
    clearErrors();
    $("spSave").disabled = true;
    const result = await saveSpecialization({ id: editing?.id, name: $("spName").value.trim(), category: $("spCategory").value, description: $("spDescription").value.trim() });
    $("spSave").disabled = false;

    if (!result?.success) {
        $("spAlert").innerHTML = `<div class="ss-alert">${escapeHtml(result?.message || "Couldn't save.")}</div>`;
        Object.entries(result?.errors || {}).forEach(([k, m]) => {
            const el = document.querySelector(`#spForm [data-err="${k}"]`);
            if (el) {
                el.textContent = m;
                el.closest(".ss-field")?.classList.add("has-error");
            }
        });
        return;
    }
    closeForm();
    showToast(result.message, "success");
    await load();
}

function confirmToggle(row) {
    if (!row) return;
    const off = row.is_active;
    $("spConfirmTitle").textContent = off ? `Switch off ${row.name}?` : `Switch on ${row.name}?`;
    $("spConfirmBody").innerHTML = off
        ? `<p style="margin:0;">It stays on the ${row.doctor_count} doctor${row.doctor_count === 1 ? "" : "s"} and ${row.surgery_count} surgery type${row.surgery_count === 1 ? "" : "s"} that already have it, but can't be picked for new ones.</p>`
        : `<p style="margin:0;">It can be picked again for doctors and surgery types.</p>`;
    $("spConfirmOk").textContent = off ? "Switch off" : "Switch on";
    $("spConfirmOk").className = `ss-btn ${off ? "danger" : "primary"}`;
    $("spConfirmOk").onclick = async () => {
        $("spConfirmOk").disabled = true;
        const result = await setSpecializationActive(row.id, !off);
        $("spConfirmOk").disabled = false;
        $("spConfirm").classList.remove("open");
        showToast(result?.message || "Couldn't change it.", result?.success ? "success" : "error");
        if (result?.success) await load();
    };
    $("spConfirm").classList.add("open");
}
