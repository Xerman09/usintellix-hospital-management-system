-- Seed: what an e-visit may be raised about, and the visit category it records (Phase M15a)
-- Subsystem: Patient Portal / Encounters. Four rows in portal_evisit_reasons mapping a
-- patient-facing complaint to the questionnaire that asks about it, plus the
-- visit_categories row every e-visit encounter is filed under.
--
-- The visit category matters more than it looks. A clinician's reply creates a real
-- encounter through EncounterService, which is what keeps the note, any orders and any
-- billing on the normal path rather than in a parallel telehealth record. That encounter
-- has to be identifiable afterwards as something that happened without the patient being
-- in the building -- for audit, for billing, and for anybody reading the chart later and
-- wondering why there are no observations recorded. Hence a category of its own rather
-- than reusing a clinic one.
--
-- Each reason is an explicit decision about what is safe to handle without examining
-- somebody, which is why they are rows rather than a list in code. All four are
-- deliberately narrow:
--
--   a cough or cold          self-limiting, and the questions that matter are answerable
--   waterworks               the classic remote-manageable case, with pregnancy and
--                            kidney involvement screened out as red flags
--   a medicine question      no examination would change the answer
--   something else           the general form, for the patient who does not fit the
--                            three above and should not be forced to pick wrongly
--
-- `not_for_text` is shown before the patient starts typing, so somebody with the wrong
-- problem stops early rather than filling in a history nobody will read.
--
-- NEEDS CLINICAL SIGN-OFF, together with seed 079. portal_allow_evisits ships OFF
-- (schema 340), so these rows landing does not make the feature live.
--
-- Idempotency: the visit category goes in with INSERT ... SELECT ... WHERE NOT EXISTS
-- on name; the reasons with INSERT ... SELECT ... WHERE NOT EXISTS on code, which also
-- carries a UNIQUE key. Re-running changes nothing and leaves wording the hospital has
-- since edited alone.

SET NAMES utf8mb4;

-- ------------------------------------------------- the visit category for encounters
INSERT INTO `visit_categories` (`name`, `description`, `created_at`)
SELECT 'e-Visit (online, no examination)',
       'Raised by the patient through My Chart and answered in writing by a clinician. The patient was not examined, so there are no observations for this encounter.',
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM `visit_categories` WHERE `name` = 'e-Visit (online, no examination)');

-- ----------------------------------------------------------------- the reasons
INSERT INTO `portal_evisit_reasons`
    (`code`, `patient_label`, `patient_blurb`, `questionnaire_id`, `not_for_text`, `is_patient_visible`, `sequence`, `created_at`)
SELECT 'respiratory',
       'A cough, a cold or a sore throat',
       'Answer some questions about it and a doctor or nurse will reply in writing.',
       q.id,
       'Not for this: trouble breathing, chest pain, coughing up blood, or a throat so swollen you cannot swallow. Those need to be seen in person, today.',
       1, 10, NOW()
FROM `portal_questionnaires` q
WHERE q.code = 'evisit_respiratory'
  AND NOT EXISTS (SELECT 1 FROM `portal_evisit_reasons` r WHERE r.code = 'respiratory');

INSERT INTO `portal_evisit_reasons`
    (`code`, `patient_label`, `patient_blurb`, `questionnaire_id`, `not_for_text`, `is_patient_visible`, `sequence`, `created_at`)
SELECT 'urinary',
       'Burning or stinging when you pass water',
       'Answer some questions and a doctor or nurse will reply in writing.',
       q.id,
       'Not for this: pain in your back or side with shivering, being unable to pass water at all, or if you are or might be pregnant. Those need to be seen in person.',
       1, 20, NOW()
FROM `portal_questionnaires` q
WHERE q.code = 'evisit_urinary'
  AND NOT EXISTS (SELECT 1 FROM `portal_evisit_reasons` r WHERE r.code = 'urinary');

INSERT INTO `portal_evisit_reasons`
    (`code`, `patient_label`, `patient_blurb`, `questionnaire_id`, `not_for_text`, `is_patient_visible`, `sequence`, `created_at`)
SELECT 'medicine',
       'A question about one of your medicines',
       'Whether to keep taking it, a side effect, or whether it is safe with something else.',
       q.id,
       'Not for this: a swollen face or lips, a spreading rash, or if you have taken much more than you were meant to. Those need advice today.',
       1, 30, NOW()
FROM `portal_questionnaires` q
WHERE q.code = 'evisit_medicine'
  AND NOT EXISTS (SELECT 1 FROM `portal_evisit_reasons` r WHERE r.code = 'medicine');

INSERT INTO `portal_evisit_reasons`
    (`code`, `patient_label`, `patient_blurb`, `questionnaire_id`, `not_for_text`, `is_patient_visible`, `sequence`, `created_at`)
SELECT 'other',
       'Something else',
       'Tell us in your own words and a doctor or nurse will read it.',
       q.id,
       'Not for anything urgent, and not for a new pain in your chest or tummy, a problem in pregnancy, or a baby under two. Those need to be seen.',
       1, 90, NOW()
FROM `portal_questionnaires` q
WHERE q.code = 'evisit_general'
  AND NOT EXISTS (SELECT 1 FROM `portal_evisit_reasons` r WHERE r.code = 'other');
