-- ========================================================
-- Migration: 227_supplier_invoices.sql
-- Module: Pharmacy > Supplier Invoices (Phase 1 of procure-to-pay)
-- Purpose: Record the supplier's bill and check it against what was
--          ordered (purchase order) and what was received (receiving
--          reports) before it is approved for payment -- the 3-way match.
--            * purchase_orders / purchase_order_items: VAT. Prices stay
--              VAT-exclusive; each line is vatable, VAT-exempt or
--              zero-rated, and the order carries the VAT on top.
--              vat_rate = 0 marks orders saved before VAT was tracked.
--            * goods_receipts: a receiving report entered by mistake can
--              be voided (stock taken back out, order quantities
--              reversed); drug_inventory_receipts rows it created are
--              marked voided too.
--            * supplier_invoices: one supplier invoice against one
--              purchase order (AP-YYYY-NNNNN), with its approval trail.
--            * supplier_invoice_receipts: which receiving reports the
--              invoice bills. A receiving report can be on only one
--              invoice that isn't cancelled (checked in code).
--            * supplier_invoice_items: billed lines, with the match
--              result stored per line (received qty, expected price,
--              status and variance amount).
--            * supplier_invoice_history: every step, like purchase orders.
-- ========================================================

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER discount_total,
    ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER vat_rate;

ALTER TABLE purchase_order_items
    ADD COLUMN IF NOT EXISTS vat_type VARCHAR(12) NOT NULL DEFAULT 'vatable' AFTER line_total,
    ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER vat_type;

ALTER TABLE goods_receipts
    ADD COLUMN IF NOT EXISTS voided_at DATETIME NULL AFTER total_cost,
    ADD COLUMN IF NOT EXISTS voided_by INT NULL AFTER voided_at,
    ADD COLUMN IF NOT EXISTS void_reason VARCHAR(255) NULL AFTER voided_by;

ALTER TABLE drug_inventory_receipts
    ADD COLUMN IF NOT EXISTS voided_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS supplier_invoices (

    id INT NOT NULL AUTO_INCREMENT,

    ap_number VARCHAR(30) NULL,

    supplier_id INT NOT NULL,

    purchase_order_id INT NOT NULL,

    supplier_invoice_no VARCHAR(100) NOT NULL,

    invoice_date DATE NOT NULL,

    due_date DATE NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    match_status VARCHAR(20) NULL,

    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,

    discount_total DECIMAL(12,2) NOT NULL DEFAULT 0,

    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    other_charges DECIMAL(12,2) NOT NULL DEFAULT 0,

    total DECIMAL(12,2) NOT NULL DEFAULT 0,

    variance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    variance_count INT NOT NULL DEFAULT 0,

    match_notes TEXT NULL,

    notes TEXT NULL,

    submitted_at DATETIME NULL,

    submitted_by INT NULL,

    approved_at DATETIME NULL,

    approved_by INT NULL,

    approval_notes VARCHAR(500) NULL,

    rejected_at DATETIME NULL,

    rejected_by INT NULL,

    rejection_reason VARCHAR(255) NULL,

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

    CONSTRAINT uq_si_ap_number UNIQUE (ap_number),

    INDEX idx_si_supplier (supplier_id),

    INDEX idx_si_po (purchase_order_id),

    INDEX idx_si_status (status),

    INDEX idx_si_supplier_invoice_no (supplier_id, supplier_invoice_no),

    CONSTRAINT fk_si_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_si_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_invoice_receipts (

    id INT NOT NULL AUTO_INCREMENT,

    supplier_invoice_id INT NOT NULL,

    goods_receipt_id INT NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_sir_invoice_receipt UNIQUE (supplier_invoice_id, goods_receipt_id),

    INDEX idx_sir_receipt (goods_receipt_id),

    CONSTRAINT fk_sir_invoice
        FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_sir_receipt
        FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_invoice_items (

    id INT NOT NULL AUTO_INCREMENT,

    supplier_invoice_id INT NOT NULL,

    line_no INT NOT NULL DEFAULT 1,

    purchase_order_item_id INT NULL,

    drug_id INT NOT NULL,

    order_unit VARCHAR(10) NOT NULL DEFAULT 'unit',

    units_per_package DECIMAL(12,3) NULL,

    quantity DECIMAL(12,3) NOT NULL,

    unit_price DECIMAL(12,4) NOT NULL,

    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    line_total DECIMAL(12,2) NOT NULL,

    vat_type VARCHAR(12) NOT NULL DEFAULT 'vatable',

    vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    received_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,

    expected_unit_price DECIMAL(12,4) NULL,

    expected_vat_type VARCHAR(12) NULL,

    match_status VARCHAR(20) NULL,

    match_notes VARCHAR(500) NULL,

    variance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_sii_invoice (supplier_invoice_id),

    INDEX idx_sii_po_item (purchase_order_item_id),

    CONSTRAINT fk_sii_invoice
        FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_sii_po_item
        FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_sii_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_invoice_history (

    id INT NOT NULL AUTO_INCREMENT,

    supplier_invoice_id INT NOT NULL,

    action VARCHAR(30) NOT NULL,

    notes VARCHAR(500) NULL,

    user_id INT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_sih_invoice (supplier_invoice_id),

    CONSTRAINT fk_sih_invoice
        FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id)
        ON UPDATE NO ACTION ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
