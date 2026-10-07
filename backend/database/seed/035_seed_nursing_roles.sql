-- Seed: nursing roles
-- Charge Nurse and CNA (Certified Nursing Assistant) next to the existing Nurse role. What each
-- role can open is set in backend/config/role_access.php. Idempotent: INSERT IGNORE on the
-- UNIQUE roles.name.

INSERT IGNORE INTO roles (name, description, created_at) VALUES
('nurse', 'Registered Nurse / Nursing Staff', NOW()),
('charge_nurse', 'Charge Nurse: leads a ward shift; nurse access plus managing the ward''s nursing staff', NOW()),
('cna', 'Certified Nursing Assistant: vital signs, rooming and patient care support', NOW());
