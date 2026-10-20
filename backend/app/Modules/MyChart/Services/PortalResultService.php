<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\ResultsInbox\Services\ResultReviewService;
use PDO;

/**
 * Test results in My Chart (Phase 1).
 *
 * A result only exists in patient_procedure_results once the lab has verified it
 * or a radiologist has signed the report. This service adds the second gate --
 * when the *patient* may read it:
 *
 *   stampForOrder()  called inside the release transaction; works out
 *                    portal_release_at = release time + the policy's hold hours,
 *                    and withholds a critical result until a doctor clears it.
 *   list() / show()  what the patient sees: released rows only.
 *   hold() / releaseNow() / releaseOrder()  the doctor's controls, offered in the
 *                    results inbox.
 *
 * Nothing here trusts a patient_id from the request: the controller resolves it
 * through PortalGuard first and passes it in.
 */
class PortalResultService
{
    /** Who may hold a result back or release it early -- the roles that already sign results off. */
    public const RELEASE_ROLES = ResultReviewService::REVIEW_ROLES;

    /** What the patient is told nothing about until a doctor clears it. */
    public const CRITICAL_HOLD = 'A critical result: the doctor will discuss it with you before it appears here.';

    /** Used when no policy row matches at all (the seeded catch-alls normally do). */
    private const FALLBACK_HOURS = ['lab' => 0, 'imaging' => 24];

    // ------------------------------------------------------------------
    // Release policy
    // ------------------------------------------------------------------

    /**
     * The policy for a kind ('lab'|'imaging') and category (lab section or imaging
     * modality). A row naming the category wins over the catch-all, which is stored
     * with category '' -- see schema 302 for why it is not NULL.
     */
    public static function policyFor(PDO $db, string $kind, ?string $category): array
    {
        $stmt = $db->prepare(
            "SELECT hold_hours, auto_release_critical, category
             FROM portal_release_policies
             WHERE kind = :kind AND is_active = 1 AND category IN (:category, '')
             ORDER BY category = '' ASC, id ASC
             LIMIT 1"
        );
        $stmt->execute(['kind' => $kind, 'category' => (string) $category]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'hold_hours' => $row ? max(0, (int) $row['hold_hours']) : (self::FALLBACK_HOURS[$kind] ?? 0),
            'auto_release_critical' => $row ? (int) $row['auto_release_critical'] === 1 : false,
            'matched' => $row['category'] ?? null,
        ];
    }

    /** The lab section, or the imaging modality, an order belongs to. */
    public static function categoryFor(PDO $db, int $orderId, string $kind): ?string
    {
        $stmt = $db->prepare(
            "SELECT COALESCE(c.lab_section, pc.lab_section) AS lab_section,
                    COALESCE(c.rad_modality, pc.rad_modality) AS rad_modality
             FROM patient_procedure_orders o
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             WHERE o.id = :id"
        );
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return $kind === 'imaging' ? ($row['rad_modality'] ?? null) : ($row['lab_section'] ?? null);
    }

    /**
     * Stamp every current result row of an order with when the patient may read it.
     * Called from inside the lab's verify() and the radiologist's save(), so it runs
     * in their transaction and is rolled back with them.
     *
     * A critical row is withheld (portal_release_at NULL + a hold reason) unless the
     * policy says critical results may auto-release.
     *
     * @return array{released:int,held:int,release_at:?string,hold_hours:int}
     */
    public static function stampForOrder(PDO $db, int $orderId, string $kind, int $actorId): array
    {
        $kind = $kind === 'lab' ? 'lab' : 'imaging';
        $policy = self::policyFor($db, $kind, self::categoryFor($db, $orderId, $kind));
        $hours = (int) $policy['hold_hours'];

        // The database clock: PHP and MySQL are in different zones here.
        $releaseAt = (string) $db->query("SELECT NOW() + INTERVAL {$hours} HOUR")->fetchColumn();

        $release = $db->prepare(
            "UPDATE patient_procedure_results
             SET portal_release_at = :at, portal_hold_reason = NULL, portal_released_by = NULL
             WHERE patient_procedure_order_id = :o AND deleted_at IS NULL
               AND (:crit = 1 OR flag <> 'critical' OR flag IS NULL)"
        );
        $release->execute(['at' => $releaseAt, 'o' => $orderId, 'crit' => $policy['auto_release_critical'] ? 1 : 0]);
        $released = $release->rowCount();

        $held = 0;
        if (!$policy['auto_release_critical']) {
            $hold = $db->prepare(
                "UPDATE patient_procedure_results
                 SET portal_release_at = NULL, portal_hold_reason = :why, portal_released_by = NULL
                 WHERE patient_procedure_order_id = :o AND deleted_at IS NULL AND flag = 'critical'"
            );
            $hold->execute(['why' => self::CRITICAL_HOLD, 'o' => $orderId]);
            $held = $hold->rowCount();
        }

        return ['released' => $released, 'held' => $held, 'release_at' => $releaseAt, 'hold_hours' => $hours];
    }

    // ------------------------------------------------------------------
    // The doctor's controls (results inbox)
    // ------------------------------------------------------------------

    /** Hold a result back from My Chart, with a reason. */
    public static function hold(int $resultId, string $reason, int $actorId): array
    {
        $reason = trim($reason);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why the result is being held back.', 'errors' => ['reason' => 'A reason is required.']];
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE patient_procedure_results
             SET portal_release_at = NULL, portal_hold_reason = :why, portal_released_by = :by, updated_at = NOW(), updated_by = :by2
             WHERE id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['why' => mb_substr($reason, 0, 255), 'by' => $actorId, 'by2' => $actorId, 'id' => $resultId]);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'That result was not found.', 'not_found' => true];
        }

        return ['success' => true, 'message' => 'Held back from My Chart. The patient cannot see it.'];
    }

    /** Release one result to My Chart now, clearing any hold. */
    public static function releaseNow(int $resultId, int $actorId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE patient_procedure_results
             SET portal_release_at = NOW(), portal_hold_reason = NULL, portal_released_by = :by, updated_at = NOW(), updated_by = :by2
             WHERE id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['by' => $actorId, 'by2' => $actorId, 'id' => $resultId]);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'That result was not found.', 'not_found' => true];
        }

        return ['success' => true, 'message' => 'Released. The patient can see it in My Chart now.'];
    }

    /** Release every withheld or waiting row of an order at once -- what the inbox offers per result. */
    public static function releaseOrder(int $orderId, int $actorId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE patient_procedure_results
             SET portal_release_at = NOW(), portal_hold_reason = NULL, portal_released_by = :by, updated_at = NOW(), updated_by = :by2
             WHERE patient_procedure_order_id = :o AND deleted_at IS NULL
               AND (portal_hold_reason IS NOT NULL OR portal_release_at IS NULL OR portal_release_at > NOW())"
        );
        $stmt->execute(['by' => $actorId, 'by2' => $actorId, 'o' => $orderId]);
        $n = $stmt->rowCount();

        if ($n === 0) {
            return ['success' => true, 'message' => 'Nothing was waiting: the patient can already see this result.', 'released' => 0];
        }

        return ['success' => true, 'message' => $n === 1
            ? 'Released. The patient can see it in My Chart now.'
            : "Released {$n} results. The patient can see them in My Chart now.", 'released' => $n];
    }

    /** Hold every row of an order back (the inbox's "hold" action on a result). */
    public static function holdOrder(int $orderId, string $reason, int $actorId): array
    {
        $reason = trim($reason);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why the result is being held back.', 'errors' => ['reason' => 'A reason is required.']];
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE patient_procedure_results
             SET portal_release_at = NULL, portal_hold_reason = :why, portal_released_by = :by, updated_at = NOW(), updated_by = :by2
             WHERE patient_procedure_order_id = :o AND deleted_at IS NULL"
        );
        $stmt->execute(['why' => mb_substr($reason, 0, 255), 'by' => $actorId, 'by2' => $actorId, 'o' => $orderId]);

        return ['success' => true, 'message' => 'Held back from My Chart. The patient cannot see it.', 'held' => $stmt->rowCount()];
    }

    /**
     * What My Chart currently shows for one order, for the staff side: how many rows
     * the patient can read, how many are waiting for their hold hours to pass, and
     * how many a doctor is withholding.
     */
    public static function stateForOrder(PDO $db, int $orderId): array
    {
        $stmt = $db->prepare(
            "SELECT
                SUM(portal_hold_reason IS NOT NULL) AS held,
                SUM(portal_hold_reason IS NULL AND portal_release_at IS NOT NULL AND portal_release_at <= NOW()) AS visible,
                SUM(portal_hold_reason IS NULL AND portal_release_at IS NOT NULL AND portal_release_at > NOW()) AS waiting,
                SUM(portal_hold_reason IS NULL AND portal_release_at IS NULL) AS unset,
                MIN(CASE WHEN portal_hold_reason IS NULL AND portal_release_at > NOW() THEN portal_release_at END) AS next_release_at,
                MAX(portal_hold_reason) AS hold_reason
             FROM patient_procedure_results
             WHERE patient_procedure_order_id = :o AND deleted_at IS NULL"
        );
        $stmt->execute(['o' => $orderId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'held' => (int) ($r['held'] ?? 0),
            'visible' => (int) ($r['visible'] ?? 0),
            'waiting' => (int) ($r['waiting'] ?? 0),
            'unset' => (int) ($r['unset'] ?? 0),
            'next_release_at' => $r['next_release_at'] ?? null,
            'hold_reason' => $r['hold_reason'] ?? null,
        ];
    }

    // ------------------------------------------------------------------
    // What the patient reads
    // ------------------------------------------------------------------

    /** Only rows the patient may read: due, and not withheld. */
    private const VISIBLE = "r.deleted_at IS NULL AND r.portal_hold_reason IS NULL
        AND r.portal_release_at IS NOT NULL AND r.portal_release_at <= NOW()";

    /**
     * The patient's released results, newest first, grouped by the order they belong to.
     *
     * @param array $filters kind=lab|imaging, from=Y-m-d, to=Y-m-d, q=free text
     */
    public static function list(int $patientId, array $filters = []): array
    {
        $db = Database::connection();
        $where = ["o.patient_id = :p", "o.deleted_at IS NULL", "EXISTS (SELECT 1 FROM patient_procedure_results r WHERE r.patient_procedure_order_id = o.id AND " . self::VISIBLE . ")"];
        $params = ['p' => $patientId];

        $kind = $filters['kind'] ?? '';
        if ($kind === 'lab' || $kind === 'imaging') {
            $where[] = $kind === 'imaging' ? '(' . self::IS_IMAGING . ')' : 'NOT (' . self::IS_IMAGING . ')';
        }
        if (!empty($filters['from'])) {
            $where[] = "COALESCE(o.results_at, o.reported_at, o.order_date) >= :from";
            $params['from'] = $filters['from'] . ' 00:00:00';
        }
        if (!empty($filters['to'])) {
            $where[] = "COALESCE(o.results_at, o.reported_at, o.order_date) <= :to";
            $params['to'] = $filters['to'] . ' 23:59:59';
        }
        if (!empty($filters['q'])) {
            $where[] = "(c.name LIKE :q OR EXISTS (SELECT 1 FROM patient_procedure_results r2
                        WHERE r2.patient_procedure_order_id = o.id AND r2.deleted_at IS NULL AND r2.name LIKE :q2))";
            $params['q'] = '%' . $filters['q'] . '%';
            $params['q2'] = '%' . $filters['q'] . '%';
        }

        $stmt = $db->prepare(
            "SELECT o.id AS order_id, o.priority, o.specimen, o.collected_at, o.order_date, o.results_at, o.reported_at,
                    COALESCE(c.name, pc.name) AS test_name,
                    COALESCE(c.lab_section, pc.lab_section) AS lab_section,
                    COALESCE(c.rad_modality, pc.rad_modality) AS rad_modality,
                    (" . self::IS_IMAGING . ") AS is_imaging,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS ordering_doctor,
                    (SELECT COUNT(*) FROM patient_procedure_results r WHERE r.patient_procedure_order_id = o.id AND " . self::VISIBLE . ") AS result_count,
                    (SELECT COUNT(*) FROM patient_procedure_results r WHERE r.patient_procedure_order_id = o.id AND " . self::VISIBLE . "
                        AND (r.flag = 'abnormal' OR (r.flag IS NULL AND r.is_abnormal = 1))) AS abnormal_count,
                    (SELECT MIN(r.portal_release_at) FROM patient_procedure_results r WHERE r.patient_procedure_order_id = o.id AND " . self::VISIBLE . ") AS released_at
             FROM patient_procedure_orders o
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             LEFT JOIN providers pr ON pr.id = o.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY COALESCE(o.results_at, o.reported_at, o.order_date) DESC, o.id DESC
             LIMIT 300"
        );
        $stmt->execute($params);

        $items = array_map(static fn(array $r) => [
            'order_id' => (int) $r['order_id'],
            'kind' => (int) $r['is_imaging'] === 1 ? 'imaging' : 'lab',
            'test_name' => $r['test_name'],
            'category' => (int) $r['is_imaging'] === 1 ? $r['rad_modality'] : $r['lab_section'],
            'collected_at' => $r['collected_at'],
            'resulted_at' => $r['results_at'] ?? $r['reported_at'],
            'released_at' => $r['released_at'],
            'ordering_doctor' => $r['ordering_doctor'],
            'results' => (int) $r['result_count'],
            'abnormal' => (int) $r['abnormal_count'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'items' => $items,
            'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /** Is this order an imaging study? Same test the results inbox uses. */
    private const IS_IMAGING = "o.rad_request_id IS NOT NULL
        OR COALESCE(c.order_test_type, pc.order_test_type) IN ('Imaging', 'Radiology')
        OR COALESCE(c.order_from, pc.order_from) = 'Radiology Department'";

    /**
     * One order in full: every released row, and for imaging the signed report. Returns
     * null when the order is not this patient's, or has nothing released -- the
     * controller answers "not found" either way, so a patient cannot tell a withheld
     * result from one that does not exist.
     */
    public static function show(int $patientId, int $orderId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT o.id AS order_id, o.priority, o.specimen, o.collected_at, o.order_date, o.results_at, o.reported_at,
                    COALESCE(c.name, pc.name) AS test_name,
                    COALESCE(c.lab_section, pc.lab_section) AS lab_section,
                    COALESCE(c.rad_modality, pc.rad_modality) AS rad_modality,
                    (" . self::IS_IMAGING . ") AS is_imaging,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS ordering_doctor
             FROM patient_procedure_orders o
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             LEFT JOIN providers pr ON pr.id = o.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             WHERE o.id = :id AND o.patient_id = :p AND o.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $orderId, 'p' => $patientId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            return null;
        }

        $rows = $db->prepare(
            "SELECT r.id, r.code, r.name, r.value, r.units, r.reference_range, r.flag, r.is_abnormal, r.result_date, r.portal_release_at
             FROM patient_procedure_results r
             WHERE r.patient_procedure_order_id = :o AND " . self::VISIBLE . "
             ORDER BY r.id"
        );
        $rows->execute(['o' => $orderId]);
        $results = $rows->fetchAll(PDO::FETCH_ASSOC);

        if (!$results) {
            return null;
        }

        $isImaging = (int) $order['is_imaging'] === 1;

        $out = [
            'order_id' => (int) $order['order_id'],
            'kind' => $isImaging ? 'imaging' : 'lab',
            'test_name' => $order['test_name'],
            'category' => $isImaging ? $order['rad_modality'] : $order['lab_section'],
            'specimen' => $order['specimen'],
            'collected_at' => $order['collected_at'],
            'resulted_at' => $order['results_at'] ?? $order['reported_at'],
            'ordering_doctor' => $order['ordering_doctor'],
            'results' => array_map(static fn(array $r) => [
                'name' => $r['name'],
                'code' => $r['code'],
                'value' => $r['value'],
                'units' => $r['units'],
                'reference_range' => $r['reference_range'],
                // "critical" is never shown to a patient: a critical row is withheld, so
                // anything visible here is normal or abnormal.
                'abnormal' => $r['flag'] === 'abnormal' || ($r['flag'] === null && (int) $r['is_abnormal'] === 1),
                'result_date' => $r['result_date'],
            ], $results),
        ];

        // Phase 2: what each test means, in the hospital's own words.
        $out['explanations'] = PortalExplanationService::forRows(
            array_map(static fn(array $r) => ['name' => $r['name'], 'code' => $r['code']], $results),
            $isImaging ? 'imaging' : 'lab'
        );

        if ($isImaging) {
            // Only the signed report, never a draft or a superseded version.
            $rep = $db->prepare(
                "SELECT version, technique, comparison, findings, impression, recommendation, signed_at, is_addendum
                 FROM rad_reports
                 WHERE order_id = :o AND status = 'signed'
                 ORDER BY version DESC, id DESC
                 LIMIT 1"
            );
            $rep->execute(['o' => $orderId]);
            $report = $rep->fetch(PDO::FETCH_ASSOC);

            if ($report) {
                $out['report'] = [
                    'version' => (int) $report['version'],
                    'technique' => $report['technique'],
                    'comparison' => $report['comparison'],
                    'findings' => $report['findings'],
                    'impression' => $report['impression'],
                    'recommendation' => $report['recommendation'],
                    'signed_at' => $report['signed_at'],
                    'is_addendum' => (int) $report['is_addendum'] === 1,
                ];
            }
        }

        return $out;
    }

    // ------------------------------------------------------------------
    // Trends (Phase 2)
    // ------------------------------------------------------------------

    /** How many released values a test needs before a trend is worth drawing. */
    public const TREND_MIN_POINTS = 3;

    /**
     * Every released value of one test for this patient, oldest first, so the screen can
     * draw a line. Matches on the result's name (what every row carries) and, when the
     * row has one, its code -- see PortalExplanationService for why name is the key.
     *
     * Only numeric values are returned: "No growth" or "Abnormal" cannot be plotted.
     * The reference range is parsed from the text the lab stored ("12.0-17.5") so the
     * usual range can be shaded behind the line.
     */
    public static function trend(int $patientId, string $name, ?string $code = null): array
    {
        $name = trim($name);

        if ($name === '') {
            return ['points' => [], 'enough' => false];
        }

        $db = Database::connection();
        $params = ['p' => $patientId, 'name' => $name];
        $match = 'r.name = :name';

        if ($code !== null && trim($code) !== '') {
            $match = '(r.name = :name OR r.code = :code)';
            $params['code'] = trim($code);
        }

        $stmt = $db->prepare(
            "SELECT r.value, r.units, r.reference_range, r.flag, r.is_abnormal,
                    COALESCE(r.result_date, o.results_at, o.reported_at, o.order_date) AS taken_at,
                    o.id AS order_id
             FROM patient_procedure_results r
             JOIN patient_procedure_orders o ON o.id = r.patient_procedure_order_id
             WHERE o.patient_id = :p AND o.deleted_at IS NULL AND {$match} AND " . self::VISIBLE . "
             ORDER BY COALESCE(r.result_date, o.results_at, o.reported_at, o.order_date) ASC, r.id ASC
             LIMIT 60"
        );
        $stmt->execute($params);

        $points = [];
        $units = null;
        $low = null;
        $high = null;

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $value = self::numeric($r['value']);

            if ($value === null) {
                continue;
            }

            $units ??= $r['units'];
            [$l, $h] = self::parseRange($r['reference_range']);
            $low ??= $l;
            $high ??= $h;

            $points[] = [
                'taken_at' => $r['taken_at'],
                'value' => $value,
                'order_id' => (int) $r['order_id'],
                // A critical row is never visible to a patient, so this is normal vs abnormal only.
                'abnormal' => $r['flag'] === 'abnormal' || ($r['flag'] === null && (int) $r['is_abnormal'] === 1),
            ];
        }

        return [
            'name' => $name,
            'units' => $units,
            'range_low' => $low,
            'range_high' => $high,
            'points' => $points,
            'enough' => count($points) >= self::TREND_MIN_POINTS,
        ];
    }

    /**
     * The user to send a question about this order to: the doctor who ordered it, or the
     * patient's own provider when the order names none. Null when neither has a login.
     */
    public static function doctorUserFor(int $orderId, int $patientId): ?int
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT COALESCE(o.provider_id, p.provider_id) AS provider_id
             FROM patient_procedure_orders o
             JOIN patients p ON p.id = o.patient_id
             WHERE o.id = :o AND o.patient_id = :p AND o.deleted_at IS NULL"
        );
        $stmt->execute(['o' => $orderId, 'p' => $patientId]);
        $providerId = (int) $stmt->fetchColumn();

        if (!$providerId) {
            return null;
        }

        $userId = (new \App\Modules\Providers\Services\ProviderService())->findUserIdByProviderId($providerId);

        return $userId ? (int) $userId : null;
    }

    /** "13.5" -> 13.5; "<0.01" -> 0.01; "No growth" -> null. */
    private static function numeric(?string $value): ?float
    {
        if ($value === null) {
            return null;
        }

        $clean = str_replace([',', ' '], '', trim($value));
        $clean = ltrim($clean, '<>=~');

        return is_numeric($clean) ? (float) $clean : null;
    }

    /** "12.0-17.5" -> [12.0, 17.5]; anything else -> [null, null]. */
    private static function parseRange(?string $range): array
    {
        if ($range !== null && preg_match('/^\s*([\d.]+)\s*-\s*([\d.]+)\s*$/', $range, $m)) {
            return [(float) $m[1], (float) $m[2]];
        }

        return [null, null];
    }
}
