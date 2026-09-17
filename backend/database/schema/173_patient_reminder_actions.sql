-- =============================================
-- Table: patient_reminder_actions
-- The action-log half of OpenEMR-style Clinical Reminders that
-- patient_reminders never had: staff can log that a due/past-due item
-- was actually addressed (a screening done, a vaccine given, etc.), on
-- what date, whether it was completed, and free-text details -- building
-- a per-reminder, per-patient history. patient_reminders itself stays
-- the separate, existing "is this objectively due" computation (see
-- PatientReminderService::process()); this table never touches
-- due_status, it just records what staff did about it.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_reminder_actions (

    id INT NOT NULL AUTO_INCREMENT,

    patient_reminder_id INT NOT NULL,

    action_date DATETIME NOT NULL,

    completed ENUM('yes', 'no') NOT NULL DEFAULT 'yes',

    details TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_reminder_actions_reminder (patient_reminder_id),

    INDEX idx_patient_reminder_actions_created_by (created_by),

    INDEX idx_patient_reminder_actions_deleted_by (deleted_by),

    CONSTRAINT fk_patient_reminder_actions_reminder
        FOREIGN KEY (patient_reminder_id)
        REFERENCES patient_reminders(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
