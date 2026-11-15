-- Seed 074: patient-facing health maintenance items (My Chart Phase M14)
-- Subsystem: Patient Portal. For each seeded practice rule, the patient's wording for
-- it, how often it comes round, and whether it is fit to show a patient at all.
--
-- WHY EVERY RULE NEEDS A DECISION HERE, not a blanket switch:
-- PatientReminderService::matchesDemographics([]) returns true when a rule has no
-- demographic criteria, and seven of the thirteen seeded rules have none. So in this
-- database every patient already carries reminders for four diabetes items, Coumadin INR
-- monitoring, a penicillin allergy assessment and a social security number. Showing a
-- patient "your reminders" would tell a healthy twenty-year-old to book a diabetic eye
-- exam. Each row below is therefore an explicit per-rule decision, and the ones that are
-- not safe to show are recorded as rows with is_patient_visible = 0 and needs_condition
-- set, so the reason is written down instead of living in an unset flag.
--
-- SHOWN (age and sex alone really do decide who needs these):
--   Mammogram, Pap smear, Prostate screening, Blood pressure check, Influenza vaccine
--
-- RECORDED BUT NOT SHOWN, because the rule only applies to patients who have the
-- condition and the engine does not check that:
--   Diabetes eye exam, foot exam, HbA1c, urine microalbumin, Coumadin INR monitoring
--
-- RECORDED BUT NOT SHOWN, because they are not the patient's business to chase:
--   Penicillin allergy assessment (a clinician's assessment), Social security number
--   (administrative data entry -- this one must never reach a patient)
--
-- ONE ITEM IS SHOWN BUT WILL STAY SILENT: colon cancer screening. Its rule is typed
-- 'Passive Alert' rather than 'Patient Reminder', so PatientReminderService never creates
-- patient_reminders rows for it and this item simply never has anything to report. It is
-- seeded ready, so that changing the rule's type is all that is needed.
--
-- THE INTERVALS ARE THE HOSPITAL'S TO SET. Those below are the common ones (annual
-- mammogram from 40, three-yearly cervical cytology, annual blood pressure, annual
-- influenza, ten-yearly colonoscopy). Guidelines differ by country and by body, and
-- nothing in this file should be read as this system recommending a schedule -- the
-- recurrence is a column precisely so a clinician can change it.
--
-- WHAT THE WORDING AVOIDS: it never says a patient has a condition or is at risk, never
-- quotes a statistic, and never implies the screening is a diagnosis. Each item says what
-- the test is, why it is offered, and how to arrange it, in the second person.
--
-- This seed also sets practice_rules.is_patient_reminder = 1 on the five shown rules.
-- That flag is the hospital's master switch (schema 148) and ships off for everything;
-- an item is shown only when both it and is_patient_visible are on, so without this
-- update the panel stays empty.
--
-- Idempotency: each item goes in with INSERT ... SELECT ... WHERE NOT EXISTS keyed on
-- practice_rule_id (unique), matching the rule by title. A rule that is not present is
-- skipped rather than failing. Re-running changes nothing and leaves wording the hospital
-- has since edited alone. The flag update is naturally idempotent.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------- shown to patients
INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `why_it_matters`, `how_to_get_it`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id,
    'Breast screening (mammogram)',
    'An X-ray picture of each breast. It takes a few minutes and is done by a radiographer.',
    'It can find a change too small to feel, when there is most that can be done about it.',
    'Ask for it at your next visit, or ask us here to arrange it and the clinic will contact you with a time.',
    1, 'Year', 30, 0, 1, 10, NOW()
FROM `practice_rules` r
WHERE r.title = 'Cancer Screening: Mammogram' AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `why_it_matters`, `how_to_get_it`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id,
    'Cervical screening (Pap smear)',
    'A small sample is taken from the neck of the womb during a short examination.',
    'It looks for changes in the cells before they would ever cause symptoms.',
    'Ask for it at your next visit, or ask us here to arrange it and the clinic will contact you with a time.',
    3, 'Year', 90, 0, 1, 20, NOW()
FROM `practice_rules` r
WHERE r.title = 'Cancer Screening: Pap Smear' AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `why_it_matters`, `how_to_get_it`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id,
    'Prostate check',
    'A conversation with your doctor about whether to test, usually with a blood test and sometimes an examination.',
    'Whether to have it is a decision to make with your doctor, and that conversation is the point of this reminder.',
    'Bring it up at your next visit, or ask us here to arrange an appointment to talk it through.',
    1, 'Year', 30, 0, 1, 30, NOW()
FROM `practice_rules` r
WHERE r.title = 'Cancer Screening: Prostate Cancer Screening' AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `why_it_matters`, `how_to_get_it`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id,
    'Blood pressure check',
    'A cuff on your arm for about a minute. Nothing is needed beforehand.',
    'High blood pressure has no symptoms, so the only way to know is to measure it.',
    'Any visit will do, and the desk can usually fit it in without an appointment.',
    1, 'Year', 60, 0, 1, 40, NOW()
FROM `practice_rules` r
WHERE r.title = 'Hypertension: Blood Pressure Measurement' AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `why_it_matters`, `how_to_get_it`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id,
    'Flu vaccination',
    'One injection in the upper arm.',
    'The vaccine changes each year to match the strains going round, which is why it is offered again every year.',
    'Ask at the desk during flu season, or ask us here and the clinic will tell you when it is available.',
    1, 'Year', 30, 0, 1, 50, NOW()
FROM `practice_rules` r
WHERE r.title = 'Influenza Immunization for Patients >= 50 Years Old' AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

-- Seeded ready, but its rule is a Passive Alert so no reminder rows exist for it yet.
INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `why_it_matters`, `how_to_get_it`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id,
    'Bowel screening',
    'Either a sample you collect at home, or a camera test done at the hospital. Your doctor will explain which suits you.',
    'It can find growths before they turn into anything, and remove them during the same test.',
    'Ask at your next visit which test is right for you, or ask us here to arrange it.',
    10, 'Year', 180, 0, 1, 60, NOW()
FROM `practice_rules` r
WHERE r.title = 'Cancer Screening: Colon Cancer Screening' AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

-- ---------------------------------------------------------------- recorded, not shown
-- These five depend on the patient having the condition. The rules carry no demographic
-- criteria, so the engine matches every patient; needs_condition is what stops the panel
-- telling a healthy person to book a diabetic eye exam. Wiring a real condition check
-- (patient_medical_problems, coded diagnoses) is its own piece of work -- when it exists,
-- these rows already carry the wording.
INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `why_it_matters`, `how_to_get_it`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `condition_note`,
     `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id, x.label, x.what, x.why, x.how, x.val, x.unit, x.grace, 1, x.cond, 0, x.seq, NOW()
FROM `practice_rules` r
JOIN (
    SELECT 'Diabetes: Eye Exam' AS title, 'Diabetic eye check' AS label,
        'Drops to widen the pupil, then photographs of the back of each eye.' AS what,
        'Changes at the back of the eye can be treated before they affect your sight.' AS why,
        'Ask your diabetes team to arrange it.' AS how,
        1 AS val, 'Year' AS unit, 60 AS grace, 'diabetes' AS cond, 110 AS seq
    UNION ALL SELECT 'Diabetes: Foot Exam', 'Diabetic foot check',
        'Someone looks at and feels your feet, and checks the sensation in them.',
        'Reduced feeling means a small injury can go unnoticed, so it is checked for you.',
        'Ask your diabetes team to arrange it.', 1, 'Year', 60, 'diabetes', 120
    UNION ALL SELECT 'Diabetes: Hemoglobin A1C', 'HbA1c blood test',
        'A blood test that shows the average of your blood sugar over the past few months.',
        'It shows how things have been going overall, which a single reading cannot.',
        'Ask your diabetes team to arrange it.', 3, 'Month', 30, 'diabetes', 130
    UNION ALL SELECT 'Diabetes: Urine Microalbumin', 'Urine protein test',
        'A urine sample, usually the first one of the day.',
        'It is an early check on how the kidneys are coping.',
        'Ask your diabetes team to arrange it.', 1, 'Year', 60, 'diabetes', 140
    UNION ALL SELECT 'Coumadin Management - INR Monitoring', 'INR blood test',
        'A blood test that shows how quickly your blood is clotting.',
        'The dose of your blood-thinning medicine is set from this result.',
        'Your anticoagulation clinic arranges these.', 1, 'Month', 7, 'taking warfarin or another coumarin', 150
) x ON x.title = r.title
WHERE r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

-- These two are staff work, not the patient's. The social security number row exists only
-- so nobody later mistakes its absence for an oversight and switches it on.
INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `condition_note`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id, x.label, x.what, x.cond, 1, 'Year', 30, 1, 0, x.seq, NOW()
FROM `practice_rules` r
JOIN (
    SELECT 'Assess Penicillin Allergy' AS title, 'Penicillin allergy assessment' AS label,
        'A clinician reviews whether a recorded penicillin allergy is a true allergy.' AS what,
        'Clinician task, not a patient action' AS cond, 210 AS seq
    UNION ALL SELECT 'Data Entry - Social Security Number', 'Social security number on file',
        'An administrative record check.',
        'Administrative -- must never be shown to a patient as something they are due', 220
) x ON x.title = r.title
WHERE r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id);

-- ---------------------------------------------------------------- the master switch
-- Turning these five on for patients is a clinical decision, made here for exactly the
-- rules whose demographic criteria really do decide who needs them. Every other rule is
-- left as it ships, off.
UPDATE `practice_rules`
SET `is_patient_reminder` = 1
WHERE `deleted_at` IS NULL
  AND `title` IN (
    'Cancer Screening: Mammogram',
    'Cancer Screening: Pap Smear',
    'Cancer Screening: Prostate Cancer Screening',
    'Hypertension: Blood Pressure Measurement',
    'Influenza Immunization for Patients >= 50 Years Old'
  );
