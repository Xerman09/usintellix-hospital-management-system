-- =============================================
-- Alter: related_persons
-- Adds proxy portal access: links a related person to an actual system
-- user account (their own login) so that user can act as the patient
-- across the portal. proxy_user_id is nullable -- most related persons
-- are contact-only records with no portal access. proxy_status is kept
-- separate from can_receive_medical_info so a link can be revoked
-- (audit trail preserved) without losing the underlying consent record.
-- =============================================

ALTER TABLE related_persons
    ADD COLUMN proxy_user_id INT NULL AFTER can_receive_medical_info;

ALTER TABLE related_persons
    ADD COLUMN proxy_status ENUM('active', 'revoked') NULL AFTER proxy_user_id;

ALTER TABLE related_persons
    ADD COLUMN proxy_linked_at DATETIME NULL AFTER proxy_status;

ALTER TABLE related_persons
    ADD COLUMN proxy_linked_by INT NULL AFTER proxy_linked_at;

ALTER TABLE related_persons
    ADD COLUMN proxy_revoked_at DATETIME NULL AFTER proxy_linked_by;

ALTER TABLE related_persons
    ADD COLUMN proxy_revoked_by INT NULL AFTER proxy_revoked_at;

ALTER TABLE related_persons
    ADD INDEX idx_related_persons_proxy_user (proxy_user_id);

ALTER TABLE related_persons
    ADD CONSTRAINT fk_related_persons_proxy_user
        FOREIGN KEY (proxy_user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION;
