<?php

namespace App\Modules\PatientGeneralHistory\Services;

use App\Core\Database;
use PDO;

class PatientGeneralHistoryService
{
    /**
     * Fixed set of recognized risk factor keys -- kept in sync with the
     * RISK_FACTORS list on the frontend. Anything not in this set is
     * rejected rather than silently stored.
     */
    public const RISK_FACTOR_KEYS = [
        'varicose_veins', 'hypertension', 'diabetes', 'sickle_cell', 'fibroids',
        'pid', 'severe_migraine', 'heart_disease', 'thrombosis_stroke', 'hepatitis',
        'gall_bladder_condition', 'breast_disease', 'depression', 'allergies',
        'infertility', 'asthma', 'epilepsy', 'contact_lenses',
        'contraceptive_complication', 'other'
    ];

    /**
     * Fixed set of recognized exam/test keys -- kept in sync with the
     * EXAMS list on the frontend.
     */
    public const EXAM_KEYS = [
        'breast_exam', 'cardiac_echo', 'ecg', 'gynecological_exam', 'mammogram',
        'physical_exam', 'prostate_exam', 'rectal_exam', 'sigmoid_colonoscopy',
        'retinal_exam', 'flu_vaccination', 'pneumonia_vaccination', 'ldl',
        'hemoglobin', 'psa'
    ];

    private const EXAM_STATUSES = ['na', 'normal', 'abnormal'];

    /**
     * Get a patient's recorded risk factors and exams for the General tab.
     */
    public function get(int $patientId): array
    {
        $riskFactorsStmt = Database::connection()->prepare(
            "SELECT risk_factor_key, specify_text
             FROM patient_risk_factors
             WHERE patient_id = :patient_id"
        );
        $riskFactorsStmt->execute(['patient_id' => $patientId]);

        $examsStmt = Database::connection()->prepare(
            "SELECT exam_key, status, notes
             FROM patient_exams
             WHERE patient_id = :patient_id"
        );
        $examsStmt->execute(['patient_id' => $patientId]);

        return [
            'risk_factors' => $riskFactorsStmt->fetchAll(PDO::FETCH_ASSOC),
            'exams' => $examsStmt->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /**
     * Replace a patient's full set of risk factors and exams in one save.
     * Risk factors are a simple selected/not-selected set; exams always
     * exist (defaulting to 'na') so every row is written even when the
     * user leaves it untouched.
     */
    public function save(int $patientId, array $riskFactors, array $exams, int $userId): array
    {
        $cleanRiskFactors = $this->cleanRiskFactors($riskFactors);
        $cleanExams = $this->cleanExams($exams);

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $deleteRiskFactors = $pdo->prepare("DELETE FROM patient_risk_factors WHERE patient_id = :patient_id");
            $deleteRiskFactors->execute(['patient_id' => $patientId]);

            $insertRiskFactor = $pdo->prepare(
                "INSERT INTO patient_risk_factors (patient_id, risk_factor_key, specify_text, created_at, created_by)
                 VALUES (:patient_id, :risk_factor_key, :specify_text, :created_at, :created_by)"
            );

            foreach ($cleanRiskFactors as $riskFactor) {
                $insertRiskFactor->execute([
                    'patient_id' => $patientId,
                    'risk_factor_key' => $riskFactor['key'],
                    'specify_text' => $riskFactor['specify_text'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);
            }

            $deleteExams = $pdo->prepare("DELETE FROM patient_exams WHERE patient_id = :patient_id");
            $deleteExams->execute(['patient_id' => $patientId]);

            $insertExam = $pdo->prepare(
                "INSERT INTO patient_exams (patient_id, exam_key, status, notes, created_at, created_by)
                 VALUES (:patient_id, :exam_key, :status, :notes, :created_at, :created_by)"
            );

            foreach ($cleanExams as $exam) {
                $insertExam->execute([
                    'patient_id' => $patientId,
                    'exam_key' => $exam['key'],
                    'status' => $exam['status'],
                    'notes' => $exam['notes'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'message' => 'General history saved successfully.'
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to save general history.'
            ];
        }
    }

    /**
     * Keep only recognized risk-factor keys, trimming/normalizing specify text.
     */
    private function cleanRiskFactors(array $riskFactors): array
    {
        $clean = [];

        foreach ($riskFactors as $entry) {
            $key = $entry['key'] ?? null;

            if (!in_array($key, self::RISK_FACTOR_KEYS, true)) {
                continue;
            }

            $specifyText = trim((string) ($entry['specify_text'] ?? ''));

            $clean[] = [
                'key' => $key,
                'specify_text' => $specifyText === '' ? null : $specifyText
            ];
        }

        return $clean;
    }

    /**
     * Keep only recognized exam keys with a valid status, always writing
     * every known exam key so the table stays complete for this patient.
     */
    private function cleanExams(array $exams): array
    {
        $byKey = [];

        foreach ($exams as $entry) {
            $key = $entry['key'] ?? null;

            if (!in_array($key, self::EXAM_KEYS, true)) {
                continue;
            }

            $status = $entry['status'] ?? 'na';

            if (!in_array($status, self::EXAM_STATUSES, true)) {
                $status = 'na';
            }

            $notes = trim((string) ($entry['notes'] ?? ''));

            $byKey[$key] = [
                'key' => $key,
                'status' => $status,
                'notes' => $notes === '' ? null : $notes
            ];
        }

        return array_values($byKey);
    }
}
