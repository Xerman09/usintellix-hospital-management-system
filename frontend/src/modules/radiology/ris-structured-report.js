import { api, API_URL } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { esc, when, modal } from "./rad-ui.js?v=6";

export async function openStructuredReportModal(orderId, reload) {
    const res = await api(`/radiology/ris/report/form?order_id=${orderId}`).catch(() => null);
    if (!res?.success) {
        return showToast(res?.message || "Failed to load report form.", "error");
    }

    const d = res.data;
    const isSigned = d.is_signed || d.status === "final_signed";
    const pri = d.order_priority || "routine";

    const urgencyLabels = {
        routine: "Routine (No Acute Finding)",
        abnormal: "Abnormal (Non-urgent)",
        urgent_action_required: "Urgent Action Required (Notify Care Team)",
        critical_panic: "CRITICAL PANIC FINDING (Immediate Read-back Required)"
    };

    const html = `
        <div style="font-size:13px;display:grid;gap:12px;">
            <div style="background:var(--bg-muted, #f1f5f9);padding:10px;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;">
                    <div><b>Patient:</b> ${esc(d.patient_name)} (${esc(d.patient_no)}) · ${d.age} y · ${esc(d.sex)}</div>
                    <div><b>Accession:</b> <span style="font-family:monospace;font-weight:700;color:#2563eb;">${esc(d.accession_no || "—")}</span></div>
                </div>
                <div style="margin-top:3px;"><b>Study:</b> ${esc(d.study_name)} [${esc(d.rad_modality || "").toUpperCase()}] · Priority: <b>${esc(pri.toUpperCase())}</b></div>
                ${isSigned ? `<div style="margin-top:4px;color:#059669;font-weight:700;">✓ Electronically Signed by Dr. ${esc(d.radiologist_name || "Radiologist")} (PRC: ${esc(d.radiologist_license_no || "—")}) on ${esc(when(d.signed_at))}</div>` : ""}
            </div>

            <div>
                <label style="display:block;font-weight:700;margin-bottom:3px;">1. Clinical Indication & Relevant History:</label>
                <input type="text" id="repInd" value="${esc(d.indication || "")}" style="width:100%;box-sizing:border-box;" placeholder="Reason for imaging study">
            </div>

            <div>
                <label style="display:block;font-weight:700;margin-bottom:3px;">2. Technique & Protocol:</label>
                <input type="text" id="repTech" value="${esc(d.technique || "")}" style="width:100%;box-sizing:border-box;" placeholder="Imaging views, slice thickness, IV contrast agent and dose">
            </div>

            <div>
                <label style="display:block;font-weight:700;margin-bottom:3px;">3. Comparison:</label>
                <input type="text" id="repComp" value="${esc(d.comparison || "")}" style="width:100%;box-sizing:border-box;" placeholder="Prior studies or 'None'">
            </div>

            <div>
                <label style="display:block;font-weight:700;margin-bottom:3px;">4. Findings (Systematic Anatomical Review):</label>
                <textarea id="repFind" rows="6" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;" placeholder="Detailed anatomical findings by organ/region...">${esc(d.findings || "")}</textarea>
            </div>

            <div>
                <label style="display:block;font-weight:700;margin-bottom:3px;">5. Diagnostic Impression (Primary Conclusion):</label>
                <textarea id="repImp" rows="3" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;" placeholder="Numbered diagnostic conclusion...">${esc(d.impression || "")}</textarea>
            </div>

            <div>
                <label style="display:block;font-weight:700;margin-bottom:3px;">6. Recommendations:</label>
                <input type="text" id="repRec" value="${esc(d.recommendation || "")}" style="width:100%;box-sizing:border-box;" placeholder="Management advice or follow-up imaging">
            </div>

            <div style="background:#fffbeb;border:1px solid #fef3c7;padding:10px;border-radius:8px;">
                <label style="display:block;font-weight:700;color:#92400e;margin-bottom:3px;">7. Finding Urgency Classification:</label>
                <select id="repUrgency" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border-color);font-weight:600;">
                    ${Object.entries(urgencyLabels).map(([k, l]) => `
                        <option value="${k}" ${d.finding_urgency === k ? "selected" : ""}>${esc(l)}</option>
                    `).join("")}
                </select>
                <div id="repUrgentBox" style="margin-top:8px;${["urgent_action_required", "critical_panic"].includes(d.finding_urgency) ? "" : "display:none;"}">
                    <label style="display:block;font-weight:700;color:#dc2626;margin-bottom:2px;">Urgent / Critical Finding Summary (Immediate Alert Payload):</label>
                    <input type="text" id="repUrgentDet" value="${esc(d.urgent_finding_details || "")}" placeholder="e.g. Acute subdural hematoma with 4mm midline shift, tension pneumothorax" style="width:100%;box-sizing:border-box;">
                    <div style="font-size:11.5px;color:#b91c1c;margin-top:2px;">Signing will broadcast an emergency panic alert directly to the ordering clinician and primary nurse.</div>
                </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                <button type="button" class="rad-b" id="repCloseBtn">Close</button>
                <div style="display:flex;gap:8px;">
                    <button type="button" class="rad-b" id="repSaveDraftBtn">Save Draft</button>
                    <button type="button" class="rad-b blue" id="repSignBtn">Sign & File Report</button>
                </div>
            </div>
        </div>
    `;

    const m = modal("Structured Radiologist Report", `Accession ${esc(d.accession_no || "")}`, html);

    m.root.querySelector("#repUrgency").onchange = (e) => {
        const isUrgent = ["urgent_action_required", "critical_panic"].includes(e.target.value);
        m.root.querySelector("#repUrgentBox").style.display = isUrgent ? "block" : "none";
    };

    m.root.querySelector("#repCloseBtn").onclick = () => m.close();

    const doSave = async (sign) => {
        const body = {
            order_id: orderId,
            sign: sign ? 1 : 0,
            indication: m.root.querySelector("#repInd").value.trim(),
            technique: m.root.querySelector("#repTech").value.trim(),
            comparison: m.root.querySelector("#repComp").value.trim(),
            findings: m.root.querySelector("#repFind").value.trim(),
            impression: m.root.querySelector("#repImp").value.trim(),
            recommendation: m.root.querySelector("#repRec").value.trim(),
            finding_urgency: m.root.querySelector("#repUrgency").value,
            urgent_finding_details: m.root.querySelector("#repUrgentDet").value.trim()
        };

        const postRes = await api("/radiology/ris/report/save", {
            method: "POST",
            body: JSON.stringify(body)
        }).catch(() => null);

        if (!postRes?.success) {
            return showToast(postRes?.message || "Failed to save report.", "error");
        }

        showToast(postRes.message, postRes.critical_alert_triggered ? "error" : "success", 8000);
        m.close();
        reload?.();
    };

    m.root.querySelector("#repSaveDraftBtn").onclick = () => doSave(false);
    m.root.querySelector("#repSignBtn").onclick = () => doSave(true);
}
