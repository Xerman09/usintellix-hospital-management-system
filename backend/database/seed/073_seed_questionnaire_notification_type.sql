-- Seed 073: the "a questionnaire is waiting for you" notification type (Phase M13)
-- Subsystem: Patient Portal. A questionnaire a clinician sends between visits is no use
-- sitting unseen in the To-Do list, so assigning one queues this notification.
--
-- SMS is off by default and email is on, matching checkin_open: it is a nudge, not news.
-- Nothing clinical goes in it -- it says a questionnaire is waiting and what it is called,
-- never why it was sent, because the reason can be as revealing as a result.
--
-- {what} is the questionnaire's title, {date} its due date.
--
-- Idempotency: INSERT IGNORE against uq_portal_notification_type (event_type), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_notification_types`
    (`event_type`, `label`, `description`, `title_template`, `body_template`, `link_tab`,
     `default_email`, `default_sms`, `default_in_app`, `is_active`, `sequence`, `created_at`)
VALUES
('questionnaire_assigned', 'A questionnaire to fill in',
 'Sent when someone in your care team asks you to answer a questionnaire at home.',
 'There is a questionnaire waiting for you',
 'Your care team has asked you to answer "{what}" by {date}. It is in My Chart and takes a few minutes. Your answers go straight to the team looking after you.',
 'mychart_questionnaires', 1, 0, 1, 1, 70, NOW());
