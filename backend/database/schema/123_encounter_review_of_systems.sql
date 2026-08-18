-- =============================================
-- Table: encounter_review_of_systems
-- One row per encounter -- the Review of Systems checklist, 16
-- body-system categories each with several 3-way (N/A/Yes/No)
-- symptom fields. Field names are prefixed per section to keep
-- every column name unique (several labels like "Weakness",
-- "Redness", "Discharge", "Pain", "Frequency" repeat across
-- different sections in the source form).
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_review_of_systems (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    constitutional_weight_change ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_anorexia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_night_sweats ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_heat_or_cold ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_weakness ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_fever ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_insomnia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_intolerance ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_fatigue ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_chills ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    constitutional_irritability ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_change_in_vision ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_irritation ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_double_vision ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_family_history_glaucoma ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_redness ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_blind_spots ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_eye_pain ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_excessive_tearing ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    eyes_photophobia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_hearing_loss ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_vertigo ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_sore_throat ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_nosebleed ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_discharge ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_tinnitus ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_sinus_problems ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_snoring ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_pain ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_frequent_colds ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_post_nasal_drip ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    ent_apnea ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    breast_mass ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    breast_abnormal_mammogram ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    breast_discharge ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    breast_biopsy ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    resp_cough ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    resp_wheezing ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    resp_copd ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    resp_sputum ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    resp_hemoptysis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    resp_shortness_of_breath ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    resp_asthma ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_chest_pain ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_pnd ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_peripheral ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_history_heart_murmur ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_palpitation ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_doe ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_edema ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_arrythmia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_syncope ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_orthopnea ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_leg_pain_cramping ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    cv_heart_problem ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_dysphagia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_belching ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_vomiting ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_food_intolerance ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_hematochezia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_constipation ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_heartburn ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_flatulence ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_hematemesis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_ho_hepatitis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_changed_bowel ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_bloating ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_nausea ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gi_pain ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_polyuria ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_hematuria ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_incontinence ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_polydypsia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_frequency ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_renal_stones ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_dysuria ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_urgency ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_general_utis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_male_hesitancy ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_male_nocturia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_male_dribbling ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_male_erections ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_male_stream ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_male_ejaculations ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_g ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_lc ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_lmp ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_symptoms ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_p ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_menarche ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_frequency ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_abnormal_hair_growth ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_ap ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_menopause ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_flow ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    gu_female_fh_hirsutism_striae ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_chronic_joint_pain ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_warm ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_aches ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_swelling ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_stiffness ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_fms ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_redness ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_muscle ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    msk_arthritis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_loc ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_tia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_paralysis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_dementia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_seizures ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_numbness ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_intellectual_decline ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_headache ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_stroke ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_weakness ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    neuro_memory_problems ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    skin_cancer ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    skin_other ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    skin_psoriasis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    skin_disease ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    skin_acne ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    psych_psychiatric_diagnosis ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    psych_anxiety ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    psych_psychiatric_medication ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    psych_social_difficulties ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    psych_depression ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    endo_thyroid_problems ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    endo_diabetes ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    endo_abnormal_blood_test ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    hai_anemia ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    hai_allergies ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    hai_hai_status ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    hai_fh_blood_problems ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    hai_frequent_illness ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    hai_bleeding_problems ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',

    hai_hiv ENUM('na', 'yes', 'no') NOT NULL DEFAULT 'na',
    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_encounter_review_of_systems_encounter
        UNIQUE (encounter_id),

    INDEX idx_encounter_review_of_systems_created_by (created_by),

    INDEX idx_encounter_review_of_systems_updated_by (updated_by),

    CONSTRAINT fk_encounter_review_of_systems_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
