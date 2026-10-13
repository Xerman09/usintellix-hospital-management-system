import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * ICU report (module 13, Phase 3; tab "icu_report"), for a date range (and an ICU ward when there are several):
 * ICU admissions and where from, length of stay, occupancy, readmission within 48 h, mortality in the ICU and
 * in hospital against the APACHE II prediction (SMR), severity (APACHE II, SOFA), and device days -- ventilator,
 * central line, urinary catheter -- with CLABSI / CAUTI / VAP per 1,000 device days (from the HAI/SSI log).
 * Charts with tables; printable.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`);
const n1 = (v) => (v === null || v === undefined ? "—" : String(v));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (p, group, long = false) => {
    const [y, m, d] = p.split("-");
    if (group === "day") return long ? `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` : `${Number(d)}`;
    return long ? `${MONTHS[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};
const longDate = (iso) => label(iso, "day", true);
const when = (dt) => (dt ? `${longDate(String(dt).slice(0, 10))} ${String(dt).slice(11, 16)}` : "");

const CSS = `
.icr { padding: 20px 24px 40px; max-width: 1280px; margin: 0 auto; color: var(--text-primary);
    --ic-s1: #2a78d6; --ic-s2: #eb6834; --ic-grid: #e5e7eb; --ic-axis: #6b7280; }
:root[data-theme="dark"] .icr { --ic-s1: #3987e5; --ic-s2: #d95926; --ic-grid: #334155; --ic-axis: #94a3b8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .icr { --ic-s1: #3987e5; --ic-s2: #d95926; --ic-grid: #334155; --ic-axis: #94a3b8; } }
@media (max-width: 600px) { .icr { padding: 16px 16px 32px; } }
.icr h1 { margin: 0; font-size: 22px; }
.icr-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.icr-f { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 14px 0; }
.icr-f > div { min-width: 0; max-width: 100%; }
.icr-f label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.icr-f input, .icr-f select { max-width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.icr-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font: inherit; font-weight: 600; cursor: pointer; }
.icr-b.go { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.icr-b:focus-visible, .icr-f input:focus-visible, .icr-f select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.icr-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(170px, 100%), 1fr)); gap: 10px; margin-bottom: 16px; }
.icr-tile { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; background: var(--bg-surface); }
.icr-tile small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.icr-tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.icr-tile span { font-size: 12px; color: var(--text-muted); }
.icr-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 14px; }
.icr-chart { border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 12px 6px; background: var(--bg-surface); position: relative; min-width: 0; }
.icr-chart h3 { margin: 0 0 2px; font-size: 14px; }
.icr-chart .icr-sub { font-size: 12px; margin: 0 0 6px; }
.icr-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.icr-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.icr-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.icr-chart svg text { fill: var(--ic-axis); font-size: 10px; font-family: inherit; }
.icr-tip { position: absolute; pointer-events: none; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px;
    padding: 6px 9px; font-size: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.15); white-space: nowrap; z-index: 2; }
.icr-tip b { display: block; margin-bottom: 2px; }
.icr-tip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; }
.icr h2 { font-size: 16px; margin: 22px 0 8px; }
.icr-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 14px; }
.icr-two > section { min-width: 0; }
.icr-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.icr table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.icr th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.icr td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); }
.icr .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.icr .muted { color: var(--text-muted); }
.icr-note { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.icr-empty { padding: 22px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
.icr-died { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .icr-died { color: #fca5a5; }
`;

let state = { from: "", to: "", ward_id: "" };

export function IcuReportView() {
    if (!document.getElementById("icr-style")) {
        const st = document.createElement("style");
        st.id = "icr-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    return `<div class="icr" id="icuReport"><div class="icr-empty">Loading…</div></div>`;
}

export function initIcuReport() {
    load();
}

async function load() {
    const root = document.getElementById("icuReport");
    if (!root) return;
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const r = await api(`/icu/report?${q}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="icr-empty">${esc(r?.message || "Could not load the report.")}</div>`;
        return;
    }
    state = { from: r.data.from, to: r.data.to, ward_id: r.data.ward_id || "" };
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

function lineChart(points, labels, title, pal, hover) {
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
    const fmt = max <= 5 ? (t) => (Math.round(t * 10) / 10).toString() : (t) => Math.round(t);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${axes(max, n, labels, Math.ceil(n / 12), fmt, pal)}
        <path d="${d}" fill="none" stroke="${pal.s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${points.map((v, i) => (v === null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="${n > 20 ? 3 : 4}" fill="${pal.s1}" stroke="${pal.surface}" stroke-width="2"/>`)).join("")}${hits(n, hover)}</svg>`;
}

const PAGE_PAL = { s1: "var(--ic-s1)", s2: "var(--ic-s2)", grid: "var(--ic-grid)", surface: "var(--bg-surface)", text: null };
const PRINT_PAL = { s1: "#2a78d6", s2: "#eb6834", grid: "#d1d5db", surface: "#fff", text: "#444" };

function charts(d, pal, hover) {
    const labels = d.series.map((x) => label(x.period, d.group));
    return {
        admits: barsChart(d.series.map((x) => x.admitted), d.series.map((x) => x.died), labels, "ICU admissions and deaths in the ICU", pal, hover),
        census: lineChart(d.series.map((x) => (x.days ? x.avg_census : null)), labels, "Average patients in the ICU a day", pal, hover),
        vent: barsChart(d.series.map((x) => x.ventilator_days), null, labels, "Ventilator days", pal, hover),
    };
}

function bindTips(root, d) {
    root.querySelectorAll(".icr-chart[data-kind]").forEach((box) => {
        const tip = box.querySelector(".icr-tip");
        const kind = box.dataset.kind;
        const show = (i, ev) => {
            const x = d.series[i];
            const head = `<b>${esc(label(x.period, d.group, true))}</b>`;
            tip.innerHTML = kind === "admits"
                ? `${head}<i style="background:var(--ic-s1)"></i>Admitted ${x.admitted}<br><i style="background:var(--ic-s2)"></i>Died in the ICU ${x.died}`
                : kind === "census" ? `${head}<i style="background:var(--ic-s1)"></i>${x.days ? `${x.avg_census} patients a day` : "Not yet"}<br><span class="muted">${x.patient_days} patient days</span>`
                : `${head}<i style="background:var(--ic-s1)"></i>${x.ventilator_days} ventilator day${x.ventilator_days === 1 ? "" : "s"}`;
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

function deviceTable(d) {
    const v = d.devices;
    return `<table><thead><tr><th>Device</th><th class="n">Days</th><th class="n">Utilisation</th></tr></thead><tbody>
        <tr><td>Patient days in the ICU</td><td class="n"><b>${v.patient_days}</b></td><td class="n"></td></tr>
        <tr><td>Ventilator days <span class="muted">(${v.ventilated_patients} patient${v.ventilated_patients === 1 ? "" : "s"})</span></td><td class="n"><b>${v.ventilator_days}</b></td><td class="n">${n1(v.ventilator_ratio)}</td></tr>
        <tr><td>Central line days</td><td class="n"><b>${v.central_days}</b></td><td class="n">${n1(v.central_ratio)}</td></tr>
        <tr><td>Urinary catheter days</td><td class="n"><b>${v.urinary_days}</b></td><td class="n">${n1(v.urinary_ratio)}</td></tr>
    </tbody></table>`;
}

function infectionTable(d) {
    const v = d.devices;
    return `<table><thead><tr><th>Infection</th><th class="n">Cases</th><th class="n">Device days</th><th class="n">Per 1,000</th></tr></thead><tbody>
        ${v.infections.map((x) => `<tr><td><b>${esc(x.type)}</b> <span class="muted">${esc(x.device.toLowerCase())}</span>${x.cases.length ? `<div class="muted" style="font-size:12px">${esc(x.cases.map((c) => `${c.tracking_number} (${longDate(c.onset_date)})`).join(", "))}</div>` : ""}</td>
            <td class="n">${x.count}</td><td class="n">${x.device_days}</td><td class="n"><b>${x.rate === null ? "—" : x.rate}</b></td></tr>`).join("")}
    </tbody></table>`;
}

function bandTable(d) {
    return `<table><thead><tr><th>APACHE II</th><th class="n">Patients</th><th class="n">Died</th><th class="n">Observed</th><th class="n">Predicted</th></tr></thead><tbody>
        ${d.apache_bands.map((b) => `<tr><td>${esc(b.label)}</td><td class="n">${b.stays}</td><td class="n">${b.died}</td><td class="n">${pct(b.observed_pct)}</td><td class="n">${pct(b.predicted_pct)}</td></tr>`).join("")}
    </tbody></table>`;
}

function outcomeTable(d) {
    return `<table><thead><tr><th>Where patients went</th><th class="n">Patients</th><th class="n">Share</th></tr></thead><tbody>
        ${d.outcomes.map((o) => `<tr><td>${esc(o.label)}</td><td class="n">${o.count}</td><td class="n">${pct(o.pct)}</td></tr>`).join("")}</tbody></table>`;
}

const smallTable = (head, rows) => (rows.length ? `<table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table>` : `<div class="icr-empty">None.</div>`);

function staysTable(d, print = false) {
    if (!d.stays.length) return `<div class="icr-empty">No ICU stays in this period.</div>`;
    return `<table><thead><tr><th>Patient</th><th>In</th><th>Out</th><th class="n">Days</th><th>From</th><th class="n">APACHE II</th><th class="n">SOFA day 1 / max</th>
        <th class="n">Vent / CL / UC days</th><th>Outcome</th></tr></thead><tbody>
        ${d.stays.map((s) => `<tr><td><b>${esc(s.name)}</b><div class="muted" style="font-size:12px">${esc(s.mrn || "")}${s.age !== null ? ` · ${esc(s.age)} y` : ""}${s.diagnosis && !print ? ` · ${esc(s.diagnosis)}` : ""}</div></td>
            <td>${esc(when(s.in_at))}</td><td>${s.out_at ? esc(when(s.out_at)) : `<span class="muted">still in</span>`}</td><td class="n">${s.los_days}</td><td>${esc(s.source)}</td>
            <td class="n">${s.apache ?? "—"}${s.predicted !== null ? ` <span class="muted">(${s.predicted}%)</span>` : ""}</td>
            <td class="n">${s.sofa_first ?? "—"} / ${s.sofa_max ?? "—"}</td><td class="n">${s.vent_days} / ${s.central_days} / ${s.urinary_days}</td>
            <td>${s.died_in_hospital ? `<span class="icr-died">${s.outcome === "Died in the ICU" ? "Died in the ICU" : `${esc(s.outcome)} · died in hospital`}</span>` : esc(s.outcome)}${s.readmitted_48h ? `<div class="muted" style="font-size:12px">back in the ICU within 48 h</div>` : ""}</td></tr>`).join("")}
    </tbody></table>`;
}

/* ---------------- page ---------------- */

function periodText(d) {
    return d.from === d.to ? longDate(d.from) : `${longDate(d.from)} – ${longDate(d.to)}`;
}

function render(root, d) {
    const t = d.totals;
    const c = charts(d, PAGE_PAL, true);
    const v = d.devices;
    root.innerHTML = `
        <h1>ICU report</h1>
        <div class="icr-sub">ICU stays in the period. Mortality counts the patients who left the ICU in the period; hospital mortality once per hospital admission (its last ICU stay).</div>
        <form class="icr-f" data-f>
            <div><label for="icrFrom">From</label><input type="date" id="icrFrom" value="${esc(d.from)}"></div>
            <div><label for="icrTo">To</label><input type="date" id="icrTo" value="${esc(d.to)}"></div>
            ${d.wards.length > 1 ? `<div><label for="icrWard">ICU</label><select id="icrWard"><option value="">All ICU wards</option>${d.wards.map((w) => `<option value="${w.id}" ${Number(d.ward_id) === Number(w.id) ? "selected" : ""}>${esc(w.ward_name)}</option>`).join("")}</select></div>` : ""}
            <button type="submit" class="icr-b go">Show</button><button type="button" class="icr-b" data-print>Print</button>
        </form>
        <div class="icr-sub" style="margin:-4px 0 12px"><b>${esc(periodText(d))}</b> · ${d.days} day${d.days === 1 ? "" : "s"} · ${t.beds} ICU bed${t.beds === 1 ? "" : "s"}${d.group === "month" ? " · charts by month" : ""}</div>
        <div class="icr-tiles" role="list">
            <div class="icr-tile" role="listitem"><small>ICU admissions</small><b>${t.admitted}</b><span>${t.ended} left the ICU</span></div>
            <div class="icr-tile" role="listitem"><small>Occupancy</small><b>${pct(t.occupancy_pct)}</b><span>${n1(t.avg_census)} patients a day on average</span></div>
            <div class="icr-tile" role="listitem"><small>Median length of stay</small><b>${t.los_median === null ? "—" : `${t.los_median} d`}</b><span>mean ${t.los_mean === null ? "—" : `${t.los_mean} d`} · ${t.los_over_7} over 7 days</span></div>
            <div class="icr-tile" role="listitem"><small>ICU mortality</small><b>${pct(t.icu_mortality_pct)}</b><span>${t.icu_deaths} died in the ICU</span></div>
            <div class="icr-tile" role="listitem"><small>Hospital mortality</small><b>${pct(t.hospital_mortality_pct)}</b><span>${t.hospital_deaths} of ${t.patients_left}${t.still_in_hospital ? ` · ${t.still_in_hospital} still in hospital` : ""}</span></div>
            <div class="icr-tile" role="listitem"><small>SMR (APACHE II)</small><b>${t.smr === null ? "—" : t.smr}</b><span>${t.observed} died vs ${t.expected} expected</span></div>
            <div class="icr-tile" role="listitem"><small>Back within 48 h</small><b>${pct(t.readmit_pct)}</b><span>${t.readmitted_48h} of ${t.to_ward} sent to a ward</span></div>
            <div class="icr-tile" role="listitem"><small>Median APACHE II</small><b>${n1(t.apache_median)}</b><span>${t.apache_count} admission${t.apache_count === 1 ? "" : "s"} · SOFA day 1 median ${n1(t.sofa_first_median)}</span></div>
        </div>
        ${d.stays.length ? `<div class="icr-charts">
            <div class="icr-chart" data-kind="admits"><h3>Admissions and deaths in the ICU</h3><div class="icr-sub">per ${d.group}</div>
                <div class="icr-legend"><span><i style="background:var(--ic-s1)"></i>Admitted</span><span><i style="background:var(--ic-s2)"></i>Died in the ICU</span></div>${c.admits}<div class="icr-tip" hidden></div></div>
            <div class="icr-chart" data-kind="census"><h3>Patients in the ICU</h3><div class="icr-sub">average a day, per ${d.group}</div>${c.census}<div class="icr-tip" hidden></div></div>
            <div class="icr-chart" data-kind="vent"><h3>Ventilator days</h3><div class="icr-sub">per ${d.group}</div>${c.vent}<div class="icr-tip" hidden></div></div>
        </div>
        <div class="icr-two">
            <section><h2>Device days</h2><div class="icr-wrap">${deviceTable(d)}</div>
                <div class="icr-note">CDC/NHSN counting: a calendar day counts when the device was in at any time that day while the patient was in the ICU. Utilisation = device days ÷ patient days. Ventilator days come from the hours charted on a ventilator.</div></section>
            <section><h2>Device infections</h2><div class="icr-wrap">${infectionTable(d)}</div>
                <div class="icr-note">From HAI &amp; SSI Infections: onset in the period while in the ICU or the day after leaving it.${v.unlinked ? ` <b>${v.unlinked} CLABSI/CAUTI/VAP case${v.unlinked === 1 ? "" : "s"} in the period ha${v.unlinked === 1 ? "s" : "ve"} no patient chosen, so can't be counted here.</b>` : ""}</div></section>
            <section><h2>Mortality by APACHE II</h2><div class="icr-wrap">${bandTable(d)}</div>
                <div class="icr-note">Patients who left the ICU in the period (last ICU stay). Predicted: APACHE II equation without the diagnosis weight.</div></section>
            <section><h2>Where patients went</h2><div class="icr-wrap">${outcomeTable(d)}</div></section>
            <section><h2>Where admissions came from</h2><div class="icr-wrap">${smallTable('<th>From</th><th class="n">Admissions</th>', d.sources.map((x) => `<tr><td>${esc(x.source)}</td><td class="n">${x.count}</td></tr>`))}</div></section>
        </div>
        <h2>ICU stays</h2><div class="icr-wrap">${staysTable(d)}</div>`
        : `<div class="icr-empty">No ICU stays in this period.</div>`}`;
    bindTips(root, d);
    const f = root.querySelector("[data-f]");
    f.onsubmit = (ev) => {
        ev.preventDefault();
        state = { from: f.querySelector("#icrFrom").value, to: f.querySelector("#icrTo").value, ward_id: f.querySelector("#icrWard")?.value || "" };
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
    const ward = d.ward_id ? d.wards.find((w) => Number(w.id) === Number(d.ward_id))?.ward_name : null;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ICU report ${esc(periodText(d))}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 9.5pt; }
    h1 { margin: 0; font-size: 16pt; } h2 { font-size: 10.5pt; margin: 12px 0 4px; text-transform: uppercase; }
    .sub { color: #444; } .k { display: flex; flex-wrap: wrap; gap: 22px; margin: 8px 0; } .k b { font-size: 14pt; display: block; }
    .ch { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .ch svg { width: 100%; height: auto; } .ch text { font-size: 10px; } .ch h3 { font-size: 9.5pt; margin: 0; }
    .lg i { display: inline-block; width: 9px; height: 9px; margin: 0 4px 0 8px; } .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 8pt; text-transform: uppercase; border-bottom: 1.5px solid #111; padding: 3px 5px; }
    td { border-bottom: 1px solid #bbb; padding: 3px 5px; } .n { text-align: right; } .muted { color: #666; } tr { page-break-inside: avoid; } .icr-died { font-weight: bold; }
    footer { margin-top: 10px; font-size: 8pt; color: #555; } .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>ICU report — ${esc(periodText(d))}${ward ? ` · ${esc(ward)}` : ""}</h1><div class="sub">${d.days} day${d.days === 1 ? "" : "s"} · ${t.beds} ICU beds · hospital mortality once per admission (last ICU stay)</div>
<div class="k"><div>Admissions<b>${t.admitted}</b></div><div>Occupancy<b>${pct(t.occupancy_pct)}</b></div><div>Median stay<b>${t.los_median === null ? "—" : `${t.los_median} d`}</b></div>
    <div>ICU mortality<b>${pct(t.icu_mortality_pct)}</b></div><div>Hospital mortality<b>${pct(t.hospital_mortality_pct)}</b></div><div>SMR<b>${t.smr ?? "—"}</b></div>
    <div>Back within 48 h<b>${pct(t.readmit_pct)}</b></div><div>Median APACHE II<b>${n1(t.apache_median)}</b></div></div>
${d.stays.length ? `<div class="ch"><div><h3>Admissions and deaths in the ICU</h3><div class="lg"><i style="background:#2a78d6"></i>Admitted<i style="background:#eb6834"></i>Died</div>${c.admits}</div>
    <div><h3>Patients in the ICU (average a day)</h3>${c.census}</div><div><h3>Ventilator days</h3>${c.vent}</div></div>
<div class="two"><div><h2>Device days</h2>${deviceTable(d)}</div><div><h2>Device infections (per 1,000 device days)</h2>${infectionTable(d)}</div></div>
<div class="two"><div><h2>Mortality by APACHE II</h2>${bandTable(d)}</div><div><h2>Where patients went</h2>${outcomeTable(d)}</div></div>
<h2>ICU stays</h2>${staysTable(d, true)}` : "<p>No ICU stays in this period.</p>"}
<footer>ICU report · ${esc(periodText(d))} · device days counted the CDC/NHSN way · APACHE II predicted mortality without the diagnosis weight</footer>
</body></html>`);
    win.document.close();
}
