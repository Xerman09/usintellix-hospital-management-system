-- =============================================
-- Table: warehouses
-- Storage locations a drug lot can be held at (e.g. "On Site", "Main
-- Pharmacy"), for the Inventory > Management screen. Optionally tied to
-- a facility, but not required -- a warehouse can be practice-wide.
-- =============================================

CREATE TABLE IF NOT EXISTS warehouses (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(150) NOT NULL,

    facility_id INT NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_warehouses_name UNIQUE (name),

    INDEX idx_warehouses_facility (facility_id),

    INDEX idx_warehouses_created_by (created_by),

    INDEX idx_warehouses_deleted_by (deleted_by),

    CONSTRAINT fk_warehouses_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
