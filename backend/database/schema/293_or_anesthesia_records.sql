-- ============================================================================
-- Migration 293: Operation Theater (OT) Electronic Anesthesia Record
-- Table: or_anesthesia_records
-- ============================================================================
-- Provides anesthesiologists a dedicated clinical workspace to document:
--   1. ASA Physical Status Classification (ASA I–VI + Emergency 'E' modifier)
--   2. Mallampati Airway Classification (Class I–IV) & Airway Assessment
--   3. Anesthesia Modality (General, Spinal, Epidural, CSE, MAC, Regional, Local)
--   4. Airway Device, Laryngoscopy, Cormack-Lehane Grade & ETT Sizing
--   5. Induction, Maintenance, Neuromuscular Blockade & Reversal Drugs
--   6. Intraoperative Fluid Balance & Estimated Blood Loss (EBL in mL)
--   7. PACU Aldrete Post-Anesthesia Recovery Score (5 Domains, 0–10 Total)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `or_anesthesia_records` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `record_number` VARCHAR(40) NOT NULL COMMENT 'Unique Anesthesia Record No e.g. ANES-20261021-0001',
    `surgical_case_id` INT UNSIGNED NOT NULL COMMENT 'FK to or_surgical_cases.id',
    `patient_id` INT UNSIGNED NULL COMMENT 'FK to patients.id',

    -- 1. Pre-Anesthesia Physical Status & Airway Assessment
    `asa_status` ENUM('ASA I', 'ASA II', 'ASA III', 'ASA IV', 'ASA V', 'ASA VI') NOT NULL DEFAULT 'ASA II',
    `asa_emergency_modifier` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Emergency procedure (E suffix, e.g. ASA II-E)',
    `mallampati_class` ENUM('Class I', 'Class II', 'Class III', 'Class IV') NOT NULL DEFAULT 'Class I',
    `thyromental_distance` VARCHAR(60) NOT NULL DEFAULT '>= 6.5 cm (Normal)',
    `neck_mobility` VARCHAR(60) NOT NULL DEFAULT 'Full Range of Motion',
    `dentition_status` VARCHAR(100) NOT NULL DEFAULT 'Intact / Normal',
    `npo_status_hours` DECIMAL(4,1) NULL DEFAULT 8.0 COMMENT 'Fasting duration in hours prior to induction',
    `difficult_airway_anticipated` TINYINT(1) NOT NULL DEFAULT 0,
    `preop_airway_notes` TEXT NULL,

    -- 2. Anesthesia Technique & Airway Management
    `anesthesia_type` ENUM('General', 'Spinal', 'Epidural', 'Combined Spinal-Epidural (CSE)', 'MAC', 'Regional Nerve Block', 'Local') NOT NULL DEFAULT 'General',
    `airway_device` VARCHAR(80) NOT NULL DEFAULT 'ETT Cuffed' COMMENT 'ETT Cuffed, LMA, Nasal Cannula, Face Mask, Double-Lumen ETT',
    `ett_size_mm` VARCHAR(20) NULL DEFAULT '7.5',
    `ett_depth_cm` VARCHAR(20) NULL DEFAULT '21',
    `laryngoscopy_type` VARCHAR(60) NULL DEFAULT 'Video Laryngoscope (GlideScope/C-MAC)',
    `cormack_lehane_grade` ENUM('Grade I', 'Grade IIa', 'Grade IIb', 'Grade III', 'Grade IV', 'N/A (Neuraxial/MAC)') NOT NULL DEFAULT 'Grade I',
    `intubation_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `ventilator_mode` VARCHAR(60) NULL DEFAULT 'VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)',

    -- 3. Pharmacology: Induction, Maintenance, Regional & Reversal Agents
    `induction_drugs` TEXT NULL COMMENT 'Propofol, Etomidate, Ketamine, Fentanyl, Remifentanil, Rocuronium, Succinylcholine',
    `maintenance_agents` TEXT NULL COMMENT 'Sevoflurane, Desflurane, Isoflurane, Propofol TIVA, Dexmedetomidine',
    `regional_neuraxial_details` TEXT NULL COMMENT 'Spinal/Epidural level (e.g. L3-L4), Bupivacaine 0.5% Heavy dose, sensory block level (T4)',
    `reversal_emergence_drugs` TEXT NULL COMMENT 'Sugammadex, Neostigmine + Glycopyrrolate, Ondansetron, Dexamethasone',
    `intraop_medications_json` LONGTEXT NULL COMMENT 'Structured timestamped log of IV boluses, vasopressors, antibiotics',

    -- 4. Intraoperative Fluid Balance & Hemodynamics / Blood Loss
    `estimated_blood_loss_ml` INT NOT NULL DEFAULT 0 COMMENT 'Total Estimated Blood Loss (EBL) in mL',
    `urine_output_ml` INT NOT NULL DEFAULT 0 COMMENT 'Intra-op Foley urine output in mL',
    `crystalloids_ml` INT NOT NULL DEFAULT 0 COMMENT 'Lactated Ringers / Plasmalyte / 0.9% NaCl in mL',
    `colloids_ml` INT NOT NULL DEFAULT 0 COMMENT 'Albumin / Gelofusine in mL',
    `blood_products_ml` INT NOT NULL DEFAULT 0 COMMENT 'pRBC / FFP / Platelets transfused in mL',
    `intraop_vitals_json` LONGTEXT NULL COMMENT 'Serial intra-op vitals grid (BP, HR, SpO2, EtCO2, Temp, MAC)',

    -- 5. PACU Aldrete Recovery Score (0–10)
    -- Each component is scored 0, 1, or 2; Total >= 9 indicates readiness for PACU discharge
    `aldrete_activity` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '0=0 extremities, 1=2 extremities, 2=4 extremities voluntarily/on command',
    `aldrete_respiration` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '0=Apneic, 1=Dyspnea/limited breathing, 2=Breathes deeply & coughs freely',
    `aldrete_circulation` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '0=BP +/-50% pre-anesthetic, 1=BP +/-20-49%, 2=BP +/-20% pre-anesthetic',
    `aldrete_consciousness` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '0=Not responding, 1=Arousable on calling, 2=Fully awake',
    `aldrete_oxygenation` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '0=SpO2 <90% even w/ O2, 1=Needs O2 to maintain >90%, 2=SpO2 >92% on room air',
    `aldrete_total_score` TINYINT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Sum of 5 Aldrete domains (0 to 10)',
    `pacu_discharge_ready` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 if Aldrete >= 9 and hemodynamically stable',
    `pacu_handoff_notes` TEXT NULL,

    -- 6. Timestamps, Complications & Anesthesiologist Sign-Off
    `anesthesia_start_time` DATETIME NULL,
    `induction_time` DATETIME NULL,
    `emergence_time` DATETIME NULL,
    `anesthesia_end_time` DATETIME NULL,
    `intraop_complications` TEXT NULL COMMENT 'Hypotension, bronchospasm, difficult airway, PONV, arrhythmia, or None',
    `anesthesiologist_id` INT UNSIGNED NULL,
    `anesthesiologist_name` VARCHAR(150) NOT NULL DEFAULT 'Dr. Elena Rostova (Anesthesiology)',
    `anesthesiologist_signature` VARCHAR(180) NULL,
    `signed_at` DATETIME NULL,
    `record_status` ENUM('Draft / Intra-Op', 'Signed & Finalized') NOT NULL DEFAULT 'Draft / Intra-Op',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_or_anesthesia_record_number` (`record_number`),
    KEY `idx_or_anesthesia_surgical_case` (`surgical_case_id`),
    KEY `idx_or_anesthesia_patient` (`patient_id`),
    KEY `idx_or_anesthesia_asa` (`asa_status`, `asa_emergency_modifier`),
    KEY `idx_or_anesthesia_status` (`record_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
