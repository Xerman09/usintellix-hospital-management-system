<?php

namespace App\Modules\PatientTransactions\Services;

use App\Core\Database;
use App\Modules\PatientTransactions\Models\PatientTransaction;
use PDO;

class PatientTransactionService
{
    /**
     * Detail fields that can be set on a patient transaction record, beyond
     * the patient link itself. Only the 'referral' transaction_type is
     * currently supported by the frontend, but the field set already
     * covers both the Referral and Counter-Referral tabs.
     */
    private const DETAIL_FIELDS = [
        'transaction_type', 'sent_summary_of_care', 'sent_summary_of_care_electronically',
        'confirmed_recipient_received_summary', 'referral_date', 'external_referral',
        'reason', 'risk_level', 'requested_service', 'refer_by_provider_id',
        'refer_to_provider_id', 'referrer_diagnosis', 'include_vitals', 'billing_facility_id',
        'reply_date', 'reply_from', 'presumed_diagnosis', 'final_diagnosis', 'documents',
        'findings', 'services_provided', 'recommendations', 'prescriptions_referrals'
    ];

    private const LIST_SQL =
        "SELECT pt.*,
                NULLIF(TRIM(CONCAT(rbe.first_name, ' ', rbe.last_name)), '') AS refer_by_name,
                NULLIF(TRIM(CONCAT(rte.first_name, ' ', rte.last_name)), '') AS refer_to_name,
                f.name AS billing_facility_name
         FROM patient_transactions pt
         LEFT JOIN providers rbp ON rbp.id = pt.refer_by_provider_id
         LEFT JOIN employees rbe ON rbe.id = rbp.employee_id
         LEFT JOIN providers rtp ON rtp.id = pt.refer_to_provider_id
         LEFT JOIN employees rte ON rte.id = rtp.employee_id
         LEFT JOIN facilities f ON f.id = pt.billing_facility_id
         WHERE pt.patient_id = :patient_id AND pt.deleted_at IS NULL
         ORDER BY COALESCE(pt.referral_date, pt.created_at) DESC, pt.id DESC";

    /**
     * List a patient's recorded transactions.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(self::LIST_SQL);
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record a transaction for a patient.
     */
    public function store(int $patientId, int $createdBy, array $details = []): array
    {
        $data = $this->filterDetails($details);
        $data['patient_id'] = $patientId;
        $data['transaction_type'] = $data['transaction_type'] ?? 'referral';
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientTransaction())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record transaction.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Transaction added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient transaction record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Transaction record not found.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new PatientTransaction())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Transaction updated successfully.'
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

            if (in_array($field, ['sent_summary_of_care', 'sent_summary_of_care_electronically', 'confirmed_recipient_received_summary'], true)) {
                $result[$field] = !empty($details[$field]) ? 1 : 0;
                continue;
            }

            if (in_array($field, ['refer_by_provider_id', 'refer_to_provider_id', 'billing_facility_id'], true)) {
                $result[$field] = !empty($details[$field]) ? (int) $details[$field] : null;
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new PatientTransaction())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient transaction.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Transaction record not found.'
            ];
        }

        (new PatientTransaction())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Transaction removed successfully.'
        ];
    }
}
