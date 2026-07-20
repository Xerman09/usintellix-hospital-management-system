-- =============================================
-- Audit Foreign Keys: tenants
-- =============================================

ALTER TABLE tenants

ADD INDEX idx_tenants_created_by (created_by),

ADD INDEX idx_tenants_updated_by (updated_by),

ADD INDEX idx_tenants_deleted_by (deleted_by),

ADD CONSTRAINT fk_tenants_created_by
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,

ADD CONSTRAINT fk_tenants_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES users(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,

ADD CONSTRAINT fk_tenants_deleted_by
    FOREIGN KEY (deleted_by)
    REFERENCES users(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;