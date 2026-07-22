<?php

namespace App\Modules\PracticeRules\Services;

use App\Modules\PracticeRules\Models\PracticeRule;

class PracticeRuleService
{
    private PracticeRule $practiceRuleModel;

    public function __construct()
    {
        $this->practiceRuleModel = new PracticeRule();
    }

    /**
     * Get list of rules for a tenant.
     */
    public function getRules(int $tenantId): array
    {
        $rules = $this->practiceRuleModel->getRulesByTenant($tenantId);

        return [
            'success' => true,
            'data' => $rules
        ];
    }

    /**
     * Get detailed summary of a single rule.
     */
    public function getRule(int $id, int $tenantId): array
    {
        $rule = $this->practiceRuleModel->findRuleById($id, $tenantId);

        if (!$rule) {
            return [
                'success' => false,
                'message' => 'Rule not found'
            ];
        }

        // Parse JSON fields safely
        $rule['reminder_intervals'] = !empty($rule['reminder_intervals']) ? json_decode($rule['reminder_intervals'], true) : null;
        $rule['demographics_criteria'] = !empty($rule['demographics_criteria']) ? json_decode($rule['demographics_criteria'], true) : [];
        $rule['clinical_targets'] = !empty($rule['clinical_targets']) ? json_decode($rule['clinical_targets'], true) : [];
        $rule['actions_list'] = !empty($rule['actions_list']) ? json_decode($rule['actions_list'], true) : [];

        return [
            'success' => true,
            'data' => $rule
        ];
    }

    /**
     * Create a new practice rule.
     */
    public function createRule(array $data, int $tenantId, int $userId): array
    {
        $errors = [];

        $title = trim($data['title'] ?? '');
        $type = trim($data['type'] ?? '');

        if (empty($title)) {
            $errors['title'] = 'Title is required.';
        }

        $validTypes = ['Active Alert', 'Passive Alert', 'Patient Reminder'];
        if (empty($type) || !in_array($type, $validTypes, true)) {
            $errors['type'] = 'Type must be one of: ' . implode(', ', $validTypes);
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors
            ];
        }

        $insertData = [
            'tenant_id' => $tenantId,
            'title' => $title,
            'type' => $type,
            'bibliographic_citation' => !empty($data['bibliographic_citation']) ? trim($data['bibliographic_citation']) : null,
            'developer' => !empty($data['developer']) ? trim($data['developer']) : null,
            'funding_source' => !empty($data['funding_source']) ? trim($data['funding_source']) : null,
            'date_last_reviewed' => !empty($data['date_last_reviewed']) ? $data['date_last_reviewed'] : null,
            'release_info' => !empty($data['release_info']) ? trim($data['release_info']) : null,
            'web_reference' => !empty($data['web_reference']) ? trim($data['web_reference']) : null,
            'referential_cds' => !empty($data['referential_cds']) ? trim($data['referential_cds']) : null,
            'reminder_intervals' => !empty($data['reminder_intervals']) ? json_encode($data['reminder_intervals']) : null,
            'demographics_criteria' => !empty($data['demographics_criteria']) ? json_encode($data['demographics_criteria']) : null,
            'clinical_targets' => !empty($data['clinical_targets']) ? json_encode($data['clinical_targets']) : null,
            'actions_list' => !empty($data['actions_list']) ? json_encode($data['actions_list']) : null,
            'use_patient_race' => isset($data['use_patient_race']) ? trim($data['use_patient_race']) : null,
            'use_patient_ethnicity' => isset($data['use_patient_ethnicity']) ? trim($data['use_patient_ethnicity']) : null,
            'use_patient_language' => isset($data['use_patient_language']) ? trim($data['use_patient_language']) : null,
            'use_patient_sexual_orientation' => isset($data['use_patient_sexual_orientation']) ? trim($data['use_patient_sexual_orientation']) : null,
            'use_patient_gender_identity' => isset($data['use_patient_gender_identity']) ? trim($data['use_patient_gender_identity']) : null,
            'use_patient_sex' => isset($data['use_patient_sex']) ? trim($data['use_patient_sex']) : null,
            'use_patient_dob' => isset($data['use_patient_dob']) ? trim($data['use_patient_dob']) : null,
            'use_patient_sdoh' => isset($data['use_patient_sdoh']) ? trim($data['use_patient_sdoh']) : null,
            'use_patient_health_status_assessments' => isset($data['use_patient_health_status_assessments']) ? trim($data['use_patient_health_status_assessments']) : null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ];

        $ruleId = $this->practiceRuleModel->create($insertData);

        if (!$ruleId) {
            return [
                'success' => false,
                'message' => 'Failed to create rule'
            ];
        }

        return $this->getRule($ruleId, $tenantId);
    }

    /**
     * Update an existing rule.
     */
    public function updateRule(int $id, array $data, int $tenantId, int $userId): array
    {
        $existing = $this->practiceRuleModel->findRuleById($id, $tenantId);
        if (!$existing) {
            return [
                'success' => false,
                'message' => 'Rule not found'
            ];
        }

        $errors = [];

        $title = trim($data['title'] ?? '');
        $type = trim($data['type'] ?? '');

        if (empty($title)) {
            $errors['title'] = 'Title is required.';
        }

        $validTypes = ['Active Alert', 'Passive Alert', 'Patient Reminder'];
        if (empty($type) || !in_array($type, $validTypes, true)) {
            $errors['type'] = 'Type must be one of: ' . implode(', ', $validTypes);
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors
            ];
        }

        $updateData = [
            'title' => $title,
            'type' => $type,
            'bibliographic_citation' => !empty($data['bibliographic_citation']) ? trim($data['bibliographic_citation']) : null,
            'developer' => !empty($data['developer']) ? trim($data['developer']) : null,
            'funding_source' => !empty($data['funding_source']) ? trim($data['funding_source']) : null,
            'date_last_reviewed' => !empty($data['date_last_reviewed']) ? $data['date_last_reviewed'] : null,
            'release_info' => !empty($data['release_info']) ? trim($data['release_info']) : null,
            'web_reference' => !empty($data['web_reference']) ? trim($data['web_reference']) : null,
            'referential_cds' => !empty($data['referential_cds']) ? trim($data['referential_cds']) : null,
            'reminder_intervals' => !empty($data['reminder_intervals']) ? json_encode($data['reminder_intervals']) : null,
            'demographics_criteria' => !empty($data['demographics_criteria']) ? json_encode($data['demographics_criteria']) : null,
            'clinical_targets' => !empty($data['clinical_targets']) ? json_encode($data['clinical_targets']) : null,
            'actions_list' => !empty($data['actions_list']) ? json_encode($data['actions_list']) : null,
            'use_patient_race' => isset($data['use_patient_race']) ? trim($data['use_patient_race']) : null,
            'use_patient_ethnicity' => isset($data['use_patient_ethnicity']) ? trim($data['use_patient_ethnicity']) : null,
            'use_patient_language' => isset($data['use_patient_language']) ? trim($data['use_patient_language']) : null,
            'use_patient_sexual_orientation' => isset($data['use_patient_sexual_orientation']) ? trim($data['use_patient_sexual_orientation']) : null,
            'use_patient_gender_identity' => isset($data['use_patient_gender_identity']) ? trim($data['use_patient_gender_identity']) : null,
            'use_patient_sex' => isset($data['use_patient_sex']) ? trim($data['use_patient_sex']) : null,
            'use_patient_dob' => isset($data['use_patient_dob']) ? trim($data['use_patient_dob']) : null,
            'use_patient_sdoh' => isset($data['use_patient_sdoh']) ? trim($data['use_patient_sdoh']) : null,
            'use_patient_health_status_assessments' => isset($data['use_patient_health_status_assessments']) ? trim($data['use_patient_health_status_assessments']) : null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ];

        $updated = $this->practiceRuleModel->update($updateData, $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update rule'
            ];
        }

        return $this->getRule($id, $tenantId);
    }

    /**
     * Soft delete a rule.
     */
    public function softDeleteRule(int $id, int $tenantId, int $userId): array
    {
        $existing = $this->practiceRuleModel->findRuleById($id, $tenantId);
        if (!$existing) {
            return [
                'success' => false,
                'message' => 'Rule not found'
            ];
        }

        $deleted = $this->practiceRuleModel->softDeleteRule($id, $tenantId, $userId);

        if (!$deleted) {
            return [
                'success' => false,
                'message' => 'Failed to soft delete rule'
            ];
        }

        return [
            'success' => true,
            'message' => 'Rule soft deleted successfully'
        ];
    }
}
