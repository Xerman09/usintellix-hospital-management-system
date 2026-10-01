-- ========================================================
-- Migration: 218_purchase_orders.sql
-- Module: Pharmacy > Purchase Orders
-- Purpose: Orders placed with a supplier for catalog items.
--            * purchase_orders: one order to one supplier -- where to
--              deliver, expected date, terms, totals, and its status:
--                draft      still being prepared, editable
--                submitted  sent to the supplier, locked
--                cancelled  called off (reason kept)
--              po_number is PO-<year>-<id padded>, set after insert.
--            * purchase_order_items: the order lines. Each line is in
--              either dispensing units ('unit') or packages
--              ('package'); units_per_package is copied from the drug
--              so a later catalog change doesn't rewrite old orders.
--              supplier_product_id points at the Supplier Prices
--              listing the price came from (NULL = priced by hand).
--              quantity_received is for receiving against the order.
--          One line per item per order is enforced in
--          PurchaseOrderService.
-- ========================================================

CREATE TABLE IF NOT EXISTS purchase_orders (

    id INT NOT NULL AUTO_INCREMENT,

    po_number VARCHAR(30) NULL,

    supplier_id INT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    order_date DATE NOT NULL,
    expected_date DATE NULL,

    warehouse_id INT NULL,

    payment_terms VARCHAR(50) NULL,
    supplier_reference VARCHAR(100) NULL,

    notes TEXT NULL,

    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,

    submitted_at DATETIME NULL,
    submitted_by INT NULL,
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

    CONSTRAINT uq_po_number UNIQUE (po_number),

    INDEX idx_po_supplier (supplier_id),
    INDEX idx_po_status (status),
    INDEX idx_po_order_date (order_date),

    CONSTRAINT fk_po_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_po_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


CREATE TABLE IF NOT EXISTS purchase_order_items (

    id INT NOT NULL AUTO_INCREMENT,

    purchase_order_id INT NOT NULL,

    line_no INT NOT NULL DEFAULT 1,

    drug_id INT NOT NULL,

    supplier_product_id INT NULL,

    supplier_item_code VARCHAR(100) NULL,

    order_unit VARCHAR(10) NOT NULL DEFAULT 'unit',

    units_per_package DECIMAL(12,3) NULL,

    quantity DECIMAL(12,3) NOT NULL,

    unit_price DECIMAL(12,4) NOT NULL,

    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    line_total DECIMAL(12,2) NOT NULL,

    quantity_received DECIMAL(12,3) NOT NULL DEFAULT 0,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_poi_order (purchase_order_id),
    INDEX idx_poi_drug (drug_id),

    CONSTRAINT fk_poi_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_poi_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_poi_supplier_product
        FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
