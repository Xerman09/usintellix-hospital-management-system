import { showToast } from "../../core/toast.js";

/* Shared pieces of the radiology screens (module 15): styles, the dialog, and the printable preparation sheet. */

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const hm = (dt) => String(dt || "").slice(11, 16);
export const dtl = (dt) => String(dt || "").slice(0, 16).replace(" ", "T");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const when = (dt) => (dt ? `${Number(String(dt).slice(8, 10))} ${MON[Number(String(dt).slice(5, 7)) - 1]} ${hm(dt)}` : "");
export const dayLabel = (d) => (d ? `${Number(String(d).slice(8, 10))} ${MON[Number(String(d).slice(5, 7)) - 1]} ${String(d).slice(0, 4)}` : "");
export const waited = (m) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d`);

/** Modality badges: one colour each, so a worklist row is read at a glance. */
export const MODALITY_COLOUR = { xray: "#0ea5e9", ultrasound: "#10b981", ct: "#8b5cf6", mri: "#f59e0b", fluoroscopy: "#ec4899", mammography: "#f43f5e" };
export const modalityTag = (modality, label, extra = "") =>
    `<span class="rad-mod" style="--m:${MODALITY_COLOUR[modality] || "#6b7280"}">${esc(label || modality)}${extra ? ` ${extra}` : ""}</span>`;

const CSS = `
.rad { padding: 20px 24px 40px; max-width: 1400px; margin: 0 auto; color: var(--text-primary); }
@media (max-width: 600px) { .rad { padding: 16px 16px 32px; } }
.rad h1 { margin: 0; font-size: 22px; }
.rad-sub { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
.rad-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 10px; }
.rad-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.rad-b.blue { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.rad-b.sm { padding: 4px 9px; font-size: 12.5px; }
.rad-b:disabled { opacity: .55; cursor: default; }
.rad-b:focus-visible, .rad button:focus-visible, .rbx button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.rad .muted, .rbx .muted { color: var(--text-muted); }
.rad-empty { padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.rad-counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 12px; }
.rad-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.rad-counts b { font-size: 18px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.rad-counts .bad { border-color: #fca5a5; background: #fef2f2; color: #7f1d1d; }
:root[data-theme="dark"] .rad-counts .bad { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
.rad-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.rad-tools input, .rad-tools select { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
.rad-tools input[type=search] { min-width: min(240px, 100%); }
.rad-tabs { display: inline-flex; border: 1px solid var(--border-color); border-radius: 9px; overflow: hidden; }
.rad-tabs button { border: 0; background: var(--bg-surface); color: var(--text-primary); padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.rad-tabs button[aria-pressed="true"] { background: #1d4ed8; color: #fff; }
.rad-list { display: grid; gap: 8px; }
.rad-req { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); padding: 10px 12px; display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto; gap: 10px; align-items: start; font-size: 13px; }
@media (max-width: 900px) { .rad-req { grid-template-columns: 1fr; } }
.rad-req.stat { box-shadow: inset 4px 0 0 #b91c1c; }
.rad-req.urgent { box-shadow: inset 4px 0 0 #f59e0b; }
.rad-req .who { font-weight: 700; font-size: 14px; overflow-wrap: anywhere; }
.rad-req .acts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.rad-pri { display: inline-block; border-radius: 999px; padding: 1px 8px; font-size: 11.5px; font-weight: 800; border: 1px solid var(--border-color); }
.rad-pri.stat { background: #b91c1c; color: #fff; border-color: #b91c1c; }
.rad-pri.urgent { background: #fef3c7; color: #78350f; border-color: #f59e0b; }
:root[data-theme="dark"] .rad-pri.urgent { background: #451a03; color: #fde68a; }
.rad-late { color: #b91c1c; font-weight: 800; }
:root[data-theme="dark"] .rad-late { color: #fca5a5; }
.rad-mod { display: inline-block; font-size: 11.5px; font-weight: 800; padding: 1px 8px; border-radius: 999px; margin: 2px 4px 2px 0;
    border: 1px solid var(--m); color: var(--m); background: color-mix(in srgb, var(--m) 12%, transparent); }
.rad-flag { display: inline-block; font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 6px; border: 1px solid #f59e0b; background: #fffbeb; color: #78350f; margin: 2px 4px 2px 0; }
:root[data-theme="dark"] .rad-flag { background: #451a03; color: #fde68a; }
.rad-flag.bad { border-color: #b91c1c; background: #b91c1c; color: #fff; }
.rad-study { margin-top: 2px; }
.rad-slot { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-weight: 700; }
/* the day per machine */
.rad-rooms { display: grid; gap: 10px; }
.rad-room { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); overflow: hidden; }
.rad-room > h2 { margin: 0; padding: 8px 12px; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; justify-content: space-between; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
.rad-room > h2 small { font-weight: 500; color: var(--text-muted); font-size: 12px; }
.rad-bk { display: grid; grid-template-columns: 86px minmax(0, 2fr) minmax(0, 3fr) auto; gap: 10px; padding: 8px 12px; border-top: 1px solid var(--border-color); font-size: 13px; align-items: start; }
@media (max-width: 900px) { .rad-bk { grid-template-columns: 70px 1fr; } .rad-bk .acts { grid-column: 1 / -1; } }
.rad-bk:first-of-type { border-top: 0; }
.rad-bk.arrived { background: #ecfdf5; }
:root[data-theme="dark"] .rad-bk.arrived { background: #052e1a; }
.rad-bk.late .rad-slot { color: #b91c1c; }
.rad-bk .acts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.rad-fill { height: 6px; border-radius: 3px; background: var(--bg-surface-alt); overflow: hidden; min-width: 90px; }
.rad-fill i { display: block; height: 100%; background: #1d4ed8; }

.rbx-ov { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 5100; display: flex; align-items: center; justify-content: center; padding: 16px; }
.rbx { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 820px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
.rbx.wide { max-width: 1040px; }
.rbx-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 14px 18px 8px; border-bottom: 1px solid var(--border-color); }
.rbx-head h2 { margin: 0; font-size: 18px; }
.rbx-x { border: 0; background: none; font-size: 22px; cursor: pointer; color: var(--text-muted); padding: 2px 8px; border-radius: 6px; }
.rbx-body { padding: 12px 18px; overflow: auto; display: grid; gap: 12px; font-size: 13.5px; }
.rbx-foot { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 18px 14px; border-top: 1px solid var(--border-color); flex-wrap: wrap; }
.rbx fieldset { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 12px 12px; margin: 0; min-width: 0; display: grid; gap: 8px; }
.rbx legend { font-weight: 800; font-size: 13px; padding: 0 4px; }
.rbx label, .rbx .lbl { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.rbx input[type=text], .rbx input[type=search], .rbx input[type=date], .rbx input[type=datetime-local], .rbx input[type=time], .rbx select, .rbx textarea {
    width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 8px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.rbx textarea { min-height: 46px; resize: vertical; }
.rbx [aria-invalid="true"] { border-color: #dc2626 !important; outline: 2px solid #fca5a5; }
.rbx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 8px; }
.rbx-chk { display: flex !important; gap: 8px; align-items: flex-start; color: var(--text-primary) !important; font-size: 13px !important; font-weight: 600; margin: 0; }
.rbx-note { border-radius: 10px; padding: 8px 10px; font-size: 13px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.rbx-note.warn { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
:root[data-theme="dark"] .rbx-note.warn { background: #451a03; color: #fde68a; border-color: #92400e; }
.rbx-note ul { margin: 4px 0 0; padding-left: 18px; }
.rbx-err { color: #dc2626; font-size: 12.5px; min-height: 1em; margin-right: auto; }
.rbx-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.rbx-seg label { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 999px; margin: 0; font-size: 13px; color: var(--text-primary); cursor: pointer; font-weight: 600; }
.rbx-seg label:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
:root[data-theme="dark"] .rbx-seg label:has(input:checked) { background: #172554; color: #bfdbfe; }
.rbx-seg label.stat:has(input:checked) { border-color: #b91c1c; background: #b91c1c; color: #fff; }
.rbx-seg label.yes:has(input:checked) { border-color: #b45309; background: #fef3c7; color: #78350f; }
:root[data-theme="dark"] .rbx-seg label.yes:has(input:checked) { background: #451a03; color: #fde68a; }
.rbx-studies { max-height: 300px; overflow: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.rbx-studies h4 { margin: 0; padding: 6px 10px; font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); background: var(--bg-surface-alt); position: sticky; top: 0; }
.rbx-studies label { display: flex; align-items: center; gap: 8px; padding: 5px 10px; margin: 0; font-size: 13px; font-weight: 400; color: var(--text-primary); cursor: pointer; border-top: 1px solid var(--border-color); }
.rbx-studies label:has(input:checked) { background: #eff6ff; }
:root[data-theme="dark"] .rbx-studies label:has(input:checked) { background: #172554; }
.rbx-studies label small { margin-left: auto; color: var(--text-muted); white-space: nowrap; }
.rbx-picked { display: flex; flex-wrap: wrap; gap: 4px; min-height: 26px; }
.rbx-id { border: 2px solid #1d4ed8; border-radius: 10px; padding: 8px 12px; display: grid; gap: 2px; }
.rbx-id b { font-size: 16px; }
.rbx-slots { display: flex; flex-wrap: wrap; gap: 6px; max-height: 220px; overflow: auto; }
.rbx-slots button { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 5px 9px; font: inherit; font-size: 12.5px; cursor: pointer; font-variant-numeric: tabular-nums; }
.rbx-slots button[aria-pressed="true"] { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.rbx-slots button:disabled { opacity: .4; cursor: default; text-decoration: line-through; }
.rbx-prep { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 10px; }
.rbx-prep h4 { margin: 0 0 2px; font-size: 13px; }
.rbx-prep ul { margin: 2px 0 8px; padding-left: 18px; }
.rbx-prep li { margin-bottom: 2px; }
/* reports and images (Phase 2) */
.rad-req.crit { box-shadow: inset 4px 0 0 #b91c1c; }
.rad-flag.ok { border-color: var(--border-color); background: var(--bg-surface-alt); color: var(--text-muted); }
.rad-state { font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 6px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); margin-right: 4px; }
.rad-state.draft { background: #fef3c7; color: #78350f; border-color: #f59e0b; }
:root[data-theme="dark"] .rad-state.draft { background: #451a03; color: #fde68a; }
.rad-thumbs { display: flex; flex-wrap: wrap; gap: 8px; }
.rad-thumbs figure { margin: 0; width: 160px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: #0f172a; }
.rad-thumbs.small figure { width: 110px; }
.rad-thumbs img { display: block; width: 100%; height: 110px; object-fit: contain; background: #000; }
.rad-thumbs.small img { height: 76px; }
.rad-thumbs .file { height: 110px; display: flex; align-items: center; justify-content: center; color: #93c5fd; font-weight: 800; font-size: 13px; background: #0f172a; }
.rad-thumbs.small .file { height: 76px; }
.rad-thumbs figcaption { padding: 4px 6px; font-size: 11.5px; background: var(--bg-surface); color: var(--text-primary); display: grid; gap: 2px; }
.rad-rep { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; font-size: 13px; }
.rad-rep.old { opacity: .75; }
.rad-text { white-space: pre-wrap; margin-top: 2px; }
.rad-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.rad-tbl th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 6px 8px; border-bottom: 1px solid var(--border-color); }
.rad-tbl td { padding: 6px 8px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.rad-tbl input[type=text] { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 6px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.rbx input[type=file] { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 8px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
`;

export function ensureCss() {
    if (!document.getElementById("rad-style")) {
        const st = document.createElement("style");
        st.id = "rad-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}

export function modal(title, sub, bodyHtml, footHtml) {
    ensureCss();
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "rbx-ov";
    ov.innerHTML = `<div class="rbx" role="dialog" aria-modal="true" aria-labelledby="rbxTitle">
        <div class="rbx-head"><div><h2 id="rbxTitle">${title}</h2>${sub ? `<div class="rad-sub">${sub}</div>` : ""}</div><button type="button" class="rbx-x" data-x aria-label="Close">×</button></div>
        <div class="rbx-body">${bodyHtml}</div>
        <div class="rbx-foot"><span class="rbx-err" role="alert"></span>${footHtml}</div></div>`;
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
    ov.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", close));
    const $ = (sel) => ov.querySelector(sel);
    const err = (msg, errors) => {
        $(".rbx-err").textContent = msg || "";
        ov.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
        let first = null;
        Object.keys(errors || {}).forEach((k) => {
            const f = ov.querySelector(`[name="${k}"]`) || ov.querySelector(`[data-field="${k}"]`);
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
        if (f.type === "radio") return ov.querySelector(`[name="${n}"]:checked`)?.value ?? "";
        return f.value.trim();
    };
    return { ov, $, close, err, val };
}

/* ---------------- preparation ---------------- */

/** The preparation instructions as a block (in a dialog or on the worklist). */
export function prepHtml(prep) {
    return `<div class="rbx-prep">
        ${prep.studies.map((s) => `<h4>${esc(s.name)} <span class="muted" style="font-weight:500">· ${esc(s.modality_label)} · ${s.minutes} min${s.contrast_label && s.contrast_label !== "No contrast" ? ` · ${esc(s.contrast_label)}` : ""}</span></h4>
            <ul><li>${esc(s.prep)}</li></ul>`).join("")}
        ${prep.general.length ? `<h4>Before the scan</h4><ul>${prep.general.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}</div>`;
}

/** Print the preparation sheet for the patient or the ward. */
export function printPrep(sheet) {
    const win = window.open("", "_blank");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return false;
    }
    const p = sheet.patient;
    const booked = sheet.studies.filter((s) => s.booking);
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Imaging preparation ${esc(sheet.request_no)}</title>
<style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11pt; line-height: 1.35; }
    h1 { font-size: 15pt; margin: 0 0 2px; } h2 { font-size: 11pt; margin: 14px 0 4px; text-transform: uppercase; }
    .id { border: 1.5px solid #111; padding: 6px 10px; margin: 8px 0 4px; } .id b { font-size: 13pt; }
    ul { margin: 4px 0 8px; padding-left: 18px; } li { margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; } th { text-align: left; font-size: 9pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 5px; }
    .sub { color: #444; font-size: 9.5pt; } footer { margin-top: 14px; font-size: 9pt; color: #555; border-top: 1px solid #bbb; padding-top: 4px; }
    .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>Imaging — how to get ready</h1>
<div class="sub">${esc(sheet.request_no)} · ordered ${esc(when(sheet.ordered_at))}${sheet.ordering_doctor ? ` by ${esc(sheet.ordering_doctor)}` : ""}${sheet.priority !== "routine" ? ` · ${esc(String(sheet.priority).toUpperCase())}` : ""}</div>
<div class="id"><b>${esc(p.name)}</b><br>MRN ${esc(p.mrn || "—")} · born ${esc(p.birthdate || "?")}${p.age !== null ? ` (${p.age} y)` : ""}${p.sex ? ` · ${esc(p.sex)}` : ""}${sheet.location ? ` · ${esc(sheet.location)}` : ""}</div>
${sheet.indication ? `<div class="sub">Reason for the scan: ${esc(sheet.indication)}</div>` : ""}
${booked.length ? `<h2>Appointment</h2><table><thead><tr><th>Study</th><th>Machine</th><th>When</th></tr></thead><tbody>
    ${booked.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.booking.room || "")}</td><td>${esc(when(s.booking.start_at))}</td></tr>`).join("")}</tbody></table>
<div class="sub">Please come 15 minutes early and bring this sheet.</div>` : `<h2>Appointment</h2><p>Radiology will give the date and time.</p>`}
<h2>The studies</h2>
${sheet.prep.studies.map((s) => `<p><b>${esc(s.name)}</b> <span class="sub">(${esc(s.modality_label)}, about ${s.minutes} minutes${s.contrast_label && s.contrast_label !== "No contrast" ? `, ${esc(s.contrast_label.toLowerCase())}` : ""})</span><br>${esc(s.prep)}</p>`).join("")}
${sheet.prep.general.length ? `<h2>Before the scan</h2><ul>${sheet.prep.general.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
<h2>Questions radiology will ask again</h2>
<ul><li>Could you be pregnant?${sheet.safety.pregnancy ? ` <span class="sub">(on the request: ${esc(sheet.safety.pregnancy)})</span>` : ""}</li>
    <li>Have you ever reacted to an X-ray dye (contrast)?${sheet.safety.contrast_allergy ? ` <span class="sub">(on the request: ${esc(sheet.safety.contrast_allergy)})</span>` : ""}</li>
    <li>Do you have a pacemaker, metal clips, an implant or metal in your body?${sheet.safety.implants ? ` <span class="sub">(on the request: ${esc(sheet.safety.implants)})</span>` : ""}</li></ul>
<footer>If anything changes — the patient eats, becomes unwell or cannot come — tell radiology so the slot can be given to someone else.</footer>
</body></html>`);
    win.document.close();
    return true;
}
