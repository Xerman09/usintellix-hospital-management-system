<?php

namespace App\Modules\PatientImmunizations\Services;

use App\Core\Database;
use App\Modules\CvxCodes\Models\CvxCode;
use App\Modules\PatientImmunizations\Models\PatientImmunization;
use PDO;

class PatientImmunizationService
{
    /**
     * Detail fields that can be set on a patient immunization record,
     * beyond the patient/CVX code link itself.
     */
    private const DETAIL_FIELDS = [
        'vaccine_name', 'administered_at', 'amount_administered', 'amount_unit',
        'expiration_date', 'manufacturer', 'lot_number', 'administered_by',
        'administered_by_provider_id', 'vis_date_given', 'vis_date_document',
        'route', 'administration_site', 'notes', 'information_source',
        'completion_status', 'refusal_reason', 'reason_code',
        'ordering_provider_id', 'encounter_id'
    ];

    private const LIST_SQL =
        "SELECT pi.id, pi.patient_id, pi.cvx_code_id, pi.cvx_code, pi.vaccine_name,
                pi.administered_at, pi.amount_administered, pi.amount_unit, pi.expiration_date,
                pi.manufacturer, pi.lot_number, pi.administered_by, pi.administered_by_provider_id,
                NULLIF(TRIM(CONCAT(abpe.first_name, ' ', abpe.last_name)), '') AS administered_by_provider_name,
                pi.vis_date_given, pi.vis_date_document, pi.route, pi.administration_site,
                pi.notes, pi.information_source, pi.completion_status, pi.refusal_reason, pi.reason_code,
                pi.ordering_provider_id,
                NULLIF(TRIM(CONCAT(ope.first_name, ' ', ope.last_name)), '') AS ordering_provider_name,
                pi.encounter_id, e.date_of_service AS encounter_date,
                pi.created_at, pi.updated_at
         FROM patient_immunizations pi
         LEFT JOIN providers abp ON abp.id = pi.administered_by_provider_id
         LEFT JOIN employees abpe ON abpe.id = abp.employee_id
         LEFT JOIN providers op ON op.id = pi.ordering_provider_id
         LEFT JOIN employees ope ON ope.id = op.employee_id
         LEFT JOIN encounters e ON e.id = pi.encounter_id";

    /**
     * List a patient's recorded immunizations, most recently administered first.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            self::LIST_SQL .
            " WHERE pi.patient_id = :patient_id AND pi.deleted_at IS NULL
              ORDER BY pi.administered_at DESC, pi.id DESC"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record an immunization for a patient. The CVX code may optionally
     * reference the CVX code catalog; the code and vaccine name are always
     * stored directly since they may be freely typed or picked via Finder.
     */
    public function store(int $patientId, ?int $cvxCodeId, int $createdBy, array $details = []): array
    {
        $cvxCode = trim((string) ($details['cvx_code'] ?? ''));

        if ($cvxCode === '') {
            return [
                'success' => false,
                'message' => 'Immunization (CVX code) is required.'
            ];
        }

        if ($cvxCodeId) {
            $cvxRecord = (new CvxCode())->where('id', $cvxCodeId)->first();

            if (!$cvxRecord || $cvxRecord['deleted_at'] !== null) {
                return [
                    'success' => false,
                    'message' => 'Selected CVX code does not exist.'
                ];
            }
        }

        $data = $this->filterDetails($details);
        $data['cvx_code'] = $cvxCode;
        $data['patient_id'] = $patientId;
        $data['cvx_code_id'] = $cvxCodeId ?: null;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientImmunization())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record immunization.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Immunization added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient immunization record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Immunization record not found.'
            ];
        }

        $cvxCode = trim((string) ($details['cvx_code'] ?? ''));

        if ($cvxCode === '') {
            return [
                'success' => false,
                'message' => 'Immunization (CVX code) is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['cvx_code'] = $cvxCode;
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new PatientImmunization())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Immunization updated successfully.'
        ];
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

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new PatientImmunization())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient immunization.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Immunization record not found.'
            ];
        }

        (new PatientImmunization())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Immunization removed successfully.'
        ];
    }
}
