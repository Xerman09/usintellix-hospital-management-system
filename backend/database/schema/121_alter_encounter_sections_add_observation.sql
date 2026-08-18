-- =============================================
-- Alter: encounter_sections
-- Adds 'observation' as the 8th Encounter Summary section (Observation
-- Form), for lock/eSign tracking shared with the other sections.
-- =============================================

ALTER TABLE encounter_sections
    MODIFY COLUMN section_type ENUM(
        'visit_summary', 'care_plan', 'clinical_instructions', 'clinical_notes',
        'vitals', 'misc_billing_options', 'functional_cognitive_status', 'observation'
    ) NOT NULL;
