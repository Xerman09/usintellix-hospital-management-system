import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * Administration → TV Displays (module 9, Phase 1): register each TV (patient room, nurse
 * station, waiting room, OR) as a device with its own display key, see which TVs are online,
 * turn one off or on remotely, make it reload, give it a new key, or remove it.
 * The key is shown once, inside the link to open on the TV.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const REFRESH_MS = 15000;
let options = null;
let devices = [];
let timer = null;

const CSS = `
.dd { padding: 20px 24px 40px; max-width: 1300px; margin: 0 auto; color: var(--text-primary); }
.dd-head { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 14px; }
.dd-head h1 { margin: 0; font-size: 22px; }
.dd-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; max-width: 70ch; }
.dd-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.dd-b:hover { background: var(--bg-surface-alt); }
.dd-b.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.dd-b.danger { color: #b91c1c; border-color: #fca5a5; }
.dd-b:disabled { opacity: .6; cursor: default; }
.dd-b:focus-visible, .dd-x:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dd-sum { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; font-size: 13px; color: var(--text-muted); }
.dd-sum b { color: var(--text-primary); }
.dd-table { width: 100%; border-collapse: collapse; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; font-size: 13.5px; }
.dd-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .03em; color: var(--text-muted); padding: 10px 12px; border-bottom: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.dd-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.dd-table tr:last-child td { border-bottom: 0; }
.dd-name { font-weight: 700; }
.dd-muted { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.dd-acts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.dd-acts .dd-b { padding: 5px 10px; font-size: 12.5px; }
.dd-st { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 12.5px; white-space: nowrap; }
.dd-st::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
.dd-st.on { color: #15803d; } .dd-st.off { color: #b91c1c; } .dd-st.never { color: var(--text-muted); } .dd-st.dark { color: #475569; }
:root[data-theme="dark"] .dd-st.on { color: #4ade80; } :root[data-theme="dark"] .dd-st.off { color: #f87171; } :root[data-theme="dark"] .dd-st.dark { color: #94a3b8; }
.dd-empty { padding: 40px 16px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: 12px; }
.dd-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4700; display: flex; align-items: center; justify-content: center; padding: 16px; }
.dd-modal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 560px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.35); overflow: hidden; }
.dd-mhead { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 6px; }
.dd-mhead h2 { margin: 0; font-size: 18px; }
.dd-x { border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; color: var(--text-muted); padding: 4px 8px; border-radius: 6px; }
.dd-mbody { padding: 8px 20px 4px; overflow: auto; display: grid; gap: 12px; font-size: 13.5px; }
.dd-mbody label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.dd-mbody input, .dd-mbody select, .dd-mbody textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13.5px; background: var(--bg-surface); color: var(--text-primary); }
.dd-mbody [aria-invalid="true"] { border-color: #dc2626; }
.dd-err { color: #dc2626; font-size: 12px; margin-top: 3px; }
.dd-mfoot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px 16px; border-top: 1px solid var(--border-color); margin-top: 8px; }
.dd-link { display: flex; gap: 6px; }
.dd-link input { font-family: ui-monospace, monospace; font-size: 12px; }
.dd-warn { background: #fef3c7; color: #78350f; border-radius: 8px; padding: 8px 10px; font-size: 12.5px; }
:root[data-theme="dark"] .dd-warn { background: #422006; color: #fde68a; }
.dd-steps { margin: 0; padding-left: 18px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
.dd-ev { margin: 0; padding: 0; list-style: none; font-size: 12.5px; }
.dd-ev li { padding: 6px 0; border-bottom: 1px solid var(--border-color); }
@media (max-width: 860px) {
    .dd-table thead { display: none; }
    .dd-table, .dd-table tbody, .dd-table tr, .dd-table td { display: block; width: 100%; box-sizing: border-box; }
    .dd-table tr { border-bottom: 1px solid var(--border-color); padding: 6px 0; }
    .dd-table td { border: 0; padding: 4px 12px; }
    .dd-acts { justify-content: flex-start; }
}
`;

export function DisplayDevicesView() {
    return `<style>${CSS}</style><div class="dd" id="displayDevices">
        <div class="dd-head">
            <div><h1>TV Displays</h1>
                <div class="dd-sub">Each TV is registered here with its own display key. TVs never sign in as a person: open the TV's link once on the TV and it stays connected. You can turn a TV off from here at any time.</div></div>
            <button type="button" class="dd-b primary" data-dd-add>+ Add display</button>
        </div>
        <div data-dd-body><div class="dd-empty">Loading…</div></div>
    </div>`;
}

export async function initDisplayDevices() {
    const root = document.getElementById("displayDevices");
    if (!root) return;
    root.querySelector("[data-dd-add]").onclick = () => openForm();
    root.addEventListener("click", onClick);
    clearInterval(timer);
    timer = setInterval(() => {
        if (!document.getElementById("displayDevices")) return clearInterval(timer);
        if (!document.hidden && !document.querySelector(".dd-overlay")) load();
    }, REFRESH_MS);
    await load();
}

async function load() {
    const res = await api("/display-devices").catch(() => null);
    const body = document.querySelector("#displayDevices [data-dd-body]");
    if (!body) return;
    if (!res?.success) {
        body.innerHTML = `<div class="dd-empty">${esc(res?.message || "Could not load the displays.")}</div>`;
        return;
    }
    devices = res.data.devices;
    render(body);
}

function ago(s) {
    if (s == null) return "";
    if (s < 60) return `${s} s ago`;
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} days ago`;
}

function status(d) {
    if (!d.enabled) return `<span class="dd-st dark">Turned off</span><div class="dd-muted">${d.disabled_by_name ? `by ${esc(d.disabled_by_name)}` : ""}${d.online ? " · TV connected" : ""}</div>`;
    if (d.never_seen) return `<span class="dd-st never">Not connected yet</span><div class="dd-muted">Open its link on the TV</div>`;
    return d.online
        ? `<span class="dd-st on">Online</span><div class="dd-muted">checked in ${ago(d.seen_ago)}</div>`
        : `<span class="dd-st off">Offline</span><div class="dd-muted">last seen ${ago(d.seen_ago)}</div>`;
}

function render(body) {
    if (!devices.length) {
        body.innerHTML = `<div class="dd-empty">No TVs registered yet. Use “+ Add display” for each TV: patient rooms, nurse stations, waiting rooms, operating rooms.</div>`;
        return;
    }
    const on = devices.filter((d) => d.enabled && d.online).length;
    const off = devices.filter((d) => d.enabled && !d.online && !d.never_seen).length;
    body.innerHTML = `
        <div class="dd-sum"><span><b>${devices.length}</b> displays</span>·<span><b>${on}</b> online</span>·<span><b style="color:${off ? "#b91c1c" : "inherit"}">${off}</b> offline</span>·<span><b>${devices.filter((d) => !d.enabled).length}</b> turned off</span></div>
        <table class="dd-table"><thead><tr><th>Display</th><th>Where</th><th>Status</th><th>Key</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${devices.map((d) => `<tr data-id="${d.id}">
            <td><div class="dd-name">${esc(d.name)}</div><div class="dd-muted">${esc(d.kind_label)} · refresh ${d.refresh_seconds} s</div></td>
            <td>${esc(d.location || "—")}${d.location_note && d.location !== d.location_note ? `<div class="dd-muted">${esc(d.location_note)}</div>` : ""}</td>
            <td>${status(d)}</td>
            <td><span style="font-family:ui-monospace,monospace">…${esc(d.key_hint)}</span><div class="dd-muted">${d.last_ip ? esc(d.last_ip) : ""}</div></td>
            <td><div class="dd-acts">
                <button type="button" class="dd-b" data-dd-power="${d.enabled ? 0 : 1}">${d.enabled ? "Turn off" : "Turn on"}</button>
                <button type="button" class="dd-b" data-dd-reload ${d.enabled ? "" : "disabled"}>Reload</button>
                <button type="button" class="dd-b" data-dd-edit>Edit</button>
                <button type="button" class="dd-b" data-dd-more>More…</button>
            </div></td></tr>`).join("")}
        </tbody></table>`;
}

/* ---------------- actions ---------------- */

async function onClick(e) {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const d = devices.find((x) => x.id === Number(tr.dataset.id));
    if (!d) return;
    if (e.target.closest("[data-dd-edit]")) return openForm(d);
    if (e.target.closest("[data-dd-more]")) return openMore(d);
    if (e.target.closest("[data-dd-reload]")) {
        const r = await post("/display-devices/reload", { id: d.id });
        if (r) load();
        return;
    }
    const pw = e.target.closest("[data-dd-power]");
    if (pw) {
        if (pw.dataset.ddPower === "1") {
            if (await post("/display-devices/power", { id: d.id, on: 1 })) load();
            return;
        }
        modal(`Turn off ${esc(d.name)}?`, `<p style="margin:0">The TV shows a blank screen within ${d.refresh_seconds} seconds, until you turn it back on.</p>
            <div><label for="ddReason">Why (optional)</label><input id="ddReason" maxlength="300" placeholder="e.g. patient asked, being repaired"></div>`,
            [["Cancel"], ["Turn off", "danger", async (m) => {
                if (await post("/display-devices/power", { id: d.id, on: 0, reason: m.querySelector("#ddReason").value })) {
                    load();
                    return true;
                }
            }]]);
    }
}

async function post(url, body, method = "POST") {
    const r = await api(url, { method, body: JSON.stringify(body) }).catch(() => null);
    if (!r?.success) {
        showToast(r?.message || "Could not save. Try again.", "error");
        return null;
    }
    showToast(r.message, "success");
    return r;
}

/* ---------------- modals ---------------- */

/** A small in-app dialog. buttons: [label, style?, onClick?(modal) -> true closes]. */
function modal(title, html, buttons) {
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "dd-overlay";
    ov.innerHTML = `<div class="dd-modal" role="dialog" aria-modal="true" aria-labelledby="ddMTitle">
        <div class="dd-mhead"><h2 id="ddMTitle">${title}</h2><button type="button" class="dd-x" aria-label="Close">×</button></div>
        <div class="dd-mbody">${html}</div>
        <div class="dd-mfoot">${buttons.map(([l, s], i) => `<button type="button" class="dd-b ${s || ""}" data-i="${i}">${esc(l)}</button>`).join("")}</div></div>`;
    document.body.appendChild(ov);
    const m = ov.querySelector(".dd-modal");
    const close = () => {
        ov.remove();
        document.removeEventListener("keydown", onKey, true);
        opener?.focus?.();
    };
    const onKey = (e) => {
        if (e.key === "Escape") {
            e.stopPropagation();
            close();
        }
    };
    document.addEventListener("keydown", onKey, true);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    m.querySelector(".dd-x").onclick = close;
    m.querySelectorAll("[data-i]").forEach((b) => {
        b.onclick = async () => {
            const fn = buttons[Number(b.dataset.i)][2];
            if (!fn) return close();
            b.disabled = true;
            const done = await fn(m);
            b.disabled = false;
            if (done) close();
        };
    });
    (m.querySelector("input, select, textarea") || m.querySelector(".dd-mfoot .dd-b:last-child")).focus();
    return { m, close };
}

/** The link to open on the TV (shown once, with the key). */
function linkFor(key) {
    const base = location.href.split("#")[0].replace(/[^/]*$/, "");
    return `${base}display.html#key=${key}`;
}

function showLink(d, key, isNew) {
    const url = linkFor(key);
    modal(isNew ? `${esc(d.name)} added` : `New key for ${esc(d.name)}`, `
        <div class="dd-warn"><b>Shown only once.</b> Copy it now. If it's lost, make a new key (the TV will need the new link).</div>
        <div><label for="ddLink">Link to open on the TV</label>
            <div class="dd-link"><input id="ddLink" readonly value="${esc(url)}"><button type="button" class="dd-b" data-copy>Copy</button></div></div>
        <ol class="dd-steps">
            <li>On the TV, open the browser and go to this link (or send it to the TV).</li>
            <li>Click once to go full screen (a TV in kiosk mode is already full screen).</li>
            <li>The TV remembers its key; the link disappears from the address bar.</li>
        </ol>`, [["Done", "primary"]]).m.querySelector("[data-copy]").onclick = async (e) => {
        const input = document.getElementById("ddLink");
        input.select();
        try {
            await navigator.clipboard.writeText(url);
            e.target.textContent = "Copied";
        } catch {
            e.target.textContent = "Press Ctrl+C";
        }
    };
}

async function openForm(d = null) {
    if (!options) {
        const r = await api("/display-devices/options").catch(() => null);
        if (!r?.success) {
            showToast(r?.message || "Could not open the form.", "error");
            return;
        }
        options = r.data;
    }
    const kind = d?.kind || "room";
    const bedLabel = (b) => `${options.wards.find((w) => Number(w.id) === Number(b.ward_id))?.name || ""} · ${b.room_number || ""} · Bed ${b.bed_number}`;
    const { m } = modal(d ? `Edit ${esc(d.name)}` : "Add display", `
        <div><label for="ddName">Name</label><input id="ddName" maxlength="120" value="${esc(d?.name || "")}" placeholder="e.g. Room 201 TV, Ward 3 nurse station">
            <div class="dd-err" data-err="name"></div></div>
        <div><label for="ddKind">Where is the TV?</label><select id="ddKind">${Object.entries(options.kinds).map(([v, l]) => `<option value="${v}" ${kind === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
            <div class="dd-err" data-err="kind"></div></div>
        <div data-for="room"><label for="ddBed">Bed it faces</label><select id="ddBed"><option value="">Choose…</option>
            ${options.beds.map((b) => `<option value="${b.id}" ${Number(d?.bed_id) === Number(b.id) ? "selected" : ""}>${esc(bedLabel(b))}</option>`).join("")}</select>
            <div class="dd-err" data-err="bed_id"></div></div>
        <div data-for="nurse_station"><label for="ddWard">Ward</label><select id="ddWard"><option value="">Choose…</option>
            ${options.wards.map((w) => `<option value="${w.id}" ${Number(d?.ward_id) === Number(w.id) ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select>
            <div class="dd-err" data-err="ward_id"></div></div>
        <div data-for="or"><label for="ddSuite">Operating room</label><select id="ddSuite"><option value="">Choose…</option>
            ${options.or_suites.map((s) => `<option value="${s.id}" ${Number(d?.or_suite_id) === Number(s.id) ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
            <div class="dd-err" data-err="or_suite_id"></div></div>
        <div><label for="ddNote">Location note <span style="font-weight:400">(optional)</span></label><input id="ddNote" maxlength="200" value="${esc(d?.location_note || "")}" placeholder="e.g. Main lobby, east wall">
            <div class="dd-err" data-err="location_note"></div></div>
        <div><label for="ddRefresh">Refresh every (seconds)</label><input id="ddRefresh" type="number" min="${options.refresh.min}" max="${options.refresh.max}" value="${d?.refresh_seconds || options.refresh.default}">
            <div class="dd-err" data-err="refresh_seconds"></div></div>
        <div><label for="ddNotes">Notes <span style="font-weight:400">(optional)</span></label><textarea id="ddNotes" maxlength="500" rows="2" placeholder="e.g. Samsung 43&quot;, wall bracket, asset tag 1043">${esc(d?.notes || "")}</textarea></div>`,
        [["Cancel"], [d ? "Save" : "Add display", "primary", async (mm) => {
            const q = (s) => mm.querySelector(s);
            mm.querySelectorAll("[data-err]").forEach((x) => (x.textContent = ""));
            mm.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
            const body = { id: d?.id, name: q("#ddName").value.trim(), kind: q("#ddKind").value, bed_id: q("#ddBed").value || null, ward_id: q("#ddWard").value || null,
                or_suite_id: q("#ddSuite").value || null, location_note: q("#ddNote").value.trim(), refresh_seconds: q("#ddRefresh").value, notes: q("#ddNotes").value.trim() };
            const r = await api("/display-devices", { method: "POST", body: JSON.stringify(body) }).catch(() => null);
            if (!r?.success) {
                const field = { name: "#ddName", kind: "#ddKind", bed_id: "#ddBed", ward_id: "#ddWard", or_suite_id: "#ddSuite", location_note: "#ddNote", refresh_seconds: "#ddRefresh" };
                let first = null;
                Object.entries(r?.errors || {}).forEach(([k, msg]) => {
                    const box = mm.querySelector(`[data-err="${k}"]`);
                    if (box) box.textContent = msg;
                    const el = field[k] && q(field[k]);
                    if (el) {
                        el.setAttribute("aria-invalid", "true");
                        first ||= el;
                    }
                });
                if (first) first.focus();
                else showToast(r?.message || "Could not save.", "error");
                return false;
            }
            showToast(r.message, "success");
            load();
            if (r.data.key) setTimeout(() => showLink(r.data, r.data.key, true), 0);
            return true;
        }]]);
    const sync = () => {
        const k = m.querySelector("#ddKind").value;
        m.querySelectorAll("[data-for]").forEach((x) => (x.hidden = x.dataset.for !== k));
    };
    m.querySelector("#ddKind").onchange = sync;
    sync();
}

async function openMore(d) {
    const r = await api(`/display-devices/show?id=${d.id}`).catch(() => null);
    const ev = r?.success ? r.data.events : [];
    const LABEL = { added: "Added", changed: "Changed", new_key: "New key", turned_off: "Turned off", turned_on: "Turned on", reload: "Reload asked", removed: "Removed" };
    const { m, close } = modal(esc(d.name), `
        <div class="dd-muted" style="font-size:13px">${esc(d.kind_label)} · ${esc(d.location || "—")}<br>Key …${esc(d.key_hint)} (since ${esc(String(d.key_set_at).slice(0, 16))})
            ${d.last_user_agent ? `<br>Last seen from ${esc(d.last_ip || "")} · ${esc(d.last_user_agent)}` : ""}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
            <button type="button" class="dd-b" data-newkey>Make a new key…</button>
            <button type="button" class="dd-b danger" data-remove>Remove display…</button></div>
        <div><label>History</label><ul class="dd-ev">${ev.map((x) => `<li>${esc(String(x.created_at).slice(0, 16))} · <b>${esc(LABEL[x.action] || x.action)}</b>${x.user_name ? ` by ${esc(x.user_name)}` : ""}${x.note ? ` — ${esc(x.note)}` : ""}</li>`).join("") || "<li>Nothing yet.</li>"}</ul></div>`,
        [["Close"]]);
    m.querySelector("[data-newkey]").onclick = () => {
        close();
        modal(`New key for ${esc(d.name)}?`, `<p style="margin:0">The TV's current link stops working at once; it shows “not registered” until you open the new link on it. Use this if the link was shared by mistake or the TV is replaced.</p>`,
            [["Cancel"], ["Make new key", "primary", async () => {
                const x = await post("/display-devices/key", { id: d.id });
                if (!x) return false;
                load();
                setTimeout(() => showLink(d, x.data.key, false), 0);
                return true;
            }]]);
    };
    m.querySelector("[data-remove]").onclick = () => {
        close();
        modal(`Remove ${esc(d.name)}?`, `<p style="margin:0">Its key stops working and the TV shows “not registered”. Its history is kept.</p>`,
            [["Cancel"], ["Remove", "danger", async () => {
                if (!(await post("/display-devices", { id: d.id }, "DELETE"))) return false;
                load();
                return true;
            }]]);
    };
}
