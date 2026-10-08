import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { onAlertsChanged } from "../alerts/alert-bell.js?v=11";
import { readBackFormHtml, bindReadBack, submitReadBack } from "./readback.js?v=1";

/*
 * The red mark on the patient's chart for critical lab results: a badge next to the name and
 * a banner listing each critical result, whether it was acknowledged (and by whom), how far
 * it has escalated, and an Acknowledge button for the people the alert went to. Refreshes
 * when an alert is acknowledged anywhere (the bell) and every minute while the chart is open.
 */

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (dt) => {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return "";
    const h = Number(m[4]);
    return `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
};

let patientId = null;
let timer = null;
let unsubscribe = null;
let seq = 0;

/** Called when the chart opens for a patient. */
export function loadCriticalLabBanner(patient) {
    patientId = patient?.id || null;
    clearInterval(timer);
    unsubscribe?.();
    unsubscribe = onAlertsChanged(() => refresh());
    timer = setInterval(() => {
        if (!$("pdCriticalLabBanner")) {
            clearInterval(timer);
            unsubscribe?.();
            return;
        }
        if (!document.hidden) refresh();
    }, 60000);
    refresh();
}

async function refresh() {
    const banner = $("pdCriticalLabBanner");
    const badge = $("pdCriticalLabBadge");
    if (!banner || !patientId) return;
    const n = ++seq;
    const res = await api(`/critical-labs/patient?patient_id=${encodeURIComponent(patientId)}`).catch(() => null);
    if (n !== seq || !res?.success) return;
    const { results, unacknowledged } = res.data;
    if (!results.length) {
        banner.style.display = "none";
        banner.innerHTML = "";
        if (badge) badge.innerHTML = "";
        return;
    }
    if (badge) {
        badge.innerHTML = unacknowledged
            ? `<span class="pd-critlab-badge" role="status" title="Critical lab result not acknowledged">⚠ CRITICAL LAB${unacknowledged > 1 ? ` ×${unacknowledged}` : ""}</span>`
            : `<span class="pd-critlab-badge done" title="Critical lab results, acknowledged">⚠ Critical lab (acknowledged)</span>`;
    }
    banner.style.display = "";
    banner.className = unacknowledged ? "pd-critlab-banner open" : "pd-critlab-banner";
    banner.innerHTML = `<style>
        .pd-critlab-banner { margin: 12px 24px 0 24px; padding: 10px 16px; border-radius: 8px; border: 1.5px solid #fca5a5; background: #fff5f5; color: #7f1d1d; }
        .pd-critlab-banner.open { border: 2px solid #dc2626; background: #fef2f2; box-shadow: 0 2px 8px rgba(220,38,38,.18); }
        :root[data-theme="dark"] .pd-critlab-banner { background: #2a1214; color: #fecaca; border-color: #7f1d1d; }
        :root[data-theme="dark"] .pd-critlab-banner.open { border-color: #ef4444; }
        .pd-critlab-banner h3 { margin: 0 0 6px; font-size: 14px; color: inherit; }
        .pd-critlab-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 5px 0; border-top: 1px dashed rgba(220,38,38,.3); font-size: 13px; }
        .pd-critlab-row:first-of-type { border-top: 0; }
        .pd-critlab-row .what { flex: 1 1 260px; }
        .pd-critlab-row .ok { color: #166534; font-weight: 600; }
        :root[data-theme="dark"] .pd-critlab-row .ok { color: #86efac; }
        .pd-critlab-row .wait { font-weight: 700; }
        .pd-critlab-btn { border: 1px solid #dc2626; background: #dc2626; color: #fff; border-radius: 8px; padding: 5px 11px; font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: inherit; }
        .pd-critlab-btn:focus-visible { outline: 2px solid #7f1d1d; outline-offset: 2px; }
        .pd-critlab-ack { display: flex; gap: 6px; flex-wrap: wrap; width: 100%; }
        .pd-critlab-ack input { flex: 1 1 260px; border: 1px solid #fca5a5; border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
        .pd-critlab-badge { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 6px; background: #dc2626; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: .2px; }
        .pd-critlab-badge.done { background: #fef2f2; color: #991b1b; border: 1.5px solid #fca5a5; }
    </style>
    <h3>⚠ Critical lab result${results.length > 1 ? "s" : ""}${unacknowledged ? ` — ${unacknowledged} not acknowledged` : ""}</h3>
    ${results.map((r) => `<div class="pd-critlab-row" data-alert="${r.alert_id || ""}">
        <div class="what"><strong>${esc(r.name)} ${esc(r.value)}</strong> — ${esc(r.detail || "Critical")} <span style="opacity:.8">· ${esc(fmt(r.resulted_at))}</span></div>
        <div>${r.acknowledged_at
            ? `<span class="ok">✓ Acknowledged by ${esc(r.acknowledged_by_name || "")} ${esc(fmt(r.acknowledged_at))}</span>${r.ack_note ? ` <span style="opacity:.85">— ${esc(r.ack_note)}</span>` : ""}`
            : `<span class="wait">Not acknowledged${r.escalation_level ? ` · escalated (level ${r.escalation_level})` : ""}</span>
               ${r.can_acknowledge ? ` <button type="button" class="pd-critlab-btn" data-ack="${r.alert_id}">Acknowledge…</button>` : ""}`}</div>
    </div>`).join("")}`;
    banner.querySelectorAll("[data-ack]").forEach((b) => { b.onclick = () => ackForm(b); });
}

function ackForm(btn) {
    const row = btn.closest(".pd-critlab-row");
    if (row.querySelector(".pd-critlab-ack")) return;
    const id = Number(btn.dataset.ack);
    const p = `pdRb${id}`;
    row.insertAdjacentHTML("beforeend", `<div class="pd-critlab-ack" style="display:block;background:var(--bg-surface);color:var(--text-primary);border-radius:8px;padding:10px;margin-top:4px">
        <strong>Read-back</strong>${readBackFormHtml(p)}
        <div style="display:flex;gap:6px;margin-top:6px"><button type="button" class="pd-critlab-btn" data-rb-go>Record read-back &amp; acknowledge</button>
            <button type="button" class="pd-critlab-btn" style="background:transparent;color:inherit;border-color:var(--border-color)" data-rb-cancel>Cancel</button></div></div>`);
    const box = row.querySelector(".pd-critlab-ack");
    bindReadBack(box, p);
    box.querySelector("[data-rb-cancel]").onclick = () => box.remove();
    box.querySelector("[data-rb-go]").onclick = async (ev) => {
        ev.target.disabled = true;
        const r = await submitReadBack(box, p, id);
        ev.target.disabled = false;
        if (!r?.success) return;
        showToast(r.message || "Read-back recorded.", "success", 5000);
        refresh();
    };
}
