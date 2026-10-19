<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

$db = Database::connection();

echo "=== CHECKING CLINIC OPERATING SCHEDULES & PROVIDERS ===\n\n";

// 1. Table existence & schema
try {
    $cols = $db->query("DESCRIBE clinic_operating_schedules")->fetchAll(PDO::FETCH_ASSOC);
    echo "clinic_operating_schedules columns:\n";
    foreach ($cols as $c) {
        echo " - {$c['Field']} ({$c['Type']})\n";
    }
} catch (\Throwable $e) {
    echo "clinic_operating_schedules does NOT exist: " . $e->getMessage() . "\n";
}

// 2. Count existing records
try {
    $rows = $db->query("SELECT cos.*, d.name as dept_name, d.code as dept_code FROM clinic_operating_schedules cos JOIN departments d ON d.id = cos.department_id")->fetchAll(PDO::FETCH_ASSOC);
    echo "\nExisting clinic operating schedule records (" . count($rows) . "):\n";
    foreach ($rows as $r) {
        echo " [ID {$r['id']}] Dept: {$r['dept_name']} ({$r['dept_code']}) | Day: {$r['day_of_week']} | {$r['start_time']} - {$r['end_time']} | Break: {$r['break_start_time']} - {$r['break_end_time']} | Active: {$r['is_active']}\n";
    }
} catch (\Throwable $e) {
    echo "Error querying rows: " . $e->getMessage() . "\n";
}

// 3. Providers and their departments
echo "\nProviders in system:\n";
$providers = $db->query("
    SELECT pr.id, pr.employee_id, e.first_name, e.last_name, e.department_id, e.secondary_department_id, d.name as dept_name, d.code as dept_code
    FROM providers pr
    JOIN employees e ON e.id = pr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
")->fetchAll(PDO::FETCH_ASSOC);
foreach ($providers as $p) {
    echo " Provider ID: {$p['id']} | Name: Dr. {$p['first_name']} {$p['last_name']} | Dept ID: {$p['department_id']} ({$p['dept_name']}) | Sec Dept ID: {$p['secondary_department_id']}\n";
}

echo "\nEmployee Department Assignments:\n";
$assignments = $db->query("
    SELECT eda.*, d.name as dept_name
    FROM employee_department_assignments eda
    JOIN departments d ON d.id = eda.department_id
")->fetchAll(PDO::FETCH_ASSOC);
foreach ($assignments as $a) {
    echo " Emp ID: {$a['employee_id']} | Dept ID: {$a['department_id']} ({$a['dept_name']}) | Primary: {$a['is_primary']}\n";
}


// 4. Check blocked slots / is_provider_block in appointments
echo "\nProvider blocks / emergency blocked slots in appointments:\n";
$blocks = $db->query("
    SELECT a.id, a.provider_id, a.title, a.appointment_date, a.appointment_time, a.is_all_day, a.is_provider_block, a.reason
    FROM appointments a
    WHERE a.is_provider_block = 1 OR a.title LIKE '%Emergency%' OR a.title LIKE '%Block%'
    LIMIT 10
")->fetchAll(PDO::FETCH_ASSOC);
foreach ($blocks as $b) {
    echo " Block ID: {$b['id']} | Provider: {$b['provider_id']} | Date: {$b['appointment_date']} | Time: {$b['appointment_time']} | All Day: {$b['is_all_day']} | Title: {$b['title']} | Reason: {$b['reason']}\n";
}
