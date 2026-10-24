import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";
import { esc, when, waited, modal } from "./lab-ui.js?v=5";

/*
 * Pathologist Clinical Verification & Amendment Log (Module 14, lis_result_verifications)
 * Two-step validation workflow:
 * Step 1: Medical Technologist analytical verification (preliminary_verified)
 * Step 2: Board-certified Pathologist clinical sign-off (pathologist_approved)
 * Full immutable audit trail for result amendments & corrections.
 */

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);

let ctx = null; // { root, data, reload }

const VERIF_STATUS_CONFIG = {
    "preliminary_verified": { label: "Preliminary (Awaiting Pathologist)", color: "#b45309", bg: "#fef3c7", icon: "⏳" },
    "pathologist_approved": { label: "Pathologist Approved (Final)", color: "#15803d", bg: "#f0fdf4", icon: "✅" },
    "pathologist_returned": { label: "Returned to Bench", color: "#b91c1c", bg: "#fef2f2", icon: "↩️" },
    "amended": { label: "Amended / Corrected", color: "#6b21a8", bg: "#faf5ff", icon: "📝" }
};

/** Load Pathologist Verification Queue and stats */
export async function loadPathologistVerifications(root, state, reload) {
    const q = new URLSearchParams({
        ...(state.verification_status ? { verification_status: state.verification_status } : {}),
        ...(state.is_critical !== undefined && state.is_critical !== "" ? { is_critical: state.is_critical } : {}),
        ...(state.q ? { search: state.q } : {})
    });

    const [verifRes, statsRes] = await Promise.all([
        api(`/lab/verifications?${q}`).catch(() => null),
        api("/lab/verifications/stats").catch(() => null)
    ]);

    if (!verifRes?.success) {
        return { error: verifRes?.message || "Could not load pathologist verification queue." };
    }

    const payload = {
        verifications: verifRes.data || [],
        stats: statsRes?.data || {
            total_verifications: 0, pending_pathologist_review: 0, pathologist_approved: 0,
            pathologist_returned: 0, amended_count: 0, pending_critical_alerts: 0
        },
        state
    };

    ctx = { root, data: payload, reload };
    return payload;
}

/** Render Pathologist Verification Queue UI */
export function pathologistHtml(d) {
    const s = d.stats;
    const filterStatus = d.state.verification_status || "";
    const filterCrit = d.state.is_critical;

    const statusPill = (val, label, count) => `
        <button type="button" class="lab-b sm ${filterStatus === val && filterCrit !== "1" ? "blue" : ""}" data-path-status="${val}">
            ${esc(label)} ${count !== undefined ? `<b>(${count})</b>` : ""}
        </button>
    `;

    return `
        <!-- KPI Summary Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:14px;">
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #f59e0b;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Awaiting Pathologist</div>
                <div style="font-size:22px; font-weight:800; color:#b45309; margin-top:2px;">${s.pending_pathologist_review}</div>
                <div style="font-size:11px; color:var(--text-muted);">Preliminary analytical release</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #16a34a;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Pathologist Approved</div>
                <div style="font-size:22px; font-weight:800; color:#16a34a; margin-top:2px;">${s.pathologist_approved}</div>
                <div style="font-size:11px; color:var(--text-muted);">Final clinical endorsement</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #dc2626;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Critical Panic Alerts</div>
                <div style="font-size:22px; font-weight:800; color:#dc2626; margin-top:2px;">${s.pending_critical_alerts}</div>
                <div style="font-size:11px; color:var(--text-muted);">Immediate pathologist review</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #7c3aed;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Amended Results</div>
                <div style="font-size:22px; font-weight:800; color:#7c3aed; margin-top:2px;">${s.amended_count}</div>
                <div style="font-size:11px; color:var(--text-muted);">Corrections with audit log</div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; border-left:4px solid #64748b;">
                <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Returned to Bench</div>
                <div style="font-size:22px; font-weight:800; color:#64748b; margin-top:2px;">${s.pathologist_returned}</div>
                <div style="font-size:11px; color:var(--text-muted);">Re-evaluation requested</div>
            </div>
        </div>

        <!-- Filter Bar -->
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:10px 14px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-right:4px;">Filter Queue:</span>
                ${statusPill("", "All Reports", s.total_verifications)}
                ${statusPill("preliminary_verified", "Preliminary (Pending Review)", s.pending_pathologist_review)}
                ${statusPill("pathologist_approved", "Pathologist Approved", s.pathologist_approved)}
                ${statusPill("amended", "Amended", s.amended_count)}
                ${statusPill("pathologist_returned", "Returned", s.pathologist_returned)}
                <button type="button" class="lab-b sm ${filterCrit === "1" ? "blue" : ""}" data-path-crit style="border-color:#fca5a5; color:${filterCrit === "1" ? "#fff" : "#dc2626"};">
                    🚨 Critical Only (${s.pending_critical_alerts})
                </button>
            </div>
        </div>

        <!-- Verification Cards -->
        ${d.verifications.length ? `
            <div style="display:grid; gap:12px;">
                ${d.verifications.map(renderVerificationCard).join("")}
            </div>
        ` : `
            <div class="lab-empty">No laboratory results in the pathologist verification queue matching filters.</div>
        `}
    `;
}

function renderVerificationCard(v) {
    const conf = VERIF_STATUS_CONFIG[v.verification_status] || { label: v.verification_status, color: "#475569", bg: "#f8fafc", icon: "📋" };
    const isPreliminary = v.verification_status === "preliminary_verified";
    const isApproved = v.verification_status === "pathologist_approved";

    return `
        <div style="border:1px solid var(--border-color); border-radius:12px; background:var(--bg-surface); padding:14px 18px; border-left: 5px solid ${v.is_critical ? '#dc2626' : isApproved ? '#16a34a' : '#f59e0b'};">
            <!-- Header Row -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                <div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:15px; font-weight:800; color:var(--text-primary);">${esc(v.test_name)}</span>
                        <span style="font-size:11px; background:var(--bg-surface-alt); padding:2px 6px; border-radius:4px; font-family:monospace; color:var(--text-muted);">Order #${v.order_id}</span>
                        ${v.is_critical ? `<span style="background:#b91c1c; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">🚨 CRITICAL PANIC ALERT</span>` : ''}
                        ${v.is_amended ? `<span style="background:#7c3aed; color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;">📝 AMENDED (v${v.amendment_count + 1})</span>` : ''}
                    </div>
                    <div style="font-size:12.5px; color:var(--text-muted); margin-top:3px;">
                        Patient: <strong>${esc(v.patient_name)}</strong> (${esc(v.patient_no)}) · DOB: <b>${esc(v.birthdate || 'N/A')}</b> ${v.patient_age !== null ? `(${v.patient_age}y)` : ''} · Sex: <b>${esc(v.sex || 'U')}</b>
                    </div>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:16px; font-size:12.5px; font-weight:800; background:${conf.bg}; color:${conf.color}; border:1px solid ${conf.color}33;">
                        <span>${conf.icon}</span> ${esc(conf.label)}
                    </span>
                </div>
            </div>

            <!-- Two-Tier Signature Validation Row -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:12px; background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:8px; padding:10px 14px; font-size:12px;">
                <!-- Step 1: Analytical Verification (MedTech) -->
                <div>
                    <div style="font-weight:700; color:#1e293b; display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                        <span style="color:#16a34a;">✓</span> Step 1: Analytical Verification (Medical Technologist)
                    </div>
                    <div>Verified by: <strong>${esc(v.medtech_name || 'Medical Technologist')}</strong></div>
                    <div style="color:var(--text-muted);">License: <b>${esc(v.medtech_license_no || 'PRC-MT Verified')}</b> · ${v.medtech_verified_at ? esc(v.medtech_verified_at) : 'N/A'}</div>
                </div>

                <!-- Step 2: Clinical Verification (Pathologist) -->
                <div>
                    <div style="font-weight:700; color:#1e293b; display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                        ${isApproved ? '<span style="color:#16a34a;">✓</span>' : '<span style="color:#f59e0b;">⏳</span>'} Step 2: Clinical Approval (Consultant Pathologist)
                    </div>
                    <div>Pathologist: <strong>${v.pathologist_name ? esc(v.pathologist_name) : '<span style="color:#b45309;">Awaiting Pathologist Sign-off</span>'}</strong></div>
                    <div style="color:var(--text-muted);">${v.pathologist_license_no ? `License: <b>${esc(v.pathologist_license_no)}</b> · ${esc(v.pathologist_signed_at || '')}` : 'Mandatory clinical review'}</div>
                </div>
            </div>

            <!-- Pathologist Clinical Narrative / Diagnostic Impression -->
            ${v.pathologist_narrative ? `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:12.5px;">
                    <div style="font-weight:700; color:#166534; margin-bottom:2px;">
                        🔬 Pathologist Diagnostic Impression &amp; Clinical Interpretation:
                    </div>
                    <div style="color:#14532d; white-space:pre-wrap;">${esc(v.pathologist_narrative)}</div>
                </div>
            ` : ''}

            <!-- Critical Alert Banner -->
            ${v.is_critical && v.critical_alert_notes ? `
                <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:8px 12px; margin-bottom:12px; font-size:12px; color:#991b1b;">
                    <strong>🚨 Critical Findings Alert:</strong> ${esc(v.critical_alert_notes)}
                </div>
            ` : ''}

            <!-- Analyte Values Table -->
            <div style="margin-bottom:12px; overflow-x:auto;">
                <table class="lab-vals" style="margin:0;">
                    <thead>
                        <tr>
                            <th>Analyte / Parameter</th>
                            <th>Value</th>
                            <th>Units</th>
                            <th>Reference Range</th>
                            <th>Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${v.results && v.results.length ? v.results.map(r => `
                            <tr class="${r.is_abnormal ? 'crit' : ''}">
                                <td><b>${esc(r.name)}</b></td>
                                <td class="v" style="font-size:13.5px; color:${r.is_abnormal ? '#dc2626' : 'inherit'};">${esc(r.value)}</td>
                                <td class="muted">${esc(r.units || '—')}</td>
                                <td class="muted">${esc(r.reference_range || '—')}</td>
                                <td>
                                    ${r.is_abnormal
                                        ? '<span class="lab-fl crit">ABNORMAL</span>'
                                        : '<span class="lab-fl ok">NORMAL</span>'
                                    }
                                </td>
                            </tr>
                        `).join("") : '<tr><td colspan="5" class="muted">No individual analyte values logged.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- Actions Row -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid var(--border-color); padding-top:10px;">
                <div style="display:flex; gap:8px; align-items:center;">
                    ${v.is_amended ? `
                        <button type="button" class="lab-b sm" data-view-amendments="${v.id}" style="border-color:#7c3aed; color:#7c3aed; font-weight:600;">
                            📜 View Amendment Log (${v.amendment_count})
                        </button>
                    ` : ''}
                    <button type="button" class="lab-b sm" data-amend-results="${v.id}">
                        ✏️ Amend Results…
                    </button>
                </div>

                <div style="display:flex; gap:8px; align-items:center;">
                    ${isPreliminary || v.verification_status === "pathologist_returned" ? `
                        <button type="button" class="lab-b sm" style="border-color:#fca5a5; color:#dc2626;" data-path-return="${v.id}">
                            ↩️ Return to Bench…
                        </button>
                        <button type="button" class="lab-b blue sm" data-path-signoff="${v.id}">
                            ✍️ Pathologist Clinical Sign-off…
                        </button>
                    ` : `
                        <button type="button" class="lab-b sm" style="border-color:#16a34a; color:#16a34a; font-weight:700;" data-path-signoff="${v.id}">
                            ✓ Update Pathologist Interpretation…
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

/** Handles all Pathologist Verification action clicks */
export async function onPathologistClick(e, reload) {
    // 1. Status Filter pill
    const statusBtn = e.target.closest("[data-path-status]");
    if (statusBtn) {
        ctx.data.state.verification_status = statusBtn.dataset.pathStatus;
        ctx.data.state.is_critical = "";
        return reload();
    }

    // 2. Critical Only pill
    const critBtn = e.target.closest("[data-path-crit]");
    if (critBtn) {
        ctx.data.state.is_critical = (ctx.data.state.is_critical === "1") ? "" : "1";
        return reload();
    }

    // 3. Pathologist Sign-off
    const signBtn = e.target.closest("[data-path-signoff]");
    if (signBtn) {
        return openPathologistSignOffModal(Number(signBtn.dataset.pathSignoff), reload);
    }

    // 4. Return to Bench
    const retBtn = e.target.closest("[data-path-return]");
    if (retBtn) {
        return openPathologistReturnModal(Number(retBtn.dataset.pathReturn), reload);
    }

    // 5. Amend Results
    const amendBtn = e.target.closest("[data-amend-results]");
    if (amendBtn) {
        return openAmendResultsModal(Number(amendBtn.dataset.amendResults), reload);
    }

    // 6. View Amendment Log
    const logBtn = e.target.closest("[data-view-amendments]");
    if (logBtn) {
        return openViewAmendmentsModal(Number(logBtn.dataset.viewAmendments));
    }

    return false;
}

/** Pathologist Clinical Sign-Off Modal */
function openPathologistSignOffModal(id, reload) {
    const v = ctx.data.verifications.find(item => item.id === id);
    if (!v) return;

    const m = modal(
        `Pathologist Clinical Sign-Off — ${esc(v.test_name)}`,
        `Patient: ${esc(v.patient_name)} (${esc(v.patient_no)}) · Order #${v.order_id}`,
        `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; color:#14532d;">
            <strong>Medical Pathologist Endorsement:</strong>
            Clinical validation confirms that all analytical values, morphology, and flags have been correlated with patient history and meet diagnostic reporting standards.
        </div>

        <div class="lbx-grid" style="margin-bottom:12px;">
            <div>
                <label for="path_lic" style="font-weight:700;">Pathologist Professional PRC/MD License # <span style="color:#dc2626;">*</span></label>
                <input type="text" id="path_lic" value="${esc(v.pathologist_license_no || 'PRC-MD-0077421')}" required>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px;">Diagnostic Classification</label>
                <select id="path_classification">
                    <option value="Approved - Routine">Approved - Normal / Routine Findings</option>
                    <option value="Approved - Pathological Correlation">Approved - Clinically Significant / Pathological Finding</option>
                    <option value="Approved - STAT Critical Verified">Approved - Critical Panic Range (Clinician Alerted)</option>
                </select>
            </div>
        </div>

        <div style="margin-bottom:12px;">
            <label for="path_narrative" style="font-weight:700;">Pathologist Clinical Interpretation / Microscopic Narrative <span style="color:#dc2626;">*</span></label>
            <textarea id="path_narrative" placeholder="Enter diagnostic narrative, microscopic smear findings, or clinical correlation notes..." style="width:100%; min-height:85px;" required>${esc(v.pathologist_narrative || '')}</textarea>
        </div>

        <div style="background:var(--bg-surface-alt); border:1px solid var(--border-color); border-radius:6px; padding:8px 12px; font-size:12px;">
            Signing this report electronically authenticates the final laboratory chart release under clinical pathologist responsibility.
        </div>
        `,
        `
        <button type="button" class="lab-b" data-x>Cancel</button>
        <button type="button" class="lab-b blue" data-submit-signoff style="background:#16a34a; border-color:#16a34a; font-weight:700;">
            ✍️ Sign &amp; Clinically Approve (Final Release)
        </button>
        `
    );

    m.$("[data-submit-signoff]").onclick = async (ev) => {
        const lic = m.ov.querySelector("#path_lic")?.value?.trim();
        const narrative = m.ov.querySelector("#path_narrative")?.value?.trim();

        if (!lic || !narrative) {
            return m.err("Pathologist License # and Clinical Interpretation are mandatory.");
        }

        ev.target.disabled = true;
        const res = await post("/lab/verifications/pathologist-signoff", {
            verification_id: id,
            pathologist_license_no: lic,
            pathologist_narrative: narrative
        });
        ev.target.disabled = false;

        if (!res?.success) {
            return m.err(res?.message || "Failed to sign off.");
        }

        m.close();
        showToast(res.message, "success", 7000);
        reload(true);
    };
}

/** Pathologist Return to Bench Modal */
function openPathologistReturnModal(id, reload) {
    const v = ctx.data.verifications.find(item => item.id === id);
    if (!v) return;

    const m = modal(
        `Return to Bench — ${esc(v.test_name)}`,
        `Order #${v.order_id} · ${esc(v.patient_name)}`,
        `
        <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; color:#991b1b;">
            <strong>Clinical Return Mandate:</strong> Returning this result set temporarily removes it from final release and prompts the laboratory technologist to re-evaluate the specimen.
        </div>

        <div>
            <label for="return_why" style="font-weight:700;">Required Action / Explanation for Laboratory Bench <span style="color:#dc2626;">*</span></label>
            <textarea id="return_why" placeholder="e.g. Please perform 1:2 dilution to confirm extreme value; re-check slide for platelet satellitism or clumping." style="width:100%; min-height:80px;" required></textarea>
        </div>
        `,
        `
        <button type="button" class="lab-b" data-x>Cancel</button>
        <button type="button" class="lab-b" style="background:#dc2626; border-color:#dc2626; color:#fff; font-weight:700;" data-submit-return>
            ↩️ Return to Bench
        </button>
        `
    );

    m.$("[data-submit-return]").onclick = async (ev) => {
        const reason = m.ov.querySelector("#return_why")?.value?.trim();
        if (!reason) {
            return m.err("Please describe what the bench must verify or re-run.");
        }

        ev.target.disabled = true;
        const res = await post("/lab/verifications/pathologist-return", {
            verification_id: id,
            return_reason: reason
        });
        ev.target.disabled = false;

        if (!res?.success) {
            return m.err(res?.message || "Failed to return results.");
        }

        m.close();
        showToast(res.message, "warning");
        reload(true);
    };
}

/** Result Amendment Modal */
function openAmendResultsModal(id, reload) {
    const v = ctx.data.verifications.find(item => item.id === id);
    if (!v) return;

    const rowsHtml = (v.results || []).map((r, i) => `
        <tr data-amend-row="${i}">
            <td><strong>${esc(r.name)}</strong><input type="hidden" data-k="name" value="${esc(r.name)}"></td>
            <td><input type="text" data-k="value" value="${esc(r.value)}" style="font-weight:700; width:110px;" required></td>
            <td><input type="text" data-k="units" value="${esc(r.units || '')}" style="width:70px;"></td>
            <td><input type="text" data-k="ref" value="${esc(r.reference_range || '')}" style="width:110px;"></td>
            <td style="text-align:center;"><input type="checkbox" data-k="abnormal" ${r.is_abnormal ? 'checked' : ''}></td>
        </tr>
    `).join("");

    const m = modal(
        `Amend Laboratory Result — ${esc(v.test_name)}`,
        `Order #${v.order_id} · Patient: ${esc(v.patient_name)}`,
        `
        <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; color:#6b21a8;">
            <strong>⚠️ Formal Result Amendment (CAP / ISO 15189):</strong>
            All edits to released laboratory values require a clinical justification. A permanent audit log entry will document previous vs new values.
        </div>

        <div style="margin-bottom:12px;">
            <label for="amend_why" style="font-weight:700;">Mandatory Reason for Amendment <span style="color:#dc2626;">*</span></label>
            <input type="text" id="amend_why" placeholder="e.g. Clerical transcription error corrected; Repeat analysis on diluted serum." required style="width:100%;">
        </div>

        <div style="margin-bottom:12px; max-height:220px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px;">
            <table class="lab-vals" style="margin:0;">
                <thead>
                    <tr>
                        <th>Analyte</th>
                        <th>Amended Value <span style="color:#dc2626;">*</span></th>
                        <th>Units</th>
                        <th>Reference Range</th>
                        <th>Abnormal?</th>
                    </tr>
                </thead>
                <tbody id="amendTbody">
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
        `,
        `
        <button type="button" class="lab-b" data-x>Cancel</button>
        <button type="button" class="lab-b blue" data-submit-amend style="background:#7c3aed; border-color:#7c3aed; font-weight:700;">
            📝 Submit Amendment &amp; Update Audit Log
        </button>
        `
    );

    m.$("[data-submit-amend]").onclick = async (ev) => {
        const reason = m.ov.querySelector("#amend_why")?.value?.trim();
        if (!reason) {
            return m.err("Reason for amendment is required.");
        }

        const trs = m.ov.querySelectorAll("#amendTbody tr[data-amend-row]");
        const newValues = [];
        for (const tr of trs) {
            const name = tr.querySelector('[data-k="name"]')?.value;
            const val = tr.querySelector('[data-k="value"]')?.value?.trim();
            const units = tr.querySelector('[data-k="units"]')?.value?.trim();
            const ref = tr.querySelector('[data-k="ref"]')?.value?.trim();
            const abn = tr.querySelector('[data-k="abnormal"]')?.checked ? 1 : 0;
            if (name && val !== "") {
                newValues.push({ name, value: val, units, reference_range: ref, is_abnormal: abn });
            }
        }

        if (newValues.length === 0) {
            return m.err("Please provide at least one analyte value.");
        }

        ev.target.disabled = true;
        const res = await post("/lab/verifications/amend", {
            verification_id: id,
            amendment_reason: reason,
            new_values: newValues
        });
        ev.target.disabled = false;

        if (!res?.success) {
            return m.err(res?.message || "Failed to amend results.");
        }

        m.close();
        showToast(res.message, "success", 7000);
        reload(true);
    };
}

/** View Immutable Amendment Audit Log Modal */
async function openViewAmendmentsModal(id) {
    const res = await api(`/lab/verifications/detail?id=${id}`).catch(() => null);
    if (!res?.success || !res.data) {
        return showToast("Failed to fetch amendment history.", "error");
    }
    const d = res.data;
    const logs = d.amendment_logs || [];

    const m = modal(
        `Amendment Audit Trail — ${esc(d.test_name)}`,
        `Order #${d.order_id} · Patient: ${esc(d.patient_name)} (${esc(d.patient_no)})`,
        `
        <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:12px;">
            Total Amendments Logged: <b>${logs.length}</b> · Initial Verification: <b>${esc(d.medtech_verified_at || '')}</b>
        </div>

        ${logs.length ? `
            <div style="display:grid; gap:12px; max-height:400px; overflow-y:auto;">
                ${logs.map(log => `
                    <div style="border:1px solid var(--border-color); border-radius:8px; padding:10px 14px; background:var(--bg-surface-alt);">
                        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
                            <span style="font-weight:700; color:#7c3aed;">Amendment #${log.amendment_number}</span>
                            <span style="font-size:11.5px; color:var(--text-muted);">${esc(log.amended_at)} by <b>${esc(log.amended_by_name)}</b></span>
                        </div>
                        <div style="font-size:12.5px; margin-bottom:8px;">
                            <strong>Reason:</strong> <em>"${esc(log.amendment_reason)}"</em>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px;">
                            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:6px; padding:8px;">
                                <div style="font-weight:700; color:#dc2626; margin-bottom:4px;">Previous Values:</div>
                                ${(log.previous_values || []).map(pv => `<div>${esc(pv.name)}: <b>${esc(pv.value)}</b> ${esc(pv.units || '')}</div>`).join("")}
                            </div>
                            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:6px; padding:8px;">
                                <div style="font-weight:700; color:#16a34a; margin-bottom:4px;">Amended Values:</div>
                                ${(log.new_values || []).map(nv => `<div>${esc(nv.name)}: <b>${esc(nv.value)}</b> ${esc(nv.units || '')}</div>`).join("")}
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        ` : `
            <div class="lab-empty">No previous amendments on record for this result set.</div>
        `}
        `,
        `<button type="button" class="lab-b blue" data-x>Close</button>`
    );
}
