<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Test the actual query from the report
echo "=== Testing the exact report SQL ===\n";
$sql = "
    SELECT
        p.patient_no AS pid,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        pi.cvx_code AS immunization_code,
        COALESCE(pi.vaccine_name, cc.short_description) AS immunization_title,
        COALESCE(pi.vis_date_given, DATE(pi.administered_at)) AS immunization_date
    FROM patient_immunizations pi
    JOIN patients p ON pi.patient_id = p.id
    LEFT JOIN cvx_codes cc ON cc.id = pi.cvx_code_id
    WHERE pi.deleted_at IS NULL
      AND p.deleted_at IS NULL
    ORDER BY pi.administered_at DESC
";
$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Count: " . count($rows) . "\n";
print_r($rows);

// Check the backend patient-immunizations route to see if it saves correctly
$stmt = $pdo->query('SELECT COUNT(*) as total FROM patient_immunizations');
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo "\nTotal in patient_immunizations (including deleted): " . $row['total'] . "\n";
