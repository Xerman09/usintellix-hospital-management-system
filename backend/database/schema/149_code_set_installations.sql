-- =============================================
-- Schema: code_set_installations
-- =============================================
-- Tracks the currently-installed release of each externally-loaded
-- code set (ICD10, RXNORM/RXCUI, SNOMED, CQM_VALUESET), one row per
-- successful install/upgrade. The most recent row per code_type
-- (highest installed_at) is the "Installed Release" shown by the
-- External Data Loads / Install Code Set screens.
-- =============================================

CREATE TABLE IF NOT EXISTS code_set_installations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code_type VARCHAR(50) NOT NULL,
    release_label VARCHAR(100) NOT NULL,
    revision VARCHAR(150) NULL,
    release_date DATE NULL,
    installed_at DATETIME NOT NULL,
    installed_by INT NULL,
    inserted_count INT UNSIGNED NOT NULL DEFAULT 0,
    replaced_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code_set_installations_code_type (code_type, installed_at),
    CONSTRAINT fk_code_set_installations_installed_by FOREIGN KEY (installed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
