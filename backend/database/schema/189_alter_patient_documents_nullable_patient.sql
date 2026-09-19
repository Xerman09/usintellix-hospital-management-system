-- 189_alter_patient_documents_nullable_patient.sql
-- Allow patient_id to be NULL for unassigned / incoming batch document uploads in "New Documents"

ALTER TABLE patient_documents MODIFY patient_id INT NULL;
