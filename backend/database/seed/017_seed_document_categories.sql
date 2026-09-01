-- Seed: Document Categories
-- Seeds the default "Categories" root and its standard top-level document
-- categories for a fresh server setup. Idempotency: each INSERT is
-- guarded by WHERE NOT EXISTS on (parent_id, name), and the root's id is
-- looked up fresh each run via SET @root_id, so re-running this file
-- after the root already exists just skips every row.

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT NULL, 'Categories', 0, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM document_categories WHERE parent_id IS NULL AND name = 'Categories'
);

SET @root_id = (SELECT id FROM document_categories WHERE parent_id IS NULL AND name = 'Categories' LIMIT 1);

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'Advance Directive', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'Advance Directive');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'CCD', 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'CCD');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'CCDA', 3, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'CCDA');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'CCR', 4, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'CCR');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'Eye Module', 5, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'Eye Module');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'FHIR Export Document', 6, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'FHIR Export Document');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'Invoices', 7, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'Invoices');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'Lab Report', 8, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'Lab Report');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'Medical Record', 9, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'Medical Record');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'Onsite Portal', 10, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'Onsite Portal');

INSERT INTO document_categories (parent_id, name, sequence, created_at)
SELECT @root_id, 'Patient Information', 11, NOW()
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE parent_id = @root_id AND name = 'Patient Information');
