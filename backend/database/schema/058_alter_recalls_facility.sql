-- =============================================
-- Add facility_id to recalls
-- =============================================

ALTER TABLE recalls

ADD COLUMN facility_id INT NULL AFTER provider_id,

ADD INDEX idx_recalls_facility (facility_id),

ADD CONSTRAINT fk_recalls_facility
    FOREIGN KEY (facility_id)
    REFERENCES facilities(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
