-- =============================================
-- Alter: encounter_sections
-- Adds 'speech_dictation' as the 11th Encounter Summary section
-- (Speech Dictation Form), for lock/eSign tracking shared with the
-- other list-style sections (Care Plan, Clinical Notes, etc.).
-- =============================================

ALTER TABLE encounter_sections
    MODIFY COLUMN section_type ENUM(
        'visit_summary', 'care_plan', 'clinical_instructions', 'clinical_notes',
        'vitals', 'misc_billing_options', 'functional_cognitive_status', 'observation',
        'review_of_systems', 'review_of_systems_checks', 'speech_dictation'
    ) NOT NULL;
