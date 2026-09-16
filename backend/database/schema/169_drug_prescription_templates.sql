-- =============================================
-- Table: drug_prescription_templates
-- Pre-defined prescription templates for a drug (the "Templates" grid
-- on the Add Drug form -- e.g. "1 tablet BID x 30 days, 2 refills"),
-- offered as a shortcut when later prescribing this drug.
-- =============================================

CREATE TABLE IF NOT EXISTS drug_prescription_templates (

    id INT NOT NULL AUTO_INCREMENT,

    drug_id INT NOT NULL,

    name VARCHAR(150) NULL,

    schedule VARCHAR(100) NULL,

    interval_type VARCHAR(20) NULL,

    basic_units VARCHAR(50) NULL,

    refills INT NOT NULL DEFAULT 0,

    is_standard TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_dpt_drug (drug_id),

    INDEX idx_dpt_created_by (created_by),

    INDEX idx_dpt_deleted_by (deleted_by),

    CONSTRAINT fk_dpt_drug
        FOREIGN KEY (drug_id)
        REFERENCES drugs(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
