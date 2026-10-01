-- =============================================
-- Alter: encounter_gad7
-- Adds 'author_name' to record provider/author details for encounter summary display.
-- =============================================

ALTER TABLE encounter_gad7 ADD COLUMN author_name VARCHAR(255) NULL AFTER patient_id;
