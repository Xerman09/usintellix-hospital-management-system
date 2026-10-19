import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";
import { ensureCss, esc, when, dayLabel, categoryLabel, KIND_LABEL } from "./mychart-ui.js?v=2";

/*
 * My Chart -> Test Results (module: patient portal, Phase 1).
 *
 * Shows the patient only what has been released to them: the lab releases a result,
 * then a per-section waiting time passes, and a critical result is held back until a
 * doctor has spoken to them. All of that is decided in the backend
 * (PortalResultService) -- this screen just lists what it is given, so there is no
 * way for the UI to reveal something that is being withheld.
 *
 * "Unread" is remembered per device in localStorage: the server does not yet track
 * which results a patient has opened. Phase 6 (To-Do and notifications) introduces a
 * proper read marker, and this should move onto it then.
 */

const SEEN_KEY = "mychart_results_seen";
let state = { kind: "", from: "", to: "", q: "" };
let data = null;
let openOrder = null;

export function MyChartResultsView() {
    return `<div class="mc" id="mcResults"><div class="mc-empty">Loading your results…</div></div>`;
}

/* ---------------- read / unread, per device ---------------- */

function seenSet() {
    try {
        return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
    } catch (e) {
        return new Set();
    }
}

function markSeen(orderId) {
    try {
        const s = seenSet();
        s.add(Number(orderId));
        localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500)));
    } catch (e) {
        // A private window with storage blocked: everything simply stays unread.
    }
}

/* ---------------- the screen ---------------- */

export async function initMyChartResults() {
    ensureCss();
    await load();
}

async function load() {
    const root = document.getElementById("mcResults");
    if (!root) return;

    const q = new URLSearchParams(Object.fromEntries(Object.entries(state).filter(([, v]) => v !== "")));
    const res = await api(`/mychart/results?${q}`).catch(() => null);

    if (!res?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(res?.message || "Your results could not be loaded. Please try again.")}</div>`;
        return;
    }

    data = res.data;
    render();

    // Keep an open result open across a filter change or a refresh -- but only here, where
    // new data has just arrived. render() must never re-open anything itself, or it and
    // openResult() call each other for ever.
    if (openOrder) {
        if (data.items.some((x) => x.order_id === openOrder)) {
            void openResult(openOrder);
        } else {
            openOrder = null;
            const panel = document.getElementById("mcDetail");
            if (panel) panel.innerHTML = "";
        }
    }
}

function render() {
    const root = document.getElementById("mcResults");
    if (!root) return;

    const seen = seenSet();
    const unread = data.items.filter((x) => !seen.has(x.order_id)).length;

    root.innerHTML = `
        <div class="mc-head">
            <h1>Test results</h1>
            <p class="mc-sub">Your laboratory results and imaging reports, newest first. A result appears here once it has been
                checked and released. If something needs explaining, your doctor will go through it with you — you can also ask
                them a question from the result itself.</p>
        </div>
        <div class="mc-tools">
            <select id="mcKind" aria-label="Kind of result">
                <option value="">All results</option>
                <option value="lab" ${state.kind === "lab" ? "selected" : ""}>Laboratory</option>
                <option value="imaging" ${state.kind === "imaging" ? "selected" : ""}>Imaging</option>
            </select>
            <label class="muted" for="mcFrom" style="font-size:12.5px">From</label>
            <input type="date" id="mcFrom" value="${esc(state.from)}" max="${esc(todayISO())}" aria-label="From date">
            <label class="muted" for="mcTo" style="font-size:12.5px">to</label>
            <input type="date" id="mcTo" value="${esc(state.to)}" max="${esc(todayISO())}" aria-label="To date">
            <input type="search" id="mcQ" value="${esc(state.q)}" placeholder="Find a test" aria-label="Find a test">
            ${state.kind || state.from || state.to || state.q ? `<button type="button" class="mc-b sm" id="mcClear">Clear</button>` : ""}
            <span class="muted" id="mcUnread" style="font-size:12.5px">${unread ? `${unread} not opened yet` : ""}</span>
        </div>
        ${data.items.length ? `<div class="mc-list" id="mcList">${data.items.map((x) => row(x, seen)).join("")}</div>`
            : `<div class="mc-empty">No results to show yet. A result appears here once the laboratory or the radiologist has released it.</div>`}
        <div id="mcDetail" aria-live="polite"></div>`;

    bind();
}

/** Mark the open row as read and expanded, without re-rendering (see load()). */
function refreshRowMarkers() {
    const seen = seenSet();
    document.querySelectorAll("#mcList [data-order]").forEach((btn) => {
        const id = Number(btn.dataset.order);
        btn.setAttribute("aria-expanded", String(openOrder === id));
        const dot = btn.querySelector(".mc-dot");
        if (dot && seen.has(id)) {
            dot.classList.add("seen");
            dot.removeAttribute("title");
            dot.setAttribute("aria-hidden", "true");
        }
    });
    const left = data ? data.items.filter((x) => !seen.has(x.order_id)).length : 0;
    const count = document.getElementById("mcUnread");
    if (count) count.textContent = left ? `${left} not opened yet` : "";
}

function row(x, seen) {
    const isSeen = seen.has(x.order_id);
    const cat = categoryLabel(x.category);
    return `<button type="button" class="mc-row" data-order="${x.order_id}" aria-expanded="${openOrder === x.order_id}">
        <span class="mc-dot ${isSeen ? "seen" : ""}" ${isSeen ? 'aria-hidden="true"' : 'title="Not opened yet"'}></span>
        <span class="mc-main">
            <span class="mc-name">${esc(x.test_name || "Result")}</span>
            <span class="mc-chip kind">${esc(KIND_LABEL[x.kind] || x.kind)}</span>
            ${x.abnormal > 0 ? `<span class="mc-chip abn">${x.abnormal} outside the usual range</span>` : ""}
            <span class="mc-meta">${[cat, x.collected_at ? `Sample taken ${dayLabel(x.collected_at)}` : "",
                x.ordering_doctor ? `Ordered by ${esc(x.ordering_doctor)}` : ""].filter(Boolean).join(" · ")}</span>
        </span>
        <span class="mc-right">${esc(when(x.released_at || x.resulted_at))}<br>${x.results} ${x.results === 1 ? "item" : "items"}</span>
    </button>`;
}

function bind() {
    const root = document.getElementById("mcResults");

    const set = (id, key, ev = "change") => {
        const el = root.querySelector(id);
        if (el) {
            el.addEventListener(ev, (e) => {
                state[key] = e.target.value;
                load();
            });
        }
    };
    set("#mcKind", "kind");
    set("#mcFrom", "from");
    set("#mcTo", "to");

    const q = root.querySelector("#mcQ");
    if (q) {
        let t = null;
        q.addEventListener("input", (e) => {
            clearTimeout(t);
            const v = e.target.value;
            t = setTimeout(() => {
                state.q = v.trim();
                load();
            }, 350);
        });
    }

    const clear = root.querySelector("#mcClear");
    if (clear) {
        clear.onclick = () => {
            state = { kind: "", from: "", to: "", q: "" };
            load();
        };
    }

    const list = root.querySelector("#mcList");
    if (list) {
        list.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-order]");
            if (btn) void openResult(Number(btn.dataset.order));
        });
    }
}

/* ---------------- one result ---------------- */

async function openResult(orderId) {
    const panel = document.getElementById("mcDetail");
    if (!panel) return;

    openOrder = orderId;
    panel.innerHTML = `<div class="mc-panel">Opening…</div>`;

    const res = await api(`/mychart/results/show?order_id=${encodeURIComponent(orderId)}`).catch(() => null);

    if (!res?.success) {
        panel.innerHTML = "";
        openOrder = null;
        showToast(res?.message || "That result could not be opened.", "error", 6000);
        return;
    }

    markSeen(orderId);
    const d = res.data;
    const meta = [
        KIND_LABEL[d.kind] || d.kind,
        categoryLabel(d.category),
        d.specimen ? `Sample: ${d.specimen}` : "",
        d.collected_at ? `Taken ${when(d.collected_at)}` : "",
        d.ordering_doctor ? `Ordered by ${d.ordering_doctor}` : "",
    ].filter(Boolean);

    const rows = d.results.map((r) => `<tr class="${r.abnormal ? "abn" : ""}">
        <td>${esc(r.name)}</td>
        <td class="n">${esc(r.value ?? "")}</td>
        <td>${esc(r.units ?? "")}</td>
        <td>${esc(r.reference_range ?? "—")}</td>
        <td>${r.abnormal ? "Outside the usual range" : "Usual range"}</td>
    </tr>`).join("");

    panel.innerHTML = `<div class="mc-panel">
        <h2>${esc(d.test_name || "Result")}</h2>
        <div class="mc-meta">${meta.map((m) => esc(m)).join(" · ")}</div>
        ${d.kind === "imaging" && d.report ? report(d.report) : ""}
        ${d.results.length ? `<table class="mc-tbl"><thead><tr><th>Test</th><th class="n">Result</th><th>Units</th><th>Usual range</th><th>&nbsp;</th></tr></thead>
            <tbody>${rows}</tbody></table>` : ""}
        <div class="mc-note">A result outside the usual range is common and does not always mean something is wrong — the usual
            range is what most healthy people fall within, and your doctor reads your result alongside everything else they know
            about you. ${d.kind === "imaging" ? "The report above is written by the radiologist for your doctor, so it uses medical words." : ""}</div>
        <div style="margin-top:12px"><button type="button" class="mc-b sm" id="mcClose">Close</button></div>
    </div>`;

    panel.querySelector("#mcClose").onclick = () => {
        openOrder = null;
        panel.innerHTML = "";
        refreshRowMarkers();
    };
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    refreshRowMarkers();
}

function report(r) {
    const block = (title, text) => (text ? `<section><h3>${esc(title)}</h3><p>${esc(text)}</p></section>` : "");
    return `<div class="mc-report">
        ${r.is_addendum ? `<section><h3>Note</h3><p>This report has an addition made after it was first signed.</p></section>` : ""}
        ${block("What was done", r.technique)}
        ${block("Compared with", r.comparison)}
        ${block("Findings", r.findings)}
        ${block("Impression", r.impression)}
        ${block("Advice to your doctor", r.recommendation)}
        ${r.signed_at ? `<section><h3>Signed</h3><p>${esc(when(r.signed_at))}</p></section>` : ""}
    </div>`;
}
