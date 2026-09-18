-- =============================================
-- Table: template_categories
-- Taxonomy for organizing document templates (e.g. "Consent Forms",
-- "Referral Letters") -- the "Category" picker on the Template
-- Maintenance screen. Independent of any one template file; a template
-- is tagged with a category via document_template_meta.
-- =============================================

CREATE TABLE IF NOT EXISTS template_categories (

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

    CONSTRAINT uq_template_categories_name
        UNIQUE (name),

    INDEX idx_template_categories_created_by (created_by),

    INDEX idx_template_categories_updated_by (updated_by),

    INDEX idx_template_categories_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
