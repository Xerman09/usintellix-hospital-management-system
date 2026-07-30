-- =============================================
-- Table: business_settings
-- Single-row table holding the editable business identity
-- (name + logo) shown across the app -- navbar, login page, etc.
-- =============================================

CREATE TABLE IF NOT EXISTS business_settings (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL DEFAULT 'Intellix',

    logo VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id)

) ENGINE = InnoDB;

INSERT INTO business_settings (name, created_at)
SELECT 'Intellix', NOW()
WHERE NOT EXISTS (SELECT 1 FROM business_settings);
