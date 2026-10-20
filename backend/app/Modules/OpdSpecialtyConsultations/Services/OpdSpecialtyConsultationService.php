<?php

namespace App\Modules\OpdSpecialtyConsultations\Services;

use App\Core\Database;
use App\Modules\OpdSpecialtyConsultations\Models\OpdConsultationSpecialtyData;
use App\Modules\OpdSpecialtyConsultations\Models\OpdSpecialtyConsultationTemplate;
use PDO;

class OpdSpecialtyConsultationService
{
    private const SPECIALTY_FIELDS = [
        'specialty_type',
        'template_name',
        // Obstetrics
        'gravida',
        'para',
        'term_births',
        'preterm_births',
        'abortions',
        'living_children',
        'lmp',
        'edd',
        'gestational_age_weeks',
        'fundal_height_cm',
        'fetal_heart_rate_bpm',
        'fetal_presentation',
        // Pediatrics
        'head_circumference_cm',
        'head_circumference_percentile',
        'weight_percentile',
        'height_length_percentile',
        'developmental_milestones',
        'immunization_status',
        // Orthopedics
        'affected_side',
        'affected_joint_region',
        'range_of_motion',
        'weight_bearing_status',
        'neurovascular_status',
        'deformity_swelling',
        'special_orthopedic_tests',
        // Dynamic payload
        'clinical_data',
    ];

    public function listTemplates(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, specialty_code, name, category, description, template_schema, is_active
             FROM opd_specialty_consultation_templates
             WHERE is_active = 1
             ORDER BY id ASC"
        );
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($templates as &$template) {
            if (!empty($template['template_schema']) && is_string($template['template_schema'])) {
                $decoded = json_decode($template['template_schema'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $template['template_schema'] = $decoded;
                }
            }
        }

        return $templates;
    }

    public function getByEncounter(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM opd_consultation_specialty_data
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY id ASC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'formatRecord'], $rows);
    }

    public function getBySoapNote(int $soapNoteId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM opd_consultation_specialty_data
             WHERE soap_note_id = :soap_note_id AND deleted_at IS NULL
             LIMIT 1"
        );
        $stmt->execute(['soap_note_id' => $soapNoteId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->formatRecord($row) : null;
    }

    public function find(int $id): ?array
    {
        $record = (new OpdConsultationSpecialtyData())->where('id', $id)->first();
        return $record ? $this->formatRecord($record) : null;
    }

    public function store(int $encounterId, array $data, int $userId, ?int $soapNoteId = null): array
    {
        $values = $this->prepareValues($data);
        $values['encounter_id'] = $encounterId;
        $values['soap_note_id'] = $soapNoteId;
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $userId;

        $id = (new OpdConsultationSpecialtyData())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save specialty consultation data.'];
        }

        return [
            'success' => true,
            'message' => 'Specialty consultation data saved successfully.',
            'data' => array_merge(['id' => $id], $values)
        ];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $existing = (new OpdConsultationSpecialtyData())->where('id', $id)->first();

        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Specialty consultation record not found.'];
        }

        $values = $this->prepareValues($data);
        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $userId;

        (new OpdConsultationSpecialtyData())->update($values, $id);

        return [
            'success' => true,
            'message' => 'Specialty consultation data updated successfully.'
        ];
    }

    public function delete(int $id, int $userId): array
    {
        $existing = (new OpdConsultationSpecialtyData())->where('id', $id)->first();

        if (!$existing) {
            return ['success' => false, 'message' => 'Specialty consultation record not found.'];
        }

        (new OpdConsultationSpecialtyData())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Specialty consultation record removed.'];
    }

    /**
     * Link, save, or update specialty data for a specific SOAP note.
     */
    public function syncForSoapNote(int $encounterId, int $soapNoteId, ?array $specialtyData, int $userId): void
    {
        if (empty($specialtyData) || !is_array($specialtyData)) {
            return;
        }

        $existing = $this->getBySoapNote($soapNoteId);

        if ($existing) {
            $this->update((int) $existing['id'], $specialtyData, $userId);
        } else {
            $this->store($encounterId, $specialtyData, $userId, $soapNoteId);
        }
    }

    private function prepareValues(array $data): array
    {
        $values = [];

        foreach (self::SPECIALTY_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];

                if (is_string($val)) {
                    $val = trim($val);
                    $val = $val === '' ? null : $val;
                }

                $values[$field] = $val;
            }
        }

        // Default specialty type if missing
        if (empty($values['specialty_type'])) {
            $values['specialty_type'] = 'general';
        }

        // Obstetrics calculations: auto-calculate EDD and Gestational Age from LMP if not supplied
        if (!empty($values['lmp'])) {
            $lmpTime = strtotime($values['lmp']);
            if ($lmpTime !== false) {
                // Naegele's rule: LMP + 280 days (40 weeks)
                if (empty($values['edd'])) {
                    $values['edd'] = date('Y-m-d', strtotime('+280 days', $lmpTime));
                }

                // Gestational age in weeks from LMP to today
                if (empty($values['gestational_age_weeks'])) {
                    $diffDays = (time() - $lmpTime) / 86400;
                    if ($diffDays > 0) {
                        $weeks = round($diffDays / 7, 1);
                        if ($weeks >= 0 && $weeks <= 45) {
                            $values['gestational_age_weeks'] = $weeks;
                        }
                    }
                }
            }
        }

        // Handle JSON encoding for complex objects/arrays
        if (isset($values['developmental_milestones']) && is_array($values['developmental_milestones'])) {
            $values['developmental_milestones'] = json_encode($values['developmental_milestones']);
        }

        if (isset($values['clinical_data']) && is_array($values['clinical_data'])) {
            $values['clinical_data'] = json_encode($values['clinical_data']);
        }

        return $values;
    }

    private function formatRecord(array $record): array
    {
        if (!empty($record['developmental_milestones']) && is_string($record['developmental_milestones'])) {
            $decoded = json_decode($record['developmental_milestones'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $record['developmental_milestones'] = $decoded;
            }
        }

        if (!empty($record['clinical_data']) && is_string($record['clinical_data'])) {
            $decoded = json_decode($record['clinical_data'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $record['clinical_data'] = $decoded;
            }
        }

        return $record;
    }
}
