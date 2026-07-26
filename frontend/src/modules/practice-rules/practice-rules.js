import { api } from "../../core/api.js";

let rulesList = [];
let deleteTargetId = null;

const DEFAULT_UNKNOWN = "The source attribute value is unknown or the DSI developer did not provide any information for this field";

export function initPracticeRules() {
    loadRulesList();
    bindEvents();
}

/**
 * Fetch and render rules list in table.
 */
async function loadRulesList() {
    const tableBody = document.getElementById("rulesTableBody");
    if (!tableBody) return;

    try {
        const response = await api("/practice-rules");
        if (response.success && Array.isArray(response.data)) {
            rulesList = response.data;
            renderRulesTable(rulesList);
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #ef4444;">
                        ${response.message || "Failed to load rules list."}
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error("Error loading rules:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: #ef4444;">
                    Error connecting to backend server.
                </td>
            </tr>
        `;
    }
}

/**
 * Render table rows with strict columns:
 * No | Type | Name | Created By | Created At | Action
 */
function renderRulesTable(rules) {
    const tableBody = document.getElementById("rulesTableBody");
    if (!tableBody) return;

    if (rules.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">
                    No practice rules found. Click <strong>Rule Add</strong> to create one.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = rules.map((rule, index) => {
        let badgeClass = "rule-type-active";
        if (rule.type === "Passive Alert") badgeClass = "rule-type-passive";
        if (rule.type === "Patient Reminder") badgeClass = "rule-type-reminder";

        const createdAtFormatted = rule.created_at ? new Date(rule.created_at).toLocaleString() : "N/A";

        return `
            <tr>
                <td style="text-align: center; font-weight: 600; color: #64748b;">${index + 1}</td>
                <td>
                    <span class="rule-type-badge ${badgeClass}">${escapeHtml(rule.type)}</span>
                </td>
                <td style="font-weight: 600; color: #0f172a;">${escapeHtml(rule.title)}</td>
                <td>${escapeHtml(rule.created_by_name || "System")}</td>
                <td style="color: #64748b; font-size: 13px;">${createdAtFormatted}</td>
                <td style="text-align: center;">
                    <div class="action-btn-group" style="justify-content: center;">
                        <button class="btn-action-summary" data-action="summary" data-id="${rule.id}">Summary</button>
                        <button class="btn-action-edit" data-action="edit" data-id="${rule.id}">Edit</button>
                        <button class="btn-action-delete" data-action="delete" data-id="${rule.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    // Attach row action listeners
    tableBody.querySelectorAll("button[data-action]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const action = btn.getAttribute("data-action");
            const id = parseInt(btn.getAttribute("data-id"), 10);
            const targetRule = rulesList.find(r => r.id === id);

            if (action === "summary") {
                openSummaryModal(id);
            } else if (action === "edit" && targetRule) {
                openFormModal(targetRule);
            } else if (action === "delete" && targetRule) {
                openDeleteModal(targetRule);
            }
        });
    });
}

/**
 * Bind modal toggles and form handlers.
 */
function bindEvents() {
    const openAddBtn = document.getElementById("openAddRuleBtn");
    const closeFormModalBtn = document.getElementById("closeFormModalBtn");
    const cancelFormBtn = document.getElementById("cancelFormBtn");
    const ruleForm = document.getElementById("practiceRuleForm");

    const closeSummaryBtn = document.getElementById("closeSummaryModalBtn");
    const closeDeleteBtn = document.getElementById("closeDeleteModalBtn");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

    if (openAddBtn) openAddBtn.onclick = () => openFormModal(null);
    if (closeFormModalBtn) closeFormModalBtn.onclick = hideFormModal;
    if (cancelFormBtn) cancelFormBtn.onclick = hideFormModal;

    if (closeSummaryBtn) closeSummaryBtn.onclick = hideSummaryModal;
    if (closeDeleteBtn) closeDeleteBtn.onclick = hideDeleteModal;
    if (cancelDeleteBtn) cancelDeleteBtn.onclick = hideDeleteModal;

    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = async () => {
            if (!deleteTargetId) return;
            try {
                const response = await api(`/practice-rules/${deleteTargetId}`, {
                    method: "DELETE"
                });
                if (response.success) {
                    showToast("Rule soft deleted successfully.", "success");
                    hideDeleteModal();
                    loadRulesList();
                } else {
                    showToast(response.message || "Failed to soft delete rule.", "error");
                }
            } catch (err) {
                console.error("Delete error:", err);
                showToast("Error executing soft delete.", "error");
            }
        };
    }

    if (ruleForm) {
        ruleForm.onsubmit = async (e) => {
            e.preventDefault();
            clearErrors();

            const ruleId = document.getElementById("ruleId").value;
            
            // Build payload
            const payload = {
                title: document.getElementById("ruleTitle").value.trim(),
                type: document.getElementById("ruleType").value,
                date_last_reviewed: document.getElementById("dateLastReviewed").value || null,
                developer: document.getElementById("ruleDeveloper").value.trim() || null,
                funding_source: document.getElementById("fundingSource").value.trim() || null,
                release_info: document.getElementById("releaseInfo").value.trim() || null,
                bibliographic_citation: document.getElementById("bibliographicCitation").value.trim() || null,
                web_reference: document.getElementById("webReference").value.trim() || null,
                referential_cds: document.getElementById("referentialCds").value.trim() || null,

                use_patient_race: document.getElementById("usePatientRace").value.trim() || null,
                use_patient_ethnicity: document.getElementById("usePatientEthnicity").value.trim() || null,
                use_patient_language: document.getElementById("usePatientLanguage").value.trim() || null,
                use_patient_sexual_orientation: document.getElementById("usePatientSexualOrientation").value.trim() || null,
                use_patient_gender_identity: document.getElementById("usePatientGenderIdentity").value.trim() || null,
                use_patient_sex: document.getElementById("usePatientSex").value.trim() || null,
                use_patient_dob: document.getElementById("usePatientDob").value.trim() || null,
                use_patient_sdoh: document.getElementById("usePatientSdoh").value.trim() || null,
                use_patient_health_status_assessments: document.getElementById("usePatientHealthStatusAssessments").value.trim() || null,

                reminder_intervals: {
                    clinical_warning_val: document.getElementById("clinicalWarningVal").value || "2",
                    clinical_warning_unit: document.getElementById("clinicalWarningUnit").value || "Week",
                    clinical_past_due_val: document.getElementById("clinicalPastDueVal").value || "1",
                    clinical_past_due_unit: document.getElementById("clinicalPastDueUnit").value || "Month",

                    patient_warning_val: document.getElementById("patientWarningVal").value || "2",
                    patient_warning_unit: document.getElementById("patientWarningUnit").value || "Week",
                    patient_past_due_val: document.getElementById("patientPastDueVal").value || "1",
                    patient_past_due_unit: document.getElementById("patientPastDueUnit").value || "Month"
                },

                demographics_criteria: [{
                    criteria: document.getElementById("demoCriteria").value.trim() || "Age Min (Years)",
                    characteristics: document.getElementById("demoCharacteristics").value.trim() || "50",
                    requirements: document.getElementById("demoRequirements").value.trim() || "Required Inclusion"
                }],

                clinical_targets: [{
                    criteria: document.getElementById("targetCriteria").value.trim() || "Assessment - Colon Cancer Screening",
                    characteristics: document.getElementById("targetCharacteristics").value.trim() || "Completed: Yes | Frequency: >= 1 | Interval: 1 x Months",
                    requirements: document.getElementById("targetReq").value.trim() || "Required Inclusion"
                }],

                actions_list: [{
                    category_title: document.getElementById("actionTitle").value.trim() || "Assessment - Colon Cancer Screening"
                }]
            };

            const categoryPrefix = document.getElementById("ruleCategory").value.trim();
            if (categoryPrefix && !payload.title.startsWith(categoryPrefix)) {
                payload.title = `${categoryPrefix}: ${payload.title}`;
            }

            const endpoint = ruleId ? `/practice-rules/${ruleId}` : "/practice-rules";
            const method = ruleId ? "PUT" : "POST";

            try {
                const response = await api(endpoint, {
                    method: method,
                    body: JSON.stringify(payload)
                });

                if (response.success) {
                    showToast(ruleId ? "Rule updated successfully!" : "Rule added successfully!", "success");
                    hideFormModal();
                    loadRulesList();
                } else {
                    if (response.errors) {
                        for (const key in response.errors) {
                            const errEl = document.getElementById(`error_${key}`);
                            if (errEl) errEl.textContent = response.errors[key];
                        }
                    }
                    showToast(response.message || "Please check the form inputs.", "error");
                }
            } catch (err) {
                console.error("Form submit error:", err);
                showToast("Server communication error.", "error");
            }
        };
    }
}

/**
 * Open Form Modal for Create or Edit
 */
function openFormModal(rule = null) {
    clearErrors();
    const modal = document.getElementById("ruleFormModal");
    const modalTitle = document.getElementById("modalFormTitle");
    
    document.getElementById("ruleId").value = rule ? rule.id : "";
    document.getElementById("ruleTitle").value = rule ? rule.title : "";
    document.getElementById("ruleType").value = rule ? rule.type : "Active Alert";
    document.getElementById("dateLastReviewed").value = rule ? (rule.date_last_reviewed || "") : "";
    document.getElementById("ruleDeveloper").value = rule ? (rule.developer || "") : "";
    document.getElementById("fundingSource").value = rule ? (rule.funding_source || "") : "";
    document.getElementById("releaseInfo").value = rule ? (rule.release_info || "") : "";
    document.getElementById("bibliographicCitation").value = rule ? (rule.bibliographic_citation || "") : "";
    document.getElementById("webReference").value = rule ? (rule.web_reference || "") : "";
    document.getElementById("referentialCds").value = rule ? (rule.referential_cds || "") : "";

    document.getElementById("usePatientRace").value = rule ? (rule.use_patient_race || "") : "";
    document.getElementById("usePatientEthnicity").value = rule ? (rule.use_patient_ethnicity || "") : "";
    document.getElementById("usePatientLanguage").value = rule ? (rule.use_patient_language || "") : "";
    document.getElementById("usePatientSexualOrientation").value = rule ? (rule.use_patient_sexual_orientation || "") : "";
    document.getElementById("usePatientGenderIdentity").value = rule ? (rule.use_patient_gender_identity || "") : "";
    document.getElementById("usePatientSex").value = rule ? (rule.use_patient_sex || "") : "";
    document.getElementById("usePatientDob").value = rule ? (rule.use_patient_dob || "") : "";
    document.getElementById("usePatientSdoh").value = rule ? (rule.use_patient_sdoh || "") : "";
    document.getElementById("usePatientHealthStatusAssessments").value = rule ? (rule.use_patient_health_status_assessments || "") : "";

    const intervals = rule && rule.reminder_intervals ? rule.reminder_intervals : {};
    document.getElementById("clinicalWarningVal").value = intervals.clinical_warning_val || "2";
    document.getElementById("clinicalWarningUnit").value = intervals.clinical_warning_unit || "Week";
    document.getElementById("clinicalPastDueVal").value = intervals.clinical_past_due_val || "1";
    document.getElementById("clinicalPastDueUnit").value = intervals.clinical_past_due_unit || "Month";

    document.getElementById("patientWarningVal").value = intervals.patient_warning_val || "2";
    document.getElementById("patientWarningUnit").value = intervals.patient_warning_unit || "Week";
    document.getElementById("patientPastDueVal").value = intervals.patient_past_due_val || "1";
    document.getElementById("patientPastDueUnit").value = intervals.patient_past_due_unit || "Month";

    const demo = rule && Array.isArray(rule.demographics_criteria) && rule.demographics_criteria.length > 0 ? rule.demographics_criteria[0] : {};
    document.getElementById("demoCriteria").value = demo.criteria || "Age Min (Years)";
    document.getElementById("demoCharacteristics").value = demo.characteristics || "50";
    document.getElementById("demoRequirements").value = demo.requirements || "Required Inclusion";

    const target = rule && Array.isArray(rule.clinical_targets) && rule.clinical_targets.length > 0 ? rule.clinical_targets[0] : {};
    document.getElementById("targetCriteria").value = target.criteria || "Assessment - Colon Cancer Screening";
    document.getElementById("targetCharacteristics").value = target.characteristics || "Completed: Yes | Frequency: >= 1 | Interval: 1 x Months";
    document.getElementById("targetReq").value = target.requirements || "Required Inclusion";

    const act = rule && Array.isArray(rule.actions_list) && rule.actions_list.length > 0 ? rule.actions_list[0] : {};
    document.getElementById("actionTitle").value = act.category_title || "Assessment - Colon Cancer Screening";

    modalTitle.textContent = rule ? "Rule Edit" : "Rule Add";
    modal.classList.add("active");
}

function hideFormModal() {
    const modal = document.getElementById("ruleFormModal");
    if (modal) modal.classList.remove("active");
}

/**
 * Open Rule Summary Modal
 */
async function openSummaryModal(ruleId) {
    const modal = document.getElementById("ruleSummaryModal");
    const container = document.getElementById("summaryModalContent");
    if (!modal || !container) return;

    container.innerHTML = '<div style="text-align:center; padding: 30px; color: #64748b;">Loading summary...</div>';
    modal.classList.add("active");

    try {
        const response = await api(`/practice-rules/${ruleId}`);
        if (response.success && response.data) {
            const r = response.data;
            
            const valOrFallback = (val) => val && String(val).trim() !== "" ? escapeHtml(val) : DEFAULT_UNKNOWN;

            // Reminder Intervals format
            const ri = r.reminder_intervals || {};
            const clinicalWarnVal = ri.clinical_warning_val || ri.clinical_warning || "2";
            const clinicalWarnUnit = ri.clinical_warning_unit || "Week";
            const clinicalPastVal = ri.clinical_past_due_val || ri.clinical_past_due || "1";
            const clinicalPastUnit = ri.clinical_past_due_unit || "Month";

            const patientWarnVal = ri.patient_warning_val || ri.patient_warning || "2";
            const patientWarnUnit = ri.patient_warning_unit || "Week";
            const patientPastVal = ri.patient_past_due_val || ri.patient_past_due || "1";
            const patientPastUnit = ri.patient_past_due_unit || "Month";

            const clinicalDetail = `Warning: ${clinicalWarnVal} ${clinicalWarnUnit}s, Past due: ${clinicalPastVal} ${clinicalPastUnit}s`;
            const patientDetail = `Warning: ${patientWarnVal} ${patientWarnUnit}s, Past due: ${patientPastVal} ${patientPastUnit}s`;

            const demoList = Array.isArray(r.demographics_criteria) && r.demographics_criteria.length > 0 ? r.demographics_criteria : [
                { criteria: "Age Min (Years)", characteristics: "50", requirements: "Required Inclusion" }
            ];

            const targetList = Array.isArray(r.clinical_targets) && r.clinical_targets.length > 0 ? r.clinical_targets : [
                { criteria: "Assessment - Colon Cancer Screening", characteristics: "Completed: Yes | Frequency: >= 1 | Interval: 1 x Months", requirements: "Required Inclusion" }
            ];

            const actionList = Array.isArray(r.actions_list) && r.actions_list.length > 0 ? r.actions_list : [
                { category_title: "Assessment - Colon Cancer Screening" }
            ];

            container.innerHTML = `
                <div style="font-family: inherit; font-size: 14px; line-height: 1.6; color: #1e293b;">
                    <div style="margin-bottom: 20px;">
                        <span style="font-size: 16px; font-weight: 700; color: #0f172a;">Summary</span>
                        <a style="color: var(--accent); text-decoration: underline; cursor: pointer; margin-left: 6px; font-size: 13px;" id="summaryEditBtn">(edit)</a>
                    </div>

                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                        ${escapeHtml(r.title)} (${escapeHtml(r.type)})
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
                        <div><strong>Bibliographic Citation:</strong> <span style="color: #475569;">${valOrFallback(r.bibliographic_citation)}</span></div>
                        <div><strong>Developer:</strong> <span style="color: #475569;">${valOrFallback(r.developer)}</span></div>
                        <div><strong>Funding Source:</strong> <span style="color: #475569;">${valOrFallback(r.funding_source)}</span></div>
                        <div><strong>Release:</strong> <span style="color: #475569;">${valOrFallback(r.release_info)}</span></div>
                        <div><strong>Web Reference:</strong> <span style="color: #475569;">${valOrFallback(r.web_reference)}</span></div>
                        <div><strong>Referential CDS (codetype:code):</strong> <span style="color: #475569;">${valOrFallback(r.referential_cds)}</span></div>

                        <div style="margin-top: 10px;"><strong>Use of Patient's Race:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_race)}</span></div>
                        <div><strong>Use of Patient's Ethnicity:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_ethnicity)}</span></div>
                        <div><strong>Use of Patient's Language:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_language)}</span></div>
                        <div><strong>Use of Patient's Sexual Orientation:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_sexual_orientation)}</span></div>
                        <div><strong>Use of Patient's Gender Identity:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_gender_identity)}</span></div>
                        <div><strong>Use of Patient's Sex:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_sex)}</span></div>
                        <div><strong>Use of Patient's Date of Birth:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_dob)}</span></div>
                        <div><strong>Use of Patient's Social Determinants of Health:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_sdoh)}</span></div>
                        <div><strong>Use of Patient's Health Status Assessments:</strong> <span style="color: #475569;">${valOrFallback(r.use_patient_health_status_assessments)}</span></div>
                    </div>

                    <!-- Reminder Intervals -->
                    <div style="margin-bottom: 24px;">
                        <div style="font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 8px;">
                            Reminder intervals <span style="color: var(--accent); font-size: 13px; font-weight: normal;">(edit)</span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                            <thead>
                                <tr style="background: #f1f5f9; text-align: left;">
                                    <th style="padding: 10px 14px; font-size: 13px; font-weight: 700; width: 140px;">Type</th>
                                    <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px 14px; font-weight: 600;">Clinical</td>
                                    <td style="padding: 10px 14px; color: #334155;">${escapeHtml(clinicalDetail)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 14px; font-weight: 600;">Patient</td>
                                    <td style="padding: 10px 14px; color: #334155;">${escapeHtml(patientDetail)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Demographics Filter Criteria -->
                    <div style="margin-bottom: 24px;">
                        <div style="font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 8px;">
                            Demographics filter criteria <span style="color: var(--accent); font-size: 13px; font-weight: normal;">(add)</span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                            <thead>
                                <tr style="background: #f1f5f9; text-align: left;">
                                    <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Criteria</th>
                                    <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Characteristics</th>
                                    <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Requirements</th>
                                    <th style="padding: 10px 14px; font-size: 13px; font-weight: 700; width: 100px; text-align: center;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${demoList.map(item => `
                                    <tr>
                                        <td style="padding: 10px 14px; font-weight: 600;">${escapeHtml(item.criteria)}</td>
                                        <td style="padding: 10px 14px; color: #334155;">${escapeHtml(item.characteristics)}</td>
                                        <td style="padding: 10px 14px; color: #334155;">${escapeHtml(item.requirements)}</td>
                                        <td style="padding: 10px 14px; text-align: center;">
                                            <span style="color: var(--accent); font-size: 12px; cursor: pointer; margin-right: 6px;">(edit)</span>
                                            <span style="color: #ef4444; font-size: 12px; cursor: pointer;">(delete)</span>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>

                    <!-- Target/Action Groups -->
                    <div style="margin-bottom: 16px;">
                        <div style="font-weight: 700; font-size: 16px; color: #0f172a; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                            Target/Action Groups
                        </div>

                        <div style="margin-bottom: 16px;">
                            <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 8px;">
                                Clinical targets <span style="color: var(--accent); font-size: 13px; font-weight: normal;">(add)</span>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Criteria</th>
                                        <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Characteristics</th>
                                        <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Requirements</th>
                                        <th style="padding: 10px 14px; font-size: 13px; font-weight: 700; width: 100px; text-align: center;">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${targetList.map(item => `
                                        <tr>
                                            <td style="padding: 10px 14px; font-weight: 600;">${escapeHtml(item.criteria)}</td>
                                            <td style="padding: 10px 14px; color: #334155; font-size: 13px;">${escapeHtml(item.characteristics)}</td>
                                            <td style="padding: 10px 14px; color: #334155;">${escapeHtml(item.requirements)}</td>
                                            <td style="padding: 10px 14px; text-align: center;">
                                                <span style="color: var(--accent); font-size: 12px; cursor: pointer; margin-right: 6px;">(edit)</span>
                                                <span style="color: #ef4444; font-size: 12px; cursor: pointer;">(delete)</span>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 8px;">
                                Actions <span style="color: var(--accent); font-size: 13px; font-weight: normal;">(add)</span>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 10px 14px; font-size: 13px; font-weight: 700;">Category/Title</th>
                                        <th style="padding: 10px 14px; font-size: 13px; font-weight: 700; width: 100px; text-align: center;">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${actionList.map(item => `
                                        <tr>
                                            <td style="padding: 10px 14px; font-weight: 600;">${escapeHtml(item.category_title)}</td>
                                            <td style="padding: 10px 14px; text-align: center;">
                                                <span style="color: var(--accent); font-size: 12px; cursor: pointer; margin-right: 6px;">(edit)</span>
                                                <span style="color: #ef4444; font-size: 12px; cursor: pointer;">(delete)</span>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            const summaryEditBtn = document.getElementById("summaryEditBtn");
            if (summaryEditBtn) {
                summaryEditBtn.onclick = () => {
                    hideSummaryModal();
                    openFormModal(r);
                };
            }
        } else {
            container.innerHTML = '<div style="color: #ef4444; padding: 20px;">Failed to load rule summary.</div>';
        }
    } catch (err) {
        console.error("Summary error:", err);
        container.innerHTML = '<div style="color: #ef4444; padding: 20px;">Error loading summary data.</div>';
    }
}

function hideSummaryModal() {
    const modal = document.getElementById("ruleSummaryModal");
    if (modal) modal.classList.remove("active");
}

function openDeleteModal(rule) {
    deleteTargetId = rule.id;
    const modal = document.getElementById("confirmDeleteModal");
    const nameEl = document.getElementById("deleteRuleName");
    if (nameEl) nameEl.textContent = `"${rule.title}"`;
    if (modal) modal.classList.add("active");
}

function hideDeleteModal() {
    deleteTargetId = null;
    const modal = document.getElementById("confirmDeleteModal");
    if (modal) modal.classList.remove("active");
}

function clearErrors() {
    document.querySelectorAll(".form-error").forEach(el => el.textContent = "");
}

function showToast(message, type = "info") {
    const container = document.getElementById("ruleToastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `rule-toast ${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
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
