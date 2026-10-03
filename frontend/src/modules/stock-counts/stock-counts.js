import {
    fetchStockCounts, fetchStockCount, fetchStockCountOptions, fetchDifferenceReport,
    startStockCount, saveStockCount, stockCountAction
} from "./stock-counts.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";

const STATUS_LABELS = { counting: "Counting", submitted: "For approval", rejected: "Recount", approved: "Approved", cancelled: "Cancelled" };
const HISTORY_LABELS = {
    started: "Count started", submitted: "Submitted for approval", resubmitted: "Resubmitted for approval",
    approved: "Approved — stock corrected", rejected: "Sent back for a recount", cancelled: "Cancelled"
};
const TABS = [
    { id: "all", label: "All", filter: () => true },
    { id: "open", label: "In Progress", filter: (c) => ["counting", "rejected"].includes(c.status) },
    { id: "approve", label: "For My Approval", filter: (c) => c.can_approve },
    { id: "submitted", label: "Waiting for Approval", filter: (c) => c.status === "submitted" },
    { id: "approved", label: "Approved", filter: (c) => c.status === "approved" },
    { id: "cancelled", label: "Cancelled", filter: (c) => c.status === "cancelled" }
];
const EPS = 0.0005;

let counts = [];
let activeTab = "all";
let options = null;

// Count being entered
let current = null;
let entries = {};   // item id -> { counted, reason, notes }
let added = [];     // { key, drug_id, lot_number, expires_date, counted, reason, notes }
let addKey = 0;
let dirty = false;
let blind = false;

const $ = (id) => document.getElementById(id);

export async function initStockCounts() {
    $("scNewBtn").addEventListener("click", openStart);
    $("scReportBtn").addEventListener("click", openReport);
    $("scSearch").addEventListener("input", renderList);
    document.querySelectorAll("[data-sc-back]").forEach((btn) => btn.addEventListener("click", leaveToList));
    setupStart();
    setupReport();

    await loadOptions();
    await loadList();
}

async function loadOptions() {
    const result = await fetchStockCountOptions();
    options = result?.success ? result.data : { warehouses: [], drugs: [], stock: [], reasons: [], can_count: false, can_approve: false };
    $("scNewBtn").hidden = !options.can_count;
}

/* ---------------------------------------------------------------
 * List
 * ------------------------------------------------------------- */

async function loadList() {
    $("scList").innerHTML = `<div class="sc-empty">Loading...</div>`;
    const result = await fetchStockCounts();

    if (!result?.success) {
        $("scList").innerHTML = `<div class="sc-empty"><strong>Couldn't load the counts.</strong><span class="sc-sub">${escapeHtml(result?.message || "The server didn't respond.")}</span>
            <button type="button" class="sc-btn small" id="scRetry" style="margin-top:10px;">Try Again</button></div>`;
        $("scRetry").addEventListener("click", loadList);
        return;
    }

    counts = result.data || [];
    const year = todayISO().slice(0, 4);
    const thisYear = counts.filter((c) => c.status === "approved" && String(c.approved_at || "").startsWith(year));
    $("scStatOpen").textContent = counts.filter((c) => ["counting", "rejected", "submitted"].includes(c.status)).length;
    $("scStatMine").textContent = counts.filter((c) => c.can_approve).length;
    $("scStatGain").textContent = formatMoney(thisYear.reduce((sum, c) => sum + c.gain_value, 0));
    $("scStatLoss").textContent = formatMoney(thisYear.reduce((sum, c) => sum + c.loss_value, 0));

    if (activeTab === "all" && counts.some((c) => c.can_approve)) activeTab = "approve";
    renderTabs();
    renderList();
}

function renderTabs() {
    $("scTabs").innerHTML = TABS.map((t) => {
        const count = counts.filter(t.filter).length;
        return `<button type="button" data-sc-tab="${t.id}" class="${t.id === activeTab ? "active" : ""}">${t.label}${t.id !== "all" && count ? `<span class="count">${count}</span>` : ""}</button>`;
    }).join("");
    $("scTabs").querySelectorAll("[data-sc-tab]").forEach((btn) => btn.addEventListener("click", () => {
        activeTab = btn.dataset.scTab;
        renderTabs();
        renderList();
    }));
}

function renderList() {
    const term = $("scSearch").value.trim().toLowerCase();
    const tab = TABS.find((t) => t.id === activeTab) || TABS[0];
    const list = counts.filter(tab.filter).filter((c) => !term
        || [c.sc_number, c.warehouse_name, c.created_by_name, c.notes].some((v) => (v || "").toLowerCase().includes(term)));

    $("scCount").textContent = `${list.length} count${list.length === 1 ? "" : "s"}`;

    if (!list.length) {
        $("scList").innerHTML = `<div class="sc-empty">${counts.length ? "No counts here." : `No stock counts yet.${options.can_count ? " Use “+ Start Count” to count a storage location." : ""}`}</div>`;
        return;
    }

    $("scList").innerHTML = `
        <div class="sc-table-wrap">
            <table class="sc-table">
                <thead><tr><th>SC No.</th><th>Location</th><th>Started</th><th>Counted</th><th class="num">Differences</th><th class="num">Gain</th><th class="num">Loss</th><th>Status</th></tr></thead>
                <tbody>${list.map((c) => {
                    const pct = c.line_count ? Math.round((c.counted_count / c.line_count) * 100) : 0;
                    return `
                    <tr class="sc-row" data-sc-open="${c.id}">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(c.sc_number)}</strong> <span class="sc-badge ${c.count_type}">${c.count_type === "full" ? "Full" : "Selected items"}</span><span class="sc-sub">by ${escapeHtml(c.created_by_name || "—")}</span></td>
                        <td>${escapeHtml(c.warehouse_name)}</td>
                        <td style="white-space:nowrap;">${escapeHtml(formatDateTime(c.started_at))}</td>
                        <td><span class="sc-sub" style="margin:0;">${c.counted_count} of ${c.line_count} lots</span><div class="sc-bar"><span style="width:${pct}%;"></span></div></td>
                        <td class="num">${c.diff_count || "—"}</td>
                        <td class="num">${c.gain_value ? `<span class="sc-plus">${formatMoney(c.gain_value)}</span>` : "—"}</td>
                        <td class="num">${c.loss_value ? `<span class="sc-minus">${formatMoney(c.loss_value)}</span>` : "—"}</td>
                        <td><span class="sc-badge ${c.status}">${STATUS_LABELS[c.status]}</span>${c.can_approve ? `<span class="sc-sub">Waiting for you</span>` : ""}</td>
                    </tr>`;
                }).join("")}
                </tbody>
            </table>
        </div>
        <p class="sc-sub" style="margin-top:8px;">Gain and loss are estimates until a count is approved.</p>`;

    $("scList").querySelectorAll("[data-sc-open]").forEach((row) => row.addEventListener("click", () => openCount(Number(row.dataset.scOpen))));
}

function showPanel(name) {
    ["List", "Start", "Detail", "Report"].forEach((p) => { $(`sc${p}Panel`).hidden = p.toLowerCase() !== name; });
    document.querySelector(".sc-page").scrollIntoView({ block: "start" });
}

async function leaveToList() {
    if (dirty && !$("scDetailPanel").hidden) {
        const leave = await openDialog({
            title: "Leave without saving?", body: "<p>The counts entered since the last save will be lost.</p>",
            okLabel: "Leave", okClass: "danger solid", run: async () => ({ success: true })
        });
        if (!leave) return;
    }

    dirty = false;
    showPanel("list");
    await loadList();
}

/* ---------------------------------------------------------------
 * Start a count
 * ------------------------------------------------------------- */

function setupStart() {
    $("sc_warehouse_id").addEventListener("change", () => { showWarehouseHint(); renderPicks(); });
    $("scTypeChoice").addEventListener("change", () => {
        const type = document.querySelector('input[name="sc_type"]:checked').value;
        $("scTypeChoice").querySelectorAll("label").forEach((l) => l.classList.toggle("active", l.querySelector("input").checked));
        $("scPickField").hidden = type !== "partial";
        renderPicks();
    });
    $("scPickSearch").addEventListener("input", renderPicks);
    $("scPickStocked").addEventListener("change", renderPicks);
    $("scPicks").addEventListener("change", updatePickCount);
    $("scStartBtn").addEventListener("click", start);
}

async function openStart() {
    await loadOptions();
    $("scStartAlert").innerHTML = "";
    document.querySelectorAll("#scStartPanel .form-error").forEach((el) => { el.textContent = ""; });
    $("sc_warehouse_id").innerHTML = `<option value="">-- Choose the location to count --</option>` +
        options.warehouses.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}${w.open_count_number ? ` (${escapeHtml(w.open_count_number)} open)` : ""}</option>`).join("");
    document.querySelector('input[name="sc_type"][value="full"]').checked = true;
    $("scTypeChoice").dispatchEvent(new Event("change"));
    $("sc_notes").value = "";
    $("scPickSearch").value = "";
    showWarehouseHint();
    showPanel("start");
}

function showWarehouseHint() {
    const w = options.warehouses.find((x) => x.id === Number($("sc_warehouse_id").value));
    $("scWarehouseHint").innerHTML = !w ? ""
        : w.open_count_id ? `${escapeHtml(w.open_count_number)} is still open here. <a href="#" data-sc-goto="${w.open_count_id}">Open it</a> — finish or cancel it before starting another.`
        : `${w.lot_count} lot${w.lot_count === 1 ? "" : "s"} in stock · last full count ${w.last_full_count ? formatDate(w.last_full_count) : "never"}`;
    $("scWarehouseHint").querySelector("[data-sc-goto]")?.addEventListener("click", (event) => {
        event.preventDefault();
        openCount(Number(event.target.dataset.scGoto));
    });
}

function renderPicks() {
    if ($("scPickField").hidden) return;
    const warehouseId = Number($("sc_warehouse_id").value);
    const checked = new Set([...$("scPicks").querySelectorAll("input:checked")].map((i) => Number(i.value)));
    const stockHere = new Map(options.stock.filter((s) => s.warehouse_id === warehouseId).map((s) => [s.drug_id, s]));
    const term = $("scPickSearch").value.trim().toLowerCase();
    const list = options.drugs.filter((d) => (!$("scPickStocked").checked || stockHere.has(d.id) || checked.has(d.id))
        && (!term || d.name.toLowerCase().includes(term)));

    $("scPicks").innerHTML = list.length ? list.map((d) => {
        const stock = stockHere.get(d.id);
        return `<label><input type="checkbox" value="${d.id}" ${checked.has(d.id) ? "checked" : ""}><span>${escapeHtml(d.name)}</span>
            <span class="sc-sub">${stock ? `${formatQty(stock.on_hand)} ${escapeHtml(d.unit_name || "units")} · ${stock.lots} lot${stock.lots === 1 ? "" : "s"}` : "None on file here"}</span></label>`;
    }).join("") : `<div class="sc-empty" style="border:none;">${warehouseId ? "No items match." : "Choose the location first."}</div>`;
    updatePickCount();
}

function updatePickCount() {
    const n = $("scPicks").querySelectorAll("input:checked").length;
    $("scPickCount").textContent = n ? `${n} item${n === 1 ? "" : "s"} chosen` : "";
}

async function start() {
    document.querySelectorAll("#scStartPanel .form-error").forEach((el) => { el.textContent = ""; });
    $("scStartAlert").innerHTML = "";
    const type = document.querySelector('input[name="sc_type"]:checked').value;
    const drugIds = [...$("scPicks").querySelectorAll("input:checked")].map((i) => Number(i.value));

    if (!$("sc_warehouse_id").value) { $("err-sc_warehouse_id").textContent = "Choose the storage location to count."; return; }
    if (type === "partial" && !drugIds.length) { $("err-sc_drug_ids").textContent = "Choose the items to count."; return; }

    $("scStartBtn").disabled = true;
    const result = await startStockCount({ warehouse_id: $("sc_warehouse_id").value, count_type: type, drug_ids: drugIds, notes: $("sc_notes").value.trim() });
    $("scStartBtn").disabled = false;

    if (!result?.success) {
        const errors = result?.errors || {};
        Object.entries(errors).forEach(([name, message]) => { if ($(`err-sc_${name}`)) $(`err-sc_${name}`).textContent = message; });
        if (!Object.keys(errors).length) showAlert("scStartAlert", result?.message || "Failed to start the count.");
        return;
    }

    showToast(result.message, "success");
    await openCount(result.data.id);
}

/* ---------------------------------------------------------------
 * A count: entering (counting / recount) or reviewing
 * ------------------------------------------------------------- */

async function openCount(id) {
    const result = await fetchStockCount(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the count.", "error");
        return;
    }

    current = result.data;
    dirty = false;
    entries = {};
    added = [];
    current.items.forEach((i) => {
        if (i.is_added) {
            added.push({ key: ++addKey, drug_id: i.drug_id, lot_number: i.lot_number, expires_date: i.expires_date || "",
                counted: i.counted_quantity != null ? String(i.counted_quantity) : "", reason: i.reason || "", notes: i.notes || "" });
        } else {
            entries[i.id] = { counted: i.counted_quantity != null ? String(i.counted_quantity) : "", reason: i.reason || "", notes: i.notes || "" };
        }
    });

    renderCount();
    showPanel("detail");
}

function sheetItems() {
    return current.items.filter((i) => !i.is_added);
}

function renderCount() {
    const c = current;
    const editable = c.can_count;

    $("scDetail").innerHTML = `
        ${banner(c)}
        <div class="sc-card">
            <div class="sc-card-title">
                <span style="font-size:16px;text-transform:none;color:var(--text-primary);">${escapeHtml(c.sc_number)}
                    <span class="sc-badge ${c.status}">${STATUS_LABELS[c.status]}</span> <span class="sc-badge ${c.count_type}">${c.count_type === "full" ? "Full count" : "Selected items"}</span></span>
                <span class="sc-actions">
                    <button type="button" class="sc-btn" id="scPrintSheet" title="Without system quantities, for counting">Print Count Sheet</button>
                    ${["submitted", "approved"].includes(c.status) ? `<button type="button" class="sc-btn" id="scPrintResult">Print Results</button>` : ""}
                    ${c.can_cancel ? `<button type="button" class="sc-btn danger" id="scCancelBtn">Cancel Count</button>` : ""}
                </span>
            </div>
            <dl class="sc-info">${[
                ["Location", escapeHtml(c.warehouse_name) + (c.physical_location ? `<span class="sc-sub">${escapeHtml(c.physical_location)}</span>` : "")],
                ["Custodian", escapeHtml(c.custodian_name || "—")],
                ["Started", `${escapeHtml(formatDateTime(c.started_at))}<span class="sc-sub">by ${escapeHtml(c.created_by_name || "—")}</span>`],
                ["Submitted", c.submitted_at ? `${escapeHtml(formatDateTime(c.submitted_at))}<span class="sc-sub">by ${escapeHtml(c.submitted_by_name || "—")}</span>` : "—"],
                ["Approved", c.approved_at ? `${escapeHtml(formatDateTime(c.approved_at))}<span class="sc-sub">by ${escapeHtml(c.approved_by_name || "—")}</span>` : "—"],
                ["Notes", escapeHtml(c.notes || "—")]
            ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        ${editable ? "" : summaryCards(c)}

        <div class="sc-card">
            <div class="sc-card-title"><span>${editable ? "Enter What Was Counted" : "Count Lines"}</span>${editable ? `<span style="text-transform:none;font-weight:400;">Quantities are in each item's dispensing unit.</span>` : ""}</div>
            <div class="sc-toolbar">
                <input type="text" id="scLineSearch" placeholder="Search item or lot...">
                <label><input type="checkbox" id="scOnlyOpen"> <span id="scOnlyOpenLabel">${editable ? (blind ? "Only uncounted" : "Only uncounted or different") : "Only differences"}</span></label>
                ${editable ? `<label title="Hide system quantities and differences while counting"><input type="checkbox" id="scBlind" ${blind ? "checked" : ""}> Blind entry</label>` : ""}
                <span class="sc-progress" id="scProgress"></span>
            </div>
            <div id="scLines"></div>
        </div>

        ${editable ? `
        <div class="sc-card">
            <div class="sc-card-title"><span>Stock Found That Isn't on the Sheet</span><button type="button" class="sc-btn small" id="scAddFound">+ Add Found Stock</button></div>
            <div id="scAdded"></div>
        </div>
        <div id="scSaveAlert"></div>
        <div class="sc-footer"><div class="sc-footer-right">
            <button type="button" class="sc-btn" id="scSaveBtn">Save Counts</button>
            <button type="button" class="sc-btn primary" id="scSubmitBtn">Submit for Approval</button>
        </div></div>` : ""}

        <div class="sc-card">
            <div class="sc-card-title">History</div>
            <ol class="sc-timeline">${(c.history || []).map((h) => `
                <li class="${h.action}"><strong>${HISTORY_LABELS[h.action] || escapeHtml(h.action)}</strong>${h.user_name ? ` by ${escapeHtml(h.user_name)}` : ""}
                    <span class="when">${escapeHtml(formatDateTime(h.created_at))}</span>${h.notes ? `<span class="note">&ldquo;${escapeHtml(h.notes)}&rdquo;</span>` : ""}</li>`).join("")}</ol>
        </div>`;

    $("scPrintSheet").addEventListener("click", () => printSheet(c));
    $("scPrintResult")?.addEventListener("click", () => printResults(c));
    $("scCancelBtn")?.addEventListener("click", () => act("cancel"));
    $("scApproveBtn")?.addEventListener("click", () => act("approve"));
    $("scRejectBtn")?.addEventListener("click", () => act("reject"));
    $("scLineSearch").addEventListener("input", renderLines);
    $("scOnlyOpen").addEventListener("change", renderLines);

    if (editable) {
        $("scBlind").addEventListener("change", () => {
            blind = $("scBlind").checked;
            $("scOnlyOpenLabel").textContent = blind ? "Only uncounted" : "Only uncounted or different";
            renderLines();
        });
        $("scAddFound").addEventListener("click", () => {
            added.push({ key: ++addKey, drug_id: "", lot_number: "", expires_date: "", counted: "", reason: "found", notes: "" });
            dirty = true;
            renderAdded();
            document.querySelector(`[data-sc-add="${added.at(-1).key}"] select`)?.focus();
        });
        $("scSaveBtn").addEventListener("click", () => save(false));
        $("scSubmitBtn").addEventListener("click", () => save(true));
        setupLineInputs();
        renderAdded();
    }

    renderLines();
}

function banner(c) {
    if (c.status === "submitted") {
        return `<div class="sc-banner submitted"><div><strong>Waiting for approval</strong>
            <span>${c.can_approve ? "Check the differences and their reasons. Approving corrects the stock of every lot." : escapeHtml(c.approval_blocker || "")}</span></div>
            ${c.can_approve ? `<div class="sc-actions"><button type="button" class="sc-btn" id="scRejectBtn">Send Back for Recount</button><button type="button" class="sc-btn success" id="scApproveBtn">Approve Adjustment</button></div>` : ""}</div>`;
    }

    const text = {
        counting: ["Counting", c.can_count ? "Print the count sheet, count the shelf, then enter what was found. Save as you go; submit when every lot is counted." : "Storage location staff are counting."],
        rejected: ["Sent back for a recount", `“${escapeHtml(c.rejection_reason || "")}” — change the counts and submit again.`],
        approved: ["Approved — stock corrected", c.diff_count ? `${c.diff_count} lot${c.diff_count === 1 ? " was" : "s were"} adjusted to the counted quantity.` : "Everything matched; no stock was changed."],
        cancelled: ["Cancelled", `“${escapeHtml(c.cancel_reason || "")}” — no stock was changed.`]
    }[c.status];

    return `<div class="sc-banner ${c.status}"><div><strong>${text[0]}</strong><span>${text[1]}</span></div></div>`;
}

function summaryCards(c) {
    const s = c.summary;
    return `
        <div class="sc-stats">
            <div class="sc-stat"><strong>${c.diff_count}</strong><span>Lots with a difference (of ${c.line_count})</span></div>
            <div class="sc-stat gain"><strong>${formatMoney(s.gain_value)}</strong><span>Value gained${c.status === "approved" ? "" : " (if approved)"}</span></div>
            <div class="sc-stat loss"><strong>${formatMoney(s.loss_value)}</strong><span>Value lost${c.status === "approved" ? "" : " (if approved)"}</span></div>
            <div class="sc-stat ${s.net_value < 0 ? "loss" : s.net_value > 0 ? "gain" : ""}"><strong>${signedMoney(s.net_value)}</strong><span>Net difference</span></div>
        </div>
        ${s.by_reason.length ? `
        <div class="sc-card">
            <div class="sc-card-title">Differences by Reason</div>
            <div class="sc-table-wrap"><table class="sc-table">
                <thead><tr><th>Reason</th><th class="num">Lots</th><th class="num">Quantity</th><th class="num">Value</th></tr></thead>
                <tbody>${s.by_reason.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td class="num">${r.lines}</td><td class="num">${signedQty(r.quantity)}</td><td class="num">${signedMoney(r.value, true)}</td></tr>`).join("")}</tbody>
            </table></div>
        </div>` : ""}`;
}

/** Current entry for a sheet line, as numbers. */
function lineState(item) {
    const e = entries[item.id];
    const counted = e.counted === "" ? null : Number(e.counted);
    const diff = counted === null || Number.isNaN(counted) ? null : round3(counted - item.system_quantity);
    return { e, counted, diff, value: diff === null ? null : round2(diff * item.unit_cost) };
}

function renderLines() {
    const c = current;
    const editable = c.can_count;
    const term = $("scLineSearch").value.trim().toLowerCase();
    const onlyOpen = $("scOnlyOpen").checked;
    const items = editable ? sheetItems() : c.items;

    const visible = items.filter((i) => {
        if (term && ![i.drug_name, i.lot_number].some((v) => (v || "").toLowerCase().includes(term))) return false;
        if (!onlyOpen) return true;
        if (!editable) return i.difference !== null && Math.abs(i.difference) > EPS;
        const { counted, diff } = lineState(i);
        // A blind count must not reveal which lines differ.
        return counted === null || (!blind && Math.abs(diff) > EPS);
    });

    updateProgress();

    if (!items.length) {
        $("scLines").innerHTML = `<div class="sc-empty">No lots on this sheet.${editable ? " Add the stock found below." : ""}</div>`;
        return;
    }

    if (!visible.length) {
        $("scLines").innerHTML = `<div class="sc-empty">No lines match.</div>`;
        return;
    }

    const approved = c.status === "approved";
    const showMoved = !approved && items.some((i) => i.moved_since_start && Math.abs(i.moved_since_start) > EPS);

    $("scLines").innerHTML = `
        <div class="sc-table-wrap ${editable && blind ? "sc-blind" : ""}"><table class="sc-table">
            <thead><tr><th>#</th><th>Item / Lot</th><th>Expiry</th><th class="num sc-sys">System</th><th class="num">Counted</th><th class="num sc-sys">Difference</th><th class="num sc-sys">Value</th><th class="${editable ? "sc-sys" : ""}">Reason</th><th>Notes</th>
                ${showMoved ? `<th class="num" title="Dispensed, received or moved since the count started">Moved Since Start</th>` : ""}${approved ? `<th class="num">Stock Before → After</th>` : ""}</tr></thead>
            <tbody>${visible.map((i) => editable ? editRow(i) : viewRow(i, showMoved, approved)).join("")}</tbody>
        </table></div>`;
}

function editRow(i) {
    const { e, diff, value } = lineState(i);
    const hasDiff = diff !== null && Math.abs(diff) > EPS;
    return `
        <tr data-sc-item="${i.id}" class="${hasDiff ? "diff" : ""}">
            <td>${i.line_no}</td>
            <td><strong>${escapeHtml(i.drug_name)}</strong><span class="sc-sub">Lot ${escapeHtml(i.lot_number)}</span></td>
            <td style="white-space:nowrap;">${i.expires_date ? formatDate(i.expires_date) : "—"}${i.is_expired ? ` <span class="sc-badge expired">Expired</span>` : ""}</td>
            <td class="num sc-sys">${formatQty(i.system_quantity)} <span class="sc-sub">${escapeHtml(i.unit_name || "units")}</span></td>
            <td class="num"><input type="number" min="0" step="any" data-field="counted" value="${escapeHtml(e.counted)}" aria-label="Counted quantity"><span class="form-error" id="err-sc_item_${i.id}_counted_quantity"></span></td>
            <td class="num sc-sys" data-cell="diff">${diffHtml(diff)}</td>
            <td class="num sc-sys" data-cell="value">${value === null || !hasDiff ? "—" : signedMoney(value, true)}</td>
            <td class="sc-sys" data-cell="reason">${reasonSelect(diff, e.reason)}<span class="form-error" id="err-sc_item_${i.id}_reason"></span></td>
            <td><input type="text" maxlength="255" data-field="notes" value="${escapeHtml(e.notes)}" placeholder="Optional"><span class="form-error" id="err-sc_item_${i.id}_notes"></span></td>
        </tr>`;
}

function viewRow(i, showMoved, approved) {
    const hasDiff = i.difference !== null && Math.abs(i.difference) > EPS;
    return `
        <tr class="${hasDiff ? "diff" : ""}">
            <td>${i.line_no}</td>
            <td><strong>${escapeHtml(i.drug_name)}</strong><span class="sc-sub">Lot ${escapeHtml(i.lot_number)}${i.is_added ? ` <span class="sc-badge found">Found</span>` : ""}</span></td>
            <td style="white-space:nowrap;">${i.expires_date ? formatDate(i.expires_date) : "—"}${i.is_expired ? ` <span class="sc-badge expired">Expired</span>` : ""}</td>
            <td class="num">${formatQty(i.system_quantity)}</td>
            <td class="num">${i.counted_quantity === null ? "—" : formatQty(i.counted_quantity)}</td>
            <td class="num">${diffHtml(i.difference)}</td>
            <td class="num">${hasDiff ? signedMoney(i.value, true) : "—"}<span class="sc-sub">@ ${formatMoney(i.unit_cost, 4)}</span></td>
            <td>${escapeHtml(i.reason_label || (hasDiff ? "—" : ""))}</td>
            <td>${escapeHtml(i.notes || "")}${i.counted_by_name ? `<span class="sc-sub">Counted by ${escapeHtml(i.counted_by_name)}</span>` : ""}</td>
            ${showMoved ? `<td class="num">${i.moved_since_start && Math.abs(i.moved_since_start) > EPS ? `${signedQty(i.moved_since_start)}<span class="sc-sub">now ${formatQty(i.current_quantity)}</span>` : "—"}</td>` : ""}
            ${approved ? `<td class="num">${i.quantity_before === null ? "—" : `${formatQty(i.quantity_before)} → <strong>${formatQty(i.quantity_after)}</strong>`}</td>` : ""}
        </tr>`;
}

function setupLineInputs() {
    $("scLines").addEventListener("input", (event) => {
        const tr = event.target.closest("[data-sc-item]");
        const field = event.target.dataset.field;
        if (!tr || !field) return;
        const item = current.items.find((i) => i.id === Number(tr.dataset.scItem));
        entries[item.id][field] = event.target.value;
        dirty = true;

        if (field === "counted") {
            // Update this row in place so the cursor stays in the box.
            const { e, diff, value } = lineState(item);
            const hasDiff = diff !== null && Math.abs(diff) > EPS;
            if (!reasonFits(e.reason, diff)) e.reason = "";
            tr.classList.toggle("diff", hasDiff);
            tr.querySelector('[data-cell="diff"]').innerHTML = diffHtml(diff);
            tr.querySelector('[data-cell="value"]').innerHTML = value === null || !hasDiff ? "—" : signedMoney(value, true);
            tr.querySelector('[data-cell="reason"] select').outerHTML = reasonSelect(diff, e.reason);
            updateProgress();
        }
    });

    $("scLines").addEventListener("change", (event) => {
        const tr = event.target.closest("[data-sc-item]");
        if (!tr || event.target.dataset.field !== "reason") return;
        entries[Number(tr.dataset.scItem)].reason = event.target.value;
        dirty = true;
    });

    // Enter moves to the next counted box, so a sheet can be keyed in quickly.
    $("scLines").addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.target.dataset.field !== "counted") return;
        event.preventDefault();
        const boxes = [...$("scLines").querySelectorAll('[data-field="counted"]')];
        boxes[boxes.indexOf(event.target) + 1]?.focus();
    });
}

/** Whether a chosen reason still fits the difference (a gain or a loss). */
function reasonFits(reason, diff) {
    if (!reason) return true;
    if (diff === null || Math.abs(diff) <= EPS) return false;
    const r = options.reasons.find((x) => x.value === reason);
    return !!r && (diff > 0 ? r.gain : r.loss);
}

function reasonSelect(diff, value) {
    if (diff === null || Math.abs(diff) <= EPS) {
        return `<select data-field="reason" disabled aria-label="Reason"><option value="">${diff === null ? "—" : "Matches"}</option></select>`;
    }
    const fits = options.reasons.filter((r) => (diff > 0 ? r.gain : r.loss));
    return `<select data-field="reason" aria-label="Reason"><option value="">-- Why the difference? --</option>${fits.map((r) =>
        `<option value="${r.value}" ${r.value === value ? "selected" : ""}>${escapeHtml(r.label)}</option>`).join("")}</select>`;
}

function updateProgress() {
    if (!$("scProgress")) return;
    if (!current.can_count) {
        $("scProgress").textContent = `${current.counted_count} of ${current.line_count} lots counted`;
        return;
    }
    const items = sheetItems();
    const counted = items.filter((i) => entries[i.id].counted !== "").length;
    const diffs = items.filter((i) => { const { diff } = lineState(i); return diff !== null && Math.abs(diff) > EPS; }).length;
    $("scProgress").textContent = `${counted} of ${items.length} lots counted${blind ? "" : ` · ${diffs} with a difference`}${added.length ? ` · ${added.length} found` : ""}`;
}

/* ---- found stock ---- */

function renderAdded() {
    if (!added.length) {
        $("scAdded").innerHTML = `<p class="sc-sub" style="margin:0;">Found a lot on the shelf that isn't listed above? Add it here with what's on its label.</p>`;
        updateProgress();
        return;
    }

    $("scAdded").innerHTML = `
        <div class="sc-table-wrap"><table class="sc-table">
            <thead><tr><th style="min-width:220px;">Item</th><th>Lot No.</th><th>Expiry</th><th class="num">Counted</th><th>Reason</th><th>Notes</th><th></th></tr></thead>
            <tbody>${added.map((a, index) => `
                <tr data-sc-add="${a.key}">
                    <td><select data-field="drug_id" aria-label="Item"><option value="">-- Choose the item --</option>${options.drugs.map((d) =>
                        `<option value="${d.id}" ${Number(a.drug_id) === d.id ? "selected" : ""}>${escapeHtml(d.name)}</option>`).join("")}</select>
                        <span class="form-error" id="err-sc_add_${index}_drug_id"></span></td>
                    <td><input type="text" maxlength="100" data-field="lot_number" value="${escapeHtml(a.lot_number)}" style="min-width:110px;"><span class="form-error" id="err-sc_add_${index}_lot_number"></span></td>
                    <td><input type="date" data-field="expires_date" value="${escapeHtml(a.expires_date)}"><span class="form-error" id="err-sc_add_${index}_expires_date"></span></td>
                    <td class="num"><input type="number" min="0" step="any" data-field="counted" value="${escapeHtml(a.counted)}"><span class="form-error" id="err-sc_add_${index}_counted_quantity"></span></td>
                    <td><select data-field="reason" aria-label="Reason">${options.reasons.filter((r) => r.gain).map((r) =>
                        `<option value="${r.value}" ${r.value === a.reason ? "selected" : ""}>${escapeHtml(r.label)}</option>`).join("")}</select><span class="form-error" id="err-sc_add_${index}_reason"></span></td>
                    <td><input type="text" maxlength="255" data-field="notes" value="${escapeHtml(a.notes)}" placeholder="Where it was found"><span class="form-error" id="err-sc_add_${index}_notes"></span></td>
                    <td><button type="button" class="sc-btn small danger" data-sc-remove="${a.key}" aria-label="Remove">&times;</button></td>
                </tr>`).join("")}</tbody>
        </table></div>
        <p class="sc-sub">If the lot is already on file here with no stock, its existing record is used. Value is at the item's catalog cost.</p>`;

    $("scAdded").querySelectorAll("[data-sc-add]").forEach((tr) => {
        const line = added.find((a) => a.key === Number(tr.dataset.scAdd));
        tr.querySelectorAll("[data-field]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => {
            line[input.dataset.field] = input.value;
            dirty = true;
        }));
    });
    $("scAdded").querySelectorAll("[data-sc-remove]").forEach((btn) => btn.addEventListener("click", () => {
        added = added.filter((a) => a.key !== Number(btn.dataset.scRemove));
        dirty = true;
        renderAdded();
    }));
    updateProgress();
}

/* ---- saving ---- */

async function save(submit) {
    $("scSaveAlert").innerHTML = "";
    document.querySelectorAll("#scDetail .form-error").forEach((el) => { el.textContent = ""; });

    if (submit) {
        // Let the counter see differences before submitting a blind count.
        if (blind) { $("scBlind").checked = false; $("scBlind").dispatchEvent(new Event("change")); }
        const uncounted = sheetItems().filter((i) => entries[i.id].counted === "").length;
        if (uncounted) {
            $("scOnlyOpen").checked = true;
            renderLines();
            showAlert("scSaveAlert", `${uncounted} lot${uncounted === 1 ? " is" : "s are"} not counted yet. Enter 0 for a lot that isn't on the shelf.`);
            return;
        }
    }

    const payload = {
        items: sheetItems().map((i) => ({ id: i.id, counted_quantity: entries[i.id].counted, reason: entries[i.id].reason, notes: entries[i.id].notes })),
        added: added.map((a) => ({ drug_id: a.drug_id, lot_number: a.lot_number, expires_date: a.expires_date, counted_quantity: a.counted, reason: a.reason, notes: a.notes })),
        submit
    };

    if (submit) {
        const s = estimate();
        const ok = await openDialog({
            title: `Submit ${current.sc_number} for approval?`,
            body: `<dl class="sc-dialog-summary"><dt>Lots counted</dt><dd>${sheetItems().length}${added.length ? ` + ${added.length} found` : ""}</dd>
                <dt>With a difference</dt><dd>${s.lines}</dd><dt>Value gained</dt><dd>${formatMoney(s.gain)}</dd><dt>Value lost</dt><dd>${formatMoney(s.loss)}</dd></dl>
                <p>The counts can't be changed while waiting for approval. Stock changes only when it's approved.</p>`,
            okLabel: "Submit", okClass: "primary",
            run: () => saveStockCount(current.id, payload)
        });
        if (ok) { dirty = false; await openCount(current.id); }
        else if (lastDialogResult && !lastDialogResult.success) showSaveErrors(lastDialogResult);
        return;
    }

    $("scSaveBtn").disabled = true;
    const result = await saveStockCount(current.id, payload);
    $("scSaveBtn").disabled = false;

    if (!result?.success) {
        showSaveErrors(result);
        return;
    }

    showToast(result.message, "success");
    dirty = false;
    await openCount(current.id);
}

function showSaveErrors(result) {
    const errors = result?.errors && typeof result.errors === "object" ? result.errors : null;
    if (!errors) {
        showAlert("scSaveAlert", result?.message || "Failed to save the counts.");
        return;
    }

    // Make sure every line with a problem is on screen.
    $("scLineSearch").value = "";
    $("scOnlyOpen").checked = false;
    if (blind) { $("scBlind").checked = false; $("scBlind").dispatchEvent(new Event("change")); }
    renderLines();
    Object.entries(errors).forEach(([name, message]) => {
        let m = name.match(/^items\.(\d+)\.(\w+)$/);
        if (m && $(`err-sc_item_${m[1]}_${m[2]}`)) { $(`err-sc_item_${m[1]}_${m[2]}`).textContent = message; return; }
        m = name.match(/^added\.(\d+)\.(\w+)$/);
        if (m && $(`err-sc_add_${m[1]}_${m[2]}`)) $(`err-sc_add_${m[1]}_${m[2]}`).textContent = message;
    });
    const n = Object.keys(errors).length;
    showAlert("scSaveAlert", `Nothing was saved. ${n} problem${n === 1 ? "" : "s"} to fix — see the highlighted lines.`);
    document.querySelector("#scDetail .form-error:not(:empty)")?.closest("tr")?.scrollIntoView({ block: "center" });
}

function estimate() {
    let gain = 0, loss = 0, lines = 0;
    sheetItems().forEach((i) => {
        const { diff, value } = lineState(i);
        if (diff === null || Math.abs(diff) <= EPS) return;
        lines++;
        value > 0 ? gain += value : loss -= value;
    });
    added.forEach((a) => {
        const drug = options.drugs.find((d) => d.id === Number(a.drug_id));
        if (Number(a.counted) > 0) lines++;
        gain += (Number(a.counted) || 0) * (drug?.unit_cost || 0);
    });
    return { gain: round2(gain), loss: round2(loss), lines };
}

/* ---------------------------------------------------------------
 * Approve / reject / cancel
 * ------------------------------------------------------------- */

async function act(name) {
    const c = current;
    const s = c.summary;
    const summary = `<dl class="sc-dialog-summary"><dt>Location</dt><dd>${escapeHtml(c.warehouse_name)}</dd><dt>Lots with a difference</dt><dd>${c.diff_count} of ${c.line_count}</dd>
        <dt>Value gained</dt><dd>${formatMoney(s.gain_value)}</dd><dt>Value lost</dt><dd>${formatMoney(s.loss_value)}</dd><dt>Net</dt><dd>${signedMoney(s.net_value)}</dd></dl>`;
    const textBox = (label, required) => `${summary}<label for="scDlgText">${label}${required ? `<span style="color:#dc2626;">*</span>` : ""}</label><textarea id="scDlgText" maxlength="500"></textarea><span class="form-error" id="err-sc_dlg"></span>`;
    const need = (msg) => () => $("scDlgText").value.trim() ? null : msg;
    const moved = c.items.filter((i) => i.moved_since_start && Math.abs(i.moved_since_start) > EPS).length;

    const config = {
        approve: { title: `Approve ${c.sc_number}?`, okLabel: "Approve & Correct Stock", okClass: "success",
            body: `${textBox("Notes (optional)", false)}<p>Each lot is corrected by its difference${moved ? `. ${moved} lot${moved === 1 ? " has" : "s have"} moved since the count started — those movements are kept` : ", so it ends up at the counted quantity"}.</p>`,
            run: () => stockCountAction("approve", c.id, { notes: $("scDlgText").value.trim() }) },
        reject: { title: `Send ${c.sc_number} back?`, body: textBox("What should be recounted or explained?", true), okLabel: "Send Back", okClass: "danger solid", check: need("Say what has to be recounted."),
            run: () => stockCountAction("reject", c.id, { reason: $("scDlgText").value.trim() }) },
        cancel: { title: `Cancel ${c.sc_number}?`, body: `${textBox("Reason", true)}<p>No stock is changed. The location can then be counted again.</p>`, okLabel: "Cancel Count", okClass: "danger solid", check: need("Say why."),
            run: () => stockCountAction("cancel", c.id, { reason: $("scDlgText").value.trim() }) }
    }[name];

    if (await openDialog(config)) {
        dirty = false;
        await openCount(c.id);
    }
}

/* ---------------------------------------------------------------
 * Difference report
 * ------------------------------------------------------------- */

let report = null;

function setupReport() {
    $("scRepRun").addEventListener("click", runReport);
    $("scReportPrint").addEventListener("click", printReport);
}

async function openReport() {
    if (!$("scRepFrom").value) {
        $("scRepFrom").value = `${todayISO().slice(0, 4)}-01-01`;
        $("scRepTo").value = todayISO();
    }
    $("scRepWarehouse").innerHTML = `<option value="">All locations</option>` + options.warehouses.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
    $("scRepReason").innerHTML = `<option value="">All reasons</option>` + options.reasons.map((r) => `<option value="${r.value}">${escapeHtml(r.label)}</option>`).join("");
    showPanel("report");
    await runReport();
}

async function runReport() {
    $("scReportBody").innerHTML = `<div class="sc-empty">Loading...</div>`;
    const result = await fetchDifferenceReport({
        date_from: $("scRepFrom").value, date_to: $("scRepTo").value, warehouse_id: $("scRepWarehouse").value, reason: $("scRepReason").value
    });

    if (!result?.success) {
        $("scReportBody").innerHTML = `<div class="sc-empty">${escapeHtml(result?.message || "Couldn't load the report.")}</div>`;
        return;
    }

    report = result.data;
    const t = report.totals;

    if (!t.lines) {
        $("scReportBody").innerHTML = `<div class="sc-empty">No approved stock corrections in this period.</div>`;
        return;
    }

    const groupTable = (title, rows, label) => `
        <div class="sc-card"><div class="sc-card-title">${title}</div>
            <div class="sc-table-wrap"><table class="sc-table">
                <thead><tr><th>${label}</th><th class="num">Lots</th><th class="num">Gained</th><th class="num">Lost</th><th class="num">Net</th></tr></thead>
                <tbody>${rows.map((g) => `<tr><td>${escapeHtml(g.label || g.warehouse_name)}</td><td class="num">${g.lines}</td><td class="num">${formatMoney(g.gain)}</td><td class="num">${formatMoney(g.loss)}</td><td class="num">${signedMoney(g.net, true)}</td></tr>`).join("")}</tbody>
            </table></div></div>`;

    $("scReportBody").innerHTML = `
        <div class="sc-stats">
            <div class="sc-stat"><strong>${t.lines}</strong><span>Lot corrections</span></div>
            <div class="sc-stat gain"><strong>${formatMoney(t.gain)}</strong><span>Value gained</span></div>
            <div class="sc-stat loss"><strong>${formatMoney(t.loss)}</strong><span>Value lost</span></div>
            <div class="sc-stat ${t.net < 0 ? "loss" : t.net > 0 ? "gain" : ""}"><strong>${signedMoney(t.net)}</strong><span>Net difference</span></div>
        </div>
        <div class="sc-two">${groupTable("By Reason", report.by_reason, "Reason")}${groupTable("By Location", report.by_warehouse, "Location")}</div>
        <div class="sc-card"><div class="sc-card-title">Corrections</div>
            <div class="sc-table-wrap"><table class="sc-table">
                <thead><tr><th>Date</th><th>Count</th><th>Location</th><th>Item / Lot</th><th class="num">System</th><th class="num">Counted</th><th class="num">Change</th><th class="num">Unit Cost</th><th class="num">Value</th><th>Reason</th></tr></thead>
                <tbody>${report.rows.map((r) => `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(r.adjusted_date)}</td>
                        <td style="white-space:nowrap;">${r.stock_count_id ? `<a href="#" data-sc-goto="${r.stock_count_id}">${escapeHtml(r.sc_number)}</a>` : "—"}<span class="sc-sub">${escapeHtml(r.approved_by_name || "")}</span></td>
                        <td>${escapeHtml(r.warehouse_name)}</td>
                        <td><strong>${escapeHtml(r.drug_name)}</strong><span class="sc-sub">Lot ${escapeHtml(r.lot_number)}</span></td>
                        <td class="num">${r.system_quantity === null ? "—" : formatQty(r.system_quantity)}</td>
                        <td class="num">${r.counted_quantity === null ? "—" : formatQty(r.counted_quantity)}</td>
                        <td class="num">${signedQty(r.quantity_change)}</td>
                        <td class="num">${formatMoney(r.unit_cost, 4)}</td>
                        <td class="num">${signedMoney(r.value_change, true)}</td>
                        <td>${escapeHtml(r.reason_label)}${r.notes ? `<span class="sc-sub">${escapeHtml(r.notes)}</span>` : ""}</td>
                    </tr>`).join("")}</tbody>
                <tfoot><tr><td colspan="8">Total</td><td class="num">${signedMoney(t.net, true)}</td><td></td></tr></tfoot>
            </table></div></div>`;

    $("scReportBody").querySelectorAll("[data-sc-goto]").forEach((a) => a.addEventListener("click", (event) => {
        event.preventDefault();
        openCount(Number(a.dataset.scGoto));
    }));
}

/* ---------------------------------------------------------------
 * Printing
 * ------------------------------------------------------------- */

const PRINT_STYLE = `
    @page { size: A4 portrait; margin: 12mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11.5px; margin: 0; padding: 20px; }
    h1 { margin: 0; font-size: 19px; letter-spacing: 1px; } .muted { color: #4b5563; }
    .head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 12px; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; margin-bottom: 12px; }
    .meta div { padding: 7px 9px; border-right: 1px solid #d1d5db; } .meta div:last-child { border-right: none; }
    .meta span { display: block; font-size: 9.5px; text-transform: uppercase; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; } th { background: #f3f4f6; text-align: left; font-size: 9.5px; text-transform: uppercase; padding: 5px 6px; border: 1px solid #d1d5db; }
    td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; } .num { text-align: right; white-space: nowrap; }
    tr { page-break-inside: avoid; } .blank td { height: 26px; }
    .count-box { min-width: 90px; } h3 { font-size: 12px; margin: 14px 0 6px; text-transform: uppercase; }
    .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 48px; }
    .signs div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 10.5px; color: #4b5563; }
    .totals { display: flex; gap: 24px; justify-content: flex-end; font-size: 12px; margin-bottom: 12px; }`;

function openPrint(title, body) {
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLE}</style></head><body>${body}
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script></body></html>`);
    win.document.close();
}

function printHead(c, title) {
    return `<div class="head"><div><h1>${title}</h1><div class="muted">${escapeHtml(c.business?.name || "")}</div></div>
        <div style="text-align:right;"><strong>${escapeHtml(c.sc_number)}</strong><div class="muted">${c.count_type === "full" ? "Full count" : "Selected items"} · ${STATUS_LABELS[c.status]}</div></div></div>
        <div class="meta">
            <div><span>Location</span>${escapeHtml(c.warehouse_name)}</div>
            <div><span>Custodian</span>${escapeHtml(c.custodian_name || "—")}</div>
            <div><span>Count Started</span>${escapeHtml(formatDateTime(c.started_at))}</div>
            <div><span>Started By</span>${escapeHtml(c.created_by_name || "")}</div>
        </div>`;
}

/** Blind sheet: no system quantities, blank boxes to write the count in. */
function printSheet(c) {
    const items = c.items.filter((i) => !i.is_added);
    openPrint(`${c.sc_number} - Count Sheet`, `${printHead(c, "STOCK COUNT SHEET")}
        <p class="muted" style="margin:0 0 10px;">Count every lot on the shelf and write the quantity in dispensing units. Write 0 if a lot is not found. List any stock not on this sheet at the bottom.</p>
        <table><thead><tr><th>#</th><th>Item</th><th>Lot No.</th><th>Expiry</th><th>Unit</th><th class="num count-box">Counted</th><th>Remarks</th></tr></thead>
        <tbody>${items.map((i) => `<tr><td>${i.line_no}</td><td>${escapeHtml(i.drug_name)}</td><td>${escapeHtml(i.lot_number)}</td>
            <td>${i.expires_date ? formatDate(i.expires_date) : ""}</td><td>${escapeHtml(i.unit_name || "")}</td><td></td><td></td></tr>`).join("")}</tbody></table>
        <h3>Stock found that isn't listed above</h3>
        <table><thead><tr><th>Item</th><th>Lot No.</th><th>Expiry</th><th>Unit</th><th class="num count-box">Counted</th><th>Remarks</th></tr></thead>
        <tbody>${Array.from({ length: 6 }, () => `<tr class="blank"><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}</tbody></table>
        <div class="signs"><div>Counted by / Date</div><div>Checked by / Date</div><div>Custodian</div></div>`);
}

function printResults(c) {
    const s = c.summary;
    openPrint(`${c.sc_number} - Count Results`, `${printHead(c, "STOCK COUNT RESULTS")}
        <table><thead><tr><th>#</th><th>Item / Lot</th><th>Expiry</th><th class="num">System</th><th class="num">Counted</th><th class="num">Difference</th><th class="num">Unit Cost</th><th class="num">Value</th><th>Reason / Notes</th></tr></thead>
        <tbody>${c.items.map((i) => `<tr><td>${i.line_no}</td><td>${escapeHtml(i.drug_name)}<br><span class="muted">Lot ${escapeHtml(i.lot_number)}${i.is_added ? " (found)" : ""}</span></td>
            <td>${i.expires_date ? formatDate(i.expires_date) : ""}</td><td class="num">${formatQty(i.system_quantity)}</td><td class="num">${i.counted_quantity === null ? "" : formatQty(i.counted_quantity)}</td>
            <td class="num">${i.difference && Math.abs(i.difference) > EPS ? signedQty(i.difference, false) : "0"}</td><td class="num">${formatMoney(i.unit_cost, 4)}</td>
            <td class="num">${i.difference && Math.abs(i.difference) > EPS ? signedMoney(i.value, false) : ""}</td><td>${escapeHtml(i.reason_label || "")}${i.notes ? ` — ${escapeHtml(i.notes)}` : ""}</td></tr>`).join("")}</tbody></table>
        <div class="totals"><span>Gained: <strong>${formatMoney(s.gain_value)}</strong></span><span>Lost: <strong>${formatMoney(s.loss_value)}</strong></span><span>Net: <strong>${signedMoney(s.net_value, false)}</strong></span></div>
        <div class="signs"><div>${escapeHtml(c.submitted_by_name || "")}<br>Counted / submitted by</div><div>${escapeHtml(c.custodian_name || "")}<br>Custodian</div><div>${escapeHtml(c.approved_by_name || "")}<br>Approved by</div></div>`);
}

function printReport() {
    if (!report?.totals.lines) {
        showToast("Nothing to print for this period.", "info");
        return;
    }
    const t = report.totals;
    const where = $("scRepWarehouse").selectedOptions[0]?.textContent || "All locations";
    const reason = $("scRepReason").selectedOptions[0]?.textContent || "All reasons";
    openPrint("Stock Difference Report", `<div class="head"><div><h1>STOCK DIFFERENCE REPORT</h1><div class="muted">${escapeHtml(where)} · ${escapeHtml(reason)}</div></div>
        <div style="text-align:right;"><strong>${formatDate($("scRepFrom").value)} – ${formatDate($("scRepTo").value)}</strong></div></div>
        <div class="totals"><span>Gained: <strong>${formatMoney(t.gain)}</strong></span><span>Lost: <strong>${formatMoney(t.loss)}</strong></span><span>Net: <strong>${signedMoney(t.net, false)}</strong></span></div>
        <h3>By reason</h3><table><thead><tr><th>Reason</th><th class="num">Lots</th><th class="num">Gained</th><th class="num">Lost</th><th class="num">Net</th></tr></thead>
        <tbody>${report.by_reason.map((g) => `<tr><td>${escapeHtml(g.label)}</td><td class="num">${g.lines}</td><td class="num">${formatMoney(g.gain)}</td><td class="num">${formatMoney(g.loss)}</td><td class="num">${signedMoney(g.net, false)}</td></tr>`).join("")}</tbody></table>
        <h3>Corrections</h3><table><thead><tr><th>Date</th><th>Count</th><th>Location</th><th>Item / Lot</th><th class="num">Change</th><th class="num">Value</th><th>Reason</th></tr></thead>
        <tbody>${report.rows.map((r) => `<tr><td>${formatDate(r.adjusted_date)}</td><td>${escapeHtml(r.sc_number || "")}</td><td>${escapeHtml(r.warehouse_name)}</td>
            <td>${escapeHtml(r.drug_name)} — Lot ${escapeHtml(r.lot_number)}</td><td class="num">${signedQty(r.quantity_change, false)}</td><td class="num">${signedMoney(r.value_change, false)}</td>
            <td>${escapeHtml(r.reason_label)}${r.notes ? ` — ${escapeHtml(r.notes)}` : ""}</td></tr>`).join("")}</tbody></table>`);
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

let lastDialogResult = null;

function openDialog({ title, body, okLabel, okClass = "primary", check = null, run }) {
    lastDialogResult = null;
    return new Promise((resolve) => {
        const overlay = $("scDialogOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("scDialogOk").onclick = null;
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("scDialogTitle").textContent = title;
        $("scDialogBody").innerHTML = body;
        $("scDialogAlert").innerHTML = "";
        $("scDialogOk").textContent = okLabel;
        $("scDialogOk").className = `sc-btn ${okClass}`;

        $("scDialogOk").onclick = async () => {
            const problem = check?.();
            if (problem) {
                $("err-sc_dlg").textContent = problem;
                return;
            }

            $("scDialogOk").disabled = true;
            const result = await run();
            $("scDialogOk").disabled = false;
            lastDialogResult = result;

            if (!result?.success) {
                // Line-level problems are shown on the sheet itself.
                if (result?.errors && Object.keys(result.errors).some((k) => /^(items|added)\./.test(k))) {
                    finish(false);
                    return;
                }
                const first = result?.errors && Object.values(result.errors)[0];
                if (first && $("err-sc_dlg")) $("err-sc_dlg").textContent = first;
                $("scDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message === "Validation failed." && first ? first : (result?.message || "Something went wrong."))}</div>`;
                return;
            }

            if (result.message) showToast(result.message, "success");
            finish(true);
        };

        $("scDialogClose").onclick = () => finish(false);
        $("scDialogCancel").onclick = () => finish(false);
        overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
        document.addEventListener("keydown", onKey);
        overlay.classList.add("open");
        ($("scDialogBody").querySelector("textarea") || $("scDialogOk")).focus();
    });
}

function diffHtml(diff) {
    if (diff === null || diff === undefined) return "—";
    if (Math.abs(diff) <= EPS) return `<span class="sc-sub" style="margin:0;">Matches</span>`;
    return signedQty(diff);
}

function signedQty(value, colored = true) {
    const text = `${value > 0 ? "+" : "−"}${formatQty(Math.abs(value))}`;
    return colored ? `<span class="${value > 0 ? "sc-plus" : "sc-minus"}">${text}</span>` : text;
}

function signedMoney(value, colored = false) {
    const v = Number(value) || 0;
    const text = Math.abs(v) < 0.005 ? formatMoney(0) : `${v > 0 ? "+" : "−"}${formatMoney(Math.abs(v))}`;
    return colored && Math.abs(v) >= 0.005 ? `<span class="${v > 0 ? "sc-plus" : "sc-minus"}">${text}</span>` : text;
}

function round2(v) { return Math.round(v * 100) / 100; }
function round3(v) { return Math.round(v * 1000) / 1000; }

function showAlert(id, message) {
    $(id).innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    $(id).scrollIntoView({ block: "nearest" });
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
