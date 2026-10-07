import { fetchNursingStaff, saveNurseWards, fetchNurseWardHistory } from "./nursing-staff.service.js?v=1";
import { showToast } from "../../core/toast.js";

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let filters = { ward_id: "", role: "", q: "" };
let data = null;
let editing = null;
let seq = 0;
let searchTimer = null;
let keyBound = false;

export function initNursingStaff() {
    const page = $("nswPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    filters = { ward_id: "", role: "", q: "" };

    $("nswRole").addEventListener("change", (e) => {
        filters.role = e.target.value;
        load();
    });
    $("nswQ").addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            filters.q = e.target.value.trim();
            load();
        }, 300);
    });
    $("nswWards").addEventListener("click", (e) => {
        const b = e.target.closest("[data-ward]");
        if (!b) return;
        filters.ward_id = filters.ward_id === b.dataset.ward ? "" : b.dataset.ward;
        load();
    });
    $("nswList").addEventListener("click", (e) => {
        const id = Number(e.target.closest("[data-edit]")?.dataset.edit);
        if (id) openEditor(id);
    });
    $("nswOverlay").addEventListener("click", (e) => {
        if (e.target.id === "nswOverlay") closeModal();
    });
    if (!keyBound) {
        keyBound = true;
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && $("nswOverlay")?.classList.contains("open")) closeModal();
        });
    }
    load();
}

async function load() {
    const n = ++seq;
    const res = await fetchNursingStaff(filters).catch(() => null);
    if (n !== seq || !$("nswList")) return;
    if (!res?.success) {
        $("nswList").innerHTML = `<div class="nsw-empty">Could not load the nursing staff. ${esc(res?.message || "")}</div>`;
        return;
    }
    data = res.data;
    render();
}

function render() {
    const mine = data.editable_ward_ids;   // null = admin (all wards)
    if (mine && $("nswIntro")) {
        const names = data.wards.filter((w) => mine.includes(w.id)).map((w) => w.name);
        $("nswIntro").textContent = names.length
            ? `You can add or remove nursing staff in your wards: ${names.join(", ")}. Other wards are managed by their charge nurse or an admin.`
            : "You are not linked to a ward yet. Ask an admin to add you to your ward; then you can manage its nursing staff here.";
    }

    const roleSel = $("nswRole");
    if (roleSel.options.length === 1) {
        roleSel.insertAdjacentHTML("beforeend", data.roles.map((r) => `<option value="${esc(r.value)}">${esc(r.label)}s</option>`).join(""));
    }

    const unassigned = filters.ward_id === "none";
    $("nswWards").innerHTML = data.wards.map((w) => `
        <button type="button" class="nsw-ward ${String(w.id) === filters.ward_id ? "active" : ""}" data-ward="${w.id}" aria-pressed="${String(w.id) === filters.ward_id}">
            <div class="n">${data.counts[w.id] ?? 0}</div><div class="l">${esc(w.name)}</div>
        </button>`).join("") + `
        <button type="button" class="nsw-ward warn ${unassigned ? "active" : ""}" data-ward="none" aria-pressed="${unassigned}">
            <div class="n">${data.unassigned}</div><div class="l">No ward yet</div>
        </button>`;

    if (!data.staff.length) {
        $("nswList").innerHTML = `<div class="nsw-empty">${filters.ward_id || filters.role || filters.q
            ? "No nursing staff match these filters."
            : "No nursing staff yet. Create their accounts in Administration → Users with the role Nurse, Charge Nurse or CNA; they will appear here."}</div>`;
        return;
    }
    $("nswList").innerHTML = `<table class="nsw-table">
        <thead><tr><th>Name</th><th>Role</th><th class="nsw-hide-sm">Department</th><th>Wards</th><th><span style="position:absolute;left:-9999px">Actions</span></th></tr></thead>
        <tbody>${data.staff.map((s) => `
            <tr>
                <td><div class="nsw-name">${esc(s.name)}</div><div class="nsw-sub">${esc([s.employee_no, s.username].filter(Boolean).join(" · "))}</div></td>
                <td><span class="nsw-role ${esc(s.role)}">${esc(s.role_label)}</span></td>
                <td class="nsw-hide-sm">${esc(s.department || "—")}</td>
                <td>${s.wards.length ? s.wards.map((w) => `<span class="nsw-chip ${w.primary ? "main" : ""}" title="${w.primary ? "Main ward" : ""}">${esc(w.name)}${w.primary ? " · main" : ""}</span>`).join("") : `<span class="nsw-none">No ward yet</span>`}</td>
                <td style="text-align:right">${s.can_edit ? `<button type="button" class="nsw-btn" data-edit="${s.user_id}" aria-label="Change wards for ${esc(s.name)}">Change wards</button>` : `<span class="nsw-sub">Other ward</span>`}</td>
            </tr>`).join("")}</tbody></table>`;
}

/* ---------------- editor ---------------- */

async function openEditor(userId) {
    const s = data.staff.find((x) => x.user_id === userId);
    if (!s) return;
    const mine = data.editable_ward_ids;
    editing = { user: s, selected: new Set(s.wards.map((w) => w.id)), primary: s.wards.find((w) => w.primary)?.id || null };
    const modal = $("nswModal");
    const locked = (id) => mine !== null && !mine.includes(id);
    modal.innerHTML = `
        <div class="nsw-mhead"><div><h2 id="nswModalTitle">Wards for ${esc(s.name)}</h2><div class="nsw-sub">${esc(s.role_label)}</div></div>
            <button type="button" class="nsw-x" data-close aria-label="Close">×</button></div>
        <div class="nsw-mbody">
            <p class="nsw-sub" style="margin:4px 0 10px">Tick the wards this person works in, and choose their main ward.${mine !== null ? " Wards you don't work in are shown greyed out and stay as they are." : ""}</p>
            <div id="nswWardRows">${data.wards.map((w) => `
                <label class="nsw-wardrow ${locked(w.id) ? "locked" : ""}">
                    <input type="checkbox" data-ward-pick="${w.id}" ${editing.selected.has(w.id) ? "checked" : ""} ${locked(w.id) ? "disabled" : ""}>
                    <span><strong>${esc(w.name)}</strong> <span class="nsw-sub">${esc(w.code)} · ${esc(w.type)}</span></span>
                    <span class="nsw-main-pick"><input type="radio" name="nswMain" value="${w.id}" ${editing.primary === w.id ? "checked" : ""} ${editing.selected.has(w.id) ? "" : "disabled"} aria-label="Main ward: ${esc(w.name)}"> Main</span>
                </label>`).join("")}</div>
            <div class="nsw-err" id="nswErr"></div>
            <div class="nsw-hist" id="nswHist"></div>
        </div>
        <div class="nsw-mfoot">
            <button type="button" class="nsw-btn" data-close>Cancel</button>
            <button type="button" class="nsw-btn primary" id="nswSave">Save</button>
        </div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeModal));
    $("nswWardRows").addEventListener("change", onPick);
    $("nswSave").onclick = save;
    $("nswOverlay").classList.add("open");
    setTimeout(() => modal.querySelector("input:not([disabled])")?.focus(), 0);

    const res = await fetchNurseWardHistory(userId).catch(() => null);
    const hist = res?.success ? res.data : [];
    if ($("nswHist") && editing?.user.user_id === userId && hist.length) {
        $("nswHist").innerHTML = `<strong>Changes</strong><ul style="margin:6px 0 0;padding-left:18px">${hist.slice(0, 5).map((h) =>
            `<li>${esc(h.changed_at)} · ${esc(h.changed_by || "—")}: ${esc(h.wards_before || "no ward")} → ${esc(h.wards_after || "no ward")}</li>`).join("")}</ul>`;
    }
}

function onPick(e) {
    const id = Number(e.target.dataset.wardPick || 0);
    if (id) {
        e.target.checked ? editing.selected.add(id) : editing.selected.delete(id);
        const radio = $("nswWardRows").querySelector(`input[name="nswMain"][value="${id}"]`);
        radio.disabled = !e.target.checked;
        if (!e.target.checked && editing.primary === id) {
            radio.checked = false;
            editing.primary = null;
        }
        // The first ward ticked becomes the main ward.
        if (e.target.checked && !editing.primary) {
            editing.primary = id;
            radio.checked = true;
        }
    } else if (e.target.name === "nswMain") {
        editing.primary = Number(e.target.value);
    }
    $("nswErr").textContent = "";
}

async function save() {
    const btn = $("nswSave");
    btn.disabled = true;
    const res = await saveNurseWards({
        user_id: editing.user.user_id,
        ward_ids: [...editing.selected],
        primary_ward_id: editing.primary,
    }).catch(() => null);
    btn.disabled = false;
    if (!res?.success) {
        $("nswErr").textContent = res?.message || "Could not save. Try again.";
        return;
    }
    showToast(`${res.message} ${editing.user.name}.`);
    closeModal();
    load();
}

function closeModal() {
    $("nswOverlay")?.classList.remove("open");
    editing = null;
}
