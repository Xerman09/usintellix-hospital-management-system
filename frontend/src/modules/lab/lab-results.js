import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { esc, when, waited, tube, modal } from "./lab-ui.js?v=2";

/*
 * Lab results (module 14, Phase 2) inside the Lab Worklist: "To result" (collected specimens: type the results of
 * their tests, save a draft or send for verification), "To verify" (a medical technologist checks -- critical first,
 * with the patient's previous value -- and releases, or returns to the bench) and "Released" (last 24 h; correct a
 * released result). Released results reach the chart, the critical value alerts and the results inbox.
 */

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);
let ctx = null; // { root, data, reload }

const FLAG = { critical: ["CRITICAL", "lab-fl crit"], abnormal: ["Abnormal", "lab-fl abn"], normal: ["Normal", "lab-fl ok"] };
const flagBadge = (v) => (v.flag && FLAG[v.flag] ? `<span class="${FLAG[v.flag][1]}" title="${esc(v.flag_detail || "")}">${FLAG[v.flag][0]}</span>` : "");
const STATE = { draft: "Draft", returned: "Returned", entered: "Waiting for verification", released: "Released" };

/** The results views of the worklist. */
export async function loadResults(root, state, reload) {
    const q = new URLSearchParams({ view: state.view, ...(state.section ? { section: state.section } : {}), ...(state.q ? { q: state.q } : {}) });
    const r = await api(`/lab/results?${q}`).catch(() => null);
    if (!r?.success) return { error: r?.message || "Could not load the results." };
    ctx = { root, data: r.data, reload };
    return r.data;
}

/** Rows of the current results view. */
export function resultsHtml(d) {
    if (d.view === "enter") {
        return d.items.length ? `<div class="lab-list">${d.items.map((x) => `<div class="lab-req ${esc(x.priority)}">
            <div><div>${x.priority !== "routine" ? `<span class="lab-pri ${esc(x.priority)}">${esc(d.priorities[x.priority])}</span> ` : ""}<span class="who">${esc(x.patient.name)}</span></div>
                <div class="muted">${esc(x.patient.mrn || "")}${x.patient.age !== null ? ` · ${x.patient.age} y` : ""}${x.patient.sex ? ` · ${esc(String(x.patient.sex).charAt(0).toUpperCase())}` : ""}</div>
                <div>${esc(x.location || "")}</div></div>
            <div><div>${tube(x.specimen.container, d.containers, `<span class="lab-acc">${esc(x.specimen.accession_no)}</span>`)} <span class="muted">collected ${esc(when(x.specimen.collected_at))}</span></div>
                ${x.tests.map((t) => `<div><b>${esc(t.name)}</b>${t.state ? ` <span class="lab-state ${esc(t.state)}">${t.correction ? `Correction v${t.version} · ` : ""}${esc(STATE[t.state] || t.state)}</span>` : ""}
                    ${t.return_reason && t.state === "returned" ? `<div class="muted" style="font-size:12px">Returned: ${esc(t.return_reason)}</div>` : ""}</div>`).join("")}
                ${x.clinical_info ? `<div class="muted" style="font-size:12px">${esc(x.clinical_info)}</div>` : ""}</div>
            <div class="acts"><div style="width:100%;text-align:right" class="muted">${esc(waited(Math.max(0, x.minutes)))} since collection</div>
                ${d.can_enter ? `<button type="button" class="lab-b blue sm" data-enter="${x.tests.map((t) => t.order_id).join(",")}">Enter results…</button>` : ""}</div></div>`).join("")}</div>`
            : `<div class="lab-empty">No specimens waiting for results.</div>`;
    }
    if (!d.items.length) return `<div class="lab-empty">${d.view === "verify" ? "Nothing waiting for verification." : "Nothing released in the last 24 hours."}</div>`;
    return `<div class="lab-list">${d.items.map((x) => setCard(d, x)).join("")}</div>`;
}

function setCard(d, x) {
    const verify = d.view === "verify";
    const typed = x.values.filter((v) => v.value !== null && v.value !== "");
    return `<div class="lab-res ${x.critical ? "crit" : ""}">
        <div class="top"><div>${x.priority !== "routine" ? `<span class="lab-pri ${esc(x.priority)}">${esc(d.priorities[x.priority])}</span> ` : ""}<b>${esc(x.test.name)}</b>
            ${x.version > 1 ? ` <span class="lab-state returned">Correction v${x.version}</span>` : ""}${x.status === "superseded" ? ` <span class="lab-state">Replaced by a correction</span>` : ""}
            · <span class="who">${esc(x.patient?.name || "")}</span> <span class="muted">${esc(x.patient?.mrn || "")}${x.location ? ` · ${esc(x.location)}` : ""}</span></div>
            <div class="muted" style="font-size:12px">${x.specimen ? `<span class="lab-acc">${esc(x.specimen.accession_no)}</span> · ` : ""}entered ${esc(when(x.entered_at))}${x.entered_by ? ` by ${esc(x.entered_by)}` : ""}${x.verified_at ? ` · released ${esc(when(x.verified_at))} by ${esc(x.verified_by || "")}` : ""}</div></div>
        ${x.correction_reason ? `<div class="muted">Why corrected: ${esc(x.correction_reason)}</div>` : ""}
        ${x.critical ? `<div class="lbx-note warn"><b>${x.critical} critical value${x.critical === 1 ? "" : "s"}.</b> ${verify ? "Releasing alerts the doctor and the patient's nurse (they must acknowledge it)." : "Alerted to the doctor and the patient's nurse when released."}</div>` : ""}
        <table class="lab-vals"><thead><tr><th>Result</th><th>Value</th><th>Units</th><th>Reference</th><th>Flag</th>${verify ? "<th>Previous</th>" : ""}</tr></thead><tbody>
            ${typed.map((v) => `<tr class="${v.flag === "critical" ? "crit" : ""}"><td>${esc(v.name)}</td><td class="v">${esc(v.value)}</td><td>${esc(v.units || "")}</td><td>${esc(v.reference_range || "")}</td><td>${flagBadge(v)}</td>
                ${verify ? `<td class="muted">${v.previous ? `${esc(v.previous.value)} ${esc(v.previous.units || "")} <span style="font-size:11px">(${esc(when(v.previous.at))})</span>` : "—"}</td>` : ""}</tr>`).join("")}
        </tbody></table>
        ${x.comment ? `<div><b>Comment:</b> ${esc(x.comment)}</div>` : ""}
        <div class="acts">${verify ? (d.can_verify ? `<span data-retbox></span><button type="button" class="lab-b sm" data-return="${x.id}">Return to the bench…</button>
            <button type="button" class="lab-b blue sm" data-verify="${x.id}">Verify &amp; release</button>` : `<span class="muted">Waiting for a medical technologist.</span>`)
            : x.status === "released" && d.can_enter ? `<button type="button" class="lab-b sm" data-correct="${x.order_id}">Correct…</button>` : ""}</div>
    </div>`;
}

/** Clicks in the results views. Returns true when handled. */
export async function onResultsClick(e) {
    const en = e.target.closest("[data-enter]");
    if (en) return openEntry(en.dataset.enter.split(",").map(Number), false), true;
    const co = e.target.closest("[data-correct]");
    if (co) return openEntry([Number(co.dataset.correct)], true), true;
    const ve = e.target.closest("[data-verify]");
    if (ve) {
        ve.disabled = true;
        const r = await post("/lab/results/verify", { id: Number(ve.dataset.verify) });
        ve.disabled = false;
        showToast(r?.message || "Could not release.", r?.success ? "success" : "error", 8000);
        if (r?.success) ctx.reload(true);
        return true;
    }
    const rt = e.target.closest("[data-return]");
    if (rt) {
        const box = rt.parentElement.querySelector("[data-retbox]");
        box.innerHTML = `<input type="text" maxlength="255" data-why placeholder="What to check or re-run" aria-label="Why return to the bench"
            style="border:1px solid var(--border-color);border-radius:6px;padding:4px 6px;background:var(--bg-surface);color:var(--text-primary);min-width:220px">
            <button type="button" class="lab-b sm" data-returngo="${rt.dataset.return}">Return</button>`;
        rt.hidden = true;
        box.querySelector("[data-why]").focus();
        return true;
    }
    const rg = e.target.closest("[data-returngo]");
    if (rg) {
        const why = rg.parentElement.querySelector("[data-why]");
        if (!why.value.trim()) return why.focus(), true;
        const r = await post("/lab/results/return", { id: Number(rg.dataset.returngo), reason: why.value.trim() });
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        if (r?.success) ctx.reload(true);
        return true;
    }
    if (e.target.closest("[data-staff]")) return openStaff(), true;
    return false;
}

/* ---------------- entry ---------------- */

/** H / L from a reference range like "3.5-5.1", "<200", ">40" (a guide while typing; the server flags on save). */
function hiLo(value, range) {
    const v = Number(String(value).replace(/[<>=\s]/g, ""));
    if (value === "" || Number.isNaN(v) || !range) return "";
    let m = String(range).match(/^\s*(-?[\d.]+)\s*[-–]\s*(-?[\d.]+)\s*$/);
    if (m) return v < Number(m[1]) ? "L" : v > Number(m[2]) ? "H" : "";
    m = String(range).match(/^\s*<\s*=?\s*([\d.]+)/);
    if (m) return v > Number(m[1]) ? "H" : "";
    m = String(range).match(/^\s*>\s*=?\s*([\d.]+)/);
    if (m) return v < Number(m[1]) ? "L" : "";
    return "";
}

async function openEntry(orderIds, correct) {
    const r = await api(`/lab/results/form?order_ids=${orderIds.join(",")}${correct ? "&correct=1" : ""}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open.", "error");
    const f = r.data;
    const p = f.patient;
    const row = (v, ti, k) => `<tr class="${v.flag === "critical" ? "crit" : ""}" data-row>
        <td><input type="text" data-k="name" value="${esc(v.name)}" aria-label="Result name" maxlength="255"><input type="hidden" data-k="code" value="${esc(v.code || "")}"></td>
        <td><input type="text" class="val" data-k="value" value="${esc(v.value ?? "")}" aria-label="${esc(v.name)} value" maxlength="100" autocomplete="off" ${ti === 0 && k === 0 ? "data-first" : ""}></td>
        <td><input type="text" data-k="units" value="${esc(v.units || "")}" aria-label="${esc(v.name)} units" maxlength="50"></td>
        <td><input type="text" data-k="reference_range" value="${esc(v.reference_range || "")}" aria-label="${esc(v.name)} reference range" maxlength="100"></td>
        <td><span class="hl" data-hl>${esc(hiLo(v.value ?? "", v.reference_range))}</span> ${flagBadge(v)}</td>
        <td class="muted" style="font-size:12px">${v.previous ? `${esc(v.previous.value)} ${esc(v.previous.units || "")}<br>${esc(when(v.previous.at))}` : ""}</td>
        <td><input type="checkbox" data-k="is_abnormal" ${v.is_abnormal ? "checked" : ""} aria-label="Mark ${esc(v.name)} abnormal by hand"></td></tr>`;
    const m = modal(`Results — ${esc(p.name)}`, `${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}${p.sex ? ` · ${esc(p.sex)}` : ""} · <span class="lab-acc">${esc(f.specimen.accession_no)}</span> ${esc(f.specimen.container_label)} · collected ${esc(when(f.specimen.collected_at))}${f.priority !== "routine" ? ` · <b>${esc(f.priority.toUpperCase())}</b>` : ""}`, `
        ${f.clinical_info ? `<div class="lbx-note">${esc(f.clinical_info)}</div>` : ""}
        ${f.tests.map((t, ti) => `<div class="lbx-test" data-test="${t.order_id}">
            <h3>${esc(t.name)}${t.correcting ? ` <span class="lab-state returned">Correction</span>` : ""}</h3>
            ${t.return_reason ? `<div class="lbx-note warn"><b>Returned by the verifier:</b> ${esc(t.return_reason)}</div>` : ""}
            ${t.correcting ? `<div><label for="lrc${ti}">Why correct the released result</label><input type="text" id="lrc${ti}" name="tests.${ti}.correction_reason" data-corr value="${esc(t.correction_reason || "")}" maxlength="255" placeholder="e.g. clotted sample, re-run on a new sample" autocomplete="off"></div>` : ""}
            <div style="overflow-x:auto"><table class="lab-vals" data-field="tests.${ti}.values" tabindex="-1"><thead><tr><th>Result</th><th>Value</th><th>Units</th><th>Reference</th><th>Flag</th><th>Previous</th><th title="Abnormal by hand">Abn</th></tr></thead>
                <tbody>${t.values.map((v, k) => row(v, ti, k)).join("")}</tbody></table></div>
            <div><button type="button" class="lab-b sm" data-addrow>+ Result row</button></div>
            <div><label for="lrm${ti}">Comment on the report <span style="font-weight:400">(optional)</span></label><input type="text" id="lrm${ti}" data-comment value="${esc(t.comment || "")}" maxlength="1000" placeholder="e.g. haemolysed: potassium may be falsely high" autocomplete="off"></div>
        </div>`).join("")}`,
        `<button type="button" class="lab-b" data-x>Cancel</button><button type="button" class="lab-b" data-save="0">Save draft</button><button type="button" class="lab-b blue" data-save="1">Send for verification</button>`);
    m.ov.querySelector(".lbx").classList.add("wide");
    m.ov.addEventListener("input", (e) => {
        const tr = e.target.closest("[data-row]");
        if (tr && ["value", "reference_range"].includes(e.target.dataset.k)) {
            tr.querySelector("[data-hl]").textContent = hiLo(tr.querySelector('[data-k="value"]').value.trim(), tr.querySelector('[data-k="reference_range"]').value.trim());
        }
    });
    // Enter goes to the next value.
    m.ov.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.target.dataset.k !== "value") return;
        e.preventDefault();
        const all = [...m.ov.querySelectorAll('[data-k="value"]')];
        all[all.indexOf(e.target) + 1]?.focus();
    });
    m.ov.addEventListener("click", (e) => {
        const add = e.target.closest("[data-addrow]");
        if (!add) return;
        const body = add.closest("[data-test]").querySelector("tbody");
        body.insertAdjacentHTML("beforeend", row({ name: "", value: "", units: "", reference_range: "", is_abnormal: 0 }, 1, 1));
        body.lastElementChild.querySelector('[data-k="name"]').focus();
    });
    m.ov.querySelector("[data-first]")?.focus();
    m.ov.querySelectorAll("[data-save]").forEach((b) => (b.onclick = async () => {
        const tests = [...m.ov.querySelectorAll("[data-test]")].map((box) => ({
            order_id: Number(box.dataset.test),
            correction_reason: box.querySelector("[data-corr]")?.value.trim() ?? undefined,
            comment: box.querySelector("[data-comment]").value.trim(),
            values: [...box.querySelectorAll("[data-row]")].map((tr) => ({
                code: tr.querySelector('[data-k="code"]').value, name: tr.querySelector('[data-k="name"]').value.trim(), value: tr.querySelector('[data-k="value"]').value.trim(),
                units: tr.querySelector('[data-k="units"]').value.trim(), reference_range: tr.querySelector('[data-k="reference_range"]').value.trim(),
                is_abnormal: tr.querySelector('[data-k="is_abnormal"]').checked ? 1 : 0,
            })),
        }));
        b.disabled = true;
        const res = await post("/lab/results/save", { tests, submit: Number(b.dataset.save) });
        b.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not save.", res?.errors);
        m.close();
        showToast(res.message, res.data?.critical?.length ? "error" : "success", res.data?.critical?.length ? 10000 : 5000);
        ctx.reload(true);
        if (b.dataset.save === "0") openEntry(orderIds, false);
    }));
}

/* ---------------- lab staff (admin) ---------------- */

async function openStaff() {
    const r = await api("/lab/staff").catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not load.", "error");
    const m = modal("Lab staff", "Medical technologists verify and release results; lab technicians enter them.", r.data.length
        ? `<table class="lab-vals"><thead><tr><th>Lab user</th><th>Medical technologist</th><th>Licence no.</th><th></th></tr></thead><tbody>
            ${r.data.map((u) => `<tr data-user="${u.id}"><td><b>${esc(u.name)}</b> <span class="muted">${esc(u.username)}</span></td>
                <td><input type="checkbox" data-mt ${Number(u.med_tech) ? "checked" : ""} aria-label="${esc(u.name)} is a medical technologist"></td>
                <td><input type="text" data-lic value="${esc(u.license_no || "")}" maxlength="50" aria-label="${esc(u.name)} licence number"></td>
                <td><button type="button" class="lab-b sm" data-savestaff>Save</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="lab-empty">No users with the Lab Technician role.</div>`,
        `<button type="button" class="lab-b" data-x>Close</button>`);
    m.ov.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-savestaff]");
        if (!b) return;
        const tr = b.closest("tr");
        b.disabled = true;
        const res = await post("/lab/staff", { user_id: Number(tr.dataset.user), med_tech: tr.querySelector("[data-mt]").checked ? 1 : 0, license_no: tr.querySelector("[data-lic]").value.trim() });
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
