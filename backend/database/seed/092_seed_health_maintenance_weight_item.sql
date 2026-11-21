-- Seed 092: the thirteenth health maintenance decision (Adult Weight Screening)
-- Subsystem: Patient Portal / My Chart (M14). Records the per-rule decision that seed 074
-- set out to make for every practice rule and made for twelve of the thirteen. Relies on
-- INSERT ... SELECT ... WHERE NOT EXISTS keyed on practice_rule_id for idempotency.
--
-- WHY THIS EXISTS. Seed 074's own header states the principle: "Each row below is
-- therefore an explicit per-rule decision", and it enumerates twelve. There are thirteen
-- seeded practice rules. `Adult Weight Screening and Follow-Up` (rule id 1) has no item
-- row, so for that one rule the decision was never recorded -- it merely did not happen.
--
-- Found on 21 November by tests/test_portal_health_maintenance.php, which asserts
-- `count($items) === $ruleCount`. That assertion had been passing against the live
-- database, where a thirteenth row exists; pointing the suite at a database built from
-- these seed files (docs/TODO.md 3.4) is what made the gap visible. The seed files are
-- what a fresh deployment gets, so the gap was real everywhere except the one database
-- somebody had already fixed by hand.
--
-- IT IS THE RULE WITH THE WIDEST REACH, which is why leaving it unrecorded mattered more
-- than the arithmetic suggests. Rule 1 is typed 'Patient Reminder' and its only
-- demographic criterion is Age Min 18, so PatientReminderService::matchesDemographics()
-- matches every adult patient in the database. Nothing happens today only because
-- practice_rules.is_patient_reminder is 0 for it -- an unset master switch, which is
-- precisely the "reason living in an unset flag" that seed 074 was written to avoid.
--
-- THE DECISION RECORDED HERE IS: NOT SHOWN TO PATIENTS.
--
-- Not because weight screening does not matter to patients, but because the patient-facing
-- wording for it has not been read by a clinician. docs/TODO.md 1.3 already holds M14's
-- item wording open for exactly that review, and of the thirteen topics this is the one
-- where wording written by a developer is most likely to do harm: a reminder about a
-- patient's weight, arriving unasked in their portal, is a different kind of message from
-- a reminder about a mammogram appointment. So the row goes in with
-- is_patient_visible = 0 and the text below is a staff-facing description of the rule,
-- never displayed.
--
-- TO SHOW IT, two things have to happen together and both are somebody else's call:
-- a clinician writes and approves patient_label / what_it_is / why_it_matters /
-- how_to_get_it, and practice_rules.is_patient_reminder is set to 1 for this rule. Either
-- one alone shows nothing. The columns are editable from the desk screen without a
-- deployment.

SET NAMES utf8mb4;

INSERT INTO `portal_health_maintenance_items`
    (`practice_rule_id`, `patient_label`, `what_it_is`, `condition_note`,
     `recurrence_val`, `recurrence_unit`, `grace_days`, `needs_condition`, `is_patient_visible`, `sequence`, `created_at`)
SELECT r.id,
    'Weight and follow-up',
    'A clinician records the patient''s weight and BMI and follows up where indicated.',
    'Wording not yet reviewed by a clinician -- see docs/TODO.md 1.3. Held off deliberately, not awaiting data.',
    1, 'Year', 30, 1, 0, 230, NOW()
FROM `practice_rules` r
WHERE r.deleted_at IS NULL
  AND r.title = 'Adult Weight Screening and Follow-Up'
  AND NOT EXISTS (
      SELECT 1 FROM `portal_health_maintenance_items` i WHERE i.practice_rule_id = r.id
  );
