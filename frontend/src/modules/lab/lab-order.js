import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";
import { esc, modal, dtl } from "./lab-ui.js?v=3";

/*
 * Order lab tests (module 14, Phase 1) from the ER, a ward bed or the ICU: openLabOrder({ er_visit_id | admission_id | patient_id }).
 * The request goes to the lab worklist: tests (search or browse by section, the tube shown by its colour), priority,
 * when to collect, fasting, clinical information. Nurses enter a verbal or protocol order for a named doctor.
 */

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

export async function openLabOrder(where, onDone) {
    const q = new URLSearchParams(Object.entries(where).filter(([, v]) => v));
    const r = await api(`/lab/order-context?${q}`).catch(() => null);
    if (!r?.success) return showToast(r?.message || "Could not open the lab order.", "error");
    const c = r.data;
    const o = c.options;
    const groups = {};
    c.catalog.forEach((t) => (groups[t.group] ??= []).push(t));
    const waitingIds = new Set(c.waiting.map((w) => Number(w.test_id)));
    const dot = (t) => `<i style="background:${esc(o.containers[t.container]?.[1] || "#6b7280")}" title="${esc(o.containers[t.container]?.[0] || "")}"></i>`;
    const p = c.patient;
    const m = modal(`Order lab tests — ${esc(p.name)}`, `${esc(p.mrn || "")}${p.age !== null ? ` · ${p.age} y` : ""}${p.sex ? ` · ${esc(p.sex)}` : ""} · ${esc(c.source_label)}${c.location ? ` · ${esc(c.location)}` : ""}`, `
        ${c.waiting.length ? `<div class="lbx-note">Already ordered in the last day, not yet resulted: ${esc([...new Set(c.waiting.map((w) => w.name))].join(", "))}.</div>` : ""}
        <div><label for="lboQ">Tests</label><input type="search" id="lboQ" placeholder="Search: CBC, troponin, culture…" autocomplete="off"></div>
        <div class="lbx-tests" data-field="tests" tabindex="-1">${Object.entries(groups).map(([g, list]) => `<div data-group><h4>${esc(g)}</h4>${list.map((t) => `<label data-name="${esc(`${t.name} ${t.code || ""} ${g}`.toLowerCase())}">
            <input type="checkbox" value="${t.id}">${dot(t)}<span>${esc(t.name)}${waitingIds.has(t.id) ? ` <span class="muted">(waiting)</span>` : ""}</span><small>${esc(t.code || "")}</small></label>`).join("")}</div>`).join("")}</div>
        <div><span class="lbl">Chosen <span data-n></span></span><div class="lbx-picked" data-picked><span class="muted">None yet.</span></div></div>
        <div class="lbx-grid">
            <div><span class="lbl" id="lboPri">Priority</span><div class="lbx-seg" role="radiogroup" aria-labelledby="lboPri">
                <label><input type="radio" name="priority" value="routine" checked> Routine</label><label><input type="radio" name="priority" value="urgent"> Urgent</label>
                <label class="stat"><input type="radio" name="priority" value="stat"> STAT</label></div></div>
            <div><label for="lboAt">Collect <span style="font-weight:400">(blank = now)</span></label><input type="datetime-local" id="lboAt" name="collect_at" min="${esc(dtl(c.now))}"></div>
        </div>
        <label class="lbx-chk"><input type="checkbox" name="fasting"> Fasting sample (patient nil by mouth before collection)</label>
        <div><label for="lboInfo">Clinical information <span style="font-weight:400">(optional)</span></label><input type="text" id="lboInfo" name="clinical_info" maxlength="500" placeholder="e.g. chest pain since 2 h, on warfarin, suspected sepsis" autocomplete="off"></div>
        ${c.is_doctor ? "" : `<fieldset><legend>Ordered by</legend><div class="lbx-grid">
            <div><label for="lboMode">Type of order</label><select id="lboMode" name="order_mode"><option value="">Choose…</option><option value="verbal">${esc(o.modes.verbal)}</option><option value="protocol">${esc(o.modes.protocol)}</option></select></div>
            <div><label for="lboDoc">Doctor</label><select id="lboDoc" name="ordering_user_id"><option value="">Choose…</option>${c.doctors.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div>
        </div></fieldset>`}
        <div data-dupe hidden class="lbx-note warn"></div>`,
        `<button type="button" class="lab-b" data-x>Cancel</button><button type="button" class="lab-b blue" data-save>Send to the lab</button>`);
    const box = m.$(".lbx-tests");
    const picked = () => [...box.querySelectorAll("input:checked")].map((x) => Number(x.value));
    const byId = Object.fromEntries(c.catalog.map((t) => [t.id, t]));
    const showPicked = () => {
        const ids = picked();
        m.$("[data-n]").textContent = ids.length ? `(${ids.length})` : "";
        m.$("[data-picked]").innerHTML = ids.length ? ids.map((id) => `<span class="lab-tube">${dot(byId[id])}${esc(byId[id].code || byId[id].name)}</span>`).join("") : `<span class="muted">None yet.</span>`;
        m.$("[data-dupe]").hidden = true;
        m.$("[data-save]").textContent = "Send to the lab";
        confirmDupes = false;
    };
    let confirmDupes = false;
    box.addEventListener("change", showPicked);
    m.$("#lboQ").addEventListener("input", (e) => {
        const s = e.target.value.trim().toLowerCase();
        box.querySelectorAll("label").forEach((l) => (l.hidden = s !== "" && !l.dataset.name.includes(s)));
        box.querySelectorAll("[data-group]").forEach((g) => (g.hidden = ![...g.querySelectorAll("label")].some((l) => !l.hidden)));
    });
    m.$("#lboQ").addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const first = [...box.querySelectorAll("label")].find((l) => !l.hidden);
        if (first) {
            first.querySelector("input").checked = true;
            showPicked();
            e.target.select();
        }
    });
    m.ov.querySelectorAll('input[name="priority"]').forEach((x) => x.addEventListener("change", () => {
        const stat = m.val("priority") === "stat";
        m.$("#lboAt").disabled = stat;
        if (stat) m.$("#lboAt").value = "";
    }));
    m.$("#lboQ").focus();
    m.$("[data-save]").onclick = async (ev) => {
        const body = { ...where, tests: picked(), priority: m.val("priority"), collect_at: m.val("collect_at"), fasting: m.val("fasting"), clinical_info: m.val("clinical_info"),
            order_mode: c.is_doctor ? "written" : m.val("order_mode"), ordering_user_id: m.val("ordering_user_id"), confirm: confirmDupes ? 1 : 0 };
        ev.target.disabled = true;
        const res = await post("/lab/order", body);
        ev.target.disabled = false;
        if (!res?.success) {
            if (res?.needs_confirm) {
                confirmDupes = true;
                m.$("[data-dupe]").hidden = false;
                m.$("[data-dupe]").textContent = `${res.message} Press “Order again” to send anyway.`;
                ev.target.textContent = "Order again";
                return m.err("");
            }
            return m.err(res?.message || "Could not send the order.", res?.errors);
        }
        m.close();
        showToast(res.message, "success", 6000);
        onDone?.(res.data);
    };
}

