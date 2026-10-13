<?php

namespace App\Modules\Icu\Services;

use App\Core\Database;
use PDO;

/**
 * ICU (module 13, Phase 3): lines, tubes and drains of an admission -- put in (when, where, by whom; the central
 * line insertion bundle), taken out (when and why), or voided when charted in error. Days in place count like the
 * CDC/NHSN device days: the day it goes in is day 1, every calendar day it is in counts.
 *
 *   * Central line days: CVC, PICC and dialysis catheters (several on the same day count once) -> CLABSI.
 *   * Urinary catheter days -> CAUTI. Ventilator days come from the flowsheet (an hour charted on a ventilator) -> VAP.
 *   * deviceDaysForCase() -- the device days of one patient up to an infection's onset, for the HAI/SSI form.
 */
class IcuLinesService
{
    /** kind => [label, short, group, usual sites] */
    public const KINDS = [
        'cvc' => ['Central venous catheter (CVC)', 'CVC', 'central', ['Internal jugular', 'Subclavian', 'Femoral']],
        'picc' => ['PICC line', 'PICC', 'central', ['Basilic', 'Brachial', 'Cephalic']],
        'dialysis' => ['Dialysis catheter', 'HD catheter', 'central', ['Internal jugular', 'Femoral', 'Subclavian']],
        'arterial' => ['Arterial line', 'Art line', 'arterial', ['Radial', 'Femoral', 'Brachial', 'Dorsalis pedis']],
        'urinary' => ['Urinary catheter', 'Urinary cath', 'urinary', ['Urethral', 'Suprapubic']],
        'ett' => ['Endotracheal tube', 'ETT', 'airway', ['Oral', 'Nasal']],
        'trach' => ['Tracheostomy', 'Trach', 'airway', []],
        'chest_drain' => ['Chest drain', 'Chest drain', 'drain', ['Pleural', 'Mediastinal']],
        'ngt' => ['Nasogastric / feeding tube', 'NG tube', 'tube', ['Nasal', 'Oral']],
        'other' => ['Other line, tube or drain', 'Other', 'other', []],
    ];
    public const WHERE = ['icu' => 'In the ICU', 'or' => 'In the OR', 'er' => 'In the ER', 'ward' => 'On a ward', 'outside' => 'Another hospital'];
    public const REMOVE_REASONS = ['not_needed' => 'No longer needed', 'not_working' => 'Blocked / not working', 'infection' => 'Suspected infection',
        'accidental' => 'Came out by accident', 'replaced' => 'Replaced (new line charted)', 'died' => 'Patient died', 'other' => 'Other'];
    /** Days after which a line is flagged "still needed?" (central line, urinary catheter). */
    public const REVIEW_DAYS = ['central' => 7, 'urinary' => 3];

    /** Lines of an admission (newest first), with days in place. */
    public function forAdmission(int $admissionId): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $st = $db->prepare(
            "SELECT l.*, " . IcuService::nameSql('l.inserted_by') . " AS charted_by_name, " . IcuService::nameSql('l.removed_by') . " AS removed_by_name
             FROM icu_lines l WHERE l.admission_id = :a ORDER BY l.voided_at IS NOT NULL, l.removed_at IS NOT NULL, l.inserted_at DESC, l.id DESC"
        );
        $st->execute(['a' => $admissionId]);
        return array_map(fn($l) => $this->shape($l, $now), $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Lines in place now (short form for the board and the transfer-out handover). */
    public function inPlace(PDO $db, int $admissionId, string $now): array
    {
        $st = $db->prepare("SELECT * FROM icu_lines WHERE admission_id = :a AND removed_at IS NULL AND voided_at IS NULL ORDER BY inserted_at");
        $st->execute(['a' => $admissionId]);
        return array_map(function ($l) use ($now) {
            $x = $this->shape($l, $now);
            return ['id' => $x['id'], 'kind' => $x['kind'], 'short' => $x['short'], 'group' => $x['group'], 'where' => $x['site_text'], 'day' => $x['day'], 'review' => $x['review']];
        }, $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * data: admission_id, kind, label (other), site, side (left | right), size, inserted_at (YYYY-MM-DD HH:MM, default now),
     * inserted_where (icu | or | er | ward | outside), inserted_by_name, bundle (central lines put in in the ICU: 1 | 0), notes.
     */
    public function insert(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', IcuService::RECORD_ROLES, true)) {
            return ['success' => false, 'message' => 'Lines are charted by the ICU nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $a = $this->admission($db, (int) ($data['admission_id'] ?? 0));
        if (!$a) {
            return ['success' => false, 'message' => 'This patient is not admitted.', 'not_found' => true];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $errors = [];
        $kind = (string) ($data['kind'] ?? '');
        if (!isset(self::KINDS[$kind])) {
            $errors['kind'] = 'Choose what was put in.';
        }
        $label = trim((string) ($data['label'] ?? ''));
        if ($kind === 'other' && $label === '') {
            $errors['label'] = 'What is it?';
        }
        $where = (string) ($data['inserted_where'] ?? 'icu');
        if (!isset(self::WHERE[$where])) {
            $errors['inserted_where'] = 'Where was it put in?';
        }
        $at = self::time($data['inserted_at'] ?? null, $now);
        if ($at === false) {
            $errors['inserted_at'] = 'Use a real date and time.';
        } elseif ($at > $now) {
            $errors['inserted_at'] = 'Not in the future.';
        } elseif ($where === 'icu' && substr($at, 0, 16) < substr($a['admission_date'], 0, 16)) {
            $errors['inserted_at'] = 'Before the admission: choose where it was put in.';
        }
        $side = (string) ($data['side'] ?? '');
        if ($side !== '' && !in_array($side, ['left', 'right'], true)) {
            $errors['side'] = 'Left or right.';
        }
        $central = isset(self::KINDS[$kind]) && self::KINDS[$kind][2] === 'central';
        $bundle = ($data['bundle'] ?? '') === '' || ($data['bundle'] ?? null) === null ? null : (int) (bool) $data['bundle'];
        if ($central && $where === 'icu' && $bundle === null) {
            $errors['bundle'] = 'Was the insertion bundle followed (hand hygiene, full barrier, chlorhexidine, best site, checklist)?';
        }
        foreach (['label' => 80, 'site' => 60, 'size' => 30, 'inserted_by_name' => 150, 'notes' => 500] as $k => $max) {
            if (mb_strlen(trim((string) ($data[$k] ?? ''))) > $max) {
                $errors[$k] = "At most {$max} characters.";
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $null = fn($k) => trim((string) ($data[$k] ?? '')) !== '' ? trim((string) $data[$k]) : null;
        $db->prepare(
            "INSERT INTO icu_lines (admission_id, patient_id, kind, label, site, side, size, inserted_at, inserted_where, inserted_by, inserted_by_name, bundle, notes, created_at)
             VALUES (:a, :p, :k, :l, :site, :side, :size, :at, :w, :u, :by, :b, :n, NOW())"
        )->execute(['a' => $a['id'], 'p' => $a['patient_id'], 'k' => $kind, 'l' => $null('label'), 'site' => $null('site'), 'side' => $side ?: null, 'size' => $null('size'),
            'at' => $at, 'w' => $where, 'u' => (int) $actor['id'], 'by' => $null('inserted_by_name'), 'b' => $central ? $bundle : null, 'n' => $null('notes')]);
        return ['success' => true, 'message' => self::KINDS[$kind][0] . ' charted.', 'data' => ['id' => (int) $db->lastInsertId()]];
    }

    /** data: id, removed_at (default now), reason (REMOVE_REASONS), note. */
    public function remove(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', IcuService::RECORD_ROLES, true)) {
            return ['success' => false, 'message' => 'Lines are charted by the ICU nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $l = $this->line($db, (int) ($data['id'] ?? 0));
        if (!$l || $l['voided_at'] || $l['removed_at']) {
            return ['success' => false, 'message' => 'This line is not in place.', 'not_found' => true];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $errors = [];
        $at = self::time($data['removed_at'] ?? null, $now);
        if ($at === false) {
            $errors['removed_at'] = 'Use a real date and time.';
        } elseif ($at > $now) {
            $errors['removed_at'] = 'Not in the future.';
        } elseif ($at < $l['inserted_at']) {
            $errors['removed_at'] = 'Before it was put in (' . substr($l['inserted_at'], 0, 16) . ').';
        }
        $reason = (string) ($data['reason'] ?? '');
        if (!isset(self::REMOVE_REASONS[$reason])) {
            $errors['reason'] = 'Why was it taken out?';
        }
        $note = trim((string) ($data['note'] ?? ''));
        if ($reason === 'other' && $note === '') {
            $errors['note'] = 'Say why.';
        }
        if (mb_strlen($note) > 255) {
            $errors['note'] = 'At most 255 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $db->prepare("UPDATE icu_lines SET removed_at = :at, removed_by = :u, removed_reason = :r, removed_note = :n WHERE id = :id AND removed_at IS NULL")
            ->execute(['at' => $at, 'u' => (int) $actor['id'], 'r' => $reason, 'n' => $note !== '' ? $note : null, 'id' => $l['id']]);
        $days = self::dayCount($l['inserted_at'], $at);
        return ['success' => true, 'message' => self::KINDS[$l['kind']][0] . " taken out after {$days} day" . ($days === 1 ? '' : 's') . '.'];
    }

    /** Charted in error: the person who charted it, a charge nurse or an admin. */
    public function void(int $id, string $reason, array $actor): array
    {
        $db = Database::connection();
        $l = $this->line($db, $id);
        if (!$l || $l['voided_at']) {
            return ['success' => false, 'message' => 'Line not found.', 'not_found' => true];
        }
        if ((int) $l['inserted_by'] !== (int) ($actor['id'] ?? 0) && !in_array($actor['role'] ?? '', ['admin', 'charge_nurse'], true)) {
            return ['success' => false, 'message' => 'Only the person who charted it, a charge nurse or an admin can void it.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why void it?', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE icu_lines SET voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id")->execute(['u' => (int) $actor['id'], 'r' => $reason, 'id' => $id]);
        return ['success' => true, 'message' => 'Line voided.'];
    }

    // ------------------------------------------------------------------
    // Device days
    // ------------------------------------------------------------------

    /**
     * Calendar dates (Y-m-d => true) a group of devices was in place for each admission, between $from and $to.
     * group: central | urinary | ventilator. Returns [admission_id => [date => true]].
     */
    public function dates(PDO $db, array $admissionIds, string $group, string $from, string $to): array
    {
        $out = [];
        if (!$admissionIds) {
            return $out;
        }
        $ids = implode(',', array_map('intval', $admissionIds));
        if ($group === 'ventilator') {
            $st = $db->prepare(
                "SELECT admission_id, DATE(hour_at) AS d FROM icu_hourly WHERE admission_id IN ({$ids}) AND voided_at IS NULL AND o2_device = 'ventilator'
                   AND hour_at >= :f AND hour_at <= :t GROUP BY admission_id, DATE(hour_at)"
            );
            $st->execute(['f' => $from, 't' => $to]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $out[(int) $r['admission_id']][$r['d']] = true;
            }
            return $out;
        }
        $kinds = implode(',', array_map(fn($k) => "'{$k}'", array_keys(array_filter(self::KINDS, fn($k) => $k[2] === $group))));
        $st = $db->prepare(
            "SELECT admission_id, inserted_at, removed_at FROM icu_lines WHERE admission_id IN ({$ids}) AND voided_at IS NULL AND kind IN ({$kinds})
               AND inserted_at <= :t AND (removed_at IS NULL OR removed_at >= :f)"
        );
        $st->execute(['f' => $from, 't' => $to]);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            foreach (self::range(max($r['inserted_at'], $from), min($r['removed_at'] ?? $to, $to)) as $d) {
                $out[(int) $r['admission_id']][$d] = true;
            }
        }
        return $out;
    }

    /**
     * For the HAI/SSI form: a patient's device days up to an infection's onset. type: CLABSI | CAUTI | VAP.
     * CDC/NHSN: the device counts when it was in place for more than 2 days on the date of the event, and in place
     * that day or the day before. Days run back from the onset over consecutive days with the device.
     */
    public function deviceDaysForCase(int $patientId, string $type, string $onset): array
    {
        $group = ['CLABSI' => 'central', 'CAUTI' => 'urinary', 'VAP' => 'ventilator'][$type] ?? null;
        if (!$group || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $onset)) {
            return ['found' => false, 'message' => 'Only for CLABSI, CAUTI and VAP, with an onset date.'];
        }
        $db = Database::connection();
        $dates = [];
        $detail = [];
        if ($group === 'ventilator') {
            $st = $db->prepare(
                "SELECT DISTINCT DATE(hour_at) FROM icu_hourly WHERE patient_id = :p AND voided_at IS NULL AND o2_device = 'ventilator' AND DATE(hour_at) <= :o ORDER BY 1"
            );
            $st->execute(['p' => $patientId, 'o' => $onset]);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $d) {
                $dates[$d] = true;
            }
        } else {
            $kinds = implode(',', array_map(fn($k) => "'{$k}'", array_keys(array_filter(self::KINDS, fn($k) => $k[2] === $group))));
            $st = $db->prepare(
                "SELECT * FROM icu_lines WHERE patient_id = :p AND voided_at IS NULL AND kind IN ({$kinds}) AND DATE(inserted_at) <= :o ORDER BY inserted_at"
            );
            $st->execute(['p' => $patientId, 'o' => $onset]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $l) {
                $end = $l['removed_at'] && substr($l['removed_at'], 0, 10) < $onset ? $l['removed_at'] : "{$onset} 23:59:59";
                foreach (self::range($l['inserted_at'], $end) as $d) {
                    $dates[$d] = true;
                }
                $detail[] = $l;
            }
        }
        // Count back from the onset (or the day before, when it came out then).
        $day = isset($dates[$onset]) ? $onset : (isset($dates[self::shift($onset, -1)]) ? self::shift($onset, -1) : null);
        if (!$day) {
            return ['found' => false, 'message' => $dates ? 'The device was not in place on the onset date or the day before.' : 'No ' . ($group === 'ventilator' ? 'ventilator charting' : 'such line') . ' charted for this patient.'];
        }
        $n = 0;
        $first = $day;
        while (isset($dates[$day])) {
            $n++;
            $first = $day;
            $day = self::shift($day, -1);
        }
        $label = $group === 'ventilator' ? 'Ventilator' : implode(', ', array_unique(array_map(fn($l) => self::KINDS[$l['kind']][1] . ($l['site'] ? " ({$l['site']}" . ($l['side'] ? " {$l['side']}" : '') . ')' : ''),
            array_filter($detail, fn($l) => substr($l['inserted_at'], 0, 10) <= $onset && (!$l['removed_at'] || substr($l['removed_at'], 0, 10) >= $first)))));
        return ['found' => true, 'device_type' => $label, 'device_days' => $n, 'since' => $first, 'in_place_on_onset' => isset($dates[$onset]),
            'eligible' => $n > 2, 'message' => "{$label}: {$n} day" . ($n === 1 ? '' : 's') . " in place up to the onset (from {$first})" . ($n > 2 ? '.' : ' — 2 days or less, so not device-associated by the CDC definition.')];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function shape(array $l, string $now): array
    {
        [$label, $short, $group] = self::KINDS[$l['kind']] ?? [$l['kind'], $l['kind'], 'other'];
        $end = $l['voided_at'] ? null : ($l['removed_at'] ?? $now);
        $day = $end ? self::dayCount($l['inserted_at'], $end) : null;
        $site = trim(implode(' ', array_filter([$l['site'], $l['side'] ? "({$l['side']})" : null])));
        return [
            'id' => (int) $l['id'], 'kind' => $l['kind'], 'label' => $l['kind'] === 'other' && $l['label'] ? $l['label'] : $label, 'detail' => $l['kind'] === 'other' ? null : $l['label'],
            'short' => $l['kind'] === 'other' && $l['label'] ? $l['label'] : $short, 'group' => $group, 'site' => $l['site'], 'side' => $l['side'], 'site_text' => $site, 'size' => $l['size'],
            'inserted_at' => $l['inserted_at'], 'inserted_where' => $l['inserted_where'], 'inserted_where_label' => self::WHERE[$l['inserted_where']] ?? $l['inserted_where'],
            'inserted_by_name' => $l['inserted_by_name'], 'charted_by' => $l['charted_by_name'] ?? null, 'bundle' => $l['bundle'] === null ? null : (bool) $l['bundle'],
            'notes' => $l['notes'], 'removed_at' => $l['removed_at'], 'removed_reason' => $l['removed_reason'],
            'removed_reason_label' => $l['removed_reason'] ? (self::REMOVE_REASONS[$l['removed_reason']] ?? $l['removed_reason']) : null, 'removed_note' => $l['removed_note'],
            'removed_by' => $l['removed_by_name'] ?? null, 'voided' => $l['voided_at'] !== null, 'void_reason' => $l['void_reason'], 'in_place' => !$l['removed_at'] && !$l['voided_at'],
            'day' => $day, 'review' => !$l['removed_at'] && !$l['voided_at'] && isset(self::REVIEW_DAYS[$group]) && $day >= self::REVIEW_DAYS[$group],
        ];
    }

    private function admission(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM inpatient_admissions WHERE id = :id AND status IN ('Admitted', 'Pending Discharge')");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function line(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM icu_lines WHERE id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** "YYYY-MM-DD HH:MM" (or blank = now) -> "YYYY-MM-DD HH:MM:00"; false when not a real time. */
    private static function time($v, string $now)
    {
        $v = trim((string) $v);
        if ($v === '') {
            return $now;
        }
        $v = str_replace('T', ' ', $v);
        $d = \DateTimeImmutable::createFromFormat('!Y-m-d H:i', substr($v, 0, 16));
        return $d && $d->format('Y-m-d H:i') === substr($v, 0, 16) ? $d->format('Y-m-d H:i:00') : false;
    }

    /** Device days of one line: calendar days from the day it went in to the day it came out (or today), both counted. */
    public static function dayCount(string $from, string $to): int
    {
        return count(self::range($from, $to));
    }

    /** Calendar dates from $from to $to (datetimes), both included. */
    public static function range(string $from, string $to): array
    {
        $out = [];
        $d = substr($from, 0, 10);
        $end = substr($to, 0, 10);
        while ($d <= $end) {
            $out[] = $d;
            $d = self::shift($d, 1);
        }
        return $out;
    }

    public static function shift(string $date, int $days): string
    {
        return (new \DateTimeImmutable($date, new \DateTimeZone('UTC')))->modify(($days >= 0 ? '+' : '') . "{$days} day")->format('Y-m-d');
    }
}
