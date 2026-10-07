import { fetchMarBoard, fetchMar, giveDose, holdDose, refuseDose, voidDose, recheckPain, fetchSupply, fetchSupplySettings, saveSupplySettings } from "./mar.service.js?v=3";
import { getUser } from "../../core/session.js?v=2";
import { showToast } from "../../core/toast.js";
import { systemNow, toDateTimeInput } from "../../core/timezone.js";

/*
 * Medicine administration record (MAR).
 *  - openMar(admissionId): one patient's doses for a shift -- due, late, given (time +
 *    initials), held, refused -- and recording them. High-alert medicines need a second nurse.
 *  - Medicine Rounds (tab "mar"): the current shift for a ward / my patients: what is late and due.
 */

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (dt) => String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
/** "8:05 AM" */
const hm = (dt) => {
    const m = parts(dt);
    if (!m) return "";
    const h = Number(m[4]);
    return `${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
};
/** "Oct 7, 8:05 AM" */
const fmt = (dt) => {
    const m = parts(dt);
    return m ? `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${hm(dt)}` : "";
};
const dayLabel = (d) => {
    const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${MONTHS[m[2] - 1]} ${Number(m[3])}` : "";
};
/** Minutes between two "YYYY-MM-DD HH:MM:SS" (b - a). */
const minutesBetween = (a, b) => {
    const t = (s) => { const m = parts(s); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : NaN; };
    return Math.round((t(b) - t(a)) / 60000);
};
const span = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`);

const me = () => getUser() || {};
const canVoid = (rec) => rec.recorded_by === Number(me().id) || ["admin", "charge_nurse"].includes(me().role);

/* What each dose state looks like: icon + word, never color alone. */
const SLOT = {
    late: ["late", "⏰", "Late"], due: ["due", "●", "Due"], upcoming: ["up", "○", "Coming"],
    given: ["given", "✓", "Given"], held: ["held", "⏸", "Held"], refused: ["refused", "✕", "Refused"], missed: ["missed", "—", "Not given"],
};

const CSS = `
#marxOverlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4150; display: none; align-items: flex-start; justify-content: center; padding: 4vh 16px 16px; overflow-y: auto; }
#marxOverlay.open { display: flex; }
#marxModal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 980px; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.3); font-size: 13.5px; min-width: 0; }
.marx-head { display: flex; justify-content: space-between; gap: 10px; padding: 16px 20px 6px; }
.marx-head h2 { margin: 0; font-size: 18px; }
.marx-x { border: 0; background: none; color: var(--text-muted); font-size: 22px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 6px; }
.marx-x:hover { background: var(--bg-surface-alt); color: var(--text-primary); }
.marx-body { padding: 4px 20px 18px; }
.marx-sub { color: var(--text-muted); font-size: 12px; }
.marx-allergies { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 6px 0 10px; }
.marx-allergy { background: #fee2e2; color: #991b1b; border-radius: 10px; padding: 2px 9px; font-size: 12px; font-weight: 700; }
:root[data-theme="dark"] .marx-allergy { background: #7f1d1d; color: #fecaca; }
.marx-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 6px 11px; font-weight: 600; font-size: 12.5px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.marx-btn:hover { background: var(--bg-surface-alt); }
.marx-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.marx-btn.primary:hover { background: var(--accent-hover); }
.marx-btn.danger { color: #b91c1c; }
.marx-btn.small { padding: 4px 9px; font-size: 12px; }
.marx-btn.on { background: var(--accent-light); border-color: var(--accent); color: var(--accent-text); }
.marx-btn:disabled { opacity: .55; cursor: default; }
.marx-btn:focus-visible, .marx-slot:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.marx-shift { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 4px 0 8px; }
.marx-shift strong { font-size: 14px; }
.marx-counts { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 12px; }
.marx-count { border: 1px solid var(--border-color); border-radius: 10px; padding: 3px 10px; font-size: 12.5px; }
.marx-count b { font-variant-numeric: tabular-nums; margin-right: 3px; }
.marx-count.late { border-color: #dc2626; color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .marx-count.late { color: #fca5a5; }
.marx-row { border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
.marx-row.haslate { border-left: 4px solid #dc2626; }
.marx-row.off { opacity: .8; }
.marx-row-top { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.marx-drug { font-weight: 700; font-size: 14px; }
.marx-pills { display: flex; gap: 4px; flex-wrap: wrap; align-items: flex-start; }
.marx-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.marx-pill.stat { background: #dc2626; color: #fff; border-color: transparent; }
.marx-pill.ha { background: #fef3c7; color: #92400e; border-color: transparent; }
.marx-pill.wait { background: #fef3c7; color: #92400e; border-color: transparent; }
:root[data-theme="dark"] .marx-pill.ha, :root[data-theme="dark"] .marx-pill.wait { background: #78350f; color: #fde68a; }
.marx-slots { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.marx-slot { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 9px; padding: 5px 10px; min-width: 104px; text-align: left; font: inherit; font-size: 12px; cursor: pointer; line-height: 1.35; }
.marx-slot .t { font-weight: 700; font-size: 13px; font-variant-numeric: tabular-nums; }
.marx-slot .s { display: block; font-weight: 600; }
.marx-slot.sel { box-shadow: 0 0 0 2px var(--accent); }
.marx-slot.late { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.marx-slot.due { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
.marx-slot.up { color: var(--text-muted); }
.marx-slot.given { background: #dcfce7; border-color: #86efac; color: #166534; }
.marx-slot.held, .marx-slot.refused { background: var(--bg-surface-alt); color: var(--text-primary); border-style: dashed; }
.marx-slot.missed { background: var(--bg-surface-alt); color: var(--text-muted); border-style: dotted; }
:root[data-theme="dark"] .marx-slot.late { background: #7f1d1d; border-color: #b91c1c; color: #fecaca; }
:root[data-theme="dark"] .marx-slot.due { background: #78350f; border-color: #b45309; color: #fde68a; }
:root[data-theme="dark"] .marx-slot.given { background: #14532d; border-color: #15803d; color: #bbf7d0; }
.marx-prn { margin-top: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; }
.marx-panel { margin-top: 8px; padding: 10px 12px; background: var(--bg-surface-alt); border-radius: 8px; display: grid; gap: 8px; }
.marx-panel label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.marx-panel input, .marx-panel select, .marx-panel textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.marx-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
@media (max-width: 640px) { .marx-grid { grid-template-columns: 1fr; } }
.marx-witness { border: 1px solid #f59e0b; border-radius: 8px; padding: 8px 10px; background: var(--bg-surface); }
.marx-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.marx-err { color: #dc2626; font-size: 12px; }
.marx-void { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.marx-void s { color: var(--text-muted); }
.marx-score { display: flex; gap: 4px; flex-wrap: wrap; }
.marx-score button { min-width: 34px; padding: 6px 0; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 7px; font: inherit; font-weight: 700; font-variant-numeric: tabular-nums; cursor: pointer; }
.marx-score button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
.marx-score button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.marx-scorehint { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); max-width: 420px; }
.marx-pain { font-weight: 600; }
.marx-recheck { display: block; font-weight: 600; }
.marx-recheck.due, .marx-recheck.overdue { color: #b91c1c; }
:root[data-theme="dark"] .marx-recheck.due, :root[data-theme="dark"] .marx-recheck.overdue { color: #fca5a5; }
.marx-confirm { border: 1px solid #f59e0b; border-radius: 8px; padding: 8px 10px; background: var(--bg-surface); }
.marx-supply { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; background: var(--bg-surface); }
.marx-supply .row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 8px 12px; }
@media (max-width: 640px) { .marx-supply .row { grid-template-columns: 1fr; } }
.marx-price { font-size: 12px; color: var(--text-muted); margin-top: 4px; font-variant-numeric: tabular-nums; }
.marx-legend { display: flex; gap: 10px; flex-wrap: wrap; font-size: 11.5px; color: var(--text-muted); margin-top: 10px; }
.marx-empty { color: var(--text-muted); padding: 12px 0; }
.mrb-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1280px; min-width: 0; }
.mrb-page h1 { margin: 0; font-size: 22px; }
.mrb-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 820px; line-height: 1.5; }
.mrb-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.mrb-bar select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.mrb-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.mrb-table { width: 100%; border-collapse: collapse; }
.mrb-table th, .mrb-table td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.mrb-table th { color: var(--text-muted); font-size: 12px; font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.mrb-table td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.mrb-table tr:last-child td { border-bottom: 0; }
.mrb-table tr.mine td:first-child { box-shadow: inset 3px 0 0 var(--accent); }
.mrb-late { display: inline-block; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: #fee2e2; color: #991b1b; white-space: nowrap; }
.mrb-due { display: inline-block; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: #fef3c7; color: #92400e; white-space: nowrap; }
:root[data-theme="dark"] .mrb-late { background: #7f1d1d; color: #fecaca; }
:root[data-theme="dark"] .mrb-due { background: #78350f; color: #fde68a; }
.mrb-empty { padding: 32px 16px; text-align: center; color: var(--text-muted); }
@media (max-width: 700px) { .mrb-page { padding: 16px; } .mrb-hide-sm { display: none; } }
`;

function ensureStyles() {
    if (!$("marx-style")) {
        const st = document.createElement("style");
        st.id = "marx-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}

function ensureRoot() {
    ensureStyles();
    let root = $("marxOverlay");
    if (!root) {
        root = document.createElement("div");
        root.id = "marxOverlay";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-labelledby", "marxTitle");
        root.innerHTML = `<div id="marxModal"></div>`;
        root.addEventListener("click", (e) => {
            if (e.target === root) close();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && root.classList.contains("open")) close();
        });
        document.body.appendChild(root);
    }
    return root;
}

function close() {
    $("marxOverlay")?.classList.remove("open");
    if (cur) cur.onChange?.();
    cur = null;
}

/* ---------------- one patient's MAR ---------------- */

let cur = null;   // { admissionId, data, onChange, date, shiftId, open: {row, slot} }

export async function openMar(admissionId, { onChange = null } = {}) {
    ensureRoot().classList.add("open");
    cur = { admissionId, data: null, onChange, date: "", shiftId: "", open: null };
    $("marxModal").innerHTML = `<div class="marx-body" style="padding:24px">Loading…</div>`;
    await reload();
}

async function reload(message) {
    if (message) showToast(message);
    const c = cur;
    const res = await fetchMar(c.admissionId, c.date, c.shiftId).catch(() => null);
    if (c !== cur) return;
    if (!res?.success) {
        $("marxModal").innerHTML = `<div class="marx-head"><h2 id="marxTitle">Medicine administration record</h2><button type="button" class="marx-x" data-close aria-label="Close">×</button></div>
            <div class="marx-body"><p>${esc(res?.message || "Could not load the MAR.")}</p></div>`;
        $("marxModal").querySelector("[data-close]").onclick = close;
        return;
    }
    cur.data = res.data;
    render();
}

function slotLabel(s, now) {
    const [cls, icon, word] = SLOT[s.state] || SLOT.upcoming;
    let detail = word;
    if (s.state === "late") detail = `${word} · ${span(Math.max(0, minutesBetween(s.at, now)))}`;
    else if (s.state === "given" && s.record) detail = `${word} ${hm(s.record.given_at)} · ${s.record.initials}${s.record.witness_initials ? `/${s.record.witness_initials}` : ""}${s.given_late ? " · late" : ""}`;
    else if ((s.state === "held" || s.state === "refused") && s.record) detail = `${word} · ${s.record.initials}`;
    return { cls, text: `<span class="t">${esc(hm(s.at))}</span>${s.carried ? ` <span class="marx-sub">${esc(dayLabel(s.at))}</span>` : ""}<span class="s">${icon} ${esc(detail)}</span>`, aria: `${hm(s.at)}: ${detail}` };
}

function rowHtml(row, i) {
    const o = row.order;
    const d = cur.data;
    const pills = [
        o.is_stat ? `<span class="marx-pill stat">STAT</span>` : "",
        o.needs_witness ? `<span class="marx-pill ha" title="A second nurse must check and sign">${o.high_alert ? "High-alert" : "Controlled"} · 2nd nurse</span>` : "",
        o.order_type === "prn" ? `<span class="marx-pill">As needed</span>` : "",
        o.pain ? `<span class="marx-pill" title="Pain score before giving; recheck 30–60 min after">Pain score</span>` : "",
        o.dd ? `<span class="marx-pill ha" title="Recorded in the dangerous-drugs register">DD register</span>` : "",
        o.state === "pending" ? `<span class="marx-pill wait">⏳ Waiting for pharmacy</span>` : "",
        o.state === "stopped" ? `<span class="marx-pill">Stopped</span>` : "",
        o.state === "ended" ? `<span class="marx-pill">Ended</span>` : "",
    ].join("");
    const hasLate = row.slots.some((s) => s.state === "late");
    let body = "";
    if (o.state === "pending") {
        const ov = row.overrides || [];
        body = ov.length
            ? `<div class="marx-prn"><span class="marx-sub">Not verified yet — taken out of the cabinet with an override:</span>${ov.map((w, k) => d.can_give
                ? `<button type="button" class="marx-btn primary" data-ovr="${i}:${k}">Give (taken ${esc(hm(w.withdrawn_at))} by ${esc(w.withdrawn_by_name || "")})</button>`
                : `<span class="marx-sub">taken ${esc(hm(w.withdrawn_at))} by ${esc(w.withdrawn_by_name || "")}</span>`).join("")}</div>`
            : `<div class="marx-sub" style="margin-top:6px">Can't be given until the pharmacy verifies it (in an emergency: Ward Cabinet → take with override).</div>`;
    } else if (o.order_type === "prn") {
        const p = row.prn || {};
        const bits = [
            p.last_given_at ? `Last given ${fmt(p.last_given_at)}` : "Not given yet",
            p.max_per_day ? `${p.count_24h} of ${p.max_per_day} in 24 h` : `${p.count_24h} in 24 h`,
            p.min_hours ? `at least ${p.min_hours} h apart` : "",
            p.next_allowed_at ? `next from ${fmt(p.next_allowed_at)}` : "",
        ].filter(Boolean).join(" · ");
        body = `<div class="marx-prn"><span>${esc(bits)}</span>
            ${d.can_give && o.state === "active" ? `<button type="button" class="marx-btn ${p.blocked ? "" : "primary"}" data-prn="${i}" ${p.blocked ? `disabled title="${esc(p.blocked)}"` : ""}>Give dose</button>${p.blocked ? `<span class="marx-sub">${esc(p.blocked)}</span>` : ""}` : ""}</div>
            ${row.given.length ? `<div class="marx-slots">${row.given.map((g, k) => `<button type="button" class="marx-slot given" data-given="${i}:${k}" aria-label="Given ${esc(hm(g.given_at))} by ${esc(g.recorded_by_name || g.initials)}${g.recheck_state ? `, ${esc(recheckText(g))}` : ""}"><span class="t">${esc(hm(g.given_at))}</span><span class="s">✓ Given · ${esc(g.initials)}${g.witness_initials ? `/${esc(g.witness_initials)}` : ""}</span>${recheckLine(g)}</button>`).join("")}</div>` : ""}`;
    } else if (row.slots.length) {
        body = `<div class="marx-slots" role="list">${row.slots.map((s, k) => {
            const l = slotLabel(s, d.now);
            const sel = cur.open && cur.open.row === i && cur.open.slot === k;
            return `<button type="button" role="listitem" class="marx-slot ${l.cls} ${sel ? "sel" : ""}" data-slot="${i}:${k}" aria-label="${esc(l.aria)}" aria-expanded="${sel}">${l.text}</button>`;
        }).join("")}</div>`;
    } else {
        body = `<div class="marx-sub" style="margin-top:6px">No doses in this shift.</div>`;
    }
    const voided = row.voided.length ? `<div class="marx-void">${row.voided.map((v) => `Voided: <s>${esc(v.status)} ${esc(hm(v.given_at || v.scheduled_at || v.recorded_at))} · ${esc(v.initials)}</s> — ${esc(v.void_reason)} (${esc(v.voided_by_name || "")}, ${esc(fmt(v.voided_at))})`).join("<br>")}</div>` : "";
    return `<div class="marx-row ${hasLate ? "haslate" : ""} ${["stopped", "ended"].includes(o.state) ? "off" : ""}" data-row="${i}">
        <div class="marx-row-top">
            <div><div class="marx-drug">${esc(o.drug_name)}</div>
                <div>${esc(`${o.dose_text} ${o.dose_unit} · ${o.route_label} · ${o.how}`)}</div>
                ${o.instructions ? `<div class="marx-sub">Instructions: ${esc(o.instructions)}</div>` : ""}
                ${o.state === "stopped" ? `<div class="marx-sub">Stopped ${esc(fmt(o.discontinued_at))}${o.discontinue_reason ? `: ${esc(o.discontinue_reason)}` : ""}</div>` : ""}</div>
            <div class="marx-pills">${pills}</div>
        </div>
        ${body}
        <div class="marx-panel-box"></div>
        ${voided}
    </div>`;
}

function render() {
    const d = cur.data;
    const a = d.admission;
    const s = d.shift;
    const c = d.counts;
    const role = me().role;
    $("marxModal").innerHTML = `
        <div class="marx-head"><div><h2 id="marxTitle">MAR · ${esc(a.patient_name)}</h2>
            <div class="marx-sub">${esc([a.ward, `${a.room} · Bed ${a.bed}`, a.age ? `${a.age}y` : "", a.sex].filter(Boolean).join(" · "))}${a.active ? "" : " · discharged"}</div></div>
            <div style="display:flex;gap:6px;align-items:flex-start">
                ${["admin", "doctor", "pharmacist", "nurse", "charge_nurse", "clinician"].includes(role) ? `<button type="button" class="marx-btn" data-orders>Orders</button>` : ""}
                <button type="button" class="marx-x" data-close aria-label="Close">×</button></div></div>
        <div class="marx-body">
            <div class="marx-allergies"><strong>Allergies:</strong> ${d.allergies.length ? d.allergies.map((al) => `<span class="marx-allergy">${esc(al.name)}${al.reaction ? ` — ${esc(al.reaction)}` : ""}</span>`).join("") : `<span class="marx-sub">No known allergies recorded</span>`}</div>
            <div class="marx-shift">
                <button type="button" class="marx-btn" data-shift="prev" ${s.prev ? "" : "disabled"} aria-label="Previous shift">‹</button>
                <div><strong>${esc(s.name)} · ${esc(dayLabel(s.date))}</strong> <span class="marx-sub">${esc(hm(s.start_at))} – ${esc(hm(s.end_at))}${s.is_current ? " · now" : ""}${s.nurse_name ? ` · Nurse: ${esc(s.nurse_name)}` : " · no nurse assigned"}</span></div>
                <button type="button" class="marx-btn" data-shift="next" ${s.next ? "" : "disabled"} aria-label="Next shift">›</button>
                ${s.is_current ? "" : `<button type="button" class="marx-btn" data-shift="now">Now</button>`}
            </div>
            <div class="marx-counts">
                ${c.late ? `<span class="marx-count late"><b>${c.late}</b>⏰ late</span>` : ""}
                <span class="marx-count"><b>${c.due}</b>due now</span>
                <span class="marx-count"><b>${c.upcoming}</b>coming</span>
                <span class="marx-count"><b>${c.given + c.prn_given}</b>given</span>
                ${c.held ? `<span class="marx-count"><b>${c.held}</b>held</span>` : ""}
                ${c.refused ? `<span class="marx-count"><b>${c.refused}</b>refused</span>` : ""}
                ${c.missed ? `<span class="marx-count"><b>${c.missed}</b>not given</span>` : ""}
                ${c.pending ? `<span class="marx-count"><b>${c.pending}</b>waiting for pharmacy</span>` : ""}
                ${c.recheck ? `<span class="marx-count late"><b>${c.recheck}</b>⏰ pain recheck due</span>` : ""}
                ${d.charges?.count ? `<span class="marx-count" title="Doses taken from stock and charged to the patient this stay"><b>${peso(d.charges.total)}</b>medicines charged this stay</span>` : ""}
            </div>
            ${d.rows.length ? d.rows.map(rowHtml).join("") : `<div class="marx-empty">No medicines in this shift.</div>`}
            ${d.can_give ? "" : `<p class="marx-sub">${a.active ? "View only — doses are recorded by the patient's nurse or a nurse of this ward." : "View only — the patient was discharged."}</p>`}
            <div class="marx-legend"><span>⏰ Late (over ${d.rules.late_min} min after its time; ${d.rules.stat_late_min} for STAT)</span><span>● Due (from ${d.rules.early_min} min before)</span><span>○ Coming</span><span>✓ Given (time · initials, /2nd nurse)</span><span>⏸ Held</span><span>✕ Refused</span><span>Pain: score before → recheck 30–60 min after</span></div>
        </div>`;
    const m = $("marxModal");
    m.querySelector("[data-close]").onclick = close;
    m.querySelector("[data-orders]")?.addEventListener("click", () => {
        const id = cur.admissionId;
        close();
        import("../med-orders/med-orders.js?v=6").then((x) => x.openMedOrders(id));
    });
    m.onclick = onModalClick;
    if (cur.open) {
        const { row, slot, prnGive, given } = cur.open;
        cur.open = null;
        if (prnGive != null) openPrn(row);
        else if (given != null) openGiven(row, given);
        else if (slot != null) openSlot(row, slot);
    }
}

function onModalClick(e) {
    const sh = e.target.closest("[data-shift]")?.dataset.shift;
    if (sh) {
        const s = cur.data.shift;
        const target = sh === "now" ? null : s[sh];
        cur.date = target ? target.date : "";
        cur.shiftId = target ? target.id : "";
        cur.open = null;
        reload();
        return;
    }
    const sl = e.target.closest("[data-slot]")?.dataset.slot;
    if (sl) {
        const [r, k] = sl.split(":").map(Number);
        openSlot(r, k);
        return;
    }
    const ovr = e.target.closest("[data-ovr]")?.dataset.ovr;
    if (ovr) {
        const [r, k] = ovr.split(":").map(Number);
        const row = cur.data.rows[r];
        const w = row.overrides[k];
        doseForm(panelBox(r), row, w.slot_at ? { at: w.slot_at } : null, "given", false, true);
        return;
    }
    const prn = e.target.closest("[data-prn]")?.dataset.prn;
    if (prn != null) {
        openPrn(Number(prn));
        return;
    }
    const gv = e.target.closest("[data-given]")?.dataset.given;
    if (gv) {
        const [r, k] = gv.split(":").map(Number);
        openGiven(r, k);
    }
}

function panelBox(r) {
    const row = $("marxModal").querySelector(`[data-row="${r}"]`);
    $("marxModal").querySelectorAll(".marx-panel-box").forEach((b) => { b.innerHTML = ""; });
    $("marxModal").querySelectorAll(".marx-slot.sel").forEach((b) => { b.classList.remove("sel"); b.setAttribute("aria-expanded", "false"); });
    return row.querySelector(".marx-panel-box");
}

function recordDetail(rec) {
    const who = `${rec.recorded_by_name || rec.initials} (${rec.initials})`;
    const lines = [];
    if (rec.status === "given") {
        lines.push(`<strong>Given ${esc(fmt(rec.given_at))}</strong> by ${esc(who)}${rec.given_late ? " · <strong>late</strong>" : ""}`);
        if (rec.witness_name) lines.push(`Second nurse: ${esc(rec.witness_name)} (${esc(rec.witness_initials)})`);
        if (rec.dose_text) lines.push(`${esc(`${rec.dose_text} ${rec.dose_unit} ${rec.route}`)}`);
        if (rec.reason) lines.push(`For: ${esc(rec.reason)}`);
        if (rec.pain_before != null) lines.push(`<span class="marx-pain">Pain before: ${rec.pain_before}/10</span>${rec.pain_after != null ? ` · <span class="marx-pain">after: ${rec.pain_after}/10</span> (${esc(fmt(rec.pain_after_at))}${rec.pain_after_by_name ? `, ${esc(rec.pain_after_by_name)}` : ""}${rec.pain_after_note ? ` — ${esc(rec.pain_after_note)}` : ""})` : ` · ${esc(recheckText(rec).replace(/^pain \d+ · /, ""))}`}`);
        if (rec.supply_source) lines.push(supplyText(rec));
        if (rec.dd_entry_no) lines.push(`DD register entry #${rec.dd_entry_no}${rec.wasted ? ` · wasted ${esc(rec.wasted)}${rec.waste_note ? ` (${esc(rec.waste_note)})` : ""}` : ""}`);
    } else {
        lines.push(`<strong>${rec.status === "held" ? "Held" : "Refused"}</strong> — recorded by ${esc(who)} · ${esc(fmt(rec.recorded_at))}`);
        lines.push(`Reason: ${esc(rec.reason)}`);
    }
    if (rec.note) lines.push(`Note: ${esc(rec.note)}`);
    if (rec.status === "given" && rec.recorded_at && rec.given_at && minutesBetween(rec.given_at, rec.recorded_at) > 15) lines.push(`<span class="marx-sub">Recorded ${esc(fmt(rec.recorded_at))}</span>`);
    return `<div>${lines.join("<br>")}</div>`;
}

/** A recorded entry: details + void. */
function showRecord(box, rec) {
    const canRecheck = cur.data.can_give && rec.recheck_state && rec.recheck_state !== "done";
    box.innerHTML = `<div class="marx-panel">${recordDetail(rec)}
        ${canRecheck ? `<div class="marx-witness"><strong>Pain recheck</strong> <span class="marx-sub">— score the pain again ${rec.recheck_state === "pending" ? `from ${esc(hm(rec.recheck_due_at))}` : "now"} (30–60 min after the dose).</span>
            <div style="margin-top:6px">${scorePicker("marxAfter")}</div>
            <label for="marxAfterNote" style="margin-top:6px">Note (optional)</label><input id="marxAfterNote" maxlength="255" placeholder="e.g. resting comfortably">
            <div style="margin-top:6px"><button type="button" class="marx-btn primary" data-v="recheck">Record recheck</button></div></div>` : ""}
        ${cur.data.can_give && canVoid(rec) ? `<div><button type="button" class="marx-btn small danger" data-v="void">Void (entered in error)…</button></div>` : ""}
        <div data-v="voidbox"></div><div class="marx-err" role="alert" data-v="err"></div></div>`;
    if (canRecheck) {
        bindScore(box, "marxAfter");
        box.querySelector('[data-v="recheck"]').onclick = async (ev) => {
            const score = box.querySelector("#marxAfter").dataset.value;
            if (score === undefined || score === "") {
                box.querySelector('[data-v="err"]').textContent = "Choose the pain score now.";
                return;
            }
            ev.target.disabled = true;
            const r = await recheckPain(rec.id, Number(score), ($("marxAfterNote").value || "").trim()).catch(() => null);
            ev.target.disabled = false;
            if (!r?.success) {
                box.querySelector('[data-v="err"]').textContent = r?.message || "Could not save.";
                return;
            }
            reload(r.message);
        };
    }
    const btn = box.querySelector('[data-v="void"]');
    if (!btn) return;
    btn.onclick = () => {
        btn.remove();
        box.querySelector('[data-v="voidbox"]').innerHTML = `<label for="marxVoidWhy">Why is it wrong? The entry stays, struck through, and the dose is due again.</label>
            <input id="marxVoidWhy" maxlength="255" placeholder="e.g. wrong patient, wrong time">
            <div style="display:flex;gap:6px;margin-top:6px"><button type="button" class="marx-btn danger" data-v="voidgo">Void entry</button><button type="button" class="marx-btn" data-v="cancel">Cancel</button></div>
            <div class="marx-err" role="alert"></div>`;
        $("marxVoidWhy").focus();
        box.querySelector('[data-v="cancel"]').onclick = () => showRecord(box, rec);
        box.querySelector('[data-v="voidgo"]').onclick = async (ev) => {
            const why = $("marxVoidWhy").value.trim();
            if (!why) {
                box.querySelector(".marx-err").textContent = "Give a reason.";
                return;
            }
            ev.target.disabled = true;
            const r = await voidDose(rec.id, why).catch(() => null);
            ev.target.disabled = false;
            if (!r?.success) {
                box.querySelector(".marx-err").textContent = r?.message || "Could not void.";
                return;
            }
            reload(r.message);
        };
    };
}

function openGiven(r, k) {
    const rec = cur.data.rows[r].given[k];
    const box = panelBox(r);
    showRecord(box, rec);
}

function openSlot(r, k) {
    const d = cur.data;
    const row = d.rows[r];
    const s = row.slots[k];
    const box = panelBox(r);
    const btn = $("marxModal").querySelector(`[data-slot="${r}:${k}"]`);
    btn?.classList.add("sel");
    btn?.setAttribute("aria-expanded", "true");
    if (s.record) {
        showRecord(box, s.record);
        return;
    }
    if (s.state === "missed") {
        box.innerHTML = `<div class="marx-panel"><div>Not recorded. The order was stopped ${esc(fmt(row.order.discontinued_at))}.</div></div>`;
        return;
    }
    if (!d.can_give || row.order.state !== "active") {
        box.innerHTML = `<div class="marx-panel"><div>${esc(hm(s.at))} — ${esc((SLOT[s.state] || SLOT.upcoming)[2])}. ${d.can_give ? "" : "View only."}</div></div>`;
        return;
    }
    const early = minutesBetween(d.now, s.at) > d.rules.early_min;   // more than an hour ahead: only "held"
    doseForm(box, row, s, early ? "held" : "given", early);
}

function openPrn(r) {
    const row = cur.data.rows[r];
    const box = panelBox(r);
    doseForm(box, row, null, "given", false);
}

const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function supplyText(rec) {
    if (rec.supply_source === "own") return "From the patient's own supply (not charged)";
    if (rec.supply_source === "opened") return "From the patient's opened container (charged with the first dose)";
    if (rec.supply_source === "cabinet") {
        const what = `Taken out of the ward cabinet: ${Number(rec.stock_quantity)}`;
        return rec.charge ? `${what} · ${peso(rec.charge.amount)} ${rec.charge.status === "voided" ? "charge voided" : "charged"}` : `${what} · not charged (no selling price)`;
    }
    const qty = `${Number(rec.stock_quantity)} from ${esc(rec.warehouse_name || "stock")}`;
    if (!rec.charge) return `Taken: ${qty} · not charged (no selling price)`;
    return `Taken: ${qty} · ${peso(rec.charge.amount)} ${rec.charge.status === "voided" ? "charge voided" : "charged"}`;
}

/** 0-10 pain score buttons; the chosen value is kept in data-value on the group. */
function scorePicker(id, labelledBy = "") {
    return `<div class="marx-score" id="${id}" role="radiogroup" ${labelledBy ? `aria-labelledby="${labelledBy}"` : `aria-label="Pain score 0 to 10"`}>${Array.from({ length: 11 }, (_, n) => `<button type="button" role="radio" aria-checked="false" aria-pressed="false" data-score="${n}">${n}</button>`).join("")}</div>
        <div class="marx-scorehint"><span>0 no pain</span><span>5 moderate</span><span>10 worst</span></div>`;
}
function bindScore(scope, id) {
    const group = scope.querySelector(`#${id}`);
    group.onclick = (e) => {
        const b = e.target.closest("[data-score]");
        if (!b) return;
        group.dataset.value = b.dataset.score;
        group.querySelectorAll("[data-score]").forEach((x) => { const on = x === b; x.setAttribute("aria-pressed", String(on)); x.setAttribute("aria-checked", String(on)); });
    };
}
function recheckText(g) {
    if (g.recheck_state === "done") return `pain ${g.pain_before} → ${g.pain_after}`;
    if (g.recheck_state === "pending") return `pain ${g.pain_before} · recheck ${hm(g.recheck_due_at)}`;
    if (g.recheck_state === "due") return `pain ${g.pain_before} · recheck due now`;
    if (g.recheck_state === "overdue") return `pain ${g.pain_before} · recheck overdue`;
    return "";
}
function recheckLine(g) {
    if (!g.recheck_state) return "";
    const icon = { done: "", pending: "◔ ", due: "⏰ ", overdue: "⏰ " }[g.recheck_state];
    return `<span class="marx-recheck ${g.recheck_state}">${icon}${esc(recheckText(g))}</span>`;
}

/** Record a dose: given (time, note, second nurse) / held (reason) / refused (reason). */
function doseForm(box, row, slot, mode, holdOnly, givenOnly = false) {
    const o = row.order;
    const d = cur.data;
    const reasons = d.hold_reasons;
    const tabs = slot && !givenOnly ? [["given", "Given"], ["held", "Held"], ["refused", "Refused"]].filter(([m]) => !holdOnly || m === "held") : [];
    const nowInput = toDateTimeInput(systemNow());
    box.innerHTML = `<div class="marx-panel">
        <div><strong>${slot ? `Dose due ${esc(fmt(slot.at))}` : "As-needed dose"}</strong>${holdOnly ? ` <span class="marx-sub">— can be given from ${d.rules.early_min} min before its time; it can be held now.</span>` : ""}</div>
        ${tabs.length > 1 ? `<div class="marx-tabs" role="group" aria-label="What happened">${tabs.map(([m, l]) => `<button type="button" class="marx-btn ${m === mode ? "on" : ""}" data-mode="${m}" aria-pressed="${m === mode}">${l}</button>`).join("")}</div>` : ""}
        <div data-v="fields"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="marx-btn primary" data-v="save"></button><button type="button" class="marx-btn" data-v="cancel">Cancel</button></div>
        <div class="marx-err" role="alert"></div>
    </div>`;
    const q = (k) => box.querySelector(`[data-v="${k}"]`);
    const err = box.querySelector(".marx-err");
    let supply = null;
    const loadSupply = async () => {
        const r = await fetchSupply(o.id).catch(() => null);
        const el = q("supply");
        if (!el) return;
        if (!r?.success) {
            el.innerHTML = `<span class="marx-err">Could not check the stock. ${esc(r?.message || "")}</span>`;
            return;
        }
        supply = r.data;
        const s = supply;
        const def = s.default;
        const opt = (value, label, selected, disabled = false) => `<option value="${value}" ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}>${esc(label)}</option>`;
        el.innerHTML = `<div class="row">
                <div><label for="marxFrom">Taken from</label><select id="marxFrom">
                    ${def ? "" : `<option value="">Choose…</option>`}
                    ${(s.withdrawals || []).map((w) => opt(`cabinet:${w.id}`, `Taken out of the cabinet ${hm(w.withdrawn_at)}${w.slot_at ? ` for the ${hm(w.slot_at)} dose` : ""} — ${Number(w.quantity)} ${s.unit_name}(s)${w.mine ? "" : ` by ${w.withdrawn_by_name}`}`,
                        def?.source === "cabinet" ? def.withdrawal_id === w.id : false)).join("")}
                    ${s.locations.map((l) => opt(`stock:${l.id}`, `${l.label} — ${l.usable > 0 ? `${Number(l.usable)} ${s.unit_name}(s) usable` : "none usable"}`, def?.source === "stock" && def.warehouse_id === l.id, !(l.usable > 0))).join("")}
                    ${s.opened_available ? opt("opened", "Patient's opened container (already charged)", def?.source === "opened") : ""}
                    ${opt("own", "Patient's own supply (not charged)", false)}
                </select></div>
                <div data-v="qtybox"><label for="marxQty">How many ${esc(s.unit_name)}(s)</label><input id="marxQty" type="number" min="0.5" step="0.5" inputmode="decimal" value="${s.quantity}"></div>
            </div>
            <div class="marx-price" data-v="price"></div>
            ${def ? "" : `<div class="marx-err">No usable stock at the ward or the pharmacy. Ask the pharmacy to send it, or record the patient's own supply.</div>`}`;
        // Taken out for this dose time: pick that one.
        const forSlot = slot && (s.withdrawals || []).find((w) => w.slot_at && w.slot_at.slice(0, 16) === slot.at.slice(0, 16));
        if (forSlot) $("marxFrom").value = `cabinet:${forSlot.id}`;
        const sync = () => {
            const from = $("marxFrom").value;
            const isStock = from.startsWith("stock:");
            const cab = from.startsWith("cabinet:") ? (s.withdrawals || []).find((w) => w.id === Number(from.slice(8))) : null;
            q("qtybox").style.display = isStock ? "" : "none";
            const qty = cab ? cab.quantity : Number($("marxQty").value || 0);
            if (cab) {
                q("price").textContent = s.unit_price ? `Already taken out of the cabinet: ${qty} × ${peso(s.unit_price)} = ${peso(qty * s.unit_price)} will be charged to the patient.` : "Already taken out of the cabinet; no selling price set, not charged.";
                return;
            }
            q("price").textContent = !isStock ? (from === "" ? "" : "Nothing taken from stock; not charged.")
                : s.unit_price ? `${qty} × ${peso(s.unit_price)} = ${peso(qty * s.unit_price)} will be charged to the patient.` : "No selling price set: taken from stock, not charged.";
        };
        $("marxFrom").onchange = sync;
        $("marxQty").oninput = sync;
        sync();
    };
    const fields = () => {
        if (mode === "given") {
            q("fields").innerHTML = `<div class="marx-grid">
                    <div><label for="marxGivenAt">Time given</label><input type="datetime-local" id="marxGivenAt" value="${nowInput}"></div>
                    ${o.order_type === "prn" ? `<div><label for="marxReason">Given for (required)</label><input id="marxReason" maxlength="255" placeholder="${esc(o.prn_indication ? `e.g. ${o.prn_indication}` : "e.g. pain score 6")}"></div>` : `<div><label>Dose</label><div style="padding:7px 0">${esc(`${o.dose_text} ${o.dose_unit} · ${o.route_label}`)}</div></div>`}
                    ${o.pain ? `<div style="grid-column:1/-1"><label id="marxPainLbl">Pain score now, before giving (required)${o.pain_threshold != null ? ` — the order is for ${esc(o.prn_indication)}` : ""}</label>${scorePicker("marxPain", "marxPainLbl")}</div>` : ""}
                    <div style="grid-column:1/-1"><label for="marxNote">Note (optional)</label><input id="marxNote" maxlength="500"></div>
                    ${o.dd ? `<div><label for="marxWaste">Amount wasted (if any)</label><div style="display:flex;gap:6px"><input id="marxWaste" type="number" min="0" step="any" inputmode="decimal" placeholder="0">
                        <select id="marxWasteUnit" aria-label="Unit wasted">${[...new Set([o.dose_unit, "mg", "mcg", "mL", "tablet", "ampule", "vial"])].map((u) => `<option>${esc(u)}</option>`).join("")}</select></div></div>
                        <div><label for="marxWasteHow">How it was disposed of</label><input id="marxWasteHow" maxlength="255" placeholder="e.g. discarded in the sharps bin"></div>` : ""}
                </div>
                ${o.dd ? `<p class="marx-sub" style="margin:0">Dangerous drug: this dose goes into the DD register with the second nurse as witness.</p>` : ""}
                <div class="marx-supply" data-v="supply"><span class="marx-sub">Checking stock…</span></div>
                <div data-v="confirm"></div>
                ${o.needs_witness ? `<div class="marx-witness"><strong>Second nurse check</strong> <span class="marx-sub">— ${o.high_alert ? "high-alert" : "controlled"} medicine. Another nurse checks the patient, medicine, dose and route, then signs with their own username and password.</span>
                    <div class="marx-grid" style="margin-top:6px"><div><label for="marxWUser">Second nurse's username</label><input id="marxWUser" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
                    <div><label for="marxWPass">Their password</label><input id="marxWPass" type="password" autocomplete="new-password"></div></div></div>` : ""}`;
            q("save").textContent = "Record as given";
            if (o.pain) bindScore(box, "marxPain");
            loadSupply();
        } else if (mode === "held") {
            q("fields").innerHTML = `<div class="marx-grid">
                <div><label for="marxHoldWhy">Why held</label><select id="marxHoldWhy"><option value="">Choose…</option>${reasons.map((r) => `<option>${esc(r)}</option>`).join("")}</select></div>
                <div><label for="marxNote">Details (required for "Other")</label><input id="marxNote" maxlength="500" placeholder="e.g. BP 88/50, Dr Cruz told"></div></div>`;
            q("save").textContent = "Record as held";
        } else {
            q("fields").innerHTML = `<div class="marx-grid">
                <div><label for="marxReason">What the patient said / why (required)</label><input id="marxReason" maxlength="255" placeholder="e.g. feels nauseous"></div>
                <div><label for="marxNote">Note (optional)</label><input id="marxNote" maxlength="500" placeholder="e.g. doctor told, will retry at 10:00"></div></div>`;
            q("save").textContent = "Record as refused";
        }
        err.textContent = "";
    };
    fields();
    box.querySelectorAll("[data-mode]").forEach((b) => {
        b.onclick = () => {
            mode = b.dataset.mode;
            box.querySelectorAll("[data-mode]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
            fields();
        };
    });
    q("cancel").onclick = () => {
        box.innerHTML = "";
        $("marxModal").querySelectorAll(".marx-slot.sel").forEach((b) => b.classList.remove("sel"));
    };
    let confirmLow = false;
    q("save").onclick = async () => {
        const v = (id) => ($(id)?.value || "").trim();
        const base = { order_id: o.id, scheduled_at: slot ? slot.at : undefined, note: v("marxNote") };
        let call;
        if (mode === "given") {
            if (o.order_type === "prn" && !v("marxReason")) { err.textContent = "Say what it was given for."; $("marxReason").focus(); return; }
            const pain = o.pain ? box.querySelector("#marxPain").dataset.value : undefined;
            if (o.pain && (pain === undefined || pain === "")) { err.textContent = "Score the pain before giving it."; box.querySelector("#marxPain button")?.focus(); return; }
            if (o.dd && Number(v("marxWaste")) > 0 && !v("marxWasteHow")) { err.textContent = "Say how the wasted amount was disposed of."; $("marxWasteHow").focus(); return; }
            if (!supply || !$("marxFrom")) { err.textContent = "Wait for the stock check."; return; }
            const from = $("marxFrom").value;
            if (!from) { err.textContent = "Choose where the dose was taken from."; $("marxFrom").focus(); return; }
            if (from.startsWith("stock:") && !(Number($("marxQty").value) > 0)) { err.textContent = "Enter how many were taken from stock."; $("marxQty").focus(); return; }
            base.supply_source = from.startsWith("stock:") ? "stock" : from.startsWith("cabinet:") ? "cabinet" : from;
            base.withdrawal_id = from.startsWith("cabinet:") ? Number(from.slice(8)) : undefined;
            base.warehouse_id = from.startsWith("stock:") ? Number(from.slice(6)) : undefined;
            base.stock_quantity = from.startsWith("stock:") ? $("marxQty").value : undefined;
            if (o.needs_witness && (!v("marxWUser") || !$("marxWPass").value)) { err.textContent = "The second nurse must sign with their username and password."; $("marxWUser").focus(); return; }
            call = () => giveDose({ ...base, given_at: $("marxGivenAt").value, reason: v("marxReason"),
                pain_score: o.pain ? Number(pain) : undefined, confirm_low: confirmLow ? 1 : undefined,
                wasted_amount: o.dd ? v("marxWaste") : undefined, wasted_unit: o.dd ? v("marxWasteUnit") : undefined, waste_note: o.dd ? v("marxWasteHow") : undefined,
                witness_username: o.needs_witness ? v("marxWUser") : undefined, witness_password: o.needs_witness ? $("marxWPass").value : undefined });
        } else if (mode === "held") {
            const why = v("marxHoldWhy");
            if (!why) { err.textContent = "Choose why it is held."; $("marxHoldWhy").focus(); return; }
            if (why === "Other" && !v("marxNote")) { err.textContent = "Say why in the details."; $("marxNote").focus(); return; }
            call = () => holdDose({ ...base, reason: why === "Other" ? v("marxNote") : why, note: why === "Other" ? "" : v("marxNote") });
        } else {
            if (!v("marxReason")) { err.textContent = "Say why the patient refused."; $("marxReason").focus(); return; }
            call = () => refuseDose({ ...base, reason: v("marxReason") });
        }
        q("save").disabled = true;
        const r = await call().catch(() => null);
        q("save").disabled = false;
        if (!r?.success) {
            if (r?.needs_confirm) {
                // Pain below the order's threshold: confirm, then save again (the second nurse signs again).
                q("confirm").innerHTML = `<div class="marx-confirm">${esc(r.message)} <label class="marx-check" style="display:flex;gap:6px;align-items:center;margin-top:4px;font-weight:600;color:var(--text-primary)"><input type="checkbox" id="marxConfirmLow" style="width:auto"> Yes, give it — the reason is in the note</label></div>`;
                $("marxConfirmLow").onchange = (e) => { confirmLow = e.target.checked; };
                if ($("marxWPass")) $("marxWPass").value = "";
                err.textContent = "";
                return;
            }
            if ($("marxWPass")) $("marxWPass").value = "";
            err.textContent = r?.message || "Could not save.";
            return;
        }
        if ($("marxWPass")) $("marxWPass").value = "";
        reload(r.message);
    };
    box.querySelector("input, select")?.focus();
}

/* ---------------- Medicine Rounds (tab "mar") ---------------- */

export function MarBoardView() {
    ensureStyles();
    return `<div class="mrb-page" id="mrbPage">
    <h1>Medicine Rounds</h1>
    <p class="mrb-intro">This shift's medicines for each patient: late, due now and still to come. Open a patient's MAR to record each dose as given (time and your initials), held or refused. High-alert and controlled medicines need a second nurse. A dose not recorded an hour after its time (15 minutes for STAT) is late and alerts the patient's nurse. As-needed pain medicine needs a pain score before it is given and a recheck 30–60 minutes after.</p>
    <div class="mrb-bar">
        <select id="mrbWard" aria-label="Ward"></select>
        <span class="marx-sub" id="mrbShift"></span>
        ${me().role === "admin" ? `<button type="button" class="marx-btn" id="mrbSupply" style="margin-left:auto">Supply settings</button>` : ""}
    </div>
    <div class="marx-counts" id="mrbCounts"></div>
    <div class="mrb-card" id="mrbList"><div class="mrb-empty">Loading…</div></div>
</div>`;
}

let board = null;
let boardWard = "";
let boardTimer = null;
let boardSeq = 0;

export function initMarBoard() {
    const page = $("mrbPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    ensureRoot();
    boardWard = "";
    $("mrbWard").addEventListener("change", (e) => {
        boardWard = e.target.value;
        loadBoard();
    });
    $("mrbSupply")?.addEventListener("click", openSupplySettings);
    $("mrbList").addEventListener("click", (e) => {
        const adm = e.target.closest("[data-adm]")?.dataset.adm;
        if (adm && e.target.closest("[data-open]")) openMar(Number(adm), { onChange: () => loadBoard() });
    });
    loadBoard();
    clearInterval(boardTimer);
    boardTimer = setInterval(() => {
        if (!$("mrbPage")) {
            clearInterval(boardTimer);
            return;
        }
        if (!document.hidden && !$("marxOverlay")?.classList.contains("open")) loadBoard();
    }, 60000);
}

async function loadBoard() {
    const n = ++boardSeq;
    const res = await fetchMarBoard(boardWard).catch(() => null);
    if (n !== boardSeq || !$("mrbList")) return;
    if (!res?.success) {
        $("mrbList").innerHTML = `<div class="mrb-empty">Could not load the medicine round. ${esc(res?.message || "")}</div>`;
        return;
    }
    board = res.data;
    boardWard = String(board.ward_id);
    renderBoard();
}

function renderBoard() {
    const nursing = ["nurse", "charge_nurse"].includes(me().role);
    $("mrbWard").innerHTML = `${nursing ? `<option value="mine" ${board.ward_id === "mine" ? "selected" : ""}>My patients this shift</option>` : ""}
        ${board.wards.map((w) => `<option value="${w.id}" ${w.id === board.ward_id ? "selected" : ""}>${esc(w.name)}${w.mine ? " (my ward)" : ""}</option>`).join("")}`;
    const s = board.shift;
    $("mrbShift").textContent = `${s.name} · ${dayLabel(s.date)} · ${hm(s.start_at)} – ${hm(s.end_at)}`;
    const t = board.totals;
    $("mrbCounts").innerHTML = `
        <span class="marx-count ${t.late ? "late" : ""}"><b>${t.late}</b>⏰ late</span>
        <span class="marx-count"><b>${t.due}</b>due now</span>
        <span class="marx-count"><b>${t.upcoming}</b>still to come</span>
        <span class="marx-count"><b>${t.given}</b>given</span>
        <span class="marx-count"><b>${t.pending}</b>waiting for pharmacy</span>
        ${board.patients.some((p) => p.counts.recheck) ? `<span class="marx-count late"><b>${board.patients.reduce((n, p) => n + p.counts.recheck, 0)}</b>⏰ pain recheck due</span>` : ""}`;
    if (!board.patients.length) {
        $("mrbList").innerHTML = `<div class="mrb-empty">${board.ward_id === "mine" ? "No patients are assigned to you this shift. Choose a ward above." : "No patients in this ward."}</div>`;
        return;
    }
    const rows = [...board.patients].sort((a, b) => b.counts.late - a.counts.late || b.counts.recheck - a.counts.recheck || b.counts.due - a.counts.due);
    $("mrbList").innerHTML = `<table class="mrb-table">
        <thead><tr><th>Bed</th><th>Patient</th><th>Late</th><th>Due now</th><th>Next dose</th><th class="mrb-hide-sm">This shift</th><th><span class="marx-sub" style="position:absolute;left:-9999px">Actions</span></th></tr></thead>
        <tbody>${rows.map((p) => {
            const c = p.counts;
            const done = [c.given + c.prn_given ? `${c.given + c.prn_given} given` : "", c.held ? `${c.held} held` : "", c.refused ? `${c.refused} refused` : "", c.upcoming ? `${c.upcoming} to come` : "", c.pending ? `${c.pending} waiting for pharmacy` : ""].filter(Boolean).join(" · ");
            return `<tr data-adm="${p.admission_id}" class="${p.is_mine ? "mine" : ""}">
                <td><strong style="white-space:nowrap">${esc(p.room)} · ${esc(p.bed)}</strong>${board.ward_id === "mine" ? `<div class="marx-sub">${esc(p.ward)}</div>` : ""}</td>
                <td><strong>${esc(p.patient_name)}</strong><div class="marx-sub">${esc(p.nurse_name ? `RN ${p.nurse_name}` : "No nurse assigned")}</div></td>
                <td>${c.late ? `<span class="mrb-late">⏰ ${c.late}${p.late_high_alert ? " · high-alert" : ""}</span>` : `<span class="marx-sub">—</span>`}</td>
                <td>${c.due ? `<span class="mrb-due">● ${c.due}</span>` : ""}${c.recheck ? ` <span class="mrb-late">⏰ pain recheck ${c.recheck}</span>` : ""}${!c.due && !c.recheck ? `<span class="marx-sub">—</span>` : ""}</td>
                <td class="num">${p.next_due_at ? esc(hm(p.next_due_at)) : `<span class="marx-sub">—</span>`}</td>
                <td class="mrb-hide-sm marx-sub">${esc(done || "No medicines")}</td>
                <td><button type="button" class="marx-btn ${c.late || c.due || c.recheck ? "primary" : ""}" data-open aria-label="Open the MAR of ${esc(p.patient_name)}">MAR</button></td>
            </tr>`;
        }).join("")}</tbody></table>`;
}

/* ---------------- Supply settings (admin) ---------------- */

/** Where ward doses come from: each ward's own stock location, and the pharmacy location. */
async function openSupplySettings() {
    ensureRoot().classList.add("open");
    cur = null;
    $("marxModal").innerHTML = `<div class="marx-body" style="padding:24px">Loading…</div>`;
    const r = await fetchSupplySettings().catch(() => null);
    if (!r?.success) {
        $("marxModal").innerHTML = `<div class="marx-head"><h2 id="marxTitle">Supply settings</h2><button type="button" class="marx-x" data-close aria-label="Close">×</button></div>
            <div class="marx-body"><p>${esc(r?.message || "Could not load the settings.")}</p></div>`;
        $("marxModal").querySelector("[data-close]").onclick = close;
        return;
    }
    const d = r.data;
    const opts = (selected, none) => `<option value="">${esc(none)}</option>${d.warehouses.map((w) => `<option value="${w.id}" ${w.id === selected ? "selected" : ""}>${esc(w.name)}</option>`).join("")}`;
    const defName = d.warehouses.find((w) => w.id === d.default_pharmacy_warehouse_id)?.name;
    $("marxModal").innerHTML = `
        <div class="marx-head"><div><h2 id="marxTitle">Where ward medicines come from</h2>
            <div class="marx-sub">A dose given on the MAR is taken from the ward's own stock when it has enough, else from the pharmacy — through the medicine ledger — and charged to the patient. Refill ward stock from the pharmacy with Stock Transfers.</div></div>
            <button type="button" class="marx-x" data-close aria-label="Close">×</button></div>
        <div class="marx-body"><div class="marx-panel">
            <div><label for="marxPharmWh">Pharmacy location</label><select id="marxPharmWh">${opts(d.pharmacy_warehouse_id, defName ? `Not set (uses ${defName})` : "Not set")}</select></div>
            <table class="mrb-table" style="background:var(--bg-surface);border-radius:8px"><thead><tr><th>Ward</th><th>Ward stock location</th></tr></thead><tbody>
                ${d.wards.map((w) => `<tr><td>${esc(w.name)}</td><td><select data-ward="${w.id}" aria-label="Stock location of ${esc(w.name)}">${opts(w.stock_warehouse_id, "No ward stock (pharmacy only)")}</select></td></tr>`).join("")}
            </tbody></table>
            <div style="display:flex;gap:6px"><button type="button" class="marx-btn primary" id="marxSupplySave">Save</button><button type="button" class="marx-btn" data-close>Cancel</button></div>
            <div class="marx-err" role="alert"></div>
        </div></div>`;
    $("marxModal").querySelectorAll("[data-close]").forEach((b) => { b.onclick = close; });
    $("marxSupplySave").onclick = async (ev) => {
        const wards = {};
        $("marxModal").querySelectorAll("[data-ward]").forEach((s) => { wards[s.dataset.ward] = s.value; });
        ev.target.disabled = true;
        const res = await saveSupplySettings({ pharmacy_warehouse_id: $("marxPharmWh").value, wards }).catch(() => null);
        ev.target.disabled = false;
        if (!res?.success) {
            $("marxModal").querySelector(".marx-err").textContent = res?.message || "Could not save.";
            return;
        }
        showToast(res.message);
        close();
    };
}
