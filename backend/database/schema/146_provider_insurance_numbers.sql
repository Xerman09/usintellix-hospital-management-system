-- =============================================
-- Table: provider_insurance_numbers
-- The billing identifier numbers ("Practice Settings > Insurance
-- Numbers") a provider submits on claims: Provider #, Rendering #, and
-- Group #. One row per provider -- until a row exists, the provider is
-- shown as using their default identifiers (their own NPI) rather than
-- a custom override.
-- =============================================

CREATE TABLE IF NOT EXISTS provider_insurance_numbers (

    id INT NOT NULL AUTO_INCREMENT,

    provider_id INT NOT NULL,

    provider_number VARCHAR(50) NULL,

    rendering_number VARCHAR(50) NULL,

    group_number VARCHAR(50) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_provider_insurance_numbers_provider
        UNIQUE (provider_id),

    INDEX idx_provider_insurance_numbers_created_by (created_by),

    INDEX idx_provider_insurance_numbers_updated_by (updated_by),

    INDEX idx_provider_insurance_numbers_deleted_by (deleted_by),

    CONSTRAINT fk_provider_insurance_numbers_provider
        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
