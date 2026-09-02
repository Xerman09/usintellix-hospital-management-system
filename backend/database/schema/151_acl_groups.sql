-- =============================================
-- Schema: acl_groups, acl_group_members
-- =============================================
-- Access Control List Administration: organizational ACL groups
-- (Administrators, Clinicians, Front Office, etc.) and the users who
-- belong to each one. This is a separate membership layer alongside
-- the existing single-role-per-user (`users.role_id`) system, matching
-- the real ACL "User Memberships" admin screen.
-- =============================================

CREATE TABLE IF NOT EXISTS acl_groups (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,
    UNIQUE KEY uq_acl_groups_name (name),
    CONSTRAINT fk_acl_groups_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_acl_groups_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_acl_groups_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acl_group_members (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id INT UNSIGNED NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    UNIQUE KEY uq_acl_group_members (group_id, user_id),
    CONSTRAINT fk_acl_group_members_group FOREIGN KEY (group_id) REFERENCES acl_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_acl_group_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_acl_group_members_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
