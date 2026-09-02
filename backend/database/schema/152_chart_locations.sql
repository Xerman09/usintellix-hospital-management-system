-- =============================================
-- Table: chart_locations
-- Chart Tracker: a log of where a patient's chart has been checked
-- in to (e.g. "File Room", an exam room). One row per check-in; the
-- most recent row per patient is their current chart location. A
-- patient with no rows is assumed to be at the default "File Room".
-- =============================================

CREATE TABLE IF NOT EXISTS chart_locations (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    destination VARCHAR(255) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_chart_locations_patient (patient_id),

    INDEX idx_chart_locations_created_by (created_by),

    CONSTRAINT fk_chart_locations_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
