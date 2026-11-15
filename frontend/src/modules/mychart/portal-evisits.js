import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Online visits (tab "portal_evisits").
 *
 * Phase M15a. Two tabs:
 *
 *   Queue     e-visits waiting to be read, oldest-due first. Claim one so two
 *             clinicians do not both write a reply, read what the patient
 *             answered, and reply -- which creates a real encounter.
 *
 *   Reasons   what patients may raise an e-visit about, and the red-flag
 *             screening behind each one. The red flags are printed in full,
 *             because they are the only thing standing between this feature and
 *             somebody with chest pain filling in a form.
 *
 * Two things about this screen are deliberate and should not be "improved":
 *
 *   The queue is ordered by how long somebody has waited against what the
 *   hospital promised, and by nothing else. Sorting by a computed severity
 *   would be code deciding who is sickest from a questionnaire.
 *
 *   Refused e-visits are on their own tab and never in the queue. A red-flag
 *   answer refuses the submission at the point the patient makes it, and they
 *   are told to go to hospital. The row is a log of that happening, not work
 *   waiting to be done -- putting it in a queue would imply somebody is going
 *   to deal with it, which is exactly the impression the refusal avoids giving
 *   the patient.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let reasonsData = null;
let tab = "queue";
let status = "waiting";

const OUTCOME_LABELS = {
    advice: "Advice given",
    come_in: "Needs to be seen",
    emergency: "Sent to emergency",
    referred: "Referred on",
    test_ordered: "Tests ordered",
};

function waitedText(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
}

export function PortalEvisitsView() {
    return `
<style>
.pev { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pev h1 { margin: 0; font-size: 22px; }
.pev .pev-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pev input, .pev select, .pev textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pev textarea { min-height: 58px; resize: vertical; }
.pev-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pev-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pev-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pev-btn.danger { background: var(--bg-surface); border-color: #fecaca; color: #b91c1c; }
.pev-btn.on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pev-btn:disabled { opacity: .55; cursor: default; }
.pev-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pev-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border-color); margin-bottom: 14px; }
.pev-tabs button { border: 0; background: none; color: var(--text-muted); font: inherit; font-size: 13.5px; font-weight: 700; padding: 8px 12px; cursor: pointer; border-bottom: 2px solid transparent; }
.pev-tabs button.on { color: var(--text-primary); border-bottom-color: #1d4ed8; }
.pev-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pev-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pev-table th, .pev-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pev-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pev-table tr:last-child td { border-bottom: 0; }
.pev-sub { color: var(--text-muted); font-size: 12px; }
.pev-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
.pev-pill.submitted { background: #fffbeb; color: #92400e; }
.pev-pill.answered { background: #dcfce7; color: #166534; }
.pev-pill.refused { background: #fee2e2; color: #991b1b; }
.pev-pill.closed, .pev-pill.withdrawn { background: var(--bg-surface-alt); color: var(--text-muted); }
.pev-pill.overdue { background: #fee2e2; color: #991b1b; }
.pev-pill.on { background: #dcfce7; color: #166534; }
.pev-pill.off { background: var(--bg-surface-alt); color: var(--text-muted); }
.pev-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pev-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pev-counts div.bad { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
.pev-counts b { font-size: 18px; margin-right: 4px; }
.pev-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 10px; padding: 9px 12px; margin-bottom: 12px; font-size: 12.5px; }
.pev-danger { border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; font-size: 12.5px; line-height: 1.5; }
.pev-note { border: 1px solid var(--border-color); background: var(--bg-surface-alt); border-radius: 10px; padding: 9px 12px; margin-bottom: 14px; font-size: 12.5px; line-height: 1.5; max-width: 90ch; }
.pev-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, .5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1200; }
.pev-sheet { background: var(--bg-surface); border-radius: 14px; border: 1px solid var(--border-color); width: min(760px, 100%); max-height: 90vh; overflow: auto; padding: 20px 22px; }
.pev-sheet h2 { margin: 0 0 4px; font-size: 18px; }
.pev-field { margin-top: 12px; }
.pev-field label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
.pev-field input, .pev-field select, .pev-field textarea { width: 100%; }
.pev-answers { display: grid; grid-template-columns: 1fr; gap: 0; margin: 10px 0 0; }
.pev-answers > div { padding: 7px 0; border-bottom: 1px solid var(--border-color); }
.pev-answers > div:last-child { border-bottom: 0; }
.pev-q { color: var(--text-muted); font-size: 12px; }
.pev-a { font-weight: 600; margin-top: 2px; }
.pev-safety { background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; margin-top: 10px; }
.pev-thread { margin-top: 12px; }
.pev-msg { border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; font-size: 13px; line-height: 1.5; }
.pev-msg.patient { background: var(--bg-surface-alt); border: 1px solid var(--border-color); }
.pev-msg.clinician { background: #eff6ff; border: 1px solid #bfdbfe; }
.pev-msg .who { font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 3px; }
.pev-flag { border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; padding: 7px 10px; margin-top: 6px; font-size: 12px; color: #991b1b; }
</style>
<div class="pev">
    <h1>Online visits</h1>
    <p class="pev-intro">
        e-visits patients have raised by answering a questionnaire. Replying creates a real
        encounter in the patient record, under the e-visit visit category, so the note and
        any orders live where everything else does. The queue is ordered by how long
        somebody has waited, not by how serious it looks.
    </p>
    <div class="pev-tabs">
        <button type="button" data-tab="queue" class="on">Queue</button>
        <button type="button" data-tab="reasons">What patients can raise</button>
    </div>
    <div id="pevBody"><div class="pev-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalEvisits() {
    wireTabs();
    await load();
}

function wireTabs() {
    document.querySelectorAll(".pev-tabs [data-tab]").forEach((b) => {
        b.onclick = () => {
            tab = b.dataset.tab;
            document.querySelectorAll(".pev-tabs [data-tab]").forEach((x) => x.classList.toggle("on", x.dataset.tab === tab));
            if (tab === "queue") load();
            else loadReasons();
        };
    });
}

// --------------------------------------------------------------------- queue
async function load(q = "") {
    const params = new URLSearchParams({ status });
    if (q) params.set("q", q);

    const res = await api(`/portal-evisits?${params.toString()}`).catch(() => null);
    const body = $("pevBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pev-sub" style="padding:24px;text-align:center">Could not load the queue. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pevBody");

    body.innerHTML = `
        <div class="pev-counts">
            <div><b>${data.counts.waiting}</b>waiting</div>
            <div class="${data.counts.overdue ? "bad" : ""}"><b>${data.counts.overdue}</b>past the ${data.reply_hours}h aim</div>
            <div><b>${data.counts.answered}</b>answered</div>
            <div><b>${data.counts.refused}</b>refused on a red flag</div>
        </div>
        ${!data.can_answer ? `<div class="pev-warn">You can read these but not reply to them.</div>` : ""}
        ${status === "refused" ? `<div class="pev-danger">
            These were refused at the point the patient submitted them, because of a red-flag answer.
            Each patient was told to go to the emergency department now, and told that nobody is reading
            the message. <strong>They were not told anybody would contact them.</strong> This list is a
            record of that happening — it is not a queue, and nothing here is waiting on you.
        </div>` : ""}
        <div class="pev-bar">
            ${[["waiting", "Waiting"], ["answered", "Answered"], ["refused", "Refused"], ["closed", "Finished"], ["all", "All"]].map(([s, label]) =>
                `<button type="button" class="pev-btn ${s === status ? "on" : ""}" data-status="${s}">${label}</button>`
            ).join("")}
            <input type="search" id="pevQ" value="${esc(q)}" placeholder="Patient, reference or reason" aria-label="Find an e-visit" style="min-width:260px">
        </div>
        <div class="pev-card">
            <table class="pev-table">
                <thead><tr><th>Patient</th><th>About</th><th>Waiting</th><th>Status</th><th>Outcome</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="6" class="pev-sub" style="padding:22px;text-align:center">Nothing here.</td></tr>`}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-status]").forEach((b) => {
        b.onclick = () => {
            status = b.dataset.status;
            load($("pevQ")?.value.trim() || "");
        };
    });

    const search = $("pevQ");
    if (search) {
        let timer = null;
        search.oninput = () => {
            clearTimeout(timer);
            timer = setTimeout(() => load(search.value.trim()), 300);
        };
    }

    body.querySelectorAll("[data-open]").forEach((b) => {
        b.onclick = () => openEvisit(Number(b.dataset.open));
    });
}

function rowHtml(r) {
    const age = r.patient.birthdate
        ? Math.floor((Date.now() - new Date(r.patient.birthdate).getTime()) / 31557600000)
        : null;

    return `
    <tr>
        <td>
            <strong>${esc(r.patient.name)}</strong>
            <div class="pev-sub">${esc(r.patient.mrn || "")}${age !== null ? ` · ${age}` : ""}${r.patient.sex ? ` · ${esc(r.patient.sex)}` : ""}</div>
        </td>
        <td>
            ${esc(r.reason)}
            <div class="pev-sub">${esc(r.evisit_no)}</div>
            ${r.red_flag ? `<div class="pev-sub" style="color:#991b1b">red flag: ${esc(r.red_flag_keys || "")}</div>` : ""}
        </td>
        <td>
            ${esc(waitedText(r.waiting_minutes))}
            ${r.overdue ? `<div><span class="pev-pill overdue">past the aim</span></div>` : ""}
            ${r.due_by ? `<div class="pev-sub">due ${esc(String(r.due_by).slice(0, 16))}</div>` : ""}
        </td>
        <td>
            <span class="pev-pill ${esc(r.status)}">${esc(r.status)}</span>
            ${r.claimed_by_name ? `<div class="pev-sub">with ${esc(r.claimed_by_name)}</div>` : ""}
            ${r.answered_by_name ? `<div class="pev-sub">by ${esc(r.answered_by_name)}</div>` : ""}
        </td>
        <td class="pev-sub">
            ${r.outcome ? esc(OUTCOME_LABELS[r.outcome] || r.outcome) : "—"}
            ${r.encounter_id ? `<div>encounter #${r.encounter_id}</div>` : ""}
        </td>
        <td><button type="button" class="pev-btn" data-open="${r.id}">Open</button></td>
    </tr>`;
}

// ---------------------------------------------------------------- the reader
async function openEvisit(evisitId) {
    const res = await api("/portal-evisits/open", "POST", { id: evisitId }).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "Could not open that.", "error");
        return;
    }

    const e = res.data;
    const canReply = data.can_answer && e.status === "submitted";

    const wrap = document.createElement("div");
    wrap.className = "pev-modal";
    wrap.innerHTML = `
    <div class="pev-sheet" role="dialog" aria-modal="true" aria-label="Online visit">
        <h2>${esc(e.reason)}</h2>
        <div class="pev-sub">
            ${esc(e.patient.name)} · ${esc(e.patient.mrn || "")} · ${esc(e.evisit_no)} ·
            submitted ${esc(String(e.submitted_at || "").slice(0, 16))}
        </div>

        ${e.red_flag ? `<div class="pev-danger" style="margin-top:12px">
            <strong>This was refused on a red-flag answer and is not waiting for a reply.</strong>
            The patient was told to go to the emergency department immediately, and told that nobody
            is reading the message. They were not told anybody would contact them.
            ${e.red_flag_note ? `<div style="margin-top:5px">${esc(e.red_flag_note)}</div>` : ""}
        </div>` : ""}

        ${e.status === "submitted" && !e.red_flag ? `<div class="pev-note" style="margin-top:12px">
            The patient has not been examined. Everything below is self-reported. If it cannot be
            answered safely in writing, the honest outcome is "needs to be seen" — that is a clinical
            answer, not a failure of this screen.
        </div>` : ""}

        <h3 style="margin:16px 0 0;font-size:14px">What they told us</h3>
        <div class="pev-answers">
            ${e.history.length ? e.history.map((a) => `
                <div>
                    <div class="pev-q">${esc(a.label)}</div>
                    <div class="pev-a">${esc(a.answer || "—")}</div>
                </div>`).join("") : `<div class="pev-sub">Nothing recorded.</div>`}
        </div>

        <div class="pev-safety">
            <div class="pev-sub" style="font-weight:700">Safety screening — asked before anything else</div>
            <div class="pev-answers">
                ${e.safety_checks.map((a) => `
                    <div>
                        <div class="pev-q">${esc(a.label)}</div>
                        <div class="pev-a">${esc(a.answer || "—")}</div>
                    </div>`).join("")}
            </div>
        </div>

        ${e.messages.length ? `
            <h3 style="margin:16px 0 0;font-size:14px">Thread</h3>
            <div class="pev-thread">
                ${e.messages.map((m) => `
                    <div class="pev-msg ${esc(m.from)}">
                        <div class="who">${esc(m.from === "patient" ? "Patient" : m.author)} · ${esc(String(m.at || "").slice(0, 16))}</div>
                        ${esc(m.body)}
                    </div>`).join("")}
            </div>` : ""}

        ${e.encounter_id ? `<div class="pev-sub" style="margin-top:12px">Filed as encounter #${e.encounter_id}.</div>` : ""}

        ${canReply ? `
            <div class="pev-field">
                <label for="pevrOutcome">What have you decided?</label>
                <select id="pevrOutcome">
                    <option value="">Choose…</option>
                    ${e.outcomes.map((o) => `<option value="${esc(o)}">${esc(OUTCOME_LABELS[o] || o)}</option>`).join("")}
                </select>
            </div>
            <div class="pev-field">
                <label for="pevrBody">Your reply, as the patient will read it</label>
                <textarea id="pevrBody" maxlength="8000" style="min-height:120px" placeholder="Plain words. Say what to do, what to watch for, and when to come in anyway."></textarea>
            </div>
            <div class="pev-sub" style="margin-top:6px">
                Sending this creates an encounter under "${esc("e-Visit (online, no examination)")}". The patient
                gets a message saying a reply is waiting — it carries no clinical detail.
            </div>
            <div class="pev-bar" style="margin:14px 0 0">
                <button type="button" class="pev-btn primary" id="pevrSend">Send reply</button>
                ${e.claimed_by ? `<button type="button" class="pev-btn" id="pevrRelease">Put back in the queue</button>`
                    : `<button type="button" class="pev-btn" id="pevrClaim">Claim it</button>`}
                <button type="button" class="pev-btn" id="pevrCancel">Close</button>
            </div>`
        : `<div class="pev-bar" style="margin:14px 0 0">
                ${data.can_answer && e.status === "answered" ? `<button type="button" class="pev-btn" id="pevrFinish">Mark finished</button>` : ""}
                <button type="button" class="pev-btn" id="pevrCancel">Close</button>
           </div>`}
    </div>`;

    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.onclick = (ev) => { if (ev.target === wrap) close(); };
    wrap.querySelector("#pevrCancel").onclick = close;

    const claimBtn = wrap.querySelector("#pevrClaim");
    if (claimBtn) {
        claimBtn.onclick = async () => {
            const r = await api("/portal-evisits/claim", "POST", { id: evisitId }).catch(() => null);
            showToast(r?.message || "That did not work.", r?.success ? "success" : "error");
            if (r?.success) { close(); load($("pevQ")?.value.trim() || ""); }
        };
    }

    const releaseBtn = wrap.querySelector("#pevrRelease");
    if (releaseBtn) {
        releaseBtn.onclick = async () => {
            const r = await api("/portal-evisits/release", "POST", { id: evisitId }).catch(() => null);
            showToast(r?.message || "That did not work.", r?.success ? "success" : "error");
            if (r?.success) { close(); load($("pevQ")?.value.trim() || ""); }
        };
    }

    const finishBtn = wrap.querySelector("#pevrFinish");
    if (finishBtn) {
        finishBtn.onclick = async () => {
            const r = await api("/portal-evisits/close", "POST", { id: evisitId }).catch(() => null);
            showToast(r?.message || "That did not work.", r?.success ? "success" : "error");
            if (r?.success) { close(); load($("pevQ")?.value.trim() || ""); }
        };
    }

    const sendBtn = wrap.querySelector("#pevrSend");
    if (sendBtn) {
        sendBtn.onclick = async () => {
            const outcome = wrap.querySelector("#pevrOutcome").value;
            const body = wrap.querySelector("#pevrBody").value.trim();

            if (!outcome) { showToast("Say what you have decided.", "error"); return; }
            if (!body) { showToast("Write a reply first.", "error"); return; }

            sendBtn.disabled = true;

            const r = await api("/portal-evisits/reply", "POST", { id: evisitId, outcome, body }).catch(() => null);

            sendBtn.disabled = false;

            if (!r?.success) {
                showToast(r?.message || "That did not work.", "error");
                return;
            }

            showToast(r.message, "success");
            close();
            load($("pevQ")?.value.trim() || "");
        };
    }
}

// ------------------------------------------------------------------- reasons
async function loadReasons() {
    const res = await api("/portal-evisit-reasons").catch(() => null);
    const body = $("pevBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pev-sub" style="padding:24px;text-align:center">Could not load the reasons. ${esc(res?.message || "")}</div>`;
        return;
    }

    reasonsData = res.data;
    renderReasons();
}

function renderReasons() {
    const body = $("pevBody");
    const s = reasonsData.settings;

    body.innerHTML = `
        <div class="pev-note">
            <strong>Online visits are ${s.allow ? "switched ON" : "switched OFF"} for this hospital.</strong>
            ${s.allow
                ? `Patients can raise the reasons marked below. The aim is a reply within ${s.reply_hours} hours;
                   one patient may have ${s.max_open} open at a time, and may ask one follow-up for
                   ${s.followup_days} days after a reply.`
                : `Nothing below is reachable by a patient until somebody switches it on in settings. It ships
                   off on purpose: an e-visit puts clinical triage in front of a patient, and the questions and
                   the red-flag list need a clinician to sign them off first.`}
        </div>
        <div class="pev-note">
            <strong>About the red-flag questions.</strong>
            They are asked before anything else, and a patient who answers one of them positively is refused
            on the spot and told to get help in person. That is the only thing standing between this feature
            and somebody with chest pain filling in a form, so they are printed in full here rather than
            summarised. A reason cannot be shown to patients at all unless its questionnaire has some.
        </div>
        ${!reasonsData.can_edit ? `<div class="pev-warn">You can read this but not change it.</div>` : ""}
        <div class="pev-card">
            <table class="pev-table">
                <thead><tr><th>Patients see</th><th>Questionnaire</th><th>Red-flag screening</th><th>Reaches patients?</th><th></th></tr></thead>
                <tbody>${reasonsData.items.map(reasonRowHtml).join("")}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-edit]").forEach((b) => {
        b.onclick = () => openReasonEdit(reasonsData.items.find((x) => x.id === Number(b.dataset.edit)));
    });
}

function reasonRowHtml(r) {
    const q = r.questionnaire;

    return `
    <tr>
        <td>
            <strong>${esc(r.patient_label)}</strong>
            <div class="pev-sub">${esc(r.code)}</div>
            ${r.patient_blurb ? `<div class="pev-sub">${esc(r.patient_blurb)}</div>` : ""}
            ${r.not_for_text ? `<div class="pev-sub" style="margin-top:4px"><em>Not for:</em> ${esc(r.not_for_text)}</div>` : ""}
        </td>
        <td>${q
            ? `${esc(q.name)}<div class="pev-sub">${esc(q.code)} · ${q.question_count} questions${q.active ? "" : " · INACTIVE"}</div>`
            : `<span class="pev-sub">none</span>`}</td>
        <td>
            ${q && q.red_flag_count
                ? `<span class="pev-pill on">${q.red_flag_count} question${q.red_flag_count === 1 ? "" : "s"}</span>
                   ${q.red_flags.map((f) => `<div class="pev-flag"><strong>${esc(f.label)}</strong><br>
                        refuses on: ${esc((f.when || []).join(" / "))}<br>
                        <em>${esc(f.because)}</em></div>`).join("")}`
                : `<span class="pev-pill refused">none</span>`}
        </td>
        <td>
            <span class="pev-pill ${r.reaches_patients.reaches ? "on" : "off"}">${r.reaches_patients.reaches ? "Yes" : "No"}</span>
            <div class="pev-sub" style="margin-top:3px">${esc(r.reaches_patients.why)}</div>
        </td>
        <td>${reasonsData.can_edit ? `<button type="button" class="pev-btn" data-edit="${r.id}">Edit</button>` : ""}</td>
    </tr>`;
}

function openReasonEdit(r) {
    if (!r) return;

    const wrap = document.createElement("div");
    wrap.className = "pev-modal";
    wrap.innerHTML = `
    <div class="pev-sheet" role="dialog" aria-modal="true" aria-label="What patients can raise">
        <h2>${esc(r.patient_label)}</h2>
        <div class="pev-sub">${esc(r.code)} · the questions themselves are managed with the questionnaires, not here.</div>

        <div class="pev-field">
            <label for="pevnLabel">Name patients see</label>
            <input type="text" id="pevnLabel" maxlength="255" value="${esc(r.patient_label)}">
        </div>

        <div class="pev-field">
            <label for="pevnBlurb">One-line description</label>
            <textarea id="pevnBlurb" maxlength="500">${esc(r.patient_blurb || "")}</textarea>
        </div>

        <div class="pev-field">
            <label for="pevnNotFor">"Not for this" warning, shown before they start</label>
            <textarea id="pevnNotFor" maxlength="500" placeholder="The presentations that must be seen in person.">${esc(r.not_for_text || "")}</textarea>
            <div class="pev-sub" style="margin-top:4px">Worth writing well. It is what stops somebody filling in a form they should not.</div>
        </div>

        <div class="pev-field">
            <label><input type="checkbox" id="pevnVisible" ${r.is_patient_visible ? "checked" : ""}> Patients can raise this</label>
            ${!r.questionnaire || !r.questionnaire.red_flag_count
                ? `<div class="pev-flag" style="margin-top:6px">This cannot be switched on: its questionnaire has no red-flag screening.</div>` : ""}
        </div>

        <div class="pev-field">
            <label for="pevnHide">If not shown, why not</label>
            <input type="text" id="pevnHide" maxlength="255" value="${esc(r.hide_reason || "")}">
        </div>

        <div class="pev-field">
            <label for="pevnSeq">Order in the list</label>
            <input type="number" id="pevnSeq" value="${Number(r.sequence || 0)}" min="0" max="9999" style="max-width:120px">
        </div>

        <div class="pev-bar" style="margin:16px 0 0">
            <button type="button" class="pev-btn primary" id="pevnSave">Save</button>
            <button type="button" class="pev-btn" id="pevnCancel">Cancel</button>
        </div>
    </div>`;

    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelector("#pevnCancel").onclick = close;

    wrap.querySelector("#pevnSave").onclick = async () => {
        const res = await api("/portal-evisit-reasons", "POST", {
            id: r.id,
            patient_label: wrap.querySelector("#pevnLabel").value.trim(),
            patient_blurb: wrap.querySelector("#pevnBlurb").value.trim(),
            not_for_text: wrap.querySelector("#pevnNotFor").value.trim(),
            is_patient_visible: wrap.querySelector("#pevnVisible").checked ? 1 : 0,
            hide_reason: wrap.querySelector("#pevnHide").value.trim(),
            sequence: Number(wrap.querySelector("#pevnSeq").value || 0),
        }).catch(() => null);

        if (!res?.success) {
            showToast(res?.message || "That did not work.", "error");
            return;
        }

        showToast(res.message, "success");
        close();
        loadReasons();
    };
}
