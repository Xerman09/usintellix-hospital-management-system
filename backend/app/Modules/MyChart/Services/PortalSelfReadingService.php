<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\Providers\Services\ProviderService;
use PDO;
use Throwable;

/**
 * Track My Health (Phase 7): the readings a patient takes at home.
 *
 * These are kept away from encounter_vitals on purpose. encounter_vitals is the
 * clinical record -- taken by staff, on a hospital device, inside an encounter, and
 * feeding BMI, NEWS2 and the quality measures. A number typed in from a cuff of
 * unknown accuracy must not be able to pass for that, so it lives in its own table
 * and every screen says "self-reported".
 *
 * Three things this service is responsible for:
 *   1. sensible limits per kind of reading, so a slip of the keyboard is refused
 *      rather than stored (KINDS);
 *   2. the goal band a patient is aiming for, set by them or by their doctor;
 *   3. a reading outside the hospital's safety band (portal_reading_safety_bands)
 *      raising a real AlertService alert to the care team -- a worrying number must
 *      not sit unseen in a portal -- and telling the patient that it did.
 *
 * Units follow the hospital's own record: pounds and degrees Fahrenheit, so a
 * self-reported number sits beside a staff-recorded one without conversion.
 */
class PortalSelfReadingService
{
    /** Who may read the panel in the chart. Read-only for all of them. */
    public const CHART_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna'];

    /** How far back a reading may be back-dated, and how much history a screen shows. */
    public const MAX_AGE_DAYS = 400;
    public const DEFAULT_DAYS = 90;

    /**
     * What a patient may record, with the limits each kind is checked against.
     * "dp" is how many decimal places the value is stored and shown with.
     */
    public const KINDS = [
        'bp' => [
            'label' => 'Blood pressure',
            'units' => 'mmHg',
            'label_1' => 'Top number (systolic)',
            'label_2' => 'Bottom number (diastolic)',
            'min_1' => 50.0, 'max_1' => 300.0,
            'min_2' => 20.0, 'max_2' => 200.0,
            'dp' => 0,
            'hint' => 'Sit quietly for five minutes first, arm resting at heart height. Use the same arm each time.',
        ],
        'weight' => [
            'label' => 'Weight',
            'units' => 'lbs',
            'label_1' => 'Weight',
            'min_1' => 2.0, 'max_1' => 1000.0,
            'dp' => 1,
            'hint' => 'Weigh yourself at the same time of day, on the same scale, in similar clothing.',
        ],
        'glucose' => [
            'label' => 'Blood sugar',
            'units' => 'mg/dL',
            'label_1' => 'Blood sugar',
            'min_1' => 10.0, 'max_1' => 800.0,
            'dp' => 0,
            'hint' => 'Note in the box whether this was before or after a meal -- it changes what the number means.',
        ],
        'temperature' => [
            'label' => 'Temperature',
            'units' => '°F',
            'label_1' => 'Temperature',
            'min_1' => 86.0, 'max_1' => 113.0,
            'dp' => 1,
            'hint' => 'Say in the box where you measured it (mouth, ear, forehead or under the arm).',
        ],
        'pain' => [
            'label' => 'Pain score',
            'units' => '0-10',
            'label_1' => 'Pain right now (0 = none, 10 = worst you can imagine)',
            'min_1' => 0.0, 'max_1' => 10.0,
            'dp' => 0,
            'hint' => 'Score the pain as it is now, not at its worst over the week.',
        ],
        'steps' => [
            'label' => 'Steps',
            'units' => 'steps',
            'label_1' => 'Steps today',
            'min_1' => 0.0, 'max_1' => 100000.0,
            'dp' => 0,
            'hint' => 'Whatever your phone or watch counted for the day.',
        ],
        'spo2' => [
            'label' => 'Oxygen level',
            'units' => '%',
            'label_1' => 'Oxygen level (SpO2)',
            'min_1' => 50.0, 'max_1' => 100.0,
            'dp' => 0,
            'hint' => 'Warm hands, no nail polish, and keep still until the number settles.',
        ],
    ];

    // ------------------------------------------------------------------
    // Reference data
    // ------------------------------------------------------------------

    /** The kinds, shaped for an entry screen. */
    public static function kinds(): array
    {
        $out = [];

        foreach (self::KINDS as $kind => $k) {
            $out[] = [
                'kind' => $kind,
                'label' => $k['label'],
                'units' => $k['units'],
                'pair' => isset($k['label_2']),
                'label_1' => $k['label_1'],
                'label_2' => $k['label_2'] ?? null,
                'min_1' => $k['min_1'], 'max_1' => $k['max_1'],
                'min_2' => $k['min_2'] ?? null, 'max_2' => $k['max_2'] ?? null,
                'dp' => $k['dp'],
                'hint' => $k['hint'],
            ];
        }

        return $out;
    }

    /** The hospital's safety bands, by kind. Only the switched-on ones. */
    public static function bands(): array
    {
        $rows = Database::connection()->query(
            "SELECT kind, value_1_low, value_1_high, value_2_low, value_2_high, urgency, patient_advice
             FROM portal_reading_safety_bands WHERE is_active = 1"
        )->fetchAll(PDO::FETCH_ASSOC);

        $out = [];

        foreach ($rows as $r) {
            $out[$r['kind']] = [
                'value_1_low' => self::num($r['value_1_low']),
                'value_1_high' => self::num($r['value_1_high']),
                'value_2_low' => self::num($r['value_2_low']),
                'value_2_high' => self::num($r['value_2_high']),
                'urgency' => $r['urgency'],
                'patient_advice' => $r['patient_advice'],
            ];
        }

        return $out;
    }

    // ------------------------------------------------------------------
    // Goals
    // ------------------------------------------------------------------

    /** The active goal per kind for this patient, keyed by kind. */
    public static function goals(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT g.kind, g.target_low, g.target_high, g.set_by, g.note, g.updated_at,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), '') AS set_by_name
             FROM patient_self_goals g
             LEFT JOIN employees e ON e.user_id = g.set_by_user_id AND e.deleted_at IS NULL
             WHERE g.patient_id = :p AND g.is_active = 1
             ORDER BY g.id"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[$r['kind']] = [
                'target_low' => self::num($r['target_low']),
                'target_high' => self::num($r['target_high']),
                'set_by' => $r['set_by'],
                'set_by_name' => $r['set_by_name'],
                'note' => $r['note'],
                'updated_at' => $r['updated_at'],
            ];
        }

        return $out;
    }

    /**
     * Set, change or clear the band a patient is aiming for. Only one goal per kind is
     * active: the previous one is switched off rather than overwritten, so who set what
     * and when stays readable. Passing both numbers empty clears the goal.
     *
     * @param string $setBy 'patient' when the patient set it, 'doctor' when staff did
     */
    public static function saveGoal(int $patientId, string $kind, $low, $high, string $setBy, ?int $userId): array
    {
        if (!isset(self::KINDS[$kind])) {
            return ['success' => false, 'message' => 'That is not something you can track here.'];
        }

        $k = self::KINDS[$kind];
        $errors = [];
        $lowV = self::parse($low);
        $highV = self::parse($high);

        foreach ([['target_low', $lowV, $low], ['target_high', $highV, $high]] as [$field, $v, $raw]) {
            if ($v === null && self::given($raw)) {
                $errors[$field] = 'Enter that as a number, or leave it empty.';
            } elseif ($v !== null && ($v < $k['min_1'] || $v > $k['max_1'])) {
                $errors[$field] = "Enter a number between {$k['min_1']} and {$k['max_1']} {$k['units']}.";
            }
        }

        if ($lowV !== null && $highV !== null && $lowV > $highV) {
            $errors['target_low'] = 'The lower number has to be below the higher one.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'That goal could not be saved.', 'errors' => $errors];
        }

        $db = Database::connection();

        $off = $db->prepare(
            "UPDATE patient_self_goals SET is_active = 0, updated_at = NOW(), updated_by = :u
             WHERE patient_id = :p AND kind = :k AND is_active = 1"
        );
        $off->execute(['p' => $patientId, 'k' => $kind, 'u' => $userId]);

        if ($lowV === null && $highV === null) {
            return ['success' => true, 'message' => 'Your goal has been removed.', 'data' => ['cleared' => true]];
        }

        $ins = $db->prepare(
            "INSERT INTO patient_self_goals
                (patient_id, kind, target_low, target_high, set_by, set_by_user_id, is_active, created_at, created_by)
             VALUES (:p, :k, :lo, :hi, :sb, :u, 1, NOW(), :u2)"
        );
        $ins->execute([
            'p' => $patientId, 'k' => $kind, 'lo' => $lowV, 'hi' => $highV,
            'sb' => $setBy === 'doctor' ? 'doctor' : 'patient', 'u' => $userId, 'u2' => $userId,
        ]);

        return [
            'success' => true,
            'message' => 'Your goal has been saved. It is the shaded band on the graph.',
            'data' => ['id' => (int) $db->lastInsertId()],
        ];
    }

    // ------------------------------------------------------------------
    // Recording
    // ------------------------------------------------------------------

    /**
     * Record one reading. Returns the stored row, and -- when it fell outside the
     * hospital's safety band -- says so plainly and tells the patient that the care
     * team has been told, so nobody is left assuming a worrying number was seen.
     */
    public static function record(int $patientId, array $in, ?int $userId): array
    {
        $kind = (string) ($in['kind'] ?? '');

        if (!isset(self::KINDS[$kind])) {
            return ['success' => false, 'message' => 'That is not something you can record here.'];
        }

        $k = self::KINDS[$kind];
        $errors = [];

        $v1 = self::parse($in['value_1'] ?? null);
        $v2 = self::parse($in['value_2'] ?? null);

        if ($v1 === null) {
            $errors['value_1'] = self::given($in['value_1'] ?? null)
                ? 'Enter ' . lcfirst($k['label_1']) . ' as a number.'
                : 'Enter ' . lcfirst($k['label_1']) . '.';
        } elseif ($v1 < $k['min_1'] || $v1 > $k['max_1']) {
            $errors['value_1'] = "That looks like a typing slip — enter a number between {$k['min_1']} and {$k['max_1']} {$k['units']}.";
        }

        if (isset($k['label_2'])) {
            if ($v2 === null) {
                $errors['value_2'] = self::given($in['value_2'] ?? null)
                    ? 'Enter ' . lcfirst($k['label_2']) . ' as a number.'
                    : 'Enter ' . lcfirst($k['label_2']) . '.';
            } elseif ($v2 < $k['min_2'] || $v2 > $k['max_2']) {
                $errors['value_2'] = "That looks like a typing slip — enter a number between {$k['min_2']} and {$k['max_2']} {$k['units']}.";
            } elseif ($v1 !== null && $v2 >= $v1) {
                $errors['value_2'] = 'The bottom number has to be below the top number.';
            }
        } else {
            $v2 = null;
        }

        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $takenAt = trim((string) ($in['taken_at'] ?? ''));

        if ($takenAt === '') {
            $takenAt = $now;
        } else {
            $ts = strtotime($takenAt);

            if ($ts === false) {
                $errors['taken_at'] = 'Enter when you took this reading.';
            } else {
                $takenAt = date('Y-m-d H:i:s', $ts);

                if ($takenAt > $now) {
                    $errors['taken_at'] = 'That is in the future. Enter when you actually took the reading.';
                } elseif (strtotime($takenAt) < strtotime($now) - (self::MAX_AGE_DAYS * 86400)) {
                    $errors['taken_at'] = 'That is more than a year ago, which is too far back to add here.';
                }
            }
        }

        $note = trim((string) ($in['note'] ?? ''));

        if (mb_strlen($note) > 255) {
            $errors['note'] = 'Keep the note under 255 characters.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'That reading could not be saved.', 'errors' => $errors];
        }

        $source = ($in['source'] ?? 'patient') === 'device' ? 'device' : 'patient';
        $band = self::bands()[$kind] ?? null;
        $outOfBand = $band ? self::outside($band, $v1, $v2) : false;

        $stmt = $db->prepare(
            "INSERT INTO patient_self_readings
                (patient_id, kind, value_1, value_2, units, taken_at, note, source, out_of_band, created_at, created_by)
             VALUES (:p, :k, :v1, :v2, :u, :t, :n, :s, :ob, NOW(), :cb)"
        );
        $stmt->execute([
            'p' => $patientId, 'k' => $kind, 'v1' => $v1, 'v2' => $v2, 'u' => $k['units'],
            't' => $takenAt, 'n' => $note !== '' ? $note : null, 's' => $source,
            'ob' => $outOfBand ? 1 : 0, 'cb' => $userId,
        ]);

        $id = (int) $db->lastInsertId();
        $message = 'Your ' . lcfirst($k['label']) . ' has been saved.';
        $alerted = false;

        if ($outOfBand) {
            $alerted = self::alertCareTeam($patientId, $id, $kind, $v1, $v2, $note, $takenAt, $band, $userId);

            $message = $alerted
                ? 'Saved. This reading is outside the range we watch for, so your care team has been told about it.'
                : 'Saved. This reading is outside the range we watch for. We could not reach anyone automatically, '
                    . 'so please ring the hospital rather than waiting for a reply.';

            if (!empty($band['patient_advice'])) {
                $message .= ' ' . $band['patient_advice'];
            }
        }

        return [
            'success' => true,
            'message' => $message,
            'data' => ['id' => $id, 'out_of_band' => $outOfBand, 'care_team_told' => $alerted],
        ];
    }

    /** A reading the patient entered by mistake. Theirs to remove; the alert it raised stays. */
    public static function remove(int $patientId, int $id, ?int $userId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT id, alerted_at FROM patient_self_readings
             WHERE id = :i AND patient_id = :p AND deleted_at IS NULL"
        );
        $stmt->execute(['i' => $id, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return ['success' => false, 'message' => 'That reading could not be found.', 'not_found' => true];
        }

        $del = $db->prepare("UPDATE patient_self_readings SET deleted_at = NOW(), deleted_by = :u WHERE id = :i");
        $del->execute(['i' => $id, 'u' => $userId]);

        return [
            'success' => true,
            'message' => $row['alerted_at']
                ? 'That reading has been removed from your list. Your care team was already told about it, so they may still ask you about it.'
                : 'That reading has been removed.',
            'data' => ['id' => $id],
        ];
    }

    // ------------------------------------------------------------------
    // Reading back
    // ------------------------------------------------------------------

    /**
     * Everything one Track My Health screen needs: the kinds, this patient's goals, the
     * safety bands, and the readings for the chosen kind with the series for its graph.
     */
    public static function list(int $patientId, string $kind = '', int $days = self::DEFAULT_DAYS): array
    {
        $kind = isset(self::KINDS[$kind]) ? $kind : '';
        $days = max(7, min(400, $days));

        return [
            'kinds' => self::kinds(),
            'goals' => self::goals($patientId),
            'bands' => self::bands(),
            'kind' => $kind,
            'days' => $days,
            'counts' => self::counts($patientId),
            'readings' => $kind === '' ? [] : self::readings($patientId, $kind, $days),
        ];
    }

    /** How many readings of each kind this patient has, and the latest of each. */
    public static function counts(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT r.kind, COUNT(*) AS n, MAX(r.taken_at) AS latest_at
             FROM patient_self_readings r
             WHERE r.patient_id = :p AND r.deleted_at IS NULL
             GROUP BY r.kind"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[$r['kind']] = ['count' => (int) $r['n'], 'latest_at' => $r['latest_at']];
        }

        return $out;
    }

    /** One kind over a window, newest first, with everything a row or a point needs. */
    public static function readings(int $patientId, string $kind, int $days = self::DEFAULT_DAYS): array
    {
        if (!isset(self::KINDS[$kind])) {
            return [];
        }

        $stmt = Database::connection()->prepare(
            "SELECT id, kind, value_1, value_2, units, taken_at, note, source, out_of_band, alerted_at
             FROM patient_self_readings
             WHERE patient_id = :p AND kind = :k AND deleted_at IS NULL
               AND taken_at >= DATE_SUB(NOW(), INTERVAL :d DAY)
             ORDER BY taken_at DESC, id DESC
             LIMIT 400"
        );
        $stmt->bindValue('p', $patientId, PDO::PARAM_INT);
        $stmt->bindValue('k', $kind, PDO::PARAM_STR);
        $stmt->bindValue('d', $days, PDO::PARAM_INT);
        $stmt->execute();

        $dp = self::KINDS[$kind]['dp'];

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'kind' => $r['kind'],
            'value_1' => round((float) $r['value_1'], $dp),
            'value_2' => $r['value_2'] === null ? null : round((float) $r['value_2'], $dp),
            'units' => $r['units'],
            'taken_at' => $r['taken_at'],
            'note' => $r['note'],
            'source' => $r['source'],
            'out_of_band' => (int) $r['out_of_band'] === 1,
            'care_team_told' => $r['alerted_at'] !== null,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * The read-only panel the doctor sees in the chart: the latest of each kind, how many
     * there are, how many fell outside the safety band, and the recent series so a
     * consultation can look at the shape of it. Self-reported, and labelled as such.
     */
    public static function chart(int $patientId, int $days = self::DEFAULT_DAYS): array
    {
        $days = max(7, min(400, $days));
        $goals = self::goals($patientId);
        $counts = self::counts($patientId);
        $items = [];

        foreach (self::KINDS as $kind => $k) {
            if (empty($counts[$kind]['count'])) {
                continue;
            }

            $readings = self::readings($patientId, $kind, $days);
            $latest = $readings[0] ?? null;

            $items[] = [
                'kind' => $kind,
                'label' => $k['label'],
                'units' => $k['units'],
                'dp' => $k['dp'],
                'pair' => isset($k['label_2']),
                'count' => $counts[$kind]['count'],
                'latest' => $latest,
                'latest_at' => $counts[$kind]['latest_at'],
                'out_of_band' => count(array_filter($readings, static fn($r) => $r['out_of_band'])),
                'goal' => $goals[$kind] ?? null,
                'points' => array_reverse(array_map(static fn($r) => [
                    'taken_at' => $r['taken_at'],
                    'value_1' => $r['value_1'],
                    'value_2' => $r['value_2'],
                    'out_of_band' => $r['out_of_band'],
                ], $readings)),
            ];
        }

        return ['days' => $days, 'items' => $items, 'bands' => self::bands()];
    }

    // ------------------------------------------------------------------
    // The safety band
    // ------------------------------------------------------------------

    /** Is either number at or past one of the band's limits? */
    private static function outside(array $band, ?float $v1, ?float $v2): bool
    {
        $hit = static function (?float $v, ?float $low, ?float $high): bool {
            if ($v === null) {
                return false;
            }

            return ($low !== null && $v <= $low) || ($high !== null && $v >= $high);
        };

        return $hit($v1, $band['value_1_low'], $band['value_1_high'])
            || $hit($v2, $band['value_2_low'], $band['value_2_high']);
    }

    /**
     * Raise the alert the rest of the hospital already uses, so an out-of-band reading
     * lands in the care team's alert list instead of only in the portal. Returns false
     * when there was nobody to send it to, which the patient is told about.
     */
    private static function alertCareTeam(
        int $patientId,
        int $readingId,
        string $kind,
        ?float $v1,
        ?float $v2,
        string $note,
        string $takenAt,
        array $band,
        ?int $userId
    ): bool {
        $k = self::KINDS[$kind];
        $targets = self::careTeamTargets($patientId);

        if (!$targets) {
            return false;
        }

        $reading = self::format($kind, $v1, $v2);
        $body = [
            'The patient recorded this at home through My Chart. It is self-reported, not a clinical measurement.',
            '',
            $k['label'] . ': ' . $reading,
            'Taken: ' . $takenAt,
        ];

        if ($note !== '') {
            $body[] = 'Their note: ' . $note;
        }

        $body[] = '';
        $body[] = 'Outside the safety band set for ' . lcfirst($k['label']) . '. The patient has been told you were notified.';

        try {
            $res = AlertService::raise([
                'type' => 'patient_reading',
                'urgency' => $band['urgency'] ?? 'urgent',
                'title' => 'Home ' . lcfirst($k['label']) . ' ' . $reading . ' (self-reported)',
                'body' => implode("\n", $body),
                'patient_id' => $patientId,
                'link' => ['patient_id' => $patientId],
                'targets' => $targets,
                'source_type' => 'patient_self_readings',
                'source_id' => $readingId,
                'dedupe_key' => 'self_reading:' . $readingId,
            ], $userId);
        } catch (Throwable $e) {
            return false;
        }

        if (empty($res['success'])) {
            return false;
        }

        $stmt = Database::connection()->prepare(
            "UPDATE patient_self_readings SET alert_id = :a, alerted_at = NOW() WHERE id = :i"
        );
        $stmt->execute(['a' => $res['data']['id'] ?? null, 'i' => $readingId]);

        return true;
    }

    /**
     * Who to tell: the people on the patient's care team who have a login, plus their own
     * provider. With neither, it falls back to the nursing roles rather than silently
     * going nowhere -- an out-of-band reading with no named owner still needs an owner.
     */
    public static function careTeamTargets(int $patientId): array
    {
        $db = Database::connection();
        $userIds = [];

        $stmt = $db->prepare(
            "SELECT DISTINCT m.user_id
             FROM care_teams t
             JOIN care_team_members m ON m.care_team_id = t.id
             JOIN users u ON u.id = m.user_id AND u.deleted_at IS NULL
             WHERE t.patient_id = :p
               AND (t.status IS NULL OR t.status = 'active')
               AND (m.status IS NULL OR m.status = 'active')"
        );
        $stmt->execute(['p' => $patientId]);

        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $userIds[(int) $id] = true;
        }

        $stmt = $db->prepare("SELECT provider_id FROM patients WHERE id = :p AND deleted_at IS NULL");
        $stmt->execute(['p' => $patientId]);
        $providerId = (int) $stmt->fetchColumn();

        if ($providerId) {
            $providerUser = (new ProviderService())->findUserIdByProviderId($providerId);

            if ($providerUser) {
                $userIds[(int) $providerUser] = true;
            }
        }

        if ($userIds) {
            return array_map(static fn($id) => ['user' => $id], array_keys($userIds));
        }

        return [['role' => 'nurse'], ['role' => 'charge_nurse']];
    }

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------

    /** "128/82 mmHg", "171.4 lbs". */
    public static function format(string $kind, ?float $v1, ?float $v2): string
    {
        $k = self::KINDS[$kind] ?? null;

        if (!$k || $v1 === null) {
            return '';
        }

        $one = number_format($v1, $k['dp']);

        if (isset($k['label_2']) && $v2 !== null) {
            return $one . '/' . number_format($v2, $k['dp']) . ' ' . $k['units'];
        }

        return $one . ' ' . $k['units'];
    }

    /** Did the caller put anything in this box at all? */
    private static function given($v): bool
    {
        return !($v === null || (is_string($v) && trim($v) === ''));
    }

    /** "" and null are "not given"; anything else is read as a number. */
    private static function parse($v): ?float
    {
        if ($v === null || (is_string($v) && trim($v) === '')) {
            return null;
        }

        return is_numeric($v) ? (float) $v : null;
    }

    private static function num($v): ?float
    {
        return $v === null ? null : (float) $v;
    }
}
