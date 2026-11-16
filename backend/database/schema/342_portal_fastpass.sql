-- ============================================================================
-- Migration: 342_portal_fastpass.sql
-- My Chart Phase M18: Fast Pass -- offering a freed slot to somebody who
-- already has a later appointment.
--
-- WHAT THIS IS, AND WHAT IT IS NOT
--
-- M10 made cancelling possible. A cancellation now leaves a hole in the day and
-- nothing happens to it: the desk sees the slot come free and, if somebody
-- telephones at the right moment, it gets filled. Most of the time it does not.
--
-- This is NOT a general waitlist. Nobody joins it hoping to be given an
-- appointment they do not have. Every entry belongs to an appointment the
-- patient ALREADY HOLDS, and accepting an offer MOVES that appointment earlier.
-- That one decision removes most of the ways this feature could go wrong:
--
--   * the number of appointments never changes, so nobody can end up with two;
--   * there is no question of whether the person needs to be seen, or by whom,
--     or for how long -- a clinician already agreed to all of that when the
--     appointment was booked;
--   * accepting is a reschedule, so it goes through the same double-booking,
--     roster and clinic-schedule checks the desk gets, and keeps the same
--     provider (M10's rule: changing doctor is a new booking decision);
--   * and a patient who ignores every offer simply keeps the appointment they
--     had. The worst outcome of this whole feature is that nothing happens.
--
-- THE CUT-OFF FROM M10 IS THE WRONG RULE HERE
--
-- `portal_appointment_cutoff_hours` (24 by default) stops a patient moving
-- their own appointment at short notice, which protects the desk from churn it
-- cannot absorb. Applying it to a Fast Pass offer would make the feature nearly
-- useless, because short notice is exactly when cancellations happen -- a slot
-- freed tomorrow morning is the one worth offering.
--
-- The difference is who is asking. A reschedule is the patient changing their
-- mind; a Fast Pass offer is the hospital asking the patient to come sooner,
-- about a gap the hospital would rather not have. So the cut-off does not apply,
-- and `portal_fastpass_min_lead_hours` takes its place: a slot closer than that
-- is not offered at all, because nobody can rearrange their day in an hour and
-- offering it only produces a message the patient cannot act on.
--
-- FIRST COME FIRST SERVED, IN SMALL ROUNDS
--
-- Two obvious designs, both worse than the one here:
--
--   One at a time, cascading. Kindest, but the slot can sit unoffered while an
--   expiry ticks down. With a four-hour window and five people on the list, a
--   slot freed on Monday is still being offered on Wednesday, by which time it
--   has passed its own lead time and helped nobody.
--
--   Everyone at once. Places the slot fastest, and tells everybody but one
--   person "sorry, taken". Do that a few times and people stop opening the
--   notification, which is the one thing this feature cannot survive.
--
-- So: offers go out to `portal_fastpass_offer_batch` patients at a time (3),
-- in the order they joined, all with the same deadline. First to accept wins and
-- the rest of that round are marked `missed`. If the round passes with nobody
-- accepting, the next three are offered. The queue order is `joined_at` and
-- nothing else -- no scoring, no priority, no clinical weighting. Anything
-- cleverer is a rationing decision, and a rationing decision made by a schema
-- comment is a rationing decision nobody signed off.
--
-- ONE OFFER CAN WIN, DECIDED ON THE SLOT ROW
--
-- Two patients tapping Accept at the same instant is the one race that matters,
-- and it is settled by a conditional UPDATE on `portal_fastpass_slots`
-- (`SET status='taken' ... WHERE id=? AND status='offered'`). Exactly one such
-- statement can affect a row, and only the winner then attempts the reschedule.
-- If that reschedule fails -- the desk filled the slot by hand a moment earlier,
-- the roster changed -- the claim is released and the slot goes back to the
-- queue, because a slot held by a move that did not happen is worse than a slot
-- nobody was offered.
--
-- WHAT THE COLUMNS ARE FOR
--
-- `portal_fastpass_waitlist`  one row per appointment somebody wants moved
--                             earlier. UNIQUE on appointment_id: leaving and
--                             rejoining reuses the row rather than stacking.
-- `portal_fastpass_slots`     a freed slot, with where it came from. Kept after
--                             it is settled, because "how many freed slots did
--                             we actually fill" is the only number that says
--                             whether this feature earns its place.
-- `portal_fastpass_offers`    who was offered what, when it expired, and what
--                             they said. One row per patient per round.
--
-- `declines` and `expiries` are counted separately and treated differently. An
-- explicit decline is a patient saying "not that one"; three of them and the
-- entry goes dormant, because continuing to ask is pestering. An expiry may
-- only mean they were asleep, so it is recorded for the desk and counts against
-- nothing. Rejoining after dormancy resets `declines` -- the patient has just
-- asked again, which is a clearer signal than the three stale ones.
--
-- GAPS, NAMED SO NOBODY ASSUMES OTHERWISE
--
--   1. A slot is matched on provider and time only. It does not check that the
--      freed appointment and the waiting one are the same KIND of visit, because
--      `visit_category_id` is nullable and mostly null in this database, so a
--      check on it would reject nearly everything. The practical guard is that
--      both appointments are with the same provider and the clinic grid gives
--      every slot the same length.
--   2. Nothing offers a slot to a patient who has no appointment yet. That is
--      the general-waitlist feature, and it needs a clinician to decide who is
--      waiting for what -- a different phase, if ever.
--   3. The sweep is not scheduled here. It is a method and an endpoint; whatever
--      runs the existing portal cron runs this too. Until something does, offers
--      expire when the sweep is next called rather than on the minute.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Who wants to come in sooner.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_fastpass_waitlist` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `patient_id` INT(11) NOT NULL,

    -- The appointment that would MOVE. Not a request for a new one.
    `appointment_id` INT(11) NOT NULL,

    -- Denormalised from the appointment so the queue can be read without a join
    -- on every sweep. Re-read from the appointment whenever an offer is built,
    -- so a provider change on the booking cannot send an offer to the wrong list.
    `provider_id` INT(11) NOT NULL,

    -- "Not before this date." The patient's own constraint -- away until the
    -- 20th, cannot take time off this week. NULL means anything sooner will do.
    `earliest_date` DATE NULL DEFAULT NULL,

    `status` ENUM('active','dormant','fulfilled','withdrawn') NOT NULL DEFAULT 'active',

    -- Why it stopped being active, in words the patient reads.
    `status_note` VARCHAR(200) NULL DEFAULT NULL,

    `offers_sent` INT NOT NULL DEFAULT 0,
    `declines` INT NOT NULL DEFAULT 0,
    `expiries` INT NOT NULL DEFAULT 0,
    `last_offer_at` DATETIME NULL DEFAULT NULL,

    -- The queue order, and the only thing that decides it.
    `joined_at` DATETIME NOT NULL,
    `joined_by` INT(11) NULL DEFAULT NULL,
    `settled_at` DATETIME NULL DEFAULT NULL,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_fastpass_appointment` (`appointment_id`),
    KEY `idx_fastpass_queue` (`status`, `joined_at`),
    KEY `idx_fastpass_provider` (`provider_id`, `status`),
    KEY `idx_fastpass_patient` (`patient_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- A slot that came free.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_fastpass_slots` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `provider_id` INT(11) NOT NULL,
    `slot_date` DATE NOT NULL,
    `slot_time` TIME NOT NULL,

    -- Carried from the appointment that vacated it, so an offer can say where
    -- the patient would be going. Both nullable in this database.
    `visit_category_id` INT(11) NULL DEFAULT NULL,
    `facility_id` INT(11) NULL DEFAULT NULL,

    -- patient_cancel / patient_reschedule come straight from M10, published the
    -- moment the patient acts. desk_cancel is found by the sweep, because the
    -- staff appointment routes are outside My Chart and are not touched by this
    -- phase. desk_manual is somebody publishing a gap by hand.
    `source` ENUM('patient_cancel','patient_reschedule','desk_cancel','desk_manual') NOT NULL,
    `source_appointment_id` INT(11) NULL DEFAULT NULL,

    -- open        published, nobody offered it yet
    -- offered     a round is live
    -- taken       somebody moved into it
    -- expired     its own lead time passed with nobody in it
    -- unavailable the desk filled it some other way before we could
    -- withdrawn   the desk pulled it
    `status` ENUM('open','offered','taken','expired','unavailable','withdrawn') NOT NULL DEFAULT 'open',
    `status_note` VARCHAR(200) NULL DEFAULT NULL,

    `offer_round` INT NOT NULL DEFAULT 0,
    `offers_made` INT NOT NULL DEFAULT 0,

    `taken_by_patient_id` INT(11) NULL DEFAULT NULL,
    `taken_by_offer_id` INT(11) NULL DEFAULT NULL,
    `taken_at` DATETIME NULL DEFAULT NULL,

    `published_at` DATETIME NOT NULL,
    `published_by` INT(11) NULL DEFAULT NULL,
    `closed_at` DATETIME NULL DEFAULT NULL,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT NULL,

    PRIMARY KEY (`id`),

    -- Makes republishing the same cancellation harmless, which the sweep relies
    -- on. NULL source_appointment_id (desk_manual) is exempt, because MySQL
    -- treats NULLs as distinct here -- those are de-duplicated in the service,
    -- which looks for a live row at the same provider, date and time first.
    UNIQUE KEY `uq_fastpass_slot_source` (`provider_id`, `slot_date`, `slot_time`, `source_appointment_id`),
    KEY `idx_fastpass_slot_live` (`status`, `slot_date`, `slot_time`),
    KEY `idx_fastpass_slot_provider` (`provider_id`, `slot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Who was offered it.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_fastpass_offers` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `slot_id` INT(11) NOT NULL,
    `waitlist_id` INT(11) NOT NULL,
    `patient_id` INT(11) NOT NULL,

    -- The appointment that would move, and where it was, recorded at offer time.
    -- Kept on the offer rather than read back from the appointment, because
    -- after an accept the appointment no longer says where it came from past the
    -- single `rescheduled_from_*` pair M10 keeps.
    `appointment_id` INT(11) NOT NULL,
    `from_date` DATE NOT NULL,
    `from_time` TIME NOT NULL,

    `round` INT NOT NULL DEFAULT 1,

    -- open      live, awaiting an answer
    -- accepted  this patient moved into the slot
    -- declined  the patient said no
    -- expired   the deadline passed with no answer
    -- missed    somebody else in the same round accepted first
    -- void      neither the patient's doing nor the clock's -- they left the
    --           list, or the appointment changed underneath the offer
    `status` ENUM('open','accepted','declined','expired','missed','void') NOT NULL DEFAULT 'open',

    `offered_at` DATETIME NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `responded_at` DATETIME NULL DEFAULT NULL,
    `decline_reason` VARCHAR(255) NULL DEFAULT NULL,
    `outcome_note` VARCHAR(255) NULL DEFAULT NULL,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_fastpass_offer_round` (`slot_id`, `waitlist_id`, `round`),
    KEY `idx_fastpass_offer_live` (`status`, `expires_at`),
    KEY `idx_fastpass_offer_patient` (`patient_id`, `status`),
    KEY `idx_fastpass_offer_slot` (`slot_id`, `round`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Policy. Every number here is a hospital's decision, not a developer's.
-- ----------------------------------------------------------------------------
ALTER TABLE `general_settings`
    -- The master switch. On by default: the feature cannot do harm when nobody
    -- has joined a list, and it does nothing at all until somebody does.
    ADD COLUMN IF NOT EXISTS `portal_allow_fastpass` TINYINT(1) NOT NULL DEFAULT 1,

    -- How long an offer is held open. Four hours is long enough to check with
    -- work or a lift, short enough that a slot freed in the morning can still
    -- be filled the same afternoon.
    ADD COLUMN IF NOT EXISTS `portal_fastpass_offer_hours` INT NOT NULL DEFAULT 4,

    -- A slot closer than this is never offered. NOT the M10 cut-off -- see the
    -- header. Four hours is the least notice at which somebody can realistically
    -- rearrange a morning and travel in.
    ADD COLUMN IF NOT EXISTS `portal_fastpass_min_lead_hours` INT NOT NULL DEFAULT 4,

    -- How many patients hear about one slot at once.
    ADD COLUMN IF NOT EXISTS `portal_fastpass_offer_batch` INT NOT NULL DEFAULT 3,

    -- Explicit declines before the entry goes dormant. Expiries do not count.
    ADD COLUMN IF NOT EXISTS `portal_fastpass_max_declines` INT NOT NULL DEFAULT 3,

    -- Offers to one patient in a rolling day, so a bad morning at the clinic
    -- does not turn into six messages.
    ADD COLUMN IF NOT EXISTS `portal_fastpass_max_offers_per_day` INT NOT NULL DEFAULT 2;
