<?php

namespace App\Modules\PracticeRules\Services;

use App\Core\Database;
use App\Modules\PracticeRules\Models\PracticeRule;
use PDO;
use Throwable;

class PracticeRuleService
{
    // The full ACL scope catalog the Alert Manager's "Access Control"
    // dropdown offers -- mirrors OpenEMR's real access-control list
    // values, validated server-side so only a real option can be saved.
    public const ACCESS_CONTROL_OPTIONS = [
        'acct:bill', 'acct:disc', 'acct:eob', 'acct:rep', 'acct:rep_a',
        'admin:acl', 'admin:batchcom', 'admin:calendar', 'admin:database', 'admin:drugs',
        'admin:forms', 'admin:language', 'admin:manage_modules', 'admin:menu', 'admin:practice',
        'admin:super', 'admin:superbill', 'admin:users',
        'encounters:auth', 'encounters:auth_a', 'encounters:coding', 'encounters:coding_a',
        'encounters:date_a', 'encounters:notes', 'encounters:notes_a', 'encounters:relaxed',
        'lists:country', 'lists:default', 'lists:ethrace', 'lists:language', 'lists:state',
        'patientportal:portal',
        'patients:alert', 'patients:amendment', 'patients:appt', 'patients:demo', 'patients:disclosure',
        'patients:docs', 'patients:docs_rm', 'patients:lab', 'patients:med', 'patients:notes',
        'patients:pat_rep', 'patients:reminder', 'patients:rx', 'patients:sign', 'patients:trans',
        'sensitivities:high', 'sensitivities:normal',
        'placeholder:filler', 'nationnotes:nn_configure', 'menus:modle',
        'groups:gadd', 'groups:gcalendar', 'groups:gdlog', 'groups:glog', 'groups:gm',
        'inventory:adjustments', 'inventory:consumption', 'inventory:destruction', 'inventory:lots',
        'inventory:purchases', 'inventory:reporting', 'inventory:sales', 'inventory:transfers'
    ];

    private PracticeRule $practiceRuleModel;

    public function __construct()
    {
        $this->practiceRuleModel = new PracticeRule();
    }

    /**
     * Get list of all rules.
     */
    public function getRules(): array
    {
        $rules = $this->practiceRuleModel->getRulesByTenant();

        return [
            'success' => true,
            'data' => $rules
        ];
    }

    /**
     * Bulk-save every row's alert-channel flags + access control in one
     * transaction, matching the Alert Manager grid's single Save button
     * that commits every row at once.
     */
    public function bulkUpdateAlertFlags(array $rows, int $userId): array
    {
        $pdo = Database::connection();

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "UPDATE practice_rules
                 SET is_active_alert = ?, is_passive_alert = ?, is_patient_reminder = ?, access_control = ?,
                     updated_at = ?, updated_by = ?
                 WHERE id = ? AND deleted_at IS NULL"
            );

            $now = date('Y-m-d H:i:s');

            foreach ($rows as $row) {
                $id = (int) ($row['id'] ?? 0);

                if ($id <= 0) {
                    continue;
                }

                $accessControl = $row['access_control'] ?? null;

                if ($accessControl !== null && !in_array($accessControl, self::ACCESS_CONTROL_OPTIONS, true)) {
                    $accessControl = null;
                }

                $stmt->execute([
                    !empty($row['is_active_alert']) ? 1 : 0,
                    !empty($row['is_passive_alert']) ? 1 : 0,
                    !empty($row['is_patient_reminder']) ? 1 : 0,
                    $accessControl,
                    $now,
                    $userId,
                    $id
                ]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            return ['success' => false, 'message' => 'Failed to save alert manager changes.'];
        }

        return ['success' => true, 'message' => 'Alert manager settings saved successfully.'];
    }

    /**
     * Get detailed summary of a single rule.
     */
    public function getRule(int $id): array
    {
        $rule = $this->practiceRuleModel->findRuleById($id);

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
    public function createRule(array $data, int $userId): array
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

        return $this->getRule($ruleId);
    }

    /**
     * Update an existing rule.
     */
    public function updateRule(int $id, array $data, int $userId): array
    {
        $existing = $this->practiceRuleModel->findRuleById($id);
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

        return $this->getRule($id);
    }

    /**
     * Soft delete a rule.
     */
    public function softDeleteRule(int $id, int $userId): array
    {
        $existing = $this->practiceRuleModel->findRuleById($id);
        if (!$existing) {
            return [
                'success' => false,
                'message' => 'Rule not found'
            ];
        }

        $deleted = $this->practiceRuleModel->softDeleteRule($id, $userId);

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
