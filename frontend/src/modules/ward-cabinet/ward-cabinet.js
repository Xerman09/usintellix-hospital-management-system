import { fetchCabinet, withdrawDose, returnWithdrawal, wasteWithdrawal, saveCabinetLevels } from "./ward-cabinet.service.js?v=1";
import { getUser } from "../../core/session.js?v=2";
import { showToast } from "../../core/toast.js";

/*
 * Ward Cabinet (tab "ward_cabinet"): the ward's medicine cabinet.
 *  - Take out:  each patient's doses due now (and as-needed ones); a nurse takes the medicine
 *               out for that dose -- deducted through the medicine ledger at once. Giving it
 *               on the MAR links it to the dose and charges the patient.
 *  - Taken, not given: return it to the cabinet, or record it as wasted (a second nurse for
 *               high-alert / controlled medicines).
 *  - Stock:     what's in the cabinet against its minimum / maximum (editable by the pharmacy,
 *               an admin or the ward's charge nurse).
 *  - Activity:  the cabinet's recent withdrawals.
 */

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const hm = (dt) => {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return "";
    const h = Number(m[4]);
    return `${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
};
const fmt = (dt) => {
    const m = String(dt || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${hm(dt)}` : "";
};
const num = (n) => String(Math.round(Number(n || 0) * 1000) / 1000);
const STOCK = { out: ["out", "✕ Out"], low: ["low", "▼ Low"], ok: ["ok", "✓ OK"], over: ["over", "▲ Over max"], no_level: ["none", "No level"] };

export function WardCabinetView() {
    return `
<style>
.wcb-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1280px; min-width: 0; }
.wcb-page h1 { margin: 0; font-size: 22px; }
.wcb-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 860px; line-height: 1.5; }
.wcb-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.wcb-bar select, .wcb-page input, .wcb-page select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.wcb-tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid var(--border-color); margin-bottom: 12px; }
.wcb-tab { border: 0; background: none; color: var(--text-muted); padding: 8px 12px; font: inherit; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; }
.wcb-tab[aria-selected="true"] { color: var(--text-primary); border-bottom-color: var(--accent); }
.wcb-tab:focus-visible, .wcb-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.wcb-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 6px 11px; font-weight: 600; font-size: 12.5px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.wcb-btn:hover { background: var(--bg-surface-alt); }
.wcb-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.wcb-btn.primary:hover { background: var(--accent-hover); }
.wcb-btn.danger { color: #b91c1c; }
.wcb-btn:disabled { opacity: .55; cursor: default; }
.wcb-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
.wcb-card h3 { margin: 0; font-size: 14.5px; }
.wcb-sub { color: var(--text-muted); font-size: 12px; }
.wcb-allergy { background: #fee2e2; color: #991b1b; border-radius: 10px; padding: 1px 8px; font-size: 11.5px; font-weight: 700; margin-left: 4px; }
:root[data-theme="dark"] .wcb-allergy { background: #7f1d1d; color: #fecaca; }
.wcb-dose { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; align-items: center; padding: 8px 0; border-top: 1px dashed var(--border-color); }
.wcb-dose:first-of-type { border-top: 0; }
.wcb-act { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.wcb-act input { width: 72px; }
.wcb-badge { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.wcb-badge.late, .wcb-badge.out { background: #fee2e2; color: #991b1b; border-color: transparent; }
.wcb-badge.due, .wcb-badge.low { background: #fef3c7; color: #92400e; border-color: transparent; }
.wcb-badge.ok, .wcb-badge.taken { background: #dcfce7; color: #166534; border-color: transparent; }
:root[data-theme="dark"] .wcb-badge.late, :root[data-theme="dark"] .wcb-badge.out { background: #7f1d1d; color: #fecaca; }
:root[data-theme="dark"] .wcb-badge.due, :root[data-theme="dark"] .wcb-badge.low { background: #78350f; color: #fde68a; }
:root[data-theme="dark"] .wcb-badge.ok, :root[data-theme="dark"] .wcb-badge.taken { background: #14532d; color: #bbf7d0; }
.wcb-tablewrap { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.wcb-table { width: 100%; border-collapse: collapse; }
.wcb-table th, .wcb-table td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.wcb-table th { color: var(--text-muted); font-size: 12px; font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.wcb-table td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.wcb-table tr:last-child td { border-bottom: 0; }
.wcb-table input { width: 80px; }
.wcb-inline { margin-top: 8px; padding: 10px; background: var(--bg-surface-alt); border-radius: 8px; display: grid; gap: 6px; }
.wcb-inline label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.wcb-err { color: #dc2626; font-size: 12px; }
.wcb-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); }
.wcb-warn { color: #b45309; font-weight: 600; }
:root[data-theme="dark"] .wcb-warn { color: #fcd34d; }
@media (max-width: 700px) { .wcb-page { padding: 16px; } .wcb-dose { grid-template-columns: 1fr; } .wcb-act { justify-content: flex-start; } .wcb-hide-sm { display: none; } }
</style>
<div class="wcb-page" id="wcbPage">
    <h1>Ward Cabinet</h1>
    <p class="wcb-intro">The ward's medicine cabinet. Take out a patient's dose here (it comes off the cabinet's stock through the medicine ledger), then record it on the MAR — that links it to the dose and charges the patient. Not given? Return it to the cabinet, or record it as wasted. Anything taken out and not given or returned within an hour sends you a reminder.</p>
    <div class="wcb-bar"><select id="wcbWard" aria-label="Ward"></select><span class="wcb-sub" id="wcbCabinet"></span></div>
    <div class="wcb-tabs" role="tablist" id="wcbTabs"></div>
    <div id="wcbBody"><div class="wcb-empty">Loading…</div></div>
</div>`;
}

let data = null;
let ward = "";
let tab = "take";
let seq = 0;
let timer = null;
let editing = false;

export function initWardCabinet() {
    const page = $("wcbPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    ward = "";
    tab = "take";
    editing = false;
    $("wcbWard").addEventListener("change", (e) => {
        ward = e.target.value;
        editing = false;
        load();
    });
    $("wcbTabs").addEventListener("click", (e) => {
        const t = e.target.closest("[data-tab-key]")?.dataset.tabKey;
        if (t) {
            tab = t;
            render();
        }
    });
    $("wcbBody").addEventListener("click", onClick);
    load();
    clearInterval(timer);
    timer = setInterval(() => {
        if (!$("wcbPage")) {
            clearInterval(timer);
            return;
        }
        // Don't redraw under someone typing.
        if (!document.hidden && !editing && !$("wcbBody").querySelector(".wcb-inline") && !document.querySelector("#marxOverlay.open")) load();
    }, 60000);
}

async function load(message) {
    if (message) showToast(message);
    const n = ++seq;
    const res = await fetchCabinet(ward).catch(() => null);
    if (n !== seq || !$("wcbBody")) return;
    if (!res?.success) {
        $("wcbBody").innerHTML = `<div class="wcb-empty">Could not load the cabinet. ${esc(res?.message || "")}</div>`;
        return;
    }
    data = res.data;
    ward = String(data.ward_id);
    render();
}

function render() {
    $("wcbWard").innerHTML = data.wards.map((w) => `<option value="${w.id}" ${w.id === data.ward_id ? "selected" : ""}>${esc(w.name)}${w.mine ? " (my ward)" : ""}${w.cabinet ? "" : " — no cabinet"}</option>`).join("");
    if (!data.cabinet) {
        $("wcbCabinet").textContent = "";
        $("wcbTabs").innerHTML = "";
        $("wcbBody").innerHTML = `<div class="wcb-empty">This ward has no medicine cabinet yet. An admin links a storage location to it in Medicine Rounds → Supply settings (create the location in Storage Locations, type “Ward / Nurse Station Stock”).</div>`;
        return;
    }
    const low = data.stock.filter((i) => ["out", "low"].includes(i.status)).length;
    $("wcbCabinet").textContent = `Cabinet: ${data.cabinet.name}`;
    const tabs = [["take", "Take out for a patient"], ["open", `Taken, not given (${data.open.length})`], ["stock", `Stock${low ? ` (${low} low)` : ""}`], ["activity", "Activity"]];
    $("wcbTabs").innerHTML = tabs.map(([k, l]) => `<button type="button" role="tab" class="wcb-tab" data-tab-key="${k}" aria-selected="${tab === k}">${esc(l)}</button>`).join("");
    $("wcbBody").innerHTML = tab === "take" ? takeHtml() : tab === "open" ? openHtml() : tab === "stock" ? stockHtml() : activityHtml();
}

/* ---------------- take out ---------------- */

function takeHtml() {
    if (!data.patients.length) return `<div class="wcb-empty">No patients in this ward.</div>`;
    const withDoses = data.patients.filter((p) => p.doses.length);
    const none = data.patients.length - withDoses.length;
    return withDoses.map((p) => `<div class="wcb-card" data-adm="${p.admission_id}">
            <h3>${esc(p.room)} · ${esc(p.bed)} — ${esc(p.patient_name)}${p.allergies.map((a) => `<span class="wcb-allergy">${esc(a)}</span>`).join("")}</h3>
            <div class="wcb-sub">${esc(p.nurse_name ? `RN ${p.nurse_name}` : "No nurse assigned")}</div>
            ${p.doses.map((d, i) => doseHtml(p, d, i)).join("")}
        </div>`).join("")
        + (withDoses.length ? "" : `<div class="wcb-empty">Nothing due now for any patient in this ward.</div>`)
        + (none && withDoses.length ? `<p class="wcb-sub">${none} other patient${none === 1 ? " has" : "s have"} nothing due now.</p>` : "");
}

function doseHtml(p, d, i) {
    const when = d.order_type === "prn" ? `<span class="wcb-badge">As needed</span>`
        : `<span class="wcb-badge ${d.state}">${d.state === "late" ? "⏰ Late" : "● Due"} ${esc(hm(d.slot_at))}</span>`;
    const taken = d.taken[0];
    let act;
    if (taken) {
        act = `<span class="wcb-badge taken">✓ Taken ${esc(num(taken.quantity))} ${esc(taken.unit_name)}(s) · ${esc(taken.withdrawn_by_name || "")} ${esc(hm(taken.withdrawn_at))}</span>
            <button type="button" class="wcb-btn primary" data-mar="${p.admission_id}">Give on MAR</button>`;
    } else if (d.blocked) {
        act = `<span class="wcb-sub">${esc(d.blocked)}</span>`;
    } else if (!p.can_take || !data.can_take) {
        act = `<span class="wcb-sub">${esc(num(d.in_cabinet))} in the cabinet</span>`;
    } else {
        const short = d.in_cabinet < d.quantity;
        act = `<span class="wcb-sub ${short ? "wcb-warn" : ""}">${d.in_cabinet > 0 ? `${esc(num(d.in_cabinet))} in the cabinet` : "None in the cabinet"}</span>
            <input type="number" min="0.5" step="0.5" inputmode="decimal" value="${d.quantity}" aria-label="How many ${esc(d.unit_name)}(s) of ${esc(d.drug_name)}" data-qty="${p.admission_id}:${i}">
            <span class="wcb-sub">${esc(d.unit_name)}(s)</span>
            <button type="button" class="wcb-btn primary" data-take="${p.admission_id}:${i}" ${d.in_cabinet <= 0 ? "disabled" : ""}>Take out</button>`;
    }
    return `<div class="wcb-dose">
        <div><strong>${esc(d.drug_name)}</strong> ${when}${d.needs_witness ? ` <span class="wcb-badge due" title="A second nurse checks when it's given or wasted">2nd nurse</span>` : ""}
            <div class="wcb-sub">${esc(d.dose)} · ${esc(d.how)}</div></div>
        <div class="wcb-act">${act}</div>
    </div>`;
}

/* ---------------- taken, not given ---------------- */

function openHtml() {
    if (!data.open.length) return `<div class="wcb-empty">Nothing is waiting: everything taken out was given, returned or wasted.</div>`;
    const me = Number(getUser()?.id);
    const role = getUser()?.role;
    return data.open.map((w) => {
        const mineOrCharge = w.withdrawn_by === me || ["admin", "charge_nurse"].includes(role);
        return `<div class="wcb-card" data-w="${w.id}">
            <div class="wcb-dose" style="border:0">
                <div><strong>${esc(w.drug_name)}</strong> — ${esc(num(w.quantity))} ${esc(w.unit_name)}(s) for <strong>${esc(w.patient_name)}</strong> (${esc(w.room)} · ${esc(w.bed)})
                    <div class="wcb-sub">${w.slot_at ? `For the ${esc(hm(w.slot_at))} dose · ` : "As needed · "}taken by ${esc(w.withdrawn_by_name || "")} at ${esc(hm(w.withdrawn_at))}
                    ${w.open_minutes >= 60 ? ` · <span class="wcb-warn">⏰ ${esc(Math.floor(w.open_minutes / 60))} h ${esc(w.open_minutes % 60)} min ago</span>` : ""}</div></div>
                <div class="wcb-act">
                    <button type="button" class="wcb-btn" data-mar="${w.admission_id}">Give on MAR</button>
                    ${mineOrCharge ? `<button type="button" class="wcb-btn" data-return="${w.id}">Return</button><button type="button" class="wcb-btn danger" data-waste="${w.id}">Wasted…</button>` : ""}
                </div>
            </div>
            <div class="wcb-box"></div>
        </div>`;
    }).join("");
}

/* ---------------- stock ---------------- */

function stockHtml() {
    const rows = data.stock;
    const head = `<div class="wcb-bar">${data.can_edit_levels ? (editing
        ? `<button type="button" class="wcb-btn primary" data-levels="save">Save levels</button><button type="button" class="wcb-btn" data-levels="cancel">Cancel</button>
           ${data.catalog.length ? `<select id="wcbAdd" aria-label="Add a medicine"><option value="">+ Add a medicine…</option>${data.catalog.map((c) => `<option value="${c.drug_id}">${esc(c.name)}</option>`).join("")}</select>` : ""}`
        : `<button type="button" class="wcb-btn" data-levels="edit">Edit min / max</button>`) : ""}
        <span class="wcb-sub">Usable = on hand less expired. The cabinet is refilled from the pharmacy with Stock Transfers.</span></div><div class="wcb-err" id="wcbLevelErr" role="alert"></div>`;
    if (!rows.length && !editing) return head + `<div class="wcb-empty">Nothing in this cabinet yet, and no levels set.</div>`;
    return head + `<div class="wcb-tablewrap"><table class="wcb-table">
        <thead><tr><th>Medicine</th><th>Usable</th><th>Min</th><th>Max</th><th>Status</th><th class="wcb-hide-sm">Next expiry</th><th class="wcb-hide-sm">On the way</th></tr></thead>
        <tbody id="wcbStockRows">${rows.map(stockRow).join("")}</tbody></table></div>`;
}

function stockRow(i) {
    const [cls, label] = STOCK[i.status] || STOCK.no_level;
    const lvl = (k, v) => editing ? `<input type="number" min="0" step="any" inputmode="decimal" data-level="${k}" value="${v ?? ""}" aria-label="${k === "min_level" ? "Minimum" : "Maximum"} of ${esc(i.drug_name)}">` : (v ?? "—");
    return `<tr data-drug="${i.drug_id}"><td><strong>${esc(i.drug_name)}</strong><div class="wcb-sub">${esc(i.unit_name || "")}</div></td>
        <td class="num">${esc(num(i.usable))}${i.expired ? ` <span class="wcb-sub">(+${esc(num(i.expired))} expired)</span>` : ""}</td>
        <td class="num">${lvl("min_level", i.min_level)}</td><td class="num">${lvl("max_level", i.max_level)}</td>
        <td><span class="wcb-badge ${cls}">${label}</span>${i.suggested_qty ? `<div class="wcb-sub">Refill ${esc(num(i.suggested_qty))}</div>` : ""}</td>
        <td class="wcb-hide-sm">${esc(i.next_expiry || "—")}</td><td class="num wcb-hide-sm">${i.incoming ? esc(num(i.incoming)) : "—"}</td></tr>`;
}

/* ---------------- activity ---------------- */

function activityHtml() {
    if (!data.activity.length) return `<div class="wcb-empty">No medicine taken out of this cabinet yet.</div>`;
    const S = { open: "Waiting", given: "Given", returned: "Returned", wasted: "Wasted" };
    return `<div class="wcb-tablewrap"><table class="wcb-table">
        <thead><tr><th>Taken</th><th>Patient</th><th>Medicine</th><th>Qty</th><th>By</th><th>Status</th></tr></thead>
        <tbody>${data.activity.map((w) => `<tr><td class="num">${esc(fmt(w.withdrawn_at))}</td><td>${esc(w.patient_name)}<div class="wcb-sub">${esc(w.room)} · ${esc(w.bed)}</div></td>
            <td>${esc(w.drug_name)}<div class="wcb-sub">${esc(w.dose)}</div></td><td class="num">${esc(num(w.quantity))} ${esc(w.unit_name)}</td><td>${esc(w.withdrawn_by_name || "")}</td>
            <td><span class="wcb-badge ${w.status === "given" ? "ok" : w.status === "wasted" ? "low" : w.status === "open" ? "due" : ""}">${S[w.status]}</span>
                ${w.closed_at && w.status !== "given" ? `<div class="wcb-sub">${esc(w.close_reason || "")} — ${esc(w.closed_by_name || "")} ${esc(hm(w.closed_at))}${w.witness_name ? ` · witness ${esc(w.witness_name)}` : ""}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}

/* ---------------- actions ---------------- */

async function onClick(e) {
    const take = e.target.closest("[data-take]")?.dataset.take;
    const mar = e.target.closest("[data-mar]")?.dataset.mar;
    const ret = e.target.closest("[data-return]")?.dataset.return;
    const waste = e.target.closest("[data-waste]")?.dataset.waste;
    const lv = e.target.closest("[data-levels]")?.dataset.levels;
    if (take) {
        const [adm, i] = take.split(":").map(Number);
        const d = data.patients.find((p) => p.admission_id === adm).doses[i];
        const qty = $("wcbBody").querySelector(`[data-qty="${take}"]`).value;
        const btn = e.target.closest("button");
        btn.disabled = true;
        const r = await withdrawDose({ order_id: d.order_id, slot_at: d.slot_at || undefined, quantity: qty }).catch(() => null);
        btn.disabled = false;
        if (!r?.success) {
            showToast(r?.message || "Could not take it out.", "error");
            return;
        }
        load(r.message);
    } else if (mar) {
        const { openMar } = await import("../mar/mar.js?v=5");
        openMar(Number(mar), { onChange: () => load() });
    } else if (ret) {
        const btn = e.target.closest("button");
        btn.disabled = true;
        const r = await returnWithdrawal(Number(ret), "Not given").catch(() => null);
        btn.disabled = false;
        if (!r?.success) {
            showToast(r?.message || "Could not return it.", "error");
            return;
        }
        load(r.message);
    } else if (waste) {
        wasteForm(Number(waste));
    } else if (lv === "edit") {
        editing = true;
        render();
    } else if (lv === "cancel") {
        editing = false;
        render();
    } else if (lv === "save") {
        saveLevels(e.target.closest("button"));
    }
}

function wasteForm(id) {
    const w = data.open.find((x) => x.id === id);
    const box = $("wcbBody").querySelector(`[data-w="${id}"] .wcb-box`);
    if (box.innerHTML) return;
    box.innerHTML = `<div class="wcb-inline">
        <label for="wcbWhy${id}">Why is it wasted? (it stays off the stock; the patient is not charged)</label>
        <input id="wcbWhy${id}" maxlength="255" placeholder="e.g. dropped on the floor, patient vomited it">
        ${w.needs_witness ? `<div><strong>Second nurse witness</strong> <span class="wcb-sub">— high-alert / controlled medicine: another nurse watches it being discarded and signs.</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="wcbWUser${id}" placeholder="Second nurse's username" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Second nurse's username">
            <input id="wcbWPass${id}" type="password" placeholder="Their password" autocomplete="new-password" aria-label="Their password"></div>` : ""}
        <div style="display:flex;gap:6px"><button type="button" class="wcb-btn danger" data-v="go">Record as wasted</button><button type="button" class="wcb-btn" data-v="cancel">Cancel</button></div>
        <div class="wcb-err" role="alert"></div></div>`;
    $(`wcbWhy${id}`).focus();
    box.querySelector('[data-v="cancel"]').onclick = () => { box.innerHTML = ""; };
    box.querySelector('[data-v="go"]').onclick = async (ev) => {
        const err = box.querySelector(".wcb-err");
        const why = $(`wcbWhy${id}`).value.trim();
        if (!why) { err.textContent = "Say why it is wasted."; return; }
        if (w.needs_witness && (!$(`wcbWUser${id}`).value.trim() || !$(`wcbWPass${id}`).value)) { err.textContent = "The second nurse must sign with their username and password."; return; }
        ev.target.disabled = true;
        const r = await wasteWithdrawal(id, { reason: why, witness_username: w.needs_witness ? $(`wcbWUser${id}`).value.trim() : undefined,
            witness_password: w.needs_witness ? $(`wcbWPass${id}`).value : undefined }).catch(() => null);
        ev.target.disabled = false;
        if ($(`wcbWPass${id}`)) $(`wcbWPass${id}`).value = "";
        if (!r?.success) { err.textContent = r?.message || "Could not save."; return; }
        load(r.message);
    };
}

async function saveLevels(btn) {
    const levels = [...$("wcbStockRows").querySelectorAll("tr[data-drug]")].map((tr) => ({
        drug_id: Number(tr.dataset.drug), min_level: tr.querySelector('[data-level="min_level"]').value, max_level: tr.querySelector('[data-level="max_level"]').value,
    }));
    btn.disabled = true;
    const r = await saveCabinetLevels(data.ward_id, levels).catch(() => null);
    btn.disabled = false;
    if (!r?.success) {
        const first = r?.errors ? Object.values(r.errors)[0] : null;
        $("wcbLevelErr").textContent = first ? `${r.message} ${first}` : (r?.message || "Could not save.");
        return;
    }
    editing = false;
    load(r.message);
}

// "+ Add a medicine" while editing levels: a new row to fill in.
document.addEventListener("change", (e) => {
    if (e.target.id !== "wcbAdd" || !e.target.value) return;
    const c = data.catalog.find((x) => x.drug_id === Number(e.target.value));
    // Keep what was typed in the other rows.
    $("wcbStockRows")?.querySelectorAll("tr[data-drug]").forEach((tr) => {
        const row = data.stock.find((i) => i.drug_id === Number(tr.dataset.drug));
        const v = (k) => tr.querySelector(`[data-level="${k}"]`).value;
        if (row) Object.assign(row, { min_level: v("min_level") === "" ? null : v("min_level"), max_level: v("max_level") === "" ? null : v("max_level") });
    });
    data.catalog = data.catalog.filter((x) => x !== c);
    data.stock.push({ drug_id: c.drug_id, drug_name: c.name, unit_name: c.unit_name, usable: 0, expired: 0, min_level: null, max_level: null, status: "no_level", next_expiry: null, incoming: 0, suggested_qty: 0 });
    render();
});
