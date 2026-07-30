-- =============================================
-- Tables: message_types, message_statuses
-- Admin-managed catalogs for classifying messages (mirrors the
-- allergies catalog pattern). The `messages` table itself (with its
-- type_id/status_id/patient_id columns) is created afterwards, in
-- 051_conversations_messages.sql.
-- =============================================

CREATE TABLE IF NOT EXISTS message_types (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_message_types_name
        UNIQUE (name),

    INDEX idx_message_types_created_by (created_by),

    INDEX idx_message_types_updated_by (updated_by),

    INDEX idx_message_types_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS message_statuses (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_message_statuses_name
        UNIQUE (name),

    INDEX idx_message_statuses_created_by (created_by),

    INDEX idx_message_statuses_updated_by (updated_by),

    INDEX idx_message_statuses_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
