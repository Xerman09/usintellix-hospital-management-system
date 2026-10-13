-- Lab department (module 14, Phase 2: result entry and verification).
--   * lab_staff: lab users who are medical technologists (may verify and release results), with their licence number.
--     Set by an admin on the Lab Worklist.
--   * lab_result_sets: one round of results for one test (order): typed by the lab (draft -> entered = waiting for
--     verification), returned to the bench by the verifier (returned), verified and released (released; the values
--     go to patient_procedure_results, which fires critical values (module 6) and the results inbox (module 7)).
--     A correction after release is a new version; the old one becomes superseded.
--   * lab_result_values: the values of a set (one row per analyte), flagged as typed.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS lab_staff (
    user_id INT NOT NULL,
    med_tech TINYINT(1) NOT NULL DEFAULT 0,
    license_no VARCHAR(50) DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lab_result_sets (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,                            -- patient_procedure_orders.id
    version SMALLINT NOT NULL DEFAULT 1,              -- 2, 3 ... = corrections after release
    status VARCHAR(10) NOT NULL DEFAULT 'draft',      -- draft | entered | returned | released | superseded | cancelled
    comment VARCHAR(1000) DEFAULT NULL,               -- report comment (e.g. "haemolysed sample, potassium may be falsely high")
    correction_reason VARCHAR(255) DEFAULT NULL,      -- version > 1
    source VARCHAR(10) NOT NULL DEFAULT 'manual',     -- manual | import
    saved_by INT DEFAULT NULL, saved_at DATETIME DEFAULT NULL,
    entered_by INT DEFAULT NULL, entered_at DATETIME DEFAULT NULL,
    returned_by INT DEFAULT NULL, returned_at DATETIME DEFAULT NULL, return_reason VARCHAR(255) DEFAULT NULL,
    verified_by INT DEFAULT NULL, verified_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lab_result_sets (order_id, version),
    KEY idx_lab_result_sets_status (status, entered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lab_result_values (
    id INT NOT NULL AUTO_INCREMENT,
    set_id INT NOT NULL,
    seq SMALLINT NOT NULL DEFAULT 0,
    code VARCHAR(100) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    value VARCHAR(100) DEFAULT NULL,
    units VARCHAR(50) DEFAULT NULL,
    reference_range VARCHAR(100) DEFAULT NULL,
    is_abnormal TINYINT(1) NOT NULL DEFAULT 0,        -- ticked abnormal by hand
    flag VARCHAR(10) DEFAULT NULL,                    -- normal | abnormal | critical (worked out when saved)
    flag_detail VARCHAR(150) DEFAULT NULL,
    comment VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_lab_result_values_set (set_id, seq),
    CONSTRAINT fk_lab_result_values_set FOREIGN KEY (set_id) REFERENCES lab_result_sets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
