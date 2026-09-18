-- =============================================
-- Table: document_template_meta
-- The Document Templates repository (see DocumentTemplateService) stores
-- template files directly on disk with no DB row of its own -- this
-- table is a thin metadata layer over that flat file store, keyed by
-- filename, so a template can be tagged with a category without
-- restructuring the existing file-based repository.
-- =============================================

CREATE TABLE IF NOT EXISTS document_template_meta (

    id INT NOT NULL AUTO_INCREMENT,

    template_filename VARCHAR(255) NOT NULL,

    category_id INT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_document_template_meta_filename
        UNIQUE (template_filename),

    INDEX idx_document_template_meta_category (category_id),

    CONSTRAINT fk_document_template_meta_category
        FOREIGN KEY (category_id)
        REFERENCES template_categories(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
