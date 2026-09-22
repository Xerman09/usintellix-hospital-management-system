-- =============================================================================
-- Migration 200: Patient Consent & NPP Signature Capture (HIPAA ss 164.520)
-- =============================================================================
ALTER TABLE `users`
    ADD COLUMN `npp_acknowledged`    TINYINT(1)   NOT NULL DEFAULT 0    AFTER `password_changed_at`,
    ADD COLUMN `npp_acknowledged_at` DATETIME     NULL                   AFTER `npp_acknowledged`,
    ADD COLUMN `npp_acknowledged_ip` VARCHAR(45)  NULL                   AFTER `npp_acknowledged_at`,
    ADD COLUMN `npp_signature_type`  VARCHAR(20)  NULL                   AFTER `npp_acknowledged_ip`,
    ADD COLUMN `npp_signature_data`  TEXT         NULL                   AFTER `npp_signature_type`,
    ADD COLUMN `npp_version`         VARCHAR(20)  NULL                   AFTER `npp_signature_data`;

CREATE TABLE IF NOT EXISTS `npp_consent_log` (
    `id`              INT          NOT NULL AUTO_INCREMENT,
    `user_id`         INT          NOT NULL,
    `patient_id`      INT          NULL,
    `acknowledged_at` DATETIME     NOT NULL,
    `acknowledged_ip` VARCHAR(45)  NULL,
    `signature_type`  VARCHAR(20)  NOT NULL,
    `signature_data`  TEXT         NULL,
    `npp_version`     VARCHAR(20)  NOT NULL,
    `captured_by`     INT          NULL,
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_npp_log_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`),
    CONSTRAINT `fk_npp_log_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
