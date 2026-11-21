-- ============================================================================
-- AI analysis: the guard rail
--
-- Built before the thing it guards, deliberately. Every other feature in this
-- system costs the same whether it runs once or ten thousand times. This one
-- bills per call to a third party, so the first question is not "does it work"
-- but "what is the worst a mistake can cost", and that question has to be
-- answered in schema rather than in a comment.
--
-- THREE CONTROLS, AND WHY EACH IS NOT ENOUGH ON ITS OWN.
--
--   A SPEND CAP stops the month running away: per day, per month, and per user
--   per day. It cannot stop a fast loop, because spend is measured after the
--   fact and a loop can issue a hundred calls before the next check reads the
--   total.
--
--   RATE LIMITS stop the loop: a minimum gap between one user's runs, and a
--   ceiling on runs per user per hour. They cannot stop steady legitimate use
--   from adding up to a large bill over thirty days.
--
--   A RESPONSE CACHE removes the commonest cause of both. The expensive
--   pattern in a reporting tool is not abuse; it is somebody opening the same
--   unchanged report four times in a morning. Identical input inside the TTL
--   returns the stored answer and bills nothing.
--
-- WHAT THE CAPS CANNOT DO.
--
-- Output length is not known before the call, so spend is checked against what
-- has already been spent. One call can therefore cross a cap rather than stop
-- exactly at it. `ai_max_output_tokens` bounds that overshoot to the cost of a
-- single response, which at the rates seeded below is cents. Said plainly here
-- because a cap that is quietly approximate is worse than one documented as
-- approximate.
--
-- THE LEDGER RECORDS REFUSALS TOO.
--
-- `ai_analysis_runs` has a row for every attempt, including the ones that cost
-- nothing. A table of only the successful calls answers "what did we spend"
-- and cannot answer "who keeps hitting the cap", "is the cache working" or
-- "when did this start failing" -- which are the questions actually asked when
-- a bill looks wrong.
--
-- `payload_sha256` is the hash of exactly what was sent. Not the text of it:
-- the hash is enough to prove two runs sent the same thing, to drive the
-- cache, and to answer "what did you send them" against a payload rebuilt from
-- the same report, without this table becoming a second copy of hospital data
-- sitting next to the first.
--
-- ON `dropped_keys`: the field allowlist projects a report down to the columns
-- that may leave. When a report gains a column, the allowlist drops it -- which
-- is the safe direction and also a silent one. Recording the dropped names
-- makes drift visible in the ledger instead of waiting for someone to read the
-- allowlist again.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Every attempt, billable or not.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_analysis_runs` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,

    -- Which report asked. A stable key, not a route or a screen name.
    `report_key` VARCHAR(64) NOT NULL,

    `user_id` INT(11) NULL DEFAULT NULL,
    `user_role` VARCHAR(64) NULL DEFAULT NULL,

    -- allowed      -- sent to the provider and answered
    -- cached       -- served from ai_analysis_cache, billed nothing
    -- refused      -- a guard said no before any call was made
    -- failed       -- the call was made and did not come back usable
    `status` ENUM('allowed','cached','refused','failed') NOT NULL,

    -- Which guard said no, or why the call failed. Null when it ran.
    `reason` VARCHAR(190) NULL DEFAULT NULL,

    `model` VARCHAR(64) NULL DEFAULT NULL,

    -- SHA-256 of the exact bytes sent. See the header.
    `payload_sha256` CHAR(64) NULL DEFAULT NULL,
    `payload_bytes` INT NULL DEFAULT NULL,

    -- Keys the allowlist removed on the way out, comma separated.
    `dropped_keys` VARCHAR(500) NULL DEFAULT NULL,

    `input_tokens` INT NOT NULL DEFAULT 0,
    `output_tokens` INT NOT NULL DEFAULT 0,
    `cache_read_tokens` INT NOT NULL DEFAULT 0,

    -- Six decimal places because a single run costs about two cents and a cap
    -- made of rounded pennies is not a cap.
    `estimated_cost_usd` DECIMAL(12,6) NOT NULL DEFAULT 0.000000,

    `duration_ms` INT NULL DEFAULT NULL,
    `requested_ip` VARCHAR(45) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_ai_runs_spend` (`created_at`, `status`),
    KEY `idx_ai_runs_user` (`user_id`, `created_at`),
    KEY `idx_ai_runs_report` (`report_key`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- The response cache. Identical input, same model, inside the TTL.
--
-- Keyed on the payload hash and the model together: changing model changes the
-- answer, so a cached reply from another model is the wrong answer rather than
-- a cheap one.
--
-- This is a cache and not a record. It holds generated text with an expiry, it
-- is attached to a report rather than to a patient, and nothing reads it after
-- `expires_at`. The rule that AI output is never written into a patient's
-- record is untouched by it.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_analysis_cache` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `payload_sha256` CHAR(64) NOT NULL,
    `model` VARCHAR(64) NOT NULL,
    `report_key` VARCHAR(64) NOT NULL,

    `response_json` MEDIUMTEXT NOT NULL,

    `input_tokens` INT NOT NULL DEFAULT 0,
    `output_tokens` INT NOT NULL DEFAULT 0,

    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ai_cache_payload` (`payload_sha256`, `model`),
    KEY `idx_ai_cache_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- What each model costs, so a spend cap can be expressed in money.
--
-- A table rather than constants because these change: Claude Opus 5.5 is
-- cheaper than the Opus 5 it replaced. A rate that is wrong makes every cap
-- wrong in the same direction and silently, so it is seeded with a date and
-- meant to be updated rather than trusted forever.
--
-- US dollars per million tokens, because that is the unit the provider bills
-- in. Converting to pesos at an invented rate would make the number look more
-- local and less true.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_model_rates` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `model` VARCHAR(64) NOT NULL,
    `input_usd_per_mtok` DECIMAL(10,4) NOT NULL,
    `output_usd_per_mtok` DECIMAL(10,4) NOT NULL,
    `cache_read_usd_per_mtok` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    `noted_on` DATE NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ai_model_rate` (`model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- The switches.
--
-- `allow_ai_analysis` defaults to 0, unlike almost every other feature switch
-- in this system. Those cost nothing when nobody uses them. This one spends
-- real money from the first click, and a hospital that upgrades and finds a
-- billing relationship switched on by a migration has been done a disservice.
-- Somebody turns it on, on purpose, after the key is in place.
--
-- The defaults below are small on purpose. $5 a day is roughly 250 report
-- summaries at the seeded Opus rates -- comfortable for real use, nowhere near
-- enough for a runaway loop to matter.
-- ----------------------------------------------------------------------------
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `allow_ai_analysis` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `ai_cap_daily_usd` DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS `ai_cap_monthly_usd` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    ADD COLUMN IF NOT EXISTS `ai_cap_user_daily_usd` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    ADD COLUMN IF NOT EXISTS `ai_max_runs_per_user_per_hour` INT NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS `ai_min_seconds_between_runs` INT NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS `ai_cache_ttl_minutes` INT NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS `ai_max_payload_bytes` INT NOT NULL DEFAULT 60000,
    ADD COLUMN IF NOT EXISTS `ai_max_output_tokens` INT NOT NULL DEFAULT 1200;
