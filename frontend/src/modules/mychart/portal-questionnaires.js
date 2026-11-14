import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Questionnaires between visits (tab "portal_questionnaires").
 *
 * Phase M13. Send a questionnaire to a patient with a due date, and read what
 * comes back. Two kinds go out: the plain follow-up questionnaires, whose
 * answers are read as words, and the scored instruments (PHQ-9, GAD-7), whose
 * score is computed by the same code the clinical screens use.
 *
 * Anything that crossed the instrument's band is at the top of the list and
 * carries a flag, because it has already raised a real alert to the care team —
 * this screen is not the only place it surfaced, and it must not read as though
 * it were.
 *
 * The patient never sees a score. Nothing here should be phrased as though they
 * had been told one.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let status = "answered";
let picked = null;          // the patient chosen in the send panel
let sendOpen = false;

const TABS = [
    ["answered", "Answered"],
    ["pending", "Waiting"],
    ["overdue", "Overdue"],
    ["flagged", "Flagged"],
    ["reviewed", "Read"],
    ["all", "All"],
];

export function PortalQuestionnairesView() {
    return `
<style>
.pqs { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pqs h1 { margin: 0; font-size: 22px; }
.pqs .pqs-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pqs input, .pqs select, .pqs textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pqs textarea { min-height: 62px; resize: vertical; }
.pqs-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pqs-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pqs-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pqs-btn.danger { background: var(--bg-surface); border-color: #fecaca; color: #b91c1c; }
.pqs-btn.on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pqs-btn:disabled { opacity: .55; cursor: default; }
.pqs-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pqs-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pqs-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pqs-table th, .pqs-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pqs-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pqs-table tr:last-child td { border-bottom: 0; }
.pqs-sub { color: var(--text-muted); font-size: 12px; }
.pqs-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
.pqs-pill.pending { background: #eff6ff; color: #1e40af; }
.pqs-pill.completed { background: #dcfce7; color: #166534; }
.pqs-pill.cancelled { background: var(--bg-surface-alt); color: var(--text-muted); }
.pqs-pill.overdue { background: #fffbeb; color: #92400e; }
.pqs-pill.flag { background: #fee2e2; color: #991b1b; }
.pqs-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pqs-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pqs-counts b { font-size: 18px; margin-right: 4px; }
.pqs-send { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
.pqs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px 12px; align-items: start; }
.pqs-grid label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 3px; font-weight: 600; }
.pqs-grid input, .pqs-grid select, .pqs-grid textarea { width: 100%; }
.pqs-wide { grid-column: 1 / -1; }
.pqs-results { border: 1px solid var(--border-color); border-radius: 8px; margin-top: 4px; max-height: 190px; overflow-y: auto; background: var(--bg-surface); }
.pqs-results button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--border-color); background: none; color: var(--text-primary); font: inherit; font-size: 12.5px; padding: 7px 10px; cursor: pointer; }
.pqs-results button:last-child { border-bottom: 0; }
.pqs-results button:hover, .pqs-results button:focus-visible { background: var(--bg-surface-alt); }
.pqs-chosen { display: inline-flex; gap: 8px; align-items: baseline; border: 1px solid var(--border-color); border-radius: 999px; padding: 4px 6px 4px 12px; background: var(--bg-surface-alt); }
.pqs-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 8px; padding: 9px 11px; margin-bottom: 12px; font-size: 12.5px; line-height: 1.5; }
.pqs-note { border: 1px solid var(--border-color); background: var(--bg-surface-alt); border-radius: 8px; padding: 9px 11px; margin: 10px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--text-muted); }
.pqs-score { font-weight: 800; font-size: 15px; }
.pqs-answers { margin: 0; }
.pqs-answers dt { font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.pqs-answers dd { margin: 1px 0 0; font-weight: 600; }
.pqs-hist { display: grid; grid-template-columns: auto auto 1fr; gap: 2px 10px; font-size: 12px; margin-top: 6px; }
.pqs-hist .s { color: var(--text-muted); }
.pqs-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, .5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 60; }
.pqs-sheet { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 14px; max-width: 640px; width: 100%; max-height: 86vh; overflow-y: auto; padding: 18px 20px 20px; }
.pqs-sheet h2 { margin: 0 0 2px; font-size: 18px; }
</style>
<div class="pqs">
    <h1>Questionnaires</h1>
    <p class="pqs-intro">Questionnaires sent to patients to answer at home between visits. PHQ-9 and GAD-7 are scored here
        the same way they are scored at a visit, and a score that crosses the instrument&rsquo;s band has already raised an
        alert to the patient&rsquo;s care team — those rows are at the top and marked. Patients are never shown a score.</p>
    <div id="pqsBody"><div class="pqs-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalQuestionnaires() {
    await load();
}

async function load(q = "") {
    const params = new URLSearchParams({ status });
    if (q) params.set("q", q);

    const res = await api(`/portal-questionnaires?${params.toString()}`).catch(() => null);
    const body = $("pqsBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pqs-sub" style="padding:24px;text-align:center">Could not load the questionnaires. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pqsBody");

    body.innerHTML = `
        <div class="pqs-counts">
            <div><b>${data.counts.answered}</b>to read</div>
            <div><b>${data.counts.pending}</b>waiting on patients</div>
            <div><b>${data.counts.overdue}</b>overdue</div>
            <div><b>${data.counts.flagged}</b>flagged</div>
        </div>
        ${data.can_assign
            ? `<button type="button" class="pqs-btn primary" id="pqsToggleSend">${sendOpen ? "Close" : "Send a questionnaire"}</button>
               <div id="pqsSendWrap" style="margin-top:12px">${sendOpen ? sendPanel() : ""}</div>`
            : `<div class="pqs-warn">You can read what patients have answered but not send questionnaires out. Doctors, clinicians and nurses send them.</div>`}
        <div class="pqs-bar" style="margin-top:14px">
            ${TABS.map(([s, label]) => `<button type="button" class="pqs-btn ${s === status ? "on" : ""}" data-status="${s}">${label}</button>`).join("")}
            <input type="search" id="pqsQ" value="${esc(q)}" placeholder="Patient name, number or questionnaire" aria-label="Find a questionnaire" style="min-width:260px">
        </div>
        <div class="pqs-card">
            <table class="pqs-table">
                <thead><tr><th>Patient</th><th>Questionnaire</th><th>Sent / due</th><th>Where it is</th><th>Result</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="6" class="pqs-sub" style="padding:22px;text-align:center">Nothing here.</td></tr>`}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-status]").forEach((b) => {
        b.onclick = () => {
            status = b.dataset.status;
            load($("pqsQ")?.value.trim() || "");
        };
    });

    const search = $("pqsQ");
    let t = null;
    search.oninput = (e) => {
        clearTimeout(t);
        const v = e.target.value;
        t = setTimeout(() => load(v.trim()), 350);
    };

    const toggle = $("pqsToggleSend");
    if (toggle) {
        toggle.onclick = () => {
            sendOpen = !sendOpen;
            render($("pqsQ")?.value.trim() || "");
        };
    }

    if (sendOpen) wireSendPanel();

    body.querySelectorAll("[data-show]").forEach((b) => {
        b.onclick = () => openOne(Number(b.dataset.show));
    });

    body.querySelectorAll("[data-read]").forEach((b) => {
        b.onclick = () => markRead(Number(b.dataset.read), b);
    });

    body.querySelectorAll("[data-cancel]").forEach((b) => {
        b.onclick = () => takeBack(Number(b.dataset.cancel), b);
    });
}

// ------------------------------------------------------------------ sending
function sendPanel() {
    const options = (data.catalogue || [])
        .map((c) => `<option value="${esc(c.value)}">${esc(c.label)}${c.scored ? " — scored" : ""} (${c.question_count} questions)</option>`)
        .join("");

    const scored = (data.catalogue || []).filter((c) => c.scored);

    return `
    <div class="pqs-send">
        <div class="pqs-grid">
            <div class="pqs-wide">
                <label for="pqsPatient">Patient</label>
                ${picked
                    ? `<span class="pqs-chosen"><strong>${esc(picked.name)}</strong>
                        <span class="pqs-sub">${esc(picked.mrn || "")}</span>
                        <button type="button" class="pqs-btn" id="pqsClearPatient" style="padding:2px 9px">Change</button></span>`
                    : `<input type="search" id="pqsPatient" placeholder="Name or hospital number — type at least two characters" autocomplete="off">
                       <div id="pqsPatientResults"></div>`}
            </div>
            <div>
                <label for="pqsWhat">What to send</label>
                <select id="pqsWhat">${options || `<option value="">Nothing is available to send</option>`}</select>
            </div>
            <div>
                <label for="pqsDue">Answer by</label>
                <input type="date" id="pqsDue" min="${new Date().toISOString().slice(0, 10)}">
            </div>
            <div class="pqs-wide">
                <label for="pqsReason">Why you are sending it — the patient reads this</label>
                <textarea id="pqsReason" maxlength="500" placeholder="For example: so we can see how the wound is healing before your review on the 20th."></textarea>
            </div>
        </div>
        ${scored.length ? `<p class="pqs-note">${scored.map((c) =>
            `<strong>${esc(c.label)}</strong> alerts the care team at ${c.alerts_at} of ${c.max}${c.instrument === "phq9" ? ", and on any positive answer to item 9 whatever the total" : ""}.`
        ).join(" ")} The patient is told their team was notified, not what the score was.</p>` : ""}
        <div class="pqs-bar" style="margin:12px 0 0">
            <button type="button" class="pqs-btn primary" id="pqsSend">Send it</button>
            <span class="pqs-sub">It goes into their To-Do list, and they are notified on the channels they allow.</span>
        </div>
    </div>`;
}

function wireSendPanel() {
    const clear = $("pqsClearPatient");
    if (clear) {
        clear.onclick = () => {
            picked = null;
            render($("pqsQ")?.value.trim() || "");
        };
    }

    const input = $("pqsPatient");
    if (input) {
        let t = null;
        input.oninput = (e) => {
            clearTimeout(t);
            const v = e.target.value.trim();
            t = setTimeout(() => findPatients(v), 300);
        };
    }

    const send = $("pqsSend");
    if (send) send.onclick = () => doSend(send);
}

async function findPatients(q) {
    const box = $("pqsPatientResults");
    if (!box) return;

    if (q.length < 2) {
        box.innerHTML = "";
        return;
    }

    const res = await api(`/portal-questionnaires/patients?q=${encodeURIComponent(q)}`).catch(() => null);

    if (!res?.success) {
        box.innerHTML = `<div class="pqs-sub" style="padding:6px 2px">Could not search just now.</div>`;
        return;
    }

    const items = res.data.items || [];

    if (!items.length) {
        box.innerHTML = `<div class="pqs-sub" style="padding:6px 2px">Nobody matches that.</div>`;
        return;
    }

    box.innerHTML = `<div class="pqs-results">${items.map((p) =>
        `<button type="button" data-pid="${p.id}" data-pname="${esc(p.name)}" data-pmrn="${esc(p.mrn || "")}">
            <strong>${esc(p.name)}</strong> <span class="pqs-sub">${esc(p.mrn || "")}${p.dob ? ` · born ${esc(p.dob)}` : ""}</span>
        </button>`).join("")}</div>`;

    box.querySelectorAll("[data-pid]").forEach((b) => {
        b.onclick = () => {
            picked = { id: Number(b.dataset.pid), name: b.dataset.pname, mrn: b.dataset.pmrn };
            render($("pqsQ")?.value.trim() || "");
        };
    });
}

async function doSend(btn) {
    if (!picked) {
        showToast("Choose a patient first.", "error", 4000);
        return;
    }

    const what = $("pqsWhat")?.value || "";

    if (!what) {
        showToast("Choose what to send.", "error", 4000);
        return;
    }

    const [kind, value] = what.split(":");
    const payload = {
        patient_id: picked.id,
        instrument: kind === "instrument" ? value : "questionnaire",
        questionnaire_id: kind === "questionnaire" ? Number(value) : null,
        due_date: $("pqsDue")?.value || "",
        reason: $("pqsReason")?.value.trim() || "",
    };

    btn.disabled = true;
    const res = await api("/portal-questionnaires/assign", { method: "POST", body: JSON.stringify(payload) }).catch(() => null);
    btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Could not send that.", "error", 7000);
        return;
    }

    showToast(res.message, "success", 5000);
    picked = null;
    sendOpen = false;
    status = "pending";
    await load();
}

// ------------------------------------------------------------------ the list
function rowHtml(r) {
    const overdue = r.status === "pending" && r.due_date && r.due_date < new Date().toISOString().slice(0, 10);

    const where = r.status === "completed"
        ? `<span class="pqs-pill completed">Answered</span>
           <div class="pqs-sub">${esc(String(r.completed_at || "").slice(0, 16))}</div>
           ${r.reviewed_at ? `<div class="pqs-sub">Read by ${esc(r.reviewed_by || "someone")}</div>` : ""}`
        : r.status === "cancelled"
            ? `<span class="pqs-pill cancelled">Taken back</span>
               ${r.cancel_reason ? `<div class="pqs-sub">${esc(r.cancel_reason)}</div>` : ""}`
            : `<span class="pqs-pill ${overdue ? "overdue" : "pending"}">${overdue ? "Overdue" : "Waiting"}</span>
               <div class="pqs-sub">${r.opened ? "Opened, not finished" : "Not opened yet"}</div>`;

    const result = r.scored && r.score !== null
        ? `<div class="pqs-score">${r.score}</div>
           <div class="pqs-sub">${esc(r.severity || "")}</div>
           ${r.flagged ? `<div style="margin-top:3px"><span class="pqs-pill flag">Care team alerted</span></div>` : ""}`
        : r.status === "completed"
            ? `<span class="pqs-sub">Answers to read</span>`
            : `<span class="pqs-sub">—</span>`;

    return `<tr>
        <td>${esc(r.patient.name || "—")}<div class="pqs-sub">${esc(r.patient.mrn || "")}</div></td>
        <td>${esc(r.title)}
            ${r.scored ? `<div class="pqs-sub">${esc(r.instrument.toUpperCase())} · scored</div>` : ""}
            ${r.reason ? `<div class="pqs-sub" style="margin-top:3px">“${esc(r.reason)}”</div>` : ""}</td>
        <td class="pqs-sub">${esc(String(r.assigned_at || "").slice(0, 10))}
            ${r.due_date ? `<div>by ${esc(r.due_date)}</div>` : `<div>no date</div>`}
            ${r.assigned_by ? `<div>${esc(r.assigned_by)}</div>` : ""}</td>
        <td>${where}</td>
        <td>${result}</td>
        <td style="text-align:right;white-space:nowrap">
            ${r.status === "completed" ? `<button type="button" class="pqs-btn" data-show="${r.id}">Read answers</button>` : ""}
            ${r.status === "completed" && !r.reviewed_at ? `<button type="button" class="pqs-btn" data-read="${r.id}">Mark read</button>` : ""}
            ${r.status === "pending" && data.can_assign ? `<button type="button" class="pqs-btn danger" data-cancel="${r.id}">Take back</button>` : ""}
        </td>
    </tr>`;
}

async function markRead(id, btn) {
    btn.disabled = true;
    const res = await api("/portal-questionnaires/reviewed", { method: "POST", body: JSON.stringify({ id }) }).catch(() => null);
    btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Could not mark that as read.", "error", 6000);
        return;
    }

    showToast(res.message, "success", 4000);
    await load($("pqsQ")?.value.trim() || "");
}

async function takeBack(id, btn) {
    const reason = window.prompt("Taking this back removes it from the patient's list. Why? (optional, for the record)");

    if (reason === null) return;

    btn.disabled = true;
    const res = await api("/portal-questionnaires/cancel", { method: "POST", body: JSON.stringify({ id, reason }) }).catch(() => null);
    btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Could not take that back.", "error", 6000);
        return;
    }

    showToast(res.message, "success", 4000);
    await load($("pqsQ")?.value.trim() || "");
}

// ------------------------------------------------------------------ one answer
async function openOne(id) {
    const res = await api(`/portal-questionnaires/show?id=${id}`).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "Could not open that.", "error", 6000);
        return;
    }

    const r = res.data;

    const wrap = document.createElement("div");
    wrap.className = "pqs-modal";
    wrap.innerHTML = `
    <div class="pqs-sheet" role="dialog" aria-modal="true" aria-label="${esc(r.title)}">
        <h2>${esc(r.title)}</h2>
        <div class="pqs-sub">${esc(r.patient.name)} · ${esc(r.patient.mrn || "")} · answered ${esc(String(r.completed_at || "").slice(0, 16))}</div>
        ${r.reason ? `<p class="pqs-note">Sent because: ${esc(r.reason)}</p>` : ""}
        ${r.scored && r.score !== null ? `
            <p class="pqs-note">
                <strong>${esc(r.instrument.toUpperCase())} ${r.score} of ${r.max_score}</strong> — ${esc(r.severity || "")}.
                Answered at home, self-reported.
                ${r.alert_id ? ` The care team was alerted on ${esc(String(r.alerted_at || "").slice(0, 16))}.` : ""}
            </p>` : ""}
        <dl class="pqs-answers">
            ${r.items.length ? r.items.map((i) =>
                `<dt>${esc(i.label)}</dt><dd>${esc(i.answer)}${i.points !== null ? ` <span class="pqs-sub">(${i.points})</span>` : ""}</dd>`
            ).join("") : `<dd class="pqs-sub">Nothing was answered.</dd>`}
        </dl>
        ${r.unanswered.length ? `<p class="pqs-sub" style="margin-top:12px">Left blank: ${r.unanswered.map(esc).join("; ")}.</p>` : ""}
        ${r.history.length > 1 ? `
            <h3 style="margin:16px 0 0;font-size:14px">Scores over time</h3>
            <div class="pqs-hist">
                ${r.history.map((h) => `<div><strong>${h.score}</strong></div><div class="s">${esc(String(h.at || "").slice(0, 10))}</div><div class="s">${esc(h.source_text)}${h.severity ? ` — ${esc(h.severity)}` : ""}</div>`).join("")}
            </div>` : ""}
        <div class="pqs-bar" style="margin:16px 0 0">
            <button type="button" class="pqs-btn" id="pqsClose">Close</button>
            ${!r.reviewed_at ? `<button type="button" class="pqs-btn primary" id="pqsReadHere">Mark read</button>` : `<span class="pqs-sub">Already marked read.</span>`}
        </div>
    </div>`;

    const close = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelector("#pqsClose").onclick = close;

    const readHere = wrap.querySelector("#pqsReadHere");
    if (readHere) {
        readHere.onclick = async () => {
            readHere.disabled = true;
            const out = await api("/portal-questionnaires/reviewed", { method: "POST", body: JSON.stringify({ id }) }).catch(() => null);

            if (!out?.success) {
                readHere.disabled = false;
                showToast(out?.message || "Could not mark that as read.", "error", 6000);
                return;
            }

            close();
            showToast(out.message, "success", 4000);
            await load($("pqsQ")?.value.trim() || "");
        };
    }

    document.body.appendChild(wrap);
}
