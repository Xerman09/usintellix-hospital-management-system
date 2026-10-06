-- Alert escalation (Alerts & notifications, Phase 2).
-- An open alert that nobody acknowledges in time goes to the next level of the chain
-- (e.g. nurse -> charge nurse -> doctor -> admin). Admin sets the chain and the wait
-- times per alert type; the '*' policy is the default for types without their own.

CREATE TABLE IF NOT EXISTS alert_escalation_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type VARCHAR(60) NOT NULL,                           -- '*' = every type without its own policy
    applies_to ENUM('critical', 'urgent') NOT NULL DEFAULT 'critical',  -- urgent = urgent and critical
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_by INT NULL,
    updated_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_aep_type (alert_type),
    CONSTRAINT fk_aep_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The chain: level 1 fires wait_minutes after the alert was sent, level 2 wait_minutes after level 1, ...
CREATE TABLE IF NOT EXISTS alert_escalation_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policy_id INT NOT NULL,
    step_no TINYINT NOT NULL,
    wait_minutes INT NOT NULL,
    target_type ENUM('user', 'role', 'department') NOT NULL,
    target_id INT NULL,
    target_role VARCHAR(50) NULL,
    UNIQUE KEY uq_aes_step (policy_id, step_no),
    CONSTRAINT fk_aes_policy FOREIGN KEY (policy_id) REFERENCES alert_escalation_policies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each escalation that happened.
CREATE TABLE IF NOT EXISTS alert_escalations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_id INT NOT NULL,
    level TINYINT NOT NULL,
    escalated_at DATETIME NOT NULL,
    waited_minutes INT NOT NULL,
    target_label VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_ae_level (alert_id, level),
    CONSTRAINT fk_ae_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- When the escalation check last ran (it runs from the bell's poll, at most every 30 seconds,
-- and from backend/cron/alert_escalation.php when a scheduled task is set up).
CREATE TABLE IF NOT EXISTS alert_job_runs (
    job VARCHAR(40) PRIMARY KEY,
    last_run_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('escalation', '2000-01-01 00:00:00');

ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS escalation_level TINYINT NOT NULL DEFAULT 0 AFTER resolve_note,
    ADD COLUMN IF NOT EXISTS last_escalated_at DATETIME NULL AFTER escalation_level;

-- Which level a recipient was added at (0 = sent to them from the start).
ALTER TABLE alert_targets
    ADD COLUMN IF NOT EXISTS escalation_level TINYINT NOT NULL DEFAULT 0 AFTER target_role;
