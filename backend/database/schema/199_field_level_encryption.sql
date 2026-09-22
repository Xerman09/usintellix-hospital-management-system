-- ==========================================================
-- Migration 199: HIPAA § 164.312(a)(2)(iv) Field-Level
-- Database Encryption at Rest (AES-256-GCM)
-- ==========================================================

-- 1. Patients: Add Social Security Number & National ID (Encrypted at Rest)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS ssn TEXT NULL AFTER patient_no,
ADD COLUMN IF NOT EXISTS national_id TEXT NULL AFTER ssn;

-- 2. Facilities: Expand Tax ID / SSN and IBAN banking columns to hold AES-256-GCM ciphertexts
ALTER TABLE facilities
MODIFY COLUMN tax_id VARCHAR(255) NULL,
MODIFY COLUMN iban VARCHAR(255) NULL;

-- 3. Patient Ledger Payments: Add Payment Card / Banking Fields (Encrypted at Rest)
ALTER TABLE patient_ledger_payments
ADD COLUMN IF NOT EXISTS card_number TEXT NULL AFTER payment_type,
ADD COLUMN IF NOT EXISTS card_expiry VARCHAR(255) NULL AFTER card_number,
ADD COLUMN IF NOT EXISTS card_cvv VARCHAR(255) NULL AFTER card_expiry;

-- 4. Psychotherapy / Psychiatric Notes: Segregated ePHI Table (HIPAA § 164.501 & § 164.312(a)(2)(iv))
CREATE TABLE IF NOT EXISTS patient_psychiatric_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    encounter_id INT NULL,
    provider_id INT NOT NULL,
    session_date DATE NOT NULL,
    diagnosis_code VARCHAR(50) NULL,
    symptoms TEXT NULL,
    psychiatric_notes TEXT NOT NULL,
    treatment_plan TEXT NULL,
    confidential_remarks TEXT NULL,
    created_at DATETIME NOT NULL,
    created_by INT NOT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,
    INDEX idx_ppn_patient (patient_id),
    INDEX idx_ppn_provider (provider_id),
    INDEX idx_ppn_session_date (session_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
