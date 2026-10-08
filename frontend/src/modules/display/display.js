import { API_URL } from "../../core/api.js?v=5";

/*
 * TV display page (module 9, Phase 1). Opened on the TV as display.html#key=<display key>.
 *
 *   * No person logs in: the device's key is kept on the TV (localStorage) and sent with every
 *     request in the X-Display-Key header. The key is removed from the address bar at once.
 *   * Full screen, nothing to click into: no links, no right-click, keys and drag ignored, the
 *     mouse pointer hides. The first click or tap only asks the browser for full screen (a
 *     browser allows that only after a click; a TV browser in kiosk mode is full screen already).
 *   * Refreshes by itself every refresh_seconds (set per device); keeps the last screen and
 *     shows "Reconnecting" while the network is down; reloads the page when the admin asks,
 *     and every 12 hours.
 *   * Turned off by the admin: a blank screen until turned back on.
 *
 * What each kind of TV shows (room, nurse station, waiting room, OR) comes in the later
 * phases; this shows the hospital, the place and the time.
 */

const KEY_STORE = "displayKey";
const HARD_RELOAD_MS = 12 * 3600 * 1000;
const UNKNOWN_RETRY_MS = 5 * 60 * 1000;

const root = document.getElementById("display");
let key = null;
let refreshMs = 30000;
let reloadToken;            // undefined until the first answer
let clockOffset = 0;        // server (hospital) clock - this TV's clock, in ms
let timer = null;
let failures = 0;
let last = null;
const startedAt = Date.now();

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `
.dsp { position: fixed; inset: 0; display: grid; grid-template-rows: auto 1fr auto; padding: clamp(16px, 3vw, 48px); box-sizing: border-box; }
.dsp-top { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.dsp-brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
.dsp-brand img { height: clamp(36px, 5vw, 72px); width: auto; border-radius: 8px; background: #fff; padding: 4px; }
.dsp-brand h1 { margin: 0; font-size: clamp(20px, 2.6vw, 44px); font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dsp-place { text-align: right; color: var(--muted); font-size: clamp(14px, 1.6vw, 28px); font-weight: 600; }
.dsp-mid { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1vh; }
.dsp-time { font-size: clamp(64px, 14vw, 260px); font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1; }
.dsp-date { font-size: clamp(20px, 3vw, 56px); color: var(--muted); font-weight: 600; }
.dsp-loc { margin-top: 3vh; font-size: clamp(22px, 3.2vw, 60px); font-weight: 700; color: var(--accent); }
.dsp-kind { font-size: clamp(14px, 1.6vw, 28px); color: var(--muted); }
.dsp-bottom { display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: clamp(12px, 1.1vw, 18px); min-height: 1.5em; }
.dsp-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: #3f1d1d; color: #fecaca; font-weight: 700; }
.dsp-badge::before { content: ""; width: 10px; height: 10px; border-radius: 50%; background: var(--red); }
.dsp-off { position: fixed; inset: 0; background: #000; }
.dsp-off span { position: absolute; bottom: 12px; right: 16px; color: #1f2937; font-size: 12px; }
.dsp-msg { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px; gap: 16px; }
.dsp-msg h1 { margin: 0; font-size: clamp(28px, 4vw, 64px); }
.dsp-msg p { margin: 0; color: var(--muted); font-size: clamp(16px, 1.8vw, 30px); max-width: 60ch; line-height: 1.4; }
.dsp-hint { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: rgba(15,23,42,.92); border: 1px solid var(--line); color: var(--text);
    padding: 10px 18px; border-radius: 999px; font-size: clamp(13px, 1.2vw, 20px); font-weight: 600; transition: opacity .4s; }
.dsp-hint.gone { opacity: 0; pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .dsp-hint { transition: none; } }
`;

/* ---------------- locked down ---------------- */

function lockDown() {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    // Nothing to click into: no context menu, no drag, no selecting, no keyboard shortcuts the page can stop.
    ["contextmenu", "dragstart", "selectstart", "auxclick"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { capture: true }));
    document.addEventListener("keydown", (e) => {
        if (e.key === "F11") return;   // the browser's own full screen
        e.preventDefault();
        e.stopPropagation();
    }, { capture: true });
    document.addEventListener("click", (e) => {
        e.preventDefault();
        goFullScreen();
    }, { capture: true });
    window.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    // Hide the pointer after a few seconds without movement.
    let idle = null;
    const wake = () => {
        document.body.classList.remove("idle");
        clearTimeout(idle);
        idle = setTimeout(() => document.body.classList.add("idle"), 3000);
    };
    document.addEventListener("pointermove", wake, { passive: true });
    wake();
    // Keep the screen on where the browser allows it.
    const keepAwake = async () => {
        try {
            if ("wakeLock" in navigator && document.visibilityState === "visible") await navigator.wakeLock.request("screen");
        } catch { /* not allowed: the TV's own settings keep it on */ }
    };
    document.addEventListener("visibilitychange", keepAwake);
    keepAwake();
    document.addEventListener("fullscreenchange", showHint);
}

function isFullScreen() {
    return !!document.fullscreenElement || (window.innerHeight >= screen.height - 2 && window.innerWidth >= screen.width - 2);
}

function goFullScreen() {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
}

let hintTimer = null;
function showHint() {
    let hint = document.querySelector(".dsp-hint");
    if (isFullScreen()) {
        hint?.classList.add("gone");
        return;
    }
    if (!hint) {
        hint = document.createElement("div");
        hint.className = "dsp-hint";
        hint.textContent = "Click or tap anywhere for full screen";
        document.body.appendChild(hint);
    }
    hint.classList.remove("gone");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.add("gone"), 20000);
}

/* ---------------- the key ---------------- */

function readKey() {
    const m = location.hash.match(/key=([A-Za-z0-9]+)/);
    if (m) {
        try { localStorage.setItem(KEY_STORE, m[1]); } catch { /* private mode: keep it for this session */ }
        // Out of the address bar (and so out of anyone's screenshot or history).
        history.replaceState(null, "", location.pathname);
        return m[1];
    }
    try {
        return localStorage.getItem(KEY_STORE);
    } catch {
        return null;
    }
}

/* ---------------- feed ---------------- */

async function tick() {
    clearTimeout(timer);
    let res = null;
    let status = 0;
    try {
        const r = await fetch(`${API_URL}/display/feed`, { headers: { "X-Display-Key": key, Accept: "application/json" }, credentials: "omit", cache: "no-store" });
        status = r.status;
        res = await r.json().catch(() => null);
    } catch { /* network down */ }

    if (status === 401) {
        last = null;
        showMessage("This display is not registered", `Its key was changed or the display was removed. Ask the administrator for the new link (Administration → TV Displays).${key ? ` Key ending …${esc(key.slice(-4))}.` : ""}`);
        timer = setTimeout(tick, UNKNOWN_RETRY_MS);
        return;
    }
    if (!res?.success) {
        failures++;
        renderStatus();
        // Back off a little while the network is down, never longer than the normal refresh.
        timer = setTimeout(tick, Math.min(refreshMs, 5000 * failures));
        return;
    }
    failures = 0;
    const d = res.data;
    refreshMs = Math.max(10, d.refresh_seconds || 30) * 1000;
    clockOffset = serverMs(d.now) - Date.now();
    if (reloadToken !== undefined && d.reload_token !== reloadToken) {
        location.reload();
        return;
    }
    reloadToken = d.reload_token;
    last = d;
    render();
    if (Date.now() - startedAt > HARD_RELOAD_MS) {
        location.reload();
        return;
    }
    timer = setTimeout(tick, refreshMs);
}

/** "YYYY-MM-DD HH:MM:SS" (hospital clock) -> ms, read as UTC so the hospital's wall time is shown as is. */
function serverMs(s) {
    const [d, t] = String(s).split(" ");
    const [y, m, day] = d.split("-").map(Number);
    const [h, mi, se] = t.split(":").map(Number);
    return Date.UTC(y, m - 1, day, h, mi, se);
}

function hospitalNow() {
    return new Date(Date.now() + clockOffset);
}

/* ---------------- screens ---------------- */

function showMessage(title, text) {
    document.title = "Display";
    root.innerHTML = `<div class="dsp-msg"><h1>${esc(title)}</h1><p>${text}</p></div>`;
}

function render() {
    const d = last;
    if (!d) return;
    if (d.state === "off") {
        document.title = "Display (off)";
        root.innerHTML = `<div class="dsp-off" aria-label="Display turned off"><span>Turned off</span></div>`;
        return;
    }
    const dev = d.device;
    document.title = dev.name;
    const logo = d.hospital.logo ? `<img src="${esc(API_URL + d.hospital.logo)}" alt="">` : "";
    root.innerHTML = `<div class="dsp">
        <header class="dsp-top">
            <div class="dsp-brand">${logo}<h1>${esc(d.hospital.name)}</h1></div>
            <div class="dsp-place">${esc(dev.kind_label)}</div>
        </header>
        <main class="dsp-mid">
            <div class="dsp-time" data-clock></div>
            <div class="dsp-date" data-date></div>
            <div class="dsp-loc">${esc(dev.location || dev.name)}</div>
            ${dev.location_note && dev.location !== dev.location_note ? `<div class="dsp-kind">${esc(dev.location_note)}</div>` : ""}
        </main>
        <footer class="dsp-bottom"><span data-status></span><span>${esc(dev.name)}</span></footer>
    </div>`;
    drawClock();
    renderStatus();
}

function renderStatus() {
    const el = root.querySelector("[data-status]");
    if (!el) {
        if (failures && !last) showMessage("Connecting…", "Waiting for the network.");
        return;
    }
    el.innerHTML = failures ? `<span class="dsp-badge">Reconnecting…</span>` : `Updated ${hm(hospitalNow())}`;
}

const pad = (n) => String(n).padStart(2, "0");
const hm = (dt) => `${dt.getUTCHours() % 12 || 12}:${pad(dt.getUTCMinutes())} ${dt.getUTCHours() < 12 ? "AM" : "PM"}`;

function drawClock() {
    const c = root.querySelector("[data-clock]");
    if (!c) return;
    const n = hospitalNow();
    const h = n.getUTCHours();
    c.textContent = `${h % 12 || 12}:${pad(n.getUTCMinutes())} ${h < 12 ? "AM" : "PM"}`;
    root.querySelector("[data-date]").textContent = n.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/* ---------------- start ---------------- */

lockDown();
key = readKey();
if (!key) {
    showMessage("Display not set up", "Open this TV's link from Administration → TV Displays (it ends in #key=…). The key is saved on the TV after that.");
} else {
    showMessage("Starting…", "");
    tick();
    setInterval(drawClock, 1000);
}
showHint();
