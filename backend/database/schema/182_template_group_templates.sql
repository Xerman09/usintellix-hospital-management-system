-- =============================================
-- Table: template_group_templates
-- Which template files (by filename, matching the file-based repository
-- the same way document_template_meta does) belong to a given
-- template_groups row.
-- =============================================

CREATE TABLE IF NOT EXISTS template_group_templates (

    id INT NOT NULL AUTO_INCREMENT,

    template_group_id INT NOT NULL,

    template_filename VARCHAR(255) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_template_group_templates_group_filename
        UNIQUE (template_group_id, template_filename),

    INDEX idx_template_group_templates_group (template_group_id),

    CONSTRAINT fk_template_group_templates_group
        FOREIGN KEY (template_group_id)
        REFERENCES template_groups(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
