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

/* ==========================================================================
   BUNDLED INLINE CPOE DIAGNOSTIC ORDERING (LAB, CULTURES & RADIOLOGY)
   ========================================================================== */

export const CPOE_PRESET_ITEMS = [
    // Blood Tests
    { id: "CBC", code: "CBC", name: "Complete blood count (CBC) with diff", category: "blood", icon: "🩸", tip: "Lavender top (EDTA)" },
    { id: "BMP", code: "BMP", name: "Basic metabolic panel (BMP)", category: "blood", icon: "🧪", tip: "Gold top (SST)" },
    { id: "CMP", code: "CMP", name: "Comprehensive metabolic panel (CMP)", category: "blood", icon: "🧪", tip: "Gold top (SST)" },
    { id: "LIPID", code: "LIPID", name: "Lipid profile (Chol, HDL, LDL, Trig)", category: "blood", icon: "🩸", tip: "Fasting recommended" },
    { id: "HBA1C", code: "HBA1C", name: "HbA1c (Glycated hemoglobin)", category: "blood", icon: "🩸", tip: "Lavender top (EDTA)" },
    { id: "LFT", code: "LFT", name: "Liver function panel (ALT, AST, ALP, Bili)", category: "blood", icon: "🧪", tip: "Gold top (SST)" },
    { id: "BUNCREAT", code: "BUNCREAT", name: "Renal function (BUN & Creatinine)", category: "blood", icon: "🧪", tip: "Gold top (SST)" },
    { id: "LYTES", code: "LYTES", name: "Serum electrolytes (Na, K, Cl)", category: "blood", icon: "🧪", tip: "Gold top (SST)" },
    { id: "PTINR", code: "PTINR", name: "Prothrombin time (PT / INR)", category: "blood", icon: "🩸", tip: "Light blue top (Citrate)" },
    { id: "TROP", code: "TROP", name: "Troponin I (High sensitivity)", category: "blood", icon: "❤️", tip: "Cardiac marker" },
    { id: "UA", code: "UA", name: "Urinalysis (routine & microscopic)", category: "blood", icon: "🟡", tip: "Clean catch urine" },

    // Cultures & Microbiology
    { id: "BCX", code: "BCX", name: "Blood culture (2 sets)", category: "culture", icon: "🧫", tip: "Aerobic & Anaerobic bottles" },
    { id: "UCX", code: "UCX", name: "Urine culture & sensitivity", category: "culture", icon: "🧫", tip: "Midstream clean-catch" },
    { id: "SPCX", code: "SPCX", name: "Sputum Gram stain & culture", category: "culture", icon: "🧫", tip: "Deep cough specimen" },
    { id: "WCX", code: "WCX", name: "Wound swab culture & Gram stain", category: "culture", icon: "🧫", tip: "Swab of active wound bed" },
    { id: "TSCX", code: "TSCX", name: "Throat swab culture", category: "culture", icon: "🧫", tip: "Posterior pharynx swab" },
    { id: "STCX", code: "STCX", name: "Stool culture & pathogen screen", category: "culture", icon: "🧫", tip: "Stool container" },

    // Radiology & Imaging
    { id: "CXR", code: "CXR", name: "Chest X-ray (PA view)", category: "radiology", icon: "🩻", tip: "X-ray · 10 min" },
    { id: "CXRPAL", code: "CXRPAL", name: "Chest X-ray (PA and Lateral)", category: "radiology", icon: "🩻", tip: "X-ray · 15 min" },
    { id: "AXR", code: "AXR", name: "Abdominal X-ray (KUB)", category: "radiology", icon: "🩻", tip: "X-ray · 10 min" },
    { id: "USKUB", code: "USKUB", name: "Ultrasound KUB (Kidneys & Bladder)", category: "radiology", icon: "🔊", tip: "Ultrasound · Full bladder" },
    { id: "USABD", code: "USABD", name: "Ultrasound Whole Abdomen", category: "radiology", icon: "🔊", tip: "Ultrasound · Fasting 6-8 hrs" },
    { id: "USOB", code: "USOB", name: "Ultrasound Pelvic / Obstetric", category: "radiology", icon: "🔊", tip: "Ultrasound · Transabdominal" },
    { id: "CTHEAD", code: "CTHEAD", name: "CT Brain / Head (without contrast)", category: "radiology", icon: "🖥️", tip: "CT · 15 min" },
    { id: "CTABD", code: "CTABD", name: "CT Abdomen and Pelvis", category: "radiology", icon: "🖥️", tip: "CT · Check creatinine" },
    { id: "MRIBRAIN", code: "MRIBRAIN", name: "MRI Brain (without contrast)", category: "radiology", icon: "🧲", tip: "MRI · Check implants/metal" },
    { id: "LSPINEXR", code: "LSPINEXR", name: "Lumbosacral Spine X-ray (AP/Lat)", category: "radiology", icon: "🩻", tip: "X-ray · 15 min" },
    { id: "LEXR", code: "LEXR", name: "Lower Extremity X-ray (Knee / Ankle)", category: "radiology", icon: "🩻", tip: "X-ray · 10 min" },
    { id: "UEXR", code: "UEXR", name: "Upper Extremity X-ray (Wrist / Shoulder)", category: "radiology", icon: "🩻", tip: "X-ray · 10 min" }
];

/**
 * Renders the integrated CPOE Diagnostic Order Pad directly inside the consultation note.
 */
export function renderCpoeOrderPad({ patientId, encounterId, clinicalIndication = "", existingOrders = [] } = {})
{
    const existingOrdersCount = existingOrders ? existingOrders.length : 0;

    return `
        <div class="cpoe-order-pad-wrapper" id="cpoeOrderPadWrapper" style="margin-top: 16px; margin-bottom: 18px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">🔬</span>
                    <span style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.3px;">Inline CPOE Diagnostic Orders</span>
                    <span style="font-size: 10px; background: rgba(255,255,255,0.18); padding: 1px 6px; border-radius: 10px; font-weight: 500;">One-Click Requisitions</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span id="cpoe_selected_badge" style="font-size: 11px; font-weight: 600; background: #0284c7; color: #ffffff; padding: 2px 8px; border-radius: 12px; display: none;">
                        0 selected
                    </span>
                    ${existingOrdersCount > 0 ? `<span style="font-size: 11px; background: #059669; color: #ffffff; padding: 2px 8px; border-radius: 12px; font-weight: 600;">${existingOrdersCount} on file</span>` : ""}
                </div>
            </div>

            <div style="padding: 12px 14px;">
                <!-- Category Filter Tabs & Fast Search -->
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                    <div class="cpoe-category-tabs" style="display: flex; gap: 4px;">
                        <button type="button" class="cpoe-cat-btn active" data-cat="all" style="padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #cbd5e1; background: #0284c7; color: #ffffff; cursor: pointer;">All</button>
                        <button type="button" class="cpoe-cat-btn" data-cat="blood" style="padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;">🩸 Blood Tests</button>
                        <button type="button" class="cpoe-cat-btn" data-cat="culture" style="padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;">🧫 Cultures</button>
                        <button type="button" class="cpoe-cat-btn" data-cat="radiology" style="padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;">🩻 Radiology</button>
                    </div>

                    <div style="flex: 1; max-width: 260px; min-width: 160px; position: relative;">
                        <input type="search" id="cpoe_search_input" placeholder="🔍 Search test or code (e.g. CBC, CXR)..." style="width: 100%; padding: 4px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 4px;" autocomplete="off">
                    </div>
                </div>

                <!-- 1-Click Fast Pick Order Tiles -->
                <div class="cpoe-preset-grid" id="cpoe_preset_grid" style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 140px; overflow-y: auto; padding: 4px 2px; margin-bottom: 10px;">
                    ${CPOE_PRESET_ITEMS.map((item) => `
                        <button type="button" class="cpoe-item-pill" data-id="${item.id}" data-code="${item.code}" data-category="${item.category}" data-name="${escapeHtml(item.name)}" title="${escapeHtml(item.tip || '')}"
                            style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; font-size: 11.5px; font-weight: 500; border: 1px solid #e2e8f0; background: #f8fafc; color: #1e293b; border-radius: 16px; cursor: pointer; transition: all 0.15s ease;">
                            <span>${item.icon}</span>
                            <span>${escapeHtml(item.code)}</span>
                            <small style="color: #64748b; font-size: 10px;">(${item.category === 'radiology' ? 'Rad' : item.category === 'culture' ? 'Cx' : 'Lab'})</small>
                        </button>
                    `).join("")}
                </div>

                <!-- Selected Diagnostics Basket -->
                <div id="cpoe_basket_wrapper" style="display: none; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 11px; font-weight: 700; color: #166534;">Selected Diagnostic Orders:</span>
                        <button type="button" id="cpoe_clear_basket_btn" style="font-size: 10px; color: #dc2626; background: none; border: none; cursor: pointer; text-decoration: underline;">Clear all</button>
                    </div>
                    <div id="cpoe_basket_items" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
                </div>

                <!-- Order Controls & 1-Click Dispatch -->
                <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
                    <!-- Priority Segmented Control -->
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 11px; font-weight: 600; color: #475569;">Priority:</span>
                        <div style="display: inline-flex; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff;">
                            <label style="padding: 3px 8px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 3px; border-right: 1px solid #e2e8f0;">
                                <input type="radio" name="cpoe_priority" value="routine" checked style="accent-color: #0284c7;"> Routine
                            </label>
                            <label style="padding: 3px 8px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 3px; border-right: 1px solid #e2e8f0;">
                                <input type="radio" name="cpoe_priority" value="urgent" style="accent-color: #f59e0b;"> Urgent
                            </label>
                            <label style="padding: 3px 8px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 3px; color: #b91c1c; font-weight: 600;">
                                <input type="radio" name="cpoe_priority" value="stat" style="accent-color: #ef4444;"> STAT
                            </label>
                        </div>
                    </div>

                    <!-- Clinical Indication / Notes -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <input type="text" id="cpoe_indication_input" class="form-input" placeholder="Clinical indication (e.g. fever, right flank pain)..." value="${escapeHtml(clinicalIndication)}" style="padding: 4px 8px; font-size: 11.5px; width: 100%;">
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #475569; white-space: nowrap; cursor: pointer;">
                            <input type="checkbox" id="cpoe_fasting_checkbox" style="accent-color: #0284c7;"> Fasting
                        </label>
                    </div>

                    <!-- 1-Click Order Button -->
                    <div>
                        <button type="button" id="cpoe_submit_btn" style="padding: 6px 14px; font-size: 12px; font-weight: 700; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(2,132,199,0.3);">
                            <span>⚡ Order Diagnostics (1-Click)</span>
                        </button>
                    </div>
                </div>

                <div id="cpoe_order_alert" style="margin-top: 8px;"></div>

                <!-- Existing / Active Consultation Orders -->
                ${existingOrders && existingOrders.length ? `
                    <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">Orders On File For This Visit:</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${existingOrders.map((ord) => `
                                <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px;">
                                    <strong>${escapeHtml(ord.code || ord.name)}</strong>
                                    <small style="color: #64748b;">(${escapeHtml(ord.request_no)})</small>
                                    <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 10px; font-weight: 600; background: ${ord.status === 'resulted' ? '#dcfce7' : '#e0f2fe'}; color: ${ord.status === 'resulted' ? '#15803d' : '#0369a1'};">
                                        ${escapeHtml(ord.status)}
                                    </span>
                                </span>
                            `).join("")}
                        </div>
                    </div>
                ` : ""}
            </div>
        </div>
    `;
}

/**
 * Initializes interactive events for the CPOE Order Pad.
 */
export function initCpoeOrderPadEvents(container, { patientId, encounterId, onOrderSuccess } = {})
{
    if (!container) return;

    const basketItemsContainer = container.querySelector("#cpoe_basket_items");
    const basketWrapper = container.querySelector("#cpoe_basket_wrapper");
    const selectedBadge = container.querySelector("#cpoe_selected_badge");
    const searchInput = container.querySelector("#cpoe_search_input");
    const categoryBtns = container.querySelectorAll(".cpoe-cat-btn");
    const itemPills = container.querySelectorAll(".cpoe-item-pill");
    const clearBtn = container.querySelector("#cpoe_clear_basket_btn");
    const submitBtn = container.querySelector("#cpoe_submit_btn");
    const alertBox = container.querySelector("#cpoe_order_alert");

    const selectedMap = new Map(); // id -> item details

    const refreshBasket = () => {
        if (!basketItemsContainer || !basketWrapper) return;

        const count = selectedMap.size;

        if (count === 0) {
            basketWrapper.style.display = "none";
            if (selectedBadge) selectedBadge.style.display = "none";
            itemPills.forEach((p) => {
                p.style.background = "#f8fafc";
                p.style.borderColor = "#e2e8f0";
                p.style.color = "#1e293b";
            });
            return;
        }

        basketWrapper.style.display = "block";
        if (selectedBadge) {
            selectedBadge.style.display = "inline-block";
            selectedBadge.textContent = `${count} selected`;
        }

        basketItemsContainer.innerHTML = Array.from(selectedMap.values()).map((item) => `
            <span class="cpoe-basket-chip" data-id="${item.id}" style="display: inline-flex; align-items: center; gap: 4px; background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 2px 7px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                <span>${item.icon || '✓'}</span>
                <span>${escapeHtml(item.name || item.code)}</span>
                <button type="button" class="cpoe-remove-item-btn" data-id="${item.id}" style="background: none; border: none; color: #15803d; cursor: pointer; padding: 0 2px; font-weight: bold;">&times;</button>
            </span>
        `).join("");

        // Highlight active pills in grid
        itemPills.forEach((p) => {
            const id = p.getAttribute("data-id");
            if (selectedMap.has(id)) {
                p.style.background = "#dcfce7";
                p.style.borderColor = "#22c55e";
                p.style.color = "#15803d";
                p.style.fontWeight = "700";
            } else {
                p.style.background = "#f8fafc";
                p.style.borderColor = "#e2e8f0";
                p.style.color = "#1e293b";
                p.style.fontWeight = "500";
            }
        });

        // Bind remove buttons
        basketItemsContainer.querySelectorAll(".cpoe-remove-item-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                selectedMap.delete(id);
                refreshBasket();
            });
        });
    };

    // Category Tabs Filter
    categoryBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            categoryBtns.forEach((b) => {
                b.classList.remove("active");
                b.style.background = "#f8fafc";
                b.style.color = "#334155";
            });
            btn.classList.add("active");
            btn.style.background = "#0284c7";
            btn.style.color = "#ffffff";

            const cat = btn.getAttribute("data-cat");
            const q = searchInput ? searchInput.value.trim().toLowerCase() : "";

            itemPills.forEach((pill) => {
                const itemCat = pill.getAttribute("data-category");
                const itemName = (pill.getAttribute("data-name") || "").toLowerCase();
                const itemCode = (pill.getAttribute("data-code") || "").toLowerCase();

                const catMatch = cat === "all" || itemCat === cat;
                const searchMatch = !q || itemName.includes(q) || itemCode.includes(q);

                pill.style.display = catMatch && searchMatch ? "inline-flex" : "none";
            });
        });
    });

    // Real-time Search Input
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const q = e.target.value.trim().toLowerCase();
            const activeCat = container.querySelector(".cpoe-cat-btn.active")?.getAttribute("data-cat") || "all";

            itemPills.forEach((pill) => {
                const itemCat = pill.getAttribute("data-category");
                const itemName = (pill.getAttribute("data-name") || "").toLowerCase();
                const itemCode = (pill.getAttribute("data-code") || "").toLowerCase();

                const catMatch = activeCat === "all" || itemCat === activeCat;
                const searchMatch = !q || itemName.includes(q) || itemCode.includes(q);

                pill.style.display = catMatch && searchMatch ? "inline-flex" : "none";
            });
        });
    }

    // Toggle items on pill click
    itemPills.forEach((pill) => {
        pill.addEventListener("click", () => {
            const id = pill.getAttribute("data-id");
            const code = pill.getAttribute("data-code");
            const name = pill.getAttribute("data-name");
            const category = pill.getAttribute("data-category");

            if (selectedMap.has(id)) {
                selectedMap.delete(id);
            } else {
                selectedMap.set(id, { id, code, name, category, icon: pill.querySelector("span")?.textContent || "✓" });
            }
            refreshBasket();
        });
    });

    // Clear all
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            selectedMap.clear();
            refreshBasket();
        });
    }

    // 1-Click Order Submission
    if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
            if (selectedMap.size === 0) {
                if (alertBox) {
                    alertBox.innerHTML = `<div style="padding: 6px 10px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 4px; font-size: 11.5px;">Please select at least one diagnostic test or study from the pad above.</div>`;
                }
                return;
            }

            const priority = container.querySelector('input[name="cpoe_priority"]:checked')?.value || "routine";
            const indication = container.querySelector("#cpoe_indication_input")?.value?.trim() || "";
            const fasting = !!container.querySelector("#cpoe_fasting_checkbox")?.checked;

            const labTestCodes = [];
            const radStudyCodes = [];

            selectedMap.forEach((item) => {
                if (item.category === "radiology") {
                    radStudyCodes.push(item.code || item.id);
                } else {
                    labTestCodes.push(item.code || item.id);
                }
            });

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>⏳ Submitting Orders...</span>`;
            if (alertBox) alertBox.innerHTML = "";

            try {
                // Call CPOE Ordering Service API
                const response = await fetch("/api/cpoe-diagnostics/order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        patient_id: patientId,
                        encounter_id: encounterId,
                        test_codes: labTestCodes,
                        study_codes: radStudyCodes,
                        priority,
                        clinical_indication: indication,
                        fasting
                    })
                });

                const res = await response.json();

                if (res && res.success) {
                    const total = res.data?.total_orders || selectedMap.size;
                    const reqNumbers = [];
                    if (res.data?.lab_request?.request_no) reqNumbers.push(`Lab: ${res.data.lab_request.request_no}`);
                    if (res.data?.radiology_request?.request_no) reqNumbers.push(`Rad: ${res.data.radiology_request.request_no}`);

                    const orderedNames = Array.from(selectedMap.values()).map((x) => x.name || x.code);

                    if (alertBox) {
                        alertBox.innerHTML = `
                            <div style="padding: 8px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 4px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <strong>✅ ${total} Diagnostic Order(s) Dispatched!</strong>
                                    ${reqNumbers.length ? ` <span style="font-size: 11px; color: #047857;">(${reqNumbers.join(' · ')})</span>` : ""}
                                </div>
                                <span style="font-size: 11px; background: #d1fae5; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${priority.toUpperCase()}</span>
                            </div>
                        `;
                    }

                    // Auto-sync into Plan textarea in the consultation note
                    const planTextarea = document.getElementById("soap_plan");
                    if (planTextarea) {
                        const orderSummaryLine = `Diagnostic Orders (${priority.toUpperCase()}): ${orderedNames.join(", ")}.`;
                        const curPlan = planTextarea.value.trim();
                        if (!curPlan.includes(orderSummaryLine)) {
                            planTextarea.value = curPlan ? `${curPlan}\n${orderSummaryLine}` : orderSummaryLine;
                        }
                    }

                    selectedMap.clear();
                    refreshBasket();

                    if (typeof onOrderSuccess === "function") {
                        onOrderSuccess(res.data);
                    }
                } else {
                    if (alertBox) {
                        alertBox.innerHTML = `<div style="padding: 6px 10px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 4px; font-size: 11.5px;">${escapeHtml(res?.message || 'Failed to place orders.')}</div>`;
                    }
                }
            } catch (err) {
                if (alertBox) {
                    alertBox.innerHTML = `<div style="padding: 6px 10px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 4px; font-size: 11.5px;">An error occurred while transmitting diagnostic orders.</div>`;
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>⚡ Order Diagnostics (1-Click)</span>`;
            }
        });
    }
}

/**
 * Extracts any unsubmitted CPOE diagnostic orders from the pad to bundle with SOAP note save.
 */
export function extractCpoeOrderData(container)
{
    if (!container) return null;

    const basketItems = container.querySelectorAll(".cpoe-basket-chip");
    if (!basketItems || basketItems.length === 0) return null;

    const testCodes = [];
    const studyCodes = [];

    basketItems.forEach((chip) => {
        const id = chip.getAttribute("data-id");
        const item = CPOE_PRESET_ITEMS.find((x) => x.id === id);
        if (item) {
            if (item.category === "radiology") {
                studyCodes.push(item.code || item.id);
            } else {
                testCodes.push(item.code || item.id);
            }
        }
    });

    const priority = container.querySelector('input[name="cpoe_priority"]:checked')?.value || "routine";
    const indication = container.querySelector("#cpoe_indication_input")?.value?.trim() || "";
    const fasting = !!container.querySelector("#cpoe_fasting_checkbox")?.checked;

    return {
        test_codes: testCodes,
        study_codes: studyCodes,
        priority,
        clinical_indication: indication,
        fasting
    };
}

/**
 * Renders the Diagnostic Orders card for the Encounter Summary panel.
 */
export function renderEncounterDiagnosticOrdersCard(orders = [])
{
    if (!orders || orders.length === 0) {
        return `
            <div class="pd-report-card" id="pdEncounterDiagnosticOrdersCard">
                <div class="pd-report-card-header">
                    <h3><span>🔬</span> Diagnostic Requisitions (CPOE)</h3>
                </div>
                <div class="pd-report-card-body">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">No diagnostic requisitions ordered for this encounter yet.</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="pd-report-card" id="pdEncounterDiagnosticOrdersCard">
            <div class="pd-report-card-header">
                <h3>
                    <span>🔬</span> Diagnostic Requisitions (CPOE)
                    <span style="font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 2px 7px; border-radius: 10px; font-weight: 600; margin-left: 6px;">
                        ${orders.length} order(s)
                    </span>
                </h3>
            </div>
            <div class="pd-report-card-body" style="padding: 10px 14px;">
                <table class="data-table" style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
                            <th style="padding: 6px 8px;">Order Type</th>
                            <th style="padding: 6px 8px;">Test / Study</th>
                            <th style="padding: 6px 8px;">Req #</th>
                            <th style="padding: 6px 8px;">Priority</th>
                            <th style="padding: 6px 8px;">Status</th>
                            <th style="padding: 6px 8px;">Ordered At</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map((ord) => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 6px 8px;">
                                    <span style="font-weight: 600; color: ${ord.category === 'Radiology' ? '#7c3aed' : ord.category === 'Culture' ? '#d97706' : '#0284c7'};">
                                        ${ord.category === 'Radiology' ? '🩻 Rad' : ord.category === 'Culture' ? '🧫 Cx' : '🩸 Lab'}
                                    </span>
                                </td>
                                <td style="padding: 6px 8px; font-weight: 600; color: #1e293b;">
                                    ${escapeHtml(ord.name)}
                                </td>
                                <td style="padding: 6px 8px; font-family: monospace; font-size: 11px; color: #475569;">
                                    ${escapeHtml(ord.request_no)}
                                </td>
                                <td style="padding: 6px 8px;">
                                    <span style="font-size: 10px; padding: 1px 5px; border-radius: 4px; font-weight: 600; background: ${ord.priority === 'stat' ? '#fee2e2' : ord.priority === 'urgent' ? '#fef3c7' : '#f1f5f9'}; color: ${ord.priority === 'stat' ? '#b91c1c' : ord.priority === 'urgent' ? '#b45309' : '#475569'};">
                                        ${escapeHtml((ord.priority || 'routine').toUpperCase())}
                                    </span>
                                </td>
                                <td style="padding: 6px 8px;">
                                    <span style="font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 600; background: ${ord.status === 'resulted' ? '#dcfce7' : ord.status === 'scheduled' ? '#e0f2fe' : '#fef9c3'}; color: ${ord.status === 'resulted' ? '#15803d' : ord.status === 'scheduled' ? '#0369a1' : '#a16207'};">
                                        ${escapeHtml(ord.status)}
                                    </span>
                                </td>
                                <td style="padding: 6px 8px; color: #64748b; font-size: 11px;">
                                    ${escapeHtml(ord.order_date || '-')}
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
