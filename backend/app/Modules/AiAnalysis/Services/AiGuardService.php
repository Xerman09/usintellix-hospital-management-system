<?php

namespace App\Modules\AiAnalysis\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Core\RoleAccess;
use PDO;

/**
 * Everything that has to be true before a single token is bought.
 *
 * Built before the client that calls the provider, and separately from it, for
 * one reason: a guard that lives inside the thing it guards gets edited by
 * whoever is in a hurry to make the thing work. This has its own file, its own
 * tests, and no knowledge of any provider. It answers one question --
 * may this run, and what will it cost -- and `AiAnalysisService` is required to
 * ask it.
 *
 * THE ORDER OF THE CHECKS IS THE DESIGN.
 *
 *   1. Switched on at all?        -- cheapest possible no.
 *   2. May this person?           -- a capability, so it is a security answer
 *                                    before it is a money answer.
 *   3. Is the answer already had? -- a cache hit costs nothing, so it is
 *                                    offered before any limit that exists to
 *                                    control cost. Somebody reopening an
 *                                    unchanged report should never be told to
 *                                    wait.
 *   4. Is the payload sane?       -- size, before it is sent anywhere.
 *   5. Rate limits.               -- stop a loop.
 *   6. Spend caps.                -- stop a month.
 *
 * Putting the cache above the rate limits is deliberate and is the difference
 * between a guard people work around and one they do not notice.
 *
 * WHAT IT DOES NOT DO.
 *
 * It does not decide what may be sent -- that is `AiPayload`, which projects a
 * report down to an allowlist of fields. The two are separate because one is
 * about money and the other is about data leaving the hospital, and conflating
 * them would mean a change to a spend cap touching the file that keeps patient
 * data in the building.
 */
class AiGuardService
{
    /** Staff capability. Not seeded for any role but admin -- see seed 090. */
    public const CAP = 'ai_analysis';

    public const MODULE = 'ai_analysis';

    /** Returned by check() when everything passed. */
    public const OK = 'ok';

    // Refusal reasons. Short, stable, and safe to put in a ledger.
    public const OFF = 'feature_off';
    public const NOT_ALLOWED = 'not_permitted';
    public const PAYLOAD_TOO_BIG = 'payload_too_big';
    public const PAYLOAD_EMPTY = 'payload_empty';
    public const TOO_SOON = 'cooldown';
    public const TOO_MANY = 'hourly_limit';
    public const USER_CAP = 'user_daily_cap';
    public const DAILY_CAP = 'hospital_daily_cap';
    public const MONTHLY_CAP = 'hospital_monthly_cap';

    /**
     * Fallback limits, used only when general_settings cannot be read.
     *
     * Deliberately tighter than the seeded defaults. If the settings table is
     * unreadable the right failure is a stingy one.
     */
    private const FALLBACK = [
        'allow_ai_analysis' => 0,
        'ai_cap_daily_usd' => 1.00,
        'ai_cap_monthly_usd' => 10.00,
        'ai_cap_user_daily_usd' => 0.50,
        'ai_max_runs_per_user_per_hour' => 10,
        'ai_min_seconds_between_runs' => 30,
        'ai_cache_ttl_minutes' => 30,
        'ai_max_payload_bytes' => 20000,
        'ai_max_output_tokens' => 600,
    ];

    // ==================================================================
    // The gate
    // ==================================================================

    /**
     * May this run?
     *
     * @param array $payload The already-projected payload. Passing an
     *                       unprojected report here is a bug in the caller;
     *                       this class hashes what it is given and does not
     *                       second-guess it.
     *
     * @return array{allowed: bool, reason: string, message: string,
     *               payload_hash: string, payload_bytes: int,
     *               cached: ?array, limits: array}
     */
    public static function check(
        string $reportKey,
        array $payload,
        ?int $userId,
        ?string $role,
        ?string $ip = null
    ): array {
        $limits = self::limits();
        $encoded = self::encode($payload);
        $hash = hash('sha256', $reportKey . '|' . $encoded);
        $bytes = strlen($encoded);

        $no = static fn(string $reason, string $message): array => [
            'allowed' => false,
            'reason' => $reason,
            'message' => $message,
            'payload_hash' => $hash,
            'payload_bytes' => $bytes,
            'cached' => null,
            'limits' => $limits,
        ];

        // 1. Switched on at all.
        if ((int) $limits['allow_ai_analysis'] !== 1) {
            return $no(self::OFF, 'AI analysis is switched off for this hospital.');
        }

        // 2. May this person. A security answer before a money one.
        if (!self::permitted($role)) {
            self::record($reportKey, $userId, $role, 'refused', self::NOT_ALLOWED, null, $hash, $bytes, null, $ip);

            // Audited, unlike the other refusals: the rest mean "not now", this
            // one means somebody reached a surface they do not hold.
            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'AI_ANALYSIS_DENIED',
                sprintf('AI analysis of "%s" was refused: the %s role does not hold the %s capability.',
                    $reportKey, $role ?? 'unknown', self::CAP),
                null,
                $userId,
                $role
            );

            return $no(self::NOT_ALLOWED, 'You do not have access to AI analysis.');
        }

        // 3. Already answered. Free, so it comes before every limit below.
        $cached = self::cached($hash, $limits['model'] ?? '');

        if ($cached !== null) {
            return [
                'allowed' => true,
                'reason' => 'cached',
                'message' => '',
                'payload_hash' => $hash,
                'payload_bytes' => $bytes,
                'cached' => $cached,
                'limits' => $limits,
            ];
        }

        // 4. Is the payload sane.
        if ($payload === []) {
            return $no(self::PAYLOAD_EMPTY, 'There is nothing in this report to analyse.');
        }

        if ($bytes > (int) $limits['ai_max_payload_bytes']) {
            return $no(self::PAYLOAD_TOO_BIG, sprintf(
                'This report is too large to analyse (%s, limit %s). Narrow the date range or the filters.',
                self::humanBytes($bytes),
                self::humanBytes((int) $limits['ai_max_payload_bytes'])
            ));
        }

        // 5. Rate limits. A loop dies here.
        $db = Database::connection();
        $now = self::now($db);

        if ($userId !== null) {
            $sinceLast = self::secondsSinceLastRun($db, $userId, $now);
            $gap = (int) $limits['ai_min_seconds_between_runs'];

            if ($sinceLast !== null && $sinceLast < $gap) {
                return $no(self::TOO_SOON, sprintf(
                    'Please wait %d more second%s before asking for another analysis.',
                    $gap - $sinceLast,
                    ($gap - $sinceLast) === 1 ? '' : 's'
                ));
            }

            $thisHour = self::runsInLastHour($db, $userId, $now);

            if ($thisHour >= (int) $limits['ai_max_runs_per_user_per_hour']) {
                return $no(self::TOO_MANY, sprintf(
                    'You have used AI analysis %d times in the last hour, which is the limit. Try again later.',
                    $thisHour
                ));
            }

            // 6a. This person's day.
            $userSpend = self::spentByUserToday($db, $userId, $now);

            if ($userSpend >= (float) $limits['ai_cap_user_daily_usd']) {
                return $no(self::USER_CAP, 'You have reached your daily limit for AI analysis. It resets tomorrow.');
            }
        }

        // 6b. The hospital's day, then its month.
        $daySpend = self::spentSince($db, self::startOfDay($now), $now);

        if ($daySpend >= (float) $limits['ai_cap_daily_usd']) {
            return $no(self::DAILY_CAP, 'The hospital has reached its daily limit for AI analysis. It resets tomorrow.');
        }

        $monthSpend = self::spentSince($db, self::startOfMonth($now), $now);

        if ($monthSpend >= (float) $limits['ai_cap_monthly_usd']) {
            return $no(self::MONTHLY_CAP, 'The hospital has reached its monthly limit for AI analysis. Contact an administrator.');
        }

        return [
            'allowed' => true,
            'reason' => self::OK,
            'message' => '',
            'payload_hash' => $hash,
            'payload_bytes' => $bytes,
            'cached' => null,
            'limits' => $limits,
        ];
    }

    // ==================================================================
    // Recording what happened
    // ==================================================================

    /**
     * Write a ledger row. Every attempt, including the free ones.
     *
     * @param array|null $usage ['input_tokens'=>int,'output_tokens'=>int,'cache_read_tokens'=>int]
     */
    public static function record(
        string $reportKey,
        ?int $userId,
        ?string $role,
        string $status,
        ?string $reason,
        ?string $model,
        ?string $payloadHash,
        ?int $payloadBytes,
        ?array $usage = null,
        ?string $ip = null,
        ?int $durationMs = null,
        array $droppedKeys = []
    ): int {
        $db = Database::connection();

        $input = (int) ($usage['input_tokens'] ?? 0);
        $output = (int) ($usage['output_tokens'] ?? 0);
        $cacheRead = (int) ($usage['cache_read_tokens'] ?? 0);

        $stmt = $db->prepare(
            "INSERT INTO ai_analysis_runs
                (report_key, user_id, user_role, status, reason, model,
                 payload_sha256, payload_bytes, dropped_keys,
                 input_tokens, output_tokens, cache_read_tokens,
                 estimated_cost_usd, duration_ms, requested_ip, created_at)
             VALUES (:report, :user, :role, :status, :reason, :model,
                     :hash, :bytes, :dropped,
                     :input, :output, :cache_read,
                     :cost, :duration, :ip, :now)"
        );

        $stmt->execute([
            'report' => mb_substr($reportKey, 0, 64),
            'user' => $userId,
            'role' => $role !== null ? mb_substr($role, 0, 64) : null,
            'status' => $status,
            'reason' => $reason !== null ? mb_substr($reason, 0, 190) : null,
            'model' => $model,
            'hash' => $payloadHash,
            'bytes' => $payloadBytes,
            'dropped' => $droppedKeys ? mb_substr(implode(',', $droppedKeys), 0, 500) : null,
            'input' => $input,
            'output' => $output,
            'cache_read' => $cacheRead,
            'cost' => self::costOf($model, $input, $output, $cacheRead),
            'duration' => $durationMs,
            'ip' => $ip,
            'now' => self::now($db),
        ]);

        return (int) $db->lastInsertId();
    }

    /** Keep a generated answer for the TTL, so the same question is free next time. */
    public static function remember(string $payloadHash, string $model, string $reportKey, array $response, array $usage): void
    {
        $db = Database::connection();
        $limits = self::limits();
        $now = self::now($db);
        $expires = date('Y-m-d H:i:s', strtotime($now) + ((int) $limits['ai_cache_ttl_minutes'] * 60));

        // REPLACE rather than INSERT IGNORE: a second answer to the same
        // question is newer, and the TTL should run from now.
        $db->prepare(
            "REPLACE INTO ai_analysis_cache
                (payload_sha256, model, report_key, response_json, input_tokens, output_tokens, expires_at, created_at)
             VALUES (:hash, :model, :report, :json, :input, :output, :expires, :now)"
        )->execute([
            'hash' => $payloadHash,
            'model' => $model,
            'report' => mb_substr($reportKey, 0, 64),
            'json' => json_encode($response),
            'input' => (int) ($usage['input_tokens'] ?? 0),
            'output' => (int) ($usage['output_tokens'] ?? 0),
            'expires' => $expires,
            'now' => $now,
        ]);
    }

    /** Drop expired cache rows. Called by the cron; safe to call any time. */
    public static function purgeCache(): int
    {
        $db = Database::connection();
        $stmt = $db->prepare('DELETE FROM ai_analysis_cache WHERE expires_at <= :now');
        $stmt->execute(['now' => self::now($db)]);

        return $stmt->rowCount();
    }

    // ==================================================================
    // What has been spent
    // ==================================================================

    /** @return array{today: float, month: float, runs_today: int, cached_today: int, refused_today: int} */
    public static function spendSummary(): array
    {
        $db = Database::connection();
        $now = self::now($db);
        $dayStart = self::startOfDay($now);

        $counts = $db->prepare(
            "SELECT status, COUNT(*) AS n FROM ai_analysis_runs
              WHERE created_at >= :since GROUP BY status"
        );
        $counts->execute(['since' => $dayStart]);

        $byStatus = [];

        foreach ($counts->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $byStatus[$row['status']] = (int) $row['n'];
        }

        return [
            'today' => self::spentSince($db, $dayStart, $now),
            'month' => self::spentSince($db, self::startOfMonth($now), $now),
            'runs_today' => $byStatus['allowed'] ?? 0,
            'cached_today' => $byStatus['cached'] ?? 0,
            'refused_today' => $byStatus['refused'] ?? 0,
        ];
    }

    /** What a run of this shape would cost, in US dollars. */
    public static function costOf(?string $model, int $input, int $output, int $cacheRead = 0): float
    {
        if ($model === null || ($input === 0 && $output === 0 && $cacheRead === 0)) {
            return 0.0;
        }

        $rate = self::rateFor($model);

        if ($rate === null) {
            // An unpriced model is not free, and pretending it is would make
            // every cap wrong in the direction that costs money. Price it as
            // the dearest rate on file so it is caught, not missed.
            $rate = self::dearestRate();
        }

        if ($rate === null) {
            return 0.0;
        }

        return round(
            ($input / 1000000) * (float) $rate['input_usd_per_mtok']
            + ($output / 1000000) * (float) $rate['output_usd_per_mtok']
            + ($cacheRead / 1000000) * (float) $rate['cache_read_usd_per_mtok'],
            6
        );
    }

    // ==================================================================
    // Plumbing
    // ==================================================================

    private static function permitted(?string $role): bool
    {
        if ($role === null || $role === '') {
            return false;
        }

        return RoleAccess::hasPermission($role, self::CAP);
    }

    private static function cached(string $hash, string $model): ?array
    {
        if ($model === '') {
            return null;
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            'SELECT response_json, input_tokens, output_tokens, created_at
               FROM ai_analysis_cache
              WHERE payload_sha256 = :hash AND model = :model AND expires_at > :now
              LIMIT 1'
        );
        $stmt->execute(['hash' => $hash, 'model' => $model, 'now' => self::now($db)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $decoded = json_decode((string) $row['response_json'], true);

        return is_array($decoded)
            ? ['response' => $decoded, 'generated_at' => $row['created_at']]
            : null;
    }

    /**
     * The limits in force, plus the configured model so the cache can be keyed
     * on it. Falls back to FALLBACK if general_settings cannot be read.
     */
    public static function limits(): array
    {
        $limits = self::FALLBACK;

        try {
            $row = Database::connection()
                ->query('SELECT * FROM general_settings ORDER BY id LIMIT 1')
                ->fetch(PDO::FETCH_ASSOC);

            foreach (array_keys(self::FALLBACK) as $key) {
                if (is_array($row) && array_key_exists($key, $row) && $row[$key] !== null) {
                    $limits[$key] = $row[$key];
                }
            }
        } catch (\Throwable $e) {
            // Keep the stingy defaults.
        }

        try {
            $config = require __DIR__ . '/../../../../config/ai.php';
            $limits['model'] = (string) ($config['model'] ?? '');
        } catch (\Throwable $e) {
            $limits['model'] = '';
        }

        return $limits;
    }

    private static function secondsSinceLastRun(PDO $db, int $userId, string $now): ?int
    {
        // Only runs that reached the provider count towards the cooldown. A
        // refusal is not a reason to be made to wait longer, and a cache hit
        // cost nothing.
        $stmt = $db->prepare(
            "SELECT created_at FROM ai_analysis_runs
              WHERE user_id = :u AND status = 'allowed'
              ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['u' => $userId]);
        $last = $stmt->fetchColumn();

        if ($last === false) {
            return null;
        }

        return max(0, strtotime($now) - strtotime((string) $last));
    }

    private static function runsInLastHour(PDO $db, int $userId, string $now): int
    {
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM ai_analysis_runs
              WHERE user_id = :u AND status = 'allowed' AND created_at >= :since"
        );
        $stmt->execute(['u' => $userId, 'since' => date('Y-m-d H:i:s', strtotime($now) - 3600)]);

        return (int) $stmt->fetchColumn();
    }

    private static function spentByUserToday(PDO $db, int $userId, string $now): float
    {
        $stmt = $db->prepare(
            'SELECT COALESCE(SUM(estimated_cost_usd), 0) FROM ai_analysis_runs
              WHERE user_id = :u AND created_at >= :since'
        );
        $stmt->execute(['u' => $userId, 'since' => self::startOfDay($now)]);

        return (float) $stmt->fetchColumn();
    }

    private static function spentSince(PDO $db, string $since, string $now): float
    {
        $stmt = $db->prepare(
            'SELECT COALESCE(SUM(estimated_cost_usd), 0) FROM ai_analysis_runs
              WHERE created_at >= :since AND created_at <= :now'
        );
        $stmt->execute(['since' => $since, 'now' => $now]);

        return (float) $stmt->fetchColumn();
    }

    private static function rateFor(string $model): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM ai_model_rates WHERE model = :m LIMIT 1');
        $stmt->execute(['m' => $model]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function dearestRate(): ?array
    {
        $row = Database::connection()
            ->query('SELECT * FROM ai_model_rates ORDER BY output_usd_per_mtok DESC LIMIT 1')
            ->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Stable bytes for hashing.
     *
     * Sorted keys, so two payloads that differ only in key order hash the same
     * and share a cache entry. Without this the cache would miss constantly and
     * the commonest cost control would silently do nothing.
     */
    private static function encode(array $payload): string
    {
        $sort = static function (&$value) use (&$sort): void {
            if (!is_array($value)) {
                return;
            }

            foreach ($value as &$inner) {
                $sort($inner);
            }
            unset($inner);

            if (array_keys($value) !== range(0, count($value) - 1)) {
                ksort($value);
            }
        };

        $copy = $payload;
        $sort($copy);

        return (string) json_encode($copy, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /** The database's clock. PHP's is seven hours out on the machine this was written on. */
    private static function now(PDO $db): string
    {
        return (string) $db->query('SELECT NOW()')->fetchColumn();
    }

    private static function startOfDay(string $now): string
    {
        return date('Y-m-d 00:00:00', strtotime($now));
    }

    private static function startOfMonth(string $now): string
    {
        return date('Y-m-01 00:00:00', strtotime($now));
    }

    private static function humanBytes(int $bytes): string
    {
        return $bytes >= 1024 ? round($bytes / 1024, 1) . ' KB' : $bytes . ' bytes';
    }
}
