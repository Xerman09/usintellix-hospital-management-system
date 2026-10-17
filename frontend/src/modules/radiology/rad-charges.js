import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { esc, when, modal, modalityTag } from "./rad-ui.js?v=6";

/*
 * Imaging charges (module 15, Phase 3) inside the Radiology Worklist: the "Charges" view lists the studies reported
 * in the last 7 days with what each one cost the patient. A study is charged automatically when its report is
 * signed, at the price on the catalog; a study with no price waits here until an admin prices it ("Study prices…")
 * and charges it. A charge can be given a Senior Citizen / PWD / other discount, or voided with a reason. Charges
 * go to the patient ledger (type "Imaging").
 */

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);
let ctx = null; // { root, data, reload }

const peso = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The charges view of the worklist. */
export async function loadCharges(root, state, reload) {
    const q = new URLSearchParams({ ...(state.q ? { q: state.q } : {}), ...(state.only ? { only: state.only } : {}) });
    const r = await api(`/radiology/charges?${q}`).catch(() => null);
    if (!r?.success) return { error: r?.message || "Could not load the charges." };
    ctx = { root, data: r.data, reload };
    return r.data;
}

/** Rows of the charges view. */
export function chargesHtml(d) {
    if (!d.items.length) return `<div class="rad-empty">No reports signed in the last 7 days.</div>`;
    return `<div class="rad-wrap"><table class="rad-tbl big"><thead><tr><th>Patient</th><th>Study</th><th>Machine</th><th>Reported</th><th class="n">Price</th><th class="n">Charged</th><th></th></tr></thead><tbody>
        ${d.items.map((x) => `<tr data-order="${x.order_id}">
            <td><b>${esc(x.patient.name)}</b><div class="muted" style="font-size:12px">${esc(x.patient.mrn || "")}${x.location ? ` · ${esc(x.location)}` : ""}</div></td>
            <td>${modalityTag(x.modality, x.study_name)}${x.version > 1 ? `<span class="rad-state">v${x.version}</span>` : ""}
                <div class="muted" style="font-size:12px">${esc(x.request_no || "")}${x.conclusion === "critical" ? ` · <b>critical finding</b>` : ""}</div></td>
            <td class="muted">${esc(x.room || "—")}</td>
            <td class="muted">${esc(when(x.reported_at))}</td>
            <td class="n">${x.price === null ? `<span class="rad-flag">No price</span>` : esc(peso(x.price))}</td>
            <td class="n">${x.charge ? `<b>${esc(peso(x.charge.net))}</b>${x.charge.discount > 0
                    ? `<div class="muted" style="font-size:12px">${esc(peso(x.charge.gross))} less ${x.charge.discount_rate}%${x.charge.discount_label ? ` ${esc(x.charge.discount_label)}` : ""}</div>` : ""}`
                : x.voided ? `<span class="muted">voided</span><div class="muted" style="font-size:12px">${esc(x.voided.reason || "")}</div>`
                : `<span class="muted">—</span>`}</td>
            <td class="acts">${d.can_bill ? (x.charge
                ? `<button type="button" class="rad-b sm" data-disc="${x.charge.id}">Discount…</button><button type="button" class="rad-b sm" data-voidch="${x.charge.id}">Void…</button>`
                : x.price === null ? `<span class="muted" style="font-size:12px">Set a price first</span>`
                : `<button type="button" class="rad-b blue sm" data-postch="${x.order_id}">Charge ${esc(peso(x.price))}</button>`) : ""}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="rad-sub">Charges go to the patient's ledger as “Imaging”. An addendum or a correction is not charged a second time.</div>`;
}

/** Clicks in the charges view. Returns true when handled. */
export async function onChargesClick(e) {
    if (e.target.closest("[data-prices]")) return openPrices(), true;
    const p = e.target.closest("[data-postch]");
    if (p) {
        p.disabled = true;
        const r = await post("/radiology/charges/post", { order_ids: [Number(p.dataset.postch)] });
        p.disabled = false;
        showToast(r?.message || "Could not post the charge.", r?.success ? "success" : "error", 7000);
        if (r?.success) ctx.reload(true);
        return true;
    }
    const v = e.target.closest("[data-voidch]");
    if (v) {
        const cell = v.parentElement;
        cell.innerHTML = `<input type="text" maxlength="255" data-why placeholder="Why void the charge?" aria-label="Why void this charge"
            style="border:1px solid var(--border-color);border-radius:6px;padding:4px 6px;background:var(--bg-surface);color:var(--text-primary);min-width:190px">
            <button type="button" class="rad-b sm" data-voidgoch="${v.dataset.voidch}">Void</button>`;
        cell.querySelector("[data-why]").focus();
        return true;
    }
    const vg = e.target.closest("[data-voidgoch]");
    if (vg) {
        const why = vg.parentElement.querySelector("[data-why]");
        if (!why.value.trim()) return why.focus(), true;
        vg.disabled = true;
        const r = await post("/radiology/charges/void", { id: Number(vg.dataset.voidgoch), reason: why.value.trim() });
        vg.disabled = false;
        showToast(r?.message || "Could not void.", r?.success ? "success" : "error", 7000);
        if (r?.success) ctx.reload(true);
        return true;
    }
    const d = e.target.closest("[data-disc]");
    if (d) return openDiscount(Number(d.dataset.disc)), true;
    return false;
}

/* ---------------- discount ---------------- */

function openDiscount(chargeId) {
    const x = ctx.data.items.find((i) => i.charge?.id === chargeId);
    const c = x.charge;
    const m = modal(`Discount — ${esc(x.study_name)}`, `${esc(x.patient.name)} · ${esc(peso(c.gross))} before any discount`, `
        <div><span class="lbl" id="rdcT">Discount</span><div class="rbx-seg" data-field="discount_type" role="radiogroup" aria-labelledby="rdcT">
            <label><input type="radio" name="discount_type" value="none" ${c.discount_type ? "" : "checked"}> None</label>
            ${ctx.data.discounts.map((o) => `<label><input type="radio" name="discount_type" value="${esc(o.value)}" ${c.discount_type === o.value ? "checked" : ""}> ${esc(o.label)}${o.rate ? ` · ${o.rate}%` : ""}</label>`).join("")}
        </div></div>
        <div class="rbx-grid">
            <div><label for="rdcId">ID number <span style="font-weight:400">(Senior Citizen / PWD)</span></label><input type="text" id="rdcId" name="discount_id_no" value="${esc(c.discount_id_no || "")}" maxlength="50" autocomplete="off"></div>
            <div><label for="rdcRate">Rate % <span style="font-weight:400">(other discount)</span></label><input type="text" id="rdcRate" name="discount_rate" value="${c.discount_type === "other" ? esc(c.discount_rate) : ""}" maxlength="6" autocomplete="off"></div>
        </div>
        <div><label for="rdcWhy">Why <span style="font-weight:400">(other discount)</span></label><input type="text" id="rdcWhy" name="discount_reason" value="${esc(c.discount_reason || "")}" maxlength="255" placeholder="e.g. charity ward patient" autocomplete="off"></div>`,
        `<button type="button" class="rad-b" data-x>Cancel</button><button type="button" class="rad-b blue" data-save>Save</button>`);
    m.$("[data-save]").onclick = async (ev) => {
        ev.target.disabled = true;
        const r = await post("/radiology/charges/discount", { id: chargeId, discount_type: m.val("discount_type"), discount_id_no: m.val("discount_id_no"),
            discount_rate: m.val("discount_rate"), discount_reason: m.val("discount_reason") });
        ev.target.disabled = false;
        if (!r?.success) return m.err(r?.message || "Could not save.", r?.errors);
        m.close();
        showToast(r.message, "success", 6000);
        ctx.reload(true);
    };
}

/* ---------------- study prices (admin) ---------------- */

async function openPrices() {
    const r = await api("/radiology/prices").catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not load the prices.", "error");
    const groups = {};
    r.data.studies.forEach((s) => (groups[s.group] ??= []).push(s));
    const m = modal("Study prices", "What the hospital charges for each imaging study. A signed report is charged this price; leave it blank for a study that is not charged.", `
        <div><input type="search" id="rprQ" placeholder="Find a study" aria-label="Find a study"></div>
        ${Object.entries(groups).map(([g, list]) => `<div class="rbx-prep" data-group><h4>${esc(g)}</h4>
            <table class="rad-tbl"><thead><tr><th>Study</th><th>Machine time</th><th style="width:140px">Price ₱</th></tr></thead><tbody>
            ${list.map((s) => `<tr data-study="${s.id}" data-name="${esc(`${s.name} ${s.code || ""}`.toLowerCase())}">
                <td>${esc(s.name)}${s.code ? ` <span class="muted">${esc(s.code)}</span>` : ""}${s.contrast && s.contrast !== "none" ? ` <span class="muted">· contrast</span>` : ""}</td>
                <td class="muted">${s.minutes || "—"} min</td>
                <td><input type="text" data-price value="${s.price === null ? "" : esc(Number(s.price).toFixed(2))}" maxlength="12" inputmode="decimal" aria-label="Price of ${esc(s.name)}"></td></tr>`).join("")}
            </tbody></table></div>`).join("")}`,
        `<button type="button" class="rad-b" data-x>Close</button><button type="button" class="rad-b blue" data-save>Save prices</button>`);
    m.ov.querySelector(".rbx").classList.add("wide");
    m.$("#rprQ").oninput = (e) => {
        const q = e.target.value.trim().toLowerCase();
        m.ov.querySelectorAll("[data-study]").forEach((tr) => (tr.hidden = q !== "" && !tr.dataset.name.includes(q)));
        m.ov.querySelectorAll("[data-group]").forEach((g) => (g.hidden = ![...g.querySelectorAll("[data-study]")].some((tr) => !tr.hidden)));
    };
    m.$("[data-save]").onclick = async (ev) => {
        const prices = [...m.ov.querySelectorAll("[data-study]")].map((tr) => ({ id: Number(tr.dataset.study), price: tr.querySelector("[data-price]").value.trim() }));
        ev.target.disabled = true;
        const res = await post("/radiology/prices", { prices });
        ev.target.disabled = false;
        if (!res?.success) {
            m.err(res?.message || "Could not save.");
            // m.err() clears the marks, so mark the offending prices after it.
            let first = null;
            Object.keys(res?.errors || {}).forEach((k) => {
                const f = m.ov.querySelector(`[data-study="${k.split(".")[1]}"] [data-price]`);
                if (f) {
                    f.setAttribute("aria-invalid", "true");
                    first ??= f;
                }
            });
            first?.focus();
            return;
        }
        m.close();
        showToast(res.message, "success", 6000);
        ctx?.reload(true);
    };
}
