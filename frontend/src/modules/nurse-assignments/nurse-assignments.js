import {
    fetchAssignmentBoard, saveAssignments, copyPreviousShift, fetchMyPatients,
    fetchHandovers, writeHandover, receiveHandover,
} from "./nurse-assignments.service.js?v=1";
import { getUser } from "../../core/session.js?v=2";
import { showToast } from "../../core/toast.js";

/*
 * Shift Assignments: one ward, one shift. The charge nurse (or an admin) picks a nurse and a
 * CNA for each patient; everyone in nursing sees the board and their own patients; the
 * hand-over window (also opened from the patient chart) writes / receives hand-overs.
 */

const $ = (id) => document.getElementById(id);
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-07" -> "Oct 7"; "2026-10-07 14:05:00" -> "Oct 7, 2:05 PM" (no timezone conversion). */
export function fmt(dt) {
    if (!dt) return "";
    const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (!m) return String(dt);
    const day = `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`;
    if (m[4] === undefined) return day;
    const h = Number(m[4]);
    return `${day}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
}
export const shiftLabel = (date, shift) => `${fmt(date)} · ${shift?.name || ""}`;

let filters = { ward_id: "", date: "", shift_id: "" };
let data = null;
let edits = new Map();    // admission_id -> {nurse_user_id, cna_user_id}
let seq = 0;
let keyBound = false;

export function initNurseAssignments() {
    const page = $("nasPage");
    if (!page || page.dataset.bound) return;
    page.dataset.bound = "1";
    filters = { ward_id: "", date: "", shift_id: "" };
    edits = new Map();

    const go = (patch) => guardDirty(() => {
        Object.assign(filters, patch);
        load();
    });
    $("nasWard").addEventListener("change", (e) => go({ ward_id: e.target.value }));
    $("nasDate").addEventListener("change", (e) => e.target.value && go({ date: e.target.value }));
    $("nasShift").addEventListener("change", (e) => go({ shift_id: e.target.value }));
    $("nasPrev").addEventListener("click", () => data?.prev && go({ date: data.prev.date, shift_id: data.prev.shift.id }));
    $("nasNext").addEventListener("click", () => data?.next && go({ date: data.next.date, shift_id: data.next.shift.id }));
    $("nasNow").addEventListener("click", () => go({ date: "", shift_id: "" }));
    $("nasList").addEventListener("change", onPick);
    $("nasList").addEventListener("click", onListClick);
    $("nasMine").addEventListener("click", onListClick);
    $("nasSave").addEventListener("click", save);
    $("nasCopy").addEventListener("click", copyPrevious);
    if (!keyBound) {
        keyBound = true;
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && $("nasHoOverlay")?.classList.contains("open")) closeHandovers();
        });
    }
    loadMine();
    load();
}

async function loadMine() {
    const role = getUser()?.role;
    if (!["nurse", "charge_nurse", "cna"].includes(role)) return;
    const res = await fetchMyPatients().catch(() => null);
    const box = $("nasMine");
    if (!box || !res?.success) return;
    const d = res.data;
    box.innerHTML = `<section class="nas-mine" aria-label="My patients">
        <h2>My patients · ${esc(shiftLabel(d.current.date, d.current.shift))}</h2>
        ${d.patients.length ? `<div class="nas-mine-list">${d.patients.map((p) => `
            <div class="nas-mine-item">
                <div><strong>${esc(p.room)} · ${esc(p.bed)}</strong> <span class="nas-sub">${esc(p.ward)}</span></div>
                <div><button type="button" class="nas-link" data-chart="${esc(p.patient_mrn || p.patient_id || "")}">${esc(p.patient_name)}</button>
                    <span class="nas-sub">· you are the ${p.my_role === "nurse" ? "nurse" : "CNA"}</span></div>
                ${p.isolation ? `<span class="nas-iso">${esc(p.isolation)}</span>` : ""}
                <div style="margin-top:6px">${p.incoming_handover
                    ? `<span class="nas-ho ${p.incoming_handover.received ? "ok" : "wait"}">${p.incoming_handover.received ? "✓ Hand-over received" : "Hand-over waiting for you"}</span>`
                    : `<span class="nas-sub">No hand-over from the last shift</span>`}
                    <button type="button" class="nas-btn small" data-handover="${p.admission_id}" style="margin-left:6px">Hand-over</button></div>
            </div>`).join("")}</div>` : `<p class="nas-sub" style="margin:0">No patients are assigned to you this shift.</p>`}
    </section>`;
}

async function load() {
    const n = ++seq;
    const res = await fetchAssignmentBoard(filters).catch(() => null);
    if (n !== seq || !$("nasList")) return;
    if (!res?.success) {
        $("nasList").innerHTML = `<div class="nas-empty">Could not load the assignments. ${esc(res?.message || "")}</div>`;
        return;
    }
    data = res.data;
    filters = { ward_id: String(data.ward_id), date: data.date, shift_id: String(data.shift.id) };
    edits = new Map();
    render();
}

function render() {
    $("nasWard").innerHTML = data.wards.map((w) => `<option value="${w.id}" ${w.id === data.ward_id ? "selected" : ""}>${esc(w.name)}${w.mine ? " (my ward)" : ""}</option>`).join("");
    $("nasShift").innerHTML = data.shifts.map((s) => `<option value="${s.id}" ${s.id === data.shift.id ? "selected" : ""}>${esc(s.name)}</option>`).join("");
    $("nasDate").value = data.date;
    $("nasDate").max = data.max_date;
    $("nasState").innerHTML = `<span class="nas-state ${data.state}">${{ current: "Now", past: "Past shift", future: "Upcoming" }[data.state]}</span>`;
    $("nasNote").innerHTML = data.edit_note ? `<div class="nas-note">${esc(data.edit_note)}</div>` : "";

    const nurses = data.staff.filter((s) => s.kind === "nurse");
    const cnas = data.staff.filter((s) => s.kind === "cna");
    const loadOf = (s) => s.load + countEdits(s);
    $("nasStaff").innerHTML = `
        <h3>Nurses</h3>${nurses.length ? nurses.map((s) => staffRow(s, loadOf(s), 6)).join("") : `<p class="nas-sub">No nurses linked to this ward. Link them in Nursing Staff.</p>`}
        <h3 style="margin-top:12px">CNAs</h3>${cnas.length ? cnas.map((s) => staffRow(s, loadOf(s), 10)).join("") : `<p class="nas-sub">No CNAs linked to this ward.</p>`}
        <p class="nas-sub" style="margin:10px 0 0">Number = patients this shift (all wards).</p>`;

    if (!data.patients.length) {
        $("nasList").innerHTML = `<div class="nas-empty">No patients in this ward.</div>`;
        $("nasFoot").hidden = true;
        return;
    }
    const opt = (list, sel, none) => `<option value="">${none}</option>` + list.map((s) => `<option value="${s.user_id}" ${s.user_id === sel ? "selected" : ""}>${esc(s.name)}${s.role === "charge_nurse" ? " (charge)" : ""}</option>`).join("");
    const prevName = data.prev?.shift?.name || "last shift";
    $("nasList").innerHTML = `<table class="nas-table">
        <thead><tr><th>Bed</th><th>Patient</th><th>Nurse</th><th>CNA</th><th class="nas-hide-sm">Hand-over</th></tr></thead>
        <tbody>${data.patients.map((p) => {
            const e = edits.get(p.admission_id);
            const nurse = e ? e.nurse_user_id : p.nurse_user_id;
            const cna = e ? e.cna_user_id : p.cna_user_id;
            const editable = data.can_edit && !p.left_ward;
            const inc = p.incoming_handover;
            return `<tr class="nas-row ${e ? "changed" : ""} ${p.left_ward ? "gone" : ""}" data-adm="${p.admission_id}">
                <td><div class="nas-bed">${esc(p.room)} · ${esc(p.bed)}</div>${p.status === "Pending Discharge" ? `<div class="nas-sub">Going home</div>` : ""}${p.left_ward ? `<div class="nas-sub">Left the ward</div>` : ""}</td>
                <td><button type="button" class="nas-link nas-pt" data-chart="${esc(p.patient_mrn || p.patient_id || "")}">${esc(p.patient_name)}</button>
                    <div class="nas-sub">${esc([p.age != null ? `${p.age}y` : "", p.sex, p.diagnosis].filter(Boolean).join(" · "))}</div>
                    ${p.isolation ? `<span class="nas-iso">${esc(p.isolation)}</span>` : ""}</td>
                <td>${editable ? `<select data-role="nurse_user_id" aria-label="Nurse for ${esc(p.patient_name)}">${opt(nurses, nurse, "— No nurse —")}</select>` : esc(p.nurse_name || "—")}</td>
                <td>${editable ? `<select data-role="cna_user_id" aria-label="CNA for ${esc(p.patient_name)}">${opt(cnas, cna, "— No CNA —")}</select>` : esc(p.cna_name || "—")}</td>
                <td class="nas-hide-sm">
                    ${inc ? `<div class="nas-ho ${inc.received ? "ok" : "wait"}">${inc.received ? `✓ From ${esc(prevName)}: received` : `From ${esc(prevName)}: not received`}</div>` : `<div class="nas-sub">No hand-over from ${esc(prevName)}</div>`}
                    ${p.handover ? `<div class="nas-ho ok">✓ Written this shift</div>` : ""}
                    <button type="button" class="nas-btn small" data-handover="${p.admission_id}" style="margin-top:4px">Hand-over</button>
                </td>
            </tr>`;
        }).join("")}</tbody></table>`;
    $("nasFoot").hidden = !data.can_edit;
    updateDirty();
}

function staffRow(s, load, heavy) {
    return `<div class="nas-staff-row"><span>${esc(s.name)}${s.role === "charge_nurse" ? ` <span class="nas-sub">charge</span>` : ""}</span>
        <span class="nas-load ${load >= heavy ? "heavy" : ""}" title="${load >= heavy ? "Heavy load" : ""}">${load}</span></div>`;
}

/** How the unsaved changes move this person's patient count. */
function countEdits(s) {
    let delta = 0;
    const key = s.kind === "cna" ? "cna_user_id" : "nurse_user_id";
    edits.forEach((e, adm) => {
        const p = data.patients.find((x) => x.admission_id === adm);
        if (p[key] === s.user_id) delta--;
        if (e[key] === s.user_id) delta++;
    });
    return delta;
}

function onPick(e) {
    const sel = e.target.closest("select[data-role]");
    if (!sel) return;
    const adm = Number(sel.closest("[data-adm]").dataset.adm);
    const p = data.patients.find((x) => x.admission_id === adm);
    const cur = edits.get(adm) || { nurse_user_id: p.nurse_user_id, cna_user_id: p.cna_user_id };
    cur[sel.dataset.role] = sel.value ? Number(sel.value) : null;
    if (cur.nurse_user_id === p.nurse_user_id && cur.cna_user_id === p.cna_user_id) edits.delete(adm);
    else edits.set(adm, cur);
    sel.closest("tr").classList.toggle("changed", edits.has(adm));
    // Refresh the staff counts without redrawing the table (keeps focus).
    const scroll = $("nasStaff").scrollTop;
    const keep = edits;
    render();
    edits = keep;
    $("nasStaff").scrollTop = scroll;
    $("nasList").querySelector(`[data-adm="${adm}"] select[data-role="${sel.dataset.role}"]`)?.focus();
}

function updateDirty() {
    $("nasSave").disabled = edits.size === 0;
    $("nasDirty").textContent = edits.size ? `${edits.size} unsaved change${edits.size === 1 ? "" : "s"}` : "";
}

function onListClick(e) {
    const chart = e.target.closest("[data-chart]")?.dataset.chart;
    if (chart) {
        window.__openPatientChartFromReport?.(chart);
        return;
    }
    const adm = Number(e.target.closest("[data-handover]")?.dataset.handover);
    if (adm) openHandovers(adm, { onChange: () => { load(); loadMine(); } });
}

async function save() {
    const btn = $("nasSave");
    btn.disabled = true;
    const res = await saveAssignments({
        ward_id: data.ward_id, date: data.date, shift_id: data.shift.id,
        rows: [...edits].map(([admission_id, e]) => ({ admission_id, ...e })),
    }).catch(() => null);
    if (!res?.success) {
        btn.disabled = false;
        showToast(res?.message || "Could not save the assignments.", "error");
        return;
    }
    const told = res.data?.notified || 0;
    showToast(`Assignments saved.${told ? ` ${told} ${told === 1 ? "person was" : "people were"} notified.` : ""}`);
    load();
    loadMine();
}

async function copyPrevious() {
    if (edits.size) {
        showToast("Save or undo your changes first.", "error");
        return;
    }
    const btn = $("nasCopy");
    btn.disabled = true;
    const res = await copyPreviousShift({ ward_id: data.ward_id, date: data.date, shift_id: data.shift.id }).catch(() => null);
    btn.disabled = false;
    showToast(res?.message || "Could not copy.", res?.success ? "success" : "error");
    if (res?.success) load();
}

/** Switching ward / shift with unsaved changes: ask first (in-app, no browser dialog). */
function guardDirty(then) {
    if (!edits.size) {
        then();
        return;
    }
    const root = ensureHandoverRoot();
    $("nasHoModal").innerHTML = `
        <div class="nas-mhead"><h2 id="nasHoTitle">Discard unsaved changes?</h2></div>
        <div class="nas-mbody"><p>You changed ${edits.size} assignment${edits.size === 1 ? "" : "s"} on this shift and haven't saved.</p></div>
        <div class="nas-foot" style="padding:0 20px 16px"><button type="button" class="nas-btn" id="nasKeep">Keep editing</button><button type="button" class="nas-btn primary" id="nasDiscard">Discard and continue</button></div>`;
    root.classList.add("open");
    $("nasKeep").onclick = closeHandovers;
    $("nasDiscard").onclick = () => {
        closeHandovers();
        edits = new Map();
        then();
    };
    setTimeout(() => $("nasKeep")?.focus(), 0);
}

/* ---------------- hand-over window (also used by the patient chart) ---------------- */

const HO_CSS = `
#nasHoOverlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4200; display: none; align-items: flex-start; justify-content: center; padding: 5vh 16px 16px; overflow-y: auto; }
#nasHoOverlay.open { display: flex; }
#nasHoModal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 680px; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.3); font-size: 13.5px; }
#nasHoModal .nas-mhead { display: flex; justify-content: space-between; gap: 10px; padding: 16px 20px 6px; }
#nasHoModal .nas-mhead h2 { margin: 0; font-size: 18px; }
#nasHoModal .nas-x { border: 0; background: none; color: var(--text-muted); font-size: 22px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 6px; }
#nasHoModal .nas-mbody { padding: 4px 20px 12px; }
#nasHoModal .nas-sub { color: var(--text-muted); font-size: 12px; }
#nasHoModal .nas-team { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin: 6px 0 12px; }
#nasHoModal .nas-team div { background: var(--bg-surface-alt); border-radius: 10px; padding: 8px 10px; }
#nasHoModal .nas-ho-card { border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
#nasHoModal .nas-ho-card dl { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 4px 10px; margin: 8px 0 0; }
#nasHoModal .nas-ho-card dt { color: var(--text-muted); font-size: 12px; }
#nasHoModal .nas-ho-card dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
#nasHoModal .nas-form { display: grid; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 4px; }
#nasHoModal .nas-form label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
#nasHoModal textarea, #nasHoModal select { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
#nasHoModal textarea { min-height: 56px; resize: vertical; }
#nasHoModal .nas-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; }
#nasHoModal .nas-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
#nasHoModal .nas-btn:disabled { opacity: .55; cursor: default; }
#nasHoModal .nas-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
#nasHoModal .nas-foot { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
#nasHoModal .nas-ho { font-size: 12px; } #nasHoModal .nas-ho.ok { color: #15803d; } #nasHoModal .nas-ho.wait { color: #b45309; font-weight: 600; }
:root[data-theme="dark"] #nasHoModal .nas-ho.ok { color: #86efac; } :root[data-theme="dark"] #nasHoModal .nas-ho.wait { color: #fcd34d; }
#nasHoModal .nas-err { color: #dc2626; font-size: 12.5px; }
@media (max-width: 560px) { #nasHoModal .nas-ho-card dl { grid-template-columns: 1fr; } }
`;

function ensureHandoverRoot() {
    if (!$("nas-ho-style")) {
        const st = document.createElement("style");
        st.id = "nas-ho-style";
        st.textContent = HO_CSS;
        document.head.appendChild(st);
    }
    let root = $("nasHoOverlay");
    if (!root) {
        root = document.createElement("div");
        root.id = "nasHoOverlay";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-labelledby", "nasHoTitle");
        root.innerHTML = `<div id="nasHoModal"></div>`;
        root.addEventListener("click", (e) => {
            if (e.target === root) closeHandovers();
        });
        document.body.appendChild(root);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && root.classList.contains("open")) closeHandovers();
        });
    }
    return root;
}

function closeHandovers() {
    $("nasHoOverlay")?.classList.remove("open");
}

const SBAR = [
    ["situation", "How the patient is now", true],
    ["background", "What happened this shift"],
    ["assessment", "Concerns / watch for"],
    ["recommendation", "To do next shift"],
];

/** The hand-over window for one admission: the team, past hand-overs, write / receive. */
export async function openHandovers(admissionId, { onChange = null } = {}) {
    const root = ensureHandoverRoot();
    const modal = $("nasHoModal");
    modal.innerHTML = `<div class="nas-mbody" style="padding:24px">Loading…</div>`;
    root.classList.add("open");
    const res = await fetchHandovers(admissionId).catch(() => null);
    if (!res?.success) {
        modal.innerHTML = `<div class="nas-mhead"><h2 id="nasHoTitle">Hand-over</h2><button type="button" class="nas-x" data-close aria-label="Close">×</button></div>
            <div class="nas-mbody"><p>${esc(res?.message || "Could not load the hand-overs.")}</p></div>`;
        modal.querySelector("[data-close]").onclick = closeHandovers;
        return;
    }
    const d = res.data;
    const a = d.admission;
    const writable = d.writable;
    // Prefill from this person's own hand-over for the first writable shift (if any).
    const existing = (w) => d.handovers.find((h) => h.date === w.date && h.shift_id === w.shift.id);
    const first = writable[0] ? existing(writable[0]) : null;

    modal.innerHTML = `
        <div class="nas-mhead"><div><h2 id="nasHoTitle">Hand-over · ${esc(a?.patient_name || "")}</h2>
            <div class="nas-sub">${esc([a?.ward, a ? `Room ${a.room} · Bed ${a.bed}` : ""].filter(Boolean).join(" · "))}</div></div>
            <button type="button" class="nas-x" data-close aria-label="Close">×</button></div>
        <div class="nas-mbody">
            ${a ? `<div class="nas-team">
                <div><div class="nas-sub">${esc(shiftLabel(a.shift.date, a.shift.shift))} (now)</div>Nurse: <strong>${esc(a.team.nurse_name || "—")}</strong><br>CNA: <strong>${esc(a.team.cna_name || "—")}</strong></div>
                <div><div class="nas-sub">${esc(shiftLabel(a.next_shift.date, a.next_shift.shift))} (next)</div>Nurse: <strong>${esc(a.next_team.nurse_name || "—")}</strong><br>CNA: <strong>${esc(a.next_team.cna_name || "—")}</strong></div>
            </div>` : ""}
            ${d.handovers.length ? d.handovers.slice(0, 6).map((h) => `
                <div class="nas-ho-card">
                    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                        <strong>${esc(shiftLabel(h.date, { name: h.shift_name }))}</strong>
                        <span class="nas-ho ${h.received_at ? "ok" : "wait"}">${h.received_at ? `✓ Received by ${esc(h.received_by_name)} · ${esc(fmt(h.received_at))}` : "Not received yet"}</span>
                    </div>
                    <div class="nas-sub">Written by ${esc(h.written_by_name || "—")} · ${esc(fmt(h.updated_at || h.written_at))}</div>
                    <dl>${SBAR.filter(([k]) => h[k]).map(([k, label]) => `<dt>${label}</dt><dd>${esc(h[k])}</dd>`).join("")}</dl>
                    ${h.can_receive ? `<div class="nas-foot" style="margin-top:8px"><button type="button" class="nas-btn primary" data-receive="${h.id}">Mark received</button></div>` : ""}
                </div>`).join("") : `<p class="nas-sub">No hand-overs written for this stay yet.</p>`}
            ${writable.length ? `<form class="nas-form" id="nasHoForm" novalidate>
                <div><label for="nasHoShift">Hand-over for</label>
                    <select id="nasHoShift">${writable.map((w, i) => `<option value="${i}">${esc(shiftLabel(w.date, w.shift))}${i === 0 ? " (this shift)" : " (just ended)"}</option>`).join("")}</select></div>
                ${SBAR.map(([k, label, req]) => `<div><label for="nasHo_${k}">${label}${req ? "" : " (optional)"}</label><textarea id="nasHo_${k}" maxlength="4000">${esc(first?.[k] || "")}</textarea></div>`).join("")}
                <div class="nas-err" id="nasHoErr"></div>
                <div class="nas-foot"><button type="button" class="nas-btn primary" id="nasHoSave">${first ? "Update hand-over" : "Save hand-over"}</button></div>
            </form>` : ""}
        </div>`;
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeHandovers));
    modal.querySelectorAll("[data-receive]").forEach((b) => (b.onclick = async () => {
        b.disabled = true;
        const r = await receiveHandover(Number(b.dataset.receive)).catch(() => null);
        if (!r?.success) {
            b.disabled = false;
            showToast(r?.message || "Could not mark it received.", "error");
            return;
        }
        showToast(r.message);
        onChange?.();
        openHandovers(admissionId, { onChange });
    }));
    const shiftSel = $("nasHoShift");
    if (shiftSel) {
        shiftSel.onchange = () => {
            const h = existing(writable[Number(shiftSel.value)]);
            SBAR.forEach(([k]) => ($(`nasHo_${k}`).value = h?.[k] || ""));
            $("nasHoSave").textContent = h ? "Update hand-over" : "Save hand-over";
        };
        $("nasHoSave").onclick = async () => {
            const w = writable[Number(shiftSel.value)];
            const body = { admission_id: admissionId, date: w.date, shift_id: w.shift.id };
            SBAR.forEach(([k]) => (body[k] = $(`nasHo_${k}`).value.trim()));
            if (!body.situation) {
                $("nasHoErr").textContent = "Write how the patient is now.";
                $("nasHo_situation").focus();
                return;
            }
            $("nasHoSave").disabled = true;
            const r = await writeHandover(body).catch(() => null);
            $("nasHoSave").disabled = false;
            if (!r?.success) {
                $("nasHoErr").textContent = r?.message || "Could not save the hand-over.";
                return;
            }
            showToast("Hand-over saved.");
            onChange?.();
            openHandovers(admissionId, { onChange });
        };
    }
    setTimeout(() => modal.querySelector("[data-receive], #nasHo_situation, [data-close]")?.focus(), 0);
}
