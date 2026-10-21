<?php
declare(strict_types=1);

namespace App\Modules\Dispensing\Services;

use App\Core\Database;
use App\Modules\Dispensing\Models\PrescriptionVerification;
use PDO;

/**
 * PrescriptionVerificationService
 *
 * Manages the Pharmacist Clinical Verification Queue (`prescription_verifications`),
 * enabling clinical pharmacists to verify renal adjustment, patient weight
 * considerations, clinical indications, allergies, and drug interactions before
 * physical dispensing.
 */
final class PrescriptionVerificationService
{
    private static bool $schemaChecked = false;

    public static function ensureTableExists(PDO $pdo): void
    {
        if (self::$schemaChecked) {
            return;
        }
        self::$schemaChecked = true;

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `prescription_verifications` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `verification_number` VARCHAR(40) NOT NULL,
                `prescription_id` INT UNSIGNED NOT NULL,
                `patient_id` INT UNSIGNED NULL,
                `verification_status` ENUM(
                    'Pending Review',
                    'Approved',
                    'Intervention Needed',
                    'Clarification Requested',
                    'Rejected'
                ) NOT NULL DEFAULT 'Pending Review',
                `egfr_crcl_ml_min` DECIMAL(6,2) NULL DEFAULT 90.00,
                `renal_adjustment_status` ENUM(
                    'Normal Renal Function — No Adjustment Needed',
                    'Renal Dose Adjustment Verified',
                    'Renal Dose Reduction Required',
                    'Contraindicated in Renal Impairment'
                ) NOT NULL DEFAULT 'Normal Renal Function — No Adjustment Needed',
                `renal_adjustment_notes` VARCHAR(255) NULL,
                `patient_weight_kg` DECIMAL(5,2) NULL DEFAULT 68.00,
                `weight_dosing_status` ENUM(
                    'Appropriate for Weight / Age',
                    'Weight-Based Dose Verified (mg/kg)',
                    'Dose Too High for Weight (Overdose Risk)',
                    'Subtherapeutic Dose for Weight'
                ) NOT NULL DEFAULT 'Appropriate for Weight / Age',
                `weight_dosing_notes` VARCHAR(255) NULL,
                `indication_verified` TINYINT(1) NOT NULL DEFAULT 1,
                `documented_indication` VARCHAR(255) NULL,
                `allergy_cross_check_passed` TINYINT(1) NOT NULL DEFAULT 1,
                `drug_interaction_check_passed` TINYINT(1) NOT NULL DEFAULT 1,
                `duplicate_therapy_check_passed` TINYINT(1) NOT NULL DEFAULT 1,
                `intervention_category` VARCHAR(100) NULL DEFAULT 'None — Regimen Clinically Appropriate',
                `clinical_review_notes` TEXT NULL,
                `prescriber_contacted` TINYINT(1) NOT NULL DEFAULT 0,
                `prescriber_response_notes` TEXT NULL,
                `verified_by_user_id` INT UNSIGNED NULL,
                `pharmacist_name` VARCHAR(150) NOT NULL DEFAULT 'RPh. Clarissa Mendoza, PharmD (Clinical Pharmacist)',
                `pharmacist_license_no` VARCHAR(60) NULL DEFAULT 'PRC-RPH-0094821',
                `pharmacist_signature` VARCHAR(180) NULL,
                `verified_at` DATETIME NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_prescription_verification_number` (`verification_number`),
                KEY `idx_rx_verification_prescription` (`prescription_id`),
                KEY `idx_rx_verification_patient` (`patient_id`),
                KEY `idx_rx_verification_status` (`verification_status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    /**
     * Retrieves clinical verification details for a single prescription or the full verification queue.
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function getVerifications(array $filters = []): array
    {
        $pdo = Database::connection();
        self::ensureTableExists($pdo);

        $prescriptionId = isset($filters['prescription_id']) ? (int) $filters['prescription_id'] : 0;

        if ($prescriptionId > 0) {
            return $this->getForPrescription($prescriptionId);
        }

        $sql = "
            SELECT
                v.*,
                p.rx_number,
                p.prescribed_date,
                p.diagnosis AS rx_diagnosis,
                p.dispense_status,
                pt.patient_no,
                CONCAT_WS(' ', pt.first_name, pt.middle_name, pt.last_name) AS patient_name
            FROM prescription_verifications v
            LEFT JOIN prescriptions p ON p.id = v.prescription_id
            LEFT JOIN patients pt ON pt.id = v.patient_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['verification_status'])) {
            $sql .= " AND v.verification_status = :status";
            $params[':status'] = (string) $filters['verification_status'];
        }
        if (!empty($filters['patient_id'])) {
            $sql .= " AND v.patient_id = :patient_id";
            $params[':patient_id'] = (int) $filters['patient_id'];
        }

        $sql .= " ORDER BY v.updated_at DESC, v.id DESC LIMIT 100";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'verifications' => array_map([PrescriptionVerification::class, 'formatRecord'], $rows),
            'count'         => count($rows),
        ];
    }

    /**
     * Fetches the clinical verification record and patient clinical context (weight, diagnosis, allergies)
     * for a specific `prescription_id`.
     *
     * @param int $prescriptionId
     * @return array<string, mixed>
     */
    public function getForPrescription(int $prescriptionId): array
    {
        $pdo = Database::connection();
        self::ensureTableExists($pdo);

        $rxStmt = $pdo->prepare("
            SELECT p.id, p.rx_number, p.patient_id, p.diagnosis, p.notes, p.prescribed_date,
                   pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.sex, pt.birthdate
            FROM prescriptions p
            LEFT JOIN patients pt ON pt.id = p.patient_id
            WHERE p.id = :id
            LIMIT 1
        ");
        $rxStmt->execute([':id' => $prescriptionId]);
        $rx = $rxStmt->fetch(PDO::FETCH_ASSOC) ?: null;

        $verStmt = $pdo->prepare("
            SELECT *
            FROM prescription_verifications
            WHERE prescription_id = :rx_id
            ORDER BY id DESC
            LIMIT 1
        ");
        $verStmt->execute([':rx_id' => $prescriptionId]);
        $verRow = $verStmt->fetch(PDO::FETCH_ASSOC);

        // Lookup latest patient weight (kg) from encounter_vitals if available
        $latestWeightKg = null;
        $patientAllergies = [];
        $patientId = isset($rx['patient_id']) ? (int) $rx['patient_id'] : 0;

        if ($patientId > 0) {
            try {
                $wtStmt = $pdo->prepare("
                    SELECT weight_kg, weight_lbs
                    FROM encounter_vitals
                    WHERE patient_id = :pid AND (weight_kg > 0 OR weight_lbs > 0)
                    ORDER BY id DESC
                    LIMIT 1
                ");
                $wtStmt->execute([':pid' => $patientId]);
                $wtRow = $wtStmt->fetch(PDO::FETCH_ASSOC);
                if ($wtRow) {
                    if (!empty($wtRow['weight_kg']) && (float) $wtRow['weight_kg'] > 0) {
                        $latestWeightKg = round((float) $wtRow['weight_kg'], 1);
                    } elseif (!empty($wtRow['weight_lbs']) && (float) $wtRow['weight_lbs'] > 0) {
                        $latestWeightKg = round(((float) $wtRow['weight_lbs']) * 0.453592, 1);
                    }
                }
            } catch (\Throwable $e) {
                // Non-fatal
            }

            try {
                $alStmt = $pdo->prepare("
                    SELECT allergen, reaction, severity
                    FROM patient_allergies
                    WHERE patient_id = :pid
                    ORDER BY id DESC
                    LIMIT 10
                ");
                $alStmt->execute([':pid' => $patientId]);
                $patientAllergies = $alStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            } catch (\Throwable $e) {
                // Non-fatal
            }
        }

        $record = $verRow ? PrescriptionVerification::formatRecord($verRow) : null;

        return [
            'prescription'      => $rx,
            'verification'      => $record,
            'has_verification'  => $record !== null,
            'latest_weight_kg'  => $latestWeightKg ?? ($record['patient_weight_kg'] ?? 68.0),
            'patient_allergies' => $patientAllergies,
            'statuses'          => PrescriptionVerification::VERIFICATION_STATUSES,
            'renal_statuses'    => PrescriptionVerification::RENAL_STATUSES,
            'weight_statuses'   => PrescriptionVerification::WEIGHT_STATUSES,
        ];
    }

    /**
     * Creates or updates a Pharmacist Clinical Verification record for an e-prescription.
     *
     * @param array<string, mixed> $payload
     * @param int|null $userId
     * @return array<string, mixed>
     */
    public function saveVerification(array $payload, ?int $userId = null): array
    {
        $pdo = Database::connection();
        self::ensureTableExists($pdo);

        $prescriptionId = (int) ($payload['prescription_id'] ?? 0);
        if ($prescriptionId <= 0) {
            throw new \InvalidArgumentException('A valid prescription_id is required for Pharmacist Clinical Verification.');
        }

        $rxStmt = $pdo->prepare("SELECT id, patient_id, rx_number, diagnosis FROM prescriptions WHERE id = :id LIMIT 1");
        $rxStmt->execute([':id' => $prescriptionId]);
        $rxRow = $rxStmt->fetch(PDO::FETCH_ASSOC);
        if (!$rxRow) {
            throw new \RuntimeException("Prescription #{$prescriptionId} not found.");
        }

        $patientId = !empty($payload['patient_id'])
            ? (int) $payload['patient_id']
            : (!empty($rxRow['patient_id']) ? (int) $rxRow['patient_id'] : null);

        $validStatuses = array_keys(PrescriptionVerification::VERIFICATION_STATUSES);
        $status = (string) ($payload['verification_status'] ?? 'Approved');
        if (!in_array($status, $validStatuses, true)) {
            $status = 'Approved';
        }

        $validRenal = PrescriptionVerification::RENAL_STATUSES;
        $renalStatus = (string) ($payload['renal_adjustment_status'] ?? 'Normal Renal Function — No Adjustment Needed');
        if (!in_array($renalStatus, $validRenal, true)) {
            $renalStatus = 'Normal Renal Function — No Adjustment Needed';
        }

        $validWeight = PrescriptionVerification::WEIGHT_STATUSES;
        $weightStatus = (string) ($payload['weight_dosing_status'] ?? 'Appropriate for Weight / Age');
        if (!in_array($weightStatus, $validWeight, true)) {
            $weightStatus = 'Appropriate for Weight / Age';
        }

        $egfr = isset($payload['egfr_crcl_ml_min']) && $payload['egfr_crcl_ml_min'] !== ''
            ? round((float) $payload['egfr_crcl_ml_min'], 2)
            : 90.00;
        $weightKg = isset($payload['patient_weight_kg']) && $payload['patient_weight_kg'] !== ''
            ? round((float) $payload['patient_weight_kg'], 2)
            : 68.00;

        $indication = trim((string) ($payload['documented_indication'] ?? $rxRow['diagnosis'] ?? ''));
        if ($indication === '') {
            $indication = 'Outpatient clinical pharmacotherapy regimen';
        }

        $pharmacistName = trim((string) ($payload['pharmacist_name'] ?? 'RPh. Clarissa Mendoza, PharmD (Clinical Pharmacist)'));
        if ($pharmacistName === '') {
            $pharmacistName = 'RPh. Clarissa Mendoza, PharmD (Clinical Pharmacist)';
        }

        $pharmacistLicense = trim((string) ($payload['pharmacist_license_no'] ?? 'PRC-RPH-0094821'));
        $nowStr = date('Y-m-d H:i:s');

        $signature = trim((string) ($payload['pharmacist_signature'] ?? ''));
        if ($signature === '' && $status !== 'Pending Review') {
            $signature = "Digitally Verified by {$pharmacistName} ({$pharmacistLicense}) — {$status} [{$nowStr}]";
        }

        $verifiedAt = ($status !== 'Pending Review') ? $nowStr : null;

        $existStmt = $pdo->prepare("SELECT id, verification_number FROM prescription_verifications WHERE prescription_id = :rx_id ORDER BY id DESC LIMIT 1");
        $existStmt->execute([':rx_id' => $prescriptionId]);
        $existing = $existStmt->fetch(PDO::FETCH_ASSOC);

        $params = [
            ':patient_id'                     => $patientId,
            ':verification_status'            => $status,
            ':egfr_crcl_ml_min'               => $egfr,
            ':renal_adjustment_status'        => $renalStatus,
            ':renal_adjustment_notes'         => !empty($payload['renal_adjustment_notes']) ? trim((string) $payload['renal_adjustment_notes']) : null,
            ':patient_weight_kg'              => $weightKg,
            ':weight_dosing_status'           => $weightStatus,
            ':weight_dosing_notes'            => !empty($payload['weight_dosing_notes']) ? trim((string) $payload['weight_dosing_notes']) : null,
            ':indication_verified'            => !empty($payload['indication_verified']) ? 1 : 0,
            ':documented_indication'          => $indication,
            ':allergy_cross_check_passed'     => !empty($payload['allergy_cross_check_passed']) ? 1 : 0,
            ':drug_interaction_check_passed'  => !empty($payload['drug_interaction_check_passed']) ? 1 : 0,
            ':duplicate_therapy_check_passed' => !empty($payload['duplicate_therapy_check_passed']) ? 1 : 0,
            ':intervention_category'          => trim((string) ($payload['intervention_category'] ?? 'None — Regimen Clinically Appropriate')),
            ':clinical_review_notes'          => $payload['clinical_review_notes'] ?? null,
            ':prescriber_contacted'           => !empty($payload['prescriber_contacted']) ? 1 : 0,
            ':prescriber_response_notes'      => $payload['prescriber_response_notes'] ?? null,
            ':verified_by_user_id'            => $userId,
            ':pharmacist_name'                => $pharmacistName,
            ':pharmacist_license_no'          => $pharmacistLicense,
            ':pharmacist_signature'           => $signature !== '' ? $signature : null,
            ':verified_at'                    => $verifiedAt,
        ];

        if ($existing) {
            $recordId = (int) $existing['id'];
            $params[':id'] = $recordId;
            $upd = $pdo->prepare("
                UPDATE prescription_verifications
                SET
                    patient_id                     = :patient_id,
                    verification_status            = :verification_status,
                    egfr_crcl_ml_min               = :egfr_crcl_ml_min,
                    renal_adjustment_status        = :renal_adjustment_status,
                    renal_adjustment_notes         = :renal_adjustment_notes,
                    patient_weight_kg              = :patient_weight_kg,
                    weight_dosing_status           = :weight_dosing_status,
                    weight_dosing_notes            = :weight_dosing_notes,
                    indication_verified            = :indication_verified,
                    documented_indication          = :documented_indication,
                    allergy_cross_check_passed     = :allergy_cross_check_passed,
                    drug_interaction_check_passed  = :drug_interaction_check_passed,
                    duplicate_therapy_check_passed = :duplicate_therapy_check_passed,
                    intervention_category          = :intervention_category,
                    clinical_review_notes          = :clinical_review_notes,
                    prescriber_contacted           = :prescriber_contacted,
                    prescriber_response_notes      = :prescriber_response_notes,
                    verified_by_user_id            = :verified_by_user_id,
                    pharmacist_name                = :pharmacist_name,
                    pharmacist_license_no          = :pharmacist_license_no,
                    pharmacist_signature           = :pharmacist_signature,
                    verified_at                    = :verified_at
                WHERE id = :id
            ");
            $upd->execute($params);
        } else {
            $verNumber = sprintf('RXV-%s-%04d', date('Ymd'), random_int(1000, 9999));
            $params[':verification_number'] = $verNumber;
            $params[':prescription_id'] = $prescriptionId;

            $ins = $pdo->prepare("
                INSERT INTO prescription_verifications (
                    verification_number,
                    prescription_id,
                    patient_id,
                    verification_status,
                    egfr_crcl_ml_min,
                    renal_adjustment_status,
                    renal_adjustment_notes,
                    patient_weight_kg,
                    weight_dosing_status,
                    weight_dosing_notes,
                    indication_verified,
                    documented_indication,
                    allergy_cross_check_passed,
                    drug_interaction_check_passed,
                    duplicate_therapy_check_passed,
                    intervention_category,
                    clinical_review_notes,
                    prescriber_contacted,
                    prescriber_response_notes,
                    verified_by_user_id,
                    pharmacist_name,
                    pharmacist_license_no,
                    pharmacist_signature,
                    verified_at
                ) VALUES (
                    :verification_number,
                    :prescription_id,
                    :patient_id,
                    :verification_status,
                    :egfr_crcl_ml_min,
                    :renal_adjustment_status,
                    :renal_adjustment_notes,
                    :patient_weight_kg,
                    :weight_dosing_status,
                    :weight_dosing_notes,
                    :indication_verified,
                    :documented_indication,
                    :allergy_cross_check_passed,
                    :drug_interaction_check_passed,
                    :duplicate_therapy_check_passed,
                    :intervention_category,
                    :clinical_review_notes,
                    :prescriber_contacted,
                    :prescriber_response_notes,
                    :verified_by_user_id,
                    :pharmacist_name,
                    :pharmacist_license_no,
                    :pharmacist_signature,
                    :verified_at
                )
            ");
            $ins->execute($params);
            $recordId = (int) $pdo->lastInsertId();
        }

        $savedStmt = $pdo->prepare("SELECT * FROM prescription_verifications WHERE id = :id LIMIT 1");
        $savedStmt->execute([':id' => $recordId]);
        $savedRow = $savedStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return PrescriptionVerification::formatRecord($savedRow);
    }
}
