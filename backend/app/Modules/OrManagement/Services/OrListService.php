<?php

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use PDO;

/**
 * The day's OR list (module 9, Phase 4): time, room, surgeon, anesthesiologist, specialization,
 * and where each case is now (from the OR Live Board). Shown on OR TVs (no patient details) and
 * printed from OR Schedule (with the case number and the procedure, for the staff).
 * The OR module keeps its times on the PHP clock (like OrLiveService).
 */
class OrListService
{
    /**
     * @param bool $forPrint the printout adds the procedure and patient initials; the TV doesn't
     */
    public function forDate(?string $date, ?int $suiteId = null, bool $forPrint = false): array
    {
        $db = Database::connection();
        $date = $date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) && strtotime($date) ? $date : date('Y-m-d');
        $where = 'c.scheduled_date = :d';
        $params = ['d' => $date];
        if ($suiteId) {
            $where .= ' AND c.or_suite_id = :s';
            $params['s'] = $suiteId;
        }
        $stmt = $db->prepare(
            "SELECT c.id, c.case_number, c.scheduled_start_time, c.scheduled_end_time, c.estimated_duration_minutes, c.or_suite_id,
                    COALESCE(s.suite_name, c.or_suite_name) AS suite, c.lead_surgeon, c.assistant_surgeon, c.anesthesiologist,
                    COALESCE(sp.name, c.surgical_specialty) AS specialization, c.procedure_name, c.laterality, c.patient_name,
                    c.case_priority, c.perioperative_stage, c.anesthesia_type, c.cancellation_reason, c.delay_reason
             FROM or_surgical_cases c
             LEFT JOIN or_suites s ON s.id = c.or_suite_id
             LEFT JOIN specializations sp ON sp.id = c.specialization_id
             WHERE {$where}
             ORDER BY c.scheduled_start_time, COALESCE(s.suite_name, c.or_suite_name), c.id"
        );
        $stmt->execute($params);
        $rows = array_map(function ($c) use ($forPrint) {
            $row = [
                'id' => (int) $c['id'], 'start' => substr((string) $c['scheduled_start_time'], 0, 5), 'end' => substr((string) $c['scheduled_end_time'], 0, 5),
                'suite_id' => $c['or_suite_id'] !== null ? (int) $c['or_suite_id'] : null, 'suite' => $c['suite'],
                'surgeon' => $c['lead_surgeon'], 'assistant' => $c['assistant_surgeon'], 'anesthesiologist' => $c['anesthesiologist'],
                'specialization' => $c['specialization'], 'priority' => $c['case_priority'],
                'stage' => $c['perioperative_stage'], 'stage_label' => OrLiveService::LABELS[$c['perioperative_stage']] ?? $c['perioperative_stage'],
                'cancelled' => $c['perioperative_stage'] === 'Cancelled', 'delay_reason' => $c['delay_reason'],
            ];
            if ($forPrint) {
                $row += ['case_number' => $c['case_number'], 'procedure' => trim($c['procedure_name'] . ($c['laterality'] && $c['laterality'] !== 'Not Applicable' ? " ({$c['laterality']})" : '')),
                    'anesthesia_type' => $c['anesthesia_type'], 'initials' => \App\Modules\Displays\Services\NurseStationTvService::initials((string) $c['patient_name']),
                    'cancellation_reason' => $c['cancellation_reason']];
            }
            return $row;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
        $suite = null;
        if ($suiteId) {
            $s = $db->prepare("SELECT suite_name FROM or_suites WHERE id = :id");
            $s->execute(['id' => $suiteId]);
            $suite = $s->fetchColumn() ?: null;
        }
        $live = fn($r) => in_array($r['stage'], OrLiveService::IN_ROOM, true);
        return [
            'date' => $date, 'is_today' => $date === date('Y-m-d'), 'suite' => $suite, 'cases' => $rows,
            'counts' => [
                'total' => count(array_filter($rows, fn($r) => !$r['cancelled'])),
                'in_room' => count(array_filter($rows, $live)),
                'done' => count(array_filter($rows, fn($r) => in_array($r['stage'], ['In PACU', 'Transferred / Discharged'], true))),
                'cancelled' => count(array_filter($rows, fn($r) => $r['cancelled'])),
            ],
        ];
    }
}
