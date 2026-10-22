import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { systemNow, toDateTimeInput } from "../../core/timezone.js?v=3";
import { ensureCss, esc, when, dayLabel } from "./mychart-ui.js?v=10";

/*
 * My Chart -> Track my health (patient portal, Phase 7).
 *
 * The readings a patient takes at home: blood pressure, weight, blood sugar,
 * temperature, pain, steps, oxygen level. Every screen says "self-reported",
 * because this is not the hospital's clinical record -- the nurse's measurements
 * live in the chart and are not touched from here.
 *
 * Two things the patient is told plainly: the band they are aiming for (the goal,
 * shaded on the graph), and that a reading outside the range the hospital watches
 * for goes straight to their care team rather than waiting to be noticed.
 */

let data = null;
let kind = "";
let days = 90;
let editingGoal = false;

export function MyChartTrackView() {
    return `<div class="mc" id="mcTrack"><div class="mc-empty">Loading…</div></div>`;
}

export async function initMyChartTrack() {
    ensureCss();
    kind = "";
    editingGoal = false;
    await load();
}

async function load() {
    const root = document.getElementById("mcTrack");
    if (!root) return;

    const q = new URLSearchParams({ days: String(days), ...(kind ? { kind } : {}) });
    const res = await api(`/mychart/readings?${q}`).catch(() => null);

    if (!res?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(res?.message || "Your readings could not be loaded. Please try again.")}</div>`;
        return;
    }

    data = res.data;
    render();
}

const meta = () => data.kinds.find((k) => k.kind === kind) || null;

function render() {
    const root = document.getElementById("mcTrack");
    const k = meta();

    root.innerHTML = `
        <div class="mc-head">
            <h1>Track my health</h1>
            <p class="mc-sub">Readings you take at home. They are kept separately from the measurements the hospital
                takes, and are always marked as self-reported — your care team can see them next to your chart when
                you come in.</p>
        </div>

        <div class="mc-kinds">${data.kinds.map(kindCard).join("")}</div>

        ${k ? `
            <div class="mc-panel" id="mcTrackPanel">
                <h2>${esc(k.label)} <span class="mc-chip self">Self-reported</span></h2>
                <p class="mc-meta">${esc(k.hint)}</p>
                ${bandNote(k)}
                ${addForm(k)}
                ${goalBox(k)}
                <div id="mcTrackGraph">${graphHtml(k)}</div>
                ${tableHtml(k)}
            </div>`
        : `<div class="mc-empty">Choose what you would like to record.</div>`}`;

    bind();
}

function kindCard(k) {
    const c = data.counts[k.kind];
    const g = data.goals[k.kind];

    return `<button type="button" class="mc-kind ${k.kind === kind ? "on" : ""}" data-kind="${esc(k.kind)}">
        <span class="mc-kind-label">${esc(k.label)}</span>
        <span class="mc-kind-val">${c ? `${esc(String(c.count))} recorded` : "Nothing yet"}</span>
        <span class="mc-kind-meta">${c ? `Last ${esc(dayLabel(c.latest_at))}` : esc(k.units)}${
            g ? ` · goal ${esc(goalWords(g, k))}` : ""}</span>
    </button>`;
}

const goalWords = (g, k) =>
    g.target_low !== null && g.target_high !== null ? `${g.target_low}–${g.target_high} ${k.units}`
        : g.target_high !== null ? `under ${g.target_high} ${k.units}`
        : g.target_low !== null ? `over ${g.target_low} ${k.units}` : "";

/** What the hospital watches for, in the patient's own words -- so the alert is no surprise. */
function bandNote(k) {
    const b = data.bands[k.kind];
    if (!b) return "";

    const limits = (name, low, high) => {
        const ends = [];
        if (low !== null) ends.push(`${low} or below`);
        if (high !== null) ends.push(`${high} or above`);
        return ends.length ? `a ${name} of ${ends.join(", or ")}` : "";
    };

    const parts = [
        limits(k.pair ? "top number" : "reading", b.value_1_low, b.value_1_high),
        k.pair ? limits("bottom number", b.value_2_low, b.value_2_high) : "",
    ].filter(Boolean);

    if (!parts.length) return "";

    return `<div class="mc-note">If you record ${parts.join("; or ")}, we send it to your care team straight away
        instead of waiting for someone to notice it. You will see that on the reading.</div>`;
}

function addForm(k) {
    return `<form class="mc-form mc-trackform" id="mcTrackForm" novalidate>
        <div class="mc-grid">
            <div class="mc-field">
                <label for="mcV1">${esc(k.label_1)} <span class="muted">(${esc(k.units)})</span></label>
                <input type="number" id="mcV1" inputmode="decimal" step="${k.dp ? "0.1" : "1"}"
                    min="${k.min_1}" max="${k.max_1}" required>
                <div class="mc-err" id="mcV1Err"></div>
            </div>
            ${k.pair ? `<div class="mc-field">
                <label for="mcV2">${esc(k.label_2)} <span class="muted">(${esc(k.units)})</span></label>
                <input type="number" id="mcV2" inputmode="decimal" step="1" min="${k.min_2}" max="${k.max_2}" required>
                <div class="mc-err" id="mcV2Err"></div>
            </div>` : ""}
            <div class="mc-field">
                <label for="mcTakenAt">When you took it</label>
                <input type="datetime-local" id="mcTakenAt" value="${esc(toDateTimeInput(systemNow()))}">
                <div class="mc-err" id="mcTakenAtErr"></div>
            </div>
            <div class="mc-field">
                <label for="mcNote">Anything worth noting <span class="muted">(optional)</span></label>
                <input type="text" id="mcNote" maxlength="255" placeholder="e.g. before breakfast">
                <div class="mc-err" id="mcNoteErr"></div>
            </div>
        </div>
        <div class="mc-formrow">
            <button type="submit" class="mc-b blue" id="mcSaveReading">Save this reading</button>
            <span class="mc-meta">Between ${k.min_1} and ${k.max_1} ${esc(k.units)}${
                k.pair ? `, and ${k.min_2} to ${k.max_2} for the bottom number` : ""}.</span>
        </div>
    </form>`;
}

function goalBox(k) {
    const g = data.goals[k.kind];

    if (!editingGoal) {
        return `<div class="mc-goalrow">
            <span>${g
                ? `You are aiming for <b>${esc(goalWords(g, k))}</b>${g.set_by === "doctor"
                    ? ` — set by ${esc(g.set_by_name || "your doctor")}` : ""}.`
                : "You have not set a goal for this yet. A goal is shaded on the graph so you can see where you are against it."}</span>
            <button type="button" class="mc-b sm" id="mcGoalEdit">${g ? "Change goal" : "Set a goal"}</button>
        </div>`;
    }

    return `<form class="mc-goalform" id="mcGoalForm" novalidate>
        <div class="mc-grid">
            <div class="mc-field">
                <label for="mcGoalLow">From <span class="muted">(${esc(k.units)})</span></label>
                <input type="number" id="mcGoalLow" inputmode="decimal" step="${k.dp ? "0.1" : "1"}"
                    value="${g?.target_low ?? ""}">
            </div>
            <div class="mc-field">
                <label for="mcGoalHigh">To <span class="muted">(${esc(k.units)})</span></label>
                <input type="number" id="mcGoalHigh" inputmode="decimal" step="${k.dp ? "0.1" : "1"}"
                    value="${g?.target_high ?? ""}">
            </div>
        </div>
        <div class="mc-formrow">
            <button type="submit" class="mc-b blue" id="mcGoalSave">Save goal</button>
            <button type="button" class="mc-b" id="mcGoalCancel">Cancel</button>
            <span class="mc-meta">Leave both empty to remove the goal. Fill in only one side for "under" or "over".</span>
        </div>
        <div class="mc-err" id="mcGoalErr"></div>
    </form>`;
}

/* ---------------- the graph ---------------- */

/**
 * One kind over time: the goal band shaded behind, a line per number (two for blood
 * pressure), and any reading outside the hospital's band drawn in its own colour.
 */
function graphHtml(k) {
    const points = [...data.readings].reverse();

    if (points.length < 2) {
        return points.length
            ? `<div class="mc-trend"><div class="mc-tmeta">One reading so far. The graph appears once there are two.</div></div>`
            : "";
    }

    const W = 640;
    const H = 170;
    const PL = 46;
    const PR = 54;
    const PT = 12;
    const PB = 24;

    const g = data.goals[k.kind];
    const xs = points.map((p) => new Date(String(p.taken_at).replace(" ", "T")).getTime());
    const vals = points.flatMap((p) => (p.value_2 === null ? [p.value_1] : [p.value_1, p.value_2]));
    const cand = [...vals, ...(g ? [g.target_low, g.target_high].filter((v) => v !== null) : [])];
    const lo = Math.min(...cand);
    const hi = Math.max(...cand);
    const pad = (hi - lo) * 0.15 || Math.max(Math.abs(hi) * 0.1, 1);
    const yMin = lo - pad;
    const yMax = hi + pad;
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);

    const x = (v) => PL + (xMax === xMin ? 0.5 : (v - xMin) / (xMax - xMin)) * (W - PL - PR);
    const y = (v) => PT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PT - PB);

    let svg = "";

    if (g && (g.target_low !== null || g.target_high !== null)) {
        const top = y(g.target_high ?? yMax);
        const bot = y(g.target_low ?? yMin);
        svg += `<rect class="band" x="${PL}" y="${top.toFixed(1)}" width="${W - PL - PR}"
            height="${Math.max(0, bot - top).toFixed(1)}"><title>Your goal: ${esc(goalWords(g, k))}</title></rect>`;
    }

    [yMin, (yMin + yMax) / 2, yMax].forEach((v) => {
        svg += `<line class="grid" x1="${PL}" x2="${W - PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
        svg += `<text class="axis" x="${PL - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${round(v)}</text>`;
    });

    const line = (pick, cls) => `<path class="line ${cls}" d="${points
        .map((p, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(pick(p)).toFixed(1)}`).join("")}"/>`;

    svg += line((p) => p.value_1, "");
    if (k.pair) svg += line((p) => p.value_2, "second");

    points.forEach((p, i) => {
        const title = `${esc(when(p.taken_at))}: ${esc(valueWords(p, k))}${p.out_of_band ? " — outside the range we watch for" : ""}`;
        svg += `<circle class="pt ${p.out_of_band ? "abn" : ""}" cx="${x(xs[i]).toFixed(1)}" cy="${y(p.value_1).toFixed(1)}" r="3.5">
            <title>${title}</title></circle>`;
        if (k.pair) {
            svg += `<circle class="pt second ${p.out_of_band ? "abn" : ""}" cx="${x(xs[i]).toFixed(1)}"
                cy="${y(p.value_2).toFixed(1)}" r="3.5"><title>${title}</title></circle>`;
        }
    });

    const last = points[points.length - 1];
    svg += `<text class="last" x="${(x(xs[xs.length - 1]) + 7).toFixed(1)}" y="${(y(last.value_1) + 4).toFixed(1)}">${
        esc(String(last.value_1))}</text>`;
    if (k.pair) {
        svg += `<text class="last" x="${(x(xs[xs.length - 1]) + 7).toFixed(1)}" y="${(y(last.value_2) + 4).toFixed(1)}">${
            esc(String(last.value_2))}</text>`;
    }

    [points[0], last].forEach((p, i) => {
        svg += `<text class="axis" x="${x(xs[i === 0 ? 0 : xs.length - 1]).toFixed(1)}" y="${H - 6}"
            text-anchor="${i === 0 ? "start" : "end"}">${esc(dayLabel(p.taken_at))}</text>`;
    });

    return `<div class="mc-trend">
        <h4>${esc(k.label)} over time <span class="mc-chip self">Self-reported</span></h4>
        <div class="mc-tmeta">${points.length} readings · ${esc(k.units)}${
            g ? ` · your goal ${esc(goalWords(g, k))} (shaded)` : ""}</div>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(k.label)} over time: ${points
            .map((p) => `${dayLabel(p.taken_at)} ${valueWords(p, k)}`).join(", ")}">${svg}</svg>
    </div>`;
}

const round = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);

const valueWords = (p, k) => (p.value_2 === null ? `${p.value_1} ${k.units}` : `${p.value_1}/${p.value_2} ${k.units}`);

/* ---------------- the list ---------------- */

function tableHtml(k) {
    if (!data.readings.length) {
        return `<div class="mc-empty" style="margin-top:14px">Nothing recorded in the last ${days} days.</div>`;
    }

    return `<div class="mc-wrap"><table class="mc-tbl">
        <thead><tr><th>When</th><th class="n">${esc(k.label)}</th><th>Note</th><th></th></tr></thead>
        <tbody>${data.readings.map((r) => `<tr class="${r.out_of_band ? "abn" : ""}">
            <td>${esc(when(r.taken_at))}</td>
            <td class="n">${esc(valueWords(r, k))}</td>
            <td>${esc(r.note || "")}${r.out_of_band
                ? `<div class="mc-meta">Outside the range we watch for${r.care_team_told ? " · your care team was told" : ""}</div>`
                : ""}</td>
            <td class="n"><button type="button" class="mc-b sm" data-del="${r.id}">Remove</button></td>
        </tr>`).join("")}</tbody>
    </table></div>
    <p class="mc-sub" style="margin-top:8px">Remove is for a reading you typed in by mistake. If your care team has
        already been told about one, they may still ask you about it.</p>`;
}

/* ---------------- wiring ---------------- */

function bind() {
    const root = document.getElementById("mcTrack");

    root.querySelectorAll("[data-kind]").forEach((b) => {
        b.onclick = async () => {
            kind = b.dataset.kind === kind ? "" : b.dataset.kind;
            editingGoal = false;
            await load();
        };
    });

    const form = root.querySelector("#mcTrackForm");
    if (form) form.onsubmit = save;

    const goalEdit = root.querySelector("#mcGoalEdit");
    if (goalEdit) {
        goalEdit.onclick = () => {
            editingGoal = true;
            render();
        };
    }

    const goalForm = root.querySelector("#mcGoalForm");
    if (goalForm) {
        goalForm.onsubmit = saveGoal;
        root.querySelector("#mcGoalCancel").onclick = () => {
            editingGoal = false;
            render();
        };
    }

    root.querySelectorAll("[data-del]").forEach((b) => {
        b.onclick = () => confirmRemove(b);
    });
}

function fieldErrors(errors) {
    ["mcV1Err", "mcV2Err", "mcTakenAtErr", "mcNoteErr"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
    });

    const map = { value_1: "mcV1Err", value_2: "mcV2Err", taken_at: "mcTakenAtErr", note: "mcNoteErr" };

    Object.entries(errors || {}).forEach(([field, text]) => {
        const el = document.getElementById(map[field]);
        if (el) el.textContent = text;
    });
}

async function save(e) {
    e.preventDefault();

    const btn = document.getElementById("mcSaveReading");
    const taken = document.getElementById("mcTakenAt").value;

    btn.disabled = true;

    const res = await api("/mychart/readings", {
        method: "POST",
        body: JSON.stringify({
            kind,
            value_1: document.getElementById("mcV1").value,
            value_2: document.getElementById("mcV2")?.value ?? null,
            taken_at: taken ? taken.replace("T", " ") + ":00" : "",
            note: document.getElementById("mcNote").value,
        }),
    }).catch(() => null);

    btn.disabled = false;

    if (!res?.success) {
        fieldErrors(res?.errors);
        showToast(res?.message || "That reading could not be saved.", "error", 6000);
        return;
    }

    fieldErrors({});
    showToast(res.message, res.data?.out_of_band ? "error" : "success", res.data?.out_of_band ? 12000 : 4000);
    await load();

    if (res.data?.out_of_band) {
        const panel = document.getElementById("mcTrackPanel");
        if (panel) {
            panel.insertAdjacentHTML("afterbegin",
                `<div class="mc-flag" role="status">${esc(res.message)}</div>`);
        }
    }
}

async function saveGoal(e) {
    e.preventDefault();

    const btn = document.getElementById("mcGoalSave");
    btn.disabled = true;

    const res = await api("/mychart/reading-goals", {
        method: "POST",
        body: JSON.stringify({
            kind,
            target_low: document.getElementById("mcGoalLow").value,
            target_high: document.getElementById("mcGoalHigh").value,
        }),
    }).catch(() => null);

    btn.disabled = false;

    if (!res?.success) {
        document.getElementById("mcGoalErr").textContent =
            res?.errors?.target_low || res?.errors?.target_high || res?.message || "That goal could not be saved.";
        return;
    }

    editingGoal = false;
    showToast(res.message, "success", 4000);
    await load();
}

/** Removing a reading is confirmed in the row itself -- no browser dialog. */
function confirmRemove(btn) {
    const cell = btn.parentElement;

    cell.innerHTML = `<span class="mc-confirm">Remove this?
        <button type="button" class="mc-b sm" data-yes="${btn.dataset.del}">Yes, remove</button>
        <button type="button" class="mc-b sm" data-no="1">Keep</button></span>`;

    cell.querySelector("[data-no]").onclick = () => render();

    cell.querySelector("[data-yes]").onclick = async (ev) => {
        ev.currentTarget.disabled = true;

        const res = await api("/mychart/readings/delete", {
            method: "POST",
            body: JSON.stringify({ id: Number(btn.dataset.del) }),
        }).catch(() => null);

        if (!res?.success) {
            showToast(res?.message || "That could not be removed.", "error", 5000);
            render();
            return;
        }

        showToast(res.message, "success", 5000);
        await load();
    };
}
