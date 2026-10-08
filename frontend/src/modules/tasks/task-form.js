import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * The "New task" form (module 8, Phase 2): what is to be done, for which patient, for whom
 * (the patient's nurse, a role, or one person), when it is due, and how urgent. Also edits an
 * open task (same form, filled in).
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ROLE_LABEL = { nurse: "Nurse", charge_nurse: "Charge nurse", cna: "CNA", doctor: "Doctor", clinician: "Clinician", pharmacist: "Pharmacist",
    lab_technician: "Lab", receptionist: "Reception", admin: "Admin", staff: "Staff", accountant: "Accounts" };

const CSS = `
.tkf-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4700; display: flex; align-items: center; justify-content: center; padding: 16px; }
.tkf { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 560px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.35); overflow: hidden; }
.tkf-head { padding: 16px 20px 6px; display: flex; justify-content: space-between; align-items: center; }
.tkf-head h2 { margin: 0; font-size: 18px; }
.tkf-x { border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; color: var(--text-muted); padding: 4px 8px; border-radius: 6px; }
.tkf-x:hover { background: var(--bg-surface-alt); }
.tkf-body { padding: 8px 20px 4px; overflow: auto; display: grid; gap: 12px; }
.tkf label, .tkf .tkf-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.tkf input[type=text], .tkf input[type=datetime-local], .tkf select, .tkf textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13.5px; background: var(--bg-surface); color: var(--text-primary); }
.tkf textarea { min-height: 54px; resize: vertical; }
.tkf [aria-invalid="true"] { border-color: #dc2626 !important; }
.tkf-err { color: #dc2626; font-size: 12px; margin-top: 3px; min-height: 0; }
.tkf-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.tkf-seg label { display: inline-flex; align-items: center; gap: 6px; margin: 0; padding: 6px 11px; border: 1px solid var(--border-color); border-radius: 999px; font-size: 13px; color: var(--text-primary); cursor: pointer; font-weight: 600; }
.tkf-seg input { margin: 0; }
.tkf-seg label:has(input:checked) { border-color: var(--accent); background: var(--accent-light); color: var(--accent); }
.tkf-seg label:has(input:disabled) { opacity: .5; cursor: not-allowed; }
.tkf-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
@media (max-width: 520px) { .tkf-row { grid-template-columns: minmax(0, 1fr); } }
.tkf-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.tkf-quick button { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 6px; padding: 3px 8px; font: inherit; font-size: 12px; cursor: pointer; }
.tkf-quick button:hover { background: var(--bg-surface-alt); }
.tkf-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px 16px; border-top: 1px solid var(--border-color); margin-top: 8px; }
.tkf-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.tkf-b.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.tkf-b:disabled { opacity: .6; cursor: default; }
.tkf-b:focus-visible, .tkf-x:focus-visible, .tkf-quick button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.tkf-hint { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
`;

let options = null;

/** DB-clock "YYYY-MM-DD HH:MM:SS" + minutes -> "YYYY-MM-DDTHH:MM" (rounded up to 15 minutes). */
function plus(now, minutes, round = true) {
    const [d, t] = String(now).split(" ");
    const [y, m, day] = d.split("-").map(Number);
    const [h, mi] = t.split(":").map(Number);
    const ms = Date.UTC(y, m - 1, day, h, mi) + minutes * 60000;
    const x = new Date(round ? Math.ceil(ms / 900000) * 900000 : ms);
    const p = (n) => String(n).padStart(2, "0");
    return `${x.getUTCFullYear()}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())}T${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`;
}

/**
 * Open the form. opts: task? (edit an open task), admission_id? / patient_id? (pre-select the
 * patient), onSaved?(task)
 */
export async function openTaskForm(opts = {}) {
    if (!document.getElementById("tkf-style")) {
        const st = document.createElement("style");
        st.id = "tkf-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    const res = await api("/tasks/options").catch(() => null);
    if (!res?.success) {
        showToast(res?.message || "Could not open the task form.", "error");
        return;
    }
    options = res.data;
    const t = opts.task || null;
    const admission = t?.admission_id ?? opts.admission_id ?? "";
    const type = t?.assign_type || (admission ? "patient_nurse" : "user");
    const due = t ? t.due_at.slice(0, 16).replace(" ", "T") : plus(options.now, 60);
    const byRole = {};
    options.staff.forEach((s) => (byRole[s.role] ||= []).push(s));
    const opener = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "tkf-overlay";
    overlay.innerHTML = `<form class="tkf" role="dialog" aria-modal="true" aria-labelledby="tkfTitle" novalidate>
        <div class="tkf-head"><h2 id="tkfTitle">${t ? "Change task" : "New task"}</h2><button type="button" class="tkf-x" data-tkf-close aria-label="Close">×</button></div>
        <div class="tkf-body">
            <div><label for="tkfTitleIn">Task</label>
                <input type="text" id="tkfTitleIn" maxlength="200" value="${esc(t?.title || "")}" placeholder="e.g. Wound dressing, Blood sugar check, Remove IV line">
                <div class="tkf-err" data-err="title"></div></div>
            <div><label for="tkfPatient">Patient</label>
                <select id="tkfPatient"><option value="">No patient</option>
                    ${options.patients.map((p) => `<option value="${p.admission_id}" ${String(admission) === String(p.admission_id) ? "selected" : ""}>${esc(p.name)} — ${esc(p.ward)} ${esc(p.bed)}</option>`).join("")}
                    ${t && t.patient_id && !t.admission_id ? `<option value="p${t.patient_id}" selected>${esc(t.patient_name)}</option>` : ""}
                </select>
                <div class="tkf-err" data-err="admission_id"></div></div>
            <div><span class="tkf-label" id="tkfForLbl">For</span>
                <div class="tkf-seg" role="radiogroup" aria-labelledby="tkfForLbl">
                    <label><input type="radio" name="tkfType" value="patient_nurse" ${type === "patient_nurse" ? "checked" : ""}> The patient's nurse</label>
                    <label><input type="radio" name="tkfType" value="role" ${type === "role" ? "checked" : ""}> A role</label>
                    <label><input type="radio" name="tkfType" value="user" ${type === "user" ? "checked" : ""}> A person</label>
                </div>
                <div class="tkf-hint" data-tkf-hint></div>
                <div class="tkf-err" data-err="assign_type"></div></div>
            <div data-tkf-role hidden><label for="tkfRole">Role</label>
                <select id="tkfRole">${Object.entries(options.roles).map(([v, l]) => `<option value="${v}" ${t?.assigned_role === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
                <div class="tkf-err" data-err="assigned_role"></div></div>
            <div data-tkf-user hidden><label for="tkfUser">Person</label>
                <select id="tkfUser"><option value="">Choose…</option>
                    ${Object.entries(byRole).map(([r, list]) => `<optgroup label="${esc(ROLE_LABEL[r] || r)}">${list.map((s) => `<option value="${s.id}" ${t?.assigned_user_id === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</optgroup>`).join("")}
                </select>
                <div class="tkf-err" data-err="assigned_user_id"></div></div>
            <div class="tkf-row">
                <div><label for="tkfDue">Due</label>
                    <input type="datetime-local" id="tkfDue" value="${esc(due)}">
                    <div class="tkf-quick" aria-label="Quick times">
                        <button type="button" data-tkf-in="30">In 30 min</button><button type="button" data-tkf-in="60">In 1 h</button>
                        <button type="button" data-tkf-in="120">In 2 h</button><button type="button" data-tkf-in="240">In 4 h</button></div>
                    <div class="tkf-err" data-err="due_at"></div></div>
                <div><span class="tkf-label" id="tkfPriLbl">Priority</span>
                    <div class="tkf-seg" role="radiogroup" aria-labelledby="tkfPriLbl">
                        ${Object.entries(options.priorities).map(([v, l]) => `<label><input type="radio" name="tkfPri" value="${v}" ${(t?.priority || "routine") === v ? "checked" : ""}> ${esc(l)}</label>`).join("")}
                    </div>
                    <div class="tkf-hint">Urgent: its overdue alert must be acknowledged.</div></div>
            </div>
            <div><label for="tkfDetails">Details <span style="font-weight:400">(optional)</span></label>
                <textarea id="tkfDetails" maxlength="1000" placeholder="e.g. Left leg, use silver dressing">${esc(t?.details || "")}</textarea>
                <div class="tkf-err" data-err="details"></div></div>
        </div>
        <div class="tkf-actions"><button type="button" class="tkf-b" data-tkf-close>Cancel</button><button type="submit" class="tkf-b primary">${t ? "Save changes" : "Give task"}</button></div>
    </form>`;
    document.body.appendChild(overlay);
    const f = overlay.querySelector("form");
    const $ = (s) => f.querySelector(s);

    const sync = () => {
        const hasAdmission = /^\d+$/.test($("#tkfPatient").value);
        const pn = $('input[value="patient_nurse"]');
        pn.disabled = !hasAdmission;
        if (!hasAdmission && pn.checked) $('input[value="user"]').checked = true;
        const v = f.querySelector('input[name="tkfType"]:checked').value;
        $("[data-tkf-role]").hidden = v !== "role";
        $("[data-tkf-user]").hidden = v !== "user";
        $("[data-tkf-hint]").textContent = v === "patient_nurse"
            ? "Whoever is the patient's nurse when it's due (else the ward's nurses)."
            : v === "role" ? "Anyone with that role; nurses and CNAs of the patient's ward when a patient is chosen." : "";
    };
    f.querySelectorAll('input[name="tkfType"]').forEach((r) => (r.onchange = sync));
    $("#tkfPatient").onchange = sync;
    sync();

    const close = () => {
        overlay.remove();
        document.removeEventListener("keydown", onKey, true);
        opener?.focus?.();
    };
    const onKey = (e) => {
        if (e.key === "Escape") {
            e.stopPropagation();
            close();
        }
    };
    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });
    f.querySelectorAll("[data-tkf-close]").forEach((b) => (b.onclick = close));
    f.querySelectorAll("[data-tkf-in]").forEach((b) => (b.onclick = () => { $("#tkfDue").value = plus(options.now, Number(b.dataset.tkfIn)); }));

    f.addEventListener("submit", async (e) => {
        e.preventDefault();
        f.querySelectorAll("[data-err]").forEach((x) => (x.textContent = ""));
        f.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
        const pv = $("#tkfPatient").value;
        const type = f.querySelector('input[name="tkfType"]:checked').value;
        const body = {
            id: t?.id || undefined, title: $("#tkfTitleIn").value.trim(), details: $("#tkfDetails").value.trim(),
            admission_id: /^\d+$/.test(pv) ? Number(pv) : null, patient_id: pv.startsWith("p") ? Number(pv.slice(1)) : null,
            assign_type: type, assigned_role: type === "role" ? $("#tkfRole").value : null, assigned_user_id: type === "user" ? Number($("#tkfUser").value) || null : null,
            due_at: $("#tkfDue").value, priority: f.querySelector('input[name="tkfPri"]:checked').value,
        };
        const local = {};
        if (!body.title) local.title = "What is to be done?";
        if (type === "user" && !body.assigned_user_id) local.assigned_user_id = "Choose the person.";
        if (!body.due_at) local.due_at = "When is it due?";
        const fieldOf = { title: "#tkfTitleIn", details: "#tkfDetails", admission_id: "#tkfPatient", assigned_role: "#tkfRole", assigned_user_id: "#tkfUser", due_at: "#tkfDue" };
        const show = (errs) => {
            let first = null;
            Object.entries(errs).forEach(([k, m]) => {
                const box = f.querySelector(`[data-err="${k}"]`);
                if (box) box.textContent = m;
                const el = fieldOf[k] && $(fieldOf[k]);
                if (el) {
                    el.setAttribute("aria-invalid", "true");
                    first ||= el;
                }
            });
            (first || $("#tkfTitleIn")).focus();
        };
        if (Object.keys(local).length) {
            show(local);
            return;
        }
        const btn = f.querySelector("button[type=submit]");
        btn.disabled = true;
        const r = await api("/tasks", { method: "POST", body: JSON.stringify(body) }).catch(() => null);
        btn.disabled = false;
        if (!r?.success) {
            if (r?.errors) show(r.errors);
            else showToast(r?.message || "Could not save the task.", "error");
            return;
        }
        showToast(r.message, "success");
        close();
        opts.onSaved?.(r.data);
    });
    $("#tkfTitleIn").focus();
}
