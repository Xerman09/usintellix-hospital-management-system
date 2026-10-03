import { fetchStockLevelOptions, fetchLocationLevels, saveLocationLevels, copyLocationLevels, fetchLowStock } from "./stock-levels.service.js?v=1";
import { formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";
import { getUser } from "../../core/session.js";

const STATUS = {
    out: ["Out of stock", "out"], low: ["Low", "low"], ok: ["OK", "ok"], over: ["Over max", "over"], no_level: ["No level set", "no_level"]
};

let canEdit = false;
let locations = [];
let low = null;
let current = null;      // levels() result of the location being edited
let drafts = new Map();  // drug_id -> {min, max} as typed
let errors = {};         // drug_id -> message from the last save

const $ = (id) => document.getElementById(id);

export async function initStockLevels() {
    canEdit = getUser()?.role === "admin";
    // The page is rebuilt each time the tab opens; start clean.
    locations = [];
    low = null;
    current = null;
    drafts = new Map();
    errors = {};

    $("slTabs").querySelectorAll("[data-sl-tab]").forEach((btn) => btn.addEventListener("click", () => showTab(btn.dataset.slTab)));
    $("slLowLocation").addEventListener("change", loadLow);
    $("slLowSearch").addEventListener("input", renderLow);
    $("slLowRefresh").addEventListener("click", loadLow);
    $("slLowCsv").addEventListener("click", () => low && downloadCsv(lowCsv(), "low-stock"));
    $("slLowPrint").addEventListener("click", () => low && printLow());
    $("slSetLocation").addEventListener("change", changeLocation);
    $("slSetSearch").addEventListener("input", renderLevels);
    $("slSetShow").addEventListener("change", renderLevels);
    $("slCopy").hidden = !canEdit;
    $("slCopy").addEventListener("click", openCopy);

    const result = await fetchStockLevelOptions();
    if (!result?.success) {
        $("slLowBody").innerHTML = `<div class="sl-empty">${escapeHtml(result?.message || "Couldn't load the storage locations.")}</div>`;
        return;
    }

    locations = result.data.locations;
    $("slLowLocation").innerHTML = `<option value="">All locations</option>` + locationOptions();
    $("slSetLocation").innerHTML = locationOptions();
    await loadLow();
}

function locationOptions() {
    return locations.map((l) => `<option value="${l.id}">${escapeHtml(l.name)}${l.code ? ` (${escapeHtml(l.code)})` : ""}${l.is_active ? "" : " — inactive"}</option>`).join("");
}

function locationName(id) {
    return locations.find((l) => String(l.id) === String(id))?.name || "";
}

function showTab(name) {
    $("slTabs").querySelectorAll("[data-sl-tab]").forEach((b) => b.classList.toggle("active", b.dataset.slTab === name));
    $("slLowPanel").hidden = name !== "low";
    $("slSetPanel").hidden = name !== "set";
    if (name === "set" && !current) loadLevels();
}

/* ---------------------------------------------------------------
 * Low stock
 * ------------------------------------------------------------- */

async function loadLow() {
    $("slLowBody").innerHTML = `<div class="sl-empty">Loading...</div>`;
    const result = await fetchLowStock({ warehouse_id: $("slLowLocation").value });

    if (!result?.success) {
        low = null;
        $("slLowBody").innerHTML = `<div class="sl-empty">${escapeHtml(result?.message || "Couldn't load low stock.")}</div>`;
        $("slLowCsv").disabled = $("slLowPrint").disabled = true;
        return;
    }

    low = result.data;
    $("slLowCsv").disabled = $("slLowPrint").disabled = false;
    renderLow();
}

function lowItems(location) {
    const term = $("slLowSearch").value.trim().toLowerCase();
    return location.items.filter((i) => !term || i.drug_name.toLowerCase().includes(term) || (i.generic_name || "").toLowerCase().includes(term));
}

function renderLow() {
    const t = low.totals;
    const visible = low.locations.filter((l) => l.is_active || l.items.length);

    $("slLowBody").innerHTML = `
        <div class="sl-stats">
            <div class="sl-stat ${t.locations_with_low ? "out" : ""}"><strong>${t.locations_with_low}</strong><span>Location${t.locations_with_low === 1 ? "" : "s"} with low stock</span></div>
            <div class="sl-stat out"><strong>${t.out}</strong><span>Items out of stock</span></div>
            <div class="sl-stat low"><strong>${t.low}</strong><span>Items below minimum</span></div>
            <div class="sl-stat"><strong>${t.tracked}</strong><span>Item levels set</span></div>
        </div>
        ${visible.map(lowCard).join("") || `<div class="sl-empty">No storage locations.</div>`}
        <p class="sl-note">Usable stock leaves out expired lots. “On the way” is stock already sent on a stock transfer to the location; “Requested” is asked for and not sent yet. The suggested quantity tops it back up to the maximum (or the minimum when there's no maximum), less what's on the way.</p>`;

    $("slLowBody").querySelectorAll("[data-sl-edit]").forEach((btn) => btn.addEventListener("click", () => editLocation(btn.dataset.slEdit)));
}

function lowCard(l) {
    const items = lowItems(l);
    const c = l.counts;
    const cls = c.out ? "alert" : c.low ? "warn" : c.tracked ? "good" : "";
    const chips = [
        c.out ? `<span class="sl-badge out">${c.out} out</span>` : "",
        c.low ? `<span class="sl-badge low">${c.low} low</span>` : "",
        c.tracked ? `<span class="sl-badge ok">${c.tracked} tracked</span>` : `<span class="sl-badge no_level">No levels set</span>`
    ].join("");

    let body;
    if (!c.tracked) {
        body = `<p class="sl-ok-line">No minimum levels are set here yet, so low stock can't be flagged.</p>`;
    } else if (!l.items.length) {
        body = `<p class="sl-ok-line">&#10003; Every tracked item is at or above its minimum.</p>`;
    } else if (!items.length) {
        body = `<p class="sl-ok-line">No low items match the filter.</p>`;
    } else {
        body = `<div class="sl-table-wrap"><table class="sl-table wide">
            <thead><tr><th>Item</th><th>Status</th><th class="num">Usable</th><th class="num">Minimum</th><th class="num">Maximum</th><th class="num">Short By</th><th class="num">On the Way</th><th class="num">Requested</th><th class="num">Suggested</th></tr></thead>
            <tbody>${items.map((i) => `
                <tr>
                    <td><strong>${escapeHtml(i.drug_name)}</strong><span class="sl-sub">${escapeHtml([i.generic_name, i.unit_name || "units"].filter(Boolean).join(" · "))}</span></td>
                    <td>${statusBadge(i.status)}</td>
                    <td class="num"><strong>${formatQty(i.usable)}</strong>${i.expired ? `<span class="sl-sub">+${formatQty(i.expired)} expired</span>` : ""}</td>
                    <td class="num">${formatQty(i.min_level)}</td>
                    <td class="num">${i.max_level != null ? formatQty(i.max_level) : "—"}</td>
                    <td class="num">${formatQty(i.shortfall)}</td>
                    <td class="num">${i.incoming ? formatQty(i.incoming) : "—"}</td>
                    <td class="num">${i.requested ? formatQty(i.requested) : "—"}</td>
                    <td class="num"><strong>${i.suggested_qty ? formatQty(i.suggested_qty) : "—"}</strong></td>
                </tr>`).join("")}</tbody>
        </table></div>`;
    }

    return `
        <div class="sl-card ${cls}">
            <div class="sl-card-head">
                <div>
                    <h3>${escapeHtml(l.name)}${l.code ? ` <span class="sl-sub" style="display:inline;">${escapeHtml(l.code)}</span>` : ""}</h3>
                    <span class="sl-sub">${escapeHtml([l.location_type, l.custodian_name ? `Custodian: ${l.custodian_name}` : null, l.is_active ? null : "Inactive"].filter(Boolean).join(" · ") || "—")}</span>
                </div>
                <div class="sl-chips">${chips}<button type="button" class="sl-btn small" data-sl-edit="${l.id}">${canEdit ? "Set levels" : "View levels"}</button></div>
            </div>
            ${body}
        </div>`;
}

function statusBadge(status) {
    const [label, cls] = STATUS[status] || [status, "no_level"];
    return `<span class="sl-badge ${cls}">${escapeHtml(label)}</span>`;
}

async function editLocation(id) {
    showTab("set");
    if (String($("slSetLocation").value) === String(id) && current) return;
    if (!(await confirmDiscard())) return;
    $("slSetLocation").value = String(id);
    $("slSetShow").value = "all";
    $("slSetSearch").value = "";
    await loadLevels();
}

/* ---------------------------------------------------------------
 * Set levels
 * ------------------------------------------------------------- */

async function changeLocation() {
    const chosen = $("slSetLocation").value;
    if (current && !(await confirmDiscard())) {
        $("slSetLocation").value = String(current.location.id);
        return;
    }
    $("slSetLocation").value = chosen;
    await loadLevels();
}

async function loadLevels() {
    const id = $("slSetLocation").value;
    if (!id) {
        $("slSetBody").innerHTML = `<div class="sl-empty">Add a storage location first.</div>`;
        return;
    }

    $("slSetBody").innerHTML = `<div class="sl-empty">Loading...</div>`;
    const result = await fetchLocationLevels(id);

    if (!result?.success) {
        current = null;
        $("slSetBody").innerHTML = `<div class="sl-empty">${escapeHtml(result?.message || "Couldn't load the levels.")}</div>`;
        return;
    }

    current = result.data;
    drafts = new Map();
    errors = {};
    renderLevels();
}

const text = (v) => (v == null ? "" : String(Number(v)));

function draftFor(item) {
    return drafts.get(item.drug_id) || { min: text(item.min_level), max: text(item.max_level) };
}

function changedRows() {
    return current.items.filter((i) => {
        const d = drafts.get(i.drug_id);
        return d && (d.min.trim() !== text(i.min_level) || d.max.trim() !== text(i.max_level));
    });
}

function visibleItems() {
    const term = $("slSetSearch").value.trim().toLowerCase();
    const show = $("slSetShow").value;

    return current.items.filter((i) => {
        if (term && !i.drug_name.toLowerCase().includes(term) && !(i.generic_name || "").toLowerCase().includes(term)) return false;
        // Rows being edited stay visible so a change doesn't vanish mid-typing.
        if (drafts.has(i.drug_id) || errors[i.drug_id]) return true;
        if (show === "set") return i.min_level != null;
        if (show === "unset") return i.min_level == null;
        if (show === "below") return i.status === "out" || i.status === "low";
        if (show === "over") return i.status === "over";
        if (show === "stocked") return i.on_hand > 0;
        return true;
    });
}

function renderLevels() {
    if (!current) return;
    const c = current.counts;
    const items = visibleItems();

    $("slSetBody").innerHTML = `
        <div class="sl-stats">
            <div class="sl-stat"><strong>${c.tracked}</strong><span>Items with a level</span></div>
            <div class="sl-stat out"><strong>${c.out}</strong><span>Out of stock</span></div>
            <div class="sl-stat low"><strong>${c.low}</strong><span>Below minimum</span></div>
            <div class="sl-stat"><strong>${c.over}</strong><span>Over maximum</span></div>
        </div>
        <div class="sl-card">
            ${items.length ? `<div class="sl-table-wrap"><table class="sl-table wide">
                <thead><tr><th>Item</th><th class="num">Usable</th><th class="num">On the Way</th><th class="num">Minimum</th><th class="num">Maximum</th><th>Status</th><th>Last Set</th></tr></thead>
                <tbody>${items.map(levelRow).join("")}</tbody>
            </table></div>`
            : `<div class="sl-empty">No items match.</div>`}
            ${canEdit ? `<p class="sl-note">Quantities are in each item's dispensing unit. Leave the minimum blank to stop tracking an item here. Catalog reorder levels are shown as a hint where the item has one.</p>`
                : `<p class="sl-note">Only an administrator can change stock levels.</p>`}
        </div>
        <div id="slSaveBar"></div>`;

    if (canEdit) {
        $("slSetBody").querySelectorAll("input.sl-qty").forEach((input) => input.addEventListener("input", onLevelInput));
    }
    renderSaveBar();
}

function levelRow(i) {
    const d = draftFor(i);
    const changed = drafts.has(i.drug_id) && (d.min.trim() !== text(i.min_level) || d.max.trim() !== text(i.max_level));
    const error = errors[i.drug_id];
    const input = (field, value, label) => canEdit
        ? `<input type="number" min="0" step="any" inputmode="decimal" class="sl-qty" data-drug="${i.drug_id}" data-field="${field}" value="${escapeHtml(value)}" aria-label="${label} for ${escapeHtml(i.drug_name)}">`
        : (value === "" ? "—" : formatQty(Number(value)));

    return `
        <tr class="${error ? "has-error" : changed ? "changed" : ""}" data-row="${i.drug_id}">
            <td><strong>${escapeHtml(i.drug_name)}</strong>${i.is_active ? "" : ` <span class="sl-badge no_level">Inactive</span>`}
                <span class="sl-sub">${escapeHtml([i.generic_name, i.strength, i.category_name, i.unit_name || "units"].filter(Boolean).join(" · "))}</span>
                ${error ? `<span class="sl-err">${escapeHtml(error)}</span>` : ""}</td>
            <td class="num"><strong>${formatQty(i.usable)}</strong>${i.expired ? `<span class="sl-sub">+${formatQty(i.expired)} expired</span>` : ""}${i.next_expiry ? `<span class="sl-sub">Next exp ${formatDate(i.next_expiry)}</span>` : ""}</td>
            <td class="num">${i.incoming ? formatQty(i.incoming) : "—"}</td>
            <td class="num">${input("min", d.min, "Minimum")}${canEdit && i.catalog_reorder_level && i.min_level == null ? `<span class="sl-sub">Catalog: ${formatQty(i.catalog_reorder_level)}</span>` : ""}</td>
            <td class="num">${input("max", d.max, "Maximum")}</td>
            <td>${changed ? `<span class="sl-badge over">Unsaved</span>` : statusBadge(i.status)}</td>
            <td>${i.level_updated_at ? `${escapeHtml(i.level_set_by || "—")}<span class="sl-sub">${formatDate(String(i.level_updated_at).slice(0, 10))}</span>` : "—"}</td>
        </tr>`;
}

function onLevelInput(event) {
    const input = event.target;
    const id = Number(input.dataset.drug);
    const item = current.items.find((i) => i.drug_id === id);
    const d = { ...draftFor(item), [input.dataset.field]: input.value };

    if (d.min.trim() === text(item.min_level) && d.max.trim() === text(item.max_level)) {
        drafts.delete(id);
    } else {
        drafts.set(id, d);
    }
    delete errors[id];

    // Update just this row's look, keeping focus in the input.
    const row = input.closest("tr");
    const changed = drafts.has(id);
    row.classList.toggle("changed", changed);
    row.classList.remove("has-error");
    row.querySelector(".sl-err")?.remove();
    row.cells[5].innerHTML = changed ? `<span class="sl-badge over">Unsaved</span>` : statusBadge(item.status);
    renderSaveBar();
}

function renderSaveBar() {
    const bar = $("slSaveBar");
    if (!bar || !canEdit) return;
    const count = changedRows().length;

    bar.innerHTML = count ? `
        <div class="sl-savebar">
            <span><strong>${count}</strong> unsaved change${count === 1 ? "" : "s"} at ${escapeHtml(current.location.name)}</span>
            <div class="sl-actions">
                <button type="button" class="sl-btn" id="slUndo">Undo Changes</button>
                <button type="button" class="sl-btn primary" id="slSave">Save ${count} Change${count === 1 ? "" : "s"}</button>
            </div>
        </div>` : "";

    if (count) {
        $("slUndo").addEventListener("click", () => { drafts = new Map(); errors = {}; renderLevels(); });
        $("slSave").addEventListener("click", saveChanges);
    }
}

async function saveChanges() {
    const rows = changedRows();
    if (!rows.length) return;

    $("slSave").disabled = true;
    const result = await saveLocationLevels(current.location.id, rows.map((i) => {
        const d = drafts.get(i.drug_id);
        return { drug_id: i.drug_id, min_level: d.min.trim(), max_level: d.max.trim() };
    }));

    if (!result?.success) {
        errors = result?.errors && typeof result.errors === "object" ? { ...result.errors } : {};
        showToast(result?.message || "Couldn't save the levels.", "error");
        renderLevels();
        return;
    }

    showToast(result.message || "Levels saved.", "success");
    await Promise.all([loadLevels(), refreshOptions()]);
    loadLow();
}

async function refreshOptions() {
    const result = await fetchStockLevelOptions();
    if (result?.success) locations = result.data.locations;
}

/* ---------------------------------------------------------------
 * Dialogs
 * ------------------------------------------------------------- */

function openDialog({ title, body, okLabel, okClass = "primary", run }) {
    return new Promise((resolve) => {
        const overlay = $("slDialogOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("slDialogOk").onclick = null;
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("slDialogTitle").textContent = title;
        $("slDialogBody").innerHTML = body;
        $("slDialogAlert").innerHTML = "";
        $("slDialogOk").textContent = okLabel;
        $("slDialogOk").className = `sl-btn ${okClass}`;
        $("slDialogOk").disabled = false;

        $("slDialogOk").onclick = async () => {
            if (!run) {
                finish(true);
                return;
            }
            $("slDialogOk").disabled = true;
            const result = await run();
            $("slDialogOk").disabled = false;
            if (!result?.success) {
                $("slDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message || "Something went wrong.")}</div>`;
                return;
            }
            if (result.message) showToast(result.message, "success");
            finish(true);
        };

        $("slDialogClose").onclick = () => finish(false);
        $("slDialogCancel").onclick = () => finish(false);
        overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
        document.addEventListener("keydown", onKey);
        overlay.classList.add("open");
        ($("slDialogBody").querySelector("select, input") || $("slDialogOk")).focus();
    });
}

async function confirmDiscard() {
    if (!current || !changedRows().length) return true;
    const count = changedRows().length;
    const ok = await openDialog({
        title: "Discard unsaved changes?",
        body: `<p>You have ${count} unsaved change${count === 1 ? "" : "s"} at <b>${escapeHtml(current.location.name)}</b>. They'll be lost if you continue.</p>`,
        okLabel: "Discard Changes", okClass: "danger"
    });
    if (ok) {
        drafts = new Map();
        errors = {};
    }
    return ok;
}

async function openCopy() {
    if (!current) return;
    if (!(await confirmDiscard())) return;

    const others = locations.filter((l) => l.id !== current.location.id);
    if (!others.length) {
        showToast("There's no other location to copy from.", "info");
        return;
    }
    const withLevels = others.filter((l) => l.counts.tracked > 0);

    const copied = await openDialog({
        title: `Copy levels to ${current.location.name}`,
        body: `
            <p>Copy every minimum and maximum set at another location to <b>${escapeHtml(current.location.name)}</b>. You can adjust them afterwards.</p>
            <label for="slCopyFrom">Copy from</label>
            <select id="slCopyFrom">${(withLevels.length ? withLevels : others).map((l) => `<option value="${l.id}">${escapeHtml(l.name)} — ${l.counts.tracked} level${l.counts.tracked === 1 ? "" : "s"}</option>`).join("")}</select>
            <label class="sl-radio"><input type="radio" name="slCopyMode" value="keep" checked><span>Only add items that have no level here yet<span class="sl-sub">Levels already set at ${escapeHtml(current.location.name)} are kept.</span></span></label>
            <label class="sl-radio"><input type="radio" name="slCopyMode" value="overwrite"><span>Also replace levels already set here</span></label>`,
        okLabel: "Copy Levels",
        run: () => copyLocationLevels(Number($("slCopyFrom").value), current.location.id, document.querySelector('input[name="slCopyMode"]:checked')?.value === "overwrite")
    });

    if (copied) {
        await Promise.all([loadLevels(), refreshOptions()]);
        loadLow();
    }
}

/* ---------------------------------------------------------------
 * Export & print
 * ------------------------------------------------------------- */

function lowCsv() {
    const rows = [["Low Stock"], ["As of", todayISO()], [],
        ["Location", "Item", "Generic Name", "Unit", "Status", "Usable", "Expired", "Minimum", "Maximum", "Short By", "On the Way", "Requested", "Suggested"]];
    low.locations.forEach((l) => lowItems(l).forEach((i) => rows.push([
        l.name, i.drug_name, i.generic_name || "", i.unit_name || "", STATUS[i.status]?.[0] || i.status, i.usable, i.expired, i.min_level,
        i.max_level ?? "", i.shortfall, i.incoming, i.requested, i.suggested_qty
    ])));
    return rows;
}

function downloadCsv(rows, name) {
    const cell = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${name}-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function printLow() {
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    const sections = low.locations.filter((l) => lowItems(l).length).map((l) => `
        <h2>${escapeHtml(l.name)}${l.custodian_name ? ` <span class="muted">· Custodian: ${escapeHtml(l.custodian_name)}</span>` : ""}</h2>
        <table><thead><tr><th>Item</th><th>Status</th><th class="num">Usable</th><th class="num">Min</th><th class="num">Max</th><th class="num">Short By</th><th class="num">On the Way</th><th class="num">Suggested</th></tr></thead>
        <tbody>${lowItems(l).map((i) => `<tr><td>${escapeHtml(i.drug_name)}<span class="sub">${escapeHtml(i.unit_name || "units")}</span></td><td>${escapeHtml(STATUS[i.status]?.[0] || i.status)}</td>
            <td class="num">${formatQty(i.usable)}</td><td class="num">${formatQty(i.min_level)}</td><td class="num">${i.max_level != null ? formatQty(i.max_level) : ""}</td>
            <td class="num">${formatQty(i.shortfall)}</td><td class="num">${i.incoming ? formatQty(i.incoming) : ""}</td><td class="num b">${i.suggested_qty ? formatQty(i.suggested_qty) : ""}</td></tr>`).join("")}</tbody></table>`).join("");

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Low Stock</title>
<style>
    @page { size: A4 portrait; margin: 12mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; margin: 0; padding: 20px; }
    h1 { margin: 0 0 2px; font-size: 18px; } h2 { font-size: 13px; margin: 16px 0 6px; } .muted { color: #4b5563; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; } th { background: #f3f4f6; text-align: left; font-size: 9.5px; text-transform: uppercase; padding: 5px; border: 1px solid #d1d5db; }
    td { padding: 5px; border: 1px solid #d1d5db; vertical-align: top; } .num { text-align: right; white-space: nowrap; } .b { font-weight: 700; }
    .sub { display: block; color: #4b5563; font-size: 10px; }
</style></head><body>
    <h1>LOW STOCK BY STORAGE LOCATION</h1>
    <div class="muted">${$("slLowLocation").value ? escapeHtml(locationName($("slLowLocation").value)) : "All locations"} · ${low.totals.out} out, ${low.totals.low} low · usable stock excludes expired lots · printed ${formatDate(todayISO())}</div>
    ${sections || "<p>No items are below their minimum.</p>"}
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script></body></html>`);
    win.document.close();
}
