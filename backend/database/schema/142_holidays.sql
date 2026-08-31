-- =============================================
-- Table: holidays
-- Clinic closure dates ("Admin > Clinic > Import Holidays" in OpenEMR
-- terms), used to block scheduling on the calendar.
-- =============================================

CREATE TABLE IF NOT EXISTS holidays (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    holiday_date DATE NOT NULL,

    recurs_yearly TINYINT(1) NOT NULL DEFAULT 0,

    description VARCHAR(500) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_holidays_name_date
        UNIQUE (name, holiday_date),

    INDEX idx_holidays_date (holiday_date),

    INDEX idx_holidays_created_by (created_by),

    INDEX idx_holidays_updated_by (updated_by),

    INDEX idx_holidays_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
