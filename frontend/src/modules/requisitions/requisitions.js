import {
    fetchRequisitions, fetchRequisition, fetchRequisitionOptions, fetchLowStock, fetchOutstanding,
    createRequisition, updateRequisition, deleteRequisition, requisitionAction, convertRequisitions
} from "./requisitions.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";
import { todayISO } from "../../core/timezone.js";

const STATUS_LABELS = { draft: "Draft", submitted: "For approval", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled", closed: "Closed" };
const PROGRESS_LABELS = {
    not_ordered: "Not ordered yet", partially_ordered: "Partly ordered", ordered: "Fully ordered",
    partially_received: "Partly received", received: "Received"
};
const HISTORY_LABELS = {
    created: "Created", submitted: "Submitted for approval", resubmitted: "Resubmitted for approval", approved: "Approved",
    rejected: "Rejected", cancelled: "Cancelled", closed: "Closed — rest won't be ordered", ordered: "Put on a purchase order"
};
const TABS = [
    { id: "all", label: "All", filter: () => true },
    { id: "mine", label: "My Requests", filter: (r) => r.is_mine },
    { id: "approve", label: "For My Approval", filter: (r) => r.can_approve },
    { id: "approved", label: "Approved", filter: (r) => r.status === "approved" },
    { id: "done", label: "Closed & Cancelled", filter: (r) => ["closed", "cancelled"].includes(r.status) }
];

let requests = [];
let activeTab = "all";
let options = null;

// Editor
let editing = null;
let lines = [];   // { key, drug_id, order_unit, quantity, notes }
let lineKey = 0;

// Order from requests
let outstanding = null;
let picks = {};   // requisition_item_id -> { checked, quantity, supplier_id }

const $ = (id) => document.getElementById(id);

export async function initRequisitions() {
    $("prNewBtn").addEventListener("click", () => openEditor());
    $("prOrderBtn").addEventListener("click", () => openOrderPanel());
    $("prSearch").addEventListener("input", renderList);
    document.querySelectorAll("[data-pr-back]").forEach((btn) => btn.addEventListener("click", showList));
    setupEditor();

    const optionResult = await fetchRequisitionOptions();
    options = optionResult?.success ? optionResult.data : { departments: [], warehouses: [], drugs: [], can_order: false };
    $("prOrderBtn").hidden = !options.can_order;

    await loadList();
}

/* ---------------------------------------------------------------
 * List
 * ------------------------------------------------------------- */

async function loadList() {
    $("prList").innerHTML = `<div class="pr-empty">Loading...</div>`;
    const result = await fetchRequisitions();

    if (!result?.success) {
        $("prList").innerHTML = `<div class="pr-empty"><strong>Couldn't load requests.</strong><span class="pr-sub">${escapeHtml(result?.message || "The server didn't respond.")}</span>
            <button type="button" class="pr-btn small" id="prRetry" style="margin-top:10px;">Try Again</button></div>`;
        $("prRetry").addEventListener("click", loadList);
        return;
    }

    requests = result.data || [];
    $("prStatMine").textContent = requests.filter((r) => r.can_approve).length;
    $("prStatSubmitted").textContent = requests.filter((r) => r.status === "submitted").length;
    $("prStatToOrder").textContent = requests.filter((r) => r.status === "approved" && ["not_ordered", "partially_ordered"].includes(r.progress)).length;
    $("prStatOverdue").textContent = requests.filter((r) => r.is_overdue).length;

    if (activeTab === "all" && requests.some((r) => r.can_approve)) activeTab = "approve";
    renderTabs();
    renderList();
}

function renderTabs() {
    $("prTabs").innerHTML = TABS.map((t) => {
        const count = requests.filter(t.filter).length;
        return `<button type="button" data-pr-tab="${t.id}" class="${t.id === activeTab ? "active" : ""}">${t.label}${t.id !== "all" && count ? `<span class="count">${count}</span>` : ""}</button>`;
    }).join("");
    $("prTabs").querySelectorAll("[data-pr-tab]").forEach((btn) => btn.addEventListener("click", () => {
        activeTab = btn.dataset.prTab;
        renderTabs();
        renderList();
    }));
}

function statusCell(r) {
    const progress = r.progress ? `<span class="pr-sub"><span class="pr-badge ${r.progress}">${PROGRESS_LABELS[r.progress]}</span></span>` : "";
    return `<span class="pr-badge ${r.status}">${STATUS_LABELS[r.status]}</span>${progress}`;
}

function renderList() {
    const term = $("prSearch").value.trim().toLowerCase();
    const tab = TABS.find((t) => t.id === activeTab) || TABS[0];
    const list = requests.filter(tab.filter).filter((r) => !term
        || [r.pr_number, r.department_name, r.reason, r.created_by_name, r.warehouse_name].some((v) => (v || "").toLowerCase().includes(term)));

    $("prCount").textContent = `${list.length} request${list.length === 1 ? "" : "s"}`;

    if (!list.length) {
        $("prList").innerHTML = `<div class="pr-empty">${requests.length ? "No requests here." : "No purchase requests yet. Use “+ New Request” to ask for items."}</div>`;
        return;
    }

    $("prList").innerHTML = `
        <div class="pr-table-wrap">
            <table class="pr-table">
                <thead><tr><th>PR No.</th><th>Department</th><th>Needed By</th><th>Reason</th><th class="num">Items</th><th>Ordered / Received</th><th>Status</th></tr></thead>
                <tbody>${list.map((r) => `
                    <tr class="pr-row" data-pr-open="${r.id}">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.pr_number)}</strong>${r.priority === "urgent" ? ` <span class="pr-badge urgent">Urgent</span>` : ""}<span class="pr-sub">by ${escapeHtml(r.created_by_name || "—")}</span></td>
                        <td>${escapeHtml(r.department_name)}${r.warehouse_name ? `<span class="pr-sub">to ${escapeHtml(r.warehouse_name)}</span>` : ""}</td>
                        <td style="white-space:nowrap;">${r.needed_by ? formatDate(r.needed_by) : "—"}${r.is_overdue ? ` <span class="pr-badge overdue">Overdue</span>` : ""}</td>
                        <td>${escapeHtml((r.reason || "—").slice(0, 80))}</td>
                        <td class="num">${r.item_count}</td>
                        <td>${r.progress ? `<span class="pr-sub" style="margin:0;">${r.percent_ordered}% ordered · ${r.percent_received}% received</span><div class="pr-bar"><span style="width:${r.percent_received}%;"></span></div>` : "—"}</td>
                        <td>${statusCell(r)}${r.can_approve ? `<span class="pr-sub">Waiting for you</span>` : ""}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    $("prList").querySelectorAll("[data-pr-open]").forEach((row) => row.addEventListener("click", () => openRequest(Number(row.dataset.prOpen))));
}

function showPanel(name) {
    ["List", "Edit", "Detail", "Order"].forEach((p) => { $(`pr${p}Panel`).hidden = p.toLowerCase() !== name; });
    document.querySelector(".pr-page").scrollIntoView({ block: "start" });
}

async function showList() {
    showPanel("list");
    await loadList();
}

/* ---------------------------------------------------------------
 * Editor
 * ------------------------------------------------------------- */

function drugById(id) {
    return options.drugs.find((d) => d.id === Number(id));
}

function setupEditor() {
    $("pr_department_id").addEventListener("change", showHeadHint);
    $("pr_warehouse_id").addEventListener("change", () => {
        // A location usually belongs to a department: suggest it.
        const location = options.warehouses.find((w) => w.id === Number($("pr_warehouse_id").value));
        if (location?.department_id && !editing) {
            $("pr_department_id").value = location.department_id;
            showHeadHint();
        }
    });

    $("prAddItem").addEventListener("change", () => {
        const id = Number($("prAddItem").value);
        $("prAddItem").value = "";
        if (!id) return;
        const drug = drugById(id);
        lines.push({ key: ++lineKey, drug_id: id, order_unit: drug?.package_quantity ? "package" : "unit", quantity: "", notes: "" });
        renderLines();
        document.querySelector(`[data-pr-line="${lines.at(-1).key}"] [data-field="quantity"]`)?.focus();
    });

    $("prLines").addEventListener("input", (event) => {
        const tr = event.target.closest("[data-pr-line]");
        const field = event.target.dataset.field;
        if (!tr || !field) return;
        lines.find((l) => l.key === Number(tr.dataset.prLine))[field] = event.target.value;
        if (field === "order_unit") renderLines();
    });

    $("prLines").addEventListener("click", (event) => {
        const remove = event.target.closest("[data-pr-remove]");
        if (!remove) return;
        lines = lines.filter((l) => l.key !== Number(remove.dataset.prRemove));
        renderLines();
    });

    $("prFillLow").addEventListener("click", fillFromLowStock);
    $("prForm").addEventListener("submit", (event) => { event.preventDefault(); save(true); });
    $("prSaveDraft").addEventListener("click", () => save(false));
    $("prDeleteDraft").addEventListener("click", async () => {
        const done = await openDialog({
            title: `Delete ${editing.pr_number}?`, body: "<p>This draft is removed.</p>", okLabel: "Delete Draft", okClass: "danger solid",
            run: () => deleteRequisition(editing.id)
        });
        if (done) await showList();
    });
}

function showHeadHint() {
    const department = options.departments.find((d) => d.id === Number($("pr_department_id").value));
    $("prHeadHint").textContent = !department ? ""
        : department.head_name ? `Approved by the department head, ${department.head_name}.` : "No head set for this department — an administrator approves.";
}

function openEditor(existing = null) {
    editing = existing;
    $("prEditAlert").innerHTML = "";
    document.querySelectorAll("#prForm .form-error").forEach((el) => { el.textContent = ""; });

    $("prEditTitle").textContent = existing ? `Edit ${existing.pr_number}` : "New Purchase Request";
    $("prEditSub").textContent = existing?.status === "rejected"
        ? `Rejected: “${existing.rejection_reason || ""}”. Change it and submit again.`
        : "Say what's needed, how much, and by when.";

    $("pr_department_id").innerHTML = `<option value="">-- Choose the department --</option>` +
        options.departments.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
    $("pr_warehouse_id").innerHTML = `<option value="">-- Not specified --</option>` +
        options.warehouses.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
    $("pr_department_id").value = existing?.department_id || options.my_department_id || "";
    $("pr_warehouse_id").value = existing?.warehouse_id || "";
    $("pr_needed_by").value = existing?.needed_by || "";
    $("pr_needed_by").min = todayISO();
    $("pr_priority").value = existing?.priority || "normal";
    $("pr_reason").value = existing?.reason || "";
    $("prDeleteDraft").hidden = existing?.status !== "draft";
    showHeadHint();

    lines = (existing?.items || []).map((i) => ({
        key: ++lineKey, drug_id: i.drug_id, order_unit: i.order_unit, quantity: String(i.quantity), notes: i.notes || ""
    }));

    renderLines();
    showPanel("edit");
}

function renderLines() {
    const onRequest = new Set(lines.map((l) => l.drug_id));
    $("prAddItem").innerHTML = `<option value="">+ Add an item...</option>` +
        options.drugs.filter((d) => !onRequest.has(d.id)).map((d) => `<option value="${d.id}">${escapeHtml(d.name)} — ${formatQty(d.on_hand)} ${escapeHtml(d.unit_name || "units")} in stock</option>`).join("");

    if (!lines.length) {
        $("prLines").innerHTML = `<div class="pr-empty">No items yet. Add them below, or fill from a location's low stock.</div>`;
        return;
    }

    $("prLines").innerHTML = `
        <div class="pr-lines-wrap"><table class="pr-lines">
            <thead><tr><th>#</th><th>Item</th><th style="width:110px;">Quantity</th><th style="width:170px;">Unit</th><th>Notes</th><th style="width:34px;"></th></tr></thead>
            <tbody>${lines.map((line, index) => {
                const drug = drugById(line.drug_id);
                const per = drug?.package_quantity;
                const qty = Number(line.quantity) || 0;
                return `
                <tr data-pr-line="${line.key}">
                    <td>${index + 1}</td>
                    <td><strong>${escapeHtml(drug?.name || "Item")}</strong><span class="pr-sub">${formatQty(drug?.on_hand || 0)} ${escapeHtml(drug?.unit_name || "units")} in stock${line.order_unit === "package" && per && qty ? ` · ${formatQty(qty * per)} ${escapeHtml(drug.unit_name || "units")}` : ""}</span>
                        <span class="form-error" id="err-pr_item_${index}_drug_id"></span></td>
                    <td><input type="number" min="0" step="any" data-field="quantity" value="${escapeHtml(line.quantity)}" aria-label="Quantity">
                        <span class="form-error" id="err-pr_item_${index}_quantity"></span></td>
                    <td><select data-field="order_unit" aria-label="Unit">
                        <option value="unit" ${line.order_unit === "unit" ? "selected" : ""}>${escapeHtml(capitalize(drug?.unit_name || "unit"))}</option>
                        ${per ? `<option value="package" ${line.order_unit === "package" ? "selected" : ""}>${escapeHtml(capitalize(drug.package_unit_name || "package"))} of ${formatQty(per)}</option>` : ""}
                    </select></td>
                    <td><input type="text" maxlength="255" data-field="notes" value="${escapeHtml(line.notes)}" placeholder="Optional"></td>
                    <td><button type="button" class="pr-remove" data-pr-remove="${line.key}" aria-label="Remove">&times;</button></td>
                </tr>`;
            }).join("")}</tbody>
        </table></div>`;
}

async function fillFromLowStock() {
    const warehouseId = $("pr_warehouse_id").value;

    if (!warehouseId) {
        $("err-pr_warehouse_id").textContent = "Choose the storage location to check first.";
        return;
    }

    $("err-pr_warehouse_id").textContent = "";
    const result = await fetchLowStock(warehouseId);

    if (!result?.success) {
        showToast(result?.message || "Couldn't check the stock levels.", "error");
        return;
    }

    const low = result.data;
    if (!low.levels_set) {
        showToast(`No minimum stock levels are set for ${low.warehouse_name}. Set them under Pharmacy > Storage Locations.`, "error");
        return;
    }

    let added = 0;
    low.items.filter((i) => i.suggested_qty > 0).forEach((item) => {
        if (lines.some((l) => l.drug_id === item.drug_id)) return;
        lines.push({ key: ++lineKey, drug_id: item.drug_id, order_unit: "unit", quantity: String(item.suggested_qty),
            notes: `Low stock: ${formatQty(item.on_hand)} on hand, minimum ${formatQty(item.min_level)}` });
        added++;
    });

    if (!$("pr_reason").value.trim() && added) $("pr_reason").value = `Restock ${low.warehouse_name} to its stock levels`;
    renderLines();

    const skipped = low.items.filter((i) => i.suggested_qty <= 0).length;
    showToast(added
        ? `Added ${added} low-stock item${added === 1 ? "" : "s"}. Check the quantities.${skipped ? ` ${skipped} other low item${skipped === 1 ? " is" : "s are"} already requested.` : ""}`
        : (low.items.length ? "Everything low here is already on an open request." : `Nothing in ${low.warehouse_name} is below its minimum.`), added ? "success" : "info");
}

async function save(submit) {
    $("prEditAlert").innerHTML = "";
    document.querySelectorAll("#prForm .form-error").forEach((el) => { el.textContent = ""; });

    let problems = 0;
    if (!$("pr_department_id").value) { $("err-pr_department_id").textContent = "Choose the department."; problems++; }
    if (submit && !$("pr_reason").value.trim()) { $("err-pr_reason").textContent = "Say what the items are needed for."; problems++; }
    if (submit && !lines.length) { $("err-pr_items").textContent = "Add the items needed."; problems++; }
    lines.forEach((l, i) => { if (!(Number(l.quantity) > 0)) { $(`err-pr_item_${i}_quantity`).textContent = "Enter how much."; problems++; } });

    if (problems) {
        showAlert("prEditAlert", "Please fix the highlighted fields.");
        return;
    }

    const payload = {
        department_id: $("pr_department_id").value,
        warehouse_id: $("pr_warehouse_id").value,
        needed_by: $("pr_needed_by").value,
        priority: $("pr_priority").value,
        reason: $("pr_reason").value.trim(),
        submit,
        items: lines.map((l) => ({ drug_id: l.drug_id, order_unit: l.order_unit, quantity: l.quantity, notes: l.notes }))
    };

    $("prSubmit").disabled = true;
    $("prSaveDraft").disabled = true;
    const result = editing ? await updateRequisition(editing.id, payload) : await createRequisition(payload);
    $("prSubmit").disabled = false;
    $("prSaveDraft").disabled = false;

    if (!result?.success) {
        const errors = result?.errors && typeof result.errors === "object" ? result.errors : null;
        if (errors) {
            Object.entries(errors).forEach(([name, message]) => {
                const m = name.match(/^items\.(\d+)\.(\w+)$/);
                const el = m ? $(`err-pr_item_${m[1]}_${m[2]}`) : $(`err-pr_${name}`);
                if (el) el.textContent = message;
            });
            showAlert("prEditAlert", "Nothing was saved. Please fix the highlighted fields.");
        } else {
            showAlert("prEditAlert", result?.message || "Failed to save the request.");
        }
        return;
    }

    showToast(result.message, "success");
    await openRequest(result.data.id);
}

/* ---------------------------------------------------------------
 * Detail
 * ------------------------------------------------------------- */

async function openRequest(id) {
    const result = await fetchRequisition(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the request.", "error");
        return;
    }

    const r = result.data;

    $("prDetail").innerHTML = `
        ${banner(r)}
        <div class="pr-card">
            <div class="pr-card-title">
                <span style="font-size:16px;text-transform:none;color:var(--text-primary);">${escapeHtml(r.pr_number)}
                    <span class="pr-badge ${r.status}">${STATUS_LABELS[r.status]}</span>${r.progress ? ` <span class="pr-badge ${r.progress}">${PROGRESS_LABELS[r.progress]}</span>` : ""}</span>
                <span class="pr-actions">
                    <button type="button" class="pr-btn" id="prPrintBtn">Print</button>
                    ${r.can_edit ? `<button type="button" class="pr-btn" id="prEditBtn">${r.status === "rejected" ? "Change & Resubmit" : "Edit"}</button>` : ""}
                    ${r.can_close ? `<button type="button" class="pr-btn" id="prCloseBtn" title="The rest won't be ordered">Close Request</button>` : ""}
                    ${r.can_cancel ? `<button type="button" class="pr-btn danger" id="prCancelBtn">Cancel Request</button>` : ""}
                </span>
            </div>
            <dl class="pr-info">${[
                ["Department", escapeHtml(r.department_name)],
                ["Deliver To", escapeHtml(r.warehouse_name || "—")],
                ["Needed By", r.needed_by ? `${formatDate(r.needed_by)}${r.is_overdue ? ` <span class="pr-badge overdue">Overdue</span>` : ""}` : "—"],
                ["Priority", r.priority === "urgent" ? `<span class="pr-badge urgent">Urgent</span>` : "Normal"],
                ["Requested By", escapeHtml(r.created_by_name || "—")],
                ["Approver", escapeHtml(r.approved_by_name || r.head_name || "Administrator (no department head set)")],
                ["Reason", escapeHtml(r.reason || "—")]
            ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="pr-card">
            <div class="pr-card-title"><span>Items</span>${r.progress ? `<span style="text-transform:none;">${r.percent_ordered}% ordered · ${r.percent_received}% received</span>` : ""}</div>
            <div class="pr-lines-wrap"><table class="pr-lines">
                <thead><tr><th>#</th><th>Item</th><th class="num">Requested</th><th class="num">Ordered</th><th class="num">Received</th><th class="num">Still to Order</th><th>Purchase Orders</th></tr></thead>
                <tbody>${r.items.map((i) => `
                    <tr>
                        <td>${i.line_no}</td>
                        <td><strong>${escapeHtml(i.drug_name)}</strong>${i.notes ? `<span class="pr-sub">${escapeHtml(i.notes)}</span>` : ""}</td>
                        <td class="num">${formatQty(i.quantity)} ${escapeHtml(lineUnit(i))}${i.order_unit === "package" ? `<span class="pr-sub">${formatQty(i.base_quantity)} ${escapeHtml(i.unit_name || "units")}</span>` : ""}</td>
                        <td class="num">${formatQty(i.ordered)}</td>
                        <td class="num">${formatQty(i.received)}</td>
                        <td class="num">${["approved"].includes(r.status) ? formatQty(i.outstanding) : "—"}</td>
                        <td>${i.orders.map((o) => `<span class="pr-chip" title="${escapeHtml(o.po_status)}">${escapeHtml(o.po_number)} · ${formatQty(o.ordered)}${o.received ? ` (${formatQty(o.received)} in)` : ""}</span>`).join("") || "—"}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            <p class="pr-sub" style="margin-top:8px;">Ordered and received are in ${escapeHtml(r.items[0]?.unit_name || "dispensing units")} (smallest unit).</p>
        </div>

        <div class="pr-card">
            <div class="pr-card-title">History</div>
            <ol class="pr-timeline">${(r.history || []).map((h) => `
                <li class="${h.action}"><strong>${HISTORY_LABELS[h.action] || escapeHtml(h.action)}</strong>${h.user_name ? ` by ${escapeHtml(h.user_name)}` : ""}
                    <span class="when">${escapeHtml(formatDateTime(h.created_at))}</span>${h.notes ? `<span class="note">&ldquo;${escapeHtml(h.notes)}&rdquo;</span>` : ""}</li>`).join("")}</ol>
        </div>`;

    $("prPrintBtn").addEventListener("click", () => printRequest(r));
    $("prEditBtn")?.addEventListener("click", () => openEditor(r));
    $("prApproveBtn")?.addEventListener("click", () => act(r, "approve"));
    $("prRejectBtn")?.addEventListener("click", () => act(r, "reject"));
    $("prCancelBtn")?.addEventListener("click", () => act(r, "cancel"));
    $("prCloseBtn")?.addEventListener("click", () => act(r, "close"));
    $("prOrderNowBtn")?.addEventListener("click", () => openOrderPanel(r.id));

    showPanel("detail");
}

function banner(r) {
    if (r.status === "submitted") {
        return `<div class="pr-banner submitted"><div><strong>Waiting for approval</strong>
            <span>${r.can_approve ? "Check what's being asked for, then approve or reject it." : escapeHtml(r.approval_blocker || "")}</span></div>
            ${r.can_approve ? `<div class="pr-actions"><button type="button" class="pr-btn" id="prRejectBtn">Reject</button><button type="button" class="pr-btn success" id="prApproveBtn">Approve</button></div>` : ""}</div>`;
    }

    if (r.status === "approved") {
        const done = ["ordered", "received", "partially_received"].includes(r.progress);
        return `<div class="pr-banner ${r.progress === "received" ? "done" : "approved"}"><div><strong>${r.progress === "received" ? "Everything has been received" : `Approved · ${PROGRESS_LABELS[r.progress]}`}</strong>
            <span>${done ? "Purchasing has ordered everything on this request." : "Purchasing orders it from suppliers under Order from Requests."}</span></div>
            ${r.can_order ? `<div class="pr-actions"><button type="button" class="pr-btn primary" id="prOrderNowBtn">Order This Request</button></div>` : ""}</div>`;
    }

    const text = {
        draft: ["Draft", "Not submitted yet."],
        rejected: ["Rejected", `“${escapeHtml(r.rejection_reason || "")}”`],
        cancelled: ["Cancelled", `“${escapeHtml(r.cancel_reason || "")}”`],
        closed: ["Closed", `The rest won't be ordered: “${escapeHtml(r.close_reason || "")}”`]
    }[r.status];

    return `<div class="pr-banner ${r.status === "cancelled" ? "cancelled" : r.status === "rejected" ? "rejected" : ""}"><div><strong>${text[0]}</strong><span>${text[1]}</span></div></div>`;
}

async function act(r, name) {
    const summary = `<dl class="pr-dialog-summary"><dt>Department</dt><dd>${escapeHtml(r.department_name)}</dd><dt>Items</dt><dd>${r.items.length}</dd><dt>Requested by</dt><dd>${escapeHtml(r.created_by_name || "")}</dd></dl>`;
    const textBox = (label, required) => `${summary}<label for="prDlgText">${label}${required ? `<span style="color:#dc2626;">*</span>` : ""}</label><textarea id="prDlgText" maxlength="500"></textarea><span class="form-error" id="err-pr_dlg"></span>`;
    const need = (msg) => () => $("prDlgText").value.trim() ? null : msg;

    const config = {
        approve: { title: `Approve ${r.pr_number}?`, body: textBox("Notes (optional)", false), okLabel: "Approve", okClass: "success",
            run: () => requisitionAction("approve", r.id, { notes: $("prDlgText").value.trim() }) },
        reject: { title: `Reject ${r.pr_number}?`, body: textBox("Reason", true), okLabel: "Reject", okClass: "danger solid", check: need("Say why."),
            run: () => requisitionAction("reject", r.id, { reason: $("prDlgText").value.trim() }) },
        cancel: { title: `Cancel ${r.pr_number}?`, body: textBox("Reason", true), okLabel: "Cancel Request", okClass: "danger solid", check: need("Say why."),
            run: () => requisitionAction("cancel", r.id, { reason: $("prDlgText").value.trim() }) },
        close: { title: `Close ${r.pr_number}?`, body: `${textBox("Why won't the rest be ordered?", true)}<p>What's already on purchase orders stays; nothing more is ordered for this request.</p>`,
            okLabel: "Close Request", okClass: "primary", check: need("Say why."),
            run: () => requisitionAction("close", r.id, { reason: $("prDlgText").value.trim() }) }
    }[name];

    if (await openDialog(config)) await openRequest(r.id);
}

/* ---------------------------------------------------------------
 * Order from requests (purchasing)
 * ------------------------------------------------------------- */

async function openOrderPanel(onlyRequestId = null) {
    $("prOrderAlert").innerHTML = "";
    $("prOrderBody").innerHTML = `<div class="pr-empty">Loading...</div>`;
    showPanel("order");

    const result = await fetchOutstanding();

    if (!result?.success) {
        $("prOrderBody").innerHTML = `<div class="pr-empty">${escapeHtml(result?.message || "Couldn't load the approved requests.")}</div>`;
        return;
    }

    outstanding = result.data;
    picks = {};
    outstanding.lines.forEach((l) => {
        picks[l.requisition_item_id] = {
            checked: onlyRequestId ? l.requisition_id === onlyRequestId : false,
            quantity: String(l.outstanding),
            supplier_id: String(defaultSupplier(l) || "")
        };
    });

    renderOrderPanel();
}

function listingsFor(drugId) {
    return outstanding.listings.filter((l) => l.drug_id === drugId)
        .sort((a, b) => (a.effective_unit_price ?? Infinity) - (b.effective_unit_price ?? Infinity));
}

/** The item's preferred supplier, else the cheapest supplier price on file. */
function defaultSupplier(line) {
    const listings = listingsFor(line.drug_id);
    if (line.preferred_supplier_id && outstanding.suppliers.some((s) => s.id === line.preferred_supplier_id)) return line.preferred_supplier_id;
    return listings[0]?.supplier_id || null;
}

function renderOrderPanel() {
    if (!outstanding.lines.length) {
        $("prOrderBody").innerHTML = `<div class="pr-empty">Nothing to order: every approved request is already on a purchase order.</div>`;
        return;
    }

    $("prOrderBody").innerHTML = `
        <div class="pr-table-wrap">
            <table class="pr-table">
                <thead><tr><th style="width:30px;"><input type="checkbox" id="prPickAll" aria-label="Select all"></th><th>Request</th><th>Item</th><th class="num">Still to Order</th><th>Order Qty</th><th>Supplier</th><th class="num">Est. Cost</th></tr></thead>
                <tbody>${outstanding.lines.map((l) => {
                    const pick = picks[l.requisition_item_id];
                    const listings = listingsFor(l.drug_id);
                    const listed = new Set(listings.map((x) => x.supplier_id));
                    return `
                    <tr data-pr-pick="${l.requisition_item_id}">
                        <td><input type="checkbox" data-field="checked" ${pick.checked ? "checked" : ""} aria-label="Order this line"></td>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(l.pr_number)}</strong>${l.priority === "urgent" ? ` <span class="pr-badge urgent">Urgent</span>` : ""}
                            <span class="pr-sub">${escapeHtml(l.department_name)}${l.needed_by ? ` · by ${formatDate(l.needed_by)}` : ""}</span>
                            <span class="pr-sub">to ${escapeHtml(l.warehouse_name || "location not set")}</span></td>
                        <td><strong>${escapeHtml(l.drug_name)}</strong>${l.notes ? `<span class="pr-sub">${escapeHtml(l.notes)}</span>` : ""}</td>
                        <td class="num">${formatQty(l.outstanding)} ${escapeHtml(l.unit_name || "units")}<span class="pr-sub">of ${formatQty(l.requested)}</span></td>
                        <td><input type="number" min="0" step="any" data-field="quantity" value="${escapeHtml(pick.quantity)}" aria-label="Quantity to order">
                            <span class="pr-sub">${escapeHtml(l.unit_name || "units")}</span><span class="form-error" data-err="quantity"></span></td>
                        <td><select data-field="supplier_id" aria-label="Supplier">
                            <option value="">-- Supplier --</option>
                            ${listings.length ? `<optgroup label="With a price on file">${listings.map((x) => `<option value="${x.supplier_id}" ${pick.supplier_id === String(x.supplier_id) ? "selected" : ""}>${escapeHtml(x.supplier_name)} — ${formatMoney(x.effective_unit_price ?? 0, 4)}/${escapeHtml(l.unit_name || "unit")}</option>`).join("")}</optgroup>` : ""}
                            <optgroup label="${listings.length ? "Other suppliers" : "Suppliers"}">${outstanding.suppliers.filter((s) => !listed.has(s.id)).map((s) => `<option value="${s.id}" ${pick.supplier_id === String(s.id) ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}</optgroup>
                        </select><span class="form-error" data-err="supplier_id"></span></td>
                        <td class="num" data-cell="cost"></td>
                    </tr>`;
                }).join("")}</tbody>
            </table>
        </div>
        <div class="pr-selbar" id="prOrderBar">
            <span id="prOrderSummary"></span>
            <button type="button" class="pr-btn primary" id="prCreatePos">Create Purchase Orders</button>
        </div>`;

    const body = $("prOrderBody");
    body.oninput = onPickChange;
    body.onchange = onPickChange;
    $("prPickAll").addEventListener("change", (event) => {
        Object.values(picks).forEach((p) => { p.checked = event.target.checked; });
        renderOrderPanel();
    });
    $("prCreatePos").addEventListener("click", createOrders);
    refreshOrderSummary();
}

function onPickChange(event) {
    const tr = event.target.closest("[data-pr-pick]");
    const field = event.target.dataset.field;
    if (!tr || !field) return;
    const pick = picks[Number(tr.dataset.prPick)];
    pick[field] = field === "checked" ? event.target.checked : event.target.value;
    tr.querySelectorAll(".form-error").forEach((el) => { el.textContent = ""; });
    refreshOrderSummary();
}

function estimate(line, pick) {
    const listing = outstanding.listings.find((x) => x.drug_id === line.drug_id && String(x.supplier_id) === pick.supplier_id);
    const unit = listing?.effective_unit_price ?? line.unit_cost;
    return unit != null ? (Number(pick.quantity) || 0) * unit : null;
}

function refreshOrderSummary() {
    const chosen = outstanding.lines.filter((l) => picks[l.requisition_item_id].checked);
    const groups = new Set(chosen.map((l) => `${picks[l.requisition_item_id].supplier_id}|${l.warehouse_id || 0}`));
    let total = 0;

    outstanding.lines.forEach((l) => {
        const cost = estimate(l, picks[l.requisition_item_id]);
        const cell = document.querySelector(`[data-pr-pick="${l.requisition_item_id}"] [data-cell="cost"]`);
        if (cell) cell.textContent = cost != null ? formatMoney(cost) : "—";
        if (picks[l.requisition_item_id].checked && cost) total += cost;
    });

    $("prOrderSummary").innerHTML = chosen.length
        ? `<strong>${chosen.length}</strong> line${chosen.length === 1 ? "" : "s"} selected · about <strong>${formatMoney(total)}</strong> before VAT · makes <strong>${groups.size}</strong> draft purchase order${groups.size === 1 ? "" : "s"}`
        : "Tick the lines to order.";
    $("prCreatePos").disabled = !chosen.length;
}

async function createOrders() {
    $("prOrderAlert").innerHTML = "";
    const chosen = outstanding.lines.filter((l) => picks[l.requisition_item_id].checked);
    let problems = 0;

    chosen.forEach((l) => {
        const pick = picks[l.requisition_item_id];
        const row = document.querySelector(`[data-pr-pick="${l.requisition_item_id}"]`);
        if (!(Number(pick.quantity) > 0)) { row.querySelector('[data-err="quantity"]').textContent = "Enter a quantity."; problems++; }
        else if (Number(pick.quantity) > l.outstanding + 0.0005) { row.querySelector('[data-err="quantity"]').textContent = `Only ${formatQty(l.outstanding)} to order.`; problems++; }
        if (!pick.supplier_id) { row.querySelector('[data-err="supplier_id"]').textContent = "Choose a supplier."; problems++; }
    });

    if (problems) {
        showAlert("prOrderAlert", "Please fix the highlighted lines.");
        return;
    }

    const payload = chosen.map((l) => ({ requisition_item_id: l.requisition_item_id, quantity: picks[l.requisition_item_id].quantity, supplier_id: picks[l.requisition_item_id].supplier_id }));
    const groups = new Set(chosen.map((l) => `${picks[l.requisition_item_id].supplier_id}|${l.warehouse_id || 0}`)).size;

    const confirmed = await openDialog({
        title: `Create ${groups} draft purchase order${groups === 1 ? "" : "s"}?`,
        body: `<p>${chosen.length} request line${chosen.length === 1 ? "" : "s"} go on draft orders, one per supplier and delivery location, priced from Supplier Prices. Nothing is sent to suppliers yet — open each draft under Purchase Orders, check it, and submit it for approval.</p>`,
        okLabel: "Create Drafts", okClass: "primary",
        run: () => convertRequisitions(payload)
    });

    if (!confirmed) return;
    await openOrderPanel();
    $("prOrderAlert").innerHTML = `<div class="form-alert success">Draft purchase orders created. Find them under Pharmacy &gt; Purchase Orders (status Draft).
        <button type="button" class="pr-btn small" id="prGoPos" style="margin-left:8px;">Open Purchase Orders</button></div>`;
    $("prGoPos").addEventListener("click", () => window.__openDashboardTab?.("pharmacy_purchase_orders", "Purchase Orders"));
}

/* ---------------------------------------------------------------
 * Dialog, print, helpers
 * ------------------------------------------------------------- */

function openDialog({ title, body, okLabel, okClass = "primary", check = null, run }) {
    return new Promise((resolve) => {
        const overlay = $("prDialogOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("prDialogOk").onclick = null;
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("prDialogTitle").textContent = title;
        $("prDialogBody").innerHTML = body;
        $("prDialogAlert").innerHTML = "";
        $("prDialogOk").textContent = okLabel;
        $("prDialogOk").className = `pr-btn ${okClass}`;

        $("prDialogOk").onclick = async () => {
            const problem = check?.();
            if (problem) {
                $("err-pr_dlg").textContent = problem;
                return;
            }

            $("prDialogOk").disabled = true;
            const result = await run();
            $("prDialogOk").disabled = false;

            if (!result?.success) {
                const first = result?.errors && Object.values(result.errors)[0];
                if (first && $("err-pr_dlg")) $("err-pr_dlg").textContent = first;
                $("prDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message === "Validation failed." && first ? first : (result?.message || "Something went wrong."))}</div>`;
                return;
            }

            if (result.message) showToast(result.message, "success");
            finish(true);
        };

        $("prDialogClose").onclick = () => finish(false);
        $("prDialogCancel").onclick = () => finish(false);
        overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
        document.addEventListener("keydown", onKey);
        overlay.classList.add("open");
        ($("prDialogBody").querySelector("textarea") || $("prDialogOk")).focus();
    });
}

function printRequest(r) {
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(r.pr_number)} - Purchase Request</title>
<style>
    @page { size: A4 portrait; margin: 14mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0; padding: 24px; }
    h1 { margin: 0; font-size: 20px; letter-spacing: 1px; } .muted { color: #4b5563; }
    .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; margin-bottom: 14px; }
    .meta div { padding: 8px 10px; border-right: 1px solid #d1d5db; } .meta div:last-child { border-right: none; }
    .meta span { display: block; font-size: 10px; text-transform: uppercase; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; } th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; padding: 6px; border: 1px solid #d1d5db; }
    td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; } .num { text-align: right; }
    .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 56px; }
    .signs div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 11px; color: #4b5563; }
</style></head><body>
<div class="head"><div><h1>PURCHASE REQUEST</h1><div class="muted">${escapeHtml(r.reason || "")}</div></div>
    <div style="text-align:right;"><strong>${escapeHtml(r.pr_number)}</strong><div class="muted">${formatDate(String(r.created_at).slice(0, 10))} · ${STATUS_LABELS[r.status]}</div>${r.priority === "urgent" ? "<div><strong>URGENT</strong></div>" : ""}</div></div>
<div class="meta">
    <div><span>Department</span>${escapeHtml(r.department_name)}</div>
    <div><span>Deliver To</span>${escapeHtml(r.warehouse_name || "—")}</div>
    <div><span>Needed By</span>${r.needed_by ? formatDate(r.needed_by) : "—"}</div>
    <div><span>Requested By</span>${escapeHtml(r.created_by_name || "")}</div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th class="num">Quantity</th><th>Notes</th><th class="num">Ordered</th><th class="num">Received</th></tr></thead>
<tbody>${r.items.map((i) => `<tr><td>${i.line_no}</td><td>${escapeHtml(i.drug_name)}</td><td class="num">${formatQty(i.quantity)} ${escapeHtml(lineUnit(i))}</td>
    <td>${escapeHtml(i.notes || "")}</td><td class="num">${formatQty(i.ordered)}</td><td class="num">${formatQty(i.received)}</td></tr>`).join("")}</tbody></table>
<div class="signs">
    <div>${escapeHtml(r.created_by_name || "")}<br>Requested by</div>
    <div>${escapeHtml(r.approved_by_name || "")}<br>Approved by (Department Head)</div>
    <div>Received by (Purchasing)</div>
</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body></html>`);
    win.document.close();
}

function lineUnit(item) {
    return item.order_unit === "package" ? (item.package_unit_name || "package") : (item.unit_name || "unit");
}

function capitalize(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function showAlert(id, message) {
    $(id).innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    $(id).scrollIntoView({ block: "nearest" });
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
