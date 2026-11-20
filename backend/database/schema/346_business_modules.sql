-- =============================================
-- Schema: Business Module Access / Entitlements
-- Controls which hospital/clinic modules this
-- organization has enabled and can access.
-- =============================================

CREATE TABLE IF NOT EXISTS business_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_key VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    is_core TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    updated_by INT NULL,
    updated_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_business_modules_key (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
