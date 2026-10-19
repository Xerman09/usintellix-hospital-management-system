-- =====================================================================
-- Seed: 056_seed_patient_contact_histories.sql
-- Description: Backfill active contact & address records from patient_contacts
--              into patient_contact_histories as initial active entries.
-- =====================================================================

INSERT INTO `patient_contact_histories` (
    `patient_id`,
    `address_type`,
    `address_line`,
    `city`,
    `province`,
    `postal_code`,
    `country`,
    `home_phone`,
    `mobile_phone`,
    `work_phone`,
    `email`,
    `effective_from`,
    `effective_to`,
    `is_current`,
    `change_reason`,
    `created_at`,
    `created_by`
)
SELECT 
    c.`patient_id`,
    'residential',
    c.`address_line`,
    c.`city`,
    c.`province`,
    c.`zip_code`,
    'Philippines',
    c.`home_phone`,
    c.`mobile_phone`,
    c.`work_phone`,
    c.`email`,
    COALESCE(DATE(c.`created_at`), CURDATE()),
    NULL,
    1,
    'Initial Patient Registration',
    COALESCE(c.`created_at`, NOW()),
    c.`created_by`
FROM `patient_contacts` c
WHERE NOT EXISTS (
    SELECT 1 FROM `patient_contact_histories` h 
    WHERE h.`patient_id` = c.`patient_id` AND h.`address_type` = 'residential'
);
