-- =============================================
-- Table: care_plan_reason_codes
-- Catalog of reason codes selectable when documenting or
-- updating a patient's care plan (e.g. why an item was
-- added, discontinued, or its goal changed).
-- =============================================

CREATE TABLE IF NOT EXISTS care_plan_reason_codes (

    id INT NOT NULL AUTO_INCREMENT,

    code VARCHAR(50) NOT NULL,

    description VARCHAR(255) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_care_plan_reason_codes_code
        UNIQUE (code),

    INDEX idx_care_plan_reason_codes_created_by (created_by),

    INDEX idx_care_plan_reason_codes_updated_by (updated_by),

    INDEX idx_care_plan_reason_codes_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
