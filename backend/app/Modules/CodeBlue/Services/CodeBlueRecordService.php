<?php

namespace App\Modules\CodeBlue\Services;

use App\Core\Database;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

/**
 * Code Blue (module 10, Phase 2: the code record).
 *
 *   * add()     -- one tap per event, stamped with the DB clock: CPR start / stop, pulse check,
 *                  rhythm, shock (joules), drug + dose + unit + route, airway, a note.
 *                  The same tap by the same person within a few seconds is a double tap: not added twice.
 *   * fix()     -- correct an entry's time (the original is kept) or strike it out (mistap). Nothing is deleted.
 *   * outcome() -- return of circulation, transfer to ICU, or died, with its time
 *                  (set when the code ends; corrected afterwards on the record).
 *   * forEvent() -- the entries plus a running summary (CPR on/off, shocks, adrenaline count and
 *                  time since the last dose, the latest rhythm and airway).
 * Who may record: whoever may end the code, and anyone who tapped "Responding".
 * The record stays open for corrections and late entries until RECORD_HOURS after the code ends.
 */
class CodeBlueRecordService
{
    public const RHYTHMS = ['VF', 'pVT', 'PEA', 'Asystole', 'Sinus / organised', 'Other'];
    public const AIRWAYS = ['Bag-mask', 'Oral / nasal airway', 'Supraglottic airway', 'Intubated (ETT)', 'ETCO2 confirmed', 'Suction'];
    public const UNITS = ['mg', 'mcg', 'g', 'mEq', 'mmol', 'mL', 'units'];
    public const ROUTES = ['IV', 'IO', 'ETT', 'IM', 'Other'];
    public const ENERGIES = [120, 150, 200, 300, 360];
    /** The one-tap drug buttons (adult ACLS doses); anything else goes through "Other drug". */
    public const DRUGS = [
        ['name' => 'Adrenaline (epinephrine)', 'dose' => 1, 'unit' => 'mg', 'route' => 'IV'],
        ['name' => 'Amiodarone', 'dose' => 300, 'unit' => 'mg', 'route' => 'IV'],
        ['name' => 'Amiodarone', 'dose' => 150, 'unit' => 'mg', 'route' => 'IV'],
        ['name' => 'Lidocaine', 'dose' => 100, 'unit' => 'mg', 'route' => 'IV'],
        ['name' => 'Atropine', 'dose' => 1, 'unit' => 'mg', 'route' => 'IV'],
        ['name' => 'Calcium chloride 10%', 'dose' => 1, 'unit' => 'g', 'route' => 'IV'],
        ['name' => 'Magnesium sulfate', 'dose' => 2, 'unit' => 'g', 'route' => 'IV'],
        ['name' => 'Sodium bicarbonate 8.4%', 'dose' => 50, 'unit' => 'mEq', 'route' => 'IV'],
        ['name' => 'Dextrose 50%', 'dose' => 50, 'unit' => 'mL', 'route' => 'IV'],
        ['name' => 'Naloxone', 'dose' => 0.4, 'unit' => 'mg', 'route' => 'IV'],
    ];
    public const KINDS = ['cpr_start', 'cpr_stop', 'pulse_check', 'rhythm', 'shock', 'drug', 'airway', 'note'];
    public const OUTCOMES = ['rosc' => 'Return of circulation (ROSC)', 'icu' => 'Transferred to ICU', 'died' => 'Died'];
    /** Corrections and late entries are allowed until this long after the code ends. */
    public const RECORD_HOURS = 24;
    /** An entry may be timed up to this long before the code was called (CPR started before the call). */
    private const BEFORE_CALL_MINUTES = 30;
    private const DOUBLE_TAP_SECONDS = 3;

    // ------------------------------------------------------------------
    // Recording
    // ------------------------------------------------------------------

    /** data: id, kind, value?, dose?, unit?, route?, energy?, note?, time? (HH:MM[:SS], blank = now) */
    public function add(array $data, array $actor): array
    {
        $db = Database::connection();
        $e = $this->event($db, (int) ($data['id'] ?? 0));
        if (!$e) {
            return ['success' => false, 'message' => 'Code Blue not found.', 'not_found' => true];
        }
        if ($deny = $this->denied($db, $e, $actor)) {
            return $deny;
        }
        $kind = (string) ($data['kind'] ?? '');
        if (!in_array($kind, self::KINDS, true)) {
            return ['success' => false, 'message' => 'Unknown entry.', 'errors' => ['kind' => 'Unknown.']];
        }
        $value = trim((string) ($data['value'] ?? ''));
        $note = trim((string) ($data['note'] ?? ''));
        $row = ['value' => null, 'dose' => null, 'unit' => null, 'route' => null, 'energy_j' => null];
        $errors = [];
        switch ($kind) {
            case 'rhythm':
                if (!in_array($value, self::RHYTHMS, true)) {
                    $errors['value'] = 'Choose the rhythm.';
                } elseif ($value === 'Other' && $note === '') {
                    $errors['note'] = 'Say which rhythm.';
                }
                $row['value'] = $value;
                break;
            case 'airway':
                if (!in_array($value, self::AIRWAYS, true)) {
                    $errors['value'] = 'Choose the airway.';
                }
                $row['value'] = $value;
                break;
            case 'shock':
                $j = (int) ($data['energy'] ?? 0);
                if ($j < 1 || $j > 400) {
                    $errors['energy'] = 'Energy in joules (1–400).';
                }
                $row['energy_j'] = $j;
                break;
            case 'drug':
                $dose = $data['dose'] ?? '';
                if ($value === '' || mb_strlen($value) > 80) {
                    $errors['value'] = 'Which drug?';
                }
                if (!is_numeric($dose) || (float) $dose <= 0 || (float) $dose > 100000) {
                    $errors['dose'] = 'Dose (a number).';
                }
                if (!in_array($data['unit'] ?? '', self::UNITS, true)) {
                    $errors['unit'] = 'Choose the unit.';
                }
                if (!in_array($data['route'] ?? '', self::ROUTES, true)) {
                    $errors['route'] = 'Choose the route.';
                }
                $row = ['value' => $value, 'dose' => is_numeric($dose) ? round((float) $dose, 3) : null, 'unit' => $data['unit'] ?? null, 'route' => $data['route'] ?? null, 'energy_j' => null];
                break;
            case 'note':
                if ($note === '') {
                    $errors['note'] = 'Write the note.';
                }
                break;
        }
        if (mb_strlen($note) > 300) {
            $errors['note'] = 'Keep it under 300 characters.';
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $at = $this->resolveTime((string) ($data['time'] ?? ''), $e['called_at'], $now, self::BEFORE_CALL_MINUTES);
        if ($at === null) {
            $errors['time'] = 'That time is outside this code.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        // A double tap: the same entry by the same person a moment ago.
        if (trim((string) ($data['time'] ?? '')) === '') {
            $dup = $db->prepare(
                "SELECT id FROM code_blue_record WHERE event_id = :e AND recorded_by = :u AND kind = :k AND voided_at IS NULL
                   AND COALESCE(value, '') = :v AND COALESCE(energy_j, 0) = :j AND COALESCE(dose, 0) = :d
                   AND recorded_at >= NOW() - INTERVAL " . self::DOUBLE_TAP_SECONDS . " SECOND LIMIT 1"
            );
            $dup->execute(['e' => $e['id'], 'u' => (int) $actor['id'], 'k' => $kind, 'v' => (string) $row['value'], 'j' => (int) $row['energy_j'], 'd' => (float) $row['dose']]);
            if ($dup->fetchColumn()) {
                return ['success' => true, 'message' => 'Already recorded.', 'data' => $this->forEvent((int) $e['id'])];
            }
        }
        $db->prepare(
            "INSERT INTO code_blue_record (event_id, kind, value, dose, unit, route, energy_j, note, event_at, recorded_by, recorded_at)
             VALUES (:e, :k, :v, :d, :un, :r, :j, :n, :at, :u, NOW())"
        )->execute(['e' => $e['id'], 'k' => $kind, 'v' => $row['value'], 'd' => $row['dose'], 'un' => $row['unit'], 'r' => $row['route'],
            'j' => $row['energy_j'], 'n' => $note !== '' ? $note : null, 'at' => $at, 'u' => (int) $actor['id']]);
        $entry = ['kind' => $kind] + $row + ['note' => $note];
        return ['success' => true, 'message' => self::label($entry) . ' — ' . substr($at, 11, 8), 'data' => $this->forEvent((int) $e['id'])];
    }

    /** data: entry_id, and either time (HH:MM[:SS]) or remove (1) + reason? */
    public function fix(array $data, array $actor): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM code_blue_record WHERE id = :id");
        $stmt->execute(['id' => (int) ($data['entry_id'] ?? 0)]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            return ['success' => false, 'message' => 'Entry not found.', 'not_found' => true];
        }
        $e = $this->event($db, (int) $r['event_id']);
        if ($deny = $this->denied($db, $e, $actor)) {
            return $deny;
        }
        if ($r['voided_at'] !== null) {
            return ['success' => false, 'message' => 'That entry was already struck out.'];
        }
        $uid = (int) $actor['id'];
        if (!empty($data['remove']) && (string) $data['remove'] !== '0') {
            $reason = trim((string) ($data['reason'] ?? ''));
            $db->prepare("UPDATE code_blue_record SET voided_at = NOW(), voided_by = :u, void_reason = :why WHERE id = :id")
                ->execute(['u' => $uid, 'why' => $reason !== '' ? mb_substr($reason, 0, 200) : null, 'id' => $r['id']]);
            return ['success' => true, 'message' => 'Struck out: ' . self::label($r) . '.', 'data' => $this->forEvent((int) $e['id'])];
        }
        $t = trim((string) ($data['time'] ?? ''));
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $at = $t === '' ? null : $this->resolveTime($t, $e['called_at'], $now, self::BEFORE_CALL_MINUTES);
        if ($at === null) {
            return ['success' => false, 'message' => $t === '' ? 'Enter the time.' : 'That time is outside this code.', 'errors' => ['time' => 'Check the time.']];
        }
        if ($at === $r['event_at']) {
            return ['success' => true, 'message' => 'No change.', 'data' => $this->forEvent((int) $e['id'])];
        }
        $db->prepare(
            "UPDATE code_blue_record SET original_event_at = COALESCE(original_event_at, event_at), event_at = :at, edited_by = :u, edited_at = NOW() WHERE id = :id"
        )->execute(['at' => $at, 'u' => $uid, 'id' => $r['id']]);
        return ['success' => true, 'message' => 'Time corrected to ' . substr($at, 11, 8) . '.', 'data' => $this->forEvent((int) $e['id'])];
    }

    /**
     * Check an outcome (used by CodeBlueService::end and outcome()).
     * Returns [outcome, outcome_at] or ['errors' => ...].
     */
    public function checkOutcome(array $data, string $calledAt, string $now): array
    {
        $o = (string) ($data['outcome'] ?? '');
        $errors = [];
        if (!isset(self::OUTCOMES[$o])) {
            $errors['outcome'] = 'Choose the outcome: return of circulation, transfer to ICU, or died.';
        }
        $at = $this->resolveTime((string) ($data['outcome_time'] ?? ''), $calledAt, $now, 0);
        if ($at === null) {
            $errors['outcome_time'] = $o === 'died' ? 'The time of death must be during this code (not in the future).' : 'The time must be during this code (not in the future).';
        }
        return $errors ? ['errors' => $errors] : [$o, $at];
    }

    /** Correct the outcome / its time after the code ended. data: id, outcome, outcome_time */
    public function outcome(array $data, array $actor): array
    {
        $db = Database::connection();
        $e = $this->event($db, (int) ($data['id'] ?? 0));
        if (!$e) {
            return ['success' => false, 'message' => 'Code Blue not found.', 'not_found' => true];
        }
        if ($e['status'] !== 'ended') {
            return ['success' => false, 'message' => $e['status'] === 'active' ? 'End the code to record the outcome.' : 'A false alarm has no outcome.'];
        }
        if ($deny = $this->denied($db, $e, $actor, true)) {
            return $deny;
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $chk = $this->checkOutcome($data, $e['called_at'], $now);
        if (isset($chk['errors'])) {
            return ['success' => false, 'message' => reset($chk['errors']), 'errors' => $chk['errors']];
        }
        [$o, $at] = $chk;
        $db->prepare("UPDATE code_blue_events SET outcome = :o, outcome_at = :at, outcome_by = :u, outcome_set_at = NOW() WHERE id = :id")
            ->execute(['o' => $o, 'at' => $at, 'u' => (int) $actor['id'], 'id' => $e['id']]);
        return ['success' => true, 'message' => 'Outcome saved: ' . self::OUTCOMES[$o] . ', ' . substr($at, 11, 5) . '.', 'data' => $this->forEvent((int) $e['id'])];
    }

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    /** The record (oldest first) and a running summary. */
    public function forEvent(int $eventId): array
    {
        $db = Database::connection();
        $e = $this->event($db, $eventId);
        if (!$e) {
            return ['entries' => [], 'summary' => null];
        }
        $stmt = $db->prepare(
            "SELECT r.*, TIMESTAMPDIFF(SECOND, :c, r.event_at) AS offset_s, TIMESTAMPDIFF(SECOND, r.event_at, COALESCE(:end, NOW())) AS ago_s,
                    " . self::nameSql('r.recorded_by') . " AS by_name, " . self::nameSql('r.voided_by') . " AS voided_by_name
             FROM code_blue_record r WHERE r.event_id = :e ORDER BY r.event_at, r.id"
        );
        $stmt->execute(['c' => $e['called_at'], 'end' => $e['ended_at'], 'e' => $eventId]);
        $entries = [];
        $sum = ['cpr_on' => false, 'cpr_since_s' => null, 'cpr_total_s' => 0, 'pulse_checks' => 0, 'shocks' => 0, 'last_energy' => null,
            'adrenaline' => 0, 'adrenaline_ago_s' => null, 'drugs' => 0, 'rhythm' => null, 'rhythm_ago_s' => null, 'airway' => null];
        $cprStartAgo = null;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $void = $r['voided_at'] !== null;
            $entries[] = [
                'id' => (int) $r['id'], 'kind' => $r['kind'], 'label' => self::label($r), 'value' => $r['value'],
                'dose' => $r['dose'] !== null ? (float) $r['dose'] : null, 'unit' => $r['unit'], 'route' => $r['route'],
                'energy_j' => $r['energy_j'] !== null ? (int) $r['energy_j'] : null, 'note' => $r['note'],
                'event_at' => $r['event_at'], 'offset_s' => (int) $r['offset_s'],
                'recorded_at' => $r['recorded_at'], 'by_name' => $r['by_name'],
                // Entered more than 2 minutes after it happened (a late entry or a corrected time).
                'late' => strtotime($r['recorded_at']) - strtotime($r['event_at']) > 120,
                'original_event_at' => $r['original_event_at'],
                'voided' => $void, 'voided_by_name' => $void ? $r['voided_by_name'] : null, 'void_reason' => $r['void_reason'],
            ];
            if ($void) {
                continue;
            }
            $ago = (int) $r['ago_s'];
            switch ($r['kind']) {
                case 'cpr_start':
                    if (!$sum['cpr_on']) {
                        $sum['cpr_on'] = true;
                        $cprStartAgo = $ago;
                    }
                    break;
                case 'cpr_stop':
                    if ($sum['cpr_on']) {
                        $sum['cpr_total_s'] += max(0, $cprStartAgo - $ago);
                        $sum['cpr_on'] = false;
                    }
                    break;
                case 'pulse_check':
                    $sum['pulse_checks']++;
                    break;
                case 'shock':
                    $sum['shocks']++;
                    $sum['last_energy'] = (int) $r['energy_j'];
                    break;
                case 'drug':
                    $sum['drugs']++;
                    if (preg_match('/adrenaline|epinephrine/i', (string) $r['value'])) {
                        $sum['adrenaline']++;
                        $sum['adrenaline_ago_s'] = $ago;
                    }
                    break;
                case 'rhythm':
                    $sum['rhythm'] = $r['value'] === 'Other' && $r['note'] ? $r['note'] : $r['value'];
                    $sum['rhythm_ago_s'] = $ago;
                    break;
                case 'airway':
                    $sum['airway'] = $r['value'];
                    break;
            }
        }
        if ($sum['cpr_on']) {
            $sum['cpr_since_s'] = $cprStartAgo;
            $sum['cpr_total_s'] += max(0, $cprStartAgo);
        }
        return ['entries' => $entries, 'summary' => $sum];
    }

    /** Whether this person may add to / correct the record now. */
    public function canRecord(int $eventId, array $actor): bool
    {
        $db = Database::connection();
        $e = $this->event($db, $eventId);
        return $e && !$this->denied($db, $e, $actor);
    }

    /** The choices for the record buttons. */
    public static function options(): array
    {
        return ['rhythms' => self::RHYTHMS, 'airways' => self::AIRWAYS, 'units' => self::UNITS, 'routes' => self::ROUTES,
            'energies' => self::ENERGIES, 'drugs' => self::DRUGS, 'outcomes' => self::OUTCOMES, 'record_hours' => self::RECORD_HOURS];
    }

    public static function label(array $r): string
    {
        $num = fn($d) => rtrim(rtrim(number_format((float) $d, 3, '.', ''), '0'), '.');
        switch ($r['kind']) {
            case 'cpr_start': return 'CPR started';
            case 'cpr_stop': return 'CPR stopped';
            case 'pulse_check': return 'Pulse check';
            case 'rhythm': return 'Rhythm: ' . ($r['value'] === 'Other' && !empty($r['note']) ? $r['note'] : $r['value']);
            case 'shock': return 'Shock ' . (int) $r['energy_j'] . ' J';
            case 'drug': return trim("{$r['value']} " . $num($r['dose']) . " {$r['unit']} {$r['route']}");
            case 'airway': return 'Airway: ' . $r['value'];
            case 'note': return 'Note';
        }
        return (string) $r['kind'];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /**
     * Whether the actor may record on this code: anyone who may end it, or who tapped "Responding";
     * open while the code is on and for RECORD_HOURS after it ended.
     */
    private function denied(PDO $db, ?array $e, array $actor, bool $outcome = false): ?array
    {
        if (!$e) {
            return ['success' => false, 'message' => 'Code Blue not found.', 'not_found' => true];
        }
        if ($e['status'] !== 'active') {
            $st = $db->prepare("SELECT :t >= NOW() - INTERVAL " . self::RECORD_HOURS . " HOUR");
            $st->execute(['t' => $e['ended_at']]);
            if (!$st->fetchColumn()) {
                return ['success' => false, 'message' => 'This code record is closed (' . self::RECORD_HOURS . ' hours after the code ended).'];
            }
        }
        $uid = (int) ($actor['id'] ?? 0);
        if (CodeBlueService::mayEnd($db, $e, $actor)) {
            return null;
        }
        if (!$outcome) {
            $st = $db->prepare("SELECT 1 FROM code_blue_responders WHERE event_id = :e AND user_id = :u AND response = 'responding'");
            $st->execute(['e' => $e['id'], 'u' => $uid]);
            if ($st->fetchColumn()) {
                return null;
            }
        }
        return ['success' => false, 'message' => $outcome
            ? 'The team leader, a doctor, the charge nurse or the person who called it records the outcome.'
            : 'Tap "Responding" first: the code record is kept by the people at the code.', 'forbidden' => true];
    }

    private function event(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare("SELECT * FROM code_blue_events WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * A clock time (HH:MM[:SS]) on this code's timeline: the day is taken from the call
     * (a code across midnight goes to the next day). Blank = now.
     * Allowed from $beforeMin minutes before the call up to now; null if outside.
     */
    public function resolveTime(string $t, string $calledAt, string $now, int $beforeMin): ?string
    {
        $t = trim($t);
        if ($t === '') {
            return $now;
        }
        if (!preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $t, $m) || (int) $m[1] > 23 || (int) $m[2] > 59 || (int) ($m[3] ?? 0) > 59) {
            return null;
        }
        $utc = new DateTimeZone('UTC');
        $call = new DateTimeImmutable($calledAt, $utc);
        $nowDt = new DateTimeImmutable($now, $utc);
        $from = $call->modify("-{$beforeMin} minutes");
        $hms = sprintf('%02d:%02d:%02d', $m[1], $m[2], $m[3] ?? 0);
        // Without seconds, a time in the current minute still counts (e.g. "14:05" at 14:05:30).
        $slack = isset($m[3]) ? 0 : 59;
        $best = null;
        foreach ([-1, 0, 1, 2] as $d) {
            $c = new DateTimeImmutable($call->modify("{$d} day")->format('Y-m-d') . ' ' . $hms, $utc);
            if ($c >= $from->modify('-' . $slack . ' seconds') && $c <= $nowDt) {
                $best = $c;   // the latest candidate inside the window
            }
        }
        if ($best === null) {
            return null;
        }
        // "14:05" typed during 14:05 for a code called at 14:05:20: not before the window start.
        return ($best < $from ? $from : $best)->format('Y-m-d H:i:s');
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
