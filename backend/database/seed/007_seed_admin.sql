-- =============================================
-- Seed: default tenant, admin role, department, and admin account
-- =============================================
-- Login credentials created by this seed:
--   username: admin
--   password: Admin@123
--
-- Idempotent: safe to re-run. Existing rows (tenant/role/department/
-- user/employee) are reused via lookup instead of re-inserted.
-- =============================================

USE usintellix_hospital_management_system;

-- Tenant
INSERT INTO tenants (subdomain, name, email, phone)
SELECT 'main', 'Intellix Hospital', 'admin@intellix.local', '00000000000'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE subdomain = 'main');

SET @tenant_id = (SELECT id FROM tenants WHERE subdomain = 'main' LIMIT 1);

-- Role
INSERT INTO roles (name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

SET @role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1);

-- Department
INSERT INTO departments (tenant_id, name)
SELECT @tenant_id, 'Administration'
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE tenant_id = @tenant_id AND name = 'Administration'
);

SET @department_id = (
    SELECT id FROM departments WHERE tenant_id = @tenant_id AND name = 'Administration' LIMIT 1
);

-- Admin user (password hash below is bcrypt for: Admin@123)
INSERT INTO users (tenant_id, username, password, role_id)
SELECT @tenant_id, 'admin', '$2y$10$5n3vTsszKZ78BNZbaiuteOadEy/OuGUTHh6xXx5SMe8FJd54POSR.', @role_id
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE tenant_id = @tenant_id AND username = 'admin'
);

SET @user_id = (
    SELECT id FROM users WHERE tenant_id = @tenant_id AND username = 'admin' LIMIT 1
);

-- Admin employee record
INSERT INTO employees (
    tenant_id, user_id, employee_no, first_name, last_name,
    sex, birthdate, email, phone, department_id
)
SELECT
    @tenant_id, @user_id, 'EMP-000001', 'System', 'Administrator',
    'male', '1990-01-01', 'admin@intellix.local', '09000000000', @department_id
WHERE NOT EXISTS (
    SELECT 1 FROM employees WHERE tenant_id = @tenant_id AND user_id = @user_id
);
