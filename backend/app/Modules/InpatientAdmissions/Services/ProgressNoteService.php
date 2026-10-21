<?php

namespace App\Modules\InpatientAdmissions\Services;

use App\Core\Database;
use App\Modules\InpatientAdmissions\Models\InpatientProgressNote;
use App\Modules\InpatientAdmissions\Models\InpatientAdmission;
use PDO;
use Exception;
use Throwable;

class ProgressNoteService
{
    public const DISCIPLINES = [
        'Physical Therapy' => [
            'label' => 'Physical Therapy',
            'short' => 'PT',
            'icon' => '🏃',
            'color' => '#2563eb',
            'bg' => '#eff6ff',
            'default_role' => 'Physical Therapist (DPT/PT)',
        ],
        'Occupational Therapy' => [
            'label' => 'Occupational Therapy',
            'short' => 'OT',
            'icon' => '🖐️',
            'color' => '#7c3aed',
            'bg' => '#f5f3ff',
            'default_role' => 'Occupational Therapist (OTR/L)',
        ],
        'Clinical Nutrition' => [
            'label' => 'Clinical Nutrition',
            'short' => 'RD',
            'icon' => '🥗',
            'color' => '#16a34a',
            'bg' => '#f0fdf4',
            'default_role' => 'Registered Dietitian / Nutritionist (RD/LDN)',
        ],
        'Clinical Pharmacy' => [
            'label' => 'Clinical Pharmacy',
            'short' => 'PharmD',
            'icon' => '💊',
            'color' => '#0891b2',
            'bg' => '#ecfeff',
            'default_role' => 'Clinical Specialist Pharmacist (PharmD/BCPS)',
        ],
        'Medical Social Work' => [
            'label' => 'Medical Social Work',
            'short' => 'SW',
            'icon' => '🤝',
            'color' => '#d97706',
            'bg' => '#fffbeb',
            'default_role' => 'Medical Social Worker / Case Manager (MSW/LCSW)',
        ],
        'Respiratory Therapy' => [
            'label' => 'Respiratory Therapy',
            'short' => 'RT',
            'icon' => '🫁',
            'color' => '#4f46e5',
            'bg' => '#eef2ff',
            'default_role' => 'Registered Respiratory Therapist (RRT)',
        ],
        'Speech-Language Pathology' => [
            'label' => 'Speech-Language Pathology',
            'short' => 'SLP',
            'icon' => '🗣️',
            'color' => '#db2777',
            'bg' => '#fdf2f8',
            'default_role' => 'Speech-Language Pathologist (CCC-SLP)',
        ],
        'Wound Care' => [
            'label' => 'Wound Care',
            'short' => 'WOCN',
            'icon' => '🩹',
            'color' => '#dc2626',
            'bg' => '#fef2f2',
            'default_role' => 'Wound, Ostomy & Continence Nurse (CWOCN)',
        ],
        'General Allied Health' => [
            'label' => 'General Allied Health',
            'short' => 'AHP',
            'icon' => '📋',
            'color' => '#475569',
            'bg' => '#f8fafc',
            'default_role' => 'Allied Health Practitioner',
        ],
    ];

    public const NOTE_TYPES = [
        'Initial Assessment',
        'Daily Treatment / Intervention',
        'Progress Review',
        'Consultation Note',
        'Discharge Planning',
    ];

    public function options(): array
    {
        return [
            'disciplines' => self::DISCIPLINES,
            'note_types' => self::NOTE_TYPES,
        ];
    }

    public function listByAdmission(int $admissionId, ?string $discipline = null): array
    {
        $db = Database::connection();
        $params = ['admission_id' => $admissionId];

        $where = "r.admission_id = :admission_id AND r.deleted_at IS NULL";
        if (!empty($discipline) && $discipline !== 'all' && array_key_exists($discipline, self::DISCIPLINES)) {
            $where .= " AND r.discipline = :discipline";
            $params['discipline'] = $discipline;
        }

        $sql = "SELECT r.*,
                       a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                       a.admitting_diagnosis, a.attending_physician,
                       w.ward_name, b.bed_number
                FROM inpatient_progress_notes r
                JOIN inpatient_admissions a ON a.id = r.admission_id
                LEFT JOIN hospital_wards w ON w.id = a.ward_id
                LEFT JOIN hospital_beds b ON b.id = a.bed_id
                WHERE {$where}
                ORDER BY r.note_datetime DESC, r.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function get(int $id): ?array
    {
        $db = Database::connection();
        $sql = "SELECT r.*,
                       a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                       a.admitting_diagnosis, a.attending_physician,
                       w.ward_name, b.bed_number
                FROM inpatient_progress_notes r
                JOIN inpatient_admissions a ON a.id = r.admission_id
                LEFT JOIN hospital_wards w ON w.id = a.ward_id
                LEFT JOIN hospital_beds b ON b.id = a.bed_id
                WHERE r.id = :id AND r.deleted_at IS NULL
                LIMIT 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function store(array $data, ?int $userId, array $actor = []): array
    {
        $admissionId = (int) ($data['admission_id'] ?? 0);
        if ($admissionId <= 0) {
            throw new Exception('Admission ID is required.');
        }

        $admission = (new InpatientAdmission())->where('id', $admissionId)->first();
        if (!$admission) {
            throw new Exception('Inpatient admission record not found.');
        }

        $patientId = (int) ($admission['patient_id'] ?? ($data['patient_id'] ?? 0));
        if ($patientId <= 0) {
            $patientId = $admissionId;
        }

        $discipline = trim((string) ($data['discipline'] ?? 'General Allied Health'));
        if (!array_key_exists($discipline, self::DISCIPLINES)) {
            $discipline = 'General Allied Health';
        }

        $noteType = trim((string) ($data['note_type'] ?? 'Daily Treatment / Intervention'));
        if (!in_array($noteType, self::NOTE_TYPES, true)) {
            $noteType = 'Daily Treatment / Intervention';
        }

        $plan = trim((string) ($data['plan'] ?? ''));
        if ($plan === '') {
            throw new Exception('Intervention Treatment Plan & Goals are required.');
        }

        $noteDateTime = !empty($data['note_datetime'])
            ? date('Y-m-d H:i:s', strtotime($data['note_datetime']))
            : date('Y-m-d H:i:s');

        // Resolve Provider
        $providerName = trim((string) ($data['provider_name'] ?? ''));
        $providerRole = trim((string) ($data['provider_role'] ?? ''));
        $providerId = !empty($data['provider_id']) ? (int) $data['provider_id'] : null;

        if ($providerName === '') {
            if (!empty($actor['first_name']) || !empty($actor['last_name'])) {
                $providerName = trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''));
            } else {
                $providerName = 'Allied Health Clinician';
            }
        }
        if ($providerRole === '') {
            $providerRole = self::DISCIPLINES[$discipline]['default_role'] ?? 'Clinician';
        }
        if (!$providerId && !empty($actor['id'])) {
            $providerId = (int) $actor['id'];
        }

        $db = Database::connection();
        $noteNumber = $this->generateNoteNumber($db);

        $sql = "INSERT INTO inpatient_progress_notes (
            note_number, admission_id, patient_id, note_datetime,
            discipline, provider_id, provider_name, provider_role,
            note_type, subjective, objective, assessment, plan, recommendations,
            created_by, created_at
        ) VALUES (
            :note_number, :admission_id, :patient_id, :note_datetime,
            :discipline, :provider_id, :provider_name, :provider_role,
            :note_type, :subjective, :objective, :assessment, :plan, :recommendations,
            :created_by, NOW()
        )";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            'note_number' => $noteNumber,
            'admission_id' => $admissionId,
            'patient_id' => $patientId,
            'note_datetime' => $noteDateTime,
            'discipline' => $discipline,
            'provider_id' => $providerId,
            'provider_name' => $providerName,
            'provider_role' => $providerRole,
            'note_type' => $noteType,
            'subjective' => !empty($data['subjective']) ? trim((string) $data['subjective']) : null,
            'objective' => !empty($data['objective']) ? trim((string) $data['objective']) : null,
            'assessment' => !empty($data['assessment']) ? trim((string) $data['assessment']) : null,
            'plan' => $plan,
            'recommendations' => !empty($data['recommendations']) ? trim((string) $data['recommendations']) : null,
            'created_by' => $userId,
        ]);

        $noteId = (int) $db->lastInsertId();

        return [
            'id' => $noteId,
            'note_number' => $noteNumber,
            'admission_id' => $admissionId,
            'discipline' => $discipline,
            'note_type' => $noteType,
            'note_datetime' => $noteDateTime,
        ];
    }

    public function update(int $id, array $data, ?int $userId): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Progress note record not found.');
        }

        $plan = trim((string) ($data['plan'] ?? $existing['plan']));
        if ($plan === '') {
            throw new Exception('Intervention Treatment Plan & Goals are required.');
        }

        $discipline = trim((string) ($data['discipline'] ?? $existing['discipline']));
        if (!array_key_exists($discipline, self::DISCIPLINES)) {
            $discipline = $existing['discipline'];
        }

        $noteType = trim((string) ($data['note_type'] ?? $existing['note_type']));
        if (!in_array($noteType, self::NOTE_TYPES, true)) {
            $noteType = $existing['note_type'];
        }

        $noteDateTime = !empty($data['note_datetime'])
            ? date('Y-m-d H:i:s', strtotime($data['note_datetime']))
            : $existing['note_datetime'];

        $db = Database::connection();
        $sql = "UPDATE inpatient_progress_notes SET
            note_datetime = :note_datetime,
            discipline = :discipline,
            note_type = :note_type,
            provider_name = :provider_name,
            provider_role = :provider_role,
            subjective = :subjective,
            objective = :objective,
            assessment = :assessment,
            plan = :plan,
            recommendations = :recommendations,
            updated_by = :updated_by,
            updated_at = NOW()
            WHERE id = :id";

        $stmt = $db->prepare($sql);
        return $stmt->execute([
            'note_datetime' => $noteDateTime,
            'discipline' => $discipline,
            'note_type' => $noteType,
            'provider_name' => !empty($data['provider_name']) ? trim((string) $data['provider_name']) : $existing['provider_name'],
            'provider_role' => !empty($data['provider_role']) ? trim((string) $data['provider_role']) : $existing['provider_role'],
            'subjective' => isset($data['subjective']) ? trim((string) $data['subjective']) : $existing['subjective'],
            'objective' => isset($data['objective']) ? trim((string) $data['objective']) : $existing['objective'],
            'assessment' => isset($data['assessment']) ? trim((string) $data['assessment']) : $existing['assessment'],
            'plan' => $plan,
            'recommendations' => isset($data['recommendations']) ? trim((string) $data['recommendations']) : $existing['recommendations'],
            'updated_by' => $userId,
            'id' => $id,
        ]);
    }

    public function cosign(int $id, int $userId, string $userName): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Progress note record not found.');
        }

        $db = Database::connection();
        $stmt = $db->prepare("UPDATE inpatient_progress_notes SET
            is_cosigned = 1,
            cosigned_by = :uid,
            cosigned_by_name = :uname,
            cosigned_at = NOW(),
            updated_by = :uid,
            updated_at = NOW()
            WHERE id = :id");

        return $stmt->execute([
            'uid' => $userId,
            'uname' => $userName,
            'id' => $id,
        ]);
    }

    public function delete(int $id, ?int $userId): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Progress note record not found.');
        }

        $db = Database::connection();
        $stmt = $db->prepare("UPDATE inpatient_progress_notes SET deleted_at = NOW(), updated_by = :u WHERE id = :id");
        return $stmt->execute(['u' => $userId, 'id' => $id]);
    }

    private function generateNoteNumber(PDO $db): string
    {
        $prefix = 'MPN-' . date('ymd') . '-';
        $stmt = $db->prepare("SELECT COUNT(*) FROM inpatient_progress_notes WHERE note_number LIKE :p");
        $stmt->execute(['p' => $prefix . '%']);
        $seq = (int) $stmt->fetchColumn() + 1;
        return sprintf('%s%03d', $prefix, $seq);
    }
}
