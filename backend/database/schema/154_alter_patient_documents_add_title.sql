-- =============================================
-- Alter: patient_documents -- add a user-entered `title` shown in the
-- Documents widget instead of the raw uploaded filename (which is often
-- an unreadable camera/export name like
-- "795847266_1638976424294934_2399728444841556809_n.jpg").
--
-- Nullable: existing rows uploaded before this feature have no title.
-- The frontend requires it on new uploads and falls back to
-- original_filename when displaying a legacy row with no title.
-- =============================================

ALTER TABLE patient_documents

ADD COLUMN title VARCHAR(255) NULL AFTER category;
