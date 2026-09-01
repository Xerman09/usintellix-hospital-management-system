-- =============================================
-- Table: document_categories
-- Hierarchical tree of document categories ("Practice Settings >
-- Document Categories"), used to classify uploaded patient documents.
-- =============================================

CREATE TABLE IF NOT EXISTS document_categories (

    id INT NOT NULL AUTO_INCREMENT,

    parent_id INT NULL,

    name VARCHAR(255) NOT NULL,

    value VARCHAR(100) NULL,

    access_control VARCHAR(150) NULL,

    codes VARCHAR(255) NULL,

    sequence INT NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_document_categories_parent (parent_id),

    INDEX idx_document_categories_created_by (created_by),

    INDEX idx_document_categories_updated_by (updated_by),

    INDEX idx_document_categories_deleted_by (deleted_by),

    CONSTRAINT fk_document_categories_parent
        FOREIGN KEY (parent_id)
        REFERENCES document_categories(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
