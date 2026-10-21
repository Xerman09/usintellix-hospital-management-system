<?php

namespace App\Modules\Er\Services;

use App\Core\Database;
use PDO;
use Exception;

class ErTraumaService
{
    public const ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse'];

    public const ACTIVATION_LEVELS = [
        'Level 1 - Full Trauma Team Activation',
        'Level 2 - Modified Trauma Activation',
        'Level 3 - Trauma Consult / Fast-Track'
    ];

    public const MECHANISMS_OF_INJURY = [
        'High-Velocity MVC (Motor Vehicle Collision)',
        'Motorcycle / Bicycle Collision',
        'Pedestrian Struck by Vehicle',
        'Fall from Height (>20 ft / >6 m)',
        'Ground-Level Fall with Head Trauma',
        'Penetrating Trauma — Gunshot Wound (GSW)',
        'Penetrating Trauma — Stab / Impale Wound',
        'Blunt Assault / Crush Injury',
        'Blast / Thermal / Electrical Burn Trauma',
        'Industrial / Machinery Trauma',
        'Other High-Energy Trauma'
    ];

    public const FAST_RESULTS = [
        'Negative',
        'Positive Free Fluid',
        'Indeterminate',
        'Not Performed'
    ];

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void
    {
        $sql = "
        CREATE TABLE IF NOT EXISTS `er_trauma_records` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `trauma_record_no` VARCHAR(40) NOT NULL,
            `visit_id` INT UNSIGNED NOT NULL,
            `patient_id` INT UNSIGNED NULL DEFAULT NULL,
            `resuscitation_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `trauma_activation_level` ENUM(
                'Level 1 - Full Trauma Team Activation',
                'Level 2 - Modified Trauma Activation',
                'Level 3 - Trauma Consult / Fast-Track'
            ) NOT NULL DEFAULT 'Level 1 - Full Trauma Team Activation',
            `mechanism_of_injury` VARCHAR(120) NOT NULL,
            `injury_details` TEXT NULL DEFAULT NULL,
            `injury_timestamp` DATETIME NULL DEFAULT NULL,
            `gcs_eye` TINYINT UNSIGNED NOT NULL DEFAULT 4,
            `gcs_verbal` TINYINT UNSIGNED NOT NULL DEFAULT 5,
            `gcs_motor` TINYINT UNSIGNED NOT NULL DEFAULT 6,
            `gcs_total` TINYINT UNSIGNED NOT NULL DEFAULT 15,
            `gcs_intubated_flag` TINYINT(1) NOT NULL DEFAULT 0,
            `gcs_severity_label` VARCHAR(60) NOT NULL DEFAULT 'Mild / Alert (GCS 13-15)',
            `atls_airway_status` VARCHAR(120) NOT NULL DEFAULT 'Patent & Self-Maintaining',
            `atls_cspine_immobilized` TINYINT(1) NOT NULL DEFAULT 1,
            `atls_airway_notes` TEXT NULL DEFAULT NULL,
            `atls_breathing_status` VARCHAR(120) NOT NULL DEFAULT 'Bilateral Equal Breath Sounds',
            `atls_breathing_notes` TEXT NULL DEFAULT NULL,
            `atls_circulation_status` VARCHAR(120) NOT NULL DEFAULT 'Hemodynamically Stable',
            `atls_circulation_notes` TEXT NULL DEFAULT NULL,
            `atls_disability_pupils` VARCHAR(120) NOT NULL DEFAULT 'PERRLA (Equal, Round, Reactive)',
            `atls_disability_notes` TEXT NULL DEFAULT NULL,
            `atls_exposure_notes` TEXT NULL DEFAULT NULL,
            `atls_checklist_json` TEXT NULL DEFAULT NULL,
            `fast_exam_result` ENUM(
                'Negative',
                'Positive Free Fluid',
                'Indeterminate',
                'Not Performed'
            ) NOT NULL DEFAULT 'Negative',
            `fast_ruq_morison` VARCHAR(40) NOT NULL DEFAULT 'Negative',
            `fast_luq_splenorenal` VARCHAR(40) NOT NULL DEFAULT 'Negative',
            `fast_pelvis_pouch` VARCHAR(40) NOT NULL DEFAULT 'Negative',
            `fast_pericardial` VARCHAR(40) NOT NULL DEFAULT 'Negative',
            `efast_thorax_pneumo` VARCHAR(40) NOT NULL DEFAULT 'Negative',
            `fast_notes` TEXT NULL DEFAULT NULL,
            `bp_systolic` INT NULL DEFAULT NULL,
            `bp_diastolic` INT NULL DEFAULT NULL,
            `heart_rate` INT NULL DEFAULT NULL,
            `resp_rate` INT NULL DEFAULT NULL,
            `spo2` INT NULL DEFAULT NULL,
            `shock_index` DECIMAL(4,2) NULL DEFAULT NULL,
            `resuscitation_summary` TEXT NULL DEFAULT NULL,
            `trauma_disposition_plan` VARCHAR(120) NULL DEFAULT NULL,
            `trauma_team_leader_id` INT UNSIGNED NULL DEFAULT NULL,
            `trauma_team_leader_name` VARCHAR(120) NOT NULL,
            `recorded_by_id` INT UNSIGNED NULL DEFAULT NULL,
            `recorded_by_name` VARCHAR(120) NULL DEFAULT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uq_er_trauma_record_no` (`trauma_record_no`),
            KEY `idx_etr_visit_id` (`visit_id`),
            KEY `idx_etr_patient_id` (`patient_id`),
            KEY `idx_etr_timestamp` (`resuscitation_timestamp`),
            KEY `idx_etr_fast_result` (`fast_exam_result`),
            KEY `idx_etr_gcs_total` (`gcs_total`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $this->db->exec($sql);
    }

    /**
     * Get all trauma & resuscitation fast-sheet records for an ER visit
     */
    public function listByVisit(int $visitId): array
    {
        $stmt = $this->db->prepare("
            SELECT *
            FROM `er_trauma_records`
            WHERE `visit_id` = :visit_id
            ORDER BY `resuscitation_timestamp` DESC, `id` DESC
        ");
        $stmt->execute([':visit_id' => $visitId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['visit_id'] = (int)$r['visit_id'];
            $r['gcs_eye'] = (int)$r['gcs_eye'];
            $r['gcs_verbal'] = (int)$r['gcs_verbal'];
            $r['gcs_motor'] = (int)$r['gcs_motor'];
            $r['gcs_total'] = (int)$r['gcs_total'];
            $r['gcs_intubated_flag'] = (bool)$r['gcs_intubated_flag'];
            $r['atls_cspine_immobilized'] = (bool)$r['atls_cspine_immobilized'];
            $r['atls_checklist'] = !empty($r['atls_checklist_json'])
                ? json_decode($r['atls_checklist_json'], true)
                : [];
        }
        unset($r);

        return [
            'records' => $rows,
            'latest' => $rows[0] ?? null,
            'count' => count($rows),
            'options' => [
                'activation_levels' => self::ACTIVATION_LEVELS,
                'mechanisms_of_injury' => self::MECHANISMS_OF_INJURY,
                'fast_results' => self::FAST_RESULTS
            ]
        ];
    }

    /**
     * Summary badge metadata for ER board visits
     */
    public function summaryForVisit(int $visitId): ?array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT id, trauma_record_no, trauma_activation_level, mechanism_of_injury,
                       gcs_eye, gcs_verbal, gcs_motor, gcs_total, gcs_intubated_flag, gcs_severity_label,
                       fast_exam_result, shock_index, resuscitation_timestamp
                FROM `er_trauma_records`
                WHERE `visit_id` = :visit_id
                ORDER BY `resuscitation_timestamp` DESC, `id` DESC
                LIMIT 1
            ");
            $stmt->execute([':visit_id' => $visitId]);
            $latest = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$latest) {
                return null;
            }
            $cntStmt = $this->db->prepare("SELECT COUNT(*) FROM `er_trauma_records` WHERE `visit_id` = :visit_id");
            $cntStmt->execute([':visit_id' => $visitId]);
            $count = (int)$cntStmt->fetchColumn();

            return [
                'count' => $count,
                'latest_id' => (int)$latest['id'],
                'trauma_record_no' => $latest['trauma_record_no'],
                'trauma_activation_level' => $latest['trauma_activation_level'],
                'mechanism_of_injury' => $latest['mechanism_of_injury'],
                'gcs_eye' => (int)$latest['gcs_eye'],
                'gcs_verbal' => (int)$latest['gcs_verbal'],
                'gcs_motor' => (int)$latest['gcs_motor'],
                'gcs_total' => (int)$latest['gcs_total'],
                'gcs_intubated_flag' => (bool)$latest['gcs_intubated_flag'],
                'gcs_severity_label' => $latest['gcs_severity_label'],
                'fast_exam_result' => $latest['fast_exam_result'],
                'shock_index' => $latest['shock_index'] !== null ? (float)$latest['shock_index'] : null,
                'resuscitation_timestamp' => $latest['resuscitation_timestamp']
            ];
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Create or update a Trauma & Resuscitation Fast-Sheet record
     */
    public function save(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ROLES, true)) {
            return ['success' => false, 'message' => 'You do not have permission to document ER trauma records.', 'forbidden' => true];
        }

        $visitId = (int)($data['visit_id'] ?? 0);
        if ($visitId <= 0) {
            return ['success' => false, 'message' => 'Valid ER visit_id is required.'];
        }

        // Verify visit exists and get patient_id
        $vStmt = $this->db->prepare("SELECT id, patient_id FROM `er_visits` WHERE `id` = :id LIMIT 1");
        $vStmt->execute([':id' => $visitId]);
        $visit = $vStmt->fetch(PDO::FETCH_ASSOC);
        if (!$visit) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }

        $moi = trim((string)($data['mechanism_of_injury'] ?? ''));
        if ($moi === '') {
            return ['success' => false, 'message' => 'Mechanism of Injury (MOI) is required.', 'errors' => ['mechanism_of_injury' => 'Required']];
        }

        $leaderName = trim((string)($data['trauma_team_leader_name'] ?? ''));
        if ($leaderName === '') {
            return ['success' => false, 'message' => 'Trauma Team Leader / Attending Physician name is required.', 'errors' => ['trauma_team_leader_name' => 'Required']];
        }

        // 1. Glasgow Coma Scale (GCS) Calculation & Validation
        $gcsEye = max(1, min(4, (int)($data['gcs_eye'] ?? 4)));
        $gcsVerbal = max(1, min(5, (int)($data['gcs_verbal'] ?? 5)));
        $gcsMotor = max(1, min(6, (int)($data['gcs_motor'] ?? 6)));
        $gcsTotal = $gcsEye + $gcsVerbal + $gcsMotor; // 3 to 15
        $intubatedFlag = !empty($data['gcs_intubated_flag']) ? 1 : 0;

        if ($gcsTotal <= 8) {
            $gcsSeverity = 'Severe TBI / Coma (GCS ≤ 8 — Intubate!)';
        } elseif ($gcsTotal <= 12) {
            $gcsSeverity = 'Moderate Brain Injury (GCS 9-12)';
        } else {
            $gcsSeverity = 'Mild / Alert (GCS 13-15)';
        }

        // 2. ATLS Primary Survey Checklist
        $airwayStatus = trim((string)($data['atls_airway_status'] ?? 'Patent & Self-Maintaining'));
        $cspineImmobilized = isset($data['atls_cspine_immobilized']) ? ((int)(bool)$data['atls_cspine_immobilized']) : 1;
        $airwayNotes = trim((string)($data['atls_airway_notes'] ?? ''));

        $breathingStatus = trim((string)($data['atls_breathing_status'] ?? 'Bilateral Equal Breath Sounds'));
        $breathingNotes = trim((string)($data['atls_breathing_notes'] ?? ''));

        $circulationStatus = trim((string)($data['atls_circulation_status'] ?? 'Hemodynamically Stable'));
        $circulationNotes = trim((string)($data['atls_circulation_notes'] ?? ''));

        $disabilityPupils = trim((string)($data['atls_disability_pupils'] ?? 'PERRLA (Equal, Round, Reactive)'));
        $disabilityNotes = trim((string)($data['atls_disability_notes'] ?? ''));

        $exposureNotes = trim((string)($data['atls_exposure_notes'] ?? ''));

        $atlsChecklistJson = null;
        if (!empty($data['atls_checklist'])) {
            $atlsChecklistJson = is_string($data['atls_checklist'])
                ? $data['atls_checklist']
                : json_encode(array_values((array)$data['atls_checklist']));
        }

        // 3. FAST / eFAST Bedside Ultrasound Result
        $fastResult = trim((string)($data['fast_exam_result'] ?? 'Negative'));
        if (!in_array($fastResult, self::FAST_RESULTS, true)) {
            $fastResult = 'Negative';
        }
        $fastRuq = trim((string)($data['fast_ruq_morison'] ?? 'Negative'));
        $fastLuq = trim((string)($data['fast_luq_splenorenal'] ?? 'Negative'));
        $fastPelvis = trim((string)($data['fast_pelvis_pouch'] ?? 'Negative'));
        $fastPericardial = trim((string)($data['fast_pericardial'] ?? 'Negative'));
        $efastThorax = trim((string)($data['efast_thorax_pneumo'] ?? 'Negative'));
        $fastNotes = trim((string)($data['fast_notes'] ?? ''));

        // Auto-upgrade overall FAST result to Positive Free Fluid if any window is Positive
        if (in_array('Positive Free Fluid', [$fastRuq, $fastLuq, $fastPelvis, $fastPericardial], true)) {
            $fastResult = 'Positive Free Fluid';
        }

        // Hemodynamics & Shock Index (HR / SBP)
        $sbp = !empty($data['bp_systolic']) ? (int)$data['bp_systolic'] : null;
        $dbp = !empty($data['bp_diastolic']) ? (int)$data['bp_diastolic'] : null;
        $hr = !empty($data['heart_rate']) ? (int)$data['heart_rate'] : null;
        $rr = !empty($data['resp_rate']) ? (int)$data['resp_rate'] : null;
        $spo2 = !empty($data['spo2']) ? (int)$data['spo2'] : null;
        $shockIndex = ($hr !== null && $sbp !== null && $sbp > 0) ? round($hr / $sbp, 2) : null;

        $activationLevel = trim((string)($data['trauma_activation_level'] ?? 'Level 1 - Full Trauma Team Activation'));
        if (!in_array($activationLevel, self::ACTIVATION_LEVELS, true)) {
            $activationLevel = 'Level 1 - Full Trauma Team Activation';
        }

        $resusTimestamp = !empty($data['resuscitation_timestamp'])
            ? str_replace('T', ' ', substr((string)$data['resuscitation_timestamp'], 0, 19))
            : date('Y-m-d H:i:s');
        if (strlen($resusTimestamp) === 16) {
            $resusTimestamp .= ':00';
        }

        $injuryTimestamp = !empty($data['injury_timestamp'])
            ? str_replace('T', ' ', substr((string)$data['injury_timestamp'], 0, 19))
            : null;
        if ($injuryTimestamp && strlen($injuryTimestamp) === 16) {
            $injuryTimestamp .= ':00';
        }

        $actorId = !empty($actor['id']) ? (int)$actor['id'] : null;
        $actorName = trim((string)($data['recorded_by_name'] ?? $actor['full_name'] ?? $actor['name'] ?? $actor['username'] ?? 'ER Clinician'));

        $recordId = !empty($data['id']) ? (int)$data['id'] : 0;

        if ($recordId > 0) {
            $stmt = $this->db->prepare("
                UPDATE `er_trauma_records`
                SET `resuscitation_timestamp` = :resus_ts,
                    `trauma_activation_level` = :act_lvl,
                    `mechanism_of_injury` = :moi,
                    `injury_details` = :inj_details,
                    `injury_timestamp` = :inj_ts,
                    `gcs_eye` = :gcs_e,
                    `gcs_verbal` = :gcs_v,
                    `gcs_motor` = :gcs_m,
                    `gcs_total` = :gcs_tot,
                    `gcs_intubated_flag` = :gcs_intub,
                    `gcs_severity_label` = :gcs_sev,
                    `atls_airway_status` = :a_status,
                    `atls_cspine_immobilized` = :a_cspine,
                    `atls_airway_notes` = :a_notes,
                    `atls_breathing_status` = :b_status,
                    `atls_breathing_notes` = :b_notes,
                    `atls_circulation_status` = :c_status,
                    `atls_circulation_notes` = :c_notes,
                    `atls_disability_pupils` = :d_pupils,
                    `atls_disability_notes` = :d_notes,
                    `atls_exposure_notes` = :e_notes,
                    `atls_checklist_json` = :chk_json,
                    `fast_exam_result` = :fast_res,
                    `fast_ruq_morison` = :fast_ruq,
                    `fast_luq_splenorenal` = :fast_luq,
                    `fast_pelvis_pouch` = :fast_pelv,
                    `fast_pericardial` = :fast_peri,
                    `efast_thorax_pneumo` = :efast_tho,
                    `fast_notes` = :fast_notes,
                    `bp_systolic` = :sbp,
                    `bp_diastolic` = :dbp,
                    `heart_rate` = :hr,
                    `resp_rate` = :rr,
                    `spo2` = :spo2,
                    `shock_index` = :si,
                    `resuscitation_summary` = :resus_sum,
                    `trauma_disposition_plan` = :dispo_plan,
                    `trauma_team_leader_name` = :leader_name,
                    `recorded_by_name` = :rec_name
                WHERE `id` = :id AND `visit_id` = :visit_id
            ");
            $stmt->execute([
                ':resus_ts' => $resusTimestamp,
                ':act_lvl' => $activationLevel,
                ':moi' => $moi,
                ':inj_details' => trim((string)($data['injury_details'] ?? '')),
                ':inj_ts' => $injuryTimestamp,
                ':gcs_e' => $gcsEye,
                ':gcs_v' => $gcsVerbal,
                ':gcs_m' => $gcsMotor,
                ':gcs_tot' => $gcsTotal,
                ':gcs_intub' => $intubatedFlag,
                ':gcs_sev' => $gcsSeverity,
                ':a_status' => $airwayStatus,
                ':a_cspine' => $cspineImmobilized,
                ':a_notes' => $airwayNotes,
                ':b_status' => $breathingStatus,
                ':b_notes' => $breathingNotes,
                ':c_status' => $circulationStatus,
                ':c_notes' => $circulationNotes,
                ':d_pupils' => $disabilityPupils,
                ':d_notes' => $disabilityNotes,
                ':e_notes' => $exposureNotes,
                ':chk_json' => $atlsChecklistJson,
                ':fast_res' => $fastResult,
                ':fast_ruq' => $fastRuq,
                ':fast_luq' => $fastLuq,
                ':fast_pelv' => $fastPelvis,
                ':fast_peri' => $fastPericardial,
                ':efast_tho' => $efastThorax,
                ':fast_notes' => $fastNotes,
                ':sbp' => $sbp,
                ':dbp' => $dbp,
                ':hr' => $hr,
                ':rr' => $rr,
                ':spo2' => $spo2,
                ':si' => $shockIndex,
                ':resus_sum' => trim((string)($data['resuscitation_summary'] ?? '')),
                ':dispo_plan' => trim((string)($data['trauma_disposition_plan'] ?? '')),
                ':leader_name' => $leaderName,
                ':rec_name' => $actorName,
                ':id' => $recordId,
                ':visit_id' => $visitId
            ]);
            $msg = 'Trauma & Resuscitation Fast-Sheet updated.';
        } else {
            $traumaRecordNo = 'TRM-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
            $stmt = $this->db->prepare("
                INSERT INTO `er_trauma_records` (
                    `trauma_record_no`, `visit_id`, `patient_id`, `resuscitation_timestamp`,
                    `trauma_activation_level`, `mechanism_of_injury`, `injury_details`, `injury_timestamp`,
                    `gcs_eye`, `gcs_verbal`, `gcs_motor`, `gcs_total`, `gcs_intubated_flag`, `gcs_severity_label`,
                    `atls_airway_status`, `atls_cspine_immobilized`, `atls_airway_notes`,
                    `atls_breathing_status`, `atls_breathing_notes`,
                    `atls_circulation_status`, `atls_circulation_notes`,
                    `atls_disability_pupils`, `atls_disability_notes`,
                    `atls_exposure_notes`, `atls_checklist_json`,
                    `fast_exam_result`, `fast_ruq_morison`, `fast_luq_splenorenal`, `fast_pelvis_pouch`, `fast_pericardial`, `efast_thorax_pneumo`, `fast_notes`,
                    `bp_systolic`, `bp_diastolic`, `heart_rate`, `resp_rate`, `spo2`, `shock_index`,
                    `resuscitation_summary`, `trauma_disposition_plan`,
                    `trauma_team_leader_id`, `trauma_team_leader_name`, `recorded_by_id`, `recorded_by_name`
                ) VALUES (
                    :rec_no, :visit_id, :patient_id, :resus_ts,
                    :act_lvl, :moi, :inj_details, :inj_ts,
                    :gcs_e, :gcs_v, :gcs_m, :gcs_tot, :gcs_intub, :gcs_sev,
                    :a_status, :a_cspine, :a_notes,
                    :b_status, :b_notes,
                    :c_status, :c_notes,
                    :d_pupils, :d_notes,
                    :e_notes, :chk_json,
                    :fast_res, :fast_ruq, :fast_luq, :fast_pelv, :fast_peri, :efast_tho, :fast_notes,
                    :sbp, :dbp, :hr, :rr, :spo2, :si,
                    :resus_sum, :dispo_plan,
                    :leader_id, :leader_name, :rec_id, :rec_name
                )
            ");
            $stmt->execute([
                ':rec_no' => $traumaRecordNo,
                ':visit_id' => $visitId,
                ':patient_id' => (int)$visit['patient_id'],
                ':resus_ts' => $resusTimestamp,
                ':act_lvl' => $activationLevel,
                ':moi' => $moi,
                ':inj_details' => trim((string)($data['injury_details'] ?? '')),
                ':inj_ts' => $injuryTimestamp,
                ':gcs_e' => $gcsEye,
                ':gcs_v' => $gcsVerbal,
                ':gcs_m' => $gcsMotor,
                ':gcs_tot' => $gcsTotal,
                ':gcs_intub' => $intubatedFlag,
                ':gcs_sev' => $gcsSeverity,
                ':a_status' => $airwayStatus,
                ':a_cspine' => $cspineImmobilized,
                ':a_notes' => $airwayNotes,
                ':b_status' => $breathingStatus,
                ':b_notes' => $breathingNotes,
                ':c_status' => $circulationStatus,
                ':c_notes' => $circulationNotes,
                ':d_pupils' => $disabilityPupils,
                ':d_notes' => $disabilityNotes,
                ':e_notes' => $exposureNotes,
                ':chk_json' => $atlsChecklistJson,
                ':fast_res' => $fastResult,
                ':fast_ruq' => $fastRuq,
                ':fast_luq' => $fastLuq,
                ':fast_pelv' => $fastPelvis,
                ':fast_peri' => $fastPericardial,
                ':efast_tho' => $efastThorax,
                ':fast_notes' => $fastNotes,
                ':sbp' => $sbp,
                ':dbp' => $dbp,
                ':hr' => $hr,
                ':rr' => $rr,
                ':spo2' => $spo2,
                ':si' => $shockIndex,
                ':resus_sum' => trim((string)($data['resuscitation_summary'] ?? '')),
                ':dispo_plan' => trim((string)($data['trauma_disposition_plan'] ?? '')),
                ':leader_id' => $actorId,
                ':leader_name' => $leaderName,
                ':rec_id' => $actorId,
                ':rec_name' => $actorName
            ]);
            $msg = "Trauma & Resuscitation Fast-Sheet ({$traumaRecordNo}) recorded — GCS {$gcsTotal}/15, FAST: {$fastResult}.";
        }

        // Sync GCS score to latest er_triage record for this visit if one exists
        try {
            $this->db->prepare("
                UPDATE `er_triage`
                SET `gcs` = :gcs
                WHERE `visit_id` = :visit_id
                ORDER BY `triaged_at` DESC, `id` DESC
                LIMIT 1
            ")->execute([':gcs' => $gcsTotal, ':visit_id' => $visitId]);
        } catch (\Throwable $e) {
            // Non-blocking
        }

        return [
            'success' => true,
            'message' => $msg,
            'data' => $this->listByVisit($visitId)
        ];
    }

    /**
     * Delete a trauma record
     */
    public function delete(int $id, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ROLES, true)) {
            return ['success' => false, 'message' => 'Permission denied.', 'forbidden' => true];
        }

        $stmt = $this->db->prepare("SELECT id, visit_id FROM `er_trauma_records` WHERE `id` = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['success' => false, 'message' => 'Trauma record not found.', 'not_found' => true];
        }

        $del = $this->db->prepare("DELETE FROM `er_trauma_records` WHERE `id` = :id");
        $del->execute([':id' => $id]);

        return [
            'success' => true,
            'message' => 'Trauma record removed.',
            'data' => $this->listByVisit((int)$row['visit_id'])
        ];
    }
}
