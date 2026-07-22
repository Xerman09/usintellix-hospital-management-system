-- =============================================
-- Migration: 008_update_practice_rules_summary.sql
-- Update practice_rules table to support extended summary sections
-- =============================================

ALTER TABLE practice_rules
ADD COLUMN release_info VARCHAR(255) NULL AFTER date_last_reviewed,
ADD COLUMN reminder_intervals JSON NULL AFTER referential_cds,
ADD COLUMN demographics_criteria JSON NULL AFTER reminder_intervals,
ADD COLUMN clinical_targets JSON NULL AFTER demographics_criteria,
ADD COLUMN actions_list JSON NULL AFTER clinical_targets;

ALTER TABLE practice_rules
MODIFY COLUMN use_patient_race TEXT NULL,
MODIFY COLUMN use_patient_ethnicity TEXT NULL,
MODIFY COLUMN use_patient_language TEXT NULL,
MODIFY COLUMN use_patient_sexual_orientation TEXT NULL,
MODIFY COLUMN use_patient_gender_identity TEXT NULL,
MODIFY COLUMN use_patient_sex TEXT NULL,
MODIFY COLUMN use_patient_dob TEXT NULL,
MODIFY COLUMN use_patient_sdoh TEXT NULL,
MODIFY COLUMN use_patient_health_status_assessments TEXT NULL;
