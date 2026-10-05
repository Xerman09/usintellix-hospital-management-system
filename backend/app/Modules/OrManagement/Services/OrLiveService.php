<?php

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use PDO;
use Throwable;

/**
 * OR Management > OR Live Board (Surgery Phase 4): the day of surgery.
 *
 *   * board()      -- every suite with its case in the room, the cases
 *                     still to come and the ones done, for a wall screen
 *   * move()       -- a case's next stage, in order only, stamped with the
 *                     time and the user. Gates:
 *                       - Pre-Op Holding / In Room only on the booked day;
 *                       - In Room needs the WHO Sign-In, a free suite;
 *                       - Incision needs the Time-Out (never skipped);
 *                       - leaving the room (In PACU) needs the Sign-Out.
 *                     Cancelling is allowed until the incision.
 *   * undo()       -- takes back the last stage move, with a reason
 *   * setDelay()   -- why a case is late or running over
 *
 * The WHO checklist and the intra-op record are in OrIntraopService.
 */
class OrLiveService
{
    public const STAGES = [
        'Scheduled', 'Pre-Op Holding', 'In Room / Induction', 'Incision / In Progress', 'Closing / Extubation', 'In PACU', 'Transferred / Discharged'
    ];

    /** In the operating room. */
    public const IN_ROOM = ['In Room / Induction', 'Incision / In Progress', 'Closing / Extubation'];

    /** Short names for the board. */
    public const LABELS = [
        'Scheduled' => 'Scheduled', 'Pre-Op Holding' => 'Pre-op holding', 'In Room / Induction' => 'In room / induction',
        'Incision / In Progress' => 'Surgery in progress', 'Closing / Extubation' => 'Closing', 'In PACU' => 'Out of room (PACU)',
        'Transferred / Discharged' => 'Transferred / discharged', 'Cancelled' => 'Cancelled'
    ];

    /** The checklist phase each stage needs first. */
    public const GATES = [
        'In Room / Induction' => 'sign_in',
        'Incision / In Progress' => 'time_out',
        'In PACU' => 'sign_out'
    ];

    /** The milestone column each stage stamps. */
    private const STAMPS = [
        'In Room / Induction' => 'actual_in_room_time',
        'Incision / In Progress' => 'actual_incision_time',
        'Closing / Extubation' => 'actual_closing_time',
        'In PACU' => 'actual_out_room_time',
        'Transferred / Discharged' => 'pacu_discharge_time'
    ];

    public static function nextStage(string $stage): ?string
    {
        $i = array_search($stage, self::STAGES, true);
        return $i === false || $i >= count(self::STAGES) - 1 ? null : self::STAGES[$i + 1];
    }

    /**
     * The board for a date (default today): suites with the case in the
     * room and the queue, every case of the day with its stage times,
     * checklist phases and allergy flag. Today's board also carries cases
     * from earlier days still in the room or recovery.
     */
    public function board(?string $date): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $date = self::validDate($date) ?? $today;

        $suites = $db->query(
            "SELECT s.id, s.suite_code, s.suite_name, s.suite_type, s.status, s.current_case_id, s.turnover_started_at, s.turnover_minutes, s.floor_location
             FROM or_suites s WHERE s.is_active = 1 ORDER BY s.suite_code, s.id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $carry = $date === $today ? " OR c.perioperative_stage IN ('In Room / Induction', 'Incision / In Progress', 'Closing / Extubation', 'In PACU')" : '';
        $stmt = $db->prepare(
            "SELECT c.id, c.case_number, c.patient_id, c.patient_name, c.patient_mrn, c.patient_age, c.gender, c.or_suite_id, c.or_suite_name,
                    c.scheduled_date, c.scheduled_start_time, c.scheduled_end_time, c.estimated_duration_minutes,
                    c.actual_in_room_time, c.anesthesia_start_time, c.actual_incision_time, c.actual_closing_time, c.actual_out_room_time, c.pacu_discharge_time,
                    c.surgical_specialty, c.specialization_id, c.procedure_name, c.laterality, c.lead_surgeon, c.assistant_surgeon, c.anesthesiologist,
                    c.scrub_nurse, c.circulating_nurse, c.anesthesia_type, c.case_priority, c.perioperative_stage, c.delay_reason, c.cancellation_reason,
                    c.pacu_bed_no, c.count_issue, c.implants_required, c.blood_reserved
             FROM or_surgical_cases c
             WHERE c.scheduled_date = :date{$carry}
             ORDER BY c.scheduled_start_time, c.id"
        );
        $stmt->execute(['date' => $date]);
        $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $ids = array_map(fn($c) => (int) $c['id'], $cases);
        $checks = [];
        $stageAt = [];
        $allergies = [];
        if ($ids) {
            $in = implode(',', $ids);
            foreach ($db->query("SELECT case_id, phase, completed_at FROM or_case_safety_checks WHERE case_id IN ({$in})")->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $checks[(int) $r['case_id']][$r['phase']] = $r['completed_at'];
            }
            foreach ($db->query(
                "SELECT case_id, stage, MAX(stage_at) AS at FROM or_case_stages WHERE case_id IN ({$in}) AND undone_at IS NULL GROUP BY case_id, stage"
            )->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $stageAt[(int) $r['case_id']][$r['stage']] = $r['at'];
            }
            $patients = array_values(array_unique(array_filter(array_map(fn($c) => (int) $c['patient_id'], $cases))));
            if ($patients) {
                foreach ($db->query(
                    "SELECT pa.patient_id, a.name FROM patient_allergies pa JOIN allergies a ON a.id = pa.allergy_id
                     WHERE pa.patient_id IN (" . implode(',', $patients) . ") AND pa.deleted_at IS NULL AND (pa.end_date IS NULL OR pa.end_date >= CURDATE())"
                )->fetchAll(PDO::FETCH_ASSOC) as $r) {
                    $allergies[(int) $r['patient_id']][] = $r['name'];
                }
            }
        }

        $cases = array_map(function ($c) use ($checks, $stageAt, $allergies) {
            $id = (int) $c['id'];
            $stage = $c['perioperative_stage'];
            $next = $stage === 'Cancelled' ? null : self::nextStage($stage);
            $since = $stageAt[$id][$stage] ?? (isset(self::STAMPS[$stage]) ? $c[self::STAMPS[$stage]] : null);
            return $c + [
                'stage_label' => self::LABELS[$stage] ?? $stage,
                'stage_since' => $since,
                'next_stage' => $next,
                'next_label' => $next ? (self::LABELS[$next] ?? $next) : null,
                'checklist' => [
                    'sign_in' => $checks[$id]['sign_in'] ?? null,
                    'time_out' => $checks[$id]['time_out'] ?? null,
                    'sign_out' => $checks[$id]['sign_out'] ?? null
                ],
                'allergies' => $c['patient_id'] ? ($allergies[(int) $c['patient_id']] ?? []) : []
            ];
        }, $cases);

        $live = fn($c) => in_array($c['perioperative_stage'], self::IN_ROOM, true);
        $count = fn(callable $f) => count(array_filter($cases, $f));

        return [
            'date' => $date,
            'is_today' => $date === $today,
            'now' => date('Y-m-d H:i:s'),
            'suites' => array_map(function ($s) use ($cases, $live) {
                $mine = array_values(array_filter($cases, fn($c) => (int) $c['or_suite_id'] === (int) $s['id']));
                $current = null;
                foreach ($mine as $c) {
                    if ($live($c)) {
                        $current = $c;
                        break;
                    }
                }
                return $s + [
                    'current_case' => $current,
                    'queue' => array_values(array_filter($mine, fn($c) => in_array($c['perioperative_stage'], ['Scheduled', 'Pre-Op Holding'], true))),
                    'done' => array_values(array_filter($mine, fn($c) => in_array($c['perioperative_stage'], ['In PACU', 'Transferred / Discharged'], true)))
                ];
            }, $suites),
            'cases' => $cases,
            'counts' => [
                'total' => $count(fn($c) => $c['perioperative_stage'] !== 'Cancelled'),
                'waiting' => $count(fn($c) => in_array($c['perioperative_stage'], ['Scheduled', 'Pre-Op Holding'], true)),
                'in_room' => $count($live),
                'recovery' => $count(fn($c) => $c['perioperative_stage'] === 'In PACU'),
                'done' => $count(fn($c) => $c['perioperative_stage'] === 'Transferred / Discharged'),
                'cancelled' => $count(fn($c) => $c['perioperative_stage'] === 'Cancelled')
            ],
            'labels' => self::LABELS
        ];
    }

    /**
     * Moves a case to its next stage. data: stage (the stage expected next,
     * so two people clicking don't move it twice), at? (Y-m-d H:i[:s],
     * when it happened if recorded late), pacu_bed_no?, pacu_aldrete_score?,
     * postop_disposition?, cancellation_reason (for Cancelled).
     */
    public function move(int $caseId, array $data, int $userId): array
    {
        $to = trim((string) ($data['stage'] ?? $data['perioperative_stage'] ?? ''));
        if ($to === 'Cancelled') {
            return $this->cancel($caseId, (string) ($data['cancellation_reason'] ?? $data['reason'] ?? ''), $userId);
        }

        $db = Database::connection();
        $scheduling = new OrSchedulingService();
        $owns = $this->begin($db);
        try {
            $case = $this->lockCase($db, $caseId);
            if (!$case) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
            }
            $from = $case['perioperative_stage'];
            $fail = function (string $message, array $extra = []) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message] + $extra;
            };

            if ($from === 'Cancelled') {
                return $fail("{$case['case_number']} was cancelled.");
            }
            $next = self::nextStage($from);
            if ($next === null) {
                return $fail("{$case['case_number']} is already {$from}.");
            }
            if ($to !== $next) {
                return $fail($to === $from
                    ? "{$case['case_number']} is already " . self::LABELS[$from] . ' (someone else may have just moved it).'
                    : 'Stages move in order. The next stage for ' . $case['case_number'] . ' is ' . self::LABELS[$next] . '.', ['current_stage' => $from]);
            }

            $today = date('Y-m-d');
            if (in_array($to, ['Pre-Op Holding', 'In Room / Induction'], true) && $case['scheduled_date'] !== $today) {
                return $fail("{$case['case_number']} is booked for " . date('D, M j, Y', strtotime($case['scheduled_date']))
                    . '. Move it to today on the OR Schedule first.');
            }

            $gate = self::GATES[$to] ?? null;
            if ($gate && !$this->checkDone($caseId, $gate)) {
                $names = ['sign_in' => 'the Sign-In', 'time_out' => 'the Time-Out', 'sign_out' => 'the Sign-Out'];
                $before = ['sign_in' => 'before the patient goes into the room', 'time_out' => 'before the incision', 'sign_out' => 'before the patient leaves the room'];
                return $fail("Do {$names[$gate]} of the safety checklist first — it's needed {$before[$gate]}.", ['needs_check' => $gate]);
            }

            // When it happened: now, or a time recorded late (not in the future, not before the last stage).
            $now = date('Y-m-d H:i:s');
            $at = $now;
            if (!empty($data['at'])) {
                $at = self::validDateTime((string) $data['at']);
                if ($at === null) {
                    return $fail('Enter a valid time.', ['errors' => ['at' => 'Enter a valid time.']]);
                }
                if ($at > date('Y-m-d H:i:s', time() + 60)) {
                    return $fail('That time is in the future.', ['errors' => ['at' => 'That time is in the future.']]);
                }
                $last = $this->lastStageAt($caseId);
                if ($last && $at < $last) {
                    return $fail('That time is before the previous stage (' . date('g:i A', strtotime($last)) . ').', ['errors' => ['at' => 'Before the previous stage.']]);
                }
                if (strtotime($at) < time() - 86400) {
                    return $fail('That time is more than a day ago.', ['errors' => ['at' => 'More than a day ago.']]);
                }
            }

            $sets = ['perioperative_stage = :stage', 'revision = revision + 1', 'updated_at = NOW()'];
            $params = ['stage' => $to, 'id' => $caseId, 'from' => $from];
            if (isset(self::STAMPS[$to])) {
                $sets[] = self::STAMPS[$to] . ' = :at';
                $params['at'] = $at;
            }

            $suite = $this->lockSuite($db, (int) $case['or_suite_id']);
            $details = ['from' => $from, 'to' => $to];
            if ($at !== $now) {
                $details['at'] = $at;
            }

            if ($to === 'In Room / Induction') {
                if (!$suite) {
                    return $fail('The booked OR suite no longer exists. Move the case to another suite on the OR Schedule.');
                }
                if (in_array($suite['status'], ['Maintenance', 'Blocked'], true)) {
                    return $fail("{$suite['suite_name']} is marked {$suite['status']}. Move the case to another suite, or set the suite back to Available.");
                }
                $busy = $this->caseInRoom($db, (int) $suite['id'], $caseId);
                if ($busy) {
                    return $fail("{$suite['suite_name']} is still in use by {$busy['case_number']} ({$busy['procedure_name']}). Move that case out of the room first.");
                }
                // The room was being cleaned: that turnover ends now.
                if ($suite['status'] === 'Cleaning / Turnover' && $suite['turnover_started_at']) {
                    $sets[] = 'turnover_duration_minutes = :turnover';
                    $params['turnover'] = max(0, (int) round((strtotime($at) - strtotime($suite['turnover_started_at'])) / 60));
                    $details['turnover_minutes'] = $params['turnover'];
                }
                $db->prepare("UPDATE or_suites SET status = 'In Surgery', current_case_id = :c, turnover_started_at = NULL, updated_at = NOW() WHERE id = :s")
                    ->execute(['c' => $caseId, 's' => $suite['id']]);
            } elseif (in_array($to, ['Incision / In Progress', 'Closing / Extubation'], true) && $suite) {
                if ((int) $suite['current_case_id'] !== $caseId && !$this->caseInRoom($db, (int) $suite['id'], $caseId)) {
                    $db->prepare("UPDATE or_suites SET status = 'In Surgery', current_case_id = :c, updated_at = NOW() WHERE id = :s")
                        ->execute(['c' => $caseId, 's' => $suite['id']]);
                }
            } elseif ($to === 'In PACU') {
                $bed = self::text($data['pacu_bed_no'] ?? null, 50);
                if ($bed !== null) {
                    $sets[] = 'pacu_bed_no = :bed';
                    $params['bed'] = $bed;
                }
                if (isset($data['estimated_blood_loss_ml']) && $data['estimated_blood_loss_ml'] !== '') {
                    $sets[] = 'estimated_blood_loss_ml = :ebl';
                    $params['ebl'] = max(0, (int) $data['estimated_blood_loss_ml']);
                }
                if ($suite && (int) $suite['current_case_id'] === $caseId) {
                    $db->prepare("UPDATE or_suites SET status = 'Cleaning / Turnover', current_case_id = NULL, turnover_started_at = :at, updated_at = NOW() WHERE id = :s")
                        ->execute(['at' => $at, 's' => $suite['id']]);
                }
            } elseif ($to === 'Transferred / Discharged') {
                if (isset($data['pacu_aldrete_score']) && $data['pacu_aldrete_score'] !== '' && $data['pacu_aldrete_score'] !== null) {
                    $score = (int) $data['pacu_aldrete_score'];
                    if ($score < 0 || $score > 10) {
                        return $fail('The Aldrete score is 0 to 10.', ['errors' => ['pacu_aldrete_score' => '0 to 10.']]);
                    }
                    $sets[] = 'pacu_aldrete_score = :aldrete';
                    $params['aldrete'] = $score;
                }
                $disposition = self::text($data['postop_disposition'] ?? null, 100);
                if ($disposition !== null) {
                    $sets[] = 'postop_disposition = :disp';
                    $params['disp'] = $disposition;
                }
            }

            $stmt = $db->prepare("UPDATE or_surgical_cases SET " . implode(', ', $sets) . " WHERE id = :id AND perioperative_stage = :from");
            $stmt->execute($params);
            if ($stmt->rowCount() !== 1) {
                return $fail("{$case['case_number']} was just changed by someone else. Reload and try again.");
            }

            $db->prepare(
                "INSERT INTO or_case_stages (case_id, stage, from_stage, stage_at, user_id, notes) VALUES (:c, :s, :f, :at, :u, :n)"
            )->execute(['c' => $caseId, 's' => $to, 'f' => $from, 'at' => $at, 'u' => $userId ?: null, 'n' => $at !== $now ? 'Recorded late' : null]);
            $scheduling->log($caseId, 'stage', $details, null, $userId ?: null);

            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$case['case_number']}: " . self::LABELS[$to] . ($at !== $now ? ' at ' . date('g:i A', strtotime($at)) : '') . '.'];
    }

    /**
     * Cancelling on the day: before the patient is in the room it's the
     * schedule's cancel; in the room (before the incision) the case is
     * abandoned and the suite goes to cleaning. The request goes back to
     * the ready list either way.
     */
    public function cancel(int $caseId, string $reason, int $userId): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the case is cancelled.', 'errors' => ['cancellation_reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $stmt = $db->prepare("SELECT perioperative_stage FROM or_surgical_cases WHERE id = :id");
        $stmt->execute(['id' => $caseId]);
        $stage = $stmt->fetchColumn();
        if ($stage === false) {
            return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
        }
        $scheduling = new OrSchedulingService();
        if (in_array($stage, OrSchedulingService::MOVABLE_STAGES, true)) {
            return $scheduling->cancel($caseId, $reason, true, ['id' => $userId]);
        }

        $owns = $this->begin($db);
        try {
            $case = $this->lockCase($db, $caseId);
            if ($case['perioperative_stage'] !== 'In Room / Induction') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $case['perioperative_stage'] === 'Cancelled'
                    ? "{$case['case_number']} was already cancelled."
                    : "{$case['case_number']} is past the incision; it can't be cancelled. Record what was done and move it on."];
            }
            $now = date('Y-m-d H:i:s');
            $db->prepare(
                "UPDATE or_surgical_cases SET perioperative_stage = 'Cancelled', cancellation_reason = :r, cancelled_at = :now, cancelled_by = :u,
                        revision = revision + 1, updated_at = NOW() WHERE id = :id"
            )->execute(['r' => mb_substr('Abandoned in the room: ' . $reason, 0, 255), 'now' => $now, 'u' => $userId, 'id' => $caseId]);
            $db->prepare("UPDATE or_suites SET status = 'Cleaning / Turnover', current_case_id = NULL, turnover_started_at = :now WHERE current_case_id = :id")
                ->execute(['now' => $now, 'id' => $caseId]);
            $db->prepare("INSERT INTO or_case_stages (case_id, stage, from_stage, stage_at, user_id, notes) VALUES (:c, 'Cancelled', :f, :at, :u, :n)")
                ->execute(['c' => $caseId, 'f' => $case['perioperative_stage'], 'at' => $now, 'u' => $userId, 'n' => mb_substr($reason, 0, 255)]);
            $scheduling->releaseRequest($case, true, $reason, $userId);
            $scheduling->log($caseId, 'cancelled', ['from' => $case['perioperative_stage'], 'request' => $case['surgery_request_id'] ? 'back to ready' : null], $reason, $userId);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }
        $scheduling->notify($caseId, 'cancelled', $reason, $userId);

        return ['success' => true, 'message' => "{$case['case_number']} cancelled; the suite is set to cleaning."
            . ($case['surgery_request_id'] ? ' The surgery request is back on the ready list.' : '')];
    }

    /** Takes back the last stage move (a wrong click), with a reason. */
    public function undo(int $caseId, string $reason, int $userId): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the stage is being taken back.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $case = $this->lockCase($db, $caseId);
            if (!$case) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
            }
            $stage = $case['perioperative_stage'];
            $i = array_search($stage, self::STAGES, true);
            if ($i === false || $i === 0) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $stage === 'Cancelled' ? 'A cancelled case can\'t be taken back here.' : 'There is no stage move to take back.'];
            }
            $previous = self::STAGES[$i - 1];

            $suite = $this->lockSuite($db, (int) $case['or_suite_id']);
            if ($stage === 'In PACU' && $suite) {
                $busy = $this->caseInRoom($db, (int) $suite['id'], $caseId);
                if ($busy) {
                    $this->rollBack($db, $owns);
                    return ['success' => false, 'message' => "{$suite['suite_name']} already has {$busy['case_number']} in it; this case can't go back into the room."];
                }
                $db->prepare("UPDATE or_suites SET status = 'In Surgery', current_case_id = :c, turnover_started_at = NULL WHERE id = :s")
                    ->execute(['c' => $caseId, 's' => $suite['id']]);
            }
            if ($stage === 'In Room / Induction' && $suite && (int) $suite['current_case_id'] === $caseId) {
                $db->prepare("UPDATE or_suites SET status = 'Available', current_case_id = NULL WHERE id = :s")->execute(['s' => $suite['id']]);
            }

            $sets = ['perioperative_stage = :prev', 'revision = revision + 1', 'updated_at = NOW()'];
            if (isset(self::STAMPS[$stage])) {
                $sets[] = self::STAMPS[$stage] . ' = NULL';
            }
            if ($stage === 'In Room / Induction') {
                $sets[] = 'turnover_duration_minutes = NULL';
            }
            $stmt = $db->prepare("UPDATE or_surgical_cases SET " . implode(', ', $sets) . " WHERE id = :id AND perioperative_stage = :stage");
            $stmt->execute(['prev' => $previous, 'id' => $caseId, 'stage' => $stage]);

            $db->prepare(
                "UPDATE or_case_stages SET undone_at = :now, undone_by = :u, undo_reason = :r
                 WHERE case_id = :c AND stage = :s AND undone_at IS NULL ORDER BY stage_at DESC, id DESC LIMIT 1"
            )->execute(['now' => date('Y-m-d H:i:s'), 'u' => $userId, 'r' => mb_substr($reason, 0, 255), 'c' => $caseId, 's' => $stage]);
            (new OrSchedulingService())->log($caseId, 'stage_undone', ['from' => $stage, 'to' => $previous], $reason, $userId);

            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$case['case_number']} is back to " . self::LABELS[$previous] . '.'];
    }

    /** Why a case is late or running over (empty clears it). */
    public function setDelay(int $caseId, string $reason, int $userId): array
    {
        $reason = trim($reason);
        $db = Database::connection();
        $stmt = $db->prepare("SELECT case_number, delay_reason FROM or_surgical_cases WHERE id = :id");
        $stmt->execute(['id' => $caseId]);
        $case = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$case) {
            return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
        }
        $db->prepare("UPDATE or_surgical_cases SET delay_reason = :r, updated_at = NOW() WHERE id = :id")
            ->execute(['r' => $reason === '' ? null : mb_substr($reason, 0, 255), 'id' => $caseId]);
        (new OrSchedulingService())->log($caseId, 'delay', [], $reason === '' ? 'Delay reason cleared' : $reason, $userId);

        return ['success' => true, 'message' => $reason === '' ? 'Delay reason cleared.' : 'Delay reason saved.'];
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    public function checkDone(int $caseId, string $phase): bool
    {
        $stmt = Database::connection()->prepare("SELECT 1 FROM or_case_safety_checks WHERE case_id = :c AND phase = :p");
        $stmt->execute(['c' => $caseId, 'p' => $phase]);
        return (bool) $stmt->fetchColumn();
    }

    private function lastStageAt(int $caseId): ?string
    {
        $stmt = Database::connection()->prepare("SELECT MAX(stage_at) FROM or_case_stages WHERE case_id = :c AND undone_at IS NULL");
        $stmt->execute(['c' => $caseId]);
        return $stmt->fetchColumn() ?: null;
    }

    private function lockCase(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function lockSuite(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare("SELECT * FROM or_suites WHERE id = :id FOR UPDATE");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** Another case in the suite's room right now. */
    private function caseInRoom(PDO $db, int $suiteId, int $exceptCaseId): ?array
    {
        $stmt = $db->prepare(
            "SELECT id, case_number, procedure_name FROM or_surgical_cases
             WHERE or_suite_id = :s AND id <> :c AND perioperative_stage IN ('In Room / Induction', 'Incision / In Progress', 'Closing / Extubation') LIMIT 1"
        );
        $stmt->execute(['s' => $suiteId, 'c' => $exceptCaseId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public static function validDate($value): ?string
    {
        $value = trim((string) $value);
        $d = \DateTime::createFromFormat('Y-m-d', $value);
        return $d && $d->format('Y-m-d') === $value ? $value : null;
    }

    /** 'Y-m-d H:i[:s]' or 'Y-m-dTH:i' => 'Y-m-d H:i:s'. */
    public static function validDateTime(string $value): ?string
    {
        $value = str_replace('T', ' ', trim($value));
        foreach (['Y-m-d H:i:s', 'Y-m-d H:i'] as $format) {
            $d = \DateTime::createFromFormat($format, $value);
            if ($d && $d->format($format) === $value) {
                return $d->format('Y-m-d H:i:s');
            }
        }
        return null;
    }

    private static function text($value, int $max): ?string
    {
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT or_live_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT or_live_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        if ($owns) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            return;
        }
        $db->exec('ROLLBACK TO SAVEPOINT or_live_step');
    }
}
