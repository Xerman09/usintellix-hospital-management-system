<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\NursingStaff\Services\NursingShiftService;
use App\Modules\NursingStaff\Services\NursingStaffService;
use PDO;

/**
 * Medicine administration record (MAR). Dose times come from the verified orders; a dose
 * is upcoming, due (from an hour before its time), late (over an hour after, 15 minutes
 * for STAT), or recorded as given / held / refused. Given doses carry the time and the
 * nurse's initials; high-alert and controlled medicines also need a second nurse.
 * Late doses alert the patient's nurse (runOverdue, from the bell poll and cron).
 *
 * Pain medicine (as needed, for pain): the pain score before giving is required, and a
 * recheck is due 30-60 minutes after (reminder at 30, urgent at 60). Dangerous drugs
 * (RA 9165, e.g. morphine) also go into the numbered DD register, with any amount wasted.
 */
class MarService
{
    public const GIVERS = ['admin', 'nurse', 'charge_nurse'];
    public const WITNESSES = ['admin', 'nurse', 'charge_nurse', 'doctor'];
    /** A dose can be given from this many minutes before its time, and is late this many minutes after it. */
    public const EARLY_MIN = 60;
    public const LATE_MIN = 60;
    public const STAT_LATE_MIN = 15;
    /** A dose never recorded stays on the current shift's MAR (and can still be recorded) this long. */
    public const CARRY_HOURS = 24;
    /** Late doses older than this no longer raise a new alert. */
    public const ALERT_LOOKBACK_HOURS = 12;
    /** A dose can be held this far ahead (e.g. the doctor says hold tonight's dose). */
    public const HOLD_AHEAD_HOURS = 12;
    public const THROTTLE_SECONDS = 60;
    /** Pain recheck: due this many minutes after the dose; overdue after RECHECK_LATE_MIN. */
    public const RECHECK_MIN = 30;
    public const RECHECK_LATE_MIN = 60;
    private const PAIN_WORDS = '/pain|ache|sakit|kirot/i';
    public const HOLD_REASONS = [
        'Nil by mouth (NPO)', 'Patient off the ward', 'Vital signs outside the limit (e.g. low BP or pulse)',
        "Held on the doctor's instruction", 'Medicine not available', 'Patient asleep / not able to take it', 'Other',
    ];
    private const ACTIVE = "('Admitted', 'Pending Discharge')";

    // ------------------------------------------------------------------
    // The MAR of one patient, one shift
    // ------------------------------------------------------------------

    /** filters: date?, shift_id? (default: the shift running now) */
    public function forAdmission(int $admissionId, array $filters, array $actor): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.patient_name, a.patient_mrn, a.patient_age, a.gender, a.status, a.ward_id,
                    w.ward_name, b.room_number, b.bed_number
             FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id"
        );
        $stmt->execute(['id' => $admissionId]);
        $a = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$a) {
            return null;
        }
        $shifts = new NursingShiftService();
        $cur = $shifts->current();
        $date = $this->validDate($filters['date'] ?? null);
        $shift = null;
        if ($date && (int) ($filters['shift_id'] ?? 0)) {
            foreach ($shifts->shifts() as $s) {
                if ($s['id'] === (int) $filters['shift_id']) {
                    $shift = $s;
                }
            }
        }
        if (!$shift) {
            [$date, $shift] = [$cur['date'], $cur['shift']];
        }
        [$from, $to] = $this->window($date, $shift);
        $now = self::ts($this->dbNow());
        $isCurrent = $date === $cur['date'] && $shift['id'] === (int) $cur['shift']['id'];
        $active = in_array($a['status'], ['Admitted', 'Pending Discharge'], true);

        $rows = $this->build($db, [$admissionId], $from, $to, $now, $isCurrent && $active ? $now - self::CARRY_HOURS * 3600 : null)[$admissionId] ?? [];
        $prev = $shifts->step($date, (int) $shift['id'], -1);
        $next = $shifts->step($date, (int) $shift['id'], 1);
        $nurse = $db->prepare("SELECT " . self::nameSql('nurse_user_id') . " FROM nurse_patient_assignments WHERE admission_id = :a AND shift_date = :d AND shift_id = :s AND nurse_user_id IS NOT NULL");
        $nurse->execute(['a' => $admissionId, 'd' => $date, 's' => $shift['id']]);

        return [
            'admission' => ['id' => (int) $a['id'], 'patient_id' => $a['patient_id'] !== null ? (int) $a['patient_id'] : null, 'patient_name' => $a['patient_name'],
                'patient_mrn' => $a['patient_mrn'], 'age' => $a['patient_age'], 'sex' => $a['gender'], 'ward' => $a['ward_name'],
                'room' => $a['room_number'], 'bed' => $a['bed_number'], 'active' => $active],
            'allergies' => $this->allergies((int) $a['patient_id']),
            'shift' => ['date' => $date, 'id' => (int) $shift['id'], 'name' => $shift['name'], 'start' => $shift['start'], 'end' => $shift['end'],
                'start_at' => gmdate('Y-m-d H:i:s', $from), 'end_at' => gmdate('Y-m-d H:i:s', $to), 'is_current' => $isCurrent,
                'is_future' => $from > $now,
                'prev' => $prev ? ['date' => $prev['date'], 'id' => (int) $prev['shift']['id']] : null,
                'next' => $next ? ['date' => $next['date'], 'id' => (int) $next['shift']['id']] : null,
                'nurse_name' => $nurse->fetchColumn() ?: null],
            'rows' => $rows,
            'counts' => $this->counts($rows),
            'now' => gmdate('Y-m-d H:i:s', $now),
            'can_give' => $active && $this->canGive($actor, $admissionId),
            'hold_reasons' => self::HOLD_REASONS,
            'rules' => ['early_min' => self::EARLY_MIN, 'late_min' => self::LATE_MIN, 'stat_late_min' => self::STAT_LATE_MIN],
        ];
    }

    /** The current shift's medicine round for a ward (or the patients assigned to me): what is late, due, coming. */
    public function board(array $filters, array $actor): array
    {
        $db = Database::connection();
        $wards = $db->query("SELECT id, ward_code, ward_name FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC);
        $myWards = (new NursingStaffService())->wardIds((int) ($actor['id'] ?? 0));
        $cur = (new NursingShiftService())->current();
        $shift = $cur['shift'];
        $mineOnly = ($filters['ward_id'] ?? '') === 'mine';
        $wardId = $mineOnly ? 0 : ((int) ($filters['ward_id'] ?? 0) ?: ($myWards[0] ?? (int) ($wards[0]['id'] ?? 0)));

        if ($mineOnly) {
            $stmt = $db->prepare(
                "SELECT a.id FROM nurse_patient_assignments x JOIN inpatient_admissions a ON a.id = x.admission_id AND a.status IN " . self::ACTIVE . "
                 JOIN hospital_beds b ON b.id = a.bed_id
                 WHERE x.shift_date = :d AND x.shift_id = :s AND x.nurse_user_id = :me ORDER BY a.ward_id, b.room_number, b.bed_number"
            );
            $stmt->execute(['d' => $cur['date'], 's' => $shift['id'], 'me' => (int) ($actor['id'] ?? 0)]);
        } else {
            $stmt = $db->prepare(
                "SELECT a.id FROM inpatient_admissions a JOIN hospital_beds b ON b.id = a.bed_id
                 WHERE a.ward_id = :w AND a.status IN " . self::ACTIVE . " ORDER BY b.room_number, b.bed_number"
            );
            $stmt->execute(['w' => $wardId]);
        }
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        [$from, $to] = $this->window($cur['date'], $shift);
        $now = self::ts($this->dbNow());
        $built = $ids ? $this->build($db, $ids, $from, $to, $now, $now - self::CARRY_HOURS * 3600) : [];
        $patients = [];
        if ($ids) {
            $in = implode(',', $ids);
            $info = $db->prepare(
                "SELECT a.id, a.patient_id, a.patient_name, a.patient_mrn, w.ward_name, b.room_number, b.bed_number,
                        (SELECT " . self::nameSql('x.nurse_user_id') . " FROM nurse_patient_assignments x
                          WHERE x.admission_id = a.id AND x.shift_date = :d AND x.shift_id = :s LIMIT 1) AS nurse_name,
                        (SELECT x.nurse_user_id FROM nurse_patient_assignments x WHERE x.admission_id = a.id AND x.shift_date = :d2 AND x.shift_id = :s2 LIMIT 1) AS nurse_id
                 FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id IN ({$in})"
            );
            $info->execute(['d' => $cur['date'], 's' => $shift['id'], 'd2' => $cur['date'], 's2' => $shift['id']]);
            $byId = [];
            foreach ($info->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $byId[(int) $r['id']] = $r;
            }
            foreach ($ids as $id) {
                $r = $byId[$id];
                $rows = $built[$id] ?? [];
                $next = null;
                foreach ($rows as $row) {
                    foreach ($row['slots'] as $s) {
                        if (in_array($s['state'], ['due', 'upcoming'], true) && ($next === null || $s['at'] < $next)) {
                            $next = $s['at'];
                        }
                    }
                }
                $patients[] = [
                    'admission_id' => $id, 'patient_id' => $r['patient_id'] !== null ? (int) $r['patient_id'] : null,
                    'patient_name' => $r['patient_name'], 'patient_mrn' => $r['patient_mrn'], 'ward' => $r['ward_name'],
                    'room' => $r['room_number'], 'bed' => $r['bed_number'], 'nurse_name' => $r['nurse_name'] ?: null,
                    'is_mine' => (int) $r['nurse_id'] === (int) ($actor['id'] ?? 0),
                    'counts' => $this->counts($rows), 'next_due_at' => $next,
                    'late_high_alert' => (bool) array_filter($rows, fn($row) => $row['order']['needs_witness']
                        && array_filter($row['slots'], fn($s) => $s['state'] === 'late')),
                ];
            }
        }
        $sum = fn(string $k) => array_sum(array_map(fn($p) => $p['counts'][$k], $patients));
        return [
            'ward_id' => $mineOnly ? 'mine' : $wardId,
            'wards' => array_map(fn($w) => ['id' => (int) $w['id'], 'code' => $w['ward_code'], 'name' => $w['ward_name'], 'mine' => in_array((int) $w['id'], $myWards, true)], $wards),
            'shift' => ['date' => $cur['date'], 'id' => (int) $shift['id'], 'name' => $shift['name'], 'start' => $shift['start'], 'end' => $shift['end'],
                'start_at' => gmdate('Y-m-d H:i:s', $from), 'end_at' => gmdate('Y-m-d H:i:s', $to)],
            'patients' => $patients,
            'totals' => ['late' => $sum('late'), 'due' => $sum('due'), 'upcoming' => $sum('upcoming'), 'given' => $sum('given'), 'pending' => $sum('pending')],
            'now' => gmdate('Y-m-d H:i:s', $now),
        ];
    }

    // ------------------------------------------------------------------
    // Record a dose
    // ------------------------------------------------------------------

    /**
     * data: order_id, scheduled_at (a dose time; not for as-needed), given_at? (default now), reason (as-needed: what for),
     *       note?, witness_username + witness_password (high-alert / controlled medicines)
     */
    public function give(array $data, array $actor): array
    {
        $db = Database::connection();
        $ctx = $this->context($data, $actor);
        if (isset($ctx['error'])) {
            return $ctx['error'];
        }
        ['order' => $o, 'now' => $now, 'slot' => $slot] = $ctx;
        $errors = [];

        $givenAt = $now;
        if (!empty($data['given_at'])) {
            $g = $this->dt($data['given_at']);
            if ($g === null) {
                $errors['given_at'] = 'Invalid time.';
            } elseif ($g > $now + 300) {
                $errors['given_at'] = 'The time given can\'t be in the future.';
            } elseif ($g < $now - 12 * 3600) {
                $errors['given_at'] = 'The time given can\'t be more than 12 hours ago.';
            } elseif ($g < self::ts($o['ordered_at'])) {
                $errors['given_at'] = 'The time given is before the order was written.';
            } elseif ($slot !== null && $g < $slot - self::EARLY_MIN * 60) {
                $errors['given_at'] = 'That is more than an hour before the dose time.';
            } else {
                $givenAt = $g;
            }
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($o['order_type'] === 'prn') {
            if ($reason === '') {
                $errors['reason'] = 'Say why it is given (e.g. pain score 6).';
            } elseif (!$errors) {
                $limit = $this->prnLimit($db, $o, $givenAt);
                if ($limit) {
                    $errors['given_at'] = $limit;
                }
            }
        }
        $note = trim((string) ($data['note'] ?? ''));
        if (mb_strlen($note) > 500 || mb_strlen($reason) > 255) {
            $errors['note'] = 'Keep the note under 500 characters.';
        }
        $pain = null;
        if ($this->isPain($o)) {
            $p = self::score($data['pain_score'] ?? null);
            if ($p === null) {
                $errors['pain_score'] = 'Score the pain before giving it (0 = no pain, 10 = worst).';
            } else {
                $pain = $p;
            }
        }
        $waste = null;
        if ($this->isDD($o) && ($data['wasted_amount'] ?? '') !== '' && $data['wasted_amount'] !== null) {
            $amt = filter_var($data['wasted_amount'], FILTER_VALIDATE_FLOAT);
            $unit = (string) ($data['wasted_unit'] ?? '') ?: $o['dose_unit'];
            $how = trim((string) ($data['waste_note'] ?? ''));
            if ($amt === false || $amt < 0 || $amt > 100000) {
                $errors['wasted_amount'] = 'Amount wasted must be a number (0 or more).';
            } elseif (!in_array($unit, MedOrderService::UNITS, true)) {
                $errors['wasted_unit'] = 'Choose the unit of the amount wasted.';
            } elseif ($amt > 0 && $how === '') {
                $errors['waste_note'] = 'Say how the rest was disposed of (e.g. discarded in the sharps bin).';
            } elseif ($amt > 0) {
                $waste = ['amount' => $amt, 'unit' => $unit, 'note' => mb_substr($how, 0, 255)];
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        // The order says e.g. "pain 4 or more": a lower score needs the nurse to confirm.
        $min = $this->painThreshold($o);
        if ($pain !== null && $min !== null && $pain < $min && empty($data['confirm_low'])) {
            return ['success' => false, 'needs_confirm' => true,
                'message' => "The order is for {$o['prn_indication']}, and the pain score is {$pain}. Give it anyway?"];
        }

        // Second nurse, checked before anything is written (a wrong password counts towards their lockout).
        $witness = null;
        if ($this->needsWitness($o)) {
            $witness = $this->witness($data, (int) $actor['id']);
            if (isset($witness['error'])) {
                return $witness['error'];
            }
        }

        $id = $this->insert($db, $o, $slot, 'given', $actor, [
            'given_at' => gmdate('Y-m-d H:i:s', $givenAt), 'reason' => $reason, 'note' => $note, 'witness' => $witness,
            'pain_before' => $pain, 'recheck_due_at' => $pain !== null ? gmdate('Y-m-d H:i:s', $givenAt + self::RECHECK_MIN * 60) : null,
            'waste' => $waste,
        ]);
        if (is_array($id)) {
            return $id;
        }
        $this->clearAlerts($o, $slot, (int) $actor['id'], 'Given');
        $rec = $this->record($id);
        $msg = $witness ? "Recorded as given, checked by {$witness['name']}." : 'Recorded as given.';
        if ($rec['recheck_due_at']) {
            $msg .= ' Recheck the pain at ' . gmdate('g:i A', self::ts($rec['recheck_due_at'])) . '.';
        }
        if ($rec['dd_entry_no']) {
            $msg .= " DD register entry #{$rec['dd_entry_no']}.";
        }
        return ['success' => true, 'message' => $msg, 'data' => $rec];
    }

    /** Held or refused. data: order_id, scheduled_at, reason, note? */
    public function skip(string $status, array $data, array $actor): array
    {
        if (!in_array($status, ['held', 'refused'], true)) {
            return ['success' => false, 'message' => 'Unknown status.'];
        }
        $db = Database::connection();
        $ctx = $this->context($data + ['_skip' => $status], $actor);
        if (isset($ctx['error'])) {
            return $ctx['error'];
        }
        ['order' => $o, 'slot' => $slot] = $ctx;
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            return ['success' => false, 'message' => $status === 'held' ? 'Say why the dose is held.' : 'Say what the patient said or why they refused.',
                'errors' => ['reason' => 'Required.']];
        }
        $note = trim((string) ($data['note'] ?? ''));
        $id = $this->insert($db, $o, $slot, $status, $actor, ['reason' => mb_substr($reason, 0, 255), 'note' => $note]);
        if (is_array($id)) {
            return $id;
        }
        $this->clearAlerts($o, $slot, (int) $actor['id'], $status === 'held' ? 'Held' : 'Refused');
        $rec = $this->record($id);
        if ($o['ordered_by']) {
            // The doctor who ordered it should know a dose was not given.
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'info',
                'title' => ($status === 'held' ? 'Dose held: ' : 'Dose refused: ') . "{$o['drug_name']} due " . gmdate('H:i', $slot) . " — {$o['patient_name']}",
                'body' => "Reason: {$reason}" . ($note !== '' ? " — {$note}" : '') . " (recorded by {$rec['recorded_by_name']})",
                'patient_id' => $o['patient_id'], 'link' => ['patient_id' => $o['patient_id']],
                'targets' => [['user' => (int) $o['ordered_by']]], 'source_type' => 'inpatient_med_administrations', 'source_id' => $id,
                'dedupe_key' => "marskip:{$id}",
            ], (int) $actor['id']);
        }
        return ['success' => true, 'message' => $status === 'held' ? 'Recorded as held; the doctor was told.' : 'Recorded as refused; the doctor was told.', 'data' => $rec];
    }

    /** Entered in error: the entry stays (struck through) and the dose is due again. */
    public function void(int $id, string $reason, array $actor): array
    {
        $db = Database::connection();
        $rec = $this->record($id);
        if (!$rec) {
            return ['success' => false, 'message' => 'Entry not found.', 'not_found' => true];
        }
        if ($rec['voided']) {
            return ['success' => false, 'message' => 'Already voided.'];
        }
        if ($rec['recorded_by'] !== (int) ($actor['id'] ?? 0) && !in_array($actor['role'] ?? '', ['admin', 'charge_nurse'], true)) {
            return ['success' => false, 'message' => 'Only the nurse who recorded it, a charge nurse or an admin can void it.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why (e.g. wrong patient, wrong time).', 'errors' => ['reason' => 'Required.']];
        }
        $stmt = $db->prepare("UPDATE inpatient_med_administrations SET voided_at = NOW(), voided_by = :by, void_reason = :r, slot_at = NULL WHERE id = :id AND voided_at IS NULL");
        $stmt->execute(['by' => (int) $actor['id'], 'r' => mb_substr($reason, 0, 255), 'id' => $id]);
        $db->prepare("UPDATE dd_register SET voided_at = NOW(), voided_by_name = :n, void_reason = :r WHERE administration_id = :id AND voided_at IS NULL")
            ->execute(['n' => $this->name((int) $actor['id']), 'r' => mb_substr($reason, 0, 255), 'id' => $id]);
        foreach (["marskip:{$id}", "painrecheck:{$id}", "painlate:{$id}"] as $key) {
            AlertService::resolveByKey($key, (int) $actor['id'], 'Entry voided');
        }
        return ['success' => true, 'message' => 'Entry voided.', 'data' => $this->record($id)];
    }

    /** Pain score 30-60 minutes after an as-needed pain dose. data: pain_score, rechecked_at?, note? */
    public function recheck(int $id, array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::GIVERS, true)) {
            return ['success' => false, 'message' => 'The pain recheck is recorded by a nurse.', 'forbidden' => true];
        }
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.*, o.drug_name, o.ordered_by, a.patient_name FROM inpatient_med_administrations r
             JOIN inpatient_med_orders o ON o.id = r.order_id JOIN inpatient_admissions a ON a.id = r.admission_id WHERE r.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            return ['success' => false, 'message' => 'Entry not found.', 'not_found' => true];
        }
        if ($r['voided_at'] !== null || $r['status'] !== 'given' || $r['recheck_due_at'] === null) {
            return ['success' => false, 'message' => 'This dose has no pain recheck.'];
        }
        if ($r['pain_after'] !== null) {
            return ['success' => false, 'message' => 'The pain was already rechecked.'];
        }
        if (!$this->canGive($actor, (int) $r['admission_id'])) {
            return ['success' => false, 'message' => 'Only a nurse of this ward (or the patient\'s nurse this shift) can record it.', 'forbidden' => true];
        }
        $score = self::score($data['pain_score'] ?? null);
        if ($score === null) {
            return ['success' => false, 'message' => 'Score the pain now (0 = no pain, 10 = worst).', 'errors' => ['pain_score' => 'Required.']];
        }
        $now = self::ts($this->dbNow());
        $at = $now;
        if (!empty($data['rechecked_at'])) {
            $at = $this->dt($data['rechecked_at']);
            if ($at === null || $at > $now + 300 || $at < self::ts($r['given_at'])) {
                return ['success' => false, 'message' => 'The recheck time must be after the dose and not in the future.', 'errors' => ['rechecked_at' => 'Invalid time.']];
            }
        }
        $note = trim((string) ($data['note'] ?? ''));
        $upd = $db->prepare(
            "UPDATE inpatient_med_administrations SET pain_after = :p, pain_after_at = :at, pain_after_by = :by, pain_after_note = :n
             WHERE id = :id AND pain_after IS NULL AND voided_at IS NULL"
        );
        $upd->execute(['p' => $score, 'at' => gmdate('Y-m-d H:i:s', $at), 'by' => (int) $actor['id'], 'n' => $note !== '' ? mb_substr($note, 0, 255) : null, 'id' => $id]);
        if (!$upd->rowCount()) {
            return ['success' => false, 'message' => 'The pain was already rechecked.'];
        }
        foreach (["painrecheck:{$id}", "painlate:{$id}"] as $key) {
            AlertService::resolveByKey($key, (int) $actor['id'], "Rechecked: pain {$score}");
        }
        $before = (int) $r['pain_before'];
        $msg = "Pain recheck recorded ({$before} → {$score}).";
        if ($score >= 4 && $score >= $before && $r['ordered_by']) {
            // Not relieved: the doctor should review the pain plan.
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'info',
                'title' => "Pain not relieved: {$r['patient_name']} — pain {$before} → {$score} after {$r['drug_name']}",
                'body' => 'Given ' . gmdate('M j, g:i A', self::ts($r['given_at'])) . ($note !== '' ? ". Note: {$note}" : '') . '. Review the pain plan.',
                'patient_id' => $r['patient_id'], 'link' => ['mar' => (int) $r['admission_id']],
                'targets' => [['user' => (int) $r['ordered_by']]], 'source_type' => 'inpatient_med_administrations', 'source_id' => $id,
                'dedupe_key' => "painnr:{$id}",
            ], (int) $actor['id']);
            $msg .= ' Not relieved — the doctor was told.';
        }
        return ['success' => true, 'message' => $msg, 'data' => $this->record($id)];
    }

    /**
     * For the chart and the room TV: the last pain medicine given, and when each pain medicine
     * can next be given. Null when the patient has no pain medicine.
     */
    public function painSummary(int $admissionId): ?array
    {
        $db = Database::connection();
        $now = self::ts($this->dbNow());
        $stmt = $db->prepare(
            "SELECT o.*, d.is_high_alert, d.controlled_class, c.name AS category FROM inpatient_med_orders o JOIN drugs d ON d.id = o.drug_id
             LEFT JOIN drug_categories c ON c.id = d.category_id
             WHERE o.admission_id = :a AND o.order_type = 'prn' AND o.status = 'verified' AND (o.stop_at IS NULL OR o.stop_at > NOW())"
        );
        $stmt->execute(['a' => $admissionId]);
        $orders = array_values(array_filter($stmt->fetchAll(PDO::FETCH_ASSOC), fn($o) => $this->isPain($o)));
        $last = $db->prepare(
            "SELECT r.*, o.drug_name FROM inpatient_med_administrations r JOIN inpatient_med_orders o ON o.id = r.order_id
             WHERE r.admission_id = :a AND r.status = 'given' AND r.voided_at IS NULL AND r.pain_before IS NOT NULL ORDER BY r.given_at DESC, r.id DESC LIMIT 1"
        );
        $last->execute(['a' => $admissionId]);
        $l = $last->fetch(PDO::FETCH_ASSOC);
        if (!$orders && !$l) {
            return null;
        }
        $list = [];
        foreach ($orders as $o) {
            $rs = $db->prepare("SELECT * FROM inpatient_med_administrations WHERE order_id = :o AND status = 'given' AND voided_at IS NULL AND given_at >= NOW() - INTERVAL 2 DAY");
            $rs->execute(['o' => $o['id']]);
            $st = $this->prnStatus($o, $rs->fetchAll(PDO::FETCH_ASSOC), $now);
            $list[] = [
                'order_id' => (int) $o['id'], 'drug_name' => $o['drug_name'],
                'dose' => self::num3($o['dose']) . " {$o['dose_unit']} {$o['route']}",
                'indication' => $o['prn_indication'], 'available_now' => $st['blocked'] === null,
                'next_allowed_at' => $st['next_allowed_at'], 'why_not' => $st['blocked'],
            ];
        }
        $waiting = array_filter($list, fn($x) => !$x['available_now']);
        $next = $list && count($waiting) === count($list) ? min(array_column($waiting, 'next_allowed_at')) : null;
        return [
            'last' => $l ? [
                'drug_name' => $l['drug_name'], 'dose' => self::num3($l['dose']) . " {$l['dose_unit']} {$l['route']}",
                'given_at' => $l['given_at'], 'pain_before' => (int) $l['pain_before'],
                'pain_after' => $l['pain_after'] !== null ? (int) $l['pain_after'] : null, 'recheck_state' => $this->recheckState($l, $now),
            ] : null,
            'orders' => $list,
            'available_now' => (bool) array_filter($list, fn($x) => $x['available_now']),
            // The earliest time one of them can be given, when none can be given now.
            'next_allowed_at' => $next,
        ];
    }

    // ------------------------------------------------------------------
    // Late doses -> alert the patient's nurse
    // ------------------------------------------------------------------

    /** Raise an alert for each newly late dose; close alerts for doses no longer late. Throttled unless forced. */
    public function runOverdue(bool $force = false): array
    {
        $db = Database::connection();
        if (!$force && !$this->claimRun($db)) {
            return [];
        }
        $now = self::ts($this->dbNow());
        $ids = array_map('intval', $db->query(
            "SELECT DISTINCT o.admission_id FROM inpatient_med_orders o JOIN inpatient_admissions a ON a.id = o.admission_id
             WHERE o.status = 'verified' AND o.order_type <> 'prn' AND a.status IN " . self::ACTIVE
        )->fetchAll(PDO::FETCH_COLUMN));

        $late = [];
        $raised = [];
        if ($ids) {
            $built = $this->build($db, $ids, $now - self::CARRY_HOURS * 3600, $now + 1, $now);
            $orders = new MedOrderService();
            foreach ($built as $admissionId => $rows) {
                foreach ($rows as $row) {
                    $o = $row['order'];
                    foreach ($row['slots'] as $s) {
                        if ($s['state'] !== 'late') {
                            continue;
                        }
                        $key = self::lateKey($o['id'], self::ts($s['at']));
                        $late[$key] = true;
                        if (self::ts($s['at']) < $now - self::ALERT_LOOKBACK_HOURS * 3600) {
                            continue;
                        }
                        $seen = $db->prepare("SELECT 1 FROM alerts WHERE dedupe_key = :k LIMIT 1");
                        $seen->execute(['k' => $key]);
                        if ($seen->fetchColumn()) {
                            continue;
                        }
                        $mins = (int) floor(($now - self::ts($s['at'])) / 60);
                        $res = AlertService::raise([
                            'type' => 'medication', 'urgency' => $o['is_stat'] || $o['needs_witness'] ? 'urgent' : 'info',
                            'title' => "Late dose: {$o['drug_name']} {$o['dose_text']} {$o['dose_unit']} {$o['route']} due " . substr($s['time'], 0, 5)
                                . " — {$o['patient_name']} ({$o['ward']} {$o['bed']})",
                            'body' => ($o['is_stat'] ? 'STAT dose, ' : '') . self::agoText($mins) . ' past its time and not recorded. Record it as given, held or refused on the MAR.',
                            'patient_id' => $o['patient_id'], 'link' => ['mar' => (int) $admissionId],
                            'targets' => $orders->nurseTargets((int) $admissionId), 'source_type' => 'inpatient_med_orders', 'source_id' => $o['id'],
                            'dedupe_key' => $key,
                        ]);
                        if (!empty($res['success'])) {
                            $raised[] = ['order_id' => $o['id'], 'at' => $s['at'], 'patient' => $o['patient_name'], 'drug' => $o['drug_name']];
                        }
                    }
                }
            }
        }
        // Pain rechecks: a reminder at 30 minutes, urgent once past 60.
        $rs = $db->query(
            "SELECT r.id, r.admission_id, r.patient_id, r.given_at, r.pain_before, r.recheck_due_at, o.drug_name, o.dose, o.dose_unit, o.route,
                    a.patient_name, w.ward_name, b.bed_number
             FROM inpatient_med_administrations r JOIN inpatient_med_orders o ON o.id = r.order_id
             JOIN inpatient_admissions a ON a.id = r.admission_id JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE r.recheck_due_at IS NOT NULL AND r.pain_after IS NULL AND r.voided_at IS NULL AND r.recheck_due_at <= NOW()
               AND r.given_at >= NOW() - INTERVAL " . self::ALERT_LOOKBACK_HOURS . " HOUR AND a.status IN " . self::ACTIVE
        );
        $orderSvc = new MedOrderService();
        foreach ($rs->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $overdue = $now > self::ts($r['given_at']) + self::RECHECK_LATE_MIN * 60;
            $key = ($overdue ? 'painlate:' : 'painrecheck:') . $r['id'];
            $seen = $db->prepare("SELECT 1 FROM alerts WHERE dedupe_key = :k LIMIT 1");
            $seen->execute(['k' => $key]);
            if ($seen->fetchColumn()) {
                continue;
            }
            $given = gmdate('g:i A', self::ts($r['given_at']));
            $res = AlertService::raise([
                'type' => 'medication', 'urgency' => $overdue ? 'urgent' : 'info',
                'title' => ($overdue ? 'Pain recheck overdue: ' : 'Recheck pain: ') . "{$r['patient_name']} ({$r['ward_name']} {$r['bed_number']})",
                'body' => "{$r['drug_name']} " . self::num3($r['dose']) . " {$r['dose_unit']} {$r['route']} given {$given} for pain {$r['pain_before']}/10. "
                    . ($overdue ? 'The recheck was due within an hour of the dose.' : 'Score the pain again now (due within an hour of the dose).'),
                'patient_id' => $r['patient_id'], 'link' => ['mar' => (int) $r['admission_id']],
                'targets' => $orderSvc->nurseTargets((int) $r['admission_id']), 'source_type' => 'inpatient_med_administrations', 'source_id' => (int) $r['id'],
                'dedupe_key' => $key,
            ]);
            if (!empty($res['success'])) {
                if ($overdue) {
                    AlertService::resolveByKey("painrecheck:{$r['id']}", null, 'Now overdue');
                }
                $raised[] = ['order_id' => 0, 'at' => $r['given_at'], 'patient' => $r['patient_name'], 'drug' => ($overdue ? 'pain recheck overdue: ' : 'pain recheck: ') . $r['drug_name']];
            }
        }

        // Close the alerts of doses that are no longer late (stopped, patient discharged, or recorded elsewhere).
        $open = $db->query("SELECT dedupe_key FROM alerts WHERE dedupe_key LIKE 'marlate:%' AND resolved_at IS NULL AND acknowledged_at IS NULL")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($open as $key) {
            if (!isset($late[$key])) {
                AlertService::resolveByKey($key, null, 'No longer due');
            }
        }
        return $raised;
    }

    // ------------------------------------------------------------------
    // Internals: dose times and their state
    // ------------------------------------------------------------------

    /**
     * For each admission, its order rows with the dose times in [from, to) and what happened to each.
     * $carryFrom: also show doses from that time on that were never recorded (late from an earlier shift).
     * @return array<int, array> admission_id => rows
     */
    private function build(PDO $db, array $admissionIds, int $from, int $to, int $now, ?int $carryFrom = null): array
    {
        $in = implode(',', array_map('intval', $admissionIds));
        $lo = $carryFrom !== null ? min($from, $carryFrom) : $from;
        $stmt = $db->prepare(
            "SELECT o.*, d.is_high_alert, d.controlled_class, c.name AS category, a.patient_name, w.ward_name, b.bed_number
             FROM inpatient_med_orders o JOIN drugs d ON d.id = o.drug_id LEFT JOIN drug_categories c ON c.id = d.category_id
             JOIN inpatient_admissions a ON a.id = o.admission_id JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE o.admission_id IN ({$in}) AND o.status IN ('pending', 'verified', 'discontinued')
               AND o.start_at < :to AND (o.stop_at IS NULL OR o.stop_at > :lo1) AND (o.discontinued_at IS NULL OR o.discontinued_at > :lo2)
             ORDER BY o.is_stat DESC, o.id"
        );
        $stmt->execute(['to' => gmdate('Y-m-d H:i:s', $to), 'lo1' => gmdate('Y-m-d H:i:s', $lo), 'lo2' => gmdate('Y-m-d H:i:s', $lo)]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$orders) {
            return [];
        }

        // Entries around the window (as-needed limits look back 24 h from now).
        $rlo = min($lo, $now - 86400) - 3600;
        $rhi = max($to, $now) + 3600;
        $oin = implode(',', array_map(fn($o) => (int) $o['id'], $orders));
        $rs = $db->prepare(
            "SELECT r.*, " . self::nameSql('r.recorded_by') . " AS recorded_by_name, " . self::nameSql('r.witness_by') . " AS witness_name,
                    " . self::nameSql('r.voided_by') . " AS voided_by_name, " . self::nameSql('r.pain_after_by') . " AS pain_after_by_name,
                    (SELECT x.entry_no FROM dd_register x WHERE x.administration_id = r.id) AS dd_entry_no
             FROM inpatient_med_administrations r
             WHERE r.order_id IN ({$oin}) AND COALESCE(r.scheduled_at, r.given_at, r.recorded_at) BETWEEN :lo AND :hi ORDER BY COALESCE(r.given_at, r.recorded_at), r.id"
        );
        $rs->execute(['lo' => gmdate('Y-m-d H:i:s', $rlo), 'hi' => gmdate('Y-m-d H:i:s', $rhi)]);
        $recs = [];
        foreach ($rs->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $recs[(int) $r['order_id']][] = $r;
        }

        $out = [];
        foreach ($orders as $o) {
            $oid = (int) $o['id'];
            if ($o['verified_at'] === null && $o['status'] !== 'pending') {
                continue;   // stopped before the pharmacy verified it: never given
            }
            $mine = $recs[$oid] ?? [];
            $bySlot = [];
            foreach ($mine as $r) {
                if ($r['voided_at'] === null && $r['scheduled_at'] !== null) {
                    $bySlot[self::ts($r['scheduled_at'])] = $r;
                }
            }
            $order = $this->compact($o, $now);
            $slots = [];
            foreach ($this->slotsFor($o, $lo, $to) as $t) {
                $rec = $bySlot[$t] ?? null;
                $carried = $t < $from;
                $state = $this->slotState($o, $t, $rec, $now);
                if ($carried && $state !== 'late') {
                    continue;   // from an earlier shift: only unrecorded doses carry over
                }
                $slots[] = [
                    'at' => gmdate('Y-m-d H:i:s', $t), 'time' => gmdate('H:i', $t), 'state' => $state, 'carried' => $carried,
                    'record' => $rec ? $this->shape($rec, $o) : null,
                    'given_late' => $rec && $rec['status'] === 'given' && self::ts($rec['given_at']) > $this->lateAt($o, $t),
                ];
            }
            $inWindow = fn($r) => ($x = self::ts($r['scheduled_at'] ?? $r['given_at'] ?? $r['recorded_at'])) >= $from && $x < $to;
            // As-needed doses of the shift, plus any whose pain recheck is still open (given just before it).
            $openRecheck = fn($r) => $r['recheck_due_at'] !== null && $r['pain_after'] === null && self::ts($r['given_at']) >= $now - 12 * 3600;
            $given = $o['order_type'] === 'prn'
                ? array_map(fn($r) => $this->shape($r, $o), array_values(array_filter($mine, fn($r) => $r['voided_at'] === null && ($inWindow($r) || $openRecheck($r)))))
                : [];
            $voided = array_map(fn($r) => $this->shape($r, $o), array_values(array_filter($mine, fn($r) => $r['voided_at'] !== null && $inWindow($r))));
            $prn = $o['order_type'] === 'prn' ? $this->prnStatus($o, $mine, $now) : null;

            $show = $slots || $given || $voided || $o['status'] === 'pending'
                || ($o['order_type'] === 'prn' && $o['verified_at'] !== null && $order['state'] === 'active');
            if (!$show) {
                continue;
            }
            $out[(int) $o['admission_id']][] = ['order' => $order, 'slots' => $slots, 'given' => $given, 'voided' => $voided, 'prn' => $prn];
        }
        // Scheduled first (by first dose time), then once / STAT, then as-needed, then waiting for pharmacy.
        foreach ($out as &$rows) {
            usort($rows, function ($x, $y) {
                $rank = fn($r) => $r['order']['state'] === 'pending' ? 3 : ($r['order']['order_type'] === 'prn' ? 2 : ($r['order']['order_type'] === 'once' ? 1 : 0));
                $first = fn($r) => $r['slots'][0]['at'] ?? '9999';
                return [$rank($x), $first($x)] <=> [$rank($y), $first($y)];
            });
        }
        unset($rows);
        return $out;
    }

    /** Dose times of a verified order in [from, to) (seconds, DB clock read as UTC). */
    private function slotsFor(array $o, int $from, int $to): array
    {
        if ($o['verified_at'] === null || $o['order_type'] === 'prn') {
            return [];
        }
        $start = self::ts($o['start_at']);
        $end = $to;
        if ($o['stop_at']) {
            $end = min($end, self::ts($o['stop_at']));
        }
        if ($o['discontinued_at']) {
            $end = min($end, self::ts($o['discontinued_at']));
        }
        if ($o['order_type'] === 'once') {
            return $start >= $from && $start < $end ? [$start] : [];
        }
        $times = array_filter(explode(',', (string) $o['admin_times']));
        $out = [];
        for ($day = intdiv(max($from, $start), 86400) * 86400 - 86400; $day < $end; $day += 86400) {
            foreach ($times as $hm) {
                [$h, $m] = array_map('intval', explode(':', $hm));
                $t = $day + $h * 3600 + $m * 60;
                if ($t >= $from && $t >= $start && $t < $end) {
                    $out[] = $t;
                }
            }
        }
        sort($out);
        return $out;
    }

    /** upcoming | due | late | given | held | refused | missed (never recorded, and the order has since been stopped) */
    private function slotState(array $o, int $t, ?array $rec, int $now): string
    {
        if ($rec) {
            return $rec['status'];
        }
        if ($o['status'] !== 'verified') {
            return 'missed';
        }
        if ($now > $this->lateAt($o, $t)) {
            return 'late';
        }
        return $now >= $t - self::EARLY_MIN * 60 ? 'due' : 'upcoming';
    }

    /** Late from: the dose time (or the pharmacy's verification, if later) plus the allowance. */
    private function lateAt(array $o, int $t): int
    {
        $ref = max($t, $o['verified_at'] ? self::ts($o['verified_at']) : $t);
        return $ref + ((int) $o['is_stat'] === 1 ? self::STAT_LATE_MIN : self::LATE_MIN) * 60;
    }

    /** As-needed: last given, next allowed, doses in the last 24 h. */
    private function prnStatus(array $o, array $recs, int $now): array
    {
        $times = [];
        foreach ($recs as $r) {
            if ($r['voided_at'] === null && $r['status'] === 'given' && $r['given_at']) {
                $times[] = self::ts($r['given_at']);
            }
        }
        sort($times);
        $last = $times ? end($times) : null;
        $in24 = array_values(array_filter($times, fn($t) => $t > $now - 86400 && $t <= $now));
        $next = null;
        $blocked = null;
        if ($last !== null && $o['prn_min_hours'] !== null) {
            $gapEnds = $last + (int) round((float) $o['prn_min_hours'] * 3600);
            if ($gapEnds > $now) {
                [$next, $blocked] = [$gapEnds, 'Too soon after the last dose.'];
            }
        }
        if ($o['prn_max_per_day'] !== null && count($in24) >= (int) $o['prn_max_per_day']) {
            $free = $in24[count($in24) - (int) $o['prn_max_per_day']] + 86400;
            [$next, $blocked] = [max($next ?? 0, $free), "The most in 24 hours ({$o['prn_max_per_day']}) has been given."];
        }
        return [
            'last_given_at' => $last !== null ? gmdate('Y-m-d H:i:s', $last) : null,
            'next_allowed_at' => $next !== null ? gmdate('Y-m-d H:i:s', $next) : null,
            'count_24h' => count($in24), 'max_per_day' => $o['prn_max_per_day'] !== null ? (int) $o['prn_max_per_day'] : null,
            'min_hours' => $o['prn_min_hours'] !== null ? (float) $o['prn_min_hours'] : null,
            'blocked' => $blocked,
        ];
    }

    /** Null when an as-needed dose at $at is within the order's limits, else why not. */
    private function prnLimit(PDO $db, array $o, int $at): ?string
    {
        $stmt = $db->prepare("SELECT given_at FROM inpatient_med_administrations WHERE order_id = :o AND status = 'given' AND voided_at IS NULL AND given_at IS NOT NULL");
        $stmt->execute(['o' => $o['id']]);
        $times = array_map(fn($g) => self::ts($g), $stmt->fetchAll(PDO::FETCH_COLUMN));
        if ($o['prn_min_hours'] !== null) {
            $gap = (int) round((float) $o['prn_min_hours'] * 3600);
            foreach ($times as $t) {
                if (abs($at - $t) < $gap) {
                    return "Too soon: this order allows a dose at least {$this->num($o['prn_min_hours'])} hours apart (last at " . gmdate('H:i', $t) . ', next from ' . gmdate('M j H:i', $t + $gap) . ').';
                }
            }
        }
        if ($o['prn_max_per_day'] !== null) {
            $n = count(array_filter($times, fn($t) => $t > $at - 86400 && $t <= $at));
            if ($n >= (int) $o['prn_max_per_day']) {
                return "The most this order allows in 24 hours ({$o['prn_max_per_day']}) has been given.";
            }
        }
        return null;
    }

    private function counts(array $rows): array
    {
        $c = ['late' => 0, 'due' => 0, 'upcoming' => 0, 'given' => 0, 'held' => 0, 'refused' => 0, 'missed' => 0, 'prn_given' => 0, 'pending' => 0, 'prn' => 0, 'recheck' => 0];
        foreach ($rows as $row) {
            if ($row['order']['state'] === 'pending') {
                $c['pending']++;
                continue;
            }
            foreach ($row['slots'] as $s) {
                $c[$s['state']]++;
            }
            if ($row['prn']) {
                $c['prn']++;
                $c['prn_given'] += count($row['given']);
                $c['recheck'] += count(array_filter($row['given'], fn($g) => in_array($g['recheck_state'], ['due', 'overdue'], true)));
            }
        }
        return $c;
    }

    // ------------------------------------------------------------------
    // Internals: recording
    // ------------------------------------------------------------------

    /** Checks shared by give / hold / refuse. Returns ['order', 'now', 'slot'] or ['error' => result]. */
    private function context(array $data, array $actor): array
    {
        $fail = fn(string $m, array $extra = []) => ['error' => ['success' => false, 'message' => $m] + $extra];
        if (!in_array($actor['role'] ?? '', self::GIVERS, true)) {
            return $fail('Doses are recorded by a nurse.', ['forbidden' => true]);
        }
        $o = $this->orderRow((int) ($data['order_id'] ?? 0));
        if (!$o) {
            return $fail('Order not found.', ['not_found' => true]);
        }
        if (!in_array($o['admission_status'], ['Admitted', 'Pending Discharge'], true)) {
            return $fail('This patient is no longer admitted.');
        }
        if (!$this->canGive($actor, (int) $o['admission_id'])) {
            return $fail('Only a nurse of this ward (or the patient\'s nurse this shift) can record doses.', ['forbidden' => true]);
        }
        if ($o['status'] === 'pending') {
            return $fail('This order is waiting for the pharmacy to verify it.');
        }
        if ($o['status'] !== 'verified') {
            return $fail("This order was {$o['status']}.");
        }
        $now = self::ts($this->dbNow());
        $skip = $data['_skip'] ?? null;
        if ($o['order_type'] === 'prn') {
            if ($skip) {
                return $fail('As-needed doses are only recorded when given.');
            }
            if ($o['stop_at'] && self::ts($o['stop_at']) <= $now) {
                return $fail('This order has ended.');
            }
            return ['order' => $o, 'now' => $now, 'slot' => null];
        }

        $slot = $this->dt($data['scheduled_at'] ?? null);
        if ($slot === null || $this->slotsFor($o, $slot, $slot + 1) !== [$slot]) {
            return $fail('Choose a dose time from the MAR.', ['errors' => ['scheduled_at' => 'Not a dose time of this order.']]);
        }
        if ($slot < $now - self::CARRY_HOURS * 3600) {
            return $fail('That dose is more than ' . self::CARRY_HOURS . ' hours old and can no longer be recorded.');
        }
        $ahead = $skip === 'held' ? self::HOLD_AHEAD_HOURS * 3600 : self::EARLY_MIN * 60;
        if ($slot - $now > $ahead) {
            return $fail('This dose is not due until ' . gmdate('M j, H:i', $slot) . '.');
        }
        return ['order' => $o, 'now' => $now, 'slot' => $slot];
    }

    /** Insert one entry under the order's lock. Returns the new id, or an error result. */
    private function insert(PDO $db, array $o, ?int $slot, string $status, array $actor, array $f): int|array
    {
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT mar_rec');
        try {
            $lock = $db->prepare("SELECT status FROM inpatient_med_orders WHERE id = :id FOR UPDATE");
            $lock->execute(['id' => $o['id']]);
            if ($lock->fetchColumn() !== 'verified') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'This order was changed just now; reload the MAR.'];
            }
            if ($slot !== null) {
                $dup = $db->prepare(
                    "SELECT r.status, " . self::nameSql('r.recorded_by') . " AS who FROM inpatient_med_administrations r WHERE r.order_id = :o AND r.slot_at = :s"
                );
                $dup->execute(['o' => $o['id'], 's' => gmdate('Y-m-d H:i:s', $slot)]);
                if ($d = $dup->fetch(PDO::FETCH_ASSOC)) {
                    $this->rollBack($db, $owns);
                    return ['success' => false, 'message' => "This dose was already recorded as {$d['status']} by {$d['who']}.", 'conflict' => true];
                }
            } elseif ($o['order_type'] === 'prn' && ($limit = $this->prnLimit($db, $o, self::ts($f['given_at'])))) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $limit, 'errors' => ['given_at' => $limit]];
            }
            $w = $f['witness'] ?? null;
            $db->prepare(
                "INSERT INTO inpatient_med_administrations (order_id, admission_id, patient_id, scheduled_at, slot_at, status, given_at, dose, dose_unit, route,
                    reason, note, pain_before, recheck_due_at, wasted_amount, wasted_unit, waste_note, initials, recorded_by, recorded_at, witness_by, witness_initials, witness_at)
                 VALUES (:o, :a, :p, :s, :s2, :st, :g, :dose, :u, :r, :reason, :note, :pb, :rd, :wa_amt, :wa_unit, :wa_note, :ini, :by, NOW(), :wb, :wi, :wa)"
            )->execute([
                'o' => $o['id'], 'a' => $o['admission_id'], 'p' => $o['patient_id'], 's' => $slot !== null ? gmdate('Y-m-d H:i:s', $slot) : null,
                's2' => $slot !== null ? gmdate('Y-m-d H:i:s', $slot) : null, 'st' => $status, 'g' => $f['given_at'] ?? null,
                'dose' => $status === 'given' ? $o['dose'] : null, 'u' => $status === 'given' ? $o['dose_unit'] : null, 'r' => $status === 'given' ? $o['route'] : null,
                'reason' => ($f['reason'] ?? '') !== '' ? mb_substr($f['reason'], 0, 255) : null, 'note' => ($f['note'] ?? '') !== '' ? mb_substr($f['note'], 0, 500) : null,
                'ini' => $this->initials((int) $actor['id']), 'by' => (int) $actor['id'],
                'wb' => $w['id'] ?? null, 'wi' => $w['initials'] ?? null, 'wa' => $w ? $this->dbNow() : null,
                'pb' => $f['pain_before'] ?? null, 'rd' => $f['recheck_due_at'] ?? null,
                'wa_amt' => $f['waste']['amount'] ?? null, 'wa_unit' => $f['waste']['unit'] ?? null, 'wa_note' => $f['waste']['note'] ?? null,
            ]);
            $id = (int) $db->lastInsertId();
            if ($status === 'given' && $this->isDD($o)) {
                $this->register($db, $id, $o, $actor, $f);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT mar_rec');
            return $id;
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }
    }

    /**
     * The second nurse signs with their own username and password. A wrong password counts
     * towards their account lockout, the same as a failed login.
     * @return array ['id', 'initials', 'name'] or ['error' => result]
     */
    private function witness(array $data, int $actorId): array
    {
        $username = trim((string) ($data['witness_username'] ?? ''));
        $password = (string) ($data['witness_password'] ?? '');
        $fail = fn(string $m) => ['error' => ['success' => false, 'message' => $m, 'needs_witness' => true, 'errors' => ['witness' => $m]]];
        if ($username === '' || $password === '') {
            return $fail('This is a high-alert medicine: a second nurse must check it and sign with their username and password.');
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT u.*, LOWER(r.name) AS role FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.username = :u AND u.deleted_at IS NULL");
        $stmt->execute(['u' => $username]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        $now = time();
        if ($u && !empty($u['is_locked']) && !empty($u['locked_until']) && strtotime($u['locked_until']) > $now) {
            return $fail('The second nurse\'s account is locked. Ask another nurse.');
        }
        if (!$u || !password_verify($password, $u['password'])) {
            if ($u) {
                $last = !empty($u['last_failed_login_at']) ? strtotime($u['last_failed_login_at']) : null;
                $attempts = $last === null || $now - $last > 900 ? 1 : (int) $u['failed_login_attempts'] + 1;
                $lock = $attempts >= 5;
                $db->prepare("UPDATE users SET failed_login_attempts = :n, last_failed_login_at = :t, is_locked = :l, locked_until = :lu WHERE id = :id")
                    ->execute(['n' => $attempts, 't' => date('Y-m-d H:i:s', $now), 'l' => $lock ? 1 : (int) $u['is_locked'],
                        'lu' => $lock ? date('Y-m-d H:i:s', $now + 1800) : $u['locked_until'], 'id' => $u['id']]);
            }
            AuditLogger::log(AuditLogger::CATEGORY_AUTH, AuditLogger::ACTION_LOGIN_FAILED,
                "Second-nurse check on the MAR failed for username '{$username}'.", null, $actorId);
            return $fail('Second nurse: wrong username or password.');
        }
        if ((int) $u['id'] === $actorId) {
            return $fail('The second check must be done by another nurse, not by you.');
        }
        if (!in_array($u['role'], self::WITNESSES, true)) {
            return $fail('The second check must be done by a nurse (or a doctor).');
        }
        if ((int) $u['failed_login_attempts'] > 0) {
            $db->prepare("UPDATE users SET failed_login_attempts = 0, last_failed_login_at = NULL WHERE id = :id")->execute(['id' => $u['id']]);
        }
        return ['id' => (int) $u['id'], 'initials' => $this->initials((int) $u['id']), 'name' => $this->name((int) $u['id'])];
    }

    private function clearAlerts(array $o, ?int $slot, int $userId, string $note): void
    {
        if ($slot !== null) {
            AlertService::resolveByKey(self::lateKey((int) $o['id'], $slot), $userId, $note);
        }
        if ((int) $o['is_stat'] === 1) {
            AlertService::resolveByKey("medstat:{$o['id']}", $userId, $note);
        }
    }

    /** Admin; a charge nurse or nurse of the patient's ward; the patient's nurse this shift; a nurse not yet linked to any ward. */
    private function canGive(array $actor, int $admissionId): bool
    {
        $role = (string) ($actor['role'] ?? '');
        if ($role === 'admin') {
            return true;
        }
        if (!in_array($role, self::GIVERS, true)) {
            return false;
        }
        $db = Database::connection();
        $wards = (new NursingStaffService())->wardIds((int) $actor['id']);
        if (!$wards) {
            return true;
        }
        $stmt = $db->prepare("SELECT ward_id FROM inpatient_admissions WHERE id = :id");
        $stmt->execute(['id' => $admissionId]);
        if (in_array((int) $stmt->fetchColumn(), $wards, true)) {
            return true;
        }
        $cur = (new NursingShiftService())->current();
        $stmt = $db->prepare("SELECT 1 FROM nurse_patient_assignments WHERE admission_id = :a AND shift_date = :d AND shift_id = :s AND nurse_user_id = :u");
        $stmt->execute(['a' => $admissionId, 'd' => $cur['date'], 's' => $cur['shift']['id'] ?? 0, 'u' => (int) $actor['id']]);
        return (bool) $stmt->fetchColumn();
    }

    private function needsWitness(array $o): bool
    {
        return (int) $o['is_high_alert'] === 1 || ($o['controlled_class'] ?? 'None') !== 'None';
    }

    private function orderRow(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT o.*, d.is_high_alert, d.controlled_class, c.name AS category, a.status AS admission_status, a.patient_name, a.patient_mrn,
                    w.ward_name, b.bed_number
             FROM inpatient_med_orders o JOIN drugs d ON d.id = o.drug_id LEFT JOIN drug_categories c ON c.id = d.category_id
             JOIN inpatient_admissions a ON a.id = o.admission_id
             JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE o.id = :id"
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function record(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT r.*, " . self::nameSql('r.recorded_by') . " AS recorded_by_name, " . self::nameSql('r.witness_by') . " AS witness_name,
                    " . self::nameSql('r.voided_by') . " AS voided_by_name, " . self::nameSql('r.pain_after_by') . " AS pain_after_by_name,
                    (SELECT x.entry_no FROM dd_register x WHERE x.administration_id = r.id) AS dd_entry_no, o.is_stat, o.verified_at
             FROM inpatient_med_administrations r JOIN inpatient_med_orders o ON o.id = r.order_id WHERE r.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? $this->shape($r, $r) : null;
    }

    private function shape(array $r, array $o): array
    {
        $dose = $r['dose'] !== null ? rtrim(rtrim(number_format((float) $r['dose'], 3, '.', ''), '0'), '.') : null;
        return [
            'id' => (int) $r['id'], 'order_id' => (int) $r['order_id'], 'status' => $r['status'],
            'scheduled_at' => $r['scheduled_at'], 'given_at' => $r['given_at'],
            'dose_text' => $dose, 'dose_unit' => $r['dose_unit'], 'route' => $r['route'],
            'reason' => $r['reason'], 'note' => $r['note'],
            'initials' => $r['initials'], 'recorded_by' => $r['recorded_by'] !== null ? (int) $r['recorded_by'] : null,
            'recorded_by_name' => $r['recorded_by'] ? $r['recorded_by_name'] : null, 'recorded_at' => $r['recorded_at'],
            'witness_initials' => $r['witness_initials'], 'witness_name' => $r['witness_by'] ? $r['witness_name'] : null,
            'voided' => $r['voided_at'] !== null, 'voided_at' => $r['voided_at'], 'void_reason' => $r['void_reason'],
            'voided_by_name' => $r['voided_by'] ? $r['voided_by_name'] : null,
            'given_late' => $r['status'] === 'given' && $r['scheduled_at'] !== null && $r['given_at'] !== null
                && self::ts($r['given_at']) > $this->lateAt($o, self::ts($r['scheduled_at'])),
            'pain_before' => $r['pain_before'] !== null ? (int) $r['pain_before'] : null,
            'pain_after' => $r['pain_after'] !== null ? (int) $r['pain_after'] : null,
            'pain_after_at' => $r['pain_after_at'], 'pain_after_note' => $r['pain_after_note'],
            'pain_after_by_name' => $r['pain_after_by'] ? ($r['pain_after_by_name'] ?? null) : null,
            'recheck_due_at' => $r['recheck_due_at'], 'recheck_state' => $this->recheckState($r),
            'wasted' => $r['wasted_amount'] !== null ? self::num3($r['wasted_amount']) . " {$r['wasted_unit']}" : null,
            'waste_note' => $r['waste_note'], 'dd_entry_no' => isset($r['dd_entry_no']) ? (int) $r['dd_entry_no'] : null,
        ];
    }

    /** null (no recheck) | done | pending (not yet 30 min) | due (30-60 min) | overdue */
    private function recheckState(array $r, ?int $now = null): ?string
    {
        if ($r['recheck_due_at'] === null || $r['voided_at'] !== null) {
            return null;
        }
        if ($r['pain_after'] !== null) {
            return 'done';
        }
        $now ??= self::ts($this->dbNow());
        if ($now < self::ts($r['recheck_due_at'])) {
            return 'pending';
        }
        return $now > self::ts($r['given_at']) + self::RECHECK_LATE_MIN * 60 ? 'overdue' : 'due';
    }

    /** As needed, for pain (the indication says pain), or any as-needed opioid. */
    private function isPain(array $o): bool
    {
        return $o['order_type'] === 'prn'
            && (preg_match(self::PAIN_WORDS, (string) $o['prn_indication']) || preg_match('/opioid/i', (string) ($o['category'] ?? '')));
    }

    /** Dangerous drug under RA 9165: goes into the DD register. */
    private function isDD(array $o): bool
    {
        return str_starts_with((string) ($o['controlled_class'] ?? ''), 'Dangerous Drug');
    }

    /** "pain 4+", "pain score 4 or more", ">= 4" -> 4; "above 3" -> 4; else null. */
    private function painThreshold(array $o): ?int
    {
        $t = (string) $o['prn_indication'];
        if (preg_match('/(?:≥|>=)\s*(\d{1,2})|(\d{1,2})\s*(?:\+|or more|or higher|or above|and above|and up)/iu', $t, $m)) {
            return (int) ($m[1] !== '' ? $m[1] : $m[2]);
        }
        if (preg_match('/(?:above|over|more than|>)\s*(\d{1,2})/i', $t, $m)) {
            return (int) $m[1] + 1;
        }
        return null;
    }

    /** One numbered DD register entry for a dangerous drug given (inside the recording transaction). */
    private function register(PDO $db, int $administrationId, array $o, array $actor, array $f): void
    {
        $no = $db->prepare("SELECT COALESCE(MAX(entry_no), 0) + 1 FROM dd_register WHERE drug_id = :d FOR UPDATE");
        $no->execute(['d' => $o['drug_id']]);
        $w = $f['witness'] ?? null;
        $db->prepare(
            "INSERT INTO dd_register (drug_id, entry_no, administration_id, order_id, admission_id, patient_id, drug_name, patient_name, patient_mrn,
                ward_name, bed, dose, dose_unit, route, wasted_amount, wasted_unit, waste_note, given_at, given_by, given_by_name, witness_by, witness_name,
                prescriber_name, created_at)
             VALUES (:d, :no, :aid, :o, :a, :p, :dn, :pn, :mrn, :w, :b, :dose, :u, :r, :wa, :wu, :wn, :g, :by, :byn, :wb, :wbn, :pr, NOW())"
        )->execute([
            'd' => $o['drug_id'], 'no' => (int) $no->fetchColumn(), 'aid' => $administrationId, 'o' => $o['id'], 'a' => $o['admission_id'], 'p' => $o['patient_id'],
            'dn' => $o['drug_name'], 'pn' => $o['patient_name'], 'mrn' => $o['patient_mrn'] ?? null, 'w' => $o['ward_name'], 'b' => $o['bed_number'],
            'dose' => $o['dose'], 'u' => $o['dose_unit'], 'r' => $o['route'],
            'wa' => $f['waste']['amount'] ?? null, 'wu' => $f['waste']['unit'] ?? null, 'wn' => $f['waste']['note'] ?? null,
            'g' => $f['given_at'], 'by' => (int) $actor['id'], 'byn' => $this->name((int) $actor['id']),
            'wb' => $w['id'] ?? null, 'wbn' => $w['name'] ?? null, 'pr' => $o['ordered_by'] ? $this->name((int) $o['ordered_by']) : null,
        ]);
    }

    /** 0-10 pain score, or null. */
    private static function score($raw): ?int
    {
        if (is_int($raw)) {
            $v = $raw;
        } elseif (is_string($raw) && preg_match('/^\s*\d{1,2}\s*$/', $raw)) {
            $v = (int) $raw;
        } else {
            return null;
        }
        return $v >= 0 && $v <= 10 ? $v : null;
    }

    private static function num3($v): string
    {
        return rtrim(rtrim(number_format((float) $v, 3, '.', ''), '0'), '.');
    }

    private function compact(array $o, int $now): array
    {
        $dose = rtrim(rtrim(number_format((float) $o['dose'], 3, '.', ''), '0'), '.');
        $how = $o['order_type'] === 'prn' ? 'as needed' . ($o['prn_indication'] ? " for {$o['prn_indication']}" : '')
            : ($o['order_type'] === 'once' ? ((int) $o['is_stat'] === 1 ? 'STAT (once, now)' : 'once') : (MedOrderService::FREQUENCIES[$o['frequency']][0] ?? $o['frequency']));
        $ended = $o['stop_at'] && self::ts($o['stop_at']) <= $now;
        $state = $o['status'] === 'pending' ? 'pending' : ($o['status'] === 'discontinued' ? 'stopped' : ($ended ? 'ended' : 'active'));
        return [
            'id' => (int) $o['id'], 'admission_id' => (int) $o['admission_id'], 'patient_id' => $o['patient_id'] !== null ? (int) $o['patient_id'] : null,
            'patient_name' => $o['patient_name'], 'ward' => $o['ward_name'], 'bed' => $o['bed_number'],
            'drug_name' => $o['drug_name'], 'dose_text' => $dose, 'dose_unit' => $o['dose_unit'], 'route' => $o['route'],
            'route_label' => MedOrderService::ROUTES[$o['route']] ?? $o['route'], 'how' => $how, 'order_type' => $o['order_type'],
            'frequency' => $o['frequency'], 'admin_times' => $o['admin_times'] ? explode(',', $o['admin_times']) : [],
            'prn_indication' => $o['prn_indication'], 'is_stat' => (int) $o['is_stat'] === 1,
            'high_alert' => (int) $o['is_high_alert'] === 1, 'controlled' => ($o['controlled_class'] ?? 'None') !== 'None' ? $o['controlled_class'] : null,
            'needs_witness' => $this->needsWitness($o), 'instructions' => $o['instructions'],
            'pain' => $this->isPain($o), 'pain_threshold' => $this->isPain($o) ? $this->painThreshold($o) : null, 'dd' => $this->isDD($o),
            'start_at' => $o['start_at'], 'stop_at' => $o['stop_at'], 'discontinued_at' => $o['discontinued_at'], 'discontinue_reason' => $o['discontinue_reason'],
            'state' => $state,
        ];
    }

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------

    /** [start, end) of a shift in seconds (DB clock read as UTC). */
    private function window(string $date, array $shift): array
    {
        $start = self::ts("{$date} {$shift['start']}:00");
        $end = self::ts("{$date} {$shift['end']}:00");
        if ($end <= $start) {
            $end += 86400;
        }
        return [$start, $end];
    }

    private function claimRun(PDO $db): bool
    {
        $db->exec("INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('mar_overdue', '2000-01-01 00:00:00')");
        $stmt = $db->prepare(
            "UPDATE alert_job_runs SET last_run_at = NOW()
             WHERE job = 'mar_overdue' AND last_run_at <= DATE_SUB(NOW(), INTERVAL " . self::THROTTLE_SECONDS . " SECOND)"
        );
        $stmt->execute();
        return $stmt->rowCount() === 1;
    }

    private function initials(int $userId): string
    {
        $stmt = Database::connection()->prepare(
            "SELECT e.first_name, e.last_name, u.username FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = :id LIMIT 1"
        );
        $stmt->execute(['id' => $userId]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $first = trim((string) ($u['first_name'] ?? ''));
        $last = trim((string) ($u['last_name'] ?? ''));
        $ini = $first !== '' || $last !== '' ? mb_substr($first, 0, 1) . mb_substr($last, 0, 1) : mb_substr((string) ($u['username'] ?? '?'), 0, 2);
        return mb_strtoupper($ini) ?: '?';
    }

    private function name(int $userId): string
    {
        $stmt = Database::connection()->prepare("SELECT " . self::nameSql(':id'));
        $stmt->execute(['id' => $userId]);
        return (string) $stmt->fetchColumn();
    }

    private function allergies(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT a.name, pa.reaction, pa.severity FROM patient_allergies pa JOIN allergies a ON a.id = pa.allergy_id
             WHERE pa.patient_id = :p AND pa.deleted_at IS NULL AND (pa.end_date IS NULL OR pa.end_date >= CURDATE()) ORDER BY a.name"
        );
        $stmt->execute(['p' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT mar_rec');
    }

    private function dbNow(): string
    {
        return (string) Database::connection()->query("SELECT NOW()")->fetchColumn();
    }

    /** "2026-10-07T08:00" / "2026-10-07 08:00:00" -> seconds (read as UTC), or null. */
    private function dt($v): ?int
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/', trim($v))) {
            return null;
        }
        try {
            return self::ts(str_replace('T', ' ', trim($v)));
        } catch (\Exception $e) {
            return null;
        }
    }

    private function validDate($v): ?string
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return null;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $v));
        return checkdate($m, $d, $y) ? $v : null;
    }

    private function num($v): string
    {
        return rtrim(rtrim(number_format((float) $v, 1, '.', ''), '0'), '.');
    }

    private static function lateKey(int $orderId, int $slot): string
    {
        return "marlate:{$orderId}:" . gmdate('YmdHi', $slot);
    }

    private static function agoText(int $mins): string
    {
        return $mins < 120 ? "{$mins} minutes" : floor($mins / 60) . ' h ' . ($mins % 60) . ' min';
    }

    /** DB time -> seconds, read as UTC (PHP's own timezone has daylight saving; the DB clock doesn't). */
    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable($dt, new \DateTimeZone('UTC')))->getTimestamp();
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
