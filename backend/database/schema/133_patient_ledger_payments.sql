-- =============================================
-- Table: patient_ledger_payments
-- Payments and adjustments recorded against a patient (copay, insurance
-- payment, contractual write-off, etc.), independent of the per-encounter
-- charge snapshot in encounter_billing_codes. The Patient Ledger merges
-- rows from both tables: encounter_billing_codes supplies the "charge"
-- side, this table supplies the "payment"/"adjustment" side. A row may
-- carry a payment amount, an adjustment amount, or both (e.g. an
-- insurance payment posted alongside its contractual write-off).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_ledger_payments (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    encounter_id INT NULL,

    payer_type ENUM('patient', 'insurance') NOT NULL DEFAULT 'patient',

    payment_type VARCHAR(50) NOT NULL DEFAULT 'COPAY',

    payment_date DATE NOT NULL,

    payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

    adjustment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

    notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_ledger_payments_patient (patient_id),

    INDEX idx_patient_ledger_payments_encounter (encounter_id),

    INDEX idx_patient_ledger_payments_created_by (created_by),

    INDEX idx_patient_ledger_payments_updated_by (updated_by),

    INDEX idx_patient_ledger_payments_deleted_by (deleted_by),

    CONSTRAINT fk_patient_ledger_payments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_ledger_payments_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
