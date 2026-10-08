<?php

namespace App\Modules\CodeBlue\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use PDO;

/**
 * Code Blue (module 10, Phase 1: activation).
 *
 *   * call()    -- from the patient chart, the census or the nurse station (top bar). The location
 *                  is required: an admitted patient's ward / room / bed, or a place typed in.
 *                  A second call for the same patient or place while a code is on joins that code.
 *   * The alert (type code_blue, critical) goes at once to the code team (code_blue_team; no team
 *     set up: all doctors), the ward's nursing staff and every charge nurse. It pops up with its
 *     own siren on each screen; the room TVs on the ward and every nurse station TV show it.
 *   * respond() -- a team member taps "Responding" (or "Not responding"): that person's pop-up
 *                  closes, everyone sees who is coming. The alert itself stays open until
 *   * end()     -- the code ends (or was a false alarm): the alert closes, the TVs clear.
 */
class CodeBlueService
{
    /** Anyone on staff may call a code. */
    public const CALL_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna', 'pharmacist', 'lab_technician', 'receptionist', 'staff', 'accountant'];
    /** Who may end a code (besides the person who called it and the code team). */
    private const END_ROLES = ['admin', 'doctor', 'clinician', 'charge_nurse'];
    public const TEAM_ROLES = ['Team leader', 'Airway', 'Compressions', 'Medications', 'Defibrillator', 'Recorder', 'Runner'];
    /** A new call within this many minutes for the same patient / place joins the open code. */
    private const JOIN_MINUTES = 30;

    // ------------------------------------------------------------------
    // Call
    // ------------------------------------------------------------------

    /**
     * data: admission_id? | patient_id?, ward_id?, location? (required unless an admitted patient), detail?, from? (chart | census | station)
     */
    public function call(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::CALL_ROLES, true)) {
            return ['success' => false, 'message' => 'Only staff can call a Code Blue.', 'forbidden' => true];
        }
        $db = Database::connection();
        $admissionId = (int) ($data['admission_id'] ?? 0) ?: null;
        $patientId = (int) ($data['patient_id'] ?? 0) ?: null;
        $wardId = (int) ($data['ward_id'] ?? 0) ?: null;
        $bedId = null;
        $typed = trim((string) ($data['location'] ?? ''));
        $detail = trim((string) ($data['detail'] ?? ''));
        $errors = [];

        // An admitted patient: the bed is the place (unless a place is typed: the patient is elsewhere).
        if (!$admissionId && $patientId) {
            $a = $db->prepare("SELECT id FROM inpatient_admissions WHERE patient_id = :p AND status IN ('Admitted', 'Pending Discharge') ORDER BY id DESC LIMIT 1");
            $a->execute(['p' => $patientId]);
            $admissionId = (int) $a->fetchColumn() ?: null;
        }
        $location = '';
        if ($admissionId) {
            $a = $db->prepare(
                "SELECT a.patient_id, a.ward_id, a.bed_id, w.ward_name, b.room_number, b.bed_number FROM inpatient_admissions a
                 JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
                 WHERE a.id = :id AND a.status IN ('Admitted', 'Pending Discharge')"
            );
            $a->execute(['id' => $admissionId]);
            $adm = $a->fetch(PDO::FETCH_ASSOC);
            if (!$adm) {
                $errors['admission_id'] = 'That patient is not admitted. Say where the patient is.';
                $admissionId = null;
            } else {
                $patientId = $adm['patient_id'] !== null ? (int) $adm['patient_id'] : $patientId;
                if ($typed === '') {
                    $wardId = (int) $adm['ward_id'];
                    $bedId = (int) $adm['bed_id'];
                    $location = trim("{$adm['ward_name']} · {$adm['room_number']} · Bed {$adm['bed_number']}");
                }
            }
        }
        if ($location === '') {
            if ($typed === '') {
                $errors['location'] = 'Where is the Code Blue? (e.g. Main lobby, X-ray room 2, Room 305)';
            } elseif (mb_strlen($typed) > 150) {
                $errors['location'] = 'Keep the location under 150 characters.';
            }
            $wardName = null;
            if ($wardId) {
                $w = $db->prepare("SELECT ward_name FROM hospital_wards WHERE id = :id");
                $w->execute(['id' => $wardId]);
                $wardName = $w->fetchColumn() ?: null;
                if (!$wardName) {
                    $errors['ward_id'] = 'Ward not found.';
                }
            }
            $location = $wardName && stripos($typed, $wardName) === false ? "{$wardName} · {$typed}" : $typed;
        }
        if ($patientId) {
            $p = $db->prepare("SELECT id FROM patients WHERE id = :id AND deleted_at IS NULL");
            $p->execute(['id' => $patientId]);
            if (!$p->fetchColumn()) {
                $errors['patient_id'] = 'Patient not found.';
            }
        }
        if (mb_strlen($detail) > 200) {
            $errors['detail'] = 'Keep it under 200 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        // Already called for this patient / bed / place: join it (a second press must not start a second code).
        $dup = $db->prepare(
            "SELECT id FROM code_blue_events WHERE status = 'active' AND called_at >= NOW() - INTERVAL " . self::JOIN_MINUTES . " MINUTE
               AND ((:p1 IS NOT NULL AND patient_id = :p2) OR (:b1 IS NOT NULL AND bed_id = :b2) OR (location = :loc))
             ORDER BY id DESC LIMIT 1"
        );
        $dup->execute(['p1' => $patientId, 'p2' => $patientId, 'b1' => $bedId, 'b2' => $bedId, 'loc' => mb_substr($location, 0, 200)]);
        if ($existing = (int) $dup->fetchColumn()) {
            $this->respondRow($db, $existing, (int) $actor['id'], 'responding');
            return ['success' => true, 'message' => 'A Code Blue is already on for this place; you were added as responding.', 'data' => $this->show($existing) + ['joined' => true]];
        }

        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $from = in_array($data['from'] ?? '', ['chart', 'census', 'station'], true) ? $data['from'] : 'station';
        $db->prepare(
            "INSERT INTO code_blue_events (status, patient_id, admission_id, ward_id, bed_id, location, location_detail, called_from, called_by, called_at)
             VALUES ('active', :p, :a, :w, :b, :loc, :det, :f, :u, :t)"
        )->execute(['p' => $patientId, 'a' => $admissionId, 'w' => $wardId, 'b' => $bedId, 'loc' => mb_substr($location, 0, 200),
            'det' => $detail !== '' ? $detail : null, 'f' => $from, 'u' => (int) $actor['id'], 't' => $now]);
        $id = (int) $db->lastInsertId();

        $res = AlertService::raise([
            'type' => 'code_blue', 'urgency' => 'critical',
            'title' => 'CODE BLUE — ' . $location,
            'body' => ($detail !== '' ? "{$detail}. " : '') . 'Called by ' . ($this->userName($db, (int) $actor['id']) ?: 'staff') . '. Tap "Responding" if you are going.',
            'patient_id' => $patientId, 'link' => ['tab' => 'code_blue'], 'targets' => $this->targets($db, $wardId),
            'source_type' => 'code_blue_events', 'source_id' => $id, 'dedupe_key' => "codeblue:{$id}",
        ], (int) $actor['id']);
        if (!empty($res['success'])) {
            $db->prepare("UPDATE code_blue_events SET alert_id = :a WHERE id = :id")->execute(['a' => $res['data']['id'], 'id' => $id]);
        } else {
            error_log('Code Blue alert failed: ' . json_encode($res));
        }
        // The caller is there.
        $this->respondRow($db, $id, (int) $actor['id'], 'responding');
        return ['success' => true, 'message' => "Code Blue called: {$location}. The code team is alerted.", 'data' => $this->show($id)];
    }

    /** "Responding" (or "Not responding"): closes that person's pop-up; everyone sees who is coming. */
    public function respond(int $id, bool $responding, array $actor): array
    {
        $db = Database::connection();
        $e = $this->row($db, $id);
        if (!$e) {
            return ['success' => false, 'message' => 'Code Blue not found.', 'not_found' => true];
        }
        if ($e['status'] !== 'active') {
            return ['success' => false, 'message' => 'This Code Blue has ended.'];
        }
        $this->respondRow($db, $id, (int) $actor['id'], $responding ? 'responding' : 'declined');
        $ev = $this->show($id);
        return ['success' => true, 'message' => $responding ? "You're responding. {$ev['responding_count']} responding." : 'Noted: not responding.', 'data' => $ev];
    }

    /** The code is over (end_reason: ended | false_alarm): the alert closes and the TVs clear. */
    public function end(int $id, array $data, array $actor): array
    {
        $db = Database::connection();
        $e = $this->row($db, $id);
        if (!$e) {
            return ['success' => false, 'message' => 'Code Blue not found.', 'not_found' => true];
        }
        if ($e['status'] !== 'active') {
            return ['success' => false, 'message' => 'This Code Blue has already ended.'];
        }
        $uid = (int) $actor['id'];
        $onTeam = (bool) $db->query("SELECT 1 FROM code_blue_team WHERE user_id = {$uid}")->fetchColumn();
        if ((int) $e['called_by'] !== $uid && !$onTeam && !in_array($actor['role'] ?? '', self::END_ROLES, true)) {
            return ['success' => false, 'message' => 'The team leader, a doctor, the charge nurse or the person who called it ends the code.', 'forbidden' => true];
        }
        $false = ($data['reason'] ?? '') === 'false_alarm';
        $note = trim((string) ($data['note'] ?? ''));
        if ($false && $note === '') {
            return ['success' => false, 'message' => 'Say what happened (why it was a false alarm).', 'errors' => ['note' => 'Required for a false alarm.']];
        }
        $db->prepare("UPDATE code_blue_events SET status = :s, ended_at = NOW(), ended_by = :u, end_note = :n WHERE id = :id")
            ->execute(['s' => $false ? 'cancelled' : 'ended', 'u' => $uid, 'n' => $note !== '' ? mb_substr($note, 0, 500) : null, 'id' => $id]);
        AlertService::resolveByKey("codeblue:{$id}", $uid, $false ? 'False alarm' : 'Code ended');
        return ['success' => true, 'message' => $false ? 'Code Blue cancelled (false alarm).' : 'Code Blue ended.', 'data' => $this->show($id)];
    }

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    /** Codes on now (newest first), with who is responding. */
    public function active(): array
    {
        $ids = Database::connection()->query("SELECT id FROM code_blue_events WHERE status = 'active' ORDER BY id DESC")->fetchAll(PDO::FETCH_COLUMN);
        return array_map(fn($id) => $this->show((int) $id), $ids);
    }

    /** The last codes (ended or not). */
    public function history(int $limit = 30): array
    {
        $ids = Database::connection()->query("SELECT id FROM code_blue_events ORDER BY id DESC LIMIT " . max(1, min(200, $limit)))->fetchAll(PDO::FETCH_COLUMN);
        return array_map(fn($id) => $this->show((int) $id), $ids);
    }

    public function show(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT e.*, " . self::nameSql('e.called_by') . " AS called_by_name, " . self::nameSql('e.ended_by') . " AS ended_by_name,
                    TIMESTAMPDIFF(SECOND, e.called_at, COALESCE(e.ended_at, NOW())) AS seconds,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name, p.patient_no
             FROM code_blue_events e LEFT JOIN patients p ON p.id = e.patient_id WHERE e.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $e = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$e) {
            return null;
        }
        $r = $db->prepare(
            "SELECT r.user_id, r.response, r.responded_at, " . self::nameSql('r.user_id') . " AS name, t.team_role, ro.name AS role
             FROM code_blue_responders r LEFT JOIN code_blue_team t ON t.user_id = r.user_id
             LEFT JOIN users u ON u.id = r.user_id LEFT JOIN roles ro ON ro.id = u.role_id
             WHERE r.event_id = :id ORDER BY r.response = 'responding' DESC, r.responded_at"
        );
        $r->execute(['id' => $id]);
        $people = array_map(fn($x) => ['user_id' => (int) $x['user_id'], 'name' => $x['name'], 'response' => $x['response'], 'responded_at' => $x['responded_at'],
            'team_role' => $x['team_role'], 'role' => $x['role']], $r->fetchAll(PDO::FETCH_ASSOC));
        return [
            'id' => (int) $e['id'], 'status' => $e['status'], 'location' => $e['location'], 'detail' => $e['location_detail'],
            'patient_id' => $e['patient_id'] !== null ? (int) $e['patient_id'] : null, 'patient_name' => $e['patient_id'] ? ($e['patient_name'] ?: null) : null,
            'patient_no' => $e['patient_no'], 'admission_id' => $e['admission_id'] !== null ? (int) $e['admission_id'] : null,
            'ward_id' => $e['ward_id'] !== null ? (int) $e['ward_id'] : null, 'bed_id' => $e['bed_id'] !== null ? (int) $e['bed_id'] : null,
            'called_from' => $e['called_from'], 'called_by' => (int) $e['called_by'], 'called_by_name' => $e['called_by_name'], 'called_at' => $e['called_at'],
            'alert_id' => $e['alert_id'] !== null ? (int) $e['alert_id'] : null,
            'ended_at' => $e['ended_at'], 'ended_by_name' => $e['ended_at'] ? $e['ended_by_name'] : null, 'end_note' => $e['end_note'],
            'seconds' => (int) $e['seconds'],
            'responders' => $people, 'responding_count' => count(array_filter($people, fn($p) => $p['response'] === 'responding')),
        ];
    }

    /** For the TVs: the newest code on now, on this ward (room TV) or anywhere (nurse station). */
    public function forTv(?int $wardId, ?int $bedId, bool $anyWard): ?array
    {
        $db = Database::connection();
        $rows = $db->query(
            "SELECT id, ward_id, bed_id, location, called_at FROM code_blue_events
             WHERE status = 'active' AND called_at >= NOW() - INTERVAL 2 HOUR ORDER BY id DESC LIMIT 20"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            // Room TVs: their own ward's codes, and codes with no ward (a public place).
            if (!$anyWard && $wardId && $r['ward_id'] !== null && (int) $r['ward_id'] !== $wardId) {
                continue;
            }
            $count = (int) $db->query("SELECT COUNT(*) FROM code_blue_responders WHERE event_id = {$r['id']} AND response = 'responding'")->fetchColumn();
            return [
                'id' => (int) $r['id'], 'called_at' => $r['called_at'], 'location' => $r['location'],
                'here' => $bedId && $r['bed_id'] !== null && (int) $r['bed_id'] === $bedId,
                'same_ward' => $wardId && $r['ward_id'] !== null && (int) $r['ward_id'] === $wardId,
                'responding' => $count,
            ];
        }
        return null;
    }

    // ------------------------------------------------------------------
    // The code team (admin)
    // ------------------------------------------------------------------

    public function team(): array
    {
        $db = Database::connection();
        $rows = $db->query(
            "SELECT t.user_id, t.team_role, t.added_at, " . self::nameSql('t.user_id') . " AS name, r.name AS role
             FROM code_blue_team t JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL LEFT JOIN roles r ON r.id = u.role_id
             ORDER BY FIELD(t.team_role, '" . implode("','", self::TEAM_ROLES) . "'), name"
        )->fetchAll(PDO::FETCH_ASSOC);
        $staff = $db->query(
            "SELECT u.id, " . self::nameSql('u.id') . " AS name, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician', 'nurse', 'charge_nurse', 'cna', 'pharmacist') ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
        return [
            'members' => array_map(fn($m) => ['user_id' => (int) $m['user_id'], 'name' => $m['name'], 'role' => $m['role'], 'team_role' => $m['team_role'], 'added_at' => $m['added_at']], $rows),
            'staff' => array_map(fn($s) => ['id' => (int) $s['id'], 'name' => $s['name'], 'role' => $s['role']], $staff),
            'team_roles' => self::TEAM_ROLES,
        ];
    }

    public function addMember(int $userId, string $teamRole, array $actor): array
    {
        $db = Database::connection();
        $u = $db->prepare("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.deleted_at IS NULL AND r.name <> 'patient'");
        $u->execute(['id' => $userId]);
        if (!$u->fetchColumn()) {
            return ['success' => false, 'message' => 'Choose a staff member.', 'errors' => ['user_id' => 'Choose a staff member.']];
        }
        $teamRole = trim($teamRole);
        if ($teamRole !== '' && !in_array($teamRole, self::TEAM_ROLES, true)) {
            return ['success' => false, 'message' => 'Unknown team role.', 'errors' => ['team_role' => 'Unknown.']];
        }
        $db->prepare(
            "INSERT INTO code_blue_team (user_id, team_role, added_by, added_at) VALUES (:u, :r, :by, NOW())
             ON DUPLICATE KEY UPDATE team_role = VALUES(team_role)"
        )->execute(['u' => $userId, 'r' => $teamRole !== '' ? $teamRole : null, 'by' => (int) $actor['id']]);
        return ['success' => true, 'message' => 'Added to the code team.', 'data' => $this->team()];
    }

    public function removeMember(int $userId): array
    {
        Database::connection()->prepare("DELETE FROM code_blue_team WHERE user_id = :u")->execute(['u' => $userId]);
        return ['success' => true, 'message' => 'Removed from the code team.', 'data' => $this->team()];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** The code team (no team: all doctors), the ward's nursing staff, every charge nurse (the nurse stations). */
    private function targets(PDO $db, ?int $wardId): array
    {
        $t = [];
        $team = array_map('intval', $db->query("SELECT t.user_id FROM code_blue_team t JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL")->fetchAll(PDO::FETCH_COLUMN));
        foreach ($team as $u) {
            $t[] = ['user' => $u];
        }
        if (!$team) {
            $t[] = ['role' => 'doctor'];
        }
        if ($wardId) {
            $stmt = $db->prepare("SELECT x.user_id FROM nurse_ward_assignments x JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL WHERE x.ward_id = :w");
            $stmt->execute(['w' => $wardId]);
            foreach (array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN)) as $u) {
                if (!in_array($u, $team, true)) {
                    $t[] = ['user' => $u];
                }
            }
        } else {
            $t[] = ['role' => 'nurse'];
        }
        $t[] = ['role' => 'charge_nurse'];
        return $t;
    }

    private function respondRow(PDO $db, int $eventId, int $userId, string $response): void
    {
        $db->prepare(
            "INSERT INTO code_blue_responders (event_id, user_id, response, responded_at) VALUES (:e, :u, :r, NOW())
             ON DUPLICATE KEY UPDATE responded_at = IF(response = VALUES(response), responded_at, NOW()), response = VALUES(response)"
        )->execute(['e' => $eventId, 'u' => $userId, 'r' => $response]);
        // That person's pop-up closes (the alert itself stays open for the others until the code ends).
        $alertId = $db->query("SELECT alert_id FROM code_blue_events WHERE id = {$eventId}")->fetchColumn();
        if ($alertId) {
            $db->prepare(
                "INSERT INTO alert_receipts (alert_id, user_id, delivered_at, seen_at, read_at, acknowledged_at) VALUES (:a, :u, NOW(), NOW(), NOW(), NOW())
                 ON DUPLICATE KEY UPDATE seen_at = COALESCE(seen_at, NOW()), read_at = COALESCE(read_at, NOW()), acknowledged_at = COALESCE(acknowledged_at, NOW())"
            )->execute(['a' => $alertId, 'u' => $userId]);
        }
    }

    private function row(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare("SELECT * FROM code_blue_events WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function userName(PDO $db, int $id): ?string
    {
        $stmt = $db->prepare("SELECT " . self::nameSql(':id'));
        $stmt->execute(['id' => $id]);
        return $stmt->fetchColumn() ?: null;
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
