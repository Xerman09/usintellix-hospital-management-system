import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { ensureCss, esc, when, dayLabel } from "./mychart-ui.js?v=11";

/*
 * My Chart -> Visits (patient portal, Phase 3).
 *
 * What is coming up (appointments, booked imaging and lab tests, with how to prepare)
 * and what has already happened (clinic visits, ER visits, hospital stays). Opening a
 * clinic visit shows its after-visit summary; opening a hospital stay shows the
 * discharge summary, but only once the doctor has signed it -- the backend decides
 * that, this screen only shows what it is given.
 *
 * Both summaries print on A4 through a separate window, the same approach the staff
 * reports use, so the patient can take one to another doctor.
 */

let data = null;
let open = null;   // { kind: 'avs'|'discharge', id }

export function MyChartVisitsView() {
    return `<div class="mc" id="mcVisits"><div class="mc-empty">Loading your visits…</div></div>`;
}

export async function initMyChartVisits() {
    ensureCss();
    await load();
}

async function load() {
    const root = document.getElementById("mcVisits");
    if (!root) return;

    const res = await api("/mychart/visits").catch(() => null);

    if (!res?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(res?.message || "Your visits could not be loaded. Please try again.")}</div>`;
        return;
    }

    data = res.data;
    render();

    if (open) {
        void openSummary(open.kind, open.id);
    }
}

function render() {
    const root = document.getElementById("mcVisits");
    if (!root) return;

    root.innerHTML = `
        <div class="mc-head">
            <h1>Visits</h1>
            <p class="mc-sub">What is booked, and what has already happened. Open a clinic visit for the summary your doctor
                wrote, or a hospital stay for the discharge summary once it has been signed.</p>
        </div>

        <h2 class="mc-h2">Coming up</h2>
        ${data.upcoming.length ? `<div class="mc-list">${data.upcoming.map(upcomingRow).join("")}</div>`
            : `<div class="mc-empty">Nothing booked at the moment.</div>`}

        <h2 class="mc-h2">Past visits</h2>
        ${data.past.length ? `<div class="mc-list">${data.past.map(pastRow).join("")}</div>`
            : `<div class="mc-empty">No past visits are recorded here yet.</div>`}

        <div id="mcVisitDetail" aria-live="polite"></div>`;

    root.querySelectorAll("[data-avs]").forEach((b) => (b.onclick = () => openSummary("avs", Number(b.dataset.avs))));
    root.querySelectorAll("[data-discharge]").forEach((b) => (b.onclick = () => openSummary("discharge", Number(b.dataset.discharge))));
}

const KIND_WORD = { appointment: "Appointment", imaging: "Imaging", lab: "Laboratory", encounter: "Clinic visit", er: "Emergency", admission: "Hospital stay" };

/** Drop anything that only repeats the title or the kind chip -- "Emergency · Emergency". */
function tidy(parts, ...alreadyShown) {
    const seen = new Set(alreadyShown.filter(Boolean).map((x) => String(x).toLowerCase()));
    return parts.filter((x) => {
        if (!x) return false;
        const k = String(x).toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function upcomingRow(v) {
    const kindWord = KIND_WORD[v.kind] || v.kind;
    const meta = tidy([v.department, v.facility, v.doctor ? `With ${v.doctor}` : "", v.where], v.title, kindWord);
    return `<div class="mc-row static">
        <span class="mc-main">
            <span class="mc-name">${esc(v.title)}</span>${kindWord.toLowerCase() === String(v.title).toLowerCase() ? "" : `<span class="mc-chip kind">${esc(kindWord)}</span>`}
            <span class="mc-meta">${esc(tidy([...meta, v.reason], v.title, kindWord).join(" · "))}</span>
            ${v.prepare?.length ? `<div class="mc-prep"><b>How to prepare</b><ul>${v.prepare.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}
        </span>
        <span class="mc-right"><b>${esc(dayLabel(v.when))}</b><br>${v.all_day ? "All day" : esc(String(v.when).slice(11, 16))}</span>
    </div>`;
}

function pastRow(v) {
    const kindWord = KIND_WORD[v.kind] || v.kind;
    // A stay is placed by its ward and bed, so the ward is not repeated as the department.
    const where = v.kind === "admission" && v.ward ? `${v.ward}${v.bed ? `, bed ${v.bed}` : ""}` : "";
    const meta = tidy([where, v.kind === "admission" ? "" : v.department, v.facility, v.doctor ? `With ${v.doctor}` : ""],
        v.title, kindWord, v.kind === "admission" ? v.ward : "");
    const stay = v.kind === "admission" && v.left_at ? ` – ${dayLabel(v.left_at)}` : "";
    return `<div class="mc-row static">
        <span class="mc-main">
            <span class="mc-name">${esc(v.title)}</span>${kindWord.toLowerCase() === String(v.title).toLowerCase() ? "" : `<span class="mc-chip kind">${esc(kindWord)}</span>`}
            <span class="mc-meta">${esc(tidy([...meta, v.reason], v.title, kindWord).join(" · "))}</span>
            ${v.kind === "er" && v.diagnosis ? `<span class="mc-meta">Diagnosis: ${esc(v.diagnosis)}${v.follow_up ? ` · ${esc(v.follow_up)}` : ""}</span>` : ""}
            ${v.kind === "admission" && !v.has_summary && String(v.status).toLowerCase() !== "admitted"
                ? `<span class="mc-meta">The discharge summary appears here once your doctor has signed it.</span>` : ""}
            ${v.kind === "encounter" ? `<button type="button" class="mc-b sm" data-avs="${v.id}">Visit summary</button>` : ""}
            ${v.kind === "admission" && v.has_summary ? `<button type="button" class="mc-b sm" data-discharge="${v.id}">Discharge summary</button>` : ""}
        </span>
        <span class="mc-right"><b>${esc(dayLabel(v.when))}${esc(stay)}</b>${v.outcome ? `<br>${esc(v.outcome)}` : ""}</span>
    </div>`;
}

/* ---------------- the summaries ---------------- */

async function openSummary(kind, id) {
    const panel = document.getElementById("mcVisitDetail");
    if (!panel) return;

    open = { kind, id };
    panel.innerHTML = `<div class="mc-panel">Opening…</div>`;

    const url = kind === "avs" ? `/mychart/visits/avs?encounter_id=${id}` : `/mychart/visits/discharge-summary?admission_id=${id}`;
    const res = await api(url).catch(() => null);

    if (!res?.success) {
        panel.innerHTML = "";
        open = null;
        showToast(res?.message || "That summary could not be opened.", "error", 7000);
        return;
    }

    panel.innerHTML = `<div class="mc-panel" id="mcSummary">
        ${kind === "avs" ? avsHtml(res.data) : dischargeHtml(res.data)}
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="mc-b sm" id="mcPrint">Print this</button>
            <button type="button" class="mc-b sm" id="mcCloseSummary">Close</button>
        </div>
    </div>`;

    panel.querySelector("#mcCloseSummary").onclick = () => {
        open = null;
        panel.innerHTML = "";
    };
    panel.querySelector("#mcPrint").onclick = () => printSummary(kind === "avs" ? avsHtml(res.data) : dischargeHtml(res.data));
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

const block = (title, body) => (body ? `<section class="mc-sec"><h3>${esc(title)}</h3>${body}</section>` : "");
const para = (text) => (text ? `<p>${esc(text)}</p>` : "");

function avsHtml(a) {
    const meta = [a.department, a.facility, a.doctor ? `With ${a.doctor}` : "", a.visit_type].filter(Boolean);
    return `
        <h2>Visit summary</h2>
        <div class="mc-meta">${esc(dayLabel(a.date))}${meta.length ? ` · ${esc(meta.join(" · "))}` : ""}</div>
        ${a.reason ? `<p class="mc-lead">You came about: ${esc(a.reason)}</p>` : ""}
        ${block("What you were diagnosed with", a.diagnoses.length
            ? `<ul>${a.diagnoses.map((d) => `<li>${esc(d.description || d.code)}${d.code && d.description ? ` <span class="muted">(${esc(d.code)})</span>` : ""}</li>`).join("")}</ul>`
            : "")}
        ${block("What your doctor thought", para(a.assessment))}
        ${block("The plan", para(a.plan))}
        ${block("What you were asked to do", a.instructions.length ? `<ul>${a.instructions.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "")}
        ${block("Medicines changed at this visit", a.medicines.length
            ? `<ul>${a.medicines.map((m) => `<li><b>${esc(m.name)}</b> — ${m.change === "started" ? "started" : "stopped"}${
                m.dosage || m.frequency ? ` <span class="muted">${esc([m.dosage, m.route, m.frequency].filter(Boolean).join(", "))}</span>` : ""}${
                m.directions ? `<div class="muted">${esc(m.directions)}</div>` : ""}</li>`).join("")}</ul>` : "")}
        ${block("What was measured", a.vitals.length
            ? `<table class="mc-tbl"><tbody>${a.vitals.map((v) => `<tr><td>${esc(v.label)}</td><td class="n">${esc(v.value)}</td></tr>`).join("")}</tbody></table>` : "")}
        ${block("Goals set with you", a.care_plan.length
            ? `<ul>${a.care_plan.map((c) => `<li>${esc(c.code_text || c.description || "")}${c.target_date ? ` <span class="muted">by ${esc(dayLabel(c.target_date))}</span>` : ""}</li>`).join("")}</ul>` : "")}
        ${block("Your next appointment", a.follow_up
            ? `<p>${esc(dayLabel(a.follow_up.appointment_date))}${a.follow_up.appointment_time ? ` at ${esc(String(a.follow_up.appointment_time).slice(0, 5))}` : ""}${
                a.follow_up.doctor ? ` with ${esc(a.follow_up.doctor)}` : ""}${a.follow_up.facility ? `, ${esc(a.follow_up.facility)}` : ""}${
                a.follow_up.reason ? `<br><span class="muted">${esc(a.follow_up.reason)}</span>` : ""}</p>` : "")}
        ${block("Your care team", teamHtml(a.care_team))}`;
}

function dischargeHtml(d) {
    return `
        <h2>Discharge summary</h2>
        <div class="mc-meta">In hospital ${esc(dayLabel(d.admitted_on))}${d.discharged_on ? ` to ${esc(dayLabel(d.discharged_on))}` : ""}${
            d.ward ? ` · ${esc(d.ward)}${d.bed ? `, bed ${esc(d.bed)}` : ""}` : ""} · ${esc(d.summary_number || "")}</div>
        ${block("Why you came in", para(d.admitting_diagnosis))}
        ${block("What you were treated for", para(d.discharge_diagnosis))}
        ${block("What happened while you were here", para(d.hospital_course))}
        ${block("Procedures", para(d.procedures))}
        ${block("How you were when you left", para([d.condition, d.sent_home_as].filter(Boolean).join(" · ")))}
        ${block("Medicines to take at home", para(d.medicines))}
        ${block("Eating and drinking", para(d.diet))}
        ${block("Activity", para(d.activity))}
        ${block("Follow-up", para(d.follow_up))}
        ${block("Signed by", `<p>${esc(d.attending || "")}${d.license_no ? ` <span class="muted">(licence ${esc(d.license_no)})</span>` : ""}${
            d.signed_at ? `<br><span class="muted">${esc(when(d.signed_at))}</span>` : ""}</p>`)}
        ${block("Your care team", teamHtml(d.care_team))}`;
}

function teamHtml(team) {
    if (!team?.length) return "";
    return `<ul>${team.map((m) => `<li>${esc(m.name)}${m.role ? ` <span class="muted">${esc(String(m.role).replace(/_/g, " "))}</span>` : ""}</li>`).join("")}</ul>`;
}

/** A4 in its own window, so the patient can hand it to another doctor. */
function printSummary(inner) {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
        showToast("Your browser blocked the print window. Allow pop-ups for this site and try again.", "error", 7000);
        return;
    }

    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Summary</title><style>
        @page { size: A4 portrait; margin: 14mm; }
        body { font: 12pt/1.5 Georgia, "Times New Roman", serif; color: #111; margin: 0; }
        h2 { font-size: 18pt; margin: 0 0 2px; }
        h3 { font-size: 11pt; text-transform: uppercase; letter-spacing: .05em; color: #444; margin: 0 0 4px; border-bottom: 1px solid #bbb; padding-bottom: 2px; }
        .mc-meta { color: #444; font-size: 10.5pt; margin-bottom: 10px; }
        .mc-lead { margin: 0 0 12px; }
        .mc-sec { margin-bottom: 12px; break-inside: avoid; }
        .mc-sec p { margin: 0; white-space: pre-wrap; }
        ul { margin: 0; padding-left: 20px; }
        table { border-collapse: collapse; }
        td { padding: 2px 14px 2px 0; }
        td.n { text-align: right; font-variant-numeric: tabular-nums; }
        .muted { color: #555; }
    </style></head><body>${inner}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
}
