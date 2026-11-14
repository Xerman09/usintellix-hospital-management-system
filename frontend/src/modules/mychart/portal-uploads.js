import { api, API_URL } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Patient Uploads (tab "portal_uploads").
 *
 * The review queue for files patients send in through My Chart (Phase M11):
 * insurance cards, identification, outside results, photographs.
 *
 * Nothing a patient sends is part of the record until somebody here accepts it.
 * Accepting copies the file into the patient's documents; rejecting requires a
 * reason, because the patient reads it and otherwise just sends the same
 * unreadable photograph again.
 *
 * The files are not fetchable by URL -- the directory denies plain GETs -- so the
 * preview goes through /portal-uploads/file, which re-checks the session.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let status = "pending";

const KIND_LABELS = {
    insurance_card: "Insurance card",
    identification: "Identification",
    outside_result: "Outside result",
    photo: "Photograph",
    other: "Other"
};

// Object URLs handed out for previews, revoked when the screen reloads so a long
// shift at the desk does not accumulate blobs.
let objectUrls = [];

/**
 * A displayable URL for one upload.
 *
 * The bytes are fetched rather than pointed at with <img src> on purpose: in
 * production the API is a different origin from the page (api-url.js), so an
 * img/iframe request would only carry the session cookie if it were marked
 * SameSite=None, and otherwise silently 401s. An explicit fetch with
 * credentials always sends it, and the resulting blob URL needs no auth at all.
 */
async function previewUrl(id) {
    const res = await fetch(`${API_URL}/portal-uploads/file?id=${Number(id)}`, { credentials: "include" });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const url = URL.createObjectURL(await res.blob());
    objectUrls.push(url);

    return url;
}

function releasePreviews() {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    objectUrls = [];
}

export function PortalUploadsView() {
    return `
<style>
.pup { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pup h1 { margin: 0; font-size: 22px; }
.pup .pup-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pup input, .pup textarea, .pup select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pup-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pup-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pup-btn.primary { background: #15803d; border-color: #15803d; color: #fff; }
.pup-btn.danger { background: var(--bg-surface); border-color: #fecaca; color: #b91c1c; }
.pup-btn.on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pup-btn:disabled { opacity: .55; cursor: default; }
.pup-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pup-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pup-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pup-table th, .pup-table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pup-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pup-table tr:last-child td { border-bottom: 0; }
.pup-sub { color: var(--text-muted); font-size: 12px; }
.pup-pill { display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
.pup-pill.pending { background: #fffbeb; color: #92400e; }
.pup-pill.accepted { background: #dcfce7; color: #166534; }
.pup-pill.rejected { background: #fee2e2; color: #991b1b; }
.pup-kind { display: inline-block; border: 1px solid var(--border-color); border-radius: 999px; padding: 0 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); }
.pup-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pup-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pup-counts b { font-size: 18px; margin-right: 4px; }
.pup-thumb { width: 54px; height: 54px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); cursor: zoom-in; display: block; }
.pup-filebox { display: flex; align-items: center; gap: 9px; }
.pup-rejectrow { display: flex; gap: 8px; margin-top: 7px; }
.pup-rejectrow input { flex: 1 1 200px; }
.pup-viewer { position: fixed; inset: 0; background: rgba(15,23,42,.82); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 24px; }
.pup-viewer img, .pup-viewer iframe { max-width: 94vw; max-height: 90vh; background: #fff; border-radius: 10px; }
.pup-viewer iframe { width: 90vw; height: 88vh; border: 0; }
.pup-rules { border: 1px solid var(--border-color); border-left: 3px solid #15803d; border-radius: 8px; background: var(--bg-surface-alt); padding: 10px 12px; margin-bottom: 12px; font-size: 12.5px; line-height: 1.55; }
</style>
<div class="pup">
    <h1>Patient uploads</h1>
    <p class="pup-intro">Files patients have sent in through My Chart. Nothing here is part of a patient's record until
        you accept it — accepting files a copy into their documents. Rejecting asks for a reason, which the patient reads,
        so write something they can act on ("the card is cut off at the bottom", not "unclear").</p>
    <div id="pupBody"><div class="pup-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalUploads() {
    await load();
}

async function load(q = "") {
    const params = new URLSearchParams({ status });
    if (q) params.set("q", q);

    const res = await api(`/portal-uploads?${params.toString()}`).catch(() => null);
    const body = $("pupBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pup-sub" style="padding:24px;text-align:center">Could not load the uploads. ${esc(res?.message || "")}</div>`;
        return;
    }

    releasePreviews();
    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pupBody");
    const canDecide = !!data.can_decide;

    body.innerHTML = `
        <div class="pup-counts">
            <div><b>${data.counts.pending}</b>waiting</div>
            <div><b>${data.counts.accepted}</b>accepted</div>
            <div><b>${data.counts.rejected}</b>rejected</div>
        </div>
        ${canDecide && data.counts.pending > 0 ? `<div class="pup-rules">
            <strong>Before you accept:</strong> check the name on the document matches the patient, that it is readable
            end to end, and that it is what the patient says it is. An accepted file becomes part of the record.
        </div>` : ""}
        <div class="pup-bar">
            ${["pending", "accepted", "rejected", "all"].map((s) =>
                `<button type="button" class="pup-btn ${s === status ? "on" : ""}" data-status="${s}">${s[0].toUpperCase()}${s.slice(1)}</button>`
            ).join("")}
            <input type="search" id="pupQ" value="${esc(q)}" placeholder="Patient name, number or caption" aria-label="Find an upload" style="min-width:250px">
        </div>
        <div class="pup-card">
            <table class="pup-table">
                <thead><tr><th>File</th><th>Patient</th><th>What it is</th><th>Sent</th><th>Status</th><th></th></tr></thead>
                <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                    : `<tr><td colspan="6" class="pup-sub" style="padding:22px;text-align:center">Nothing ${status === "all" ? "here" : `is ${esc(status)}`}.</td></tr>`}</tbody>
            </table>
        </div>`;

    body.querySelectorAll("[data-status]").forEach((b) => {
        b.onclick = () => {
            status = b.dataset.status;
            load($("pupQ")?.value.trim() || "");
        };
    });

    const search = $("pupQ");
    let t = null;
    search.oninput = (e) => {
        clearTimeout(t);
        const v = e.target.value;
        t = setTimeout(() => load(v.trim()), 350);
    };

    body.querySelectorAll("[data-view]").forEach((el) => {
        el.onclick = () => viewer(Number(el.dataset.view), el.dataset.mime);
    });

    // Thumbnails load after the table is on screen, each one fetched with the
    // session rather than pointed at. A single failure leaves one placeholder
    // rather than breaking the queue.
    body.querySelectorAll("[data-thumb]").forEach(async (img) => {
        try {
            img.src = await previewUrl(Number(img.dataset.thumb));
        } catch (e) {
            img.removeAttribute("data-view");
            img.insertAdjacentHTML("afterend", `<span class="pup-sub">preview unavailable</span>`);
            img.remove();
        }
    });

    if (canDecide) {
        body.querySelectorAll("[data-accept]").forEach((b) => {
            b.onclick = () => decide(Number(b.dataset.accept), "accept", "", b);
        });
        body.querySelectorAll("[data-reject]").forEach((b) => {
            b.onclick = () => {
                const id = Number(b.dataset.reject);
                const note = $(`pupNote_${id}`)?.value.trim() || "";
                if (note === "") {
                    showToast("Say why, so the patient knows what to send instead.", "error", 5000);
                    $(`pupNote_${id}`)?.focus();
                    return;
                }
                decide(id, "reject", note, b);
            };
        });
    }
}

function rowHtml(r) {
    return `<tr>
        <td>
            <div class="pup-filebox">
                ${r.is_image
                    ? `<img class="pup-thumb" alt="${esc(r.original_filename)}" data-thumb="${r.id}" data-view="${r.id}" data-mime="${esc(r.mime_type)}">`
                    : `<button type="button" class="pup-btn" data-view="${r.id}" data-mime="${esc(r.mime_type)}">Open PDF</button>`}
                <div>
                    <div>${esc(r.original_filename)}</div>
                    <div class="pup-sub">${r.size_kb} KB</div>
                </div>
            </div>
        </td>
        <td>${esc(r.patient_name || "—")}<div class="pup-sub">${esc(r.patient_no || "")}</div></td>
        <td><span class="pup-kind">${esc(KIND_LABELS[r.kind] || r.kind)}</span>
            ${r.caption ? `<div style="margin-top:3px">${esc(r.caption)}</div>` : ""}</td>
        <td class="pup-sub">${esc(String(r.created_at || "").slice(0, 16))}</td>
        <td>
            <span class="pup-pill ${esc(r.status)}">${esc(r.status)}</span>
            ${r.review_note ? `<div class="pup-sub" style="margin-top:3px">${esc(r.review_note)}</div>` : ""}
            ${r.reviewed_at ? `<div class="pup-sub">${esc(String(r.reviewed_at).slice(0, 16))}</div>` : ""}
        </td>
        <td style="text-align:right;white-space:nowrap">
            ${r.status === "pending" && data.can_decide ? `
                <button type="button" class="pup-btn primary" data-accept="${r.id}">Accept</button>
                <div class="pup-rejectrow">
                    <input type="text" id="pupNote_${r.id}" placeholder="Reason, which the patient reads" maxlength="255">
                    <button type="button" class="pup-btn danger" data-reject="${r.id}">Reject</button>
                </div>` : ""}
            ${r.status === "accepted" && r.document_id ? `<span class="pup-sub">Filed as document #${r.document_id}</span>` : ""}
        </td>
    </tr>`;
}

async function decide(id, decision, note, btn) {
    btn.disabled = true;

    const res = await api("/portal-uploads/review", {
        method: "POST",
        body: JSON.stringify({ id, decision, note })
    }).catch(() => null);

    btn.disabled = false;

    if (!res?.success) {
        showToast(res?.message || "Could not save that decision.", "error", 6000);
        return;
    }

    showToast(res.message, "success", 5000);
    await load($("pupQ")?.value.trim() || "");
}

/** Full-size look at one file. Escape or a click outside closes it. */
async function viewer(id, mime) {
    let url;

    try {
        url = await previewUrl(id);
    } catch (e) {
        showToast("That file could not be opened.", "error", 5000);
        return;
    }

    const wrap = document.createElement("div");
    wrap.className = "pup-viewer";
    wrap.innerHTML = String(mime).startsWith("image/")
        ? `<img src="${url}" alt="Patient upload">`
        : `<iframe src="${url}" title="Patient upload"></iframe>`;

    const close = () => {
        wrap.remove();
        document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => {
        if (e.key === "Escape") close();
    };

    wrap.onclick = (e) => {
        if (e.target === wrap) close();
    };
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
}
