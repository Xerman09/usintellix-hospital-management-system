-- ============================================================================
-- Migration 295: Pharmacist Clinical Verification Queue for e-Prescriptions
-- Table: prescription_verifications
-- ============================================================================
-- Enables clinical pharmacists to review outpatient e-prescriptions prior to
-- physical product picking & dispensing, evaluating:
--   1. Verification Decision (Approved, Intervention Needed, Clarification Requested, Rejected)
--   2. Renal Function & Dose Adjustment (eGFR / CrCl mL/min)
--   3. Patient Weight & Age Dosing Considerations (Weight in kg, mg/kg check)
--   4. Clinical Indication, Drug-Allergy, Drug-Drug Interaction & Duplicate Therapy
--   5. Prescriber Intervention / Clarification Log & Clinical Pharmacist Sign-Off
-- ============================================================================

CREATE TABLE IF NOT EXISTS `prescription_verifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `verification_number` VARCHAR(40) NOT NULL COMMENT 'Unique Clinical Verification No e.g. RXV-20261021-0001',
    `prescription_id` INT UNSIGNED NOT NULL COMMENT 'FK to prescriptions.id',
    `patient_id` INT UNSIGNED NULL COMMENT 'FK to patients.id',

    -- 1. Clinical Verification Decision
    `verification_status` ENUM(
        'Pending Review',
        'Approved',
        'Intervention Needed',
        'Clarification Requested',
        'Rejected'
    ) NOT NULL DEFAULT 'Pending Review',

    -- 2. Renal Function & Dose Adjustment Review
    `egfr_crcl_ml_min` DECIMAL(6,2) NULL DEFAULT 90.00 COMMENT 'Estimated GFR or CrCl (Cockcroft-Gault) in mL/min',
    `renal_adjustment_status` ENUM(
        'Normal Renal Function — No Adjustment Needed',
        'Renal Dose Adjustment Verified',
        'Renal Dose Reduction Required',
        'Contraindicated in Renal Impairment'
    ) NOT NULL DEFAULT 'Normal Renal Function — No Adjustment Needed',
    `renal_adjustment_notes` VARCHAR(255) NULL,

    -- 3. Patient Weight & Age Dosing Considerations
    `patient_weight_kg` DECIMAL(5,2) NULL DEFAULT 68.00 COMMENT 'Recorded patient weight in kg for mg/kg verification',
    `weight_dosing_status` ENUM(
        'Appropriate for Weight / Age',
        'Weight-Based Dose Verified (mg/kg)',
        'Dose Too High for Weight (Overdose Risk)',
        'Subtherapeutic Dose for Weight'
    ) NOT NULL DEFAULT 'Appropriate for Weight / Age',
    `weight_dosing_notes` VARCHAR(255) NULL,

    -- 4. Clinical Indication & Safety Cross-Checks
    `indication_verified` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Regimen matches documented diagnosis/indication',
    `documented_indication` VARCHAR(255) NULL COMMENT 'Diagnosis or clinical indication verified by pharmacist',
    `allergy_cross_check_passed` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = No drug-allergy cross-reactivity identified',
    `drug_interaction_check_passed` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = No major drug-drug interactions',
    `duplicate_therapy_check_passed` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = No therapeutic duplication',

    -- 5. Pharmacist Intervention & Prescriber Clarification
    `intervention_category` VARCHAR(100) NULL DEFAULT 'None — Regimen Clinically Appropriate',
    `clinical_review_notes` TEXT NULL,
    `prescriber_contacted` TINYINT(1) NOT NULL DEFAULT 0,
    `prescriber_response_notes` TEXT NULL,

    -- 6. Verifying Clinical Pharmacist Sign-Off
    `verified_by_user_id` INT UNSIGNED NULL,
    `pharmacist_name` VARCHAR(150) NOT NULL DEFAULT 'RPh. Clarissa Mendoza, PharmD (Clinical Pharmacist)',
    `pharmacist_license_no` VARCHAR(60) NULL DEFAULT 'PRC-RPH-0094821',
    `pharmacist_signature` VARCHAR(180) NULL,
    `verified_at` DATETIME NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_prescription_verification_number` (`verification_number`),
    KEY `idx_rx_verification_prescription` (`prescription_id`),
    KEY `idx_rx_verification_patient` (`patient_id`),
    KEY `idx_rx_verification_status` (`verification_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
