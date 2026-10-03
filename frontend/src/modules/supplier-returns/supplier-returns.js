import {
    fetchSupplierReturns, fetchSupplierReturn, fetchReturnSources, fetchReturnSuppliers,
    createSupplierReturn, updateSupplierReturn, deleteSupplierReturn, supplierReturnAction
} from "./supplier-returns.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";
import { todayISO } from "../../core/timezone.js";

// Keep in step with SupplierReturnService::PREPARER_ROLES / APPROVER_ROLES.
const PREPARER_ROLES = ["admin", "receptionist", "doctor"];
const canPrepare = () => PREPARER_ROLES.includes(getUser()?.role);

const VAT_PERCENT = 12;
const VAT_LABELS = { vatable: "VAT", exempt: "VAT-exempt", zero_rated: "Zero-rated" };
const STATUS_LABELS = {
    draft: "Draft", pending_approval: "For approval", rejected: "Rejected", approved: "Approved",
    sent: "Sent", credited: "Credited", cancelled: "Cancelled"
};
const HISTORY_LABELS = {
    created: "Prepared", submitted: "Submitted for approval", resubmitted: "Resubmitted for approval", approved: "Approved",
    rejected: "Sent back for changes", sent: "Sent to supplier", credited: "Credit memo recorded", cancelled: "Cancelled"
};
const TABS = [
    { id: "all", label: "All", filter: () => true },
    { id: "open", label: "In Progress", filter: (r) => ["draft", "rejected", "pending_approval", "approved"].includes(r.status) },
    { id: "sent", label: "Waiting for Credit", filter: (r) => r.status === "sent" },
    { id: "credited", label: "Credited", filter: (r) => r.status === "credited" },
    { id: "cancelled", label: "Cancelled", filter: (r) => r.status === "cancelled" }
];

let returns = [];
let activeTab = "all";

// Editor
let editing = null;
let suppliers = [];
let sources = { rejected: [], stock: [], reasons: {} };
let lines = [];   // { key, source, goods_receipt_item_id|lot_id, quantity, unit_cost, vat_type, reason, remarks }
let lineKey = 0;
let pickTab = "rejected";

const $ = (id) => document.getElementById(id);

export async function initSupplierReturns() {
    $("srNewBtn").hidden = !canPrepare();
    $("srNewBtn").addEventListener("click", () => openEditor());
    $("srSearch").addEventListener("input", renderList);
    document.querySelectorAll("[data-sr-back]").forEach((btn) => btn.addEventListener("click", showList));
    setupEditor();
    await loadList();
}

/* ---------------------------------------------------------------
 * List
 * ------------------------------------------------------------- */

async function loadList() {
    $("srList").innerHTML = `<div class="sr-empty">Loading...</div>`;
    const result = await fetchSupplierReturns();

    if (!result?.success) {
        $("srList").innerHTML = `<div class="sr-empty"><strong>Couldn't load returns.</strong><span class="sr-sub">${escapeHtml(result?.message || "The server didn't respond.")}</span>
            <button type="button" class="sr-btn small" id="srRetry" style="margin-top:10px;">Try Again</button></div>`;
        $("srRetry").addEventListener("click", loadList);
        return;
    }

    returns = result.data || [];
    $("srStatPending").textContent = returns.filter((r) => r.status === "pending_approval").length;
    $("srStatToSend").textContent = returns.filter((r) => r.status === "approved").length;
    $("srStatAwaiting").textContent = returns.filter((r) => r.status === "sent").length;
    $("srStatCredit").textContent = formatMoney(returns.reduce((sum, r) => sum + (r.credit_available || 0), 0));
    renderTabs();
    renderList();
}

function renderTabs() {
    $("srTabs").innerHTML = TABS.map((t) => {
        const count = returns.filter(t.filter).length;
        return `<button type="button" data-sr-tab="${t.id}" class="${t.id === activeTab ? "active" : ""}">${t.label}${t.id !== "all" && count ? `<span class="count">${count}</span>` : ""}</button>`;
    }).join("");

    $("srTabs").querySelectorAll("[data-sr-tab]").forEach((btn) => btn.addEventListener("click", () => {
        activeTab = btn.dataset.srTab;
        renderTabs();
        renderList();
    }));
}

function renderList() {
    const term = $("srSearch").value.trim().toLowerCase();
    const tab = TABS.find((t) => t.id === activeTab) || TABS[0];
    const list = returns.filter(tab.filter).filter((r) => !term
        || [r.rts_number, r.supplier_name, r.credit_memo_no].some((v) => (v || "").toLowerCase().includes(term)));

    $("srCount").textContent = `${list.length} return${list.length === 1 ? "" : "s"}`;

    if (!list.length) {
        $("srList").innerHTML = `<div class="sr-empty">${returns.length ? "No returns here." : "No returns yet."}</div>`;
        return;
    }

    $("srList").innerHTML = `
        <div class="sr-table-wrap">
            <table class="sr-table">
                <thead><tr><th>RTS No.</th><th>Date</th><th>Supplier</th><th class="num">Items</th><th class="num">Value</th><th>Credit</th><th>Status</th></tr></thead>
                <tbody>${list.map((r) => `
                    <tr class="sr-row ${r.status === "cancelled" ? "is-cancelled" : ""}" data-sr-open="${r.id}">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.rts_number)}</strong><span class="sr-sub">by ${escapeHtml(r.created_by_name || "—")}</span></td>
                        <td style="white-space:nowrap;">${formatDate(r.return_date)}</td>
                        <td>${escapeHtml(r.supplier_name)}</td>
                        <td class="num">${r.item_count}</td>
                        <td class="num">${formatMoney(r.total)}</td>
                        <td>${r.status === "credited"
                            ? `${formatMoney(r.credit_amount)}<span class="sr-sub">${escapeHtml(r.credit_memo_no || "")}${r.credit_available > 0 ? ` · ${formatMoney(r.credit_available)} unused` : " · fully applied"}</span>`
                            : "—"}</td>
                        <td><span class="sr-badge ${r.status}">${STATUS_LABELS[r.status]}</span>
                            ${r.status === "pending_approval" && r.can_approve ? `<span class="sr-sub">Waiting for you</span>` : ""}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    $("srList").querySelectorAll("[data-sr-open]").forEach((row) => row.addEventListener("click", () => openReturn(Number(row.dataset.srOpen))));
}

function showPanel(name) {
    $("srListPanel").hidden = name !== "list";
    $("srEditPanel").hidden = name !== "edit";
    $("srDetailPanel").hidden = name !== "detail";
    document.querySelector(".sr-page").scrollIntoView({ block: "start" });
}

async function showList() {
    showPanel("list");
    await loadList();
}

/* ---------------------------------------------------------------
 * Editor
 * ------------------------------------------------------------- */

function setupEditor() {
    $("sr_supplier_id").addEventListener("change", async () => {
        lines = [];
        await loadSources();
        renderLines();
    });

    document.querySelectorAll("[data-sr-pick]").forEach((btn) => btn.addEventListener("click", () => {
        pickTab = btn.dataset.srPick;
        document.querySelectorAll("[data-sr-pick]").forEach((b) => b.classList.toggle("active", b === btn));
        renderPicker();
    }));

    $("srPickList").addEventListener("click", (event) => {
        const add = event.target.closest("[data-sr-add]");
        if (!add) return;

        const [source, id] = add.dataset.srAdd.split(":");
        const row = sourceRow(source, Number(id));
        lines.push({
            key: ++lineKey,
            source,
            goods_receipt_item_id: source === "rejected" ? row.goods_receipt_item_id : null,
            lot_id: source === "stock" ? row.lot_id : null,
            quantity: source === "rejected" ? String(row.available) : "",
            unit_cost: String(row.unit_cost),
            vat_type: row.vat_type,
            reason: source === "rejected" ? "damaged" : (row.is_expired ? "expired" : row.days_to_expiry !== null && row.days_to_expiry <= 180 ? "near_expiry" : ""),
            remarks: source === "rejected" ? (row.rejection_reason || "") : ""
        });
        renderLines();
        document.querySelector(`[data-sr-line="${lines.at(-1).key}"] [data-field="quantity"]`)?.focus();
    });

    $("srLines").addEventListener("input", (event) => {
        const tr = event.target.closest("[data-sr-line]");
        const field = event.target.dataset.field;
        if (!tr || !field) return;
        const line = lines.find((l) => l.key === Number(tr.dataset.srLine));
        line[field] = event.target.value;
        const err = $(`err-sr_item_${lines.indexOf(line)}_${field}`);
        if (err) err.textContent = "";
        refreshAmounts();
    });

    $("srLines").addEventListener("change", (event) => {
        const tr = event.target.closest("[data-sr-line]");
        const field = event.target.dataset.field;
        if (!tr || !field || event.target.tagName !== "SELECT") return;
        lines.find((l) => l.key === Number(tr.dataset.srLine))[field] = event.target.value;
        refreshAmounts();
    });

    $("srLines").addEventListener("click", (event) => {
        const remove = event.target.closest("[data-sr-remove]");
        if (!remove) return;
        lines = lines.filter((l) => l.key !== Number(remove.dataset.srRemove));
        renderLines();
    });

    $("srForm").addEventListener("submit", (event) => { event.preventDefault(); save(true); });
    $("srSaveDraft").addEventListener("click", () => save(false));
    $("srDeleteDraft").addEventListener("click", async () => {
        const done = await openDialog({
            title: `Delete ${editing.rts_number}?`,
            body: `<p>This draft is removed. Nothing has left stock yet.</p>`,
            okLabel: "Delete Draft", okClass: "danger solid",
            onConfirm: () => deleteSupplierReturn(editing.id)
        });
        if (done) await showList();
    });
}

async function openEditor(existing = null) {
    if (!suppliers.length) {
        const result = await fetchReturnSuppliers();
        suppliers = result?.success ? result.data || [] : [];
    }

    editing = existing;
    $("srEditAlert").innerHTML = "";
    document.querySelectorAll("#srForm .form-error").forEach((el) => { el.textContent = ""; });

    $("srEditTitle").textContent = existing ? `Edit ${existing.rts_number}` : "New Return to Supplier";
    $("srEditSub").textContent = existing?.status === "rejected"
        ? `Sent back: “${existing.rejection_reason || ""}”. Change it and submit again.`
        : "Pick what goes back: quantities rejected at receiving, or stock from a storage location.";
    $("sr_supplier_id").innerHTML = `<option value="">-- Choose the supplier --</option>` +
        suppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
    $("sr_supplier_id").value = existing?.supplier_id || "";
    $("sr_supplier_id").disabled = Boolean(existing);
    $("sr_return_date").value = existing?.return_date || todayISO();
    $("sr_return_date").max = todayISO();
    $("sr_notes").value = existing?.notes || "";
    $("srDeleteDraft").hidden = existing?.status !== "draft";

    lines = (existing?.items || []).map((i) => ({
        key: ++lineKey,
        source: i.source,
        goods_receipt_item_id: i.goods_receipt_item_id,
        lot_id: i.lot_id,
        quantity: String(i.quantity),
        unit_cost: String(i.unit_cost),
        vat_type: i.vat_type,
        reason: i.reason,
        remarks: i.remarks || ""
    }));

    await loadSources();
    renderLines();
    showPanel("edit");
}

async function loadSources() {
    const supplierId = $("sr_supplier_id").value;
    sources = { rejected: [], stock: [], reasons: sources.reasons || {} };

    if (supplierId) {
        const result = await fetchReturnSources(supplierId, editing?.id);
        if (result?.success) sources = result.data;
    }

    renderPicker();
}

function sourceRow(source, id) {
    return source === "rejected"
        ? sources.rejected.find((r) => r.goods_receipt_item_id === id)
        : sources.stock.find((r) => r.lot_id === id);
}

function expiryBadge(row) {
    if (!row.expires_date) return "";
    if (row.is_expired) return `<span class="sr-badge expired">Expired</span>`;
    if (row.days_to_expiry !== null && row.days_to_expiry <= 180) return `<span class="sr-badge soon">Expires in ${row.days_to_expiry} days</span>`;
    return "";
}

function renderPicker() {
    if (!$("sr_supplier_id").value) {
        $("srPickList").innerHTML = `<div class="sr-empty" style="border:none;">Choose the supplier first.</div>`;
        return;
    }

    const onReturn = new Set(lines.map((l) => l.source === "rejected" ? `G${l.goods_receipt_item_id}` : `L${l.lot_id}`));

    if (pickTab === "rejected") {
        $("srPickList").innerHTML = sources.rejected.map((r) => {
            const added = onReturn.has(`G${r.goods_receipt_item_id}`);
            return `
            <div class="sr-pick-row ${added ? "added" : ""}">
                <div class="grow">
                    <strong>${escapeHtml(r.drug_name)}</strong> &middot; ${formatQty(r.available)} ${escapeHtml(r.unit_label)} rejected
                    <span class="sr-sub">${escapeHtml(r.gr_number)} (${formatDate(r.received_date)}) · ${escapeHtml(r.po_number)}${r.lot_number ? ` · lot ${escapeHtml(r.lot_number)}` : ""}${r.rejection_reason ? ` · “${escapeHtml(r.rejection_reason)}”` : ""}</span>
                </div>
                <button type="button" class="sr-btn small" data-sr-add="rejected:${r.goods_receipt_item_id}" ${added ? "disabled" : ""}>${added ? "Added" : "Add"}</button>
            </div>`;
        }).join("") || `<div class="sr-empty" style="border:none;">Nothing rejected at receiving from this supplier is waiting to go back.</div>`;
        return;
    }

    $("srPickList").innerHTML = sources.stock.map((r) => {
        const added = onReturn.has(`L${r.lot_id}`);
        return `
        <div class="sr-pick-row ${added ? "added" : ""}">
            <div class="grow">
                <strong>${escapeHtml(r.drug_name)}</strong> &middot; lot ${escapeHtml(r.lot_number)} ${expiryBadge(r)}
                <span class="sr-sub">${formatQty(r.on_hand)} ${escapeHtml(r.unit_label)} in ${escapeHtml(r.warehouse_name || "—")}${r.expires_date ? ` · expires ${formatDate(r.expires_date)}` : ""} · ${formatMoney(r.unit_cost, 4)} / ${escapeHtml(r.unit_label)}</span>
            </div>
            <button type="button" class="sr-btn small" data-sr-add="stock:${r.lot_id}" ${added ? "disabled" : ""}>${added ? "Added" : "Add"}</button>
        </div>`;
    }).join("") || `<div class="sr-empty" style="border:none;">No stock from this supplier on hand.</div>`;
}

function renderLines() {
    renderPicker();

    if (!lines.length) {
        $("srLines").innerHTML = `<div class="sr-empty">Nothing added yet. Pick items above.</div>`;
        refreshAmounts();
        return;
    }

    const reasons = Object.entries(sources.reasons || {});

    $("srLines").innerHTML = `
        <div class="sr-lines-wrap">
            <table class="sr-lines">
                <thead><tr><th>Item</th><th style="width:100px;">Qty</th><th style="width:110px;">Cost / Unit (&#8369;)</th><th style="width:120px;">VAT</th><th style="width:170px;">Reason</th><th>Remarks</th><th class="num" style="width:110px;">Value</th><th style="width:34px;"></th></tr></thead>
                <tbody>${lines.map((line, index) => {
                    const row = sourceRow(line.source, line.source === "rejected" ? line.goods_receipt_item_id : line.lot_id);
                    const unit = row?.unit_label || "unit";
                    return `
                    <tr data-sr-line="${line.key}">
                        <td style="min-width:200px;">
                            <strong>${escapeHtml(row?.drug_name || "Item")}</strong>
                            <span class="sr-sub"><span class="sr-badge source">${line.source === "rejected" ? "Rejected at receiving" : "From stock"}</span></span>
                            <span class="sr-sub">${line.source === "rejected"
                                ? `${escapeHtml(row?.gr_number || "")} · up to ${formatQty(row?.available || 0)} ${escapeHtml(unit)} · not in stock`
                                : `Lot ${escapeHtml(row?.lot_number || "")} · ${escapeHtml(row?.warehouse_name || "")} · ${formatQty(row?.on_hand || 0)} on hand`}</span>
                        </td>
                        <td><input type="number" min="0" step="any" data-field="quantity" value="${escapeHtml(line.quantity)}" aria-label="Quantity">
                            <span class="sr-sub" style="text-align:right;">${escapeHtml(unit)}</span>
                            <span class="form-error" id="err-sr_item_${index}_quantity"></span></td>
                        <td><input type="number" min="0" step="any" data-field="unit_cost" value="${escapeHtml(line.unit_cost)}" aria-label="Cost per unit">
                            <span class="form-error" id="err-sr_item_${index}_unit_cost"></span></td>
                        <td><select data-field="vat_type" aria-label="VAT">${Object.entries(VAT_LABELS).map(([v, l]) => `<option value="${v}" ${line.vat_type === v ? "selected" : ""}>${l}</option>`).join("")}</select></td>
                        <td><select data-field="reason" aria-label="Reason"><option value="">-- Why? --</option>${reasons.map(([v, l]) => `<option value="${v}" ${line.reason === v ? "selected" : ""}>${escapeHtml(l)}</option>`).join("")}</select>
                            <span class="form-error" id="err-sr_item_${index}_reason"></span></td>
                        <td><input type="text" maxlength="255" data-field="remarks" value="${escapeHtml(line.remarks)}" placeholder="Optional"></td>
                        <td class="num"><strong data-cell="value"></strong></td>
                        <td><button type="button" class="sr-remove" data-sr-remove="${line.key}" aria-label="Remove">&times;</button></td>
                    </tr>`;
                }).join("")}
                </tbody>
            </table>
        </div>`;

    refreshAmounts();
}

function lineValue(line) {
    const value = round((Number(line.quantity) || 0) * (Number(line.unit_cost) || 0), 2);
    return { value, vat: line.vat_type === "vatable" ? round(value * VAT_PERCENT / 100, 2) : 0 };
}

function refreshAmounts() {
    let subtotal = 0;
    let vat = 0;

    lines.forEach((line) => {
        const a = lineValue(line);
        subtotal += a.value;
        vat += a.vat;
        const cell = document.querySelector(`[data-sr-line="${line.key}"] [data-cell="value"]`);
        if (cell) cell.textContent = formatMoney(a.value);
    });

    $("srSubtotal").textContent = formatMoney(round(subtotal, 2));
    $("srVat").textContent = formatMoney(round(vat, 2));
    $("srTotal").textContent = formatMoney(round(subtotal + vat, 2));
}

async function save(submit) {
    $("srEditAlert").innerHTML = "";
    document.querySelectorAll("#srForm .form-error").forEach((el) => { el.textContent = ""; });

    let problems = 0;
    if (!$("sr_supplier_id").value) { $("err-sr_supplier_id").textContent = "Choose the supplier."; problems++; }
    lines.forEach((line, i) => {
        if (!(Number(line.quantity) > 0)) { $(`err-sr_item_${i}_quantity`).textContent = "Enter the quantity."; problems++; }
        if (!line.reason) { $(`err-sr_item_${i}_reason`).textContent = "Choose why it is going back."; problems++; }
    });
    if (submit && !lines.length) { $("err-sr_items").textContent = "Add the items going back."; problems++; }

    if (problems) {
        showAlert("Please fix the highlighted fields.");
        return;
    }

    const payload = {
        supplier_id: $("sr_supplier_id").value,
        return_date: $("sr_return_date").value,
        notes: $("sr_notes").value.trim(),
        submit,
        items: lines.map((l) => ({
            source: l.source,
            ...(l.source === "rejected" ? { goods_receipt_item_id: l.goods_receipt_item_id } : { lot_id: l.lot_id }),
            quantity: l.quantity, unit_cost: l.unit_cost, vat_type: l.vat_type, reason: l.reason, remarks: l.remarks
        }))
    };

    $("srSubmit").disabled = true;
    $("srSaveDraft").disabled = true;
    const result = editing ? await updateSupplierReturn(editing.id, payload) : await createSupplierReturn(payload);
    $("srSubmit").disabled = false;
    $("srSaveDraft").disabled = false;

    if (!result?.success) {
        const errors = result?.errors && typeof result.errors === "object" ? result.errors : null;
        if (errors) {
            Object.entries(errors).forEach(([name, message]) => {
                const m = name.match(/^items\.(\d+)\.(\w+)$/);
                const el = m ? $(`err-sr_item_${m[1]}_${m[2]}`) : $(`err-sr_${name}`);
                if (el) el.textContent = message;
            });
            showAlert("Nothing was saved. Please fix the highlighted fields.");
        } else {
            showAlert(result?.message || "Failed to save the return.");
        }
        return;
    }

    showToast(result.message, "success");
    await openReturn(result.data.id);
}

function showAlert(message) {
    $("srEditAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    $("srEditAlert").scrollIntoView({ block: "nearest" });
}

/* ---------------------------------------------------------------
 * Detail + workflow
 * ------------------------------------------------------------- */

async function openReturn(id) {
    const result = await fetchSupplierReturn(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the return.", "error");
        return;
    }

    const r = result.data;

    $("srDetail").innerHTML = `
        ${statusBanner(r)}
        <div class="sr-card">
            <div class="sr-card-title">
                <span style="font-size:16px;text-transform:none;color:var(--text-primary);">${escapeHtml(r.rts_number)} <span class="sr-badge ${r.status}">${STATUS_LABELS[r.status]}</span></span>
                <span class="sr-actions">
                    <button type="button" class="sr-btn" id="srPrintBtn">Print</button>
                    ${r.can_edit ? `<button type="button" class="sr-btn" id="srEditBtn">${r.status === "rejected" ? "Change & Resubmit" : "Edit"}</button>` : ""}
                    ${r.can_cancel ? `<button type="button" class="sr-btn danger" id="srCancelBtn">Cancel Return</button>` : ""}
                </span>
            </div>
            <dl class="sr-info">${[
                ["Supplier", `${escapeHtml(r.supplier_name)}${r.supplier_tin ? `<span class="sr-sub">TIN ${escapeHtml(r.supplier_tin)}</span>` : ""}`],
                ["Return Date", formatDate(r.return_date)],
                ["Prepared by", escapeHtml(r.created_by_name || "—")],
                ["Approved by", escapeHtml(r.approved_by_name || "—")],
                ["Sent", r.sent_date ? `${formatDate(r.sent_date)}${r.sent_via ? `<span class="sr-sub">${escapeHtml(r.sent_via)}</span>` : ""}` : "—"],
                ["Credit Memo", r.credit_memo_no ? `${escapeHtml(r.credit_memo_no)}<span class="sr-sub">${formatDate(r.credit_memo_date)} · ${formatMoney(r.credit_amount)}</span>` : "—"],
                ["Notes", escapeHtml(r.notes || "—")]
            ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="sr-card">
            <div class="sr-card-title">Items</div>
            <div class="sr-lines-wrap">
                <table class="sr-lines" style="min-width:780px;">
                    <thead><tr><th>Item</th><th>Source</th><th>Reason</th><th class="num">Qty</th><th class="num">Cost / Unit</th><th>VAT</th><th class="num">Value</th></tr></thead>
                    <tbody>${r.items.map((i) => `
                        <tr>
                            <td><strong>${escapeHtml(i.drug_name)}</strong><span class="sr-sub">${i.lot_number ? `Lot ${escapeHtml(i.lot_number)}` : ""}${i.expires_date ? ` · exp. ${formatDate(i.expires_date)}` : ""}</span></td>
                            <td>${i.source === "rejected" ? `Rejected at receiving<span class="sr-sub">${escapeHtml(i.gr_number || "")} · ${escapeHtml(i.po_number || "")}</span>` : `Stock<span class="sr-sub">${escapeHtml(i.warehouse_name || "")}</span>`}</td>
                            <td>${escapeHtml(i.reason_label)}${i.remarks ? `<span class="sr-sub">${escapeHtml(i.remarks)}</span>` : ""}</td>
                            <td class="num">${formatQty(i.quantity)} ${escapeHtml(itemUnit(i))}</td>
                            <td class="num">${formatMoney(i.unit_cost, 4)}</td>
                            <td>${VAT_LABELS[i.vat_type] || i.vat_type}</td>
                            <td class="num">${formatMoney(i.line_total)}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            </div>
            <div class="sr-totals" style="margin-top:14px;">
                <span class="label">Value before VAT</span><span class="val">${formatMoney(r.subtotal)}</span>
                <span class="label">VAT (${formatQty(r.vat_rate)}%)</span><span class="val">${formatMoney(r.vat_amount)}</span>
                <span class="label grand">Return Value</span><span class="val grand">${formatMoney(r.total)}</span>
            </div>
        </div>

        ${r.status === "credited" ? `
        <div class="sr-card">
            <div class="sr-card-title"><span>Credit Applied to Invoices</span>
                <span style="text-transform:none;color:var(--text-primary);">${formatMoney(r.credit_applied)} of ${formatMoney(r.credit_amount)} used${r.credit_available > 0 ? ` · ${formatMoney(r.credit_available)} left` : ""}</span></div>
            ${r.applications.length ? `<div class="sr-lines-wrap"><table class="sr-lines" style="min-width:480px;">
                <thead><tr><th>Ref.</th><th>Date</th><th>Invoices</th><th class="num">Amount</th><th>Status</th></tr></thead>
                <tbody>${r.applications.map((a) => `<tr><td>${escapeHtml(a.pv_number)}</td><td>${formatDate(a.payment_date)}</td><td>${escapeHtml(a.invoice_numbers || "")}</td>
                    <td class="num">${formatMoney(a.total_applied)}</td><td>${a.status === "voided" ? `<span class="sr-badge cancelled">Voided</span>` : `<span class="sr-badge credited">Applied</span>`}</td></tr>`).join("")}</tbody>
            </table></div>` : `<p class="sr-hint" style="margin:0;">Not applied yet. An accountant applies it to the supplier's open invoices under Pharmacy &gt; Accounts Payable &gt; Credits.</p>`}
        </div>` : ""}

        <div class="sr-card">
            <div class="sr-card-title">History</div>
            <ol class="sr-timeline">${(r.history || []).map((h) => `
                <li class="${h.action}"><strong>${HISTORY_LABELS[h.action] || escapeHtml(h.action)}</strong>${h.user_name ? ` by ${escapeHtml(h.user_name)}` : ""}
                    <span class="when">${escapeHtml(formatDateTime(h.created_at))}</span>
                    ${h.notes ? `<span class="note">&ldquo;${escapeHtml(h.notes)}&rdquo;</span>` : ""}</li>`).join("")}</ol>
        </div>`;

    $("srPrintBtn").addEventListener("click", () => printReturn(r));
    $("srEditBtn")?.addEventListener("click", () => openEditor(r));
    $("srCancelBtn")?.addEventListener("click", () => action(r, "cancel"));
    $("srApproveBtn")?.addEventListener("click", () => action(r, "approve"));
    $("srRejectBtn")?.addEventListener("click", () => action(r, "reject"));
    $("srSendBtn")?.addEventListener("click", () => action(r, "send"));
    $("srCreditBtn")?.addEventListener("click", () => action(r, "credit"));

    showPanel("detail");
}

function statusBanner(r) {
    const parts = {
        draft: ["Draft", "Not submitted yet."],
        pending_approval: ["Waiting for approval", r.can_approve ? "Check the items and their value, then approve or send it back." : escapeHtml(r.approval_blocker || "An administrator or accountant approves it.")],
        rejected: ["Sent back for changes", `“${escapeHtml(r.rejection_reason || "")}”`],
        approved: ["Approved — ready to send", "Mark it sent when the items leave. Items from stock are taken out of inventory then."],
        sent: ["Sent — waiting for the supplier's credit", r.can_credit ? "Record the supplier's credit memo when it arrives." : "An administrator or accountant records the supplier's credit memo."],
        credited: ["Credited", `${escapeHtml(r.credit_memo_no || "")}: ${formatMoney(r.credit_amount)}. ${r.credit_available > 0 ? `${formatMoney(r.credit_available)} still to apply against the supplier's invoices.` : "Fully applied against the supplier's invoices."}`],
        cancelled: ["Cancelled", `“${escapeHtml(r.cancel_reason || "")}”`]
    }[r.status];

    const buttons = [
        r.can_approve ? `<button type="button" class="sr-btn" id="srRejectBtn">Send Back</button><button type="button" class="sr-btn success" id="srApproveBtn">Approve</button>` : "",
        r.can_send ? `<button type="button" class="sr-btn primary" id="srSendBtn">Mark as Sent</button>` : "",
        r.can_credit ? `<button type="button" class="sr-btn success" id="srCreditBtn">Record Credit Memo</button>` : ""
    ].join("");

    return `<div class="sr-banner ${r.status}"><div><strong>${parts[0]}</strong><span>${parts[1]}</span></div>${buttons ? `<div class="sr-actions">${buttons}</div>` : ""}</div>`;
}

async function action(r, name) {
    const summary = `
        <dl class="sr-dialog-summary">
            <dt>Supplier</dt><dd>${escapeHtml(r.supplier_name)}</dd>
            <dt>Items</dt><dd>${r.items.length}</dd>
            <dt>Return value</dt><dd>${formatMoney(r.total)}</dd>
        </dl>`;
    const stockLines = r.items.filter((i) => i.source === "stock");

    const config = {
        approve: {
            title: `Approve ${r.rts_number}?`,
            body: `${summary}<label for="srDlgText">Notes (optional)</label><textarea id="srDlgText" maxlength="500"></textarea>`,
            okLabel: "Approve", okClass: "success",
            run: () => supplierReturnAction("approve", r.id, { notes: $("srDlgText").value.trim() })
        },
        reject: {
            title: `Send ${r.rts_number} back for changes?`,
            body: `${summary}<label for="srDlgText">What has to change<span style="color:#dc2626;">*</span></label><textarea id="srDlgText" maxlength="255"></textarea><span class="form-error" id="err-sr_dlg_reason"></span>`,
            okLabel: "Send Back", okClass: "danger solid",
            check: () => $("srDlgText").value.trim() ? null : ["err-sr_dlg_reason", "Say what has to change."],
            run: () => supplierReturnAction("reject", r.id, { reason: $("srDlgText").value.trim() })
        },
        cancel: {
            title: `Cancel ${r.rts_number}?`,
            body: `${summary}<p>Nothing has left stock yet, so nothing changes in inventory.</p><label for="srDlgText">Reason<span style="color:#dc2626;">*</span></label><textarea id="srDlgText" maxlength="255"></textarea><span class="form-error" id="err-sr_dlg_reason"></span>`,
            okLabel: "Cancel Return", okClass: "danger solid",
            check: () => $("srDlgText").value.trim() ? null : ["err-sr_dlg_reason", "Say why it's cancelled."],
            run: () => supplierReturnAction("cancel", r.id, { reason: $("srDlgText").value.trim() })
        },
        send: {
            title: `Send ${r.rts_number} to the supplier?`,
            body: `${summary}
                <p>${stockLines.length
                    ? `<strong>${stockLines.length} item${stockLines.length === 1 ? "" : "s"} will be taken out of stock now:</strong> ${stockLines.map((i) => `${escapeHtml(i.drug_name)} lot ${escapeHtml(i.lot_number || "")} (${formatQty(i.quantity)})`).join("; ")}.`
                    : "All items were rejected at receiving, so nothing changes in stock."}</p>
                <label for="srDlgDate">Date Sent</label><input type="date" id="srDlgDate" value="${todayISO()}" max="${todayISO()}">
                <span class="form-error" id="err-sr_dlg_sent_date"></span>
                <label for="srDlgVia">Sent Via</label><input type="text" id="srDlgVia" maxlength="150" placeholder="e.g. Supplier pick-up, J. Reyes / LBC 7781">`,
            okLabel: "Mark as Sent", okClass: "primary",
            run: () => supplierReturnAction("send", r.id, { sent_date: $("srDlgDate").value, sent_via: $("srDlgVia").value.trim() })
        },
        credit: {
            title: `Record credit for ${r.rts_number}`,
            body: `${summary}
                <p>Enter the supplier's credit memo. It can be less than the return value if the supplier didn't credit everything.</p>
                <label for="srDlgNo">Credit Memo No.<span style="color:#dc2626;">*</span></label><input type="text" id="srDlgNo" maxlength="100">
                <span class="form-error" id="err-sr_dlg_credit_memo_no"></span>
                <label for="srDlgDate">Credit Memo Date<span style="color:#dc2626;">*</span></label><input type="date" id="srDlgDate" value="${todayISO()}" max="${todayISO()}">
                <span class="form-error" id="err-sr_dlg_credit_memo_date"></span>
                <label for="srDlgAmount">Amount Credited (&#8369;)<span style="color:#dc2626;">*</span></label><input type="number" id="srDlgAmount" min="0" step="0.01" value="${r.total.toFixed(2)}">
                <span class="form-error" id="err-sr_dlg_credit_amount"></span>`,
            okLabel: "Record Credit", okClass: "success",
            check: () => !$("srDlgNo").value.trim() ? ["err-sr_dlg_credit_memo_no", "Enter the credit memo number."] : null,
            run: () => supplierReturnAction("credit", r.id, {
                credit_memo_no: $("srDlgNo").value.trim(), credit_memo_date: $("srDlgDate").value, credit_amount: $("srDlgAmount").value
            })
        }
    }[name];

    const done = await openDialog(config);
    if (done) await openReturn(r.id);
}

function openDialog({ title, body, okLabel, okClass = "primary", check = null, run = null, onConfirm = null }) {
    return new Promise((resolve) => {
        const overlay = $("srDialogOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("srDialogOk").onclick = null;
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("srDialogTitle").textContent = title;
        $("srDialogBody").innerHTML = body;
        $("srDialogAlert").innerHTML = "";
        $("srDialogOk").textContent = okLabel;
        $("srDialogOk").className = `sr-btn ${okClass}`;

        $("srDialogOk").onclick = async () => {
            $("srDialogBody").querySelectorAll(".form-error").forEach((el) => { el.textContent = ""; });
            const problem = check?.();
            if (problem) {
                $(problem[0]).textContent = problem[1];
                return;
            }

            $("srDialogOk").disabled = true;
            const result = await (run || onConfirm)();
            $("srDialogOk").disabled = false;

            if (!result?.success) {
                Object.entries(result?.errors || {}).forEach(([field, message]) => {
                    const el = $(`err-sr_dlg_${field}`);
                    if (el) el.textContent = message;
                });
                $("srDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message || "Something went wrong.")}</div>`;
                return;
            }

            if (result.message) showToast(result.message, "success");
            finish(true);
        };

        $("srDialogClose").onclick = () => finish(false);
        $("srDialogCancel").onclick = () => finish(false);
        overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
        document.addEventListener("keydown", onKey);

        overlay.classList.add("open");
        ($("srDialogBody").querySelector("input, textarea") || $("srDialogOk")).focus();
    });
}

/* ---------------------------------------------------------------
 * Printout: return slip / debit memo
 * ------------------------------------------------------------- */

function printReturn(r) {
    const win = window.open("", "_blank", "width=900,height=1000");

    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    const buyer = r.buyer || {};

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(r.rts_number)} - Return to Supplier</title>
<style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0; padding: 24px; }
    .head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 14px; }
    .org { font-size: 18px; font-weight: 700; }
    .muted { color: #4b5563; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; margin-bottom: 14px; }
    .meta div { padding: 8px 10px; border-right: 1px solid #d1d5db; }
    .meta div:last-child { border-right: none; }
    .meta span { display: block; font-size: 10px; text-transform: uppercase; color: #4b5563; letter-spacing: .4px; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; padding: 6px; border: 1px solid #d1d5db; }
    table.items td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; margin-top: 10px; width: 300px; border-collapse: collapse; }
    .totals td { padding: 4px 6px; }
    .totals .grand td { font-weight: 700; font-size: 14px; border-top: 2px solid #111827; }
    .signs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 56px; }
    .signs div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 11px; color: #4b5563; }
    @media print { body { padding: 0; } }
</style></head><body>
<div class="head">
    <div><div class="org">${escapeHtml(buyer.name || "")}</div><div class="muted">${escapeHtml(buyer.address || "")}</div><div class="muted">${escapeHtml([buyer.phone, buyer.email].filter(Boolean).join(" · "))}</div></div>
    <div class="title"><h1>RETURN TO SUPPLIER</h1><div class="muted">Debit Memo</div>
        <div><strong>${escapeHtml(r.rts_number)}</strong></div><div class="muted">${formatDate(r.return_date)} · ${STATUS_LABELS[r.status]}</div></div>
</div>
<div class="meta">
    <div><span>Supplier</span>${escapeHtml(r.supplier_name)}${r.supplier_tin ? `<br>TIN ${escapeHtml(r.supplier_tin)}` : ""}</div>
    <div><span>Address</span>${escapeHtml(r.supplier_address || "—")}</div>
    <div><span>Sent</span>${r.sent_date ? `${formatDate(r.sent_date)}<br>${escapeHtml(r.sent_via || "")}` : "—"}</div>
    <div><span>Supplier Credit Memo</span>${r.credit_memo_no ? `${escapeHtml(r.credit_memo_no)}<br>${formatMoney(r.credit_amount)}` : "—"}</div>
</div>
<table class="items">
    <thead><tr><th>#</th><th>Item</th><th>Lot / Expiry</th><th>Reason</th><th class="num">Qty</th><th class="num">Unit Cost</th><th class="num">Amount</th></tr></thead>
    <tbody>${r.items.map((i) => `
        <tr><td>${i.line_no}</td><td>${escapeHtml(i.drug_name)}${i.source === "rejected" ? `<div class="muted">Rejected at receiving · ${escapeHtml(i.gr_number || "")}</div>` : ""}</td>
            <td>${escapeHtml(i.lot_number || "")}${i.expires_date ? `<br>${formatDate(i.expires_date)}` : ""}</td>
            <td>${escapeHtml(i.reason_label)}${i.remarks ? `<div class="muted">${escapeHtml(i.remarks)}</div>` : ""}</td>
            <td class="num">${formatQty(i.quantity)} ${escapeHtml(itemUnit(i))}</td><td class="num">${formatMoney(i.unit_cost, 4)}</td><td class="num">${formatMoney(i.line_total)}</td></tr>`).join("")}
    </tbody>
</table>
<table class="totals">
    <tr><td>Value before VAT</td><td class="num">${formatMoney(r.subtotal)}</td></tr>
    <tr><td>VAT (${formatQty(r.vat_rate)}%)</td><td class="num">${formatMoney(r.vat_amount)}</td></tr>
    <tr class="grand"><td>TOTAL</td><td class="num">${formatMoney(r.total)}</td></tr>
</table>
${r.notes ? `<p><strong>Notes:</strong> ${escapeHtml(r.notes)}</p>` : ""}
<div class="signs">
    <div>${r.created_by_name ? `<strong>${escapeHtml(r.created_by_name)}</strong><br>` : ""}Prepared by</div>
    <div>${r.approved_by_name ? `<strong>${escapeHtml(r.approved_by_name)}</strong><br>` : ""}Approved by</div>
    <div>Released by</div>
    <div>Received by (supplier) / Date</div>
</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body></html>`);
    win.document.close();
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

function itemUnit(item) {
    return item.order_unit === "package" ? (item.package_unit_name || "package") : (item.unit_name || "unit");
}

function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(Number(value) * factor) / factor;
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
