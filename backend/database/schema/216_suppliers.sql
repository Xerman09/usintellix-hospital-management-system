-- ========================================================
-- Migration: 216_suppliers.sql
-- Module: Pharmacy > Suppliers
-- Purpose: Supplier master list for medicines, supplies, vaccines and
--          equipment, and the links from inventory to it:
--            * suppliers: contact details, address, TIN, FDA License
--              to Operate (LTO) number + expiry, payment terms, lead
--              time, and which product types they supply
--            * drug_inventory_receipts.supplier_id: which supplier a
--              "Receive Stock" delivery came from (the existing free-
--              text `supplier` column keeps the name as recorded)
--            * drugs.preferred_supplier_id: who to reorder from
-- ========================================================

CREATE TABLE IF NOT EXISTS suppliers (

    id INT NOT NULL AUTO_INCREMENT,

    code VARCHAR(20) NULL,

    name VARCHAR(255) NOT NULL,

    supplier_type VARCHAR(50) NOT NULL DEFAULT 'Distributor',

    -- Comma-separated subset of the drug catalog's product types
    -- (Drug, Supply, Vaccine, Equipment, Other).
    product_types VARCHAR(255) NULL,

    contact_person VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    mobile VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    website VARCHAR(255) NULL,

    address_line VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Philippines',

    tin VARCHAR(20) NULL,
    fda_license_number VARCHAR(100) NULL,
    license_expiry DATE NULL,

    payment_terms VARCHAR(50) NULL,
    lead_time_days INT NULL,

    notes TEXT NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_suppliers_code UNIQUE (code),

    INDEX idx_suppliers_name (name),
    INDEX idx_suppliers_active (is_active),
    INDEX idx_suppliers_license_expiry (license_expiry)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


ALTER TABLE drug_inventory_receipts
    ADD COLUMN IF NOT EXISTS supplier_id INT NULL AFTER received_date;

CREATE INDEX IF NOT EXISTS idx_dir_supplier ON drug_inventory_receipts (supplier_id);

ALTER TABLE drug_inventory_receipts
    ADD CONSTRAINT fk_dir_supplier
        FOREIGN KEY IF NOT EXISTS (supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;


ALTER TABLE drugs
    ADD COLUMN IF NOT EXISTS preferred_supplier_id INT NULL AFTER manufacturer;

CREATE INDEX IF NOT EXISTS idx_drugs_preferred_supplier ON drugs (preferred_supplier_id);

ALTER TABLE drugs
    ADD CONSTRAINT fk_drugs_preferred_supplier
        FOREIGN KEY IF NOT EXISTS (preferred_supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;
