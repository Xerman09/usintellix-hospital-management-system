-- Seed: Codes catalog (ICD10) from icd10_diagnoses
-- Populates the generic `codes` table (used by the app-wide Code Picker,
-- including the Care Plan Form's Code field) with ICD10 Diagnosis rows
-- copied from the existing `icd10_diagnoses` catalog, which the picker
-- does not read from directly. Idempotent via a NOT EXISTS guard on
-- (code_type, code, modifier) since `codes` has that as a UNIQUE key
-- but modifier is stored as '' here (NULL would defeat the uniqueness
-- check on re-run).

INSERT INTO codes (code_type, code, modifier, description, short_description, category, active, created_at)
SELECT
    'ICD10',
    src.code,
    '',
    src.description,
    LEFT(src.description, 100),
    'Unassigned',
    1,
    NOW()
FROM icd10_diagnoses src
WHERE src.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM codes c
    WHERE c.code_type = 'ICD10' AND c.code = src.code AND c.modifier = ''
);
