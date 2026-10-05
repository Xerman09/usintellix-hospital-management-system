-- ========================================================
-- Migration: 244_or_scheduling.sql
-- Module: OR Management > OR Schedule
-- Purpose: Surgery Phase 3 -- booking surgery into the operating rooms.
--            * or_suites.turnover_minutes -- cleaning time kept free after
--              each case in that suite (default 30).
--            * or_block_times -- a suite reserved for a specialization on a
--              day of the week and time (e.g. OR 2 for OB-GYN, Tuesday
--              08:00-12:00), optionally between two dates. A case booked
--              outside its specialization's block (or into another
--              specialization's block) gets a warning.
--            * or_case_history -- what happened to each case and why:
--              booked, rescheduled, team changed, cancelled, stage moves;
--              who, when, from / to.
--            * or_surgical_cases: who cancelled it and when.
--          Safe to run again.
-- ========================================================

ALTER TABLE or_suites
    ADD COLUMN IF NOT EXISTS turnover_minutes INT NOT NULL DEFAULT 30 AFTER suite_type;

CREATE TABLE IF NOT EXISTS or_block_times (

    id INT NOT NULL AUTO_INCREMENT,

    or_suite_id INT UNSIGNED NOT NULL,

    specialization_id INT NOT NULL,

    -- 1 = Monday ... 7 = Sunday
    day_of_week TINYINT NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    effective_from DATE NULL,

    effective_to DATE NULL,

    notes VARCHAR(255) NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_obt_suite_day (or_suite_id, day_of_week, is_active),

    INDEX idx_obt_specialization (specialization_id),

    CONSTRAINT fk_obt_suite
        FOREIGN KEY (or_suite_id) REFERENCES or_suites(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_obt_specialization
        FOREIGN KEY (specialization_id) REFERENCES specializations(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_case_history (

    id INT NOT NULL AUTO_INCREMENT,

    case_id INT UNSIGNED NOT NULL,

    -- booked | rescheduled | team_changed | cancelled | stage
    action VARCHAR(30) NOT NULL,

    -- What changed, e.g. {"from": {...}, "to": {...}} as JSON.
    details TEXT NULL,

    reason VARCHAR(500) NULL,

    user_id INT NULL,

    created_at DATETIME NOT NULL,

    PRIMARY KEY (id),

    INDEX idx_och_case (case_id, created_at),

    CONSTRAINT fk_och_case
        FOREIGN KEY (case_id) REFERENCES or_surgical_cases(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE or_surgical_cases
    ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL AFTER cancellation_reason,
    ADD COLUMN IF NOT EXISTS cancelled_by INT NULL AFTER cancelled_at;

CREATE INDEX IF NOT EXISTS idx_or_suite_date ON or_surgical_cases (or_suite_id, scheduled_date, perioperative_stage);
CREATE INDEX IF NOT EXISTS idx_or_date_stage ON or_surgical_cases (scheduled_date, perioperative_stage);
