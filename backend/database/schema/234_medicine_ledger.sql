-- ========================================================
-- Migration: 234_medicine_ledger.sql
-- Module: Pharmacy > Medicine Ledger (stock card)
-- Purpose: One permanent row per stock movement of a lot, written by
--          the code at the moment stock changes (StockLedgerService):
--            received / receipt_voided      -- deliveries, Receive Stock
--            transfer_out / transfer_in     -- quick transfers, Stock Transfers
--            transfer_cancelled             -- an in-transit transfer put back
--            returned                       -- sent back to the supplier
--            destroyed                      -- disposed of
--            adjusted                       -- approved stock count corrections
--            opening                        -- balance on file before the ledger
--          quantity is signed (+ in, - out), in dispensing units. The
--          running balance is worked out when the ledger is read.
--          (source_type, source_id, movement_type) is unique, so the
--          backfill below can be run again safely.
--
--          Backfill: every movement already recorded in the history
--          tables, then one "opening" row per lot for whatever the
--          history doesn't explain, so each lot's ledger ends at its
--          quantity on hand.
-- ========================================================

CREATE TABLE IF NOT EXISTS drug_stock_movements (

    id INT NOT NULL AUTO_INCREMENT,

    movement_date DATE NOT NULL,

    drug_id INT NOT NULL,

    lot_id INT NOT NULL,

    warehouse_id INT NOT NULL,

    movement_type VARCHAR(30) NOT NULL,

    quantity DECIMAL(12,3) NOT NULL,

    unit_cost DECIMAL(12,4) NOT NULL DEFAULT 0,

    reference_no VARCHAR(100) NULL,

    counterparty VARCHAR(255) NULL,

    reason VARCHAR(255) NULL,

    notes VARCHAR(500) NULL,

    source_type VARCHAR(40) NOT NULL,

    source_id INT NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_dsm_source UNIQUE (source_type, source_id, movement_type),

    INDEX idx_dsm_drug_date (drug_id, movement_date),

    INDEX idx_dsm_lot (lot_id),

    INDEX idx_dsm_warehouse_date (warehouse_id, movement_date),

    INDEX idx_dsm_type (movement_type),

    CONSTRAINT fk_dsm_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_dsm_lot
        FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_dsm_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------- Backfill: receipts ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT r.received_date, r.drug_id, r.lot_id, l.warehouse_id, 'received', r.quantity,
       COALESCE(r.unit_cost, d.unit_cost, 0), COALESCE(gr.gr_number, r.invoice_number), r.supplier, r.notes,
       'drug_inventory_receipts', r.id, r.created_at, r.created_by
FROM drug_inventory_receipts r
JOIN drug_inventory_lots l ON l.id = r.lot_id
JOIN drugs d ON d.id = r.drug_id
LEFT JOIN goods_receipts gr ON gr.id = r.goods_receipt_id;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, reason, source_type, source_id, created_at, created_by)
SELECT DATE(r.voided_at), r.drug_id, r.lot_id, l.warehouse_id, 'receipt_voided', -r.quantity,
       COALESCE(r.unit_cost, d.unit_cost, 0), gr.gr_number, r.supplier, gr.void_reason,
       'drug_inventory_receipts', r.id, r.voided_at, gr.voided_by
FROM drug_inventory_receipts r
JOIN drug_inventory_lots l ON l.id = r.lot_id
JOIN drugs d ON d.id = r.drug_id
LEFT JOIN goods_receipts gr ON gr.id = r.goods_receipt_id
WHERE r.voided_at IS NOT NULL;

-- ---------- Backfill: quick transfers (Drug Inventory "Transfer") ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT DATE(t.created_at), t.drug_id, t.from_lot_id, fl.warehouse_id, 'transfer_out', -t.quantity, COALESCE((SELECT rc.unit_cost FROM drug_inventory_receipts rc WHERE rc.lot_id = t.from_lot_id AND rc.voided_at IS NULL AND rc.unit_cost IS NOT NULL
                  ORDER BY rc.received_date DESC, rc.id DESC LIMIT 1), d.unit_cost, 0),
       CONCAT('To ', tw.name), t.notes, 'drug_inventory_transfers', t.id, t.created_at, t.created_by
FROM drug_inventory_transfers t
JOIN drug_inventory_lots fl ON fl.id = t.from_lot_id
JOIN drug_inventory_lots tl ON tl.id = t.to_lot_id
JOIN warehouses tw ON tw.id = tl.warehouse_id
JOIN drugs d ON d.id = t.drug_id
WHERE NOT EXISTS (SELECT 1 FROM stock_transfers st WHERE st.st_number = t.notes);

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT DATE(t.created_at), t.drug_id, t.to_lot_id, tl.warehouse_id, 'transfer_in', t.quantity, COALESCE((SELECT rc.unit_cost FROM drug_inventory_receipts rc WHERE rc.lot_id = t.from_lot_id AND rc.voided_at IS NULL AND rc.unit_cost IS NOT NULL
                  ORDER BY rc.received_date DESC, rc.id DESC LIMIT 1), d.unit_cost, 0),
       CONCAT('From ', fw.name), t.notes, 'drug_inventory_transfers', t.id, t.created_at, t.created_by
FROM drug_inventory_transfers t
JOIN drug_inventory_lots fl ON fl.id = t.from_lot_id
JOIN drug_inventory_lots tl ON tl.id = t.to_lot_id
JOIN warehouses fw ON fw.id = fl.warehouse_id
JOIN drugs d ON d.id = t.drug_id
WHERE NOT EXISTS (SELECT 1 FROM stock_transfers st WHERE st.st_number = t.notes);

-- ---------- Backfill: Stock Transfers (ST-...) ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT t.sent_date, x.drug_id, x.from_lot_id, t.from_warehouse_id, 'transfer_out', -x.quantity_sent, x.unit_cost, t.st_number,
       CONCAT('To ', tw.name), t.sent_via, 'stock_transfer_lots', x.id, t.sent_at, t.sent_by
FROM stock_transfer_lots x
JOIN stock_transfers t ON t.id = x.stock_transfer_id
JOIN warehouses tw ON tw.id = t.to_warehouse_id
WHERE t.sent_at IS NOT NULL;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT t.received_date, x.drug_id, x.to_lot_id, t.to_warehouse_id, 'transfer_in', x.quantity_received, x.unit_cost, t.st_number,
       CONCAT('From ', fw.name),
       CASE WHEN x.quantity_sent - x.quantity_received > 0.0005 THEN CONCAT(TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM x.quantity_sent - x.quantity_received)), ' short in transit') END,
       'stock_transfer_lots', x.id, t.received_at, t.received_by
FROM stock_transfer_lots x
JOIN stock_transfers t ON t.id = x.stock_transfer_id
JOIN warehouses fw ON fw.id = t.from_warehouse_id
WHERE t.received_at IS NOT NULL AND x.to_lot_id IS NOT NULL AND x.quantity_received > 0;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, reason, source_type, source_id, created_at, created_by)
SELECT DATE(t.cancelled_at), x.drug_id, x.from_lot_id, t.from_warehouse_id, 'transfer_cancelled', x.quantity_sent, x.unit_cost, t.st_number,
       t.cancel_reason, 'stock_transfer_lots', x.id, t.cancelled_at, t.cancelled_by
FROM stock_transfer_lots x
JOIN stock_transfers t ON t.id = x.stock_transfer_id
WHERE t.status = 'cancelled' AND t.sent_at IS NOT NULL;

-- ---------- Backfill: returns to supplier (stock lines, once sent) ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, reason, notes, source_type, source_id, created_at, created_by)
SELECT r.sent_date, i.drug_id, i.lot_id, l.warehouse_id, 'returned', -i.base_quantity, i.unit_cost, r.rts_number, s.name,
       CASE i.reason WHEN 'damaged' THEN 'Damaged / defective' WHEN 'expired' THEN 'Expired' WHEN 'near_expiry' THEN 'Near expiry'
                     WHEN 'wrong_item' THEN 'Wrong item / not ordered' WHEN 'recalled' THEN 'Recalled'
                     WHEN 'excess' THEN 'Excess / over-delivery' ELSE 'Other' END,
       i.remarks, 'supplier_return_items', i.id, r.sent_at, r.sent_by
FROM supplier_return_items i
JOIN supplier_returns r ON r.id = i.supplier_return_id
JOIN drug_inventory_lots l ON l.id = i.lot_id
JOIN suppliers s ON s.id = r.supplier_id
WHERE i.source = 'stock' AND i.lot_id IS NOT NULL AND r.sent_at IS NOT NULL AND r.deleted_at IS NULL;

-- ---------- Backfill: destructions ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reason, notes, source_type, source_id, created_at, created_by)
SELECT x.destroyed_date, x.drug_id, x.lot_id, l.warehouse_id, 'destroyed', -x.quantity, COALESCE((SELECT rc.unit_cost FROM drug_inventory_receipts rc WHERE rc.lot_id = x.lot_id AND rc.voided_at IS NULL AND rc.unit_cost IS NOT NULL
                  ORDER BY rc.received_date DESC, rc.id DESC LIMIT 1), d.unit_cost, 0), x.method,
       NULLIF(CONCAT_WS(' · ', CASE WHEN x.witness IS NOT NULL THEN CONCAT('Witness: ', x.witness) END, x.notes), ''),
       'drug_inventory_destructions', x.id, x.created_at, x.created_by
FROM drug_inventory_destructions x
JOIN drug_inventory_lots l ON l.id = x.lot_id
JOIN drugs d ON d.id = x.drug_id;

-- ---------- Backfill: stock count corrections ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, reason, notes, source_type, source_id, created_at, created_by)
SELECT a.adjusted_date, a.drug_id, a.lot_id, a.warehouse_id, 'adjusted', a.quantity_change, a.unit_cost, c.sc_number,
       CASE a.reason WHEN 'counting_error' THEN 'Counting / recording error' WHEN 'loss' THEN 'Loss / missing'
                     WHEN 'breakage' THEN 'Breakage / damage' WHEN 'expired' THEN 'Expired / spoiled'
                     WHEN 'found' THEN 'Found stock' ELSE 'Other' END,
       a.notes, 'drug_inventory_adjustments', a.id, a.created_at, a.created_by
FROM drug_inventory_adjustments a
LEFT JOIN stock_counts c ON c.id = a.stock_count_id;

-- ---------- Backfill: opening balances (whatever the history doesn't explain) ----------
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, notes, source_type, source_id, created_at, created_by)
SELECT LEAST(DATE(COALESCE(l.created_at, NOW())), COALESCE(m.first_date, DATE(COALESCE(l.created_at, NOW())))),
       l.drug_id, l.id, l.warehouse_id, 'opening', l.quantity_on_hand - COALESCE(m.total, 0), COALESCE((SELECT rc.unit_cost FROM drug_inventory_receipts rc WHERE rc.lot_id = l.id AND rc.voided_at IS NULL AND rc.unit_cost IS NOT NULL
                  ORDER BY rc.received_date DESC, rc.id DESC LIMIT 1), d.unit_cost, 0),
       'Balance on file before the ledger started', 'drug_inventory_lots', l.id, l.created_at, l.created_by
FROM drug_inventory_lots l
JOIN drugs d ON d.id = l.drug_id
LEFT JOIN (SELECT lot_id, SUM(quantity) AS total, MIN(movement_date) AS first_date FROM drug_stock_movements GROUP BY lot_id) m ON m.lot_id = l.id
WHERE ABS(l.quantity_on_hand - COALESCE(m.total, 0)) > 0.0005;
