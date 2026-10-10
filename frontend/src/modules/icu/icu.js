import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * ICU (module 13, Phase 1; tab "icu"): the ICU board (patients in ICU wards) and each patient's
 * flowsheet for an ICU day (07:00 to 07:00), hour by hour:
 *   * vital signs (saved as inpatient vital signs too: NEWS2, graphs), CVP, EtCO2;
 *   * level of consciousness: GCS, RASS, pupils, CAM-ICU;
 *   * oxygen device and ventilator settings;
 *   * drips: rate (mL/h) and dose, titrations, stop; the volume infused counts as intake;
 *   * intake and output by type, the hour's balance and the running balance.
 * Click an hour to chart it (or correct it, with a reason).
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hm = (dt) => String(dt || "").slice(11, 16);
const num = (v, d = 1) => (v === null || v === undefined || v === "" ? "" : String(Math.round(Number(v) * 10 ** d) / 10 ** d));
const ml = (v) => (v === null || v === undefined ? "" : `${Math.round(Number(v))}`);
/** Grid cells: blank instead of 0. */
const mlc = (v) => (v ? ml(v) : "");
const signed = (v) => (v === null || v === undefined ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v))}`);
const ago = (m) => (m === null || m === undefined ? "" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`);

const CSS = `
.icu { padding: 20px 24px 40px; max-width: 1500px; margin: 0 auto; color: var(--text-primary); }
@media (max-width: 600px) { .icu { padding: 16px 16px 32px; } }
.icu h1 { margin: 0; font-size: 22px; }
.icu-sub { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
.icu-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 12px; }
.icu-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.icu-b.blue { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.icu-b.sm { padding: 4px 9px; font-size: 12.5px; }
.icu-b:disabled { opacity: .55; cursor: default; }
.icu-b:focus-visible, .icu button:focus-visible, .icx button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.icu-empty { padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.icu-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 12px; }
.icu-card { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); padding: 12px 14px; display: grid; gap: 6px; font-size: 13px; min-width: 0; }
.icu-card.due { border-color: #f59e0b; box-shadow: inset 4px 0 0 #f59e0b; }
.icu-card h3 { margin: 0; font-size: 15px; overflow-wrap: anywhere; }
.icu-card .row { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.icu .muted, .icx .muted { color: var(--text-muted); }
.icu-chip { display: inline-block; font-size: 11.5px; padding: 1px 7px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); margin: 1px 3px 1px 0; }
.icu-chip.warn { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
:root[data-theme="dark"] .icu-chip.warn { background: #451a03; color: #fde68a; border-color: #92400e; }
.icu-allergy { color: #b91c1c; font-weight: 700; font-size: 12.5px; }
:root[data-theme="dark"] .icu-allergy { color: #fca5a5; }
.icu-bal { font-variant-numeric: tabular-nums; }
.icu-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
.icu-day { display: inline-flex; align-items: center; gap: 4px; }
.icu-day b { min-width: 170px; text-align: center; }
.icu-sum { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 10px; }
.icu-sum div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.icu-sum b { font-size: 17px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.icu-grid-wrap { overflow: auto; border: 1px solid var(--border-color); border-radius: 10px; max-height: calc(100vh - 230px); background: var(--bg-surface); }
.icu-grid { border-collapse: separate; border-spacing: 0; font-size: 12.5px; font-variant-numeric: tabular-nums; min-width: 100%; }
.icu-grid th, .icu-grid td { border-bottom: 1px solid var(--border-color); border-right: 1px solid var(--border-color); padding: 4px 6px; text-align: center; white-space: nowrap; min-width: 46px; background: var(--bg-surface); }
.icu-grid thead th { position: sticky; top: 0; z-index: 2; background: var(--bg-surface-alt); font-size: 12px; }
.icu-grid thead th button { font: inherit; font-weight: 700; border: 0; background: none; color: inherit; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
.icu-grid thead th button:hover { background: #dbeafe; color: #1e3a8a; }
.icu-grid .lbl { position: sticky; left: 0; z-index: 1; text-align: left; min-width: 180px; max-width: 230px; white-space: normal; font-weight: 600; background: var(--bg-surface-alt); }
.icu-grid thead .lbl { z-index: 3; }
.icu-grid tr.grp td { background: var(--bg-surface-alt); text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); position: sticky; left: 0; }
.icu-grid .cur { background: #eff6ff; }
.icu-grid thead th.cur { background: #bfdbfe; color: #1e3a8a; }
:root[data-theme="dark"] .icu-grid .cur { background: #172554; }
:root[data-theme="dark"] .icu-grid thead th.cur { background: #1e3a8a; color: #dbeafe; }
.icu-grid .fut { color: var(--text-muted); background: repeating-linear-gradient(135deg, transparent 0 6px, rgba(148,163,184,.08) 6px 12px); }
.icu-grid .bad { color: #b91c1c; font-weight: 800; }
:root[data-theme="dark"] .icu-grid .bad { color: #fca5a5; }
.icu-grid .tot td { font-weight: 800; }
.icu-grid .net-pos { color: #1d4ed8; } .icu-grid .net-neg { color: #b45309; }
:root[data-theme="dark"] .icu-grid .net-pos { color: #93c5fd; } :root[data-theme="dark"] .icu-grid .net-neg { color: #fcd34d; }
.icu-grid .lbl button { font: inherit; font-weight: 700; border: 0; background: none; color: #1d4ed8; cursor: pointer; padding: 0; text-align: left; }
:root[data-theme="dark"] .icu-grid .lbl button { color: #93c5fd; }
.icu-grid .lbl small { display: block; font-weight: 400; color: var(--text-muted); }
.icu-grid .drip small { display: block; color: var(--text-muted); font-size: 11px; }
.icu-grid .corr { font-size: 10px; color: #b45309; }
.icu h2 { font-size: 15px; margin: 18px 0 6px; }
.icu-list { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.icu-list table { width: 100%; border-collapse: collapse; font-size: 12.5px; background: var(--bg-surface); }
.icu-list th { text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-muted); padding: 6px 8px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
.icu-list td { padding: 6px 8px; border-bottom: 1px solid var(--border-color); }
.icu-list tr.void td { color: var(--text-muted); text-decoration: line-through; }
.icu-list .acts { text-align: right; white-space: nowrap; }

.icx-ov { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 5100; display: flex; align-items: center; justify-content: center; padding: 16px; }
.icx { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 820px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
.icx-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 14px 18px 8px; border-bottom: 1px solid var(--border-color); }
.icx-head h2 { margin: 0; font-size: 18px; }
.icx-x { border: 0; background: none; font-size: 22px; cursor: pointer; color: var(--text-muted); padding: 2px 8px; border-radius: 6px; }
.icx-body { padding: 12px 18px; overflow: auto; display: grid; gap: 12px; font-size: 13.5px; }
.icx-foot { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 18px 14px; border-top: 1px solid var(--border-color); flex-wrap: wrap; }
.icx fieldset { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 12px 12px; margin: 0; min-width: 0; }
.icx legend { font-weight: 800; font-size: 13px; padding: 0 4px; }
.icx label, .icx .lbl { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.icx input[type=text], .icx input[type=number], .icx input[type=time], .icx select, .icx textarea {
    width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 8px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.icx textarea { min-height: 50px; resize: vertical; }
.icx [aria-invalid="true"] { border-color: #dc2626 !important; }
.icx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr)); gap: 8px; }
.icx-grid.wide { grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); }
.icx-chk { display: inline-flex !important; gap: 6px; align-items: center; color: var(--text-primary) !important; margin-top: 6px; }
.icx-note { border-radius: 10px; padding: 8px 10px; font-size: 13px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.icx-note.warn { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
:root[data-theme="dark"] .icx-note.warn { background: #451a03; color: #fde68a; border-color: #92400e; }
.icx-err { color: #dc2626; font-size: 12.5px; min-height: 1em; margin-right: auto; }
.icx-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.icx-seg label { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 999px; margin: 0; font-size: 13px; color: var(--text-primary); cursor: pointer; font-weight: 600; }
.icx-seg label:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
:root[data-theme="dark"] .icx-seg label:has(input:checked) { background: #172554; color: #bfdbfe; }
.icx-calc { font-size: 13px; font-weight: 700; }
`;

let board = null;
let sheet = null;
let current = null; // { admission_id, day }
let timer = null;

function ensureCss() {
    if (!document.getElementById("icu-style")) {
        const st = document.createElement("style");
        st.id = "icu-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}

export function IcuView() {
    ensureCss();
    return `<div class="icu" id="icuRoot"><div class="icu-empty">Loading…</div></div>`;
}

export function initIcu() {
    clearInterval(timer);
    current = null;
    loadBoard();
    timer = setInterval(() => {
        if (!document.getElementById("icuRoot")) return clearInterval(timer);
        if (document.hidden || document.querySelector(".icx-ov")) return;
        current ? loadSheet(true) : loadBoard();
    }, 60000);
}

/** Open a patient's flowsheet directly (e.g. from another screen). */
export function openIcuFlowsheet(admissionId) {
    current = { admission_id: admissionId, day: null };
    loadSheet();
}

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

/* ---------------- board ---------------- */

async function loadBoard() {
    const root = document.getElementById("icuRoot");
    if (!root) return;
    const r = await api(`/icu${board?.ward_id ? `?ward_id=${board.ward_id}` : ""}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="icu-empty">${esc(r?.message || "Could not load the ICU.")}</div>`;
        return;
    }
    board = r.data;
    renderBoard(root);
}

function renderBoard(root) {
    const b = board;
    const minute = Number(String(b.now).slice(14, 16));
    root.innerHTML = `
        <div class="icu-head"><div><h1>ICU</h1><div class="icu-sub">Patients in ICU wards. The ICU day runs ${String(b.day_start).padStart(2, "0")}:00 to ${String(b.day_start).padStart(2, "0")}:00. Refreshes every minute.</div></div>
            ${b.wards.length > 1 ? `<div><label class="muted" for="icuWard" style="font-size:12px;display:block">Ward</label><select id="icuWard" class="icu-b"><option value="">All ICU wards</option>
                ${b.wards.map((w) => `<option value="${w.id}" ${Number(b.ward_id) === Number(w.id) ? "selected" : ""}>${esc(w.ward_name)}</option>`).join("")}</select></div>` : ""}</div>
        ${!b.wards.length ? `<div class="icu-empty">No ward is set up as an ICU (ward type ICU in Inpatient Bed Management).</div>`
            : !b.patients.length ? `<div class="icu-empty">No patients in the ICU.</div>`
            : `<div class="icu-cards">${b.patients.map((p) => {
                const due = !p.this_hour_done && minute >= 15;
                const l = p.last;
                const vent = l && l.o2_device ? `${esc(b.options.devices[l.o2_device] || l.o2_device)}${l.vent_mode ? ` · ${esc(l.vent_mode)}` : ""}${l.fio2 ? ` · FiO₂ ${l.fio2}%` : ""}${l.peep !== null ? ` · PEEP ${num(l.peep)}` : ""}` : "";
                const bal = p.balance_today;
                return `<div class="icu-card ${due ? "due" : ""}">
                    <div class="row"><h3>${esc(p.bed)} · ${esc(p.name)}</h3><span class="muted">${esc(p.age ?? "?")} y · ${esc(String(p.sex || "").charAt(0).toUpperCase())} · ICU day ${p.icu_day}</span></div>
                    <div class="muted">${esc(p.diagnosis || "")}${p.attending ? ` · ${esc(p.attending)}` : ""}</div>
                    <div>${l ? `Last charted <b>${esc(hm(l.hour_at))}</b> <span class="muted">(${ago(p.minutes_since_last)})</span>` : `<span class="muted">Nothing charted yet</span>`}
                        ${due ? `<span class="icu-chip warn">This hour not charted</span>` : ""}</div>
                    ${l ? `<div>${[l.heart_rate ? `HR ${l.heart_rate}` : "", l.bp_systolic ? `BP ${l.bp_systolic}/${l.bp_diastolic} (${l.map})` : "", l.spo2 ? `SpO₂ ${l.spo2}%` : "",
                        l.gcs_total !== null ? `GCS ${l.gcs_total}${l.gcs_intubated ? "T" : ""}` : "", l.rass !== null ? `RASS ${l.rass > 0 ? "+" : ""}${l.rass}` : ""].filter(Boolean).join(" · ")}</div>` : ""}
                    ${vent ? `<div class="muted">${vent}</div>` : ""}
                    ${p.drips.length ? `<div>${p.drips.map((d) => `<span class="icu-chip">${esc(d.drug)} ${d.dose !== null ? `${num(d.dose, 3)} ${esc(d.dose_unit)}` : ""} (${num(d.rate)} mL/h)</span>`).join("")}</div>` : ""}
                    <div class="icu-bal">Today: in ${ml(bal.in)} · out ${ml(bal.out)} · <b>balance ${signed(bal.net)} mL</b></div>
                    <div><button type="button" class="icu-b blue sm" data-open="${p.admission_id}">Open flowsheet</button></div></div>`;
            }).join("")}</div>`}`;
    root.onclick = (e) => {
        const o = e.target.closest("[data-open]");
        if (o) openIcuFlowsheet(Number(o.dataset.open));
    };
    root.querySelector("#icuWard")?.addEventListener("change", (e) => {
        board.ward_id = e.target.value || null;
        loadBoard();
    });
}

/* ---------------- flowsheet ---------------- */

async function loadSheet(quiet = false) {
    const root = document.getElementById("icuRoot");
    if (!root || !current) return;
    const keep = root.querySelector(".icu-grid-wrap");
    const scroll = keep ? [keep.scrollLeft, keep.scrollTop] : null;
    if (!quiet) root.innerHTML = `<div class="icu-empty">Loading…</div>`;
    const r = await api(`/icu/flowsheet?admission_id=${current.admission_id}${current.day ? `&day=${current.day}` : ""}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="icu-empty">${esc(r?.message || "Could not load the flowsheet.")}</div>`;
        return;
    }
    sheet = r.data;
    current.day = sheet.is_today ? null : sheet.day;
    renderSheet(root);
    const wrap = root.querySelector(".icu-grid-wrap");
    if (wrap && scroll) [wrap.scrollLeft, wrap.scrollTop] = scroll;
    else if (wrap) wrap.querySelector("th.cur")?.scrollIntoView({ block: "nearest", inline: "center" });
}

/** Outside these, a value is shown in red. [low below, high above] */
const ABN = { heart_rate: [50, 120], bp_systolic: [90, 180], map: [65, null], resp_rate: [8, 25], temperature_c: [36, 38.3], spo2: [92, null], blood_sugar_mgdl: [70, 180], etco2: [30, 50] };
const cell = (k, v, txt) => {
    if (v === null || v === undefined || v === "") return "";
    const [lo, hi] = ABN[k] || [];
    const bad = (lo !== undefined && lo !== null && v < lo) || (hi !== undefined && hi !== null && v > hi);
    return bad ? `<span class="bad">${txt ?? esc(v)}</span>` : txt ?? esc(v);
};

function renderSheet(root) {
    const s = sheet;
    const a = s.admission;
    const o = s.options;
    const H = s.hours;
    const canChart = s.can_record && a.active;
    const cls = (h) => (h.current ? "cur" : h.future ? "fut" : "");
    const row = (label, fn, extra = "") => `<tr${extra}><td class="lbl">${label}</td>${H.map((h) => `<td class="${cls(h)}">${h.future ? "" : fn(h)}</td>`).join("")}</tr>`;
    const er = (fn) => (h) => (h.entry ? fn(h.entry) : "");
    const grp = (t) => `<tr class="grp"><td colspan="${H.length + 1}">${t}</td></tr>`;
    const used = (k, kind) => H.some((h) => h[kind][k]);
    const react = (r) => (r ? { brisk: "B", sluggish: "S", fixed: "F" }[r] : "");
    const pupil = (sz, r) => (sz === null ? "" : `${num(sz)}${react(r)}`);
    const anyVent = H.some((h) => h.entry && ["ventilator", "niv"].includes(h.entry.o2_device));

    const vitals = [
        row("Heart rate /min", er((e) => cell("heart_rate", e.heart_rate))),
        row("Blood pressure", er((e) => (e.bp_systolic ? cell("bp_systolic", e.bp_systolic, `${e.bp_systolic}/${e.bp_diastolic}`) : ""))),
        row("MAP", er((e) => cell("map", e.map))),
        row("Breathing rate /min", er((e) => cell("resp_rate", e.resp_rate))),
        row("Temperature °C", er((e) => cell("temperature_c", e.temperature_c, num(e.temperature_c)))),
        row("SpO₂ %", er((e) => cell("spo2", e.spo2))),
        row("CVP mmHg", er((e) => esc(e.cvp ?? ""))),
        row("EtCO₂ mmHg", er((e) => cell("etco2", e.etco2))),
        row("Pain 0–10", er((e) => esc(e.pain_score ?? ""))),
        row("Glucose mg/dL", er((e) => cell("blood_sugar_mgdl", e.blood_sugar_mgdl))),
        row("NEWS2", er((e) => (e.news2_score !== null ? (e.news2_score >= 5 ? `<span class="bad">${e.news2_score}</span>` : esc(e.news2_score)) : ""))),
    ];
    const neuro = [
        row("GCS E / V / M", er((e) => (e.gcs_e !== null ? `${e.gcs_e}/${e.gcs_intubated ? "T" : e.gcs_v}/${e.gcs_m}` : ""))),
        row("GCS total", er((e) => (e.gcs_total !== null ? (e.gcs_total <= 8 ? `<span class="bad">${e.gcs_total}${e.gcs_intubated ? "T" : ""}</span>` : `${e.gcs_total}${e.gcs_intubated ? "T" : ""}`) : ""))),
        row("RASS (sedation)", er((e) => (e.rass !== null ? `<span title="${esc(o.rass[e.rass] || "")}">${e.rass > 0 ? "+" : ""}${e.rass}</span>` : ""))),
        row("Pupils L / R (mm)", er((e) => (e.pupil_l !== null || e.pupil_r !== null ? `${pupil(e.pupil_l, e.pupil_l_react)} / ${pupil(e.pupil_r, e.pupil_r_react)}` : ""))),
        row("CAM-ICU", er((e) => (e.cam_icu ? (e.cam_icu === "positive" ? `<span class="bad">+</span>` : e.cam_icu === "negative" ? "−" : "UTA") : ""))),
    ];
    const resp = [
        row("Oxygen device", er((e) => (e.o2_device ? `<span title="${esc(o.devices[e.o2_device])}">${esc({ room_air: "RA", nasal: "NC", mask: "Mask", nrb: "NRB", hfnc: "HFNC", niv: "NIV", ventilator: "Vent" }[e.o2_device])}</span>` : ""))),
        row("FiO₂ % / flow L/min", er((e) => [e.fio2 ? `${e.fio2}%` : "", e.o2_flow ? `${num(e.o2_flow)} L` : ""].filter(Boolean).join(" · "))),
        ...(anyVent ? [
            row("Mode", er((e) => esc(e.vent_mode || ""))),
            row("PEEP cmH₂O", er((e) => num(e.peep))),
            row("Vt set / exhaled mL", er((e) => (e.vt_set || e.vt_exp ? `${e.vt_set ?? "–"} / ${e.vt_exp ?? "–"}` : ""))),
            row("Rate set / total", er((e) => (e.rr_set !== null || e.rr_total !== null ? `${e.rr_set ?? "–"} / ${e.rr_total ?? "–"}` : ""))),
            row("PS / Pinsp cmH₂O", er((e) => (e.pressure_support !== null || e.pinsp !== null ? `${num(e.pressure_support) || "–"} / ${num(e.pinsp) || "–"}` : ""))),
            row("Peak / plateau cmH₂O", er((e) => (e.ppeak !== null || e.pplat !== null ? `${num(e.ppeak) || "–"} / ${num(e.pplat) || "–"}` : ""))),
        ] : []),
    ];
    const drips = s.drips.map((d) => `<tr><td class="lbl"><button type="button" data-drip="${d.id}">${esc(d.drug_name)}</button>
            <small>${d.concentration ? esc(d.concentration) : "mL/h"}${d.dose_unit !== "mL/h" ? ` · ${esc(d.dose_unit)}` : ""}${d.running ? "" : ` · stopped ${esc(hm(d.stopped_at))}`}</small></td>
        ${H.map((h, i) => {
            const x = d.hours[i];
            return `<td class="drip ${cls(h)}">${x.rate !== null ? `${num(x.rate)}${x.dose !== null ? `<small>${num(x.dose, 3)}</small>` : ""}${x.changes > 1 ? `<small title="Rate changed ${x.changes} times this hour">Δ${x.changes}</small>` : ""}` : x.stopped ? `<small>stop</small>` : ""}</td>`;
        }).join("")}</tr>`);
    const ioRows = (kind) => Object.entries(o.io_categories[kind]).filter(([k]) => used(k, kind)).map(([k, l]) => row(esc(l), (h) => mlc(h[kind][k])));
    const intake = [...(H.some((h) => h.in.drips) ? [row("Drips (infused)", (h) => mlc(h.in.drips))] : []), ...ioRows("in"),
        row("<b>Total in</b>", (h) => `<b>${mlc(h.total_in)}</b>`, ' class="tot"')];
    const output = [...ioRows("out"), row("<b>Total out</b>", (h) => `<b>${mlc(h.total_out)}</b>`, ' class="tot"')];
    const balance = [
        row("Hour balance mL", (h) => (h.total_in || h.total_out ? `<span class="${h.net > 0 ? "net-pos" : h.net < 0 ? "net-neg" : ""}">${signed(h.net)}</span>` : "")),
        row("<b>Running balance mL</b>", (h) => `<b class="${h.cumulative > 0 ? "net-pos" : h.cumulative < 0 ? "net-neg" : ""}">${signed(h.cumulative)}</b>`, ' class="tot"'),
    ];
    const notesRow = row("Notes / charted by", er((e) => `<span title="${esc(`${e.notes ? `${e.notes} — ` : ""}${e.recorded_by_name || ""} ${hm(e.recorded_at)}`)}">${e.notes ? "📝" : "✓"}</span>`));
    const t = s.totals;
    const si = s.since_admission;
    const dayLabel = `${s.day} 07:00 → ${String(s.to).slice(0, 10)} 07:00`;
    root.innerHTML = `
        <div class="icu-head"><div><h1>${esc(a.bed)} · ${esc(a.name)}</h1>
            <div class="icu-sub">${esc(a.mrn || "")} · ${esc(a.age ?? "?")} y · ${esc(a.sex || "")}${a.weight_kg ? ` · ${num(a.weight_kg)} kg` : ""} · ${esc(a.ward_name)} · admitted ${esc(String(a.admitted_at).slice(0, 16))}
                ${a.diagnosis ? ` · ${esc(a.diagnosis)}` : ""}${a.attending ? ` · ${esc(a.attending)}` : ""}</div>
            ${a.allergies.length ? `<div class="icu-allergy">Allergies: ${esc(a.allergies.join(", "))}</div>` : ""}
            ${!a.active ? `<div class="icx-note warn" style="margin-top:6px">This admission is closed (${esc(a.status)}): read only.</div>` : ""}</div>
            <button type="button" class="icu-b" data-back>← ICU board</button></div>
        <div class="icu-tools">
            <span class="icu-day"><button type="button" class="icu-b sm" data-day="${s.prev_day || ""}" ${s.prev_day ? "" : "disabled"} aria-label="Previous ICU day">‹</button>
                <b>${esc(dayLabel)}</b><button type="button" class="icu-b sm" data-day="${s.next_day || ""}" ${s.next_day ? "" : "disabled"} aria-label="Next ICU day">›</button>
                ${s.is_today ? "" : `<button type="button" class="icu-b sm" data-today>Today</button>`}</span>
            ${canChart && s.is_today ? `<button type="button" class="icu-b blue" data-hour="${esc((H.find((h) => h.current) || {}).at || "")}">Chart this hour</button>` : ""}
            ${s.can_io && a.active ? `<button type="button" class="icu-b" data-io>+ Intake / output</button>` : ""}
            ${canChart ? `<button type="button" class="icu-b" data-dripnew>+ Start drip</button>` : ""}
        </div>
        <div class="icu-sum" role="list">
            <div role="listitem"><b>${ml(t.in)}</b>mL in</div><div role="listitem"><b>${ml(t.out)}</b>mL out</div>
            <div role="listitem"><b>${signed(t.net)}</b>mL balance this ICU day${s.is_today ? " so far" : ""}</div>
            <div role="listitem"><b>${signed(si.net)}</b>mL since admission <span class="muted">(in ${ml(si.in)} · out ${ml(si.out)})</span></div>
            ${s.drips.filter((d) => d.running).length ? `<div role="listitem"><b>${s.drips.filter((d) => d.running).length}</b>drip${s.drips.filter((d) => d.running).length === 1 ? "" : "s"} running</div>` : ""}
        </div>
        <div class="icu-grid-wrap"><table class="icu-grid" aria-label="ICU flowsheet ${esc(dayLabel)}">
            <thead><tr><th class="lbl" scope="col">${canChart ? "Click an hour to chart it" : "Hour"}</th>${H.map((h) => `<th scope="col" class="${cls(h)}">${canChart && !h.future && withinDay(h) ? `<button type="button" data-hour="${esc(h.at)}" aria-label="Chart ${esc(hm(h.at))}${h.entry ? " (charted: correct)" : ""}">${esc(h.label)}</button>` : esc(h.label)}${h.corrections ? `<div class="corr" title="Corrected ${h.corrections}×">✎${h.corrections}</div>` : ""}</th>`).join("")}</tr></thead>
            <tbody>
                ${grp("Vital signs")}${vitals.join("")}
                ${grp("Level of consciousness")}${neuro.join("")}
                ${grp("Breathing")}${resp.join("")}
                ${grp("Drips — mL/h, dose below")}${drips.join("") || `<tr><td class="lbl muted">No drips</td>${H.map((h) => `<td class="${cls(h)}"></td>`).join("")}</tr>`}
                ${grp("Intake mL")}${intake.join("")}
                ${grp("Output mL")}${output.join("")}
                ${grp("Balance")}${balance.join("")}
                ${notesRow}
            </tbody></table></div>
        <div class="muted" style="font-size:12px;margin-top:6px">Pupils: B brisk, S sluggish, F fixed. CAM-ICU: − negative, + delirium, UTA unable to assess. Red: outside the usual range. Drip volumes are worked out from the rates.</div>
        <h2>Intake and output entries</h2>
        ${s.io.length ? `<div class="icu-list"><table><thead><tr><th>Time</th><th>In / out</th><th>Type</th><th>mL</th><th>By</th><th></th></tr></thead><tbody>
            ${s.io.map((x) => `<tr class="${x.voided_at ? "void" : ""}"><td>${esc(hm(x.at))}</td><td>${x.kind === "in" ? "Intake" : "Output"}</td><td>${esc(x.category_label)}${x.label ? ` — ${esc(x.label)}` : ""}</td>
                <td>${ml(x.volume_ml)}</td><td>${esc(x.recorded_by_name || "")}${x.voided_at ? ` · voided: ${esc(x.void_reason || "")}` : ""}</td>
                <td class="acts">${!x.voided_at && s.can_io && a.active ? `<button type="button" class="icu-b sm" data-iovoid="${x.id}">Void…</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`
            : `<div class="icu-empty">No intake or output charted this ICU day.</div>`}`;
    root.onclick = onSheetClick;
}

/** Hours within the last 24 h can be charted. */
function withinDay(h) {
    const now = Date.parse(String(sheet.now).replace(" ", "T") + "Z");
    const at = Date.parse(String(h.at).replace(" ", "T") + "Z");
    return now - at < 24 * 3600 * 1000;
}

async function onSheetClick(e) {
    const t = e.target;
    if (t.closest("[data-back]")) {
        current = null;
        return loadBoard();
    }
    const d = t.closest("[data-day]");
    if (d && d.dataset.day) {
        current.day = d.dataset.day;
        return loadSheet();
    }
    if (t.closest("[data-today]")) {
        current.day = null;
        return loadSheet();
    }
    const h = t.closest("[data-hour]");
    if (h && h.dataset.hour) return openHour(h.dataset.hour);
    if (t.closest("[data-io]")) return openIo();
    if (t.closest("[data-dripnew]")) return openDripStart();
    const dr = t.closest("[data-drip]");
    if (dr) return openDrip(Number(dr.dataset.drip));
    const v = t.closest("[data-iovoid]");
    if (v) {
        const tr = v.closest("tr");
        tr.querySelector(".acts").innerHTML = `<input type="text" maxlength="255" data-why placeholder="Why void?" aria-label="Why void this entry" style="border:1px solid var(--border-color);border-radius:6px;padding:4px 6px;background:var(--bg-surface);color:var(--text-primary)">
            <button type="button" class="icu-b sm" data-iovoidgo="${v.dataset.iovoid}">Void</button>`;
        tr.querySelector("[data-why]").focus();
        return;
    }
    const vg = t.closest("[data-iovoidgo]");
    if (vg) {
        const why = vg.closest("td").querySelector("[data-why]");
        if (!why.value.trim()) return why.focus();
        const r = await post("/icu/io/void", { id: Number(vg.dataset.iovoidgo), reason: why.value.trim() });
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        if (r?.success) loadSheet(true);
    }
}

/* ---------------- modal helper ---------------- */

function modal(title, sub, bodyHtml, footHtml) {
    ensureCss();
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "icx-ov";
    ov.innerHTML = `<div class="icx" role="dialog" aria-modal="true" aria-labelledby="icxTitle">
        <div class="icx-head"><div><h2 id="icxTitle">${title}</h2>${sub ? `<div class="icu-sub">${sub}</div>` : ""}</div><button type="button" class="icx-x" data-x aria-label="Close">×</button></div>
        <div class="icx-body">${bodyHtml}</div>
        <div class="icx-foot"><span class="icx-err" role="alert"></span>${footHtml}</div></div>`;
    document.body.appendChild(ov);
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
    const $ = (sel) => ov.querySelector(sel);
    const err = (msg, errors) => {
        $(".icx-err").textContent = msg || "";
        ov.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
        let first = null;
        Object.keys(errors || {}).forEach((k) => {
            const f = ov.querySelector(`[name="${k}"]`);
            if (f) {
                f.setAttribute("aria-invalid", "true");
                first ??= f;
            }
        });
        first?.focus();
    };
    const val = (n) => {
        const f = ov.querySelector(`[name="${n}"]`);
        if (!f) return "";
        if (f.type === "checkbox") return f.checked ? 1 : 0;
        return f.value.trim();
    };
    return { ov, $, close, err, val };
}

/* ---------------- the hour ---------------- */

function openHour(hourAt) {
    const s = sheet;
    const o = s.options;
    const h = s.hours.find((x) => x.at === hourAt);
    const e = h?.entry;
    // Breathing settings and the GCS carry over from the last charted hour (check them).
    const prev = [...s.hours].reverse().find((x) => x.at < hourAt && x.entry)?.entry;
    const src = e || {};
    const carry = e ? null : prev;
    const v = (k) => (src[k] ?? (carry && ["o2_device", "o2_flow", "fio2", "vent_mode", "peep", "vt_set", "rr_set", "pressure_support", "pinsp"].includes(k) ? carry[k] : null) ?? "");
    const n = (name, label, attrs = "", wrap = "") => `<div ${wrap}><label for="ich_${name}">${label}</label><input type="number" id="ich_${name}" name="${name}" value="${esc(v(name))}" ${attrs} inputmode="decimal"></div>`;
    const sel = (name, label, opts, cur) => `<div><label for="ich_${name}">${label}</label><select id="ich_${name}" name="${name}"><option value="">—</option>${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(cur ?? "") === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const m = modal(`${e ? "Correct" : "Chart"} ${esc(hm(hourAt))} — ${esc(s.admission.name)}`, `${esc(s.admission.bed)} · hour ${esc(hourAt.slice(0, 16))}${carry ? ` · breathing settings copied from ${esc(hm(carry.hour_at))} — check them` : ""}`, `
        ${e ? `<div class="icx-note warn">Charted by ${esc(e.recorded_by_name || "")} at ${esc(hm(e.recorded_at))}. Saving replaces it (the old entry is kept as corrected).
            <div style="margin-top:6px"><label for="ich_reason">Why are you correcting it?</label><input type="text" id="ich_reason" name="correct_reason" maxlength="240" autocomplete="off"></div></div>` : ""}
        <fieldset><legend>Vital signs</legend><div class="icx-grid">
            ${n("heart_rate", "Heart rate", 'min="20" max="300"')}${n("bp_systolic", "BP systolic", 'min="40" max="300"')}${n("bp_diastolic", "BP diastolic", 'min="20" max="200"')}
            ${n("resp_rate", "Breathing /min", 'min="4" max="80"')}${n("temperature_c", "Temp °C", 'min="30" max="45" step="0.1"')}${n("spo2", "SpO₂ %", 'min="50" max="100"')}
            ${n("cvp", "CVP mmHg", 'min="-5" max="40"')}${n("etco2", "EtCO₂ mmHg", 'min="0" max="150"')}${n("pain_score", "Pain 0–10", 'min="0" max="10"')}${n("blood_sugar_mgdl", "Glucose mg/dL", 'min="10" max="1000"')}
        </div><div class="muted" style="font-size:12px;margin-top:4px" data-map></div></fieldset>
        <fieldset><legend>Level of consciousness</legend><div class="icx-grid">
            ${sel("gcs_e", "GCS eyes (E)", range(1, 4).map((x) => [x, x]), src.gcs_e)}
            ${sel("gcs_v", "GCS verbal (V)", range(1, 5).map((x) => [x, x]), src.gcs_v)}
            ${sel("gcs_m", "GCS motor (M)", range(1, 6).map((x) => [x, x]), src.gcs_m)}
            ${sel("rass", "RASS", Object.keys(o.rass).map(Number).sort((a, b) => b - a).map((k) => [k, `${k > 0 ? "+" : ""}${k} ${o.rass[k]}`]), src.rass)}
            ${n("pupil_l", "Pupil L mm", 'min="1" max="9" step="0.5"')}${sel("pupil_l_react", "L reacts", o.reactions.map((r) => [r, r]), src.pupil_l_react)}
            ${n("pupil_r", "Pupil R mm", 'min="1" max="9" step="0.5"')}${sel("pupil_r_react", "R reacts", o.reactions.map((r) => [r, r]), src.pupil_r_react)}
            ${sel("cam_icu", "CAM-ICU (delirium)", Object.entries(o.cam), src.cam_icu)}
        </div><label class="icx-chk"><input type="checkbox" name="gcs_intubated" ${src.gcs_intubated ? "checked" : ""}> Intubated — verbal can't be tested (T)</label>
            <div class="muted" style="font-size:12px;margin-top:4px" data-gcs></div></fieldset>
        <fieldset><legend>Breathing</legend><div class="icx-grid">
            ${sel("o2_device", "Oxygen device", Object.entries(o.devices), v("o2_device"))}
            ${n("o2_flow", "Flow L/min", 'min="0.5" max="80" step="0.5"', "data-flow")}
            ${n("fio2", "FiO₂ %", 'min="21" max="100"')}
        </div>
        <div class="icx-grid" data-vent style="margin-top:8px">
            ${sel("vent_mode", "Mode", o.vent_modes.map((x) => [x, x]), v("vent_mode"))}
            ${n("peep", "PEEP cmH₂O", 'min="0" max="30" step="0.5"')}${n("vt_set", "Vt set mL", 'min="50" max="1500"')}${n("rr_set", "Rate set", 'min="0" max="60"')}
            ${n("pressure_support", "PS cmH₂O", 'min="0" max="40" step="0.5"')}${n("pinsp", "Pinsp cmH₂O", 'min="0" max="60" step="0.5"')}
            ${n("vt_exp", "Vt exhaled mL", 'min="0" max="2000"')}${n("rr_total", "Total rate", 'min="0" max="80"')}
            ${n("ppeak", "Peak cmH₂O", 'min="0" max="80" step="0.5"')}${n("pplat", "Plateau cmH₂O", 'min="0" max="60" step="0.5"')}
        </div></fieldset>
        <div><label for="ich_notes">Notes <span style="font-weight:400">(optional)</span></label><textarea id="ich_notes" name="notes" maxlength="500">${esc(src.notes || "")}</textarea></div>`,
        `<button type="button" class="icu-b" data-x>Cancel</button><button type="button" class="icu-b blue" data-save>${e ? "Save correction" : "Save"}</button>`);
    const sync = () => {
        const dev = m.val("o2_device");
        m.$("[data-vent]").hidden = !["ventilator", "niv"].includes(dev);
        m.$("[data-flow]").hidden = ["ventilator", "niv", "room_air"].includes(dev);
        m.$("#ich_fio2").closest("div").hidden = dev === "room_air";
        const intub = m.val("gcs_intubated");
        m.$("#ich_gcs_v").disabled = !!intub;
        const [ge, gv, gm] = ["gcs_e", "gcs_v", "gcs_m"].map((k) => Number(m.val(k)) || 0);
        m.$("[data-gcs]").textContent = ge && gm && (gv || intub) ? `GCS ${ge + (intub ? 0 : gv) + gm}${intub ? "T" : ""}` : "";
        const sys = Number(m.val("bp_systolic"));
        const dia = Number(m.val("bp_diastolic"));
        m.$("[data-map]").textContent = sys && dia ? `MAP ${Math.round((sys + 2 * dia) / 3)}` : "";
    };
    m.ov.addEventListener("input", sync);
    m.ov.addEventListener("change", sync);
    sync();
    (m.$("#ich_reason") || m.$("#ich_heart_rate")).focus();
    m.$("[data-save]").onclick = async (ev) => {
        const body = { admission_id: s.admission.id, hour_at: hourAt };
        m.ov.querySelectorAll("[name]").forEach((f) => (body[f.name] = m.val(f.name)));
        if (body.gcs_intubated) body.gcs_v = "";
        if (!["ventilator", "niv"].includes(body.o2_device)) ["vent_mode", "peep", "vt_set", "rr_set", "pressure_support", "pinsp", "vt_exp", "rr_total", "ppeak", "pplat"].forEach((k) => (body[k] = ""));
        ev.target.disabled = true;
        const r = await post("/icu/hour", body);
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors);
        m.close();
        showToast(r.message, "success");
        loadSheet(true);
    };
}

/* ---------------- intake / output ---------------- */

function openIo() {
    const o = sheet.options;
    const m = modal(`Intake / output — ${esc(sheet.admission.name)}`, esc(sheet.admission.bed), `
        <div class="icx-seg" role="radiogroup" aria-label="Intake or output"><label><input type="radio" name="kind" value="out" checked> Output</label><label><input type="radio" name="kind" value="in"> Intake</label></div>
        <div class="icx-grid wide">
            <div><label for="icio_c">Type</label><select id="icio_c" name="category"></select></div>
            <div><label for="icio_v">Volume mL</label><input type="number" id="icio_v" name="volume_ml" min="1" max="10000" inputmode="decimal"></div>
            <div><label for="icio_t">Time <span style="font-weight:400">(blank = now)</span></label><input type="time" id="icio_t" name="at"></div>
            <div><label for="icio_l">Details <span style="font-weight:400">(optional)</span></label><input type="text" id="icio_l" name="label" maxlength="80" placeholder="e.g. D5LR, chest drain L" autocomplete="off"></div>
        </div>
        <div class="muted" style="font-size:12px">Drips are counted by themselves from their rates — don't enter them here.</div>`,
        `<button type="button" class="icu-b" data-x>Close</button><button type="button" class="icu-b" data-save="more">Save and add another</button><button type="button" class="icu-b blue" data-save="close">Save</button>`);
    const kind = () => m.ov.querySelector('input[name="kind"]:checked').value;
    const fill = () => (m.$("#icio_c").innerHTML = Object.entries(o.io_categories[kind()]).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join(""));
    m.ov.querySelectorAll('input[name="kind"]').forEach((x) => x.addEventListener("change", fill));
    fill();
    m.$("#icio_v").focus();
    let saved = 0;
    m.ov.querySelectorAll("[data-save]").forEach((btn) => (btn.onclick = async () => {
        btn.disabled = true;
        const r = await post("/icu/io", { admission_id: sheet.admission.id, kind: kind(), category: m.val("category"), volume_ml: m.val("volume_ml"), at: m.val("at"), label: m.val("label") });
        btn.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors);
        saved++;
        showToast(r.message, "success");
        if (btn.dataset.save === "close") {
            m.close();
            return loadSheet(true);
        }
        m.err("");
        m.$("#icio_v").value = "";
        m.$("#icio_l").value = "";
        m.$("#icio_v").focus();
    }));
    m.ov.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", () => saved && loadSheet(true)));
}

/* ---------------- drips ---------------- */

/** Common mixes (check against the bag / syringe). */
const PRESETS = [
    ["Norepinephrine", 4, "mg", 250, "mcg/kg/min"], ["Epinephrine", 4, "mg", 250, "mcg/kg/min"], ["Dopamine", 400, "mg", 250, "mcg/kg/min"],
    ["Dobutamine", 250, "mg", 250, "mcg/kg/min"], ["Vasopressin", 20, "units", 100, "units/min"], ["Midazolam", 50, "mg", 50, "mg/h"],
    ["Fentanyl", 1000, "mcg", 100, "mcg/h"], ["Propofol", 1000, "mg", 100, "mcg/kg/min"], ["Insulin (regular)", 100, "units", 100, "units/h"],
    ["Heparin", 25000, "units", 250, "units/h"], ["Nicardipine", 25, "mg", 250, "mg/h"], ["Amiodarone", 900, "mg", 500, "mg/min"],
];

/** Same maths as the server: rate (mL/h) x concentration, per kg and per minute as the unit says. */
function doseOf(rate, d) {
    if (d.dose_unit === "mL/h") return null;
    const parts = d.dose_unit.split("/");
    const mass = { g: 1e6, mg: 1e3, mcg: 1 };
    const f = mass[d.amount_unit] && mass[parts[0]] ? mass[d.amount_unit] / mass[parts[0]] : d.amount_unit === parts[0] ? 1 : null;
    if (!f || !d.volume_ml || !d.amount) return null;
    let dose = (rate * d.amount * f) / d.volume_ml;
    if (parts.includes("kg")) {
        if (!d.weight_kg) return null;
        dose /= d.weight_kg;
    }
    if (parts[parts.length - 1] === "min") dose /= 60;
    return dose;
}
const rateOf = (dose, d) => {
    const one = doseOf(1, d);
    return one ? dose / one : null;
};

function openDripStart() {
    const s = sheet;
    const o = s.options;
    const m = modal(`Start drip — ${esc(s.admission.name)}`, esc(s.admission.bed), `
        ${s.iv_orders.length ? `<div><label for="icd_o">Under the medicine order <span style="font-weight:400">(optional)</span></label><select id="icd_o" name="med_order_id"><option value="">—</option>
            ${s.iv_orders.map((x) => `<option value="${x.id}" data-name="${esc(x.drug_name)}">${esc(x.drug_name)} ${esc(num(x.dose, 3))} ${esc(x.dose_unit)}${x.instructions ? ` — ${esc(x.instructions)}` : ""}</option>`).join("")}</select></div>` : ""}
        <div><label for="icd_p">Common mix <span style="font-weight:400">(fills the fields — check against the bag)</span></label><select id="icd_p"><option value="">—</option>
            ${PRESETS.map((p, i) => `<option value="${i}">${esc(p[0])} ${p[1]} ${p[2]} in ${p[3]} mL · ${p[4]}</option>`).join("")}<option value="fluid">IV fluid in mL/h</option></select></div>
        <div class="icx-grid wide">
            <div><label for="icd_d">Drug / fluid</label><input type="text" id="icd_d" name="drug_name" maxlength="150" autocomplete="off"></div>
            <div><label for="icd_du">Dose in</label><select id="icd_du" name="dose_unit">${o.dose_units.map((u) => `<option>${esc(u)}</option>`).join("")}</select></div>
        </div>
        <div class="icx-grid" data-conc>
            <div><label for="icd_a">Amount</label><input type="number" id="icd_a" name="amount" min="0" step="any"></div>
            <div><label for="icd_au">Unit</label><select id="icd_au" name="amount_unit">${o.amount_units.map((u) => `<option>${esc(u)}</option>`).join("")}</select></div>
            <div><label for="icd_v">In mL</label><input type="number" id="icd_v" name="volume_ml" min="1" max="5000" step="any"></div>
            <div data-wt><label for="icd_w">Weight kg</label><input type="number" id="icd_w" name="weight_kg" min="0.3" max="400" step="0.1" value="${esc(s.admission.weight_kg ?? "")}"></div>
        </div>
        <div class="icx-grid">
            <div><label for="icd_r">Rate mL/h</label><input type="number" id="icd_r" name="rate_ml_h" min="0" max="999" step="any"></div>
            <div data-doseb><label for="icd_x">or dose <span data-du></span></label><input type="number" id="icd_x" name="dose" min="0" step="any"></div>
            <div><label for="icd_t">Started <span style="font-weight:400">(blank = now)</span></label><input type="time" id="icd_t" name="at"></div>
        </div>
        <div class="icx-calc" data-calc aria-live="polite"></div>
        <div><label for="icd_n">Notes <span style="font-weight:400">(optional)</span></label><input type="text" id="icd_n" name="notes" maxlength="500" autocomplete="off"></div>`,
        `<button type="button" class="icu-b" data-x>Cancel</button><button type="button" class="icu-b blue" data-save>Start drip</button>`);
    let last = "rate";
    const drip = () => ({ dose_unit: m.val("dose_unit"), amount: Number(m.val("amount")), amount_unit: m.val("amount_unit"), volume_ml: Number(m.val("volume_ml")), weight_kg: Number(m.val("weight_kg")) });
    const calc = () => {
        const d = drip();
        const isMl = d.dose_unit === "mL/h";
        m.$("[data-conc]").querySelectorAll("div:not([data-wt])").forEach((x) => (x.hidden = false));
        m.$("#icd_a").closest("div").hidden = isMl;
        m.$("#icd_au").closest("div").hidden = isMl;
        m.$("[data-wt]").hidden = !d.dose_unit.includes("/kg/");
        m.$("[data-doseb]").hidden = isMl;
        m.$("[data-du]").textContent = d.dose_unit;
        let txt = "";
        if (!isMl && d.amount && d.volume_ml) txt += `Concentration ${num(d.amount / d.volume_ml, 4)} ${d.amount_unit}/mL. `;
        if (last === "dose" && m.val("dose") !== "") {
            const r = rateOf(Number(m.val("dose")), d);
            if (r !== null) txt += `${num(m.val("dose"), 3)} ${d.dose_unit} = ${num(r, 2)} mL/h`;
        } else if (m.val("rate_ml_h") !== "") {
            const x = doseOf(Number(m.val("rate_ml_h")), d);
            txt += isMl ? `${num(m.val("rate_ml_h"), 2)} mL/h` : x !== null ? `${num(m.val("rate_ml_h"), 2)} mL/h = ${num(x, 3)} ${d.dose_unit}` : "";
        }
        m.$("[data-calc]").textContent = txt;
    };
    m.$("#icd_r").addEventListener("input", () => {
        last = "rate";
        m.$("#icd_x").value = "";
    });
    m.$("#icd_x").addEventListener("input", () => {
        last = "dose";
        m.$("#icd_r").value = "";
    });
    m.$("#icd_p").addEventListener("change", (e) => {
        const p = PRESETS[e.target.value];
        if (e.target.value === "fluid") {
            m.$("#icd_du").value = "mL/h";
            m.$("#icd_v").value = 1000;
        } else if (p) {
            if (!m.val("drug_name")) m.$("#icd_d").value = p[0];
            m.$("#icd_a").value = p[1];
            m.$("#icd_au").value = p[2];
            m.$("#icd_v").value = p[3];
            m.$("#icd_du").value = p[4];
        }
        calc();
    });
    m.$("#icd_o")?.addEventListener("change", (e) => {
        const name = e.target.selectedOptions[0]?.dataset.name;
        if (name) m.$("#icd_d").value = name;
    });
    m.ov.addEventListener("input", calc);
    m.ov.addEventListener("change", calc);
    calc();
    (m.$("#icd_o") || m.$("#icd_p")).focus();
    m.$("[data-save]").onclick = async (ev) => {
        const body = { admission_id: s.admission.id };
        ["med_order_id", "drug_name", "dose_unit", "amount", "amount_unit", "volume_ml", "weight_kg", "at", "notes"].forEach((k) => (body[k] = m.val(k)));
        body[last === "dose" ? "dose" : "rate_ml_h"] = m.val(last === "dose" ? "dose" : "rate_ml_h");
        ev.target.disabled = true;
        const r = await post("/icu/drip/start", body);
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors);
        m.close();
        showToast(r.message, "success", 6000);
        loadSheet(true);
    };
}

function openDrip(id) {
    const d = sheet.drips.find((x) => x.id === id);
    if (!d) return;
    const can = sheet.can_record && sheet.admission.active && d.running;
    const isMl = d.dose_unit === "mL/h";
    const m = modal(`${esc(d.drug_name)} — ${esc(sheet.admission.name)}`, `${d.concentration ? `${esc(d.concentration)} · ` : ""}${esc(d.dose_unit)}${d.weight_kg ? ` · ${num(d.weight_kg)} kg` : ""}
        · started ${esc(String(d.started_at).slice(0, 16))}${d.started_by_name ? ` by ${esc(d.started_by_name)}` : ""}${d.running ? "" : ` · stopped ${esc(String(d.stopped_at).slice(0, 16))}${d.stop_reason ? ` (${esc(d.stop_reason)})` : ""}`}`, `
        <div class="icx-note">Now: <b>${num(d.current_rate, 2)} mL/h</b>${d.current_dose !== null ? ` = <b>${num(d.current_dose, 3)} ${esc(d.dose_unit)}</b>` : ""} · infused this ICU day ${ml(d.total_ml)} mL</div>
        ${can ? `<fieldset><legend>Change the rate</legend><div class="icx-grid">
            <div><label for="icr_r">New rate mL/h</label><input type="number" id="icr_r" name="rate_ml_h" min="0" max="999" step="any"></div>
            ${isMl ? "" : `<div><label for="icr_x">or dose ${esc(d.dose_unit)}</label><input type="number" id="icr_x" name="dose" min="0" step="any"></div>`}
            <div><label for="icr_t">From <span style="font-weight:400">(blank = now)</span></label><input type="time" id="icr_t" name="at"></div>
            <div style="grid-column:span 2"><label for="icr_w">Why <span style="font-weight:400">(optional)</span></label><input type="text" id="icr_w" name="reason" maxlength="255" placeholder="e.g. MAP 58, titrated up" autocomplete="off"></div>
        </div><div class="icx-calc" data-calc aria-live="polite"></div>
            <div style="margin-top:8px"><button type="button" class="icu-b blue" data-rate>Save rate</button> <span class="muted" style="font-size:12px">0 mL/h = paused.</span></div></fieldset>
        <fieldset><legend>Stop</legend><div class="icx-grid wide">
            <div><label for="ics_t">Stopped at <span style="font-weight:400">(blank = now)</span></label><input type="time" id="ics_t" name="stop_at"></div>
            <div><label for="ics_w">Why <span style="font-weight:400">(optional)</span></label><input type="text" id="ics_w" name="stop_reason" maxlength="255" placeholder="e.g. weaned off" autocomplete="off"></div>
        </div><div style="margin-top:8px"><button type="button" class="icu-b" data-stop>Stop drip</button></div></fieldset>` : ""}
        <div><span class="lbl">Rate history</span><div class="icu-list"><table><thead><tr><th>From</th><th>mL/h</th>${isMl ? "" : `<th>${esc(d.dose_unit)}</th>`}<th>Why</th><th>By</th></tr></thead><tbody>
            ${d.rates.map((x) => `<tr><td>${esc(String(x.at).slice(5, 16))}</td><td>${num(x.rate, 2)}</td>${isMl ? "" : `<td>${num(x.dose, 3)}</td>`}<td>${esc(x.reason || "")}</td><td>${esc(x.by || "")}</td></tr>`).join("")}</tbody></table></div></div>`,
        `<button type="button" class="icu-b" data-x>Close</button>`);
    if (!can) return m.$("[data-x]").focus();
    let last = "rate";
    const calc = () => {
        const txt = last === "dose" && m.val("dose") !== "" ? (() => {
            const r = rateOf(Number(m.val("dose")), d);
            return r !== null ? `${num(m.val("dose"), 3)} ${d.dose_unit} = ${num(r, 2)} mL/h` : "";
        })() : m.val("rate_ml_h") !== "" && !isMl ? `${num(m.val("rate_ml_h"), 2)} mL/h = ${num(doseOf(Number(m.val("rate_ml_h")), d), 3)} ${d.dose_unit}` : "";
        m.$("[data-calc]").textContent = txt;
    };
    m.$("#icr_r").addEventListener("input", () => {
        last = "rate";
        if (m.$("#icr_x")) m.$("#icr_x").value = "";
        calc();
    });
    m.$("#icr_x")?.addEventListener("input", () => {
        last = "dose";
        m.$("#icr_r").value = "";
        calc();
    });
    m.$("#icr_r").focus();
    m.$("[data-rate]").onclick = async (ev) => {
        const body = { drip_id: id, at: m.val("at"), reason: m.val("reason") };
        body[last === "dose" ? "dose" : "rate_ml_h"] = m.val(last === "dose" ? "dose" : "rate_ml_h");
        ev.target.disabled = true;
        const r = await post("/icu/drip/rate", body);
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors);
        m.close();
        showToast(r.message, "success");
        loadSheet(true);
    };
    m.$("[data-stop]").onclick = async (ev) => {
        if (ev.target.dataset.sure !== "1") {
            ev.target.dataset.sure = "1";
            ev.target.textContent = `Press again to stop ${d.drug_name}`;
            return;
        }
        ev.target.disabled = true;
        const r = await post("/icu/drip/stop", { drip_id: id, at: m.val("stop_at"), reason: m.val("stop_reason") });
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors?.at ? { stop_at: 1 } : null);
        m.close();
        showToast(r.message, "success");
        loadSheet(true);
    };
}

