import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Insurance Requests (tab "portal_insurance_requests").
 *
 * Patients asking for the cover on file to be added, corrected or removed
 * (Phase M12). A request is a request: nothing reaches patient_insurances until
 * somebody here applies it, and applying performs the insert, update or removal
 * server-side so the desk does not retype a policy number out of a paragraph.
 *
 * Each row shows the current values beside the proposed ones, because that
 * comparison is the whole job — and a changed digit in a policy number is easy
 * to miss when the two are not side by side.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let status = "pending";

const ACTION_LABELS = { add: "Add cover", update: "Correct cover", remove: "Remove cover" };

export function PortalInsuranceRequestsView() {
    return `
<style>
.pir { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pir h1 { margin: 0; font-size: 22px; }
.pir .pir-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pir input { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pir-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pir-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pir-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pir-btn.danger { background: var(--bg-surface); border-color: #fecaca; color: #b91c1c; }
.pir-btn.on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pir-btn:disabled { opacity: .55; cursor: default; }
.pir-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pir-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pir-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pir-table th, .pir-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pir-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pir-table tr:last-child td { border-bottom: 0; }
.pir-sub { color: var(--text-muted); font-size: 12px; }
.pir-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
.pir-pill.pending { background: #fffbeb; color: #92400e; }
.pir-pill.applied { background: #dcfce7; color: #166534; }
.pir-pill.declined { background: #fee2e2; color: #991b1b; }
.pir-act { display: inline-block; border: 1px solid var(--border-color); border-radius: 999px; padding: 0 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); }
.pir-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pir-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pir-counts b { font-size: 18px; margin-right: 4px; }
.pir-diff { display: grid; grid-template-columns: auto 1fr 1fr; gap: 2px 10px; align-items: baseline; }
.pir-diff .k { color: var(--text-muted); font-size: 11.5px; white-space: nowrap; }
.pir-diff .was { color: var(--text-muted); text-decoration: line-through; }
.pir-diff .now { font-weight: 700; }
.pir-diff .same { color: var(--text-muted); }
.pir-rejectrow { display: flex; gap: 8px; margin-top: 7px; }
.pir-rejectrow input { flex: 1 1 190px; }
.pir-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 8px; padding: 9px 11px; margin-bottom: 12px; font-size: 12.5px; line-height: 1.5; }
</style>
<div class="pir">
    <h1>Insurance requests</h1>
    <p class="pir-intro">Patients asking for the cover on their record to be added, corrected or removed. Nothing here has
        changed their record yet — applying a request is what writes it. Check the card against what they have typed before
        you apply, and if you decline, say why: the patient reads that reason.</p>
    <div id="pirBody"><div class="pir-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalInsuranceRequests() {
    await load();
}

async function load(q = "") {
    const params = new URLSearchParams({ status });
    if (q) params.set("q", q);

    const res = await api(`/portal-insurance-requests?${params.toString()}`).catch(() => null);
    const body = $("pirBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pir-sub" style="padding:24px;text-align:center">Could not load the requests. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pirBody");

    body.innerHTML = `
        <div class="pir-counts">
            <div><b>${data.counts.pending}</b>waiting</div>
            <div><b>${data.counts.applied}</b>applied</div>
            <div><b>${data.counts.declined}</b>declined</div>
        </div>
        ${!data.can_decide ? `<div class="pir-warn">You can see these requests but not apply them. Reception and admin decide insurance changes.</div>` : ""}
        <div class="pir-bar">
            ${["pending", "applied", "declined", "all"].map((s) =>
                `<button type="button" class="pir-btn ${s === status ? "on" : ""}" data-status="${s}">${s[0].toUpperCase()}${s.slice(1)}</button>`
            ).join("")}
            <input type="search" id="pirQ" value="${esc(q)}" placeholder="Patient name, number or policy number" aria-label="Find a request" style="min-width:260px">
        </div>
        <div class="pir-card">
            <table class="pir-table">
                <thead><tr><th>Patient</th><th>Asking for</th><th>What changes</th><th>Sent</th><th>Status</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="6" class="pir-sub" style="padding:22px;text-align:center">Nothing ${status === "all" ? "here" : `is ${esc(status)}`}.</td></tr>`}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-status]").forEach((b) => {
        b.onclick = () => {
            status = b.dataset.status;
            load($("pirQ")?.value.trim() || "");
        };
    });

    const search = $("pirQ");
    let t = null;
    search.oninput = (e) => {
        clearTimeout(t);
        const v = e.target.value;
        t = setTimeout(() => load(v.trim()), 350);
    };

    if (data.can_decide) {
        body.querySelectorAll("[data-apply]").forEach((b) => {
            b.onclick = () => decide(Number(b.dataset.apply), "apply", "", b);
        });
        body.querySelectorAll("[data-decline]").forEach((b) => {
            b.onclick = () => {
                const id = Number(b.dataset.decline);
                const note = $(`pirNote_${id}`)?.value.trim() || "";
                if (note === "") {
                    showToast("Say why, so the patient knows what to do next.", "error", 5000);
                    $(`pirNote_${id}`)?.focus();
                    return;
                }
                decide(id, "decline", note, b);
            };
        });
    }
}

/** One field, old beside new, so a changed digit is visible. */
function diffRow(label, was, now) {
    const w = was ?? "";
    const n = now ?? "";

    if (w === "" && n === "") return "";

    if (w !== "" && n !== "" && String(w) === String(n)) {
        return `<div class="k">${esc(label)}</div><div class="same" style="grid-column:2/4">${esc(n)} <span class="pir-sub">(unchanged)</span></div>`;
    }

    return `<div class="k">${esc(label)}</div>
        <div class="was">${w === "" ? "—" : esc(w)}</div>
        <div class="now">${n === "" ? "—" : esc(n)}</div>`;
}

function rowHtml(r) {
    const isRemove = r.action === "remove";

    const diff = isRemove
        ? `<div class="pir-sub">Asking for this cover to be taken off:</div>
           <div style="margin-top:3px"><strong>${esc(r.current_insurer || "—")}</strong>
           ${r.current_policy_number ? ` · ${esc(r.current_policy_number)}` : ""}
           ${r.current_type ? ` · ${esc(r.current_type)}` : ""}</div>`
        : `<div class="pir-diff">
               ${diffRow("Insurer", r.current_insurer, r.insurer_shown)}
               ${diffRow("Policy no.", r.current_policy_number, r.policy_number)}
               ${diffRow("Group no.", r.current_group_number, r.group_number)}
               ${diffRow("Type", r.current_type, r.insurance_type)}
               ${diffRow("Subscriber", null, r.subscriber_name)}
               ${diffRow("Starts", null, r.effective_date)}
           </div>
           ${!r.insurance_id && r.insurer_name_text ? `<div class="pir-warn" style="margin:7px 0 0">
               The insurer “${esc(r.insurer_name_text)}” is not in the list, so this cannot be applied as it stands.
               Add that insurer first, or enter the cover by hand and decline this with a note.
           </div>` : ""}`;

    return `<tr>
        <td>${esc(r.patient_name || "—")}<div class="pir-sub">${esc(r.patient_no || "")}</div></td>
        <td><span class="pir-act">${esc(ACTION_LABELS[r.action] || r.action)}</span>
            ${r.upload_id ? `<div class="pir-sub" style="margin-top:3px">Card photo sent — see Patient Uploads</div>` : ""}
            ${r.note ? `<div style="margin-top:4px">“${esc(r.note)}”</div>` : ""}</td>
        <td>${diff}</td>
        <td class="pir-sub">${esc(String(r.created_at || "").slice(0, 16))}</td>
        <td><span class="pir-pill ${esc(r.status)}">${esc(r.status)}</span>
            ${r.review_note ? `<div class="pir-sub" style="margin-top:3px">${esc(r.review_note)}</div>` : ""}
            ${r.reviewed_at ? `<div class="pir-sub">${esc(String(r.reviewed_at).slice(0, 16))}</div>` : ""}</td>
        <td style="text-align:right;white-space:nowrap">
            ${r.status === "pending" && data.can_decide ? `
                <button type="button" class="pir-btn primary" data-apply="${r.id}">Apply to record</button>
                <div class="pir-rejectrow">
                    <input type="text" id="pirNote_${r.id}" placeholder="Reason, which the patient reads" maxlength="255">
                    <button type="button" class="pir-btn danger" data-decline="${r.id}">Decline</button>
                </div>` : ""}
            ${r.status === "applied" && r.applied_insurance_id ? `<span class="pir-sub">Cover #${r.applied_insurance_id}</span>` : ""}
        </td>
    </tr>`;
}

async function decide(id, decision, note, btn) {
    btn.disabled = true;

    const res = await api("/portal-insurance-requests/review", {
        method: "POST",
        body: JSON.stringify({ id, decision, note })
    }).catch(() => null);

    btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Could not save that decision.", "error", 7000);
        return;
    }

    showToast(res.message, "success", 5000);
    await load($("pirQ")?.value.trim() || "");
}
