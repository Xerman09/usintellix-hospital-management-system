-- =============================================
-- Tables: reminders, reminder_recipients
-- Dated reminders staff send to one or more colleagues (optionally about
-- a patient), shown on the Messages module's Reminders tab. A reminder
-- has one or more recipients (reminder_recipients); each recipient can
-- mark their own copy completed.
-- =============================================

CREATE TABLE IF NOT EXISTS reminders (

    id INT NOT NULL AUTO_INCREMENT,

    sender_id INT NOT NULL,

    patient_id INT NULL,

    due_date DATE NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'low',

    body VARCHAR(160) NOT NULL,

    require_each_complete TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_reminders_sender (sender_id),

    INDEX idx_reminders_patient (patient_id),

    INDEX idx_reminders_created_by (created_by),

    INDEX idx_reminders_updated_by (updated_by),

    INDEX idx_reminders_deleted_by (deleted_by),

    CONSTRAINT fk_reminders_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_reminders_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS reminder_recipients (

    id INT NOT NULL AUTO_INCREMENT,

    reminder_id INT NOT NULL,

    user_id INT NOT NULL,

    completed_at DATETIME NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_reminder_recipients_reminder_user
        UNIQUE (reminder_id, user_id),

    INDEX idx_reminder_recipients_reminder (reminder_id),

    INDEX idx_reminder_recipients_user (user_id),

    CONSTRAINT fk_reminder_recipients_reminder
        FOREIGN KEY (reminder_id)
        REFERENCES reminders(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_reminder_recipients_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
