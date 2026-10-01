-- =============================================
-- Alter: encounter_sections
-- Adds 'gad7' as the 12th Encounter Summary section
-- (GAD-7 Form), for lock/eSign tracking shared with other sections.
-- =============================================

ALTER TABLE encounter_sections
    MODIFY COLUMN section_type ENUM(
        'visit_summary', 'care_plan', 'clinical_instructions', 'clinical_notes',
        'vitals', 'misc_billing_options', 'functional_cognitive_status', 'observation',
        'review_of_systems', 'review_of_systems_checks', 'speech_dictation', 'gad7'
    ) NOT NULL;
