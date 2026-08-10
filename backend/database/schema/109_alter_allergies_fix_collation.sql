-- =============================================
-- Alter: allergies
-- The `allergies` table drifted to collation utf8mb4_uca1400_ai_ci at
-- some point, while every other table in this database (default
-- utf8mb4_unicode_ci) uses utf8mb4_unicode_ci. Any query that UNIONs or
-- joins allergies' text columns against another table's fails with
-- "Illegal mix of collations" -- e.g. EncounterService::listLinkableIssues()
-- (GET /encounters/issues), which UNIONs allergies.name against
-- patient_medical_problems.title / patient_medications.title /
-- patient_health_concerns.title. Normalizing back to the database's
-- standard collation fixes this at the source instead of patching every
-- query that happens to touch this table alongside another.
-- =============================================

ALTER TABLE allergies
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
