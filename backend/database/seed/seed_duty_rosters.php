<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';
\App\Core\Env::load();

$pdo = \App\Core\Database::connection();

$days = range(1, 31);
$count = 0;

foreach ($days as $d) {
    $date = sprintf('2026-10-%02d', $d);
    
    // Cardiology (Dept 4)
    $primCardio = ($d % 2 == 1) ? 101 : 109;
    $secCardio  = ($d % 2 == 1) ? 109 : 101;
    
    $code1 = sprintf('ROST-202610-%04d', ++$count);
    $stmt = $pdo->prepare('INSERT IGNORE INTO hr_duty_rosters (roster_code, department_id, employee_id, shift_date, shift_type, start_time, end_time, call_role, contact_override_phone, pager_number, status, notes) VALUES (?, 4, ?, ?, "full_day_24h", "08:00:00", "08:00:00", "primary_on_call", "+1-555-0101", "PAGER-441", "confirmed", "Cardiology 24h Primary Inpatient and Catheterization coverage")');
    $stmt->execute([$code1, $primCardio, $date]);

    $code2 = sprintf('ROST-202610-%04d', ++$count);
    $stmt = $pdo->prepare('INSERT IGNORE INTO hr_duty_rosters (roster_code, department_id, employee_id, shift_date, shift_type, start_time, end_time, call_role, contact_override_phone, pager_number, status, notes) VALUES (?, 4, ?, ?, "night", "17:00:00", "08:00:00", "secondary_on_call", "+1-555-0109", "PAGER-442", "confirmed", "Cardiology night attending backup")');
    $stmt->execute([$code2, $secCardio, $date]);

    // General Surgery (Dept 6)
    $primSurg = ($d % 2 == 1) ? 104 : 111;
    $secSurg  = ($d % 2 == 1) ? 111 : 104;

    $code3 = sprintf('ROST-202610-%04d', ++$count);
    $stmt = $pdo->prepare('INSERT IGNORE INTO hr_duty_rosters (roster_code, department_id, employee_id, shift_date, shift_type, start_time, end_time, call_role, contact_override_phone, pager_number, status, notes) VALUES (?, 6, ?, ?, "full_day_24h", "08:00:00", "08:00:00", "primary_on_call", "+1-555-0104", "PAGER-661", "confirmed", "General Surgery and Acute Trauma 24h Primary")');
    $stmt->execute([$code3, $primSurg, $date]);

    $code4 = sprintf('ROST-202610-%04d', ++$count);
    $stmt = $pdo->prepare('INSERT IGNORE INTO hr_duty_rosters (roster_code, department_id, employee_id, shift_date, shift_type, start_time, end_time, call_role, contact_override_phone, pager_number, status, notes) VALUES (?, 6, ?, ?, "night", "20:00:00", "08:00:00", "er_backup", "+1-555-0111", "PAGER-662", "confirmed", "Emergency Department Trauma and Laparoscopic Backup")');
    $stmt->execute([$code4, $secSurg, $date]);

    // Pediatrics (Dept 5)
    $code5 = sprintf('ROST-202610-%04d', ++$count);
    $stmt = $pdo->prepare('INSERT IGNORE INTO hr_duty_rosters (roster_code, department_id, employee_id, shift_date, shift_type, start_time, end_time, call_role, contact_override_phone, pager_number, status, notes) VALUES (?, 5, 102, ?, "full_day_24h", "08:00:00", "08:00:00", "primary_on_call", "+1-555-0102", "PAGER-551", "confirmed", "Pediatrics and Neonatal Intensive Care Primary On-Call")');
    $stmt->execute([$code5, $date]);

    // Emergency Medicine (Dept 2)
    $code6 = sprintf('ROST-202610-%04d', ++$count);
    $stmt = $pdo->prepare('INSERT IGNORE INTO hr_duty_rosters (roster_code, department_id, employee_id, shift_date, shift_type, start_time, end_time, call_role, contact_override_phone, pager_number, status, notes) VALUES (?, 2, 105, ?, "morning", "07:00:00", "19:00:00", "primary_on_call", "+1-555-0105", "PAGER-221", "confirmed", "Emergency Resuscitation and Code Team Lead")');
    $stmt->execute([$code6, $date]);

    // ICU (Dept 7)
    $code7 = sprintf('ROST-202610-%04d', ++$count);
    $stmt = $pdo->prepare('INSERT IGNORE INTO hr_duty_rosters (roster_code, department_id, employee_id, shift_date, shift_type, start_time, end_time, call_role, contact_override_phone, pager_number, status, notes) VALUES (?, 7, 108, ?, "full_day_24h", "08:00:00", "08:00:00", "icu_consultant", "+1-555-0108", "PAGER-771", "confirmed", "Critical Care Attending Intensivist and Vent Management")');
    $stmt->execute([$code7, $date]);
}

$pdo->exec("UPDATE billing_tariff_counters SET last_number = {$count} WHERE counter_type = 'DUTY_ROSTER' AND year = 2026");
echo "Seeded {$count} monthly on-call duty shifts successfully!\n";
