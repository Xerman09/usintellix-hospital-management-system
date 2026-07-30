-- =============================================
-- Alter: providers — stop duplicating employee identity/contact fields.
-- A provider now just points at an existing employee (doctor role)
-- and adds the credentialing fields employees don't have.
-- =============================================

ALTER TABLE providers

DROP FOREIGN KEY fk_providers_department,

DROP INDEX idx_providers_department,

DROP INDEX uq_providers_tenant_email,

DROP COLUMN title,

DROP COLUMN first_name,

DROP COLUMN middle_name,

DROP COLUMN last_name,

DROP COLUMN suffix,

DROP COLUMN email,

DROP COLUMN phone,

DROP COLUMN department_id,

DROP COLUMN status,

ADD COLUMN employee_id INT NOT NULL AFTER tenant_id,

ADD CONSTRAINT uq_providers_employee
    UNIQUE (employee_id),

ADD INDEX idx_providers_employee (employee_id),

ADD CONSTRAINT fk_providers_employee
    FOREIGN KEY (employee_id)
    REFERENCES employees(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
