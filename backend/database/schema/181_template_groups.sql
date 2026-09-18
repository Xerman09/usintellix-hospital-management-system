-- =============================================
-- Table: template_groups
-- A named, reusable bundle of document templates (e.g. "New Patient
-- Intake Packet" = 3 templates assigned together in one action) -- the
-- "Groups" button on the Template Maintenance screen.
-- =============================================

CREATE TABLE IF NOT EXISTS template_groups (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_template_groups_name
        UNIQUE (name),

    INDEX idx_template_groups_created_by (created_by),

    INDEX idx_template_groups_updated_by (updated_by),

    INDEX idx_template_groups_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
