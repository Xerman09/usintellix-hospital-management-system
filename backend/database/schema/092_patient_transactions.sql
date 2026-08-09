-- =============================================
-- Table: patient_transactions
-- Records a patient's transactions (OpenEMR "Patient Transactions"). Only
-- the Referral transaction type is implemented for now, so most columns
-- below are the Referral / Counter-Referral form fields; transaction_type
-- is kept as a free column so other transaction types can be added later
-- without a schema change.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_transactions (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    transaction_type VARCHAR(50) NOT NULL DEFAULT 'referral',

    sent_summary_of_care TINYINT(1) NOT NULL DEFAULT 0,

    sent_summary_of_care_electronically TINYINT(1) NOT NULL DEFAULT 0,

    confirmed_recipient_received_summary TINYINT(1) NOT NULL DEFAULT 0,

    -- Referral fields
    referral_date DATE NULL,

    external_referral VARCHAR(20) NULL DEFAULT 'unassigned',

    reason TEXT NULL,

    risk_level VARCHAR(20) NULL DEFAULT 'unassigned',

    requested_service VARCHAR(255) NULL,

    refer_by_provider_id INT NULL,

    refer_to_provider_id INT NULL,

    referrer_diagnosis VARCHAR(255) NULL,

    include_vitals VARCHAR(20) NULL DEFAULT 'unassigned',

    billing_facility_id INT NULL,

    -- Counter-Referral fields
    reply_date DATE NULL,

    reply_from VARCHAR(255) NULL,

    presumed_diagnosis VARCHAR(255) NULL,

    final_diagnosis VARCHAR(255) NULL,

    documents VARCHAR(255) NULL,

    findings TEXT NULL,

    services_provided TEXT NULL,

    recommendations TEXT NULL,

    prescriptions_referrals TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_transactions_patient (patient_id),

    INDEX idx_patient_transactions_refer_by (refer_by_provider_id),

    INDEX idx_patient_transactions_refer_to (refer_to_provider_id),

    INDEX idx_patient_transactions_billing_facility (billing_facility_id),

    INDEX idx_patient_transactions_created_by (created_by),

    INDEX idx_patient_transactions_updated_by (updated_by),

    INDEX idx_patient_transactions_deleted_by (deleted_by),

    CONSTRAINT fk_patient_transactions_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_transactions_refer_by
        FOREIGN KEY (refer_by_provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_transactions_refer_to
        FOREIGN KEY (refer_to_provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_transactions_billing_facility
        FOREIGN KEY (billing_facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
