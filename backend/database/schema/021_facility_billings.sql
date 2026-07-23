-- =============================================
-- Table: facility_billings
-- =============================================

CREATE TABLE IF NOT EXISTS facility_billings (

    id INT NOT NULL AUTO_INCREMENT,

    facility_id INT NOT NULL,

    billing_code VARCHAR(100) NULL,

    description VARCHAR(255) NULL,

    rate DECIMAL(10,2) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_facility_billings_code
        UNIQUE (billing_code),

    INDEX idx_facility_billings_facility (facility_id),

    INDEX idx_facility_billings_created_by (created_by),

    INDEX idx_facility_billings_updated_by (updated_by),

    INDEX idx_facility_billings_deleted_by (deleted_by),

    CONSTRAINT fk_facility_billings_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
