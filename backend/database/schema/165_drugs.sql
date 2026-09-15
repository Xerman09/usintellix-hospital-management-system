-- =============================================
-- Table: drugs
-- Drug/supply catalog entries for the Inventory > Management screen
-- (the "Add Drug" form) -- separate from encounter_billing_codes/the
-- CPT/ICD codes catalog, since this is physical stock, not a billable
-- procedure code.
-- =============================================

CREATE TABLE IF NOT EXISTS drugs (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    ndc VARCHAR(50) NULL,

    form VARCHAR(100) NULL,

    size DECIMAL(10,3) NULL,

    unit VARCHAR(30) NULL,

    product_type VARCHAR(50) NOT NULL DEFAULT 'Drug',

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    is_consumable TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_drugs_product_type (product_type),

    INDEX idx_drugs_created_by (created_by),

    INDEX idx_drugs_deleted_by (deleted_by)

) ENGINE = InnoDB;
