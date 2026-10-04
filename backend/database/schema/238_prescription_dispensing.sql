-- ========================================================
-- Migration: 238_prescription_dispensing.sql
-- Module: Pharmacy > Dispensing
-- Purpose: Giving a prescription's medicines to the patient from stock.
--            * prescription_dispenses      -- one dispensing (DSP-YYYY-NNNNN):
--                                            which prescription, from which
--                                            storage location, when, by whom.
--                                            Can be undone (voided) with a
--                                            reason, which puts the stock back.
--            * prescription_dispense_items -- what was given: one row per
--                                            medicine line and lot (a line
--                                            can be filled from several lots).
--            * prescriptions.dispense_status:
--                none      -- nothing on it is from the Drug Catalog
--                pending   -- waiting to be dispensed
--                partial   -- some given, some still to give
--                dispensed -- everything given
--                closed    -- the pharmacy closed it with what was given
--          Every dispensing writes the medicine ledger ('dispensed', and
--          'dispense_voided' when undone); the backfill below rebuilds those
--          rows from these tables and is safe to run again.
-- ========================================================

CREATE TABLE IF NOT EXISTS prescription_dispenses (

    id INT NOT NULL AUTO_INCREMENT,

    dispense_number VARCHAR(30) NOT NULL,

    prescription_id INT NOT NULL,

    patient_id INT NOT NULL,

    warehouse_id INT NOT NULL,

    dispensed_date DATE NOT NULL,

    notes VARCHAR(500) NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'completed',

    voided_at DATETIME NULL,
    voided_by INT NULL,
    void_reason VARCHAR(500) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_dispense_number UNIQUE (dispense_number),

    INDEX idx_pd_prescription (prescription_id),

    INDEX idx_pd_patient (patient_id),

    INDEX idx_pd_date (dispensed_date),

    CONSTRAINT fk_pd_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_pd_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_pd_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prescription_dispense_items (

    id INT NOT NULL AUTO_INCREMENT,

    dispense_id INT NOT NULL,

    prescription_item_id INT NOT NULL,

    drug_id INT NOT NULL,

    lot_id INT NOT NULL,

    quantity DECIMAL(12,3) NOT NULL,

    unit_cost DECIMAL(12,4) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_pdi_dispense (dispense_id),

    INDEX idx_pdi_item (prescription_item_id),

    INDEX idx_pdi_lot (lot_id),

    CONSTRAINT fk_pdi_dispense
        FOREIGN KEY (dispense_id) REFERENCES prescription_dispenses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_pdi_item
        FOREIGN KEY (prescription_item_id) REFERENCES patient_prescriptions(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_pdi_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_pdi_lot
        FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE prescriptions
    ADD COLUMN IF NOT EXISTS dispense_status VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER status,
    ADD COLUMN IF NOT EXISTS last_dispensed_at DATETIME NULL AFTER dispense_status,
    ADD COLUMN IF NOT EXISTS closed_at DATETIME NULL AFTER last_dispensed_at,
    ADD COLUMN IF NOT EXISTS closed_by INT NULL AFTER closed_at,
    ADD COLUMN IF NOT EXISTS close_reason VARCHAR(500) NULL AFTER closed_by;

CREATE INDEX IF NOT EXISTS idx_rx_dispense_status ON prescriptions (dispense_status, prescribed_date);

-- Prescriptions with nothing from the Drug Catalog have nothing to dispense.
UPDATE prescriptions p
SET p.dispense_status = 'none'
WHERE p.dispense_status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM patient_prescriptions pp
                  WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL AND pp.drug_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM prescription_dispenses d WHERE d.prescription_id = p.id);

-- ---------- Medicine ledger backfill ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT d.dispensed_date, i.drug_id, i.lot_id, l.warehouse_id, 'dispensed', -i.quantity, i.unit_cost, d.dispense_number,
       TRIM(CONCAT(COALESCE(pt.first_name, ''), ' ', COALESCE(pt.last_name, ''))), rx.rx_number,
       'prescription_dispense_items', i.id, d.created_at, d.created_by
FROM prescription_dispense_items i
JOIN prescription_dispenses d ON d.id = i.dispense_id
JOIN drug_inventory_lots l ON l.id = i.lot_id
JOIN prescriptions rx ON rx.id = d.prescription_id
JOIN patients pt ON pt.id = d.patient_id;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, reason, notes, source_type, source_id, created_at, created_by)
SELECT DATE(d.voided_at), i.drug_id, i.lot_id, l.warehouse_id, 'dispense_voided', i.quantity, i.unit_cost, d.dispense_number,
       TRIM(CONCAT(COALESCE(pt.first_name, ''), ' ', COALESCE(pt.last_name, ''))), d.void_reason, rx.rx_number,
       'prescription_dispense_items', i.id, d.voided_at, d.voided_by
FROM prescription_dispense_items i
JOIN prescription_dispenses d ON d.id = i.dispense_id
JOIN drug_inventory_lots l ON l.id = i.lot_id
JOIN prescriptions rx ON rx.id = d.prescription_id
JOIN patients pt ON pt.id = d.patient_id
WHERE d.status = 'voided';
