-- =============================================
-- Alter: patient_health_concerns
-- Adds a nullable back-link to the SDOH assessment that generated a
-- suggested health concern, so concerns added from the "Add Related
-- Health Concerns" post-save screen can be traced to their source
-- assessment. Nullable because most health concerns are entered directly,
-- unrelated to any SDOH assessment.
-- =============================================

ALTER TABLE patient_health_concerns
    ADD COLUMN sdoh_assessment_id INT NULL AFTER patient_id;

ALTER TABLE patient_health_concerns
    ADD INDEX idx_patient_health_concerns_sdoh_assessment (sdoh_assessment_id);

ALTER TABLE patient_health_concerns
    ADD CONSTRAINT fk_patient_health_concerns_sdoh_assessment
        FOREIGN KEY (sdoh_assessment_id)
        REFERENCES patient_sdoh_assessments(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION;
