import { api, API_URL } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { ensureCss, esc, when, dayLabel } from "./mychart-ui.js?v=11";

/*
 * Staff screen (Phase 8): people asking to see another patient's record.
 *
 * Approving this releases a whole record to another person, so the screen puts the
 * three things that decide it side by side -- who is asking, whose record it is, and
 * what proof they sent -- and makes a refusal carry a reason, because the person is
 * told what it says.
 */

let rows = [];
let status = "pending";
let deciding = 0;

export function PortalProxyRequestsView() {
    return `<div class="mc" id="ppr"><div class="mc-empty">Loading…</div></div>`;
}

export async function initPortalProxyRequests() {
    ensureCss();
    await load();
}

async function load() {
    const root = document.getElementById("ppr");
    if (!root) return;

    const res = await api(`/proxy-requests?status=${encodeURIComponent(status)}`).catch(() => null);

    if (!res?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(res?.message || "The requests could not be loaded.")}</div>`;
        return;
    }

    rows = res.data || [];
    render();
}

const STATUS_WORD = { pending: "Waiting", approved: "Granted", denied: "Refused", revoked: "Taken away" };

function render() {
    const root = document.getElementById("ppr");

    root.innerHTML = `
        <div class="mc-head">
            <h1>Record access requests</h1>
            <p class="mc-sub">People asking to see another patient's record through My Chart. Check who they are before
                granting it — this opens the whole record to them until the patient takes it away.</p>
        </div>

        <div class="mc-tools">
            <select id="pprStatus">
                ${["pending", "approved", "denied", "revoked", "all"].map((s) =>
                    `<option value="${s}" ${s === status ? "selected" : ""}>${esc(STATUS_WORD[s] || "All")}</option>`).join("")}
            </select>
            <button type="button" class="mc-b sm" id="pprRefresh">Refresh</button>
        </div>

        ${rows.length
            ? `<div class="mc-list">${rows.map(rowHtml).join("")}</div>`
            : `<div class="mc-empty">Nothing here.</div>`}`;

    bind();
}

function rowHtml(r) {
    return `<div class="mc-row static">
        <span class="mc-main">
            <span class="mc-name">${esc(r.requester.name)} <span class="mc-chip kind">${esc(STATUS_WORD[r.status] || r.status)}</span></span>
            <span class="mc-meta">Signs in as ${esc(r.requester.username)}${
                r.requester.patient_no ? ` · own chart ${esc(r.requester.patient_no)}` : " · no chart of their own"}${
                r.requester.birthdate ? ` · born ${esc(dayLabel(r.requester.birthdate))}` : ""}</span>
            <span class="mc-meta"><b>Wants: ${esc(r.patient.name)}</b> (${esc(r.patient.patient_no)}, born ${esc(dayLabel(r.patient.birthdate))})
                — as their ${esc(String(r.relationship).toLowerCase())}</span>
            ${r.note ? `<span class="mc-meta">“${esc(r.note)}”</span>` : ""}
            <span class="mc-meta">Asked ${esc(when(r.asked_at))}${
                r.decided_at ? ` · decided ${esc(when(r.decided_at))}${r.decided_by ? ` by ${esc(r.decided_by)}` : ""}` : ""}</span>
            ${r.reason ? `<span class="mc-meta">Reason given: ${esc(r.reason)}</span>` : ""}
            ${r.evidence
                ? `<a class="mc-b sm" style="display:inline-block;margin-top:6px" target="_blank" rel="noopener"
                     href="${esc(API_URL)}${esc(r.evidence.file_path)}">Open proof (${esc(r.evidence.filename)})</a>`
                : `<span class="mc-meta">No document was attached.</span>`}
        </span>
        <span class="mc-right">
            ${r.status === "pending"
                ? `<button type="button" class="mc-b sm blue" data-approve="${r.id}">Approve</button>
                   <button type="button" class="mc-b sm" data-deny="${r.id}">Refuse</button>`
                : ""}
        </span>
    </div>
    ${deciding === r.id ? denyFormHtml(r) : ""}`;
}

function denyFormHtml(r) {
    return `<form class="mc-goalform" id="pprDeny" data-id="${r.id}">
        <div class="mc-field">
            <label for="pprReason">Why is it refused? The person is shown this.</label>
            <input type="text" id="pprReason" maxlength="500" required
                placeholder="e.g. We could not confirm who you are. Please come to the records desk with your ID.">
            <div class="mc-err" id="pprReasonErr"></div>
        </div>
        <div class="mc-formrow">
            <button type="submit" class="mc-b blue">Refuse this request</button>
            <button type="button" class="mc-b" id="pprCancel">Cancel</button>
        </div>
    </form>`;
}

function bind() {
    const root = document.getElementById("ppr");

    root.querySelector("#pprStatus").onchange = async (e) => {
        status = e.target.value;
        deciding = 0;
        await load();
    };

    root.querySelector("#pprRefresh").onclick = () => load();

    root.querySelectorAll("[data-approve]").forEach((b) => {
        b.onclick = async () => {
            b.disabled = true;
            await decide(Number(b.dataset.approve), "approve", "");
        };
    });

    root.querySelectorAll("[data-deny]").forEach((b) => {
        b.onclick = () => {
            deciding = Number(b.dataset.deny);
            render();
        };
    });

    const form = root.querySelector("#pprDeny");

    if (form) {
        root.querySelector("#pprCancel").onclick = () => {
            deciding = 0;
            render();
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const reason = document.getElementById("pprReason").value.trim();

            if (!reason) {
                document.getElementById("pprReasonErr").textContent = "Say why — the person is told this.";
                return;
            }

            await decide(Number(form.dataset.id), "deny", reason);
        };
    }
}

async function decide(id, decision, reason) {
    const res = await api("/proxy-requests/decide", {
        method: "POST",
        body: JSON.stringify({ id, decision, reason }),
    }).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "That did not work.", "error", 6000);
        render();
        return;
    }

    deciding = 0;
    showToast(res.message, "success", 7000);
    await load();
}
