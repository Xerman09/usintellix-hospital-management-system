-- =============================================
-- Alter: encounter_sections
-- Adds 'review_of_systems' as the 9th Encounter Summary section
-- (Review Of Systems Form), for lock/eSign tracking shared with the
-- other sections.
-- =============================================

ALTER TABLE encounter_sections
    MODIFY COLUMN section_type ENUM(
        'visit_summary', 'care_plan', 'clinical_instructions', 'clinical_notes',
        'vitals', 'misc_billing_options', 'functional_cognitive_status', 'observation',
        'review_of_systems'
    ) NOT NULL;
