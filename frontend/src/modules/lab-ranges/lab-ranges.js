import { api } from "../../core/api.js?v=5";
import { getUser } from "../../core/session.js?v=2";
import { showToast } from "../../core/toast.js";

/*
 * Critical Lab Ranges (tab "lab_critical_ranges", admin): each lab test's normal range and
 * critical limits (or, for text results, the critical and normal values). Results are flagged
 * Normal / Abnormal / Critical against these when they're entered or imported.
 */

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const post = (path, body, method = "POST") => api(path, { method, body: JSON.stringify(body) });
const n = (v) => (v === null || v === undefined || v === "" ? "" : String(Number(v)));
const FIELDS = ["name", "code", "aliases", "units", "normal_low", "normal_high", "critical_low", "critical_high", "critical_values", "normal_values", "notes"];

export function LabRangesView() {
    return `
<style>
.lrg-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1400px; min-width: 0; }
.lrg-page h1 { margin: 0; font-size: 22px; }
.lrg-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 900px; line-height: 1.5; }
.lrg-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.lrg-page input, .lrg-page select, .lrg-page textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.lrg-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.lrg-btn:hover { background: var(--bg-surface-alt); }
.lrg-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.lrg-btn.danger { color: #b91c1c; }
.lrg-btn:disabled { opacity: .55; cursor: default; }
.lrg-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.lrg-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.lrg-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.lrg-table th, .lrg-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.lrg-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.lrg-table td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.lrg-table tr.off td { color: var(--text-muted); }
.lrg-table tr:last-child td { border-bottom: 0; }
.lrg-sub { color: var(--text-muted); font-size: 12px; }
.lrg-crit { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .lrg-crit { color: #fca5a5; }
.lrg-form { background: var(--bg-surface); border: 1px solid var(--accent-border, var(--border-color)); border-radius: 12px; padding: 14px; margin-bottom: 14px; }
.lrg-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 12px; }
.lrg-grid .span2 { grid-column: span 2; }
.lrg-grid .full { grid-column: 1 / -1; }
.lrg-grid label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.lrg-grid input { width: 100%; }
.lrg-grid [aria-invalid="true"] { border-color: #dc2626; }
@media (max-width: 760px) { .lrg-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .lrg-grid .span2 { grid-column: 1 / -1; } .lrg-page { padding: 16px; } }
.lrg-err { color: #dc2626; font-size: 12px; }
.lrg-flag { display: inline-block; font-size: 11.5px; font-weight: 800; padding: 2px 8px; border-radius: 10px; }
.lrg-flag.critical { background: #dc2626; color: #fff; }
.lrg-flag.abnormal { background: #fef3c7; color: #92400e; }
.lrg-flag.normal { background: #dcfce7; color: #166534; }
:root[data-theme="dark"] .lrg-flag.abnormal { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .lrg-flag.normal { background: #14532d; color: #bbf7d0; }
.lrg-try { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; }
.lrg-try input { width: 150px; }
</style>
<div class="lrg-page" id="lrgPage">
    <h1>Critical Lab Ranges</h1>
    <p class="lrg-intro">The normal range and the critical (panic) limits of each lab test. When a result is entered or imported it is matched by its code, name or an alias, and flagged <strong>Normal</strong>, <strong>Abnormal</strong> (outside the normal range) or <strong>Critical</strong> (below the critical low, above the critical high, or a critical text value such as “positive”). Limits apply only to results in the same units. Changing a range affects new results; saved ones keep their flag.</p>
    <div class="lrg-try" id="lrgTry">
        <strong>Try a value:</strong>
        <input id="lrgTName" placeholder="Test (e.g. Potassium)" aria-label="Test">
        <input id="lrgTValue" placeholder="Value (e.g. 6.8)" aria-label="Value">
        <input id="lrgTUnits" placeholder="Units (e.g. mmol/L)" aria-label="Units">
        <button type="button" class="lrg-btn" id="lrgTGo">Check</button>
        <span id="lrgTOut" aria-live="polite"></span>
    </div>
    <div class="lrg-bar">
        <input id="lrgSearch" placeholder="Search tests…" aria-label="Search tests" style="min-width:220px">
        <span id="lrgAddWrap"></span>
    </div>
    <div id="lrgFormBox"></div>
    <div class="lrg-card" id="lrgList"><div class="lrg-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

let rows = [];
const canEdit = () => getUser()?.role === "admin";

export function initLabRanges() {
    const page = $("lrgPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    if (canEdit()) {
        $("lrgAddWrap").innerHTML = `<button type="button" class="lrg-btn primary" id="lrgAdd">+ Add a test</button>`;
        $("lrgAdd").onclick = () => form(null);
    }
    $("lrgSearch").addEventListener("input", render);
    $("lrgList").addEventListener("click", onClick);
    $("lrgTGo").onclick = tryValue;
    ["lrgTName", "lrgTValue", "lrgTUnits"].forEach((id) => $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") tryValue(); }));
    load();
}

async function load(message) {
    if (message) showToast(message);
    const r = await api("/lab-ranges").catch(() => null);
    if (!$("lrgList")) return;
    if (!r?.success) {
        $("lrgList").innerHTML = `<div class="lrg-sub" style="padding:24px;text-align:center">Could not load the ranges. ${esc(r?.message || "")}</div>`;
        return;
    }
    rows = r.data;
    render();
}

function render() {
    const q = $("lrgSearch").value.trim().toLowerCase();
    const list = rows.filter((r) => !q || [r.name, r.code, r.aliases].some((x) => (x || "").toLowerCase().includes(q)));
    if (!list.length) {
        $("lrgList").innerHTML = `<div class="lrg-sub" style="padding:24px;text-align:center">${rows.length ? "No test matches." : "No ranges yet."}</div>`;
        return;
    }
    const range = (lo, hi) => (lo == null && hi == null ? "—" : lo != null && hi != null ? `${n(lo)} – ${n(hi)}` : lo != null ? `≥ ${n(lo)}` : `≤ ${n(hi)}`);
    $("lrgList").innerHTML = `<table class="lrg-table"><thead><tr><th>Test</th><th>Units</th><th>Normal</th><th>Critical low</th><th>Critical high</th><th>Critical text values</th><th>Flagged</th><th></th></tr></thead><tbody>
        ${list.map((r) => `<tr class="${r.is_active ? "" : "off"}" data-id="${r.id}">
            <td><strong>${esc(r.name)}</strong>${r.is_active ? "" : ` <span class="lrg-sub">(off)</span>`}<div class="lrg-sub">${esc([r.code, r.aliases].filter(Boolean).join(" · "))}</div>${r.notes ? `<div class="lrg-sub">${esc(r.notes)}</div>` : ""}</td>
            <td>${esc(r.units || "any")}</td>
            <td class="num">${range(r.normal_low, r.normal_high)}</td>
            <td class="num ${r.critical_low != null ? "lrg-crit" : ""}">${r.critical_low != null ? `&lt; ${n(r.critical_low)}` : "—"}</td>
            <td class="num ${r.critical_high != null ? "lrg-crit" : ""}">${r.critical_high != null ? `&gt; ${n(r.critical_high)}` : "—"}</td>
            <td>${r.critical_values ? `<span class="lrg-crit">${esc(r.critical_values)}</span>` : "—"}${r.normal_values ? `<div class="lrg-sub">Normal: ${esc(r.normal_values)}</div>` : ""}</td>
            <td class="num">${r.results_flagged}</td>
            <td>${canEdit() ? `<button type="button" class="lrg-btn" data-edit="${r.id}">Edit</button>` : ""}</td></tr>`).join("")}
    </tbody></table>`;
}

function onClick(e) {
    const id = Number(e.target.closest("[data-edit]")?.dataset.edit || 0);
    if (id) form(rows.find((r) => r.id === id));
}

function form(r) {
    const box = $("lrgFormBox");
    const v = (k) => esc(r && r[k] != null ? (["normal_low", "normal_high", "critical_low", "critical_high"].includes(k) ? n(r[k]) : r[k]) : "");
    const field = (k, label, cls = "", ph = "") => `<div class="${cls}"><label for="lrgF_${k}">${label}</label><input id="lrgF_${k}" data-f="${k}" value="${v(k)}" placeholder="${esc(ph)}"></div>`;
    box.innerHTML = `<div class="lrg-form"><h3 style="margin:0 0 10px;font-size:15px">${r ? `Edit ${esc(r.name)}` : "Add a test"}</h3>
        <div class="lrg-grid">
            ${field("name", "Test name", "span2", "e.g. Potassium")}${field("code", "Code (LOINC / lab code)", "", "e.g. 2823-3")}${field("units", "Units (blank = any)", "", "e.g. mmol/L")}
            ${field("aliases", "Other names results come in as (comma-separated)", "full", "e.g. K, Serum potassium")}
            ${field("normal_low", "Normal low", "", "3.5")}${field("normal_high", "Normal high", "", "5.1")}
            ${field("critical_low", "Critical when below", "", "2.5")}${field("critical_high", "Critical when above", "", "6.5")}
            ${field("critical_values", "Critical text results (comma-separated)", "span2", "e.g. positive, reactive, detected")}
            ${field("normal_values", "Normal text results (comma-separated)", "span2", "e.g. negative, non-reactive")}
            ${field("notes", "Notes", "full")}
            <div class="full"><label style="display:flex;gap:6px;align-items:center;font-weight:600;color:var(--text-primary)"><input type="checkbox" id="lrgF_active" ${!r || r.is_active ? "checked" : ""} style="width:auto"> In use</label></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button type="button" class="lrg-btn primary" id="lrgSave">Save</button><button type="button" class="lrg-btn" id="lrgCancel">Cancel</button>
            ${r ? `<button type="button" class="lrg-btn danger" id="lrgDelete" style="margin-left:auto">Remove…</button>` : ""}</div>
        <div class="lrg-err" id="lrgErr" role="alert"></div></div>`;
    $("lrgF_name").focus();
    $("lrgCancel").onclick = () => { box.innerHTML = ""; };
    $("lrgSave").onclick = async (ev) => {
        const data = { id: r?.id, is_active: $("lrgF_active").checked ? 1 : 0 };
        FIELDS.forEach((k) => { data[k] = $(`lrgF_${k}`).value.trim(); });
        box.querySelectorAll("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));
        ev.target.disabled = true;
        const res = await post("/lab-ranges", data).catch(() => null);
        ev.target.disabled = false;
        if (!res?.success) {
            $("lrgErr").textContent = res?.message || "Could not save.";
            Object.keys(res?.errors || {}).forEach((k) => $(`lrgF_${k}`)?.setAttribute("aria-invalid", "true"));
            return;
        }
        box.innerHTML = "";
        load(res.message);
    };
    if (r) {
        $("lrgDelete").onclick = (ev) => {
            // In-page confirmation (no browser dialogs).
            ev.target.outerHTML = `<span style="margin-left:auto" class="lrg-sub">Remove the range for ${esc(r.name)}${r.results_flagged ? ` (${r.results_flagged} results keep their flag)` : ""}?
                <button type="button" class="lrg-btn danger" id="lrgDelYes">Remove</button></span>`;
            $("lrgDelYes").onclick = async () => {
                const res = await post("/lab-ranges", { id: r.id }, "DELETE").catch(() => null);
                if (!res?.success) { $("lrgErr").textContent = res?.message || "Could not remove."; return; }
                box.innerHTML = "";
                load(res.message);
            };
        };
    }
    box.scrollIntoView({ block: "nearest" });
}

async function tryValue() {
    const name = $("lrgTName").value.trim();
    const value = $("lrgTValue").value.trim();
    if (!name || !value) {
        $("lrgTOut").textContent = "Enter a test and a value.";
        return;
    }
    const r = await post("/lab-ranges/test", { name, code: name, value, units: $("lrgTUnits").value.trim() }).catch(() => null);
    if (!r?.success) {
        $("lrgTOut").textContent = r?.message || "Could not check.";
        return;
    }
    const f = r.data;
    $("lrgTOut").innerHTML = f.flag
        ? `<span class="lrg-flag ${f.flag}">${f.flag === "critical" ? "⚠ CRITICAL" : f.flag === "abnormal" ? "▲▼ Abnormal" : "✓ Normal"}</span> ${esc(f.detail || "")}${f.range ? ` <span class="lrg-sub">— ${esc(f.range.name)} (${esc(f.range.units || "any units")})</span>` : ""}`
        : `<span class="lrg-sub">Not flagged: ${f.range ? "not compared — enter the units (limits apply only to results in the same units)" : "no range for this test"}.</span>`;
}
