-- ========================================================
-- Migration: 231_stock_counts.sql
-- Module: Pharmacy > Stock Count (Phase 5 of procure-to-pay)
-- Purpose: Keep system stock equal to what is actually on the shelf.
--            * stock_counts: one count of one storage location
--              (SC-YYYY-NNNNN), either everything there (full) or
--              chosen items (partial, e.g. to write off a breakage).
--              counting -> submitted -> approved; a rejected count goes
--              back for a recount; cancelled. gain/loss values are
--              stored when it is approved.
--            * stock_count_items: one line per lot. system_quantity is
--              frozen when the count starts; counted_quantity is what
--              staff found. Lines with a difference need a reason.
--              is_added = stock found on the shelf that wasn't on the
--              sheet (lot_id is filled in when it's approved if the
--              lot is new).
--            * drug_inventory_adjustments: the permanent record of every
--              stock correction (+/- per lot, before/after, value),
--              shown in the inventory reports next to transfers and
--              destructions.
-- ========================================================

CREATE TABLE IF NOT EXISTS stock_counts (

    id INT NOT NULL AUTO_INCREMENT,

    sc_number VARCHAR(30) NULL,

    warehouse_id INT NOT NULL,

    count_type VARCHAR(10) NOT NULL DEFAULT 'full',

    notes VARCHAR(1000) NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'counting',

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

    gain_value DECIMAL(14,2) NOT NULL DEFAULT 0,

    loss_value DECIMAL(14,2) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_scount_sc_number UNIQUE (sc_number),

    INDEX idx_scount_warehouse (warehouse_id),

    INDEX idx_scount_status (status),

    CONSTRAINT fk_scount_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_count_items (

    id INT NOT NULL AUTO_INCREMENT,

    stock_count_id INT NOT NULL,

    line_no INT NOT NULL DEFAULT 1,

    lot_id INT NULL,

    drug_id INT NOT NULL,

    lot_number VARCHAR(100) NOT NULL,

    expires_date DATE NULL,

    is_added TINYINT(1) NOT NULL DEFAULT 0,

    system_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,

    counted_quantity DECIMAL(12,3) NULL,

    unit_cost DECIMAL(12,4) NOT NULL DEFAULT 0,

    reason VARCHAR(30) NULL,

    notes VARCHAR(255) NULL,

    counted_at DATETIME NULL,

    counted_by INT NULL,

    quantity_before DECIMAL(12,3) NULL,

    quantity_after DECIMAL(12,3) NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_scounti_count (stock_count_id),

    INDEX idx_scounti_lot (lot_id),

    INDEX idx_scounti_drug (drug_id),

    CONSTRAINT fk_scounti_count
        FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_scounti_lot
        FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_scounti_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_count_history (

    id INT NOT NULL AUTO_INCREMENT,

    stock_count_id INT NOT NULL,

    action VARCHAR(30) NOT NULL,

    notes VARCHAR(500) NULL,

    user_id INT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_scounth_count (stock_count_id),

    CONSTRAINT fk_scounth_count
        FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id)
        ON UPDATE NO ACTION ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drug_inventory_adjustments (

    id INT NOT NULL AUTO_INCREMENT,

    drug_id INT NOT NULL,

    lot_id INT NOT NULL,

    warehouse_id INT NOT NULL,

    quantity_change DECIMAL(12,3) NOT NULL,

    quantity_before DECIMAL(12,3) NOT NULL,

    quantity_after DECIMAL(12,3) NOT NULL,

    reason VARCHAR(30) NOT NULL,

    unit_cost DECIMAL(12,4) NOT NULL DEFAULT 0,

    value_change DECIMAL(14,2) NOT NULL DEFAULT 0,

    stock_count_id INT NULL,

    stock_count_item_id INT NULL,

    notes VARCHAR(255) NULL,

    adjusted_date DATE NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_diadj_drug (drug_id),

    INDEX idx_diadj_lot (lot_id),

    INDEX idx_diadj_warehouse (warehouse_id),

    INDEX idx_diadj_count (stock_count_id),

    INDEX idx_diadj_date (adjusted_date),

    CONSTRAINT fk_diadj_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_diadj_lot
        FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_diadj_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_diadj_count
        FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
