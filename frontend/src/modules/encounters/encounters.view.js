/**
 * Dynamic Specialty Consultation & SOAP Note Template View
 * Outpatient Department (OPD) Management
 * 
 * Supports specialized clinical workflows:
 *  - Obstetrics & Gynecology (OB/GYN): Gravida/Para/TPAL, LMP, EDD, Gestational Age, Fundal Height, FHR, Presentation
 *  - Pediatrics: Head Circumference & Percentiles, Developmental Milestones Checklists, Immunization Status
 *  - Orthopedics: Affected Side/Joint, Range of Motion, Weight Bearing, Neurovascular Exam, Orthopedic Tests
 */

export const SPECIALTY_TEMPLATES = {
    general: {
        code: "general",
        name: "General Outpatient SOAP",
        badgeColor: "#64748b",
        icon: "📋"
    },
    obstetrics: {
        code: "obstetrics",
        name: "Obstetrics & Gynecology (OB/GYN)",
        badgeColor: "#d946ef",
        icon: "🤰"
    },
    pediatrics: {
        code: "pediatrics",
        name: "Pediatrics & Child Health",
        badgeColor: "#0284c7",
        icon: "👶"
    },
    orthopedics: {
        code: "orthopedics",
        name: "Orthopedic Surgery & Musculoskeletal",
        badgeColor: "#059669",
        icon: "🦴"
    }
};

/**
 * Renders the specialty template selector dropdown / pills for the SOAP note modal.
 */
export function renderSpecialtyTemplateSelector(selectedCode = "general")
{
    return `
        <div class="opd-specialty-selector-wrapper" style="margin-bottom: 16px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label for="opd_specialty_type_select" style="font-size: 12px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 14px;">🩺</span> Consultation Specialty Template:
                </label>
                <span id="opd_specialty_active_badge" class="opd-specialty-badge" style="font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; background: #e0f2fe; color: #0369a1;">
                    ${escapeHtml(SPECIALTY_TEMPLATES[selectedCode]?.name || "General")}
                </span>
            </div>
            <select id="opd_specialty_type_select" class="form-input" style="width: 100%; font-size: 13px; font-weight: 500; padding: 7px 10px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer;">
                <option value="general" ${selectedCode === "general" ? "selected" : ""}>General Outpatient SOAP (Default)</option>
                <option value="obstetrics" ${selectedCode === "obstetrics" ? "selected" : ""}>🤰 Obstetrics & Gynecology (OB/GYN)</option>
                <option value="pediatrics" ${selectedCode === "pediatrics" ? "selected" : ""}>👶 Pediatrics & Child Health</option>
                <option value="orthopedics" ${selectedCode === "orthopedics" ? "selected" : ""}>🦴 Orthopedic Surgery & Musculoskeletal</option>
            </select>
        </div>
    `;
}

/**
 * Calculates EDD (Estimated Date of Delivery) and gestational age in weeks from LMP using Naegele's Rule.
 */
export function calculateObstetricDates(lmpDateStr)
{
    if (!lmpDateStr) return { edd: "", weeks: "" };

    const lmp = new Date(lmpDateStr);
    if (isNaN(lmp.getTime())) return { edd: "", weeks: "" };

    // Naegele's rule: LMP + 280 days (40 weeks)
    const eddDate = new Date(lmp.getTime() + (280 * 24 * 60 * 60 * 1000));
    const eddStr = eddDate.toISOString().slice(0, 10);

    // Gestational age from LMP to today
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lmp.getTime()) / (24 * 60 * 60 * 1000));
    const weeks = diffDays > 0 ? (diffDays / 7).toFixed(1) : "0.0";

    return { edd: eddStr, weeks: Number(weeks) >= 0 && Number(weeks) <= 45 ? weeks : "" };
}

/**
 * Renders the dynamic form fields for the selected specialty template.
 */
export function renderSpecialtyFormFields(specialtyType = "general", data = {})
{
    switch (specialtyType) {
        case "obstetrics":
            return renderObstetricsForm(data);
        case "pediatrics":
            return renderPediatricsForm(data);
        case "orthopedics":
            return renderOrthopedicsForm(data);
        case "general":
        default:
            return `
                <div style="font-size: 11.5px; color: #64748b; margin-bottom: 12px; font-style: italic;">
                    Standard generic SOAP note template active. Switch the dropdown above for specialty-tailored clinical variables (OB/GYN, Pediatrics, Orthopedics).
                </div>
            `;
    }
}

/**
 * Obstetrics & Gynecology Form Template
 */
function renderObstetricsForm(data = {})
{
    const gravida = data.gravida !== null && data.gravida !== undefined ? data.gravida : "";
    const para = data.para !== null && data.para !== undefined ? data.para : "";
    const term = data.term_births !== null && data.term_births !== undefined ? data.term_births : "";
    const preterm = data.preterm_births !== null && data.preterm_births !== undefined ? data.preterm_births : "";
    const abortions = data.abortions !== null && data.abortions !== undefined ? data.abortions : "";
    const living = data.living_children !== null && data.living_children !== undefined ? data.living_children : "";
    const lmp = data.lmp || "";
    const edd = data.edd || "";
    const ga = data.gestational_age_weeks || "";
    const fundalHeight = data.fundal_height_cm || "";
    const fhr = data.fetal_heart_rate_bpm || "";
    const presentation = data.fetal_presentation || "";

    return `
        <div class="opd-specialty-section" style="background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 6px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f5d0fe; padding-bottom: 6px;">
                <h4 style="margin: 0; color: #86198f; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                    <span>🤰</span> Obstetrics Clinical Tracking (OB/GYN)
                </h4>
                <span style="font-size: 11px; background: #fae8ff; color: #a21caf; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Antenatal / Prenatal</span>
            </div>

            <!-- Gravida / Para / TPAL -->
            <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: 600; color: #701a75; margin-bottom: 4px;">Obstetric History (Gravida / Para / TPAL)</div>
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;">
                    <div>
                        <label style="font-size: 10px; color: #4a044e; display: block; font-weight: 600;">Gravida (G)</label>
                        <input type="number" id="spec_ob_gravida" class="form-input" min="0" max="25" value="${escapeHtml(gravida)}" placeholder="0" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #4a044e; display: block; font-weight: 600;">Para (P)</label>
                        <input type="number" id="spec_ob_para" class="form-input" min="0" max="25" value="${escapeHtml(para)}" placeholder="0" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #4a044e; display: block;">Term (T)</label>
                        <input type="number" id="spec_ob_term" class="form-input" min="0" max="25" value="${escapeHtml(term)}" placeholder="0" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #4a044e; display: block;">Preterm (P)</label>
                        <input type="number" id="spec_ob_preterm" class="form-input" min="0" max="25" value="${escapeHtml(preterm)}" placeholder="0" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #4a044e; display: block;">Abortions (A)</label>
                        <input type="number" id="spec_ob_abortions" class="form-input" min="0" max="25" value="${escapeHtml(abortions)}" placeholder="0" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #4a044e; display: block;">Living (L)</label>
                        <input type="number" id="spec_ob_living" class="form-input" min="0" max="25" value="${escapeHtml(living)}" placeholder="0" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                </div>
            </div>

            <!-- LMP, EDD, and Gestational Age -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #701a75; display: block; margin-bottom: 4px;">
                        LMP (Last Menstrual Period)
                    </label>
                    <input type="date" id="spec_ob_lmp" class="form-input" value="${escapeHtml(lmp)}" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #701a75; display: block; margin-bottom: 4px;">
                        EDD (Estimated Delivery Date)
                    </label>
                    <input type="date" id="spec_ob_edd" class="form-input" value="${escapeHtml(edd)}" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #701a75; display: block; margin-bottom: 4px;">
                        Gestational Age (weeks)
                    </label>
                    <input type="number" step="0.1" id="spec_ob_ga" class="form-input" value="${escapeHtml(ga)}" placeholder="e.g. 24.3" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
            </div>

            <!-- Fetal & Uterine Assessment -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #701a75; display: block; margin-bottom: 4px;">
                        Fundal Height (cm)
                    </label>
                    <input type="number" step="0.5" id="spec_ob_fundal_height" class="form-input" value="${escapeHtml(fundalHeight)}" placeholder="e.g. 28.0" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #701a75; display: block; margin-bottom: 4px;">
                        Fetal Heart Rate (bpm)
                    </label>
                    <input type="number" id="spec_ob_fhr" class="form-input" value="${escapeHtml(fhr)}" placeholder="e.g. 142" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #701a75; display: block; margin-bottom: 4px;">
                        Fetal Presentation
                    </label>
                    <select id="spec_ob_presentation" class="form-input" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                        <option value="">-- Select --</option>
                        <option value="Cephalic/Vertex" ${presentation === "Cephalic/Vertex" ? "selected" : ""}>Cephalic / Vertex</option>
                        <option value="Breech" ${presentation === "Breech" ? "selected" : ""}>Breech</option>
                        <option value="Transverse" ${presentation === "Transverse" ? "selected" : ""}>Transverse Lie</option>
                        <option value="Oblique" ${presentation === "Oblique" ? "selected" : ""}>Oblique Lie</option>
                        <option value="Variable" ${presentation === "Variable" ? "selected" : ""}>Variable / Unstable</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

/**
 * Pediatrics Form Template
 */
function renderPediatricsForm(data = {})
{
    const hc = data.head_circumference_cm || "";
    const hcPctl = data.head_circumference_percentile || "";
    const wtPctl = data.weight_percentile || "";
    const htPctl = data.height_length_percentile || "";
    const immun = data.immunization_status || "";
    const milestones = data.developmental_milestones || {};

    const isChecked = (category, key) => {
        if (!milestones) return false;
        if (typeof milestones === "string") {
            try {
                const parsed = JSON.parse(milestones);
                return !!(parsed[category] && parsed[category][key]);
            } catch (e) {
                return false;
            }
        }
        return !!(milestones[category] && milestones[category][key]);
    };

    return `
        <div class="opd-specialty-section" style="background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 6px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #bae6fd; padding-bottom: 6px;">
                <h4 style="margin: 0; color: #0369a1; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                    <span>👶</span> Pediatrics Growth & Developmental Tracking
                </h4>
                <span style="font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Well Child / Developmental</span>
            </div>

            <!-- Anthropometrics & Percentiles -->
            <div style="margin-bottom: 14px;">
                <div style="font-size: 11px; font-weight: 600; color: #075985; margin-bottom: 6px;">Growth Anthropometrics & Percentiles (WHO / CDC)</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                    <div>
                        <label style="font-size: 10.5px; color: #0369a1; display: block; font-weight: 600;">Head Circumference (cm)</label>
                        <input type="number" step="0.1" id="spec_peds_hc" class="form-input" value="${escapeHtml(hc)}" placeholder="e.g. 42.5" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10.5px; color: #0369a1; display: block; font-weight: 600;">Head Circ. Percentile (%)</label>
                        <input type="number" step="0.1" id="spec_peds_hc_pctl" class="form-input" value="${escapeHtml(hcPctl)}" placeholder="e.g. 50" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10.5px; color: #0369a1; display: block; font-weight: 600;">Weight Percentile (%)</label>
                        <input type="number" step="0.1" id="spec_peds_wt_pctl" class="form-input" value="${escapeHtml(wtPctl)}" placeholder="e.g. 65" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                    <div>
                        <label style="font-size: 10.5px; color: #0369a1; display: block; font-weight: 600;">Height/Length Percentile (%)</label>
                        <input type="number" step="0.1" id="spec_peds_ht_pctl" class="form-input" value="${escapeHtml(htPctl)}" placeholder="e.g. 70" style="padding: 4px 6px; font-size: 12px;">
                    </div>
                </div>
            </div>

            <!-- Developmental Milestone Checklists -->
            <div style="margin-bottom: 12px; background: #ffffff; border: 1px solid #e0f2fe; border-radius: 6px; padding: 10px;">
                <div style="font-size: 11.5px; font-weight: 700; color: #0284c7; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                    <span>Developmental Milestone Checklists</span>
                    <span style="font-size: 10px; font-weight: normal; color: #64748b;">Age-appropriate developmental milestones</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <!-- Gross Motor -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
                        <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">🏃 Gross Motor</div>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_gm_head_steady" ${isChecked("gross_motor", "head_steady") ? "checked" : ""}> Holds head steady
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_gm_rolls_over" ${isChecked("gross_motor", "rolls_over") ? "checked" : ""}> Rolls over front-to-back
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_gm_sits_unsupported" ${isChecked("gross_motor", "sits_unsupported") ? "checked" : ""}> Sits unsupported
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_gm_pulls_to_stand" ${isChecked("gross_motor", "pulls_to_stand") ? "checked" : ""}> Pulls to stand / cruises
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
                            <input type="checkbox" id="ms_gm_walks_independently" ${isChecked("gross_motor", "walks_independently") ? "checked" : ""}> Walks independently
                        </label>
                    </div>

                    <!-- Fine Motor -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
                        <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">✋ Fine Motor / Adaptive</div>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_fm_tracks_objects" ${isChecked("fine_motor", "tracks_objects") ? "checked" : ""}> Follows objects past midline
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_fm_reaches_grasps" ${isChecked("fine_motor", "reaches_grasps") ? "checked" : ""}> Reaches and grasps rattle
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_fm_transfers_hand" ${isChecked("fine_motor", "transfers_hand") ? "checked" : ""}> Transfers objects hand-to-hand
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_fm_pincer_grasp" ${isChecked("fine_motor", "pincer_grasp") ? "checked" : ""}> Mature pincer grasp
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
                            <input type="checkbox" id="ms_fm_tower_blocks" ${isChecked("fine_motor", "tower_blocks") ? "checked" : ""}> Builds block tower
                        </label>
                    </div>

                    <!-- Language & Communication -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
                        <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">💬 Language & Communication</div>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_lang_coos" ${isChecked("language", "coos") ? "checked" : ""}> Coos / smiles to voice
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_lang_babbles" ${isChecked("language", "babbles") ? "checked" : ""}> Babbles consonant sounds
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_lang_responds_name" ${isChecked("language", "responds_name") ? "checked" : ""}> Responds to own name
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_lang_first_words" ${isChecked("language", "first_words") ? "checked" : ""}> Says 2-3 specific words
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
                            <input type="checkbox" id="ms_lang_word_combinations" ${isChecked("language", "word_combinations") ? "checked" : ""}> Combines 2 words into phrases
                        </label>
                    </div>

                    <!-- Social & Emotional -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
                        <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">🤝 Social & Emotional</div>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_soc_social_smile" ${isChecked("social", "social_smile") ? "checked" : ""}> Responsive social smile
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_soc_stranger_anxiety" ${isChecked("social", "stranger_anxiety") ? "checked" : ""}> Stranger anxiety present
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_soc_peekaboo" ${isChecked("social", "peekaboo") ? "checked" : ""}> Plays interactive games (peek-a-boo)
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; cursor: pointer;">
                            <input type="checkbox" id="ms_soc_points_wants" ${isChecked("social", "points_wants") ? "checked" : ""}> Points to indicate desires
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
                            <input type="checkbox" id="ms_soc_parallel_play" ${isChecked("social", "parallel_play") ? "checked" : ""}> Engages in parallel play
                        </label>
                    </div>
                </div>
            </div>

            <!-- Immunization Status -->
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                <div>
                    <label style="font-size: 10.5px; color: #0369a1; display: block; font-weight: 600; margin-bottom: 2px;">
                        Immunization / Vaccination Status
                    </label>
                    <input type="text" id="spec_peds_immun" class="form-input" value="${escapeHtml(immun)}" placeholder="e.g. Up to date per EPI/CDC schedule, next due: MMR at 12 months" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
            </div>
        </div>
    `;
}

/**
 * Orthopedic Surgery & Musculoskeletal Form Template
 */
function renderOrthopedicsForm(data = {})
{
    const side = data.affected_side || "";
    const joint = data.affected_joint_region || "";
    const rom = data.range_of_motion || "";
    const weightBearing = data.weight_bearing_status || "";
    const neuro = data.neurovascular_status || "";
    const deformity = data.deformity_swelling || "";
    const tests = data.special_orthopedic_tests || "";

    return `
        <div class="opd-specialty-section" style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #bbf7d0; padding-bottom: 6px;">
                <h4 style="margin: 0; color: #166534; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                    <span>🦴</span> Orthopedic Surgery & Musculoskeletal Exam
                </h4>
                <span style="font-size: 11px; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 600;">MSK Evaluation</span>
            </div>

            <!-- Affected Side & Anatomical Region -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #14532d; display: block; margin-bottom: 4px;">
                        Laterality / Affected Side
                    </label>
                    <select id="spec_ortho_side" class="form-input" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                        <option value="">-- Select Side --</option>
                        <option value="Right" ${side === "Right" ? "selected" : ""}>Right</option>
                        <option value="Left" ${side === "Left" ? "selected" : ""}>Left</option>
                        <option value="Bilateral" ${side === "Bilateral" ? "selected" : ""}>Bilateral</option>
                        <option value="Axial/Midline" ${side === "Axial/Midline" ? "selected" : ""}>Axial / Spine</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #14532d; display: block; margin-bottom: 4px;">
                        Affected Joint / Anatomical Region
                    </label>
                    <select id="spec_ortho_joint" class="form-input" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                        <option value="">-- Select Joint / Region --</option>
                        <option value="Knee" ${joint === "Knee" ? "selected" : ""}>Knee</option>
                        <option value="Shoulder" ${joint === "Shoulder" ? "selected" : ""}>Shoulder</option>
                        <option value="Hip" ${joint === "Hip" ? "selected" : ""}>Hip</option>
                        <option value="Spine - Lumbar" ${joint === "Spine - Lumbar" ? "selected" : ""}>Spine - Lumbar</option>
                        <option value="Spine - Cervical" ${joint === "Spine - Cervical" ? "selected" : ""}>Spine - Cervical</option>
                        <option value="Ankle & Foot" ${joint === "Ankle & Foot" ? "selected" : ""}>Ankle & Foot</option>
                        <option value="Wrist & Hand" ${joint === "Wrist & Hand" ? "selected" : ""}>Wrist & Hand</option>
                        <option value="Elbow" ${joint === "Elbow" ? "selected" : ""}>Elbow</option>
                        <option value="Other Joint" ${joint === "Other Joint" ? "selected" : ""}>Other</option>
                    </select>
                </div>
            </div>

            <!-- Range of Motion & Weight Bearing Status -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #14532d; display: block; margin-bottom: 4px;">
                        Range of Motion (ROM)
                    </label>
                    <input type="text" id="spec_ortho_rom" class="form-input" value="${escapeHtml(rom)}" placeholder="e.g. Flexion 0-110 deg (pain at terminal flexion), Extension 0 deg" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #14532d; display: block; margin-bottom: 4px;">
                        Weight Bearing Status
                    </label>
                    <select id="spec_ortho_weight_bearing" class="form-input" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                        <option value="">-- Select Status --</option>
                        <option value="Full Weight Bearing (FWB)" ${weightBearing === "Full Weight Bearing (FWB)" ? "selected" : ""}>Full Weight Bearing (FWB)</option>
                        <option value="Weight Bearing As Tolerated (WBAT)" ${weightBearing === "Weight Bearing As Tolerated (WBAT)" ? "selected" : ""}>Weight Bearing As Tolerated (WBAT)</option>
                        <option value="Partial Weight Bearing (PWB)" ${weightBearing === "Partial Weight Bearing (PWB)" ? "selected" : ""}>Partial Weight Bearing (PWB)</option>
                        <option value="Touch Down / Toe Touch (TDWB)" ${weightBearing === "Touch Down / Toe Touch (TDWB)" ? "selected" : ""}>Touch Down / Toe Touch (TDWB)</option>
                        <option value="Non-Weight Bearing (NWB)" ${weightBearing === "Non-Weight Bearing (NWB)" ? "selected" : ""}>Non-Weight Bearing (NWB)</option>
                    </select>
                </div>
            </div>

            <!-- Neurovascular Exam & Deformity/Effusion -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #14532d; display: block; margin-bottom: 4px;">
                        Neurovascular Examination (Distal Status)
                    </label>
                    <input type="text" id="spec_ortho_neuro" class="form-input" value="${escapeHtml(neuro)}" placeholder="e.g. Distal pulses 2+ intact, sensation intact L4-S1, capillary refill < 2s" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: #14532d; display: block; margin-bottom: 4px;">
                        Deformity / Joint Effusion / Swelling
                    </label>
                    <input type="text" id="spec_ortho_deformity" class="form-input" value="${escapeHtml(deformity)}" placeholder="e.g. Moderate joint effusion, no gross varus/valgus deformity, no erythema" style="padding: 5px 8px; font-size: 12px; width: 100%;">
                </div>
            </div>

            <!-- Special Orthopedic Provocative Tests -->
            <div>
                <label style="font-size: 11px; font-weight: 600; color: #14532d; display: block; margin-bottom: 4px;">
                    Special Orthopedic Tests (Provocative Maneuvers)
                </label>
                <input type="text" id="spec_ortho_tests" class="form-input" value="${escapeHtml(tests)}" placeholder="e.g. Lachman: Positive (soft endpoint); McMurray: Positive medial joint line; Anterior Drawer: +1" style="padding: 5px 8px; font-size: 12px; width: 100%;">
            </div>
        </div>
    `;
}

/**
 * Extracts specialty consultation data from the DOM container.
 */
export function extractSpecialtyFormData(container)
{
    if (!container) return null;

    const selectEl = container.querySelector("#opd_specialty_type_select") || document.getElementById("opd_specialty_type_select");
    const specialtyType = selectEl ? selectEl.value : "general";

    if (specialtyType === "general") {
        return {
            specialty_type: "general",
            template_name: SPECIALTY_TEMPLATES.general.name
        };
    }

    if (specialtyType === "obstetrics") {
        const gravidaVal = container.querySelector("#spec_ob_gravida")?.value;
        const paraVal = container.querySelector("#spec_ob_para")?.value;
        const termVal = container.querySelector("#spec_ob_term")?.value;
        const pretermVal = container.querySelector("#spec_ob_preterm")?.value;
        const abortionsVal = container.querySelector("#spec_ob_abortions")?.value;
        const livingVal = container.querySelector("#spec_ob_living")?.value;
        const gaVal = container.querySelector("#spec_ob_ga")?.value;
        const fhVal = container.querySelector("#spec_ob_fundal_height")?.value;
        const fhrVal = container.querySelector("#spec_ob_fhr")?.value;

        return {
            specialty_type: "obstetrics",
            template_name: SPECIALTY_TEMPLATES.obstetrics.name,
            gravida: gravidaVal !== "" && gravidaVal !== undefined ? parseInt(gravidaVal, 10) : null,
            para: paraVal !== "" && paraVal !== undefined ? parseInt(paraVal, 10) : null,
            term_births: termVal !== "" && termVal !== undefined ? parseInt(termVal, 10) : null,
            preterm_births: pretermVal !== "" && pretermVal !== undefined ? parseInt(pretermVal, 10) : null,
            abortions: abortionsVal !== "" && abortionsVal !== undefined ? parseInt(abortionsVal, 10) : null,
            living_children: livingVal !== "" && livingVal !== undefined ? parseInt(livingVal, 10) : null,
            lmp: container.querySelector("#spec_ob_lmp")?.value || null,
            edd: container.querySelector("#spec_ob_edd")?.value || null,
            gestational_age_weeks: gaVal !== "" && gaVal !== undefined ? parseFloat(gaVal) : null,
            fundal_height_cm: fhVal !== "" && fhVal !== undefined ? parseFloat(fhVal) : null,
            fetal_heart_rate_bpm: fhrVal !== "" && fhrVal !== undefined ? parseInt(fhrVal, 10) : null,
            fetal_presentation: container.querySelector("#spec_ob_presentation")?.value || null
        };
    }

    if (specialtyType === "pediatrics") {
        const hcVal = container.querySelector("#spec_peds_hc")?.value;
        const hcPctlVal = container.querySelector("#spec_peds_hc_pctl")?.value;
        const wtPctlVal = container.querySelector("#spec_peds_wt_pctl")?.value;
        const htPctlVal = container.querySelector("#spec_peds_ht_pctl")?.value;

        const milestones = {
            gross_motor: {
                head_steady: !!container.querySelector("#ms_gm_head_steady")?.checked,
                rolls_over: !!container.querySelector("#ms_gm_rolls_over")?.checked,
                sits_unsupported: !!container.querySelector("#ms_gm_sits_unsupported")?.checked,
                pulls_to_stand: !!container.querySelector("#ms_gm_pulls_to_stand")?.checked,
                walks_independently: !!container.querySelector("#ms_gm_walks_independently")?.checked
            },
            fine_motor: {
                tracks_objects: !!container.querySelector("#ms_fm_tracks_objects")?.checked,
                reaches_grasps: !!container.querySelector("#ms_fm_reaches_grasps")?.checked,
                transfers_hand: !!container.querySelector("#ms_fm_transfers_hand")?.checked,
                pincer_grasp: !!container.querySelector("#ms_fm_pincer_grasp")?.checked,
                tower_blocks: !!container.querySelector("#ms_fm_tower_blocks")?.checked
            },
            language: {
                coos: !!container.querySelector("#ms_lang_coos")?.checked,
                babbles: !!container.querySelector("#ms_lang_babbles")?.checked,
                responds_name: !!container.querySelector("#ms_lang_responds_name")?.checked,
                first_words: !!container.querySelector("#ms_lang_first_words")?.checked,
                word_combinations: !!container.querySelector("#ms_lang_word_combinations")?.checked
            },
            social: {
                social_smile: !!container.querySelector("#ms_soc_social_smile")?.checked,
                stranger_anxiety: !!container.querySelector("#ms_soc_stranger_anxiety")?.checked,
                peekaboo: !!container.querySelector("#ms_soc_peekaboo")?.checked,
                points_wants: !!container.querySelector("#ms_soc_points_wants")?.checked,
                parallel_play: !!container.querySelector("#ms_soc_parallel_play")?.checked
            }
        };

        return {
            specialty_type: "pediatrics",
            template_name: SPECIALTY_TEMPLATES.pediatrics.name,
            head_circumference_cm: hcVal !== "" && hcVal !== undefined ? parseFloat(hcVal) : null,
            head_circumference_percentile: hcPctlVal !== "" && hcPctlVal !== undefined ? parseFloat(hcPctlVal) : null,
            weight_percentile: wtPctlVal !== "" && wtPctlVal !== undefined ? parseFloat(wtPctlVal) : null,
            height_length_percentile: htPctlVal !== "" && htPctlVal !== undefined ? parseFloat(htPctlVal) : null,
            developmental_milestones: milestones,
            immunization_status: container.querySelector("#spec_peds_immun")?.value?.trim() || null
        };
    }

    if (specialtyType === "orthopedics") {
        return {
            specialty_type: "orthopedics",
            template_name: SPECIALTY_TEMPLATES.orthopedics.name,
            affected_side: container.querySelector("#spec_ortho_side")?.value || null,
            affected_joint_region: container.querySelector("#spec_ortho_joint")?.value || null,
            range_of_motion: container.querySelector("#spec_ortho_rom")?.value?.trim() || null,
            weight_bearing_status: container.querySelector("#spec_ortho_weight_bearing")?.value || null,
            neurovascular_status: container.querySelector("#spec_ortho_neuro")?.value?.trim() || null,
            deformity_swelling: container.querySelector("#spec_ortho_deformity")?.value?.trim() || null,
            special_orthopedic_tests: container.querySelector("#spec_ortho_tests")?.value?.trim() || null
        };
    }

    return null;
}

/**
 * Binds dynamic change events (specialty selector switch, LMP date listener).
 */
export function initSpecialtyTemplateEvents(container, currentSpecialtyData = {})
{
    const selectEl = container.querySelector("#opd_specialty_type_select");
    const fieldsContainer = container.querySelector("#soap_specialty_fields_container");

    if (!selectEl || !fieldsContainer) return;

    selectEl.addEventListener("change", (e) => {
        const newSpecialty = e.target.value;
        const badge = container.querySelector("#opd_specialty_active_badge");
        if (badge) {
            badge.textContent = SPECIALTY_TEMPLATES[newSpecialty]?.name || "General";
        }
        fieldsContainer.innerHTML = renderSpecialtyFormFields(newSpecialty, currentSpecialtyData);
        bindSpecialtyFieldCalculators(fieldsContainer);
    });

    bindSpecialtyFieldCalculators(fieldsContainer);
}

/**
 * Binds auto-calculators such as LMP -> EDD & Gestational Age.
 */
function bindSpecialtyFieldCalculators(container)
{
    const lmpInput = container.querySelector("#spec_ob_lmp");
    const eddInput = container.querySelector("#spec_ob_edd");
    const gaInput = container.querySelector("#spec_ob_ga");

    if (lmpInput) {
        lmpInput.addEventListener("change", () => {
            const res = calculateObstetricDates(lmpInput.value);
            if (res.edd && eddInput && !eddInput.value) {
                eddInput.value = res.edd;
            }
            if (res.weeks && gaInput) {
                gaInput.value = res.weeks;
            }
        });
    }
}

/**
 * Renders a structured, styled specialty badge and details card inside a SOAP note card.
 */
export function renderSpecialtySoapNoteCard(data)
{
    if (!data || !data.specialty_type || data.specialty_type === "general") {
        return "";
    }

    const type = data.specialty_type;

    if (type === "obstetrics") {
        const g = data.gravida !== null && data.gravida !== undefined ? data.gravida : "-";
        const p = data.para !== null && data.para !== undefined ? data.para : "-";
        const t = data.term_births !== null && data.term_births !== undefined ? data.term_births : "-";
        const pr = data.preterm_births !== null && data.preterm_births !== undefined ? data.preterm_births : "-";
        const a = data.abortions !== null && data.abortions !== undefined ? data.abortions : "-";
        const l = data.living_children !== null && data.living_children !== undefined ? data.living_children : "-";

        return `
            <div class="pd-soap-specialty-card" style="margin-top: 10px; padding: 10px 12px; background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 700; color: #86198f; font-size: 11.5px; display: flex; align-items: center; gap: 4px;">
                        🤰 OB/GYN Consultation Variables
                    </span>
                    <span style="font-size: 10.5px; background: #fae8ff; color: #a21caf; padding: 1px 6px; border-radius: 4px; font-weight: 600;">
                        G${g} P${p} (T:${t} P:${pr} A:${a} L:${l})
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 11.5px; color: #4a044e;">
                    <div><strong>LMP:</strong> ${escapeHtml(data.lmp || "-")}</div>
                    <div><strong>EDD:</strong> ${escapeHtml(data.edd || "-")}</div>
                    <div><strong>Gestational Age:</strong> ${data.gestational_age_weeks ? `${data.gestational_age_weeks} weeks` : "-"}</div>
                    <div><strong>Fundal Height:</strong> ${data.fundal_height_cm ? `${data.fundal_height_cm} cm` : "-"}</div>
                    <div><strong>Fetal Heart Rate:</strong> ${data.fetal_heart_rate_bpm ? `${data.fetal_heart_rate_bpm} bpm` : "-"}</div>
                    <div><strong>Presentation:</strong> ${escapeHtml(data.fetal_presentation || "-")}</div>
                </div>
            </div>
        `;
    }

    if (type === "pediatrics") {
        let milestoneBadges = [];
        const ms = typeof data.developmental_milestones === "string" 
            ? (() => { try { return JSON.parse(data.developmental_milestones); } catch (e) { return null; } })()
            : data.developmental_milestones;

        if (ms) {
            let totalChecked = 0;
            ["gross_motor", "fine_motor", "language", "social"].forEach((cat) => {
                if (ms[cat]) {
                    Object.values(ms[cat]).forEach((val) => { if (val) totalChecked++; });
                }
            });
            milestoneBadges.push(`<span style="background: #e0f2fe; color: #0284c7; padding: 1px 6px; border-radius: 4px; font-weight: 600;">${totalChecked} milestones met</span>`);
        }

        return `
            <div class="pd-soap-specialty-card" style="margin-top: 10px; padding: 10px 12px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 700; color: #0369a1; font-size: 11.5px; display: flex; align-items: center; gap: 4px;">
                        👶 Pediatric Growth & Developmental Variables
                    </span>
                    <div>${milestoneBadges.join(" ")}</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 11.5px; color: #075985;">
                    <div><strong>Head Circ:</strong> ${data.head_circumference_cm ? `${data.head_circumference_cm} cm` : "-"}</div>
                    <div><strong>HC Percentile:</strong> ${data.head_circumference_percentile !== null && data.head_circumference_percentile !== undefined ? `${data.head_circumference_percentile}%` : "-"}</div>
                    <div><strong>Weight Percentile:</strong> ${data.weight_percentile !== null && data.weight_percentile !== undefined ? `${data.weight_percentile}%` : "-"}</div>
                    <div><strong>Height Percentile:</strong> ${data.height_length_percentile !== null && data.height_length_percentile !== undefined ? `${data.height_length_percentile}%` : "-"}</div>
                </div>
                ${data.immunization_status ? `
                    <div style="margin-top: 6px; font-size: 11px; color: #0369a1;">
                        <strong>Immunization:</strong> ${escapeHtml(data.immunization_status)}
                    </div>
                ` : ""}
            </div>
        `;
    }

    if (type === "orthopedics") {
        return `
            <div class="pd-soap-specialty-card" style="margin-top: 10px; padding: 10px 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 700; color: #166534; font-size: 11.5px; display: flex; align-items: center; gap: 4px;">
                        🦴 Orthopedic & Musculoskeletal Variables
                    </span>
                    <span style="font-size: 10.5px; background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 4px; font-weight: 600;">
                        ${escapeHtml(data.affected_side || "")} ${escapeHtml(data.affected_joint_region || "Joint")}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px; color: #14532d;">
                    <div><strong>Range of Motion:</strong> ${escapeHtml(data.range_of_motion || "-")}</div>
                    <div><strong>Weight Bearing:</strong> ${escapeHtml(data.weight_bearing_status || "-")}</div>
                    <div><strong>Neurovascular:</strong> ${escapeHtml(data.neurovascular_status || "-")}</div>
                    <div><strong>Deformity / Effusion:</strong> ${escapeHtml(data.deformity_swelling || "-")}</div>
                </div>
                ${data.special_orthopedic_tests ? `
                    <div style="margin-top: 6px; font-size: 11.5px; color: #166534;">
                        <strong>Special Tests:</strong> ${escapeHtml(data.special_orthopedic_tests)}
                    </div>
                ` : ""}
            </div>
        `;
    }

    return "";
}

function escapeHtml(str)
{
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
