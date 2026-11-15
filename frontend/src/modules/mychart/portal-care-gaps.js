import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Health maintenance (tab "portal_care_gaps").
 *
 * Phase M14. Two things in one screen, because they are two halves of the same
 * job:
 *
 *   Requests   what patients have asked about something they are due for.
 *              "Please arrange this" is a note to book it; "I had this done"
 *              is a claim, and accepting it writes a real completed action
 *              against the reminder, which is what closes it.
 *
 *   Items      the per-rule decision: what a patient is told it is called, how
 *              often it comes round, and whether it is shown at all. This
 *              exists because item_label is clinical text and because most
 *              seeded rules carry no demographic criteria, so the rules engine
 *              matches every patient for the diabetes and administrative ones.
 *
 * The Items tab shows all three switches side by side and says plainly whether
 * an item actually reaches patients, because three switches are easy to get
 * wrong one at a time.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let itemsData = null;
let tab = "requests";
let status = "pending";

const ACTION_LABELS = { book: "Please arrange it", report_done: "Says it is done" };

export function PortalCareGapsView() {
    return `
<style>
.pcg { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pcg h1 { margin: 0; font-size: 22px; }
.pcg .pcg-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pcg input, .pcg select, .pcg textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pcg textarea { min-height: 58px; resize: vertical; }
.pcg-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pcg-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pcg-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pcg-btn.danger { background: var(--bg-surface); border-color: #fecaca; color: #b91c1c; }
.pcg-btn.on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pcg-btn:disabled { opacity: .55; cursor: default; }
.pcg-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pcg-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border-color); margin-bottom: 14px; }
.pcg-tabs button { border: 0; background: none; color: var(--text-muted); font: inherit; font-size: 13.5px; font-weight: 700; padding: 8px 12px; cursor: pointer; border-bottom: 2px solid transparent; }
.pcg-tabs button.on { color: var(--text-primary); border-bottom-color: #1d4ed8; }
.pcg-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pcg-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pcg-table th, .pcg-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pcg-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pcg-table tr:last-child td { border-bottom: 0; }
.pcg-sub { color: var(--text-muted); font-size: 12px; }
.pcg-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
.pcg-pill.pending { background: #fffbeb; color: #92400e; }
.pcg-pill.accepted { background: #dcfce7; color: #166534; }
.pcg-pill.declined { background: #fee2e2; color: #991b1b; }
.pcg-pill.withdrawn { background: var(--bg-surface-alt); color: var(--text-muted); }
.pcg-pill.on { background: #dcfce7; color: #166534; }
.pcg-pill.off { background: var(--bg-surface-alt); color: var(--text-muted); }
.pcg-act { display: inline-block; border: 1px solid var(--border-color); border-radius: 999px; padding: 0 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); }
.pcg-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pcg-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pcg-counts b { font-size: 18px; margin-right: 4px; }
.pcg-rejectrow { display: flex; gap: 8px; margin-top: 7px; }
.pcg-rejectrow input { flex: 1 1 190px; }
.pcg-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 8px; padding: 9px 11px; margin-bottom: 12px; font-size: 12.5px; line-height: 1.5; }
.pcg-note { border: 1px solid var(--border-color); background: var(--bg-surface-alt); color: var(--text-muted); border-radius: 8px; padding: 9px 11px; margin-bottom: 12px; font-size: 12.5px; line-height: 1.5; }
.pcg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px 12px; }
.pcg-grid label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 3px; font-weight: 600; }
.pcg-grid input, .pcg-grid select, .pcg-grid textarea { width: 100%; }
.pcg-wide { grid-column: 1 / -1; }
.pcg-edit { background: var(--bg-surface-alt); border-top: 1px solid var(--border-color); padding: 14px 12px; }
.pcg-inline { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pcg-check { display: inline-flex; gap: 6px; align-items: center; font-size: 12.5px; }
</style>
<div class="pcg">
    <h1>Health maintenance</h1>
    <p class="pcg-intro">What patients are due for, and what they have asked about it. Accepting
        &ldquo;I had this done&rdquo; records a completed action against the reminder, which is what stops it
        showing as due &mdash; so check it the way you would check anything a patient tells you happened
        somewhere else.</p>
    <div class="pcg-tabs">
        <button type="button" data-tab="requests" class="${tab === "requests" ? "on" : ""}">Requests</button>
        <button type="button" data-tab="items">What patients are shown</button>
    </div>
    <div id="pcgBody"><div class="pcg-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalCareGaps() {
    wireTabs();
    await load();
}

function wireTabs() {
    document.querySelectorAll(".pcg-tabs [data-tab]").forEach((b) => {
        b.onclick = () => {
            tab = b.dataset.tab;
            document.querySelectorAll(".pcg-tabs [data-tab]").forEach((x) => x.classList.toggle("on", x.dataset.tab === tab));
            if (tab === "requests") load();
            else loadItems();
        };
    });
}

// ------------------------------------------------------------------ requests
async function load(q = "") {
    const params = new URLSearchParams({ status });
    if (q) params.set("q", q);

    const res = await api(`/portal-care-gaps?${params.toString()}`).catch(() => null);
    const body = $("pcgBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pcg-sub" style="padding:24px;text-align:center">Could not load the requests. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pcgBody");

    body.innerHTML = `
        <div class="pcg-counts">
            <div><b>${data.counts.pending}</b>waiting</div>
            <div><b>${data.counts.to_book}</b>to book</div>
            <div><b>${data.counts.accepted}</b>accepted</div>
            <div><b>${data.counts.declined}</b>declined</div>
        </div>
        ${!data.can_decide ? `<div class="pcg-warn">You can see these but not decide them.</div>` : ""}
        <div class="pcg-bar">
            ${["pending", "accepted", "declined", "all"].map((s) =>
                `<button type="button" class="pcg-btn ${s === status ? "on" : ""}" data-status="${s}">${s[0].toUpperCase()}${s.slice(1)}</button>`
            ).join("")}
            <input type="search" id="pcgQ" value="${esc(q)}" placeholder="Patient name, number or item" aria-label="Find a request" style="min-width:260px">
        </div>
        <div class="pcg-card">
            <table class="pcg-table">
                <thead><tr><th>Patient</th><th>Item</th><th>Asking</th><th>Sent</th><th>Status</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="6" class="pcg-sub" style="padding:22px;text-align:center">Nothing ${status === "all" ? "here" : `is ${esc(status)}`}.</td></tr>`}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-status]").forEach((b) => {
        b.onclick = () => {
            status = b.dataset.status;
            load($("pcgQ")?.value.trim() || "");
        };
    });

    const search = $("pcgQ");
    let t = null;
    search.oninput = (e) => {
        clearTimeout(t);
        const v = e.target.value;
        t = setTimeout(() => load(v.trim()), 350);
    };

    if (data.can_decide) {
        body.querySelectorAll("[data-accept]").forEach((b) => {
            b.onclick = () => decide(Number(b.dataset.accept), "accept", $(`pcgNote_${b.dataset.accept}`)?.value.trim() || "", b);
        });
        body.querySelectorAll("[data-decline]").forEach((b) => {
            b.onclick = () => {
                const id = Number(b.dataset.decline);
                const note = $(`pcgNote_${id}`)?.value.trim() || "";
                if (note === "") {
                    showToast("Say why, so the patient knows what to do next.", "error", 5000);
                    $(`pcgNote_${id}`)?.focus();
                    return;
                }
                decide(id, "decline", note, b);
            };
        });
    }
}

function rowHtml(r) {
    const asking = r.action === "report_done"
        ? `<span class="pcg-act">${esc(ACTION_LABELS[r.action])}</span>
           <div style="margin-top:4px">On <strong>${esc(r.done_on || "an unknown date")}</strong>${r.done_where ? ` at ${esc(r.done_where)}` : ""}</div>
           ${r.note ? `<div class="pcg-sub">“${esc(r.note)}”</div>` : ""}
           <div class="pcg-sub" style="margin-top:4px">Accepting records this as done on that date.</div>`
        : `<span class="pcg-act">${esc(ACTION_LABELS[r.action] || r.action)}</span>
           ${r.note ? `<div style="margin-top:4px">“${esc(r.note)}”</div>` : ""}
           <div class="pcg-sub" style="margin-top:4px">Accepting only records that you took it on — book it on the appointments screen.</div>`;

    return `<tr>
        <td>${esc(r.patient.name || "—")}<div class="pcg-sub">${esc(r.patient.mrn || "")}</div></td>
        <td>${esc(r.item_label)}${r.due_status ? `<div class="pcg-sub">Reminder: ${esc(r.due_status)}</div>` : ""}</td>
        <td>${asking}</td>
        <td class="pcg-sub">${esc(String(r.created_at || "").slice(0, 16))}</td>
        <td><span class="pcg-pill ${esc(r.status)}">${esc(r.status)}</span>
            ${r.review_note ? `<div class="pcg-sub" style="margin-top:3px">${esc(r.review_note)}</div>` : ""}
            ${r.reviewed_at ? `<div class="pcg-sub">${esc(String(r.reviewed_at).slice(0, 16))}${r.reviewed_by ? ` · ${esc(r.reviewed_by)}` : ""}</div>` : ""}</td>
        <td style="text-align:right;white-space:nowrap">
            ${r.status === "pending" && data.can_decide ? `
                <button type="button" class="pcg-btn primary" data-accept="${r.id}">Accept</button>
                <div class="pcg-rejectrow">
                    <input type="text" id="pcgNote_${r.id}" placeholder="Note — the patient reads this" maxlength="255">
                    <button type="button" class="pcg-btn danger" data-decline="${r.id}">Decline</button>
                </div>` : ""}
        </td>
    </tr>`;
}

async function decide(id, decision, note, btn) {
    btn.disabled = true;

    const res = await api("/portal-care-gaps/review", {
        method: "POST",
        body: JSON.stringify({ id, decision, review_note: note })
    }).catch(() => null);

    btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Could not save that decision.", "error", 7000);
        return;
    }

    showToast(res.message, "success", 6000);
    await load($("pcgQ")?.value.trim() || "");
}

// ------------------------------------------------------------------ items
async function loadItems(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);

    const res = await api(`/portal-health-maintenance-items${params.toString() ? `?${params}` : ""}`).catch(() => null);
    const body = $("pcgBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pcg-sub" style="padding:24px;text-align:center">Could not load the items. ${esc(res?.message || "")}</div>`;
        return;
    }

    itemsData = res.data;
    renderItems(q);
}

function renderItems(q = "") {
    const body = $("pcgBody");
    const shown = itemsData.items.filter((i) => i.shown_to_patients).length;

    body.innerHTML = `
        <div class="pcg-note">
            An item reaches patients only when all three are true: the rule&rsquo;s own
            <strong>patient reminder</strong> flag is on, the item is <strong>shown</strong>, and it does
            <strong>not need a condition</strong>. That last one matters: most of these rules carry no age
            or sex criteria at all, so the engine matches every patient — switching on the diabetes items
            would tell healthy people to book a diabetic eye exam.
            <strong>${shown} of ${itemsData.items.length}</strong> currently reach patients.
        </div>
        ${!itemsData.can_edit ? `<div class="pcg-warn">You can read these but not change them. Wording and intervals are a clinical decision and sit with admin and doctors.</div>` : ""}
        <div class="pcg-bar">
            <input type="search" id="pcgIQ" value="${esc(q)}" placeholder="Item or rule name" aria-label="Find an item" style="min-width:260px">
        </div>
        <div class="pcg-card">
            <table class="pcg-table">
                <thead><tr><th>Patient sees</th><th>Rule</th><th>How often</th><th>Reaches patients?</th><th></th></tr></thead>
                <tbody>${itemsData.items.length ? itemsData.items.map(itemRowHtml).join("")
                    : `<tr><td colspan="5" class="pcg-sub" style="padding:22px;text-align:center">No items.</td></tr>`}</tbody>
            </table>
        </div>`;

    const search = $("pcgIQ");
    let t = null;
    search.oninput = (e) => {
        clearTimeout(t);
        const v = e.target.value;
        t = setTimeout(() => loadItems(v.trim()), 350);
    };

    if (itemsData.can_edit) {
        body.querySelectorAll("[data-edit]").forEach((b) => {
            b.onclick = () => openEditor(Number(b.dataset.edit));
        });
    }
}

function itemRowHtml(i) {
    const why = [];
    if (!i.rule_flag_on) why.push("the rule&rsquo;s patient-reminder flag is off");
    if (!i.is_patient_visible) why.push("it is not marked shown");
    if (i.needs_condition) why.push("it needs a condition the engine does not check");

    return `<tr id="pcgItem_${i.id}">
        <td><strong>${esc(i.patient_label)}</strong>
            ${i.what_it_is ? `<div class="pcg-sub">${esc(i.what_it_is)}</div>` : ""}</td>
        <td class="pcg-sub">${esc(i.rule_title)}
            <div>${esc(i.rule_type)}${i.has_criteria ? "" : " · no age or sex criteria"}</div></td>
        <td class="pcg-sub">${esc(i.every)}<div>grace ${i.grace_days}d</div></td>
        <td>${i.shown_to_patients
            ? `<span class="pcg-pill on">Yes</span>`
            : `<span class="pcg-pill off">No</span><div class="pcg-sub" style="margin-top:3px">Because ${why.join("; ")}.</div>`}
            ${i.condition_note ? `<div class="pcg-sub">${esc(i.condition_note)}</div>` : ""}</td>
        <td style="text-align:right">${itemsData.can_edit ? `<button type="button" class="pcg-btn" data-edit="${i.id}">Edit</button>` : ""}</td>
    </tr>`;
}

function openEditor(id) {
    const i = itemsData.items.find((x) => x.id === id);
    if (!i) return;

    const row = $(`pcgItem_${id}`);
    if (!row || row.nextElementSibling?.classList.contains("pcg-editrow")) return;

    const tr = document.createElement("tr");
    tr.className = "pcg-editrow";
    tr.innerHTML = `<td colspan="5" class="pcg-edit">
        <div class="pcg-grid">
            <div class="pcg-wide">
                <label for="e_label_${id}">What the patient sees it called</label>
                <input type="text" id="e_label_${id}" value="${esc(i.patient_label)}" maxlength="150">
            </div>
            <div class="pcg-wide">
                <label for="e_what_${id}">What it is — plainly, in the second person</label>
                <textarea id="e_what_${id}" maxlength="500">${esc(i.what_it_is || "")}</textarea>
            </div>
            <div class="pcg-wide">
                <label for="e_why_${id}">Why it matters — no statistics, and never that they are at risk</label>
                <textarea id="e_why_${id}" maxlength="500">${esc(i.why_it_matters || "")}</textarea>
            </div>
            <div class="pcg-wide">
                <label for="e_how_${id}">How to get it done</label>
                <textarea id="e_how_${id}" maxlength="500">${esc(i.how_to_get_it || "")}</textarea>
            </div>
            <div>
                <label for="e_val_${id}">How often</label>
                <div class="pcg-inline">
                    <input type="number" id="e_val_${id}" value="${i.recurrence_val}" min="1" max="120" style="width:84px">
                    <select id="e_unit_${id}" style="width:auto">
                        ${(itemsData.units || []).map((u) => `<option value="${esc(u)}" ${u === i.recurrence_unit ? "selected" : ""}>${esc(u)}s</option>`).join("")}
                    </select>
                </div>
            </div>
            <div>
                <label for="e_grace_${id}">Days late before it reads as overdue</label>
                <input type="number" id="e_grace_${id}" value="${i.grace_days}" min="0" max="365">
            </div>
            <div>
                <label for="e_seq_${id}">Order in the list</label>
                <input type="number" id="e_seq_${id}" value="${i.sequence}" min="0" max="9999">
            </div>
            <div class="pcg-wide">
                <label class="pcg-check"><input type="checkbox" id="e_cond_${id}" ${i.needs_condition ? "checked" : ""}>
                    Only applies to patients who have a condition (the engine matches age and sex alone)</label>
                <label class="pcg-check" style="margin-top:6px"><input type="checkbox" id="e_vis_${id}" ${i.is_patient_visible ? "checked" : ""}>
                    Show this to patients</label>
                ${!i.rule_flag_on ? `<div class="pcg-warn" style="margin:8px 0 0">The rule&rsquo;s own patient-reminder flag is off, so this will still not reach patients until it is switched on from the practice rules screen.</div>` : ""}
            </div>
        </div>
        <div class="pcg-bar" style="margin:12px 0 0">
            <button type="button" class="pcg-btn primary" id="e_save_${id}">Save</button>
            <button type="button" class="pcg-btn" id="e_cancel_${id}">Cancel</button>
        </div>
    </td>`;

    row.after(tr);

    $(`e_cancel_${id}`).onclick = () => tr.remove();
    $(`e_save_${id}`).onclick = async (ev) => {
        const btn = ev.currentTarget;
        btn.disabled = true;

        const res = await api("/portal-health-maintenance-items", {
            method: "POST",
            body: JSON.stringify({
                id,
                patient_label: $(`e_label_${id}`).value,
                what_it_is: $(`e_what_${id}`).value,
                why_it_matters: $(`e_why_${id}`).value,
                how_to_get_it: $(`e_how_${id}`).value,
                recurrence_val: Number($(`e_val_${id}`).value),
                recurrence_unit: $(`e_unit_${id}`).value,
                grace_days: Number($(`e_grace_${id}`).value),
                sequence: Number($(`e_seq_${id}`).value),
                needs_condition: $(`e_cond_${id}`).checked,
                is_patient_visible: $(`e_vis_${id}`).checked,
            })
        }).catch(() => null);

        btn.disabled = false;

        if (!res?.success) {
            const first = res?.errors ? Object.values(res.errors)[0] : null;
            showToast(first || res?.message || "Could not save that.", "error", 9000);
            return;
        }

        showToast(res.message, "success", 4000);
        await loadItems($("pcgIQ")?.value.trim() || "");
    };
}
