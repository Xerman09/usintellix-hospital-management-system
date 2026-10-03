-- ========================================================
-- Migration: 229_supplier_returns.sql
-- Module: Pharmacy > Supplier Returns (Phase 3 of procure-to-pay)
-- Purpose: Sending rejected, damaged, wrong or near-expiry items back to
--          the supplier, and the credit the supplier gives for them.
--            * supplier_returns: one return to one supplier
--              (RTS-YYYY-NNNNN). draft -> pending_approval -> approved
--              -> sent -> credited (rejected = sent back for changes;
--              cancelled before it's sent). Stock leaves inventory when
--              it's marked sent. The supplier's credit memo (number,
--              date, amount) is recorded when credited; credit_applied
--              is how much of that has been used against its invoices.
--            * supplier_return_items: what goes back. Each line comes
--              from either a quantity rejected at receiving
--              (goods_receipt_item_id -- never stocked, so no stock
--              change) or a stock lot (lot_id -- taken out of the lot
--              when sent).
--            * supplier_payments.supplier_return_id: applying a credit
--              to invoices is recorded like a payment (method 'credit')
--              that points back to the return it came from.
-- ========================================================

CREATE TABLE IF NOT EXISTS supplier_returns (

    id INT NOT NULL AUTO_INCREMENT,

    rts_number VARCHAR(30) NULL,

    supplier_id INT NOT NULL,

    warehouse_id INT NULL,

    return_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    notes TEXT NULL,

    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,

    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    total DECIMAL(12,2) NOT NULL DEFAULT 0,

    submitted_at DATETIME NULL,

    submitted_by INT NULL,

    approved_at DATETIME NULL,

    approved_by INT NULL,

    approval_notes VARCHAR(500) NULL,

    rejected_at DATETIME NULL,

    rejected_by INT NULL,

    rejection_reason VARCHAR(255) NULL,

    sent_at DATETIME NULL,

    sent_by INT NULL,

    sent_date DATE NULL,

    sent_via VARCHAR(150) NULL,

    credit_memo_no VARCHAR(100) NULL,

    credit_memo_date DATE NULL,

    credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    credit_applied DECIMAL(12,2) NOT NULL DEFAULT 0,

    credited_at DATETIME NULL,

    credited_by INT NULL,

    cancelled_at DATETIME NULL,

    cancelled_by INT NULL,

    cancel_reason VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_srt_rts_number UNIQUE (rts_number),

    INDEX idx_srt_supplier (supplier_id),

    INDEX idx_srt_status (status),

    CONSTRAINT fk_srt_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_srt_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_return_items (

    id INT NOT NULL AUTO_INCREMENT,

    supplier_return_id INT NOT NULL,

    line_no INT NOT NULL DEFAULT 1,

    source VARCHAR(10) NOT NULL,

    goods_receipt_item_id INT NULL,

    lot_id INT NULL,

    drug_id INT NOT NULL,

    lot_number VARCHAR(100) NULL,

    expires_date DATE NULL,

    order_unit VARCHAR(10) NOT NULL DEFAULT 'unit',

    units_per_package DECIMAL(12,3) NULL,

    quantity DECIMAL(12,3) NOT NULL,

    base_quantity DECIMAL(12,3) NOT NULL,

    unit_cost DECIMAL(12,4) NOT NULL DEFAULT 0,

    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,

    vat_type VARCHAR(12) NOT NULL DEFAULT 'vatable',

    vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    reason VARCHAR(30) NOT NULL,

    remarks VARCHAR(255) NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_srti_return (supplier_return_id),

    INDEX idx_srti_gri (goods_receipt_item_id),

    INDEX idx_srti_lot (lot_id),

    CONSTRAINT fk_srti_return
        FOREIGN KEY (supplier_return_id) REFERENCES supplier_returns(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_srti_gri
        FOREIGN KEY (goods_receipt_item_id) REFERENCES goods_receipt_items(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_srti_lot
        FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_srti_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_return_history (

    id INT NOT NULL AUTO_INCREMENT,

    supplier_return_id INT NOT NULL,

    action VARCHAR(30) NOT NULL,

    notes VARCHAR(500) NULL,

    user_id INT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_srth_return (supplier_return_id),

    CONSTRAINT fk_srth_return
        FOREIGN KEY (supplier_return_id) REFERENCES supplier_returns(id)
        ON UPDATE NO ACTION ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

ALTER TABLE supplier_payments
    ADD COLUMN IF NOT EXISTS supplier_return_id INT NULL AFTER supplier_id;

CREATE INDEX IF NOT EXISTS idx_spay_return ON supplier_payments (supplier_return_id);
