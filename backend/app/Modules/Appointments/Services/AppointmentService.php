<?php

namespace App\Modules\Appointments\Services;

use App\Core\Database;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Models\Provider;
use PDO;
use Throwable;

class AppointmentService
{
    /**
     * Hard safety ceiling on how many rows a single recurring series
     * can materialize, regardless of how far out the until-date is.
     */
    private const MAX_RECURRENCE_OCCURRENCES = 366;

    private const DAY_TYPES = [
        'day', 'weekday', 'weekend_day',
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];

    private const POSITIONS = ['every', '2nd', '3rd', '4th', 'last'];

    /**
     * List appointments, optionally scoped to a provider,
     * a single patient, and/or a date range.
     */
    public function list(
        ?int $providerId = null,
        ?int $patientId = null,
        ?string $from = null,
        ?string $to = null
    ): array {
        $sql = "SELECT a.id, a.patient_id, a.provider_id, a.is_provider_block, a.title,
                       a.visit_category_id, a.provider_category_id, a.facility_id, a.billing_facility_id, a.room_id,
                       a.appointment_date, a.appointment_time, a.is_all_day,
                       a.recurrence_group_id, a.recurrence_mode, a.recurrence_position,
                       a.recurrence_day_type, a.recurrence_days_of_week, a.recurrence_until_date,
                       a.reason, a.notes, a.status,
                       p.patient_no, p.first_name AS patient_first_name, p.middle_name AS patient_middle_name,
                       p.last_name AS patient_last_name, p.suffix AS patient_suffix,
                       e.first_name AS provider_first_name, e.last_name AS provider_last_name,
                       vc.name AS visit_category_name,
                       pcat.name AS provider_category_name,
                       f.name AS facility_name,
                       bf.name AS billing_facility_name,
                       r.name AS room_name
                FROM appointments a
                LEFT JOIN patients p ON p.id = a.patient_id
                JOIN providers pr ON pr.id = a.provider_id
                JOIN employees e ON e.id = pr.employee_id
                LEFT JOIN visit_categories vc ON vc.id = a.visit_category_id
                LEFT JOIN provider_categories pcat ON pcat.id = a.provider_category_id
                LEFT JOIN facilities f ON f.id = a.facility_id
                LEFT JOIN facilities bf ON bf.id = a.billing_facility_id
                LEFT JOIN rooms r ON r.id = a.room_id
                WHERE a.deleted_at IS NULL";

        $params = [];

        if ($providerId !== null) {
            $sql .= " AND a.provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        if ($patientId !== null) {
            $sql .= " AND a.patient_id = :patient_id";
            $params['patient_id'] = $patientId;
        }

        if ($from !== null) {
            $sql .= " AND a.appointment_date >= :from";
            $params['from'] = $from;
        }

        if ($to !== null) {
            $sql .= " AND a.appointment_date <= :to";
            $params['to'] = $to;
        }

        $sql .= " ORDER BY a.appointment_date DESC, a.appointment_time DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new appointment — a single row, or (when a recurrence
     * mode is set) a whole materialized series sharing one recurrence_group_id.
     */
    public function store(array $data, int $createdBy): array
    {
        $errors = $this->validate($data, null, true);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $recurring = ($data['recurrence_mode'] ?? 'none') !== 'none';

        if ($recurring) {
            $recurrenceErrors = $this->validateRecurrence($data);

            if (!empty($recurrenceErrors)) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $recurrenceErrors
                ];
            }

            $db = Database::connection();
            $db->beginTransaction();

            try {
                $result = $this->insertRecurringOccurrences($data, $createdBy);

                if (!$result['success']) {
                    $db->rollBack();
                    return $result;
                }

                $db->commit();
                return $result;
            } catch (Throwable $e) {
                $db->rollBack();

                return [
                    'success' => false,
                    'message' => 'Failed to schedule recurring appointments.'
                ];
            }
        }

        try {
            $fields = $this->buildAppointmentFields($data);
            $fields['created_at'] = date('Y-m-d H:i:s');
            $fields['created_by'] = $createdBy;

            $id = (new Appointment())->create($fields);

            if (!$id) {
                throw new \RuntimeException('Failed to create appointment.');
            }

            return [
                'success' => true,
                'message' => 'Appointment scheduled successfully.',
                'data' => ['id' => $id]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to schedule appointment.'
            ];
        }
    }

    /**
     * Update an existing appointment, honoring the chosen edit scope for
     * appointments that belong to a recurring series:
     *  - 'this' (default, or when the appointment isn't part of a series):
     *    only this single row is touched, exactly like a plain appointment.
     *  - 'future': this occurrence and every later occurrence in the same
     *    series are replaced with a freshly materialized series (starting
     *    at this occurrence's date, using the — possibly edited —
     *    recurrence rule), leaving past occurrences untouched under their
     *    original series identity.
     *  - 'all': every occurrence in the series (past and future) is
     *    replaced with a freshly materialized series anchored at the
     *    series' original start date.
     * 'future'/'all' always regenerate — if the edited fields changed the
     * date, time, or recurrence rule, every replaced occurrence reflects
     * the new pattern, not just the row that was directly edited.
     */
    public function updateWithScope(
        int $id,
        array $data,
        int $updatedBy,
        ?int $restrictProviderId = null,
        string $scope = 'this'
    ): array {
        $appointment = (new Appointment())
            ->where('id', $id)
            ->first();

        if (!$appointment || $appointment['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        if ($restrictProviderId !== null && (int) $appointment['provider_id'] !== $restrictProviderId) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        $groupId = !empty($appointment['recurrence_group_id']) ? (int) $appointment['recurrence_group_id'] : null;

        if ($scope === 'this' || !$groupId) {
            return $this->update($id, $data, $updatedBy, $restrictProviderId);
        }

        $db = Database::connection();

        if ($scope === 'all') {
            $anchorStmt = $db->prepare(
                "SELECT MIN(appointment_date) AS anchor_date FROM appointments
                 WHERE recurrence_group_id = :group_id AND deleted_at IS NULL"
            );
            $anchorStmt->execute(['group_id' => $groupId]);
            $anchorDate = $anchorStmt->fetch(PDO::FETCH_ASSOC)['anchor_date'] ?? $appointment['appointment_date'];

            $idsStmt = $db->prepare(
                "SELECT id FROM appointments WHERE recurrence_group_id = :group_id AND deleted_at IS NULL"
            );
            $idsStmt->execute(['group_id' => $groupId]);
        } else {
            // 'future'
            $anchorDate = $appointment['appointment_date'];

            $idsStmt = $db->prepare(
                "SELECT id FROM appointments
                 WHERE recurrence_group_id = :group_id AND appointment_date >= :anchor_date AND deleted_at IS NULL"
            );
            $idsStmt->execute(['group_id' => $groupId, 'anchor_date' => $anchorDate]);
        }

        $affectedIds = array_column($idsStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

        $regenData = $data;
        $regenData['appointment_date'] = $anchorDate;
        $recurring = ($regenData['recurrence_mode'] ?? 'none') !== 'none';

        $db->beginTransaction();

        try {
            // Soft-delete the rows being replaced FIRST — before any
            // validation — so the double-booking check (which excludes
            // nothing, since we're regenerating from scratch) doesn't
            // false-positive against the very rows it's about to replace.
            if (!empty($affectedIds)) {
                $placeholders = implode(',', array_fill(0, count($affectedIds), '?'));
                $stmt = $db->prepare(
                    "UPDATE appointments SET deleted_at = ?, deleted_by = ? WHERE id IN ({$placeholders})"
                );
                $stmt->execute(array_merge([date('Y-m-d H:i:s'), $updatedBy], $affectedIds));
            }

            $errors = $this->validate($regenData, null, false);

            if (!empty($errors)) {
                $db->rollBack();

                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $errors
                ];
            }

            if ($recurring) {
                $recurrenceErrors = $this->validateRecurrence($regenData);

                if (!empty($recurrenceErrors)) {
                    $db->rollBack();

                    return [
                        'success' => false,
                        'message' => 'Validation failed.',
                        'errors' => $recurrenceErrors
                    ];
                }

                $result = $this->insertRecurringOccurrences($regenData, $updatedBy);
            } else {
                $fields = $this->buildAppointmentFields($regenData);
                $fields['created_at'] = date('Y-m-d H:i:s');
                $fields['created_by'] = $updatedBy;

                $newId = (new Appointment())->create($fields);

                $result = $newId
                    ? ['success' => true, 'message' => 'Appointment updated successfully.', 'data' => ['id' => $newId]]
                    : ['success' => false, 'message' => 'Failed to update appointment.'];
            }

            if (!$result['success']) {
                $db->rollBack();
                return $result;
            }

            $db->commit();

            return [
                'success' => true,
                'message' => 'Recurring appointments updated successfully.'
            ];
        } catch (Throwable $e) {
            $db->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to update recurring appointments.'
            ];
        }
    }

    /**
     * Update a single appointment row only — never regenerates a series.
     * When $restrictProviderId is set (a doctor), the appointment must
     * already belong to that provider.
     */
    public function update(int $id, array $data, int $updatedBy, ?int $restrictProviderId = null): array
    {
        $appointment = (new Appointment())
            ->where('id', $id)
            ->first();

        if (!$appointment || $appointment['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        if ($restrictProviderId !== null && (int) $appointment['provider_id'] !== $restrictProviderId) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $fields = $this->buildAppointmentFields($data, [], $appointment);
        $fields['updated_at'] = date('Y-m-d H:i:s');
        $fields['updated_by'] = $updatedBy;

        $updated = (new Appointment())->update($fields, $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update appointment.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Appointment updated successfully.'
        ];
    }

    /**
     * Soft-delete an appointment. When $restrictProviderId is set (a doctor),
     * the appointment must already belong to that provider.
     */
    public function remove(int $id, int $deletedBy, ?int $restrictProviderId = null): array
    {
        $appointment = (new Appointment())
            ->where('id', $id)
            ->first();

        if (!$appointment || $appointment['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        if ($restrictProviderId !== null && (int) $appointment['provider_id'] !== $restrictProviderId) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE appointments
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id' => $id
        ]);

        return [
            'success' => true,
            'message' => 'Appointment deleted successfully.'
        ];
    }

    /**
     * Search a provider's fixed 8:00 AM-5:00 PM window (30-minute slots)
     * across a range of days for slots that aren't already booked. There
     * is no real provider working-hours/schedule concept in this system —
     * this business-hours window is a hardcoded assumption applied
     * uniformly to every provider.
     */
    public function findAvailableSlots(int $providerId, string $startDate, int $days): array
    {
        $slotTimes = [];

        for ($minutes = 8 * 60; $minutes < 17 * 60; $minutes += 30) {
            $slotTimes[] = sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
        }

        $start = new \DateTimeImmutable($startDate);
        $results = [];

        for ($i = 0; $i < $days; $i++) {
            $date = $start->add(new \DateInterval("P{$i}D"))->format('Y-m-d');

            $stmt = Database::connection()->prepare(
                "SELECT appointment_time, is_all_day FROM appointments
                 WHERE provider_id = :provider_id
                   AND appointment_date = :appointment_date
                   AND status != 'cancelled' AND deleted_at IS NULL"
            );

            $stmt->execute([
                'provider_id' => $providerId,
                'appointment_date' => $date
            ]);

            $dayAppointments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $blockedWholeDay = false;
            $bookedTimes = [];

            foreach ($dayAppointments as $appointment) {
                if ((int) $appointment['is_all_day'] === 1) {
                    $blockedWholeDay = true;
                    break;
                }

                $bookedTimes[] = substr($appointment['appointment_time'], 0, 5);
            }

            $slots = array_map(
                fn($time) => [
                    'time' => $time,
                    'available' => !$blockedWholeDay && !in_array($time, $bookedTimes, true)
                ],
                $slotTimes
            );

            $results[] = ['date' => $date, 'slots' => $slots];
        }

        return $results;
    }

    /**
     * Build the full column set for an insert/update from raw request
     * data. $overrides wins last (used to stamp each recurring occurrence
     * with its own date). $existing is the current row (update only),
     * used to fall back status to its current value when not provided.
     */
    private function buildAppointmentFields(array $data, array $overrides = [], ?array $existing = null): array
    {
        $isBlock = !empty($data['is_provider_block']);
        $isAllDay = !empty($data['is_all_day']);

        $fields = [
            'patient_id' => $isBlock ? null : (int) $data['patient_id'],
            'provider_id' => (int) $data['provider_id'],
            'is_provider_block' => $isBlock ? 1 : 0,
            'title' => $data['title'] ?? null,
            'visit_category_id' => !empty($data['visit_category_id']) ? (int) $data['visit_category_id'] : null,
            'provider_category_id' => !empty($data['provider_category_id']) ? (int) $data['provider_category_id'] : null,
            'facility_id' => !empty($data['facility_id']) ? (int) $data['facility_id'] : null,
            'billing_facility_id' => !empty($data['billing_facility_id']) ? (int) $data['billing_facility_id'] : null,
            'room_id' => !empty($data['room_id']) ? (int) $data['room_id'] : null,
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $isAllDay ? '00:00:00' : $data['appointment_time'],
            'is_all_day' => $isAllDay ? 1 : 0,
            'recurrence_mode' => $data['recurrence_mode'] ?? 'none',
            'recurrence_position' => $data['recurrence_position'] ?? null,
            'recurrence_day_type' => $data['recurrence_day_type'] ?? null,
            'recurrence_days_of_week' => $data['recurrence_days_of_week'] ?? null,
            'recurrence_until_date' => $data['recurrence_until_date'] ?? null,
            'reason' => $data['reason'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => $data['status'] ?? ($existing['status'] ?? 'scheduled')
        ];

        return array_merge($fields, $overrides);
    }

    /**
     * Validate appointment input, including a double-booking check.
     * $enforceFutureDate blocks past dates on creation only — editing an
     * already-past appointment (e.g. to mark it completed/no-show) is still allowed.
     * This validates a single row's fields only — recurrence-rule-specific
     * validation (position/day-type/days-of-week/until-date/occurrence cap)
     * lives in validateRecurrence(), called separately.
     */
    private function validate(array $data, ?int $excludeId = null, bool $enforceFutureDate = false): array
    {
        $errors = [];
        $isBlock = !empty($data['is_provider_block']);
        $isAllDay = !empty($data['is_all_day']);

        if (!$isBlock && empty($data['patient_id'])) {
            $errors['patient_id'] = 'Patient is required.';
        }

        if (empty($data['provider_id'])) {
            $errors['provider_id'] = 'Provider is required.';
        }

        if (empty($data['appointment_date'])) {
            $errors['appointment_date'] = 'Date is required.';
        }

        if (!$isAllDay && empty($data['appointment_time'])) {
            $errors['appointment_time'] = 'Time is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        if ($enforceFutureDate && $data['appointment_date'] < date('Y-m-d')) {
            $errors['appointment_date'] = 'Appointment date cannot be in the past.';
            return $errors;
        }

        if (!$isBlock) {
            $patient = (new Patient())
                ->where('id', (int) $data['patient_id'])
                ->first();

            if (!$patient || $patient['deleted_at'] !== null) {
                $errors['patient_id'] = 'Selected patient does not exist.';
            }
        }

        $provider = (new Provider())
            ->where('id', (int) $data['provider_id'])
            ->first();

        if (!$provider || $provider['deleted_at'] !== null) {
            $errors['provider_id'] = 'Selected provider does not exist.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $time = $isAllDay ? '00:00:00' : $data['appointment_time'];

        if ($this->checkDoubleBooking((int) $data['provider_id'], $data['appointment_date'], $time, $excludeId)) {
            $errors['appointment_time'] = 'This time slot is already booked for the selected provider.';
        }

        return $errors;
    }

    /**
     * Validate a recurrence rule (only called when a recurrence mode is
     * set) — position+day-type (interval mode) or days-of-week, the
     * shared until-date, and the materialized-occurrence-count cap.
     */
    private function validateRecurrence(array $data): array
    {
        $errors = [];
        $mode = $data['recurrence_mode'];

        if (empty($data['recurrence_until_date']) || $data['recurrence_until_date'] < $data['appointment_date']) {
            $errors['recurrence_until_date'] = 'Until date is required and must be on or after the start date.';
            return $errors;
        }

        if ($mode === 'interval') {
            if (empty($data['recurrence_position']) || !in_array($data['recurrence_position'], self::POSITIONS, true)) {
                $errors['recurrence_position'] = 'Select a valid position.';
            }

            if (empty($data['recurrence_day_type']) || !in_array($data['recurrence_day_type'], self::DAY_TYPES, true)) {
                $errors['recurrence_day_type'] = 'Select a valid day type.';
            }
        } elseif ($mode === 'days_of_week') {
            if (empty($data['recurrence_days_of_week'])) {
                $errors['recurrence_days_of_week'] = 'Select at least one day of the week.';
            }
        }

        if (!empty($errors)) {
            return $errors;
        }

        if (count($this->generateOccurrenceDates($data)) > self::MAX_RECURRENCE_OCCURRENCES) {
            $errors['recurrence_until_date'] = 'This recurrence would generate too many appointments (max '
                . self::MAX_RECURRENCE_OCCURRENCES . ') — please shorten the date range.';
        }

        return $errors;
    }

    /**
     * Insert one row per occurrence date (all sharing one
     * recurrence_group_id). Does NOT manage its own transaction — the
     * caller (store()/updateWithScope()) is expected to already be inside
     * one, since both need to combine this with other writes atomically.
     */
    private function insertRecurringOccurrences(array $data, int $userId): array
    {
        $occurrenceDates = $this->generateOccurrenceDates($data);
        $time = !empty($data['is_all_day']) ? '00:00:00' : $data['appointment_time'];
        $providerId = (int) $data['provider_id'];

        foreach ($occurrenceDates as $date) {
            if ($this->checkDoubleBooking($providerId, $date, $time, null)) {
                return [
                    'success' => false,
                    'message' => "Cannot schedule recurring appointment — {$date} conflicts with an existing booking for this provider.",
                    'errors' => ['recurrence_until_date' => "Conflict on {$date}."]
                ];
            }
        }

        $insertedIds = [];

        foreach ($occurrenceDates as $date) {
            $fields = $this->buildAppointmentFields($data, ['appointment_date' => $date]);
            $fields['created_at'] = date('Y-m-d H:i:s');
            $fields['created_by'] = $userId;

            $id = (new Appointment())->create($fields);

            if (!$id) {
                throw new \RuntimeException('Failed to create occurrence.');
            }

            $insertedIds[] = $id;
        }

        $groupId = $insertedIds[0];

        foreach ($insertedIds as $id) {
            (new Appointment())->update(['recurrence_group_id' => $groupId], $id);
        }

        return [
            'success' => true,
            'message' => count($insertedIds) . ' recurring appointments scheduled successfully.',
            'data' => [
                'id' => $insertedIds[0],
                'recurrence_group_id' => $groupId,
                'count' => count($insertedIds)
            ]
        ];
    }

    /**
     * Whether the given provider already has a non-cancelled, non-deleted
     * appointment at the exact same date/time (optionally excluding one id).
     */
    private function checkDoubleBooking(int $providerId, string $date, string $time, ?int $excludeId): bool
    {
        $sql = "SELECT id FROM appointments
                WHERE provider_id = :provider_id
                  AND appointment_date = :appointment_date AND appointment_time = :appointment_time
                  AND status != 'cancelled' AND deleted_at IS NULL";

        $params = [
            'provider_id' => $providerId,
            'appointment_date' => $date,
            'appointment_time' => $time
        ];

        if ($excludeId !== null) {
            $sql .= " AND id != :exclude_id";
            $params['exclude_id'] = $excludeId;
        }

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Expand a recurrence rule into the list of occurrence dates it
     * covers, from appointment_date through recurrence_until_date
     * inclusive.
     *
     * 'interval' mode is a standard monthly-recurrence pattern: "the
     * [position] [day type] of every month" (e.g. "the 2nd Monday", "the
     * last Friday", "the 2nd day" = day-of-month 2). When position is
     * 'every', every matching date in the month is used instead of a
     * single one — so "Every" + "Monday" behaves like a weekly repeat,
     * "Every" + "Day" like a daily repeat.
     *
     * 'days_of_week' mode is unrelated — a plain weekly repeat on
     * whichever weekdays were checked, bounded by the same until-date.
     */
    private function generateOccurrenceDates(array $data): array
    {
        $start = new \DateTimeImmutable($data['appointment_date']);
        $until = new \DateTimeImmutable($data['recurrence_until_date']);
        $dates = [];

        if ($data['recurrence_mode'] === 'interval') {
            $position = $data['recurrence_position'];
            $dayType = $data['recurrence_day_type'];

            $cursor = $start->modify('first day of this month');
            $lastMonth = $until->modify('first day of this month');

            while ($cursor <= $lastMonth) {
                foreach ($this->matchingDatesInMonth((int) $cursor->format('Y'), (int) $cursor->format('n'), $position, $dayType) as $date) {
                    if ($date >= $start->format('Y-m-d') && $date <= $until->format('Y-m-d')) {
                        $dates[] = $date;
                    }
                }

                $cursor = $cursor->add(new \DateInterval('P1M'));
            }
        } else {
            $wanted = array_filter(array_map('trim', explode(',', (string) $data['recurrence_days_of_week'])));
            $oneDay = new \DateInterval('P1D');
            $cursor = $start;

            while ($cursor <= $until) {
                if (in_array($cursor->format('D'), $wanted, true)) {
                    $dates[] = $cursor->format('Y-m-d');
                }

                $cursor = $cursor->add($oneDay);
            }
        }

        sort($dates);

        return $dates;
    }

    /**
     * All dates within the given month matching $dayType, narrowed down
     * to a single date by $position ('every' returns all of them,
     * 'last' returns the last, '2nd'/'3rd'/'4th' return that occurrence
     * if the month has one).
     */
    private function matchingDatesInMonth(int $year, int $month, string $position, string $dayType): array
    {
        $daysInMonth = (int) (new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month)))->format('t');
        $candidates = [];

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = new \DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day));

            if ($this->matchesDayType($date, $dayType)) {
                $candidates[] = $date->format('Y-m-d');
            }
        }

        if ($position === 'every') {
            return $candidates;
        }

        if ($position === 'last') {
            return $candidates ? [end($candidates)] : [];
        }

        $index = ['2nd' => 1, '3rd' => 2, '4th' => 3][$position] ?? null;

        return $index !== null && isset($candidates[$index]) ? [$candidates[$index]] : [];
    }

    private function matchesDayType(\DateTimeImmutable $date, string $dayType): bool
    {
        $dayOfWeek = (int) $date->format('N'); // 1 = Monday ... 7 = Sunday

        return match ($dayType) {
            'day' => true,
            'weekday' => $dayOfWeek <= 5,
            'weekend_day' => $dayOfWeek >= 6,
            'sunday' => $dayOfWeek === 7,
            'monday' => $dayOfWeek === 1,
            'tuesday' => $dayOfWeek === 2,
            'wednesday' => $dayOfWeek === 3,
            'thursday' => $dayOfWeek === 4,
            'friday' => $dayOfWeek === 5,
            'saturday' => $dayOfWeek === 6,
            default => false,
        };
    }
}
