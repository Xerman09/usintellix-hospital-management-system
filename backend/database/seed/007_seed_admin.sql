-- =============================================
-- Seed: admin role, department, and admin account
-- =============================================
-- Login credentials created by this seed:
--   username: admin
--   password: Admin@123
--
-- Idempotent: safe to re-run. Existing rows (role/department/
-- user/employee) are reused via lookup instead of re-inserted.
-- =============================================

-- No USE statement here, deliberately.
--
-- This file used to begin "USE usintellix_hospital_management_system;", which
-- silently overrode whichever database the caller had selected -- including the
-- one named on the mysql command line, and the one the application's own
-- connection is bound to. Because this is the lowest-numbered seed, every seed
-- applied after it in the same session went to that hard-coded name too.
--
-- That is wrong in three situations that all exist: a deployment whose database
-- is named something else, a staging copy restored under a different name, and
-- a test database. In the last case it was not theoretical -- it sent a full
-- seed run to the live database while reporting success against the test one.
--
-- A seed must inherit the database it is run against. Whoever runs it has
-- already said which one that is.

-- Role
INSERT INTO roles (name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

SET @role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1);

-- Department
INSERT INTO departments (name)
SELECT 'Administration'
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE name = 'Administration'
);

SET @department_id = (
    SELECT id FROM departments WHERE name = 'Administration' LIMIT 1
);

-- Admin user (password hash below is bcrypt for: Admin@123)
INSERT INTO users (username, password, role_id)
SELECT 'admin', '$2y$10$5n3vTsszKZ78BNZbaiuteOadEy/OuGUTHh6xXx5SMe8FJd54POSR.', @role_id
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
);

SET @user_id = (
    SELECT id FROM users WHERE username = 'admin' LIMIT 1
);

-- Admin employee record
INSERT INTO employees (
    user_id, employee_no, first_name, last_name,
    sex, birthdate, email, phone, department_id
)
SELECT
    @user_id, 'EMP-000001', 'System', 'Administrator',
    'male', '1990-01-01', 'admin@intellix.local', '09000000000', @department_id
WHERE NOT EXISTS (
    SELECT 1 FROM employees WHERE user_id = @user_id
);
