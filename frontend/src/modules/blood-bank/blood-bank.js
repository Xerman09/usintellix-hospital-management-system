import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = { abo_group: "", rh_factor: "", eligibility_status: "", q: "" };
let data = null;

export function BloodBankView() {
    return `<div class="bb-root" id="bloodBankRoot"><div class="bb-empty">Loading Blood Bank Management…</div></div>`;
}

export async function initBloodBank() {
    ensureCss();
    await load();
}

async function load(quiet = false) {
    const root = document.getElementById("bloodBankRoot");
    if (!root) return;

    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    const [donorsRes, statsRes] = await Promise.all([
        api(`/blood-bank/donors?${q}`).catch(() => null),
        api(`/blood-bank/donors/stats`).catch(() => null)
    ]);

    if (!donorsRes?.success) {
        if (!quiet) root.innerHTML = `<div class="bb-empty">${esc(donorsRes?.message || "Failed to load blood donors.")}</div>`;
        return;
    }

    data = {
        donors: donorsRes.data || [],
        stats: statsRes?.data || {}
    };
    render(root);
}

function render(root) {
    const s = data.stats || {};
    const donors = data.donors || [];

    root.innerHTML = `
        <div class="bb-head">
            <div>
                <h1>Blood Bank Management & Donor Registry</h1>
                <div class="bb-sub">National blood safety standards, donor eligibility tracking, and mandatory infectious disease (TTI) screening.</div>
            </div>
            <div>
                <button type="button" class="bb-btn blue" id="bbRegisterDonorBtn">+ Register Blood Donor</button>
            </div>
        </div>

        <div class="bb-counts">
            <div><b>${s.total_registered || 0}</b>Total Donors</div>
            <div class="good"><b>${s.eligible_donors || 0}</b>Eligible Donors</div>
            <div class="${s.temporary_deferred ? "warn" : ""}"><b>${s.temporary_deferred || 0}</b>Temporarily Deferred</div>
            <div class="${s.permanently_deferred ? "bad" : ""}"><b>${s.permanently_deferred || 0}</b>Permanently Deferred</div>
            <div><b>${s.pending_screening || 0}</b>Pending Screening</div>
        </div>

        <div class="bb-tools">
            <select id="bbFilterAbo">
                <option value="">All ABO Groups</option>
                <option value="A" ${state.abo_group === "A" ? "selected" : ""}>Group A</option>
                <option value="B" ${state.abo_group === "B" ? "selected" : ""}>Group B</option>
                <option value="AB" ${state.abo_group === "AB" ? "selected" : ""}>Group AB</option>
                <option value="O" ${state.abo_group === "O" ? "selected" : ""}>Group O</option>
            </select>

            <select id="bbFilterRh">
                <option value="">All Rh Types</option>
                <option value="positive" ${state.rh_factor === "positive" ? "selected" : ""}>Rh Positive (+)</option>
                <option value="negative" ${state.rh_factor === "negative" ? "selected" : ""}>Rh Negative (-)</option>
            </select>

            <select id="bbFilterStatus">
                <option value="">All Eligibility Statuses</option>
                <option value="eligible" ${state.eligibility_status === "eligible" ? "selected" : ""}>Eligible to Donate</option>
                <option value="temporary_deferred" ${state.eligibility_status === "temporary_deferred" ? "selected" : ""}>Temporarily Deferred</option>
                <option value="permanently_deferred" ${state.eligibility_status === "permanently_deferred" ? "selected" : ""}>Permanently Deferred</option>
                <option value="pending_screening" ${state.eligibility_status === "pending_screening" ? "selected" : ""}>Pending Screening</option>
            </select>

            <input type="search" id="bbSearch" value="${esc(state.q)}" placeholder="Search donor number, name, phone, or ID...">
        </div>

        ${donors.length ? `<div class="bb-list">${donors.map(donorCard).join("")}</div>`
            : `<div class="bb-empty">No blood donors match the active filters.</div>`}
    `;

    root.querySelector("#bbRegisterDonorBtn").onclick = () => openDonorModal();
    root.querySelector("#bbFilterAbo").onchange = (e) => { state.abo_group = e.target.value; load(); };
    root.querySelector("#bbFilterRh").onchange = (e) => { state.rh_factor = e.target.value; load(); };
    root.querySelector("#bbFilterStatus").onchange = (e) => { state.eligibility_status = e.target.value; load(); };

    let t = null;
    root.querySelector("#bbSearch").oninput = (e) => {
        clearTimeout(t);
        t = setTimeout(() => {
            state.q = e.target.value.trim();
            load();
        }, 300);
    };

    root.onclick = (e) => {
        const editBtn = e.target.closest("[data-edit-donor]");
        if (editBtn) {
            const id = Number(editBtn.dataset.editDonor);
            openDonorModal(id);
        }
    };
}

function donorCard(d) {
    const isEligible = d.eligibility_status === "eligible";
    const isPerm = d.eligibility_status === "permanently_deferred";
    const isTemp = d.eligibility_status === "temporary_deferred";

    const badgeClass = isEligible ? "bb-badge good" : isPerm ? "bb-badge bad" : isTemp ? "bb-badge warn" : "bb-badge";
    const ttiPills = [
        `HIV: <b class="${d.hiv_screen === "reactive" ? "bad" : ""}">${d.hiv_screen}</b>`,
        `HBsAg: <b class="${d.hbv_screen === "reactive" ? "bad" : ""}">${d.hbv_screen}</b>`,
        `HCV: <b class="${d.hcv_screen === "reactive" ? "bad" : ""}">${d.hcv_screen}</b>`,
        `Syphilis: <b class="${d.syphilis_screen === "reactive" ? "bad" : ""}">${d.syphilis_screen}</b>`,
        `Malaria: <b class="${d.malaria_screen === "reactive" ? "bad" : ""}">${d.malaria_screen}</b>`
    ].join(" · ");

    return `
        <div class="bb-card ${isPerm ? "bad" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <span class="${badgeClass}">${esc(d.eligibility_label)}</span>
                    <b style="font-family:monospace;font-size:14px;color:#2563eb;margin-left:6px;">${esc(d.donor_number)}</b>
                    <h3 style="margin:4px 0 2px;font-size:16px;">${esc(d.full_name)}</h3>
                    <div class="bb-muted">${d.age} y · ${esc(d.gender)} · 📞 ${esc(d.phone)}${d.email ? ` · ✉️ ${esc(d.email)}` : ""}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:20px;font-weight:800;color:#dc2626;">🩸 ${esc(d.blood_type_formatted)}</div>
                    <div class="bb-muted" style="font-size:12px;">Total Donations: <b>${d.total_donations}</b></div>
                </div>
            </div>

            <div style="background:var(--bg-muted, #f8fafc);padding:8px 10px;border-radius:6px;font-size:12.5px;margin:8px 0;">
                <div><b>Vitals:</b> Wt: ${d.weight_kg} kg · Hb: ${d.hemoglobin_g_dl || "—"} g/dL · BP: ${d.blood_pressure_systolic || "—"}/${d.blood_pressure_diastolic || "—"} mmHg · Pulse: ${d.pulse_rate || "—"} bpm</div>
                <div style="margin-top:3px;"><b>Infectious Screening (TTI):</b> ${ttiPills}</div>
                ${d.deferral_reason ? `<div style="margin-top:4px;color:${isPerm ? "#b91c1c" : "#b45309"};font-weight:600;">⚠️ ${esc(d.deferral_reason)}${d.deferred_until ? ` (Until: ${esc(d.deferred_until)})` : ""}</div>` : ""}
            </div>

            <div style="display:flex;justify-content:flex-end;">
                <button type="button" class="bb-btn sm" data-edit-donor="${d.id}">Edit / Screening Update…</button>
            </div>
        </div>
    `;
}

async function openDonorModal(id = 0) {
    let d = {};
    if (id > 0) {
        const res = await api(`/blood-bank/donors/detail?id=${id}`).catch(() => null);
        if (!res?.success) return showToast("Could not load donor record.", "error");
        d = res.data;
    }

    const html = `
        <div class="bb-modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <div>
                    <label>First Name *</label>
                    <input type="text" id="bbFn" value="${esc(d.first_name || "")}" required>
                </div>
                <div>
                    <label>Middle Name</label>
                    <input type="text" id="bbMn" value="${esc(d.middle_name || "")}">
                </div>
                <div>
                    <label>Last Name *</label>
                    <input type="text" id="bbLn" value="${esc(d.last_name || "")}" required>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <div>
                    <label>Birthdate *</label>
                    <input type="date" id="bbBd" value="${esc(d.birthdate || "")}" required>
                </div>
                <div>
                    <label>Gender *</label>
                    <select id="bbGen">
                        <option value="male" ${d.gender === "male" ? "selected" : ""}>Male</option>
                        <option value="female" ${d.gender === "female" ? "selected" : ""}>Female</option>
                        <option value="other" ${d.gender === "other" ? "selected" : ""}>Other</option>
                    </select>
                </div>
                <div>
                    <label>Phone *</label>
                    <input type="text" id="bbPhone" value="${esc(d.phone || "")}" required>
                </div>
            </div>

            <fieldset>
                <legend>Blood Grouping & Physical Assessment</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                    <div>
                        <label>ABO Group *</label>
                        <select id="bbAbo">
                            <option value="unknown" ${d.abo_group === "unknown" ? "selected" : ""}>Pending Typing</option>
                            <option value="O" ${d.abo_group === "O" ? "selected" : ""}>Group O (Universal Donor)</option>
                            <option value="A" ${d.abo_group === "A" ? "selected" : ""}>Group A</option>
                            <option value="B" ${d.abo_group === "B" ? "selected" : ""}>Group B</option>
                            <option value="AB" ${d.abo_group === "AB" ? "selected" : ""}>Group AB</option>
                        </select>
                    </div>
                    <div>
                        <label>Rh Factor (D) *</label>
                        <select id="bbRh">
                            <option value="unknown" ${d.rh_factor === "unknown" ? "selected" : ""}>Unknown</option>
                            <option value="positive" ${d.rh_factor === "positive" ? "selected" : ""}>Positive (+)</option>
                            <option value="negative" ${d.rh_factor === "negative" ? "selected" : ""}>Negative (-)</option>
                        </select>
                    </div>
                    <div>
                        <label>Weight (kg) * <small>(>= 50kg)</small></label>
                        <input type="number" step="0.1" id="bbWt" value="${esc(d.weight_kg || "")}" required>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>Hemoglobin (g/dL)</label>
                        <input type="number" step="0.1" id="bbHb" value="${esc(d.hemoglobin_g_dl || "")}" placeholder=">=12.5 F / >=13.0 M">
                    </div>
                    <div>
                        <label>Blood Pressure (mmHg)</label>
                        <div style="display:flex;gap:4px;">
                            <input type="number" id="bbBps" placeholder="Sys" value="${esc(d.blood_pressure_systolic || "")}">
                            <input type="number" id="bbBpd" placeholder="Dia" value="${esc(d.blood_pressure_diastolic || "")}">
                        </div>
                    </div>
                    <div>
                        <label>Pulse / Temp</label>
                        <div style="display:flex;gap:4px;">
                            <input type="number" id="bbPulse" placeholder="Bpm" value="${esc(d.pulse_rate || "")}">
                            <input type="number" step="0.1" id="bbTemp" placeholder="°C" value="${esc(d.temperature_c || "")}">
                        </div>
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Transfusion-Transmissible Infection (TTI) Serology Screen</legend>
                <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px;">
                    <div>
                        <label>HIV 1 & 2</label>
                        <select id="bbHiv">
                            <option value="pending" ${d.hiv_screen === "pending" ? "selected" : ""}>Pending</option>
                            <option value="non_reactive" ${d.hiv_screen === "non_reactive" ? "selected" : ""}>Non-reactive</option>
                            <option value="reactive" ${d.hiv_screen === "reactive" ? "selected" : ""}>REACTIVE</option>
                        </select>
                    </div>
                    <div>
                        <label>Hepatitis B (HBsAg)</label>
                        <select id="bbHbv">
                            <option value="pending" ${d.hbv_screen === "pending" ? "selected" : ""}>Pending</option>
                            <option value="non_reactive" ${d.hbv_screen === "non_reactive" ? "selected" : ""}>Non-reactive</option>
                            <option value="reactive" ${d.hbv_screen === "reactive" ? "selected" : ""}>REACTIVE</option>
                        </select>
                    </div>
                    <div>
                        <label>Hepatitis C (HCV)</label>
                        <select id="bbHcv">
                            <option value="pending" ${d.hcv_screen === "pending" ? "selected" : ""}>Pending</option>
                            <option value="non_reactive" ${d.hcv_screen === "non_reactive" ? "selected" : ""}>Non-reactive</option>
                            <option value="reactive" ${d.hcv_screen === "reactive" ? "selected" : ""}>REACTIVE</option>
                        </select>
                    </div>
                    <div>
                        <label>Syphilis (VDRL)</label>
                        <select id="bbSyph">
                            <option value="pending" ${d.syphilis_screen === "pending" ? "selected" : ""}>Pending</option>
                            <option value="non_reactive" ${d.syphilis_screen === "non_reactive" ? "selected" : ""}>Non-reactive</option>
                            <option value="reactive" ${d.syphilis_screen === "reactive" ? "selected" : ""}>REACTIVE</option>
                        </select>
                    </div>
                    <div>
                        <label>Malaria</label>
                        <select id="bbMal">
                            <option value="pending" ${d.malaria_screen === "pending" ? "selected" : ""}>Pending</option>
                            <option value="non_reactive" ${d.malaria_screen === "non_reactive" ? "selected" : ""}>Non-reactive</option>
                            <option value="reactive" ${d.malaria_screen === "reactive" ? "selected" : ""}>REACTIVE</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Screening Questionnaire & Risk Deferrals</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12.5px;">
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="bbTat" ${d.has_recent_tattoo_piercing ? "checked" : ""}>
                        Tattoo / piercing in last 12 months
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="bbTrav" ${d.has_recent_travel_malaria ? "checked" : ""}>
                        Recent travel to malaria endemic zone
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="bbExp" ${d.has_high_risk_exposure ? "checked" : ""}>
                        High-risk viral exposure history
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="bbIll" ${d.has_recent_illness ? "checked" : ""}>
                        Active fever / acute illness within 48h
                    </label>
                </div>
                <div style="margin-top:6px;">
                    <label>Clinical Notes</label>
                    <input type="text" id="bbQnotes" value="${esc(d.questionnaire_notes || "")}" placeholder="Questionnaire details or physician remarks">
                </div>
            </fieldset>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button type="button" class="bb-btn" id="bbCancelBtn">Cancel</button>
                <button type="button" class="bb-btn blue" id="bbSaveBtn">Save & Evaluate Eligibility</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>${id > 0 ? "Edit Blood Donor" : "Register New Blood Donor"}</h3>
                <button type="button" class="bb-close" id="bbCloseModal">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#bbCloseModal").onclick = close;
    ov.querySelector("#bbCancelBtn").onclick = close;

    ov.querySelector("#bbSaveBtn").onclick = async () => {
        const payload = {
            id: id,
            first_name: ov.querySelector("#bbFn").value.trim(),
            middle_name: ov.querySelector("#bbMn").value.trim(),
            last_name: ov.querySelector("#bbLn").value.trim(),
            birthdate: ov.querySelector("#bbBd").value,
            gender: ov.querySelector("#bbGen").value,
            phone: ov.querySelector("#bbPhone").value.trim(),
            abo_group: ov.querySelector("#bbAbo").value,
            rh_factor: ov.querySelector("#bbRh").value,
            weight_kg: Number(ov.querySelector("#bbWt").value),
            hemoglobin_g_dl: ov.querySelector("#bbHb").value ? Number(ov.querySelector("#bbHb").value) : null,
            blood_pressure_systolic: ov.querySelector("#bbBps").value ? Number(ov.querySelector("#bbBps").value) : null,
            blood_pressure_diastolic: ov.querySelector("#bbBpd").value ? Number(ov.querySelector("#bbBpd").value) : null,
            pulse_rate: ov.querySelector("#bbPulse").value ? Number(ov.querySelector("#bbPulse").value) : null,
            temperature_c: ov.querySelector("#bbTemp").value ? Number(ov.querySelector("#bbTemp").value) : null,
            hiv_screen: ov.querySelector("#bbHiv").value,
            hbv_screen: ov.querySelector("#bbHbv").value,
            hcv_screen: ov.querySelector("#bbHcv").value,
            syphilis_screen: ov.querySelector("#bbSyph").value,
            malaria_screen: ov.querySelector("#bbMal").value,
            has_recent_tattoo_piercing: ov.querySelector("#bbTat").checked ? 1 : 0,
            has_recent_travel_malaria: ov.querySelector("#bbTrav").checked ? 1 : 0,
            has_high_risk_exposure: ov.querySelector("#bbExp").checked ? 1 : 0,
            has_recent_illness: ov.querySelector("#bbIll").checked ? 1 : 0,
            questionnaire_notes: ov.querySelector("#bbQnotes").value.trim()
        };

        const res = await api("/blood-bank/donors/save", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) {
            return showToast(res?.message || "Failed to save blood donor.", "error");
        }

        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

function ensureCss() {
    if (document.getElementById("bbStyles")) return;
    const style = document.createElement("style");
    style.id = "bbStyles";
    style.textContent = `
        .bb-root { padding: 20px 24px 40px; max-width: 1400px; margin: 0 auto; color: var(--text-primary); font-family: inherit; }
        .bb-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
        .bb-head h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .bb-sub { color: var(--text-muted); font-size: 13px; margin-top: 3px; }
        .bb-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .bb-btn.blue { background: #b91c1c; border-color: #b91c1c; color: #fff; }
        .bb-btn.sm { padding: 4px 10px; font-size: 12px; }
        .bb-counts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .bb-counts div { border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 12px; background: var(--bg-surface); font-size: 12px; }
        .bb-counts b { font-size: 17px; margin-right: 5px; font-variant-numeric: tabular-nums; }
        .bb-counts .good b { color: #059669; }
        .bb-counts .warn b { color: #d97706; }
        .bb-counts .bad b { color: #dc2626; }
        .bb-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
        .bb-tools select, .bb-tools input { border: 1px solid var(--border-color); border-radius: 6px; padding: 7px 9px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
        .bb-tools input[type=search] { min-width: 280px; }
        .bb-list { display: grid; gap: 10px; }
        .bb-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 12px 14px; }
        .bb-card.bad { border-left: 4px solid #dc2626; }
        .bb-muted { color: var(--text-muted); font-size: 13px; }
        .bb-empty { padding: 24px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
        .bb-badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; }
        .bb-badge.good { background: #dcfce7; color: #15803d; }
        .bb-badge.warn { background: #fef3c7; color: #b45309; }
        .bb-badge.bad { background: #fee2e2; color: #b91c1c; }
        .bb-modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .bb-modal { background: var(--bg-surface, #fff); border-radius: 12px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .bb-modal-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px; }
        .bb-modal-head h3 { margin: 0; font-size: 17px; }
        .bb-close { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-muted); }
        .bb-modal-body label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 2px; }
        .bb-modal-body input[type=text], .bb-modal-body input[type=date], .bb-modal-body input[type=number], .bb-modal-body select { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
        .bb-modal-body fieldset { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-top: 8px; }
        .bb-modal-body legend { font-weight: 700; font-size: 12.5px; padding: 0 4px; }
    `;
    document.head.appendChild(style);
}
