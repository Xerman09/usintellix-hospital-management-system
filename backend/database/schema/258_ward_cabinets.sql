-- Ward medicine cabinets (Department medicine stock, Phase 1).
--
--  - A ward's cabinet is a storage location (warehouses, type "Ward / Nurse Station Stock"),
--    linked by hospital_wards.stock_warehouse_id, with min / max per medicine in
--    warehouse_stock_levels (the same rows Pharmacy > Stock Levels edits).
--  - cabinet_withdrawals: a nurse takes medicine out of the cabinet for one patient's order
--    (and dose time). It is deducted at once, earliest expiry first, through the medicine
--    ledger ('dispensed', source cabinet_withdrawal_lots). Then it is either
--      given    -- recorded on the MAR, linked to that dose, and charged to the patient;
--      returned -- put back in the cabinet ('dispense_voided', same source);
--      wasted   -- dropped / contaminated / not used, with a reason (and a witness for
--                  high-alert and controlled medicines); not charged.
--  - inpatient_med_administrations.withdrawal_id links the dose to what was taken.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS cabinet_withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NULL,
    order_id INT NOT NULL,
    drug_id INT NOT NULL,
    slot_at DATETIME NULL,                        -- the dose time it is for (NULL: as-needed)
    quantity DECIMAL(12,3) NOT NULL,              -- in the medicine's dispensing unit
    status ENUM('open', 'given', 'returned', 'wasted') NOT NULL DEFAULT 'open',
    administration_id INT NULL,                   -- the MAR dose it was given as
    note VARCHAR(255) NULL,
    withdrawn_by INT NULL,
    withdrawn_at DATETIME NOT NULL,
    closed_by INT NULL,
    closed_at DATETIME NULL,
    close_reason VARCHAR(255) NULL,               -- why returned / wasted
    witness_by INT NULL,                          -- second nurse for wasting high-alert / controlled
    INDEX idx_cw_cabinet (warehouse_id, status, withdrawn_at),
    INDEX idx_cw_order (order_id, status),
    INDEX idx_cw_admission (admission_id),
    CONSTRAINT fk_cw_wh FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_cw_order FOREIGN KEY (order_id) REFERENCES inpatient_med_orders (id),
    CONSTRAINT fk_cw_drug FOREIGN KEY (drug_id) REFERENCES drugs (id),
    CONSTRAINT fk_cw_by FOREIGN KEY (withdrawn_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_cw_closed FOREIGN KEY (closed_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_cw_witness FOREIGN KEY (witness_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cabinet_withdrawal_lots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    withdrawal_id INT NOT NULL,
    lot_id INT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,4) NULL,
    created_at DATETIME NOT NULL,
    returned_at DATETIME NULL,
    INDEX idx_cwl_w (withdrawal_id),
    INDEX idx_cwl_lot (lot_id),
    CONSTRAINT fk_cwl_w FOREIGN KEY (withdrawal_id) REFERENCES cabinet_withdrawals (id),
    CONSTRAINT fk_cwl_lot FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE inpatient_med_administrations
    ADD COLUMN IF NOT EXISTS withdrawal_id INT NULL AFTER stock_quantity;

-- Medicine ledger backfill (same rows CabinetService writes).
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT DATE(cl.created_at), l.drug_id, cl.lot_id, l.warehouse_id, 'dispensed', -cl.quantity, COALESCE(cl.unit_cost, 0), a.admission_number, a.patient_name,
       CONCAT('Taken from the ward cabinet: ', o.drug_name), 'cabinet_withdrawal_lots', cl.id, cl.created_at, w.withdrawn_by
FROM cabinet_withdrawal_lots cl
JOIN cabinet_withdrawals w ON w.id = cl.withdrawal_id
JOIN inpatient_med_orders o ON o.id = w.order_id
JOIN inpatient_admissions a ON a.id = w.admission_id
JOIN drug_inventory_lots l ON l.id = cl.lot_id;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, reason, source_type, source_id, created_at, created_by)
SELECT DATE(cl.returned_at), l.drug_id, cl.lot_id, l.warehouse_id, 'dispense_voided', cl.quantity, COALESCE(cl.unit_cost, 0), a.admission_number, a.patient_name,
       COALESCE(w.close_reason, 'Returned to the cabinet'), 'cabinet_withdrawal_lots', cl.id, cl.returned_at, w.closed_by
FROM cabinet_withdrawal_lots cl
JOIN cabinet_withdrawals w ON w.id = cl.withdrawal_id
JOIN inpatient_admissions a ON a.id = w.admission_id
JOIN drug_inventory_lots l ON l.id = cl.lot_id
WHERE cl.returned_at IS NOT NULL;
