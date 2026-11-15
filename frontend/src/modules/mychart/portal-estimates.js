import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Cost estimates (tab "portal_estimates").
 *
 * Phase M16. Two tabs, because they are two halves of the same job:
 *
 *   Questions   what patients have asked the cost of. Answering means issuing
 *               an estimate, which snapshots every figure onto the estimate
 *               row -- so a price edited next week does not rewrite what a
 *               patient was told. Declining requires a reason, because "we
 *               cannot price this until your surgeon decides" is a real answer
 *               and a patient needs to know that is what happened.
 *
 *   Packages    what patients are shown, and -- the reason this screen exists
 *               at all -- whether each package's itemised list actually adds up
 *               to the price being quoted.
 *
 * That last column is the thing nobody would otherwise know. Of the four
 * packages on file, one reconciles (and only against its discounted price);
 * two are out by 49 and 7,650; one has no line items at all while being priced
 * at 48,000. A patient is never shown a breakdown that does not sum to its own
 * total, so for three of the four they see the bundle price and the written
 * inclusions only. The arithmetic is printed here so somebody can fix the data
 * rather than wonder why the itemised view is missing.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let packagesData = null;
let tab = "questions";
let status = "pending";

const BREAKDOWN_LABEL = {
    reconciled: "Adds up",
    unavailable: "Does not add up",
    none: "No items on file",
};

function money(amount, m) {
    const places = Math.max(0, Math.min(4, Number(m?.decimal_places ?? 2)));
    const n = Number(amount || 0).toLocaleString(undefined, {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
    });
    const symbol = m?.currency_symbol ?? "$";

    return m?.currency_position === "suffix" ? `${n}${symbol}` : `${symbol}${n}`;
}

export function PortalEstimatesView() {
    return `
<style>
.pce { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pce h1 { margin: 0; font-size: 22px; }
.pce .pce-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pce input, .pce select, .pce textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pce textarea { min-height: 58px; resize: vertical; }
.pce-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pce-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pce-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pce-btn.danger { background: var(--bg-surface); border-color: #fecaca; color: #b91c1c; }
.pce-btn.on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pce-btn:disabled { opacity: .55; cursor: default; }
.pce-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pce-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border-color); margin-bottom: 14px; }
.pce-tabs button { border: 0; background: none; color: var(--text-muted); font: inherit; font-size: 13.5px; font-weight: 700; padding: 8px 12px; cursor: pointer; border-bottom: 2px solid transparent; }
.pce-tabs button.on { color: var(--text-primary); border-bottom-color: #1d4ed8; }
.pce-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pce-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pce-table th, .pce-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pce-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pce-table tr:last-child td { border-bottom: 0; }
.pce-sub { color: var(--text-muted); font-size: 12px; }
.pce-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pce-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
.pce-pill.pending { background: #fffbeb; color: #92400e; }
.pce-pill.answered { background: #dcfce7; color: #166534; }
.pce-pill.declined { background: #fee2e2; color: #991b1b; }
.pce-pill.withdrawn { background: var(--bg-surface-alt); color: var(--text-muted); }
.pce-pill.reconciled { background: #dcfce7; color: #166534; }
.pce-pill.unavailable { background: #fef2f2; color: #991b1b; }
.pce-pill.none { background: var(--bg-surface-alt); color: var(--text-muted); }
.pce-pill.on { background: #dcfce7; color: #166534; }
.pce-pill.off { background: var(--bg-surface-alt); color: var(--text-muted); }
.pce-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pce-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pce-counts b { font-size: 18px; margin-right: 4px; }
.pce-warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 10px; padding: 9px 12px; margin-bottom: 12px; font-size: 12.5px; }
.pce-note { border: 1px solid var(--border-color); background: var(--bg-surface-alt); border-radius: 10px; padding: 9px 12px; margin-bottom: 14px; font-size: 12.5px; line-height: 1.5; max-width: 90ch; }
.pce-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, .5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1200; }
.pce-sheet { background: var(--bg-surface); border-radius: 14px; border: 1px solid var(--border-color); width: min(620px, 100%); max-height: 88vh; overflow: auto; padding: 20px 22px; }
.pce-sheet h2 { margin: 0 0 4px; font-size: 18px; }
.pce-field { margin-top: 12px; }
.pce-field label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
.pce-field input, .pce-field select, .pce-field textarea { width: 100%; }
.pce-results { border: 1px solid var(--border-color); border-radius: 8px; margin-top: 6px; max-height: 190px; overflow: auto; }
.pce-results button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--border-color); background: none; color: var(--text-primary); font: inherit; font-size: 13px; padding: 7px 10px; cursor: pointer; }
.pce-results button:last-child { border-bottom: 0; }
.pce-results button:hover { background: var(--bg-surface-alt); }
</style>
<div class="pce">
    <h1>Cost estimates</h1>
    <p class="pce-intro">
        What patients have asked things will cost, and the estimates issued to them. An
        estimate takes a copy of every figure at the moment it is issued, so changing a
        package price later never rewrites what a patient was already told.
    </p>
    <div class="pce-tabs">
        <button type="button" data-tab="questions" class="on">Questions</button>
        <button type="button" data-tab="packages">What patients are shown</button>
    </div>
    <div id="pceBody"><div class="pce-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalEstimates() {
    wireTabs();
    await load();
}

function wireTabs() {
    document.querySelectorAll(".pce-tabs [data-tab]").forEach((b) => {
        b.onclick = () => {
            tab = b.dataset.tab;
            document.querySelectorAll(".pce-tabs [data-tab]").forEach((x) => x.classList.toggle("on", x.dataset.tab === tab));
            if (tab === "questions") load();
            else loadPackages();
        };
    });
}

// ----------------------------------------------------------------- questions
async function load(q = "") {
    const params = new URLSearchParams({ status });
    if (q) params.set("q", q);

    const res = await api(`/portal-estimates?${params.toString()}`).catch(() => null);
    const body = $("pceBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pce-sub" style="padding:24px;text-align:center">Could not load the questions. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pceBody");
    const m = data.money;

    body.innerHTML = `
        <div class="pce-counts">
            <div><b>${data.counts.pending}</b>waiting</div>
            <div><b>${data.counts.answered}</b>answered</div>
            <div><b>${data.counts.declined}</b>declined</div>
            <div><b>${data.counts.issued}</b>estimates live</div>
        </div>
        ${!data.can_issue ? `<div class="pce-warn">You can read these but not issue an estimate.</div>` : ""}
        <div class="pce-bar">
            ${["pending", "answered", "declined", "all"].map((s) =>
                `<button type="button" class="pce-btn ${s === status ? "on" : ""}" data-status="${s}">${s[0].toUpperCase()}${s.slice(1)}</button>`
            ).join("")}
            <input type="search" id="pceQ" value="${esc(q)}" placeholder="Patient name, number or what they asked" aria-label="Find a question" style="min-width:280px">
            ${data.can_issue ? `<button type="button" class="pce-btn primary" id="pceNew">Issue an estimate</button>` : ""}
        </div>
        <div class="pce-card">
            <table class="pce-table">
                <thead><tr><th>Patient</th><th>Asked about</th><th>Their note</th><th>Asked</th><th>Status</th><th class="pce-num">Estimate</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map((r) => rowHtml(r, m)).join("")
                    : `<tr><td colspan="7" class="pce-sub" style="padding:22px;text-align:center">Nothing ${status === "all" ? "here" : `is ${esc(status)}`}.</td></tr>`}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-status]").forEach((b) => {
        b.onclick = () => {
            status = b.dataset.status;
            load($("pceQ")?.value.trim() || "");
        };
    });

    const search = $("pceQ");
    if (search) {
        let timer = null;
        search.oninput = () => {
            clearTimeout(timer);
            timer = setTimeout(() => load(search.value.trim()), 300);
        };
    }

    const newBtn = $("pceNew");
    if (newBtn) newBtn.onclick = () => openIssue(null);

    body.querySelectorAll("[data-answer]").forEach((b) => {
        b.onclick = () => {
            const row = data.items.find((x) => x.id === Number(b.dataset.answer));
            openIssue(row);
        };
    });

    body.querySelectorAll("[data-decline]").forEach((b) => {
        b.onclick = () => openDecline(Number(b.dataset.decline));
    });
}

function rowHtml(r, m) {
    const about = r.package ? (r.package.patient_label || r.package.staff_name) : r.asked_about;

    return `
    <tr>
        <td><strong>${esc(r.patient.name)}</strong><div class="pce-sub">${esc(r.patient.mrn || "")}</div></td>
        <td>${esc(about || "—")}${r.package ? `<div class="pce-sub">${esc(r.package.code)}</div>` : `<div class="pce-sub">free text</div>`}</td>
        <td class="pce-sub">${esc(r.note || "—")}</td>
        <td class="pce-sub">${esc(String(r.created_at || "").slice(0, 16))}</td>
        <td>
            <span class="pce-pill ${esc(r.status)}">${esc(r.status)}</span>
            ${r.review_note ? `<div class="pce-sub" style="margin-top:3px">${esc(r.review_note)}</div>` : ""}
            ${r.reviewed_by ? `<div class="pce-sub">by ${esc(r.reviewed_by)}</div>` : ""}
        </td>
        <td class="pce-num">${r.estimate
            ? `<strong>${esc(money(r.estimate.quoted_total, m))}</strong><div class="pce-sub">${esc(r.estimate.estimate_no)}</div>`
            : `<span class="pce-sub">—</span>`}</td>
        <td style="white-space:nowrap">
            ${r.status === "pending" && data.can_issue
                ? `<button type="button" class="pce-btn primary" data-answer="${r.id}">Issue</button>
                   <button type="button" class="pce-btn danger" data-decline="${r.id}">Decline</button>`
                : ""}
        </td>
    </tr>`;
}

// -------------------------------------------------------------- issue dialog
async function openIssue(request) {
    const pkgRes = await api("/portal-estimate-packages").catch(() => null);

    if (!pkgRes?.success) {
        showToast("Could not load the packages.", "error");
        return;
    }

    const packages = pkgRes.data.items.filter((p) => p.reaches_patients.reaches);
    const m = pkgRes.data.money;

    let patientId = request?.patient?.id ?? 0;
    let patientName = request?.patient?.name ?? "";

    const wrap = document.createElement("div");
    wrap.className = "pce-modal";
    wrap.innerHTML = `
    <div class="pce-sheet" role="dialog" aria-modal="true" aria-label="Issue an estimate">
        <h2>Issue an estimate</h2>
        <div class="pce-sub">Every figure is copied onto the estimate now. Editing the package later will not change it.</div>

        <div class="pce-field">
            <label for="pceiPatient">Patient</label>
            ${patientId
                ? `<div><strong>${esc(patientName)}</strong> <span class="pce-sub">${esc(request?.patient?.mrn || "")}</span></div>`
                : `<input type="search" id="pceiPatient" placeholder="Name or patient number" autocomplete="off">
                   <div class="pce-results" id="pceiResults" hidden></div>`}
        </div>

        <div class="pce-field">
            <label for="pceiPackage">Price from</label>
            <select id="pceiPackage">
                <option value="">Choose a package…</option>
                ${packages.map((p) => `<option value="${p.package_id}">${esc(p.patient_label || p.staff_name)} (${esc(p.code)})</option>`).join("")}
            </select>
        </div>

        <div class="pce-field">
            <label for="pceiBasis">Which price applies</label>
            <select id="pceiBasis">
                <option value="standard">Standard price</option>
                <option value="discounted">Discounted price</option>
            </select>
            <div class="pce-sub" id="pceiPrices" style="margin-top:5px"></div>
        </div>

        <div class="pce-field">
            <label for="pceiNote">Note for the patient (optional)</label>
            <textarea id="pceiNote" maxlength="2000" placeholder="For example: your surgeon has asked for one extra night, which is not in this figure."></textarea>
        </div>

        <div class="pce-bar" style="margin:16px 0 0">
            <button type="button" class="pce-btn primary" id="pceiSave">Issue it</button>
            <button type="button" class="pce-btn" id="pceiCancel">Cancel</button>
        </div>
    </div>`;

    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelector("#pceiCancel").onclick = close;

    // Patient lookup, when the dialog was not opened from a question.
    const patientInput = wrap.querySelector("#pceiPatient");
    if (patientInput) {
        const results = wrap.querySelector("#pceiResults");
        let timer = null;

        patientInput.oninput = () => {
            clearTimeout(timer);
            const q = patientInput.value.trim();
            patientId = 0;

            if (q.length < 2) {
                results.hidden = true;
                return;
            }

            timer = setTimeout(async () => {
                const res = await api(`/portal-estimate-patients?q=${encodeURIComponent(q)}`).catch(() => null);
                const items = res?.data?.items || [];
                results.hidden = items.length === 0;
                results.innerHTML = items.map((p) =>
                    `<button type="button" data-id="${p.id}">${esc(p.name)} <span class="pce-sub">${esc(p.mrn || "")}</span></button>`
                ).join("");
                results.querySelectorAll("[data-id]").forEach((b) => {
                    b.onclick = () => {
                        patientId = Number(b.dataset.id);
                        patientInput.value = b.textContent.trim();
                        results.hidden = true;
                    };
                });
            }, 280);
        };
    }

    // Show both prices and whether a breakdown will be included, so the choice
    // of basis is made with the arithmetic visible rather than guessed.
    const pkgSelect = wrap.querySelector("#pceiPackage");
    const basisSelect = wrap.querySelector("#pceiBasis");
    const pricesOut = wrap.querySelector("#pceiPrices");

    const showPrices = () => {
        const p = packages.find((x) => x.package_id === Number(pkgSelect.value));

        if (!p) {
            pricesOut.textContent = "";
            return;
        }

        const basis = basisSelect.value;
        const state = p.breakdown[basis]?.state || "none";

        pricesOut.innerHTML = `
            Standard <strong>${esc(money(p.standard_total, m))}</strong> ·
            Discounted <strong>${esc(money(p.discounted_total, m))}</strong><br>
            Itemised list at this price: <span class="pce-pill ${esc(state)}">${esc(BREAKDOWN_LABEL[state] || state)}</span>
            ${state === "reconciled"
                ? " — the patient will see it line by line."
                : " — the patient will see the total and the written inclusions only."}
            ${p.breakdown[basis]?.note ? `<div style="margin-top:4px">${esc(p.breakdown[basis].note)}</div>` : ""}`;
    };

    pkgSelect.onchange = showPrices;
    basisSelect.onchange = showPrices;

    if (request?.package?.id) {
        pkgSelect.value = String(request.package.id);
        showPrices();
    }

    wrap.querySelector("#pceiSave").onclick = async () => {
        if (!patientId) {
            showToast("Choose a patient.", "error");
            return;
        }

        if (!pkgSelect.value) {
            showToast("Choose a package to price from.", "error");
            return;
        }

        const res = await api("/portal-estimates/issue", "POST", {
            patient_id: patientId,
            package_id: Number(pkgSelect.value),
            price_basis: basisSelect.value,
            request_id: request?.id || 0,
            note_to_patient: wrap.querySelector("#pceiNote").value.trim(),
        }).catch(() => null);

        if (!res?.success) {
            showToast(res?.message || "That did not work.", "error");
            return;
        }

        showToast(res.message, "success");
        close();
        load($("pceQ")?.value.trim() || "");
    };
}

function openDecline(requestId) {
    const wrap = document.createElement("div");
    wrap.className = "pce-modal";
    wrap.innerHTML = `
    <div class="pce-sheet" role="dialog" aria-modal="true" aria-label="Decline this question">
        <h2>Decline this question</h2>
        <div class="pce-sub">The patient reads this, so say what happens next rather than only that you cannot help.</div>
        <div class="pce-field">
            <label for="pcedNote">Reason</label>
            <textarea id="pcedNote" maxlength="500" placeholder="For example: we cannot price this until your surgeon has decided what is needed. Please ask at your next appointment."></textarea>
        </div>
        <div class="pce-bar" style="margin:16px 0 0">
            <button type="button" class="pce-btn danger" id="pcedSave">Decline</button>
            <button type="button" class="pce-btn" id="pcedCancel">Cancel</button>
        </div>
    </div>`;

    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelector("#pcedCancel").onclick = close;

    wrap.querySelector("#pcedSave").onclick = async () => {
        const note = wrap.querySelector("#pcedNote").value.trim();

        if (!note) {
            showToast("A reason is required.", "error");
            return;
        }

        const res = await api("/portal-estimates/decline", "POST", { id: requestId, review_note: note }).catch(() => null);

        if (!res?.success) {
            showToast(res?.message || "That did not work.", "error");
            return;
        }

        showToast(res.message, "success");
        close();
        load($("pceQ")?.value.trim() || "");
    };
}

// ------------------------------------------------------------------ packages
async function loadPackages(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);

    const res = await api(`/portal-estimate-packages?${params.toString()}`).catch(() => null);
    const body = $("pceBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pce-sub" style="padding:24px;text-align:center">Could not load the packages. ${esc(res?.message || "")}</div>`;
        return;
    }

    packagesData = res.data;
    renderPackages(q);
}

function renderPackages(q = "") {
    const body = $("pceBody");
    const m = packagesData.money;
    const broken = packagesData.items.filter((p) => p.breakdown.standard.state !== "reconciled" && p.breakdown.discounted.state !== "reconciled").length;

    body.innerHTML = `
        <div class="pce-note">
            <strong>About the "itemised list" column.</strong>
            A patient is never shown a breakdown that does not add up to the total above it,
            because the obvious question — why does the hospital's own list disagree with the
            hospital's own price? — has no good answer. Where the arithmetic does not work the
            patient sees the bundle price and the written inclusions instead, which is sound.
            The figures are printed here so the data can be corrected.
            ${broken ? `<div style="margin-top:6px"><strong>${broken}</strong> of ${packagesData.items.length} packages cannot show a breakdown at either price.</div>` : ""}
        </div>
        ${!packagesData.can_edit ? `<div class="pce-warn">You can read this but not change what patients are shown.</div>` : ""}
        <div class="pce-bar">
            <input type="search" id="pcepQ" value="${esc(q)}" placeholder="Package name or code" aria-label="Find a package" style="min-width:280px">
        </div>
        <div class="pce-card">
            <table class="pce-table">
                <thead><tr>
                    <th>Package</th><th>What patients see</th>
                    <th class="pce-num">Standard</th><th class="pce-num">Discounted</th>
                    <th>Itemised list</th><th>Reaches patients?</th><th></th>
                </tr></thead>
                <tbody>${packagesData.items.length ? packagesData.items.map((p) => packageRowHtml(p, m)).join("")
                    : `<tr><td colspan="7" class="pce-sub" style="padding:22px;text-align:center">No packages.</td></tr>`}</tbody>
            </table>
        </div>`;

    const search = $("pcepQ");
    if (search) {
        let timer = null;
        search.oninput = () => {
            clearTimeout(timer);
            timer = setTimeout(() => loadPackages(search.value.trim()), 300);
        };
    }

    body.querySelectorAll("[data-edit]").forEach((b) => {
        b.onclick = () => openPackageEdit(packagesData.items.find((x) => x.package_id === Number(b.dataset.edit)));
    });
}

function packageRowHtml(p, m) {
    const cell = (basis) => {
        const s = p.breakdown[basis];

        return `<div style="margin-bottom:3px">
            <span class="pce-sub">${basis === "standard" ? "std" : "disc"}</span>
            <span class="pce-pill ${esc(s.state)}">${esc(BREAKDOWN_LABEL[s.state] || s.state)}</span>
        </div>`;
    };

    const worstNote = p.breakdown.discounted.note || p.breakdown.standard.note;

    return `
    <tr>
        <td><strong>${esc(p.staff_name)}</strong><div class="pce-sub">${esc(p.code)}</div></td>
        <td>${p.patient_label
            ? `${esc(p.patient_label)}<div class="pce-sub">${esc(p.patient_blurb || "")}</div>`
            : `<span class="pce-sub">nothing written yet</span>`}</td>
        <td class="pce-num">${esc(money(p.standard_total, m))}</td>
        <td class="pce-num">${esc(money(p.discounted_total, m))}</td>
        <td>
            ${cell("standard")}${cell("discounted")}
            <div class="pce-sub">${p.breakdown.item_count} item${p.breakdown.item_count === 1 ? "" : "s"}, totalling ${esc(money(p.breakdown.item_total, m))}</div>
            ${worstNote ? `<div class="pce-sub" style="margin-top:3px">${esc(worstNote)}</div>` : ""}
        </td>
        <td>
            <span class="pce-pill ${p.reaches_patients.reaches ? "on" : "off"}">${p.reaches_patients.reaches ? "Yes" : "No"}</span>
            <div class="pce-sub" style="margin-top:3px">${esc(p.reaches_patients.why)}</div>
        </td>
        <td>${packagesData.can_edit ? `<button type="button" class="pce-btn" data-edit="${p.package_id}">Edit</button>` : ""}</td>
    </tr>`;
}

function openPackageEdit(p) {
    if (!p) return;

    const wrap = document.createElement("div");
    wrap.className = "pce-modal";
    wrap.innerHTML = `
    <div class="pce-sheet" role="dialog" aria-modal="true" aria-label="What patients are shown">
        <h2>${esc(p.staff_name)}</h2>
        <div class="pce-sub">${esc(p.code)} · prices and inclusions are managed in Billing, not here. This is only what patients read.</div>

        <div class="pce-field">
            <label for="pcepLabel">Name patients see</label>
            <input type="text" id="pcepLabel" maxlength="255" value="${esc(p.patient_label || "")}" placeholder="For example: Gallbladder removal (keyhole surgery)">
            <div class="pce-sub" style="margin-top:4px">Use the words a patient would use. Nobody searches for "cholecystectomy".</div>
        </div>

        <div class="pce-field">
            <label for="pcepBlurb">One-line description</label>
            <textarea id="pcepBlurb" maxlength="500" placeholder="What the stay covers, in plain words.">${esc(p.patient_blurb || "")}</textarea>
        </div>

        <div class="pce-field">
            <label><input type="checkbox" id="pcepVisible" ${p.is_patient_visible ? "checked" : ""}> Show this package to patients</label>
        </div>

        <div class="pce-field">
            <label for="pcepHide">If not shown, why not</label>
            <input type="text" id="pcepHide" maxlength="255" value="${esc(p.hide_reason || "")}" placeholder="Recorded so the decision is not a mystery later.">
        </div>

        <div class="pce-field">
            <label for="pcepSeq">Order in the list</label>
            <input type="number" id="pcepSeq" value="${Number(p.sequence ?? 0)}" min="0" max="9999" style="max-width:120px">
        </div>

        <div class="pce-bar" style="margin:16px 0 0">
            <button type="button" class="pce-btn primary" id="pcepSave">Save</button>
            <button type="button" class="pce-btn" id="pcepCancel">Cancel</button>
        </div>
    </div>`;

    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.querySelector("#pcepCancel").onclick = close;

    wrap.querySelector("#pcepSave").onclick = async () => {
        const res = await api("/portal-estimate-packages", "POST", {
            package_id: p.package_id,
            patient_label: wrap.querySelector("#pcepLabel").value.trim(),
            patient_blurb: wrap.querySelector("#pcepBlurb").value.trim(),
            is_patient_visible: wrap.querySelector("#pcepVisible").checked ? 1 : 0,
            hide_reason: wrap.querySelector("#pcepHide").value.trim(),
            sequence: Number(wrap.querySelector("#pcepSeq").value || 0),
        }).catch(() => null);

        if (!res?.success) {
            showToast(res?.message || "That did not work.", "error");
            return;
        }

        showToast(res.message, "success");
        close();
        loadPackages($("pcepQ")?.value.trim() || "");
    };
}
