<?php

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use App\Modules\Messaging\Services\MessagingService;
use App\Modules\Specializations\Services\SpecializationService;
use App\Modules\SurgeryRequests\Services\SurgeryRequestService;
use PDO;
use Throwable;

/**
 * OR Management > OR Schedule: booking surgery into the operating rooms.
 *
 *   * calendar()   -- suites by day or week: cases, block times, and the
 *                     surgery requests ready to be booked
 *   * check()      -- conflicts for a proposed booking. Errors (refused):
 *                     the suite overlapping another case including its
 *                     cleaning time, a suite under maintenance / blocked
 *                     / inactive, the same surgeon, assistant,
 *                     anesthesiologist, nurse or patient in two places at
 *                     once, a date in the past. Warnings (allowed once
 *                     acknowledged): outside the specialization's block
 *                     time, or inside another specialization's block.
 *   * book()       -- a ready surgery request becomes an OR case
 *   * reschedule() -- another suite / date / time / team, with a reason
 *   * cancel()     -- with a reason; the request goes back to the ready
 *                     list (or is cancelled too)
 *   * block times  -- a suite reserved for a specialization on a weekday
 *   * history()    -- every booking change: who, when, from / to, why
 *
 * The surgical team and the patient (if they use the portal) get a
 * message when a case is booked, moved or cancelled.
 */
class OrSchedulingService
{
    public const ROLES = ['admin', 'receptionist', 'doctor'];

    /** Stages a case can still be moved or cancelled in from the schedule. */
    public const MOVABLE_STAGES = ['Scheduled', 'Pre-Op Holding'];

    public const TEAM = [
        'lead_surgeon_user_id' => 'surgeon', 'assistant_surgeon_user_id' => 'assistant surgeon', 'anesthesiologist_user_id' => 'anesthesiologist',
        'scrub_nurse_user_id' => 'scrub nurse', 'circulating_nurse_user_id' => 'circulating nurse'
    ];

    private const DAYS = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];

    /* ---------------------------------------------------------------
     * Calendar
     * ------------------------------------------------------------- */

    /** Filters: start (Y-m-d), days (1 | 7), suite_id?, specialization_id?, surgeon_user_id? */
    public function calendar(array $filters): array
    {
        $db = Database::connection();
        $start = self::date($filters['start'] ?? null) ?? date('Y-m-d');
        $days = (int) ($filters['days'] ?? 1) === 7 ? 7 : 1;
        if ($days === 7) {
            // Weeks start on Monday.
            $start = date('Y-m-d', strtotime($start . ' -' . ((int) date('N', strtotime($start)) - 1) . ' days'));
        }
        $end = date('Y-m-d', strtotime($start . ' +' . ($days - 1) . ' days'));

        $suiteWhere = 's.is_active = 1';
        if (!empty($filters['suite_id'])) {
            $suiteWhere .= ' AND s.id = ' . (int) $filters['suite_id'];
        }
        $suites = $db->query(
            "SELECT s.id, s.suite_code, s.suite_name, s.suite_type, s.status, s.turnover_minutes, s.floor_location
             FROM or_suites s WHERE {$suiteWhere} ORDER BY s.suite_code, s.id"
        )->fetchAll(PDO::FETCH_ASSOC);
        $suiteIds = array_map(fn($s) => (int) $s['id'], $suites);

        $where = ["c.scheduled_date BETWEEN :start AND :end", "c.perioperative_stage <> 'Cancelled'"];
        $params = ['start' => $start, 'end' => $end];
        $where[] = $suiteIds ? 'c.or_suite_id IN (' . implode(',', $suiteIds) . ')' : '1 = 0';
        if (!empty($filters['specialization_id'])) {
            $where[] = 'c.specialization_id = :spec';
            $params['spec'] = (int) $filters['specialization_id'];
        }
        if (!empty($filters['surgeon_user_id'])) {
            $where[] = '(c.lead_surgeon_user_id = :s1 OR c.assistant_surgeon_user_id = :s2)';
            $params += ['s1' => (int) $filters['surgeon_user_id'], 's2' => (int) $filters['surgeon_user_id']];
        }
        $stmt = $db->prepare(
            "SELECT c.id, c.case_number, c.or_suite_id, c.scheduled_date, c.scheduled_start_time, c.scheduled_end_time, c.estimated_duration_minutes,
                    c.patient_id, c.patient_name, c.patient_mrn, c.procedure_name, c.laterality, c.surgical_specialty, c.specialization_id,
                    c.lead_surgeon, c.lead_surgeon_user_id, c.anesthesiologist, c.case_priority, c.perioperative_stage, c.surgery_request_id
             FROM or_surgical_cases c WHERE " . implode(' AND ', $where) . "
             ORDER BY c.scheduled_date, c.scheduled_start_time"
        );
        $stmt->execute($params);
        $cases = array_map(fn($c) => $c + ['can_move' => in_array($c['perioperative_stage'], self::MOVABLE_STAGES, true)], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $blocks = [];
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', strtotime("{$start} +{$i} days"));
            foreach ($this->blocksOn($date, $suiteIds) as $b) {
                $blocks[] = $b + ['date' => $date];
            }
        }

        $ready = (new SurgeryRequestService())->list(['view' => 'ready', 'specialization_id' => $filters['specialization_id'] ?? null])['rows'];

        return [
            'start' => $start, 'end' => $end, 'days' => $days,
            'suites' => array_map(fn($s) => $s + ['bookable' => !in_array($s['status'], ['Maintenance', 'Blocked'], true)], $suites),
            'cases' => $cases,
            'blocks' => $blocks,
            'ready' => $ready
        ];
    }

    /** Block times active on a date (for the given suites, or all). */
    public function blocksOn(string $date, array $suiteIds = []): array
    {
        $dow = (int) date('N', strtotime($date));
        $stmt = Database::connection()->prepare(
            "SELECT b.id, b.or_suite_id, b.specialization_id, b.start_time, b.end_time, b.notes, s.name AS specialization_name
             FROM or_block_times b JOIN specializations s ON s.id = b.specialization_id
             WHERE b.is_active = 1 AND b.day_of_week = :dow
               AND (b.effective_from IS NULL OR b.effective_from <= :d1) AND (b.effective_to IS NULL OR b.effective_to >= :d2)"
            . ($suiteIds ? " AND b.or_suite_id IN (" . implode(',', array_map('intval', $suiteIds)) . ")" : "") . "
             ORDER BY b.start_time"
        );
        $stmt->execute(['dow' => $dow, 'd1' => $date, 'd2' => $date]);

        return array_map(fn($b) => [
            'block_id' => (int) $b['id'], 'or_suite_id' => (int) $b['or_suite_id'], 'specialization_id' => (int) $b['specialization_id'],
            'specialization_name' => $b['specialization_name'], 'start_time' => substr($b['start_time'], 0, 5), 'end_time' => substr($b['end_time'], 0, 5), 'notes' => $b['notes']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* ---------------------------------------------------------------
     * Conflicts
     * ------------------------------------------------------------- */

    /**
     * p: or_suite_id, scheduled_date, scheduled_start_time, estimated_duration_minutes,
     * specialization_id?, patient_id?, the TEAM user ids. Returns
     * ['errors' => [field => message], 'warnings' => [message]].
     */
    public function check(array $p, ?int $excludeCaseId = null): array
    {
        $db = Database::connection();
        $errors = [];
        $warnings = [];

        $date = self::date($p['scheduled_date'] ?? null);
        $start = self::minutes($p['scheduled_start_time'] ?? null);
        $duration = (int) ($p['estimated_duration_minutes'] ?? 0);
        if (!$date) {
            return ['errors' => ['scheduled_date' => 'Enter a valid date.'], 'warnings' => []];
        }
        if ($start === null) {
            return ['errors' => ['scheduled_start_time' => 'Enter a valid start time.'], 'warnings' => []];
        }
        if ($date < date('Y-m-d')) {
            $errors['scheduled_date'] = 'The date is in the past.';
        }
        $end = $start + max(5, $duration);
        if ($end > 24 * 60) {
            $errors['estimated_duration_minutes'] = 'The case would run past midnight. Start earlier or split the day.';
        }

        $stmt = $db->prepare("SELECT id, suite_name, status, is_active, turnover_minutes FROM or_suites WHERE id = :id");
        $stmt->execute(['id' => (int) ($p['or_suite_id'] ?? 0)]);
        $suite = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$suite || !(int) $suite['is_active']) {
            $errors['or_suite_id'] = 'Choose an OR suite.';
        } elseif (in_array($suite['status'], ['Maintenance', 'Blocked'], true)) {
            $errors['or_suite_id'] = "{$suite['suite_name']} is marked {$suite['status']}. Choose another suite, or set it back to Available under Room Status.";
        }

        // Everything booked that day (not cancelled), except the case being moved.
        $stmt = $db->prepare(
            "SELECT c.*, s.turnover_minutes AS suite_turnover FROM or_surgical_cases c JOIN or_suites s ON s.id = c.or_suite_id
             WHERE c.scheduled_date = :d AND c.perioperative_stage <> 'Cancelled'" . ($excludeCaseId ? " AND c.id <> " . (int) $excludeCaseId : "")
        );
        $stmt->execute(['d' => $date]);
        $sameDay = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $span = fn($c) => [self::minutes($c['scheduled_start_time']), self::minutes($c['scheduled_end_time']) ?: self::minutes($c['scheduled_start_time']) + (int) $c['estimated_duration_minutes']];
        $label = fn($c) => "{$c['case_number']} ({$c['procedure_name']}, " . substr($c['scheduled_start_time'], 0, 5) . '–' . substr($c['scheduled_end_time'], 0, 5) . " in {$c['or_suite_name']})";

        if ($suite && !isset($errors['or_suite_id'])) {
            $turnover = (int) $suite['turnover_minutes'];
            foreach ($sameDay as $c) {
                if ((int) $c['or_suite_id'] !== (int) $suite['id']) {
                    continue;
                }
                [$s2, $e2] = $span($c);
                // The suite needs its cleaning time after each case, before the next one starts.
                if ($start < $e2 + $turnover && $s2 < $end + $turnover) {
                    $errors['scheduled_start_time'] = "{$suite['suite_name']} is busy: {$label($c)}, plus {$turnover} min cleaning.";
                    break;
                }
            }
        }

        // People: nobody in two places at once (any role, any suite).
        $team = [];
        foreach (self::TEAM as $field => $role) {
            if (!empty($p[$field])) {
                $team[$field] = (int) $p[$field];
            }
        }
        foreach ($team as $field => $userId) {
            foreach ($sameDay as $c) {
                [$s2, $e2] = $span($c);
                if (!($start < $e2 && $s2 < $end)) {
                    continue;
                }
                foreach (self::TEAM as $otherField => $otherRole) {
                    if ((int) ($c[$otherField] ?? 0) === $userId) {
                        $who = self::userName($userId);
                        $errors[$field] = "{$who} is already the {$otherRole} for {$label($c)}.";
                        continue 3;
                    }
                }
            }
        }

        if (!empty($p['patient_id'])) {
            foreach ($sameDay as $c) {
                [$s2, $e2] = $span($c);
                if ((int) $c['patient_id'] === (int) $p['patient_id'] && $start < $e2 && $s2 < $end) {
                    $errors['patient_id'] = "The patient already has {$label($c)}.";
                    break;
                }
            }
        }

        // Block time: warnings only.
        if ($suite) {
            $specId = (int) ($p['specialization_id'] ?? 0);
            $blocks = $this->blocksOn($date, [(int) $suite['id']]);
            $overlapping = array_filter($blocks, fn($b) => $start < self::minutes($b['end_time']) && self::minutes($b['start_time']) < $end);
            $mine = array_filter($overlapping, fn($b) => $b['specialization_id'] === $specId);
            $others = array_filter($overlapping, fn($b) => $b['specialization_id'] !== $specId);
            $day = self::DAYS[(int) date('N', strtotime($date))];
            foreach ($others as $b) {
                $warnings[] = "{$suite['suite_name']} is reserved for {$b['specialization_name']} on {$day} {$b['start_time']}–{$b['end_time']}.";
            }
            if ($specId && !$mine) {
                $own = array_filter($this->blocksOn($date), fn($b) => $b['specialization_id'] === $specId);
                $spec = SpecializationService::byId([$specId])[$specId]['name'] ?? 'this specialization';
                if ($own) {
                    $where = implode('; ', array_map(fn($b) => self::suiteName($b['or_suite_id']) . " {$b['start_time']}–{$b['end_time']}", $own));
                    $warnings[] = "This is outside {$spec}'s block time on {$day} ({$where}).";
                } elseif (!$others && $this->hasBlocks($specId)) {
                    $warnings[] = "{$spec} has no block time on {$day}s.";
                }
            }
        }

        return ['errors' => $errors, 'warnings' => array_values($warnings)];
    }

    /* ---------------------------------------------------------------
     * Booking, rescheduling, cancelling
     * ------------------------------------------------------------- */

    /**
     * Book a ready surgery request. data: or_suite_id, scheduled_date,
     * scheduled_start_time, estimated_duration_minutes?, the TEAM ids
     * (surgeon defaults to the request's), anesthesia_type?,
     * team_override_reason?, acknowledge_warnings?
     */
    public function book(int $requestId, array $data, array $user): array
    {
        $db = Database::connection();
        $requests = new SurgeryRequestService();
        $r = $requests->get($requestId);
        if (!$r) {
            return ['success' => false, 'message' => 'Surgery request not found.', 'not_found' => true];
        }
        if ($r['status'] !== 'ready') {
            return ['success' => false, 'message' => $r['status'] === 'scheduled'
                ? "{$r['request_number']} is already booked." : "{$r['request_number']} isn't ready for scheduling yet — finish its readiness checklist."];
        }

        $checks = array_column($r['checklist'], 'status', 'key');
        $payload = [
            'surgery_request_id' => $requestId,
            'patient_id' => $r['patient_id'],
            'specialization_id' => $r['specialization_id'],
            'surgery_id' => $r['surgery_id'],
            'procedure_name' => $r['surgery_id'] ? '' : $r['procedure_name'],
            'laterality' => $r['laterality'],
            'preop_diagnosis' => $r['diagnosis'],
            'case_priority' => $r['priority'],
            'anesthesia_type' => $data['anesthesia_type'] ?? null ?: ($r['anesthesia_type'] ?: 'General'),
            'estimated_duration_minutes' => $data['estimated_duration_minutes'] ?? null ?: $r['estimated_duration_minutes'],
            'lead_surgeon_user_id' => $data['lead_surgeon_user_id'] ?? null ?: $r['surgeon_user_id'],
            'team_override_reason' => $data['team_override_reason'] ?? ($r['surgeon_override_reason'] ?? null),
            // What the checklist already confirmed.
            'consent_signed' => ($checks['consent'] ?? null) === 'done' ? 1 : 0,
            'preop_cleared' => in_array($checks['anesthesia_clearance'] ?? null, ['done', 'not_needed'], true) && in_array($checks['medical_clearance'] ?? null, ['done', 'not_needed'], true) ? 1 : 0,
            'blood_reserved' => ($checks['blood'] ?? null) === 'done' ? 1 : 0,
            'implants_required' => ($checks['implants'] ?? null) === 'done' ? 1 : 0,
            'notes' => $r['notes'],
            'perioperative_stage' => 'Scheduled'
        ];
        foreach (['or_suite_id', 'scheduled_date', 'scheduled_start_time', 'assistant_surgeon_user_id', 'anesthesiologist_user_id', 'scrub_nurse_user_id', 'circulating_nurse_user_id', 'acknowledge_warnings'] as $k) {
            $payload[$k] = $data[$k] ?? null;
        }

        return (new OrManagementService())->scheduleCase($payload, (int) $user['id']);
    }

    /**
     * Move a case and/or change its team. data: or_suite_id,
     * scheduled_date, scheduled_start_time, estimated_duration_minutes, the
     * TEAM ids, team_override_reason?, reason (needed when the suite,
     * date or time changes), acknowledge_warnings?
     */
    public function reschedule(int $caseId, array $data, array $user): array
    {
        $db = Database::connection();
        $case = $this->caseRow($caseId);
        if (!$case) {
            return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
        }
        if (!in_array($case['perioperative_stage'], self::MOVABLE_STAGES, true)) {
            return ['success' => false, 'message' => "{$case['case_number']} is {$case['perioperative_stage']}; it can no longer be moved."];
        }

        $new = [
            'or_suite_id' => (int) ($data['or_suite_id'] ?? $case['or_suite_id']),
            'scheduled_date' => $data['scheduled_date'] ?? $case['scheduled_date'],
            'scheduled_start_time' => substr((string) ($data['scheduled_start_time'] ?? $case['scheduled_start_time']), 0, 5),
            'estimated_duration_minutes' => (int) ($data['estimated_duration_minutes'] ?? $case['estimated_duration_minutes']),
            'specialization_id' => $case['specialization_id'],
            'patient_id' => $case['patient_id']
        ];
        foreach (array_keys(self::TEAM) as $field) {
            $new[$field] = array_key_exists($field, $data) ? ((int) $data[$field] ?: null) : ($case[$field] !== null ? (int) $case[$field] : null);
        }

        $moved = (int) $new['or_suite_id'] !== (int) $case['or_suite_id'] || $new['scheduled_date'] !== $case['scheduled_date']
            || $new['scheduled_start_time'] !== substr($case['scheduled_start_time'], 0, 5) || $new['estimated_duration_minutes'] !== (int) $case['estimated_duration_minutes'];
        $teamChanged = (bool) array_filter(array_keys(self::TEAM), fn($f) => (int) $new[$f] !== (int) $case[$f]);
        $reason = trim((string) ($data['reason'] ?? ''));

        if (!$moved && !$teamChanged) {
            return ['success' => false, 'message' => 'Nothing was changed.'];
        }
        if ($moved && $reason === '') {
            return ['success' => false, 'message' => 'Enter why the case is moved.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        // The team: doctors where needed; outside the specialization needs a reason.
        $people = (new OrManagementService())->peopleFor(array_filter(array_map(fn($f) => $new[$f], array_keys(self::TEAM))));
        $errors = [];
        if (!$new['lead_surgeon_user_id']) {
            $errors['lead_surgeon_user_id'] = 'Choose the surgeon.';
        }
        foreach (['lead_surgeon_user_id', 'assistant_surgeon_user_id', 'anesthesiologist_user_id'] as $f) {
            if ($new[$f] && !($people[$new[$f]]['is_doctor'] ?? false)) {
                $errors[$f] = 'Choose a doctor (set up under Providers).';
            }
        }
        if ($case['anesthesia_type'] !== 'Local' && !$new['anesthesiologist_user_id']) {
            $errors['anesthesiologist_user_id'] = 'Choose the anesthesiologist.';
        }
        $outside = [];
        $lead = $people[$new['lead_surgeon_user_id']] ?? null;
        if ($lead && $case['specialization_id'] && !in_array((int) $case['specialization_id'], $lead['specialization_ids'], true)) {
            $outside[] = "{$lead['name']} isn't listed under {$case['surgical_specialty']}";
        }
        $anes = $people[$new['anesthesiologist_user_id']] ?? null;
        if ($anes && !$anes['is_anesthesiologist']) {
            $outside[] = "{$anes['name']} isn't listed under Anesthesiology";
        }
        $override = trim((string) ($data['team_override_reason'] ?? '')) ?: $case['surgeon_override_reason'];
        if ($outside && !$override) {
            $errors['team_override_reason'] = implode('; ', $outside) . '. Give the reason or choose another doctor.';
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the highlighted fields.', 'errors' => $errors];
        }

        $lock = $this->lock();
        $owns = $this->begin($db);
        try {
            // Someone may have moved it on (e.g. into the room) since it was read.
            $stmt = $db->prepare("SELECT perioperative_stage FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $stageNow = (string) $stmt->fetchColumn();
            if (!in_array($stageNow, self::MOVABLE_STAGES, true)) {
                $this->rollBack($db, $owns);
                $this->unlock($lock);
                return ['success' => false, 'message' => "{$case['case_number']} is now {$stageNow}; it can no longer be moved."];
            }
            $check = $this->check($new, $caseId);
            if ($check['errors']) {
                $this->rollBack($db, $owns);
                $this->unlock($lock);
                return ['success' => false, 'message' => 'That time doesn\'t work.', 'errors' => $check['errors'], 'conflicts' => array_values($check['errors'])];
            }
            if ($moved && $check['warnings'] && empty($data['acknowledge_warnings'])) {
                $this->rollBack($db, $owns);
                $this->unlock($lock);
                return ['success' => false, 'message' => 'Check the warnings, then confirm.', 'needs_ack' => true, 'warnings' => $check['warnings']];
            }

            // Moved to another day: back to Scheduled, and the Sign-In is done again on the new day.
            $otherDay = $new['scheduled_date'] !== $case['scheduled_date'];
            if ($otherDay) {
                $db->prepare("UPDATE or_surgical_cases SET perioperative_stage = 'Scheduled' WHERE id = :id AND perioperative_stage = 'Pre-Op Holding'")->execute(['id' => $caseId]);
                $reset = $db->prepare("DELETE FROM or_case_safety_checks WHERE case_id = :id AND phase = 'sign_in'");
                $reset->execute(['id' => $caseId]);
                if ($reset->rowCount()) {
                    $this->log($caseId, 'checklist_reset', ['phase' => 'sign_in', 'label' => 'Sign-In'], 'Moved to another day', (int) $user['id']);
                }
            }

            $stmt = $db->prepare("SELECT suite_name FROM or_suites WHERE id = :id");
            $stmt->execute(['id' => $new['or_suite_id']]);
            $start = $new['scheduled_start_time'] . ':00';
            $doctorName = fn($p) => $p ? (preg_match('/^dr\.?\s/i', $p['name']) ? $p['name'] : "Dr. {$p['name']}") : null;
            $db->prepare(
                "UPDATE or_surgical_cases SET or_suite_id = :suite, or_suite_name = :suite_name, scheduled_date = :d, scheduled_start_time = :s,
                        scheduled_end_time = :e, estimated_duration_minutes = :dur,
                        lead_surgeon = :lead, lead_surgeon_user_id = :lead_id, assistant_surgeon = :asst, assistant_surgeon_user_id = :asst_id,
                        anesthesiologist = :anes, anesthesiologist_user_id = :anes_id, scrub_nurse = :scrub, scrub_nurse_user_id = :scrub_id,
                        circulating_nurse = :circ, circulating_nurse_user_id = :circ_id, surgeon_override_reason = :override, updated_at = NOW()
                 WHERE id = :id"
            )->execute([
                'suite' => $new['or_suite_id'], 'suite_name' => $stmt->fetchColumn(), 'd' => $new['scheduled_date'], 's' => $start,
                'e' => date('H:i:s', strtotime($start) + $new['estimated_duration_minutes'] * 60), 'dur' => $new['estimated_duration_minutes'],
                'lead' => $doctorName($lead), 'lead_id' => $new['lead_surgeon_user_id'],
                'asst' => $doctorName($people[$new['assistant_surgeon_user_id']] ?? null), 'asst_id' => $new['assistant_surgeon_user_id'],
                'anes' => $doctorName($anes) ?? 'Local — by the surgeon', 'anes_id' => $new['anesthesiologist_user_id'],
                'scrub' => $people[$new['scrub_nurse_user_id']]['name'] ?? null, 'scrub_id' => $new['scrub_nurse_user_id'],
                'circ' => $people[$new['circulating_nurse_user_id']]['name'] ?? null, 'circ_id' => $new['circulating_nurse_user_id'],
                'override' => $outside ? $override : null, 'id' => $caseId
            ]);

            $from = ['suite' => $case['or_suite_name'], 'date' => $case['scheduled_date'], 'start' => substr($case['scheduled_start_time'], 0, 5), 'duration' => (int) $case['estimated_duration_minutes']];
            $to = ['date' => $new['scheduled_date'], 'start' => $new['scheduled_start_time'], 'duration' => $new['estimated_duration_minutes'], 'suite' => self::suiteName($new['or_suite_id'])];
            $teamFrom = array_combine(array_keys(self::TEAM), array_map(fn($f) => $case[$f] !== null ? (int) $case[$f] : null, array_keys(self::TEAM)));
            $teamTo = array_combine(array_keys(self::TEAM), array_map(fn($f) => $new[$f], array_keys(self::TEAM)));
            $this->log($caseId, $moved ? 'rescheduled' : 'team_changed', ['from' => $from + ['team' => $teamFrom], 'to' => $to + ['team' => $teamTo],
                'warnings' => $moved ? $check['warnings'] : []], $reason ?: null, (int) $user['id']);

            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            $this->unlock($lock);
            throw $e;
        }
        $this->unlock($lock);

        $this->notify($caseId, $moved ? 'rescheduled' : 'team_changed', $reason ?: null, (int) $user['id'], $moved ? $from : null);

        return ['success' => true, 'message' => $moved ? "{$case['case_number']} moved to " . self::when($new['scheduled_date'], $new['scheduled_start_time']) . " in {$to['suite']}." : "{$case['case_number']}: team updated."];
    }

    /** Cancel a case. return_request: the surgery request goes back to "ready" (default) instead of being cancelled too. */
    public function cancel(int $caseId, string $reason, bool $returnRequest, array $user): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the case is cancelled.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$case) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
            }
            if (!in_array($case['perioperative_stage'], self::MOVABLE_STAGES, true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $case['perioperative_stage'] === 'Cancelled'
                    ? "{$case['case_number']} was already cancelled." : "{$case['case_number']} is {$case['perioperative_stage']}; it can no longer be cancelled from the schedule."];
            }

            $now = date('Y-m-d H:i:s');
            $db->prepare(
                "UPDATE or_surgical_cases SET perioperative_stage = 'Cancelled', cancellation_reason = :r, cancelled_at = :now, cancelled_by = :u, updated_at = NOW() WHERE id = :id"
            )->execute(['r' => mb_substr($reason, 0, 255), 'now' => $now, 'u' => (int) $user['id'], 'id' => $caseId]);
            $db->prepare("UPDATE or_suites SET current_case_id = NULL WHERE current_case_id = :id")->execute(['id' => $caseId]);
            $this->releaseRequest($case, $returnRequest, $reason, (int) $user['id']);
            $this->log($caseId, 'cancelled', ['request' => $case['surgery_request_id'] ? ($returnRequest ? 'back to ready' : 'cancelled') : null], $reason, (int) $user['id']);

            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        $this->notify($caseId, 'cancelled', $reason, (int) $user['id']);

        return ['success' => true, 'message' => "{$case['case_number']} cancelled." . ($case['surgery_request_id']
            ? ($returnRequest ? ' The surgery request is back on the ready list to be booked again.' : ' The surgery request is cancelled too.') : '')];
    }

    /** A cancelled case's request: back to ready (or_case_id cleared), or cancelled. Inside the caller's transaction. */
    public function releaseRequest(array $case, bool $returnRequest, string $reason, int $userId): void
    {
        if (!$case['surgery_request_id']) {
            return;
        }
        $db = Database::connection();
        if ($returnRequest) {
            $db->prepare("UPDATE surgery_requests SET status = 'ready', or_case_id = NULL, revision = revision + 1 WHERE id = :id AND status = 'scheduled'")
                ->execute(['id' => $case['surgery_request_id']]);
        } else {
            $db->prepare(
                "UPDATE surgery_requests SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = :u, cancel_reason = :r, revision = revision + 1
                 WHERE id = :id AND status = 'scheduled'"
            )->execute(['u' => $userId, 'r' => mb_substr('OR case cancelled: ' . $reason, 0, 500), 'id' => $case['surgery_request_id']]);
        }
    }

    /** A case with its history, for the schedule's case dialog. */
    public function caseDetail(int $caseId): ?array
    {
        $case = $this->caseRow($caseId);
        if (!$case) {
            return null;
        }

        $stmt = Database::connection()->prepare(
            "SELECT h.*, " . self::userNameSql('h.user_id') . " AS user_name FROM or_case_history h WHERE h.case_id = :id ORDER BY h.created_at DESC, h.id DESC"
        );
        $stmt->execute(['id' => $caseId]);
        $history = array_map(fn($h) => [
            'action' => $h['action'], 'details' => $h['details'] ? (json_decode($h['details'], true) ?: []) : [], 'reason' => $h['reason'],
            'user_name' => $h['user_name'], 'created_at' => $h['created_at']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $request = $case['surgery_request_id'] ? (new SurgeryRequestService())->get((int) $case['surgery_request_id']) : null;

        return [
            'case' => $case + ['can_move' => in_array($case['perioperative_stage'], self::MOVABLE_STAGES, true)],
            'request' => $request ? ['id' => $request['id'], 'request_number' => $request['request_number'], 'readiness_done' => $request['readiness_done'],
                'readiness_total' => $request['readiness_total'], 'diagnosis' => $request['diagnosis']] : null,
            'history' => $history
        ];
    }

    /* ---------------------------------------------------------------
     * Block times
     * ------------------------------------------------------------- */

    public function blocks(): array
    {
        $rows = Database::connection()->query(
            "SELECT b.*, s.name AS specialization_name, o.suite_name, o.suite_code
             FROM or_block_times b JOIN specializations s ON s.id = b.specialization_id JOIN or_suites o ON o.id = b.or_suite_id
             WHERE b.is_active = 1 ORDER BY o.suite_code, b.day_of_week, b.start_time"
        )->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($b) => [
            'id' => (int) $b['id'], 'or_suite_id' => (int) $b['or_suite_id'], 'suite_name' => $b['suite_name'], 'suite_code' => $b['suite_code'],
            'specialization_id' => (int) $b['specialization_id'], 'specialization_name' => $b['specialization_name'],
            'day_of_week' => (int) $b['day_of_week'], 'day_name' => self::DAYS[(int) $b['day_of_week']] ?? '',
            'start_time' => substr($b['start_time'], 0, 5), 'end_time' => substr($b['end_time'], 0, 5),
            'effective_from' => $b['effective_from'], 'effective_to' => $b['effective_to'], 'notes' => $b['notes']
        ], $rows);
    }

    /** data: or_suite_id, specialization_id, day_of_week, start_time, end_time, effective_from?, effective_to?, notes? */
    public function saveBlock(?int $id, array $data, int $userId): array
    {
        $db = Database::connection();
        $errors = [];
        $suiteId = (int) ($data['or_suite_id'] ?? 0);
        $specId = (int) ($data['specialization_id'] ?? 0);
        $dow = (int) ($data['day_of_week'] ?? 0);
        $start = self::minutes($data['start_time'] ?? null);
        $end = self::minutes($data['end_time'] ?? null);
        $from = trim((string) ($data['effective_from'] ?? '')) === '' ? null : self::date($data['effective_from']);
        $to = trim((string) ($data['effective_to'] ?? '')) === '' ? null : self::date($data['effective_to']);

        $stmt = $db->prepare("SELECT id FROM or_suites WHERE id = :id AND is_active = 1");
        $stmt->execute(['id' => $suiteId]);
        if (!$stmt->fetchColumn()) {
            $errors['or_suite_id'] = 'Choose the suite.';
        }
        $spec = SpecializationService::byId([$specId])[$specId] ?? null;
        if (!$spec || !(int) $spec['is_active']) {
            $errors['specialization_id'] = 'Choose the specialization.';
        }
        if ($dow < 1 || $dow > 7) {
            $errors['day_of_week'] = 'Choose the day.';
        }
        if ($start === null || $end === null || $end <= $start) {
            $errors['end_time'] = 'The block must end after it starts.';
        }
        if (trim((string) ($data['effective_from'] ?? '')) !== '' && !$from) {
            $errors['effective_from'] = 'Enter a valid date.';
        }
        if (trim((string) ($data['effective_to'] ?? '')) !== '' && !$to) {
            $errors['effective_to'] = 'Enter a valid date.';
        }
        if ($from && $to && $to < $from) {
            $errors['effective_to'] = 'The end date is before the start date.';
        }
        if (!$errors) {
            // Two blocks in the same suite can't overlap on the same day.
            $stmt = $db->prepare(
                "SELECT b.start_time, b.end_time, s.name FROM or_block_times b JOIN specializations s ON s.id = b.specialization_id
                 WHERE b.is_active = 1 AND b.or_suite_id = :suite AND b.day_of_week = :dow" . ($id ? " AND b.id <> " . (int) $id : "") . "
                   AND b.start_time < :e AND b.end_time > :s
                   AND (b.effective_to IS NULL OR :f IS NULL OR b.effective_to >= :f2) AND (b.effective_from IS NULL OR :t IS NULL OR b.effective_from <= :t2)"
            );
            $stmt->execute(['suite' => $suiteId, 'dow' => $dow, 'e' => self::time($end), 's' => self::time($start), 'f' => $from, 'f2' => $from, 't' => $to, 't2' => $to]);
            if ($clash = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $errors['start_time'] = "It overlaps {$clash['name']}'s block " . substr($clash['start_time'], 0, 5) . '–' . substr($clash['end_time'], 0, 5) . '.';
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the highlighted fields.', 'errors' => $errors];
        }

        $values = ['suite' => $suiteId, 'spec' => $specId, 'dow' => $dow, 's' => self::time($start), 'e' => self::time($end), 'f' => $from, 't' => $to,
            'n' => ($n = trim((string) ($data['notes'] ?? ''))) === '' ? null : mb_substr($n, 0, 255), 'now' => date('Y-m-d H:i:s'), 'u' => $userId];
        if ($id) {
            $stmt = $db->prepare(
                "UPDATE or_block_times SET or_suite_id = :suite, specialization_id = :spec, day_of_week = :dow, start_time = :s, end_time = :e,
                        effective_from = :f, effective_to = :t, notes = :n, updated_at = :now, updated_by = :u WHERE id = :id AND is_active = 1"
            );
            $stmt->execute($values + ['id' => $id]);
            if (!$stmt->rowCount()) {
                return ['success' => false, 'message' => 'Block time not found.', 'not_found' => true];
            }
            return ['success' => true, 'message' => 'Block time updated.'];
        }

        $db->prepare(
            "INSERT INTO or_block_times (or_suite_id, specialization_id, day_of_week, start_time, end_time, effective_from, effective_to, notes, created_at, created_by)
             VALUES (:suite, :spec, :dow, :s, :e, :f, :t, :n, :now, :u)"
        )->execute($values);

        return ['success' => true, 'message' => "Block time added: {$spec['name']}, " . self::DAYS[$dow] . 's ' . self::time($start, false) . '–' . self::time($end, false) . '.',
            'data' => ['id' => (int) $db->lastInsertId()]];
    }

    public function removeBlock(int $id, int $userId): array
    {
        $stmt = Database::connection()->prepare("UPDATE or_block_times SET is_active = 0, updated_at = :now, updated_by = :u WHERE id = :id AND is_active = 1");
        $stmt->execute(['now' => date('Y-m-d H:i:s'), 'u' => $userId, 'id' => $id]);

        return $stmt->rowCount()
            ? ['success' => true, 'message' => 'Block time removed. Cases already booked are not affected.']
            : ['success' => false, 'message' => 'Block time not found.', 'not_found' => true];
    }

    /** Cleaning time kept free after each case in a suite. */
    public function setTurnover(int $suiteId, int $minutes): array
    {
        if ($minutes < 0 || $minutes > 240) {
            return ['success' => false, 'message' => 'Enter the cleaning time in minutes (0 to 240).', 'errors' => ['turnover_minutes' => 'Enter 0 to 240 minutes.']];
        }
        $stmt = Database::connection()->prepare("UPDATE or_suites SET turnover_minutes = :m WHERE id = :id");
        $stmt->execute(['m' => $minutes, 'id' => $suiteId]);

        return ['success' => true, 'message' => "Cleaning time set to {$minutes} minutes."];
    }

    /* ---------------------------------------------------------------
     * History and notices
     * ------------------------------------------------------------- */

    public function log(int $caseId, string $action, array $details, ?string $reason, ?int $userId): void
    {
        Database::connection()->prepare(
            "INSERT INTO or_case_history (case_id, action, details, reason, user_id, created_at) VALUES (:c, :a, :d, :r, :u, :now)"
        )->execute(['c' => $caseId, 'a' => $action, 'd' => $details ? json_encode($details) : null, 'r' => $reason !== null ? mb_substr($reason, 0, 500) : null,
            'u' => $userId, 'now' => date('Y-m-d H:i:s')]);
    }

    /**
     * Messages to the team (one conversation) and to the patient if they
     * have a portal account (another). Best effort: a failed notice never
     * undoes the booking.
     */
    public function notify(int $caseId, string $action, ?string $reason, int $senderId, ?array $from = null): array
    {
        try {
            $case = $this->caseRow($caseId);
            if (!$case) {
                return [];
            }
            $messaging = new MessagingService();
            $when = self::when($case['scheduled_date'], $case['scheduled_start_time']);
            $what = $case['procedure_name'] . ($case['laterality'] ? " ({$case['laterality']})" : '');
            $sent = [];

            $team = array_values(array_unique(array_filter(array_map(fn($f) => (int) $case[$f], array_keys(self::TEAM)), fn($id) => $id && $id !== $senderId)));
            if ($team) {
                $body = match ($action) {
                    'booked' => "Surgery booked: {$case['case_number']} — {$what} for {$case['patient_name']}, {$when} in {$case['or_suite_name']}.",
                    'rescheduled' => "Surgery moved: {$case['case_number']} — {$what} for {$case['patient_name']} is now {$when} in {$case['or_suite_name']}"
                        . ($from ? " (was " . self::when($from['date'], $from['start']) . " in {$from['suite']})" : '') . ($reason ? ". Reason: {$reason}" : '') . '.',
                    'team_changed' => "Surgical team updated: {$case['case_number']} — {$what} for {$case['patient_name']}, {$when} in {$case['or_suite_name']}.",
                    'cancelled' => "Surgery cancelled: {$case['case_number']} — {$what} for {$case['patient_name']} ({$when})" . ($reason ? ". Reason: {$reason}" : '') . '.',
                    default => "{$case['case_number']} updated."
                };
                $body .= "\nTeam: " . implode(', ', array_filter([$case['lead_surgeon'], $case['assistant_surgeon'], $case['anesthesiologist'], $case['scrub_nurse'], $case['circulating_nurse']]));
                $conv = $messaging->createConversation($senderId, $team, "OR {$case['case_number']}");
                if (!empty($conv['success'])) {
                    $messaging->sendMessage($conv['data']['conversation_id'], $senderId, $body, ['type_id' => 1, 'status_id' => 1, 'patient_id' => $case['patient_id']]);
                    $sent[] = 'team';
                }
            }

            $patientUser = null;
            if ($case['patient_id']) {
                $stmt = Database::connection()->prepare("SELECT user_id FROM patients WHERE id = :id AND user_id IS NOT NULL");
                $stmt->execute(['id' => $case['patient_id']]);
                $patientUser = (int) $stmt->fetchColumn() ?: null;
            }
            if ($patientUser && $patientUser !== $senderId) {
                $body = match ($action) {
                    'booked' => "Your surgery ({$what}) is scheduled for {$when}. Please follow your doctor's instructions, including when to stop eating and drinking, and arrive early.",
                    'rescheduled' => "Your surgery ({$what}) has been moved to {$when}." . ($reason ? " Reason: {$reason}." : '') . ' Please contact us if this time does not work for you.',
                    'cancelled' => "Your surgery ({$what}) scheduled for {$when} has been cancelled." . ($reason ? " Reason: {$reason}." : '') . ' Your doctor will contact you about the next steps.',
                    default => null
                };
                if ($body) {
                    $conv = $messaging->createConversation($senderId, [$patientUser], 'Your surgery');
                    if (!empty($conv['success'])) {
                        $messaging->sendMessage($conv['data']['conversation_id'], $senderId, $body, ['type_id' => 1, 'status_id' => 1, 'patient_id' => $case['patient_id']]);
                        $sent[] = 'patient';
                    }
                }
            }

            return $sent;
        } catch (Throwable $e) {
            error_log("OR notice for case {$caseId} failed: " . $e->getMessage());
            return [];
        }
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function hasBlocks(int $specId): bool
    {
        $stmt = Database::connection()->prepare("SELECT 1 FROM or_block_times WHERE is_active = 1 AND specialization_id = :s LIMIT 1");
        $stmt->execute(['s' => $specId]);
        return (bool) $stmt->fetchColumn();
    }

    private function caseRow(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT c.*, " . self::userNameSql('c.cancelled_by') . " AS cancelled_by_name FROM or_surgical_cases c WHERE c.id = :id"
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** A named lock so two bookings can't take the same slot at once. */
    public function lock(): bool
    {
        return (bool) Database::connection()->query("SELECT GET_LOCK('or_booking', 10)")->fetchColumn();
    }

    public function unlock(bool $held): void
    {
        if ($held) {
            Database::connection()->query("SELECT RELEASE_LOCK('or_booking')")->fetchColumn();
        }
    }

    public static function minutes($time): ?int
    {
        if (!is_string($time) || !preg_match('/^(\d{1,2}):(\d{2})(:\d{2})?$/', trim($time), $m) || (int) $m[1] > 24 || (int) $m[2] > 59) {
            return null;
        }
        return (int) $m[1] * 60 + (int) $m[2];
    }

    private static function time(int $minutes, bool $seconds = true): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60) . ($seconds ? ':00' : '');
    }

    private static function date($value): ?string
    {
        $value = trim((string) $value);
        $d = \DateTime::createFromFormat('Y-m-d', $value);
        return $d && $d->format('Y-m-d') === $value ? $value : null;
    }

    public static function when(string $date, string $time): string
    {
        return date('D, M j, Y', strtotime($date)) . ' at ' . date('g:i A', strtotime($time));
    }

    private static function suiteName(int $id): string
    {
        $stmt = Database::connection()->prepare("SELECT suite_name FROM or_suites WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return (string) $stmt->fetchColumn();
    }

    private static function userName(int $userId): string
    {
        $stmt = Database::connection()->query("SELECT " . self::userNameSql((string) $userId) . " AS n");
        return (string) $stmt->fetchColumn() ?: "User {$userId}";
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT or_scheduling_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT or_scheduling_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT or_scheduling_step');
    }
}
