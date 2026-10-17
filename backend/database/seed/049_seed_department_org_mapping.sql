-- =====================================================================
-- Seed 049: Visual Department Organizational Mapping & Clinical Roster
-- Populates Department Chairs (Heads of Department), Wards Mapping,
-- and Multi-disciplinary Medical Staff Rosters.
-- =====================================================================

-- 1. Ensure all active departments are linked to Main Hospital Facility (ID 2)
UPDATE `departments` SET `facility_id` = 2 WHERE `facility_id` IS NULL;

-- 2. Link Inpatient Wards to their parent Clinical Departments
UPDATE `hospital_wards` SET `department_id` = 7 WHERE `ward_code` = 'ICU';
UPDATE `hospital_wards` SET `department_id` = 6 WHERE `ward_code` = 'SURG-W';
UPDATE `hospital_wards` SET `department_id` = 3 WHERE `ward_code` = 'MED-W';
UPDATE `hospital_wards` SET `department_id` = 5 WHERE `ward_code` = 'PED-W';
UPDATE `hospital_wards` SET `department_id` = 2 WHERE `ward_code` = 'ISOL';

-- 3. Create Doctor & Clinical Specialist Users for Department Heads
-- Role ID 3 is 'doctor', Role ID 4 is 'nurse', Role ID 10 is 'charge_nurse'
INSERT INTO `users` (`id`, `username`, `password`, `role_id`, `status`, `created_at`) VALUES
(201, 'dr.vance', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(202, 'dr.rostova', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(203, 'dr.hayes', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(204, 'dr.sterling', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(205, 'dr.lin', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(206, 'dr.weiss', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(207, 'dr.miller', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(208, 'dr.nolan', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
-- Clinical Staff Nurses & Doctors
(209, 'dr.morales', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 3, 'active', NOW()),
(210, 'nurse.santos', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 10, 'active', NOW()),
(211, 'nurse.reyes', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 4, 'active', NOW()),
(212, 'nurse.dizon', '$2y$10$wN9a3x3RjE3N8wS1v8j4seO7U6yA6E9aF1sF7x6fV7bO8qG4e9p7C', 4, 'active', NOW())
ON DUPLICATE KEY UPDATE `status` = 'active';

-- 4. Create Employee Profiles for Department Heads & Clinical Staff
INSERT INTO `employees` 
(`id`, `user_id`, `employee_no`, `first_name`, `last_name`, `suffix`, `sex`, `birthdate`, `email`, `phone`, `department_id`, `secondary_department_id`, `duty_tag`, `assignment_notes`, `created_at`) 
VALUES
(101, 201, 'EMP-DOC-001', 'Marcus', 'Vance', 'MD, FACC', 'male', '1975-04-12', 'dr.vance@usintellix.org', '+1-555-0191', 4, NULL, 'primary', 'Chief of Cardiovascular Medicine & Interventional Cardiology', NOW()),
(102, 202, 'EMP-DOC-002', 'Elena', 'Rostova', 'MD, FAAP', 'female', '1980-08-23', 'dr.rostova@usintellix.org', '+1-555-0192', 5, NULL, 'primary', 'Chair of Pediatrics & Neonatal Intensive Care', NOW()),
(103, 203, 'EMP-DOC-003', 'Jonathan', 'Hayes', 'MD, FACP', 'male', '1972-11-05', 'dr.hayes@usintellix.org', '+1-555-0193', 3, NULL, 'primary', 'Director of Internal Medicine & Adult Subspecialties', NOW()),
(104, 204, 'EMP-DOC-004', 'Arthur', 'Sterling', 'MD, FACS', 'male', '1968-02-18', 'dr.sterling@usintellix.org', '+1-555-0194', 6, NULL, 'primary', 'Chief of General & Minimally Invasive Surgery', NOW()),
(105, 205, 'EMP-DOC-005', 'Sarah', 'Lin', 'MD, FACEP', 'female', '1982-06-30', 'dr.lin@usintellix.org', '+1-555-0195', 2, NULL, 'primary', 'Medical Director of Emergency Medicine & Trauma', NOW()),
(106, 206, 'EMP-DOC-006', 'Rachel', 'Weiss', 'MD, FACOG', 'female', '1979-09-14', 'dr.weiss@usintellix.org', '+1-555-0196', 10, NULL, 'primary', 'Chair of Obstetrics, Gynecology & Maternal-Fetal Medicine', NOW()),
(107, 207, 'EMP-DOC-007', 'David', 'Miller', 'MD, FAAOS', 'male', '1976-03-27', 'dr.miller@usintellix.org', '+1-555-0197', 11, NULL, 'primary', 'Chief of Orthopedic Surgery & Sports Rehabilitation', NOW()),
(108, 208, 'EMP-DOC-008', 'Christopher', 'Nolan', 'MD, FCCM', 'male', '1974-12-09', 'dr.nolan@usintellix.org', '+1-555-0198', 7, 3, 'primary', 'Director of Critical Care Medicine & Intensivist Team', NOW()),
-- Additional Attending Doctor & Nurses
(109, 209, 'EMP-DOC-009', 'Sofia', 'Morales', 'MD', 'female', '1988-07-19', 'dr.morales@usintellix.org', '+1-555-0199', 4, 2, 'on_call', 'Attending Cardiologist, Inpatient Consults & On-Call ER', NOW()),
(110, 210, 'EMP-NUR-001', 'Maria', 'Santos', 'RN, CCRN', 'female', '1985-05-15', 'm.santos@usintellix.org', '+1-555-0201', 7, NULL, 'primary', 'Charge Nurse - Intensive Care Unit', NOW()),
(111, 211, 'EMP-NUR-002', 'Jennifer', 'Reyes', 'RN, BSN', 'female', '1990-10-08', 'j.reyes@usintellix.org', '+1-555-0202', 6, NULL, 'primary', 'Surgical Ward Staff Nurse - Post-Op Recovery', NOW()),
(112, 212, 'EMP-NUR-003', 'Rochelle', 'Dizon', 'RN', 'female', '1992-01-25', 'r.dizon@usintellix.org', '+1-555-0203', 3, NULL, 'primary', 'Medical Inpatient Ward Primary Care Nurse', NOW())
ON DUPLICATE KEY UPDATE 
    `first_name` = VALUES(`first_name`),
    `last_name` = VALUES(`last_name`),
    `department_id` = VALUES(`department_id`),
    `duty_tag` = VALUES(`duty_tag`);

-- 5. Set Heads of Department in `departments` table
UPDATE `departments` SET `head_of_department_id` = 101 WHERE `id` = 4;  -- Cardiology -> Dr. Marcus Vance
UPDATE `departments` SET `head_of_department_id` = 102 WHERE `id` = 5;  -- Pediatrics -> Dr. Elena Rostova
UPDATE `departments` SET `head_of_department_id` = 103 WHERE `id` = 3;  -- Internal Medicine -> Dr. Jonathan Hayes
UPDATE `departments` SET `head_of_department_id` = 104 WHERE `id` = 6;  -- Surgery -> Dr. Arthur Sterling
UPDATE `departments` SET `head_of_department_id` = 105 WHERE `id` = 2;  -- Emergency -> Dr. Sarah Lin
UPDATE `departments` SET `head_of_department_id` = 106 WHERE `id` = 10; -- OB/GYN -> Dr. Rachel Weiss
UPDATE `departments` SET `head_of_department_id` = 107 WHERE `id` = 11; -- Orthopedics -> Dr. David Miller
UPDATE `departments` SET `head_of_department_id` = 108 WHERE `id` = 7;  -- ICU -> Dr. Christopher Nolan

-- 6. Populate employee_department_assignments for explicit roster queries
INSERT INTO `employee_department_assignments` (`employee_id`, `department_id`, `assignment_type`, `is_primary`, `assigned_at`) VALUES
(101, 4, 'primary', 1, NOW()),
(102, 5, 'primary', 1, NOW()),
(103, 3, 'primary', 1, NOW()),
(104, 6, 'primary', 1, NOW()),
(105, 2, 'primary', 1, NOW()),
(106, 10, 'primary', 1, NOW()),
(107, 11, 'primary', 1, NOW()),
(108, 7, 'primary', 1, NOW()),
(108, 3, 'secondary', 0, NOW()),
(109, 4, 'primary', 1, NOW()),
(109, 2, 'on_call', 0, NOW()),
(110, 7, 'primary', 1, NOW()),
(111, 6, 'primary', 1, NOW()),
(112, 3, 'primary', 1, NOW())
ON DUPLICATE KEY UPDATE `is_primary` = VALUES(`is_primary`);

-- 7. Grant admin capability for visual department org mapping to admin role (role_id 1)
INSERT INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`, `created_at`)
VALUES (1, 'admin', 'admin_department_org', 1, NOW())
ON DUPLICATE KEY UPDATE `is_granted` = 1;
