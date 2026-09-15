-- =============================================
-- Table: drug_inventory_transfers
-- Audit log for the "Tran" (transfer) action on the Inventory >
-- Management screen -- moves quantity from one lot to another
-- (typically a different warehouse/facility for the same drug).
-- =============================================

CREATE TABLE IF NOT EXISTS drug_inventory_transfers (

    id INT NOT NULL AUTO_INCREMENT,

    drug_id INT NOT NULL,

    from_lot_id INT NOT NULL,

    to_lot_id INT NOT NULL,

    quantity DECIMAL(12,3) NOT NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_dit_drug (drug_id),

    INDEX idx_dit_from_lot (from_lot_id),

    INDEX idx_dit_to_lot (to_lot_id),

    INDEX idx_dit_created_by (created_by),

    CONSTRAINT fk_dit_drug
        FOREIGN KEY (drug_id)
        REFERENCES drugs(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_dit_from_lot
        FOREIGN KEY (from_lot_id)
        REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_dit_to_lot
        FOREIGN KEY (to_lot_id)
        REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
