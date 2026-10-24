import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { esc, hm, when, modal, modalityTag } from "./rad-ui.js?v=6";
import { openViewer } from "./rad-report.js?v=6";
import { openStructuredReportModal } from "./ris-structured-report.js";

export async function loadRisOrders(root, state, reload) {
    const q = new URLSearchParams(Object.entries({
        modality: state.modality || "",
        safety_status: state.ris_safety || "",
        study_status: state.ris_study || "",
        q: state.q || ""
    }).filter(([, v]) => v));

    const [ordersRes, statsRes, roomsRes] = await Promise.all([
        api(`/radiology/ris/orders?${q}`).catch(() => null),
        api(`/radiology/ris/stats`).catch(() => null),
        api(`/radiology/worklist?view=schedule`).catch(() => null)
    ]);

    if (!ordersRes?.success) {
        return { error: ordersRes?.message || "Failed to load RIS orders." };
    }

    return {
        orders: ordersRes.data || [],
        stats: statsRes?.data || {},
        rooms: roomsRes?.data?.rooms || []
    };
}

export function risHtml(data) {
    const s = data.stats || {};
    const orders = data.orders || [];

    return `
        <div class="rad-counts" role="list">
            <div role="listitem"><b>${s.total_orders || 0}</b>RIS Accessions</div>
            <div role="listitem" class="${s.flagged_risks ? "bad" : ""}"><b>${s.flagged_risks || 0}</b>Safety Risk Flags</div>
            <div role="listitem"><b>${s.pending_safety || 0}</b>Pending Review</div>
            <div role="listitem" class="good"><b>${s.cleared || 0}</b>Cleared for Scan</div>
            <div role="listitem"><b>${s.scheduled_today || 0}</b>Scheduled Today</div>
        </div>

        ${orders.length ? `<div class="rad-list">${orders.map(risRow).join("")}</div>`
            : `<div class="rad-empty">No RIS imaging orders match the selected filters.</div>`}
    `;
}

function risRow(o) {
    const isCleared = o.safety_status === "cleared";
    const isRisk = o.safety_status === "flagged_risk";
    const isPending = o.safety_status === "pending_review";

    const safetyBadge = isRisk
        ? `<span class="rad-pri stat">Risk Flagged</span>`
        : isCleared
        ? `<span class="rad-pri" style="background:#10b981;color:#fff;border-color:#059669;">Cleared</span>`
        : `<span class="rad-pri urgent">Pending Review</span>`;

    const renalBadge = o.contrast_type === "none"
        ? `<span class="muted" style="font-size:12px;">No IV contrast</span>`
        : o.renal_cleared
        ? `<span class="rad-flag" style="background:#dcfce7;color:#166534;border-color:#86efac;">Renal OK (eGFR ${o.egfr_value || "—"})</span>`
        : `<span class="rad-flag bad">Renal Alert (eGFR ${o.egfr_value || "—"})</span>`;

    const mriBadge = o.modality === "mri"
        ? o.mri_safe_status === "mri_safe"
            ? `<span class="rad-flag" style="background:#dcfce7;color:#166534;border-color:#86efac;">MRI Safe</span>`
            : `<span class="rad-flag bad">MRI Safety Check (${esc(o.mri_safe_status)})</span>`
        : "";

    const pregBadge = o.pregnancy_status === "pregnant"
        ? `<span class="rad-flag bad">Pregnant / Shield Abdomen</span>`
        : "";

    return `
        <div class="rad-req ${isRisk ? "stat" : ""}" data-ris-id="${o.id}">
            <div>
                <div>${safetyBadge} <b style="font-family:monospace;font-size:14px;color:#2563eb;">${esc(o.accession_no)}</b></div>
                <div class="who" style="margin-top:2px;">${esc(o.patient_name)}</div>
                <div class="muted">${esc(o.patient_no || "")} · ${o.age !== null ? `${o.age} y` : ""} · ${esc(String(o.sex || "").toUpperCase())}</div>
                <div><b>${esc(o.patient_location || "Outpatient")}</b>${o.room_name ? ` · <span style="color:#047857;font-weight:600;">${esc(o.room_name)}</span>` : ""}</div>
            </div>

            <div>
                <div>${modalityTag(o.modality, o.study_name)}</div>
                <div style="margin-top:4px;">
                    ${renalBadge}
                    ${mriBadge}
                    ${pregBadge}
                </div>
                ${o.renal_clearance_notes ? `<div class="muted" style="font-size:12px;margin-top:3px;"><b>Renal note:</b> ${esc(o.renal_clearance_notes)}</div>` : ""}
                ${o.contrast_allergy_status === "previous_reaction" ? `<div class="rad-late" style="font-size:12px;margin-top:2px;"><b>Allergy Alert:</b> Prior contrast reaction (${esc(o.contrast_allergy_notes || "documented")})</div>` : ""}
                ${o.scheduled_start_at ? `<div class="muted" style="font-size:12px;margin-top:3px;">📅 Scheduled: <b>${esc(when(o.scheduled_start_at))} – ${esc(hm(o.scheduled_end_at))}</b></div>` : "<div class=\"muted\" style=\"font-size:12px;margin-top:3px;\">⚠️ Not yet assigned to a modality room slot</div>"}
                <div class="muted" style="font-size:11px;margin-top:3px;">Request: ${esc(o.request_no || "—")} · Status: <b>${esc(o.study_status)}</b>${o.technologist_username ? ` · RadTech: ${esc(o.technologist_username)} (PRC: ${esc(o.technologist_license_no || "N/A")})` : ""}</div>
            </div>

            <div class="acts">
                <button type="button" class="rad-b blue sm" data-ris-viewer="${o.order_id}">Open PACS Viewer</button>
                <button type="button" class="rad-b sm" data-ris-report="${o.order_id}">Report…</button>
                <button type="button" class="rad-b sm" data-ris-clear="${o.id}">Safety Clearance…</button>
                <button type="button" class="rad-b sm" data-ris-schedule="${o.id}">Modality Room…</button>
            </div>
        </div>
    `;
}

export async function onRisClick(e, reload, rooms) {
    const reportBtn = e.target.closest("[data-ris-report]");
    if (reportBtn) {
        const orderId = Number(reportBtn.dataset.risReport);
        openStructuredReportModal(orderId, reload);
        return true;
    }

    const viewerBtn = e.target.closest("[data-ris-viewer]");
    if (viewerBtn) {
        const orderId = Number(viewerBtn.dataset.risViewer);
        // Automatically ensure PACS study registration before opening viewer
        await api(`/radiology/pacs/study?order_id=${orderId}`).catch(() => null);
        openViewer(orderId);
        return true;
    }

    const clearBtn = e.target.closest("[data-ris-clear]");
    if (clearBtn) {
        const id = Number(clearBtn.dataset.risClear);
        openSafetyClearanceModal(id, reload);
        return true;
    }

    const schedBtn = e.target.closest("[data-ris-schedule]");
    if (schedBtn) {
        const id = Number(schedBtn.dataset.risSchedule);
        openModalitySchedulingModal(id, reload, rooms);
        return true;
    }

    return false;
}

async function openSafetyClearanceModal(risId, reload) {
    const res = await api(`/radiology/ris/detail?id=${risId}`).catch(() => null);
    if (!res?.success) {
        return showToast(res?.message || "Failed to load order details", "error");
    }
    const o = res.data;

    const html = `
        <div style="font-size:13px;display:grid;gap:12px;">
            <div style="background:var(--bg-muted, #f3f4f6);padding:10px;border-radius:8px;">
                <div><b>Patient:</b> ${esc(o.patient_name)} (${esc(o.patient_no)}) · ${o.age} y · ${esc(o.sex)}</div>
                <div><b>Exam:</b> ${esc(o.study_name)} [${esc(o.modality_label)}]</div>
                <div><b>Accession:</b> <span style="font-family:monospace;font-weight:700;">${esc(o.accession_no)}</span></div>
                <div><b>Contrast Type:</b> ${esc(o.contrast_type)}</div>
            </div>

            <fieldset style="border:1px solid var(--border-color);border-radius:8px;padding:10px;">
                <legend style="font-weight:700;padding:0 6px;">Renal Clearance (eGFR & Creatinine)</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <div>
                        <label style="display:block;font-size:12px;color:var(--text-muted);">Creatinine (mg/dL)</label>
                        <input type="text" id="risCreat" value="${esc(o.creatinine_value || "")}" style="width:100%;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;color:var(--text-muted);">Calculated eGFR (mL/min)</label>
                        <input type="text" id="risEgfr" value="${esc(o.egfr_value || "")}" readonly style="width:100%;box-sizing:border-box;background:#f9fafb;">
                    </div>
                </div>
                <div style="margin-top:8px;">
                    <label style="display:flex;align-items:center;gap:6px;font-weight:600;">
                        <input type="checkbox" id="risRenalCleared" ${o.renal_cleared ? "checked" : ""}>
                        Renal Function Cleared for Contrast
                    </label>
                </div>
            </fieldset>

            ${o.modality === "mri" ? `
            <fieldset style="border:1px solid var(--border-color);border-radius:8px;padding:10px;">
                <legend style="font-weight:700;padding:0 6px;">MRI Safety Screening</legend>
                <label style="display:block;font-size:12px;color:var(--text-muted);">Metal / Pacemaker / Implant Status</label>
                <select id="risMriStatus" style="width:100%;padding:6px;margin-top:4px;">
                    <option value="mri_safe" ${o.mri_safe_status === "mri_safe" ? "selected" : ""}>MRI Safe (No ferromagnetic implants)</option>
                    <option value="mri_conditional" ${o.mri_safe_status === "mri_conditional" ? "selected" : ""}>MRI Conditional (Specified field/SAR parameters checked)</option>
                    <option value="mri_unsafe" ${o.mri_safe_status === "mri_unsafe" ? "selected" : ""}>MRI Unsafe (Contraindicated: pacemaker, aneurysm clips)</option>
                    <option value="pending_check" ${o.mri_safe_status === "pending_check" ? "selected" : ""}>Pending Check / Unverified</option>
                </select>
            </fieldset>
            ` : ""}

            <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Safety Clearance Decision:</label>
                <select id="risSafetyStatus" style="width:100%;padding:7px;border-radius:6px;border:1px solid var(--border-color);">
                    <option value="cleared" ${o.safety_status === "cleared" ? "selected" : ""}>Cleared for Imaging Exam</option>
                    <option value="flagged_risk" ${o.safety_status === "flagged_risk" ? "selected" : ""}>Flag High Risk / Pre-medication Protocol Required</option>
                    <option value="rejected" ${o.safety_status === "rejected" ? "selected" : ""}>Rejected / Contraindicated</option>
                    <option value="pending_review" ${o.safety_status === "pending_review" ? "selected" : ""}>Pending Further Review</option>
                </select>
            </div>

            <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Technologist PRC License No.:</label>
                <input type="text" id="risTechLic" value="${esc(o.technologist_license_no || "")}" placeholder="PRC RadTech License Number" style="width:100%;box-sizing:border-box;">
            </div>

            <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Clinical Clearance Notes & Rationale:</label>
                <textarea id="risClearanceNotes" rows="2" style="width:100%;box-sizing:border-box;" placeholder="Enter hydration instructions, contrast allergy prophylaxis notes, or physician clearance...">${esc(o.renal_clearance_notes || "")}</textarea>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button type="button" class="rad-b" id="risModalCancel">Cancel</button>
                <button type="button" class="rad-b blue" id="risModalSave">Save Clearance</button>
            </div>
        </div>
    `;

    const m = modal("Radiology Safety Clearance & Screening", `Accession ${esc(o.accession_no)}`, html);

    m.root.querySelector("#risModalCancel").onclick = () => m.close();
    m.root.querySelector("#risModalSave").onclick = async () => {
        const safetyStatus = m.root.querySelector("#risSafetyStatus").value;
        const renalCleared = m.root.querySelector("#risRenalCleared")?.checked ? 1 : 0;
        const mriStatus = m.root.querySelector("#risMriStatus")?.value || o.mri_safe_status;
        const techLic = m.root.querySelector("#risTechLic")?.value.trim();
        const notes = m.root.querySelector("#risClearanceNotes")?.value.trim();

        const postRes = await api("/radiology/ris/safety-clearance", {
            method: "POST",
            body: JSON.stringify({
                id: risId,
                safety_status: safetyStatus,
                renal_cleared: renalCleared,
                mri_safe_status: mriStatus,
                technologist_license_no: techLic,
                clearance_notes: notes
            })
        }).catch(() => null);

        if (!postRes?.success) {
            return showToast(postRes?.message || "Failed to save safety clearance", "error");
        }

        showToast(postRes.message, "success");
        m.close();
        reload();
    };
}

async function openModalitySchedulingModal(risId, reload, rooms) {
    const res = await api(`/radiology/ris/detail?id=${risId}`).catch(() => null);
    if (!res?.success) {
        return showToast(res?.message || "Failed to load order details", "error");
    }
    const o = res.data;

    // Filter compatible rooms by modality
    const compatibleRooms = (rooms || []).filter(r => r.modality === o.modality);

    const nowIso = new Date().toISOString().slice(0, 16);
    const defStart = o.scheduled_start_at ? o.scheduled_start_at.replace(" ", "T").slice(0, 16) : nowIso;
    const defEnd = o.scheduled_end_at ? o.scheduled_end_at.replace(" ", "T").slice(0, 16) : "";

    const html = `
        <div style="font-size:13px;display:grid;gap:12px;">
            <div style="background:var(--bg-muted, #f3f4f6);padding:10px;border-radius:8px;">
                <div><b>Patient:</b> ${esc(o.patient_name)} (${esc(o.patient_no)})</div>
                <div><b>Exam:</b> ${esc(o.study_name)}</div>
                <div><b>Required Modality:</b> <b style="color:#2563eb;">${esc(o.modality_label)}</b></div>
                <div><b>Accession:</b> <span style="font-family:monospace;font-weight:700;">${esc(o.accession_no)}</span></div>
            </div>

            <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Modality Suite / Room:</label>
                <select id="risRoomId" style="width:100%;padding:7px;border-radius:6px;border:1px solid var(--border-color);">
                    <option value="">Select Room / Bay...</option>
                    ${compatibleRooms.map(r => `
                        <option value="${r.id}" ${o.room_id == r.id ? "selected" : ""}>${esc(r.name)} (${esc(r.location || "Radiology")})</option>
                    `).join("")}
                </select>
                ${!compatibleRooms.length ? `<div class="rad-late" style="font-size:11px;margin-top:2px;">No active rooms found for modality "${esc(o.modality)}".</div>` : ""}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Start Time:</label>
                    <input type="datetime-local" id="risStartAt" value="${esc(defStart)}" style="width:100%;box-sizing:border-box;">
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">End Time:</label>
                    <input type="datetime-local" id="risEndAt" value="${esc(defEnd)}" style="width:100%;box-sizing:border-box;">
                </div>
            </div>

            <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Assigned Radiologic Technologist License:</label>
                <input type="text" id="risSchedTechLic" value="${esc(o.technologist_license_no || "")}" placeholder="PRC License No." style="width:100%;box-sizing:border-box;">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button type="button" class="rad-b" id="risSchedCancel">Cancel</button>
                <button type="button" class="rad-b blue" id="risSchedSave">Assign & Schedule</button>
            </div>
        </div>
    `;

    const m = modal("Modality Room Scheduling", `Accession ${esc(o.accession_no)}`, html);

    m.root.querySelector("#risSchedCancel").onclick = () => m.close();
    m.root.querySelector("#risSchedSave").onclick = async () => {
        const roomId = m.root.querySelector("#risRoomId").value;
        const startAt = m.root.querySelector("#risStartAt").value.replace("T", " ");
        let endAt = m.root.querySelector("#risEndAt").value.replace("T", " ");
        const techLic = m.root.querySelector("#risSchedTechLic").value.trim();

        if (!roomId) {
            return showToast("Please select a modality room", "error");
        }
        if (!startAt) {
            return showToast("Please set a scheduled start time", "error");
        }
        if (!endAt) {
            // Default 30 min duration
            const s = new Date(startAt.replace(" ", "T"));
            s.setMinutes(s.getMinutes() + 30);
            endAt = s.toISOString().slice(0, 19).replace("T", " ");
        }

        const postRes = await api("/radiology/ris/schedule-room", {
            method: "POST",
            body: JSON.stringify({
                id: risId,
                room_id: Number(roomId),
                start_at: startAt,
                end_at: endAt,
                technologist_license_no: techLic
            })
        }).catch(() => null);

        if (!postRes?.success) {
            return showToast(postRes?.message || "Failed to schedule modality room", "error");
        }

        showToast(postRes.message, "success");
        m.close();
        reload();
    };
}
