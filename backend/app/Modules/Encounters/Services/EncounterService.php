<?php

namespace App\Modules\Encounters\Services;

use App\Core\Database;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Encounters\Models\EncounterBillingCode;
use App\Modules\Encounters\Models\EncounterIssue;
use App\Modules\Patients\Models\Patient;
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
        'discharge_disposition_id', 'reason_for_visit',
        'hitech_restriction_requested', 'hitech_restriction_date', 'hitech_restriction_operator_id',
        'hitech_paid_in_full', 'hitech_payment_reference', 'hitech_restriction_notes', 'claim_suppressed'
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
                e.hitech_restriction_requested, e.hitech_restriction_date, e.hitech_restriction_operator_id,
                e.hitech_paid_in_full, e.hitech_payment_reference, e.hitech_restriction_notes, e.claim_suppressed,
                e.bill_status, e.x12_status,
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
     * Get a consolidated transfer summary for a patient across a specified date range
     * or subset of encounters, including per-encounter vitals, clinical/SOAP notes,
     * instructions, care plans, sections, and patient baseline allergies/problems/medications.
     */
    public function getTransferSummary(int $patientId, ?string $dateFrom = null, ?string $dateTo = null, ?array $encounterIds = null): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient) {
            return [];
        }

        // 1. Fetch all encounters for this patient
        $allEncounters = $this->list($patientId);
        $filteredEncounters = [];

        foreach ($allEncounters as $encounter) {
            $encId = (int) $encounter['id'];
            if ($encounterIds !== null && !in_array($encId, $encounterIds, true)) {
                continue;
            }

            $dos = substr((string) ($encounter['date_of_service'] ?? ''), 0, 10);
            if ($dateFrom && $dos < $dateFrom) {
                continue;
            }
            if ($dateTo && $dos > $dateTo) {
                continue;
            }

            $filteredEncounters[] = $encounter;
        }

        // 2. Fetch full clinical details for each filtered encounter
        $vitalService = new \App\Modules\EncounterVitals\Services\EncounterVitalService();
        $soapService = new \App\Modules\EncounterSoapNotes\Services\EncounterSoapNoteService();
        $clinicalNoteService = new \App\Modules\EncounterClinicalNoteItems\Services\EncounterClinicalNoteItemService();
        $clinicalInstructionService = new \App\Modules\EncounterClinicalInstructionItems\Services\EncounterClinicalInstructionItemService();
        $carePlanService = new \App\Modules\EncounterCarePlanItems\Services\EncounterCarePlanItemService();
        $sectionService = new \App\Modules\EncounterSections\Services\EncounterSectionService();
        $functionalCognitiveService = new \App\Modules\EncounterFunctionalCognitiveStatusItems\Services\EncounterFunctionalCognitiveStatusItemService();
        $observationService = new \App\Modules\EncounterObservationItems\Services\EncounterObservationItemService();
        $rosService = new \App\Modules\EncounterReviewOfSystems\Services\EncounterReviewOfSystemService();

        $detailedEncounters = [];
        foreach ($filteredEncounters as $enc) {
            $id = (int) $enc['id'];
            $detailedEnc = $enc;

            try { $detailedEnc['vitals'] = $vitalService->find($id); } catch (\Throwable $e) { $detailedEnc['vitals'] = null; }
            try { $detailedEnc['soap_notes'] = $soapService->list($id); } catch (\Throwable $e) { $detailedEnc['soap_notes'] = []; }
            try { $detailedEnc['clinical_notes'] = $clinicalNoteService->list($id); } catch (\Throwable $e) { $detailedEnc['clinical_notes'] = []; }
            try { $detailedEnc['clinical_instructions'] = $clinicalInstructionService->list($id); } catch (\Throwable $e) { $detailedEnc['clinical_instructions'] = []; }
            try { $detailedEnc['care_plan_items'] = $carePlanService->list($id); } catch (\Throwable $e) { $detailedEnc['care_plan_items'] = []; }
            try { $detailedEnc['sections'] = $sectionService->list($id); } catch (\Throwable $e) { $detailedEnc['sections'] = []; }
            try { $detailedEnc['functional_cognitive_items'] = $functionalCognitiveService->list($id); } catch (\Throwable $e) { $detailedEnc['functional_cognitive_items'] = []; }
            try { $detailedEnc['observation_items'] = $observationService->list($id); } catch (\Throwable $e) { $detailedEnc['observation_items'] = []; }
            try { $detailedEnc['review_of_systems'] = $rosService->find($id); } catch (\Throwable $e) { $detailedEnc['review_of_systems'] = null; }

            $detailedEncounters[] = $detailedEnc;
        }

        // 3. Fetch patient baseline medical background for transfer continuity of care
        $allergies = [];
        $problems = [];
        $medications = [];
        $insurances = [];

        try { $allergies = (new \App\Modules\PatientAllergies\Services\PatientAllergyService())->list($patientId); } catch (\Throwable $e) {}
        try { $problems = (new \App\Modules\PatientMedicalProblems\Services\PatientMedicalProblemService())->list($patientId); } catch (\Throwable $e) {}
        try { $medications = (new \App\Modules\PatientMedications\Services\PatientMedicationService())->list($patientId); } catch (\Throwable $e) {}
        try { $insurances = (new \App\Modules\PatientInsurances\Services\PatientInsuranceService())->list($patientId); } catch (\Throwable $e) {}

        return [
            'patient' => $patient,
            'encounters' => $detailedEncounters,
            'allergies' => $allergies,
            'problems' => $problems,
            'medications' => $medications,
            'insurances' => $insurances,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'total_encounters' => count($detailedEncounters),
            'generated_at' => date('Y-m-d H:i:s')
        ];
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
        if (!empty($data['hitech_restriction_requested']) && empty($data['hitech_restriction_operator_id'])) {
            $data['hitech_restriction_operator_id'] = $createdBy;
        }

        $id = (new Encounter())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record encounter.'
            ];
        }

        $this->syncIssues($id, $issueLinks);
        $this->syncBillingCodes($id, $billingCodes);

        // HITECH § 164.522(a)(1)(vi) Mandatory Out-of-Pocket Restriction Sync
        if (!empty($data['hitech_restriction_requested'])) {
            $this->syncHitechRegistry($id, $patientId, $data, $createdBy);
            \App\Core\AuditLogger::log(
                \App\Core\AuditLogger::CATEGORY_HITECH,
                \App\Core\AuditLogger::ACTION_HITECH_RESTRICTION_APPLIED,
                "HITECH § 164.522(a)(1)(vi) mandatory out-of-pocket health plan disclosure restriction applied to encounter #{$id}. Claim generation suppressed.",
                $patientId,
                $createdBy
            );
        }

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

        $wasRestricted = !empty($record['hitech_restriction_requested']);
        $nowRestricted = isset($data['hitech_restriction_requested']) ? !empty($data['hitech_restriction_requested']) : $wasRestricted;

        if ($nowRestricted && empty($data['hitech_restriction_operator_id'])) {
            $data['hitech_restriction_operator_id'] = $updatedBy;
        }

        (new Encounter())->update($data, $id);

        $this->syncIssues($id, $issueLinks);
        $this->syncBillingCodes($id, $billingCodes);

        $patientId = (int) $record['patient_id'];

        // Audit & Registry sync for HITECH restriction transitions
        if (!$wasRestricted && $nowRestricted) {
            $this->syncHitechRegistry($id, $patientId, $data, $updatedBy);
            \App\Core\AuditLogger::log(
                \App\Core\AuditLogger::CATEGORY_HITECH,
                \App\Core\AuditLogger::ACTION_HITECH_RESTRICTION_APPLIED,
                "HITECH § 164.522(a)(1)(vi) mandatory out-of-pocket health plan restriction applied to encounter #{$id}. Claim generation suppressed.",
                $patientId,
                $updatedBy
            );
        } elseif ($wasRestricted && !$nowRestricted) {
            $this->removeHitechRegistry($id);
            \App\Core\AuditLogger::log(
                \App\Core\AuditLogger::CATEGORY_HITECH,
                \App\Core\AuditLogger::ACTION_HITECH_RESTRICTION_REMOVED,
                "HITECH § 164.522(a)(1)(vi) out-of-pocket health plan restriction removed for encounter #{$id}. Claim suppression lifted.",
                $patientId,
                $updatedBy
            );
        } elseif ($nowRestricted) {
            $this->syncHitechRegistry($id, $patientId, $data, $updatedBy);
        }

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
        'patient_name', 'patient_id', 'insurance', 'encounter', 'provider', 'facility',
        'hitech_restriction'
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

                case 'hitech_restriction':
                    if (strtolower($value) === 'restricted') {
                        $where[] = "e.hitech_restriction_requested = 1";
                    } elseif (strtolower($value) === 'unrestricted') {
                        $where[] = "e.hitech_restriction_requested = 0";
                    }
                    break;
            }
        }

        $stmt = Database::connection()->prepare(
            "SELECT e.id AS encounter_id, e.patient_id, e.date_of_service, e.bill_status, e.x12_status,
                    e.hitech_restriction_requested, e.hitech_restriction_date, e.hitech_paid_in_full, e.hitech_payment_reference, e.claim_suppressed,
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
                'hitech_restriction_requested' => (bool) $row['hitech_restriction_requested'],
                'hitech_restriction_date' => $row['hitech_restriction_date'],
                'hitech_paid_in_full' => (bool) $row['hitech_paid_in_full'],
                'hitech_payment_reference' => $row['hitech_payment_reference'],
                'claim_suppressed' => (bool) $row['claim_suppressed'],
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

        // HITECH § 164.522(a)(1)(vi) Enforcement:
        // If an encounter is flagged with HITECH out-of-pocket restriction or claim suppression,
        // it is legally prohibited from being marked as 'sent' or 'accepted' to health insurance / clearinghouse.
        if (in_array($status, ['sent', 'accepted'], true)) {
            $isRestricted = !empty($record['hitech_restriction_requested']) || !empty($record['claim_suppressed']);
            if ($isRestricted) {
                \App\Core\AuditLogger::log(
                    \App\Core\AuditLogger::CATEGORY_HITECH,
                    \App\Core\AuditLogger::ACTION_HITECH_CLAIM_BLOCKED,
                    "EDI X12 claim dispatch blocked for encounter #{$encounterId}. Mandatory out-of-pocket restriction (§ 164.522(a)(1)(vi)) is active.",
                    (int) $record['patient_id'],
                    $userId
                );

                return [
                    'success' => false,
                    'message' => 'EDI X12 claim transmission is legally prohibited for encounter #' . $encounterId . ' under HITECH § 164.522(a)(1)(vi) mandatory out-of-pocket restriction. Claim is suppressed.'
                ];
            }
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

            if ($field === 'hitech_restriction_requested' || $field === 'hitech_paid_in_full' || $field === 'claim_suppressed') {
                $result[$field] = (!empty($value) && $value !== 'false' && $value !== '0') ? 1 : 0;
                continue;
            }

            $result[$field] = $value === '' ? null : $value;
        }

        // Under 45 CFR § 164.522(a)(1)(vi), if HITECH restriction is requested, claim suppression is MANDATORY
        if (!empty($result['hitech_restriction_requested'])) {
            $result['claim_suppressed'] = 1;
            if (empty($result['hitech_restriction_date'])) {
                $result['hitech_restriction_date'] = date('Y-m-d H:i:s');
            }
        }

        return $result;
    }

    /**
     * Synchronize encounter's HITECH restriction to hipaa_hitech_restrictions registry.
     */
    public function syncHitechRegistry(int $encounterId, int $patientId, array $data, int $operatorId): void
    {
        $existing = (new \App\Modules\Encounters\Models\HitechRestriction())
            ->where('encounter_id', $encounterId)
            ->first();

        $now = date('Y-m-d H:i:s');
        $recordData = [
            'encounter_id' => $encounterId,
            'patient_id' => $patientId,
            'restriction_requested' => 1,
            'paid_in_full' => !empty($data['hitech_paid_in_full']) ? 1 : 0,
            'payment_reference' => $data['hitech_payment_reference'] ?? null,
            'restricted_health_plan' => $data['restricted_health_plan'] ?? 'All Health Plans',
            'restriction_notes' => $data['hitech_restriction_notes'] ?? null,
            'claim_suppressed' => 1,
            'requested_at' => $data['hitech_restriction_date'] ?? $now,
            'operator_id' => $operatorId,
            'updated_at' => $now
        ];

        if ($existing) {
            (new \App\Modules\Encounters\Models\HitechRestriction())->update($recordData, (int) $existing['id']);
        } else {
            $recordData['created_at'] = $now;
            (new \App\Modules\Encounters\Models\HitechRestriction())->create($recordData);
        }
    }

    /**
     * Mark HITECH restriction lifted/removed in the registry.
     */
    public function removeHitechRegistry(int $encounterId): void
    {
        $existing = (new \App\Modules\Encounters\Models\HitechRestriction())
            ->where('encounter_id', $encounterId)
            ->first();

        if ($existing) {
            (new \App\Modules\Encounters\Models\HitechRestriction())->update([
                'restriction_requested' => 0,
                'claim_suppressed' => 0,
                'updated_at' => date('Y-m-d H:i:s')
            ], (int) $existing['id']);
        }
    }

    /**
     * Set or toggle HITECH out-of-pocket restriction directly for an encounter.
     */
    public function setHitechRestriction(int $encounterId, array $data, int $userId): array
    {
        $record = (new Encounter())->where('id', $encounterId)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Encounter not found.'];
        }

        $patientId = (int) $record['patient_id'];
        $requested = (!empty($data['hitech_restriction_requested']) && $data['hitech_restriction_requested'] !== 'false' && $data['hitech_restriction_requested'] !== '0') ? 1 : 0;
        $paidInFull = (!empty($data['hitech_paid_in_full']) && $data['hitech_paid_in_full'] !== 'false' && $data['hitech_paid_in_full'] !== '0') ? 1 : 0;
        $paymentRef = !empty($data['hitech_payment_reference']) ? trim((string) $data['hitech_payment_reference']) : null;
        $notes = !empty($data['hitech_restriction_notes']) ? trim((string) $data['hitech_restriction_notes']) : null;
        $targetPlan = !empty($data['restricted_health_plan']) ? trim((string) $data['restricted_health_plan']) : 'All Health Plans';
        $now = date('Y-m-d H:i:s');

        $updateData = [
            'hitech_restriction_requested' => $requested,
            'hitech_paid_in_full' => $paidInFull,
            'hitech_payment_reference' => $paymentRef,
            'hitech_restriction_notes' => $notes,
            'claim_suppressed' => $requested ? 1 : 0,
            'updated_at' => $now,
            'updated_by' => $userId
        ];

        if ($requested) {
            $updateData['hitech_restriction_date'] = $record['hitech_restriction_date'] ?? $now;
            $updateData['hitech_restriction_operator_id'] = $userId;
        }

        (new Encounter())->update($updateData, $encounterId);

        if ($requested) {
            $this->syncHitechRegistry($encounterId, $patientId, array_merge($updateData, ['restricted_health_plan' => $targetPlan]), $userId);
            \App\Core\AuditLogger::log(
                \App\Core\AuditLogger::CATEGORY_HITECH,
                \App\Core\AuditLogger::ACTION_HITECH_RESTRICTION_APPLIED,
                "HITECH § 164.522(a)(1)(vi) mandatory restriction set on encounter #{$encounterId} for patient #{$patientId}. Paid in full: " . ($paidInFull ? 'Yes' : 'No') . ". Claim suppressed.",
                $patientId,
                $userId
            );
        } else {
            $this->removeHitechRegistry($encounterId);
            \App\Core\AuditLogger::log(
                \App\Core\AuditLogger::CATEGORY_HITECH,
                \App\Core\AuditLogger::ACTION_HITECH_RESTRICTION_REMOVED,
                "HITECH § 164.522(a)(1)(vi) restriction removed on encounter #{$encounterId} for patient #{$patientId}. Claim suppression lifted.",
                $patientId,
                $userId
            );
        }

        return [
            'success' => true,
            'message' => $requested ? 'HITECH out-of-pocket restriction applied and claim suppressed.' : 'HITECH restriction removed.',
            'data' => [
                'encounter_id' => $encounterId,
                'hitech_restriction_requested' => (bool) $requested,
                'claim_suppressed' => (bool) ($requested ? 1 : 0),
                'hitech_paid_in_full' => (bool) $paidInFull,
                'hitech_payment_reference' => $paymentRef
            ]
        ];
    }

    /**
     * Get HITECH restriction details for an encounter.
     */
    public function getHitechRestriction(int $encounterId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT hr.*, e.date_of_service, e.x12_status, e.bill_status,
                    p.patient_no, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS patient_name,
                    u.username AS operator_name
             FROM hipaa_hitech_restrictions hr
             JOIN encounters e ON e.id = hr.encounter_id
             JOIN patients p ON p.id = hr.patient_id
             LEFT JOIN users u ON u.id = hr.operator_id
             WHERE hr.encounter_id = :enc_id
             LIMIT 1"
        );
        $stmt->execute(['enc_id' => $encounterId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row['restriction_requested'] = (bool) $row['restriction_requested'];
            $row['paid_in_full'] = (bool) $row['paid_in_full'];
            $row['claim_suppressed'] = (bool) $row['claim_suppressed'];
            return $row;
        }

        // Fall back to encounters table if not yet synced in registry
        $enc = (new Encounter())->where('id', $encounterId)->first();
        if ($enc && !empty($enc['hitech_restriction_requested'])) {
            return [
                'encounter_id' => (int) $enc['id'],
                'patient_id' => (int) $enc['patient_id'],
                'restriction_requested' => (bool) $enc['hitech_restriction_requested'],
                'paid_in_full' => (bool) $enc['hitech_paid_in_full'],
                'payment_reference' => $enc['hitech_payment_reference'],
                'restricted_health_plan' => 'All Health Plans',
                'restriction_notes' => $enc['hitech_restriction_notes'],
                'claim_suppressed' => (bool) $enc['claim_suppressed'],
                'requested_at' => $enc['hitech_restriction_date'],
                'operator_id' => $enc['hitech_restriction_operator_id']
            ];
        }

        return null;
    }

    /**
     * List HITECH restriction records for regulatory review & OCR audit reporting.
     */
    public function listHitechRestrictions(array $filters = []): array
    {
        $db = Database::connection();
        $where = ['e.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['patient_id'])) {
            $where[] = 'hr.patient_id = :patient_id';
            $params['patient_id'] = (int) $filters['patient_id'];
        }

        if (isset($filters['restriction_requested']) && $filters['restriction_requested'] !== '') {
            $where[] = 'hr.restriction_requested = :req';
            $params['req'] = (int) $filters['restriction_requested'];
        }

        if (isset($filters['paid_in_full']) && $filters['paid_in_full'] !== '') {
            $where[] = 'hr.paid_in_full = :pif';
            $params['pif'] = (int) $filters['paid_in_full'];
        }

        if (!empty($filters['date_from'])) {
            $where[] = 'hr.requested_at >= :date_from';
            $params['date_from'] = $filters['date_from'] . ' 00:00:00';
        }

        if (!empty($filters['date_to'])) {
            $where[] = 'hr.requested_at <= :date_to';
            $params['date_to'] = $filters['date_to'] . ' 23:59:59';
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $where[] = '(p.patient_no LIKE :term OR p.first_name LIKE :term OR p.last_name LIKE :term OR hr.payment_reference LIKE :term OR hr.restriction_notes LIKE :term)';
            $params['term'] = $term;
        }

        $sql = "SELECT hr.*, e.date_of_service, e.bill_status, e.x12_status,
                       p.patient_no, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS patient_name,
                       u.username AS operator_name
                FROM hipaa_hitech_restrictions hr
                JOIN encounters e ON e.id = hr.encounter_id
                JOIN patients p ON p.id = hr.patient_id
                LEFT JOIN users u ON u.id = hr.operator_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY hr.requested_at DESC, hr.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Stats calculation
        $statsStmt = $db->query(
            "SELECT 
                COUNT(*) AS total_restrictions,
                SUM(CASE WHEN restriction_requested = 1 THEN 1 ELSE 0 END) AS active_restrictions,
                SUM(CASE WHEN paid_in_full = 1 THEN 1 ELSE 0 END) AS paid_in_full_count,
                SUM(CASE WHEN claim_suppressed = 1 THEN 1 ELSE 0 END) AS suppressed_claims_count
             FROM hipaa_hitech_restrictions"
        );
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: [
            'total_restrictions' => 0,
            'active_restrictions' => 0,
            'paid_in_full_count' => 0,
            'suppressed_claims_count' => 0
        ];

        return [
            'restrictions' => $rows,
            'stats' => [
                'total_restrictions' => (int) ($stats['total_restrictions'] ?? 0),
                'active_restrictions' => (int) ($stats['active_restrictions'] ?? 0),
                'paid_in_full_count' => (int) ($stats['paid_in_full_count'] ?? 0),
                'suppressed_claims_count' => (int) ($stats['suppressed_claims_count'] ?? 0)
            ]
        ];
    }

    /**
     * Export HITECH Out-of-Pocket Insurance Restriction Registry as RFC 4180 CSV for OCR audit review.
     */
    public function exportHitechRestrictionsCsv(array $filters = []): string
    {
        $data = $this->listHitechRestrictions($filters);
        $output = fopen('php://temp', 'r+');

        fputcsv($output, [
            '# USINTELLIX HOSPITAL MANAGEMENT SYSTEM - OCR AUDIT COMPLIANCE REPORT',
            'HITECH Act § 13405(a) / 45 CFR § 164.522(a)(1)(vi) Mandatory Out-of-Pocket Insurance Disclosure Restriction Registry',
            'Generated: ' . date('Y-m-d H:i:s')
        ]);
        fputcsv($output, []); // empty line

        fputcsv($output, [
            'Registry ID',
            'Encounter ID',
            'Date of Service',
            'Patient MRN',
            'Patient Name',
            'Restriction Requested',
            'Paid in Full',
            'Payment Reference',
            'Restricted Health Plan',
            'Claim Suppressed',
            'X12 Status',
            'Date Requested',
            'Operator Name',
            'Restriction Notes'
        ]);

        foreach ($data['restrictions'] as $row) {
            fputcsv($output, [
                $row['id'],
                $row['encounter_id'],
                $row['date_of_service'],
                $row['patient_no'],
                $row['patient_name'],
                $row['restriction_requested'] ? 'YES (Mandatory)' : 'NO',
                $row['paid_in_full'] ? 'YES (Paid in Full)' : 'NO',
                $row['payment_reference'] ?? 'N/A',
                $row['restricted_health_plan'] ?? 'All Health Plans',
                $row['claim_suppressed'] ? 'SUPPRESSED (Compliant)' : 'NOT SUPPRESSED',
                strtoupper($row['x12_status'] ?? 'UNASSIGNED'),
                $row['requested_at'],
                $row['operator_name'] ?? 'System',
                $row['restriction_notes'] ?? ''
            ]);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        \App\Core\AuditLogger::log(
            \App\Core\AuditLogger::CATEGORY_HITECH,
            \App\Core\AuditLogger::ACTION_HITECH_EXPORT_REGISTRY,
            "Exported HITECH § 164.522(a)(1)(vi) Out-of-Pocket Restriction Registry CSV with " . count($data['restrictions']) . " records."
        );

        return $csv;
    }
}

