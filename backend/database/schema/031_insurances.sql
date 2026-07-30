-- =============================================
-- Table: insurances
-- =============================================

CREATE TABLE IF NOT EXISTS insurances (

    id INT NOT NULL AUTO_INCREMENT,

    insurance_id VARCHAR(100) NOT NULL,

    name VARCHAR(255) NOT NULL,

    attention VARCHAR(255) NULL,

    address_line1 VARCHAR(255) NULL,

    address_line2 VARCHAR(255) NULL,

    city VARCHAR(100) NULL,

    state VARCHAR(100) NULL,

    zip VARCHAR(20) NULL,

    country VARCHAR(100) NULL,

    phone VARCHAR(50) NULL,

    payer_id VARCHAR(100) NULL,

    payer_type_id INT NULL,

    x12_partner_id INT NULL,

    cqm_source_of_payment_id INT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_insurances_insurance_id
        UNIQUE (insurance_id),

    INDEX idx_insurances_payer_type (payer_type_id),

    INDEX idx_insurances_x12_partner (x12_partner_id),

    INDEX idx_insurances_cqm_sop (cqm_source_of_payment_id),

    INDEX idx_insurances_created_by (created_by),

    INDEX idx_insurances_updated_by (updated_by),

    INDEX idx_insurances_deleted_by (deleted_by),

    CONSTRAINT fk_insurances_payer_type
        FOREIGN KEY (payer_type_id)
        REFERENCES payer_types(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_insurances_x12_partner
        FOREIGN KEY (x12_partner_id)
        REFERENCES x12_partners(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_insurances_cqm_sop
        FOREIGN KEY (cqm_source_of_payment_id)
        REFERENCES cqm_source_of_payments(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
