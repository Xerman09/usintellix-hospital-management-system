<?php

namespace App\Modules\InpatientAdmissions\Services;

use App\Core\Database;
use App\Modules\InpatientAdmissions\Models\NursingShiftHandover;
use PDO;
use Exception;

class ShiftHandoverService
{
    private PDO $db;
    private NursingShiftHandover $model;

    public const SHIFT_TRANSITIONS = [
        'Morning to Afternoon (07:00 → 15:00)',
        'Afternoon to Night (15:00 → 23:00)',
        'Night to Morning (23:00 → 07:00)',
        'Interim / Relief Handover'
    ];

    public const ACUITY_LEVELS = [
        'Level 1 - Stable',
        'Level 2 - Moderate Acuity',
        'Level 3 - High Acuity / Close Monitoring',
        'Level 4 - Critical / ICU 1:1'
    ];

    public const HANDOVER_STATUSES = [
        'Pending Incoming Sign-Off',
        'Dual-Signed / Completed',
        'Clarification Requested'
    ];

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->model = new NursingShiftHandover();
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void
    {
        $sql = "
        CREATE TABLE IF NOT EXISTS `nursing_shift_handovers` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `handover_number` VARCHAR(40) NOT NULL,
            `admission_id` INT UNSIGNED NOT NULL,
            `patient_id` INT UNSIGNED NULL DEFAULT NULL,
            `ward_id` INT UNSIGNED NULL DEFAULT NULL,
            `bed_id` INT UNSIGNED NULL DEFAULT NULL,
            `handover_datetime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `shift_transition` ENUM(
                'Morning to Afternoon (07:00 → 15:00)',
                'Afternoon to Night (15:00 → 23:00)',
                'Night to Morning (23:00 → 07:00)',
                'Interim / Relief Handover'
            ) NOT NULL DEFAULT 'Morning to Afternoon (07:00 → 15:00)',
            `outgoing_shift` VARCHAR(40) NOT NULL DEFAULT 'Morning Shift (07:00-15:00)',
            `incoming_shift` VARCHAR(40) NOT NULL DEFAULT 'Afternoon Shift (15:00-23:00)',
            `acuity_level` ENUM(
                'Level 1 - Stable',
                'Level 2 - Moderate Acuity',
                'Level 3 - High Acuity / Close Monitoring',
                'Level 4 - Critical / ICU 1:1'
            ) NOT NULL DEFAULT 'Level 2 - Moderate Acuity',
            `code_status` VARCHAR(60) NOT NULL DEFAULT 'Full Code',
            `allergies_summary` VARCHAR(255) NULL DEFAULT 'NKDA',
            `isolation_precautions` VARCHAR(80) NOT NULL DEFAULT 'Standard',
            `fall_risk_level` ENUM('Low', 'Moderate', 'High') NOT NULL DEFAULT 'Low',
            `sbar_situation` TEXT NOT NULL,
            `sbar_background` TEXT NOT NULL,
            `sbar_assessment` TEXT NOT NULL,
            `sbar_recommendation` TEXT NOT NULL,
            `safety_checks_json` TEXT NULL DEFAULT NULL,
            `vitals_snapshot_json` TEXT NULL DEFAULT NULL,
            `outgoing_nurse_id` INT UNSIGNED NULL DEFAULT NULL,
            `outgoing_nurse_name` VARCHAR(120) NOT NULL,
            `outgoing_nurse_signature` VARCHAR(180) NOT NULL,
            `outgoing_signed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `incoming_nurse_id` INT UNSIGNED NULL DEFAULT NULL,
            `incoming_nurse_name` VARCHAR(120) NULL DEFAULT NULL,
            `incoming_nurse_signature` VARCHAR(180) NULL DEFAULT NULL,
            `incoming_signed_at` DATETIME NULL DEFAULT NULL,
            `incoming_acknowledgment_notes` TEXT NULL DEFAULT NULL,
            `handover_status` ENUM(
                'Pending Incoming Sign-Off',
                'Dual-Signed / Completed',
                'Clarification Requested'
            ) NOT NULL DEFAULT 'Pending Incoming Sign-Off',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uq_nursing_shift_handover_number` (`handover_number`),
            KEY `idx_nsh_admission_id` (`admission_id`),
            KEY `idx_nsh_patient_id` (`patient_id`),
            KEY `idx_nsh_datetime` (`handover_datetime`),
            KEY `idx_nsh_status` (`handover_status`),
            KEY `idx_nsh_transition` (`shift_transition`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $this->db->exec($sql);
    }

    /**
     * Get SBAR shift handovers and live clinical context for an admission
     */
    public function getHandoversByAdmission(int $admissionId, ?string $statusFilter = null): array
    {
        $sql = "SELECT * FROM `nursing_shift_handovers` WHERE `admission_id` = :admission_id";
        $params = [':admission_id' => $admissionId];

        if ($statusFilter && $statusFilter !== 'all') {
            $sql .= " AND `handover_status` = :status";
            $params[':status'] = $statusFilter;
        }

        $sql .= " ORDER BY `handover_datetime` DESC, `id` DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as &$r) {
            $r['safety_checks'] = !empty($r['safety_checks_json'])
                ? json_decode($r['safety_checks_json'], true)
                : [];
            $r['vitals_snapshot'] = !empty($r['vitals_snapshot_json'])
                ? json_decode($r['vitals_snapshot_json'], true)
                : [];
        }
        unset($r);

        // Compute summary statistics across all handovers for this admission
        $countStmt = $this->db->prepare("
            SELECT
                COUNT(*) AS total_count,
                SUM(CASE WHEN handover_status = 'Dual-Signed / Completed' THEN 1 ELSE 0 END) AS dual_signed_count,
                SUM(CASE WHEN handover_status = 'Pending Incoming Sign-Off' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN handover_status = 'Clarification Requested' THEN 1 ELSE 0 END) AS clarification_count
            FROM `nursing_shift_handovers`
            WHERE `admission_id` = :admission_id
        ");
        $countStmt->execute([':admission_id' => $admissionId]);
        $counts = $countStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'handovers' => $rows,
            'summary' => [
                'total_count' => (int)($counts['total_count'] ?? 0),
                'dual_signed_count' => (int)($counts['dual_signed_count'] ?? 0),
                'pending_count' => (int)($counts['pending_count'] ?? 0),
                'clarification_count' => (int)($counts['clarification_count'] ?? 0),
            ],
            'clinical_autofill' => $this->buildClinicalAutofillContext($admissionId)
        ];
    }

    /**
     * Build clinical context from admission, latest round, fluid balance, and care plans
     * so nurses can auto-populate SBAR fields accurately at shift change.
     */
    private function buildClinicalAutofillContext(int $admissionId): array
    {
        $context = [
            'admission' => null,
            'latest_round' => null,
            'fluid_24h_summary' => null,
            'active_care_plans' => []
        ];

        try {
            $admStmt = $this->db->prepare("
                SELECT a.*, b.bed_number, b.room_number, w.ward_name, w.ward_code
                FROM `inpatient_admissions` a
                LEFT JOIN `inpatient_beds` b ON a.bed_id = b.id
                LEFT JOIN `inpatient_wards` w ON a.ward_id = w.id
                WHERE a.id = :id
                LIMIT 1
            ");
            $admStmt->execute([':id' => $admissionId]);
            $context['admission'] = $admStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Exception $e) {
            // Ignore if table columns vary
        }

        try {
            $rndStmt = $this->db->prepare("
                SELECT round_datetime, rounding_physician_name, clinical_trajectory, assessment, plan, diet_order, activity_order, target_discharge_date
                FROM `inpatient_daily_rounds`
                WHERE admission_id = :id
                ORDER BY round_datetime DESC, id DESC
                LIMIT 1
            ");
            $rndStmt->execute([':id' => $admissionId]);
            $context['latest_round'] = $rndStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Exception $e) {
            // Table may not have entries yet
        }

        try {
            $fbStmt = $this->db->prepare("
                SELECT
                    COALESCE(SUM(intake_total_ml), 0) AS intake_24h_ml,
                    COALESCE(SUM(output_total_ml), 0) AS output_24h_ml,
                    COALESCE(SUM(output_urine_ml), 0) AS urine_24h_ml
                FROM `inpatient_fluid_balance`
                WHERE admission_id = :id
                  AND recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ");
            $fbStmt->execute([':id' => $admissionId]);
            $fb = $fbStmt->fetch(PDO::FETCH_ASSOC);
            if ($fb) {
                $in24 = (int)$fb['intake_24h_ml'];
                $out24 = (int)$fb['output_24h_ml'];
                $context['fluid_24h_summary'] = [
                    'intake_24h_ml' => $in24,
                    'output_24h_ml' => $out24,
                    'net_24h_ml' => $in24 - $out24,
                    'urine_24h_ml' => (int)$fb['urine_24h_ml']
                ];
            }
        } catch (Exception $e) {
            // Ignore
        }

        try {
            $cpStmt = $this->db->prepare("
                SELECT nursing_diagnosis, priority_level, evaluation_status, measurable_goals, nursing_interventions
                FROM `inpatient_care_plans`
                WHERE admission_id = :id
                ORDER BY id DESC
                LIMIT 3
            ");
            $cpStmt->execute([':id' => $admissionId]);
            $context['active_care_plans'] = $cpStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {
            // Ignore
        }

        return $context;
    }

    /**
     * Get a single SBAR handover record by ID
     */
    public function getHandoverById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM `nursing_shift_handovers` WHERE `id` = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $row['safety_checks'] = !empty($row['safety_checks_json'])
            ? json_decode($row['safety_checks_json'], true)
            : [];
        $row['vitals_snapshot'] = !empty($row['vitals_snapshot_json'])
            ? json_decode($row['vitals_snapshot_json'], true)
            : [];
        return $row;
    }

    /**
     * Create a new SBAR shift handover record (with outgoing nurse sign-off, and optional immediate incoming dual sign-off)
     */
    public function createHandover(array $data, ?int $userId = null): array
    {
        $admissionId = (int)($data['admission_id'] ?? 0);
        if ($admissionId <= 0) {
            throw new Exception('Valid inpatient admission_id is required.');
        }

        $situation = trim((string)($data['sbar_situation'] ?? ''));
        $background = trim((string)($data['sbar_background'] ?? ''));
        $assessment = trim((string)($data['sbar_assessment'] ?? ''));
        $recommendation = trim((string)($data['sbar_recommendation'] ?? ''));

        if ($situation === '' || $background === '' || $assessment === '' || $recommendation === '') {
            throw new Exception('All four SBAR sections (Situation, Background, Assessment, Recommendation) are required for clinical continuity.');
        }

        $outgoingNurseName = trim((string)($data['outgoing_nurse_name'] ?? ''));
        if ($outgoingNurseName === '') {
            throw new Exception('Outgoing Nurse name and credentials are required for digital sign-off.');
        }

        $handoverDatetime = !empty($data['handover_datetime'])
            ? str_replace('T', ' ', substr((string)$data['handover_datetime'], 0, 19))
            : date('Y-m-d H:i:s');
        if (strlen($handoverDatetime) === 16) {
            $handoverDatetime .= ':00';
        }

        $shiftTransition = trim((string)($data['shift_transition'] ?? 'Morning to Afternoon (07:00 → 15:00)'));
        if (!in_array($shiftTransition, self::SHIFT_TRANSITIONS, true)) {
            $shiftTransition = 'Morning to Afternoon (07:00 → 15:00)';
        }

        [$defaultOutShift, $defaultInShift] = $this->deriveShiftLabels($shiftTransition);
        $outgoingShift = !empty($data['outgoing_shift']) ? trim((string)$data['outgoing_shift']) : $defaultOutShift;
        $incomingShift = !empty($data['incoming_shift']) ? trim((string)$data['incoming_shift']) : $defaultInShift;

        $acuityLevel = trim((string)($data['acuity_level'] ?? 'Level 2 - Moderate Acuity'));
        if (!in_array($acuityLevel, self::ACUITY_LEVELS, true)) {
            $acuityLevel = 'Level 2 - Moderate Acuity';
        }

        $fallRisk = trim((string)($data['fall_risk_level'] ?? 'Low'));
        if (!in_array($fallRisk, ['Low', 'Moderate', 'High'], true)) {
            $fallRisk = 'Low';
        }

        $outgoingSig = !empty($data['outgoing_nurse_signature'])
            ? trim((string)$data['outgoing_nurse_signature'])
            : $this->generateDigitalSignature($outgoingNurseName, 'OUTGOING_RN');

        // Check if incoming nurse is co-signing immediately at the bedside
        $incomingNurseName = !empty($data['incoming_nurse_name']) ? trim((string)$data['incoming_nurse_name']) : null;
        $incomingSig = null;
        $incomingSignedAt = null;
        $incomingNotes = !empty($data['incoming_acknowledgment_notes']) ? trim((string)$data['incoming_acknowledgment_notes']) : null;
        $handoverStatus = 'Pending Incoming Sign-Off';

        if (!empty($incomingNurseName)) {
            $incomingSig = !empty($data['incoming_nurse_signature'])
                ? trim((string)$data['incoming_nurse_signature'])
                : $this->generateDigitalSignature($incomingNurseName, 'INCOMING_RN');
            $incomingSignedAt = date('Y-m-d H:i:s');
            $handoverStatus = 'Dual-Signed / Completed';
        }

        $safetyChecksJson = null;
        if (!empty($data['safety_checks'])) {
            $safetyChecksJson = is_string($data['safety_checks'])
                ? $data['safety_checks']
                : json_encode($data['safety_checks']);
        }

        $vitalsSnapshotJson = null;
        if (!empty($data['vitals_snapshot'])) {
            $vitalsSnapshotJson = is_string($data['vitals_snapshot'])
                ? $data['vitals_snapshot']
                : json_encode($data['vitals_snapshot']);
        }

        $handoverNumber = 'SBAR-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

        $insertData = [
            'handover_number' => $handoverNumber,
            'admission_id' => $admissionId,
            'patient_id' => !empty($data['patient_id']) ? (int)$data['patient_id'] : null,
            'ward_id' => !empty($data['ward_id']) ? (int)$data['ward_id'] : null,
            'bed_id' => !empty($data['bed_id']) ? (int)$data['bed_id'] : null,
            'handover_datetime' => $handoverDatetime,
            'shift_transition' => $shiftTransition,
            'outgoing_shift' => $outgoingShift,
            'incoming_shift' => $incomingShift,
            'acuity_level' => $acuityLevel,
            'code_status' => trim((string)($data['code_status'] ?? 'Full Code')),
            'allergies_summary' => trim((string)($data['allergies_summary'] ?? 'NKDA')),
            'isolation_precautions' => trim((string)($data['isolation_precautions'] ?? 'Standard')),
            'fall_risk_level' => $fallRisk,
            'sbar_situation' => $situation,
            'sbar_background' => $background,
            'sbar_assessment' => $assessment,
            'sbar_recommendation' => $recommendation,
            'safety_checks_json' => $safetyChecksJson,
            'vitals_snapshot_json' => $vitalsSnapshotJson,
            'outgoing_nurse_id' => $userId,
            'outgoing_nurse_name' => $outgoingNurseName,
            'outgoing_nurse_signature' => $outgoingSig,
            'outgoing_signed_at' => date('Y-m-d H:i:s'),
            'incoming_nurse_id' => !empty($incomingNurseName) ? $userId : null,
            'incoming_nurse_name' => $incomingNurseName,
            'incoming_nurse_signature' => $incomingSig,
            'incoming_signed_at' => $incomingSignedAt,
            'incoming_acknowledgment_notes' => $incomingNotes,
            'handover_status' => $handoverStatus
        ];

        $id = (int)$this->model->insert($insertData);

        if ($handoverStatus === 'Dual-Signed / Completed' && !empty($incomingNurseName)) {
            $this->updateAdmissionShiftNurse($admissionId, $incomingNurseName);
        }

        return $this->getHandoverById($id) ?? $insertData;
    }

    /**
     * Update an existing SBAR handover record
     */
    public function updateHandover(int $id, array $data, ?int $userId = null): array
    {
        $existing = $this->getHandoverById($id);
        if (!$existing) {
            throw new Exception('Shift handover record not found.');
        }

        $situation = trim((string)($data['sbar_situation'] ?? $existing['sbar_situation']));
        $background = trim((string)($data['sbar_background'] ?? $existing['sbar_background']));
        $assessment = trim((string)($data['sbar_assessment'] ?? $existing['sbar_assessment']));
        $recommendation = trim((string)($data['sbar_recommendation'] ?? $existing['sbar_recommendation']));

        if ($situation === '' || $background === '' || $assessment === '' || $recommendation === '') {
            throw new Exception('All four SBAR sections (Situation, Background, Assessment, Recommendation) are required.');
        }

        $shiftTransition = trim((string)($data['shift_transition'] ?? $existing['shift_transition']));
        if (!in_array($shiftTransition, self::SHIFT_TRANSITIONS, true)) {
            $shiftTransition = $existing['shift_transition'];
        }

        [$defaultOutShift, $defaultInShift] = $this->deriveShiftLabels($shiftTransition);
        $outgoingShift = !empty($data['outgoing_shift']) ? trim((string)$data['outgoing_shift']) : $defaultOutShift;
        $incomingShift = !empty($data['incoming_shift']) ? trim((string)$data['incoming_shift']) : $defaultInShift;

        $handoverDatetime = !empty($data['handover_datetime'])
            ? str_replace('T', ' ', substr((string)$data['handover_datetime'], 0, 19))
            : $existing['handover_datetime'];
        if (strlen($handoverDatetime) === 16) {
            $handoverDatetime .= ':00';
        }

        $outgoingNurseName = trim((string)($data['outgoing_nurse_name'] ?? $existing['outgoing_nurse_name']));
        $outgoingSig = !empty($data['outgoing_nurse_signature'])
            ? trim((string)$data['outgoing_nurse_signature'])
            : $this->generateDigitalSignature($outgoingNurseName, 'OUTGOING_RN');

        $updateData = [
            'handover_datetime' => $handoverDatetime,
            'shift_transition' => $shiftTransition,
            'outgoing_shift' => $outgoingShift,
            'incoming_shift' => $incomingShift,
            'acuity_level' => trim((string)($data['acuity_level'] ?? $existing['acuity_level'])),
            'code_status' => trim((string)($data['code_status'] ?? $existing['code_status'])),
            'allergies_summary' => trim((string)($data['allergies_summary'] ?? $existing['allergies_summary'])),
            'isolation_precautions' => trim((string)($data['isolation_precautions'] ?? $existing['isolation_precautions'])),
            'fall_risk_level' => trim((string)($data['fall_risk_level'] ?? $existing['fall_risk_level'])),
            'sbar_situation' => $situation,
            'sbar_background' => $background,
            'sbar_assessment' => $assessment,
            'sbar_recommendation' => $recommendation,
            'outgoing_nurse_name' => $outgoingNurseName,
            'outgoing_nurse_signature' => $outgoingSig
        ];

        if (isset($data['safety_checks'])) {
            $updateData['safety_checks_json'] = is_string($data['safety_checks'])
                ? $data['safety_checks']
                : json_encode($data['safety_checks']);
        }

        if (isset($data['incoming_nurse_name']) && trim((string)$data['incoming_nurse_name']) !== '') {
            $incName = trim((string)$data['incoming_nurse_name']);
            $updateData['incoming_nurse_name'] = $incName;
            $updateData['incoming_nurse_signature'] = !empty($data['incoming_nurse_signature'])
                ? trim((string)$data['incoming_nurse_signature'])
                : $this->generateDigitalSignature($incName, 'INCOMING_RN');
            $updateData['incoming_signed_at'] = $existing['incoming_signed_at'] ?: date('Y-m-d H:i:s');
            $updateData['incoming_acknowledgment_notes'] = trim((string)($data['incoming_acknowledgment_notes'] ?? $existing['incoming_acknowledgment_notes'] ?? ''));
            $updateData['handover_status'] = 'Dual-Signed / Completed';
        }

        $this->model->update($id, $updateData);

        if (($updateData['handover_status'] ?? '') === 'Dual-Signed / Completed' && !empty($updateData['incoming_nurse_name'])) {
            $this->updateAdmissionShiftNurse((int)$existing['admission_id'], $updateData['incoming_nurse_name']);
        }

        return $this->getHandoverById($id) ?? array_merge($existing, $updateData);
    }

    /**
     * Incoming Nurse Digital Sign-Off (Dual Sign-Off Completion or Clarification Request)
     */
    public function signOffIncoming(int $id, array $data, ?int $userId = null): array
    {
        $existing = $this->getHandoverById($id);
        if (!$existing) {
            throw new Exception('Shift handover record not found.');
        }

        $incomingNurseName = trim((string)($data['incoming_nurse_name'] ?? ''));
        if ($incomingNurseName === '') {
            throw new Exception('Incoming Nurse name and credentials are required to complete dual sign-off.');
        }

        $requestedStatus = trim((string)($data['handover_status'] ?? 'Dual-Signed / Completed'));
        if (!in_array($requestedStatus, ['Dual-Signed / Completed', 'Clarification Requested'], true)) {
            $requestedStatus = 'Dual-Signed / Completed';
        }

        $incomingSig = !empty($data['incoming_nurse_signature'])
            ? trim((string)$data['incoming_nurse_signature'])
            : $this->generateDigitalSignature($incomingNurseName, 'INCOMING_RN');

        $updateData = [
            'incoming_nurse_id' => $userId,
            'incoming_nurse_name' => $incomingNurseName,
            'incoming_nurse_signature' => $incomingSig,
            'incoming_signed_at' => date('Y-m-d H:i:s'),
            'incoming_acknowledgment_notes' => trim((string)($data['incoming_acknowledgment_notes'] ?? '')),
            'handover_status' => $requestedStatus
        ];

        if (!empty($data['safety_checks'])) {
            $updateData['safety_checks_json'] = is_string($data['safety_checks'])
                ? $data['safety_checks']
                : json_encode($data['safety_checks']);
        }

        $this->model->update($id, $updateData);

        if ($requestedStatus === 'Dual-Signed / Completed') {
            $this->updateAdmissionShiftNurse((int)$existing['admission_id'], $incomingNurseName);
        }

        return $this->getHandoverById($id) ?? array_merge($existing, $updateData);
    }

    /**
     * Delete a handover record
     */
    public function deleteHandover(int $id): bool
    {
        $existing = $this->getHandoverById($id);
        if (!$existing) {
            throw new Exception('Shift handover record not found.');
        }
        return (bool)$this->model->delete($id);
    }

    /**
     * Update the inpatient_admissions primary/shift nurse when incoming nurse accepts shift handover
     */
    private function updateAdmissionShiftNurse(int $admissionId, string $incomingNurseName): void
    {
        try {
            $stmt = $this->db->prepare("
                UPDATE `inpatient_admissions`
                SET `primary_nurse` = :nurse
                WHERE `id` = :id
            ");
            $stmt->execute([
                ':nurse' => $incomingNurseName,
                ':id' => $admissionId
            ]);
        } catch (Exception $e) {
            // Non-blocking if column doesn't exist
        }
    }

    private function deriveShiftLabels(string $transition): array
    {
        switch ($transition) {
            case 'Morning to Afternoon (07:00 → 15:00)':
                return ['Morning Shift (07:00-15:00)', 'Afternoon Shift (15:00-23:00)'];
            case 'Afternoon to Night (15:00 → 23:00)':
                return ['Afternoon Shift (15:00-23:00)', 'Night Shift (23:00-07:00)'];
            case 'Night to Morning (23:00 → 07:00)':
                return ['Night Shift (23:00-07:00)', 'Morning Shift (07:00-15:00)'];
            default:
                return ['Outgoing Shift', 'Incoming Shift'];
        }
    }

    private function generateDigitalSignature(string $nurseName, string $rolePrefix): string
    {
        $clean = preg_replace('/[^A-Z0-9]+/', '_', strtoupper(trim($nurseName)));
        $hash = strtoupper(substr(hash('sha256', $nurseName . '|' . $rolePrefix . '|' . date('Y-m-d H:i')), 0, 8));
        return "ESIGN_{$rolePrefix}_{$clean}_{$hash}";
    }
}
