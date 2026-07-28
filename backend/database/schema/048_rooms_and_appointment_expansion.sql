-- =============================================
-- Table: rooms
-- Simple lookup list (mirrors visit_categories), optionally scoped
-- to a facility. No unique-name constraint — the same room name/number
-- can plausibly repeat across different facilities.
-- =============================================

CREATE TABLE IF NOT EXISTS rooms (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,

    facility_id INT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_rooms_facility (facility_id),

    INDEX idx_rooms_created_by (created_by),

    INDEX idx_rooms_updated_by (updated_by),

    INDEX idx_rooms_deleted_by (deleted_by),

    CONSTRAINT fk_rooms_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =============================================
-- Alter Table: appointments
-- Adds support for: provider-blocked (non-patient) time, visit
-- category/facility/billing-facility/room linkage, all-day events,
-- and materialized recurring occurrences (interval-based or specific
-- days-of-week, both bounded by an until-date and grouped by
-- recurrence_group_id).
-- =============================================

ALTER TABLE appointments

    MODIFY COLUMN patient_id INT NULL,

    ADD COLUMN is_provider_block TINYINT(1) NOT NULL DEFAULT 0 AFTER provider_id,

    ADD COLUMN title VARCHAR(255) NULL AFTER is_provider_block,

    ADD COLUMN visit_category_id INT NULL AFTER title,

    ADD COLUMN facility_id INT NULL AFTER visit_category_id,

    ADD COLUMN billing_facility_id INT NULL AFTER facility_id,

    ADD COLUMN room_id INT NULL AFTER billing_facility_id,

    ADD COLUMN is_all_day TINYINT(1) NOT NULL DEFAULT 0 AFTER appointment_time,

    ADD COLUMN recurrence_group_id INT NULL AFTER is_all_day,

    ADD COLUMN recurrence_mode ENUM('none', 'interval', 'days_of_week') NOT NULL DEFAULT 'none' AFTER recurrence_group_id,

    ADD COLUMN recurrence_interval INT NULL AFTER recurrence_mode,

    ADD COLUMN recurrence_unit ENUM('day', 'week', 'month') NULL AFTER recurrence_interval,

    ADD COLUMN recurrence_days_of_week VARCHAR(20) NULL AFTER recurrence_unit,

    ADD COLUMN recurrence_until_date DATE NULL AFTER recurrence_days_of_week,

    ADD INDEX idx_appointments_is_provider_block (is_provider_block),

    ADD INDEX idx_appointments_visit_category (visit_category_id),

    ADD INDEX idx_appointments_facility (facility_id),

    ADD INDEX idx_appointments_billing_facility (billing_facility_id),

    ADD INDEX idx_appointments_room (room_id),

    ADD INDEX idx_appointments_recurrence_group (recurrence_group_id),

    ADD CONSTRAINT fk_appointments_visit_category
        FOREIGN KEY (visit_category_id)
        REFERENCES visit_categories(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    ADD CONSTRAINT fk_appointments_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    ADD CONSTRAINT fk_appointments_billing_facility
        FOREIGN KEY (billing_facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    ADD CONSTRAINT fk_appointments_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION;
