-- =============================================
-- Table: encounter_misc_billing_options
-- One row per encounter -- the HCFA-1500 "Miscellaneous Billing Options"
-- form (Boxes 10A-10D, 14-18, 20, 22-23, plus X12-only claim fields).
-- author_name is snapshotted from the creating user's employee record
-- at first save and left unchanged on later edits, same treatment as
-- encounter_care_plan_items.author_name.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_misc_billing_options (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NULL,

    employment_related ENUM('yes', 'no') NULL,
    auto_accident ENUM('yes', 'no') NULL,
    auto_accident_state VARCHAR(2) NULL,
    other_accident ENUM('yes', 'no') NULL,
    claim_codes VARCHAR(255) NULL,
    epsdt TINYINT(1) NOT NULL DEFAULT 0,

    onset_date DATE NULL,
    onset_date_qualifier VARCHAR(60) NULL,
    other_date DATE NULL,
    other_date_qualifier VARCHAR(60) NULL,

    unable_to_work_from DATE NULL,
    unable_to_work_to DATE NULL,

    provider_id INT NULL,
    provider_qualifier VARCHAR(60) NULL,

    hospitalization_from DATE NULL,
    hospitalization_to DATE NULL,

    outside_lab ENUM('yes', 'no') NULL,
    outside_lab_charges DECIMAL(10,2) NULL,

    resubmission_code VARCHAR(20) NULL,
    medicaid_original_ref_no VARCHAR(50) NULL,

    prior_authorization_no VARCHAR(50) NULL,

    x12_replacement_claim TINYINT(1) NOT NULL DEFAULT 0,
    x12_claim_frequency ENUM('void', 'new') NOT NULL DEFAULT 'new',
    x12_icn_resubmission_no VARCHAR(50) NULL,

    additional_notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_encounter_misc_billing_options_encounter
        UNIQUE (encounter_id),

    INDEX idx_encounter_misc_billing_options_provider (provider_id),

    INDEX idx_encounter_misc_billing_options_created_by (created_by),

    INDEX idx_encounter_misc_billing_options_updated_by (updated_by),

    CONSTRAINT fk_encounter_misc_billing_options_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounter_misc_billing_options_provider
        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
