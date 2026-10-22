import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js?v=3";

/*
 * Online Check-ins (tab "portal_checkins", Patient Flow area).
 *
 * Who has filled in their paperwork at home before coming. For each one the desk can
 * see which steps are done, read the answers the patient gave the doctor, and mark
 * them arrived in one tap -- which creates the same patient-flow row the desk would
 * have created by hand.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let date = "";
let timer = null;

export function PortalCheckinsView() {
    return `
<style>
.pck { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pck h1 { margin: 0; font-size: 22px; }
.pck .pck-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pck-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.pck input[type=date] { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.pck-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pck-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pck-counts b { font-size: 18px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.pck-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.pck-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pck-table th, .pck-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pck-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pck-table tr:last-child td { border-bottom: 0; }
.pck-steps { display: inline-flex; gap: 4px; }
.pck-dot { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--border-color); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--text-muted); }
.pck-dot.on { background: #dcfce7; border-color: #86efac; color: #14532d; }
:root[data-theme="dark"] .pck-dot.on { background: #052e16; border-color: #166534; color: #bbf7d0; }
.pck-flag { display: inline-block; border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 700; background: #fef3c7; border: 1px solid #fcd34d; color: #78350f; margin-right: 4px; }
:root[data-theme="dark"] .pck-flag { background: #422006; border-color: #92400e; color: #fde68a; }
.pck-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 5px 11px; font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.pck-btn.primary { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pck-btn:disabled { opacity: .55; cursor: default; }
.pck-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pck-acts { white-space: nowrap; text-align: right; }
.pck-acts .pck-btn { margin-left: 5px; }
.pck-sub { color: var(--text-muted); font-size: 12px; }
.pck-empty { padding: 24px; text-align: center; color: var(--text-muted); }
.pck-answers { margin-top: 12px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); padding: 14px 16px; }
.pck-answers h3 { margin: 0 0 2px; font-size: 15px; }
.pck-answers dt { font-weight: 600; font-size: 12.5px; color: var(--text-muted); margin-top: 8px; }
.pck-answers dd { margin: 2px 0 0; }
</style>
<div class="pck">
    <h1>Online check-ins</h1>
    <p class="pck-intro">Patients who filled in their paperwork before coming. The ticks show which steps they finished.
        “Arrived” puts them in the patient flow exactly as checking them in at the desk would.</p>
    <div class="pck-bar">
        <label for="pckDate" class="pck-sub">Day</label>
        <input type="date" id="pckDate">
        <button type="button" class="pck-btn" id="pckToday">Today</button>
    </div>
    <div id="pckBody"><div class="pck-empty">Loading…</div></div>
    <div id="pckAnswers" aria-live="polite"></div>
</div>`;
}

export async function initPortalCheckins() {
    date = todayISO();
    const input = $("pckDate");
    if (input) {
        input.value = date;
        input.onchange = (e) => {
            date = e.target.value || todayISO();
            load();
        };
    }
    const today = $("pckToday");
    if (today) {
        today.onclick = () => {
            date = todayISO();
            $("pckDate").value = date;
            load();
        };
    }

    await load();
    clearInterval(timer);
    timer = setInterval(() => {
        if (!$("pckBody")) {
            clearInterval(timer);
            return;
        }
        if (!document.hidden) load(true);
    }, 60000);
}

async function load(quiet = false) {
    const res = await api(`/portal-checkins?date=${encodeURIComponent(date)}`).catch(() => null);
    const body = $("pckBody");
    if (!body) return;

    if (!res?.success) {
        if (!quiet) body.innerHTML = `<div class="pck-empty">Could not load the check-ins. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render();
}

const STEP_LETTERS = [["demographics", "D"], ["insurance", "I"], ["consents", "C"], ["questionnaire", "Q"], ["id_document", "ID"], ["copay", "P"]];

function render() {
    const body = $("pckBody");

    body.innerHTML = `
        <div class="pck-counts">
            <div><b>${data.counts.checked_in}</b>checked in online</div>
            <div><b>${data.counts.started}</b>started but not finished</div>
            <div><b>${data.counts.arrived}</b>already arrived</div>
        </div>
        <div class="pck-card">
            <table class="pck-table">
                <thead><tr><th>Time</th><th>Patient</th><th>Steps</th><th>To check</th><th>Doctor</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="6" class="pck-empty">Nobody has checked in online for this day.</td></tr>`}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-answers]").forEach((b) => (b.onclick = () => openAnswers(Number(b.dataset.answers))));
    body.querySelectorAll("[data-arrive]").forEach((b) => (b.onclick = () => arrive(Number(b.dataset.arrive), b)));
}

function rowHtml(x) {
    const flags = [];
    if (x.insurance_changed) flags.push("Insurance changed");
    if (x.patient.identity_status === "Pending Verification") flags.push("ID to check");
    if (x.steps.copay) flags.push("Copay paid");

    return `<tr>
        <td>${esc(String(x.time || "").slice(0, 5))}</td>
        <td><b>${esc(x.patient.name)}</b><div class="pck-sub">${esc(x.patient.mrn || "")}</div>
            ${x.reason ? `<div class="pck-sub">${esc(x.reason)}</div>` : ""}
            ${x.insurance_note ? `<div class="pck-sub">${esc(x.insurance_note)}</div>` : ""}</td>
        <td><span class="pck-steps">${STEP_LETTERS.map(([k, l]) =>
            `<span class="pck-dot ${x.steps[k] ? "on" : ""}" title="${esc(k.replace("_", " "))}${x.steps[k] ? ": done" : ": not done"}">${l}</span>`).join("")}</span>
            <div class="pck-sub">${x.status === "completed" ? "Finished" : "Still filling in"}</div></td>
        <td>${flags.map((f) => `<span class="pck-flag">${esc(f)}</span>`).join("") || "—"}</td>
        <td class="pck-sub">${esc(x.doctor || "")}</td>
        <td class="pck-acts">
            ${x.response_id ? `<button type="button" class="pck-btn" data-answers="${x.response_id}">Answers</button>` : ""}
            ${x.arrived ? `<span class="pck-sub">Arrived</span>`
                : `<button type="button" class="pck-btn primary" data-arrive="${x.appointment_id}">Arrived</button>`}
        </td>
    </tr>`;
}

async function openAnswers(responseId) {
    const box = $("pckAnswers");
    box.innerHTML = `<div class="pck-answers">Opening…</div>`;

    const res = await api(`/portal-checkins/response?id=${responseId}`).catch(() => null);

    if (!res?.success) {
        box.innerHTML = "";
        showToast(res?.message || "Those answers could not be opened.", "error", 6000);
        return;
    }

    const r = res.data;
    box.innerHTML = `<div class="pck-answers">
        <h3>${esc(r.name || "Answers")}</h3>
        <div class="pck-sub">${esc(r.patient.name)} · ${esc(r.patient.mrn || "")} · sent ${esc(String(r.submitted_at).slice(0, 16).replace("T", " "))}</div>
        <dl>${r.items.map((i) => `<dt>${esc(i.label)}</dt><dd>${esc(i.answer)}</dd>`).join("")}</dl>
        <button type="button" class="pck-btn" id="pckCloseAnswers">Close</button>
    </div>`;
    box.querySelector("#pckCloseAnswers").onclick = () => (box.innerHTML = "");
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function arrive(appointmentId, btn) {
    btn.disabled = true;
    const res = await api("/portal-checkins/arrive", {
        method: "POST", body: JSON.stringify({ appointment_id: appointmentId }),
    }).catch(() => null);

    showToast(res?.message || "That did not work.", res?.success ? "success" : "error", 6000);

    if (res?.success) await load();
    else btn.disabled = false;
}
