-- 313_blood_transfusion_and_reactions.sql
-- Blood Bank Management (Part 4): Bedside Transfusion Verification & Reaction Investigation Log
-- Features:
--   1. Dual-nurse bedside verification checklist before starting transfusion.
--   2. Hourly vital monitoring protocol (baseline pre-transfusion, 15 min, hourly, and post-transfusion).
--   3. Transfusion Reaction Investigation logging (AHTR, TRALI, TACO, FNHTR, Anaphylaxis, Sepsis).
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS blood_transfusions (
    id INT NOT NULL AUTO_INCREMENT,
    transfusion_number VARCHAR(32) NOT NULL,                -- BT-YYYY-XXXXX
    patient_id INT NOT NULL,                               -- patients.id
    blood_unit_id INT NOT NULL,                            -- blood_inventory_units.id
    crossmatch_id INT DEFAULT NULL,                        -- blood_crossmatches.id
    order_id INT DEFAULT NULL,                             -- patient_procedure_orders.id
    prescribing_physician VARCHAR(150) DEFAULT NULL,
    clinical_indication VARCHAR(255) DEFAULT NULL,         -- e.g. "Acute upper GI hemorrhage (Hb 6.4 g/dL)"
    
    -- Transfusion Lifecycle Status:
    status ENUM('verified_ready', 'infusing', 'completed', 'stopped_reaction', 'cancelled') NOT NULL DEFAULT 'verified_ready',
    
    -- Dual-Nurse Bedside Pre-Transfusion Verification Checklist:
    verified_patient_identity TINYINT(1) NOT NULL DEFAULT 0,  -- Patient 2-identifier wristband match
    verified_unit_number TINYINT(1) NOT NULL DEFAULT 0,        -- Blood unit DIN match
    verified_blood_group TINYINT(1) NOT NULL DEFAULT 0,        -- Recipient & Donor ABO/Rh match tag
    verified_component_type TINYINT(1) NOT NULL DEFAULT 0,     -- Component type matches order
    verified_expiration_date TINYINT(1) NOT NULL DEFAULT 0,    -- Unit is within expiration
    verified_visual_inspection TINYINT(1) NOT NULL DEFAULT 0,  -- Unit inspected (no clots, hemolysis, discoloration, gas)
    verified_patient_consent TINYINT(1) NOT NULL DEFAULT 0,    -- Informed transfusion consent on chart
    
    -- Nurse 1 (Primary / Administering Nurse):
    primary_nurse_id INT DEFAULT NULL,
    primary_nurse_name VARCHAR(150) NOT NULL,
    primary_nurse_license VARCHAR(50) DEFAULT NULL,
    primary_nurse_verified_at DATETIME NOT NULL,
    
    -- Nurse 2 (Witnessing / Second Verification Nurse):
    witness_nurse_id INT DEFAULT NULL,
    witness_nurse_name VARCHAR(150) NOT NULL,
    witness_nurse_license VARCHAR(50) DEFAULT NULL,
    witness_nurse_verified_at DATETIME NOT NULL,
    
    -- Administration Parameters:
    iv_access_site VARCHAR(100) DEFAULT NULL,               -- e.g. "Right Antecubital 18G", "PICC lumen 1"
    infusion_started_at DATETIME DEFAULT NULL,
    infusion_target_duration_mins INT DEFAULT 120,         -- e.g. 120-240 mins
    initial_flow_rate_ml_hr INT DEFAULT 120,               -- Slow rate for initial 15 mins
    infusion_completed_at DATETIME DEFAULT NULL,
    volume_transfused_ml INT DEFAULT NULL,                 -- e.g. 350 mL
    has_transfusion_reaction TINYINT(1) NOT NULL DEFAULT 0,
    completion_notes TEXT DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_blood_tx_no (transfusion_number),
    KEY idx_blood_tx_patient (patient_id, status),
    KEY idx_blood_tx_unit (blood_unit_id, status),
    KEY idx_blood_tx_started (infusion_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_transfusion_vitals (
    id INT NOT NULL AUTO_INCREMENT,
    transfusion_id INT NOT NULL,                           -- blood_transfusions.id
    vital_stage ENUM('baseline_pre', '15_min', '30_min', '1_hour', '2_hour', '3_hour', '4_hour', 'post_transfusion', 'reaction_onset') NOT NULL,
    recorded_at DATETIME NOT NULL,
    temperature_c DECIMAL(4,1) NOT NULL,
    heart_rate_bpm SMALLINT NOT NULL,
    bp_systolic SMALLINT NOT NULL,
    bp_diastolic SMALLINT NOT NULL,
    respiratory_rate_bpm SMALLINT NOT NULL,
    spo2_percent DECIMAL(4,1) NOT NULL,
    patient_symptoms TEXT DEFAULT NULL,
    recorded_by_nurse VARCHAR(150) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_tx_vitals_tx_stage (transfusion_id, vital_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_transfusion_reactions (
    id INT NOT NULL AUTO_INCREMENT,
    reaction_number VARCHAR(32) NOT NULL,                  -- TR-YYYY-XXXXX
    transfusion_id INT NOT NULL,                           -- blood_transfusions.id
    patient_id INT NOT NULL,                               -- patients.id
    blood_unit_id INT NOT NULL,                            -- blood_inventory_units.id
    reported_at DATETIME NOT NULL,
    reaction_onset_time DATETIME NOT NULL,
    ml_transfused_at_onset INT NOT NULL DEFAULT 0,
    
    -- Bedside Symptoms & Clinical Presentation:
    symptom_fever TINYINT(1) NOT NULL DEFAULT 0,           -- Temp >= 38°C or >= 1°C increase
    symptom_chills_rigors TINYINT(1) NOT NULL DEFAULT 0,
    symptom_dyspnea_hypoxia TINYINT(1) NOT NULL DEFAULT 0, -- TRALI / TACO / Anaphylaxis
    symptom_tachycardia_hypotension TINYINT(1) NOT NULL DEFAULT 0, -- Sepsis / AHTR / Anaphylaxis
    symptom_hypertension TINYINT(1) NOT NULL DEFAULT 0,    -- TACO
    symptom_urticaria_hives TINYINT(1) NOT NULL DEFAULT 0, -- Allergic
    symptom_facial_edema_stridor TINYINT(1) NOT NULL DEFAULT 0, -- Anaphylactic
    symptom_back_flank_pain TINYINT(1) NOT NULL DEFAULT 0, -- AHTR
    symptom_hemoglobinuria_dark_urine TINYINT(1) NOT NULL DEFAULT 0, -- AHTR
    symptom_nausea_vomiting TINYINT(1) NOT NULL DEFAULT 0,
    symptom_details TEXT DEFAULT NULL,
    
    -- Bedside Immediate Emergency Protocol Actions:
    action_transfusion_stopped TINYINT(1) NOT NULL DEFAULT 1,
    action_saline_infusion_maintained TINYINT(1) NOT NULL DEFAULT 1,
    action_physician_notified TINYINT(1) NOT NULL DEFAULT 1,
    action_blood_bank_notified TINYINT(1) NOT NULL DEFAULT 1,
    action_unit_and_tubing_returned TINYINT(1) NOT NULL DEFAULT 1,
    action_post_blood_urine_sent TINYINT(1) NOT NULL DEFAULT 1,
    attending_physician_notified VARCHAR(150) DEFAULT NULL,
    emergency_medications_given TEXT DEFAULT NULL,
    
    -- Blood Bank & Laboratory Diagnostic Investigation:
    investigation_status ENUM('under_investigation', 'clerical_check_passed', 'preliminary_complete', 'final_closed') NOT NULL DEFAULT 'under_investigation',
    clerical_check_match ENUM('match_confirmed', 'clerical_mismatch_detected') NOT NULL DEFAULT 'match_confirmed',
    visual_hemolysis_post_sample ENUM('clear_negative', 'pink_red_hemolysis', 'icteric') NOT NULL DEFAULT 'clear_negative',
    direct_antiglobulin_test_dat ENUM('negative', 'positive_1plus', 'positive_2plus', 'positive_3plus', 'positive_4plus', 'pending') NOT NULL DEFAULT 'pending',
    repeat_abo_rh_match ENUM('match_confirmed', 'discrepancy_found', 'pending') NOT NULL DEFAULT 'pending',
    blood_bag_gram_stain ENUM('no_organisms', 'gram_positive', 'gram_negative', 'pending') NOT NULL DEFAULT 'pending',
    blood_bag_culture_result VARCHAR(150) DEFAULT NULL,
    free_hemoglobin_in_urine ENUM('negative', 'trace', 'moderate', 'gross', 'pending') NOT NULL DEFAULT 'pending',
    
    -- Final Pathological Diagnosis & Classification:
    reaction_classification ENUM(
        'acute_hemolytic',          -- Acute Hemolytic Transfusion Reaction (AHTR)
        'febrile_non_hemolytic',    -- Febrile Non-Hemolytic (FNHTR)
        'mild_allergic_urticarial', -- Urticarial / Mild Allergic
        'anaphylactic_severe',      -- Anaphylaxis
        'trali',                    -- Transfusion-Related Acute Lung Injury
        'taco',                     -- Transfusion-Associated Circulatory Overload
        'sepsis_bacterial',         -- Transfusion-Transmitted Bacterial Infection
        'delayed_hemolytic',        -- Delayed Hemolytic (DHTR)
        'unrelated_other'           -- Unrelated Event
    ) DEFAULT NULL,
    severity_level ENUM('mild', 'moderate', 'severe', 'life_threatening', 'fatal') NOT NULL DEFAULT 'mild',
    pathologist_evaluator VARCHAR(150) DEFAULT NULL,
    pathologist_notes TEXT DEFAULT NULL,
    pathologist_signed_at DATETIME DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_blood_rx_no (reaction_number),
    KEY idx_blood_rx_tx (transfusion_id),
    KEY idx_blood_rx_patient (patient_id),
    KEY idx_blood_rx_classification (reaction_classification),
    KEY idx_blood_rx_status (investigation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_transfusion_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_reaction_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
