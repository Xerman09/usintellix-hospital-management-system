-- Alert center (Alerts & notifications, Phase 1).
-- One alert service every module uses: an alert has a type, an urgency, one or more
-- targets (a person, a role, a unit/department or everyone), an optional patient and
-- a link to open. Every recipient's delivery / seen / read / acknowledge is recorded.

CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type VARCHAR(60) NOT NULL,                 -- e.g. manual, critical_lab, code_blue, low_stock
    urgency ENUM('info', 'urgent', 'critical') NOT NULL DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    body TEXT NULL,
    patient_id INT NULL,
    link_json TEXT NULL,                             -- {"tab":"or_board"} / {"patient_id":5} / {"or_case":12}
    source_type VARCHAR(60) NULL,                    -- the record that raised it, e.g. or_surgical_cases
    source_id INT NULL,
    dedupe_key VARCHAR(150) NULL,                    -- an open alert with the same key is not raised twice
    requires_ack TINYINT(1) NOT NULL DEFAULT 0,      -- urgent / critical: stays until someone acknowledges
    acknowledged_at DATETIME NULL,
    acknowledged_by INT NULL,
    ack_note VARCHAR(500) NULL,
    resolved_at DATETIME NULL,                       -- closed by the module that raised it (condition gone)
    resolved_by INT NULL,
    resolve_note VARCHAR(255) NULL,
    expires_at DATETIME NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_alerts_created (created_at),
    KEY idx_alerts_open (acknowledged_at, resolved_at),
    KEY idx_alerts_source (source_type, source_id),
    KEY idx_alerts_dedupe (dedupe_key),
    KEY idx_alerts_patient (patient_id),
    CONSTRAINT fk_alerts_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_ack_by FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Who an alert is for. One alert can have several targets (e.g. the doctor and the unit).
CREATE TABLE IF NOT EXISTS alert_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_id INT NOT NULL,
    target_type ENUM('user', 'role', 'department', 'everyone') NOT NULL,
    target_id INT NULL,                              -- users.id / departments.id
    target_role VARCHAR(50) NULL,                    -- role name, e.g. nurse
    KEY idx_at_alert (alert_id),
    KEY idx_at_user (target_type, target_id),
    KEY idx_at_role (target_type, target_role),
    CONSTRAINT fk_at_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each recipient's trail: when it reached their screen, when they saw it, opened it, acknowledged it.
CREATE TABLE IF NOT EXISTS alert_receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_id INT NOT NULL,
    user_id INT NOT NULL,
    delivered_at DATETIME NULL,
    seen_at DATETIME NULL,
    read_at DATETIME NULL,
    acknowledged_at DATETIME NULL,
    UNIQUE KEY uq_ar_alert_user (alert_id, user_id),
    KEY idx_ar_user (user_id, read_at),
    CONSTRAINT fk_ar_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
