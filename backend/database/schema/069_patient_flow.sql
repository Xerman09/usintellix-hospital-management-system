-- =============================================
-- Table: patient_flow
-- Tracks a checked-in patient's progress through today's
-- visit (waiting -> roomed -> with provider -> checked out).
-- One row per checked-in appointment; created on check-in,
-- never on scheduling.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_flow (

    id INT NOT NULL AUTO_INCREMENT,

    appointment_id INT NOT NULL,

    patient_id INT NOT NULL,

    provider_id INT NOT NULL,

    facility_id INT NULL,

    room_id INT NULL,

    stage ENUM('waiting', 'roomed', 'with_provider', 'checked_out') NOT NULL DEFAULT 'waiting',

    checked_in_at DATETIME NULL,

    roomed_at DATETIME NULL,

    provider_at DATETIME NULL,

    checked_out_at DATETIME NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_flow_appointment (appointment_id),

    INDEX idx_patient_flow_patient (patient_id),

    INDEX idx_patient_flow_provider (provider_id),

    INDEX idx_patient_flow_facility (facility_id),

    INDEX idx_patient_flow_room (room_id),

    INDEX idx_patient_flow_created_by (created_by),

    INDEX idx_patient_flow_updated_by (updated_by),

    INDEX idx_patient_flow_deleted_by (deleted_by),

    CONSTRAINT fk_patient_flow_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_flow_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_flow_provider
        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_flow_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_flow_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
