/*
 * Shared pieces of the My Chart screens (the patient portal): styles and the small
 * formatting helpers. Phase 1 uses it for Test Results; later phases (visits,
 * billing, e-check-in) reuse the same shell so the portal reads as one thing.
 */

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 Oct 2026" -- a patient reads dates, not timestamps. */
export const dayLabel = (d) => {
    const s = String(d || "");
    return s ? `${Number(s.slice(8, 10))} ${MON[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}` : "";
};

/** "14 Oct 2026, 09:40" */
export const when = (dt) => {
    const s = String(dt || "");
    return s ? `${dayLabel(s)}${s.length > 10 ? `, ${s.slice(11, 16)}` : ""}` : "";
};

export const KIND_LABEL = { lab: "Laboratory", imaging: "Imaging" };

/** Lab sections and imaging modalities, in words a patient would use. */
export const CATEGORY_LABEL = {
    hematology: "Blood count", coagulation: "Blood clotting", chemistry: "Blood chemistry", blood_gas: "Blood gas",
    urinalysis: "Urine", microbiology: "Culture", serology: "Antibody test", blood_bank: "Blood bank", other: "Laboratory",
    xray: "X-ray", ultrasound: "Ultrasound", ct: "CT scan", mri: "MRI scan", fluoroscopy: "Fluoroscopy", mammography: "Mammogram",
};

export const categoryLabel = (c) => CATEGORY_LABEL[String(c || "").toLowerCase()] || "";

const CSS = `
.mc { padding: 20px 24px 40px; max-width: 1100px; margin: 0 auto; color: var(--text-primary); }
@media (max-width: 600px) { .mc { padding: 16px 16px 32px; } }
.mc h1 { margin: 0; font-size: 22px; }
.mc-sub { color: var(--text-muted); font-size: 13px; margin-top: 4px; max-width: 70ch; }
.mc-head { margin-bottom: 14px; }
.mc-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
.mc-tools input, .mc-tools select { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
.mc-tools input[type=search] { min-width: min(220px, 100%); }
.mc-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.mc-b.blue { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.mc-b.sm { padding: 4px 9px; font-size: 12.5px; }
.mc-b:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.mc .muted { color: var(--text-muted); }
.mc-empty { padding: 24px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.mc-list { display: grid; gap: 10px; }
.mc-row { display: flex; gap: 12px; align-items: flex-start; width: 100%; text-align: left; border: 1px solid var(--border-color); background: var(--bg-surface); border-radius: 12px; padding: 12px 14px; font: inherit; color: inherit; cursor: pointer; }
.mc-row:hover { border-color: #93c5fd; }
.mc-row:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.mc-row .mc-dot { width: 9px; height: 9px; border-radius: 50%; background: #dc2626; margin-top: 6px; flex: 0 0 auto; }
.mc-row .mc-dot.seen { background: transparent; }
.mc-row .mc-main { flex: 1 1 auto; min-width: 0; }
.mc-row .mc-name { font-weight: 600; }
.mc-row .mc-meta { color: var(--text-muted); font-size: 12.5px; margin-top: 2px; }
.mc-row .mc-right { flex: 0 0 auto; text-align: right; font-size: 12.5px; color: var(--text-muted); }
.mc-chip { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11.5px; font-weight: 700; border: 1px solid var(--border-color); margin-left: 6px; vertical-align: 1px; }
.mc-chip.kind { color: var(--text-muted); }
.mc-chip.abn { background: #fef3c7; border-color: #fcd34d; color: #78350f; }
:root[data-theme="dark"] .mc-chip.abn { background: #422006; border-color: #92400e; color: #fde68a; }
.mc-panel { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); padding: 16px 18px; margin-top: 14px; }
.mc-panel h2 { margin: 0 0 2px; font-size: 18px; }
.mc-panel .mc-meta { color: var(--text-muted); font-size: 12.5px; }
.mc-tbl { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13.5px; }
.mc-tbl th { text-align: left; padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.mc-tbl td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.mc-tbl td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.mc-tbl tr.abn td { background: #fffbeb; }
:root[data-theme="dark"] .mc-tbl tr.abn td { background: #2a2208; }
.mc-tbl tr.abn td.n { font-weight: 700; }
.mc-report { margin-top: 12px; display: grid; gap: 10px; }
.mc-report section { border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; }
.mc-report h3 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.mc-report p { margin: 0; white-space: pre-wrap; }
/* explanation of a test, in the hospital's own words */
.mc-exp { margin-top: 10px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface-alt); }
.mc-exp > summary { cursor: pointer; padding: 9px 12px; font-size: 13px; font-weight: 600; list-style: none; }
.mc-exp > summary::-webkit-details-marker { display: none; }
.mc-exp > summary::before { content: "▸"; display: inline-block; margin-right: 7px; transition: transform .15s; }
.mc-exp[open] > summary::before { transform: rotate(90deg); }
.mc-exp > summary:focus-visible { outline: 3px solid #93c5fd; outline-offset: -3px; border-radius: 10px; }
.mc-exp .mc-expbody { padding: 0 12px 12px; display: grid; gap: 8px; font-size: 13px; }
.mc-exp dt { font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: var(--text-muted); }
.mc-exp dd { margin: 2px 0 0; }
.mc-exp .mc-src { color: var(--text-muted); font-size: 12px; }
/* trend */
.mc-trend { margin-top: 10px; border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; background: var(--bg-surface); }
.mc-trend h4 { margin: 0 0 2px; font-size: 13px; }
.mc-trend .mc-tmeta { color: var(--text-muted); font-size: 12px; margin-bottom: 6px; }
.mc-trend svg { display: block; width: 100%; height: auto; overflow: visible; }
.mc-trend svg .band { fill: #22c55e; opacity: .12; }
.mc-trend svg .grid { stroke: var(--border-color); stroke-width: 1; }
.mc-trend svg .axis { fill: var(--text-muted); font-size: 10px; }
.mc-trend svg .line { fill: none; stroke: #1d4ed8; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.mc-trend svg .pt { fill: #1d4ed8; }
.mc-trend svg .pt.abn { fill: #b45309; }
.mc-trend svg .last { fill: var(--text-primary); font-size: 11px; font-weight: 700; }
/* Dark mode gets its own steps: #1d4ed8 on a dark surface is too close to the background
   to read, so the line and the points lift a few steps rather than being flipped. */
:root[data-theme="dark"] .mc-trend svg .line { stroke: #60a5fa; }
:root[data-theme="dark"] .mc-trend svg .pt { fill: #60a5fa; }
:root[data-theme="dark"] .mc-trend svg .pt.abn { fill: #fbbf24; }
:root[data-theme="dark"] .mc-trend svg .band { fill: #4ade80; opacity: .16; }
/* ask */
.mc-ask { margin-top: 12px; display: grid; gap: 8px; }
.mc-ask textarea { width: 100%; box-sizing: border-box; min-height: 80px; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13.5px; background: var(--bg-surface); color: var(--text-primary); resize: vertical; }
.mc-ask .mc-askrow { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.mc-err { color: #b91c1c; font-size: 12.5px; }
:root[data-theme="dark"] .mc-err { color: #fca5a5; }
/* visits (Phase 3) */
.mc-h2 { font-size: 17px; margin: 18px 0 8px; }
.mc-row.static { cursor: default; display: flex; }
.mc-row.static:hover { border-color: var(--border-color); }
.mc-row .mc-b { margin-top: 8px; }
.mc-prep { margin-top: 8px; border-left: 3px solid #1d4ed8; background: var(--bg-surface-alt); border-radius: 0 8px 8px 0; padding: 7px 10px; font-size: 12.5px; }
.mc-prep b { display: block; margin-bottom: 2px; }
.mc-prep ul { margin: 0; padding-left: 18px; }
.mc-panel h2 { margin: 0 0 2px; }
.mc-panel .mc-lead { margin: 8px 0 12px; }
.mc-sec { margin-top: 14px; }
.mc-sec h3 { margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 3px; }
.mc-sec p { margin: 0; white-space: pre-wrap; }
.mc-sec ul { margin: 0; padding-left: 20px; }
.mc-sec li { margin-bottom: 3px; }
/* billing (Phase 4) */
.mc-billbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 14px; }
.mc-bill-owed { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 16px; background: var(--bg-surface); }
.mc-bill-owed.due { border-color: #fcd34d; background: #fffbeb; }
:root[data-theme="dark"] .mc-bill-owed.due { background: #2a2208; border-color: #92400e; }
.mc-bill-label { display: block; font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.mc-bill-amount { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
.mc-bill-note { flex: 1 1 260px; font-size: 12.5px; color: var(--text-muted); border-left: 3px solid #1d4ed8; padding: 4px 0 4px 10px; }
.mc-bill-note b { color: var(--text-primary); }
.mc-billdate { margin: 0 0 6px; font-size: 14px; }
.mc-tbl tr.mc-tot td { border-top: 2px solid var(--border-color); border-bottom: 0; font-weight: 700; }
/* e-check-in (Phase 5) */
.mc-chip.ok { background: #dcfce7; border-color: #86efac; color: #14532d; }
:root[data-theme="dark"] .mc-chip.ok { background: #052e16; border-color: #166534; color: #bbf7d0; }
.mc-done { border: 1px solid #86efac; background: #f0fdf4; color: #14532d; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-weight: 600; }
:root[data-theme="dark"] .mc-done { background: #052e16; border-color: #166534; color: #bbf7d0; }
.mc-steps { display: grid; gap: 10px; }
.mc-step { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); }
.mc-step.done { border-color: #86efac; }
:root[data-theme="dark"] .mc-step.done { border-color: #166534; }
.mc-step-head { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; }
.mc-step-head > span:nth-child(2) { flex: 1 1 auto; min-width: 0; }
.mc-step-head .mc-meta { display: block; }
.mc-step-tick { flex: 0 0 22px; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--border-color); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; color: #15803d; }
.mc-step.done .mc-step-tick { background: #dcfce7; border-color: #86efac; }
:root[data-theme="dark"] .mc-step.done .mc-step-tick { background: #052e16; border-color: #166534; color: #bbf7d0; }
.mc-step-body:empty { display: none; }
.mc-form { padding: 0 14px 14px; display: grid; gap: 10px; }
.mc-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.mc-field label, .mc-qlabel { display: block; font-weight: 600; font-size: 12.5px; margin-bottom: 3px; }
.mc-field input[type=text], .mc-field input[type=tel], .mc-field input[type=email], .mc-field input[type=file], .mc-field input[type=number], .mc-field input[type=datetime-local], .mc-field input[type=date], .mc-field select, .mc-field textarea {
    width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; font-size: 13.5px; background: var(--bg-surface); color: var(--text-primary); }
.mc-field textarea { min-height: 70px; resize: vertical; }
.mc-check { display: block; font-size: 13px; margin-bottom: 4px; }
.mc-radios { display: inline-flex; gap: 14px; flex-wrap: wrap; font-size: 13px; }
.mc-formrow { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.mc-req { font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: .03em; }
:root[data-theme="dark"] .mc-req { color: #fbbf24; }
/* to-do and notifications (Phase 6) */
.mc-todobar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.mc-todocount { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 16px; background: var(--bg-surface); }
.mc-todocount.due { border-color: #fcd34d; background: #fffbeb; }
:root[data-theme="dark"] .mc-todocount.due { background: #2a2208; border-color: #92400e; }
.mc-row.mc-todo-overdue { border-left: 3px solid #dc2626; }
.mc-row.mc-todo-todo { border-left: 3px solid #1d4ed8; }
.mc-row.mc-unread { border-left: 3px solid #1d4ed8; }
.mc-switch { display: inline-flex; align-items: center; cursor: pointer; }
.mc-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.mc-switch span { width: 38px; height: 21px; border-radius: 999px; background: var(--border-color); position: relative; transition: background .15s; }
.mc-switch span::after { content: ""; position: absolute; top: 2px; left: 2px; width: 17px; height: 17px; border-radius: 50%; background: #fff; transition: transform .15s; }
.mc-switch input:checked + span { background: #1d4ed8; }
.mc-switch input:checked + span::after { transform: translateX(17px); }
.mc-switch input:disabled + span { opacity: .4; cursor: not-allowed; }
.mc-switch input:focus-visible + span { outline: 3px solid #93c5fd; outline-offset: 2px; }
.mc-wrap { overflow-x: auto; }
.mc-note { margin-top: 14px; padding: 10px 12px; border: 1px solid var(--border-color); border-left: 3px solid #1d4ed8; border-radius: 8px; background: var(--bg-surface-alt); font-size: 12.5px; color: var(--text-muted); }
/* track my health (Phase 7) */
.mc-kinds { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-bottom: 14px; }
.mc-kind { text-align: left; border: 1px solid var(--border-color); background: var(--bg-surface); color: inherit; border-radius: 12px; padding: 10px 12px; font: inherit; cursor: pointer; display: grid; gap: 2px; }
.mc-kind:hover { border-color: #93c5fd; }
.mc-kind:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.mc-kind.on { border-color: #1d4ed8; box-shadow: inset 0 0 0 1px #1d4ed8; }
:root[data-theme="dark"] .mc-kind.on { border-color: #60a5fa; box-shadow: inset 0 0 0 1px #60a5fa; }
.mc-kind-label { font-weight: 600; }
.mc-kind-val { font-size: 13px; }
.mc-kind-meta { font-size: 12px; color: var(--text-muted); }
/* "self-reported" is never left to be inferred: it is on the heading, the graph and the panel */
.mc-chip.self { background: var(--bg-surface-alt); color: var(--text-muted); font-weight: 600; letter-spacing: .02em; }
.mc-trackform { padding: 12px 0 0; }
.mc-goalrow { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; padding: 9px 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface-alt); font-size: 13px; }
.mc-goalrow > span { flex: 1 1 240px; }
.mc-goalform { margin-top: 12px; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface-alt); display: grid; gap: 10px; }
/* the second number of a paired reading (blood pressure's diastolic) */
.mc-trend svg .line.second { stroke: #0f766e; stroke-dasharray: 4 3; }
.mc-trend svg .pt.second { fill: #0f766e; }
:root[data-theme="dark"] .mc-trend svg .line.second { stroke: #5eead4; }
:root[data-theme="dark"] .mc-trend svg .pt.second { fill: #5eead4; }
.mc-flag { border: 1px solid #fcd34d; background: #fffbeb; color: #78350f; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; font-weight: 600; }
:root[data-theme="dark"] .mc-flag { background: #2a2208; border-color: #92400e; color: #fde68a; }
.mc-confirm { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 12.5px; }
/* account and sharing (Phase 8) */
.mc-checks { display: grid; gap: 4px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.mc-checks .mc-check { margin: 0; }
.mc-row.mc-dim { opacity: .62; }
.mc-link { display: block; margin-top: 4px; font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: 11.5px; color: var(--text-muted); word-break: break-all; }
.mc-panel + .mc-panel { margin-top: 14px; }
`;

export function ensureCss() {
    if (!document.getElementById("mychart-style")) {
        const st = document.createElement("style");
        st.id = "mychart-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}
