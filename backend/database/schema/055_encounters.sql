-- =============================================
-- Table: encounters
-- A patient visit record ("New Encounter" in OpenEMR terms): who saw the
-- patient, where, when, and why -- distinct from an appointment (a
-- scheduled future slot) in that this records what actually happened.
-- =============================================

CREATE TABLE IF NOT EXISTS encounters (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    visit_category_id INT NULL,

    class_id INT NULL,

    visit_type_id INT NULL,

    sensitivity VARCHAR(20) NULL DEFAULT 'normal',

    encounter_provider_id INT NULL,

    referring_provider_id INT NULL,

    facility_id INT NULL,

    billing_facility_id INT NULL,

    date_of_service DATETIME NOT NULL,

    onset_date DATE NULL,

    in_collection TINYINT(1) NOT NULL DEFAULT 0,

    discharge_disposition_id INT NULL,

    reason_for_visit TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounters_patient (patient_id),

    INDEX idx_encounters_visit_category (visit_category_id),

    INDEX idx_encounters_class (class_id),

    INDEX idx_encounters_visit_type (visit_type_id),

    INDEX idx_encounters_encounter_provider (encounter_provider_id),

    INDEX idx_encounters_referring_provider (referring_provider_id),

    INDEX idx_encounters_facility (facility_id),

    INDEX idx_encounters_billing_facility (billing_facility_id),

    INDEX idx_encounters_discharge_disposition (discharge_disposition_id),

    INDEX idx_encounters_created_by (created_by),

    INDEX idx_encounters_updated_by (updated_by),

    INDEX idx_encounters_deleted_by (deleted_by),

    CONSTRAINT fk_encounters_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_visit_category
        FOREIGN KEY (visit_category_id)
        REFERENCES visit_categories(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_class
        FOREIGN KEY (class_id)
        REFERENCES classes(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_visit_type
        FOREIGN KEY (visit_type_id)
        REFERENCES visit_types(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_encounter_provider
        FOREIGN KEY (encounter_provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_referring_provider
        FOREIGN KEY (referring_provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_billing_facility
        FOREIGN KEY (billing_facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounters_discharge_disposition
        FOREIGN KEY (discharge_disposition_id)
        REFERENCES discharge_dispositions(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
