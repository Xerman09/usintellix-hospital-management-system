-- ========================================================
-- Migration: 220_goods_receipts.sql
-- Module: Pharmacy > Receiving
-- Purpose: Receiving deliveries against approved purchase orders.
--            * goods_receipts: one delivery (Receiving Report) for one
--              purchase order -- date, where it went, the supplier's
--              delivery receipt / invoice numbers, who received it.
--              gr_number is RR-<year>-<id padded>, set after insert.
--            * goods_receipt_items: what arrived per order line, per
--              lot (one order line can arrive as several lots):
--              quantity in the line's order unit, base_quantity in
--              dispensing units (what went into stock), lot + expiry,
--              cost per dispensing unit, and any quantity rejected on
--              arrival (damaged, wrong item, short expiry) with reason.
--              lot_id / inventory_receipt_id link to the stock records
--              Receive Stock created.
--            * drug_inventory_receipts.goods_receipt_id: which delivery
--              a stock receipt came from.
--          purchase_orders.status gains:
--            partially_received  some, not all, of the order arrived
--            received            everything ordered has arrived
--            closed              partially received, rest won't come
--          purchase_order_items.quantity_received (from 218) is kept
--          up to date in the line's order unit.
-- ========================================================

CREATE TABLE IF NOT EXISTS goods_receipts (

    id INT NOT NULL AUTO_INCREMENT,

    gr_number VARCHAR(30) NULL,

    purchase_order_id INT NOT NULL,

    supplier_id INT NOT NULL,

    warehouse_id INT NOT NULL,

    received_date DATE NOT NULL,

    delivery_receipt_no VARCHAR(100) NULL,
    invoice_no VARCHAR(100) NULL,

    notes TEXT NULL,

    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_gr_number UNIQUE (gr_number),

    INDEX idx_gr_po (purchase_order_id),
    INDEX idx_gr_supplier (supplier_id),
    INDEX idx_gr_received_date (received_date),

    CONSTRAINT fk_gr_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_gr_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_gr_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


CREATE TABLE IF NOT EXISTS goods_receipt_items (

    id INT NOT NULL AUTO_INCREMENT,

    goods_receipt_id INT NOT NULL,

    purchase_order_item_id INT NOT NULL,

    drug_id INT NOT NULL,

    lot_number VARCHAR(100) NULL,
    expires_date DATE NULL,

    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    base_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,

    rejected_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    rejection_reason VARCHAR(255) NULL,

    unit_cost DECIMAL(12,4) NULL,

    lot_id INT NULL,
    inventory_receipt_id INT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_gri_receipt (goods_receipt_id),
    INDEX idx_gri_po_item (purchase_order_item_id),
    INDEX idx_gri_drug (drug_id),

    CONSTRAINT fk_gri_receipt
        FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_gri_po_item
        FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_gri_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


ALTER TABLE drug_inventory_receipts
    ADD COLUMN IF NOT EXISTS goods_receipt_id INT NULL AFTER supplier_id;

CREATE INDEX IF NOT EXISTS idx_dir_goods_receipt ON drug_inventory_receipts (goods_receipt_id);

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS received_at DATETIME NULL AFTER rejection_reason,
    ADD COLUMN IF NOT EXISTS closed_at DATETIME NULL AFTER received_at,
    ADD COLUMN IF NOT EXISTS closed_by INT NULL AFTER closed_at,
    ADD COLUMN IF NOT EXISTS close_reason VARCHAR(255) NULL AFTER closed_by;
