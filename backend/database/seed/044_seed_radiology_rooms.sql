-- Seed: radiology machines (rad_rooms)
-- The machines the imaging worklist is scheduled on: two X-ray rooms and a portable unit, an ultrasound room and a
-- portable ultrasound, the CT and the MRI -- each with its slot length and working hours (the X-ray room, the
-- portable units and the CT are on call day and night, so their hours are not enforced for STAT scans).
-- Idempotent: INSERT IGNORE on the UNIQUE rad_rooms.name. Hours, slots and machines are edited by the department.

SET NAMES utf8mb4;

INSERT IGNORE INTO rad_rooms (name, modality, location, slot_minutes, open_from, open_to, open_days, around_the_clock, portable, notes, sequence, created_at) VALUES
('X-ray Room 1', 'xray', 'Radiology, ground floor', 10, '00:00:00', '23:59:00', '1234567', 1, 0, 'Open day and night for the ER', 10, NOW()),
('X-ray Room 2', 'xray', 'Radiology, ground floor', 10, '08:00:00', '17:00:00', '12345', 0, 0, 'Clinic and outpatient X-rays', 20, NOW()),
('Portable X-ray Unit', 'xray', 'Taken to the bedside', 15, '00:00:00', '23:59:00', '1234567', 1, 1, 'For patients who cannot leave the ward or the ICU', 30, NOW()),
('Ultrasound Room 1', 'ultrasound', 'Radiology, ground floor', 20, '08:00:00', '17:00:00', '123456', 0, 0, NULL, 40, NOW()),
('Portable Ultrasound', 'ultrasound', 'Taken to the bedside', 20, '00:00:00', '23:59:00', '1234567', 1, 1, 'Bedside scans (FAST, lines, effusions)', 50, NOW()),
('CT Scanner', 'ct', 'Radiology, ground floor', 20, '00:00:00', '23:59:00', '1234567', 1, 0, 'On call day and night', 60, NOW()),
('MRI Scanner', 'mri', 'Radiology, basement', 45, '08:00:00', '18:00:00', '123456', 0, 0, 'Metal check before every scan', 70, NOW());
