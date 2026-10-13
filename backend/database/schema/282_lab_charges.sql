-- Lab department (module 14, Phase 3: turnaround & reports -- the charges half).
--   * procedure_order_configs gets lab_price: what the hospital charges for each lab test (set by an admin on the
--     Lab Worklist, "Test prices"). A test with no price is never charged silently -- it shows on the Charges view
--     so billing can price it and post it.
--   * lab_charges: one charge per lab test, posted to the patient ledger when its result is released (a correction
--     releases again but is not charged twice -- one live charge per test). A charge can be voided with a reason, and
--     a Senior Citizen / PWD / other discount can be applied to it. The patient ledger reads this table
--     (PatientLedgerService::getLedger, type "Laboratory").
-- The turnaround report needs no new columns: it uses lab_requests.ordered_at, patient_procedure_orders.collected_at
-- and lab_result_sets.entered_at / verified_at.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS lab_charges (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,                              -- patient_procedure_orders.id (the test)
    request_id INT DEFAULT NULL,                        -- lab_requests.id
    specimen_id INT DEFAULT NULL,
    set_id INT DEFAULT NULL,                            -- the released lab_result_sets row that triggered it
    patient_id INT NOT NULL,
    test_name VARCHAR(255) NOT NULL,
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
    KEY idx_lab_charges_order (order_id, status),
    KEY idx_lab_charges_patient (patient_id, status, charge_date),
    KEY idx_lab_charges_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The catalog: the price of each lab test.
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'procedure_order_configs' AND column_name = 'lab_price');
SET @s := IF(@c = 0,
    'ALTER TABLE procedure_order_configs ADD COLUMN lab_price DECIMAL(12,2) DEFAULT NULL AFTER lab_section',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
