-- ============================================================
-- JCAHO: Critical Diagnostic Test Results Turnaround Time Log
-- Tracks panic/critical lab & radiology results communication
-- ============================================================

CREATE TABLE IF NOT EXISTS `critical_result_turnaround` (
    `id`                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tracking_number`           VARCHAR(30)   NOT NULL UNIQUE,

    `result_date`               DATETIME      NOT NULL,
    `test_type`                 ENUM("Laboratory","Radiology","Pathology","Cardiology","Microbiology","Blood Bank") NOT NULL DEFAULT "Laboratory",
    `test_name`                 VARCHAR(255)  NOT NULL,
    `critical_value`            VARCHAR(500)  NOT NULL,
    `normal_range`              VARCHAR(200)  DEFAULT NULL,
    `ordering_department`       VARCHAR(150)  NOT NULL,

    `patient_id`                INT UNSIGNED  DEFAULT NULL,
    `patient_name`              VARCHAR(200)  DEFAULT NULL,
    `patient_mrn`               VARCHAR(80)   DEFAULT NULL,
    `patient_location`          VARCHAR(200)  DEFAULT NULL,

    `reported_by`               VARCHAR(200)  NOT NULL,
    `reported_by_role`          VARCHAR(150)  DEFAULT "Laboratory Technologist",
    `result_available_at`       DATETIME      NOT NULL,

    `first_call_at`             DATETIME      DEFAULT NULL,
    `first_call_to`             VARCHAR(200)  DEFAULT NULL,
    `first_call_method`         ENUM("Phone","Pager","SMS","In-Person","EHR Alert") DEFAULT "Phone",
    `acknowledged_at`           DATETIME      DEFAULT NULL,
    `acknowledged_by`           VARCHAR(200)  DEFAULT NULL,
    `acknowledged_by_role`      VARCHAR(150)  DEFAULT NULL,
    `read_back_confirmed`       TINYINT(1)    NOT NULL DEFAULT 0,

    `documented_in_chart_at`    DATETIME      DEFAULT NULL,
    `action_taken`              TEXT          DEFAULT NULL,

    `tat_result_to_first_call`  INT UNSIGNED  DEFAULT NULL,
    `tat_first_call_to_ack`     INT UNSIGNED  DEFAULT NULL,
    `tat_total`                 INT UNSIGNED  DEFAULT NULL,

    `status`                    ENUM("Pending","Notified","Acknowledged","Documented","Breached","Escalated") NOT NULL DEFAULT "Pending",
    `jcaho_compliant`           TINYINT(1)    NOT NULL DEFAULT 0,
    `policy_limit_minutes`      INT UNSIGNED  NOT NULL DEFAULT 30,
    `breach_reason`             TEXT          DEFAULT NULL,
    `escalated_to`              VARCHAR(200)  DEFAULT NULL,
    `notes`                     TEXT          DEFAULT NULL,

    `created_at`                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_result_date       (`result_date`),
    INDEX idx_test_type         (`test_type`),
    INDEX idx_status            (`status`),
    INDEX idx_jcaho_compliant   (`jcaho_compliant`),
    INDEX idx_ordering_dept     (`ordering_department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
