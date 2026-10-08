import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * Fall risk (Morse Fall Scale): nurses score the six items; the patient's level (low / moderate /
 * high) shows on the ward boards and as the room TV's fall-risk icon. Earlier assessments listed.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const FALL_LABEL = { low: "Low", moderate: "Moderate", high: "High" };

/** A small badge for boards: "Fall risk: High". */
export function fallBadge(level) {
    if (!level) return "";
    const tone = level === "high" ? "#b91c1c" : level === "moderate" ? "#b45309" : "#15803d";
    return `<span class="frk-badge" style="display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:9px;border:1px solid ${tone};color:${tone};margin-left:4px" title="Morse Fall Scale">Fall risk: ${FALL_LABEL[level]}</span>`;
}

const CSS = `
.frk-ov { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4700; display: flex; align-items: center; justify-content: center; padding: 16px; }
.frk { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 600px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.35); overflow: hidden; }
.frk-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 6px; }
.frk-head h2 { margin: 0; font-size: 18px; }
.frk-x { border: 0; background: none; font-size: 22px; cursor: pointer; color: var(--text-muted); padding: 4px 8px; border-radius: 6px; }
.frk-body { padding: 6px 20px 4px; overflow: auto; font-size: 13.5px; }
.frk fieldset { border: 0; border-bottom: 1px solid var(--border-color); margin: 0; padding: 10px 0; }
.frk legend { font-weight: 700; padding: 0; margin-bottom: 6px; }
.frk-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.frk-opts label { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--border-color); border-radius: 999px; cursor: pointer; font-size: 13px; }
.frk-opts label:has(input:checked) { border-color: var(--accent); background: var(--accent-light); color: var(--accent); font-weight: 600; }
.frk-opts small { color: var(--text-muted); }
.frk fieldset[aria-invalid="true"] legend { color: #dc2626; }
.frk-total { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; font-size: 15px; font-weight: 700; }
.frk-lvl { padding: 3px 10px; border-radius: 999px; color: #fff; }
.frk-lvl.low { background: #15803d; } .frk-lvl.moderate { background: #b45309; } .frk-lvl.high { background: #b91c1c; }
.frk textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; font: inherit; background: var(--bg-surface); color: var(--text-primary); min-height: 44px; }
.frk-err { color: #dc2626; font-size: 12.5px; min-height: 1em; }
.frk-hist { font-size: 12.5px; color: var(--text-muted); margin: 10px 0 4px; }
.frk-hist ul { margin: 4px 0 0; padding-left: 18px; }
.frk-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--border-color); }
.frk-b { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.frk-b.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.frk-b:focus-visible, .frk-x:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

export async function openFallRisk(admissionId, { onSaved } = {}) {
    if (!document.getElementById("frk-style")) {
        const st = document.createElement("style");
        st.id = "frk-style";
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    const res = await api(`/fall-risk?admission_id=${encodeURIComponent(admissionId)}`).catch(() => null);
    if (!res?.success) {
        showToast(res?.message || "Could not open the fall risk.", "error");
        return;
    }
    const d = res.data;
    const prev = d.history[0]?.items || {};
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "frk-ov";
    ov.innerHTML = `<form class="frk" role="dialog" aria-modal="true" aria-labelledby="frkTitle" novalidate>
        <div class="frk-head"><h2 id="frkTitle">Fall risk — ${esc(d.patient_name)}</h2><button type="button" class="frk-x" data-close aria-label="Close">×</button></div>
        <div class="frk-body">
            <div class="frk-hist">Morse Fall Scale. ${d.level ? `Now: <b>${FALL_LABEL[d.level]}</b> (${d.score}), ${esc(String(d.assessed_at).slice(0, 16))}. The answers below are from the last assessment.` : "Not assessed yet."}</div>
            ${Object.entries(d.questions).map(([k, [q, opts]]) => `<fieldset data-item="${k}"><legend>${esc(q)}</legend><div class="frk-opts">
                ${Object.entries(opts).map(([v, [label, pts]]) => `<label><input type="radio" name="frk_${k}" value="${v}" data-pts="${pts}" ${prev[k] === v ? "checked" : ""}> ${esc(label)} <small>${pts}</small></label>`).join("")}
            </div></fieldset>`).join("")}
            <div class="frk-total" aria-live="polite"><span>Score <span data-score>—</span></span><span data-level></span></div>
            <label for="frkNote" style="font-size:12.5px;font-weight:600;color:var(--text-muted)">Note (optional)</label>
            <textarea id="frkNote" maxlength="500" placeholder="e.g. bed alarm on, non-slip socks, call bell within reach"></textarea>
            <div class="frk-err" role="alert"></div>
            ${d.history.length ? `<div class="frk-hist">Earlier<ul>${d.history.map((h) => `<li>${esc(String(h.assessed_at).slice(0, 16))} · ${FALL_LABEL[h.level]} (${h.score}) · ${esc(h.assessed_by_name || "")}${h.note ? ` — ${esc(h.note)}` : ""}</li>`).join("")}</ul></div>` : ""}
        </div>
        <div class="frk-foot"><button type="button" class="frk-b" data-close>Cancel</button><button type="submit" class="frk-b primary">Save</button></div>
    </form>`;
    document.body.appendChild(ov);
    const f = ov.querySelector("form");
    const total = () => {
        const picked = [...f.querySelectorAll("input[type=radio]:checked")];
        const score = picked.reduce((s, r) => s + Number(r.dataset.pts), 0);
        const all = picked.length === Object.keys(d.questions).length;
        const level = score >= 45 ? "high" : score >= 25 ? "moderate" : "low";
        f.querySelector("[data-score]").textContent = all ? score : `${score} so far`;
        f.querySelector("[data-level]").innerHTML = all ? `<span class="frk-lvl ${level}">${FALL_LABEL[level]} risk</span>` : "";
    };
    f.addEventListener("change", total);
    total();
    const close = () => {
        ov.remove();
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
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    f.querySelectorAll("[data-close]").forEach((b) => (b.onclick = close));
    f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = f.querySelector(".frk-err");
        f.querySelectorAll("fieldset").forEach((x) => x.removeAttribute("aria-invalid"));
        const items = {};
        let missing = null;
        f.querySelectorAll("fieldset[data-item]").forEach((fs) => {
            const v = fs.querySelector("input:checked")?.value;
            if (v) items[fs.dataset.item] = v;
            else {
                fs.setAttribute("aria-invalid", "true");
                missing ||= fs;
            }
        });
        if (missing) {
            err.textContent = "Answer every question.";
            missing.querySelector("input").focus();
            return;
        }
        err.textContent = "";
        const btn = f.querySelector("button[type=submit]");
        btn.disabled = true;
        const r = await api("/fall-risk", { method: "POST", body: JSON.stringify({ admission_id: admissionId, items, note: f.querySelector("#frkNote").value.trim() }) }).catch(() => null);
        btn.disabled = false;
        if (!r?.success) {
            err.textContent = r?.message || "Could not save.";
            return;
        }
        showToast(r.message, "success");
        close();
        onSaved?.(r.data);
    });
    (f.querySelector("input:checked") || f.querySelector("input")).focus();
}
