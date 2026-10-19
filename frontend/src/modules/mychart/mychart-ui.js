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
.mc-note { margin-top: 14px; padding: 10px 12px; border: 1px solid var(--border-color); border-left: 3px solid #1d4ed8; border-radius: 8px; background: var(--bg-surface-alt); font-size: 12.5px; color: var(--text-muted); }
`;

export function ensureCss() {
    if (!document.getElementById("mychart-style")) {
        const st = document.createElement("style");
        st.id = "mychart-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}
