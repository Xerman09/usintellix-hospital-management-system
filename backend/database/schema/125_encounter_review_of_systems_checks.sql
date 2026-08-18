-- =============================================
-- Table: encounter_review_of_systems_checks
-- One row per encounter -- the "Review of Systems Checks" form,
-- a simple checkbox checklist (distinct from encounter_review_of_systems,
-- which is the 3-way N/A/Yes/No Review Of Systems form) across 9
-- categories, plus a free-text Additional Notes field. Field names
-- are prefixed per category to keep every column name unique
-- ("Shortness of Breath" appears in both Pulmonary and Cardiovascular
-- in the source form).
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_review_of_systems_checks (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    general_fever TINYINT(1) NOT NULL DEFAULT 0,

    general_chills TINYINT(1) NOT NULL DEFAULT 0,

    general_night_sweats TINYINT(1) NOT NULL DEFAULT 0,

    general_weight_loss TINYINT(1) NOT NULL DEFAULT 0,

    general_poor_appetite TINYINT(1) NOT NULL DEFAULT 0,

    general_insomnia TINYINT(1) NOT NULL DEFAULT 0,

    general_fatigued TINYINT(1) NOT NULL DEFAULT 0,

    general_depressed TINYINT(1) NOT NULL DEFAULT 0,

    general_hyperactive TINYINT(1) NOT NULL DEFAULT 0,

    general_exposure_foreign_countries TINYINT(1) NOT NULL DEFAULT 0,

    skin_rashes TINYINT(1) NOT NULL DEFAULT 0,

    skin_infections TINYINT(1) NOT NULL DEFAULT 0,

    skin_ulcerations TINYINT(1) NOT NULL DEFAULT 0,

    skin_pemphigus TINYINT(1) NOT NULL DEFAULT 0,

    skin_herpes TINYINT(1) NOT NULL DEFAULT 0,

    heent_cataracts TINYINT(1) NOT NULL DEFAULT 0,

    heent_cataract_surgery TINYINT(1) NOT NULL DEFAULT 0,

    heent_glaucoma TINYINT(1) NOT NULL DEFAULT 0,

    heent_double_vision TINYINT(1) NOT NULL DEFAULT 0,

    heent_blurred_vision TINYINT(1) NOT NULL DEFAULT 0,

    heent_poor_hearing TINYINT(1) NOT NULL DEFAULT 0,

    heent_headaches TINYINT(1) NOT NULL DEFAULT 0,

    heent_ringing_in_ears TINYINT(1) NOT NULL DEFAULT 0,

    heent_bloody_nose TINYINT(1) NOT NULL DEFAULT 0,

    heent_sinusitis TINYINT(1) NOT NULL DEFAULT 0,

    heent_sinus_surgery TINYINT(1) NOT NULL DEFAULT 0,

    heent_dry_mouth TINYINT(1) NOT NULL DEFAULT 0,

    heent_strep_throat TINYINT(1) NOT NULL DEFAULT 0,

    heent_tonsillectomy TINYINT(1) NOT NULL DEFAULT 0,

    heent_swollen_lymph_nodes TINYINT(1) NOT NULL DEFAULT 0,

    heent_throat_cancer TINYINT(1) NOT NULL DEFAULT 0,

    heent_throat_cancer_surgery TINYINT(1) NOT NULL DEFAULT 0,

    pulm_emphysema TINYINT(1) NOT NULL DEFAULT 0,

    pulm_chronic_bronchitis TINYINT(1) NOT NULL DEFAULT 0,

    pulm_interstitial_lung_disease TINYINT(1) NOT NULL DEFAULT 0,

    pulm_shortness_of_breath TINYINT(1) NOT NULL DEFAULT 0,

    pulm_lung_cancer TINYINT(1) NOT NULL DEFAULT 0,

    pulm_lung_cancer_surgery TINYINT(1) NOT NULL DEFAULT 0,

    pulm_pheumothorax TINYINT(1) NOT NULL DEFAULT 0,

    cv_heart_attack TINYINT(1) NOT NULL DEFAULT 0,

    cv_irregular_heart_beat TINYINT(1) NOT NULL DEFAULT 0,

    cv_chest_pains TINYINT(1) NOT NULL DEFAULT 0,

    cv_shortness_of_breath TINYINT(1) NOT NULL DEFAULT 0,

    cv_high_blood_pressure TINYINT(1) NOT NULL DEFAULT 0,

    cv_heart_failure TINYINT(1) NOT NULL DEFAULT 0,

    cv_poor_circulation TINYINT(1) NOT NULL DEFAULT 0,

    cv_vascular_surgery TINYINT(1) NOT NULL DEFAULT 0,

    cv_cardiac_catheterization TINYINT(1) NOT NULL DEFAULT 0,

    cv_coronary_artery_bypass TINYINT(1) NOT NULL DEFAULT 0,

    cv_heart_transplant TINYINT(1) NOT NULL DEFAULT 0,

    cv_stress_test TINYINT(1) NOT NULL DEFAULT 0,

    gi_stomach_pains TINYINT(1) NOT NULL DEFAULT 0,

    gi_peptic_ulcer_disease TINYINT(1) NOT NULL DEFAULT 0,

    gi_gastritis TINYINT(1) NOT NULL DEFAULT 0,

    gi_endoscopy TINYINT(1) NOT NULL DEFAULT 0,

    gi_polyps TINYINT(1) NOT NULL DEFAULT 0,

    gi_colonoscopy TINYINT(1) NOT NULL DEFAULT 0,

    gi_colon_cancer TINYINT(1) NOT NULL DEFAULT 0,

    gi_colon_cancer_surgery TINYINT(1) NOT NULL DEFAULT 0,

    gi_ulcerative_colitis TINYINT(1) NOT NULL DEFAULT 0,

    gi_crohns_disease TINYINT(1) NOT NULL DEFAULT 0,

    gi_appendectomy TINYINT(1) NOT NULL DEFAULT 0,

    gi_diverticulitis TINYINT(1) NOT NULL DEFAULT 0,

    gi_diverticulitis_surgery TINYINT(1) NOT NULL DEFAULT 0,

    gi_gall_stones TINYINT(1) NOT NULL DEFAULT 0,

    gi_cholecystectomy TINYINT(1) NOT NULL DEFAULT 0,

    gi_hepatitis TINYINT(1) NOT NULL DEFAULT 0,

    gi_cirrhosis_liver TINYINT(1) NOT NULL DEFAULT 0,

    gi_splenectomy TINYINT(1) NOT NULL DEFAULT 0,

    gu_kidney_failure TINYINT(1) NOT NULL DEFAULT 0,

    gu_kidney_stones TINYINT(1) NOT NULL DEFAULT 0,

    gu_kidney_cancer TINYINT(1) NOT NULL DEFAULT 0,

    gu_kidney_infections TINYINT(1) NOT NULL DEFAULT 0,

    gu_bladder_infections TINYINT(1) NOT NULL DEFAULT 0,

    gu_bladder_cancer TINYINT(1) NOT NULL DEFAULT 0,

    gu_prostate_problems TINYINT(1) NOT NULL DEFAULT 0,

    gu_prostate_cancer TINYINT(1) NOT NULL DEFAULT 0,

    gu_kidney_transplant TINYINT(1) NOT NULL DEFAULT 0,

    gu_sexually_transmitted_disease TINYINT(1) NOT NULL DEFAULT 0,

    gu_burning_with_urination TINYINT(1) NOT NULL DEFAULT 0,

    gu_discharge_from_urethra TINYINT(1) NOT NULL DEFAULT 0,

    msk_osetoarthritis TINYINT(1) NOT NULL DEFAULT 0,

    msk_rheumotoid_arthritis TINYINT(1) NOT NULL DEFAULT 0,

    msk_lupus TINYINT(1) NOT NULL DEFAULT 0,

    msk_ankylosing_spondlilitis TINYINT(1) NOT NULL DEFAULT 0,

    msk_swollen_joints TINYINT(1) NOT NULL DEFAULT 0,

    msk_stiff_joints TINYINT(1) NOT NULL DEFAULT 0,

    msk_broken_bones TINYINT(1) NOT NULL DEFAULT 0,

    msk_neck_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_back_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_back_surgery TINYINT(1) NOT NULL DEFAULT 0,

    msk_scoliosis TINYINT(1) NOT NULL DEFAULT 0,

    msk_herniated_disc TINYINT(1) NOT NULL DEFAULT 0,

    msk_shoulder_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_elbow_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_wrist_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_hand_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_hip_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_knee_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_ankle_problems TINYINT(1) NOT NULL DEFAULT 0,

    msk_foot_problems TINYINT(1) NOT NULL DEFAULT 0,

    endo_insulin_dependent_diabetes TINYINT(1) NOT NULL DEFAULT 0,

    endo_non_insulin_dependent_diabetes TINYINT(1) NOT NULL DEFAULT 0,

    endo_hypothyroidism TINYINT(1) NOT NULL DEFAULT 0,

    endo_hyperthyroidism TINYINT(1) NOT NULL DEFAULT 0,

    endo_cushing_syndrome TINYINT(1) NOT NULL DEFAULT 0,

    endo_addison_syndrome TINYINT(1) NOT NULL DEFAULT 0,
    additional_notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_encounter_review_of_systems_checks_encounter
        UNIQUE (encounter_id),

    INDEX idx_encounter_review_of_systems_checks_created_by (created_by),

    INDEX idx_encounter_review_of_systems_checks_updated_by (updated_by),

    CONSTRAINT fk_encounter_review_of_systems_checks_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
