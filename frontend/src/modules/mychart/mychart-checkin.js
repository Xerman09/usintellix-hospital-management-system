import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { ensureCss, esc, when, dayLabel } from "./mychart-ui.js?v=7";

/*
 * My Chart -> Check in (patient portal, Phase 5).
 *
 * The paperwork for a visit, done at home in the two days before it: confirm your
 * contact details, confirm your insurance, sign the consents, answer the visit
 * questionnaire, and optionally photograph an ID. Each step saves on its own, so
 * the patient can stop and come back.
 *
 * Nothing here verifies anyone: an uploaded ID only tells the desk to check it.
 */

let list = null;
let current = null;   // the appointment being checked in
let openStep = null;

export function MyChartCheckinView() {
    return `<div class="mc" id="mcCheckin"><div class="mc-empty">Loading…</div></div>`;
}

export async function initMyChartCheckin() {
    ensureCss();
    await load();
}

async function load() {
    const root = document.getElementById("mcCheckin");
    if (!root) return;

    const res = await api("/mychart/checkin").catch(() => null);

    if (!res?.success) {
        root.innerHTML = `<div class="mc-empty">${esc(res?.message || "Check-in could not be loaded. Please try again.")}</div>`;
        return;
    }

    list = res.data;
    if (current) {
        await openCheckin(current.appointment.id);
    } else {
        renderList();
    }
}

function renderList() {
    const root = document.getElementById("mcCheckin");

    root.innerHTML = `
        <div class="mc-head">
            <h1>Check in for your visit</h1>
            <p class="mc-sub">You can check in from home up to ${list.opens_hours} hours before an appointment. It takes a
                couple of minutes, and means there is nothing to fill in when you arrive.</p>
        </div>
        ${list.items.length ? `<div class="mc-list">${list.items.map(rowHtml).join("")}</div>`
            : `<div class="mc-empty">Nothing to check in for right now. Check-in opens ${list.opens_hours} hours before an appointment.</div>`}
        <div id="mcCheckinBox"></div>`;

    root.querySelectorAll("[data-checkin]").forEach((b) => (b.onclick = () => openCheckin(Number(b.dataset.checkin))));
}

function rowHtml(a) {
    const done = a.checkin_status === "completed";
    const meta = [a.department, a.facility, a.doctor ? `With ${a.doctor}` : "", a.reason].filter(Boolean);
    return `<div class="mc-row static">
        <span class="mc-main">
            <span class="mc-name">${esc(a.title)}</span>
            ${done ? `<span class="mc-chip ok">Checked in</span>` : `<span class="mc-chip kind">${a.done} of ${a.of} steps</span>`}
            <span class="mc-meta">${esc(meta.join(" · "))}</span>
            <button type="button" class="mc-b ${done ? "" : "blue"} sm" data-checkin="${a.appointment_id}">
                ${done ? "See what you sent" : a.done ? "Carry on checking in" : "Check in now"}</button>
        </span>
        <span class="mc-right"><b>${esc(dayLabel(a.when))}</b><br>${a.all_day ? "All day" : esc(String(a.when).slice(11, 16))}</span>
    </div>`;
}

/* ---------------- one check-in ---------------- */

const STEPS = [
    { key: "demographics", title: "Your contact details", blurb: "So we can reach you about this visit." },
    { key: "insurance", title: "Your insurance", blurb: "Tell us if anything has changed since last time." },
    { key: "consents", title: "Consents", blurb: "The privacy notice and consent to be treated." },
    { key: "questionnaire", title: "A few questions", blurb: "So your doctor can prepare." },
    { key: "id_document", title: "Photo of your ID", blurb: "Optional. The desk checks it when you arrive." },
];

async function openCheckin(appointmentId) {
    const root = document.getElementById("mcCheckin");
    const res = await api(`/mychart/checkin/start?appointment_id=${appointmentId}`).catch(() => null);

    if (!res?.success) {
        showToast(res?.message || "That check-in could not be opened.", "error", 6000);
        current = null;
        renderList();
        return;
    }

    current = res.data;
    renderCheckin();
}

function renderCheckin() {
    const root = document.getElementById("mcCheckin");
    const c = current.checkin;
    const a = current.appointment;
    const doneAll = c.status === "completed";

    root.innerHTML = `
        <div class="mc-head">
            <button type="button" class="mc-b sm" id="mcBack">← All visits</button>
            <h1 style="margin-top:8px">Check in</h1>
            <p class="mc-sub">${esc(dayLabel(a.when))} at ${esc(String(a.when).slice(11, 16))}${a.department ? ` · ${esc(a.department)}` : ""}${
                a.reason ? ` · ${esc(a.reason)}` : ""}</p>
        </div>
        ${doneAll ? `<div class="mc-done">You are checked in. When you arrive, just tell the desk your name.</div>` : ""}
        <div class="mc-steps">
            ${STEPS.map((s) => {
                const at = c.steps[s.key];
                return `<div class="mc-step ${at ? "done" : ""}">
                    <div class="mc-step-head">
                        <span class="mc-step-tick" aria-hidden="true">${at ? "✓" : ""}</span>
                        <span><b>${esc(s.title)}</b><span class="mc-meta"> ${esc(s.blurb)}</span>
                            ${at ? `<span class="mc-meta">Done ${esc(when(at))}</span>` : ""}</span>
                        <button type="button" class="mc-b sm" data-step="${s.key}">${at ? "Change" : "Start"}</button>
                    </div>
                    <div class="mc-step-body" data-body="${s.key}"></div>
                </div>`;
            }).join("")}
        </div>
        ${!doneAll ? `<div style="margin-top:14px"><button type="button" class="mc-b blue" id="mcFinish">I have finished</button>
            <span class="mc-err" id="mcFinishErr"></span></div>` : ""}`;

    root.querySelector("#mcBack").onclick = () => {
        current = null;
        openStep = null;
        load();
    };
    root.querySelectorAll("[data-step]").forEach((b) => (b.onclick = () => toggleStep(b.dataset.step)));

    const finish = root.querySelector("#mcFinish");
    if (finish) {
        finish.onclick = async () => {
            finish.disabled = true;
            const res = await api("/mychart/checkin/complete", {
                method: "POST", body: JSON.stringify({ appointment_id: current.appointment.id }),
            }).catch(() => null);
            finish.disabled = false;

            if (!res?.success) {
                root.querySelector("#mcFinishErr").textContent = res?.message || "There are still steps to finish.";
                return;
            }

            showToast(res.message, "success", 8000);
            await openCheckin(current.appointment.id);
        };
    }

    if (openStep) renderStepBody(openStep);
}

function toggleStep(key) {
    openStep = openStep === key ? null : key;
    document.querySelectorAll("[data-body]").forEach((d) => (d.innerHTML = ""));
    if (openStep) renderStepBody(openStep);
}

function renderStepBody(key) {
    const box = document.querySelector(`[data-body="${key}"]`);
    if (!box) return;

    if (key === "demographics") box.innerHTML = demographicsForm();
    if (key === "insurance") box.innerHTML = insuranceForm();
    if (key === "consents") box.innerHTML = consentsForm();
    if (key === "questionnaire") box.innerHTML = questionnaireForm();
    if (key === "id_document") box.innerHTML = idForm();

    const save = box.querySelector("[data-save]");
    if (save) save.onclick = () => saveStep(key, box, save);

    const upload = box.querySelector("#mcIdFile");
    if (upload) box.querySelector("[data-upload]").onclick = () => uploadId(box);
}

const field = (id, label, value, type = "text", extra = "") =>
    `<div class="mc-field"><label for="${id}">${esc(label)}</label>
     <input type="${type}" id="${id}" value="${esc(value ?? "")}" ${extra}></div>`;

function demographicsForm() {
    const c = current.contact;
    return `<div class="mc-form">
        <div class="mc-grid">
            ${field("mcAddr", "Street address", c.address_line)}
            ${field("mcCity", "City or town", c.city)}
            ${field("mcProv", "Province", c.province)}
            ${field("mcZip", "Post code", c.zip_code)}
            ${field("mcMobile", "Mobile number", c.mobile_phone, "tel")}
            ${field("mcHome", "Home number", c.home_phone, "tel")}
            ${field("mcEmail", "Email", c.email, "email")}
        </div>
        <div class="mc-formrow"><button type="button" class="mc-b blue sm" data-save>Save and confirm</button>
            <span class="mc-err" data-err></span></div>
    </div>`;
}

function insuranceForm() {
    const ins = current.insurance;
    return `<div class="mc-form">
        ${ins.length ? `<table class="mc-tbl"><thead><tr><th>Insurer</th><th>Policy</th><th>Type</th></tr></thead><tbody>
            ${ins.map((i) => `<tr><td>${esc(i.insurer || "—")}</td><td>${esc(i.policy_number || "—")}</td><td>${esc(i.insurance_type || "—")}</td></tr>`).join("")}
        </tbody></table>` : `<p class="mc-meta">We have no insurance on file for you.</p>`}
        <label class="mc-check"><input type="checkbox" id="mcInsChanged"> Something has changed (new card, new policy, or none any more)</label>
        <div class="mc-field"><label for="mcInsNote">What changed?</label>
            <input type="text" id="mcInsNote" maxlength="255" placeholder="e.g. new PhilHealth card"></div>
        <p class="mc-meta">Please bring the card with you — the desk updates your record from it.</p>
        <div class="mc-formrow"><button type="button" class="mc-b blue sm" data-save>Save and confirm</button>
            <span class="mc-err" data-err></span></div>
    </div>`;
}

function consentsForm() {
    const signed = current.consents.npp_acknowledged_at;
    return `<div class="mc-form">
        ${signed ? `<p class="mc-meta">You last signed the privacy notice on ${esc(when(signed))}.</p>` : ""}
        <label class="mc-check"><input type="checkbox" id="mcNpp"> I have read the Notice of Privacy Practices and understand how
            my information is used.</label>
        <label class="mc-check"><input type="checkbox" id="mcTreat"> I consent to be examined and treated at this visit.</label>
        <div class="mc-field"><label for="mcSign">Type your full name to sign</label>
            <input type="text" id="mcSign" maxlength="150" autocomplete="name"></div>
        <div class="mc-formrow"><button type="button" class="mc-b blue sm" data-save>Sign</button>
            <span class="mc-err" data-err></span></div>
    </div>`;
}

function questionnaireForm() {
    const q = current.questionnaire;
    if (!q) return `<p class="mc-meta">There are no questions for this visit.</p>`;

    return `<div class="mc-form">
        ${q.intro ? `<p class="mc-meta">${esc(q.intro)}</p>` : ""}
        ${q.questions.map((item) => {
            const id = `mcQ_${item.key}`;
            const req = item.required ? ` <span class="mc-req">needed</span>` : "";
            if (item.type === "textarea") {
                return `<div class="mc-field"><label for="${id}">${esc(item.label)}${req}</label>
                    <textarea id="${id}" data-q="${esc(item.key)}" maxlength="1000"></textarea></div>`;
            }
            if (item.type === "yesno") {
                return `<div class="mc-field"><span class="mc-qlabel">${esc(item.label)}${req}</span>
                    <span class="mc-radios">${["Yes", "No"].map((o) => `<label><input type="radio" name="${id}" data-q="${esc(item.key)}" value="${o}"> ${o}</label>`).join("")}</span></div>`;
            }
            if (item.type === "choice") {
                return `<div class="mc-field"><label for="${id}">${esc(item.label)}${req}</label>
                    <select id="${id}" data-q="${esc(item.key)}"><option value="">—</option>
                    ${(item.options || []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select></div>`;
            }
            if (item.type === "checkboxes") {
                return `<div class="mc-field"><span class="mc-qlabel">${esc(item.label)}${req}</span>
                    <span class="mc-radios">${(item.options || []).map((o) => `<label><input type="checkbox" data-qmulti="${esc(item.key)}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</span></div>`;
            }
            return `<div class="mc-field"><label for="${id}">${esc(item.label)}${req}</label>
                <input type="text" id="${id}" data-q="${esc(item.key)}" maxlength="500"></div>`;
        }).join("")}
        <div class="mc-formrow"><button type="button" class="mc-b blue sm" data-save>Save my answers</button>
            <span class="mc-err" data-err></span></div>
    </div>`;
}

function idForm() {
    return `<div class="mc-form">
        <p class="mc-meta">A photo of any government ID helps the desk find you quickly. This is optional, and the desk still
            checks the original when you arrive — uploading it does not verify your identity by itself.
            ${current.identity_status ? `Your record is currently marked “${esc(current.identity_status)}”.` : ""}</p>
        <div class="mc-field"><label for="mcIdFile">Choose a photo</label><input type="file" id="mcIdFile" accept="image/*,.pdf"></div>
        <div class="mc-formrow"><button type="button" class="mc-b blue sm" data-upload>Upload</button>
            <span class="mc-err" data-err></span></div>
    </div>`;
}

/* ---------------- saving ---------------- */

async function saveStep(key, box, btn) {
    const err = box.querySelector("[data-err]");
    err.textContent = "";
    const body = { appointment_id: current.appointment.id, step: key };

    if (key === "demographics") {
        Object.assign(body, {
            address_line: box.querySelector("#mcAddr").value.trim(),
            city: box.querySelector("#mcCity").value.trim(),
            province: box.querySelector("#mcProv").value.trim(),
            zip_code: box.querySelector("#mcZip").value.trim(),
            mobile_phone: box.querySelector("#mcMobile").value.trim(),
            home_phone: box.querySelector("#mcHome").value.trim(),
            email: box.querySelector("#mcEmail").value.trim(),
        });
    }

    if (key === "insurance") {
        body.has_changes = box.querySelector("#mcInsChanged").checked ? 1 : 0;
        body.note = box.querySelector("#mcInsNote").value.trim();
    }

    if (key === "consents") {
        body.npp = box.querySelector("#mcNpp").checked ? 1 : 0;
        body.treatment = box.querySelector("#mcTreat").checked ? 1 : 0;
        body.signature = box.querySelector("#mcSign").value.trim();
    }

    if (key === "questionnaire") {
        const answers = {};
        box.querySelectorAll("[data-q]").forEach((el) => {
            if (el.type === "radio") {
                if (el.checked) answers[el.dataset.q] = el.value;
            } else if (el.value.trim() !== "") {
                answers[el.dataset.q] = el.value.trim();
            }
        });
        box.querySelectorAll("[data-qmulti]:checked").forEach((el) => {
            (answers[el.dataset.qmulti] ||= []).push(el.value);
        });
        body.answers = answers;
    }

    btn.disabled = true;
    const res = await api("/mychart/checkin/step", { method: "POST", body: JSON.stringify(body) }).catch(() => null);
    btn.disabled = false;

    if (!res?.success) {
        err.textContent = res?.message || "That could not be saved.";
        return;
    }

    showToast(res.message, "success", 5000);
    openStep = null;
    await openCheckin(current.appointment.id);
}

/** The ID photo goes through the documents endpoint the portal already has. */
async function uploadId(box) {
    const input = box.querySelector("#mcIdFile");
    const err = box.querySelector("[data-err]");
    err.textContent = "";

    if (!input.files?.length) {
        err.textContent = "Choose a photo first.";
        return;
    }

    const form = new FormData();
    form.append("file", input.files[0]);
    form.append("category", "Identification");
    form.append("title", "Identification document");

    const { API_URL } = await import("../../core/api.js?v=10");
    const up = await fetch(`${API_URL}/patient-documents`, { method: "POST", credentials: "include", body: form })
        .then((r) => r.json()).catch(() => null);

    if (!up?.success) {
        err.textContent = up?.message || "That photo could not be uploaded.";
        return;
    }

    const res = await api("/mychart/checkin/step", {
        method: "POST", body: JSON.stringify({ appointment_id: current.appointment.id, step: "id_document" }),
    }).catch(() => null);

    if (!res?.success) {
        err.textContent = res?.message || "The photo was uploaded but could not be recorded.";
        return;
    }

    showToast(res.message, "success", 6000);
    openStep = null;
    await openCheckin(current.appointment.id);
}
