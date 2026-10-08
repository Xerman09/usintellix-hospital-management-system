-- Code Blue (module 10, Phase 3: review & reports).
--   * code_blue_carts: the crash carts -- each is a storage location (warehouses), for a ward
--     (ward_id NULL = a general cart, e.g. the emergency room's or the one for public areas).
--   * code_blue_cart_drugs: which catalog drug each one-tap drug button takes from the cart, and
--     how much of the dose one stock unit holds (e.g. amiodarone 150 mg per ampoule: 300 mg = 2).
--   * code_blue_events.cart_warehouse_id: the cart used at this code (the ward's cart by default).
--   * code_blue_record gets the stock taken for a drug entry; code_blue_record_lots the lots
--     (earliest expiry first), deducted through the medicine ledger ('dispensed', source
--     code_blue_record_lots); a struck-out entry puts it back ('dispense_voided', same source).
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS code_blue_carts (
    id INT NOT NULL AUTO_INCREMENT,
    warehouse_id INT NOT NULL,
    ward_id INT DEFAULT NULL,
    label VARCHAR(80) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_code_blue_cart_wh (warehouse_id),
    KEY idx_code_blue_cart_ward (ward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS code_blue_cart_drugs (
    id INT NOT NULL AUTO_INCREMENT,
    drug_key VARCHAR(120) NOT NULL,                  -- the button's drug name + unit, e.g. "Amiodarone|mg"
    drug_id INT NOT NULL,
    amount_per_unit DECIMAL(12,3) NOT NULL,          -- dose amount in one stock unit (same unit as the button)
    updated_by INT DEFAULT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_code_blue_cart_drug_key (drug_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'code_blue_events' AND column_name = 'cart_warehouse_id');
SET @s := IF(@c = 0, 'ALTER TABLE code_blue_events ADD COLUMN cart_warehouse_id INT DEFAULT NULL AFTER bed_id, ADD COLUMN restock_alert_id INT DEFAULT NULL AFTER alert_id', 'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'code_blue_record' AND column_name = 'stock_drug_id');
SET @s := IF(@c = 0,
    'ALTER TABLE code_blue_record
        ADD COLUMN stock_warehouse_id INT DEFAULT NULL AFTER note,
        ADD COLUMN stock_drug_id INT DEFAULT NULL AFTER stock_warehouse_id,
        ADD COLUMN stock_qty DECIMAL(12,3) DEFAULT NULL AFTER stock_drug_id,
        ADD COLUMN stock_short DECIMAL(12,3) DEFAULT NULL AFTER stock_qty',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS code_blue_record_lots (
    id INT NOT NULL AUTO_INCREMENT,
    record_id INT NOT NULL,
    lot_id INT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,4) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    returned_at DATETIME DEFAULT NULL,
    returned_by INT DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cbrl_record (record_id),
    KEY idx_cbrl_lot (lot_id),
    CONSTRAINT fk_cbrl_record FOREIGN KEY (record_id) REFERENCES code_blue_record (id),
    CONSTRAINT fk_cbrl_lot FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medicine ledger backfill (the same keys the app writes; nothing to add on a fresh table).
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT DATE(cl.created_at), l.drug_id, cl.lot_id, l.warehouse_id, 'dispensed', -cl.quantity, COALESCE(cl.unit_cost, 0), CONCAT('CODE-', r.event_id), e.location,
       CONCAT('Crash cart, Code Blue: ', r.value), 'code_blue_record_lots', cl.id, cl.created_at, cl.created_by
FROM code_blue_record_lots cl
JOIN code_blue_record r ON r.id = cl.record_id
JOIN code_blue_events e ON e.id = r.event_id
JOIN drug_inventory_lots l ON l.id = cl.lot_id;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT DATE(cl.returned_at), l.drug_id, cl.lot_id, l.warehouse_id, 'dispense_voided', cl.quantity, COALESCE(cl.unit_cost, 0), CONCAT('CODE-', r.event_id), e.location,
       'Struck out of the code record: back in the crash cart', 'code_blue_record_lots', cl.id, cl.returned_at, cl.returned_by
FROM code_blue_record_lots cl
JOIN code_blue_record r ON r.id = cl.record_id
JOIN code_blue_events e ON e.id = r.event_id
JOIN drug_inventory_lots l ON l.id = cl.lot_id
WHERE cl.returned_at IS NOT NULL;
