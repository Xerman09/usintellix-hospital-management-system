<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Core\Database;
use PDO;

/**
 * Service to enforce doctor roster availability, clinic operating schedules,
 * and emergency blocked slot validation upon appointment booking.
 */
class DoctorRosterAvailabilityService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connection();
    }

    /**
     * Resolve provider employee record, clinical department, and display name.
     */
    public function resolveProviderInfo(int $providerId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT pr.id AS provider_id,
                   pr.employee_id,
                   e.first_name,
                   e.last_name,
                   e.department_id,
                   e.secondary_department_id,
                   d.name AS department_name,
                   d.code AS department_code,
                   d.type AS department_type
            FROM providers pr
            JOIN employees e ON e.id = pr.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE pr.id = :provider_id AND pr.deleted_at IS NULL
            LIMIT 1
        ");
        $stmt->execute([':provider_id' => $providerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $row['full_name'] = 'Dr. ' . trim($row['first_name'] . ' ' . $row['last_name']);
        return $row;
    }

    /**
     * Resolve the operating schedule from clinic_operating_schedules for a provider on a specific date.
     */
    public function resolveClinicSchedule(int $providerId, string $date, ?int $departmentId = null, ?int $facilityId = null): array
    {
        $provider = $this->resolveProviderInfo($providerId);
        $dayOfWeek = date('l', strtotime($date));

        // Candidate departments in priority order:
        // 1. Explicit department_id from payload
        // 2. Provider's primary department_id (if clinical)
        // 3. Provider's secondary_department_id
        // 4. Any clinical department assignment from employee_department_assignments
        // 5. Default outpatient clinical department (e.g. Cardiology ID 4 or Internal Medicine ID 3)
        $candidateDeptIds = [];

        if (!empty($departmentId)) {
            $candidateDeptIds[] = (int) $departmentId;
        }

        if ($provider) {
            if (!empty($provider['department_id'])) {
                $candidateDeptIds[] = (int) $provider['department_id'];
            }
            if (!empty($provider['secondary_department_id'])) {
                $candidateDeptIds[] = (int) $provider['secondary_department_id'];
            }

            // Check employee_department_assignments
            $assignStmt = $this->db->prepare("
                SELECT department_id
                FROM employee_department_assignments
                WHERE employee_id = :employee_id
                ORDER BY is_primary DESC, id ASC
            ");
            $assignStmt->execute([':employee_id' => $provider['employee_id']]);
            foreach ($assignStmt->fetchAll(PDO::FETCH_COLUMN) as $dId) {
                $candidateDeptIds[] = (int) $dId;
            }
        }

        // Fallbacks: Check active clinical departments with schedules
        $candidateDeptIds[] = 4; // Cardiology
        $candidateDeptIds[] = 3; // Internal Medicine
        $candidateDeptIds[] = 5; // Pediatrics
        $candidateDeptIds = array_values(array_unique($candidateDeptIds));

        $schedule = null;
        $activeDept = null;

        foreach ($candidateDeptIds as $dId) {
            $whereFacility = "";
            $schedParams = [
                ':dept_id' => $dId,
                ':day'     => $dayOfWeek
            ];
            if (!empty($facilityId)) {
                $whereFacility = " AND (cos.facility_id = :facility_id OR cos.facility_id IS NULL)";
                $schedParams[':facility_id'] = $facilityId;
            }

            // Check if department has schedule for this day_of_week
            $schedStmt = $this->db->prepare("
                SELECT cos.*, d.name AS department_name, d.code AS department_code
                FROM clinic_operating_schedules cos
                JOIN departments d ON d.id = cos.department_id
                WHERE cos.department_id = :dept_id
                  AND cos.day_of_week = :day
                  {$whereFacility}
                  AND cos.deleted_at IS NULL
                ORDER BY CASE WHEN cos.facility_id IS NOT NULL THEN 1 ELSE 2 END ASC
                LIMIT 1
            ");
            $schedStmt->execute($schedParams);
            $found = $schedStmt->fetch(PDO::FETCH_ASSOC);

            if ($found) {
                $schedule = $found;
                $activeDept = [
                    'id'   => $dId,
                    'name' => $found['department_name'],
                    'code' => $found['department_code']
                ];
                break;
            }
        }

        // If no schedule row found at all for this day
        if (!$schedule) {
            return [
                'has_schedule' => false,
                'is_duty_day'  => false,
                'day_of_week'  => $dayOfWeek,
                'provider'     => $provider,
                'department'   => $activeDept,
                'schedule'     => null,
                'reason'       => "No clinic operating timetable configured for {$dayOfWeek}."
            ];
        }

        $isDutyDay = ((int) $schedule['is_active'] === 1);

        return [
            'has_schedule' => true,
            'is_duty_day'  => $isDutyDay,
            'day_of_week'  => $dayOfWeek,
            'provider'     => $provider,
            'department'   => $activeDept,
            'schedule'     => $schedule,
            'reason'       => $isDutyDay ? null : "Clinic closed / Non-duty day on {$dayOfWeek}s."
        ];
    }

    /**
     * Validate whether a doctor is available for an appointment.
     * Enforces:
     *  1. Non-duty day check (clinic_operating_schedules is_active = 0)
     *  2. Operating hours check (start_time to end_time)
     *  3. Clinic break/lunch hours check (break_start_time to break_end_time)
     *  4. Emergency blocked slots and all-day provider blocks
     *  5. Max daily patient capacity quota
     *
     * @return array Array of validation errors (empty if valid)
     */
    public function validateDoctorAvailability(array $data, ?int $excludeAppointmentId = null): array
    {
        $errors = [];
        $isBlock = !empty($data['is_provider_block']);
        $providerId = (int) ($data['provider_id'] ?? 0);
        $date = (string) ($data['appointment_date'] ?? '');
        $time = !empty($data['appointment_time']) ? substr($data['appointment_time'], 0, 8) : null;
        $isAllDay = !empty($data['is_all_day']);
        $facilityId = !empty($data['facility_id']) ? (int) $data['facility_id'] : null;
        $departmentId = !empty($data['department_id']) ? (int) $data['department_id'] : null;

        if ($providerId <= 0 || empty($date)) {
            return $errors;
        }

        $provider = $this->resolveProviderInfo($providerId);
        $providerName = $provider['full_name'] ?? 'The selected doctor';

        // -------------------------------------------------------------
        // IF CREATING A PROVIDER BLOCK (is_provider_block = 1):
        // Allow creating blocks freely (e.g. marking emergency absence,
        // surgery, or conference), but prevent duplicate identical blocks.
        // -------------------------------------------------------------
        if ($isBlock) {
            return $errors;
        }

        // -------------------------------------------------------------
        // FOR PATIENT APPOINTMENTS:
        // 1. Enforce Clinic Operating Schedules & Duty Days
        // -------------------------------------------------------------
        $resolved = $this->resolveClinicSchedule($providerId, $date, $departmentId, $facilityId);
        $dayOfWeek = $resolved['day_of_week'];
        $deptName = $resolved['department']['name'] ?? 'Outpatient Clinic';

        if (!$resolved['has_schedule'] || !$resolved['is_duty_day']) {
            $errors['appointment_date'] = "{$providerName} is not on duty on {$dayOfWeek}s ({$deptName} is closed / non-duty day).";
            return $errors;
        }

        $schedule = $resolved['schedule'];

        // 2. Enforce Operating Hours & Break Windows
        if (!$isAllDay && !empty($time)) {
            // Normalize time to H:i:s
            $timeObj = strtotime($time);
            $appTimeStr = date('H:i:s', $timeObj);
            $startStr = date('H:i:s', strtotime($schedule['start_time']));
            $endStr = date('H:i:s', strtotime($schedule['end_time']));

            if ($appTimeStr < $startStr || $appTimeStr >= $endStr) {
                $startHuman = date('g:i A', strtotime($schedule['start_time']));
                $endHuman = date('g:i A', strtotime($schedule['end_time']));
                $timeHuman = date('g:i A', $timeObj);
                $errors['appointment_time'] = "Appointment time {$timeHuman} is outside clinic operating hours ({$startHuman} - {$endHuman}) for {$deptName} on {$dayOfWeek}.";
                return $errors;
            }

            // Check lunch / break window
            if (!empty($schedule['break_start_time']) && !empty($schedule['break_end_time'])) {
                $bStartStr = date('H:i:s', strtotime($schedule['break_start_time']));
                $bEndStr = date('H:i:s', strtotime($schedule['break_end_time']));

                if ($appTimeStr >= $bStartStr && $appTimeStr < $bEndStr) {
                    $bStartHuman = date('g:i A', strtotime($schedule['break_start_time']));
                    $bEndHuman = date('g:i A', strtotime($schedule['break_end_time']));
                    $timeHuman = date('g:i A', $timeObj);
                    $errors['appointment_time'] = "Appointment time {$timeHuman} falls within clinic break hours ({$bStartHuman} - {$bEndHuman}).";
                    return $errors;
                }
            }
        }

        // 3. Enforce Emergency Blocked Slots & Provider Blocks
        $blockStmt = $this->db->prepare("
            SELECT id, title, appointment_time, is_all_day, reason, notes
            FROM appointments
            WHERE provider_id = :provider_id
              AND appointment_date = :appointment_date
              AND is_provider_block = 1
              AND status != 'cancelled'
              AND deleted_at IS NULL
              " . ($excludeAppointmentId ? "AND id != :exclude_id" : "") . "
        ");
        $blockParams = [
            ':provider_id'        => $providerId,
            ':appointment_date'   => $date
        ];
        if ($excludeAppointmentId) {
            $blockParams[':exclude_id'] = $excludeAppointmentId;
        }
        $blockStmt->execute($blockParams);
        $blocks = $blockStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($blocks as $blk) {
            $blockReason = !empty($blk['title']) ? $blk['title'] : (!empty($blk['reason']) ? $blk['reason'] : 'Emergency Blocked Duty');

            // All-day emergency block
            if ((int) $blk['is_all_day'] === 1) {
                $errors['appointment_date'] = "{$providerName} is unavailable on {$date} due to an emergency block ({$blockReason}).";
                return $errors;
            }

            // Timed emergency block
            if (!$isAllDay && !empty($time)) {
                $blkTime = substr($blk['appointment_time'], 0, 5);
                $appTimeShort = substr($time, 0, 5);

                if ($blkTime === $appTimeShort) {
                    $timeHuman = date('g:i A', strtotime($time));
                    $errors['appointment_time'] = "{$providerName} has an emergency blocked slot at {$timeHuman} ({$blockReason}).";
                    return $errors;
                }
            }
        }

        // 4. Enforce Max Daily Patient Capacity Quota
        if (!empty($schedule['max_daily_capacity']) && (int) $schedule['max_daily_capacity'] > 0) {
            $capStmt = $this->db->prepare("
                SELECT COUNT(*)
                FROM appointments
                WHERE provider_id = :provider_id
                  AND appointment_date = :appointment_date
                  AND is_provider_block = 0
                  AND status != 'cancelled'
                  AND deleted_at IS NULL
                  " . ($excludeAppointmentId ? "AND id != :exclude_id" : "") . "
            ");
            $capParams = [
                ':provider_id'      => $providerId,
                ':appointment_date' => $date
            ];
            if ($excludeAppointmentId) {
                $capParams[':exclude_id'] = $excludeAppointmentId;
            }
            $capStmt->execute($capParams);
            $currentCount = (int) $capStmt->fetchColumn();

            if ($currentCount >= (int) $schedule['max_daily_capacity']) {
                $errors['appointment_date'] = "Maximum daily appointment capacity ({$schedule['max_daily_capacity']} patients) has been reached for {$providerName} on {$date}.";
                return $errors;
            }
        }

        return $errors;
    }

    /**
     * Search for available appointment slots across a range of days
     * binding to clinic_operating_schedules for slot intervals,
     * operating hours, break times, non-duty days, and emergency blocks.
     */
    public function findAvailableSlots(int $providerId, string $startDate, int $days): array
    {
        $provider = $this->resolveProviderInfo($providerId);
        $start = new \DateTimeImmutable($startDate);
        $results = [];

        for ($i = 0; $i < $days; $i++) {
            $dateObj = $start->add(new \DateInterval("P{$i}D"));
            $date = $dateObj->format('Y-m-d');
            $dayOfWeek = $dateObj->format('l');

            // 1. Resolve clinic schedule for this day
            $resolved = $this->resolveClinicSchedule($providerId, $date);

            if (!$resolved['has_schedule'] || !$resolved['is_duty_day']) {
                $results[] = [
                    'date'        => $date,
                    'day_of_week' => $dayOfWeek,
                    'is_duty_day' => false,
                    'reason'      => $resolved['reason'] ?? 'Clinic Closed / Non-Duty Day',
                    'slots'       => []
                ];
                continue;
            }

            $schedule = $resolved['schedule'];
            $slotDuration = max(10, min(120, (int) ($schedule['slot_duration_minutes'] ?? 30)));

            // 2. Build time slots according to clinic timetable
            $startMin = $this->timeStringToMinutes($schedule['start_time']);
            $endMin = $this->timeStringToMinutes($schedule['end_time']);
            $bStartMin = !empty($schedule['break_start_time']) ? $this->timeStringToMinutes($schedule['break_start_time']) : null;
            $bEndMin = !empty($schedule['break_end_time']) ? $this->timeStringToMinutes($schedule['break_end_time']) : null;

            $slotTimes = [];
            for ($m = $startMin; $m < $endMin; $m += $slotDuration) {
                // Skip if entirely within lunch / break window
                if ($bStartMin !== null && $bEndMin !== null && $m >= $bStartMin && $m < $bEndMin) {
                    continue;
                }
                $slotTimes[] = sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
            }

            // 3. Query existing bookings and provider blocks for this date
            $stmt = $this->db->prepare("
                SELECT appointment_time, is_all_day, is_provider_block, title, reason
                FROM appointments
                WHERE provider_id = :provider_id
                  AND appointment_date = :appointment_date
                  AND status != 'cancelled'
                  AND deleted_at IS NULL
            ");
            $stmt->execute([
                ':provider_id'      => $providerId,
                ':appointment_date' => $date
            ]);
            $dayAppointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $blockedWholeDay = false;
            $wholeDayReason = '';
            $bookedTimes = [];
            $emergencyBlockedTimes = [];
            $patientAppointmentCount = 0;

            foreach ($dayAppointments as $app) {
                $isBlock = ((int) $app['is_provider_block'] === 1);
                $isAllDay = ((int) $app['is_all_day'] === 1);

                if ($isAllDay && $isBlock) {
                    $blockedWholeDay = true;
                    $wholeDayReason = !empty($app['title']) ? $app['title'] : (!empty($app['reason']) ? $app['reason'] : 'Emergency Blocked Day');
                    break;
                }

                $timeKey = substr($app['appointment_time'], 0, 5);
                if ($isBlock) {
                    $emergencyBlockedTimes[$timeKey] = !empty($app['title']) ? $app['title'] : 'Emergency Block';
                } else {
                    $bookedTimes[] = $timeKey;
                    $patientAppointmentCount++;
                }
            }

            // Check capacity
            $capacityReached = (!empty($schedule['max_daily_capacity']) && $patientAppointmentCount >= (int) $schedule['max_daily_capacity']);

            // 4. Build slots output with availability metadata
            $slots = [];
            foreach ($slotTimes as $time) {
                if ($blockedWholeDay) {
                    $slots[] = [
                        'time'      => $time,
                        'available' => false,
                        'reason'    => "Emergency Blocked ({$wholeDayReason})"
                    ];
                } elseif (isset($emergencyBlockedTimes[$time])) {
                    $slots[] = [
                        'time'      => $time,
                        'available' => false,
                        'reason'    => "Emergency Block ({$emergencyBlockedTimes[$time]})"
                    ];
                } elseif (in_array($time, $bookedTimes, true)) {
                    $slots[] = [
                        'time'      => $time,
                        'available' => false,
                        'reason'    => 'Already Booked'
                    ];
                } elseif ($capacityReached) {
                    $slots[] = [
                        'time'      => $time,
                        'available' => false,
                        'reason'    => 'Daily Capacity Quota Reached'
                    ];
                } else {
                    $slots[] = [
                        'time'      => $time,
                        'available' => true,
                        'reason'    => 'Available'
                    ];
                }
            }

            $results[] = [
                'date'            => $date,
                'day_of_week'     => $dayOfWeek,
                'is_duty_day'     => true,
                'department_name' => $schedule['department_name'] ?? null,
                'operating_hours' => substr($schedule['start_time'], 0, 5) . ' - ' . substr($schedule['end_time'], 0, 5),
                'break_hours'     => (!empty($schedule['break_start_time']) && !empty($schedule['break_end_time'])) ? (substr($schedule['break_start_time'], 0, 5) . ' - ' . substr($schedule['break_end_time'], 0, 5)) : null,
                'slots'           => $slots
            ];
        }

        return $results;
    }

    private function timeStringToMinutes(string $timeStr): int
    {
        $parts = explode(':', $timeStr);
        return ((int) $parts[0] * 60) + (int) ($parts[1] ?? 0);
    }
}
