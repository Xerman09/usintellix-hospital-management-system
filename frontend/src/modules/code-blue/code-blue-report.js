import { api } from "../../core/api.js?v=5";
import { openCodeRecord, printCodeSheet } from "./code-blue.js?v=3";

/*
 * Code Blue report (module 10, Phase 3; tab "code_blue_report"): codes per unit for a date range,
 * outcomes, and the time from the call to the first CPR, first shock and first adrenaline
 * (from the code record). Each code opens its record or prints its code sheet.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mmss = (s) => (s === null || s === undefined ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
const pct = (v) => (v === null || v === undefined ? "—" : `${v}%`);

const CSS = `
.cbrp { padding: 20px 24px 40px; max-width: 1280px; margin: 0 auto; color: var(--text-primary); }
.cbrp h1 { margin: 0; font-size: 22px; }
.cbrp-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 4px; }
.cbrp-f { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 14px 0; }
.cbrp-f label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
.cbrp-f > div { min-width: 0; max-width: 100%; }
@media (max-width: 600px) { .cbrp { padding: 16px 16px 32px; } }
.cbrp-f input, .cbrp-f select { max-width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 9px; font: inherit; background: var(--bg-surface); color: var(--text-primary); }
.cbrp-b { border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; border-radius: 8px; padding: 8px 14px; font: inherit; font-weight: 700; cursor: pointer; }
.cbrp-b.s { background: var(--bg-surface); color: var(--text-primary); border-color: var(--border-color); padding: 5px 10px; font-weight: 600; font-size: 12.5px; }
.cbrp-b:focus-visible, .cbrp-f input:focus-visible, .cbrp-f select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.cbrp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-bottom: 18px; }
.cbrp-tile { border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; background: var(--bg-surface); }
.cbrp-tile small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.cbrp-tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.cbrp-tile span { font-size: 12px; color: var(--text-muted); }
.cbrp h2 { font-size: 16px; margin: 20px 0 8px; }
.cbrp-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.cbrp table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-surface); }
.cbrp th { text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted); padding: 8px 10px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.cbrp td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.cbrp td.n, .cbrp th.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.cbrp tfoot td { font-weight: 700; background: var(--bg-surface-alt); }
.cbrp .over { color: #b45309; font-weight: 700; }
:root[data-theme="dark"] .cbrp .over { color: #fcd34d; }
.cbrp .died { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .cbrp .died { color: #fca5a5; }
.cbrp .muted { color: var(--text-muted); }
.cbrp-empty { padding: 26px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; }
`;

let state = { from: "", to: "", ward_id: "" };

export function CodeBlueReportView() {
    if (!document.getElementById("cbrp-style")) {
        const st = document.createElement("style");
        st.id = "cbrp-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    return `<div class="cbrp" id="cbReport"><div class="cbrp-empty">Loading…</div></div>`;
}

export function initCodeBlueReport() {
    load();
}

async function load() {
    const root = document.getElementById("cbReport");
    if (!root) return;
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const r = await api(`/code-blue/report?${q}`).catch(() => null);
    if (!r?.success) {
        root.innerHTML = `<div class="cbrp-empty">${esc(r?.message || "Could not load the report.")}</div>`;
        return;
    }
    render(root, r.data);
}

/** A time with "over the target" shown in words, not colour alone. */
function timeCell(s, target) {
    if (s === null || s === undefined) return `<td class="n muted">—</td>`;
    const over = s > target;
    return `<td class="n${over ? " over" : ""}">${mmss(s)}${over ? ` <span class="muted" style="font-weight:400">over ${mmss(target)}</span>` : ""}</td>`;
}

function render(root, d) {
    state = { from: d.from, to: d.to, ward_id: d.ward_id || "" };
    const t = d.totals;
    const T = d.targets;
    const unitRow = (u, foot = false) => `<tr>
        <td>${foot ? "All units" : esc(u.unit)}</td><td class="n">${u.codes}</td><td class="n">${u.false_alarms}</td>
        <td class="n">${u.rosc}</td><td class="n">${u.icu}</td><td class="n">${u.died}</td><td class="n">${u.no_outcome + u.on_now}</td><td class="n">${pct(u.survived_pct)}</td>
        <td class="n">${mmss(u.median_to_cpr_s)}</td>
        <td class="n">${mmss(u.median_to_shock_s)} <span class="muted">(${u.shock_n})</span></td><td class="n">${pct(u.shock_within_pct)}</td>
        <td class="n">${mmss(u.median_to_epi_s)} <span class="muted">(${u.epi_n})</span></td><td class="n">${pct(u.epi_within_pct)}</td>
        <td class="n">${mmss(u.median_length_s)}</td></tr>`;
    const status = { ended: "Ended", cancelled: "False alarm", active: "On now" };
    root.innerHTML = `
        <h1>Code Blue report</h1>
        <div class="cbrp-sub">Codes per unit and how fast the first CPR, shock and adrenaline came, from the code record. Times are from when the code was called;
            struck-out entries don't count. False alarms are counted apart and left out of the times.</div>
        <form class="cbrp-f" data-f>
            <div><label for="cbrpFrom">From</label><input type="date" id="cbrpFrom" value="${esc(d.from)}"></div>
            <div><label for="cbrpTo">To</label><input type="date" id="cbrpTo" value="${esc(d.to)}"></div>
            <div><label for="cbrpWard">Unit</label><select id="cbrpWard"><option value="">All units</option><option value="none" ${d.ward_id === "none" ? "selected" : ""}>Not on a ward</option>
                ${d.wards.map((w) => `<option value="${w.id}" ${String(w.id) === String(d.ward_id) ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></div>
            <button type="submit" class="cbrp-b">Show</button>
        </form>
        <div class="cbrp-tiles" role="list">
            <div class="cbrp-tile" role="listitem"><small>Codes</small><b>${t.codes}</b><span>${t.false_alarms} false alarm${t.false_alarms === 1 ? "" : "s"}${t.on_now ? ` · ${t.on_now} on now` : ""}</span></div>
            <div class="cbrp-tile" role="listitem"><small>Survived the code</small><b>${pct(t.survived_pct)}</b><span>ROSC ${t.rosc} · to ICU ${t.icu} · died ${t.died}</span></div>
            <div class="cbrp-tile" role="listitem"><small>To first CPR (median)</small><b>${mmss(t.median_to_cpr_s)}</b><span>${t.cpr_n} code${t.cpr_n === 1 ? "" : "s"} with CPR recorded</span></div>
            <div class="cbrp-tile" role="listitem"><small>To first shock (median)</small><b>${mmss(t.median_to_shock_s)}</b><span>${pct(t.shock_within_pct)} within ${mmss(T.shock_s)} · ${t.shock_n} code${t.shock_n === 1 ? "" : "s"} shocked</span></div>
            <div class="cbrp-tile" role="listitem"><small>To first adrenaline (median)</small><b>${mmss(t.median_to_epi_s)}</b><span>${pct(t.epi_within_pct)} within ${mmss(T.epi_s)} · ${t.epi_n} code${t.epi_n === 1 ? "" : "s"}</span></div>
            <div class="cbrp-tile" role="listitem"><small>Code length (median)</small><b>${mmss(t.median_length_s)}</b><span>ended codes</span></div>
        </div>
        <h2>By unit</h2>
        ${d.by_unit.length ? `<div class="cbrp-wrap"><table><thead><tr><th>Unit</th><th class="n">Codes</th><th class="n">False alarms</th><th class="n">ROSC</th><th class="n">To ICU</th>
            <th class="n">Died</th><th class="n">No outcome</th><th class="n">Survived</th><th class="n">To CPR</th><th class="n">To shock (n)</th><th class="n">≤ ${mmss(T.shock_s)}</th>
            <th class="n">To adrenaline (n)</th><th class="n">≤ ${mmss(T.epi_s)}</th><th class="n">Length</th></tr></thead>
            <tbody>${d.by_unit.map((u) => unitRow(u)).join("")}</tbody>${d.by_unit.length > 1 ? `<tfoot>${unitRow(t, true)}</tfoot>` : ""}</table></div>
            <div class="cbrp-sub">Times are medians. (n) = codes with that event recorded. Targets: first shock within ${mmss(T.shock_s)}, first adrenaline within ${mmss(T.epi_s)}.</div>`
            : `<div class="cbrp-empty">No codes in this period.</div>`}
        <h2>Codes</h2>
        ${d.codes.length ? `<div class="cbrp-wrap"><table><thead><tr><th>Called</th><th>Unit</th><th>Where</th><th>First rhythm</th><th class="n">To CPR</th><th class="n">To shock</th>
            <th class="n">To adrenaline</th><th class="n">Length</th><th>Result</th><th></th></tr></thead><tbody>
            ${d.codes.map((c) => `<tr><td style="white-space:nowrap">${esc(String(c.called_at).slice(0, 16))}</td><td>${esc(c.unit)}</td><td>${esc(c.location)}</td>
                <td>${esc(c.first_rhythm || "—")}</td><td class="n">${mmss(c.to_cpr_s)}</td>${timeCell(c.to_shock_s, T.shock_s)}${timeCell(c.to_epi_s, T.epi_s)}
                <td class="n">${mmss(c.seconds)}</td>
                <td>${c.outcome ? `<span class="${c.outcome === "died" ? "died" : ""}">${esc(c.outcome_label)}</span> <span class="muted">${esc(String(c.outcome_at).slice(11, 16))}</span>` : esc(status[c.status] || c.status)}</td>
                <td style="text-align:right;white-space:nowrap"><button type="button" class="cbrp-b s" data-record="${c.id}" aria-label="Code record, ${esc(String(c.called_at).slice(0, 16))}">Record</button>
                    <button type="button" class="cbrp-b s" data-sheet="${c.id}" aria-label="Print the code sheet, ${esc(String(c.called_at).slice(0, 16))}">Sheet</button></td></tr>`).join("")}
            </tbody></table></div>` : `<div class="cbrp-empty">No codes in this period.</div>`}`;
    root.querySelector("[data-f]").onsubmit = (ev) => {
        ev.preventDefault();
        state = { from: root.querySelector("#cbrpFrom").value, to: root.querySelector("#cbrpTo").value, ward_id: root.querySelector("#cbrpWard").value };
        load();
    };
    root.onclick = (ev) => {
        const rec = ev.target.closest("[data-record]");
        if (rec) return openCodeRecord(Number(rec.dataset.record));
        const sh = ev.target.closest("[data-sheet]");
        if (sh) return printCodeSheet(Number(sh.dataset.sheet));
    };
}
