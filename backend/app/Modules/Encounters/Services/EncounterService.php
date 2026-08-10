<?php

namespace App\Modules\Encounters\Services;

use App\Core\Database;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Encounters\Models\EncounterBillingCode;
use App\Modules\Encounters\Models\EncounterIssue;
use PDO;

class EncounterService
{
    /**
     * Detail fields that can be set on an encounter record, beyond the
     * patient link itself.
     */
    private const DETAIL_FIELDS = [
        'visit_category_id', 'class_id', 'visit_type_id', 'sensitivity',
        'encounter_provider_id', 'referring_provider_id', 'facility_id',
        'billing_facility_id', 'date_of_service', 'onset_date', 'in_collection',
        'discharge_disposition_id', 'reason_for_visit'
    ];

    private const LIST_SQL =
        "SELECT e.id, e.patient_id,
                e.visit_category_id, vc.name AS visit_category_name,
                e.class_id, cl.name AS class_name,
                e.visit_type_id, vt.type AS visit_type_name,
                e.sensitivity,
                e.encounter_provider_id, NULLIF(TRIM(CONCAT(epe.first_name, ' ', epe.last_name)), '') AS encounter_provider_name,
                e.referring_provider_id, NULLIF(TRIM(CONCAT(rpe.first_name, ' ', rpe.last_name)), '') AS referring_provider_name,
                e.facility_id, f.name AS facility_name,
                e.billing_facility_id, bf.name AS billing_facility_name,
                e.date_of_service, e.onset_date, e.in_collection,
                e.discharge_disposition_id, dd.name AS discharge_disposition_name,
                e.reason_for_visit, e.created_at, e.updated_at,
                (SELECT GROUP_CONCAT(CONCAT(ei.issue_type, ':', ei.issue_id) SEPARATOR ',')
                 FROM encounter_issues ei
                 WHERE ei.encounter_id = e.id) AS linked_issues,
                (SELECT GROUP_CONCAT(CONCAT(ebc.code_type, ':', ebc.code, ':', ebc.description) SEPARATOR '||')
                 FROM encounter_billing_codes ebc
                 WHERE ebc.encounter_id = e.id) AS billing_codes_summary,
                (SELECT SUM(ebc.fee)
                 FROM encounter_billing_codes ebc
                 WHERE ebc.encounter_id = e.id) AS billing_fee_total
         FROM encounters e
         LEFT JOIN visit_categories vc ON vc.id = e.visit_category_id
         LEFT JOIN classes cl ON cl.id = e.class_id
         LEFT JOIN visit_types vt ON vt.id = e.visit_type_id
         LEFT JOIN providers ep ON ep.id = e.encounter_provider_id
         LEFT JOIN employees epe ON epe.id = ep.employee_id
         LEFT JOIN providers rp ON rp.id = e.referring_provider_id
         LEFT JOIN employees rpe ON rpe.id = rp.employee_id
         LEFT JOIN facilities f ON f.id = e.facility_id
         LEFT JOIN facilities bf ON bf.id = e.billing_facility_id
         LEFT JOIN discharge_dispositions dd ON dd.id = e.discharge_disposition_id";

    /**
     * List a patient's recorded encounters, most recent first. Each row's
     * `linked_issues` is a "type:id,type:id" string (or null) rather than
     * a separate per-encounter request, since the edit form only needs it
     * to pre-check the issues picker for whichever row was clicked.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            self::LIST_SQL .
            " WHERE e.patient_id = :patient_id AND e.deleted_at IS NULL
              ORDER BY e.date_of_service DESC, e.id DESC"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * The patient's existing allergies, problems, medications, and health
     * concerns, in one combined pick-list for "Link Issues to This Visit".
     */
    public function listLinkableIssues(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT 'allergy' AS issue_type, pa.id AS issue_id, al.name AS label
             FROM patient_allergies pa
             JOIN allergies al ON al.id = pa.allergy_id
             WHERE pa.patient_id = :patient_id1 AND pa.deleted_at IS NULL

             UNION ALL

             SELECT 'problem' AS issue_type, pmp.id AS issue_id, pmp.title AS label
             FROM patient_medical_problems pmp
             WHERE pmp.patient_id = :patient_id2 AND pmp.deleted_at IS NULL

             UNION ALL

             SELECT 'medication' AS issue_type, pm.id AS issue_id, pm.title AS label
             FROM patient_medications pm
             WHERE pm.patient_id = :patient_id3 AND pm.deleted_at IS NULL

             UNION ALL

             SELECT 'health_concern' AS issue_type, phc.id AS issue_id, phc.title AS label
             FROM patient_health_concerns phc
             WHERE phc.patient_id = :patient_id4 AND phc.deleted_at IS NULL

             ORDER BY issue_type, label"
        );

        $stmt->execute([
            'patient_id1' => $patientId,
            'patient_id2' => $patientId,
            'patient_id3' => $patientId,
            'patient_id4' => $patientId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record an encounter for a patient, along with any linked issues.
     */
    public function store(int $patientId, int $createdBy, array $details, array $issueLinks = [], array $billingCodes = []): array
    {
        $errors = $this->validate($details);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $data = $this->filterDetails($details);
        $data['patient_id'] = $patientId;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new Encounter())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record encounter.'
            ];
        }

        $this->syncIssues($id, $issueLinks);
        $this->syncBillingCodes($id, $billingCodes);

        return [
            'success' => true,
            'message' => 'Encounter added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update an existing encounter's details, linked issues, and billing codes.
     */
    public function update(int $id, array $details, int $updatedBy, array $issueLinks = [], array $billingCodes = []): array
    {
        $record = (new Encounter())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Encounter record not found.'
            ];
        }

        $errors = $this->validate($details);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $data = $this->filterDetails($details);
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new Encounter())->update($data, $id);

        $this->syncIssues($id, $issueLinks);
        $this->syncBillingCodes($id, $billingCodes);

        return [
            'success' => true,
            'message' => 'Encounter updated successfully.'
        ];
    }

    /**
     * Soft-delete a recorded encounter.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = (new Encounter())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Encounter record not found.'
            ];
        }

        (new Encounter())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Encounter removed successfully.'
        ];
    }

    public function find(int $id): ?array
    {
        return (new Encounter())->where('id', $id)->first();
    }

    /**
     * Replace an encounter's linked issues with the given set.
     */
    private function syncIssues(int $encounterId, array $issueLinks): void
    {
        (new EncounterIssue())->where('encounter_id', $encounterId)->delete();

        $validTypes = ['allergy', 'problem', 'medication', 'health_concern'];
        $now = date('Y-m-d H:i:s');

        foreach ($issueLinks as $link) {
            $type = $link['issue_type'] ?? null;
            $issueId = (int) ($link['issue_id'] ?? 0);

            if (!in_array($type, $validTypes, true) || !$issueId) {
                continue;
            }

            (new EncounterIssue())->create([
                'encounter_id' => $encounterId,
                'issue_type' => $type,
                'issue_id' => $issueId,
                'created_at' => $now
            ]);
        }
    }

    /**
     * Replace an encounter's billing codes with the given set. Codes are
     * captured as a snapshot (type/code/description/fee) rather than
     * referencing the codes catalog by id, so edits to the catalog later
     * don't retroactively change what was billed.
     */
    private function syncBillingCodes(int $encounterId, array $billingCodes): void
    {
        (new EncounterBillingCode())->where('encounter_id', $encounterId)->delete();

        $now = date('Y-m-d H:i:s');

        foreach ($billingCodes as $entry) {
            $codeType = trim((string) ($entry['code_type'] ?? ''));
            $code = trim((string) ($entry['code'] ?? ''));

            if ($codeType === '' || $code === '') {
                continue;
            }

            $fee = $entry['fee'] ?? null;

            (new EncounterBillingCode())->create([
                'encounter_id' => $encounterId,
                'code_type' => $codeType,
                'code' => $code,
                'description' => $entry['description'] ?? null,
                'fee' => ($fee === '' || $fee === null) ? null : $fee,
                'created_at' => $now
            ]);
        }
    }

    private function validate(array $details): array
    {
        $errors = [];

        if (empty($details['visit_category_id'])) {
            $errors['visit_category_id'] = 'Visit category is required.';
        }

        if (empty($details['date_of_service'])) {
            $errors['date_of_service'] = 'Date of service is required.';
        }

        return $errors;
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if (!array_key_exists($field, $details)) {
                continue;
            }

            $value = $details[$field];

            if ($field === 'in_collection') {
                $result[$field] = $value ? 1 : 0;
                continue;
            }

            $result[$field] = $value === '' ? null : $value;
        }

        return $result;
    }
}
