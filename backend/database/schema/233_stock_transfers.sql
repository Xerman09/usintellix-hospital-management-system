-- ========================================================
-- Migration: 233_stock_transfers.sql
-- Module: Pharmacy > Stock Transfers
-- Purpose: Move stock from one storage location to another with a
--          document that both sides sign off.
--            * stock_transfers: one transfer (ST-YYYY-NNNNN) from one
--              location to another.
--              draft -> requested (optional: the receiving side asks)
--                    -> in_transit (sent: stock leaves the source lots)
--                    -> received (stock lands in the destination lots;
--                       anything that didn't arrive is recorded short).
--              cancelled: before it's received; an in-transit transfer
--              puts its stock back into the source lots.
--            * stock_transfer_items: what is asked for / sent, per item,
--              in dispensing units. lot_id = a lot chosen by hand;
--              NULL = earliest expiry first when it is sent.
--            * stock_transfer_lots: what actually left, per source lot
--              (filled in when it's sent), and what arrived of it.
--            * stock_transfer_history: every step.
--          Received quantities are also logged in
--          drug_inventory_transfers, so they show in Reports >
--          Inventory > Activity / Transactions.
-- ========================================================

CREATE TABLE IF NOT EXISTS stock_transfers (

    id INT NOT NULL AUTO_INCREMENT,

    st_number VARCHAR(30) NULL,

    from_warehouse_id INT NOT NULL,

    to_warehouse_id INT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    priority VARCHAR(10) NOT NULL DEFAULT 'normal',

    needed_by DATE NULL,

    notes VARCHAR(1000) NULL,

    requested_at DATETIME NULL,

    requested_by INT NULL,

    sent_at DATETIME NULL,

    sent_by INT NULL,

    sent_date DATE NULL,

    sent_via VARCHAR(150) NULL,

    received_at DATETIME NULL,

    received_by INT NULL,

    received_date DATE NULL,

    receive_notes VARCHAR(500) NULL,

    cancelled_at DATETIME NULL,

    cancelled_by INT NULL,

    cancel_reason VARCHAR(255) NULL,

    sent_value DECIMAL(14,2) NOT NULL DEFAULT 0,

    short_value DECIMAL(14,2) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_stransfer_number UNIQUE (st_number),

    INDEX idx_stransfer_from (from_warehouse_id),

    INDEX idx_stransfer_to (to_warehouse_id),

    INDEX idx_stransfer_status (status),

    CONSTRAINT fk_stransfer_from
        FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_stransfer_to
        FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transfer_items (

    id INT NOT NULL AUTO_INCREMENT,

    stock_transfer_id INT NOT NULL,

    line_no INT NOT NULL DEFAULT 1,

    drug_id INT NOT NULL,

    lot_id INT NULL,

    quantity DECIMAL(12,3) NOT NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_stransferi_transfer (stock_transfer_id),

    INDEX idx_stransferi_drug (drug_id),

    CONSTRAINT fk_stransferi_transfer
        FOREIGN KEY (stock_transfer_id) REFERENCES stock_transfers(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_stransferi_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transfer_lots (

    id INT NOT NULL AUTO_INCREMENT,

    stock_transfer_id INT NOT NULL,

    stock_transfer_item_id INT NOT NULL,

    drug_id INT NOT NULL,

    from_lot_id INT NOT NULL,

    lot_number VARCHAR(100) NOT NULL,

    expires_date DATE NULL,

    quantity_sent DECIMAL(12,3) NOT NULL,

    quantity_received DECIMAL(12,3) NULL,

    short_reason VARCHAR(30) NULL,

    short_notes VARCHAR(255) NULL,

    unit_cost DECIMAL(12,4) NOT NULL DEFAULT 0,

    to_lot_id INT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_stransferl_transfer (stock_transfer_id),

    INDEX idx_stransferl_item (stock_transfer_item_id),

    INDEX idx_stransferl_from_lot (from_lot_id),

    CONSTRAINT fk_stransferl_transfer
        FOREIGN KEY (stock_transfer_id) REFERENCES stock_transfers(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_stransferl_from_lot
        FOREIGN KEY (from_lot_id) REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transfer_history (

    id INT NOT NULL AUTO_INCREMENT,

    stock_transfer_id INT NOT NULL,

    action VARCHAR(30) NOT NULL,

    notes VARCHAR(500) NULL,

    user_id INT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_stransferh_transfer (stock_transfer_id),

    CONSTRAINT fk_stransferh_transfer
        FOREIGN KEY (stock_transfer_id) REFERENCES stock_transfers(id)
        ON UPDATE NO ACTION ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
