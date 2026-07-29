-- =============================================
-- Tables: conversations, conversation_participants, messages
-- Internal hospital messaging: a conversation groups participants,
-- messages belong to a conversation and can optionally be classified
-- (type/status, via message_types/message_statuses) and linked to the
-- patient they're about.
-- =============================================

CREATE TABLE IF NOT EXISTS conversations (

    id INT NOT NULL AUTO_INCREMENT,

    subject VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_conversations_created_by (created_by),

    INDEX idx_conversations_updated_by (updated_by),

    INDEX idx_conversations_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS conversation_participants (

    id INT NOT NULL AUTO_INCREMENT,

    conversation_id INT NOT NULL,

    user_id INT NOT NULL,

    last_read_at DATETIME NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_conversation_participants_conversation_user
        UNIQUE (conversation_id, user_id),

    INDEX idx_conversation_participants_conversation (conversation_id),

    INDEX idx_conversation_participants_user (user_id),

    CONSTRAINT fk_conversation_participants_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_conversation_participants_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS messages (

    id INT NOT NULL AUTO_INCREMENT,

    conversation_id INT NOT NULL,

    sender_id INT NOT NULL,

    type_id INT NULL,

    status_id INT NULL,

    patient_id INT NULL,

    body TEXT NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_messages_conversation (conversation_id),

    INDEX idx_messages_sender (sender_id),

    INDEX idx_messages_type (type_id),

    INDEX idx_messages_status (status_id),

    INDEX idx_messages_patient (patient_id),

    INDEX idx_messages_created_by (created_by),

    INDEX idx_messages_updated_by (updated_by),

    INDEX idx_messages_deleted_by (deleted_by),

    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_messages_type
        FOREIGN KEY (type_id)
        REFERENCES message_types(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_messages_status
        FOREIGN KEY (status_id)
        REFERENCES message_statuses(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_messages_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
