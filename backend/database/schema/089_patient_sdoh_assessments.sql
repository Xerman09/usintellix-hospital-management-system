-- =============================================
-- Table: patient_sdoh_assessments
-- Backs the "SDOH Assessment" item under the Patient Chart's Assessments
-- nav: a multi-record, dated assessment history per patient (Hunger Vital
-- Signs, Disability Status, and other Social Determinants of Health
-- domains), each row created/edited/soft-deleted as a whole unit. Replaces
-- the old single-record patient_sdoh_assessment (singular) table.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_sdoh_assessments (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    assessment_date DATE NOT NULL,

    screening_tool_id INT NULL,

    assessor_provider_id INT NULL,

    score INT NOT NULL DEFAULT 0,

    -- Hunger Vital Signs (LOINC 88121-9)

    food_insecurity_status VARCHAR(20) NULL,

    food_insecurity_notes VARCHAR(255) NULL,

    hvs_worried_food VARCHAR(20) NULL,

    hvs_food_didnt_last VARCHAR(20) NULL,

    hunger_score INT NOT NULL DEFAULT 0,

    -- Disability Status (ACS 6-item set)

    disability_overall_status VARCHAR(20) NULL,

    disability_notes VARCHAR(255) NULL,

    disability_walking VARCHAR(10) NULL,

    disability_seeing VARCHAR(10) NULL,

    disability_hearing VARCHAR(10) NULL,

    disability_concentrating VARCHAR(10) NULL,

    disability_dressing_bathing VARCHAR(10) NULL,

    disability_errands VARCHAR(10) NULL,

    -- Housing Instability

    housing_status VARCHAR(10) NULL,

    housing_notes VARCHAR(255) NULL,

    -- Transportation Insecurity

    transportation_status VARCHAR(20) NULL,

    transportation_notes VARCHAR(255) NULL,

    -- Utilities Insecurity

    utilities_status VARCHAR(20) NULL,

    utilities_notes VARCHAR(255) NULL,

    -- Interpersonal Safety

    interpersonal_safety_status VARCHAR(10) NULL,

    interpersonal_safety_notes VARCHAR(255) NULL,

    -- Financial Strain

    financial_strain_status VARCHAR(20) NULL,

    financial_strain_notes VARCHAR(255) NULL,

    -- Social Isolation

    social_isolation_status VARCHAR(10) NULL,

    social_isolation_notes VARCHAR(255) NULL,

    -- Childcare Needs

    childcare_status VARCHAR(10) NULL,

    childcare_notes VARCHAR(255) NULL,

    -- Digital Access

    digital_access_status VARCHAR(10) NULL,

    digital_access_notes VARCHAR(255) NULL,

    -- Social Context

    employment_status VARCHAR(40) NULL,

    education_level VARCHAR(30) NULL,

    caregiver_status VARCHAR(5) NULL,

    veteran_status VARCHAR(5) NULL,

    -- Pregnancy / Postpartum Status

    pregnancy_status VARCHAR(30) NULL,

    estimated_due_date DATE NULL,

    postpartum_status VARCHAR(30) NULL,

    postpartum_end_date DATE NULL,

    pregnancy_intention VARCHAR(30) NULL,

    -- Care Planning

    generated_goals TEXT NULL,

    generated_interventions TEXT NULL,

    additional_interventions TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_sdoh_assessments_patient (patient_id),

    INDEX idx_patient_sdoh_assessments_screening_tool (screening_tool_id),

    INDEX idx_patient_sdoh_assessments_assessor_provider (assessor_provider_id),

    INDEX idx_patient_sdoh_assessments_created_by (created_by),

    INDEX idx_patient_sdoh_assessments_updated_by (updated_by),

    INDEX idx_patient_sdoh_assessments_deleted_by (deleted_by),

    CONSTRAINT fk_patient_sdoh_assessments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_sdoh_assessments_screening_tool
        FOREIGN KEY (screening_tool_id)
        REFERENCES screening_tools(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_sdoh_assessments_assessor_provider
        FOREIGN KEY (assessor_provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
