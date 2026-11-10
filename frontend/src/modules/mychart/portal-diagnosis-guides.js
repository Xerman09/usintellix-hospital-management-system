import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

/*
 * Diagnosis Guides (tab "portal_diagnosis_guides").
 *
 * What a patient reads under their own diagnosis in My Chart: what the condition is,
 * why it happens, what to do, what not to do, and when to get help the same day.
 * Seeded with a starting set, but the hospital owns the words -- admins and doctors
 * can reword anything here.
 *
 * The screen also lists the diagnoses patients have actually been given that no guide
 * matches, so the gaps are visible here rather than discovered by a patient looking at
 * their diagnosis with nothing under it.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let data = null;
let editing = null;   // title of the row being edited

export function PortalDiagnosisGuidesView() {
    return `
<style>
.pdg { padding: 20px 24px 40px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.pdg h1 { margin: 0; font-size: 22px; }
.pdg .pdg-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 80ch; line-height: 1.5; }
.pdg input, .pdg textarea, .pdg select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; box-sizing: border-box; }
.pdg textarea { width: 100%; min-height: 58px; resize: vertical; }
.pdg textarea.tall { min-height: 96px; }
.pdg-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.pdg-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
.pdg-btn.primary { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.pdg-btn:disabled { opacity: .55; cursor: default; }
.pdg-btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.pdg-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; margin-bottom: 16px; }
.pdg-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pdg-table th, .pdg-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.pdg-table th { color: var(--text-muted); font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.pdg-table tr:last-child td { border-bottom: 0; }
.pdg-sub { color: var(--text-muted); font-size: 12px; }
.pdg-code { display: inline-block; border: 1px solid var(--border-color); border-radius: 999px; padding: 0 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); }
.pdg-pill { display: inline-block; border-radius: 999px; padding: 0 8px; font-size: 11px; font-weight: 700; margin-right: 4px; }
.pdg-pill.do { background: #dcfce7; color: #166534; }
.pdg-pill.dont { background: #fee2e2; color: #991b1b; }
.pdg-form { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; }
.pdg-form h3 { margin: 0 0 10px; font-size: 15px; }
.pdg-form label { display: block; font-weight: 600; font-size: 12.5px; margin-bottom: 3px; }
.pdg-form .pdg-field { margin-bottom: 10px; }
.pdg-counts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pdg-counts div { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 10px; background: var(--bg-surface); font-size: 12.5px; }
.pdg-counts b { font-size: 18px; margin-right: 4px; }
.pdg-rules { border: 1px solid var(--border-color); border-left: 3px solid #1d4ed8; border-radius: 8px; background: var(--bg-surface-alt); padding: 10px 12px; margin-bottom: 12px; font-size: 12.5px; line-height: 1.55; }
.pdg-rules ul { margin: 6px 0 0; padding-left: 18px; }
</style>
<div class="pdg">
    <h1>Diagnosis guides</h1>
    <p class="pdg-intro">What a patient reads under their own diagnosis in My Chart: what the condition is, why it happens,
        what to do and what not to do, and when to come back the same day. These words go straight to patients, who are
        reading them about themselves, so keep them plain and calm.</p>
    <div id="pdgBody"><div class="pdg-sub" style="padding:24px;text-align:center">Loading…</div></div>
</div>`;
}

export async function initPortalDiagnosisGuides() {
    await load();
}

async function load(q = "") {
    const res = await api(`/portal-diagnosis-guides${q ? `?q=${encodeURIComponent(q)}` : ""}`).catch(() => null);
    const body = $("pdgBody");
    if (!body) return;

    if (!res?.success) {
        body.innerHTML = `<div class="pdg-sub" style="padding:24px;text-align:center">Could not load the guides. ${esc(res?.message || "")}</div>`;
        return;
    }

    data = res.data;
    render(q);
}

function render(q = "") {
    const body = $("pdgBody");
    const canEdit = !!data.can_edit;

    body.innerHTML = `
        <div class="pdg-counts">
            <div><b>${data.counts.guides}</b>conditions explained</div>
            <div><b>${data.counts.missing}</b>diagnoses with no guide</div>
        </div>
        ${canEdit ? `<div class="pdg-rules"><strong>House rules for the wording</strong>
            <ul>
                <li>Second person, short sentences, no jargon that is not explained on the spot.</li>
                <li>No medicine names and no doses — that is the prescription's job, and it changes.</li>
                <li>Never “you have”, and no outlook: the guide explains a condition, it does not judge this patient's case.</li>
                <li>Nothing that could contradict the doctor. The app shows the doctor's own instructions for the visit
                    <em>above</em> the guide, and the guide ends by deferring to them.</li>
                <li>Do's, don'ts and warning signs: <strong>one item per line</strong>.</li>
            </ul></div>` : ""}
        <div class="pdg-bar">
            <input type="search" id="pdgQ" value="${esc(q)}" placeholder="Find a condition, code or keyword" aria-label="Find a condition" style="min-width:280px">
            ${canEdit ? `<button type="button" class="pdg-btn primary" id="pdgAdd">Add a guide</button>` : ""}
        </div>
        <div id="pdgFormBox"></div>
        <div class="pdg-card">
            <table class="pdg-table"><thead><tr><th>Condition</th><th>What it is</th><th>Advice</th><th>Source</th><th></th></tr></thead>
            <tbody>${data.items.length ? data.items.map(rowHtml).join("")
                : `<tr><td colspan="5" class="pdg-sub" style="padding:20px;text-align:center">Nothing matches.</td></tr>`}</tbody></table>
        </div>
        ${data.missing.length ? `<h2 style="font-size:16px;margin:0 0 6px">No guide yet</h2>
            <p class="pdg-sub" style="margin:0 0 8px">Diagnoses patients have actually been given that no guide matches. A patient
                with one of these sees their diagnosis with nothing under it. Commonest first.</p>
            <div class="pdg-card"><table class="pdg-table"><tbody>
                ${data.missing.map((m) => `<tr>
                    <td>${m.code ? `<span class="pdg-code">${esc(m.code)}</span> ` : ""}${esc(m.text)}
                        <span class="pdg-sub">· recorded ${m.seen} time${m.seen === 1 ? "" : "s"}</span></td>
                    <td style="text-align:right">${canEdit ? `<button type="button" class="pdg-btn" data-new="${esc(m.text)}" data-code="${esc(m.code || "")}">Write one</button>` : ""}</td>
                </tr>`).join("")}
            </tbody></table></div>` : ""}`;

    const search = $("pdgQ");
    let t = null;
    search.oninput = (e) => {
        clearTimeout(t);
        const v = e.target.value;
        t = setTimeout(() => load(v.trim()), 350);
    };

    if (canEdit) {
        $("pdgAdd").onclick = () => form(null);
        body.querySelectorAll("[data-edit]").forEach((b) => {
            b.onclick = () => form(data.items.find((x) => String(x.id) === b.dataset.edit));
        });
        // A gap row gives the code; the diagnosis text is only a hint, since the
        // title is what patients read and is rarely the raw diagnosis wording.
        body.querySelectorAll("[data-new]").forEach((b) => {
            b.onclick = () => form({ code: b.dataset.code, keywords: b.dataset.new });
        });
    }

    if (editing) {
        const again = data.items.find((x) => x.title === editing);
        if (again) form(again);
    }
}

function rowHtml(r) {
    return `<tr>
        <td><strong>${esc(r.title)}</strong>${r.is_active ? "" : ` <span class="pdg-sub">(off)</span>`}
            <div class="pdg-sub">${r.code ? `<span class="pdg-code">${esc(r.code)}</span> ` : ""}${esc(r.keywords || "")}</div></td>
        <td>${esc(trim(r.about, 160))}</td>
        <td><span class="pdg-pill do">${r.dos_count} do${r.dos_count === 1 ? "" : "s"}</span>
            <span class="pdg-pill dont">${r.donts_count} don't${r.donts_count === 1 ? "" : "s"}</span>
            ${r.when_to_seek_help ? "" : `<div class="pdg-sub">no warning signs set</div>`}</td>
        <td class="pdg-sub">${esc(r.source || "")}</td>
        <td style="text-align:right">${data.can_edit ? `<button type="button" class="pdg-btn" data-edit="${r.id}">Edit</button>` : ""}</td>
    </tr>`;
}

function trim(v, n) {
    const s = String(v ?? "");
    return s.length > n ? `${s.slice(0, n)}…` : s;
}

function form(r) {
    editing = r && r.title ? r.title : null;
    const box = $("pdgFormBox");
    const v = (k) => esc(r && r[k] != null ? r[k] : "");
    const area = (k, label, hint = "", tall = false) => `<div class="pdg-field"><label for="pdgF_${k}">${label}</label>
        <textarea id="pdgF_${k}" data-f="${k}" class="${tall ? "tall" : ""}" placeholder="${esc(hint)}">${v(k)}</textarea></div>`;

    box.innerHTML = `<div class="pdg-form">
        <h3>${r && r.id ? `Edit “${esc(r.title)}”` : "Add a guide"}</h3>
        <div class="pdg-field" style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="flex:1 1 240px"><label for="pdgF_title">Condition, as the patient should read it</label>
                <input id="pdgF_title" data-f="title" value="${v("title")}" placeholder="High blood pressure" style="width:100%"></div>
            <div style="flex:0 0 150px"><label for="pdgF_code">ICD-10 code</label>
                <input id="pdgF_code" data-f="code" value="${v("code")}" placeholder="I10 or E11.9" style="width:100%"></div>
        </div>
        <div class="pdg-field"><label for="pdgF_keywords">Keywords, comma separated</label>
            <input id="pdgF_keywords" data-f="keywords" value="${v("keywords")}" placeholder="hypertension, htn, high bp" style="width:100%">
            <div class="pdg-sub" style="margin-top:3px">Three of the four places a diagnosis is written are free text, so these are how
                the guide is found there. A three-character code (I10, E11) covers the whole category; a full code (E11.9) is matched first
                and overrides it. The condition name above is always a keyword, so it needs no repeating here.</div></div>
        ${area("about", "What it is", "Blood pressure is the force of blood pushing against the walls of your arteries…", true)}
        ${area("why_it_happens", "Why it happens", "Usually it builds up over years, from a mix of family history, weight…")}
        ${area("common_symptoms", "Common signs", "Most people feel nothing at all, which is why it is usually found at a check-up…")}
        ${area("dos", "Do's — one per line", "Take the medicines you were prescribed every day, at the same time.\nHave your blood pressure measured regularly.", true)}
        ${area("donts", "Don'ts — one per line", "Do not stop your medicine because your reading has become normal.\nDo not add salt at the table.", true)}
        ${area("when_to_seek_help", "Get help right away if — one per line", "Chest pain or tightness.\nSudden weakness or numbness on one side.", true)}
        <div class="pdg-field" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
            <div style="flex:1 1 260px"><label for="pdgF_source">Where the wording came from</label>
                <input id="pdgF_source" data-f="source" value="${v("source")}" placeholder="Hospital clinical guidelines" style="width:100%"></div>
            <label style="font-weight:600;font-size:12.5px"><input type="checkbox" id="pdgF_active" ${!r || r.is_active === undefined || r.is_active ? "checked" : ""}> Shown to patients</label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="pdg-btn primary" id="pdgSave">Save</button>
            <button type="button" class="pdg-btn" id="pdgCancel">Cancel</button>
            <span class="pdg-sub" id="pdgErr"></span>
        </div>
    </div>`;

    box.scrollIntoView({ behavior: "smooth", block: "nearest" });

    $("pdgCancel").onclick = () => {
        editing = null;
        box.innerHTML = "";
    };

    $("pdgSave").onclick = async (e) => {
        const payload = { is_active: $("pdgF_active").checked ? 1 : 0 };
        box.querySelectorAll("[data-f]").forEach((f) => (payload[f.dataset.f] = f.value.trim()));
        e.target.disabled = true;
        const res = await api("/portal-diagnosis-guides", { method: "POST", body: JSON.stringify(payload) }).catch(() => null);
        e.target.disabled = false;

        if (!res?.success) {
            $("pdgErr").textContent = res?.message || "Could not save.";
            return;
        }

        editing = null;
        box.innerHTML = "";
        showToast(res.message, "success", 6000);
        await load($("pdgQ")?.value.trim() || "");
    };
}
