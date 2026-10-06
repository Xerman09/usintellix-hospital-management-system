import { pollAlerts, markAlertsSeen, markAlertRead, markAllAlertsRead, acknowledgeAlert } from "./alerts.service.js?v=2";
import { showToast } from "../../core/toast.js";

/*
 * Alert bell on every screen: unread count, the latest alerts, and pop-ups.
 * Critical (and urgent) alerts must be acknowledged: critical ones open a pop-up
 * with a sound that stays until someone acknowledges; urgent ones sit in a
 * corner card with a softer sound. Polls the server every 20 seconds.
 */

const POLL_MS = 20000;
const REPEAT_SOUND_MS = 60000;   // a critical alert still open beeps again every minute

let started = false;
let pollTimer = null;
let state = { unread: 0, popups: [], latest: [], serverTime: null };
let known = new Set();           // alert ids already announced (sound) in this tab
let snoozedUrgent = new Set();   // urgent cards hidden for now (they stay in the bell)
let lastBeep = 0;
let audioCtx = null;
let listeners = new Set();
let pendingOpen = null;          // alert to show when the Alerts page opens

/** The Alerts page asks once on open: was it opened to show one alert? */
export function takePendingAlert() {
    const id = pendingOpen;
    pendingOpen = null;
    return id;
}

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** "2026-10-06 14:05:00" -> "Oct 6, 2:05 PM" (already in system time; no conversion). */
export function fmtDateTime(dt) {
    if (!dt) return "";
    const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return String(dt);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const h = Number(m[4]);
    return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
}

const parse = (dt) => {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
    return m ? Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6] || 0) : NaN;
};

/** "just now", "5 min ago", ... measured against the server clock. */
export function ago(dt, serverTime = state.serverTime) {
    const diff = (parse(serverTime) - parse(dt)) / 60000;
    if (!Number.isFinite(diff)) return fmtDateTime(dt);
    if (diff < 1) return "just now";
    if (diff < 60) return `${Math.floor(diff)} min ago`;
    if (diff < 24 * 60) return `${Math.floor(diff / 60)} h ago`;
    return fmtDateTime(dt);
}

export const URGENCY_LABEL = { info: "Info", urgent: "Urgent", critical: "Critical" };

/** Go to what the alert is about: a screen, the patient's chart, or a surgical case. */
export async function openAlertLink(a) {
    const link = a.link || (a.patient_id ? { patient_id: a.patient_id } : null);
    if (!link) return false;
    if (link.or_case) {
        const { openOrCase } = await import("../or-board/or-case-panel.js?v=4");
        openOrCase(Number(link.or_case));
        return true;
    }
    if (link.patient_id && typeof window.__openPatientChartFromReport === "function") {
        window.__openPatientChartFromReport(a.patient_no || link.patient_id);
        return true;
    }
    if (link.tab && typeof window.__openDashboardTab === "function") {
        window.__openDashboardTab(link.tab, link.tab.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
        return true;
    }
    return false;
}

export const hasLink = (a) => !!(a.link || a.patient_id);

/** Other screens (the Alerts page) can follow changes. */
export function onAlertsChanged(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function refreshAlerts() {
    return poll();
}

/* ------------------------------------------------------------------ */

const ICON_BELL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;

const CSS = `
.alb-wrap { position: relative; display: flex; align-items: center; height: 100%; }
.alb-btn { position: relative; width: 36px; height: 36px; border-radius: 50%; border: 0; background: transparent; color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.alb-btn:hover, .alb-btn[aria-expanded="true"] { background: var(--bg-surface-alt); color: var(--text-primary); }
.alb-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.alb-btn svg { width: 20px; height: 20px; }
.alb-btn.has-critical { color: #dc2626; animation: alb-shake 1.2s ease-in-out infinite; }
@keyframes alb-shake { 0%, 60%, 100% { transform: rotate(0); } 10%, 30% { transform: rotate(-12deg); } 20%, 40% { transform: rotate(12deg); } }
@media (prefers-reduced-motion: reduce) { .alb-btn.has-critical { animation: none; } }
.alb-count { position: absolute; top: 2px; right: 0; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: #dc2626; color: #fff; font-size: 10.5px; font-weight: 700; line-height: 17px; text-align: center; box-shadow: 0 0 0 2px var(--bg-surface); }
.alb-count[hidden] { display: none; }

.alb-panel { position: absolute; top: calc(100% - 4px); right: 0; width: 380px; max-width: calc(100vw - 24px); background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 16px 40px rgba(15,23,42,.18); z-index: 3000; overflow: hidden; display: none; font-size: 13px; }
.alb-panel.open { display: block; }
.alb-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-color); }
.alb-head strong { font-size: 14px; }
.alb-link { background: none; border: 0; color: var(--accent); font-size: 12.5px; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
.alb-link:hover { text-decoration: underline; }
.alb-link:disabled { color: var(--text-muted); cursor: default; text-decoration: none; }
.alb-list { max-height: 420px; overflow-y: auto; }
.alb-item { display: flex; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border-color); cursor: pointer; text-align: left; width: 100%; background: none; border-left: 0; border-right: 0; border-top: 0; color: inherit; font: inherit; }
.alb-item:hover, .alb-item:focus-visible { background: var(--bg-surface-alt); outline: none; }
.alb-item.unread { background: var(--accent-light); }
.alb-item.unread:hover { filter: brightness(.98); }
.alb-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: transparent; }
.alb-item.unread .alb-dot { background: var(--accent); }
.alb-main { min-width: 0; flex: 1; }
.alb-title { font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.alb-sub { color: var(--text-muted); font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
.alb-empty { padding: 28px 14px; text-align: center; color: var(--text-muted); }
.alb-foot { display: flex; justify-content: center; padding: 10px; }

.alb-pill { display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; padding: 1px 7px; border-radius: 10px; margin-right: 6px; vertical-align: 1px; }
.alb-pill.critical { background: #fee2e2; color: #b91c1c; }
.alb-pill.urgent { background: #fef3c7; color: #92400e; }
.alb-pill.info { background: var(--accent-lighter); color: var(--accent-text); }
.alb-pill.done { background: #dcfce7; color: #166534; }
:root[data-theme="dark"] .alb-pill.critical { background: #7f1d1d; color: #fecaca; }
:root[data-theme="dark"] .alb-pill.urgent { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .alb-pill.done { background: #14532d; color: #bbf7d0; }

/* Critical pop-up: stays until acknowledged. */
.alb-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 5000; display: none; align-items: center; justify-content: center; padding: 16px; }
.alb-overlay.open { display: flex; }
.alb-modal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 480px; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.35); border-top: 6px solid #dc2626; overflow: hidden; }
.alb-modal-body { padding: 18px 20px 6px; }
.alb-modal h2 { margin: 6px 0 6px; font-size: 18px; line-height: 1.3; overflow-wrap: anywhere; }
.alb-modal p { margin: 0 0 10px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.45; }
.alb-meta { color: var(--text-muted); font-size: 12.5px; margin-bottom: 10px; }
.alb-esc { background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 7px 10px; font-size: 12.5px; font-weight: 600; margin-bottom: 10px; }
:root[data-theme="dark"] .alb-esc { background: #7f1d1d; color: #fecaca; }
.alb-modal label { display: block; font-size: 12.5px; color: var(--text-muted); margin: 8px 0 4px; }
.alb-modal textarea { width: 100%; box-sizing: border-box; min-height: 56px; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; font: inherit; background: var(--bg-surface-alt); color: var(--text-primary); resize: vertical; }
.alb-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 12px 20px 16px; }
.alb-more { margin-right: auto; color: var(--text-muted); font-size: 12.5px; align-self: center; }
.alb-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font-weight: 600; font-size: 13px; cursor: pointer; }
.alb-b:hover { background: var(--bg-surface-alt); }
.alb-b.red { background: #dc2626; border-color: #dc2626; color: #fff; }
.alb-b.red:hover { background: #b91c1c; }
.alb-b:disabled { opacity: .6; cursor: default; }

/* Urgent cards, bottom right. */
.alb-stack { position: fixed; right: 16px; bottom: 16px; z-index: 4500; display: flex; flex-direction: column; gap: 10px; width: 340px; max-width: calc(100vw - 32px); }
.alb-card { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-left: 5px solid #f59e0b; border-radius: 10px; box-shadow: 0 12px 30px rgba(15,23,42,.2); padding: 12px 14px; font-size: 13px; }
.alb-card .alb-title { margin: 4px 0 2px; }
.alb-card-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 10px; flex-wrap: wrap; }
.alb-card-actions .alb-b { padding: 6px 10px; font-size: 12.5px; }
.alb-b.amber { background: #d97706; border-color: #d97706; color: #fff; }
.alb-b.amber:hover { background: #b45309; }
@media (max-width: 600px) { .alb-panel { position: fixed; top: 56px; right: 12px; left: 12px; width: auto; } }
`;

function ensureDom() {
    if (!document.getElementById("alb-style")) {
        const style = document.createElement("style");
        style.id = "alb-style";
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    if (!document.getElementById("albOverlay")) {
        const overlay = document.createElement("div");
        overlay.className = "alb-overlay";
        overlay.id = "albOverlay";
        overlay.setAttribute("role", "alertdialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "albModalTitle");
        overlay.innerHTML = `<div class="alb-modal" id="albModal"></div>`;
        document.body.appendChild(overlay);
        const stack = document.createElement("div");
        stack.className = "alb-stack";
        stack.id = "albStack";
        stack.setAttribute("aria-live", "assertive");
        document.body.appendChild(stack);
    }
}

/** Put the bell in the top bar (before the profile menu) and start polling. */
export function initAlertBell(user) {
    if (!user || user.role === "patient") return;
    ensureDom();
    const right = document.querySelector(".navbar-right");
    if (right && !document.getElementById("albWrap")) {
        const wrap = document.createElement("div");
        wrap.className = "alb-wrap";
        wrap.id = "albWrap";
        wrap.innerHTML = `
            <button type="button" class="alb-btn" id="albBtn" aria-haspopup="true" aria-expanded="false" aria-controls="albPanel" aria-label="Alerts">
                ${ICON_BELL}<span class="alb-count" id="albCount" hidden>0</span>
            </button>
            <div class="alb-panel" id="albPanel" role="region" aria-label="Alerts"></div>`;
        const profile = right.querySelector(".nav-profile");
        right.insertBefore(wrap, profile || null);
        wrap.querySelector("#albBtn").addEventListener("click", (e) => {
            e.stopPropagation();
            togglePanel();
        });
        wrap.querySelector("#albPanel").addEventListener("click", onPanelClick);
    }
    if (started) {
        render();
        return;
    }
    started = true;
    document.addEventListener("click", (e) => {
        const panel = document.getElementById("albPanel");
        if (panel?.classList.contains("open") && !e.target.closest("#albWrap")) closePanel();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && document.getElementById("albPanel")?.classList.contains("open")) {
            closePanel();
            document.getElementById("albBtn")?.focus();
        }
    });
    // Browsers only allow sound after the person has clicked or typed on the page.
    const unlock = () => {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === "suspended") audioCtx.resume();
        } catch { /* no sound available */ }
    };
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) poll();
    });
    window.addEventListener("hashchange", () => {
        if (!/^#\/?dashboard/.test(location.hash)) stop();
    });
    poll();
}

function stop() {
    clearTimeout(pollTimer);
    pollTimer = null;
    started = false;
    known = new Set();
    state = { unread: 0, popups: [], latest: [], serverTime: null };
    document.getElementById("albOverlay")?.classList.remove("open");
    const stack = document.getElementById("albStack");
    if (stack) stack.innerHTML = "";
}

async function poll() {
    clearTimeout(pollTimer);
    if (!started) return;
    try {
        const res = await pollAlerts();
        if (res?.success) {
            const d = res.data;
            const fresh = d.popups.filter((a) => !known.has(a.id));
            [...d.popups, ...d.latest].forEach((a) => known.add(a.id));
            state = { unread: d.unread, popups: d.popups, latest: d.latest, serverTime: d.server_time };
            render();
            const critical = d.popups.some((a) => a.urgency === "critical");
            // Info alerts are silent; new urgent/critical ones beep, and an open critical beeps again every minute.
            if (fresh.length || (critical && Date.now() - lastBeep > REPEAT_SOUND_MS)) {
                beep(critical ? "critical" : "urgent");
            }
            listeners.forEach((fn) => fn(state));
        }
    } catch { /* offline for a moment: try again next round */ }
    if (started) pollTimer = setTimeout(poll, POLL_MS);
}

function beep(level) {
    if (!audioCtx || audioCtx.state !== "running") return;
    lastBeep = Date.now();
    const tones = level === "critical" ? [[880, 0], [660, .22], [880, .44], [660, .66]] : [[660, 0], [880, .2]];
    tones.forEach(([freq, at]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = audioCtx.currentTime + at;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    });
}

/* ------------------------------------------------------------------ */

function render() {
    const count = document.getElementById("albCount");
    const btn = document.getElementById("albBtn");
    if (count) {
        count.hidden = state.unread === 0;
        count.textContent = state.unread > 99 ? "99+" : String(state.unread);
    }
    if (btn) {
        const critical = state.popups.some((a) => a.urgency === "critical");
        btn.classList.toggle("has-critical", critical);
        btn.setAttribute("aria-label", state.unread ? `Alerts, ${state.unread} unread${critical ? ", critical waiting" : ""}` : "Alerts");
    }
    if (document.getElementById("albPanel")?.classList.contains("open")) renderPanel();
    renderPopup();
    renderStack();
}

function itemHtml(a) {
    const sub = [a.patient_name, a.type_label, ago(a.created_at)].filter(Boolean).join(" · ");
    const status = a.open ? (a.escalation_level ? `<span class="alb-pill critical">Escalated</span>` : "") : a.acknowledged_at ? `<span class="alb-pill done">Acknowledged</span>` : a.resolved_at ? `<span class="alb-pill done">Closed</span>` : "";
    return `<button type="button" class="alb-item ${a.read ? "" : "unread"}" data-alb-id="${a.id}">
        <span class="alb-dot" aria-hidden="true"></span>
        <span class="alb-main">
            <span class="alb-title">${a.urgency !== "info" ? `<span class="alb-pill ${a.urgency}">${URGENCY_LABEL[a.urgency]}</span>` : ""}${status}${esc(a.title)}</span>
            <span class="alb-sub" style="display:block">${esc(sub)}</span>
        </span>
    </button>`;
}

function renderPanel() {
    const panel = document.getElementById("albPanel");
    if (!panel) return;
    // Waiting-for-acknowledgement alerts first, then the latest.
    const seen = new Set();
    const items = [...state.popups, ...state.latest].filter((a) => !seen.has(a.id) && seen.add(a.id)).slice(0, 10);
    panel.innerHTML = `
        <div class="alb-head"><strong>Alerts</strong>
            <button type="button" class="alb-link" data-alb-action="read-all" ${state.unread ? "" : "disabled"}>Mark all as read</button></div>
        <div class="alb-list">${items.length ? items.map(itemHtml).join("") : `<div class="alb-empty">No alerts. You're all caught up.</div>`}</div>
        <div class="alb-foot"><button type="button" class="alb-link" data-alb-action="all">See all alerts</button></div>`;
}

function togglePanel() {
    const panel = document.getElementById("albPanel");
    if (!panel) return;
    if (panel.classList.contains("open")) {
        closePanel();
        return;
    }
    renderPanel();
    panel.classList.add("open");
    document.getElementById("albBtn")?.setAttribute("aria-expanded", "true");
    const ids = [...state.popups, ...state.latest].filter((a) => !a.my_seen_at).map((a) => a.id);
    if (ids.length) markAlertsSeen(ids).catch(() => {});
    poll();
}

function closePanel() {
    document.getElementById("albPanel")?.classList.remove("open");
    document.getElementById("albBtn")?.setAttribute("aria-expanded", "false");
}

async function onPanelClick(e) {
    const action = e.target.closest("[data-alb-action]")?.dataset.albAction;
    if (action === "read-all") {
        const res = await markAllAlertsRead();
        if (!res?.success) showToast(res?.message || "Could not mark the alerts as read.", "error");
        poll();
        return;
    }
    if (action === "all") {
        closePanel();
        window.__openDashboardTab?.("alerts", "Alerts");
        return;
    }
    const id = Number(e.target.closest("[data-alb-id]")?.dataset.albId);
    if (!id) return;
    const a = [...state.popups, ...state.latest].find((x) => x.id === id);
    closePanel();
    if (a?.open) {
        // Needs an acknowledgement: show it as a pop-up whatever its urgency.
        showPopup(a);
        return;
    }
    await markAlertRead(id).catch(() => {});
    if (!a || !(await openAlertLink(a))) {
        // Nothing to open: show it on the Alerts page.
        pendingOpen = id;
        window.__openDashboardTab?.("alerts", "Alerts");
        window.dispatchEvent(new CustomEvent("alerts:open"));
    }
    poll();
}

/* ------------------------------------------------------------------ */

let forced = null;   // an alert opened from the bell or the Alerts page

/** Show the acknowledge pop-up for one alert (from the bell or the Alerts page). */
export function showPopup(a) {
    forced = a;
    snoozedUrgent.delete(a.id);
    renderPopup();
}

function renderPopup() {
    const overlay = document.getElementById("albOverlay");
    const modal = document.getElementById("albModal");
    if (!overlay || !modal) return;
    const critical = state.popups.filter((a) => a.urgency === "critical");
    // Pop-ups list at most 20 open alerts; one opened from the Alerts page may be further down.
    const stillOpen = forced && (state.popups.some((a) => a.id === forced.id) || !state.serverTime || state.popups.length >= 20);
    if (forced && !stillOpen) forced = null;
    const a = forced || critical[0];
    if (!a) {
        overlay.classList.remove("open");
        modal.dataset.id = "";
        return;
    }
    // Don't redraw (and lose a half-typed note) while the same alert is up.
    if (overlay.classList.contains("open") && modal.dataset.id === String(a.id)) {
        const more = modal.querySelector(".alb-more");
        const others = critical.filter((x) => x.id !== a.id).length;
        if (more) more.textContent = others ? `${others} more critical` : "";
        return;
    }
    const others = critical.filter((x) => x.id !== a.id).length;
    modal.dataset.id = String(a.id);
    modal.style.borderTopColor = a.urgency === "critical" ? "#dc2626" : a.urgency === "urgent" ? "#f59e0b" : "var(--accent)";
    modal.innerHTML = `
        <div class="alb-modal-body">
            <span class="alb-pill ${a.urgency}">${URGENCY_LABEL[a.urgency]}</span><span class="alb-meta">${esc(a.type_label)}</span>
            <h2 id="albModalTitle">${esc(a.title)}</h2>
            <div class="alb-meta">${esc([a.patient_name ? `Patient: ${a.patient_name}` : "", `From ${a.created_by_name}`, fmtDateTime(a.created_at)].filter(Boolean).join(" · "))}</div>
            ${a.escalation_level ? `<div class="alb-esc">Escalated (level ${a.escalation_level}): nobody acknowledged it in time.</div>` : ""}
            ${a.body ? `<p>${esc(a.body)}</p>` : ""}
            <label for="albNote">Note (optional) — e.g. what you did</label>
            <textarea id="albNote" maxlength="500"></textarea>
        </div>
        <div class="alb-actions">
            <span class="alb-more">${others ? `${others} more critical` : ""}</span>
            ${a.urgency !== "critical" ? `<button type="button" class="alb-b" data-alb-pop="later">Later</button>` : ""}
            ${hasLink(a) ? `<button type="button" class="alb-b" data-alb-pop="ack-open">Acknowledge &amp; open</button>` : ""}
            <button type="button" class="alb-b red" data-alb-pop="ack">Acknowledge</button>
        </div>`;
    modal.onclick = (e) => onPopupClick(e, a);
    overlay.classList.add("open");
    markAlertsSeen([a.id]).catch(() => {});
    setTimeout(() => modal.querySelector('[data-alb-pop="ack"]')?.focus(), 0);
}

async function onPopupClick(e, a) {
    const action = e.target.closest("[data-alb-pop]")?.dataset.albPop;
    if (!action) return;
    if (action === "later") {
        snoozedUrgent.add(a.id);
        forced = null;
        document.getElementById("albOverlay")?.classList.remove("open");
        document.getElementById("albModal").dataset.id = "";
        render();
        return;
    }
    const buttons = e.currentTarget.querySelectorAll("button");
    buttons.forEach((b) => (b.disabled = true));
    const note = document.getElementById("albNote")?.value || "";
    const res = await acknowledgeAlert(a.id, note).catch(() => null);
    buttons.forEach((b) => (b.disabled = false));
    if (!res?.success) {
        showToast(res?.message || "Could not acknowledge. Try again.", "error");
        return;
    }
    if (res.data?.already) showToast(res.message, "success", 5000);
    forced = null;
    state.popups = state.popups.filter((x) => x.id !== a.id);
    document.getElementById("albModal").dataset.id = "";
    render();
    if (action === "ack-open") openAlertLink(a);
    window.dispatchEvent(new CustomEvent("alerts:changed"));
    poll();
}

function renderStack() {
    const stack = document.getElementById("albStack");
    if (!stack) return;
    const shownInModal = Number(document.getElementById("albModal")?.dataset.id || 0);
    const urgent = state.popups.filter((a) => a.urgency === "urgent" && !snoozedUrgent.has(a.id) && a.id !== shownInModal).slice(0, 3);
    const ids = "k:" + urgent.map((a) => a.id).join(",");   // never equals the "" used to force a redraw
    if (stack.dataset.ids === ids) return;
    stack.dataset.ids = ids;
    stack.innerHTML = urgent.map((a) => `
        <div class="alb-card" role="alert" data-alb-card="${a.id}">
            <span class="alb-pill urgent">Urgent</span>${a.escalation_level ? `<span class="alb-pill critical">Escalated</span>` : ""}<span class="alb-meta">${esc(a.type_label)} · ${esc(ago(a.created_at))}</span>
            <div class="alb-title">${esc(a.title)}</div>
            ${a.patient_name ? `<div class="alb-sub">Patient: ${esc(a.patient_name)}</div>` : ""}
            <div class="alb-card-actions">
                <button type="button" class="alb-b" data-alb-card-act="later">Later</button>
                <button type="button" class="alb-b" data-alb-card-act="view">View</button>
                <button type="button" class="alb-b amber" data-alb-card-act="ack">Acknowledge</button>
            </div>
        </div>`).join("");
    if (urgent.length) markAlertsSeen(urgent.map((a) => a.id)).catch(() => {});
    stack.onclick = async (e) => {
        const act = e.target.closest("[data-alb-card-act]")?.dataset.albCardAct;
        const id = Number(e.target.closest("[data-alb-card]")?.dataset.albCard);
        const a = state.popups.find((x) => x.id === id);
        if (!act || !a) return;
        if (act === "later") {
            snoozedUrgent.add(id);
            stack.dataset.ids = "";
            renderStack();
        } else if (act === "view") {
            showPopup(a);
            stack.dataset.ids = "";
            renderStack();
        } else {
            e.target.disabled = true;
            const res = await acknowledgeAlert(id).catch(() => null);
            if (!res?.success) {
                e.target.disabled = false;
                showToast(res?.message || "Could not acknowledge. Try again.", "error");
                return;
            }
            if (res.data?.already) showToast(res.message, "success", 5000);
            state.popups = state.popups.filter((x) => x.id !== id);
            stack.dataset.ids = "";
            render();
            window.dispatchEvent(new CustomEvent("alerts:changed"));
            poll();
        }
    };
}
