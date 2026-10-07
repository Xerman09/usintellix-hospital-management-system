import {
    fetchOrderOptions, searchOrderDrugs, checkOrder, createOrder, fetchAdmissionOrders, fetchVerificationQueue,
    verifyOrder, rejectOrder, discontinueOrder,
} from "./med-orders.service.js?v=1";
import { getUser } from "../../core/session.js?v=2";
import { showToast } from "../../core/toast.js";
import { systemNow, toDateTimeInput } from "../../core/timezone.js";

/*
 * Inpatient medicine orders.
 *  - openMedOrders(admissionId): the patient's orders, a new-order form with live allergy /
 *    duplicate checks, stop / re-order. Opened from the chart, the vital-signs board, the queue.
 *  - Verification queue (tab "med_verification"): the pharmacist verifies or rejects.
 */

const $ = (id) => document.getElementById(id);
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmt(dt) {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return "";
    const h = Number(m[4]);
    return `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
}
const role = () => getUser()?.role || "";
const canOrder = () => ["admin", "doctor"].includes(role());
const canVerify = () => ["admin", "pharmacist"].includes(role());

const STATE = {
    pending: ["wait", "⏳ Waiting for pharmacy"], active: ["ok", "✓ Active"], ended: ["off", "Ended"],
    rejected: ["bad", "✕ Rejected"], discontinued: ["off", "Stopped"],
};
const WARN_ICON = { block: "⛔", warn: "⚠", info: "ℹ" };

export function warningsHtml(list, { compact = false } = {}) {
    if (!list?.length) return compact ? "" : `<div class="mox-ok">✓ No allergy or duplicate warnings.</div>`;
    return `<ul class="mox-warns">${list.map((w) => `<li class="${w.severity}">${WARN_ICON[w.severity] || ""} ${esc(w.message)}</li>`).join("")}</ul>`;
}

const CSS = `
#moxOverlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4100; display: none; align-items: flex-start; justify-content: center; padding: 4vh 16px 16px; overflow-y: auto; }
#moxOverlay.open { display: flex; }
#moxModal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 900px; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.3); font-size: 13.5px; }
.mox-head { display: flex; justify-content: space-between; gap: 10px; padding: 16px 20px 6px; }
.mox-head h2 { margin: 0; font-size: 18px; }
.mox-x { border: 0; background: none; color: var(--text-muted); font-size: 22px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 6px; }
.mox-x:hover { background: var(--bg-surface-alt); color: var(--text-primary); }
.mox-body { padding: 4px 20px 16px; }
.mox-sub { color: var(--text-muted); font-size: 12px; }
.mox-allergies { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 6px 0 12px; }
.mox-allergy { background: #fee2e2; color: #991b1b; border-radius: 10px; padding: 2px 9px; font-size: 12px; font-weight: 700; }
:root[data-theme="dark"] .mox-allergy { background: #7f1d1d; color: #fecaca; }
.mox-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.mox-btn:hover { background: var(--bg-surface-alt); }
.mox-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.mox-btn.primary:hover { background: var(--accent-hover); }
.mox-btn.danger { color: #b91c1c; }
.mox-btn.small { padding: 4px 9px; font-size: 12px; }
.mox-btn:disabled { opacity: .55; cursor: default; }
.mox-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.mox-section { margin-top: 14px; }
.mox-section h3 { font-size: 13px; margin: 0 0 6px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .03em; }
.mox-order { border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
.mox-order.wait { border-left: 4px solid #f59e0b; }
.mox-order.ok { border-left: 4px solid #16a34a; }
.mox-order.bad, .mox-order.off { opacity: .8; }
.mox-order-top { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
.mox-drug { font-weight: 700; font-size: 14px; }
.mox-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.mox-pill.wait { background: #fef3c7; color: #92400e; }
.mox-pill.ok { background: #dcfce7; color: #166534; }
.mox-pill.bad { background: #fee2e2; color: #991b1b; }
.mox-pill.off { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.mox-pill.stat { background: #dc2626; color: #fff; }
.mox-pill.tag { background: var(--accent-lighter); color: var(--accent-text); }
:root[data-theme="dark"] .mox-pill.wait { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .mox-pill.ok { background: #14532d; color: #bbf7d0; }
:root[data-theme="dark"] .mox-pill.bad { background: #7f1d1d; color: #fecaca; }
.mox-meta { color: var(--text-muted); font-size: 12px; margin-top: 4px; line-height: 1.5; }
.mox-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.mox-warns { list-style: none; margin: 6px 0 0; padding: 0; font-size: 12.5px; }
.mox-warns li { padding: 5px 8px; border-radius: 6px; margin-bottom: 4px; }
.mox-warns li.block { background: #fee2e2; color: #991b1b; font-weight: 600; }
.mox-warns li.warn { background: #fef3c7; color: #92400e; }
.mox-warns li.info { background: var(--bg-surface-alt); color: var(--text-muted); }
:root[data-theme="dark"] .mox-warns li.block { background: #7f1d1d; color: #fecaca; }
:root[data-theme="dark"] .mox-warns li.warn { background: #78350f; color: #fde68a; }
.mox-ok { color: #15803d; font-size: 12.5px; margin-top: 6px; }
:root[data-theme="dark"] .mox-ok { color: #86efac; }
.mox-inline { margin-top: 8px; padding: 10px; background: var(--bg-surface-alt); border-radius: 8px; display: grid; gap: 8px; }
.mox-inline input, .mox-inline textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
.mox-form { border: 1px solid var(--accent-border); border-radius: 12px; padding: 14px; margin-top: 10px; background: var(--bg-surface); }
.mox-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 12px; }
.mox-grid .span2 { grid-column: span 2; }
.mox-grid .full { grid-column: 1 / -1; }
@media (max-width: 720px) { .mox-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .mox-grid .span2 { grid-column: 1 / -1; } }
.mox-form label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.mox-form input, .mox-form select, .mox-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.mox-form [aria-invalid="true"] { border-color: #dc2626; }
.mox-types { display: flex; gap: 8px; flex-wrap: wrap; }
.mox-types label { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 12px; cursor: pointer; margin: 0; color: var(--text-primary); }
.mox-types input { width: auto; margin: 0; }
.mox-types label:has(input:checked) { border-color: var(--accent); background: var(--accent-light); }
.mox-err { color: #dc2626; font-size: 12px; margin-top: 3px; }
.mox-results { border: 1px solid var(--border-color); border-radius: 8px; margin-top: 4px; max-height: 220px; overflow-y: auto; background: var(--bg-surface); }
.mox-results button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--border-color); background: none; color: var(--text-primary); padding: 7px 10px; cursor: pointer; font: inherit; font-size: 13px; }
.mox-results button:hover, .mox-results button:focus-visible { background: var(--bg-surface-alt); outline: none; }
.mox-picked { display: flex; justify-content: space-between; gap: 8px; align-items: center; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 10px; }
.mox-check { display: flex; gap: 8px; align-items: flex-start; font-weight: 600; }
.mox-check input { width: auto; margin-top: 3px; }
.mox-trail { margin: 6px 0 0; padding-left: 18px; font-size: 12px; color: var(--text-muted); }
.mox-empty { color: var(--text-muted); padding: 8px 0; }
`;

function ensureRoot() {
    if (!$("mox-style")) {
        const st = document.createElement("style");
        st.id = "mox-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    let root = $("moxOverlay");
    if (!root) {
        root = document.createElement("div");
        root.id = "moxOverlay";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-labelledby", "moxTitle");
        root.innerHTML = `<div id="moxModal"></div>`;
        root.addEventListener("click", (e) => {
            if (e.target === root) close();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && root.classList.contains("open")) close();
        });
        document.body.appendChild(root);
    }
    return root;
}
export function ensureMedOrderStyles() {
    ensureRoot();
}
function close() {
    $("moxOverlay")?.classList.remove("open");
}

let options = null;
async function loadOptions() {
    if (!options) {
        const r = await fetchOrderOptions().catch(() => null);
        if (r?.success) options = r.data;
    }
    return options;
}

/* ---------------- an order card ---------------- */

function orderCard(o, { actions = true } = {}) {
    const [cls, label] = STATE[o.state] || STATE.pending;
    const when = o.order_type === "scheduled" ? `at ${o.admin_times.join(", ")}` : o.order_type === "prn"
        ? [o.prn_min_hours ? `at least ${o.prn_min_hours} h apart` : "", o.prn_max_per_day ? `max ${o.prn_max_per_day} in 24 h` : ""].filter(Boolean).join(", ") : "";
    return `<div class="mox-order ${cls}" data-order="${o.id}">
        <div class="mox-order-top">
            <div><div class="mox-drug">${esc(o.drug_name)}</div>
                <div>${esc(`${o.dose_text} ${o.dose_unit} · ${o.route_label} · ${o.how}`)}${when ? ` <span class="mox-sub">(${esc(when)})</span>` : ""}</div></div>
            <div style="display:flex;gap:4px;flex-wrap:wrap">${o.is_stat ? `<span class="mox-pill stat">STAT</span>` : ""}${o.high_alert ? `<span class="mox-pill tag">High-alert</span>` : ""}${o.controlled ? `<span class="mox-pill tag">Controlled</span>` : ""}<span class="mox-pill ${cls}">${label}</span></div>
        </div>
        <div class="mox-meta">
            ${o.order_type !== "once" ? `From ${esc(fmt(o.start_at))}${o.stop_at ? ` to ${esc(fmt(o.stop_at))}` : " · no stop date"}` : `Give ${esc(fmt(o.start_at))}`}
            ${o.instructions ? `<br>Instructions: ${esc(o.instructions)}` : ""}
            <br>Ordered by ${esc(o.ordered_by_name || "—")} · ${esc(fmt(o.ordered_at))}${o.doctor_ack_reason ? ` · allergy reason: ${esc(o.doctor_ack_reason)}` : ""}
            ${o.verified_at && o.status === "verified" ? `<br>Verified by ${esc(o.verified_by_name)} · ${esc(fmt(o.verified_at))}${o.verify_note ? ` — ${esc(o.verify_note)}` : ""}` : ""}
            ${o.status === "rejected" ? `<br><strong>Rejected</strong> by ${esc(o.verified_by_name)} · ${esc(fmt(o.verified_at))}: ${esc(o.rejected_reason)}` : ""}
            ${o.status === "discontinued" ? `<br><strong>Stopped</strong> by ${esc(o.discontinued_by_name)} · ${esc(fmt(o.discontinued_at))}: ${esc(o.discontinue_reason)}` : ""}
        </div>
        ${o.checks?.length && ["pending", "active"].includes(o.state) ? warningsHtml(o.checks, { compact: true }) : ""}
        ${actions ? `<div class="mox-actions">
            ${canOrder() && ["pending", "active"].includes(o.state) ? `<button type="button" class="mox-btn small danger" data-stop="${o.id}">Stop</button>` : ""}
            ${canOrder() ? `<button type="button" class="mox-btn small" data-reorder="${o.id}">Re-order</button>` : ""}
            ${canVerify() && o.state === "pending" ? `<button type="button" class="mox-btn small primary" data-verify="${o.id}">Verify…</button>` : ""}
        </div>` : ""}
    </div>`;
}

/* ---------------- the patient's orders ---------------- */

let current = null;   // { admissionId, data, onChange }

export async function openMedOrders(admissionId, { onChange = null, newOrder = false } = {}) {
    ensureRoot().classList.add("open");
    current = { admissionId, data: null, onChange };
    $("moxModal").innerHTML = `<div class="mox-body" style="padding:24px">Loading…</div>`;
    const [res] = await Promise.all([fetchAdmissionOrders(admissionId).catch(() => null), loadOptions()]);
    if (!res?.success) {
        $("moxModal").innerHTML = `<div class="mox-head"><h2 id="moxTitle">Medicine orders</h2><button type="button" class="mox-x" data-close aria-label="Close">×</button></div>
            <div class="mox-body"><p>${esc(res?.message || "Could not load the orders.")}</p></div>`;
        $("moxModal").querySelector("[data-close]").onclick = close;
        return;
    }
    current.data = res.data;
    renderOrders();
    if (newOrder && canOrder() && res.data.admission.active) showForm();
}

function renderOrders() {
    const { admission: a, allergies, orders } = current.data;
    const group = (states) => orders.filter((o) => states.includes(o.state));
    const pending = group(["pending"]), active = group(["active"]), old = group(["rejected", "discontinued", "ended"]);
    $("moxModal").innerHTML = `
        <div class="mox-head"><div><h2 id="moxTitle">Medicine orders · ${esc(a.patient_name)}</h2>
            <div class="mox-sub">${esc([a.ward, `${a.room} · Bed ${a.bed}`, a.age ? `${a.age}y` : "", a.sex].filter(Boolean).join(" · "))}${a.active ? "" : " · discharged"}</div></div>
            <div style="display:flex;gap:6px;align-items:flex-start"><button type="button" class="mox-btn small" data-mar>MAR</button>
            <button type="button" class="mox-x" data-close aria-label="Close">×</button></div></div>
        <div class="mox-body">
            <div class="mox-allergies"><strong>Allergies:</strong> ${allergies.length ? allergies.map((al) => `<span class="mox-allergy">${esc(al.name)}${al.reaction ? ` — ${esc(al.reaction)}` : ""}</span>`).join("") : `<span class="mox-sub">No known allergies recorded</span>`}</div>
            ${canOrder() && a.active ? `<button type="button" class="mox-btn primary" id="moxNew">+ New order</button>` : ""}
            <div id="moxFormBox"></div>
            <div class="mox-section"><h3>Waiting for pharmacy (${pending.length})</h3>${pending.length ? pending.map((o) => orderCard(o)).join("") : `<div class="mox-empty">None.</div>`}</div>
            <div class="mox-section"><h3>Active (${active.length})</h3>${active.length ? active.map((o) => orderCard(o)).join("") : `<div class="mox-empty">No active medicine orders.</div>`}</div>
            ${old.length ? `<details class="mox-section"><summary class="mox-sub" style="cursor:pointer">Stopped, rejected and ended (${old.length})</summary>${old.map((o) => orderCard(o)).join("")}</details>` : ""}
        </div>`;
    const m = $("moxModal");
    m.querySelector("[data-close]").onclick = close;
    m.querySelector("[data-mar]").onclick = () => {
        const id = current.admissionId;
        close();
        import("../mar/mar.js?v=5").then((x) => x.openMar(id));
    };
    if ($("moxNew")) $("moxNew").onclick = () => showForm();
    m.onclick = (e) => {
        const stop = e.target.closest("[data-stop]")?.dataset.stop;
        const re = e.target.closest("[data-reorder]")?.dataset.reorder;
        const ver = e.target.closest("[data-verify]")?.dataset.verify;
        if (stop) inlineReason(e.target.closest(".mox-order"), "Why stop this order?", "Stop order", async (reason) => {
            const r = await discontinueOrder(Number(stop), reason).catch(() => null);
            if (r?.success) refresh(r.message);
            return r;
        });
        else if (re) showForm(current.data.orders.find((o) => o.id === Number(re)));
        else if (ver) verifyPanel(e.target.closest(".mox-order"), current.data.orders.find((o) => o.id === Number(ver)), () => refresh());
    };
}

async function refresh(message) {
    if (message) showToast(message);
    current.onChange?.();
    const res = await fetchAdmissionOrders(current.admissionId).catch(() => null);
    if (res?.success) {
        current.data = res.data;
        renderOrders();
    }
}

/** A small "why?" box under a card (no browser dialogs). */
function inlineReason(card, label, button, submit) {
    if (card.querySelector(".mox-inline")) return;
    card.insertAdjacentHTML("beforeend", `<div class="mox-inline"><label class="mox-sub">${esc(label)}</label><input maxlength="255">
        <div style="display:flex;gap:6px"><button type="button" class="mox-btn small primary">${esc(button)}</button><button type="button" class="mox-btn small">Cancel</button></div><div class="mox-err"></div></div>`);
    const box = card.querySelector(".mox-inline");
    const [go, cancel] = box.querySelectorAll("button");
    box.querySelector("input").focus();
    cancel.onclick = () => box.remove();
    go.onclick = async () => {
        const reason = box.querySelector("input").value.trim();
        if (!reason) {
            box.querySelector(".mox-err").textContent = "Give a reason.";
            return;
        }
        go.disabled = true;
        const r = await submit(reason);
        go.disabled = false;
        if (!r?.success) box.querySelector(".mox-err").textContent = r?.message || "Could not save.";
    };
}

/* ---------------- verify (pharmacist) ---------------- */

/** Verify / reject panel under an order card. `order.warnings_now` (queue) or `order.checks`. */
function verifyPanel(card, order, done) {
    if (card.querySelector(".mox-inline")) return;
    const warns = order.warnings_now || order.checks || [];
    const block = warns.some((w) => w.severity === "block");
    const needAck = warns.some((w) => w.severity !== "info");
    card.insertAdjacentHTML("beforeend", `<div class="mox-inline">
        <strong>Checks now</strong>${warningsHtml(warns)}
        ${needAck ? `<label class="mox-check"><input type="checkbox" data-v="ack"> I have reviewed these warnings</label>` : ""}
        ${block ? `<label class="mox-sub">Allergy override — why is it safe to give? (required)</label><input data-v="reason" maxlength="255">` : ""}
        <label class="mox-sub">Note (optional)</label><input data-v="note" maxlength="255">
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="mox-btn small primary" data-v="go">Verify</button>
            <button type="button" class="mox-btn small danger" data-v="reject">Reject…</button><button type="button" class="mox-btn small" data-v="cancel">Cancel</button></div>
        <div class="mox-err"></div></div>`);
    const box = card.querySelector(".mox-inline");
    const q = (k) => box.querySelector(`[data-v="${k}"]`);
    q("cancel").onclick = () => box.remove();
    q("go").onclick = async () => {
        if (needAck && !q("ack").checked) {
            box.querySelector(".mox-err").textContent = "Tick that you reviewed the warnings.";
            return;
        }
        if (block && !q("reason").value.trim()) {
            box.querySelector(".mox-err").textContent = "Give the allergy override reason, or reject the order.";
            q("reason").focus();
            return;
        }
        q("go").disabled = true;
        const r = await verifyOrder(order.id, { acknowledge: needAck ? 1 : 0, override_reason: block ? q("reason").value.trim() : "", note: q("note").value.trim() }).catch(() => null);
        q("go").disabled = false;
        if (!r?.success) {
            // New warnings since the list was loaded: show them.
            if (r?.warnings) {
                box.remove();
                verifyPanel(card, { ...order, warnings_now: r.warnings }, done);
                card.querySelector(".mox-err").textContent = r.message;
                return;
            }
            box.querySelector(".mox-err").textContent = r?.message || "Could not verify.";
            return;
        }
        showToast(order.is_stat ? "Verified. The patient's nurse was told to give it now." : "Order verified.");
        done();
    };
    q("reject").onclick = () => {
        box.remove();
        inlineReason(card, "Why reject it? The doctor will see this.", "Reject order", async (reason) => {
            const r = await rejectOrder(order.id, reason).catch(() => null);
            if (r?.success) {
                showToast(r.message);
                done();
            }
            return r;
        });
    };
}

/* ---------------- new order form ---------------- */

const ROUTE_GUESS = [[/inject|infusion|\biv\b|vial|ampul/i, "IV"], [/inhaler|metered/i, "INH"], [/nebule|nebul/i, "NEB"], [/cream|ointment|gel\b|lotion/i, "TOP"],
    [/eye drop|ophthalmic/i, "OPH"], [/ear drop|otic/i, "OT"], [/suppositor/i, "PR"], [/patch/i, "TD"], [/tablet|capsule|syrup|suspension|sachet|softgel/i, "PO"]];

function showForm(copyFrom = null) {
    const box = $("moxFormBox");
    if (!box || !options) return;
    const now = toDateTimeInput(systemNow());
    const f = copyFrom || {};
    const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === sel ? "selected" : ""}>${esc(typeof v === "string" ? v : v.label)}</option>`).join("");
    box.innerHTML = `<form class="mox-form" id="moxForm" novalidate>
        <div class="mox-grid">
            <div class="full"><label for="moxDrugQ">Medicine</label><div id="moxDrugBox"></div><div class="mox-err" data-err="drug_id"></div></div>
            <div class="full" id="moxChecks"></div>
            <div><label for="moxDose">Dose</label><input id="moxDose" inputmode="decimal" value="${esc(f.dose_text ?? "")}"><div class="mox-err" data-err="dose"></div></div>
            <div><label for="moxUnit">Unit</label><select id="moxUnit"><option value="">—</option>${options.units.map((u) => `<option ${u === f.dose_unit ? "selected" : ""}>${u}</option>`).join("")}</select><div class="mox-err" data-err="dose_unit"></div></div>
            <div class="span2"><label for="moxRoute">Route</label><select id="moxRoute"><option value="">—</option>${opt(options.routes, f.route)}</select><div class="mox-err" data-err="route"></div></div>
            <div class="full"><label>Type</label><div class="mox-types" role="radiogroup" aria-label="Order type">
                <label><input type="radio" name="moxType" value="scheduled" ${!f.order_type || f.order_type === "scheduled" ? "checked" : ""}> Scheduled</label>
                <label><input type="radio" name="moxType" value="prn" ${f.order_type === "prn" ? "checked" : ""}> As needed (PRN)</label>
                <label><input type="radio" name="moxType" value="once" ${f.order_type === "once" ? "checked" : ""}> Once</label></div><div class="mox-err" data-err="order_type"></div></div>
            <div class="span2" data-for="scheduled"><label for="moxFreq">How often</label><select id="moxFreq"><option value="">—</option>${opt(options.frequencies, f.frequency)}</select><div class="mox-err" data-err="frequency"></div></div>
            <div class="span2" data-for="scheduled"><label for="moxTimes">Times</label><input id="moxTimes" value="${esc((f.admin_times || []).join(", "))}" placeholder="08:00, 20:00"><div class="mox-err" data-err="admin_times"></div></div>
            <div class="span2" data-for="prn"><label for="moxPrnFor">Give for</label><input id="moxPrnFor" maxlength="255" value="${esc(f.prn_indication || "")}" placeholder="e.g. pain score 4 or more"><div class="mox-err" data-err="prn_indication"></div></div>
            <div data-for="prn"><label for="moxPrnHours">At least … h apart</label><input id="moxPrnHours" inputmode="decimal" value="${esc(f.prn_min_hours ?? "")}" placeholder="4"><div class="mox-err" data-err="prn_min_hours"></div></div>
            <div data-for="prn"><label for="moxPrnMax">Max doses / 24 h</label><input id="moxPrnMax" inputmode="numeric" value="${esc(f.prn_max_per_day ?? "")}" placeholder="4"><div class="mox-err" data-err="prn_max_per_day"></div></div>
            <div class="span2" data-for="once"><label class="mox-check" style="margin-top:22px"><input type="checkbox" id="moxStat" ${f.is_stat ? "checked" : ""}> STAT — give immediately</label></div>
            <div class="span2"><label for="moxStart">Start</label><input type="datetime-local" id="moxStart" value="${now}"><div class="mox-err" data-err="start_at"></div></div>
            <div class="span2" data-not="once"><label for="moxStop">Stop (optional)</label><input type="datetime-local" id="moxStop"><div class="mox-err" data-err="stop_at"></div></div>
            <div class="full"><label for="moxInstr">Instructions (optional)</label><input id="moxInstr" maxlength="500" value="${esc(f.instructions || "")}" placeholder="e.g. after meals; hold if SBP below 100"></div>
            <div class="full" id="moxGate"></div>
        </div>
        <div class="mox-err" data-err="form"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button type="button" class="mox-btn" id="moxCancel">Cancel</button><button type="button" class="mox-btn primary" id="moxSubmit">Send to pharmacy</button></div>
    </form>`;
    let drug = copyFrom ? { id: copyFrom.drug_id, name: copyFrom.drug_name } : null;
    const showType = () => {
        const t = box.querySelector('input[name="moxType"]:checked').value;
        box.querySelectorAll("[data-for]").forEach((el) => (el.hidden = el.dataset.for !== t));
        box.querySelectorAll("[data-not]").forEach((el) => (el.hidden = el.dataset.not === t));
    };
    box.querySelectorAll('input[name="moxType"]').forEach((r) => (r.onchange = showType));
    showType();
    $("moxFreq").onchange = () => {
        const fr = options.frequencies[$("moxFreq").value];
        $("moxTimes").value = fr ? fr.times.join(", ") : "";
    };
    $("moxCancel").onclick = () => (box.innerHTML = "");
    $("moxSubmit").onclick = () => submit();

    const drugBox = () => {
        const b = $("moxDrugBox");
        if (drug) {
            b.innerHTML = `<div class="mox-picked"><span><strong>${esc(drug.name)}</strong>${drug.category ? ` <span class="mox-sub">${esc(drug.category)}</span>` : ""}</span><button type="button" class="mox-btn small" id="moxDrugChange">Change</button></div>`;
            $("moxDrugChange").onclick = () => {
                drug = null;
                $("moxChecks").innerHTML = "";
                $("moxGate").innerHTML = "";
                drugBox();
                $("moxDrugQ")?.focus();
            };
            runChecks();
            return;
        }
        b.innerHTML = `<input id="moxDrugQ" type="search" placeholder="Search the medicine list (name or generic)" autocomplete="off"><div id="moxDrugResults"></div>`;
        let seq = 0, t = null;
        $("moxDrugQ").oninput = () => {
            clearTimeout(t);
            t = setTimeout(async () => {
                const n = ++seq;
                const q = $("moxDrugQ")?.value.trim() || "";
                const r = await searchOrderDrugs(q).catch(() => null);
                if (n !== seq || !$("moxDrugResults")) return;
                const list = r?.success ? r.data : [];
                $("moxDrugResults").innerHTML = list.length ? `<div class="mox-results">${list.map((d) => `<button type="button" data-drug='${esc(JSON.stringify(d))}'>${esc(d.name)} <span class="mox-sub">${esc([d.category, d.high_alert ? "high-alert" : "", d.controlled || ""].filter(Boolean).join(" · "))}</span></button>`).join("")}</div>`
                    : `<div class="mox-sub">No medicine in the list matches "${esc(q)}".</div>`;
            }, 200);
        };
        $("moxDrugResults").onclick = (e) => {
            const btn = e.target.closest("[data-drug]");
            if (!btn) return;
            drug = JSON.parse(btn.dataset.drug);
            // Prefill dose / unit / route from the product (editable).
            const m = String(drug.strength || "").match(/^([\d.]+)\s*(mg|g|mcg|ml|iu)\b/i);
            if (m && !$("moxDose").value) {
                $("moxDose").value = m[1];
                const u = options.units.find((x) => x.toLowerCase() === m[2].toLowerCase());
                if (u) $("moxUnit").value = u;
            }
            if (!$("moxRoute").value) {
                const g = ROUTE_GUESS.find(([re]) => re.test(drug.name));
                if (g) $("moxRoute").value = g[1];
            }
            drugBox();
        };
        $("moxDrugQ").onfocus = () => $("moxDrugQ").dispatchEvent(new Event("input"));
    };
    drugBox();
    setTimeout(() => (drug ? $("moxDose") : $("moxDrugQ"))?.focus(), 0);

    async function runChecks() {
        $("moxChecks").innerHTML = `<span class="mox-sub">Checking allergies and current orders…</span>`;
        const r = await checkOrder(current.admissionId, drug.id).catch(() => null);
        if (!$("moxChecks")) return;
        $("moxChecks").innerHTML = r?.success ? warningsHtml(r.data.warnings) : `<span class="mox-sub">Could not run the checks now; they run again when you send the order.</span>`;
        gate(r?.success ? r.data.warnings : []);
    }
    function gate(warns) {
        const block = warns.some((w) => w.severity === "block");
        const ack = warns.some((w) => w.severity !== "info");
        $("moxGate").innerHTML = (ack ? `<label class="mox-check"><input type="checkbox" id="moxAck"> I have reviewed the warnings above</label>` : "")
            + (block ? `<label for="moxReason" style="margin-top:8px">Allergy match — why order it anyway? (required)</label><input id="moxReason" maxlength="255"><div class="mox-err" data-err="override_reason"></div>` : "");
    }

    async function submit() {
        box.querySelectorAll(".mox-err").forEach((x) => (x.textContent = ""));
        box.querySelectorAll('[aria-invalid="true"]').forEach((x) => x.removeAttribute("aria-invalid"));
        const type = box.querySelector('input[name="moxType"]:checked').value;
        const data = {
            admission_id: current.admissionId, drug_id: drug?.id || 0, dose: $("moxDose").value.trim(), dose_unit: $("moxUnit").value, route: $("moxRoute").value,
            order_type: type, start_at: $("moxStart").value, instructions: $("moxInstr").value.trim(),
            acknowledge: $("moxAck")?.checked ? 1 : 0, override_reason: $("moxReason")?.value.trim() || "",
        };
        if (type === "scheduled") Object.assign(data, { frequency: $("moxFreq").value, admin_times: $("moxTimes").value.replace(/\s/g, ""), stop_at: $("moxStop").value });
        if (type === "prn") Object.assign(data, { prn_indication: $("moxPrnFor").value.trim(), prn_min_hours: $("moxPrnHours").value.trim(), prn_max_per_day: $("moxPrnMax").value.trim(), stop_at: $("moxStop").value });
        if (type === "once") data.is_stat = $("moxStat").checked ? 1 : 0;
        const btn = $("moxSubmit");
        btn.disabled = true;
        const r = await createOrder(data).catch(() => null);
        btn.disabled = false;
        if (!r?.success) {
            if (r?.warnings) {
                $("moxChecks").innerHTML = warningsHtml(r.warnings);
                const keepReason = $("moxReason")?.value || "";
                gate(r.warnings);
                if ($("moxReason")) $("moxReason").value = keepReason;
            }
            let shown = false;
            Object.entries(r?.errors || {}).forEach(([k, v]) => {
                const el = box.querySelector(`[data-err="${k}"]`);
                if (el) {
                    el.textContent = v;
                    shown = true;
                }
            });
            if (!shown) box.querySelector('[data-err="form"]').textContent = r?.message || "Could not send the order.";
            return;
        }
        box.innerHTML = "";
        refresh(r.message);
    }
}

/* ---------------- verification queue (tab) ---------------- */

let queueTimer = null;

export function MedVerificationView() {
    return `<div class="mvq-page" id="mvqPage" style="padding:20px 24px 32px;color:var(--text-primary);font-size:13.5px;max-width:1100px;min-width:0">
        <h1 style="margin:0;font-size:22px">Medicine Order Verification</h1>
        <p class="mox-sub" style="margin:4px 0 14px;font-size:13px;max-width:780px">Orders waiting for a pharmacist: STAT first, then the oldest. Check the allergies and current medicines, then verify or reject. Nothing is given until it is verified.</p>
        <div id="mvqCounts" class="mox-sub" style="margin-bottom:10px"></div>
        <div id="mvqList"><div class="mox-empty">Loading…</div></div>
    </div>`;
}

export function initMedVerification() {
    const page = $("mvqPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    ensureRoot();
    loadQueue();
    $("mvqList").addEventListener("click", (e) => {
        const ver = e.target.closest("[data-verify]")?.dataset.verify;
        const open = e.target.closest("[data-open]")?.dataset.open;
        if (ver) verifyPanel(e.target.closest(".mox-order"), queue.find((o) => o.id === Number(ver)), loadQueue);
        if (open) openMedOrders(Number(open), { onChange: loadQueue });
    });
    clearInterval(queueTimer);
    queueTimer = setInterval(() => {
        if (!$("mvqPage")) return clearInterval(queueTimer);
        if (!document.hidden && !$("mvqList").querySelector(".mox-inline") && !$("moxOverlay")?.classList.contains("open")) loadQueue();
    }, 60000);
}

let queue = [];
async function loadQueue() {
    const r = await fetchVerificationQueue().catch(() => null);
    if (!$("mvqList")) return;
    if (!r?.success) {
        $("mvqList").innerHTML = `<div class="mox-empty">Could not load the queue. ${esc(r?.message || "")}</div>`;
        return;
    }
    queue = r.data.orders;
    $("mvqCounts").textContent = `${r.data.count} waiting${r.data.stat ? ` · ${r.data.stat} STAT` : ""}`;
    $("mvqList").innerHTML = queue.length ? queue.map((o) => `
        <div class="mox-order wait" data-order="${o.id}">
            <div class="mox-order-top">
                <div><strong>${esc(o.patient_name)}</strong> <span class="mox-sub">${esc(o.ward)} · ${esc(o.room)} · ${esc(o.bed)}${o.patient_mrn ? ` · ${esc(o.patient_mrn)}` : ""}</span></div>
                <span class="mox-sub">waiting ${o.waiting_minutes < 60 ? `${o.waiting_minutes} min` : `${Math.floor(o.waiting_minutes / 60)} h ${o.waiting_minutes % 60} min`}</span>
            </div>
            <div class="mox-allergies" style="margin:4px 0">${o.allergies.length ? o.allergies.map((al) => `<span class="mox-allergy">${esc(al.name)}</span>`).join("") : `<span class="mox-sub">No known allergies</span>`}</div>
            ${orderCard(o, { actions: false }).replace(/^<div class="mox-order [a-z]+" data-order="\d+">/, '<div style="margin-top:4px">')}
            ${warningsHtml(o.warnings_now)}
            <div class="mox-actions"><button type="button" class="mox-btn small primary" data-verify="${o.id}">Verify…</button>
                <button type="button" class="mox-btn small" data-open="${o.admission_id}">All orders for this patient</button></div>
        </div>`).join("") : `<div class="mox-empty">Nothing waiting. All orders are verified.</div>`;
}
