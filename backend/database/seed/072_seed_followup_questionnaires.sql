-- Seed 072: follow-up questionnaires (My Chart Phase M13)
-- Subsystem: Patient Portal. The questionnaires a clinician can send a patient between
-- visits: after an operation, after going home from a ward, while a new medicine is
-- settling in, and a plain weekly check on how things are going.
--
-- These are the *unscored* ones. PHQ-9 and GAD-7 are not seeded here: their questions
-- and their scoring bands live in Phq9Service and Gad7Service, which the clinical
-- screens already use, and duplicating the items as JSON would let the two drift apart.
-- PortalQuestionnaireService builds those two from the instrument itself.
--
-- `use_context` is 'followup', which keeps them out of the e-check-in picker (schema 337).
--
-- House rules these questions follow, so the catalogue stays answerable at home:
--   * second person, short sentences, no clinical vocabulary
--   * no medicine names and no doses -- the patient's chart has those, this does not
--   * nothing that reads as a diagnosis or a reassurance ("that is normal")
--   * every question answerable by someone who feels unwell, so almost none are required
--   * anything urgent is a question, not advice: the answer is what brings a clinician
--     in, and the app's own "get help now" wording does the rest
--
-- Idempotency: form_definitions rows go in with INSERT ... SELECT ... WHERE NOT EXISTS
-- (name is unique there); the questions go in with INSERT IGNORE against
-- uq_portal_questionnaire_code. Re-running changes nothing and leaves wording the
-- hospital has since edited alone.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------- registry rows
INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Follow-up questionnaire (after an operation)', 'portal_followup', 'enabled', 'Patient Portal', 'followup_postop', 110, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Follow-up questionnaire (after an operation)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Follow-up questionnaire (after going home from hospital)', 'portal_followup', 'enabled', 'Patient Portal', 'followup_discharge', 120, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Follow-up questionnaire (after going home from hospital)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Follow-up questionnaire (a new medicine)', 'portal_followup', 'enabled', 'Patient Portal', 'followup_medicine', 130, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Follow-up questionnaire (a new medicine)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Follow-up questionnaire (how this week has been)', 'portal_followup', 'enabled', 'Patient Portal', 'followup_weekly', 140, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Follow-up questionnaire (how this week has been)');

-- ---------------------------------------------------------------- the questions
INSERT IGNORE INTO `portal_questionnaires`
    (`form_definition_id`, `code`, `name`, `specialty`, `use_context`, `intro`, `questions`, `is_active`, `created_at`)
VALUES
((SELECT id FROM form_definitions WHERE name = 'Follow-up questionnaire (after an operation)'),
 'followup_postop', 'After your operation', NULL, 'followup',
 'A few questions about how you have been healing. It takes about two minutes, and your answers go to the team who looked after you.',
 '[{"key":"pain","label":"How much pain have you had in the last two days?","type":"choice","options":["None","Mild - I barely notice it","Moderate - it bothers me","Bad - it is hard to do anything"],"required":true},
   {"key":"pain_worse","label":"Is the pain worse than it was a few days ago?","type":"yesno"},
   {"key":"wound","label":"How does the wound look?","type":"choice","options":["Clean and dry","A little red at the edges","Red and spreading","Leaking fluid or pus","Opening up","I cannot see it myself"],"required":true},
   {"key":"fever","label":"Have you had a fever or felt hot and shivery?","type":"yesno","required":true},
   {"key":"eating","label":"How have you been eating and drinking?","type":"choice","options":["Normally","A little less than usual","Much less than usual","I cannot keep anything down"]},
   {"key":"bowels","label":"Have you opened your bowels since you went home?","type":"yesno"},
   {"key":"moving","label":"How much are you able to move about?","type":"choice","options":["As much as before the operation","Around the house","Only to the bathroom","I am staying in bed"]},
   {"key":"medicines_taking","label":"Are you taking the medicines you were sent home with?","type":"choice","options":["Yes, all of them","Most of them","I have stopped some","I did not get them"]},
   {"key":"concerns","label":"Is there anything you are worried about?","type":"textarea"}]', 1, NOW()),

((SELECT id FROM form_definitions WHERE name = 'Follow-up questionnaire (after going home from hospital)'),
 'followup_discharge', 'Since you went home', NULL, 'followup',
 'A few questions about how you have been since you left the ward, so we know whether anything needs looking at before your next visit.',
 '[{"key":"overall","label":"Compared with the day you went home, how are you now?","type":"choice","options":["Better","About the same","Worse"],"required":true},
   {"key":"symptom_back","label":"Has the problem you were admitted for come back?","type":"yesno","required":true},
   {"key":"breathing","label":"Are you more short of breath than when you went home?","type":"yesno"},
   {"key":"fever","label":"Have you had a fever or felt hot and shivery?","type":"yesno"},
   {"key":"weight","label":"Have your legs, ankles or stomach become more swollen?","type":"yesno"},
   {"key":"medicines_clear","label":"Is it clear to you which medicines to take and when?","type":"choice","options":["Yes, it is clear","Mostly, but I have a question","No, I am not sure"],"required":true},
   {"key":"medicines_supply","label":"Do you have enough of your medicines to last until your next visit?","type":"yesno"},
   {"key":"help_at_home","label":"Is someone able to help you at home if you need it?","type":"choice","options":["Yes","Sometimes","No"]},
   {"key":"appointments","label":"Do you know when your next appointment is?","type":"yesno"},
   {"key":"concerns","label":"Is there anything you would like the team to know?","type":"textarea"}]', 1, NOW()),

((SELECT id FROM form_definitions WHERE name = 'Follow-up questionnaire (a new medicine)'),
 'followup_medicine', 'How the new medicine is going', NULL, 'followup',
 'A few questions about the medicine that was started for you. Do not stop anything because of this questionnaire -- tell us here, and the team will come back to you.',
 '[{"key":"taking","label":"Are you taking it the way it was explained to you?","type":"choice","options":["Yes, every day","Most days","Now and then","I have not started","I have stopped"],"required":true},
   {"key":"stopped_why","label":"If you have stopped or missed doses, what got in the way?","type":"textarea"},
   {"key":"side_effects","label":"Have you noticed anything new since you started it?","type":"yesno","required":true},
   {"key":"side_effects_what","label":"If yes, what have you noticed?","type":"textarea"},
   {"key":"rash","label":"Have you had a rash, swelling of the face or lips, or trouble breathing?","type":"yesno","required":true},
   {"key":"helping","label":"Do you feel it is helping with what it was given for?","type":"choice","options":["Yes, clearly","A little","Not yet","It feels worse","I cannot tell"]},
   {"key":"cost","label":"Have you been able to get it each time without difficulty?","type":"choice","options":["Yes","It is hard to afford","It is hard to find","Both"]},
   {"key":"questions","label":"Is there anything about it you would like explained?","type":"textarea"}]', 1, NOW()),

((SELECT id FROM form_definitions WHERE name = 'Follow-up questionnaire (how this week has been)'),
 'followup_weekly', 'How this week has been', NULL, 'followup',
 'A short check-in so your team can see how you are doing between visits. There are no wrong answers.',
 '[{"key":"overall","label":"How have you been this week?","type":"choice","options":["Good","All right","Not good","Bad"],"required":true},
   {"key":"change","label":"Compared with last week, are you:","type":"choice","options":["Better","About the same","Worse"],"required":true},
   {"key":"main_problem","label":"What has been the hardest thing this week?","type":"textarea"},
   {"key":"sleep","label":"How have you been sleeping?","type":"choice","options":["Well","Not very well","Badly"]},
   {"key":"daily","label":"Have you been able to do your usual daily things?","type":"choice","options":["Yes, as usual","With some difficulty","Only a little","Not at all"]},
   {"key":"new_symptom","label":"Has anything new started this week?","type":"yesno"},
   {"key":"new_symptom_what","label":"If yes, what?","type":"textarea"},
   {"key":"readings","label":"Have you been recording readings at home (blood pressure, sugar, weight)?","type":"choice","options":["Yes, regularly","Now and then","No","I was not asked to"]},
   {"key":"concerns","label":"Anything else you would like your team to know?","type":"textarea"}]', 1, NOW());
