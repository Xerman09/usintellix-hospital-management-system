-- Seed: notifications for Fast Pass (Phase M18)
-- Subsystem: Patient Portal / Notifications. Two types: an earlier slot has been offered,
-- and an appointment has been moved into one.
--
-- WHY THE OFFER GOES TO EMAIL AND THE OTHER PORTAL NOTIFICATIONS MOSTLY DO NOT
--
-- This is the only portal notification with a deadline on it. An in-app-only message is
-- fine for "your readings were added" -- the patient finds it next time they open the
-- app, and nothing is lost by that being Thursday. A four-hour offer found on Thursday is
-- an offer nobody could take, and a patient who later learns they were offered a slot and
-- never told is worse off than one who was never offered it. So email is on.
--
-- WHY SMS IS OFF, EVEN THOUGH SMS IS THE RIGHT CHANNEL FOR THIS
--
-- It is the right channel and it is still off, because PortalNotificationService::SENDABLE
-- contains 'email' only. An SMS row queues and is never drained. For a reminder that is
-- merely a dormant row; for a time-limited offer it is a trap -- the day somebody wires up
-- an SMS sender, the backlog would deliver a pile of offers for slots that passed months
-- ago, each one reading as though it were live. Turning this on is a two-line change once
-- there is a sender, and it should be made then and not before.
--
-- (`appointment_reminder` already defaults SMS on and has the same latent backlog. That is
-- not this phase's to change, but it is worth knowing before an SMS sender is connected.)
--
-- WHAT THE WORDING MUST AND MUST NOT DO
--
-- It must NOT promise the slot. Offers go to a few patients at once, first come first
-- served, so by the time this is read the slot may be gone -- and a message that implied
-- otherwise would turn a near miss into a broken promise. "If it has already gone we will
-- keep you on the list" is the honest version and it is also the reassuring one.
--
-- It must carry the deadline, because an offer without one is an offer the patient cannot
-- judge. {until} is a full date and time rather than "4 hours", which is unreadable by the
-- time an email has sat in an inbox.
--
-- It must NOT say why the slot came free. "Someone cancelled" is another patient's
-- business, and in a small clinic it is identifying.
--
-- {date}/{time} are the offered slot, {doctor} who it is with, {until} the deadline, and
-- {was} the appointment it would replace -- so the patient can see the trade without
-- opening anything.
--
-- The two rows link to DIFFERENT tabs, which is the point of having two. The offer links
-- to Fast Pass, where it can be answered; sending somebody to their appointment list with
-- a four-hour deadline running would be a message that tells them to act and then puts
-- them on the wrong screen. The confirmation links to the appointment list, because by
-- then the appointment is the thing they want to look at.
--
-- Idempotency: INSERT IGNORE against uq_portal_notification_type (event_type), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_notification_types`
    (`event_type`, `label`, `description`, `title_template`, `body_template`, `link_tab`,
     `default_email`, `default_sms`, `default_in_app`, `is_active`, `sequence`, `created_at`)
VALUES
('fastpass_offer', 'An earlier appointment is free',
 'Sent when an earlier slot comes free with your doctor and you have asked to be offered one.',
 'An earlier appointment is free on {date}',
 'An earlier slot has come free with {doctor} on {date} at {time}. If you take it, your appointment on {was} moves to that time instead. Please answer by {until}. A few patients are offered the same slot, so it may already have gone -- if so you stay on the list for the next one.',
 'mychart_fastpass', 1, 0, 1, 1, 110, NOW()),

('fastpass_moved', 'Your appointment has been moved earlier',
 'Sent when you accept an earlier slot and your appointment moves into it.',
 'Your appointment is now {date} at {time}',
 'Your appointment has been moved earlier, to {date} at {time} with {doctor}. It was {was}. Nothing else about the appointment has changed, and you will get the usual reminder before the new date.',
 'mychart_visits', 1, 0, 1, 1, 120, NOW());
