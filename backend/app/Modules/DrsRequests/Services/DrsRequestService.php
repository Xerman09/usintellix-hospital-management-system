<?php

namespace App\Modules\DrsRequests\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\DrsRequests\Models\DrsRequest;
use App\Modules\Encounters\Services\EncounterService;
use App\Modules\EncounterSoapNotes\Services\EncounterSoapNoteService;
use App\Modules\EncounterVitals\Services\EncounterVitalService;
use App\Modules\PatientAllergies\Services\PatientAllergyService;
use App\Modules\PatientImmunizations\Services\PatientImmunizationService;
use App\Modules\PatientLedger\Services\PatientLedgerService;
use App\Modules\PatientMedicalProblems\Services\PatientMedicalProblemService;
use App\Modules\PatientMedications\Services\PatientMedicationService;
use App\Modules\PatientPrescriptions\Services\PatientPrescriptionService;
use App\Modules\PatientProcedureResults\Services\PatientProcedureResultService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Services\PatientService;
use PDO;
use Throwable;

class DrsRequestService
{
    /**
     * List all Right of Access DRS requests with statutory countdown calculation.
     */
    public function list(array $filters = []): array
    {
        $db = Database::connection();
        $sql = "
            SELECT r.*,
                   p.patient_no, p.first_name, p.last_name, p.birthdate, p.sex,
                   u.username as fulfilled_by_username
            FROM hipaa_drs_access_requests r
            JOIN patients p ON p.id = r.patient_id
            LEFT JOIN users u ON u.id = r.fulfilled_by
            WHERE r.deleted_at IS NULL
        ";
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND r.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['patient_id'])) {
            $sql .= " AND r.patient_id = :patient_id";
            $params['patient_id'] = (int) $filters['patient_id'];
        }

        if (!empty($filters['format_requested'])) {
            $sql .= " AND r.format_requested = :format_requested";
            $params['format_requested'] = $filters['format_requested'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (
                r.request_number LIKE :search 
                OR r.requestor_name LIKE :search 
                OR p.first_name LIKE :search 
                OR p.last_name LIKE :search 
                OR p.patient_no LIKE :search
            )";
            $params['search'] = '%' . trim($filters['search']) . '%';
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND r.request_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND r.request_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }

        $sql .= " ORDER BY r.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $now = time();
        $processed = [];

        foreach ($rows as $row) {
            $effectiveDeadline = $row['is_extended'] ? $row['extended_deadline'] : $row['initial_deadline'];
            $deadlineTime = strtotime($effectiveDeadline . ' 23:59:59');
            $daysRemaining = (int) ceil(($deadlineTime - $now) / 86400);

            $isClosed = in_array($row['status'], ['fulfilled', 'denied', 'cancelled'], true);
            $isOverdue = !$isClosed && $daysRemaining < 0;
            $isImpending = !$isClosed && $daysRemaining >= 0 && $daysRemaining <= 7;

            $row['patient_name'] = trim("{$row['first_name']} {$row['last_name']}");
            $row['effective_deadline'] = $effectiveDeadline;
            $row['days_remaining'] = $daysRemaining;
            $row['is_overdue'] = $isOverdue;
            $row['is_impending'] = $isImpending;

            // Optional urgency filter
            if (!empty($filters['urgency'])) {
                if ($filters['urgency'] === 'overdue' && !$isOverdue) continue;
                if ($filters['urgency'] === 'impending' && !$isImpending) continue;
                if ($filters['urgency'] === 'extended' && !$row['is_extended']) continue;
            }

            $processed[] = $row;
        }

        return $processed;
    }

    /**
     * Compute summary metrics & SLA compliance indicators.
     */
    public function stats(): array
    {
        $db = Database::connection();
        $stmt = $db->query("
            SELECT r.*
            FROM hipaa_drs_access_requests r
            WHERE r.deleted_at IS NULL
        ");
        $all = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total = count($all);
        $pending = 0;
        $impending = 0;
        $overdue = 0;
        $extended = 0;
        $fulfilled = 0;
        $denied = 0;
        $now = time();

        foreach ($all as $r) {
            $isClosed = in_array($r['status'], ['fulfilled', 'denied', 'cancelled'], true);
            $effectiveDeadline = $r['is_extended'] ? $r['extended_deadline'] : $r['initial_deadline'];
            $daysRemaining = (int) ceil((strtotime($effectiveDeadline . ' 23:59:59') - $now) / 86400);

            if ($r['status'] === 'fulfilled') {
                $fulfilled++;
            } elseif ($r['status'] === 'denied') {
                $denied++;
            } elseif (!$isClosed) {
                $pending++;
                if ($daysRemaining < 0) {
                    $overdue++;
                } elseif ($daysRemaining <= 7) {
                    $impending++;
                }
            }

            if ((int) $r['is_extended'] === 1) {
                $extended++;
            }
        }

        $complianceRate = ($fulfilled + $denied > 0) ? round(($fulfilled / ($fulfilled + $overdue)) * 100, 1) : 100.0;

        return [
            'total_requests' => $total,
            'active_pending' => $pending,
            'impending_count' => $impending,
            'overdue_count' => $overdue,
            'extensions_active' => $extended,
            'fulfilled_count' => $fulfilled,
            'denied_count' => $denied,
            'compliance_rate' => $complianceRate
        ];
    }

    /**
     * Fetch a single request with full details and countdown calculations.
     */
    public function get(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            SELECT r.*,
                   p.patient_no, p.first_name, p.last_name, p.birthdate, p.sex,
                   u.username as fulfilled_by_username
            FROM hipaa_drs_access_requests r
            JOIN patients p ON p.id = r.patient_id
            LEFT JOIN users u ON u.id = r.fulfilled_by
            WHERE r.id = ? AND r.deleted_at IS NULL
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $now = time();
        $effectiveDeadline = $row['is_extended'] ? $row['extended_deadline'] : $row['initial_deadline'];
        $daysRemaining = (int) ceil((strtotime($effectiveDeadline . ' 23:59:59') - $now) / 86400);
        $isClosed = in_array($row['status'], ['fulfilled', 'denied', 'cancelled'], true);

        $row['patient_name'] = trim("{$row['first_name']} {$row['last_name']}");
        $row['effective_deadline'] = $effectiveDeadline;
        $row['days_remaining'] = $daysRemaining;
        $row['is_overdue'] = !$isClosed && $daysRemaining < 0;
        $row['is_impending'] = !$isClosed && $daysRemaining >= 0 && $daysRemaining <= 7;

        return $row;
    }

    /**
     * Intake a new Patient Right of Access Request (§ 164.524).
     */
    public function create(array $data, int $userId): array
    {
        $patientId = (int) ($data['patient_id'] ?? 0);
        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Valid patient is required.'];
        }

        if (empty($data['requestor_name'])) {
            return ['success' => false, 'message' => 'Requestor name is required.'];
        }

        // Statutory fee validation (§ 164.524(c)(4))
        $feeAssessed = (float) ($data['fee_assessed'] ?? 0.00);
        $feeCategory = $data['fee_category'] ?? 'none_zero_fee';
        $feeBreakdown = trim((string) ($data['fee_breakdown'] ?? ''));

        $feeValidation = $this->validateFeeRules($feeAssessed, $feeCategory, $data['format_requested'] ?? 'electronic_pdf', $data['delivery_method'] ?? 'secure_portal', $feeBreakdown);
        if (!$feeValidation['valid']) {
            return ['success' => false, 'message' => $feeValidation['message']];
        }

        $requestDate = !empty($data['request_date']) ? $data['request_date'] : date('Y-m-d');
        // Initial 30-day statutory countdown
        $initialDeadline = date('Y-m-d', strtotime($requestDate . ' + 30 days'));

        $requestNumber = $this->generateRequestNumber();

        $db = Database::connection();
        $stmt = $db->prepare("
            INSERT INTO hipaa_drs_access_requests
                (request_number, patient_id, request_date, requestor_type, requestor_name, requestor_contact,
                 request_channel, format_requested, delivery_method, records_scope, scope_start_date,
                 scope_end_date, custom_scope_notes, initial_deadline, is_extended, status,
                 fee_assessed, fee_category, fee_breakdown, notes, created_at, updated_at, created_by)
            VALUES
                (:request_number, :patient_id, :request_date, :requestor_type, :requestor_name, :requestor_contact,
                 :request_channel, :format_requested, :delivery_method, :records_scope, :scope_start_date,
                 :scope_end_date, :custom_scope_notes, :initial_deadline, 0, 'pending',
                 :fee_assessed, :fee_category, :fee_breakdown, :notes, NOW(), NOW(), :created_by)
        ");

        $stmt->execute([
            'request_number' => $requestNumber,
            'patient_id' => $patientId,
            'request_date' => $requestDate,
            'requestor_type' => $data['requestor_type'] ?? 'patient',
            'requestor_name' => trim($data['requestor_name']),
            'requestor_contact' => !empty($data['requestor_contact']) ? trim($data['requestor_contact']) : null,
            'request_channel' => $data['request_channel'] ?? 'patient_portal',
            'format_requested' => $data['format_requested'] ?? 'electronic_pdf',
            'delivery_method' => $data['delivery_method'] ?? 'secure_portal',
            'records_scope' => $data['records_scope'] ?? 'complete_designated_record_set',
            'scope_start_date' => !empty($data['scope_start_date']) ? $data['scope_start_date'] : null,
            'scope_end_date' => !empty($data['scope_end_date']) ? $data['scope_end_date'] : null,
            'custom_scope_notes' => !empty($data['custom_scope_notes']) ? trim($data['custom_scope_notes']) : null,
            'initial_deadline' => $initialDeadline,
            'fee_assessed' => $feeAssessed,
            'fee_category' => $feeCategory,
            'fee_breakdown' => $feeBreakdown ?: null,
            'notes' => !empty($data['notes']) ? trim($data['notes']) : null,
            'created_by' => $userId
        ]);

        $requestId = (int) $db->lastInsertId();

        AuditLogger::log(
            AuditLogger::CATEGORY_RIGHT_OF_ACCESS,
            AuditLogger::ACTION_DRS_REQUEST_CREATED,
            "Logged Right of Access request {$requestNumber} for patient ID {$patientId} with 30-day statutory deadline {$initialDeadline}",
            $patientId,
            $userId
        );

        return [
            'success' => true,
            'message' => "Right of Access request {$requestNumber} logged successfully. Statutory 30-day countdown initialized.",
            'data' => $this->get($requestId)
        ];
    }

    /**
     * Grant a single 30-day statutory extension (§ 164.524(b)(2)(ii)).
     */
    public function grantExtension(int $id, array $data, int $userId): array
    {
        $request = $this->get($id);
        if (!$request) {
            return ['success' => false, 'message' => 'Request not found.'];
        }

        if ((int) $request['is_extended'] === 1) {
            return [
                'success' => false,
                'message' => 'Under 45 CFR § 164.524(b)(2)(ii), only ONE 30-day extension is permitted per Right of Access request.'
            ];
        }

        if (in_array($request['status'], ['fulfilled', 'denied', 'cancelled'], true)) {
            return [
                'success' => false,
                'message' => "Cannot extend request with status '{$request['status']}'."
            ];
        }

        if (empty($data['extension_reason'])) {
            return ['success' => false, 'message' => 'A valid statutory extension reason is required.'];
        }

        if (empty(trim((string) ($data['extension_rationale'] ?? '')))) {
            return ['success' => false, 'message' => 'Detailed extension rationale narrative is required for statutory documentation.'];
        }

        $extendedDeadline = date('Y-m-d', strtotime($request['initial_deadline'] . ' + 30 days'));
        $noticeDate = date('Y-m-d');

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE hipaa_drs_access_requests
            SET is_extended = 1,
                extended_deadline = :extended_deadline,
                extension_reason = :extension_reason,
                extension_rationale = :extension_rationale,
                extension_notice_date = :notice_date,
                status = 'extension_granted',
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            'extended_deadline' => $extendedDeadline,
            'extension_reason' => trim($data['extension_reason']),
            'extension_rationale' => trim($data['extension_rationale']),
            'notice_date' => $noticeDate,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_RIGHT_OF_ACCESS,
            AuditLogger::ACTION_DRS_EXTENSION_GRANTED,
            "Granted 30-day statutory extension for DRS request {$request['request_number']}. New deadline: {$extendedDeadline}. Reason: {$data['extension_reason']}",
            $request['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "30-day extension granted under § 164.524(b)(2)(ii). New statutory deadline is {$extendedDeadline}.",
            'data' => $this->get($id)
        ];
    }

    /**
     * Compile statutory 30-day extension notice data (§ 164.524(b)(2)(ii)).
     */
    public function getExtensionNoticeData(int $id): array
    {
        $request = $this->get($id);
        if (!$request) {
            return ['success' => false, 'message' => 'Request not found.'];
        }

        $reasonLabels = [
            'offsite_archive_retrieval' => 'Retrieval of historical records stored in off-site archival repository',
            'extensive_record_compilation' => 'Extensive collation of multi-departmental clinical and billing records',
            'physician_review_consultation' => 'Required consultation with treating licensed healthcare provider (§ 164.524(a)(3))',
            'technical_format_conversion' => 'Technical conversion to requested specialized electronic format',
            'legal_representative_verification' => 'Verification of personal representative authority documentation'
        ];

        $reasonText = $reasonLabels[$request['extension_reason']] ?? $request['extension_reason'];

        $notice = [
            'facility_name' => 'USIntellix Healthcare System',
            'facility_address' => '100 Medical Center Parkway, Suite 500, Healthcare City, NY 10001',
            'privacy_office_phone' => '1-800-555-PRIVACY (Toll-Free)',
            'privacy_office_email' => 'compliance@usintellix-health.org',
            'notice_date' => $request['extension_notice_date'] ?: date('Y-m-d'),
            'patient_name' => $request['patient_name'],
            'patient_no' => $request['patient_no'],
            'request_number' => $request['request_number'],
            'request_date' => $request['request_date'],
            'initial_deadline' => $request['initial_deadline'],
            'extended_deadline' => $request['extended_deadline'] ?: date('Y-m-d', strtotime($request['initial_deadline'] . ' + 30 days')),
            'statutory_citation' => 'HIPAA Privacy Rule 45 CFR § 164.524(b)(2)(ii)',
            'extension_reason' => $reasonText,
            'extension_rationale' => $request['extension_rationale'],
            'rights_notice' => 'Under 45 CFR § 164.524(b)(2)(ii), a covered entity may extend the initial 30-day fulfillment deadline once for an additional 30 calendar days by providing written notice of the reasons for delay and the definitive completion date.'
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_RIGHT_OF_ACCESS,
            AuditLogger::ACTION_DRS_EXTENSION_NOTICE,
            "Generated formal § 164.524(b)(2)(ii) 30-day extension notice letter for DRS request {$request['request_number']}",
            $request['patient_id']
        );

        return ['success' => true, 'data' => $notice];
    }

    /**
     * Mark a DRS request as fulfilled (§ 164.524).
     */
    public function fulfillRequest(int $id, array $data, int $userId): array
    {
        $request = $this->get($id);
        if (!$request) {
            return ['success' => false, 'message' => 'Request not found.'];
        }

        $fulfillmentDate = !empty($data['fulfillment_date']) ? $data['fulfillment_date'] : date('Y-m-d');
        $notes = !empty($data['notes']) ? trim($data['notes']) : $request['notes'];

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE hipaa_drs_access_requests
            SET status = 'fulfilled',
                fulfillment_date = :fulfillment_date,
                fulfilled_by = :fulfilled_by,
                notes = :notes,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            'fulfillment_date' => $fulfillmentDate,
            'fulfilled_by' => $userId,
            'notes' => $notes,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_RIGHT_OF_ACCESS,
            AuditLogger::ACTION_DRS_FULFILLED,
            "Fulfilled Right of Access request {$request['request_number']} for patient ID {$request['patient_id']}",
            $request['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "Right of Access request {$request['request_number']} successfully fulfilled.",
            'data' => $this->get($id)
        ];
    }

    /**
     * Mark a DRS request as denied with statutory grounds (§ 164.524(a)).
     */
    public function denyRequest(int $id, array $data, int $userId): array
    {
        $request = $this->get($id);
        if (!$request) {
            return ['success' => false, 'message' => 'Request not found.'];
        }

        if (empty($data['denial_reason'])) {
            return ['success' => false, 'message' => 'A valid statutory denial reason is required (§ 164.524(a)).'];
        }

        if (empty(trim((string) ($data['denial_rationale'] ?? '')))) {
            return ['success' => false, 'message' => 'Detailed statutory denial rationale is required.'];
        }

        $denialNoticeDate = date('Y-m-d');

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE hipaa_drs_access_requests
            SET status = 'denied',
                denial_reason = :denial_reason,
                denial_rationale = :denial_rationale,
                denial_notice_date = :denial_notice_date,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            'denial_reason' => trim($data['denial_reason']),
            'denial_rationale' => trim($data['denial_rationale']),
            'denial_notice_date' => $denialNoticeDate,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_RIGHT_OF_ACCESS,
            AuditLogger::ACTION_DRS_DENIED,
            "Denied Right of Access request {$request['request_number']}. Ground: {$data['denial_reason']}",
            $request['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "Right of Access request {$request['request_number']} recorded as denied.",
            'data' => $this->get($id)
        ];
    }

    /**
     * Compile the complete Designated Record Set Export Bundle (§ 164.501 & § 164.524).
     */
    public function compileDrsBundle(int $patientId, array $scopeOptions = []): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        $patientService = new PatientService();
        $confidentialPrefs = $patientService->getConfidentialPreferences($patientId);

        // Clinical sections
        $problems = (new PatientMedicalProblemService())->list($patientId);
        $allergies = (new PatientAllergyService())->list($patientId);
        $medications = (new PatientMedicationService())->list($patientId);
        $prescriptions = (new PatientPrescriptionService())->list($patientId);
        $immunizations = (new PatientImmunizationService())->list($patientId);
        $encounters = (new EncounterService())->list($patientId);
        $vitals = (new EncounterVitalService())->listForPatient($patientId);
        $results = (new PatientProcedureResultService())->listForPatient($patientId);

        // SOAP Notes per encounter
        $soapService = new EncounterSoapNoteService();
        $soapNotes = [];
        foreach ($encounters as $enc) {
            $encId = (int) ($enc['id'] ?? 0);
            if ($encId > 0) {
                $soap = $soapService->getByEncounterId($encId);
                if ($soap) {
                    $soapNotes[$encId] = $soap;
                }
            }
        }

        // Financial Ledger (§ 164.501 includes all billing records)
        $ledgerService = new PatientLedgerService();
        $from = $scopeOptions['scope_start_date'] ?? '1970-01-01';
        $to = $scopeOptions['scope_end_date'] ?? date('Y-m-d', strtotime('+1 year'));
        $ledger = $ledgerService->getLedger($patientId, $from, $to);

        $bundle = [
            'metadata' => [
                'document_type' => 'HIPAA Designated Record Set (DRS) Export Bundle',
                'statutory_authority' => '45 CFR § 164.524 & 21st Century Cures Act § 4004',
                'facility_name' => 'USIntellix Healthcare System',
                'generated_at' => date('Y-m-d H:i:s') . ' UTC',
                'scope' => $scopeOptions['records_scope'] ?? 'complete_designated_record_set',
                'scope_start_date' => $scopeOptions['scope_start_date'] ?? null,
                'scope_end_date' => $scopeOptions['scope_end_date'] ?? null,
                'electronic_format_standard' => 'C-CDA R2.1 / USCDI v3 JSON Compliant',
            ],
            'patient' => [
                'id' => $patient['id'],
                'patient_no' => $patient['patient_no'],
                'name' => trim("{$patient['first_name']} {$patient['last_name']}"),
                'first_name' => $patient['first_name'],
                'middle_name' => $patient['middle_name'],
                'last_name' => $patient['last_name'],
                'sex' => $patient['sex'],
                'birthdate' => $patient['birthdate'],
                'civil_status' => $patient['civil_status'],
                'blood_type' => $patient['blood_type'],
                'contact' => [
                    'phone' => $patient['confidential_phone'] ?: $patient['phone_cell'] ?? $patient['phone_home'] ?? 'Not provided',
                    'email' => $patient['confidential_email'] ?: $patient['email'] ?? 'Not provided',
                    'address' => $patient['confidential_address_line'] ?: $patient['street'] ?? 'Not provided'
                ],
                'confidential_restrictions' => $confidentialPrefs['data'] ?? []
            ],
            'clinical_records' => [
                'problem_list' => $problems,
                'allergies_and_intolerances' => $allergies,
                'medications_active' => $medications,
                'prescriptions' => $prescriptions,
                'immunization_records' => $immunizations,
                'encounters_and_visits' => $encounters,
                'clinical_soap_notes' => $soapNotes,
                'vital_signs_history' => $vitals,
                'diagnostic_procedure_results' => $results
            ],
            'billing_records' => [
                'financial_ledger' => $ledger['rows'] ?? [],
                'account_totals' => $ledger['totals'] ?? []
            ]
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_RIGHT_OF_ACCESS,
            AuditLogger::ACTION_DRS_BUNDLE_EXPORTED,
            "Compiled Designated Record Set (DRS) Export Bundle for patient ID {$patientId}",
            $patientId
        );

        return ['success' => true, 'data' => $bundle];
    }

    /**
     * Export active DRS Access Pipeline Registry to RFC 4180 CSV for OCR audit review.
     */
    public function exportRegistryCsv(): string
    {
        $requests = $this->list();

        $output = fopen('php://temp', 'r+');
        fputcsv($output, ['# USIntellix Healthcare System - HIPAA Right of Access Request Pipeline']);
        fputcsv($output, ['# Statutory Citation: 45 CFR § 164.524 & 21st Century Cures Act § 4004 (Information Blocking Rule)']);
        fputcsv($output, ['# Generated: ' . date('Y-m-d H:i:s') . ' UTC']);
        fputcsv($output, ['# Total Logged Requests: ' . count($requests)]);
        fputcsv($output, []);
        fputcsv($output, [
            'Request Number', 'Patient No', 'Patient Name', 'Request Date', 'Requestor Type',
            'Requestor Name', 'Channel', 'Format Requested', 'Delivery Method', 'Records Scope',
            'Initial 30-Day Deadline', 'Extension Applied', 'Extended Deadline', 'Days Remaining',
            'Status', 'Fee Assessed', 'Fee Category', 'Fee Justification', 'Fulfillment Date'
        ]);

        foreach ($requests as $r) {
            fputcsv($output, [
                $r['request_number'],
                $r['patient_no'],
                $r['patient_name'],
                $r['request_date'],
                $r['requestor_type'],
                $r['requestor_name'],
                $r['request_channel'],
                $r['format_requested'],
                $r['delivery_method'],
                $r['records_scope'],
                $r['initial_deadline'],
                $r['is_extended'] ? 'YES (+30 Days)' : 'NO',
                $r['extended_deadline'] ?? 'N/A',
                $r['days_remaining'],
                strtoupper($r['status']),
                '$' . number_format((float) $r['fee_assessed'], 2),
                $r['fee_category'],
                $r['fee_breakdown'] ?? 'None',
                $r['fulfillment_date'] ?? 'Pending'
            ]);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        AuditLogger::log(
            AuditLogger::CATEGORY_RIGHT_OF_ACCESS,
            AuditLogger::ACTION_DRS_REGISTRY_EXPORT,
            "Exported Right of Access (45 CFR § 164.524) pipeline registry to CSV (" . count($requests) . " records)"
        );

        return $csv;
    }

    /**
     * Validate fee rules under 45 CFR § 164.524(c)(4).
     */
    private function validateFeeRules(float $fee, string $category, string $format, string $delivery, string $breakdown): array
    {
        // Fee cannot be negative
        if ($fee < 0) {
            return ['valid' => false, 'message' => 'Assessed fee cannot be negative.'];
        }

        // Zero fee is always valid
        if ($fee == 0.00) {
            return ['valid' => true];
        }

        // Check for impermissible search/retrieval fee language
        $forbiddenTerms = ['search', 'retrieval', 'processing fee', 'administrative fee', 'file pull', 'archive retrieval'];
        foreach ($forbiddenTerms as $term) {
            if (stripos($breakdown, $term) !== false) {
                return [
                    'valid' => false,
                    'message' => "HIPAA VIOLATION (§ 164.524(c)(4)): Charging fees for searching or retrieving records ('{$term}') is strictly prohibited under federal law."
                ];
            }
        }

        // Permissible categories
        $validCategories = ['electronic_media_safe_harbor', 'paper_copying_supplies', 'actual_postage'];
        if (!in_array($category, $validCategories, true)) {
            return [
                'valid' => false,
                'message' => 'Under 45 CFR § 164.524(c)(4), fees are strictly limited to supplies for paper copying, portable electronic media supplies, or actual postage.'
            ];
        }

        // OCR Safe Harbor check for electronic media: $6.50
        if ($category === 'electronic_media_safe_harbor' && $fee > 6.50) {
            return [
                'valid' => false,
                'message' => 'The HHS OCR Safe Harbor flat fee limit for electronic media is $6.50. Higher amounts require documented actual supply invoice receipts.'
            ];
        }

        // Portal delivery cannot incur media fees
        if ($delivery === 'secure_portal' && $category === 'electronic_media_safe_harbor') {
            return [
                'valid' => false,
                'message' => 'Secure portal digital downloads cannot assess physical media fees (§ 164.524(c)(4)). Digital delivery must be $0.00.'
            ];
        }

        return ['valid' => true];
    }

    /**
     * Generate sequential DRS tracking number: DRS-YYYY-XXXX.
     */
    private function generateRequestNumber(): string
    {
        $year = date('Y');
        $db = Database::connection();
        $stmt = $db->query("SELECT MAX(id) as max_id FROM hipaa_drs_access_requests");
        $maxId = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['max_id'] ?? 0);

        return sprintf('DRS-%s-%04d', $year, $maxId + 1);
    }
}
