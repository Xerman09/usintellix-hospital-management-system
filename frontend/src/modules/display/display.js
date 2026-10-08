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
 * Room TV (Phase 2): vital signs instead of demographics (latest set, trend arrows, overdue
 * warning), the nurse and CNA this shift, pain medicine (last given, next allowed; no drug
 * names), allergy and fall-risk icons. A Code Blue called on the ward takes over the screen.
 * Other kinds show the hospital, the place and the time until their phases.
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

/* Room TV */
.rm { position: fixed; inset: 0; display: grid; grid-template-rows: auto 1fr; gap: clamp(10px, 1.6vw, 24px); padding: clamp(14px, 2.2vw, 36px); box-sizing: border-box; }
.rm-top { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.rm-place { font-size: clamp(22px, 3vw, 54px); font-weight: 800; line-height: 1.1; }
.rm-place small { display: block; font-size: .45em; font-weight: 600; color: var(--muted); margin-top: 4px; }
.rm-clock { text-align: right; }
.rm-clock .t { font-size: clamp(26px, 3.4vw, 60px); font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.rm-clock .d { color: var(--muted); font-size: clamp(13px, 1.3vw, 22px); margin-top: 4px; }
.rm-main { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: clamp(10px, 1.6vw, 24px); min-height: 0; }
@media (max-aspect-ratio: 4/3) { .rm-main { grid-template-columns: minmax(0, 1fr); } }
.rm-card { background: var(--panel); border: 1px solid var(--line); border-radius: clamp(10px, 1vw, 18px); padding: clamp(12px, 1.4vw, 24px); min-height: 0; }
.rm-card h2 { margin: 0 0 clamp(8px, 1vw, 16px); font-size: clamp(14px, 1.4vw, 24px); color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.rm-vitals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(8px, 1vw, 16px); }
.rm-v { background: #0b1324; border: 1px solid var(--line); border-radius: 12px; padding: clamp(8px, 1vw, 18px); }
.rm-v .l { color: var(--muted); font-size: clamp(12px, 1.2vw, 22px); font-weight: 600; }
.rm-v .n { font-size: clamp(30px, 4.2vw, 80px); font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.05; margin-top: 4px; display: flex; align-items: baseline; gap: .2em; flex-wrap: wrap; }
.rm-v .u { font-size: .32em; color: var(--muted); font-weight: 600; }
.rm-v .a { font-size: .55em; color: var(--muted); }
.rm-v .x { font-size: clamp(11px, 1vw, 18px); color: var(--muted); margin-top: 2px; }
.rm-v.flag { border-color: #f59e0b; }
.rm-v.flag .n { color: #fbbf24; }
.rm-vstat { margin-top: clamp(8px, 1vw, 16px); font-size: clamp(14px, 1.5vw, 26px); color: var(--muted); }
.rm-over { margin-top: clamp(8px, 1vw, 16px); background: #7f1d1d; color: #fff; border-radius: 12px; padding: clamp(8px, 1vw, 16px) clamp(12px, 1.2vw, 20px); font-size: clamp(16px, 1.8vw, 32px); font-weight: 800; }
.rm-side { display: grid; gap: clamp(10px, 1.4vw, 22px); align-content: start; min-height: 0; }
.rm-team div { font-size: clamp(16px, 1.9vw, 34px); font-weight: 700; margin-bottom: 6px; }
.rm-team span { display: block; font-size: .5em; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.rm-pain p { margin: 0 0 6px; font-size: clamp(15px, 1.6vw, 28px); }
.rm-pain b { font-variant-numeric: tabular-nums; }
.rm-pain .ok { color: #4ade80; font-weight: 700; }
.rm-icons { display: flex; flex-wrap: wrap; gap: clamp(8px, 1vw, 16px); }
.rm-icon { display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: clamp(8px, 1vw, 14px) clamp(10px, 1.2vw, 18px); font-weight: 800; font-size: clamp(14px, 1.5vw, 26px); }
.rm-icon svg { width: 1.6em; height: 1.6em; flex-shrink: 0; }
.rm-icon.allergy { background: #7f1d1d; color: #fff; }
.rm-icon.fall-high { background: #b45309; color: #fff; }
.rm-icon.fall-moderate { background: #78350f; color: #fde68a; }
.rm-icon.fall-low { background: #14532d; color: #bbf7d0; }
.rm-icon.none { background: transparent; border: 1px dashed var(--line); color: var(--muted); font-weight: 600; }
.rm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2vh; text-align: center; }
.rm-empty .big { font-size: clamp(40px, 7vw, 140px); font-weight: 800; }
.rm-empty .sub { color: var(--muted); font-size: clamp(18px, 2.2vw, 40px); }

/* Code Blue */
.cb { position: fixed; inset: 0; background: #1d4ed8; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 3vh; padding: 5vw;
    box-shadow: inset 0 0 0 2vw #fff; animation: cb-pulse 1s steps(2, jump-none) infinite; }
.cb h1 { margin: 0; font-size: clamp(64px, 13vw, 260px); font-weight: 900; letter-spacing: .02em; line-height: 1; }
.cb .where { font-size: clamp(28px, 4.5vw, 90px); font-weight: 800; }
.cb .when { font-size: clamp(18px, 2.2vw, 42px); opacity: .9; }
.cb .here { background: #fff; color: #1d4ed8; padding: .2em .6em; border-radius: .4em; font-size: clamp(22px, 3vw, 60px); font-weight: 900; }
@keyframes cb-pulse { 0% { box-shadow: inset 0 0 0 2vw #fff; } 100% { box-shadow: inset 0 0 0 2vw #1d4ed8; } }
@media (prefers-reduced-motion: reduce) { .cb { animation: none; } }
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
    if (d.code_blue) {
        renderCodeBlue(d.code_blue);
        return;
    }
    if (dev.kind === "room" && d.content) {
        renderRoom(d);
        renderStatus();
        return;
    }
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
    // The room TV shows nothing here unless the connection is lost.
    el.innerHTML = failures ? `<span class="dsp-badge">Reconnecting…</span>` : el.hasAttribute("data-quiet") ? "" : `Updated ${hm(hospitalNow())}`;
}

const pad = (n) => String(n).padStart(2, "0");
const hm = (dt) => `${dt.getUTCHours() % 12 || 12}:${pad(dt.getUTCMinutes())} ${dt.getUTCHours() < 12 ? "AM" : "PM"}`;

/* ---------------- room TV ---------------- */

/** "2026-10-08 14:30:00" (hospital clock) -> "2:30 PM", with "yesterday" / "tomorrow" when not today. */
function t12(s) {
    if (!s) return "";
    const [d, t] = String(s).split(" ");
    const [h, m] = t.split(":").map(Number);
    const time = `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
    const today = hospitalNow();
    const key = (x) => `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
    if (d === key(today)) return time;
    if (d === key(new Date(today.getTime() - 86400000))) return `${time} yesterday`;
    if (d === key(new Date(today.getTime() + 86400000))) return `${time} tomorrow`;
    return `${time}, ${d}`;
}

const ARROW = { up: ["↑", "rising"], down: ["↓", "falling"], steady: ["→", "steady"] };
const ICON_ALLERGY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
const ICON_FALL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="14" cy="4" r="2"/><path d="m8 21 3-6 3 2 2 5"/><path d="M6 12l4-3 3 3 4-1"/><path d="M3 21h18"/></svg>`;

function vital(label, value, unit, trendKey, v, flagKeys, extra = "") {
    const flagged = flagKeys.some((k) => v.flags?.[k]);
    const tr = v.trends?.[trendKey];
    const arrow = tr ? `<span class="a" aria-label="${ARROW[tr][1]}">${ARROW[tr][0]}</span>` : "";
    return `<div class="rm-v${flagged ? " flag" : ""}"><div class="l">${esc(label)}${flagged ? " ⚠" : ""}</div>
        <div class="n">${value == null ? "—" : esc(value)}${value == null ? "" : `<span class="u">${esc(unit)}</span>`}${value == null ? "" : arrow}</div>${extra ? `<div class="x">${extra}</div>` : ""}</div>`;
}

function renderRoom(d) {
    const c = d.content;
    const place = c.place || {};
    const head = `<header class="rm-top">
        <div class="rm-place">${esc([place.room, place.bed ? `Bed ${place.bed}` : ""].filter(Boolean).join(" · ") || d.device.name)}<small>${esc(place.ward || d.hospital.name)}</small></div>
        <div class="rm-clock"><div class="t" data-clock></div><div class="d" data-date></div><div class="d" data-status data-quiet></div></div></header>`;
    if (!c.occupied) {
        root.innerHTML = `<div class="rm">${head}<main class="rm-empty"><div class="big">Welcome</div><div class="sub">${esc(d.hospital.name)}</div></main></div>`;
        drawClock();
        return;
    }
    const v = c.vitals.latest;
    const vitals = v ? `<div class="rm-vitals">
            ${vital("Blood pressure", v.bp_systolic != null ? `${v.bp_systolic}/${v.bp_diastolic ?? "—"}` : null, "mmHg", "bp_systolic", v, ["bp_systolic", "bp_diastolic"])}
            ${vital("Heart rate", v.heart_rate, "bpm", "heart_rate", v, ["heart_rate"])}
            ${vital("Breathing", v.resp_rate, "/min", "resp_rate", v, ["resp_rate"])}
            ${vital("Temperature", v.temperature_c != null ? Number(v.temperature_c).toFixed(1) : null, "°C", "temperature_c", v, ["temperature_c"])}
            ${vital("Oxygen", v.spo2, "%", "spo2", v, ["spo2"], v.on_oxygen ? `On oxygen${v.oxygen_lpm ? ` ${v.oxygen_lpm} L/min` : ""}` : "")}
            ${vital("Pain", v.pain_score, "/10", "pain_score", v, ["pain_score"])}
        </div>` : `<div class="rm-vstat">No vital signs recorded yet.</div>`;
    const vs = c.vitals;
    const status = vs.state === "overdue"
        ? `<div class="rm-over" role="status">⚠ Vital signs overdue — were due ${esc(t12(vs.next_due))}</div>`
        : `<div class="rm-vstat">${v ? `Taken ${esc(t12(v.taken_at))}` : ""}${vs.next_due ? `${v ? " · " : ""}Next check ${vs.state === "due" ? "now" : esc(t12(vs.next_due))}` : ""}</div>`;

    const p = c.pain;
    const pain = p && (p.has_orders || p.last_given_at) ? `<section class="rm-card rm-pain"><h2>Pain medicine</h2>
        <p>Last given: <b>${p.last_given_at ? esc(t12(p.last_given_at)) : "not yet"}</b></p>
        <p>${p.available_now ? `<span class="ok">Can be given now</span> — ask your nurse` : p.next_allowed_at ? `Next dose from <b>${esc(t12(p.next_allowed_at))}</b>` : "Ask your nurse"}</p></section>` : "";

    const s = c.safety || {};
    const icons = [
        s.allergy ? `<div class="rm-icon allergy" role="img" aria-label="Allergy alert">${ICON_ALLERGY}Allergy</div>` : "",
        s.fall_risk && s.fall_risk !== "low" ? `<div class="rm-icon fall-${esc(s.fall_risk)}" role="img" aria-label="${s.fall_risk === "high" ? "High" : "Moderate"} fall risk">${ICON_FALL}${s.fall_risk === "high" ? "High fall risk" : "Fall risk"}</div>` : "",
    ].filter(Boolean).join("");
    const safety = `<section class="rm-card"><h2>Safety</h2><div class="rm-icons">${icons || `<div class="rm-icon none">No alerts</div>`}</div>
        ${s.fall_risk === "high" ? `<div class="rm-vstat">Please call before getting up.</div>` : ""}</section>`;

    const t = c.team || {};
    root.innerHTML = `<div class="rm">${head}
        <main class="rm-main">
            <section class="rm-card"><h2>Vital signs</h2>${vitals}${status}</section>
            <div class="rm-side">
                <section class="rm-card rm-team"><h2>Your care team${t.shift ? ` · ${esc(t.shift)}` : ""}</h2>
                    <div><span>Nurse</span>${esc(t.nurse || "Not assigned yet")}</div>
                    ${t.cna ? `<div><span>Nursing assistant</span>${esc(t.cna)}</div>` : ""}</section>
                ${pain}${safety}
            </div>
        </main></div>`;
    drawClock();
}

function renderCodeBlue(cb) {
    document.title = "CODE BLUE";
    root.innerHTML = `<div class="cb" role="alert">
        <h1>CODE BLUE</h1>
        ${cb.here ? `<div class="here">In this room</div>` : ""}
        <div class="where">${esc(cb.location)}</div>
        <div class="when">Called ${esc(t12(cb.called_at))}</div></div>`;
}

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
