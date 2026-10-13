import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";
import { getUser } from "../../core/session.js";
import { esc, hm, when, dayLabel, waited, ensureCss, modal, modalityTag, prepHtml, printPrep } from "./rad-ui.js?v=3";
import { loadReports, reportsHtml, onReportsClick, openPerform, openImages, openViewer } from "./rad-report.js?v=2";

/*
 * Radiology worklist (module 15, Phase 1; tab "rad_worklist"): the imaging requests waiting to be scheduled -- STAT
 * first, overdue flagged, with the safety answers and the patient's preparation -- and the day per machine, where
 * radiology books a study into a free slot, marks the patient as arrived, moves a booking or cancels it.
 * Phase 2: radiology records the study as done and uploads its images (opened in the DICOM viewer), and the
 * radiologist reports it -- the views "To report" and "Reported" come from rad-report.js.
 */

const REPORT_VIEWS = ["read", "reported"];
const REPORT_ROLES = ["admin", "doctor", "clinician", "radiologic_technologist"];

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

let state = { view: "schedule", date: "", room_id: "", modality: "", q: "" };
let data = null;
let timer = null;

export function RadWorklistView() {
    ensureCss();
    return `<div class="rad" id="radRoot"><div class="rad-empty">Loading…</div></div>`;
}

export function initRadWorklist() {
    clearInterval(timer);
    state.date ||= todayISO();
    load();
    timer = setInterval(() => {
        if (!document.getElementById("radRoot")) return clearInterval(timer);
        if (document.hidden || document.querySelector(".rbx-ov")) return;
        load(true);
    }, 30000);
}

async function load(quiet = false) {
    const root = document.getElementById("radRoot");
    if (!root) return;
    if (REPORT_VIEWS.includes(state.view)) {
        const d = await loadReports(root, state, load);
        if (d.error) {
            if (!quiet) root.innerHTML = `<div class="rad-empty">${esc(d.error)}</div>`;
            return;
        }
        data = { ...d, rooms: data?.rooms || [], options: { priorities: d.priorities, modalities: d.modalities } };
        return render(root);
    }
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const r = await api(`/radiology/worklist?${q}`).catch(() => null);
    if (!r?.success) {
        if (!quiet) root.innerHTML = `<div class="rad-empty">${esc(r?.message || "Could not load the worklist.")}</div>`;
        return;
    }
    data = r.data;
    render(root);
}

/* ---------------- rows ---------------- */

const flags = (safety) => [
    safety.pregnancy === "yes" ? `<span class="rad-flag bad">Pregnant</span>` : safety.pregnancy === "unknown" ? `<span class="rad-flag">Pregnancy not known</span>` : "",
    safety.contrast_allergy === "yes" ? `<span class="rad-flag bad">Contrast reaction</span>` : "",
    safety.implants === "yes" ? `<span class="rad-flag">Metal / implant</span>` : "",
    safety.creatinine !== null && safety.creatinine >= 1.5 ? `<span class="rad-flag">Creatinine ${safety.creatinine}</span>` : "",
    safety.sedation ? `<span class="rad-flag">Sedation</span>` : "",
    safety.isolation ? `<span class="rad-flag">${esc(safety.isolation)}</span>` : "",
].join("");

function requestRow(x) {
    const o = data.options;
    const p = x.patient;
    const todo = x.studies.filter((s) => s.status === "pending");
    const booked = x.studies.filter((s) => s.booking);
    return `<div class="rad-req ${esc(x.priority)}">
        <div>
            <div>${x.priority !== "routine" ? `<span class="rad-pri ${esc(x.priority)}">${esc(o.priorities[x.priority])}</span> ` : ""}<span class="who">${esc(p.name)}</span></div>
            <div class="muted">${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}${p.sex ? ` · ${esc(String(p.sex).charAt(0).toUpperCase())}` : ""}${p.birthdate ? ` · born ${esc(p.birthdate)}` : ""}</div>
            <div><b>${esc(x.location || x.source_label)}</b>${x.location ? ` <span class="muted">(${esc(x.source_label)})</span>` : ""}</div>
            <div>${flags(x.safety)}${x.safety.transport_label ? `<span class="muted" style="font-size:12px">${esc(x.safety.transport_label)}</span>` : ""}</div>
        </div>
        <div>
            <div>${todo.map((s) => modalityTag(s.modality, s.code || s.name, `<span class="muted" style="font-weight:500">${s.minutes}m</span>`)).join("")}</div>
            ${x.indication ? `<div>${esc(x.indication)}</div>` : ""}
            ${booked.map((s) => `<div class="rad-study muted" style="font-size:12px">${esc(s.name)} — booked ${esc(when(s.booking.start_at))}, ${esc(s.booking.room || "")}</div>`).join("")}
            <div class="muted" style="font-size:12px">${esc(x.request_no)} · ordered ${esc(when(x.ordered_at))}${x.ordering_doctor ? ` by ${esc(x.ordering_doctor)}` : ""}${x.order_mode !== "written" ? ` (${esc(String(o.modes[x.order_mode] || x.order_mode).toLowerCase())}${x.ordered_by ? `, entered by ${esc(x.ordered_by)}` : ""})` : ""}
                ${x.needed_by ? ` · needed by <b>${esc(when(x.needed_by))}</b>` : ""}</div>
        </div>
        <div class="acts">
            <div style="width:100%;text-align:right">${x.overdue ? `<span class="rad-late">waiting ${esc(waited(x.minutes_waiting))}</span>` : `<span class="muted">waiting ${esc(waited(x.minutes_waiting))}</span>`}</div>
            ${data.can_schedule ? `<button type="button" class="rad-b blue sm" data-sched="${x.id}">Schedule…</button>` : ""}
            <button type="button" class="rad-b sm" data-prep="${x.id}">Prep sheet</button>
            ${data.can_order && todo.length ? `<button type="button" class="rad-b sm" data-cancelstudy="${x.id}">Cancel a study…</button>` : ""}
        </div></div>`;
}

function bookingRow(b) {
    const p = b.patient;
    return `<div class="rad-bk ${b.status === "arrived" ? "arrived" : ""} ${b.late && b.status === "booked" ? "late" : ""}">
        <div><div class="rad-slot">${esc(hm(b.start_at))}–${esc(hm(b.end_at))}</div><div class="muted" style="font-size:12px">${b.minutes} min</div></div>
        <div><div>${b.priority !== "routine" ? `<span class="rad-pri ${esc(b.priority)}">${esc(data.options.priorities[b.priority])}</span> ` : ""}<span class="who">${esc(p.name)}</span></div>
            <div class="muted">${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}</div>
            <div class="muted" style="font-size:12px">${esc(b.location || "")}${b.transport ? ` · ${esc(b.transport)}` : ""}</div></div>
        <div><div>${modalityTag(b.modality, b.study)}${b.contrast && b.contrast !== "none" ? `<span class="muted" style="font-size:12px">${esc(b.contrast_label)}</span>` : ""}</div>
            ${b.indication ? `<div class="muted" style="font-size:12px">${esc(b.indication)}</div>` : ""}
            <div>${flags({ pregnancy: b.pregnancy, contrast_allergy: b.contrast_allergy, implants: b.implants, creatinine: null, sedation: b.sedation, isolation: b.isolation })}
                ${b.prep_given ? `<span class="muted" style="font-size:12px">prep given</span>` : `<span class="rad-flag">prep not given</span>`}</div>
            ${b.note ? `<div class="muted" style="font-size:12px">${esc(b.note)}</div>` : ""}
            ${b.status === "arrived" ? `<div style="font-size:12px"><b>In the department</b> since ${esc(hm(b.arrived_at))}</div>` : ""}
            ${b.status === "performed" ? `<div style="font-size:12px"><b>Done</b> ${esc(when(b.performed_at))}${b.technique ? ` · ${esc(b.technique)}` : ""}
                · ${b.images} image${b.images === 1 ? "" : "s"}${b.report_status === "signed" ? " · <b>reported</b>" : b.report_status === "draft" ? " · report in draft" : " · waiting for the radiologist"}</div>` : ""}
            <div class="muted" style="font-size:12px">${esc(b.request_no)}${b.booked_by ? ` · booked by ${esc(b.booked_by)}` : ""}</div></div>
        <div class="acts">${data.can_schedule && b.status !== "performed" ? `${b.status === "booked" ? `<button type="button" class="rad-b sm" data-arrived="${b.id}">Arrived</button>` : ""}
            <button type="button" class="rad-b blue sm" data-perform="${b.id}">Done…</button>
            <button type="button" class="rad-b sm" data-move="${b.id}">Move…</button><button type="button" class="rad-b sm" data-unbook="${b.id}">Cancel…</button>` : ""}
            ${b.status === "performed" && data.can_schedule ? `<button type="button" class="rad-b sm" data-images="${b.order_id}">Images…</button>` : ""}
            ${b.status === "performed" && b.images ? `<button type="button" class="rad-b sm" data-viewer="${b.order_id}">Open images</button>` : ""}
            <button type="button" class="rad-b sm" data-prep="${b.request_id}">Prep sheet</button></div></div>`;
}

function render(root) {
    const c = data.counts;
    const focus = document.activeElement?.id;
    const booked = data.view === "booked";
    const reports = REPORT_VIEWS.includes(data.view);
    const canReport = REPORT_ROLES.includes(getUser()?.role);
    const tab = (v, l) => `<button type="button" data-view="${v}" aria-pressed="${data.view === v}">${l}</button>`;
    root.innerHTML = `
        <div class="rad-head"><div><h1>Radiology worklist</h1><div class="rad-sub">${reports
            ? "Studies done, waiting for the radiologist. A signed report goes to the chart and the results inbox, and a critical finding alerts the doctor at once."
            : booked ? "The day on each machine. Book a study into a free slot, mark the patient as arrived, record it as done, move it or cancel it."
            : "Imaging requests from the clinic, the ER, the wards and the ICU, waiting to be scheduled. STAT first, then by when they are needed."} Refreshes every 30 seconds.</div></div>
            ${reports && data.is_admin ? `<button type="button" class="rad-b" data-radiologists>Radiologists…</button>` : ""}</div>
        <div class="rad-counts" role="list">${reports ? `
            <div role="listitem"><b>${c.to_report}</b>to report</div>
            <div role="listitem" class="${c.stat ? "bad" : ""}"><b>${c.stat}</b>STAT</div>
            <div role="listitem" class="${c.overdue ? "bad" : ""}"><b>${c.overdue}</b>overdue</div>
            <div role="listitem"><b>${c.drafts}</b>in draft</div>
            <div role="listitem"><b>${c.signed_today}</b>signed today</div>
            <div role="listitem" class="${c.critical_week ? "bad" : ""}"><b>${c.critical_week}</b>critical this week</div>` : `
            <div role="listitem"><b>${c.to_schedule}</b>studies to schedule</div>
            <div role="listitem" class="${c.stat ? "bad" : ""}"><b>${c.stat}</b>STAT</div>
            <div role="listitem" class="${c.overdue ? "bad" : ""}"><b>${c.overdue}</b>overdue</div>
            <div role="listitem"><b>${c.booked_today}</b>booked today</div>
            <div role="listitem"><b>${c.waiting_in_department}</b>in the department</div>`}
        </div>
        <div class="rad-tools">
            <span class="rad-tabs" role="group" aria-label="Show">${tab("schedule", "To schedule")}${tab("booked", "Day per machine")}${canReport ? tab("read", "To report") + tab("reported", "Reported") : ""}</span>
            ${booked ? `<input type="date" id="radDate" value="${esc(data.date)}" aria-label="Day">
                <select id="radRoom" aria-label="Machine"><option value="">All machines</option>${data.rooms.map((r) => `<option value="${r.id}" ${Number(state.room_id) === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>` : ""}
            <select id="radMod" aria-label="Modality"><option value="">All imaging</option>${Object.entries(data.options.modalities).map(([k, l]) => `<option value="${k}" ${state.modality === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
            <input type="search" id="radQ" value="${esc(state.q)}" placeholder="Patient, MRN, request no. or study" aria-label="Search">
        </div>
        ${reports ? reportsHtml(data) : booked ? dayHtml() : data.requests.length ? `<div class="rad-list">${data.requests.map(requestRow).join("")}</div>`
            : `<div class="rad-empty">Nothing waiting to be scheduled.</div>`}`;
    if (focus === "radQ") {
        const q = root.querySelector("#radQ");
        q.focus();
        q.setSelectionRange(q.value.length, q.value.length);
    }
    root.onclick = onClick;
    const bind = (id, key) => {
        const el = root.querySelector(id);
        if (el) {
            el.onchange = (e) => {
                state[key] = e.target.value;
                load();
            };
        }
    };
    bind("#radDate", "date");
    bind("#radRoom", "room_id");
    bind("#radMod", "modality");
    let t = null;
    root.querySelector("#radQ").oninput = (e) => {
        clearTimeout(t);
        t = setTimeout(() => {
            state.q = e.target.value.trim();
            load();
        }, 350);
    };
}

function dayHtml() {
    const total = data.day.reduce((n, r) => n + r.bookings.length, 0);
    return `<div class="rad-sub" style="margin:-6px 0 10px"><b>${esc(dayLabel(data.date))}</b> · ${total} booking${total === 1 ? "" : "s"}</div>
        <div class="rad-rooms">${data.day.map((r) => `<section class="rad-room">
            <h2>${esc(r.room.name)} <small>${esc(r.room.modality_label)}${r.room.portable ? " · portable" : ""} · ${r.room.around_the_clock ? "day and night" : `${esc(r.room.open_from)}–${esc(r.room.open_to)}`}${r.closed ? " · closed today" : ""}${r.room.location ? ` · ${esc(r.room.location)}` : ""}</small>
                <small>${r.bookings.length} booked · ${r.booked_minutes} min${r.full_pct !== null ? ` · ${r.full_pct}% full <span class="rad-fill" style="display:inline-block;width:90px;vertical-align:-1px"><i style="width:${Math.min(100, r.full_pct)}%"></i></span>` : ""}</small></h2>
            ${r.bookings.length ? r.bookings.map(bookingRow).join("") : `<div class="rad-bk"><div class="muted">—</div><div class="muted">Nothing booked${r.closed ? " (the machine does not work today)" : ""}.</div><div></div><div></div></div>`}
        </section>`).join("")}</div>
        ${!data.day.length ? `<div class="rad-empty">No machine matches that filter.</div>` : ""}`;
}

/* ---------------- clicks ---------------- */

async function onClick(e) {
    const v = e.target.closest("[data-view]");
    if (v) {
        state.view = v.dataset.view;
        return load();
    }
    if (REPORT_VIEWS.includes(state.view) && (await onReportsClick(e))) return;
    const pf = e.target.closest("[data-perform]");
    if (pf) {
        const b = findBooking(Number(pf.dataset.perform));
        return b && openPerform(b, data.now, load);
    }
    const im = e.target.closest("[data-images]");
    if (im) return openImages(Number(im.dataset.images), load);
    const vw = e.target.closest("[data-viewer]");
    if (vw) return openViewer(Number(vw.dataset.viewer));
    const s = e.target.closest("[data-sched]");
    if (s) return openSchedule(Number(s.dataset.sched));
    const pr = e.target.closest("[data-prep]");
    if (pr) return openPrep(Number(pr.dataset.prep));
    const cs = e.target.closest("[data-cancelstudy]");
    if (cs) return openCancelStudy(Number(cs.dataset.cancelstudy));
    const ar = e.target.closest("[data-arrived]");
    if (ar) {
        ar.disabled = true;
        const r = await post("/radiology/booking/arrived", { id: Number(ar.dataset.arrived) });
        ar.disabled = false;
        showToast(r?.message || "Could not save.", r?.success ? "success" : "error");
        if (r?.success) load(true);
        return;
    }
    const mv = e.target.closest("[data-move]");
    if (mv) return openMove(Number(mv.dataset.move));
    const ub = e.target.closest("[data-unbook]");
    if (ub) return openUnbook(Number(ub.dataset.unbook));
}

/* ---------------- schedule ---------------- */

function studyPicker(studies) {
    return `<div><span class="lbl">Studies to book <span style="font-weight:400">(several go one after the other)</span></span>
        <div style="display:grid;gap:4px" data-field="order_ids" tabindex="-1">${studies.map((s, i) => `<label class="rbx-chk"><input type="checkbox" name="study" value="${s.id}" data-mod="${esc(s.modality)}" data-min="${s.minutes}" ${i === 0 ? "checked" : ""}>
            <span>${esc(s.name)} <span class="muted">${esc(s.modality_label)} · ${s.minutes} min${s.contrast !== "none" ? ` · ${esc(s.contrast_label.toLowerCase())}` : ""}</span></span></label>`).join("")}</div></div>`;
}

async function openSchedule(requestId) {
    const x = data.requests.find((r) => r.id === requestId);
    if (!x) return;
    const todo = x.studies.filter((s) => s.status === "pending");
    const p = x.patient;
    const m = modal(`Schedule — ${esc(x.request_no)}`, `${esc(p.name)} · ${esc(p.mrn || "")}${x.location ? ` · ${esc(x.location)}` : ""}${x.priority !== "routine" ? ` · <b>${esc(String(x.priority).toUpperCase())}</b>` : ""}`, `
        ${flags(x.safety) ? `<div class="rbx-note warn">${flags(x.safety)}${x.safety.contrast_allergy === "yes" && x.safety.contrast_allergy_detail ? ` ${esc(x.safety.contrast_allergy_detail)}.` : ""}${x.safety.implants === "yes" && x.safety.implants_detail ? ` ${esc(x.safety.implants_detail)}.` : ""} Check with the radiologist before the scan.</div>` : ""}
        ${x.indication ? `<div class="rbx-note">${esc(x.indication)}</div>` : ""}
        ${studyPicker(todo)}
        <div class="rbx-grid">
            <div><label for="rbsRoom">Machine</label><select id="rbsRoom" name="room_id"></select></div>
            <div><label for="rbsDate">Day</label><input type="date" id="rbsDate" name="date" value="${esc(data.date || todayISO())}"></div>
        </div>
        <div><span class="lbl">Free times <span style="font-weight:400" data-slotinfo></span></span><div class="rbx-slots" data-slots><span class="muted">Choose a machine.</span></div>
            <div style="margin-top:6px"><label for="rbsAt">Or type the time</label><input type="datetime-local" id="rbsAt" name="start_at"></div></div>
        <label class="rbx-chk"><input type="checkbox" name="prep_given" ${x.studies.some((s) => s.booking?.prep_given) ? "checked" : ""}> The preparation instructions were given to the patient / the ward</label>
        <div><label for="rbsNote">Note for radiology <span style="font-weight:400">(optional)</span></label><input type="text" id="rbsNote" name="note" maxlength="255" placeholder="e.g. bring the old films, patient is deaf" autocomplete="off"></div>
        <div data-warn hidden class="rbx-note warn"></div>`,
        `<button type="button" class="rad-b" data-x>Cancel</button><button type="button" class="rad-b blue" data-save>Book it</button>`);
    let confirmed = false;
    const chosen = () => [...m.ov.querySelectorAll('input[name="study"]:checked')].map((c) => ({ id: Number(c.value), modality: c.dataset.mod, minutes: Number(c.dataset.min) }));
    const roomSel = m.$("#rbsRoom");
    const fillRooms = () => {
        const mods = [...new Set(chosen().map((c) => c.modality))];
        const list = data.rooms.filter((r) => mods.length === 0 || mods.every((x2) => x2 === r.modality));
        roomSel.innerHTML = list.length
            ? list.map((r) => `<option value="${r.id}">${esc(r.name)} — ${esc(r.modality_label)}${r.portable ? " (portable)" : ""}</option>`).join("")
            : `<option value="">No machine does all of those together</option>`;
    };
    const slotsBox = m.$("[data-slots]");
    const loadSlots = async () => {
        const list = chosen();
        const roomId = Number(roomSel.value);
        if (!roomId || !list.length) {
            slotsBox.innerHTML = `<span class="muted">Choose the studies and the machine.</span>`;
            return;
        }
        const minutes = list.reduce((t, c) => t + c.minutes, 0);
        slotsBox.innerHTML = `<span class="muted">Looking…</span>`;
        const r = await api(`/radiology/slots?room_id=${roomId}&date=${m.$("#rbsDate").value}&minutes=${minutes}`).catch(() => null);
        if (!r?.success) {
            slotsBox.innerHTML = `<span class="muted">${esc(r?.message || "Could not load the times.")}</span>`;
            return;
        }
        const d = r.data;
        m.$("[data-slotinfo]").textContent = `${minutes} min needed · ${d.closed ? "the machine does not work that day" : `${d.open_from}–${d.open_to}`}`;
        const free = d.slots.filter((s) => s.free && !s.past);
        slotsBox.innerHTML = free.length
            ? free.map((s) => `<button type="button" data-slot="${esc(s.start_at)}">${esc(hm(s.start_at))}</button>`).join("")
            : `<span class="muted">Nothing free that day${d.closed ? " (the machine does not work)" : ""}. Try another day or type a time.</span>`;
    };
    m.ov.addEventListener("change", (ev) => {
        if (ev.target.name === "study") {
            fillRooms();
            loadSlots();
        }
        if (ev.target.id === "rbsRoom" || ev.target.id === "rbsDate") loadSlots();
    });
    slotsBox.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-slot]");
        if (!b) return;
        slotsBox.querySelectorAll("button").forEach((x2) => x2.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        m.$("#rbsAt").value = b.dataset.slot.slice(0, 16).replace(" ", "T");
    });
    fillRooms();
    loadSlots();
    m.$("[data-save]").onclick = async (ev) => {
        const list = chosen();
        if (!list.length) return m.err("Tick the studies to book.", { order_ids: "Required." });
        ev.target.disabled = true;
        const res = await post("/radiology/schedule", { order_ids: list.map((c) => c.id), room_id: Number(roomSel.value), start_at: m.$("#rbsAt").value,
            prep_given: m.val("prep_given"), note: m.val("note"), confirm: confirmed ? 1 : 0 });
        ev.target.disabled = false;
        if (!res?.success) {
            if (res?.needs_confirm) {
                confirmed = true;
                m.$("[data-warn]").hidden = false;
                m.$("[data-warn]").textContent = `${res.message} Press “Book anyway”.`;
                ev.target.textContent = "Book anyway";
                return m.err("");
            }
            return m.err(res?.message || "Could not book it.", res?.errors);
        }
        m.close();
        showToast(res.message, "success", 6000);
        load(true);
    };
}

/* ---------------- move / cancel a booking ---------------- */

function findBooking(id) {
    for (const r of data.day || []) {
        const b = r.bookings.find((x) => x.id === id);
        if (b) return b;
    }
    return null;
}

function openMove(id) {
    const b = findBooking(id);
    if (!b) return;
    const m = modal(`Move — ${esc(b.study)}`, `${esc(b.patient.name)} · now ${esc(when(b.start_at))}`, `
        <div class="rbx-grid">
            <div><label for="rbmRoom">Machine</label><select id="rbmRoom" name="room_id">${data.rooms.filter((r) => r.modality === b.modality).map((r) => `<option value="${r.id}" ${r.id === (data.day.find((d) => d.bookings.some((x) => x.id === id))?.room.id) ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
            <div><label for="rbmAt">New time</label><input type="datetime-local" id="rbmAt" name="start_at" value="${esc(String(b.start_at).slice(0, 16).replace(" ", "T"))}"></div>
        </div>
        <div><label for="rbmWhy">Why move it</label><input type="text" id="rbmWhy" name="reason" maxlength="255" placeholder="e.g. patient in theatre, machine busy with an emergency" autocomplete="off"></div>
        <div data-warn hidden class="rbx-note warn"></div>`,
        `<button type="button" class="rad-b" data-x>Keep it</button><button type="button" class="rad-b blue" data-save>Move it</button>`);
    let confirmed = false;
    m.$("#rbmWhy").focus();
    m.$("[data-save]").onclick = async (ev) => {
        ev.target.disabled = true;
        const res = await post("/radiology/reschedule", { id, room_id: Number(m.$("#rbmRoom").value), start_at: m.$("#rbmAt").value, reason: m.val("reason"),
            confirm: confirmed ? 1 : 0 });
        ev.target.disabled = false;
        if (!res?.success) {
            if (res?.needs_confirm) {
                confirmed = true;
                m.$("[data-warn]").hidden = false;
                m.$("[data-warn]").textContent = `${res.message} Press “Move anyway”.`;
                ev.target.textContent = "Move anyway";
                return m.err("");
            }
            return m.err(res?.message || "Could not move it.", res?.errors);
        }
        m.close();
        showToast(res.message, "success", 6000);
        load(true);
    };
}

function openUnbook(id) {
    const b = findBooking(id);
    if (!b) return;
    const m = modal(`Cancel the booking — ${esc(b.study)}`, `${esc(b.patient.name)} · ${esc(when(b.start_at))}`, `
        <div class="rbx-note">The study goes back to the list to be scheduled. Cancel the study itself from “To schedule” if it is no longer wanted.</div>
        <div><label for="rbuWhy">Why</label><input type="text" id="rbuWhy" name="reason" maxlength="255" placeholder="e.g. machine down, patient not prepared" autocomplete="off"></div>
        <label class="rbx-chk"><input type="checkbox" name="no_show"> The patient did not come (no show)</label>`,
        `<button type="button" class="rad-b" data-x>Keep it</button><button type="button" class="rad-b blue" data-save>Cancel the booking</button>`);
    m.$("#rbuWhy").focus();
    m.$("[data-save]").onclick = async (ev) => {
        ev.target.disabled = true;
        const res = await post("/radiology/booking/cancel", { id, reason: m.val("reason"), no_show: m.val("no_show") });
        ev.target.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not cancel it.", res?.errors);
        m.close();
        showToast(res.message, "success", 6000);
        load(true);
    };
}

/* ---------------- cancel a study ---------------- */

function openCancelStudy(requestId) {
    const x = data.requests.find((r) => r.id === requestId);
    const todo = x.studies.filter((s) => s.status === "pending");
    const m = modal(`Cancel a study — ${esc(x.request_no)}`, esc(x.patient.name), `
        <div><span class="lbl">Study</span><div style="display:grid;gap:4px" data-field="order_id" tabindex="-1">${todo.map((s, i) => `<label class="rbx-chk"><input type="radio" name="order_id" value="${s.id}" ${i === 0 ? "checked" : ""}> ${esc(s.name)}</label>`).join("")}</div></div>
        <div><label for="rbcWhy">Why</label><input type="text" id="rbcWhy" name="reason" maxlength="255" placeholder="e.g. clinically better, done elsewhere" autocomplete="off"></div>`,
        `<button type="button" class="rad-b" data-x>Keep it</button><button type="button" class="rad-b blue" data-save>Cancel the study</button>`);
    m.$("#rbcWhy").focus();
    m.$("[data-save]").onclick = async (ev) => {
        ev.target.disabled = true;
        const res = await post("/radiology/cancel-study", { order_id: Number(m.val("order_id")), reason: m.val("reason") });
        ev.target.disabled = false;
        if (!res?.success) return m.err(res?.message || "Could not cancel it.", res?.errors);
        m.close();
        showToast(res.message, "success");
        load(true);
    };
}

/* ---------------- preparation sheet ---------------- */

async function openPrep(requestId) {
    const r = await api(`/radiology/prep-sheet?request_id=${requestId}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the sheet.", "error");
    const d = r.data;
    const booked = d.studies.filter((s) => s.booking);
    const m = modal(`Preparation — ${esc(d.request_no)}`, `${esc(d.patient.name)} · ${esc(d.patient.mrn || "")}${d.location ? ` · ${esc(d.location)}` : ""}`, `
        ${booked.length ? `<div class="rbx-note"><b>Booked:</b> ${booked.map((s) => `${esc(s.name)} — ${esc(when(s.booking.start_at))}, ${esc(s.booking.room || "")}`).join("; ")}</div>` : ""}
        ${prepHtml(d.prep)}
        ${booked.length ? `<div>${booked.map((s) => `<label class="rbx-chk" style="margin-bottom:4px"><input type="checkbox" data-prepgiven="${s.booking.id}" ${s.booking.prep_given ? "checked" : ""}>
            The preparation for ${esc(s.name)} was given</label>`).join("")}</div>` : ""}`,
        `<button type="button" class="rad-b" data-x>Close</button><button type="button" class="rad-b blue" data-print>Print for the patient</button>`);
    m.ov.addEventListener("change", async (ev) => {
        const cb = ev.target.closest("[data-prepgiven]");
        if (!cb) return;
        const res = await post("/radiology/booking/prep", { id: Number(cb.dataset.prepgiven), prep_given: cb.checked ? 1 : 0 });
        if (!res?.success) {
            cb.checked = !cb.checked;
            return m.err(res?.message || "Could not save.");
        }
        m.err("");
        showToast(res.message, "success");
        load(true);
    });
    m.$("[data-print]").onclick = () => printPrep(d);
}
