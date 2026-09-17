-- Seed: treatment intervention preference_types
-- Seeds the real LOINC-coded "Treatment Intervention Preferences" panel
-- (resuscitation/intubation/tube-feeding/etc.) so the patient dashboard's
-- "Treatment Intervention Preferences" widget has real, usable categories
-- out of the box -- panel='treatment_intervention' distinguishes these
-- from the "Care Experience Preferences" panel seeded in
-- 023_seed_preference_types.sql. Idempotent via INSERT IGNORE against the
-- UNIQUE `name` column. LOINC codes here are real (not guessed) --
-- confirmed against the reference screenshot.

INSERT IGNORE INTO preference_types (name, panel, loinc_code, description, answer_options, created_at) VALUES
('Goals, preferences, and priorities for medical treatment [Reported]', 'treatment_intervention', '75773-2', 'Open-ended statement of the patient''s overall treatment goals and priorities.', NULL, NOW()),
('Thoughts on resuscitation (CPR)', 'treatment_intervention', '81329-5', 'Patient''s stated preference on attempting cardiopulmonary resuscitation.', 'Attempt Resuscitation (Full Code)\nDo Not Attempt Resuscitation (DNR)\nUndecided', NOW()),
('Thoughts on intubation', 'treatment_intervention', '81330-3', 'Patient''s stated preference on intubation.', 'Attempt Intubation\nDo Not Intubate (DNI)\nUndecided', NOW()),
('Thoughts on tube feeding', 'treatment_intervention', '81331-1', 'Patient''s stated preference on tube feeding.', 'Accept Tube Feeding\nDecline Tube Feeding\nTime-Limited Trial\nUndecided', NOW()),
('Thoughts on IV fluid and support', 'treatment_intervention', '81332-9', 'Patient''s stated preference on IV fluids and support.', 'Accept IV Fluids and Support\nDecline IV Fluids and Support\nTime-Limited Trial\nUndecided', NOW()),
('Thoughts on antibiotics', 'treatment_intervention', '81333-7', 'Patient''s stated preference on antibiotics.', 'Accept Antibiotics\nDecline Antibiotics\nUndecided', NOW()),
('Patient''s thoughts on cardiopulmonary bypass', 'treatment_intervention', '81336-0', 'Patient''s stated preference on cardiopulmonary bypass.', 'Accept Cardiopulmonary Bypass\nDecline Cardiopulmonary Bypass\nUndecided', NOW()),
('Patient''s thoughts on mechanical ventilation', 'treatment_intervention', '81337-8', 'Patient''s stated preference on mechanical ventilation.', 'Full Ventilation Support\nTime-Limited Trial\nNo Ventilation\nUndecided', NOW()),
('Upon death organ donation consent', 'treatment_intervention', '81376-6', 'Patient''s stated preference on organ donation.', 'Consent to Organ Donation\nDecline Organ Donation\nUndecided', NOW()),
('Patient Healthcare goals', 'treatment_intervention', '81378-2', 'Open-ended statement of the patient''s broader healthcare goals.', NULL, NOW());
