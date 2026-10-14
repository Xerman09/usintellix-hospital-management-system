-- Radiology (module 15, Phase 3: charges and reports -- the charges half).
--   * procedure_order_configs gets rad_price: what the hospital charges for each imaging study (set by an admin on
--     the Radiology Worklist, "Study prices"). A study with no price is never charged silently -- it waits on the
--     Charges view so billing can price it and post it.
--   * rad_charges: one charge per imaging study, posted to the patient ledger when its report is signed (an
--     addendum or a correction is signed again but is not charged twice -- one live charge per study). A charge can
--     be voided with a reason, and a Senior Citizen / PWD / other discount can be applied to it. The patient ledger
--     reads this table (PatientLedgerService::getLedger, type "Imaging").
-- The turnaround and volume report needs no new columns: it uses rad_requests.ordered_at, rad_bookings.start_at /
-- performed_at and rad_reports.signed_at.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS rad_charges (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,                              -- patient_procedure_orders.id (the study)
    request_id INT DEFAULT NULL,                        -- rad_requests.id
    booking_id INT DEFAULT NULL,
    report_id INT DEFAULT NULL,                         -- the signed rad_reports row that triggered it
    room_id INT DEFAULT NULL,                           -- the machine it was done on
    patient_id INT NOT NULL,
    study_name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,                  -- what the ledger shows
    quantity DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(10) DEFAULT NULL,             -- senior | pwd | other
    discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    discount_id_no VARCHAR(50) DEFAULT NULL,
    discount_reason VARCHAR(255) DEFAULT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    charge_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'charged',      -- charged | voided
    voided_at DATETIME DEFAULT NULL, voided_by INT DEFAULT NULL, void_reason VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    created_by INT DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_rad_charges_order (order_id, status),
    KEY idx_rad_charges_patient (patient_id, status, charge_date),
    KEY idx_rad_charges_request (request_id),
    KEY idx_rad_charges_room (room_id, charge_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The catalog: the price of each imaging study.
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'procedure_order_configs' AND column_name = 'rad_price');
SET @s := IF(@c = 0,
    'ALTER TABLE procedure_order_configs ADD COLUMN rad_price DECIMAL(12,2) DEFAULT NULL AFTER rad_prep',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
