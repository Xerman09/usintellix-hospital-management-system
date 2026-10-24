import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = {
    view: "inventory", // "inventory" | "crossmatches" | "transfusions" | "reactions" | "cold_chain" | "donors"
    component_type: "",
    abo_group: "",
    rh_factor: "",
    status: "",
    eligibility_status: "",
    reservation_status: "",
    transfusion_status: "",
    reaction_classification: "",
    q: ""
};

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

    if (state.view === "transfusions") {
        const q = new URLSearchParams(Object.entries({
            status: state.transfusion_status,
            q: state.q
        }).filter(([, v]) => v));

        const [txRes, statsRes, reservedUnitsRes] = await Promise.all([
            api(`/blood-bank/transfusions?${q}`).catch(() => null),
            api(`/blood-bank/transfusions/stats`).catch(() => null),
            api(`/blood-bank/inventory?status=crossmatched_reserved`).catch(() => null)
        ]);

        if (!txRes?.success) {
            if (!quiet) root.innerHTML = `<div class="bb-empty">${esc(txRes?.message || "Failed to load blood transfusions.")}</div>`;
            return;
        }

        data = {
            transfusions: txRes.data?.items || txRes.data || [],
            stats: statsRes?.data || {},
            reservedUnits: reservedUnitsRes?.data || []
        };
        return render(root);
    }

    if (state.view === "reactions") {
        const q = new URLSearchParams(Object.entries({
            reaction_classification: state.reaction_classification,
            q: state.q
        }).filter(([, v]) => v));

        const [rxRes, statsRes] = await Promise.all([
            api(`/blood-bank/transfusion-reactions?${q}`).catch(() => null),
            api(`/blood-bank/transfusions/stats`).catch(() => null)
        ]);

        if (!rxRes?.success) {
            if (!quiet) root.innerHTML = `<div class="bb-empty">${esc(rxRes?.message || "Failed to load transfusion reactions.")}</div>`;
            return;
        }

        data = {
            reactions: rxRes.data?.items || rxRes.data || [],
            stats: statsRes?.data || {}
        };
        return render(root);
    }

    if (state.view === "crossmatches") {
        const q = new URLSearchParams(Object.entries({
            reservation_status: state.reservation_status,
            q: state.q
        }).filter(([, v]) => v));

        const [xmRes, statsRes, availUnitsRes] = await Promise.all([
            api(`/blood-bank/crossmatches?${q}`).catch(() => null),
            api(`/blood-bank/crossmatches/stats`).catch(() => null),
            api(`/blood-bank/inventory?status=available`).catch(() => null)
        ]);

        if (!xmRes?.success) {
            if (!quiet) root.innerHTML = `<div class="bb-empty">${esc(xmRes?.message || "Failed to load crossmatches.")}</div>`;
            return;
        }

        data = {
            crossmatches: xmRes.data || [],
            stats: statsRes?.data || {},
            availableUnits: availUnitsRes?.data || []
        };
        return render(root);
    }

    if (state.view === "inventory" || state.view === "cold_chain") {
        const q = new URLSearchParams(Object.entries({
            component_type: state.component_type,
            abo_group: state.abo_group,
            rh_factor: state.rh_factor,
            status: state.status,
            q: state.q
        }).filter(([, v]) => v));

        const [unitsRes, statsRes, locsRes] = await Promise.all([
            api(`/blood-bank/inventory?${q}`).catch(() => null),
            api(`/blood-bank/inventory/stats`).catch(() => null),
            api(`/blood-bank/inventory/storage-locations`).catch(() => null)
        ]);

        if (!unitsRes?.success) {
            if (!quiet) root.innerHTML = `<div class="bb-empty">${esc(unitsRes?.message || "Failed to load blood inventory.")}</div>`;
            return;
        }

        data = {
            units: unitsRes.data || [],
            stats: statsRes?.data || {},
            locations: locsRes?.data || []
        };
        return render(root);
    }

    // View: Donors
    const q = new URLSearchParams(Object.entries({
        abo_group: state.abo_group,
        rh_factor: state.rh_factor,
        eligibility_status: state.eligibility_status,
        q: state.q
    }).filter(([, v]) => v));

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
    const isInv = state.view === "inventory";
    const isXm = state.view === "crossmatches";
    const isTx = state.view === "transfusions";
    const isRx = state.view === "reactions";
    const isCold = state.view === "cold_chain";
    const isDonors = state.view === "donors";

    const s = data.stats || {};
    const tab = (v, l) => `<button type="button" class="bb-tab-btn ${state.view === v ? "active" : ""}" data-bb-view="${v}">${l}</button>`;

    root.innerHTML = `
        <div class="bb-head">
            <div>
                <h1>Blood Bank Management & Transfusion Services</h1>
                <div class="bb-sub">Unit inventory, Major/Minor crossmatch testing, dual-nurse bedside transfusion verification, vital monitoring, and reaction investigation.</div>
            </div>
            <div style="display:flex;gap:8px;">
                ${isInv ? `<button type="button" class="bb-btn blue" id="bbAddUnitBtn">+ Receive Blood Unit</button>` : ""}
                ${isXm ? `<button type="button" class="bb-btn blue" id="bbNewCrossmatchBtn">🔬 Crossmatch & 48h Hold</button>` : ""}
                ${isTx ? `<button type="button" class="bb-btn blue" id="bbVerifyTransfusionBtn">🩺 Bedside Verification (Dual-Nurse)</button>` : ""}
                ${isRx ? `<button type="button" class="bb-btn" id="bbReportEmergencyRxBtn" style="background:#dc2626;border-color:#dc2626;color:#fff;">🚨 STAT Reaction Report</button>` : ""}
                ${isCold ? `<button type="button" class="bb-btn blue" id="bbLogTempBtn">🌡️ Log Temperature Check</button>` : ""}
                ${isDonors ? `<button type="button" class="bb-btn blue" id="bbRegisterDonorBtn">+ Register Blood Donor</button>` : ""}
            </div>
        </div>

        <div class="bb-nav-tabs">
            ${tab("inventory", "Blood Inventory Units")}
            ${tab("crossmatches", "Crossmatch & 48h Holds")}
            ${tab("transfusions", "Bedside Transfusions & Vitals")}
            ${tab("reactions", "Adverse Reactions & Workup")}
            ${tab("cold_chain", "Cold-Chain & Storage Units")}
            ${tab("donors", "Blood Donor Registry")}
        </div>

        ${isInv ? renderInventoryKpi(s) : isXm ? renderCrossmatchKpi(s) : isTx ? renderTransfusionsKpi(s) : isRx ? renderReactionsKpi(s) : isCold ? renderColdChainKpi(data.locations) : renderDonorsKpi(s)}

        <div class="bb-tools">
            ${isInv ? `
                <select id="bbFilterComp">
                    <option value="">All Components</option>
                    <option value="prbc" ${state.component_type === "prbc" ? "selected" : ""}>PRBC (1–6°C)</option>
                    <option value="ffp" ${state.component_type === "ffp" ? "selected" : ""}>FFP (≤-18°C)</option>
                    <option value="platelets" ${state.component_type === "platelets" ? "selected" : ""}>Platelets (20–24°C Agitated)</option>
                    <option value="cryoprecipitate" ${state.component_type === "cryoprecipitate" ? "selected" : ""}>Cryoprecipitate</option>
                    <option value="whole_blood" ${state.component_type === "whole_blood" ? "selected" : ""}>Whole Blood</option>
                </select>
                <select id="bbFilterUnitStatus">
                    <option value="">All Statuses</option>
                    <option value="available" ${state.status === "available" ? "selected" : ""}>Available</option>
                    <option value="crossmatched_reserved" ${state.status === "crossmatched_reserved" ? "selected" : ""}>Reserved</option>
                    <option value="quarantined" ${state.status === "quarantined" ? "selected" : ""}>Quarantined</option>
                    <option value="expired" ${state.status === "expired" ? "selected" : ""}>Expired</option>
                </select>
            ` : ""}

            ${isXm ? `
                <select id="bbFilterXmStatus">
                    <option value="">All Reservation Statuses</option>
                    <option value="active_hold" ${state.reservation_status === "active_hold" ? "selected" : ""}>Active 48h Holds</option>
                    <option value="issued" ${state.reservation_status === "issued" ? "selected" : ""}>Issued to Ward/OR</option>
                    <option value="transfused" ${state.reservation_status === "transfused" ? "selected" : ""}>Transfused</option>
                    <option value="hold_expired" ${state.reservation_status === "hold_expired" ? "selected" : ""}>Hold Expired</option>
                    <option value="cancelled_released" ${state.reservation_status === "cancelled_released" ? "selected" : ""}>Cancelled / Released</option>
                </select>
            ` : ""}

            ${isTx ? `
                <select id="bbFilterTxStatus">
                    <option value="">All Transfusion Statuses</option>
                    <option value="verified_ready" ${state.transfusion_status === "verified_ready" ? "selected" : ""}>Verified & Ready</option>
                    <option value="infusing" ${state.transfusion_status === "infusing" ? "selected" : ""}>Infusing Now</option>
                    <option value="completed" ${state.transfusion_status === "completed" ? "selected" : ""}>Completed</option>
                    <option value="stopped_reaction" ${state.transfusion_status === "stopped_reaction" ? "selected" : ""}>Stopped (Adverse Reaction)</option>
                </select>
            ` : ""}

            ${isRx ? `
                <select id="bbFilterRxClass">
                    <option value="">All Reaction Types</option>
                    <option value="acute_hemolytic" ${state.reaction_classification === "acute_hemolytic" ? "selected" : ""}>Acute Hemolytic (AHTR)</option>
                    <option value="trali" ${state.reaction_classification === "trali" ? "selected" : ""}>TRALI (Acute Lung Injury)</option>
                    <option value="taco" ${state.reaction_classification === "taco" ? "selected" : ""}>TACO (Volume Overload)</option>
                    <option value="febrile_non_hemolytic" ${state.reaction_classification === "febrile_non_hemolytic" ? "selected" : ""}>Febrile Non-Hemolytic (FNHTR)</option>
                    <option value="anaphylactic_severe" ${state.reaction_classification === "anaphylactic_severe" ? "selected" : ""}>Anaphylaxis (Severe)</option>
                    <option value="mild_allergic_urticarial" ${state.reaction_classification === "mild_allergic_urticarial" ? "selected" : ""}>Allergic / Urticarial</option>
                    <option value="sepsis_bacterial" ${state.reaction_classification === "sepsis_bacterial" ? "selected" : ""}>Transfusion Sepsis (TTBI)</option>
                </select>
            ` : ""}

            ${!isCold && !isXm && !isTx && !isRx ? `
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
            ` : ""}

            ${isDonors ? `
                <select id="bbFilterDonorStatus">
                    <option value="">All Eligibility Statuses</option>
                    <option value="eligible" ${state.eligibility_status === "eligible" ? "selected" : ""}>Eligible to Donate</option>
                    <option value="temporary_deferred" ${state.eligibility_status === "temporary_deferred" ? "selected" : ""}>Temporarily Deferred</option>
                    <option value="permanently_deferred" ${state.eligibility_status === "permanently_deferred" ? "selected" : ""}>Permanently Deferred</option>
                    <option value="pending_screening" ${state.eligibility_status === "pending_screening" ? "selected" : ""}>Pending Screening</option>
                </select>
            ` : ""}

            <input type="search" id="bbSearch" value="${esc(state.q)}" placeholder="${isInv ? "Search unit DIN, shelf, donor, or patient..." : isXm ? "Search crossmatch XM#, unit, or patient..." : isTx ? "Search transfusion BT#, patient, nurse, or unit..." : isRx ? "Search reaction TR#, symptoms, or patient..." : isCold ? "Search storage unit..." : "Search donor number, name, or phone..."}">
        </div>

        ${isInv ? renderInventoryList(data.units) : isXm ? renderCrossmatchesList(data.crossmatches) : isTx ? renderTransfusionsList(data.transfusions) : isRx ? renderReactionsList(data.reactions) : isCold ? renderColdChainList(data.locations) : renderDonorsList(data.donors)}
    `;

    // Tab buttons
    root.querySelectorAll("[data-bb-view]").forEach(btn => {
        btn.onclick = () => {
            state.view = btn.dataset.bbView;
            load();
        };
    });

    if (root.querySelector("#bbAddUnitBtn")) root.querySelector("#bbAddUnitBtn").onclick = () => openAddUnitModal(data.locations);
    if (root.querySelector("#bbNewCrossmatchBtn")) root.querySelector("#bbNewCrossmatchBtn").onclick = () => openNewCrossmatchModal(data.availableUnits);
    if (root.querySelector("#bbVerifyTransfusionBtn")) root.querySelector("#bbVerifyTransfusionBtn").onclick = () => openTransfusionVerificationModal(data.reservedUnits);
    if (root.querySelector("#bbReportEmergencyRxBtn")) root.querySelector("#bbReportEmergencyRxBtn").onclick = () => openReportReactionModal();
    if (root.querySelector("#bbLogTempBtn")) root.querySelector("#bbLogTempBtn").onclick = () => openLogTempModal(data.locations);
    if (root.querySelector("#bbRegisterDonorBtn")) root.querySelector("#bbRegisterDonorBtn").onclick = () => openDonorModal();

    if (root.querySelector("#bbFilterComp")) root.querySelector("#bbFilterComp").onchange = (e) => { state.component_type = e.target.value; load(); };
    if (root.querySelector("#bbFilterUnitStatus")) root.querySelector("#bbFilterUnitStatus").onchange = (e) => { state.status = e.target.value; load(); };
    if (root.querySelector("#bbFilterXmStatus")) root.querySelector("#bbFilterXmStatus").onchange = (e) => { state.reservation_status = e.target.value; load(); };
    if (root.querySelector("#bbFilterTxStatus")) root.querySelector("#bbFilterTxStatus").onchange = (e) => { state.transfusion_status = e.target.value; load(); };
    if (root.querySelector("#bbFilterRxClass")) root.querySelector("#bbFilterRxClass").onchange = (e) => { state.reaction_classification = e.target.value; load(); };
    if (root.querySelector("#bbFilterAbo")) root.querySelector("#bbFilterAbo").onchange = (e) => { state.abo_group = e.target.value; load(); };
    if (root.querySelector("#bbFilterRh")) root.querySelector("#bbFilterRh").onchange = (e) => { state.rh_factor = e.target.value; load(); };
    if (root.querySelector("#bbFilterDonorStatus")) root.querySelector("#bbFilterDonorStatus").onchange = (e) => { state.eligibility_status = e.target.value; load(); };

    let t = null;
    root.querySelector("#bbSearch").oninput = (e) => {
        clearTimeout(t);
        t = setTimeout(() => {
            state.q = e.target.value.trim();
            load();
        }, 300);
    };

    root.onclick = async (e) => {
        const releaseBtn = e.target.closest("[data-release-xm]");
        if (releaseBtn) {
            const id = Number(releaseBtn.dataset.releaseXm);
            const reason = prompt("Enter clinical reason for releasing this reservation hold early:");
            if (reason) {
                const res = await api("/blood-bank/crossmatches/release", {
                    method: "POST",
                    body: JSON.stringify({ id, reason })
                });
                if (res?.success) {
                    showToast(res.message, "success");
                    load();
                } else {
                    showToast(res?.message || "Failed to release reservation", "error");
                }
            }
            return;
        }

        const startTxBtn = e.target.closest("[data-start-tx]");
        if (startTxBtn) {
            openStartInfusionModal(Number(startTxBtn.dataset.startTx));
            return;
        }

        const vitalsTxBtn = e.target.closest("[data-vitals-tx]");
        if (vitalsTxBtn) {
            openRecordVitalsModal(Number(vitalsTxBtn.dataset.vitalsTx));
            return;
        }

        const completeTxBtn = e.target.closest("[data-complete-tx]");
        if (completeTxBtn) {
            openCompleteTransfusionModal(Number(completeTxBtn.dataset.completeTx));
            return;
        }

        const rxTxBtn = e.target.closest("[data-reaction-tx]");
        if (rxTxBtn) {
            openReportReactionModal(Number(rxTxBtn.dataset.reactionTx));
            return;
        }

        const viewTxBtn = e.target.closest("[data-view-tx]");
        if (viewTxBtn) {
            openTransfusionVitalsHistoryModal(Number(viewTxBtn.dataset.viewTx));
            return;
        }

        const invRxBtn = e.target.closest("[data-investigate-rx]");
        if (invRxBtn) {
            openPathologistInvestigationModal(Number(invRxBtn.dataset.investigateRx));
            return;
        }

        const qBtn = e.target.closest("[data-quarantine-unit]");
        if (qBtn) {
            const id = Number(qBtn.dataset.quarantineUnit);
            const reason = prompt("Enter clinical reason for quarantining this unit:");
            if (reason) {
                await api("/blood-bank/inventory/status", {
                    method: "POST",
                    body: JSON.stringify({ id, status: "quarantined", reason })
                });
                showToast("Unit placed under quarantine.", "success");
                load();
            }
            return;
        }

        const unqBtn = e.target.closest("[data-unquarantine-unit]");
        if (unqBtn) {
            const id = Number(unqBtn.dataset.unquarantineUnit);
            if (confirm("Release this unit back to available stock?")) {
                await api("/blood-bank/inventory/status", {
                    method: "POST",
                    body: JSON.stringify({ id, status: "available" })
                });
                showToast("Unit released to available stock.", "success");
                load();
            }
            return;
        }

        const editDonorBtn = e.target.closest("[data-edit-donor]");
        if (editDonorBtn) {
            const id = Number(editDonorBtn.dataset.editDonor);
            openDonorModal(id);
        }
    };
}

function renderInventoryKpi(s) {
    return `
        <div class="bb-counts">
            <div class="good"><b>${s.total_available || 0}</b>Units Available</div>
            <div class="${s.total_quarantined ? "bad" : ""}"><b>${s.total_quarantined || 0}</b>Quarantined Units</div>
            <div><b>${s.total_reserved || 0}</b>Reserved Units</div>
            <div class="${s.near_expiry_3days ? "warn" : ""}"><b>${s.near_expiry_3days || 0}</b>Near Expiry (&lt;3 Days)</div>
        </div>
    `;
}

function renderCrossmatchKpi(s) {
    return `
        <div class="bb-counts">
            <div class="good"><b>${s.active_reservation_holds || 0}</b>Active 48h Holds</div>
            <div class="${s.expiring_within_12h ? "warn" : ""}"><b>${s.expiring_within_12h || 0}</b>Expiring &lt; 12 Hours</div>
            <div><b>${s.issued_today || 0}</b>Units Issued Today</div>
        </div>
    `;
}

function renderTransfusionsKpi(s) {
    return `
        <div class="bb-counts">
            <div class="${s.active_infusions ? "warn" : "good"}"><b>${s.active_infusions || 0}</b>Infusing at Bedside</div>
            <div><b>${s.verified_ready || 0}</b>Verified &amp; Ready</div>
            <div class="good"><b>${s.completed_today || 0}</b>Completed Today</div>
            <div class="${s.reactions_under_investigation ? "bad" : ""}"><b>${s.reactions_under_investigation || 0}</b>Reactions Under Investigation</div>
            <div><b>${s.total_reactions_logged || 0}</b>Total Reactions Logged</div>
        </div>
    `;
}

function renderReactionsKpi(s) {
    return `
        <div class="bb-counts">
            <div class="bad"><b>${s.total_reactions_logged || 0}</b>Total Adverse Reactions</div>
            <div class="${s.reactions_under_investigation ? "bad" : "good"}"><b>${s.reactions_under_investigation || 0}</b>Awaiting Pathologist Sign-Off</div>
            <div><b>${s.active_infusions || 0}</b>Active Infusions</div>
        </div>
    `;
}

function renderColdChainKpi(locs) {
    const total = locs.length;
    const ok = locs.filter(l => Number(l.current_temp_c) >= Number(l.min_temp_c) && Number(l.current_temp_c) <= Number(l.max_temp_c)).length;
    const breach = total - ok;
    return `
        <div class="bb-counts">
            <div class="good"><b>${ok} / ${total}</b>Storage Units in Range</div>
            <div class="${breach ? "bad" : ""}"><b>${breach}</b>Breach / Warning Alerts</div>
        </div>
    `;
}

function renderDonorsKpi(s) {
    return `
        <div class="bb-counts">
            <div class="good"><b>${s.eligible || 0}</b>Eligible Donors</div>
            <div class="${s.temporarily_deferred ? "warn" : ""}"><b>${s.temporarily_deferred || 0}</b>Temp Deferred</div>
            <div class="${s.permanently_deferred ? "bad" : ""}"><b>${s.permanently_deferred || 0}</b>Permanently Deferred</div>
            <div><b>${s.total_registered || 0}</b>Total Registered</div>
        </div>
    `;
}

function renderInventoryList(units) {
    if (!units.length) return `<div class="bb-empty">No blood units found matching criteria.</div>`;
    return `<div class="bb-list">${units.map(unitCard).join("")}</div>`;
}

function renderCrossmatchesList(xms) {
    if (!xms.length) return `<div class="bb-empty">No crossmatch records found matching criteria.</div>`;
    return `<div class="bb-list">${xms.map(crossmatchCard).join("")}</div>`;
}

function renderTransfusionsList(txs) {
    if (!txs.length) return `<div class="bb-empty">No bedside transfusion administrations logged yet.</div>`;
    return `<div class="bb-list">${txs.map(transfusionCard).join("")}</div>`;
}

function renderReactionsList(rxs) {
    if (!rxs.length) return `<div class="bb-empty">No transfusion adverse reactions reported.</div>`;
    return `<div class="bb-list">${rxs.map(reactionCard).join("")}</div>`;
}

function crossmatchCard(xm) {
    const isActive = xm.reservation_status === "active_hold";
    const isCompat = xm.overall_compatibility === "compatible";
    const hoursLeft = Number(xm.hours_until_expiration);
    const holdBadgeClass = isActive ? (hoursLeft <= 12 ? "bb-badge warn" : "bb-badge good") : "bb-badge";

    return `
        <div class="bb-card ${isCompat ? "" : "bad"}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <span class="${holdBadgeClass}">${esc(xm.reservation_status.replace("_", " ").toUpperCase())}</span>
                    <b style="font-family:monospace;font-size:14px;color:#2563eb;margin-left:6px;">${esc(xm.crossmatch_number)}</b>
                    <h3 style="margin:4px 0 2px;font-size:16px;">Patient: ${esc(xm.patient_name)} (${esc(xm.patient_no)}) · Blood Type: <b style="color:#dc2626;">${esc(xm.patient_blood_type)}</b></h3>
                    <div class="bb-muted">Indication: <b>${esc(xm.clinical_indication || "Transfusion support")}</b>${xm.scheduled_surgery_date ? ` · Surgery: <b>${esc(xm.scheduled_surgery_date)}</b>` : ""}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:14px;font-weight:700;color:${isCompat ? "#059669" : "#dc2626"};">
                        ${isCompat ? "✓ COMPATIBLE" : "⚠️ " + esc(xm.overall_compatibility.toUpperCase())}
                    </div>
                    <div style="font-size:12px;margin-top:2px;">Hold Expires: <b>${esc(xm.reservation_expires_at)}</b></div>
                    ${isActive ? `<div style="font-size:11.5px;font-weight:700;color:${hoursLeft <= 12 ? "#d97706" : "#059669"};">${hoursLeft > 0 ? `${hoursLeft} hours remaining on hold` : "Hold Expired"}</div>` : ""}
                </div>
            </div>

            <div style="background:var(--bg-muted, #f8fafc);padding:8px 10px;border-radius:6px;font-size:12px;margin:8px 0;">
                <div style="display:flex;justify-content:space-between;">
                    <div>
                        <b>Reserved Unit:</b> <span style="font-family:monospace;font-weight:700;color:#991b1b;">${esc(xm.donor_unit_number)}</span> (${esc(xm.component_type.toUpperCase())} · Donor Type: <b>${esc(xm.donor_blood_type)}</b>)
                    </div>
                    <div>
                        <b>Serology Phases:</b> Immediate Spin: <b>${esc(xm.immediate_spin_major)}</b> · 37°C: <b>${esc(xm.thermo_phase_37c_major)}</b> · AHG/Coombs: <b>${esc(xm.ahg_phase_major)}</b>
                    </div>
                </div>
                ${xm.compatibility_notes ? `<div style="margin-top:4px;color:var(--text-muted);"><b>Notes:</b> ${esc(xm.compatibility_notes)}</div>` : ""}
                <div class="bb-muted" style="font-size:11px;margin-top:4px;">Tested by: ${esc(xm.performed_by_username || "MedTech")} (PRC: ${esc(xm.medtech_license_no || "N/A")}) on ${esc(xm.reserved_at)}</div>
            </div>

            ${isActive ? `
                <div style="display:flex;justify-content:flex-end;gap:6px;">
                    <button type="button" class="bb-btn sm" data-release-xm="${xm.id}">Release 48h Hold Early…</button>
                </div>
            ` : ""}
        </div>
    `;
}

function transfusionCard(tx) {
    const isReady = tx.status === "verified_ready";
    const isInfusing = tx.status === "infusing";
    const isComplete = tx.status === "completed";
    const isStopped = tx.status === "stopped_reaction";

    const badgeClass = isInfusing ? "bb-badge warn" : isComplete ? "bb-badge good" : isStopped ? "bb-badge bad" : "bb-badge";
    const statusLabel = isInfusing ? "⚡ INFUSING NOW" : isComplete ? "✓ COMPLETED" : isStopped ? "🚨 STOPPED (REACTION)" : "READY TO INFUSE";

    return `
        <div class="bb-card ${isStopped ? "bad" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                    <span class="${badgeClass}">${statusLabel}</span>
                    <b style="font-family:monospace;font-size:14px;color:#2563eb;margin-left:6px;">${esc(tx.transfusion_number)}</b>
                    <h3 style="margin:4px 0 2px;font-size:16px;">
                        Patient: <b>${esc(tx.patient_name || "Unknown Patient")}</b> (${esc(tx.patient_mrn || "N/A")}) · Blood Group: <b style="color:#dc2626;">${esc(tx.patient_blood_type || "N/A")}</b>
                    </h3>
                    <div class="bb-muted">
                        Prescribed by: <b>${esc(tx.prescribing_physician || "Attending MD")}</b> · Indication: <b>${esc(tx.clinical_indication || "Transfusion therapy")}</b>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:15px;font-weight:800;color:#991b1b;">
                        🩸 ${esc(tx.component_type?.toUpperCase() || "PRBC")} (Unit ${esc(tx.donor_unit_number || "N/A")})
                    </div>
                    <div style="font-size:12px;margin-top:2px;">IV Site: <b>${esc(tx.iv_access_site || "N/A")}</b></div>
                    ${tx.infusion_started_at ? `<div style="font-size:11.5px;" class="bb-muted">Started: ${esc(tx.infusion_started_at)}</div>` : ""}
                </div>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:7px 10px;border-radius:6px;font-size:12px;margin:8px 0;color:#166534;">
                <b>✓ Dual-Nurse Pre-Transfusion Checklist Verified:</b> Primary: <b>${esc(tx.primary_nurse_name)}</b> (${esc(tx.primary_nurse_license || "RN")}) &amp; Witness: <b>${esc(tx.witness_nurse_name)}</b> (${esc(tx.witness_nurse_license || "RN")})
            </div>

            <div style="background:var(--bg-muted, #f8fafc);padding:8px 10px;border-radius:6px;font-size:12px;margin:8px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div>
                    <b>Vital Checks:</b> <span class="bb-badge">${tx.vitals_count || 0} recorded</span>
                    ${tx.latest_temp_c ? `· Latest: <b style="color:${Number(tx.latest_temp_c) >= 38 ? "#dc2626" : "#059669"}">${tx.latest_temp_c}°C</b> · HR: <b>${tx.latest_hr_bpm} bpm</b> · SpO2: <b>${tx.latest_spo2}%</b>` : `· <span class="bb-muted">Baseline vitals pending</span>`}
                </div>
                <div>
                    Target Duration: <b>${tx.infusion_target_duration_mins || 120} mins</b> · Flow Rate: <b>${tx.initial_flow_rate_ml_hr || 120} mL/hr</b>
                </div>
            </div>

            ${tx.completion_notes ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;"><b>Notes:</b> ${esc(tx.completion_notes)}</div>` : ""}

            <div style="display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;margin-top:4px;">
                <button type="button" class="bb-btn sm" data-view-tx="${tx.id}">👁️ Transfusion Chart &amp; Vitals</button>
                ${isReady ? `<button type="button" class="bb-btn sm blue" data-start-tx="${tx.id}">▶ Start Infusion &amp; Baseline Vitals</button>` : ""}
                ${isInfusing ? `
                    <button type="button" class="bb-btn sm" data-vitals-tx="${tx.id}">📊 Record Vitals (15m/Hourly)</button>
                    <button type="button" class="bb-btn sm blue" data-complete-tx="${tx.id}">✓ Complete Infusion</button>
                    <button type="button" class="bb-btn sm" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5;" data-reaction-tx="${tx.id}">🚨 STAT Reaction Report</button>
                ` : ""}
            </div>
        </div>
    `;
}

function reactionCard(rx) {
    const isClosed = rx.investigation_status === "final_closed";
    const sevBadge = rx.severity_level === "life_threatening" || rx.severity_level === "fatal" ? "bb-badge bad" : rx.severity_level === "severe" ? "bb-badge warn" : "bb-badge";
    const classLabels = {
        acute_hemolytic: "Acute Hemolytic (AHTR)",
        trali: "Transfusion-Related Acute Lung Injury (TRALI)",
        taco: "Transfusion-Associated Circulatory Overload (TACO)",
        febrile_non_hemolytic: "Febrile Non-Hemolytic (FNHTR)",
        anaphylactic_severe: "Severe Anaphylaxis",
        mild_allergic_urticarial: "Allergic / Urticarial",
        sepsis_bacterial: "Transfusion Sepsis (TTBI)",
        delayed_hemolytic: "Delayed Hemolytic (DHTR)",
        unrelated_other: "Unrelated Adverse Event"
    };

    const symptoms = [];
    if (rx.symptom_fever) symptoms.push("Fever (≥38°C)");
    if (rx.symptom_chills_rigors) symptoms.push("Chills / Rigors");
    if (rx.symptom_dyspnea_hypoxia) symptoms.push("Dyspnea / Hypoxemia");
    if (rx.symptom_tachycardia_hypotension) symptoms.push("Tachycardia / Hypotension");
    if (rx.symptom_hypertension) symptoms.push("Hypertension (TACO)");
    if (rx.symptom_urticaria_hives) symptoms.push("Urticaria / Hives");
    if (rx.symptom_facial_edema_stridor) symptoms.push("Facial Edema / Stridor");
    if (rx.symptom_back_flank_pain) symptoms.push("Back / Flank Pain (AHTR)");
    if (rx.symptom_hemoglobinuria_dark_urine) symptoms.push("Dark Urine / Hemoglobinuria");
    if (rx.symptom_nausea_vomiting) symptoms.push("Nausea / Vomiting");

    return `
        <div class="bb-card bad">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                    <span class="bb-badge bad">🚨 ADVERSE REACTION</span>
                    <b style="font-family:monospace;font-size:14px;color:#dc2626;margin-left:6px;">${esc(rx.reaction_number)}</b>
                    <span class="${sevBadge}" style="margin-left:4px;">${esc(rx.severity_level.toUpperCase())}</span>
                    <h3 style="margin:4px 0 2px;font-size:16px;">
                        Patient: <b>${esc(rx.patient_name)}</b> (${esc(rx.patient_mrn)}) · Transfusion: <b>${esc(rx.transfusion_number)}</b>
                    </h3>
                    <div class="bb-muted">
                        Donor Bag: <b style="font-family:monospace;">${esc(rx.donor_unit_number)}</b> (${esc(rx.component_type?.toUpperCase())} · ${esc(rx.donor_abo_group)}${rx.donor_rh_factor === "positive" ? "+" : "-"}) · Onset after: <b>${rx.ml_transfused_at_onset} mL transfused</b>
                    </div>
                </div>
                <div style="text-align:right;">
                    <span class="bb-badge ${isClosed ? "good" : "warn"}">${isClosed ? "CLOSED / SIGNED OFF" : "UNDER INVESTIGATION"}</span>
                    <div style="font-size:14px;font-weight:700;color:#991b1b;margin-top:4px;">
                        ${esc(classLabels[rx.reaction_classification] || rx.reaction_classification || "Pending Workup")}
                    </div>
                    <div class="bb-muted" style="font-size:11px;">Onset: ${esc(rx.reaction_onset_time)}</div>
                </div>
            </div>

            <div style="background:#fee2e2;border:1px solid #fca5a5;padding:8px 10px;border-radius:6px;font-size:12px;margin:8px 0;color:#991b1b;">
                <div><b>Clinical Presentation:</b> ${symptoms.length ? symptoms.join(" · ") : "General systemic reaction"}</div>
                ${rx.symptom_details ? `<div style="margin-top:4px;"><b>Bedside Notes:</b> ${esc(rx.symptom_details)}</div>` : ""}
                ${rx.emergency_medications_given ? `<div style="margin-top:4px;"><b>Emergency Interventions:</b> ${esc(rx.emergency_medications_given)}</div>` : ""}
            </div>

            <div style="background:var(--bg-muted, #f8fafc);padding:8px 10px;border-radius:6px;font-size:12px;margin:8px 0;">
                <div style="font-weight:700;margin-bottom:4px;color:#1e3a8a;">🔬 Blood Bank &amp; Pathologist Laboratory Investigation:</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:6px;">
                    <div>Clerical Check: <b>${esc(rx.clerical_check_match.replace("_", " "))}</b></div>
                    <div>Visual Hemolysis: <b>${esc(rx.visual_hemolysis_post_sample.replace("_", " "))}</b></div>
                    <div>Direct Antiglobulin (DAT): <b>${esc(rx.direct_antiglobulin_test_dat.toUpperCase())}</b></div>
                    <div>Repeat ABO/Rh: <b>${esc(rx.repeat_abo_rh_match.replace("_", " "))}</b></div>
                    <div>Bag Gram Stain: <b>${esc(rx.blood_bag_gram_stain.replace("_", " "))}</b></div>
                    <div>Urine Free Hemoglobin: <b>${esc(rx.free_hemoglobin_in_urine)}</b></div>
                </div>
                ${rx.pathologist_notes ? `<div style="margin-top:6px;padding-top:4px;border-top:1px dashed var(--border-color);"><b>Pathologist Evaluation:</b> ${esc(rx.pathologist_notes)} <i>— ${esc(rx.pathologist_evaluator || "Pathologist")} (${esc(rx.pathologist_signed_at || "Signed")})</i></div>` : ""}
            </div>

            <div style="display:flex;justify-content:flex-end;gap:6px;">
                <button type="button" class="bb-btn sm blue" data-investigate-rx="${rx.id}">🔬 Pathologist Investigation Sign-Off…</button>
            </div>
        </div>
    `;
}

function unitCard(u) {
    const isAvail = u.status === "available";
    const isQuar = u.status === "quarantined";
    const isRes = u.status === "crossmatched_reserved";

    const badgeClass = isAvail ? "bb-badge good" : isQuar ? "bb-badge bad" : isRes ? "bb-badge warn" : "bb-badge";
    const daysLeft = Number(u.days_until_expiry);
    const expiryClass = daysLeft < 0 ? "bad" : daysLeft <= 3 ? "warn" : "good";

    return `
        <div class="bb-card ${isQuar ? "bad" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <span class="${badgeClass}">${esc(u.status_label)}</span>
                    <b style="font-family:monospace;font-size:15px;color:#2563eb;margin-left:6px;">${esc(u.unit_number)}</b>
                    <h3 style="margin:4px 0 2px;font-size:16px;color:#991b1b;">${esc(u.component_name)} · ${u.volume_ml} mL</h3>
                    <div class="bb-muted">Storage: <b>${esc(u.storage_location_name || "Unassigned")}</b> ${u.shelf_slot ? `(${esc(u.shelf_slot)})` : ""} · Current Temp: <b>${u.current_temp_c !== null ? `${u.current_temp_c}°C` : "N/A"}</b></div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:22px;font-weight:800;color:#dc2626;">🩸 ${esc(u.blood_type_formatted)}</div>
                    <div style="font-size:12px;margin-top:2px;">Expires: <b>${esc(u.expiration_date)}</b> (<span class="${expiryClass}" style="font-weight:700;">${daysLeft < 0 ? "Expired" : `${daysLeft}d remaining`}</span>)</div>
                </div>
            </div>

            <div style="background:var(--bg-muted, #f8fafc);padding:8px 10px;border-radius:6px;font-size:12px;margin:8px 0;display:flex;justify-content:space-between;">
                <div>
                    <span>Required Cold-Chain: <b>${esc(u.temp_spec_label)}</b></span>
                    ${u.requires_continuous_agitation ? `<span style="color:#d97706;font-weight:700;margin-left:6px;">⚡ Continuous Agitation Required</span>` : ""}
                </div>
                <div>
                    Collected: <b>${esc(u.collection_date)}</b>${u.donor_number ? ` · Donor: <a href="#" data-edit-donor="${u.donor_id}">${esc(u.donor_number)}</a>` : ""}
                </div>
            </div>

            ${u.quarantine_reason ? `<div style="color:#dc2626;font-weight:600;font-size:12px;margin-bottom:6px;">🔒 Quarantine Lock: ${esc(u.quarantine_reason)}</div>` : ""}
            ${u.reserved_patient_name ? `<div style="color:#2563eb;font-weight:600;font-size:12px;margin-bottom:6px;">👤 Crossmatched for: ${esc(u.reserved_patient_name)} (${esc(u.reserved_patient_no)})</div>` : ""}

            <div style="display:flex;justify-content:flex-end;gap:6px;">
                ${isAvail ? `<button type="button" class="bb-btn sm" data-quarantine-unit="${u.id}">Quarantine Unit…</button>` : ""}
                ${isQuar ? `<button type="button" class="bb-btn sm" data-unquarantine-unit="${u.id}">Release Quarantine</button>` : ""}
            </div>
        </div>
    `;
}

function renderColdChainList(locs) {
    if (!locs.length) return `<div class="bb-empty">No cold-chain storage equipment configured.</div>`;

    return `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:12px;">
            ${locs.map(loc => {
                const cur = Number(loc.current_temp_c);
                const min = Number(loc.min_temp_c);
                const max = Number(loc.max_temp_c);
                const inRange = cur >= min && cur <= max;

                return `
                    <div class="bb-card ${inRange ? "" : "bad"}">
                        <div style="display:flex;justify-content:space-between;">
                            <div>
                                <span class="bb-badge ${inRange ? "good" : "bad"}">${inRange ? "✓ IN SPEC" : "⚠️ OUT OF RANGE"}</span>
                                <h3 style="margin:4px 0 2px;font-size:15px;">${esc(loc.name)}</h3>
                                <div class="bb-muted">${esc(loc.location_description || "Blood Bank Suite")}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:24px;font-weight:800;color:${inRange ? "#059669" : "#dc2626"};">${cur !== null && !isNaN(cur) ? `${cur.toFixed(1)}°C` : "N/A"}</div>
                                <div class="bb-muted" style="font-size:11px;">Target: ${loc.target_temp_c}°C</div>
                            </div>
                        </div>

                        <div style="background:var(--bg-muted, #f8fafc);padding:6px 8px;border-radius:6px;font-size:12px;margin:8px 0;">
                            <div>Safe Range: <b>${min}°C to ${max}°C</b></div>
                            <div style="font-size:11px;" class="bb-muted">Equipment: ${esc(loc.equipment_type.replace("_", " ").toUpperCase())}</div>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;">
                            <span class="bb-muted">Last check: ${esc(loc.last_temp_check_at || "Never")}</span>
                            <button type="button" class="bb-btn sm blue" id="bbLogTempBtn">Log Temp</button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderDonorsList(donors) {
    if (!donors.length) return `<div class="bb-empty">No blood donors registered.</div>`;
    return `<div class="bb-list">${donors.map(donorCard).join("")}</div>`;
}

function donorCard(d) {
    const isElig = d.eligibility_status === "eligible";
    const isPerm = d.eligibility_status === "permanently_deferred";
    const badgeClass = isElig ? "bb-badge good" : isPerm ? "bb-badge bad" : "bb-badge warn";

    const ttiPills = [
        `HIV: <b style="color:${d.hiv_screen === "reactive" ? "#dc2626" : "#059669"};">${esc(d.hiv_screen)}</b>`,
        `HBV: <b style="color:${d.hbv_screen === "reactive" ? "#dc2626" : "#059669"};">${esc(d.hbv_screen)}</b>`,
        `HCV: <b style="color:${d.hcv_screen === "reactive" ? "#dc2626" : "#059669"};">${esc(d.hcv_screen)}</b>`,
        `Syph: <b style="color:${d.syphilis_screen === "reactive" ? "#dc2626" : "#059669"};">${esc(d.syphilis_screen)}</b>`,
        `Malaria: <b style="color:${d.malaria_screen === "reactive" ? "#dc2626" : "#059669"};">${esc(d.malaria_screen)}</b>`
    ].join(" · ");

    return `
        <div class="bb-card ${isElig ? "" : "bad"}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <span class="${badgeClass}">${esc(d.eligibility_status.replace("_", " ").toUpperCase())}</span>
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

function openAddUnitModal(locations) {
    const html = `
        <div class="bb-modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Blood Component Type *</label>
                    <select id="uComp" required>
                        <option value="prbc">Packed Red Blood Cells (PRBC: 1–6°C, 42d)</option>
                        <option value="ffp">Fresh Frozen Plasma (FFP: ≤-18°C, 365d)</option>
                        <option value="platelets">Platelets (20–24°C Agitated, 5d)</option>
                        <option value="cryoprecipitate">Cryoprecipitate (≤-18°C, 365d)</option>
                        <option value="whole_blood">Whole Blood (WB: 1–6°C, 35d)</option>
                    </select>
                </div>
                <div>
                    <label>Volume (mL) *</label>
                    <input type="number" id="uVol" value="300" required>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>ABO Group *</label>
                    <select id="uAbo" required>
                        <option value="O">Group O</option>
                        <option value="A">Group A</option>
                        <option value="B">Group B</option>
                        <option value="AB">Group AB</option>
                    </select>
                </div>
                <div>
                    <label>Rh Factor *</label>
                    <select id="uRh" required>
                        <option value="positive">Rh Positive (+)</option>
                        <option value="negative">Rh Negative (-)</option>
                    </select>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>Collection Date *</label>
                    <input type="date" id="uCdate" value="${new Date().toISOString().slice(0, 10)}" required>
                </div>
                <div>
                    <label>Unit DIN / Barcode (blank = auto)</label>
                    <input type="text" id="uDin" placeholder="e.g. W26-2026-XXXXX">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>Cold-Chain Storage Location *</label>
                    <select id="uLoc" required>
                        <option value="">Select Refrigerator / Freezer...</option>
                        ${locations.map(l => `<option value="${l.id}">${esc(l.name)} (${l.min_temp_c}°C to ${l.max_temp_c}°C)</option>`).join("")}
                    </select>
                </div>
                <div>
                    <label>Shelf / Slot Assignment</label>
                    <input type="text" id="uShelf" placeholder="e.g. Shelf A - Rack 2">
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="uCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="uSave">Receive Blood Unit</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Receive Blood Product Unit</h3>
                <button type="button" class="bb-close" id="uClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#uClose").onclick = close;
    ov.querySelector("#uCancel").onclick = close;

    ov.querySelector("#uSave").onclick = async () => {
        const payload = {
            component_type: ov.querySelector("#uComp").value,
            volume_ml: Number(ov.querySelector("#uVol").value),
            abo_group: ov.querySelector("#uAbo").value,
            rh_factor: ov.querySelector("#uRh").value,
            collection_date: ov.querySelector("#uCdate").value,
            unit_number: ov.querySelector("#uDin").value.trim(),
            storage_location_id: Number(ov.querySelector("#uLoc").value),
            shelf_slot: ov.querySelector("#uShelf").value.trim()
        };

        const res = await api("/blood-bank/inventory/add", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to receive unit", "error");
        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

function openNewCrossmatchModal(availableUnits) {
    const html = `
        <div class="bb-modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Patient ID (Numeric) *</label>
                    <input type="number" id="xmPid" value="1" required placeholder="Enter Patient ID">
                </div>
                <div>
                    <label>Recipient ABO / Rh Blood Type *</label>
                    <select id="xmPatBt" required>
                        <option value="O+">O Positive (O+)</option>
                        <option value="O-">O Negative (O-)</option>
                        <option value="A+">A Positive (A+)</option>
                        <option value="A-">A Negative (A-)</option>
                        <option value="B+">B Positive (B+)</option>
                        <option value="B-">B Negative (B-)</option>
                        <option value="AB+">AB Positive (AB+)</option>
                        <option value="AB-">AB Negative (AB-)</option>
                    </select>
                </div>
            </div>

            <div style="margin-top:8px;">
                <label>Select Available Blood Unit for Crossmatch *</label>
                <select id="xmUnitId" required style="width:100%;">
                    <option value="">Choose Unit in Stock...</option>
                    ${availableUnits.map(u => `
                        <option value="${u.id}">${esc(u.unit_number)} — ${esc(u.component_short)} ${esc(u.blood_type_formatted)} (${u.volume_ml}mL, exp ${u.expiration_date})</option>
                    `).join("")}
                </select>
                ${!availableUnits.length ? `<div style="color:#b91c1c;font-size:12px;margin-top:2px;">No available blood units in stock. Receive units first.</div>` : ""}
            </div>

            <fieldset>
                <legend>Serological Compatibility Phases (Major & Minor)</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <div>
                        <label>Major: Immediate Spin (IS)</label>
                        <select id="xmSpin">
                            <option value="compatible">Compatible (No agglutination)</option>
                            <option value="incompatible">INCOMPATIBLE (Agglutination)</option>
                        </select>
                    </div>
                    <div>
                        <label>Major: 37°C Thermo Incubation</label>
                        <select id="xmThermo">
                            <option value="compatible">Compatible</option>
                            <option value="incompatible">INCOMPATIBLE</option>
                        </select>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>Major: AHG Phase (Indirect Coombs)</label>
                        <select id="xmAhg">
                            <option value="compatible">Compatible (0 / Negative)</option>
                            <option value="incompatible">INCOMPATIBLE (+1 to +4)</option>
                        </select>
                    </div>
                    <div>
                        <label>Minor Crossmatch</label>
                        <select id="xmMinor">
                            <option value="compatible">Compatible</option>
                            <option value="incompatible">INCOMPATIBLE</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>Clinical Indication / Procedure *</label>
                    <input type="text" id="xmInd" value="Elective Surgical Transfusion Hold" placeholder="e.g. CABG, Cesarean Section">
                </div>
                <div>
                    <label>Scheduled Surgery Date (Optional)</label>
                    <input type="datetime-local" id="xmSurgDate">
                </div>
            </div>

            <div style="margin-top:6px;">
                <label>Medical Technologist PRC License No. *</label>
                <input type="text" id="xmMtLic" value="PRC-MT-089123" required placeholder="PRC License">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="xmCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="xmSave">Lock 48-Hour Reservation Hold</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Crossmatch Testing & 48-Hour Reservation Hold</h3>
                <button type="button" class="bb-close" id="xmClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#xmClose").onclick = close;
    ov.querySelector("#xmCancel").onclick = close;

    ov.querySelector("#xmSave").onclick = async () => {
        const unitId = Number(ov.querySelector("#xmUnitId").value);
        if (!unitId) return showToast("Please select a blood unit.", "error");

        const payload = {
            patient_id: Number(ov.querySelector("#xmPid").value),
            patient_blood_type: ov.querySelector("#xmPatBt").value,
            blood_unit_id: unitId,
            immediate_spin_major: ov.querySelector("#xmSpin").value,
            thermo_phase_37c_major: ov.querySelector("#xmThermo").value,
            ahg_phase_major: ov.querySelector("#xmAhg").value,
            minor_crossmatch_result: ov.querySelector("#xmMinor").value,
            clinical_indication: ov.querySelector("#xmInd").value.trim(),
            scheduled_surgery_date: ov.querySelector("#xmSurgDate").value ? ov.querySelector("#xmSurgDate").value.replace("T", " ") : null,
            medtech_license_no: ov.querySelector("#xmMtLic").value.trim()
        };

        const res = await api("/blood-bank/crossmatches/perform", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) {
            return showToast(res?.message || "Crossmatch failed.", "error", 8000);
        }

        showToast(res.message, "success", 8000);
        close();
        load();
    };
}

/**
 * Bedside Pre-Transfusion Dual-Nurse Verification Modal
 */
function openTransfusionVerificationModal(reservedUnits = []) {
    const html = `
        <div class="bb-modal-body">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:8px 10px;border-radius:6px;font-size:12px;color:#1e40af;margin-bottom:8px;">
                <b>Strict Bedside Safety Standard:</b> Both Primary Nurse and Witness Nurse must independently confirm all 7 verification checkpoints at the patient's bedside prior to administering blood products.
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Patient ID (Numeric) *</label>
                    <input type="number" id="txPid" value="1" required placeholder="Patient ID">
                </div>
                <div>
                    <label>Select Blood Unit *</label>
                    <select id="txUid" required>
                        <option value="">Choose Blood Unit...</option>
                        ${reservedUnits.map(u => `
                            <option value="${u.id}">${esc(u.unit_number)} — ${esc(u.component_type.toUpperCase())} ${esc(u.abo_group)}${u.rh_factor === "positive" ? "+" : "-"} (${u.volume_ml}mL)</option>
                        `).join("")}
                    </select>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>Prescribing Physician *</label>
                    <input type="text" id="txDoc" value="Dr. Gregory House, MD" required>
                </div>
                <div>
                    <label>Clinical Indication *</label>
                    <input type="text" id="txInd" value="Acute blood loss / Severe anemia (Hb < 7.0 g/dL)" required>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>IV Access Site & Gauge *</label>
                    <input type="text" id="txIv" value="Right Forearm 18G Cannula" required>
                </div>
                <div>
                    <label>Target Duration (mins) *</label>
                    <input type="number" id="txDur" value="120" required>
                </div>
                <div>
                    <label>Initial Rate (mL/hr) *</label>
                    <input type="number" id="txRate" value="120" required title="Initial 15 mins recommended at ~120 mL/hr">
                </div>
            </div>

            <fieldset style="margin-top:10px;border-color:#b91c1c;">
                <legend style="color:#b91c1c;">🚨 Mandatory Dual-Nurse Bedside Checklist (All Required)</legend>
                <div style="display:grid;gap:6px;font-size:12.5px;padding-top:4px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="txChkId" checked> 1. Patient 2-identifier wristband identity match (Name, MRN, DOB)
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="txChkUnit" checked> 2. Blood Unit DIN barcode matches crossmatch compatibility tag
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="txChkBg" checked> 3. Recipient & Donor ABO/Rh match tag & compatibility report
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="txChkComp" checked> 4. Blood component type matches physician order
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="txChkExp" checked> 5. Blood unit expiration date and time verified valid
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="txChkVis" checked> 6. Visual inspection of bag normal (no clots, hemolysis, cloudiness, leaks)
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="txChkConsent" checked> 7. Informed transfusion consent confirmed signed and documented on chart
                    </label>
                </div>
            </fieldset>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
                <fieldset>
                    <legend>Nurse 1 (Administering Nurse)</legend>
                    <label>Full Name *</label>
                    <input type="text" id="txN1Name" value="Nurse Sarah Jenkins, RN" required>
                    <label style="margin-top:4px;">PRC License No. *</label>
                    <input type="text" id="txN1Lic" value="RN-2024-99881" required>
                </fieldset>
                <fieldset>
                    <legend>Nurse 2 (Independent Witness)</legend>
                    <label>Full Name *</label>
                    <input type="text" id="txN2Name" value="Nurse Michael Chang, RN" required>
                    <label style="margin-top:4px;">PRC License No. *</label>
                    <input type="text" id="txN2Lic" value="RN-2023-44112" required>
                </fieldset>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="txCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="txVerifySave">Sign & Verify Transfusion Ready</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Dual-Nurse Bedside Transfusion Verification</h3>
                <button type="button" class="bb-close" id="txClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#txClose").onclick = close;
    ov.querySelector("#txCancel").onclick = close;

    ov.querySelector("#txVerifySave").onclick = async () => {
        const payload = {
            patient_id: Number(ov.querySelector("#txPid").value),
            blood_unit_id: Number(ov.querySelector("#txUid").value),
            prescribing_physician: ov.querySelector("#txDoc").value.trim(),
            clinical_indication: ov.querySelector("#txInd").value.trim(),
            iv_access_site: ov.querySelector("#txIv").value.trim(),
            infusion_target_duration_mins: Number(ov.querySelector("#txDur").value),
            initial_flow_rate_ml_hr: Number(ov.querySelector("#txRate").value),
            verified_patient_identity: ov.querySelector("#txChkId").checked ? 1 : 0,
            verified_unit_number: ov.querySelector("#txChkUnit").checked ? 1 : 0,
            verified_blood_group: ov.querySelector("#txChkBg").checked ? 1 : 0,
            verified_component_type: ov.querySelector("#txChkComp").checked ? 1 : 0,
            verified_expiration_date: ov.querySelector("#txChkExp").checked ? 1 : 0,
            verified_visual_inspection: ov.querySelector("#txChkVis").checked ? 1 : 0,
            verified_patient_consent: ov.querySelector("#txChkConsent").checked ? 1 : 0,
            primary_nurse_name: ov.querySelector("#txN1Name").value.trim(),
            primary_nurse_license: ov.querySelector("#txN1Lic").value.trim(),
            witness_nurse_name: ov.querySelector("#txN2Name").value.trim(),
            witness_nurse_license: ov.querySelector("#txN2Lic").value.trim()
        };

        if (!payload.blood_unit_id) return showToast("Please select a blood unit.", "error");

        const res = await api("/blood-bank/transfusions/verify", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Verification failed.", "error", 8000);

        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

/**
 * Start Infusion & Record Baseline Pre-Transfusion Vitals Modal
 */
function openStartInfusionModal(transfusionId) {
    const html = `
        <div class="bb-modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Infusion Start Time *</label>
                    <input type="datetime-local" id="stTime" value="${new Date().toISOString().slice(0, 16)}">
                </div>
                <div>
                    <label>Initial Flow Rate (mL/hr) *</label>
                    <input type="number" id="stRate" value="120" title="Run at 2 mL/min = 120 mL/hr for first 15 mins">
                </div>
            </div>

            <fieldset style="margin-top:10px;">
                <legend>Baseline Pre-Transfusion Vitals (Stage: baseline_pre)</legend>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                    <div>
                        <label>Temperature (°C) *</label>
                        <input type="number" step="0.1" id="stTemp" value="36.8" required>
                    </div>
                    <div>
                        <label>Heart Rate (bpm) *</label>
                        <input type="number" id="stHr" value="78" required>
                    </div>
                    <div>
                        <label>Respiratory Rate (/min) *</label>
                        <input type="number" id="stRr" value="18" required>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>BP Systolic (mmHg) *</label>
                        <input type="number" id="stBps" value="120" required>
                    </div>
                    <div>
                        <label>BP Diastolic (mmHg) *</label>
                        <input type="number" id="stBpd" value="80" required>
                    </div>
                    <div>
                        <label>SpO2 Oxygen Sat (%) *</label>
                        <input type="number" step="0.1" id="stSpo2" value="98.0" required>
                    </div>
                </div>
                <div style="margin-top:6px;">
                    <label>Patient Baseline Observations</label>
                    <input type="text" id="stObs" value="Patient comfortable and alert. IV line patent without infiltration." placeholder="Observations">
                </div>
            </fieldset>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="stCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="stSave">Confirm & Start Infusion</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Start Transfusion & Log Baseline Vitals</h3>
                <button type="button" class="bb-close" id="stClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#stClose").onclick = close;
    ov.querySelector("#stCancel").onclick = close;

    ov.querySelector("#stSave").onclick = async () => {
        const payload = {
            transfusion_id: transfusionId,
            infusion_started_at: ov.querySelector("#stTime").value.replace("T", " "),
            initial_flow_rate_ml_hr: Number(ov.querySelector("#stRate").value),
            temperature_c: Number(ov.querySelector("#stTemp").value),
            heart_rate_bpm: Number(ov.querySelector("#stHr").value),
            respiratory_rate_bpm: Number(ov.querySelector("#stRr").value),
            bp_systolic: Number(ov.querySelector("#stBps").value),
            bp_diastolic: Number(ov.querySelector("#stBpd").value),
            spo2_percent: Number(ov.querySelector("#stSpo2").value),
            patient_symptoms: ov.querySelector("#stObs").value.trim()
        };

        const res = await api("/blood-bank/transfusions/start", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to start infusion.", "error");
        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

/**
 * Record Hourly / Routine Vitals Modal
 */
function openRecordVitalsModal(transfusionId) {
    const html = `
        <div class="bb-modal-body">
            <div>
                <label>Monitoring Interval / Stage *</label>
                <select id="vStage" required>
                    <option value="15_min">15 Minutes Check (Critical for acute reaction)</option>
                    <option value="30_min">30 Minutes Check</option>
                    <option value="1_hour">1 Hour Check</option>
                    <option value="2_hour">2 Hours Check</option>
                    <option value="3_hour">3 Hours Check</option>
                    <option value="4_hour">4 Hours Check</option>
                </select>
            </div>

            <fieldset style="margin-top:8px;">
                <legend>Vital Signs</legend>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                    <div>
                        <label>Temperature (°C) *</label>
                        <input type="number" step="0.1" id="vTemp" value="36.8" required>
                    </div>
                    <div>
                        <label>Heart Rate (bpm) *</label>
                        <input type="number" id="vHr" value="80" required>
                    </div>
                    <div>
                        <label>Respiratory Rate (/min) *</label>
                        <input type="number" id="vRr" value="18" required>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>BP Systolic (mmHg) *</label>
                        <input type="number" id="vBps" value="120" required>
                    </div>
                    <div>
                        <label>BP Diastolic (mmHg) *</label>
                        <input type="number" id="vBpd" value="80" required>
                    </div>
                    <div>
                        <label>SpO2 (%) *</label>
                        <input type="number" step="0.1" id="vSpo2" value="98.5" required>
                    </div>
                </div>
                <div style="margin-top:6px;">
                    <label>Patient Symptoms & Clinical Response</label>
                    <input type="text" id="vSymp" value="No chills, dyspnea, rash, or flank pain. Infusion progressing well." placeholder="Symptoms...">
                </div>
                <div style="margin-top:6px;">
                    <label>Nurse Name *</label>
                    <input type="text" id="vNurse" value="Nurse Sarah Jenkins, RN" required>
                </div>
            </fieldset>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="vCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="vSave">Save Vital Record</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Log Transfusion Vital Signs Check</h3>
                <button type="button" class="bb-close" id="vClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#vClose").onclick = close;
    ov.querySelector("#vCancel").onclick = close;

    ov.querySelector("#vSave").onclick = async () => {
        const payload = {
            transfusion_id: transfusionId,
            vital_stage: ov.querySelector("#vStage").value,
            temperature_c: Number(ov.querySelector("#vTemp").value),
            heart_rate_bpm: Number(ov.querySelector("#vHr").value),
            respiratory_rate_bpm: Number(ov.querySelector("#vRr").value),
            bp_systolic: Number(ov.querySelector("#vBps").value),
            bp_diastolic: Number(ov.querySelector("#vBpd").value),
            spo2_percent: Number(ov.querySelector("#vSpo2").value),
            patient_symptoms: ov.querySelector("#vSymp").value.trim(),
            recorded_by_nurse: ov.querySelector("#vNurse").value.trim()
        };

        const res = await api("/blood-bank/transfusions/vitals", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to save vitals.", "error");
        showToast(res.message, "success");
        close();
        load();
    };
}

/**
 * Complete Transfusion Modal
 */
function openCompleteTransfusionModal(transfusionId) {
    const html = `
        <div class="bb-modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Completion Date/Time *</label>
                    <input type="datetime-local" id="cpTime" value="${new Date().toISOString().slice(0, 16)}">
                </div>
                <div>
                    <label>Volume Transfused (mL) *</label>
                    <input type="number" id="cpVol" value="350" required>
                </div>
            </div>

            <fieldset style="margin-top:8px;">
                <legend>Post-Transfusion Completion Vitals</legend>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                    <div>
                        <label>Temperature (°C)</label>
                        <input type="number" step="0.1" id="cpTemp" value="36.8">
                    </div>
                    <div>
                        <label>Heart Rate (bpm)</label>
                        <input type="number" id="cpHr" value="76">
                    </div>
                    <div>
                        <label>SpO2 (%)</label>
                        <input type="number" step="0.1" id="cpSpo2" value="99.0">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>BP Systolic</label>
                        <input type="number" id="cpBps" value="120">
                    </div>
                    <div>
                        <label>BP Diastolic</label>
                        <input type="number" id="cpBpd" value="80">
                    </div>
                </div>
            </fieldset>

            <div style="margin-top:8px;">
                <label>Completion Notes</label>
                <input type="text" id="cpNotes" value="Transfusion completed uneventfully. Bag disposed per biohazard protocol." placeholder="Notes">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="cpCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="cpSave">Finalize &amp; Complete Transfusion</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Complete Transfusion Infusion</h3>
                <button type="button" class="bb-close" id="cpClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#cpClose").onclick = close;
    ov.querySelector("#cpCancel").onclick = close;

    ov.querySelector("#cpSave").onclick = async () => {
        const payload = {
            transfusion_id: transfusionId,
            infusion_completed_at: ov.querySelector("#cpTime").value.replace("T", " "),
            volume_transfused_ml: Number(ov.querySelector("#cpVol").value),
            temperature_c: Number(ov.querySelector("#cpTemp").value),
            heart_rate_bpm: Number(ov.querySelector("#cpHr").value),
            bp_systolic: Number(ov.querySelector("#cpBps").value),
            bp_diastolic: Number(ov.querySelector("#cpBpd").value),
            spo2_percent: Number(ov.querySelector("#cpSpo2").value),
            completion_notes: ov.querySelector("#cpNotes").value.trim()
        };

        const res = await api("/blood-bank/transfusions/complete", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to complete transfusion.", "error");
        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

/**
 * Report Adverse Transfusion Reaction (STAT Emergency Protocol)
 */
function openReportReactionModal(transfusionId = 0) {
    const html = `
        <div class="bb-modal-body">
            <div style="background:#fee2e2;border:1px solid #f87171;padding:8px 10px;border-radius:6px;font-size:12.5px;color:#991b1b;margin-bottom:8px;">
                <b>🚨 STAT EMERGENCY PROTOCOL:</b> Immediately stop the blood transfusion! Keep the IV line open with normal saline. Notify the attending physician and blood bank stat.
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Transfusion ID *</label>
                    <input type="number" id="rxTxId" value="${transfusionId > 0 ? transfusionId : 1}" required>
                </div>
                <div>
                    <label>Approx. Volume Transfused at Onset (mL) *</label>
                    <input type="number" id="rxMl" value="40" required>
                </div>
            </div>

            <fieldset style="margin-top:8px;border-color:#dc2626;">
                <legend style="color:#dc2626;font-weight:700;">Bedside Clinical Symptoms (Select All That Apply)</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symFever" checked> Fever (Temp ≥ 38°C or ≥1°C rise)</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symChills" checked> Chills / Rigors</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symDyspnea"> Dyspnea / Acute Hypoxia (TRALI / TACO)</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symHypo"> Tachycardia &amp; Hypotension (Shock)</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symHyper"> Hypertension &amp; JVD (TACO overload)</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symHives"> Urticaria / Pruritus / Rash</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symStridor"> Facial Edema / Stridor / Wheeze</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symFlank"> Back / Flank Pain (Acute Hemolysis)</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symDarkUrine"> Dark Urine / Hemoglobinuria (AHTR)</label>
                    <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="symNausea"> Nausea / Vomiting</label>
                </div>
                <div style="margin-top:6px;">
                    <label>Clinical Description / Timing</label>
                    <input type="text" id="rxSympNotes" value="Patient developed sudden shaking chills and temperature rise 20 mins into infusion." placeholder="Clinical details">
                </div>
            </fieldset>

            <fieldset style="margin-top:8px;">
                <legend>Reaction Vitals at Onset</legend>
                <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
                    <div><label>Temp (°C)</label><input type="number" step="0.1" id="rxTemp" value="38.8"></div>
                    <div><label>Heart Rate</label><input type="number" id="rxHr" value="115"></div>
                    <div><label>BP Systolic</label><input type="number" id="rxBps" value="130"></div>
                    <div><label>SpO2 (%)</label><input type="number" step="0.1" id="rxSpo2" value="93.0"></div>
                </div>
            </fieldset>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                <div>
                    <label>Preliminary Reaction Suspected *</label>
                    <select id="rxClass">
                        <option value="febrile_non_hemolytic">Febrile Non-Hemolytic (FNHTR)</option>
                        <option value="acute_hemolytic">Acute Hemolytic Transfusion Reaction (AHTR)</option>
                        <option value="trali">TRALI (Transfusion-Related Acute Lung Injury)</option>
                        <option value="taco">TACO (Transfusion-Associated Circulatory Overload)</option>
                        <option value="anaphylactic_severe">Severe Anaphylaxis / Angioedema</option>
                        <option value="mild_allergic_urticarial">Mild Allergic / Urticarial</option>
                        <option value="sepsis_bacterial">Transfusion-Transmitted Sepsis (TTBI)</option>
                    </select>
                </div>
                <div>
                    <label>Severity Level *</label>
                    <select id="rxSev">
                        <option value="moderate">Moderate</option>
                        <option value="mild">Mild</option>
                        <option value="severe">Severe</option>
                        <option value="life_threatening">Life-Threatening</option>
                    </select>
                </div>
            </div>

            <div style="margin-top:6px;">
                <label>Emergency Bedside Medications Administered</label>
                <input type="text" id="rxMeds" value="Infusion stopped. Normal Saline TKVO. Hydrocortisone 100mg IV, Diphenhydramine 50mg IV given." placeholder="Medications...">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="rxCancel">Cancel</button>
                <button type="button" class="bb-btn" id="rxSave" style="background:#dc2626;color:#fff;border-color:#dc2626;">Submit STAT Reaction Report</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3 style="color:#b91c1c;">🚨 Transfusion Adverse Reaction Emergency Report</h3>
                <button type="button" class="bb-close" id="rxClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#rxClose").onclick = close;
    ov.querySelector("#rxCancel").onclick = close;

    ov.querySelector("#rxSave").onclick = async () => {
        const payload = {
            transfusion_id: Number(ov.querySelector("#rxTxId").value),
            ml_transfused_at_onset: Number(ov.querySelector("#rxMl").value),
            symptom_fever: ov.querySelector("#symFever").checked ? 1 : 0,
            symptom_chills_rigors: ov.querySelector("#symChills").checked ? 1 : 0,
            symptom_dyspnea_hypoxia: ov.querySelector("#symDyspnea").checked ? 1 : 0,
            symptom_tachycardia_hypotension: ov.querySelector("#symHypo").checked ? 1 : 0,
            symptom_hypertension: ov.querySelector("#symHyper").checked ? 1 : 0,
            symptom_urticaria_hives: ov.querySelector("#symHives").checked ? 1 : 0,
            symptom_facial_edema_stridor: ov.querySelector("#symStridor").checked ? 1 : 0,
            symptom_back_flank_pain: ov.querySelector("#symFlank").checked ? 1 : 0,
            symptom_hemoglobinuria_dark_urine: ov.querySelector("#symDarkUrine").checked ? 1 : 0,
            symptom_nausea_vomiting: ov.querySelector("#symNausea").checked ? 1 : 0,
            symptom_details: ov.querySelector("#rxSympNotes").value.trim(),
            temperature_c: Number(ov.querySelector("#rxTemp").value),
            heart_rate_bpm: Number(ov.querySelector("#rxHr").value),
            bp_systolic: Number(ov.querySelector("#rxBps").value),
            spo2_percent: Number(ov.querySelector("#rxSpo2").value),
            reaction_classification: ov.querySelector("#rxClass").value,
            severity_level: ov.querySelector("#rxSev").value,
            emergency_medications_given: ov.querySelector("#rxMeds").value.trim()
        };

        const res = await api("/blood-bank/transfusions/report-reaction", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to log reaction.", "error");
        showToast(res.message, "error", 10000);
        close();
        load();
    };
}

/**
 * View Transfusion Chart & Complete Vitals History Drawer / Modal
 */
async function openTransfusionVitalsHistoryModal(transfusionId) {
    const res = await api(`/blood-bank/transfusions/detail?id=${transfusionId}`).catch(() => null);
    if (!res?.success) return showToast("Could not load transfusion details.", "error");

    const tx = res.data;
    const vitals = tx.vitals || [];

    const vitalsTable = vitals.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">
            <thead>
                <tr style="background:var(--bg-muted, #f1f5f9);text-align:left;border-bottom:1px solid var(--border-color);">
                    <th style="padding:6px;">Stage</th>
                    <th style="padding:6px;">Time</th>
                    <th style="padding:6px;">Temp</th>
                    <th style="padding:6px;">HR</th>
                    <th style="padding:6px;">BP</th>
                    <th style="padding:6px;">SpO2</th>
                    <th style="padding:6px;">Symptoms / Remarks</th>
                    <th style="padding:6px;">Nurse</th>
                </tr>
            </thead>
            <tbody>
                ${vitals.map(v => `
                    <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:6px;"><span class="bb-badge">${esc(v.vital_stage.replace("_", " "))}</span></td>
                        <td style="padding:6px;font-size:11px;" class="bb-muted">${esc(v.recorded_at)}</td>
                        <td style="padding:6px;font-weight:700;color:${Number(v.temperature_c) >= 38 ? "#dc2626" : "#059669"}">${v.temperature_c}°C</td>
                        <td style="padding:6px;">${v.heart_rate_bpm} bpm</td>
                        <td style="padding:6px;">${v.bp_systolic}/${v.bp_diastolic}</td>
                        <td style="padding:6px;font-weight:700;color:${Number(v.spo2_percent) < 94 ? "#dc2626" : "inherit"}">${v.spo2_percent}%</td>
                        <td style="padding:6px;font-size:11.5px;">${esc(v.patient_symptoms || "—")}</td>
                        <td style="padding:6px;font-size:11px;">${esc(v.recorded_by_nurse)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    ` : `<div class="bb-empty" style="margin-top:10px;">No vital checks logged yet.</div>`;

    const html = `
        <div class="bb-modal-body">
            <div style="background:var(--bg-muted, #f8fafc);padding:10px;border-radius:8px;font-size:12.5px;">
                <div style="display:flex;justify-content:space-between;">
                    <div>
                        <b>Patient:</b> ${esc(tx.patient_name)} (${esc(tx.patient_mrn)}) · Blood Group: <b>${esc(tx.patient_blood_type)}</b>
                    </div>
                    <div>
                        <b>Transfusion #:</b> <span style="font-family:monospace;color:#2563eb;font-weight:700;">${esc(tx.transfusion_number)}</span>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;">
                    <div>
                        <b>Blood Unit:</b> ${esc(tx.donor_unit_number)} (${esc(tx.component_type?.toUpperCase())} · Group ${esc(tx.donor_abo_group)}${tx.donor_rh_factor === "positive" ? "+" : "-"})
                    </div>
                    <div>
                        Status: <span class="bb-badge">${esc(tx.status.toUpperCase())}</span>
                    </div>
                </div>
            </div>

            <h4 style="margin:12px 0 4px;font-size:14px;">Chronological Bedside Vitals Monitoring Chart</h4>
            ${vitalsTable}

            ${tx.reaction ? `
                <div style="background:#fee2e2;border:1px solid #f87171;padding:8px 10px;border-radius:6px;font-size:12px;margin-top:12px;color:#991b1b;">
                    <b>🚨 Transfusion Reaction Recorded:</b> Report #${esc(tx.reaction.reaction_number)} · Severity: <b>${esc(tx.reaction.severity_level.toUpperCase())}</b> · Suspected: <b>${esc(tx.reaction.reaction_classification)}</b>
                </div>
            ` : ""}

            <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                <button type="button" class="bb-btn" id="vhCloseBtn">Close</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal" style="max-width:850px;">
            <div class="bb-modal-head">
                <h3>Transfusion Administration Record &amp; Vitals Chart</h3>
                <button type="button" class="bb-close" id="vhClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#vhClose").onclick = close;
    ov.querySelector("#vhCloseBtn").onclick = close;
}

/**
 * Pathologist Transfusion Reaction Investigation Sign-Off Modal
 */
function openPathologistInvestigationModal(reactionId) {
    const html = `
        <div class="bb-modal-body">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:8px 10px;border-radius:6px;font-size:12px;color:#1e40af;margin-bottom:8px;">
                <b>Laboratory Transfusion Reaction Investigation Protocol:</b> Repeat clerical check, direct antiglobulin test (Coombs), repeat ABO/Rh typing, free hemoglobin in post-reaction serum and urine, and culture of returned bag.
            </div>

            <fieldset>
                <legend>Laboratory Diagnostic Findings</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <div>
                        <label>Clerical Check Match *</label>
                        <select id="pClerical">
                            <option value="match_confirmed">Match Confirmed (All wristband & bag tags match)</option>
                            <option value="clerical_mismatch_detected">CLERICAL ERROR DETECTED (Mismatched tags)</option>
                        </select>
                    </div>
                    <div>
                        <label>Visual Check Post-Reaction Sample *</label>
                        <select id="pVisual">
                            <option value="clear_negative">Clear / Normal (No free Hb)</option>
                            <option value="pink_red_hemolysis">Pink / Red (Intravascular Hemolysis)</option>
                            <option value="icteric">Icteric (Hyperbilirubinemia)</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>Direct Antiglobulin Test (DAT / Coombs) *</label>
                        <select id="pDat">
                            <option value="negative">Negative (0)</option>
                            <option value="positive_1plus">Positive (+1)</option>
                            <option value="positive_2plus">Positive (+2)</option>
                            <option value="positive_3plus">Positive (+3)</option>
                            <option value="positive_4plus">Positive (+4)</option>
                        </select>
                    </div>
                    <div>
                        <label>Repeat ABO/Rh Typing *</label>
                        <select id="pAboRepeat">
                            <option value="match_confirmed">Match Confirmed (No ABO discrepancy)</option>
                            <option value="discrepancy_found">DISCREPANCY FOUND (ABO Mismatch)</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>Blood Bag Gram Stain *</label>
                        <select id="pGram">
                            <option value="no_organisms">No Organisms Seen</option>
                            <option value="gram_negative">Gram-Negative Bacilli (Endotoxin risk)</option>
                            <option value="gram_positive">Gram-Positive Cocci</option>
                        </select>
                    </div>
                    <div>
                        <label>Free Hemoglobin in Urine *</label>
                        <select id="pUrineHb">
                            <option value="negative">Negative</option>
                            <option value="trace">Trace</option>
                            <option value="moderate">Moderate</option>
                            <option value="gross">Gross Hemoglobinuria</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                <div>
                    <label>Definitive Pathologist Classification *</label>
                    <select id="pClass" required>
                        <option value="febrile_non_hemolytic">Febrile Non-Hemolytic Reaction (FNHTR)</option>
                        <option value="acute_hemolytic">Acute Hemolytic Transfusion Reaction (AHTR)</option>
                        <option value="trali">TRALI (Transfusion-Related Acute Lung Injury)</option>
                        <option value="taco">TACO (Transfusion-Associated Circulatory Overload)</option>
                        <option value="anaphylactic_severe">Severe Anaphylaxis</option>
                        <option value="mild_allergic_urticarial">Mild Allergic / Urticarial</option>
                        <option value="sepsis_bacterial">Bacterial Sepsis / Contamination (TTBI)</option>
                        <option value="delayed_hemolytic">Delayed Hemolytic (DHTR)</option>
                        <option value="unrelated_other">Unrelated Adverse Event</option>
                    </select>
                </div>
                <div>
                    <label>Severity Level *</label>
                    <select id="pSev">
                        <option value="moderate">Moderate</option>
                        <option value="mild">Mild</option>
                        <option value="severe">Severe</option>
                        <option value="life_threatening">Life-Threatening</option>
                        <option value="fatal">Fatal</option>
                    </select>
                </div>
            </div>

            <div style="margin-top:6px;">
                <label>Pathologist Evaluation Notes & Transfusion Committee Recommendations *</label>
                <input type="text" id="pNotes" value="DAT negative, repeat typing verified match. Intravascular hemolysis ruled out. Probable FNHTR. Leukoreduced PRBC recommended for subsequent transfusions." required>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>Pathologist / Evaluator Name *</label>
                    <input type="text" id="pEval" value="Dr. Elizabeth Warren, MD, FPSP (Pathologist)" required>
                </div>
                <div>
                    <label>Investigation Status *</label>
                    <select id="pInvStatus">
                        <option value="final_closed">Final Closed (Sign-Off Complete)</option>
                        <option value="preliminary_complete">Preliminary Complete (Culture Pending)</option>
                    </select>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="pCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="pSave">Complete Pathologist Sign-Off</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Pathologist Transfusion Reaction Investigation Sign-Off</h3>
                <button type="button" class="bb-close" id="pClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#pClose").onclick = close;
    ov.querySelector("#pCancel").onclick = close;

    ov.querySelector("#pSave").onclick = async () => {
        const payload = {
            reaction_id: reactionId,
            investigation_status: ov.querySelector("#pInvStatus").value,
            clerical_check_match: ov.querySelector("#pClerical").value,
            visual_hemolysis_post_sample: ov.querySelector("#pVisual").value,
            direct_antiglobulin_test_dat: ov.querySelector("#pDat").value,
            repeat_abo_rh_match: ov.querySelector("#pAboRepeat").value,
            blood_bag_gram_stain: ov.querySelector("#pGram").value,
            free_hemoglobin_in_urine: ov.querySelector("#pUrineHb").value,
            reaction_classification: ov.querySelector("#pClass").value,
            severity_level: ov.querySelector("#pSev").value,
            pathologist_notes: ov.querySelector("#pNotes").value.trim(),
            pathologist_evaluator: ov.querySelector("#pEval").value.trim()
        };

        const res = await api("/blood-bank/transfusion-reactions/investigate", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to sign off investigation.", "error");
        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

function openLogTempModal(locations) {
    const html = `
        <div class="bb-modal-body">
            <div>
                <label>Storage Equipment Unit *</label>
                <select id="tLoc" required>
                    ${locations.map(l => `<option value="${l.id}">${esc(l.name)} (Standard: ${l.min_temp_c}°C to ${l.max_temp_c}°C)</option>`).join("")}
                </select>
            </div>

            <div style="margin-top:8px;">
                <label>Recorded Temperature (°C) *</label>
                <input type="number" step="0.1" id="tVal" required placeholder="e.g. 4.0 or -22.5">
            </div>

            <div style="margin-top:8px;">
                <label>Verification Notes</label>
                <input type="text" id="tNotes" placeholder="e.g. Morning shift calibration check">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="bb-btn" id="tCancel">Cancel</button>
                <button type="button" class="bb-btn blue" id="tSave">Log & Verify Temperature</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "bb-modal-ov";
    ov.innerHTML = `
        <div class="bb-modal">
            <div class="bb-modal-head">
                <h3>Log Cold-Chain Temperature Check</h3>
                <button type="button" class="bb-close" id="tClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#tClose").onclick = close;
    ov.querySelector("#tCancel").onclick = close;

    ov.querySelector("#tSave").onclick = async () => {
        const payload = {
            storage_location_id: Number(ov.querySelector("#tLoc").value),
            recorded_temp_c: Number(ov.querySelector("#tVal").value),
            notes: ov.querySelector("#tNotes").value.trim()
        };

        const res = await api("/blood-bank/cold-chain/log-temp", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to log temperature", "error");
        showToast(res.message, res.is_in_range ? "success" : "error", 8000);
        close();
        load();
    };
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

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>Birthdate *</label>
                    <input type="date" id="bbBd" value="${esc(d.birthdate || "")}" required>
                </div>
                <div>
                    <label>Gender *</label>
                    <select id="bbGen" required>
                        <option value="male" ${d.gender === "male" ? "selected" : ""}>Male</option>
                        <option value="female" ${d.gender === "female" ? "selected" : ""}>Female</option>
                    </select>
                </div>
                <div>
                    <label>Phone *</label>
                    <input type="text" id="bbPhone" value="${esc(d.phone || "")}" placeholder="09xxxxxxxxx" required>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                    <label>ABO Group *</label>
                    <select id="bbAbo" required>
                        <option value="O" ${d.abo_group === "O" ? "selected" : ""}>Group O</option>
                        <option value="A" ${d.abo_group === "A" ? "selected" : ""}>Group A</option>
                        <option value="B" ${d.abo_group === "B" ? "selected" : ""}>Group B</option>
                        <option value="AB" ${d.abo_group === "AB" ? "selected" : ""}>Group AB</option>
                    </select>
                </div>
                <div>
                    <label>Rh Factor *</label>
                    <select id="bbRh" required>
                        <option value="positive" ${d.rh_factor === "positive" ? "selected" : ""}>Rh Positive (+)</option>
                        <option value="negative" ${d.rh_factor === "negative" ? "selected" : ""}>Rh Negative (-)</option>
                    </select>
                </div>
            </div>

            <fieldset>
                <legend>Donor Physical & Vitals (Eligibility Screening)</legend>
                <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;">
                    <div>
                        <label>Weight (kg) *</label>
                        <input type="number" step="0.5" id="bbWt" value="${d.weight_kg || 60}" required title="Min 50 kg for whole blood donation">
                    </div>
                    <div>
                        <label>Hemoglobin (g/dL) *</label>
                        <input type="number" step="0.1" id="bbHb" value="${d.hemoglobin_g_dl || 14.5}" required title="Min 12.5 g/dL (Female), 13.0 g/dL (Male)">
                    </div>
                    <div>
                        <label>Systolic BP</label>
                        <input type="number" id="bbBps" value="${d.blood_pressure_systolic || 120}" placeholder="90-140">
                    </div>
                    <div>
                        <label>Diastolic BP</label>
                        <input type="number" id="bbBpd" value="${d.blood_pressure_diastolic || 80}" placeholder="60-90">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>Pulse Rate (bpm)</label>
                        <input type="number" id="bbPulse" value="${d.pulse_rate || 75}" placeholder="50-100">
                    </div>
                    <div>
                        <label>Temperature (°C)</label>
                        <input type="number" step="0.1" id="bbTemp" value="${d.temperature_c || 36.6}" placeholder="≤ 37.5°C">
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Transfusion-Transmissible Infections (TTI) Serological Screen</legend>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                    <div>
                        <label>HIV 1/2 Screen</label>
                        <select id="bbHiv">
                            <option value="non_reactive" ${d.hiv_screen === "non_reactive" ? "selected" : ""}>Non-Reactive (Negative)</option>
                            <option value="reactive" ${d.hiv_screen === "reactive" ? "selected" : ""}>REACTIVE (Positive)</option>
                            <option value="pending" ${d.hiv_screen === "pending" ? "selected" : ""}>Pending</option>
                        </select>
                    </div>
                    <div>
                        <label>HBsAg (Hepatitis B)</label>
                        <select id="bbHbv">
                            <option value="non_reactive" ${d.hbv_screen === "non_reactive" ? "selected" : ""}>Non-Reactive (Negative)</option>
                            <option value="reactive" ${d.hbv_screen === "reactive" ? "selected" : ""}>REACTIVE (Positive)</option>
                            <option value="pending" ${d.hbv_screen === "pending" ? "selected" : ""}>Pending</option>
                        </select>
                    </div>
                    <div>
                        <label>Anti-HCV (Hepatitis C)</label>
                        <select id="bbHcv">
                            <option value="non_reactive" ${d.hcv_screen === "non_reactive" ? "selected" : ""}>Non-Reactive (Negative)</option>
                            <option value="reactive" ${d.hcv_screen === "reactive" ? "selected" : ""}>REACTIVE (Positive)</option>
                            <option value="pending" ${d.hcv_screen === "pending" ? "selected" : ""}>Pending</option>
                        </select>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                    <div>
                        <label>Syphilis (VDRL / RPR)</label>
                        <select id="bbSyph">
                            <option value="non_reactive" ${d.syphilis_screen === "non_reactive" ? "selected" : ""}>Non-Reactive (Negative)</option>
                            <option value="reactive" ${d.syphilis_screen === "reactive" ? "selected" : ""}>REACTIVE (Positive)</option>
                            <option value="pending" ${d.syphilis_screen === "pending" ? "selected" : ""}>Pending</option>
                        </select>
                    </div>
                    <div>
                        <label>Malaria Rapid / Smear</label>
                        <select id="bbMal">
                            <option value="non_reactive" ${d.malaria_screen === "non_reactive" ? "selected" : ""}>Non-Reactive (Negative)</option>
                            <option value="reactive" ${d.malaria_screen === "reactive" ? "selected" : ""}>REACTIVE (Positive)</option>
                            <option value="pending" ${d.malaria_screen === "pending" ? "selected" : ""}>Pending</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Risk Questionnaire (Deferral Screening)</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
                    <label><input type="checkbox" id="bbTat" ${d.has_recent_tattoo_piercing ? "checked" : ""}> Tattoo / Piercing in past 12 mos</label>
                    <label><input type="checkbox" id="bbTrav" ${d.has_recent_travel_malaria ? "checked" : ""}> Travel to malaria-endemic area</label>
                    <label><input type="checkbox" id="bbExp" ${d.has_high_risk_exposure ? "checked" : ""}> High-risk sexual or blood exposure</label>
                    <label><input type="checkbox" id="bbIll" ${d.has_recent_illness ? "checked" : ""}> Recent acute fever / flu / infection</label>
                </div>
                <div style="margin-top:6px;">
                    <label>Screening Notes</label>
                    <input type="text" id="bbQnotes" value="${esc(d.questionnaire_notes || "")}" placeholder="Questionnaire details or physician remarks">
                </div>
            </fieldset>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button type="button" class="bb-btn" id="bbCancelBtn">Cancel</button>
                <button type="button" class="bb-btn blue" id="bbSaveBtn">Save &amp; Evaluate Eligibility</button>
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
        .bb-nav-tabs { display: flex; gap: 6px; border-bottom: 2px solid var(--border-color); margin-bottom: 14px; overflow-x: auto; }
        .bb-tab-btn { border: none; background: none; padding: 8px 16px; font: inherit; font-size: 13px; font-weight: 700; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; }
        .bb-tab-btn.active { color: #b91c1c; border-bottom-color: #b91c1c; }
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
        .bb-modal { background: var(--bg-surface, #fff); border-radius: 12px; width: 100%; max-width: 740px; max-height: 90vh; overflow-y: auto; padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .bb-modal-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px; }
        .bb-modal-head h3 { margin: 0; font-size: 17px; }
        .bb-close { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-muted); }
        .bb-modal-body label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 2px; }
        .bb-modal-body input[type=text], .bb-modal-body input[type=date], .bb-modal-body input[type=number], .bb-modal-body input[type=datetime-local], .bb-modal-body select { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
        .bb-modal-body fieldset { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-top: 8px; }
        .bb-modal-body legend { font-weight: 700; font-size: 12.5px; padding: 0 4px; }
    `;
    document.head.appendChild(style);
}
