-- Migration 332: Which client a dispensing was made from
-- The pharmacy tablet app and the desktop HMS post to the same dispensing
-- endpoints as the same user accounts, so until now a row in
-- prescription_dispenses could not say which of the two produced it. That is
-- the question a tablet pilot turns on -- "which of these came from the
-- tablet?" -- both to review them and to find them again if something goes
-- wrong at the counter.
--
-- Values: 'tablet', 'desktop', 'cli'. NULL for every dispensing made before
-- this column existed; it is NOT backfilled, because there is no way to know.
--
-- The value is a CLAIM made by the client (see backend/app/Core/Channel.php),
-- fit for operational attribution and not a security control. Nothing is
-- authorised on it.
--
-- Idempotent: DispensingService::ensureChannelColumn() adds the same column at
-- runtime if this file has not been applied, so re-running it must not fail.
-- MySQL has no ADD COLUMN IF NOT EXISTS, hence the procedure.

DROP PROCEDURE IF EXISTS add_dispense_channel_column;

DELIMITER $$
CREATE PROCEDURE add_dispense_channel_column()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'prescription_dispenses'
          AND COLUMN_NAME = 'created_via'
    ) THEN
        ALTER TABLE `prescription_dispenses`
            ADD COLUMN `created_via` VARCHAR(20) NULL DEFAULT NULL
            COMMENT 'tablet | desktop | cli -- client-claimed, not authoritative'
            AFTER `created_by`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'prescription_dispenses'
          AND INDEX_NAME = 'idx_prescription_dispenses_created_via'
    ) THEN
        CREATE INDEX `idx_prescription_dispenses_created_via`
            ON `prescription_dispenses` (`created_via`);
    END IF;
END$$
DELIMITER ;

CALL add_dispense_channel_column();
DROP PROCEDURE add_dispense_channel_column;
