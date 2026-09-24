-- ==============================================================================
-- Migration 204: HITECH Mandatory Out-of-Pocket Insurance Restriction
-- Statutory Citation: 45 CFR § 164.522(a)(1)(vi) (HITECH Act § 13405(a))
-- Description: Adds mandatory out-of-pocket health plan disclosure restriction
--              flags, payment verification, and automated claim suppression to
--              encounters, plus a dedicated statutory restriction registry.
-- ==============================================================================

-- 1. Alter encounters table to add HITECH out-of-pocket restriction & claim suppression columns
ALTER TABLE encounters
    ADD COLUMN hitech_restriction_requested TINYINT(1) NOT NULL DEFAULT 0 AFTER in_collection,
    ADD COLUMN hitech_restriction_date DATETIME NULL AFTER hitech_restriction_requested,
    ADD COLUMN hitech_restriction_operator_id INT UNSIGNED NULL AFTER hitech_restriction_date,
    ADD COLUMN hitech_paid_in_full TINYINT(1) NOT NULL DEFAULT 0 AFTER hitech_restriction_operator_id,
    ADD COLUMN hitech_payment_reference VARCHAR(100) NULL AFTER hitech_paid_in_full,
    ADD COLUMN hitech_restriction_notes TEXT NULL AFTER hitech_payment_reference,
    ADD COLUMN claim_suppressed TINYINT(1) NOT NULL DEFAULT 0 AFTER hitech_restriction_notes,
    ADD INDEX idx_encounters_hitech (hitech_restriction_requested),
    ADD INDEX idx_encounters_claim_suppressed (claim_suppressed);

-- 2. Create hipaa_hitech_restrictions registry table for statutory tracking and OCR audit review
CREATE TABLE IF NOT EXISTS hipaa_hitech_restrictions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    encounter_id INT NOT NULL,
    patient_id INT NOT NULL,
    restriction_requested TINYINT(1) NOT NULL DEFAULT 1,
    paid_in_full TINYINT(1) NOT NULL DEFAULT 1,
    payment_reference VARCHAR(100) NULL,
    restricted_health_plan VARCHAR(255) NULL COMMENT 'Target health plan/insurer or All Plans',
    restriction_notes TEXT NULL,
    claim_suppressed TINYINT(1) NOT NULL DEFAULT 1,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hitech_encounter (encounter_id),
    INDEX idx_hitech_patient (patient_id),
    INDEX idx_hitech_suppressed (claim_suppressed),
    INDEX idx_hitech_requested_at (requested_at),
    CONSTRAINT fk_hitech_encounter FOREIGN KEY (encounter_id) REFERENCES encounters (id) ON DELETE CASCADE,
    CONSTRAINT fk_hitech_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
