-- ========================================================
-- Migration: 215_drug_registration_enhancements.sql
-- Module: Drug Inventory
-- Purpose: Turns `drugs` into a proper medicine catalog that is
--          registered separately from stock:
--            * dosage_forms / drug_categories lookup tables (admin-
--              managed, replacing the hard-coded PHP lists), with
--              routes and units now coming from the existing
--              administration_routes / amount_units tables
--            * generic/brand name, strength, package size, FDA PH
--              registration number, barcode, controlled-drug class,
--              Rx/OTC, storage, high-alert / LASA flags, cost/price
--            * drug_inventory_receipts: audit log for the new
--              "Receive Stock" flow (stock is no longer created as a
--              side effect of registering a drug)
--          The old free-text form/size/unit/route columns are kept
--          (unused by new code) so older rows/reports don't break.
-- ========================================================

CREATE TABLE IF NOT EXISTS dosage_forms (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_dosage_forms_name
        UNIQUE (name)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


CREATE TABLE IF NOT EXISTS drug_categories (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_drug_categories_name
        UNIQUE (name)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


ALTER TABLE drugs
    ADD COLUMN IF NOT EXISTS generic_name VARCHAR(255) NULL AFTER name,
    ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255) NULL AFTER generic_name,
    ADD COLUMN IF NOT EXISTS strength VARCHAR(100) NULL AFTER brand_name,
    ADD COLUMN IF NOT EXISTS dosage_form_id INT NULL AFTER strength,
    ADD COLUMN IF NOT EXISTS route_id INT NULL AFTER dosage_form_id,
    ADD COLUMN IF NOT EXISTS dispensing_unit_id INT NULL AFTER route_id,
    ADD COLUMN IF NOT EXISTS package_unit_id INT NULL AFTER dispensing_unit_id,
    ADD COLUMN IF NOT EXISTS package_quantity DECIMAL(12,3) NULL AFTER package_unit_id,
    ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER package_quantity,
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255) NULL AFTER category_id,
    ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50) NULL AFTER manufacturer,
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) NULL AFTER registration_number,
    ADD COLUMN IF NOT EXISTS controlled_class VARCHAR(40) NOT NULL DEFAULT 'None' AFTER barcode,
    ADD COLUMN IF NOT EXISTS requires_prescription TINYINT(1) NOT NULL DEFAULT 1 AFTER controlled_class,
    ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(60) NULL AFTER requires_prescription,
    ADD COLUMN IF NOT EXISTS is_high_alert TINYINT(1) NOT NULL DEFAULT 0 AFTER storage_condition,
    ADD COLUMN IF NOT EXISTS is_lasa TINYINT(1) NOT NULL DEFAULT 0 AFTER is_high_alert,
    ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,2) NULL AFTER is_lasa,
    ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12,2) NULL AFTER unit_cost,
    ADD COLUMN IF NOT EXISTS legacy_medication_id INT NULL AFTER selling_price;

CREATE INDEX IF NOT EXISTS idx_drugs_generic_name ON drugs (generic_name);
CREATE INDEX IF NOT EXISTS idx_drugs_dosage_form ON drugs (dosage_form_id);
CREATE INDEX IF NOT EXISTS idx_drugs_route ON drugs (route_id);
CREATE INDEX IF NOT EXISTS idx_drugs_dispensing_unit ON drugs (dispensing_unit_id);
CREATE INDEX IF NOT EXISTS idx_drugs_package_unit ON drugs (package_unit_id);
CREATE INDEX IF NOT EXISTS idx_drugs_category ON drugs (category_id);
CREATE INDEX IF NOT EXISTS idx_drugs_registration_number ON drugs (registration_number);
CREATE INDEX IF NOT EXISTS idx_drugs_barcode ON drugs (barcode);
CREATE INDEX IF NOT EXISTS idx_drugs_legacy_medication ON drugs (legacy_medication_id);

ALTER TABLE drugs
    ADD CONSTRAINT fk_drugs_dosage_form
        FOREIGN KEY IF NOT EXISTS (dosage_form_id) REFERENCES dosage_forms(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    ADD CONSTRAINT fk_drugs_route
        FOREIGN KEY IF NOT EXISTS (route_id) REFERENCES administration_routes(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    ADD CONSTRAINT fk_drugs_dispensing_unit
        FOREIGN KEY IF NOT EXISTS (dispensing_unit_id) REFERENCES amount_units(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    ADD CONSTRAINT fk_drugs_package_unit
        FOREIGN KEY IF NOT EXISTS (package_unit_id) REFERENCES amount_units(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    ADD CONSTRAINT fk_drugs_category
        FOREIGN KEY IF NOT EXISTS (category_id) REFERENCES drug_categories(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;


-- One row per "Receive Stock" action. quantity is always stored in
-- the drug's dispensing unit (packages are converted on the way in).
CREATE TABLE IF NOT EXISTS drug_inventory_receipts (

    id INT NOT NULL AUTO_INCREMENT,

    drug_id INT NOT NULL,

    lot_id INT NOT NULL,

    quantity DECIMAL(12,3) NOT NULL,

    received_date DATE NOT NULL,

    supplier VARCHAR(255) NULL,

    invoice_number VARCHAR(100) NULL,

    unit_cost DECIMAL(12,2) NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_dir_drug (drug_id),
    INDEX idx_dir_lot (lot_id),
    INDEX idx_dir_received_date (received_date),
    INDEX idx_dir_created_by (created_by),

    CONSTRAINT fk_dir_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_dir_lot
        FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB;
