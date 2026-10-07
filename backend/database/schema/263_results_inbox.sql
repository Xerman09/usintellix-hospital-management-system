-- Results inbox (module 7, Phase 1): the "!" in the top bar.
-- One row per resulted lab / radiology order and per person it concerns (the ordering doctor,
-- the patient's own doctor, the patient's nurse when admitted). The row stays new until that
-- person opens the result; a corrected result makes it new again.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS results_inbox (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    patient_id INT NOT NULL,
    user_id INT NOT NULL,
    kind VARCHAR(12) NOT NULL DEFAULT 'lab',            -- lab | radiology
    reason VARCHAR(20) NOT NULL DEFAULT 'ordering',     -- ordering | primary | nurse
    is_critical TINYINT(1) NOT NULL DEFAULT 0,
    abnormal_count INT NOT NULL DEFAULT 0,
    result_count INT NOT NULL DEFAULT 0,
    summary VARCHAR(500) DEFAULT NULL,
    content_hash CHAR(32) DEFAULT NULL,                 -- the results as delivered: a change makes the row new again
    is_corrected TINYINT(1) NOT NULL DEFAULT 0,
    resulted_at DATETIME NOT NULL,
    opened_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_results_inbox_order_user (order_id, user_id),
    KEY idx_results_inbox_user_new (user_id, opened_at),
    KEY idx_results_inbox_patient (patient_id),
    CONSTRAINT fk_results_inbox_order FOREIGN KEY (order_id) REFERENCES patient_procedure_orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_results_inbox_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_results_inbox_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
