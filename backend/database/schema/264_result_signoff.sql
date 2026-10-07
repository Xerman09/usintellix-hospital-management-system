-- Results sign-off (module 7, Phase 2).
-- The doctor marks each order's results reviewed, with an optional action and comment.
-- Results not reviewed after general_settings.result_review_days days are flagged.
-- A corrected result (values changed) needs a new review.

SET NAMES utf8mb4;

ALTER TABLE patient_procedure_orders
    ADD COLUMN IF NOT EXISTS results_hash CHAR(32) NULL AFTER reported_at,
    ADD COLUMN IF NOT EXISTS results_at DATETIME NULL AFTER results_hash,          -- when these results came out (DB clock); the review clock starts here
    ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL AFTER results_at,
    ADD COLUMN IF NOT EXISTS reviewed_by INT NULL AFTER reviewed_at,
    ADD COLUMN IF NOT EXISTS review_action VARCHAR(30) NULL AFTER reviewed_by,
    ADD COLUMN IF NOT EXISTS review_comment VARCHAR(1000) NULL AFTER review_action;

ALTER TABLE patient_procedure_orders
    ADD INDEX IF NOT EXISTS idx_ppo_review (reviewed_at, results_at);

-- Every sign-off, including those of results corrected later.
CREATE TABLE IF NOT EXISTS result_reviews (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    reviewed_by INT NOT NULL,
    action VARCHAR(30) NOT NULL DEFAULT 'none',
    comment VARCHAR(1000) DEFAULT NULL,
    results_hash CHAR(32) DEFAULT NULL,
    reviewed_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_result_reviews_order (order_id),
    CONSTRAINT fk_result_reviews_order FOREIGN KEY (order_id) REFERENCES patient_procedure_orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_result_reviews_user FOREIGN KEY (reviewed_by) REFERENCES users (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS result_review_days INT NOT NULL DEFAULT 3;

-- The overdue-review check runs from the bell poll (throttled) and from cron/result_review_overdue.php.
INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('result_review_overdue', '2000-01-01 00:00:00');
