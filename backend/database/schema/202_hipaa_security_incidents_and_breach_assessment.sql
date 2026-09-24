-- Migration 202: HIPAA Security Incidents & Breach Notification 4-Factor Risk Assessment
-- Statutory Framework: 45 CFR §§ 164.400 - 164.414 & 45 CFR § 164.308(a)(6)

CREATE TABLE IF NOT EXISTS `hipaa_security_incidents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `incident_number` VARCHAR(32) NOT NULL,
    `incident_title` VARCHAR(255) NOT NULL,
    `incident_date` DATETIME NOT NULL COMMENT 'When the security incident occurred',
    `discovery_date` DATETIME NOT NULL COMMENT 'When entity discovered incident - starts § 164.404 60-day clock',
    `incident_type` ENUM(
        'unauthorized_access_snooping',
        'lost_stolen_device_media',
        'misdirected_communication_fax_email',
        'hacking_it_incident_ransomware',
        'improper_disposal',
        'credential_compromise',
        'other'
    ) NOT NULL DEFAULT 'unauthorized_access_snooping',
    `location_of_breach` VARCHAR(100) NOT NULL DEFAULT 'EHR Application' COMMENT 'EHR Application, Laptop/Device, Email, Network Server, Paper Records',
    `affected_individuals_count` INT UNSIGNED NOT NULL DEFAULT 1,
    `phi_types_involved` TEXT NULL COMMENT 'JSON/Comma list of PHI types: Demographics, SSN/IDs, Clinical notes, Diagnoses/Labs, Financials',
    `incident_description` TEXT NOT NULL COMMENT 'Detailed narrative of incident and cause',
    
    -- Statutory 4-Factor Risk Assessment (§ 164.402)
    `assessment_conducted` TINYINT(1) NOT NULL DEFAULT 0,
    `assessment_date` DATETIME NULL,
    `factor1_phi_nature_score` TINYINT UNSIGNED NULL COMMENT '1=Low, 2=Low-Mod, 3=Moderate, 4=High, 5=Severe Sensitivity',
    `factor1_rationale` TEXT NULL COMMENT 'Nature and extent of PHI, identifiers, re-identification likelihood',
    `factor2_recipient_score` TINYINT UNSIGNED NULL COMMENT '1=Low, 2=Low-Mod, 3=Moderate, 4=High, 5=Severe Risk Recipient',
    `factor2_rationale` TEXT NULL COMMENT 'Unauthorized person who used PHI or to whom disclosure made',
    `factor3_viewed_acquired_score` TINYINT UNSIGNED NULL COMMENT '1=Low (not opened/read), 5=Confirmed Viewed/Exfiltrated',
    `factor3_rationale` TEXT NULL COMMENT 'Whether PHI was actually acquired or viewed',
    `factor4_mitigation_score` TINYINT UNSIGNED NULL COMMENT '1=Immediate Verified Destruction/Mitigation, 5=No Mitigation',
    `factor4_rationale` TEXT NULL COMMENT 'Extent to which risk has been mitigated',
    `composite_risk_score` DECIMAL(3,1) NULL COMMENT 'Composite computed risk score (1.0 - 5.0)',
    `breach_determination` ENUM(
        'under_investigation',
        'not_a_breach_low_risk',
        'reportable_breach_patient_only',
        'reportable_breach_ocr_annual',
        'reportable_breach_ocr_immediate'
    ) NOT NULL DEFAULT 'under_investigation',
    `determination_rationale` TEXT NULL,
    `determination_date` DATE NULL,
    `investigating_officer_id` BIGINT UNSIGNED NULL,
    `investigating_officer_name` VARCHAR(150) NULL,
    
    -- Individual Notification Compliance (45 CFR § 164.404 - 60 calendar days)
    `individual_notification_deadline` DATE NULL COMMENT 'Discovery date + 60 calendar days',
    `individual_notification_status` ENUM('not_required', 'pending', 'in_progress', 'completed', 'overdue') NOT NULL DEFAULT 'pending',
    `individual_notified_date` DATE NULL,
    `individual_notification_method` ENUM('first_class_mail', 'secure_email', 'substitute_notice', 'not_applicable') NOT NULL DEFAULT 'not_applicable',
    
    -- HHS OCR Reporting Compliance (45 CFR § 164.408)
    `ocr_notification_deadline` DATE NULL COMMENT '60 days if >=500; end of Feb following calendar year if <500',
    `ocr_notification_status` ENUM('not_required', 'pending', 'submitted_annual_log', 'submitted_immediate_portal', 'overdue') NOT NULL DEFAULT 'pending',
    `ocr_submitted_date` DATE NULL,
    `ocr_confirmation_number` VARCHAR(100) NULL,
    
    -- Media Notice Compliance (45 CFR § 164.406 - 500+ in State/jurisdiction)
    `media_notification_required` TINYINT(1) NOT NULL DEFAULT 0,
    `media_notification_status` ENUM('not_applicable', 'pending', 'completed') NOT NULL DEFAULT 'not_applicable',
    `media_notified_date` DATE NULL,
    `media_outlet_name` VARCHAR(200) NULL,
    
    -- Remediation & Incident Lifecycle
    `incident_status` ENUM('reported', 'under_assessment', 'remediation_in_progress', 'notified', 'closed') NOT NULL DEFAULT 'reported',
    `corrective_actions` TEXT NULL COMMENT 'Technical patches, disciplinary sanctions, policy revisions',
    `resolution_notes` TEXT NULL,
    `closed_at` DATETIME NULL,
    
    -- Audit & Ownership
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    `deleted_by` BIGINT UNSIGNED NULL,
    
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_incident_number` (`incident_number`),
    INDEX `idx_incidents_discovery` (`discovery_date`),
    INDEX `idx_incidents_status` (`incident_status`),
    INDEX `idx_incidents_determination` (`breach_determination`),
    INDEX `idx_incidents_indiv_deadline` (`individual_notification_deadline`),
    INDEX `idx_incidents_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hipaa_incident_patients` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `incident_id` BIGINT UNSIGNED NOT NULL,
    `patient_id` INT NOT NULL,
    `notification_status` ENUM('pending', 'letter_generated', 'sent', 'confirmed_delivered', 'returned_undeliverable') NOT NULL DEFAULT 'pending',
    `notified_at` DATETIME NULL,
    `notification_method` ENUM('first_class_mail', 'secure_email', 'portal_notice', 'in_person') NOT NULL DEFAULT 'first_class_mail',
    `tracking_number` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    INDEX `idx_hipaa_inc_pat_incident` (`incident_id`),
    INDEX `idx_hipaa_inc_pat_patient` (`patient_id`),
    UNIQUE KEY `uk_incident_patient` (`incident_id`, `patient_id`),
    CONSTRAINT `fk_hipaa_inc_pat_incident` FOREIGN KEY (`incident_id`) REFERENCES `hipaa_security_incidents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_hipaa_inc_pat_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
