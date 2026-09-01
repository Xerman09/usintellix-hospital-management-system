-- Seed: form_definitions
-- Registers the encounter documentation form modules that genuinely
-- exist in this codebase (Care Plan, Vitals, SOAP, etc.) so the Forms
-- Administration screen has real rows to configure. Idempotent via
-- INSERT IGNORE against form_definitions' UNIQUE(name).

INSERT IGNORE INTO form_definitions
    (name, section_type, status, category, access_control, priority, php_extracted, db_installed, created_at)
VALUES
    ('Care Plan', 'care_plan', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Clinical Instructions', 'clinical_instructions', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Clinical Notes', 'clinical_notes', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Functional and Cognitive Status', 'functional_cognitive_status', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Misc Billing Options HCFA', 'misc_billing_options', 'enabled', 'Administrative', 'encounters|coding', 0, 1, 1, NOW()),
    ('New Encounter Form', NULL, 'enabled', 'Administrative', 'patients|appt', 0, 1, 1, NOW()),
    ('Observation', 'observation', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Procedure Order', NULL, 'enabled', 'Orders', 'patients|lab', 0, 1, 1, NOW()),
    ('Review Of Systems', 'review_of_systems', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Review of Systems Checks', 'review_of_systems_checks', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('SOAP', NULL, 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Speech Dictation', 'speech_dictation', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Vitals', 'vitals', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW()),
    ('Visit Summary', 'visit_summary', 'enabled', 'Clinical', 'encounters|notes', 0, 1, 1, NOW());
