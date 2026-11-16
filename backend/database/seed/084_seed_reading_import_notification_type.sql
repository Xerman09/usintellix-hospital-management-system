-- Seed: notification for imported readings (Phase M17a)
-- Subsystem: Patient Portal / Notifications. Sent when somebody at the clinic loads
-- readings into a patient's record on their behalf.
--
-- Deliberately NOT sent when the patient's own phone syncs. They did it; telling them
-- they did it is noise, and a daily sync would produce a daily email.
--
-- Email off, in-app on, which is the opposite of the other portal notifications and is
-- the point: this is a "for your information, your record changed" message, not something
-- needing action. It belongs in the app where the readings are, not in an inbox.
--
-- Carries counts, never values. A blood sugar in an email says something about the
-- patient to whoever reads the phone, and M7 already keeps the numbers behind the login.
--
-- {count} is how many readings landed, {source} where they came from.
--
-- Idempotency: INSERT IGNORE against uq_portal_notification_type (event_type), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_notification_types`
    (`event_type`, `label`, `description`, `title_template`, `body_template`, `link_tab`,
     `default_email`, `default_sms`, `default_in_app`, `is_active`, `sequence`, `created_at`)
VALUES
('readings_imported', 'Readings added to your record',
 'Sent when the clinic loads readings from your health app or device into your record.',
 'Readings have been added to your record',
 'The clinic has added {count} readings from {source} to Track My Health. You can see them in My Chart, and tell us if any of them do not look like yours.',
 'mychart_track', 0, 0, 1, 1, 100, NOW());
