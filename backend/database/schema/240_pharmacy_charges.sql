-- ========================================================
-- Migration: 240_pharmacy_charges.sql
-- Module: Pharmacy > Dispensing, Patient Ledger
-- Purpose: Charging the patient for medicine dispensed to them.
--            * pharmacy_charges -- one row per medicine per dispensing:
--              quantity x the Drug Catalog selling price at that moment,
--              less any discount. Kept apart from visit billing codes
--              (encounter_billing_codes) so medicine never ends up on an
--              insurance claim file, and so a prescription without a visit
--              can still be charged. The patient ledger lists these with
--              the visit charges, so they count toward the balance.
--              Undoing the dispensing voids its charges.
--            * prescription_dispenses: the discount given (Senior Citizen
--              RA 9994 / PWD RA 10754 20%, or other with a reason, plus
--              the ID number) and the totals.
--            * patient_ledger_payments.dispense_id: a payment taken at the
--              pharmacy for a dispensing.
--          Dispensings made before this have no charges (no backfill:
--          what was or wasn't collected for them isn't known).
--          Safe to run again.
-- ========================================================

CREATE TABLE IF NOT EXISTS pharmacy_charges (

    id INT NOT NULL AUTO_INCREMENT,

    dispense_id INT NOT NULL,

    patient_id INT NOT NULL,

    prescription_id INT NOT NULL,

    prescription_item_id INT NOT NULL,

    encounter_id INT NULL,

    drug_id INT NOT NULL,

    description VARCHAR(255) NOT NULL,

    quantity DECIMAL(12,3) NOT NULL,

    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,

    gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    charge_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'charged',

    voided_at DATETIME NULL,
    voided_by INT NULL,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_phc_patient (patient_id, charge_date),

    INDEX idx_phc_dispense (dispense_id),

    INDEX idx_phc_status (status),

    CONSTRAINT fk_phc_dispense
        FOREIGN KEY (dispense_id) REFERENCES prescription_dispenses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_phc_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_phc_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_phc_item
        FOREIGN KEY (prescription_item_id) REFERENCES patient_prescriptions(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_phc_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE prescription_dispenses
    ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NULL AFTER notes,
    ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER discount_type,
    ADD COLUMN IF NOT EXISTS discount_id_no VARCHAR(50) NULL AFTER discount_rate,
    ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) NULL AFTER discount_id_no,
    ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_reason,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER gross_amount,
    ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_amount;

ALTER TABLE patient_ledger_payments
    ADD COLUMN IF NOT EXISTS dispense_id INT NULL AFTER encounter_id;

CREATE INDEX IF NOT EXISTS idx_plp_dispense ON patient_ledger_payments (dispense_id);
