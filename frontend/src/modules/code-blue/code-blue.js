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
 *
 * Phase 2, the code record: on each code on now, one tap per event (CPR start / stop, pulse
 * check, rhythm, shock, drugs and doses, airway, note) with a running summary and the timeline;
 * a mistap is struck out or its time corrected (nothing is deleted). Ending the code records the
 * outcome (ROSC, transfer to ICU, died) with its time. Past codes: "Record" opens it (with a printout).
 *
 * Phase 3: the code sheet for the chart (printCodeSheet; the chart lists the patient's codes), crash
 * carts (drugs tapped come off the cart's stock; admin sets up carts and drug links here), and the
 * Code Blue report (code-blue-report.js).
 */

export const CALL_ROLES = ["admin", "doctor", "clinician", "nurse", "charge_nurse", "cna", "pharmacist", "lab_technician", "receptionist", "staff", "accountant"];
const END_ROLES = ["admin", "doctor", "clinician", "charge_nurse"];
export const REPORT_ROLES = ["admin", "doctor", "clinician", "charge_nurse"];
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

.cbr-sum { display: flex; flex-wrap: wrap; gap: 6px; }
.cbr-chip { display: inline-flex; flex-direction: column; padding: 5px 10px; border-radius: 10px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); min-width: 84px; }
.cbr-chip small { font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); font-weight: 700; }
.cbr-chip b { font-size: 14.5px; font-variant-numeric: tabular-nums; }
.cbr-chip.on { background: #dcfce7; border-color: #86efac; color: #14532d; }
.cbr-chip.on small { color: #166534; }
.cbr-chip.due { background: #fef3c7; border-color: #fcd34d; color: #78350f; }
.cbr-chip.due small { color: #92400e; }
:root[data-theme="dark"] .cbr-chip.on { background: #14532d; border-color: #166534; color: #dcfce7; }
:root[data-theme="dark"] .cbr-chip.on small { color: #bbf7d0; }
:root[data-theme="dark"] .cbr-chip.due { background: #451a03; border-color: #92400e; color: #fef3c7; }
:root[data-theme="dark"] .cbr-chip.due small { color: #fde68a; }
.cbr-pad { display: grid; gap: 6px; border: 1px solid var(--border-color); border-radius: 12px; padding: 10px; background: var(--bg-surface-alt); }
.cbr-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.cbr-h { width: 72px; flex: none; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.cbr-pad button, .cbr-pad select, .cbr-pad input { min-height: 40px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 6px 12px; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.cbr-pad input { cursor: text; font-weight: 600; }
.cbr-pad button:hover { border-color: #1d4ed8; }
.cbr-pad button:active { transform: translateY(1px); }
.cbr-pad button.go { background: #15803d; border-color: #15803d; color: #fff; }
.cbr-pad button.stop { background: #b91c1c; border-color: #b91c1c; color: #fff; }
.cbr-pad button.shock { background: #b45309; border-color: #b45309; color: #fff; }
.cbr-pad button:disabled { opacity: .55; }
.cbr-pad button:focus-visible, .cbr-pad select:focus-visible, .cbr-pad input:focus-visible { outline: 3px solid #93c5fd; outline-offset: 1px; }
.cbr-at { display: flex; gap: 6px; align-items: center; font-size: 12.5px; color: var(--text-muted); }
.cbr-tl { max-height: 300px; overflow: auto; display: block; }
.cbr-tl table { width: 100%; }
.cbr-tl td.n { white-space: nowrap; font-variant-numeric: tabular-nums; }
.cbr-tl tr.void td { color: var(--text-muted); }
.cbr-tl tr.void td.e > b { text-decoration: line-through; }
.cbr-sub { font-size: 12px; color: var(--text-muted); }
.cbr-fix { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 6px; padding: 3px 9px; font: inherit; font-size: 12px; cursor: pointer; }
.cbr-out { font-weight: 800; }
.cbr-out.died { color: #b91c1c; }
:root[data-theme="dark"] .cbr-out.died { color: #fca5a5; }
.cbr-end fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.cbr-end legend { font-size: 12.5px; font-weight: 700; color: var(--text-muted); float: left; margin-right: 6px; }
.cbr-end label.o { display: inline-flex; gap: 6px; align-items: center; padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 999px; font-weight: 600; cursor: pointer; }
.cbr-end label.o:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
:root[data-theme="dark"] .cbr-end label.o:has(input:checked) { background: #172554; color: #bfdbfe; }
.cbr-end input[type=time], .cbp-inline input[type=time], .cbp-inline select { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.cbp-inline input[type=time] { flex: 0 0 auto; }
.cbr-modal { max-width: 860px; }
.cbx-chart.alt { background: var(--bg-surface); color: #1d4ed8; border: 1px solid #93c5fd; }
:root[data-theme="dark"] .cbx-chart.alt { color: #93c5fd; border-color: #1e40af; }
.cbr-short { color: #b45309; font-weight: 600; }
:root[data-theme="dark"] .cbr-short { color: #fcd34d; }
.cbr-modal .cbx-body { gap: 14px; }
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
    // The patient's past codes: their code sheets, for the chart.
    api(`/code-blue/patient?patient_id=${encodeURIComponent(patient.id)}`).then((r) => {
        const list = r?.success ? r.data : [];
        if (!list.length || !document.body.contains(box)) return;
        box.style.display = "inline-flex";
        box.style.gap = "6px";
        box.insertAdjacentHTML("beforeend", `<button type="button" class="cbx-chart alt" data-sheets>Code sheets (${list.length})</button>`);
        box.querySelector("[data-sheets]").onclick = () => openPatientCodes(list);
    }).catch(() => {});
}

function openPatientCodes(list) {
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "cbx-ov";
    ov.innerHTML = `<div class="cbx cbr-modal" role="dialog" aria-modal="true" aria-labelledby="cbsTitle">
        <div class="cbx-head"><h2 id="cbsTitle">Code Blue sheets</h2><button type="button" class="cbx-x" data-x aria-label="Close">×</button></div>
        <div class="cbx-body"><table class="cbp-table"><thead><tr><th>Called</th><th>Where</th><th>Outcome</th><th>Length</th><th></th></tr></thead><tbody>
            ${list.map((c) => `<tr><td>${esc(String(c.called_at).slice(0, 16))}</td><td>${esc(c.location)}</td>
                <td>${c.outcome ? `<span class="cbr-out ${c.outcome === "died" ? "died" : ""}">${esc(outcomeText(c))}</span>` : esc({ active: "On now", cancelled: "False alarm", ended: "Ended" }[c.status] || c.status)}</td>
                <td>${mmss(c.seconds)}</td>
                <td style="text-align:right;white-space:nowrap"><button type="button" class="cbx-b" data-record="${c.id}">Record</button>
                    <button type="button" class="cbx-b go" data-sheet="${c.id}">Print sheet</button></td></tr>`).join("")}</tbody></table></div>
        <div class="cbx-foot"><button type="button" class="cbx-b" data-x>Close</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => {
        ov.remove();
        document.removeEventListener("keydown", onKey, true);
        opener?.focus?.();
    };
    const onKey = (k) => {
        if (k.key === "Escape" && !document.querySelectorAll(".cbx-ov")[1]) {
            k.stopPropagation();
            close();
        }
    };
    document.addEventListener("keydown", onKey, true);
    ov.onclick = (ev) => {
        if (ev.target.closest("[data-x]")) return close();
        const rec = ev.target.closest("[data-record]");
        if (rec) return openCodeRecord(Number(rec.dataset.record));
        const sh = ev.target.closest("[data-sheet]");
        if (sh) return printCodeSheet(Number(sh.dataset.sheet));
    };
    ov.querySelector("[data-x]").focus();
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
        const typing = document.activeElement?.closest?.("#codeBlue") && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
        if (!document.hidden && !document.querySelector("#codeBlue .cbp-inline") && !typing && !setupDirty) load();
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
    let carts = null;
    if (getUser()?.role === "admin") {
        const [t, c] = await Promise.all([api("/code-blue/team").catch(() => null), api("/code-blue/carts").catch(() => null)]);
        team = t?.success ? t.data : null;
        carts = c?.success ? c.data : null;
    }
    setupDirty = false;
    render(root, team, carts);
}

const mmss = (s) => {
    const a = Math.abs(Math.round(s));
    return `${s < 0 ? "−" : ""}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`;
};

function tickClocks() {
    document.querySelectorAll("#codeBlue [data-elapsed], #codeBlue [data-tick]").forEach((el) => {
        const k = el.hasAttribute("data-elapsed") ? "elapsed" : "tick";
        const s = Number(el.dataset[k]) + 1;
        el.dataset[k] = s;
        el.textContent = mmss(s);
    });
}

/* ---------------- the code record (Phase 2) ---------------- */

const energyFor = new Map();   // the chosen shock energy, per code (kept across refreshes)
const atFor = new Map();       // "record at" time, per code
const hms = (dt) => String(dt || "").slice(11, 19);
const num = (n) => String(Math.round(Number(n) * 1000) / 1000);
let setupDirty = false;        // admin is editing crash-cart setup: don't refresh under them
const shortDrug = (d) => `${d.name.replace(/ \(.*\)$/, "")} ${d.dose} ${d.unit}`;

/** The summary chips, the one-tap pad (when this person may record) and the timeline. */
function recordBlock(e, o) {
    const r = e.record;
    if (!r || !o) return "";
    const s = r.summary;
    const live = e.status === "active";
    const tick = (secs) => (live ? `data-tick="${secs}"` : "");
    const adrDue = live && s.adrenaline_ago_s !== null && s.adrenaline_ago_s >= 180;
    const chip = (label, val, cls = "", title = "") => `<span class="cbr-chip ${cls}"${title ? ` title="${esc(title)}"` : ""}><small>${label}</small><b>${val}</b></span>`;
    const summary = `<div class="cbr-sum" aria-label="Code record summary">
        ${chip("CPR", s.cpr_on ? `on <span ${tick(s.cpr_since_s)}>${mmss(s.cpr_since_s)}</span>` : "off", s.cpr_on ? "on" : "")}
        ${chip("CPR total", `<span ${s.cpr_on ? tick(s.cpr_total_s) : ""}>${mmss(s.cpr_total_s)}</span>`)}
        ${chip("Rhythm", s.rhythm ? esc(s.rhythm) : "—")}
        ${chip("Shocks", s.shocks ? `${s.shocks} · last ${s.last_energy} J` : "0")}
        ${chip(adrDue ? "Adrenaline — due?" : "Adrenaline", s.adrenaline ? `×${s.adrenaline}${live ? ` · <span ${tick(s.adrenaline_ago_s)}>${mmss(s.adrenaline_ago_s)}</span> ago` : ""}` : "none", adrDue ? "due" : "", "Adult ACLS: adrenaline every 3–5 minutes")}
        ${chip("Drugs", String(s.drugs))}
        ${chip("Airway", s.airway ? esc(s.airway) : "—")}
    </div>`;
    const b = (kind, text, cls = "", attrs = "") => `<button type="button" class="${cls}" data-rec="${kind}" ${attrs}>${esc(text)}</button>`;
    const energy = energyFor.get(e.id) || 200;
    const pad = e.can_record ? `<div class="cbr-pad" role="group" aria-label="Record an event">
        <div class="cbr-row cbr-at"><label for="cbrAt${e.id}">${live ? "At" : "Time it happened"}</label>
            <input type="time" step="1" id="cbrAt${e.id}" data-at value="${esc(atFor.get(e.id) || "")}" ${live ? "" : "required"}>
            <span>${live ? "blank = now (each tap is timed when you press it)" : "required: the code has ended"}</span></div>
        ${e.cart?.carts?.length ? `<div class="cbr-row"><span class="cbr-h">Cart</span><select data-cart aria-label="Crash cart used at this code">
            <option value="">No crash cart (stock not taken)</option>${e.cart.carts.map((c) => `<option value="${c.warehouse_id}" ${c.warehouse_id === e.cart_warehouse_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
            <span class="cbr-sub">${e.cart_warehouse_id ? "Drugs tapped come off this cart's stock." : "Drugs are recorded without taking stock."}</span></div>` : ""}
        <div class="cbr-row"><span class="cbr-h">CPR</span>${s.cpr_on ? b("cpr_stop", "CPR stop", "stop") : b("cpr_start", "CPR start", "go")}${b("pulse_check", "Pulse check")}</div>
        <div class="cbr-row"><span class="cbr-h">Rhythm</span>${o.rhythms.filter((x) => x !== "Other").map((x) => b("rhythm", x, "", `data-value="${esc(x)}"`)).join("")}
            <button type="button" data-form="rhythm">Other…</button></div>
        <div class="cbr-row"><span class="cbr-h">Shock</span><select data-energy aria-label="Shock energy">${o.energies.map((j) => `<option value="${j}" ${j === energy ? "selected" : ""}>${j} J</option>`).join("")}</select>
            ${b("shock", "Shock", "shock")}</div>
        <div class="cbr-row"><span class="cbr-h">Drugs</span>${o.drugs.map((d, i) => b("drug", shortDrug(d), "", `data-drug="${i}" aria-label="${esc(`${d.name} ${d.dose} ${d.unit} ${d.route}`)}"`)).join("")}
            <button type="button" data-form="drug">Other drug…</button></div>
        <div class="cbr-row"><span class="cbr-h">Airway</span>${o.airways.map((x) => b("airway", x, "", `data-value="${esc(x)}"`)).join("")}</div>
        <div class="cbr-row"><span class="cbr-h">Note</span><button type="button" data-form="note">Note…</button></div>
    </div>` : live ? `<div class="cbp-meta">Tap “Responding” to add to the code record.</div>` : "";
    const rows = live ? [...r.entries].reverse() : r.entries;
    const tl = rows.length ? `<div class="cbr-tl"><table class="cbp-table"><thead><tr><th>Time</th><th>Since call</th><th>Event</th><th>By</th><th></th></tr></thead><tbody>
        ${rows.map((x) => `<tr class="${x.voided ? "void" : ""}" data-entry="${x.id}"><td class="n">${esc(hms(x.event_at))}</td><td class="n">+${mmss(x.offset_s)}</td>
            <td class="e"><b>${esc(x.label)}</b>${x.note && (x.kind !== "rhythm" || x.value !== "Other") ? `<div class="cbr-sub">${x.kind === "note" ? "" : "Note: "}${esc(x.note)}</div>` : ""}
                ${x.stock ? `<div class="cbr-sub${x.stock.short ? " cbr-short" : ""}">${x.voided ? "Was taken from the crash cart, put back: " : "From the crash cart: "}${num(x.stock.quantity)} ${esc(x.stock.unit_name)}${x.stock.short ? ` — ${num(x.stock.short)} were not in the cart` : ""}</div>` : ""}
                ${x.original_event_at ? `<div class="cbr-sub">Time corrected (was ${esc(hms(x.original_event_at))})</div>` : x.late ? `<div class="cbr-sub">Entered ${esc(hms(x.recorded_at))}</div>` : ""}
                ${x.voided ? `<div class="cbr-sub">Struck out by ${esc(x.voided_by_name || "")}${x.void_reason ? `: ${esc(x.void_reason)}` : ""}</div>` : ""}</td>
            <td>${esc(x.by_name || "")}</td>
            <td style="text-align:right">${e.can_record && !x.voided ? `<button type="button" class="cbr-fix" data-fix="${x.id}" aria-label="Fix: ${esc(x.label)} at ${esc(hms(x.event_at))}">Fix</button>` : ""}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="cbp-meta">Nothing recorded yet.</div>`;
    return `<div class="cbr" data-rec-for="${e.id}">${summary}${pad}<div><b>Code record</b>${tl}</div></div>`;
}

async function post(path, body) {
    return api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);
}

/**
 * Taps and forms of a record block. scope: the element holding it; e: the code; reload: re-render.
 * Returns true when the click was the record's.
 */
async function onRecordClick(ev, scope, e, o, reload) {
    const t = ev.target;
    const box = scope.querySelector(".cbr");
    if (!box) return false;
    const atInput = box.querySelector("[data-at]");
    const at = () => atInput?.value || "";
    const needTime = () => {
        if (e.status === "active" || at()) return false;
        showToast("Enter the time it happened (the code has ended).", "error");
        atInput?.focus();
        return true;
    };
    const tap = t.closest("[data-rec]");
    if (tap && box.contains(tap)) {
        if (needTime()) return true;
        const body = { id: e.id, kind: tap.dataset.rec, time: at() };
        if (tap.dataset.value) body.value = tap.dataset.value;
        if (body.kind === "shock") body.energy = Number(box.querySelector("[data-energy]").value);
        if (body.kind === "drug") {
            const d = o.drugs[Number(tap.dataset.drug)];
            Object.assign(body, { value: d.name, dose: d.dose, unit: d.unit, route: d.route });
        }
        tap.disabled = true;
        const r = await post("/code-blue/record", body);
        setTimeout(() => (tap.disabled = false), 800);
        if (!r?.success) {
            showToast(r?.message || "Not recorded. Try again.", "error");
            return true;
        }
        showToast(r.message, "success", 2500);
        if (e.status === "active") atFor.delete(e.id);
        await reload();
        return true;
    }
    const form = t.closest("[data-form]");
    if (form && box.contains(form)) {
        box.querySelector(".cbp-inline")?.remove();
        const k = form.dataset.form;
        const fields = k === "drug"
            ? `<input type="text" data-f="value" maxlength="80" aria-label="Drug" placeholder="Drug, e.g. Vasopressin">
               <input type="text" data-f="dose" inputmode="decimal" aria-label="Dose" placeholder="Dose" style="flex:0 1 90px">
               <select data-f="unit" aria-label="Unit">${o.units.map((u) => `<option>${esc(u)}</option>`).join("")}</select>
               <select data-f="route" aria-label="Route">${o.routes.map((u) => `<option>${esc(u)}</option>`).join("")}</select>
               ${e.cart_warehouse_id && e.cart?.stock?.length ? `<select data-f="stock_drug_id" aria-label="Taken from the crash cart"><option value="">Not from the crash cart</option>
                   ${e.cart.stock.map((x) => `<option value="${x.drug_id}">${esc(x.name)} (${num(x.usable)} ${esc(x.unit_name)})</option>`).join("")}</select>
               <input type="text" data-f="stock_qty" inputmode="decimal" aria-label="How many taken from the cart" placeholder="How many" style="flex:0 1 90px">` : ""}`
            : `<input type="text" data-f="note" maxlength="300" aria-label="${k === "rhythm" ? "Rhythm" : "Note"}" placeholder="${k === "rhythm" ? "Which rhythm? e.g. SVT, AF with RVR" : "Note, e.g. family informed, IO access left tibia"}">`;
        box.querySelector(".cbr-pad").insertAdjacentHTML("afterend", `<div class="cbp-inline" data-inline="${k}">${fields}
            <button type="button" class="cbx-b go" data-save>Record</button><button type="button" class="cbx-b" data-back>Back</button><span class="cbx-err" role="alert"></span></div>`);
        const il = box.querySelector(".cbp-inline");
        il.querySelector("input").focus();
        il.querySelector("[data-back]").onclick = () => il.remove();
        il.querySelector("[data-save]").onclick = async (b) => {
            if (needTime()) return;
            const v = (f) => il.querySelector(`[data-f="${f}"]`)?.value.trim() ?? "";
            const body = k === "drug" ? { kind: "drug", value: v("value"), dose: v("dose"), unit: v("unit"), route: v("route"), stock_drug_id: v("stock_drug_id"), stock_qty: v("stock_qty") }
                : k === "rhythm" ? { kind: "rhythm", value: "Other", note: v("note") } : { kind: "note", note: v("note") };
            b.target.disabled = true;
            const r = await post("/code-blue/record", { id: e.id, time: at(), ...body });
            b.target.disabled = false;
            if (!r?.success) {
                il.querySelector(".cbx-err").textContent = r?.message || "Not recorded.";
                return;
            }
            showToast(r.message, "success", 2500);
            il.remove();
            if (e.status === "active") atFor.delete(e.id);
            await reload();
        };
        return true;
    }
    const fix = t.closest("[data-fix]");
    if (fix && box.contains(fix)) {
        box.querySelector(".cbr-fixrow")?.remove();
        const tr = fix.closest("tr");
        const x = e.record.entries.find((y) => y.id === Number(fix.dataset.fix));
        tr.insertAdjacentHTML("afterend", `<tr class="cbr-fixrow"><td colspan="5"><div class="cbp-inline">
            <label class="cbx-lbl" for="cbrFixT" style="margin:0">Correct time</label><input type="time" step="1" id="cbrFixT" value="${esc(hms(x.event_at))}">
            <button type="button" class="cbx-b go" data-savet>Save time</button>
            <input type="text" data-why maxlength="200" aria-label="Reason (optional)" placeholder="Reason to strike out (optional), e.g. tapped twice">
            <button type="button" class="cbx-b danger" data-void>Strike out</button><button type="button" class="cbx-b" data-back>Back</button>
            <span class="cbx-err" role="alert"></span></div></td></tr>`);
        const row = box.querySelector(".cbr-fixrow");
        row.querySelector("#cbrFixT").focus();
        row.querySelector("[data-back]").onclick = () => row.remove();
        const send = async (body, btn) => {
            btn.disabled = true;
            const r = await post("/code-blue/record/fix", { entry_id: x.id, ...body });
            btn.disabled = false;
            if (!r?.success) {
                row.querySelector(".cbx-err").textContent = r?.message || "Not saved.";
                return;
            }
            showToast(r.message, "success");
            row.remove();
            await reload();
        };
        row.querySelector("[data-savet]").onclick = (b) => send({ time: row.querySelector("#cbrFixT").value }, b.target);
        row.querySelector("[data-void]").onclick = (b) => send({ remove: 1, reason: row.querySelector("[data-why]").value.trim() }, b.target);
        return true;
    }
    return false;
}

function bindRecordInputs(scope, id, reload) {
    scope.querySelector(".cbr [data-energy]")?.addEventListener("change", (ev) => energyFor.set(id, Number(ev.target.value)));
    scope.querySelector(".cbr [data-at]")?.addEventListener("input", (ev) => atFor.set(id, ev.target.value));
    scope.querySelector(".cbr [data-cart]")?.addEventListener("change", async (ev) => {
        ev.target.disabled = true;
        const r = await post("/code-blue/cart", { id, warehouse_id: ev.target.value });
        ev.target.disabled = false;
        showToast(r?.message || "Could not change the cart.", r?.success ? "success" : "error");
        ev.target.blur();
        await reload();
    });
}

const outcomeText = (e) => (e.outcome ? `${e.outcome_label}, ${String(e.outcome_at).slice(11, 16)}` : "");

/* ---------------- a past code's record (with a printout) ---------------- */

export async function openCodeRecord(id) {
    ensureCss();
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "cbx-ov";
    ov.innerHTML = `<div class="cbx cbr-modal" role="dialog" aria-modal="true" aria-labelledby="cbrTitle">
        <div class="cbx-head"><h2 id="cbrTitle">Code record</h2><button type="button" class="cbx-x" data-x aria-label="Close">×</button></div>
        <div class="cbx-body"><div class="cbp-empty">Loading…</div></div>
        <div class="cbx-foot"><button type="button" class="cbx-b" data-print>Print code sheet</button><button type="button" class="cbx-b" data-x>Close</button></div></div>`;
    document.body.appendChild(ov);
    const body = ov.querySelector(".cbx-body");
    let e = null;
    const close = () => {
        ov.remove();
        document.removeEventListener("keydown", onKey, true);
        opener?.focus?.();
    };
    const onKey = (k) => {
        if (k.key === "Escape") {
            k.stopPropagation();
            close();
        }
    };
    document.addEventListener("keydown", onKey, true);
    ov.querySelectorAll("[data-x]").forEach((b) => (b.onclick = close));
    ov.querySelector("[data-print]").onclick = () => e && printCodeSheet(e.id);
    const reload = async () => {
        const r = await api(`/code-blue/show?id=${encodeURIComponent(id)}`).catch(() => null);
        if (!r?.success) {
            body.innerHTML = `<div class="cbp-empty">${esc(r?.message || "Could not load.")}</div>`;
            return;
        }
        e = r.data;
        const label = { ended: "Ended", cancelled: "False alarm", active: "On now" }[e.status] || e.status;
        body.innerHTML = `
            <div><div class="cbx-where">${esc(e.location)}</div>
                <div class="cbp-meta" style="margin-top:6px">Called ${esc(String(e.called_at).slice(0, 16))} by ${esc(e.called_by_name || "")}${e.detail ? ` — ${esc(e.detail)}` : ""}
                ${e.patient_name ? ` · Patient: ${esc(e.patient_name)}${e.patient_no ? ` (${esc(e.patient_no)})` : ""}` : ""}<br>
                ${esc(label)}${e.ended_at ? ` ${esc(String(e.ended_at).slice(11, 16))} by ${esc(e.ended_by_name || "")} · length ${mmss(e.seconds)}` : ""}${e.end_note ? ` — ${esc(e.end_note)}` : ""}</div></div>
            ${e.status === "ended" ? `<div><span class="cbx-lbl">Outcome</span>${e.outcome ? `<span class="cbr-out ${e.outcome === "died" ? "died" : ""}">${esc(outcomeText(e))}</span>
                <span class="cbp-meta">${e.outcome === "died" ? "(time of death)" : ""}</span>` : `<span class="cbp-meta">Not recorded.</span>`}
                ${e.can_outcome ? `<button type="button" class="cbr-fix" data-outcome style="margin-left:8px">${e.outcome ? "Correct" : "Record outcome"}</button>` : ""}</div>` : ""}
            ${recordBlock(e, e.record_options)}
            ${e.cart_used?.length ? `<div><b>Taken from the crash cart</b><div class="cbp-meta">${e.cart_used.map((u) => `${esc(u.cart_name)}: ${num(u.quantity)} ${esc(u.unit_name)} ${esc(u.drug_name)}${u.short ? ` (${num(u.short)} not in the cart)` : ""}`).join("; ")}</div></div>` : ""}
            ${e.status !== "active" && !e.can_record ? `<div class="cbp-meta">The record is closed for changes ${e.record_options.record_hours} hours after the code ends (or you weren't at this code).</div>` : ""}`;
        bindRecordInputs(body, e.id, reload);
    };
    body.onclick = async (ev) => {
        if (!e) return;
        if (await onRecordClick(ev, body, e, e.record_options, reload)) return;
        if (ev.target.closest("[data-outcome]")) {
            body.querySelector(".cbr-end")?.remove();
            ev.target.closest("div").insertAdjacentHTML("afterend", outcomeForm(e, e.record_options, "Save outcome"));
            const f = body.querySelector(".cbr-end");
            bindOutcomeForm(f, e, async (vals, btn) => {
                btn.disabled = true;
                const r = await post("/code-blue/outcome", { id: e.id, ...vals });
                btn.disabled = false;
                if (!r?.success) return (f.querySelector(".cbx-err").textContent = r?.message || "Not saved.");
                showToast(r.message, "success");
                await reload();
            });
        }
    };
    await reload();
    ov.querySelector("[data-x]").focus();
}

/** The outcome choice + its time (ending a code, or correcting it afterwards). */
function outcomeForm(e, o, saveLabel, withNote = false) {
    return `<div class="cbp-inline cbr-end"><fieldset><legend>Outcome</legend>
        ${Object.entries(o.outcomes).map(([k, v]) => `<label class="o"><input type="radio" name="cbrOut${e.id}" value="${k}" ${e.outcome === k ? "checked" : ""}> ${esc(v)}</label>`).join("")}</fieldset>
        <label class="cbx-lbl" style="margin:0" for="cbrOt${e.id}" data-otl>Time</label>
        <input type="time" id="cbrOt${e.id}" data-otime value="${esc(e.outcome_at ? String(e.outcome_at).slice(11, 16) : "")}" aria-describedby="cbrOtH${e.id}">
        <span class="cbr-sub" id="cbrOtH${e.id}">${e.outcome_at ? "" : "blank = now"}</span>
        ${withNote ? `<input type="text" data-onote maxlength="500" aria-label="Note (optional)" placeholder="Note (optional)">` : ""}
        <button type="button" class="cbx-b go" data-osave>${esc(saveLabel)}</button><button type="button" class="cbx-b" data-back>Back</button>
        <span class="cbx-err" role="alert"></span></div>`;
}

function bindOutcomeForm(f, e, onSave) {
    const sync = () => {
        const died = f.querySelector("input[type=radio]:checked")?.value === "died";
        f.querySelector("[data-otl]").textContent = died ? "Time of death" : "Time";
    };
    f.addEventListener("change", sync);
    sync();
    (f.querySelector("input[type=radio]:checked") || f.querySelector("input[type=radio]")).focus();
    f.querySelector("[data-back]").onclick = () => f.remove();
    f.querySelector("[data-osave]").onclick = (b) => {
        const outcome = f.querySelector("input[type=radio]:checked")?.value;
        if (!outcome) {
            f.querySelector(".cbx-err").textContent = "Choose the outcome.";
            f.querySelector("input[type=radio]").focus();
            return;
        }
        onSave({ outcome, outcome_time: f.querySelector("[data-otime]").value, note: f.querySelector("[data-onote]")?.value.trim() || "" }, b.target);
    };
}

/**
 * The code sheet for the chart (Phase 3): patient, the event, key times, medicines given (and what
 * came off the crash cart), the full timed record, the team, signatures. Opens a print window.
 */
export async function printCodeSheet(id) {
    const win = window.open("", "_blank");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write(`<p style="font-family:Arial;padding:20px;">Preparing the code sheet…</p>`);
    const r = await api(`/code-blue/sheet?id=${encodeURIComponent(id)}`).catch(() => null);
    if (!r?.success) {
        win.close();
        showToast(r?.message || "Couldn't load the code sheet.", "error");
        return;
    }
    win.document.open();
    win.document.write(codeSheetHtml(r.data));
    win.document.close();
}

export function codeSheetHtml(e) {
    const s = e.record.summary;
    const m = e.metrics;
    const p = e.patient;
    const status = { ended: "Ended", cancelled: "False alarm (cancelled)", active: "Still on" }[e.status] || e.status;
    const at = (secs) => (secs === null || secs === undefined ? "—" : `${mmss(secs)} after the call`);
    const t = (dt) => esc(String(dt || "").slice(0, 19));
    const name = p ? [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ") : "";
    const drugs = e.record.entries.filter((x) => x.kind === "drug");
    const stockLine = (x) => (x.stock ? `${num(x.stock.quantity)} ${esc(x.stock.unit_name)} from the crash cart${x.stock.short ? ` (${num(x.stock.short)} not in the cart)` : ""}${x.voided ? ", put back" : ""}` : "");
    const entryRow = (x) => `<tr class="${x.voided ? "v" : ""}"><td class="n">${esc(hms(x.event_at))}</td><td class="n">+${mmss(x.offset_s)}</td>
        <td class="e"><b>${esc(x.label)}</b>${x.note && (x.kind !== "rhythm" || x.value !== "Other") ? ` — ${esc(x.note)}` : ""}
        ${x.stock ? `<div class="s">${stockLine(x)}</div>` : ""}
        ${x.original_event_at ? `<div class="s">Time corrected (was ${esc(hms(x.original_event_at))})</div>` : x.late ? `<div class="s">Entered ${esc(hms(x.recorded_at))}</div>` : ""}
        ${x.voided ? `<div class="s">Struck out by ${esc(x.voided_by_name || "")}${x.void_reason ? `: ${esc(x.void_reason)}` : ""}</div>` : ""}</td>
        <td>${esc(x.by_name || "")}</td></tr>`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Code Blue record #${e.id}</title>
<style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 10pt; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #111; padding-bottom: 6px; }
    h1 { margin: 0; font-size: 17pt; letter-spacing: .02em; } h2 { font-size: 11pt; margin: 12px 0 4px; text-transform: uppercase; letter-spacing: .04em; }
    .sub { color: #444; font-size: 9.5pt; }
    .box { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 18px; border: 1px solid #999; padding: 7px 10px; margin-top: 8px; }
    .box .w { grid-column: 1 / -1; }
    .k { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #999; margin-top: 4px; }
    .k div { padding: 5px 8px; border-right: 1px solid #ccc; } .k div:last-child { border-right: 0; }
    .k small { display: block; font-size: 7.5pt; text-transform: uppercase; color: #555; } .k b { font-size: 11pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { text-align: left; font-size: 8pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 5px; vertical-align: top; } tr { page-break-inside: avoid; }
    .n { white-space: nowrap; font-variant-numeric: tabular-nums; } .s { color: #555; font-size: 8.5pt; }
    .v td { color: #777; } .v td.e b { text-decoration: line-through; }
    .out { font-weight: bold; font-size: 11pt; }
    .sig { margin-top: 28px; display: flex; gap: 28px; page-break-inside: avoid; } .sig div { flex: 1; border-top: 1px solid #111; padding-top: 3px; font-size: 8.5pt; }
    footer { margin-top: 12px; font-size: 8pt; color: #555; display: flex; justify-content: space-between; }
    .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<header><div><div class="sub">${esc(e.hospital?.name || "")}</div><h1>CODE BLUE RECORD</h1></div>
    <div class="sub" style="text-align:right">Code Blue #${e.id}<br>${t(e.called_at).slice(0, 10)}</div></header>
<div class="box">
    <div><b>Patient:</b> ${p ? esc(name) : "—"}</div><div><b>Patient no.:</b> ${esc(p?.patient_no || "—")}</div>
    <div><b>Sex / age:</b> ${p ? `${esc(p.sex || "—")} / ${p.age ?? "—"}` : "—"}</div><div><b>Birth date:</b> ${esc(p?.birthdate || "—")}</div>
    <div><b>Admission:</b> ${esc(p?.admission_number || "—")}</div><div><b>Attending:</b> ${esc(p?.attending_physician || "—")}</div>
</div>
<div class="box">
    <div class="w"><b>Location:</b> ${esc(e.location)}${e.detail ? ` — ${esc(e.detail)}` : ""}</div>
    <div><b>Called:</b> ${t(e.called_at)}</div><div><b>Called by:</b> ${esc(e.called_by_name || "")} (from the ${esc(e.called_from || "station")})</div>
    <div><b>Status:</b> ${esc(status)}${e.ended_at ? ` ${t(e.ended_at).slice(11)}` : ""}${e.ended_by_name ? ` by ${esc(e.ended_by_name)}` : ""}</div><div><b>Length:</b> ${mmss(e.seconds)}</div>
    <div class="w"><b>Outcome:</b> <span class="out">${e.outcome ? `${esc(e.outcome_label)} — ${e.outcome === "died" ? "time of death" : "at"} ${esc(String(e.outcome_at).slice(11, 16))}` : "—"}</span>
        ${e.outcome_by_name ? `<span class="s"> (recorded by ${esc(e.outcome_by_name)})</span>` : ""}</div>
    ${e.end_note ? `<div class="w"><b>Note:</b> ${esc(e.end_note)}</div>` : ""}
</div>
<h2>Key times</h2>
<div class="k">
    <div><small>First CPR</small><b>${at(m.to_cpr_s)}</b></div>
    <div><small>First rhythm</small><b>${esc(m.first_rhythm || "—")}</b></div>
    <div><small>First shock</small><b>${at(m.to_shock_s)}</b><div class="s">${m.shocks} shock${m.shocks === 1 ? "" : "s"}</div></div>
    <div><small>First adrenaline</small><b>${at(m.to_epi_s)}</b><div class="s">${m.epi_doses} dose${m.epi_doses === 1 ? "" : "s"}</div></div>
</div>
<div class="k" style="border-top:0">
    <div><small>CPR total</small><b>${mmss(s.cpr_total_s)}</b></div><div><small>Pulse checks</small><b>${s.pulse_checks}</b></div>
    <div><small>Airway</small><b>${esc(s.airway || "—")}</b></div><div><small>Drugs given</small><b>${s.drugs}</b></div>
</div>
${drugs.length ? `<h2>Medicines given</h2><table><thead><tr><th>Time</th><th>Since call</th><th>Medicine, dose, route</th><th>Recorded by</th></tr></thead><tbody>${drugs.map(entryRow).join("")}</tbody></table>` : ""}
${e.cart_used?.length ? `<h2>Taken from the crash cart</h2><table><thead><tr><th>Cart</th><th>Item</th><th>Quantity</th></tr></thead><tbody>
    ${e.cart_used.map((u) => `<tr><td>${esc(u.cart_name)}</td><td>${esc(u.drug_name)}</td><td>${num(u.quantity)} ${esc(u.unit_name)}${u.short ? ` <span class="s">(${num(u.short)} not in the cart)</span>` : ""}</td></tr>`).join("")}</tbody></table>` : ""}
<h2>Code record</h2>
<table><thead><tr><th>Time</th><th>Since call</th><th>Event</th><th>Recorded by</th></tr></thead><tbody>
${e.record.entries.map(entryRow).join("") || `<tr><td colspan="4">Nothing recorded.</td></tr>`}
</tbody></table>
<h2>Team</h2>
<table><thead><tr><th>Name</th><th>Role at the code</th><th>Responded</th></tr></thead><tbody>
${e.responders.map((x) => `<tr class="${x.response === "declined" ? "v" : ""}"><td>${esc(x.name)}</td><td>${esc(x.team_role || String(x.role || "").replace("_", " "))}</td>
    <td class="n">${x.response === "declined" ? "Not responding" : esc(hms(x.responded_at))}</td></tr>`).join("") || `<tr><td colspan="3">—</td></tr>`}
</tbody></table>
<div class="sig"><div>Team leader (name, signature)</div><div>Recorder (name, signature)</div><div>${e.outcome === "died" ? "Pronounced by (doctor)" : "Doctor"}</div></div>
<footer><span>Printed ${t(e.printed_at)}${e.printed_by ? ` by ${esc(e.printed_by)}` : ""}</span><span>Confidential patient record — file in the chart</span></footer>
</body></html>`;
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
            ${recordBlock(e, data.record_options)}
            <div class="cbp-acts">
                ${mine?.response === "responding" ? `<span class="cbp-meta">You're responding.</span>` : `<button type="button" class="cbx-b go" data-resp="1">Responding</button>`}
                ${mine?.response !== "declined" && mine?.response !== "responding" ? `<button type="button" class="cbx-b" data-resp="0">Not responding</button>` : ""}
                ${e.patient_id ? `<button type="button" class="cbx-b" data-chart="${e.patient_id}">Patient chart</button>` : ""}
                ${canEnd ? `<button type="button" class="cbx-b" data-end="ended">End code (outcome)…</button><button type="button" class="cbx-b danger" data-end="false_alarm">False alarm…</button>` : ""}
            </div>
        </div></section>`;
}

/** Admin: the crash carts and which stock item each drug button takes. */
function cartSetup(c) {
    if (!c) return "";
    const used = new Set(c.carts.map((x) => x.warehouse_id));
    return `<section class="cbp-sec" data-setup><h2>Crash carts</h2>
        <p class="cbp-sub">Each crash cart is a storage location with its own stock. A code uses its ward's cart (or the general cart, when there is only one);
            the team can switch it on the code. Drugs tapped on the code record come off the cart's stock (earliest expiry first) through the medicine ledger,
            a struck-out entry puts them back, and when the code ends the pharmacy and charge nurses are told what to restock.</p>
        ${c.carts.length ? `<table class="cbp-table"><thead><tr><th>Cart (storage location)</th><th>Ward</th><th>Name on the code</th><th></th></tr></thead><tbody>
            ${c.carts.map((x) => `<tr><td>${esc(x.location_name)}</td><td>${esc(x.ward_name || "General (no ward)")}</td><td>${esc(x.label || "—")}</td>
                <td style="text-align:right"><button type="button" class="cbx-b" data-cart-rm="${x.warehouse_id}">Remove</button></td></tr>`).join("")}</tbody></table>`
            : `<div class="cbp-empty">No crash carts yet: drugs at a code are recorded without taking stock.</div>`}
        <div class="cbp-team"><div><label class="cbx-lbl" for="cbcWh">Storage location</label><select id="cbcWh"><option value="">Choose…</option>
                ${c.locations.filter((l) => !used.has(Number(l.id))).map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select></div>
            <div><label class="cbx-lbl" for="cbcWard">Ward</label><select id="cbcWard"><option value="">General (no ward)</option>${c.wards.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join("")}</select></div>
            <div><label class="cbx-lbl" for="cbcLabel">Name (optional)</label><input type="text" id="cbcLabel" maxlength="80" placeholder="e.g. ICU crash cart 1" style="border:1px solid var(--border-color);border-radius:8px;padding:7px 9px;font:inherit;background:var(--bg-surface);color:var(--text-primary)"></div>
            <button type="button" class="cbx-b" data-cart-add>Add crash cart</button></div>
        <h3 style="font-size:14px;margin:18px 0 4px">Drug buttons → stock items</h3>
        <p class="cbp-sub">Which catalog item each one-tap drug takes, and how much of the dose one unit holds (e.g. amiodarone 150 mg per ampoule: a 300 mg dose takes 2).
            A button with no item is recorded without taking stock.</p>
        <table class="cbp-table" data-links><thead><tr><th>Button</th><th>Stock item</th><th>Dose in one unit</th></tr></thead><tbody>
            ${c.buttons.map((b) => `<tr data-key="${esc(b.key)}"><td><b>${esc(b.name)}</b><div class="cbp-meta">${b.doses.map((d) => `${d} ${esc(b.unit)}`).join(", ")}</div></td>
                <td><select data-l="drug" aria-label="Stock item for ${esc(b.name)}" style="max-width:320px;width:100%"><option value="">Not linked</option>
                    ${c.drugs.map((d) => `<option value="${d.id}" ${b.link?.drug_id === Number(d.id) ? "selected" : ""}>${esc(d.name)}${d.unit_name ? ` (${esc(d.unit_name)})` : ""}</option>`).join("")}</select></td>
                <td><input type="text" inputmode="decimal" data-l="amt" value="${b.link ? num(b.link.amount_per_unit) : ""}" aria-label="${esc(b.unit)} of ${esc(b.name)} in one unit"
                    style="width:80px;border:1px solid var(--border-color);border-radius:8px;padding:6px 8px;font:inherit;background:var(--bg-surface);color:var(--text-primary)"> ${esc(b.unit)}</td></tr>`).join("")}
        </tbody></table>
        <div class="cbp-acts" style="margin-top:8px"><button type="button" class="cbx-b go" data-links-save>Save drug links</button><span class="cbx-err" data-links-err role="alert"></span></div>
    </section>`;
}

function render(root, team, carts) {
    const active = data.active;
    const hist = data.history.filter((h) => h.status !== "active");
    const statusLabel = { ended: "Ended", cancelled: "False alarm", active: "On now" };
    root.innerHTML = `
        <div class="cbp-head"><div><h1>Code Blue</h1><div class="cbp-sub">Codes on now refresh every few seconds. Tap “Responding” if you are going.</div></div>
            <div class="cbp-acts">${REPORT_ROLES.includes(getUser()?.role) ? `<button type="button" class="cbx-b" data-report>Code Blue report</button>` : ""}
            <button type="button" class="cbx-b go" data-call>CALL CODE BLUE</button></div></div>
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
        ${cartSetup(carts)}
        <section class="cbp-sec"><h2>Last codes</h2>
            ${hist.length ? `<table class="cbp-table"><thead><tr><th>Called</th><th>Where</th><th>Result</th><th>Outcome</th><th>Length</th><th>Called by</th><th>Responding</th><th></th></tr></thead><tbody>
                ${hist.map((h) => `<tr><td>${esc(String(h.called_at).slice(0, 16))}</td><td>${esc(h.location)}</td><td>${statusLabel[h.status] || esc(h.status)}${h.end_note ? `<div class="cbp-meta">${esc(h.end_note)}</div>` : ""}</td>
                    <td>${h.outcome ? `<span class="cbr-out ${h.outcome === "died" ? "died" : ""}">${esc(outcomeText(h))}</span>` : h.status === "ended" ? `<span class="cbp-meta">Not recorded</span>` : "—"}</td>
                    <td>${mmss(h.seconds)}</td><td>${esc(h.called_by_name || "")}</td><td>${h.responding_count}</td>
                    <td style="text-align:right;white-space:nowrap"><button type="button" class="cbx-b" data-record="${h.id}" aria-label="Code record: ${esc(h.location)}, ${esc(String(h.called_at).slice(0, 16))}">Record</button>
                        <button type="button" class="cbx-b" data-sheet="${h.id}" aria-label="Print the code sheet: ${esc(h.location)}, ${esc(String(h.called_at).slice(0, 16))}">Sheet</button></td></tr>`).join("")}</tbody></table>` : `<div class="cbp-empty">No codes yet.</div>`}
        </section>`;
    root.onclick = onClick;
    active.forEach((e) => bindRecordInputs(root.querySelector(`.cbp-card[data-id="${e.id}"]`), e.id, load));
    const setupBox = root.querySelector("[data-setup]");
    setupBox?.addEventListener("input", () => (setupDirty = true));
    setupBox?.addEventListener("change", () => (setupDirty = true));
}

async function onClick(e) {
    if (e.target.closest("[data-call]")) return openCallCodeBlue({ from: "station" });
    const recBtn = e.target.closest("[data-record]");
    if (recBtn) return openCodeRecord(Number(recBtn.dataset.record));
    const sheetBtn = e.target.closest("[data-sheet]");
    if (sheetBtn) return printCodeSheet(Number(sheetBtn.dataset.sheet));
    if (e.target.closest("[data-report]")) return window.__openDashboardTab?.("code_blue_report", "Code Blue Report");
    if (e.target.closest("[data-cart-add]")) {
        const warehouse_id = document.getElementById("cbcWh").value;
        if (!warehouse_id) return document.getElementById("cbcWh").focus();
        const r = await post("/code-blue/carts", { warehouse_id, ward_id: document.getElementById("cbcWard").value, label: document.getElementById("cbcLabel").value.trim() });
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        if (r?.success) return load();
        return;
    }
    const cartRm = e.target.closest("[data-cart-rm]");
    if (cartRm) {
        const r = await api("/code-blue/carts", { method: "DELETE", body: JSON.stringify({ warehouse_id: Number(cartRm.dataset.cartRm) }) }).catch(() => null);
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        return load();
    }
    if (e.target.closest("[data-links-save]")) {
        const err = document.querySelector("#codeBlue [data-links-err]");
        err.textContent = "";
        const links = [...document.querySelectorAll("#codeBlue [data-links] tr[data-key]")].map((tr) => ({
            key: tr.dataset.key, drug_id: tr.querySelector('[data-l="drug"]').value || 0, amount_per_unit: tr.querySelector('[data-l="amt"]').value.trim(),
        }));
        const missing = links.findIndex((l) => l.drug_id && !(Number(l.amount_per_unit) > 0));
        if (missing >= 0) {
            err.textContent = "Enter how much of the dose one unit holds for each linked drug.";
            document.querySelectorAll("#codeBlue [data-links] tr[data-key]")[missing].querySelector('[data-l="amt"]').focus();
            return;
        }
        const r = await post("/code-blue/cart-drugs", { links });
        if (!r?.success) {
            err.textContent = r?.message || "Could not save.";
            return;
        }
        showToast(r.message, "success");
        return load();
    }
    const card = e.target.closest(".cbp-card");
    const id = Number(card?.dataset.id);
    const ev = id ? data.active.find((x) => x.id === id) : null;
    if (ev && (await onRecordClick(e, card, ev, data.record_options, load))) return;
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
    if (end && id && end.dataset.end === "ended") {
        card.querySelector(".cbr-end")?.remove();
        card.querySelector(".cbp-acts").insertAdjacentHTML("afterend", outcomeForm({ id }, data.record_options, "End the code", true));
        const f = card.querySelector(".cbr-end");
        bindOutcomeForm(f, { id }, async (vals, btn) => {
            btn.disabled = true;
            const r = await post("/code-blue/end", { id, reason: "ended", ...vals });
            btn.disabled = false;
            if (!r?.success) {
                f.querySelector(".cbx-err").textContent = r?.message || "Could not save.";
                return;
            }
            showToast(r.message, "success", 6000);
            refreshTopButton();
            load();
        });
        return;
    }
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
