-- Seed: radiology role
-- The Radiologic Technologist role (the radiographer / sonographer who runs the machines and books the
-- imaging worklist), next to the existing Lab Technician. What the role can open is set in
-- backend/config/role_access.php and on each /radiology route. Idempotent: INSERT IGNORE on the UNIQUE roles.name.

INSERT IGNORE INTO roles (name, description, created_at) VALUES
('radiologic_technologist', 'Radiologic Technologist: runs the imaging machines, schedules the radiology worklist and prepares patients', NOW());
