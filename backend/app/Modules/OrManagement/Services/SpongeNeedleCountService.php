<?php
declare(strict_types=1);

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use App\Modules\OrManagement\Models\OrSpongeNeedleCount;
use PDO;

/**
 * SpongeNeedleCountService
 *
 * Manages Surgical Sponge, Sharps, Needle & Instrument Count Reconciliation
 * (`or_sponge_needle_counts`) with mandatory dual Scrub Nurse + Circulating Nurse
 * digital signatures across Initial, Cavity Closure, and Final Skin Closure counts.
 */
final class SpongeNeedleCountService
{
    private static bool $schemaChecked = false;

    public static function ensureTableExists(PDO $pdo): void
    {
        if (self::$schemaChecked) {
            return;
        }
        self::$schemaChecked = true;

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `or_sponge_needle_counts` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `count_record_number` VARCHAR(40) NOT NULL,
                `surgical_case_id` INT UNSIGNED NOT NULL,
                `patient_id` INT UNSIGNED NULL,
                `lap_sponges_initial` INT NOT NULL DEFAULT 10,
                `lap_sponges_added` INT NOT NULL DEFAULT 0,
                `lap_sponges_closure_counted` INT NOT NULL DEFAULT 10,
                `lap_sponges_final_counted` INT NOT NULL DEFAULT 10,
                `raytec_sponges_initial` INT NOT NULL DEFAULT 20,
                `raytec_sponges_added` INT NOT NULL DEFAULT 0,
                `raytec_sponges_closure_counted` INT NOT NULL DEFAULT 20,
                `raytec_sponges_final_counted` INT NOT NULL DEFAULT 20,
                `suture_needles_initial` INT NOT NULL DEFAULT 12,
                `suture_needles_added` INT NOT NULL DEFAULT 0,
                `suture_needles_closure_counted` INT NOT NULL DEFAULT 12,
                `suture_needles_final_counted` INT NOT NULL DEFAULT 12,
                `blades_sharps_initial` INT NOT NULL DEFAULT 4,
                `blades_sharps_added` INT NOT NULL DEFAULT 0,
                `blades_sharps_closure_counted` INT NOT NULL DEFAULT 4,
                `blades_sharps_final_counted` INT NOT NULL DEFAULT 4,
                `instruments_initial` INT NOT NULL DEFAULT 45,
                `instruments_added` INT NOT NULL DEFAULT 0,
                `instruments_closure_counted` INT NOT NULL DEFAULT 45,
                `instruments_final_counted` INT NOT NULL DEFAULT 45,
                `custom_items_json` LONGTEXT NULL,
                `initial_count_status` ENUM('Pending', 'Verified & Baseline Locked') NOT NULL DEFAULT 'Verified & Baseline Locked',
                `initial_scrub_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Maria Santos (Scrub Nurse)',
                `initial_scrub_signature` VARCHAR(180) NULL,
                `initial_circulating_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Angela Reyes (Circulating Nurse)',
                `initial_circulating_signature` VARCHAR(180) NULL,
                `initial_counted_at` DATETIME NULL,
                `closure_count_status` ENUM('Pending', 'Reconciled — Correct', 'Discrepancy — Unresolved', 'Discrepancy — Resolved via Recount/X-Ray') NOT NULL DEFAULT 'Reconciled — Correct',
                `closure_scrub_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Maria Santos (Scrub Nurse)',
                `closure_scrub_signature` VARCHAR(180) NULL,
                `closure_circulating_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Angela Reyes (Circulating Nurse)',
                `closure_circulating_signature` VARCHAR(180) NULL,
                `closure_counted_at` DATETIME NULL,
                `final_count_status` ENUM('Pending', 'Reconciled — Correct', 'Discrepancy — Unresolved', 'Discrepancy — Resolved via Recount/X-Ray') NOT NULL DEFAULT 'Reconciled — Correct',
                `final_scrub_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Maria Santos (Scrub Nurse)',
                `final_scrub_signature` VARCHAR(180) NULL,
                `final_circulating_nurse_name` VARCHAR(150) NOT NULL DEFAULT 'RN Angela Reyes (Circulating Nurse)',
                `final_circulating_signature` VARCHAR(180) NULL,
                `final_counted_at` DATETIME NULL,
                `has_discrepancy` TINYINT(1) NOT NULL DEFAULT 0,
                `surgeon_notified_of_count` TINYINT(1) NOT NULL DEFAULT 1,
                `intraop_xray_ordered` TINYINT(1) NOT NULL DEFAULT 0,
                `intraop_xray_findings` VARCHAR(255) NULL,
                `discrepancy_resolution_notes` TEXT NULL,
                `attending_surgeon_acknowledgment` VARCHAR(180) NULL,
                `overall_reconciliation_status` ENUM(
                    'In Progress',
                    'All Counts Correct & Dual-Signed',
                    'Count Discrepancy — X-Ray Protocol Active',
                    'Resolved with Attending Surgeon Sign-Off'
                ) NOT NULL DEFAULT 'In Progress',
                `recorded_by_user_id` INT UNSIGNED NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_or_sponge_count_record_no` (`count_record_number`),
                KEY `idx_or_sponge_count_case` (`surgical_case_id`),
                KEY `idx_or_sponge_count_patient` (`patient_id`),
                KEY `idx_or_sponge_count_status` (`overall_reconciliation_status`, `has_discrepancy`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    /**
     * Fetches the Sponge, Sharps & Needle Count Reconciliation record for a surgical case
     * or returns a list of count sheets.
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function getRecords(array $filters = []): array
    {
        $pdo = Database::connection();
        self::ensureTableExists($pdo);

        $caseId = isset($filters['surgical_case_id']) ? (int) $filters['surgical_case_id'] : 0;

        if ($caseId > 0) {
            $caseStmt = $pdo->prepare("
                SELECT
                    c.*,
                    s.suite_code,
                    s.suite_name,
                    s.floor_location
                FROM or_surgical_cases c
                LEFT JOIN or_suites s ON s.id = c.or_suite_id
                WHERE c.id = :case_id
                LIMIT 1
            ");
            $caseStmt->execute([':case_id' => $caseId]);
            $surgicalCase = $caseStmt->fetch(PDO::FETCH_ASSOC) ?: null;

            $recStmt = $pdo->prepare("
                SELECT *
                FROM or_sponge_needle_counts
                WHERE surgical_case_id = :case_id
                ORDER BY id DESC
                LIMIT 1
            ");
            $recStmt->execute([':case_id' => $caseId]);
            $row = $recStmt->fetch(PDO::FETCH_ASSOC);

            $record = $row ? OrSpongeNeedleCount::formatRecord($row) : null;

            return [
                'surgical_case' => $surgicalCase,
                'record'        => $record,
                'has_record'    => $record !== null,
                'categories'    => OrSpongeNeedleCount::ITEM_CATEGORIES,
            ];
        }

        $sql = "
            SELECT
                r.*,
                c.case_number,
                c.patient_name,
                c.patient_mrn,
                c.procedure_name,
                c.surgical_specialty,
                c.lead_surgeon,
                c.perioperative_stage AS case_stage,
                c.scheduled_date,
                s.suite_code,
                s.suite_name
            FROM or_sponge_needle_counts r
            LEFT JOIN or_surgical_cases c ON c.id = r.surgical_case_id
            LEFT JOIN or_suites s ON s.id = c.or_suite_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['patient_id'])) {
            $sql .= " AND r.patient_id = :patient_id";
            $params[':patient_id'] = (int) $filters['patient_id'];
        }
        if (isset($filters['has_discrepancy']) && $filters['has_discrepancy'] !== '') {
            $sql .= " AND r.has_discrepancy = :has_discrepancy";
            $params[':has_discrepancy'] = (int) $filters['has_discrepancy'];
        }

        $sql .= " ORDER BY r.updated_at DESC, r.id DESC LIMIT 100";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $records = array_map([OrSpongeNeedleCount::class, 'formatRecord'], $rows);

        return [
            'records' => $records,
            'count'   => count($records),
        ];
    }

    /**
     * Creates or updates a Surgical Sponge, Sharps & Needle Count Reconciliation record.
     * When `dual_sign_all_phases` is requested, validates that both Scrub Nurse and
     * Circulating Nurse names/signatures are populated across Initial, Closure, and Final counts.
     *
     * @param array<string, mixed> $payload
     * @param int|null $userId
     * @return array<string, mixed>
     */
    public function saveRecord(array $payload, ?int $userId = null): array
    {
        $pdo = Database::connection();
        self::ensureTableExists($pdo);

        $surgicalCaseId = (int) ($payload['surgical_case_id'] ?? 0);
        if ($surgicalCaseId <= 0) {
            throw new \InvalidArgumentException('A valid surgical_case_id is required for Sponge, Sharps & Needle Count Reconciliation.');
        }

        $caseStmt = $pdo->prepare("SELECT id, patient_id, case_number, scrub_nurse, circulating_nurse, lead_surgeon FROM or_surgical_cases WHERE id = :id LIMIT 1");
        $caseStmt->execute([':id' => $surgicalCaseId]);
        $caseRow = $caseStmt->fetch(PDO::FETCH_ASSOC);
        if (!$caseRow) {
            throw new \RuntimeException("Surgical case #{$surgicalCaseId} not found.");
        }

        $patientId = !empty($payload['patient_id'])
            ? (int) $payload['patient_id']
            : (!empty($caseRow['patient_id']) ? (int) $caseRow['patient_id'] : null);

        $defaultScrub = trim((string) ($caseRow['scrub_nurse'] ?? '')) !== ''
            ? (string) $caseRow['scrub_nurse']
            : 'RN Maria Santos (Scrub Nurse)';
        $defaultCirc = trim((string) ($caseRow['circulating_nurse'] ?? '')) !== ''
            ? (string) $caseRow['circulating_nurse']
            : 'RN Angela Reyes (Circulating Nurse)';

        $nowStr = date('Y-m-d H:i:s');
        $dualSignAll = !empty($payload['dual_sign_all_phases']);

        // Nurse names across the 3 phases
        $initScrubName = trim((string) ($payload['initial_scrub_nurse_name'] ?? $defaultScrub)) ?: $defaultScrub;
        $initCircName  = trim((string) ($payload['initial_circulating_nurse_name'] ?? $defaultCirc)) ?: $defaultCirc;
        $closScrubName = trim((string) ($payload['closure_scrub_nurse_name'] ?? $initScrubName)) ?: $initScrubName;
        $closCircName  = trim((string) ($payload['closure_circulating_nurse_name'] ?? $initCircName)) ?: $initCircName;
        $finScrubName  = trim((string) ($payload['final_scrub_nurse_name'] ?? $closScrubName)) ?: $closScrubName;
        $finCircName   = trim((string) ($payload['final_circulating_nurse_name'] ?? $closCircName)) ?: $closCircName;

        // Signatures across the 3 phases
        $initScrubSig = trim((string) ($payload['initial_scrub_signature'] ?? ''));
        $initCircSig  = trim((string) ($payload['initial_circulating_signature'] ?? ''));
        $closScrubSig = trim((string) ($payload['closure_scrub_signature'] ?? ''));
        $closCircSig  = trim((string) ($payload['closure_circulating_signature'] ?? ''));
        $finScrubSig  = trim((string) ($payload['final_scrub_signature'] ?? ''));
        $finCircSig   = trim((string) ($payload['final_circulating_signature'] ?? ''));

        if ($dualSignAll) {
            if ($initScrubSig === '') {
                $initScrubSig = "Signed: {$initScrubName} [Initial]";
            }
            if ($initCircSig === '') {
                $initCircSig = "Verified: {$initCircName} [Initial]";
            }
            if ($closScrubSig === '') {
                $closScrubSig = "Signed: {$closScrubName} [Cavity Closure]";
            }
            if ($closCircSig === '') {
                $closCircSig = "Verified: {$closCircName} [Cavity Closure]";
            }
            if ($finScrubSig === '') {
                $finScrubSig = "Signed: {$finScrubName} [Final Skin]";
            }
            if ($finCircSig === '') {
                $finCircSig = "Verified: {$finCircName} [Final Skin]";
            }
        }

        // Normalize payload with signatures so evaluateReconciliation sees them
        $normalized = array_merge($payload, [
            'initial_scrub_signature'       => $initScrubSig,
            'initial_circulating_signature' => $initCircSig,
            'closure_scrub_signature'       => $closScrubSig,
            'closure_circulating_signature' => $closCircSig,
            'final_scrub_signature'         => $finScrubSig,
            'final_circulating_signature'   => $finCircSig,
        ]);

        $eval = OrSpongeNeedleCount::evaluateReconciliation($normalized);

        $initStatus = ($initScrubSig !== '' && $initCircSig !== '')
            ? 'Verified & Baseline Locked'
            : (string) ($payload['initial_count_status'] ?? 'Pending');
        if (!in_array($initStatus, ['Pending', 'Verified & Baseline Locked'], true)) {
            $initStatus = 'Verified & Baseline Locked';
        }

        $closStatus = $eval['has_closure_discrepancy']
            ? (!empty($payload['intraop_xray_ordered']) ? 'Discrepancy — Resolved via Recount/X-Ray' : 'Discrepancy — Unresolved')
            : (($closScrubSig !== '' && $closCircSig !== '') ? 'Reconciled — Correct' : (string) ($payload['closure_count_status'] ?? 'Reconciled — Correct'));

        $finStatus = $eval['has_final_discrepancy']
            ? (!empty($payload['intraop_xray_ordered']) ? 'Discrepancy — Resolved via Recount/X-Ray' : 'Discrepancy — Unresolved')
            : (($finScrubSig !== '' && $finCircSig !== '') ? 'Reconciled — Correct' : (string) ($payload['final_count_status'] ?? 'Reconciled — Correct'));

        $overallStatus = $eval['computed_overall_status'];

        $customJson = null;
        if (isset($payload['custom_items'])) {
            $customJson = is_string($payload['custom_items'])
                ? $payload['custom_items']
                : json_encode($payload['custom_items'], JSON_UNESCAPED_UNICODE);
        } elseif (isset($payload['custom_items_json'])) {
            $customJson = (string) $payload['custom_items_json'];
        }

        $cats = $eval['categories'];

        $existStmt = $pdo->prepare("SELECT id, count_record_number, initial_counted_at, closure_counted_at, final_counted_at FROM or_sponge_needle_counts WHERE surgical_case_id = :cid ORDER BY id DESC LIMIT 1");
        $existStmt->execute([':cid' => $surgicalCaseId]);
        $existing = $existStmt->fetch(PDO::FETCH_ASSOC);

        $initAt = !empty($existing['initial_counted_at']) ? $existing['initial_counted_at'] : (($initScrubSig !== '' || $initCircSig !== '') ? $nowStr : null);
        $closAt = !empty($existing['closure_counted_at']) ? $existing['closure_counted_at'] : (($closScrubSig !== '' || $closCircSig !== '') ? $nowStr : null);
        $finAt  = !empty($existing['final_counted_at'])   ? $existing['final_counted_at']   : (($finScrubSig !== '' || $finCircSig !== '') ? $nowStr : null);

        $params = [
            ':patient_id'                       => $patientId,
            ':lap_sponges_initial'              => $cats['lap_sponges']['initial'],
            ':lap_sponges_added'                => $cats['lap_sponges']['added'],
            ':lap_sponges_closure_counted'      => $cats['lap_sponges']['closure_counted'],
            ':lap_sponges_final_counted'        => $cats['lap_sponges']['final_counted'],
            ':raytec_sponges_initial'           => $cats['raytec_sponges']['initial'],
            ':raytec_sponges_added'             => $cats['raytec_sponges']['added'],
            ':raytec_sponges_closure_counted'   => $cats['raytec_sponges']['closure_counted'],
            ':raytec_sponges_final_counted'     => $cats['raytec_sponges']['final_counted'],
            ':suture_needles_initial'           => $cats['suture_needles']['initial'],
            ':suture_needles_added'             => $cats['suture_needles']['added'],
            ':suture_needles_closure_counted'   => $cats['suture_needles']['closure_counted'],
            ':suture_needles_final_counted'     => $cats['suture_needles']['final_counted'],
            ':blades_sharps_initial'            => $cats['blades_sharps']['initial'],
            ':blades_sharps_added'              => $cats['blades_sharps']['added'],
            ':blades_sharps_closure_counted'    => $cats['blades_sharps']['closure_counted'],
            ':blades_sharps_final_counted'      => $cats['blades_sharps']['final_counted'],
            ':instruments_initial'              => $cats['instruments']['initial'],
            ':instruments_added'                => $cats['instruments']['added'],
            ':instruments_closure_counted'      => $cats['instruments']['closure_counted'],
            ':instruments_final_counted'        => $cats['instruments']['final_counted'],
            ':custom_items_json'                => $customJson,
            ':initial_count_status'             => $initStatus,
            ':initial_scrub_nurse_name'         => $initScrubName,
            ':initial_scrub_signature'          => $initScrubSig !== '' ? $initScrubSig : null,
            ':initial_circulating_nurse_name'   => $initCircName,
            ':initial_circulating_signature'    => $initCircSig !== '' ? $initCircSig : null,
            ':initial_counted_at'               => $initAt,
            ':closure_count_status'             => $closStatus,
            ':closure_scrub_nurse_name'         => $closScrubName,
            ':closure_scrub_signature'          => $closScrubSig !== '' ? $closScrubSig : null,
            ':closure_circulating_nurse_name'   => $closCircName,
            ':closure_circulating_signature'    => $closCircSig !== '' ? $closCircSig : null,
            ':closure_counted_at'               => $closAt,
            ':final_count_status'               => $finStatus,
            ':final_scrub_nurse_name'           => $finScrubName,
            ':final_scrub_signature'            => $finScrubSig !== '' ? $finScrubSig : null,
            ':final_circulating_nurse_name'     => $finCircName,
            ':final_circulating_signature'      => $finCircSig !== '' ? $finCircSig : null,
            ':final_counted_at'                 => $finAt,
            ':has_discrepancy'                  => $eval['has_discrepancy'],
            ':surgeon_notified_of_count'        => !empty($payload['surgeon_notified_of_count']) ? 1 : 0,
            ':intraop_xray_ordered'             => !empty($payload['intraop_xray_ordered']) ? 1 : 0,
            ':intraop_xray_findings'            => !empty($payload['intraop_xray_findings']) ? trim((string) $payload['intraop_xray_findings']) : null,
            ':discrepancy_resolution_notes'     => $payload['discrepancy_resolution_notes'] ?? null,
            ':attending_surgeon_acknowledgment' => !empty($payload['attending_surgeon_acknowledgment']) ? trim((string) $payload['attending_surgeon_acknowledgment']) : null,
            ':overall_reconciliation_status'    => $overallStatus,
            ':recorded_by_user_id'              => $userId,
        ];

        if ($existing) {
            $recordId = (int) $existing['id'];
            $params[':id'] = $recordId;
            $upd = $pdo->prepare("
                UPDATE or_sponge_needle_counts
                SET
                    patient_id                       = :patient_id,
                    lap_sponges_initial              = :lap_sponges_initial,
                    lap_sponges_added                = :lap_sponges_added,
                    lap_sponges_closure_counted      = :lap_sponges_closure_counted,
                    lap_sponges_final_counted        = :lap_sponges_final_counted,
                    raytec_sponges_initial           = :raytec_sponges_initial,
                    raytec_sponges_added             = :raytec_sponges_added,
                    raytec_sponges_closure_counted   = :raytec_sponges_closure_counted,
                    raytec_sponges_final_counted     = :raytec_sponges_final_counted,
                    suture_needles_initial           = :suture_needles_initial,
                    suture_needles_added             = :suture_needles_added,
                    suture_needles_closure_counted   = :suture_needles_closure_counted,
                    suture_needles_final_counted     = :suture_needles_final_counted,
                    blades_sharps_initial            = :blades_sharps_initial,
                    blades_sharps_added              = :blades_sharps_added,
                    blades_sharps_closure_counted    = :blades_sharps_closure_counted,
                    blades_sharps_final_counted      = :blades_sharps_final_counted,
                    instruments_initial              = :instruments_initial,
                    instruments_added                = :instruments_added,
                    instruments_closure_counted      = :instruments_closure_counted,
                    instruments_final_counted        = :instruments_final_counted,
                    custom_items_json                = :custom_items_json,
                    initial_count_status             = :initial_count_status,
                    initial_scrub_nurse_name         = :initial_scrub_nurse_name,
                    initial_scrub_signature          = :initial_scrub_signature,
                    initial_circulating_nurse_name   = :initial_circulating_nurse_name,
                    initial_circulating_signature    = :initial_circulating_signature,
                    initial_counted_at               = :initial_counted_at,
                    closure_count_status             = :closure_count_status,
                    closure_scrub_nurse_name         = :closure_scrub_nurse_name,
                    closure_scrub_signature          = :closure_scrub_signature,
                    closure_circulating_nurse_name   = :closure_circulating_nurse_name,
                    closure_circulating_signature    = :closure_circulating_signature,
                    closure_counted_at               = :closure_counted_at,
                    final_count_status               = :final_count_status,
                    final_scrub_nurse_name           = :final_scrub_nurse_name,
                    final_scrub_signature            = :final_scrub_signature,
                    final_circulating_nurse_name     = :final_circulating_nurse_name,
                    final_circulating_signature      = :final_circulating_signature,
                    final_counted_at                 = :final_counted_at,
                    has_discrepancy                  = :has_discrepancy,
                    surgeon_notified_of_count        = :surgeon_notified_of_count,
                    intraop_xray_ordered             = :intraop_xray_ordered,
                    intraop_xray_findings            = :intraop_xray_findings,
                    discrepancy_resolution_notes     = :discrepancy_resolution_notes,
                    attending_surgeon_acknowledgment = :attending_surgeon_acknowledgment,
                    overall_reconciliation_status    = :overall_reconciliation_status,
                    recorded_by_user_id              = :recorded_by_user_id
                WHERE id = :id
            ");
            $upd->execute($params);
        } else {
            $recordNumber = sprintf('CNT-%s-%04d', date('Ymd'), random_int(1000, 9999));
            $params[':count_record_number'] = $recordNumber;
            $params[':surgical_case_id'] = $surgicalCaseId;

            $ins = $pdo->prepare("
                INSERT INTO or_sponge_needle_counts (
                    count_record_number,
                    surgical_case_id,
                    patient_id,
                    lap_sponges_initial,
                    lap_sponges_added,
                    lap_sponges_closure_counted,
                    lap_sponges_final_counted,
                    raytec_sponges_initial,
                    raytec_sponges_added,
                    raytec_sponges_closure_counted,
                    raytec_sponges_final_counted,
                    suture_needles_initial,
                    suture_needles_added,
                    suture_needles_closure_counted,
                    suture_needles_final_counted,
                    blades_sharps_initial,
                    blades_sharps_added,
                    blades_sharps_closure_counted,
                    blades_sharps_final_counted,
                    instruments_initial,
                    instruments_added,
                    instruments_closure_counted,
                    instruments_final_counted,
                    custom_items_json,
                    initial_count_status,
                    initial_scrub_nurse_name,
                    initial_scrub_signature,
                    initial_circulating_nurse_name,
                    initial_circulating_signature,
                    initial_counted_at,
                    closure_count_status,
                    closure_scrub_nurse_name,
                    closure_scrub_signature,
                    closure_circulating_nurse_name,
                    closure_circulating_signature,
                    closure_counted_at,
                    final_count_status,
                    final_scrub_nurse_name,
                    final_scrub_signature,
                    final_circulating_nurse_name,
                    final_circulating_signature,
                    final_counted_at,
                    has_discrepancy,
                    surgeon_notified_of_count,
                    intraop_xray_ordered,
                    intraop_xray_findings,
                    discrepancy_resolution_notes,
                    attending_surgeon_acknowledgment,
                    overall_reconciliation_status,
                    recorded_by_user_id
                ) VALUES (
                    :count_record_number,
                    :surgical_case_id,
                    :patient_id,
                    :lap_sponges_initial,
                    :lap_sponges_added,
                    :lap_sponges_closure_counted,
                    :lap_sponges_final_counted,
                    :raytec_sponges_initial,
                    :raytec_sponges_added,
                    :raytec_sponges_closure_counted,
                    :raytec_sponges_final_counted,
                    :suture_needles_initial,
                    :suture_needles_added,
                    :suture_needles_closure_counted,
                    :suture_needles_final_counted,
                    :blades_sharps_initial,
                    :blades_sharps_added,
                    :blades_sharps_closure_counted,
                    :blades_sharps_final_counted,
                    :instruments_initial,
                    :instruments_added,
                    :instruments_closure_counted,
                    :instruments_final_counted,
                    :custom_items_json,
                    :initial_count_status,
                    :initial_scrub_nurse_name,
                    :initial_scrub_signature,
                    :initial_circulating_nurse_name,
                    :initial_circulating_signature,
                    :initial_counted_at,
                    :closure_count_status,
                    :closure_scrub_nurse_name,
                    :closure_scrub_signature,
                    :closure_circulating_nurse_name,
                    :closure_circulating_signature,
                    :closure_counted_at,
                    :final_count_status,
                    :final_scrub_nurse_name,
                    :final_scrub_signature,
                    :final_circulating_nurse_name,
                    :final_circulating_signature,
                    :final_counted_at,
                    :has_discrepancy,
                    :surgeon_notified_of_count,
                    :intraop_xray_ordered,
                    :intraop_xray_findings,
                    :discrepancy_resolution_notes,
                    :attending_surgeon_acknowledgment,
                    :overall_reconciliation_status,
                    :recorded_by_user_id
                )
            ");
            $ins->execute($params);
            $recordId = (int) $pdo->lastInsertId();
        }

        $savedStmt = $pdo->prepare("SELECT * FROM or_sponge_needle_counts WHERE id = :id LIMIT 1");
        $savedStmt->execute([':id' => $recordId]);
        $savedRow = $savedStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return OrSpongeNeedleCount::formatRecord($savedRow);
    }
}
