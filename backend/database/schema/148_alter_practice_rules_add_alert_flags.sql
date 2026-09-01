-- =============================================
-- Alter: practice_rules -- add independent alert-channel enablement
-- flags for the "Clinical Decision Rules Alert Manager" bulk screen.
--
-- These are deliberately separate from the existing `type` column:
-- `type` categorizes what KIND of rule this is (set once, on the Rule
-- Add/Edit form). These three flags instead track whether the rule is
-- currently switched ON to actually fire through each channel -- a
-- rule can be enabled on none, one, or more than one channel
-- regardless of its `type`, matching how the real Alert Manager grid
-- lets every checkbox be toggled independently per row.
-- =============================================

ALTER TABLE practice_rules

ADD COLUMN is_active_alert TINYINT(1) NOT NULL DEFAULT 0 AFTER type,

ADD COLUMN is_passive_alert TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active_alert,

ADD COLUMN is_patient_reminder TINYINT(1) NOT NULL DEFAULT 0 AFTER is_passive_alert,

ADD COLUMN access_control VARCHAR(50) NULL AFTER is_patient_reminder;
