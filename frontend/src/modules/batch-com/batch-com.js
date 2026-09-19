import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

let matchedPatients = [];
let selectedPatientIds = new Set();
let currentTab = 'batch_com';

export async function initBatchCom() {
    setupTabSwitching();
    setupBatchComFilters();
    setupSmsTab();
    setupEmailTab();
    setupAlertSettingsTab();

    // Load saved settings for all tabs
    await loadAllSettings();

    // Auto-run initial query so patient list is ready
    await runProcessQuery(false);
}

function setupTabSwitching() {
    const tabs = [
        { btnId: 'bcTabBatchCom', sectionId: 'bcSectionBatchCom', name: 'batch_com' },
        { btnId: 'bcTabSms', sectionId: 'bcSectionSms', name: 'sms' },
        { btnId: 'bcTabEmail', sectionId: 'bcSectionEmail', name: 'email' },
        { btnId: 'bcTabSettings', sectionId: 'bcSectionSettings', name: 'settings' }
    ];

    tabs.forEach(tab => {
        const btn = document.getElementById(tab.btnId);
        if (btn) {
            btn.onclick = async () => {
                currentTab = tab.name;
                tabs.forEach(t => {
                    document.getElementById(t.btnId)?.classList.remove('active');
                    const sec = document.getElementById(t.sectionId);
                    if (sec) sec.style.display = 'none';
                });
                btn.classList.add('active');
                const activeSec = document.getElementById(tab.sectionId);
                if (activeSec) activeSec.style.display = 'block';

                if (currentTab === 'sms') {
                    updateRecipientCounts();
                    await loadSmsLogs();
                } else if (currentTab === 'email') {
                    updateRecipientCounts();
                    await loadEmailLogs();
                } else if (currentTab === 'settings') {
                    await loadAllSettings();
                }
            };
        }
    });
}

function setupBatchComFilters() {
    const processBtn = document.getElementById("bcProcessBtn");
    const downloadCsvBtn = document.getElementById("bcDownloadCsvActionBtn");
    const selectAllBtn = document.getElementById("bcSelectAllBtn");
    const masterCb = document.getElementById("bcMasterCheckbox");

    if (processBtn) {
        processBtn.onclick = () => runProcessQuery(true);
    }

    if (downloadCsvBtn) {
        downloadCsvBtn.onclick = () => downloadCsvExport();
    }

    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            const allSelected = selectedPatientIds.size === matchedPatients.length;
            selectedPatientIds.clear();
            if (!allSelected) {
                matchedPatients.forEach(p => selectedPatientIds.add(Number(p.id)));
            }
            document.querySelectorAll(".bc-row-cb").forEach(cb => {
                cb.checked = !allSelected;
            });
            if (masterCb) masterCb.checked = !allSelected;
            updateRecipientCounts();
        };
    }

    if (masterCb) {
        masterCb.onchange = (e) => {
            const checked = e.target.checked;
            selectedPatientIds.clear();
            document.querySelectorAll(".bc-row-cb").forEach(cb => {
                cb.checked = checked;
                if (checked) selectedPatientIds.add(Number(cb.dataset.id));
            });
            updateRecipientCounts();
        };
    }
}

async function runProcessQuery(triggeredByUser = false) {
    const processAction = document.getElementById("bcProcessSelect")?.value || "preview";
    const overrideHipaa = document.getElementById("bcOverrideHipaaSelect")?.value || "0";
    const sortBy = document.getElementById("bcSortBySelect")?.value || "zip";
    const gender = document.getElementById("bcGenderSelect")?.value || "any";
    const ageMin = document.getElementById("bcAgeMin")?.value || "";
    const ageMax = document.getElementById("bcAgeMax")?.value || "";
    const apptFrom = document.getElementById("bcApptFrom")?.value || "";
    const apptTo = document.getElementById("bcApptTo")?.value || "";
    const seenFrom = document.getElementById("bcSeenFrom")?.value || "";
    const seenTo = document.getElementById("bcSeenTo")?.value || "";

    try {
        const res = await api('/batch-com/filter', {
            method: 'POST',
            body: JSON.stringify({
                process: processAction,
                override_hipaa: Number(overrideHipaa),
                sort_by: sortBy,
                gender: gender,
                age_min: ageMin !== '' ? Number(ageMin) : '',
                age_max: ageMax !== '' ? Number(ageMax) : '',
                appt_from: apptFrom,
                appt_to: apptTo,
                seen_from: seenFrom,
                seen_to: seenTo
            })
        });

        if (res.success && res.data) {
            matchedPatients = res.data.rows || [];
            selectedPatientIds.clear();
            matchedPatients.forEach(p => selectedPatientIds.add(Number(p.id)));

            renderResultsTable();
            updateRecipientCounts();

            if (triggeredByUser) {
                if (processAction === 'csv') {
                    downloadCsvExport();
                    showToast(`Found ${matchedPatients.length} patients. CSV file generated!`, 'success');
                } else if (processAction === 'sms') {
                    document.getElementById("bcTabSms")?.click();
                    showToast(`Switched to SMS Notification with ${matchedPatients.length} recipient(s).`, 'info');
                } else if (processAction === 'email') {
                    document.getElementById("bcTabEmail")?.click();
                    showToast(`Switched to Email Notification with ${matchedPatients.length} recipient(s).`, 'info');
                } else {
                    showToast(`Found ${matchedPatients.length} matching patient(s).`, 'success');
                }
            }
        }
    } catch (err) {
        console.error("BatchCom query error", err);
        showToast("Error retrieving patient records.", "error");
    }
}

function renderResultsTable() {
    const matchedCountBadge = document.getElementById("bcMatchedCountBadge");
    const resultsCount = document.getElementById("bcResultsCount");
    const tbody = document.getElementById("bcTableBody");
    const masterCb = document.getElementById("bcMasterCheckbox");

    if (matchedCountBadge) matchedCountBadge.textContent = matchedPatients.length;
    if (resultsCount) resultsCount.textContent = `(${matchedPatients.length} found)`;
    if (masterCb) masterCb.checked = matchedPatients.length > 0;

    if (!tbody) return;

    if (matchedPatients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: #94a3b8;">
                    No patients found matching the selected criteria.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = matchedPatients.map(p => {
        const isChecked = selectedPatientIds.has(Number(p.id));
        const hasHipaa = (p.allow_sms === '1' || p.allow_email === '1');
        const hipaaTag = hasHipaa ? '<span class="bc-tag-green">Consented</span>' : '<span class="bc-tag-amber">Standard</span>';

        return `
            <tr data-id="${p.id}">
                <td style="text-align: center;">
                    <input type="checkbox" class="bc-row-cb" data-id="${p.id}" ${isChecked ? 'checked' : ''}>
                </td>
                <td style="font-weight: 600; color: #2563eb;">${escapeHtml(p.patient_no || '')}</td>
                <td style="font-weight: 600;">${escapeHtml(p.full_name || 'Patient')}</td>
                <td>${escapeHtml(p.sex ? p.sex.toUpperCase() : '—')}</td>
                <td>${p.age !== null ? p.age : '—'}</td>
                <td>${escapeHtml(p.zip_code || '—')}</td>
                <td>${escapeHtml(p.phone || '—')}</td>
                <td>${escapeHtml(p.email || '—')}</td>
                <td style="font-size: 12.5px;">${escapeHtml(p.next_appointment || '—')}</td>
                <td style="font-size: 12.5px;">${escapeHtml(p.last_seen ? p.last_seen.substring(0, 10) : '—')}</td>
                <td>${hipaaTag}</td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll(".bc-row-cb").forEach(cb => {
        cb.onchange = (e) => {
            const id = Number(e.target.dataset.id);
            if (e.target.checked) selectedPatientIds.add(id);
            else selectedPatientIds.delete(id);
            updateRecipientCounts();
        };
    });
}

function updateRecipientCounts() {
    const count = selectedPatientIds.size;
    document.querySelectorAll(".bc-sms-recip-count, .bc-email-recip-count").forEach(el => {
        el.textContent = count;
    });
}

/**
 * Generate and trigger download of CSV export file
 */
function downloadCsvExport() {
    const selectedRows = matchedPatients.filter(p => selectedPatientIds.has(Number(p.id)));
    const rowsToExport = selectedRows.length > 0 ? selectedRows : matchedPatients;

    if (rowsToExport.length === 0) {
        showToast("No patients available to export.", "warning");
        return;
    }

    const headers = [
        "Patient ID", "Last Name", "First Name", "DOB", "Age", "Gender",
        "Phone Number", "Email Address", "Address Line", "City", "State", "Zip Code",
        "Next Appointment", "Last Seen Date", "Allow SMS", "Allow Email"
    ];

    const csvLines = [headers.map(escapeCsvField).join(",")];

    rowsToExport.forEach(p => {
        const row = [
            p.patient_no || "",
            p.last_name || "",
            p.first_name || "",
            p.birthdate || "",
            p.age !== null ? String(p.age) : "",
            p.sex || "",
            p.phone || "",
            p.email || "",
            p.address_line || "",
            p.city || "",
            p.state || "",
            p.zip_code || "",
            p.next_appointment || "",
            p.last_seen || "",
            p.allow_sms === "1" ? "YES" : "NO",
            p.allow_email === "1" ? "YES" : "NO"
        ];
        csvLines.push(row.map(escapeCsvField).join(","));
    });

    const csvContent = "\uFEFF" + csvLines.join("\r\n"); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `batch_communication_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeCsvField(field) {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
}

/**
 * Tab 2: SMS Notification (Exact Match to media_1789835922595.png)
 */
function setupSmsTab() {
    const textarea = document.getElementById("bcSmsTemplateText");
    const charsDisplay = document.getElementById("bcSmsCharsDisplay");
    const saveBtn = document.getElementById("bcSaveSmsBtn");
    const broadcastBtn = document.getElementById("bcBroadcastSmsBtn");
    const refreshBtn = document.getElementById("bcRefreshSmsLogsBtn");

    if (textarea && charsDisplay) {
        const updateChars = () => {
            const len = textarea.value.length;
            const segments = Math.max(1, Math.ceil(len / 160));
            charsDisplay.textContent = `${len} / ${segments * 160} chars (${segments} segment${segments > 1 ? 's' : ''})`;
        };
        textarea.oninput = updateChars;
        updateChars();
    }

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const gateway = document.getElementById("bcSmsGateway")?.value || "CLICKATELL";
            const providerName = document.getElementById("bcSmsProviderName")?.value || "";
            const templateText = textarea?.value || "";

            try {
                const res = await api('/batch-com/settings', {
                    method: 'POST',
                    body: JSON.stringify({
                        sms_gateway: gateway,
                        sms_provider_name: providerName,
                        sms_template_text: templateText
                    })
                });

                if (res.success) {
                    showToast("SMS Notification settings & template saved.", "success");
                } else {
                    showToast(res.message || "Failed to save SMS settings.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error saving SMS settings.", "error");
            }
        };
    }

    if (broadcastBtn) {
        broadcastBtn.onclick = async () => {
            const message = textarea?.value.trim();
            if (!message) {
                showToast("Please enter SMS text message.", "warning");
                return;
            }

            const recipients = resolveRecipients('sms');
            if (recipients.length === 0) {
                showToast("No valid phone numbers found for the matched patients.", "warning");
                return;
            }

            if (!confirm(`Broadcast SMS notification to ${recipients.length} patient(s)?`)) return;

            try {
                const res = await api('/batch-com/send', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'sms',
                        message: message,
                        recipients: recipients
                    })
                });

                if (res.success) {
                    showToast(res.message || `Broadcast sent to ${recipients.length} patient(s).`, "success");
                    await loadSmsLogs();
                } else {
                    showToast(res.message || "Failed to send SMS.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error sending SMS broadcast.", "error");
            }
        };
    }

    if (refreshBtn) {
        refreshBtn.onclick = loadSmsLogs;
    }
}

async function loadSmsLogs() {
    const tbody = document.getElementById("bcSmsLogsTableBody");
    if (!tbody) return;

    try {
        const res = await api('/batch-com/logs?type=sms');
        if (res.success && Array.isArray(res.data)) {
            if (res.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No outbound SMS logs recorded.</td></tr>`;
                return;
            }
            tbody.innerHTML = res.data.map(log => `
                <tr>
                    <td style="white-space: nowrap; font-size: 12.5px;">${escapeHtml(log.created_at || 'N/A')}</td>
                    <td><strong>${escapeHtml(log.recipient_name || 'Patient')}</strong></td>
                    <td style="font-family: monospace;">${escapeHtml(log.recipient_target)}</td>
                    <td style="font-size: 12.5px; color: #334155;">${escapeHtml(log.message)}</td>
                    <td><span class="bc-tag-green">Delivered</span></td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error("Failed to load SMS logs", e);
    }
}

/**
 * Tab 3: Email Notification (Exact Match to media_1789835928427.png)
 */
function setupEmailTab() {
    const senderInput = document.getElementById("bcEmailSender");
    const subjectInput = document.getElementById("bcEmailSubject");
    const providerInput = document.getElementById("bcEmailProviderName");
    const textarea = document.getElementById("bcEmailTemplateText");
    const saveBtn = document.getElementById("bcSaveEmailBtn");
    const broadcastBtn = document.getElementById("bcBroadcastEmailBtn");
    const refreshBtn = document.getElementById("bcRefreshEmailLogsBtn");

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const sender = senderInput?.value || "";
            const subject = subjectInput?.value || "";
            const providerName = providerInput?.value || "";
            const templateText = textarea?.value || "";

            try {
                const res = await api('/batch-com/settings', {
                    method: 'POST',
                    body: JSON.stringify({
                        email_sender: sender,
                        email_subject: subject,
                        email_provider_name: providerName,
                        email_template_text: templateText
                    })
                });

                if (res.success) {
                    showToast("Email Notification settings & template saved.", "success");
                } else {
                    showToast(res.message || "Failed to save Email settings.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error saving Email settings.", "error");
            }
        };
    }

    if (broadcastBtn) {
        broadcastBtn.onclick = async () => {
            const subject = subjectInput?.value.trim();
            const message = textarea?.value.trim();

            if (!subject) {
                showToast("Please enter an email subject line.", "warning");
                return;
            }
            if (!message) {
                showToast("Please enter email message content.", "warning");
                return;
            }

            const recipients = resolveRecipients('email');
            if (recipients.length === 0) {
                showToast("No valid email addresses found for the matched patients.", "warning");
                return;
            }

            if (!confirm(`Broadcast Email notification to ${recipients.length} patient(s)?`)) return;

            try {
                const res = await api('/batch-com/send', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'email',
                        subject: subject,
                        message: message,
                        recipients: recipients
                    })
                });

                if (res.success) {
                    showToast(res.message || `Broadcast sent to ${recipients.length} patient(s).`, "success");
                    await loadEmailLogs();
                } else {
                    showToast(res.message || "Failed to send email broadcast.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error sending email broadcast.", "error");
            }
        };
    }

    if (refreshBtn) {
        refreshBtn.onclick = loadEmailLogs;
    }
}

async function loadEmailLogs() {
    const tbody = document.getElementById("bcEmailLogsTableBody");
    if (!tbody) return;

    try {
        const res = await api('/batch-com/logs?type=email');
        if (res.success && Array.isArray(res.data)) {
            if (res.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No outbound Email logs recorded.</td></tr>`;
                return;
            }
            tbody.innerHTML = res.data.map(log => `
                <tr>
                    <td style="white-space: nowrap; font-size: 12.5px;">${escapeHtml(log.created_at || 'N/A')}</td>
                    <td><strong>${escapeHtml(log.recipient_name || 'Patient')}</strong></td>
                    <td style="font-family: monospace;">${escapeHtml(log.recipient_target)}</td>
                    <td style="font-size: 12.5px; color: #334155;">
                        <strong>${escapeHtml(log.subject || '')}</strong>
                        <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(log.message.length > 80 ? log.message.substring(0, 80) + '...' : log.message)}</div>
                    </td>
                    <td><span class="bc-tag-green">Delivered</span></td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error("Failed to load Email logs", e);
    }
}

/**
 * Tab 4: SMS/Email Alert Settings (Exact Match to media_1789835933859.png)
 */
function setupAlertSettingsTab() {
    const saveBtn = document.getElementById("bcSaveAlertSettingsBtn");
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const smsSendBefore = document.getElementById("bcAlertSmsSendBefore")?.value;
            const emailSendBefore = document.getElementById("bcAlertEmailSendBefore")?.value;
            const smsUsername = document.getElementById("bcAlertSmsUsername")?.value;
            const smsPassword = document.getElementById("bcAlertSmsPassword")?.value;
            const smsApiKey = document.getElementById("bcAlertSmsApiKey")?.value;

            try {
                const res = await api('/batch-com/settings', {
                    method: 'POST',
                    body: JSON.stringify({
                        sms_send_before: smsSendBefore,
                        email_send_before: emailSendBefore,
                        sms_username: smsUsername,
                        sms_password: smsPassword,
                        sms_api_key: smsApiKey
                    })
                });

                if (res.success) {
                    showToast("Alert settings saved successfully.", "success");
                } else {
                    showToast(res.message || "Failed to save alert settings.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error saving alert settings.", "error");
            }
        };
    }
}

async function loadAllSettings() {
    try {
        const res = await api('/batch-com/settings');
        if (res.success && res.data) {
            const s = res.data;

            // SMS Notification fields
            if (s.sms_gateway !== undefined && document.getElementById("bcSmsGateway")) {
                document.getElementById("bcSmsGateway").value = s.sms_gateway;
            }
            if (s.sms_provider_name !== undefined && document.getElementById("bcSmsProviderName")) {
                document.getElementById("bcSmsProviderName").value = s.sms_provider_name;
            }
            if (s.sms_template_text !== undefined && document.getElementById("bcSmsTemplateText")) {
                document.getElementById("bcSmsTemplateText").value = s.sms_template_text;
            }

            // Email Notification fields
            if (s.email_sender !== undefined && document.getElementById("bcEmailSender")) {
                document.getElementById("bcEmailSender").value = s.email_sender;
            }
            if (s.email_subject !== undefined && document.getElementById("bcEmailSubject")) {
                document.getElementById("bcEmailSubject").value = s.email_subject;
            }
            if (s.email_provider_name !== undefined && document.getElementById("bcEmailProviderName")) {
                document.getElementById("bcEmailProviderName").value = s.email_provider_name;
            }
            if (s.email_template_text !== undefined && document.getElementById("bcEmailTemplateText")) {
                document.getElementById("bcEmailTemplateText").value = s.email_template_text;
            }

            // Alert Settings fields
            if (s.sms_send_before !== undefined && document.getElementById("bcAlertSmsSendBefore")) {
                document.getElementById("bcAlertSmsSendBefore").value = s.sms_send_before;
            }
            if (s.email_send_before !== undefined && document.getElementById("bcAlertEmailSendBefore")) {
                document.getElementById("bcAlertEmailSendBefore").value = s.email_send_before;
            }
            if (s.sms_username !== undefined && document.getElementById("bcAlertSmsUsername")) {
                document.getElementById("bcAlertSmsUsername").value = s.sms_username;
            }
            if (s.sms_password !== undefined && document.getElementById("bcAlertSmsPassword")) {
                document.getElementById("bcAlertSmsPassword").value = s.sms_password;
            }
            if (s.sms_api_key !== undefined && document.getElementById("bcAlertSmsApiKey")) {
                document.getElementById("bcAlertSmsApiKey").value = s.sms_api_key;
            }
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
}

function resolveRecipients(channel) {
    const selected = matchedPatients.filter(p => selectedPatientIds.has(Number(p.id)));
    const targetPool = selected.length > 0 ? selected : matchedPatients;
    const recipients = [];

    targetPool.forEach(p => {
        const target = channel === 'sms' ? p.phone : p.email;
        if (target && target.trim()) {
            recipients.push({
                patient_id: p.id,
                name: p.full_name,
                target: target.trim(),
                date: p.next_appointment || new Date().toISOString().slice(0, 10),
                start_time: '09:00 AM',
                end_time: '09:30 AM'
            });
        }
    });

    return recipients;
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
