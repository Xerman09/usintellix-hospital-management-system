<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\Appointments\Services\AppointmentService;
use PDO;

/**
 * Fast Pass (Phase M18): offering a slot that came free to somebody who already
 * holds a later appointment with the same doctor.
 *
 * Read schema 342's header first -- it carries the design argument. The short
 * version, because it governs every method here:
 *
 *   This is not a waitlist for people without appointments. Every entry belongs
 *   to an appointment the patient ALREADY HOLDS, and accepting an offer MOVES
 *   that appointment earlier. So the number of appointments never changes, no
 *   clinical decision is being made by this code, and the worst thing that can
 *   happen is nothing.
 *
 * Three rules worth having in mind while reading:
 *
 * ONE CLOCK. PHP and MySQL are not in the same timezone on every deployment --
 * seven hours apart on the machine this was written on. Every datetime compared
 * or stored here is derived from the database's NOW(), passed down as $now and
 * never re-read from PHP. M15a shipped a bug for exactly this reason.
 *
 * THE SLOT ROW DECIDES THE RACE. Two patients accepting the same offer at the
 * same instant is settled by one conditional UPDATE on portal_fastpass_slots.
 * Only the statement that changes a row proceeds; if the reschedule behind it
 * then fails, the claim is released rather than left standing.
 *
 * NOTHING HAPPENS WITHOUT AN ANSWER. No path in this file moves an appointment
 * because an offer went unanswered. An ignored offer expires and the patient
 * keeps the appointment they had.
 */
class PortalFastPassService
{
    /** Who may look at the Fast Pass board and the queue. */
    public const REVIEW_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse'];

    /** Who may publish a gap by hand, withdraw one, or run the sweep. */
    public const MANAGE_ROLES = ['admin', 'receptionist'];

    /** A patient may only ever be offered a move of a booking in this state. */
    private const CHANGEABLE_STATUS = 'scheduled';

    /**
     * The shortest offer window worth sending. An offer that expires in eight
     * minutes is a message the patient cannot act on, and sending it burns the
     * slot's last round for nothing -- better to let the slot expire unoffered
     * and say so on the board.
     */
    private const MIN_WINDOW_MINUTES = 30;

    /** Defaults for every policy column, used when general_settings has none. */
    private const DEFAULTS = [
        'allow' => true,
        'offer_hours' => 4,
        'min_lead_hours' => 4,
        'batch' => 3,
        'max_declines' => 3,
        'max_per_day' => 2,
    ];

    /**
     * What a patient is told about this feature, in the app, before they join.
     * Kept here rather than in the app so the wording cannot drift between the
     * two clients, and so it is reviewable in one place.
     */
    public const TERMS = [
        'Your appointment stays exactly as it is unless you accept an earlier time.',
        'A few patients are offered the same slot, so it can be taken before you answer. You stay on the list if that happens.',
        'You keep the same doctor. Only the date and time would change.',
        'Offers have a deadline. Ignoring one costs you nothing.',
        'You can leave the list at any time.',
    ];

    // ==================================================================
    // The patient's side
    // ==================================================================

    /**
     * Everything the app needs on one screen: any live offer first, then which
     * of the patient's appointments are on the list, then which could be.
     */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $now = self::now($db);
        $settings = self::settings($db);

        return [
            'enabled' => $settings['allow'],
            'offers' => self::liveOffersFor($db, $patientId, $now, $settings),
            'entries' => self::entriesFor($db, $patientId),
            'eligible' => $settings['allow'] ? self::joinableFor($db, $patientId, $now) : [],
            'terms' => self::TERMS,
            'offer_hours' => $settings['offer_hours'],
            'min_lead_hours' => $settings['min_lead_hours'],
            'server_time' => $now,
        ];
    }

    /**
     * Ask to be offered anything earlier for one of this patient's own
     * appointments.
     *
     * `earliest_date` is the patient's own constraint -- "not before the 20th",
     * because they are away until then. It is not a preference to be weighed
     * against anybody else's; an offer that breaks it is simply wrong.
     */
    public static function join(int $patientId, array $input, ?array $user): array
    {
        $db = Database::connection();
        $settings = self::settings($db);

        if (!$settings['allow']) {
            return self::fail('This clinic is not offering earlier appointments through My Chart at the moment.');
        }

        $appointmentId = (int) ($input['appointment_id'] ?? 0);

        if ($appointmentId <= 0) {
            return self::fail('Which appointment?');
        }

        $now = self::now($db);
        $row = self::ownAppointment($db, $patientId, $appointmentId);

        if (!$row) {
            return self::fail('That appointment is not available for this account.', true);
        }

        $why = self::whyNotJoinable($row, $now);

        if ($why !== null) {
            return self::fail($why);
        }

        $earliest = trim((string) ($input['earliest_date'] ?? ''));

        if ($earliest !== '') {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $earliest)) {
                return self::fail('That date did not make sense.', false, ['earliest_date' => 'Use a date like 2026-12-01.']);
            }

            // A floor later than the appointment itself would leave no window at
            // all, so the entry could never be offered anything. Say so rather
            // than accepting an entry that can never fire.
            if ($earliest >= substr(self::startOf($row), 0, 10)) {
                return self::fail(
                    'That is on or after your current appointment, so there would be nothing earlier to offer.',
                    false,
                    ['earliest_date' => 'Pick a date before ' . $row['appointment_date'] . '.']
                );
            }
        }

        $existing = self::entryForAppointment($db, $appointmentId);

        if ($existing && $existing['status'] === 'active') {
            // Not an error. Re-saving with a new earliest_date is the normal way
            // to change it, and the queue position is deliberately NOT reset --
            // editing a constraint is not re-joining the back of the queue.
            $db->prepare(
                'UPDATE portal_fastpass_waitlist SET earliest_date = :e, updated_at = :now WHERE id = :id'
            )->execute(['e' => $earliest !== '' ? $earliest : null, 'now' => $now, 'id' => $existing['id']]);

            PortalAudit::action($user, $patientId, 'Fast Pass Updated', sprintf(
                'Patient changed the earliest acceptable date on appointment #%d to %s.',
                $appointmentId,
                $earliest !== '' ? $earliest : 'any'
            ));

            return [
                'success' => true,
                'message' => 'Saved. You are still on the list for this appointment.',
                'data' => ['waitlist_id' => (int) $existing['id']],
            ];
        }

        if ($existing) {
            // Rejoining after leaving, going dormant, or an earlier fulfilment.
            //
            // joined_at is reset, because asking again today should not give
            // somebody a queue position from last month ahead of people who
            // joined since. `declines` is reset too: the counter exists to stop
            // this feature pestering someone who is not answering, and a patient
            // who has just asked again is answering.
            //
            // offers_sent and expiries are kept, because they are the desk's
            // history of this entry and nobody is penalised by them.
            $db->prepare(
                "UPDATE portal_fastpass_waitlist
                    SET status = 'active', status_note = NULL, earliest_date = :e,
                        provider_id = :prov, declines = 0, joined_at = :join_now,
                        joined_by = :by, settled_at = NULL, updated_at = :upd_now
                  WHERE id = :id"
            )->execute([
                'e' => $earliest !== '' ? $earliest : null,
                'prov' => (int) $row['provider_id'],
                'join_now' => $now,
                'upd_now' => $now,
                'by' => self::actorId($user),
                'id' => $existing['id'],
            ]);

            $waitlistId = (int) $existing['id'];
        } else {
            $db->prepare(
                "INSERT INTO portal_fastpass_waitlist
                    (patient_id, appointment_id, provider_id, earliest_date, status,
                     joined_at, joined_by, created_at)
                 VALUES (:p, :a, :prov, :e, 'active', :join_now, :by, :create_now)"
            )->execute([
                'p' => $patientId,
                'a' => $appointmentId,
                'prov' => (int) $row['provider_id'],
                'e' => $earliest !== '' ? $earliest : null,
                'join_now' => $now,
                'create_now' => $now,
                'by' => self::actorId($user),
            ]);

            $waitlistId = (int) $db->lastInsertId();
        }

        PortalAudit::action($user, $patientId, 'Fast Pass Joined', sprintf(
            'Patient asked to be offered an earlier slot for appointment #%d on %s %s%s.',
            $appointmentId,
            $row['appointment_date'],
            (string) $row['appointment_time'],
            $earliest !== '' ? ', not before ' . $earliest : ''
        ));

        return [
            'success' => true,
            'message' => 'You are on the list. We will offer you anything earlier that comes free with the same doctor.',
            'data' => ['waitlist_id' => $waitlistId],
        ];
    }

    /** Come off the list. Any live offer for this entry is voided, not declined. */
    public static function leave(int $patientId, array $input, ?array $user): array
    {
        $db = Database::connection();
        $waitlistId = (int) ($input['waitlist_id'] ?? 0);

        if ($waitlistId <= 0) {
            return self::fail('Which list entry?');
        }

        $entry = self::ownEntry($db, $patientId, $waitlistId);

        if (!$entry) {
            return self::fail('That list entry is not available for this account.', true);
        }

        if (in_array($entry['status'], ['withdrawn', 'fulfilled'], true)) {
            return ['success' => true, 'message' => 'You were already off the list for this appointment.'];
        }

        $now = self::now($db);

        $db->prepare(
            "UPDATE portal_fastpass_waitlist
                SET status = 'withdrawn', status_note = 'You asked to come off the list.',
                    settled_at = :set_now, updated_at = :upd_now
              WHERE id = :id AND patient_id = :p"
        )->execute(['set_now' => $now, 'upd_now' => $now, 'id' => $waitlistId, 'p' => $patientId]);

        // Voided rather than declined: the patient did not turn this slot down,
        // they stopped taking part. Counting it as a decline would push them
        // towards a dormancy limit they can no longer reach.
        $released = self::voidOpenOffers($db, 'o.waitlist_id = :w', ['w' => $waitlistId], $now, 'The patient left the list.');

        PortalAudit::action($user, $patientId, 'Fast Pass Left', sprintf(
            'Patient came off the Fast Pass list for appointment #%d.',
            (int) $entry['appointment_id']
        ));

        foreach ($released as $slotId) {
            self::reopenIfNoOpenOffers($db, $slotId, $now);
        }

        return ['success' => true, 'message' => 'You are off the list. Your appointment has not changed.'];
    }

    /**
     * Take the offered slot.
     *
     * The whole correctness of this feature is in this method, in this order:
     *
     *   1. the offer is this patient's, open, and not past its deadline;
     *   2. the slot is claimed with a conditional UPDATE -- exactly one caller
     *      can win that, and a loser is told the truth;
     *   3. the slot is re-checked against the clinic grid, because the desk may
     *      have filled it by hand since it was published;
     *   4. the appointment is moved through AppointmentService::update(), which
     *      is the same double-booking, roster and schedule check the desk gets;
     *   5. and if 3 or 4 fails, the claim is RELEASED. A slot held by a move
     *      that did not happen is worse than a slot nobody was offered.
     */
    public static function accept(int $patientId, array $input, ?array $user): array
    {
        $db = Database::connection();
        $offerId = (int) ($input['offer_id'] ?? 0);

        if ($offerId <= 0) {
            return self::fail('Which offer?');
        }

        $now = self::now($db);
        $offer = self::ownOffer($db, $patientId, $offerId);

        if (!$offer) {
            return self::fail('That offer is not available for this account.', true);
        }

        if ($offer['status'] !== 'open') {
            return self::fail(self::closedOfferMessage($offer));
        }

        if ($offer['expires_at'] < $now) {
            // The sweep has not run yet, but the deadline has passed. Settle it
            // here rather than honouring an expired offer: the slot may already
            // be in a later round with somebody else.
            self::expireOffer($db, (int) $offer['id'], $now);

            return self::fail('That offer has expired. You are still on the list for the next one.');
        }

        $appointment = self::ownAppointment($db, $patientId, (int) $offer['appointment_id']);

        if (!$appointment || $appointment['status'] !== self::CHANGEABLE_STATUS) {
            self::voidOffer($db, (int) $offer['id'], $now, 'The appointment is no longer open.');

            return self::fail('That appointment has changed since the offer was sent, so it cannot be moved now.');
        }

        $slot = self::slotRow($db, (int) $offer['slot_id']);

        if (!$slot) {
            return self::fail('That slot is no longer available.');
        }

        // --- 2. the claim. -------------------------------------------------
        $claim = $db->prepare(
            "UPDATE portal_fastpass_slots
                SET status = 'taken', taken_by_patient_id = :p, taken_by_offer_id = :o,
                    taken_at = :take_now, closed_at = :close_now, updated_at = :upd_now
              WHERE id = :id AND status = 'offered'"
        );
        $claim->execute([
            'p' => $patientId,
            'o' => (int) $offer['id'],
            'take_now' => $now,
            'close_now' => $now,
            'upd_now' => $now,
            'id' => (int) $slot['id'],
        ]);

        if ($claim->rowCount() !== 1) {
            // Somebody else got there first, or the desk withdrew it. Either way
            // this patient keeps their place on the list.
            self::markOffer($db, (int) $offer['id'], 'missed', $now, 'The slot was taken before this answer arrived.');

            return self::fail('Sorry -- that slot has just been taken. You are still on the list for the next one.');
        }

        // --- 3. is it still really free? -----------------------------------
        if (!self::slotStillBookable($db, $slot)) {
            self::releaseClaim(
                $db,
                (int) $slot['id'],
                $now,
                'unavailable',
                'The clinic had already filled this slot when a patient tried to take it.'
            );
            self::markOffer($db, (int) $offer['id'], 'missed', $now, 'The slot was no longer free on the clinic schedule.');

            return self::fail('Sorry -- the clinic has already filled that time. You are still on the list.');
        }

        // --- 4. the move. ---------------------------------------------------
        $slotTime = self::normaliseTime((string) $slot['slot_time']);

        $data = self::appointmentAsInput($appointment);
        $data['appointment_date'] = (string) $slot['slot_date'];
        $data['appointment_time'] = $slotTime;

        $result = (new AppointmentService())->update(
            (int) $appointment['id'],
            $data,
            self::actorId($user)
        );

        if (empty($result['success'])) {
            self::releaseClaim(
                $db,
                (int) $slot['id'],
                $now,
                'open',
                'A patient accepted but the move was refused: ' . self::firstError($result)
            );

            PortalAudit::action($user, $patientId, 'Fast Pass Move Failed', sprintf(
                'Patient accepted offer #%d for %s %s but the move was refused: %s',
                (int) $offer['id'],
                (string) $slot['slot_date'],
                $slotTime,
                self::firstError($result)
            ));

            return self::fail('That time could not be booked after all. You are still on the list, and your appointment has not changed.');
        }

        // --- 5. everything that follows a successful move. ------------------
        $wasDate = (string) $offer['from_date'];
        $wasTime = (string) $offer['from_time'];

        // patient_confirmed_at is SET here, not cleared.
        //
        // M10 clears it on a reschedule, correctly: a confirmation was for the
        // old time and says nothing about the new one. A Fast Pass accept is the
        // opposite case -- the patient was shown one specific time and chose it,
        // which is a stronger statement of intent than tapping Confirm. Asking
        // them to confirm a time they just asked for would be noise.
        $db->prepare(
            "UPDATE appointments
                SET rescheduled_count = rescheduled_count + 1,
                    last_rescheduled_at = :resched_now,
                    rescheduled_from_date = :from_date,
                    rescheduled_from_time = :from_time,
                    rescheduled_by_patient = 1,
                    patient_confirmed_at = :conf_now,
                    updated_at = :upd_now
              WHERE id = :id"
        )->execute([
            'resched_now' => $now,
            'conf_now' => $now,
            'upd_now' => $now,
            'from_date' => $wasDate,
            'from_time' => $wasTime,
            'id' => (int) $appointment['id'],
        ]);

        self::markOffer($db, (int) $offer['id'], 'accepted', $now, null);

        $db->prepare(
            "UPDATE portal_fastpass_waitlist
                SET status = 'fulfilled',
                    status_note = 'You moved to an earlier appointment.',
                    settled_at = :set_now, updated_at = :upd_now
              WHERE id = :id"
        )->execute(['set_now' => $now, 'upd_now' => $now, 'id' => (int) $offer['waitlist_id']]);

        // Everybody else in the same round, told plainly.
        self::missRound($db, (int) $slot['id'], (int) $slot['offer_round'], (int) $offer['id'], $now);

        // The slot the patient has just vacated is itself worth offering, and it
        // is a bigger gap than the one just filled (it was further out, so there
        // is more notice). This is where a Fast Pass chain comes from.
        self::publishFreedSlot(
            $patientId,
            (int) $appointment['id'],
            (int) $appointment['provider_id'],
            $wasDate,
            $wasTime,
            'patient_reschedule',
            $appointment,
            self::actorId($user)
        );

        PortalAudit::action($user, $patientId, 'Fast Pass Accepted', sprintf(
            'Patient accepted offer #%d: appointment #%d moved from %s %s to %s %s.',
            (int) $offer['id'],
            (int) $appointment['id'],
            $wasDate,
            $wasTime,
            (string) $slot['slot_date'],
            $slotTime
        ));

        self::notifyMoved($db, $patientId, $slot, $slotTime, $wasDate, $wasTime);

        return [
            'success' => true,
            'message' => sprintf(
                'Done. Your appointment is now %s at %s.',
                self::prettyDate((string) $slot['slot_date']),
                self::prettyTime($slotTime)
            ),
            'data' => ['date' => (string) $slot['slot_date'], 'time' => $slotTime],
        ];
    }

    /**
     * Turn this offer down, staying on the list.
     *
     * A decline is counted; `portal_fastpass_max_declines` of them and the entry
     * goes dormant, because asking a fourth time is pestering. An offer that
     * simply expired is NOT counted -- see schema 342's header.
     */
    public static function decline(int $patientId, array $input, ?array $user): array
    {
        $db = Database::connection();
        $offerId = (int) ($input['offer_id'] ?? 0);

        if ($offerId <= 0) {
            return self::fail('Which offer?');
        }

        $now = self::now($db);
        $settings = self::settings($db);
        $offer = self::ownOffer($db, $patientId, $offerId);

        if (!$offer) {
            return self::fail('That offer is not available for this account.', true);
        }

        if ($offer['status'] !== 'open') {
            return self::fail(self::closedOfferMessage($offer));
        }

        $reason = mb_substr(trim((string) ($input['reason'] ?? '')), 0, 255);

        self::markOffer($db, (int) $offer['id'], 'declined', $now, null, $reason !== '' ? $reason : null);

        $db->prepare(
            'UPDATE portal_fastpass_waitlist SET declines = declines + 1, updated_at = :now WHERE id = :id'
        )->execute(['now' => $now, 'id' => (int) $offer['waitlist_id']]);

        $entry = self::entryRow($db, (int) $offer['waitlist_id']);
        $dormant = false;

        if ($entry && $entry['status'] === 'active' && (int) $entry['declines'] >= $settings['max_declines']) {
            $db->prepare(
                "UPDATE portal_fastpass_waitlist
                    SET status = 'dormant',
                        status_note = 'You turned down the last few offers, so we have paused them. Ask again whenever you want.',
                        settled_at = :set_now, updated_at = :upd_now
                  WHERE id = :id"
            )->execute(['set_now' => $now, 'upd_now' => $now, 'id' => (int) $entry['id']]);

            $dormant = true;
        }

        PortalAudit::action($user, $patientId, 'Fast Pass Declined', sprintf(
            'Patient declined offer #%d for %s.%s',
            (int) $offer['id'],
            (string) $offer['from_date'],
            $dormant ? ' The list entry is now dormant.' : ''
        ));

        // Offer it on to the next person without waiting for the sweep: the
        // patient has just told us they are not taking it, and the slot's own
        // lead time is still burning.
        self::reopenIfNoOpenOffers($db, (int) $offer['slot_id'], $now);
        self::offerRound($db, (int) $offer['slot_id'], $now, $settings);

        return [
            'success' => true,
            'message' => $dormant
                ? 'No problem. We have paused offers for now -- ask again whenever you want one.'
                : 'No problem. Your appointment has not changed and you are still on the list.',
            'data' => ['dormant' => $dormant],
        ];
    }

    // ==================================================================
    // Publishing a freed slot
    // ==================================================================

    /**
     * Record that a slot came free, so the sweep can offer it.
     *
     * Called from PortalAppointmentService the moment a patient cancels or moves
     * away from a slot, which is the whole point -- a slot found by a nightly
     * sweep has lost most of its value. The sweep also finds cancellations made
     * at the desk, because the staff appointment routes are outside My Chart and
     * are deliberately not touched by this phase.
     *
     * Returns the slot id, or null when there is nothing to publish. It never
     * throws: a cancel must not fail because Fast Pass could not record it.
     */
    public static function publishFreedSlot(
        ?int $patientId,
        ?int $appointmentId,
        int $providerId,
        string $date,
        string $time,
        string $source,
        ?array $appointment = null,
        int $actorId = 0
    ): ?int {
        try {
            $db = Database::connection();

            if (!self::settings($db)['allow']) {
                return null;
            }

            if ($providerId <= 0 || $date === '' || $time === '') {
                return null;
            }

            $now = self::now($db);
            $time = self::normaliseTime($time);

            // A slot in the past, or too close to be offerable, is not worth a
            // row. The board would only fill with gaps nobody could ever take.
            if (trim($date . ' ' . $time) <= $now) {
                return null;
            }

            $existing = $db->prepare(
                "SELECT id FROM portal_fastpass_slots
                  WHERE provider_id = :prov AND slot_date = :d AND slot_time = :t
                    AND status IN ('open','offered')
                  LIMIT 1"
            );
            $existing->execute(['prov' => $providerId, 'd' => $date, 't' => $time]);
            $already = $existing->fetchColumn();

            if ($already !== false) {
                return (int) $already;
            }

            $insert = $db->prepare(
                "INSERT INTO portal_fastpass_slots
                    (provider_id, slot_date, slot_time, visit_category_id, facility_id,
                     source, source_appointment_id, status, published_at, published_by, created_at)
                 VALUES (:prov, :d, :t, :vc, :fac, :src, :appt, 'open', :pub_now, :by, :create_now)
                 ON DUPLICATE KEY UPDATE
                    status = IF(status IN ('open','offered'), status, 'open'),
                    status_note = IF(status IN ('open','offered'), status_note, NULL),
                    offer_round = IF(status IN ('open','offered'), offer_round, 0),
                    closed_at = IF(status IN ('open','offered'), closed_at, NULL),
                    taken_by_patient_id = IF(status IN ('open','offered'), taken_by_patient_id, NULL),
                    taken_by_offer_id = IF(status IN ('open','offered'), taken_by_offer_id, NULL),
                    taken_at = IF(status IN ('open','offered'), taken_at, NULL),
                    published_at = VALUES(published_at),
                    updated_at = VALUES(published_at)"
            );
            $insert->execute([
                'prov' => $providerId,
                'd' => $date,
                't' => $time,
                'vc' => $appointment['visit_category_id'] ?? null,
                'fac' => $appointment['facility_id'] ?? null,
                'src' => in_array($source, ['patient_cancel', 'patient_reschedule', 'desk_cancel', 'desk_manual'], true)
                    ? $source
                    : 'desk_manual',
                'appt' => $appointmentId ?: null,
                'pub_now' => $now,
                'create_now' => $now,
                'by' => $actorId ?: null,
            ]);

            $slotId = (int) $db->lastInsertId();

            if ($slotId === 0) {
                // ON DUPLICATE KEY took the update branch, which returns 0 here.
                $find = $db->prepare(
                    'SELECT id FROM portal_fastpass_slots
                      WHERE provider_id = :prov AND slot_date = :d AND slot_time = :t
                        AND source_appointment_id <=> :appt LIMIT 1'
                );
                $find->execute(['prov' => $providerId, 'd' => $date, 't' => $time, 'appt' => $appointmentId ?: null]);
                $slotId = (int) $find->fetchColumn();
            }

            return $slotId > 0 ? $slotId : null;
        } catch (\Throwable $e) {
            // Deliberately swallowed. The caller has just cancelled or moved a
            // real appointment; failing that because Fast Pass could not write a
            // row would be the wrong trade by a wide margin. The sweep picks up
            // desk cancellations anyway, so nothing is permanently lost.
            return null;
        }
    }

    /**
     * A patient's appointment has changed or gone. Void any live Fast Pass
     * state hanging off it.
     *
     * Also called from PortalAppointmentService. An open offer whose underlying
     * appointment has moved describes a trade that no longer exists -- its
     * from_date and from_time are stale -- so it is voided rather than left to
     * expire, and the slot goes back into the queue.
     */
    public static function appointmentChanged(int $appointmentId, bool $gone): void
    {
        try {
            $db = Database::connection();
            $now = self::now($db);

            $released = self::voidOpenOffers(
                $db,
                'o.appointment_id = :a',
                ['a' => $appointmentId],
                $now,
                $gone ? 'The appointment was cancelled.' : 'The appointment was moved, so the offer no longer applied.'
            );

            if ($gone) {
                $db->prepare(
                    "UPDATE portal_fastpass_waitlist
                        SET status = 'withdrawn',
                            status_note = 'The appointment this was for has been cancelled.',
                            settled_at = :set_now, updated_at = :upd_now
                      WHERE appointment_id = :a AND status IN ('active','dormant')"
                )->execute(['set_now' => $now, 'upd_now' => $now, 'a' => $appointmentId]);
            } else {
                // Keep the entry: the patient still wants to come in sooner. Its
                // provider is re-read on every sweep, and the target time comes
                // from the appointment itself, so a moved appointment needs no
                // repair here.
                $db->prepare(
                    'UPDATE portal_fastpass_waitlist SET updated_at = :now WHERE appointment_id = :a'
                )->execute(['now' => $now, 'a' => $appointmentId]);
            }

            foreach ($released as $slotId) {
                self::reopenIfNoOpenOffers($db, $slotId, $now);
            }
        } catch (\Throwable $e) {
            // Same trade as publishFreedSlot(): never fail the appointment change.
        }
    }

    // ==================================================================
    // The engine
    // ==================================================================

    /**
     * One pass of the whole machine. Idempotent, safe to run as often as
     * anything cares to, and returns what it did so the desk can see it.
     *
     * Order matters and is not arbitrary:
     *   1. settle offers whose deadline has passed, so a slot is not held by a
     *      dead round;
     *   2. void offers whose appointment is no longer movable;
     *   3. close slots whose own lead time has passed;
     *   4. find cancellations nobody published (the desk's own);
     *   5. only then offer, so step 4's finds can go out in this same pass.
     *
     * Step 5 is the expensive one -- it asks the clinic grid whether each live
     * slot is still free, which is several queries per slot -- and this runs from
     * cron every five minutes forever. So it is skipped entirely when nobody is
     * on the list, which is the common case for most of the day.
     *
     * That skip costs one thing, named here so it is not mistaken for a bug: a
     * slot the desk has filled by hand stays labelled "waiting to be offered"
     * instead of "filled some other way", until its lead time passes and step 3
     * closes it. It is a labelling difference in the one case where the feature
     * did nothing anyway, because there was nobody to offer it to.
     */
    public static function sweep(): array
    {
        $db = Database::connection();
        $now = self::now($db);
        $settings = self::settings($db);

        $done = [
            'expired_offers' => 0,
            'voided_offers' => 0,
            'closed_slots' => 0,
            'found_slots' => 0,
            'offers_sent' => 0,
            'slots_offered' => 0,
            'waiting' => 0,
            'enabled' => $settings['allow'],
            'ran_at' => $now,
        ];

        if (!$settings['allow']) {
            return $done;
        }

        $done['expired_offers'] = self::expireDueOffers($db, $now);
        $done['voided_offers'] = count(self::voidStaleOffers($db, $now));
        $done['closed_slots'] = self::closeDueSlots($db, $now, $settings);
        $done['found_slots'] = self::findDeskCancellations($db, $now);

        // Nobody waiting, nothing to offer. The steps above still ran, because
        // an offer already out has to expire and a slot already published has to
        // close whether or not anybody new has joined -- it is only the offering
        // that is pointless, and it is the part that costs queries.
        $done['waiting'] = (int) $db->query(
            "SELECT COUNT(*) FROM portal_fastpass_waitlist WHERE status = 'active'"
        )->fetchColumn();

        if ($done['waiting'] === 0) {
            return $done;
        }

        // Everything still live and unoffered, soonest slot first: a slot at
        // nine tomorrow has less time left than one next week, so it gets the
        // round first.
        $slots = $db->prepare(
            "SELECT s.id
               FROM portal_fastpass_slots s
              WHERE s.status IN ('open','offered')
                AND NOT EXISTS (
                    SELECT 1 FROM portal_fastpass_offers o
                     WHERE o.slot_id = s.id AND o.status = 'open'
                )
              ORDER BY s.slot_date, s.slot_time
              LIMIT 200"
        );
        $slots->execute();

        foreach ($slots->fetchAll(PDO::FETCH_COLUMN) as $slotId) {
            self::reopenIfNoOpenOffers($db, (int) $slotId, $now);
            $sent = self::offerRound($db, (int) $slotId, $now, $settings);

            if ($sent > 0) {
                $done['offers_sent'] += $sent;
                $done['slots_offered']++;
            }
        }

        return $done;
    }

    /**
     * Offer one slot to the next batch of eligible patients.
     *
     * @return int how many offers went out (0 is a normal, common answer)
     */
    private static function offerRound(PDO $db, int $slotId, string $now, array $settings): int
    {
        $slot = self::slotRow($db, $slotId);

        if (!$slot || !in_array($slot['status'], ['open', 'offered'], true)) {
            return 0;
        }

        $slotTime = self::normaliseTime((string) $slot['slot_time']);
        $slotAt = trim($slot['slot_date'] . ' ' . $slotTime);

        // The deadline can never run past the point where the slot stops being
        // offerable, so an offer always expires while the slot is still real.
        $latest = date('Y-m-d H:i:s', strtotime($slotAt) - ($settings['min_lead_hours'] * 3600));
        $wanted = date('Y-m-d H:i:s', strtotime($now) + ($settings['offer_hours'] * 3600));
        $expires = min($wanted, $latest);

        if (strtotime($expires) - strtotime($now) < self::MIN_WINDOW_MINUTES * 60) {
            // Not enough window left to ask anybody. Left alone here; the sweep's
            // own closing step marks it expired once the lead time passes, and
            // the board says so rather than pretending it was offered.
            return 0;
        }

        if (!self::slotStillBookable($db, $slot)) {
            self::closeSlot(
                $db,
                $slotId,
                'unavailable',
                'The clinic filled this slot before it could be offered.',
                $now
            );

            return 0;
        }

        $candidates = self::candidatesFor($db, $slot, $slotAt, $now, $settings);

        if (!$candidates) {
            return 0;
        }

        $round = (int) $slot['offer_round'] + 1;
        $sent = 0;

        $insert = $db->prepare(
            "INSERT IGNORE INTO portal_fastpass_offers
                (slot_id, waitlist_id, patient_id, appointment_id, from_date, from_time,
                 round, status, offered_at, expires_at, created_at)
             VALUES (:s, :w, :p, :a, :fd, :ft, :r, 'open', :off_now, :exp, :create_now)"
        );

        foreach ($candidates as $candidate) {
            $insert->execute([
                's' => $slotId,
                'w' => (int) $candidate['waitlist_id'],
                'p' => (int) $candidate['patient_id'],
                'a' => (int) $candidate['appointment_id'],
                'fd' => (string) $candidate['appointment_date'],
                'ft' => (string) $candidate['appointment_time'],
                'r' => $round,
                'off_now' => $now,
                'exp' => $expires,
                'create_now' => $now,
            ]);

            if ($insert->rowCount() === 0) {
                continue;
            }

            $offerId = (int) $db->lastInsertId();
            $sent++;

            $db->prepare(
                'UPDATE portal_fastpass_waitlist
                    SET offers_sent = offers_sent + 1, last_offer_at = :off_now, updated_at = :upd_now
                  WHERE id = :id'
            )->execute(['off_now' => $now, 'upd_now' => $now, 'id' => (int) $candidate['waitlist_id']]);

            self::notifyOffer($db, $candidate, $slot, $slotTime, $expires, $offerId);
        }

        if ($sent > 0) {
            $db->prepare(
                "UPDATE portal_fastpass_slots
                    SET status = 'offered', offer_round = :r, offers_made = offers_made + :n,
                        updated_at = :now
                  WHERE id = :id"
            )->execute(['r' => $round, 'n' => $sent, 'now' => $now, 'id' => $slotId]);
        }

        return $sent;
    }

    /**
     * Who should hear about this slot, in queue order.
     *
     * Every condition here is a reason somebody must NOT be offered it, so the
     * query reads as the eligibility rule rather than as a search:
     *
     *   - the entry is active;
     *   - the appointment still exists, is still scheduled, and is still with
     *     the slot's provider (re-read from the appointment, not the waitlist's
     *     denormalised copy, so a provider change on the booking cannot send an
     *     offer to the wrong doctor's list);
     *   - the appointment is LATER than the slot, or there is nothing to gain;
     *   - the slot respects the patient's own earliest_date;
     *   - this entry has no other offer open, so one appointment can never be
     *     promised to two slots;
     *   - this entry has not already been offered this slot in an earlier round;
     *   - and the patient is under their daily offer limit.
     */
    private static function candidatesFor(PDO $db, array $slot, string $slotAt, string $now, array $settings): array
    {
        $dayAgo = date('Y-m-d H:i:s', strtotime($now) - 86400);

        $stmt = $db->prepare(
            "SELECT w.id AS waitlist_id, w.patient_id, w.earliest_date,
                    a.id AS appointment_id, a.appointment_date, a.appointment_time, a.is_all_day,
                    NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '') AS patient_name
               FROM portal_fastpass_waitlist w
               JOIN appointments a ON a.id = w.appointment_id
               JOIN patients p ON p.id = w.patient_id
              WHERE w.status = 'active'
                AND a.deleted_at IS NULL
                AND a.is_provider_block = 0
                AND a.status = :changeable
                AND a.provider_id = :prov
                AND TRIM(CONCAT(a.appointment_date, ' ',
                        IF(a.is_all_day = 1, '00:00:00', a.appointment_time))) > :slot_at
                AND (w.earliest_date IS NULL OR w.earliest_date <= :slot_date)
                AND NOT EXISTS (
                    SELECT 1 FROM portal_fastpass_offers o
                     WHERE o.waitlist_id = w.id AND o.status = 'open'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM portal_fastpass_offers o2
                     WHERE o2.waitlist_id = w.id AND o2.slot_id = :slot_id
                )
                AND (
                    SELECT COUNT(*) FROM portal_fastpass_offers o3
                     WHERE o3.patient_id = w.patient_id AND o3.offered_at >= :day_ago
                ) < :max_per_day
              ORDER BY w.joined_at, w.id
              LIMIT :batch"
        );

        $stmt->bindValue('changeable', self::CHANGEABLE_STATUS);
        $stmt->bindValue('prov', (int) $slot['provider_id'], PDO::PARAM_INT);
        $stmt->bindValue('slot_at', $slotAt);
        $stmt->bindValue('slot_date', (string) $slot['slot_date']);
        $stmt->bindValue('slot_id', (int) $slot['id'], PDO::PARAM_INT);
        $stmt->bindValue('day_ago', $dayAgo);
        $stmt->bindValue('max_per_day', $settings['max_per_day'], PDO::PARAM_INT);
        $stmt->bindValue('batch', $settings['batch'], PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // One offer per PATIENT per slot, even where a patient has two
        // appointments on the list with the same doctor. Two offers for one slot
        // in one message is confusing, and only one of them could ever be taken.
        $seen = [];
        $out = [];

        foreach ($rows as $row) {
            $patientId = (int) $row['patient_id'];

            if (isset($seen[$patientId])) {
                continue;
            }

            $seen[$patientId] = true;
            $out[] = $row;
        }

        return $out;
    }

    /**
     * Is this slot genuinely free on the clinic's own schedule right now?
     *
     * Asks DoctorRosterAvailabilityService through AppointmentService, which is
     * the same answer the desk's booking screen gets -- operating hours, break
     * times, non-duty days, emergency blocks, daily capacity and existing
     * bookings. Reimplementing any of that here would mean two descriptions of
     * when a clinic is open, and they would disagree within a month.
     */
    private static function slotStillBookable(PDO $db, array $slot): bool
    {
        $wantTime = substr(self::normaliseTime((string) $slot['slot_time']), 0, 5);

        try {
            $days = (new AppointmentService())->findAvailableSlots(
                (int) $slot['provider_id'],
                (string) $slot['slot_date'],
                1
            );
        } catch (\Throwable $e) {
            // If availability cannot be determined, do not offer. A wrong "yes"
            // here double-books a clinic; a wrong "no" costs one empty chair.
            return false;
        }

        foreach ($days as $day) {
            if ((string) ($day['date'] ?? '') !== (string) $slot['slot_date']) {
                continue;
            }

            foreach (($day['slots'] ?? []) as $candidate) {
                if (substr((string) ($candidate['time'] ?? ''), 0, 5) !== $wantTime) {
                    continue;
                }

                return !empty($candidate['available']);
            }
        }

        // The time is not on the grid at all -- the clinic's hours or slot length
        // changed since the appointment that vacated it was booked.
        return false;
    }

    /** Settle every offer whose deadline has gone by. */
    private static function expireDueOffers(PDO $db, string $now): int
    {
        $ids = $db->prepare(
            "SELECT id, waitlist_id, slot_id FROM portal_fastpass_offers
              WHERE status = 'open' AND expires_at < :now"
        );
        $ids->execute(['now' => $now]);
        $rows = $ids->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $row) {
            self::expireOffer($db, (int) $row['id'], $now);
        }

        foreach (array_unique(array_map(static fn($r) => (int) $r['slot_id'], $rows)) as $slotId) {
            self::reopenIfNoOpenOffers($db, $slotId, $now);
        }

        return count($rows);
    }

    private static function expireOffer(PDO $db, int $offerId, string $now): void
    {
        $stmt = $db->prepare(
            "UPDATE portal_fastpass_offers
                SET status = 'expired', responded_at = NULL,
                    outcome_note = 'No answer before the deadline.', updated_at = :now
              WHERE id = :id AND status = 'open'"
        );
        $stmt->execute(['now' => $now, 'id' => $offerId]);

        if ($stmt->rowCount() === 0) {
            return;
        }

        // Counted, but against nothing. An unanswered offer may only mean the
        // patient was asleep, so it never pushes an entry towards dormancy --
        // it is here so the desk can see a list entry that never responds.
        $db->prepare(
            'UPDATE portal_fastpass_waitlist w
                JOIN portal_fastpass_offers o ON o.waitlist_id = w.id
                SET w.expiries = w.expiries + 1, w.updated_at = :now
              WHERE o.id = :id'
        )->execute(['now' => $now, 'id' => $offerId]);
    }

    /**
     * Offers whose appointment is no longer movable -- cancelled at the desk,
     * completed, marked no-show, soft-deleted, or moved to a time at or before
     * the slot it was offered.
     *
     * @return int[] slot ids that may need reopening
     */
    private static function voidStaleOffers(PDO $db, string $now): array
    {
        return self::voidOpenOffers(
            $db,
            "(a.id IS NULL
              OR a.deleted_at IS NOT NULL
              OR a.status <> " . $db->quote(self::CHANGEABLE_STATUS) . "
              OR TRIM(CONCAT(a.appointment_date, ' ',
                     IF(a.is_all_day = 1, '00:00:00', a.appointment_time)))
                 <= TRIM(CONCAT(s.slot_date, ' ', s.slot_time)))",
            [],
            $now,
            'The appointment changed, so this offer no longer applied.'
        );
    }

    /**
     * Void every open offer matching a condition, and say which slots lost one.
     *
     * @return int[] distinct slot ids
     */
    private static function voidOpenOffers(PDO $db, string $condition, array $params, string $now, string $note): array
    {
        $find = $db->prepare(
            "SELECT o.id, o.slot_id
               FROM portal_fastpass_offers o
               JOIN portal_fastpass_slots s ON s.id = o.slot_id
               LEFT JOIN appointments a ON a.id = o.appointment_id
              WHERE o.status = 'open' AND ({$condition})"
        );
        $find->execute($params);
        $rows = $find->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $row) {
            self::voidOffer($db, (int) $row['id'], $now, $note);
        }

        return array_values(array_unique(array_map(static fn($r) => (int) $r['slot_id'], $rows)));
    }

    private static function voidOffer(PDO $db, int $offerId, string $now, string $note): void
    {
        $db->prepare(
            "UPDATE portal_fastpass_offers
                SET status = 'void', outcome_note = :note, updated_at = :now
              WHERE id = :id AND status = 'open'"
        )->execute(['note' => mb_substr($note, 0, 255), 'now' => $now, 'id' => $offerId]);
    }

    /** Slots whose own lead time has run out, or that are no longer bookable. */
    private static function closeDueSlots(PDO $db, string $now, array $settings): int
    {
        $cutoff = date('Y-m-d H:i:s', strtotime($now) + ($settings['min_lead_hours'] * 3600));

        $stmt = $db->prepare(
            "SELECT id FROM portal_fastpass_slots
              WHERE status IN ('open','offered')
                AND TRIM(CONCAT(slot_date, ' ', slot_time)) <= :cutoff"
        );
        $stmt->execute(['cutoff' => $cutoff]);
        $closed = 0;

        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $slotId) {
            self::voidOpenOffers($db, 's.id = :s', ['s' => (int) $slotId], $now, 'The slot is now too soon to offer.');
            self::closeSlot(
                $db,
                (int) $slotId,
                'expired',
                sprintf('Nobody took it before it came within %d hours.', $settings['min_lead_hours']),
                $now
            );
            $closed++;
        }

        return $closed;
    }

    /**
     * Cancellations nobody published: the desk's own, and anything from before
     * this phase existed.
     *
     * Bounded by `published_at` rather than scanning all history, so the first
     * sweep on an existing database does not publish a year of dead slots. Only
     * cancellations recorded in the last week are considered, and the lead-time
     * check throws out everything already too close.
     */
    private static function findDeskCancellations(PDO $db, string $now): int
    {
        $since = date('Y-m-d H:i:s', strtotime($now) - (7 * 86400));

        $stmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.provider_id, a.appointment_date, a.appointment_time,
                    a.visit_category_id, a.facility_id, a.cancelled_by_patient
               FROM appointments a
              WHERE a.status = 'cancelled'
                AND a.deleted_at IS NULL
                AND a.is_provider_block = 0
                AND a.is_all_day = 0
                AND a.provider_id IS NOT NULL
                AND a.cancelled_at IS NOT NULL
                AND a.cancelled_at >= :since
                AND TRIM(CONCAT(a.appointment_date, ' ', a.appointment_time)) > :now
                AND NOT EXISTS (
                    SELECT 1 FROM portal_fastpass_slots s
                     WHERE s.source_appointment_id = a.id
                )
              ORDER BY a.appointment_date, a.appointment_time
              LIMIT 100"
        );
        $stmt->execute(['since' => $since, 'now' => $now]);
        $found = 0;

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $slotId = self::publishFreedSlot(
                (int) $row['patient_id'],
                (int) $row['id'],
                (int) $row['provider_id'],
                (string) $row['appointment_date'],
                (string) $row['appointment_time'],
                (int) $row['cancelled_by_patient'] === 1 ? 'patient_cancel' : 'desk_cancel',
                $row,
                0
            );

            if ($slotId !== null) {
                $found++;
            }
        }

        return $found;
    }

    /** Put a slot back in the queue once it has no live offers. */
    private static function reopenIfNoOpenOffers(PDO $db, int $slotId, string $now): void
    {
        $db->prepare(
            "UPDATE portal_fastpass_slots s
                SET s.status = 'open', s.updated_at = :now
              WHERE s.id = :id AND s.status = 'offered'
                AND NOT EXISTS (
                    SELECT 1 FROM portal_fastpass_offers o
                     WHERE o.slot_id = s.id AND o.status = 'open'
                )"
        )->execute(['now' => $now, 'id' => $slotId]);
    }

    /** Let go of a claim that did not turn into a move. */
    private static function releaseClaim(PDO $db, int $slotId, string $now, string $to, string $note): void
    {
        if ($to === 'open') {
            $db->prepare(
                "UPDATE portal_fastpass_slots
                    SET status = 'open', status_note = :note, taken_by_patient_id = NULL,
                        taken_by_offer_id = NULL, taken_at = NULL, closed_at = NULL,
                        updated_at = :now
                  WHERE id = :id AND status = 'taken'"
            )->execute(['note' => mb_substr($note, 0, 200), 'now' => $now, 'id' => $slotId]);

            return;
        }

        $db->prepare(
            "UPDATE portal_fastpass_slots
                SET status = :to, status_note = :note, taken_by_patient_id = NULL,
                    taken_by_offer_id = NULL, taken_at = NULL, closed_at = :close_now,
                    updated_at = :upd_now
              WHERE id = :id AND status = 'taken'"
        )->execute(['to' => $to, 'note' => mb_substr($note, 0, 200), 'close_now' => $now, 'upd_now' => $now, 'id' => $slotId]);
    }

    private static function closeSlot(PDO $db, int $slotId, string $status, string $note, string $now): void
    {
        $db->prepare(
            "UPDATE portal_fastpass_slots
                SET status = :s, status_note = :note, closed_at = :close_now, updated_at = :upd_now
              WHERE id = :id AND status IN ('open','offered')"
        )->execute(['s' => $status, 'note' => mb_substr($note, 0, 200), 'close_now' => $now, 'upd_now' => $now, 'id' => $slotId]);
    }

    /** Everybody else in the winning round, told the truth about why. */
    private static function missRound(PDO $db, int $slotId, int $round, int $winnerId, string $now): void
    {
        $db->prepare(
            "UPDATE portal_fastpass_offers
                SET status = 'missed',
                    outcome_note = 'Another patient accepted this slot first.',
                    updated_at = :now
              WHERE slot_id = :s AND round = :r AND id <> :w AND status = 'open'"
        )->execute(['s' => $slotId, 'r' => $round, 'w' => $winnerId, 'now' => $now]);
    }

    private static function markOffer(PDO $db, int $offerId, string $status, string $now, ?string $note, ?string $declineReason = null): void
    {
        $db->prepare(
            "UPDATE portal_fastpass_offers
                SET status = :s, responded_at = :resp_now, outcome_note = :note,
                    decline_reason = COALESCE(:dr, decline_reason), updated_at = :upd_now
              WHERE id = :id"
        )->execute([
            's' => $status,
            'resp_now' => $now,
            'upd_now' => $now,
            'note' => $note !== null ? mb_substr($note, 0, 255) : null,
            'dr' => $declineReason,
            'id' => $offerId,
        ]);
    }

    // ==================================================================
    // Notifications
    // ==================================================================

    /**
     * Tell the patient a slot is free.
     *
     * Deliberately says nothing about why it came free. "Someone cancelled" is
     * another patient's business, and in a small clinic with one specialist it
     * is identifying.
     */
    private static function notifyOffer(PDO $db, array $candidate, array $slot, string $slotTime, string $expires, int $offerId): void
    {
        try {
            PortalNotificationService::queue(
                (int) $candidate['patient_id'],
                'fastpass_offer',
                [
                    'date' => self::prettyDate((string) $slot['slot_date']),
                    'time' => self::prettyTime($slotTime),
                    'doctor' => self::doctorName($db, (int) $slot['provider_id']),
                    'was' => self::prettyDate((string) $candidate['appointment_date'])
                        . ' at ' . self::prettyTime((string) $candidate['appointment_time']),
                    'until' => self::prettyDate(substr($expires, 0, 10)) . ', ' . self::prettyTime(substr($expires, 11)),
                    'link_id' => $offerId,
                ],
                // One notification per offer. The dedupe key is the offer id, so
                // a sweep that somehow ran twice cannot send the same offer twice.
                'fastpass_offer:' . $offerId
            );
        } catch (\Throwable $e) {
            // An offer that could not be notified is still an offer: it shows in
            // the app, and the desk can telephone. Losing the whole round over a
            // mail failure would be worse.
        }
    }

    private static function notifyMoved(PDO $db, int $patientId, array $slot, string $slotTime, string $wasDate, string $wasTime): void
    {
        try {
            PortalNotificationService::queue(
                $patientId,
                'fastpass_moved',
                [
                    'date' => self::prettyDate((string) $slot['slot_date']),
                    'time' => self::prettyTime($slotTime),
                    'doctor' => self::doctorName($db, (int) $slot['provider_id']),
                    'was' => self::prettyDate($wasDate) . ' at ' . self::prettyTime($wasTime),
                ],
                'fastpass_moved:' . (int) $slot['id'] . ':' . $patientId
            );
        } catch (\Throwable $e) {
            // The move has already happened and been audited; the confirmation
            // is a courtesy, not the record.
        }
    }

    // ==================================================================
    // The clinic's side
    // ==================================================================

    /**
     * The board: freed slots and what became of them, newest first.
     *
     * `filled` and `missed` are the two numbers that say whether this feature is
     * worth keeping, so they are counted here rather than left to be worked out
     * by eye.
     */
    public static function board(string $query = '', string $scope = 'live'): array
    {
        $db = Database::connection();
        $now = self::now($db);

        $where = ["s.id > 0"];
        $params = [];

        if ($scope === 'live') {
            $where[] = "s.status IN ('open','offered')";
        } elseif ($scope === 'settled') {
            $where[] = "s.status NOT IN ('open','offered')";
        }

        $query = trim($query);

        if ($query !== '') {
            $where[] = "(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,'')) LIKE :q
                         OR s.slot_date LIKE :q OR s.status LIKE :q OR s.source LIKE :q)";
            $params['q'] = '%' . $query . '%';
        }

        $stmt = $db->prepare(
            "SELECT s.*,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))), '') AS doctor,
                    NULLIF(TRIM(CONCAT(COALESCE(tp.first_name,''), ' ', COALESCE(tp.last_name,''))), '') AS taken_by,
                    tp.patient_no AS taken_by_no,
                    (SELECT COUNT(*) FROM portal_fastpass_offers o WHERE o.slot_id = s.id) AS offer_count,
                    (SELECT COUNT(*) FROM portal_fastpass_offers o WHERE o.slot_id = s.id AND o.status = 'open') AS open_count
               FROM portal_fastpass_slots s
               LEFT JOIN providers pr ON pr.id = s.provider_id
               LEFT JOIN employees e ON e.id = pr.employee_id
               LEFT JOIN patients tp ON tp.id = s.taken_by_patient_id
              WHERE " . implode(' AND ', $where) . "
              ORDER BY s.status IN ('open','offered') DESC, s.slot_date, s.slot_time
              LIMIT 200"
        );
        $stmt->execute($params);

        $items = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $items[] = self::presentSlot($row, $now);
        }

        $totals = $db->query(
            "SELECT
                SUM(status IN ('open','offered')) AS live,
                SUM(status = 'taken') AS filled,
                SUM(status = 'expired') AS expired,
                SUM(status = 'unavailable') AS unavailable,
                SUM(status = 'withdrawn') AS withdrawn,
                COUNT(*) AS total
             FROM portal_fastpass_slots"
        )->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'items' => $items,
            'totals' => array_map(static fn($v) => (int) $v, $totals),
            'waiting' => (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_waitlist WHERE status = 'active'")->fetchColumn(),
            'settings' => self::settings($db),
            'server_time' => $now,
        ];
    }

    /** One slot, with every offer it produced. */
    public static function slotDetail(int $slotId): ?array
    {
        $db = Database::connection();
        $now = self::now($db);
        $slot = self::slotRow($db, $slotId);

        if (!$slot) {
            return null;
        }

        $stmt = $db->prepare(
            "SELECT o.*,
                    NULLIF(TRIM(CONCAT(COALESCE(p.first_name,''), ' ', COALESCE(p.last_name,''))), '') AS patient_name,
                    p.patient_no
               FROM portal_fastpass_offers o
               LEFT JOIN patients p ON p.id = o.patient_id
              WHERE o.slot_id = :s
              ORDER BY o.round DESC, o.id"
        );
        $stmt->execute(['s' => $slotId]);

        $offers = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $offers[] = [
                'id' => (int) $row['id'],
                'round' => (int) $row['round'],
                'patient' => $row['patient_name'] ?: ('Patient #' . $row['patient_id']),
                'patient_no' => $row['patient_no'],
                'from' => trim($row['from_date'] . ' ' . substr((string) $row['from_time'], 0, 5)),
                'status' => $row['status'],
                'status_label' => self::OFFER_LABELS[$row['status']] ?? $row['status'],
                'offered_at' => $row['offered_at'],
                'expires_at' => $row['expires_at'],
                'responded_at' => $row['responded_at'],
                'decline_reason' => $row['decline_reason'],
                'note' => $row['outcome_note'],
            ];
        }

        return [
            'slot' => self::presentSlot($slot + ['doctor' => self::doctorName($db, (int) $slot['provider_id'])], $now),
            'offers' => $offers,
            'server_time' => $now,
        ];
    }

    /** How a slot's state reads on the board. */
    public const SLOT_LABELS = [
        'open' => 'Waiting to be offered',
        'offered' => 'Offered, awaiting answers',
        'taken' => 'Filled',
        'expired' => 'Came too close, not filled',
        'unavailable' => 'Filled some other way',
        'withdrawn' => 'Withdrawn by the desk',
    ];

    public const OFFER_LABELS = [
        'open' => 'Awaiting an answer',
        'accepted' => 'Accepted',
        'declined' => 'Declined',
        'expired' => 'No answer',
        'missed' => 'Someone else took it',
        'void' => 'No longer applied',
    ];

    public const SOURCE_LABELS = [
        'patient_cancel' => 'Patient cancelled',
        'patient_reschedule' => 'Patient moved away from it',
        'desk_cancel' => 'Cancelled at the desk',
        'desk_manual' => 'Published by the desk',
    ];

    /** The queue, in the order it will be offered to. */
    public static function waitlistBoard(string $query = ''): array
    {
        $db = Database::connection();
        $now = self::now($db);

        $where = ["w.status IN ('active','dormant')"];
        $params = [];
        $query = trim($query);

        if ($query !== '') {
            $where[] = "(CONCAT(COALESCE(p.first_name,''), ' ', COALESCE(p.last_name,'')) LIKE :q OR p.patient_no LIKE :q)";
            $params['q'] = '%' . $query . '%';
        }

        $stmt = $db->prepare(
            "SELECT w.*,
                    NULLIF(TRIM(CONCAT(COALESCE(p.first_name,''), ' ', COALESCE(p.last_name,''))), '') AS patient_name,
                    p.patient_no,
                    a.appointment_date, a.appointment_time, a.status AS appointment_status, a.is_all_day,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))), '') AS doctor
               FROM portal_fastpass_waitlist w
               LEFT JOIN patients p ON p.id = w.patient_id
               LEFT JOIN appointments a ON a.id = w.appointment_id
               LEFT JOIN providers pr ON pr.id = w.provider_id
               LEFT JOIN employees e ON e.id = pr.employee_id
              WHERE " . implode(' AND ', $where) . "
              ORDER BY w.status, w.joined_at, w.id
              LIMIT 200"
        );
        $stmt->execute($params);

        $items = [];
        $place = 0;

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if ($row['status'] === 'active') {
                $place++;
            }

            $items[] = [
                'id' => (int) $row['id'],
                'place' => $row['status'] === 'active' ? $place : null,
                'patient' => $row['patient_name'] ?: ('Patient #' . $row['patient_id']),
                'patient_no' => $row['patient_no'],
                'doctor' => $row['doctor'],
                'appointment_id' => (int) $row['appointment_id'],
                'appointment' => $row['appointment_date']
                    ? trim($row['appointment_date'] . ' ' . substr((string) $row['appointment_time'], 0, 5))
                    : null,
                'appointment_status' => $row['appointment_status'],
                'earliest_date' => $row['earliest_date'],
                'status' => $row['status'],
                'status_note' => $row['status_note'],
                'offers_sent' => (int) $row['offers_sent'],
                'declines' => (int) $row['declines'],
                'expiries' => (int) $row['expiries'],
                'last_offer_at' => $row['last_offer_at'],
                'joined_at' => $row['joined_at'],
            ];
        }

        return ['items' => $items, 'server_time' => $now];
    }

    /**
     * Publish a gap by hand -- a doctor freeing an hour, a slot the desk knows
     * about that no cancellation produced.
     *
     * Checked against the clinic grid before it is accepted, so the desk cannot
     * publish a time the schedule does not have or that is already booked.
     */
    public static function publishManual(array $input, ?array $user): array
    {
        $db = Database::connection();
        $settings = self::settings($db);

        if (!$settings['allow']) {
            return self::fail('Fast Pass is switched off in settings.');
        }

        $providerId = (int) ($input['provider_id'] ?? 0);
        $date = trim((string) ($input['date'] ?? ''));
        $time = trim((string) ($input['time'] ?? ''));

        $errors = [];

        if ($providerId <= 0) {
            $errors['provider_id'] = 'Choose a doctor.';
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $errors['date'] = 'Pick a date.';
        }
        if (!preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $time)) {
            $errors['time'] = 'Pick a time.';
        }

        if ($errors) {
            return self::fail('Check the form.', false, $errors);
        }

        $now = self::now($db);
        $time = self::normaliseTime($time);
        $at = trim($date . ' ' . $time);
        $cutoff = date('Y-m-d H:i:s', strtotime($now) + ($settings['min_lead_hours'] * 3600));

        if ($at <= $cutoff) {
            return self::fail(
                sprintf(
                    'That is within %d hours, which is too soon to offer. Telephone whoever you want to bring in.',
                    $settings['min_lead_hours']
                ),
                false,
                ['date' => 'Too soon to offer.']
            );
        }

        if (!self::slotStillBookable($db, ['provider_id' => $providerId, 'slot_date' => $date, 'slot_time' => $time])) {
            return self::fail(
                'That time is not free on the clinic schedule -- it is booked, blocked, or outside this doctor\'s hours.',
                false,
                ['time' => 'Not available.']
            );
        }

        $slotId = self::publishFreedSlot(null, null, $providerId, $date, $time, 'desk_manual', null, self::actorId($user));

        if ($slotId === null) {
            return self::fail('That slot could not be published.');
        }

        PortalAudit::action($user, null, 'Fast Pass Slot Published', sprintf(
            'Staff published a Fast Pass slot for provider #%d at %s %s.',
            $providerId,
            $date,
            $time
        ));

        $sent = self::offerRound($db, $slotId, $now, $settings);

        return [
            'success' => true,
            'message' => $sent > 0
                ? sprintf('Published, and offered to %d %s on the list.', $sent, $sent === 1 ? 'patient' : 'patients')
                : 'Published. Nobody on the list is eligible for it yet, so it is waiting.',
            'data' => ['slot_id' => $slotId, 'offers_sent' => $sent],
        ];
    }

    /** Pull a slot back. Any live offer on it is voided, not left to expire. */
    public static function withdrawSlot(array $input, ?array $user): array
    {
        $db = Database::connection();
        $slotId = (int) ($input['slot_id'] ?? 0);

        if ($slotId <= 0) {
            return self::fail('Which slot?');
        }

        $slot = self::slotRow($db, $slotId);

        if (!$slot) {
            return self::fail('That slot was not found.', true);
        }

        if (!in_array($slot['status'], ['open', 'offered'], true)) {
            return self::fail('That slot is already settled (' . (self::SLOT_LABELS[$slot['status']] ?? $slot['status']) . ').');
        }

        $now = self::now($db);
        $note = mb_substr(trim((string) ($input['reason'] ?? '')), 0, 200);

        self::voidOpenOffers($db, 's.id = :s', ['s' => $slotId], $now, 'The clinic withdrew this slot.');
        self::closeSlot($db, $slotId, 'withdrawn', $note !== '' ? $note : 'Withdrawn by the desk.', $now);

        PortalAudit::action($user, null, 'Fast Pass Slot Withdrawn', sprintf(
            'Staff withdrew Fast Pass slot #%d (%s %s).%s',
            $slotId,
            (string) $slot['slot_date'],
            (string) $slot['slot_time'],
            $note !== '' ? ' Reason: ' . $note : ''
        ));

        return ['success' => true, 'message' => 'Withdrawn. Anyone who had been offered it has been told it is no longer available.'];
    }

    /** Doctors with a provider record, for the manual-publish form. */
    public static function findProviders(string $query = ''): array
    {
        $db = Database::connection();
        $query = trim($query);

        $sql = "SELECT pr.id,
                       NULLIF(TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))), '') AS name,
                       pr.specialty
                  FROM providers pr
                  LEFT JOIN employees e ON e.id = pr.employee_id";
        $params = [];

        if ($query !== '') {
            $sql .= " WHERE CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,'')) LIKE :q
                         OR pr.specialty LIKE :q";
            $params['q'] = '%' . $query . '%';
        }

        $sql .= ' ORDER BY name LIMIT 50';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return array_map(static fn($r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'] ?: ('Provider #' . $r['id']),
            'specialty' => $r['specialty'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ==================================================================
    // Presentation
    // ==================================================================

    private static function presentSlot(array $row, string $now): array
    {
        $time = self::normaliseTime((string) $row['slot_time']);

        return [
            'id' => (int) $row['id'],
            'provider_id' => (int) $row['provider_id'],
            'doctor' => $row['doctor'] ?? null,
            'date' => (string) $row['slot_date'],
            'time' => substr($time, 0, 5),
            'when' => self::prettyDate((string) $row['slot_date']) . ' at ' . self::prettyTime($time),
            'hours_away' => (int) floor((strtotime($row['slot_date'] . ' ' . $time) - strtotime($now)) / 3600),
            'source' => $row['source'],
            'source_label' => self::SOURCE_LABELS[$row['source']] ?? $row['source'],
            'status' => $row['status'],
            'status_label' => self::SLOT_LABELS[$row['status']] ?? $row['status'],
            'status_note' => $row['status_note'],
            'round' => (int) $row['offer_round'],
            'offers_made' => (int) $row['offers_made'],
            'offer_count' => isset($row['offer_count']) ? (int) $row['offer_count'] : null,
            'open_count' => isset($row['open_count']) ? (int) $row['open_count'] : null,
            'taken_by' => $row['taken_by'] ?? null,
            'taken_by_no' => $row['taken_by_no'] ?? null,
            'taken_at' => $row['taken_at'],
            'published_at' => $row['published_at'],
            'closed_at' => $row['closed_at'],
        ];
    }

    /** Live offers for this patient, with the deadline spelled out. */
    private static function liveOffersFor(PDO $db, int $patientId, string $now, array $settings): array
    {
        $stmt = $db->prepare(
            "SELECT o.*, s.slot_date, s.slot_time, s.provider_id, s.status AS slot_status,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))), '') AS doctor
               FROM portal_fastpass_offers o
               JOIN portal_fastpass_slots s ON s.id = o.slot_id
               LEFT JOIN providers pr ON pr.id = s.provider_id
               LEFT JOIN employees e ON e.id = pr.employee_id
              WHERE o.patient_id = :p AND o.status = 'open' AND o.expires_at >= :now
              ORDER BY o.expires_at
              LIMIT 10"
        );
        $stmt->execute(['p' => $patientId, 'now' => $now]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $time = self::normaliseTime((string) $row['slot_time']);

            $out[] = [
                'id' => (int) $row['id'],
                'appointment_id' => (int) $row['appointment_id'],
                'date' => (string) $row['slot_date'],
                'time' => substr($time, 0, 5),
                'offered' => self::prettyDate((string) $row['slot_date']) . ' at ' . self::prettyTime($time),
                'instead_of' => self::prettyDate((string) $row['from_date']) . ' at ' . self::prettyTime((string) $row['from_time']),
                'doctor' => $row['doctor'],
                'expires_at' => $row['expires_at'],
                'deadline' => self::prettyDate(substr((string) $row['expires_at'], 0, 10))
                    . ' at ' . self::prettyTime(substr((string) $row['expires_at'], 11)),
                'minutes_left' => max(0, (int) floor((strtotime((string) $row['expires_at']) - strtotime($now)) / 60)),
                // Said on the offer itself, not only in the terms, because this
                // is the screen where somebody decides.
                'caveat' => 'A few patients are offered the same slot. If it goes before you answer, you stay on the list.',
            ];
        }

        return $out;
    }

    /** This patient's list entries, in whatever state they are in. */
    private static function entriesFor(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT w.*, a.appointment_date, a.appointment_time, a.status AS appointment_status, a.is_all_day,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))), '') AS doctor
               FROM portal_fastpass_waitlist w
               LEFT JOIN appointments a ON a.id = w.appointment_id
               LEFT JOIN providers pr ON pr.id = w.provider_id
               LEFT JOIN employees e ON e.id = pr.employee_id
              WHERE w.patient_id = :p AND w.status IN ('active','dormant')
              ORDER BY a.appointment_date, a.appointment_time
              LIMIT 20"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $time = (int) $row['is_all_day'] === 1 ? null : self::normaliseTime((string) $row['appointment_time']);

            $out[] = [
                'id' => (int) $row['id'],
                'appointment_id' => (int) $row['appointment_id'],
                'appointment' => $row['appointment_date']
                    ? self::prettyDate((string) $row['appointment_date']) . ($time ? ' at ' . self::prettyTime($time) : '')
                    : null,
                'doctor' => $row['doctor'],
                'earliest_date' => $row['earliest_date'],
                'status' => $row['status'],
                'status_note' => $row['status_note'],
                'offers_sent' => (int) $row['offers_sent'],
                'joined_at' => $row['joined_at'],
                // No queue position is shown to the patient.
                //
                // It is knowable -- the desk sees it -- but telling a patient
                // they are fourth invites them to read it as a promise, and it
                // moves for reasons that have nothing to do with them: somebody
                // ahead leaves, somebody is offered a slot this patient could
                // not have taken anyway. A number that moves backwards with no
                // explanation is worse than no number.
                'note' => $row['status'] === 'dormant'
                    ? ($row['status_note'] ?: 'Offers are paused for this appointment.')
                    : 'We will offer you anything earlier that comes free with the same doctor.',
            ];
        }

        return $out;
    }

    /** Appointments this patient could put on the list but has not. */
    private static function joinableFor(PDO $db, int $patientId, string $now): array
    {
        $stmt = $db->prepare(
            "SELECT a.id, a.appointment_date, a.appointment_time, a.is_all_day, a.status,
                    vc.name AS visit_category,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))), '') AS doctor
               FROM appointments a
               LEFT JOIN visit_categories vc ON vc.id = a.visit_category_id
               LEFT JOIN providers pr ON pr.id = a.provider_id
               LEFT JOIN employees e ON e.id = pr.employee_id
              WHERE a.patient_id = :p
                AND a.deleted_at IS NULL
                AND a.is_provider_block = 0
                AND a.status = :changeable
                AND a.provider_id IS NOT NULL
                AND TRIM(CONCAT(a.appointment_date, ' ',
                        IF(a.is_all_day = 1, '00:00:00', a.appointment_time))) > :now
                AND NOT EXISTS (
                    SELECT 1 FROM portal_fastpass_waitlist w
                     WHERE w.appointment_id = a.id AND w.status IN ('active','dormant')
                )
              ORDER BY a.appointment_date, a.appointment_time
              LIMIT 20"
        );
        $stmt->execute(['p' => $patientId, 'changeable' => self::CHANGEABLE_STATUS, 'now' => $now]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $time = (int) $row['is_all_day'] === 1 ? null : self::normaliseTime((string) $row['appointment_time']);

            $out[] = [
                'id' => (int) $row['id'],
                'title' => $row['visit_category'] ?: 'Appointment',
                'doctor' => $row['doctor'],
                'date' => (string) $row['appointment_date'],
                'when' => self::prettyDate((string) $row['appointment_date'])
                    . ($time ? ' at ' . self::prettyTime($time) : ''),
                'all_day' => (int) $row['is_all_day'] === 1,
            ];
        }

        return $out;
    }

    /**
     * Why this appointment cannot go on the list, or null if it can.
     *
     * An all-day booking is refused rather than quietly accepted: it has no
     * meaningful time to be earlier than, and the slot grid it would be matched
     * against is made of timed slots.
     */
    private static function whyNotJoinable(array $row, string $now): ?string
    {
        if ($row['status'] === 'cancelled') {
            return 'That appointment was cancelled.';
        }

        if ($row['status'] === 'completed') {
            return 'That visit has already happened.';
        }

        if ($row['status'] !== self::CHANGEABLE_STATUS) {
            return 'Please call the clinic about this appointment.';
        }

        if ((int) ($row['is_all_day'] ?? 0) === 1) {
            return 'This booking is for a whole day, so there is no earlier time to offer.';
        }

        if ((int) ($row['provider_id'] ?? 0) <= 0) {
            return 'This appointment has no doctor assigned yet, so there is nothing to match it against.';
        }

        if (self::startOf($row) <= $now) {
            return 'That appointment has already passed.';
        }

        return null;
    }

    // ==================================================================
    // Plumbing
    // ==================================================================

    /**
     * The database's clock, not PHP's.
     *
     * Everything in this file compares and stores datetimes, and the two clocks
     * are seven hours apart on the machine this was written on. One source, read
     * once per request, passed down.
     */
    private static function now(PDO $db): string
    {
        return (string) $db->query('SELECT NOW()')->fetchColumn();
    }

    /** The hospital's Fast Pass policy, with every value bounded. */
    public static function settings(?PDO $db = null): array
    {
        $db = $db ?? Database::connection();

        try {
            $row = $db->query(
                "SELECT portal_allow_fastpass, portal_fastpass_offer_hours, portal_fastpass_min_lead_hours,
                        portal_fastpass_offer_batch, portal_fastpass_max_declines,
                        portal_fastpass_max_offers_per_day
                 FROM general_settings ORDER BY id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $row = null;
        }

        // Every bound here is a guard against a settings value that would break
        // the feature rather than configure it: a zero batch offers to nobody, a
        // zero offer window expires on arrival, and a 10,000-hour lead time means
        // nothing is ever offerable.
        return [
            'allow' => (int) ($row['portal_allow_fastpass'] ?? (self::DEFAULTS['allow'] ? 1 : 0)) === 1,
            'offer_hours' => self::bounded($row['portal_fastpass_offer_hours'] ?? null, 1, 72, self::DEFAULTS['offer_hours']),
            'min_lead_hours' => self::bounded($row['portal_fastpass_min_lead_hours'] ?? null, 0, 24 * 14, self::DEFAULTS['min_lead_hours']),
            'batch' => self::bounded($row['portal_fastpass_offer_batch'] ?? null, 1, 25, self::DEFAULTS['batch']),
            'max_declines' => self::bounded($row['portal_fastpass_max_declines'] ?? null, 1, 50, self::DEFAULTS['max_declines']),
            'max_per_day' => self::bounded($row['portal_fastpass_max_offers_per_day'] ?? null, 1, 20, self::DEFAULTS['max_per_day']),
        ];
    }

    private static function bounded($value, int $min, int $max, int $fallback): int
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        $int = (int) $value;

        return ($int >= $min && $int <= $max) ? $int : $fallback;
    }

    /** One of this patient's own appointments, or null. Never takes an id on trust. */
    private static function ownAppointment(PDO $db, int $patientId, int $appointmentId): ?array
    {
        $stmt = $db->prepare(
            'SELECT * FROM appointments
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL AND is_provider_block = 0
              LIMIT 1'
        );
        $stmt->execute(['id' => $appointmentId, 'p' => $patientId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function ownEntry(PDO $db, int $patientId, int $waitlistId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM portal_fastpass_waitlist WHERE id = :id AND patient_id = :p LIMIT 1');
        $stmt->execute(['id' => $waitlistId, 'p' => $patientId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function ownOffer(PDO $db, int $patientId, int $offerId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM portal_fastpass_offers WHERE id = :id AND patient_id = :p LIMIT 1');
        $stmt->execute(['id' => $offerId, 'p' => $patientId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function entryRow(PDO $db, int $waitlistId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM portal_fastpass_waitlist WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $waitlistId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function entryForAppointment(PDO $db, int $appointmentId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM portal_fastpass_waitlist WHERE appointment_id = :a LIMIT 1');
        $stmt->execute(['a' => $appointmentId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function slotRow(PDO $db, int $slotId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM portal_fastpass_slots WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $slotId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * The appointment shaped as update() input.
     *
     * Same reason as M10: buildAppointmentFields() keeps nothing it is not
     * given, so a move has to send the whole existing row back with the date and
     * time written over it. Recurrence is passed through untouched -- accepting
     * one earlier slot must not rewrite a series rule.
     */
    private static function appointmentAsInput(array $row): array
    {
        return [
            'patient_id' => (int) $row['patient_id'],
            'provider_id' => (int) $row['provider_id'],
            'is_provider_block' => 0,
            'title' => $row['title'],
            'visit_category_id' => $row['visit_category_id'],
            'provider_category_id' => $row['provider_category_id'],
            'facility_id' => $row['facility_id'],
            'billing_facility_id' => $row['billing_facility_id'],
            'room_id' => $row['room_id'],
            'appointment_date' => $row['appointment_date'],
            'appointment_time' => $row['appointment_time'],
            'is_all_day' => (int) $row['is_all_day'],
            'recurrence_mode' => $row['recurrence_mode'] ?? 'none',
            'recurrence_position' => $row['recurrence_position'],
            'recurrence_day_type' => $row['recurrence_day_type'],
            'recurrence_days_of_week' => $row['recurrence_days_of_week'],
            'recurrence_until_date' => $row['recurrence_until_date'],
            'reason' => $row['reason'],
            'notes' => $row['notes'],
            'status' => $row['status'],
        ];
    }

    /** The appointment's start as a comparable datetime; all-day starts at midnight. */
    private static function startOf(array $row): string
    {
        $time = (int) ($row['is_all_day'] ?? 0) === 1
            ? '00:00:00'
            : self::normaliseTime((string) $row['appointment_time']);

        return trim($row['appointment_date'] . ' ' . $time);
    }

    /** 'H:i' or 'H:i:s' in, always 'H:i:s' out, so string comparison is safe. */
    private static function normaliseTime(string $time): string
    {
        $time = trim($time);

        if (preg_match('/^(\d{1,2}):(\d{2})$/', $time, $m)) {
            return sprintf('%02d:%02d:00', (int) $m[1], (int) $m[2]);
        }

        if (preg_match('/^(\d{1,2}):(\d{2}):(\d{2})$/', $time, $m)) {
            return sprintf('%02d:%02d:%02d', (int) $m[1], (int) $m[2], (int) $m[3]);
        }

        return $time;
    }

    private static function doctorName(PDO $db, int $providerId): string
    {
        $stmt = $db->prepare(
            "SELECT NULLIF(TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))), '')
               FROM providers pr LEFT JOIN employees e ON e.id = pr.employee_id
              WHERE pr.id = :id LIMIT 1"
        );
        $stmt->execute(['id' => $providerId]);
        $name = $stmt->fetchColumn();

        return $name ? 'Dr ' . $name : 'your doctor';
    }

    private static function prettyDate(string $date): string
    {
        $ts = strtotime($date);

        return $ts === false ? $date : date('D j M Y', $ts);
    }

    private static function prettyTime(string $time): string
    {
        $ts = strtotime('2000-01-01 ' . self::normaliseTime($time));

        return $ts === false ? $time : date('g:i a', $ts);
    }

    /** Why a closed offer cannot be answered, in the patient's words. */
    private static function closedOfferMessage(array $offer): string
    {
        return match ($offer['status']) {
            'accepted' => 'You have already taken that slot.',
            'declined' => 'You have already turned that one down.',
            'expired' => 'That offer has expired. You are still on the list for the next one.',
            'missed' => 'That slot was taken by someone else. You are still on the list.',
            'void' => 'That offer no longer applies, because the appointment it was for has changed.',
            default => 'That offer is no longer open.',
        };
    }

    private static function firstError(array $result): string
    {
        foreach ((array) ($result['errors'] ?? []) as $message) {
            if (is_string($message) && $message !== '') {
                return $message;
            }
        }

        return (string) ($result['message'] ?? 'no reason given');
    }

    private static function actorId(?array $user): int
    {
        return (int) ($user['id'] ?? 0);
    }

    private static function fail(string $message, bool $notFound = false, ?array $errors = null): array
    {
        return array_filter([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'not_found' => $notFound ?: null,
        ], static fn($v) => $v !== null);
    }
}
