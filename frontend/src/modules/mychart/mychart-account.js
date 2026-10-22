import { api, API_URL } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { ensureCss, esc, when, dayLabel } from "./mychart-ui.js?v=11";
import { recordPackDocument } from "./mychart-record.js?v=2";

/*
 * My Chart -> Account and sharing (patient portal, Phase 8).
 *
 * Four things that all answer "who can see my record, and how do I change that":
 *   - who has access to it today, and taking that away;
 *   - links given to an outside doctor: what is in them, when they die, who opened them;
 *   - a copy of the record to keep or print;
 *   - asking for access to someone else's record, and what became of that request.
 *
 * Plus the plain security facts: how sign-in works and where to change the password.
 */

let data = null;
let log = null;
let openForm = "";

export function MyChartAccountView() {
    return `<div class="mc" id="mcAccount"><div class="mc-empty">Loading…</div></div>`;
}

export async function initMyChartAccount() {
    ensureCss();
    openForm = "";
    log = null;
    await load();
}

async function load() {
    const root = document.getElementById("mcAccount");
    if (!root) return;

    const res = await api("/mychart/account").catch(() => null);

    if (!res?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(res?.message || "Your account could not be loaded. Please try again.")}</div>`;
        return;
    }

    data = res.data;
    render();
}

function render() {
    const root = document.getElementById("mcAccount");

    root.innerHTML = `
        <div class="mc-head">
            <h1>Account and sharing</h1>
            <p class="mc-sub">Who can see your record, the links you have given out, a copy for yourself, and how you sign in.</p>
        </div>

        ${accessHtml()}
        ${sharesHtml()}
        ${downloadHtml()}
        ${requestHtml()}
        ${logHtml()}
        ${securityHtml()}`;

    bind();
}

/* ---------------- who can see my record ---------------- */

function accessHtml() {
    const a = data.access;

    return `<div class="mc-panel">
        <h2>Who can see my record</h2>
        <p class="mc-sub">Besides you and the staff looking after you. You can take any of these away yourself, at any time.</p>

        ${a.granted.length
            ? `<div class="mc-list" style="margin-top:10px">${a.granted.map((g) => `<div class="mc-row static">
                <span class="mc-main">
                    <span class="mc-name">${esc(g.name)}</span>
                    <span class="mc-meta">${esc(g.relationship)}${g.since ? ` · since ${esc(dayLabel(g.since))}` : ""}</span>
                </span>
                <span class="mc-right"><button type="button" class="mc-b sm" data-revoke-access="${g.related_person_id}">Take access away</button></span>
            </div>`).join("")}</div>`
            : `<div class="mc-empty" style="margin-top:10px">Nobody else can open your record.</div>`}

        ${a.pending.length
            ? `<div class="mc-note">${a.pending.map((p) => `${esc(p.name)} has asked to see your record as your
                ${esc(String(p.relationship).toLowerCase())} (${esc(dayLabel(p.asked_at))}). The hospital is checking who they are
                before deciding.`).join("<br>")}</div>`
            : ""}
    </div>`;
}

/* ---------------- links for an outside doctor ---------------- */

function sharesHtml() {
    const rows = data.shares || [];

    return `<div class="mc-panel">
        <h2>Links I have given out</h2>
        <p class="mc-sub">A link lets a doctor outside this hospital read the parts you choose, until it expires or you switch it off.
            Anyone who has the link can open it, so send it only to the person you meant.</p>

        <div class="mc-formrow" style="margin-top:10px">
            <button type="button" class="mc-b blue" id="mcNewShare">${openForm === "share" ? "Cancel" : "Make a link"}</button>
        </div>

        <div id="mcShareForm">${openForm === "share" ? shareFormHtml() : ""}</div>

        ${rows.length
            ? `<div class="mc-list" style="margin-top:12px">${rows.map(shareRow).join("")}</div>`
            : `<div class="mc-empty" style="margin-top:12px">You have not shared your record with anyone.</div>`}
    </div>`;
}

function shareFormHtml() {
    return `<form class="mc-goalform" id="mcShareNew" novalidate>
        <div class="mc-field">
            <label for="mcShareLabel">Who is it for?</label>
            <input type="text" id="mcShareLabel" maxlength="150" placeholder="e.g. Dr Reyes, City Clinic" required>
            <div class="mc-err" id="mcShareLabelErr"></div>
        </div>
        <div class="mc-field">
            <label>What may they read?</label>
            <div class="mc-checks">${data.sections.map((s) => `<label class="mc-check">
                <input type="checkbox" value="${esc(s.key)}" ${data.default_scope.includes(s.key) ? "checked" : ""}> ${esc(s.label)}
            </label>`).join("")}</div>
            <div class="mc-err" id="mcShareScopeErr"></div>
        </div>
        <div class="mc-field" style="max-width:220px">
            <label for="mcShareDays">For how long?</label>
            <select id="mcShareDays">
                ${[7, 14, 30, 60, 90].filter((d) => d <= data.max_days).map((d) =>
                    `<option value="${d}" ${d === data.default_days ? "selected" : ""}>${d} days</option>`).join("")}
            </select>
            <div class="mc-err" id="mcShareDaysErr"></div>
        </div>
        <div class="mc-formrow">
            <button type="submit" class="mc-b blue" id="mcShareSave">Make the link</button>
            <span class="mc-meta">You can switch it off at any time, and you will see each time it is opened.</span>
        </div>
    </form>`;
}

function shareRow(s) {
    const state = s.revoked ? "Switched off" : s.expired ? "Expired" : `Works until ${dayLabel(s.expires_at)}`;

    return `<div class="mc-row static ${s.live ? "" : "mc-dim"}">
        <span class="mc-main">
            <span class="mc-name">${esc(s.label)}</span>
            <span class="mc-meta">${esc(s.scope_words.join(", "))}</span>
            <span class="mc-meta">${esc(state)} · opened ${s.access_count} ${s.access_count === 1 ? "time" : "times"}${
                s.last_viewed_at ? `, last ${esc(when(s.last_viewed_at))}` : ""}</span>
            ${s.live ? `<span class="mc-link" data-url="${esc(s.url)}">${esc(s.url)}</span>` : ""}
        </span>
        <span class="mc-right">
            ${s.live ? `<button type="button" class="mc-b sm" data-copy="${esc(s.url)}">Copy link</button>
                <button type="button" class="mc-b sm" data-revoke-share="${s.id}">Switch off</button>` : ""}
        </span>
    </div>`;
}

/* ---------------- my own copy ---------------- */

function downloadHtml() {
    return `<div class="mc-panel">
        <h2>A copy for myself</h2>
        <p class="mc-sub">Choose what to include, then print it or save it as a PDF from the print window.
            The full Summary of Care (the CCD your hospital shares between doctors) is under Medical Reports.</p>

        <div class="mc-checks" id="mcPackScope" style="margin-top:8px">${data.sections.map((s) => `<label class="mc-check">
            <input type="checkbox" value="${esc(s.key)}" checked> ${esc(s.label)}
        </label>`).join("")}</div>

        <div class="mc-formrow" style="margin-top:10px">
            <button type="button" class="mc-b blue" id="mcPrintPack">Open a printable copy</button>
            <button type="button" class="mc-b" id="mcGoReports">Summary of Care (CCD)</button>
        </div>
    </div>`;
}

/* ---------------- asking for access to someone else's record ---------------- */

function requestHtml() {
    const rows = data.requests || [];
    const word = { pending: "Being checked", approved: "Granted", denied: "Refused", revoked: "Taken away" };

    return `<div class="mc-panel">
        <h2>Someone else's record</h2>
        <p class="mc-sub">If you look after a child or a parent, you can ask to see their record here. The hospital checks
            who you are before granting it, and the patient can take it away at any time.</p>

        <div class="mc-formrow" style="margin-top:10px">
            <button type="button" class="mc-b" id="mcNewRequest">${openForm === "request" ? "Cancel" : "Ask for access"}</button>
        </div>

        <div id="mcRequestForm">${openForm === "request" ? requestFormHtml() : ""}</div>

        ${rows.length
            ? `<div class="mc-list" style="margin-top:12px">${rows.map((r) => `<div class="mc-row static">
                <span class="mc-main">
                    <span class="mc-name">${esc(r.about)} <span class="mc-chip kind">${esc(word[r.status] || r.status)}</span></span>
                    <span class="mc-meta">As their ${esc(String(r.relationship).toLowerCase())} · asked ${esc(dayLabel(r.created_at))}</span>
                    ${r.reason ? `<span class="mc-meta">${esc(r.reason)}</span>` : ""}
                </span>
            </div>`).join("")}</div>`
            : ""}
    </div>`;
}

function requestFormHtml() {
    return `<form class="mc-goalform" id="mcRequestNew" novalidate>
        <p class="mc-sub" style="margin:0">You need their hospital number, family name and date of birth. If you do not have
            all three, ask at the reception desk instead.</p>
        <div class="mc-grid">
            <div class="mc-field">
                <label for="mcReqNo">Their hospital number</label>
                <input type="text" id="mcReqNo" maxlength="50" required>
                <div class="mc-err" id="mcReqNoErr"></div>
            </div>
            <div class="mc-field">
                <label for="mcReqLast">Their family name</label>
                <input type="text" id="mcReqLast" maxlength="100" required>
                <div class="mc-err" id="mcReqLastErr"></div>
            </div>
            <div class="mc-field">
                <label for="mcReqDob">Their date of birth</label>
                <input type="date" id="mcReqDob" required>
                <div class="mc-err" id="mcReqDobErr"></div>
            </div>
            <div class="mc-field">
                <label for="mcReqRel">You are their…</label>
                <select id="mcReqRel">
                    <option value="">Choose…</option>
                    ${data.relationships.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join("")}
                </select>
                <div class="mc-err" id="mcReqRelErr"></div>
            </div>
        </div>
        <div class="mc-field">
            <label for="mcReqNote">Anything the hospital should know <span class="muted">(optional)</span></label>
            <input type="text" id="mcReqNote" maxlength="500" placeholder="e.g. I am her daughter and I take her to appointments.">
        </div>
        <div class="mc-field">
            <label for="mcReqFile">Proof, if you have it <span class="muted">(optional)</span></label>
            <input type="file" id="mcReqFile" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx">
            <div class="mc-meta">A birth certificate, guardianship order or similar. It is kept with your own documents.</div>
            <div class="mc-err" id="mcReqFileErr"></div>
        </div>
        <div class="mc-formrow">
            <button type="submit" class="mc-b blue" id="mcReqSend">Send the request</button>
        </div>
    </form>`;
}

/* ---------------- who has looked at my record ---------------- */

function logHtml() {
    return `<div class="mc-panel">
        <h2>Who has looked at my record</h2>
        <p class="mc-sub">What you did in My Chart, and every time one of your links was opened. The hospital keeps a
            separate account of disclosures it has made, which you can ask for at the records desk.</p>

        <div class="mc-formrow" style="margin-top:10px">
            <button type="button" class="mc-b" id="mcLoadLog">${log ? "Hide" : "Show the last 90 days"}</button>
        </div>

        <div id="mcLogBox">${log ? logRows() : ""}</div>
    </div>`;
}

function logRows() {
    if (!log.items.length) {
        return `<div class="mc-empty" style="margin-top:10px">Nothing recorded in the last ${log.days} days.</div>`;
    }

    return `<div class="mc-note">You ${log.counts.you}, hospital staff ${log.counts.staff},
            someone acting for you ${log.counts.proxy}, shared links ${log.counts.outside}${
            log.counts.refused ? ` · ${log.counts.refused} refused` : ""}.</div>
        <div class="mc-wrap"><table class="mc-tbl">
            <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
            <tbody>${log.items.slice(0, 100).map((i) => `<tr class="${i.refused ? "abn" : ""}">
                <td>${esc(when(i.at))}</td>
                <td>${esc(i.who)}</td>
                <td>${esc(i.what)}${i.detail ? `<div class="muted">${esc(i.detail)}</div>` : ""}</td>
            </tr>`).join("")}</tbody>
        </table></div>`;
}

/* ---------------- signing in ---------------- */

function securityHtml() {
    const s = data.security || {};

    return `<div class="mc-panel">
        <h2>Signing in</h2>
        <p class="mc-sub">${s.applies_to_me
            ? `When you sign in, we also send a one-time code to your ${s.two_factor_method === "sms" ? "phone" : "email"}.
               Keep your contact details up to date so the code can reach you.`
            : "You sign in with your username and password. The hospital can switch on a one-time code as well; "
              + "ask at the desk if you would like that."}</p>
        <div class="mc-formrow" style="margin-top:10px">
            <button type="button" class="mc-b" id="mcChangePw">Change my password</button>
        </div>
    </div>`;
}

/* ---------------- wiring ---------------- */

function bind() {
    const root = document.getElementById("mcAccount");

    root.querySelector("#mcNewShare").onclick = () => {
        openForm = openForm === "share" ? "" : "share";
        render();
    };

    root.querySelector("#mcNewRequest").onclick = () => {
        openForm = openForm === "request" ? "" : "request";
        render();
    };

    const shareForm = root.querySelector("#mcShareNew");
    if (shareForm) shareForm.onsubmit = saveShare;

    const reqForm = root.querySelector("#mcRequestNew");
    if (reqForm) reqForm.onsubmit = sendRequest;

    root.querySelectorAll("[data-copy]").forEach((b) => {
        b.onclick = async () => {
            try {
                await navigator.clipboard.writeText(b.dataset.copy);
                showToast("Link copied. Send it only to the doctor you meant it for.", "success", 4000);
            } catch {
                showToast("Copying is blocked in this browser — select the link and copy it by hand.", "error", 5000);
            }
        };
    });

    root.querySelectorAll("[data-revoke-share]").forEach((b) => {
        b.onclick = () => confirmInRow(b, "Switch this link off?", async () => {
            const res = await api("/mychart/shares/revoke", { method: "POST", body: JSON.stringify({ id: Number(b.dataset.revokeShare) }) })
                .catch(() => null);
            finish(res);
        });
    });

    root.querySelectorAll("[data-revoke-access]").forEach((b) => {
        b.onclick = () => confirmInRow(b, "Take their access away?", async () => {
            const res = await api("/mychart/proxy-access/revoke", {
                method: "POST",
                body: JSON.stringify({ related_person_id: Number(b.dataset.revokeAccess) }),
            }).catch(() => null);
            finish(res);
        });
    });

    root.querySelector("#mcPrintPack").onclick = printPack;

    root.querySelector("#mcGoReports").onclick = () => {
        if (window.__openDashboardTab) window.__openDashboardTab("reports");
        else showToast("Open Medical Reports from the menu above.", "error", 5000);
    };

    root.querySelector("#mcChangePw").onclick = () => {
        if (window.__openDashboardTab) window.__openDashboardTab("change_password");
        else showToast("Open Profile from the menu above to change your password.", "error", 5000);
    };

    root.querySelector("#mcLoadLog").onclick = async () => {
        if (log) {
            log = null;
            render();
            return;
        }

        const res = await api("/mychart/access-log?days=90").catch(() => null);

        if (!res?.success) {
            showToast(res?.message || "That could not be loaded.", "error", 5000);
            return;
        }

        log = res.data;
        render();
    };
}

/** Confirmation happens in the row itself -- never a browser dialog. */
function confirmInRow(btn, question, onYes) {
    const cell = btn.parentElement;
    const original = cell.innerHTML;

    cell.innerHTML = `<span class="mc-confirm">${esc(question)}
        <button type="button" class="mc-b sm" data-yes="1">Yes</button>
        <button type="button" class="mc-b sm" data-no="1">No</button></span>`;

    cell.querySelector("[data-no]").onclick = () => {
        cell.innerHTML = original;
        bind();
    };

    cell.querySelector("[data-yes]").onclick = async (ev) => {
        ev.currentTarget.disabled = true;
        await onYes();
    };
}

async function finish(res) {
    if (!res?.success) {
        showToast(res?.message || "That did not work.", "error", 5000);
        render();
        return;
    }

    showToast(res.message, "success", 5000);
    await load();
}

async function saveShare(e) {
    e.preventDefault();

    const btn = document.getElementById("mcShareSave");
    const scope = [...document.querySelectorAll("#mcShareNew .mc-checks input:checked")].map((i) => i.value);

    btn.disabled = true;

    const res = await api("/mychart/shares", {
        method: "POST",
        body: JSON.stringify({
            label: document.getElementById("mcShareLabel").value,
            days: Number(document.getElementById("mcShareDays").value),
            scope,
        }),
    }).catch(() => null);

    btn.disabled = false;

    if (!res?.success) {
        ["mcShareLabelErr", "mcShareScopeErr", "mcShareDaysErr"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = "";
        });

        const map = { label: "mcShareLabelErr", scope: "mcShareScopeErr", days: "mcShareDaysErr" };
        Object.entries(res?.errors || {}).forEach(([k, v]) => {
            const el = document.getElementById(map[k]);
            if (el) el.textContent = v;
        });

        showToast(res?.message || "That link could not be made.", "error", 5000);
        return;
    }

    openForm = "";
    showToast(res.message, "success", 8000);
    await load();
}

async function sendRequest(e) {
    e.preventDefault();

    const btn = document.getElementById("mcReqSend");
    const file = document.getElementById("mcReqFile").files[0];
    const body = new FormData();

    body.append("patient_no", document.getElementById("mcReqNo").value.trim());
    body.append("last_name", document.getElementById("mcReqLast").value.trim());
    body.append("birthdate", document.getElementById("mcReqDob").value);
    body.append("relationship", document.getElementById("mcReqRel").value);
    body.append("note", document.getElementById("mcReqNote").value.trim());
    if (file) body.append("evidence", file);

    btn.disabled = true;

    // FormData sets its own multipart boundary, so this one call goes around the
    // JSON helper rather than letting it force a Content-Type.
    let res = null;

    try {
        const r = await fetch(`${API_URL}/mychart/proxy-requests`, { method: "POST", credentials: "include", body });
        res = await r.json();
    } catch {
        res = null;
    }

    btn.disabled = false;

    ["mcReqNoErr", "mcReqLastErr", "mcReqDobErr", "mcReqRelErr", "mcReqFileErr"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
    });

    if (!res?.success) {
        const map = { patient_no: "mcReqNoErr", last_name: "mcReqLastErr", birthdate: "mcReqDobErr",
            relationship: "mcReqRelErr", evidence: "mcReqFileErr" };
        Object.entries(res?.errors || {}).forEach(([k, v]) => {
            const el = document.getElementById(map[k]);
            if (el) el.textContent = v;
        });

        showToast(res?.message || "That request could not be sent.", "error", 6000);
        return;
    }

    openForm = "";
    showToast(res.message, "success", 8000);
    await load();
}

async function printPack() {
    const scope = [...document.querySelectorAll("#mcPackScope input:checked")].map((i) => i.value);

    if (!scope.length) {
        showToast("Choose at least one part of your record.", "error", 4000);
        return;
    }

    const res = await api(`/mychart/record-pack?scope=${encodeURIComponent(scope.join(","))}`).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "Your record could not be prepared.", "error", 5000);
        return;
    }

    const w = window.open("", "_blank");

    if (!w) {
        showToast("Your browser blocked the print window. Allow pop-ups for this site and try again.", "error", 6000);
        return;
    }

    w.document.open();
    w.document.write(recordPackDocument(res.data, {
        title: "My health record",
        note: "Your own copy, prepared from My Chart.",
    }));
    w.document.close();
}
