-- Nursing roles (Nurse & CNA, Phase 1): the wards each nurse, charge nurse or CNA works in.
-- One person can work in several wards; one of them is their main (primary) ward.

CREATE TABLE IF NOT EXISTS nurse_ward_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ward_id INT UNSIGNED NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_nwa_user_ward (user_id, ward_id),
    KEY idx_nwa_ward (ward_id),
    CONSTRAINT fk_nwa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_nwa_ward FOREIGN KEY (ward_id) REFERENCES hospital_wards(id) ON DELETE CASCADE,
    CONSTRAINT fk_nwa_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every change to someone's wards (who changed it, before and after).
CREATE TABLE IF NOT EXISTS nurse_ward_assignment_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    wards_before VARCHAR(500) NULL,
    wards_after VARCHAR(500) NULL,
    changed_by INT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_nwal_user (user_id),
    CONSTRAINT fk_nwal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_nwal_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
