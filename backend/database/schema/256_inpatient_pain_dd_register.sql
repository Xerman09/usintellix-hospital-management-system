-- Pain medication and the dangerous-drugs register (MAR & pain medication, Phase 3).
--
--  - An as-needed dose for pain records the pain score before it is given (0-10) and is
--    rechecked 30-60 minutes later (pain_after); recheck_due_at drives the reminder alert.
--  - A dangerous drug (drugs.controlled_class 'Dangerous Drug (RA 9165)', e.g. morphine,
--    tramadol) may have part of the ampule / tablet wasted, with the second nurse as witness.
--  - dd_register: one numbered entry per dangerous-drug dose given (numbered per medicine),
--    with names copied as at the time. Never deleted: an entry recorded in error is voided.

ALTER TABLE inpatient_med_administrations
    ADD COLUMN IF NOT EXISTS pain_before TINYINT NULL AFTER note,
    ADD COLUMN IF NOT EXISTS recheck_due_at DATETIME NULL AFTER pain_before,
    ADD COLUMN IF NOT EXISTS pain_after TINYINT NULL AFTER recheck_due_at,
    ADD COLUMN IF NOT EXISTS pain_after_at DATETIME NULL AFTER pain_after,
    ADD COLUMN IF NOT EXISTS pain_after_by INT NULL AFTER pain_after_at,
    ADD COLUMN IF NOT EXISTS pain_after_note VARCHAR(255) NULL AFTER pain_after_by,
    ADD COLUMN IF NOT EXISTS wasted_amount DECIMAL(10,3) NULL AFTER pain_after_note,
    ADD COLUMN IF NOT EXISTS wasted_unit VARCHAR(20) NULL AFTER wasted_amount,
    ADD COLUMN IF NOT EXISTS waste_note VARCHAR(255) NULL AFTER wasted_unit;

CREATE INDEX IF NOT EXISTS idx_ima_recheck ON inpatient_med_administrations (recheck_due_at, pain_after);

CREATE TABLE IF NOT EXISTS dd_register (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drug_id INT NOT NULL,
    entry_no INT NOT NULL,                        -- 1, 2, 3 ... per medicine
    administration_id INT NOT NULL,
    order_id INT NOT NULL,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NULL,
    drug_name VARCHAR(255) NOT NULL,
    patient_name VARCHAR(255) NULL,
    patient_mrn VARCHAR(50) NULL,
    ward_name VARCHAR(150) NULL,
    bed VARCHAR(50) NULL,
    dose DECIMAL(10,3) NOT NULL,
    dose_unit VARCHAR(20) NOT NULL,
    route VARCHAR(10) NOT NULL,
    wasted_amount DECIMAL(10,3) NULL,
    wasted_unit VARCHAR(20) NULL,
    waste_note VARCHAR(255) NULL,
    given_at DATETIME NOT NULL,
    given_by INT NULL,
    given_by_name VARCHAR(150) NULL,
    witness_by INT NULL,
    witness_name VARCHAR(150) NULL,
    prescriber_name VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    voided_at DATETIME NULL,
    voided_by_name VARCHAR(150) NULL,
    void_reason VARCHAR(255) NULL,
    UNIQUE KEY uq_ddr_entry (drug_id, entry_no),
    UNIQUE KEY uq_ddr_admin (administration_id),
    KEY idx_ddr_given (given_at),
    CONSTRAINT fk_ddr_drug FOREIGN KEY (drug_id) REFERENCES drugs(id),
    CONSTRAINT fk_ddr_admin FOREIGN KEY (administration_id) REFERENCES inpatient_med_administrations(id),
    CONSTRAINT fk_ddr_given FOREIGN KEY (given_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_ddr_witness FOREIGN KEY (witness_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
