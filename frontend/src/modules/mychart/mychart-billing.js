import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { ensureCss, esc, when, dayLabel } from "./mychart-ui.js?v=10";

/*
 * My Chart -> Billing (patient portal, Phase 4).
 *
 * The itemised statement, what is still owed, paying, and the receipts. The balance
 * always comes from the backend, which recomputes it from the ledger -- this screen
 * never adds anything up itself, so a part-payment or a later charge is right by
 * construction.
 *
 * Paying records the patient's intent and gives them a reference number; the money
 * reaches the ledger when the desk (or, later, a payment gateway) confirms it. The
 * screen says so plainly rather than implying the bill is settled.
 */

let data = null;
let history = null;

export function MyChartBillingView() {
    return `<div class="mc" id="mcBilling"><div class="mc-empty">Loading your statement…</div></div>`;
}

export async function initMyChartBilling() {
    ensureCss();
    await load();
}

/** Money the way the hospital's settings say it should look. */
function money(v, m) {
    const n = Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: m?.decimals ?? 2, maximumFractionDigits: m?.decimals ?? 2 });
    const symbol = m?.symbol || "";
    return m?.position === "suffix" ? `${n}${symbol}` : `${symbol}${n}`;
}

async function load() {
    const root = document.getElementById("mcBilling");
    if (!root) return;

    const [st, hist] = await Promise.all([
        api("/mychart/billing").catch(() => null),
        api("/mychart/billing/history").catch(() => null),
    ]);

    if (!st?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(st?.message || "Your statement could not be loaded. Please try again.")}</div>`;
        return;
    }

    data = st.data;
    history = hist?.success ? hist.data : { payments: [], waiting: [], money: data.money };
    render();
}

function render() {
    const root = document.getElementById("mcBilling");
    if (!root) return;

    const m = data.money;
    const owed = data.outstanding;

    root.innerHTML = `
        <div class="mc-head">
            <h1>Billing</h1>
            <p class="mc-sub">What the hospital has charged you, what you have paid, and what is still owed. Every amount comes
                from your ledger — the same one the cashier sees.</p>
        </div>

        <div class="mc-billbar">
            <div class="mc-bill-owed ${owed > 0 ? "due" : "clear"}">
                <span class="mc-bill-label">${owed > 0 ? "Still to pay" : "Nothing owed"}</span>
                <span class="mc-bill-amount">${esc(money(owed, m))}</span>
            </div>
            ${history.waiting.length ? `<div class="mc-bill-note">
                ${history.waiting.map((w) => `<div><b>${esc(money(w.amount, m))}</b> waiting to be confirmed — reference
                    <b>${esc(w.reference_no)}</b>. Show this at the cashier.
                    <button type="button" class="mc-b sm" data-cancel="${w.attempt_id}">Cancel</button></div>`).join("")}
            </div>` : ""}
            ${owed > 0 && data.can_pay ? `<button type="button" class="mc-b blue" id="mcPayBtn">Pay now</button>` : ""}
        </div>

        <div id="mcPayBox"></div>

        <h2 class="mc-h2">What you were charged</h2>
        ${data.visits.length ? data.visits.map((v) => `
            <div class="mc-panel">
                <h3 class="mc-billdate">${esc(dayLabel(v.date))}</h3>
                <table class="mc-tbl"><tbody>
                    ${v.rows.map((r) => `<tr><td>${esc(r.description)}${r.type ? `<div class="muted">${esc(r.type)}</div>` : ""}</td>
                        <td class="n">${esc(money(r.charge, m))}</td></tr>`).join("")}
                    <tr class="mc-tot"><td>Total for this day</td><td class="n">${esc(money(v.charge, m))}</td></tr>
                </tbody></table>
            </div>`).join("")
            : `<div class="mc-empty">No charges in this period.</div>`}

        <h2 class="mc-h2">What you have paid</h2>
        ${history.payments.length ? `<div class="mc-panel"><table class="mc-tbl">
            <thead><tr><th>Date</th><th>How</th><th>Reference</th><th class="n">Amount</th><th></th></tr></thead>
            <tbody>${history.payments.map((p) => `<tr>
                <td>${esc(dayLabel(p.date))}</td><td>${esc(p.how || "")}</td><td class="muted">${esc(p.reference_no || "—")}</td>
                <td class="n">${esc(money(p.amount, m))}</td>
                <td class="n"><button type="button" class="mc-b sm" data-receipt="${p.id}">Receipt</button></td></tr>`).join("")}
            </tbody></table></div>`
            : `<div class="mc-empty">No payments recorded yet.</div>`}

        ${data.tax ? `<div class="mc-note">${esc(data.tax.name)} of ${esc(String(data.tax.rate))}% is already included in the amounts
            above (${esc(money(data.tax.included, m))} of ${esc(money(data.totals.charge, m))}).${
            data.tax.registration ? ` ${esc(m.tax_name || "Tax")} registration ${esc(data.tax.registration)}.` : ""}</div>` : ""}

        <div id="mcReceiptBox" aria-live="polite"></div>`;

    bind();
}

function bind() {
    const root = document.getElementById("mcBilling");

    const pay = root.querySelector("#mcPayBtn");
    if (pay) pay.onclick = payBox;

    root.querySelectorAll("[data-cancel]").forEach((b) => {
        b.onclick = async () => {
            b.disabled = true;
            const res = await api("/mychart/billing/cancel", {
                method: "POST", body: JSON.stringify({ attempt_id: Number(b.dataset.cancel) }),
            }).catch(() => null);
            showToast(res?.message || "That could not be cancelled.", res?.success ? "success" : "error", 6000);
            if (res?.success) await load();
            else b.disabled = false;
        };
    });

    root.querySelectorAll("[data-receipt]").forEach((b) => (b.onclick = () => openReceipt(Number(b.dataset.receipt))));
}

function payBox() {
    const box = document.getElementById("mcPayBox");
    const m = data.money;

    box.innerHTML = `<div class="mc-panel">
        <h3 style="margin:0 0 4px">Pay towards your bill</h3>
        <p class="mc-sub" style="margin:0 0 10px">You can pay all of it or part of it. We will give you a reference number —
            show it at the cashier to complete the payment. Nothing is taken from you here.</p>
        <div class="mc-askrow">
            <label for="mcAmount" style="font-weight:600">Amount</label>
            <input type="text" id="mcAmount" inputmode="decimal" value="${esc(String(data.outstanding.toFixed(m?.decimals ?? 2)))}"
                aria-label="Amount to pay" style="max-width:160px">
            <input type="text" id="mcPayNote" maxlength="255" placeholder="A note (optional)" aria-label="A note about this payment">
            <button type="button" class="mc-b blue" id="mcPayGo">Get a reference number</button>
            <button type="button" class="mc-b" id="mcPayCancel">Cancel</button>
        </div>
        <div class="mc-err" id="mcPayErr"></div>
    </div>`;

    box.querySelector("#mcPayCancel").onclick = () => (box.innerHTML = "");
    box.querySelector("#mcPayGo").onclick = async (e) => {
        const amount = box.querySelector("#mcAmount").value.trim();
        const err = box.querySelector("#mcPayErr");
        err.textContent = "";

        if (!amount || Number.isNaN(Number(amount))) {
            err.textContent = "Enter how much you would like to pay.";
            return;
        }

        e.target.disabled = true;
        const res = await api("/mychart/billing/pay", {
            method: "POST",
            body: JSON.stringify({ amount: Number(amount), note: box.querySelector("#mcPayNote").value.trim() }),
        }).catch(() => null);
        e.target.disabled = false;

        if (!res?.success) {
            err.textContent = res?.message || "That payment could not be started.";
            return;
        }

        box.innerHTML = `<div class="mc-panel"><h3 style="margin:0 0 4px">Take this to the cashier</h3>
            <p style="margin:0 0 6px">Reference <b>${esc(res.data.reference_no)}</b> for <b>${esc(money(res.data.amount, data.money))}</b>.</p>
            <p class="mc-sub" style="margin:0">Your balance updates once the cashier confirms the money. You can cancel it
                above until then.</p></div>`;
        showToast(res.message, "success", 8000);
        await load();
    };
    box.querySelector("#mcAmount").focus();
}

/* ---------------- receipts ---------------- */

async function openReceipt(paymentId) {
    const box = document.getElementById("mcReceiptBox");
    box.innerHTML = `<div class="mc-panel">Opening…</div>`;

    const res = await api(`/mychart/billing/receipt?payment_id=${paymentId}`).catch(() => null);

    if (!res?.success) {
        box.innerHTML = "";
        showToast(res?.message || "That receipt could not be opened.", "error", 6000);
        return;
    }

    const r = res.data;
    box.innerHTML = `<div class="mc-panel">${receiptHtml(r)}
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="mc-b sm" id="mcPrintReceipt">Print this receipt</button>
            <button type="button" class="mc-b sm" id="mcCloseReceipt">Close</button>
        </div></div>`;

    box.querySelector("#mcCloseReceipt").onclick = () => (box.innerHTML = "");
    box.querySelector("#mcPrintReceipt").onclick = () => printReceipt(receiptHtml(r));
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function receiptHtml(r) {
    const m = r.money;
    return `
        <h2>Receipt</h2>
        <div class="mc-meta">${esc(r.patient.name)} · ${esc(r.patient.patient_no)} · ${esc(dayLabel(r.date))}</div>
        <table class="mc-tbl"><tbody>
            <tr><td>Amount paid</td><td class="n"><b>${esc(money(r.amount, m))}</b></td></tr>
            <tr><td>How</td><td class="n">${esc(r.how || "")}</td></tr>
            <tr><td>Reference</td><td class="n">${esc(r.reference_no || "—")}</td></tr>
            ${r.settled_at ? `<tr><td>Confirmed</td><td class="n">${esc(when(r.settled_at))}</td></tr>` : ""}
            ${r.note ? `<tr><td>Note</td><td class="n">${esc(r.note)}</td></tr>` : ""}
            <tr class="mc-tot"><td>Still owed after this</td><td class="n">${esc(money(r.balance_after, m))}</td></tr>
        </tbody></table>
        ${r.tax ? `<p class="muted" style="font-size:12.5px;margin-top:8px">Includes ${esc(r.tax.name)} of ${esc(String(r.tax.rate))}%
            (${esc(money(r.tax.included, m))}).${r.tax.registration ? ` Registration ${esc(r.tax.registration)}.` : ""}</p>` : ""}`;
}

function printReceipt(inner) {
    const w = window.open("", "_blank", "width=680,height=640");

    if (!w) {
        showToast("Your browser blocked the print window. Allow pop-ups for this site and try again.", "error", 7000);
        return;
    }

    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>
        @page { size: A5 portrait; margin: 12mm; }
        body { font: 11pt/1.5 system-ui, sans-serif; color: #111; margin: 0; }
        h2 { font-size: 16pt; margin: 0 0 2px; }
        .mc-meta { color: #444; font-size: 10pt; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 0; border-bottom: 1px solid #ddd; }
        td.n { text-align: right; font-variant-numeric: tabular-nums; }
        tr.mc-tot td { border-top: 2px solid #333; border-bottom: 0; font-weight: 700; }
        .muted { color: #555; }
    </style></head><body>${inner}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
}
