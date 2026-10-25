<?php

namespace App\Modules\ArAging\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class ArAgingService
{
    /**
     * Atomically generate unique AR account number AR-YYYY-XXXXX
     */
    public static function generateAccountNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_ar_counters WHERE counter_type = 'AR_ACCOUNT' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_ar_counters (counter_type, year, last_number) VALUES ('AR_ACCOUNT', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_ar_counters SET last_number = ? WHERE counter_type = 'AR_ACCOUNT' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("AR-%04d-%05d", $year, $seq);
    }

    /**
     * Recalculate days_aged and aging_bucket for all open AR accounts
     */
    public function recalculateAgingBuckets(?PDO $pdo = null): int
    {
        $pdo = $pdo ?: Database::connection();

        $sql = "
            UPDATE billing_ar_accounts
            SET
                days_aged = GREATEST(0, DATEDIFF(CURRENT_DATE, service_date)),
                aging_bucket = CASE
                    WHEN DATEDIFF(CURRENT_DATE, service_date) <= 30 THEN '0-30'
                    WHEN DATEDIFF(CURRENT_DATE, service_date) <= 60 THEN '31-60'
                    WHEN DATEDIFF(CURRENT_DATE, service_date) <= 90 THEN '61-90'
                    WHEN DATEDIFF(CURRENT_DATE, service_date) <= 120 THEN '91-120'
                    ELSE '120+'
                END
            WHERE current_balance > 0 AND collection_status NOT IN ('settled', 'bad_debt_write_off')
        ";

        return (int)$pdo->exec($sql);
    }

    /**
     * Automatically synchronize open Inpatient Master Folios into AR Ledger
     */
    public function syncFoliosIntoAr(?PDO $pdo = null): int
    {
        $pdo = $pdo ?: Database::connection();

        // Find open or closed folios with positive balance that are not yet in AR accounts
        $stmt = $pdo->query("
            SELECT f.*, p.first_name, p.last_name
            FROM billing_inpatient_folios f
            JOIN patients p ON p.id = f.patient_id
            WHERE f.balance_due > 0.05
              AND f.id NOT IN (SELECT folio_id FROM billing_ar_accounts WHERE folio_id IS NOT NULL)
        ");
        $folios = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $inserted = 0;
        foreach ($folios as $f) {
            $serviceDate = !empty($f['admitted_at']) ? substr($f['admitted_at'], 0, 10) : date('Y-m-d');
            $dischargeDate = !empty($f['discharged_at']) ? substr($f['discharged_at'], 0, 10) : null;
            $balance = (float)$f['balance_due'];

            $payerCategory = 'self_pay';
            $payerName = 'Self-Pay / Patient Responsibility';

            if ((float)$f['insurance_covered_amount'] > 0) {
                $payerCategory = 'commercial_hmo';
                $payerName = 'PhilHealth / Commercial HMO Insurance';
            }

            $acctNo = self::generateAccountNumber($pdo);
            $ins = $pdo->prepare("
                INSERT INTO billing_ar_accounts (
                    account_number, patient_id, folio_id, invoice_number,
                    service_date, discharge_date, payer_category, payer_name,
                    total_charges, insurance_paid, insurance_adjusted,
                    patient_paid, patient_discount, current_balance,
                    days_aged, aging_bucket, collection_status, notes
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, 0.00,
                    ?, ?, ?,
                    GREATEST(0, DATEDIFF(CURRENT_DATE, ?)),
                    CASE
                        WHEN DATEDIFF(CURRENT_DATE, ?) <= 30 THEN '0-30'
                        WHEN DATEDIFF(CURRENT_DATE, ?) <= 60 THEN '31-60'
                        WHEN DATEDIFF(CURRENT_DATE, ?) <= 90 THEN '61-90'
                        WHEN DATEDIFF(CURRENT_DATE, ?) <= 120 THEN '91-120'
                        ELSE '120+'
                    END,
                    'current', ?
                )
            ");

            $ins->execute([
                $acctNo,
                (int)$f['patient_id'],
                (int)$f['id'],
                $f['folio_number'],
                $serviceDate,
                $dischargeDate,
                $payerCategory,
                $payerName,
                (float)$f['gross_amount'],
                (float)$f['insurance_covered_amount'],
                (float)$f['paid_amount'],
                (float)$f['discount_amount'],
                $balance,
                $serviceDate,
                $serviceDate,
                $serviceDate,
                $serviceDate,
                $serviceDate,
                "Inpatient Master Folio {$f['folio_number']} synced into AR Ledger."
            ]);

            $inserted++;
        }

        return $inserted;
    }

    /**
     * Compute Executive AR Aging Matrix (Payer Category rows vs Aging Bucket columns)
     */
    public function getAgingMatrix(): array
    {
        $pdo = Database::connection();
        $this->recalculateAgingBuckets($pdo);

        $sql = "
            SELECT
                payer_category,
                aging_bucket,
                COUNT(*) AS count_accounts,
                SUM(current_balance) AS total_balance,
                SUM(current_balance * days_aged) AS weighted_days
            FROM billing_ar_accounts
            WHERE current_balance > 0 AND collection_status NOT IN ('settled', 'bad_debt_write_off')
            GROUP BY payer_category, aging_bucket
        ";

        $stmt = $pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $payers = ['self_pay', 'commercial_hmo', 'government'];
        $buckets = ['0-30', '31-60', '61-90', '91-120', '120+'];

        // Initialize grid
        $matrix = [];
        foreach ($payers as $p) {
            $matrix[$p] = [
                'payer_category' => $p,
                'payer_label' => self::formatPayerCategory($p),
                'buckets' => [
                    '0-30' => ['count' => 0, 'balance' => 0.0],
                    '31-60' => ['count' => 0, 'balance' => 0.0],
                    '61-90' => ['count' => 0, 'balance' => 0.0],
                    '91-120' => ['count' => 0, 'balance' => 0.0],
                    '120+' => ['count' => 0, 'balance' => 0.0],
                ],
                'total_balance' => 0.0,
                'total_accounts' => 0,
                'weighted_days' => 0.0,
                'avg_days_in_ar' => 0.0,
                'pct_of_total_ar' => 0.0
            ];
        }

        $grandTotalBalance = 0.0;
        $grandTotalAccounts = 0;
        $grandWeightedDays = 0.0;
        $bucketTotals = [
            '0-30' => ['count' => 0, 'balance' => 0.0],
            '31-60' => ['count' => 0, 'balance' => 0.0],
            '61-90' => ['count' => 0, 'balance' => 0.0],
            '91-120' => ['count' => 0, 'balance' => 0.0],
            '120+' => ['count' => 0, 'balance' => 0.0],
        ];

        foreach ($rows as $r) {
            $p = $r['payer_category'];
            $b = $r['aging_bucket'];
            $bal = (float)$r['total_balance'];
            $cnt = (int)$r['count_accounts'];
            $wDays = (float)$r['weighted_days'];

            if (isset($matrix[$p]['buckets'][$b])) {
                $matrix[$p]['buckets'][$b]['count'] += $cnt;
                $matrix[$p]['buckets'][$b]['balance'] += $bal;
                $matrix[$p]['total_balance'] += $bal;
                $matrix[$p]['total_accounts'] += $cnt;
                $matrix[$p]['weighted_days'] += $wDays;

                $bucketTotals[$b]['count'] += $cnt;
                $bucketTotals[$b]['balance'] += $bal;
                $grandTotalBalance += $bal;
                $grandTotalAccounts += $cnt;
                $grandWeightedDays += $wDays;
            }
        }

        // Calculate averages and percentages
        foreach ($payers as $p) {
            if ($matrix[$p]['total_balance'] > 0) {
                $matrix[$p]['avg_days_in_ar'] = round($matrix[$p]['weighted_days'] / $matrix[$p]['total_balance'], 1);
            }
            if ($grandTotalBalance > 0) {
                $matrix[$p]['pct_of_total_ar'] = round(($matrix[$p]['total_balance'] / $grandTotalBalance) * 100, 1);
            }
        }

        // Bucket percentages
        $bucketPct = [];
        foreach ($buckets as $b) {
            $bucketPct[$b] = $grandTotalBalance > 0
                ? round(($bucketTotals[$b]['balance'] / $grandTotalBalance) * 100, 1)
                : 0.0;
        }

        $grandAvgDays = $grandTotalBalance > 0
            ? round($grandWeightedDays / $grandTotalBalance, 1)
            : 0.0;

        // Critical AR: >90 Days balance (91-120 + 120+)
        $delinquentArBalance = $bucketTotals['91-120']['balance'] + $bucketTotals['120+']['balance'];
        $delinquentPct = $grandTotalBalance > 0
            ? round(($delinquentArBalance / $grandTotalBalance) * 100, 1)
            : 0.0;

        // Clean Current AR: 0-30 Days balance
        $currentPct = $grandTotalBalance > 0
            ? round(($bucketTotals['0-30']['balance'] / $grandTotalBalance) * 100, 1)
            : 0.0;

        return [
            'matrix' => array_values($matrix),
            'bucket_totals' => $bucketTotals,
            'bucket_percentages' => $bucketPct,
            'grand_totals' => [
                'total_ar' => $grandTotalBalance,
                'total_accounts' => $grandTotalAccounts,
                'avg_days_in_ar' => $grandAvgDays,
                'current_pct_0_30' => $currentPct,
                'delinquent_balance_over_90' => $delinquentArBalance,
                'delinquent_pct_over_90' => $delinquentPct
            ]
        ];
    }

    /**
     * List detailed AR accounts with filtering, search, and pagination
     */
    public function listArAccounts(array $filters): array
    {
        $pdo = Database::connection();
        $this->recalculateAgingBuckets($pdo);

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = max(1, min(100, (int)($filters['per_page'] ?? 15)));
        $offset = ($page - 1) * $perPage;

        $where = ["a.current_balance > 0"];
        $params = [];

        if (!empty($filters['bucket']) && $filters['bucket'] !== 'all') {
            $where[] = "a.aging_bucket = ?";
            $params[] = $filters['bucket'];
        }

        if (!empty($filters['payer_category']) && $filters['payer_category'] !== 'all') {
            $where[] = "a.payer_category = ?";
            $params[] = $filters['payer_category'];
        }

        if (!empty($filters['collection_status']) && $filters['collection_status'] !== 'all') {
            $where[] = "a.collection_status = ?";
            $params[] = $filters['collection_status'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = "a.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = "(
                a.account_number LIKE ? OR
                a.invoice_number LIKE ? OR
                a.payer_name LIKE ? OR
                p.patient_no LIKE ? OR
                p.first_name LIKE ? OR
                p.last_name LIKE ? OR
                CONCAT(p.first_name, ' ', p.last_name) LIKE ?
            )";
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
        }

        $whereSql = implode(" AND ", $where);

        $countSql = "
            SELECT COUNT(*)
            FROM billing_ar_accounts a
            JOIN patients p ON p.id = a.patient_id
            WHERE {$whereSql}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $dataSql = "
            SELECT
                a.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_no,
                p.birthdate,
                p.sex,
                (SELECT COUNT(*) FROM billing_ar_collection_notes WHERE ar_account_id = a.id) AS notes_count
            FROM billing_ar_accounts a
            JOIN patients p ON p.id = a.patient_id
            WHERE {$whereSql}
            ORDER BY a.days_aged DESC, a.current_balance DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $dStmt = $pdo->prepare($dataSql);
        $dStmt->execute($params);
        $rows = $dStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $rows,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage)
        ];
    }

    /**
     * Get single AR account detail with full history of collection contact notes
     */
    public function getAccountDetail(int $id): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT
                a.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_no,
                p.birthdate,
                p.sex,
                f.folio_number,
                f.admitted_at,
                f.discharged_at
            FROM billing_ar_accounts a
            JOIN patients p ON p.id = a.patient_id
            LEFT JOIN billing_inpatient_folios f ON f.id = a.folio_id
            WHERE a.id = ?
        ");
        $stmt->execute([$id]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$account) {
            return null;
        }

        $nStmt = $pdo->prepare("
            SELECT * FROM billing_ar_collection_notes
            WHERE ar_account_id = ?
            ORDER BY id DESC
        ");
        $nStmt->execute([$id]);
        $account['collection_notes'] = $nStmt->fetchAll(PDO::FETCH_ASSOC);

        return $account;
    }

    /**
     * Log a collection follow-up action / promise to pay
     */
    public function logCollectionAction(
        int $accountId,
        array $data,
        ?int $userId = null,
        ?string $userName = null
    ): array {
        $pdo = Database::connection();
        $collector = $userName ?: 'Collection Specialist';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM billing_ar_accounts WHERE id = ? FOR UPDATE");
            $stmt->execute([$accountId]);
            $acct = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$acct) {
                throw new RuntimeException("AR account #{$accountId} not found.");
            }

            $contactType = trim($data['contact_type'] ?? 'phone_call');
            $contactedParty = trim($data['contacted_party'] ?? 'Patient');
            $actionOutcome = !empty($data['action_outcome']) ? trim($data['action_outcome']) : null;
            $notes = trim($data['notes'] ?? '');
            $nextFollowUp = !empty($data['next_follow_up_date']) ? trim($data['next_follow_up_date']) : null;
            $status = !empty($data['collection_status']) ? trim($data['collection_status']) : $acct['collection_status'];
            $promiseAmt = isset($data['promise_amount']) && $data['promise_amount'] !== '' ? (float)$data['promise_amount'] : null;
            $promiseDate = !empty($data['promise_date']) ? trim($data['promise_date']) : null;

            if (empty($notes)) {
                throw new RuntimeException("Collection note content is required.");
            }

            // Insert note
            $insNote = $pdo->prepare("
                INSERT INTO billing_ar_collection_notes (
                    ar_account_id, contact_type, contacted_party, action_outcome,
                    notes, next_follow_up_date, created_by, created_by_name, created_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, NOW()
                )
            ");
            $insNote->execute([
                $accountId,
                $contactType,
                $contactedParty,
                $actionOutcome,
                $notes,
                $nextFollowUp,
                $userId,
                $collector
            ]);

            // Update account state
            $upd = $pdo->prepare("
                UPDATE billing_ar_accounts SET
                    collection_status = ?,
                    last_contact_date = CURRENT_DATE(),
                    next_follow_up_date = ?,
                    promise_amount = COALESCE(?, promise_amount),
                    promise_date = COALESCE(?, promise_date),
                    assigned_collector = ?
                WHERE id = ?
            ");
            $upd->execute([
                $status,
                $nextFollowUp,
                $promiseAmt,
                $promiseDate,
                $collector,
                $accountId
            ]);

            $pdo->commit();
            return $this->getAccountDetail($accountId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to log collection action: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Update collection status (e.g., mark as in payment plan, referred to collections, etc.)
     */
    public function updateStatus(
        int $accountId,
        string $status,
        ?string $notes = null,
        ?int $userId = null,
        ?string $userName = null
    ): array {
        $pdo = Database::connection();
        $collector = $userName ?: 'Finance Supervisor';

        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("UPDATE billing_ar_accounts SET collection_status = ? WHERE id = ?");
            $upd->execute([$status, $accountId]);

            if ($notes) {
                $insNote = $pdo->prepare("
                    INSERT INTO billing_ar_collection_notes (
                        ar_account_id, contact_type, contacted_party, action_outcome,
                        notes, created_by, created_by_name, created_at
                    ) VALUES (
                        ?, 'internal_review', 'System/Supervisor', 'Status Change',
                        ?, ?, ?, NOW()
                    )
                ");
                $insNote->execute([$accountId, "Status changed to {$status}: {$notes}", $userId, $collector]);
            }

            $pdo->commit();
            return $this->getAccountDetail($accountId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to update AR status: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Seed a realistic hospital AR aging portfolio across all 3 payer types and 5 aging intervals
     */
    public function seedRealisticArDemonstration(): array
    {
        $pdo = Database::connection();

        // Check if accounts already exist
        $cntStmt = $pdo->query("SELECT COUNT(*) FROM billing_ar_accounts");
        $count = (int)$cntStmt->fetchColumn();

        if ($count >= 10) {
            return [
                'seeded' => 0,
                'message' => "AR Ledger already contains {$count} accounts. Syncing existing records.",
                'matrix' => $this->getAgingMatrix()
            ];
        }

        // Fetch patient IDs
        $pStmt = $pdo->query("SELECT id FROM patients ORDER BY id ASC LIMIT 20");
        $patientIds = $pStmt->fetchAll(PDO::FETCH_COLUMN);
        if (empty($patientIds)) {
            $patientIds = [42];
        }

        // Realistic seed cases across all buckets and payers
        $samples = [
            // Current (0–30 Days)
            [
                'days' => 12,
                'payer_cat' => 'self_pay',
                'payer' => 'Self-Pay / Patient Responsibility',
                'charges' => 1450.00,
                'ins_paid' => 0.00,
                'pt_paid' => 450.00,
                'status' => 'current',
                'desc' => 'Emergency Room acute laceration repair & observation fee balance.'
            ],
            [
                'days' => 21,
                'payer_cat' => 'commercial_hmo',
                'payer' => 'Blue Cross Blue Shield (Commercial)',
                'charges' => 18450.00,
                'ins_paid' => 0.00,
                'pt_paid' => 2000.00,
                'status' => 'current',
                'desc' => 'Elective laparoscopic cholecystectomy - primary insurance claim submitted.'
            ],
            [
                'days' => 18,
                'payer_cat' => 'government',
                'payer' => 'Medicare / PhilHealth Government Program',
                'charges' => 24800.00,
                'ins_paid' => 0.00,
                'pt_paid' => 1500.00,
                'status' => 'current',
                'desc' => 'Inpatient cardiac telemetry stay (4 days) - EDI 837 claim batch pending adjudication.'
            ],

            // 31–60 Days
            [
                'days' => 42,
                'payer_cat' => 'self_pay',
                'payer' => 'Self-Pay / Patient Responsibility',
                'charges' => 3800.00,
                'ins_paid' => 0.00,
                'pt_paid' => 1000.00,
                'status' => 'first_notice_sent',
                'desc' => 'Outpatient MRI Lumbar spine with contrast. 1st patient billing statement mailed.'
            ],
            [
                'days' => 54,
                'payer_cat' => 'commercial_hmo',
                'payer' => 'Aetna Healthcare HMO',
                'charges' => 34200.00,
                'ins_paid' => 12000.00,
                'pt_paid' => 3500.00,
                'status' => 'under_appeal',
                'desc' => 'Orthopedic knee arthroscopy & implants. Partial claim denial CO-197 under level 1 appeal.'
            ],
            [
                'days' => 48,
                'payer_cat' => 'government',
                'payer' => 'Medicaid / PhilHealth Senior Program',
                'charges' => 16500.00,
                'ins_paid' => 5000.00,
                'pt_paid' => 0.00,
                'status' => 'current',
                'desc' => 'Internal medicine community acquired pneumonia admission. Additional documentation submitted.'
            ],

            // 61–90 Days
            [
                'days' => 74,
                'payer_cat' => 'self_pay',
                'payer' => 'Self-Pay / Patient Responsibility',
                'charges' => 5200.00,
                'ins_paid' => 0.00,
                'pt_paid' => 1200.00,
                'status' => 'second_notice_sent',
                'desc' => 'Pediatric dehydration observation and IV therapy. 2nd billing notice sent with payment plan option.'
            ],
            [
                'days' => 82,
                'payer_cat' => 'commercial_hmo',
                'payer' => 'Cigna Health & Life',
                'charges' => 45800.00,
                'ins_paid' => 18000.00,
                'pt_paid' => 4000.00,
                'status' => 'under_appeal',
                'desc' => 'ICU ventilator management (3 days). Level 2 formal appeal filed with clinical chart notes.'
            ],
            [
                'days' => 71,
                'payer_cat' => 'government',
                'payer' => 'Medicare Part A / Government Trust',
                'charges' => 28900.00,
                'ins_paid' => 11000.00,
                'pt_paid' => 0.00,
                'status' => 'first_notice_sent',
                'desc' => 'General surgery appendectomy. Cross-matching and blood transfusion add-on pending review.'
            ],

            // 91–120 Days
            [
                'days' => 105,
                'payer_cat' => 'self_pay',
                'payer' => 'Self-Pay / Patient Responsibility',
                'charges' => 8400.00,
                'ins_paid' => 0.00,
                'pt_paid' => 1400.00,
                'status' => 'final_demand_sent',
                'desc' => 'Emergency exploratory laparotomy post-trauma. Final demand notice sent before external collections.'
            ],
            [
                'days' => 112,
                'payer_cat' => 'commercial_hmo',
                'payer' => 'UnitedHealthcare (Commercial HMO)',
                'charges' => 62100.00,
                'ins_paid' => 24000.00,
                'pt_paid' => 5000.00,
                'status' => 'under_appeal',
                'desc' => 'Total hip replacement revision surgery. Peer-to-peer physician review scheduled.'
            ],
            [
                'days' => 98,
                'payer_cat' => 'government',
                'payer' => 'PhilHealth / Government Health Insurance',
                'charges' => 19800.00,
                'ins_paid' => 6000.00,
                'pt_paid' => 0.00,
                'status' => 'under_appeal',
                'desc' => 'Dialysis nephrology admission. Secondary claim coordination of benefits inquiry.'
            ],

            // >120 Days (120+ Days)
            [
                'days' => 158,
                'payer_cat' => 'self_pay',
                'payer' => 'Self-Pay / Patient Responsibility',
                'charges' => 12500.00,
                'ins_paid' => 0.00,
                'pt_paid' => 2500.00,
                'status' => 'in_payment_plan',
                'desc' => 'Patient in active 6-month installment plan ($500/month). Regular monthly draft.'
            ],
            [
                'days' => 185,
                'payer_cat' => 'commercial_hmo',
                'payer' => 'Humana Health / MultiPlan',
                'charges' => 78000.00,
                'ins_paid' => 32000.00,
                'pt_paid' => 6000.00,
                'status' => 'referred_to_collections',
                'desc' => 'High-complexity cardiac coronary bypass surgery. Payer delayed beyond timely filing deadline.'
            ],
            [
                'days' => 145,
                'payer_cat' => 'government',
                'payer' => 'State Medicaid / Regional Government Health',
                'charges' => 31200.00,
                'ins_paid' => 9500.00,
                'pt_paid' => 0.00,
                'status' => 'final_demand_sent',
                'desc' => 'Pediatric neonatal intensive care unit (NICU) care. State legislative retroactive eligibility review.'
            ]
        ];

        $insCount = 0;
        foreach ($samples as $idx => $s) {
            $patientId = $patientIds[$idx % count($patientIds)];
            $serviceDate = date('Y-m-d', strtotime("-{$s['days']} days"));
            $dischargeDate = date('Y-m-d', strtotime("-{$s['days']} days +3 days"));
            $balance = round($s['charges'] - $s['ins_paid'] - $s['pt_paid'], 2);

            $acctNo = self::generateAccountNumber($pdo);
            $invNo = "INV-" . date('Y', strtotime($serviceDate)) . "-" . sprintf("%05d", 1000 + $idx);

            $ins = $pdo->prepare("
                INSERT INTO billing_ar_accounts (
                    account_number, patient_id, invoice_number, service_date, discharge_date,
                    payer_category, payer_name, total_charges, insurance_paid, insurance_adjusted,
                    patient_paid, patient_discount, current_balance, days_aged, aging_bucket,
                    collection_status, notes, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, 0.00,
                    ?, 0.00, ?, ?,
                    CASE
                        WHEN ? <= 30 THEN '0-30'
                        WHEN ? <= 60 THEN '31-60'
                        WHEN ? <= 90 THEN '61-90'
                        WHEN ? <= 120 THEN '91-120'
                        ELSE '120+'
                    END,
                    ?, ?, NOW()
                )
            ");

            $ins->execute([
                $acctNo,
                $patientId,
                $invNo,
                $serviceDate,
                $dischargeDate,
                $s['payer_cat'],
                $s['payer'],
                $s['charges'],
                $s['ins_paid'],
                $s['pt_paid'],
                $balance,
                $s['days'],
                $s['days'],
                $s['days'],
                $s['days'],
                $s['days'],
                $s['status'],
                $s['desc']
            ]);

            $newAcctId = (int)$pdo->lastInsertId();

            // Add realistic follow-up note
            $nIns = $pdo->prepare("
                INSERT INTO billing_ar_collection_notes (
                    ar_account_id, contact_type, contacted_party, action_outcome,
                    notes, created_by_name, created_at
                ) VALUES (
                    ?, 'internal_review', ?, 'Initial Account Aging Log',
                    ?, 'Billing System', DATE_SUB(NOW(), INTERVAL 5 DAY)
                )
            ");
            $nIns->execute([$newAcctId, $s['payer'], $s['desc']]);

            $insCount++;
        }

        // Also sync any master folios
        $this->syncFoliosIntoAr($pdo);

        return [
            'seeded' => $insCount,
            'message' => "Successfully seeded {$insCount} authentic hospital AR accounts across all 3 payer types and 5 aging intervals.",
            'matrix' => $this->getAgingMatrix()
        ];
    }

    private static function formatPayerCategory(string $cat): string
    {
        return match ($cat) {
            'self_pay' => 'Self-Pay (Patient Responsibility)',
            'commercial_hmo' => 'Commercial HMO / Private Insurance',
            'government' => 'Government Payers (Medicare / PhilHealth / Medicaid)',
            default => ucfirst(str_replace('_', ' ', $cat))
        };
    }
}
