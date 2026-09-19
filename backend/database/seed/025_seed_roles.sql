-- Seed: roles
-- Populates standard healthcare system roles for role management and announcements targeting
INSERT IGNORE INTO roles (name, description, created_at) VALUES
('nurse', 'Registered Nurse / Nursing Staff', NOW()),
('pharmacist', 'Pharmacy Staff', NOW()),
('accountant', 'Accounting and Billing Staff', NOW()),
('clinician', 'Clinical Documentation and Care Staff', NOW()),
('lab_technician', 'Laboratory Technician', NOW()),
('staff', 'General Hospital Staff', NOW());
