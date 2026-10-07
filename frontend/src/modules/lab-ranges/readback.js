import { api } from "../../core/api.js?v=5";
import { systemNow, toDateTimeInput } from "../../core/timezone.js";

/*
 * The read-back form for a critical lab result, used where a critical lab alert is
 * acknowledged (the bell's pop-up, the chart's red banner, the Alerts page): who was told
 * (me, or someone else and their role), when, how, that they read the result back, and
 * what was done. It completes the alert's row in the Critical TAT report.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const METHODS = [["EHR Alert", "Read the alert in the system"], ["Phone", "Phone"], ["In-Person", "In person"], ["SMS", "SMS / text"], ["Pager", "Pager"]];

const CSS = `
.rbk { display: grid; gap: 8px; font-size: 13px; text-align: left; }
.rbk label { font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 2px; }
.rbk input[type=text], .rbk input[type=datetime-local], .rbk select, .rbk textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 6px 9px; font: inherit; font-size: 13px; }
.rbk textarea { min-height: 54px; resize: vertical; }
.rbk .rbk-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
@media (max-width: 560px) { .rbk .rbk-row { grid-template-columns: 1fr; } }
.rbk .rbk-who { display: flex; gap: 14px; flex-wrap: wrap; }
.rbk .rbk-who label, .rbk .rbk-check { display: flex; gap: 6px; align-items: center; font-weight: 600; color: var(--text-primary); font-size: 13px; margin: 0; }
.rbk .rbk-check { align-items: flex-start; }
.rbk input[type=radio], .rbk input[type=checkbox] { width: auto; margin: 2px 0 0; }
.rbk [aria-invalid="true"] { border-color: #dc2626 !important; }
.rbk .rbk-err { color: #dc2626; font-size: 12px; min-height: 1em; }
`;

function ensureCss() {
    if (!document.getElementById("rbk-style")) {
        const st = document.createElement("style");
        st.id = "rbk-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
}

/** The form's HTML; p = a unique id prefix (several forms can be on a page). */
export function readBackFormHtml(p) {
    ensureCss();
    return `<div class="rbk" data-rbk="${p}">
        <div><label>Who was told — the doctor or nurse responsible?</label>
            <div class="rbk-who" role="radiogroup">
                <label><input type="radio" name="${p}Who" value="self" checked> Me (I'm responsible)</label>
                <label><input type="radio" name="${p}Who" value="other"> Someone else</label></div></div>
        <div class="rbk-row" data-rbk-other hidden>
            <div><label for="${p}Name">Name</label><input type="text" id="${p}Name" maxlength="200" placeholder="e.g. Dr Santos"></div>
            <div><label for="${p}Role">Role</label><input type="text" id="${p}Role" maxlength="150" placeholder="e.g. Attending physician"></div></div>
        <div class="rbk-row">
            <div><label for="${p}At">When</label><input type="datetime-local" id="${p}At" value="${toDateTimeInput(systemNow())}"></div>
            <div><label for="${p}How">How</label><select id="${p}How">${METHODS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></div></div>
        <label class="rbk-check"><input type="checkbox" id="${p}Rb"> The result was read back (patient, test and value repeated) and confirmed</label>
        <div><label for="${p}Act">What was done</label><textarea id="${p}Act" maxlength="1000" placeholder="e.g. repeat K ordered, calcium gluconate 10 mL IV given, doctor coming to see the patient"></textarea></div>
        <div class="rbk-err" role="alert"></div>
    </div>`;
}

/** Wire the "Me / someone else" switch. */
export function bindReadBack(root, p) {
    const box = root.querySelector(`[data-rbk="${p}"]`);
    box.querySelectorAll(`input[name="${p}Who"]`).forEach((r) => {
        r.onchange = () => {
            const other = box.querySelector(`input[name="${p}Who"]:checked`).value === "other";
            box.querySelector("[data-rbk-other]").hidden = !other;
            box.querySelector("#" + p + "How").value = other ? "Phone" : "EHR Alert";
            if (other) box.querySelector("#" + p + "Name").focus();
        };
    });
}

/** Check and send. Returns the server's answer, or null when the form isn't complete (the error is shown). */
export async function submitReadBack(root, p, alertId) {
    const box = root.querySelector(`[data-rbk="${p}"]`);
    const $ = (id) => box.querySelector("#" + p + id);
    const err = box.querySelector(".rbk-err");
    box.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
    const self = box.querySelector(`input[name="${p}Who"]:checked`).value === "self";
    const fail = (msg, el) => {
        err.textContent = msg;
        if (el) {
            el.setAttribute("aria-invalid", "true");
            el.focus();
        }
        return null;
    };
    if (!self && !$("Name").value.trim()) return fail("Who was told?", $("Name"));
    if (!$("Rb").checked) return fail("Confirm the read-back: the person told repeated the patient, test and value.", $("Rb"));
    if (!$("Act").value.trim()) return fail("Say what was done about it.", $("Act"));
    err.textContent = "";
    const res = await api("/critical-labs/acknowledge", {
        method: "POST",
        body: JSON.stringify({
            alert_id: alertId, told_self: self ? 1 : 0, told_name: self ? "" : $("Name").value.trim(), told_role: self ? "" : $("Role").value.trim(),
            told_at: $("At").value, method: $("How").value, read_back: 1, action: $("Act").value.trim(),
        }),
    }).catch(() => null);
    if (!res?.success) {
        const first = res?.errors ? Object.keys(res.errors)[0] : null;
        const map = { told_name: "Name", told_at: "At", method: "How", read_back: "Rb", action: "Act" };
        return fail(res?.message || "Could not save.", first && map[first] ? $(map[first]) : null) || res;
    }
    return res;
}
