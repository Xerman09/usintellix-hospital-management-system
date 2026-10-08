-- Tasks (module 8, Phase 2): work assigned to a person, a role, or "the patient's nurse",
-- with a due time (e.g. "wound dressing at 2 PM"). Overdue tasks raise an alert; completing a
-- task records who and when.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS clinical_tasks (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    details VARCHAR(1000) DEFAULT NULL,
    patient_id INT DEFAULT NULL,
    admission_id INT DEFAULT NULL,
    ward_id INT DEFAULT NULL,                               -- role tasks for nursing roles: that ward's staff
    assign_type VARCHAR(20) NOT NULL,                       -- user | role | patient_nurse
    assigned_user_id INT DEFAULT NULL,
    assigned_role VARCHAR(50) DEFAULT NULL,
    due_at DATETIME NOT NULL,                               -- DB clock
    priority VARCHAR(10) NOT NULL DEFAULT 'routine',        -- routine | urgent
    status VARCHAR(12) NOT NULL DEFAULT 'open',             -- open | done | cancelled
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    completed_by INT DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    completion_note VARCHAR(500) DEFAULT NULL,
    cancelled_by INT DEFAULT NULL,
    cancelled_at DATETIME DEFAULT NULL,
    cancel_reason VARCHAR(300) DEFAULT NULL,
    overdue_alerted_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_clinical_tasks_open (status, due_at),
    KEY idx_clinical_tasks_user (assigned_user_id, status),
    KEY idx_clinical_tasks_role (assigned_role, status),
    KEY idx_clinical_tasks_admission (admission_id),
    KEY idx_clinical_tasks_patient (patient_id),
    KEY idx_clinical_tasks_created_by (created_by),
    CONSTRAINT fk_clinical_tasks_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_clinical_tasks_user FOREIGN KEY (assigned_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_clinical_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The overdue check runs from the bell poll (throttled) and from cron/task_overdue.php.
INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('task_overdue', '2000-01-01 00:00:00');
