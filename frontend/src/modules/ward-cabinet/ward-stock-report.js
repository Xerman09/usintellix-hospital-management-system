import { fetchWardStockReport, reviewOverride, resolveDdCount } from "./ward-cabinet.service.js?v=3";
import { showToast } from "../../core/toast.js";

/*
 * Ward Stock Report (tab "ward_stock_report"): what the wards' medicine cabinets were used
 * for -- per department and per patient -- plus the override log (medicine taken before the
 * pharmacist verified the order) and the dangerous-drug shift counts with their discrepancies.
 * The pharmacy reviews overrides and resolves discrepancies here.
 */

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (dt) => {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return "";
    const h = Number(m[4]);
    return `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
};
const num = (n) => String(Math.round(Number(n || 0) * 1000) / 1000);
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function WardStockReportView() {
    return `
<style>
.wsr-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1400px; min-width: 0; }
.wsr-page h1 { margin: 0; font-size: 22px; }
.wsr-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 860px; line-height: 1.5; }
.wsr-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 12px; }
.wsr-bar label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.wsr-page input, .wsr-page select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.wsr-tiles { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.wsr-tile { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 14px; background: var(--bg-surface); min-width: 130px; }
.wsr-tile b { display: block; font-size: 18px; font-variant-numeric: tabular-nums; }
.wsr-tile span { color: var(--text-muted); font-size: 12px; }
.wsr-tile.warn { border-color: #dc2626; }
.wsr-tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid var(--border-color); margin-bottom: 12px; }
.wsr-tab { border: 0; background: none; color: var(--text-muted); padding: 8px 12px; font: inherit; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; }
.wsr-tab[aria-selected="true"] { color: var(--text-primary); border-bottom-color: var(--accent); }
.wsr-tab:focus-visible, .wsr-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.wsr-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
.wsr-card h3 { margin: 0 0 4px; font-size: 14.5px; }
.wsr-card.warn { border-left: 4px solid #dc2626; }
.wsr-sub { color: var(--text-muted); font-size: 12px; }
.wsr-wrap { overflow-x: auto; }
.wsr-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 6px; }
.wsr-table th, .wsr-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.wsr-table th { color: var(--text-muted); font-weight: 600; white-space: nowrap; }
.wsr-table td.num, .wsr-table th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.wsr-table tr:last-child td { border-bottom: 0; }
.wsr-badge { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.wsr-badge.bad { background: #fee2e2; color: #991b1b; border-color: transparent; }
.wsr-badge.good { background: #dcfce7; color: #166534; border-color: transparent; }
.wsr-badge.wait { background: #fef3c7; color: #92400e; border-color: transparent; }
:root[data-theme="dark"] .wsr-badge.bad { background: #7f1d1d; color: #fecaca; }
:root[data-theme="dark"] .wsr-badge.good { background: #14532d; color: #bbf7d0; }
:root[data-theme="dark"] .wsr-badge.wait { background: #78350f; color: #fde68a; }
.wsr-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 6px 11px; font-weight: 600; font-size: 12.5px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.wsr-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.wsr-btn:disabled { opacity: .55; cursor: default; }
.wsr-inline { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.wsr-inline input { flex: 1 1 260px; }
.wsr-err { color: #dc2626; font-size: 12px; }
.wsr-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); }
@media (max-width: 700px) { .wsr-page { padding: 16px; } }
</style>
<div class="wsr-page" id="wsrPage">
    <h1>Ward Stock Report</h1>
    <p class="wsr-intro">What the wards' medicine cabinets were used for, per department and per patient: doses given from the cabinet (taken out, or taken straight from its stock on the MAR), what was wasted or returned, the cost and what patients were charged. Also the override log (taken before the pharmacist verified the order) and the dangerous-drug shift counts.</p>
    <div class="wsr-bar">
        <div><label for="wsrFrom">From</label><input type="date" id="wsrFrom"></div>
        <div><label for="wsrTo">To</label><input type="date" id="wsrTo"></div>
        <div><label for="wsrWard">Department</label><select id="wsrWard"><option value="">All wards</option></select></div>
    </div>
    <div class="wsr-tiles" id="wsrTiles"></div>
    <div class="wsr-tabs" role="tablist" id="wsrTabs"></div>
    <div id="wsrBody"><div class="wsr-empty">Loading…</div></div>
</div>`;
}

let rep = null;
let tab = "dept";
let seq = 0;

export function initWardStockReport() {
    const page = $("wsrPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    tab = "dept";
    ["wsrFrom", "wsrTo", "wsrWard"].forEach((id) => $(id).addEventListener("change", () => load()));
    $("wsrTabs").addEventListener("click", (e) => {
        const t = e.target.closest("[data-tab-key]")?.dataset.tabKey;
        if (t) {
            tab = t;
            render();
        }
    });
    $("wsrBody").addEventListener("click", onClick);
    load(true);
}

async function load(first = false, message) {
    if (message) showToast(message);
    const n = ++seq;
    const res = await fetchWardStockReport(first === true ? {} : { from: $("wsrFrom").value, to: $("wsrTo").value, ward_id: $("wsrWard").value }).catch(() => null);
    if (n !== seq || !$("wsrBody")) return;
    if (!res?.success) {
        $("wsrBody").innerHTML = `<div class="wsr-empty">Could not load the report. ${esc(res?.message || "")}</div>`;
        return;
    }
    rep = res.data;
    $("wsrFrom").value = rep.from;
    $("wsrTo").value = rep.to;
    $("wsrWard").innerHTML = `<option value="">All wards</option>${rep.wards.map((w) => `<option value="${w.id}" ${w.id === rep.ward_id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}`;
    render();
}

function render() {
    const t = rep.totals;
    const toReview = rep.overrides.filter((o) => !o.reviewed_at).length;
    const open = rep.dd_counts.filter((c) => c.status === "discrepancy").length;
    $("wsrTiles").innerHTML = t ? `
        <div class="wsr-tile"><b>${t.doses}</b><span>doses from cabinets</span></div>
        <div class="wsr-tile"><b>${peso(t.charged)}</b><span>charged to patients</span></div>
        <div class="wsr-tile"><b>${peso(t.cost)}</b><span>stock cost (used + wasted)</span></div>
        <div class="wsr-tile ${toReview ? "warn" : ""}"><b>${rep.overrides.length}</b><span>overrides${toReview ? ` · ${toReview} to review` : ""}</span></div>
        <div class="wsr-tile ${open ? "warn" : ""}"><b>${open}</b><span>open count discrepancies</span></div>` : "";
    const tabs = [["dept", "Per department"], ["patient", "Per patient"], ["override", `Overrides${toReview ? ` (${toReview})` : ""}`], ["dd", `DD counts${open ? ` (${open})` : ""}`]];
    $("wsrTabs").innerHTML = tabs.map(([k, l]) => `<button type="button" role="tab" class="wsr-tab" data-tab-key="${k}" aria-selected="${tab === k}">${esc(l)}</button>`).join("");
    if (!rep.wards.length) {
        $("wsrBody").innerHTML = `<div class="wsr-empty">No ward has a medicine cabinet yet (Medicine Rounds → Supply settings).</div>`;
        return;
    }
    $("wsrBody").innerHTML = tab === "dept" ? deptHtml() : tab === "patient" ? patientHtml() : tab === "override" ? overrideHtml() : ddHtml();
}

const useCols = `<th class="num">Used</th><th class="num">Doses</th><th class="num">Wasted</th><th class="num">Returned</th><th class="num">Still out</th><th class="num">Cost</th><th class="num">Charged</th>`;
const useCells = (x) => `<td class="num">${esc(num(x.used))}</td><td class="num">${x.doses}</td><td class="num">${x.wasted ? esc(num(x.wasted)) : "—"}</td>
    <td class="num">${x.returned ? esc(num(x.returned)) : "—"}</td><td class="num">${x.out ? esc(num(x.out)) : "—"}</td><td class="num">${peso(x.cost)}</td><td class="num">${peso(x.charged)}</td>`;

function deptHtml() {
    if (!rep.departments.length) return `<div class="wsr-empty">No cabinet use in this period.</div>`;
    return rep.departments.map((d) => `<div class="wsr-card"><h3>${esc(d.ward_name)} <span class="wsr-sub">· ${esc(d.cabinet_name)}</span></h3>
        <div class="wsr-sub">${d.totals.doses} dose(s) · ${peso(d.totals.charged)} charged · ${peso(d.totals.cost)} cost${d.totals.overrides ? ` · ${d.totals.overrides} override(s)` : ""}</div>
        <div class="wsr-wrap"><table class="wsr-table"><thead><tr><th>Medicine</th>${useCols}</tr></thead><tbody>
            ${d.drugs.map((x) => `<tr><td>${esc(x.drug_name)} <span class="wsr-sub">(${esc(x.unit_name)})</span></td>${useCells(x)}</tr>`).join("")}
        </tbody></table></div></div>`).join("");
}

function patientHtml() {
    if (!rep.patients.length) return `<div class="wsr-empty">No cabinet use in this period.</div>`;
    return `<div class="wsr-card wsr-wrap"><table class="wsr-table"><thead><tr><th>Patient</th><th>Ward</th><th>Medicines</th><th class="num">Doses</th><th class="num">Wasted</th><th class="num">Charged</th></tr></thead><tbody>
        ${rep.patients.map((p) => `<tr><td><strong>${esc(p.patient_name)}</strong><div class="wsr-sub">${esc(p.admission_number)}${p.patient_mrn ? ` · ${esc(p.patient_mrn)}` : ""}</div></td>
            <td>${esc(p.ward_name)}</td>
            <td>${p.drugs.map((x) => `${esc(x.drug_name)} — ${esc(num(x.used))} ${esc(x.unit_name)}${x.wasted ? ` <span class="wsr-sub">(+${esc(num(x.wasted))} wasted)</span>` : ""}`).join("<br>")}</td>
            <td class="num">${p.totals.doses}</td><td class="num">${p.totals.wasted ? esc(num(p.totals.wasted)) : "—"}</td><td class="num">${peso(p.totals.charged)}</td></tr>`).join("")}
    </tbody></table></div>`;
}

const ORDER = { pending: ["wait", "Still waiting for the pharmacy"], verified: ["good", "Verified"], rejected: ["bad", "Rejected"], discontinued: ["", "Stopped"] };

function overrideHtml() {
    if (!rep.overrides.length) return `<div class="wsr-empty">No overrides in this period.</div>`;
    return rep.overrides.map((o) => {
        const [cls, label] = ORDER[o.order_status] || ["", o.order_status];
        return `<div class="wsr-card ${o.reviewed_at ? "" : "warn"}" data-ovr="${o.id}">
            <h3>${esc(o.drug_name)} — ${esc(num(o.quantity))} ${esc(o.unit_name)}(s) for ${esc(o.patient_name)} <span class="wsr-sub">(${esc(o.ward_name || "")} · ${esc(o.admission_number)})</span></h3>
            <div>Taken ${esc(fmt(o.withdrawn_at))} by <strong>${esc(o.withdrawn_by_name || "")}</strong> — reason: “${esc(o.reason)}” · <span class="wsr-badge">${esc(o.status)}</span></div>
            <div class="wsr-sub">Ordered by ${esc(o.ordered_by_name || "—")} · order: <span class="wsr-badge ${cls}">${label}</span>${o.verified_by_name ? ` by ${esc(o.verified_by_name)} ${esc(fmt(o.verified_at))}` : ""}${o.rejected_reason ? ` — ${esc(o.rejected_reason)}` : ""}</div>
            ${o.reviewed_at ? `<div class="wsr-sub"><strong>Reviewed</strong> by ${esc(o.reviewed_by_name || "")} ${esc(fmt(o.reviewed_at))}: ${esc(o.review_note)}</div>`
                : rep.can_review ? `<div class="wsr-inline"><input maxlength="255" placeholder="Review note (e.g. appropriate — STAT, verified after)" aria-label="Review note"><button type="button" class="wsr-btn primary" data-review="${o.id}">Mark reviewed</button><span class="wsr-err"></span></div>`
                : `<div class="wsr-sub">Not reviewed by the pharmacy yet.</div>`}
        </div>`;
    }).join("");
}

const COUNT = { ok: ["good", "✓ Matches"], discrepancy: ["bad", "⚠ Discrepancy"], resolved: ["", "Resolved"] };

function ddHtml() {
    if (!rep.dd_counts.length) return `<div class="wsr-empty">No dangerous-drug counts in this period.</div>`;
    return rep.dd_counts.map((c) => {
        const [cls, label] = COUNT[c.status];
        const diffs = c.lines.filter((l) => l.difference);
        return `<div class="wsr-card ${c.status === "discrepancy" ? "warn" : ""}" data-count="${c.id}">
            <h3>${esc(c.ward_name || c.cabinet_name)} · ${esc(c.shift_name)} ${esc(c.shift_date)} <span class="wsr-badge ${cls}">${label}</span></h3>
            <div class="wsr-sub">Counted ${esc(fmt(c.counted_at))} by ${esc(c.counted_by_name || "")}, witness ${esc(c.witness_name || "")} · ${c.lines.length} medicine(s)</div>
            ${diffs.length ? `<table class="wsr-table"><thead><tr><th>Medicine</th><th class="num">Counted</th><th class="num">System</th><th class="num">Difference</th><th>Note</th></tr></thead><tbody>
                ${diffs.map((l) => `<tr><td>${esc(l.drug_name)}</td><td class="num">${esc(num(l.counted))}</td><td class="num">${esc(num(l.expected))}</td><td class="num">${l.difference > 0 ? "+" : ""}${esc(num(l.difference))}</td><td>${esc(l.note || "")}</td></tr>`).join("")}
            </tbody></table>` : ""}
            ${c.resolved_at ? `<div class="wsr-sub"><strong>Resolved</strong> by ${esc(c.resolved_by_name || "")} ${esc(fmt(c.resolved_at))}: ${esc(c.resolution_note)}</div>` : ""}
            ${c.status === "discrepancy" && rep.can_resolve ? `<div class="wsr-inline"><input maxlength="500" placeholder="What was found / done (e.g. recounted, found; stock corrected with a Stock Count)" aria-label="Resolution"><button type="button" class="wsr-btn primary" data-resolve="${c.id}">Resolve</button><span class="wsr-err"></span></div>` : ""}
        </div>`;
    }).join("");
}

async function onClick(e) {
    const rev = e.target.closest("[data-review]")?.dataset.review;
    const res = e.target.closest("[data-resolve]")?.dataset.resolve;
    if (!rev && !res) return;
    const box = e.target.closest(".wsr-inline");
    const note = box.querySelector("input").value.trim();
    if (!note) {
        box.querySelector(".wsr-err").textContent = "Add a note.";
        return;
    }
    const btn = e.target.closest("button");
    btn.disabled = true;
    const r = await (rev ? reviewOverride(Number(rev), note) : resolveDdCount(Number(res), note)).catch(() => null);
    btn.disabled = false;
    if (!r?.success) {
        box.querySelector(".wsr-err").textContent = r?.message || "Could not save.";
        return;
    }
    load(false, r.message);
}
