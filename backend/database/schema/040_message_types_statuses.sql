-- =============================================
-- Tables: message_types, message_statuses
-- Admin-managed catalogs for classifying messages (mirrors the
-- allergies catalog pattern) + the columns on `messages` that
-- reference them.
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

ALTER TABLE messages

ADD COLUMN type_id INT NULL AFTER conversation_id,

ADD COLUMN status_id INT NULL AFTER type_id,

ADD COLUMN patient_id INT NULL AFTER status_id,

ADD CONSTRAINT fk_messages_type
    FOREIGN KEY (type_id)
    REFERENCES message_types(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,

ADD CONSTRAINT fk_messages_status
    FOREIGN KEY (status_id)
    REFERENCES message_statuses(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,

ADD CONSTRAINT fk_messages_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,

ADD INDEX idx_messages_type (type_id),

ADD INDEX idx_messages_status (status_id),

ADD INDEX idx_messages_patient (patient_id);
