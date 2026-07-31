-- =============================================
-- Expand: facilities
-- Facility Management is redesigned to match a full facility record
-- (physical/mailing address, contact info, organization type, POS code,
-- billing/tax identifiers, status flags). Existing rows are preserved:
-- `location` is migrated into physical_address_line1 and `description`
-- into `info`, then both legacy columns are dropped.
-- =============================================

ALTER TABLE facilities

ADD COLUMN physical_address_line1 VARCHAR(255) NULL AFTER name,
ADD COLUMN physical_city VARCHAR(100) NULL AFTER physical_address_line1,
ADD COLUMN physical_state VARCHAR(100) NULL AFTER physical_city,
ADD COLUMN physical_zip VARCHAR(20) NULL AFTER physical_state,
ADD COLUMN physical_country VARCHAR(100) NULL AFTER physical_zip,

ADD COLUMN mailing_address_line1 VARCHAR(255) NULL AFTER physical_country,
ADD COLUMN mailing_city VARCHAR(100) NULL AFTER mailing_address_line1,
ADD COLUMN mailing_state VARCHAR(100) NULL AFTER mailing_city,
ADD COLUMN mailing_zip VARCHAR(20) NULL AFTER mailing_state,
ADD COLUMN mailing_country VARCHAR(100) NULL AFTER mailing_zip,

ADD COLUMN phone VARCHAR(50) NULL AFTER mailing_country,
ADD COLUMN fax VARCHAR(50) NULL AFTER phone,
ADD COLUMN website VARCHAR(255) NULL AFTER fax,
ADD COLUMN email VARCHAR(255) NULL AFTER website,

ADD COLUMN organization_type_id INT NULL AFTER email,
ADD COLUMN iban VARCHAR(50) NULL AFTER organization_type_id,
ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#4f46e5' AFTER iban,
ADD COLUMN facility_taxonomy VARCHAR(100) NULL AFTER color,

ADD COLUMN pos_code_id INT NULL AFTER facility_taxonomy,
ADD COLUMN billing_attn VARCHAR(255) NULL AFTER pos_code_id,
ADD COLUMN clia_number VARCHAR(50) NULL AFTER billing_attn,
ADD COLUMN facility_lab_code VARCHAR(50) NULL AFTER clia_number,

ADD COLUMN tax_id_type ENUM('EIN', 'SSN') NULL DEFAULT 'EIN' AFTER facility_lab_code,
ADD COLUMN tax_id VARCHAR(50) NULL AFTER tax_id_type,
ADD COLUMN oid VARCHAR(100) NULL AFTER tax_id,
ADD COLUMN facility_npi VARCHAR(20) NULL AFTER oid,

ADD COLUMN is_billing_location TINYINT(1) NOT NULL DEFAULT 0 AFTER facility_npi,
ADD COLUMN accepts_assignment TINYINT(1) NOT NULL DEFAULT 0 AFTER is_billing_location,
ADD COLUMN is_service_location TINYINT(1) NOT NULL DEFAULT 0 AFTER accepts_assignment,
ADD COLUMN is_primary_business_entity TINYINT(1) NOT NULL DEFAULT 0 AFTER is_service_location,
ADD COLUMN is_inactive TINYINT(1) NOT NULL DEFAULT 0 AFTER is_primary_business_entity,

ADD COLUMN info TEXT NULL AFTER is_inactive,

ADD INDEX idx_facilities_organization_type (organization_type_id),
ADD INDEX idx_facilities_pos_code (pos_code_id),

ADD CONSTRAINT fk_facilities_organization_type
    FOREIGN KEY (organization_type_id)
    REFERENCES organization_types(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,

ADD CONSTRAINT fk_facilities_pos_code
    FOREIGN KEY (pos_code_id)
    REFERENCES pos_codes(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;

-- Migrate legacy data into the new structure.
UPDATE facilities
SET physical_address_line1 = location,
    info = description
WHERE location IS NOT NULL OR description IS NOT NULL;

ALTER TABLE facilities
DROP COLUMN description,
DROP COLUMN location;
