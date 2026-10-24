<?php

declare(strict_types=1);

namespace App\Modules\Lab\Services;

use App\Core\Database;
use PDO;

class LisResultVerificationService
{
    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    /**
     * Retrieve verifications queue with patient, order, and signature details.
     */
    public function listVerifications(array $filters = []): array
    {
        $db = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['verification_status'])) {
            $where[] = 'v.verification_status = :status';
            $params['status'] = $filters['verification_status'];
        }

        if (isset($filters['is_critical']) && $filters['is_critical'] !== '') {
            $where[] = 'v.is_critical = :crit';
            $params['crit'] = (int) $filters['is_critical'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = 'v.patient_id = :pid';
            $params['pid'] = (int) $filters['patient_id'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(v.test_name LIKE :search OR p.patient_no LIKE :search OR p.first_name LIKE :search OR p.last_name LIKE :search OR v.critical_alert_notes LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $medtechName = self::userNameSql('v.medtech_user_id');
        $pathologistName = self::userNameSql('v.pathologist_user_id');

        $whereClause = implode(' AND ', $where);
        $limit = isset($filters['limit']) ? min(500, max(1, (int) $filters['limit'])) : 100;

        $stmt = $db->prepare("
            SELECT v.*,
                   p.patient_no,
                   p.first_name AS patient_first_name,
                   p.last_name AS patient_last_name,
                   CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                   p.birthdate,
                   p.sex,
                   TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS patient_age,
                   {$medtechName} AS medtech_name,
                   {$pathologistName} AS pathologist_name
            FROM lis_result_verifications v
            JOIN patients p ON p.id = v.patient_id
            WHERE {$whereClause}
            ORDER BY 
                CASE v.verification_status
                    WHEN 'preliminary_verified' THEN 1
                    WHEN 'pathologist_returned' THEN 2
                    WHEN 'amended' THEN 3
                    WHEN 'pathologist_approved' THEN 4
                    ELSE 5
                END ASC,
                v.is_critical DESC,
                v.id DESC
            LIMIT {$limit}
        ");
        $stmt->execute($params);

        $verifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch analyte results for each verification
        foreach ($verifications as &$item) {
            $item['id'] = (int) $item['id'];
            $item['order_id'] = (int) $item['order_id'];
            $item['patient_id'] = (int) $item['patient_id'];
            $item['is_critical'] = (bool) $item['is_critical'];
            $item['is_amended'] = (bool) $item['is_amended'];
            $item['amendment_count'] = (int) $item['amendment_count'];

            $resStmt = $db->prepare("
                SELECT r.id, r.name, r.value, r.units, r.reference_range, r.is_abnormal, r.result_date
                FROM patient_procedure_results r
                WHERE r.patient_procedure_order_id = :oid AND r.deleted_at IS NULL
                ORDER BY r.id ASC
            ");
            $resStmt->execute(['oid' => $item['order_id']]);
            $item['results'] = $resStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return $verifications;
    }

    /**
     * Get detail of a specific verification including full amendment logs.
     */
    public function getVerificationDetail(int $id): ?array
    {
        $db = Database::connection();
        $medtechName = self::userNameSql('v.medtech_user_id');
        $pathologistName = self::userNameSql('v.pathologist_user_id');

        $stmt = $db->prepare("
            SELECT v.*,
                   p.patient_no,
                   CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                   p.birthdate,
                   p.sex,
                   TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS patient_age,
                   {$medtechName} AS medtech_name,
                   {$pathologistName} AS pathologist_name
            FROM lis_result_verifications v
            JOIN patients p ON p.id = v.patient_id
            WHERE v.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            return null;
        }

        $item['id'] = (int) $item['id'];
        $item['order_id'] = (int) $item['order_id'];
        $item['patient_id'] = (int) $item['patient_id'];
        $item['is_critical'] = (bool) $item['is_critical'];
        $item['is_amended'] = (bool) $item['is_amended'];
        $item['amendment_count'] = (int) $item['amendment_count'];

        // Fetch current analyte values
        $resStmt = $db->prepare("
            SELECT r.id, r.name, r.value, r.units, r.reference_range, r.is_abnormal, r.result_date
            FROM patient_procedure_results r
            WHERE r.patient_procedure_order_id = :oid AND r.deleted_at IS NULL
            ORDER BY r.id ASC
        ");
        $resStmt->execute(['oid' => $item['order_id']]);
        $item['results'] = $resStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch amendment logs
        $amendStmt = $db->prepare("
            SELECT a.*,
                   " . self::userNameSql('a.amended_by_user_id') . " AS amended_by_name,
                   " . self::userNameSql('a.pathologist_reapproval_user_id') . " AS pathologist_reapproval_name
            FROM lis_result_amendment_logs a
            WHERE a.verification_id = :vid
            ORDER BY a.amendment_number ASC
        ");
        $amendStmt->execute(['vid' => $id]);
        $item['amendment_logs'] = array_map(function ($log) {
            $log['id'] = (int) $log['id'];
            $log['previous_values'] = json_decode($log['previous_values_json'] ?? '[]', true);
            $log['new_values'] = json_decode($log['new_values_json'] ?? '[]', true);
            return $log;
        }, $amendStmt->fetchAll(PDO::FETCH_ASSOC));

        return $item;
    }

    /**
     * Step 1: Medical Technologist analytical validation -> sets Preliminary status.
     */
    public function preliminaryVerify(int $orderId, array $data, array $actor): array
    {
        $db = Database::connection();
        $actorId = (int) ($actor['id'] ?? 1);

        // Fetch order and patient
        $st = $db->prepare("
            SELECT o.id, o.patient_id, o.status, c.name AS test_name
            FROM patient_procedure_orders o
            JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
            WHERE o.id = :id AND o.deleted_at IS NULL
        ");
        $st->execute(['id' => $orderId]);
        $order = $st->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            return ['success' => false, 'message' => 'Lab order not found.'];
        }

        // Fetch MedTech license from lab_staff
        $licStmt = $db->prepare("SELECT license_no FROM lab_staff WHERE user_id = :uid LIMIT 1");
        $licStmt->execute(['uid' => $actorId]);
        $medtechLicense = $licStmt->fetchColumn() ?: ('PRC-MT-' . str_pad((string) $actorId, 5, '0', STR_PAD_LEFT));

        $isCritical = !empty($data['is_critical']);
        $critNotes = trim((string) ($data['critical_alert_notes'] ?? ''));

        // Check if verification record already exists
        $chk = $db->prepare("SELECT id FROM lis_result_verifications WHERE order_id = :oid LIMIT 1");
        $chk->execute(['oid' => $orderId]);
        $existingId = $chk->fetchColumn();

        if ($existingId) {
            $up = $db->prepare("
                UPDATE lis_result_verifications
                SET verification_status = 'preliminary_verified',
                    medtech_user_id = :uid,
                    medtech_verified_at = NOW(),
                    medtech_license_no = :lic,
                    is_critical = :crit,
                    critical_alert_notes = :cnotes,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $up->execute([
                'uid' => $actorId,
                'lic' => $medtechLicense,
                'crit' => $isCritical ? 1 : 0,
                'cnotes' => $critNotes ?: null,
                'id' => $existingId
            ]);
            $verifId = (int) $existingId;
        } else {
            $ins = $db->prepare("
                INSERT INTO lis_result_verifications (
                    order_id, patient_id, test_name, verification_status,
                    medtech_user_id, medtech_verified_at, medtech_license_no,
                    is_critical, critical_alert_notes, created_at
                ) VALUES (
                    :oid, :pid, :tname, 'preliminary_verified',
                    :uid, NOW(), :lic,
                    :crit, :cnotes, NOW()
                )
            ");
            $ins->execute([
                'oid' => $orderId,
                'pid' => (int) $order['patient_id'],
                'tname' => $order['test_name'],
                'uid' => $actorId,
                'lic' => $medtechLicense,
                'crit' => $isCritical ? 1 : 0,
                'cnotes' => $critNotes ?: null
            ]);
            $verifId = (int) $db->lastInsertId();
        }

        // Update lab_result_sets if exists
        $db->prepare("
            UPDATE lab_result_sets
            SET verification_stage = 'preliminary_verified'
            WHERE order_id = :oid AND status != 'superseded'
        ")->execute(['oid' => $orderId]);

        return [
            'success' => true,
            'message' => "Analytical verification completed by Medical Technologist. {$order['test_name']} marked as Preliminary Verified and queued for Pathologist Clinical Sign-off.",
            'verification_id' => $verifId,
            'verification_status' => 'preliminary_verified'
        ];
    }

    /**
     * Step 2: Board-Certified Pathologist Clinical Sign-Off -> Final Approved State.
     */
    public function pathologistSignOff(int $verificationId, array $data, array $actor): array
    {
        $db = Database::connection();
        $actorId = (int) ($actor['id'] ?? 1);

        $rec = $this->getVerificationDetail($verificationId);
        if (!$rec) {
            return ['success' => false, 'message' => 'Result verification record not found.'];
        }

        // Fetch Pathologist profile & license
        $pStaff = $db->prepare("SELECT license_no, pathologist_title FROM lab_staff WHERE user_id = :uid LIMIT 1");
        $pStaff->execute(['uid' => $actorId]);
        $pathProfile = $pStaff->fetch(PDO::FETCH_ASSOC);

        $pathLicense = trim((string) ($data['pathologist_license_no'] ?? $pathProfile['license_no'] ?? ''));
        if ($pathLicense === '') {
            $pathLicense = 'PRC-MD-' . str_pad((string) $actorId, 5, '0', STR_PAD_LEFT);
        }

        $narrative = trim((string) ($data['pathologist_narrative'] ?? ''));
        if ($narrative === '') {
            $narrative = 'Clinical Pathologist Sign-off: Analyte values and morphology reviewed, correlated with clinical history, and approved for release.';
        }

        $stmt = $db->prepare("
            UPDATE lis_result_verifications
            SET verification_status = 'pathologist_approved',
                pathologist_user_id = :uid,
                pathologist_signed_at = NOW(),
                pathologist_license_no = :lic,
                pathologist_narrative = :narr,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'uid' => $actorId,
            'lic' => $pathLicense,
            'narr' => $narrative,
            'id' => $verificationId
        ]);

        // Sync with lab_result_sets
        $db->prepare("
            UPDATE lab_result_sets
            SET verification_stage = 'pathologist_approved',
                pathologist_user_id = :uid,
                pathologist_signed_at = NOW(),
                pathologist_notes = :narr
            WHERE order_id = :oid AND status != 'superseded'
        ")->execute([
            'uid' => $actorId,
            'narr' => $narrative,
            'oid' => $rec['order_id']
        ]);

        return [
            'success' => true,
            'message' => "Final clinical approval signed by Pathologist ({$pathLicense}). {$rec['test_name']} released with official pathologist endorsement.",
            'verification_id' => $verificationId,
            'verification_status' => 'pathologist_approved'
        ];
    }

    /**
     * Pathologist returns preliminary result set back to the bench for re-testing / dilution / slide review.
     */
    public function pathologistReturn(int $verificationId, string $reason, array $actor): array
    {
        $db = Database::connection();
        $actorId = (int) ($actor['id'] ?? 1);
        $reason = trim($reason);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Pathologist return reason is mandatory.'];
        }

        $rec = $this->getVerificationDetail($verificationId);
        if (!$rec) {
            return ['success' => false, 'message' => 'Verification record not found.'];
        }

        $stmt = $db->prepare("
            UPDATE lis_result_verifications
            SET verification_status = 'pathologist_returned',
                pathologist_user_id = :uid,
                pathologist_narrative = :reason,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'uid' => $actorId,
            'reason' => "Returned by Pathologist: " . $reason,
            'id' => $verificationId
        ]);

        // Sync with lab_result_sets
        $db->prepare("
            UPDATE lab_result_sets
            SET status = 'returned',
                verification_stage = 'returned',
                returned_by = :uid,
                returned_at = NOW(),
                return_reason = :reason
            WHERE order_id = :oid AND status != 'superseded'
        ")->execute([
            'uid' => $actorId,
            'reason' => $reason,
            'oid' => $rec['order_id']
        ]);

        return [
            'success' => true,
            'message' => "Results returned to lab bench for re-evaluation: {$reason}",
            'verification_id' => $verificationId,
            'verification_status' => 'pathologist_returned'
        ];
    }

    /**
     * Amend finalized results with full immutable audit logging.
     */
    public function amendResults(int $verificationId, array $data, array $actor): array
    {
        $db = Database::connection();
        $actorId = (int) ($actor['id'] ?? 1);
        $reason = trim((string) ($data['amendment_reason'] ?? ''));
        $newValues = is_array($data['new_values'] ?? null) ? $data['new_values'] : [];

        if ($reason === '') {
            return ['success' => false, 'message' => 'Mandatory Reason for Result Amendment must be documented.'];
        }
        if (empty($newValues)) {
            return ['success' => false, 'message' => 'Amended analyte result values must be provided.'];
        }

        $rec = $this->getVerificationDetail($verificationId);
        if (!$rec) {
            return ['success' => false, 'message' => 'Verification record not found.'];
        }

        $prevValues = $rec['results'];
        $nextSeq = $rec['amendment_count'] + 1;

        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            // 1. Insert into immutable amendment log
            $insLog = $db->prepare("
                INSERT INTO lis_result_amendment_logs (
                    verification_id, order_id, amendment_number, previous_status, new_status,
                    amended_by_user_id, amended_at, amendment_reason,
                    previous_values_json, new_values_json,
                    pathologist_reapproval_user_id, pathologist_reapproval_at, created_at
                ) VALUES (
                    :vid, :oid, :seq, :prev_status, 'amended',
                    :uid, NOW(), :reason,
                    :prev_json, :new_json,
                    :p_uid, NOW(), NOW()
                )
            ");
            $insLog->execute([
                'vid' => $verificationId,
                'oid' => $rec['order_id'],
                'seq' => $nextSeq,
                'prev_status' => $rec['verification_status'],
                'uid' => $actorId,
                'reason' => $reason,
                'prev_json' => json_encode($prevValues),
                'new_json' => json_encode($newValues),
                'p_uid' => $actorId
            ]);

            // 2. Update patient_procedure_results with amended values
            foreach ($newValues as $nv) {
                if (empty($nv['name'])) continue;
                $upVal = $db->prepare("
                    UPDATE patient_procedure_results
                    SET value = :val,
                        is_abnormal = :abn,
                        units = COALESCE(:units, units),
                        reference_range = COALESCE(:ref, reference_range),
                        updated_at = NOW()
                    WHERE patient_procedure_order_id = :oid AND name = :name
                ");
                $upVal->execute([
                    'val' => $nv['value'],
                    'abn' => !empty($nv['is_abnormal']) ? 1 : 0,
                    'units' => $nv['units'] ?? null,
                    'ref' => $nv['reference_range'] ?? null,
                    'oid' => $rec['order_id'],
                    'name' => $nv['name']
                ]);
            }

            // 3. Update lis_result_verifications
            $upVerif = $db->prepare("
                UPDATE lis_result_verifications
                SET verification_status = 'amended',
                    is_amended = 1,
                    amendment_count = amendment_count + 1,
                    amendment_reason = :reason,
                    pathologist_narrative = CONCAT(COALESCE(pathologist_narrative, ''), '\n[AMENDMENT #', :seq, ' on ', NOW(), ' by ', (SELECT username FROM users WHERE id = :uid), ']: ', :reason2),
                    updated_at = NOW()
                WHERE id = :id
            ");
            $upVerif->execute([
                'reason' => $reason,
                'seq' => $nextSeq,
                'uid' => $actorId,
                'reason2' => $reason,
                'id' => $verificationId
            ]);

            if ($ownsTx) {
                $db->commit();
            }

            return [
                'success' => true,
                'message' => "Amendment #{$nextSeq} saved and audited. Clinical chart updated with amended values.",
                'amendment_number' => $nextSeq,
                'verification_status' => 'amended'
            ];
        } catch (\Throwable $e) {
            if ($ownsTx && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * KPI Counters for Pathologist Clinical Verification Queue.
     */
    public function getStats(): array
    {
        $db = Database::connection();
        $stmt = $db->query("
            SELECT
                COUNT(*) AS total_verifications,
                SUM(CASE WHEN verification_status = 'preliminary_verified' THEN 1 ELSE 0 END) AS pending_pathologist_review,
                SUM(CASE WHEN verification_status = 'pathologist_approved' THEN 1 ELSE 0 END) AS pathologist_approved,
                SUM(CASE WHEN verification_status = 'pathologist_returned' THEN 1 ELSE 0 END) AS pathologist_returned,
                SUM(CASE WHEN is_amended = 1 OR verification_status = 'amended' THEN 1 ELSE 0 END) AS amended_count,
                SUM(CASE WHEN is_critical = 1 AND verification_status = 'preliminary_verified' THEN 1 ELSE 0 END) AS pending_critical_alerts
            FROM lis_result_verifications
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'total_verifications' => (int) ($row['total_verifications'] ?? 0),
            'pending_pathologist_review' => (int) ($row['pending_pathologist_review'] ?? 0),
            'pathologist_approved' => (int) ($row['pathologist_approved'] ?? 0),
            'pathologist_returned' => (int) ($row['pathologist_returned'] ?? 0),
            'amended_count' => (int) ($row['amended_count'] ?? 0),
            'pending_critical_alerts' => (int) ($row['pending_critical_alerts'] ?? 0)
        ];
    }
}
