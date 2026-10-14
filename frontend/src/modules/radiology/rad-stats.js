import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * Radiology report (module 15, Phase 3; tab "rad_report"), for a date range and optionally one modality or one
 * machine: turnaround (order -> booked -> scan -> signed report, with the share within target, by priority, by
 * modality, by where the request came from and by study), volume per machine (studies, minutes used against the
 * hours the machine works, patients who did not come, how long its studies took to report), studies per day, what
 * is still open, and the imaging charges posted. Charts with tables; printable.
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

/** Minutes the way the department says them: "38 min", "2 h 10 min", "1 d 4 h". */
const mins = (v) => {
    if (v === null || v === undefined) return "—";
    const m = Math.round(v);
    if (m < 60) return `${m} min`;
    if (m < 1440) return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
    return `${Math.floor(m / 1440)} d${Math.floor((m % 1440) / 60) ? ` ${Math.floor((m % 1440) / 60)} h` : ""}`;
};
const hoursText = (m) => (m >= 60 ? `${Math.round(m / 60)} h` : `${m} min`);

const CSS = `
.rsr { padding: 20px 24px 40px; max-width: 1280px; margin: 0 auto; color: var(--text-primary);
    --rs-s1: #2a78d6; --rs-s2: #0ea5e9; --rs-grid: #e5e7eb; --rs-axis: #6b7280; }
:root[data-theme="dark"] .rsr { --rs-s1: #3987e5; --rs-s2: #38bdf8; --rs-grid: #334155; --rs-axis: #94a3b8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .rsr { --rs-s1: #3987e5; --rs-s2: #38bdf8; --rs-grid: #334155; --rs-axis: #94a3b8; } }
@media (max-width: 600px) { .rsr { padding: 16px 16px 32px; } }
.rsr h1 { margin: 0; font-size: 22px; }
.rsr-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.rsr-f { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 14px 0; }
.rsr-f > div { min-width: 0; max-width: 100%; }
.rsr-f label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.rsr-f input, .rsr-f select { max-width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.rsr-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font: inherit; font-weight: 600; cursor: pointer; }
.rsr-b.go { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.rsr-b:focus-visible, .rsr-f input:focus-visible, .rsr-f select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.rsr-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(170px, 100%), 1fr)); gap: 10px; margin-bottom: 16px; }
.rsr-tile { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; background: var(--bg-surface); }
.rsr-tile small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.rsr-tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.rsr-tile span { font-size: 12px; color: var(--text-muted); }
.rsr-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 14px; }
.rsr-chart { border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 12px 6px; background: var(--bg-surface); position: relative; min-width: 0; }
.rsr-chart h3 { margin: 0 0 2px; font-size: 14px; }
.rsr-chart .rsr-sub { font-size: 12px; margin: 0 0 6px; }
.rsr-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.rsr-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.rsr-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.rsr-chart svg text { fill: var(--rs-axis); font-size: 10px; font-family: inherit; }
.rsr-tip { position: absolute; pointer-events: none; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px;
    padding: 6px 9px; font-size: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.15); white-space: nowrap; z-index: 2; }
.rsr-tip b { display: block; margin-bottom: 2px; }
.rsr-tip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; }
.rsr h2 { font-size: 16px; margin: 22px 0 8px; }
.rsr-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 14px; }
.rsr-two > section { min-width: 0; }
.rsr-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.rsr table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.rsr th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.rsr td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); }
.rsr .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rsr .muted { color: var(--text-muted); }
.rsr-note { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.rsr-empty { padding: 22px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.rsr-late { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .rsr-late { color: #fca5a5; }
.rsr-bar { height: 7px; border-radius: 4px; background: var(--bg-surface-alt); overflow: hidden; min-width: 70px; display: inline-block; vertical-align: -1px; }
.rsr-bar i { display: block; height: 100%; background: #1d4ed8; }
`;

let state = { from: "", to: "", modality: "", room_id: "" };

export function RadStatsView() {
    if (!document.getElementById("rsr-style")) {
        const st = document.createElement("style");
        st.id = "rsr-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    return `<div class="rsr" id="radStats"><div class="rsr-empty">Loading…</div></div>`;
}

export function initRadStats() {
    load();
}

async function load() {
    const root = document.getElementById("radStats");
    if (!root) return;
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const r = await api(`/radiology/stats?${q}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="rsr-empty">${esc(r?.message || "Could not load the report.")}</div>`;
        return;
    }
    state = { from: r.data.from, to: r.data.to, modality: r.data.modality || "", room_id: r.data.room_id || "" };
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

const PAGE_PAL = { s1: "var(--rs-s1)", s2: "var(--rs-s2)", grid: "var(--rs-grid)", surface: "var(--bg-surface)", text: null };
const PRINT_PAL = { s1: "#2a78d6", s2: "#0ea5e9", grid: "#d1d5db", surface: "#fff", text: "#444" };

function charts(d, pal, hover) {
    const labels = d.series.map((x) => label(x.period, d.group));
    const hours = (t) => (t >= 120 ? `${Math.round(t / 60)} h` : `${Math.round(t)}m`);
    return {
        volume: barsChart(d.series.map((x) => x.ordered), d.series.map((x) => x.performed), labels, "Studies ordered and performed", pal, hover),
        tat: lineChart(d.series.map((x) => x.mean_tat), labels, "Average order to signed report", pal, hover, hours),
        reported: barsChart(d.series.map((x) => x.reported), null, labels, "Reports signed", pal, hover),
    };
}

function bindTips(root, d) {
    root.querySelectorAll(".rsr-chart[data-kind]").forEach((box) => {
        const tip = box.querySelector(".rsr-tip");
        const kind = box.dataset.kind;
        const show = (i, ev) => {
            const x = d.series[i];
            const head = `<b>${esc(label(x.period, d.group, true))}</b>`;
            tip.innerHTML = kind === "volume"
                ? `${head}<i style="background:var(--rs-s1)"></i>Ordered ${x.ordered}<br><i style="background:var(--rs-s2)"></i>Performed ${x.performed}`
                : kind === "tat" ? `${head}<i style="background:var(--rs-s1)"></i>${x.mean_tat === null ? "Nothing reported" : `${mins(x.mean_tat)} on average`}<br><span class="muted">${x.reported} reported</span>`
                : `${head}<i style="background:var(--rs-s1)"></i>${x.reported} report${x.reported === 1 ? "" : "s"} signed`;
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

const within = (v) => (v === null ? "—" : `<span class="${v < 80 ? "rsr-late" : ""}">${pct(v)}</span>`);

function priorityTable(d) {
    const t = d.totals;
    return `<table><thead><tr><th>Priority</th><th class="n">Studies</th><th class="n">To book</th><th class="n">To scan</th><th class="n">Within</th><th class="n">Scan → report</th><th class="n">Order → report</th><th class="n">90th</th><th class="n">Within</th></tr></thead><tbody>
        ${d.priority_rows.map((p) => `<tr><td><b>${esc(p.label)}</b><div class="muted" style="font-size:12px">target ${mins(p.target_scan)} to scan, ${mins(p.target_report)} to report, ${mins(p.target_total)} in all</div></td>
            <td class="n">${p.studies}</td><td class="n">${mins(p.book.median)}</td><td class="n">${mins(p.scan.median)}</td><td class="n">${within(p.within_scan_pct)}</td>
            <td class="n">${mins(p.read.median)}</td><td class="n"><b>${mins(p.total.median)}</b></td><td class="n">${mins(p.total.p90)}</td><td class="n">${within(p.within_total_pct)}</td></tr>`).join("")}
        <tr><td><b>All studies</b></td><td class="n">${t.studies}</td><td class="n">${mins(t.book.median)}</td><td class="n">${mins(t.scan.median)}</td><td class="n">${within(t.within_scan_pct)}</td>
            <td class="n">${mins(t.read.median)}</td><td class="n"><b>${mins(t.total.median)}</b></td><td class="n">${mins(t.total.p90)}</td><td class="n">${within(t.within_total_pct)}</td></tr>
    </tbody></table>`;
}

function machineTable(d) {
    if (!d.machines.length) return `<div class="rsr-empty">No machine matches that filter.</div>`;
    return `<table><thead><tr><th>Machine</th><th class="n">Studies</th><th class="n">Done</th><th class="n">A day</th><th class="n">Did not come</th><th class="n">Minutes used</th><th class="n">Busy</th><th class="n">Scan → report</th><th class="n">Charged</th></tr></thead><tbody>
        ${d.machines.map((m) => `<tr><td><b>${esc(m.room.name)}</b><div class="muted" style="font-size:12px">${esc(m.room.modality_label)}${m.room.portable ? " · portable" : ""} · ${m.room.around_the_clock ? "day and night" : `${esc(m.room.open_from)}–${esc(m.room.open_to)}`}${m.room.is_active ? "" : " · not in use"}</div></td>
            <td class="n">${m.booked}</td><td class="n">${m.performed}</td><td class="n">${m.per_day}</td>
            <td class="n">${m.no_show || ""}${m.no_show ? ` <span class="muted">(${pct(m.no_show_pct)})</span>` : ""}</td>
            <td class="n">${hoursText(m.minutes)}<div class="muted" style="font-size:11.5px">of ${hoursText(m.open_minutes)}</div></td>
            <td class="n">${m.utilisation_pct === null ? "—" : `${m.utilisation_pct}% <span class="rsr-bar" style="width:70px"><i style="width:${Math.min(100, m.utilisation_pct)}%"></i></span>`}</td>
            <td class="n">${mins(m.read.median)}</td><td class="n">${esc(peso(m.charged))}</td></tr>`).join("")}
    </tbody></table>`;
}

function modalityTable(d) {
    if (!d.modalities.length) return `<div class="rsr-empty">No studies in this period.</div>`;
    return `<table><thead><tr><th>Imaging</th><th class="n">Studies</th><th class="n">Done</th><th class="n">Reported</th><th class="n">Order → report</th><th class="n">Within</th><th class="n">Critical</th><th class="n">Charged</th></tr></thead><tbody>
        ${d.modalities.map((m) => `<tr><td>${esc(m.label)}</td><td class="n">${m.studies}</td><td class="n">${m.performed}</td><td class="n">${m.reported}</td>
            <td class="n">${mins(m.total.median)}</td><td class="n">${within(m.within_total_pct)}</td><td class="n">${m.criticals || ""}</td><td class="n">${esc(peso(m.charged))}</td></tr>`).join("")}
    </tbody></table>`;
}

function sourceTable(d) {
    if (!d.sources.length) return `<div class="rsr-empty">None.</div>`;
    return `<table><thead><tr><th>Ordered from</th><th class="n">Studies</th><th class="n">Reported</th><th class="n">Order → report</th><th class="n">Within</th></tr></thead><tbody>
        ${d.sources.map((s) => `<tr><td>${esc(s.label)}</td><td class="n">${s.studies}</td><td class="n">${s.reported}</td><td class="n">${mins(s.total.median)}</td><td class="n">${within(s.within_total_pct)}</td></tr>`).join("")}
    </tbody></table>`;
}

function studyTable(d) {
    if (!d.studies.length) return `<div class="rsr-empty">No studies in this period.</div>`;
    return `<table><thead><tr><th>Study</th><th class="n">Ordered</th><th class="n">Done</th><th class="n">Reported</th><th class="n">Cancelled</th><th class="n">Order → report</th><th class="n">Within</th><th class="n">Critical</th><th class="n">Charged</th></tr></thead><tbody>
        ${d.studies.map((s) => `<tr><td>${esc(s.name)}</td><td class="n">${s.studies}</td><td class="n">${s.performed}</td><td class="n">${s.reported}</td><td class="n">${s.cancelled || ""}</td>
            <td class="n">${mins(s.total.median)}</td><td class="n">${within(s.within_total_pct)}</td><td class="n">${s.criticals || ""}</td><td class="n">${esc(peso(s.charged))}</td></tr>`).join("")}
    </tbody></table>`;
}

function chargeTable(d) {
    const c = d.charges;
    return `<table><thead><tr><th>Imaging charges in the period</th><th class="n">Amount</th></tr></thead><tbody>
        <tr><td>Charges posted <span class="muted">(${c.charged} ${c.charged === 1 ? "study" : "studies"})</span></td><td class="n">${esc(peso(c.gross))}</td></tr>
        <tr><td>Discounts <span class="muted">(${c.discounted} charge${c.discounted === 1 ? "" : "s"}: Senior Citizen, PWD, other)</span></td><td class="n">− ${esc(peso(c.discount))}</td></tr>
        <tr><td><b>To the patients' ledgers</b></td><td class="n"><b>${esc(peso(c.net))}</b></td></tr>
        <tr><td>Charges voided</td><td class="n">${c.voided || "—"}</td></tr>
        <tr><td>Reported studies not charged <span class="muted">(no price, or the charge was voided)</span></td><td class="n">${c.uncharged_total || "—"}</td></tr>
    </tbody></table>
    ${c.uncharged.length ? `<div class="rsr-note">Not charged: ${esc(c.uncharged.map((u) => `${u.name} (${u.studies})`).join(", "))}. A study with no price is priced under
        <b>Radiology Worklist → Charges → Study prices</b> and charged there; a charge voided on purpose needs nothing.</div>` : ""}`;
}

function openTable(d) {
    const t = d.totals;
    return `<table><tbody>
        <tr><td>Waiting to be scheduled</td><td class="n">${t.to_schedule}</td></tr>
        <tr><td>Booked, not scanned yet</td><td class="n">${t.to_scan}</td></tr>
        <tr><td>Scanned, waiting for the radiologist</td><td class="n">${t.to_report}</td></tr>
        <tr><td>Cancelled studies</td><td class="n">${t.cancelled}</td></tr>
        <tr><td>Patients who did not come</td><td class="n">${t.no_shows}</td></tr>
        <tr><td>Critical findings</td><td class="n">${t.criticals}</td></tr>
        <tr><td>Addenda / corrections after signing</td><td class="n">${t.addenda} / ${t.corrections}</td></tr>
        <tr><td>Images stored</td><td class="n">${t.images}</td></tr>
    </tbody></table>`;
}

/* ---------------- page ---------------- */

const periodText = (d) => (d.from === d.to ? longDate(d.from) : `${longDate(d.from)} – ${longDate(d.to)}`);

function render(root, d) {
    const t = d.totals;
    const c = charts(d, PAGE_PAL, true);
    root.innerHTML = `
        <h1>Radiology report</h1>
        <div class="rsr-sub">The studies ordered in the period: how long each step took, what each machine did, and what was charged. Turnaround is counted on the studies that reached that step; the machine table counts by the day of the scan.</div>
        <form class="rsr-f" data-f>
            <div><label for="rsrFrom">From</label><input type="date" id="rsrFrom" value="${esc(d.from)}"></div>
            <div><label for="rsrTo">To</label><input type="date" id="rsrTo" value="${esc(d.to)}"></div>
            <div><label for="rsrMod">Imaging</label><select id="rsrMod"><option value="">All imaging</option>${Object.entries(d.modalities_list).map(([k, l]) => `<option value="${k}" ${d.modality === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
            <div><label for="rsrRoom">Machine</label><select id="rsrRoom"><option value="">All machines</option>${d.rooms.map((r) => `<option value="${r.id}" ${Number(d.room_id) === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
            <button type="submit" class="rsr-b go">Show</button><button type="button" class="rsr-b" data-print>Print</button>
        </form>
        <div class="rsr-sub" style="margin:-4px 0 12px"><b>${esc(periodText(d))}</b> · ${d.days} day${d.days === 1 ? "" : "s"}${d.modality ? ` · ${esc(d.modalities_list[d.modality])}` : ""}${d.group === "month" ? " · charts by month" : ""}</div>
        <div class="rsr-tiles" role="list">
            <div class="rsr-tile" role="listitem"><small>Studies ordered</small><b>${t.studies}</b><span>${t.per_day} a day · ${t.requests} request${t.requests === 1 ? "" : "s"}</span></div>
            <div class="rsr-tile" role="listitem"><small>Performed</small><b>${t.performed}</b><span>${t.reported} reported · ${t.cancelled} cancelled</span></div>
            <div class="rsr-tile" role="listitem"><small>Order → report (median)</small><b>${mins(t.total.median)}</b><span>90th ${mins(t.total.p90)} · mean ${mins(t.total.mean)}</span></div>
            <div class="rsr-tile" role="listitem"><small>Within target</small><b>${pct(t.within_total_pct)}</b><span>${pct(t.within_scan_pct)} scanned in time</span></div>
            <div class="rsr-tile" role="listitem"><small>Order → scan (median)</small><b>${mins(t.scan.median)}</b><span>scan → report ${mins(t.read.median)}</span></div>
            <div class="rsr-tile" role="listitem"><small>STAT studies</small><b>${t.stat}</b><span>${t.criticals} critical finding${t.criticals === 1 ? "" : "s"}</span></div>
            <div class="rsr-tile" role="listitem"><small>Still open</small><b>${t.to_schedule + t.to_scan + t.to_report}</b><span>${t.to_schedule} to book · ${t.to_scan} to scan · ${t.to_report} to report</span></div>
            <div class="rsr-tile" role="listitem"><small>Charged</small><b>${esc(peso(d.charges.net))}</b><span>${d.charges.charged} charge${d.charges.charged === 1 ? "" : "s"}${d.charges.uncharged_total ? ` · ${d.charges.uncharged_total} not charged` : ""}</span></div>
        </div>
        ${t.studies ? `<div class="rsr-charts">
            <div class="rsr-chart" data-kind="volume"><h3>Studies ordered and performed</h3><div class="rsr-sub">per ${d.group}</div>
                <div class="rsr-legend"><span><i style="background:var(--rs-s1)"></i>Ordered</span><span><i style="background:var(--rs-s2)"></i>Performed</span></div>${c.volume}<div class="rsr-tip" hidden></div></div>
            <div class="rsr-chart" data-kind="tat"><h3>Order to signed report</h3><div class="rsr-sub">average, per ${d.group} of the report</div>${c.tat}<div class="rsr-tip" hidden></div></div>
            <div class="rsr-chart" data-kind="reported"><h3>Reports signed</h3><div class="rsr-sub">per ${d.group}</div>${c.reported}<div class="rsr-tip" hidden></div></div>
        </div>
        <h2>Turnaround by priority</h2><div class="rsr-wrap">${priorityTable(d)}</div>
        <div class="rsr-note">Medians. “To book” is from the order to the booking being made, “to scan” from the order to the scan, “scan → report” until the radiologist signs.
            Targets: scan STAT 1 h / urgent 4 h / routine 2 days; report STAT 1 h / urgent 4 h / routine 24 h; the whole way STAT 2 h / urgent 8 h / routine 3 days.</div>
        <h2>Per machine</h2><div class="rsr-wrap">${machineTable(d)}</div>
        <div class="rsr-note">Counted by the day of the scan. “Busy” is the minutes booked against the hours the machine works in the elapsed part of the period — a machine on call day and night counts 24 hours a day, so its share looks small.</div>
        <div class="rsr-two">
            <section><h2>By imaging type</h2><div class="rsr-wrap">${modalityTable(d)}</div></section>
            <section><h2>Where the requests came from</h2><div class="rsr-wrap">${sourceTable(d)}</div></section>
            <section><h2>Charges</h2><div class="rsr-wrap">${chargeTable(d)}</div></section>
            <section><h2>Still open and the rest</h2><div class="rsr-wrap">${openTable(d)}</div></section>
        </div>
        <h2>Studies${d.study_count > d.studies.length ? ` <span class="muted" style="font-size:13px">(the ${d.studies.length} busiest of ${d.study_count})</span>` : ""}</h2>
        <div class="rsr-wrap">${studyTable(d)}</div>`
        : `<div class="rsr-empty">No imaging was ordered in this period.</div>`}`;
    bindTips(root, d);
    const f = root.querySelector("[data-f]");
    f.onsubmit = (ev) => {
        ev.preventDefault();
        state = { from: f.querySelector("#rsrFrom").value, to: f.querySelector("#rsrTo").value, modality: f.querySelector("#rsrMod").value,
            room_id: f.querySelector("#rsrRoom").value };
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
    const room = d.room_id ? d.rooms.find((r) => Number(r.id) === Number(d.room_id))?.name : null;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Radiology report ${esc(periodText(d))}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 9.5pt; }
    h1 { margin: 0; font-size: 16pt; } h2 { font-size: 10.5pt; margin: 12px 0 4px; text-transform: uppercase; }
    .sub { color: #444; } .k { display: flex; flex-wrap: wrap; gap: 22px; margin: 8px 0; } .k b { font-size: 14pt; display: block; }
    .ch { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .ch svg { width: 100%; height: auto; } .ch text { font-size: 10px; } .ch h3 { font-size: 9.5pt; margin: 0; }
    .lg i { display: inline-block; width: 9px; height: 9px; margin: 0 4px 0 8px; } .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 8pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 5px; } .n { text-align: right; } .muted { color: #666; } tr { page-break-inside: avoid; } .rsr-late { font-weight: bold; }
    .rsr-bar { display: none; } footer { margin-top: 10px; font-size: 8pt; color: #555; }
    .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>Radiology report — ${esc(periodText(d))}${d.modality ? ` · ${esc(d.modalities_list[d.modality])}` : ""}${room ? ` · ${esc(room)}` : ""}</h1>
<div class="sub">${d.days} day${d.days === 1 ? "" : "s"} · studies ordered in the period · the machine table counts by the day of the scan</div>
<div class="k"><div>Studies ordered<b>${t.studies}</b></div><div>A day<b>${t.per_day}</b></div><div>Performed<b>${t.performed}</b></div><div>Reported<b>${t.reported}</b></div>
    <div>Order → report (median)<b>${mins(t.total.median)}</b></div><div>Within target<b>${pct(t.within_total_pct)}</b></div>
    <div>Order → scan<b>${mins(t.scan.median)}</b></div><div>STAT<b>${t.stat}</b></div><div>Critical findings<b>${t.criticals}</b></div>
    <div>Charged<b>${esc(peso(d.charges.net))}</b></div></div>
${t.studies ? `<div class="ch"><div><h3>Studies ordered and performed</h3><div class="lg"><i style="background:#2a78d6"></i>Ordered<i style="background:#0ea5e9"></i>Performed</div>${c.volume}</div>
    <div><h3>Order to signed report (average)</h3>${c.tat}</div><div><h3>Reports signed</h3>${c.reported}</div></div>
<h2>Turnaround by priority</h2>${priorityTable(d)}
<h2>Per machine</h2>${machineTable(d)}
<div class="two"><div><h2>By imaging type</h2>${modalityTable(d)}</div><div><h2>Where the requests came from</h2>${sourceTable(d)}</div></div>
<div class="two"><div><h2>Charges</h2>${chargeTable(d)}</div><div><h2>Still open and the rest</h2>${openTable(d)}</div></div>
<h2>Studies</h2>${studyTable(d)}` : "<p>No imaging was ordered in this period.</p>"}
<footer>Radiology report · ${esc(periodText(d))} · medians unless said otherwise</footer>
</body></html>`);
    win.document.close();
}
