<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Check what's in the immunizations (CVX catalog) table
echo "=== immunizations catalog (CVX codes) ===\n";
$stmt = $pdo->query('SELECT id, name, description, deleted_at FROM immunizations');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Count: " . count($rows) . "\n";
print_r($rows);

// Check patient_immunizations again but without filters
echo "\n=== patient_immunizations - ALL records including deleted ===\n";
$stmt = $pdo->query('SELECT * FROM patient_immunizations');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Count: " . count($rows) . "\n";
print_r($rows);

// Check cvx_codes table - maybe it uses that
echo "\n=== Check cvx_codes table ===\n";
try {
    $stmt = $pdo->query('DESCRIBE cvx_codes');
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Table cvx_codes does not exist.\n";
}
