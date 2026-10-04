-- ========================================================
-- Migration: 239_prescription_refills.sql
-- Module: Pharmacy > Dispensing, Patient Portal
-- Purpose: Refills -- giving a medicine again, up to the number of
--          refills the doctor allowed on that line.
--            * prescription_dispense_items.fill_number: 1 = the original
--              fill, 2 = the first refill, ... Each fill gives up to the
--              prescribed quantity. Everything dispensed so far was the
--              original fill.
--            * prescriptions.fillable_until: the date the dispensing queue
--              uses -- valid_until during the original fill, refill_until
--              once a refill has started.
--            * prescriptions.refill_until: refills can be dispensed until
--              this date (the first fill still has to be within
--              valid_until). Set when the prescription is written, from
--              General Settings > refill validity days (default 180);
--              existing prescriptions with refills get date + 180 days.
--            * prescription_refill_requests: a patient (portal) or staff
--              asking for a refill of one medicine. The pharmacy dispenses
--              it (dispensed) or declines it with a reason; the patient
--              can cancel their own pending request.
--          Safe to run again.
-- ========================================================

ALTER TABLE prescription_dispense_items
    ADD COLUMN IF NOT EXISTS fill_number INT NOT NULL DEFAULT 1 AFTER prescription_item_id;

ALTER TABLE prescriptions
    ADD COLUMN IF NOT EXISTS refill_until DATE NULL AFTER valid_until,
    ADD COLUMN IF NOT EXISTS fillable_until DATE NULL AFTER refill_until;

-- What the dispensing queue goes by: valid_until while the original fill is
-- under way, refill_until once a refill has started (kept by the code).
UPDATE prescriptions SET fillable_until = valid_until WHERE fillable_until IS NULL;

ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS refill_validity_days INT NOT NULL DEFAULT 180 AFTER prescription_validity_days;

UPDATE prescriptions p
SET p.refill_until = DATE_ADD(p.prescribed_date, INTERVAL 180 DAY)
WHERE p.refill_until IS NULL
  AND EXISTS (SELECT 1 FROM patient_prescriptions pp
              WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL AND COALESCE(pp.refills, 0) > 0);

CREATE TABLE IF NOT EXISTS prescription_refill_requests (

    id INT NOT NULL AUTO_INCREMENT,

    prescription_id INT NOT NULL,

    prescription_item_id INT NOT NULL,

    patient_id INT NOT NULL,

    source VARCHAR(20) NOT NULL DEFAULT 'portal',

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    notes VARCHAR(500) NULL,

    dispense_id INT NULL,

    decided_at DATETIME NULL,
    decided_by INT NULL,
    decline_reason VARCHAR(500) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_prr_status (status, created_at),

    INDEX idx_prr_prescription (prescription_id),

    INDEX idx_prr_item (prescription_item_id),

    INDEX idx_prr_patient (patient_id),

    CONSTRAINT fk_prr_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_prr_item
        FOREIGN KEY (prescription_item_id) REFERENCES patient_prescriptions(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_prr_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_prr_dispense
        FOREIGN KEY (dispense_id) REFERENCES prescription_dispenses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
