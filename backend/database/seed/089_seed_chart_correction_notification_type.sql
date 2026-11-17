-- Seed: notification for an answered chart correction (Phase M19)
-- Subsystem: Patient Portal / Notifications. Sent when a clinician accepts or declines a
-- patient's "that does not look right" about an item on their chart.
--
-- Sent on BOTH outcomes, deliberately. A patient who is told only when they are agreed
-- with learns that silence means no, which is the worst possible way to find out -- and a
-- declined correction is the one they most need to read, because it carries the reason and
-- because they may need to take it further.
--
-- The body carries the item the patient asked about, which they named themselves and
-- already know, and the clinician's answer. It does NOT carry the clinical content of the
-- item, and it does not say which list the item came from: "your allergy record" in an
-- email subject tells whoever picks the phone up that the person has an allergy worth
-- recording. {what} is the item label, {outcome} is accepted or declined in plain words,
-- and {response} is the clinician's own sentence.
--
-- Email on, because this is an answer to a question the patient asked and they are
-- waiting for it. SMS off for the same reason as every other type here --
-- PortalNotificationService::SENDABLE is email only, so an SMS row would queue and never
-- send.
--
-- Idempotency: INSERT IGNORE against uq_portal_notification_type (event_type), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_notification_types`
    (`event_type`, `label`, `description`, `title_template`, `body_template`, `link_tab`,
     `default_email`, `default_sms`, `default_in_app`, `is_active`, `sequence`, `created_at`)
VALUES
('chart_correction_answered', 'Your note about your record has been answered',
 'Sent when the clinic answers something you said did not look right on your health record.',
 'Someone has looked at what you told us',
 'You told us something did not look right about {what}. The clinic has now {outcome}. {response}',
 'mychart_chart', 1, 0, 1, 1, 130, NOW());
