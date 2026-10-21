<?php
declare(strict_types=1);

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use App\Modules\OrManagement\Models\OrAnesthesiaRecord;
use PDO;

/**
 * AnesthesiaRecordService
 *
 * Manages Electronic Anesthesia Records (`or_anesthesia_records`) for Operation Theater
 * surgical cases, including ASA physical status (I–VI + E), Mallampati classification (I–IV),
 * airway management, induction/maintenance pharmacology, blood loss/fluid balance, and
 * PACU Aldrete recovery scoring (0–10).
 */
final class AnesthesiaRecordService
{
    private static bool $schemaChecked = false;

    public static function ensureTableExists(PDO $pdo): void
    {
        if (self::$schemaChecked) {
            return;
        }
        self::$schemaChecked = true;

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `or_anesthesia_records` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `record_number` VARCHAR(40) NOT NULL,
                `surgical_case_id` INT UNSIGNED NOT NULL,
                `patient_id` INT UNSIGNED NULL,
                `asa_status` ENUM('ASA I', 'ASA II', 'ASA III', 'ASA IV', 'ASA V', 'ASA VI') NOT NULL DEFAULT 'ASA II',
                `asa_emergency_modifier` TINYINT(1) NOT NULL DEFAULT 0,
                `mallampati_class` ENUM('Class I', 'Class II', 'Class III', 'Class IV') NOT NULL DEFAULT 'Class I',
                `thyromental_distance` VARCHAR(60) NOT NULL DEFAULT '>= 6.5 cm (Normal)',
                `neck_mobility` VARCHAR(60) NOT NULL DEFAULT 'Full Range of Motion',
                `dentition_status` VARCHAR(100) NOT NULL DEFAULT 'Intact / Normal',
                `npo_status_hours` DECIMAL(4,1) NULL DEFAULT 8.0,
                `difficult_airway_anticipated` TINYINT(1) NOT NULL DEFAULT 0,
                `preop_airway_notes` TEXT NULL,
                `anesthesia_type` ENUM('General', 'Spinal', 'Epidural', 'Combined Spinal-Epidural (CSE)', 'MAC', 'Regional Nerve Block', 'Local') NOT NULL DEFAULT 'General',
                `airway_device` VARCHAR(80) NOT NULL DEFAULT 'ETT Cuffed',
                `ett_size_mm` VARCHAR(20) NULL DEFAULT '7.5',
                `ett_depth_cm` VARCHAR(20) NULL DEFAULT '21',
                `laryngoscopy_type` VARCHAR(60) NULL DEFAULT 'Video Laryngoscope (GlideScope/C-MAC)',
                `cormack_lehane_grade` ENUM('Grade I', 'Grade IIa', 'Grade IIb', 'Grade III', 'Grade IV', 'N/A (Neuraxial/MAC)') NOT NULL DEFAULT 'Grade I',
                `intubation_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 1,
                `ventilator_mode` VARCHAR(60) NULL DEFAULT 'VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)',
                `induction_drugs` TEXT NULL,
                `maintenance_agents` TEXT NULL,
                `regional_neuraxial_details` TEXT NULL,
                `reversal_emergence_drugs` TEXT NULL,
                `intraop_medications_json` LONGTEXT NULL,
                `estimated_blood_loss_ml` INT NOT NULL DEFAULT 0,
                `urine_output_ml` INT NOT NULL DEFAULT 0,
                `crystalloids_ml` INT NOT NULL DEFAULT 0,
                `colloids_ml` INT NOT NULL DEFAULT 0,
                `blood_products_ml` INT NOT NULL DEFAULT 0,
                `intraop_vitals_json` LONGTEXT NULL,
                `aldrete_activity` TINYINT UNSIGNED NOT NULL DEFAULT 2,
                `aldrete_respiration` TINYINT UNSIGNED NOT NULL DEFAULT 2,
                `aldrete_circulation` TINYINT UNSIGNED NOT NULL DEFAULT 2,
                `aldrete_consciousness` TINYINT UNSIGNED NOT NULL DEFAULT 2,
                `aldrete_oxygenation` TINYINT UNSIGNED NOT NULL DEFAULT 2,
                `aldrete_total_score` TINYINT UNSIGNED NOT NULL DEFAULT 10,
                `pacu_discharge_ready` TINYINT(1) NOT NULL DEFAULT 1,
                `pacu_handoff_notes` TEXT NULL,
                `anesthesia_start_time` DATETIME NULL,
                `induction_time` DATETIME NULL,
                `emergence_time` DATETIME NULL,
                `anesthesia_end_time` DATETIME NULL,
                `intraop_complications` TEXT NULL,
                `anesthesiologist_id` INT UNSIGNED NULL,
                `anesthesiologist_name` VARCHAR(150) NOT NULL DEFAULT 'Dr. Elena Rostova (Anesthesiology)',
                `anesthesiologist_signature` VARCHAR(180) NULL,
                `signed_at` DATETIME NULL,
                `record_status` ENUM('Draft / Intra-Op', 'Signed & Finalized') NOT NULL DEFAULT 'Draft / Intra-Op',
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_or_anesthesia_record_number` (`record_number`),
                KEY `idx_or_anesthesia_surgical_case` (`surgical_case_id`),
                KEY `idx_or_anesthesia_patient` (`patient_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    /**
     * Retrieves the Electronic Anesthesia Record for a surgical case (along with surgical case metadata)
     * or returns a list of records if no `surgical_case_id` is passed.
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
            // Fetch surgical case details
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

            // Fetch existing anesthesia record for this surgical case
            $recStmt = $pdo->prepare("
                SELECT *
                FROM or_anesthesia_records
                WHERE surgical_case_id = :case_id
                ORDER BY id DESC
                LIMIT 1
            ");
            $recStmt->execute([':case_id' => $caseId]);
            $row = $recStmt->fetch(PDO::FETCH_ASSOC);

            $record = $row ? OrAnesthesiaRecord::formatRecord($row) : null;

            return [
                'surgical_case' => $surgicalCase,
                'record'        => $record,
                'has_record'    => $record !== null,
                'asa_classes'   => OrAnesthesiaRecord::ASA_CLASSES,
                'mallampati'    => OrAnesthesiaRecord::MALLAMPATI_CLASSES,
                'modalities'    => OrAnesthesiaRecord::ANESTHESIA_TYPES,
            ];
        }

        // Otherwise list all anesthesia records with patient & surgical case info
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
            FROM or_anesthesia_records r
            LEFT JOIN or_surgical_cases c ON c.id = r.surgical_case_id
            LEFT JOIN or_suites s ON s.id = c.or_suite_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['patient_id'])) {
            $sql .= " AND r.patient_id = :patient_id";
            $params[':patient_id'] = (int) $filters['patient_id'];
        }
        if (!empty($filters['record_status'])) {
            $sql .= " AND r.record_status = :record_status";
            $params[':record_status'] = (string) $filters['record_status'];
        }

        $sql .= " ORDER BY r.updated_at DESC, r.id DESC LIMIT 100";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $records = array_map([OrAnesthesiaRecord::class, 'formatRecord'], $rows);

        return [
            'records' => $records,
            'count'   => count($records),
        ];
    }

    /**
     * Creates or updates an Electronic Anesthesia Record for a surgical case
     * and synchronizes key anesthesia fields (`anesthesia_type`, `anesthesiologist`,
     * `estimated_blood_loss_ml`, `pacu_aldrete_score`) back to `or_surgical_cases`.
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
            throw new \InvalidArgumentException('A valid surgical_case_id is required to save an Electronic Anesthesia Record.');
        }

        // Verify surgical case and get patient_id
        $caseStmt = $pdo->prepare("SELECT id, patient_id, case_number, case_priority, anesthesiologist FROM or_surgical_cases WHERE id = :id LIMIT 1");
        $caseStmt->execute([':id' => $surgicalCaseId]);
        $caseRow = $caseStmt->fetch(PDO::FETCH_ASSOC);
        if (!$caseRow) {
            throw new \RuntimeException("Surgical case #{$surgicalCaseId} not found.");
        }

        $patientId = !empty($payload['patient_id'])
            ? (int) $payload['patient_id']
            : (!empty($caseRow['patient_id']) ? (int) $caseRow['patient_id'] : null);

        // Validate enums
        $validAsa = array_keys(OrAnesthesiaRecord::ASA_CLASSES);
        $asaStatus = (string) ($payload['asa_status'] ?? 'ASA II');
        if (!in_array($asaStatus, $validAsa, true)) {
            $asaStatus = 'ASA II';
        }

        $asaEmergency = !empty($payload['asa_emergency_modifier']) ? 1 : 0;

        $validMallampati = array_keys(OrAnesthesiaRecord::MALLAMPATI_CLASSES);
        $mallampati = (string) ($payload['mallampati_class'] ?? 'Class I');
        if (!in_array($mallampati, $validMallampati, true)) {
            $mallampati = 'Class I';
        }

        $validModalities = OrAnesthesiaRecord::ANESTHESIA_TYPES;
        $anesthesiaType = (string) ($payload['anesthesia_type'] ?? 'General');
        if (!in_array($anesthesiaType, $validModalities, true)) {
            $anesthesiaType = 'General';
        }

        $validCormack = ['Grade I', 'Grade IIa', 'Grade IIb', 'Grade III', 'Grade IV', 'N/A (Neuraxial/MAC)'];
        $cormackGrade = (string) ($payload['cormack_lehane_grade'] ?? 'Grade I');
        if (!in_array($cormackGrade, $validCormack, true)) {
            $cormackGrade = 'Grade I';
        }

        // Compute PACU Aldrete Score (0-10)
        $aldrete = OrAnesthesiaRecord::computeAldreteScore($payload);

        $medsJson = null;
        if (isset($payload['intraop_medications'])) {
            $medsJson = is_string($payload['intraop_medications'])
                ? $payload['intraop_medications']
                : json_encode($payload['intraop_medications'], JSON_UNESCAPED_UNICODE);
        } elseif (isset($payload['intraop_medications_json'])) {
            $medsJson = (string) $payload['intraop_medications_json'];
        }

        $vitalsJson = null;
        if (isset($payload['intraop_vitals'])) {
            $vitalsJson = is_string($payload['intraop_vitals'])
                ? $payload['intraop_vitals']
                : json_encode($payload['intraop_vitals'], JSON_UNESCAPED_UNICODE);
        } elseif (isset($payload['intraop_vitals_json'])) {
            $vitalsJson = (string) $payload['intraop_vitals_json'];
        }

        $recordStatus = (string) ($payload['record_status'] ?? 'Draft / Intra-Op');
        if (!in_array($recordStatus, ['Draft / Intra-Op', 'Signed & Finalized'], true)) {
            $recordStatus = 'Draft / Intra-Op';
        }

        $anesthesiologistName = trim((string) ($payload['anesthesiologist_name'] ?? $caseRow['anesthesiologist'] ?? 'Dr. Elena Rostova (Anesthesiology)'));
        if ($anesthesiologistName === '') {
            $anesthesiologistName = 'Dr. Elena Rostova (Anesthesiology)';
        }

        $signedAt = null;
        $signature = !empty($payload['anesthesiologist_signature']) ? trim((string) $payload['anesthesiologist_signature']) : null;
        if ($recordStatus === 'Signed & Finalized') {
            $signedAt = date('Y-m-d H:i:s');
            if (!$signature) {
                $signature = 'Digitally Signed by ' . $anesthesiologistName . ' on ' . $signedAt;
            }
        }

        $normalizeDateTime = static function ($val): ?string {
            if (empty($val)) {
                return null;
            }
            $str = trim((string) $val);
            if ($str === '') {
                return null;
            }
            $ts = strtotime($str);
            return $ts !== false ? date('Y-m-d H:i:s', $ts) : null;
        };

        $anesthesiaStart = $normalizeDateTime($payload['anesthesia_start_time'] ?? null);
        $inductionTime   = $normalizeDateTime($payload['induction_time'] ?? null);
        $emergenceTime   = $normalizeDateTime($payload['emergence_time'] ?? null);
        $anesthesiaEnd   = $normalizeDateTime($payload['anesthesia_end_time'] ?? null);

        $ebl          = max(0, (int) ($payload['estimated_blood_loss_ml'] ?? 0));
        $urine        = max(0, (int) ($payload['urine_output_ml'] ?? 0));
        $crystalloids = max(0, (int) ($payload['crystalloids_ml'] ?? 0));
        $colloids     = max(0, (int) ($payload['colloids_ml'] ?? 0));
        $bloodProd    = max(0, (int) ($payload['blood_products_ml'] ?? 0));

        // Check if record already exists for this surgical_case_id
        $existStmt = $pdo->prepare("SELECT id, record_number, signed_at, anesthesiologist_signature FROM or_anesthesia_records WHERE surgical_case_id = :case_id ORDER BY id DESC LIMIT 1");
        $existStmt->execute([':case_id' => $surgicalCaseId]);
        $existing = $existStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $recordId = (int) $existing['id'];
            if ($recordStatus === 'Signed & Finalized' && !empty($existing['signed_at'])) {
                $signedAt = (string) $existing['signed_at'];
            }

            $upd = $pdo->prepare("
                UPDATE or_anesthesia_records
                SET
                    patient_id                   = :patient_id,
                    asa_status                   = :asa_status,
                    asa_emergency_modifier       = :asa_emergency_modifier,
                    mallampati_class             = :mallampati_class,
                    thyromental_distance         = :thyromental_distance,
                    neck_mobility                = :neck_mobility,
                    dentition_status             = :dentition_status,
                    npo_status_hours             = :npo_status_hours,
                    difficult_airway_anticipated = :difficult_airway_anticipated,
                    preop_airway_notes           = :preop_airway_notes,
                    anesthesia_type              = :anesthesia_type,
                    airway_device                = :airway_device,
                    ett_size_mm                  = :ett_size_mm,
                    ett_depth_cm                 = :ett_depth_cm,
                    laryngoscopy_type            = :laryngoscopy_type,
                    cormack_lehane_grade         = :cormack_lehane_grade,
                    intubation_attempts          = :intubation_attempts,
                    ventilator_mode              = :ventilator_mode,
                    induction_drugs              = :induction_drugs,
                    maintenance_agents           = :maintenance_agents,
                    regional_neuraxial_details   = :regional_neuraxial_details,
                    reversal_emergence_drugs     = :reversal_emergence_drugs,
                    intraop_medications_json     = :intraop_medications_json,
                    estimated_blood_loss_ml      = :estimated_blood_loss_ml,
                    urine_output_ml              = :urine_output_ml,
                    crystalloids_ml              = :crystalloids_ml,
                    colloids_ml                  = :colloids_ml,
                    blood_products_ml            = :blood_products_ml,
                    intraop_vitals_json          = :intraop_vitals_json,
                    aldrete_activity             = :aldrete_activity,
                    aldrete_respiration          = :aldrete_respiration,
                    aldrete_circulation          = :aldrete_circulation,
                    aldrete_consciousness        = :aldrete_consciousness,
                    aldrete_oxygenation          = :aldrete_oxygenation,
                    aldrete_total_score          = :aldrete_total_score,
                    pacu_discharge_ready         = :pacu_discharge_ready,
                    pacu_handoff_notes           = :pacu_handoff_notes,
                    anesthesia_start_time        = :anesthesia_start_time,
                    induction_time               = :induction_time,
                    emergence_time               = :emergence_time,
                    anesthesia_end_time          = :anesthesia_end_time,
                    intraop_complications        = :intraop_complications,
                    anesthesiologist_id          = :anesthesiologist_id,
                    anesthesiologist_name        = :anesthesiologist_name,
                    anesthesiologist_signature   = :anesthesiologist_signature,
                    signed_at                    = :signed_at,
                    record_status                = :record_status
                WHERE id = :id
            ");
            $upd->execute([
                ':patient_id'                   => $patientId,
                ':asa_status'                   => $asaStatus,
                ':asa_emergency_modifier'       => $asaEmergency,
                ':mallampati_class'             => $mallampati,
                ':thyromental_distance'         => trim((string) ($payload['thyromental_distance'] ?? '>= 6.5 cm (Normal)')),
                ':neck_mobility'                => trim((string) ($payload['neck_mobility'] ?? 'Full Range of Motion')),
                ':dentition_status'             => trim((string) ($payload['dentition_status'] ?? 'Intact / Normal')),
                ':npo_status_hours'             => isset($payload['npo_status_hours']) && $payload['npo_status_hours'] !== '' ? (float) $payload['npo_status_hours'] : 8.0,
                ':difficult_airway_anticipated' => !empty($payload['difficult_airway_anticipated']) ? 1 : 0,
                ':preop_airway_notes'           => $payload['preop_airway_notes'] ?? null,
                ':anesthesia_type'              => $anesthesiaType,
                ':airway_device'                => trim((string) ($payload['airway_device'] ?? 'ETT Cuffed')),
                ':ett_size_mm'                  => $payload['ett_size_mm'] ?? '7.5',
                ':ett_depth_cm'                 => $payload['ett_depth_cm'] ?? '21',
                ':laryngoscopy_type'            => $payload['laryngoscopy_type'] ?? 'Video Laryngoscope (GlideScope/C-MAC)',
                ':cormack_lehane_grade'         => $cormackGrade,
                ':intubation_attempts'          => max(0, (int) ($payload['intubation_attempts'] ?? 1)),
                ':ventilator_mode'              => $payload['ventilator_mode'] ?? 'VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)',
                ':induction_drugs'              => $payload['induction_drugs'] ?? null,
                ':maintenance_agents'           => $payload['maintenance_agents'] ?? null,
                ':regional_neuraxial_details'   => $payload['regional_neuraxial_details'] ?? null,
                ':reversal_emergence_drugs'     => $payload['reversal_emergence_drugs'] ?? null,
                ':intraop_medications_json'     => $medsJson,
                ':estimated_blood_loss_ml'      => $ebl,
                ':urine_output_ml'              => $urine,
                ':crystalloids_ml'              => $crystalloids,
                ':colloids_ml'                  => $colloids,
                ':blood_products_ml'            => $bloodProd,
                ':intraop_vitals_json'          => $vitalsJson,
                ':aldrete_activity'             => $aldrete['aldrete_activity'],
                ':aldrete_respiration'          => $aldrete['aldrete_respiration'],
                ':aldrete_circulation'          => $aldrete['aldrete_circulation'],
                ':aldrete_consciousness'        => $aldrete['aldrete_consciousness'],
                ':aldrete_oxygenation'          => $aldrete['aldrete_oxygenation'],
                ':aldrete_total_score'          => $aldrete['aldrete_total_score'],
                ':pacu_discharge_ready'         => $aldrete['pacu_discharge_ready'],
                ':pacu_handoff_notes'           => $payload['pacu_handoff_notes'] ?? null,
                ':anesthesia_start_time'        => $anesthesiaStart,
                ':induction_time'               => $inductionTime,
                ':emergence_time'               => $emergenceTime,
                ':anesthesia_end_time'          => $anesthesiaEnd,
                ':intraop_complications'        => $payload['intraop_complications'] ?? null,
                ':anesthesiologist_id'          => $userId,
                ':anesthesiologist_name'        => $anesthesiologistName,
                ':anesthesiologist_signature'   => $signature,
                ':signed_at'                    => $signedAt,
                ':record_status'                => $recordStatus,
                ':id'                           => $recordId,
            ]);
        } else {
            $recordNumber = sprintf('ANES-%s-%04d', date('Ymd'), random_int(1000, 9999));

            $ins = $pdo->prepare("
                INSERT INTO or_anesthesia_records (
                    record_number,
                    surgical_case_id,
                    patient_id,
                    asa_status,
                    asa_emergency_modifier,
                    mallampati_class,
                    thyromental_distance,
                    neck_mobility,
                    dentition_status,
                    npo_status_hours,
                    difficult_airway_anticipated,
                    preop_airway_notes,
                    anesthesia_type,
                    airway_device,
                    ett_size_mm,
                    ett_depth_cm,
                    laryngoscopy_type,
                    cormack_lehane_grade,
                    intubation_attempts,
                    ventilator_mode,
                    induction_drugs,
                    maintenance_agents,
                    regional_neuraxial_details,
                    reversal_emergence_drugs,
                    intraop_medications_json,
                    estimated_blood_loss_ml,
                    urine_output_ml,
                    crystalloids_ml,
                    colloids_ml,
                    blood_products_ml,
                    intraop_vitals_json,
                    aldrete_activity,
                    aldrete_respiration,
                    aldrete_circulation,
                    aldrete_consciousness,
                    aldrete_oxygenation,
                    aldrete_total_score,
                    pacu_discharge_ready,
                    pacu_handoff_notes,
                    anesthesia_start_time,
                    induction_time,
                    emergence_time,
                    anesthesia_end_time,
                    intraop_complications,
                    anesthesiologist_id,
                    anesthesiologist_name,
                    anesthesiologist_signature,
                    signed_at,
                    record_status
                ) VALUES (
                    :record_number,
                    :surgical_case_id,
                    :patient_id,
                    :asa_status,
                    :asa_emergency_modifier,
                    :mallampati_class,
                    :thyromental_distance,
                    :neck_mobility,
                    :dentition_status,
                    :npo_status_hours,
                    :difficult_airway_anticipated,
                    :preop_airway_notes,
                    :anesthesia_type,
                    :airway_device,
                    :ett_size_mm,
                    :ett_depth_cm,
                    :laryngoscopy_type,
                    :cormack_lehane_grade,
                    :intubation_attempts,
                    :ventilator_mode,
                    :induction_drugs,
                    :maintenance_agents,
                    :regional_neuraxial_details,
                    :reversal_emergence_drugs,
                    :intraop_medications_json,
                    :estimated_blood_loss_ml,
                    :urine_output_ml,
                    :crystalloids_ml,
                    :colloids_ml,
                    :blood_products_ml,
                    :intraop_vitals_json,
                    :aldrete_activity,
                    :aldrete_respiration,
                    :aldrete_circulation,
                    :aldrete_consciousness,
                    :aldrete_oxygenation,
                    :aldrete_total_score,
                    :pacu_discharge_ready,
                    :pacu_handoff_notes,
                    :anesthesia_start_time,
                    :induction_time,
                    :emergence_time,
                    :anesthesia_end_time,
                    :intraop_complications,
                    :anesthesiologist_id,
                    :anesthesiologist_name,
                    :anesthesiologist_signature,
                    :signed_at,
                    :record_status
                )
            ");
            $ins->execute([
                ':record_number'                => $recordNumber,
                ':surgical_case_id'             => $surgicalCaseId,
                ':patient_id'                   => $patientId,
                ':asa_status'                   => $asaStatus,
                ':asa_emergency_modifier'       => $asaEmergency,
                ':mallampati_class'             => $mallampati,
                ':thyromental_distance'         => trim((string) ($payload['thyromental_distance'] ?? '>= 6.5 cm (Normal)')),
                ':neck_mobility'                => trim((string) ($payload['neck_mobility'] ?? 'Full Range of Motion')),
                ':dentition_status'             => trim((string) ($payload['dentition_status'] ?? 'Intact / Normal')),
                ':npo_status_hours'             => isset($payload['npo_status_hours']) && $payload['npo_status_hours'] !== '' ? (float) $payload['npo_status_hours'] : 8.0,
                ':difficult_airway_anticipated' => !empty($payload['difficult_airway_anticipated']) ? 1 : 0,
                ':preop_airway_notes'           => $payload['preop_airway_notes'] ?? null,
                ':anesthesia_type'              => $anesthesiaType,
                ':airway_device'                => trim((string) ($payload['airway_device'] ?? 'ETT Cuffed')),
                ':ett_size_mm'                  => $payload['ett_size_mm'] ?? '7.5',
                ':ett_depth_cm'                 => $payload['ett_depth_cm'] ?? '21',
                ':laryngoscopy_type'            => $payload['laryngoscopy_type'] ?? 'Video Laryngoscope (GlideScope/C-MAC)',
                ':cormack_lehane_grade'         => $cormackGrade,
                ':intubation_attempts'          => max(0, (int) ($payload['intubation_attempts'] ?? 1)),
                ':ventilator_mode'              => $payload['ventilator_mode'] ?? 'VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)',
                ':induction_drugs'              => $payload['induction_drugs'] ?? null,
                ':maintenance_agents'           => $payload['maintenance_agents'] ?? null,
                ':regional_neuraxial_details'   => $payload['regional_neuraxial_details'] ?? null,
                ':reversal_emergence_drugs'     => $payload['reversal_emergence_drugs'] ?? null,
                ':intraop_medications_json'     => $medsJson,
                ':estimated_blood_loss_ml'      => $ebl,
                ':urine_output_ml'              => $urine,
                ':crystalloids_ml'              => $crystalloids,
                ':colloids_ml'                  => $colloids,
                ':blood_products_ml'            => $bloodProd,
                ':intraop_vitals_json'          => $vitalsJson,
                ':aldrete_activity'             => $aldrete['aldrete_activity'],
                ':aldrete_respiration'          => $aldrete['aldrete_respiration'],
                ':aldrete_circulation'          => $aldrete['aldrete_circulation'],
                ':aldrete_consciousness'        => $aldrete['aldrete_consciousness'],
                ':aldrete_oxygenation'          => $aldrete['aldrete_oxygenation'],
                ':aldrete_total_score'          => $aldrete['aldrete_total_score'],
                ':pacu_discharge_ready'         => $aldrete['pacu_discharge_ready'],
                ':pacu_handoff_notes'           => $payload['pacu_handoff_notes'] ?? null,
                ':anesthesia_start_time'        => $anesthesiaStart,
                ':induction_time'               => $inductionTime,
                ':emergence_time'               => $emergenceTime,
                ':anesthesia_end_time'          => $anesthesiaEnd,
                ':intraop_complications'        => $payload['intraop_complications'] ?? null,
                ':anesthesiologist_id'          => $userId,
                ':anesthesiologist_name'        => $anesthesiologistName,
                ':anesthesiologist_signature'   => $signature,
                ':signed_at'                    => $signedAt,
                ':record_status'                => $recordStatus,
            ]);
            $recordId = (int) $pdo->lastInsertId();
        }

        // Synchronize key metrics back to `or_surgical_cases` so the OR Board & PACU view stay updated
        try {
            $caseAnesthesiaType = match ($anesthesiaType) {
                'General' => 'General',
                'Spinal'  => 'Spinal',
                'Epidural', 'Combined Spinal-Epidural (CSE)' => 'Epidural',
                'Regional Nerve Block' => 'Regional Block',
                'MAC' => 'MAC / Sedation',
                'Local' => 'Local',
                default => 'General',
            };

            $syncStmt = $pdo->prepare("
                UPDATE or_surgical_cases
                SET
                    anesthesia_type         = :anesthesia_type,
                    anesthesiologist        = :anesthesiologist,
                    estimated_blood_loss_ml = :ebl,
                    pacu_aldrete_score      = :aldrete
                WHERE id = :case_id
            ");
            $syncStmt->execute([
                ':anesthesia_type'  => $caseAnesthesiaType,
                ':anesthesiologist' => $anesthesiologistName,
                ':ebl'              => $ebl,
                ':aldrete'          => $aldrete['aldrete_total_score'],
                ':case_id'          => $surgicalCaseId,
            ]);
        } catch (\Throwable $e) {
            // Non-fatal if any optional column differs
        }

        $savedStmt = $pdo->prepare("SELECT * FROM or_anesthesia_records WHERE id = :id LIMIT 1");
        $savedStmt->execute([':id' => $recordId]);
        $savedRow = $savedStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return OrAnesthesiaRecord::formatRecord($savedRow);
    }

    /**
     * Digitally signs and finalizes an Electronic Anesthesia Record.
     *
     * @param int $recordId
     * @param string $signature
     * @param int|null $userId
     * @return array<string, mixed>
     */
    public function finalizeRecord(int $recordId, string $signature = '', ?int $userId = null): array
    {
        $pdo = Database::connection();
        self::ensureTableExists($pdo);

        $stmt = $pdo->prepare("SELECT * FROM or_anesthesia_records WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $recordId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \RuntimeException("Anesthesia Record #{$recordId} not found.");
        }

        $signedAt = date('Y-m-d H:i:s');
        $anesthesiologist = (string) ($row['anesthesiologist_name'] ?? 'Attending Anesthesiologist');
        $finalSig = trim($signature) !== ''
            ? trim($signature)
            : "Digitally Signed by {$anesthesiologist} ({$signedAt})";

        $upd = $pdo->prepare("
            UPDATE or_anesthesia_records
            SET
                record_status              = 'Signed & Finalized',
                anesthesiologist_signature = :sig,
                signed_at                  = :signed_at,
                anesthesiologist_id        = COALESCE(:user_id, anesthesiologist_id)
            WHERE id = :id
        ");
        $upd->execute([
            ':sig'       => $finalSig,
            ':signed_at' => $signedAt,
            ':user_id'   => $userId,
            ':id'        => $recordId,
        ]);

        $stmt->execute([':id' => $recordId]);
        $updated = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        return OrAnesthesiaRecord::formatRecord($updated);
    }
}
