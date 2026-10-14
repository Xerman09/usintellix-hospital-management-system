import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { esc, modal, dtl, modalityTag, prepHtml, printPrep } from "./rad-ui.js?v=4";

/*
 * Order imaging (module 15, Phase 1) from the ER, a ward bed or the ICU: openRadOrder({ er_visit_id | admission_id | patient_id }).
 * The request goes to the radiology worklist: the studies (search or browse by modality, with the machine time each
 * needs), priority, when it is needed and the clinical question -- plus the safety answers radiology must have, asked
 * only when they matter: pregnancy for anything with X-rays, a previous contrast reaction and the creatinine for
 * contrast into a vein, metal and implants for MRI. The patient's preparation instructions are shown and can be printed.
 * Nurses enter a verbal or protocol order for a named doctor.
 */

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

export async function openRadOrder(where, onDone) {
    const q = new URLSearchParams(Object.entries(where).filter(([, v]) => v));
    const r = await api(`/radiology/order-context?${q}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the imaging order.", "error");
    const c = r.data;
    const o = c.options;
    const groups = {};
    c.catalog.forEach((s) => (groups[s.group] ??= []).push(s));
    const waitingIds = new Set(c.waiting.map((w) => Number(w.study_id)));
    const p = c.patient;
    const female = String(p.sex || "").toLowerCase().startsWith("f");
    const childbearing = female && (p.age === null || (p.age >= 12 && p.age <= 55));
    const answers = (name, extra = "") => `<div class="rbx-seg" data-field="${name}" role="radiogroup" aria-labelledby="${name}_l">
        ${Object.entries(o.answers).map(([k, l]) => `<label class="${k === "yes" ? "yes" : ""}"><input type="radio" name="${name}" value="${k}"> ${esc(l)}</label>`).join("")}${extra}</div>`;
    const m = modal(`Order imaging — ${esc(p.name)}`, `${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}${p.sex ? ` · ${esc(p.sex)}` : ""} · ${esc(c.source_label)}${c.location ? ` · ${esc(c.location)}` : ""}`, `
        ${c.waiting.length ? `<div class="rbx-note">Already ordered and not done yet: ${esc([...new Set(c.waiting.map((w) => w.name))].join(", "))}.</div>` : ""}
        <div><label for="rboQ">Studies</label><input type="search" id="rboQ" placeholder="Search: chest, CT abdomen, ultrasound KUB…" autocomplete="off"></div>
        <div class="rbx-studies" data-field="studies" tabindex="-1">${Object.entries(groups).map(([g, list]) => `<div data-group><h4>${esc(g)}</h4>${list.map((s) => `<label data-name="${esc(`${s.name} ${s.code || ""} ${g} ${s.modality_label}`.toLowerCase())}">
            <input type="checkbox" value="${s.id}"><span>${esc(s.name)}${waitingIds.has(s.id) ? ` <span class="muted">(waiting)</span>` : ""}</span>
            <small>${s.minutes} min${s.contrast !== "none" ? " · contrast" : ""}${s.portable ? " · portable" : ""}</small></label>`).join("")}</div>`).join("")}</div>
        <div><span class="lbl">Chosen <span data-n></span></span><div class="rbx-picked" data-picked><span class="muted">None yet.</span></div></div>
        <div class="rbx-grid">
            <div><span class="lbl" id="rboPri">Priority</span><div class="rbx-seg" role="radiogroup" aria-labelledby="rboPri">
                <label><input type="radio" name="priority" value="routine" checked> Routine</label><label><input type="radio" name="priority" value="urgent"> Urgent</label>
                <label class="stat"><input type="radio" name="priority" value="stat"> STAT</label></div></div>
            <div><label for="rboNeed">Needed by <span style="font-weight:400">(blank = when it fits)</span></label><input type="datetime-local" id="rboNeed" name="needed_by" min="${esc(dtl(c.now))}"></div>
        </div>
        <div><label for="rboInd">What should the scan answer?</label><input type="text" id="rboInd" name="indication" maxlength="500"
            placeholder="e.g. right lower abdominal pain 2 days, query appendicitis" autocomplete="off"></div>
        <div class="rbx-grid">
            <div><label for="rboTr">How does the patient travel?</label><select id="rboTr" name="transport"><option value="">—</option>
                ${Object.entries(o.transport).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
            <div><label for="rboIso">Isolation <span style="font-weight:400">(optional)</span></label><input type="text" id="rboIso" name="isolation" maxlength="100" placeholder="e.g. airborne, contact" autocomplete="off"></div>
            <div><label for="rboW">Weight (kg) <span style="font-weight:400">(optional)</span></label><input type="text" id="rboW" name="weight_kg" maxlength="6" inputmode="decimal"
                value="${c.last.weight_kg ? esc(c.last.weight_kg.value) : ""}" autocomplete="off"></div>
        </div>
        <label class="rbx-chk"><input type="checkbox" name="sedation"> The patient will need sedation (a small child, confused or cannot keep still)</label>
        <fieldset data-safety hidden><legend>Before radiology can scan</legend>
            <div data-preg hidden><span class="lbl" id="pregnancy_l">Could the patient be pregnant? <span style="font-weight:400">(this study uses X-rays)</span></span>
                ${answers("pregnancy")}
                <div style="margin-top:6px"><label for="rboLmp">Last menstrual period <span style="font-weight:400">(optional)</span></label><input type="date" id="rboLmp" name="lmp" max="${esc(String(c.now).slice(0, 10))}"></div></div>
            <div data-contrast hidden><span class="lbl" id="contrast_allergy_l">Has the patient ever reacted to contrast (X-ray dye)?</span>
                ${answers("contrast_allergy")}
                <div class="rbx-grid" style="margin-top:6px">
                    <div><label for="rboAllD">What happened <span style="font-weight:400">(optional)</span></label><input type="text" id="rboAllD" name="contrast_allergy_detail" maxlength="255" placeholder="e.g. rash, wheeze" autocomplete="off"></div>
                    <div><label for="rboCr">Creatinine (mg/dL)</label><input type="text" id="rboCr" name="creatinine" maxlength="6" inputmode="decimal"
                        value="${c.last.creatinine ? esc(c.last.creatinine.value) : ""}" autocomplete="off">
                        ${c.last.creatinine ? `<div class="muted" style="font-size:12px">On file from ${esc(c.last.creatinine.at)}</div>` : `<div class="muted" style="font-size:12px">None on file</div>`}</div>
                    <div><label for="rboCrAt">Taken on</label><input type="date" id="rboCrAt" name="creatinine_at" max="${esc(String(c.now).slice(0, 10))}"
                        value="${c.last.creatinine ? esc(c.last.creatinine.at) : ""}"></div>
                </div></div>
            <div data-implants hidden><span class="lbl" id="implants_l">Any pacemaker, metal clips, implant or metal in the body? <span style="font-weight:400">(MRI)</span></span>
                ${answers("implants")}
                <div style="margin-top:6px"><label for="rboImpD">What <span style="font-weight:400">(optional)</span></label><input type="text" id="rboImpD" name="implants_detail" maxlength="255" placeholder="e.g. hip replacement 2019, shrapnel" autocomplete="off"></div></div>
        </fieldset>
        <div data-prep hidden></div>
        <div data-warn hidden class="rbx-note warn"></div>`,
        `<button type="button" class="rad-b" data-x>Cancel</button><button type="button" class="rad-b blue" data-save>Send to radiology</button>`);
    const box = m.$(".rbx-studies");
    const byId = Object.fromEntries(c.catalog.map((s) => [s.id, s]));
    const picked = () => [...box.querySelectorAll("input:checked")].map((x) => Number(x.value));
    let confirmed = false;
    const refresh = () => {
        const ids = picked();
        const chosen = ids.map((id) => byId[id]);
        m.$("[data-n]").textContent = ids.length ? `(${ids.length} · ${chosen.reduce((t, s) => t + s.minutes, 0)} min on the machine)` : "";
        m.$("[data-picked]").innerHTML = chosen.length
            ? chosen.map((s) => modalityTag(s.modality, s.code || s.name, `<span class="muted" style="font-weight:500">${s.minutes}m</span>`)).join("")
            : `<span class="muted">None yet.</span>`;
        const modalities = [...new Set(chosen.map((s) => s.modality))];
        const needsPreg = childbearing && modalities.some((x) => o.ionising.includes(x));
        const needsContrast = chosen.some((s) => ["iv", "both", "optional"].includes(s.contrast));
        const needsImplants = modalities.includes("mri");
        m.$("[data-preg]").hidden = !needsPreg;
        m.$("[data-contrast]").hidden = !needsContrast;
        m.$("[data-implants]").hidden = !needsImplants;
        m.$("[data-safety]").hidden = !(needsPreg || needsContrast || needsImplants);
        const prep = m.$("[data-prep]");
        prep.hidden = !chosen.length;
        if (chosen.length) {
            prep.innerHTML = `<span class="lbl">How the patient gets ready</span>${prepHtml({
                studies: chosen.map((s) => ({ name: s.name, modality_label: s.modality_label, minutes: s.minutes, contrast_label: s.contrast_label, prep: s.prep || "No special preparation." })),
                general: [],
            })}`;
        }
        m.$("[data-warn]").hidden = true;
        m.$("[data-save]").textContent = "Send to radiology";
        confirmed = false;
    };
    box.addEventListener("change", refresh);
    m.$("#rboQ").addEventListener("input", (e) => {
        const s = e.target.value.trim().toLowerCase();
        box.querySelectorAll("label").forEach((l) => (l.hidden = s !== "" && !l.dataset.name.includes(s)));
        box.querySelectorAll("[data-group]").forEach((g) => (g.hidden = ![...g.querySelectorAll("label")].some((l) => !l.hidden)));
    });
    m.$("#rboQ").addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const first = [...box.querySelectorAll("label")].find((l) => !l.hidden);
        if (first) {
            first.querySelector("input").checked = true;
            refresh();
            e.target.select();
        }
    });
    m.ov.querySelectorAll('input[name="priority"]').forEach((x) => x.addEventListener("change", () => {
        const stat = m.val("priority") === "stat";
        m.$("#rboNeed").disabled = stat;
        if (stat) m.$("#rboNeed").value = "";
    }));
    m.$("#rboQ").focus();
    m.$("[data-save]").onclick = async (ev) => {
        const body = {
            ...where, studies: picked(), priority: m.val("priority"), needed_by: m.val("needed_by"), indication: m.val("indication"),
            transport: m.val("transport"), isolation: m.val("isolation"), weight_kg: m.val("weight_kg"), sedation: m.val("sedation"),
            pregnancy: m.val("pregnancy"), lmp: m.val("lmp"), contrast_allergy: m.val("contrast_allergy"), contrast_allergy_detail: m.val("contrast_allergy_detail"),
            creatinine: m.val("creatinine"), creatinine_at: m.val("creatinine_at"), implants: m.val("implants"), implants_detail: m.val("implants_detail"),
            order_mode: c.is_doctor ? "written" : m.val("order_mode"), ordering_user_id: m.val("ordering_user_id"), confirm: confirmed ? 1 : 0,
        };
        ev.target.disabled = true;
        const res = await post("/radiology/order", body);
        ev.target.disabled = false;
        if (!res?.success) {
            if (res?.needs_confirm) {
                confirmed = true;
                const w = m.$("[data-warn]");
                w.hidden = false;
                w.innerHTML = `<b>Read this before sending:</b><ul>${(res.warnings || [res.message]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
                ev.target.textContent = "Send anyway";
                return m.err("");
            }
            return m.err(res?.message || "Could not send the order.", res?.errors);
        }
        m.close();
        showToast(res.message, "success", 6000);
        onDone?.(res.data);
        showPrep(res.data);
    };
    if (!c.is_doctor) {
        m.$("[data-safety]").insertAdjacentHTML("beforebegin", `<fieldset><legend>Ordered by</legend><div class="rbx-grid">
            <div><label for="rboMode">Type of order</label><select id="rboMode" name="order_mode"><option value="">Choose…</option>
                <option value="verbal">${esc(o.modes.verbal)}</option><option value="protocol">${esc(o.modes.protocol)}</option></select></div>
            <div><label for="rboDoc">Doctor</label><select id="rboDoc" name="ordering_user_id"><option value="">Choose…</option>
                ${c.doctors.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div></div></fieldset>`);
    }
}

/** After ordering: the preparation instructions, with a print button for the patient or the ward. */
function showPrep(data) {
    const m = modal(`Sent — ${esc(data.request_no)}`, "Radiology will schedule it. Give these instructions to the patient (or the ward) now.", prepHtml(data.prep),
        `<button type="button" class="rad-b" data-x>Done</button><button type="button" class="rad-b blue" data-print>Print the preparation sheet</button>`);
    m.$("[data-print]").onclick = async () => {
        const r = await api(`/radiology/prep-sheet?request_id=${data.id}`).catch(() => null);
        if (!r?.success) return m.err(r?.message || "Could not open the sheet.");
        printPrep(r.data);
    };
}
