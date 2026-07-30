-- =============================================
-- Table: pos_codes
-- Place of Service codes, used on claims to indicate
-- where a billed service was rendered.
-- =============================================

CREATE TABLE IF NOT EXISTS pos_codes (

    id INT NOT NULL AUTO_INCREMENT,

    code VARCHAR(10) NOT NULL,

    name VARCHAR(255) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_pos_codes_code
        UNIQUE (code),

    INDEX idx_pos_codes_created_by (created_by),

    INDEX idx_pos_codes_updated_by (updated_by),

    INDEX idx_pos_codes_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
