import { showToast } from "../../core/toast.js";
import { code128Svg } from "./barcode.js?v=1";

/* Shared pieces of the lab screens (module 14): styles, the dialog, tube swatches, label printing. */

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const hm = (dt) => String(dt || "").slice(11, 16);
export const dtl = (dt) => String(dt || "").slice(0, 16).replace(" ", "T");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const when = (dt) => (dt ? `${Number(String(dt).slice(8, 10))} ${MON[Number(String(dt).slice(5, 7)) - 1]} ${hm(dt)}` : "");
export const waited = (m) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d`);

const CSS = `
.lab { padding: 20px 24px 40px; max-width: 1400px; margin: 0 auto; color: var(--text-primary); }
@media (max-width: 600px) { .lab { padding: 16px 16px 32px; } }
.lab h1 { margin: 0; font-size: 22px; }
.lab-sub { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
.lab-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 10px; }
.lab-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.lab-b.blue { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.lab-b.sm { padding: 4px 9px; font-size: 12.5px; }
.lab-b:disabled { opacity: .55; cursor: default; }
.lab-b:focus-visible, .lab button:focus-visible, .lbx button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.lab .muted, .lbx .muted { color: var(--text-muted); }
.lab-empty { padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.lab-counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 12px; }
.lab-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.lab-counts b { font-size: 18px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.lab-counts .bad { border-color: #fca5a5; background: #fef2f2; color: #7f1d1d; }
:root[data-theme="dark"] .lab-counts .bad { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
.lab-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.lab-tools input[type=search], .lab-tools select { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
.lab-tools input[type=search] { min-width: min(260px, 100%); }
.lab-tabs { display: inline-flex; border: 1px solid var(--border-color); border-radius: 9px; overflow: hidden; }
.lab-tabs button { border: 0; background: var(--bg-surface); color: var(--text-primary); padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.lab-tabs button[aria-pressed="true"] { background: #1d4ed8; color: #fff; }
.lab-list { display: grid; gap: 8px; }
.lab-req { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); padding: 10px 12px; display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto; gap: 10px; align-items: start; font-size: 13px; }
@media (max-width: 900px) { .lab-req { grid-template-columns: 1fr; } }
.lab-req.stat { box-shadow: inset 4px 0 0 #b91c1c; }
.lab-req.urgent { box-shadow: inset 4px 0 0 #f59e0b; }
.lab-req.later { opacity: .8; }
.lab-req .who { font-weight: 700; font-size: 14px; overflow-wrap: anywhere; }
.lab-req .acts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.lab-pri { display: inline-block; border-radius: 999px; padding: 1px 8px; font-size: 11.5px; font-weight: 800; border: 1px solid var(--border-color); }
.lab-pri.stat { background: #b91c1c; color: #fff; border-color: #b91c1c; }
.lab-pri.urgent { background: #fef3c7; color: #78350f; border-color: #f59e0b; }
:root[data-theme="dark"] .lab-pri.urgent { background: #451a03; color: #fde68a; }
.lab-late { color: #b91c1c; font-weight: 800; }
:root[data-theme="dark"] .lab-late { color: #fca5a5; }
.lab-tube { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; padding: 2px 8px 2px 4px; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); margin: 2px 4px 2px 0; }
.lab-tube i { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0,0,0,.25); display: inline-block; flex: none; }
.lab-tube.done { text-decoration: line-through; opacity: .65; }
.lab-spec { font-size: 12.5px; margin-top: 4px; }
.lab-spec.void { text-decoration: line-through; color: var(--text-muted); }
.lab-acc { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-weight: 700; }

.lbx-ov { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 5100; display: flex; align-items: center; justify-content: center; padding: 16px; }
.lbx { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 760px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
.lbx-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 14px 18px 8px; border-bottom: 1px solid var(--border-color); }
.lbx-head h2 { margin: 0; font-size: 18px; }
.lbx-x { border: 0; background: none; font-size: 22px; cursor: pointer; color: var(--text-muted); padding: 2px 8px; border-radius: 6px; }
.lbx-body { padding: 12px 18px; overflow: auto; display: grid; gap: 12px; font-size: 13.5px; }
.lbx-foot { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 18px 14px; border-top: 1px solid var(--border-color); flex-wrap: wrap; }
.lbx fieldset { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 12px 12px; margin: 0; min-width: 0; }
.lbx legend { font-weight: 800; font-size: 13px; padding: 0 4px; }
.lbx label, .lbx .lbl { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.lbx input[type=text], .lbx input[type=search], .lbx input[type=datetime-local], .lbx select, .lbx textarea {
    width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 8px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.lbx textarea { min-height: 46px; resize: vertical; }
.lbx [aria-invalid="true"] { border-color: #dc2626 !important; outline: 2px solid #fca5a5; }
.lbx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 8px; }
.lbx-chk { display: flex !important; gap: 8px; align-items: flex-start; color: var(--text-primary) !important; font-size: 13px !important; font-weight: 600; margin: 0; }
.lbx-note { border-radius: 10px; padding: 8px 10px; font-size: 13px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.lbx-note.warn { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
:root[data-theme="dark"] .lbx-note.warn { background: #451a03; color: #fde68a; border-color: #92400e; }
.lbx-err { color: #dc2626; font-size: 12.5px; min-height: 1em; margin-right: auto; }
.lbx-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.lbx-seg label { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 999px; margin: 0; font-size: 13px; color: var(--text-primary); cursor: pointer; font-weight: 600; }
.lbx-seg label:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
:root[data-theme="dark"] .lbx-seg label:has(input:checked) { background: #172554; color: #bfdbfe; }
.lbx-seg label.stat:has(input:checked) { border-color: #b91c1c; background: #b91c1c; color: #fff; }
.lbx-tests { max-height: 300px; overflow: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.lbx-tests h4 { margin: 0; padding: 6px 10px; font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); background: var(--bg-surface-alt); position: sticky; top: 0; }
.lbx-tests label { display: flex; align-items: center; gap: 8px; padding: 5px 10px; margin: 0; font-size: 13px; font-weight: 400; color: var(--text-primary); cursor: pointer; border-top: 1px solid var(--border-color); }
.lbx-tests label:has(input:checked) { background: #eff6ff; }
:root[data-theme="dark"] .lbx-tests label:has(input:checked) { background: #172554; }
.lbx-tests label i { width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,.25); flex: none; }
.lbx-tests label small { margin-left: auto; color: var(--text-muted); }
.lbx-picked { display: flex; flex-wrap: wrap; gap: 4px; min-height: 26px; }
.lbx-tube { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 10px; display: grid; gap: 4px; }
.lbx-tube .t { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.lbx-tube .t i { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(0,0,0,.25); }
.lbx-tube label { display: flex; gap: 8px; align-items: center; font-weight: 400; color: var(--text-primary); font-size: 13px; margin: 0; }
.lbx-id { border: 2px solid #1d4ed8; border-radius: 10px; padding: 8px 12px; display: grid; gap: 2px; }
.lbx-id b { font-size: 16px; }
.lbx-labels { display: flex; flex-wrap: wrap; gap: 10px; }
.lbx-label { width: 240px; border: 1px dashed var(--border-color); border-radius: 6px; padding: 6px 8px; background: #fff; color: #000; font-size: 11px; line-height: 1.25; }
.lbx-label svg { width: 100%; height: 34px; display: block; }
/* results (Phase 2) */
.lab-fl { display: inline-block; font-size: 11px; font-weight: 800; border-radius: 6px; padding: 1px 6px; border: 1px solid var(--border-color); }
.lab-fl.crit { background: #b91c1c; color: #fff; border-color: #b91c1c; }
.lab-fl.abn { background: #fef3c7; color: #78350f; border-color: #f59e0b; }
.lab-fl.ok { color: var(--text-muted); }
:root[data-theme="dark"] .lab-fl.abn { background: #451a03; color: #fde68a; }
.lab-vals { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 4px; }
.lab-vals th { text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-muted); padding: 4px 6px; border-bottom: 1px solid var(--border-color); }
.lab-vals td { padding: 4px 6px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.lab-vals tr.crit td { background: #fef2f2; }
:root[data-theme="dark"] .lab-vals tr.crit td { background: #450a0a; }
.lab-vals td.v { font-weight: 800; font-variant-numeric: tabular-nums; }
.lab-vals input[type=text] { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 6px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.lab-vals input.val { font-weight: 700; min-width: 70px; }
.lab-vals .hl { font-weight: 800; color: #b45309; }
:root[data-theme="dark"] .lab-vals .hl { color: #fcd34d; }
.lab-state { font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 6px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); }
.lab-state.returned { background: #fef3c7; color: #78350f; border-color: #f59e0b; }
.lab-res { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); padding: 10px 12px; font-size: 13px; display: grid; gap: 6px; }
.lab-res.crit { box-shadow: inset 4px 0 0 #b91c1c; }
.lab-res .top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: baseline; }
.lab-res .acts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; align-items: center; }
.lbx.wide { max-width: 1040px; }
/* charges (Phase 3) */
.lab-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.lab-tbl { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.lab-tbl th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.lab-tbl td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.lab-tbl td.n, .lab-tbl th.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lab-tbl td.acts { white-space: nowrap; text-align: right; }
.lab-tbl td.acts .lab-b { margin-left: 4px; }
.lbx-test { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; }
.lbx-test h3 { margin: 0; font-size: 14px; }
`;

export function ensureCss() {
    if (!document.getElementById("lab-style")) {
        const st = document.createElement("style");
        st.id = "lab-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}

export const tube = (code, containers, extra = "", done = false) => {
    const c = containers[code] || ["Other", "#6b7280"];
    return `<span class="lab-tube ${done ? "done" : ""}" title="${esc(c[0])}"><i style="background:${esc(c[1])}"></i>${extra}</span>`;
};

export function modal(title, sub, bodyHtml, footHtml) {
    ensureCss();
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "lbx-ov";
    ov.innerHTML = `<div class="lbx" role="dialog" aria-modal="true" aria-labelledby="lbxTitle">
        <div class="lbx-head"><div><h2 id="lbxTitle">${title}</h2>${sub ? `<div class="lab-sub">${sub}</div>` : ""}</div><button type="button" class="lbx-x" data-x aria-label="Close">×</button></div>
        <div class="lbx-body">${bodyHtml}</div>
        <div class="lbx-foot"><span class="lbx-err" role="alert"></span>${footHtml}</div></div>`;
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
        $(".lbx-err").textContent = msg || "";
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

/* ---------------- labels ---------------- */

/** Label preview (in a dialog) for specimens just collected or reprinted. */
export function labelPreview(specimens) {
    return `<div class="lbx-labels">${specimens.map((s) => `<div class="lbx-label">${labelInner(s)}</div>`).join("")}</div>`;
}

function initials(name) {
    return String(name || "").split(/\s+/).filter(Boolean).map((x) => x[0].toUpperCase()).join("").slice(0, 3);
}

function labelInner(s) {
    const p = s.patient;
    const dob = p.birthdate ? `${p.birthdate}` : "DOB ?";
    return `<div style="display:flex;justify-content:space-between;gap:4px"><b style="font-size:12px">${esc(String(p.last_name || "").toUpperCase())}, ${esc(p.first_name || "")}</b>${s.priority === "stat" ? `<b style="background:#000;color:#fff;padding:0 3px">STAT</b>` : ""}</div>
        <div>${esc(p.mrn || "")} · ${esc(dob)} · ${esc(String(p.sex || "").charAt(0).toUpperCase())}</div>
        ${code128Svg(s.accession_no, { module: 1.4, height: 34, label: `Accession ${esc(s.accession_no)}` })}
        <div style="display:flex;justify-content:space-between;gap:4px"><b style="font-family:monospace;font-size:12px">${esc(s.accession_no)}</b><span>${esc(String(s.container_label).split(" (")[0])}</span></div>
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.tests.join(", "))}</div>
        <div>${esc(String(s.collected_at).slice(0, 16))} · ${esc(initials(s.collected_by))}${s.location ? ` · ${esc(s.location)}` : ""}</div>`;
}

/** Print 50 x 25 mm labels, one a page. */
export function printLabels(specimens) {
    const win = window.open("", "_blank");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print labels.", "error");
        return false;
    }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Specimen labels</title>
<style>
    @page { size: 50mm 25mm; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; }
    .l { width: 50mm; height: 25mm; box-sizing: border-box; padding: 1mm 1.5mm; overflow: hidden; font-size: 6.6pt; line-height: 1.15; page-break-after: always; }
    .l svg { width: 100%; height: 8mm; display: block; }
    .bar { padding: 8px; font-size: 13px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
    @media screen { .l { border: 1px dashed #999; margin: 8px; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print ${specimens.length} label${specimens.length === 1 ? "" : "s"}</button> Label printer: 50 × 25 mm, no margins.</div>
${specimens.map((s) => `<div class="l">${labelInner(s).replace(/font-size:12px/g, "font-size:7.4pt")}</div>`).join("")}
<script>setTimeout(function () { window.print(); }, 300);<\/script>
</body></html>`);
    win.document.close();
    return true;
}
