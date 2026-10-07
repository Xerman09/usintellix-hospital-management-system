-- Restocking department cabinets (Department medicine stock, Phase 2).
--
--  - When a cabinet item drops below its minimum, a restock request (a stock transfer in
--    status 'requested', from the pharmacy location to the cabinet) is made automatically,
--    for enough to bring it back up to the maximum (is_auto = 1). One open automatic request
--    per cabinet: later shortfalls update its lines until the pharmacy sends it.
--  - The pharmacy fills it (sends the transfer); the ward confirms receipt (receives it).
--  - Urgent requests: priority 'urgent', with why (an item ran out, or a nurse flagged it).
-- Safe to re-run.

ALTER TABLE stock_transfers
    ADD COLUMN IF NOT EXISTS is_auto TINYINT(1) NOT NULL DEFAULT 0 AFTER priority,
    ADD COLUMN IF NOT EXISTS urgent_reason VARCHAR(255) NULL AFTER is_auto,
    ADD COLUMN IF NOT EXISTS flagged_by INT NULL AFTER urgent_reason;

CREATE INDEX IF NOT EXISTS idx_st_to_status ON stock_transfers (to_warehouse_id, status);
