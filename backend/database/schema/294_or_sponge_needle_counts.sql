-- ============================================================================
-- Migration 294: Surgical Sponge, Sharps, Needle & Instrument Count Reconciliation
-- Table: or_sponge_needle_counts
-- ============================================================================
-- Prevents Retained Surgical Items (RSI) by enforcing itemized count
-- reconciliation across Initial, Cavity Closure, and Final Skin Closure counts
-- with mandatory dual digital sign-offs from both the Scrub Nurse and the
-- Circulating Nurse at each phase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `or_sponge_needle_counts` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `count_record_number` VARCHAR(40) NOT NULL COMMENT 'Unique Count Sheet No e.g. CNT-20261021-0001',
    `surgical_case_id` INT UNSIGNED NOT NULL COMMENT 'FK to or_surgical_cases.id',
    `patient_id` INT UNSIGNED NULL COMMENT 'FK to patients.id',

    -- 1. Laparotomy Sponges / Packs (Radiopaque Tape)
    `lap_sponges_initial` INT NOT NULL DEFAULT 10,
    `lap_sponges_added` INT NOT NULL DEFAULT 0,
    `lap_sponges_closure_counted` INT NOT NULL DEFAULT 10,
    `lap_sponges_final_counted` INT NOT NULL DEFAULT 10,

    -- 2. Raytec / 4x4 Radiopaque Gauze Sponges
    `raytec_sponges_initial` INT NOT NULL DEFAULT 20,
    `raytec_sponges_added` INT NOT NULL DEFAULT 0,
    `raytec_sponges_closure_counted` INT NOT NULL DEFAULT 20,
    `raytec_sponges_final_counted` INT NOT NULL DEFAULT 20,

    -- 3. Suture Needles (Atraumatic & Free Needles)
    `suture_needles_initial` INT NOT NULL DEFAULT 12,
    `suture_needles_added` INT NOT NULL DEFAULT 0,
    `suture_needles_closure_counted` INT NOT NULL DEFAULT 12,
    `suture_needles_final_counted` INT NOT NULL DEFAULT 12,

    -- 4. Scalpel Blades, Hypodermic Needles, Bovie Tips & Sharps
    `blades_sharps_initial` INT NOT NULL DEFAULT 4,
    `blades_sharps_added` INT NOT NULL DEFAULT 0,
    `blades_sharps_closure_counted` INT NOT NULL DEFAULT 4,
    `blades_sharps_final_counted` INT NOT NULL DEFAULT 4,

    -- 5. Surgical Instruments (Forceps, Clamps, Retractors, Scissors)
    `instruments_initial` INT NOT NULL DEFAULT 45,
    `instruments_added` INT NOT NULL DEFAULT 0,
    `instruments_closure_counted` INT NOT NULL DEFAULT 45,
    `instruments_final_counted` INT NOT NULL DEFAULT 45,

    `custom_items_json` LONGTEXT NULL COMMENT 'Optional JSON array for vessel loops, bulldogs, neuro patties, peanuts',

    -- Phase 1: Initial Baseline Count (Before Surgical Incision) — Dual Sign-Off
    `initial_count_status` ENUM('Pending', 'Verified & Baseline Locked') NOT NULL DEFAULT 'Verified & Baseline Locked',
    `initial_scrub_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Maria Santos (Scrub Nurse)',
    `initial_scrub_signature` VARCHAR(180) NULL,
    `initial_circulating_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Angela Reyes (Circulating Nurse)',
    `initial_circulating_signature` VARCHAR(180) NULL,
    `initial_counted_at` DATETIME NULL,

    -- Phase 2: Cavity / Peritoneal Closure Count (First Closing Count) — Dual Sign-Off
    `closure_count_status` ENUM('Pending', 'Reconciled — Correct', 'Discrepancy — Unresolved', 'Discrepancy — Resolved via Recount/X-Ray') NOT NULL DEFAULT 'Reconciled — Correct',
    `closure_scrub_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Maria Santos (Scrub Nurse)',
    `closure_scrub_signature` VARCHAR(180) NULL,
    `closure_circulating_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Angela Reyes (Circulating Nurse)',
    `closure_circulating_signature` VARCHAR(180) NULL,
    `closure_counted_at` DATETIME NULL,

    -- Phase 3: Final Skin Closure Count (Before Patient Leaves OR) — Dual Sign-Off
    `final_count_status` ENUM('Pending', 'Reconciled — Correct', 'Discrepancy — Unresolved', 'Discrepancy — Resolved via Recount/X-Ray') NOT NULL DEFAULT 'Reconciled — Correct',
    `final_scrub_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Maria Santos (Scrub Nurse)',
    `final_scrub_signature` VARCHAR(180) NULL,
    `final_circulating_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Angela Reyes (Circulating Nurse)',
    `final_circulating_signature` VARCHAR(180) NULL,
    `final_counted_at` DATETIME NULL,

    -- Retained Surgical Item (RSI) Safety & Discrepancy Escalation Protocol
    `has_discrepancy` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if any category Final Count != (Initial + Added)',
    `surgeon_notified_of_count` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Attending Surgeon verbally notified of count result',
    `intraop_xray_ordered` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Intra-op C-Arm / Portable X-Ray performed for unresolved count',
    `intraop_xray_findings` VARCHAR(255) NULL COMMENT 'e.g. Negative for radiopaque foreign body',
    `discrepancy_resolution_notes` TEXT NULL,
    `attending_surgeon_acknowledgment` VARCHAR(180) NULL,
    `overall_reconciliation_status` ENUM(
        'In Progress',
        'All Counts Correct & Dual-Signed',
        'Count Discrepancy — X-Ray Protocol Active',
        'Resolved with Attending Surgeon Sign-Off'
    ) NOT NULL DEFAULT 'In Progress',
    `recorded_by_user_id` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_or_sponge_count_record_no` (`count_record_number`),
    KEY `idx_or_sponge_count_case` (`surgical_case_id`),
    KEY `idx_or_sponge_count_patient` (`patient_id`),
    KEY `idx_or_sponge_count_status` (`overall_reconciliation_status`, `has_discrepancy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
