-- =============================================
-- Table: x12_partners
-- EDI (ANSI X12) trading partners, e.g. clearinghouses / payers
-- exchanged with for claims, eligibility, and remittance transactions.
-- =============================================

CREATE TABLE IF NOT EXISTS x12_partners (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    partner_id VARCHAR(100) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_x12_partners_partner_id
        UNIQUE (partner_id),

    INDEX idx_x12_partners_created_by (created_by),

    INDEX idx_x12_partners_updated_by (updated_by),

    INDEX idx_x12_partners_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
