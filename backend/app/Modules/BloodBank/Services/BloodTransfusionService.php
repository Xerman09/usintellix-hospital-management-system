<?php

namespace App\Modules\BloodBank\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class BloodTransfusionService
{
    /**
     * Atomically generates sequential Transfusion Number: BT-YYYY-XXXXX
     */
    public static function nextTransfusionNumber(PDO $pdo, ?int $year = null): string
    {
        $year = $year ?: (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM blood_transfusion_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO blood_transfusion_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE blood_transfusion_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("BT-%04d-%05d", $year, $seq);
    }

    /**
     * Atomically generates sequential Transfusion Reaction Number: TR-YYYY-XXXXX
     */
    public static function nextReactionNumber(PDO $pdo, ?int $year = null): string
    {
        $year = $year ?: (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM blood_reaction_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO blood_reaction_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE blood_reaction_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("TR-%04d-%05d", $year, $seq);
    }

    /**
     * Dual-Nurse Bedside Pre-Transfusion Verification and Setup
     */
    public function recordBedsideVerification(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $patientId = (int)($data['patient_id'] ?? 0);
        $bloodUnitId = (int)($data['blood_unit_id'] ?? 0);
        $crossmatchId = !empty($data['crossmatch_id']) ? (int)$data['crossmatch_id'] : null;

        if ($patientId <= 0 || $bloodUnitId <= 0) {
            throw new RuntimeException("Patient ID and Blood Unit ID are mandatory.");
        }

        // Checklist checks: Transfusion medicine protocol demands 100% of safety checks confirmed
        $checklistKeys = [
            'verified_patient_identity' => 'Patient 2-identifier wristband identity match',
            'verified_unit_number' => 'Blood Unit DIN barcode match',
            'verified_blood_group' => 'Recipient & Donor ABO/Rh match tag',
            'verified_component_type' => 'Prescribed blood component type match',
            'verified_expiration_date' => 'Blood unit expiration validity',
            'verified_visual_inspection' => 'Visual inspection of unit (no clots/hemolysis/leakage)',
            'verified_patient_consent' => 'Informed transfusion consent documented'
        ];

        foreach ($checklistKeys as $key => $label) {
            if (empty($data[$key])) {
                throw new RuntimeException("Safety Verification Failed: '{$label}' must be verified before transfusion can be initialized.");
            }
        }

        $primaryNurse = trim($data['primary_nurse_name'] ?? '');
        $witnessNurse = trim($data['witness_nurse_name'] ?? '');

        if ($primaryNurse === '' || $witnessNurse === '') {
            throw new RuntimeException("Dual-nurse verification requires both Primary Nurse and Witness Nurse signatures/names.");
        }

        if (strcasecmp($primaryNurse, $witnessNurse) === 0) {
            throw new RuntimeException("Safety Violation: Primary Nurse and Witness Nurse cannot be the same person. Dual verification requires two independent clinicians.");
        }

        $pdo->beginTransaction();
        try {
            // Verify blood unit status
            $unitStmt = $pdo->prepare("SELECT * FROM blood_inventory_units WHERE id = ? FOR UPDATE");
            $unitStmt->execute([$bloodUnitId]);
            $unit = $unitStmt->fetch(PDO::FETCH_ASSOC);

            if (!$unit) {
                throw new RuntimeException("Blood unit not found in inventory.");
            }

            if (in_array($unit['status'], ['transfused', 'quarantined', 'discarded', 'expired'], true)) {
                throw new RuntimeException("Cannot transfuse unit: Unit status is currently '{$unit['status']}'.");
            }

            if (!empty($unit['reserved_for_patient_id']) && (int)$unit['reserved_for_patient_id'] !== $patientId) {
                throw new RuntimeException("Blood unit {$unit['unit_number']} is reserved for a different patient.");
            }

            $txNumber = self::nextTransfusionNumber($pdo);

            $insStmt = $pdo->prepare("
                INSERT INTO blood_transfusions (
                    transfusion_number, patient_id, blood_unit_id, crossmatch_id, order_id,
                    prescribing_physician, clinical_indication, status,
                    verified_patient_identity, verified_unit_number, verified_blood_group,
                    verified_component_type, verified_expiration_date, verified_visual_inspection, verified_patient_consent,
                    primary_nurse_id, primary_nurse_name, primary_nurse_license, primary_nurse_verified_at,
                    witness_nurse_id, witness_nurse_name, witness_nurse_license, witness_nurse_verified_at,
                    iv_access_site, infusion_target_duration_mins, initial_flow_rate_ml_hr,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, 'verified_ready',
                    1, 1, 1,
                    1, 1, 1, 1,
                    ?, ?, ?, NOW(),
                    ?, ?, ?, NOW(),
                    ?, ?, ?,
                    NOW(), NOW()
                )
            ");

            $insStmt->execute([
                $txNumber,
                $patientId,
                $bloodUnitId,
                $crossmatchId,
                !empty($data['order_id']) ? (int)$data['order_id'] : null,
                $data['prescribing_physician'] ?? null,
                $data['clinical_indication'] ?? null,
                $userId,
                $primaryNurse,
                $data['primary_nurse_license'] ?? null,
                !empty($data['witness_nurse_id']) ? (int)$data['witness_nurse_id'] : null,
                $witnessNurse,
                $data['witness_nurse_license'] ?? null,
                $data['iv_access_site'] ?? 'Right Forearm 18G IV',
                !empty($data['infusion_target_duration_mins']) ? (int)$data['infusion_target_duration_mins'] : 120,
                !empty($data['initial_flow_rate_ml_hr']) ? (int)$data['initial_flow_rate_ml_hr'] : 120
            ]);

            $txId = (int)$pdo->lastInsertId();

            // Transition unit status to issued
            $updUnit = $pdo->prepare("UPDATE blood_inventory_units SET status = 'issued', reserved_for_patient_id = ? WHERE id = ?");
            $updUnit->execute([$patientId, $bloodUnitId]);

            // If crossmatch exists, update crossmatch reservation_status to issued
            if ($crossmatchId) {
                $updCross = $pdo->prepare("UPDATE blood_crossmatches SET reservation_status = 'issued', updated_at = NOW() WHERE id = ?");
                $updCross->execute([$crossmatchId]);
            }

            $pdo->commit();
            return $this->getTransfusionDetail($txId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Start Infusion & Record Pre-Transfusion Baseline Vitals
     */
    public function startInfusion(int $transfusionId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM blood_transfusions WHERE id = ? FOR UPDATE");
            $stmt->execute([$transfusionId]);
            $tx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tx) {
                throw new RuntimeException("Transfusion record not found.");
            }

            if ($tx['status'] !== 'verified_ready') {
                throw new RuntimeException("Transfusion cannot be started because status is '{$tx['status']}'.");
            }

            $startedAt = !empty($data['infusion_started_at']) ? $data['infusion_started_at'] : date('Y-m-d H:i:s');

            $upd = $pdo->prepare("
                UPDATE blood_transfusions
                SET status = 'infusing',
                    infusion_started_at = ?,
                    iv_access_site = COALESCE(?, iv_access_site),
                    initial_flow_rate_ml_hr = COALESCE(?, initial_flow_rate_ml_hr),
                    updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([
                $startedAt,
                $data['iv_access_site'] ?? null,
                !empty($data['initial_flow_rate_ml_hr']) ? (int)$data['initial_flow_rate_ml_hr'] : null,
                $transfusionId
            ]);

            // Record baseline vitals if provided
            if (isset($data['temperature_c']) && isset($data['heart_rate_bpm'])) {
                $this->insertVitalRecord($pdo, $transfusionId, [
                    'vital_stage' => 'baseline_pre',
                    'recorded_at' => $startedAt,
                    'temperature_c' => $data['temperature_c'],
                    'heart_rate_bpm' => $data['heart_rate_bpm'],
                    'bp_systolic' => $data['bp_systolic'] ?? 120,
                    'bp_diastolic' => $data['bp_diastolic'] ?? 80,
                    'respiratory_rate_bpm' => $data['respiratory_rate_bpm'] ?? 18,
                    'spo2_percent' => $data['spo2_percent'] ?? 98.0,
                    'patient_symptoms' => $data['patient_symptoms'] ?? 'Pre-transfusion baseline vitals taken. Patient alert and oriented.',
                    'recorded_by_nurse' => $data['recorded_by_nurse'] ?? $tx['primary_nurse_name']
                ]);
            }

            $pdo->commit();
            return $this->getTransfusionDetail($transfusionId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Record Hourly / Routine Vital Sign Check
     */
    public function recordVitals(int $transfusionId, array $data): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM blood_transfusions WHERE id = ?");
            $stmt->execute([$transfusionId]);
            $tx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tx) {
                throw new RuntimeException("Transfusion record not found.");
            }

            if (!in_array($tx['status'], ['infusing', 'verified_ready', 'stopped_reaction', 'completed'], true)) {
                throw new RuntimeException("Cannot log vitals for transfusion with status '{$tx['status']}'.");
            }

            $vitalId = $this->insertVitalRecord($pdo, $transfusionId, $data);

            $pdo->commit();
            return [
                'vital_id' => $vitalId,
                'transfusion' => $this->getTransfusionDetail($transfusionId)
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Complete Transfusion without adverse reaction
     */
    public function completeTransfusion(int $transfusionId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM blood_transfusions WHERE id = ? FOR UPDATE");
            $stmt->execute([$transfusionId]);
            $tx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tx) {
                throw new RuntimeException("Transfusion record not found.");
            }

            if ($tx['status'] !== 'infusing') {
                throw new RuntimeException("Cannot complete transfusion: Status is '{$tx['status']}', expected 'infusing'.");
            }

            $completedAt = !empty($data['infusion_completed_at']) ? $data['infusion_completed_at'] : date('Y-m-d H:i:s');
            $volume = !empty($data['volume_transfused_ml']) ? (int)$data['volume_transfused_ml'] : 350;

            $upd = $pdo->prepare("
                UPDATE blood_transfusions
                SET status = 'completed',
                    infusion_completed_at = ?,
                    volume_transfused_ml = ?,
                    completion_notes = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([
                $completedAt,
                $volume,
                $data['completion_notes'] ?? 'Transfusion completed successfully without adverse incident.',
                $transfusionId
            ]);

            // Update blood unit status to transfused
            $updUnit = $pdo->prepare("UPDATE blood_inventory_units SET status = 'transfused' WHERE id = ?");
            $updUnit->execute([$tx['blood_unit_id']]);

            // If crossmatch exists, update crossmatch to transfused
            if ($tx['crossmatch_id']) {
                $updCross = $pdo->prepare("UPDATE blood_crossmatches SET reservation_status = 'transfused', updated_at = NOW() WHERE id = ?");
                $updCross->execute([$tx['crossmatch_id']]);
            }

            // Post-transfusion vitals if provided
            if (isset($data['temperature_c']) && isset($data['heart_rate_bpm'])) {
                $this->insertVitalRecord($pdo, $transfusionId, [
                    'vital_stage' => 'post_transfusion',
                    'recorded_at' => $completedAt,
                    'temperature_c' => $data['temperature_c'],
                    'heart_rate_bpm' => $data['heart_rate_bpm'],
                    'bp_systolic' => $data['bp_systolic'] ?? 120,
                    'bp_diastolic' => $data['bp_diastolic'] ?? 80,
                    'respiratory_rate_bpm' => $data['respiratory_rate_bpm'] ?? 18,
                    'spo2_percent' => $data['spo2_percent'] ?? 98.0,
                    'patient_symptoms' => $data['patient_symptoms'] ?? 'Post-transfusion completion vitals stable.',
                    'recorded_by_nurse' => $data['recorded_by_nurse'] ?? $tx['primary_nurse_name']
                ]);
            }

            $pdo->commit();
            return $this->getTransfusionDetail($transfusionId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Report Suspected Transfusion Reaction (STAT Emergency Protocol)
     */
    public function reportTransfusionReaction(int $transfusionId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM blood_transfusions WHERE id = ? FOR UPDATE");
            $stmt->execute([$transfusionId]);
            $tx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tx) {
                throw new RuntimeException("Transfusion record not found.");
            }

            // Emergency stop of transfusion
            $updTx = $pdo->prepare("
                UPDATE blood_transfusions
                SET status = 'stopped_reaction',
                    has_transfusion_reaction = 1,
                    infusion_completed_at = COALESCE(infusion_completed_at, NOW()),
                    volume_transfused_ml = ?,
                    completion_notes = CONCAT(COALESCE(completion_notes, ''), ' [STOPPED: Transfusion reaction suspected at bedside]'),
                    updated_at = NOW()
                WHERE id = ?
            ");
            $volTransfused = !empty($data['ml_transfused_at_onset']) ? (int)$data['ml_transfused_at_onset'] : 30;
            $updTx->execute([$volTransfused, $transfusionId]);

            // Quarantine unit in inventory
            $updUnit = $pdo->prepare("
                UPDATE blood_inventory_units
                SET status = 'quarantined',
                    quarantine_reason = 'Transfusion reaction reported (Bag & tubing returned for investigation)',
                    quarantined_at = NOW()
                WHERE id = ?
            ");
            $updUnit->execute([$tx['blood_unit_id']]);

            $reactionNumber = self::nextReactionNumber($pdo);

            $insReaction = $pdo->prepare("
                INSERT INTO blood_transfusion_reactions (
                    reaction_number, transfusion_id, patient_id, blood_unit_id,
                    reported_at, reaction_onset_time, ml_transfused_at_onset,
                    symptom_fever, symptom_chills_rigors, symptom_dyspnea_hypoxia,
                    symptom_tachycardia_hypotension, symptom_hypertension, symptom_urticaria_hives,
                    symptom_facial_edema_stridor, symptom_back_flank_pain, symptom_hemoglobinuria_dark_urine,
                    symptom_nausea_vomiting, symptom_details,
                    action_transfusion_stopped, action_saline_infusion_maintained,
                    action_physician_notified, action_blood_bank_notified,
                    action_unit_and_tubing_returned, action_post_blood_urine_sent,
                    attending_physician_notified, emergency_medications_given,
                    investigation_status, reaction_classification, severity_level,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?,
                    NOW(), ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    1, 1,
                    1, 1,
                    1, 1,
                    ?, ?,
                    'under_investigation', ?, ?,
                    NOW(), NOW()
                )
            ");

            $onsetTime = !empty($data['reaction_onset_time']) ? $data['reaction_onset_time'] : date('Y-m-d H:i:s');
            $suspectedClass = !empty($data['reaction_classification']) ? $data['reaction_classification'] : null;
            $severity = !empty($data['severity_level']) ? $data['severity_level'] : 'moderate';

            $insReaction->execute([
                $reactionNumber,
                $transfusionId,
                $tx['patient_id'],
                $tx['blood_unit_id'],
                $onsetTime,
                $volTransfused,
                !empty($data['symptom_fever']) ? 1 : 0,
                !empty($data['symptom_chills_rigors']) ? 1 : 0,
                !empty($data['symptom_dyspnea_hypoxia']) ? 1 : 0,
                !empty($data['symptom_tachycardia_hypotension']) ? 1 : 0,
                !empty($data['symptom_hypertension']) ? 1 : 0,
                !empty($data['symptom_urticaria_hives']) ? 1 : 0,
                !empty($data['symptom_facial_edema_stridor']) ? 1 : 0,
                !empty($data['symptom_back_flank_pain']) ? 1 : 0,
                !empty($data['symptom_hemoglobinuria_dark_urine']) ? 1 : 0,
                !empty($data['symptom_nausea_vomiting']) ? 1 : 0,
                $data['symptom_details'] ?? null,
                $data['attending_physician_notified'] ?? $tx['prescribing_physician'],
                $data['emergency_medications_given'] ?? null,
                $suspectedClass,
                $severity
            ]);

            $rxId = (int)$pdo->lastInsertId();

            // Record reaction onset vitals if provided
            if (isset($data['temperature_c']) && isset($data['heart_rate_bpm'])) {
                $this->insertVitalRecord($pdo, $transfusionId, [
                    'vital_stage' => 'reaction_onset',
                    'recorded_at' => $onsetTime,
                    'temperature_c' => $data['temperature_c'],
                    'heart_rate_bpm' => $data['heart_rate_bpm'],
                    'bp_systolic' => $data['bp_systolic'] ?? 110,
                    'bp_diastolic' => $data['bp_diastolic'] ?? 70,
                    'respiratory_rate_bpm' => $data['respiratory_rate_bpm'] ?? 24,
                    'spo2_percent' => $data['spo2_percent'] ?? 93.0,
                    'patient_symptoms' => 'REACTION ONSET: ' . ($data['symptom_details'] ?? 'Adverse symptoms reported.'),
                    'recorded_by_nurse' => $data['reported_by_nurse'] ?? $tx['primary_nurse_name']
                ]);
            }

            $pdo->commit();

            return [
                'reaction_id' => $rxId,
                'reaction_number' => $reactionNumber,
                'transfusion' => $this->getTransfusionDetail($transfusionId)
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Pathologist / Blood Bank Transfusion Reaction Investigation Sign-Off
     */
    public function updateReactionInvestigation(int $reactionId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM blood_transfusion_reactions WHERE id = ? FOR UPDATE");
            $stmt->execute([$reactionId]);
            $rx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$rx) {
                throw new RuntimeException("Transfusion reaction record not found.");
            }

            $upd = $pdo->prepare("
                UPDATE blood_transfusion_reactions
                SET investigation_status = ?,
                    clerical_check_match = ?,
                    visual_hemolysis_post_sample = ?,
                    direct_antiglobulin_test_dat = ?,
                    repeat_abo_rh_match = ?,
                    blood_bag_gram_stain = ?,
                    blood_bag_culture_result = ?,
                    free_hemoglobin_in_urine = ?,
                    reaction_classification = ?,
                    severity_level = ?,
                    pathologist_evaluator = ?,
                    pathologist_notes = ?,
                    pathologist_signed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            ");

            $invStatus = $data['investigation_status'] ?? 'final_closed';
            $clerical = $data['clerical_check_match'] ?? 'match_confirmed';
            $visualHemolysis = $data['visual_hemolysis_post_sample'] ?? 'clear_negative';
            $dat = $data['direct_antiglobulin_test_dat'] ?? 'negative';
            $repeatAbo = $data['repeat_abo_rh_match'] ?? 'match_confirmed';
            $gramStain = $data['blood_bag_gram_stain'] ?? 'no_organisms';
            $culture = $data['blood_bag_culture_result'] ?? 'No growth after 48h';
            $urineHb = $data['free_hemoglobin_in_urine'] ?? 'negative';
            $classification = $data['reaction_classification'] ?? 'febrile_non_hemolytic';
            $severity = $data['severity_level'] ?? 'moderate';
            $evaluator = $data['pathologist_evaluator'] ?? 'Dr. Elizabeth Warren, MD, FPSP (Pathologist)';
            $notes = $data['pathologist_notes'] ?? null;

            $upd->execute([
                $invStatus,
                $clerical,
                $visualHemolysis,
                $dat,
                $repeatAbo,
                $gramStain,
                $culture,
                $urineHb,
                $classification,
                $severity,
                $evaluator,
                $notes,
                $reactionId
            ]);

            $pdo->commit();

            return $this->getReactionDetail($reactionId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Helper to insert a vital sign record
     */
    private function insertVitalRecord(PDO $pdo, int $transfusionId, array $v): int
    {
        $stmt = $pdo->prepare("
            INSERT INTO blood_transfusion_vitals (
                transfusion_id, vital_stage, recorded_at, temperature_c,
                heart_rate_bpm, bp_systolic, bp_diastolic, respiratory_rate_bpm,
                spo2_percent, patient_symptoms, recorded_by_nurse, created_at
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, NOW()
            )
        ");

        $recordedAt = !empty($v['recorded_at']) ? $v['recorded_at'] : date('Y-m-d H:i:s');

        $stmt->execute([
            $transfusionId,
            $v['vital_stage'] ?? '15_min',
            $recordedAt,
            (float)($v['temperature_c'] ?? 36.8),
            (int)($v['heart_rate_bpm'] ?? 78),
            (int)($v['bp_systolic'] ?? 120),
            (int)($v['bp_diastolic'] ?? 80),
            (int)($v['respiratory_rate_bpm'] ?? 18),
            (float)($v['spo2_percent'] ?? 98.0),
            $v['patient_symptoms'] ?? 'Vital signs stable.',
            $v['recorded_by_nurse'] ?? 'Staff Nurse'
        ]);

        return (int)$pdo->lastInsertId();
    }

    /**
     * Get Transfusion Detail including vitals & reaction reports
     */
    public function getTransfusionDetail(int $transfusionId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT bt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   p.sex AS patient_gender,
                   p.blood_type AS patient_blood_type,
                   bi.unit_number AS donor_unit_number,
                   bi.component_type,
                   bi.abo_group AS donor_abo_group,
                   bi.rh_factor AS donor_rh_factor,
                   bi.expiration_date AS unit_expiration_date,
                   bx.crossmatch_number,
                   bx.overall_compatibility
            FROM blood_transfusions bt
            LEFT JOIN patients p ON bt.patient_id = p.id
            LEFT JOIN blood_inventory_units bi ON bt.blood_unit_id = bi.id
            LEFT JOIN blood_crossmatches bx ON bt.crossmatch_id = bx.id
            WHERE bt.id = ?
        ");
        $stmt->execute([$transfusionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        // Fetch vitals
        $vitalStmt = $pdo->prepare("
            SELECT * FROM blood_transfusion_vitals
            WHERE transfusion_id = ?
            ORDER BY recorded_at ASC, id ASC
        ");
        $vitalStmt->execute([$transfusionId]);
        $row['vitals'] = $vitalStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch reaction if any
        if ($row['has_transfusion_reaction']) {
            $rxStmt = $pdo->prepare("
                SELECT * FROM blood_transfusion_reactions
                WHERE transfusion_id = ?
                ORDER BY id DESC LIMIT 1
            ");
            $rxStmt->execute([$transfusionId]);
            $row['reaction'] = $rxStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } else {
            $row['reaction'] = null;
        }

        return $row;
    }

    /**
     * Get Reaction Detail
     */
    public function getReactionDetail(int $reactionId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT rx.*,
                   bt.transfusion_number,
                   bt.status AS transfusion_status,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.blood_type AS patient_blood_type,
                   bi.unit_number AS donor_unit_number,
                   bi.component_type,
                   bi.abo_group AS donor_abo_group,
                   bi.rh_factor AS donor_rh_factor
            FROM blood_transfusion_reactions rx
            JOIN blood_transfusions bt ON rx.transfusion_id = bt.id
            JOIN patients p ON rx.patient_id = p.id
            JOIN blood_inventory_units bi ON rx.blood_unit_id = bi.id
            WHERE rx.id = ?
        ");
        $stmt->execute([$reactionId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * List Bedside Transfusions with search & filters
     */
    public function listTransfusions(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $pdo = Database::connection();
        $where = [];
        $params = [];

        if (!empty($filters['patient_id'])) {
            $where[] = "bt.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = "bt.status = ?";
            $params[] = $filters['status'];
        }

        if (isset($filters['has_reaction']) && $filters['has_reaction'] !== '') {
            $where[] = "bt.has_transfusion_reaction = ?";
            $params[] = (int)$filters['has_reaction'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $where[] = "(bt.transfusion_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ? OR bi.unit_number LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countSql = "
            SELECT COUNT(*)
            FROM blood_transfusions bt
            LEFT JOIN patients p ON bt.patient_id = p.id
            LEFT JOIN blood_inventory_units bi ON bt.blood_unit_id = bi.id
            {$whereClause}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT bt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   p.blood_type AS patient_blood_type,
                   bi.unit_number AS donor_unit_number,
                   bi.component_type,
                   bi.abo_group AS donor_abo_group,
                   bi.rh_factor AS donor_rh_factor,
                   (SELECT COUNT(*) FROM blood_transfusion_vitals WHERE transfusion_id = bt.id) AS vitals_count,
                   (SELECT temperature_c FROM blood_transfusion_vitals WHERE transfusion_id = bt.id ORDER BY recorded_at DESC, id DESC LIMIT 1) AS latest_temp_c,
                   (SELECT heart_rate_bpm FROM blood_transfusion_vitals WHERE transfusion_id = bt.id ORDER BY recorded_at DESC, id DESC LIMIT 1) AS latest_hr_bpm,
                   (SELECT spo2_percent FROM blood_transfusion_vitals WHERE transfusion_id = bt.id ORDER BY recorded_at DESC, id DESC LIMIT 1) AS latest_spo2
            FROM blood_transfusions bt
            LEFT JOIN patients p ON bt.patient_id = p.id
            LEFT JOIN blood_inventory_units bi ON bt.blood_unit_id = bi.id
            {$whereClause}
            ORDER BY bt.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * List Transfusion Reactions for Investigation
     */
    public function listReactions(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $pdo = Database::connection();
        $where = [];
        $params = [];

        if (!empty($filters['investigation_status'])) {
            $where[] = "rx.investigation_status = ?";
            $params[] = $filters['investigation_status'];
        }

        if (!empty($filters['reaction_classification'])) {
            $where[] = "rx.reaction_classification = ?";
            $params[] = $filters['reaction_classification'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $where[] = "(rx.reaction_number LIKE ? OR bt.transfusion_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR bi.unit_number LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $countSql = "
            SELECT COUNT(*)
            FROM blood_transfusion_reactions rx
            JOIN blood_transfusions bt ON rx.transfusion_id = bt.id
            JOIN patients p ON rx.patient_id = p.id
            JOIN blood_inventory_units bi ON rx.blood_unit_id = bi.id
            {$whereClause}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT rx.*,
                   bt.transfusion_number,
                   bt.status AS transfusion_status,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.blood_type AS patient_blood_type,
                   bi.unit_number AS donor_unit_number,
                   bi.component_type,
                   bi.abo_group AS donor_abo_group,
                   bi.rh_factor AS donor_rh_factor
            FROM blood_transfusion_reactions rx
            JOIN blood_transfusions bt ON rx.transfusion_id = bt.id
            JOIN patients p ON rx.patient_id = p.id
            JOIN blood_inventory_units bi ON rx.blood_unit_id = bi.id
            {$whereClause}
            ORDER BY rx.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * Statistics for KPI banner
     */
    public static function getStats(): array
    {
        $pdo = Database::connection();

        $activeInfusions = (int)$pdo->query("SELECT COUNT(*) FROM blood_transfusions WHERE status = 'infusing'")->fetchColumn();
        $verifiedReady = (int)$pdo->query("SELECT COUNT(*) FROM blood_transfusions WHERE status = 'verified_ready'")->fetchColumn();
        $completedToday = (int)$pdo->query("SELECT COUNT(*) FROM blood_transfusions WHERE status = 'completed' AND DATE(infusion_completed_at) = CURDATE()")->fetchColumn();
        $underInvestigation = (int)$pdo->query("SELECT COUNT(*) FROM blood_transfusion_reactions WHERE investigation_status = 'under_investigation'")->fetchColumn();
        $totalReactions = (int)$pdo->query("SELECT COUNT(*) FROM blood_transfusion_reactions")->fetchColumn();

        return [
            'active_infusions' => $activeInfusions,
            'verified_ready' => $verifiedReady,
            'completed_today' => $completedToday,
            'reactions_under_investigation' => $underInvestigation,
            'total_reactions_logged' => $totalReactions
        ];
    }
}
