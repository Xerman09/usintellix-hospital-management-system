<?php

namespace App\Modules\Disclosures\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\Disclosures\Models\Disclosure;
use App\Modules\Facilities\Models\Facility;
use App\Modules\Patients\Models\Patient;
use PDO;

class DisclosureService
{
    /**
     * Statutory fields mandated by 45 CFR § 164.528(b)(2).
     */
    private const DETAIL_FIELDS = [
        'disclosure_date',
        'disclosure_type',
        'legal_basis',
        'purpose',
        'recipient',
        'recipient_address',
        'records_disclosed',
        'requestor_name',
        'disclosure_medium',
        'reference_number',
        'is_tpo_exempt',
        'description'
    ];

    /**
     * List recorded disclosures with patient and creator info, supporting
     * both single-patient and enterprise-wide accounting views.
     */
    public function list(?int $patientId = null, array $filters = []): array
    {
        $sql = "SELECT d.id, d.patient_id, d.disclosure_date, d.disclosure_type,
                       d.legal_basis, d.purpose, d.recipient, d.recipient_address,
                       d.records_disclosed, d.requestor_name, d.disclosure_medium,
                       d.reference_number, d.is_tpo_exempt, d.description,
                       d.created_at, d.updated_at,
                       CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS provider_name,
                       CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                       p.patient_no, p.birthdate, p.sex
                FROM disclosures d
                INNER JOIN patients p ON p.id = d.patient_id
                LEFT JOIN employees e ON e.user_id = d.created_by
                WHERE d.deleted_at IS NULL";

        $params = [];

        if ($patientId !== null && $patientId > 0) {
            $sql .= " AND d.patient_id = :patient_id";
            $params['patient_id'] = $patientId;
        }

        if (!empty($filters['from'])) {
            $sql .= " AND d.disclosure_date >= :from_date";
            $params['from_date'] = $filters['from'] . ' 00:00:00';
        }

        if (!empty($filters['to'])) {
            $sql .= " AND d.disclosure_date <= :to_date";
            $params['to_date'] = $filters['to'] . ' 23:59:59';
        }

        if (!empty($filters['legal_basis'])) {
            $sql .= " AND d.legal_basis = :legal_basis";
            $params['legal_basis'] = $filters['legal_basis'];
        }

        if (!empty($filters['disclosure_type'])) {
            $sql .= " AND d.disclosure_type = :disclosure_type";
            $params['disclosure_type'] = $filters['disclosure_type'];
        }

        if (!empty($filters['search'])) {
            $search = '%' . trim((string) $filters['search']) . '%';
            $sql .= " AND (d.recipient LIKE :s1 OR d.requestor_name LIKE :s2 
                           OR d.reference_number LIKE :s3 OR d.purpose LIKE :s4 
                           OR d.records_disclosed LIKE :s5 OR p.first_name LIKE :s6 
                           OR p.last_name LIKE :s7 OR p.patient_no LIKE :s8)";
            $params['s1'] = $search;
            $params['s2'] = $search;
            $params['s3'] = $search;
            $params['s4'] = $search;
            $params['s5'] = $search;
            $params['s6'] = $search;
            $params['s7'] = $search;
            $params['s8'] = $search;
        }

        $sql .= " ORDER BY d.disclosure_date DESC, d.id DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Compute summary metrics for Accounting of Disclosures governance.
     */
    public function stats(array $filters = []): array
    {
        $db = Database::connection();

        $patientIdClause = "";
        $params = [];
        if (!empty($filters['patient_id'])) {
            $patientIdClause = " AND patient_id = :pid";
            $params['pid'] = (int) $filters['patient_id'];
        }

        $totalSql = "SELECT COUNT(*) FROM disclosures WHERE deleted_at IS NULL" . $patientIdClause;
        $totalStmt = $db->prepare($totalSql);
        $totalStmt->execute($params);
        $total = (int) $totalStmt->fetchColumn();

        $subpoenaSql = "SELECT COUNT(*) FROM disclosures WHERE deleted_at IS NULL AND legal_basis IN ('court_order_subpoena', 'subpoena')" . $patientIdClause;
        $subStmt = $db->prepare($subpoenaSql);
        $subStmt->execute($params);
        $subpoenas = (int) $subStmt->fetchColumn();

        $publicHealthSql = "SELECT COUNT(*) FROM disclosures WHERE deleted_at IS NULL AND legal_basis = 'public_health'" . $patientIdClause;
        $phStmt = $db->prepare($publicHealthSql);
        $phStmt->execute($params);
        $publicHealth = (int) $phStmt->fetchColumn();

        $lawEnforcementSql = "SELECT COUNT(*) FROM disclosures WHERE deleted_at IS NULL AND legal_basis = 'law_enforcement'" . $patientIdClause;
        $leStmt = $db->prepare($lawEnforcementSql);
        $leStmt->execute($params);
        $lawEnforcement = (int) $leStmt->fetchColumn();

        $hieSql = "SELECT COUNT(*) FROM disclosures WHERE deleted_at IS NULL AND legal_basis = 'hie_exchange'" . $patientIdClause;
        $hieStmt = $db->prepare($hieSql);
        $hieStmt->execute($params);
        $hie = (int) $hieStmt->fetchColumn();

        $sixYearsSql = "SELECT COUNT(*) FROM disclosures WHERE deleted_at IS NULL AND disclosure_date >= DATE_SUB(NOW(), INTERVAL 6 YEAR)" . $patientIdClause;
        $sixStmt = $db->prepare($sixYearsSql);
        $sixStmt->execute($params);
        $sixYears = (int) $sixStmt->fetchColumn();

        return [
            'total_disclosures'      => $total,
            'subpoenas_court_orders' => $subpoenas,
            'public_health'          => $publicHealth,
            'law_enforcement'        => $lawEnforcement,
            'hie_exchanges'          => $hie,
            'retained_6_years'       => $sixYears,
            'six_year_window_count'  => $sixYears
        ];
    }

    /**
     * Record an external disclosure of patient records (HIPAA § 164.528).
     */
    public function store(int $patientId, int $createdBy, array $details = [], ?array $user = null): array
    {
        $recipient = trim((string) ($details['recipient'] ?? ''));
        if ($recipient === '') {
            return [
                'success' => false,
                'message' => 'Recipient name or organization is required by HIPAA § 164.528(b)(2)(ii).'
            ];
        }

        $disclosureDate = trim((string) ($details['disclosure_date'] ?? ''));
        if ($disclosureDate === '') {
            $disclosureDate = date('Y-m-d H:i:s');
        } elseif (strlen($disclosureDate) === 10) {
            $disclosureDate .= ' ' . date('H:i:s');
        }

        $legalBasis = trim((string) ($details['legal_basis'] ?? 'other_non_tpo'));
        $purpose = trim((string) ($details['purpose'] ?? ''));
        if ($purpose === '') {
            return [
                'success' => false,
                'message' => 'Statement of purpose is required by HIPAA § 164.528(b)(2)(iv).'
            ];
        }

        $recordsDisclosed = trim((string) ($details['records_disclosed'] ?? ''));
        if ($recordsDisclosed === '') {
            return [
                'success' => false,
                'message' => 'Description of records disclosed is required by HIPAA § 164.528(b)(2)(iii).'
            ];
        }

        $data = $this->filterDetails($details);
        $data['recipient'] = $recipient;
        $data['disclosure_date'] = $disclosureDate;
        $data['legal_basis'] = $legalBasis !== '' ? $legalBasis : 'other_non_tpo';
        $data['purpose'] = $purpose;
        $data['records_disclosed'] = $recordsDisclosed;
        $data['patient_id'] = $patientId;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new Disclosure())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record disclosure in database.'
            ];
        }

        // Tamper-evident HIPAA audit trail logging (§ 164.312(b))
        AuditLogger::log(
            AuditLogger::CATEGORY_DISCLOSURE,
            AuditLogger::ACTION_DISCLOSURE_RECORDED,
            "Recorded external PHI disclosure to '{$recipient}' for patient #{$patientId} under basis '{$data['legal_basis']}' (Ref: " . ($data['reference_number'] ?? 'N/A') . ").",
            $patientId,
            $createdBy,
            $user['role'] ?? 'staff'
        );

        return [
            'success' => true,
            'message' => 'Disclosure recorded successfully in HIPAA § 164.528 accounting ledger.',
            'data'    => ['id' => $id]
        ];
    }

    /**
     * Update an existing disclosure record.
     */
    public function update(int $id, array $details, int $updatedBy, ?array $user = null): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Disclosure record not found.'
            ];
        }

        $recipient = trim((string) ($details['recipient'] ?? ''));
        if ($recipient === '') {
            return [
                'success' => false,
                'message' => 'Recipient name or organization is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['recipient'] = $recipient;
        if (!empty($details['disclosure_date'])) {
            $date = trim((string) $details['disclosure_date']);
            $data['disclosure_date'] = strlen($date) === 10 ? $date . ' 00:00:00' : $date;
        }
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new Disclosure())->update($data, $id);

        AuditLogger::log(
            AuditLogger::CATEGORY_DISCLOSURE,
            AuditLogger::ACTION_DISCLOSURE_UPDATED,
            "Updated disclosure record #{$id} for patient #{$record['patient_id']} (Recipient: '{$recipient}').",
            (int) $record['patient_id'],
            $updatedBy,
            $user['role'] ?? 'staff'
        );

        return [
            'success' => true,
            'message' => 'Disclosure updated successfully.'
        ];
    }

    /**
     * Find a single disclosure by ID.
     */
    public function find(int $id): ?array
    {
        return (new Disclosure())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded disclosure.
     */
    public function remove(int $id, int $deletedBy, ?array $user = null): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Disclosure record not found.'
            ];
        }

        (new Disclosure())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        AuditLogger::log(
            AuditLogger::CATEGORY_DISCLOSURE,
            AuditLogger::ACTION_DISCLOSURE_DELETED,
            "Deleted disclosure record #{$id} for patient #{$record['patient_id']} (Recipient: '{$record['recipient']}').",
            (int) $record['patient_id'],
            $deletedBy,
            $user['role'] ?? 'staff'
        );

        return [
            'success' => true,
            'message' => 'Disclosure removed successfully.'
        ];
    }

    /**
     * Compile an official Patient Accounting of Disclosures Report
     * complying with 45 CFR § 164.528.
     */
    public function getReportData(int $patientId, ?string $from = null, ?string $to = null, ?array $user = null): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient || $patient['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Patient record not found.'
            ];
        }

        // Default to statutory 6-year window (§ 164.528(a)(1))
        $fromDate = $from && $from !== '' ? $from : date('Y-m-d', strtotime('-6 years'));
        $toDate = $to && $to !== '' ? $to : date('Y-m-d');

        $facility = (new Facility())->first() ?? [
            'name'    => 'USIntellix Hospital & Health Systems',
            'phone'   => '(555) 019-2834',
            'email'   => 'compliance@usintellix.health',
            'street'  => '100 Medical Center Blvd',
            'city'    => 'Metropolis',
            'state'   => 'NY',
            'postal_code' => '10001'
        ];

        $disclosures = $this->list($patientId, [
            'from' => $fromDate,
            'to'   => $toDate
        ]);

        // Filter out any TPO exempt disclosures for standard patient accounting
        $reportableDisclosures = array_values(array_filter($disclosures, function ($d) {
            return (int) ($d['is_tpo_exempt'] ?? 0) === 0;
        }));

        AuditLogger::log(
            AuditLogger::CATEGORY_EXPORT,
            AuditLogger::ACTION_DISCLOSURE_REPORT,
            "Generated HIPAA § 164.528 Accounting of Disclosures report for patient #{$patientId} ({$patient['first_name']} {$patient['last_name']}) for period {$fromDate} to {$toDate}.",
            $patientId,
            $user['id'] ?? null,
            $user['role'] ?? null
        );

        return [
            'success' => true,
            'data'    => [
                'report_title'       => 'Accounting of Disclosures of Protected Health Information',
                'statutory_basis'    => '45 CFR § 164.528 (HIPAA Privacy Rule)',
                'generated_at'       => date('Y-m-d H:i:s'),
                'period_from'        => $fromDate,
                'period_to'          => $toDate,
                'facility'           => $facility,
                'patient'            => [
                    'id'          => $patient['id'],
                    'patient_no'  => $patient['patient_no'],
                    'name'        => trim($patient['first_name'] . ' ' . $patient['last_name']),
                    'birthdate'   => $patient['birthdate'],
                    'sex'         => $patient['sex'] ?? null,
                    'phone'       => $patient['phone_cell'] ?? $patient['phone_home'] ?? 'N/A'
                ],
                'disclosures_count'  => count($reportableDisclosures),
                'disclosures'        => $reportableDisclosures,
                'privacy_officer'    => (new \App\Modules\HipaaOfficers\Services\HipaaOfficerService())->getByType('privacy_officer'),
                'statutory_notice'   => 'In accordance with 45 CFR § 164.528, this document accounts for all non-routine disclosures of protected health information made by this covered entity outside of Treatment, Payment, and Health Care Operations (TPO) for the requested period. Disclosures made pursuant to patient authorization, national security, or incidental releases are excluded per § 164.528(a)(1).'
            ]
        ];
    }

    /**
     * Export disclosures as an RFC 4180 compliant CSV stream.
     */
    public function exportCsv(?int $patientId = null, array $filters = [], ?array $user = null): void
    {
        $disclosures = $this->list($patientId, $filters);

        $now = date('Y-m-d_His');
        $filename = "hipaa_accounting_of_disclosures_{$now}.csv";

        if (!headers_sent()) {
            header('Content-Type: text/csv; charset=UTF-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Pragma: no-cache');
            header('Expires: 0');
        }

        $output = fopen('php://output', 'w');

        // BOM for Excel UTF-8 recognition
        fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

        // HIPAA Compliance Metadata Header
        fputcsv($output, ['# USIntellix Hospital Management System - HIPAA § 164.528 Accounting of Disclosures Export']);
        fputcsv($output, ['# Export Timestamp: ' . date('Y-m-d H:i:s')]);
        fputcsv($output, ['# Total Records: ' . count($disclosures)]);
        fputcsv($output, ['# Confidentiality Notice: Contains Protected Health Information (PHI) release logs. Subject to 45 CFR Part 164.']);
        fputcsv($output, []);

        // Column headers
        fputcsv($output, [
            'Record ID',
            'Disclosure Date',
            'Patient ID',
            'Patient MRN',
            'Patient Name',
            'Legal Basis (§ 164.512)',
            'Disclosure Category',
            'Purpose of Disclosure',
            'Recipient Entity / Person',
            'Recipient Address',
            'PHI Records Disclosed',
            'Requesting Official',
            'Transmission Medium',
            'Reference / Docket #',
            'TPO Exempt',
            'Disclosed By Staff',
            'Logged Timestamp'
        ]);

        foreach ($disclosures as $d) {
            fputcsv($output, [
                $d['id'],
                $d['disclosure_date'],
                $d['patient_id'],
                $d['patient_no'] ?? '',
                $d['patient_name'] ?? '',
                $d['legal_basis'] ?? 'other_non_tpo',
                $d['disclosure_type'] ?? '',
                $d['purpose'] ?? '',
                $d['recipient'],
                $d['recipient_address'] ?? '',
                $d['records_disclosed'] ?? '',
                $d['requestor_name'] ?? '',
                $d['disclosure_medium'] ?? 'electronic_portal',
                $d['reference_number'] ?? '',
                ($d['is_tpo_exempt'] ?? 0) ? 'Yes' : 'No',
                $d['created_by_name'] ?? 'Staff',
                $d['created_at'] ?? ''
            ]);
        }

        fclose($output);

        AuditLogger::log(
            AuditLogger::CATEGORY_EXPORT,
            AuditLogger::ACTION_DISCLOSURE_REPORT,
            "Exported Accounting of Disclosures CSV (" . count($disclosures) . " records).",
            $patientId,
            $user['id'] ?? null,
            $user['role'] ?? null
        );
    }

    /**
     * Filter array keys to recognized detail columns.
     */
    private function filterDetails(array $details): array
    {
        $result = [];
        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'recipient' || !array_key_exists($field, $details)) {
                continue;
            }
            $val = $details[$field];
            $result[$field] = ($val === '' || $val === null) ? null : $val;
        }
        return $result;
    }
}
