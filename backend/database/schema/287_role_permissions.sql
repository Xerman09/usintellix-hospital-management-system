-- Migration 287: Dynamic Role Permissions Capability Matrix
-- Subsystem 1: User Management & Role-Based Access Control (RBAC)

CREATE TABLE IF NOT EXISTS `role_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `capability` VARCHAR(80) NOT NULL,
    `is_granted` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    CONSTRAINT `fk_role_permissions_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_role_capability` (`role_id`, `capability`),
    INDEX `idx_role_module` (`role_id`, `module`),
    INDEX `idx_capability` (`capability`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
