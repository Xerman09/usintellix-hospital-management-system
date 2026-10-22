<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Core\Env;
use App\Modules\HealthRecords\Services\HealthRecordSummaryService;
use PDO;
use Throwable;

/**
 * Sharing a record outward (Phase 8): the time-limited link an outside doctor opens,
 * and the same pack the patient can print or download for themselves.
 *
 * Three rules this service exists to keep:
 *
 *   1. A share is a few sections, never the whole chart. The scope is chosen when the
 *      link is made, stored on the row, and applied again every time the link is
 *      opened -- so widening it later means making a new link.
 *   2. A share can never show the patient something they could not see themselves.
 *      Results come from PortalResultService, which applies the Phase 1 release gate,
 *      not from the staff tables underneath it.
 *   3. Every hit on a link is written down, including the refused ones, so "nobody
 *      opened it" and "someone tried after I revoked it" are different answers.
 */
class PortalShareService
{
    /** What a patient may put in a share, in the words they choose it by. */
    public const SECTIONS = [
        'allergies' => 'Allergies',
        'problems' => 'Conditions and problems',
        'medications' => 'Medicines',
        'immunizations' => 'Immunisations',
        'results' => 'Test results',
        'visits' => 'Visits',
        'care_team' => 'My doctor',
    ];

    /** Ticked when the patient has chosen nothing: the three an outside doctor needs first. */
    public const DEFAULT_SCOPE = ['allergies', 'problems', 'medications'];

    public const DEFAULT_DAYS = 14;
    public const MAX_DAYS = 90;

    /** How many resulted orders a share carries in full. */
    public const MAX_RESULTS = 20;

    // ------------------------------------------------------------------
    // Making, listing and revoking a link
    // ------------------------------------------------------------------

    public static function create(int $patientId, array $in, ?int $userId): array
    {
        $errors = [];
        $label = trim((string) ($in['label'] ?? ''));
        $days = (int) ($in['days'] ?? self::DEFAULT_DAYS);
        $scope = self::cleanScope($in['scope'] ?? []);

        if ($label === '') {
            $errors['label'] = 'Say who this link is for, so you can tell your links apart.';
        } elseif (mb_strlen($label) > 150) {
            $errors['label'] = 'Keep that under 150 characters.';
        }

        if ($days < 1 || $days > self::MAX_DAYS) {
            $errors['days'] = 'A link can last between 1 and ' . self::MAX_DAYS . ' days.';
        }

        if (!$scope) {
            $errors['scope'] = 'Choose at least one part of your record to share.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'That link could not be made.', 'errors' => $errors];
        }

        $db = Database::connection();
        $token = bin2hex(random_bytes(32));

        $stmt = $db->prepare(
            "INSERT INTO record_shares (patient_id, token, label, scope, expires_at, created_at, created_by)
             VALUES (:p, :t, :l, :s, DATE_ADD(NOW(), INTERVAL :d DAY), NOW(), :u)"
        );
        $stmt->bindValue('p', $patientId, PDO::PARAM_INT);
        $stmt->bindValue('t', $token, PDO::PARAM_STR);
        $stmt->bindValue('l', $label, PDO::PARAM_STR);
        $stmt->bindValue('s', json_encode(array_values($scope)), PDO::PARAM_STR);
        $stmt->bindValue('d', $days, PDO::PARAM_INT);
        $stmt->bindValue('u', $userId, $userId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->execute();

        $id = (int) $db->lastInsertId();

        return [
            'success' => true,
            'message' => 'Your link is ready. Anyone who has it can read the parts you chose until it expires, '
                . 'so send it only to the doctor you meant it for.',
            'data' => ['id' => $id, 'token' => $token, 'url' => self::urlFor($token)] + self::row($patientId, $id),
        ];
    }

    /** The patient's links, newest first, each with how it stands today. */
    public static function listFor(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, token, label, scope, expires_at, access_count, last_viewed_at, revoked_at, created_at,
                    (revoked_at IS NOT NULL) AS is_revoked, (expires_at <= NOW()) AS is_expired
             FROM record_shares WHERE patient_id = :p ORDER BY id DESC LIMIT 50"
        );
        $stmt->execute(['p' => $patientId]);

        return array_map(static fn(array $r) => self::out($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public static function revoke(int $patientId, int $id, ?int $userId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id, label, revoked_at FROM record_shares WHERE id = :i AND patient_id = :p");
        $stmt->execute(['i' => $id, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return ['success' => false, 'message' => 'That link could not be found.', 'not_found' => true];
        }

        if ($row['revoked_at'] !== null) {
            return ['success' => false, 'message' => 'That link has already been switched off.'];
        }

        $db->prepare("UPDATE record_shares SET revoked_at = NOW(), revoked_by = :u WHERE id = :i")
            ->execute(['i' => $id, 'u' => $userId]);

        return [
            'success' => true,
            'message' => 'That link is switched off. Anyone who opens it now sees nothing, and you will see that they tried.',
            'data' => ['id' => $id],
        ];
    }

    // ------------------------------------------------------------------
    // Opening a link (no login -- this is the outside doctor)
    // ------------------------------------------------------------------

    /**
     * Returns the pack for a live link, or a plain reason it cannot be opened. Every
     * outcome is written to record_share_views, because an attempt on a dead link is
     * exactly the kind of thing the patient should be able to see.
     */
    public static function open(string $token): array
    {
        $token = trim($token);

        if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
            self::logView(null, null, 'unknown');
            return ['success' => false, 'message' => 'This link is not valid.', 'state' => 'unknown'];
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT s.id, s.patient_id, s.label, s.scope, s.expires_at, s.revoked_at,
                    (s.expires_at <= NOW()) AS is_expired
             FROM record_shares s WHERE s.token = :t"
        );
        $stmt->execute(['t' => $token]);
        $share = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$share) {
            self::logView(null, null, 'unknown');
            return ['success' => false, 'message' => 'This link is not valid.', 'state' => 'unknown'];
        }

        if ($share['revoked_at'] !== null) {
            self::logView((int) $share['id'], (int) $share['patient_id'], 'revoked');
            return ['success' => false, 'message' => 'The patient has switched this link off.', 'state' => 'revoked'];
        }

        if ((int) $share['is_expired'] === 1) {
            self::logView((int) $share['id'], (int) $share['patient_id'], 'expired');
            return ['success' => false, 'message' => 'This link has expired. Ask the patient for a new one.', 'state' => 'expired'];
        }

        self::logView((int) $share['id'], (int) $share['patient_id'], 'opened');

        $db->prepare("UPDATE record_shares SET access_count = access_count + 1, last_viewed_at = NOW() WHERE id = :i")
            ->execute(['i' => (int) $share['id']]);

        $scope = self::cleanScope(json_decode((string) $share['scope'], true) ?: []);

        return [
            'success' => true,
            'message' => 'Shared record retrieved successfully.',
            'data' => [
                'state' => 'open',
                'shared_with' => $share['label'],
                'expires_at' => $share['expires_at'],
                'sections' => array_values(array_map(static fn($k) => ['key' => $k, 'label' => self::SECTIONS[$k]], $scope)),
            ] + self::pack((int) $share['patient_id'], $scope),
        ];
    }

    // ------------------------------------------------------------------
    // The record pack itself
    // ------------------------------------------------------------------

    /**
     * The sections named in $scope, and nothing else. Used both for a share and for
     * the patient's own printable copy, so what an outside doctor reads is exactly
     * what the patient saw before they sent it.
     */
    public static function pack(int $patientId, array $scope): array
    {
        $scope = self::cleanScope($scope);
        $summary = (new HealthRecordSummaryService())->getSummary($patientId) ?: [];
        $demo = $summary['demographics'] ?? [];

        $out = [
            'patient' => [
                'name' => trim(implode(' ', array_filter([
                    $demo['first_name'] ?? null, $demo['middle_name'] ?? null, $demo['last_name'] ?? null,
                ]))),
                'patient_no' => $demo['patient_no'] ?? null,
                'birthdate' => $demo['birthdate'] ?? null,
                'sex' => $demo['sex'] ?? null,
                'blood_type' => $demo['blood_type'] ?? null,
            ],
            'prepared_at' => (string) Database::connection()->query("SELECT NOW()")->fetchColumn(),
            'scope' => array_values($scope),
        ];

        foreach ($scope as $key) {
            $out[$key] = self::section($patientId, $key, $summary);
        }

        return $out;
    }

    private static function section(int $patientId, string $key, array $summary): array
    {
        switch ($key) {
            case 'allergies':
            case 'problems':
            case 'medications':
            case 'immunizations':
                return array_values($summary[$key] ?? []);

            case 'care_team':
                return $summary['care_provider'] ? [$summary['care_provider']] : [];

            case 'visits':
                // Past visits only: an outside doctor is reading what happened, and a
                // future appointment is not theirs to see.
                return array_values(PortalVisitService::list($patientId)['past'] ?? []);

            case 'results':
                // Through the portal's own reader, so the Phase 1 release gate still
                // applies -- a held result cannot leave by this door.
                $items = PortalResultService::list($patientId)['items'] ?? [];
                $out = [];

                foreach (array_slice($items, 0, self::MAX_RESULTS) as $item) {
                    $full = PortalResultService::show($patientId, (int) $item['order_id']);

                    if ($full) {
                        $out[] = $full;
                    }
                }

                return $out;
        }

        return [];
    }

    // ------------------------------------------------------------------
    // Who has seen my record
    // ------------------------------------------------------------------

    /**
     * The patient's own access log: their portal activity (portal_audit_logs) and every
     * hit on a share link, newest first. The disclosure accounting staff keep is a
     * separate report (/disclosures/report), which the portal already lets them read.
     */
    public static function accessLog(int $patientId, int $days = 90, int $limit = 200): array
    {
        $db = Database::connection();
        $days = max(7, min(365, $days));

        $stmt = $db->prepare(
            "SELECT a.created_at AS at, a.event_type, a.description, a.status, a.ip_address,
                    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username) AS who,
                    CASE WHEN p.user_id = a.user_id THEN 'you' WHEN e.id IS NOT NULL THEN 'staff' ELSE 'proxy' END AS who_kind
             FROM portal_audit_logs a
             LEFT JOIN users u ON u.id = a.user_id
             LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
             LEFT JOIN patients p ON p.id = a.patient_id
             WHERE a.patient_id = :p AND a.created_at >= DATE_SUB(NOW(), INTERVAL :d DAY)
             ORDER BY a.created_at DESC, a.id DESC
             LIMIT :l"
        );
        $stmt->bindValue('p', $patientId, PDO::PARAM_INT);
        $stmt->bindValue('d', $days, PDO::PARAM_INT);
        $stmt->bindValue('l', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $portal = array_map(static fn(array $r) => [
            'at' => $r['at'],
            'kind' => 'portal',
            'who' => $r['who_kind'] === 'you' ? 'You' : ($r['who'] ?: 'Hospital staff'),
            'who_kind' => $r['who_kind'],
            'what' => $r['event_type'],
            // The audit writer defaults a description to the event name; repeating it
            // under the same row reads like a stutter, so it is dropped here.
            'detail' => $r['description'] === $r['event_type'] ? '' : $r['description'],
            'refused' => $r['status'] === PortalAudit::DENIED,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT v.viewed_at AS at, v.outcome, v.ip_address, s.label
             FROM record_share_views v
             LEFT JOIN record_shares s ON s.id = v.share_id
             WHERE v.patient_id = :p AND v.viewed_at >= DATE_SUB(NOW(), INTERVAL :d DAY)
             ORDER BY v.viewed_at DESC, v.id DESC
             LIMIT :l"
        );
        $stmt->bindValue('p', $patientId, PDO::PARAM_INT);
        $stmt->bindValue('d', $days, PDO::PARAM_INT);
        $stmt->bindValue('l', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $shares = array_map(static fn(array $r) => [
            'at' => $r['at'],
            'kind' => 'share',
            'who' => $r['label'] ? 'Shared link for ' . $r['label'] : 'A shared link',
            'who_kind' => 'outside',
            'what' => $r['outcome'] === 'opened' ? 'Shared link opened' : 'Shared link refused',
            'detail' => [
                'opened' => 'They read the parts you shared.',
                'expired' => 'Someone opened the link after it had expired. They saw nothing.',
                'revoked' => 'Someone opened the link after you switched it off. They saw nothing.',
                'unknown' => 'Someone tried a link that does not exist.',
            ][$r['outcome']] ?? '',
            'refused' => $r['outcome'] !== 'opened',
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $all = array_merge($portal, $shares);
        usort($all, static fn($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        return [
            'days' => $days,
            'items' => array_slice($all, 0, $limit),
            'counts' => [
                'you' => count(array_filter($all, static fn($r) => $r['who_kind'] === 'you')),
                'staff' => count(array_filter($all, static fn($r) => $r['who_kind'] === 'staff')),
                'proxy' => count(array_filter($all, static fn($r) => $r['who_kind'] === 'proxy')),
                'outside' => count(array_filter($all, static fn($r) => $r['who_kind'] === 'outside')),
                'refused' => count(array_filter($all, static fn($r) => $r['refused'])),
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------

    /** Only keys this service knows about survive, in a fixed order, with no duplicates. */
    public static function cleanScope($scope): array
    {
        if (is_string($scope)) {
            $scope = array_filter(array_map('trim', explode(',', $scope)));
        }

        if (!is_array($scope)) {
            return [];
        }

        return array_values(array_filter(array_keys(self::SECTIONS), static fn($k) => in_array($k, $scope, true)));
    }

    /** The page an outside doctor opens. APP_URL points at the app; the page is in the frontend. */
    public static function urlFor(string $token): string
    {
        $base = rtrim((string) Env::get('APP_URL', ''), '/');

        return ($base !== '' ? $base : '') . '/frontend/share.html?token=' . $token;
    }

    private static function row(int $patientId, int $id): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, token, label, scope, expires_at, access_count, last_viewed_at, revoked_at, created_at,
                    (revoked_at IS NOT NULL) AS is_revoked, (expires_at <= NOW()) AS is_expired
             FROM record_shares WHERE id = :i AND patient_id = :p"
        );
        $stmt->execute(['i' => $id, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? self::out($row) : [];
    }

    private static function out(array $r): array
    {
        $scope = self::cleanScope(json_decode((string) $r['scope'], true) ?: []);

        return [
            'id' => (int) $r['id'],
            'label' => $r['label'],
            'scope' => $scope,
            'scope_words' => array_map(static fn($k) => self::SECTIONS[$k], $scope),
            'expires_at' => $r['expires_at'],
            'access_count' => (int) $r['access_count'],
            'last_viewed_at' => $r['last_viewed_at'],
            'revoked' => (int) $r['is_revoked'] === 1,
            'expired' => (int) $r['is_expired'] === 1,
            'live' => (int) $r['is_revoked'] === 0 && (int) $r['is_expired'] === 0,
            'created_at' => $r['created_at'],
            'url' => self::urlFor((string) $r['token']),
        ];
    }

    /** Never let a logging failure decide whether a doctor can read the record. */
    private static function logView(?int $shareId, ?int $patientId, string $outcome): void
    {
        try {
            Database::connection()->prepare(
                "INSERT INTO record_share_views (share_id, patient_id, outcome, ip_address, user_agent, viewed_at)
                 VALUES (:s, :p, :o, :ip, :ua, NOW())"
            )->execute([
                's' => $shareId,
                'p' => $patientId,
                'o' => $outcome,
                'ip' => mb_substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
                'ua' => mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255) ?: null,
            ]);
        } catch (Throwable $e) {
            // deliberately ignored
        }
    }
}
