-- Seed: notification for an answered e-visit (Phase M15a)
-- Subsystem: Patient Portal / Notifications. One row in portal_notification_types, so a
-- patient learns a clinician has replied rather than having to keep opening the app.
--
-- Email on, SMS off, matching questionnaire_assigned and estimate_ready: it is a nudge.
--
-- The wording carries no clinical content at all -- not the reply, not the complaint, not
-- the outcome. An e-visit about a water infection or a medicine for a mental health
-- condition says something about the patient, and a notification is read by whoever
-- picks the phone up. It says a reply is waiting; the reply itself lives behind the login.
--
-- Deliberately no notification for a REFUSED e-visit. A red-flag refusal tells the
-- patient to go to hospital now, on screen, at the moment they submit. Following that
-- with an email would imply there is something to come back and read, and a patient who
-- waits for an email instead of going is the exact outcome the refusal exists to prevent.
--
-- {ref} is the e-visit reference number.
--
-- Idempotency: INSERT IGNORE against uq_portal_notification_type (event_type), so
-- re-running changes nothing and leaves wording the hospital has since edited alone.

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_notification_types`
    (`event_type`, `label`, `description`, `title_template`, `body_template`, `link_tab`,
     `default_email`, `default_sms`, `default_in_app`, `is_active`, `sequence`, `created_at`)
VALUES
('evisit_answered', 'A reply to your online visit',
 'Sent when a clinician has replied to an e-visit you raised.',
 'There is a reply waiting for you',
 'A clinician has replied to the online visit you raised (reference {ref}). You can read it in My Chart.',
 'mychart_evisits', 1, 0, 1, 1, 90, NOW());
