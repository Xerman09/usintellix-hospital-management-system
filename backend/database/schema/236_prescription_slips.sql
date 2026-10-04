-- ========================================================
-- Migration: 236_prescription_slips.sql
-- Module: Patient Dashboard > Prescriptions
-- Purpose: One prescription (the slip a doctor writes) holds many
--          medicines, as on paper.
--            * prescriptions        -- the slip: RX-YYYY-NNNNN, patient,
--                                      prescriber, date, optional visit,
--                                      diagnosis, notes, status
--                                      (active / cancelled), revision.
--            * patient_prescriptions -- now the slip's medicine lines:
--                                      prescription_id + line_no added.
--                                      Every other column is unchanged.
--
--          Backfill: each existing prescription row becomes its own
--          one-medicine slip, dated from its begin date (else when it
--          was recorded), prescribed by whoever recorded it. Soft-deleted
--          rows get a soft-deleted slip. Safe to run again: only rows
--          without a slip are touched.
-- ========================================================

CREATE TABLE IF NOT EXISTS prescriptions (

    id INT NOT NULL AUTO_INCREMENT,

    rx_number VARCHAR(30) NOT NULL,

    patient_id INT NOT NULL,

    prescriber_user_id INT NULL,

    encounter_id INT NULL,

    prescribed_date DATE NOT NULL,

    diagnosis VARCHAR(500) NULL,

    notes TEXT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    revision INT NOT NULL DEFAULT 0,

    cancelled_at DATETIME NULL,
    cancelled_by INT NULL,
    cancel_reason VARCHAR(500) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_rx_number UNIQUE (rx_number),

    INDEX idx_rx_patient (patient_id, prescribed_date),

    INDEX idx_rx_status (status),

    INDEX idx_rx_encounter (encounter_id),

    INDEX idx_rx_prescriber (prescriber_user_id),

    CONSTRAINT fk_rx_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_rx_prescriber
        FOREIGN KEY (prescriber_user_id) REFERENCES users(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_rx_encounter
        FOREIGN KEY (encounter_id) REFERENCES encounters(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Goes up by one on every change, so an edit made from an outdated copy is caught.
ALTER TABLE prescriptions
    ADD COLUMN IF NOT EXISTS revision INT NOT NULL DEFAULT 0 AFTER status;

ALTER TABLE patient_prescriptions
    ADD COLUMN IF NOT EXISTS prescription_id INT NULL AFTER patient_id,
    ADD COLUMN IF NOT EXISTS line_no INT NULL AFTER prescription_id;

CREATE INDEX IF NOT EXISTS idx_pp_prescription ON patient_prescriptions (prescription_id, line_no);

ALTER TABLE patient_prescriptions
    ADD CONSTRAINT fk_pp_prescription
        FOREIGN KEY IF NOT EXISTS (prescription_id) REFERENCES prescriptions(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;

-- ---------- Backfill: one slip per existing prescription row ----------
-- A temporary number ties each new slip to its row, then becomes RX-YYYY-NNNNN.
INSERT INTO prescriptions
    (rx_number, patient_id, prescriber_user_id, prescribed_date, status, created_at, created_by, deleted_at, deleted_by)
SELECT CONCAT('MIGRATE-', pp.id), pp.patient_id, u.id,
       COALESCE(pp.begin_date, DATE(pp.created_at), CURDATE()), 'active',
       pp.created_at, pp.created_by, pp.deleted_at, pp.deleted_by
FROM patient_prescriptions pp
LEFT JOIN users u ON u.id = pp.created_by
WHERE pp.prescription_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM prescriptions x WHERE x.rx_number = CONCAT('MIGRATE-', pp.id));

UPDATE patient_prescriptions pp
JOIN prescriptions p ON p.rx_number = CONCAT('MIGRATE-', pp.id)
SET pp.prescription_id = p.id, pp.line_no = 1
WHERE pp.prescription_id IS NULL;

UPDATE prescriptions
SET rx_number = CONCAT('RX-', YEAR(prescribed_date), '-', LPAD(id, 5, '0'))
WHERE rx_number LIKE 'MIGRATE-%';
