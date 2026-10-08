import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { esc, ago, fmtDateTime } from "../alerts/alert-bell.js?v=11";

/*
 * Results inbox: the "!" in the top bar. New lab and radiology results for your patients
 * (you ordered them, they're your patients, or you're their nurse) until you open each one.
 * Critical results come first, in red. Opening a result from the list shows it straight away
 * and takes it off the "!". Right after signing in, the list opens by itself when something is new.
 *
 * Sign-off (Phase 2): doctors mark each result reviewed, with an optional action (repeat test,
 * call patient, ...) and comment. "To review" lists their patients' results not signed off yet;
 * those waiting longer than the set number of days are flagged (a red dot on the "!", and an alert).
 */

const POLL_MS = 60000;
const LOGIN_FLAG = "resultsInboxAtLogin";
const REASON = { ordering: "You ordered it", primary: "Your patient", nurse: "Your patient (nurse)" };
const FLAG_LABEL = { critical: "Critical", abnormal: "Abnormal", normal: "Normal" };

const REVIEW_ROLES = ["doctor", "clinician"];

let started = false;
let timer = null;
let me = null;
let reviewDays = 3;
let state = { new: 0, critical: 0, to_review: 0, review_overdue: 0 };
let view = "new";
let list = { items: [], server_time: null };

/** Set when the person signs in: the inbox opens by itself if something is new. */
export function markResultsInboxLogin() {
    try { sessionStorage.setItem(LOGIN_FLAG, "1"); } catch { /* storage blocked: no auto-open */ }
}

const CSS = `
.rib-wrap { position: relative; display: flex; align-items: center; height: 100%; }
.rib-btn { position: relative; width: 36px; height: 36px; border-radius: 50%; border: 0; background: transparent; color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; }
.rib-btn:hover, .rib-btn[aria-expanded="true"] { background: var(--bg-surface-alt); color: var(--text-primary); }
.rib-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.rib-btn .rib-mark { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid currentColor; font-size: 15px; font-weight: 900; line-height: 1; }
.rib-btn.has-new { color: #b45309; }
.rib-btn.has-new .rib-mark { background: #f59e0b; border-color: #f59e0b; color: #fff; }
.rib-btn.has-critical { color: #dc2626; }
.rib-btn.has-critical .rib-mark { background: #dc2626; border-color: #dc2626; color: #fff; animation: rib-pulse 1.6s ease-in-out infinite; }
@keyframes rib-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,.55); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } }
@media (prefers-reduced-motion: reduce) { .rib-btn.has-critical .rib-mark { animation: none; } }
.rib-count { position: absolute; top: 0; right: -2px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: #1f2937; color: #fff; font-size: 10.5px; font-weight: 700; line-height: 17px; text-align: center; box-shadow: 0 0 0 2px var(--bg-surface); }
.rib-btn.has-critical .rib-count { background: #991b1b; }
.rib-count[hidden] { display: none; }

.rib-panel { position: absolute; top: calc(100% - 4px); right: 0; width: 420px; max-width: calc(100vw - 24px); background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 16px 40px rgba(15,23,42,.18); z-index: 3000; overflow: hidden; display: none; font-size: 13px; }
.rib-panel.open { display: block; }
.rib-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px 8px; }
.rib-head strong { font-size: 14px; }
.rib-tabs { display: flex; gap: 4px; padding: 0 14px 8px; border-bottom: 1px solid var(--border-color); }
.rib-tab { border: 1px solid var(--border-color); background: transparent; color: var(--text-muted); border-radius: 999px; padding: 3px 11px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.rib-tab[aria-selected="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
.rib-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.rib-list { max-height: 460px; overflow-y: auto; }
.rib-item { display: flex; gap: 10px; padding: 10px 14px; border: 0; border-bottom: 1px solid var(--border-color); border-left: 4px solid transparent; cursor: pointer; text-align: left; width: 100%; background: none; color: inherit; font: inherit; }
.rib-item:hover, .rib-item:focus-visible { background: var(--bg-surface-alt); outline: none; }
.rib-item.new { background: var(--accent-light); }
.rib-item.critical { border-left-color: #dc2626; background: #fef2f2; }
.rib-item.critical .rib-title { color: #b91c1c; }
.rib-item.critical:hover, .rib-item.critical:focus-visible { background: #fee2e2; }
:root[data-theme="dark"] .rib-item.critical { background: #2a1214; }
:root[data-theme="dark"] .rib-item.critical .rib-title { color: #fca5a5; }
:root[data-theme="dark"] .rib-item.critical:hover { background: #3b1418; }
.rib-item.opened { opacity: .75; }
.rib-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: transparent; }
.rib-item.new .rib-dot { background: var(--accent); }
.rib-item.critical.new .rib-dot { background: #dc2626; }
.rib-main { min-width: 0; flex: 1; }
.rib-title { font-weight: 700; line-height: 1.35; overflow-wrap: anywhere; }
.rib-sum { margin-top: 2px; overflow-wrap: anywhere; }
.rib-sub { color: var(--text-muted); font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
.rib-empty { padding: 28px 14px; text-align: center; color: var(--text-muted); }
.rib-pill { display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; padding: 1px 7px; border-radius: 10px; margin-right: 5px; vertical-align: 1px; background: var(--bg-surface-alt); color: var(--text-muted); }
.rib-pill.critical { background: #dc2626; color: #fff; }
.rib-pill.abnormal { background: #fef3c7; color: #92400e; }
.rib-pill.corrected { background: #ede9fe; color: #5b21b6; }
:root[data-theme="dark"] .rib-pill.abnormal { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .rib-pill.corrected { background: #4c1d95; color: #ddd6fe; }

.rib-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4800; display: none; align-items: center; justify-content: center; padding: 16px; }
.rib-overlay.open { display: flex; }
.rib-modal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 760px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.35); border-top: 6px solid var(--accent); overflow: hidden; }
.rib-modal.critical { border-top-color: #dc2626; }
.rib-mhead { padding: 16px 20px 8px; }
.rib-mhead h2 { margin: 4px 0 4px; font-size: 18px; line-height: 1.3; overflow-wrap: anywhere; }
.rib-meta { color: var(--text-muted); font-size: 12.5px; display: flex; flex-wrap: wrap; gap: 4px 14px; }
.rib-mbody { padding: 6px 20px 8px; overflow: auto; }
.rib-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rib-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .03em; color: var(--text-muted); padding: 7px 8px; border-bottom: 1px solid var(--border-color); }
.rib-table td { padding: 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; overflow-wrap: anywhere; }
.rib-table tr.critical td { background: #fef2f2; color: #991b1b; font-weight: 600; }
.rib-table tr.abnormal td.v { color: #b45309; font-weight: 700; }
:root[data-theme="dark"] .rib-table tr.critical td { background: #2a1214; color: #fecaca; }
:root[data-theme="dark"] .rib-table tr.abnormal td.v { color: #fbbf24; }
.rib-table td.v { font-weight: 700; white-space: pre-wrap; }
.rib-detail { display: block; font-size: 11.5px; font-weight: 500; opacity: .85; }
.rib-note { margin: 8px 0 0; padding: 8px 10px; border-radius: 8px; background: #fef2f2; color: #991b1b; font-size: 12.5px; }
:root[data-theme="dark"] .rib-note { background: #2a1214; color: #fecaca; }
.rib-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 12px 20px 16px; border-top: 1px solid var(--border-color); }
.rib-left { margin-right: auto; color: var(--text-muted); font-size: 12.5px; align-self: center; }
.rib-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.rib-b:hover { background: var(--bg-surface-alt); }
.rib-b.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.rib-b:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.rib-btn.has-late::after { content: ""; position: absolute; bottom: 3px; right: 3px; width: 9px; height: 9px; border-radius: 50%; background: #dc2626; box-shadow: 0 0 0 2px var(--bg-surface); }
.rib-red { color: #dc2626; }
:root[data-theme="dark"] .rib-red { color: #f87171; }
.rib-late-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #dc2626; vertical-align: 1px; margin-left: 2px; }
.rib-note-sm { padding: 6px 14px; font-size: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); }
.rib-rev { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.rib-rev.ok { color: #15803d; }
.rib-rev.late { color: #b91c1c; }
:root[data-theme="dark"] .rib-rev.ok { color: #86efac; }
:root[data-theme="dark"] .rib-rev.late { color: #fca5a5; }
.rib-item.late:not(.critical) { border-left-color: #f87171; }
.rib-set { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 10px 14px; border-top: 1px solid var(--border-color); font-size: 12.5px; color: var(--text-muted); }
.rib-set label { font-weight: 600; }
.rib-set input { width: 64px; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 6px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.rib-set .rib-b { padding: 4px 10px; font-size: 12px; }
.rib-signoff { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color); }
.rib-signoff h3 { margin: 0 0 8px; font-size: 14px; }
.rib-rev-box { border-radius: 8px; padding: 8px 10px; background: var(--bg-surface-alt); font-size: 13px; }
.rib-rev-box.ok { background: #f0fdf4; color: #14532d; }
.rib-rev-box.late { background: #fef2f2; color: #991b1b; }
:root[data-theme="dark"] .rib-rev-box.ok { background: #052e16; color: #bbf7d0; }
:root[data-theme="dark"] .rib-rev-box.late { background: #2a1214; color: #fecaca; }
.rib-form { margin-top: 10px; }
.rib-form-row { display: flex; flex-wrap: wrap; gap: 10px; }
.rib-form-row > div { min-width: 180px; }
.rib-form-row .grow { flex: 1 1 260px; }
.rib-form label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.rib-opt { font-weight: 400; }
.rib-form select, .rib-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
.rib-form textarea { resize: vertical; min-height: 40px; }
.rib-form [aria-invalid="true"] { border-color: #dc2626; }
.rib-err { color: #dc2626; font-size: 12px; min-height: 1em; margin-top: 4px; }
.rib-form-actions { display: flex; gap: 8px; justify-content: flex-end; }
.rib-link { background: none; border: 0; color: var(--accent); font: inherit; font-size: 12.5px; cursor: pointer; padding: 6px 0 0; }
.rib-link:hover { text-decoration: underline; }
.rib-hist { margin-top: 8px; font-size: 12.5px; color: var(--text-muted); }
.rib-hist ul { margin: 6px 0 0; padding-left: 18px; }
@media (max-width: 600px) {
    .rib-panel { position: fixed; top: 56px; right: 12px; left: 12px; width: auto; }
    .rib-table thead { display: none; }
    .rib-table tr { display: block; border-bottom: 1px solid var(--border-color); padding: 4px 0; }
    .rib-table td { display: block; border: 0; padding: 2px 8px; }
}
`;

function ensureDom() {
    if (!document.getElementById("rib-style")) {
        const style = document.createElement("style");
        style.id = "rib-style";
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    if (!document.getElementById("ribOverlay")) {
        const overlay = document.createElement("div");
        overlay.className = "rib-overlay";
        overlay.id = "ribOverlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "ribModalTitle");
        overlay.innerHTML = `<div class="rib-modal" id="ribModal"></div>`;
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeResult();
        });
        document.body.appendChild(overlay);
    }
}

/** Put the "!" in the top bar (before the alert bell) and start checking for new results. */
export function initResultsInbox(user) {
    if (!user || user.role === "patient") return;
    me = user;
    ensureDom();
    const right = document.querySelector(".navbar-right");
    if (right && !document.getElementById("ribWrap")) {
        const wrap = document.createElement("div");
        wrap.className = "rib-wrap";
        wrap.id = "ribWrap";
        wrap.innerHTML = `
            <button type="button" class="rib-btn" id="ribBtn" aria-haspopup="true" aria-expanded="false" aria-controls="ribPanel" aria-label="Results inbox" title="Results inbox">
                <span class="rib-mark" aria-hidden="true">!</span><span class="rib-count" id="ribCount" hidden>0</span>
            </button>
            <div class="rib-panel" id="ribPanel" role="region" aria-label="Results inbox"></div>`;
        right.insertBefore(wrap, document.getElementById("albWrap") || right.querySelector(".nav-profile") || null);
        wrap.querySelector("#ribBtn").addEventListener("click", (e) => {
            e.stopPropagation();
            togglePanel();
        });
        wrap.querySelector("#ribPanel").addEventListener("click", onPanelClick);
    }
    if (started) {
        render();
        return;
    }
    started = true;
    document.addEventListener("click", (e) => {
        if (document.getElementById("ribPanel")?.classList.contains("open") && !e.target.closest("#ribWrap")) closePanel();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (document.getElementById("ribOverlay")?.classList.contains("open")) {
            closeResult();
        } else if (document.getElementById("ribPanel")?.classList.contains("open")) {
            closePanel();
            document.getElementById("ribBtn")?.focus();
        }
    });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) poll();
    });
    window.addEventListener("hashchange", () => {
        if (!/^#\/?dashboard/.test(location.hash)) stop();
    });
    poll(true);
}

function stop() {
    clearTimeout(timer);
    timer = null;
    started = false;
    state = { new: 0, critical: 0, to_review: 0, review_overdue: 0 };
    closeResult();
}

/** Re-check now (e.g. after results were saved in this tab). */
export function refreshResultsInbox() {
    return poll();
}

async function poll(first = false) {
    clearTimeout(timer);
    if (!started) return;
    const res = await api("/results-inbox/count").catch(() => null);
    if (res?.success) {
        state = res.data;
        render();
        let atLogin = false;
        try {
            atLogin = first && sessionStorage.getItem(LOGIN_FLAG) === "1";
            if (first) sessionStorage.removeItem(LOGIN_FLAG);
        } catch { /* storage blocked */ }
        // Just signed in with new results (or results waiting too long for sign-off): show them.
        if (atLogin && (state.new > 0 || state.review_overdue > 0)) openPanel(state.new > 0 ? "new" : "review");
    }
    if (started) timer = setTimeout(poll, POLL_MS);
}

function setCounts(d) {
    state = { new: d.new ?? 0, critical: d.critical ?? 0, to_review: d.to_review ?? 0, review_overdue: d.review_overdue ?? 0 };
    render();
}

function render() {
    const btn = document.getElementById("ribBtn");
    const count = document.getElementById("ribCount");
    if (!btn) return;
    btn.classList.toggle("has-new", state.new > 0 && !state.critical);
    btn.classList.toggle("has-critical", state.critical > 0);
    btn.classList.toggle("has-late", state.review_overdue > 0);
    count.hidden = state.new === 0;
    count.textContent = state.new > 99 ? "99+" : String(state.new);
    const parts = [];
    if (state.new) parts.push(`${state.new} new result${state.new > 1 ? "s" : ""}${state.critical ? `, ${state.critical} critical` : ""}`);
    if (state.review_overdue) parts.push(`${state.review_overdue} not reviewed in time`);
    const label = `Results inbox, ${parts.length ? parts.join("; ") : "nothing new"}`;
    btn.setAttribute("aria-label", label);
    btn.title = label;
}

const isReviewer = () => REVIEW_ROLES.includes(me?.role);
const isAdmin = () => me?.role === "admin";

/* ---------------- the list ---------------- */

async function loadList() {
    const res = await api(`/results-inbox?view=${view}`).catch(() => null);
    if (!res?.success) {
        list = { items: [], server_time: null, error: res?.message || "Could not load the results." };
    } else {
        list = res.data;
        reviewDays = res.data.review_days ?? reviewDays;
        setCounts(res.data);
    }
    renderPanel();
}

/** "Reviewed ✓ Repeat test" / "Not reviewed · 4 days" (red when over the limit). */
function reviewLine(r) {
    if (r.reviewed_at) return `<span class="rib-rev ok">✓ Reviewed${r.reviewed_by_name ? ` by ${esc(r.reviewed_by_name)}` : ""}${r.review_action && r.review_action !== "none" ? ` · ${esc(r.review_action_label)}` : ""}</span>`;
    if (r.days_waiting == null) return "";
    const days = `${r.days_waiting} day${r.days_waiting === 1 ? "" : "s"}`;
    return r.review_overdue
        ? `<span class="rib-rev late">⚑ Not reviewed · ${days} (limit ${reviewDays})</span>`
        : view === "review" || view === "overdue" ? `<span class="rib-rev">Not reviewed · ${r.days_waiting ? days : "today"}</span>` : "";
}

function itemHtml(r) {
    const cls = ["rib-item", r.opened_at || r.id == null ? "opened" : "new", r.critical ? "critical" : "", r.review_overdue ? "late" : ""].join(" ");
    const pills = [
        r.critical ? `<span class="rib-pill critical">Critical</span>` : r.abnormal ? `<span class="rib-pill abnormal">Abnormal</span>` : "",
        `<span class="rib-pill">${r.kind === "radiology" ? "Radiology" : "Lab"}</span>`,
        r.corrected ? `<span class="rib-pill corrected">Corrected</span>` : "",
    ].join("");
    const who = view === "overdue" ? (r.ordering_doctor ? `Ordered by ${r.ordering_doctor}` : "No ordering doctor") : REASON[r.reason];
    const sub = [r.location, who, ago(r.resulted_at, list.server_time), r.opened_at && view !== "review" ? "opened" : ""].filter(Boolean).join(" · ");
    const summary = r.summary || `${r.results} result${r.results === 1 ? "" : "s"}`;
    return `<button type="button" class="${cls}" ${r.id != null ? `data-rib-id="${r.id}"` : `data-rib-order="${r.order_id}"`}>
        <span class="rib-dot" aria-hidden="true"></span>
        <span class="rib-main">
            <span class="rib-title" style="display:block">${pills}${esc(r.patient_name)} — ${esc(r.test_name || "Result")}</span>
            <span class="rib-sum" style="display:block">${esc(summary)}</span>
            <span class="rib-sub" style="display:block">${esc(sub)}</span>
            ${reviewLine(r) ? `<span style="display:block;margin-top:3px">${reviewLine(r)}</span>` : ""}
        </span>
    </button>`;
}

function renderPanel() {
    const panel = document.getElementById("ribPanel");
    if (!panel) return;
    const items = list.items || [];
    const empty = list.error ? esc(list.error) : {
        new: "No new results. You've opened them all.",
        review: "Nothing waiting for your sign-off.",
        overdue: "No result is waiting longer than the limit.",
        recent: "No results in the last 14 days.",
    }[view];
    const tab = (v, label) => `<button type="button" class="rib-tab" role="tab" data-rib-view="${v}" aria-selected="${view === v}">${label}</button>`;
    const head = [state.new ? `${state.new} new${state.critical ? ` · <b class="rib-red">${state.critical} critical</b>` : ""}` : "Nothing new",
        state.review_overdue ? `<b class="rib-red">${state.review_overdue} overdue for review</b>` : ""].filter(Boolean).join(" · ");
    panel.innerHTML = `
        <div class="rib-head"><strong>Results inbox</strong><span class="rib-sub" style="margin:0">${head}</span></div>
        <div class="rib-tabs" role="tablist">
            ${tab("new", `New${state.new ? ` (${state.new})` : ""}`)}
            ${isReviewer() || state.to_review ? tab("review", `To review${state.to_review ? ` (${state.to_review})` : ""}${state.review_overdue ? ` <span class="rib-late-dot" aria-label="${state.review_overdue} overdue"></span>` : ""}`) : ""}
            ${tab("recent", "Last 14 days")}
            ${isAdmin() ? tab("overdue", "Overdue (all)") : ""}
        </div>
        ${view === "review" ? `<div class="rib-note-sm">Your patients' results not yet signed off. Flagged after ${reviewDays} day${reviewDays === 1 ? "" : "s"}.</div>` : ""}
        <div class="rib-list">${items.length ? items.map(itemHtml).join("") : `<div class="rib-empty">${empty}</div>`}</div>
        ${isAdmin() ? `<form class="rib-set" data-rib-set>
            <label for="ribDays">Flag results not reviewed after</label>
            <input id="ribDays" type="number" min="1" max="60" step="1" value="${reviewDays}" required> days
            <button type="submit" class="rib-b">Save</button></form>` : ""}`;
    panel.querySelector("[data-rib-set]")?.addEventListener("submit", saveDays);
}

async function saveDays(e) {
    e.preventDefault();
    const input = document.getElementById("ribDays");
    const res = await api("/results-review/settings", { method: "POST", body: JSON.stringify({ review_days: input.value }) }).catch(() => null);
    if (!res?.success) {
        showToast(res?.message || "Could not save.", "error");
        input.focus();
        return;
    }
    reviewDays = res.data.days;
    showToast(res.message, "success");
    loadList();
}

function openPanel(startView = "new") {
    const panel = document.getElementById("ribPanel");
    if (!panel) return;
    view = startView;
    list = { items: [], server_time: null };
    panel.innerHTML = `<div class="rib-empty">Loading…</div>`;
    panel.classList.add("open");
    document.getElementById("ribBtn")?.setAttribute("aria-expanded", "true");
    loadList();
}

function togglePanel() {
    if (document.getElementById("ribPanel")?.classList.contains("open")) closePanel();
    else openPanel();
}

function closePanel() {
    document.getElementById("ribPanel")?.classList.remove("open");
    document.getElementById("ribBtn")?.setAttribute("aria-expanded", "false");
}

function onPanelClick(e) {
    if (e.target.closest("[data-rib-set]")) return;
    const tab = e.target.closest("[data-rib-view]");
    if (tab) {
        view = tab.dataset.ribView;
        loadList();
        return;
    }
    const el = e.target.closest("[data-rib-id], [data-rib-order]");
    if (!el) return;
    if (el.dataset.ribId) openResult({ id: Number(el.dataset.ribId) });
    else openResult({ order_id: Number(el.dataset.ribOrder) });
}

/* ---------------- one result ---------------- */

/** Open one order's result (an alert's link, Patient Results' "Review"). */
export function openResultByOrder(orderId) {
    ensureDom();
    return openResult({ order_id: Number(orderId) });
}

async function openResult(ref) {
    ensureDom();
    const overlay = document.getElementById("ribOverlay");
    const modal = document.getElementById("ribModal");
    closePanel();
    modal.className = "rib-modal";
    modal.innerHTML = `<div class="rib-mhead"><h2 id="ribModalTitle">Opening the result…</h2></div>`;
    overlay.classList.add("open");
    const res = await api("/results-inbox/open", { method: "POST", body: JSON.stringify(ref) }).catch(() => null);
    if (!res?.success) {
        closeResult();
        showToast(res?.message || "Could not open the result.", "error");
        poll();
        return;
    }
    const { item, order, results, review } = res.data;
    reviewDays = review.review_days ?? reviewDays;
    setCounts(res.data);
    const critical = results.some((r) => r.flag === "critical");
    modal.className = `rib-modal${critical ? " critical" : ""}`;
    const meta = [
        order.patient_no ? `MRN ${order.patient_no}` : "", order.location, order.kind === "radiology" ? "Radiology" : "Lab",
        order.ordering_doctor ? `Ordered by ${order.ordering_doctor}` : "", order.entered_by ? `Resulted by ${order.entered_by}` : "",
        order.reported_at ? fmtDateTime(order.reported_at) : "",
    ].filter(Boolean);
    const rows = results.map((r) => {
        const flag = r.flag || (Number(r.is_abnormal) === 1 ? "abnormal" : "");
        return `<tr class="${esc(flag)}">
            <td>${esc(r.name)}${r.code ? `<span class="rib-detail">${esc(r.code)}</span>` : ""}</td>
            <td class="v">${esc(r.value ?? "")}</td><td>${esc(r.units ?? "")}</td><td>${esc(r.reference_range ?? "")}</td>
            <td>${flag ? `${flag === "critical" ? "⚠ " : ""}${FLAG_LABEL[flag] || esc(flag)}${r.flag_detail && flag !== "normal" ? `<span class="rib-detail">${esc(r.flag_detail)}</span>` : ""}` : "—"}</td>
        </tr>`;
    }).join("");
    modal.innerHTML = `
        <div class="rib-mhead">
            <div>${critical ? `<span class="rib-pill critical">Critical</span>` : ""}${item?.corrected ? `<span class="rib-pill corrected">Corrected result</span>` : ""}</div>
            <h2 id="ribModalTitle">${esc(order.patient_name)} — ${esc(order.test_name || "Result")}</h2>
            <div class="rib-meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</div>
            ${critical ? `<p class="rib-note">Critical result: acknowledge the critical lab alert with the read-back (bell or the chart's red banner).</p>` : ""}
        </div>
        <div class="rib-mbody">
            ${results.length ? `<table class="rib-table"><thead><tr><th>Test</th><th>Value</th><th>Units</th><th>Range</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table>`
                : `<p class="rib-empty">The results were removed from this order.</p>`}
            <section class="rib-signoff" data-rib-signoff aria-labelledby="ribSignTitle"></section>
        </div>
        <div class="rib-actions">
            <span class="rib-left" data-rib-left></span>
            <button type="button" class="rib-b" data-rib-act="close">Close</button>
            <button type="button" class="rib-b" data-rib-act="chart">Open patient chart</button>
            <button type="button" class="rib-b primary" data-rib-act="next" hidden>Next new result</button>
        </div>`;
    modal.querySelector("[data-rib-act=close]").onclick = closeResult;
    modal.querySelector("[data-rib-act=chart]").onclick = () => {
        closeResult();
        window.__openPatientChartFromReport?.(order.patient_no || order.patient_id);
    };
    modal.querySelector("[data-rib-act=next]").onclick = openNext;
    renderSignoff(modal, order, review, results.length > 0);
    renderFooter(modal);
    const focus = modal.querySelector("[data-rib-act=next]:not([hidden])") || modal.querySelector("#ribAction") || modal.querySelector("[data-rib-act=close]");
    focus.focus();
}

function renderFooter(modal) {
    const next = modal.querySelector("[data-rib-act=next]");
    const left = modal.querySelector("[data-rib-left]");
    next.hidden = !state.new;
    left.textContent = state.new ? `${state.new} more new` : state.to_review ? `${state.to_review} to review` : "No more new results";
}

/** The sign-off: who reviewed it and what is to be done, or the form to mark it reviewed. */
function renderSignoff(modal, order, review, hasResults) {
    const box = modal.querySelector("[data-rib-signoff]");
    if (!hasResults) {
        box.innerHTML = "";
        return;
    }
    const days = review.days_waiting ?? 0;
    const status = review.reviewed
        ? `<div class="rib-rev-box ok"><strong>✓ Reviewed</strong> by ${esc(review.reviewed_by_name || "")} · ${esc(fmtDateTime(review.reviewed_at))}
            <div>${esc(review.action_label || "")}${review.comment ? ` — ${esc(review.comment)}` : ""}</div></div>`
        : `<div class="rib-rev-box ${review.overdue ? "late" : ""}"><strong>${review.overdue ? "⚑ " : ""}Not reviewed</strong>
            ${review.results_at ? ` · out for ${days ? `${days} day${days === 1 ? "" : "s"}` : "less than a day"}${review.overdue ? ` — over the ${review.review_days}-day limit` : ` (to be reviewed within ${review.review_days} day${review.review_days === 1 ? "" : "s"})`}` : ""}</div>`;
    const history = review.history?.length
        ? `<details class="rib-hist"><summary>Earlier sign-offs (${review.history.length})</summary><ul>${review.history.map((h) =>
            `<li>${esc(fmtDateTime(h.reviewed_at))} · ${esc(h.reviewed_by_name || "")} · ${esc(h.action_label)}${h.comment ? ` — ${esc(h.comment)}` : ""}</li>`).join("")}</ul></details>` : "";
    const form = review.can_review ? `
        <form class="rib-form" data-rib-form ${review.reviewed ? "hidden" : ""} novalidate>
            <div class="rib-form-row">
                <div><label for="ribAction">Action</label>
                    <select id="ribAction">${Object.entries(review.actions).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></div>
                <div class="grow"><label for="ribComment">Comment <span class="rib-opt">(optional)</span></label>
                    <textarea id="ribComment" maxlength="1000" rows="2" placeholder="e.g. Repeat potassium tomorrow morning; call the patient with the result"></textarea></div>
            </div>
            <div class="rib-err" role="alert"></div>
            <div class="rib-form-actions">
                ${review.reviewed ? `<button type="button" class="rib-b" data-rib-cancel>Cancel</button>` : ""}
                <button type="submit" class="rib-b primary">Mark reviewed</button></div>
        </form>
        ${review.reviewed ? `<button type="button" class="rib-link" data-rib-again>Sign off again (change the action or comment)</button>` : ""}` : "";
    box.innerHTML = `<h3 id="ribSignTitle">Sign-off</h3>${status}${form}${history}`;
    const f = box.querySelector("[data-rib-form]");
    if (!f) return;
    box.querySelector("[data-rib-again]")?.addEventListener("click", (e) => {
        e.target.hidden = true;
        f.hidden = false;
        box.querySelector("#ribAction").value = review.action || "none";
        box.querySelector("#ribComment").value = review.comment || "";
        box.querySelector("#ribAction").focus();
    });
    box.querySelector("[data-rib-cancel]")?.addEventListener("click", () => renderSignoff(modal, order, review, true));
    f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = f.querySelector(".rib-err");
        const action = f.querySelector("#ribAction").value;
        const comment = f.querySelector("#ribComment").value.trim();
        f.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
        if (action === "other" && !comment) {
            err.textContent = "Say what is to be done.";
            f.querySelector("#ribComment").setAttribute("aria-invalid", "true");
            f.querySelector("#ribComment").focus();
            return;
        }
        err.textContent = "";
        const btn = f.querySelector("button[type=submit]");
        btn.disabled = true;
        const res = await api("/results-review", { method: "POST", body: JSON.stringify({ order_id: order.id, action, comment }) }).catch(() => null);
        btn.disabled = false;
        if (!res?.success) {
            err.textContent = res?.message || "Could not save. Try again.";
            const field = res?.errors?.comment ? "#ribComment" : res?.errors?.action ? "#ribAction" : null;
            if (field) {
                f.querySelector(field).setAttribute("aria-invalid", "true");
                f.querySelector(field).focus();
            }
            return;
        }
        showToast(res.message, "success");
        renderSignoff(modal, order, res.data, true);
        window.dispatchEvent(new CustomEvent("results-reviewed", { detail: { orderId: order.id } }));
        await poll();
        renderFooter(modal);
        modal.querySelector("[data-rib-act=next]:not([hidden])")?.focus();
    });
}

/** Straight to the next new one: critical first. */
async function openNext() {
    const res = await api("/results-inbox?view=new").catch(() => null);
    const first = res?.success ? res.data.items[0] : null;
    if (!first) {
        closeResult();
        poll();
        return;
    }
    openResult({ id: first.id });
}

function closeResult() {
    document.getElementById("ribOverlay")?.classList.remove("open");
}
