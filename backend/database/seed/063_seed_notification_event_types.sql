-- Seed 063: My Chart notification types and their templates
-- Subsystem: Patient Portal (My Chart Phase 6). What the portal may tell a patient about,
-- the wording it uses, and which channels are on unless the patient says otherwise.
--
-- NOTE ON THE NUMBER: the plan called this seed 062, but 062 was already taken by
-- 062_seed_checkin_questionnaires.sql in Phase 5, so it is 063.
--
-- Idempotency: INSERT IGNORE against uq_portal_notification_type (event_type), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.
--
-- Templates take {name}, {date}, {time}, {amount} and {what}; anything a template does
-- not use is simply left out. Nothing clinical goes in a notification -- it says that
-- something is ready, never what it says, because email is not a safe place for a result.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_notification_types`
    (`event_type`, `label`, `description`, `title_template`, `body_template`, `link_tab`,
     `default_email`, `default_sms`, `default_in_app`, `is_active`, `sequence`, `created_at`)
VALUES
('result_released', 'A test result is ready',
 'Sent when a result has been checked and released to My Chart.',
 'A new test result is ready',
 'Your result for {what} is now in My Chart. Sign in to read it. If anything needs explaining, your doctor will go through it with you.',
 'mychart_results', 1, 0, 1, 1, 10, NOW()),

('appointment_reminder', 'A reminder about an appointment',
 'Sent the day before a booked appointment.',
 'Your appointment is tomorrow',
 'You have an appointment on {date} at {time}. You can check in from home in My Chart so there is nothing to fill in when you arrive.',
 'mychart_visits', 1, 1, 1, 1, 20, NOW()),

('checkin_open', 'Check-in is open',
 'Sent when e-check-in opens for a booked appointment.',
 'You can check in for your visit',
 'Check-in is open for your appointment on {date}. It takes a couple of minutes and saves time at the desk.',
 'mychart_checkin', 1, 0, 1, 1, 30, NOW()),

('statement_ready', 'A statement or a new charge',
 'Sent when there is a new amount to pay.',
 'You have a new statement',
 'There is {amount} to pay on your account. You can see what it is for, and pay all or part of it, in My Chart.',
 'billing', 1, 0, 1, 1, 40, NOW()),

('payment_received', 'A payment was confirmed',
 'Sent when the hospital confirms a payment.',
 'Your payment is confirmed',
 'We have received {amount}. Your receipt is in My Chart.',
 'billing', 1, 0, 1, 1, 50, NOW()),

('message_reply', 'A reply from your care team',
 'Sent when a member of staff replies to a message.',
 'You have a reply',
 'Someone from your care team has replied. Sign in to My Chart to read it.',
 'messaging', 1, 0, 1, 1, 60, NOW()),

('visit_summary_ready', 'A visit summary is ready',
 'Sent when the summary of a visit, or a signed discharge summary, becomes available.',
 'Your visit summary is ready',
 'The summary of your visit on {date} is now in My Chart.',
 'mychart_visits', 1, 0, 1, 1, 70, NOW()),

('health_maintenance_due', 'Something is due',
 'Sent when a vaccination or screening becomes due or overdue.',
 'Something is due for you',
 '{what} is due. Please book an appointment when you can.',
 'mychart_checkin', 1, 0, 1, 1, 80, NOW());
