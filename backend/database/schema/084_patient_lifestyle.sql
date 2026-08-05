-- =============================================
-- Table: patient_lifestyle
-- Backs the "Lifestyle" tab: a fixed set of lifestyle items, each with a
-- free-text note and (for most items) a Current/Quit/Never/N-A status.
-- Tobacco carries two extra fields (status dropdown + cigarette pack-years)
-- that stay NULL for every other item.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_lifestyle (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    item_key VARCHAR(30) NOT NULL,

    notes VARCHAR(255) NULL,

    status VARCHAR(20) NULL,

    quit_date VARCHAR(50) NULL,

    tobacco_status VARCHAR(100) NULL,

    cigarette_pack_years VARCHAR(20) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_lifestyle_patient_item
        UNIQUE (patient_id, item_key),

    INDEX idx_patient_lifestyle_patient (patient_id),

    INDEX idx_patient_lifestyle_created_by (created_by),

    INDEX idx_patient_lifestyle_updated_by (updated_by),

    CONSTRAINT fk_patient_lifestyle_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
