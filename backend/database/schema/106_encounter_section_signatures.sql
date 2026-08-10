-- =============================================
-- Table: encounter_section_signatures
-- Append-only "eSign Log" -- one row per time a user electronically
-- signs an encounter_sections row (re-entering their password as their
-- signature, with an optional amendment note explaining what changed).
-- Signer name/role are captured at sign time rather than joined live,
-- so the log reads correctly even if the signer's name/role changes
-- later.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_section_signatures (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_section_id INT NOT NULL,

    signer_user_id INT NOT NULL,

    signer_name VARCHAR(255) NOT NULL,

    signer_role VARCHAR(50) NULL,

    amendment TEXT NULL,

    signed_at DATETIME NOT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_section_signatures_section (encounter_section_id),

    INDEX idx_encounter_section_signatures_signer (signer_user_id),

    CONSTRAINT fk_encounter_section_signatures_section
        FOREIGN KEY (encounter_section_id)
        REFERENCES encounter_sections(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_encounter_section_signatures_signer
        FOREIGN KEY (signer_user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
