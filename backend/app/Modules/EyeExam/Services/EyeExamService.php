<?php

namespace App\Modules\EyeExam\Services;

use App\Core\Database;
use App\Core\AuditLogger;
use App\Core\FieldEncryption;
use App\Modules\EyeExam\Models\EncounterEyeExam;
use App\Modules\Encounters\Models\Encounter;
use PDO;

class EyeExamService
{
    private const ENCRYPTED_FIELDS = ['chief_complaint', 'new_dx'];

    private const JSON_FIELDS = [
        'hpi_data',
        'pmsfh_data',
        'physical_exam_data',
        'external_exam_data',
        'anterior_segment_data',
        'retina_data',
        'neuro_data',
        'impression_plan_data'
    ];

    /**
     * Get eye exam for an encounter.
     */
    public function getByEncounter(int $encounterId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM encounter_eye_exams 
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL 
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['encounter_id' => $encounterId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $row = FieldEncryption::decryptRow($row, self::ENCRYPTED_FIELDS);
        return $this->formatRow($row);
    }

    /**
     * Get or initialize default structure for an encounter.
     */
    public function getOrCreate(int $encounterId, int $patientId): array
    {
        $existing = $this->getByEncounter($encounterId);
        if ($existing) {
            return $existing;
        }

        return [
            'id' => null,
            'encounter_id' => $encounterId,
            'patient_id' => $patientId,
            'locked_at' => null,
            'hpi_data' => $this->defaultHpiData(),
            'pmsfh_data' => $this->defaultPmsfhData(),
            'physical_exam_data' => $this->defaultPhysicalExamData(),
            'external_exam_data' => $this->defaultExternalExamData(),
            'anterior_segment_data' => $this->defaultAnteriorSegmentData(),
            'retina_data' => $this->defaultRetinaData(),
            'neuro_data' => $this->defaultNeuroData(),
            'impression_plan_data' => $this->defaultImpressionPlanData(),
            'chief_complaint' => '',
            'new_dx' => '',
            'created_at' => null,
            'updated_at' => null
        ];
    }

    /**
     * Save (create or update) eye exam data for an encounter.
     */
    public function save(int $encounterId, int $patientId, array $payload, int $userId): array
    {
        $existing = $this->getByEncounter($encounterId);

        if ($existing && !empty($existing['locked_at'])) {
            return [
                'success' => false,
                'message' => 'This Eye Exam is locked and cannot be modified.'
            ];
        }

        $now = date('Y-m-d H:i:s');
        $model = new EncounterEyeExam();

        $dataToSave = [
            'encounter_id' => $encounterId,
            'patient_id' => $patientId,
            'chief_complaint' => $payload['chief_complaint'] ?? ($payload['hpi_data']['cc1'] ?? ''),
            'new_dx' => $payload['new_dx'] ?? ($payload['impression_plan_data']['new_dx'] ?? ''),
            'updated_at' => $now,
            'updated_by' => $userId
        ];

        foreach (self::JSON_FIELDS as $field) {
            if (isset($payload[$field])) {
                $val = $payload[$field];
                $dataToSave[$field] = is_string($val) ? $val : json_encode($val, JSON_UNESCAPED_UNICODE);
            }
        }

        if ($existing && !empty($existing['id'])) {
            $model->update($dataToSave, (int)$existing['id']);
            $examId = (int)$existing['id'];
            $action = 'UPDATE_EYE_EXAM';
            $msg = 'Eye Exam updated successfully.';
        } else {
            $dataToSave['created_at'] = $now;
            $dataToSave['created_by'] = $userId;
            $examId = (int)$model->create($dataToSave);
            $action = 'CREATE_EYE_EXAM';
            $msg = 'Eye Exam created successfully.';
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CLINICAL,
            $action,
            "Documented Eye Exam #{$examId} for encounter #{$encounterId} (patient #{$patientId})",
            $patientId,
            $userId
        );

        $saved = $this->getByEncounter($encounterId);

        return [
            'success' => true,
            'message' => $msg,
            'data' => $saved
        ];
    }

    /**
     * Format a database row, decoding JSON fields to PHP arrays.
     */
    private function formatRow(array $row): array
    {
        foreach (self::JSON_FIELDS as $field) {
            if (isset($row[$field]) && is_string($row[$field])) {
                $decoded = json_decode($row[$field], true);
                $row[$field] = is_array($decoded) ? $decoded : [];
            } elseif (!isset($row[$field]) || !is_array($row[$field])) {
                $row[$field] = [];
            }
        }
        return $row;
    }

    public function defaultHpiData(): array
    {
        return [
            'active_tab' => 'cc1',
            'cc1' => '',
            'cc2' => '',
            'cc3' => '',
            'hpi_text' => '',
            'chronic_problems' => ''
        ];
    }

    public function defaultPmsfhData(): array
    {
        return [
            'category' => 'POH',
            'items' => [],
            'medication' => '',
            'start' => '',
            'finish' => '',
            'eye_med' => false,
            'comments' => ''
        ];
    }

    public function defaultPhysicalExamData(): array
    {
        return [
            'mental_status' => [
                'alert' => true,
                'oriented_tpp' => true,
                'mood_affect_nml' => true
            ],
            'vision' => [
                'sc_od' => '', 'sc_os' => '',
                'cc_od' => '', 'cc_os' => '',
                'ph_od' => '', 'ph_os' => '',
                'r_od' => '', 'r_os' => '',
                'w_od' => '', 'w_os' => '',
                'mr_od' => '', 'mr_os' => '',
                'ar_od' => '', 'ar_os' => '',
                'ctl_od' => '', 'ctl_os' => '',
                'add_od' => '', 'add_os' => '',
                'va_od' => '', 'va_os' => ''
            ],
            'tension' => [
                'time' => '',
                'ap_od' => '', 'ap_os' => '',
                'tp_od' => '', 'tp_os' => '',
                'ft_od' => '', 'ft_os' => ''
            ],
            'amsler' => [
                'normal' => true,
                'od_desc' => '',
                'os_desc' => ''
            ],
            'fields' => [
                'ftcf' => true,
                'od_desc' => '',
                'os_desc' => ''
            ],
            'pupils' => [
                'normal' => true,
                'od_size' => '3',
                'os_size' => '3',
                'od_react' => 'Brisk',
                'os_react' => 'Brisk',
                'apd' => 'None'
            ]
        ];
    }

    public function defaultExternalExamData(): array
    {
        return [
            'od' => [
                'brow' => 'Normal',
                'upper_lids' => 'Normal',
                'lower_lids' => 'Normal',
                'medial_canthi' => 'Normal',
                'adnoxa' => 'Normal'
            ],
            'os' => [
                'brow' => 'Normal',
                'upper_lids' => 'Normal',
                'lower_lids' => 'Normal',
                'medial_canthi' => 'Normal',
                'adnoxa' => 'Normal'
            ],
            'lev_fn' => '',
            'mrd' => '',
            'vert_fissure' => '',
            'carotid' => '',
            'temp_art' => '',
            'cn_v' => '',
            'cn_vii' => '',
            'hertel_base' => '',
            'hertel_od' => '',
            'hertel_os' => '',
            'comments' => ''
        ];
    }

    public function defaultAnteriorSegmentData(): array
    {
        return [
            'od' => [
                'conj_sclera' => 'Clear',
                'cornea' => 'Clear',
                'ac' => 'Deep & Quiet',
                'lens' => 'Clear',
                'iris' => 'Flat & Intact'
            ],
            'os' => [
                'conj_sclera' => 'Clear',
                'cornea' => 'Clear',
                'ac' => 'Deep & Quiet',
                'lens' => 'Clear',
                'iris' => 'Flat & Intact'
            ],
            'gonio' => '',
            'pachy_od' => '',
            'pachy_os' => '',
            'schirmers_i_od' => '',
            'schirmers_i_os' => '',
            'schirmers_ii_od' => '',
            'schirmers_ii_os' => '',
            'tbut_od' => '',
            'tbut_os' => '',
            'dilation' => [
                'tropicamide' => false,
                'phenylephrine' => false,
                'cyclopentolate' => false,
                'time' => '',
                'comments' => ''
            ]
        ];
    }

    public function defaultRetinaData(): array
    {
        return [
            'od' => [
                'disc' => 'Pink & Sharp',
                'macula' => 'Normal',
                'vessels' => 'Normal caliber',
                'vitreous' => 'Clear',
                'periph' => 'Attached, 360 normal'
            ],
            'os' => [
                'disc' => 'Pink & Sharp',
                'macula' => 'Normal',
                'vessels' => 'Normal caliber',
                'vitreous' => 'Clear',
                'periph' => 'Attached, 360 normal'
            ],
            'cd_ratio_od' => '0.3',
            'cd_ratio_os' => '0.3',
            'cmt_od' => '',
            'cmt_os' => '',
            'scleral_depression' => false,
            'comments' => ''
        ];
    }

    public function defaultNeuroData(): array
    {
        return [
            'od' => [
                'color' => '14/14 Ishihara',
                'red_desat' => '100%',
                'coins' => ''
            ],
            'os' => [
                'color' => '14/14 Ishihara',
                'red_desat' => '100%',
                'coins' => ''
            ],
            'motility_normal' => true,
            'act_ortho' => true,
            'npa' => '',
            'npc' => '',
            'stereopsis' => '40 sec/arc',
            'amplitudes' => [
                'dist_divergence' => '',
                'dist_convergence' => '',
                'near_divergence' => '',
                'near_convergence' => '',
                'vert_fusional' => ''
            ],
            'comments' => ''
        ];
    }

    public function defaultImpressionPlanData(): array
    {
        return [
            'new_dx' => '',
            'exam_findings' => [],
            'coding_engine' => '',
            'next_visit_orders' => '',
            'communication_engine' => ''
        ];
    }
}
