-- Seed: e-visit questionnaires and their red-flag screening (Phase M15a)
-- Subsystem: Patient Portal. Four questionnaires a patient can answer to raise an
-- asynchronous e-visit, registered in form_definitions and stored in
-- portal_questionnaires with use_context = 'evisit'.
--
-- THE RED-FLAG BLOCK IS THE SAFETY-CRITICAL PART OF THIS FILE.
--
-- Every questionnaire opens with the same six screening questions, in the same order,
-- before anything about the actual complaint. Each carries a `red_flag` object:
--
--   "red_flag": {"when": ["Yes"], "because": "<what the patient is told>"}
--
-- `when` lists the answers that trip it. A tripped flag does not warn and continue --
-- PortalEvisitService refuses the submission, marks it 'refused', keeps it out of every
-- clinician queue, and tells the patient to go now and not to wait for a reply. See the
-- header of schema 340 for why a refused case is still recorded.
--
-- The `red_flag` key is additive. M5's e-check-in and M13's follow-up questionnaires
-- have no such key and are unaffected; nothing reads it except the e-visit path.
--
-- Why these six: they are the presentations where a delay of hours changes the outcome
-- and where no questionnaire answer can make remote handling safe -- cardiac chest pain,
-- respiratory failure, stroke, uncontrolled bleeding, altered consciousness, and
-- suicidal ideation. They are asked first so that somebody with one of them stops before
-- typing out a history nobody will read.
--
-- NEEDS CLINICAL SIGN-OFF. A clinician must confirm both the red-flag list and the
-- complaint questions before portal_allow_evisits is switched on. It ships defaulted to
-- OFF (schema 340) precisely so that this seed landing does not put the feature live.
--
-- Deliberately not seeded: anything about pregnancy, children under 2, or chest/abdominal
-- pain as a complaint in its own right. Those need examining, and offering a form for
-- them would imply otherwise.
--
-- Idempotency: form_definitions rows go in with INSERT ... SELECT ... WHERE NOT EXISTS
-- (name is unique there); the questionnaires go in with INSERT IGNORE against
-- uq_portal_questionnaire_code. Re-running changes nothing and leaves wording the
-- hospital has since edited alone.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------- registry rows
INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'e-Visit questionnaire (general)', 'portal_evisit', 'enabled', 'Patient Portal', 'evisit_general', 210, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'e-Visit questionnaire (general)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'e-Visit questionnaire (cough, cold or sore throat)', 'portal_evisit', 'enabled', 'Patient Portal', 'evisit_respiratory', 220, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'e-Visit questionnaire (cough, cold or sore throat)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'e-Visit questionnaire (waterworks)', 'portal_evisit', 'enabled', 'Patient Portal', 'evisit_urinary', 230, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'e-Visit questionnaire (waterworks)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'e-Visit questionnaire (a question about a medicine)', 'portal_evisit', 'enabled', 'Patient Portal', 'evisit_medicine', 240, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'e-Visit questionnaire (a question about a medicine)');

-- ------------------------------------------------------------------- general
INSERT IGNORE INTO `portal_questionnaires`
    (`form_definition_id`, `code`, `name`, `specialty`, `use_context`, `intro`, `questions`, `is_active`, `created_at`)
SELECT fd.id, 'evisit_general', 'Tell us what is wrong', NULL, 'evisit',
'First a few safety questions, then tell us about the problem in your own words. A doctor or nurse will read it and reply. This is not for anything urgent.',
'[
  {"key":"rf_chest","label":"Do you have chest pain, pressure or tightness right now?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Chest pain or pressure needs to be looked at straight away, in person."}},
  {"key":"rf_breathing","label":"Are you struggling to breathe, or too breathless to finish a sentence?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Trouble breathing needs to be looked at straight away, in person."}},
  {"key":"rf_stroke","label":"Has your face drooped, or have you suddenly become weak, numb on one side, or unable to speak properly?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"These can be signs of a stroke, where every minute counts."}},
  {"key":"rf_bleeding","label":"Are you bleeding heavily, or bleeding that will not stop?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Bleeding that will not stop needs to be treated now."}},
  {"key":"rf_collapse","label":"Have you passed out, or are you confused or very drowsy?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Passing out or new confusion needs to be looked at straight away."}},
  {"key":"rf_self_harm","label":"Are you having thoughts of harming yourself?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Please speak to somebody now rather than waiting for a message back."}},
  {"key":"problem","label":"What is the problem? Tell us in your own words.","type":"text","required":true},
  {"key":"how_long","label":"How long has this been going on?","type":"choice","required":true,
   "options":["Today","Two or three days","About a week","Two to four weeks","Longer than a month"]},
  {"key":"getting_worse","label":"Is it getting worse?","type":"yesno","required":true},
  {"key":"tried","label":"Have you tried anything for it so far?","type":"text"},
  {"key":"fever","label":"Have you had a fever, or felt hot and shivery?","type":"yesno","required":true},
  {"key":"other_conditions","label":"Is there anything else going on that we should know about?","type":"text"}
]',
1, NOW()
FROM `form_definitions` fd WHERE fd.name = 'e-Visit questionnaire (general)';

-- -------------------------------------------------------------- respiratory
INSERT IGNORE INTO `portal_questionnaires`
    (`form_definition_id`, `code`, `name`, `specialty`, `use_context`, `intro`, `questions`, `is_active`, `created_at`)
SELECT fd.id, 'evisit_respiratory', 'A cough, a cold or a sore throat', NULL, 'evisit',
'First a few safety questions, then some questions about the cough or cold. A doctor or nurse will read it and reply.',
'[
  {"key":"rf_chest","label":"Do you have chest pain, pressure or tightness right now?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Chest pain or pressure needs to be looked at straight away, in person."}},
  {"key":"rf_breathing","label":"Are you struggling to breathe, or too breathless to finish a sentence?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Trouble breathing needs to be looked at straight away, in person."}},
  {"key":"rf_stroke","label":"Has your face drooped, or have you suddenly become weak, numb on one side, or unable to speak properly?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"These can be signs of a stroke, where every minute counts."}},
  {"key":"rf_bleeding","label":"Are you coughing up blood?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Coughing up blood needs to be looked at in person."}},
  {"key":"rf_collapse","label":"Have you passed out, or are you confused or very drowsy?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Passing out or new confusion needs to be looked at straight away."}},
  {"key":"rf_swallow","label":"Are you unable to swallow your own saliva, or is your voice muffled and your neck swollen?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"A throat that is closing up needs to be seen immediately."}},
  {"key":"how_long","label":"How long have you had it?","type":"choice","required":true,
   "options":["Today","Two or three days","About a week","Two to three weeks","Longer than three weeks"]},
  {"key":"symptoms","label":"Which of these do you have?","type":"text","required":true},
  {"key":"cough_type","label":"If you have a cough, what is it like?","type":"choice",
   "options":["No cough","Dry","Bringing up clear or white phlegm","Bringing up yellow or green phlegm"]},
  {"key":"fever","label":"Have you had a fever, or felt hot and shivery?","type":"yesno","required":true},
  {"key":"breathless_walking","label":"Are you more breathless than usual when walking about?","type":"yesno","required":true},
  {"key":"asthma","label":"Do you have asthma, or any long-term chest problem?","type":"yesno","required":true},
  {"key":"tried","label":"Have you taken anything for it?","type":"text"}
]',
1, NOW()
FROM `form_definitions` fd WHERE fd.name = 'e-Visit questionnaire (cough, cold or sore throat)';

-- ------------------------------------------------------------------ urinary
INSERT IGNORE INTO `portal_questionnaires`
    (`form_definition_id`, `code`, `name`, `specialty`, `use_context`, `intro`, `questions`, `is_active`, `created_at`)
SELECT fd.id, 'evisit_urinary', 'Problems passing water', NULL, 'evisit',
'First a few safety questions, then some questions about your waterworks. A doctor or nurse will read it and reply.',
'[
  {"key":"rf_chest","label":"Do you have chest pain, pressure or tightness right now?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Chest pain or pressure needs to be looked at straight away, in person."}},
  {"key":"rf_breathing","label":"Are you struggling to breathe, or too breathless to finish a sentence?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Trouble breathing needs to be looked at straight away, in person."}},
  {"key":"rf_collapse","label":"Have you passed out, or are you confused or very drowsy?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Passing out or new confusion needs to be looked at straight away."}},
  {"key":"rf_flank","label":"Do you have pain in your back or side, with shivering or shaking?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Pain in the back or side with shivering can mean the infection has reached a kidney, which needs treating in person."}},
  {"key":"rf_no_urine","label":"Have you been unable to pass any water at all?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Not being able to pass water at all needs to be dealt with today, in person."}},
  {"key":"rf_pregnant","label":"Are you pregnant, or might you be?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"A water infection in pregnancy is treated differently and needs to be seen."}},
  {"key":"how_long","label":"How long has it been going on?","type":"choice","required":true,
   "options":["Today","Two or three days","About a week","Longer than a week"]},
  {"key":"burning","label":"Does it burn or sting when you pass water?","type":"yesno","required":true},
  {"key":"frequency","label":"Are you going more often than usual?","type":"yesno","required":true},
  {"key":"blood","label":"Have you seen any blood in your water?","type":"yesno","required":true},
  {"key":"fever","label":"Have you had a fever, or felt hot and shivery?","type":"yesno","required":true},
  {"key":"before","label":"Have you had this before?","type":"choice",
   "options":["Never","Once or twice","Several times","It keeps coming back"]},
  {"key":"other","label":"Anything else you want to tell us?","type":"text"}
]',
1, NOW()
FROM `form_definitions` fd WHERE fd.name = 'e-Visit questionnaire (waterworks)';

-- ----------------------------------------------------------------- medicine
-- A question about a medicine is the safest e-visit there is: no examination
-- would change the answer. The red-flag block is shorter for that reason, and
-- keeps only what would change the handling.
INSERT IGNORE INTO `portal_questionnaires`
    (`form_definition_id`, `code`, `name`, `specialty`, `use_context`, `intro`, `questions`, `is_active`, `created_at`)
SELECT fd.id, 'evisit_medicine', 'A question about one of your medicines', NULL, 'evisit',
'Ask about a medicine you have been prescribed. A doctor, nurse or pharmacist will read it and reply. Do not stop taking anything while you wait unless you have been told to.',
'[
  {"key":"rf_reaction","label":"Do you have a swollen face, lips or tongue, a spreading rash, or trouble breathing?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"That can be a serious reaction to a medicine and needs to be treated now."}},
  {"key":"rf_collapse","label":"Have you passed out, or are you confused or very drowsy?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Passing out or new confusion needs to be looked at straight away."}},
  {"key":"rf_overdose","label":"Have you taken much more of it than you were meant to?","type":"yesno","required":true,
   "red_flag":{"when":["Yes"],"because":"Taking too much of a medicine needs advice today, not tomorrow."}},
  {"key":"medicine","label":"Which medicine is it?","type":"text","required":true},
  {"key":"question_type","label":"What would you like to know?","type":"choice","required":true,
   "options":["Whether to keep taking it","A side effect I think it is causing","Whether it is safe with something else I take","How or when to take it","Whether I still need it","Something else"]},
  {"key":"question","label":"Tell us a bit more.","type":"text","required":true},
  {"key":"still_taking","label":"Are you still taking it?","type":"yesno","required":true},
  {"key":"how_long_taking","label":"How long have you been on it?","type":"choice",
   "options":["Just started","A few weeks","A few months","A year or more","I am not sure"]}
]',
1, NOW()
FROM `form_definitions` fd WHERE fd.name = 'e-Visit questionnaire (a question about a medicine)';
