import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Imported readings (tab "portal_reading_imports").
 *
 * Phase M17a. Readings that arrived from a patient's health app or device,
 * rather than being typed into Track My Health by hand.
 *
 * The column worth understanding is "outside the band", which shows two numbers:
 * how many readings in the import were outside the safety band, and how many of
 * those were recent enough to have raised an alert. They are usually different,
 * and the difference is deliberate.
 *
 * M7 raises one urgent care-team alert per out-of-band reading, which is right
 * for somebody typing in a reading they just took. An import of three months of
 * blood pressure would have raised dozens of pages about readings from six weeks
 * ago and buried the one that mattered. So an import flags everything and alerts
 * only on what is current -- and this screen says so, because a clinician who
 * sees a run of flagged readings and only one alert should know that was a
 * decision rather than a fault.
 *
 * The import form takes pasted text in a simple documented format. It is not an
 * Apple Health export reader: that export is hundreds of megabytes of XML and
 * needs a file upload this project cannot do yet. A nurse pasting a column of
 * figures a patient read off their monitor is the workflow that works today.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;

export function PortalReadingImportsView() {
    return `
<style>
.pri { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pri h1 { margin: 0; font-size: 22px; }
.pri .pri-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pri input, .pri select, .pri textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pri textarea { min-height: 58px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
.pri-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pri-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pri-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pri-btn:disabled { opacity: .55; cursor: default; }
.pri-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pri-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pri-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pri-table th, .pri-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pri-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pri-table tr:last-child td { border-bottom: 0; }
.pri-sub { color: var(--text-muted); font-size: 12px; }
.pri-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pri-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
.pri-pill.alerted { background: #fee2e2; color: #991b1b; }
.pri-pill.flagged { background: #fffbeb; color: #92400e; }
.pri-pill.clean { background: #dcfce7; color: #166534; }
.pri-pill.quiet { background: var(--bg-surface-alt); color: var(--text-muted); }
.pri-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pri-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pri-counts b { font-size: 18px; margin-right: 4px; }
.pri-note { border: 1px solid var(--border-color); background: var(--bg-surface-alt); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 12.5px; line-height: 1.55; max-width: 92ch; }
.pri-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 10px; padding: 9px 12px; margin-bottom: 12px; font-size: 12.5px; }
.pri-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, .5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1200; }
.pri-sheet { background: var(--bg-surface); border-radius: 14px; border: 1px solid var(--border-color); width: min(720px, 100%); max-height: 90vh; overflow: auto; padding: 20px 22px; }
.pri-sheet h2 { margin: 0 0 4px; font-size: 18px; }
.pri-field { margin-top: 12px; }
.pri-field label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
.pri-field input, .pri-field select, .pri-field textarea { width: 100%; }
.pri-results { border: 1px solid var(--border-color); border-radius: 8px; margin-top: 6px; max-height: 190px; overflow: auto; }
.pri-results button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--border-color); background: none; color: var(--text-primary); font: inherit; font-size: 13px; padding: 7px 10px; cursor: pointer; }
.pri-results button:last-child { border-bottom: 0; }
.pri-results button:hover { background: var(--bg-surface-alt); }
.pri-reject { border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; padding: 8px 10px; margin-top: 8px; font-size: 12px; color: #991b1b; }
.pri-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
</style>
<div class="pri">
    <h1>Imported readings</h1>
    <p class="pri-intro">
        Readings that came from a patient's health app or device rather than being typed in
        by hand. Every one is marked on the chart as coming from a device, with the app or
        monitor it came from.
    </p>
    <div id="priBody"><div class="pri-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalReadingImports() {
    await load();
}

async function load(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);

    const res = await api(`/portal-reading-imports?${params.toString()}`).catch(() => null);
    const body = $("priBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pri-sub" style="padding:24px;text-align:center">Could not load the imports. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("priBody");
    const s = data.settings;

    body.innerHTML = `
        <div class="pri-note">
            <strong>About the "outside the band" column.</strong>
            It shows two numbers: how many readings in the import were outside the safety band,
            and how many of those were recent enough to raise an alert. They are usually
            different, on purpose.
            <div style="margin-top:6px">
                Track My Health raises one urgent alert per out-of-band reading, which is right
                when somebody types in a reading they just took. An import of three months of
                blood pressure would have raised dozens of pages about readings from weeks ago
                and buried the one that mattered. So an import flags everything and alerts only
                on readings from the last <strong>${s.alert_hours} hours</strong> — one alert for
                the whole batch, not one per reading. A flagged run with no alert is a decision,
                not a fault.
            </div>
        </div>
        ${!s.allow ? `<div class="pri-warn">Importing is switched off in settings. Existing imports are shown below, but nothing new can be brought in.</div>` : ""}
        ${!data.can_import ? `<div class="pri-warn">You can read these but not load readings into a record.</div>` : ""}
        <div class="pri-counts">
            <div><b>${data.counts.today}</b>imports today</div>
            <div><b>${data.counts.readings_today}</b>readings today</div>
            <div><b>${data.counts.flagged_today}</b>outside the band today</div>
        </div>
        <div class="pri-bar">
            <input type="search" id="priQ" value="${esc(q)}" placeholder="Patient name, number or source" aria-label="Find an import" style="min-width:280px">
            ${data.can_import && s.allow ? `<button type="button" class="pri-btn primary" id="priNew">Load readings for a patient</button>` : ""}
        </div>
        <div class="pri-card">
            <table class="pri-table">
                <thead><tr>
                    <th>Patient</th><th>From</th><th>Loaded</th>
                    <th class="pri-num">Saved</th><th class="pri-num">Already had</th><th class="pri-num">Refused</th>
                    <th>Outside the band</th><th>Covers</th><th></th>
                </tr></thead>
                <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="9" class="pri-sub" style="padding:22px;text-align:center">Nothing imported yet.</td></tr>`}</tbody>
            </table>
        </div>`;

    const search = $("priQ");
    if (search) {
        let timer = null;
        search.oninput = () => {
            clearTimeout(timer);
            timer = setTimeout(() => load(search.value.trim()), 300);
        };
    }

    const newBtn = $("priNew");
    if (newBtn) newBtn.onclick = openImport;

    body.querySelectorAll("[data-open]").forEach((b) => {
        b.onclick = () => openReadings(Number(b.dataset.open));
    });
}

function rowHtml(r) {
    const bandCell = r.flagged_count === 0
        ? `<span class="pri-pill clean">none</span>`
        : `<span class="pri-pill ${r.alertable_count ? "alerted" : "flagged"}">${r.flagged_count} flagged</span>
           <div class="pri-sub" style="margin-top:3px">
               ${r.alertable_count
                   ? `${r.alertable_count} recent — care team alerted`
                   : `none recent — no alert raised`}
               ${r.historical_flagged ? `<div>${r.historical_flagged} historical, deliberately not alerted</div>` : ""}
           </div>`;

    return `
    <tr>
        <td><strong>${esc(r.patient.name)}</strong><div class="pri-sub">${esc(r.patient.mrn || "")}</div></td>
        <td>
            ${esc(r.source_app)}
            ${r.device_name ? `<div class="pri-sub">${esc(r.device_name)}</div>` : ""}
        </td>
        <td class="pri-sub">
            ${esc(String(r.when || "").slice(0, 16))}
            <div>${r.is_patient_initiated ? "by the patient" : `by ${esc(r.started_by || "the clinic")}`}</div>
        </td>
        <td class="pri-num"><strong>${r.accepted}</strong></td>
        <td class="pri-num">${r.duplicates || "—"}</td>
        <td class="pri-num">
            ${r.rejected || "—"}
            ${r.rejected ? `<div class="pri-sub">see details</div>` : ""}
        </td>
        <td>${bandCell}</td>
        <td class="pri-sub">${r.earliest_reading
            ? `${esc(String(r.earliest_reading).slice(0, 10))}<br>to ${esc(String(r.latest_reading).slice(0, 10))}`
            : "—"}</td>
        <td><button type="button" class="pri-btn" data-open="${r.id}">Open</button></td>
    </tr>`;
}

// ---------------------------------------------------------------- the reader
async function openReadings(importId) {
    const row = data.items.find((x) => x.id === importId);
    const res = await api("/portal-reading-imports/readings", "POST", { id: importId }).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "Could not open that.", "error");
        return;
    }

    const items = res.data.items || [];

    const wrap = document.createElement("div");
    wrap.className = "pri-modal";
    wrap.innerHTML = `
    <div class="pri-sheet" role="dialog" aria-modal="true" aria-label="Imported readings">
        <h2>${esc(row?.source_app || "Import")}</h2>
        <div class="pri-sub">
            ${esc(row?.patient.name || "")} · ${esc(row?.patient.mrn || "")} ·
            loaded ${esc(String(row?.when || "").slice(0, 16))}
            ${row?.device_name ? ` · ${esc(row.device_name)}` : ""}
        </div>

        <div class="pri-note" style="margin-top:12px">
            ${(data.caveats || []).map((c) => `<div>• ${esc(c)}</div>`).join("")}
        </div>

        ${row && row.rejected ? `
            <div class="pri-reject">
                <strong>${row.rejected} reading${row.rejected === 1 ? "" : "s"} refused:</strong>
                ${(row.reject_reasons || []).map((x) => `<div>line ${x.row}: ${esc(x.why)}</div>`).join("")}
            </div>` : ""}

        ${row && row.flagged_count && !row.alertable_count ? `
            <div class="pri-note" style="margin-top:10px">
                <strong>${row.flagged_count} of these are outside the safety band and no alert was raised.</strong>
                They are all older than ${data.settings.alert_hours} hours, so they are flagged on the
                chart for you to see rather than paged out. That is the intended behaviour.
            </div>` : ""}

        <div class="pri-card" style="margin-top:12px">
            <table class="pri-table">
                <thead><tr><th>Taken</th><th>Measure</th><th>Reading</th><th>Note</th><th></th></tr></thead>
                <tbody>${items.length ? items.map((i) => `
                    <tr>
                        <td class="pri-sub">${esc(String(i.taken_at || "").slice(0, 16))}</td>
                        <td>${esc(i.label)}</td>
                        <td><strong>${esc(i.reading)}</strong></td>
                        <td class="pri-sub">${esc(i.note || "—")}</td>
                        <td>
                            ${i.out_of_band
                                ? `<span class="pri-pill ${i.alerted ? "alerted" : "flagged"}">${i.alerted ? "alerted" : "flagged only"}</span>`
                                : ""}
                        </td>
                    </tr>`).join("")
                    : `<tr><td colspan="5" class="pri-sub" style="padding:20px;text-align:center">Nothing was saved from this import.</td></tr>`}</tbody>
            </table>
        </div>

        <div class="pri-bar" style="margin:14px 0 0">
            <button type="button" class="pri-btn" id="priClose">Close</button>
        </div>
    </div>`;

    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelector("#priClose").onclick = close;
}

// ---------------------------------------------------------------- the import
function openImport() {
    let patientId = 0;
    const kinds = data.kinds || [];

    const wrap = document.createElement("div");
    wrap.className = "pri-modal";
    wrap.innerHTML = `
    <div class="pri-sheet" role="dialog" aria-modal="true" aria-label="Load readings">
        <h2>Load readings for a patient</h2>
        <div class="pri-sub">
            These land on the patient's chart marked as coming from a device, with the source
            you name below. The patient gets a message saying you added them.
        </div>

        <div class="pri-field">
            <label for="priPatient">Patient</label>
            <input type="search" id="priPatient" placeholder="Name or patient number" autocomplete="off">
            <div class="pri-results" id="priResults" hidden></div>
        </div>

        <div class="pri-field">
            <label for="priSource">Where did these come from?</label>
            <input type="text" id="priSource" maxlength="60" placeholder="For example: Apple Health, or the patient's own monitor" value="Read from the patient's monitor">
        </div>

        <div class="pri-field">
            <label for="priDevice">Device, if you know it (optional)</label>
            <input type="text" id="priDevice" maxlength="120" placeholder="For example: Omron HEM-7156T">
        </div>

        <div class="pri-field">
            <label for="priKind">If every line is the same measure, pick it here</label>
            <select id="priKind">
                <option value="">Each line names its own measure</option>
                ${kinds.map((k) => `<option value="${esc(k.kind)}">${esc(k.label)} (${esc(k.units)})</option>`).join("")}
            </select>
        </div>

        <div class="pri-field">
            <label for="priText">The readings</label>
            <textarea id="priText" style="min-height:150px" placeholder="bp, 2026-11-14 08:30, 128, 82&#10;bp, 2026-11-13 08:15, 131, 84&#10;glucose, 2026-11-13 09:00, 110"></textarea>
            <div class="pri-sub" style="margin-top:5px">${esc(data.format_hint || "")}</div>
            <div class="pri-sub" style="margin-top:3px">
                Commas or tabs. A header line is ignored. Anything we cannot read is listed back to
                you line by line rather than silently dropped, and a reading already on the chart is
                skipped rather than duplicated.
            </div>
        </div>

        <div class="pri-bar" style="margin:16px 0 0">
            <button type="button" class="pri-btn primary" id="priSave">Load them</button>
            <button type="button" class="pri-btn" id="priCancel">Cancel</button>
        </div>
    </div>`;

    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelector("#priCancel").onclick = close;

    const patientInput = wrap.querySelector("#priPatient");
    const results = wrap.querySelector("#priResults");
    let timer = null;

    patientInput.oninput = () => {
        clearTimeout(timer);
        const q = patientInput.value.trim();
        patientId = 0;

        if (q.length < 2) {
            results.hidden = true;
            return;
        }

        timer = setTimeout(async () => {
            const res = await api(`/portal-reading-import-patients?q=${encodeURIComponent(q)}`).catch(() => null);
            const items = res?.data?.items || [];
            results.hidden = items.length === 0;
            results.innerHTML = items.map((p) =>
                `<button type="button" data-id="${p.id}">${esc(p.name)} <span class="pri-sub">${esc(p.mrn || "")}</span></button>`
            ).join("");
            results.querySelectorAll("[data-id]").forEach((b) => {
                b.onclick = () => {
                    patientId = Number(b.dataset.id);
                    patientInput.value = b.textContent.trim();
                    results.hidden = true;
                };
            });
        }, 280);
    };

    const saveBtn = wrap.querySelector("#priSave");

    saveBtn.onclick = async () => {
        const text = wrap.querySelector("#priText").value.trim();
        const source = wrap.querySelector("#priSource").value.trim();

        if (!patientId) { showToast("Choose a patient.", "error"); return; }
        if (!source) { showToast("Say where these came from.", "error"); return; }
        if (!text) { showToast("Paste the readings first.", "error"); return; }

        saveBtn.disabled = true;

        const res = await api("/portal-reading-imports", "POST", {
            patient_id: patientId,
            source_app: source,
            device_name: wrap.querySelector("#priDevice").value.trim(),
            default_kind: wrap.querySelector("#priKind").value,
            text,
        }).catch(() => null);

        saveBtn.disabled = false;

        if (!res?.success) {
            showToast(res?.message || "That did not work.", "error");
            return;
        }

        showToast(res.message, "success");
        close();
        load($("priQ")?.value.trim() || "");
    };
}
