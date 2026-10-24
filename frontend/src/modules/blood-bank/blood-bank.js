import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = {
    view: "inventory", // "inventory" | "crossmatches" | "cold_chain" | "donors"
    component_type: "",
    abo_group: "",
    rh_factor: "",
    status: "",
    eligibility_status: "",
    reservation_status: "",
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
    const isCold = state.view === "cold_chain";
    const isDonors = state.view === "donors";

    const s = data.stats || {};
    const tab = (v, l) => `<button type="button" class="bb-tab-btn ${state.view === v ? "active" : ""}" data-bb-view="${v}">${l}</button>`;

    root.innerHTML = `
        <div class="bb-head">
            <div>
                <h1>Blood Bank Management & Transfusion Services</h1>
                <div class="bb-sub">Inventory units, Major/Minor crossmatch testing with 48-hour reservation holds, cold-chain preservation, and donor registry.</div>
            </div>
            <div style="display:flex;gap:8px;">
                ${isInv ? `<button type="button" class="bb-btn blue" id="bbAddUnitBtn">+ Receive Blood Unit</button>` : ""}
                ${isXm ? `<button type="button" class="bb-btn blue" id="bbNewCrossmatchBtn">🔬 Crossmatch & 48h Hold</button>` : ""}
                ${isCold ? `<button type="button" class="bb-btn blue" id="bbLogTempBtn">🌡️ Log Temperature Check</button>` : ""}
                ${isDonors ? `<button type="button" class="bb-btn blue" id="bbRegisterDonorBtn">+ Register Blood Donor</button>` : ""}
            </div>
        </div>

        <div class="bb-nav-tabs">
            ${tab("inventory", "Blood Inventory Units")}
            ${tab("crossmatches", "Crossmatch & 48h Holds")}
            ${tab("cold_chain", "Cold-Chain & Storage Units")}
            ${tab("donors", "Blood Donor Registry")}
        </div>

        ${isInv ? renderInventoryKpi(s) : isXm ? renderCrossmatchKpi(s) : isCold ? renderColdChainKpi(data.locations) : renderDonorsKpi(s)}

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

            ${!isCold && !isXm ? `
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

            <input type="search" id="bbSearch" value="${esc(state.q)}" placeholder="${isInv ? "Search unit DIN, shelf, donor, or patient..." : isXm ? "Search crossmatch XM#, unit, or patient..." : isCold ? "Search storage unit..." : "Search donor number, name, or phone..."}">
        </div>

        ${isInv ? renderInventoryList(data.units) : isXm ? renderCrossmatchesList(data.crossmatches) : isCold ? renderColdChainList(data.locations) : renderDonorsList(data.donors)}
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
    if (root.querySelector("#bbLogTempBtn")) root.querySelector("#bbLogTempBtn").onclick = () => openLogTempModal(data.locations);
    if (root.querySelector("#bbRegisterDonorBtn")) root.querySelector("#bbRegisterDonorBtn").onclick = () => openDonorModal();

    if (root.querySelector("#bbFilterComp")) root.querySelector("#bbFilterComp").onchange = (e) => { state.component_type = e.target.value; load(); };
    if (root.querySelector("#bbFilterUnitStatus")) root.querySelector("#bbFilterUnitStatus").onchange = (e) => { state.status = e.target.value; load(); };
    if (root.querySelector("#bbFilterXmStatus")) root.querySelector("#bbFilterXmStatus").onchange = (e) => { state.reservation_status = e.target.value; load(); };
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
            <div class="${s.expiring_within_12h ? "warn" : ""}"><b>${s.expiring_within_12h || 0}</b>Expiring &lt;12 Hours</div>
            <div><b>${s.issued_today || 0}</b>Units Issued Today</div>
        </div>
    `;
}

function renderColdChainKpi(locs) {
    return `
        <div class="bb-counts">
            <div><b>${locs.length}</b>Active Storage Units</div>
            <div class="good"><b>4°C</b>PRBC Fridge Standard</div>
            <div class="good"><b>-30°C</b>Plasma Freezer Standard</div>
            <div class="good"><b>22°C</b>Platelet Agitator Standard</div>
        </div>
    `;
}

function renderDonorsKpi(s) {
    return `
        <div class="bb-counts">
            <div><b>${s.total_registered || 0}</b>Total Donors</div>
            <div class="good"><b>${s.eligible_donors || 0}</b>Eligible Donors</div>
            <div class="${s.temporary_deferred ? "warn" : ""}"><b>${s.temporary_deferred || 0}</b>Temporarily Deferred</div>
            <div class="${s.permanently_deferred ? "bad" : ""}"><b>${s.permanently_deferred || 0}</b>Permanently Deferred</div>
            <div><b>${s.pending_screening || 0}</b>Pending Screening</div>
        </div>
    `;
}

function renderInventoryList(units) {
    if (!units.length) {
        return `<div class="bb-empty">No blood units match the active inventory filters.</div>`;
    }
    return `<div class="bb-list">${units.map(unitCard).join("")}</div>`;
}

function renderCrossmatchesList(list) {
    if (!list.length) {
        return `<div class="bb-empty">No crossmatch records found.</div>`;
    }
    return `<div class="bb-list">${list.map(crossmatchCard).join("")}</div>`;
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
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <div>
                                <h4 style="margin:0 0 2px 0;font-size:15px;">${esc(loc.name)}</h4>
                                <div class="bb-muted" style="font-size:12px;">${esc(loc.location_description || "Blood Bank Suite")}</div>
                            </div>
                            <span class="bb-badge ${inRange ? "good" : "bad"}">${inRange ? "NORMAL" : "ALARM"}</span>
                        </div>

                        <div style="text-align:center;padding:16px 0;">
                            <div style="font-size:32px;font-weight:800;color:${inRange ? "#059669" : "#dc2626"};">${cur.toFixed(1)}°C</div>
                            <div class="bb-muted" style="font-size:12px;">Target Range: <b>${min}°C to ${max}°C</b></div>
                        </div>

                        <div class="bb-muted" style="font-size:11px;border-top:1px solid var(--border-color);padding-top:6px;">
                            Last Checked: <b>${esc(loc.last_temp_check_at || "Never")}</b>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderDonorsList(donors) {
    if (!donors.length) return `<div class="bb-empty">No blood donors match the active filters.</div>`;
    return `<div class="bb-list">${donors.map(donorCard).join("")}</div>`;
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
        .bb-nav-tabs { display: flex; gap: 6px; border-bottom: 2px solid var(--border-color); margin-bottom: 14px; }
        .bb-tab-btn { border: none; background: none; padding: 8px 16px; font: inherit; font-size: 13px; font-weight: 700; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
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
        .bb-modal { background: var(--bg-surface, #fff); border-radius: 12px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
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
