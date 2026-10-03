import {
    fetchStockTransfers, fetchStockTransfer, fetchStockTransferOptions,
    createStockTransfer, updateStockTransfer, deleteStockTransfer, stockTransferAction
} from "./stock-transfers.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";
import { custodianHint } from "../../core/custodian.js";

const STATUS_LABELS = { draft: "Draft", requested: "Requested", in_transit: "In transit", received: "Received", cancelled: "Cancelled" };
const HISTORY_LABELS = {
    created: "Created", requested: "Requested", sent: "Sent — stock left the source location",
    received: "Received", cancelled: "Cancelled"
};
const TABS = [
    { id: "all", label: "All", filter: () => true },
    { id: "requested", label: "To Send", filter: (t) => t.status === "requested" },
    { id: "in_transit", label: "In Transit", filter: (t) => t.status === "in_transit" },
    { id: "draft", label: "Drafts", filter: (t) => t.status === "draft" },
    { id: "received", label: "Received", filter: (t) => t.status === "received" },
    { id: "cancelled", label: "Cancelled", filter: (t) => t.status === "cancelled" }
];
const EPS = 0.0005;

let transfers = [];
let options = null;
let activeTab = "all";

// Editor
let editing = null;     // the transfer being edited (null = new)
let lines = [];         // { key, drug_id, lot_id, quantity, notes }
let lineKey = 0;

// Detail
let current = null;
let receiving = false;

const $ = (id) => document.getElementById(id);

export async function initStockTransfers() {
    $("stNewBtn").addEventListener("click", () => openEditor(null));
    $("stSearch").addEventListener("input", renderList);
    $("stLocationFilter").addEventListener("change", renderList);
    document.querySelectorAll("[data-st-back]").forEach((btn) => btn.addEventListener("click", backToList));
    setupEditor();

    await loadOptions();
    await loadList();
}

async function loadOptions() {
    const result = await fetchStockTransferOptions();
    options = result?.success ? result.data : { warehouses: [], drugs: [], lots: [], short_reasons: [], can_create: false };
    $("stNewBtn").hidden = !options.can_create;

    const chosen = $("stLocationFilter").value;
    $("stLocationFilter").innerHTML = `<option value="">All locations</option>` +
        options.warehouses.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
    $("stLocationFilter").value = chosen;
}

/* ---------------------------------------------------------------
 * List
 * ------------------------------------------------------------- */

async function loadList() {
    $("stList").innerHTML = `<div class="st-empty">Loading...</div>`;
    const result = await fetchStockTransfers();

    if (!result?.success) {
        $("stList").innerHTML = `<div class="st-empty"><strong>Couldn't load the transfers.</strong><span class="st-sub">${escapeHtml(result?.message || "The server didn't respond.")}</span>
            <button type="button" class="st-btn small" id="stRetry" style="margin-top:10px;">Try Again</button></div>`;
        $("stRetry").addEventListener("click", loadList);
        return;
    }

    transfers = result.data || [];
    const today = todayISO();
    $("stStatRequested").textContent = transfers.filter((t) => t.status === "requested").length;
    $("stStatTransit").textContent = transfers.filter((t) => t.status === "in_transit").length;
    $("stStatReceived").textContent = transfers.filter((t) => t.status === "received" && String(t.received_date || "").startsWith(today.slice(0, 7))).length;
    $("stStatShort").textContent = formatMoney(transfers.filter((t) => t.status === "received" && String(t.received_date || "").startsWith(today.slice(0, 4)))
        .reduce((sum, t) => sum + t.short_value, 0));

    renderTabs();
    renderList();
}

function renderTabs() {
    $("stTabs").innerHTML = TABS.map((t) => {
        const count = transfers.filter(t.filter).length;
        return `<button type="button" data-st-tab="${t.id}" class="${t.id === activeTab ? "active" : ""}">${t.label}${t.id !== "all" && count ? `<span class="count">${count}</span>` : ""}</button>`;
    }).join("");
    $("stTabs").querySelectorAll("[data-st-tab]").forEach((btn) => btn.addEventListener("click", () => {
        activeTab = btn.dataset.stTab;
        renderTabs();
        renderList();
    }));
}

function renderList() {
    const term = $("stSearch").value.trim().toLowerCase();
    const location = Number($("stLocationFilter").value) || null;
    const tab = TABS.find((t) => t.id === activeTab) || TABS[0];
    const list = transfers.filter(tab.filter)
        .filter((t) => !location || t.from_warehouse_id === location || t.to_warehouse_id === location)
        .filter((t) => !term || [t.st_number, t.from_name, t.to_name, t.item_names, t.created_by_name, t.notes].some((v) => (v || "").toLowerCase().includes(term)));

    $("stCount").textContent = `${list.length} transfer${list.length === 1 ? "" : "s"}`;

    if (!list.length) {
        $("stList").innerHTML = `<div class="st-empty">${transfers.length ? "No transfers here." : `No stock transfers yet.${options.can_create ? " Use “+ New Transfer” to move stock between storage locations." : ""}`}</div>`;
        return;
    }

    $("stList").innerHTML = `
        <div class="st-table-wrap">
            <table class="st-table">
                <thead><tr><th>ST No.</th><th>From → To</th><th>Items</th><th>Needed By</th><th>Sent</th><th>Received</th><th class="num">Value</th><th>Status</th></tr></thead>
                <tbody>${list.map((t) => `
                    <tr class="st-row" data-st-open="${t.id}">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(t.st_number)}</strong>${t.priority === "urgent" ? ` <span class="st-badge urgent">Urgent</span>` : ""}
                            <span class="st-sub">by ${escapeHtml(t.created_by_name || "—")}</span></td>
                        <td>${escapeHtml(t.from_name)}<span class="st-arrow">→</span>${escapeHtml(t.to_name)}</td>
                        <td>${t.item_count} item${t.item_count === 1 ? "" : "s"}<span class="st-sub">${escapeHtml(truncate(t.item_names || "", 70))}</span></td>
                        <td style="white-space:nowrap;">${t.needed_by ? formatDate(t.needed_by) : "—"}${t.is_overdue ? `<span class="st-sub warn">Overdue</span>` : ""}</td>
                        <td style="white-space:nowrap;">${t.sent_date ? formatDate(t.sent_date) : "—"}</td>
                        <td style="white-space:nowrap;">${t.received_date ? formatDate(t.received_date) : "—"}</td>
                        <td class="num">${t.sent_value ? formatMoney(t.sent_value) : "—"}${t.short_value > 0 ? `<span class="st-sub st-minus">${formatMoney(t.short_value)} short</span>` : ""}</td>
                        <td><span class="st-badge ${t.status}">${STATUS_LABELS[t.status]}</span></td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    $("stList").querySelectorAll("[data-st-open]").forEach((row) => row.addEventListener("click", () => openTransfer(Number(row.dataset.stOpen))));
}

function showPanel(name) {
    ["List", "Edit", "Detail"].forEach((p) => { $(`st${p}Panel`).hidden = p.toLowerCase() !== name; });
    document.querySelector(".st-page").scrollIntoView({ block: "start" });
}

async function backToList() {
    receiving = false;
    showPanel("list");
    await loadList();
}

/* ---------------------------------------------------------------
 * Editor
 * ------------------------------------------------------------- */

function setupEditor() {
    $("st_from").addEventListener("change", () => { showLocationHints(); renderLines(); });
    $("st_to").addEventListener("change", showLocationHints);
    $("stAddLine").addEventListener("click", () => {
        lines.push({ key: ++lineKey, drug_id: "", lot_id: "", quantity: "", notes: "" });
        renderLines();
    });
    $("stSaveDraft").addEventListener("click", () => save("draft"));
    $("stSaveRequest").addEventListener("click", () => save("request"));
    $("stSaveSend").addEventListener("click", () => save("send"));
    $("stDeleteDraft").addEventListener("click", () => removeDraft(editing));
}

async function openEditor(transfer) {
    await loadOptions();
    editing = transfer;
    clearEditorErrors();

    const locationOptions = (selected) => `<option value="">-- Choose a location --</option>` +
        options.warehouses.map((w) => `<option value="${w.id}" ${Number(selected) === w.id ? "selected" : ""}>${escapeHtml(w.name)}</option>`).join("");
    $("st_from").innerHTML = locationOptions(transfer?.from_warehouse_id);
    $("st_to").innerHTML = locationOptions(transfer?.to_warehouse_id);
    $("st_priority").value = transfer?.priority || "normal";
    $("st_needed_by").value = transfer?.needed_by || "";
    $("st_notes").value = transfer?.notes || "";

    lines = transfer
        ? transfer.items.map((i) => ({ key: ++lineKey, drug_id: String(i.drug_id), lot_id: i.lot_id ? String(i.lot_id) : "", quantity: String(i.quantity), notes: i.notes || "" }))
        : [{ key: ++lineKey, drug_id: "", lot_id: "", quantity: "", notes: "" }];

    $("stEditTitle").textContent = transfer ? `Edit ${transfer.st_number}` : "New Transfer";
    $("stSaveRequest").hidden = transfer?.status === "requested";
    $("stDeleteDraft").hidden = !transfer?.can_delete;

    showLocationHints();
    renderLines();
    showPanel("edit");
}

function warehouse(id) {
    return options.warehouses.find((w) => w.id === Number(id)) || null;
}

function showLocationHints() {
    [["st_from", "stFromHint", "Sending stock from"], ["st_to", "stToHint", "Receiving into"]].forEach(([select, hint, action]) => {
        const result = custodianHint(warehouse($(select).value), action);
        $(hint).textContent = result.text;
        $(hint).classList.toggle("warn", result.warn);
    });
}

/** Lots of an item at a location that have stock, earliest expiry first. */
function lotsAt(drugId, warehouseId) {
    return options.lots.filter((l) => l.drug_id === Number(drugId) && l.warehouse_id === Number(warehouseId));
}

function usableAt(drugId, warehouseId) {
    return lotsAt(drugId, warehouseId).filter((l) => !l.is_expired).reduce((sum, l) => sum + l.on_hand, 0);
}

function renderLines() {
    const fromId = Number($("st_from").value) || null;
    const stocked = new Set(fromId ? options.lots.filter((l) => l.warehouse_id === fromId).map((l) => l.drug_id) : []);

    if (!lines.length) {
        $("stLines").innerHTML = `<div class="st-empty">No items yet. Use “+ Add Item”.</div>`;
        return;
    }

    const drugOptions = (selected) => {
        const here = options.drugs.filter((d) => stocked.has(d.id));
        const others = options.drugs.filter((d) => !stocked.has(d.id));
        const option = (d) => `<option value="${d.id}" ${String(d.id) === selected ? "selected" : ""}>${escapeHtml(d.name)}${fromId && stocked.has(d.id) ? ` — ${formatQty(usableAt(d.id, fromId))} ${escapeHtml(d.unit_name || "units")}` : ""}</option>`;
        return `<option value="">-- Choose an item --</option>`
            + (here.length ? `<optgroup label="In stock at the sending location">${here.map(option).join("")}</optgroup>` : "")
            + (others.length ? `<optgroup label="${fromId ? "Not in stock there" : "Items"}">${others.map(option).join("")}</optgroup>` : "");
    };

    $("stLines").innerHTML = `
        <div class="st-table-wrap">
            <table class="st-table lines">
                <thead><tr><th style="min-width:220px;">Item</th><th style="min-width:200px;">Lot</th><th>Quantity</th><th>Notes</th><th></th></tr></thead>
                <tbody>${lines.map((line, index) => {
                    const drug = options.drugs.find((d) => String(d.id) === line.drug_id);
                    const lots = line.drug_id && fromId ? lotsAt(line.drug_id, fromId) : [];
                    return `
                    <tr data-st-line="${line.key}">
                        <td><select data-field="drug_id" aria-label="Item">${drugOptions(line.drug_id)}</select><span class="form-error" data-err="drug_id"></span></td>
                        <td><select data-field="lot_id" aria-label="Lot" ${line.drug_id && fromId ? "" : "disabled"}>
                                <option value="">Earliest expiry first (automatic)</option>
                                ${lots.map((l) => `<option value="${l.id}" ${String(l.id) === line.lot_id ? "selected" : ""}>${escapeHtml(l.lot_number)} · ${formatQty(l.on_hand)}${l.expires_date ? ` · exp ${formatDate(l.expires_date)}` : ""}${l.is_expired ? " (EXPIRED)" : ""}</option>`).join("")}
                            </select><span class="form-error" data-err="lot_id"></span></td>
                        <td><input type="number" min="0" step="any" data-field="quantity" value="${escapeHtml(line.quantity)}" aria-label="Quantity">
                            <span class="st-sub" data-cell="available">${availableText(line, drug, fromId)}</span><span class="form-error" data-err="quantity"></span></td>
                        <td><input type="text" data-field="notes" maxlength="255" value="${escapeHtml(line.notes)}" aria-label="Line notes" placeholder="Optional"></td>
                        <td><button type="button" class="st-btn link" data-remove="${index}" aria-label="Remove line">Remove</button></td>
                    </tr>`;
                }).join("")}</tbody>
            </table>
        </div>`;

    const body = $("stLines");
    body.oninput = onLineInput;
    body.onchange = onLineInput;
    body.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", () => {
        lines.splice(Number(btn.dataset.remove), 1);
        renderLines();
    }));
}

function availableText(line, drug, fromId) {
    if (!line.drug_id || !fromId) return "";
    const unit = escapeHtml(drug?.unit_name || "units");
    const qty = Number(line.quantity) || 0;
    const lot = line.lot_id ? options.lots.find((l) => String(l.id) === line.lot_id) : null;
    const available = lot ? lot.on_hand : usableAt(line.drug_id, fromId);
    const label = lot ? "in this lot" : "usable at the sending location";
    return `${formatQty(available)} ${unit} ${label}${qty > available + EPS ? ` <strong class="st-minus">— not enough to send</strong>` : ""}`;
}

function onLineInput(event) {
    const tr = event.target.closest("[data-st-line]");
    const field = event.target.dataset.field;
    if (!tr || !field) return;

    const line = lines.find((l) => l.key === Number(tr.dataset.stLine));
    line[field] = event.target.value;
    tr.querySelectorAll(".form-error").forEach((el) => { el.textContent = ""; });

    if (field === "drug_id" && event.type === "change") {
        line.lot_id = "";
        renderLines();
        return;
    }

    if (field === "lot_id" || field === "quantity") {
        const drug = options.drugs.find((d) => String(d.id) === line.drug_id);
        tr.querySelector('[data-cell="available"]').innerHTML = availableText(line, drug, Number($("st_from").value) || null);
    }
}

function clearEditorErrors() {
    $("stEditAlert").innerHTML = "";
    document.querySelectorAll("#stEditPanel .form-error").forEach((el) => { el.textContent = ""; });
}

function payload(action) {
    return {
        from_warehouse_id: $("st_from").value,
        to_warehouse_id: $("st_to").value,
        priority: $("st_priority").value,
        needed_by: $("st_needed_by").value,
        notes: $("st_notes").value.trim(),
        items: lines.map((l) => ({ drug_id: l.drug_id, lot_id: l.lot_id || null, quantity: l.quantity, notes: l.notes.trim() })),
        action
    };
}

async function save(action) {
    // Rows added but left empty are just dropped.
    const before = lines.length;
    lines = lines.filter((l) => l.drug_id || String(l.quantity).trim() || l.notes.trim());
    if (lines.length !== before) renderLines();
    clearEditorErrors();
    const body = payload(action);

    if (action === "send") {
        const from = warehouse(body.from_warehouse_id);
        const to = warehouse(body.to_warehouse_id);
        if (!from || !to) {
            if (!from) $("err-st_from_warehouse_id").textContent = "Choose the location the stock comes from.";
            if (!to) $("err-st_to_warehouse_id").textContent = "Choose the location the stock goes to.";
            return;
        }

        let result = null;
        const confirmed = await openDialog({
            title: "Send this transfer now?",
            body: sendDialogBody(from, to, lines.length),
            okLabel: "Send", okClass: "primary",
            check: () => sendDialogCheck(),
            run: async () => {
                result = await submit({ ...body, sent_date: $("st_dlg_date").value, sent_via: $("st_dlg_via").value.trim() });
                // Close either way: the editor shows the outcome (toast, or errors on the lines).
                return { success: true, keepEditor: true };
            }
        });
        if (!confirmed || !result) return;
        return afterSave(result);
    }

    const buttons = ["stSaveDraft", "stSaveRequest", "stSaveSend"];
    buttons.forEach((id) => { $(id).disabled = true; });
    const result = await submit(body);
    buttons.forEach((id) => { $(id).disabled = false; });
    afterSave(result);
}

async function submit(body) {
    return editing ? updateStockTransfer(editing.id, body) : createStockTransfer(body);
}

async function afterSave(result) {
    if (!result?.success) {
        showEditorErrors(result);
        return;
    }

    showToast(result.message, "success");
    await openTransfer(result.data?.id || editing.id);
}

function showEditorErrors(result) {
    const errors = result?.errors || {};
    let unplaced = [];

    Object.entries(errors).forEach(([name, message]) => {
        const match = name.match(/^items\.(\d+)\.(\w+)$/);
        if (match) {
            const line = lines[Number(match[1])];
            const cell = line && document.querySelector(`[data-st-line="${line.key}"] [data-err="${match[2]}"]`);
            if (cell) { cell.textContent = message; return; }
        } else if ($(`err-st_${name}`)) {
            $(`err-st_${name}`).textContent = message;
            return;
        }
        unplaced.push(message);
    });

    const message = result?.message && result.message !== "Validation failed." ? result.message : "Please fix the highlighted fields.";
    $("stEditAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}${unplaced.length ? `<br>${unplaced.map(escapeHtml).join("<br>")}` : ""}</div>`;
    $("stEditAlert").scrollIntoView({ block: "nearest" });
}

function sendDialogBody(from, to, lineCount) {
    const hint = custodianHint(from, "Sending stock from");
    return `<p>${lineCount} item${lineCount === 1 ? "" : "s"} leave <strong>${escapeHtml(from.name)}</strong> now and stay in transit until <strong>${escapeHtml(to.name)}</strong> confirms what arrived.</p>
        ${hint.text ? `<p class="st-hint ${hint.warn ? "warn" : ""}">${escapeHtml(hint.text)}</p>` : ""}
        <div class="st-field"><label for="st_dlg_date">Date Sent</label><input type="date" id="st_dlg_date" value="${todayISO()}" max="${todayISO()}"><span class="form-error" id="err-st_dlg"></span></div>
        <div class="st-field"><label for="st_dlg_via">Sent Via / Carried By</label><input type="text" id="st_dlg_via" maxlength="150" placeholder="e.g. Juan (runner), cart"></div>`;
}

function sendDialogCheck() {
    const date = $("st_dlg_date").value;
    if (!date) return "Enter the date it was sent.";
    if (date > todayISO()) return "The date sent can't be in the future.";
    return null;
}

/* ---------------------------------------------------------------
 * A transfer
 * ------------------------------------------------------------- */

async function openTransfer(id) {
    const result = await fetchStockTransfer(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the transfer.", "error");
        return;
    }

    current = result.data;
    receiving = false;
    renderTransfer();
    showPanel("detail");
}

function banner(t) {
    const text = {
        draft: ["Draft", "Not sent or requested yet. Edit it, then send it or request it from the sending location."],
        requested: [`Requested by ${t.requested_by_name || "—"}`, `Waiting for ${t.from_name} to send it.`],
        in_transit: [`In transit since ${formatDate(t.sent_date)}`, `${t.from_name} sent it${t.sent_via ? ` via ${t.sent_via}` : ""}. ${t.to_name} confirms what arrived.`],
        received: [`Received ${formatDate(t.received_date)}`, t.short_value > 0 ? `Some items arrived short (${formatMoney(t.short_value)}).` : "Everything arrived."],
        cancelled: ["Cancelled", t.cancel_reason || ""]
    }[t.status];

    const buttons = [
        t.can_edit ? `<button type="button" class="st-btn" id="stEditBtn">Edit</button>` : "",
        t.can_send ? `<button type="button" class="st-btn primary" id="stSendBtn">Send</button>` : "",
        t.can_receive && !receiving ? `<button type="button" class="st-btn success" id="stReceiveBtn">Receive</button>` : ""
    ].join("");

    return `<div class="st-banner ${t.status}"><div><strong>${escapeHtml(text[0])}</strong><span>${escapeHtml(text[1])}</span></div>${buttons ? `<div class="st-actions">${buttons}</div>` : ""}</div>`;
}

function renderTransfer() {
    const t = current;

    $("stDetail").innerHTML = `
        ${banner(t)}
        <div class="st-card">
            <div class="st-card-title">
                <span style="font-size:16px;text-transform:none;color:var(--text-primary);">${escapeHtml(t.st_number)}
                    <span class="st-badge ${t.status}">${STATUS_LABELS[t.status]}</span>${t.priority === "urgent" ? ` <span class="st-badge urgent">Urgent</span>` : ""}</span>
                <span class="st-actions">
                    <button type="button" class="st-btn" id="stPrintBtn">Print Transfer Slip</button>
                    ${t.can_cancel ? `<button type="button" class="st-btn danger" id="stCancelBtn">Cancel Transfer</button>` : ""}
                    ${t.can_delete ? `<button type="button" class="st-btn danger" id="stDeleteBtn">Delete Draft</button>` : ""}
                </span>
            </div>
            <dl class="st-info">${[
                ["From", locationHtml(t.from_location)],
                ["To", locationHtml(t.to_location)],
                ["Needed By", t.needed_by ? formatDate(t.needed_by) + (t.is_overdue ? `<span class="st-sub warn">Overdue</span>` : "") : "—"],
                ["Created", `${escapeHtml(formatDateTime(t.created_at))}<span class="st-sub">by ${escapeHtml(t.created_by_name || "—")}</span>`],
                ["Sent", t.sent_at ? `${formatDate(t.sent_date)}<span class="st-sub">by ${escapeHtml(t.sent_by_name || "—")}${t.sent_via ? ` · via ${escapeHtml(t.sent_via)}` : ""}</span>` : "—"],
                ["Received", t.received_at ? `${formatDate(t.received_date)}<span class="st-sub">by ${escapeHtml(t.received_by_name || "—")}</span>` : "—"],
                ["Value Sent", t.sent_value ? formatMoney(t.sent_value) + (t.short_value > 0 ? `<span class="st-sub st-minus">${formatMoney(t.short_value)} short</span>` : "") : "—"],
                ["Notes", escapeHtml(t.notes || "—") + (t.receive_notes ? `<span class="st-sub">On receipt: ${escapeHtml(t.receive_notes)}</span>` : "")]
            ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="st-card">
            <div class="st-card-title"><span>${receiving ? "Confirm What Arrived" : "Items"}</span><span style="text-transform:none;font-weight:400;">Quantities are in each item's dispensing unit.</span></div>
            ${receiving ? receiveForm(t) : itemsTable(t)}
        </div>

        <div class="st-card">
            <div class="st-card-title">History</div>
            <ol class="st-timeline">${(t.history || []).map((h) => `
                <li class="${h.action}"><strong>${HISTORY_LABELS[h.action] || escapeHtml(h.action)}</strong>${h.user_name ? ` by ${escapeHtml(h.user_name)}` : ""}
                    <span class="when">${escapeHtml(formatDateTime(h.created_at))}</span>${h.notes ? `<span class="note">${escapeHtml(h.notes)}</span>` : ""}</li>`).join("")}</ol>
        </div>`;

    $("stPrintBtn").addEventListener("click", () => printSlip(t));
    $("stEditBtn")?.addEventListener("click", () => openEditor(t));
    $("stSendBtn")?.addEventListener("click", () => sendSaved(t));
    $("stReceiveBtn")?.addEventListener("click", () => { receiving = true; renderTransfer(); });
    $("stCancelBtn")?.addEventListener("click", () => cancelTransfer(t));
    $("stDeleteBtn")?.addEventListener("click", () => removeDraft(t));
    if (receiving) setupReceiveForm(t);
}

function locationHtml(location) {
    const hint = custodianHint(location);
    return `${escapeHtml(location.name)}${location.physical_location ? `<span class="st-sub">${escapeHtml(location.physical_location)}</span>` : ""}
        <span class="st-sub">Custodian: ${escapeHtml(location.custodian_name || "none assigned")}</span>${!hint.warn && hint.text ? `<span class="st-sub">${escapeHtml(hint.text)}</span>` : ""}`;
}

function itemsTable(t) {
    const sent = ["in_transit", "received"].includes(t.status) || t.items.some((i) => i.lots.length);

    if (!sent) {
        return `<div class="st-table-wrap"><table class="st-table">
            <thead><tr><th>#</th><th>Item</th><th>Lot</th><th class="num">Quantity</th><th class="num">Usable at ${escapeHtml(t.from_name)}</th><th>Notes</th></tr></thead>
            <tbody>${t.items.map((i) => {
                const have = i.lot_id ? (i.lot_on_hand ?? 0) : i.available;
                return `<tr>
                    <td>${i.line_no}</td>
                    <td><strong>${escapeHtml(i.drug_name)}</strong></td>
                    <td>${i.lot_id ? `${escapeHtml(i.lot_number || "")}${i.lot_expires ? `<span class="st-sub">exp ${formatDate(i.lot_expires)}</span>` : ""}` : `<span class="st-sub" style="margin:0;">Earliest expiry first</span>`}</td>
                    <td class="num">${formatQty(i.quantity)} ${escapeHtml(i.unit_name || "")}</td>
                    <td class="num">${formatQty(have)}${have + EPS < i.quantity && t.status !== "cancelled" ? `<span class="st-sub st-minus">not enough</span>` : ""}</td>
                    <td>${escapeHtml(i.notes || "")}</td>
                </tr>`;
            }).join("")}</tbody></table></div>`;
    }

    const totals = { sent: 0, short: 0 };
    const rows = t.items.map((i) => {
        const head = `<tr>
            <td>${i.line_no}</td>
            <td colspan="2"><strong>${escapeHtml(i.drug_name)}</strong>${i.notes ? `<span class="st-sub">${escapeHtml(i.notes)}</span>` : ""}</td>
            <td class="num">${formatQty(i.quantity)} ${escapeHtml(i.unit_name || "")}</td>
            <td class="num">${i.quantity_sent != null ? formatQty(i.quantity_sent) : "—"}</td>
            <td class="num">${i.quantity_received != null ? formatQty(i.quantity_received) : "—"}</td>
            <td></td><td></td>
        </tr>`;
        const subs = i.lots.map((l) => {
            totals.sent += l.value_sent;
            totals.short += l.value_short || 0;
            const short = l.quantity_short > EPS;
            return `<tr class="sub ${short ? "short" : ""}">
                <td></td>
                <td>Lot ${escapeHtml(l.lot_number)}</td>
                <td>${l.expires_date ? `exp ${formatDate(l.expires_date)}` : "—"}</td>
                <td></td>
                <td class="num">${formatQty(l.quantity_sent)}</td>
                <td class="num">${l.quantity_received != null ? formatQty(l.quantity_received) : "—"}</td>
                <td>${short ? `<span class="st-badge short">${formatQty(l.quantity_short)} short</span><span class="st-sub">${escapeHtml(l.short_reason_label || "")}${l.short_notes ? ` — ${escapeHtml(l.short_notes)}` : ""}</span>` : ""}</td>
                <td class="num">${formatMoney(l.value_sent)}</td>
            </tr>`;
        }).join("");
        return head + subs;
    }).join("");

    return `<div class="st-table-wrap"><table class="st-table">
        <thead><tr><th>#</th><th>Item / Lot</th><th>Expiry</th><th class="num">Asked</th><th class="num">Sent</th><th class="num">Received</th><th>Short</th><th class="num">Value</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="7">Total sent${totals.short > 0 ? ` · <span class="st-minus">${formatMoney(totals.short)} short</span>` : ""}</td><td class="num">${formatMoney(totals.sent)}</td></tr></tfoot>
    </table></div>`;
}

function receiveForm(t) {
    const hint = custodianHint(t.to_location, "Receiving into");
    const reasons = options.short_reasons.map((r) => `<option value="${r.value}">${escapeHtml(r.label)}</option>`).join("");
    const lotRows = t.items.flatMap((i) => i.lots.map((l) => ({ item: i, lot: l })));

    return `
        ${hint.text ? `<p class="st-hint ${hint.warn ? "warn" : ""}" style="margin:0 0 10px;">${escapeHtml(hint.text)}</p>` : ""}
        <div class="st-table-wrap"><table class="st-table">
            <thead><tr><th>Item</th><th>Lot</th><th class="num">Sent</th><th>Arrived</th><th style="min-width:220px;">If less arrived: why</th></tr></thead>
            <tbody>${lotRows.map(({ item, lot }) => `
                <tr data-st-rcv="${lot.id}" data-sent="${lot.quantity_sent}">
                    <td><strong>${escapeHtml(item.drug_name)}</strong></td>
                    <td>${escapeHtml(lot.lot_number)}${lot.expires_date ? `<span class="st-sub">exp ${formatDate(lot.expires_date)}</span>` : ""}</td>
                    <td class="num">${formatQty(lot.quantity_sent)} ${escapeHtml(item.unit_name || "")}</td>
                    <td><input type="number" min="0" step="any" data-field="quantity_received" value="${lot.quantity_sent}" aria-label="Quantity that arrived">
                        <span class="form-error" data-err="quantity_received"></span></td>
                    <td><div data-short hidden>
                            <select data-field="short_reason" aria-label="Why it is short"><option value="">-- Reason --</option>${reasons}</select>
                            <span class="form-error" data-err="short_reason"></span>
                            <input type="text" data-field="short_notes" maxlength="255" placeholder="Details" style="margin-top:6px;" aria-label="Details">
                            <span class="form-error" data-err="short_notes"></span>
                        </div><span class="st-sub" data-full>All arrived</span></td>
                </tr>`).join("")}</tbody>
        </table></div>
        <div class="st-grid" style="margin-top:12px;">
            <div class="st-field"><label for="st_rcv_date">Date Received</label><input type="date" id="st_rcv_date" value="${todayISO()}" min="${t.sent_date || ""}" max="${todayISO()}">
                <span class="form-error" id="err-st_received_date"></span></div>
            <div class="st-field"><label for="st_rcv_notes">Notes</label><input type="text" id="st_rcv_notes" maxlength="500" placeholder="e.g. one box dented"></div>
        </div>
        <div id="stReceiveAlert"></div>
        <div class="st-footer"><div class="st-footer-right">
            <button type="button" class="st-btn" id="stReceiveCancel">Back</button>
            <button type="button" class="st-btn success" id="stReceiveSave">Confirm Receipt</button>
        </div></div>`;
}

function setupReceiveForm(t) {
    const table = $("stDetail").querySelector("[data-st-rcv]")?.closest("table");
    const refresh = (tr) => {
        const received = Number(tr.querySelector('[data-field="quantity_received"]').value);
        const short = Number(tr.dataset.sent) - (Number.isFinite(received) ? received : 0) > EPS;
        tr.querySelector("[data-short]").hidden = !short;
        tr.querySelector("[data-full]").hidden = short;
        tr.classList.toggle("short", short);
    };

    table?.addEventListener("input", (event) => {
        const tr = event.target.closest("[data-st-rcv]");
        if (!tr) return;
        tr.querySelectorAll(".form-error").forEach((el) => { el.textContent = ""; });
        refresh(tr);
    });
    $("stReceiveCancel").addEventListener("click", () => { receiving = false; renderTransfer(); });
    $("stReceiveSave").addEventListener("click", () => saveReceipt(t));
}

async function saveReceipt(t) {
    $("stReceiveAlert").innerHTML = "";
    $("err-st_received_date").textContent = "";
    const rows = [...$("stDetail").querySelectorAll("[data-st-rcv]")];
    let problems = 0;

    const lots = rows.map((tr) => {
        const value = (field) => tr.querySelector(`[data-field="${field}"]`).value;
        const received = value("quantity_received");
        const short = Number(tr.dataset.sent) - Number(received) > EPS;
        if (received === "" || Number(received) < 0) { tr.querySelector('[data-err="quantity_received"]').textContent = "Enter 0 or more."; problems++; }
        else if (Number(received) > Number(tr.dataset.sent) + EPS) { tr.querySelector('[data-err="quantity_received"]').textContent = "More than was sent."; problems++; }
        else if (short && !value("short_reason")) { tr.querySelector('[data-err="short_reason"]').textContent = "Say why it didn't all arrive."; problems++; }
        else if (short && value("short_reason") === "other" && !value("short_notes").trim()) { tr.querySelector('[data-err="short_notes"]').textContent = "Explain what happened."; problems++; }
        return { id: Number(tr.dataset.stRcv), quantity_received: received, short_reason: short ? value("short_reason") : "", short_notes: short ? value("short_notes").trim() : "" };
    });

    if (problems) {
        $("stReceiveAlert").innerHTML = `<div class="form-alert error">Please fix the highlighted lines.</div>`;
        return;
    }

    const shortLots = lots.filter((l, i) => Number(rows[i].dataset.sent) - Number(l.quantity_received) > EPS).length;
    const confirmed = await openDialog({
        title: `Receive ${t.st_number}?`,
        body: `<p>${shortLots ? `<strong>${shortLots} lot${shortLots === 1 ? "" : "s"} arrived short</strong> and will be recorded as lost in transit. ` : "Everything sent arrived. "}The stock that arrived is added to <strong>${escapeHtml(t.to_name)}</strong>.</p>`,
        okLabel: "Confirm Receipt", okClass: "success",
        run: () => stockTransferAction("receive", t.id, { received_date: $("st_rcv_date").value, notes: $("st_rcv_notes").value.trim(), lots })
    });

    if (confirmed) await openTransfer(t.id);
}

async function sendSaved(t) {
    const confirmed = await openDialog({
        title: `Send ${t.st_number}?`,
        body: sendDialogBody(t.from_location, t.to_location, t.items.length),
        okLabel: "Send", okClass: "primary",
        check: () => sendDialogCheck(),
        run: () => stockTransferAction("send", t.id, { sent_date: $("st_dlg_date").value, sent_via: $("st_dlg_via").value.trim() })
    });

    if (confirmed) await openTransfer(t.id);
}

async function cancelTransfer(t) {
    const confirmed = await openDialog({
        title: `Cancel ${t.st_number}?`,
        body: `<p>${t.status === "in_transit" ? `The stock goes back into the lots it left at <strong>${escapeHtml(t.from_name)}</strong>.` : "Nothing has been sent, so no stock changes."}</p>
            <div class="st-field"><label for="st_dlg_reason">Reason<span style="color:#dc2626;">*</span></label><textarea id="st_dlg_reason" maxlength="255"></textarea><span class="form-error" id="err-st_dlg"></span></div>`,
        okLabel: "Cancel Transfer", okClass: "danger solid",
        check: () => ($("st_dlg_reason").value.trim() ? null : "Say why the transfer is cancelled."),
        run: () => stockTransferAction("cancel", t.id, { reason: $("st_dlg_reason").value.trim() })
    });

    if (confirmed) await openTransfer(t.id);
}

async function removeDraft(t) {
    const confirmed = await openDialog({
        title: `Delete draft ${t.st_number}?`,
        body: "<p>The draft is removed. Nothing was sent, so no stock changes.</p>",
        okLabel: "Delete", okClass: "danger solid",
        run: () => deleteStockTransfer(t.id)
    });

    if (confirmed) await backToList();
}

/* ---------------------------------------------------------------
 * Dialog, print, helpers
 * ------------------------------------------------------------- */

function openDialog({ title, body, okLabel, okClass = "primary", check = null, run }) {
    return new Promise((resolve) => {
        const overlay = $("stDialogOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("stDialogOk").onclick = null;
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("stDialogTitle").textContent = title;
        $("stDialogBody").innerHTML = body;
        $("stDialogAlert").innerHTML = "";
        $("stDialogOk").textContent = okLabel;
        $("stDialogOk").className = `st-btn ${okClass}`;

        $("stDialogOk").onclick = async () => {
            const problem = check?.();
            if (problem) {
                $("err-st_dlg").textContent = problem;
                return;
            }

            $("stDialogOk").disabled = true;
            const result = await run();
            $("stDialogOk").disabled = false;

            // The editor shows its own errors on the lines.
            if (result?.keepEditor) {
                finish(true);
                return;
            }

            if (!result?.success) {
                const errors = result?.errors ? Object.values(result.errors) : [];
                const message = result?.message === "Validation failed." && errors.length ? errors[0] : (result?.message || "Something went wrong.");
                $("stDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}${errors.length > 1 || (errors.length && message !== errors[0]) ? `<br>${errors.map(escapeHtml).join("<br>")}` : ""}</div>`;
                return;
            }

            if (result.message) showToast(result.message, "success");
            finish(true);
        };

        $("stDialogClose").onclick = () => finish(false);
        $("stDialogCancel").onclick = () => finish(false);
        overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
        document.addEventListener("keydown", onKey);
        overlay.classList.add("open");
        ($("stDialogBody").querySelector("textarea, input") || $("stDialogOk")).focus();
    });
}

function printSlip(t) {
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    const sent = t.items.some((i) => i.lots.length);
    const body = sent
        ? t.items.flatMap((i) => i.lots.map((l) => `<tr><td>${escapeHtml(i.drug_name)}</td><td>${escapeHtml(l.lot_number)}</td><td>${l.expires_date ? formatDate(l.expires_date) : ""}</td>
            <td class="num">${formatQty(l.quantity_sent)} ${escapeHtml(i.unit_name || "")}</td><td class="num">${l.quantity_received != null ? formatQty(l.quantity_received) : ""}</td>
            <td>${l.quantity_short > EPS ? `${formatQty(l.quantity_short)} short — ${escapeHtml(l.short_reason_label || "")}` : ""}</td></tr>`)).join("")
        : t.items.map((i) => `<tr><td>${escapeHtml(i.drug_name)}</td><td>${i.lot_id ? escapeHtml(i.lot_number || "") : "Earliest expiry first"}</td><td>${i.lot_expires ? formatDate(i.lot_expires) : ""}</td>
            <td class="num">${formatQty(i.quantity)} ${escapeHtml(i.unit_name || "")}</td><td class="num"></td><td></td></tr>`).join("");

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(t.st_number)} - Stock Transfer</title>
<style>
    @page { size: A4 portrait; margin: 14mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0; padding: 24px; }
    h1 { margin: 0; font-size: 20px; letter-spacing: 1px; } .muted { color: #4b5563; }
    .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; margin-bottom: 14px; }
    .meta div { padding: 8px 10px; border-right: 1px solid #d1d5db; } .meta div:last-child { border-right: none; }
    .meta span { display: block; font-size: 10px; text-transform: uppercase; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; } th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; padding: 6px; border: 1px solid #d1d5db; }
    td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; height: 26px; } .num { text-align: right; }
    .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 56px; }
    .signs div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 11px; color: #4b5563; }
</style></head><body>
<div class="head"><div><h1>STOCK TRANSFER</h1><div class="muted">${escapeHtml(t.business?.name || "")}${t.business?.address ? ` · ${escapeHtml(t.business.address)}` : ""}</div></div>
    <div style="text-align:right;"><strong>${escapeHtml(t.st_number)}</strong><div class="muted">${STATUS_LABELS[t.status]}${t.priority === "urgent" ? " · URGENT" : ""}</div></div></div>
<div class="meta">
    <div><span>From</span>${escapeHtml(t.from_name)}</div>
    <div><span>To</span>${escapeHtml(t.to_name)}</div>
    <div><span>Date Sent</span>${t.sent_date ? formatDate(t.sent_date) : "&nbsp;"}</div>
    <div><span>Date Received</span>${t.received_date ? formatDate(t.received_date) : "&nbsp;"}</div>
</div>
<table><thead><tr><th>Item</th><th>Lot</th><th>Expiry</th><th class="num">Sent</th><th class="num">Received</th><th>Remarks</th></tr></thead><tbody>${body}</tbody></table>
${t.notes ? `<p class="muted">Notes: ${escapeHtml(t.notes)}</p>` : ""}
<div class="signs">
    <div>${escapeHtml(t.created_by_name || "")}<br>Prepared by</div>
    <div>${escapeHtml(t.sent_by_name || "")}<br>Released by (${escapeHtml(t.from_name)})</div>
    <div>${escapeHtml(t.received_by_name || "")}<br>Received by (${escapeHtml(t.to_name)})</div>
</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body></html>`);
    win.document.close();
}

function truncate(text, max) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
