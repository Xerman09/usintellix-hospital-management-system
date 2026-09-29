/**
 * Eye Exam View component HTML template and CSS styles.
 * Renders the comprehensive OpenEMR-style Ophthalmology/Optometry examination form.
 */

export const EYE_EXAM_STYLES = `
/* Eye Exam Form Styles */
.eye-exam-container {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
    margin-top: 12px;
    font-size: 13px;
    color: var(--text-primary, #1e293b);
}

.eye-exam-top-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    padding-bottom: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
}

.eye-exam-subnav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    padding-bottom: 8px;
}

.eye-exam-subnav-btn {
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted, #64748b);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.eye-exam-subnav-btn:hover {
    background: var(--accent-light, #eff6ff);
    color: var(--accent-text, #1d4ed8);
}

.eye-exam-subnav-btn.active {
    background: var(--accent, #1d4ed8);
    color: #ffffff;
    border-color: var(--accent, #1d4ed8);
}

.eye-exam-btn-close {
    cursor: pointer;
    font-size: 11px;
    padding: 2px 5px;
    border-radius: 4px;
    line-height: 1;
}

.eye-exam-btn-close:hover {
    background: rgba(0, 0, 0, 0.15);
}

.eye-exam-action-bar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
}

.eye-exam-btn {
    background: var(--bg-surface-alt, #f1f5f9);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary, #334155);
    cursor: pointer;
    transition: all 0.15s ease;
}

.eye-exam-btn:hover {
    background: var(--accent-light, #e2e8f0);
}

.eye-exam-btn-primary {
    background: var(--accent, #1d4ed8);
    color: #ffffff;
    border-color: var(--accent, #1d4ed8);
}

.eye-exam-btn-primary:hover {
    background: var(--accent-hover, #1e40af);
}

.eye-exam-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    margin-bottom: 16px;
    overflow: hidden;
}

.eye-exam-card-header {
    background: var(--bg-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    padding: 10px 14px;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-primary, #0f172a);
}

.eye-exam-card-body {
    padding: 14px;
}

.eye-exam-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

@media (max-width: 1024px) {
    .eye-exam-grid-2 {
        grid-template-columns: 1fr;
    }
}

.eye-exam-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-top: 6px;
}

.eye-exam-table th, .eye-exam-table td {
    border: 1px solid var(--border-color, #cbd5e1);
    padding: 6px 8px;
    text-align: left;
    vertical-align: middle;
}

.eye-exam-table th {
    background: var(--bg-surface-alt, #f1f5f9);
    font-weight: 600;
    color: var(--text-primary, #334155);
}

.eye-exam-input {
    width: 100%;
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text-primary, #1e293b);
    box-sizing: border-box;
}

.eye-exam-input:focus {
    outline: none;
    border-color: var(--accent, #1d4ed8);
}

.eye-exam-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
    font-size: 12px;
}

.eye-exam-radio-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-weight: 500;
}

.eye-exam-pill-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
}

.eye-exam-pill {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    background: var(--bg-surface-alt, #f1f5f9);
    border: 1px solid var(--border-color, #cbd5e1);
    cursor: pointer;
    color: var(--text-muted, #64748b);
}

.eye-exam-pill.active {
    background: var(--accent, #1d4ed8);
    color: #ffffff;
    border-color: var(--accent, #1d4ed8);
}

.eye-exam-strip {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 10px 0;
    margin-bottom: 16px;
}

.eye-exam-strip-box {
    flex: 1;
    min-width: 200px;
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    padding: 10px;
}

.eye-exam-strip-title {
    font-weight: 700;
    font-size: 12px;
    margin-bottom: 8px;
    color: var(--text-primary, #1e293b);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.eye-od-badge {
    background: #dbeafe;
    color: #1e40af;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
}

.eye-os-badge {
    background: #fef3c7;
    color: #92400e;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
}

:root[data-theme="dark"] .eye-od-badge {
    background: #1e3a8a;
    color: #bfdbfe;
}

:root[data-theme="dark"] .eye-os-badge {
    background: #78350f;
    color: #fde68a;
}
`;

export function renderEyeExamHtml(encounter, patient) {
    const pName = [patient?.first_name, patient?.middle_name, patient?.last_name].filter(Boolean).join(" ") || "Patient";
    const dob = patient?.date_of_birth ? patient.date_of_birth.slice(0, 10) : "-";
    const dos = encounter?.date_of_service ? encounter.date_of_service.slice(0, 10) : "-";
    const provider = encounter?.encounter_provider_name || encounter?.provider_name || "-";
    const reason = encounter?.reason_for_visit || encounter?.reason || "Comprehensive Eye Exam";

    return `
    <div id="eyeExamAlert"></div>

    <div class="eye-exam-container" id="eyeExamMainContainer">
        <!-- Top Toolbar & Header -->
        <div class="eye-exam-top-actions">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div style="font-size: 13px; font-weight: 700; color: var(--accent-text, #1d4ed8);">
                    OpenEMR Eye Exam Clinical Documentation
                </div>
                <div style="font-size: 11px; color: var(--text-muted, #64748b);">
                    ${pName} | DOB: ${dob} | DOS: ${dos} | Provider: ${provider} | Reason: ${reason}
                </div>
            </div>
            <div class="eye-exam-action-bar">
                <button type="button" class="eye-exam-btn" id="eyeExamDefaultsBtn">Defaults</button>
                <button type="button" class="eye-exam-btn" id="eyeExamQuickPicksBtn">Quick Picks</button>
                <button type="button" class="eye-exam-btn" id="eyeExamFirstVisitBtn">First visit: No Old Records</button>
                <button type="button" class="eye-exam-btn eye-exam-btn-primary" id="eyeExamSaveBtn">Save Eye Exam</button>
            </div>
        </div>

        <!-- SECTION 1: HPI & PMSFH -->
        <div class="eye-exam-grid-2">
            <!-- HPI Card -->
            <div class="eye-exam-card">
                <div class="eye-exam-card-header">
                    <span>HPI (History of Present Illness)</span>
                    <div class="eye-exam-pill-tabs" id="eyeExamCcTabs">
                        <button type="button" class="eye-exam-pill active" data-tab="cc1">CC 1</button>
                        <button type="button" class="eye-exam-pill" data-tab="cc2">CC 2</button>
                        <button type="button" class="eye-exam-pill" data-tab="cc3">CC 3</button>
                    </div>
                </div>
                <div class="eye-exam-card-body">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;" id="eyeExamCcLabel">Chief Complaint 1:</label>
                        <textarea class="eye-exam-input" id="eyeExam_cc" rows="2" placeholder="Primary complaint (e.g. blurry vision, dryness, eye strain)..."></textarea>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;">HPI Narrative Details:</label>
                        <textarea class="eye-exam-input" id="eyeExam_hpi_text" rows="3" placeholder="Onset, location, duration, characteristics, aggravating/relieving factors..."></textarea>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;">Chronic Problems / Medical History:</label>
                        <textarea class="eye-exam-input" id="eyeExam_chronic_problems" rows="2" placeholder="Hypertension, Diabetes, Glaucoma suspect, Macular degeneration..."></textarea>
                    </div>
                </div>
            </div>

            <!-- PMSFH Card -->
            <div class="eye-exam-card">
                <div class="eye-exam-card-header">
                    <span>PMSFH (Past Medical, Social, Family History & Meds)</span>
                </div>
                <div class="eye-exam-card-body">
                    <div class="eye-exam-radio-group">
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="POH" checked> POH</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="POS"> POS</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="EyeM"> EyeM</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="PMH"> PMH</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="Meds"> Meds</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="Surg"> Surg</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="All"> All</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="FH"> FH</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="Soc"> Soc</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="ROS"> ROS</label>
                    </div>
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <div>
                            <label style="font-size: 11px; font-weight: 600; display: block;">Medication / History:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_medication" placeholder="Name / condition">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 600; display: block;">Start:</label>
                            <input type="date" class="eye-exam-input" id="eyeExam_med_start">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 600; display: block;">Finish:</label>
                            <input type="date" class="eye-exam-input" id="eyeExam_med_finish">
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_is_eye_med"> Eye Med</label>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;">Comments / Dosing / Notes:</label>
                        <textarea class="eye-exam-input" id="eyeExam_pmsfh_comments" rows="2" placeholder="Dosage, compliance, side-effects..."></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 2: Physical Exam Strip (Mental Status, Vision, Tension, Amsler, Fields, Pupils) -->
        <div class="eye-exam-card">
            <div class="eye-exam-card-header">
                <span>Physical Exam Strip: Vision, Tension, Visual Fields & Pupils</span>
            </div>
            <div class="eye-exam-card-body" style="padding: 10px;">
                <div class="eye-exam-strip">
                    <!-- Mental Status -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Mental Status</div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_ms_alert" checked> Alert</label>
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_ms_oriented" checked> Oriented TPP</label>
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_ms_mood" checked> Mood/Affect Nml</label>
                        </div>
                    </div>

                    <!-- Vision Table -->
                    <div class="eye-exam-strip-box" style="flex: 2; min-width: 380px;">
                        <div class="eye-exam-strip-title">
                            <span>Vision / Refraction</span>
                            <span style="font-size: 10px; font-weight: normal; color: var(--text-muted);">OD (Right) / OS (Left)</span>
                        </div>
                        <table class="eye-exam-table">
                            <thead>
                                <tr>
                                    <th>Eye</th>
                                    <th>SC</th>
                                    <th>CC</th>
                                    <th>PH</th>
                                    <th>MR / AR</th>
                                    <th>Add</th>
                                    <th>VA</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span class="eye-od-badge">OD</span></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_sc_od" placeholder="20/40"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_cc_od" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_ph_od" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_mr_od" placeholder="-1.50 -0.50x180"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_add_od" placeholder="+2.00"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_va_od" placeholder="20/20"></td>
                                </tr>
                                <tr>
                                    <td><span class="eye-os-badge">OS</span></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_sc_os" placeholder="20/50"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_cc_os" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_ph_os" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_mr_os" placeholder="-1.75 -0.25x175"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_add_os" placeholder="+2.00"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_va_os" placeholder="20/20"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Tension / IOP -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Tension (IOP)</div>
                        <div style="margin-bottom: 6px;">
                            <label style="font-size: 11px;">Time:</label>
                            <input type="time" class="eye-exam-input" id="eyeExam_tension_time">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            <div>
                                <span class="eye-od-badge">OD</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_tension_od" placeholder="15 mmHg">
                            </div>
                            <div>
                                <span class="eye-os-badge">OS</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_tension_os" placeholder="16 mmHg">
                            </div>
                        </div>
                    </div>

                    <!-- Visual Fields & Amsler -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Fields & Amsler</div>
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_fields_ftcf" checked> FTCF Full OD/OS</label>
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_amsler_normal" checked> Amsler Normal</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_fields_notes" placeholder="Confrontation notes...">
                        </div>
                    </div>

                    <!-- Pupils -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Pupils (PERRLA)</div>
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_pupils_normal" checked> PERRL, No APD</label>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <span>Size:</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_pupils_od_size" placeholder="OD mm" style="width: 50px;">
                                <span>/</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_pupils_os_size" placeholder="OS mm" style="width: 50px;">
                            </div>
                            <input type="text" class="eye-exam-input" id="eyeExam_pupils_apd" placeholder="APD: None / Trace">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 3: External Exam & Anterior Segment -->
        <div class="eye-exam-grid-2">
            <!-- External Exam Card -->
            <div class="eye-exam-card">
                <div class="eye-exam-card-header">
                    <span>External Exam</span>
                </div>
                <div class="eye-exam-card-body">
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Structure</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Brow</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_brow" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_brow" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Upper Lids</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_upper_lids" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_upper_lids" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Lower Lids</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_lower_lids" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_lower_lids" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Medial Canthi</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_canthi" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_canthi" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Adnexa</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_adnoxa" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_adnoxa" value="Normal"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">
                        <div>
                            <label style="font-size: 11px;">Lev Fn:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_ext_lev_fn" placeholder="mm">
                        </div>
                        <div>
                            <label style="font-size: 11px;">MRD:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_ext_mrd" placeholder="mm">
                        </div>
                        <div>
                            <label style="font-size: 11px;">Vert Fissure:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_ext_vert_fissure" placeholder="mm">
                        </div>
                    </div>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_ext_comments" rows="2" placeholder="External exam comments / cranial nerves notes..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Anterior Segment Card -->
            <div class="eye-exam-card">
                <div class="eye-exam-card-header">
                    <span>Anterior Segment (Slit Lamp)</span>
                </div>
                <div class="eye-exam-card-body">
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Structure</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Conj / Sclera</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_conj" value="Clear / White"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_conj" value="Clear / White"></td>
                            </tr>
                            <tr>
                                <td>Cornea</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_cornea" value="Clear, no infiltrate"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_cornea" value="Clear, no infiltrate"></td>
                            </tr>
                            <tr>
                                <td>A/C</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_ac" value="Deep & Quiet, no C/F"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_ac" value="Deep & Quiet, no C/F"></td>
                            </tr>
                            <tr>
                                <td>Lens</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_lens" value="Clear"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_lens" value="Clear"></td>
                            </tr>
                            <tr>
                                <td>Iris</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_iris" value="Flat & Intact, round pupil"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_iris" value="Flat & Intact, round pupil"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="margin-top: 8px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <span style="font-weight: 600; font-size: 11px;">Dilation:</span>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_dil_trop"> Tropicamide 1%</label>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_dil_phen"> Phenylephrine 2.5%</label>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_dil_cyclo"> Cyclopentolate 1%</label>
                        <input type="time" class="eye-exam-input" id="eyeExam_dil_time" style="width: 100px;">
                    </div>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_ant_comments" rows="2" placeholder="TBUT, Pachymetry, Gonioscopy, Anterior segment comments..."></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 4: Retina & Neuro Exam -->
        <div class="eye-exam-grid-2">
            <!-- Retina Card -->
            <div class="eye-exam-card">
                <div class="eye-exam-card-header">
                    <span>Retina / Posterior Pole</span>
                </div>
                <div class="eye-exam-card-body">
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Structure</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Optic Disc</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_disc" value="Pink, Sharp Margins"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_disc" value="Pink, Sharp Margins"></td>
                            </tr>
                            <tr>
                                <td>C/D Ratio</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_cd" value="0.30"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_cd" value="0.30"></td>
                            </tr>
                            <tr>
                                <td>Macula</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_macula" value="Normal flat, +foveal reflex"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_macula" value="Normal flat, +foveal reflex"></td>
                            </tr>
                            <tr>
                                <td>Vessels</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_vessels" value="Normal caliber & course"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_vessels" value="Normal caliber & course"></td>
                            </tr>
                            <tr>
                                <td>Vitreous</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_vitreous" value="Clear, syneresis neg"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_vitreous" value="Clear, syneresis neg"></td>
                            </tr>
                            <tr>
                                <td>Periphery</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_periph" value="Attached 360, no tears/holes"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_periph" value="Attached 360, no tears/holes"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_ret_comments" rows="2" placeholder="Retina findings, OCT CMT, Scleral depression notes..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Neuro & Motility Card -->
            <div class="eye-exam-card">
                <div class="eye-exam-card-header">
                    <span>Neuro-Ophthalmology & Motility</span>
                </div>
                <div class="eye-exam-card-body">
                    <div style="display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_neuro_motility_normal" checked> EOM Full & Smooth (Motility Normal)</label>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_neuro_ortho" checked> Alternate Cover Test: Ortho</label>
                    </div>
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Test</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Color (Ishihara)</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_od_color" value="14/14 Ishihara"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_os_color" value="14/14 Ishihara"></td>
                            </tr>
                            <tr>
                                <td>Red Desaturation</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_od_red" value="100%"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_os_red" value="100%"></td>
                            </tr>
                            <tr>
                                <td>Stereopsis</td>
                                <td colspan="2"><input type="text" class="eye-exam-input" id="eyeExam_neuro_stereopsis" value="40 sec of arc (Circles 9/9)"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_neuro_comments" rows="2" placeholder="NPA, NPC, amplitudes of convergence/divergence, comments..."></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 5: Impression & Plan -->
        <div class="eye-exam-card">
            <div class="eye-exam-card-header">
                <span>Impression & Plan</span>
            </div>
            <div class="eye-exam-card-body">
                <div class="eye-exam-grid-2">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;">Diagnoses / Impression (New Dx):</label>
                        <textarea class="eye-exam-input" id="eyeExam_impression_new_dx" rows="4" placeholder="1. Myopia with astigmatism (H52.203)&#10;2. Presbyopia (H52.4)&#10;3. Dry eye syndrome (H04.123)"></textarea>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;">Treatment Plan & Next Visit Orders:</label>
                        <textarea class="eye-exam-input" id="eyeExam_impression_orders" rows="4" placeholder="1. Prescribe updated spectacle Rx (OD -1.50 -0.50x180, OS -1.75 -0.25x175, Add +2.00)&#10;2. Artificial tears QID PRN dry eye&#10;3. RTC in 1 year for annual comprehensive exam"></textarea>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 14px; gap: 8px;">
                    <button type="button" class="eye-exam-btn" id="eyeExamCancelBtn">Cancel</button>
                    <button type="button" class="eye-exam-btn eye-exam-btn-primary" id="eyeExamSaveBottomBtn">Save Eye Exam</button>
                </div>
            </div>
        </div>
    </div>
    `;
}
