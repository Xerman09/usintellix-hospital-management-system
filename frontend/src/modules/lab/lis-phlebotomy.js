import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { esc, when, waited, tube, modal } from "./lab-ui.js?v=5";
import { code128Svg } from "./barcode.js?v=3";

/*
 * LIS Phlebotomy Collection & Barcode Tube Labeling (Module 14, lis_specimen_collections)
 * Tracks bedside draw time, tube colors (Lavender EDTA, SST Gold, Light Blue Citrate, Red, etc.),
 * life-cycle draw statuses (Pending Draw, Collected, In Transit, Received in Lab, Hemolyzed / Rejected),
 * and thermal barcode sticker generation.
 */

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

let ctx = null; // { root, data, reload }

const TUBE_PALETTE = {
    "Lavender EDTA": { cap: "#a855f7", bg: "#faf5ff", border: "#e9d5ff" },
    "SST Gold": { cap: "#eab308", bg: "#fefce8", border: "#fef08a" },
    "Light Blue Citrate": { cap: "#38bdf8", bg: "#f0f9ff", border: "#bae6fd" },
    "Green Heparin": { cap: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    "Red Plain": { cap: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    "Grey Fluoride": { cap: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb" },
    "Blood Culture": { cap: "#475569", bg: "#f8fafc", border: "#cbd5e1" },
    "Yellow ACD": { cap: "#fde047", bg: "#fefce8", border: "#fef08a" },
    "Urine Cup": { cap: "#ca8a04", bg: "#fffbeb", border: "#fde68a" },
    "Swab / VTM": { cap: "#f97316", bg: "#fff7ed", border: "#ffedd5" }
};

const STATUS_CONFIG = {
    "Pending Draw": { color: "#d97706", bg: "#fffbeb", icon: "⏳" },
    "Collected": { color: "#2563eb", bg: "#eff6ff", icon: "💉" },
    "In Transit": { color: "#7c3aed", bg: "#f5f3ff", icon: "🚚" },
    "Received in Lab": { color: "#16a34a", bg: "#f0fdf4", icon: "🔬" },
    "Hemolyzed / Rejected": { color: "#dc2626", bg: "#fef2f2", icon: "⚠️" }
};

/** Load specimen collections and stats */
export async function loadPhlebotomy(root, state, reload) {
    const q = new URLSearchParams({
        ...(state.draw_status ? { draw_status: state.draw_status } : {}),
        ...(state.tube_color ? { tube_color: state.tube_color } : {}),
        ...(state.q ? { search: state.q } : {})
    });

    const [specimensRes, statsRes] = await Promise.all([
        api(`/lab/specimen-collections?${q}`).catch(() => null),
        api("/lab/specimen-collections/stats").catch(() => null)
    ]);

    if (!specimensRes?.success) {
        return { error: specimensRes?.message || "Could not load phlebotomy collections." };
    }

    const payload = {
        specimens: specimensRes.data || [],
        stats: statsRes?.data || {
            total_specimens: 0, pending_draw: 0, collected: 0,
            in_transit: 0, received_in_lab: 0, hemolyzed_rejected: 0, today_draws: 0
        },
        state
    };

    ctx = { root, data: payload, reload };
    return payload;
}

/** Render phlebotomy collection list and toolbar */
export function phlebotomyHtml(d) {
    const s = d.stats;
    const filterStatus = d.state.draw_status || "";
    const filterTube = d.state.tube_color || "";

    const statusPill = (val, label, count) => `
        <button type="button" class="lab-b sm ${filterStatus === val ? "blue" : ""}" data-phleb-status="${val}">
            ${esc(label)} ${count !== undefined ? `<b>(${count})</b>` : ""}
        </button>
    `;

    return `
        <!-- KPI Summary Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin-bottom:14px;">
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #d97706;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Pending Draw</div>
                <div style="font-size:22px; font-weight:800; color:#d97706; margin-top:2px;">${s.pending_draw}</div>
                <div style="font-size:11px; color:var(--text-muted);">Awaiting phlebotomy</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #2563eb;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Collected</div>
                <div style="font-size:22px; font-weight:800; color:#2563eb; margin-top:2px;">${s.collected}</div>
                <div style="font-size:11px; color:var(--text-muted);">Drawn at bedside</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #7c3aed;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">In Transit</div>
                <div style="font-size:22px; font-weight:800; color:#7c3aed; margin-top:2px;">${s.in_transit}</div>
                <div style="font-size:11px; color:var(--text-muted);">En route to Central Lab</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #16a34a;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Received in Lab</div>
                <div style="font-size:22px; font-weight:800; color:#16a34a; margin-top:2px;">${s.received_in_lab}</div>
                <div style="font-size:11px; color:var(--text-muted);">Accepted by MedTech</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #dc2626;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Hemolyzed / Rejected</div>
                <div style="font-size:22px; font-weight:800; color:#dc2626; margin-top:2px;">${s.hemolyzed_rejected}</div>
                <div style="font-size:11px; color:var(--text-muted);">Recollection required</div>
            </div>
        </div>

        <!-- Filter and Action Bar -->
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-right:4px;">Filter Draw:</span>
                ${statusPill("", "All", s.total_specimens)}
                ${statusPill("Pending Draw", "Pending Draw", s.pending_draw)}
                ${statusPill("Collected", "Collected", s.collected)}
                ${statusPill("In Transit", "In Transit", s.in_transit)}
                ${statusPill("Received in Lab", "Received", s.received_in_lab)}
                ${statusPill("Hemolyzed / Rejected", "Rejected", s.hemolyzed_rejected)}
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <select id="phlebTubeFilter" style="border:1px solid var(--border-color); border-radius:8px; padding:6px 10px; font-size:12.5px; background:var(--bg-surface); color:var(--text-primary);">
                    <option value="">All Tube Colors</option>
                    <option value="Lavender EDTA" ${filterTube === "Lavender EDTA" ? "selected" : ""}>Lavender EDTA (Hematology)</option>
                    <option value="SST Gold" ${filterTube === "SST Gold" ? "selected" : ""}>SST Gold (Chemistry)</option>
                    <option value="Light Blue Citrate" ${filterTube === "Light Blue Citrate" ? "selected" : ""}>Light Blue (Coagulation)</option>
                    <option value="Green Heparin" ${filterTube === "Green Heparin" ? "selected" : ""}>Green Heparin (STAT)</option>
                    <option value="Red Plain" ${filterTube === "Red Plain" ? "selected" : ""}>Red Plain (Serology / TDM)</option>
                    <option value="Grey Fluoride" ${filterTube === "Grey Fluoride" ? "selected" : ""}>Grey Fluoride (Glucose)</option>
                    <option value="Blood Culture" ${filterTube === "Blood Culture" ? "selected" : ""}>Blood Culture Bottles</option>
                    <option value="Urine Cup" ${filterTube === "Urine Cup" ? "selected" : ""}>Urine Container</option>
                </select>
                <button type="button" class="lab-b blue" data-new-draw>
                    + Order Phlebotomy Draw
                </button>
            </div>
        </div>

        <!-- Specimen Collections Card List -->
        ${d.specimens.length ? `
            <div style="display:grid; gap:10px;">
                ${d.specimens.map(renderSpecimenCard).join("")}
            </div>
        ` : `
            <div class="lab-empty">No specimen collection tubes found matching filters.</div>
        `}
    `;
}

function renderSpecimenCard(s) {
    const tubeConf = TUBE_PALETTE[s.tube_color] || { cap: s.tube_cap_color || "#6b7280", bg: "#f8fafc", border: "#e2e8f0" };
    const statusConf = STATUS_CONFIG[s.draw_status] || { color: "#475569", bg: "#f8fafc", icon: "⚪" };

    const isPending = s.draw_status === "Pending Draw";
    const isCollected = s.draw_status === "Collected";
    const isInTransit = s.draw_status === "In Transit";
    const isReceived = s.draw_status === "Received in Lab";
    const isRejected = s.draw_status === "Hemolyzed / Rejected";

    return `
        <div style="border:1px solid var(--border-color); border-radius:12px; background:var(--bg-surface); padding:12px 16px; display:grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto; gap:14px; align-items:start; border-left: 5px solid ${tubeConf.cap};">
            <!-- Col 1: Patient and Barcode -->
            <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <span style="font-weight:700; font-size:14.5px; color:var(--text-primary);">${esc(s.patient_name)}</span>
                    <span style="font-size:11.5px; background:var(--bg-surface-alt); padding:1px 6px; border-radius:4px; font-weight:600; color:var(--text-muted);">${esc(s.patient_no)}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">
                    DOB: <b>${esc(s.birthdate || 'N/A')}</b> ${s.patient_age !== null ? `(${s.patient_age} y)` : ''} · Sex: <b>${esc(s.sex || 'U')}</b>
                </div>

                <!-- Tube Color Swatch Badge -->
                <div style="display:inline-flex; align-items:center; gap:6px; background:${tubeConf.bg}; border:1px solid ${tubeConf.border}; padding:3px 10px; border-radius:16px; font-size:12px; font-weight:700; color:#1e293b; margin-bottom:6px;">
                    <span style="width:12px; height:12px; border-radius:50%; background:${tubeConf.cap}; display:inline-block; border:1px solid rgba(0,0,0,0.2);"></span>
                    <span>${esc(s.tube_color)}</span>
                    <span style="font-weight:400; font-size:11px; color:var(--text-muted);">(${esc(s.specimen_type)})</span>
                </div>

                <!-- Barcode Tag -->
                <div style="margin-top:4px;">
                    <span style="font-family:monospace; font-weight:700; font-size:12px; background:#f1f5f9; padding:2px 8px; border-radius:4px; border:1px solid #cbd5e1; color:#0f172a;">
                        ${esc(s.specimen_barcode)}
                    </span>
                    ${s.thermal_labels_printed > 0 ? `<span style="font-size:11px; color:#16a34a; margin-left:6px;">✓ ${s.thermal_labels_printed} label(s) printed</span>` : ''}
                </div>
            </div>

            <!-- Col 2: Ordered Tests & Phlebotomy Life-cycle Details -->
            <div>
                <div style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:4px;">
                    ${esc(s.test_names)}
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:12px; margin-top:6px;">
                    <div>
                        <span style="color:var(--text-muted);">Draw Site:</span>
                        <strong>${esc(s.phlebotomy_site || 'Not documented')}</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);">Method:</span>
                        <strong>${esc(s.phlebotomy_method || 'Venipuncture')}</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);">Collected At:</span>
                        <strong>${s.collection_time ? esc(s.collection_time) : '<span style="color:#d97706;">Pending Bedside Draw</span>'}</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);">Collector:</span>
                        <strong>${esc(s.collected_by_name || 'Staff')}</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);">Storage Temp:</span>
                        <span>${esc(s.storage_temperature)}</span>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);">Fasting:</span>
                        <strong>${s.fasting_status ? '<span style="color:#b45309;">FASTING SAMPLE</span>' : 'Random / Non-fasting'}</strong>
                    </div>
                </div>

                ${s.notes ? `<div style="font-size:11.5px; font-style:italic; color:var(--text-muted); margin-top:6px;">"${esc(s.notes)}"</div>` : ''}

                <!-- Rejection Alert Banner -->
                ${isRejected ? `
                    <div style="margin-top:8px; background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; padding:6px 10px; font-size:12px; color:#991b1b;">
                        <strong>⚠️ REJECTED:</strong> ${esc(s.rejection_reason || 'Compromised specimen')}
                        ${s.rejection_notes ? `<div><em>${esc(s.rejection_notes)}</em></div>` : ''}
                        <div style="font-size:11px; margin-top:2px; color:#7f1d1d;">
                            Rejected by <b>${esc(s.rejected_by_name || 'MedTech')}</b> at ${esc(s.rejected_at || '')}
                            ${s.recollection_ordered ? ` · <span style="font-weight:700; color:#16a34a;">Recollect order placed</span>` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Col 3: Status Badge & Operational Actions -->
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                <span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:14px; font-size:12px; font-weight:800; background:${statusConf.bg}; color:${statusConf.color}; border:1px solid ${statusConf.color}33;">
                    <span>${statusConf.icon}</span> ${esc(s.draw_status)}
                </span>

                <div style="display:flex; flex-direction:column; gap:6px; width:100%; align-items:stretch;">
                    ${isPending ? `
                        <button type="button" class="lab-b blue sm" data-phleb-collect="${s.id}">
                            💉 Mark Collected…
                        </button>
                    ` : ''}

                    ${isCollected ? `
                        <button type="button" class="lab-b sm" style="border-color:#7c3aed; color:#7c3aed; font-weight:600;" data-phleb-dispatch="${s.id}">
                            🚚 Mark In Transit
                        </button>
                    ` : ''}

                    ${isInTransit ? `
                        <button type="button" class="lab-b sm" style="border-color:#16a34a; color:#16a34a; font-weight:700;" data-phleb-receive="${s.id}">
                            🔬 Receive in Lab
                        </button>
                    ` : ''}

                    <div style="display:flex; gap:4px; justify-content:flex-end;">
                        ${!isRejected ? `
                            <button type="button" class="lab-b sm" style="border-color:#fca5a5; color:#dc2626;" data-phleb-reject="${s.id}">
                                Reject…
                            </button>
                        ` : ''}
                        <button type="button" class="lab-b sm" data-phleb-print-label="${s.id}">
                            🖨️ Thermal Label
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/** Handles all Phlebotomy action button clicks */
export async function onPhlebotomyClick(e, reload) {
    // 1. Status Filter pill click
    const statusBtn = e.target.closest("[data-phleb-status]");
    if (statusBtn) {
        ctx.data.state.draw_status = statusBtn.dataset.phlebStatus;
        return reload();
    }

    // 2. Tube Color filter select change
    const tubeSel = e.target.closest("#phlebTubeFilter");
    if (tubeSel) {
        tubeSel.onchange = (ev) => {
            ctx.data.state.tube_color = ev.target.value;
            reload();
        };
    }

    // 3. New Phlebotomy Draw button
    if (e.target.closest("[data-new-draw]")) {
        return openNewDrawModal(reload);
    }

    // 4. Mark Collected
    const colBtn = e.target.closest("[data-phleb-collect]");
    if (colBtn) {
        return openBedsideCollectModal(Number(colBtn.dataset.phlebCollect), reload);
    }

    // 5. Mark In Transit
    const dispBtn = e.target.closest("[data-phleb-dispatch]");
    if (dispBtn) {
        const id = Number(dispBtn.dataset.phlebDispatch);
        dispBtn.disabled = true;
        const res = await post("/lab/specimen-collections/mark-in-transit", { id });
        dispBtn.disabled = false;
        if (res?.success) {
            showToast(res.message, "success");
            reload(true);
        } else {
            showToast(res?.message || "Failed to dispatch specimen.", "error");
        }
        return true;
    }

    // 6. Receive in Lab
    const recvBtn = e.target.closest("[data-phleb-receive]");
    if (recvBtn) {
        const id = Number(recvBtn.dataset.phlebReceive);
        recvBtn.disabled = true;
        const res = await post("/lab/specimen-collections/mark-received", { id });
        recvBtn.disabled = false;
        if (res?.success) {
            showToast(res.message, "success");
            reload(true);
        } else {
            showToast(res?.message || "Failed to receive specimen in lab.", "error");
        }
        return true;
    }

    // 7. Reject Specimen
    const rejBtn = e.target.closest("[data-phleb-reject]");
    if (rejBtn) {
        return openRejectSpecimenModal(Number(rejBtn.dataset.phlebReject), reload);
    }

    // 8. Print Thermal Tube Label
    const printBtn = e.target.closest("[data-phleb-print-label]");
    if (printBtn) {
        return printThermalTubeLabel(Number(printBtn.dataset.phlebPrintLabel));
    }

    return false;
}

/** Open Bedside Blood Collection Confirmation Modal */
function openBedsideCollectModal(id, reload) {
    const s = ctx.data.specimens.find(item => item.id === id);
    if (!s) return;

    const tubeConf = TUBE_PALETTE[s.tube_color] || { cap: "#a855f7" };

    const m = modal(
        `Bedside Phlebotomy Draw — ${esc(s.specimen_barcode)}`,
        `${esc(s.patient_name)} (${esc(s.patient_no)}) · ${esc(s.tube_color)}`,
        `
        <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; color:#854d0e;">
            <label class="lbx-chk" style="margin:0; font-weight:700;">
                <input type="checkbox" id="chk_two_id" required checked>
                I verified two patient identifiers (Full Name + Date of Birth or MRN on wristband) at bedside before blood draw.
            </label>
        </div>

        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; background:var(--bg-surface-alt); padding:8px 12px; border-radius:6px; border:1px solid var(--border-color);">
            <span style="width:16px; height:16px; border-radius:50%; background:${tubeConf.cap}; display:inline-block; border:1px solid rgba(0,0,0,0.2);"></span>
            <strong>Tube:</strong> ${esc(s.tube_color)} &mdash; <span>${esc(s.test_names)}</span>
        </div>

        <div class="lbx-grid">
            <div>
                <label for="col_time">Collection Time</label>
                <input type="datetime-local" id="col_time" value="${new Date().toISOString().slice(0, 16)}">
            </div>
            <div>
                <label for="col_site">Phlebotomy Draw Site</label>
                <select id="col_site">
                    <option value="Left Antecubital Fossa">Left Antecubital Fossa</option>
                    <option value="Right Antecubital Fossa">Right Antecubital Fossa</option>
                    <option value="Left Cephalic Vein (Forearm)">Left Cephalic Vein (Forearm)</option>
                    <option value="Right Cephalic Vein (Forearm)">Right Cephalic Vein (Forearm)</option>
                    <option value="Left Dorsal Hand Vein">Left Dorsal Hand Vein</option>
                    <option value="Right Dorsal Hand Vein">Right Dorsal Hand Vein</option>
                    <option value="Central Venous Line (CVC / PICC)">Central Venous Line (CVC / PICC)</option>
                    <option value="Arterial Line Draw">Arterial Line Draw</option>
                </select>
            </div>
            <div>
                <label for="col_method">Phlebotomy Method</label>
                <select id="col_method">
                    <option value="Venipuncture">Venipuncture (Vacutainer / Needle)</option>
                    <option value="Butterfly Needle / Syringe">Butterfly Needle / Syringe</option>
                    <option value="Fingerstick / Capillary">Fingerstick / Capillary</option>
                    <option value="Line Draw">Line Draw</option>
                </select>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px;">Fasting Verification</label>
                <label class="lbx-chk" style="margin-top:6px;">
                    <input type="checkbox" id="chk_fasting" ${s.fasting_status ? 'checked' : ''}>
                    Patient verified Fasting (NPO > 8-10 hrs)
                </label>
            </div>
        </div>

        <div style="margin-top:8px;">
            <label for="col_notes">Draw Notes / Observations (optional)</label>
            <input type="text" id="col_notes" placeholder="e.g. Smooth draw; 1st attempt successful; no hematoma.">
        </div>
        `,
        `
        <button type="button" class="lab-b" data-x>Cancel</button>
        <button type="button" class="lab-b blue" data-save-collect>
            ✓ Chart Blood Draw &amp; Print Tube Label
        </button>
        `
    );

    m.$("[data-save-collect]").onclick = async (ev) => {
        const twoId = m.ov.querySelector("#chk_two_id")?.checked;
        if (!twoId) {
            return m.err("Bedside safety mandate: You must check two patient identifiers.");
        }

        const ctime = m.ov.querySelector("#col_time")?.value?.replace("T", " ") + ":00";
        const site = m.ov.querySelector("#col_site")?.value;
        const method = m.ov.querySelector("#col_method")?.value;
        const fasting = m.ov.querySelector("#chk_fasting")?.checked ? 1 : 0;
        const notes = m.ov.querySelector("#col_notes")?.value?.trim();

        ev.target.disabled = true;
        const res = await post("/lab/specimen-collections/mark-collected", {
            id,
            two_identifier_checked: 1,
            collection_time: ctime,
            phlebotomy_site: site,
            phlebotomy_method: method,
            fasting_status: fasting,
            notes
        });
        ev.target.disabled = false;

        if (!res?.success) {
            return m.err(res?.message || "Failed to mark collection.");
        }

        m.close();
        showToast(res.message, "success");
        reload(true);
        printThermalTubeLabel(id);
    };
}

/** Open Reject Specimen Modal */
function openRejectSpecimenModal(id, reload) {
    const s = ctx.data.specimens.find(item => item.id === id);
    if (!s) return;

    const m = modal(
        `Reject Specimen — ${esc(s.specimen_barcode)}`,
        `${esc(s.patient_name)} · ${esc(s.tube_color)} (${esc(s.test_names)})`,
        `
        <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; color:#991b1b;">
            <strong>⚠️ Laboratory Specimen Rejection Mandate:</strong>
            Rejecting a compromised specimen ensures patient safety by preventing erroneous lab values (e.g. false hyperkalemia from in-vitro hemolysis).
        </div>

        <div style="margin-bottom:12px;">
            <label for="rej_reason" style="font-weight:700;">Rejection Reason <span style="color:#dc2626;">*</span></label>
            <select id="rej_reason" required style="width:100%; border:1px solid var(--border-color); border-radius:8px; padding:7px 9px;">
                <option value="Grossly Hemolyzed (Hemolysis Index > 300)">Grossly Hemolyzed (Free hemoglobin severely interferes with Potassium/Enzymes)</option>
                <option value="Clotted Specimen">Clotted Specimen (Microclots invalidate Complete Blood Count &amp; Coagulation)</option>
                <option value="Quantity Not Sufficient (QNS)">Quantity Not Sufficient (QNS) &mdash; Underfilled tube invalidates blood/anticoagulant ratio</option>
                <option value="Wrong Tube / Container">Wrong Tube / Container (e.g. EDTA used instead of SST/Heparin)</option>
                <option value="Unlabelled / Mislabeled Specimen">Unlabelled or Mislabeled Tube (Violation of positive patient identification)</option>
                <option value="Temperature / Transport Excursion">Temperature Excursion &mdash; Exceeded stability window or cold chain breakdown</option>
                <option value="Contaminated / Leaking Container">Contaminated or Leaking Container (Biohazard integrity compromised)</option>
            </select>
        </div>

        <div style="margin-bottom:12px;">
            <label for="rej_notes">Clinical Laboratory Notes &amp; Findings</label>
            <textarea id="rej_notes" placeholder="Describe visual appearance (e.g. cherry-red plasma after centrifugation) or circumstances..." style="width:100%; min-height:54px;"></textarea>
        </div>

        <div style="background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px;">
            <label class="lbx-chk" style="margin:0; font-weight:700; color:#16a34a;">
                <input type="checkbox" id="chk_recollect" checked>
                Order Immediate Replacement Recollection (Automatically spawns new Pending Draw)
            </label>
        </div>
        `,
        `
        <button type="button" class="lab-b" data-x>Cancel</button>
        <button type="button" class="lab-b" style="background:#dc2626; border-color:#dc2626; color:#fff; font-weight:700;" data-submit-reject>
            ⚠️ Reject Specimen &amp; Flag Recollect
        </button>
        `
    );

    m.$("[data-submit-reject]").onclick = async (ev) => {
        const reason = m.ov.querySelector("#rej_reason")?.value;
        const notes = m.ov.querySelector("#rej_notes")?.value?.trim();
        const recollect = m.ov.querySelector("#chk_recollect")?.checked ? 1 : 0;

        ev.target.disabled = true;
        const res = await post("/lab/specimen-collections/reject", {
            id,
            rejection_reason: reason,
            rejection_notes: notes,
            recollection_ordered: recollect
        });
        ev.target.disabled = false;

        if (!res?.success) {
            return m.err(res?.message || "Failed to reject specimen.");
        }

        m.close();
        showToast(res.message, "warning", 8000);
        reload(true);
    };
}

/** Open New Phlebotomy Draw Order Modal */
function openNewDrawModal(reload) {
    const tubeOptions = Object.keys(TUBE_PALETTE).map(name => {
        const conf = TUBE_PALETTE[name];
        return `<option value="${esc(name)}">${esc(name)}</option>`;
    }).join("");

    const m = modal(
        "Order Phlebotomy Draw",
        "Generate specimen tube collection barcodes for nursing and phlebotomy worklists",
        `
        <div class="lbx-grid" style="margin-bottom:12px;">
            <div>
                <label for="new_patient_id">Patient ID <span style="color:#dc2626;">*</span></label>
                <input type="number" id="new_patient_id" placeholder="Enter Patient ID (e.g. 1)" required>
            </div>
            <div>
                <label for="new_tube_color">Tube Color / Specimen Container <span style="color:#dc2626;">*</span></label>
                <select id="new_tube_color" required>
                    ${tubeOptions}
                </select>
            </div>
        </div>

        <div style="margin-bottom:12px;">
            <label for="new_test_names">Ordered Tests Description <span style="color:#dc2626;">*</span></label>
            <input type="text" id="new_test_names" placeholder="e.g. Complete Blood Count (CBC), ESR, Blood Smear" required>
        </div>

        <div class="lbx-grid" style="margin-bottom:12px;">
            <div>
                <label for="new_storage_temp">Storage Temperature</label>
                <select id="new_storage_temp">
                    <option value="Ambient (15-25°C)">Ambient (15-25°C)</option>
                    <option value="Refrigerated (2-8°C)">Refrigerated (2-8°C)</option>
                    <option value="Frozen (-20°C)">Frozen (-20°C)</option>
                </select>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px;">Fasting Requirement</label>
                <label class="lbx-chk" style="margin-top:6px;">
                    <input type="checkbox" id="new_fasting">
                    Requires Fasting (NPO)
                </label>
            </div>
        </div>

        <div>
            <label for="new_notes">Clinical Phlebotomy Notes (optional)</label>
            <input type="text" id="new_notes" placeholder="e.g. Difficult venous access, collect with 23G butterfly needle.">
        </div>
        `,
        `
        <button type="button" class="lab-b" data-x>Cancel</button>
        <button type="button" class="lab-b blue" data-create-draw>
            + Create Phlebotomy Draw Order
        </button>
        `
    );

    m.$("[data-create-draw]").onclick = async (ev) => {
        const patientId = parseInt(m.ov.querySelector("#new_patient_id")?.value, 10);
        const tubeColor = m.ov.querySelector("#new_tube_color")?.value;
        const testNames = m.ov.querySelector("#new_test_names")?.value?.trim();
        const storageTemp = m.ov.querySelector("#new_storage_temp")?.value;
        const fasting = m.ov.querySelector("#new_fasting")?.checked ? 1 : 0;
        const notes = m.ov.querySelector("#new_notes")?.value?.trim();

        if (!patientId || !testNames) {
            return m.err("Patient ID and Ordered Tests description are required.");
        }

        ev.target.disabled = true;
        const res = await post("/lab/specimen-collections", {
            patient_id: patientId,
            tube_color: tubeColor,
            test_names: testNames,
            storage_temperature: storageTemp,
            fasting_status: fasting,
            notes
        });
        ev.target.disabled = false;

        if (!res?.success) {
            return m.err(res?.message || "Failed to order draw.");
        }

        m.close();
        showToast(res.message, "success");
        reload(true);
    };
}

/** Print 50 x 25 mm Thermal Specimen Tube Barcode Sticker */
async function printThermalTubeLabel(id) {
    try {
        const res = await api(`/lab/specimen-collections/label?id=${encodeURIComponent(id)}`);
        if (!res?.success || !res.data) {
            return showToast("Failed to generate specimen tube label.", "error");
        }
        const l = res.data;

        const win = window.open("", "_blank");
        if (!win) {
            return showToast("Pop-up blocked. Please enable pop-ups to print thermal tube stickers.", "error");
        }

        const barcodeSvg = code128Svg(l.specimen_barcode, { module: 1.35, height: 26, label: l.specimen_barcode });
        const tubeBadgeColor = TUBE_PALETTE[l.tube_color]?.cap || "#000";

        win.document.write(`<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tube Label - ${esc(l.specimen_barcode)}</title>
    <style>
        @page { size: 50mm 25mm; margin: 0; }
        html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .label {
            width: 50mm;
            height: 25mm;
            box-sizing: border-box;
            padding: 1mm 1.5mm;
            overflow: hidden;
            font-size: 6.8pt;
            line-height: 1.15;
            page-break-after: always;
            color: #000;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 1px solid #000;
            padding-bottom: 0.5mm;
            margin-bottom: 0.5mm;
        }
        .patient-name {
            font-weight: 800;
            font-size: 7.5pt;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 32mm;
        }
        .barcode-wrap svg {
            width: 100%;
            height: 6.8mm;
            display: block;
            margin: 0.5mm 0;
        }
        .tube-pill {
            display: inline-block;
            font-weight: 800;
            font-size: 6.2pt;
            border: 1px solid #000;
            padding: 0 2px;
            text-transform: uppercase;
        }
        .tests-line {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 700;
            font-size: 6.5pt;
        }
        .footer {
            display: flex;
            justify-content: space-between;
            font-size: 5.8pt;
            color: #111;
        }
        @media print {
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="label">
        <div class="header">
            <div class="patient-name">${esc(String(l.patient_last_name || '').toUpperCase())}, ${esc(l.patient_first_name || '')}</div>
            <div><b>${esc(l.sex || '')}</b> · <b>${esc(l.patient_age !== null ? l.patient_age + 'y' : '')}</b></div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:6.2pt;">
            <span>MRN: <b>${esc(l.patient_no || '')}</b></span>
            <span>DOB: <b>${esc(l.birthdate || 'N/A')}</b></span>
            <span><b>${esc(l.fasting_status)}</b></span>
        </div>

        <div class="barcode-wrap">
            ${barcodeSvg}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4mm;">
            <span style="font-family:monospace; font-weight:800; font-size:7pt;">${esc(l.specimen_barcode)}</span>
            <span class="tube-pill">${esc(l.tube_color)}</span>
        </div>

        <div class="tests-line">
            ${esc(l.test_names)}
        </div>

        <div class="footer">
            <span>Drawn: ${esc(String(l.collection_time).slice(0, 16))} (${esc(l.collected_by_name)})</span>
            <span>${esc(l.storage_temperature.split(' ')[0])}</span>
        </div>
    </div>
    <script>
        setTimeout(function() { window.print(); }, 250);
    </script>
</body>
</html>`);
        win.document.close();
    } catch (err) {
        showToast("Error generating tube label: " + err.message, "error");
    }
}
