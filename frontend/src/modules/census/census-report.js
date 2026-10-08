import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * Census reports (module 11, Phase 2; tab "census_report"), from the saved daily census:
 * bed occupancy rate, average length of stay, admissions / discharges / deaths per month (or per
 * day for one month), by ward. Charts with a table view; printable.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`);
const days = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)} d`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (p, group, long = false) => {
    if (group === "day") {
        const [, m, d] = p.split("-");
        return long ? `${Number(d)} ${MONTHS[Number(m) - 1]}` : String(Number(d));
    }
    const [y, m] = p.split("-");
    return long ? `${MONTHS[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};
const monthName = (ym) => label(ym, "month", true);

const CSS = `
.crp { padding: 20px 24px 40px; max-width: 1280px; margin: 0 auto; color: var(--text-primary);
    --cr-s1: #2a78d6; --cr-s2: #eb6834; --cr-grid: #e5e7eb; --cr-axis: #6b7280; }
:root[data-theme="dark"] .crp { --cr-s1: #3987e5; --cr-s2: #d95926; --cr-grid: #334155; --cr-axis: #94a3b8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .crp { --cr-s1: #3987e5; --cr-s2: #d95926; --cr-grid: #334155; --cr-axis: #94a3b8; } }
@media (max-width: 600px) { .crp { padding: 16px 16px 32px; } }
.crp h1 { margin: 0; font-size: 22px; }
.crp-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.crp-f { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 14px 0; }
.crp-f > div { min-width: 0; max-width: 100%; }
.crp-f label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.crp-f input, .crp-f select { max-width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.crp-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font: inherit; font-weight: 600; cursor: pointer; }
.crp-b.go { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.crp-b:focus-visible, .crp-f input:focus-visible, .crp-f select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.crp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 16px; }
.crp-tile { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; background: var(--bg-surface); }
.crp-tile small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.crp-tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.crp-tile span { font-size: 12px; color: var(--text-muted); }
.crp-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 14px; }
.crp-chart { border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 12px 6px; background: var(--bg-surface); position: relative; min-width: 0; }
.crp-chart h3 { margin: 0 0 2px; font-size: 14px; }
.crp-chart .crp-sub { font-size: 12px; margin: 0 0 6px; }
.crp-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-secondary, var(--text-muted)); margin-bottom: 4px; }
.crp-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.crp-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.crp-chart svg text { fill: var(--cr-axis); font-size: 10px; font-family: inherit; }
.crp-tip { position: absolute; pointer-events: none; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px;
    padding: 6px 9px; font-size: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.15); white-space: nowrap; z-index: 2; }
.crp-tip b { display: block; margin-bottom: 2px; }
.crp-tip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; }
.crp h2 { font-size: 16px; margin: 22px 0 8px; }
.crp-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.crp table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.crp th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.crp td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); }
.crp .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.crp tfoot td { font-weight: 700; background: var(--bg-surface-alt); }
.crp .muted { color: var(--text-muted); }
.crp-empty { padding: 22px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
`;

let state = { from: "", to: "", ward_id: "", group: "month" };
let last = null;

export function CensusReportView() {
    if (!document.getElementById("crp-style")) {
        const st = document.createElement("style");
        st.id = "crp-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    return `<div class="crp" id="censusReport"><div class="crp-empty">Loading…</div></div>`;
}

export function initCensusReport() {
    load();
}

async function load() {
    const root = document.getElementById("censusReport");
    if (!root) return;
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const r = await api(`/census/report?${q}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="crp-empty">${esc(r?.message || "Could not load the report.")}</div>`;
        return;
    }
    last = r.data;
    state = { from: last.from, to: last.to, ward_id: last.ward_id ? String(last.ward_id) : "", group: last.group };
    render(root, last);
}

/* ---------------- charts (inline SVG) ---------------- */

const W = 560;
const H = 220;
const M = { l: 40, r: 10, t: 10, b: 28 };

function niceMax(v, floor) {
    const m = Math.max(v, floor);
    const step = Math.pow(10, Math.floor(Math.log10(m)));
    for (const k of [1, 2, 2.5, 5, 10]) if (k * step >= m) return k * step;
    return 10 * step;
}

function axes(max, n, labels, every, fmt, pal) {
    const ih = H - M.t - M.b;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
    const bw = (W - M.l - M.r) / n;
    return ticks.map((t) => {
        const y = M.t + ih - (t / max) * ih;
        return `<line x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}" stroke="${pal.grid}" stroke-width="1"/><text x="${M.l - 6}" y="${y + 3}" text-anchor="end"${pal.text ? ` fill="${pal.text}"` : ""}>${fmt(t)}</text>`;
    }).join("") + labels.map((l, i) => (i % every === 0 ? `<text x="${M.l + bw * i + bw / 2}" y="${H - 8}" text-anchor="middle"${pal.text ? ` fill="${pal.text}"` : ""}>${esc(l)}</text>` : "")).join("");
}

/** One line (occupancy, ALOS). Points with no value leave a gap. */
function lineChart(points, labels, opts, pal) {
    const n = points.length;
    const vals = points.filter((v) => v !== null);
    const max = opts.max ?? niceMax(vals.length ? Math.max(...vals) : 1, opts.floor || 1);
    const ih = H - M.t - M.b;
    const bw = (W - M.l - M.r) / n;
    const x = (i) => M.l + bw * i + bw / 2;
    const y = (v) => M.t + ih - (v / max) * ih;
    let d = "";
    let pen = false;
    points.forEach((v, i) => {
        if (v === null) {
            pen = false;
            return;
        }
        d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
    });
    const every = Math.ceil(n / 12);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title)}">${axes(max, n, labels, every, opts.fmt, pal)}
        <path d="${d}" fill="none" stroke="${pal.s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${points.map((v, i) => (v === null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="${n > 20 ? 3 : 4}" fill="${pal.s1}" stroke="${pal.surface}" stroke-width="2"/>`)).join("")}
        ${opts.hover ? points.map((_, i) => `<rect x="${M.l + bw * i}" y="${M.t}" width="${bw}" height="${ih}" fill="transparent" data-i="${i}"/>`).join("") : ""}</svg>`;
}

/** Admissions and discharges side by side per period. */
function barsChart(a, b, labels, opts, pal) {
    const n = a.length;
    const max = niceMax(Math.max(1, ...a, ...b), 4);
    const ih = H - M.t - M.b;
    const bw = (W - M.l - M.r) / n;
    const gap = 2;
    const barW = Math.max(2, Math.min(18, (bw - 6) / 2 - gap / 2));
    const y = (v) => M.t + ih - (v / max) * ih;
    // Rounded data end (top), square at the baseline.
    const bar = (x, v, color) => {
        if (!v) return "";
        const top = y(v);
        const h = M.t + ih - top;
        const r = Math.min(4, barW / 2, h);
        return `<path d="M${x},${M.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${M.t + ih} Z" fill="${color}"/>`;
    };
    const every = Math.ceil(n / 12);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title)}">${axes(max, n, labels, every, (t) => Math.round(t), pal)}
        ${a.map((v, i) => {
            const cx = M.l + bw * i + bw / 2;
            return bar(cx - barW - gap / 2, v, pal.s1) + bar(cx + gap / 2, b[i], pal.s2);
        }).join("")}
        ${opts.hover ? a.map((_, i) => `<rect x="${M.l + bw * i}" y="${M.t}" width="${bw}" height="${ih}" fill="transparent" data-i="${i}"/>`).join("") : ""}</svg>`;
}

const PAGE_PAL = { s1: "var(--cr-s1)", s2: "var(--cr-s2)", grid: "var(--cr-grid)", surface: "var(--bg-surface)", text: null };
const PRINT_PAL = { s1: "#2a78d6", s2: "#eb6834", grid: "#d1d5db", surface: "#fff", text: "#444" };

function chartsHtml(d, pal, hover) {
    const s = d.series;
    const labels = s.map((x) => label(x.period, d.group));
    return {
        bor: lineChart(s.map((x) => x.occupancy_pct), labels, { title: "Bed occupancy rate", max: 100, fmt: (t) => `${Math.round(t)}%`, hover }, pal),
        alos: lineChart(s.map((x) => x.alos_days), labels, { title: "Average length of stay", floor: 4, fmt: (t) => `${+t.toFixed(1)}`, hover }, pal),
        flow: barsChart(s.map((x) => x.admitted), s.map((x) => x.discharged + x.died), labels, { title: "Admissions and discharges", hover }, pal),
    };
}

function bindTips(root, d) {
    root.querySelectorAll(".crp-chart[data-kind]").forEach((box) => {
        const tip = box.querySelector(".crp-tip");
        const kind = box.dataset.kind;
        const show = (i, ev) => {
            const x = d.series[i];
            const head = `<b>${esc(label(x.period, d.group, true))}</b>`;
            tip.innerHTML = kind === "bor"
                ? `${head}<i style="background:var(--cr-s1)"></i>Occupancy ${pct(x.occupancy_pct)}<br><span class="muted">${x.patient_days} patient days · ${x.bed_days} bed days · ${x.days_saved} day${x.days_saved === 1 ? "" : "s"} saved</span>`
                : kind === "alos"
                    ? `${head}<i style="background:var(--cr-s1)"></i>Average stay ${days(x.alos_days)}<br><span class="muted">${x.left} patient${x.left === 1 ? "" : "s"} left</span>`
                    : `${head}<i style="background:var(--cr-s1)"></i>Admitted ${x.admitted}<br><i style="background:var(--cr-s2)"></i>Discharged ${x.discharged + x.died}${x.died ? ` <span class="muted">(${x.died} died)</span>` : ""}`;
            tip.hidden = false;
            const r = box.getBoundingClientRect();
            const left = Math.min(Math.max(8, ev.clientX - r.left + 12), r.width - tip.offsetWidth - 8);
            tip.style.left = `${left}px`;
            tip.style.top = `${Math.max(4, ev.clientY - r.top - tip.offsetHeight - 10)}px`;
        };
        box.querySelectorAll("rect[data-i]").forEach((rect) => {
            rect.addEventListener("mousemove", (ev) => show(Number(rect.dataset.i), ev));
            rect.addEventListener("click", (ev) => show(Number(rect.dataset.i), ev));
        });
        box.addEventListener("mouseleave", () => (tip.hidden = true));
    });
}

/* ---------------- page ---------------- */

function seriesTable(d) {
    const t = d.totals;
    const row = (x, foot = false) => `<tr>
        <td>${foot ? "Total" : esc(label(x.period, d.group, true))}</td><td class="n">${x.days_saved}${foot || d.group === "day" ? "" : ` <span class="muted">/ ${x.calendar_days}</span>`}</td>
        <td class="n">${x.patient_days}</td><td class="n">${x.bed_days}</td><td class="n"><b>${pct(x.occupancy_pct)}</b></td>
        <td class="n">${x.admitted}</td><td class="n">${x.discharged}</td><td class="n">${x.died}</td><td class="n">${pct(x.death_rate_pct)}</td><td class="n">${x.transfers}</td>
        <td class="n"><b>${days(x.alos_days)}</b> <span class="muted">(${x.left})</span></td></tr>`;
    return `<table><thead><tr><th>${d.group === "day" ? "Day" : "Month"}</th><th class="n">Days saved</th><th class="n">Patient days</th><th class="n">Bed days</th><th class="n">Occupancy</th>
        <th class="n">Admitted</th><th class="n">Discharged</th><th class="n">Died</th><th class="n">Death rate</th><th class="n">Ward transfers</th><th class="n">Avg stay (left)</th></tr></thead>
        <tbody>${d.series.map((x) => row(x)).join("")}</tbody><tfoot>${row(t, true)}</tfoot></table>`;
}

function wardTable(d) {
    return `<table><thead><tr><th>Ward</th><th class="n">Patient days</th><th class="n">Bed days</th><th class="n">Occupancy</th><th class="n">Admitted</th><th class="n">Discharged</th>
        <th class="n">Died</th><th class="n">Death rate</th><th class="n">Transfers in</th><th class="n">Avg stay (left)</th></tr></thead><tbody>
        ${d.by_ward.map((w) => `<tr><td><b>${esc(w.ward_name)}</b></td><td class="n">${w.patient_days}</td><td class="n">${w.bed_days}</td><td class="n"><b>${pct(w.occupancy_pct)}</b></td>
            <td class="n">${w.admitted}</td><td class="n">${w.discharged}</td><td class="n">${w.died}</td><td class="n">${pct(w.death_rate_pct)}</td><td class="n">${w.transfers}</td>
            <td class="n"><b>${days(w.alos_days)}</b> <span class="muted">(${w.left})</span></td></tr>`).join("")}</tbody></table>`;
}

function periodText(d) {
    return d.group === "day" ? `${monthName(d.from)}, by day` : d.from === d.to ? monthName(d.from) : `${monthName(d.from)} – ${monthName(d.to)}`;
}

function render(root, d) {
    const t = d.totals;
    const ward = d.ward_id ? d.wards.find((w) => Number(w.id) === Number(d.ward_id))?.name : null;
    const c = chartsHtml(d, PAGE_PAL, true);
    const saved = d.series.some((x) => x.days_saved);
    root.innerHTML = `
        <h1>Census reports</h1>
        <div class="crp-sub">From the saved daily census. Occupancy = patient days ÷ bed days. Average stay = days in hospital of the patients who left (discharged or died) ÷ how many left;
            a same-day stay counts as 1 day.</div>
        <form class="crp-f" data-f>
            <div><label for="crpGroup">Show</label><select id="crpGroup"><option value="month" ${d.group === "month" ? "selected" : ""}>By month</option><option value="day" ${d.group === "day" ? "selected" : ""}>By day (one month)</option></select></div>
            <div><label for="crpFrom">${d.group === "day" ? "Month" : "From"}</label><input type="month" id="crpFrom" value="${esc(d.from)}"></div>
            <div ${d.group === "day" ? "hidden" : ""}><label for="crpTo">To</label><input type="month" id="crpTo" value="${esc(d.to)}"></div>
            <div><label for="crpWard">Ward</label><select id="crpWard"><option value="">All wards</option>${d.wards.map((w) => `<option value="${w.id}" ${Number(w.id) === Number(d.ward_id) ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></div>
            <button type="submit" class="crp-b go">Show</button><button type="button" class="crp-b" data-print>Print</button>
        </form>
        <div class="crp-sub" style="margin:-4px 0 12px"><b>${esc(periodText(d))}</b>${ward ? ` · ${esc(ward)}` : " · All wards"} · ${t.days_saved} of ${t.calendar_days} days saved</div>
        <div class="crp-tiles" role="list">
            <div class="crp-tile" role="listitem"><small>Bed occupancy</small><b>${pct(t.occupancy_pct)}</b><span>${t.patient_days} patient days ÷ ${t.bed_days} bed days</span></div>
            <div class="crp-tile" role="listitem"><small>Average length of stay</small><b>${days(t.alos_days)}</b><span>${t.left} patient${t.left === 1 ? "" : "s"} left</span></div>
            <div class="crp-tile" role="listitem"><small>Admissions</small><b>${t.admitted}</b></div>
            <div class="crp-tile" role="listitem"><small>Discharges</small><b>${t.discharged + t.died}</b><span>${t.discharged} alive · ${t.died} died</span></div>
            <div class="crp-tile" role="listitem"><small>Death rate</small><b>${pct(t.death_rate_pct)}</b><span>died ÷ all who left</span></div>
        </div>
        ${saved ? `<div class="crp-charts">
            <div class="crp-chart" data-kind="bor"><h3>Bed occupancy rate</h3><div class="crp-sub">% of beds filled at midnight</div>${c.bor}<div class="crp-tip" hidden></div></div>
            <div class="crp-chart" data-kind="alos"><h3>Average length of stay</h3><div class="crp-sub">days, patients who left</div>${c.alos}<div class="crp-tip" hidden></div></div>
            <div class="crp-chart" data-kind="flow"><h3>Admissions and discharges</h3>
                <div class="crp-legend"><span><i style="background:var(--cr-s1)"></i>Admitted</span><span><i style="background:var(--cr-s2)"></i>Discharged (incl. died)</span></div>${c.flow}<div class="crp-tip" hidden></div></div>
        </div>
        <h2>${d.group === "day" ? "By day" : "By month"}</h2><div class="crp-wrap">${seriesTable(d)}</div>
        ${d.by_ward.length > 1 || !d.ward_id ? `<h2>By ward</h2><div class="crp-wrap">${wardTable(d)}</div>` : ""}`
        : `<div class="crp-empty">No census saved for this period yet. Each day's census is saved after midnight.</div>`}`;
    bindTips(root, d);
    const f = root.querySelector("[data-f]");
    f.querySelector("#crpGroup").onchange = (ev) => {
        f.querySelector("#crpTo").closest("div").hidden = ev.target.value === "day";
        f.querySelector('label[for="crpFrom"]').textContent = ev.target.value === "day" ? "Month" : "From";
    };
    f.onsubmit = (ev) => {
        ev.preventDefault();
        state = { group: f.querySelector("#crpGroup").value, from: f.querySelector("#crpFrom").value, to: f.querySelector("#crpTo").value, ward_id: f.querySelector("#crpWard").value };
        load();
    };
    root.querySelector("[data-print]").onclick = () => printReport(d);
}

function printReport(d) {
    const win = window.open("", "_blank");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    const c = chartsHtml(d, PRINT_PAL, false);
    const t = d.totals;
    const ward = d.ward_id ? d.wards.find((w) => Number(w.id) === Number(d.ward_id))?.name : "All wards";
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Census report ${esc(periodText(d))}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 9.5pt; }
    h1 { margin: 0; font-size: 16pt; } h2 { font-size: 10.5pt; margin: 12px 0 4px; text-transform: uppercase; }
    .sub { color: #444; } .k { display: flex; gap: 22px; margin: 8px 0; } .k b { font-size: 14pt; display: block; }
    .ch { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .ch svg { width: 100%; height: auto; } .ch text { font-size: 10px; } .ch h3 { font-size: 9.5pt; margin: 0; }
    .lg i { display: inline-block; width: 9px; height: 9px; margin: 0 4px 0 8px; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 8pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 5px; } .n { text-align: right; } tfoot td { font-weight: bold; } .muted { color: #666; } tr { page-break-inside: avoid; }
    footer { margin-top: 10px; font-size: 8pt; color: #555; } .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>Census report — ${esc(periodText(d))}</h1><div class="sub">${esc(ward)} · ${t.days_saved} of ${t.calendar_days} days saved · occupancy = patient days ÷ bed days</div>
<div class="k"><div>Bed occupancy<b>${pct(t.occupancy_pct)}</b></div><div>Average stay<b>${days(t.alos_days)}</b></div><div>Admissions<b>${t.admitted}</b></div>
    <div>Discharges<b>${t.discharged + t.died}</b></div><div>Died<b>${t.died}</b></div><div>Death rate<b>${pct(t.death_rate_pct)}</b></div></div>
<div class="ch"><div><h3>Bed occupancy rate (%)</h3>${c.bor}</div><div><h3>Average length of stay (days)</h3>${c.alos}</div>
    <div><h3>Admissions and discharges</h3><div class="lg"><i style="background:#2a78d6"></i>Admitted<i style="background:#eb6834"></i>Discharged (incl. died)</div>${c.flow}</div></div>
<h2>${d.group === "day" ? "By day" : "By month"}</h2>${seriesTable(d)}
${d.ward_id ? "" : `<h2>By ward</h2>${wardTable(d)}`}
<footer>Census report · ${esc(periodText(d))}</footer>
</body></html>`);
    win.document.close();
}
