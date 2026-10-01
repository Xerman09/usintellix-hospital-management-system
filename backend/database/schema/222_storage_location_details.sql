-- ========================================================
-- Migration: 222_storage_location_details.sql
-- Module: Pharmacy > Storage Locations (table: warehouses)
-- Purpose: Who owns and looks after each storage location, and how
--          much of each item it should keep.
--            * warehouses: code, location type (Main Pharmacy, Central
--              Supply Room, Satellite Pharmacy, Ward Stock, ...), where
--              it physically is, the department that owns it, and its
--              custodian (the person accountable for receiving and
--              disposing of its stock) plus an alternate custodian for
--              when they're away.
--            * warehouse_stock_levels: per location + item, the minimum
--              (reorder point) and optional maximum quantity in
--              dispensing units. Used by the location's Stock Check to
--              flag items that are out, low, or over the maximum.
--              One row per location + item (UNIQUE); removing a level
--              deletes the row.
-- ========================================================

ALTER TABLE warehouses
    ADD COLUMN IF NOT EXISTS code VARCHAR(30) NULL AFTER name,
    ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) NULL AFTER code,
    ADD COLUMN IF NOT EXISTS physical_location VARCHAR(255) NULL AFTER location_type,
    ADD COLUMN IF NOT EXISTS department_id INT NULL AFTER facility_id,
    ADD COLUMN IF NOT EXISTS custodian_user_id INT NULL AFTER department_id,
    ADD COLUMN IF NOT EXISTS alternate_custodian_user_id INT NULL AFTER custodian_user_id,
    ADD COLUMN IF NOT EXISTS notes TEXT NULL AFTER alternate_custodian_user_id;

CREATE INDEX IF NOT EXISTS idx_wh_department ON warehouses (department_id);
CREATE INDEX IF NOT EXISTS idx_wh_custodian ON warehouses (custodian_user_id);

ALTER TABLE warehouses
    ADD CONSTRAINT fk_wh_department
        FOREIGN KEY IF NOT EXISTS (department_id) REFERENCES departments(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE warehouses
    ADD CONSTRAINT fk_wh_custodian
        FOREIGN KEY IF NOT EXISTS (custodian_user_id) REFERENCES users(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE warehouses
    ADD CONSTRAINT fk_wh_alt_custodian
        FOREIGN KEY IF NOT EXISTS (alternate_custodian_user_id) REFERENCES users(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;


CREATE TABLE IF NOT EXISTS warehouse_stock_levels (

    id INT NOT NULL AUTO_INCREMENT,

    warehouse_id INT NOT NULL,

    drug_id INT NOT NULL,

    min_level DECIMAL(12,3) NOT NULL DEFAULT 0,

    max_level DECIMAL(12,3) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_wsl_location_item UNIQUE (warehouse_id, drug_id),

    INDEX idx_wsl_drug (drug_id),

    CONSTRAINT fk_wsl_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_wsl_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
