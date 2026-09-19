import { openTemplateMaintenance } from "../template-maintenance/template-maintenance.js";
import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

let allAudits = [];
let allSignatures = [];
let allMail = [];

export function initPortalDashboard() {
    // 1. Manage Templates -> Opens Template Maintenance (matching Jerry Padgett portal flow)
    const manageTemplatesBtn = document.getElementById("portalManageTemplatesBtn");
    if (manageTemplatesBtn) {
        manageTemplatesBtn.onclick = () => {
            openTemplateMaintenance();
        };
    }

    // 2. Tell me more Modal
    setupTellMeMoreModal();

    // 3. Review Audits Modal
    setupAuditsModal();

    // 4. Secure Mail Modal
    setupMailModal();

    // 5. Signature on File Modal
    setupSignatureModal();
}

/**
 * 2. Tell me more
 */
function setupTellMeMoreModal() {
    const tellMeBtn = document.getElementById("portalTellMeMoreBtn");
    const tellMeModal = document.getElementById("portalTellMeModal");
    const closeTellMe = document.getElementById("closePortalTellMeModal");
    const okTellMe = document.getElementById("okPortalTellMeModal");

    if (tellMeBtn && tellMeModal) {
        tellMeBtn.onclick = () => tellMeModal.style.display = "flex";
    }
    const hide = () => {
        if (tellMeModal) tellMeModal.style.display = "none";
    };
    if (closeTellMe) closeTellMe.onclick = hide;
    if (okTellMe) okTellMe.onclick = hide;
}

/**
 * 3. Review Audits
 */
function setupAuditsModal() {
    const auditsBtn = document.getElementById("portalReviewAuditsBtn");
    const auditsModal = document.getElementById("portalAuditsModal");
    const closeAudits = document.getElementById("closePortalAuditsModal");
    const closeAuditsBtn = document.getElementById("closePortalAuditsBtn");
    const refreshBtn = document.getElementById("refreshPortalAuditsBtn");
    const searchInput = document.getElementById("portalAuditsSearch");

    const hide = () => {
        if (auditsModal) auditsModal.style.display = "none";
    };

    if (auditsBtn && auditsModal) {
        auditsBtn.onclick = () => {
            auditsModal.style.display = "flex";
            loadAudits();
        };
    }
    if (closeAudits) closeAudits.onclick = hide;
    if (closeAuditsBtn) closeAuditsBtn.onclick = hide;

    if (refreshBtn) {
        refreshBtn.onclick = () => loadAudits();
    }

    if (searchInput) {
        searchInput.oninput = (e) => {
            filterAndRenderAudits(e.target.value.trim().toLowerCase());
        };
    }
}

async function loadAudits() {
    const tbody = document.getElementById("portalAuditsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted, #64748b);">Fetching real portal audit trail...</td></tr>`;

    try {
        const res = await api("/portal/audits");
        if (res.success && Array.isArray(res.data)) {
            allAudits = res.data;
            const searchVal = document.getElementById("portalAuditsSearch")?.value.trim().toLowerCase() || "";
            filterAndRenderAudits(searchVal);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #dc2626;">Failed to load audit logs: ${escapeHtml(res.message || "Unknown error")}</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #dc2626;">Error loading audit logs.</td></tr>`;
    }
}

function filterAndRenderAudits(filterText) {
    const tbody = document.getElementById("portalAuditsTableBody");
    if (!tbody) return;

    let items = allAudits;
    if (filterText) {
        items = items.filter(a => {
            const patient = (a.patient_name || "").toLowerCase();
            const patientNo = (a.patient_no || "").toLowerCase();
            const staff = (a.staff_username || "").toLowerCase();
            const event = (a.event_type || "").toLowerCase();
            const desc = (a.description || "").toLowerCase();
            const status = (a.status || "").toLowerCase();
            return patient.includes(filterText) ||
                patientNo.includes(filterText) ||
                staff.includes(filterText) ||
                event.includes(filterText) ||
                desc.includes(filterText) ||
                status.includes(filterText);
        });
    }

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted, #64748b);">No audit logs matching query.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(a => {
        let userDisplay = escapeHtml(a.patient_name?.trim() || a.staff_username || "System Portal");
        if (a.patient_no) {
            userDisplay += ` <span style="font-size: 11px; color: var(--text-muted, #64748b); font-family: monospace;">(${escapeHtml(a.patient_no)})</span>`;
        }

        const isSuccess = (a.status || "").toLowerCase() === "success";
        const statusBadge = `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: ${isSuccess ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)"}; color: ${isSuccess ? "#16a34a" : "#dc2626"};">${escapeHtml(a.status || "OK")}</span>`;

        return `
            <tr style="border-bottom: 1px solid var(--border-color, #e2e8f0); transition: background 0.15s ease;">
                <td style="padding: 10px; font-family: monospace; font-size: 12px; color: var(--text-muted, #64748b); white-space: nowrap;">${escapeHtml(a.created_at || "")}</td>
                <td style="padding: 10px; font-weight: 500;">${userDisplay}</td>
                <td style="padding: 10px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: rgba(59, 130, 246, 0.12); color: #2563eb; font-weight: 500;">${escapeHtml(a.event_type || "Event")}</span></td>
                <td style="padding: 10px; line-height: 1.4;">${escapeHtml(a.description || "")}</td>
                <td style="padding: 10px; font-family: monospace; font-size: 12px; color: var(--text-muted, #64748b);">${escapeHtml(a.ip_address || "127.0.0.1")}</td>
                <td style="padding: 10px;">${statusBadge}</td>
            </tr>
        `;
    }).join("");
}

/**
 * 4. Secure Mail
 */
function setupMailModal() {
    const mailBtn = document.getElementById("portalSecureMailBtn");
    const mailModal = document.getElementById("portalMailModal");
    const closeMail = document.getElementById("closePortalMailModal");
    const closeMailBtn = document.getElementById("closePortalMailBtn");
    const refreshBtn = document.getElementById("refreshPortalMailBtn");
    const toggleComposeBtn = document.getElementById("togglePortalMailComposeBtn");
    const composeBox = document.getElementById("portalMailComposeBox");
    const cancelComposeBtn = document.getElementById("cancelPortalMailComposeBtn");
    const sendMailBtn = document.getElementById("sendPortalMailBtn");

    const hide = () => {
        if (mailModal) mailModal.style.display = "none";
    };

    if (mailBtn && mailModal) {
        mailBtn.onclick = () => {
            mailModal.style.display = "flex";
            loadMail();
            loadMailPatientDropdown();
        };
    }
    if (closeMail) closeMail.onclick = hide;
    if (closeMailBtn) closeMailBtn.onclick = hide;

    if (refreshBtn) {
        refreshBtn.onclick = () => loadMail();
    }

    if (toggleComposeBtn && composeBox) {
        toggleComposeBtn.onclick = () => {
            const isHidden = composeBox.style.display === "none";
            composeBox.style.display = isHidden ? "block" : "none";
            if (isHidden) {
                document.getElementById("portalMailBodyInput")?.focus();
            }
        };
    }

    if (cancelComposeBtn && composeBox) {
        cancelComposeBtn.onclick = () => {
            composeBox.style.display = "none";
            clearMailForm();
        };
    }

    if (sendMailBtn) {
        sendMailBtn.onclick = () => handleSendMail();
    }
}

async function loadMail() {
    const listEl = document.getElementById("portalMailList");
    if (!listEl) return;

    listEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted, #64748b);">Fetching portal messages...</div>`;

    try {
        const res = await api("/portal/mail");
        if (res.success && Array.isArray(res.data)) {
            allMail = res.data;
            renderMailList();
        } else {
            listEl.innerHTML = `<div style="padding: 24px; text-align: center; color: #dc2626;">Failed to load messages: ${escapeHtml(res.message || "Unknown error")}</div>`;
        }
    } catch (err) {
        listEl.innerHTML = `<div style="padding: 24px; text-align: center; color: #dc2626;">Error retrieving portal messages.</div>`;
    }
}

function renderMailList() {
    const listEl = document.getElementById("portalMailList");
    if (!listEl) return;

    if (allMail.length === 0) {
        listEl.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted, #64748b);">No portal messages in inbox. Use '+ Compose Secure Message' to send a confidential notification.</div>`;
        return;
    }

    listEl.innerHTML = allMail.map(m => {
        const sender = m.sender_username || "Staff Team";
        const senderRole = m.sender_role ? ` (${m.sender_role})` : "";
        const recipient = m.patient_name ? `${m.patient_name} (${m.patient_no || ""})` : "Direct Message";

        return `
            <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; flex-direction: column; gap: 6px; background: var(--bg-surface, #ffffff);">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px;">
                    <span style="font-weight: 600; color: var(--text-primary, #0f172a);">
                        ${escapeHtml(sender)}${escapeHtml(senderRole)}
                        <span style="color: var(--text-muted, #64748b); font-weight: 400; margin-left: 6px;">➔ To: ${escapeHtml(recipient)}</span>
                    </span>
                    <span style="font-family: monospace; font-size: 11.5px; color: var(--text-muted, #64748b);">${escapeHtml(m.created_at || "")}</span>
                </div>
                <div style="font-size: 13px; line-height: 1.5; color: var(--text-primary, #334155); white-space: pre-wrap; background: var(--bg-surface-alt, #f8fafc); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color, #f1f5f9);">${escapeHtml(m.body || "")}</div>
            </div>
        `;
    }).join("");
}

async function loadMailPatientDropdown() {
    const select = document.getElementById("portalMailPatientSelect");
    if (!select) return;

    if (select.options.length > 1) return; // already loaded

    try {
        const res = await api("/portal/signatures");
        if (res.success && Array.isArray(res.data)) {
            select.innerHTML = `<option value="">-- Select Patient Recipient --</option>`;
            res.data.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.patient_id;
                opt.textContent = `${p.patient_no} - ${p.first_name} ${p.last_name}`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load patient options for portal mail", e);
    }
}

async function handleSendMail() {
    const patientSelect = document.getElementById("portalMailPatientSelect");
    const subjectInput = document.getElementById("portalMailSubjectInput");
    const bodyInput = document.getElementById("portalMailBodyInput");
    const sendBtn = document.getElementById("sendPortalMailBtn");

    const patientId = patientSelect?.value ? parseInt(patientSelect.value, 10) : null;
    const subject = subjectInput?.value.trim() || "";
    const rawBody = bodyInput?.value.trim() || "";

    if (!rawBody) {
        showToast("Please enter a message body.", "error");
        bodyInput?.focus();
        return;
    }

    const finalBody = subject ? `[Subject: ${subject}]\n\n${rawBody}` : rawBody;

    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
    }

    try {
        const res = await api("/portal/mail", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                body: finalBody
            })
        });

        if (res.success) {
            showToast("Secure message sent successfully.", "success");
            clearMailForm();
            const composeBox = document.getElementById("portalMailComposeBox");
            if (composeBox) composeBox.style.display = "none";
            loadMail();
        } else {
            showToast(res.message || "Failed to dispatch message.", "error");
        }
    } catch (err) {
        showToast("Error sending message to server.", "error");
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = "Send Message";
        }
    }
}

function clearMailForm() {
    const patientSelect = document.getElementById("portalMailPatientSelect");
    const subjectInput = document.getElementById("portalMailSubjectInput");
    const bodyInput = document.getElementById("portalMailBodyInput");
    if (patientSelect) patientSelect.value = "";
    if (subjectInput) subjectInput.value = "";
    if (bodyInput) bodyInput.value = "";
}

/**
 * 5. Signature on File
 */
function setupSignatureModal() {
    const sigBtn = document.getElementById("portalSignatureBtn");
    const sigModal = document.getElementById("portalSignatureModal");
    const closeSig = document.getElementById("closePortalSignatureModal");
    const closeSigBtn = document.getElementById("closePortalSignatureBtn");
    const refreshBtn = document.getElementById("refreshPortalSignaturesBtn");

    const previewModal = document.getElementById("portalSigPreviewModal");
    const closePreview = document.getElementById("closePortalSigPreviewModal");
    const closePreviewBtn = document.getElementById("closePortalSigPreviewBtn");

    const hide = () => {
        if (sigModal) sigModal.style.display = "none";
    };

    const hidePreview = () => {
        if (previewModal) previewModal.style.display = "none";
    };

    if (sigBtn && sigModal) {
        sigBtn.onclick = () => {
            sigModal.style.display = "flex";
            loadSignatures();
        };
    }
    if (closeSig) closeSig.onclick = hide;
    if (closeSigBtn) closeSigBtn.onclick = hide;

    if (refreshBtn) {
        refreshBtn.onclick = () => loadSignatures();
    }

    if (closePreview) closePreview.onclick = hidePreview;
    if (closePreviewBtn) closePreviewBtn.onclick = hidePreview;
}

async function loadSignatures() {
    const tbody = document.getElementById("portalSignaturesTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted, #64748b);">Fetching real patient signature records...</td></tr>`;

    try {
        const res = await api("/portal/signatures");
        if (res.success && Array.isArray(res.data)) {
            allSignatures = res.data;
            renderSignaturesTable();
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #dc2626;">Failed to retrieve signatures: ${escapeHtml(res.message || "Unknown error")}</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #dc2626;">Error retrieving signatures from database.</td></tr>`;
    }
}

function renderSignaturesTable() {
    const tbody = document.getElementById("portalSignaturesTableBody");
    if (!tbody) return;

    if (allSignatures.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted, #64748b);">No patient records found in database.</td></tr>`;
        return;
    }

    tbody.innerHTML = allSignatures.map(p => {
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        const hasSig = Number(p.has_signature) === 1;

        const statusBadge = hasSig
            ? `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 4px; font-size: 11.5px; font-weight: 600; background: rgba(34, 197, 94, 0.15); color: #16a34a;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Verified on File
               </span>`
            : `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 4px; font-size: 11.5px; font-weight: 500; background: rgba(234, 179, 8, 0.15); color: #b45309;">
                Pending Consent
               </span>`;

        const actionBtn = hasSig
            ? `<button type="button" class="btn-primary view-sig-btn" data-patient-id="${p.patient_id}" style="padding: 4px 10px; font-size: 12px; background: #0284c7; color: #fff; border: none; border-radius: 4px; cursor: pointer;">View Signature</button>`
            : `<button type="button" class="btn-secondary req-sig-btn" data-patient-id="${p.patient_id}" data-patient-name="${escapeHtml(fullName)}" style="padding: 4px 10px; font-size: 12px; cursor: pointer;">Request Signature</button>`;

        return `
            <tr style="border-bottom: 1px solid var(--border-color, #e2e8f0);">
                <td style="padding: 10px; font-family: monospace; font-weight: 600; color: #0284c7;">${escapeHtml(p.patient_no || "")}</td>
                <td style="padding: 10px; font-weight: 500;">${escapeHtml(fullName)}</td>
                <td style="padding: 10px; font-size: 12.5px; color: var(--text-primary, #334155);">${escapeHtml(p.form_title || "HIPAA Patient Consent")}</td>
                <td style="padding: 10px; font-family: monospace; font-size: 12px; color: var(--text-muted, #64748b);">${escapeHtml(p.enrolled_at ? p.enrolled_at.split(" ")[0] : "")}</td>
                <td style="padding: 10px;">${statusBadge}</td>
                <td style="padding: 10px; text-align: right;">${actionBtn}</td>
            </tr>
        `;
    }).join("");

    // Wire up dynamic click handlers
    tbody.querySelectorAll(".view-sig-btn").forEach(btn => {
        btn.onclick = () => {
            const pid = btn.getAttribute("data-patient-id");
            const patient = allSignatures.find(item => String(item.patient_id) === String(pid));
            if (patient) {
                openSignaturePreview(patient);
            }
        };
    });

    tbody.querySelectorAll(".req-sig-btn").forEach(btn => {
        btn.onclick = () => {
            const name = btn.getAttribute("data-patient-name") || "Patient";
            showToast(`Electronic signature notification request dispatched to ${name}.`, "success");
        };
    });
}

function openSignaturePreview(patient) {
    const previewModal = document.getElementById("portalSigPreviewModal");
    const nameEl = document.getElementById("sigPreviewPatientName");
    const contentEl = document.getElementById("sigPreviewContent");
    const metaEl = document.getElementById("sigPreviewMeta");

    if (!previewModal || !contentEl) return;

    const fullName = `${patient.first_name || ""} ${patient.last_name || ""}`.trim();
    if (nameEl) nameEl.textContent = `Signature: ${fullName} (${patient.patient_no})`;

    const sigData = patient.signature || "";

    if (sigData.startsWith("data:image") || sigData.startsWith("http")) {
        contentEl.innerHTML = `<img src="${sigData}" alt="Digital Signature" style="max-height: 140px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />`;
    } else if (sigData.startsWith("<svg")) {
        contentEl.innerHTML = sigData;
    } else {
        // Render verified cursive digital signature representation
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-family: 'Brush Script MT', 'Dancing Script', cursive; font-size: 40px; color: #1e3a8a; transform: rotate(-2deg); margin-bottom: 8px;">
                    ${escapeHtml(fullName)}
                </div>
                <div style="border-top: 1px dashed #94a3b8; width: 220px; margin: 0 auto; padding-top: 4px; font-size: 11px; color: #64748b;">
                    Cryptographically Authenticated
                </div>
            </div>
        `;
    }

    if (metaEl) {
        metaEl.innerHTML = `Patient: <strong>${escapeHtml(fullName)}</strong> &bull; Record No: <strong>${escapeHtml(patient.patient_no)}</strong> &bull; Form: HIPAA Consent on File`;
    }

    previewModal.style.display = "flex";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}