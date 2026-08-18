-- =============================================
-- Table: encounter_soap_note_signatures
-- Append-only eSign log for encounter_soap_notes, mirroring
-- encounter_section_signatures but keyed to an individual SOAP note
-- (since each SOAP note signs/locks independently, not per encounter).
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_soap_note_signatures (

    id INT NOT NULL AUTO_INCREMENT,

    soap_note_id INT NOT NULL,

    signer_user_id INT NULL,

    signer_name VARCHAR(255) NOT NULL,

    signer_role VARCHAR(100) NULL,

    amendment TEXT NULL,

    signed_at DATETIME NOT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_soap_note_signatures_note (soap_note_id),

    CONSTRAINT fk_encounter_soap_note_signatures_note
        FOREIGN KEY (soap_note_id)
        REFERENCES encounter_soap_notes(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
