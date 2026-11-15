-- Seed: notification for an issued cost estimate (Phase M16)
-- Subsystem: Patient Portal / Notifications. One row in portal_notification_types, so a
-- patient learns that the written estimate they asked for is ready rather than having to
-- keep checking.
--
-- Email on, SMS off, matching questionnaire_assigned and checkin_open: it is a nudge.
--
-- The wording carries no figure. A money amount in an email or an SMS is read by whoever
-- picks the phone up, and an estimate for a caesarean or a cancer screening says
-- something about the patient before they have chosen to share it. The number lives
-- behind the login; the notification only says it is there.
--
-- {what} is the estimate's title as the patient sees it, {ref} its reference number.
--
-- Idempotency: INSERT IGNORE against uq_portal_notification_type (event_type), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_notification_types`
    (`event_type`, `label`, `description`, `title_template`, `body_template`, `link_tab`,
     `default_email`, `default_sms`, `default_in_app`, `is_active`, `sequence`, `created_at`)
VALUES
('estimate_ready', 'A cost estimate is ready',
 'Sent when the billing desk has prepared the written estimate you asked for.',
 'Your cost estimate is ready',
 'The estimate you asked for about "{what}" is ready to read in My Chart (reference {ref}). It shows what is included, what is not, and how long the figure holds good for.',
 'mychart_estimates', 1, 0, 1, 1, 80, NOW());
