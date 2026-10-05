-- Surgery Phase 6: OR charges.
--
--   or_charges            what a surgery costs the patient: OR room fee,
--                         surgeon / assistant / anesthesia professional
--                         fees, and the supplies, medicines and implants
--                         used (at most one live charge per or_case_items
--                         row; removing the item voids its charge).
--                         Merged into the patient ledger as type
--                         'Surgery'. Kept apart from
--                         encounter_billing_codes so they never reach
--                         claims / EDI.
--   surgeries             gains default surgeon and anesthesia fees, and
--                         the PhilHealth case rate (code and amount) --
--                         recorded only, not yet deducted from the bill.
--   or_surgical_cases     gains billing status and the discount used.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS or_charges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    patient_id INT NOT NULL,
    charge_type VARCHAR(20) NOT NULL,
    item_id INT NULL,
    provider_user_id INT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    charge_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'charged',
    voided_at DATETIME NULL,
    voided_by INT NULL,
    void_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    INDEX idx_orc_item (item_id),
    INDEX idx_orc_case (case_id, status),
    INDEX idx_orc_patient (patient_id, charge_date),
    CONSTRAINT fk_orc_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id),
    CONSTRAINT fk_orc_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
    CONSTRAINT fk_orc_item FOREIGN KEY (item_id) REFERENCES or_case_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE surgeries
    ADD COLUMN IF NOT EXISTS default_surgeon_fee DECIMAL(12,2) NULL AFTER default_or_fee,
    ADD COLUMN IF NOT EXISTS default_anesthesia_fee DECIMAL(12,2) NULL AFTER default_surgeon_fee,
    ADD COLUMN IF NOT EXISTS philhealth_case_rate_code VARCHAR(30) NULL AFTER default_anesthesia_fee,
    ADD COLUMN IF NOT EXISTS philhealth_case_rate_amount DECIMAL(12,2) NULL AFTER philhealth_case_rate_code;

ALTER TABLE or_surgical_cases
    ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) NOT NULL DEFAULT 'unbilled' AFTER patient_surgery_id,
    ADD COLUMN IF NOT EXISTS billed_at DATETIME NULL AFTER billing_status,
    ADD COLUMN IF NOT EXISTS billed_by INT NULL AFTER billed_at,
    ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NULL AFTER billed_by,
    ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER discount_type,
    ADD COLUMN IF NOT EXISTS discount_id_no VARCHAR(50) NULL AFTER discount_rate,
    ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) NULL AFTER discount_id_no;

CREATE INDEX IF NOT EXISTS idx_or_billing ON or_surgical_cases (billing_status, scheduled_date);
