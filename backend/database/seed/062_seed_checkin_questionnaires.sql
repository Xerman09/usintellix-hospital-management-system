-- Seed 062: e-check-in questionnaires
-- Subsystem: Patient Portal (My Chart Phase 5). The questions a patient answers at home
-- before a visit: one general questionnaire used for any appointment, plus one for each
-- of the common specialties, chosen by the department of the doctor being seen.
--
-- NOTE ON THE NUMBER: the plan called this seed 061, but 061 was already taken by
-- 061_seed_result_question_message_type.sql in Phase 2, so it is 062.
--
-- Idempotency: each questionnaire is registered in `form_definitions` with
-- INSERT ... SELECT ... WHERE NOT EXISTS (name is unique there), and the questions go in
-- with INSERT IGNORE against uq_portal_questionnaire_code. Re-running changes nothing and
-- leaves wording the hospital has since edited alone.
--
-- `questions` is a JSON list of {key, label, type, options?, required?}; types are
-- text, textarea, yesno, choice and checkboxes.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------- registry rows
INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Pre-visit questionnaire (general)', 'portal_checkin', 'enabled', 'Patient Portal', 'checkin_general', 10, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Pre-visit questionnaire (general)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Pre-visit questionnaire (internal medicine)', 'portal_checkin', 'enabled', 'Patient Portal', 'checkin_internal', 20, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Pre-visit questionnaire (internal medicine)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Pre-visit questionnaire (paediatrics)', 'portal_checkin', 'enabled', 'Patient Portal', 'checkin_paeds', 30, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Pre-visit questionnaire (paediatrics)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Pre-visit questionnaire (obstetrics and gynaecology)', 'portal_checkin', 'enabled', 'Patient Portal', 'checkin_obgyn', 40, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Pre-visit questionnaire (obstetrics and gynaecology)');

INSERT INTO `form_definitions` (`name`, `section_type`, `status`, `category`, `nickname`, `priority`, `php_extracted`, `created_at`)
SELECT 'Pre-visit questionnaire (surgery)', 'portal_checkin', 'enabled', 'Patient Portal', 'checkin_surgery', 50, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `form_definitions` WHERE `name` = 'Pre-visit questionnaire (surgery)');

-- ---------------------------------------------------------------- the questions
INSERT IGNORE INTO `portal_questionnaires` (`form_definition_id`, `code`, `name`, `specialty`, `intro`, `questions`, `is_active`, `created_at`)
VALUES
((SELECT id FROM form_definitions WHERE name = 'Pre-visit questionnaire (general)'),
 'general', 'Before your visit', NULL,
 'A few questions so your doctor can prepare. Answer what you can -- you can always add more when you arrive.',
 '[{"key":"reason","label":"What would you like to talk about at this visit?","type":"textarea","required":true},
   {"key":"symptom_days","label":"How long have you had this problem?","type":"choice","options":["Less than a week","1 to 4 weeks","1 to 6 months","More than 6 months","Not applicable"]},
   {"key":"medicines_changed","label":"Has anything about your medicines changed since your last visit?","type":"yesno"},
   {"key":"medicines_detail","label":"If yes, what changed?","type":"text"},
   {"key":"allergy_new","label":"Have you had any new allergy or reaction?","type":"yesno"},
   {"key":"other_care","label":"Have you seen another doctor or been in hospital since your last visit?","type":"yesno"},
   {"key":"concerns","label":"Is there anything else you would like the doctor to know?","type":"textarea"}]', 1, NOW()),

((SELECT id FROM form_definitions WHERE name = 'Pre-visit questionnaire (internal medicine)'),
 'internal', 'Before your visit', 'Internal Medicine',
 'A few questions about your long-term health, so your doctor can prepare.',
 '[{"key":"reason","label":"What would you like to talk about at this visit?","type":"textarea","required":true},
   {"key":"conditions","label":"Which of these apply to you?","type":"checkboxes","options":["High blood pressure","Diabetes","Asthma","Heart problem","Kidney problem","Thyroid problem","None of these"]},
   {"key":"bp_home","label":"Do you measure your blood pressure or blood sugar at home?","type":"yesno"},
   {"key":"bp_readings","label":"If yes, what have the readings been lately?","type":"text"},
   {"key":"medicines_taken","label":"Are you taking all your medicines as prescribed?","type":"choice","options":["Yes, all of them","Most of them","I have stopped some","I am not taking them"]},
   {"key":"smoking","label":"Do you smoke?","type":"choice","options":["Never","I stopped","Yes"]},
   {"key":"concerns","label":"Anything else the doctor should know?","type":"textarea"}]', 1, NOW()),

((SELECT id FROM form_definitions WHERE name = 'Pre-visit questionnaire (paediatrics)'),
 'paediatrics', 'Before your child''s visit', 'Pediatrics',
 'A few questions about your child, so the doctor can prepare.',
 '[{"key":"reason","label":"What would you like the doctor to look at?","type":"textarea","required":true},
   {"key":"fever","label":"Has your child had a fever in the last three days?","type":"yesno"},
   {"key":"eating","label":"How has your child been eating and drinking?","type":"choice","options":["Normally","A little less","Much less","Refusing"]},
   {"key":"vaccines","label":"Are your child''s vaccinations up to date?","type":"choice","options":["Yes","No","I am not sure"]},
   {"key":"school","label":"Has your child missed school or day care because of this?","type":"yesno"},
   {"key":"concerns","label":"Anything else you would like to mention?","type":"textarea"}]', 1, NOW()),

((SELECT id FROM form_definitions WHERE name = 'Pre-visit questionnaire (obstetrics and gynaecology)'),
 'obgyn', 'Before your visit', 'Obstetrics and Gynecology',
 'A few questions before your appointment. Everything you write is private and goes only to your care team.',
 '[{"key":"reason","label":"What would you like to talk about at this visit?","type":"textarea","required":true},
   {"key":"pregnant","label":"Could you be pregnant?","type":"choice","options":["No","Yes","I am not sure","Currently pregnant"]},
   {"key":"last_period","label":"When did your last period start?","type":"text"},
   {"key":"bleeding","label":"Have you had any unusual bleeding?","type":"yesno"},
   {"key":"contraception","label":"Are you using any contraception at the moment?","type":"yesno"},
   {"key":"concerns","label":"Anything else the doctor should know?","type":"textarea"}]', 1, NOW()),

((SELECT id FROM form_definitions WHERE name = 'Pre-visit questionnaire (surgery)'),
 'surgery', 'Before your surgical visit', 'Surgery',
 'A few questions before your appointment, so the surgeon can plan safely.',
 '[{"key":"reason","label":"What would you like the surgeon to look at?","type":"textarea","required":true},
   {"key":"previous_surgery","label":"Have you had an operation before?","type":"yesno"},
   {"key":"previous_detail","label":"If yes, what and roughly when?","type":"text"},
   {"key":"blood_thinners","label":"Do you take aspirin or any blood thinner?","type":"yesno"},
   {"key":"anaesthetic_problem","label":"Have you or a close relative ever had a problem with anaesthesia?","type":"yesno"},
   {"key":"fasting_understood","label":"Do you understand you may need to stop eating before a procedure?","type":"yesno"},
   {"key":"concerns","label":"Anything else the team should know?","type":"textarea"}]', 1, NOW());
