import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Fast Pass (tab "portal_fastpass").
 *
 * Phase M18. Slots that came free, who was offered them, and what became of
 * them -- plus the queue of patients who asked to come in sooner.
 *
 * Two things this screen is built around.
 *
 * ONE: the only number that says whether the feature earns its place is how many
 * freed slots were actually filled. It is the first thing on the page. A board
 * that only showed live slots would always look busy and never say whether any
 * of it worked.
 *
 * TWO: a slot's state has to be readable without knowing the schema. "Came too
 * close, not filled" and "Filled some other way" are different failures with
 * different remedies -- the first says the offer window is too long or the queue
 * too short, the second says the desk and the portal are competing for the same
 * gaps. So states are shown in words from the service, never as raw enum values.
 *
 * What the desk can do here: publish a gap by hand (a doctor freeing an hour),
 * withdraw one (the doctor is needed in theatre), and run the engine. The sweep
 * button exists because nothing schedules it yet -- whatever runs the portal cron
 * should call the same endpoint, and until it does, somebody can press this.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let queue = null;
let tab = "board";
let scope = "live";

export function PortalFastPassView() {
    return `
<style>
.pfp { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1250px; }
.pfp h1 { margin: 0; font-size: 22px; }
.pfp .pfp-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 82ch; line-height: 1.5; }
.pfp input, .pfp select, .pfp textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pfp-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pfp-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pfp-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pfp-btn.danger { border-color: #fecaca; color: #991b1b; }
.pfp-btn:disabled { opacity: .55; cursor: default; }
.pfp-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pfp-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border-color); margin-bottom: 14px; }
.pfp-tabs button { border: 0; background: none; color: var(--text-muted); font: inherit; font-weight: 600; font-size: 13px; padding: 8px 12px; cursor: pointer; border-bottom: 2px solid transparent; }
.pfp-tabs button[aria-selected="true"] { color: var(--text-primary); border-bottom-color: #15803d; }
.pfp-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pfp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pfp-table th, .pfp-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pfp-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pfp-table tr:last-child td { border-bottom: 0; }
.pfp-sub { color: var(--text-muted); font-size: 12px; }
.pfp-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pfp-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.pfp-pill.live { background: #dbeafe; color: #1e40af; }
.pfp-pill.filled { background: #dcfce7; color: #166534; }
.pfp-pill.lost { background: #fffbeb; color: #92400e; }
.pfp-pill.gone { background: var(--bg-surface-alt); color: var(--text-muted); }
.pfp-pill.dormant { background: #fef3c7; color: #92400e; }
.pfp-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pfp-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pfp-counts b { font-size: 18px; margin-right: 4px; }
.pfp-counts div.headline { border-color: #86efac; background: #f0fdf4; }
.pfp-note { border: 1px solid var(--border-color); background: var(--bg-surface-alt); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 12.5px; line-height: 1.55; max-width: 94ch; }
.pfp-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 10px; padding: 9px 12px; margin-bottom: 12px; font-size: 12.5px; }
.pfp-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, .5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1200; }
.pfp-sheet { background: var(--bg-surface); border-radius: 14px; border: 1px solid var(--border-color); width: min(760px, 100%); max-height: 90vh; overflow: auto; padding: 20px 22px; }
.pfp-sheet h2 { margin: 0 0 4px; font-size: 18px; }
.pfp-field { margin-top: 12px; }
.pfp-field label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
.pfp-field input, .pfp-field select, .pfp-field textarea { width: 100%; }
.pfp-place { display: inline-block; min-width: 22px; text-align: center; border-radius: 6px; background: var(--bg-surface-alt); font-weight: 700; padding: 1px 5px; }
</style>
<div class="pfp">
    <h1>Fast Pass</h1>
    <p class="pfp-intro">
        When an appointment is cancelled, the slot is offered to patients who already hold a
        later appointment with the same doctor and have asked to come in sooner. Accepting
        <strong>moves</strong> the appointment they already have — nobody is given a booking
        they did not have, and nothing moves unless a patient says yes.
    </p>
    <div id="pfpBody"><div class="pfp-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalFastPass() {
    await load();
}

async function load(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("scope", scope);

    const res = await api(`/portal-fastpass?${params.toString()}`).catch(() => null);
    const body = $("pfpBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pfp-sub" style="padding:24px;text-align:center">Could not load the board. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

async function loadQueue(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);

    const res = await api(`/portal-fastpass/waitlist?${params.toString()}`).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "Could not load the queue.", "error");
        return;
    }

    queue = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pfpBody");
    const s = data.settings;

    body.innerHTML = `
        ${!s.allow ? `<div class="pfp-warn">Fast Pass is switched off in settings. Nothing new is published and no offers go out. What is below is history.</div>` : ""}
        ${!data.can_manage ? `<div class="pfp-warn">You can read this but not publish, withdraw or run the engine.</div>` : ""}
        ${countsHtml()}
        <div class="pfp-tabs" role="tablist">
            <button type="button" role="tab" id="pfpTabBoard" aria-selected="${tab === "board"}">Freed slots</button>
            <button type="button" role="tab" id="pfpTabQueue" aria-selected="${tab === "queue"}">Who is waiting (${data.waiting})</button>
        </div>
        <div id="pfpPane">${tab === "board" ? boardHtml(q) : queueHtml(q)}</div>`;

    $("pfpTabBoard").onclick = () => { tab = "board"; render(); };
    $("pfpTabQueue").onclick = () => { tab = "queue"; if (!queue) loadQueue(); else render(); };

    wirePane();
}

function countsHtml() {
    const t = data.totals || {};
    const s = data.settings;
    const settled = (t.total || 0) - (t.live || 0);
    const rate = settled > 0 ? Math.round(((t.filled || 0) / settled) * 100) : null;

    return `
        <div class="pfp-counts">
            <div class="headline"><b>${t.filled || 0}</b>freed slots filled${rate === null ? "" : ` — ${rate}% of those settled`}</div>
            <div><b>${t.live || 0}</b>live now</div>
            <div><b>${t.expired || 0}</b>came too close</div>
            <div><b>${t.unavailable || 0}</b>filled some other way</div>
        </div>
        <div class="pfp-note">
            <strong>How an offer is timed.</strong>
            An offer is held open for <strong>${s.offer_hours} hours</strong>, and goes to
            <strong>${s.batch}</strong> ${s.batch === 1 ? "patient" : "patients"} at a time in the order
            they joined — first to accept wins, and the rest are told somebody else took it.
            A slot closer than <strong>${s.min_lead_hours} hours</strong> away is never offered, because
            nobody can rearrange a morning at that notice.
            <div style="margin-top:6px">
                This is deliberately <em>not</em> the 24-hour cut-off that stops patients moving their own
                appointments. Short notice is exactly when cancellations happen, so applying that cut-off
                here would throw away the slots worth offering. The hospital is asking the patient to come
                in sooner, not the other way round.
            </div>
        </div>`;
}

function boardHtml(q = "") {
    return `
        <div class="pfp-bar">
            <input type="search" id="pfpQ" value="${esc(q)}" placeholder="Doctor, date or state" aria-label="Find a slot" style="min-width:260px">
            <select id="pfpScope" aria-label="Which slots">
                <option value="live"${scope === "live" ? " selected" : ""}>Live only</option>
                <option value="settled"${scope === "settled" ? " selected" : ""}>Settled only</option>
                <option value="all"${scope === "all" ? " selected" : ""}>Everything</option>
            </select>
            ${data.can_manage && data.settings.allow ? `<button type="button" class="pfp-btn primary" id="pfpNew">Publish a gap</button>` : ""}
            ${data.can_manage ? `<button type="button" class="pfp-btn" id="pfpSweep" title="Expire old offers, close slots that came too close, and send the next round">Run the engine now</button>` : ""}
        </div>
        <div class="pfp-card">
            <table class="pfp-table">
                <thead><tr>
                    <th>Slot</th><th>Doctor</th><th>Came free because</th>
                    <th>State</th><th class="pfp-num">Offers</th><th>Filled by</th><th></th>
                </tr></thead>
                <tbody>${data.items.length
                    ? data.items.map(slotRow).join("")
                    : `<tr><td colspan="7" class="pfp-sub" style="padding:22px;text-align:center">No slots to show. Nothing has been cancelled, or everything has been settled.</td></tr>`}</tbody>
            </table>
        </div>`;
}

function statePill(status, label) {
    const cls = status === "taken" ? "filled"
        : (status === "open" || status === "offered") ? "live"
        : status === "expired" ? "lost"
        : "gone";

    return `<span class="pfp-pill ${cls}">${esc(label)}</span>`;
}

function slotRow(r) {
    const live = r.status === "open" || r.status === "offered";

    return `
    <tr>
        <td>
            <strong>${esc(r.when)}</strong>
            ${live ? `<div class="pfp-sub">${r.hours_away} ${r.hours_away === 1 ? "hour" : "hours"} away</div>` : ""}
        </td>
        <td>${esc(r.doctor || "—")}</td>
        <td class="pfp-sub">${esc(r.source_label)}</td>
        <td>
            ${statePill(r.status, r.status_label)}
            ${r.status_note ? `<div class="pfp-sub" style="margin-top:3px;max-width:34ch">${esc(r.status_note)}</div>` : ""}
        </td>
        <td class="pfp-num">
            ${r.offer_count || "—"}
            ${r.open_count ? `<div class="pfp-sub">${r.open_count} awaiting</div>` : ""}
            ${r.round > 1 ? `<div class="pfp-sub">round ${r.round}</div>` : ""}
        </td>
        <td>
            ${r.taken_by ? `${esc(r.taken_by)}<div class="pfp-sub">${esc(r.taken_by_no || "")}</div>` : `<span class="pfp-sub">—</span>`}
        </td>
        <td style="white-space:nowrap">
            <button type="button" class="pfp-btn" data-open="${r.id}">Offers</button>
            ${live && data.can_manage ? `<button type="button" class="pfp-btn danger" data-withdraw="${r.id}">Withdraw</button>` : ""}
        </td>
    </tr>`;
}

function queueHtml(q = "") {
    if (!queue) {
        return `<div class="pfp-sub" style="padding:24px;text-align:center">Loading…</div>`;
    }

    return `
        <div class="pfp-bar">
            <input type="search" id="pfpQueueQ" value="${esc(q)}" placeholder="Patient name or number" aria-label="Find a patient" style="min-width:260px">
        </div>
        <div class="pfp-note">
            The order is the order people joined, and nothing else — no scoring and no clinical
            weighting. Anything cleverer would be a rationing decision, and that is not one to make
            in code without somebody signing it off.
            <div style="margin-top:6px">
                Patients are <strong>not</strong> shown their place. It is knowable, but it moves for
                reasons that have nothing to do with them — somebody ahead leaves the list, or is
                offered a slot this patient could not have taken anyway — and a number that goes
                backwards with no explanation is worse than no number.
            </div>
        </div>
        <div class="pfp-card">
            <table class="pfp-table">
                <thead><tr>
                    <th class="pfp-num">#</th><th>Patient</th><th>Doctor</th><th>Appointment they hold</th>
                    <th>Not before</th><th>State</th><th class="pfp-num">Offered</th><th class="pfp-num">Declined</th><th class="pfp-num">No answer</th>
                </tr></thead>
                <tbody>${queue.items.length
                    ? queue.items.map(queueRow).join("")
                    : `<tr><td colspan="9" class="pfp-sub" style="padding:22px;text-align:center">Nobody has asked to come in sooner yet.</td></tr>`}</tbody>
            </table>
        </div>`;
}

function queueRow(r) {
    return `
    <tr>
        <td class="pfp-num">${r.place ? `<span class="pfp-place">${r.place}</span>` : `<span class="pfp-sub">—</span>`}</td>
        <td><strong>${esc(r.patient)}</strong><div class="pfp-sub">${esc(r.patient_no || "")}</div></td>
        <td>${esc(r.doctor || "—")}</td>
        <td>
            ${esc(r.appointment || "—")}
            ${r.appointment_status && r.appointment_status !== "scheduled"
                ? `<div class="pfp-sub">${esc(r.appointment_status)}</div>` : ""}
        </td>
        <td class="pfp-sub">${esc(r.earliest_date || "any time")}</td>
        <td>
            ${r.status === "dormant"
                ? `<span class="pfp-pill dormant">Paused</span>`
                : `<span class="pfp-pill live">Waiting</span>`}
            ${r.status_note ? `<div class="pfp-sub" style="margin-top:3px;max-width:32ch">${esc(r.status_note)}</div>` : ""}
        </td>
        <td class="pfp-num">${r.offers_sent || "—"}</td>
        <td class="pfp-num">${r.declines || "—"}</td>
        <td class="pfp-num">${r.expiries || "—"}</td>
    </tr>`;
}

function wirePane() {
    const search = $("pfpQ");
    if (search) {
        let timer = null;
        search.oninput = () => {
            clearTimeout(timer);
            timer = setTimeout(() => load(search.value.trim()), 300);
        };
    }

    const queueSearch = $("pfpQueueQ");
    if (queueSearch) {
        let timer = null;
        queueSearch.oninput = () => {
            clearTimeout(timer);
            timer = setTimeout(() => loadQueue(queueSearch.value.trim()), 300);
        };
    }

    const scopeSel = $("pfpScope");
    if (scopeSel) {
        scopeSel.onchange = () => { scope = scopeSel.value; load($("pfpQ")?.value.trim() || ""); };
    }

    const newBtn = $("pfpNew");
    if (newBtn) newBtn.onclick = openPublish;

    const sweepBtn = $("pfpSweep");
    if (sweepBtn) {
        sweepBtn.onclick = async () => {
            sweepBtn.disabled = true;
            const res = await api("/portal-fastpass/sweep", "POST", {}).catch(() => null);
            sweepBtn.disabled = false;

            if (!res?.success) {
                showToast(res?.message || "That did not work.", "error");
                return;
            }

            const d = res.data;
            // Said in full rather than as "done", because every one of these
            // numbers is something a patient was or was not told.
            showToast(
                `${d.offers_sent} ${d.offers_sent === 1 ? "offer" : "offers"} sent, `
                + `${d.expired_offers} expired, ${d.closed_slots} slots closed, ${d.found_slots} found.`,
                "success"
            );
            load($("pfpQ")?.value.trim() || "");
            if (queue) loadQueue();
        };
    }

    const pane = $("pfpPane");
    if (!pane) return;

    pane.querySelectorAll("[data-open]").forEach((b) => {
        b.onclick = () => openOffers(Number(b.dataset.open));
    });

    pane.querySelectorAll("[data-withdraw]").forEach((b) => {
        b.onclick = () => openWithdraw(Number(b.dataset.withdraw));
    });
}

function sheet(html) {
    const wrap = document.createElement("div");
    wrap.className = "pfp-modal";
    wrap.innerHTML = `<div class="pfp-sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();

    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelectorAll("[data-close]").forEach((b) => { b.onclick = close; });

    return { wrap, close };
}

async function openOffers(slotId) {
    const res = await api(`/portal-fastpass/slot?id=${slotId}`).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "Could not load that slot.", "error");
        return;
    }

    const { slot, offers } = res.data;

    sheet(`
        <h2>${esc(slot.when)}</h2>
        <p class="pfp-sub" style="margin:2px 0 12px">
            ${esc(slot.doctor || "No doctor named")} · ${esc(slot.source_label)} · ${esc(slot.status_label)}
        </p>
        ${slot.status_note ? `<div class="pfp-note">${esc(slot.status_note)}</div>` : ""}
        <div class="pfp-card" style="margin-bottom:12px">
            <table class="pfp-table">
                <thead><tr><th class="pfp-num">Round</th><th>Patient</th><th>Would have moved from</th><th>Answer</th><th>Deadline</th></tr></thead>
                <tbody>${offers.length ? offers.map((o) => `
                    <tr>
                        <td class="pfp-num">${o.round}</td>
                        <td><strong>${esc(o.patient)}</strong><div class="pfp-sub">${esc(o.patient_no || "")}</div></td>
                        <td class="pfp-sub">${esc(o.from)}</td>
                        <td>
                            ${esc(o.status_label)}
                            ${o.decline_reason ? `<div class="pfp-sub">“${esc(o.decline_reason)}”</div>` : ""}
                            ${o.note ? `<div class="pfp-sub">${esc(o.note)}</div>` : ""}
                        </td>
                        <td class="pfp-sub">${esc(String(o.expires_at || "").slice(0, 16))}</td>
                    </tr>`).join("")
                    : `<tr><td colspan="5" class="pfp-sub" style="padding:18px;text-align:center">Nobody has been offered this slot. Either nobody on the list is eligible for it, or it has not come up for a round yet.</td></tr>`}</tbody>
            </table>
        </div>
        <div style="text-align:right"><button type="button" class="pfp-btn" data-close>Close</button></div>`);
}

function openWithdraw(slotId) {
    const slot = (data.items || []).find((s) => s.id === slotId);

    const { wrap, close } = sheet(`
        <h2>Withdraw this slot</h2>
        <p class="pfp-sub" style="margin:2px 0 0">${esc(slot ? slot.when : "")}</p>
        <div class="pfp-note" style="margin-top:12px">
            Anyone currently being offered it is told it is no longer available. They stay on the
            list and it does not count against them, because they did not turn anything down.
            No appointment changes.
        </div>
        <div class="pfp-field">
            <label for="pfpWhy">Why (the desk sees this, the patient does not)</label>
            <input id="pfpWhy" maxlength="200" placeholder="e.g. doctor needed in theatre">
        </div>
        <div style="margin-top:16px;text-align:right">
            <button type="button" class="pfp-btn" data-close>Cancel</button>
            <button type="button" class="pfp-btn danger" id="pfpDoWithdraw">Withdraw slot</button>
        </div>`);

    const btn = wrap.querySelector("#pfpDoWithdraw");

    btn.onclick = async () => {
        btn.disabled = true;

        const res = await api("/portal-fastpass/withdraw", "POST", {
            slot_id: slotId,
            reason: wrap.querySelector("#pfpWhy").value.trim(),
        }).catch(() => null);

        btn.disabled = false;

        if (!res?.success) {
            showToast(res?.message || "That did not work.", "error");
            return;
        }

        showToast(res.message, "success");
        close();
        load($("pfpQ")?.value.trim() || "");
    };
}

function openPublish() {
    const s = data.settings;

    const { wrap, close } = sheet(`
        <h2>Publish a gap</h2>
        <p class="pfp-sub" style="margin:2px 0 0">
            For a slot that came free without a cancellation — a doctor freeing an hour, a clinic
            opening extra time.
        </p>
        <div class="pfp-note" style="margin-top:12px">
            The time is checked against the clinic schedule before it is accepted, so a slot
            outside the doctor's hours or already booked is refused rather than offered and then
            withdrawn. It must also be at least <strong>${s.min_lead_hours} hours</strong> away —
            anything sooner, telephone whoever you want to bring in.
        </div>
        <div class="pfp-field">
            <label for="pfpProvider">Doctor</label>
            <select id="pfpProvider"><option value="">Loading…</option></select>
        </div>
        <div class="pfp-field">
            <label for="pfpDate">Date</label>
            <input type="date" id="pfpDate">
        </div>
        <div class="pfp-field">
            <label for="pfpTime">Time</label>
            <input type="time" id="pfpTime" step="300">
        </div>
        <div id="pfpPubErr"></div>
        <div style="margin-top:16px;text-align:right">
            <button type="button" class="pfp-btn" data-close>Cancel</button>
            <button type="button" class="pfp-btn primary" id="pfpDoPublish">Publish and offer</button>
        </div>`);

    const select = wrap.querySelector("#pfpProvider");

    api("/portal-fastpass/providers").then((res) => {
        const items = res?.data?.items || [];
        select.innerHTML = items.length
            ? `<option value="">Choose a doctor…</option>`
              + items.map((p) => `<option value="${p.id}">${esc(p.name)}${p.specialty ? ` — ${esc(p.specialty)}` : ""}</option>`).join("")
            : `<option value="">No doctors found</option>`;
    }).catch(() => {
        select.innerHTML = `<option value="">Could not load doctors</option>`;
    });

    const btn = wrap.querySelector("#pfpDoPublish");

    btn.onclick = async () => {
        const providerId = Number(select.value);
        const date = wrap.querySelector("#pfpDate").value;
        const time = wrap.querySelector("#pfpTime").value;

        if (!providerId) { showToast("Choose a doctor.", "error"); return; }
        if (!date) { showToast("Pick a date.", "error"); return; }
        if (!time) { showToast("Pick a time.", "error"); return; }

        btn.disabled = true;

        const res = await api("/portal-fastpass/publish", "POST", {
            provider_id: providerId,
            date,
            time,
        }).catch(() => null);

        btn.disabled = false;

        if (!res?.success) {
            // Field errors shown in the sheet rather than as a toast: the desk has
            // to change something here, and a toast that has faded leaves them
            // guessing which field was wrong.
            const errs = res?.errors || {};
            wrap.querySelector("#pfpPubErr").innerHTML = `
                <div class="pfp-warn" style="margin:12px 0 0">
                    ${esc(res?.message || "That did not work.")}
                    ${Object.keys(errs).length
                        ? `<ul style="margin:6px 0 0;padding-left:18px">${Object.values(errs).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
                        : ""}
                </div>`;
            return;
        }

        showToast(res.message, "success");
        close();
        load($("pfpQ")?.value.trim() || "");
        if (queue) loadQueue();
    };
}
