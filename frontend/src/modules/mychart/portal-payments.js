import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Online Payments (tab "portal_payments", Fees menu).
 *
 * Patients can start a payment in My Chart, which gives them a reference number and
 * changes nothing. This is where the desk confirms that the money actually arrived:
 * confirming writes it to the patient's ledger, and only then does their balance drop.
 *
 * If the hospital later adds a payment gateway, the gateway's callback settles the
 * same attempt and this screen simply has fewer rows to work through.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let timer = null;

export function PortalPaymentsView() {
    return `
<style>
.ppq { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1100px; }
.ppq h1 { margin: 0; font-size: 22px; }
.ppq .ppq-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.ppq-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.ppq-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.ppq-counts b { font-size: 18px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.ppq-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.ppq-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ppq-table th, .ppq-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.ppq-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.ppq-table tr:last-child td { border-bottom: 0; }
.ppq-table td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ppq-ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; }
.ppq-sub { color: var(--text-muted); font-size: 12px; }
.ppq-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 5px 11px; font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ppq-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.ppq-btn.danger { color: #b91c1c; }
.ppq-btn:disabled { opacity: .55; cursor: default; }
.ppq-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.ppq-acts { white-space: nowrap; text-align: right; }
.ppq-acts .ppq-btn { margin-left: 5px; }
.ppq-empty { padding: 24px; text-align: center; color: var(--text-muted); }
</style>
<div class="ppq">
    <h1>Online payments</h1>
    <p class="ppq-intro">Payments patients have started in My Chart. Each one has a reference number the patient shows at the
        desk. Confirm it once the money is in hand — that is what puts it on their ledger and lowers their balance. Nothing
        has been taken from the patient before you confirm.</p>
    <div id="ppqBody"><div class="ppq-empty">Loading…</div></div>
</div>`;
}

export async function initPortalPayments() {
    await load();
    clearInterval(timer);
    timer = setInterval(() => {
        if (!document.getElementById("ppqBody")) {
            clearInterval(timer);
            return;
        }
        if (!document.hidden && !document.querySelector("[data-confirming]")) load(true);
    }, 30000);
}

function money(v, m) {
    const n = Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: m?.decimals ?? 2, maximumFractionDigits: m?.decimals ?? 2 });
    return m?.position === "suffix" ? `${n}${m?.symbol || ""}` : `${m?.symbol || ""}${n}`;
}

async function load(quiet = false) {
    const res = await api("/portal-payments").catch(() => null);
    const body = $("ppqBody");
    if (!body) return;

    if (!res?.success) {
        if (!quiet) body.innerHTML = `<div class="ppq-empty">Could not load the payments. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render();
}

function render() {
    const body = $("ppqBody");
    const m = data.money;

    body.innerHTML = `
        <div class="ppq-counts">
            <div><b>${data.waiting}</b>waiting</div>
            <div><b>${esc(money(data.amount_waiting, m))}</b>in total</div>
        </div>
        <div class="ppq-card">
            <table class="ppq-table">
                <thead><tr><th>Reference</th><th>Patient</th><th>Started</th><th class="n">Amount</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map((x) => `<tr data-row="${x.attempt_id}">
                    <td class="ppq-ref">${esc(x.reference_no)}</td>
                    <td><b>${esc(x.patient.name)}</b><div class="ppq-sub">${esc(x.patient.mrn || "")}</div>
                        ${x.note ? `<div class="ppq-sub">${esc(x.note)}</div>` : ""}</td>
                    <td class="ppq-sub">${esc(String(x.started_at).slice(0, 16).replace("T", " "))}</td>
                    <td class="n"><b>${esc(money(x.amount, m))}</b></td>
                    <td class="ppq-acts">
                        <button type="button" class="ppq-btn primary" data-paid="${x.attempt_id}">Money received</button>
                        <button type="button" class="ppq-btn danger" data-unpaid="${x.attempt_id}">Not paid</button>
                    </td></tr>`).join("")
                    : `<tr><td colspan="5" class="ppq-empty">Nothing waiting. Payments appear here as patients start them in My Chart.</td></tr>`}
                </tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-paid]").forEach((b) => (b.onclick = () => settle(Number(b.dataset.paid), true, b)));
    body.querySelectorAll("[data-unpaid]").forEach((b) => (b.onclick = () => settle(Number(b.dataset.unpaid), false, b)));
}

async function settle(attemptId, paid, btn) {
    const row = btn.closest("tr");

    // An inline confirmation, not a browser dialog: this one moves money.
    if (!row.dataset.confirming) {
        row.dataset.confirming = paid ? "paid" : "unpaid";
        const cell = btn.closest(".ppq-acts");
        cell.dataset.original = cell.innerHTML;
        cell.innerHTML = `<span class="ppq-sub">${paid ? "Put this on the patient's ledger?" : "Mark as not paid?"}</span>
            <button type="button" class="ppq-btn ${paid ? "primary" : "danger"}" data-go>${paid ? "Yes, confirm" : "Yes, not paid"}</button>
            <button type="button" class="ppq-btn" data-no>Keep waiting</button>`;
        cell.querySelector("[data-no]").onclick = () => {
            delete row.dataset.confirming;
            cell.innerHTML = cell.dataset.original;
            render();
        };
        cell.querySelector("[data-go]").onclick = async (e) => {
            e.target.disabled = true;
            const res = await api("/portal-payments/settle", {
                method: "POST", body: JSON.stringify({ attempt_id: attemptId, paid: paid ? 1 : 0 }),
            }).catch(() => null);
            delete row.dataset.confirming;
            showToast(res?.message || "That did not work.", res?.success ? "success" : "error", 7000);
            await load();
        };
    }
}
