<?php

namespace App\Modules\LifeSupport\Services;

use App\Core\Database;
use PDO;
use Throwable;

class LifeSupportService
{
    /**
     * Generate sequential code LSC-YYYY-0001
     */
    public static function generateCertificationCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('LIFE_SUPPORT_CERT', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'LIFE_SUPPORT_CERT' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("LSC-%d-%04d", $year, $num);
    }

    /**
     * Executive Overview & Governance Metrics
     */
    public function getExecutiveMetrics(): array
    {
        $pdo = Database::connection();

        // 1. Total & Status Counts
        $sql = "
            SELECT
                COUNT(*) as total_certs,
                SUM(CASE WHEN expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY) AND status != 'revoked' THEN 1 ELSE 0 END) as active_compliant,
                SUM(CASE WHEN expiry_date BETWEEN DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY) AND DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY) THEN 1 ELSE 0 END) as expiring_soon,
                SUM(CASE WHEN expiry_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY) THEN 1 ELSE 0 END) as critical_7_day,
                SUM(CASE WHEN expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) as expired_count,
                COUNT(DISTINCT employee_id) as total_certified_staff
            FROM `hr_life_support_certifications`
            WHERE `status` != 'revoked'
        ";
        $metrics = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC) ?: [];

        $totalCerts = (int)($metrics['total_certs'] ?? 0);
        $activeCompliant = (int)($metrics['active_compliant'] ?? 0);
        $expiringSoon = (int)($metrics['expiring_soon'] ?? 0);
        $critical7Day = (int)($metrics['critical_7_day'] ?? 0);
        $expiredCount = (int)($metrics['expired_count'] ?? 0);
        $certifiedStaff = (int)($metrics['total_certified_staff'] ?? 0);

        $complianceRate = $totalCerts > 0 ? round(($activeCompliant / $totalCerts) * 100, 1) : 100.0;

        // 2. Breakdown by Certification Type (BLS, ACLS, PALS, ATLS, NRP)
        $certTypes = ['BLS', 'ACLS', 'PALS', 'ATLS', 'NRP'];
        $typeBreakdown = [];
        $stmtType = $pdo->query("
            SELECT
                cert_type,
                COUNT(*) as total,
                SUM(CASE WHEN expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY) THEN 1 ELSE 0 END) as valid_count,
                SUM(CASE WHEN expiry_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY) THEN 1 ELSE 0 END) as expiring_count,
                SUM(CASE WHEN expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) as expired_count
            FROM `hr_life_support_certifications`
            WHERE `status` != 'revoked'
            GROUP BY cert_type
        ");
        $rows = $stmtType->fetchAll(PDO::FETCH_ASSOC);
        $keyed = [];
        foreach ($rows as $r) {
            $keyed[$r['cert_type']] = $r;
        }

        foreach ($certTypes as $type) {
            $item = $keyed[$type] ?? null;
            $tot = $item ? (int)$item['total'] : 0;
            $val = $item ? (int)$item['valid_count'] : 0;
            $typeBreakdown[$type] = [
                'total' => $tot,
                'valid' => $val,
                'expiring' => $item ? (int)$item['expiring_count'] : 0,
                'expired' => $item ? (int)$item['expired_count'] : 0,
                'compliance_pct' => $tot > 0 ? round(($val / $tot) * 100, 1) : 100.0
            ];
        }

        // 3. Reminders Dispatched Count
        $remindersCount = (int)$pdo->query("SELECT COUNT(*) FROM `hr_life_support_reminders`")->fetchColumn();
        $pendingAckCount = (int)$pdo->query("SELECT COUNT(*) FROM `hr_life_support_reminders` WHERE `status` = 'dispatched'")->fetchColumn();

        return [
            'total_certs' => $totalCerts,
            'active_compliant' => $activeCompliant,
            'expiring_soon' => $expiringSoon,
            'critical_7_day' => $critical7Day,
            'expired_count' => $expiredCount,
            'total_certified_staff' => $certifiedStaff,
            'compliance_rate' => $complianceRate,
            'type_breakdown' => $typeBreakdown,
            'reminders_count' => $remindersCount,
            'pending_acknowledgments' => $pendingAckCount
        ];
    }

    /**
     * List Certifications with Dynamic Expiration Tracking
     */
    public function listCertifications(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['cert_type'])) {
            $where[] = "c.cert_type = ?";
            $params[] = $filters['cert_type'];
        }

        if (!empty($filters['department_id'])) {
            $where[] = "c.department_id = ?";
            $params[] = (int)$filters['department_id'];
        }

        if (!empty($filters['department_name'])) {
            $where[] = "c.department_name LIKE ?";
            $params[] = '%' . $filters['department_name'] . '%';
        }

        if (!empty($filters['employee_id'])) {
            $where[] = "c.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['verification_status'])) {
            $where[] = "c.verification_status = ?";
            $params[] = $filters['verification_status'];
        }

        if (!empty($filters['status_tier'])) {
            switch ($filters['status_tier']) {
                case 'active':
                    $where[] = "c.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY) AND c.status != 'revoked'";
                    break;
                case 'expiring_soon':
                    $where[] = "c.expiry_date BETWEEN DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY) AND DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY)";
                    break;
                case 'critical':
                    $where[] = "c.expiry_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)";
                    break;
                case 'expired':
                    $where[] = "c.expiry_date < CURRENT_DATE";
                    break;
            }
        } elseif (!empty($filters['status'])) {
            $where[] = "c.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(c.staff_name LIKE ? OR c.staff_role LIKE ? OR c.certificate_number LIKE ? OR c.ecard_code LIKE ? OR c.training_site LIKE ? OR c.instructor_name LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        // Count total
        $countSql = "SELECT COUNT(*) FROM `hr_life_support_certifications` c WHERE {$whereClause}";
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT
                c.*,
                DATEDIFF(c.expiry_date, CURRENT_DATE) as days_remaining,
                DATEDIFF(CURRENT_DATE, c.issue_date) as days_elapsed,
                ROUND((DATEDIFF(CURRENT_DATE, c.issue_date) / (c.validity_years * 365.25)) * 100, 1) as lifecycle_pct
            FROM `hr_life_support_certifications` c
            WHERE {$whereClause}
            ORDER BY c.expiry_date ASC, c.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Enrich records with real-time expiration alert metadata
        foreach ($records as &$rec) {
            $days = (int)$rec['days_remaining'];
            if ($rec['status'] === 'revoked') {
                $rec['urgency_badge'] = 'revoked';
                $rec['alert_label'] = 'Revoked';
            } elseif ($days < 0) {
                if ($days >= -30) {
                    $rec['urgency_badge'] = 'grace_period';
                    $rec['alert_label'] = 'In Grace Period (' . abs($days) . 'd ago)';
                } else {
                    $rec['urgency_badge'] = 'expired';
                    $rec['alert_label'] = 'Expired (' . abs($days) . 'd ago)';
                }
            } elseif ($days <= 7) {
                $rec['urgency_badge'] = 'critical';
                $rec['alert_label'] = 'Expires in ' . $days . 'd (Critical)';
            } elseif ($days <= 30) {
                $rec['urgency_badge'] = 'urgent';
                $rec['alert_label'] = 'Expires in ' . $days . 'd (30d Urgent)';
            } elseif ($days <= 60) {
                $rec['urgency_badge'] = 'expiring_soon';
                $rec['alert_label'] = 'Expires in ' . $days . 'd (60d Notice)';
            } else {
                $rec['urgency_badge'] = 'valid';
                $rec['alert_label'] = $days . ' days remaining';
            }
        }

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records,
            'metrics' => $this->getExecutiveMetrics()
        ];
    }

    /**
     * Get Certification Detail with Reminders Trail
     */
    public function getCertificationDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT
                c.*,
                DATEDIFF(c.expiry_date, CURRENT_DATE) as days_remaining,
                e.employee_no,
                e.email as employee_email,
                e.phone as employee_phone
            FROM `hr_life_support_certifications` c
            LEFT JOIN `employees` e ON c.employee_id = e.id
            WHERE c.id = ?
        ");
        $stmt->execute([$id]);
        $cert = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$cert) {
            return null;
        }

        // Reminders history
        $stmtRem = $pdo->prepare("
            SELECT * FROM `hr_life_support_reminders`
            WHERE `certification_id` = ?
            ORDER BY `dispatched_at` DESC
        ");
        $stmtRem->execute([$id]);
        $reminders = $stmtRem->fetchAll(PDO::FETCH_ASSOC);

        // Related department mandatory matrix rules
        $stmtReq = $pdo->prepare("
            SELECT * FROM `hr_life_support_requirements`
            WHERE `cert_type` = ? AND `department_name` = ?
        ");
        $stmtReq->execute([$cert['cert_type'], $cert['department_name']]);
        $requirement = $stmtReq->fetch(PDO::FETCH_ASSOC) ?: null;

        return [
            'certification' => $cert,
            'reminders' => $reminders,
            'requirement' => $requirement
        ];
    }

    /**
     * Create or Update Life Support Certification
     */
    public function saveCertification(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $id = !empty($data['id']) ? (int)$data['id'] : null;
            $employeeId = (int)($data['employee_id'] ?? 0);

            // Fetch employee details if not provided
            $staffName = trim($data['staff_name'] ?? '');
            $staffRole = trim($data['staff_role'] ?? '');
            $deptId = !empty($data['department_id']) ? (int)$data['department_id'] : null;
            $deptName = trim($data['department_name'] ?? '');

            if ($employeeId > 0 && (empty($staffName) || empty($deptName))) {
                $stmtEmp = $pdo->prepare("
                    SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) as name, e.department_id, d.name as dept_name
                    FROM employees e
                    LEFT JOIN departments d ON e.department_id = d.id
                    WHERE e.id = ?
                ");
                $stmtEmp->execute([$employeeId]);
                $emp = $stmtEmp->fetch(PDO::FETCH_ASSOC);
                if ($emp) {
                    if (empty($staffName)) $staffName = $emp['name'];
                    if (empty($deptName)) $deptName = $emp['dept_name'] ?: 'Clinical Services';
                    if (!$deptId) $deptId = (int)$emp['department_id'];
                }
            }

            $certType = strtoupper(trim($data['cert_type'] ?? 'BLS'));
            $issuingOrg = trim($data['issuing_organization'] ?? 'American Heart Association (AHA)');
            $certNumber = trim($data['certificate_number'] ?? '');
            $ecardCode = !empty($data['ecard_code']) ? trim($data['ecard_code']) : null;
            $issueDate = $data['issue_date'] ?? date('Y-m-d');
            $validityYears = !empty($data['validity_years']) ? (int)$data['validity_years'] : ($certType === 'ATLS' ? 4 : 2);

            // Calculate expiry date if not provided
            if (!empty($data['expiry_date'])) {
                $expiryDate = $data['expiry_date'];
            } else {
                $expiryDate = date('Y-m-d', strtotime("+{$validityYears} years", strtotime($issueDate)));
            }

            // Derive current status based on expiry
            $daysLeft = (int)((strtotime($expiryDate) - strtotime(date('Y-m-d'))) / 86400);
            if (!empty($data['status']) && $data['status'] === 'revoked') {
                $status = 'revoked';
            } elseif ($daysLeft < 0) {
                $status = ($daysLeft >= -30) ? 'in_grace_period' : 'expired';
            } elseif ($daysLeft <= 60) {
                $status = 'expiring_soon';
            } else {
                $status = 'active';
            }

            $instructor = !empty($data['instructor_name']) ? trim($data['instructor_name']) : null;
            $trainingSite = !empty($data['training_site']) ? trim($data['training_site']) : 'Hospital Resuscitation Simulation Center';
            $verificationStatus = $data['verification_status'] ?? 'verified';
            $verifiedByUser = !empty($data['verified_by_user']) ? trim($data['verified_by_user']) : 'Clinical Credentials Office';
            $documentAttachment = !empty($data['document_attachment']) ? trim($data['document_attachment']) : null;
            $notes = !empty($data['notes']) ? trim($data['notes']) : null;

            if ($id) {
                // Update
                $stmt = $pdo->prepare("
                    UPDATE `hr_life_support_certifications` SET
                        `employee_id` = ?,
                        `staff_name` = ?,
                        `staff_role` = ?,
                        `department_id` = ?,
                        `department_name` = ?,
                        `cert_type` = ?,
                        `issuing_organization` = ?,
                        `certificate_number` = ?,
                        `ecard_code` = ?,
                        `issue_date` = ?,
                        `expiry_date` = ?,
                        `validity_years` = ?,
                        `status` = ?,
                        `instructor_name` = ?,
                        `training_site` = ?,
                        `verification_status` = ?,
                        `verified_by_user` = ?,
                        `verified_at` = NOW(),
                        `document_attachment` = ?,
                        `notes` = ?,
                        `updated_at` = NOW()
                    WHERE `id` = ?
                ");
                $stmt->execute([
                    $employeeId, $staffName, $staffRole, $deptId, $deptName,
                    $certType, $issuingOrg, $certNumber, $ecardCode, $issueDate,
                    $expiryDate, $validityYears, $status, $instructor, $trainingSite,
                    $verificationStatus, $verifiedByUser, $documentAttachment, $notes,
                    $id
                ]);
                $certCode = $data['certification_code'] ?? "LSC-{$id}";
            } else {
                // Create
                $certCode = self::generateCertificationCode($pdo);
                $stmt = $pdo->prepare("
                    INSERT INTO `hr_life_support_certifications` (
                        `certification_code`, `employee_id`, `staff_name`, `staff_role`,
                        `department_id`, `department_name`, `cert_type`, `issuing_organization`,
                        `certificate_number`, `ecard_code`, `issue_date`, `expiry_date`,
                        `validity_years`, `status`, `instructor_name`, `training_site`,
                        `verification_status`, `verified_by_user`, `verified_at`, `document_attachment`,
                        `notes`, `created_by`, `created_at`, `updated_at`
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, NOW(), ?,
                        ?, ?, NOW(), NOW()
                    )
                ");
                $stmt->execute([
                    $certCode, $employeeId, $staffName, $staffRole,
                    $deptId, $deptName, $certType, $issuingOrg,
                    $certNumber, $ecardCode, $issueDate, $expiryDate,
                    $validityYears, $status, $instructor, $trainingSite,
                    $verificationStatus, $verifiedByUser, $documentAttachment,
                    $notes, $userId
                ]);
                $id = (int)$pdo->lastInsertId();
            }

            $pdo->commit();

            return [
                'id' => $id,
                'certification_code' => $certCode,
                'message' => "Life support certification #{$certCode} saved successfully."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Delete Certification
     */
    public function deleteCertification(int $id): bool
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmtRem = $pdo->prepare("DELETE FROM `hr_life_support_reminders` WHERE `certification_id` = ?");
            $stmtRem->execute([$id]);

            $stmt = $pdo->prepare("DELETE FROM `hr_life_support_certifications` WHERE `id` = ?");
            $stmt->execute([$id]);

            $pdo->commit();
            return true;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Automated Expiration Scanner & Recertification Reminders Engine
     * Evaluates 90-day, 60-day, 30-day, 7-day, and Expired Tiers
     */
    public function scanExpirationsAndDispatchReminders(): array
    {
        $pdo = Database::connection();
        $today = date('Y-m-d');

        // Fetch all active/expiring certifications
        $stmt = $pdo->query("
            SELECT
                c.*,
                DATEDIFF(c.expiry_date, CURRENT_DATE) as days_remaining,
                e.email as employee_email
            FROM `hr_life_support_certifications` c
            LEFT JOIN `employees` e ON c.employee_id = e.id
            WHERE c.status != 'revoked'
        ");
        $certifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $scannedCount = count($certifications);
        $dispatchedCount = 0;
        $updatedStatusCount = 0;
        $dispatchedLogs = [];

        foreach ($certifications as $cert) {
            $days = (int)$cert['days_remaining'];
            $certId = (int)$cert['id'];
            $empId = (int)$cert['employee_id'];
            $certType = $cert['cert_type'];
            $staffName = $cert['staff_name'];
            $certNumber = $cert['certificate_number'];
            $expiryDate = $cert['expiry_date'];
            $empEmail = $cert['employee_email'] ?: ($cert['staff_name'] ? strtolower(str_replace(' ', '.', preg_replace('/[^a-zA-Z ]/', '', $cert['staff_name']))) . '@hospital.org' : 'clinical.staff@hospital.org');

            // 1. Determine Tier
            $tier = null;
            $msgTitle = "";
            $msgBody = "";
            $channel = 'in_app';
            $newStatus = $cert['status'];

            if ($days < 0) {
                $tier = 'expired_lapse';
                $newStatus = ($days >= -30) ? 'in_grace_period' : 'expired';
                $channel = 'clinical_director_alert';
                $msgTitle = "CLINICAL PRIVILEGE RESTRICTION: {$certType} CERTIFICATION EXPIRED";
                $msgBody = "URGENT GOVERNANCE ACTION: Your {$certType} Certification #{$certNumber} expired on {$expiryDate} (" . abs($days) . " days ago). Code Blue and Resuscitation team privileges are subject to immediate clinical hold until renewed credentials are confirmed.";
            } elseif ($days <= 7) {
                $tier = '7_day_critical';
                $newStatus = 'expiring_soon';
                $channel = 'clinical_director_alert';
                $msgTitle = "CRITICAL 7-DAY NOTICE: {$certType} RECERTIFICATION EXPIRATION";
                $msgBody = "FINAL WARNING: Your {$certType} Provider Certification #{$certNumber} will expire in {$days} days ({$expiryDate}). Failure to complete recertification before lapse will trigger shift lockout from acute resuscitation duties.";
            } elseif ($days <= 30) {
                $tier = '30_day_urgent';
                $newStatus = 'expiring_soon';
                $channel = 'in_app';
                $msgTitle = "Urgent 30-Day Reminder: {$certType} Certification Expiration";
                $msgBody = "Notice: Your {$certType} Provider Certification #{$certNumber} expires in {$days} days on {$expiryDate}. Please schedule your recertification skills station exam with the Resuscitation Simulation Center.";
            } elseif ($days <= 60) {
                $tier = '60_day_notice';
                $newStatus = 'expiring_soon';
                $channel = 'in_app';
                $msgTitle = "60-Day Recertification Advisory: {$certType}";
                $msgBody = "Advisory: Your {$certType} Certification #{$certNumber} will expire on {$expiryDate} (in {$days} days). Early registration for upcoming institutional refresher courses is strongly recommended.";
            } elseif ($days <= 90) {
                $tier = '90_day_notice';
                $channel = 'in_app';
                $msgTitle = "90-Day Early Recertification Notice: {$certType}";
                $msgBody = "Early notice: Your {$certType} certification is due for renewal on {$expiryDate} (90-day window now open).";
            }

            // Update status if changed
            if ($newStatus !== $cert['status']) {
                $stmtUp = $pdo->prepare("UPDATE `hr_life_support_certifications` SET `status` = ?, `updated_at` = NOW() WHERE `id` = ?");
                $stmtUp->execute([$newStatus, $certId]);
                $updatedStatusCount++;
            }

            // Check if reminder was already dispatched for this tier within the last 14 days
            if ($tier !== null) {
                $stmtCheck = $pdo->prepare("
                    SELECT id FROM `hr_life_support_reminders`
                    WHERE `certification_id` = ? AND `reminder_tier` = ?
                    AND `dispatched_at` > DATE_SUB(NOW(), INTERVAL 14 DAY)
                    LIMIT 1
                ");
                $stmtCheck->execute([$certId, $tier]);
                $alreadySent = $stmtCheck->fetchColumn();

                if (!$alreadySent) {
                    $stmtInsRem = $pdo->prepare("
                        INSERT INTO `hr_life_support_reminders` (
                            `certification_id`, `employee_id`, `staff_name`, `cert_type`,
                            `reminder_tier`, `days_remaining`, `expiry_date`, `notification_channel`,
                            `recipient_email`, `message_title`, `message_body`, `dispatched_at`, `status`
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'dispatched')
                    ");
                    $stmtInsRem->execute([
                        $certId, $empId, $staffName, $certType,
                        $tier, $days, $expiryDate, $channel,
                        $empEmail, $msgTitle, $msgBody
                    ]);

                    // Update cert last reminder info
                    $stmtCertUp = $pdo->prepare("
                        UPDATE `hr_life_support_certifications`
                        SET `last_reminder_sent_at` = NOW(), `last_reminder_tier` = ?
                        WHERE `id` = ?
                    ");
                    $stmtCertUp->execute([$tier, $certId]);

                    $dispatchedCount++;
                    $dispatchedLogs[] = [
                        'staff_name' => $staffName,
                        'cert_type' => $certType,
                        'tier' => $tier,
                        'days_remaining' => $days,
                        'channel' => $channel
                    ];
                }
            }
        }

        return [
            'scanned_certifications' => $scannedCount,
            'reminders_dispatched' => $dispatchedCount,
            'status_updated_count' => $updatedStatusCount,
            'details' => $dispatchedLogs,
            'scanned_at' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Dispatch Manual On-Demand Reminder
     */
    public function sendManualReminder(int $certId, array $payload, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $certDetail = $this->getCertificationDetail($certId);
        if (!$certDetail) {
            throw new \Exception("Certification #{$certId} not found.");
        }

        $cert = $certDetail['certification'];
        $days = (int)$cert['days_remaining'];
        $channel = $payload['notification_channel'] ?? 'in_app';
        $customNotes = trim($payload['custom_notes'] ?? '');

        $title = "Official Recertification Reminder: {$cert['cert_type']} ({$cert['certificate_number']})";
        $body = "Notice dispatched by Clinical Credentials Governance for {$cert['staff_name']} ({$cert['staff_role']}). "
              . "Your {$cert['cert_type']} certification expires on {$cert['expiry_date']} ({$days} days remaining). "
              . ($customNotes ? "\nNote from Director: {$customNotes}" : "");

        $tier = ($days < 0) ? 'expired_lapse' : (($days <= 7) ? '7_day_critical' : (($days <= 30) ? '30_day_urgent' : '60_day_notice'));

        $stmt = $pdo->prepare("
            INSERT INTO `hr_life_support_reminders` (
                `certification_id`, `employee_id`, `staff_name`, `cert_type`,
                `reminder_tier`, `days_remaining`, `expiry_date`, `notification_channel`,
                `recipient_email`, `message_title`, `message_body`, `dispatched_at`, `status`
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'dispatched')
        ");
        $stmt->execute([
            $certId, $cert['employee_id'], $cert['staff_name'], $cert['cert_type'],
            $tier, $days, $cert['expiry_date'], $channel,
            $cert['employee_email'] ?: 'clinician@hospital.org', $title, $body
        ]);
        $reminderId = (int)$pdo->lastInsertId();

        $pdo->prepare("
            UPDATE `hr_life_support_certifications`
            SET `last_reminder_sent_at` = NOW(), `last_reminder_tier` = ?
            WHERE `id` = ?
        ")->execute([$tier, $certId]);

        return [
            'reminder_id' => $reminderId,
            'message' => "Recertification reminder successfully dispatched to {$cert['staff_name']} via {$channel}."
        ];
    }

    /**
     * Acknowledge Reminder
     */
    public function acknowledgeReminder(int $reminderId, string $acknowledgedBy): bool
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            UPDATE `hr_life_support_reminders`
            SET `status` = 'acknowledged', `acknowledged_at` = NOW(), `acknowledged_by` = ?
            WHERE `id` = ?
        ");
        return $stmt->execute([$acknowledgedBy, $reminderId]);
    }

    /**
     * List Reminders Audit Trail
     */
    public function listReminders(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['cert_type'])) {
            $where[] = "cert_type = ?";
            $params[] = $filters['cert_type'];
        }

        if (!empty($filters['tier'])) {
            $where[] = "reminder_tier = ?";
            $params[] = $filters['tier'];
        }

        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(staff_name LIKE ? OR message_title LIKE ? OR recipient_email LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM `hr_life_support_reminders` WHERE {$whereClause}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $stmt = $pdo->prepare("
            SELECT * FROM `hr_life_support_reminders`
            WHERE {$whereClause}
            ORDER BY `dispatched_at` DESC
            LIMIT {$perPage} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'reminders' => $records
        ];
    }

    /**
     * Clinical Role-to-Certification Requirements Matrix & Gap Analysis
     */
    public function getComplianceMatrix(): array
    {
        $pdo = Database::connection();

        // 1. Fetch all requirements
        $reqs = $pdo->query("
            SELECT * FROM `hr_life_support_requirements`
            ORDER BY `department_name`, `clinical_role`, `cert_type`
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Group by department
        $departments = [];
        foreach ($reqs as $r) {
            $dept = $r['department_name'];
            if (!isset($departments[$dept])) {
                $departments[$dept] = [
                    'department_name' => $dept,
                    'roles' => []
                ];
            }
            $role = $r['clinical_role'];
            if (!isset($departments[$dept]['roles'][$role])) {
                $departments[$dept]['roles'][$role] = [
                    'clinical_role' => $role,
                    'required_certs' => [],
                    'staff_members' => []
                ];
            }
            $departments[$dept]['roles'][$role]['required_certs'][] = [
                'cert_type' => $r['cert_type'],
                'is_mandatory' => (bool)$r['is_mandatory'],
                'grace_period_days' => (int)$r['grace_period_days'],
                'clinical_impact' => $r['clinical_impact_on_lapse']
            ];
        }

        // 2. Cross-reference staff certifications
        $activeCerts = $pdo->query("
            SELECT
                c.employee_id,
                c.staff_name,
                c.staff_role,
                c.department_name,
                c.cert_type,
                c.certificate_number,
                c.expiry_date,
                c.status,
                DATEDIFF(c.expiry_date, CURRENT_DATE) as days_remaining
            FROM `hr_life_support_certifications` c
            WHERE c.status != 'revoked'
        ")->fetchAll(PDO::FETCH_ASSOC);

        $staffCertMap = [];
        foreach ($activeCerts as $c) {
            $empId = (int)$c['employee_id'];
            if (!isset($staffCertMap[$empId])) {
                $staffCertMap[$empId] = [
                    'employee_id' => $empId,
                    'name' => $c['staff_name'],
                    'role' => $c['staff_role'],
                    'dept' => $c['department_name'],
                    'certs' => []
                ];
            }
            $staffCertMap[$empId]['certs'][$c['cert_type']] = [
                'cert_type' => $c['cert_type'],
                'cert_no' => $c['certificate_number'],
                'expiry_date' => $c['expiry_date'],
                'status' => $c['status'],
                'days_remaining' => (int)$c['days_remaining'],
                'is_valid' => ((int)$c['days_remaining'] >= 0)
            ];
        }

        // Reformat departments for array return
        $resultDepts = [];
        foreach ($departments as $deptName => $deptData) {
            $rolesList = [];
            foreach ($deptData['roles'] as $roleName => $roleData) {
                // Find enrolled staff
                $enrolled = [];
                foreach ($staffCertMap as $s) {
                    if (stripos($s['dept'], $deptName) !== false || stripos($s['role'], $roleName) !== false) {
                        // Check compliance against required certs
                        $missing = [];
                        $expired = [];
                        foreach ($roleData['required_certs'] as $rc) {
                            $type = $rc['cert_type'];
                            if (!isset($s['certs'][$type])) {
                                $missing[] = $type;
                            } elseif (!$s['certs'][$type]['is_valid']) {
                                $expired[] = $type;
                            }
                        }
                        $s['missing_certs'] = $missing;
                        $s['expired_certs'] = $expired;
                        $s['is_fully_compliant'] = (empty($missing) && empty($expired));
                        $enrolled[] = $s;
                    }
                }
                $roleData['staff_members'] = $enrolled;
                $rolesList[] = $roleData;
            }
            $resultDepts[] = [
                'department_name' => $deptName,
                'roles' => $rolesList
            ];
        }

        return [
            'matrix' => $resultDepts,
            'total_requirements' => count($reqs),
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * UI Metadata: Staff list, cert types, issuing organizations
     */
    public function getMetadata(): array
    {
        $pdo = Database::connection();

        // Staff list
        $staff = $pdo->query("
            SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) as full_name, e.department_id, d.name as department_name, e.duty_tag
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            ORDER BY e.last_name ASC, e.first_name ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Departments
        $departments = $pdo->query("SELECT id, name FROM departments ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

        $certTypes = [
            'BLS' => [
                'code' => 'BLS',
                'name' => 'Basic Life Support (BLS)',
                'acronym' => 'BLS',
                'validity_years' => 2,
                'target_audience' => 'All Healthcare Providers, Nurses, Physicians, Emergency Responders',
                'standard_accreditor' => 'American Heart Association (AHA) / Red Cross'
            ],
            'ACLS' => [
                'code' => 'ACLS',
                'name' => 'Advanced Cardiovascular Life Support (ACLS)',
                'acronym' => 'ACLS',
                'validity_years' => 2,
                'target_audience' => 'Emergency Physicians, ICU/CCU Nurses, Cardiologists, Anesthesiologists, Code Blue Leads',
                'standard_accreditor' => 'American Heart Association (AHA)'
            ],
            'PALS' => [
                'code' => 'PALS',
                'name' => 'Pediatric Advanced Life Support (PALS)',
                'acronym' => 'PALS',
                'validity_years' => 2,
                'target_audience' => 'Pediatricians, PICU Nurses, Emergency Physicians, Pediatric Resuscitation Teams',
                'standard_accreditor' => 'American Heart Association (AHA) / AAP'
            ],
            'ATLS' => [
                'code' => 'ATLS',
                'name' => 'Advanced Trauma Life Support (ATLS)',
                'acronym' => 'ATLS',
                'validity_years' => 4,
                'target_audience' => 'Trauma Surgeons, Emergency Medicine Physicians, Surgical Intensivists',
                'standard_accreditor' => 'American College of Surgeons (ACS) Committee on Trauma'
            ],
            'NRP' => [
                'code' => 'NRP',
                'name' => 'Neonatal Resuscitation Program (NRP)',
                'acronym' => 'NRP',
                'validity_years' => 2,
                'target_audience' => 'Obstetricians, NICU Nurses, Labor & Delivery Staff, Neonatologists',
                'standard_accreditor' => 'American Academy of Pediatrics (AAP) / AHA'
            ]
        ];

        $issuingOrgs = [
            'American Heart Association (AHA)',
            'American College of Surgeons (ACS) Committee on Trauma',
            'American Academy of Pediatrics (AAP)',
            'American Red Cross',
            'European Resuscitation Council (ERC)',
            'National Association of Emergency Medical Technicians (NAEMT)'
        ];

        return [
            'staff' => $staff,
            'departments' => $departments,
            'cert_types' => $certTypes,
            'issuing_organizations' => $issuingOrgs
        ];
    }
}
