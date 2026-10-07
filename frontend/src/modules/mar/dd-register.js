import { fetchDdRegister } from "./mar.service.js?v=2";
import { showToast } from "../../core/toast.js";
import { todayISO, nowDateTime } from "../../core/timezone.js";

/*
 * Dangerous-drugs (DD) register (tab "dd_register"): every dose of a dangerous drug
 * (RA 9165, e.g. morphine, tramadol) given on the wards, numbered per medicine, with
 * the witness and any amount wasted. Entries are written from the MAR and never deleted.
 */

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (dt) => {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return "";
    const h = Number(m[4]);
    return `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${m[1]} ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
};
const dayFmt = (d) => {
    const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${m[1]}` : "";
};

export function DdRegisterView() {
    return `
<style>
.ddr-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1400px; min-width: 0; }
.ddr-page h1 { margin: 0; font-size: 22px; }
.ddr-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 860px; line-height: 1.5; }
.ddr-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 12px; }
.ddr-bar label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.ddr-bar input, .ddr-bar select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.ddr-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.ddr-btn:hover { background: var(--bg-surface-alt); }
.ddr-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ddr-totals { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.ddr-total { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 12px; background: var(--bg-surface); min-width: 180px; }
.ddr-total b { display: block; font-size: 13.5px; }
.ddr-total span { color: var(--text-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.ddr-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.ddr-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ddr-table th, .ddr-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.ddr-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.ddr-table td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.ddr-table tr:last-child td { border-bottom: 0; }
.ddr-table tr.void td { color: var(--text-muted); }
.ddr-table tr.void td.strike { text-decoration: line-through; }
.ddr-sub { color: var(--text-muted); font-size: 12px; }
.ddr-void { display: inline-block; font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 10px; border: 1px solid var(--border-color); color: var(--text-muted); }
.ddr-empty { padding: 32px 16px; text-align: center; color: var(--text-muted); }
@media (max-width: 700px) { .ddr-page { padding: 16px; } }
</style>
<div class="ddr-page" id="ddrPage">
    <h1>DD Register</h1>
    <p class="ddr-intro">Every dose of a dangerous drug (RA 9165, e.g. morphine, tramadol) given on the wards, numbered per medicine, with the nurse who gave it, the second nurse who witnessed it and any amount wasted. Entries are made automatically when the dose is recorded on the MAR; an entry made in error is voided, never removed.</p>
    <div class="ddr-bar">
        <div><label for="ddrFrom">From</label><input type="date" id="ddrFrom"></div>
        <div><label for="ddrTo">To</label><input type="date" id="ddrTo"></div>
        <div><label for="ddrDrug">Medicine</label><select id="ddrDrug"><option value="">All dangerous drugs</option></select></div>
        <div><label for="ddrWard">Ward</label><select id="ddrWard"><option value="">All wards</option></select></div>
        <button type="button" class="ddr-btn" id="ddrPrint">Print</button>
    </div>
    <div class="ddr-totals" id="ddrTotals"></div>
    <div class="ddr-card" id="ddrList"><div class="ddr-empty">Loading…</div></div>
</div>`;
}

let data = null;
let seq = 0;

export function initDdRegister() {
    const page = $("ddrPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    ["ddrFrom", "ddrTo", "ddrDrug", "ddrWard"].forEach((id) => $(id).addEventListener("change", load));
    $("ddrPrint").addEventListener("click", printRegister);
    load(true);
}

async function load(first = false) {
    const n = ++seq;
    const filters = first === true ? {} : { from: $("ddrFrom").value, to: $("ddrTo").value, drug_id: $("ddrDrug").value, ward: $("ddrWard").value };
    const res = await fetchDdRegister(filters).catch(() => null);
    if (n !== seq || !$("ddrList")) return;
    if (!res?.success) {
        $("ddrList").innerHTML = `<div class="ddr-empty">Could not load the register. ${esc(res?.message || "")}</div>`;
        return;
    }
    data = res.data;
    $("ddrFrom").value = data.from;
    $("ddrTo").value = data.to;
    $("ddrFrom").max = todayISO();
    const drug = $("ddrDrug").value;
    const ward = $("ddrWard").value;
    $("ddrDrug").innerHTML = `<option value="">All dangerous drugs</option>${data.drugs.map((d) => `<option value="${d.id}" ${String(d.id) === drug ? "selected" : ""}>${esc(d.name)}</option>`).join("")}`;
    $("ddrWard").innerHTML = `<option value="">All wards</option>${data.wards.map((w) => `<option ${w === ward ? "selected" : ""}>${esc(w)}</option>`).join("")}`;
    render();
}

function rowsHtml(list) {
    return list.map((r) => `<tr class="${r.voided ? "void" : ""}">
        <td class="num">#${r.entry_no}</td>
        <td class="num strike">${esc(fmt(r.given_at))}</td>
        <td class="strike"><strong>${esc(r.drug_name)}</strong></td>
        <td class="strike"><strong>${esc(r.patient_name || "")}</strong>${r.patient_mrn ? `<div class="ddr-sub">${esc(r.patient_mrn)}</div>` : ""}</td>
        <td class="strike">${esc(r.ward || "")}<div class="ddr-sub">${esc(r.bed || "")}</div></td>
        <td class="num strike">${esc(r.dose)} ${esc(r.route)}</td>
        <td class="strike">${r.wasted ? `${esc(r.wasted)}${r.waste_note ? `<div class="ddr-sub">${esc(r.waste_note)}</div>` : ""}` : `<span class="ddr-sub">—</span>`}</td>
        <td>${esc(r.given_by || "")}</td>
        <td>${esc(r.witness || "")}</td>
        <td>${esc(r.prescriber || "")}</td>
        <td>${r.voided ? `<span class="ddr-void">Void</span><div class="ddr-sub">${esc(r.void_reason || "")} — ${esc(r.voided_by || "")}, ${esc(fmt(r.voided_at))}</div>` : ""}</td>
    </tr>`).join("");
}

const HEAD = `<thead><tr><th>Entry</th><th>Given</th><th>Medicine</th><th>Patient</th><th>Ward / bed</th><th>Dose</th><th>Wasted</th><th>Given by</th><th>Witness</th><th>Prescriber</th><th></th></tr></thead>`;

function render() {
    $("ddrTotals").innerHTML = data.totals.length
        ? data.totals.map((t) => `<div class="ddr-total"><b>${esc(t.drug_name)}</b><span>${t.doses} dose${t.doses === 1 ? "" : "s"} · ${esc(t.given)} given${t.wasted ? ` · ${esc(t.wasted)} wasted` : ""}</span></div>`).join("")
        : "";
    $("ddrList").innerHTML = data.entries.length
        ? `<table class="ddr-table">${HEAD}<tbody>${rowsHtml(data.entries)}</tbody></table>`
        : `<div class="ddr-empty">No dangerous-drug doses ${esc(dayFmt(data.from))} – ${esc(dayFmt(data.to))}.</div>`;
}

/** A plain printable page of the register as filtered. */
function printRegister() {
    if (!data) return;
    const w = window.open("", "_blank");
    if (!w) {
        showToast("Allow pop-ups for this site to print the register.", "error");
        return;
    }
    const drug = $("ddrDrug").selectedOptions[0]?.textContent || "All dangerous drugs";
    const ward = $("ddrWard").selectedOptions[0]?.textContent || "All wards";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>DD Register</title><style>
        body { font: 12px/1.4 Arial, sans-serif; color: #111; margin: 24px; }
        h1 { font-size: 18px; margin: 0 0 4px; } p { margin: 0 0 10px; color: #444; }
        table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
        th { background: #eee; } tr.void td.strike { text-decoration: line-through; color: #666; } .ddr-sub { color: #555; font-size: 11px; }
        .ddr-void { font-weight: 700; } .sig { margin-top: 32px; display: flex; gap: 60px; } .sig div { border-top: 1px solid #111; padding-top: 4px; min-width: 220px; }
    </style></head><body>
        <h1>Dangerous Drugs Register</h1>
        <p>${esc(dayFmt(data.from))} – ${esc(dayFmt(data.to))} · ${esc(drug)} · ${esc(ward)} · printed ${esc(fmt(nowDateTime()))}</p>
        <p>${data.totals.map((t) => `${esc(t.drug_name)}: ${t.doses} dose(s), ${esc(t.given)} given${t.wasted ? `, ${esc(t.wasted)} wasted` : ""}`).join(" · ") || "No entries."}</p>
        <table>${HEAD}<tbody>${rowsHtml(data.entries)}</tbody></table>
        <div class="sig"><div>Checked by (pharmacist)</div><div>Date</div></div>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
}
