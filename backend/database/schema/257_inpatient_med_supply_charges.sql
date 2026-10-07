-- Pharmacy supply and charging for ward doses (MAR & pain medication, Phase 4).
--
--  - Each dose recorded as given on the MAR says where it came from:
--      stock  -- taken from a storage location (the ward's stock or the pharmacy), earliest
--                expiry first, never expired; each lot used is a row in inpatient_med_admin_lots
--                and writes the medicine ledger ('dispensed', source inpatient_med_admin_lots).
--                Voiding the dose puts it back ('dispense_voided', same source).
--      opened -- from the patient's container opened at an earlier dose (multi-dose vial,
--                inhaler, syrup...): nothing taken, nothing charged again.
--      own    -- the patient's own supply: nothing taken, nothing charged.
--  - Each dose taken from stock is charged to the patient ledger (inpatient_med_charges,
--    type 'Inpatient medicine'), at the catalog selling price; voiding the dose voids it.
--  - hospital_wards.stock_warehouse_id: the ward's own stock location (ward stock, refilled
--    from the pharmacy with Stock Transfers); general_settings.inpatient_pharmacy_warehouse_id:
--    the pharmacy location doses come from when the ward has none.
-- Safe to re-run.

ALTER TABLE inpatient_med_administrations
    ADD COLUMN IF NOT EXISTS supply_source VARCHAR(10) NULL AFTER waste_note,
    ADD COLUMN IF NOT EXISTS warehouse_id INT NULL AFTER supply_source,
    ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12,3) NULL AFTER warehouse_id;

ALTER TABLE hospital_wards
    ADD COLUMN IF NOT EXISTS stock_warehouse_id INT NULL;

ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS inpatient_pharmacy_warehouse_id INT NULL;

CREATE TABLE IF NOT EXISTS inpatient_med_admin_lots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    administration_id INT NOT NULL,
    lot_id INT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,4) NULL,
    created_at DATETIME NOT NULL,
    returned_at DATETIME NULL,                    -- the dose was voided and the stock put back
    INDEX idx_imal_admin (administration_id),
    INDEX idx_imal_lot (lot_id),
    CONSTRAINT fk_imal_admin FOREIGN KEY (administration_id) REFERENCES inpatient_med_administrations (id),
    CONSTRAINT fk_imal_lot FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inpatient_med_charges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    administration_id INT NOT NULL,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT NOT NULL,
    drug_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    charge_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'charged',  -- charged | voided
    voided_at DATETIME NULL,
    voided_by INT NULL,
    void_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    UNIQUE KEY uq_imc_admin (administration_id),
    INDEX idx_imc_patient (patient_id, status, charge_date),
    INDEX idx_imc_admission (admission_id),
    CONSTRAINT fk_imc_admin FOREIGN KEY (administration_id) REFERENCES inpatient_med_administrations (id),
    CONSTRAINT fk_imc_drug FOREIGN KEY (drug_id) REFERENCES drugs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medicine ledger backfill (same rows MarService writes; nothing is skipped on a re-run).
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT DATE(al.created_at), l.drug_id, al.lot_id, l.warehouse_id, 'dispensed', -al.quantity, COALESCE(al.unit_cost, 0), a.admission_number, a.patient_name,
       CONCAT('Given on the ward: ', o.drug_name), 'inpatient_med_admin_lots', al.id, al.created_at, r.recorded_by
FROM inpatient_med_admin_lots al
JOIN inpatient_med_administrations r ON r.id = al.administration_id
JOIN inpatient_med_orders o ON o.id = r.order_id
JOIN inpatient_admissions a ON a.id = r.admission_id
JOIN drug_inventory_lots l ON l.id = al.lot_id;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, reason, source_type, source_id, created_at, created_by)
SELECT DATE(al.returned_at), l.drug_id, al.lot_id, l.warehouse_id, 'dispense_voided', al.quantity, COALESCE(al.unit_cost, 0), a.admission_number, a.patient_name,
       r.void_reason, 'inpatient_med_admin_lots', al.id, al.returned_at, r.voided_by
FROM inpatient_med_admin_lots al
JOIN inpatient_med_administrations r ON r.id = al.administration_id
JOIN inpatient_admissions a ON a.id = r.admission_id
JOIN drug_inventory_lots l ON l.id = al.lot_id
WHERE al.returned_at IS NOT NULL;
