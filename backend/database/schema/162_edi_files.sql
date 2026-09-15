-- =============================================
-- Table: edi_files
-- Uploaded EDI files (835 remittance, 837 claim, or any raw payer file)
-- tracked for the "EDI History" screen -- upload, view, note, and
-- archive. This app has no real clearinghouse/X12 parsing engine, so
-- these rows are file-management metadata only; there is deliberately
-- no "parsed CSV records" table behind them (see EdiFileService's own
-- comments for what was and wasn't built here).
-- =============================================

CREATE TABLE IF NOT EXISTS edi_files (

    id INT NOT NULL AUTO_INCREMENT,

    original_filename VARCHAR(255) NOT NULL,

    stored_filename VARCHAR(255) NOT NULL,

    file_path VARCHAR(255) NOT NULL,

    mime_type VARCHAR(100) NULL,

    file_size INT NULL,

    status ENUM('new', 'archived') NOT NULL DEFAULT 'new',

    archived_at DATETIME NULL,

    archived_by INT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_edi_files_status (status),

    INDEX idx_edi_files_created_by (created_by),

    INDEX idx_edi_files_archived_by (archived_by),

    INDEX idx_edi_files_deleted_by (deleted_by)

) ENGINE = InnoDB;
