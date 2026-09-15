-- =============================================
-- Table: edi_file_notes
-- Free-text notes attached to an uploaded EDI file (the "Notes" tab on
-- the EDI History screen) -- a simple append-only log, not editable
-- once posted (matches the audit-trail nature of the real screen).
-- =============================================

CREATE TABLE IF NOT EXISTS edi_file_notes (

    id INT NOT NULL AUTO_INCREMENT,

    edi_file_id INT NOT NULL,

    note TEXT NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_edi_file_notes_file (edi_file_id),

    INDEX idx_edi_file_notes_created_by (created_by),

    INDEX idx_edi_file_notes_deleted_by (deleted_by),

    CONSTRAINT fk_edi_file_notes_file
        FOREIGN KEY (edi_file_id)
        REFERENCES edi_files(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
