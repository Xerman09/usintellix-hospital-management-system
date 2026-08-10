-- =============================================
-- Table: encounter_vitals
-- One row per encounter. Stored in metric (cm/kg); dual-unit display
-- (in/lb) is a frontend conversion, not a stored column. bmi/bmi_status
-- are computed server-side on save from height_cm/weight_kg.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_vitals (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    height_cm DECIMAL(5,2) NULL,

    weight_kg DECIMAL(5,2) NULL,

    bmi DECIMAL(4,1) NULL,

    bmi_status VARCHAR(30) NULL,

    oxygen_saturation DECIMAL(4,1) NULL,

    oxygen_flow_rate DECIMAL(4,1) NULL,

    inhaled_oxygen_concentration DECIMAL(4,1) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_encounter_vitals_encounter
        UNIQUE (encounter_id),

    INDEX idx_encounter_vitals_created_by (created_by),

    INDEX idx_encounter_vitals_updated_by (updated_by),

    CONSTRAINT fk_encounter_vitals_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
