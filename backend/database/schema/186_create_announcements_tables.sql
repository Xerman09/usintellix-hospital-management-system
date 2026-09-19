-- =============================================
-- Migration: 186_create_announcements_tables.sql
-- Announcements feature under Miscellaneous:
-- Supports title, message content, image uploads,
-- scheduling (start & end datetime), status, priority,
-- and multi-role audience targeting.
-- =============================================

CREATE TABLE IF NOT EXISTS announcements (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255) NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    priority ENUM('normal', 'important', 'urgent') NOT NULL DEFAULT 'normal',
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,
    PRIMARY KEY (id),
    INDEX idx_announcements_dates (start_date, end_date),
    INDEX idx_announcements_status (status),
    INDEX idx_announcements_deleted_at (deleted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_roles (
    id INT NOT NULL AUTO_INCREMENT,
    announcement_id INT NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    created_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_announcement_roles_lookup (announcement_id, role_name),
    INDEX idx_announcement_roles_role (role_name),
    CONSTRAINT fk_announcement_roles_announcement
        FOREIGN KEY (announcement_id)
        REFERENCES announcements(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
