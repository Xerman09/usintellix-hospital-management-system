-- ========================================================
-- Migration: 242_specializations_and_surgery_catalog.sql
-- Module: Specializations, Providers, Surgeries, OR Management
-- Purpose: Surgery Phase 1.
--            * specializations -- one list of medical specializations
--              (surgical / anesthesiology / medical / other), seeded by
--              seed/032_seed_specializations.sql.
--            * provider_specializations -- a doctor's primary
--              specialization plus sub-specializations. providers.specialty
--              (text) is kept, in step with the primary one, for the
--              printouts that read it.
--            * surgeries becomes a surgery-type catalog: specialization,
--              code (PhilHealth RVS), category, default duration and
--              anesthesia, wound class, side/site needed, blood / implants
--              usually needed, default OR fee, active.
--            * surgery_preference_items -- the preference card: instrument
--              sets, supplies and medicines (from the Drug Catalog).
--            * or_surgical_cases: the surgery type, its specialization,
--              the side, and the team as users (lead / assistant surgeon,
--              anesthesiologist, scrub / circulating nurse). The name
--              columns stay as the names shown on the board.
--              "Pre-op cleared" / "consent signed" now default to NO.
--              Deleting a suite no longer deletes its cases.
--            * surgical_safety_checklists: confirmations default to NO.
--          Existing doctors and surgeries are matched to specializations
--          by name. Safe to run again.
-- ========================================================

CREATE TABLE IF NOT EXISTS specializations (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(120) NOT NULL,

    -- surgical | anesthesiology | medical | other
    category VARCHAR(20) NOT NULL DEFAULT 'medical',

    description VARCHAR(255) NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_specializations_name UNIQUE (name),

    INDEX idx_specializations_category (category, is_active)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provider_specializations (

    id INT NOT NULL AUTO_INCREMENT,

    provider_id INT NOT NULL,

    specialization_id INT NOT NULL,

    is_primary TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_provider_specialization UNIQUE (provider_id, specialization_id),

    INDEX idx_ps_specialization (specialization_id),

    CONSTRAINT fk_ps_provider
        FOREIGN KEY (provider_id) REFERENCES providers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_ps_specialization
        FOREIGN KEY (specialization_id) REFERENCES specializations(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Surgery-type catalog
-- ---------------------------------------------------------

ALTER TABLE surgeries
    ADD COLUMN IF NOT EXISTS specialization_id INT NULL AFTER description,
    ADD COLUMN IF NOT EXISTS code VARCHAR(30) NULL AFTER specialization_id,
    -- Major | Minor | Endoscopy
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'Major' AFTER code,
    ADD COLUMN IF NOT EXISTS default_duration_minutes INT NOT NULL DEFAULT 60 AFTER category,
    ADD COLUMN IF NOT EXISTS default_anesthesia_type VARCHAR(40) NULL AFTER default_duration_minutes,
    -- Clean | Clean-Contaminated | Contaminated | Dirty
    ADD COLUMN IF NOT EXISTS wound_class VARCHAR(30) NULL AFTER default_anesthesia_type,
    ADD COLUMN IF NOT EXISTS requires_laterality TINYINT(1) NOT NULL DEFAULT 0 AFTER wound_class,
    ADD COLUMN IF NOT EXISTS usually_needs_blood TINYINT(1) NOT NULL DEFAULT 0 AFTER requires_laterality,
    ADD COLUMN IF NOT EXISTS usually_needs_implants TINYINT(1) NOT NULL DEFAULT 0 AFTER usually_needs_blood,
    ADD COLUMN IF NOT EXISTS default_or_fee DECIMAL(12,2) NULL AFTER usually_needs_implants,
    ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER default_or_fee;

CREATE INDEX IF NOT EXISTS idx_surgeries_specialization ON surgeries (specialization_id, is_active);

ALTER TABLE surgeries
    ADD CONSTRAINT fk_surgeries_specialization
        FOREIGN KEY IF NOT EXISTS (specialization_id) REFERENCES specializations(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;

CREATE TABLE IF NOT EXISTS surgery_preference_items (

    id INT NOT NULL AUTO_INCREMENT,

    surgery_id INT NOT NULL,

    -- instrument | supply | medicine
    item_type VARCHAR(20) NOT NULL DEFAULT 'supply',

    -- Supplies and medicines come from the Drug Catalog; instrument sets are named.
    drug_id INT NULL,

    name VARCHAR(255) NOT NULL,

    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,

    notes VARCHAR(255) NULL,

    sort_order INT NOT NULL DEFAULT 0,

    created_at DATETIME NULL,
    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_spi_surgery (surgery_id, sort_order),

    CONSTRAINT fk_spi_surgery
        FOREIGN KEY (surgery_id) REFERENCES surgeries(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_spi_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- OR cases: surgery type, specialization, side, team as users
-- ---------------------------------------------------------

ALTER TABLE or_surgical_cases
    ADD COLUMN IF NOT EXISTS surgery_id INT NULL AFTER surgical_specialty,
    ADD COLUMN IF NOT EXISTS specialization_id INT NULL AFTER surgery_id,
    -- Left | Right | Bilateral | Not applicable
    ADD COLUMN IF NOT EXISTS laterality VARCHAR(20) NULL AFTER procedure_name,
    ADD COLUMN IF NOT EXISTS lead_surgeon_user_id INT NULL AFTER lead_surgeon,
    ADD COLUMN IF NOT EXISTS assistant_surgeon_user_id INT NULL AFTER assistant_surgeon,
    ADD COLUMN IF NOT EXISTS anesthesiologist_user_id INT NULL AFTER anesthesiologist,
    ADD COLUMN IF NOT EXISTS scrub_nurse_user_id INT NULL AFTER scrub_nurse,
    ADD COLUMN IF NOT EXISTS circulating_nurse_user_id INT NULL AFTER circulating_nurse,
    -- Why the surgeon isn't in the case's specialization (flexible filtering).
    ADD COLUMN IF NOT EXISTS surgeon_override_reason VARCHAR(255) NULL AFTER lead_surgeon_user_id,
    MODIFY COLUMN preop_cleared TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN consent_signed TINYINT(1) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_or_surgery ON or_surgical_cases (surgery_id);
CREATE INDEX IF NOT EXISTS idx_or_specialization ON or_surgical_cases (specialization_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_or_lead_surgeon_user ON or_surgical_cases (lead_surgeon_user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_or_anesthesiologist_user ON or_surgical_cases (anesthesiologist_user_id, scheduled_date);

-- A suite with cases can no longer take its cases with it.
ALTER TABLE or_surgical_cases DROP FOREIGN KEY IF EXISTS fk_or_cases_suite;
ALTER TABLE or_surgical_cases
    ADD CONSTRAINT fk_or_cases_suite
        FOREIGN KEY (or_suite_id) REFERENCES or_suites (id)
        ON UPDATE NO ACTION ON DELETE RESTRICT;

-- ---------------------------------------------------------
-- Safety checklist: nothing is confirmed until someone says so
-- ---------------------------------------------------------

ALTER TABLE surgical_safety_checklists
    MODIFY COLUMN patient_identity_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN surgical_consent_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN site_marking_required TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN site_marked_by_surgeon TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN anesthesia_safety_check_done TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN pulse_oximeter_functioning TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN allergy_check_done TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN time_out_performed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN team_members_introduced TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN patient_name_verbally_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN procedure_verbally_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN site_laterality_verbally_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN patient_position_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN antibiotic_prophylaxis_given TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN antibiotic_timing_within_60min TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN essential_imaging_displayed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN implants_hardware_verified TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN sign_out_performed TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN procedure_recorded_accurately TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN specimen_labeled_correctly TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY COLUMN universal_protocol_compliant TINYINT(1) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------
-- Backfill (needs the specializations seed; harmless before it)
-- ---------------------------------------------------------

-- Doctors: their typed specialty, matched by name, becomes their primary specialization.
INSERT IGNORE INTO provider_specializations (provider_id, specialization_id, is_primary, created_at)
SELECT p.id, s.id, 1, NOW()
FROM providers p
JOIN specializations s ON s.name = TRIM(p.specialty)
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM provider_specializations x WHERE x.provider_id = p.id AND x.is_primary = 1);

-- Existing surgeries.
UPDATE surgeries su JOIN specializations s ON s.name = 'General Surgery'
SET su.specialization_id = s.id
WHERE su.specialization_id IS NULL AND LOWER(su.name) IN ('appendectomy', 'cholecystectomy');

UPDATE surgeries su JOIN specializations s ON s.name = 'Ophthalmology'
SET su.specialization_id = s.id, su.requires_laterality = 1, su.category = 'Minor', su.default_duration_minutes = 30
WHERE su.specialization_id IS NULL AND (su.name LIKE 'ALT O_' OR su.name LIKE 'LPI O_' OR LOWER(su.name) = 'blepharoplasty');

-- Existing OR cases: their typed specialty, matched to the list.
UPDATE or_surgical_cases c
JOIN specializations s ON s.name = CASE c.surgical_specialty
        WHEN 'General Surgery' THEN 'General Surgery'
        WHEN 'Orthopedic Surgery' THEN 'Orthopedics'
        WHEN 'Neurosurgery' THEN 'Neurosurgery'
        WHEN 'Cardiothoracic Surgery' THEN 'Thoracic & Cardiovascular Surgery'
        WHEN 'Plastics & Reconstructive' THEN 'Plastic & Reconstructive Surgery'
        WHEN 'Gastroenterology / GI Surgery' THEN 'General Surgery'
        WHEN 'OB-GYN Surgery' THEN 'Obstetrics & Gynecology'
        WHEN 'Urology' THEN 'Urology'
        WHEN 'Otolaryngology (ENT)' THEN 'Otorhinolaryngology (ENT)'
        WHEN 'Ophthalmology' THEN 'Ophthalmology'
        WHEN 'Vascular Surgery' THEN 'Vascular Surgery'
        WHEN 'Pediatric Surgery' THEN 'Pediatric Surgery'
    END
SET c.specialization_id = s.id
WHERE c.specialization_id IS NULL;
