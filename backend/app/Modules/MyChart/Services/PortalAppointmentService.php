<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\Appointments\Services\AppointmentService;
use PDO;

/**
 * Appointment self-service in My Chart (Phase M10): moving, cancelling and
 * confirming one's own appointment.
 *
 * Why this exists rather than opening the staff routes to the patient role: PUT
 * /appointments updates any field of any appointment, and DELETE soft-deletes it.
 * A patient needs to change exactly two things (the date and the time) on exactly
 * their own future bookings, and a patient cancel must leave the row visible to
 * the desk. So this is a narrow service over the same rules, resolved through
 * PortalGuard like every other My Chart action -- no endpoint here takes a
 * patient_id from the request.
 *
 * Slot safety is NOT reimplemented. A reschedule goes through
 * AppointmentService::update(), which already checks double-booking, the doctor's
 * roster and the clinic's operating schedule. Two things to know about reusing it:
 *
 *   - buildAppointmentFields() does not preserve what it is not given. Passing
 *     only a date and time would blank the facility, room, visit category, reason
 *     and notes. So a reschedule sends the existing row back with the new date and
 *     time written over it.
 *   - update() does not enforce a future date (deliberately -- staff mark past
 *     appointments completed). A patient must not move an appointment into the
 *     past, so eligibility checks that here before update() is called.
 */
class PortalAppointmentService
{
    /** Default when general_settings has not been seeded. */
    private const DEFAULT_CUTOFF_HOURS = 24;

    /** How far ahead the slot search looks when offering a patient new times. */
    private const SLOT_SEARCH_DAYS = 30;

    /** A patient may only ever touch a booking in this state. */
    private const CHANGEABLE_STATUS = 'scheduled';

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    /**
     * This patient's upcoming appointments, each carrying what the patient is
     * allowed to do with it and, where they are not, why not. The app renders the
     * reason rather than hiding a disabled button with no explanation.
     */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();

        $stmt = $db->prepare(
            "SELECT a.id, a.appointment_date, a.appointment_time, a.is_all_day, a.reason, a.notes,
                    a.status, a.patient_confirmed_at, a.rescheduled_count, a.last_rescheduled_at,
                    a.rescheduled_from_date, a.rescheduled_from_time,
                    a.cancelled_at, a.cancel_reason, a.cancelled_by_patient,
                    f.name AS facility, vc.name AS visit_category, d.name AS department,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS doctor,
                    a.provider_id
             FROM appointments a
             LEFT JOIN facilities f ON f.id = a.facility_id
             LEFT JOIN visit_categories vc ON vc.id = a.visit_category_id
             LEFT JOIN providers pr ON pr.id = a.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN departments d ON d.id = pe.department_id
             WHERE a.patient_id = :p
               AND a.deleted_at IS NULL
               AND a.is_provider_block = 0
               AND a.appointment_date >= CURDATE()
             ORDER BY a.appointment_date, a.appointment_time
             LIMIT 60"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $can = self::eligibility($row, $settings);

            $out[] = [
                'id' => (int) $row['id'],
                'date' => $row['appointment_date'],
                'time' => (int) $row['is_all_day'] === 1 ? null : $row['appointment_time'],
                'all_day' => (int) $row['is_all_day'] === 1,
                'title' => $row['visit_category'] ?: 'Appointment',
                'facility' => $row['facility'],
                'department' => $row['department'],
                'doctor' => $row['doctor'],
                'reason' => $row['reason'],
                'status' => $row['status'],
                'confirmed' => $row['patient_confirmed_at'] !== null,
                'confirmed_at' => $row['patient_confirmed_at'],
                'moved_before' => (int) $row['rescheduled_count'] > 0,
                'moved_from' => $row['rescheduled_from_date']
                    ? trim($row['rescheduled_from_date'] . ' ' . (string) $row['rescheduled_from_time'])
                    : null,
                'cancelled_at' => $row['cancelled_at'],
                'cancel_reason' => $row['cancel_reason'],
                'can_reschedule' => $can['reschedule'],
                'can_cancel' => $can['cancel'],
                'can_confirm' => $can['confirm'],
                'blocked_reason' => $can['reason'],
            ];
        }

        return [
            'items' => $out,
            'cutoff_hours' => $settings['cutoff_hours'],
            'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /**
     * Times the patient could move this appointment to: the same provider's free
     * slots, from the cut-off onwards. Keeping the provider fixed is deliberate --
     * choosing a different doctor is a new booking decision, not a reschedule, and
     * it would quietly bypass whatever referral or continuity the booking carried.
     */
    public static function slotsFor(int $patientId, int $appointmentId): ?array
    {
        $row = self::ownRow($patientId, $appointmentId);

        if (!$row) {
            return null;
        }

        $settings = self::settings();
        $can = self::eligibility($row, $settings);

        if (!$can['reschedule']) {
            return ['appointment_id' => $appointmentId, 'days' => [], 'blocked_reason' => $can['reason']];
        }

        $earliest = self::earliestAllowed($settings['cutoff_hours']);
        $slots = (new AppointmentService())->findAvailableSlots(
            (int) $row['provider_id'],
            substr($earliest, 0, 10),
            self::SLOT_SEARCH_DAYS
        );

        // findAvailableSlots returns a row per DAY, each carrying its own 'slots'
        // list where every entry says whether it is free and why not. Only free
        // ones are offered, and a closed day arrives with an empty list.
        //
        // It also works a whole day at a time, so the first day still contains
        // times inside the cut-off; those are dropped here.
        $usable = [];
        $currentTime = substr((string) $row['appointment_time'], 0, 5);

        foreach ($slots as $day) {
            $date = (string) ($day['date'] ?? '');

            if ($date === '' || empty($day['slots'])) {
                continue;
            }

            $free = [];
            foreach ($day['slots'] as $slot) {
                if (empty($slot['available'])) {
                    continue;
                }

                $time = substr((string) ($slot['time'] ?? ''), 0, 5);

                if ($time === '') {
                    continue;
                }
                if (trim($date . ' ' . $time . ':00') < $earliest) {
                    continue;
                }
                if ($date === $row['appointment_date'] && $time === $currentTime) {
                    continue;   // the slot it is already in
                }

                $free[] = $time;
            }

            if ($free) {
                $usable[] = ['date' => $date, 'times' => $free];
            }
        }

        return [
            'appointment_id' => $appointmentId,
            'current' => ['date' => $row['appointment_date'], 'time' => $row['appointment_time']],
            'doctor_fixed' => true,
            'days' => $usable,
            'cutoff_hours' => $settings['cutoff_hours'],
            'blocked_reason' => null,
        ];
    }

    // ------------------------------------------------------------------
    // Changing
    // ------------------------------------------------------------------

    /**
     * Move this appointment to a new date and time, keeping the same provider.
     *
     * Delegates to AppointmentService::update() so the double-booking, roster and
     * clinic-schedule checks are the same ones the desk gets. Two patients racing
     * for the last slot is settled there, and the loser is told the slot is taken.
     */
    public static function reschedule(int $patientId, array $input, ?array $user): array
    {
        $appointmentId = (int) ($input['appointment_id'] ?? 0);
        $date = trim((string) ($input['date'] ?? ''));
        $time = trim((string) ($input['time'] ?? ''));

        if ($appointmentId <= 0) {
            return self::fail('Which appointment?');
        }

        $row = self::ownRow($patientId, $appointmentId);

        if (!$row) {
            return self::fail('That appointment is not available for this account.', true);
        }

        $settings = self::settings();
        $can = self::eligibility($row, $settings);

        if (!$can['reschedule']) {
            return self::fail($can['reason'] ?? 'This appointment cannot be moved.');
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return self::fail('Pick a date to move it to.', false, ['date' => 'A date is required.']);
        }

        if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $time)) {
            return self::fail('Pick a time to move it to.', false, ['time' => 'A time is required.']);
        }

        $time = strlen($time) === 5 ? $time . ':00' : $time;
        $earliest = self::earliestAllowed($settings['cutoff_hours']);

        // The new slot has to clear the same cut-off the old one did, otherwise a
        // patient could move an appointment to two hours from now.
        if (trim($date . ' ' . $time) < $earliest) {
            return self::fail(
                sprintf('Pick a time at least %d hours from now.', $settings['cutoff_hours']),
                false,
                ['date' => 'Too soon.']
            );
        }

        // Send the existing row back with only the date and time changed --
        // buildAppointmentFields() keeps nothing it is not given.
        $data = self::existingAsInput($row);
        $data['appointment_date'] = $date;
        $data['appointment_time'] = $time;

        $result = (new AppointmentService())->update($appointmentId, $data, self::actorId($user));

        if (empty($result['success'])) {
            // update() reports a taken slot and a closed clinic through 'errors'.
            return [
                'success' => false,
                'message' => $result['message'] === 'Validation failed.'
                    ? 'That time is not available any more.'
                    : ($result['message'] ?? 'That did not work.'),
                'errors' => $result['errors'] ?? null,
            ];
        }

        self::stampReschedule($appointmentId, $row);

        PortalAudit::action(
            $user,
            $patientId,
            'Appointment Rescheduled',
            sprintf(
                'Patient moved appointment #%d from %s %s to %s %s.',
                $appointmentId,
                $row['appointment_date'],
                (string) $row['appointment_time'],
                $date,
                $time
            )
        );

        return [
            'success' => true,
            'message' => 'Your appointment has been moved. You will get a reminder before the new date.',
        ];
    }

    /**
     * Cancel this appointment.
     *
     * Sets status = 'cancelled' and keeps the row. It deliberately does not call
     * AppointmentService::remove(), which soft-deletes: a deleted row disappears
     * from the desk's day, so nobody would know the slot had come free or that the
     * patient had cancelled at all.
     */
    public static function cancel(int $patientId, array $input, ?array $user): array
    {
        $appointmentId = (int) ($input['appointment_id'] ?? 0);
        $reason = trim((string) ($input['reason'] ?? ''));

        if ($appointmentId <= 0) {
            return self::fail('Which appointment?');
        }

        $row = self::ownRow($patientId, $appointmentId);

        if (!$row) {
            return self::fail('That appointment is not available for this account.', true);
        }

        $can = self::eligibility($row, self::settings());

        if (!$can['cancel']) {
            return self::fail($can['reason'] ?? 'This appointment cannot be cancelled.');
        }

        if ($reason === '') {
            return self::fail('Please say why you are cancelling.', false, ['reason' => 'A reason helps the clinic offer your slot to someone else.']);
        }

        $stmt = Database::connection()->prepare(
            "UPDATE appointments
                SET status = 'cancelled',
                    cancelled_at = NOW(),
                    cancel_reason = :reason,
                    cancelled_by_patient = 1,
                    updated_at = NOW(),
                    updated_by = :by
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL AND status = :changeable"
        );
        $stmt->execute([
            'reason' => mb_substr($reason, 0, 255),
            'by' => self::actorId($user),
            'id' => $appointmentId,
            'p' => $patientId,
            'changeable' => self::CHANGEABLE_STATUS,
        ]);

        // The status in the WHERE makes this safe against two taps at once: the
        // second affects nothing, and the patient is told it is already cancelled.
        if ($stmt->rowCount() === 0) {
            return self::fail('That appointment has already been changed.');
        }

        PortalAudit::action(
            $user,
            $patientId,
            'Appointment Cancelled',
            sprintf(
                'Patient cancelled appointment #%d on %s %s. Reason: %s',
                $appointmentId,
                $row['appointment_date'],
                (string) $row['appointment_time'],
                $reason
            )
        );

        return ['success' => true, 'message' => 'Your appointment has been cancelled.'];
    }

    /**
     * Confirm attendance, so the desk can tell a silent patient from one who has
     * said they are coming. Not a change to the booking, so it stays available
     * inside the cut-off and when reschedule and cancel are switched off -- right
     * up to the appointment itself.
     */
    public static function confirm(int $patientId, array $input, ?array $user): array
    {
        $appointmentId = (int) ($input['appointment_id'] ?? 0);

        if ($appointmentId <= 0) {
            return self::fail('Which appointment?');
        }

        $row = self::ownRow($patientId, $appointmentId);

        if (!$row) {
            return self::fail('That appointment is not available for this account.', true);
        }

        $can = self::eligibility($row, self::settings());

        if (!$can['confirm']) {
            return self::fail($can['reason'] ?? 'This appointment cannot be confirmed.');
        }

        $stmt = Database::connection()->prepare(
            "UPDATE appointments
                SET patient_confirmed_at = NOW(), updated_at = NOW(), updated_by = :by
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL
                AND status = :changeable AND patient_confirmed_at IS NULL"
        );
        $stmt->execute([
            'by' => self::actorId($user),
            'id' => $appointmentId,
            'p' => $patientId,
            'changeable' => self::CHANGEABLE_STATUS,
        ]);

        if ($stmt->rowCount() === 0) {
            return ['success' => true, 'message' => 'Thank you, that was already confirmed.'];
        }

        PortalAudit::action(
            $user,
            $patientId,
            'Appointment Confirmed',
            sprintf('Patient confirmed appointment #%d on %s.', $appointmentId, $row['appointment_date'])
        );

        return ['success' => true, 'message' => 'Thank you. The clinic knows you are coming.'];
    }

    // ------------------------------------------------------------------
    // Eligibility
    // ------------------------------------------------------------------

    /**
     * What may be done with this appointment, and the first reason it may not.
     *
     * Order matters: the most specific, most useful explanation wins, because this
     * string is what the patient reads instead of a dead button.
     *
     * @return array{reschedule: bool, cancel: bool, confirm: bool, reason: ?string}
     */
    private static function eligibility(array $row, array $settings): array
    {
        $no = static fn(string $reason) => ['reschedule' => false, 'cancel' => false, 'confirm' => false, 'reason' => $reason];

        if ($row['status'] === 'cancelled') {
            return $no('This appointment was cancelled.');
        }

        if ($row['status'] === 'completed') {
            return $no('This visit has already happened.');
        }

        if ($row['status'] === 'no_show') {
            return $no('This appointment was recorded as missed. Please call the clinic.');
        }

        if ($row['status'] !== self::CHANGEABLE_STATUS) {
            return $no('Please call the clinic to change this appointment.');
        }

        $when = self::startOf($row);

        if ($when < date('Y-m-d H:i:s')) {
            return $no('This appointment has already passed.');
        }

        // Confirming stays open inside the cut-off: saying "I am coming" the night
        // before is exactly when it is most useful to the desk.
        $insideCutoff = $when < self::earliestAllowed($settings['cutoff_hours']);

        if ($insideCutoff) {
            return [
                'reschedule' => false,
                'cancel' => false,
                'confirm' => true,
                'reason' => sprintf(
                    'Changes close %d hours before the appointment. Please call the clinic.',
                    $settings['cutoff_hours']
                ),
            ];
        }

        return [
            'reschedule' => $settings['allow_reschedule'],
            'cancel' => $settings['allow_cancel'],
            'confirm' => true,
            'reason' => (!$settings['allow_reschedule'] && !$settings['allow_cancel'])
                ? 'This clinic asks that appointment changes go through the desk.'
                : null,
        ];
    }

    /** The appointment's start as a comparable datetime; an all-day booking starts at midnight. */
    private static function startOf(array $row): string
    {
        $time = (int) ($row['is_all_day'] ?? 0) === 1 ? '00:00:00' : (string) $row['appointment_time'];

        return trim($row['appointment_date'] . ' ' . $time);
    }

    /** The earliest datetime a patient may still move or book into. */
    private static function earliestAllowed(int $cutoffHours): string
    {
        return date('Y-m-d H:i:s', strtotime("+{$cutoffHours} hours"));
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    /** One of this patient's own appointments, or null. Never takes an id on trust. */
    private static function ownRow(int $patientId, int $appointmentId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM appointments
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL AND is_provider_block = 0
              LIMIT 1"
        );
        $stmt->execute(['id' => $appointmentId, 'p' => $patientId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * The existing row shaped as update() input, so nothing is lost when only the
     * date and time are being changed. Recurrence is passed through untouched: a
     * patient moving one occurrence must not rewrite the series rule.
     */
    private static function existingAsInput(array $row): array
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

    /**
     * Record that the patient moved it: the slot it came from, when, and how many
     * times it has happened. Confirmation is cleared, because a confirmation was
     * for the old time and says nothing about the new one.
     */
    private static function stampReschedule(int $appointmentId, array $was): void
    {
        $stmt = Database::connection()->prepare(
            "UPDATE appointments
                SET rescheduled_count = rescheduled_count + 1,
                    last_rescheduled_at = NOW(),
                    rescheduled_from_date = :from_date,
                    rescheduled_from_time = :from_time,
                    rescheduled_by_patient = 1,
                    patient_confirmed_at = NULL
              WHERE id = :id"
        );
        $stmt->execute([
            'from_date' => $was['appointment_date'],
            'from_time' => $was['appointment_time'],
            'id' => $appointmentId,
        ]);
    }

    /** The hospital's self-service policy, with defaults if settings are missing. */
    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                "SELECT portal_appointment_cutoff_hours, portal_allow_self_reschedule, portal_allow_self_cancel
                 FROM general_settings ORDER BY id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $row = null;
        }

        $hours = (int) ($row['portal_appointment_cutoff_hours'] ?? self::DEFAULT_CUTOFF_HOURS);

        return [
            // A negative or absurd cut-off would lock patients out of their own
            // appointments, so fall back rather than trust the column.
            'cutoff_hours' => ($hours >= 0 && $hours <= 24 * 30) ? $hours : self::DEFAULT_CUTOFF_HOURS,
            'allow_reschedule' => (int) ($row['portal_allow_self_reschedule'] ?? 1) === 1,
            'allow_cancel' => (int) ($row['portal_allow_self_cancel'] ?? 1) === 1,
        ];
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
