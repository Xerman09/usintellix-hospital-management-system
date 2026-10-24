<?php

namespace App\Modules\Radiology\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\PatientProcedureResults\Services\PatientProcedureResultService;
use PDO;
use RuntimeException;

class RisRadiologyReportService
{
    public const URGENCY_LEVELS = [
        'routine' => 'Routine (No Acute Finding)',
        'abnormal' => 'Abnormal (Non-urgent)',
        'urgent_action_required' => 'Urgent Action Required (Notify Team)',
        'critical_panic' => 'Critical Panic Finding (Immediate Read-back Required)'
    ];

    /**
     * Compute SHA-256 electronic signature hash for legal auditability
     */
    public static function generateSignatureHash(int $orderId, int $userId, string $license, string $impression, string $timestamp): string
    {
        $payload = "RAD_REPORT:order={$orderId}:signer={$userId}:lic={$license}:time={$timestamp}:imp=" . hash('sha256', $impression);
        return hash('sha256', $payload);
    }

    /**
     * Get or initialize structured report form for an imaging order
     */
    public function getReportForm(int $orderId): array
    {
        $db = Database::connection();

        // Check if existing RIS report exists
        $st = $db->prepare(
            "SELECT r.*, p.first_name, p.last_name, p.patient_no, p.birthdate, p.sex,
                    cfg.name AS study_name, cfg.identifying_code, cfg.rad_modality,
                    req.indication AS default_indication, req.priority AS order_priority,
                    bk.technique AS default_technique
             FROM patient_procedure_orders ppo
             JOIN patients p ON p.id = ppo.patient_id
             JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
             LEFT JOIN rad_requests req ON req.id = ppo.rad_request_id
             LEFT JOIN rad_bookings bk ON bk.id = ppo.rad_booking_id
             LEFT JOIN ris_radiology_reports r ON r.order_id = ppo.id AND r.status IN ('draft', 'preliminary', 'final_signed')
             WHERE ppo.id = :oid
             ORDER BY r.version DESC
             LIMIT 1"
        );
        $st->execute(['oid' => $orderId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return ['success' => false, 'message' => 'Imaging order not found.'];
        }

        $now = date('Y-m-d');
        $age = $row['birthdate'] ? (int) date_diff(date_create($row['birthdate']), date_create($now))->y : null;
        $row['patient_name'] = trim($row['first_name'] . ' ' . $row['last_name']);
        $row['age'] = $age;

        // If no report draft exists yet, prepare default template structure
        if (empty($row['id'])) {
            $row['version'] = 1;
            $row['status'] = 'draft';
            $row['indication'] = $row['default_indication'] ?: 'Evaluation as clinically indicated.';
            $row['technique'] = $row['default_technique'] ?: 'Standard multi-planar radiographic / tomographic acquisition without complications.';
            $row['comparison'] = 'No prior imaging available for direct side-by-side comparison.';
            $row['findings'] = "• Osseous Structures: Normal alignment and mineralization. No acute fracture or focal osseous lesion.\n• Soft Tissues: Unremarkable.\n• Visualized Organs: Within normal anatomical limits.";
            $row['impression'] = "1. No acute cardiopulmonary or traumatic process identified.\n2. Otherwise unremarkable examination.";
            $row['recommendation'] = 'Clinical correlation recommended.';
            $row['finding_urgency'] = 'routine';
            $row['is_signed'] = 0;
        }

        // Get prior reports for this patient
        $priorSt = $db->prepare(
            "SELECT r.id, r.order_id, r.version, r.status, r.study_instance_uid, r.accession_no,
                    r.impression, r.finding_urgency, r.signed_at, r.radiologist_name,
                    cfg.name AS study_name
             FROM ris_radiology_reports r
             JOIN patient_procedure_orders ppo ON ppo.id = r.order_id
             JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
             WHERE r.patient_id = :pid AND r.order_id <> :oid AND r.status IN ('final_signed', 'addendum')
             ORDER BY r.signed_at DESC
             LIMIT 5"
        );
        $priorSt->execute(['pid' => $row['patient_id'], 'oid' => $orderId]);
        $row['prior_reports'] = $priorSt->fetchAll(PDO::FETCH_ASSOC);
        $row['urgency_options'] = self::URGENCY_LEVELS;

        return ['success' => true, 'data' => $row];
    }

    /**
     * Save draft or sign structured radiologist report
     */
    public function saveReport(array $data, array $actor): array
    {
        $db = Database::connection();
        $orderId = (int) ($data['order_id'] ?? 0);
        if ($orderId <= 0) {
            return ['success' => false, 'message' => 'Procedure order ID is required.'];
        }

        // Fetch order details
        $ordSt = $db->prepare(
            "SELECT ppo.id, ppo.patient_id, ppo.accession_no, ppo.rad_request_id,
                    cfg.name AS study_name, cfg.identifying_code,
                    p.patient_no, p.first_name, p.last_name,
                    rio.study_instance_uid, rio.accession_no AS ris_accession_no
             FROM patient_procedure_orders ppo
             JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
             JOIN patients p ON p.id = ppo.patient_id
             LEFT JOIN ris_imaging_orders rio ON rio.order_id = ppo.id
             WHERE ppo.id = :oid
             LIMIT 1"
        );
        $ordSt->execute(['oid' => $orderId]);
        $ord = $ordSt->fetch(PDO::FETCH_ASSOC);
        if (!$ord) {
            return ['success' => false, 'message' => 'Imaging order not found.'];
        }

        $accessionNo = $ord['accession_no'] ?: ($ord['ris_accession_no'] ?: 'RAD-' . date('Y') . '-' . sprintf('%05d', $orderId));
        $studyUid = $ord['study_instance_uid'] ?: null;

        $isSign = !empty($data['sign']);
        $indication = trim((string) ($data['indication'] ?? ''));
        $technique = trim((string) ($data['technique'] ?? ''));
        $comparison = trim((string) ($data['comparison'] ?? ''));
        $findings = trim((string) ($data['findings'] ?? ''));
        $impression = trim((string) ($data['impression'] ?? ''));
        $recommendation = trim((string) ($data['recommendation'] ?? ''));
        $urgency = (string) ($data['finding_urgency'] ?? 'routine');
        if (!isset(self::URGENCY_LEVELS[$urgency])) {
            $urgency = 'routine';
        }
        $urgentDetails = trim((string) ($data['urgent_finding_details'] ?? ''));

        if ($isSign) {
            if (empty($impression)) {
                return ['success' => false, 'message' => 'Diagnostic impression is required to sign the radiologist report.'];
            }
            if (empty($findings)) {
                return ['success' => false, 'message' => 'Anatomical findings section is required to sign the radiologist report.'];
            }
            if (in_array($urgency, ['urgent_action_required', 'critical_panic'], true) && empty($urgentDetails)) {
                return ['success' => false, 'message' => 'Urgent / Critical finding details must be specified for physician notification.'];
            }
        }

        // Check if report already exists
        $repSt = $db->prepare("SELECT * FROM ris_radiology_reports WHERE order_id = :oid ORDER BY version DESC LIMIT 1");
        $repSt->execute(['oid' => $orderId]);
        $existing = $repSt->fetch(PDO::FETCH_ASSOC);

        $now = date('Y-m-d H:i:s');
        $version = $existing ? (int) $existing['version'] : 1;
        $status = $isSign ? 'final_signed' : 'draft';

        // Radiologist signature details
        $radUserId = null;
        $radName = null;
        $radLicense = null;
        $sigHash = null;

        if ($isSign) {
            $radUserId = (int) $actor['id'];
            $radName = trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? '')) ?: ($actor['username'] ?? 'Radiologist');

            // Fetch license from rad_staff if available
            $staffSt = $db->prepare("SELECT license_no FROM rad_staff WHERE user_id = :uid LIMIT 1");
            $staffSt->execute(['uid' => $radUserId]);
            $radLicense = $staffSt->fetchColumn() ?: ($data['radiologist_license_no'] ?? 'PRC-RAD-ACTIVE');

            $sigHash = self::generateSignatureHash($orderId, $radUserId, $radLicense, $impression, $now);
        }

        $isCritical = in_array($urgency, ['urgent_action_required', 'critical_panic'], true);

        if ($existing && $existing['status'] === 'draft') {
            // Update draft
            $upd = $db->prepare(
                "UPDATE ris_radiology_reports
                 SET indication = :ind,
                     technique = :tech,
                     comparison = :comp,
                     findings = :find,
                     impression = :imp,
                     recommendation = :rec,
                     finding_urgency = :urg,
                     urgent_finding_details = :urg_det,
                     status = :status,
                     is_signed = :signed,
                     radiologist_user_id = :uid,
                     radiologist_name = :rname,
                     radiologist_license_no = :lic,
                     signed_at = :sig_at,
                     signature_hash = :hash,
                     critical_alert_sent = :alert_sent,
                     critical_alert_at = :alert_at,
                     updated_at = NOW()
                 WHERE id = :id"
            );
            $upd->execute([
                'ind' => $indication,
                'tech' => $technique,
                'comp' => $comparison,
                'find' => $findings,
                'imp' => $impression,
                'rec' => $recommendation,
                'urg' => $urgency,
                'urg_det' => $urgentDetails ?: null,
                'status' => $status,
                'signed' => $isSign ? 1 : 0,
                'uid' => $radUserId,
                'rname' => $radName,
                'lic' => $radLicense,
                'sig_at' => $isSign ? $now : null,
                'hash' => $sigHash,
                'alert_sent' => ($isSign && $isCritical) ? 1 : 0,
                'alert_at' => ($isSign && $isCritical) ? $now : null,
                'id' => $existing['id']
            ]);
            $reportId = (int) $existing['id'];
        } else {
            // Insert new version or new report
            if ($existing && $existing['status'] === 'final_signed') {
                $version++;
                $status = $isSign ? 'addendum' : 'draft';
            }

            $ins = $db->prepare(
                "INSERT INTO ris_radiology_reports (
                    order_id, accession_no, study_instance_uid, patient_id, version, status,
                    indication, technique, comparison, findings, impression, recommendation,
                    finding_urgency, urgent_finding_details, critical_alert_sent, critical_alert_at,
                    is_signed, radiologist_user_id, radiologist_name, radiologist_license_no,
                    signed_at, signature_hash, created_at
                ) VALUES (
                    :oid, :acc, :suid, :pid, :ver, :status,
                    :ind, :tech, :comp, :find, :imp, :rec,
                    :urg, :urg_det, :alert_sent, :alert_at,
                    :signed, :uid, :rname, :lic,
                    :sig_at, :hash, NOW()
                )"
            );
            $ins->execute([
                'oid' => $orderId,
                'acc' => $accessionNo,
                'suid' => $studyUid,
                'pid' => $ord['patient_id'],
                'ver' => $version,
                'status' => $status,
                'ind' => $indication,
                'tech' => $technique,
                'comp' => $comparison,
                'find' => $findings,
                'imp' => $impression,
                'rec' => $recommendation,
                'urg' => $urgency,
                'urg_det' => $urgentDetails ?: null,
                'alert_sent' => ($isSign && $isCritical) ? 1 : 0,
                'alert_at' => ($isSign && $isCritical) ? $now : null,
                'signed' => $isSign ? 1 : 0,
                'uid' => $radUserId,
                'rname' => $radName,
                'lic' => $radLicense,
                'sig_at' => $isSign ? $now : null,
                'hash' => $sigHash
            ]);
            $reportId = (int) $db->lastInsertId();
        }

        // When signed: sync to PatientProcedureResult and trigger critical panic alerts
        if ($isSign) {
            $conclusionFlag = $isCritical ? 'critical' : ($urgency === 'abnormal' ? 'abnormal' : 'normal');
            $procedureRow = [
                'code' => $ord['identifying_code'] ?: 'RAD_STUDY',
                'name' => $ord['study_name'],
                'value' => mb_substr($impression, 0, 100),
                'flag' => $conclusionFlag,
                'flag_detail' => $isCritical ? $urgentDetails : mb_substr($impression, 0, 150),
                'result_date' => date('Y-m-d')
            ];

            (new PatientProcedureResultService())->saveForOrder($orderId, [$procedureRow], (int) $actor['id'], 'imaging');

            // Update rad_reports table for backward compatibility
            $db->prepare(
                "INSERT INTO rad_reports (order_id, version, status, technique, comparison, findings, impression, recommendation, conclusion, critical_note, signed_by, signed_at, created_at)
                 VALUES (:oid, :ver, 'signed', :tech, :comp, :find, :imp, :rec, :conc, :crit, :s_by, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE status = 'signed', findings = VALUES(findings), impression = VALUES(impression), conclusion = VALUES(conclusion), signed_by = VALUES(signed_by), signed_at = NOW()"
            )->execute([
                'oid' => $orderId,
                'ver' => $version,
                'tech' => mb_substr($technique, 0, 500),
                'comp' => mb_substr($comparison, 0, 500),
                'find' => $findings,
                'imp' => $impression,
                'rec' => mb_substr($recommendation, 0, 500),
                'conc' => $conclusionFlag,
                'crit' => $isCritical ? mb_substr($urgentDetails, 0, 255) : null,
                's_by' => $radUserId
            ]);

            // Update patient_procedure_orders status to 'reported'
            $db->prepare("UPDATE patient_procedure_orders SET status = 'reported', reported_at = NOW() WHERE id = :oid")
               ->execute(['oid' => $orderId]);

            // Trigger urgent diagnostic finding broadcast alert
            if ($isCritical) {
                AlertService::raise([
                    'type' => 'imaging_critical',
                    'urgency' => 'urgent',
                    'title' => "URGENT RADIOLOGY FINDING: {$ord['study_name']} — {$ord['first_name']} {$ord['last_name']} ({$accessionNo})",
                    'body' => "Critical Diagnostic Finding: {$urgentDetails}\nImpression: {$impression}\nSigned by Dr. {$radName} (PRC: {$radLicense}). Immediate read-back acknowledgement required.",
                    'patient_id' => $ord['patient_id'],
                    'link' => ['tab' => 'rad_worklist'],
                    'targets' => [['role' => 'doctor'], ['role' => 'nurse']],
                    'source_type' => 'ris_radiology_reports',
                    'source_id' => $reportId,
                    'dedupe_key' => "radcrit:{$reportId}"
                ]);
            }
        }

        return [
            'success' => true,
            'message' => $isSign ? "Radiologist report electronically signed and filed to chart." : "Report draft saved successfully.",
            'report_id' => $reportId,
            'version' => $version,
            'status' => $status,
            'signature_hash' => $sigHash,
            'critical_alert_triggered' => ($isSign && $isCritical)
        ];
    }

    /**
     * Confirm read-back acknowledgment of a critical imaging finding
     */
    public function confirmReadBack(int $reportId, string $readBackByName, array $actor): array
    {
        $db = Database::connection();
        $upd = $db->prepare(
            "UPDATE ris_radiology_reports
             SET read_back_confirmed = 1,
                 read_back_by_name = :name,
                 read_back_at = NOW()
             WHERE id = :id AND finding_urgency IN ('urgent_action_required', 'critical_panic')"
        );
        $upd->execute(['name' => trim($readBackByName), 'id' => $reportId]);

        return [
            'success' => true,
            'message' => "Critical finding read-back successfully documented by {$readBackByName}."
        ];
    }
}
