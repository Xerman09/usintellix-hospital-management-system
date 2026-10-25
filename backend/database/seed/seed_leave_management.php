<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';
\App\Core\Env::load();

$pdo = \App\Core\Database::connection();

// 1. Seed Quota Balances for Clinical Employees for 2026
$employees = [
    101 => ['name' => 'Marcus Vance', 'dept' => 4],
    109 => ['name' => 'Sofia Morales', 'dept' => 4],
    104 => ['name' => 'Arthur Sterling', 'dept' => 6],
    111 => ['name' => 'Jennifer Reyes', 'dept' => 6],
    102 => ['name' => 'Elena Rostova', 'dept' => 5],
    105 => ['name' => 'Sarah Lin', 'dept' => 2],
    108 => ['name' => 'Christopher Nolan', 'dept' => 7],
    103 => ['name' => 'Jonathan Hayes', 'dept' => 3],
    112 => ['name' => 'Rochelle Dizon', 'dept' => 3],
];

$types = [
    'vacation'  => ['entitled' => 15.0, 'carried' => 2.0],
    'sick'      => ['entitled' => 12.0, 'carried' => 0.0],
    'study_cme' => ['entitled' => 5.0,  'carried' => 0.0],
    'emergency' => ['entitled' => 3.0,  'carried' => 0.0]
];

$quotaCount = 0;
foreach ($employees as $empId => $info) {
    foreach ($types as $type => $q) {
        $entitled = $q['entitled'];
        $carried = $q['carried'];
        $used = ($type === 'vacation') ? 3.0 : (($type === 'sick') ? 1.0 : 0.0);
        $pending = ($type === 'study_cme') ? 2.0 : 0.0;
        $rem = ($entitled + $carried) - $used;

        $stmt = $pdo->prepare("
            INSERT INTO hr_leave_quota_balances (
                employee_id, year, leave_type, total_entitled, carried_over, used_days, pending_days, remaining_balance
            ) VALUES (?, 2026, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_entitled = VALUES(total_entitled),
                remaining_balance = VALUES(remaining_balance)
        ");
        $stmt->execute([$empId, $type, $entitled, $carried, $used, $pending, $rem]);
        $quotaCount++;
    }
}

// 2. Seed Sample Leave Requests
$pdo->exec("DELETE FROM hr_leave_requests");

$requests = [
    [
        'code' => 'LV-202610-00001',
        'emp_id' => 101, // Marcus Vance
        'dept_id' => 4,  // Cardiology
        'type' => 'study_cme',
        'start' => '2026-11-05',
        'end' => '2026-11-07',
        'days' => 3.0,
        'cov_emp' => 109, // Covered by Sofia Morales
        'cov_status' => 'acknowledged',
        'cov_notes' => 'Dr. Sofia Morales agreed to take inpatient rounds and cath lab call.',
        'reason' => 'Annual American College of Cardiology (ACC) Interventional Symposium',
        'status' => 'approved',
        'supervisor_id' => 1,
        'approved_at' => '2026-10-20 10:30:00'
    ],
    [
        'code' => 'LV-202610-00002',
        'emp_id' => 104, // Arthur Sterling
        'dept_id' => 6,  // General Surgery
        'type' => 'vacation',
        'start' => '2026-11-12',
        'end' => '2026-11-16',
        'days' => 5.0,
        'cov_emp' => 111, // Covered by Jennifer Reyes
        'cov_status' => 'acknowledged',
        'cov_notes' => 'Dr. Jennifer Reyes covering scheduled elective cholecystectomies and acute ER trauma.',
        'reason' => 'Pre-approved annual family vacation leave',
        'status' => 'approved',
        'supervisor_id' => 1,
        'approved_at' => '2026-10-22 14:15:00'
    ],
    [
        'code' => 'LV-202610-00003',
        'emp_id' => 102, // Elena Rostova
        'dept_id' => 5,  // Pediatrics
        'type' => 'study_cme',
        'start' => '2026-11-20',
        'end' => '2026-11-22',
        'days' => 3.0,
        'cov_emp' => 105, // Sarah Lin cross-cover
        'cov_status' => 'pending_colleague_ack',
        'cov_notes' => 'Requesting Dr. Lin to cross-cover pediatric urgent triage.',
        'reason' => 'Pediatric Advanced Life Support (PALS) Instructor Certification Course',
        'status' => 'pending_approval',
        'supervisor_id' => null,
        'approved_at' => null
    ],
    [
        'code' => 'LV-202610-00004',
        'emp_id' => 108, // Christopher Nolan
        'dept_id' => 7,  // ICU
        'type' => 'emergency',
        'start' => '2026-10-28',
        'end' => '2026-10-29',
        'days' => 2.0,
        'cov_emp' => 103, // Jonathan Hayes
        'cov_status' => 'acknowledged',
        'cov_notes' => 'Dr. Hayes attending daily morning ICU multi-disciplinary rounds.',
        'reason' => 'Urgent family emergency medical procedure',
        'status' => 'pending_approval',
        'supervisor_id' => null,
        'approved_at' => null
    ],
    [
        'code' => 'LV-202610-00005',
        'emp_id' => 109, // Sofia Morales
        'dept_id' => 4,  // Cardiology
        'type' => 'sick',
        'start' => '2026-10-15',
        'end' => '2026-10-16',
        'days' => 2.0,
        'cov_emp' => 101, // Marcus Vance
        'cov_status' => 'acknowledged',
        'cov_notes' => 'Dr. Vance stepped in for cardiac echo clinics.',
        'reason' => 'Acute viral gastroenteritis with medical certificate attached',
        'status' => 'approved',
        'supervisor_id' => 1,
        'approved_at' => '2026-10-15 08:30:00'
    ]
];

$stmt = $pdo->prepare("
    INSERT INTO hr_leave_requests (
        leave_code, employee_id, department_id, leave_type, start_date, end_date,
        total_days, covering_employee_id, coverage_status, coverage_notes,
        reason, status, supervisor_id, approved_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
");

foreach ($requests as $r) {
    $stmt->execute([
        $r['code'], $r['emp_id'], $r['dept_id'], $r['type'], $r['start'], $r['end'],
        $r['days'], $r['cov_emp'], $r['cov_status'], $r['cov_notes'],
        $r['reason'], $r['status'], $r['supervisor_id'], $r['approved_at']
    ]);
}

$pdo->exec("UPDATE billing_tariff_counters SET last_number = " . count($requests) . " WHERE counter_type = 'LEAVE_REQUEST' AND year = 2026");

echo "Seeded {$quotaCount} leave quota balances and " . count($requests) . " leave requests successfully!\n";
