-- =============================================
-- Tables: related_persons, related_person_telecoms, related_person_addresses
-- Replaces the old single-record `patient_emergency_contacts` (superseded,
-- left in place for historical data but no longer written to) with a
-- proper one-to-many "Related Persons" list per patient. Each related
-- person can carry multiple telecom contacts and multiple addresses,
-- each with their own use/type/date-range metadata (FHIR
-- RelatedPerson/ContactPoint/Address inspired).
-- =============================================

CREATE TABLE IF NOT EXISTS related_persons (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    last_name VARCHAR(100) NOT NULL,

    phone VARCHAR(20) NULL,

    date_of_birth DATE NULL,

    gender ENUM('male', 'female', 'other', 'unknown') NULL,

    notes TEXT NULL,

    relationship VARCHAR(100) NULL,

    role VARCHAR(100) NULL,

    contact_priority INT NULL,

    relationship_start_date DATE NULL,

    relationship_end_date DATE NULL,

    is_primary_contact TINYINT(1) NOT NULL DEFAULT 0,

    is_emergency_contact TINYINT(1) NOT NULL DEFAULT 0,

    can_make_medical_decisions TINYINT(1) NOT NULL DEFAULT 0,

    can_receive_medical_info TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_related_persons_patient (patient_id),

    INDEX idx_related_persons_created_by (created_by),

    INDEX idx_related_persons_updated_by (updated_by),

    INDEX idx_related_persons_deleted_by (deleted_by),

    CONSTRAINT fk_related_persons_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS related_person_telecoms (

    id INT NOT NULL AUTO_INCREMENT,

    related_person_id INT NOT NULL,

    type VARCHAR(30) NULL,

    contact_use VARCHAR(30) NULL,

    rank_order INT NULL,

    is_primary TINYINT(1) NOT NULL DEFAULT 0,

    value VARCHAR(255) NOT NULL,

    active_from DATE NULL,

    notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_related_person_telecoms_related_person (related_person_id),

    INDEX idx_related_person_telecoms_created_by (created_by),

    INDEX idx_related_person_telecoms_updated_by (updated_by),

    INDEX idx_related_person_telecoms_deleted_by (deleted_by),

    CONSTRAINT fk_related_person_telecoms_related_person
        FOREIGN KEY (related_person_id) REFERENCES related_persons (id) ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS related_person_addresses (

    id INT NOT NULL AUTO_INCREMENT,

    related_person_id INT NOT NULL,

    address_use VARCHAR(30) NULL,

    address_type VARCHAR(30) NULL,

    start_date DATE NULL,

    end_date DATE NULL,

    address_line VARCHAR(255) NULL,

    city VARCHAR(100) NULL,

    county_district VARCHAR(100) NULL,

    state_province VARCHAR(100) NULL,

    postal_code VARCHAR(20) NULL,

    country VARCHAR(100) NULL,

    priority INT NULL,

    notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_related_person_addresses_related_person (related_person_id),

    INDEX idx_related_person_addresses_created_by (created_by),

    INDEX idx_related_person_addresses_updated_by (updated_by),

    INDEX idx_related_person_addresses_deleted_by (deleted_by),

    CONSTRAINT fk_related_person_addresses_related_person
        FOREIGN KEY (related_person_id) REFERENCES related_persons (id) ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
