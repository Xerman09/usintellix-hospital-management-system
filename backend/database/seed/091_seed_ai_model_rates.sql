-- Seed: AI model rates
-- Subsystem: AI analytics. Prices per million tokens, so a spend cap can be expressed in
-- money rather than in tokens. Idempotency: INSERT IGNORE against uq_ai_model_rate.
--
-- US dollars, because that is the unit the provider bills in. Converting to pesos at an
-- invented exchange rate would make the figures look local and be less true.
--
-- NOTED 3 NOVEMBER 2026. THESE GO OUT OF DATE.
--
-- They change, and they have changed downwards: Claude Opus 5.5 replaced Claude Opus 5 at
-- $4/$20 rather than $5/$25. A stale rate makes every cap wrong in the same direction and
-- without any sign of it, so `noted_on` is stored per row and is worth re-checking against
-- the published pricing whenever the bill and the ledger disagree.
--
-- INSERT IGNORE means re-running this will NOT correct a rate that has already been
-- seeded. To change one, update it:
--
--   UPDATE ai_model_rates
--      SET output_usd_per_mtok = 18.0000, noted_on = CURDATE()
--    WHERE model = 'claude-opus-5-5';
--
-- Cache reads are priced separately and much lower. They matter here: the system prompt
-- and the per-report instructions are the stable part of every request, so once caching
-- is on, most input tokens on a repeat run are billed at the cache rate rather than the
-- input rate.
--
-- AiGuardService::costOf() prices an unknown model at the dearest rate on file rather
-- than at zero, so a model missing from this table is caught by a cap instead of slipping
-- under every one of them.

SET NAMES utf8mb4;

INSERT IGNORE INTO `ai_model_rates`
    (`model`, `input_usd_per_mtok`, `output_usd_per_mtok`, `cache_read_usd_per_mtok`, `noted_on`, `created_at`)
VALUES
    ('claude-opus-5-5',  4.0000, 20.0000, 0.2000, '2026-11-03', NOW()),
    ('claude-sonnet-5-5', 2.0000, 10.0000, 0.1000, '2026-11-03', NOW()),
    ('claude-haiku-5-5',  0.1000,  0.5000, 0.0100, '2026-11-03', NOW());
