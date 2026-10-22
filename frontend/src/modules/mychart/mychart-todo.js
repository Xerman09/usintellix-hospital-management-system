import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { ensureCss, esc, when } from "./mychart-ui.js?v=11";

/*
 * My Chart -> To Do (patient portal, Phase 6).
 *
 * Everything waiting for the patient in one list -- results to read, unread messages,
 * check-in, consents, a balance, what is due -- plus the notifications they have been
 * sent and the settings for what they want to hear about.
 *
 * Nothing is computed here: each item arrives from the part of the portal that owns it,
 * so this screen cannot drift from what those screens show.
 */

let data = null;
let prefs = null;
let showSettings = false;

export function MyChartTodoView() {
    return `<div class="mc" id="mcTodo"><div class="mc-empty">Loading…</div></div>`;
}

export async function initMyChartTodo() {
    ensureCss();
    await load();
}

async function load() {
    const root = document.getElementById("mcTodo");
    if (!root) return;

    const res = await api("/mychart/todo").catch(() => null);

    if (!res?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(res?.message || "Your list could not be loaded. Please try again.")}</div>`;
        return;
    }

    data = res.data;
    render();
}

const URGENCY_WORD = { overdue: "Overdue", todo: "To do", info: "" };

function render() {
    const root = document.getElementById("mcTodo");
    const n = data.notifications;

    root.innerHTML = `
        <div class="mc-head">
            <h1>To do</h1>
            <p class="mc-sub">What is waiting for you. Everything here links to the part of My Chart that deals with it.</p>
        </div>

        <div class="mc-todobar">
            <div class="mc-todocount ${data.counts.overdue ? "due" : ""}">
                <span class="mc-bill-label">${data.counts.total === 0 ? "All clear" : "Things to do"}</span>
                <span class="mc-bill-amount">${data.counts.todo + data.counts.overdue}</span>
            </div>
            <button type="button" class="mc-b sm" id="mcPrefsBtn">${showSettings ? "Hide settings" : "What we tell you about"}</button>
        </div>

        <div id="mcPrefsBox"></div>

        ${data.items.length ? `<div class="mc-list">${data.items.map(itemHtml).join("")}</div>`
            : `<div class="mc-empty">Nothing is waiting for you right now.</div>`}

        <h2 class="mc-h2">Recent notifications${n.unread ? ` <span class="mc-chip kind">${n.unread} unread</span>` : ""}</h2>
        ${n.items.length ? `<div class="mc-list">${n.items.slice(0, 12).map(noteHtml).join("")}</div>
            ${n.unread ? `<div style="margin-top:10px"><button type="button" class="mc-b sm" id="mcReadAll">Mark all as read</button></div>` : ""}`
            : `<div class="mc-empty">No notifications yet.</div>`}`;

    bind();
    if (showSettings) void renderPrefs();
}

function itemHtml(i) {
    return `<div class="mc-row static mc-todo-${esc(i.urgency)}">
        <span class="mc-main">
            <span class="mc-name">${esc(i.title)}</span>
            ${URGENCY_WORD[i.urgency] ? `<span class="mc-chip ${i.urgency === "overdue" ? "abn" : "kind"}">${esc(URGENCY_WORD[i.urgency])}</span>` : ""}
            <span class="mc-meta">${esc(i.detail)}</span>
        </span>
        ${i.tab ? `<span class="mc-right"><button type="button" class="mc-b sm ${i.urgency === "info" ? "" : "blue"}"
            data-go="${esc(i.tab)}" data-link="${i.link_id ?? ""}">${esc(i.action || "Open")}</button></span>` : ""}
    </div>`;
}

function noteHtml(x) {
    return `<div class="mc-row static ${x.read ? "" : "mc-unread"}">
        <span class="mc-main">
            <span class="mc-name">${esc(x.title)}</span>
            <span class="mc-meta">${esc(x.body || "")}</span>
            <span class="mc-meta">${esc(when(x.at))}</span>
        </span>
        <span class="mc-right">${x.read ? "" : `<button type="button" class="mc-b sm" data-read="${x.id}">Mark read</button>`}</span>
    </div>`;
}

function bind() {
    const root = document.getElementById("mcTodo");

    root.querySelectorAll("[data-go]").forEach((b) => {
        b.onclick = () => {
            const tab = b.dataset.go;
            if (!window.__openDashboardTab) {
                showToast("Open that section from the menu above.", "error", 5000);
                return;
            }
            window.__openDashboardTab(tab);
        };
    });

    root.querySelectorAll("[data-read]").forEach((b) => {
        b.onclick = async () => {
            b.disabled = true;
            const res = await api("/mychart/notifications/read", { method: "POST", body: JSON.stringify({ id: Number(b.dataset.read) }) }).catch(() => null);
            if (res?.success) await load();
            else b.disabled = false;
        };
    });

    const all = root.querySelector("#mcReadAll");
    if (all) {
        all.onclick = async () => {
            all.disabled = true;
            const res = await api("/mychart/notifications/read", { method: "POST", body: JSON.stringify({}) }).catch(() => null);
            if (res?.success) await load();
            else all.disabled = false;
        };
    }

    root.querySelector("#mcPrefsBtn").onclick = async () => {
        showSettings = !showSettings;
        if (showSettings) await renderPrefs();
        else document.getElementById("mcPrefsBox").innerHTML = "";
        document.getElementById("mcPrefsBtn").textContent = showSettings ? "Hide settings" : "What we tell you about";
    };
}

/* ---------------- what we tell you about ---------------- */

const CHANNEL_WORD = { in_app: "In My Chart", email: "Email", sms: "Text message" };

async function renderPrefs() {
    const box = document.getElementById("mcPrefsBox");
    box.innerHTML = `<div class="mc-panel">Loading…</div>`;

    const res = await api("/mychart/notification-preferences").catch(() => null);

    if (!res?.success) {
        box.innerHTML = `<div class="mc-panel">${esc(res?.message || "Those settings could not be loaded.")}</div>`;
        return;
    }

    prefs = res.data;
    const off = Object.entries(prefs.master).filter(([k, v]) => ["email", "sms", "in_app"].includes(k) && !v).map(([k]) => CHANNEL_WORD[k]);

    box.innerHTML = `<div class="mc-panel">
        <h2 style="margin:0 0 2px;font-size:18px">What we tell you about</h2>
        <p class="mc-sub" style="margin:0 0 10px">Choose how you would like to hear about each thing. We never put a result
            itself in an email or a text — only that there is one for you to read.</p>
        ${off.length ? `<div class="mc-note">${esc(off.join(" and "))} ${off.length === 1 ? "is" : "are"} switched off by the
            hospital at the moment, so those cannot be chosen.</div>` : ""}
        <div class="mc-wrap"><table class="mc-tbl">
            <thead><tr><th>About</th>${["in_app", "email", "sms"].map((c) => `<th class="n">${esc(CHANNEL_WORD[c])}</th>`).join("")}</tr></thead>
            <tbody>${prefs.items.map((t) => `<tr>
                <td><b>${esc(t.label)}</b>${t.description ? `<div class="muted">${esc(t.description)}</div>` : ""}</td>
                ${["in_app", "email", "sms"].map((c) => {
                    const ch = t.channels[c];
                    return `<td class="n"><label class="mc-switch"><input type="checkbox" data-pref="${esc(t.event_type)}" data-channel="${c}"
                        ${ch.enabled ? "checked" : ""} ${ch.available ? "" : "disabled"}
                        aria-label="${esc(t.label)} by ${esc(CHANNEL_WORD[c])}"><span></span></label></td>`;
                }).join("")}
            </tr>`).join("")}</tbody>
        </table></div>
    </div>`;

    box.querySelectorAll("[data-pref]").forEach((input) => {
        input.onchange = async () => {
            const res2 = await api("/mychart/notification-preferences", {
                method: "POST",
                body: JSON.stringify({ event_type: input.dataset.pref, channel: input.dataset.channel, enabled: input.checked ? 1 : 0 }),
            }).catch(() => null);

            if (!res2?.success) {
                input.checked = !input.checked;
                showToast(res2?.message || "That could not be saved.", "error", 5000);
                return;
            }

            showToast(res2.message, "success", 3000);
        };
    });
}
