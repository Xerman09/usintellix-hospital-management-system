-- Seed: Practice Rules (Clinical Decision Rules default catalog)
-- Seeds the standard set of "Patient Reminder" type rules shown on the
-- real OpenEMR "Rules Configuration" screen (Adult Weight Screening,
-- Cancer Screenings, Diabetes management, etc.) so Plans/Rules
-- Configuration isn't just an empty admin form on a fresh install.
-- Idempotency: each row is guarded by WHERE NOT EXISTS on title, since
-- practice_rules has no unique constraint on title to rely on directly.
-- "Cancer Screening: Colon Cancer Screening" is deliberately NOT
-- inserted here -- it already exists as a real, earlier admin-created
-- row (type 'Passive Alert') and must not be duplicated or altered.

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Adult Weight Screening and Follow-Up', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[{"criteria":"Age Min (Years)","characteristics":"18","requirements":"Required Inclusion"}]',
    '[{"criteria":"Assessment - Adult Weight Screening and Follow-Up","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Adult Weight Screening and Follow-Up"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Adult Weight Screening and Follow-Up');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Assess Penicillin Allergy', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[]',
    '[{"criteria":"Assessment - Penicillin Allergy","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Penicillin Allergy"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Assess Penicillin Allergy');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Cancer Screening: Mammogram', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[{"criteria":"Sex","characteristics":"Female","requirements":"Required Inclusion"},{"criteria":"Age Min (Years)","characteristics":"40","requirements":"Required Inclusion"}]',
    '[{"criteria":"Assessment - Mammogram","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Mammogram"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Cancer Screening: Mammogram');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Cancer Screening: Pap Smear', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[{"criteria":"Sex","characteristics":"Female","requirements":"Required Inclusion"},{"criteria":"Age Min (Years)","characteristics":"21","requirements":"Required Inclusion"}]',
    '[{"criteria":"Assessment - Pap Smear","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 3 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Pap Smear"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Cancer Screening: Pap Smear');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Cancer Screening: Prostate Cancer Screening', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[{"criteria":"Sex","characteristics":"Male","requirements":"Required Inclusion"},{"criteria":"Age Min (Years)","characteristics":"50","requirements":"Required Inclusion"}]',
    '[{"criteria":"Assessment - Prostate Cancer Screening","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Prostate Cancer Screening"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Cancer Screening: Prostate Cancer Screening');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Coumadin Management - INR Monitoring', 'Patient Reminder',
    '{"clinical_warning_val":"1","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Week","patient_warning_val":"1","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Week"}',
    '[]',
    '[{"criteria":"Assessment - Coumadin Management INR Monitoring","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Months","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Coumadin Management INR Monitoring"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Coumadin Management - INR Monitoring');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Data Entry - Social Security Number', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[]',
    '[{"criteria":"Data Entry - Social Security Number","characteristics":"Completed: Yes","requirements":"Required Inclusion"}]',
    '[{"category_title":"Data Entry - Social Security Number"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Data Entry - Social Security Number');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Diabetes: Eye Exam', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[]',
    '[{"criteria":"Assessment - Diabetes Eye Exam","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Diabetes Eye Exam"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Diabetes: Eye Exam');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Diabetes: Foot Exam', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[]',
    '[{"criteria":"Assessment - Diabetes Foot Exam","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Diabetes Foot Exam"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Diabetes: Foot Exam');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Diabetes: Hemoglobin A1C', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[]',
    '[{"criteria":"Assessment - Diabetes Hemoglobin A1C","characteristics":"Completed: Yes | Frequency: >= 2 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Diabetes Hemoglobin A1C"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Diabetes: Hemoglobin A1C');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Diabetes: Urine Microalbumin', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[]',
    '[{"criteria":"Assessment - Diabetes Urine Microalbumin","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Diabetes Urine Microalbumin"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Diabetes: Urine Microalbumin');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Hypertension: Blood Pressure Measurement', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[{"criteria":"Age Min (Years)","characteristics":"18","requirements":"Required Inclusion"}]',
    '[{"criteria":"Assessment - Blood Pressure Measurement","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Assessment - Blood Pressure Measurement"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Hypertension: Blood Pressure Measurement');

INSERT INTO practice_rules (title, type, reminder_intervals, demographics_criteria, clinical_targets, actions_list, created_at)
SELECT 'Influenza Immunization for Patients >= 50 Years Old', 'Patient Reminder',
    '{"clinical_warning_val":"2","clinical_warning_unit":"Week","clinical_past_due_val":"1","clinical_past_due_unit":"Month","patient_warning_val":"2","patient_warning_unit":"Week","patient_past_due_val":"1","patient_past_due_unit":"Month"}',
    '[{"criteria":"Age Min (Years)","characteristics":"50","requirements":"Required Inclusion"}]',
    '[{"criteria":"Immunization - Influenza","characteristics":"Completed: Yes | Frequency: >= 1 | Interval: 1 x Years","requirements":"Required Inclusion"}]',
    '[{"category_title":"Immunization - Influenza"}]',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM practice_rules WHERE title = 'Influenza Immunization for Patients >= 50 Years Old');
