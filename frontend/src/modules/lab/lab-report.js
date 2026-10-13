import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * Lab report (module 14, Phase 3; tab "lab_report"), for a date range and optionally one lab section:
 * turnaround (order -> collection -> release, with the share within target, by priority, by section, by where the
 * request came from and by test), tests per day, what is still open, cancelled tests, results returned to the bench,
 * corrections and critical values, and the lab charges posted to the patient ledger. Charts with tables; printable.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`);
const n1 = (v) => (v === null || v === undefined ? "—" : String(v));
const peso = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (p, group, long = false) => {
    const [y, m, d] = p.split("-");
    if (group === "day") return long ? `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` : `${Number(d)}`;
    return long ? `${MONTHS[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};
const longDate = (iso) => label(iso, "day", true);

/** Minutes as the lab says them: "38 min", "2 h 10 min", "1 d 4 h". */
const mins = (v) => {
    if (v === null || v === undefined) return "—";
    const m = Math.round(v);
    if (m < 60) return `${m} min`;
    if (m < 1440) return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
    return `${Math.floor(m / 1440)} d${Math.floor((m % 1440) / 60) ? ` ${Math.floor((m % 1440) / 60)} h` : ""}`;
};

const CSS = `
.lbr { padding: 20px 24px 40px; max-width: 1280px; margin: 0 auto; color: var(--text-primary);
    --lb-s1: #2a78d6; --lb-s2: #16a34a; --lb-grid: #e5e7eb; --lb-axis: #6b7280; }
:root[data-theme="dark"] .lbr { --lb-s1: #3987e5; --lb-s2: #22c55e; --lb-grid: #334155; --lb-axis: #94a3b8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .lbr { --lb-s1: #3987e5; --lb-s2: #22c55e; --lb-grid: #334155; --lb-axis: #94a3b8; } }
@media (max-width: 600px) { .lbr { padding: 16px 16px 32px; } }
.lbr h1 { margin: 0; font-size: 22px; }
.lbr-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.lbr-f { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 14px 0; }
.lbr-f > div { min-width: 0; max-width: 100%; }
.lbr-f label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.lbr-f input, .lbr-f select { max-width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.lbr-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font: inherit; font-weight: 600; cursor: pointer; }
.lbr-b.go { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.lbr-b:focus-visible, .lbr-f input:focus-visible, .lbr-f select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.lbr-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(170px, 100%), 1fr)); gap: 10px; margin-bottom: 16px; }
.lbr-tile { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; background: var(--bg-surface); }
.lbr-tile small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.lbr-tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.lbr-tile span { font-size: 12px; color: var(--text-muted); }
.lbr-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 14px; }
.lbr-chart { border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 12px 6px; background: var(--bg-surface); position: relative; min-width: 0; }
.lbr-chart h3 { margin: 0 0 2px; font-size: 14px; }
.lbr-chart .lbr-sub { font-size: 12px; margin: 0 0 6px; }
.lbr-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.lbr-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.lbr-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.lbr-chart svg text { fill: var(--lb-axis); font-size: 10px; font-family: inherit; }
.lbr-tip { position: absolute; pointer-events: none; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px;
    padding: 6px 9px; font-size: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.15); white-space: nowrap; z-index: 2; }
.lbr-tip b { display: block; margin-bottom: 2px; }
.lbr-tip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; }
.lbr h2 { font-size: 16px; margin: 22px 0 8px; }
.lbr-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 14px; }
.lbr-two > section { min-width: 0; }
.lbr-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.lbr table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.lbr th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.lbr td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); }
.lbr .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lbr .muted { color: var(--text-muted); }
.lbr-note { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.lbr-empty { padding: 22px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.lbr-late { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .lbr-late { color: #fca5a5; }
`;

let state = { from: "", to: "", section: "" };

export function LabReportView() {
    if (!document.getElementById("lbr-style")) {
        const st = document.createElement("style");
        st.id = "lbr-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    return `<div class="lbr" id="labReport"><div class="lbr-empty">Loading…</div></div>`;
}

export function initLabReport() {
    load();
}

async function load() {
    const root = document.getElementById("labReport");
    if (!root) return;
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const r = await api(`/lab/report?${q}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="lbr-empty">${esc(r?.message || "Could not load the report.")}</div>`;
        return;
    }
    state = { from: r.data.from, to: r.data.to, section: r.data.section || "" };
    render(root, r.data);
}

/* ---------------- charts (inline SVG) ---------------- */

const W = 560;
const H = 220;
const M = { l: 44, r: 10, t: 10, b: 28 };

function niceMax(v, floor) {
    const m = Math.max(v, floor);
    const step = Math.pow(10, Math.floor(Math.log10(m)));
    for (const k of [1, 2, 2.5, 5, 10]) if (k * step >= m) return k * step;
    return 10 * step;
}

function axes(max, n, labels, every, fmt, pal) {
    const ih = H - M.t - M.b;
    const bw = (W - M.l - M.r) / n;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = M.t + ih - f * ih;
        return `<line x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}" stroke="${pal.grid}" stroke-width="1"/><text x="${M.l - 6}" y="${y + 3}" text-anchor="end"${pal.text ? ` fill="${pal.text}"` : ""}>${fmt(f * max)}</text>`;
    }).join("") + labels.map((l, i) => (i % every === 0 ? `<text x="${M.l + bw * i + bw / 2}" y="${H - 8}" text-anchor="middle"${pal.text ? ` fill="${pal.text}"` : ""}>${esc(l)}</text>` : "")).join("");
}

function bar(x, v, w, max, color) {
    if (!v) return "";
    const ih = H - M.t - M.b;
    const top = M.t + ih - (v / max) * ih;
    const h = M.t + ih - top;
    const r = Math.min(4, w / 2, h);
    return `<path d="M${x},${M.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${M.t + ih} Z" fill="${color}"/>`;
}

const hits = (n, on) => (on ? Array.from({ length: n }, (_, i) => `<rect x="${M.l + ((W - M.l - M.r) / n) * i}" y="${M.t}" width="${(W - M.l - M.r) / n}" height="${H - M.t - M.b}" fill="transparent" data-i="${i}"/>`).join("") : "");

function barsChart(a, b, labels, title, pal, hover) {
    const n = a.length;
    const max = niceMax(Math.max(1, ...a, ...(b || [])), 4);
    const bw = (W - M.l - M.r) / n;
    const gap = 2;
    const barW = b ? Math.max(2, Math.min(18, (bw - 6) / 2 - gap / 2)) : Math.max(2, Math.min(28, bw - 4));
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${axes(max, n, labels, Math.ceil(n / 12), (t) => Math.round(t), pal)}
        ${a.map((v, i) => {
            const cx = M.l + bw * i + bw / 2;
            return b ? bar(cx - barW - gap / 2, v, barW, max, pal.s1) + bar(cx + gap / 2, b[i], barW, max, pal.s2) : bar(cx - barW / 2, v, barW, max, pal.s1);
        }).join("")}${hits(n, hover)}</svg>`;
}

function lineChart(points, labels, title, pal, hover, fmtAxis) {
    const n = points.length;
    const vals = points.filter((v) => v !== null);
    const max = niceMax(vals.length ? Math.max(...vals) : 1, 4);
    const ih = H - M.t - M.b;
    const bw = (W - M.l - M.r) / n;
    const x = (i) => M.l + bw * i + bw / 2;
    const y = (v) => M.t + ih - (v / max) * ih;
    let d = "";
    let pen = false;
    points.forEach((v, i) => {
        if (v === null) return (pen = false);
        d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${axes(max, n, labels, Math.ceil(n / 12), fmtAxis || ((t) => Math.round(t)), pal)}
        <path d="${d}" fill="none" stroke="${pal.s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${points.map((v, i) => (v === null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="${n > 20 ? 3 : 4}" fill="${pal.s1}" stroke="${pal.surface}" stroke-width="2"/>`)).join("")}${hits(n, hover)}</svg>`;
}

const PAGE_PAL = { s1: "var(--lb-s1)", s2: "var(--lb-s2)", grid: "var(--lb-grid)", surface: "var(--bg-surface)", text: null };
const PRINT_PAL = { s1: "#2a78d6", s2: "#16a34a", grid: "#d1d5db", surface: "#fff", text: "#444" };

function charts(d, pal, hover) {
    const labels = d.series.map((x) => label(x.period, d.group));
    const hours = (t) => (t >= 120 ? `${Math.round(t / 60)} h` : `${Math.round(t)}m`);
    return {
        volume: barsChart(d.series.map((x) => x.ordered), d.series.map((x) => x.released), labels, "Tests ordered and released", pal, hover),
        tat: lineChart(d.series.map((x) => x.mean_tat), labels, "Average order to released result", pal, hover, hours),
        stat: barsChart(d.series.map((x) => x.stat), null, labels, "STAT tests", pal, hover),
    };
}

function bindTips(root, d) {
    root.querySelectorAll(".lbr-chart[data-kind]").forEach((box) => {
        const tip = box.querySelector(".lbr-tip");
        const kind = box.dataset.kind;
        const show = (i, ev) => {
            const x = d.series[i];
            const head = `<b>${esc(label(x.period, d.group, true))}</b>`;
            tip.innerHTML = kind === "volume"
                ? `${head}<i style="background:var(--lb-s1)"></i>Ordered ${x.ordered}<br><i style="background:var(--lb-s2)"></i>Released ${x.released}<br><span class="muted">${x.collected} collected</span>`
                : kind === "tat" ? `${head}<i style="background:var(--lb-s1)"></i>${x.mean_tat === null ? "Nothing released" : `${mins(x.mean_tat)} on average`}<br><span class="muted">${x.released} released</span>`
                : `${head}<i style="background:var(--lb-s1)"></i>${x.stat} STAT test${x.stat === 1 ? "" : "s"}`;
            tip.hidden = false;
            const r = box.getBoundingClientRect();
            tip.style.left = `${Math.min(Math.max(8, ev.clientX - r.left + 12), r.width - tip.offsetWidth - 8)}px`;
            tip.style.top = `${Math.max(4, ev.clientY - r.top - tip.offsetHeight - 10)}px`;
        };
        box.querySelectorAll("rect[data-i]").forEach((rect) => {
            rect.addEventListener("mousemove", (ev) => show(Number(rect.dataset.i), ev));
            rect.addEventListener("click", (ev) => show(Number(rect.dataset.i), ev));
        });
        box.addEventListener("mouseleave", () => (tip.hidden = true));
    });
}

/* ---------------- tables ---------------- */

const within = (v) => (v === null ? "—" : `<span class="${v < 80 ? "lbr-late" : ""}">${pct(v)}</span>`);

function priorityTable(d) {
    return `<table><thead><tr><th>Priority</th><th class="n">Tests</th><th class="n">To collect</th><th class="n">Within</th><th class="n">Bench</th><th class="n">Order → result</th><th class="n">90th</th><th class="n">Within</th></tr></thead><tbody>
        ${d.priority_rows.map((p) => `<tr><td><b>${esc(p.label)}</b><div class="muted" style="font-size:12px">target ${mins(p.target_collect)} to collect, ${mins(p.target_total)} to release</div></td>
            <td class="n">${p.tests}</td><td class="n">${mins(p.collect.median)}</td><td class="n">${within(p.within_collect_pct)}</td>
            <td class="n">${mins(p.bench.median)}</td><td class="n"><b>${mins(p.total.median)}</b></td><td class="n">${mins(p.total.p90)}</td><td class="n">${within(p.within_total_pct)}</td></tr>`).join("")}
        <tr><td><b>All tests</b></td><td class="n">${d.totals.tests}</td><td class="n">${mins(d.totals.collect.median)}</td><td class="n">${within(d.totals.within_collect_pct)}</td>
            <td class="n">${mins(d.totals.bench.median)}</td><td class="n"><b>${mins(d.totals.total.median)}</b></td><td class="n">${mins(d.totals.total.p90)}</td><td class="n">${within(d.totals.within_total_pct)}</td></tr>
    </tbody></table>`;
}

function sectionTable(d) {
    if (!d.sections.length) return `<div class="lbr-empty">No tests in this period.</div>`;
    return `<table><thead><tr><th>Section</th><th class="n">Tests</th><th class="n">Released</th><th class="n">Bench</th><th class="n">Order → result</th><th class="n">Within</th><th class="n">Critical</th><th class="n">Charged</th></tr></thead><tbody>
        ${d.sections.map((s) => `<tr><td>${esc(s.label)}</td><td class="n">${s.tests}</td><td class="n">${s.released}</td><td class="n">${mins(s.bench.median)}</td>
            <td class="n">${mins(s.total.median)}</td><td class="n">${within(s.within_total_pct)}</td><td class="n">${s.criticals || ""}</td><td class="n">${esc(peso(s.charged))}</td></tr>`).join("")}
    </tbody></table>`;
}

function sourceTable(d) {
    if (!d.sources.length) return `<div class="lbr-empty">None.</div>`;
    return `<table><thead><tr><th>Ordered from</th><th class="n">Tests</th><th class="n">Released</th><th class="n">Order → result</th><th class="n">Within</th></tr></thead><tbody>
        ${d.sources.map((s) => `<tr><td>${esc(s.label)}</td><td class="n">${s.tests}</td><td class="n">${s.released}</td><td class="n">${mins(s.total.median)}</td><td class="n">${within(s.within_total_pct)}</td></tr>`).join("")}
    </tbody></table>`;
}

function testTable(d) {
    if (!d.tests.length) return `<div class="lbr-empty">No tests in this period.</div>`;
    return `<table><thead><tr><th>Test</th><th class="n">Ordered</th><th class="n">Released</th><th class="n">Cancelled</th><th class="n">Order → result</th><th class="n">90th</th><th class="n">Within</th><th class="n">Critical</th><th class="n">Charged</th></tr></thead><tbody>
        ${d.tests.map((t) => `<tr><td>${esc(t.name)}</td><td class="n">${t.tests}</td><td class="n">${t.released}</td><td class="n">${t.cancelled || ""}</td>
            <td class="n">${mins(t.total.median)}</td><td class="n">${mins(t.total.p90)}</td><td class="n">${within(t.within_total_pct)}</td><td class="n">${t.criticals || ""}</td><td class="n">${esc(peso(t.charged))}</td></tr>`).join("")}
    </tbody></table>`;
}

function chargeTable(d) {
    const c = d.charges;
    return `<table><thead><tr><th>Lab charges in the period</th><th class="n">Amount</th></tr></thead><tbody>
        <tr><td>Charges posted <span class="muted">(${c.charged} test${c.charged === 1 ? "" : "s"})</span></td><td class="n">${esc(peso(c.gross))}</td></tr>
        <tr><td>Discounts <span class="muted">(${c.discounted} charge${c.discounted === 1 ? "" : "s"}: Senior Citizen, PWD, other)</span></td><td class="n">− ${esc(peso(c.discount))}</td></tr>
        <tr><td><b>To the patients' ledgers</b></td><td class="n"><b>${esc(peso(c.net))}</b></td></tr>
        <tr><td>Charges voided</td><td class="n">${c.voided || "—"}</td></tr>
        <tr><td>Released tests not charged <span class="muted">(no price, or the charge was voided)</span></td><td class="n">${c.uncharged_total || "—"}</td></tr>
    </tbody></table>
    ${c.uncharged.length ? `<div class="lbr-note">Not charged: ${esc(c.uncharged.map((u) => `${u.name} (${u.tests})`).join(", "))}. A test with no price is priced under
        <b>Lab Worklist → Charges → Test prices</b> and charged there; a charge voided on purpose needs nothing.</div>` : ""}`;
}

/* ---------------- page ---------------- */

const periodText = (d) => (d.from === d.to ? longDate(d.from) : `${longDate(d.from)} – ${longDate(d.to)}`);

function render(root, d) {
    const t = d.totals;
    const c = charts(d, PAGE_PAL, true);
    root.innerHTML = `
        <h1>Lab report</h1>
        <div class="lbr-sub">The tests ordered in the period: how long each step took, how many tests a day, and what was charged. Turnaround is counted on the tests that reached that step.</div>
        <form class="lbr-f" data-f>
            <div><label for="lbrFrom">From</label><input type="date" id="lbrFrom" value="${esc(d.from)}"></div>
            <div><label for="lbrTo">To</label><input type="date" id="lbrTo" value="${esc(d.to)}"></div>
            <div><label for="lbrSec">Section</label><select id="lbrSec"><option value="">All sections</option>${Object.entries(d.sections_list).map(([k, l]) => `<option value="${k}" ${d.section === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
            <button type="submit" class="lbr-b go">Show</button><button type="button" class="lbr-b" data-print>Print</button>
        </form>
        <div class="lbr-sub" style="margin:-4px 0 12px"><b>${esc(periodText(d))}</b> · ${d.days} day${d.days === 1 ? "" : "s"}${d.section ? ` · ${esc(d.sections_list[d.section])}` : ""}${d.group === "month" ? " · charts by month" : ""}</div>
        <div class="lbr-tiles" role="list">
            <div class="lbr-tile" role="listitem"><small>Tests ordered</small><b>${t.tests}</b><span>${t.per_day} a day · ${t.requests} request${t.requests === 1 ? "" : "s"}</span></div>
            <div class="lbr-tile" role="listitem"><small>Released</small><b>${t.released}</b><span>${t.collected} collected · ${t.cancelled} cancelled</span></div>
            <div class="lbr-tile" role="listitem"><small>Order → result (median)</small><b>${mins(t.total.median)}</b><span>90th ${mins(t.total.p90)} · mean ${mins(t.total.mean)}</span></div>
            <div class="lbr-tile" role="listitem"><small>Within target</small><b>${pct(t.within_total_pct)}</b><span>${pct(t.within_collect_pct)} collected in time</span></div>
            <div class="lbr-tile" role="listitem"><small>Order → collection (median)</small><b>${mins(t.collect.median)}</b><span>bench ${mins(t.bench.median)}</span></div>
            <div class="lbr-tile" role="listitem"><small>STAT tests</small><b>${t.stat}</b><span>${t.criticals} critical value${t.criticals === 1 ? "" : "s"}</span></div>
            <div class="lbr-tile" role="listitem"><small>Still open</small><b>${t.to_collect + t.to_result + t.to_verify}</b><span>${t.to_collect} to collect · ${t.to_result} to result · ${t.to_verify} to verify</span></div>
            <div class="lbr-tile" role="listitem"><small>Charged</small><b>${esc(peso(d.charges.net))}</b><span>${d.charges.charged} charge${d.charges.charged === 1 ? "" : "s"}${d.charges.uncharged_total ? ` · ${d.charges.uncharged_total} not charged` : ""}</span></div>
        </div>
        ${t.tests ? `<div class="lbr-charts">
            <div class="lbr-chart" data-kind="volume"><h3>Tests ordered and released</h3><div class="lbr-sub">per ${d.group}</div>
                <div class="lbr-legend"><span><i style="background:var(--lb-s1)"></i>Ordered</span><span><i style="background:var(--lb-s2)"></i>Released</span></div>${c.volume}<div class="lbr-tip" hidden></div></div>
            <div class="lbr-chart" data-kind="tat"><h3>Order to released result</h3><div class="lbr-sub">average, per ${d.group} of release</div>${c.tat}<div class="lbr-tip" hidden></div></div>
            <div class="lbr-chart" data-kind="stat"><h3>STAT tests</h3><div class="lbr-sub">per ${d.group}</div>${c.stat}<div class="lbr-tip" hidden></div></div>
        </div>
        <h2>Turnaround by priority</h2><div class="lbr-wrap">${priorityTable(d)}</div>
        <div class="lbr-note">Medians. “To collect” is from the order to the specimen, “bench” from the specimen to the released result, “order → result” the whole way.
            Targets: collection STAT 30 min / urgent 1 h / routine 4 h; release STAT 1 h / urgent 4 h / routine 24 h.
            ${t.returns || t.corrections ? `${t.returns} result${t.returns === 1 ? " was" : "s were"} returned to the bench and ${t.corrections} released result${t.corrections === 1 ? " was" : "s were"} corrected in this period.` : ""}</div>
        <div class="lbr-two">
            <section><h2>By section</h2><div class="lbr-wrap">${sectionTable(d)}</div></section>
            <section><h2>Where the requests came from</h2><div class="lbr-wrap">${sourceTable(d)}</div></section>
            <section><h2>Charges</h2><div class="lbr-wrap">${chargeTable(d)}</div></section>
        </div>
        <h2>Tests${d.test_count > d.tests.length ? ` <span class="muted" style="font-size:13px">(the ${d.tests.length} busiest of ${d.test_count})</span>` : ""}</h2>
        <div class="lbr-wrap">${testTable(d)}</div>`
        : `<div class="lbr-empty">No lab tests were ordered in this period.</div>`}`;
    bindTips(root, d);
    const f = root.querySelector("[data-f]");
    f.onsubmit = (ev) => {
        ev.preventDefault();
        state = { from: f.querySelector("#lbrFrom").value, to: f.querySelector("#lbrTo").value, section: f.querySelector("#lbrSec").value };
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
    const c = charts(d, PRINT_PAL, false);
    const t = d.totals;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Lab report ${esc(periodText(d))}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 9.5pt; }
    h1 { margin: 0; font-size: 16pt; } h2 { font-size: 10.5pt; margin: 12px 0 4px; text-transform: uppercase; }
    .sub { color: #444; } .k { display: flex; flex-wrap: wrap; gap: 22px; margin: 8px 0; } .k b { font-size: 14pt; display: block; }
    .ch { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .ch svg { width: 100%; height: auto; } .ch text { font-size: 10px; } .ch h3 { font-size: 9.5pt; margin: 0; }
    .lg i { display: inline-block; width: 9px; height: 9px; margin: 0 4px 0 8px; } .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 8pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 5px; } .n { text-align: right; } .muted { color: #666; } tr { page-break-inside: avoid; } .lbr-late { font-weight: bold; }
    footer { margin-top: 10px; font-size: 8pt; color: #555; } .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>Lab report — ${esc(periodText(d))}${d.section ? ` · ${esc(d.sections_list[d.section])}` : ""}</h1>
<div class="sub">${d.days} day${d.days === 1 ? "" : "s"} · tests ordered in the period · turnaround counted on the tests that reached each step</div>
<div class="k"><div>Tests ordered<b>${t.tests}</b></div><div>A day<b>${t.per_day}</b></div><div>Released<b>${t.released}</b></div>
    <div>Order → result (median)<b>${mins(t.total.median)}</b></div><div>Within target<b>${pct(t.within_total_pct)}</b></div>
    <div>Order → collection<b>${mins(t.collect.median)}</b></div><div>STAT<b>${t.stat}</b></div><div>Critical values<b>${t.criticals}</b></div>
    <div>Charged<b>${esc(peso(d.charges.net))}</b></div></div>
${t.tests ? `<div class="ch"><div><h3>Tests ordered and released</h3><div class="lg"><i style="background:#2a78d6"></i>Ordered<i style="background:#16a34a"></i>Released</div>${c.volume}</div>
    <div><h3>Order to released result (average)</h3>${c.tat}</div><div><h3>STAT tests</h3>${c.stat}</div></div>
<h2>Turnaround by priority</h2>${priorityTable(d)}
<div class="two"><div><h2>By section</h2>${sectionTable(d)}</div><div><h2>Where the requests came from</h2>${sourceTable(d)}</div></div>
<div class="two"><div><h2>Charges</h2>${chargeTable(d)}</div><div><h2>Still open</h2><table><tbody><tr><td>To collect</td><td class="n">${t.to_collect}</td></tr>
    <tr><td>To result</td><td class="n">${t.to_result}</td></tr><tr><td>Waiting for verification</td><td class="n">${t.to_verify}</td></tr>
    <tr><td>Cancelled</td><td class="n">${t.cancelled}</td></tr><tr><td>Returned to the bench</td><td class="n">${t.returns}</td></tr>
    <tr><td>Corrected after release</td><td class="n">${t.corrections}</td></tr></tbody></table></div></div>
<h2>Tests</h2>${testTable(d)}` : "<p>No lab tests were ordered in this period.</p>"}
<footer>Lab report · ${esc(periodText(d))} · medians unless said otherwise</footer>
</body></html>`);
    win.document.close();
}
