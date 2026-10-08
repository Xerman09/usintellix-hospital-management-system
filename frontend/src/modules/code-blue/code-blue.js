import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";

/*
 * Code Blue (module 10, Phase 1: activation).
 *   * openCallCodeBlue() -- the call dialog: an admitted patient's bed (chart, census) or a place
 *     (top bar at the nurse station). The location is required. One press + confirm.
 *   * initCodeBlueButton() -- the red "Code Blue" button in the top bar (every staff screen).
 *   * The Code Blue screen (tab code_blue): codes on now with who is responding, "Responding" /
 *     "Not responding", end the code (or false alarm); the code team (admin); the last codes.
 * The alert itself (pop-up with a siren) is the bell's (alert-bell.js).
 */

export const CALL_ROLES = ["admin", "doctor", "clinician", "nurse", "charge_nurse", "cna", "pharmacist", "lab_technician", "receptionist", "staff", "accountant"];
const END_ROLES = ["admin", "doctor", "clinician", "charge_nurse"];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;

const CSS = `
.cbx-top { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 999px; border: 0; background: #1d4ed8; color: #fff; font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: .03em; cursor: pointer; margin-right: 6px; white-space: nowrap; }
.cbx-top:hover { background: #1e40af; }
.cbx-top:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.cbx-top svg { width: 15px; height: 15px; }
.cbx-top .n { background: #fff; color: #1d4ed8; border-radius: 9px; padding: 0 6px; font-size: 11px; }
@media (max-width: 700px) { .cbx-top .lbl { display: none; } }
.cbx-chart { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 0; background: #1d4ed8; color: #fff; font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; }
.cbx-chart svg { width: 15px; height: 15px; }
.cbx-chart:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.cbx-ov { position: fixed; inset: 0; background: rgba(15,23,42,.6); z-index: 5200; display: flex; align-items: center; justify-content: center; padding: 16px; }
.cbx { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 520px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.4); border-top: 8px solid #1d4ed8; }
.cbx-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px 4px; }
.cbx-head h2 { margin: 0; font-size: 20px; color: #1d4ed8; letter-spacing: .02em; }
:root[data-theme="dark"] .cbx-head h2 { color: #93c5fd; }
.cbx-x { border: 0; background: none; font-size: 22px; cursor: pointer; color: var(--text-muted); padding: 4px 8px; border-radius: 6px; }
.cbx-body { padding: 6px 18px 4px; overflow: auto; display: grid; gap: 12px; font-size: 13.5px; }
.cbx-body label, .cbx-lbl { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.cbx-body input[type=text], .cbx-body select { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 9px 10px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.cbx-body [aria-invalid="true"] { border-color: #dc2626; }
.cbx-where { font-size: 18px; font-weight: 800; padding: 10px 12px; border-radius: 10px; background: #eff6ff; color: #1e3a8a; }
:root[data-theme="dark"] .cbx-where { background: #172554; color: #dbeafe; }
.cbx-seg { display: flex; gap: 6px; flex-wrap: wrap; }
.cbx-seg label { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 999px; margin: 0; font-size: 13px; color: var(--text-primary); cursor: pointer; font-weight: 600; }
.cbx-seg label:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
:root[data-theme="dark"] .cbx-seg label:has(input:checked) { background: #172554; color: #bfdbfe; }
.cbx-err { color: #dc2626; font-size: 12.5px; min-height: 1em; }
.cbx-on { border: 1px solid #93c5fd; border-radius: 10px; padding: 8px 10px; font-size: 12.5px; background: #eff6ff; color: #1e3a8a; }
:root[data-theme="dark"] .cbx-on { background: #172554; color: #dbeafe; border-color: #1e40af; }
.cbx-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 14px 18px 16px; border-top: 1px solid var(--border-color); }
.cbx-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.cbx-b.go { background: #1d4ed8; border-color: #1d4ed8; color: #fff; font-size: 15px; padding: 10px 20px; letter-spacing: .02em; }
.cbx-b.go:hover { background: #1e40af; }
.cbx-b.danger { color: #b91c1c; border-color: #fca5a5; }
.cbx-b:disabled { opacity: .6; cursor: default; }
.cbx-b:focus-visible, .cbx-x:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }

.cbp { padding: 20px 24px 40px; max-width: 1200px; margin: 0 auto; color: var(--text-primary); }
.cbp-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 14px; }
.cbp-head h1 { margin: 0; font-size: 22px; }
.cbp-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.cbp-card { border: 2px solid #1d4ed8; border-radius: 14px; overflow: hidden; margin-bottom: 16px; background: var(--bg-surface); }
.cbp-card.done { border-color: var(--border-color); }
.cbp-bar { background: #1d4ed8; color: #fff; padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: baseline; justify-content: space-between; }
.cbp-bar h2 { margin: 0; font-size: 20px; }
.cbp-bar .t { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
.cbp-in { padding: 12px 16px; display: grid; gap: 10px; font-size: 13.5px; }
.cbp-meta { color: var(--text-muted); }
.cbp-resp { display: flex; flex-wrap: wrap; gap: 6px; }
.cbp-resp span { padding: 4px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-weight: 600; font-size: 12.5px; }
.cbp-resp span.no { background: var(--bg-surface-alt); color: var(--text-muted); text-decoration: line-through; }
:root[data-theme="dark"] .cbp-resp span { background: #14532d; color: #bbf7d0; }
.cbp-acts { display: flex; flex-wrap: wrap; gap: 8px; }
.cbp-inline { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.cbp-inline input { flex: 1 1 220px; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.cbp-sec { margin-top: 22px; }
.cbp-sec h2 { font-size: 16px; margin: 0 0 8px; }
.cbp-table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; }
.cbp-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
.cbp-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
.cbp-empty { padding: 26px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.cbp-team { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; margin-top: 8px; }
.cbp-team select { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
@media (max-width: 700px) { .cbp-table thead { display: none; } .cbp-table tr, .cbp-table td { display: block; } }
`;

function ensureCss() {
    if (!document.getElementById("cbx-style")) {
        const st = document.createElement("style");
        st.id = "cbx-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}

const canCall = () => CALL_ROLES.includes(getUser()?.role);

/* ---------------- the call dialog ---------------- */

/** opts: admission_id? | patient_id? (chart, census), from (chart | census | station) */
export async function openCallCodeBlue(opts = {}) {
    ensureCss();
    if (!canCall()) return;
    const res = await api("/code-blue").catch(() => null);
    if (!res?.success) {
        showToast(res?.message || "Could not open Code Blue. Call it by phone.", "error");
        return;
    }
    const d = res.data;
    const known = opts.admission_id
        ? d.patients.find((p) => Number(p.admission_id) === Number(opts.admission_id))
        : opts.patient_id ? d.patients.find((p) => Number(p.patient_id) === Number(opts.patient_id)) : null;
    const place = (p) => `${p.ward_name} · ${p.room_number} · Bed ${p.bed_number}`;
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "cbx-ov";
    const patientMode = !!known;
    ov.innerHTML = `<form class="cbx" role="alertdialog" aria-modal="true" aria-labelledby="cbxTitle" novalidate>
        <div class="cbx-head"><h2 id="cbxTitle">CALL CODE BLUE</h2><button type="button" class="cbx-x" data-x aria-label="Close">×</button></div>
        <div class="cbx-body">
            ${d.active.length ? `<div class="cbx-on"><b>${d.active.length} Code Blue on now:</b> ${d.active.map((a) => esc(a.location)).join("; ")}.
                A call for the same patient or place joins it. <a href="#" data-open>Open the Code Blue screen</a></div>` : ""}
            ${opts.admission_id || opts.patient_id ? (known
                ? `<div><span class="cbx-lbl">Where</span><div class="cbx-where">${esc(place(known))}</div></div>
                   <div class="cbx-seg"><label><input type="checkbox" data-elsewhere> The patient is somewhere else</label></div>`
                : `<div class="cbx-on">This patient isn't admitted to a bed: say where they are.</div>`) : `
            <div><span class="cbx-lbl" id="cbxForLbl">Where is it?</span>
                <div class="cbx-seg" role="radiogroup" aria-labelledby="cbxForLbl">
                    <label><input type="radio" name="cbxFor" value="patient" checked> A patient in a bed</label>
                    <label><input type="radio" name="cbxFor" value="place"> A place</label></div></div>
            <div data-patient><label for="cbxPatient">Patient's bed</label><select id="cbxPatient"><option value="">Choose the bed…</option>
                ${d.patients.map((p) => `<option value="${p.admission_id}">${esc(place(p))} — ${esc(p.patient_name)}</option>`).join("")}</select></div>`}
            <div data-place ${patientMode || (!opts.admission_id && !opts.patient_id) ? "hidden" : ""}>
                <label for="cbxWard">Ward <span style="font-weight:400">(if on a ward)</span></label>
                <select id="cbxWard"><option value="">Not on a ward</option>${d.wards.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join("")}</select>
                <label for="cbxLoc" style="margin-top:8px">Where exactly</label>
                <input type="text" id="cbxLoc" maxlength="150" placeholder="e.g. Main lobby, X-ray room 2, Room 305 bathroom" autocomplete="off"></div>
            <div><label for="cbxDetail">What happened <span style="font-weight:400">(optional)</span></label>
                <input type="text" id="cbxDetail" maxlength="200" placeholder="e.g. found unresponsive, not breathing" autocomplete="off"></div>
            <div class="cbx-err" role="alert"></div>
        </div>
        <div class="cbx-foot"><button type="button" class="cbx-b" data-x>Cancel</button><button type="submit" class="cbx-b go">CALL CODE BLUE</button></div>
    </form>`;
    document.body.appendChild(ov);
    const f = ov.querySelector("form");
    const $ = (s) => f.querySelector(s);
    const mode = () => (opts.admission_id || opts.patient_id)
        ? (known && !$("[data-elsewhere]")?.checked ? "known" : "place")
        : f.querySelector('input[name="cbxFor"]:checked').value;
    const sync = () => {
        const m = mode();
        if ($("[data-patient]")) $("[data-patient]").hidden = m !== "patient";
        $("[data-place]").hidden = m !== "place";
    };
    f.addEventListener("change", sync);
    sync();
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
    f.querySelectorAll("[data-x]").forEach((b) => (b.onclick = close));
    $("[data-open]")?.addEventListener("click", (e) => {
        e.preventDefault();
        close();
        window.__openDashboardTab?.("code_blue", "Code Blue");
    });
    f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = $(".cbx-err");
        f.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
        const m = mode();
        const body = { from: opts.from || "station", detail: $("#cbxDetail").value.trim() };
        if (m === "known") body.admission_id = known.admission_id;
        else if (m === "patient") {
            body.admission_id = $("#cbxPatient").value;
            if (!body.admission_id) {
                err.textContent = "Choose the patient's bed (or choose “A place”).";
                $("#cbxPatient").setAttribute("aria-invalid", "true");
                $("#cbxPatient").focus();
                return;
            }
        } else {
            body.location = $("#cbxLoc").value.trim();
            body.ward_id = $("#cbxWard").value || null;
            if (opts.patient_id) body.patient_id = opts.patient_id;
            if (opts.admission_id) body.admission_id = opts.admission_id;
            if (!body.location) {
                err.textContent = "Where is it? The team needs the place.";
                $("#cbxLoc").setAttribute("aria-invalid", "true");
                $("#cbxLoc").focus();
                return;
            }
        }
        const btn = f.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Calling…";
        const r = await api("/code-blue", { method: "POST", body: JSON.stringify(body) }).catch(() => null);
        if (!r?.success) {
            btn.disabled = false;
            btn.textContent = "CALL CODE BLUE";
            err.textContent = r?.message || "Could not call it. Call the Code Blue number by phone.";
            const field = r?.errors?.location ? "#cbxLoc" : r?.errors?.admission_id ? "#cbxPatient" : null;
            if (field && $(field)) {
                $(field).setAttribute("aria-invalid", "true");
                $(field).focus();
            }
            return;
        }
        close();
        showToast(r.message, "success", 6000);
        window.__openDashboardTab?.("code_blue", "Code Blue");
        refreshTopButton();
    });
    (patientMode ? f.querySelector("button[type=submit]") : ($("#cbxPatient") || $("#cbxLoc"))).focus();
}

/* ---------------- top bar + chart buttons ---------------- */

let topTimer = null;

/** The red "Code Blue" button in the top bar (the nurse station's way in). */
export function initCodeBlueButton(user) {
    if (!user || !CALL_ROLES.includes(user.role)) return;
    ensureCss();
    const right = document.querySelector(".navbar-right");
    if (!right || document.getElementById("cbxTopBtn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cbx-top";
    btn.id = "cbxTopBtn";
    btn.innerHTML = `${ICON}<span class="lbl">Code Blue</span><span class="n" hidden></span>`;
    btn.setAttribute("aria-label", "Call a Code Blue");
    btn.onclick = () => openCallCodeBlue({ from: "station" });
    right.insertBefore(btn, right.firstChild);
    refreshTopButton();
    clearInterval(topTimer);
    topTimer = setInterval(() => {
        if (!document.getElementById("cbxTopBtn")) return clearInterval(topTimer);
        if (!document.hidden) refreshTopButton();
    }, 30000);
}

async function refreshTopButton() {
    const btn = document.getElementById("cbxTopBtn");
    if (!btn) return;
    const r = await api("/code-blue").catch(() => null);
    const n = r?.success ? r.data.active.length : 0;
    const badge = btn.querySelector(".n");
    badge.hidden = !n;
    badge.textContent = n;
    btn.setAttribute("aria-label", n ? `Call a Code Blue (${n} on now)` : "Call a Code Blue");
}

/** The chart's Code Blue button (the location comes from the patient's bed). */
export function mountChartCodeBlue(patient) {
    const box = document.getElementById("pdCodeBlueBtn");
    if (!box || !patient?.id || !canCall()) return;
    ensureCss();
    box.innerHTML = `<button type="button" class="cbx-chart">${ICON}Code Blue</button>`;
    box.querySelector("button").onclick = () => openCallCodeBlue({ patient_id: patient.id, from: "chart" });
}

/* ---------------- the Code Blue screen ---------------- */

let pageTimer = null;
let clockTimer = null;
let data = null;

export function CodeBlueView() {
    ensureCss();
    return `<div class="cbp" id="codeBlue"><div class="cbp-empty">Loading…</div></div>`;
}

export function initCodeBlue() {
    clearInterval(pageTimer);
    clearInterval(clockTimer);
    load();
    pageTimer = setInterval(() => {
        if (!document.getElementById("codeBlue")) return clearInterval(pageTimer);
        if (!document.hidden && !document.querySelector("#codeBlue .cbp-inline")) load();
    }, 5000);
    clockTimer = setInterval(tickClocks, 1000);
}

async function load() {
    const root = document.getElementById("codeBlue");
    if (!root) return;
    const r = await api("/code-blue").catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="cbp-empty">${esc(r?.message || "Could not load.")}</div>`;
        return;
    }
    data = r.data;
    let team = null;
    if (getUser()?.role === "admin") {
        const t = await api("/code-blue/team").catch(() => null);
        team = t?.success ? t.data : null;
    }
    render(root, team);
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function tickClocks() {
    document.querySelectorAll("#codeBlue [data-elapsed]").forEach((el) => {
        const s = Number(el.dataset.elapsed) + 1;
        el.dataset.elapsed = s;
        el.textContent = mmss(s);
    });
}

function activeCard(e) {
    const me = getUser();
    const mine = e.responders.find((p) => p.user_id === Number(me?.id));
    const canEnd = e.called_by === Number(me?.id) || data.on_team || END_ROLES.includes(me?.role);
    return `<section class="cbp-card" data-id="${e.id}" aria-label="Code Blue at ${esc(e.location)}">
        <div class="cbp-bar"><h2>CODE BLUE — ${esc(e.location)}</h2><span class="t" data-elapsed="${e.seconds}" aria-label="Time since called">${mmss(e.seconds)}</span></div>
        <div class="cbp-in">
            <div class="cbp-meta">Called ${esc(String(e.called_at).slice(11, 16))} by ${esc(e.called_by_name || "")} (from the ${esc(e.called_from || "station")})${e.detail ? ` — ${esc(e.detail)}` : ""}${e.patient_name ? ` · Patient: ${esc(e.patient_name)}` : ""}</div>
            <div><b>${e.responding_count} responding</b>
                <div class="cbp-resp">${e.responders.map((p) => `<span class="${p.response === "declined" ? "no" : ""}" title="${p.response === "declined" ? "Not responding" : "Responding"}">${esc(p.name)}${p.team_role ? ` · ${esc(p.team_role)}` : p.role ? ` · ${esc(p.role.replace("_", " "))}` : ""}</span>`).join("") || "—"}</div></div>
            <div class="cbp-acts">
                ${mine?.response === "responding" ? `<span class="cbp-meta">You're responding.</span>` : `<button type="button" class="cbx-b go" data-resp="1">Responding</button>`}
                ${mine?.response !== "declined" && mine?.response !== "responding" ? `<button type="button" class="cbx-b" data-resp="0">Not responding</button>` : ""}
                ${e.patient_id ? `<button type="button" class="cbx-b" data-chart="${e.patient_id}">Patient chart</button>` : ""}
                ${canEnd ? `<button type="button" class="cbx-b" data-end="ended">End code…</button><button type="button" class="cbx-b danger" data-end="false_alarm">False alarm…</button>` : ""}
            </div>
        </div></section>`;
}

function render(root, team) {
    const active = data.active;
    const hist = data.history.filter((h) => h.status !== "active");
    const statusLabel = { ended: "Ended", cancelled: "False alarm", active: "On now" };
    root.innerHTML = `
        <div class="cbp-head"><div><h1>Code Blue</h1><div class="cbp-sub">Codes on now refresh every few seconds. Tap “Responding” if you are going.</div></div>
            <button type="button" class="cbx-b go" data-call>CALL CODE BLUE</button></div>
        ${active.length ? active.map(activeCard).join("") : `<div class="cbp-empty">No Code Blue now.</div>`}
        ${team ? `<section class="cbp-sec"><h2>Code team</h2>
            <p class="cbp-sub">Alerted for every Code Blue, wherever it is. With nobody on the team, every doctor is alerted. The ward's nurses and every charge nurse are always alerted.</p>
            ${team.members.length ? `<table class="cbp-table"><thead><tr><th>Name</th><th>Team role</th><th>Job</th><th></th></tr></thead><tbody>
                ${team.members.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.team_role || "—")}</td><td>${esc(String(m.role || "").replace("_", " "))}</td>
                    <td style="text-align:right"><button type="button" class="cbx-b" data-remove="${m.user_id}">Remove</button></td></tr>`).join("")}</tbody></table>` : `<div class="cbp-empty">Nobody on the code team yet.</div>`}
            <div class="cbp-team"><div><label class="cbx-lbl" for="cbpUser">Add</label><select id="cbpUser"><option value="">Choose staff…</option>
                ${team.staff.filter((s) => !team.members.some((m) => m.user_id === s.id)).map((s) => `<option value="${s.id}">${esc(s.name)} (${esc(s.role.replace("_", " "))})</option>`).join("")}</select></div>
                <div><label class="cbx-lbl" for="cbpRole">Team role</label><select id="cbpRole"><option value="">—</option>${team.team_roles.map((r) => `<option>${esc(r)}</option>`).join("")}</select></div>
                <button type="button" class="cbx-b" data-add>Add to team</button></div></section>` : ""}
        <section class="cbp-sec"><h2>Last codes</h2>
            ${hist.length ? `<table class="cbp-table"><thead><tr><th>Called</th><th>Where</th><th>Result</th><th>Length</th><th>Called by</th><th>Responding</th></tr></thead><tbody>
                ${hist.map((h) => `<tr><td>${esc(String(h.called_at).slice(0, 16))}</td><td>${esc(h.location)}</td><td>${statusLabel[h.status] || esc(h.status)}${h.end_note ? `<div class="cbp-meta">${esc(h.end_note)}</div>` : ""}</td>
                    <td>${mmss(h.seconds)}</td><td>${esc(h.called_by_name || "")}</td><td>${h.responding_count}</td></tr>`).join("")}</tbody></table>` : `<div class="cbp-empty">No codes yet.</div>`}
        </section>`;
    root.onclick = onClick;
}

async function onClick(e) {
    if (e.target.closest("[data-call]")) return openCallCodeBlue({ from: "station" });
    const card = e.target.closest(".cbp-card");
    const id = Number(card?.dataset.id);
    const resp = e.target.closest("[data-resp]");
    if (resp && id) {
        resp.disabled = true;
        const r = await api("/code-blue/respond", { method: "POST", body: JSON.stringify({ id, responding: resp.dataset.resp }) }).catch(() => null);
        if (!r?.success) showToast(r?.message || "Could not save.", "error");
        else showToast(r.message, "success");
        return load();
    }
    const chart = e.target.closest("[data-chart]");
    if (chart) return window.__openPatientChartFromReport?.(chart.dataset.chart);
    const end = e.target.closest("[data-end]");
    if (end && id) {
        card.querySelector(".cbp-inline")?.remove();
        const fa = end.dataset.end === "false_alarm";
        end.closest(".cbp-acts").insertAdjacentHTML("afterend", `<div class="cbp-inline"><input type="text" maxlength="500" aria-label="Note"
            placeholder="${fa ? "What happened? (required)" : "Outcome (optional), e.g. ROSC, to ICU"}">
            <button type="button" class="cbx-b ${fa ? "danger" : "go"}" data-confirm>${fa ? "Cancel the code (false alarm)" : "End the code"}</button>
            <button type="button" class="cbx-b" data-back>Back</button><span class="cbx-err" role="alert"></span></div>`);
        const box = card.querySelector(".cbp-inline");
        box.querySelector("input").focus();
        box.querySelector("[data-back]").onclick = () => box.remove();
        box.querySelector("[data-confirm]").onclick = async (ev) => {
            const note = box.querySelector("input").value.trim();
            if (fa && !note) {
                box.querySelector(".cbx-err").textContent = "Say what happened.";
                box.querySelector("input").focus();
                return;
            }
            ev.target.disabled = true;
            const r = await api("/code-blue/end", { method: "POST", body: JSON.stringify({ id, reason: end.dataset.end, note }) }).catch(() => null);
            ev.target.disabled = false;
            if (!r?.success) {
                box.querySelector(".cbx-err").textContent = r?.message || "Could not save.";
                return;
            }
            showToast(r.message, "success");
            refreshTopButton();
            load();
        };
        return;
    }
    if (e.target.closest("[data-add]")) {
        const user_id = document.getElementById("cbpUser").value;
        if (!user_id) return document.getElementById("cbpUser").focus();
        const r = await api("/code-blue/team", { method: "POST", body: JSON.stringify({ user_id, team_role: document.getElementById("cbpRole").value }) }).catch(() => null);
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        return load();
    }
    const rm = e.target.closest("[data-remove]");
    if (rm) {
        const r = await api("/code-blue/team", { method: "DELETE", body: JSON.stringify({ user_id: Number(rm.dataset.remove) }) }).catch(() => null);
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        return load();
    }
}
