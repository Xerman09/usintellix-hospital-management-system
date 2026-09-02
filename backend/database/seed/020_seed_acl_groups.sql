-- Seed: acl_groups
-- Seeds the standard Access Control List Administration groups
-- (Administrators, Accounting, Clinicians, Emergency Login, Front
-- Office, Physicians) and enrolls the real seeded admin user (from
-- 007_seed_admin.sql) into Administrators. Idempotent: groups via
-- INSERT IGNORE against acl_groups' UNIQUE(name); the membership row
-- via INSERT...SELECT...WHERE NOT EXISTS since it depends on rows
-- looked up above.

INSERT IGNORE INTO acl_groups (name, description, created_at) VALUES
('Administrators', 'Full system administration access', NOW()),
('Accounting', 'Billing and financial reporting access', NOW()),
('Clinicians', 'Clinical documentation and patient care access', NOW()),
('Emergency Login', 'Break-glass emergency access', NOW()),
('Front Office', 'Scheduling and front-desk access', NOW()),
('Physicians', 'Physician-level clinical access', NOW());

SET @admin_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1);
SET @administrators_group_id = (SELECT id FROM acl_groups WHERE name = 'Administrators' LIMIT 1);

INSERT INTO acl_group_members (group_id, user_id, created_at)
SELECT @administrators_group_id, @admin_id, NOW()
WHERE @admin_id IS NOT NULL AND @administrators_group_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM acl_group_members
    WHERE group_id = @administrators_group_id AND user_id = @admin_id
);
