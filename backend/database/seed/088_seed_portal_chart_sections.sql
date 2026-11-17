-- Seed: the six chart sections a patient can see (Phase M19)
-- Subsystem: Patient Portal / My Chart. One row per list, with the wording the patient
-- reads above it and the wording they read when it is empty.
--
-- ----------------------------------------------------------------------------
-- THE EMPTY TEXT IS NOT BOILERPLATE. IT IS THE POINT OF THIS SEED.
-- ----------------------------------------------------------------------------
--
-- "No allergies recorded" and "no allergies" are different statements, and only one of
-- them is true. A patient who reads an empty allergy list as "I have no allergies" has
-- been actively misled by a screen that was technically correct, and they may repeat it
-- to the next clinician who asks. Every empty_text here says what the absence means --
-- that nothing has been written down, not that nothing exists.
--
-- The same thought runs through the blurbs: each one says what the list is NOT. The
-- medicines list does not know what you buy yourself. The vaccinations list does not know
-- what another clinic gave you. A patient reading a partial record as a complete one is
-- the most likely harm this whole phase can cause, and it is cheap to prevent in words.
--
-- ----------------------------------------------------------------------------
-- WORDING CHOICES WORTH KEEPING
-- ----------------------------------------------------------------------------
--
--   "Conditions", not "Problem list". Being presented with a list of your problems is
--   not how anyone wants to read their own record, and "problem" is staff vocabulary.
--
--   The allergies blurb says what the list is FOR -- it is checked when you are
--   prescribed medicine -- because that is what makes a patient bother to correct it.
--
--   The implants blurb mentions scans. It is the one practical reason a patient might
--   need to recall an implant at short notice, and a prompt is more use than a label.
--
-- NEEDS CLINICAL SIGN-OFF before the chart is switched on anywhere real. This is
-- patient-facing clinical wording written by a developer; it reads sensibly, and that is
-- not the same as being right. It is stored as data so a clinician can edit it from the
-- desk screen without a deployment.
--
-- Idempotency: INSERT IGNORE against uq_portal_chart_section (section_code), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_chart_sections`
    (`section_code`, `label`, `blurb`, `empty_text`, `is_enabled`, `allow_corrections`, `sequence`, `created_at`)
VALUES

('allergies', 'Allergies and reactions',
 'Things the hospital has recorded that you react to. This list is checked whenever you are prescribed medicine here, so it is worth telling us if anything is wrong or missing.',
 'Nothing has been written down here. That is not the same as having no allergies — if you react to anything, please tell your clinic so it can be recorded.',
 1, 1, 10, NOW()),

('conditions', 'Conditions',
 'Conditions recorded on your record, current and past. It is a summary of what has been written down here, not your full medical history.',
 'No conditions have been written down here. That does not mean there are none — it means none have been recorded on this record.',
 1, 1, 20, NOW()),

('medications', 'Medicines on your record',
 'Medicines the hospital has recorded you as taking. It may not include anything you buy for yourself, or anything prescribed somewhere else.',
 'No medicines have been written down here. If you take anything regularly, including things you buy yourself, please tell your clinic.',
 1, 1, 30, NOW()),

('procedures', 'Operations and procedures',
 'Operations and procedures recorded on your record. Anything done at another hospital may not appear.',
 'No operations or procedures have been written down here.',
 1, 1, 40, NOW()),

('devices', 'Implants and devices',
 'Implants and devices recorded on your record. Worth checking before a scan, and worth telling us about anything that is missing.',
 'No implants or devices have been written down here.',
 1, 1, 50, NOW()),

('immunizations', 'Vaccinations',
 'Vaccinations given here, with the date each was given. Vaccinations you had at another clinic will not appear unless someone has added them.',
 'No vaccinations have been written down here. Ones given elsewhere will not appear unless they have been added to this record.',
 1, 1, 60, NOW());
