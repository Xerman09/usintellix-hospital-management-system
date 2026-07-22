export function PracticeRulesView() {
    return `
<div class="rules-view-container" style="padding: 24px;">
    <!-- Header Section -->
    <div class="rules-header">
        <div>
            <h2>Admin / Practice / Rules</h2>
            <p>Clinical decision support rules, alerts, and patient reminder criteria.</p>
        </div>
        <button id="openAddRuleBtn" class="btn-add-rule">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Rule Add
        </button>
    </div>

    <!-- Data Table Container -->
    <div class="rules-table-container">
        <table class="rules-table">
            <thead>
                <tr>
                    <th style="width: 60px; text-align: center;">No</th>
                    <th style="width: 150px;">Type</th>
                    <th>Name</th>
                    <th style="width: 160px;">Created By</th>
                    <th style="width: 170px;">Created At</th>
                    <th style="width: 220px; text-align: center;">Action</th>
                </tr>
            </thead>
            <tbody id="rulesTableBody">
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                        Loading practice rules...
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Rule Add / Edit Modal -->
    <div id="ruleFormModal" class="custom-modal-overlay">
        <div class="custom-modal-container" style="max-width: 850px;">
            <div class="modal-header-bar">
                <h3 id="modalFormTitle">Rule Add</h3>
                <button class="modal-close-btn" id="closeFormModalBtn">&times;</button>
            </div>
            <div class="modal-body-content">
                <form id="practiceRuleForm">
                    <input type="hidden" id="ruleId" value="">
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="ruleCategory">Category Prefix (Optional)</label>
                            <input type="text" id="ruleCategory" class="form-input" placeholder="e.g. Cancer Screening">
                        </div>

                        <div class="form-group">
                            <label for="ruleType">Type <span style="color: #ef4444;">*</span></label>
                            <select id="ruleType" class="form-input" required>
                                <option value="Active Alert">Active Alert</option>
                                <option value="Passive Alert">Passive Alert</option>
                                <option value="Patient Reminder">Patient Reminder</option>
                            </select>
                            <span class="form-error" id="error_type"></span>
                        </div>

                        <div class="form-group full">
                            <label for="ruleTitle">Title / Name <span style="color: #ef4444;">*</span></label>
                            <input type="text" id="ruleTitle" class="form-input" placeholder="e.g. Colon Cancer Screening" required>
                            <span class="form-error" id="error_title"></span>
                        </div>

                        <div class="form-group">
                            <label for="ruleDeveloper">Developer</label>
                            <input type="text" id="ruleDeveloper" class="form-input" placeholder="Leave empty for default fallback info">
                        </div>

                        <div class="form-group">
                            <label for="fundingSource">Funding Source</label>
                            <input type="text" id="fundingSource" class="form-input" placeholder="Leave empty for default fallback info">
                        </div>

                        <div class="form-group">
                            <label for="releaseInfo">Release</label>
                            <input type="text" id="releaseInfo" class="form-input" placeholder="Leave empty for default fallback info">
                        </div>

                        <div class="form-group">
                            <label for="dateLastReviewed">Date of Last Review or Update</label>
                            <input type="date" id="dateLastReviewed" class="form-input">
                        </div>

                        <div class="form-group full">
                            <label for="bibliographicCitation">Bibliographic Citation</label>
                            <input type="text" id="bibliographicCitation" class="form-input" placeholder="Leave empty for default fallback info">
                        </div>

                        <div class="form-group full">
                            <label for="webReference">Web Reference</label>
                            <input type="text" id="webReference" class="form-input" placeholder="Leave empty for default fallback info">
                        </div>

                        <div class="form-group full">
                            <label for="referentialCds">Referential CDS (codetype:code)</label>
                            <textarea id="referentialCds" class="form-input" rows="2" style="height: auto; padding: 12px;" placeholder="Leave empty for default fallback info"></textarea>
                        </div>

                        <!-- Rule Usage Specs -->
                        <div class="form-group full">
                            <label style="font-weight: 700; color: #1e293b; margin-bottom: 8px;">Demographic & Clinical Rule Usages (Leave blank for default fallback message):</label>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Race</label>
                                    <input type="text" id="usePatientRace" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Ethnicity</label>
                                    <input type="text" id="usePatientEthnicity" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Language</label>
                                    <input type="text" id="usePatientLanguage" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Sexual Orientation</label>
                                    <input type="text" id="usePatientSexualOrientation" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Gender Identity</label>
                                    <input type="text" id="usePatientGenderIdentity" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Sex</label>
                                    <input type="text" id="usePatientSex" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Date of Birth</label>
                                    <input type="text" id="usePatientDob" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div>
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Social Determinants of Health</label>
                                    <input type="text" id="usePatientSdoh" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                                <div style="grid-column: 1 / -1;">
                                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Use of Patient's Health Status Assessments</label>
                                    <input type="text" id="usePatientHealthStatusAssessments" class="form-input" style="height: 42px; font-size: 13px;" placeholder="Custom usage info or leave blank">
                                </div>
                            </div>
                        </div>

                        <!-- Reminder Intervals Section (Matching User Image Specification) -->
                        <div class="form-group full" style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            <label style="font-weight: 700; color: #1e293b; font-size: 16px; margin-bottom: 12px; display: block;">Reminder intervals</label>
                            
                            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #cbd5e1;">
                                        <th style="padding: 8px 12px; font-size: 14px; font-weight: 600; color: #334155; width: 140px; text-decoration: underline;">Type</th>
                                        <th style="padding: 8px 12px; font-size: 14px; font-weight: 600; color: #334155; width: 140px; text-decoration: underline;">Detail</th>
                                        <th style="padding: 8px 12px;"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Row 1: Clinical Warning -->
                                    <tr>
                                        <td style="padding: 10px 12px; font-weight: 500; color: #0f172a;"><span style="color: #ef4444;">*</span>Clinical</td>
                                        <td style="padding: 10px 12px; color: #334155; font-weight: 500;">Warning</td>
                                        <td style="padding: 10px 12px;">
                                            <div style="display: flex; gap: 8px; max-width: 450px;">
                                                <input type="number" id="clinicalWarningVal" class="form-input" style="height: 42px; flex: 2;" value="2" min="1" required>
                                                <select id="clinicalWarningUnit" class="form-input" style="height: 42px; flex: 1;">
                                                    <option value="Day">Day</option>
                                                    <option value="Week" selected>Week</option>
                                                    <option value="Month">Month</option>
                                                    <option value="Year">Year</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Row 2: Clinical Past due -->
                                    <tr>
                                        <td style="padding: 10px 12px; font-weight: 500; color: #0f172a;"><span style="color: #ef4444;">*</span>Clinical</td>
                                        <td style="padding: 10px 12px; color: #334155; font-weight: 500;">Past due</td>
                                        <td style="padding: 10px 12px;">
                                            <div style="display: flex; gap: 8px; max-width: 450px;">
                                                <input type="number" id="clinicalPastDueVal" class="form-input" style="height: 42px; flex: 2;" value="1" min="1" required>
                                                <select id="clinicalPastDueUnit" class="form-input" style="height: 42px; flex: 1;">
                                                    <option value="Day">Day</option>
                                                    <option value="Week">Week</option>
                                                    <option value="Month" selected>Month</option>
                                                    <option value="Year">Year</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Row 3: Patient Warning -->
                                    <tr>
                                        <td style="padding: 10px 12px; font-weight: 500; color: #0f172a;"><span style="color: #ef4444;">*</span>Patient</td>
                                        <td style="padding: 10px 12px; color: #334155; font-weight: 500;">Warning</td>
                                        <td style="padding: 10px 12px;">
                                            <div style="display: flex; gap: 8px; max-width: 450px;">
                                                <input type="number" id="patientWarningVal" class="form-input" style="height: 42px; flex: 2;" value="2" min="1" required>
                                                <select id="patientWarningUnit" class="form-input" style="height: 42px; flex: 1;">
                                                    <option value="Day">Day</option>
                                                    <option value="Week" selected>Week</option>
                                                    <option value="Month">Month</option>
                                                    <option value="Year">Year</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Row 4: Patient Past due -->
                                    <tr>
                                        <td style="padding: 10px 12px; font-weight: 500; color: #0f172a;"><span style="color: #ef4444;">*</span>Patient</td>
                                        <td style="padding: 10px 12px; color: #334155; font-weight: 500;">Past due</td>
                                        <td style="padding: 10px 12px;">
                                            <div style="display: flex; gap: 8px; max-width: 450px;">
                                                <input type="number" id="patientPastDueVal" class="form-input" style="height: 42px; flex: 2;" value="1" min="1" required>
                                                <select id="patientPastDueUnit" class="form-input" style="height: 42px; flex: 1;">
                                                    <option value="Day">Day</option>
                                                    <option value="Week">Week</option>
                                                    <option value="Month" selected>Month</option>
                                                    <option value="Year">Year</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div style="font-size: 12px; color: #64748b; margin-top: 10px;"><span style="color: #ef4444;">*</span>Required fields</div>
                        </div>

                        <!-- Demographics Filter Criteria -->
                        <div class="form-group full" style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                            <label style="font-weight: 700; color: #1e293b;">Demographics Filter Criteria</label>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 10px; margin-top: 8px;">
                                <input type="text" id="demoCriteria" class="form-input" style="height: 40px; font-size: 13px;" placeholder="Criteria: e.g. Age Min (Years)">
                                <input type="text" id="demoCharacteristics" class="form-input" style="height: 40px; font-size: 13px;" placeholder="Characteristics: e.g. 50">
                                <input type="text" id="demoRequirements" class="form-input" style="height: 40px; font-size: 13px;" placeholder="Requirements: e.g. Required Inclusion">
                            </div>
                        </div>

                        <!-- Target / Action Groups -->
                        <div class="form-group full" style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                            <label style="font-weight: 700; color: #1e293b;">Target / Action Groups</label>
                            <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 12px;">
                                <div>
                                    <span style="font-size: 13px; font-weight: 600; color: #475569;">Clinical Targets</span>
                                    <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 10px; margin-top: 4px;">
                                        <input type="text" id="targetCriteria" class="form-input" style="height: 40px; font-size: 13px;" placeholder="Criteria: Assessment - Colon Cancer Screening">
                                        <input type="text" id="targetReq" class="form-input" style="height: 40px; font-size: 13px;" placeholder="Requirements: Required Inclusion">
                                        <input type="text" id="targetCharacteristics" class="form-input" style="height: 40px; font-size: 13px;" placeholder="Completed: Yes | Frequency: >= 1 | Interval: 1 x Months">
                                    </div>
                                </div>
                                <div>
                                    <span style="font-size: 13px; font-weight: 600; color: #475569;">Actions</span>
                                    <input type="text" id="actionTitle" class="form-input" style="height: 40px; font-size: 13px; margin-top: 4px;" placeholder="Category/Title: Assessment - Colon Cancer Screening">
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="form-actions" style="margin-top: 24px;">
                        <button type="button" class="btn-secondary" id="cancelFormBtn">Cancel</button>
                        <button type="submit" class="login-btn" id="saveRuleBtn" style="flex: 1;">Save Rule</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Rule Summary Modal (Styled to match sample summary) -->
    <div id="ruleSummaryModal" class="custom-modal-overlay">
        <div class="custom-modal-container" style="max-width: 850px;">
            <div class="modal-header-bar">
                <h3>Summary</h3>
                <button class="modal-close-btn" id="closeSummaryModalBtn">&times;</button>
            </div>
            <div class="modal-body-content" id="summaryModalContent" style="background: #ffffff; color: #1e293b;">
                <!-- Dynamically injected summary -->
            </div>
        </div>
    </div>

    <!-- Soft Delete Confirmation Modal -->
    <div id="confirmDeleteModal" class="custom-modal-overlay">
        <div class="custom-modal-container" style="max-width: 440px;">
            <div class="modal-header-bar">
                <h3 style="color: #ef4444;">Delete Practice Rule</h3>
                <button class="modal-close-btn" id="closeDeleteModalBtn">&times;</button>
            </div>
            <div class="modal-body-content" style="text-align: center; padding: 28px;">
                <div style="width: 56px; height: 56px; background: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
                <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a;">Are you sure you want to soft delete this rule?</h4>
                <p id="deleteRuleName" style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;"></p>
                <div style="display: flex; gap: 12px;">
                    <button class="btn-secondary" id="cancelDeleteBtn" style="height: 44px;">Cancel</button>
                    <button class="btn-action-delete" id="confirmDeleteBtn" style="flex: 1; height: 44px; font-size: 14px;">Confirm Soft Delete</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Notification Holder -->
    <div id="ruleToastContainer"></div>
</div>
`;
}
