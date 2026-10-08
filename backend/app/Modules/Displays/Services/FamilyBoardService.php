<?php

namespace App\Modules\Displays\Services;

use App\Core\Database;
use PDO;

/**
 * The waiting room's family board (module 9, Phase 4), built from the OR Live Board: each of
 * today's surgeries by its case code and the patient's initials only -- no name, procedure or
 * surgeon -- and where the patient is:
 *   Preparing for surgery -> In surgery -> In recovery -> Moved to the ICU / to the ward / Ready to go home.
 * Cancelled cases are left off (the family is told in person). The OR module keeps its times on
 * the PHP clock, so "today" is the PHP date (like the OR Live Board).
 */
class FamilyBoardService
{
    public const STATUS = [
        'preparing' => 'Preparing for surgery', 'in_surgery' => 'In surgery', 'recovery' => 'In recovery',
        'icu' => 'Moved to the ICU', 'ward' => 'Moved to the ward', 'home' => 'Ready to go home', 'transferred' => 'Transferred', 'done' => 'Surgery finished',
    ];
    /** On the board, in this order. */
    private const ORDER = ['in_surgery' => 0, 'recovery' => 1, 'preparing' => 2, 'icu' => 3, 'ward' => 3, 'home' => 3, 'transferred' => 3, 'done' => 3];

    public function content(): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $stmt = $db->prepare(
            "SELECT c.id, c.case_number, c.patient_name, c.perioperative_stage, c.release_destination, c.scheduled_start_time,
                    c.actual_in_room_time, c.actual_out_room_time, c.pacu_discharge_time,
                    (SELECT MAX(st.stage_at) FROM or_case_stages st WHERE st.case_id = c.id AND st.stage = c.perioperative_stage AND st.undone_at IS NULL) AS stage_at
             FROM or_surgical_cases c
             WHERE c.perioperative_stage <> 'Cancelled'
               AND (c.scheduled_date = :d OR c.perioperative_stage IN ('In Room / Induction', 'Incision / In Progress', 'Closing / Extubation', 'In PACU'))
             ORDER BY c.scheduled_start_time, c.id"
        );
        $stmt->execute(['d' => $today]);
        $rows = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $c) {
            $status = match ($c['perioperative_stage']) {
                'Scheduled', 'Pre-Op Holding' => 'preparing',
                'In Room / Induction', 'Incision / In Progress', 'Closing / Extubation' => 'in_surgery',
                'In PACU' => 'recovery',
                'Transferred / Discharged' => match ($c['release_destination']) {
                    'icu' => 'icu', 'ward' => 'ward', 'home' => 'home', 'transfer', 'other' => 'transferred', default => 'done',
                },
                default => null,
            };
            if (!$status) {
                continue;
            }
            $since = $c['stage_at'] ?: match ($status) {
                'in_surgery' => $c['actual_in_room_time'], 'recovery' => $c['actual_out_room_time'],
                'preparing' => null, default => $c['pacu_discharge_time'],
            };
            $rows[] = [
                'code' => $c['case_number'], 'initials' => NurseStationTvService::initials((string) $c['patient_name']),
                'status' => $status, 'label' => self::STATUS[$status],
                'since' => $since, 'planned' => $status === 'preparing' ? substr((string) $c['scheduled_start_time'], 0, 5) : null,
            ];
        }
        // By status, then by time (planned start while preparing, else since when), then code.
        usort($rows, fn($a, $b) => [self::ORDER[$a['status']], $a['planned'] ?? $a['since'] ?? '', $a['code']]
            <=> [self::ORDER[$b['status']], $b['planned'] ?? $b['since'] ?? '', $b['code']]);
        $n = fn(string $s) => count(array_filter($rows, fn($r) => $r['status'] === $s));
        return [
            'cases' => $rows,
            'counts' => ['in_surgery' => $n('in_surgery'), 'recovery' => $n('recovery'), 'preparing' => $n('preparing'),
                'finished' => count($rows) - $n('in_surgery') - $n('recovery') - $n('preparing')],
            'statuses' => self::STATUS,
        ];
    }
}
