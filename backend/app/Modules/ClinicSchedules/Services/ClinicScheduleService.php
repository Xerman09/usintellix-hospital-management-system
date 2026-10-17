<?php

namespace App\Modules\ClinicSchedules\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\ClinicSchedules\Models\ClinicOperatingSchedule;
use PDO;
use Throwable;

class ClinicScheduleService
{
    private const DAYS_OF_WEEK = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
    ];

    /**
     * Get overview list of all departments with their clinic schedule status.
     */
    public function getDepartmentsOverview(?int $facilityId = null): array
    {
        $db = Database::connection();

        $sql = "SELECT d.id, d.name, d.code, d.type, d.status,
                       COUNT(CASE WHEN s.is_active = 1 AND s.deleted_at IS NULL THEN 1 END) AS active_days_count,
                       COALESCE(SUM(CASE WHEN s.is_active = 1 AND s.deleted_at IS NULL THEN s.max_daily_capacity ELSE 0 END), 0) AS weekly_capacity,
                       MIN(CASE WHEN s.is_active = 1 AND s.deleted_at IS NULL THEN s.start_time END) AS earliest_start,
                       MAX(CASE WHEN s.is_active = 1 AND s.deleted_at IS NULL THEN s.end_time END) AS latest_end
                FROM departments d
                LEFT JOIN clinic_operating_schedules s 
                       ON s.department_id = d.id 
                      AND (s.facility_id = :facility_id OR :facility_id_null IS NULL)
                      AND s.deleted_at IS NULL
                WHERE d.deleted_at IS NULL
                GROUP BY d.id, d.name, d.code, d.type, d.status
                ORDER BY 
                    CASE WHEN d.type = 'Clinical' THEN 1 
                         WHEN d.type = 'Emergency' THEN 2 
                         WHEN d.type = 'Diagnostic' THEN 3 
                         ELSE 4 
                    END,
                    d.name ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            'facility_id'      => $facilityId,
            'facility_id_null' => $facilityId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get 7-day weekly schedule for a department.
     */
    public function getDepartmentWeeklySchedule(int $departmentId, ?int $facilityId = null): array
    {
        $db = Database::connection();

        // Fetch department metadata
        $deptStmt = $db->prepare("SELECT id, name, code, type, status, facility_id FROM departments WHERE id = :id AND deleted_at IS NULL");
        $deptStmt->execute(['id' => $departmentId]);
        $dept = $deptStmt->fetch(PDO::FETCH_ASSOC);

        if (!$dept) {
            return [
                'success' => false,
                'message' => 'Department not found.'
            ];
        }

        if ($facilityId === null && !empty($dept['facility_id'])) {
            $facilityId = (int) $dept['facility_id'];
        }

        // Fetch persisted schedules
        $sql = "SELECT * FROM clinic_operating_schedules 
                WHERE department_id = :dept_id 
                  AND (facility_id = :facility_id OR (facility_id IS NULL AND :facility_id_null IS NULL))
                  AND deleted_at IS NULL";
        $schedStmt = $db->prepare($sql);
        $schedStmt->execute([
            'dept_id'          => $departmentId,
            'facility_id'      => $facilityId,
            'facility_id_null' => $facilityId
        ]);
        $persisted = $schedStmt->fetchAll(PDO::FETCH_ASSOC);

        $scheduleMap = [];
        foreach ($persisted as $row) {
            $scheduleMap[$row['day_of_week']] = $row;
        }

        // Build full 7-day array
        $fullWeekly = [];
        $totalWeeklyCapacity = 0;
        $activeDaysCount = 0;

        foreach (self::DAYS_OF_WEEK as $day) {
            if (isset($scheduleMap[$day])) {
                $row = $scheduleMap[$day];
                $row['is_persisted'] = true;
                $row['is_active'] = (int) $row['is_active'];
                $row['allow_walk_ins'] = (int) $row['allow_walk_ins'];
                $row['max_daily_capacity'] = (int) $row['max_daily_capacity'];
                $row['max_walk_ins'] = (int) $row['max_walk_ins'];
                $row['slot_duration_minutes'] = (int) $row['slot_duration_minutes'];
                $row['calculated_slots'] = $this->calculateTotalSlots(
                    $row['start_time'],
                    $row['end_time'],
                    $row['break_start_time'],
                    $row['break_end_time'],
                    $row['slot_duration_minutes']
                );
            } else {
                $isWeekend = in_array($day, ['Saturday', 'Sunday'], true);
                $row = [
                    'id'                    => null,
                    'facility_id'           => $facilityId,
                    'department_id'         => $departmentId,
                    'day_of_week'           => $day,
                    'start_time'            => '08:00:00',
                    'end_time'              => '17:00:00',
                    'slot_duration_minutes' => 30,
                    'break_start_time'      => '12:00:00',
                    'break_end_time'        => '13:00:00',
                    'max_daily_capacity'    => $isWeekend ? 0 : 30,
                    'allow_walk_ins'        => $isWeekend ? 0 : 1,
                    'max_walk_ins'          => $isWeekend ? 0 : 8,
                    'is_active'             => $isWeekend ? 0 : 1,
                    'notes'                 => null,
                    'is_persisted'          => false,
                    'calculated_slots'      => $this->calculateTotalSlots('08:00:00', '17:00:00', '12:00:00', '13:00:00', 30)
                ];
            }

            if ($row['is_active']) {
                $activeDaysCount++;
                $totalWeeklyCapacity += $row['max_daily_capacity'];
            }

            $fullWeekly[] = $row;
        }

        // Available facilities
        $facilities = $db->query("SELECT id, name FROM facilities WHERE is_inactive = 0 AND deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);

        return [
            'success'               => true,
            'department'            => $dept,
            'facility_id'           => $facilityId,
            'weekly_schedules'      => $fullWeekly,
            'total_weekly_capacity' => $totalWeeklyCapacity,
            'active_days_count'     => $activeDaysCount,
            'facilities'            => $facilities
        ];
    }

    /**
     * Bulk save or update 7-day schedule for a department.
     */
    public function bulkSaveWeeklySchedule(int $departmentId, array $schedules, ?int $facilityId, int $userId): array
    {
        $db = Database::connection();

        $deptStmt = $db->prepare("SELECT id, name FROM departments WHERE id = :id AND deleted_at IS NULL");
        $deptStmt->execute(['id' => $departmentId]);
        $dept = $deptStmt->fetch(PDO::FETCH_ASSOC);

        if (!$dept) {
            return ['success' => false, 'message' => 'Department not found.'];
        }

        $now = date('Y-m-d H:i:s');
        $savedCount = 0;

        $db->beginTransaction();
        try {
            $upsertSql = "INSERT INTO clinic_operating_schedules (
                            facility_id,
                            department_id,
                            day_of_week,
                            start_time,
                            end_time,
                            slot_duration_minutes,
                            break_start_time,
                            break_end_time,
                            max_daily_capacity,
                            allow_walk_ins,
                            max_walk_ins,
                            is_active,
                            notes,
                            created_at,
                            created_by,
                            updated_at,
                            updated_by
                          ) VALUES (
                            :facility_id,
                            :department_id,
                            :day_of_week,
                            :start_time,
                            :end_time,
                            :slot_duration_minutes,
                            :break_start_time,
                            :break_end_time,
                            :max_daily_capacity,
                            :allow_walk_ins,
                            :max_walk_ins,
                            :is_active,
                            :notes,
                            :created_at,
                            :created_by,
                            :updated_at,
                            :updated_by
                          )
                          ON DUPLICATE KEY UPDATE
                            start_time = VALUES(start_time),
                            end_time = VALUES(end_time),
                            slot_duration_minutes = VALUES(slot_duration_minutes),
                            break_start_time = VALUES(break_start_time),
                            break_end_time = VALUES(break_end_time),
                            max_daily_capacity = VALUES(max_daily_capacity),
                            allow_walk_ins = VALUES(allow_walk_ins),
                            max_walk_ins = VALUES(max_walk_ins),
                            is_active = VALUES(is_active),
                            notes = VALUES(notes),
                            updated_at = VALUES(updated_at),
                            updated_by = VALUES(updated_by)";

            $stmt = $db->prepare($upsertSql);

            foreach ($schedules as $sched) {
                $day = $sched['day_of_week'] ?? '';
                if (!in_array($day, self::DAYS_OF_WEEK, true)) {
                    continue;
                }

                $startTime = !empty($sched['start_time']) ? substr($sched['start_time'], 0, 8) : '08:00:00';
                $endTime = !empty($sched['end_time']) ? substr($sched['end_time'], 0, 8) : '17:00:00';
                $breakStart = !empty($sched['break_start_time']) ? substr($sched['break_start_time'], 0, 8) : null;
                $breakEnd = !empty($sched['break_end_time']) ? substr($sched['break_end_time'], 0, 8) : null;
                $slotDuration = max(5, (int) ($sched['slot_duration_minutes'] ?? 30));
                $maxCapacity = max(0, (int) ($sched['max_daily_capacity'] ?? 30));
                $allowWalkIns = !empty($sched['allow_walk_ins']) ? 1 : 0;
                $maxWalkIns = max(0, (int) ($sched['max_walk_ins'] ?? 0));
                $isActive = !empty($sched['is_active']) ? 1 : 0;
                $notes = !empty($sched['notes']) ? trim($sched['notes']) : null;

                $stmt->execute([
                    'facility_id'           => $facilityId,
                    'department_id'         => $departmentId,
                    'day_of_week'           => $day,
                    'start_time'            => $startTime,
                    'end_time'              => $endTime,
                    'slot_duration_minutes' => $slotDuration,
                    'break_start_time'      => $breakStart,
                    'break_end_time'        => $breakEnd,
                    'max_daily_capacity'    => $maxCapacity,
                    'allow_walk_ins'        => $allowWalkIns,
                    'max_walk_ins'          => $maxWalkIns,
                    'is_active'             => $isActive,
                    'notes'                 => $notes,
                    'created_at'            => $now,
                    'created_by'            => $userId,
                    'updated_at'            => $now,
                    'updated_by'            => $userId
                ]);

                $savedCount++;
            }

            $db->commit();

            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'CLINIC_SCHEDULE_UPDATED',
                "Updated weekly operating schedule for department '{$dept['name']}' (ID: {$departmentId}). Saved {$savedCount} daily schedules.",
                null,
                $userId
            );

            return [
                'success' => true,
                'message' => "Operating schedule for {$dept['name']} saved successfully.",
                'saved_count' => $savedCount
            ];
        } catch (Throwable $e) {
            $db->rollBack();
            return [
                'success' => false,
                'message' => 'Database error saving clinic schedule: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Copy one day's parameters to other target days.
     */
    public function copyDayToOtherDays(int $departmentId, string $sourceDay, array $targetDays, ?int $facilityId, int $userId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare("SELECT * FROM clinic_operating_schedules WHERE department_id = :dept_id AND day_of_week = :day AND (facility_id = :facility_id OR (:facility_id_null IS NULL AND facility_id IS NULL)) AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([
            'dept_id'          => $departmentId,
            'day'              => $sourceDay,
            'facility_id'      => $facilityId,
            'facility_id_null' => $facilityId
        ]);
        $source = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$source) {
            return ['success' => false, 'message' => "Source schedule for {$sourceDay} not found."];
        }

        $schedules = [];
        foreach ($targetDays as $tDay) {
            if ($tDay === $sourceDay || !in_array($tDay, self::DAYS_OF_WEEK, true)) {
                continue;
            }
            $schedules[] = [
                'day_of_week'           => $tDay,
                'start_time'            => $source['start_time'],
                'end_time'              => $source['end_time'],
                'slot_duration_minutes' => (int) $source['slot_duration_minutes'],
                'break_start_time'      => $source['break_start_time'],
                'break_end_time'        => $source['break_end_time'],
                'max_daily_capacity'    => (int) $source['max_daily_capacity'],
                'allow_walk_ins'        => (int) $source['allow_walk_ins'],
                'max_walk_ins'          => (int) $source['max_walk_ins'],
                'is_active'             => (int) $source['is_active'],
                'notes'                 => $source['notes']
            ];
        }

        if (empty($schedules)) {
            return ['success' => false, 'message' => 'No valid target days selected.'];
        }

        return $this->bulkSaveWeeklySchedule($departmentId, $schedules, $facilityId, $userId);
    }

    /**
     * Calculate theoretical max patient appointment slots.
     */
    private function calculateTotalSlots(string $startTime, string $endTime, ?string $breakStart, ?string $breakEnd, int $slotMinutes): int
    {
        if ($slotMinutes <= 0) return 0;

        $start = strtotime($startTime);
        $end = strtotime($endTime);

        if ($end <= $start) return 0;

        $totalMinutes = ($end - $start) / 60;

        if (!empty($breakStart) && !empty($breakEnd)) {
            $bStart = strtotime($breakStart);
            $bEnd = strtotime($breakEnd);
            if ($bEnd > $bStart && $bStart >= $start && $bEnd <= $end) {
                $breakMinutes = ($bEnd - $bStart) / 60;
                $totalMinutes = max(0, $totalMinutes - $breakMinutes);
            }
        }

        return (int) floor($totalMinutes / $slotMinutes);
    }
}
