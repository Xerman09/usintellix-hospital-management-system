-- 312_blood_crossmatch_and_reservation.sql
-- Blood Bank Management (Part 3): Cross-matching & Reservation Hold Ledger
-- Compatibility Testing (Major / Minor Crossmatch) & 48-Hour Reservation Hold.
-- Locks specific blood units to a patient for scheduled surgery / acute transfusion needs.
-- Automated release of reservation holds after 48 hours back to available stock.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS blood_crossmatches (
    id INT NOT NULL AUTO_INCREMENT,
    crossmatch_number VARCHAR(32) NOT NULL,                -- XM-YYYY-XXXXX
    patient_id INT NOT NULL,                               -- patients.id
    blood_unit_id INT NOT NULL,                            -- blood_inventory_units.id
    order_id INT DEFAULT NULL,                             -- patient_procedure_orders.id (if linked to CPOE lab/transfusion order)
    
    -- Patient & Donor Unit Blood Group at time of testing:
    patient_blood_type VARCHAR(10) NOT NULL,               -- e.g. "O+", "A-", "AB+"
    donor_unit_number VARCHAR(32) NOT NULL,                -- W26-YYYY-XXXXX
    donor_blood_type VARCHAR(10) NOT NULL,                 -- e.g. "O-", "O+", "A-"
    component_type ENUM('prbc', 'ffp', 'platelets', 'cryoprecipitate', 'whole_blood') NOT NULL,
    
    -- Serological Compatibility Phases:
    -- Major Crossmatch: Patient Serum + Donor Red Blood Cells (Checks for recipient antibodies against donor cells)
    immediate_spin_major ENUM('compatible', 'incompatible', 'not_performed') NOT NULL DEFAULT 'compatible',
    thermo_phase_37c_major ENUM('compatible', 'incompatible', 'not_performed') NOT NULL DEFAULT 'compatible',
    ahg_phase_major ENUM('compatible', 'incompatible', 'not_performed') NOT NULL DEFAULT 'compatible', -- Anti-Human Globulin (Coombs)
    
    -- Minor Crossmatch: Patient Red Blood Cells + Donor Plasma (Checks for donor antibodies against recipient cells)
    minor_crossmatch_result ENUM('compatible', 'incompatible', 'not_performed') NOT NULL DEFAULT 'compatible',
    
    -- Overall Clinical Compatibility:
    overall_compatibility ENUM('compatible', 'incompatible', 'least_incompatible_approved') NOT NULL DEFAULT 'compatible',
    compatibility_notes TEXT DEFAULT NULL,
    
    -- 48-Hour Reservation Hold:
    reservation_status ENUM('active_hold', 'issued', 'transfused', 'hold_expired', 'cancelled_released') NOT NULL DEFAULT 'active_hold',
    reserved_at DATETIME NOT NULL,
    reservation_expires_at DATETIME NOT NULL,              -- NOW() + INTERVAL 48 HOUR
    clinical_indication VARCHAR(255) DEFAULT NULL,         -- e.g. "Elective Coronary Artery Bypass Graft (CABG)", "STAT Trauma"
    scheduled_surgery_date DATETIME DEFAULT NULL,
    
    -- Medical Technologist Audit:
    performed_by INT DEFAULT NULL,                         -- users.id
    medtech_license_no VARCHAR(50) DEFAULT NULL,           -- PRC MedTech license
    released_at DATETIME DEFAULT NULL,
    released_by INT DEFAULT NULL,
    release_reason VARCHAR(255) DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_blood_xm_no (crossmatch_number),
    KEY idx_blood_xm_patient (patient_id, reservation_status),
    KEY idx_blood_xm_unit (blood_unit_id, reservation_status),
    KEY idx_blood_xm_expires (reservation_expires_at, reservation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_crossmatch_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
