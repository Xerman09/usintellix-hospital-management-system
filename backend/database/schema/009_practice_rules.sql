-- =============================================
-- Table: practice_rules
-- =============================================

CREATE TABLE IF NOT EXISTS practice_rules (
    id INT NOT NULL AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type ENUM('Active Alert', 'Passive Alert', 'Patient Reminder') NOT NULL DEFAULT 'Active Alert',
    bibliographic_citation TEXT NULL,
    developer VARCHAR(255) NULL,
    funding_source VARCHAR(255) NULL,
    date_last_reviewed DATE NULL,
    web_reference TEXT NULL,
    referential_cds TEXT NULL,
    use_patient_race TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_ethnicity TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_language TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_sexual_orientation TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_gender_identity TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_sex TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_dob TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_sdoh TINYINT(1) NOT NULL DEFAULT 0,
    use_patient_health_status_assessments TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,
    PRIMARY KEY (id),
    INDEX idx_practice_rules_tenant (tenant_id),
    INDEX idx_practice_rules_created_by (created_by),
    INDEX idx_practice_rules_updated_by (updated_by),
    INDEX idx_practice_rules_deleted_by (deleted_by),
    CONSTRAINT fk_practice_rules_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
