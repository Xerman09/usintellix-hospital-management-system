import { fetchStockLevelOptions, fetchLocationLevels, saveLocationLevels, copyLocationLevels, fetchLowStock, saveReorderPolicies, evaluateReorderThresholds } from "./stock-levels.service.js?v=5";
import { formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=5";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js?v=3";
import { getUser } from "../../core/session.js?v=5";

const STATUS = {
    out: ["Out of stock", "out"], low: ["Low", "low"], ok: ["OK", "ok"], over: ["Over max", "over"], no_level: ["No level set", "no_level"]
};

let canEdit = false;
let locations = [];
let low = null;
let current = null;      // levels() result of the location being edited
let drafts = new Map();  // drug_id -> {min, max} as typed
let errors = {};         // drug_id -> message from the last save
let policyCurrent = null;
let policyDrafts = new Map(); // drug_id -> { avg_daily_consumption, lead_time_days, safety_stock, max_stock_level, reorder_quantity, auto_generate_draft_pr }

const $ = (id) => document.getElementById(id);

export async function initStockLevels() {
    canEdit = getUser()?.role === "admin";
    // The page is rebuilt each time the tab opens; start clean.
    locations = [];
    low = null;
    current = null;
    drafts = new Map();
    errors = {};
    policyCurrent = null;
    policyDrafts = new Map();

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

    if ($("slPolicyLocation")) {
        $("slPolicyLocation").addEventListener("change", loadPolicyLevels);
        $("slPolicySearch").addEventListener("input", renderPolicyLevels);
        $("slPolicyShow").addEventListener("change", renderPolicyLevels);
        $("slRunReorderEval").addEventListener("click", () => runReorderEvaluation($("slPolicyLocation").value));
    }

    const result = await fetchStockLevelOptions();
    if (!result?.success) {
        $("slLowBody").innerHTML = `<div class="sl-empty">${escapeHtml(result?.message || "Couldn't load the storage locations.")}</div>`;
        return;
    }

    locations = result.data.locations;
    $("slLowLocation").innerHTML = `<option value="">All locations</option>` + locationOptions();
    $("slSetLocation").innerHTML = locationOptions();
    if ($("slPolicyLocation")) {
        $("slPolicyLocation").innerHTML = locationOptions();
    }
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
    if ($("slPolicyPanel")) $("slPolicyPanel").hidden = name !== "policies";
    if (name === "set" && !current) loadLevels();
    if (name === "policies" && !policyCurrent) loadPolicyLevels();
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
    $("slLowBody").querySelectorAll("[data-sl-policy]").forEach((btn) => btn.addEventListener("click", () => openPolicyLocation(btn.dataset.slPolicy)));
    $("slLowBody").querySelectorAll("[data-sl-eval]").forEach((btn) => btn.addEventListener("click", () => runReorderEvaluation(btn.dataset.slEval)));
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
            <thead><tr><th>Item</th><th>Status</th><th class="num">Usable</th><th class="num">Minimum (ROP)</th><th class="num">Maximum</th><th class="num">Short By</th><th class="num">On the Way</th><th class="num">Requested</th><th class="num">Suggested</th></tr></thead>
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
                <div class="sl-chips">
                    ${chips}
                    ${(c.out || c.low) ? `<button type="button" class="sl-btn small primary" data-sl-eval="${l.id}">Auto-Draft PR</button>` : ""}
                    <button type="button" class="sl-btn small" data-sl-policy="${l.id}">ROP Policy</button>
                    <button type="button" class="sl-btn small" data-sl-edit="${l.id}">${canEdit ? "Set levels" : "View levels"}</button>
                </div>
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
 * Automated Reorder Policies (Reorder Point = ADC × Lead Time + Safety Stock)
 * ------------------------------------------------------------- */

async function openPolicyLocation(id) {
    showTab("policies");
    if ($("slPolicyLocation")) {
        $("slPolicyLocation").value = String(id);
        await loadPolicyLevels();
    }
}

async function loadPolicyLevels() {
    const id = $("slPolicyLocation")?.value;
    if (!id) {
        $("slPolicyBody").innerHTML = `<div class="sl-empty">Select a storage location.</div>`;
        return;
    }

    $("slPolicyBody").innerHTML = `<div class="sl-empty">Loading automated reorder policies...</div>`;
    const result = await fetchLocationLevels(id);
    if (!result?.success) {
        policyCurrent = null;
        $("slPolicyBody").innerHTML = `<div class="sl-empty">${escapeHtml(result?.message || "Couldn't load reorder policies.")}</div>`;
        return;
    }

    policyCurrent = result.data;
    policyDrafts = new Map();
    renderPolicyLevels();
}

function calcRop(adc, lead, safety) {
    const a = Math.max(0, Number(adc) || 0);
    const l = Math.max(0, Math.round(Number(lead) || 0));
    const s = Math.max(0, Number(safety) || 0);
    return Math.round(((a * l) + s) * 1000) / 1000;
}

function policyDraftFor(item) {
    if (policyDrafts.has(item.drug_id)) return policyDrafts.get(item.drug_id);
    const pol = item.reorder_policy || {};
    return {
        avg_daily_consumption: String(pol.avg_daily_consumption ?? 0),
        lead_time_days: String(pol.lead_time_days ?? 7),
        safety_stock: String(pol.safety_stock ?? 0),
        max_stock_level: pol.max_stock_level != null ? String(pol.max_stock_level) : (item.max_level != null ? String(item.max_level) : ""),
        reorder_quantity: String(pol.reorder_quantity ?? 0),
        auto_generate_draft_pr: pol.auto_generate_draft_pr !== false
    };
}

function renderPolicyLevels() {
    if (!policyCurrent || !$("slPolicyBody")) return;

    const term = ($("slPolicySearch")?.value || "").trim().toLowerCase();
    const filter = $("slPolicyShow")?.value || "all";
    const alerts = policyCurrent.reorder_alerts || [];

    const items = (policyCurrent.items || []).filter((i) => {
        if (term && !i.drug_name.toLowerCase().includes(term) && !(i.generic_name || "").toLowerCase().includes(term)) return false;
        if (policyDrafts.has(i.drug_id)) return true;
        const d = policyDraftFor(i);
        const rop = calcRop(d.avg_daily_consumption, d.lead_time_days, d.safety_stock);
        if (filter === "breached") return rop > 0 && i.usable <= rop;
        if (filter === "configured") return rop > 0 || (i.reorder_policy && i.reorder_policy.id != null);
        return true;
    });

    const breachedCount = (policyCurrent.items || []).filter((i) => {
        const d = policyDraftFor(i);
        const rop = calcRop(d.avg_daily_consumption, d.lead_time_days, d.safety_stock);
        return rop > 0 && i.usable <= rop;
    }).length;

    const alertsBanner = alerts.length ? `
        <div class="sl-card alert" style="margin-bottom:14px;">
            <div class="sl-card-head">
                <div>
                    <h3>&#9888; Active Reorder Threshold Breach Alerts (${alerts.length})</h3>
                    <span class="sl-sub">Stock has breached <b>Reorder Point = (Avg Daily Consumption &times; Lead Time Days) + Safety Stock</b>. Draft Purchase Requisitions are automatically generated.</span>
                </div>
            </div>
            <div class="sl-table-wrap">
                <table class="sl-table">
                    <thead><tr><th>Medicine</th><th class="num">Usable Stock</th><th class="num">Reorder Point (ROP)</th><th class="num">Suggested Order Qty</th><th>Auto-Generated Requisition</th><th>Trigger</th></tr></thead>
                    <tbody>
                        ${alerts.map((a) => `
                            <tr>
                                <td><strong>${escapeHtml(a.drug_name)}</strong></td>
                                <td class="num"><strong style="color:#b91c1c;">${formatQty(a.usable_stock)}</strong> ${escapeHtml(a.unit_name || "")}</td>
                                <td class="num"><strong>${formatQty(a.reorder_point)}</strong> ${escapeHtml(a.unit_name || "")}</td>
                                <td class="num"><strong>${formatQty(a.suggested_order_qty)}</strong> ${escapeHtml(a.unit_name || "")}</td>
                                <td>${a.pr_number ? `<span class="sl-badge ok">Draft PR: ${escapeHtml(a.pr_number)}</span>` : `<span class="sl-badge low">Alert Open</span>`}</td>
                                <td><span class="sl-sub">${escapeHtml(a.trigger_source || "check")} · ${escapeHtml(String(a.triggered_at || "").slice(0, 16))}</span></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    ` : "";

    $("slPolicyBody").innerHTML = `
        <div class="sl-stats">
            <div class="sl-stat"><strong>${(policyCurrent.items || []).length}</strong><span>Catalog Items at ${escapeHtml(policyCurrent.location.name)}</span></div>
            <div class="sl-stat ${breachedCount ? "out" : ""}"><strong>${breachedCount}</strong><span>Breaching Reorder Point (Usable &le; ROP)</span></div>
            <div class="sl-stat"><strong>${alerts.filter((a) => a.pr_number).length}</strong><span>Auto-Drafted Purchase Requisitions</span></div>
        </div>
        ${alertsBanner}
        <div class="sl-card">
            <div class="sl-card-head">
                <div>
                    <h3>Automated Reorder Formula: <code style="font-size:13px;background:var(--bg-surface-alt);padding:2px 6px;border-radius:4px;">Reorder Point = (Avg Daily Consumption &times; Lead Time Days) + Safety Stock</code></h3>
                    <span class="sl-sub">Saving policies synchronizes the calculated Reorder Point to the location's Minimum Level and automatically raises a Draft Purchase Requisition when breached.</span>
                </div>
            </div>
            ${items.length ? `<div class="sl-table-wrap"><table class="sl-table wide">
                <thead>
                    <tr>
                        <th>Medicine</th>
                        <th class="num">Usable Stock</th>
                        <th class="num">30d Observed / Day</th>
                        <th class="num">Avg Daily Consumption</th>
                        <th class="num">Lead Time (Days)</th>
                        <th class="num">Safety Stock</th>
                        <th class="num">Calculated ROP</th>
                        <th class="num">Max Stock</th>
                        <th>Auto-Draft PR</th>
                        <th>Status / PR</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((i) => {
                        const d = policyDraftFor(i);
                        const rop = calcRop(d.avg_daily_consumption, d.lead_time_days, d.safety_stock);
                        const breached = rop > 0 && i.usable <= rop;
                        const changed = policyDrafts.has(i.drug_id);
                        const obs30d = i.reorder_policy?.observed_30d_daily || 0;
                        const alert = i.active_reorder_alert;
                        return `
                            <tr class="${changed ? "changed" : ""}" data-pol-row="${i.drug_id}">
                                <td>
                                    <strong>${escapeHtml(i.drug_name)}</strong>
                                    <span class="sl-sub">${escapeHtml([i.generic_name, i.strength, i.unit_name || "units"].filter(Boolean).join(" · "))}</span>
                                </td>
                                <td class="num"><strong>${formatQty(i.usable)}</strong></td>
                                <td class="num">${formatQty(obs30d)} / day</td>
                                <td class="num">
                                    ${canEdit ? `<input type="number" min="0" step="any" class="sl-qty pol-input" data-drug="${i.drug_id}" data-pol-field="avg_daily_consumption" value="${escapeHtml(d.avg_daily_consumption)}">` : formatQty(Number(d.avg_daily_consumption))}
                                </td>
                                <td class="num">
                                    ${canEdit ? `<input type="number" min="0" step="1" class="sl-qty pol-input" style="width:72px;" data-drug="${i.drug_id}" data-pol-field="lead_time_days" value="${escapeHtml(d.lead_time_days)}">` : escapeHtml(d.lead_time_days)}
                                </td>
                                <td class="num">
                                    ${canEdit ? `<input type="number" min="0" step="any" class="sl-qty pol-input" data-drug="${i.drug_id}" data-pol-field="safety_stock" value="${escapeHtml(d.safety_stock)}">` : formatQty(Number(d.safety_stock))}
                                </td>
                                <td class="num" data-rop-cell="${i.drug_id}">
                                    <strong style="color:${breached ? "#b91c1c" : "var(--text-primary)"};">${formatQty(rop)}</strong>
                                </td>
                                <td class="num">
                                    ${canEdit ? `<input type="number" min="0" step="any" class="sl-qty pol-input" data-drug="${i.drug_id}" data-pol-field="max_stock_level" value="${escapeHtml(d.max_stock_level)}" placeholder="Auto">` : (d.max_stock_level ? formatQty(Number(d.max_stock_level)) : "—")}
                                </td>
                                <td>
                                    ${canEdit ? `<input type="checkbox" class="pol-check" data-drug="${i.drug_id}" data-pol-field="auto_generate_draft_pr" ${d.auto_generate_draft_pr ? "checked" : ""}>` : (d.auto_generate_draft_pr ? "Yes" : "No")}
                                </td>
                                <td data-status-cell="${i.drug_id}">
                                    ${alert?.pr_number
                                        ? `<span class="sl-badge out">Breached &rarr; ${escapeHtml(alert.pr_number)}</span>`
                                        : breached
                                            ? `<span class="sl-badge low">Breached (&le; ROP)</span>`
                                            : rop > 0
                                                ? `<span class="sl-badge ok">Above ROP</span>`
                                                : `<span class="sl-badge no_level">Unset</span>`}
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table></div>` : `<div class="sl-empty">No items match the filter.</div>`}
        </div>
        <div id="slPolicySaveBar"></div>
    `;

    if (canEdit) {
        $("slPolicyBody").querySelectorAll(".pol-input").forEach((inp) => inp.addEventListener("input", onPolicyInput));
        $("slPolicyBody").querySelectorAll(".pol-check").forEach((chk) => chk.addEventListener("change", onPolicyInput));
    }
    renderPolicySaveBar();
}

function onPolicyInput(event) {
    const el = event.target;
    const drugId = Number(el.dataset.drug);
    const field = el.dataset.polField;
    const item = (policyCurrent?.items || []).find((i) => i.drug_id === drugId);
    if (!item) return;

    const d = { ...policyDraftFor(item) };
    d[field] = el.type === "checkbox" ? el.checked : el.value;
    policyDrafts.set(drugId, d);

    const rop = calcRop(d.avg_daily_consumption, d.lead_time_days, d.safety_stock);
    const breached = rop > 0 && item.usable <= rop;
    const row = el.closest("tr");
    if (row) {
        row.classList.add("changed");
        const ropCell = row.querySelector(`[data-rop-cell="${drugId}"]`);
        if (ropCell) {
            ropCell.innerHTML = `<strong style="color:${breached ? "#b91c1c" : "var(--text-primary)"};">${formatQty(rop)}</strong>`;
        }
        const statusCell = row.querySelector(`[data-status-cell="${drugId}"]`);
        if (statusCell) {
            statusCell.innerHTML = `<span class="sl-badge over">Unsaved (ROP: ${formatQty(rop)})</span>`;
        }
    }
    renderPolicySaveBar();
}

function renderPolicySaveBar() {
    const bar = $("slPolicySaveBar");
    if (!bar || !canEdit) return;
    const count = policyDrafts.size;
    bar.innerHTML = count ? `
        <div class="sl-savebar">
            <span><strong>${count}</strong> unsaved reorder ${count === 1 ? "policy" : "policies"} at ${escapeHtml(policyCurrent.location.name)}</span>
            <div class="sl-actions">
                <button type="button" class="sl-btn" id="slPolicyUndo">Discard</button>
                <button type="button" class="sl-btn primary" id="slPolicySave">Save ${count} Reorder ${count === 1 ? "Policy" : "Policies"} &amp; Check Breaches</button>
            </div>
        </div>
    ` : "";

    if (count) {
        $("slPolicyUndo").addEventListener("click", () => { policyDrafts = new Map(); renderPolicyLevels(); });
        $("slPolicySave").addEventListener("click", savePolicyChanges);
    }
}

async function savePolicyChanges() {
    if (!policyCurrent || !policyDrafts.size) return;
    const btn = $("slPolicySave");
    if (btn) btn.disabled = true;

    const payload = [];
    policyDrafts.forEach((d, drugId) => {
        payload.push({
            drug_id: drugId,
            avg_daily_consumption: Number(d.avg_daily_consumption) || 0,
            lead_time_days: Math.max(0, Math.round(Number(d.lead_time_days) || 0)),
            safety_stock: Number(d.safety_stock) || 0,
            max_stock_level: d.max_stock_level !== "" ? Number(d.max_stock_level) : null,
            reorder_quantity: Number(d.reorder_quantity) || 0,
            auto_generate_draft_pr: Boolean(d.auto_generate_draft_pr)
        });
    });

    const res = await saveReorderPolicies(policyCurrent.location.id, payload);
    if (!res?.success) {
        showToast(res?.message || "Failed to save reorder policies.", "error");
        if (btn) btn.disabled = false;
        return;
    }

    showToast(res.message || "Reorder policies saved.", "success");
    current = null;
    await Promise.all([loadPolicyLevels(), refreshOptions(), loadLow()]);
}

async function runReorderEvaluation(warehouseId) {
    const whId = Number(warehouseId || $("slPolicyLocation")?.value || $("slLowLocation")?.value || 0);
    if (!whId) {
        showToast("Choose a storage location first.", "info");
        return;
    }

    const btn = $("slRunReorderEval");
    if (btn) btn.disabled = true;
    const res = await evaluateReorderThresholds(whId);
    if (btn) btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Reorder check failed.", "error");
        return;
    }

    showToast(res.message || "Reorder check completed.", res.data?.draft_pr_number ? "warning" : "success");
    current = null;
    if (policyCurrent && Number(policyCurrent.location.id) === whId) {
        await loadPolicyLevels();
    }
    await Promise.all([refreshOptions(), loadLow()]);
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
