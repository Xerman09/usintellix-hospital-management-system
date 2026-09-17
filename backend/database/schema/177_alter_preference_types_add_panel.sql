-- =============================================
-- Alter: preference_types
-- Adds `panel` so the same LOINC-coded catalog table can back more than
-- one dashboard widget (e.g. "Care Experience Preferences" vs "Treatment
-- Intervention Preferences" -- two distinct real LOINC panels under the
-- same broader "Patient Preferences" concept). Existing rows default to
-- care_experience, the panel this table was originally seeded for.
-- =============================================

ALTER TABLE preference_types
    ADD COLUMN panel VARCHAR(30) NOT NULL DEFAULT 'care_experience' AFTER name;
