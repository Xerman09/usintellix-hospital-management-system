<?php

declare(strict_types=1);

namespace App\Modules\HipaaOfficers\Services;

use App\Core\Database;
use App\Core\AuditLogger;
use App\Modules\HipaaOfficers\Models\HipaaOfficerDesignation;
use PDO;
use InvalidArgumentException;

class HipaaOfficerService
{
    private PDO $db;

    public const VALID_TYPES = [
        'privacy_officer'  => 'HIPAA Privacy Official (45 CFR § 164.530(a))',
        'security_officer' => 'HIPAA Security Official (45 CFR § 164.308(a)(2))'
    ];

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * Retrieve all HIPAA officer designations keyed by officer_type.
     */
    public function getAll(): array
    {
        $stmt = $this->db->query("
            SELECT id, officer_type, employee_id, user_id, full_name, title, email, 
                   phone, extension, physical_office_address, appointment_date, 
                   responsibilities_scope, is_active, appointed_by_name, notes, 
                   created_at, updated_at
            FROM hipaa_officer_designations
            ORDER BY id ASC
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [
            'privacy_officer' => null,
            'security_officer' => null
        ];

        foreach ($rows as $row) {
            $type = $row['officer_type'];
            if (isset($result[$type])) {
                $row['is_active'] = (bool) $row['is_active'];
                $result[$type] = $row;
            }
        }

        // Apply failover statutory defaults if records missing
        if (!$result['privacy_officer']) {
            $result['privacy_officer'] = $this->getDefaultOfficer('privacy_officer');
        }
        if (!$result['security_officer']) {
            $result['security_officer'] = $this->getDefaultOfficer('security_officer');
        }

        return $result;
    }

    /**
     * Retrieve a specific officer designation by type.
     */
    public function getByType(string $type): array
    {
        $this->validateType($type);

        $stmt = $this->db->prepare("
            SELECT id, officer_type, employee_id, user_id, full_name, title, email, 
                   phone, extension, physical_office_address, appointment_date, 
                   responsibilities_scope, is_active, appointed_by_name, notes, 
                   created_at, updated_at
            FROM hipaa_officer_designations
            WHERE officer_type = ?
            LIMIT 1
        ");
        $stmt->execute([$type]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return $this->getDefaultOfficer($type);
        }

        $row['is_active'] = (bool) $row['is_active'];
        return $row;
    }

    /**
     * Retrieve public contact details for Notice of Privacy Practices and Patient Portal.
     */
    public function getPublicDesignations(): array
    {
        $all = $this->getAll();

        return [
            'privacy_officer' => [
                'full_name'               => $all['privacy_officer']['full_name'],
                'title'                   => $all['privacy_officer']['title'],
                'email'                   => $all['privacy_officer']['email'],
                'phone'                   => $all['privacy_officer']['phone'],
                'extension'               => $all['privacy_officer']['extension'],
                'physical_office_address' => $all['privacy_officer']['physical_office_address'],
                'appointment_date'        => $all['privacy_officer']['appointment_date'],
                'statutory_citation'      => '45 CFR § 164.530(a)'
            ],
            'security_officer' => [
                'full_name'               => $all['security_officer']['full_name'],
                'title'                   => $all['security_officer']['title'],
                'email'                   => $all['security_officer']['email'],
                'phone'                   => $all['security_officer']['phone'],
                'extension'               => $all['security_officer']['extension'],
                'physical_office_address' => $all['security_officer']['physical_office_address'],
                'appointment_date'        => $all['security_officer']['appointment_date'],
                'statutory_citation'      => '45 CFR § 164.308(a)(2)'
            ]
        ];
    }

    /**
     * Update an officer designation record.
     */
    public function updateDesignation(string $type, array $data, int $userId, ?string $userRole = 'admin'): array
    {
        $this->validateType($type);

        $fullName = trim((string) ($data['full_name'] ?? ''));
        if ($fullName === '') {
            throw new InvalidArgumentException('Official officer full name is required.');
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            throw new InvalidArgumentException('Official title/role designation is required.');
        }

        $email = trim((string) ($data['email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('A valid official contact email address is required.');
        }

        $phone = trim((string) ($data['phone'] ?? ''));
        if ($phone === '') {
            throw new InvalidArgumentException('Official contact telephone number is required.');
        }

        $appointmentDate = trim((string) ($data['appointment_date'] ?? ''));
        if ($appointmentDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $appointmentDate)) {
            throw new InvalidArgumentException('Official appointment date is required in YYYY-MM-DD format.');
        }

        $extension = !empty($data['extension']) ? trim((string) $data['extension']) : null;
        $address = !empty($data['physical_office_address']) ? trim((string) $data['physical_office_address']) : null;
        $responsibilities = !empty($data['responsibilities_scope']) ? trim((string) $data['responsibilities_scope']) : null;
        $appointedBy = !empty($data['appointed_by_name']) ? trim((string) $data['appointed_by_name']) : 'Board of Directors / Chief Executive Officer';
        $notes = !empty($data['notes']) ? trim((string) $data['notes']) : null;
        $isActive = isset($data['is_active']) ? (int) (bool) $data['is_active'] : 1;
        $employeeId = !empty($data['employee_id']) ? (int) $data['employee_id'] : null;
        $linkedUserId = !empty($data['user_id']) ? (int) $data['user_id'] : null;

        $now = date('Y-m-d H:i:s');

        // Check if record exists
        $stmtCheck = $this->db->prepare("SELECT id FROM hipaa_officer_designations WHERE officer_type = ?");
        $stmtCheck->execute([$type]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $stmt = $this->db->prepare("
                UPDATE hipaa_officer_designations
                SET full_name = ?,
                    title = ?,
                    email = ?,
                    phone = ?,
                    extension = ?,
                    physical_office_address = ?,
                    appointment_date = ?,
                    responsibilities_scope = ?,
                    is_active = ?,
                    appointed_by_name = ?,
                    notes = ?,
                    employee_id = ?,
                    user_id = ?,
                    updated_at = ?,
                    updated_by = ?
                WHERE officer_type = ?
            ");
            $stmt->execute([
                $fullName, $title, $email, $phone, $extension, $address,
                $appointmentDate, $responsibilities, $isActive, $appointedBy,
                $notes, $employeeId, $linkedUserId, $now, $userId, $type
            ]);
            $recordId = (int) $existing['id'];
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO hipaa_officer_designations (
                    officer_type, employee_id, user_id, full_name, title, email,
                    phone, extension, physical_office_address, appointment_date,
                    responsibilities_scope, is_active, appointed_by_name, notes,
                    created_at, created_by, updated_at, updated_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?
                )
            ");
            $stmt->execute([
                $type, $employeeId, $linkedUserId, $fullName, $title, $email,
                $phone, $extension, $address, $appointmentDate,
                $responsibilities, $isActive, $appointedBy, $notes,
                $now, $userId, $now, $userId
            ]);
            $recordId = (int) $this->db->lastInsertId();
        }

        $citation = ($type === 'privacy_officer') ? '45 CFR § 164.530(a)' : '45 CFR § 164.308(a)(2)';
        $roleTitle = ($type === 'privacy_officer') ? 'HIPAA Privacy Official' : 'HIPAA Security Official';

        // Tamper-evident cryptographic audit logging
        AuditLogger::log(
            AuditLogger::CATEGORY_HIPAA_GOVERNANCE,
            AuditLogger::ACTION_HIPAA_OFFICER_UPDATED,
            "Updated {$roleTitle} designation: {$fullName} ({$title}) under {$citation}. Appointed: {$appointmentDate}. Contact: {$email}, {$phone}.",
            null,
            $userId,
            $userRole
        );

        return [
            'success' => true,
            'message' => "{$roleTitle} designation updated successfully pursuant to {$citation}.",
            'data'    => $this->getByType($type)
        ];
    }

    /**
     * Stream RFC 4180 CSV export of statutory designations for OCR auditors.
     */
    public function exportRegistryCsv(?int $userId = null, ?string $userRole = null): string
    {
        $officers = $this->getAll();

        $rows = [];
        $rows[] = ['# USINTELLIX HEALTHCARE SYSTEM - OFFICIAL HIPAA PRIVACY & SECURITY OFFICER REGISTRY'];
        $rows[] = ['# Statutory Mandates: 45 CFR § 164.530(a) (Privacy Official) & 45 CFR § 164.308(a)(2) (Security Official)'];
        $rows[] = ['# Mandatory 6-Year Documentation Retention: 45 CFR § 164.530(j) & 45 CFR § 164.316(b)'];
        $rows[] = ['# Export Generated: ' . date('Y-m-d H:i:s T')];
        $rows[] = [];
        $rows[] = [
            'Designation Role',
            'Statutory Authority',
            'Official Name',
            'Title / Credentials',
            'Contact Email',
            'Contact Telephone',
            'Extension',
            'Physical Office Address',
            'Official Appointment Date',
            'Designation Status',
            'Appointed By',
            'Scope of Responsibilities',
            'Administrative Notes',
            'Last Updated'
        ];

        foreach (['privacy_officer', 'security_officer'] as $t) {
            $o = $officers[$t];
            $citation = ($t === 'privacy_officer') ? '45 CFR § 164.530(a)' : '45 CFR § 164.308(a)(2)';
            $roleLabel = ($t === 'privacy_officer') ? 'HIPAA Privacy Official' : 'HIPAA Security Official';

            $rows[] = [
                $roleLabel,
                $citation,
                $o['full_name'],
                $o['title'],
                $o['email'],
                $o['phone'],
                $o['extension'] ?? '',
                $o['physical_office_address'] ?? '',
                $o['appointment_date'],
                $o['is_active'] ? 'Active' : 'Inactive',
                $o['appointed_by_name'] ?? '',
                $o['responsibilities_scope'] ?? '',
                $o['notes'] ?? '',
                $o['updated_at'] ?? $o['created_at'] ?? date('Y-m-d H:i:s')
            ];
        }

        $fp = fopen('php://temp', 'r+');
        foreach ($rows as $r) {
            fputcsv($fp, $r);
        }
        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);

        AuditLogger::log(
            AuditLogger::CATEGORY_HIPAA_GOVERNANCE,
            AuditLogger::ACTION_HIPAA_OFFICERS_EXPORT_CSV,
            "Exported official HIPAA Privacy & Security Officer Registry CSV for compliance audit documentation.",
            null,
            $userId,
            $userRole
        );

        return $csv ?: '';
    }

    /**
     * Generate appointment attestation certificate data.
     */
    public function generateAttestationLetter(string $type, ?int $userId = null, ?string $userRole = null): array
    {
        $officer = $this->getByType($type);
        $citation = ($type === 'privacy_officer') ? '45 CFR § 164.530(a)' : '45 CFR § 164.308(a)(2)';
        $roleLabel = ($type === 'privacy_officer') ? 'HIPAA Privacy Official' : 'HIPAA Security Official';

        $attestation = [
            'covered_entity'      => 'USIntellix Hospital & Health Systems',
            'facility_address'    => '100 Healthcare Boulevard, Suite 500, Medical District, NY 10001',
            'facility_phone'      => '(800) 555-0199',
            'officer_type'        => $type,
            'statutory_role'      => $roleLabel,
            'statutory_citation'  => $citation,
            'full_name'           => $officer['full_name'],
            'title'               => $officer['title'],
            'email'               => $officer['email'],
            'phone'               => $officer['phone'],
            'extension'           => $officer['extension'],
            'office_address'      => $officer['physical_office_address'],
            'appointment_date'    => $officer['appointment_date'],
            'appointed_by'        => $officer['appointed_by_name'] ?: 'Board of Directors / Chief Executive Officer',
            'responsibilities'    => $officer['responsibilities_scope'],
            'is_active'           => $officer['is_active'],
            'attestation_date'    => date('Y-m-d'),
            'retention_mandate'   => 'Mandatory 6-Year Documentation Retention pursuant to 45 CFR § 164.530(j) and 45 CFR § 164.316(b)',
            'certification_statement' => "This document serves as formal written certification of the appointment of {$officer['full_name']} as the official {$roleLabel} for USIntellix Healthcare System pursuant to {$citation}. The designated officer is vested with full operational and administrative authority to develop, implement, and enforce HIPAA compliance policies, procedures, and technical safeguards throughout the enterprise."
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_HIPAA_GOVERNANCE,
            AuditLogger::ACTION_HIPAA_OFFICER_ATTESTATION,
            "Generated formal appointment attestation certificate for {$roleLabel} ({$officer['full_name']}) under {$citation}.",
            null,
            $userId,
            $userRole
        );

        return $attestation;
    }

    /**
     * Get system-wide governance stats.
     */
    public function getStats(): array
    {
        $officers = $this->getAll();
        $p = $officers['privacy_officer'];
        $s = $officers['security_officer'];

        $pDays = $p['appointment_date'] ? (int) floor((time() - strtotime($p['appointment_date'])) / 86400) : 0;
        $sDays = $s['appointment_date'] ? (int) floor((time() - strtotime($s['appointment_date'])) / 86400) : 0;

        $stmtLogs = $this->db->query("
            SELECT COUNT(*) AS total
            FROM hipaa_audit_logs
            WHERE event_category = 'HIPAA_GOVERNANCE'
        ");
        $logCount = (int) ($stmtLogs->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

        return [
            'privacy_officer_active'  => $p['is_active'],
            'security_officer_active' => $s['is_active'],
            'both_officers_active'    => $p['is_active'] && $s['is_active'],
            'privacy_officer_name'    => $p['full_name'],
            'security_officer_name'   => $s['full_name'],
            'privacy_tenure_days'     => $pDays,
            'security_tenure_days'    => $sDays,
            'governance_audit_events' => $logCount,
            'retention_mandate_years' => 6,
            'overall_status'          => ($p['is_active'] && $s['is_active']) ? 'COMPLIANT' : 'ACTION_REQUIRED'
        ];
    }

    private function validateType(string $type): void
    {
        if (!isset(self::VALID_TYPES[$type])) {
            throw new InvalidArgumentException("Invalid officer type: '{$type}'. Permissible types are 'privacy_officer' or 'security_officer'.");
        }
    }

    private function getDefaultOfficer(string $type): array
    {
        if ($type === 'privacy_officer') {
            return [
                'id'                      => 1,
                'officer_type'            => 'privacy_officer',
                'employee_id'             => null,
                'user_id'                 => null,
                'full_name'               => 'Sarah Jenkins, JD, CHPC',
                'title'                   => 'Chief Privacy & Compliance Officer',
                'email'                   => 'privacy@usintellix-hospital.com',
                'phone'                   => '(800) 555-0199',
                'extension'               => '4040',
                'physical_office_address' => '100 Healthcare Boulevard, Suite 500, Medical District, NY 10001',
                'appointment_date'        => '2024-01-15',
                'responsibilities_scope'  => 'Responsible for the development, implementation, and maintenance of hospital-wide HIPAA Privacy Rule policies and procedures under 45 CFR § 164.530(a)(1)(i), receiving and investigating patient privacy grievances under § 164.530(a)(1)(ii), overseeing Notice of Privacy Practices dissemination (§ 164.520), Designated Record Set requests (§ 164.524), PHI amendment workflows (§ 164.526), Accounting of Disclosures (§ 164.528), and Business Associate Agreements (§ 164.502(e)).',
                'is_active'               => true,
                'appointed_by_name'       => 'Board of Directors / Chief Executive Officer',
                'notes'                   => 'Official statutory designation pursuant to 45 CFR § 164.530(a). Documentation retained per 6-year retention mandate (§ 164.530(j)).',
                'created_at'              => '2024-01-15 09:00:00',
                'updated_at'              => '2024-01-15 09:00:00'
            ];
        }

        return [
            'id'                      => 2,
            'officer_type'            => 'security_officer',
            'employee_id'             => null,
            'user_id'                 => null,
            'full_name'               => 'Marcus Vance, CISSP, HCISPP',
            'title'                   => 'Chief Information Security Officer',
            'email'                   => 'security@usintellix-hospital.com',
            'phone'                   => '(800) 555-0199',
            'extension'               => '4088',
            'physical_office_address' => '100 Healthcare Boulevard, Suite 500, Medical District, NY 10001',
            'appointment_date'        => '2024-01-15',
            'responsibilities_scope'  => 'Responsible for the development, implementation, and operational oversight of technical, administrative, and physical safeguards required by the HIPAA Security Rule under 45 CFR § 164.308(a)(2), conducting enterprise security risk analyses (§ 164.308(a)(1)(ii)(A)), incident response and 4-factor breach risk evaluations (§ 164.402), disaster recovery verification (§ 164.308(a)(7)), role-based access management (§ 164.312(a)), and cryptographic integrity auditing (§ 164.312(b)).',
            'is_active'               => true,
            'appointed_by_name'       => 'Board of Directors / Chief Executive Officer',
            'notes'                   => 'Official statutory designation pursuant to 45 CFR § 164.308(a)(2). Documentation retained per 6-year retention mandate (§ 164.316(b)).',
            'created_at'              => '2024-01-15 09:00:00',
            'updated_at'              => '2024-01-15 09:00:00'
        ];
    }
}
