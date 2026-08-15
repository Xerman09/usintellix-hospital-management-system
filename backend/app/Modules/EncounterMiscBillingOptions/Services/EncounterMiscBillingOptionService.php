<?php

namespace App\Modules\EncounterMiscBillingOptions\Services;

use App\Modules\EncounterMiscBillingOptions\Models\EncounterMiscBillingOption;
use App\Modules\EncounterSections\Services\EncounterSectionService;
use App\Modules\Employees\Models\Employee;

class EncounterMiscBillingOptionService
{
    private const DETAIL_FIELDS = [
        'employment_related', 'auto_accident', 'auto_accident_state', 'other_accident',
        'claim_codes', 'epsdt',
        'onset_date', 'onset_date_qualifier', 'other_date', 'other_date_qualifier',
        'unable_to_work_from', 'unable_to_work_to',
        'provider_id', 'provider_qualifier',
        'hospitalization_from', 'hospitalization_to',
        'outside_lab', 'outside_lab_charges',
        'resubmission_code', 'medicaid_original_ref_no', 'prior_authorization_no',
        'x12_replacement_claim', 'x12_claim_frequency', 'x12_icn_resubmission_no',
        'additional_notes'
    ];

    private const BOOL_FIELDS = ['epsdt', 'x12_replacement_claim'];

    private EncounterSectionService $encounterSectionService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
    }

    public function find(int $encounterId): ?array
    {
        return (new EncounterMiscBillingOption())->where('encounter_id', $encounterId)->first();
    }

    /**
     * Upsert an encounter's Misc Billing Options. author_name is only
     * resolved and stored on the first save, then left untouched.
     * Rejected once the 'misc_billing_options' section is locked.
     */
    public function save(int $encounterId, array $data, array $currentUser): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'misc_billing_options')) {
            return [
                'success' => false,
                'message' => 'Misc Billing Options is locked. Sign the section again to record further changes.'
            ];
        }

        $values = [];

        foreach (self::DETAIL_FIELDS as $field) {
            $raw = $data[$field] ?? null;

            if (in_array($field, self::BOOL_FIELDS, true)) {
                $values[$field] = $raw ? 1 : 0;
                continue;
            }

            if ($raw === '' || $raw === null) {
                $values[$field] = null;
                continue;
            }

            if ($field === 'provider_id') {
                $values[$field] = (int) $raw;
                continue;
            }

            if ($field === 'outside_lab_charges') {
                $values[$field] = (float) $raw;
                continue;
            }

            $values[$field] = $raw;
        }

        if (($values['x12_claim_frequency'] ?? null) === null) {
            $values['x12_claim_frequency'] = 'new';
        }

        $existing = $this->find($encounterId);

        if ($existing) {
            $values['updated_at'] = date('Y-m-d H:i:s');
            $values['updated_by'] = (int) $currentUser['id'];

            (new EncounterMiscBillingOption())->update($values, (int) $existing['id']);
        } else {
            $values['encounter_id'] = $encounterId;
            $values['author_name'] = $this->resolveAuthorName($currentUser);
            $values['created_at'] = date('Y-m-d H:i:s');
            $values['created_by'] = (int) $currentUser['id'];

            (new EncounterMiscBillingOption())->create($values);
        }

        return [
            'success' => true,
            'message' => 'Misc Billing Options saved successfully.',
            'data' => $this->find($encounterId)
        ];
    }

    private function resolveAuthorName(array $currentUser): string
    {
        $employee = (new Employee())->where('user_id', $currentUser['id'])->first();

        if ($employee) {
            return trim($employee['first_name'] . ' ' . $employee['last_name']);
        }

        return $currentUser['username'] ?? 'Unknown';
    }
}
