-- =============================================
-- Schema: form_definitions
-- =============================================
-- Registry of this system's encounter documentation form modules
-- (Care Plan, Vitals, SOAP, etc.), configurable from the Forms
-- Administration screen: priority (display order), category
-- (grouping), nickname (display alias), and access_control (ACL
-- permission required to use the form). php_extracted/db_installed
-- reflect whether the corresponding backend module genuinely exists
-- in this codebase.
-- =============================================

CREATE TABLE IF NOT EXISTS form_definitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    section_type VARCHAR(50) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'enabled',
    category VARCHAR(100) NOT NULL DEFAULT 'Clinical',
    nickname VARCHAR(100) NULL,
    access_control VARCHAR(50) NULL,
    priority INT NOT NULL DEFAULT 0,
    php_extracted TINYINT(1) NOT NULL DEFAULT 1,
    db_installed TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    UNIQUE KEY uq_form_definitions_name (name),
    CONSTRAINT fk_form_definitions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
