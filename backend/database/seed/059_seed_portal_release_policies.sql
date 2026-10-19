-- Seed 059: My Chart result release policies
-- Subsystem: Patient Portal (My Chart Phase 1). How long each kind of result waits
-- before a patient may read it in My Chart, and whether a critical result is ever
-- released without a doctor clearing it (it is not).
--
-- Idempotency: INSERT IGNORE against the uq_portal_policy unique key (kind, category).
-- The catch-all rows use category '' rather than NULL, because a UNIQUE key does not
-- constrain NULLs in MySQL/MariaDB and the catch-all would insert again on every run,
-- so re-running changes nothing and leaves any hours an admin has since edited alone.
--
-- The hours below are the ones agreed in the Phase 1 plan:
--   lab, every section      0 h   routine results appear as soon as the lab releases them
--   chemistry, hematology   0 h   stated explicitly so the intent survives an edit to the default
--   histopathology         72 h   a diagnosis the doctor should discuss first. NOTE: this system's
--                                lab sections (LabService::SECTIONS) have no histopathology yet, so
--                                this row sits ready and does nothing until one exists. Sections
--                                that do exist and are left at the 0 h default -- serology,
--                                microbiology, blood_bank -- may deserve a hold; that is a clinical
--                                decision for the hospital, set from the same table.
--   imaging, every kind    24 h   time for the radiologist's report to reach the doctor first

SET NAMES utf8mb4;

INSERT IGNORE INTO `portal_release_policies`
    (`kind`, `category`, `hold_hours`, `auto_release_critical`, `note`, `is_active`, `created_at`)
VALUES
    ('lab',     '',                0,  0, 'Default for every lab section: released when the lab releases it.', 1, NOW()),
    ('lab',     'chemistry',       0,  0, 'Routine chemistry: no hold.', 1, NOW()),
    ('lab',     'hematology',      0,  0, 'Routine haematology: no hold.', 1, NOW()),
    ('lab',     'histopathology', 72,  0, 'Tissue diagnosis: the doctor discusses it first. Section not in use yet.', 1, NOW()),
    ('imaging', '',               24,  0, 'Every imaging study: a day for the doctor to see the report first.', 1, NOW());
