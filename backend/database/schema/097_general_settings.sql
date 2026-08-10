-- =============================================
-- Table: general_settings
-- Single-row table holding app-wide general configuration. Starts with
-- Two-Factor Authentication: whether it's required at all, and if so,
-- which delivery method (SMS or Email) -- mirrors business_settings'
-- single-row pattern.
-- =============================================

CREATE TABLE IF NOT EXISTS general_settings (

    id INT NOT NULL AUTO_INCREMENT,

    two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,

    two_factor_method VARCHAR(20) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id)

) ENGINE = InnoDB;

INSERT INTO general_settings (two_factor_enabled, created_at)
SELECT 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM general_settings);

-- =============================================
-- Table: general_settings_two_factor_roles
-- Which roles Two-Factor Authentication applies to when enabled. A plain
-- join on roles(id) rather than a column on general_settings since this
-- is a many-role selection, not a single value.
-- =============================================

CREATE TABLE IF NOT EXISTS general_settings_two_factor_roles (

    id INT NOT NULL AUTO_INCREMENT,

    role_id INT NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_general_settings_two_factor_roles_role
        UNIQUE (role_id),

    INDEX idx_general_settings_two_factor_roles_created_by (created_by),

    CONSTRAINT fk_general_settings_two_factor_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
