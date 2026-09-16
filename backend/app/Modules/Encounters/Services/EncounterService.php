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
                e.reason_for_visit, e.billing_note, e.created_at, e.updated_at,
                (SELECT GROUP_CONCAT(CONCAT(ei.issue_type, ':', ei.issue_id) SEPARATOR ',')
                 FROM encounter_issues ei
                 WHERE ei.encounter_id = e.id) AS linked_issues,
                (SELECT GROUP_CONCAT(CONCAT(ebc.code_type, ':', ebc.code, ':', ebc.description) SEPARATOR '||')
                 FROM encounter_billing_codes ebc
                 WHERE ebc.encounter_id = e.id AND ebc.deleted_at IS NULL) AS billing_codes_summary,
                (SELECT SUM(ebc.fee * ebc.units)
                 FROM encounter_billing_codes ebc
                 WHERE ebc.encounter_id = e.id AND ebc.deleted_at IS NULL) AS billing_fee_total
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

             UNION ALL

             SELECT 'surgery' AS issue_type, ps.id AS issue_id, ps.title AS label
             FROM patient_surgeries ps
             WHERE ps.patient_id = :patient_id5 AND ps.deleted_at IS NULL

             UNION ALL

             SELECT 'dental' AS issue_type, pdi.id AS issue_id, pdi.title AS label
             FROM patient_dental_issues pdi
             WHERE pdi.patient_id = :patient_id6 AND pdi.deleted_at IS NULL

             ORDER BY issue_type, label"
        );

        $stmt->execute([
            'patient_id1' => $patientId,
            'patient_id2' => $patientId,
            'patient_id3' => $patientId,
            'patient_id4' => $patientId,
            'patient_id5' => $patientId,
            'patient_id6' => $patientId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Links one existing patient issue to an encounter (idempotent -- a
     * duplicate link is silently a no-op rather than an error), for
     * Popups > Issues' click-to-relate action. Deliberately NOT routed
     * through update()/syncIssues(): that path does a full delete-and-
     * recreate of both the encounter's issue links *and* its billing
     * codes together, and reconstructing "the rest of the encounter
     * unchanged" from the list-row shape alone would lose each billing
     * code's fee/units (the row summary that shape is built from never
     * carries them). This touches only `encounter_issues`, nothing else
     * on the encounter.
     */
    public function linkIssue(int $encounterId, string $issueType, int $issueId, int $userId): array
    {
        $validTypes = ['allergy', 'problem', 'medication', 'health_concern', 'surgery', 'dental'];

        if (!in_array($issueType, $validTypes, true) || !$issueId) {
            return ['success' => false, 'message' => 'A valid issue is required.'];
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();

        if (!$encounter || $encounter['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Encounter not found.'];
        }

        $existing = (new EncounterIssue())
            ->where('encounter_id', $encounterId)
            ->where('issue_type', $issueType)
            ->where('issue_id', $issueId)
            ->first();

        if (!$existing) {
            (new EncounterIssue())->create([
                'encounter_id' => $encounterId,
                'issue_type' => $issueType,
                'issue_id' => $issueId,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }

        return ['success' => true, 'message' => 'Linked successfully.'];
    }

    /**
     * Removes one issue-to-encounter link. See linkIssue() for why this
     * bypasses update()/syncIssues().
     */
    public function unlinkIssue(int $encounterId, string $issueType, int $issueId): array
    {
        (new EncounterIssue())
            ->where('encounter_id', $encounterId)
            ->where('issue_type', $issueType)
            ->where('issue_id', $issueId)
            ->delete();

        return ['success' => true, 'message' => 'Unlinked successfully.'];
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
     * The types of criteria the Billing Manager's "Choose Criteria"
     * builder accepts, in the order they're offered to the user.
     */
    public const BILLING_CRITERIA_TYPES = [
        'date_of_service', 'date_of_entry', 'billing_status', 'claim_type',
        'patient_name', 'patient_id', 'insurance', 'encounter', 'provider', 'facility'
    ];

    /**
     * Practice-wide billing worklist for the Billing Manager screen,
     * grouped by patient then by encounter (each encounter is one
     * "claim" in OpenEMR terms), with that encounter's charge lines.
     * Matches encounters against an arbitrary AND-combined list of
     * criteria built by the frontend's criteria picker -- each entry is
     * ['type' => one of BILLING_CRITERIA_TYPES, ...type-specific fields].
     * $providerId (set only when the caller is a doctor) restricts
     * results to that provider's own assigned patients, same scoping
     * rule EncounterController::ownsPatient() enforces for
     * single-encounter actions elsewhere.
     *
     * Capped at 200 matching encounters -- a practice-wide worklist
     * screen showing more than that at once wouldn't be usable anyway;
     * criteria are meant to narrow it down first, same as the real
     * screen this is modeled on.
     */
    public function listBillableGrouped(array $criteria, ?int $providerId): array
    {
        $where = ['e.deleted_at IS NULL'];
        $params = [];
        $i = 0;

        if ($providerId) {
            $where[] = 'p.provider_id = :provider_id';
            $params['provider_id'] = $providerId;
        }

        foreach ($criteria as $criterion) {
            $type = $criterion['type'] ?? '';
            $i++;

            if (!in_array($type, self::BILLING_CRITERIA_TYPES, true)) {
                continue;
            }

            if ($type === 'date_of_service' || $type === 'date_of_entry') {
                $column = $type === 'date_of_service' ? 'e.date_of_service' : 'e.created_at';
                $from = $criterion['from'] ?? null;
                $to = $criterion['to'] ?? null;

                if ($from) {
                    $where[] = "{$column} >= :from{$i}";
                    $params["from{$i}"] = $from;
                }

                if ($to) {
                    $where[] = "{$column} <= :to{$i}";
                    $params["to{$i}"] = $to . ' 23:59:59';
                }

                continue;
            }

            $value = trim((string) ($criterion['value'] ?? ''));

            if ($value === '') {
                continue;
            }

            switch ($type) {
                case 'billing_status':
                    if (in_array($value, ['unassigned', 'cleared'], true)) {
                        $where[] = "e.bill_status = :bill_status{$i}";
                        $params["bill_status{$i}"] = $value;
                    }
                    break;

                case 'claim_type':
                    if (in_array($value, ['primary', 'secondary', 'tertiary'], true)) {
                        $where[] = "EXISTS (SELECT 1 FROM patient_insurances pi
                                            WHERE pi.patient_id = e.patient_id AND pi.deleted_at IS NULL
                                              AND pi.insurance_type = :claim_type{$i})";
                        $params["claim_type{$i}"] = $value;
                    }
                    break;

                case 'patient_name':
                    $where[] = "(p.first_name LIKE :pname{$i} OR p.last_name LIKE :pname{$i})";
                    $params["pname{$i}"] = '%' . $value . '%';
                    break;

                case 'patient_id':
                    $where[] = "p.patient_no LIKE :pno{$i}";
                    $params["pno{$i}"] = '%' . $value . '%';
                    break;

                case 'insurance':
                    $where[] = "EXISTS (SELECT 1 FROM patient_insurances pi
                                        WHERE pi.patient_id = e.patient_id AND pi.deleted_at IS NULL
                                          AND pi.insurance_id = :insurance{$i})";
                    $params["insurance{$i}"] = (int) $value;
                    break;

                case 'encounter':
                    $where[] = "e.id = :encounter_id{$i}";
                    $params["encounter_id{$i}"] = (int) $value;
                    break;

                case 'provider':
                    $where[] = "e.encounter_provider_id = :enc_provider{$i}";
                    $params["enc_provider{$i}"] = (int) $value;
                    break;

                case 'facility':
                    $where[] = "e.facility_id = :facility{$i}";
                    $params["facility{$i}"] = (int) $value;
                    break;
            }
        }

        $stmt = Database::connection()->prepare(
            "SELECT e.id AS encounter_id, e.patient_id, e.date_of_service, e.bill_status, e.x12_status,
                    p.patient_no, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS patient_name, p.birthdate,
                    EXISTS (SELECT 1 FROM patient_insurances pi WHERE pi.patient_id = e.patient_id AND pi.deleted_at IS NULL) AS has_insurance
             FROM encounters e
             JOIN patients p ON p.id = e.patient_id AND p.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY e.date_of_service DESC, e.id DESC
             LIMIT 200"
        );

        $stmt->execute($params);

        $encounterRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$encounterRows) {
            return ['patients' => [], 'summary' => ['patient_count' => 0, 'encounter_count' => 0, 'total_charges' => 0]];
        }

        $encounterIds = array_map(fn ($row) => (int) $row['encounter_id'], $encounterRows);
        $placeholders = implode(',', array_fill(0, count($encounterIds), '?'));

        $chargeStmt = Database::connection()->prepare(
            "SELECT ebc.id, ebc.encounter_id, ebc.code_type, ebc.code, ebc.description, ebc.fee, ebc.units,
                    NULLIF(TRIM(CONCAT(epe.first_name, ' ', epe.last_name)), '') AS provider_name
             FROM encounter_billing_codes ebc
             JOIN encounters e ON e.id = ebc.encounter_id
             LEFT JOIN providers ep ON ep.id = e.encounter_provider_id
             LEFT JOIN employees epe ON epe.id = ep.employee_id
             WHERE ebc.encounter_id IN ({$placeholders}) AND ebc.deleted_at IS NULL
             ORDER BY ebc.id ASC"
        );
        $chargeStmt->execute($encounterIds);

        $chargesByEncounter = [];

        foreach ($chargeStmt->fetchAll(PDO::FETCH_ASSOC) as $charge) {
            $encId = (int) $charge['encounter_id'];
            $fee = (float) $charge['fee'];
            $units = (int) $charge['units'] ?: 1;

            $chargesByEncounter[$encId][] = [
                'id' => (int) $charge['id'],
                'code_type' => $charge['code_type'],
                'code' => $charge['code'],
                'description' => $charge['description'],
                'fee' => $fee,
                'units' => $units,
                'total' => round($fee * $units, 2),
                'provider_name' => $charge['provider_name']
            ];
        }

        $patients = [];
        $totalCharges = 0.0;

        foreach ($encounterRows as $row) {
            $patientId = (int) $row['patient_id'];
            $encounterId = (int) $row['encounter_id'];
            $charges = $chargesByEncounter[$encounterId] ?? [];
            $encounterTotal = array_sum(array_column($charges, 'total'));
            $totalCharges += $encounterTotal;

            if (!isset($patients[$patientId])) {
                $patients[$patientId] = [
                    'patient_id' => $patientId,
                    'patient_no' => $row['patient_no'],
                    'patient_name' => $row['patient_name'],
                    'age' => $this->calculateAge($row['birthdate']),
                    'has_insurance' => (bool) $row['has_insurance'],
                    'encounters' => []
                ];
            }

            $patients[$patientId]['encounters'][] = [
                'encounter_id' => $encounterId,
                'date_of_service' => $row['date_of_service'],
                'bill_status' => $row['bill_status'],
                'x12_status' => $row['x12_status'],
                'total_charges' => round($encounterTotal, 2),
                'charges' => $charges
            ];
        }

        $patients = array_values($patients);

        return [
            'patients' => $patients,
            'summary' => [
                'patient_count' => count($patients),
                'encounter_count' => count($encounterRows),
                'total_charges' => round($totalCharges, 2)
            ]
        ];
    }

    private function calculateAge(?string $birthdate): ?int
    {
        if (!$birthdate) {
            return null;
        }

        $dob = date_create($birthdate);

        if (!$dob) {
            return null;
        }

        return (int) date_create('now')->diff($dob)->y;
    }

    /**
     * Bulk-set the claim-level bill_status for a set of encounters
     * ("Mark as Cleared" / "Re-Open" on the Billing Manager screen).
     */
    public function setBillStatus(array $encounterIds, string $status, int $userId): array
    {
        $encounterIds = array_values(array_unique(array_map('intval', $encounterIds)));

        if (!$encounterIds || !in_array($status, ['unassigned', 'cleared'], true)) {
            return ['success' => false, 'message' => 'No visits selected.'];
        }

        $placeholders = implode(',', array_fill(0, count($encounterIds), '?'));

        if ($status === 'cleared') {
            $setSql = 'bill_status = ?, billed_at = ?, billed_by = ?';
            $params = [$status, date('Y-m-d H:i:s'), $userId, ...$encounterIds];
        } else {
            $setSql = 'bill_status = ?, billed_at = NULL, billed_by = NULL';
            $params = [$status, ...$encounterIds];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE encounters SET {$setSql} WHERE id IN ({$placeholders}) AND deleted_at IS NULL"
        );
        $stmt->execute($params);

        return ['success' => true, 'message' => $status === 'cleared' ? 'Marked as cleared.' : 'Re-opened.'];
    }

    /**
     * Set the manually-tracked X12 status label for one encounter/claim.
     * There's no real clearinghouse behind this -- it's the same kind of
     * staff-set tracking flag the real screen uses, just not wired to an
     * actual X12 837 transmission in this app.
     */
    public function setX12Status(int $encounterId, string $status, int $userId): array
    {
        if (!in_array($status, ['unassigned', 'sent', 'accepted', 'rejected'], true)) {
            return ['success' => false, 'message' => 'Invalid X12 status.'];
        }

        $record = (new Encounter())->where('id', $encounterId)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Encounter not found.'];
        }

        (new Encounter())->update([
            'x12_status' => $status,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $encounterId);

        return ['success' => true, 'message' => 'X12 status updated.'];
    }

    /**
     * Set an encounter's billing note. Kept separate from update() since
     * it's edited standalone from the Visit History billing view, not
     * through the full encounter form -- it shouldn't require the rest
     * of the record's required fields to be resubmitted.
     */
    public function updateBillingNote(int $id, ?string $note, int $updatedBy): array
    {
        $record = (new Encounter())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Encounter record not found.'
            ];
        }

        (new Encounter())->update([
            'billing_note' => ($note === null || trim($note) === '') ? null : $note,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Billing note saved successfully.'
        ];
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
            $units = isset($entry['units']) && $entry['units'] !== '' ? max(1, (int) $entry['units']) : 1;

            (new EncounterBillingCode())->create([
                'encounter_id' => $encounterId,
                'code_type' => $codeType,
                'code' => $code,
                'description' => $entry['description'] ?? null,
                'fee' => ($fee === '' || $fee === null) ? null : $fee,
                'units' => $units,
                'modifier' => $entry['modifier'] ?? null,
                'justify' => $entry['justify'] ?? null,
                'auth_number' => $entry['auth_number'] ?? null,
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
