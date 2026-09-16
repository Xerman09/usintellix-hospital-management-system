-- =============================================
-- Table: drug_inventory_destructions
-- Audit log for the "Destroy" action on the Inventory > Management
-- screen and the record source for the Inventory > Destroyed screen --
-- removes quantity from a lot permanently (expired/damaged/recalled
-- stock) with a method, witness, and notes for compliance record-keeping.
-- =============================================

CREATE TABLE IF NOT EXISTS drug_inventory_destructions (

    id INT NOT NULL AUTO_INCREMENT,

    drug_id INT NOT NULL,

    lot_id INT NOT NULL,

    quantity DECIMAL(12,3) NOT NULL,

    destroyed_date DATE NOT NULL,

    method VARCHAR(100) NULL,

    witness VARCHAR(150) NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_did_drug (drug_id),

    INDEX idx_did_lot (lot_id),

    INDEX idx_did_created_by (created_by),

    INDEX idx_did_destroyed_date (destroyed_date),

    CONSTRAINT fk_did_drug
        FOREIGN KEY (drug_id)
        REFERENCES drugs(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_did_lot
        FOREIGN KEY (lot_id)
        REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
