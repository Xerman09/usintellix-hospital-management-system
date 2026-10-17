-- =====================================================================
-- Seed 048: Clinic Operating Schedules & Department Timetables
-- Seeds standard outpatient department operating hours and weekly schedules
-- =====================================================================

-- Cardiology (Department ID 4)
INSERT INTO `clinic_operating_schedules` 
(`facility_id`, `department_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`, `break_start_time`, `break_end_time`, `max_daily_capacity`, `allow_walk_ins`, `max_walk_ins`, `is_active`, `notes`, `created_at`) 
VALUES
(2, 4, 'Monday',    '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 32, 1, 8, 1, 'General Cardiology & Echocardiography clinic', NOW()),
(2, 4, 'Tuesday',   '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 32, 1, 8, 1, 'General Cardiology & Arrhythmia reviews', NOW()),
(2, 4, 'Wednesday', '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 32, 1, 8, 1, 'Heart Failure & Hypertension management', NOW()),
(2, 4, 'Thursday',  '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 32, 1, 8, 1, 'Stress Testing & Post-Intervention follow-ups', NOW()),
(2, 4, 'Friday',    '08:00:00', '16:00:00', 30, '12:00:00', '13:00:00', 28, 1, 6, 1, 'Cardiovascular consultations & discharge checkups', NOW()),
(2, 4, 'Saturday',  '08:00:00', '13:00:00', 30, NULL, NULL, 12, 1, 4, 1, 'Weekend Urgent Cardiac Clinic', NOW()),
(2, 4, 'Sunday',    '09:00:00', '13:00:00', 30, NULL, NULL, 0, 0, 0, 0, 'Closed on Sundays - On-call coverage only', NOW())
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`), `start_time` = VALUES(`start_time`), `end_time` = VALUES(`end_time`);

-- Pediatrics (Department ID 5)
INSERT INTO `clinic_operating_schedules` 
(`facility_id`, `department_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`, `break_start_time`, `break_end_time`, `max_daily_capacity`, `allow_walk_ins`, `max_walk_ins`, `is_active`, `notes`, `created_at`) 
VALUES
(2, 5, 'Monday',    '08:30:00', '16:30:00', 20, '12:30:00', '13:30:00', 45, 1, 15, 1, 'Well-baby & Routine immunization clinic', NOW()),
(2, 5, 'Tuesday',   '08:30:00', '16:30:00', 20, '12:30:00', '13:30:00', 45, 1, 15, 1, 'General Pediatrics & Adolescent Medicine', NOW()),
(2, 5, 'Wednesday', '08:30:00', '16:30:00', 20, '12:30:00', '13:30:00', 45, 1, 15, 1, 'Pediatric Allergy & Respiratory clinic', NOW()),
(2, 5, 'Thursday',  '08:30:00', '16:30:00', 20, '12:30:00', '13:30:00', 45, 1, 15, 1, 'Developmental & Behavioral evaluations', NOW()),
(2, 5, 'Friday',    '08:30:00', '16:30:00', 20, '12:30:00', '13:30:00', 40, 1, 12, 1, 'Acute Sick Visits & Follow-ups', NOW()),
(2, 5, 'Saturday',  '09:00:00', '14:00:00', 20, NULL, NULL, 20, 1, 8, 1, 'Weekend Urgent Pediatric Clinic', NOW()),
(2, 5, 'Sunday',    '09:00:00', '13:00:00', 20, NULL, NULL, 0, 0, 0, 0, 'Closed on Sundays', NOW())
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`), `start_time` = VALUES(`start_time`), `end_time` = VALUES(`end_time`);

-- Internal Medicine (Department ID 3)
INSERT INTO `clinic_operating_schedules` 
(`facility_id`, `department_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`, `break_start_time`, `break_end_time`, `max_daily_capacity`, `allow_walk_ins`, `max_walk_ins`, `is_active`, `notes`, `created_at`) 
VALUES
(2, 3, 'Monday',    '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 40, 1, 10, 1, 'Chronic Disease Management & Diabetology', NOW()),
(2, 3, 'Tuesday',   '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 40, 1, 10, 1, 'General Adult Medicine & Preventive care', NOW()),
(2, 3, 'Wednesday', '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 40, 1, 10, 1, 'Nephrology & Rheumatology evaluations', NOW()),
(2, 3, 'Thursday',  '08:00:00', '17:00:00', 30, '12:00:00', '13:00:00', 40, 1, 10, 1, 'Gastroenterology & Hepatology consults', NOW()),
(2, 3, 'Friday',    '08:00:00', '16:30:00', 30, '12:00:00', '13:00:00', 36, 1, 8, 1, 'General Internal Medicine & discharge follow-ups', NOW()),
(2, 3, 'Saturday',  '08:30:00', '13:30:00', 30, NULL, NULL, 15, 1, 5, 1, 'Saturday Adult OPD', NOW()),
(2, 3, 'Sunday',    '09:00:00', '13:00:00', 30, NULL, NULL, 0, 0, 0, 0, 'Closed on Sundays', NOW())
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`), `start_time` = VALUES(`start_time`), `end_time` = VALUES(`end_time`);

-- Obstetrics & Gynecology (Department ID 10)
INSERT INTO `clinic_operating_schedules` 
(`facility_id`, `department_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`, `break_start_time`, `break_end_time`, `max_daily_capacity`, `allow_walk_ins`, `max_walk_ins`, `is_active`, `notes`, `created_at`) 
VALUES
(2, 10, 'Monday',    '08:00:00', '16:30:00', 30, '12:00:00', '13:00:00', 30, 1, 6, 1, 'Antenatal care & High-Risk Pregnancy', NOW()),
(2, 10, 'Tuesday',   '08:00:00', '16:30:00', 30, '12:00:00', '13:00:00', 30, 1, 6, 1, 'General Gynecology & Reproductive Health', NOW()),
(2, 10, 'Wednesday', '08:00:00', '16:30:00', 30, '12:00:00', '13:00:00', 30, 1, 6, 1, 'Ultrasound diagnostics & Fetal Monitoring', NOW()),
(2, 10, 'Thursday',  '08:00:00', '16:30:00', 30, '12:00:00', '13:00:00', 30, 1, 6, 1, 'Antenatal routine visits & Postpartum reviews', NOW()),
(2, 10, 'Friday',    '08:00:00', '15:30:00', 30, '12:00:00', '13:00:00', 25, 1, 5, 1, 'Gynecologic oncology screening & Colposcopy', NOW()),
(2, 10, 'Saturday',  '08:30:00', '12:30:00', 30, NULL, NULL, 10, 1, 2, 1, 'Urgent OB/GYN outpatient evaluations', NOW()),
(2, 10, 'Sunday',    '09:00:00', '13:00:00', 30, NULL, NULL, 0, 0, 0, 0, 'Closed - Labor & Delivery triage active 24/7', NOW())
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`), `start_time` = VALUES(`start_time`), `end_time` = VALUES(`end_time`);

-- Orthopedics & Sports Medicine (Department ID 11)
INSERT INTO `clinic_operating_schedules` 
(`facility_id`, `department_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`, `break_start_time`, `break_end_time`, `max_daily_capacity`, `allow_walk_ins`, `max_walk_ins`, `is_active`, `notes`, `created_at`) 
VALUES
(2, 11, 'Monday',    '08:30:00', '17:00:00', 30, '12:00:00', '13:00:00', 35, 1, 8, 1, 'Joint Reconstruction & Arthroplasty Clinic', NOW()),
(2, 11, 'Tuesday',   '08:30:00', '17:00:00', 30, '12:00:00', '13:00:00', 35, 1, 8, 1, 'Spine & Trauma Rehabilitation', NOW()),
(2, 11, 'Wednesday', '08:30:00', '17:00:00', 30, '12:00:00', '13:00:00', 35, 1, 8, 1, 'Sports Medicine & Arthroscopy consultations', NOW()),
(2, 11, 'Thursday',  '08:30:00', '17:00:00', 30, '12:00:00', '13:00:00', 35, 1, 8, 1, 'Hand, Wrist & Foot/Ankle clinic', NOW()),
(2, 11, 'Friday',    '08:30:00', '15:30:00', 30, '12:00:00', '13:00:00', 25, 1, 5, 1, 'Casting, Splinting & Post-op wound checkups', NOW()),
(2, 11, 'Saturday',  '09:00:00', '13:00:00', 30, NULL, NULL, 0, 0, 0, 0, 'Closed on Saturdays', NOW()),
(2, 11, 'Sunday',    '09:00:00', '13:00:00', 30, NULL, NULL, 0, 0, 0, 0, 'Closed on Sundays', NOW())
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`), `start_time` = VALUES(`start_time`), `end_time` = VALUES(`end_time`);

-- Grant admin capability for clinic schedules to admin role (role_id 1)
INSERT INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`, `created_at`)
VALUES (1, 'admin', 'admin_clinic_schedules', 1, NOW())
ON DUPLICATE KEY UPDATE `is_granted` = 1;
