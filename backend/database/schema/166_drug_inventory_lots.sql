-- =============================================
-- Table: drug_inventory_lots
-- One physical lot of a drug at a facility/warehouse with a quantity
-- on hand and expiration date -- the row shown per-line on the
-- Inventory > Management table. A drug can have many lots (different
-- lot numbers, locations, or expiration dates).
-- =============================================

CREATE TABLE IF NOT EXISTS drug_inventory_lots (

    id INT NOT NULL AUTO_INCREMENT,

    drug_id INT NOT NULL,

    lot_number VARCHAR(100) NOT NULL,

    facility_id INT NULL,

    warehouse_id INT NOT NULL,

    quantity_on_hand DECIMAL(12,3) NOT NULL DEFAULT 0,

    expires_date DATE NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_dil_drug (drug_id),

    INDEX idx_dil_warehouse (warehouse_id),

    INDEX idx_dil_facility (facility_id),

    INDEX idx_dil_created_by (created_by),

    INDEX idx_dil_deleted_by (deleted_by),

    CONSTRAINT fk_dil_drug
        FOREIGN KEY (drug_id)
        REFERENCES drugs(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_dil_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_dil_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
