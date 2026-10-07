<?php

namespace App\Modules\NursingStaff\Services;

use App\Core\Database;
use App\Core\RoleAccess;
use App\Modules\Alerts\Services\AlertService;
use PDO;

/**
 * Nursing shifts: who looks after each admitted patient per shift (a nurse and a CNA),
 * and the hand-over between shifts.
 *
 * Times come from the database clock (rows are stamped with NOW() there; PHP's timezone
 * may differ). A shift that crosses midnight belongs to the date it starts on.
 */
class NursingShiftService
{
    /** How far ahead assignments can be made. */
    public const DAYS_AHEAD = 7;
    private const ACTIVE = "('Admitted', 'Pending Discharge')";

    private NursingStaffService $staff;

    public function __construct()
    {
        $this->staff = new NursingStaffService();
    }

    // ------------------------------------------------------------------
    // Shifts
    // ------------------------------------------------------------------

    public function shifts(): array
    {
        $rows = Database::connection()->query("SELECT * FROM nursing_shifts WHERE is_active = 1 ORDER BY sort_order, start_time")->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn($s) => [
            'id' => (int) $s['id'], 'code' => $s['code'], 'name' => $s['name'],
            'start' => substr($s['start_time'], 0, 5), 'end' => substr($s['end_time'], 0, 5),
            'overnight' => $s['end_time'] <= $s['start_time'],
        ], $rows);
    }

    /** The shift running now: ['date' => Y-m-d, 'shift' => [...]] */
    public function current(?string $now = null): array
    {
        $now ??= $this->dbNow();
        $date = substr($now, 0, 10);
        $time = substr($now, 11, 8);
        foreach ($this->shifts() as $s) {
            $start = $s['start'] . ':00';
            $end = $s['end'] . ':00';
            if (!$s['overnight'] && $time >= $start && $time < $end) {
                return ['date' => $date, 'shift' => $s];
            }
            if ($s['overnight']) {
                if ($time >= $start) {
                    return ['date' => $date, 'shift' => $s];
                }
                if ($time < $end) {
                    return ['date' => date('Y-m-d', strtotime($date . ' -1 day')), 'shift' => $s];
                }
            }
        }
        $first = $this->shifts()[0] ?? null;
        return ['date' => $date, 'shift' => $first];
    }

    /** The shift after (or before) a given one. */
    public function step(string $date, int $shiftId, int $dir): ?array
    {
        $shifts = $this->shifts();
        $i = array_search($shiftId, array_column($shifts, 'id'), true);
        if ($i === false || !$shifts) {
            return null;
        }
        $j = $i + $dir;
        if ($j >= count($shifts)) {
            return ['date' => date('Y-m-d', strtotime($date . ' +1 day')), 'shift' => $shifts[0]];
        }
        if ($j < 0) {
            return ['date' => date('Y-m-d', strtotime($date . ' -1 day')), 'shift' => $shifts[count($shifts) - 1]];
        }
        return ['date' => $date, 'shift' => $shifts[$j]];
    }

    /** past / current / future, by comparing (date, order) with the running shift. */
    public function state(string $date, int $shiftId): string
    {
        $cur = $this->current();
        $key = fn($d, $id) => $d . '#' . str_pad((string) array_search($id, array_column($this->shifts(), 'id'), true), 2, '0', STR_PAD_LEFT);
        $a = $key($date, $shiftId);
        $b = $key($cur['date'], $cur['shift']['id']);
        return $a === $b ? 'current' : ($a < $b ? 'past' : 'future');
    }

    // ------------------------------------------------------------------
    // The assignment board (one ward, one shift)
    // ------------------------------------------------------------------

    /** filters: ward_id?, date?, shift_id? (default: the actor's main ward, the current shift) */
    public function board(array $filters, array $actor): array
    {
        $db = Database::connection();
        $cur = $this->current();
        $date = $this->validDate($filters['date'] ?? null) ?? $cur['date'];
        $shiftId = (int) ($filters['shift_id'] ?? 0) ?: (int) $cur['shift']['id'];
        $shift = $this->shift($shiftId) ?? $cur['shift'];
        $shiftId = (int) $shift['id'];

        $wards = $db->query("SELECT id, ward_code, ward_name FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC);
        $myWards = $this->staff->wardIds((int) ($actor['id'] ?? 0));
        $wardId = (int) ($filters['ward_id'] ?? 0) ?: ($myWards[0] ?? (int) ($wards[0]['id'] ?? 0));

        $state = $this->state($date, $shiftId);
        $canEdit = $this->canManage($actor, $wardId) && $state !== 'past' && $date <= $this->maxDate();

        // Patients in the ward now, plus anyone assigned to this ward for that shift (since moved / discharged).
        $stmt = $db->prepare(
            "SELECT a.id AS admission_id, a.patient_id, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                    a.admitting_diagnosis, a.attending_physician, a.isolation_precautions, a.status, a.ward_id AS current_ward_id,
                    b.bed_number, b.room_number,
                    n.nurse_user_id, n.cna_user_id, n.updated_at, n.assigned_at,
                    " . self::userNameSql('n.nurse_user_id') . " AS nurse_name,
                    " . self::userNameSql('n.cna_user_id') . " AS cna_name
             FROM inpatient_admissions a
             JOIN hospital_beds b ON b.id = a.bed_id
             LEFT JOIN nurse_patient_assignments n ON n.admission_id = a.id AND n.shift_date = :d AND n.shift_id = :s
             WHERE (a.ward_id = :w AND a.status IN " . self::ACTIVE . ") OR n.ward_id = :w2
             ORDER BY b.room_number, b.bed_number"
        );
        $stmt->execute(['d' => $date, 's' => $shiftId, 'w' => $wardId, 'w2' => $wardId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $ids = array_map(fn($r) => (int) $r['admission_id'], $rows);
        $handover = $this->handoverMap($db, $ids, $date, $shiftId);
        $prev = $this->step($date, $shiftId, -1);
        $prevHandover = $prev ? $this->handoverMap($db, $ids, $prev['date'], (int) $prev['shift']['id']) : [];

        $patients = array_map(fn($r) => [
            'admission_id' => (int) $r['admission_id'],
            'patient_id' => $r['patient_id'] !== null ? (int) $r['patient_id'] : null,
            'patient_name' => $r['patient_name'], 'patient_mrn' => $r['patient_mrn'],
            'age' => $r['patient_age'] !== null ? (int) $r['patient_age'] : null, 'sex' => $r['gender'],
            'diagnosis' => $r['admitting_diagnosis'], 'attending' => $r['attending_physician'],
            'isolation' => $r['isolation_precautions'] !== 'Standard' ? $r['isolation_precautions'] : null,
            'status' => $r['status'], 'bed' => $r['bed_number'], 'room' => $r['room_number'],
            'left_ward' => (int) $r['current_ward_id'] !== $wardId || !in_array($r['status'], ['Admitted', 'Pending Discharge'], true),
            'nurse_user_id' => $r['nurse_user_id'] !== null ? (int) $r['nurse_user_id'] : null, 'nurse_name' => $r['nurse_user_id'] ? $r['nurse_name'] : null,
            'cna_user_id' => $r['cna_user_id'] !== null ? (int) $r['cna_user_id'] : null, 'cna_name' => $r['cna_user_id'] ? $r['cna_name'] : null,
            'handover' => $handover[(int) $r['admission_id']] ?? null,
            'incoming_handover' => $prevHandover[(int) $r['admission_id']] ?? null,
        ], $rows);

        return [
            'date' => $date, 'shift' => $shift, 'state' => $state, 'current' => $cur,
            'prev' => $prev, 'next' => $this->step($date, $shiftId, 1),
            'shifts' => $this->shifts(),
            'ward_id' => $wardId,
            'wards' => array_map(fn($w) => ['id' => (int) $w['id'], 'code' => $w['ward_code'], 'name' => $w['ward_name'], 'mine' => in_array((int) $w['id'], $myWards, true)], $wards),
            'patients' => $patients,
            'staff' => $this->wardStaff($db, $wardId, $date, $shiftId),
            'can_edit' => $canEdit,
            'edit_note' => $canEdit ? null : $this->editNote($actor, $wardId, $state, $date),
            'max_date' => $this->maxDate(),
        ];
    }

    /**
     * Save the board. data: ward_id, date, shift_id, rows: [{admission_id, nurse_user_id?, cna_user_id?}]
     */
    public function save(array $data, array $actor): array
    {
        $db = Database::connection();
        $wardId = (int) ($data['ward_id'] ?? 0);
        $date = $this->validDate($data['date'] ?? null);
        $shift = $this->shift((int) ($data['shift_id'] ?? 0));
        if (!$date || !$shift) {
            return ['success' => false, 'message' => 'Choose a date and shift.'];
        }
        $shiftId = (int) $shift['id'];
        if (!$this->canManage($actor, $wardId)) {
            return ['success' => false, 'message' => 'Only an admin or a charge nurse of this ward can assign its patients.', 'forbidden' => true];
        }
        if ($this->state($date, $shiftId) === 'past') {
            return ['success' => false, 'message' => 'That shift is over; its assignments can no longer be changed.'];
        }
        if ($date > $this->maxDate()) {
            return ['success' => false, 'message' => 'Assignments can be made up to ' . self::DAYS_AHEAD . ' days ahead.'];
        }

        $staff = array_column($this->wardStaff($db, $wardId, $date, $shiftId), null, 'user_id');
        $rows = is_array($data['rows'] ?? null) ? $data['rows'] : [];
        $errors = [];
        $clean = [];
        foreach ($rows as $i => $r) {
            $adm = (int) ($r['admission_id'] ?? 0);
            $nurse = !empty($r['nurse_user_id']) ? (int) $r['nurse_user_id'] : null;
            $cna = !empty($r['cna_user_id']) ? (int) $r['cna_user_id'] : null;
            $stmt = $db->prepare("SELECT patient_name FROM inpatient_admissions WHERE id = :id AND ward_id = :w AND status IN " . self::ACTIVE);
            $stmt->execute(['id' => $adm, 'w' => $wardId]);
            $name = $stmt->fetchColumn();
            if (!$name) {
                $errors["rows.{$i}"] = 'This patient is no longer admitted to this ward.';
                continue;
            }
            if ($nurse && (!isset($staff[$nurse]) || $staff[$nurse]['kind'] !== 'nurse')) {
                $errors["rows.{$i}.nurse"] = "{$name}: choose a nurse who works in this ward.";
            }
            if ($cna && (!isset($staff[$cna]) || $staff[$cna]['kind'] !== 'cna')) {
                $errors["rows.{$i}.cna"] = "{$name}: choose a CNA who works in this ward.";
            }
            $clean[$adm] = ['nurse' => $nurse, 'cna' => $cna];
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        // Who is affected (to tell them), before and after.
        $before = $this->assignedUsers($db, $wardId, $date, $shiftId);
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT nurse_assign');
        try {
            $up = $db->prepare(
                "INSERT INTO nurse_patient_assignments (admission_id, shift_date, shift_id, ward_id, nurse_user_id, cna_user_id, assigned_by, assigned_at)
                 VALUES (:a, :d, :s, :w, :n, :c, :by, NOW())
                 ON DUPLICATE KEY UPDATE ward_id = VALUES(ward_id), nurse_user_id = VALUES(nurse_user_id), cna_user_id = VALUES(cna_user_id),
                    updated_by = VALUES(assigned_by), updated_at = NOW()"
            );
            $del = $db->prepare("DELETE FROM nurse_patient_assignments WHERE admission_id = :a AND shift_date = :d AND shift_id = :s");
            foreach ($clean as $adm => $c) {
                if (!$c['nurse'] && !$c['cna']) {
                    $del->execute(['a' => $adm, 'd' => $date, 's' => $shiftId]);
                } else {
                    $up->execute(['a' => $adm, 'd' => $date, 's' => $shiftId, 'w' => $wardId, 'n' => $c['nurse'], 'c' => $c['cna'], 'by' => (int) $actor['id'] ?: null]);
                }
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT nurse_assign');
        } catch (\Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT nurse_assign');
            throw $e;
        }

        $after = $this->assignedUsers($db, $wardId, $date, $shiftId);
        $notified = $this->notify($db, $before, $after, $wardId, $date, $shift, (int) $actor['id']);
        return ['success' => true, 'message' => 'Assignments saved.', 'data' => ['notified' => $notified]];
    }

    /** Fill this shift from the previous one (same nurse / CNA where they still work in the ward). */
    public function copyPrevious(array $data, array $actor): array
    {
        $db = Database::connection();
        $wardId = (int) ($data['ward_id'] ?? 0);
        $date = $this->validDate($data['date'] ?? null);
        $shift = $this->shift((int) ($data['shift_id'] ?? 0));
        if (!$date || !$shift) {
            return ['success' => false, 'message' => 'Choose a date and shift.'];
        }
        $prev = $this->step($date, (int) $shift['id'], -1);
        $stmt = $db->prepare(
            "SELECT p.admission_id, p.nurse_user_id, p.cna_user_id FROM nurse_patient_assignments p
             JOIN inpatient_admissions a ON a.id = p.admission_id AND a.ward_id = :w AND a.status IN " . self::ACTIVE . "
             WHERE p.shift_date = :d AND p.shift_id = :s
               AND NOT EXISTS (SELECT 1 FROM nurse_patient_assignments x WHERE x.admission_id = p.admission_id AND x.shift_date = :d2 AND x.shift_id = :s2)"
        );
        $stmt->execute(['w' => $wardId, 'd' => $prev['date'], 's' => $prev['shift']['id'], 'd2' => $date, 's2' => $shift['id']]);
        $staff = array_column($this->wardStaff($db, $wardId, $date, (int) $shift['id']), null, 'user_id');
        $rows = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $n = $r['nurse_user_id'] && isset($staff[(int) $r['nurse_user_id']]) ? (int) $r['nurse_user_id'] : null;
            $c = $r['cna_user_id'] && isset($staff[(int) $r['cna_user_id']]) ? (int) $r['cna_user_id'] : null;
            if ($n || $c) {
                $rows[] = ['admission_id' => (int) $r['admission_id'], 'nurse_user_id' => $n, 'cna_user_id' => $c];
            }
        }
        if (!$rows) {
            return ['success' => false, 'message' => 'Nothing to copy: the ' . $prev['shift']['name'] . ' shift has no assignments for patients without one here.'];
        }
        $r = $this->save(['ward_id' => $wardId, 'date' => $date, 'shift_id' => $shift['id'], 'rows' => $rows], $actor);
        if ($r['success']) {
            $r['message'] = count($rows) . ' patient' . (count($rows) === 1 ? '' : 's') . ' copied from the ' . $prev['shift']['name'] . ' shift.';
            $r['data']['copied'] = count($rows);
        }
        return $r;
    }

    // ------------------------------------------------------------------
    // My patients, and one patient's nursing team
    // ------------------------------------------------------------------

    /** The patients assigned to me this shift (as nurse or CNA). */
    public function mine(array $user): array
    {
        $db = Database::connection();
        $cur = $this->current();
        $uid = (int) $user['id'];
        $stmt = $db->prepare(
            "SELECT n.admission_id, IF(n.nurse_user_id = :me, 'nurse', 'cna') AS my_role,
                    a.patient_id, a.patient_name, a.patient_mrn, a.admitting_diagnosis, a.isolation_precautions, a.status,
                    w.ward_name, b.room_number, b.bed_number,
                    " . self::userNameSql('n.nurse_user_id') . " AS nurse_name, " . self::userNameSql('n.cna_user_id') . " AS cna_name
             FROM nurse_patient_assignments n
             JOIN inpatient_admissions a ON a.id = n.admission_id
             JOIN hospital_wards w ON w.id = a.ward_id
             JOIN hospital_beds b ON b.id = a.bed_id
             WHERE n.shift_date = :d AND n.shift_id = :s AND (n.nurse_user_id = :me2 OR n.cna_user_id = :me3)
             ORDER BY w.ward_name, b.room_number, b.bed_number"
        );
        $stmt->execute(['me' => $uid, 'me2' => $uid, 'me3' => $uid, 'd' => $cur['date'], 's' => $cur['shift']['id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $prev = $this->step($cur['date'], (int) $cur['shift']['id'], -1);
        $incoming = $this->handoverMap($db, array_map(fn($r) => (int) $r['admission_id'], $rows), $prev['date'], (int) $prev['shift']['id']);
        return [
            'current' => $cur,
            'patients' => array_map(fn($r) => [
                'admission_id' => (int) $r['admission_id'], 'my_role' => $r['my_role'],
                'patient_id' => $r['patient_id'] !== null ? (int) $r['patient_id'] : null, 'patient_name' => $r['patient_name'], 'patient_mrn' => $r['patient_mrn'],
                'diagnosis' => $r['admitting_diagnosis'], 'isolation' => $r['isolation_precautions'] !== 'Standard' ? $r['isolation_precautions'] : null,
                'ward' => $r['ward_name'], 'room' => $r['room_number'], 'bed' => $r['bed_number'], 'status' => $r['status'],
                'nurse_name' => $r['nurse_name'], 'cna_name' => $r['cna_name'],
                'incoming_handover' => $incoming[(int) $r['admission_id']] ?? null,
            ], $rows),
        ];
    }

    /**
     * For the chart, the census and the room TV: an admitted patient's ward / bed, the nurse and CNA
     * this shift (and next), and the latest hand-over. Null when the patient isn't admitted.
     */
    public function forPatient(int $patientId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT a.id, w.ward_name, b.room_number, b.bed_number FROM inpatient_admissions a
             JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.patient_id = :p AND a.status IN " . self::ACTIVE . " ORDER BY a.id DESC LIMIT 1"
        );
        $stmt->execute(['p' => $patientId]);
        $adm = $stmt->fetch(PDO::FETCH_ASSOC);
        return $adm ? $this->forAdmission((int) $adm['id']) : null;
    }

    public function forAdmission(int $admissionId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.patient_name, a.status, a.ward_id, w.ward_name, b.room_number, b.bed_number FROM inpatient_admissions a
             JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id"
        );
        $stmt->execute(['id' => $admissionId]);
        $adm = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$adm) {
            return null;
        }
        $cur = $this->current();
        $next = $this->step($cur['date'], (int) $cur['shift']['id'], 1);
        $team = function (string $date, int $shiftId) use ($db, $admissionId) {
            $s = $db->prepare(
                "SELECT nurse_user_id, cna_user_id, " . self::userNameSql('nurse_user_id') . " AS nurse_name, " . self::userNameSql('cna_user_id') . " AS cna_name
                 FROM nurse_patient_assignments WHERE admission_id = :a AND shift_date = :d AND shift_id = :s"
            );
            $s->execute(['a' => $admissionId, 'd' => $date, 's' => $shiftId]);
            $r = $s->fetch(PDO::FETCH_ASSOC);
            return [
                'nurse_user_id' => $r && $r['nurse_user_id'] ? (int) $r['nurse_user_id'] : null, 'nurse_name' => $r && $r['nurse_user_id'] ? $r['nurse_name'] : null,
                'cna_user_id' => $r && $r['cna_user_id'] ? (int) $r['cna_user_id'] : null, 'cna_name' => $r && $r['cna_user_id'] ? $r['cna_name'] : null,
            ];
        };
        $latest = $db->prepare("SELECT id FROM nurse_handovers WHERE admission_id = :a ORDER BY shift_date DESC, written_at DESC LIMIT 1");
        $latest->execute(['a' => $admissionId]);
        $hid = $latest->fetchColumn();
        return [
            'admission_id' => (int) $adm['id'], 'patient_id' => $adm['patient_id'] !== null ? (int) $adm['patient_id'] : null,
            'patient_name' => $adm['patient_name'], 'status' => $adm['status'],
            'ward_id' => (int) $adm['ward_id'], 'ward' => $adm['ward_name'], 'room' => $adm['room_number'], 'bed' => $adm['bed_number'],
            'shift' => $cur, 'team' => $team($cur['date'], (int) $cur['shift']['id']),
            'next_shift' => $next, 'next_team' => $team($next['date'], (int) $next['shift']['id']),
            'latest_handover' => $hid ? $this->handover((int) $hid) : null,
        ];
    }

    // ------------------------------------------------------------------
    // Hand-over
    // ------------------------------------------------------------------

    public function handovers(int $admissionId, array $actor): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id FROM nurse_handovers WHERE admission_id = :a ORDER BY shift_date DESC, shift_id DESC LIMIT 30");
        $stmt->execute(['a' => $admissionId]);
        $list = array_map(fn($id) => $this->handover((int) $id), $stmt->fetchAll(PDO::FETCH_COLUMN));
        $cur = $this->current();
        $prev = $this->step($cur['date'], (int) $cur['shift']['id'], -1);
        $info = $this->forAdmission($admissionId);
        return [
            'admission' => $info,
            'handovers' => array_map(fn($h) => $h + ['can_receive' => !$h['received_at'] && $this->canReceive($actor, $h)], $list),
            // The shifts a hand-over can be written for now: this one, or the one that just ended.
            'writable' => array_values(array_filter([
                $this->canWrite($actor, $admissionId, $cur['date'], (int) $cur['shift']['id']) ? $cur : null,
                $this->canWrite($actor, $admissionId, $prev['date'], (int) $prev['shift']['id']) ? $prev : null,
            ])),
        ];
    }

    /** data: admission_id, date, shift_id, situation, background?, assessment?, recommendation? */
    public function writeHandover(array $data, array $actor): array
    {
        $db = Database::connection();
        $adm = (int) ($data['admission_id'] ?? 0);
        $date = $this->validDate($data['date'] ?? null);
        $shift = $this->shift((int) ($data['shift_id'] ?? 0));
        if (!$date || !$shift) {
            return ['success' => false, 'message' => 'Choose the shift you are handing over.'];
        }
        if (!$this->canWrite($actor, $adm, $date, (int) $shift['id'])) {
            return ['success' => false, 'message' => 'The hand-over is written by the nurse assigned to this patient for that shift (or the ward\'s charge nurse), during the shift or the next one.', 'forbidden' => true];
        }
        $fields = [];
        foreach (['situation', 'background', 'assessment', 'recommendation'] as $f) {
            $v = trim((string) ($data[$f] ?? ''));
            if (mb_strlen($v) > 4000) {
                return ['success' => false, 'message' => 'Keep each part under 4000 characters.', 'errors' => [$f => 'Too long.']];
            }
            $fields[$f] = $v !== '' ? $v : null;
        }
        if (!$fields['situation']) {
            return ['success' => false, 'message' => 'Write how the patient is now.', 'errors' => ['situation' => 'Required.']];
        }
        $stmt = $db->prepare("SELECT id, received_at FROM nurse_handovers WHERE admission_id = :a AND shift_date = :d AND shift_id = :s");
        $stmt->execute(['a' => $adm, 'd' => $date, 's' => $shift['id']]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing && $existing['received_at']) {
            return ['success' => false, 'message' => 'This hand-over was already received by the next shift; it can no longer be changed.'];
        }
        if ($existing) {
            $db->prepare("UPDATE nurse_handovers SET situation = :si, background = :bg, assessment = :as, recommendation = :re, written_by = :by, updated_at = NOW() WHERE id = :id")
                ->execute(['si' => $fields['situation'], 'bg' => $fields['background'], 'as' => $fields['assessment'], 're' => $fields['recommendation'], 'by' => (int) $actor['id'], 'id' => $existing['id']]);
            $id = (int) $existing['id'];
        } else {
            $db->prepare(
                "INSERT INTO nurse_handovers (admission_id, shift_date, shift_id, situation, background, assessment, recommendation, written_by, written_at)
                 VALUES (:a, :d, :s, :si, :bg, :as, :re, :by, NOW())"
            )->execute(['a' => $adm, 'd' => $date, 's' => $shift['id'], 'si' => $fields['situation'], 'bg' => $fields['background'],
                'as' => $fields['assessment'], 're' => $fields['recommendation'], 'by' => (int) $actor['id']]);
            $id = (int) $db->lastInsertId();
        }
        return ['success' => true, 'message' => 'Hand-over saved.', 'data' => $this->handover($id)];
    }

    public function receive(int $handoverId, array $actor): array
    {
        $db = Database::connection();
        $h = $this->handover($handoverId);
        if (!$h) {
            return ['success' => false, 'message' => 'Hand-over not found.', 'not_found' => true];
        }
        if ($h['received_at']) {
            return ['success' => true, 'message' => "Already received by {$h['received_by_name']}.", 'data' => $h];
        }
        if (!$this->canReceive($actor, $h)) {
            return ['success' => false, 'message' => 'The hand-over is received by the nurse assigned to this patient on the next shift (or the ward\'s charge nurse).', 'forbidden' => true];
        }
        $db->prepare("UPDATE nurse_handovers SET received_by = :by, received_at = NOW() WHERE id = :id AND received_at IS NULL")
            ->execute(['by' => (int) $actor['id'], 'id' => $handoverId]);
        return ['success' => true, 'message' => 'Hand-over received.', 'data' => $this->handover($handoverId)];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function handover(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT h.*, s.name AS shift_name, " . self::userNameSql('h.written_by') . " AS written_by_name, " . self::userNameSql('h.received_by') . " AS received_by_name
             FROM nurse_handovers h JOIN nursing_shifts s ON s.id = h.shift_id WHERE h.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $h = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$h) {
            return null;
        }
        return [
            'id' => (int) $h['id'], 'admission_id' => (int) $h['admission_id'], 'date' => $h['shift_date'], 'shift_id' => (int) $h['shift_id'], 'shift_name' => $h['shift_name'],
            'situation' => $h['situation'], 'background' => $h['background'], 'assessment' => $h['assessment'], 'recommendation' => $h['recommendation'],
            'written_by' => $h['written_by'] !== null ? (int) $h['written_by'] : null, 'written_by_name' => $h['written_by'] ? $h['written_by_name'] : null,
            'written_at' => $h['written_at'], 'updated_at' => $h['updated_at'],
            'received_by_name' => $h['received_by'] ? $h['received_by_name'] : null, 'received_at' => $h['received_at'],
        ];
    }

    /** admission_id => {id, received, written_by_name} for one shift */
    private function handoverMap(PDO $db, array $admissionIds, string $date, int $shiftId): array
    {
        if (!$admissionIds) {
            return [];
        }
        $stmt = $db->prepare(
            "SELECT h.id, h.admission_id, h.received_at, " . self::userNameSql('h.written_by') . " AS written_by_name, " . self::userNameSql('h.received_by') . " AS received_by_name
             FROM nurse_handovers h WHERE h.shift_date = :d AND h.shift_id = :s AND h.admission_id IN (" . implode(',', array_map('intval', $admissionIds)) . ")"
        );
        $stmt->execute(['d' => $date, 's' => $shiftId]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $h) {
            $out[(int) $h['admission_id']] = ['id' => (int) $h['id'], 'received' => $h['received_at'] !== null, 'received_at' => $h['received_at'],
                'written_by_name' => $h['written_by_name'], 'received_by_name' => $h['received_at'] ? $h['received_by_name'] : null];
        }
        return $out;
    }

    /** Nurses / CNAs linked to the ward, with how many patients each has that shift (all wards). */
    private function wardStaff(PDO $db, int $wardId, string $date, int $shiftId): array
    {
        $stmt = $db->prepare(
            "SELECT u.id, r.name AS role, " . self::userNameSql('u.id') . " AS name, x.is_primary,
                    (SELECT COUNT(*) FROM nurse_patient_assignments n WHERE n.shift_date = :d AND n.shift_id = :s AND n.nurse_user_id = u.id) AS as_nurse,
                    (SELECT COUNT(*) FROM nurse_patient_assignments n WHERE n.shift_date = :d2 AND n.shift_id = :s2 AND n.cna_user_id = u.id) AS as_cna
             FROM nurse_ward_assignments x
             JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL
             JOIN roles r ON r.id = u.role_id
             WHERE x.ward_id = :w AND r.name IN ('nurse', 'charge_nurse', 'cna')
             ORDER BY FIELD(r.name, 'charge_nurse', 'nurse', 'cna'), name"
        );
        $stmt->execute(['d' => $date, 's' => $shiftId, 'd2' => $date, 's2' => $shiftId, 'w' => $wardId]);
        return array_map(fn($r) => [
            'user_id' => (int) $r['id'], 'name' => $r['name'], 'role' => $r['role'], 'role_label' => RoleAccess::label($r['role']),
            'kind' => $r['role'] === 'cna' ? 'cna' : 'nurse', 'main_ward' => (int) $r['is_primary'] === 1,
            'load' => $r['role'] === 'cna' ? (int) $r['as_cna'] : (int) $r['as_nurse'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function assignedUsers(PDO $db, int $wardId, string $date, int $shiftId): array
    {
        $stmt = $db->prepare(
            "SELECT nurse_user_id, cna_user_id, admission_id FROM nurse_patient_assignments WHERE ward_id = :w AND shift_date = :d AND shift_id = :s"
        );
        $stmt->execute(['w' => $wardId, 'd' => $date, 's' => $shiftId]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            foreach (['nurse_user_id', 'cna_user_id'] as $c) {
                if ($r[$c]) {
                    $out[(int) $r[$c]][] = (int) $r['admission_id'];
                }
            }
        }
        foreach ($out as &$list) {
            sort($list);
        }
        return $out;
    }

    /** Tell each person whose patient list for the shift changed (one alert per person per shift, replaced on change). */
    private function notify(PDO $db, array $before, array $after, int $wardId, string $date, array $shift, int $actorId): int
    {
        $ward = (string) $db->query("SELECT ward_name FROM hospital_wards WHERE id = " . (int) $wardId)->fetchColumn();
        $when = date('M j', strtotime($date)) . ', ' . $shift['name'];
        $count = 0;
        foreach (array_unique(array_merge(array_keys($before), array_keys($after))) as $uid) {
            if (($before[$uid] ?? []) === ($after[$uid] ?? []) || $uid === $actorId) {
                continue;
            }
            $key = "nurse_assign:{$uid}:{$date}:{$shift['id']}:{$wardId}";
            AlertService::resolveByKey($key, $actorId, 'Assignment changed');
            $n = count($after[$uid] ?? []);
            AlertService::raise([
                'type' => 'assignment', 'urgency' => 'info',
                'title' => $n ? "{$ward}: {$n} patient" . ($n === 1 ? '' : 's') . " assigned to you — {$when}" : "{$ward}: your patients for {$when} were reassigned",
                'body' => $n ? 'Open Shift Assignments to see your patients and their hand-overs.' : 'You no longer have patients in this ward for that shift.',
                'targets' => [['user' => $uid]], 'link' => ['tab' => 'nurse_assignments'],
                'source_type' => 'nurse_patient_assignments', 'source_id' => $wardId, 'dedupe_key' => $key,
            ], $actorId);
            $count++;
        }
        return $count;
    }

    private function canManage(array $actor, int $wardId): bool
    {
        $role = (string) ($actor['role'] ?? '');
        return $role === 'admin' || ($role === 'charge_nurse' && in_array($wardId, $this->staff->wardIds((int) $actor['id']), true));
    }

    private function isChargeOf(array $actor, int $admissionId): bool
    {
        if (($actor['role'] ?? '') !== 'charge_nurse') {
            return false;
        }
        $stmt = Database::connection()->prepare("SELECT ward_id FROM inpatient_admissions WHERE id = :id");
        $stmt->execute(['id' => $admissionId]);
        return in_array((int) $stmt->fetchColumn(), $this->staff->wardIds((int) $actor['id']), true);
    }

    private function assignedNurse(int $admissionId, string $date, int $shiftId): ?int
    {
        $stmt = Database::connection()->prepare("SELECT nurse_user_id FROM nurse_patient_assignments WHERE admission_id = :a AND shift_date = :d AND shift_id = :s");
        $stmt->execute(['a' => $admissionId, 'd' => $date, 's' => $shiftId]);
        $v = $stmt->fetchColumn();
        return $v ? (int) $v : null;
    }

    /** Write a hand-over: for the current shift or the one that just ended; by its nurse, the charge nurse or an admin. */
    private function canWrite(array $actor, int $admissionId, string $date, int $shiftId): bool
    {
        $cur = $this->current();
        $prev = $this->step($cur['date'], (int) $cur['shift']['id'], -1);
        $isNowOrJustEnded = ($date === $cur['date'] && $shiftId === (int) $cur['shift']['id'])
            || ($date === $prev['date'] && $shiftId === (int) $prev['shift']['id']);
        if (!$isNowOrJustEnded) {
            return false;
        }
        return ($actor['role'] ?? '') === 'admin' || $this->isChargeOf($actor, $admissionId)
            || $this->assignedNurse($admissionId, $date, $shiftId) === (int) ($actor['id'] ?? 0);
    }

    /** Receive a hand-over: the nurse of the next shift, the charge nurse or an admin. */
    private function canReceive(array $actor, array $h): bool
    {
        if (($actor['role'] ?? '') === 'admin' || $this->isChargeOf($actor, $h['admission_id'])) {
            return true;
        }
        $next = $this->step($h['date'], $h['shift_id'], 1);
        return $next && $this->assignedNurse($h['admission_id'], $next['date'], (int) $next['shift']['id']) === (int) ($actor['id'] ?? 0);
    }

    private function editNote(array $actor, int $wardId, string $state, string $date): string
    {
        if ($state === 'past') {
            return 'This shift is over; assignments are shown as they were.';
        }
        if ($date > $this->maxDate()) {
            return 'Assignments can be made up to ' . self::DAYS_AHEAD . ' days ahead.';
        }
        return ($actor['role'] ?? '') === 'charge_nurse'
            ? 'You can assign patients in your own wards only.'
            : 'Assignments are made by the ward\'s charge nurse or an admin.';
    }

    private function shift(int $id): ?array
    {
        foreach ($this->shifts() as $s) {
            if ($s['id'] === $id) {
                return $s;
            }
        }
        return null;
    }

    private function maxDate(): string
    {
        return (string) Database::connection()->query("SELECT CURDATE() + INTERVAL " . self::DAYS_AHEAD . " DAY")->fetchColumn();
    }

    private function dbNow(): string
    {
        return (string) Database::connection()->query("SELECT NOW()")->fetchColumn();
    }

    private function validDate($v): ?string
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return null;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $v));
        return checkdate($m, $d, $y) ? $v : null;
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
