-- =============================================
-- Alter: encounter_sections
-- Widens section_type to add 'misc_billing_options', the 5th Encounter
-- Summary section (HCFA-1500 Box 10-23 billing options). Lock/eSign
-- tracking for it rides on the existing encounter_sections /
-- encounter_section_signatures mechanism, same as vitals/care_plan.
-- =============================================

ALTER TABLE encounter_sections
    MODIFY COLUMN section_type ENUM('visit_summary', 'care_plan', 'clinical_instructions', 'vitals', 'misc_billing_options') NOT NULL;
