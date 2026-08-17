-- =============================================
-- Alter: encounter_sections
-- Widens section_type to add two values:
--   - 'clinical_notes': was already referenced by
--     EncounterSectionService::SECTION_TYPES and the Clinical Notes
--     feature, but the enum itself was never widened for it -- any
--     encounter summary load has been silently inserting a corrupt
--     blank-section_type row per load (MySQL coerces an out-of-enum
--     value to '' rather than erroring, since sql_mode here doesn't
--     include STRICT_TRANS_TABLES). This catches that up.
--   - 'functional_cognitive_status': new 6th Encounter Summary section
--     (HCFA-style Functional and Cognitive Status Form).
-- =============================================

ALTER TABLE encounter_sections
    MODIFY COLUMN section_type ENUM(
        'visit_summary', 'care_plan', 'clinical_instructions', 'clinical_notes',
        'vitals', 'misc_billing_options', 'functional_cognitive_status'
    ) NOT NULL;
