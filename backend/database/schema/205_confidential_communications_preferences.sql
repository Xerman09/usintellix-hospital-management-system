-- ==============================================================================
-- Migration: 205_confidential_communications_preferences.sql
-- HIPAA Confidential Communications Preference Enforcement (45 CFR § 164.522(b))
-- ==============================================================================

-- 1. Extend patients table with explicit binding communication preference fields
ALTER TABLE patients
    ADD COLUMN allow_voicemail ENUM('yes', 'no') NULL DEFAULT NULL AFTER allow_voice_calls,
    ADD COLUMN preferred_contact_method ENUM('mobile_phone', 'home_phone', 'work_phone', 'email', 'postal_mail', 'confidential_address') NULL DEFAULT NULL AFTER allow_postcard,
    ADD COLUMN confidential_address_line VARCHAR(255) NULL DEFAULT NULL AFTER preferred_contact_method,
    ADD COLUMN confidential_city VARCHAR(100) NULL DEFAULT NULL AFTER confidential_address_line,
    ADD COLUMN confidential_state VARCHAR(100) NULL DEFAULT NULL AFTER confidential_city,
    ADD COLUMN confidential_postal_code VARCHAR(20) NULL DEFAULT NULL AFTER confidential_state,
    ADD COLUMN confidential_phone VARCHAR(50) NULL DEFAULT NULL AFTER confidential_postal_code,
    ADD COLUMN confidential_email VARCHAR(255) NULL DEFAULT NULL AFTER confidential_phone,
    ADD COLUMN communication_restrictions_notes TEXT NULL DEFAULT NULL AFTER confidential_email,
    ADD COLUMN has_confidential_restrictions TINYINT(1) NOT NULL DEFAULT 0 AFTER communication_restrictions_notes,
    ADD INDEX idx_patients_confidential_restrictions (has_confidential_restrictions);

-- 2. Create historical audit log table for confidential communication preference changes
CREATE TABLE IF NOT EXISTS hipaa_confidential_communications_log (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    operator_id INT NULL,
    allow_voicemail ENUM('yes', 'no') NULL DEFAULT NULL,
    allow_sms ENUM('yes', 'no') NULL DEFAULT NULL,
    allow_voice_calls ENUM('yes', 'no') NULL DEFAULT NULL,
    allow_email ENUM('yes', 'no') NULL DEFAULT NULL,
    allow_postcard ENUM('yes', 'no') NULL DEFAULT NULL,
    preferred_contact_method VARCHAR(50) NULL DEFAULT NULL,
    confidential_address VARCHAR(255) NULL DEFAULT NULL,
    confidential_phone VARCHAR(50) NULL DEFAULT NULL,
    confidential_email VARCHAR(255) NULL DEFAULT NULL,
    restriction_notes TEXT NULL DEFAULT NULL,
    has_restrictions TINYINT(1) NOT NULL DEFAULT 0,
    action VARCHAR(50) NOT NULL DEFAULT 'PREFERENCES_UPDATED',
    created_at DATETIME NOT NULL,
    INDEX idx_hipaa_cc_patient (patient_id),
    INDEX idx_hipaa_cc_created_at (created_at),
    CONSTRAINT fk_hipaa_cc_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
