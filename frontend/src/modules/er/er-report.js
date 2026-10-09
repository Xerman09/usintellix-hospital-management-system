import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * ER report (module 12, Phase 4; tab "er_report"), for the visits that arrived in a date range:
 * visits, waiting times (to triage, to a doctor against each level's target, length of stay, waiting
 * for a ward bed), where patients went (admit rate, left without being seen), by level, by hour of
 * arrival, diagnoses, protocol steps on time. Charts with tables; printable.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`);
const min = (v) => {
    if (v === null || v === undefined) return "—";
    const m = Math.round(Number(v));
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (p, group, long = false) => {
    const [y, m, d] = p.split("-");
    if (group === "day") return long ? `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` : `${Number(d)}`;
    return long ? `${MONTHS[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};
const longDate = (iso) => label(iso, "day", true);

const CSS = `
.erb { padding: 20px 24px 40px; max-width: 1280px; margin: 0 auto; color: var(--text-primary);
    --er-s1: #2a78d6; --er-s2: #eb6834; --er-grid: #e5e7eb; --er-axis: #6b7280; }
:root[data-theme="dark"] .erb { --er-s1: #3987e5; --er-s2: #d95926; --er-grid: #334155; --er-axis: #94a3b8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .erb { --er-s1: #3987e5; --er-s2: #d95926; --er-grid: #334155; --er-axis: #94a3b8; } }
@media (max-width: 600px) { .erb { padding: 16px 16px 32px; } }
.erb h1 { margin: 0; font-size: 22px; }
.erb-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.erb-f { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 14px 0; }
.erb-f > div { min-width: 0; max-width: 100%; }
.erb-f label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.erb-f input { max-width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.erb-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font: inherit; font-weight: 600; cursor: pointer; }
.erb-b.go { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.erb-b:focus-visible, .erb-f input:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.erb-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(170px, 100%), 1fr)); gap: 10px; margin-bottom: 16px; }
.erb-tile { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; background: var(--bg-surface); }
.erb-tile small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.erb-tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.erb-tile span { font-size: 12px; color: var(--text-muted); }
.erb-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 14px; }
.erb-chart { border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 12px 6px; background: var(--bg-surface); position: relative; min-width: 0; }
.erb-chart h3 { margin: 0 0 2px; font-size: 14px; }
.erb-chart .erb-sub { font-size: 12px; margin: 0 0 6px; }
.erb-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.erb-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.erb-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.erb-chart svg text { fill: var(--er-axis); font-size: 10px; font-family: inherit; }
.erb-tip { position: absolute; pointer-events: none; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px;
    padding: 6px 9px; font-size: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.15); white-space: nowrap; z-index: 2; }
.erb-tip b { display: block; margin-bottom: 2px; }
.erb-tip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; }
.erb h2 { font-size: 16px; margin: 22px 0 8px; }
.erb-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 14px; }
.erb-two > section { min-width: 0; }
.erb-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.erb table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.erb th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.erb td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); }
.erb .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.erb tfoot td { font-weight: 700; background: var(--bg-surface-alt); }
.erb .muted { color: var(--text-muted); }
.erb-meter { display: inline-block; width: 70px; height: 8px; border-radius: 4px; background: var(--bg-surface-alt); vertical-align: middle; margin-left: 6px; overflow: hidden; }
.erb-meter i { display: block; height: 100%; background: var(--er-s1); border-radius: 4px; }
.erb-empty { padding: 22px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
`;

let state = { from: "", to: "" };

export function ErReportView() {
    if (!document.getElementById("erb-style")) {
        const st = document.createElement("style");
        st.id = "erb-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    return `<div class="erb" id="erReport"><div class="erb-empty">Loading…</div></div>`;
}

export function initErReport() {
    load();
}

async function load() {
    const root = document.getElementById("erReport");
    if (!root) return;
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const r = await api(`/er/report?${q}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="erb-empty">${esc(r?.message || "Could not load the report.")}</div>`;
        return;
    }
    state = { from: r.data.from, to: r.data.to };
    render(root, r.data);
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
    const bw = (W - M.l - M.r) / n;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = M.t + ih - f * ih;
        return `<line x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}" stroke="${pal.grid}" stroke-width="1"/><text x="${M.l - 6}" y="${y + 3}" text-anchor="end"${pal.text ? ` fill="${pal.text}"` : ""}>${fmt(f * max)}</text>`;
    }).join("") + labels.map((l, i) => (i % every === 0 ? `<text x="${M.l + bw * i + bw / 2}" y="${H - 8}" text-anchor="middle"${pal.text ? ` fill="${pal.text}"` : ""}>${esc(l)}</text>` : "")).join("");
}

/** Rounded data end (top), square at the baseline. */
function bar(x, v, w, max, color) {
    if (!v) return "";
    const ih = H - M.t - M.b;
    const top = M.t + ih - (v / max) * ih;
    const h = M.t + ih - top;
    const r = Math.min(4, w / 2, h);
    return `<path d="M${x},${M.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${M.t + ih} Z" fill="${color}"/>`;
}

const hits = (n, on) => (on ? Array.from({ length: n }, (_, i) => `<rect x="${M.l + ((W - M.l - M.r) / n) * i}" y="${M.t}" width="${(W - M.l - M.r) / n}" height="${H - M.t - M.b}" fill="transparent" data-i="${i}"/>`).join("") : "");

/** One or two bar series per period. */
function barsChart(a, b, labels, title, pal, hover) {
    const n = a.length;
    const max = niceMax(Math.max(1, ...a, ...(b || [])), 4);
    const bw = (W - M.l - M.r) / n;
    const gap = 2;
    const barW = b ? Math.max(2, Math.min(18, (bw - 6) / 2 - gap / 2)) : Math.max(2, Math.min(28, bw - 4));
    const every = Math.ceil(n / 12);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${axes(max, n, labels, every, (t) => Math.round(t), pal)}
        ${a.map((v, i) => {
            const cx = M.l + bw * i + bw / 2;
            return b ? bar(cx - barW - gap / 2, v, barW, max, pal.s1) + bar(cx + gap / 2, b[i], barW, max, pal.s2) : bar(cx - barW / 2, v, barW, max, pal.s1);
        }).join("")}${hits(n, hover)}</svg>`;
}

function lineChart(points, labels, title, pal, hover) {
    const n = points.length;
    const vals = points.filter((v) => v !== null);
    const max = niceMax(vals.length ? Math.max(...vals) : 1, 10);
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
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${axes(max, n, labels, Math.ceil(n / 12), (t) => Math.round(t), pal)}
        <path d="${d}" fill="none" stroke="${pal.s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${points.map((v, i) => (v === null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="${n > 20 ? 3 : 4}" fill="${pal.s1}" stroke="${pal.surface}" stroke-width="2"/>`)).join("")}${hits(n, hover)}</svg>`;
}

const PAGE_PAL = { s1: "var(--er-s1)", s2: "var(--er-s2)", grid: "var(--er-grid)", surface: "var(--bg-surface)", text: null };
const PRINT_PAL = { s1: "#2a78d6", s2: "#eb6834", grid: "#d1d5db", surface: "#fff", text: "#444" };

function charts(d, pal, hover) {
    const labels = d.series.map((x) => label(x.period, d.group));
    return {
        visits: barsChart(d.series.map((x) => x.visits), d.series.map((x) => x.admitted), labels, "Visits and admissions", pal, hover),
        doctor: lineChart(d.series.map((x) => x.doctor_median), labels, "Median time to a doctor (minutes)", pal, hover),
        hours: barsChart(d.by_hour, null, d.by_hour.map((_, h) => String(h)), "Arrivals by hour of day", pal, hover),
    };
}

function bindTips(root, d) {
    root.querySelectorAll(".erb-chart[data-kind]").forEach((box) => {
        const tip = box.querySelector(".erb-tip");
        const kind = box.dataset.kind;
        const show = (i, ev) => {
            if (kind === "hours") {
                tip.innerHTML = `<b>${String(i).padStart(2, "0")}:00–${String(i).padStart(2, "0")}:59</b><i style="background:var(--er-s1)"></i>${d.by_hour[i]} arrival${d.by_hour[i] === 1 ? "" : "s"}`;
            } else {
                const x = d.series[i];
                const head = `<b>${esc(label(x.period, d.group, true))}</b>`;
                tip.innerHTML = kind === "visits"
                    ? `${head}<i style="background:var(--er-s1)"></i>Visits ${x.visits}<br><i style="background:var(--er-s2)"></i>Admitted ${x.admitted}${x.left ? `<br><span class="muted">${x.left} left without being seen</span>` : ""}`
                    : `${head}<i style="background:var(--er-s1)"></i>Median to doctor ${min(x.doctor_median)}<br><span class="muted">${pct(x.doctor_on_time_pct)} within target · median stay ${min(x.los_median)}</span>`;
            }
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

const meter = (v) => (v === null || v === undefined ? "" : `<span class="erb-meter" aria-hidden="true"><i style="width:${Math.min(100, v)}%"></i></span>`);

function acuityTable(d, print = false) {
    const t = d.totals;
    const row = (a, foot = false) => `<tr><td>${foot ? "All levels" : a.acuity ? `<b>${a.acuity}</b> · ${esc(a.label)}` : esc(a.label)}</td><td class="n">${a.visits}</td>
        <td class="n">${foot ? "" : a.target === null ? "—" : a.target === 0 ? "at once" : `${a.target} min`}</td><td class="n">${min(a.doctor_median)}</td>
        <td class="n">${pct(a.doctor_on_time_pct)}${print ? "" : meter(a.doctor_on_time_pct)}</td><td class="n">${a.admitted}</td><td class="n">${pct(a.admit_rate_pct)}</td>
        <td class="n">${min(a.los_median)}</td><td class="n">${a.left}</td></tr>`;
    return `<table><thead><tr><th>Level</th><th class="n">Visits</th><th class="n">Doctor target</th><th class="n">Median to doctor</th><th class="n">Within target</th>
        <th class="n">Admitted</th><th class="n">Admit rate</th><th class="n">Median stay</th><th class="n">Left unseen</th></tr></thead>
        <tbody>${d.by_acuity.map((a) => row(a)).join("")}</tbody><tfoot>${row(t, true)}</tfoot></table>`;
}

function outcomeTable(d, print = false) {
    return `<table><thead><tr><th>Where patients went</th><th class="n">Visits</th><th class="n">Share</th></tr></thead><tbody>
        ${d.outcomes.map((o) => `<tr><td>${esc(o.label)}</td><td class="n">${o.count}</td><td class="n">${pct(o.pct)}${print ? "" : meter(o.pct)}</td></tr>`).join("")}</tbody></table>`;
}

function waitTable(d) {
    const t = d.totals;
    const rows = [
        ["Arrival → triage", min(t.triage_median), `${pct(t.triage_on_time_pct)} within ${d.targets[0]} min`],
        ["Arrival → seen by a doctor", min(t.doctor_median), `${pct(t.doctor_on_time_pct)} within the level's target (${t.doctor_seen} seen)`],
        ["Arrival → disposition decided", min(t.decision_median), ""],
        ["Length of stay in the ER (all who left)", min(t.los_median), ""],
        ["… discharged home", min(t.los_home_median), ""],
        ["… admitted", min(t.los_admitted_median), ""],
        ["Admission decided → in a ward bed", min(t.boarding_median), "waiting in the ER for a bed"],
    ];
    return `<table><thead><tr><th>Waiting time</th><th class="n">Median</th><th></th></tr></thead><tbody>
        ${rows.map(([a, b, c]) => `<tr><td>${a}</td><td class="n"><b>${b}</b></td><td class="muted">${c}</td></tr>`).join("")}</tbody></table>`;
}

function protocolTable(d) {
    if (!d.protocols.length) return `<div class="erb-empty">No protocols started in this period.</div>`;
    return `<table><thead><tr><th>Protocol / step</th><th class="n">Target</th><th class="n">Done</th><th class="n">Median</th><th class="n">On time</th></tr></thead><tbody>
        ${d.protocols.map((p) => `<tr><td colspan="5"><b>${esc(p.label)}</b> <span class="muted">— ${p.started} started · ${p.complete} complete · ${p.stopped} stopped</span></td></tr>
            ${p.steps.map((s) => `<tr><td style="padding-left:22px">${esc(s.label)}</td><td class="n">${s.target} min</td><td class="n">${s.done}</td><td class="n">${min(s.median)}</td><td class="n">${pct(s.on_time_pct)}</td></tr>`).join("")}`).join("")}
        </tbody></table>`;
}

const smallTable = (head, rows) => (rows.length ? `<table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table>` : `<div class="erb-empty">None recorded.</div>`);

/* ---------------- page ---------------- */

function periodText(d) {
    return d.from === d.to ? longDate(d.from) : `${longDate(d.from)} – ${longDate(d.to)}`;
}

function render(root, d) {
    const t = d.totals;
    const c = charts(d, PAGE_PAL, true);
    root.innerHTML = `
        <h1>ER report</h1>
        <div class="erb-sub">Visits that arrived in the period (registrations made in error are left out). Admit rate = admitted ÷ visits. Waiting times are medians.</div>
        <form class="erb-f" data-f>
            <div><label for="erbFrom">From</label><input type="date" id="erbFrom" value="${esc(d.from)}"></div>
            <div><label for="erbTo">To</label><input type="date" id="erbTo" value="${esc(d.to)}"></div>
            <button type="submit" class="erb-b go">Show</button><button type="button" class="erb-b" data-print>Print</button>
        </form>
        <div class="erb-sub" style="margin:-4px 0 12px"><b>${esc(periodText(d))}</b> · ${d.days} day${d.days === 1 ? "" : "s"}${d.group === "month" ? " · charts by month" : ""}</div>
        <div class="erb-tiles" role="list">
            <div class="erb-tile" role="listitem"><small>Visits</small><b>${t.visits}</b><span>${t.per_day} a day</span></div>
            <div class="erb-tile" role="listitem"><small>Median time to doctor</small><b>${min(t.doctor_median)}</b><span>${pct(t.doctor_on_time_pct)} within target</span></div>
            <div class="erb-tile" role="listitem"><small>Median time to triage</small><b>${min(t.triage_median)}</b><span>${pct(t.triage_on_time_pct)} within ${d.targets[0]} min</span></div>
            <div class="erb-tile" role="listitem"><small>Admit rate</small><b>${pct(t.admit_rate_pct)}</b><span>${t.admitted} admitted</span></div>
            <div class="erb-tile" role="listitem"><small>Median stay in the ER</small><b>${min(t.los_median)}</b><span>arrival → left the ER</span></div>
            <div class="erb-tile" role="listitem"><small>Left without being seen</small><b>${pct(t.lwbs_pct)}</b><span>${t.left} patient${t.left === 1 ? "" : "s"}</span></div>
        </div>
        ${t.visits ? `<div class="erb-charts">
            <div class="erb-chart" data-kind="visits"><h3>Visits and admissions</h3><div class="erb-sub">per ${d.group}</div>
                <div class="erb-legend"><span><i style="background:var(--er-s1)"></i>Visits</span><span><i style="background:var(--er-s2)"></i>Admitted</span></div>${c.visits}<div class="erb-tip" hidden></div></div>
            <div class="erb-chart" data-kind="doctor"><h3>Median time to a doctor</h3><div class="erb-sub">minutes from arrival, per ${d.group}</div>${c.doctor}<div class="erb-tip" hidden></div></div>
            <div class="erb-chart" data-kind="hours"><h3>Arrivals by hour of day</h3><div class="erb-sub">all days in the period</div>${c.hours}<div class="erb-tip" hidden></div></div>
        </div>
        <h2>By triage level</h2><div class="erb-wrap">${acuityTable(d)}</div>
        <div class="erb-two">
            <section><h2>Waiting times</h2><div class="erb-wrap">${waitTable(d)}</div></section>
            <section><h2>Where patients went</h2><div class="erb-wrap">${outcomeTable(d)}</div></section>
            <section><h2>How they came</h2><div class="erb-wrap">${smallTable("<th>Arrival</th><th class=\"n\">Visits</th>", d.arrival_modes.map((x) => `<tr><td>${esc(x.mode)}</td><td class="n">${x.count}</td></tr>`))}</div></section>
            <section><h2>Commonest ER diagnoses</h2><div class="erb-wrap">${smallTable("<th>Diagnosis</th><th class=\"n\">Visits</th><th class=\"n\">Admitted</th>",
                d.diagnoses.map((x) => `<tr><td>${esc(x.diagnosis)}</td><td class="n">${x.count}</td><td class="n">${x.admitted}</td></tr>`))}</div></section>
        </div>
        <h2>Protocols (chest pain, stroke, sepsis)</h2><div class="erb-wrap">${protocolTable(d)}</div>`
        : `<div class="erb-empty">No ER visits in this period.</div>`}`;
    bindTips(root, d);
    const f = root.querySelector("[data-f]");
    f.onsubmit = (ev) => {
        ev.preventDefault();
        state = { from: f.querySelector("#erbFrom").value, to: f.querySelector("#erbTo").value };
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
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ER report ${esc(periodText(d))}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 9.5pt; }
    h1 { margin: 0; font-size: 16pt; } h2 { font-size: 10.5pt; margin: 12px 0 4px; text-transform: uppercase; }
    .sub { color: #444; } .k { display: flex; flex-wrap: wrap; gap: 22px; margin: 8px 0; } .k b { font-size: 14pt; display: block; }
    .ch { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .ch svg { width: 100%; height: auto; } .ch text { font-size: 10px; } .ch h3 { font-size: 9.5pt; margin: 0; }
    .lg i { display: inline-block; width: 9px; height: 9px; margin: 0 4px 0 8px; } .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 8pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 5px; } .n { text-align: right; } tfoot td { font-weight: bold; } .muted { color: #666; } tr { page-break-inside: avoid; }
    footer { margin-top: 10px; font-size: 8pt; color: #555; } .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>ER report — ${esc(periodText(d))}</h1><div class="sub">${d.days} day${d.days === 1 ? "" : "s"} · admit rate = admitted ÷ visits · waiting times are medians</div>
<div class="k"><div>Visits<b>${t.visits}</b></div><div>Median to doctor<b>${min(t.doctor_median)}</b></div><div>Within target<b>${pct(t.doctor_on_time_pct)}</b></div>
    <div>Admit rate<b>${pct(t.admit_rate_pct)}</b></div><div>Median stay<b>${min(t.los_median)}</b></div><div>Left unseen<b>${pct(t.lwbs_pct)}</b></div></div>
${t.visits ? `<div class="ch"><div><h3>Visits and admissions</h3><div class="lg"><i style="background:#2a78d6"></i>Visits<i style="background:#eb6834"></i>Admitted</div>${c.visits}</div>
    <div><h3>Median time to a doctor (min)</h3>${c.doctor}</div><div><h3>Arrivals by hour of day</h3>${c.hours}</div></div>
<h2>By triage level</h2>${acuityTable(d, true)}
<div class="two"><div><h2>Waiting times</h2>${waitTable(d)}</div><div><h2>Where patients went</h2>${outcomeTable(d, true)}</div></div>
<h2>Protocols</h2>${protocolTable(d)}` : "<p>No ER visits in this period.</p>"}
<footer>ER report · ${esc(periodText(d))}</footer>
</body></html>`);
    win.document.close();
}
