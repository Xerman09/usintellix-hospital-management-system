import { api, API_URL } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { esc, when, waited, dtl, modal, modalityTag } from "./rad-ui.js?v=4";

/*
 * Radiology reports (module 15, Phase 2) inside the Radiology Worklist: "To report" (studies performed, STAT first,
 * with the request, what was done and the images) and "Reported" (signed in the last week). The radiologist writes
 * technique, comparison, findings, impression and recommendation, says whether it is normal, abnormal or a critical
 * finding, and signs it. Signing puts the conclusion in the chart and the results inbox; a critical finding alerts
 * the ordering doctor and the patient's nurse. A signed report can be given an addendum or a correction.
 * The images open in the hospital's existing DICOM viewer.
 */

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);
let ctx = null; // { root, data, reload }

const CONC = { normal: ["Normal", "rad-flag ok"], abnormal: ["Abnormal", "rad-flag"], critical: ["CRITICAL FINDING", "rad-flag bad"] };
const concBadge = (c) => (CONC[c] ? `<span class="${CONC[c][1]}">${CONC[c][0]}</span>` : "");
const STATE = { draft: "Draft", signed: "Signed", superseded: "Replaced" };

/** The report views of the worklist. */
export async function loadReports(root, state, reload) {
    const q = new URLSearchParams({ view: state.view === "reported" ? "reported" : "read", ...(state.modality ? { modality: state.modality } : {}), ...(state.q ? { q: state.q } : {}) });
    const r = await api(`/radiology/reports?${q}`).catch(() => null);
    if (!r?.success) return { error: r?.message || "Could not load the reading list." };
    ctx = { root, data: r.data, reload };
    return r.data;
}

/** Rows of the current report view. */
export function reportsHtml(d) {
    if (!d.items.length) {
        return `<div class="rad-empty">${d.view === "read" ? "Nothing waiting to be reported." : "No reports signed in the last week."}</div>`;
    }
    return `<div class="rad-list">${d.items.map((x) => studyCard(d, x)).join("")}</div>`;
}

function studyCard(d, x) {
    const p = x.patient;
    const rep = x.report;
    const read = d.view === "read";
    const safety = [
        x.safety.pregnancy === "yes" ? `<span class="rad-flag bad">Pregnant</span>` : "",
        x.safety.contrast_allergy === "yes" ? `<span class="rad-flag bad">Contrast reaction</span>` : "",
        x.safety.implants === "yes" ? `<span class="rad-flag">Metal / implant</span>` : "",
        x.safety.creatinine !== null && x.safety.creatinine >= 1.5 ? `<span class="rad-flag">Creatinine ${x.safety.creatinine}</span>` : "",
    ].join("");
    return `<div class="rad-req ${esc(x.priority)}${rep?.conclusion === "critical" && rep.status === "signed" ? " crit" : ""}">
        <div>
            <div>${x.priority !== "routine" ? `<span class="rad-pri ${esc(x.priority)}">${esc(d.priorities[x.priority])}</span> ` : ""}<span class="who">${esc(p.name)}</span></div>
            <div class="muted">${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}${p.sex ? ` · ${esc(String(p.sex).charAt(0).toUpperCase())}` : ""}</div>
            <div class="muted" style="font-size:12px">${esc(x.location || x.source_label)}${x.ordering_doctor ? ` · ordered by ${esc(x.ordering_doctor)}` : ""}</div>
            <div>${safety}</div>
        </div>
        <div>
            <div>${modalityTag(x.modality, x.study)}${x.images.length ? `<span class="muted" style="font-size:12px">${x.images.length} image${x.images.length === 1 ? "" : "s"}</span>` : `<span class="rad-flag">no images</span>`}</div>
            ${x.indication ? `<div>${esc(x.indication)}</div>` : ""}
            <div class="muted" style="font-size:12px">${esc(x.request_no)} · done ${esc(when(x.performed_at))}${x.performed_by ? ` by ${esc(x.performed_by)}` : ""}${x.room ? ` · ${esc(x.room)}` : ""}</div>
            ${x.technique ? `<div class="muted" style="font-size:12px">${esc(x.technique)}${x.contrast_given ? ` · contrast given${x.contrast_detail ? ` (${esc(x.contrast_detail)})` : ""}` : ""}${x.dose ? ` · ${esc(x.dose)}` : ""}</div>` : ""}
            ${rep ? `<div class="rad-study">${concBadge(rep.conclusion)} <span class="rad-state ${esc(rep.status)}">${rep.version > 1 ? `v${rep.version} · ` : ""}${esc(STATE[rep.status] || rep.status)}</span>
                ${rep.status === "signed" ? `<span class="muted" style="font-size:12px">${esc(when(rep.signed_at))} by ${esc(rep.signed_by || "")}</span>` : rep.saved_at ? `<span class="muted" style="font-size:12px">saved ${esc(when(rep.saved_at))}${rep.saved_by ? ` by ${esc(rep.saved_by)}` : ""}</span>` : ""}</div>
                ${rep.impression ? `<div style="font-size:12.5px"><b>Impression:</b> ${esc(rep.impression)}</div>` : ""}
                ${rep.critical_note && rep.status === "signed" ? `<div class="rbx-note warn" style="font-size:12.5px;margin-top:4px"><b>Critical:</b> ${esc(rep.critical_note)} — the ordering doctor and the patient's nurse were alerted.</div>` : ""}` : ""}
        </div>
        <div class="acts">
            <div style="width:100%;text-align:right">${read ? (x.overdue ? `<span class="rad-late">waiting ${esc(waited(x.minutes_waiting))}</span>` : `<span class="muted">waiting ${esc(waited(x.minutes_waiting))}</span>`) : ""}</div>
            ${x.images.length ? `<button type="button" class="rad-b sm" data-viewer="${x.order_id}">Open images</button>` : ""}
            ${read && d.can_report ? `<button type="button" class="rad-b blue sm" data-write="${x.order_id}">${rep ? "Continue the report…" : "Write the report…"}</button>`
                : rep?.status === "signed" ? `<button type="button" class="rad-b sm" data-viewreport="${x.order_id}">Read the report</button>
                    ${d.can_report ? `<button type="button" class="rad-b sm" data-amend="${x.order_id}">Addendum / correct…</button>` : ""}` : ""}
        </div></div>`;
}

/** Clicks in the report views. Returns true when handled. */
export async function onReportsClick(e) {
    const v = e.target.closest("[data-viewer]");
    if (v) return openViewer(Number(v.dataset.viewer)), true;
    const w = e.target.closest("[data-write]");
    if (w) return openReport(Number(w.dataset.write), false), true;
    const a = e.target.closest("[data-amend]");
    if (a) return openReport(Number(a.dataset.amend), true), true;
    const rv = e.target.closest("[data-viewreport]");
    if (rv) return openSignedReport(Number(rv.dataset.viewreport)), true;
    if (e.target.closest("[data-radiologists]")) return openRadiologists(), true;
    return false;
}

/* ---------------- the DICOM viewer ---------------- */

/** Hand a study's images to the hospital's DICOM viewer and open it. */
export async function openViewer(orderId) {
    const r = await api(`/radiology/images?order_id=${orderId}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the images.", "error");
    if (!r.data.images.length) return showToast("No images have been uploaded for this study yet.", "error");
    try {
        sessionStorage.setItem("rad_viewer_study", JSON.stringify({ ...r.data, api_url: API_URL, at: Date.now() }));
    } catch (err) {
        return showToast("The browser would not keep the study for the viewer.", "error");
    }
    if (window.__openDashboardTab) {
        window.__openDashboardTab("misc_dicom_viewer", "DICOM Viewer");
    } else {
        showToast("Open Tools → DICOM Viewer to see the images.", "success");
    }
}

/* ---------------- performing the study (radiology) ---------------- */

/** Record what was done, then offer the image upload. */
export function openPerform(b, now, reload) {
    const m = modal(`Study done — ${esc(b.study)}`, `${esc(b.patient.name)} · ${esc(b.patient.mrn || "")} · booked ${esc(when(b.start_at))}`, `
        <div class="rbx-grid">
            <div><label for="rpAt">Done at <span style="font-weight:400">(blank = now)</span></label><input type="datetime-local" id="rpAt" name="performed_at" max="${esc(dtl(now))}"></div>
            <div><label for="rpDose">Dose <span style="font-weight:400">(optional)</span></label><input type="text" id="rpDose" name="dose" maxlength="50" placeholder="e.g. 0.1 mSv, 5 mGy·cm" autocomplete="off"></div>
        </div>
        <div><label for="rpTech">Technique — what was actually taken</label><input type="text" id="rpTech" name="technique" maxlength="500"
            value="${esc(b.technique || "")}" placeholder="e.g. AP erect portable chest radiograph; PA and lateral; axial 5 mm" autocomplete="off"></div>
        <label class="rbx-chk"><input type="checkbox" name="contrast_given" ${b.contrast && b.contrast !== "none" ? "checked" : ""}> Contrast was given</label>
        <div><label for="rpCd">Contrast given <span style="font-weight:400">(what and how much)</span></label><input type="text" id="rpCd" name="contrast_detail" maxlength="255"
            placeholder="e.g. 80 mL iohexol intravenously, no reaction" autocomplete="off"></div>`,
        `<button type="button" class="rad-b" data-x>Cancel</button><button type="button" class="rad-b blue" data-save>Done — upload the images</button>`);
    m.$("#rpTech").focus();
    m.$("[data-save]").onclick = async (ev) => {
        ev.target.disabled = true;
        const res = await post("/radiology/perform", { id: b.id, performed_at: m.val("performed_at"), technique: m.val("technique"),
            contrast_given: m.val("contrast_given"), contrast_detail: m.val("contrast_detail"), dose: m.val("dose") });
        ev.target.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not save.", res?.errors);
        m.close();
        showToast(res.message, "success", 6000);
        reload?.(true);
        openImages(res.data.order_id, reload);
    };
}

/* ---------------- images ---------------- */

const sizeText = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Upload and manage the study's images (radiology). */
export async function openImages(orderId, reload) {
    const r = await api(`/radiology/images?order_id=${orderId}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the images.", "error");
    const d = r.data;
    const list = (images) => images.length
        ? `<div class="rad-thumbs">${images.map((i) => `<figure data-img="${i.id}">
                ${i.is_dicom || i.mime_type === "application/pdf" ? `<div class="file">${i.is_dicom ? "DICOM" : "PDF"}</div>` : `<img src="${esc(API_URL + i.file_path)}" alt="${esc(i.series_desc || i.original_filename || "image")}" loading="lazy">`}
                <figcaption>${i.is_key ? `<b>Key</b> · ` : ""}${esc(i.series_desc || i.original_filename || "")}
                    <span class="muted">${esc(sizeText(i.file_size))}${i.uploaded_by ? ` · ${esc(i.uploaded_by)}` : ""}</span>
                    <button type="button" class="rad-b sm" data-del="${i.id}">Remove…</button></figcaption></figure>`).join("")}</div>`
        : `<div class="rad-empty">No images yet.</div>`;
    const m = modal(`Images — ${esc(d.study)}`, `${esc(d.patient.name)} · ${esc(d.patient.mrn || "")}${d.performed_at ? ` · done ${esc(when(d.performed_at))}` : ""}`, `
        <div data-list>${list(d.images)}</div>
        <fieldset><legend>Add an image</legend>
            <div><label for="riFile">File <span style="font-weight:400">(DICOM .dcm, JPEG, PNG or PDF, up to 40 MB each)</span></label>
                <input type="file" id="riFile" multiple accept=".dcm,.ima,image/*,application/pdf"></div>
            <div class="rbx-grid">
                <div><label for="riSeries">Series / view <span style="font-weight:400">(optional)</span></label><input type="text" id="riSeries" maxlength="150" placeholder="e.g. PA erect, axial 5 mm, post contrast" autocomplete="off"></div>
                <div><label class="rbx-chk" style="margin-top:18px"><input type="checkbox" id="riKey"> Key image (the one the report points at)</label></div>
            </div>
            <div><span class="lbl" data-prog></span></div>
        </fieldset>`,
        `<button type="button" class="rad-b" data-x>Close</button><button type="button" class="rad-b" data-open>Open in the DICOM viewer</button><button type="button" class="rad-b blue" data-up>Upload</button>`);
    const refresh = (images) => {
        m.$("[data-list]").innerHTML = list(images);
        reload?.(true);
    };
    m.$("[data-up]").onclick = async (ev) => {
        const input = m.$("#riFile");
        const files = [...(input.files || [])];
        if (!files.length) return m.err("Choose the image files to upload.");
        ev.target.disabled = true;
        let last = null;
        for (const [i, file] of files.entries()) {
            m.$("[data-prog]").textContent = `Uploading ${i + 1} of ${files.length}: ${file.name}…`;
            const body = new FormData();
            body.append("file", file);
            body.append("order_id", String(orderId));
            body.append("series_desc", m.$("#riSeries").value.trim());
            body.append("is_key", m.$("#riKey").checked && i === 0 ? "1" : "0");
            last = await fetch(`${API_URL}/radiology/images`, { method: "POST", credentials: "include", body }).then((x) => x.json()).catch(() => null);
            if (!last?.success) {
                ev.target.disabled = false;
                m.$("[data-prog]").textContent = "";
                return m.err(last?.message || `Could not upload ${file.name}.`);
            }
        }
        ev.target.disabled = false;
        m.$("[data-prog]").textContent = "";
        input.value = "";
        m.err("");
        showToast(`${files.length} image${files.length === 1 ? "" : "s"} uploaded.`, "success");
        refresh(last.data.images);
    };
    m.$("[data-open]").onclick = () => openViewer(orderId);
    m.ov.addEventListener("click", async (ev) => {
        const del = ev.target.closest("[data-del]");
        if (!del) return;
        const cap = del.parentElement;
        cap.innerHTML = `<input type="text" data-why placeholder="Why remove it?" aria-label="Why remove this image"
            style="border:1px solid var(--border-color);border-radius:6px;padding:3px 6px;background:var(--bg-surface);color:var(--text-primary);width:150px">
            <button type="button" class="rad-b sm" data-delgo="${del.dataset.del}">Remove</button>`;
        cap.querySelector("[data-why]").focus();
    });
    m.ov.addEventListener("click", async (ev) => {
        const go = ev.target.closest("[data-delgo]");
        if (!go) return;
        const why = go.parentElement.querySelector("[data-why]");
        if (!why.value.trim()) return why.focus();
        const res = await post("/radiology/images/delete", { id: Number(go.dataset.delgo), reason: why.value.trim() });
        if (!res?.success) return m.err(res?.message || "Could not remove it.");
        m.err("");
        showToast(res.message, "success");
        refresh(res.data.images);
    });
}

/* ---------------- writing the report ---------------- */

async function openReport(orderId, amend) {
    const r = await api(`/radiology/report/form?order_id=${orderId}${amend ? "&amend=1" : ""}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the report.", "error");
    const d = r.data;
    const p = d.patient;
    const dr = d.draft;
    const m = modal(`${dr.amending ? "Addendum / correction" : "Report"} — ${esc(d.study)}`,
        `${esc(p.name)} · ${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}${p.sex ? ` · ${esc(p.sex)}` : ""} · done ${esc(when(d.performed_at))}${d.priority !== "routine" ? ` · <b>${esc(String(d.priority).toUpperCase())}</b>` : ""}`, `
        <div class="rbx-note"><b>Why it was asked for:</b> ${esc(d.indication || "—")}${d.ordering_doctor ? ` <span class="muted">(${esc(d.ordering_doctor)}${d.location ? `, ${esc(d.location)}` : ""})</span>` : ""}</div>
        ${dr.amending ? `<div class="rbx-note warn">This report is already signed. A new version replaces it: the doctor's inbox shows it as corrected${dr.version ? ` (version ${dr.version})` : ""}.</div>` : ""}
        ${d.images.length ? `<div><span class="lbl">Images <span style="font-weight:400">(${d.images.length})</span></span>
            <div class="rad-thumbs small">${d.images.map((i) => `<figure>${i.is_dicom || i.mime_type === "application/pdf" ? `<div class="file">${i.is_dicom ? "DICOM" : "PDF"}</div>`
                : `<img src="${esc(API_URL + i.file_path)}" alt="${esc(i.series_desc || "image")}" loading="lazy">`}<figcaption>${i.is_key ? "<b>Key</b> · " : ""}${esc(i.series_desc || i.original_filename || "")}</figcaption></figure>`).join("")}</div>
            <div style="margin-top:4px"><button type="button" class="rad-b sm" data-openviewer>Open in the DICOM viewer</button></div></div>`
            : `<div class="rbx-note warn">No images have been uploaded for this study.</div>`}
        ${d.previous.length ? `<details><summary class="lbl" style="cursor:pointer">Previous reports of this patient (${d.previous.length})</summary>
            <div style="display:grid;gap:4px;margin-top:4px">${d.previous.map((x) => `<div style="font-size:12.5px"><b>${esc(x.study)}</b> <span class="muted">${esc(when(x.signed_at))}</span> — ${esc(x.impression || "")}
                <button type="button" class="rad-b sm" data-usecomp="${esc(`${x.study} of ${String(x.signed_at).slice(0, 10)}`)}">Use as comparison</button></div>`).join("")}</div></details>` : ""}
        <div><label for="rrTech">Technique</label><input type="text" id="rrTech" name="technique" maxlength="500" value="${esc(dr.technique || "")}" autocomplete="off"></div>
        <div><label for="rrComp">Comparison <span style="font-weight:400">(optional)</span></label><input type="text" id="rrComp" name="comparison" maxlength="500"
            value="${esc(dr.comparison || "")}" placeholder="e.g. chest X-ray of 2 Oct 2026" autocomplete="off"></div>
        <div><label for="rrFind">Findings</label><textarea id="rrFind" name="findings" rows="7" placeholder="What is seen, side by side with the question asked.">${esc(dr.findings || "")}</textarea></div>
        <div><label for="rrImp">Impression <span style="font-weight:400">(what it means — the doctor reads this first)</span></label><textarea id="rrImp" name="impression" rows="3">${esc(dr.impression || "")}</textarea></div>
        <div><label for="rrRec">Recommendation <span style="font-weight:400">(optional)</span></label><input type="text" id="rrRec" name="recommendation" maxlength="500"
            value="${esc(dr.recommendation || "")}" placeholder="e.g. repeat in 6 weeks; CT to characterise" autocomplete="off"></div>
        <div><span class="lbl" id="rrConcL">Conclusion</span><div class="rbx-seg" data-field="conclusion" role="radiogroup" aria-labelledby="rrConcL">
            ${Object.entries(d.conclusions).map(([k, l]) => `<label class="${k === "critical" ? "stat" : k === "abnormal" ? "yes" : ""}"><input type="radio" name="conclusion" value="${k}" ${dr.conclusion === k ? "checked" : ""}> ${esc(l)}</label>`).join("")}
        </div></div>
        <div data-crit ${dr.conclusion === "critical" ? "" : "hidden"}>
            <label for="rrCrit">The critical finding in one line <span style="font-weight:400">(this is what the alert shows the doctor)</span></label>
            <input type="text" id="rrCrit" name="critical_note" maxlength="255" value="${esc(dr.critical_note || "")}" placeholder="e.g. large left pneumothorax — needs a chest drain now" autocomplete="off">
            <div class="rbx-note warn" style="margin-top:6px">Signing a critical finding alerts the ordering doctor and the patient's nurse at once; they must acknowledge it with a read-back.</div>
        </div>
        ${dr.amending ? `<div class="rbx-grid">
            <div><label for="rrWhy">Why the report is changed</label><input type="text" id="rrWhy" name="change_reason" maxlength="255" value="${esc(dr.change_reason || "")}"
                placeholder="e.g. re-read with the lateral film; typing error" autocomplete="off"></div>
            <div><span class="lbl">What kind of change</span><div class="rbx-seg" role="radiogroup" aria-label="What kind of change">
                <label><input type="radio" name="is_addendum" value="1" ${dr.is_addendum ? "checked" : ""}> Addendum (adds to it)</label>
                <label><input type="radio" name="is_addendum" value="0" ${dr.is_addendum ? "" : "checked"}> Correction (replaces it)</label></div></div>
        </div>` : ""}`,
        `<button type="button" class="rad-b" data-x>Cancel</button><button type="button" class="rad-b" data-save="0">Save draft</button>
         <button type="button" class="rad-b blue" data-save="1" ${d.can_sign ? "" : "disabled title='Only a radiologist can sign'"}>Sign the report</button>`);
    m.ov.querySelector(".rbx").classList.add("wide");
    m.ov.querySelectorAll('input[name="conclusion"]').forEach((x) => x.addEventListener("change", () => {
        m.$("[data-crit]").hidden = m.val("conclusion") !== "critical";
        if (m.val("conclusion") === "critical") m.$("#rrCrit").focus();
    }));
    m.ov.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-openviewer]")) return openViewer(orderId);
        const c = ev.target.closest("[data-usecomp]");
        if (c) {
            m.$("#rrComp").value = c.dataset.usecomp;
            m.$("#rrComp").focus();
        }
    });
    if (!d.can_sign) {
        m.$(".rbx-foot").insertAdjacentHTML("afterbegin", `<span class="muted" style="font-size:12.5px;margin-right:auto">You can keep a draft; a radiologist signs it.</span>`);
    }
    m.$("#rrFind").focus();
    m.ov.querySelectorAll("[data-save]").forEach((b) => (b.onclick = async () => {
        const body = {
            order_id: orderId, technique: m.val("technique"), comparison: m.val("comparison"), findings: m.$("#rrFind").value.trim(),
            impression: m.$("#rrImp").value.trim(), recommendation: m.val("recommendation"), conclusion: m.val("conclusion"),
            critical_note: m.val("critical_note"), change_reason: m.val("change_reason"), is_addendum: m.val("is_addendum"), sign: Number(b.dataset.save),
        };
        b.disabled = true;
        const res = await post("/radiology/report/save", body);
        b.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not save the report.", res?.errors);
        m.close();
        showToast(res.message, res.data?.critical ? "error" : "success", res.data?.critical ? 10000 : 6000);
        ctx?.reload(true);
        if (b.dataset.save === "0") openReport(orderId, amend);
    }));
}

/* ---------------- reading a signed report ---------------- */

async function openSignedReport(orderId) {
    const r = await api(`/radiology/report?order_id=${orderId}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the report.", "error");
    const d = r.data;
    const rep = d.report;
    const m = modal(`${esc(d.study)} — report`, `${esc(d.patient.name)} · ${esc(d.patient.mrn || "")} · done ${esc(when(d.performed_at))}`,
        reportHtml(d, rep) + (d.versions.length > 1
            ? `<details><summary class="lbl" style="cursor:pointer">Earlier versions (${d.versions.length - 1})</summary>
                ${d.versions.filter((v) => v.version !== rep.version).map((v) => `<div style="margin-top:6px">${reportHtml(d, v, true)}</div>`).join("")}</details>`
            : ""),
        `<button type="button" class="rad-b" data-x>Close</button>${d.images.length ? `<button type="button" class="rad-b" data-openviewer>Open images</button>` : ""}
         <button type="button" class="rad-b blue" data-print>Print</button>`);
    m.ov.querySelector(".rbx").classList.add("wide");
    m.ov.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-openviewer]")) openViewer(orderId);
    });
    m.$("[data-print]").onclick = () => printReport(d, rep);
}

function reportHtml(d, rep, old = false) {
    return `<div class="rad-rep ${old ? "old" : ""}">
        <div>${concBadge(rep.conclusion)} <span class="rad-state ${esc(rep.status)}">${rep.version > 1 ? `v${rep.version}${rep.is_addendum ? " addendum" : " correction"} · ` : ""}${esc(STATE[rep.status] || rep.status)}</span>
            <span class="muted" style="font-size:12px">${esc(when(rep.signed_at))} by ${esc(rep.signed_by || "")}${rep.signed_by_license ? ` (lic. ${esc(rep.signed_by_license)})` : ""}</span></div>
        ${rep.change_reason ? `<div class="muted">Why changed: ${esc(rep.change_reason)}</div>` : ""}
        ${rep.technique ? `<div><b>Technique.</b> ${esc(rep.technique)}</div>` : ""}
        ${rep.comparison ? `<div><b>Comparison.</b> ${esc(rep.comparison)}</div>` : ""}
        ${rep.findings ? `<div><b>Findings.</b><div class="rad-text">${esc(rep.findings)}</div></div>` : ""}
        ${rep.impression ? `<div><b>Impression.</b><div class="rad-text">${esc(rep.impression)}</div></div>` : ""}
        ${rep.recommendation ? `<div><b>Recommendation.</b> ${esc(rep.recommendation)}</div>` : ""}
        ${rep.critical_note ? `<div class="rbx-note warn"><b>Critical finding:</b> ${esc(rep.critical_note)}</div>` : ""}
    </div>`;
}

function printReport(d, rep) {
    const win = window.open("", "_blank");
    if (!win) return showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
    const p = d.patient;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.study)} — ${esc(p.name)}</title>
<style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11pt; line-height: 1.4; }
    h1 { font-size: 15pt; margin: 0 0 2px; } h2 { font-size: 10.5pt; margin: 12px 0 2px; text-transform: uppercase; }
    .id { border: 1.5px solid #111; padding: 6px 10px; margin: 8px 0; } .id b { font-size: 13pt; }
    .sub { color: #444; font-size: 9.5pt; } .crit { border: 2px solid #b91c1c; color: #7f1d1d; padding: 6px 10px; margin: 8px 0; font-weight: bold; }
    .text { white-space: pre-wrap; } footer { margin-top: 18px; font-size: 9pt; color: #555; border-top: 1px solid #bbb; padding-top: 4px; }
    .sign { margin-top: 24px; } .sign div { border-top: 1px solid #111; width: 70mm; padding-top: 3px; font-size: 9.5pt; }
    .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; } @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>Radiology report</h1>
<div class="sub">${esc(d.request_no)} · ${esc(d.modality_label)}${d.priority !== "routine" ? ` · ${esc(String(d.priority).toUpperCase())}` : ""}${rep.version > 1 ? ` · version ${rep.version} (${rep.is_addendum ? "addendum" : "correction"})` : ""}</div>
<div class="id"><b>${esc(p.name)}</b><br>MRN ${esc(p.mrn || "—")} · born ${esc(p.birthdate || "?")}${p.age !== null ? ` (${p.age} y)` : ""}${p.sex ? ` · ${esc(p.sex)}` : ""}${d.location ? ` · ${esc(d.location)}` : ""}</div>
<h2>Study</h2><div>${esc(d.study)} — performed ${esc(when(d.performed_at))}${d.room ? `, ${esc(d.room)}` : ""}</div>
<h2>Reason for the study</h2><div>${esc(d.indication || "—")}${d.ordering_doctor ? ` <span class="sub">(requested by ${esc(d.ordering_doctor)})</span>` : ""}</div>
${rep.technique ? `<h2>Technique</h2><div>${esc(rep.technique)}${d.contrast_given ? ` Contrast given${d.contrast_detail ? `: ${esc(d.contrast_detail)}` : ""}.` : ""}${d.dose ? ` Dose ${esc(d.dose)}.` : ""}</div>` : ""}
${rep.comparison ? `<h2>Comparison</h2><div>${esc(rep.comparison)}</div>` : ""}
${rep.findings ? `<h2>Findings</h2><div class="text">${esc(rep.findings)}</div>` : ""}
${rep.impression ? `<h2>Impression</h2><div class="text">${esc(rep.impression)}</div>` : ""}
${rep.recommendation ? `<h2>Recommendation</h2><div>${esc(rep.recommendation)}</div>` : ""}
${rep.critical_note ? `<div class="crit">CRITICAL FINDING: ${esc(rep.critical_note)} — the ordering doctor and the patient's nurse were alerted when this report was signed.</div>` : ""}
${rep.change_reason ? `<div class="sub">This version: ${esc(rep.change_reason)}</div>` : ""}
<div class="sign"><div>${esc(rep.signed_by || "")}${rep.signed_by_license ? `, licence ${esc(rep.signed_by_license)}` : ""}<br>Radiologist · signed ${esc(when(rep.signed_at))}</div></div>
<footer>Electronically signed in the hospital information system. ${d.images.length} image${d.images.length === 1 ? "" : "s"} on file.</footer>
</body></html>`);
    win.document.close();
}

/* ---------------- radiologists (admin) ---------------- */

async function openRadiologists() {
    const r = await api("/radiology/radiologists").catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not load the doctors.", "error");
    const m = modal("Radiologists", "Only a doctor marked here can sign an imaging report.", r.data.length
        ? `<table class="rad-tbl"><thead><tr><th>Doctor</th><th>Radiologist</th><th>Licence no.</th><th></th></tr></thead><tbody>
            ${r.data.map((u) => `<tr data-user="${u.id}"><td><b>${esc(u.name)}</b> <span class="muted">${esc(u.username)} · ${esc(String(u.role).replace("_", " "))}</span></td>
                <td><input type="checkbox" data-rad ${Number(u.radiologist) ? "checked" : ""} aria-label="${esc(u.name)} is a radiologist"></td>
                <td><input type="text" data-lic value="${esc(u.license_no || "")}" maxlength="50" aria-label="${esc(u.name)} licence number"></td>
                <td><button type="button" class="rad-b sm" data-saverad>Save</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="rad-empty">No doctors on file.</div>`,
        `<button type="button" class="rad-b" data-x>Close</button>`);
    m.ov.querySelector(".rbx").classList.add("wide");
    m.ov.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-saverad]");
        if (!b) return;
        const tr = b.closest("tr");
        b.disabled = true;
        const res = await post("/radiology/radiologists", { user_id: Number(tr.dataset.user), radiologist: tr.querySelector("[data-rad]").checked ? 1 : 0,
            license_no: tr.querySelector("[data-lic]").value.trim() });
        b.disabled = false;
        if (!res?.success) {
            tr.querySelector("[data-lic]").setAttribute("aria-invalid", "true");
            return m.err(res?.message || "Could not save.");
        }
        tr.querySelector("[data-lic]").removeAttribute("aria-invalid");
        m.err("");
        showToast(res.message, "success");
        ctx?.reload(true);
    });
}
