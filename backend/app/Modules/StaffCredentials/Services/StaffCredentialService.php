<?php

namespace App\Modules\StaffCredentials\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class StaffCredentialService
{
    /**
     * Atomically generate clinical privilege grant number PRIV-YYYY-XXXXX
     */
    public static function generatePrivilegeCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('CLINICAL_PRIVILEGE', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'CLINICAL_PRIVILEGE' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("PRIV-%d-%05d", $year, $seq);
    }

    /**
     * Key Governance Metrics for Executive Registry Dashboard
     */
    public function getGovernanceMetrics(): array
    {
        $pdo = Database::connection();

        // 1. Credentials summary
        $stmtCred = $pdo->query("
            SELECT 
                COUNT(*) AS total_credentials,
                SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS verified_credentials,
                SUM(CASE WHEN verification_status = 'pending_verification' THEN 1 ELSE 0 END) AS pending_credentials,
                SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY) AND expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS expiring_soon_60d,
                SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_credentials
            FROM hr_staff_credentials
        ");
        $c = $stmtCred->fetch(PDO::FETCH_ASSOC);

        // 2. Clinical Privileges summary
        $stmtPriv = $pdo->query("
            SELECT 
                COUNT(*) AS total_privilege_grants,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_privilege_grants,
                SUM(CASE WHEN privilege_tier = 'Full' AND status = 'active' THEN 1 ELSE 0 END) AS full_privilege_count,
                SUM(CASE WHEN privilege_tier = 'Provisional' AND status = 'active' THEN 1 ELSE 0 END) AS provisional_privilege_count,
                SUM(CASE WHEN privilege_tier = 'Consulting' AND status = 'active' THEN 1 ELSE 0 END) AS consulting_privilege_count,
                SUM(CASE WHEN privilege_tier = 'Temporary' AND status = 'active' THEN 1 ELSE 0 END) AS temporary_privilege_count,
                SUM(CASE WHEN privilege_tier = 'Restricted' OR status = 'suspended' THEN 1 ELSE 0 END) AS restricted_privilege_count
            FROM hr_staff_clinical_privileges
        ");
        $p = $stmtPriv->fetch(PDO::FETCH_ASSOC);

        // 3. Procedures count
        $procCount = (int)$pdo->query("SELECT COUNT(*) FROM hr_staff_privilege_procedures WHERE is_authorized = 1")->fetchColumn();

        return array_merge($c ?: [], $p ?: [], [
            'total_authorized_procedures' => $procCount
        ]);
    }

    /**
     * List all Professional Credentials with filtering & pagination
     */
    public function listCredentials(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $offset = max(0, ($page - 1) * $perPage);

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['employee_id'])) {
            $where[] = "c.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['credential_type'])) {
            $where[] = "c.credential_type = ?";
            $params[] = $filters['credential_type'];
        }

        if (!empty($filters['verification_status'])) {
            $where[] = "c.verification_status = ?";
            $params[] = $filters['verification_status'];
        }

        if (!empty($filters['expiring_soon'])) {
            $where[] = "c.expiry_date IS NOT NULL AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY) AND c.expiry_date >= CURDATE()";
        }

        if (!empty($filters['q'])) {
            $kw = '%' . trim($filters['q']) . '%';
            $where[] = "(c.credential_title LIKE ? OR c.issuing_body LIKE ? OR c.certificate_number LIKE ? OR CONCAT(e.first_name, ' ', e.last_name) LIKE ?)";
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
        }

        $whereSql = implode(" AND ", $where);

        $cntStmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM hr_staff_credentials c
            JOIN employees e ON c.employee_id = e.id
            WHERE {$whereSql}
        ");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        $sql = "
            SELECT 
                c.*,
                CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS staff_full_name,
                e.email AS staff_email,
                e.phone AS staff_phone,
                d.name AS department_name,
                DATEDIFF(c.expiry_date, CURDATE()) AS days_until_expiry
            FROM hr_staff_credentials c
            JOIN employees e ON c.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE {$whereSql}
            ORDER BY 
                CASE WHEN c.verification_status = 'pending_verification' THEN 1 ELSE 2 END,
                days_until_expiry ASC,
                c.id DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $pdo->prepare($sql);
        $execParams = array_merge($params, [$perPage, $offset]);
        $stmt->execute($execParams);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
            'records' => $records
        ];
    }

    /**
     * Save / Upsert a Professional Credential
     */
    public function saveCredential(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $id = !empty($data['id']) ? (int)$data['id'] : null;
        $employeeId = (int)($data['employee_id'] ?? 0);
        if ($employeeId <= 0) {
            throw new RuntimeException("Employee ID is required.");
        }

        $title = trim($data['credential_title'] ?? '');
        if (empty($title)) {
            throw new RuntimeException("Credential title is required.");
        }

        $type = trim($data['credential_type'] ?? 'medical_license');
        $issuingBody = trim($data['issuing_body'] ?? '');
        $certNo = trim($data['certificate_number'] ?? '');
        $issueDate = !empty($data['issue_date']) ? $data['issue_date'] : date('Y-m-d');
        $expiryDate = !empty($data['expiry_date']) ? $data['expiry_date'] : null;
        $status = trim($data['verification_status'] ?? 'verified');
        $verifiedBy = !empty($data['verified_by_user']) ? trim($data['verified_by_user']) : 'Medical Director';
        $psvUrl = !empty($data['primary_source_verification_url']) ? trim($data['primary_source_verification_url']) : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;

        // Find provider_id if linked
        $pStmt = $pdo->prepare("SELECT id FROM providers WHERE employee_id = ?");
        $pStmt->execute([$employeeId]);
        $providerId = $pStmt->fetchColumn() ?: null;

        if ($id) {
            $stmt = $pdo->prepare("
                UPDATE hr_staff_credentials SET
                    credential_type = ?,
                    credential_title = ?,
                    issuing_body = ?,
                    certificate_number = ?,
                    issue_date = ?,
                    expiry_date = ?,
                    verification_status = ?,
                    verified_by_user = ?,
                    verified_at = NOW(),
                    primary_source_verification_url = ?,
                    notes = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $type, $title, $issuingBody, $certNo,
                $issueDate, $expiryDate, $status,
                $verifiedBy, $psvUrl, $notes, $id
            ]);
            return ['status' => 'updated', 'id' => $id];
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO hr_staff_credentials (
                    employee_id, provider_id, credential_type, credential_title,
                    issuing_body, certificate_number, issue_date, expiry_date,
                    verification_status, verified_by_user, verified_at,
                    primary_source_verification_url, notes, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, NOW(),
                    ?, ?, NOW(), NOW()
                )
            ");
            $stmt->execute([
                $employeeId, $providerId, $type, $title,
                $issuingBody, $certNo, $issueDate, $expiryDate,
                $status, $verifiedBy,
                $psvUrl, $notes
            ]);
            return ['status' => 'created', 'id' => (int)$pdo->lastInsertId()];
        }
    }

    /**
     * Delete a Credential
     */
    public function deleteCredential(int $id): bool
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("DELETE FROM hr_staff_credentials WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * List Hospital Clinical Privileges Grants
     */
    public function listClinicalPrivileges(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $offset = max(0, ($page - 1) * $perPage);

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['employee_id'])) {
            $where[] = "p.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['tier'])) {
            $where[] = "p.privilege_tier = ?";
            $params[] = $filters['tier'];
        }

        if (!empty($filters['status'])) {
            $where[] = "p.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['q'])) {
            $kw = '%' . trim($filters['q']) . '%';
            $where[] = "(p.privilege_code LIKE ? OR p.doctor_name LIKE ? OR p.department_name LIKE ? OR p.committee_resolution_no LIKE ?)";
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
        }

        $whereSql = implode(" AND ", $where);

        $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM hr_staff_clinical_privileges p WHERE {$whereSql}");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        $sql = "
            SELECT 
                p.*,
                COUNT(proc.id) AS authorized_procedures_count,
                DATEDIFF(p.review_date, CURDATE()) AS days_until_review
            FROM hr_staff_clinical_privileges p
            LEFT JOIN hr_staff_privilege_procedures proc ON proc.privilege_id = p.id AND proc.is_authorized = 1
            WHERE {$whereSql}
            GROUP BY p.id
            ORDER BY 
                CASE WHEN p.status = 'active' THEN 1 ELSE 2 END,
                p.effective_date DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $pdo->prepare($sql);
        $execParams = array_merge($params, [$perPage, $offset]);
        $stmt->execute($execParams);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
            'records' => $records
        ];
    }

    /**
     * Get Clinical Privilege Grant Detail with authorized procedures
     */
    public function getPrivilegeDetail(int $id): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT p.*,
                   CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS staff_full_name,
                   e.email, e.phone
            FROM hr_staff_clinical_privileges p
            JOIN employees e ON p.employee_id = e.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $priv = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$priv) return null;

        $pStmt = $pdo->prepare("
            SELECT * FROM hr_staff_privilege_procedures
            WHERE privilege_id = ?
            ORDER BY procedure_category ASC, procedure_name ASC
        ");
        $pStmt->execute([$id]);
        $priv['procedures'] = $pStmt->fetchAll(PDO::FETCH_ASSOC);

        return $priv;
    }

    /**
     * Save / Upsert Clinical Privilege Grant with Procedures
     */
    public function saveClinicalPrivilege(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $id = !empty($data['id']) ? (int)$data['id'] : null;
        $employeeId = (int)($data['employee_id'] ?? 0);
        if ($employeeId <= 0) {
            throw new RuntimeException("Physician Employee ID is required.");
        }

        // Fetch Employee Full Name & Dept
        $eStmt = $pdo->prepare("
            SELECT CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS full_name,
                   e.department_id, d.name AS dept_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.id = ?
        ");
        $eStmt->execute([$employeeId]);
        $emp = $eStmt->fetch(PDO::FETCH_ASSOC);
        $doctorName = $emp ? $emp['full_name'] : "Dr. Physician #{$employeeId}";
        $deptId = $emp['department_id'] ?? null;
        $deptName = $emp['dept_name'] ?? 'General Medicine';

        $tier = trim($data['privilege_tier'] ?? 'Full');
        $effectiveDate = !empty($data['effective_date']) ? $data['effective_date'] : date('Y-m-d');
        $reviewDate = !empty($data['review_date']) ? $data['review_date'] : date('Y-m-d', strtotime('+2 years'));
        $committee = !empty($data['approving_committee']) ? trim($data['approving_committee']) : 'Hospital Credentials & Privileging Committee';
        $chairperson = !empty($data['approving_chairperson']) ? trim($data['approving_chairperson']) : 'Chief Medical Officer';
        $resolutionNo = !empty($data['committee_resolution_no']) ? trim($data['committee_resolution_no']) : ('CPC-RES-' . date('Y') . '-' . rand(100, 999));
        $status = trim($data['status'] ?? 'active');
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $procedures = $data['procedures'] ?? [];

        $pdo->beginTransaction();
        try {
            if ($id) {
                $stmt = $pdo->prepare("
                    UPDATE hr_staff_clinical_privileges SET
                        privilege_tier = ?,
                        effective_date = ?,
                        review_date = ?,
                        approving_committee = ?,
                        approving_chairperson = ?,
                        committee_resolution_no = ?,
                        status = ?,
                        notes = ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([
                    $tier, $effectiveDate, $reviewDate,
                    $committee, $chairperson, $resolutionNo,
                    $status, $notes, $id
                ]);
                $privilegeId = $id;
            } else {
                $code = !empty($data['privilege_code']) ? trim($data['privilege_code']) : self::generatePrivilegeCode($pdo);
                $stmt = $pdo->prepare("
                    INSERT INTO hr_staff_clinical_privileges (
                        privilege_code, employee_id, doctor_name, department_id, department_name,
                        privilege_tier, effective_date, review_date,
                        approving_committee, approving_chairperson, committee_resolution_no,
                        status, notes, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, NOW(), NOW()
                    )
                ");
                $stmt->execute([
                    $code, $employeeId, $doctorName, $deptId, $deptName,
                    $tier, $effectiveDate, $reviewDate,
                    $committee, $chairperson, $resolutionNo,
                    $status, $notes
                ]);
                $privilegeId = (int)$pdo->lastInsertId();
            }

            // Sync Procedures if supplied
            if (is_array($procedures) && !empty($procedures)) {
                // If updating, delete existing procedures and re-insert
                if ($id) {
                    $pdo->prepare("DELETE FROM hr_staff_privilege_procedures WHERE privilege_id = ?")->execute([$privilegeId]);
                }

                $insProc = $pdo->prepare("
                    INSERT INTO hr_staff_privilege_procedures (
                        privilege_id, procedure_category, procedure_code, procedure_name,
                        supervision_level, required_proctored_cases, completed_proctored_cases,
                        is_authorized, clinical_scope_notes, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, NOW(), NOW()
                    )
                ");

                foreach ($procedures as $p) {
                    $pName = trim($p['procedure_name'] ?? '');
                    if (empty($pName)) continue;

                    $pCat = $p['procedure_category'] ?? 'Major Surgical';
                    $pCode = !empty($p['procedure_code']) ? trim($p['procedure_code']) : null;
                    $supLevel = $p['supervision_level'] ?? 'Independent';
                    $reqProctored = (int)($p['required_proctored_cases'] ?? 0);
                    $compProctored = (int)($p['completed_proctored_cases'] ?? 0);
                    $isAuth = isset($p['is_authorized']) ? (int)$p['is_authorized'] : 1;
                    $scopeNotes = !empty($p['clinical_scope_notes']) ? trim($p['clinical_scope_notes']) : null;

                    $insProc->execute([
                        $privilegeId, $pCat, $pCode, $pName,
                        $supLevel, $reqProctored, $compProctored,
                        $isAuth, $scopeNotes
                    ]);
                }
            }

            $pdo->commit();
            return ['status' => 'success', 'id' => $privilegeId];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Governance Verification Engine:
     * Check if a specific physician is authorized to perform a surgery or procedure
     */
    public function checkProcedurePrivilege(int $employeeId, string $procedureQuery): array
    {
        $pdo = Database::connection();
        $pq = '%' . trim($procedureQuery) . '%';

        // 1. Fetch active privilege grant
        $privStmt = $pdo->prepare("
            SELECT * FROM hr_staff_clinical_privileges
            WHERE employee_id = ? AND status = 'active' AND review_date >= CURDATE()
            ORDER BY id DESC LIMIT 1
        ");
        $privStmt->execute([$employeeId]);
        $priv = $privStmt->fetch(PDO::FETCH_ASSOC);

        if (!$priv) {
            return [
                'is_privileged' => false,
                'status' => 'NO_ACTIVE_PRIVILEGE_GRANT',
                'privilege_tier' => 'None',
                'supervision_level' => 'Prohibited',
                'doctor_name' => "Physician #{$employeeId}",
                'procedure_query' => $procedureQuery,
                'message' => 'Physician does NOT possess an active hospital clinical privilege grant or the grant has expired.'
            ];
        }

        // 2. Fetch procedure authorization match
        $procStmt = $pdo->prepare("
            SELECT * FROM hr_staff_privilege_procedures
            WHERE privilege_id = ? AND (procedure_name LIKE ? OR procedure_code LIKE ?)
            LIMIT 1
        ");
        $procStmt->execute([$priv['id'], $pq, $pq]);
        $proc = $procStmt->fetch(PDO::FETCH_ASSOC);

        if (!$proc || (int)$proc['is_authorized'] === 0) {
            return [
                'is_privileged' => false,
                'status' => 'UNAUTHORIZED_PROCEDURE',
                'privilege_tier' => $priv['privilege_tier'],
                'supervision_level' => 'Prohibited',
                'doctor_name' => $priv['doctor_name'],
                'procedure_query' => $procedureQuery,
                'message' => "Procedure is NOT included in {$priv['doctor_name']}'s authorized hospital clinical privileges."
            ];
        }

        // 3. Evaluate supervision level and proctoring
        $supLevel = $proc['supervision_level'];
        $requiresSupervisor = ($supLevel === 'Direct Supervision' || $supLevel === 'Indirect Supervision');

        $warnings = [];
        if ($priv['privilege_tier'] === 'Provisional') {
            $warnings[] = "Physician is in Provisional Tier (Proctored Period). Senior faculty sign-off required.";
        }
        if ($requiresSupervisor) {
            $warnings[] = "Procedure requires {$supLevel}. A designated senior proctor must scrub in or remain available.";
        }
        if ($proc['required_proctored_cases'] > $proc['completed_proctored_cases']) {
            $remaining = $proc['required_proctored_cases'] - $proc['completed_proctored_cases'];
            $warnings[] = "Physician requires {$remaining} more proctored cases to advance to independent status.";
        }

        return [
            'is_privileged' => true,
            'status' => 'AUTHORIZED',
            'privilege_code' => $priv['privilege_code'],
            'privilege_tier' => $priv['privilege_tier'],
            'doctor_name' => $priv['doctor_name'],
            'department_name' => $priv['department_name'],
            'procedure_name' => $proc['procedure_name'],
            'procedure_category' => $proc['procedure_category'],
            'supervision_level' => $supLevel,
            'proctor_supervisor_id' => $priv['proctor_supervisor_id'],
            'warnings' => $warnings,
            'review_date' => $priv['review_date']
        ];
    }

    /**
     * Seed comprehensive, realistic hospital credentials and clinical privileges
     * for Chief Surgeon, Interventional Cardiology, Anesthesiology, and Residents
     */
    public function seedRealisticDemoData(): array
    {
        $pdo = Database::connection();

        // 1. Check if credentials already seeded
        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM hr_staff_credentials")->fetchColumn();
        if ($cnt >= 8) {
            return ['status' => 'already_seeded', 'credentials_count' => $cnt];
        }

        // Sample credentials
        $credentials = [
            // Dr. Elena Rostova (Employee ID 102)
            [
                'employee_id' => 102,
                'type' => 'medical_license',
                'title' => 'PRC Physician Professional License',
                'body' => 'Professional Regulation Commission (PRC)',
                'cert_no' => 'PRC-MD-0098412',
                'issue' => '2014-06-15',
                'expiry' => date('Y-m-d', strtotime('+2 years')),
                'status' => 'verified',
                'notes' => 'Primary source verified with PRC Registry.'
            ],
            [
                'employee_id' => 102,
                'type' => 'specialty_board_cert',
                'title' => 'Diplomate & Fellow, Philippine College of Surgeons (FPCS)',
                'body' => 'Philippine Board of Surgery',
                'cert_no' => 'PCS-FELL-2018-0412',
                'issue' => '2018-11-20',
                'expiry' => date('Y-m-d', strtotime('+3 years')),
                'status' => 'verified',
                'notes' => 'Board certified in General & Laparoscopic Surgery.'
            ],
            [
                'employee_id' => 102,
                'type' => 'dea_narcotics_permit',
                'title' => 'PDEA Dangerous Drugs S2 License',
                'body' => 'Philippine Drug Enforcement Agency',
                'cert_no' => 'PDEA-S2-2026-99120',
                'issue' => '2026-01-10',
                'expiry' => date('Y-m-d', strtotime('+1 year')),
                'status' => 'verified',
                'notes' => 'Authorized prescriber for Schedule II-IV controlled substances.'
            ],
            [
                'employee_id' => 102,
                'type' => 'subspecialty_fellowship',
                'title' => 'Advanced Minimally Invasive Laparoscopy Fellowship',
                'body' => 'Asian Institute of Tele-Surgery (IRCAD)',
                'cert_no' => 'IRCAD-LAP-8821',
                'issue' => '2020-03-12',
                'expiry' => null,
                'status' => 'verified',
                'notes' => 'Advanced bariatric and hepatobiliary laparoscopic credentials.'
            ],

            // Dr. Jonathan Hayes (Employee ID 103)
            [
                'employee_id' => 103,
                'type' => 'medical_license',
                'title' => 'PRC Physician Professional License',
                'body' => 'Professional Regulation Commission (PRC)',
                'cert_no' => 'PRC-MD-0104882',
                'issue' => '2015-08-10',
                'expiry' => date('Y-m-d', strtotime('+18 months')),
                'status' => 'verified',
                'notes' => 'Active license in good standing.'
            ],
            [
                'employee_id' => 103,
                'type' => 'specialty_board_cert',
                'title' => 'Fellow, Philippine Heart Association & College of Cardiology',
                'body' => 'Philippine Specialty Board of Internal Medicine & Cardiology',
                'cert_no' => 'PHA-FELL-2021-0092',
                'issue' => '2021-02-15',
                'expiry' => date('Y-m-d', strtotime('+2 years')),
                'status' => 'verified',
                'notes' => 'Interventional Cardiology board credential.'
            ],
            [
                'employee_id' => 103,
                'type' => 'bls_acls_certification',
                'title' => 'ACLS Provider & Instructor Certification',
                'body' => 'American Heart Association (AHA)',
                'cert_no' => 'AHA-ACLS-994821',
                'issue' => '2025-05-10',
                'expiry' => date('Y-m-d', strtotime('+7 months')),
                'status' => 'verified',
                'notes' => 'Advanced Cardiac Life Support certification.'
            ],

            // Dr. Arthur Sterling (Employee ID 104)
            [
                'employee_id' => 104,
                'type' => 'medical_license',
                'title' => 'PRC Physician Professional License',
                'body' => 'Professional Regulation Commission (PRC)',
                'cert_no' => 'PRC-MD-0078129',
                'issue' => '2012-04-18',
                'expiry' => date('Y-m-d', strtotime('+45 days')), // Approaching expiry for demonstration
                'status' => 'verified',
                'notes' => 'Approaching re-credentialing window.'
            ],
            [
                'employee_id' => 104,
                'type' => 'specialty_board_cert',
                'title' => 'Diplomate, Philippine Board of Anesthesiology',
                'body' => 'Philippine Society of Anesthesiologists (PSA)',
                'cert_no' => 'PSA-DIP-2016-081',
                'issue' => '2016-09-01',
                'expiry' => date('Y-m-d', strtotime('+3 years')),
                'status' => 'verified',
                'notes' => 'Senior Anesthesia Staff.'
            ],

            // Dr. Sarah Lin (Employee ID 105)
            [
                'employee_id' => 105,
                'type' => 'medical_license',
                'title' => 'PRC Physician Professional License',
                'body' => 'Professional Regulation Commission (PRC)',
                'cert_no' => 'PRC-MD-0129931',
                'issue' => '2017-10-15',
                'expiry' => date('Y-m-d', strtotime('+2 years')),
                'status' => 'verified',
                'notes' => 'Active.'
            ],
            [
                'employee_id' => 105,
                'type' => 'specialty_board_cert',
                'title' => 'Fellow, Philippine College of Radiology (FPCR)',
                'body' => 'Philippine Board of Radiology',
                'cert_no' => 'PCR-FELL-2022-031',
                'issue' => '2022-01-20',
                'expiry' => date('Y-m-d', strtotime('+3 years')),
                'status' => 'verified',
                'notes' => 'Cross-sectional body imaging & MRI reading.'
            ]
        ];

        $insCred = $pdo->prepare("
            INSERT INTO hr_staff_credentials (
                employee_id, credential_type, credential_title, issuing_body,
                certificate_number, issue_date, expiry_date, verification_status,
                verified_by_user, verified_at, notes, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                'Chief Medical Officer', NOW(), ?, NOW(), NOW()
            )
        ");

        foreach ($credentials as $cr) {
            $insCred->execute([
                $cr['employee_id'], $cr['type'], $cr['title'], $cr['body'],
                $cr['cert_no'], $cr['issue'], $cr['expiry'], $cr['status'],
                $cr['notes']
            ]);
        }

        // 2. Seed Clinical Privileges Grants
        // Grant A: Dr. Elena Rostova - Full Surgical Privileges
        $privCode1 = self::generatePrivilegeCode($pdo);
        $insPriv = $pdo->prepare("
            INSERT INTO hr_staff_clinical_privileges (
                privilege_code, employee_id, doctor_name, department_id, department_name,
                privilege_tier, effective_date, review_date,
                approving_committee, approving_chairperson, committee_resolution_no,
                status, notes, created_at, updated_at
            ) VALUES (
                ?, 102, 'Dr. Elena Rostova', 1, 'Surgical Services',
                'Full', '2025-01-01', DATE_ADD(CURDATE(), INTERVAL 2 YEAR),
                'Hospital Credentials & Privileging Committee', 'Dr. Medical Director', 'CPC-RES-2025-001',
                'active', 'Full independent major surgical privileges delineation.', NOW(), NOW()
            )
        ");
        $insPriv->execute([$privCode1]);
        $privId1 = (int)$pdo->lastInsertId();

        $rostovaProcedures = [
            ['Major Surgical', 'SRV-SURG-LAP-01', 'Laparoscopic Cholecystectomy', 'Independent', 0, 0, 1, 'Standard 3-port and 4-port techniques'],
            ['Major Surgical', 'SRV-SURG-APP-01', 'Laparoscopic Appendectomy', 'Independent', 0, 0, 1, 'Complicated and uncomplicated'],
            ['Major Surgical', 'SRV-SURG-HERN-01', 'Inguinal & Ventral Herniorrhaphy with Mesh', 'Independent', 0, 0, 1, 'Open and laparoscopic TAPP/TEP'],
            ['Major Surgical', 'SRV-SURG-EXPL-01', 'Exploratory Laparotomy for Acute Abdomen', 'Independent', 0, 0, 1, 'Emergency and elective'],
            ['Minor Surgical', 'SRV-SURG-EXC-01', 'Excision of Soft Tissue Masses & Biopsy', 'Independent', 0, 0, 1, 'Bedside and minor OR'],
            ['Bedside Invasive', 'PRC-CV-LINE-01', 'Central Venous Catheter (CVC) Placement', 'Independent', 0, 0, 1, 'Internal jugular and subclavian with ultrasound guidance'],
            ['Bedside Invasive', 'PRC-CHEST-TUBE-01', 'Tube Thoracostomy (Chest Tube Insertion)', 'Independent', 0, 0, 1, 'Emergency and elective pleural decompression']
        ];

        $insProc = $pdo->prepare("
            INSERT INTO hr_staff_privilege_procedures (
                privilege_id, procedure_category, procedure_code, procedure_name,
                supervision_level, required_proctored_cases, completed_proctored_cases,
                is_authorized, clinical_scope_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        foreach ($rostovaProcedures as $rp) {
            $insProc->execute([
                $privId1, $rp[0], $rp[1], $rp[2], $rp[3], $rp[4], $rp[5], $rp[6], $rp[7]
            ]);
        }

        // Grant B: Dr. Jonathan Hayes - Interventional Cardiology Privileges
        $privCode2 = self::generatePrivilegeCode($pdo);
        $insPriv2 = $pdo->prepare("
            INSERT INTO hr_staff_clinical_privileges (
                privilege_code, employee_id, doctor_name, department_id, department_name,
                privilege_tier, effective_date, review_date,
                approving_committee, approving_chairperson, committee_resolution_no,
                status, notes, created_at, updated_at
            ) VALUES (
                ?, 103, 'Dr. Jonathan Hayes', 2, 'Cardiology',
                'Full', '2025-03-01', DATE_ADD(CURDATE(), INTERVAL 2 YEAR),
                'Hospital Credentials & Privileging Committee', 'Dr. Medical Director', 'CPC-RES-2025-014',
                'active', 'Catheterization laboratory and cardiovascular invasive procedures.', NOW(), NOW()
            )
        ");
        $insPriv2->execute([$privCode2]);
        $privId2 = (int)$pdo->lastInsertId();

        $hayesProcedures = [
            ['Endoscopy / Interventional', 'PRC-CATH-COR-01', 'Diagnostic Coronary Angiography', 'Independent', 0, 0, 1, 'Radial and femoral arterial approach'],
            ['Endoscopy / Interventional', 'PRC-PCI-STENT-01', 'Percutaneous Coronary Intervention (PCI / Stenting)', 'Independent', 0, 0, 1, 'Elective and STEMI primary angioplasty'],
            ['Bedside Invasive', 'PRC-PERICARD-01', 'Emergency Pericardiocentesis', 'Independent', 0, 0, 1, 'Cardiac tamponade drainage under echo guidance'],
            ['Bedside Invasive', 'PRC-CV-LINE-01', 'Central Venous Line Placement', 'Independent', 0, 0, 1, 'Ultrasound-guided catheterization']
        ];
        foreach ($hayesProcedures as $hp) {
            $insProc->execute([
                $privId2, $hp[0], $hp[1], $hp[2], $hp[3], $hp[4], $hp[5], $hp[6], $hp[7]
            ]);
        }

        // Grant C: Dr. Arthur Sterling - Anesthesiology Privileges
        $privCode3 = self::generatePrivilegeCode($pdo);
        $insPriv3 = $pdo->prepare("
            INSERT INTO hr_staff_clinical_privileges (
                privilege_code, employee_id, doctor_name, department_id, department_name,
                privilege_tier, effective_date, review_date,
                approving_committee, approving_chairperson, committee_resolution_no,
                status, notes, created_at, updated_at
            ) VALUES (
                ?, 104, 'Dr. Arthur Sterling', 3, 'Anesthesiology',
                'Full', '2024-06-01', DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
                'Hospital Credentials & Privileging Committee', 'Dr. Medical Director', 'CPC-RES-2024-088',
                'active', 'General and regional anesthesia privileges.', NOW(), NOW()
            )
        ");
        $insPriv3->execute([$privCode3]);
        $privId3 = (int)$pdo->lastInsertId();

        $sterlingProcedures = [
            ['Sedation / Anesthesia', 'SRV-ANES-GEN-01', 'General Endotracheal Anesthesia', 'Independent', 0, 0, 1, 'Adult and pediatric &gt; 2 years'],
            ['Sedation / Anesthesia', 'SRV-ANES-SPIN-01', 'Spinal & Epidural Neuraxial Anesthesia', 'Independent', 0, 0, 1, 'Obstetric and lower extremity orthopedic'],
            ['Sedation / Anesthesia', 'SRV-ANES-SED-01', 'Deep Procedural Sedation & Monitored Anesthesia Care (MAC)', 'Independent', 0, 0, 1, 'Endoscopy and interventional suites'],
            ['Bedside Invasive', 'PRC-INTUB-01', 'Emergency & Difficult Airway Intubation (Video Laryngoscopy)', 'Independent', 0, 0, 1, 'Code Blue and STAT airway calls']
        ];
        foreach ($sterlingProcedures as $sp) {
            $insProc->execute([
                $privId3, $sp[0], $sp[1], $sp[2], $sp[3], $sp[4], $sp[5], $sp[6], $sp[7]
            ]);
        }

        // Grant D: Provisional Surgeon (Demonstrating Proctored Oversight)
        $privCode4 = self::generatePrivilegeCode($pdo);
        $insPriv4 = $pdo->prepare("
            INSERT INTO hr_staff_clinical_privileges (
                privilege_code, employee_id, doctor_name, department_id, department_name,
                privilege_tier, effective_date, review_date,
                approving_committee, approving_chairperson, committee_resolution_no,
                status, proctor_supervisor_id, notes, created_at, updated_at
            ) VALUES (
                ?, 108, 'Dr. Christopher Nolan', 1, 'Surgical Services',
                'Provisional', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 MONTH),
                'Hospital Credentials & Privileging Committee', 'Dr. Elena Rostova', 'CPC-RES-2026-092',
                'active', 102, 'Provisional junior attending under direct proctorship of Dr. Elena Rostova.', NOW(), NOW()
            )
        ");
        $insPriv4->execute([$privCode4]);
        $privId4 = (int)$pdo->lastInsertId();

        $provisionalProcedures = [
            ['Major Surgical', 'SRV-SURG-APP-01', 'Laparoscopic Appendectomy', 'Direct Supervision', 10, 4, 1, 'Requires senior surgeon scrubbed in'],
            ['Minor Surgical', 'SRV-SURG-EXC-01', 'Excision of Soft Tissue Lipomas', 'Independent', 0, 0, 1, 'Authorized independent minor surgery'],
            ['Bedside Invasive', 'PRC-LUMBAR-PUNC-01', 'Diagnostic Lumbar Puncture', 'Direct Supervision', 5, 2, 1, 'Proctored bedside tap']
        ];
        foreach ($provisionalProcedures as $pp) {
            $insProc->execute([
                $privId4, $pp[0], $pp[1], $pp[2], $pp[3], $pp[4], $pp[5], $pp[6], $pp[7]
            ]);
        }

        return [
            'status' => 'seeded',
            'credentials_seeded' => count($credentials),
            'privileges_seeded' => 4,
            'procedures_seeded' => count($rostovaProcedures) + count($hayesProcedures) + count($sterlingProcedures) + count($provisionalProcedures)
        ];
    }
}
