-- ============================================================================
-- Migration: 339_portal_cost_estimates.sql
-- My Chart Phase M16: what a planned procedure or admission will cost.
--
-- A patient can browse the hospital's priced packages, ask for a written
-- estimate, and read the one the desk issues them. The estimate says what is
-- included, what is not, and what could make the final bill differ.
--
-- Three things the existing billing tables could not do, which is why these
-- tables exist rather than the portal reading billing_service_packages directly.
--
-- 1. THERE IS NO TARIFF VERSION.
--
--    The plan for this phase said an estimate "must record the tariff version it
--    was produced from". There is no such thing to record. In
--    billing_tariff_master, effective_start_date and effective_end_date are NULL
--    on all 17 rows, and every row shares one updated_at. billing_tariff_counters
--    sounds like it versions tariffs but does not -- it is the document numbering
--    table (ATTENDANCE_LOG, BIOMED_CAL, CSSD_BATCH and so on).
--
--    So an estimate snapshots instead. Every price it quotes is copied onto the
--    estimate and its lines, together with source_updated_at (the latest
--    updated_at across the rows it was priced from) and source_fingerprint (a
--    hash of those rows' prices). That makes an estimate reproducible, and lets
--    the desk see that the tariff has moved since one was issued -- which is the
--    thing a version number would have been used for anyway.
--
--    The currency is snapshotted for the same reason. An estimate issued in one
--    currency must not silently re-read as another because business_settings
--    changed afterwards.
--
-- 2. THE PACKAGE ITEMISATION DOES NOT ADD UP, AND MUST NOT BE SHOWN WHEN IT
--    DOES NOT.
--
--    Of the four packages on file, exactly one reconciles:
--
--      PKG-MAT-001  items 24,500 == discounted 24,500          reconciles
--      PKG-SUR-001  items 50,350 vs 58,000 / 65,000            short by 7,650
--      PKG-EXC-001  items  9,950 vs  9,999 / 12,500            short by 49
--      PKG-MAT-002  NO items at all, priced at 48,000          nothing to show
--
--    A breakdown that does not sum to the price being quoted is worse than no
--    breakdown: it invites the patient to ask why the hospital's own list
--    disagrees with the hospital's own total, and there is no good answer. So
--    breakdown_state records, per estimate, whether a line-by-line view was
--    available, and the lines are only copied when they reconcile. The prose in
--    inclusions_summary and exclusions_summary is good and is always shown.
--
-- 3. billing_package_items.item_code LOOKS LIKE A TARIFF CODE AND IS NOT ONE.
--
--    tariff_id is NULL on all 14 package item rows, and the item_code values
--    collide with real tariff codes while meaning something else entirely:
--
--      package 1, "TAR-CNS-001", "Attending Obstetrician Delivery Care", 9,000
--      tariff     TAR-CNS-001    "General Physician / OPD Consultation",   500
--
--    Joining those two would show a patient the wrong service at the wrong
--    price. Nothing in this phase joins package items to the tariff master by
--    code, and the lines table below keeps its own snapshotted label and price
--    so it never needs to.
--
-- Surcharges are not applied. Tariff rows carry emergency (20-35%), night
-- differential (15-25%) and holiday (20-50%) percentages, and an estimate for
-- planned care is priced at the standard rate. The patient is told in words that
-- out-of-hours or emergency care costs more, because that is the most common
-- reason a real bill exceeds an estimate.
--
-- Nothing here is a bill, a quote in the contractual sense, or a guarantee of
-- insurance payment. patient_insurances records what cover the hospital holds
-- (Phase M12); whether an insurer pays is the insurer's decision.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- The estimate itself.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_cost_estimates` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `patient_id` INT(11) NOT NULL,

    -- A reference a patient can quote on the phone. Assigned by the service.
    `estimate_no` VARCHAR(40) NOT NULL,

    -- Where the price came from. 'package' is a bundled price from
    -- billing_service_packages; 'itemised' is a set of lines the desk built by
    -- hand, which is the only way to estimate something with no package.
    `source_type` ENUM('package', 'itemised') NOT NULL DEFAULT 'package',
    `package_id` INT(10) UNSIGNED NULL,

    -- Snapshotted, not joined. A package renamed or repriced later must not
    -- change what a patient was already told.
    `title` VARCHAR(255) NOT NULL,
    `package_code` VARCHAR(50) NULL,

    -- Which of the two package prices was quoted. Both exist on every package
    -- and they differ, so the desk says which one applies rather than this
    -- guessing.
    `price_basis` ENUM('standard', 'discounted', 'itemised') NOT NULL DEFAULT 'standard',
    `standard_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discounted_total` DECIMAL(12, 2) NULL,
    `quoted_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Tax is honoured rather than assumed: every tariff and package row
    -- currently has taxability_flag = 0, so this is 0.00 today, but
    -- business_settings carries a 12% VAT rate that would apply if that changed.
    `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax_name` VARCHAR(50) NULL,

    -- Currency as it was when the estimate was issued. See note 1 above.
    `currency_code` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '$',
    `currency_position` ENUM('prefix', 'suffix') NOT NULL DEFAULT 'prefix',
    `decimal_places` TINYINT(3) UNSIGNED NOT NULL DEFAULT 2,

    -- The package's own prose, snapshotted. Always shown; it is the most useful
    -- part of the estimate and the part that is reliably correct.
    `includes_text` TEXT NULL,
    `excludes_text` TEXT NULL,

    -- Whether the line-by-line view could be shown, and why not when it could
    -- not. See note 2 above.
    `breakdown_state` ENUM('reconciled', 'unavailable', 'none') NOT NULL DEFAULT 'none',
    `breakdown_note` VARCHAR(255) NULL,

    -- Reproducibility, in place of the tariff version that does not exist.
    `source_updated_at` DATETIME NULL,
    `source_fingerprint` VARCHAR(64) NULL,
    `priced_at` DATETIME NOT NULL,

    -- An estimate that never goes stale is a promise nobody made.
    `valid_until` DATE NULL,

    `status` ENUM('draft', 'issued', 'withdrawn') NOT NULL DEFAULT 'draft',

    -- Free text from the desk, read by the patient. For "your surgeon has asked
    -- for two extra nights, which is not in this figure".
    `note_to_patient` TEXT NULL,

    -- What the hospital holds on file at the time of issue, so the estimate can
    -- say "you have cover recorded" without implying the insurer will pay.
    `insurance_on_file` TINYINT(1) NOT NULL DEFAULT 0,
    `hmo_covered` TINYINT(1) NOT NULL DEFAULT 0,

    `prepared_by` INT(11) NULL,
    `issued_at` DATETIME NULL,
    `withdrawn_at` DATETIME NULL,
    `withdrawn_by` INT(11) NULL,
    `withdraw_reason` VARCHAR(255) NULL,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    `deleted_by` INT(11) NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_portal_estimate_no` (`estimate_no`),
    KEY `idx_portal_estimate_patient` (`patient_id`, `status`, `deleted_at`),
    KEY `idx_portal_estimate_package` (`package_id`),
    KEY `idx_portal_estimate_issued` (`issued_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- The lines, when there are any that reconcile.
--
-- Every column is a snapshot. Nothing here points at billing_package_items,
-- deliberately: those rows carry an item_code that collides with real tariff
-- codes while naming a different service (note 3 above), and a later edit to a
-- package must not rewrite an estimate a patient is holding.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_cost_estimate_lines` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `estimate_id` INT(11) NOT NULL,
    `sequence` INT(11) NOT NULL DEFAULT 0,

    `label` VARCHAR(255) NOT NULL,
    `detail` VARCHAR(255) NULL,
    `quantity` DECIMAL(8, 2) NOT NULL DEFAULT 1.00,
    `unit_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_portal_estimate_line` (`estimate_id`, `sequence`),
    CONSTRAINT `fk_portal_estimate_line_estimate`
        FOREIGN KEY (`estimate_id`) REFERENCES `portal_cost_estimates` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- A patient asking what something will cost.
--
-- Same shape as M12's insurance requests and M14's care-gap requests: asking is
-- not getting. The desk answers by issuing an estimate, and estimate_id links
-- the answer back to the question.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_estimate_requests` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `patient_id` INT(11) NOT NULL,

    -- Either a package they picked from the catalogue, or free text describing
    -- what they have been told they need. Both are allowed to be present: "the
    -- gallbladder package, but my surgeon mentioned an extra night".
    `package_id` INT(10) UNSIGNED NULL,
    `asked_about` VARCHAR(255) NULL,
    `note` VARCHAR(500) NULL,

    `status` ENUM('pending', 'answered', 'declined', 'withdrawn') NOT NULL DEFAULT 'pending',
    `estimate_id` INT(11) NULL,

    `reviewed_by` INT(11) NULL,
    `reviewed_at` DATETIME NULL,
    `review_note` VARCHAR(500) NULL,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    `deleted_by` INT(11) NULL,

    PRIMARY KEY (`id`),
    KEY `idx_portal_estimate_req_patient` (`patient_id`, `status`, `deleted_at`),
    KEY `idx_portal_estimate_req_status` (`status`, `created_at`),
    CONSTRAINT `fk_portal_estimate_req_estimate`
        FOREIGN KEY (`estimate_id`) REFERENCES `portal_cost_estimates` (`id`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Which packages a patient may browse.
--
-- Not every package on file is something to put in front of a patient, and the
-- decision is per package rather than a blanket switch -- the same reasoning as
-- M14's portal_health_maintenance_items. A package with no usable breakdown can
-- still be shown (the prose is the useful part); one that is an internal
-- arrangement should not be.
--
-- patient_blurb is here because package_name is written for staff
-- ("Laparoscopic Cholecystectomy Surgical Package") and a patient looking for
-- the cost of gallbladder surgery will not search for that.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_package_visibility` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `package_id` INT(10) UNSIGNED NOT NULL,

    `patient_label` VARCHAR(255) NOT NULL,
    `patient_blurb` VARCHAR(500) NULL,
    `is_patient_visible` TINYINT(1) NOT NULL DEFAULT 0,
    `hide_reason` VARCHAR(255) NULL,
    `sequence` INT(11) NOT NULL DEFAULT 0,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` INT(11) NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_portal_package_visibility` (`package_id`),
    KEY `idx_portal_package_visible` (`is_patient_visible`, `sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Policy. Separate switches, because a hospital may be willing to publish
-- prices without inviting written estimate requests it has nobody to answer.
-- ----------------------------------------------------------------------------
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_allow_cost_estimates` TINYINT(1) NOT NULL DEFAULT 1
        COMMENT 'M16: patients can see priced packages and their own estimates',
    ADD COLUMN IF NOT EXISTS `portal_allow_estimate_requests` TINYINT(1) NOT NULL DEFAULT 1
        COMMENT 'M16: patients can ask the desk for a written estimate',
    ADD COLUMN IF NOT EXISTS `portal_estimate_valid_days` INT(11) NOT NULL DEFAULT 30
        COMMENT 'M16: how long an issued estimate is presented as current',
    ADD COLUMN IF NOT EXISTS `portal_estimate_max_pending` INT(11) NOT NULL DEFAULT 3
        COMMENT 'M16: how many unanswered estimate requests one patient may have';
