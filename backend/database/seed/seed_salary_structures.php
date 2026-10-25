<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';
\App\Core\Env::load();

$pdo = \App\Core\Database::connection();

$pdo->exec("DELETE FROM hr_salary_components");
$pdo->exec("DELETE FROM hr_salary_structures");

$staffSalaries = [
    [
        'emp_id' => 101, // Marcus Vance
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 12500.00,
        'hourly' => 78.13,
        'daily' => 568.18,
        'housing' => 600.00,
        'transpo' => 300.00,
        'medical' => 400.00,
        'meal' => 200.00,
        'uniform' => 0.00,
        'on_call_stipend' => 350.00, // $350 per on-call shift
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'JPMorgan Chase Healthcare Banking',
        'acct' => 'CHASE-4991-8821'
    ],
    [
        'emp_id' => 109, // Sofia Morales
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 10500.00,
        'hourly' => 65.63,
        'daily' => 477.27,
        'housing' => 500.00,
        'transpo' => 250.00,
        'medical' => 300.00,
        'meal' => 150.00,
        'uniform' => 0.00,
        'on_call_stipend' => 300.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'Bank of America Medical Professional',
        'acct' => 'BOA-3129-9941'
    ],
    [
        'emp_id' => 104, // Arthur Sterling
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 14000.00,
        'hourly' => 87.50,
        'daily' => 636.36,
        'housing' => 800.00,
        'transpo' => 400.00,
        'medical' => 400.00,
        'meal' => 200.00,
        'uniform' => 0.00,
        'on_call_stipend' => 400.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'Wells Fargo Premier Physician',
        'acct' => 'WF-8831-2299'
    ],
    [
        'emp_id' => 111, // Jennifer Reyes
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 11000.00,
        'hourly' => 68.75,
        'daily' => 500.00,
        'housing' => 500.00,
        'transpo' => 250.00,
        'medical' => 300.00,
        'meal' => 150.00,
        'uniform' => 0.00,
        'on_call_stipend' => 350.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'Citibank Executive',
        'acct' => 'CITI-5512-4411'
    ],
    [
        'emp_id' => 102, // Elena Rostova
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 10000.00,
        'hourly' => 62.50,
        'daily' => 454.55,
        'housing' => 400.00,
        'transpo' => 200.00,
        'medical' => 300.00,
        'meal' => 100.00,
        'uniform' => 0.00,
        'on_call_stipend' => 250.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'PNC Healthcare Banking',
        'acct' => 'PNC-1192-3344'
    ],
    [
        'emp_id' => 105, // Sarah Lin
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 11500.00,
        'hourly' => 71.88,
        'daily' => 522.73,
        'housing' => 600.00,
        'transpo' => 300.00,
        'medical' => 350.00,
        'meal' => 150.00,
        'uniform' => 0.00,
        'on_call_stipend' => 350.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'Chase Premier',
        'acct' => 'CHASE-7712-9901'
    ],
    [
        'emp_id' => 108, // Christopher Nolan
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 13000.00,
        'hourly' => 81.25,
        'daily' => 590.91,
        'housing' => 700.00,
        'transpo' => 350.00,
        'medical' => 350.00,
        'meal' => 200.00,
        'uniform' => 0.00,
        'on_call_stipend' => 400.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'US Bank Healthcare',
        'acct' => 'USB-4412-8877'
    ],
    [
        'emp_id' => 110, // Maria Santos (Charge Nurse)
        'type' => 'regular_fulltime',
        'freq' => 'semi_monthly',
        'base' => 5200.00,
        'hourly' => 32.50,
        'daily' => 236.36,
        'housing' => 200.00,
        'transpo' => 150.00,
        'medical' => 200.00,
        'meal' => 100.00,
        'uniform' => 100.00,
        'on_call_stipend' => 100.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'TD Bank Direct',
        'acct' => 'TD-8819-2200'
    ],
    [
        'emp_id' => 103, // Jonathan Hayes
        'type' => 'consultant_physician',
        'freq' => 'semi_monthly',
        'base' => 9500.00,
        'hourly' => 59.38,
        'daily' => 431.82,
        'housing' => 400.00,
        'transpo' => 200.00,
        'medical' => 300.00,
        'meal' => 100.00,
        'uniform' => 0.00,
        'on_call_stipend' => 250.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'Wells Fargo',
        'acct' => 'WF-5521-7711'
    ],
    [
        'emp_id' => 112, // Rochelle Dizon
        'type' => 'regular_fulltime',
        'freq' => 'semi_monthly',
        'base' => 9500.00,
        'hourly' => 59.38,
        'daily' => 431.82,
        'housing' => 400.00,
        'transpo' => 200.00,
        'medical' => 300.00,
        'meal' => 100.00,
        'uniform' => 0.00,
        'on_call_stipend' => 250.00,
        'ot_mul' => 1.25,
        'nd_mul' => 1.30,
        'rest_mul' => 1.50,
        'hol_mul' => 2.00,
        'bank' => 'Citibank',
        'acct' => 'CITI-9921-3312'
    ]
];

$count = 0;
$stmt = $pdo->prepare("
    INSERT INTO hr_salary_structures (
        structure_code, employee_id, employment_type, pay_frequency, base_salary,
        hourly_rate, daily_rate, housing_allowance, transportation_allowance,
        medical_allowance, meal_allowance, uniform_allowance, on_call_stipend_rate,
        total_fixed_allowances, overtime_multiplier, night_diff_multiplier,
        rest_day_multiplier, holiday_multiplier, emergency_recall_multiplier,
        bank_name, bank_account_no, effective_date, is_active, created_by
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, 1.50,
        ?, ?, '2026-01-01', 1, 1
    )
");

foreach ($staffSalaries as $s) {
    $code = sprintf('SAL-202601-%05d', ++$count);
    $totalAllowances = $s['housing'] + $s['transpo'] + $s['medical'] + $s['meal'] + $s['uniform'];

    $stmt->execute([
        $code,
        $s['emp_id'],
        $s['type'],
        $s['freq'],
        $s['base'],
        $s['hourly'],
        $s['daily'],
        $s['housing'],
        $s['transpo'],
        $s['medical'],
        $s['meal'],
        $s['uniform'],
        $s['on_call_stipend'],
        $totalAllowances,
        $s['ot_mul'],
        $s['nd_mul'],
        $s['rest_mul'],
        $s['hol_mul'],
        $s['bank'],
        $s['acct']
    ]);
}

$pdo->exec("UPDATE billing_tariff_counters SET last_number = {$count} WHERE counter_type = 'SALARY_STRUCTURE' AND year = 2026");

echo "Seeded {$count} staff salary structures successfully!\n";
