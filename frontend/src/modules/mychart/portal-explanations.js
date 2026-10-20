import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Patient Explanations (tab "portal_explanations", Laboratory settings).
 *
 * The plain-language wording a patient reads under a test result in My Chart. Seeded
 * with a starting set, but the hospital owns the words: an admin can reword anything
 * here, and the screen also lists the tests a patient can meet that nothing explains
 * yet, so the gaps are visible.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let editing = null;   // { kind, name, code } of the row being edited

export function PortalExplanationsView() {
    return `
<style>
.pex { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pex h1 { margin: 0; font-size: 22px; }
.pex .pex-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pex-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pex input, .pex textarea, .pex select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pex textarea { width: 100%; min-height: 58px; resize: vertical; }
.pex-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pex-btn.primary { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pex-btn:disabled { opacity: .55; cursor: default; }
.pex-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pex-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pex-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pex-table th, .pex-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pex-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pex-table tr:last-child td { border-bottom: 0; }
.pex-sub { color: var(--text-muted); font-size: 12px; }
.pex-kind { display: inline-block; border: 1px solid var(--border-color); border-radius: 999px; padding: 0 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); }
.pex-form { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; }
.pex-form h3 { margin: 0 0 10px; font-size: 15px; }
.pex-form label { display: block; font-weight: 600; font-size: 12.5px; margin-bottom: 3px; }
.pex-form .pex-field { margin-bottom: 10px; }
.pex-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pex-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pex-counts b { font-size: 18px; margin-right: 4px; }
</style>
<div class="pex">
    <h1>Patient explanations</h1>
    <p class="pex-intro">What a patient reads under a test result in My Chart: what the test measures, why it is done, and what
        a high or low result can mean. These words go straight to patients, so keep them plain and avoid anything that sounds
        like a diagnosis — the screen already tells the patient that a usual range is not a diagnosis.</p>
    <div id="pexBody"><div class="pex-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalExplanations() {
    await load();
}

async function load(q = "") {
    const res = await api(`/portal-explanations${q ? `?q=${encodeURIComponent(q)}` : ""}`).catch(() => null);
    const body = $("pexBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pex-sub" style="padding:24px;text-align:center">Could not load the explanations. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pexBody");
    const canEdit = !!data.can_edit;

    body.innerHTML = `
        <div class="pex-counts">
            <div><b>${data.counts.explained}</b>explained</div>
            <div><b>${data.counts.missing}</b>with no explanation yet</div>
        </div>
        <div class="pex-bar">
            <input type="search" id="pexQ" value="${esc(q)}" placeholder="Find a test" aria-label="Find a test" style="min-width:240px">
            ${canEdit ? `<button type="button" class="pex-btn primary" id="pexAdd">Add an explanation</button>` : ""}
        </div>
        <div id="pexFormBox"></div>
        <div class="pex-card">
            <table class="pex-table"><thead><tr><th>Test</th><th>What it measures</th><th>High / low</th><th>Source</th><th></th></tr></thead>
            <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                : `<tr><td colspan="5" class="pex-sub" style="padding:20px;text-align:center">Nothing matches.</td></tr>`}</tbody></table>
        </div>
        ${data.missing.length ? `<h2 style="font-size:16px;margin:0 0 6px">Not explained yet</h2>
            <p class="pex-sub" style="margin:0 0 8px">A patient meeting one of these sees the result with no explanation under it.</p>
            <div class="pex-card"><table class="pex-table"><tbody>
                ${data.missing.map((m) => `<tr><td><span class="pex-kind">${esc(m.kind)}</span> ${esc(m.name)}${m.code ? ` <span class="pex-sub">${esc(m.code)}</span>` : ""}</td>
                    <td style="text-align:right">${canEdit ? `<button type="button" class="pex-btn" data-new="${esc(m.name)}" data-kind="${esc(m.kind)}" data-code="${esc(m.code || "")}">Write one</button>` : ""}</td></tr>`).join("")}
            </tbody></table></div>` : ""}`;

    const search = $("pexQ");
    let t = null;
    search.oninput = (e) => {
        clearTimeout(t);
        const v = e.target.value;
        t = setTimeout(() => load(v.trim()), 350);
    };

    if (canEdit) {
        $("pexAdd").onclick = () => form(null);
        body.querySelectorAll("[data-edit]").forEach((b) => {
            b.onclick = () => form(data.items.find((x) => String(x.id) === b.dataset.edit));
        });
        body.querySelectorAll("[data-new]").forEach((b) => {
            b.onclick = () => form({ kind: b.dataset.kind, name: b.dataset.new, code: b.dataset.code });
        });
    }

    if (editing) {
        const again = data.items.find((x) => x.kind === editing.kind && x.name === editing.name);
        form(again || editing);
    }
}

function rowHtml(r) {
    return `<tr>
        <td><strong>${esc(r.name)}</strong>${r.is_active ? "" : ` <span class="pex-sub">(off)</span>`}
            <div class="pex-sub"><span class="pex-kind">${esc(r.kind)}</span>${r.code ? ` ${esc(r.code)}` : ""}</div></td>
        <td>${esc(r.what_it_measures || "")}${r.why_ordered ? `<div class="pex-sub">${esc(r.why_ordered)}</div>` : ""}</td>
        <td>${r.high_means ? `<div><b>High:</b> ${esc(r.high_means)}</div>` : ""}${r.low_means ? `<div><b>Low:</b> ${esc(r.low_means)}</div>` : ""}${!r.high_means && !r.low_means ? "—" : ""}</td>
        <td class="pex-sub">${esc(r.source || "")}</td>
        <td style="text-align:right">${data.can_edit ? `<button type="button" class="pex-btn" data-edit="${r.id}">Edit</button>` : ""}</td>
    </tr>`;
}

function form(r) {
    editing = r ? { kind: r.kind || "lab", name: r.name, code: r.code || "" } : null;
    const box = $("pexFormBox");
    const v = (k) => esc(r && r[k] != null ? r[k] : "");
    const area = (k, label, hint = "") => `<div class="pex-field"><label for="pexF_${k}">${label}</label>
        <textarea id="pexF_${k}" data-f="${k}" placeholder="${esc(hint)}">${v(k)}</textarea></div>`;

    box.innerHTML = `<div class="pex-form">
        <h3>${r && r.id ? `Edit “${esc(r.name)}”` : r ? `Write an explanation for “${esc(r.name)}”` : "Add an explanation"}</h3>
        <div class="pex-field" style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="flex:1 1 220px"><label for="pexF_name">Test name (must match the result exactly)</label>
                <input id="pexF_name" data-f="name" value="${v("name")}" style="width:100%"></div>
            <div style="flex:0 0 160px"><label for="pexF_kind">Kind</label>
                <select id="pexF_kind" data-f="kind" style="width:100%">
                    <option value="lab" ${(r?.kind || "lab") === "lab" ? "selected" : ""}>Laboratory</option>
                    <option value="imaging" ${r?.kind === "imaging" ? "selected" : ""}>Imaging</option>
                </select></div>
            <div style="flex:0 0 160px"><label for="pexF_code">Code (imaging)</label>
                <input id="pexF_code" data-f="code" value="${v("code")}" style="width:100%"></div>
        </div>
        ${area("what_it_measures", "What it measures", "The protein in your red blood cells that carries oxygen…")}
        ${area("why_ordered", "Why it is done", "Part of a blood count, to look for anaemia…")}
        ${area("high_means", "What a high result can mean", "Leave blank for imaging.")}
        ${area("low_means", "What a low result can mean", "Leave blank for imaging.")}
        <div class="pex-field" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
            <div style="flex:1 1 260px"><label for="pexF_source">Where the wording came from</label>
                <input id="pexF_source" data-f="source" value="${v("source")}" style="width:100%"></div>
            <label style="font-weight:600;font-size:12.5px"><input type="checkbox" id="pexF_active" ${!r || r.is_active === undefined || r.is_active ? "checked" : ""}> Shown to patients</label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="pex-btn primary" id="pexSave">Save</button>
            <button type="button" class="pex-btn" id="pexCancel">Cancel</button>
            <span class="pex-sub" id="pexErr"></span>
        </div>
    </div>`;

    box.scrollIntoView({ behavior: "smooth", block: "nearest" });

    $("pexCancel").onclick = () => {
        editing = null;
        box.innerHTML = "";
    };

    $("pexSave").onclick = async (e) => {
        const payload = { is_active: $("pexF_active").checked ? 1 : 0 };
        box.querySelectorAll("[data-f]").forEach((f) => (payload[f.dataset.f] = f.value.trim()));
        e.target.disabled = true;
        const res = await api("/portal-explanations", { method: "POST", body: JSON.stringify(payload) }).catch(() => null);
        e.target.disabled = false;

        if (!res?.success) {
            $("pexErr").textContent = res?.message || "Could not save.";
            return;
        }

        editing = null;
        box.innerHTML = "";
        showToast(res.message, "success", 6000);
        await load($("pexQ")?.value.trim() || "");
    };
}
