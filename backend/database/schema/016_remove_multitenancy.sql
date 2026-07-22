-- =============================================
-- Remove multi-tenancy
-- Each hospital now runs its own dedicated server/database, so the
-- shared `tenants` table and every `tenant_id` scoping column are
-- no longer needed. Composite uniques that included tenant_id are
-- replaced with plain single-column uniques.
-- =============================================

ALTER TABLE users

DROP FOREIGN KEY fk_users_tenant,

DROP INDEX uq_users_tenant_username,

DROP INDEX idx_users_tenant,

DROP COLUMN tenant_id,

ADD CONSTRAINT uq_users_username
    UNIQUE (username);


ALTER TABLE departments

DROP FOREIGN KEY fk_departments_tenant,

DROP INDEX uq_departments_tenant_name,

DROP INDEX idx_departments_tenant,

DROP COLUMN tenant_id,

ADD CONSTRAINT uq_departments_name
    UNIQUE (name);


ALTER TABLE employees

DROP FOREIGN KEY fk_employees_tenant,

DROP INDEX uq_employees_tenant_employee_no,

DROP INDEX uq_employees_tenant_email,

DROP INDEX uq_employees_tenant_phone,

DROP INDEX idx_employees_tenant,

DROP COLUMN tenant_id,

ADD CONSTRAINT uq_employees_employee_no
    UNIQUE (employee_no),

ADD CONSTRAINT uq_employees_email
    UNIQUE (email),

ADD CONSTRAINT uq_employees_phone
    UNIQUE (phone);


ALTER TABLE patients

DROP FOREIGN KEY fk_patients_tenant,

DROP INDEX uq_patients_tenant_patient_no,

DROP INDEX idx_patients_tenant,

DROP COLUMN tenant_id,

ADD CONSTRAINT uq_patients_patient_no
    UNIQUE (patient_no);


ALTER TABLE providers

DROP FOREIGN KEY fk_providers_tenant,

DROP INDEX uq_providers_tenant_npi,

DROP INDEX idx_providers_tenant,

DROP COLUMN tenant_id,

ADD CONSTRAINT uq_providers_npi
    UNIQUE (npi_number);


ALTER TABLE practice_rules

DROP FOREIGN KEY fk_practice_rules_tenant,

DROP INDEX idx_practice_rules_tenant,

DROP COLUMN tenant_id;


ALTER TABLE patient_contacts

DROP FOREIGN KEY fk_patient_contacts_tenant,

DROP INDEX idx_patient_contacts_tenant,

DROP COLUMN tenant_id;


ALTER TABLE patient_emergency_contacts

DROP FOREIGN KEY fk_patient_emergency_contacts_tenant,

DROP INDEX idx_patient_emergency_contacts_tenant,

DROP COLUMN tenant_id;


ALTER TABLE appointments

DROP FOREIGN KEY fk_appointments_tenant,

DROP INDEX idx_appointments_tenant,

DROP COLUMN tenant_id;


-- Drops its own audit FKs (fk_tenants_created_by/updated_by/deleted_by) automatically.
DROP TABLE IF EXISTS tenants;
