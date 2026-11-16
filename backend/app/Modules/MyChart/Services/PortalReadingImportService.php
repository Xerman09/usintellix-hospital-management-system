<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use PDO;
use PDOException;
use Throwable;

/**
 * Bringing readings in from a health app or a device (Phase M17a).
 *
 * Track My Health (M7) is manual entry only, and typing a blood pressure every
 * day does not last. This is the server side of importing: a batch endpoint with
 * deduplication, per-reading plausibility checks, provenance a clinician can
 * read, and a rule about when an imported reading may page somebody.
 *
 * The native bridge that reads from Apple HealthKit and Google Fit is M17b and
 * is not built -- it needs native modules that cannot be compiled until the
 * Expo build quota resets. This is the contract that bridge will call, and it
 * also backs a staff screen, so a clinic can load a patient's exported readings
 * today.
 *
 * AN IMPORT MUST NOT PAGE ANYBODY ABOUT HISTORY.
 *
 * This is the whole reason import does not simply loop over
 * PortalSelfReadingService::record(). That method raises one urgent care-team
 * alert per out-of-band reading, with no deduplication, which is correct for
 * somebody typing in a reading they just took. Applied to a phone handing over
 * three months of blood pressure it would raise dozens of urgent alerts about
 * readings from six weeks ago, and bury the one that mattered.
 *
 * So:
 *   - every out-of-band reading is still flagged, so nothing is hidden;
 *   - only readings taken within portal_import_alert_hours may alert at all;
 *   - and those produce ONE alert for the batch, naming the worst.
 *
 * The import row keeps flagged_count and alertable_count separately, so a
 * clinician can see "14 outside the band, 13 of them historical" rather than
 * wondering why their pager stayed quiet.
 *
 * TIME IS THE OTHER TRAP.
 *
 * PHP and MySQL are not in the same timezone on every deployment -- they were
 * seven hours apart when M15a was built, which stamped an encounter well away
 * from the reply that created it. Readings are compared against the database's
 * NOW() everywhere in M7, so an incoming timestamp that carries an explicit zone
 * is converted onto the database's clock. A naive timestamp is taken at face
 * value, because "2026-11-14 08:30" from a clinic's own paste means the clinic's
 * wall clock and shifting it would be wrong. See toDatabaseClock().
 */
class PortalReadingImportService
{
    /** Who may load readings on a patient's behalf. */
    public const IMPORT_ROLES = ['admin', 'doctor', 'clinician', 'nurse'];

    /** Who may read import history. */
    public const REVIEW_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna'];

    private const DEFAULT_ALERT_HOURS = 24;
    private const DEFAULT_MAX_ROWS = 500;
    private const DEFAULT_MAX_PER_DAY = 20;

    /** Said to a clinician looking at imported readings. */
    public const CAVEATS = [
        'These came from a patient device or health app, not from a clinical measurement.',
        'Nobody checked the cuff size, the posture, or whether the right person was wearing it.',
        'A reading outside the safety band older than a day did not raise an alert, by design.',
    ];

    // ------------------------------------------------------------------
    // Importing
    // ------------------------------------------------------------------

    /**
     * Load a batch of readings.
     *
     * Per-reading failures do not fail the batch. One malformed sample in five
     * hundred must not lose the other four hundred and ninety-nine, so each is
     * accepted, skipped as a duplicate, or refused with a reason, and the counts
     * come back together.
     *
     * @param array $input   source_app, device_name, readings[]
     * @param bool  $patientInitiated false when a staff member loaded it
     */
    public static function import(
        int $patientId,
        array $input,
        ?array $user,
        bool $patientInitiated = true
    ): array {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return self::fail('Bringing readings in from a device is switched off at the moment.');
        }

        $sourceApp = trim((string) ($input['source_app'] ?? ''));
        $deviceName = trim((string) ($input['device_name'] ?? ''));
        $readings = is_array($input['readings'] ?? null) ? $input['readings'] : [];
        $errors = [];

        if ($sourceApp === '') {
            $errors['source_app'] = 'Say where these came from.';
        }

        if (mb_strlen($sourceApp) > 60) {
            $errors['source_app'] = 'Keep the source under 60 characters.';
        }

        if (mb_strlen($deviceName) > 120) {
            $errors['device_name'] = 'Keep the device name under 120 characters.';
        }

        if (!$readings) {
            $errors['readings'] = 'There are no readings to bring in.';
        }

        if (count($readings) > $settings['max_rows']) {
            $errors['readings'] = sprintf(
                'That is %d readings. We take %d at a time -- send them in smaller batches.',
                count($readings),
                $settings['max_rows']
            );
        }

        if ($errors) {
            return self::fail('Those readings could not be brought in.', false, $errors);
        }

        $today = self::batchesToday($db, $patientId);

        if ($today >= $settings['max_per_day']) {
            return self::fail(sprintf(
                'That is the %d batches we take in a day for one patient. Try again tomorrow.',
                $settings['max_per_day']
            ));
        }

        $now = (string) $db->query('SELECT NOW()')->fetchColumn();
        $bands = PortalSelfReadingService::bands();
        $alertCutoff = date('Y-m-d H:i:s', strtotime($now) - ($settings['alert_hours'] * 3600));

        // The import row goes in first so readings can point at it. Counts are
        // written at the end; an import that dies half way leaves a row saying
        // so, which is more useful than no trace of it having run.
        $db->prepare(
            "INSERT INTO portal_reading_imports
                (patient_id, source_app, device_name, is_patient_initiated, started_by,
                 total_submitted, created_at)
             VALUES (:p, :app, :dev, :pi, :by, :total, NOW())"
        )->execute([
            'p' => $patientId,
            'app' => $sourceApp,
            'dev' => $deviceName !== '' ? $deviceName : null,
            'pi' => $patientInitiated ? 1 : 0,
            'by' => isset($user['id']) ? (int) $user['id'] : null,
            'total' => count($readings),
        ]);

        $importId = (int) $db->lastInsertId();

        $accepted = 0;
        $duplicates = 0;
        $rejects = [];
        $seen = [];
        $flagged = [];
        $alertable = [];
        $earliest = null;
        $latest = null;

        $insert = $db->prepare(
            "INSERT INTO patient_self_readings
                (patient_id, kind, value_1, value_2, units, taken_at, note, source,
                 out_of_band, source_app, device_name, external_id, dedupe_hash,
                 import_id, created_at, created_by)
             VALUES (:p, :k, :v1, :v2, :u, :t, :n, 'device',
                 :ob, :app, :dev, :ext, :hash,
                 :imp, NOW(), :cb)"
        );

        foreach ($readings as $index => $raw) {
            $row = self::validateOne(is_array($raw) ? $raw : [], $now);

            if (isset($row['error'])) {
                $rejects[] = ['row' => $index + 1, 'why' => $row['error']];
                continue;
            }

            $hash = self::hashOf($patientId, $row);

            // Duplicate inside this very payload. Caught here rather than left
            // to the unique key so the count is right even when a source sends
            // the same sample twice in one go.
            if (isset($seen[$hash])) {
                $duplicates++;
                continue;
            }

            $seen[$hash] = true;

            $band = $bands[$row['kind']] ?? null;
            $outOfBand = $band ? self::outside($band, $row['value_1'], $row['value_2']) : false;

            try {
                $insert->execute([
                    'p' => $patientId,
                    'k' => $row['kind'],
                    'v1' => $row['value_1'],
                    'v2' => $row['value_2'],
                    'u' => $row['units'],
                    't' => $row['taken_at'],
                    'n' => $row['note'],
                    'ob' => $outOfBand ? 1 : 0,
                    'app' => $sourceApp,
                    'dev' => $deviceName !== '' ? $deviceName : null,
                    'ext' => $row['external_id'],
                    'hash' => $hash,
                    'imp' => $importId,
                    'cb' => isset($user['id']) ? (int) $user['id'] : null,
                ]);
            } catch (PDOException $e) {
                // 23000 is a unique-key violation: this reading is already in
                // the record from an earlier sync. Expected, not an error.
                if (($e->getCode() === '23000') || str_contains($e->getMessage(), '1062')) {
                    $duplicates++;
                    continue;
                }

                error_log('reading import row failed: ' . $e->getMessage());
                $rejects[] = ['row' => $index + 1, 'why' => 'We could not save this one.'];
                continue;
            }

            $accepted++;

            if ($earliest === null || $row['taken_at'] < $earliest) {
                $earliest = $row['taken_at'];
            }

            if ($latest === null || $row['taken_at'] > $latest) {
                $latest = $row['taken_at'];
            }

            if ($outOfBand) {
                $entry = $row + ['id' => (int) $db->lastInsertId(), 'band' => $band];
                $flagged[] = $entry;

                // The rule: only a recent reading is news. Everything older is
                // flagged on the chart and nothing more.
                if ($row['taken_at'] >= $alertCutoff) {
                    $alertable[] = $entry;
                }
            }
        }

        $alertId = null;

        // One alert for the batch, not one per reading.
        if ($alertable) {
            $alertId = self::alertOnce(
                $patientId,
                $importId,
                $sourceApp,
                $alertable,
                count($flagged),
                $settings,
                $alertCutoff
            );
        }

        $db->prepare(
            "UPDATE portal_reading_imports
                SET accepted = :a, duplicates = :d, rejected = :r, reject_reasons = :rr,
                    earliest_reading = :e, latest_reading = :l,
                    flagged_count = :f, alertable_count = :ac, alert_id = :alert
              WHERE id = :i"
        )->execute([
            'a' => $accepted,
            'd' => $duplicates,
            'r' => count($rejects),
            'rr' => $rejects ? json_encode(array_slice($rejects, 0, 100), JSON_UNESCAPED_UNICODE) : null,
            'e' => $earliest,
            'l' => $latest,
            'f' => count($flagged),
            'ac' => count($alertable),
            'alert' => $alertId,
            'i' => $importId,
        ]);

        try {
            PortalAudit::action(
                $user,
                $patientId,
                $patientInitiated ? 'Readings Imported' : 'Readings Imported By Clinic',
                sprintf(
                    'Import #%d from %s: %d saved, %d already had, %d refused.',
                    $importId,
                    $sourceApp,
                    $accepted,
                    $duplicates,
                    count($rejects)
                )
            );
        } catch (Throwable $e) {
            error_log('reading import audit failed: ' . $e->getMessage());
        }

        // Only when somebody else did it. A patient whose own phone synced does
        // not need telling they synced, and a daily sync would mean a daily
        // notification.
        if (!$patientInitiated && $accepted > 0) {
            try {
                PortalNotificationService::queue($patientId, 'readings_imported', [
                    'count' => (string) $accepted,
                    'source' => $sourceApp,
                ], 'reading_import:' . $importId);
            } catch (Throwable $e) {
                error_log('reading import notification failed: ' . $e->getMessage());
            }
        }

        return [
            'success' => true,
            'message' => self::summaryLine($accepted, $duplicates, count($rejects), count($flagged), count($alertable)),
            'data' => [
                'import_id' => $importId,
                'accepted' => $accepted,
                'duplicates' => $duplicates,
                'rejected' => count($rejects),
                'reject_reasons' => $rejects,
                'flagged' => count($flagged),
                'alerted' => count($alertable),
                'care_team_told' => $alertId !== null,
            ],
        ];
    }

    /**
     * One reading, checked.
     *
     * The bounds are M7's own KINDS bounds, not a second set. A device that
     * reports 900/400 is reporting a fault, and storing it would put a fault on
     * the patient's chart and then alert somebody about it.
     *
     * @return array{kind:string,value_1:float,value_2:?float,units:string,taken_at:string,note:?string,external_id:?string}|array{error:string}
     */
    public static function validateOne(array $raw, string $dbNow): array
    {
        $kind = trim((string) ($raw['kind'] ?? ''));

        if (!isset(PortalSelfReadingService::KINDS[$kind])) {
            return ['error' => $kind === ''
                ? 'No measure given.'
                : 'We do not track "' . mb_substr($kind, 0, 24) . '".'];
        }

        $k = PortalSelfReadingService::KINDS[$kind];

        $v1 = self::num($raw['value_1'] ?? null);

        if ($v1 === null) {
            return ['error' => 'No value given for ' . lcfirst($k['label']) . '.'];
        }

        if ($v1 < $k['min_1'] || $v1 > $k['max_1']) {
            return ['error' => sprintf(
                '%s of %s is outside what a real reading can be (%s to %s %s).',
                $k['label'],
                self::trimNum($v1),
                self::trimNum((float) $k['min_1']),
                self::trimNum((float) $k['max_1']),
                $k['units']
            )];
        }

        $v2 = null;

        if (isset($k['label_2'])) {
            $v2 = self::num($raw['value_2'] ?? null);

            if ($v2 === null) {
                return ['error' => $k['label'] . ' needs both numbers.'];
            }

            if ($v2 < $k['min_2'] || $v2 > $k['max_2']) {
                return ['error' => sprintf(
                    '%s of %s is outside what a real reading can be (%s to %s %s).',
                    $k['label_2'],
                    self::trimNum($v2),
                    self::trimNum((float) $k['min_2']),
                    self::trimNum((float) $k['max_2']),
                    $k['units']
                )];
            }

            if ($v2 >= $v1) {
                return ['error' => 'The bottom number is not below the top number ('
                    . self::trimNum($v1) . '/' . self::trimNum($v2) . ').'];
            }
        }

        $given = trim((string) ($raw['taken_at'] ?? ''));

        if ($given === '') {
            return ['error' => 'No time given for this reading.'];
        }

        $takenAt = self::toDatabaseClock($given, $dbNow);

        if ($takenAt === null) {
            return ['error' => 'We could not read the time "' . mb_substr($given, 0, 30) . '".'];
        }

        if ($takenAt > $dbNow) {
            return ['error' => 'That reading is dated in the future (' . $takenAt . ').'];
        }

        $oldest = date('Y-m-d H:i:s', strtotime($dbNow) - (PortalSelfReadingService::MAX_AGE_DAYS * 86400));

        if ($takenAt < $oldest) {
            return ['error' => 'That reading is more than ' . PortalSelfReadingService::MAX_AGE_DAYS . ' days old.'];
        }

        $note = trim((string) ($raw['note'] ?? ''));
        $externalId = trim((string) ($raw['external_id'] ?? ''));

        return [
            'kind' => $kind,
            'value_1' => $v1,
            'value_2' => $v2,
            'units' => $k['units'],
            'taken_at' => $takenAt,
            'note' => $note !== '' ? mb_substr($note, 0, 255) : null,
            'external_id' => $externalId !== '' ? mb_substr($externalId, 0, 120) : null,
        ];
    }

    /**
     * Put an incoming timestamp on the database's clock.
     *
     * A timestamp carrying an explicit zone ("2026-11-14T08:30:00Z", "...+08:00")
     * names an absolute moment, and has to be re-expressed on whatever wall
     * clock the database is keeping -- which is not necessarily PHP's. The
     * offset is measured rather than assumed, by comparing the database's own
     * NOW() with PHP's.
     *
     * A naive timestamp ("2026-11-14 08:30") is taken at face value. It came
     * from a clinic pasting its own figures, and shifting those by a timezone
     * offset would move every reading by hours for no reason.
     */
    public static function toDatabaseClock(string $given, string $dbNow): ?string
    {
        $ts = strtotime($given);

        if ($ts === false) {
            return null;
        }

        $hasZone = (bool) preg_match('/(?:Z|[+-]\d{2}:?\d{2})$/i', trim($given));

        if (!$hasZone) {
            return date('Y-m-d H:i:s', $ts);
        }

        $dbEpoch = strtotime($dbNow);

        if ($dbEpoch === false) {
            return date('Y-m-d H:i:s', $ts);
        }

        return date('Y-m-d H:i:s', $ts + ($dbEpoch - time()));
    }

    /**
     * Turn pasted text into readings, for the staff screen.
     *
     * Deliberately a simple documented format rather than an attempt at Apple
     * Health's export XML, which is hundreds of megabytes of everything the
     * phone has ever recorded and needs a file upload this project cannot do yet
     * (M11's picker is blocked on the same build quota as M17b).
     *
     *   kind, taken_at, value_1 [, value_2] [, note]
     *   bp, 2026-11-14 08:30, 128, 82
     *   glucose, 2026-11-14 09:00, 110, , before breakfast
     *
     * Commas or tabs. A header line naming the columns is skipped. When
     * $defaultKind is given, the kind column may be left out entirely, so a
     * two-column paste of date and value works.
     *
     * Parsing never rejects: an unreadable line becomes a reading that
     * validateOne() will refuse with a reason, so the staff member sees which
     * line was wrong rather than a single unhelpful failure.
     */
    public static function parseDelimited(string $text, string $defaultKind = ''): array
    {
        $out = [];
        $lines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $first = true;

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            // A header row: the FIRST line, and only if it has no digits.
            //
            // Deliberately not "any line without digits". That version swallowed
            // a genuinely malformed line further down a paste, which breaks the
            // promise below that parsing never rejects -- the staff member would
            // have watched a line disappear with nothing said about it. A header
            // can only be the first line, so that is the only place to look.
            if ($first && !preg_match('/\d/', $line)) {
                $first = false;
                continue;
            }

            $first = false;

            $parts = array_map('trim', preg_split('/\t|,/', $line) ?: []);

            $kind = '';

            if (isset(PortalSelfReadingService::KINDS[strtolower($parts[0] ?? '')])) {
                $kind = strtolower((string) array_shift($parts));
            } elseif ($defaultKind !== '') {
                $kind = $defaultKind;
            }

            $out[] = [
                'kind' => $kind,
                'taken_at' => $parts[0] ?? '',
                'value_1' => $parts[1] ?? '',
                'value_2' => $parts[2] ?? '',
                'note' => $parts[3] ?? '',
            ];
        }

        return $out;
    }

    // ------------------------------------------------------------------
    // Alerting -- once per batch, recent readings only
    // ------------------------------------------------------------------

    /**
     * One alert for the whole import.
     *
     * Named after the most recent out-of-band reading rather than the most
     * extreme: "most extreme" would be code ranking clinical severity across
     * measures, and the thing a clinician wants first is what the patient's
     * situation is now.
     */
    private static function alertOnce(
        int $patientId,
        int $importId,
        string $sourceApp,
        array $alertable,
        int $flaggedTotal,
        array $settings,
        string $alertCutoff
    ): ?int {
        try {
            $targets = PortalSelfReadingService::careTeamTargets($patientId);

            if (!$targets) {
                return null;
            }

            usort($alertable, static fn($a, $b) => strcmp((string) $b['taken_at'], (string) $a['taken_at']));
            $worst = $alertable[0];
            $k = PortalSelfReadingService::KINDS[$worst['kind']];
            $reading = PortalSelfReadingService::format($worst['kind'], $worst['value_1'], $worst['value_2']);

            $body = [
                'Readings came in from ' . $sourceApp . ' for this patient. They are from a',
                'patient device or health app -- self-reported, not a clinical measurement.',
                '',
                'Most recent reading outside the safety band:',
                '  ' . $k['label'] . ': ' . $reading . ' (taken ' . $worst['taken_at'] . ')',
            ];

            if (count($alertable) > 1) {
                $body[] = '';
                $body[] = sprintf(
                    '%d readings in the last %d hours were outside the band.',
                    count($alertable),
                    $settings['alert_hours']
                );
            }

            $historical = $flaggedTotal - count($alertable);

            if ($historical > 0) {
                // Said explicitly, because a clinician who sees a flagged run on
                // the chart and only one alert should know that was deliberate.
                $body[] = '';
                $body[] = sprintf(
                    '%d further reading%s in this import were outside the band but older than %d hours. '
                    . 'They are flagged on the chart and deliberately did not raise an alert -- importing '
                    . 'history must not page anybody about it.',
                    $historical,
                    $historical === 1 ? '' : 's',
                    $settings['alert_hours']
                );
            }

            $body[] = '';
            $body[] = 'This is one alert for the whole import, not one per reading.';

            $res = AlertService::raise([
                'type' => 'patient_reading_import',
                'urgency' => $worst['band']['urgency'] ?? 'urgent',
                'title' => sprintf(
                    '%s %s from %s, outside the safety band',
                    $k['label'],
                    $reading,
                    $sourceApp
                ),
                'body' => implode("\n", $body),
                'patient_id' => $patientId,
                'link' => ['patient_id' => $patientId, 'tab' => 'portal_reading_imports'],
                'targets' => $targets,
                'source_type' => 'portal_reading_imports',
                'source_id' => $importId,
                'dedupe_key' => 'portal_reading_import:' . $importId,
            ]);

            if (!empty($res['success']) && !empty($res['data']['id'])) {
                $alertId = (int) $res['data']['id'];

                // Stamp every reading this alert actually covers, so M7's own
                // "already alerted" view agrees with what happened.
                //
                // Scoped by the alert cutoff, NOT by the reading the alert was
                // named after: $worst is the most RECENT alertable reading, so
                // stamping from its timestamp onwards would mark only that one
                // and leave the other recent out-of-band readings looking as
                // though nobody had been told about them.
                Database::connection()->prepare(
                    'UPDATE patient_self_readings SET alert_id = ?, alerted_at = NOW()
                      WHERE import_id = ? AND out_of_band = 1 AND taken_at >= ?'
                )->execute([$alertId, $importId, $alertCutoff]);

                return $alertId;
            }
        } catch (Throwable $e) {
            error_log('reading import alert failed: ' . $e->getMessage());
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Reading back
    // ------------------------------------------------------------------

    /** The patient's own view: what has been brought in, and from where. */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();

        $stmt = $db->prepare(
            'SELECT * FROM portal_reading_imports
              WHERE patient_id = :p
              ORDER BY created_at DESC, id DESC
              LIMIT 30'
        );
        $stmt->execute(['p' => $patientId]);

        $items = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $items[] = [
                'id' => (int) $row['id'],
                'source_app' => $row['source_app'],
                'device_name' => $row['device_name'],
                'when' => $row['created_at'],
                'by_you' => (int) $row['is_patient_initiated'] === 1,
                'accepted' => (int) $row['accepted'],
                'duplicates' => (int) $row['duplicates'],
                'rejected' => (int) $row['rejected'],
                'covers' => $row['earliest_reading'] !== null
                    ? ['from' => substr((string) $row['earliest_reading'], 0, 10), 'to' => substr((string) $row['latest_reading'], 0, 10)]
                    : null,
                // The patient is told what was dropped and why. "We ignored 6 of
                // your readings" with no reason is not something they can act on.
                'reject_reasons' => self::decodeRejects($row['reject_reasons']),
                'summary' => self::patientSummary($row),
            ];
        }

        return [
            'items' => $items,
            'allow' => $settings['allow'],
            'blocked_reason' => $settings['allow']
                ? null
                : 'Bringing readings in from a device is switched off at the moment. You can still add them by hand.',
            'format_hint' => self::FORMAT_HINT,
        ];
    }

    /** The clinician's view of one patient's imports. */
    public static function history(int $patientId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT i.*,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), '') AS started_by_name
             FROM portal_reading_imports i
             LEFT JOIN employees e ON e.user_id = i.started_by AND e.deleted_at IS NULL
             WHERE i.patient_id = :p
             ORDER BY i.created_at DESC, i.id DESC
             LIMIT 100"
        );
        $stmt->execute(['p' => $patientId]);

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'source_app' => $r['source_app'],
            'device_name' => $r['device_name'],
            'when' => $r['created_at'],
            'is_patient_initiated' => (int) $r['is_patient_initiated'] === 1,
            'started_by' => $r['started_by_name'],
            'total_submitted' => (int) $r['total_submitted'],
            'accepted' => (int) $r['accepted'],
            'duplicates' => (int) $r['duplicates'],
            'rejected' => (int) $r['rejected'],
            'reject_reasons' => self::decodeRejects($r['reject_reasons']),
            'earliest_reading' => $r['earliest_reading'],
            'latest_reading' => $r['latest_reading'],
            'flagged_count' => (int) $r['flagged_count'],
            'alertable_count' => (int) $r['alertable_count'],
            // The difference between these two is the thing worth seeing.
            'historical_flagged' => max(0, (int) $r['flagged_count'] - (int) $r['alertable_count']),
            'alert_id' => $r['alert_id'] !== null ? (int) $r['alert_id'] : null,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'items' => $items,
            'caveats' => self::CAVEATS,
            'settings' => self::settings(),
        ];
    }

    /** Recent imports across patients, for a desk screen. */
    public static function recent(string $q = ''): array
    {
        $db = Database::connection();
        $q = trim($q);

        $where = [];
        $params = [];

        if ($q !== '') {
            $where[] = "(p.patient_no LIKE :q OR CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) LIKE :q2 OR i.source_app LIKE :q3)";
            $params['q'] = "%{$q}%";
            $params['q2'] = "%{$q}%";
            $params['q3'] = "%{$q}%";
        }

        $stmt = $db->prepare(
            "SELECT i.*, p.patient_no,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), '') AS started_by_name
             FROM portal_reading_imports i
             JOIN patients p ON p.id = i.patient_id
             LEFT JOIN employees e ON e.user_id = i.started_by AND e.deleted_at IS NULL
             " . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . "
             ORDER BY i.created_at DESC, i.id DESC
             LIMIT 200"
        );
        $stmt->execute($params);

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'source_app' => $r['source_app'],
            'device_name' => $r['device_name'],
            'when' => $r['created_at'],
            'is_patient_initiated' => (int) $r['is_patient_initiated'] === 1,
            'started_by' => $r['started_by_name'],
            'accepted' => (int) $r['accepted'],
            'duplicates' => (int) $r['duplicates'],
            'rejected' => (int) $r['rejected'],
            'flagged_count' => (int) $r['flagged_count'],
            'alertable_count' => (int) $r['alertable_count'],
            'historical_flagged' => max(0, (int) $r['flagged_count'] - (int) $r['alertable_count']),
            'alert_id' => $r['alert_id'] !== null ? (int) $r['alert_id'] : null,
            'earliest_reading' => $r['earliest_reading'],
            'latest_reading' => $r['latest_reading'],
            'reject_reasons' => self::decodeRejects($r['reject_reasons']),
            'patient' => [
                'id' => (int) $r['patient_id'],
                'name' => $r['patient_name'],
                'mrn' => $r['patient_no'],
            ],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'items' => $items,
            'q' => $q,
            'caveats' => self::CAVEATS,
            'counts' => self::counts($db),
            'settings' => self::settings(),
            'format_hint' => self::FORMAT_HINT,
            'kinds' => array_map(static fn($k, $meta) => [
                'kind' => $k,
                'label' => $meta['label'],
                'units' => $meta['units'],
                'two_values' => isset($meta['label_2']),
            ], array_keys(PortalSelfReadingService::KINDS), PortalSelfReadingService::KINDS),
        ];
    }

    /** The readings one import brought in. */
    public static function readingsOf(int $importId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            'SELECT id, kind, value_1, value_2, units, taken_at, note, out_of_band,
                    source_app, device_name, external_id, alert_id
             FROM patient_self_readings
             WHERE import_id = ? AND deleted_at IS NULL
             ORDER BY taken_at DESC, id DESC
             LIMIT 600'
        );
        $stmt->execute([$importId]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'kind' => $r['kind'],
            'label' => PortalSelfReadingService::KINDS[$r['kind']]['label'] ?? $r['kind'],
            'reading' => PortalSelfReadingService::format(
                $r['kind'],
                $r['value_1'] !== null ? (float) $r['value_1'] : null,
                $r['value_2'] !== null ? (float) $r['value_2'] : null
            ),
            'taken_at' => $r['taken_at'],
            'note' => $r['note'],
            'out_of_band' => (int) $r['out_of_band'] === 1,
            'alerted' => $r['alert_id'] !== null,
            'external_id' => $r['external_id'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Patients, for the staff import form. */
    public static function findPatients(string $q): array
    {
        $q = trim($q);

        if (mb_strlen($q) < 2) {
            return [];
        }

        $stmt = Database::connection()->prepare(
            "SELECT id, patient_no,
                    TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name,
                    birthdate
             FROM patients
             WHERE deleted_at IS NULL
               AND (patient_no LIKE :q
                    OR CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) LIKE :q2)
             ORDER BY last_name, first_name
             LIMIT 20"
        );
        $stmt->execute(['q' => "%{$q}%", 'q2' => "%{$q}%"]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'] !== '' ? $r['name'] : 'Unnamed record',
            'mrn' => $r['patient_no'],
            'birthdate' => $r['birthdate'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    public const FORMAT_HINT = 'One reading per line: measure, when, value'
        . ' (and the second number for blood pressure). For example:'
        . ' bp, 2026-11-14 08:30, 128, 82';

    /**
     * The dedupe key.
     *
     * An external id from the source app wins when there is one -- it is what
     * the app itself calls this sample, and it survives the patient editing a
     * note. Otherwise a content hash of the measure, the minute and the values,
     * because two identical readings for the same measure in the same minute are
     * a duplicate by any reasonable definition.
     *
     * Minute precision, not second: a watch that re-reports the same sample with
     * a slightly different sub-minute timestamp would otherwise land twice.
     */
    private static function hashOf(int $patientId, array $row): string
    {
        if ($row['external_id'] !== null && $row['external_id'] !== '') {
            return sha1('ext:' . $patientId . '|' . $row['external_id']);
        }

        return sha1(implode('|', [
            'val',
            $patientId,
            $row['kind'],
            substr((string) $row['taken_at'], 0, 16),
            self::trimNum((float) $row['value_1']),
            $row['value_2'] !== null ? self::trimNum((float) $row['value_2']) : '',
        ]));
    }

    /** M7's own band test, which is private there. Same comparison, same result. */
    private static function outside(array $band, ?float $v1, ?float $v2): bool
    {
        foreach ([[$v1, $band['value_1_low'] ?? null, $band['value_1_high'] ?? null],
                  [$v2, $band['value_2_low'] ?? null, $band['value_2_high'] ?? null]] as [$value, $low, $high]) {
            if ($value === null) {
                continue;
            }

            if ($low !== null && $value < (float) $low) {
                return true;
            }

            if ($high !== null && $value > (float) $high) {
                return true;
            }
        }

        return false;
    }

    private static function summaryLine(int $accepted, int $duplicates, int $rejected, int $flagged, int $alerted): string
    {
        // "0 readings saved, 11 already in your record" is technically true and
        // reads like a failure. Say what actually happened instead.
        if ($accepted === 0 && $rejected === 0 && $duplicates > 0) {
            return 'Nothing new -- we already had all ' . $duplicates
                . ($duplicates === 1 ? ' of these.' : ' of these.');
        }

        $parts = [];
        $parts[] = $accepted === 1 ? '1 reading saved' : $accepted . ' readings saved';

        if ($duplicates > 0) {
            $parts[] = $duplicates . ' already in your record';
        }

        if ($rejected > 0) {
            $parts[] = $rejected . ($rejected === 1 ? ' could not be read' : ' could not be read');
        }

        $line = ucfirst(implode(', ', $parts)) . '.';

        if ($alerted > 0) {
            $line .= ' Some recent readings are outside the range we watch for, so your care team has been told.';
        } elseif ($flagged > 0) {
            // Said plainly rather than left as a silent flag: the patient should
            // know the numbers are marked without being told somebody is acting
            // on readings from weeks ago.
            $line .= ' Some older readings are outside the range we watch for. They are marked on your chart'
                . ' for your care team to see at your next contact.';
        }

        return $line;
    }

    private static function patientSummary(array $row): string
    {
        $accepted = (int) $row['accepted'];
        $duplicates = (int) $row['duplicates'];
        $rejected = (int) $row['rejected'];

        return self::summaryLine($accepted, $duplicates, $rejected, (int) $row['flagged_count'], (int) $row['alertable_count']);
    }

    private static function decodeRejects(?string $json): array
    {
        if ($json === null || $json === '') {
            return [];
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : [];
    }

    private static function batchesToday(PDO $db, int $patientId): int
    {
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM portal_reading_imports
              WHERE patient_id = ? AND DATE(created_at) = CURDATE()'
        );
        $stmt->execute([$patientId]);

        return (int) $stmt->fetchColumn();
    }

    private static function counts(PDO $db): array
    {
        $out = ['today' => 0, 'readings_today' => 0, 'flagged_today' => 0];

        try {
            $row = $db->query(
                'SELECT COUNT(*) c, COALESCE(SUM(accepted), 0) a, COALESCE(SUM(flagged_count), 0) f
                 FROM portal_reading_imports WHERE DATE(created_at) = CURDATE()'
            )->fetch(PDO::FETCH_ASSOC);

            $out['today'] = (int) ($row['c'] ?? 0);
            $out['readings_today'] = (int) ($row['a'] ?? 0);
            $out['flagged_today'] = (int) ($row['f'] ?? 0);
        } catch (Throwable $e) {
            // Decoration on a screen; must not stop it loading.
        }

        return $out;
    }

    private static function num($value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $s = trim((string) $value);

        if ($s === '' || !is_numeric($s)) {
            return null;
        }

        return (float) $s;
    }

    /** 128 rather than 128.00, 70.5 rather than 70.50. */
    private static function trimNum(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }

    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                'SELECT portal_allow_reading_import, portal_import_alert_hours,
                        portal_import_max_rows, portal_import_max_per_day
                 FROM general_settings ORDER BY id LIMIT 1'
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];

        $hours = (int) ($row['portal_import_alert_hours'] ?? self::DEFAULT_ALERT_HOURS);
        $maxRows = (int) ($row['portal_import_max_rows'] ?? self::DEFAULT_MAX_ROWS);
        $perDay = (int) ($row['portal_import_max_per_day'] ?? self::DEFAULT_MAX_PER_DAY);

        return [
            'allow' => (int) ($row['portal_allow_reading_import'] ?? 1) === 1,
            // 0 is allowed and means "never alert on an import". Clamped at the
            // top only, because a hospital that wants no automatic paging from
            // device data is making a defensible choice.
            'alert_hours' => ($hours >= 0 && $hours <= 720) ? $hours : self::DEFAULT_ALERT_HOURS,
            'max_rows' => ($maxRows >= 1 && $maxRows <= 5000) ? $maxRows : self::DEFAULT_MAX_ROWS,
            'max_per_day' => ($perDay >= 1 && $perDay <= 200) ? $perDay : self::DEFAULT_MAX_PER_DAY,
        ];
    }

    private static function fail(string $message, bool $notFound = false, ?array $errors = null): array
    {
        $out = ['success' => false, 'message' => $message];

        if ($notFound) {
            $out['not_found'] = true;
        }

        if ($errors) {
            $out['errors'] = $errors;
        }

        return $out;
    }
}
