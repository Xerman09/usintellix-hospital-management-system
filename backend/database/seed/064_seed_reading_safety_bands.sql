-- Seed: patient-reported reading safety bands
-- Subsystem: Patient Portal / Track My Health (schema 307). One row per kind of
-- reading a patient can enter at home, holding the outer limits past which the
-- reading stops being a portal entry and raises an alert to the care team.
--
-- Idempotency: INSERT IGNORE against uq_reading_safety_band_kind, so re-running
-- changes nothing and never overwrites limits a hospital has since tuned.
--
-- Units match the hospital's own clinical record (encounter_vitals): pounds for
-- weight and degrees Fahrenheit for temperature, so a self-reported number sits
-- beside a staff-recorded one without conversion.
--
-- The thresholds below are the usual "ring your clinic today" limits, not a
-- clinical protocol: a hospital should review them for its own population and
-- adjust them here. Weight and step count have no absolute safe range -- they
-- only mean anything as a change over time -- so they are seeded inactive with
-- no limits, ready for a hospital that wants to set its own.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_reading_safety_bands`
    (`kind`, `value_1_low`, `value_1_high`, `value_2_low`, `value_2_high`, `urgency`, `patient_advice`, `is_active`, `created_at`)
VALUES
('bp', 90, 180, 50, 110, 'urgent',
 'If you also feel unwell — chest pain, breathlessness, a bad headache, weakness or confusion — do not wait for a reply. Go to the emergency department or call for help.', 1, NOW()),
('glucose', 70, 300, NULL, NULL, 'urgent',
 'If you feel shaky, sweaty, confused or very drowsy, treat a low sugar straight away and tell someone with you. If you cannot keep fluids down, go to the emergency department.', 1, NOW()),
('temperature', 95.0, 102.2, NULL, NULL, 'urgent',
 'Rest and take fluids. If you are shivering uncontrollably, confused, or your breathing is fast, go to the emergency department.', 1, NOW()),
('spo2', 92, NULL, NULL, NULL, 'urgent',
 'If you are short of breath at rest, or your lips or fingertips look blue, go to the emergency department now.', 1, NOW()),
('pain', NULL, 8, NULL, NULL, 'urgent',
 'If the pain is new, severe, or comes with chest pain, breathlessness or weakness, go to the emergency department rather than waiting.', 1, NOW()),
('weight', NULL, NULL, NULL, NULL, 'info', NULL, 0, NOW()),
('steps', NULL, NULL, NULL, NULL, 'info', NULL, 0, NOW());
