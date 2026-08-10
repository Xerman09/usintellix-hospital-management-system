-- =============================================
-- Table: encounter_billing_codes
-- Billing codes (CPT4, ICD10, etc.) attached to a visit. Values are
-- captured as a snapshot at the time they're attached (code_type, code,
-- description, fee copied from the codes catalog) rather than referencing
-- it by foreign key, so a claim's billed codes don't silently change if
-- the catalog entry is edited or removed later. Rows are replaced
-- wholesale on every save (delete-then-reinsert), same as encounter_issues.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_billing_codes (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    code_type VARCHAR(30) NOT NULL,

    code VARCHAR(30) NOT NULL,

    description VARCHAR(255) NULL,

    fee DECIMAL(10,2) NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_billing_codes_encounter (encounter_id),

    CONSTRAINT fk_encounter_billing_codes_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
