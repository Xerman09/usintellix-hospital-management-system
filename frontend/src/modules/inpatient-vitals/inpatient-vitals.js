import { fetchVitalsBoard, fetchVitalsHistory, recordVitals, voidVitals, setVitalsSchedule, setSpo2Scale } from "./inpatient-vitals.service.js?v=2";
import { getUser } from "../../core/session.js?v=2";
import { showToast } from "../../core/toast.js";
import { systemNow, toDateTimeInput } from "../../core/timezone.js";

/*
 * Inpatient vital signs.
 *  - Ward board (tab "inpatient_vitals"): latest set and due status per patient.
 *  - Shared windows, also opened from the patient chart: record a set, change the
 *    schedule, and the graph (one small chart per measure + the full table).
 */

const $ = (id) => document.getElementById(id);
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Server "YYYY-MM-DD HH:MM:SS" (system time) -> ms, read as UTC so no browser-timezone shift. */
const ms = (dt) => {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
    return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : NaN;
};
const hm = (t) => {
    const d = new Date(t);
    const h = d.getUTCHours();
    return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const fmtTime = (dt) => {
    const t = ms(dt);
    if (!Number.isFinite(t)) return "";
    const d = new Date(t);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hm(t)}`;
};
const span = (min) => {
    const a = Math.abs(min);
    return a < 60 ? `${a} min` : `${Math.floor(a / 60)} h${a % 60 ? ` ${a % 60} min` : ""}`;
};

/* ---------------- status, values ---------------- */

export function statusBadge(status) {
    if (!status) return "";
    const m = status.minutes;
    const map = {
        overdue: ["overdue", "⏰ Overdue", `by ${span(m)}`],
        due: ["due", "● Due now", status.never ? "no vitals yet" : m ? `${span(m)} ago` : ""],
        due_soon: ["soon", "◔ Due soon", `in ${span(m)}`],
        ok: ["ok", "✓ On time", `next ${hm(ms(status.next_due))}`],
    };
    const [cls, label, sub] = map[status.state] || map.ok;
    return `<span class="ivx-badge ${cls}">${label}</span>${sub ? `<div class="ivx-sub">${esc(sub)}</div>` : ""}`;
}

/** NEWS2: score + risk in words (icon + label, never color alone); "partial" when parameters are missing. */
export function news2Badge(n, { long = false } = {}) {
    if (!n) return "";
    const icon = { low: "", low_medium: "▲ ", medium: "▲ ", high: "⚠ " }[n.risk] || "";
    const tip = n.complete ? "" : ` title="Partial: not every NEWS2 parameter was measured"`;
    return `<span class="ivx-news ${n.risk}"${tip}>${icon}NEWS2 ${n.score}${n.complete ? "" : "*"}${long || n.risk !== "low" ? ` · ${esc(n.risk_label)}` : ""}</span>`;
}

const MEASURES = [
    { key: "bp", label: "Blood pressure", short: "BP", unit: "mmHg" },
    { key: "heart_rate", label: "Heart rate", short: "HR", unit: "/min" },
    { key: "resp_rate", label: "Breathing rate", short: "RR", unit: "/min" },
    { key: "temperature_c", label: "Temperature", short: "T", unit: "°C" },
    { key: "spo2", label: "SpO₂", short: "SpO₂", unit: "%" },
    { key: "pain_score", label: "Pain", short: "Pain", unit: "/10" },
    { key: "blood_sugar_mgdl", label: "Blood sugar", short: "BS", unit: "mg/dL" },
];

const flagMark = (f) => (f === "high" ? `<span class="ivx-flag" title="High">▲<span class="ivx-sr"> high</span></span>` : f === "low" ? `<span class="ivx-flag" title="Low">▼<span class="ivx-sr"> low</span></span>` : "");

function valueOf(set, key) {
    if (key === "bp") return set.bp_systolic != null ? `${set.bp_systolic}/${set.bp_diastolic}` : null;
    if (key === "spo2" && set.spo2 != null) return `${set.spo2}${set.on_oxygen ? ` on ${set.oxygen_lpm ?? "?"} L O₂` : ""}`;
    return set[key] != null ? String(set[key]) : null;
}
const flagOf = (set, key) => (key === "bp" ? set.flags?.bp_systolic || set.flags?.bp_diastolic : set.flags?.[key]);

/** "BP 150/95▲ · HR 120▲ · …" */
export function valuesLine(set) {
    if (!set) return `<span class="ivx-sub">No vital signs yet</span>`;
    const parts = MEASURES.map((m) => {
        const v = valueOf(set, m.key);
        return v == null ? null : `<span class="ivx-v ${flagOf(set, m.key) ? "abn" : ""}"><span class="ivx-k">${m.short}</span> ${esc(v)}${flagMark(flagOf(set, m.key))}</span>`;
    }).filter(Boolean);
    if (set.consciousness && set.consciousness !== "Alert") parts.push(`<span class="ivx-v abn"><span class="ivx-k">AVPU</span> ${esc(set.consciousness)}</span>`);
    return parts.join(" ");
}

/* ---------------- shared window ---------------- */

const CSS = `
.ivx-root { --ivx-s1: #2a78d6; --ivx-s2: #eb6834; --ivx-band: rgba(21,128,61,.08); --ivx-surface: var(--bg-surface); }
:root[data-theme="dark"] .ivx-root { --ivx-s1: #3987e5; --ivx-s2: #d95926; --ivx-band: rgba(134,239,172,.08); }
.ivx-badge { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.ivx-badge.overdue { background: #fee2e2; color: #991b1b; }
.ivx-badge.due { background: #fef3c7; color: #92400e; }
.ivx-badge.soon { background: var(--accent-lighter); color: var(--accent-text); }
.ivx-badge.ok { background: #dcfce7; color: #166534; }
.ivx-news { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; border: 1px solid var(--border-color); color: var(--text-primary); }
.ivx-news.low_medium { background: #fef3c7; color: #92400e; border-color: transparent; }
.ivx-news.medium { background: #ffedd5; color: #9a3412; border-color: transparent; }
.ivx-news.high { background: #dc2626; color: #fff; border-color: transparent; }
:root[data-theme="dark"] .ivx-news.low_medium { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .ivx-news.medium { background: #7c2d12; color: #fed7aa; }
.ivx-warn { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 12px; color: #b45309; font-weight: 600; margin-top: 3px; }
:root[data-theme="dark"] .ivx-warn { color: #fcd34d; }
:root[data-theme="dark"] .ivx-badge.overdue { background: #7f1d1d; color: #fecaca; }
:root[data-theme="dark"] .ivx-badge.due { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .ivx-badge.ok { background: #14532d; color: #bbf7d0; }
.ivx-sub { color: var(--text-muted); font-size: 12px; }
.ivx-sr { position: absolute; left: -9999px; }
.ivx-v { display: inline-block; margin: 0 8px 2px 0; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ivx-k { color: var(--text-muted); font-size: 11.5px; }
.ivx-v.abn { font-weight: 700; }
.ivx-flag { color: #dc2626; font-size: 10px; margin-left: 2px; }
:root[data-theme="dark"] .ivx-flag { color: #f87171; }
.ivx-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 6px 11px; font-weight: 600; font-size: 12.5px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.ivx-btn:hover { background: var(--bg-surface-alt); }
.ivx-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.ivx-btn.primary:hover { background: var(--accent-hover); }
.ivx-btn.on { background: var(--accent-light); border-color: var(--accent); color: var(--accent-text); }
.ivx-btn:disabled { opacity: .55; cursor: default; }
.ivx-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
#ivxOverlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4200; display: none; align-items: flex-start; justify-content: center; padding: 4vh 16px 16px; overflow-y: auto; }
#ivxOverlay.open { display: flex; }
#ivxModal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 640px; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.3); font-size: 13.5px; }
#ivxModal.wide { max-width: 1040px; }
.ivx-head { display: flex; justify-content: space-between; gap: 10px; padding: 16px 20px 6px; }
.ivx-head h2 { margin: 0; font-size: 18px; }
.ivx-x { border: 0; background: none; color: var(--text-muted); font-size: 22px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 6px; }
.ivx-x:hover { background: var(--bg-surface-alt); color: var(--text-primary); }
.ivx-body { padding: 4px 20px 12px; }
.ivx-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--border-color); flex-wrap: wrap; }
.ivx-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px; }
.ivx-form .full { grid-column: 1 / -1; }
@media (max-width: 560px) { .ivx-form { grid-template-columns: minmax(0, 1fr); } }
.ivx-form label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.ivx-form input, .ivx-form select, .ivx-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.ivx-form input[aria-invalid="true"] { border-color: #dc2626; }
.ivx-bp { display: flex; align-items: center; gap: 6px; }
.ivx-bp span { color: var(--text-muted); }
.ivx-unit { display: flex; align-items: center; gap: 6px; }
.ivx-unit span { color: var(--text-muted); font-size: 12px; white-space: nowrap; }
.ivx-check { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary) !important; }
.ivx-check input { width: auto !important; }
.ivx-err { color: #dc2626; font-size: 12px; margin-top: 3px; }
.ivx-hint { color: var(--text-muted); font-size: 12px; margin-top: 3px; }
.ivx-ranges { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 12px; align-items: center; }
.ivx-charts { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.ivx-chart { border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px 6px; position: relative; min-width: 0; }
.ivx-chart h3 { margin: 0; font-size: 13px; display: flex; justify-content: space-between; gap: 8px; }
.ivx-chart h3 .ivx-sub { font-weight: 400; }
.ivx-legend { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ivx-legend i { display: inline-block; width: 14px; height: 2px; vertical-align: middle; margin-right: 4px; border-radius: 1px; }
.ivx-chart svg { display: block; width: 100%; height: auto; overflow: visible; touch-action: pan-y; }
.ivx-chart .grid { stroke: var(--border-color); stroke-width: 1; }
.ivx-chart .axis { fill: var(--text-muted); font-size: 10px; }
.ivx-chart .band { fill: var(--ivx-band); }
.ivx-chart .lbl { font-size: 10px; font-weight: 600; fill: var(--text-primary); }
.ivx-chart .xhair { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; }
.ivx-tip { position: absolute; pointer-events: none; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 9px; font-size: 12px; box-shadow: 0 8px 20px rgba(0,0,0,.15); white-space: nowrap; z-index: 2; display: none; }
.ivx-nodata { color: var(--text-muted); font-size: 12px; padding: 18px 0; text-align: center; }
.ivx-tablewrap { overflow-x: auto; margin-top: 14px; border: 1px solid var(--border-color); border-radius: 10px; }
.ivx-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ivx-table th, .ivx-table td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.ivx-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); }
.ivx-table td.num { font-variant-numeric: tabular-nums; }
.ivx-table tr.void td { text-decoration: line-through; color: var(--text-muted); }
.ivx-table tr.void td.why { text-decoration: none; }
.ivx-table tr:last-child td { border-bottom: 0; }
.ivx-voidrow td { background: var(--bg-surface-alt); }
.ivx-voidrow input { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 6px 9px; font: inherit; font-size: 12.5px; width: 260px; max-width: 100%; }
.ivx-summary { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin: 2px 0 10px; }
`;

function ensureRoot() {
    if (!$("ivx-style")) {
        const st = document.createElement("style");
        st.id = "ivx-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    let root = $("ivxOverlay");
    if (!root) {
        root = document.createElement("div");
        root.id = "ivxOverlay";
        root.className = "ivx-root";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-labelledby", "ivxTitle");
        root.innerHTML = `<div id="ivxModal"></div>`;
        root.addEventListener("click", (e) => {
            if (e.target === root) closeModal();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && root.classList.contains("open")) closeModal();
        });
        document.body.appendChild(root);
    }
    return root;
}
export function ensureVitalsStyles() {
    ensureRoot();
}
function openModal(wide = false) {
    const root = ensureRoot();
    $("ivxModal").className = wide ? "wide" : "";
    root.classList.add("open");
}
function closeModal() {
    $("ivxOverlay")?.classList.remove("open");
}

const header = (title, s) => `<div class="ivx-head"><div><h2 id="ivxTitle">${esc(title)}</h2>
    ${s ? `<div class="ivx-sub">${esc([s.patient_name, s.ward, `Room ${s.room} · Bed ${s.bed}`].filter(Boolean).join(" · "))}</div>` : ""}</div>
    <button type="button" class="ivx-x" data-close aria-label="Close">×</button></div>`;

/* ---------------- record ---------------- */

/** s: a summary from the board / chart (admission_id, patient_name, ward, room, bed, latest). */
export function openRecordVitals(s, { onSaved = null } = {}) {
    openModal();
    const modal = $("ivxModal");
    const now = toDateTimeInput(systemNow());
    const field = (name, label, attrs, unit = "") => `<div><label for="ivx_${name}">${label}</label>
        <div class="ivx-unit"><input id="ivx_${name}" name="${name}" inputmode="decimal" ${attrs}>${unit ? `<span>${unit}</span>` : ""}</div>
        <div class="ivx-err" data-err="${name}"></div></div>`;
    modal.innerHTML = `${header("Record vital signs", s)}
        <form class="ivx-body" id="ivxForm" novalidate>
            <div class="ivx-form">
                <div><label for="ivx_taken_at">Taken at</label><input type="datetime-local" id="ivx_taken_at" name="taken_at" value="${now}" max="${now}"><div class="ivx-err" data-err="taken_at"></div></div>
                <div><label for="ivx_bp_systolic">Blood pressure</label>
                    <div class="ivx-bp"><input id="ivx_bp_systolic" name="bp_systolic" inputmode="numeric" placeholder="120" aria-label="Systolic (upper)"><span>/</span>
                    <input id="ivx_bp_diastolic" name="bp_diastolic" inputmode="numeric" placeholder="80" aria-label="Diastolic (lower)"><span class="ivx-sub">mmHg</span></div>
                    <div class="ivx-err" data-err="bp_systolic"></div><div class="ivx-err" data-err="bp_diastolic"></div></div>
                ${field("heart_rate", "Heart rate", 'inputmode="numeric" placeholder="80"', "/min")}
                ${field("resp_rate", "Breathing rate", 'inputmode="numeric" placeholder="16"', "/min")}
                ${field("temperature_c", "Temperature", 'placeholder="36.8"', "°C")}
                ${field("spo2", "SpO₂", 'inputmode="numeric" placeholder="98"', "%")}
                <div><label class="ivx-check"><input type="checkbox" id="ivx_on_oxygen" name="on_oxygen"> On oxygen</label>
                    <div class="ivx-unit" id="ivxO2" hidden><input id="ivx_oxygen_lpm" name="oxygen_lpm" inputmode="decimal" placeholder="2" aria-label="Oxygen flow"><span>L/min</span></div>
                    <div class="ivx-err" data-err="oxygen_lpm"></div></div>
                <div><label for="ivx_consciousness">Consciousness</label>
                    <select id="ivx_consciousness" name="consciousness"><option value="">—</option>${["Alert", "Confused", "Voice", "Pain", "Unresponsive"].map((c) => `<option>${c}</option>`).join("")}</select>
                    <div class="ivx-hint">Alert / new confusion / responds to voice / to pain / unresponsive</div></div>
                <div><label for="ivx_pain_score">Pain score</label>
                    <select id="ivx_pain_score" name="pain_score"><option value="">—</option>${Array.from({ length: 11 }, (_, i) => `<option value="${i}">${i}${i === 0 ? " – none" : i === 10 ? " – worst" : ""}</option>`).join("")}</select></div>
                ${field("blood_sugar_mgdl", "Blood sugar", 'inputmode="numeric" placeholder="110"', "mg/dL")}
                <div class="full"><label for="ivx_notes">Note (optional)</label><input id="ivx_notes" name="notes" maxlength="500" placeholder="e.g. after walking, patient anxious"><div class="ivx-err" data-err="notes"></div></div>
            </div>
            <div class="ivx-err" data-err="form" style="margin-top:8px"></div>
        </form>
        <div class="ivx-foot"><button type="button" class="ivx-btn" data-close>Cancel</button><button type="button" class="ivx-btn primary" id="ivxSave">Save vital signs</button></div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeModal));
    $("ivx_on_oxygen").onchange = (e) => {
        $("ivxO2").hidden = !e.target.checked;
        if (e.target.checked) $("ivx_oxygen_lpm").focus();
    };
    $("ivxForm").addEventListener("submit", (e) => {
        e.preventDefault();
        save();
    });
    $("ivxForm").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") {
            e.preventDefault();
            save();
        }
    });
    $("ivxSave").onclick = save;
    setTimeout(() => $("ivx_bp_systolic")?.focus(), 0);

    async function save() {
        modal.querySelectorAll(".ivx-err").forEach((x) => (x.textContent = ""));
        modal.querySelectorAll('[aria-invalid="true"]').forEach((x) => x.removeAttribute("aria-invalid"));
        const f = new FormData($("ivxForm"));
        const data = { admission_id: s.admission_id, on_oxygen: $("ivx_on_oxygen").checked ? 1 : 0 };
        for (const [k, v] of f.entries()) if (k !== "on_oxygen") data[k] = String(v).trim();
        const btn = $("ivxSave");
        btn.disabled = true;
        const res = await recordVitals(data).catch(() => null);
        btn.disabled = false;
        if (!res?.success) {
            const errs = res?.errors || {};
            let shown = false;
            Object.entries(errs).forEach(([k, v]) => {
                const el = modal.querySelector(`[data-err="${k}"]`);
                if (el) {
                    el.textContent = v;
                    shown = true;
                }
                $(`ivx_${k}`)?.setAttribute("aria-invalid", "true");
            });
            if (!shown) modal.querySelector('[data-err="form"]').textContent = res?.message || "Could not save. Try again.";
            modal.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }
        const n = res.data.set?.news2;
        const alerted = res.data.alert?.raised;
        showToast(`Vital signs saved${n ? ` · NEWS2 ${n.score}${n.complete ? "" : " (partial)"}${n.risk !== "low" ? ` — ${n.risk_label} risk` : ""}` : ""}.${alerted ? " The nurse, charge nurse and doctor were alerted." : ""}`, "success", alerted ? 7000 : 3500);
        closeModal();
        onSaved?.(res.data.summary);
    }
}

/* ---------------- schedule ---------------- */

export function openVitalsSchedule(s, { onSaved = null } = {}) {
    openModal();
    const modal = $("ivxModal");
    const every = s.schedule?.every_hours || 4;
    modal.innerHTML = `${header("How often are vitals due?", s)}
        <div class="ivx-body ivx-form">
            <div class="full"><label for="ivxEvery">Every</label>
                <select id="ivxEvery">${[1, 2, 4, 6, 8, 12, 24].map((h) => `<option value="${h}" ${h === every ? "selected" : ""}>${h === 24 ? "24 hours (once a day)" : `${h} hour${h === 1 ? "" : "s"}`}</option>`).join("")}</select>
                <div class="ivx-hint">${s.schedule?.is_default ? "Now using the ward default." : `Set${s.schedule?.reason ? `: ${esc(s.schedule.reason)}` : ""}.`} The next set is due this long after the last one.</div></div>
            <div class="full"><label for="ivxWhy">Reason (optional)</label><input id="ivxWhy" maxlength="255" placeholder="e.g. post-op first 24 h, stable for transfer"></div>
            <div class="ivx-err full" id="ivxSchedErr"></div>
        </div>
        <div class="ivx-foot"><button type="button" class="ivx-btn" data-close>Cancel</button><button type="button" class="ivx-btn primary" id="ivxSchedSave">Save</button></div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeModal));
    $("ivxSchedSave").onclick = async () => {
        $("ivxSchedSave").disabled = true;
        const res = await setVitalsSchedule(s.admission_id, Number($("ivxEvery").value), $("ivxWhy").value.trim()).catch(() => null);
        $("ivxSchedSave").disabled = false;
        if (!res?.success) {
            $("ivxSchedErr").textContent = res?.message || "Could not save.";
            return;
        }
        showToast(res.message);
        closeModal();
        onSaved?.(res.data);
    };
    setTimeout(() => $("ivxEvery")?.focus(), 0);
}

/* ---------------- SpO2 scale (doctors) ---------------- */

export function openSpo2Scale(s, { onSaved = null } = {}) {
    openModal();
    const modal = $("ivxModal");
    modal.innerHTML = `${header("NEWS2 SpO₂ scale", s)}
        <div class="ivx-body ivx-form">
            <div class="full"><label for="ivxScale">Scale</label>
                <select id="ivxScale">
                    <option value="1" ${s.spo2_scale !== 2 ? "selected" : ""}>Scale 1 — standard (target 96% and above)</option>
                    <option value="2" ${s.spo2_scale === 2 ? "selected" : ""}>Scale 2 — prescribed target 88–92% (e.g. hypercapnic respiratory failure)</option>
                </select>
                <div class="ivx-hint">Scale 2 only for patients with a prescribed 88–92% target. It applies from the next set; earlier scores stay as they were.</div></div>
            <div class="full"><label for="ivxScaleWhy">Reason</label><input id="ivxScaleWhy" maxlength="255" value="${esc(s.scale_reason || "")}" placeholder="e.g. COPD with CO₂ retention"></div>
            <div class="ivx-err full" id="ivxScaleErr"></div>
        </div>
        <div class="ivx-foot"><button type="button" class="ivx-btn" data-close>Cancel</button><button type="button" class="ivx-btn primary" id="ivxScaleSave">Save</button></div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeModal));
    $("ivxScaleSave").onclick = async () => {
        $("ivxScaleSave").disabled = true;
        const res = await setSpo2Scale(s.admission_id, Number($("ivxScale").value), $("ivxScaleWhy").value.trim()).catch(() => null);
        $("ivxScaleSave").disabled = false;
        if (!res?.success) {
            $("ivxScaleErr").textContent = res?.message || "Could not save.";
            return;
        }
        showToast(res.message);
        closeModal();
        onSaved?.(res.data);
    };
    setTimeout(() => $("ivxScale")?.focus(), 0);
}

/* ---------------- graph ---------------- */

const W = 320, H = 132, PL = 34, PR = 34, PT = 10, PB = 20;

function niceTicks(lo, hi, whole = false) {
    const span = hi - lo || 1;
    const mag = 10 ** Math.floor(Math.log10(span / 5));
    // The smallest "nice" step giving at most 5 ticks; whole-number measures (HR, SpO2, ...) get whole-number ticks.
    const cands = [1, 2, 2.5, 5, 10, 20].map((k) => k * mag).filter((k) => !whole || (Number.isInteger(k) && k >= 1));
    const step = cands.find((k) => span / k <= 5) || cands[cands.length - 1] || span;
    const ticks = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
    return ticks;
}

/** One measure, one chart. series: [{key, label, color}]; normal: {key: [low, high]} */
function lineChart(sets, m, normal, from, to) {
    const series = m.key === "bp"
        ? [{ key: "bp_systolic", label: "Systolic", color: "var(--ivx-s1)" }, { key: "bp_diastolic", label: "Diastolic", color: "var(--ivx-s2)" }]
        : [{ key: m.key, label: m.label, color: "var(--ivx-s1)" }];
    const pts = sets.filter((s) => series.some((x) => s[x.key] != null));
    const latest = pts[pts.length - 1];
    const head = `<h3>${esc(m.label)} <span class="ivx-sub">${latest ? `${esc(valueOf(latest, m.key))} ${esc(m.unit)} · ${esc(hm(ms(latest.taken_at)))}` : m.unit}</span></h3>
        ${series.length > 1 ? `<div class="ivx-legend">${series.map((x) => `<span><i style="background:${x.color}"></i>${x.label}</span>`).join("")}</div>` : ""}`;
    if (!pts.length) return `<div class="ivx-chart">${head}<div class="ivx-nodata">Not recorded in this period</div></div>`;

    const vals = pts.flatMap((s) => series.map((x) => s[x.key]).filter((v) => v != null));
    const bands = series.map((x) => normal[x.key]).filter(Boolean);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    bands.forEach(([a, b]) => {
        if (a != null) lo = Math.min(lo, a);
        if (b != null) hi = Math.max(hi, b);
    });
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
    lo -= pad;
    hi += pad;
    if (m.key === "spo2") hi = Math.min(hi, 101);
    if (m.key === "pain_score") { lo = Math.max(lo, -0.5); hi = Math.min(Math.max(hi, 10), 10.5); }
    const x = (t) => PL + ((t - from) / (to - from || 1)) * (W - PL - PR);
    const y = (v) => PT + (1 - (v - lo) / (hi - lo || 1)) * (H - PT - PB);

    let svg = "";
    // Normal range band (recessive), y grid, x labels.
    if (series.length === 1 && normal[series[0].key]) {
        const [a, b] = normal[series[0].key];
        const top = y(b != null ? Math.min(b, hi) : hi), bot = y(a != null ? Math.max(a, lo) : lo);
        svg += `<rect class="band" x="${PL}" y="${top}" width="${W - PL - PR}" height="${Math.max(0, bot - top)}"><title>Normal range</title></rect>`;
    }
    niceTicks(lo, hi, m.key !== "temperature_c").forEach((v) => {
        svg += `<line class="grid" x1="${PL}" x2="${W - PR}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${PL - 5}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    });
    const span = to - from;
    [0, 0.5, 1].forEach((f) => {
        const t = from + span * f;
        const d = new Date(t);
        const lbl = span > 36 * 3600e3 ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}` : hm(t);
        svg += `<text class="axis" x="${x(t)}" y="${H - 5}" text-anchor="${f === 0 ? "start" : f === 1 ? "end" : "middle"}">${lbl}</text>`;
    });
    // Lines, markers (hollow = outside the normal range), direct labels for 2 series.
    series.forEach((sr) => {
        const p = pts.filter((s) => s[sr.key] != null);
        if (p.length > 1) svg += `<path d="${p.map((s, i) => `${i ? "L" : "M"}${x(ms(s.taken_at)).toFixed(1)},${y(s[sr.key]).toFixed(1)}`).join("")}" fill="none" stroke="${sr.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
        p.forEach((s) => {
            const abn = s.flags?.[sr.key];
            svg += `<circle cx="${x(ms(s.taken_at)).toFixed(1)}" cy="${y(s[sr.key]).toFixed(1)}" r="${abn ? 4.5 : 4}" fill="${abn ? "var(--ivx-surface)" : sr.color}" stroke="${abn ? sr.color : "var(--ivx-surface)"}" stroke-width="2"/>`;
        });
        if (series.length > 1) {
            const last = p[p.length - 1];
            svg += `<text class="lbl" x="${x(ms(last.taken_at)) + 7}" y="${y(last[sr.key]) + 3}">${sr.key === "bp_systolic" ? "Sys" : "Dia"}</text>`;
        }
    });
    svg += `<line class="xhair" x1="0" x2="0" y1="${PT}" y2="${H - PB}" visibility="hidden"/>
        <rect class="hit" x="${PL}" y="0" width="${W - PL - PR}" height="${H}" fill="transparent"/>`;
    const data = encodeURIComponent(JSON.stringify(pts.map((s) => ({ t: ms(s.taken_at), v: valueOf(s, m.key), f: flagOf(s, m.key) || "" }))));
    return `<div class="ivx-chart" data-pts="${data}" data-from="${from}" data-to="${to}" data-unit="${esc(m.unit)}">${head}
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.label)} over time; ${pts.length} readings, latest ${esc(valueOf(latest, m.key))} ${esc(m.unit)}">${svg}</svg>
        <div class="ivx-tip" role="status"></div></div>`;
}

/** Crosshair + tooltip: nearest reading to the pointer. */
function bindHover(root) {
    root.querySelectorAll(".ivx-chart[data-pts]").forEach((card) => {
        const svg = card.querySelector("svg");
        const tip = card.querySelector(".ivx-tip");
        const xhair = svg.querySelector(".xhair");
        const pts = JSON.parse(decodeURIComponent(card.dataset.pts));
        const from = Number(card.dataset.from), to = Number(card.dataset.to);
        const xOf = (t) => PL + ((t - from) / (to - from || 1)) * (W - PL - PR);
        const move = (e) => {
            const r = svg.getBoundingClientRect();
            const vx = ((e.clientX - r.left) / r.width) * W;
            const p = pts.reduce((best, q) => (Math.abs(xOf(q.t) - vx) < Math.abs(xOf(best.t) - vx) ? q : best), pts[0]);
            const px = xOf(p.t);
            xhair.setAttribute("x1", px);
            xhair.setAttribute("x2", px);
            xhair.setAttribute("visibility", "visible");
            tip.innerHTML = `<strong>${esc(p.v)} ${esc(card.dataset.unit)}</strong>${p.f ? ` ${p.f === "high" ? "▲ high" : "▼ low"}` : ""}<br><span class="ivx-sub">${esc(fmtTime(new Date(p.t).toISOString().slice(0, 19).replace("T", " ")))}</span>`;
            tip.style.display = "block";
            const left = (px / W) * r.width + svg.offsetLeft;
            tip.style.left = `${Math.min(Math.max(0, left - tip.offsetWidth / 2), card.clientWidth - tip.offsetWidth)}px`;
            tip.style.top = `${svg.offsetTop - tip.offsetHeight - 4}px`;
        };
        const leave = () => {
            tip.style.display = "none";
            xhair.setAttribute("visibility", "hidden");
        };
        svg.addEventListener("pointermove", move);
        svg.addEventListener("pointerdown", move);
        svg.addEventListener("pointerleave", leave);
    });
}

export async function openVitalsGraph(admissionId, { hours = 72, onChange = null } = {}) {
    openModal(true);
    const modal = $("ivxModal");
    modal.innerHTML = `<div class="ivx-body" style="padding:24px">Loading…</div>`;
    const res = await fetchVitalsHistory(admissionId, hours).catch(() => null);
    if (!$("ivxOverlay")?.classList.contains("open")) return;
    if (!res?.success) {
        modal.innerHTML = `${header("Vital signs")}<div class="ivx-body"><p>${esc(res?.message || "Could not load the vital signs.")}</p></div>`;
        modal.querySelector("[data-close]").onclick = closeModal;
        return;
    }
    const d = res.data;
    const s = d.summary;
    // NEWS2 as a measure of its own (5+ = key threshold).
    const valid = d.sets.filter((x) => !x.voided_at).map((x) => ({ ...x, news2_score: x.news2?.score ?? null,
        flags: { ...x.flags, ...(x.news2 && x.news2.score >= 5 ? { news2_score: "high" } : {}) } }));
    const normal = { ...d.normal, news2_score: [null, 5] };
    const NEWS = { key: "news2_score", label: "NEWS2", short: "NEWS2", unit: "" };
    const to = ms(d.now);
    const first = valid.length ? ms(valid[0].taken_at) : to - 3600e3;
    const from = hours > 0 ? to - hours * 3600e3 : Math.min(first, to - 3600e3);
    const user = getUser() || {};
    const canVoid = (x) => !x.voided_at && (x.recorded_by === user.id || ["admin", "charge_nurse"].includes(user.role));
    const canSchedule = ["admin", "doctor", "nurse", "charge_nurse"].includes(user.role);

    modal.innerHTML = `${header("Vital signs", s)}
        <div class="ivx-body">
            ${s ? `<div class="ivx-summary"><div>${statusBadge(s.status)}</div><div>${news2Badge(s.news2, { long: true })}${s.news2 && !s.news2.complete ? `<div class="ivx-sub">* partial: ${esc(s.news2.missing.length)} not measured</div>` : ""}</div>
                <div class="ivx-sub">Every ${s.schedule.every_hours} h${s.schedule.is_default ? " (ward default)" : ""} · ${s.sets_24h} set${s.sets_24h === 1 ? "" : "s"} in 24 h · SpO₂ scale ${s.spo2_scale}${s.spo2_scale === 2 ? ` (target 88–92%${s.scale_reason ? `: ${esc(s.scale_reason)}` : ""})` : ""}
                ${s.schedule_too_slow ? `<div class="ivx-warn">NEWS2 asks for vitals at least every ${s.news2_hours} h</div>` : ""}</div>
                <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
                    ${["admin", "doctor"].includes(user.role) ? `<button type="button" class="ivx-btn" id="ivxGScale">SpO₂ scale</button>` : ""}
                    ${canSchedule ? `<button type="button" class="ivx-btn" id="ivxGSched">Schedule</button>` : ""}
                    <button type="button" class="ivx-btn primary" id="ivxGRecord">Record vitals</button></div></div>` : `<p class="ivx-sub">This patient is no longer admitted; showing the stay's record.</p>`}
            <div class="ivx-ranges" role="group" aria-label="Period">
                ${[[24, "24 h"], [72, "3 days"], [168, "7 days"], [0, "Whole stay"]].map(([h, l]) => `<button type="button" class="ivx-btn ${h === hours ? "on" : ""}" data-hours="${h}" aria-pressed="${h === hours}">${l}</button>`).join("")}
                <span class="ivx-sub">Shaded = normal adult range · hollow dot = outside it</span>
            </div>
            <div class="ivx-charts">${[NEWS, ...MEASURES].map((m) => lineChart(valid, m, normal, from, to)).join("")}</div>
            <div class="ivx-tablewrap"><table class="ivx-table">
                <thead><tr><th>Taken</th><th>NEWS2</th>${MEASURES.map((m) => `<th>${m.short} <span class="ivx-sub">${m.unit}</span></th>`).join("")}<th>AVPU</th><th>By</th><th>Note</th><th><span class="ivx-sr">Actions</span></th></tr></thead>
                <tbody>${d.sets.length ? [...d.sets].reverse().map((x) => `
                    <tr class="${x.voided_at ? "void" : ""}" data-set="${x.id}">
                        <td>${esc(fmtTime(x.taken_at))}</td>
                        <td>${x.voided_at ? "—" : news2Badge(x.news2)}</td>
                        ${MEASURES.map((m) => `<td class="num">${valueOf(x, m.key) != null ? `${esc(valueOf(x, m.key))}${flagMark(flagOf(x, m.key))}` : "—"}</td>`).join("")}
                        <td>${esc(x.consciousness || "—")}</td><td>${esc(x.recorded_by_name || "—")}</td>
                        <td class="why" style="white-space:normal;min-width:120px">${x.voided_at ? `<em>Voided: ${esc(x.void_reason)} (${esc(x.voided_by_name || "")})</em>` : esc(x.notes || "")}</td>
                        <td>${canVoid(x) ? `<button type="button" class="ivx-btn" data-void="${x.id}">Void</button>` : ""}</td>
                    </tr>`).join("") : `<tr><td colspan="${MEASURES.length + 6}" class="ivx-sub" style="text-align:center;padding:16px">No vital signs recorded in this period.</td></tr>`}</tbody>
            </table></div>
        </div>`;
    modal.querySelector("[data-close]").onclick = closeModal;
    bindHover(modal);
    const reopen = (h = hours) => openVitalsGraph(admissionId, { hours: h, onChange });
    modal.querySelectorAll("[data-hours]").forEach((b) => (b.onclick = () => reopen(Number(b.dataset.hours))));
    if ($("ivxGRecord")) $("ivxGRecord").onclick = () => openRecordVitals(s, { onSaved: () => { onChange?.(); reopen(); } });
    if ($("ivxGSched")) $("ivxGSched").onclick = () => openVitalsSchedule(s, { onSaved: () => { onChange?.(); reopen(); } });
    if ($("ivxGScale")) $("ivxGScale").onclick = () => openSpo2Scale(s, { onSaved: () => { onChange?.(); reopen(); } });
    modal.querySelectorAll("[data-void]").forEach((b) => (b.onclick = () => {
        const row = b.closest("tr");
        if (row.nextElementSibling?.classList.contains("ivx-voidrow")) return;
        row.insertAdjacentHTML("afterend", `<tr class="ivx-voidrow"><td colspan="${MEASURES.length + 6}">
            <label class="ivx-sub" for="ivxVoidWhy">Why void this entry?</label>
            <input id="ivxVoidWhy" maxlength="255" placeholder="e.g. wrong patient, machine error">
            <button type="button" class="ivx-btn primary" id="ivxVoidGo">Void entry</button> <button type="button" class="ivx-btn" id="ivxVoidNo">Keep</button>
            <span class="ivx-err" id="ivxVoidErr"></span></td></tr>`);
        $("ivxVoidWhy").focus();
        $("ivxVoidNo").onclick = () => row.nextElementSibling.remove();
        $("ivxVoidGo").onclick = async () => {
            const why = $("ivxVoidWhy").value.trim();
            if (!why) {
                $("ivxVoidErr").textContent = "Give a reason.";
                return;
            }
            $("ivxVoidGo").disabled = true;
            const r = await voidVitals(Number(b.dataset.void), why).catch(() => null);
            if (!r?.success) {
                $("ivxVoidGo").disabled = false;
                $("ivxVoidErr").textContent = r?.message || "Could not void.";
                return;
            }
            showToast("Entry voided.");
            onChange?.();
            reopen();
        };
    }));
}

/* ---------------- ward board ---------------- */

let board = null;
let wardId = "";
let refreshTimer = null;
let seq = 0;

export function initInpatientVitals() {
    const page = $("ivbPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    page.classList.add("ivx-root");
    ensureRoot();
    wardId = "";
    $("ivbWard").addEventListener("change", (e) => {
        wardId = e.target.value;
        loadBoard();
    });
    $("ivbList").addEventListener("click", onBoardClick);
    loadBoard();
    // Due / overdue changes with the clock: refresh every minute while the board is open.
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (!$("ivbPage")) {
            clearInterval(refreshTimer);
            return;
        }
        if (!document.hidden && !$("ivxOverlay")?.classList.contains("open")) loadBoard(true);
    }, 60000);
}

async function loadBoard() {
    const n = ++seq;
    const res = await fetchVitalsBoard(wardId).catch(() => null);
    if (n !== seq || !$("ivbList")) return;
    if (!res?.success) {
        $("ivbList").innerHTML = `<div class="ivb-empty">Could not load the vital signs. ${esc(res?.message || "")}</div>`;
        return;
    }
    board = res.data;
    wardId = String(board.ward_id);
    renderBoard();
}

function renderBoard() {
    $("ivbWard").innerHTML = board.wards.map((w) => `<option value="${w.id}" ${w.id === board.ward_id ? "selected" : ""}>${esc(w.name)}${w.mine ? " (my ward)" : ""}</option>`).join("");
    const c = board.counts;
    $("ivbCounts").innerHTML = `
        <span class="ivb-count"><b>${board.patients.filter((p) => ["medium", "high"].includes(p.news2?.risk)).length}</b>NEWS2 5+</span>
        <span class="ivb-count"><b>${c.overdue}</b>overdue</span>
        <span class="ivb-count"><b>${c.due}</b>due now</span>
        <span class="ivb-count"><b>${c.due_soon}</b>due soon</span>`;
    if (!board.patients.length) {
        $("ivbList").innerHTML = `<div class="ivb-empty">No patients in this ward.</div>`;
        return;
    }
    const role = getUser()?.role;
    const canSchedule = ["admin", "doctor", "nurse", "charge_nurse"].includes(role);
    const canOrders = ["admin", "doctor", "nurse", "charge_nurse", "clinician", "pharmacist"].includes(role);
    // Highest NEWS2 first, then the most overdue.
    const order = { overdue: 0, due: 1, due_soon: 2, ok: 3 };
    const risk = { high: 0, medium: 1, low_medium: 2, low: 3 };
    const rows = [...board.patients].sort((a, b) => (risk[a.news2?.risk] ?? 4) - (risk[b.news2?.risk] ?? 4)
        || order[a.status.state] - order[b.status.state] || b.status.minutes - a.status.minutes);
    $("ivbList").innerHTML = `<table class="ivb-table">
        <thead><tr><th>Bed</th><th>Patient</th><th>NEWS2</th><th>Status</th><th>Latest vital signs</th><th class="ivb-hide-sm">Every</th><th><span class="ivx-sr">Actions</span></th></tr></thead>
        <tbody>${rows.map((p) => `
            <tr data-adm="${p.admission_id}">
                <td><div class="ivb-bed">${esc(p.room)} · ${esc(p.bed)}</div></td>
                <td><strong>${esc(p.patient_name)}</strong><div class="ivb-sub">${esc([p.nurse_name ? `RN ${p.nurse_name}` : "", p.cna_name ? `CNA ${p.cna_name}` : ""].filter(Boolean).join(" · ") || "No nurse assigned")}</div></td>
                <td>${p.news2 ? news2Badge(p.news2) : `<span class="ivb-sub">—</span>`}</td>
                <td>${statusBadge(p.status)}${p.schedule_too_slow ? `<div class="ivx-warn">NEWS2: every ${p.news2_hours} h${canSchedule ? ` <button type="button" class="ivx-btn" data-act="apply" title="Set the schedule to every ${p.news2_hours} h">Apply</button>` : ""}</div>` : ""}</td>
                <td>${valuesLine(p.latest)}${p.latest ? `<div class="ivb-sub">${esc(fmtTime(p.latest.taken_at))} · ${esc(p.latest.recorded_by_name || "")}</div>` : ""}</td>
                <td class="ivb-hide-sm">${p.schedule.every_hours} h${p.schedule.is_default ? "" : " ★"}</td>
                <td><div class="ivb-actions">
                    <button type="button" class="ivx-btn primary" data-act="record">Record</button>
                    <button type="button" class="ivx-btn" data-act="graph">Graph</button>
                    ${canOrders ? `<button type="button" class="ivx-btn" data-act="orders" aria-label="Medicine orders for ${esc(p.patient_name)}">Orders</button>` : ""}
                    ${canOrders ? `<button type="button" class="ivx-btn" data-act="mar" aria-label="Medicine administration record for ${esc(p.patient_name)}">MAR</button>` : ""}
                    ${canSchedule ? `<button type="button" class="ivx-btn" data-act="schedule" aria-label="Schedule for ${esc(p.patient_name)}">Schedule</button>` : ""}
                </div></td>
            </tr>`).join("")}</tbody></table>
        <p class="ivb-sub" style="margin:8px 12px">★ = schedule set for this patient (otherwise the ward default).</p>`;
}

function onBoardClick(e) {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    const adm = Number(e.target.closest("[data-adm]").dataset.adm);
    const p = board.patients.find((x) => x.admission_id === adm);
    if (act === "record") openRecordVitals(p, { onSaved: loadBoard });
    else if (act === "graph") openVitalsGraph(adm, { onChange: loadBoard });
    else if (act === "orders") import("../med-orders/med-orders.js?v=2").then((m) => m.openMedOrders(adm));
    else if (act === "mar") import("../mar/mar.js?v=2").then((m) => m.openMar(adm));
    else if (act === "schedule") openVitalsSchedule(p, { onSaved: loadBoard });
    else if (act === "apply") {
        setVitalsSchedule(adm, p.news2_hours, `NEWS2 ${p.news2.score} (${p.news2.risk_label})`).then((r) => {
            showToast(r?.message || "Could not change the schedule.", r?.success ? "success" : "error");
            if (r?.success) loadBoard();
        });
    }
}
