import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * The patient's own health record (tab "portal_chart").
 *
 * Phase M19. Three things on one screen: what patients have told us is wrong,
 * the wording every patient reads above each list, and a preview of exactly what
 * one patient sees.
 *
 * THE THING TO UNDERSTAND BEFORE CHANGING ANYTHING HERE
 *
 * These lists carry `verification_status`, and two of its four values mean the
 * OPPOSITE of the row's own content. `Refuted` means a clinician decided the
 * patient does not have this. `Entered in Error` means the row should not exist.
 * Neither is ever sent to a patient, whatever the settings say -- that is not a
 * preference, it is the safety rule of this phase, and the Preview tab is here
 * so you can see it holding rather than take it on trust.
 *
 * ACCEPTING A CORRECTION DOES NOT EDIT THE CHART.
 *
 * It records that you agreed. The change itself is made on the staff screen for
 * that list, by somebody qualified to make it, with the normal checks. There is
 * deliberately no path from this screen into patient_allergies -- a portal
 * endpoint that edited a clinical record because a patient asked it to would be
 * the most dangerous thing in this codebase.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let sections = null;
let tab = "queue";
let status = "pending";

export function PortalChartView() {
    return `
<style>
.pch { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pch h1 { margin: 0; font-size: 22px; }
.pch .pch-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 84ch; line-height: 1.5; }
.pch input, .pch select, .pch textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pch textarea { min-height: 62px; resize: vertical; }
.pch-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pch-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pch-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pch-btn.danger { border-color: #fecaca; color: #991b1b; }
.pch-btn:disabled { opacity: .55; cursor: default; }
.pch-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pch-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border-color); margin-bottom: 14px; }
.pch-tabs button { border: 0; background: none; color: var(--text-muted); font: inherit; font-weight: 600; font-size: 13px; padding: 8px 12px; cursor: pointer; border-bottom: 2px solid transparent; }
.pch-tabs button[aria-selected="true"] { color: var(--text-primary); border-bottom-color: #15803d; }
.pch-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pch-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pch-table th, .pch-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pch-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pch-table tr:last-child td { border-bottom: 0; }
.pch-sub { color: var(--text-muted); font-size: 12px; }
.pch-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.pch-pill.pending { background: #dbeafe; color: #1e40af; }
.pch-pill.accepted { background: #dcfce7; color: #166534; }
.pch-pill.declined { background: #fee2e2; color: #991b1b; }
.pch-pill.withdrawn { background: var(--bg-surface-alt); color: var(--text-muted); }
.pch-pill.unconfirmed { background: #fffbeb; color: #92400e; }
.pch-pill.confirmed { background: #dcfce7; color: #166534; }
.pch-note { border: 1px solid var(--border-color); background: var(--bg-surface-alt); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 12.5px; line-height: 1.55; max-width: 94ch; }
.pch-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 10px; padding: 9px 12px; margin-bottom: 12px; font-size: 12.5px; }
.pch-says { background: var(--bg-surface-alt); border-left: 3px solid #cbd5e1; padding: 7px 10px; border-radius: 0 8px 8px 0; margin-top: 5px; font-size: 12.5px; max-width: 48ch; }
.pch-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, .5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1200; }
.pch-sheet { background: var(--bg-surface); border-radius: 14px; border: 1px solid var(--border-color); width: min(720px, 100%); max-height: 90vh; overflow: auto; padding: 20px 22px; }
.pch-sheet h2 { margin: 0 0 4px; font-size: 18px; }
.pch-field { margin-top: 12px; }
.pch-field label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
.pch-field input, .pch-field select, .pch-field textarea { width: 100%; }
.pch-sect { border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; background: var(--bg-surface); }
.pch-sect h3 { margin: 0 0 2px; font-size: 14.5px; }
.pch-sect .pch-code { font-size: 11px; color: var(--text-muted); font-family: ui-monospace, Menlo, monospace; }
.pch-prev-sect { border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; background: var(--bg-surface); }
.pch-prev-item { border-top: 1px solid var(--border-color); padding: 9px 0; }
.pch-prev-item:first-of-type { border-top: 0; }
.pch-off { opacity: .55; }
</style>
<div class="pch">
    <h1>Patient health record</h1>
    <p class="pch-intro">
        What patients can see of their own record — allergies, conditions, medicines,
        operations, implants and vaccinations — what they have told us is wrong, and the
        wording they read above each list.
    </p>
    <div id="pchBody"><div class="pch-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalChart() {
    await load();
}

async function load(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("status", status);

    const res = await api(`/portal-chart-corrections?${params.toString()}`).catch(() => null);
    const body = $("pchBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pch-sub" style="padding:24px;text-align:center">Could not load this. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

async function loadSections() {
    const res = await api("/portal-chart-sections").catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "Could not load the sections.", "error");
        return;
    }

    sections = res.data;
    render();
}

function render(q = "") {
    const body = $("pchBody");
    const s = data.settings;
    const c = data.counts || {};

    body.innerHTML = `
        ${!s.allow ? `<div class="pch-warn">The health record is switched off for patients in settings. Nothing below is visible to anyone.</div>` : ""}
        ${!s.allow_corrections ? `<div class="pch-warn">Patients can read their record but cannot tell you when something is wrong. The queue below is history.</div>` : ""}
        ${!s.show_unconfirmed ? `<div class="pch-warn">Unconfirmed items are hidden from patients. They see only what has been confirmed, which is a shorter and more certain record — and you will get fewer corrections, because unconfirmed items are what patients notice.</div>` : ""}
        <div class="pch-note">
            <strong>Items marked Refuted or Entered in Error are never shown to a patient</strong>, whatever these
            settings say. Refuted means somebody decided the patient does not have it; Entered in Error means the
            row should not exist. Showing either would tell a patient they have something that was ruled out.
            The Preview tab shows you exactly what one patient sees.
            <div style="margin-top:6px">
                Staff comments on these records are never sent either. They are written for colleagues, not for
                the person they describe.
            </div>
        </div>
        <div class="pch-tabs" role="tablist">
            <button type="button" role="tab" id="pchTabQueue" aria-selected="${tab === "queue"}">What patients say is wrong (${c.pending || 0})</button>
            <button type="button" role="tab" id="pchTabSections" aria-selected="${tab === "sections"}">What patients are shown</button>
            <button type="button" role="tab" id="pchTabPreview" aria-selected="${tab === "preview"}">Preview one patient</button>
        </div>
        <div id="pchPane">${
            tab === "queue" ? queueHtml(q)
            : tab === "sections" ? sectionsHtml()
            : previewHtml()
        }</div>`;

    $("pchTabQueue").onclick = () => { tab = "queue"; render(); };
    $("pchTabSections").onclick = () => { tab = "sections"; if (!sections) loadSections(); else render(); };
    $("pchTabPreview").onclick = () => { tab = "preview"; render(); };

    wire();
}

function queueHtml(q = "") {
    return `
        <div class="pch-bar">
            <input type="search" id="pchQ" value="${esc(q)}" placeholder="Patient name, number or item" aria-label="Find a correction" style="min-width:280px">
            <select id="pchStatus" aria-label="Which ones">
                <option value="pending"${status === "pending" ? " selected" : ""}>Waiting for an answer</option>
                <option value="accepted"${status === "accepted" ? " selected" : ""}>Agreed</option>
                <option value="declined"${status === "declined" ? " selected" : ""}>Declined</option>
                <option value="withdrawn"${status === "withdrawn" ? " selected" : ""}>Taken back</option>
                <option value="all"${status === "all" ? " selected" : ""}>Everything</option>
            </select>
        </div>
        <div class="pch-card">
            <table class="pch-table">
                <thead><tr>
                    <th>Patient</th><th>Item they mean</th><th>What they say</th>
                    <th>State</th><th>Raised</th><th></th>
                </tr></thead>
                <tbody>${data.items.length
                    ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="6" class="pch-sub" style="padding:22px;text-align:center">Nothing here.</td></tr>`}</tbody>
            </table>
        </div>`;
}

function rowHtml(r) {
    return `
    <tr>
        <td><strong>${esc(r.patient)}</strong><div class="pch-sub">${esc(r.patient_no || "")}</div></td>
        <td>
            <strong>${esc(r.item_label)}</strong>
            <div class="pch-sub">${esc(r.section_label)}</div>
            <div class="pch-sub">They ${esc(r.asks_text)}</div>
        </td>
        <td><div class="pch-says">${esc(r.says)}</div></td>
        <td>
            <span class="pch-pill ${esc(r.status)}">${esc(stateWord(r.status))}</span>
            ${r.response ? `<div class="pch-sub" style="margin-top:4px;max-width:34ch">“${esc(r.response)}”</div>` : ""}
        </td>
        <td class="pch-sub">${esc(String(r.raised_at || "").slice(0, 16))}</td>
        <td style="white-space:nowrap">
            <button type="button" class="pch-btn" data-preview="${r.patient_id}">See their record</button>
            ${r.status === "pending" && data.can_decide ? `<button type="button" class="pch-btn primary" data-decide="${r.id}">Answer</button>` : ""}
        </td>
    </tr>`;
}

function stateWord(s) {
    return { pending: "Waiting", accepted: "Agreed", declined: "Declined", withdrawn: "Taken back" }[s] || s;
}

function sectionsHtml() {
    if (!sections) {
        return `<div class="pch-sub" style="padding:24px;text-align:center">Loading…</div>`;
    }

    return `
        <div class="pch-note">
            This wording is what a patient reads above each list, and what they read when the list is empty.
            <strong>The empty wording matters more than it looks.</strong> "No allergies recorded" and "no
            allergies" are different statements and only one of them is true — a patient who reads an empty list
            as "I have none" may repeat it to the next clinician who asks.
            ${sections.can_edit === false ? "" : `<div style="margin-top:6px">It is stored as data, so it can be changed here without a deployment. It should be signed off by a clinician before the record is switched on.</div>`}
        </div>
        ${sections.items.map(sectionHtml).join("")}`;
}

function sectionHtml(s) {
    return `
    <div class="pch-sect ${s.is_enabled ? "" : "pch-off"}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div>
                <h3>${esc(s.label)}</h3>
                <div class="pch-code">${esc(s.code)}</div>
            </div>
            <div style="white-space:nowrap">
                ${s.is_enabled ? `<span class="pch-pill confirmed">Shown</span>` : `<span class="pch-pill withdrawn">Hidden</span>`}
                ${s.allow_corrections ? "" : `<span class="pch-pill unconfirmed">No corrections</span>`}
                <button type="button" class="pch-btn" data-section="${esc(s.code)}">Edit</button>
            </div>
        </div>
        <div class="pch-sub" style="margin-top:8px"><strong>Above the list:</strong> ${esc(s.blurb || "—")}</div>
        <div class="pch-sub" style="margin-top:4px"><strong>When it is empty:</strong> ${esc(s.empty_text || "—")}</div>
    </div>`;
}

function previewHtml() {
    return `
        <div class="pch-bar">
            <input type="search" id="pchPrevId" placeholder="Patient id" aria-label="Patient id" style="max-width:160px">
            <button type="button" class="pch-btn" id="pchPrevGo">Show me what they see</button>
            <span class="pch-sub">Or press “See their record” on any row in the queue.</span>
        </div>
        <div id="pchPreview"><div class="pch-sub" style="padding:18px">Nothing loaded yet.</div></div>`;
}

function wire() {
    const search = $("pchQ");
    if (search) {
        let timer = null;
        search.oninput = () => {
            clearTimeout(timer);
            timer = setTimeout(() => load(search.value.trim()), 300);
        };
    }

    const sel = $("pchStatus");
    if (sel) {
        sel.onchange = () => { status = sel.value; load($("pchQ")?.value.trim() || ""); };
    }

    const go = $("pchPrevGo");
    if (go) {
        go.onclick = () => {
            const id = Number($("pchPrevId")?.value);
            if (id > 0) showPreview(id);
            else showToast("Give me a patient id.", "error");
        };
    }

    const pane = $("pchPane");
    if (!pane) return;

    pane.querySelectorAll("[data-decide]").forEach((b) => {
        b.onclick = () => openDecide(Number(b.dataset.decide));
    });

    pane.querySelectorAll("[data-preview]").forEach((b) => {
        b.onclick = () => { tab = "preview"; render(); showPreview(Number(b.dataset.preview)); };
    });

    pane.querySelectorAll("[data-section]").forEach((b) => {
        b.onclick = () => openSection(b.dataset.section);
    });
}

function sheet(html) {
    const wrap = document.createElement("div");
    wrap.className = "pch-modal";
    wrap.innerHTML = `<div class="pch-sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();

    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelectorAll("[data-close]").forEach((b) => { b.onclick = close; });

    return { wrap, close };
}

function openDecide(id) {
    const row = (data.items || []).find((r) => r.id === id);
    if (!row) return;

    const { wrap, close } = sheet(`
        <h2>${esc(row.item_label)}</h2>
        <p class="pch-sub" style="margin:2px 0 0">
            ${esc(row.patient)} · ${esc(row.section_label)} · they ${esc(row.asks_text)}
        </p>
        <div class="pch-says" style="margin-top:12px;max-width:none">${esc(row.says)}</div>
        <div class="pch-note" style="margin-top:12px">
            <strong>Agreeing does not change the record.</strong> It records that you agree and tells the patient.
            Make the change itself on the patient's own ${esc(row.section_label.toLowerCase())} screen, where the
            normal checks apply.
        </div>
        <div class="pch-field">
            <label for="pchResponse">What the patient will read</label>
            <textarea id="pchResponse" maxlength="500" placeholder="Required if you are declining. They read this, so say why in words they will understand."></textarea>
        </div>
        <div id="pchDecideErr"></div>
        <div style="margin-top:16px;text-align:right">
            <button type="button" class="pch-btn" data-close>Cancel</button>
            <button type="button" class="pch-btn danger" id="pchDecline">Decline</button>
            <button type="button" class="pch-btn primary" id="pchAccept">Agree</button>
        </div>`);

    const send = async (decision) => {
        const response = wrap.querySelector("#pchResponse").value.trim();

        const res = await api("/portal-chart-corrections/decide", "POST", { id, decision, response }).catch(() => null);

        if (!res?.success) {
            // Shown in the sheet, not as a toast: declining without a reason is
            // the common case here and the fix is in the box they are looking at.
            wrap.querySelector("#pchDecideErr").innerHTML = `
                <div class="pch-warn" style="margin:12px 0 0">
                    ${esc(res?.message || "That did not work.")}
                    ${res?.errors?.response ? `<div style="margin-top:4px">${esc(res.errors.response)}</div>` : ""}
                </div>`;
            return;
        }

        showToast(res.message, "success");
        close();
        load($("pchQ")?.value.trim() || "");
    };

    wrap.querySelector("#pchAccept").onclick = () => send("accepted");
    wrap.querySelector("#pchDecline").onclick = () => send("declined");
}

function openSection(code) {
    const s = (sections?.items || []).find((x) => x.code === code);
    if (!s) return;

    const { wrap, close } = sheet(`
        <h2>${esc(s.label)}</h2>
        <p class="pch-sub" style="margin:2px 0 0">Every patient reads this wording. ${esc(s.code)}</p>
        <div class="pch-field">
            <label for="pchLabel">Heading</label>
            <input id="pchLabel" maxlength="80" value="${esc(s.label)}">
        </div>
        <div class="pch-field">
            <label for="pchBlurb">Above the list — say what it is, and what it is not</label>
            <textarea id="pchBlurb" maxlength="400">${esc(s.blurb || "")}</textarea>
        </div>
        <div class="pch-field">
            <label for="pchEmpty">When the list is empty — say nothing was written down, not that there is none</label>
            <textarea id="pchEmpty" maxlength="300">${esc(s.empty_text || "")}</textarea>
        </div>
        <div class="pch-field">
            <label><input type="checkbox" id="pchOn" ${s.is_enabled ? "checked" : ""} style="width:auto;margin-right:6px">Show this list to patients</label>
        </div>
        <div class="pch-field">
            <label><input type="checkbox" id="pchCorr" ${s.allow_corrections ? "checked" : ""} style="width:auto;margin-right:6px">Let patients say when something in it is wrong</label>
        </div>
        <div style="margin-top:16px;text-align:right">
            <button type="button" class="pch-btn" data-close>Cancel</button>
            <button type="button" class="pch-btn primary" id="pchSaveSection">Save</button>
        </div>`);

    wrap.querySelector("#pchSaveSection").onclick = async () => {
        const res = await api("/portal-chart-sections", "POST", {
            code,
            label: wrap.querySelector("#pchLabel").value.trim(),
            blurb: wrap.querySelector("#pchBlurb").value.trim(),
            empty_text: wrap.querySelector("#pchEmpty").value.trim(),
            is_enabled: wrap.querySelector("#pchOn").checked ? 1 : 0,
            allow_corrections: wrap.querySelector("#pchCorr").checked ? 1 : 0,
        }).catch(() => null);

        if (!res?.success) {
            showToast(res?.message || "That did not work.", "error");
            return;
        }

        showToast(res.message, "success");
        close();
        loadSections();
    };
}

async function showPreview(patientId) {
    const box = $("pchPreview");
    if (!box) return;

    box.innerHTML = `<div class="pch-sub" style="padding:18px">Loading…</div>`;

    const res = await api(`/portal-chart-corrections/preview?patient_id=${patientId}`).catch(() => null);

    if (!res?.success) {
        box.innerHTML = `<div class="pch-sub" style="padding:18px">Could not load that. ${esc(res?.message || "")}</div>`;
        return;
    }

    const chart = res.data;

    if (!chart.enabled) {
        box.innerHTML = `<div class="pch-warn">${esc(chart.message || "Switched off.")}</div>`;
        return;
    }

    box.innerHTML = `
        <div class="pch-note">
            This is exactly what patient #${patientId} sees — the same payload their app gets.
            Anything Refuted or Entered in Error is already gone from it.
        </div>
        ${chart.sections.map((s) => `
            <div class="pch-prev-sect">
                <h3 style="margin:0 0 2px;font-size:14.5px">${esc(s.label)}</h3>
                <div class="pch-sub">${esc(s.blurb || "")}</div>
                ${s.items.length ? s.items.map((i) => `
                    <div class="pch-prev-item">
                        <div>
                            <strong>${esc(i.title)}</strong>
                            <span class="pch-pill ${i.status === "confirmed" ? "confirmed" : "unconfirmed"}" style="margin-left:6px">
                                ${i.status === "confirmed" ? "Confirmed" : "Not confirmed"}
                            </span>
                            ${i.active === false ? `<span class="pch-pill withdrawn" style="margin-left:4px">Ended</span>` : ""}
                        </div>
                        ${i.detail ? `<div class="pch-sub" style="margin-top:3px">${esc(i.detail)}</div>` : ""}
                        <div class="pch-sub" style="margin-top:3px">${esc(i.since || i.when || "")}${i.until ? ` · ${esc(i.until)}` : ""}</div>
                        ${i.correction ? `<div class="pch-sub" style="margin-top:3px">⚑ They have told us about this one.</div>` : ""}
                    </div>`).join("")
                    : `<div class="pch-sub" style="margin-top:8px;font-style:italic">${esc(s.empty_text || "Nothing recorded.")}</div>`}
            </div>`).join("")}`;
}
