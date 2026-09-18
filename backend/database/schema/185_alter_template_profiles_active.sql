-- =============================================
-- Alter: template_profiles
-- Adds `active` for the "Profiles in Portal" table's Active checkbox --
-- an inactive profile stays saved but is no longer offered as a Load
-- shortcut in normal use. Defaults to 1 so every existing profile stays
-- active.
-- =============================================

ALTER TABLE template_profiles
    ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER name;
