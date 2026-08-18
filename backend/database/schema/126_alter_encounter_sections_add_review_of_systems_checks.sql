-- =============================================
-- Alter: encounter_sections
-- Adds 'review_of_systems_checks' as the 10th Encounter Summary section
-- (Review of Systems Checks Form), for lock/eSign tracking shared with
-- the other sections.
-- =============================================

ALTER TABLE encounter_sections
    MODIFY COLUMN section_type ENUM(
        'visit_summary', 'care_plan', 'clinical_instructions', 'clinical_notes',
        'vitals', 'misc_billing_options', 'functional_cognitive_status', 'observation',
        'review_of_systems', 'review_of_systems_checks'
    ) NOT NULL;
